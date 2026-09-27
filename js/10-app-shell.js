/* ============================================================
   御猫灵局 v2.0 · 应用外壳
   底部导航 / 新手引导 / 每日一签 / 生辰档案 / 分享 / 设置
   引擎逻辑（01–09）保持不动，本文件只做表现层编排。
   ============================================================ */
(function () {
  'use strict';

  var LS_ONBOARDED = 'yumiao_onboarded_v1';
  var LS_BIRTH = 'yumiao_shared_birth_v1';
  var LS_SOUND = 'yumiao_sound_v1';
  var LS_DAILY = 'yumiao_daily_v1';

  function $(id) { return document.getElementById(id); }
  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ── Toast ── */
  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  window.toast = toast;

  /* ── 底部导航 ── */
  function switchTab(name) {
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('on', v.id === 'view-' + name);
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('on', t.dataset.tab === name);
    });
    var views = $('views');
    if (views) views.scrollTop = 0;
    window.scrollTo(0, 0);
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (_) {}
  }
  window.switchTab = switchTab;

  /* ── 音效开关（包裹 01 的播放函数） ── */
  function soundOn() {
    try { return localStorage.getItem(LS_SOUND) !== 'off'; } catch (_) { return true; }
  }
  function wrapSound() {
    ['playBell', 'playQing', 'playZhong', 'playJiaoLand'].forEach(function (n) {
      if (typeof window[n] !== 'function' || window[n]._yumiaoWrapped) return;
      var orig = window[n];
      var wrapped = function () {
        if (!soundOn()) return;
        return orig.apply(window, arguments);
      };
      wrapped._yumiaoWrapped = true;
      window[n] = wrapped;
    });
  }
  function refreshSoundUI() {
    var on = soundOn();
    var sw = $('soundSwitch');
    var st = $('soundState');
    if (sw) sw.classList.toggle('on', on);
    if (st) st.textContent = on ? '已开启' : '已关闭';
  }
  window.toggleSound = function () {
    try { localStorage.setItem(LS_SOUND, soundOn() ? 'off' : 'on'); } catch (_) {}
    refreshSoundUI();
    toast(soundOn() ? '仪式音效已开启' : '仪式音效已关闭');
  };

  /* ── 瑞兽：标签同步 + 去 emoji 文案 ── */
  var BEAST_NAMES = { dragon: '唤醒天龙', tiger: '平定四方', lion: '瑞兽祈福' };
  function syncBeastLabels() {
    var active = document.querySelector('.jade-zone.active');
    var key = active ? active.dataset.beast : null;
    document.querySelectorAll('.beast-labels button').forEach(function (b) {
      b.classList.toggle('picked', b.dataset.beast === key);
    });
  }
  window.selectBeastLabel = function (beast) {
    var z = document.querySelector('.jade-zone[data-beast="' + beast + '"]');
    if (z && typeof window.selectBeast === 'function') window.selectBeast(z);
  };
  function patchBeastText() {
    if (typeof window.selectBeast !== 'function' || window.selectBeast._yumiaoPatched) return;
    var origSelect = window.selectBeast;
    window.selectBeast = function (el) {
      origSelect(el);
      var line = $('selectedLine');
      if (!line) return;
      var active = document.querySelector('.jade-zone.active');
      if (active && BEAST_NAMES[active.dataset.beast]) {
        line.innerHTML = '已请 <span>' + BEAST_NAMES[active.dataset.beast] + '</span> 护法';
      } else {
        line.textContent = '轻触瑞兽请护法，不选则随机';
      }
      syncBeastLabels();
    };
    window.selectBeast._yumiaoPatched = true;
    if (typeof window.resetAll === 'function' && !window.resetAll._yumiaoPatched) {
      var origReset = window.resetAll;
      window.resetAll = function () {
        origReset();
        var line = $('selectedLine');
        if (line) line.textContent = '轻触瑞兽请护法，不选则随机';
        syncBeastLabels();
        document.querySelectorAll('.mchip').forEach(function (c, i) {
          c.classList.toggle('on', i === 0);
        });
      };
      window.resetAll._yumiaoPatched = true;
    }
  }

  /* ── 问卜方式 chips ── */
  window.pickMethod = function (m, el) {
    document.querySelectorAll('.mchip').forEach(function (c) { c.classList.remove('on'); });
    if (el) el.classList.add('on');
    if (typeof window.selectQuestionMenuItem === 'function') {
      window.selectQuestionMenuItem(m);
    }
    if (m === 'manual') {
      setTimeout(function () {
        var q = $('question');
        if (q) q.focus();
      }, 120);
    }
  };
  window.openCasualFromDiscover = function () {
    switchTab('divine');
    setTimeout(function () {
      if (typeof window.selectQuestionMenuItem === 'function') window.selectQuestionMenuItem('casual');
    }, 320);
  };

  /* ── 生辰档案 ── */
  var CITY_PRESETS = {
    shenyang: { tz: 8, lng: 123.4, lat: 41.8, tzName: 'Asia/Shanghai', label: '沈阳' },
    toronto: { tz: -5, lng: -79.4, lat: 43.7, tzName: 'America/Toronto', label: '多伦多' }
  };
  function readBirth() {
    try { return JSON.parse(localStorage.getItem(LS_BIRTH) || 'null'); } catch (_) { return null; }
  }
  function saveBirth(obj) {
    try { localStorage.setItem(LS_BIRTH, JSON.stringify(obj)); } catch (_) {}
    renderProfile();
  }
  function birthLabel(b) {
    if (!b || !b.year) return '尚未录入';
    var city = (b.city && CITY_PRESETS[b.city]) ? CITY_PRESETS[b.city].label : '其他城市';
    var t = (b.hour != null && b.hour !== '') ? ' ' + b.hour + '时' + (b.minute ? b.minute + '分' : '') : '';
    return b.year + '年' + b.month + '月' + b.day + '日' + t + ' · ' + city;
  }
  function renderProfile() {
    var label = birthLabel(readBirth());
    ['profileSummary', 'profileSummaryMe'].forEach(function (id) {
      var el = $(id);
      if (el) el.textContent = label;
    });
  }
  window.renderProfile = renderProfile;
  window.getBirthProfile = function () { return readBirth(); };

  /* ── 统一生辰档案条：各命盘面板共用，一次录入、处处可用 ── */
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  window.renderProfileBar = function (elId, opts) {
    var el = typeof elId === 'string' ? $(elId) : elId;
    if (!el) return;
    opts = opts || {};
    el.setAttribute('data-bar', '1');
    try { el.setAttribute('data-bar-opts', JSON.stringify(opts)); } catch (_) {}
    var b = readBirth();
    if (!b || !b.year) {
      el.innerHTML = '<div class="profile-empty"><p>尚未录入生辰档案<br>录入一次，八字 · 星座 · 星盘皆可共用</p>' +
        '<button type="button" class="btn-gold btn-sm" onclick="editProfile()">录入生辰档案</button></div>';
      return;
    }
    var sexLabel = b.sex === 'F' ? '女' : '男';
    var cityLabel = (b.city && CITY_PRESETS[b.city]) ? CITY_PRESETS[b.city].label : '其他城市';
    var t = (b.hour != null && b.hour !== '') ? ' ' + b.hour + '时' + (b.minute ? b.minute + '分' : '') : '';
    var sub = sexLabel + ' · ' + cityLabel + ' · 时区' + (b.tzOffset >= 0 ? '+' : '') + b.tzOffset;
    var extraText = opts.extra || '';
    if (!extraText && opts.extraFn && typeof window[opts.extraFn] === 'function') {
      try { extraText = window[opts.extraFn]() || ''; } catch (_) { extraText = ''; }
    }
    var extra = extraText ? '<div class="pb-extra">' + escHtml(extraText) + '</div>' : '';
    el.innerHTML = '<div class="pb-info"><div class="pb-kicker">生辰档案</div>' +
      '<div class="pb-text">' + escHtml(b.year + '年' + b.month + '月' + b.day + '日' + t) + '</div>' +
      '<div class="pb-sub">' + escHtml(sub) + '</div>' + extra + '</div>' +
      '<button type="button" class="btn-ghost btn-sm" onclick="editProfile()">更换</button>';
  };
  window.refreshProfileBars = function () {
    document.querySelectorAll('.profile-bar[data-bar]').forEach(function (el) {
      var opts = {};
      try { opts = JSON.parse(el.getAttribute('data-bar-opts') || '{}'); } catch (_) {}
      window.renderProfileBar(el, opts);
    });
  };
  var _origSaveBirth = saveBirth;
  saveBirth = function (obj) {
    _origSaveBirth(obj);
    try { window.refreshProfileBars(); } catch (_) {}
  };

  /* ── 新手引导 ── */
  var obStep = 0;
  function segVal(id) {
    var el = $(id);
    var on = el ? el.querySelector('button.on') : null;
    return on ? on.dataset.v : null;
  }
  function bindSeg(id) {
    var el = $(id);
    if (!el || el._bound) return;
    el._bound = true;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      el.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      if (id === 'obCity') {
        var isOther = b.dataset.v === 'other';
        var tzRow = $('obTzRow');
        var geoRow = $('obGeoRow');
        if (tzRow) tzRow.hidden = !isOther;
        if (geoRow) geoRow.hidden = !isOther;
      }
    });
  }
  function showObStep(n) {
    obStep = n;
    var slides = document.querySelectorAll('.ob-slide');
    slides.forEach(function (s, i) { s.classList.toggle('on', i === n); });
    document.querySelectorAll('#obDots span').forEach(function (d, i) { d.classList.toggle('on', i === n); });
    var profile = $('obProfile');
    var dots = $('obDots');
    var next = $('obNext');
    if (n >= slides.length) {
      slides.forEach(function (s) { s.classList.remove('on'); });
      if (dots) dots.style.display = 'none';
      if (profile) profile.hidden = false;
      if (next) next.textContent = '开始使用';
    } else {
      if (dots) dots.style.display = '';
      if (profile) profile.hidden = true;
      if (next) next.textContent = '继续';
    }
  }
  function finishOnboard() {
    try { localStorage.setItem(LS_ONBOARDED, '1'); } catch (_) {}
    var ob = $('onboard');
    if (ob) ob.classList.remove('show');
    setTimeout(function () { if (ob) ob.setAttribute('aria-hidden', 'true'); }, 450);
  }
  function collectProfile() {
    var d = ($('obDate') || {}).value || '';
    var t = ($('obTime') || {}).value || '';
    if (!d) { toast('请选择出生日期'); return null; }
    var parts = d.split('-');
    var tp = t ? t.split(':') : ['12', '00'];
    var city = segVal('obCity') || 'toronto';
    var preset = CITY_PRESETS[city];
    var tz = preset ? preset.tz : (parseFloat(($('obTz') || {}).value) || 0);
    var lat = preset ? preset.lat : (parseFloat(($('obLat') || {}).value) || null);
    var lng = preset ? preset.lng : (parseFloat(($('obLng') || {}).value) || null);
    return {
      year: +parts[0], month: +parts[1], day: +parts[2],
      hour: tp[0] === '' ? 12 : +tp[0], minute: tp[1] === '' ? 0 : +tp[1],
      tzOffset: tz, tzName: preset ? preset.tzName : undefined,
      lat: lat, lng: lng, city: city,
      sex: segVal('obSex') || 'M'
    };
  }
  window.editProfile = function () {
    var ob = $('onboard');
    if (!ob) return;
    /* 预填已有档案 */
    var b = readBirth();
    if (b) {
      var pad = function (x) { return String(x).padStart(2, '0'); };
      var dEl = $('obDate');
      if (dEl && b.year) dEl.value = b.year + '-' + pad(b.month) + '-' + pad(b.day);
      var tEl = $('obTime');
      if (tEl && b.hour != null) tEl.value = pad(b.hour) + ':' + pad(b.minute || 0);
      [['obSex', b.sex || 'M'], ['obCity', b.city || 'toronto']].forEach(function (pair) {
        var seg = $(pair[0]);
        if (seg) seg.querySelectorAll('button').forEach(function (x) {
          x.classList.toggle('on', x.dataset.v === pair[1]);
        });
      });
      var tzRow = $('obTzRow');
      var geoRow = $('obGeoRow');
      var isOther = (b.city || 'toronto') === 'other';
      if (tzRow) tzRow.hidden = !isOther;
      if (geoRow) geoRow.hidden = !isOther;
      if ($('obTz') && b.tzOffset != null) $('obTz').value = b.tzOffset;
      if ($('obLat') && b.lat != null) $('obLat').value = b.lat;
      if ($('obLng') && b.lng != null) $('obLng').value = b.lng;
    }
    ob.setAttribute('aria-hidden', 'false');
    ob.classList.add('show');
    showObStep(99);
  };
  function initOnboard() {
    bindSeg('obSex'); bindSeg('obCity');
    var next = $('obNext'), skip = $('obSkip');
    if (next) next.addEventListener('click', function () {
      var slides = document.querySelectorAll('.ob-slide');
      if (obStep < slides.length) { showObStep(obStep + 1); return; }
      var b = collectProfile();
      if (!b) return;
      saveBirth(b);
      finishOnboard();
      toast('生辰档案已保存');
    });
    if (skip) skip.addEventListener('click', finishOnboard);
    var done = false;
    try { done = localStorage.getItem(LS_ONBOARDED) === '1'; } catch (_) {}
    if (!done) {
      var ob = $('onboard');
      showObStep(0);
      setTimeout(function () {
        ob.setAttribute('aria-hidden', 'false');
        ob.classList.add('show');
      }, 1400);
    }
  }

  /* ══════════ 每日一签 ══════════ */
  var VERSES = [
    { v: '云开雾散月重明\n一洗尘埃万里清\n前程自有通衢路\n莫向歧途问姓名', y: '守正待时，吉自天来', yi: '出行 洽谈', ji: '急躁 口舌', c: '金黄', n: '8' },
    { v: '一枝新绿破春寒\n莫道前途多险滩\n贵人暗中相指引\n秋来果熟满庭欢', y: '先难后易，贵人暗助', yi: '求学 结交', ji: '投机 远行', c: '青绿', n: '3' },
    { v: '静水深流最有情\n不争不抢自安宁\n家中和气财源聚\n笑看浮云过太清', y: '以静制动，家和事兴', yi: '守成 团聚', ji: '争执 借贷', c: '墨蓝', n: '6' },
    { v: '马蹄得意过长安\n春风十里尽开颜\n此去前程多锦绣\n珍惜当下莫等闲', y: '顺风顺水，宜进取', yi: '开业 签约', ji: '懈怠 拖延', c: '朱红', n: '9' },
    { v: '山重水复疑无路\n柳暗花明又一村\n转机只在方寸间\n回首方知步步春', y: '困境将解，转机在即', yi: '坚持 复盘', ji: '放弃 转向', c: '黛青', n: '4' },
    { v: '明月松间照\n清泉石上流\n心安即是福\n何必觅封侯', y: '知足常乐，身心俱安', yi: '休养 读书', ji: '攀比 熬夜', c: '月白', n: '7' },
    { v: '宝剑锋从磨砺出\n梅花香自苦寒来\n今日辛勤今日事\n他年回首笑颜开', y: '勤勉有报，厚积薄发', yi: '学习 锻炼', ji: '取巧 抱怨', c: '玄黑', n: '1' },
    { v: '和气能交天下友\n和气能生万里财\n邻里亲朋多欢喜\n笑声常伴福门开', y: '人和为贵，财喜临门', yi: '社交 合作', ji: '独断 冷战', c: '橙黄', n: '2' },
    { v: '大鹏一日同风起\n扶摇直上九万里\n胸怀壮志凌云志\n正是乘风好时机', y: '大展宏图，时不我待', yi: '创业 远行', ji: '畏缩 犹豫', c: '天青', n: '5' },
    { v: '细雨润无声\n春耕正当时\n播下三分种\n秋收万担粮', y: '耕耘在当下，收获在后', yi: '计划 储蓄', ji: '空谈 透支', c: '土黄', n: '10' },
    { v: '孤灯照夜读\n万卷解千愁\n腹有诗书气\n前程不用忧', y: '学识为底气，静待花开', yi: '考试 进修', ji: '浮躁 分心', c: '藏青', n: '12' },
    { v: '桃花春水生\n渔舟唱晚晴\n随缘随分过\n自在又安宁', y: '随缘自适，勿强求', yi: '旅行 交友', ji: '执念 强求', c: '粉白', n: '11' },
    { v: '金鳞岂是池中物\n一遇风云便化龙\n蛰伏只为腾飞日\n莫笑今朝未遇风', y: '潜龙在渊，待时而动', yi: '蓄力 筹备', ji: '冒进 炫耀', c: '石青', n: '16' },
    { v: '家有梧桐树\n引得凤凰来\n积善之家庆\n福禄自然排', y: '积善之家，必有余庆', yi: '行善 孝亲', ji: '刻薄 失信', c: '赭石', n: '18' },
    { v: '行到水穷处\n坐看云起时\n进退皆自在\n何须问东西', y: '进退有度，豁达为上', yi: '思考 独处', ji: '纠结 内耗', c: '灰白', n: '20' },
    { v: '一元复始万象新\n旭日初升照乾坤\n抖擞精神从头越\n好运连连伴君行', y: '新机初现，宜开新局', yi: '立志 启程', ji: '守旧 迟疑', c: '大红', n: '22' },
      { v: '蛟龙得云雨\n终非池中物\n一朝雷雨至\n腾空万里途', y: '潜龙待时，一飞冲天', yi: '谋划 蓄势', ji: '轻举妄动', c: '玄青', n: '1' },
    { v: '月到中天分外明\n人逢喜事精神爽\n前程锦绣君须记\n守得云开见月明', y: '否极泰来，好运将至', yi: '庆祝 分享', ji: '得意忘形', c: '银白', n: '6' },
    { v: '野火烧不尽\n春风吹又生\n百折终不挠\n青山依旧青', y: '坚韧不拔，终有所成', yi: '坚持 复起', ji: '半途而废', c: '苍绿', n: '3' },
    { v: '不须频问卜\n吉凶自有天\n但行方寸善\n福至不须言', y: '行善积德，福报自来', yi: '行善 助人', ji: '算计 机心', c: '米白', n: '7' },
    { v: '千淘万漉虽辛苦\n吹尽狂沙始到金\n莫嫌今日多磨难\n他日回看是甘霖', y: '历练即财富，坚持见真金', yi: '打磨 沉淀', ji: '抱怨 逃避', c: '赭石', n: '8' },
    { v: '海上生明月\n天涯共此时\n相思千里共\n好梦莫蹉跎', y: '情缘牵系，宜主动联络', yi: '团聚 表白', ji: '冷战 疏远', c: '月白', n: '2' },
    { v: '会当凌绝顶\n一览众山小\n登高方望远\n心大量自宽', y: '站高望远，格局打开', yi: '规划 登高', ji: '斤斤计较', c: '天青', n: '9' },
    { v: '纸上得来终觉浅\n绝知此事要躬行\n莫将书卷空谈笑\n一步一印始为真', y: '重在实践，知行合一', yi: '实干 动手', ji: '空谈 拖延', c: '黛蓝', n: '5' },
    { v: '采菊东篱下\n悠然见南山\n心远地自偏\n何须觅神仙', y: '淡泊明志，内心丰盈', yi: '独处 品茶', ji: '攀比 内卷', c: '竹青', n: '4' },
    { v: '长风破浪会有时\n直挂云帆济沧海\n莫道前路多风浪\n敢向潮头立潮头', y: '勇往直前，大有可为', yi: '开拓 尝试', ji: '退缩 观望', c: '海蓝', n: '11' },
    { v: '近水楼台先得月\n向阳花木易为春\n占得先机须努力\n莫负良辰与好春', y: '近水楼台，宜把握先机', yi: '争取 靠前', ji: '谦让过度', c: '桃红', n: '12' },
    { v: '梅须逊雪三分白\n雪却输梅一段香\n人各有长须自重\n莫将短处比人长', y: '发挥所长，勿妄自菲薄', yi: '展示 坚持自我', ji: '自卑 比较', c: '雪青', n: '10' },
    { v: '旧垒新巢各自安\n世事无常君莫叹\n随缘便是好生涯\n一笑风云过眼看', y: '世事变迁，随缘安住', yi: '接纳 放下', ji: '执念 怀旧', c: '灰蓝', n: '13' },
    { v: '两岸猿声啼不住\n轻舟已过万重山\n烦恼本是过眼云\n一笑释然天地宽', y: '烦恼将散，豁然开朗', yi: '出行 放松', ji: '钻牛角尖', c: '晴蓝', n: '14' },
];
  function daySeed() {
    var d = new Date();
    return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function getDaily() {
    var idx = daySeed() % VERSES.length;
    var verse = VERSES[idx];
    var drawn = false;
    try {
      var saved = JSON.parse(localStorage.getItem(LS_DAILY) || 'null');
      drawn = !!(saved && saved.date === todayKey());
    } catch (_) {}
    return { idx: idx, verse: verse, drawn: drawn };
  }
  function markDrawn(idx) {
    try { localStorage.setItem(LS_DAILY, JSON.stringify({ date: todayKey(), idx: idx })); } catch (_) {}
  }
  function renderDailyCard() {
    var d = getDaily();
    var kicker = $('dailyKicker');
    var verseEl = $('dailyVerse');
    var btn = $('dailyDrawBtn');
    if (!kicker || !verseEl || !btn) return;
    var dt = new Date();
    kicker.textContent = (dt.getMonth() + 1) + '月' + dt.getDate() + '日 · ' + '星期' + '日一二三四五六'.charAt(dt.getDay());
    if (d.drawn) {
      verseEl.textContent = d.verse.v.split('\n').slice(0, 2).join('，');
      btn.textContent = '查看';
    } else {
      verseEl.textContent = '抽一支今日之签，观宜忌吉凶';
      btn.textContent = '抽签';
    }
  }
  function openDailySheet() {
    var d = getDaily();
    markDrawn(d.idx);
    renderDailyCard();
    var dt = new Date();
    var dateEl = $('dailyDate');
    if (dateEl) dateEl.textContent = dt.getFullYear() + ' 年 ' + (dt.getMonth() + 1) + ' 月 ' + dt.getDate() + ' 日';
    var vf = $('dailyVerseFull');
    if (vf) vf.innerHTML = d.verse.v.split('\n').map(function (l) { return '<div>' + l + '</div>'; }).join('');
    var meta = $('dailyMeta');
    if (meta) {
      meta.innerHTML =
        '<span>解曰 <b>' + d.verse.y + '</b></span>' +
        '<span>宜 <b>' + d.verse.yi + '</b></span>' +
        '<span>忌 <b>' + d.verse.ji + '</b></span>' +
        '<span>吉色 <b>' + d.verse.c + '</b></span>' +
        '<span>吉数 <b>' + d.verse.n + '</b></span>';
    }
    openSheet('dailySheet', 'dailyBackdrop');
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
  }
  window.openDailySheet = openDailySheet;
  window.closeDailySheet = function () { closeSheet('dailySheet', 'dailyBackdrop'); };

  /* ── 通用抽屉开关 ── */
  function lockScroll(on) {
    document.documentElement.classList.toggle('scroll-locked', !!on);
  }
  function openSheet(modalId, backdropId) {
    var m = $(modalId), b = $(backdropId);
    if (m) m.classList.add('show');
    if (b) b.classList.add('show');
    lockScroll(true);
  }
  function closeSheet(modalId, backdropId) {
    var m = $(modalId), b = $(backdropId);
    if (m) m.classList.remove('show');
    if (b) b.classList.remove('show');
    lockScroll(false);
  }
  window.openMemberSheet = function () { openSheet('memberSheet', 'memberBackdrop'); };
  window.closeMemberSheet = function () { closeSheet('memberSheet', 'memberBackdrop'); };
  window.memberSoon = function () { toast('会员功能开发中，当前版本全部免费'); };
  window.openDisclaimer = function () { openSheet('disclaimerSheet', 'disclaimerBackdrop'); };
  window.closeDisclaimer = function () { closeSheet('disclaimerSheet', 'disclaimerBackdrop'); };

  /* ── 分享：问卜结果卡片 ── */
  function wrapText(ctx, text, maxW) {
    var lines = [], cur = '';
    for (var i = 0; i < text.length; i++) {
      var t = cur + text[i];
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = text[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawShareCard(title, body, foot, done) {
    var W = 750, H = 1180;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#14110b'; ctx.fillRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(201,162,39,.14)'); g.addColorStop(.4, 'rgba(201,162,39,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.strokeStyle = 'rgba(201,162,39,.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(44, 44, W - 88, H - 88);
    var img = new Image();
    img.onload = function () {
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, 210, 78, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, W / 2 - 78, 132, 156, 156);
      ctx.restore();
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W / 2, 210, 78, 0, Math.PI * 2); ctx.stroke();
      finish();
    };
    img.onerror = finish;
    img.src = 'pics/seal.webp';
    var finished = false;
    function finish() {
      if (finished) return; finished = true;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f3ead3';
      ctx.font = '700 44px "Noto Serif SC", serif';
      ctx.fillText('御猫灵局', W / 2, 350);
      ctx.fillStyle = '#a8853f'; ctx.font = '400 22px "Noto Sans SC", sans-serif';
      ctx.fillText('掷 筊 问 卜', W / 2, 388);
      ctx.fillStyle = 'rgba(201,162,39,.5)'; ctx.fillRect(W / 2 - 60, 414, 120, 1);
      ctx.fillStyle = '#e8c766'; ctx.font = '700 52px "Noto Serif SC", serif';
      ctx.fillText(title || '签文', W / 2, 500);
      ctx.fillStyle = '#d8c9a8'; ctx.font = '400 27px "Noto Serif SC", serif';
      ctx.textAlign = 'left';
      var lines = wrapText(ctx, (body || '').replace(/\s+/g, ''), W - 200);
      var y = 580;
      lines.slice(0, 14).forEach(function (l) { ctx.fillText(l, 100, y); y += 48; });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#6e6046'; ctx.font = '400 22px "Noto Sans SC", sans-serif';
      var dt = new Date();
      ctx.fillText((foot || '') + ' · ' + dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate(), W / 2, H - 120);
      ctx.fillStyle = '#9a8a68';
      ctx.fillText('签文仅供娱乐 · 御猫灵局', W / 2, H - 82);
      done(cv);
    }
  }
  function downloadCanvas(cv, name) {
    var a = document.createElement('a');
    a.download = name;
    a.href = cv.toDataURL('image/png');
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 400);
  }
  function saveCanvas(cv, name) {
    /* iOS Safari 对 <a download> 支持不稳定：优先 Web Share，失败再回退下载 */
    try {
      if (cv.toBlob) {
        cv.toBlob(function (blob) {
          if (!blob) { downloadCanvas(cv, name); return; }
          var file = null;
          try { file = new File([blob], name, { type: 'image/png' }); } catch (_) {}
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: '御猫灵局' }).catch(function () {
              downloadCanvas(cv, name);
            });
            return;
          }
          downloadCanvas(cv, name);
        }, 'image/png');
        return;
      }
    } catch (_) {}
    downloadCanvas(cv, name);
  }
  window.shareReading = function () {
    var title = ($('resultTitle') || {}).textContent || '问卜';
    var desc = ($('resultDesc') || {}).innerText || '';
    var beast = ($('resultBeast') || {}).textContent || '';
    if (!desc) { toast('尚无签文可分享'); return; }
    toast('正在生成签文卡…');
    drawShareCard(title.trim(), desc.trim(), beast.trim(), function (cv) {
      saveCanvas(cv, '御猫灵局-签文.png');
      toast('签文卡已保存');
    });
  };
  window.shareDaily = function () {
    var d = getDaily();
    drawShareCard('每日一签', d.verse.v.replace(/\n/g, '') + '。' + d.verse.y + '。宜' + d.verse.yi + '，忌' + d.verse.ji + '。', '', function (cv) {
      saveCanvas(cv, '御猫灵局-每日签.png');
      toast('今日签卡已保存');
    });
  };

  /* ── 结果出现后显示操作按钮 ── */
  function watchResult() {
    var t = $('resultTitle');
    if (!t) return;
    var mo = new MutationObserver(function () {
      var has = !!(t.textContent && t.textContent.trim());
      var ra = $('resultActions');
      if (ra) ra.hidden = !has;
    });
    mo.observe(t, { childList: true, characterData: true, subtree: true });
  }

  /* ── 清除数据 ── */
  var clearArmed = false, clearTimer = null;
  window.clearAllData = function () {
    if (!clearArmed) {
      clearArmed = true;
      toast('再次点击确认清除本机全部数据');
      clearTimer = setTimeout(function () { clearArmed = false; }, 3000);
      return;
    }
    clearTimeout(clearTimer); clearArmed = false;
    try { localStorage.clear(); } catch (_) {}
    toast('已清除，页面即将刷新');
    setTimeout(function () { location.reload(); }, 900);
  };

  /* ── 启动 ── */
  onReady(function () {
    wrapSound();
    refreshSoundUI();
    patchBeastText();
    renderProfile();
    renderDailyCard();
    watchResult();
    initOnboard();
    var qEl = $('question');
    if (qEl && !qEl._menuBound) {
      qEl._menuBound = true;
      /* 空问题框被点选时，直接展开问卜方式菜单 */
      qEl.addEventListener('click', function () {
        if (qEl.readOnly && !qEl.value && typeof window.showMainMenu === 'function') window.showMainMenu();
      });
    }
    var dd = $('dailyDrawBtn');
    if (dd) dd.addEventListener('click', openDailySheet);
    var td = $('topbarDaily');
    if (td) td.addEventListener('click', openDailySheet);
    /* 开屏 */
    setTimeout(function () {
      var sp = $('splash');
      if (sp) sp.classList.add('gone');
      setTimeout(function () { if (sp) sp.remove(); }, 800);
    }, 1100);
    /* ESC 关闭本壳抽屉 */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      /* 只关本壳的三张抽屉；模块弹窗走各自的关闭逻辑 */
      [['dailySheet', 'dailyBackdrop'], ['memberSheet', 'memberBackdrop'], ['disclaimerSheet', 'disclaimerBackdrop']].forEach(function (pair) {
        var s = $(pair[0]), b = $(pair[1]);
        if (s && s.classList.contains('show')) { s.classList.remove('show'); }
        if (b && b.classList.contains('show')) { b.classList.remove('show'); }
      });
      lockScroll(false);
    });
  });
})();
