/**
 * 御猫灵局 · 内容层中英切换（v3.0）
 *
 * 规则（用户定）：
 * - 只翻「内容」：结果正文、说明、批语。标题 / 按钮 / 图标 / 小节名永远保持中文。
 * - 能转换的页面才出现悬浮国旗开关；转换不了的页面不出现。
 * - 点国旗开关即切换；没有长按、没有「点任意处还原」。
 * - 不持久化语言偏好：换页（开/关面板、切底栏）自动回中文。
 *
 * 工作方式（DOM 层，不改各功能的渲染代码）：
 * 1. 字典：window.YUMIAO_DICT = { 模块: { 中文原文: 英文 } }（js/dict/dict-*.js）。
 * 2. 当前页 = 最上层打开的面板（周易浮层 / .sheet.show / 当前底栏页）。
 * 3. 干跑：对当前页内「内容文字节点」逐个试译；只要还有成段的中文译不出来，
 *    这一页就判为「暂不能转换」，不显示开关。字典补全后会自动出现，无需改代码。
 * 4. 点开关：内容节点原地换成英文（记下原文）；再点还原。英文状态下新渲染出来的内容
 *    由 MutationObserver 即时补译；一旦出现译不出的成段中文，自动退回中文。
 *
 * 兜底：字典缺失 / 英文为空 / 任何异常 → 原样保留中文，不空白、不抛错。
 */
