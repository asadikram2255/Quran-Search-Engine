# Quran Search Engine

A natural-language search engine for the Quran, hosted on GitHub Pages.  
Search with statement queries like *"In which term has Allah addressed believers, non-believers and humans"* and receive ranked, objectively grounded results from authentic Quranic datasets.

**Live:** https://asadikram2255.github.io/Quran-Search-Engine/

---

## Features

- **Natural language queries** — no need for exact keywords; the engine understands Islamic concepts
- **Arabic root-word aware** — searches leverage the word-level Arabic root dataset (77,000+ entries)
- **3 English translations per ayah** — side-by-side comparison tabs on every result card
- **Concept banner** — for semantic queries, shows which Quranic address-forms were detected and how many ayaat match each
- **BM25 ranking** — results scored by relevance, boosted by direct Arabic pattern matches
- **Filters** — Meccan / Medinan, by Surah, by Juz
- **Dark / Light mode** — persisted across sessions
- **Fully static** — no backend, no API key, works entirely in the browser

---

## Datasets used

| File | Content |
|---|---|
| `10. Quran Detailed.csv` | 6236 ayaat with Arabic text, English translation, Juz/Ruku/Manzil, place of revelation |
| `3. Quran Pak with three English translations…` | 3 additional English translations per ayah |
| `Root Words.csv` | 77,431 word-level Arabic root mappings |
| `8. Surah Info.csv` | 114 surah metadata entries |

---

## Running locally

```bash
# 1. Install Python dependencies
pip install -r scripts/requirements.txt

# 2. Generate data files (run once)
python scripts/build_data.py

# 3. Serve locally
python -m http.server 8787
# Open http://localhost:8787
```

## Deploying to GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages → Source → Deploy from a branch → `main` / `root`**
3. The site will be live at `https://asadikram2255.github.io/Quran-Search-Engine/`

> The `data/` folder (generated JSON files) must be committed to the repository for GitHub Pages to serve them.
