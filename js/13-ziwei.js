// ============================================================
// 紫微斗数完整排盘：问事页 chip「紫微」入口
// 排盘引擎：iztro v2.6.3（MIT License, SylarLong/iztro），js/13a-iztro.min.js
//   命宫/身宫/五行局/十四主星/辅星煞星/生年四化/宫干/大限流年小限流月
//   年界按农历正月初一（iztro 默认 yearDivide=normal）；身主以生年年支定
// 界面与操作习惯与其它面板统一：排盘 → 掷筊请示 → 筊型决定详示/略示/守静
// ============================================================

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
/* ── 辅星煞星短解 ── */
var ZIWEI_AUX_TEXT = {
  '左辅': '贵人辅佐，得人心，多助力，宜借力行事。',
  '右弼': '辅弼同心，谋事有人帮，宜合作、宜团队。',
  '文昌': '主科名文书，利考试、文书、名声。',
  '文曲': '主才艺口才，利艺术、表达、异路功名。',
  '天魁': '天乙贵人，遇难呈祥，多得长辈提携。',
  '天钺': '玉堂贵人，暗中助力，亦主女性贵人。',
  '禄存': '主财禄积蓄，逢之主富，守财有道。',
  '天马': '主奔波变动，利远行开拓，动中求财。',
  '擎羊': '主刑伤果决，行事果断亦带刑克，忌冲动。',
  '陀罗': '主拖延纠缠，是非口舌，宜忍耐守成。',
  '火星': '主急躁爆发，来得快去得快，防意外血光。',
  '铃星': '主阴沉计谋，暗中较劲，防小人算计。',
  '地空': '主理想落空，宜精神层面追求，忌投机。',
  '地劫': '主破耗劫夺，财来财去，宜守不宜贪。'
};
var ZIWEI_JI = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马'];
var ZIWEI_SHA = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
var ZIWEI_ZHI = '子丑寅卯辰巳午未申酉戌亥';
var ZIWEI_HUA_ORDER = ['禄', '权', '科', '忌'];
var ZIWEI_HUA_FULL = { '禄': '化禄', '权': '化权', '科': '化科', '忌': '化忌' };

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
    '<p class="mbti-intro">完整排盘：十四主星、辅星煞星、生年四化、大限流年。排盘既毕，掷筊请示。</p>' +
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
  return {
    birth: {
      y: +b.year, m: +b.month, d: +b.day,
      hour: hour, hourMissing: hour == null,
      gender: b.sex === 'F' ? '女' : '男'
    }
  };
}

function ziweiHourBranch(h) { return Math.floor((((h % 24) + 24) % 24 + 1) / 2) % 12; }

