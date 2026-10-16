// ============================================================
// 紫微斗数简化排盘：农历换算 → 命身宫 → 五行局 → 十四主星 → 命主身主 → 生年四化
// 问事页 chip「紫微」入口；交互与其它面板统一：排盘 → 掷筊请示 → 筊型决定详示/略示/守静
// 安星诀已按典籍口诀 + 开源排盘实现交叉核验（紫微星用 5×30 查表法，不用商余公式）
// 简化版口径：不排辅星（左辅右弼文昌文曲等）、不排大限流年、不排宫干；闰月按当月计；年界按农历正月初一
// 农历表与 11-chenggu.js 同源（1900–2100）
// ============================================================

var ZiweiCalc = (function () {
  'use strict';
  var LUNAR_INFO = [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x18da3,0x095b0,0x14977,0x04970,0x0a4b0,0x1b0b6,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04db0,0x025b0,0x18573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x1ad47,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096e5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0bca4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x05270,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4f0,0x05260,0x0ea65,0x0d520,0x0daa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x092d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520];
  var BASE = Date.UTC(1900, 0, 31);
  function leapMonth(y) { return LUNAR_INFO[y - 1900] & 15; }
  function leapDays(y) { return leapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
  function monthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
  function yearDays(y) {
    var s = 348, i;
    for (i = 0x8000; i > 0x8; i >>= 1) s += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
    return s + leapDays(y);
  }
  /* 公历 → 农历 {year, month, day, leap} */
  function solarToLunar(y, m, d) {
    if (y < 1900 || y > 2100) return null;
    var off = Math.round((Date.UTC(y, m - 1, d) - BASE) / 864e5);
    if (off < 0) return null;
    var ly = 1900, n;
    while (ly < 2101 && off >= (n = yearDays(ly))) { off -= n; ly++; }
    if (ly > 2100) return null;
    var lm = leapMonth(ly), isLeap = false, mo = 1, len;
    for (; mo <= 12; mo++) {
      len = monthDays(ly, mo);
      if (off < len) break;
      off -= len;
      if (mo === lm) {
        len = leapDays(ly);
        if (off < len) { isLeap = true; break; }
        off -= len;
      }
    }
    return { year: ly, month: mo, day: off + 1, leap: isLeap };
  }

  var GAN = '甲乙丙丁戊己庚辛壬癸';
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  var GONG = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
  var JU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
  /* 五行局表：行=年干对（甲己/乙庚/丙辛/丁壬/戊癸），列=命宫地支对（子丑/寅卯/辰巳/午未/申酉/戌亥） */
  var JU_TABLE = [
    [2, 6, 3, 5, 4, 6],
    [6, 5, 4, 3, 2, 5],
    [5, 3, 2, 4, 6, 3],
    [3, 4, 6, 2, 5, 4],
    [4, 2, 5, 6, 3, 2]
  ];
  var BRANCH_PAIR = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  /* 安紫微星 5局×30日 查表（值=地支 index） */
  var ZIWEI_TABLE = [
    [1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,0,0,1,1,2,2,3,3,4],          /* 水二局 */
    [4,1,2,5,2,3,6,3,4,7,4,5,8,5,6,9,6,7,10,7,8,11,8,9,0,9,10,1,10,11],        /* 木三局 */
    [11,4,1,2,0,5,2,3,1,6,3,4,2,7,4,5,3,8,5,6,4,9,6,7,5,10,7,8,6,11],          /* 金四局 */
    [6,11,4,1,2,7,0,5,2,3,8,1,6,3,4,9,2,7,4,5,10,3,8,5,6,11,4,9,6,7],          /* 土五局 */
    [9,6,11,4,1,2,10,7,0,5,2,3,11,8,1,6,3,4,0,9,2,7,4,5,1,10,3,8,5,6]           /* 火六局 */
  ];
  /* 命主（按命宫地支） */
  var MINGZHU = ['贪狼', '巨门', '禄存', '文曲', '廉贞', '武曲', '破军', '武曲', '廉贞', '文曲', '禄存', '巨门'];
  /* 身主（按年支；子年取火星） */
  var SHENZHU = ['火星', '天相', '天梁', '天同', '文昌', '天机', '火星', '天相', '天梁', '天同', '文昌', '天机'];
  /* 生年四化（按年干）：[禄, 权, 科, 忌] */
  var SIHUA = [
    ['廉贞', '破军', '武曲', '太阳'],
    ['天机', '天梁', '紫微', '太阴'],
    ['天同', '天机', '文昌', '廉贞'],
    ['太阴', '天同', '天机', '巨门'],
    ['贪狼', '太阴', '右弼', '天机'],
    ['武曲', '贪狼', '天梁', '文曲'],
    ['太阳', '武曲', '太阴', '天同'],
    ['巨门', '太阳', '文曲', '文昌'],
    ['天梁', '紫微', '左辅', '武曲'],
    ['破军', '巨门', '太阴', '贪狼']
  ];

  function hourBranch(h) { return Math.floor((((h % 24) + 24) % 24 + 1) / 2) % 12; }

  /* 排盘：solar={y,m,d}, hour=小时数；返回 chart 或 {error} */
  function chart(sy, sm, sd, hour) {
    var lunar = solarToLunar(sy, sm, sd);
    if (!lunar) return { error: '生辰超出 1900–2100 范围，暂不支持排盘。' };
    var yStem = (((lunar.year - 4) % 10) + 10) % 10;
    var yBranch = (((lunar.year - 4) % 12) + 12) % 12;
    var t = hourBranch(hour == null ? 12 : hour);
    var Mm = (lunar.month + 1) % 12;
    var ming = (((Mm - t) % 12) + 12) % 12;
    var shen = (Mm + t) % 12;
    var ju = JU_TABLE[yStem % 5][BRANCH_PAIR[ming]];
    var zw = ZIWEI_TABLE[ju - 2][lunar.day - 1];
    var tf = (((4 - zw) % 12) + 12) % 12;
    /* 十四主星落宫 */
    var stars = {}; /* 星名 -> 地支 */
    function put(name, zhi) { stars[name] = (((zhi % 12) + 12) % 12); }
    put('紫微', zw);
    put('天机', zw - 1); put('太阳', zw - 3); put('武曲', zw - 4); put('天同', zw - 5); put('廉贞', zw - 8);
    put('天府', tf);
    put('太阴', tf + 1); put('贪狼', tf + 2); put('巨门', tf + 3); put('天相', tf + 4);
    put('天梁', tf + 5); put('七杀', tf + 6); put('破军', tf + 10);
    /* 十二宫 */
    var palaces = [];
    for (var i = 0; i < 12; i++) {
      var z = (ming + i) % 12;
      palaces.push({ zhi: z, zhiName: ZHI[z], gong: GONG[i], stars: [] });
    }
    var byZhi = {};
    palaces.forEach(function (p) { byZhi[p.zhi] = p; });
    Object.keys(stars).forEach(function (name) { byZhi[stars[name]].stars.push(name); });
    var hua = SIHUA[yStem];
    return {
      lunar: lunar, hourBranch: t,
      yearStem: yStem, yearBranch: yBranch,
      yearGZ: GAN[yStem] + ZHI[yBranch],
      ming: ming, shen: shen,
      mingName: ZHI[ming], shenName: ZHI[shen],
      ju: ju, juName: JU_NAME[ju],
      ziwei: zw, tianfu: tf,
      stars: stars, palaces: palaces,
      mingzhu: MINGZHU[ming], shenzhu: SHENZHU[yBranch],
      sihua: [
        { hua: '化禄', star: hua[0] }, { hua: '化权', star: hua[1] },
        { hua: '化科', star: hua[2] }, { hua: '化忌', star: hua[3] }
      ]
    };
  }

  return {
    solarToLunar: solarToLunar, hourBranch: hourBranch, chart: chart,
    GAN: GAN, ZHI: ZHI, GONG: GONG, JU_NAME: JU_NAME
  };
})();
window.ZiweiCalc = ZiweiCalc;

/* ── 十四主星短解 ── */
var ZIWEI_STAR_TEXT = {
  '紫微': '帝星，主贵、主担当。有领导之质，宜扛事不推诿；忌孤高寡合，独断则失人和。',
  '天机': '善星，主智、主变。机谋灵动，宜策划、学习、应变；忌多思少行，朝三暮四。',
  '太阳': '主光明、主付出。为人热忱，宜利他、宜博名声；忌燃烧自己，却无人问津。',
  '武曲': '财星，主刚毅、主执行。行动力强，宜实干兴业；忌刚愎冷硬，不通人情。',
  '天同': '福星，主温和、主人缘。性情随和，宜守成、宜合作；忌贪图安逸，误了正事。',
  '廉贞': '主原则、主才艺。外柔内刚亦有魅力，宜守正出奇；忌情绪用事，因小失大。',
  '天府': '库星，主稳重、主守成。府库充盈，宜积蓄、宜管理；忌过分保守，错失良机。',
  '太阴': '主温柔、主内敛。细腻体贴，宜蓄积、宜幕后运筹；忌多愁善感，优柔寡断。',
  '贪狼': '桃花星，主才艺、主交际。八面玲珑，宜才艺、宜开拓；忌贪多嚼不烂，样样通样样松。',
  '巨门': '主口才、主钻研。能言善道，宜以口生财、以研立身；忌口舌招尤，祸从口出。',
  '天相': '印星，主辅佐、主谨慎。忠诚可靠，宜辅佐、宜服务；忌过度谨慎，坐失先机。',
  '天梁': '荫星，主清高、主庇荫。天生带贵，宜助人、宜清职；忌恃才清高，脱离实际。',
  '七杀': '将星，主魄力、主开创。敢打敢拼，宜开创、宜乱中取胜；忌独断少谋，孤军深入。',
  '破军': '主变革、主破立。不破不立，宜改革、宜白手起家；忌横冲直撞，玉石俱焚。'
};
var ZIWEI_HUA_TEXT = {
  '化禄': '禄为财禄顺遂。所化之星添一份助力，所问之事多有回甘。',
  '化权': '权为权柄主动。所化之星添魄力、掌事权，宜主动进取。',
  '化科': '科为名声贵人。所化之星添声名、得赏识，宜扬名不宜逐利。',
  '化忌': '忌为阻滞执念。所化之星须多留意，相关事务宜静不宜动，忌强求。'
};

/* ── 状态 ── */
var _ziweiChart = null;

function ziweiBody() { return document.getElementById('ziweiBody'); }

function openZiweiPanel() {
  _ziweiChart = null;
  backToZiweiForm();
  if (typeof window.renderProfileBar === 'function') window.renderProfileBar('ziweiProfileBar');
  ModalUI.open('ziwei');
}
function closeZiweiPanel() {
  ModalUI.close('ziwei');
  if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
  if (typeof fillQuestionText === 'function') fillQuestionText('');
}
function backToZiweiForm() {
  _ziweiChart = null;
  var el = ziweiBody();
  if (!el) return;
  el.innerHTML =
    '<div class="bazi-form" id="ziweiForm">' +
    '<p class="mbti-intro">以农历生辰定命宫、布十四主星。简化版仅排主星与生年四化，不排辅星大限——排盘既毕，掷筊请示。</p>' +
    '<div class="profile-bar" id="ziweiProfileBar" data-bar="ziwei"></div>' +
    '<div class="bazi-error" id="ziweiError"></div>' +
    '<button class="btn-gold btn-block" onclick="submitZiweiForm()">排盘 · 掷筊</button>' +
    '</div>' +
    '<div class="mbti-reveal" id="ziweiReveal" style="display:none;">' +
    '<div class="jiao-display" id="ziweiJiaoDisplay"></div>' +
    '<div class="mbti-jiao-label" id="ziweiJiaoLabel"></div>' +
    '<div class="mbti-report" id="ziweiReport"></div>' +
    '<div class="mbti-reveal-actions">' +
    '<button class="btn-ghost btn-sm" id="ziweiRecast" onclick="castZiweiJiao()" style="display:none;">再次掷筊</button>' +
    '<button class="btn-ghost btn-sm" onclick="backToZiweiForm()">重新排盘</button>' +
    '</div></div>';
  if (typeof window.renderProfileBar === 'function') window.renderProfileBar('ziweiProfileBar');
}

function readZiweiBirth() {
  var b = null;
  try {
    b = (typeof readStorageJSON === 'function')
      ? readStorageJSON('yumiao_shared_birth_v1', null)
      : JSON.parse(localStorage.getItem('yumiao_shared_birth_v1') || 'null');
  } catch (_) { b = null; }
  if (!b || !b.year || !b.month || !b.day) return { error: '请先录入生辰档案，再来排盘。' };
  var hour = (b.hour == null || b.hour === '') ? null : +b.hour;
  return { birth: { y: +b.year, m: +b.month, d: +b.day, hour: hour, hourMissing: hour == null } };
}

function submitZiweiForm() {
  var errEl = document.getElementById('ziweiError');
  if (errEl) errEl.textContent = '';
  var r = readZiweiBirth();
  if (r.error) { if (errEl) errEl.textContent = r.error; return; }
  var c;
  try {
    c = ZiweiCalc.chart(r.birth.y, r.birth.m, r.birth.d, r.birth.hour == null ? 12 : r.birth.hour);
  } catch (_) { c = { error: '排盘失败，请检查出生信息是否正确。' }; }
  if (c.error) { if (errEl) errEl.textContent = c.error; return; }
  c.hourMissing = r.birth.hourMissing;
  _ziweiChart = c;
  var form = document.getElementById('ziweiForm');
  var reveal = document.getElementById('ziweiReveal');
  if (form) form.style.display = 'none';
  if (reveal) reveal.style.display = '';
  castZiweiJiao();
}

/* ── 命盘十二宫格（传统 4×4 布局，中央为命主身主） ── */
var ZIWEI_CELL_POS = { 5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4], 4: [2, 1], 9: [2, 4], 3: [3, 1], 10: [3, 4], 2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4] };
function ziweiChartHTML(c) {
  var byZhi = {};
  c.palaces.forEach(function (p) { byZhi[p.zhi] = p; });
  var huaStar = {};
  c.sihua.forEach(function (s) { huaStar[s.star] = s.hua; });
  var cells = '';
  c.palaces.forEach(function (p) {
    var z = p.zhi;
    var pos = ZIWEI_CELL_POS[z];
    var starHtml = p.stars.map(function (s) {
      var hua = huaStar[s] ? '<span class="ziwei-hua">' + huaStar[s].replace('化', '') + '</span>' : '';
      var cls = (z === c.ming || z === c.shen) ? 'ziwei-star hot' : 'ziwei-star';
      return '<div class="' + cls + '">' + escapeHtml(s) + hua + '</div>';
    }).join('');
    var mark = '';
    if (z === c.ming && z === c.shen) mark = '<span class="ziwei-mark">命身同宫</span>';
    else if (z === c.ming) mark = '<span class="ziwei-mark">命宫</span>';
    else if (z === c.shen) mark = '<span class="ziwei-mark">身宫</span>';
    cells += '<div class="ziwei-cell' + (z === c.ming ? ' is-ming' : '') + '" style="grid-row:' + pos[0] + ';grid-column:' + pos[1] + '">' +
      '<div class="ziwei-gong">' + escapeHtml(p.gong) + mark + '</div>' +
      '<div class="ziwei-zhi">' + escapeHtml(p.zhiName) + '</div>' +
      '<div class="ziwei-stars">' + starHtml + '</div></div>';
  });
  var lunar = c.lunar;
  var leapMark = lunar.leap ? '（闰月按当月计）' : '';
  var hourMark = c.hourMissing ? '时辰未录，暂按午时起盘' : '';
  return '<div class="ziwei-head"><div class="mbti-type">' + escapeHtml(c.yearGZ) + '年 · ' + escapeHtml(c.juName) + '</div>' +
    '<div class="mbti-summary">农历' + lunar.year + '年' + lunar.month + '月' + lunar.day + '日' + leapMark + ' · ' + escapeHtml(c.mingName) + '宫安命 · ' + escapeHtml(c.shenName) + '宫安身' + (hourMark ? ' · ' + hourMark : '') + '</div></div>' +
    '<div class="ziwei-chart">' + cells +
    '<div class="ziwei-center"><div class="ziwei-center-row"><span>命主</span><strong>' + escapeHtml(c.mingzhu) + '</strong></div>' +
    '<div class="ziwei-center-row"><span>身主</span><strong>' + escapeHtml(c.shenzhu) + '</strong></div></div>' +
    '</div>';
}

