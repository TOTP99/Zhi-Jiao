// ============================================================
// 称骨算命：农历换算 + 年月日时骨重 + 骨重大意
// 生辰一律读取共用档案 yumiao_shared_birth_v1（与八字/星座/星盘同一份）
// ============================================================
(function () {
  'use strict';

  // 本地小助手：优先用全局单点，无则本地兜底
  function $(id) {
    return (typeof window.$ === 'function') ? window.$(id) : document.getElementById(id);
  }

  /* ── 农历表 1900–2100：bit16=闰月大小，bit15..4=1~12月大小，低4位=闰哪个月 ── */
  /* 农历换算已抽到共享模块 js/00a-lunar.js（以 15 的表为准）；此处改调 window.YumiaoLunar.solarToLunar */

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
  function esc(s) {
    if (s == null) return '';
    return (typeof window.escapeHtml === 'function') ? window.escapeHtml(String(s)) : String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── 核心计算 ── */
  function calc(b) {
    var y = +b.year, m = +b.month, d = +b.day;
    var h = (b.hour == null || b.hour === '') ? 12 : +b.hour;
    if (![y, m, d, h].every(isFinite)) return { error: '生辰档案不完整，请点「更换」重新录入。' };
    var lu = window.YumiaoLunar.solarToLunar(y, m, d);
    if (!lu) return { error: '农历换算范围为 1900–2100 年，请检查生辰档案。' };
    var gz = ganzhi(lu.year);
    var hi = Math.floor((h + 1) / 2) % 12;
    // 闰月半月制（与 15-ziwei.js effectiveMonth 同口径，原样复用）：闰月 1–15 日按本月，16 日后算下月。
    // 闰十二月下半月推到正月时，年重仍按本年——紫微亦只进年干（palaceGan 用）、不动年份/年支。
    // 注：1900–2100 年间无闰十二月，该分支在范围内不可达，留作与紫微一致的兜底。
    var effMonth = lu.month;
    if (lu.isLeap && lu.day > 15) { effMonth = lu.month + 1; if (effMonth > 12) effMonth = 1; }
    var yw = YEAR_W[gz.idx], mw = MONTH_W[effMonth - 1], dw = DAY_W[lu.day - 1], hw = HOUR_W[hi];
    var total = yw + mw + dw + hw;
    return {
      lunar: lu, gz: gz.name, hourName: ZHI[hi], hourRange: HOUR_RANGE[hi],
      hourDefault: (b.hour == null || b.hour === ''),
      yw: yw, mw: mw, dw: dw, hw: hw, total: total,
      lunarText: lu.year + '年（' + gz.name + '）' + (lu.isLeap ? '闰' : '') + MONTH_N[lu.month - 1] + '月' + DAY_N[lu.day - 1]
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
    var b = (typeof readBirth === 'function') ? readBirth({ dst: true }) : null;
    if (!b || !b.year || !b.month || !b.day) {
      box.innerHTML = '<p class="cg-hint">还没有生辰档案。录入一次，八字、星座、星盘、称骨都会共用。</p>';
      return;
    }
    var r = calc(b);
    if (r.error) { box.innerHTML = '<p class="cg-hint">' + esc(r.error) + '</p>'; return; }
    var rows = [
      ['年', r.gz + '年', r.yw],
      ['月', (r.lunar.isLeap ? '闰' : '') + MONTH_N[r.lunar.month - 1] + '月', r.mw],
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
    if (typeof saveReportHTML === 'function') saveReportHTML('yumiao_report_chenggu_v1', '称骨算命', 'chengguResult');
  }

  /* ── 自带样式与弹窗 DOM（不依赖 index.html / style.css 里的称骨代码） ── */
  var CSS = [
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
      '<div class="sheet-scroll">' +
        '<div class="cg-side">' +
          '<p class="mbti-intro">以出生的农历年、月、日、时各取一份骨重，相加得总骨重，再看对应批语。生辰与八字、星座、星盘共用同一份档案。</p>' +
          '<div class="profile-bar" id="chengguProfileBar" data-bar="chenggu"></div>' +
        '</div>' +
        '<div id="chengguResult" class="mbti-report"></div>' +
      '</div>' +
      '<div class="mbti-reveal-actions"><button type="button" class="btn-gold btn-sm" onclick="copyReport(\'chengguResult\')">复制结果</button></div>' +
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
    if (typeof ModalUI !== 'undefined' && ModalUI.open) ModalUI.open('chenggu');
    else {
      if (bd) bd.classList.add('show');
      if (m) m.classList.add('show');
      if (window.YumiaoNav) window.YumiaoNav.noteOpened('chengguModal');
    }
    lock(true);
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { console.warn('[yumiao] 11', e); }
  };
  window.closeChenggu = function () {
    if (typeof ModalUI !== 'undefined' && ModalUI.close) ModalUI.close('chenggu');
    else {
      var m = $('chengguModal'), bd = $('chengguBackdrop');
      if (m) m.classList.remove('show');
      if (bd) bd.classList.remove('show');
      if (window.YumiaoNav) window.YumiaoNav.noteClosed('chengguModal');
    }
    lock(false);
  };

  /* 档案更换后自动重算 */
  if (typeof window.onProfileChange === 'function') {
    window.onProfileChange(function () {
      var m = $('chengguModal');
      if (m && m.classList.contains('show')) render();
    });
  }
})();
