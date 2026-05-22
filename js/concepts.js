/**
 * Quran Search Engine — Concept Ontology
 * Maps natural-language English terms to Quranic Arabic patterns and root words.
 * This is the "intelligence" layer that enables semantic query understanding
 * without any external API.
 */

const STOP_WORDS = new Set([
  'a','an','the','in','on','at','to','for','of','and','or','but','is','are',
  'was','were','be','been','being','have','has','had','do','does','did','will',
  'would','could','should','may','might','shall','can','that','this','these',
  'those','it','its','i','me','my','we','our','you','your','he','his','she',
  'her','they','their','them','what','which','who','whom','when','where','why',
  'how','all','each','every','both','few','more','most','other','some','such',
  'no','not','only','same','so','than','too','very','just','with','from','by',
  'about','after','before','between','into','through','during','without','about',
  'against','toward','upon','within','along','following','across','behind','beyond',
  'plus','except','up','out','down','because','though','although','while',
  'allah','god','quran','quranic','islamic','islam','verse','ayah','ayat','ayaat',
  'surah','chapter','almighty','lord','says','said','tell','tells','mentioned',
  'mention','mentions','found','find','find','show','shows','list','give','provides',
]);

/**
 * Addressees: groups that Allah directly addresses with a vocative (يَا ...).
 * ar_patterns: normalized Arabic substrings (no diacritics, alef-normalized).
 */
const ADDRESSEES = [
  {
    id: 'believers',
    label: 'Believers (يَا أَيُّهَا الَّذِينَ آمَنُوا)',
    keywords: [
      'believer','believers','believe','faithful','muslims','who have believed',
      'those who believe','those who believed','o you who believe',
    ],
    ar_patterns: ['يايها الذين امنوا'],
    description: 'Ayaat where Allah addresses the believers with يَا أَيُّهَا الَّذِينَ آمَنُوا',
  },
  {
    id: 'mankind',
    label: 'Mankind (يَا أَيُّهَا النَّاسُ)',
    keywords: [
      'mankind','humans','humanity','people','human beings','o people',
      'o mankind','o humanity','all people',
    ],
    ar_patterns: ['يايها الناس'],
    description: 'Ayaat where Allah addresses all of humanity with يَا أَيُّهَا النَّاسُ',
  },
  {
    id: 'disbelievers',
    label: 'Disbelievers (يَا أَيُّهَا الْكَافِرُونَ)',
    keywords: [
      'disbeliever','disbelievers','unbeliever','unbelievers','kafir','kuffar',
      'non believer','non-believer','non believers','non-believers','infidel','infidels',
    ],
    ar_patterns: ['يايها الكفرون','الذين كفروا'],
    description: 'Ayaat where Allah addresses disbelievers',
  },
  {
    id: 'prophet',
    label: 'The Prophet (يَا أَيُّهَا النَّبِيُّ)',
    keywords: [
      'prophet','messenger','muhammad','o prophet','o messenger',
      'o you the prophet','address prophet',
    ],
    ar_patterns: ['يايها النبي','يايها الرسول'],
    description: 'Ayaat where Allah directly addresses the Prophet ﷺ',
  },
  {
    id: 'people_of_book',
    label: 'People of the Book (يَا أَهْلَ الْكِتَابِ)',
    keywords: [
      'people of the book','people of scripture','ahl al kitab','ahl kitab',
      'jews','christians','o people of the book','scripture people',
    ],
    ar_patterns: ['ياهل الكتب'],
    description: 'Ayaat addressing the Jews and Christians (People of Scripture)',
  },
  {
    id: 'children_of_adam',
    label: 'Children of Adam (يَا بَنِي آدَمَ)',
    keywords: [
      'children of adam','sons of adam','descendants of adam',
      'o children of adam','bani adam',
    ],
    ar_patterns: ['يبني ادم'],
    description: 'Ayaat addressing all human beings as children of Adam',
  },
  {
    id: 'children_of_israel',
    label: 'Children of Israel (يَا بَنِي إِسْرَائِيلَ)',
    keywords: [
      'children of israel','sons of israel','israelites','bani israel',
      'o children of israel','o sons of israel',
    ],
    ar_patterns: ['يبني اسريل'],
    description: 'Ayaat addressing the Children of Israel',
  },
];