/* 用 iztro 起盘，归一化为渲染用的 plain 结构 */
function buildZiweiChart(birth) {
  var iz = window.iztro;
  if (!iz || !iz.astro || !iz.astro.bySolar) throw new Error('排盘引擎未就绪，请重试。');
  var hour = birth.hour == null ? 12 : birth.hour;
  var a = iz.astro.bySolar(
    birth.y + '-' + birth.m + '-' + birth.d,
    ziweiHourBranch(hour),
    birth.gender, false, 'zh-CN'
  );
  function splitStars(p) {
    var major = (p.majorStars || []).map(function (s) {
      return { name: s.name, brightness: s.brightness || '', mutagen: s.mutagen || '' };
    });
    var ji = [], sha = [], zayao = [];
    (p.minorStars || []).forEach(function (s) {
      var it = { name: s.name, mutagen: s.mutagen || '' };
      if (ZIWEI_JI.indexOf(s.name) >= 0) ji.push(it);
      else if (ZIWEI_SHA.indexOf(s.name) >= 0) sha.push(it);
      else zayao.push(it);
    });
    (p.adjectiveStars || []).forEach(function (s) { zayao.push({ name: s.name, mutagen: '' }); });
    return { major: major, ji: ji, sha: sha, zayao: zayao };
  }
  var palaces = a.palaces.map(function (p) {
    var sp = splitStars(p);
    return {
      name: p.name, gz: p.heavenlyStem + p.earthlyBranch,
      zhiIdx: ZIWEI_ZHI.indexOf(p.earthlyBranch),
      isMing: p.name === '命宫', isShen: !!p.isBodyPalace,
      major: sp.major, ji: sp.ji, sha: sp.sha, zayao: sp.zayao,
      decadalRange: (p.decadal && p.decadal.range) ? p.decadal.range.slice() : null
    };
  });
  /* 生年四化：扫全盘带化之星 */
  var sihua = [];
  ZIWEI_HUA_ORDER.forEach(function (h) {
    outer: for (var i = 0; i < palaces.length; i++) {
      var pl = palaces[i];
      var all = pl.major.concat(pl.ji, pl.sha);
      for (var j = 0; j < all.length; j++) {
        if (all[j].mutagen === h) { sihua.push({ hua: ZIWEI_HUA_FULL[h], star: all[j].name, gong: pl.name }); break outer; }
      }
    }
  });
  /* 大限流年：以今日起运 */
  var now = new Date();
  var h = a.horoscope(now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate());
  function horoInfo(sec) {
    if (!sec || sec.index == null || sec.index < 0) return null;
    var pl = palaces[sec.index];
    if (!pl) return null;
    return {
      gong: pl.name, gz: sec.heavenlyStem + sec.earthlyBranch,
      sihua: (sec.mutagen || []).map(function (s, k) {
        return { hua: ZIWEI_HUA_FULL[ZIWEI_HUA_ORDER[k]], star: s };
      })
    };
  }
  var daxian = horoInfo(h.decadal);
  /* 本限岁数：找 range 含虚岁的宫 */
  var nominalAge = h.age && h.age.nominalAge;
  var curRange = null;
  if (nominalAge != null) {
    for (var k = 0; k < palaces.length; k++) {
      var r = palaces[k].decadalRange;
      if (r && nominalAge >= r[0] && nominalAge <= r[1]) { curRange = r; break; }
    }
  }
  if (daxian) { daxian.age = nominalAge; daxian.range = curRange; }
  return {
    lunarDate: a.lunarDate, chineseDate: a.chineseDate,
    zodiac: a.zodiac, wuju: a.fiveElementsClass,
    mingzhu: a.soul, shenzhu: a.body,
    gender: birth.gender, hourMissing: birth.hourMissing,
    palaces: palaces, sihua: sihua,
    daxian: daxian,
    liunian: horoInfo(h.yearly),
    xiaoxian: (h.age && h.age.index >= 0) ? { age: nominalAge, gong: palaces[h.age.index].name } : null,
    liuyue: horoInfo(h.monthly),
    year: now.getFullYear()
  };
}

function submitZiweiForm() {
  var errEl = document.getElementById('ziweiError');
  if (errEl) errEl.textContent = '';
  var r = readZiweiBirth();
  if (r.error) { if (errEl) errEl.textContent = r.error; return; }
  var c;
  try {
    c = buildZiweiChart(r.birth);
  } catch (e) {
    if (errEl) errEl.textContent = (e && e.message) || '排盘失败，请检查出生信息是否正确。';
    return;
  }
  _ziweiChart = c;
  var form = document.getElementById('ziweiForm');
  var reveal = document.getElementById('ziweiReveal');
  if (form) form.style.display = 'none';
  if (reveal) reveal.style.display = '';
  castZiweiJiao();
}

/* ── 命盘十二宫格（传统 4×4 布局，中央为命主身主） ── */
var ZIWEI_CELL_POS = { 5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4], 4: [2, 1], 9: [2, 4], 3: [3, 1], 10: [3, 4], 2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4] };
function ziweiHuaBadge(mutagen) {
  return mutagen ? '<span class="ziwei-hua">' + escapeHtml(mutagen) + '</span>' : '';
}
function ziweiChartHTML(c) {
  var cells = '';
  c.palaces.forEach(function (p) {
    var pos = ZIWEI_CELL_POS[p.zhiIdx];
    if (!pos) return;
    var starHtml = p.major.map(function (s) {
      var cls = (p.isMing || p.isShen) ? 'ziwei-star hot' : 'ziwei-star';
      return '<div class="' + cls + '">' + escapeHtml(s.name) + ziweiHuaBadge(s.mutagen) + '</div>';
    }).join('');
    var fuHtml = p.ji.length
      ? '<div class="zw-fu">' + p.ji.map(function (s) { return escapeHtml(s.name) + ziweiHuaBadge(s.mutagen); }).join(' ') + '</div>' : '';
    var shaHtml = p.sha.length
      ? '<div class="zw-sha">' + p.sha.map(function (s) { return escapeHtml(s.name) + ziweiHuaBadge(s.mutagen); }).join(' ') + '</div>' : '';
    var mark = '';
    if (p.isMing && p.isShen) mark = '<span class="ziwei-mark">命身同宫</span>';
    else if (p.isMing) mark = '<span class="ziwei-mark">命宫</span>';
    else if (p.isShen) mark = '<span class="ziwei-mark">身宫</span>';
    cells += '<div class="ziwei-cell' + (p.isMing ? ' is-ming' : '') + '" style="grid-row:' + pos[0] + ';grid-column:' + pos[1] + '">' +
      '<div class="ziwei-gong">' + escapeHtml(p.name) + mark + '</div>' +
      '<div class="ziwei-zhi">' + escapeHtml(p.gz) + '</div>' +
      '<div class="ziwei-stars">' + starHtml + '</div>' + fuHtml + shaHtml + '</div>';
  });
  var hourMark = c.hourMissing ? ' · 时辰未录，暂按午时起盘' : '';
  return '<div class="ziwei-head"><div class="mbti-type">' + escapeHtml(c.wuju) + ' · ' + escapeHtml(c.gender) + '命</div>' +
    '<div class="mbti-summary">农历' + escapeHtml(c.lunarDate) + ' · 生肖' + escapeHtml(c.zodiac) + hourMark + '</div></div>' +
    '<div class="ziwei-chart">' + cells +
    '<div class="ziwei-center"><div class="ziwei-center-row"><span>命主</span><strong>' + escapeHtml(c.mingzhu) + '</strong></div>' +
    '<div class="ziwei-center-row"><span>身主</span><strong>' + escapeHtml(c.shenzhu) + '</strong></div></div>' +
    '</div>';
}