function ziweiStarSections(c, brief) {
  var mingP = c.palaces[0];
  var shenP = null;
  c.palaces.forEach(function (p) { if (p.zhi === c.shen) shenP = p; });
  function starLine(p, label) {
    if (!p.stars.length) {
      var dui = c.palaces[(c.palaces.indexOf(p) + 6) % 12];
      return '<div class="mbti-sec"><span class="mbti-sec-label">' + label + '（' + escapeHtml(p.zhiName) + '）</span>' +
        '本宫无主星，借对宫' + escapeHtml(dui.gong) + '（' + escapeHtml(dui.zhiName) + '）' +
        escapeHtml(dui.stars.join('、') || '无主星') + '参看。' +
        (brief ? '' : '<br>' + escapeHtml(dui.stars.map(function (s) { return ZIWEI_STAR_TEXT[s] || ''; }).join(''))) + '</div>';
    }
    return '<div class="mbti-sec"><span class="mbti-sec-label">' + label + '（' + escapeHtml(p.zhiName) + '）' + escapeHtml(p.stars.join('、')) + '</span>' +
      (brief ? '' : escapeHtml(p.stars.map(function (s) { return ZIWEI_STAR_TEXT[s] || ''; }).join(''))) + '</div>';
  }
  var html = starLine(mingP, '命宫') + starLine(shenP, '身宫');
  html += '<div class="mbti-sec"><span class="mbti-sec-label">生年四化</span>' +
    c.sihua.map(function (s) {
      return escapeHtml(s.hua + '：' + s.star) + (brief ? '' : '——' + escapeHtml(ZIWEI_HUA_TEXT[s.hua] || ''));
    }).join('<br>') + '</div>';
  html += '<div class="mbti-sec"><span class="mbti-sec-label">命主 · 身主</span>命主' +
    escapeHtml(c.mingzhu) + '、身主' + escapeHtml(c.shenzhu) + '。命主掌先天格局之枢，身主掌后天行运之重。</div>';
  return html;
}

