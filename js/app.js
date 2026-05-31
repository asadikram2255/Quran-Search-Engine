/**
 * Quran Search Engine — Application Controller
 */

const PAGE_SIZE = 20;

class QuranApp {
  constructor() {
    this.ayaat     = null;
    this.surahs    = null;
    this.wordRoots = null;
    this.engine    = null;
    this.results   = [];
    this.page      = 0;
    this.filters   = { place: '', surah: '', juz: '' };
    this.dark      = localStorage.getItem('theme') === 'dark';
    this._lastQuery = '';
    this._lastKeywords = [];
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  async init() {
    this._applyTheme();
    this._bindStatic();

    try {
      this._setLoading('Loading Quran data…');

      const [ayaatData, surahData, wordRootsData] = await Promise.all([
        fetch('data/quran.json').then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        fetch('data/surah.json').then(r => r.json()),
        fetch('data/word_roots.json').then(r => r.json()),
      ]);

      this.ayaat     = ayaatData;
      this.surahs    = surahData;
      this.wordRoots = wordRootsData;

      this._setLoading('Building search index…');
      await new Promise(r => setTimeout(r, 30));

      this.engine = new QuranSearch(this.ayaat, this.wordRoots);

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

  // ── Run search ───────────────────────────────────────────────────────────

  async _run(query) {
    if (!query) return;
    this._lastQuery = query;

    // Show the compact hero + progress bar
    document.getElementById('search-section').classList.add('compact');
    document.getElementById('filter-bar').hidden = true;
    document.getElementById('results-section').hidden = true;
    this._showProgress('translate');

    try {
      const { results, arabicQuery, extractedRoots } = await this.engine.search(
        query,
        this.filters,
        200,
        step => this._showProgress(step),
      );

      this.results = results;
      this._lastKeywords = parseQuery(query).keywords;

      this._hideProgress();
      this._renderPipelineInfo(arabicQuery, extractedRoots);
      this._renderPage(false);

      document.getElementById('filter-bar').hidden = false;
      document.getElementById('results-section').hidden = false;

      const countEl = document.getElementById('results-count');
      countEl.textContent = results.length
        ? `${results.length} ayaat found`
        : '';

      document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error(err);
      this._hideProgress();
    }
  }

  // ── Search progress bar ──────────────────────────────────────────────────

  _showProgress(step) {
    const bar = document.getElementById('search-progress');
    bar.hidden = false;
    const steps = ['translate', 'roots', 'search'];
    const idx = steps.indexOf(step);
    steps.forEach((s, i) => {
      const el = bar.querySelector(`[data-step="${s}"]`);
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
    if (!arabicQuery && !extractedRoots.length) {
      strip.hidden = true;
      return;
    }

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

    // Translations — primary + others
    const allTrans = [ayah.en, ayah.t1, ayah.t2, ayah.t3].filter(Boolean);
    const primary  = allTrans[0] || '';
    const others   = allTrans.slice(1);

    // Highlight matched keywords in the primary translation
    const highlightedPrimary = this._highlight(primary, matchedKeywords);

    // Match-reason chips
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

    // Other translations HTML
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

    // Toggle other translations
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

    const re = new RegExp(`\\b(${patterns})\\w*`, 'gi');
    const parts = [];
    let last = 0;

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
