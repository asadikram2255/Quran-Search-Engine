/**
 * Quran Search Engine — Application Controller
 */

const PAGE_SIZE = 20;

class QuranApp {
  constructor() {
    this.ayaat          = null;
    this.surahs         = null;
    this.wordRoots      = null;
    this.engine         = null;
    this.results        = [];
    this.page           = 0;
    this.filters        = { place: '', surah: '', juz: '' };
    this.dark           = localStorage.getItem('theme') === 'dark';
    this._lastQuery     = '';
    this._lastKeywords  = [];
    this._answerMode    = null;   // null | 'addressee_listing'
    this._activeFilter  = null;  // addressee id currently selected in answer panel
    this._allResults    = [];    // unfiltered results (for answer-panel switching)
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  async init() {
    this._applyTheme();
    this._bindStatic();

    try {
      this._setLoading('Loading Quran data…');

      const [ayaatData, surahData, wordRootsData, rootVocabData] = await Promise.all([
        fetch('data/quran.json').then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        fetch('data/surah.json').then(r => r.json()),
        fetch('data/word_roots.json').then(r => r.json()),
        fetch('data/root_vocab.json').then(r => r.json()),
      ]);

      this.ayaat     = ayaatData;
      this.surahs    = surahData;
      this.wordRoots = wordRootsData;
      this.rootVocab = rootVocabData;

      this._setLoading('Building search index…');
      await new Promise(r => setTimeout(r, 30));

      this.engine = new QuranSearch(this.ayaat, this.wordRoots, this.rootVocab);

      this._hideLoading();
      this._populateFilters();
      this._bindSearch();

    } catch (err) {
      console.error(err);
      this._setLoading(`Error: ${err.message} — Make sure you have run scripts/build_data.py first.`, true);
    }
  }

  // ── Theme ────────────────────────────────────────────────────────────────

  _applyTheme() {
    document.documentElement.setAttribute('data-theme', this.dark ? 'dark' : 'light');
  }

  _toggleTheme() {
    this.dark = !this.dark;
    localStorage.setItem('theme', this.dark ? 'dark' : 'light');
    this._applyTheme();
  }

  // ── Loading state ────────────────────────────────────────────────────────

  _setLoading(msg, isError = false) {
    const el = document.getElementById('loading-state');
    el.hidden = false;
    el.querySelector('#loading-text').textContent = msg;
    el.querySelector('.loading-spinner').style.display = isError ? 'none' : '';
    document.getElementById('results-section').hidden = true;
    document.getElementById('filter-bar').hidden = true;
  }

  _hideLoading() {
    document.getElementById('loading-state').hidden = true;
  }

  // ── Populate filter dropdowns ─────────────────────────────────────────────

  _populateFilters() {
    const surahSel = document.getElementById('filter-surah');
    for (const s of this.surahs) {
      const opt = document.createElement('option');
      opt.value = s.no;
      opt.textContent = `${s.no}. ${s.en} (${s.ar})`;
      surahSel.appendChild(opt);
    }
    const juzSel = document.getElementById('filter-juz');
    for (let j = 1; j <= 30; j++) {
      const opt = document.createElement('option');
      opt.value = j;
      opt.textContent = `Juz ${j}`;
      juzSel.appendChild(opt);
    }
  }

  // ── Event binding ────────────────────────────────────────────────────────

  _bindStatic() {
    document.getElementById('theme-toggle').addEventListener('click', () => this._toggleTheme());
  }

  _bindSearch() {
    const input  = document.getElementById('search-input');
    const btn    = document.getElementById('search-btn');
    const fPlace = document.getElementById('filter-place');
    const fSurah = document.getElementById('filter-surah');
    const fJuz   = document.getElementById('filter-juz');
    const fClear = document.getElementById('clear-filters');
    const more   = document.getElementById('load-more-btn');

    const doSearch = () => {
      this.page = 0;
      this._run(input.value.trim());
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    const filterChange = () => {
      this.filters.place = fPlace.value;
      this.filters.surah = fSurah.value;
      this.filters.juz   = fJuz.value;
      if (input.value.trim()) { this.page = 0; this._run(input.value.trim()); }
    };
    fPlace.addEventListener('change', filterChange);
    fSurah.addEventListener('change', filterChange);
    fJuz.addEventListener('change', filterChange);

    fClear.addEventListener('click', () => {
      fPlace.value = fSurah.value = fJuz.value = '';
      this.filters = { place: '', surah: '', juz: '' };
      if (input.value.trim()) { this.page = 0; this._run(input.value.trim()); }
    });

    more.addEventListener('click', () => {
      this.page++;
      this._renderPage(true);
    });
  }

  // ── Question / answer-type detection ─────────────────────────────────────

  _isQuestionQuery(query) {
    const q = query.trim().toLowerCase();
    if (q.endsWith('?')) return true;
    return /^(what|which|how|where|when|why|list|name|tell|show|give|mention|are there|is there|does|do the|does the)/i.test(q);
  }

  /**
   * Returns 'addressee_listing' or null.
   * Only activates when the query is a question AND is asking about address terms.
   */
  _detectAnswerType(query, parsed) {
    if (!this._isQuestionQuery(query)) return null;
    if (parsed.intents.includes('address') || parsed.intents.includes('list')) {
      const q = query.toLowerCase();
      const addressClues = [
        'term','terms','address','addresses','addressed','call','called','refer','referred',
        'phrase','phrases','expression','expressions','vocative','way','ways','used','uses',
        'how allah','how god','how does','what does quran call','what are the',
      ];
      if (addressClues.some(c => q.includes(c))) return 'addressee_listing';
    }
    // Also: if explicitly asking about addressees/groups without other strong topic
    if (parsed.intents.includes('address') && parsed.addresseeIds.length === 0) {
      return 'addressee_listing';
    }
    return null;
  }

  // ── Run search ───────────────────────────────────────────────────────────

  async _run(query) {
    if (!query) return;

    // Generation counter: if a newer search fires before this one finishes,
    // this instance will see gen !== this._searchGen and abort before touching the DOM.
    this._searchGen = (this._searchGen || 0) + 1;
    const myGen = this._searchGen;

    this._lastQuery    = query;
    this._answerMode   = null;
    this._activeFilter = null;
    this._allResults   = [];

    // Hard-reset the answer panel immediately — clear HTML so stale content never bleeds
    const answerPanel = document.getElementById('answer-panel');
    answerPanel.hidden    = true;
    answerPanel.innerHTML = '';

    document.getElementById('search-section').classList.add('compact');
    document.getElementById('filter-bar').hidden     = true;
    document.getElementById('results-section').hidden = true;
    document.getElementById('results-grid').innerHTML = '';
    this._showProgress('translate');

    try {
      const { results, arabicQuery, extractedRoots, exactCount } = await this.engine.search(
        query, this.filters, 200,
        step => { if (this._searchGen === myGen) this._showProgress(step); },
      );

      // A newer search has started — discard these results entirely
      if (this._searchGen !== myGen) return;

      const parsed     = parseQuery(query);
      const answerType = this._detectAnswerType(query, parsed);

      this._lastKeywords = parsed.keywords;
      this._allResults   = results;
      this.results       = results;

      this._hideProgress();
      this._renderPipelineInfo(arabicQuery, extractedRoots);

      if (answerType === 'addressee_listing') {
        this._answerMode = 'addressee_listing';
        // Use concept-expansion roots for vocab (translation roots carry query-context noise)
        // Fall back to translation roots only when concept expansion found nothing
        const vocabRoots = parsed.roots.length > 0 ? parsed.roots : extractedRoots;
        this._renderAnswerPanel(query, parsed, vocabRoots);
      }

      this._renderPage(false);

      document.getElementById('filter-bar').hidden = false;
      document.getElementById('results-section').hidden = false;

      const surahCount = new Set(results.map(r => r.ayah.sn)).size;
      const exactLabel = exactCount > 0 ? ` · ${exactCount} exact matches` : '';
      const countEl = document.getElementById('results-count');
      countEl.textContent = results.length
        ? `${results.length} ayaat across ${surahCount} surahs${exactLabel}`
        : '';

      document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error(err);
      if (this._searchGen === myGen) this._hideProgress();
    }
  }

  // ── Search progress bar ──────────────────────────────────────────────────

  _showProgress(step) {
    const bar = document.getElementById('search-progress');
    bar.hidden = false;
    ['translate', 'roots', 'search'].forEach((s, i) => {
      const idx = ['translate', 'roots', 'search'].indexOf(step);
      const el  = bar.querySelector(`[data-step="${s}"]`);
      if (!el) return;
      el.classList.toggle('active', i === idx);
      el.classList.toggle('done',   i < idx);
    });
  }

  _hideProgress() {
    document.getElementById('search-progress').hidden = true;
  }

  // ── Pipeline info strip ───────────────────────────────────────────────────

  _renderPipelineInfo(arabicQuery, extractedRoots) {
    const strip = document.getElementById('pipeline-info');
    if (!arabicQuery && !extractedRoots.length) { strip.hidden = true; return; }

    let html = '';
    if (arabicQuery) {
      html += `<span class="pi-label">Arabic:</span>
               <span class="pi-arabic" dir="rtl">${this._esc(arabicQuery)}</span>`;
    }
    if (extractedRoots.length) {
      html += `<span class="pi-label">Roots found:</span>
               <span class="pi-roots">${extractedRoots.map(r =>
                 `<span class="root-chip" dir="rtl">${this._esc(r)}</span>`
               ).join('')}</span>`;
    }
    strip.innerHTML = html;
    strip.hidden = false;
  }

  // ── Answer panel ─────────────────────────────────────────────────────────

  _renderAnswerPanel(query, parsed, allRoots) {
    const panel = document.getElementById('answer-panel');
    const q     = query.toLowerCase();

    // ── Section 1: Vocative patterns (يَا ... forms) ─────────────────────
    const addrWithCounts = this.engine.countForAddressees();
    const matchedIds     = new Set(parsed.addresseeIds);
    // Show all addressees, matched ones first
    addrWithCounts.sort((a, b) => {
      const am = matchedIds.has(a.id) ? 1 : 0;
      const bm = matchedIds.has(b.id) ? 1 : 0;
      return bm - am || b.count - a.count;
    });

    const vocativeCards = addrWithCounts.map(addr => {
      const arMatch = addr.label.match(/\(([^)]+)\)/);
      const arText  = arMatch ? arMatch[1] : addr.ar_patterns[0] || '';
      const enLabel = addr.label.replace(/\s*\([^)]*\)/, '').trim();
      return `<button class="addr-card" data-type="pattern" data-addr-id="${this._esc(addr.id)}" type="button">
        <span class="addr-en">${this._esc(enLabel)}</span>
        <span class="addr-ar" dir="rtl" lang="ar">${this._esc(arText)}</span>
        <span class="addr-count">${addr.count} ayaat</span>
      </button>`;
    }).join('');

    // ── Section 2: Reference vocabulary terms ─────────────────────────────
    const vocabTerms = this.engine.getTermsForRoots(allRoots, 30);

    const vocabCards = vocabTerms.map(term =>
      `<button class="addr-card" data-type="word" data-norm-word="${this._esc(term.normWord)}" type="button">
        <span class="addr-ar" dir="rtl" lang="ar">${this._esc(term.normWord)}</span>
        <span class="addr-count">${term.count}× in Quran</span>
      </button>`
    ).join('');

    // Build a natural-language header
    let header = 'Quranic terms for the concept in your query:';
    if (q.includes('human') || q.includes('mankind') || q.includes('people'))
      header = 'Terms the Quran uses to refer to human beings:';
    else if (q.includes('believer') || q.includes('muslim'))
      header = 'Terms the Quran uses to refer to believers:';
    else if (q.includes('prophet') || q.includes('messenger'))
      header = 'Terms the Quran uses to refer to prophets and messengers:';

    panel.innerHTML = `
      <div class="answer-header">
        <span class="answer-icon">📋</span>
        <span>${this._esc(header)}</span>
      </div>

      ${vocativeCards ? `
      <div class="answer-section-label">Direct address terms (يَا … vocatives)</div>
      <div class="addr-grid">${vocativeCards}</div>` : ''}

      ${vocabCards ? `
      <div class="answer-section-label" style="margin-top:14px">Reference terms (actual Quranic vocabulary)</div>
      <div class="addr-grid">${vocabCards}</div>` : ''}

      <div class="addr-filter-label" id="addr-filter-label">
        Click any term to filter the results below
      </div>
    `;
    panel.hidden = false;

    panel.querySelectorAll('.addr-card').forEach(btn => {
      btn.addEventListener('click', () => this._selectTermFilter(btn));
    });
  }

