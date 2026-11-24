/**
 * 御猫灵局 · 离线英文字典 · extra（补缺 + 拼接规则）
 *
 * 为什么有这个文件：
 *   其它 dict-*.js 是「源码里写死的句子 → 英文」。但页面上很多句子是程序拼出来的
 *   （带年月日、干支、星座名、百分比等变量），整句查不到。这里补三样东西：
 *   1. extra 词条：缺的整句 / 碎片 / 小词（干支、五行、行星、相位、十神……）
 *   2. YUMIAO_RULES：带数字的模板（日期、「已完成 n/48」、「3岁0个月18天」……），用正则
 *   3. strip 规则：程序在句中塞了变量（「日主」→「日主辛(金)」），摘掉再译、译完补回
 *
 * 写法约定：标准加拿大英语；英文片段首尾的空格有意义（拼接时靠它隔开），不要随手删。
 */
(function () {
  'use strict';

  /* ================= 规则 ================= */
  var STEM = { '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu', '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui' };
  var BRANCH = { '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si', '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai' };
  var ELEM = { '金': 'Metal', '木': 'Wood', '水': 'Water', '火': 'Fire', '土': 'Earth' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var POS = { '年': 'Year', '月': 'Month', '日': 'Day', '时': 'Hour' };
  var PLANET = { '太阳': 'Sun', '月亮': 'Moon', '水星': 'Mercury', '金星': 'Venus', '火星': 'Mars', '木星': 'Jupiter', '土星': 'Saturn', '天王星': 'Uranus', '海王星': 'Neptune', '冥王星': 'Pluto' };
  function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  function mon(n) { return MONTHS[(+n - 1) % 12] || String(n); }

  var R = window.YUMIAO_RULES = window.YUMIAO_RULES || [];
  function rule(re, fn) { R.push({ re: re, fn: fn }); }


  /* ---- 农历 / 节气 / 时辰（须排在通用日期规则之前）---- */
  var LMON = { '正': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '冬': 11, '腊': 12 };
  var LDAY1 = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  function lunarMonthName(s) { var leap = s.charAt(0) === '闰'; if (leap) s = s.slice(1); s = s.replace('月', ''); var n = LMON[s]; if (!n && s === '十一') n = 11; if (!n && s === '十二') n = 12; return (leap ? 'leap ' : '') + 'month ' + (n || s); }
  function lunarDayName(s) {
    var n;
    if (s.charAt(0) === '初') n = LDAY1[s.charAt(1)];
    else if (s === '十') n = 10;
    else if (s.charAt(0) === '十') n = 10 + LDAY1[s.charAt(1)];
    else if (s === '二十') n = 20;
    else if (s.charAt(0) === '廿') n = 20 + LDAY1[s.charAt(1)];
    else if (s === '三十') n = 30;
    return 'day ' + (n || s);
  }
  var TERM = { '立春': 'Lichun (Start of Spring)', '雨水': 'Yushui (Rain Water)', '惊蛰': 'Jingzhe (Awakening of Insects)', '春分': 'Chunfen (Spring Equinox)', '清明': 'Qingming (Clear and Bright)', '谷雨': 'Guyu (Grain Rain)', '立夏': 'Lixia (Start of Summer)', '小满': 'Xiaoman (Grain Buds)', '芒种': 'Mangzhong (Grain in Ear)', '夏至': 'Xiazhi (Summer Solstice)', '小暑': 'Xiaoshu (Minor Heat)', '大暑': 'Dashu (Major Heat)', '立秋': 'Liqiu (Start of Autumn)', '处暑': 'Chushu (End of Heat)', '白露': 'Bailu (White Dew)', '秋分': 'Qiufen (Autumn Equinox)', '寒露': 'Hanlu (Cold Dew)', '霜降': 'Shuangjiang (Frost Descends)', '立冬': 'Lidong (Start of Winter)', '小雪': 'Xiaoxue (Minor Snow)', '大雪': 'Daxue (Major Snow)', '冬至': 'Dongzhi (Winter Solstice)', '小寒': 'Xiaohan (Minor Cold)', '大寒': 'Dahan (Major Cold)' };
  var B = '子丑寅卯辰巳午未申酉戌亥', S = '甲乙丙丁戊己庚辛壬癸';
  function ageText(t) { return t.replace(/(\d+)岁/, '$1 yr ').replace(/(\d+)个月/, '$1 mo ').replace(/(\d+)天/, '$1 d').trim(); }

  rule(/农历 (\d{4})年（([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])）(闰?[正一二三四五六七八九十冬腊]+月)(初[一二三四五六七八九十]|十[一二三四五六七八九]?|二十|廿[一二三四五六七八九]|三十)/,
    function (m, y, gz, mo, d) { return 'Lunar ' + y + ' (' + STEM[gz.charAt(0)] + '-' + BRANCH[gz.charAt(1)] + '), ' + lunarMonthName(mo) + ', ' + lunarDayName(d); });
  rule(/农历 (\d{4})年(闰)?(\d{1,2})月(\d{1,2})日（公历 (\d{4})-(\d{1,2})-(\d{1,2})( 晚子时按次日)? 换算）/,
    function (m, y, lp, mo, d, gy, gm, gd, late) { return 'Lunar ' + y + ', ' + (lp ? 'leap ' : '') + 'month ' + mo + ', day ' + d + ' (converted from Gregorian ' + gy + '-' + pad(gm) + '-' + pad(gd) + (late ? ', late Zi hour counted as next day' : '') + ')'; });
  rule(/农历 (\d{4})年(闰)?(\d{1,2})月(\d{1,2})日 ([子丑寅卯辰巳午未申酉戌亥])时/,
    function (m, y, lp, mo, d, b) { return 'Lunar ' + y + ', ' + (lp ? 'leap ' : '') + 'month ' + mo + ', day ' + d + ', ' + BRANCH[b] + ' hour'; });
  rule(/年干支 ([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])，以农历正月初一换年，不以立春/,
    function (m, s, b) { return 'Year stem-branch ' + STEM[s] + '-' + BRANCH[b] + '; the year turns at Lunar New Year, not at the Start of Spring'; });
  rule(/出生时辰 ([子丑寅卯辰巳午未申酉戌亥])时（以档案为准）/, function (m, b) { return 'Birth hour: ' + BRANCH[b] + ' hour (per your profile)'; });
  rule(/命宫 ([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])，身宫在 ([子丑寅卯辰巳午未申酉戌亥]) 宫/,
    function (m, s, b, sb) { return 'Life Palace ' + STEM[s] + '-' + BRANCH[b] + '; Body Palace in the ' + BRANCH[sb] + ' palace'; });
  rule(/紫微星在 ([子丑寅卯辰巳午未申酉戌亥])宫/, function (m, b) { return 'Ziwei star in the ' + BRANCH[b] + ' palace'; });
  rule(/四化按生年天干 ([甲乙丙丁戊己庚辛壬癸]) 取/, function (m, s) { return 'Four Transformations follow the birth-year stem ' + STEM[s]; });
  rule(/命宫([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])/, function (m, s, b) { return 'Life Palace ' + STEM[s] + '-' + BRANCH[b]; });
  rule(/身宫（([子丑寅卯辰巳午未申酉戌亥])）/, function (m, b) { return 'Body Palace (' + BRANCH[b] + ')'; });
  rule(/(\d+)岁起运，十年一换大限。/, function (m, n) { return ', begins at age ' + n + '; the major limit changes every ten years.'; });
  rule(/你今年虚岁(\d+)，正走([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])（(\d+)–(\d+)岁）大限。/,
    function (m, n, s, b, a, z) { return 'You are ' + n + ' sui this year, in the ' + STEM[s] + '-' + BRANCH[b] + ' major limit (ages ' + a + '–' + z + ').'; });
  rule(/当前节气：(立春|雨水|惊蛰|春分|清明|谷雨|立夏|小满|芒种|夏至|小暑|大暑|立秋|处暑|白露|秋分|寒露|霜降|立冬|小雪|大雪|冬至|小寒|大寒) (\d{4}-\d{2}-\d{2} \d{2}:\d{2})（(内置节气表|天文公式推算（表外年份）)）/,
    function (m, t, d, k) { return 'Current solar term: ' + TERM[t] + ' ' + d + ' (' + (k === '内置节气表' ? 'built-in solar-term table' : 'astronomical formula, year outside the table') + ')'; });
  rule(/临界提醒：出生距「(立春|雨水|惊蛰|春分|清明|谷雨|立夏|小满|芒种|夏至|小暑|大暑|立秋|处暑|白露|秋分|寒露|霜降|立冬|小雪|大雪|冬至|小寒|大寒)」仅约 (\d+) 小时，月柱以节气时刻为准；若出生时间有分钟误差，月柱可能不同/,
    function (m, t, h) { return 'Borderline notice: the birth is only about ' + h + ' hour(s) from ' + TERM[t] + '. The Month Pillar follows the exact solar-term moment, so a small error in birth time could change it.'; });
  rule(/(阳|阴)年(男|女)，(顺排|逆排)；(\d+岁\d+个月\d+天)起运（约(\d{4})年(\d{2})月）/,
    function (m, yy, sx, dir, age, y, mo) { return (yy === '阳' ? 'Yang' : 'Yin') + ' year, ' + (sx === '男' ? 'male' : 'female') + ', ' + (dir === '顺排' ? 'forward' : 'reverse') + ' order; luck cycles begin after ' + ageText(age) + ' (around ' + mon(mo) + ' ' + y + '). '; });
  rule(/(年|月|日|时)柱-(年|月|日|时)柱 (六冲|六合)/, function (m, a, b, t) { return POS[a] + '–' + POS[b] + ' ' + (t === '六冲' ? 'Six Clash' : 'Six Harmony'); });
  rule(/流年以公历(\d{4})年论：吉凶需对照当年干支与原局刑冲合会。宜把握「用神得力」之年主动作为，逆水行舟不如顺水推舟。/,
    function (m, y) { return 'Annual luck is read by the Gregorian year ' + y + ': whether it is favourable depends on how that year’s stem-branch meets the clashes, punishments and combinations of your natal chart. Act proactively in years when your Useful God is strong—it is easier to go with the current than against it.'; });
  rule(/(\d{4})年干支与原局的生克合冲，是这一年运势的晴雨表：宜顺势而为，该进则进、该守则守，方为智者。/,
    function (m, y) { return 'How the ' + y + ' stem-branch interacts with your natal chart is the barometer for the year: go with the flow, advance when it is time to advance and hold when it is time to hold—that is the wise way.'; });
  rule(/论流年如观天时：(\d{4})年宜对照原局喜忌行事。用神到位之年宜大胆，忌神当头之年宜蛰伏。/,
    function (m, y) { return 'Reading annual luck is like reading the weather: in ' + y + ', act according to the likes and dislikes of your natal chart. Be bold in years when your Useful God is in place, and lie low in years when the Unfavourable God is in charge.'; });
  rule(/「(.)」暂无康熙笔画数据，换个字试试/, function (m, c) { return 'No Kangxi stroke data for “' + c + '” yet—please try another character.'; });
  rule(/(\d+) 题真实性核验已通过（(\d+)\/12），此结果更为真实可信。/, function (m, a, b) { return 'The authenticity check on ' + a + ' items passed (' + b + '/12); this result is more genuine and reliable.'; });
  var YAON = { '初': 'Line 1', '二': 'Line 2', '三': 'Line 3', '四': 'Line 4', '五': 'Line 5', '上': 'Line 6' };
  rule(/(初|二|三|四|五|上)爻（老(阴|阳)）/, function (m, n, yy) { return YAON[n] + ' (old ' + (yy === '阳' ? 'yang' : 'yin') + ')'; });
  rule(/(\d+) 画/, function (m, n) { return n + ' strokes'; });
  rule(/(\d+) \/ 100/, function (m, n) { return n + ' / 100'; });

  // 日期 / 时间
  rule(/(\d{4}) ?年 ?(\d{1,2}) ?月 ?(\d{1,2}) ?日/, function (m, y, mo, d) { return mon(mo) + ' ' + (+d) + ', ' + y; });
  rule(/(\d{1,2})时(\d{1,2})分/, function (m, h, mi) { return pad(h) + ':' + pad(mi); });
  rule(/(\d{1,2})时(?![辰])/, function (m, h) { return pad(h) + ':00'; });
  rule(/(\d+)岁(\d+)个月(\d+)天/, function (m, y, mo, d) { return y + ' yr ' + mo + ' mo ' + d + ' d'; });
  rule(/(\d{4})年(\d{1,2})月/, function (m, y, mo) { return mon(mo) + ' ' + y; });
  rule(/(\d{4})年/, function (m, y) { return y; });

  // 干支 / 五行
  rule(/([年月日时])([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])（([金木水火土])\/([金木水火土])，([阴阳])）/,
    function (m, p, s, b, e1, e2, yy) { return POS[p] + ' ' + STEM[s] + '-' + BRANCH[b] + ' (' + ELEM[e1] + '/' + ELEM[e2] + ', ' + (yy === '阳' ? 'Yang' : 'Yin') + ')'; });
  rule(/([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])/, function (m, s, b) { return STEM[s] + '-' + BRANCH[b]; });
  rule(/([木火土金水])(\d+)/, function (m, e, n) { return ELEM[e] + ' ' + n + ' '; });
  rule(/（([风火土水])象）/, function (m, e) { return ' (' + { '风': 'Air', '火': 'Fire', '土': 'Earth', '水': 'Water' }[e] + ')'; });
  rule(/(太阳|月亮|水星|金星|火星|木星|土星|天王星|海王星|冥王星)守护/, function (m, p) { return 'ruled by ' + PLANET[p]; });

  // 带数字的整句模板
  rule(/已完成 (\d+)\/(\d+) · 还差 (\d+) 题可查看详细解读/, function (m, a, b, c) { return 'Completed ' + a + '/' + b + ' · ' + c + ' more to go before the detailed reading'; });

  // 插入式：「日主」被程序改写成「日主辛(金)」
  R.push({
    re: /日主([甲乙丙丁戊己庚辛壬癸])\(([金木水火土])\)/, strip: '日主',
    post: function (text, m, s, e) { return text.replace(/Day Master/, 'Day Master (' + STEM[s] + ', ' + ELEM[e] + ')'); }
  });

  /* ================= 词条 ================= */
  window.YUMIAO_DICT = window.YUMIAO_DICT || {};
  window.YUMIAO_DICT['extra'] = {
    /* ---- 通用 ---- */
    "签文判词仅供娱乐与怡情，不构成任何决策建议": "Oracle verdicts are offered for entertainment and reflection only and are not advice for any decision.",
    "星座与运势仅供娱乐参考，不构成任何决策建议。": "Zodiac signs and horoscopes are for entertainment only and are not advice for any decision.",
    "传统掷筊问卜 · 八字排盘 · 星座运势 · 西方星盘 · MBTI 人格快测": "Traditional jiaobei divination · BaZi chart · Zodiac horoscope · Western chart · MBTI quick personality test",
    "生辰档案、问卜记录等所有数据仅保存在本机浏览器，不上传任何服务器。": "Your birth profile, divination records and all other data are stored only in this browser on your device. Nothing is uploaded to any server.",
    "签文、排盘、运势等内容源自传统民俗与娱乐化演算，仅供娱乐与怡情，不构成医疗、法律、投资或人生决策建议。重要事项请咨询专业人士。": "Oracle verses, charts and horoscopes draw on traditional folk custom and playful calculation. They are for entertainment and reflection only and are not medical, legal, investment or life-decision advice. Please consult a qualified professional on important matters.",

    /* ---- 五行 / 阴阳 / 干支 / 十神 / 行星 ---- */
    "金": "Metal", "木": "Wood", "水": "Water", "火": "Fire", "土": "Earth",
    "阴": "Yin", "阳": "Yang",
    "甲": "Jia", "乙": "Yi", "丙": "Bing", "丁": "Ding", "戊": "Wu", "己": "Ji", "庚": "Geng", "辛": "Xin", "壬": "Ren", "癸": "Gui",
    "日主": "Day Master",
    "中和": "Balanced", "偏强": "Strong", "偏弱": "Weak",
    "比肩": "Friend", "劫财": "Rob Wealth", "食神": "Eating God", "伤官": "Hurting Officer",
    "偏财": "Indirect Wealth", "正财": "Direct Wealth", "七杀": "Seven Killings", "正官": "Direct Officer",
    "偏印": "Indirect Resource", "正印": "Direct Resource",
    "年柱": "Year Pillar", "月柱": "Month Pillar", "日柱": "Day Pillar", "时柱": "Hour Pillar",
    "年：": "Year: ", "时：": "Hour: ",
    "太阳": "Sun", "月亮": "Moon", "水星": "Mercury", "金星": "Venus", "火星": "Mars", "木星": "Jupiter", "土星": "Saturn",
    "合相": "Conjunction", "拱相": "Trine", "刑相": "Square", "三分相": "Trine",
    "风象": "Air", "火象": "Fire", "土象": "Earth", "水象": "Water",
    "基本": "Cardinal", "固定": "Fixed", "变动": "Mutable",
    "生日": "Birthday "
    ,
    /* ---- 八字 ---- */
    "四柱 · 五行 · 十神 · 神煞，排盘即现完整断语。": "Four Pillars · Five Elements · Ten Gods · Symbolic Stars — a full reading appears as soon as the chart is cast.",
    "五行偏缺于": "Your chart is short of ",
    "，日常可留意": ", so in daily life pay attention to the health of your ",
    "相关调养。古人云「虚则补之」，作息规律、心绪平和为第一要义。": ". As the ancients put it, “what is deficient should be replenished”: regular sleep and a calm mind come first.",
    "局中": "In your chart, ",
    "气不足，对应": " energy is insufficient, which corresponds to the ",
    "宜多养护：早睡以养精，少思以养神。身体是命局的载体，载体稳了运才稳。": " — these deserve extra care: sleep early to nourish vitality and think less to nourish the spirit. The body is the vessel of the chart; when the vessel is steady, fortune is steady.",
    "五行于": "Your Five Elements run slightly short in ",
    "略有亏空，": ". As for the ",
    "方面宜未病先防：饮食有节、起居有常，便是最好的「风水调理」。": ", prevent trouble before illness appears: moderate eating and regular routines are the best “feng shui” you can practise.",
    "肝胆、筋骨": "liver, gallbladder, tendons and bones", "心脏、血压、眼目": "heart, blood pressure and eyes",
    "脾胃、消化": "spleen, stomach and digestion", "肺、呼吸道、皮肤": "lungs, airways and skin", "肾、泌尿、耳": "kidneys, urinary system and ears",
    "与": " and ",
    "亡神": "God of Loss", "劫煞": "Robbery Sha", "华盖": "Canopy Star", "咸池": "Bathing Pool", "地网": "Earth Net", "天罗": "Sky Net",
    "天医": "Heavenly Physician", "天喜": "Heavenly Joy", "孤辰": "Lone Star", "学堂": "Study Hall", "寡宿": "Widow Star", "将星": "General Star",
    "旬空": "Void (Xunkong)", "桃花": "Peach Blossom", "禄神": "Emolument", "红鸾": "Red Phoenix", "羊刃": "Blade", "解神": "Resolving God",
    "词馆": "Literary Hall", "金舆": "Golden Carriage", "驿马": "Travelling Horse",
    "六冲": "Six Clash", "六合": "Six Harmony",

    /* ---- 星座 ---- */
    "以生辰档案判定星座。": "Your sign is determined from your birth profile.",
    "事业": "Career", "财运": "Wealth", "感情": "Love", "健康": "Health",
    "开创": "Cardinal", "本月": "This month, ",
    "需谨慎": "Use caution", "平平": "Average", "小吉": "Fair", "中吉": "Good", "大吉": "Excellent",
    "风象今日宜稳中带进。": " Air signs do well to advance steadily today.", "火象今日宜稳中带进。": " Fire signs do well to advance steadily today.",
    "土象今日宜稳中带进。": " Earth signs do well to advance steadily today.", "水象今日宜稳中带进。": " Water signs do well to advance steadily today.",
    "风象能量被调动：学习与健康同抓，忌只顾一头。整体": "Air energy is stirred: work on study and health together and don’t fixate on just one. Overall",
    "火象能量被调动：学习与健康同抓，忌只顾一头。整体": "Fire energy is stirred: work on study and health together and don’t fixate on just one. Overall",
    "土象能量被调动：学习与健康同抓，忌只顾一头。整体": "Earth energy is stirred: work on study and health together and don’t fixate on just one. Overall",
    "水象能量被调动：学习与健康同抓，忌只顾一头。整体": "Water energy is stirred: work on study and health together and don’t fixate on just one. Overall",

    /* ---- MBTI ---- */
    "凭第一反应拖动滑杆：左为「否」，右为「是」。": "Go with your first instinct and drag the slider: left for “No”, right for “Yes”.",
    "四十八问已毕 ·": "All 48 questions answered ·",
    "次要倾向：": "Secondary tendencies: ",
    "性格已定，点击下方按钮查看完整解读。": "Your type is set—tap the button below for the full reading.",
    "维度接近临界（差距约": " axis is close to the borderline (gap of about ",
    "维度倾向较轻（差距约": " axis leans only lightly (gap of about ",
    "%），翻转后仍有显著可能": "%); even if it flipped, there is still a significant chance",
    "%），存在次要面": "%); a secondary side exists",
    "热情": "enthusiastic",
    "今日": "Today",
    "断法 ·": "Method \u00b7",
    "：贵人可能以「提醒」而非「送礼」的形式出现，细心即是开运。": ": a benefactor may arrive as a \u201creminder\u201d rather than a \u201cgift\u201d\u2014paying attention is what brings luck.",
    "：理智想要的和内心需要的方向一致，一旦下定决心就能迅速转化为行动。": ": what the mind wants and what the heart needs point the same way, so once you decide you can turn it into action quickly.",
    "抗拒结束 · 藕断丝连": "Resisting endings \u00b7 Lingering ties",

    /* ---- 五格 ---- */
    "输入姓名，按《康熙字典》笔画起五格三才。": "Enter a name and the Five Grids and Three Talents are worked out from Kangxi Dictionary stroke counts.",
    "以康熙字典繁体笔画计；简体字自动按繁体折算（如刘→劉 15 画）。生僻字暂不支持。": "Strokes are counted in traditional form per the Kangxi Dictionary; simplified characters are converted automatically (e.g. 刘→劉, 15 strokes). Rare characters are not supported yet.",
    "三才者，天地人三道之配。相生则顺，相克则逆，人格为枢，宜细参之。": "The Three Talents are the pairing of Heaven, Earth and Human. Mutual generation runs smoothly, mutual restraint runs against the grain, and the Human grid is the pivot—study it carefully.",
    "数有定而运无常，行止仍在人为。": "Numbers are fixed but fortune is not—what you do is still up to you.",
    "数理": "Numerology number ", "三才": "Three Talents",
    "破兆": "Omen Broken", "福寿": "Fortune and Longevity", "厚重": "Weighty and Steady", "刚强": "Strong-willed", "多难": "Beset by Trials",
    "壮丽": "Grand and Splendid", "荣俊": "Glory and Talent", "变怪": "Strange Turns", "增长": "Growth", "智谋": "Wit and Strategy",
    "非运": "Ill Luck", "破家": "Household Broken", "退安": "Retreat to Safety", "有德": "Virtuous", "烦闷": "Vexation", "顺风": "Fair Wind",
    "转变": "Turning Point", "沉浮": "Ups and Downs", "达眼": "Far-sighted", "善恶": "Good and Evil", "无谋": "Lacking Plans", "衰败": "Decline",
    "非命": "Untimely Fate", "非业": "Unfruitful Work", "劳苦": "Toil and Hardship", "无勇": "Lacking Courage", "退守": "Falling Back",
    "离散": "Scattering", "晚苦": "Late Hardship", "遁吉": "Hidden Fortune",
    "吉": "Auspicious", "凶": "Inauspicious", "半吉": "Half-auspicious",
    "大吉": "Excellent", "中吉": "Good", "吉多于凶": "More fortunate than not", "吉凶参半": "Mixed fortune", "凶多于吉": "More misfortune than fortune", "凶多吉少": "Mostly unfortunate", "大凶": "Very inauspicious",

    /* ---- 塔罗 ---- */
    "二十二张大阿卡纳，心诚则显。默念所问，选定牌阵。": "Twenty-two Major Arcana cards—sincerity reveals. Hold your question in mind and choose a spread.",
    "牌面已定，牌义如下。": "The cards are set; their meanings follow.",
    "牌示方向，行止仍在人为。": "The cards point a direction, but what you do is still up to you.",

    /* ---- 称骨 ---- */
    "以出生的农历年、月、日、时各取一份骨重，相加得总骨重，再看对应批语。生辰与八字、星座、星盘共用同一份档案。": "Take a bone weight for each of your lunar birth year, month, day and hour, add them for the total, then read the matching verse. Your birth profile is shared with the BaZi, zodiac and Western chart readings.",
    "称骨算命是流传民间的传统玩法，仅供娱乐参考。": "Bone-weight fortune-telling is a traditional folk pastime, for entertainment only.",

    /* ---- 紫微 ---- */
    "出生时间未填，按午时（12:00）计算": "Birth time not set; calculated as the Wu hour (12:00)",
    "本宫星曜：": "Stars in this palace: ",
    "长生十二神：": "Twelve Growth Gods: ",
    "你的性格底盘在": "Your personality foundation lies in the ",
    "中年后重心看": "After midlife, look to the ",
    "大限是十年一站的运势车站，每十年走一宫。": "A major limit is a ten-year fortune station: every ten years you move on one palace.",
    "出生年天干带来的四种变化，标在星名右上角小圈里：": "The four transformations brought by your birth-year stem are marked in the small circle at the top right of each star name:",

    /* ---- 星盘 ---- */
    "行星 · 宫位 · 相位。宫位精算需档案中的出生地经纬度。": "Planets · Houses · Aspects. Precise houses need the birthplace latitude and longitude from your profile.",
    "星盘数据可视化 ·": "Chart data visualization ·",
    "四象力量分布": "Distribution of the four elements", "三种行动模式": "The three modalities",
    "最值得盯的相位（按紧密度）": "Aspects most worth watching (by orb)",
    "这两颗星的主题会反复在生活里「绑在一起」出现。": "The themes of these two planets will keep showing up “tied together” in your life.",
    "读法提示：合/拱/六分偏顺风；刑/对偏功课。顺风要主动用，功课要拆小步做，不要硬刚。": "How to read: conjunction, trine and sextile lean supportive; square and opposition lean toward lessons. Use the tailwind actively, break lessons into small steps, and don’t fight head-on.",
    "填写出生地经纬度后，可生成上升与十二宫生活舞台解读。": "Once you enter the birthplace latitude and longitude, readings for the Ascendant and the twelve houses (the stages of life) can be generated.",
    "出生数据": "Birth data", "主要相位": "Main aspects", "元素 / 模式": "Elements / Modalities",
    "阅读顺序建议：一 → 三 → 四~九（按兴趣）→ 十~十二。全部默认收起，点标题展开/收起。补全出生时间与地点，上升与宫位解读会更准确。": "Suggested reading order: 1 → 3 → 4–9 (as you like) → 10–12. All sections start collapsed; tap a title to expand or collapse. Add your birth time and place for more accurate Ascendant and house readings.",
    "分属不同元素：理智想要的和内心需要的不完全同步，先说服自己的情感面，事情才走得远、走得稳。": " belong to different elements: what the mind wants and what the heart needs are not fully in sync—win over your emotional side first and things will go further and more steadily.",
    "未填": "not set",
    "很高": "Very high", "偏高": "Fairly high", "中等": "Moderate", "需主动经营": "Needs active care",
    "观察算牌型": "Observant card-counter", "凭感觉流型": "Go-by-feel", "均衡型": "Balanced",
    /* ---- 紫微星曜 ---- */
    "紫微": "Ziwei",
    "天机": "Tianji",
    "武曲": "Wuqu",
    "天同": "Tiantong",
    "廉贞": "Lianzhen",
    "天府": "Tianfu",
    "太阴": "Taiyin",
    "贪狼": "Tanlang",
    "巨门": "Jumen",
    "天相": "Tianxiang",
    "天梁": "Tianliang",
    "七杀": "Qisha",
    "破军": "Pojun",
    "左辅": "Zuofu",
    "右弼": "Youbi",
    "文昌": "Wenchang",
    "文曲": "Wenqu",
    "天魁": "Tiankui",
    "天钺": "Tianyue",
    "禄存": "Lucun",
    "天马": "Tianma",
    "擎羊": "Qingyang",
    "陀罗": "Tuoluo",
    "铃星": "Lingxing",
    "地空": "Dikong",
    "地劫": "Dijie",
    "天空": "Tiankong",
    "天刑": "Tianxing",
    "天姚": "Tianyao",
    "天哭": "Tianku",
    "天虚": "Tianxu",
    "龙池": "Longchi",
    "凤阁": "Fengge",
    "天德": "Tiande",
    "月德": "Yuede",
    "天才": "Tiancai",
    "天寿": "Tianshou",
    "台辅": "Taifu",
    "封诰": "Fenggao",
    "三台": "Santai",
    "八座": "Bazuo",
    "恩光": "Enguang",
    "天贵": "Tiangui",
    "天官": "Tianguan",
    "天福": "Tianfu (Blessing)",
    "蜚廉": "Feilian",
    "破碎": "Posui",
    "天伤": "Tianshang",
    "天使": "Tianshi",
    "天巫": "Tianwu",
    "天月": "Tianyue (Moon)",
    "阴煞": "Yinsha",
    "你今年虚岁": "Your nominal age this year is ",
    "天厨": "Tianchu", "空亡": "Kongwang", "截路": "Jielu", "年解": "Nianjie"
  };
})();