/**
 * Topic concepts: thematic search domains with English keywords and Arabic roots.
 */
const TOPICS = [
  {
    id: 'prayer',
    label: 'Prayer (الصلاة)',
    keywords: [
      'prayer','pray','salah','salat','worship','prostrate','prostration',
      'bow','bowing','establish prayer','five prayers',
    ],
    roots: ['ص ل و','ع ب د','س ج د','ر ك ع'],
  },
  {
    id: 'fasting',
    label: 'Fasting (الصيام)',
    keywords: ['fast','fasting','sawm','siyam','ramadan','abstain from food'],
    roots: ['ص و م'],
  },
  {
    id: 'charity',
    label: 'Charity & Zakah (الزكاة)',
    keywords: [
      'charity','zakat','zakah','alms','sadaqah','spend in the way of allah',
      'give to the poor','poor due','almsgiving',
    ],
    roots: ['ز ك و','ص د ق','ن ف ق'],
  },
  {
    id: 'pilgrimage',
    label: 'Pilgrimage (الحج)',
    keywords: ['pilgrimage','hajj','umrah','kaaba','mecca','ihram','tawaf'],
    roots: ['ح ج ج','ط و ف'],
  },
  {
    id: 'paradise',
    label: 'Paradise (الجنة)',
    keywords: [
      'paradise','heaven','jannah','garden','gardens','bliss','hereafter reward',
      'eternal life','everlasting life',
    ],
    roots: ['ج ن ن','ف ر د س','خ ل د'],
  },
  {
    id: 'hellfire',
    label: 'Hellfire (النار / جهنم)',
    keywords: [
      'hell','hellfire','fire','jahannam','torment','punishment','blazing fire',
      'wrath','doom','eternal punishment',
    ],
    roots: ['ن ا ر','ج ح م','س ع ر','ع ذ ب'],
  },
  {
    id: 'mercy',
    label: 'Mercy & Forgiveness (الرحمة)',
    keywords: [
      'mercy','compassion','merciful','compassionate','rahman','raheem',
      'forgiveness','forgive','pardon','kind','blessing',
    ],
    roots: ['ر ح م','غ ف ر','ع ف و','ت و ب'],
  },
  {
    id: 'knowledge',
    label: 'Knowledge & Wisdom (العلم)',
    keywords: [
      'knowledge','knowing','wise','wisdom','aware','all knowing','omniscient',
      'learn','teach','inform','understand',
    ],
    roots: ['ع ل م','ح ك م','خ ب ر','ف ق ه'],
  },
  {
    id: 'creation',
    label: 'Creation (الخلق)',
    keywords: [
      'create','creation','creator','created','make','form','originate',
      'universe','heavens','earth',
    ],
    roots: ['خ ل ق','ف ط ر','ب د ع','ص و ر'],
  },
  {
    id: 'judgment_day',
    label: 'Day of Judgment (يوم القيامة)',
    keywords: [
      'judgment','day of judgment','resurrection','hereafter','akhirah',
      'qiyamah','last day','reckoning','account','deeds weighed','scales',
    ],
    roots: ['ق ي م','ح س ب','ع ر ض','م ي ز'],
  },
  {
    id: 'prophethood',
    label: 'Prophethood (النبوة)',
    keywords: [
      'prophet','messenger','apostle','revelation','message','sent','mission',
      'adam','ibrahim','abraham','noah','nuh','moses','musa','jesus','isa',
      'joseph','yusuf','david','dawud','solomon','sulayman',
    ],
    roots: ['ن ب و','ر س ل','و ح ي'],
  },
  {
    id: 'tawheed',
    label: 'Monotheism (التوحيد)',
    keywords: [
      'monotheism','oneness','one god','only god','tawheed','shirk',
      'polytheism','associating partners','no deity except','lailahaillallah',
    ],
    roots: ['و ح د','ش ر ك','ا ل ه'],
  },
  {
    id: 'patience',
    label: 'Patience & Gratitude (الصبر والشكر)',
    keywords: [
      'patience','patient','perseverance','endure','gratitude','grateful',
      'thankful','thankfulness','sabr','shukr',
    ],
    roots: ['ص ب ر','ش ك ر'],
  },
  {
    id: 'family',
    label: 'Family & Marriage (الأسرة)',
    keywords: [
      'marriage','husband','wife','family','children','parents','mother','father',
      'divorce','nikah','spouse','offspring',
    ],
    roots: ['ن ك ح','ط ل ق','و ل د','ا م م','ا ب و'],
  },
  {
    id: 'jihad',
    label: 'Striving in the Way of Allah (الجهاد)',
    keywords: [
      'strive','striving','jihad','fight','battle','war','defend','path of allah',
      'in the way of allah','martyr','shaheed',
    ],
    roots: ['ج ه د','ق ت ل','س ب ل'],
  },
];