(function () {
  'use strict';

  /* ---------- 配置 ---------- */
  // 这些元素里的文字永远不译（标题 / 按钮 / 小节名 / 图标 / 表单）
  var SKIP_SEL = [
    'script', 'style', 'svg', 'textarea', 'input', 'select', 'option',
    'button', '[role="button"]', 'a', 'label', 'summary',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th',
    '.sheet-head', '#topbar', '#tabbar', '.tab', '.seg', '.switch',
    '.btn-gold', '.btn-ghost', '.btn-bronze', '.feature-card', '.sheet-close',
    '.kicker', '.mbti-sec-label', '.cg-kicker', '.pb-kicker', '.profile-bar',
    '.question-menu', '.fr-tag', '.palm-lv', '.result-title', '.result-beast', '.oracle-tag',
    '#view-charts', '#view-me', '.disclaimer-body strong', '[data-no-i18n]', '#langFlagSwitch'
  ].join(',');
  // 一段中文达到这个字数才算「成段内容」：更短的视为标签 / 数据（干支、星名、日期等），保持中文
  var MIN_CJK = 4;
  var CJK_RE = /[一-鿿]/;
  var CJK_G = /[一-鿿]/g;

  /* ---------- 状态 ---------- */
  var viewEn = false;
  var originals = new Map();   // 文字节点 → 原中文
  var index = null;            // 字典索引（首次用到时建）
  var indexSize = -1;

  /* ---------- 字典索引 ---------- */
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function buildIndex() {
    var dicts = window.YUMIAO_DICT;
    var exact = Object.create(null);
    var bucket = Object.create(null);   // 前两字 → 按长度降序的 key 列表
    var n = 0, maxLen = 0;
    if (dicts && typeof dicts === 'object') {
      for (var mod in dicts) {
        if (!Object.prototype.hasOwnProperty.call(dicts, mod)) continue;
        var table = dicts[mod];
        if (!table || typeof table !== 'object') continue;
        for (var k in table) {
          if (!Object.prototype.hasOwnProperty.call(table, k)) continue;
          var v = table[k];
          if (typeof v !== 'string' || !v) continue;     // 空 = 未译
          var nk = norm(k);
          if (!nk || !CJK_RE.test(nk)) continue;
          if (!(nk in exact)) { exact[nk] = v; n++; }
          if (nk.length > maxLen) maxLen = nk.length;
        }
      }
    }
    for (var key in exact) {
      var b = key.length === 1 ? '1:' + key : key.slice(0, 2);   // 单字词条另开桶
      (bucket[b] = bucket[b] || []).push(key);
    }
    for (var bb in bucket) bucket[bb].sort(function (a, c) { return c.length - a.length; });
    index = { exact: exact, bucket: bucket, maxLen: maxLen };
    indexSize = n;
    return index;
  }
  function getIndex() {
    if (!index) buildIndex();
    return index;
  }
  // 字典后加载（懒加载模块带来新条目）时重建
  function dictSize() {
    var d = window.YUMIAO_DICT, n = 0;
    if (!d) return 0;
    for (var m in d) if (Object.prototype.hasOwnProperty.call(d, m)) n += Object.keys(d[m]).length;
    return n;
  }
  var lastDictRaw = -1;
  function ensureIndex() {
    var raw = dictSize();
    if (!index || raw !== lastDictRaw) { buildIndex(); lastDictRaw = raw; }
    return index;
  }

  /* ---------- 查询 ---------- */
  function lookup(zh) {
    try {
      if (!zh || typeof zh !== 'string') return null;
      var ix = ensureIndex();
      var key = norm(zh);
      return Object.prototype.hasOwnProperty.call(ix.exact, key) ? ix.exact[key] : null;
    } catch (e) { return null; }
  }

  // 全角标点 → 英文标点（只用在没被字典覆盖的零碎部分）
  var PUNCT = {
    '，': ', ', '、': ', ', '；': '; ', '：': ': ', '。': '. ', '！': '! ', '？': '? ',
    '（': ' (', '）': ') ', '「': ' \u201c', '」': '\u201d ', '『': ' \u201c', '』': '\u201d ',
    '\u201c': ' \u201c', '\u201d': '\u201d ', '《': ' \u201c', '》': '\u201d ', '　': ' ', '·': ' \u00b7 ',
    '～': '~', '—': ' \u2014 '
  };
  function punctToEn(s) {
    return s.replace(/[，、；：。！？（）「」『』\u201c\u201d《》　～—·]/g, function (c) { return PUNCT[c] || c; });
  }
  // 拼接相邻片段：字母 / 数字 / 句末标点 与 下一个字母 / 数字 / 开括号 / 开引号 之间补一个空格
  function joinParts(parts) {
    var res = '';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      if (res && /[A-Za-z0-9.,;:!?%)\u201d\u2605\u2606]$/.test(res) && /^[A-Za-z0-9(\u201c\u2605\u2606]/.test(p)) res += ' ';
      res += p;
    }
    return res;
  }

  // 规则：处理字典不方便列举的「数字 / 日期」之类。window.YUMIAO_RULES = [{ re: /.../g, fn: function (m, g1, g2) { return 'English'; } }]
  function applyRules(segs) {
    var rules = window.YUMIAO_RULES;
    if (!rules || !rules.length) return segs;
    for (var r = 0; r < rules.length; r++) {
      var rule = rules[r];
      if (!rule || !rule.re || rule.strip || typeof rule.fn !== 'function') continue;
      var next = [];
      for (var i = 0; i < segs.length; i++) {
        var sg = segs[i];
        if (sg.zh === undefined) { next.push(sg); continue; }
        var str = sg.zh, last = 0, m;
        var re = new RegExp(rule.re.source, rule.re.flags.indexOf('g') >= 0 ? rule.re.flags : rule.re.flags + 'g');
        while ((m = re.exec(str))) {
          if (m[0] === '') { re.lastIndex++; continue; }
          if (m.index > last) next.push({ zh: str.slice(last, m.index) });
          var en = null;
          try { en = rule.fn.apply(null, m); } catch (_) { en = null; }
          if (typeof en === 'string') next.push({ en: en }); else next.push({ zh: m[0] });
          last = m.index + m[0].length;
        }
        if (last < str.length) next.push({ zh: str.slice(last) });
      }
      segs = next;
    }
    return segs;
  }

  function postAll(text, posts) {
    for (var i = 0; i < posts.length; i++) {
      try { text = posts[i].post.apply(null, [text].concat(Array.prototype.slice.call(posts[i].m))); } catch (_) {}
    }
    return text;
  }

  // 字典最长匹配（只处理 zh 片段）
  function dictScan(segs, ix) {
    var out = [];
    for (var q = 0; q < segs.length; q++) {
      var sg = segs[q];
      if (sg.zh === undefined) { out.push(sg); continue; }
      var s = sg.zh, i = 0, len = s.length;
      while (i < len) {
        var matched = null, ch = s.charAt(i);
        var list = i + 1 < len ? ix.bucket[s.substr(i, 2)] : null;
        if (list) {
          for (var j = 0; j < list.length; j++) {
            if (s.substr(i, list[j].length) === list[j]) { matched = list[j]; break; }
          }
        }
        if (!matched && CJK_RE.test(ch) && ix.exact[ch] !== undefined) matched = ch;
        if (matched) { out.push({ en: ix.exact[matched] }); i += matched.length; }
        else {
          var last = out[out.length - 1];
          if (last && last.zh !== undefined) last.zh += ch; else out.push({ zh: ch });
          i++;
        }
      }
    }
    return out;
  }

  /**
   * 试译一段文字。返回 { text, left }：text = 译后文字；left = 仍残留的中文汉字个数（0 = 完整译出）
   * 顺序：整段精确 → 规则（数字 / 日期）→ 字典最长子串匹配。
   */
  function translate(zh) {
    var ix = ensureIndex();
    var whole = lookup(zh);
    if (whole != null) return { text: whole, left: 0 };
    // 「插入式」规则：原文被程序在句中塞进了变量（如「日主」→「日主辛(金)」）。先把变量摘掉，译完再按 post 补回
    var str0 = String(zh).replace(/\s+/g, ' '), posts = [];
    var rules = window.YUMIAO_RULES || [];
    for (var ri = 0; ri < rules.length; ri++) {
      var ru = rules[ri];
      if (!ru || !ru.strip || !ru.re) continue;
      var rm = ru.re.exec(str0);
      if (rm) { posts.push({ post: ru.post, m: rm }); str0 = str0.replace(ru.re, ru.strip); }
    }
    if (posts.length) {
      var whole2 = lookup(str0);
      if (whole2 != null) return { text: postAll(whole2, posts), left: 0, rest: [] };
    }
    var segs = dictScan(applyRules([{ zh: str0 }]), ix);
    var left = 0, parts = [], rest = [];
    for (var p = 0; p < segs.length; p++) {
      var seg = segs[p];
      if (seg.en !== undefined) parts.push(seg.en);
      else {
        var m = seg.zh.match(CJK_G);
        if (m) { left += m.length; rest.push(seg.zh.trim()); }
        parts.push(punctToEn(seg.zh));
      }
    }
    var text = joinParts(parts);
    text = text.replace(/([.!?])\s*\.\s*/g, '$1 ').replace(/ ?, ?\./g, '.').replace(/\s+([,.;:!?)])/g, '$1').replace(/\s{2,}/g, ' ').trim();
    if (posts.length) text = postAll(text, posts);
    return { text: text, left: left, rest: rest };
  }

  /** 公开 t()：英文视图下返回译文，否则原文；永远不抛错。 */
  function t(zh) {
    try {
      if (zh == null) return '';
      if (typeof zh !== 'string') zh = String(zh);
      if (!viewEn || !zh) return zh;
      var r = translate(zh);
      return r.left === 0 ? r.text : zh;
    } catch (e) { return typeof zh === 'string' ? zh : ''; }
  }
  function tList(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(function (x) { return typeof x === 'string' ? t(x) : x; });
  }

  /* ---------- DOM：取内容文字节点 ---------- */
  function cjkCount(s) { var m = s.match(CJK_G); return m ? m.length : 0; }

  function contentNodes(root) {
    var list = [];
    if (!root) return list;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nd;
    while ((nd = w.nextNode())) {
      var v = nd.nodeValue;
      if (!v || !CJK_RE.test(v)) continue;
      var el = nd.parentElement;
      if (!el) continue;
      try {
        if (el.closest(SKIP_SEL)) {
          // 掌纹报告里「线名 · 选项名」的小标题带有内容（选项名），放行；固定小节名（总评 / 四线…）仍保持中文
          var lab = el.closest('.mbti-sec-label');
          if (!(lab && lab.closest('#palmReport') && v.indexOf(' · ') >= 0 && !el.closest('[data-no-i18n],button,a'))) continue;
        }
      } catch (_) { continue; }
      list.push(nd);
    }
    return list;
  }

  /**
   * 干跑：这一页能不能转换？
   * 返回 { n: 要译的成段节点数, blocked: 译不出的成段节点数 }
   */
  function probe(root) {
    var nodes = contentNodes(root), n = 0, blocked = 0;
    for (var i = 0; i < nodes.length; i++) {
      var v = nodes[i].nodeValue;
      if (cjkCount(v) < MIN_CJK) continue;
      n++;
      var r = translate(v);
      if (r.left > 0) blocked++;      // 还有没译出的中文 → 这页不能转
    }
    return { n: n, blocked: blocked };
  }

  /* ---------- DOM：换文 / 还原 ---------- */
  var applying = false;
  function applyTo(root) {
    var nodes = contentNodes(root), blockedAny = false;
    applying = true;
    try {
      for (var i = 0; i < nodes.length; i++) {
        var nd = nodes[i], v = nd.nodeValue;
        if (originals.has(nd) && !CJK_RE.test(v)) continue;
        if (cjkCount(v) < MIN_CJK) continue;                 // 短标签保持中文
        var r = translate(v);
        if (r.left > 0) { blockedAny = true; continue; }
        // 前后空白保留
        var lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0];
        if (!originals.has(nd)) originals.set(nd, v);
        nd.nodeValue = lead + r.text + tail;
      }
    } catch (e) {
      try { console.warn('[yumiao-i18n] apply', e); } catch (_) {}
    }
    applying = false;
    return !blockedAny;
  }
  function restoreAll() {
    applying = true;
    try {
      originals.forEach(function (orig, nd) {
        if (nd.isConnected) nd.nodeValue = orig;
      });
    } catch (e) { /* 忽略 */ }
    originals.clear();
    applying = false;
  }

  /* ---------- 当前页 ---------- */
  function isShown(el) { return !!(el && el.classList.contains('show')); }
  function currentScope() {
    var yi = document.getElementById('yiOverlay');
    if (isShown(yi)) return yi;
    var sheets = document.querySelectorAll('.sheet.show');
    if (sheets.length) return sheets[sheets.length - 1];
    return document.querySelector('#views .view.on');
  }
  function bodyBlocked() {
    // 启动页 / 引导页期间不出现
    var sp = document.getElementById('splash'), ob = document.getElementById('onboard');
    var shown = function (e) { return e && e.getAttribute('aria-hidden') === 'false'; };
    return shown(sp) || shown(ob) || (sp && sp.classList.contains('show')) || (ob && ob.classList.contains('show'));
  }

  /* ---------- 视图切换 ---------- */
  var scopeNow = null;

  function enterEnglishView() {
    var root = currentScope();
    if (!root) return false;
    var ok = applyTo(root);
    if (!ok) { restoreAll(); return false; }
    viewEn = true;
    try { document.documentElement.setAttribute('data-content-lang', 'en'); } catch (_) {}
    syncFlag();
    return true;
  }
  function exitEnglishView() {
    viewEn = false;
    restoreAll();
    try { document.documentElement.removeAttribute('data-content-lang'); } catch (_) {}
    syncFlag();
  }
  function toggleEnglishView() {
    if (viewEn) exitEnglishView(); else enterEnglishView();
    try { document.dispatchEvent(new CustomEvent('yumiao:content-lang-change', { detail: { lang: viewEn ? 'en' : 'zh' } })); } catch (_) {}
    return viewEn;
  }
  function isEnglishView() { return viewEn; }

  /* ---------- 悬浮国旗开关 ---------- */
  // 国旗用内联 SVG（emoji 国旗在 Windows 上显示成字母）
  var FLAG_CN = '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#de2910"/>' +
    '<g fill="#ffde00"><polygon points="5,2.2 6.2,5.6 9.8,5.6 6.9,7.7 8,11.1 5,9 2,11.1 3.1,7.7 0.2,5.6 3.8,5.6"/>' +
    '<polygon points="10.5,1.4 11,2.6 12.3,2.6 11.3,3.4 11.7,4.6 10.5,3.9 9.3,4.6 9.7,3.4 8.7,2.6 10,2.6" transform="scale(.9) translate(1.3,0.2)"/>' +
    '<polygon points="12,5 12.4,6.1 13.6,6.1 12.7,6.8 13,7.9 12,7.2 11,7.9 11.3,6.8 10.4,6.1 11.6,6.1" transform="scale(.9) translate(1.3,0.2)"/>' +
    '<polygon points="12,8.6 12.4,9.7 13.6,9.7 12.7,10.4 13,11.5 12,10.8 11,11.5 11.3,10.4 10.4,9.7 11.6,9.7" transform="scale(.9) translate(1.3,0.2)"/>' +
    '<polygon points="10.5,11.6 11,12.7 12.2,12.7 11.3,13.4 11.6,14.5 10.5,13.8 9.4,14.5 9.7,13.4 8.8,12.7 10,12.7" transform="scale(.9) translate(1.3,0.2)"/></g></svg>';
  var FLAG_CA = '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#fff"/>' +
    '<rect width="7.5" height="20" fill="#d52b1e"/><rect x="22.5" width="7.5" height="20" fill="#d52b1e"/>' +
    '<path fill="#d52b1e" d="M15 3.2l1.3 2.6 1.3-.7-.6 3.5 1.2-1 .5 1.1 1.9-.6-.8 2.8.7.4-3.2 2.6.3 1.3-2.8-.3v2.3h-.7v-2.3l-2.8.3.3-1.3-3.2-2.6.7-.4-.8-2.8 1.9.6.5-1.1 1.2 1-.6-3.5 1.3.7z"/></svg>';

  var flagEl = null;
  function ensureFlag() {
    if (flagEl) return flagEl;
    if (!document.body) return null;
    var css = document.createElement('style');
    css.textContent =
      '#langFlagSwitch{position:fixed;right:10px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:900;' +
      'display:none;flex-direction:column;gap:2px;padding:3px;border-radius:999px;border:1px solid rgba(212,175,106,.55);' +
      'background:rgba(20,14,10,.78);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);' +
      'box-shadow:0 2px 10px rgba(0,0,0,.35);cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;' +
      '-webkit-tap-highlight-color:transparent;padding:0;font:inherit}' +
      '#langFlagSwitch.show{display:flex}' +
      '#langFlagSwitch .lf{display:block;width:34px;height:34px;border-radius:50%;padding:7px 5px;box-sizing:border-box;' +
      'opacity:.38;filter:grayscale(.5);transition:opacity .15s,filter .15s,background .15s}' +
      '#langFlagSwitch .lf svg{display:block;width:100%;height:100%;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,.25)}' +
      '#langFlagSwitch .lf.on{opacity:1;filter:none;background:rgba(212,175,106,.28)}';
    document.head.appendChild(css);
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'langFlagSwitch';
    b.setAttribute('aria-label', '中文 / English');
    b.setAttribute('data-no-i18n', '');
    b.innerHTML = '<span class="lf lf-zh">' + FLAG_CN + '</span><span class="lf lf-en">' + FLAG_CA + '</span>';
    var moved = false, sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
    b.addEventListener('pointerdown', function (e) {
      drag = true; moved = false; sx = e.clientX; sy = e.clientY;
      var r = b.getBoundingClientRect(); ox = r.left; oy = r.top;
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
    });
    b.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      moved = true;
      var w = b.offsetWidth, h = b.offsetHeight;
      var x = Math.min(Math.max(4, ox + dx), window.innerWidth - w - 4);
      var y = Math.min(Math.max(4, oy + dy), window.innerHeight - h - 4);
      b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.right = 'auto'; b.style.bottom = 'auto';
    });
    function end() { drag = false; }
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    b.addEventListener('click', function (e) {
      if (moved) { moved = false; e.preventDefault(); return; }
      toggleEnglishView();
    });
    document.body.appendChild(b);
    flagEl = b;
    return b;
  }
  function syncFlag(visible) {
    var b = ensureFlag();
    if (!b) return;
    if (visible === true) b.classList.add('show');
    else if (visible === false) b.classList.remove('show');
    var zh = b.querySelector('.lf-zh'), en = b.querySelector('.lf-en');
    if (zh) zh.classList.toggle('on', !viewEn);
    if (en) en.classList.toggle('on', viewEn);
    b.setAttribute('aria-pressed', viewEn ? 'true' : 'false');
  }

  /* ---------- 刷新：判断当前页能不能转换，决定开关显隐 ---------- */
  var timer = 0;
  function refresh() {
    timer = 0;
    try {
      if (bodyBlocked()) { if (viewEn) exitEnglishView(); syncFlag(false); return; }
      var scope = currentScope();
      if (scope !== scopeNow) {                 // 换页：回中文，重新判断
        scopeNow = scope;
        if (viewEn) exitEnglishView();
      }
      if (!scope) { syncFlag(false); return; }
      if (viewEn) {
        // 英文状态：补译新渲染的内容；译不出成段中文就退回中文
        if (!applyTo(scope)) { exitEnglishView(); }
        syncFlag(viewEn ? true : false);
        if (!viewEn) { var p0 = probe(scope); syncFlag(p0.n > 0 && p0.blocked === 0); }
        return;
      }
      var p = probe(scope);
      syncFlag(p.n > 0 && p.blocked === 0);
    } catch (e) {
      try { console.warn('[yumiao-i18n] refresh', e); } catch (_) {}
      syncFlag(false);
    }
  }
  function schedule() {
    if (applying || timer) return;
    timer = setTimeout(refresh, 160);
  }

  function init() {
    ensureFlag();
    var mo = new MutationObserver(function (muts) {
      if (applying) return;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.target && m.target.id === 'langFlagSwitch') continue;
        if (m.type === 'attributes' && !(m.target.classList && (m.target.classList.contains('sheet') || m.target.classList.contains('view') || m.target.id === 'yiOverlay' || m.target.id === 'splash' || m.target.id === 'onboard'))) continue;
        schedule();
        return;
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'aria-hidden'] });
    document.addEventListener('yumiao:dict-loaded', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ---------- 导出 ---------- */
  window.t = t;
  window.tContent = t;
  window.tList = tList;
  window.yumiaoI18n = {
    t: t,
    tContent: t,
    tList: tList,
    translate: translate,
    lookup: lookup,
    probe: probe,
    contentNodes: contentNodes,
    refresh: refresh,
    enterEnglishView: enterEnglishView,
    exitEnglishView: exitEnglishView,
    toggleEnglishView: toggleEnglishView,
    isEnglishView: isEnglishView,
    currentScope: currentScope
  };
})();