/* ── 筊请示 ── */
function castZiweiJiao() {
  var recastBtn = document.getElementById('ziweiRecast');
  var jiaoLabel = document.getElementById('ziweiJiaoLabel');
  var reportEl = document.getElementById('ziweiReport');
  var display = document.getElementById('ziweiJiaoDisplay');
  if (!display) return;
  if (recastBtn) recastBtn.style.display = 'none';
  if (jiaoLabel) { jiaoLabel.textContent = ''; jiaoLabel.className = 'mbti-jiao-label'; }
  if (reportEl) reportEl.innerHTML = '';
  getAudioCtx();
  display.innerHTML = '';
  var type = rollJiaoType();
  var faces = facesForType(type);
  var jiao1 = document.createElement('div');
  var jiao2 = document.createElement('div');
  jiao1.className = 'jiao spinning';
  jiao2.className = 'jiao spinning';
  display.appendChild(jiao1);
  display.appendChild(jiao2);
  setTimeout(function () {
    try {
      jiao1.classList.remove('spinning');
      jiao2.classList.remove('spinning');
      jiao1.classList.add(faces[0] === 1 ? 'yang' : 'yin');
      jiao2.classList.add(faces[1] === 1 ? 'yang' : 'yin');
      jiao1.style.setProperty('--land-rot', ((Math.random() * 14) - 7).toFixed(1) + 'deg');
      jiao2.style.setProperty('--land-rot', ((Math.random() * 14) - 7).toFixed(1) + 'deg');
      jiao1.classList.add('landed');
      jiao2.classList.add('landed');
      try { playJiaoLand(); } catch (_) {}
      renderZiweiReveal(type);
    } catch (_) {
      if (reportEl) reportEl.innerHTML = '<div class="mbti-no-report">掷筊失败，只能遵从内心，随遇而安。</div>';
    } finally {
      if (recastBtn) recastBtn.style.display = 'inline-block';
    }
  }, 1000);
}
function renderZiweiReveal(type) {
  var meta = typeMeta[type] || typeMeta.xiao;
  var jiaoLabel = document.getElementById('ziweiJiaoLabel');
  var reportEl = document.getElementById('ziweiReport');
  if (jiaoLabel) {
    jiaoLabel.className = 'mbti-jiao-label ' + meta.class;
    jiaoLabel.textContent = meta.label + ' · ' + meta.meaning;
  }
  if (!reportEl || !_ziweiChart) return;
  var c = _ziweiChart;
  if (type === 'yin') {
    reportEl.innerHTML = '<div class="mbti-no-report">两筊皆阴，神明未允此问。命盘暂且封存，静心之后再来。</div>';
    return;
  }
  var html = ziweiChartHTML(c) + ziweiStarSections(c, type !== 'sheng');
  if (type === 'sheng') {
    html += '<div class="mbti-brief-note">聖筊既定，命盘详示如上。星曜指引方向，行止仍在人为。</div>';
  } else {
    html += '<div class="mbti-brief-note">笑筊略示：命身宫与四化如上，细处未明，可再诚心一问。</div>';
  }
  reportEl.innerHTML = html;
  try {
    if (typeof saveReportHTML === 'function') saveReportHTML('yumiao_report_ziwei_v1', '紫微斗数', 'ziweiReport');
  } catch (_) {}
}
