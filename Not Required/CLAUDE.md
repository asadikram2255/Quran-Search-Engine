# Quran Search Engine — Claude Context

A fully static, browser-based natural-language search engine for the Quran.
Hosted on GitHub Pages. No backend, no API key required for core search.
Live: https://asadikram2255.github.io/Quran-Search-Engine/

---

## Project Structure

```
Quran-Search-Engine/
├── index.html               # Single-page app
├── css/style.css            # All styles (light/dark theme)
├── js/
│   ├── concepts.js          # Concept ontology, transliteration map, parseQuery()
│   ├── search.js            # QuranSearch class (BM25 + Arabic pipeline)
│   └── app.js               # QuranApp controller (UI, rendering, events)
├── scripts/
│   └── build_data.py        # Preprocessing pipeline: CSVs → JSON
├── data/                    # Pre-built JSON (committed to repo for GitHub Pages)
│   ├── quran.json           # 6,236 ayaat with Arabic, 4 translations, metadata
│   ├── surah.json           # 114 surahs with metadata
│   ├── juz.json             # 30 juz with boundaries
│   ├── word_roots.json      # normalizedArabicWord → [roots]
│   └── root_vocab.json      # root → [{n: normWord, c: count}] top-25 words
├── Datasets/                # Raw CSV source files (not committed — too large)
│   ├── 10. Quran Detailed.csv
│   ├── 3. Quran Pak with three English translations and two english tafseers.csv
│   ├── Root Words.csv
│   └── 8. Surah Info.csv
└── CLAUDE.md                # This file
```

---

## Running Locally

```bash
# 1. Install Python deps (first time only)
pip install -r scripts/requirements.txt

# 2. Build JSON data files (first time, or after dataset changes)
python scripts/build_data.py

# 3. Serve
python -m http.server 8787
# Open http://localhost:8787
```

The `.claude/launch.json` is configured so Claude Code can start the server automatically.

---

## Architecture

### Search Pipeline (js/search.js — async)

Every query goes through these steps in order:

1. **parseQuery()** (`concepts.js`) — expand transliterations, detect intents/addressees/topics, extract keywords + roots + Arabic patterns
2. **Translate to Arabic** — MyMemory free API (`api.mymemory.translated.net`), cached in sessionStorage, 5 s timeout. Falls back silently.
3. **Extract roots from translation** — look up each normalized Arabic word in `word_roots.json`. Score: +4 per root hit.
4. **Arabic pattern matching** — normalized substring search for addressee vocatives (يَا أَيُّهَا etc.). Score: +18 per match.
5. **Concept root matching** — roots from TOPICS/TRANSLITERATIONS in `concepts.js`. Score: +2 per root hit.
6. **English BM25** — inverted index over all 4 English text fields, with suffix stemming.
7. **Phrase boost** — adjacent word pairs and quoted phrases. Score: +6.
8. **Exact Arabic word matching** — normalized word lookup with prefix variants (و، ف، ب، ل، لل). Score: +30. Results sorted in Quran order when exact matches exist.
9. **Root fallback** — if exact word matched nothing (encoding mismatch), fall back to root score +28.

Returns: `{ results, arabicQuery, extractedRoots, exactCount }`

Each result object: `{ ayah, score, matchedRoots[], matchedKeywords[], matchedPatterns[] }`

### Concept Ontology (js/concepts.js)

Three main data structures:

**`TRANSLITERATIONS`** (189 entries)
Maps Arabic/Islamic/Urdu transliterated terms to English keyword expansions + Arabic roots.
Examples: `taqwa → ['piety','righteousness','fear of allah',...] + ['و ق ي']`
Applied in Step 1 of `parseQuery()` using whole-word regex matching.

**`ADDRESSEES`** (7 entries)
Vocative forms Allah uses to address different groups.
Each has `keywords[]`, `ar_patterns[]` (normalized Arabic), `description`.
- believers: `يايها الذين امنوا` → 89 ayaat
- mankind: `يايها الناس` → 20 ayaat
- disbelievers: `يايها الكفرون` / `الذين كفروا` → 153 ayaat
- prophet: `يايها النبي` / `يايها الرسول`
- people of book: `ياهل الكتب`
- children of adam: `يبني ادم`
- children of israel: `يبني اسريل`

**`TOPICS`** (57 categories)
Thematic search domains — each has `keywords[]` and `roots[]`.
Groups: Worship & Pillars, Theology & Creed, Eschatology, Virtues, Vices,
Family & Social, Finance & Law, Knowledge & Guidance, Creation & Nature,
Stories & History, Inner Self & Metaphysical, Jihad.

