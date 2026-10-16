// ============================================================
// 称骨算命：农历换算 + 年月日时骨重 + 骨重大意
// 生辰一律读取共用档案 yumiao_shared_birth_v1（与八字/星座/星盘同一份）
// ============================================================
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var BIRTH_KEY = 'yumiao_shared_birth_v1';

  /* ── 农历表 1900–2100：bit16=闰月大小，bit15..4=1~12月大小，低4位=闰哪个月 ── */
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
  window.__solarToLunar = solarToLunar;

  /* ── 骨重表（单位：钱） ── */
  var GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
  var YEAR_W = [12,9,6,7,12,5,9,8,7,8, 15,9,16,8,8,19,12,6,8,7, 5,15,6,16,15,7,9,12,10,7,
                15,6,5,14,14,9,7,7,9,12, 8,7,13,5,14,5,9,17,5,7, 12,8,8,6,19,6,8,16,10,6];
  var MONTH_W = [6,7,18,9,5,16,9,15,18,8,9,5];
  var DAY_W = [5,10,8,15,16,15,8,16,8,16, 9,17,8,17,10,8,9,18,5,15, 10,9,8,9,15,18,7,8,16,6];
  var HOUR_W = [16,6,7,10,9,16,10,8,8,9,6,6];
  var MONTH_N = ['正','二','三','四','五','六','七','八','九','十','十一','十二'];
  var DAY_N = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
  var HOUR_RANGE = ['23:00–00:59','01:00–02:59','03:00–04:59','05:00–06:59','07:00–08:59','09:00–10:59','11:00–12:59','13:00–14:59','15:00–16:59','17:00–18:59','19:00–20:59','21:00–22:59'];

  function ganzhi(y) { var i = ((y - 4) % 60 + 60) % 60; return { idx: i, name: GAN[i % 10] + ZHI[i % 12] }; }
  function fmt(q) { return Math.floor(q / 10) + '两' + (q % 10 ? (q % 10) + '钱' : ''); }

  /* ── 读取共用生辰 ── */
  function readBirth() {
    try { return JSON.parse(localStorage.getItem(BIRTH_KEY) || 'null'); } catch (_) { return null; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── 核心计算 ── */
  function calc(b) {
    var y = +b.year, m = +b.month, d = +b.day;
    var h = (b.hour == null || b.hour === '') ? 12 : +b.hour;
    if (![y, m, d, h].every(isFinite)) return { error: '生辰档案不完整，请点「更换」重新录入。' };
    var lu = solarToLunar(y, m, d);
    if (!lu) return { error: '农历换算范围为 1900–2100 年，请检查生辰档案。' };
    var gz = ganzhi(lu.year);
    var hi = Math.floor((h + 1) / 2) % 12;
    var yw = YEAR_W[gz.idx], mw = MONTH_W[lu.month - 1], dw = DAY_W[lu.day - 1], hw = HOUR_W[hi];
    var total = yw + mw + dw + hw;
    return {
      lunar: lu, gz: gz.name, hourName: ZHI[hi], hourRange: HOUR_RANGE[hi],
      hourDefault: (b.hour == null || b.hour === ''),
      yw: yw, mw: mw, dw: dw, hw: hw, total: total,
      lunarText: lu.year + '年（' + gz.name + '）' + (lu.leap ? '闰' : '') + MONTH_N[lu.month - 1] + '月' + DAY_N[lu.day - 1]
    };
  }
  window.__chengguCalc = calc;

  /* 批语：原文在 11a，今用在 11b；键 = 骨重（钱） */
  function verseHtml(r) {
    var v = window.CHENGGU_VERSES && window.CHENGGU_VERSES[r.total];
    if (!v) return '';
    var m = window.CHENGGU_MODERN && window.CHENGGU_MODERN[r.total];
    var h = '<div class="cg-verse"><span class="cg-kicker">原文</span><p class="cg-orig">' +
      esc(v).replace(/\n/g, '<br>') + '</p>';
    if (m) {
      h += '<span class="cg-kicker cg-sub">今用</span><p>' + esc(m) + '</p>';
    }
    return h + '</div>';
  }

  /* ── 渲染 ── */
  function render() {
    var box = $('chengguResult');
    if (!box) return;
    var b = readBirth();
    if (!b || !b.year || !b.month || !b.day) {
      box.innerHTML = '<p class="cg-hint">还没有生辰档案。录入一次，八字、星座、星盘、称骨都会共用。</p>';
      return;
    }
    var r = calc(b);
    if (r.error) { box.innerHTML = '<p class="cg-hint">' + esc(r.error) + '</p>'; return; }
    var rows = [
      ['年', r.gz + '年', r.yw],
      ['月', (r.lunar.leap ? '闰' : '') + MONTH_N[r.lunar.month - 1] + '月', r.mw],
      ['日', DAY_N[r.lunar.day - 1], r.dw],
      ['时', r.hourName + '时 · ' + r.hourRange, r.hw]
    ];
    box.innerHTML =
      '<div class="cg-weight"><span class="cg-kicker">骨重</span><strong>' + fmt(r.total) + '</strong></div>' +
      '<p class="cg-lunar">农历 ' + esc(r.lunarText) + '</p>' +
      '<table class="cg-table"><tbody>' +
      rows.map(function (x) { return '<tr><th>' + x[0] + '</th><td>' + esc(x[1]) + '</td><td>' + fmt(x[2]) + '</td></tr>'; }).join('') +
      '<tr class="cg-sum"><th>合</th><td></td><td>' + fmt(r.total) + '</td></tr></tbody></table>' +
      verseHtml(r) +
      (r.hourDefault ? '<p class="cg-note">档案里没有出生时间，时辰暂按午时计算。</p>' : '') +
      '<p class="cg-note">称骨算命是流传民间的传统玩法，仅供娱乐参考。</p>';
  }

  /* ── 自带样式与弹窗 DOM（不依赖 index.html / style.css 里的称骨代码） ── */
  var CSS = [
    '.cg-result{padding-bottom:8px}',
    '.cg-hint{font-size:var(--fs-sm);color:var(--muted);text-align:center;line-height:1.8;padding:18px 0}',
    '.cg-weight{display:flex;flex-direction:column;align-items:center;gap:4px;padding:16px 0 6px}',
    '.cg-kicker{font-size:var(--fs-xs);letter-spacing:3px;color:var(--faint)}',
    '.cg-weight strong{font-family:var(--serif);font-size:var(--fs-2xl);font-weight:600;color:var(--gold-bright);letter-spacing:4px}',
    '.cg-lunar{text-align:center;font-size:var(--fs-sm);color:var(--cream-dim);margin:6px 0 12px;letter-spacing:1px}',
    '.cg-table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);overflow:hidden}',
    '.cg-table th,.cg-table td{padding:10px 12px;font-size:var(--fs-sm);color:var(--cream);border-bottom:1px solid var(--line-soft);text-align:left}',
    '.cg-table th{width:44px;color:var(--gold-soft);font-weight:400;letter-spacing:2px}',
    '.cg-table td:last-child{text-align:right;color:var(--gold-bright)}',
    '.cg-table tr:last-child th,.cg-table tr:last-child td{border-bottom:none}',
    '.cg-sum th,.cg-sum td{font-weight:600}',
    '.cg-verse{margin-top:14px;padding:14px 16px;background:var(--card);border:1px solid var(--line);border-radius:var(--r-md)}',
    '.cg-verse p{margin-top:8px;font-size:var(--fs-lg);line-height:2;color:var(--cream);text-wrap:pretty}',
    '.cg-verse .cg-orig{font-family:var(--serif);letter-spacing:1px}',
    '.cg-verse .cg-sub{display:block;margin-top:14px;padding-top:12px;border-top:1px solid var(--line-soft)}',
    '.cg-verse .cg-sub+p{font-size:var(--fs-md);line-height:1.9;color:var(--cream-dim)}',
    '.cg-note{margin-top:10px;font-size:var(--fs-xs);color:var(--faint);text-align:center;line-height:1.8}'
  ].join('\n');
  var DOM =
    '<div class="sheet-backdrop" id="chengguBackdrop" onclick="closeSheetByBtn(this)"></div>' +
    '<div class="sheet" id="chengguModal" role="dialog" aria-label="称骨算命">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-head"><h3>称骨算命</h3><button type="button" class="sheet-close" onclick="closeSheetByBtn(this)" aria-label="关闭">×</button></div>' +
      '<div class="cg-side">' +
        '<p class="mbti-intro">以出生的农历年、月、日、时各取一份骨重，相加得总骨重，再看对应批语。生辰与八字、星座、星盘共用同一份档案。</p>' +
        '<div class="profile-bar" id="chengguProfileBar" data-bar="chenggu"></div>' +
      '</div>' +
      '<div id="chengguResult" class="cg-result"></div>' +
    '</div>';
  function ensureDom() {
    if ($('chengguModal')) return;
    var st = document.createElement('style');
    st.id = 'chengguStyle';
    st.textContent = CSS;
    document.head.appendChild(st);
    var wrap = document.createElement('div');
    wrap.innerHTML = DOM;
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }

  /* ── 开关 ── */
  function lock(on) {
    document.documentElement.classList.toggle('scroll-locked', !!on);
  }
  window.openChenggu = function () {
    ensureDom();
    if (typeof window.renderProfileBar === 'function') window.renderProfileBar('chengguProfileBar');
    render();
    var m = $('chengguModal'), bd = $('chengguBackdrop');
    if (bd) bd.classList.add('show');
    if (m) m.classList.add('show');
    lock(true);
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
  };
  window.closeChenggu = function () {
    var m = $('chengguModal'), bd = $('chengguBackdrop');
    if (m) m.classList.remove('show');
    if (bd) bd.classList.remove('show');
    lock(false);
  };

  /* ESC 关闭 */
  document.addEventListener('keydown', function (e) {
    var m = $('chengguModal');
    if (e.key === 'Escape' && m && m.classList.contains('show')) window.closeChenggu();
  });

  /* 档案更换后自动重算 */
  var prev = window.refreshProfileBars;
  window.refreshProfileBars = function () {
    if (typeof prev === 'function') prev.apply(this, arguments);
    var m = $('chengguModal');
    if (m && m.classList.contains('show')) render();
  };
})();