  _selectTermFilter(btn) {
    const panel   = document.getElementById('answer-panel');
    const type    = btn.dataset.type;
    const filterKey = type === 'pattern' ? `pat:${btn.dataset.addrId}` : `word:${btn.dataset.normWord}`;

    // Deselect if already selected
    if (this._activeFilter === filterKey) {
      this._activeFilter = null;
      panel.querySelectorAll('.addr-card').forEach(b => b.classList.remove('selected'));
      document.getElementById('addr-filter-label').textContent = 'Click any term to filter the results below';
      this.results = this._allResults;
      this._updateResultsCount(this.results.length);
      this.page = 0;
      this._renderPage(false);
      return;
    }

    this._activeFilter = filterKey;
    panel.querySelectorAll('.addr-card').forEach(b => b.classList.toggle('selected', b === btn));

    let filtered, label;
    if (type === 'pattern') {
      const addr = ADDRESSEES.find(a => a.id === btn.dataset.addrId);
      if (!addr) return;
      filtered = this.engine.searchByPattern(addr.ar_patterns, addr.label);
      label    = `Showing ${filtered.length} ayaat: ${addr.label.replace(/\s*\([^)]*\)/, '')}`;
    } else {
      const normWord = btn.dataset.normWord;
      filtered = this.engine.filterByNormWord(normWord, normWord);
      label    = `Showing ${filtered.length} ayaat containing: ${normWord}`;
    }

    document.getElementById('addr-filter-label').textContent = label;
    this._updateResultsCount(filtered.length);
    this.results = filtered;
    this.page    = 0;
    this._renderPage(false);
  }

