/**
 * 御猫灵局 · 内容层临时英文视图
 *
 * 设计：
 * - 标题 / 功能名 / 按钮 永远保持中文（不走本模块）
 * - 只把「结果出现后的正文」翻成英文
 * - 点击一次进入英文视图，再点任意处（或显式还原）回到中文
 * - 不持久化语言偏好，不设「持续英文模式」
 *
 * 字典：window.YUMIAO_DICT = { jiao: {...}, yijing: {...}, ... }
 * 每条 key 为中文原文，value 为英文；空字符串 / 缺失 → 兜底回中文
 *
 * 兜底保障（多层）：
 * 1. 字典未加载 / 模块不存在 → 返回原文
 * 2. 精确匹配无结果 → 尝试归一化空白后再查
 * 3. 仍无 → 返回原文（绝不抛错、绝不显示空白）
 * 4. 英文值为空字符串 → 视为未翻译，返回原文
 * 5. t() 内部任何异常 → catch 后返回原文
 */
(function () {
  'use strict';

  var _viewEn = false;           // 当前是否英文内容视图
  var _lastContentRoot = null;   // 可选：记录最近渲染的结果根节点，方便一键还原

  function normalizeKey(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/\s+/g, ' ').trim();
  }

  /**
   * 在所有已加载模块中查找翻译
   * @param {string} zh 中文原文
   * @returns {string|null} 英文或 null（表示应兜底）
   */
  function lookup(zh) {
    if (!zh || typeof zh !== 'string') return null;
    var dicts = window.YUMIAO_DICT;
    if (!dicts || typeof dicts !== 'object') return null;

    var key = zh;
    var norm = normalizeKey(zh);

    for (var mod in dicts) {
      if (!Object.prototype.hasOwnProperty.call(dicts, mod)) continue;
      var table = dicts[mod];
      if (!table || typeof table !== 'object') continue;

      // 精确
      if (Object.prototype.hasOwnProperty.call(table, key)) {
        var v = table[key];
        if (typeof v === 'string' && v.length > 0) return v;
        // 空字符串 = 未翻译，继续找或兜底
      }
      // 归一化空白后再试（防止提取时空白差异）
      if (norm !== key && Object.prototype.hasOwnProperty.call(table, norm)) {
        var v2 = table[norm];
        if (typeof v2 === 'string' && v2.length > 0) return v2;
      }
    }
    return null;
  }

  /**
   * 主翻译函数。永远返回字符串，绝不抛错。
   * @param {string} zh 中文
   * @returns {string} 英文（若开启英文视图且有翻译）或原文
   */
  function t(zh) {
    try {
      if (!_viewEn) return (typeof zh === 'string' ? zh : String(zh == null ? '' : zh));
      if (zh == null) return '';
      if (typeof zh !== 'string') zh = String(zh);
      if (!zh) return '';

      var en = lookup(zh);
      if (en != null) return en;

      // 最后兜底：原文
      return zh;
    } catch (e) {
      try { console.warn('[yumiao-i18n] t() fallback', e); } catch (_) {}
      return (typeof zh === 'string' ? zh : '');
    }
  }

  /**
   * 专门用于「结果正文」的翻译入口（语义更清晰）
   * 与 t 行为相同，便于代码搜索
   */
  function tContent(zh) {
    return t(zh);
  }

  /**
   * 批量：数组每一项都过 t
   */
  function tList(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(function (item) {
      return typeof item === 'string' ? t(item) : item;
    });
  }

  /**
   * 进入英文内容视图
   */
  function enterEnglishView() {
    _viewEn = true;
    try {
      document.documentElement.setAttribute('data-content-lang', 'en');
    } catch (_) {}
  }

  /**
   * 还原中文内容视图
   */
  function exitEnglishView() {
    _viewEn = false;
    try {
      document.documentElement.removeAttribute('data-content-lang');
    } catch (_) {}
  }

  /**
   * 切换；返回切换后是否为英文
   */
  function toggleEnglishView() {
    if (_viewEn) exitEnglishView();
    else enterEnglishView();
    return _viewEn;
  }

  function isEnglishView() {
    return !!_viewEn;
  }

  /**
   * 一次性绑定「英文状态下点击任意位置还原」
   * 在页面就绪后调用一次即可。
   * 排除：翻译按钮本身、输入框、可编辑区域（避免打字时误触发）
   */
  function bindClickAnywhereToRestore(opts) {
    opts = opts || {};
    var excludeSelector = opts.excludeSelector ||
      'button, a, input, textarea, select, [contenteditable], .no-lang-restore, #btnTranslateContent';

    // 使用捕获阶段，保证能收到
    document.addEventListener('click', function (ev) {
      if (!_viewEn) return;
      var t = ev.target;
      if (!t) return;
      try {
        if (t.closest && t.closest(excludeSelector)) return;
      } catch (_) {}
      exitEnglishView();
      // 通知业务层重新渲染当前结果（如果有监听）
      try {
        document.dispatchEvent(new CustomEvent('yumiao:content-lang-change', {
          detail: { lang: 'zh' }
        }));
      } catch (_) {}
    }, true);
  }

  // 导出
  window.t = t;
  window.tContent = tContent;
  window.tList = tList;
  window.yumiaoI18n = {
    t: t,
    tContent: tContent,
    tList: tList,
    enterEnglishView: enterEnglishView,
    exitEnglishView: exitEnglishView,
    toggleEnglishView: toggleEnglishView,
    isEnglishView: isEnglishView,
    bindClickAnywhereToRestore: bindClickAnywhereToRestore,
    lookup: lookup   // 调试用
  };

  // 兼容直接挂到 window
  window.enterEnglishView = enterEnglishView;
  window.exitEnglishView = exitEnglishView;
  window.toggleEnglishView = toggleEnglishView;
  window.isEnglishView = isEnglishView;
})();
