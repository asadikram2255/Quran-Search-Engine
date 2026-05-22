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
 * Transliteration map: Arabic/Islamic/Urdu terms -> English expansion + roots.
 * Allows queries like "bismillah", "taqwa", "riba" to find matching ayaat.
 * Each entry: { english: [...keywords to inject], roots: [...Arabic roots] }
 */
const TRANSLITERATIONS = {
  // ── Basmalah & invocation ──────────────────────────────────────────────────
  'bismillah':      { english: ['name of allah','name god'], roots: ['س م و','ب س م'] },
  'basmalah':       { english: ['name of allah','in the name'], roots: ['س م و'] },
  'alhamdulillah':  { english: ['praise allah','praise god','all praise'], roots: ['ح م د'] },
  'subhanallah':    { english: ['glorify allah','glory to allah','exalt'], roots: ['س ب ح'] },
  'astaghfirullah': { english: ['seek forgiveness','forgive me allah'], roots: ['غ ف ر'] },
  'mashallah':      { english: ['will of allah','what allah wills'], roots: ['ش ي ا','و ل ي'] },
  'inshallah':      { english: ['if allah wills','will of allah','god willing'], roots: ['ش ي ا'] },

  // ── Core worship acts ──────────────────────────────────────────────────────
  'salah':     { english: ['prayer','pray','worship'], roots: ['ص ل و','ع ب د'] },
  'salat':     { english: ['prayer','pray','worship'], roots: ['ص ل و'] },
  'namaz':     { english: ['prayer','pray'], roots: ['ص ل و'] },
  'sawm':      { english: ['fasting','fast','abstain'], roots: ['ص و م'] },
  'siyam':     { english: ['fasting','fast'], roots: ['ص و م'] },
  'roza':      { english: ['fasting','fast'], roots: ['ص و م'] },
  'zakat':     { english: ['charity','alms','poor due','purification of wealth'], roots: ['ز ك و','ن ف ق'] },
  'zakah':     { english: ['charity','alms','poor due'], roots: ['ز ك و'] },
  'hajj':      { english: ['pilgrimage','holy pilgrimage','kaaba','mecca'], roots: ['ح ج ج'] },
  'umrah':     { english: ['pilgrimage','lesser pilgrimage'], roots: ['ع م ر'] },
  'jihad':     { english: ['strive','striving','effort','struggle','path of allah'], roots: ['ج ه د'] },

  // ── Purification ──────────────────────────────────────────────────────────
  'wudu':      { english: ['ablution','purification','wash','clean'], roots: ['و ض ا','ط ه ر'] },
  'wudhu':     { english: ['ablution','purification','wash'], roots: ['و ض ا','ط ه ر'] },
  'ghusl':     { english: ['ritual bath','purification','wash','cleanse'], roots: ['غ س ل','ط ه ر'] },
  'tayammum':  { english: ['dry ablution','purification with dust','soil'], roots: ['ي م م','ط ه ر'] },
  'tahara':    { english: ['purification','purity','clean'], roots: ['ط ه ر'] },
  'taharah':   { english: ['purification','purity','clean'], roots: ['ط ه ر'] },

  // ── Prayer postures ────────────────────────────────────────────────────────
  'sujood':    { english: ['prostration','prostrate','bow down'], roots: ['س ج د'] },
  'sajdah':    { english: ['prostration','prostrate'], roots: ['س ج د'] },
  'ruku':      { english: ['bowing','bow','kneel'], roots: ['ر ك ع'] },
  'qiyam':     { english: ['standing','stand in prayer'], roots: ['ق و م'] },
  'tashahhud': { english: ['testimony','testify','witness'], roots: ['ش ه د'] },

  // ── Spiritual qualities ───────────────────────────────────────────────────
  'taqwa':     { english: ['piety','righteousness','fear of allah','god-consciousness','devout'], roots: ['و ق ي'] },
  'iman':      { english: ['faith','belief','believe','trust in allah'], roots: ['ا م ن'] },
  'ihsan':     { english: ['excellence','perfection','good deeds','righteous'], roots: ['ح س ن'] },
  'ikhlas':    { english: ['sincerity','sincere','purely for allah'], roots: ['خ ل ص'] },
  'tawakkul':  { english: ['trust in allah','reliance on allah','put trust'], roots: ['و ك ل'] },
  'tawakkal':  { english: ['trust in allah','reliance on allah'], roots: ['و ك ل'] },
  'sabr':      { english: ['patience','patient','perseverance','steadfast'], roots: ['ص ب ر'] },
  'shukr':     { english: ['gratitude','grateful','thankful','thankfulness'], roots: ['ش ك ر'] },
  'tawbah':    { english: ['repentance','repent','turn back to allah'], roots: ['ت و ب'] },
  'tawba':     { english: ['repentance','repent'], roots: ['ت و ب'] },
  'istighfar': { english: ['seek forgiveness','ask forgiveness','repent'], roots: ['غ ف ر'] },
  'dua':       { english: ['supplication','prayer','invoke','call upon','ask allah'], roots: ['د ع و'] },
  'dhikr':     { english: ['remembrance of allah','remember allah','mention allah','glorify'], roots: ['ذ ك ر'] },
  'zikr':      { english: ['remembrance of allah','remember allah'], roots: ['ذ ك ر'] },
  'tasbih':    { english: ['glorification','glorify allah','subhan'], roots: ['س ب ح'] },
  'istiqamah': { english: ['steadfastness','stand firm','upright','straight path'], roots: ['ق و م','س ت ق'] },

  // ── Faith concepts ────────────────────────────────────────────────────────
  'tawheed':   { english: ['monotheism','oneness of allah','one god','no deity except'], roots: ['و ح د'] },
  'tauhid':    { english: ['monotheism','oneness of allah'], roots: ['و ح د'] },
  'yaqeen':    { english: ['certainty','certain','conviction','sure'], roots: ['ي ق ن'] },
  'yaqin':     { english: ['certainty','certain'], roots: ['ي ق ن'] },
  'niyyah':    { english: ['intention','intend','purpose'], roots: ['ن و ي'] },
  'niyat':     { english: ['intention','intend'], roots: ['ن و ي'] },

  // ── Negative traits ───────────────────────────────────────────────────────
  'kufr':      { english: ['disbelief','reject faith','deny','ingratitude'], roots: ['ك ف ر'] },
  'nifaq':     { english: ['hypocrisy','hypocrite','two-faced'], roots: ['ن ف ق'] },
  'shirk':     { english: ['polytheism','associating partners','idolatry','idol'], roots: ['ش ر ك'] },
  'kibr':      { english: ['arrogance','pride','haughty','proud'], roots: ['ك ب ر'] },
  'hasad':     { english: ['envy','jealousy','malice'], roots: ['ح س د'] },
  'zulm':      { english: ['injustice','oppression','wrong','wrongdoer','transgress'], roots: ['ظ ل م'] },
  'zulum':     { english: ['injustice','oppression','wrong'], roots: ['ظ ل م'] },
  'fasad':     { english: ['corruption','corrupt','mischief','spread corruption'], roots: ['ف س د'] },
  'fitnah':    { english: ['trial','tribulation','temptation','discord','strife'], roots: ['ف ت ن'] },
  'fitna':     { english: ['trial','tribulation','temptation'], roots: ['ف ت ن'] },
  'kibr':      { english: ['arrogance','haughty','proud'], roots: ['ك ب ر'] },
  'riya':      { english: ['showing off','ostentation','hypocrisy'], roots: ['ر ا ي'] },

  // ── Family & social law ───────────────────────────────────────────────────
  'nikah':     { english: ['marriage','marry','wed','spouse'], roots: ['ن ك ح'] },
  'talaq':     { english: ['divorce','separation','dissolve marriage'], roots: ['ط ل ق'] },
  'mahr':      { english: ['dowry','bridal gift','dower','marriage gift'], roots: ['م ه ر'] },
  'iddah':     { english: ['waiting period','divorce waiting','remarriage period'], roots: ['ع د د'] },
  'iddat':     { english: ['waiting period'], roots: ['ع د د'] },
  'walimah':   { english: ['wedding feast','marriage feast'], roots: ['و ل م'] },
  'mahram':    { english: ['prohibited kin','unmarriageable relatives'], roots: ['ح ر م'] },

  // ── Finance & trade ───────────────────────────────────────────────────────
  'riba':      { english: ['usury','interest','increase unlawful','prohibited interest'], roots: ['ر ب و'] },
  'sood':      { english: ['usury','interest'], roots: ['ر ب و'] },
  'bay':       { english: ['trade','sale','sell','buy'], roots: ['ب ي ع'] },
  'tijara':    { english: ['trade','commerce','business','merchant'], roots: ['ت ج ر'] },
  'tijarah':   { english: ['trade','commerce','business'], roots: ['ت ج ر'] },
  'halal':     { english: ['permissible','lawful','allowed','licit'], roots: ['ح ل ل'] },
  'haram':     { english: ['forbidden','prohibited','unlawful','illicit'], roots: ['ح ر م'] },
  'waqf':      { english: ['endowment','charitable donation'], roots: ['و ق ف'] },
  'mirath':    { english: ['inheritance','inheriting','estate'], roots: ['و ر ث'] },
  'wirasah':   { english: ['inheritance'], roots: ['و ر ث'] },

  // ── Legal punishments ──────────────────────────────────────────────────────
  'qisas':     { english: ['retaliation','equal punishment','eye for eye'], roots: ['ق ص ص'] },
  'hudood':    { english: ['prescribed punishment','limits of allah','legal punishment'], roots: ['ح د د'] },
  'hudud':     { english: ['prescribed punishment','limits'], roots: ['ح د د'] },
  'diyah':     { english: ['blood money','compensation murder'], roots: ['د ي و'] },

  // ── Metaphysical / soul ───────────────────────────────────────────────────
  'ruh':       { english: ['spirit','soul','breath of life','life'], roots: ['ر و ح'] },
  'nafs':      { english: ['soul','self','ego','inner self','person'], roots: ['ن ف س'] },
  'qalb':      { english: ['heart','spiritual heart','mind'], roots: ['ق ل ب'] },
  'noor':      { english: ['light','divine light','guidance light'], roots: ['ن و ر'] },
  'nur':       { english: ['light','divine light'], roots: ['ن و ر'] },
  'huda':      { english: ['guidance','guide','right path'], roots: ['ه د ي'] },
  'hidayah':   { english: ['guidance','guide','right path'], roots: ['ه د ي'] },
  'ghayb':     { english: ['unseen','hidden','beyond perception','unknown'], roots: ['غ ي ب'] },
  'ghaib':     { english: ['unseen','hidden'], roots: ['غ ي ب'] },
  'barakah':   { english: ['blessing','bless','bounty','abundance'], roots: ['ب ر ك'] },
  'baraka':    { english: ['blessing','bless'], roots: ['ب ر ك'] },
  'rizq':      { english: ['provision','sustenance','livelihood','bounty'], roots: ['ر ز ق'] },
  'ajal':      { english: ['appointed time','death','term','fixed time'], roots: ['ا ج ل'] },
  'qadr':      { english: ['divine decree','predestination','measure','power'], roots: ['ق د ر'] },
  'qada':      { english: ['divine decree','judgment','decision'], roots: ['ق ض ي'] },
  'taqdeer':   { english: ['divine decree','destiny'], roots: ['ق د ر'] },

  // ── Cosmos / divine ───────────────────────────────────────────────────────
  'arsh':      { english: ['throne','throne of allah','highest throne'], roots: ['ع ر ش'] },
  'kursi':     { english: ['footstool','seat','chair','kursi verse'], roots: ['ك ر س'] },

  // ── Eschatology ───────────────────────────────────────────────────────────
  'qiyamah':   { english: ['resurrection','day of judgment','last day','judgment'], roots: ['ق و م'] },
  'akhirah':   { english: ['hereafter','afterlife','next life','eternal life'], roots: ['ا خ ر'] },
  'akhira':    { english: ['hereafter','afterlife'], roots: ['ا خ ر'] },
  'jannah':    { english: ['paradise','garden','heaven','bliss'], roots: ['ج ن ن'] },
  'jahannam':  { english: ['hell','hellfire','fire','punishment'], roots: ['ج ح م','ن ا ر'] },
  'naar':      { english: ['fire','hellfire'], roots: ['ن ا ر'] },
  'barzakh':   { english: ['barrier','intermediate state','between death resurrection'], roots: ['ب ر ز'] },
  'shafaa':    { english: ['intercession','intercede','pleading'], roots: ['ش ف ع'] },
  'shafaah':   { english: ['intercession','intercede'], roots: ['ش ف ع'] },
  'mizan':     { english: ['scales','balance','weigh deeds'], roots: ['و ز ن'] },
  'hashr':     { english: ['gathering','resurrection gathering','assembly'], roots: ['ح ش ر'] },
  'hisab':     { english: ['reckoning','account','judgment','record of deeds'], roots: ['ح س ب'] },

  // ── Beings ────────────────────────────────────────────────────────────────
  'malaika':   { english: ['angels','angel'], roots: ['م ل ك'] },
  'malaikah':  { english: ['angels','angel'], roots: ['م ل ك'] },
  'jibreel':   { english: ['gabriel','angel gabriel','holy spirit'], roots: ['ج ب ر'] },
  'jibril':    { english: ['gabriel','angel gabriel'], roots: ['ج ب ر'] },
  'iblis':     { english: ['satan','devil','enemy of allah','cursed'], roots: ['ب ل س','ش ي ط'] },
  'shaytan':   { english: ['satan','devil','evil','enemy'], roots: ['ش ي ط'] },
  'shaitan':   { english: ['satan','devil','evil'], roots: ['ش ي ط'] },
  'jinn':      { english: ['jinn','spirit beings','invisible beings'], roots: ['ج ن ن'] },

  // ── Scripture & revelation ────────────────────────────────────────────────
  'injeel':    { english: ['gospel','bible','new testament','jesus scripture'], roots: ['ن ج ل'] },
  'injil':     { english: ['gospel','bible'], roots: ['ن ج ل'] },
  'tawrat':    { english: ['torah','old testament','moses scripture','law'], roots: ['و ر ث'] },
  'taurat':    { english: ['torah','old testament'], roots: ['و ر ث'] },
  'zabur':     { english: ['psalms','psalms of david','dawud scripture'], roots: ['ز ب ر'] },
  'wahy':      { english: ['revelation','inspire','divine revelation'], roots: ['و ح ي'] },
  'tanzeel':   { english: ['revelation','sent down','revealed'], roots: ['ن ز ل'] },
  'kitab':     { english: ['book','scripture','written record'], roots: ['ك ت ب'] },

  // ── Prophet names ─────────────────────────────────────────────────────────
  'nuh':       { english: ['noah','prophet noah','ark','flood'], roots: ['ن و ح'] },
  'ibrahim':   { english: ['abraham','prophet abraham','father prophets'], roots: ['ب ر ه'] },
  'ismail':    { english: ['ishmael','prophet ishmael'], roots: ['س م ع'] },
  'ishaq':     { english: ['isaac','prophet isaac'], roots: ['س ح ق'] },
  'yaqub':     { english: ['jacob','prophet jacob','israel'], roots: ['ع ق ب'] },
  'yusuf':     { english: ['joseph','prophet joseph','egypt'], roots: ['ي س ف'] },
  'musa':      { english: ['moses','prophet moses','pharaoh','exodus','israel'], roots: ['م و س'] },
  'harun':     { english: ['aaron','prophet aaron'], roots: ['ه ر ن'] },
  'dawud':     { english: ['david','prophet david','psalms','king'], roots: ['د و د'] },
  'sulayman':  { english: ['solomon','prophet solomon','king','queen sheba'], roots: ['س ل م'] },
  'isa':       { english: ['jesus','prophet jesus','mary son','messiah','christ'], roots: ['ع ي س'] },
  'yahya':     { english: ['john','prophet john','john the baptist'], roots: ['ي ح ي'] },
  'zakariya':  { english: ['zechariah','prophet zechariah'], roots: ['ز ك ر'] },
  'ayyub':     { english: ['job','prophet job','affliction patience'], roots: ['ا ي ب'] },
  'yunus':     { english: ['jonah','prophet jonah','whale','fish'], roots: ['ي و ن'] },
  'lut':       { english: ['lot','prophet lot','sodom','destruction'], roots: ['ل و ط'] },
  'shuaib':    { english: ['jethro','prophet shuaib','midian'], roots: ['ش ع ب'] },
  'hud':       { english: ['prophet hud','aad','aad people'], roots: ['ه و د'] },
  'salih':     { english: ['prophet salih','thamud','camel'], roots: ['ص ل ح'] },
  'idris':     { english: ['enoch','prophet idris'], roots: ['د ر س'] },
  'dhulkifl':  { english: ['dhul kifl','ezekiel'], roots: ['ك ف ل'] },
  'ilyas':     { english: ['elijah','prophet elijah'], roots: ['ا ل ي'] },
  'alyasa':    { english: ['elisha','prophet elisha'], roots: ['ي س ع'] },

  // ── Names / attributes of Allah ───────────────────────────────────────────
  'rahman':    { english: ['most merciful','merciful','compassionate'], roots: ['ر ح م'] },
  'raheem':    { english: ['most merciful','merciful'], roots: ['ر ح م'] },
  'rahim':     { english: ['merciful','compassionate'], roots: ['ر ح م'] },
  'ghafur':    { english: ['forgiving','oft-forgiving','pardoning'], roots: ['غ ف ر'] },
  'ghaffar':   { english: ['most forgiving','pardoning'], roots: ['غ ف ر'] },
  'hakeem':    { english: ['wise','all-wise'], roots: ['ح ك م'] },
  'aleem':     { english: ['all-knowing','knowing','omniscient'], roots: ['ع ل م'] },
  'qadeer':    { english: ['powerful','all-powerful','capable'], roots: ['ق د ر'] },
  'aziz':      { english: ['mighty','honorable','exalted'], roots: ['ع ز ز'] },
  'karim':     { english: ['generous','noble','bountiful'], roots: ['ك ر م'] },
  'salam':     { english: ['peace','source of peace'], roots: ['س ل م'] },
  'tawwab':    { english: ['acceptor of repentance','forgiving','turns mercy'], roots: ['ت و ب'] },
  'wakeel':    { english: ['trustee','guardian','disposer affairs'], roots: ['و ك ل'] },
  'wahhab':    { english: ['bestower','giver','grantor'], roots: ['و ه ب'] },

  // ── Concepts / phrases ────────────────────────────────────────────────────
  'ummah':     { english: ['community','nation','muslim community','people'], roots: ['ا م م'] },
  'ahl':       { english: ['people','family','household','folk'], roots: ['ا ه ل'] },
  'sunnah':    { english: ['tradition','way','practice','custom'], roots: ['س ن ن'] },
  'sirat':     { english: ['path','way','road','straight path'], roots: ['س ر ط'] },
  'siratal mustaqeem': { english: ['straight path','right path','correct way'], roots: ['س ر ط','ق و م'] },
  'amanah':    { english: ['trust','trustworthiness','responsibility','duty'], roots: ['ا م ن'] },
  'adl':       { english: ['justice','fairness','equity','fair'], roots: ['ع د ل'] },
  'haq':       { english: ['truth','right','just','correct','true'], roots: ['ح ق ق'] },
  'hikmah':    { english: ['wisdom','knowledge','understanding'], roots: ['ح ك م'] },
  'ilm':       { english: ['knowledge','learn','scholar'], roots: ['ع ل م'] },
  'rahmah':    { english: ['mercy','compassion','blessing'], roots: ['ر ح م'] },
  'ni\'mah':   { english: ['blessing','bounty','favor','grace'], roots: ['ن ع م'] },
  'nimah':     { english: ['blessing','bounty','favor'], roots: ['ن ع م'] },
  'nimat':     { english: ['blessing','bounty'], roots: ['ن ع م'] },
  'azab':      { english: ['punishment','torment','suffering','pain'], roots: ['ع ذ ب'] },
  'adab':      { english: ['punishment','torment'], roots: ['ع ذ ب'] },
  'ghufraan':  { english: ['forgiveness','pardon','forgive'], roots: ['غ ف ر'] },
  'nafaq':     { english: ['spending','charity','provision'], roots: ['ن ف ق'] },
  'sadaqah':   { english: ['charity','alms','give','donation'], roots: ['ص د ق'] },
  'sadaqa':    { english: ['charity','donation'], roots: ['ص د ق'] },
  'khilafah':  { english: ['vicegerency','stewardship','successor','khalifah'], roots: ['خ ل ف'] },
  'khalifah':  { english: ['vicegerent','successor','caliph'], roots: ['خ ل ف'] },
  'akhlaaq':   { english: ['character','morality','ethics','conduct'], roots: ['خ ل ق'] },
};

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
  // ── Worship & Pillars ──────────────────────────────────────────────────────
  {
    id: 'prayer',
    label: 'Prayer (الصلاة)',
    keywords: [
      'prayer','pray','salah','salat','namaz','worship','prostrate','prostration',
      'bow','bowing','establish prayer','five prayers','friday prayer','jumuah',
    ],
    roots: ['ص ل و','ع ب د','س ج د','ر ك ع'],
  },
  {
    id: 'fasting',
    label: 'Fasting (الصيام)',
    keywords: ['fast','fasting','sawm','siyam','soom','roza','ramadan','abstain from food','iftar','suhoor'],
    roots: ['ص و م'],
  },
  {
    id: 'charity',
    label: 'Charity & Zakah (الزكاة والصدقة)',
    keywords: [
      'charity','zakat','zakah','alms','sadaqah','sadaqa','spend in the way of allah',
      'give to the poor','poor due','almsgiving','infaq','nafaq',
    ],
    roots: ['ز ك و','ص د ق','ن ف ق'],
  },
  {
    id: 'pilgrimage',
    label: 'Pilgrimage (الحج)',
    keywords: ['pilgrimage','hajj','umrah','kaaba','mecca','ihram','tawaf','arafat','sacrifice'],
    roots: ['ح ج ج','ط و ف'],
  },
  {
    id: 'purification',
    label: 'Purification (الطهارة)',
    keywords: [
      'purification','purity','pure','clean','ablution','wudu','ghusl','tayammum',
      'ritual bath','wash','unclean','impure','najis',
    ],
    roots: ['ط ه ر','غ س ل','و ض ا'],
  },
  {
    id: 'dua',
    label: 'Supplication (الدعاء)',
    keywords: [
      'supplication','dua','invoke','invocation','call upon','ask allah',
      'pray to allah','beg allah','implore','plead',
    ],
    roots: ['د ع و'],
  },
  {
    id: 'dhikr',
    label: 'Remembrance of Allah (الذكر)',
    keywords: [
      'remembrance','remember allah','dhikr','zikr','mention allah',
      'glorify','praise allah','glorification','tasbih',
    ],
    roots: ['ذ ك ر','س ب ح','ح م د'],
  },

  // ── Theology & Creed ──────────────────────────────────────────────────────
  {
    id: 'tawheed',
    label: 'Monotheism (التوحيد)',
    keywords: [
      'monotheism','oneness','one god','only god','tawheed','tauhid',
      'associating partners','no deity except','lailahaillallah','none worthy of worship',
    ],
    roots: ['و ح د','ش ر ك','ا ل ه'],
  },
  {
    id: 'taqwa',
    label: 'God-Consciousness (التقوى)',
    keywords: [
      'taqwa','piety','righteous','god-fearing','god-consciousness',
      'fear allah','fear of allah','devout','righteous deeds',
    ],
    roots: ['و ق ي','ص ل ح'],
  },
  {
    id: 'iman',
    label: 'Faith & Belief (الإيمان)',
    keywords: [
      'faith','belief','believe','iman','trust in allah','conviction',
      'certainty','yaqeen','steadfast belief',
    ],
    roots: ['ا م ن','ي ق ن'],
  },
  {
    id: 'angels',
    label: 'Angels (الملائكة)',
    keywords: [
      'angels','angel','malaika','jibreel','gabriel','mikail','michael',
      'israfil','izrail','angel of death','heavenly beings',
    ],
    roots: ['م ل ك','ج ب ر'],
  },
  {
    id: 'divine_books',
    label: 'Divine Books (الكتب السماوية)',
    keywords: [
      'divine books','quran','torah','tawrat','gospel','injeel','zabur','psalms',
      'scripture','revelation','holy book','sent down book',
    ],
    roots: ['ك ت ب','و ح ي','ن ز ل'],
  },
  {
    id: 'prophethood',
    label: 'Prophethood (النبوة)',
    keywords: [
      'prophet','messenger','apostle','revelation','message','sent','mission',
      'adam','ibrahim','abraham','noah','nuh','moses','musa','jesus','isa',
      'joseph','yusuf','david','dawud','solomon','sulayman','muhammad',
    ],
    roots: ['ن ب و','ر س ل','و ح ي'],
  },
  {
    id: 'divine_decree',
    label: 'Divine Decree (القدر)',
    keywords: [
      'divine decree','predestination','qadr','qadar','taqdeer','destiny',
      'fate','written','what allah wills','will of allah','appointed time','ajal',
    ],
    roots: ['ق د ر','ق ض ي','ا ج ل'],
  },

  // ── Eschatology ───────────────────────────────────────────────────────────
  {
    id: 'judgment_day',
    label: 'Day of Judgment (يوم القيامة)',
    keywords: [
      'judgment','day of judgment','resurrection','qiyamah','last day',
      'reckoning','account','deeds weighed','final hour','hour',
    ],
    roots: ['ق و م','ح س ب','ع ر ض','م ي ز'],
  },
  {
    id: 'paradise',
    label: 'Paradise (الجنة)',
    keywords: [
      'paradise','heaven','jannah','garden','gardens of eden','bliss',
      'hereafter reward','eternal life','everlasting life','rivers beneath',
    ],
    roots: ['ج ن ن','ف ر د س','خ ل د'],
  },
  {
    id: 'hellfire',
    label: 'Hellfire (النار / جهنم)',
    keywords: [
      'hell','hellfire','fire','jahannam','torment','punishment','blazing fire',
      'wrath','doom','eternal punishment','naar','burn','gehenna',
    ],
    roots: ['ن ا ر','ج ح م','س ع ر','ع ذ ب'],
  },
  {
    id: 'resurrection',
    label: 'Resurrection (البعث)',
    keywords: [
      'resurrection','raised','rise again','life after death','second life',
      'hereafter','akhirah','afterlife','barzakh','gathering','hashr',
    ],
    roots: ['ب ع ث','ن ش ر','ح ش ر'],
  },
  {
    id: 'intercession',
    label: 'Intercession (الشفاعة)',
    keywords: [
      'intercession','intercede','shafaa','intercession on day of judgment',
      'pleading','advocate','no intercession except',
    ],
    roots: ['ش ف ع'],
  },
  {
    id: 'scales',
    label: 'Scales of Deeds (الميزان)',
    keywords: [
      'scales','balance','weigh deeds','mizan','good deeds','bad deeds',
      'deeds recorded','book of deeds','record','righteous deeds rewarded',
    ],
    roots: ['و ز ن','ح س ب','ك ت ب'],
  },

  // ── Virtues ───────────────────────────────────────────────────────────────
  {
    id: 'mercy',
    label: 'Mercy & Forgiveness (الرحمة والمغفرة)',
    keywords: [
      'mercy','compassion','merciful','compassionate','rahman','raheem','rahim',
      'forgiveness','forgive','pardon','forgiven','gracious','kind','blessing','rahmah',
    ],
    roots: ['ر ح م','غ ف ر','ع ف و','ت و ب'],
  },
  {
    id: 'patience',
    label: 'Patience (الصبر)',
    keywords: [
      'patience','patient','perseverance','endure','sabr','steadfast',
      'forbearance','bear with patience','endurance',
    ],
    roots: ['ص ب ر'],
  },
  {
    id: 'gratitude',
    label: 'Gratitude (الشكر)',
    keywords: [
      'gratitude','grateful','thankful','thankfulness','shukr',
      'give thanks','be grateful','show gratitude',
    ],
    roots: ['ش ك ر'],
  },
  {
    id: 'justice',
    label: 'Justice & Equity (العدل)',
    keywords: [
      'justice','just','fairness','equity','adl','be fair','deal justly',
      'establish justice','witness justly','judge fairly',
    ],
    roots: ['ع د ل','ق س ط'],
  },
  {
    id: 'truth',
    label: 'Truth & Honesty (الحق)',
    keywords: [
      'truth','true','honest','honesty','truthful','haq','speak truth',
      'truthfulness','sincere','sincerity','ikhlas',
    ],
    roots: ['ح ق ق','ص د ق','خ ل ص'],
  },
  {
    id: 'trust',
    label: 'Trust in Allah (التوكل)',
    keywords: [
      'trust in allah','reliance on allah','tawakkul','put trust','rely on allah',
      'depend on allah','sufficient for us is allah',
    ],
    roots: ['و ك ل'],
  },
  {
    id: 'humility',
    label: 'Humility (التواضع)',
    keywords: [
      'humility','humble','modest','lowly','meek','not arrogant',
      'bow in humility','soften heart',
    ],
    roots: ['خ ض ع','و ض ع','ذ ل ل'],
  },

  // ── Vices ─────────────────────────────────────────────────────────────────
  {
    id: 'arrogance',
    label: 'Arrogance & Pride (الكبر)',
    keywords: [
      'arrogance','arrogant','pride','proud','haughty','kibr','kibr',
      'self-conceited','boastful','vain',
    ],
    roots: ['ك ب ر','ف خ ر','ع ج ب'],
  },
  {
    id: 'hypocrisy',
    label: 'Hypocrisy (النفاق)',
    keywords: [
      'hypocrisy','hypocrite','hypocrites','munafiq','munafiqoon','two-faced',
      'nifaq','showing off','riya','dissimulation',
    ],
    roots: ['ن ف ق','ر ا ي'],
  },
  {
    id: 'shirk',
    label: 'Polytheism & Shirk (الشرك)',
    keywords: [
      'shirk','polytheism','idolatry','associate partners','idol','idols',
      'partners with allah','mushrik','mushrikoon','worship others',
    ],
    roots: ['ش ر ك','و ث ن','ص ن م'],
  },
  {
    id: 'injustice',
    label: 'Injustice & Oppression (الظلم)',
    keywords: [
      'injustice','oppression','wrong','wrongdoer','zulm','transgress','transgressor',
      'oppress','oppressor','persecute','harm others',
    ],
    roots: ['ظ ل م','ب غ ي','ع د و'],
  },
  {
    id: 'corruption',
    label: 'Corruption & Mischief (الفساد)',
    keywords: [
      'corruption','mischief','corrupt','spread corruption','fasad','fasaad',
      'disorder','evil deeds','spread evil',
    ],
    roots: ['ف س د'],
  },
  {
    id: 'trials',
    label: 'Trials & Tribulations (الفتنة والابتلاء)',
    keywords: [
      'trial','tribulation','test','fitnah','fitna','tested','affliction',
      'hardship','difficulty','suffer','calamity','distress',
    ],
    roots: ['ف ت ن','ب ل و','م ح ن'],
  },

  // ── Family & Social ───────────────────────────────────────────────────────
  {
    id: 'family',
    label: 'Family & Marriage (الأسرة والزواج)',
    keywords: [
      'marriage','husband','wife','family','children','parents','mother','father',
      'divorce','nikah','spouse','offspring','talaq','mahr','dowry',
    ],
    roots: ['ن ك ح','ط ل ق','و ل د','ا م م','ا ب و'],
  },
  {
    id: 'inheritance',
    label: 'Inheritance (الميراث)',
    keywords: [
      'inheritance','inherit','estate','mirath','will','bequest','division of property',
      'share of inheritance','heirs',
    ],
    roots: ['و ر ث','ن ص ب'],
  },
  {
    id: 'orphans',
    label: 'Orphans (اليتامى)',
    keywords: [
      'orphan','orphans','fatherless','yateem','care for orphans',
      'guardianship','protect orphans','orphan property',
    ],
    roots: ['ي ت م'],
  },

  // ── Finance & Law ─────────────────────────────────────────────────────────
  {
    id: 'usury',
    label: 'Usury / Interest (الربا)',
    keywords: [
      'usury','interest','riba','sood','unlawful gain','charging interest',
      'prohibited interest','lend','borrow','debt',
    ],
    roots: ['ر ب و'],
  },
  {
    id: 'trade',
    label: 'Trade & Commerce (التجارة)',
    keywords: [
      'trade','commerce','business','merchant','buy','sell','market',
      'tijara','bay','contract','deal','transaction',
    ],
    roots: ['ت ج ر','ب ي ع','ع ق د'],
  },
  {
    id: 'halal_haram',
    label: 'Lawful & Unlawful (الحلال والحرام)',
    keywords: [
      'halal','haram','lawful','unlawful','permissible','forbidden',
      'allowed','prohibited','permitted','eat what is lawful',
    ],
    roots: ['ح ل ل','ح ر م'],
  },
  {
    id: 'hudood',
    label: 'Prescribed Punishments (الحدود)',
    keywords: [
      'hudood','hudud','punishment','prescribed punishment','cutting hand',
      'theft punishment','adultery','lash','hadd','qisas','retaliation',
    ],
    roots: ['ح د د','ق ص ص'],
  },

  // ── Knowledge & Guidance ──────────────────────────────────────────────────
  {
    id: 'knowledge',
    label: 'Knowledge & Wisdom (العلم والحكمة)',
    keywords: [
      'knowledge','knowing','wise','wisdom','aware','all knowing','omniscient',
      'learn','teach','inform','understand','ilm','hikmah','scholar',
    ],
    roots: ['ع ل م','ح ك م','خ ب ر','ف ق ه'],
  },
  {
    id: 'guidance',
    label: 'Guidance (الهداية)',
    keywords: [
      'guidance','guide','right path','straight path','huda','hidayah',
      'sirat al mustaqeem','lead astray','misguide','right direction',
    ],
    roots: ['ه د ي','ض ل ل'],
  },
  {
    id: 'light',
    label: 'Light (النور)',
    keywords: [
      'light','noor','nur','divine light','luminous','enlighten',
      'light of allah','bring from darkness to light',
    ],
    roots: ['ن و ر'],
  },

  // ── Creation & Nature ─────────────────────────────────────────────────────
  {
    id: 'creation',
    label: 'Creation (الخلق)',
    keywords: [
      'create','creation','creator','created','make','form','originate',
      'universe','heavens','earth','fashioned','brought into existence',
    ],
    roots: ['خ ل ق','ف ط ر','ب د ع','ص و ر'],
  },
  {
    id: 'nature_signs',
    label: 'Signs in Nature (آيات الكون)',
    keywords: [
      'signs','sign of allah','sun','moon','stars','rain','water','sky',
      'rivers','mountains','plants','animals','bees','honey','night','day',
    ],
    roots: ['ش م س','ق م ر','م ط ر','ج ب ل','ن ج م'],
  },
  {
    id: 'provision',
    label: 'Provision & Sustenance (الرزق)',
    keywords: [
      'provision','sustenance','livelihood','rizq','bounty','provide',
      'nourishment','food','bestow','grant provision',
    ],
    roots: ['ر ز ق'],
  },
  {
    id: 'death',
    label: 'Death & Soul (الموت والروح)',
    keywords: [
      'death','die','soul','ruh','spirit','take soul','moment of death',
      'appointed time','ajal','angel of death','life and death',
    ],
    roots: ['م و ت','ر و ح','ا ج ل'],
  },

  // ── Stories & History ─────────────────────────────────────────────────────
  {
    id: 'stories_prophets',
    label: 'Stories of Prophets (قصص الأنبياء)',
    keywords: [
      'story','stories','narrative','tale','history','what happened to',
      'incident','prophet story','event','nation','destroyed nation',
    ],
    roots: ['ق ص ص','ن ب و'],
  },
  {
    id: 'pharaoh',
    label: 'Pharaoh & Egypt (فرعون)',
    keywords: [
      'pharaoh','firaun','firawn','egypt','musa and pharaoh',
      'oppressor','tyrant','drowned','exodus',
    ],
    roots: ['ف ر ع','م ص ر'],
  },
  {
    id: 'destroyed_nations',
    label: "Destroyed Nations (الأمم الهالكة)",
    keywords: [
      'destroyed nation','aad','thamud','sodom','people of lut','ad',
      'punishment nations','previous nations','examples','lesson',
    ],
    roots: ['ع و د','ث م د','ه ل ك'],
  },

  // ── Inner Self ────────────────────────────────────────────────────────────
  {
    id: 'heart_soul',
    label: 'Heart & Soul (القلب والنفس)',
    keywords: [
      'heart','qalb','soul','nafs','inner self','spiritual heart','hard heart',
      'soft heart','disease in heart','purify soul','tranquility',
    ],
    roots: ['ق ل ب','ن ف س','ر و ح'],
  },
  {
    id: 'unseen',
    label: 'The Unseen (الغيب)',
    keywords: [
      'unseen','hidden','ghayb','ghaib','beyond perception','unknown','invisible',
      'knowledge of unseen','what is hidden',
    ],
    roots: ['غ ي ب'],
  },
  {
    id: 'satan',
    label: 'Satan & Evil (الشيطان)',
    keywords: [
      'satan','devil','iblis','shaytan','shaitan','enemy of adam','cursed',
      'evil whisper','waswas','footsteps of satan',
    ],
    roots: ['ش ي ط','ب ل س'],
  },
  {
    id: 'jinn',
    label: 'Jinn (الجن)',
    keywords: [
      'jinn','jinni','invisible beings','created from fire','spirit beings',
      'believing jinn','mankind and jinn',
    ],
    roots: ['ج ن ن'],
  },
  {
    id: 'names_of_allah',
    label: "Names & Attributes of Allah (أسماء الله)",
    keywords: [
      'names of allah','attributes of allah','asma ul husna','most beautiful names',
      'rahman','raheem','malik','quddus','salam','al aziz','al hakeem',
      'al aleem','al qadir','al karim','al ghafur','al tawwab',
    ],
    roots: ['ا س م','ر ح م','م ل ك','ع ل م','ق د ر'],
  },
  {
    id: 'throne',
    label: 'Throne of Allah (العرش والكرسي)',
    keywords: [
      'throne','arsh','kursi','footstool','seat of allah','throne verse',
      'ayat ul kursi','highest','dominant over creation',
    ],
    roots: ['ع ر ش','ك ر س'],
  },

  // ── Jihad & Defense ───────────────────────────────────────────────────────
  {
    id: 'jihad',
    label: 'Striving in the Way of Allah (الجهاد)',
    keywords: [
      'strive','striving','jihad','fight','battle','war','defend','path of allah',
      'in the way of allah','martyr','shaheed','fight oppression',
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
    .replace(/[ؐ-ًؚ-ٰٟ]/g, '')  // tashkeel + superscript alef
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

  // Step 1: Expand transliterated / Arabic terms into English keywords + roots
  for (const [term, expansion] of Object.entries(TRANSLITERATIONS)) {
    // Match whole word (handles multi-word keys like 'siratal mustaqeem' too)
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(?:^|\\s|[^a-z])' + escaped + '(?:$|\\s|[^a-z])', 'i');
    if (re.test(q)) {
      for (const eng of expansion.english) {
        if (!matched.keywords.includes(eng)) matched.keywords.push(eng);
      }
      for (const root of expansion.roots) {
        if (!matched.roots.includes(root)) matched.roots.push(root);
      }
    }
  }

  // Step 2: Detect intents
  for (const [intent, triggers] of Object.entries(INTENTS)) {
    if (triggers.some(t => q.includes(t))) {
      matched.intents.push(intent);
    }
  }

  // Step 3: Detect addressee concepts
  for (const addr of ADDRESSEES) {
    if (addr.keywords.some(kw => q.includes(kw))) {
      matched.addresseeIds.push(addr.id);
      matched.arabicPatterns.push(...addr.ar_patterns);
    }
  }

  // Step 4: Detect topic concepts
  for (const topic of TOPICS) {
    const hitKeywords = topic.keywords.filter(kw => q.includes(kw));
    if (hitKeywords.length > 0) {
      matched.topicIds.push(topic.id);
      matched.roots.push(...topic.roots);
      matched.keywords.push(...hitKeywords);
    }
  }

  // Step 5: Tokenize remaining meaningful words as generic keywords
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