**`parseQuery()`** returns:
```javascript
{
  keywords:       string[],   // English BM25 terms
  arabicPatterns: string[],   // normalized Arabic substrings for addressee matching
  roots:          string[],   // Arabic roots (from concepts + transliterations)
  intents:        string[],   // 'address' | 'command' | 'forbid' | 'reward' | 'warn' | 'count' | 'story'
  addresseeIds:   string[],   // matched ADDRESSEES ids
  topicIds:       string[],   // matched TOPICS ids
  exactWords:     string[],   // normalized Arabic words for exact matching (if populated)
  exactRoots:     string[],   // roots as fallback for exactWords
}
```
> **Note:** `exactWords` and `exactRoots` are referenced in `search.js` Steps 6/6b but are
> currently returned as undefined by `parseQuery()` (handled via `|| []` fallback).
> These were used in an earlier version for specific Arabic word lookups.

### Arabic Normalization (CRITICAL — must stay consistent)

Both `js/concepts.js` and `scripts/build_data.py` normalize Arabic identically:
```
1. Remove tashkeel + superscript alef (U+0670) range [ؐ-ًؚ-ٰٟ]
2. Remove Quranic annotation marks [ۖ-ۭ]
3. Remove Arabic number/sign chars [؀-؏]
4. Normalize alef variants (أإآٱ → ا)
5. Remove standalone hamza (ء → '')
6. alef maqsura → ya (ى → ي)
7. ta marbuta → ha (ة → ه)
```
**The `ar_patterns` in ADDRESSEES were verified empirically** by running
`app.engine.arNorm[ayah.id].substring(0,40)` on known ayaat in the browser console.
Do not change normalization without re-verifying all patterns.

### Answer Panel

Triggered for question-style queries that contain strong term/address clues
(e.g. "which terms does Allah use to address believers").
Detected by `_detectAnswerType()` in `app.js`.

Shows two grids:
- **Vocative patterns** — all 7 ADDRESSEES with ayah counts, clickable to filter results
- **Reference vocabulary** — top Arabic words for the query's roots via `getTermsForRoots()`

Clicking a card filters the results grid to matching ayaat. Click again to deselect.

---

## Data Files

### quran.json — ayah object shape
```json
{
  "id":    1,           // absolute ayah number (1–6236)
  "sn":    1,           // surah number
  "an":    1,           // ayah number within surah
  "sne":   "Al-Fatihah",
  "sna":   "الفاتحة",
  "snr":   "Al-Faatiha",
  "ar":    "بِسۡمِ ٱللَّهِ...",   // Arabic text with full diacritics
  "en":    "In the name...",       // primary translation
  "t1":    "...",                  // translation 2
  "t2":    "...",                  // translation 3
  "t3":    "...",                  // translation 4
  "juz":   1,
  "ruku":  1,
  "manzil":1,
  "place": "Meccan",
  "roots": ["ب س م","ا ل ه","ر ح م"]
}
```

### word_roots.json
```json
{ "بسم": ["ب س م"], "الرحمن": ["ر ح م"], ... }
```
Keys are **normalized** Arabic words. Built from `Root Words.csv`.

### root_vocab.json
```json
{ "ر ح م": [{"n":"الرحمن","c":57}, {"n":"رحمه","c":23}, ...] }
```
Used by the Answer Panel to display vocabulary cards. Top 25 words per root.

---

## Known Issues & Design Decisions

- **`exactWords` / `exactRoots` not populated** — `parseQuery()` doesn't yet return these.
  `search.js` handles it gracefully via `|| []`. Future enhancement: add Arabic word
  extraction from TRANSLITERATIONS to populate these for direct Arabic word matching.

- **Transliteration categories are self-defined** — the 57 TOPICS and 189 TRANSLITERATIONS
  were built from general Islamic knowledge in training data, NOT from a specific scholarly
  source. Keywords and root assignments should be reviewed by a knowledgeable person.

- **MyMemory API rate limit** — the free tier allows ~5,000 chars/day per IP. Queries are
  cached in `sessionStorage` to minimize API calls. Search still works without it (falls
  back to English-only BM25 + concept roots).

- **Datasets not in repo** — the raw CSV files are in `Datasets/` which is gitignored
  (too large). The built `data/*.json` files ARE committed so GitHub Pages works.

---

## GitHub & Deployment

- **Repo:** https://github.com/asadikram2255/Quran-Search-Engine
- **Live site:** https://asadikram2255.github.io/Quran-Search-Engine/
- **Deploy:** Push to `main`. GitHub Pages serves from root of `main` branch.
- **Cache busting:** JS files loaded with `?v=8` in `index.html`. Increment when making
  JS changes that need to bypass browser cache.

---

## Quick Debug Reference

```javascript
// In browser console after a search:

// Check what a query parses to:
parseQuery('your query here')

// Check normalized Arabic for a specific ayah:
app.engine.arNorm[89]   // ayah id 89

// Run a search directly:
app.engine.search('taqwa', {}).then(r => console.log(r.results.slice(0,3)))

// Count addressee matches:
app.engine.countForAddressees()

// Check transliteration expansions:
Object.keys(TRANSLITERATIONS).length  // should be 189
TRANSLITERATIONS['taqwa']
```
