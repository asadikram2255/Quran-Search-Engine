/**
 * Quran Search Engine — Main Application
 */

const PAGE_SIZE = 20;

class QuranApp {
  constructor() {
    this.ayaat   = null;
    this.surahs  = null;
    this.engine  = null;
    this.results = [];
    this.page    = 0;
    this.filters = { place: '', surah: '', juz: '' };
    this.dark    = localStorage.getItem('theme') === 'dark';
  }

  // ─── Init ────────────────────────────────────────────────────────────────

  async init() {
    this._applyTheme();
    this._bindStatic();

    try {
      this._setLoading('Loading Quran data…');

      const [ayaatData, surahData] = await Promise.all([
        fetch('data/quran.json').then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        fetch('data/surah.json').then(r => r.json()),
      ]);

      this.ayaat  = ayaatData;
      this.surahs = surahData;

      this._setLoading('Building search index…');

      // Yield to browser so the loading message renders
      await new Promise(r => setTimeout(r, 30));

      this.engine = new QuranSearch(this.ayaat);

      this._hideLoading();
      this._populateFilters();
      this._bindSearch();

    } catch (err) {
      console.error(err);
      this._setLoading(`Error: ${err.message} — Make sure you have run scripts/build_data.py first.`, true);
    }
  }

  // ─── Theme ───────────────────────────────────────────────────────────────

  _applyTheme() {
    document.documentElement.setAttribute('data-theme', this.dark ? 'dark' : 'light');
  }

  _toggleTheme() {
    this.dark = !this.dark;
    localStorage.setItem('theme', this.dark ? 'dark' : 'light');
    this._applyTheme();
  }

  // ─── Loading state ───────────────────────────────────────────────────────

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

  // ─── Populate filter dropdowns ───────────────────────────────────────────

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

  // ─── Event binding ───────────────────────────────────────────────────────

  _bindStatic() {
    document.getElementById('theme-toggle').addEventListener('click', () => this._toggleTheme());
  }

  _bindSearch() {
    const input  = document.getElementById('search-input');
    const btn    = document.getElementById('search-btn');
    const chips  = document.querySelectorAll('.example-chip');
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

    chips.forEach(c => c.addEventListener('click', () => {
      input.value = c.dataset.query;
      doSearch();
    }));

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

  // ─── Run search ──────────────────────────────────────────────────────────

  _run(query) {
    if (!query) return;

    this.results = this.engine.search(query, this.filters, 200);
    const summary = this.engine.conceptSummary(query);

    this._renderBanner(summary, query);
    this._renderPage(false);

    document.getElementById('filter-bar').hidden = false;
    document.getElementById('results-section').hidden = false;
    document.getElementById('search-section').classList.add('compact');

    // Update result count
    const countEl = document.getElementById('results-count');
    countEl.textContent = this.results.length
      ? `${this.results.length} ayaat found`
      : '';

    // Scroll to results
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── Render concept banner ───────────────────────────────────────────────

  _renderBanner(summary, query) {
    const banner = document.getElementById('concept-banner');
    if (!summary.length) {
      banner.hidden = true;
      return;
    }

    banner.innerHTML = summary.map(s => `
      <div class="concept-card">
        <span class="concept-label">${s.label}</span>
        <span class="concept-desc">${s.description}</span>
        <span class="concept-count">${s.count} ayaat</span>
      </div>
    `).join('');
    banner.hidden = false;
  }

  // ─── Render result page ──────────────────────────────────────────────────

  _renderPage(append) {
    const grid    = document.getElementById('results-grid');
    const noRes   = document.getElementById('no-results');
    const moreWrap = document.getElementById('load-more-wrapper');

    if (!append) grid.innerHTML = '';

    if (this.results.length === 0) {
      noRes.hidden   = false;
      moreWrap.hidden = true;
      return;
    }
    noRes.hidden = true;

    const start = this.page * PAGE_SIZE;
    const slice = this.results.slice(start, start + PAGE_SIZE);

    for (const r of slice) {
      grid.appendChild(this._buildCard(r));
    }

    const shown = (this.page + 1) * PAGE_SIZE;
    moreWrap.hidden = shown >= this.results.length;
  }

  // ─── Build a result card ─────────────────────────────────────────────────

  _buildCard({ ayah, score, matchedConcepts }) {
    const card = document.createElement('article');
    card.className = 'result-card';

    // Meta row
    const placeClass = ayah.place === 'Meccan' ? 'badge-mecca' : 'badge-medina';

    // Translations — pick which ones to show
    const tabs = [
      { id: 'en',  label: 'Translation 1', text: ayah.en  },
      { id: 't1',  label: 'Translation 2', text: ayah.t1  },
      { id: 't2',  label: 'Translation 3', text: ayah.t2  },
    ].filter(t => t.text);

    const tabsHtml = tabs.length > 1
      ? `<div class="trans-tabs">
           ${tabs.map((t, i) => `
             <button class="tab-btn ${i === 0 ? 'active' : ''}"
                     data-tab="${t.id}">${t.label}</button>
           `).join('')}
         </div>
         ${tabs.map((t, i) => `
           <div class="trans-panel ${i === 0 ? 'active' : ''}" data-panel="${t.id}">
             ${this._escHtml(t.text)}
           </div>
         `).join('')}`
      : `<div class="trans-panel active">${this._escHtml((tabs[0] || {}).text || '')}</div>`;

    const conceptBadges = matchedConcepts.map(c =>
      `<span class="concept-chip">${this._escHtml(c)}</span>`
    ).join('');

    card.innerHTML = `
      <div class="card-meta">
        <a class="ref-badge" href="#" title="Surah ${ayah.sne}">
          ${this._escHtml(ayah.sne)} ${ayah.sn}:${ayah.an}
        </a>
        <span class="badge ${placeClass}">${ayah.place}</span>
        <span class="badge badge-juz">Juz ${ayah.juz}</span>
        ${conceptBadges}
      </div>
      <div class="ayah-arabic" dir="rtl" lang="ar">${this._escHtml(ayah.ar)}</div>
      <div class="trans-wrapper">
        ${tabsHtml}
      </div>
    `;

    // Tab switching
    card.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        card.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        card.querySelectorAll('.trans-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        card.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add('active');
      });
    });

    return card;
  }

  _escHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ─── Boot ────────────────────────────────────────────────────────────────────

const app = new QuranApp();
document.addEventListener('DOMContentLoaded', () => app.init());
