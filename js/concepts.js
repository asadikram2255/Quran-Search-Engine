/**
 * Quran Search Engine — Concept Ontology
 * Secondary/boost layer. Primary search now goes through the translation pipeline.
 * These maps add signal for well-known Islamic terms and addressee patterns.
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
  'mention','mentions','found','find','show','shows','list','give','provides',
  'describe','describes','talk','talks','speak','speaks','discuss','discusses',
]);

/**
 * Transliteration map — expands Islamic/Arabic/Urdu terms into English keywords + roots.
 * Used as a fast-path boost on top of the translation pipeline.
 */
const TRANSLITERATIONS = {
  // ── Invocation ────────────────────────────────────────────────────────────
  'bismillah':       { english: ['name','name of allah','in the name'], roots: ['س م و','ب س م'] },
  'basmalah':        { english: ['name of allah','in the name'], roots: ['س م و'] },
  'alhamdulillah':   { english: ['praise','all praise','thankful'], roots: ['ح م د'] },
  'subhanallah':     { english: ['glory','glorify','exalt'], roots: ['س ب ح'] },
  'astaghfirullah':  { english: ['forgiveness','forgive','seek pardon'], roots: ['غ ف ر'] },
  'mashallah':       { english: ['will of allah','what allah wills'], roots: ['ش ي ا','و ل ي'] },
  'inshallah':       { english: ['if allah wills','god willing'], roots: ['ش ي ا'] },
  'allahu akbar':    { english: ['greatest','great','magnify'], roots: ['ك ب ر'] },
  'la ilaha illallah': { english: ['no god but allah','monotheism','oneness'], roots: ['و ح د','ا ل ه'] },

  // ── Pillars of Islam ──────────────────────────────────────────────────────
  'salah':      { english: ['prayer','pray','worship'], roots: ['ص ل و','ع ب د'] },
  'salat':      { english: ['prayer','pray','worship'], roots: ['ص ل و'] },
  'namaz':      { english: ['prayer','pray'], roots: ['ص ل و'] },
  'sawm':       { english: ['fasting','fast','abstain'], roots: ['ص و م'] },
  'siyam':      { english: ['fasting','fast'], roots: ['ص و م'] },
  'roza':       { english: ['fasting','fast'], roots: ['ص و م'] },
  'zakat':      { english: ['charity','alms','poor due','purification'], roots: ['ز ك و','ن ف ق'] },
  'zakah':      { english: ['charity','alms','poor due'], roots: ['ز ك و'] },
  'hajj':       { english: ['pilgrimage','kaaba','mecca','sacred house'], roots: ['ح ج ج'] },
  'umrah':      { english: ['pilgrimage','lesser pilgrimage'], roots: ['ع م ر'] },
  'shahadah':   { english: ['testimony','testify','witness','declaration of faith'], roots: ['ش ه د'] },

  // ── Purification ──────────────────────────────────────────────────────────
  'wudu':       { english: ['ablution','purification','wash','cleanse'], roots: ['و ض ا','ط ه ر'] },
  'wudhu':      { english: ['ablution','purification','wash'], roots: ['و ض ا','ط ه ر'] },
  'ghusl':      { english: ['ritual bath','purification','wash'], roots: ['غ س ل','ط ه ر'] },
  'tayammum':   { english: ['dry ablution','purification with dust'], roots: ['ي م م','ط ه ر'] },
  'tahara':     { english: ['purification','purity','clean'], roots: ['ط ه ر'] },
  'taharah':    { english: ['purification','purity','clean'], roots: ['ط ه ر'] },
  'najis':      { english: ['impure','unclean','filth'], roots: ['ن ج س'] },

  // ── Prayer postures ────────────────────────────────────────────────────────
  'sujood':     { english: ['prostration','prostrate','bow down'], roots: ['س ج د'] },
  'sajdah':     { english: ['prostration','prostrate'], roots: ['س ج د'] },
  'ruku':       { english: ['bowing','bow','kneel'], roots: ['ر ك ع'] },
  'qiyam':      { english: ['standing','stand in prayer'], roots: ['ق و م'] },
  'tashahhud':  { english: ['testimony','testify','witness'], roots: ['ش ه د'] },
  'jumuah':     { english: ['friday','friday prayer','congregation'], roots: ['ج م ع'] },
  'jummah':     { english: ['friday','friday prayer'], roots: ['ج م ع'] },
  'azan':       { english: ['call to prayer','adhan'], roots: ['ا ذ ن'] },
  'adhan':      { english: ['call to prayer','announce prayer'], roots: ['ا ذ ن'] },
  'iqamah':     { english: ['prayer call','standing prayer'], roots: ['ق و م'] },

  // ── Spiritual qualities ───────────────────────────────────────────────────
  'taqwa':      { english: ['piety','righteousness','god-fearing','devout','god-consciousness'], roots: ['و ق ي'] },
  'iman':       { english: ['faith','belief','believe','trust'], roots: ['ا م ن'] },
  'ihsan':      { english: ['excellence','perfection','good deeds','righteous'], roots: ['ح س ن'] },
  'ikhlas':     { english: ['sincerity','sincere','purely for allah'], roots: ['خ ل ص'] },
  'tawakkul':   { english: ['trust in allah','reliance','put trust','depend on allah'], roots: ['و ك ل'] },
  'tawakkal':   { english: ['trust in allah','reliance'], roots: ['و ك ل'] },
  'sabr':       { english: ['patience','patient','perseverance','steadfast','endure'], roots: ['ص ب ر'] },
  'shukr':      { english: ['gratitude','grateful','thankful'], roots: ['ش ك ر'] },
  'tawbah':     { english: ['repentance','repent','turn back to allah'], roots: ['ت و ب'] },
  'tawba':      { english: ['repentance','repent'], roots: ['ت و ب'] },
  'istighfar':  { english: ['seek forgiveness','ask forgiveness','repent'], roots: ['غ ف ر'] },
  'dua':        { english: ['supplication','invoke','call upon','ask allah'], roots: ['د ع و'] },
  'dhikr':      { english: ['remembrance of allah','remember allah','mention allah'], roots: ['ذ ك ر'] },
  'zikr':       { english: ['remembrance of allah','remember allah'], roots: ['ذ ك ر'] },
  'tasbih':     { english: ['glorification','glorify','subhan'], roots: ['س ب ح'] },
  'istiqamah':  { english: ['steadfastness','stand firm','upright','straight path'], roots: ['ق و م'] },
  'zuhd':       { english: ['asceticism','detachment from world','simple living'], roots: ['ز ه د'] },
  'wara':       { english: ['caution','scrupulous','avoid doubtful'], roots: ['و ر ع'] },
  'tawadu':     { english: ['humility','humble','modest'], roots: ['و ض ع'] },

  // ── Faith pillars ────────────────────────────────────────────────────────
  'tawheed':    { english: ['monotheism','oneness of allah','one god'], roots: ['و ح د'] },
  'tauhid':     { english: ['monotheism','oneness of allah'], roots: ['و ح د'] },
  'yaqeen':     { english: ['certainty','conviction','sure'], roots: ['ي ق ن'] },
  'yaqin':      { english: ['certainty','certain'], roots: ['ي ق ن'] },
  'niyyah':     { english: ['intention','intend','purpose'], roots: ['ن و ي'] },
  'niyat':      { english: ['intention','intend'], roots: ['ن و ي'] },
  'aqeedah':    { english: ['creed','belief','doctrine','faith'], roots: ['ع ق د'] },
  'aqidah':     { english: ['creed','belief'], roots: ['ع ق د'] },

  // ── Negative traits ───────────────────────────────────────────────────────
  'kufr':       { english: ['disbelief','reject faith','deny','ingratitude'], roots: ['ك ف ر'] },
  'kafir':      { english: ['disbeliever','unbeliever','rejecter'], roots: ['ك ف ر'] },
  'nifaq':      { english: ['hypocrisy','hypocrite','two-faced'], roots: ['ن ف ق'] },
  'munafiq':    { english: ['hypocrite','two-faced','insincere'], roots: ['ن ف ق'] },
  'shirk':      { english: ['polytheism','associating partners','idolatry','idol'], roots: ['ش ر ك'] },
  'mushrik':    { english: ['polytheist','idolater','associating partners'], roots: ['ش ر ك'] },
  'kibr':       { english: ['arrogance','pride','haughty','proud'], roots: ['ك ب ر'] },
  'hasad':      { english: ['envy','jealousy','malice'], roots: ['ح س د'] },
  'zulm':       { english: ['injustice','oppression','wrong','transgress'], roots: ['ظ ل م'] },
  'zulum':      { english: ['injustice','oppression','wrong'], roots: ['ظ ل م'] },
  'fasad':      { english: ['corruption','mischief','spread corruption'], roots: ['ف س د'] },
  'fitnah':     { english: ['trial','tribulation','temptation','discord','strife'], roots: ['ف ت ن'] },
  'fitna':      { english: ['trial','tribulation','temptation'], roots: ['ف ت ن'] },
  'riya':       { english: ['showing off','ostentation','insincerity'], roots: ['ر ا ي'] },
  'ghibah':     { english: ['backbiting','slander','speak ill'], roots: ['غ ي ب'] },
  'nameemah':   { english: ['tale-carrying','gossip','slander'], roots: ['ن م م'] },
  'takabbur':   { english: ['arrogance','haughty','proud'], roots: ['ك ب ر'] },
  'ujub':       { english: ['conceit','self-admiration','vanity'], roots: ['ع ج ب'] },

  // ── Family & social ───────────────────────────────────────────────────────
  'nikah':      { english: ['marriage','marry','wed','spouse'], roots: ['ن ك ح'] },
  'talaq':      { english: ['divorce','separation','dissolve marriage'], roots: ['ط ل ق'] },
  'mahr':       { english: ['dowry','bridal gift','dower'], roots: ['م ه ر'] },
  'iddah':      { english: ['waiting period','divorce waiting'], roots: ['ع د د'] },
  'iddat':      { english: ['waiting period'], roots: ['ع د د'] },
  'mahram':     { english: ['prohibited kin','unmarriageable relatives'], roots: ['ح ر م'] },
  'walimah':    { english: ['wedding feast','marriage feast'], roots: ['و ل م'] },
  'nafaqah':    { english: ['maintenance','provision for family','financial support'], roots: ['ن ف ق'] },
  'yateem':     { english: ['orphan','fatherless child'], roots: ['ي ت م'] },
  'miskin':     { english: ['poor','destitute','needy'], roots: ['م س ك'] },
  'faqeer':     { english: ['poor','impoverished','needy'], roots: ['ف ق ر'] },
  'ibn':        { english: ['son','child'], roots: ['ب ن و'] },
  'umm':        { english: ['mother'], roots: ['ا م م'] },
  'ab':         { english: ['father'], roots: ['ا ب و'] },

  // ── Finance & trade ───────────────────────────────────────────────────────
  'riba':       { english: ['usury','interest','unlawful increase'], roots: ['ر ب و'] },
  'sood':       { english: ['usury','interest'], roots: ['ر ب و'] },
  'bay':        { english: ['trade','sale','sell','buy'], roots: ['ب ي ع'] },
  'tijara':     { english: ['trade','commerce','business'], roots: ['ت ج ر'] },
  'tijarah':    { english: ['trade','commerce','business'], roots: ['ت ج ر'] },
  'halal':      { english: ['permissible','lawful','allowed'], roots: ['ح ل ل'] },
  'haram':      { english: ['forbidden','prohibited','unlawful'], roots: ['ح ر م'] },
  'waqf':       { english: ['endowment','charitable donation'], roots: ['و ق ف'] },
  'mirath':     { english: ['inheritance','estate'], roots: ['و ر ث'] },
  'wirasah':    { english: ['inheritance'], roots: ['و ر ث'] },
  'wasiyyah':   { english: ['will','bequest','testament'], roots: ['و ص ي'] },
  'qard':       { english: ['loan','debt','lend','borrow'], roots: ['ق ر ض'] },

  // ── Legal ─────────────────────────────────────────────────────────────────
  'qisas':      { english: ['retaliation','equal punishment','eye for eye'], roots: ['ق ص ص'] },
  'hudood':     { english: ['prescribed punishment','limits of allah'], roots: ['ح د د'] },
  'hudud':      { english: ['prescribed punishment','limits'], roots: ['ح د د'] },
  'diyah':      { english: ['blood money','compensation'], roots: ['د ي و'] },
  'hadd':       { english: ['boundary','limit','punishment'], roots: ['ح د د'] },
  'zina':       { english: ['adultery','fornication','illegal intercourse'], roots: ['ز ن ي'] },
  'sariqa':     { english: ['theft','steal','stealing'], roots: ['س ر ق'] },

  // ── Soul / metaphysics ────────────────────────────────────────────────────
  'ruh':        { english: ['spirit','soul','breath of life'], roots: ['ر و ح'] },
  'nafs':       { english: ['soul','self','ego','inner self','person'], roots: ['ن ف س'] },
  'qalb':       { english: ['heart','spiritual heart','mind'], roots: ['ق ل ب'] },
  'noor':       { english: ['light','divine light','guidance'], roots: ['ن و ر'] },
  'nur':        { english: ['light','divine light'], roots: ['ن و ر'] },
  'huda':       { english: ['guidance','guide','right path'], roots: ['ه د ي'] },
  'hidayah':    { english: ['guidance','guide','right path'], roots: ['ه د ي'] },
  'ghayb':      { english: ['unseen','hidden','unknown'], roots: ['غ ي ب'] },
  'ghaib':      { english: ['unseen','hidden'], roots: ['غ ي ب'] },
  'barakah':    { english: ['blessing','bounty','abundance'], roots: ['ب ر ك'] },
  'baraka':     { english: ['blessing','bless'], roots: ['ب ر ك'] },
  'rizq':       { english: ['provision','sustenance','livelihood','bounty'], roots: ['ر ز ق'] },
  'ajal':       { english: ['appointed time','death','fixed time'], roots: ['ا ج ل'] },
  'qadr':       { english: ['divine decree','predestination','measure','power'], roots: ['ق د ر'] },
  'qada':       { english: ['divine decree','judgment','decision'], roots: ['ق ض ي'] },
  'taqdeer':    { english: ['divine decree','destiny'], roots: ['ق د ر'] },
  'aql':        { english: ['intellect','reason','mind'], roots: ['ع ق ل'] },
  'ilham':      { english: ['inspiration','inspired'], roots: ['ل ه م'] },

  // ── Cosmos / divine ───────────────────────────────────────────────────────
  'arsh':       { english: ['throne','throne of allah','highest throne'], roots: ['ع ر ش'] },
  'kursi':      { english: ['footstool','seat','chair'], roots: ['ك ر س'] },
  'loh':        { english: ['preserved tablet','written','record'], roots: ['ل و ح'] },
  'lauh':       { english: ['preserved tablet','written record'], roots: ['ل و ح'] },
  'qalam':      { english: ['pen','write','written'], roots: ['ق ل م'] },

  // ── Eschatology ───────────────────────────────────────────────────────────
  'qiyamah':    { english: ['resurrection','day of judgment','last day'], roots: ['ق و م'] },
  'akhirah':    { english: ['hereafter','afterlife','next life'], roots: ['ا خ ر'] },
  'akhira':     { english: ['hereafter','afterlife'], roots: ['ا خ ر'] },
  'jannah':     { english: ['paradise','garden','heaven','bliss'], roots: ['ج ن ن'] },
  'jahannam':   { english: ['hell','hellfire','fire','punishment'], roots: ['ج ح م','ن ا ر'] },
  'naar':       { english: ['fire','hellfire'], roots: ['ن ا ر'] },
  'barzakh':    { english: ['barrier','intermediate state'], roots: ['ب ر ز'] },
  'shafaa':     { english: ['intercession','intercede','pleading'], roots: ['ش ف ع'] },
  'shafaah':    { english: ['intercession','intercede'], roots: ['ش ف ع'] },
  'mizan':      { english: ['scales','balance','weigh deeds'], roots: ['و ز ن'] },
  'hashr':      { english: ['gathering','assembly'], roots: ['ح ش ر'] },
  'hisab':      { english: ['reckoning','account','judgment'], roots: ['ح س ب'] },
  'sirat':      { english: ['bridge','path','crossing'], roots: ['س ر ط'] },
  'mahshar':    { english: ['gathering place','day of assembly'], roots: ['ح ش ر'] },
  'shaheed':    { english: ['martyr','witness'], roots: ['ش ه د'] },
  'siddiq':     { english: ['truthful','sincere','righteous'], roots: ['ص د ق'] },
  'wali':       { english: ['friend of allah','guardian','protector'], roots: ['و ل ي'] },

  // ── Beings ────────────────────────────────────────────────────────────────
  'malaika':    { english: ['angels','angel'], roots: ['م ل ك'] },
  'malaikah':   { english: ['angels','angel'], roots: ['م ل ك'] },
  'jibreel':    { english: ['gabriel','angel gabriel'], roots: ['ج ب ر'] },
  'jibril':     { english: ['gabriel','angel gabriel'], roots: ['ج ب ر'] },
  'mikail':     { english: ['michael','angel michael'], roots: ['م ك ل'] },
  'israfel':    { english: ['israfil','angel of trumpet'], roots: ['ن ف خ'] },
  'izrail':     { english: ['angel of death','take soul'], roots: ['م و ت'] },
  'iblis':      { english: ['satan','devil','enemy','cursed'], roots: ['ب ل س','ش ي ط'] },
  'shaytan':    { english: ['satan','devil','evil','enemy'], roots: ['ش ي ط'] },
  'shaitan':    { english: ['satan','devil','evil'], roots: ['ش ي ط'] },
  'jinn':       { english: ['jinn','spirit beings','invisible beings'], roots: ['ج ن ن'] },
  'ins':        { english: ['mankind','humans','human beings'], roots: ['ا ن س'] },
  'insan':      { english: ['human being','mankind','person'], roots: ['ا ن س'] },
  'bashar':     { english: ['human','mortal','mankind'], roots: ['ب ش ر'] },

  // ── Scripture ────────────────────────────────────────────────────────────
  'injeel':     { english: ['gospel','bible','new testament'], roots: ['ن ج ل'] },
  'injil':      { english: ['gospel','bible'], roots: ['ن ج ل'] },
  'tawrat':     { english: ['torah','old testament','moses scripture'], roots: ['و ر ث'] },
  'taurat':     { english: ['torah','old testament'], roots: ['و ر ث'] },
  'zabur':      { english: ['psalms','psalms of david'], roots: ['ز ب ر'] },
  'wahy':       { english: ['revelation','inspire','divine revelation'], roots: ['و ح ي'] },
  'tanzeel':    { english: ['revelation','sent down','revealed'], roots: ['ن ز ل'] },
  'kitab':      { english: ['book','scripture','written record'], roots: ['ك ت ب'] },
  'furqan':     { english: ['criterion','distinguisher','quran'], roots: ['ف ر ق'] },
  'zikrullah':  { english: ['remembrance of allah','mention of allah'], roots: ['ذ ك ر'] },

  // ── Prophet names ─────────────────────────────────────────────────────────
  'nuh':        { english: ['noah','prophet noah','ark','flood'], roots: ['ن و ح'] },
  'ibrahim':    { english: ['abraham','prophet abraham','father of prophets'], roots: ['ب ر ه'] },
  'ismail':     { english: ['ishmael','prophet ishmael'], roots: ['س م ع'] },
  'ishaq':      { english: ['isaac','prophet isaac'], roots: ['س ح ق'] },
  'yaqub':      { english: ['jacob','prophet jacob','israel'], roots: ['ع ق ب'] },
  'yusuf':      { english: ['joseph','prophet joseph','egypt'], roots: ['ي س ف'] },
  'musa':       { english: ['moses','prophet moses','pharaoh','exodus'], roots: ['م و س'] },
  'harun':      { english: ['aaron','prophet aaron'], roots: ['ه ر ن'] },
  'dawud':      { english: ['david','prophet david','psalms','king'], roots: ['د و د'] },
  'sulayman':   { english: ['solomon','prophet solomon','king'], roots: ['س ل م'] },
  'isa':        { english: ['jesus','prophet jesus','mary son','messiah'], roots: ['ع ي س'] },
  'yahya':      { english: ['john the baptist','prophet john'], roots: ['ي ح ي'] },
  'zakariya':   { english: ['zechariah','prophet zechariah'], roots: ['ز ك ر'] },
  'ayyub':      { english: ['job','prophet job','affliction','patience'], roots: ['ا ي ب'] },
  'yunus':      { english: ['jonah','prophet jonah','whale','fish'], roots: ['ي و ن'] },
  'lut':        { english: ['lot','prophet lot','sodom'], roots: ['ل و ط'] },
  'shuaib':     { english: ['jethro','prophet shuaib','midian'], roots: ['ش ع ب'] },
  'hud':        { english: ['prophet hud','aad people'], roots: ['ه و د'] },
  'salih':      { english: ['prophet salih','thamud','camel'], roots: ['ص ل ح'] },
  'idris':      { english: ['enoch','prophet idris'], roots: ['د ر س'] },
  'dhulkifl':   { english: ['dhul kifl','ezekiel'], roots: ['ك ف ل'] },
  'ilyas':      { english: ['elijah','prophet elijah'], roots: ['ا ل ي'] },
  'alyasa':     { english: ['elisha','prophet elisha'], roots: ['ي س ع'] },
  'maryam':     { english: ['mary','virgin mary','mother of jesus'], roots: ['م ر ي'] },
  'adam':       { english: ['adam','first human','first man'], roots: ['ا د م'] },
  'hawwa':      { english: ['eve','adam wife'], roots: ['ح و ي'] },
  'luqman':     { english: ['luqman','wise man'], roots: ['ل ق م'] },
  'dhulqarnayn':{ english: ['dhul qarnayn','alexander','great king'], roots: ['ق ر ن'] },
  'asiya':      { english: ['asiya','wife of pharaoh'], roots: ['ا س ي'] },

  // ── Companions & figures ──────────────────────────────────────────────────
  'abu bakr':   { english: ['companion','truthful','caliph','siddiq'], roots: ['ص د ق'] },
  'umar':       { english: ['companion','second caliph','just'], roots: ['ع م ر'] },
  'uthman':     { english: ['companion','third caliph'], roots: ['ع ث م'] },
  'ali':        { english: ['companion','fourth caliph','cousin prophet'], roots: ['ع ل و'] },

  // ── Names of Allah ────────────────────────────────────────────────────────
  'rahman':     { english: ['most merciful','merciful','compassionate'], roots: ['ر ح م'] },
  'raheem':     { english: ['most merciful','merciful'], roots: ['ر ح م'] },
  'rahim':      { english: ['merciful','compassionate'], roots: ['ر ح م'] },
  'ghafur':     { english: ['forgiving','oft-forgiving'], roots: ['غ ف ر'] },
  'ghaffar':    { english: ['most forgiving','pardoning'], roots: ['غ ف ر'] },
  'hakeem':     { english: ['wise','all-wise'], roots: ['ح ك م'] },
  'aleem':      { english: ['all-knowing','knowing','omniscient'], roots: ['ع ل م'] },
  'qadeer':     { english: ['powerful','all-powerful'], roots: ['ق د ر'] },
  'aziz':       { english: ['mighty','honorable','exalted'], roots: ['ع ز ز'] },
  'karim':      { english: ['generous','noble','bountiful'], roots: ['ك ر م'] },
  'haleem':     { english: ['forbearing','clement'], roots: ['ح ل م'] },
  'tawwab':     { english: ['acceptor of repentance','forgiving'], roots: ['ت و ب'] },
  'wakeel':     { english: ['trustee','guardian','disposer'], roots: ['و ك ل'] },
  'wahhab':     { english: ['bestower','giver','grantor'], roots: ['و ه ب'] },
  'razzaq':     { english: ['provider','sustainer','bestower'], roots: ['ر ز ق'] },
  'fattah':     { english: ['opener','judge','victory'], roots: ['ف ت ح'] },
  'baseer':     { english: ['all-seeing','seeing'], roots: ['ب ص ر'] },
  'samee':      { english: ['all-hearing','hearing'], roots: ['س م ع'] },
  'malik':      { english: ['king','master','owner'], roots: ['م ل ك'] },
  'quddus':     { english: ['holy','pure','sanctified'], roots: ['ق د س'] },
  'mumin':      { english: ['granter of security','faithful'], roots: ['ا م ن'] },
  'jabbar':     { english: ['compeller','omnipotent'], roots: ['ج ب ر'] },
  'mutakabbir': { english: ['supreme','majestic'], roots: ['ك ب ر'] },
  'musawwir':   { english: ['fashioner','shaper of forms'], roots: ['ص و ر'] },

  // ── Social concepts ───────────────────────────────────────────────────────
  'ummah':      { english: ['community','nation','muslim community','people'], roots: ['ا م م'] },
  'ahl':        { english: ['people','family','household'], roots: ['ا ه ل'] },
  'sunnah':     { english: ['tradition','way','practice','custom'], roots: ['س ن ن'] },
  'sirat':      { english: ['path','way','road','straight path'], roots: ['س ر ط'] },
  'siratal mustaqeem': { english: ['straight path','right way'], roots: ['س ر ط','ق و م'] },
  'amanah':     { english: ['trust','trustworthiness','responsibility'], roots: ['ا م ن'] },
  'adl':        { english: ['justice','fairness','equity'], roots: ['ع د ل'] },
  'haq':        { english: ['truth','right','just','correct'], roots: ['ح ق ق'] },
  'hikmah':     { english: ['wisdom','knowledge','understanding'], roots: ['ح ك م'] },
  'ilm':        { english: ['knowledge','learn','scholar'], roots: ['ع ل م'] },
  'rahmah':     { english: ['mercy','compassion','blessing'], roots: ['ر ح م'] },
  'nimah':      { english: ['blessing','bounty','favor','grace'], roots: ['ن ع م'] },
  'nimat':      { english: ['blessing','bounty'], roots: ['ن ع م'] },
  'azab':       { english: ['punishment','torment','suffering'], roots: ['ع ذ ب'] },
  'ghufraan':   { english: ['forgiveness','pardon'], roots: ['غ ف ر'] },
  'sadaqah':    { english: ['charity','alms','donation'], roots: ['ص د ق'] },
  'sadaqa':     { english: ['charity','donation'], roots: ['ص د ق'] },
  'khilafah':   { english: ['vicegerency','stewardship','successor'], roots: ['خ ل ف'] },
  'khalifah':   { english: ['vicegerent','successor','caliph'], roots: ['خ ل ف'] },
  'akhlaaq':    { english: ['character','morality','ethics','conduct'], roots: ['خ ل ق'] },
  'amr':        { english: ['command','order','matter','affair'], roots: ['ا م ر'] },
  'nahy':       { english: ['prohibition','forbid','stop'], roots: ['ن ه ي'] },
  'shura':      { english: ['consultation','counsel','mutual advice'], roots: ['ش و ر'] },
  'dawah':      { english: ['call to islam','invitation','preaching'], roots: ['د ع و'] },
  'tabligh':    { english: ['convey','preach','deliver message'], roots: ['ب ل غ'] },
  'jihad':      { english: ['strive','striving','effort','struggle'], roots: ['ج ه د'] },
  'ghaneemah':  { english: ['war booty','spoils of war'], roots: ['غ ن م'] },
  'hijaab':     { english: ['veil','covering','screen','barrier'], roots: ['ح ج ب'] },
  'hijab':      { english: ['veil','covering','barrier'], roots: ['ح ج ب'] },
  'pardah':     { english: ['veil','covering','modesty'], roots: ['ح ج ب'] },
  'awrah':      { english: ['modesty','private parts','covering'], roots: ['ع و ر'] },
  'israf':      { english: ['extravagance','waste','excess'], roots: ['س ر ف'] },
  'qanaat':     { english: ['contentment','sufficiency'], roots: ['ق ن ع'] },
  'tawadu':     { english: ['humility','humble'], roots: ['و ض ع'] },
  'karamah':    { english: ['honor','dignity','nobility'], roots: ['ك ر م'] },
  'izzah':      { english: ['honor','dignity','power','might'], roots: ['ع ز ز'] },

  // ── Quranic places ────────────────────────────────────────────────────────
  'makkah':     { english: ['mecca','holy city','kaaba'], roots: ['م ك ك'] },
  'mecca':      { english: ['mecca','holy city'], roots: ['م ك ك'] },
  'madinah':    { english: ['medina','city of prophet'], roots: ['م د ن'] },
  'masjid':     { english: ['mosque','place of worship','prostration'], roots: ['س ج د'] },
  'kaaba':      { english: ['kaaba','sacred house','holy house'], roots: ['ك ع ب'] },
  'bayt':       { english: ['house','sacred house','home'], roots: ['ب ي ت'] },
  'baytullah':  { english: ['house of allah','sacred house'], roots: ['ب ي ت'] },
  'arafah':     { english: ['arafat','pilgrimage','standing'], roots: ['ع ر ف'] },
  'safa':       { english: ['safa','marwa','pilgrimage'], roots: ['ص ف و'] },
  'marwa':      { english: ['marwa','safa','pilgrimage'], roots: ['م ر و'] },
  'egypt':      { english: ['egypt','pharaoh','land of pharaoh'], roots: ['م ص ر'] },
  'misr':       { english: ['egypt','land'], roots: ['م ص ر'] },
  'sham':       { english: ['syria','levant','blessed land'], roots: ['ش ا م'] },
  'tur':        { english: ['mount sinai','mount tur','moses'], roots: ['ط و ر'] },
  'sinai':      { english: ['mount sinai','sinai','moses'], roots: ['ط و ر'] },
};