/**
 * Intent detection: what the user wants to do with the results.
 * Maps intent names to trigger phrases.
 */
const INTENTS = {
  address:   ['address','addressed','call','called','say to','said to','speak to',
               'term','phrase','expression','vocative','greeting','how does allah address',
               'how does god address','what term','what word','what phrase','how addressed'],
  command:   ['command','commanded','order','instruction','obligatory','must','prescribed',
               'duty','what are we ordered','told to','required to'],
  forbid:    ['forbid','forbidden','prohibited','haram','not allowed','must not',
               'avoid','prohibited from'],
  reward:    ['reward','promise','good news','promised','paradise for','heaven for',
               'what reward'],
  warn:      ['warn','warning','threat','consequence','punishment for','result of',
               'what happens if'],
  count:     ['how many','how many times','how often','count','frequency','number of times',
               'occurs','appear','appears'],
  story:     ['story','stories','narrative','tale','history','what happened to',
               'incident','event'],
};

/**
 * Normalize Arabic text for fuzzy matching.
 * Removes diacritics, Quranic annotation marks, normalizes alef/hamza variants.
 * Applied identically to both stored text and search patterns.
 */
function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[ؐ-ًؚ-ٰٟ]/g, '')  // tashkeel + superscript alef
    .replace(/[ۖ-ۭ]/g, '')                       // Quranic annotation marks
    .replace(/[؀-؏]/g, '')                       // Arabic number/sign chars
    .replace(/[أإآٱ]/g, 'ا')     // normalize alef variants -> alef
    .replace(/ء/g, '')                                 // remove standalone hamza
    .replace(/ى/g, 'ي')                         // alef maqsura -> ya
    .replace(/ة/g, 'ه')                         // ta marbuta -> ha
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a natural-language English query into a structured search request.
 * Returns: { keywords, arabicPatterns, roots, intents, addresseeIds, topicIds }
 */
function parseQuery(rawQuery) {
  const q = rawQuery.toLowerCase();

  const matched = {
    keywords: [],
    arabicPatterns: [],
    roots: [],
    intents: [],
    addresseeIds: [],
    topicIds: [],
  };

  // Detect intents
  for (const [intent, triggers] of Object.entries(INTENTS)) {
    if (triggers.some(t => q.includes(t))) {
      matched.intents.push(intent);
    }
  }

  // Detect addressee concepts
  for (const addr of ADDRESSEES) {
    if (addr.keywords.some(kw => q.includes(kw))) {
      matched.addresseeIds.push(addr.id);
      matched.arabicPatterns.push(...addr.ar_patterns);
    }
  }

  // Detect topic concepts
  for (const topic of TOPICS) {
    const hitKeywords = topic.keywords.filter(kw => q.includes(kw));
    if (hitKeywords.length > 0) {
      matched.topicIds.push(topic.id);
      matched.roots.push(...topic.roots);
      matched.keywords.push(...hitKeywords);
    }
  }

  // Tokenize remaining meaningful words as generic keywords
  const tokens = rawQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));

  for (const t of tokens) {
    if (!matched.keywords.includes(t)) matched.keywords.push(t);
  }

  matched.keywords = [...new Set(matched.keywords)];
  matched.arabicPatterns = [...new Set(matched.arabicPatterns)];
  matched.roots = [...new Set(matched.roots)];

  return matched;
}