/* ── 十二宫明细 + 大限流年 ── */
function ziweiDetailHTML(c) {
  var mingIdx = 0;
  c.palaces.forEach(function (p, i) { if (p.isMing) mingIdx = i; });
  var rows = '';
  for (var k = 0; k < 12; k++) {
    var p = c.palaces[(mingIdx + k) % 12];
    function nm(list, withBright) {
      return list.map(function (s) {
        return escapeHtml(s.name) + (withBright && s.brightness ? '（' + escapeHtml(s.brightness) + '）' : '') + ziweiHuaBadge(s.mutagen);
      }).join('、');
    }
    var mark = (p.isMing && p.isShen) ? ' <span class="ziwei-mark">命身同宫</span>'
      : p.isMing ? ' <span class="ziwei-mark">命宫</span>'
      : p.isShen ? ' <span class="ziwei-mark">身宫</span>' : '';
    var range = p.decadalRange ? ' <span class="zw-drange">大限' + p.decadalRange[0] + '–' + p.decadalRange[1] + '岁</span>' : '';
    rows += '<div class="zw-drow"><div class="zw-dhead">' + escapeHtml(p.name) + ' ' + escapeHtml(p.gz) + mark + range + '</div>' +
      (p.major.length ? '<div class="zw-dline"><b>主星</b>' + nm(p.major, true) + '</div>' : '<div class="zw-dline"><b>主星</b><span class="zw-empty">空宫，借对宫参看</span></div>') +
      (p.ji.length ? '<div class="zw-dline"><b>吉星</b>' + nm(p.ji, false) + '</div>' : '') +
      (p.sha.length ? '<div class="zw-dline"><b>煞星</b>' + nm(p.sha, false) + '</div>' : '') +
      (p.zayao.length ? '<div class="zw-dline"><b>杂曜</b>' + escapeHtml(p.zayao.map(function (s) { return s.name; }).join('、')) + '</div>' : '') +
      '</div>';
  }
  var horo = '';
  if (c.daxian) {
    var d = c.daxian;
    horo += '<div class="zw-hrow"><span>本限</span>' +
      (d.range ? d.range[0] + '–' + d.range[1] + '岁 · ' : '') + '大限入' + escapeHtml(d.gong) + '（' + escapeHtml(d.gz) + '）</div>' +
      '<div class="zw-hrow"><span>大限四化</span>' + d.sihua.map(function (s) { return escapeHtml(s.star + s.hua); }).join(' · ') + '</div>';
  }
  if (c.liunian) {
    var y = c.liunian;
    horo += '<div class="zw-hrow"><span>流年</span>' + c.year + ' ' + escapeHtml(y.gz) + ' · 流年入' + escapeHtml(y.gong) + '</div>' +
      '<div class="zw-hrow"><span>流年四化</span>' + y.sihua.map(function (s) { return escapeHtml(s.star + s.hua); }).join(' · ') + '</div>';
  }
  if (c.xiaoxian) horo += '<div class="zw-hrow"><span>小限</span>' + c.xiaoxian.age + '岁入' + escapeHtml(c.xiaoxian.gong) + '</div>';
  if (c.liuyue) horo += '<div class="zw-hrow"><span>流月</span>' + escapeHtml(c.liuyue.gz) + '入' + escapeHtml(c.liuyue.gong) + '</div>';
  return (horo ? '<div class="zw-horo">' + horo + '</div>' : '') +
    '<div class="zw-detail"><div class="zw-dtitle">十二宫星曜明细</div>' + rows + '</div>';
}