  _updateResultsCount(n) {
    document.getElementById('results-count').textContent =
      n ? `${n} ayaat found` : '';
  }

  // ── Render result page ───────────────────────────────────────────────────

  _renderPage(append) {
    const grid     = document.getElementById('results-grid');
    const noRes    = document.getElementById('no-results');
    const moreWrap = document.getElementById('load-more-wrapper');

    if (!append) grid.innerHTML = '';

    if (this.results.length === 0) {
      noRes.hidden    = false;
      moreWrap.hidden = true;
      return;
    }
    noRes.hidden = true;

    const start = this.page * PAGE_SIZE;
    const slice = this.results.slice(start, start + PAGE_SIZE);
    for (const r of slice) grid.appendChild(this._buildCard(r));

    moreWrap.hidden = (this.page + 1) * PAGE_SIZE >= this.results.length;
  }

  // ── Build result card ────────────────────────────────────────────────────

  _buildCard({ ayah, score, matchedRoots, matchedKeywords, matchedPatterns }) {
    const card = document.createElement('article');
    card.className = 'result-card';

    const placeClass = ayah.place === 'Meccan' ? 'badge-mecca' : 'badge-medina';

    const allTrans = [ayah.en, ayah.t1, ayah.t2, ayah.t3].filter(Boolean);
    const primary  = allTrans[0] || '';
    const others   = allTrans.slice(1);

    const highlightedPrimary = this._highlight(primary, matchedKeywords);

    const rootChips    = matchedRoots.slice(0, 5).map(r =>
      `<span class="match-chip match-root" dir="rtl" title="Arabic root">${this._esc(r)}</span>`
    ).join('');
    const kwChips      = matchedKeywords.slice(0, 4).map(k =>
      `<span class="match-chip match-kw">${this._esc(k)}</span>`
    ).join('');
    const patternChips = matchedPatterns.slice(0, 2).map(p =>
      `<span class="match-chip match-pattern">${this._esc(p)}</span>`
    ).join('');

    const hasReasons = rootChips || kwChips || patternChips;

    const othersHtml = others.length
      ? `<div class="other-trans" hidden>
           ${others.map((t, i) => `
             <div class="other-trans-item">
               <span class="trans-label">Translation ${i + 2}</span>
               <p>${this._highlight(t, matchedKeywords)}</p>
             </div>
           `).join('')}
         </div>
         <button class="toggle-trans" type="button">
           + ${others.length} more translation${others.length > 1 ? 's' : ''}
         </button>`
      : '';

    card.innerHTML = `
      <div class="card-meta">
        <span class="ref-badge">${this._esc(ayah.sne)} ${ayah.sn}:${ayah.an}</span>
        <span class="badge ${placeClass}">${ayah.place}</span>
        <span class="badge badge-juz">Juz ${ayah.juz}</span>
      </div>
      <div class="ayah-arabic" dir="rtl" lang="ar">${this._esc(ayah.ar)}</div>
      <div class="ayah-translation">
        <p class="primary-trans">${highlightedPrimary}</p>
        ${othersHtml}
      </div>
      ${hasReasons ? `
      <div class="match-info">
        <span class="match-via">Matched via</span>
        ${rootChips}${kwChips}${patternChips}
      </div>` : ''}
    `;

    const toggleBtn = card.querySelector('.toggle-trans');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const panel = card.querySelector('.other-trans');
        const open  = !panel.hidden;
        panel.hidden = open;
        toggleBtn.textContent = open
          ? `+ ${others.length} more translation${others.length > 1 ? 's' : ''}`
          : '− Hide translations';
      });
    }

    return card;
  }

  // ── Text helpers ─────────────────────────────────────────────────────────

  _esc(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _highlight(rawText, keywords) {
    if (!rawText) return '';
    if (!keywords || !keywords.length) return this._esc(rawText);

    const patterns = keywords
      .filter(k => k && k.length >= 3)
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    if (!patterns) return this._esc(rawText);

    const re    = new RegExp(`\\b(${patterns})\\w*`, 'gi');
    const parts = [];
    let last    = 0;

    for (const m of rawText.matchAll(re)) {
      parts.push(this._esc(rawText.slice(last, m.index)));
      parts.push(`<mark>${this._esc(m[0])}</mark>`);
      last = m.index + m[0].length;
    }
    parts.push(this._esc(rawText.slice(last)));
    return parts.join('');
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

const app = new QuranApp();
document.addEventListener('DOMContentLoaded', () => app.init());
