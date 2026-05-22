/**
 * Quran Search Engine — BM25 Search Engine
 * Builds an in-memory inverted index from the loaded Quran data and scores
 * documents using BM25 + Arabic pattern boosting + root word matching.
 */

class QuranSearch {
  constructor(ayaat) {
    this.ayaat    = ayaat;
    this.ayaatMap = {};         // id -> ayah
    this.invIndex = {};         // term -> { docId: tf }
    this.docLens  = {};         // docId -> token count
    this.arNorm   = {};         // docId -> normalized Arabic string
    this.rootIdx  = {};         // root -> Set of docIds
    this.avgLen   = 0;
    this.N        = ayaat.length;

    this._build();
  }

  // ─── Build index ────────────────────────────────────────────────────────

  _build() {
    let totalLen = 0;

    for (const ayah of this.ayaat) {
      this.ayaatMap[ayah.id] = ayah;

      // Combine all English text fields for indexing
      const text = [ayah.en, ayah.t1, ayah.t2, ayah.t3]
        .filter(Boolean).join(' ');

      const tokens = this._tokenize(text);
      this.docLens[ayah.id] = tokens.length;
      totalLen += tokens.length;

      // Term frequencies
      const tf = {};
      for (const tok of tokens) tf[tok] = (tf[tok] || 0) + 1;

      for (const [term, freq] of Object.entries(tf)) {
        if (!this.invIndex[term]) this.invIndex[term] = {};
        this.invIndex[term][ayah.id] = freq;
      }

      // Normalized Arabic
      this.arNorm[ayah.id] = normalizeArabic(ayah.ar);

      // Root word index
      for (const root of (ayah.roots || [])) {
        if (!this.rootIdx[root]) this.rootIdx[root] = new Set();
        this.rootIdx[root].add(ayah.id);
      }
    }

    this.avgLen = totalLen / this.N;
  }

  // ─── Tokenize ────────────────────────────────────────────────────────────

  _tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOP_WORDS.has(t));
  }

  // ─── BM25 ────────────────────────────────────────────────────────────────

  _bm25(term, docId, k1 = 1.5, b = 0.75) {
    const postings = this.invIndex[term];
    if (!postings) return 0;
    const tf = postings[docId] || 0;
    if (tf === 0) return 0;

    const df    = Object.keys(postings).length;
    const idf   = Math.log((this.N - df + 0.5) / (df + 0.5) + 1);
    const dlen  = this.docLens[docId] || 1;
    const norm  = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dlen / this.avgLen));
    return idf * norm;
  }

  // ─── Main search ─────────────────────────────────────────────────────────

  /**
   * @param {string} rawQuery  - natural language query
   * @param {object} filters   - { place, surah, juz }
   * @param {number} limit     - max results to return
   * @returns {Array<{ayah, score, matchedConcepts}>}
   */
  search(rawQuery, filters = {}, limit = 100) {
    if (!rawQuery.trim()) return [];

    const parsed  = parseQuery(rawQuery);
    const scores  = {};   // docId -> score
    const reasons = {};   // docId -> Set of matched concept labels

    const addScore = (id, delta, label) => {
      scores[id]  = (scores[id]  || 0) + delta;
      if (label) {
        if (!reasons[id]) reasons[id] = new Set();
        reasons[id].add(label);
      }
    };

    // 1. BM25 on English keywords
    for (const term of parsed.keywords) {
      const postings = this.invIndex[term] || {};
      for (const [idStr, _] of Object.entries(postings)) {
        const id = +idStr;
        addScore(id, this._bm25(term, id), null);
      }
    }

    // 2. Arabic pattern matching — highest-signal boost
    for (const pattern of parsed.arabicPatterns) {
      const normPat = normalizeArabic(pattern);
      for (const ayah of this.ayaat) {
        if (this.arNorm[ayah.id].includes(normPat)) {
          // Find which addressee concept this pattern belongs to
          const concept = ADDRESSEES.find(a => a.ar_patterns.includes(pattern));
          addScore(ayah.id, 15, concept ? concept.label : 'Direct Arabic match');
        }
      }
    }

    // 3. Root word matching — moderate boost
    for (const root of parsed.roots) {
      const ids = this.rootIdx[root];
      if (ids) {
        const topic = TOPICS.find(t => t.roots.includes(root));
        for (const id of ids) {
          addScore(id, 2, topic ? topic.label : null);
        }
      }
    }

    // 4. Surah-name matching (e.g. query mentions "Al-Baqarah")
    // Already handled implicitly via English keywords.

    // 5. Build result list
    let results = Object.entries(scores)
      .map(([idStr, score]) => ({
        ayah: this.ayaatMap[+idStr],
        score,
        matchedConcepts: reasons[+idStr] ? [...reasons[+idStr]] : [],
      }))
      .filter(r => r.ayah);

    // 6. Apply filters
    if (filters.place) {
      const p = filters.place.toLowerCase();
      results = results.filter(r => r.ayah.place.toLowerCase() === p);
    }
    if (filters.surah) {
      const sn = +filters.surah;
      results = results.filter(r => r.ayah.sn === sn);
    }
    if (filters.juz) {
      const jn = +filters.juz;
      results = results.filter(r => r.ayah.juz === jn);
    }

    // 7. Sort: score desc, then Quran order
    results.sort((a, b) => b.score - a.score || a.ayah.id - b.ayah.id);

    return results.slice(0, limit);
  }

  /**
   * Get concept summary for a query — used to build the banner above results.
   * Returns array of { concept, count, label, description }
   */
  conceptSummary(rawQuery) {
    const parsed = parseQuery(rawQuery);
    const summary = [];

    for (const addrId of parsed.addresseeIds) {
      const addr = ADDRESSEES.find(a => a.id === addrId);
      if (!addr) continue;
      // Count ayaat matching this pattern
      let count = 0;
      for (const pattern of addr.ar_patterns) {
        const normPat = normalizeArabic(pattern);
        for (const id in this.arNorm) {
          if (this.arNorm[id].includes(normPat)) count++;
        }
      }
      summary.push({
        type: 'addressee',
        label: addr.label,
        description: addr.description,
        count,
      });
    }

    for (const topicId of parsed.topicIds) {
      const topic = TOPICS.find(t => t.id === topicId);
      if (!topic) continue;
      let count = 0;
      for (const root of topic.roots) {
        if (this.rootIdx[root]) count += this.rootIdx[root].size;
      }
      // Deduplicate
      summary.push({
        type: 'topic',
        label: topic.label,
        description: `Ayaat related to ${topic.label} (matched via Arabic root words)`,
        count,
      });
    }

    return summary;
  }
}