function ziweiStarSections(c, brief) {
  function palaceByMing() {
    for (var i = 0; i < c.palaces.length; i++) if (c.palaces[i].isMing) return c.palaces[i];
    return c.palaces[0];
  }
  function palaceByShen() {
    for (var i = 0; i < c.palaces.length; i++) if (c.palaces[i].isShen) return c.palaces[i];
    return null;
  }
  function starLine(p, label) {
    var head = '<span class="mbti-sec-label">' + label + '（' + escapeHtml(p.gz) + '）';
    if (!p.major.length) {
      var dui = c.palaces[(c.palaces.indexOf(p) + 6) % 12];
      return '<div class="mbti-sec">' + head + '空宫</span>' +
        '本宫无主星，借对宫' + escapeHtml(dui.name) + '（' + escapeHtml(dui.gz) + '）' +
        escapeHtml(dui.major.map(function (s) { return s.name; }).join('、') || '无主星') + '参看。' +
        (brief ? '' : '<br>' + escapeHtml(dui.major.map(function (s) { return ZIWEI_STAR_TEXT[s.name] || ''; }).join(''))) + '</div>';
    }
    head += escapeHtml(p.major.map(function (s) { return s.name; }).join('、')) + '</span>';
    var body = brief ? '' : escapeHtml(p.major.map(function (s) { return ZIWEI_STAR_TEXT[s.name] || ''; }).join(''));
    var aux = '';
    if (!brief) {
      var items = p.ji.concat(p.sha).filter(function (s) { return ZIWEI_AUX_TEXT[s.name]; });
      if (items.length) aux = '<br>' + escapeHtml(items.map(function (s) { return s.name + '：' + ZIWEI_AUX_TEXT[s.name]; }).join(''));
    }
    return '<div class="mbti-sec">' + head + body + aux + '</div>';
  }
  var mingP = palaceByMing();
  var shenP = palaceByShen();
  var html = starLine(mingP, '命宫') + (shenP && shenP !== mingP ? starLine(shenP, '身宫') : '');
  html += '<div class="mbti-sec"><span class="mbti-sec-label">生年四化</span>' +
    c.sihua.map(function (s) {
      return escapeHtml(s.hua + '：' + s.star + '（' + s.gong + '）') + (brief ? '' : '——' + escapeHtml(ZIWEI_HUA_TEXT[s.hua] || ''));
    }).join('<br>') + '</div>';
  if (!brief && c.daxian) {
    var d = c.daxian;
    html += '<div class="mbti-sec"><span class="mbti-sec-label">大限 · 流年</span>' +
      '今行大限' + (d.range ? d.range[0] + '–' + d.range[1] + '岁' : '') + '入' + escapeHtml(d.gong) + '（' + escapeHtml(d.gz) + '），' +
      '大限四化' + escapeHtml(d.sihua.map(function (s) { return s.star + s.hua; }).join('、')) + '。' +
      (c.liunian ? '流年' + c.year + escapeHtml(c.liunian.gz) + '入' + escapeHtml(c.liunian.gong) + '，' +
        '流年四化' + escapeHtml(c.liunian.sihua.map(function (s) { return s.star + s.hua; }).join('、')) + '。' : '') +
      '运限所至，吉凶参看所入宫位星曜。</div>';
  }
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
  var brief = type !== 'sheng';
  var html = ziweiChartHTML(c) + ziweiDetailHTML(c) + ziweiStarSections(c, brief);
  if (type === 'sheng') {
    html += '<div class="mbti-brief-note">聖筊既定，命盘详示如上。星曜指引方向，行止仍在人为。</div>';
  } else {
    html += '<div class="mbti-brief-note">笑筊略示：命身宫与四化如上，细处未明，可再诚心一问。</div>';
  }
  reportEl.innerHTML = html;
  try {
    if (typeof saveReportHTML === 'function') saveReportHTML('yumiao_report_ziwei_v2', '紫微斗数', 'ziweiReport');
  } catch (_) {}
}
