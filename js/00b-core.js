// ============================================================
// 核心单点：弹层滚动锁、视口高度、ModalUI、报告捕获、$、生辰档案读写
// 加载顺序：00a → 00b → 01。顶层 function 声明即 window 属性。
// ============================================================
  // ---- 弹层滚动锁：打开星盘/八字/星座/MBTI/记录 等浮层时，锁住背景掷筊页面的滚动，
  // 避免在浮层内上下滑动选择年月日时时，手指误触发背景页面跟着滚动。
  // 用计数器支持"浮层里再叠一层"（如星盘小词典）的嵌套开关场景。
  let _scrollLockCount = 0;
  let _savedScrollY = 0;
  function lockPageScroll() {
    if (_scrollLockCount === 0) {
      _savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.style.position = 'fixed';
      document.body.style.top = (-_savedScrollY) + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.documentElement.classList.add('scroll-locked');
    }
    _scrollLockCount++;
  }
  function unlockPageScroll() {
    _scrollLockCount = Math.max(0, _scrollLockCount - 1);
    if (_scrollLockCount === 0) {
      document.documentElement.classList.remove('scroll-locked');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, _savedScrollY);
    }
  }
  // ---- 视口高度（iOS Safari 工具栏会改变可视高度；弹窗打开时实测一次同步，CSS 用 var(--app-height, 100dvh) 兜底）----
  function syncAppViewportVars() {
    try {
      var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight || 0;
      if (h > 0) document.documentElement.style.setProperty('--app-height', h + 'px');
    } catch (_) { /* 读不到视口时用 CSS 兜底 */ }
  }
  window.syncAppViewportVars = syncAppViewportVars;
  try {
    if (window.visualViewport && window.visualViewport.addEventListener) {
      // 工具栏收起/展开时视口会变：仅在有弹窗打开时跟进同步
      window.visualViewport.addEventListener('resize', function () {
        if (document.querySelector('.sheet.show, .sheet-backdrop.show')) syncAppViewportVars();
      });
    }
  } catch (_) { /* 不支持 visualViewport 时忽略 */ }
  // ---- 统一弹窗开关层（ModalUI）----
  // 只负责"弹窗怎么开/怎么关"这类纯 UI 行为（加减 show class、背景滚动锁）。
  // 各业务模块（八字/星座/星盘/MBTI）打开或关闭前后要做的具体业务动作
  // （加载表单数据、初始化滚轮、清空状态等）仍留在各自的 openXxxPanel/closeXxxPanel 里，
  // 这里不替它们决定该做什么业务逻辑，只统一"显示/隐藏 + 滚动锁"这一层。
  const ModalRegistry = {
    mbti:    { backdrop: 'mbtiBackdrop',    modal: 'mbtiModal' },
    bazi:    { backdrop: 'baziBackdrop',    modal: 'baziModal' },
    zodiac:  { backdrop: 'zodiacBackdrop',  modal: 'zodiacModal' },
    tarot:   { backdrop: 'tarotBackdrop',   modal: 'tarotModal' },
    wuge:    { backdrop: 'wugeBackdrop',    modal: 'wugeModal' },
    western: { backdrop: 'westernBackdrop', modal: 'westernModal' },
    fortune: { backdrop: 'fortuneBackdrop', modal: 'fortuneModal' },
    shengxiao: { backdrop: 'shengxiaoBackdrop', modal: 'shengxiaoModal' },
    ziwei: { backdrop: 'ziweiBackdrop', modal: 'ziweiModal' },
    chenggu: { backdrop: 'chengguBackdrop', modal: 'chengguModal' },
    history: { backdrop: 'historyBackdrop', modal: 'historyModal' },
    daily: { backdrop: 'dailyBackdrop', modal: 'dailySheet' },
    member: { backdrop: 'memberBackdrop', modal: 'memberSheet' },
    disclaimer: { backdrop: 'disclaimerBackdrop', modal: 'disclaimerSheet' }
  };
  const ModalUI = {
    isOpen(name) {
      const cfg = ModalRegistry[name];
      if (!cfg) return false;
      const backdrop = document.getElementById(cfg.backdrop);
      return !!(backdrop && backdrop.classList.contains('show'));
    },
    open(name) {
      const cfg = ModalRegistry[name];
      if (!cfg) return;
      syncAppViewportVars(); // 弹窗打开时实测视口高度同步一次
      const backdrop = document.getElementById(cfg.backdrop);
      const modal = document.getElementById(cfg.modal);
      const wasOpen = !!(backdrop && backdrop.classList.contains('show'));
      if (backdrop) backdrop.classList.add('show');
      if (modal) modal.classList.add('show');
      if (!wasOpen) lockPageScroll();
      if (window.YumiaoNav) window.YumiaoNav.noteOpened(cfg.modal);
    },
    close(name) {
      const cfg = ModalRegistry[name];
      if (!cfg) return;
      const backdrop = document.getElementById(cfg.backdrop);
      const modal = document.getElementById(cfg.modal);
      const wasOpen = !!(backdrop && backdrop.classList.contains('show')) || !!(modal && modal.classList.contains('show'));
      if (backdrop) backdrop.classList.remove('show');
      if (modal) modal.classList.remove('show');
      if (wasOpen) unlockPageScroll(); /* 未打开时不减计数，避免别的弹窗被提前解锁 */
      if (window.YumiaoNav) window.YumiaoNav.noteClosed(cfg.modal);
    }
  };

  /* 详细报告捕获：报告渲染完成后存完整 HTML，供「记录下载」生成 PDF */
  var QUERY_LOG_KEY = 'yumiao_records_v1'; // 统一质询记录：按时间顺序，供按质询次序打印
  var QUERY_LOG_MAX = 24;
  function appendQueryRecord(title, html) {
    try {
      if (!html || html.length < 20) return;
      var arr = readStorageJSON(QUERY_LOG_KEY, []);
      if (!Array.isArray(arr)) arr = [];
      arr.push({ title: title, ts: Date.now(), html: html });
      while (arr.length > QUERY_LOG_MAX) arr.shift();
      localStorage.setItem(QUERY_LOG_KEY, JSON.stringify(arr));
    } catch (_) { /* 存储失败不影响主流程 */ }
  }
  function saveReportHTML(key, title, elId, htmlOverride) {
    try {
      const el = document.getElementById(elId);
      if (!el) return;
      /* htmlOverride：调用方已拼好的完整报告 HTML（如掷筊含所问）；否则取元素 innerHTML */
      const html = htmlOverride || el.innerHTML;
      if (!html || html.length < 50) return;
      if (!htmlOverride && el.dataset.prevHtml) return; // 词典覆盖态不存
      localStorage.setItem(key, JSON.stringify({ html: html, ts: Date.now(), title: title }));
      appendQueryRecord(title, html); // 同时记入统一质询记录（按质询次序）
    } catch (_) { /* 存储失败不影响主流程 */ }
  }

  /* $ 取元素 */
  function $(id) { return document.getElementById(id); }

  /* HTML 转义：全应用唯一实现（顶层声明即 window.escapeHtml，各模块的 esc 直接调用） */
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── 生辰档案单点读写：全应用唯一的键与读入口（写只走 10 的 saveBirth）──
     opts：dst=夏令时回拨到标准时；validate=缺年月日返回 null；shape=重塑为 {year,month,day,hour,gender}。
     无 opts 时返回原样对象（与旧 10 的 readBirth 一致）。 */
  const BIRTH_KEY = 'yumiao_shared_birth_v1';
  function readBirth(opts) {
    opts = opts || {};
    var b = null;
    b = readStorageJSON(BIRTH_KEY, null); // readStorageJSON 内部已容错（损坏/缺失返回 null）
    if (!b) return null;
    if (opts.validate && (!b.year || !b.month || !b.day)) return null;
    if (opts.dst && typeof window.yumiaoStdBirth === 'function') b = window.yumiaoStdBirth(b);
    if (opts.shape) {
      return {
        year: +b.year, month: +b.month, day: +b.day,
        hour: (b.hour == null || b.hour === '') ? 12 : +b.hour,
        gender: (b.sex === 'F') ? '女' : '男'
      };
    }
    return b;
  }
  // ---- 轻量存储工具：统一处理 JSON + localStorage 异常 ----
  function readStorageJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