/**
 * Addressees — groups that Allah directly addresses with a vocative.
 */
const ADDRESSEES = [
  {
    id: 'believers',
    label: 'Believers (يَا أَيُّهَا الَّذِينَ آمَنُوا)',
    keywords: [
      'believer','believers','believe','faithful','muslims','who have believed',
      'those who believe','those who believed','o you who believe','o believers',
    ],
    ar_patterns: ['يايها الذين امنوا'],
    description: 'Ayaat where Allah addresses the believers with يَا أَيُّهَا الَّذِينَ آمَنُوا',
  },
  {
    id: 'mankind',
    label: 'Mankind (يَا أَيُّهَا النَّاسُ)',
    keywords: [
      'mankind','humans','humanity','people','human beings','o people',
      'o mankind','o humanity','all people','all humans',
    ],
    ar_patterns: ['يايها الناس'],
    description: 'Ayaat where Allah addresses all of humanity with يَا أَيُّهَا النَّاسُ',
  },
  {
    id: 'disbelievers',
    label: 'Disbelievers (يَا أَيُّهَا الْكَافِرُونَ)',
    keywords: [
      'disbeliever','disbelievers','unbeliever','unbelievers','kafir','kuffar',
      'non believer','non-believer','non believers','non-believers','infidel',
    ],
    ar_patterns: ['يايها الكفرون','الذين كفروا'],
    description: 'Ayaat where Allah addresses disbelievers',
  },
  {
    id: 'prophet',
    label: 'The Prophet (يَا أَيُّهَا النَّبِيُّ)',
    keywords: [
      'prophet','messenger','muhammad','o prophet','o messenger','address prophet',
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
    description: 'Ayaat addressing Jews and Christians (People of Scripture)',
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
  {
    id: 'hypocrites',
    label: 'Hypocrites (الْمُنَافِقُونَ)',
    keywords: [
      'hypocrite','hypocrites','munafiqoon','munafiqin','munafiq',
      'two-faced','nifaq','insincere',
    ],
    ar_patterns: ['المنفقون','المنفقين'],
    description: 'Ayaat about or addressing hypocrites',
  },
];

/**
 * Topic concepts — thematic search domains with English keywords and Arabic roots.
 */
const TOPICS = [
  // ── Worship & Pillars ─────────────────────────────────────────────────────
  {
    id: 'prayer',
    label: 'Prayer (الصلاة)',
    keywords: [
      'prayer','pray','salah','salat','namaz','worship','prostrate','prostration',
      'bow','bowing','establish prayer','five prayers','friday prayer','jumuah',
      'call to prayer','adhan','iqamah','congregation',
    ],
    roots: ['ص ل و','ع ب د','س ج د','ر ك ع','ق و م'],
  },
  {
    id: 'fasting',
    label: 'Fasting (الصيام)',
    keywords: [
      'fast','fasting','sawm','siyam','soom','roza','ramadan',
      'abstain','iftar','suhoor','month of ramadan',
    ],
    roots: ['ص و م'],
  },
  {
    id: 'charity',
    label: 'Charity & Zakah (الزكاة والصدقة)',
    keywords: [
      'charity','zakat','zakah','alms','sadaqah','spend in the way of allah',
      'give to the poor','poor due','almsgiving','infaq','nafaq','donation',
    ],
    roots: ['ز ك و','ص د ق','ن ف ق'],
  },
  {
    id: 'pilgrimage',
    label: 'Pilgrimage (الحج)',
    keywords: [
      'pilgrimage','hajj','umrah','kaaba','mecca','ihram','tawaf',
      'arafat','sacrifice','sacred mosque',
    ],
    roots: ['ح ج ج','ط و ف'],
  },
  {
    id: 'purification',
    label: 'Purification (الطهارة)',
    keywords: [
      'purification','purity','pure','clean','ablution','wudu','ghusl',
      'tayammum','ritual bath','wash','unclean','impure',
    ],
    roots: ['ط ه ر','غ س ل','و ض ا'],
  },
  {
    id: 'dua',
    label: 'Supplication (الدعاء)',
    keywords: [
      'supplication','dua','invoke','invocation','call upon','ask allah',
      'pray to allah','beg allah','implore','plead','request from allah',
    ],
    roots: ['د ع و'],
  },
  {
    id: 'dhikr',
    label: 'Remembrance of Allah (الذكر)',
    keywords: [
      'remembrance','remember allah','dhikr','zikr','mention allah',
      'glorify','praise allah','tasbih','glorification',
    ],
    roots: ['ذ ك ر','س ب ح','ح م د'],
  },

  // ── Theology & Creed ──────────────────────────────────────────────────────
  {
    id: 'tawheed',
    label: 'Monotheism (التوحيد)',
    keywords: [
      'monotheism','oneness','one god','only god','tawheed','tauhid',
      'no deity except','lailahaillallah','none worthy of worship',
    ],
    roots: ['و ح د','ش ر ك','ا ل ه'],
  },
  {
    id: 'taqwa',
    label: 'God-Consciousness (التقوى)',
    keywords: [
      'taqwa','piety','righteous','god-fearing','god-consciousness',
      'fear allah','fear of allah','devout','righteousness',
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
      'angel of death','heavenly beings','messenger angel',
    ],
    roots: ['م ل ك','ج ب ر'],
  },
  {
    id: 'divine_books',
    label: 'Divine Books (الكتب السماوية)',
    keywords: [
      'divine books','torah','tawrat','gospel','injeel','zabur','psalms',
      'scripture','revelation','holy book','sent down book','furqan',
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
      'fate','written','what allah wills','will of allah','appointed time',
    ],
    roots: ['ق د ر','ق ض ي','ا ج ل'],
  },

  // ── Eschatology ───────────────────────────────────────────────────────────
  {
    id: 'judgment_day',
    label: 'Day of Judgment (يوم القيامة)',
    keywords: [
      'judgment','day of judgment','resurrection','qiyamah','last day',
      'reckoning','account','deeds weighed','final hour','hour','day of recompense',
    ],
    roots: ['ق و م','ح س ب','ع ر ض','م ي ز'],
  },
  {
    id: 'paradise',
    label: 'Paradise (الجنة)',
    keywords: [
      'paradise','heaven','jannah','garden','bliss','hereafter reward',
      'eternal life','everlasting life','rivers beneath','gardens of eden',
    ],
    roots: ['ج ن ن','ف ر د س','خ ل د'],
  },
  {
    id: 'hellfire',
    label: 'Hellfire (النار / جهنم)',
    keywords: [
      'hell','hellfire','fire','jahannam','torment','punishment','blazing fire',
      'wrath','doom','eternal punishment','naar','burn','hellfire punishment',
    ],
    roots: ['ن ا ر','ج ح م','س ع ر','ع ذ ب'],
  },
  {
    id: 'resurrection',
    label: 'Resurrection (البعث)',
    keywords: [
      'resurrection','raised','rise again','life after death',
      'hereafter','akhirah','afterlife','barzakh','gathering','hashr',
    ],
    roots: ['ب ع ث','ن ش ر','ح ش ر'],
  },
  {
    id: 'intercession',
    label: 'Intercession (الشفاعة)',
    keywords: [
      'intercession','intercede','shafaa','pleading','advocate','no intercession',
    ],
    roots: ['ش ف ع'],
  },
  {
    id: 'scales',
    label: 'Scales of Deeds (الميزان)',
    keywords: [
      'scales','balance','weigh deeds','mizan','good deeds','bad deeds',
      'deeds recorded','book of deeds','record of deeds',
    ],
    roots: ['و ز ن','ح س ب','ك ت ب'],
  },

  // ── Virtues ───────────────────────────────────────────────────────────────
  {
    id: 'mercy',
    label: 'Mercy & Forgiveness (الرحمة والمغفرة)',
    keywords: [
      'mercy','compassion','merciful','compassionate','rahman','raheem','rahim',
      'forgiveness','forgive','pardon','forgiven','gracious','kind','rahmah',
    ],
    roots: ['ر ح م','غ ف ر','ع ف و','ت و ب'],
  },
  {
    id: 'patience',
    label: 'Patience (الصبر)',
    keywords: [
      'patience','patient','perseverance','endure','sabr','steadfast',
      'forbearance','bear with patience','endurance','withstand',
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
      'establish justice','witness justly','judge fairly','equal','balance',
    ],
    roots: ['ع د ل','ق س ط'],
  },
  {
    id: 'truth',
    label: 'Truth & Honesty (الحق)',
    keywords: [
      'truth','true','honest','honesty','truthful','haq','speak truth',
      'truthfulness','sincere','sincerity',
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
      'bow in humility','soften heart','submissive',
    ],
    roots: ['خ ض ع','و ض ع','ذ ل ل'],
  },
  {
    id: 'love',
    label: 'Love (المحبة)',
    keywords: [
      'love','loves','beloved','affection','love of allah','love for allah',
      'loving','dear to allah','allah loves',
    ],
    roots: ['ح ب ب','و د د'],
  },
  {
    id: 'hope',
    label: 'Hope & Fear (الرجاء والخوف)',
    keywords: [
      'hope','hope in allah','fear allah','hope and fear',
      'aspire','long for','yearn','desire mercy',
    ],
    roots: ['ر ج و','خ و ف','ا م ل'],
  },

  // ── Vices ─────────────────────────────────────────────────────────────────
  {
    id: 'arrogance',
    label: 'Arrogance & Pride (الكبر)',
    keywords: [
      'arrogance','arrogant','pride','proud','haughty','kibr',
      'self-conceited','boastful','vain','contemptuous',
    ],
    roots: ['ك ب ر','ف خ ر','ع ج ب'],
  },
  {
    id: 'hypocrisy',
    label: 'Hypocrisy (النفاق)',
    keywords: [
      'hypocrisy','hypocrite','hypocrites','munafiq','munafiqoon',
      'nifaq','showing off','riya','dissimulation','two-faced',
    ],
    roots: ['ن ف ق','ر ا ي'],
  },
  {
    id: 'shirk',
    label: 'Polytheism & Shirk (الشرك)',
    keywords: [
      'shirk','polytheism','idolatry','associate partners','idol','idols',
      'partners with allah','mushrik','mushrikoon','worship others beside allah',
    ],
    roots: ['ش ر ك','و ث ن','ص ن م'],
  },
  {
    id: 'injustice',
    label: 'Injustice & Oppression (الظلم)',
    keywords: [
      'injustice','oppression','wrong','wrongdoer','zulm','transgress','transgressor',
      'oppress','oppressor','persecute','harm others','tyrant',
    ],
    roots: ['ظ ل م','ب غ ي','ع د و'],
  },
  {
    id: 'corruption',
    label: 'Corruption & Mischief (الفساد)',
    keywords: [
      'corruption','mischief','corrupt','spread corruption','fasad',
      'disorder','evil deeds','spread evil','mischief in land',
    ],
    roots: ['ف س د'],
  },
  {
    id: 'trials',
    label: 'Trials & Tribulations (الفتنة والابتلاء)',
    keywords: [
      'trial','tribulation','test','fitnah','fitna','tested','affliction',
      'hardship','difficulty','suffer','calamity','distress','test of faith',
    ],
    roots: ['ف ت ن','ب ل و','م ح ن'],
  },
  {
    id: 'sin',
    label: 'Sin & Wrongdoing (الذنب والخطأ)',
    keywords: [
      'sin','sins','sinful','wrongdoing','transgression','guilt','evil deed',
      'bad deeds','error','mistake','immoral','wicked','iniquity',
    ],
    roots: ['ذ ن ب','خ ط ا','ا ث م','ف ح ش'],
  },
  {
    id: 'backbiting',
    label: 'Backbiting & Slander (الغيبة والبهتان)',
    keywords: [
      'backbiting','slander','speak ill','gossip','defame','mock',
      'ridicule','insult','nickname','spy','suspicion',
    ],
    roots: ['غ ي ب','ن م م','ب ه ت','س خ ر'],
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
    id: 'women',
    label: 'Women (المرأة)',
    keywords: [
      'women','woman','female','wife','wives','mother','daughters','sisters',
      'modesty','veil','hijab','rights of women','believing women',
    ],
    roots: ['ن س و','ا م ر','ح ج ب','م ر ا'],
  },
  {
    id: 'children',
    label: 'Children & Upbringing (الأطفال والتربية)',
    keywords: [
      'children','child','son','daughter','offspring','infant',
      'upbringing','education of children','rights of children',
    ],
    roots: ['و ل د','ب ن و','ر ب ب'],
  },
  {
    id: 'parents',
    label: 'Parents & Respect (الوالدان)',
    keywords: [
      'parents','mother','father','respect parents','honor parents',
      'obey parents','kindness to parents','good to parents',
    ],
    roots: ['و ل د','ا م م','ا ب و','ب ر ر'],
  },
  {
    id: 'inheritance',
    label: 'Inheritance (الميراث)',
    keywords: [
      'inheritance','inherit','estate','mirath','will','bequest',
      'division of property','share of inheritance','heirs',
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
  {
    id: 'neighbors',
    label: 'Neighbors & Community (الجيران)',
    keywords: [
      'neighbor','neighbors','community','near kin','treat kindly',
      'good relations','brotherhood','sisterhood','unity',
    ],
    roots: ['ج و ر','ا خ و','ق ر ب'],
  },

  // ── Finance & Law ─────────────────────────────────────────────────────────
  {
    id: 'usury',
    label: 'Usury / Interest (الربا)',
    keywords: [
      'usury','interest','riba','sood','unlawful gain','charging interest',
      'prohibited interest','lend','borrow','debt','loan',
    ],
    roots: ['ر ب و'],
  },
  {
    id: 'trade',
    label: 'Trade & Commerce (التجارة)',
    keywords: [
      'trade','commerce','business','merchant','buy','sell','market',
      'tijara','bay','contract','deal','transaction','price',
    ],
    roots: ['ت ج ر','ب ي ع','ع ق د'],
  },
  {
    id: 'halal_haram',
    label: 'Lawful & Unlawful (الحلال والحرام)',
    keywords: [
      'halal','haram','lawful','unlawful','permissible','forbidden',
      'allowed','prohibited','permitted','eat what is lawful','forbidden food',
    ],
    roots: ['ح ل ل','ح ر م'],
  },
  {
    id: 'food',
    label: 'Food & Drink (الطعام والشراب)',
    keywords: [
      'food','eat','drink','lawful food','forbidden food','alcohol',
      'wine','pork','slaughter','bismillah before eating',
    ],
    roots: ['ا ك ل','ش ر ب','ط ع م','ذ ب ح'],
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
  {
    id: 'contract',
    label: 'Contracts & Agreements (العقود)',
    keywords: [
      'contract','agreement','covenant','promise','oath','fulfill promise',
      'keep covenant','witnesses','documentation','write down',
    ],
    roots: ['ع ق د','ع ه د','و ع د','ك ت ب'],
  },

  // ── Knowledge & Guidance ──────────────────────────────────────────────────
  {
    id: 'knowledge',
    label: 'Knowledge & Wisdom (العلم والحكمة)',
    keywords: [
      'knowledge','knowing','wise','wisdom','aware','all knowing','omniscient',
      'learn','teach','inform','understand','ilm','hikmah','scholar','intellect',
    ],
    roots: ['ع ل م','ح ك م','خ ب ر','ف ق ه','ع ق ل'],
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
      'light of allah','bring from darkness to light','illuminate',
    ],
    roots: ['ن و ر'],
  },
  {
    id: 'reading',
    label: 'Reading & Learning (القراءة والتعلم)',
    keywords: [
      'read','recite','quran recitation','reading','learn','study',
      'teach','pen','write','knowledge seeking',
    ],
    roots: ['ق ر ا','ع ل م','ق ل م','ك ت ب'],
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
      'seasons','wind','clouds','thunderbolt','lightning',
    ],
    roots: ['ش م س','ق م ر','م ط ر','ج ب ل','ن ج م','ب ح ر'],
  },
  {
    id: 'provision',
    label: 'Provision & Sustenance (الرزق)',
    keywords: [
      'provision','sustenance','livelihood','rizq','bounty','provide',
      'nourishment','food','bestow','grant provision','sustainer',
    ],
    roots: ['ر ز ق'],
  },
  {
    id: 'death',
    label: 'Death & Soul (الموت والروح)',
    keywords: [
      'death','die','soul','ruh','spirit','take soul','moment of death',
      'appointed time','ajal','angel of death','life and death','dying',
    ],
    roots: ['م و ت','ر و ح','ا ج ل'],
  },
  {
    id: 'time',
    label: 'Time (الزمان)',
    keywords: [
      'time','age','era','epoch','eon','century','era','asr','time by',
    ],
    roots: ['ع ص ر','ز م ن','د ه ر','و ق ت'],
  },

  // ── Stories & History ─────────────────────────────────────────────────────
  {
    id: 'stories_prophets',
    label: 'Stories of Prophets (قصص الأنبياء)',
    keywords: [
      'story','stories','narrative','tale','history','what happened to',
      'incident','prophet story','event','nation','destroyed nation','account',
    ],
    roots: ['ق ص ص','ن ب و'],
  },
  {
    id: 'pharaoh',
    label: 'Pharaoh & Egypt (فرعون)',
    keywords: [
      'pharaoh','firaun','firawn','egypt','musa and pharaoh',
      'oppressor','tyrant','drowned','exodus','plagues',
    ],
    roots: ['ف ر ع','م ص ر'],
  },
  {
    id: 'destroyed_nations',
    label: 'Destroyed Nations (الأمم الهالكة)',
    keywords: [
      'destroyed nation','aad','thamud','sodom','people of lut','ad',
      'punishment nations','previous nations','examples','lesson from history',
    ],
    roots: ['ع و د','ث م د','ه ل ك'],
  },

  // ── Inner Self ────────────────────────────────────────────────────────────
  {
    id: 'heart_soul',
    label: 'Heart & Soul (القلب والنفس)',
    keywords: [
      'heart','qalb','soul','nafs','inner self','spiritual heart','hard heart',
      'soft heart','disease in heart','purify soul','tranquility','peace of heart',
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
      'evil whisper','waswas','footsteps of satan','tricks of satan',
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
    label: "Names & Attributes of Allah (أسماء الله الحسنى)",
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
  {
    id: 'peace',
    label: 'Peace & Security (السلام والأمان)',
    keywords: [
      'peace','peaceful','salam','security','safety','tranquility',
      'reconcile','truce','cease conflict','harmony',
    ],
    roots: ['س ل م','ا م ن'],
  },

  // ── Ethics & Character ────────────────────────────────────────────────────
  {
    id: 'good_character',
    label: 'Good Character (حسن الخلق)',
    keywords: [
      'good character','morality','ethics','conduct','good manners',
      'kind','gentle','generous','courteous','noble character',
    ],
    roots: ['خ ل ق','ح س ن','ك ر م'],
  },
  {
    id: 'brotherhood',
    label: 'Brotherhood & Unity (الأخوة والوحدة)',
    keywords: [
      'brotherhood','sisterhood','unity','brothers in faith','reconcile','bond',
      'ummah unity','hold fast to rope of allah','together','community',
    ],
    roots: ['ا خ و','ج م ع','و ح د'],
  },
  {
    id: 'environment',
    label: 'Environment & Earth (البيئة والأرض)',
    keywords: [
      'earth','land','environment','do not corrupt','preserve','stewardship',
      'spread mischief on earth','caretaker','nature','ecosystem',
    ],
    roots: ['ا ر ض','ف س د','خ ل ف'],
  },
];

/**
 * Intent detection — what the user wants to do with the results.
 */
const INTENTS = {
  address:  ['address','addressed','addresses','call','called','say to','speak to',
              'term','terms','phrase','phrases','expression','expressions','vocative',
              'how does allah address','how does god address','what term','what terms',
              'what word','what phrase','what phrases','how addressed','ways to address',
              'ways allah','ways god','referred to as','known as','called by','uses to address',
              'used by quran','used to address','used for addressing'],
  command:  ['command','commanded','order','instruction','obligatory','must','prescribed',
              'duty','what are we ordered','told to','required to','mandatory'],
  forbid:   ['forbid','forbidden','prohibited','haram','not allowed','must not',
              'avoid','what is prohibited','what is not allowed'],
  reward:   ['reward','promise','good news','promised','paradise for','heaven for',
              'what reward','what is promised','what is the reward'],
  warn:     ['warn','warning','threat','consequence','punishment for','result of',
              'what happens if','what is the punishment','what does allah warn'],
  count:    ['how many','how many times','how often','count','frequency','number of times',
              'occurs','appear','appears','mentioned how many'],
  story:    ['story','stories','narrative','tale','history','what happened to',
              'incident','event','account of'],
  list:     ['list','enumerate','name all','what are the','give all','show all',
              'all the','all types','all ways','all terms','all groups'],
};

/**
 * Normalize Arabic text — mirrors the Python normalize_arabic() for consistent matching.
 */
function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[ؐ-ًؚ-ٰۖ-ۜ۟-۪ۤۧۨ-ۭݿ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ء/g, '')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a natural-language query into a structured search request.
 */
function parseQuery(rawQuery) {
  const q = rawQuery.toLowerCase();

  const matched = {
    keywords:       [],
    arabicPatterns: [],
    roots:          [],
    intents:        [],
    addresseeIds:   [],
    topicIds:       [],
  };

  // 1. Expand transliterations → English keywords + roots
  for (const [term, expansion] of Object.entries(TRANSLITERATIONS)) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('(?:^|\\s|[^a-z])' + esc + '(?:$|\\s|[^a-z])', 'i').test(q)) {
      for (const eng of expansion.english) {
        if (!matched.keywords.includes(eng)) matched.keywords.push(eng);
      }
      for (const root of expansion.roots) {
        if (!matched.roots.includes(root)) matched.roots.push(root);
      }
    }
  }

  // 2. Detect intents
  for (const [intent, triggers] of Object.entries(INTENTS)) {
    if (triggers.some(t => q.includes(t))) matched.intents.push(intent);
  }

  // 3. Detect addressees
  for (const addr of ADDRESSEES) {
    if (addr.keywords.some(kw => q.includes(kw))) {
      matched.addresseeIds.push(addr.id);
      matched.arabicPatterns.push(...addr.ar_patterns);
    }
  }

  // 4. Detect topics
  for (const topic of TOPICS) {
    const hits = topic.keywords.filter(kw => q.includes(kw));
    if (hits.length > 0) {
      matched.topicIds.push(topic.id);
      matched.roots.push(...topic.roots);
      matched.keywords.push(...hits);
    }
  }

  // 5. Generic tokenization of remaining meaningful words
  const tokens = rawQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));

  for (const t of tokens) {
    if (!matched.keywords.includes(t)) matched.keywords.push(t);
  }

  matched.keywords       = [...new Set(matched.keywords)];
  matched.arabicPatterns = [...new Set(matched.arabicPatterns)];
  matched.roots          = [...new Set(matched.roots)];

  return matched;
}
