/**
 * 御猫灵局 · 英文视图 ↔ 结果重渲染 钩子示例
 *
 * 用法（二选一或组合）：
 * 1. 各功能在「生成结果 DOM」时，正文一律包 t() / tContent()
 * 2. 监听 yumiao:content-lang-change，在事件里调用本模块登记的 refresh 函数
 *
 * 本文件仅作参考，不自动挂载。复制需要的部分到对应 *-ui.js 即可。
 */
(function () {
  'use strict';

  // ---------- 1. 全局刷新注册表 ----------
  // 每个功能打开结果时 register，关闭时 unregister
  var _refreshers = Object.create(null);

  /**
   * 登记「当前结果需要重绘」的回调
   * @param {string} id  功能标识，如 'jiao' | 'yijing' | 'bazi' | 'palm' ...
   * @param {Function} fn 无参函数，内部重新渲染当前已有数据（不要重新起卦/重新计算）
   */
  function registerContentRefresh(id, fn) {
    if (typeof fn === 'function') _refreshers[id] = fn;
  }
  function unregisterContentRefresh(id) {
    delete _refreshers[id];
  }
  function refreshAllContent() {
    Object.keys(_refreshers).forEach(function (id) {
      try { _refreshers[id](); } catch (e) {
        try { console.warn('[i18n-refresh]', id, e); } catch (_) {}
      }
    });
  }

  // 语言切换时自动触发
  document.addEventListener('yumiao:content-lang-change', function () {
    refreshAllContent();
  });

  window.yumiaoI18nRefresh = {
    register: registerContentRefresh,
    unregister: unregisterContentRefresh,
    refreshAll: refreshAllContent
  };

  // ---------- 2. 各功能接入示意（伪代码，按真实变量名改） ----------

  /*
  // ===== 掷筊结果卡 (01-jiao-core / 相关 UI) =====
  // 假设已有 lastJiaoResult = { type, title, meaning, advice, ... }
  function renderJiaoResult(data) {
    var box = document.getElementById('jiaoResultBody');
    if (!box || !data) return;
    box.innerHTML =
      '<div class="jiao-type">' + t(data.typeLabel) + '</div>' +
      '<div class="jiao-meaning">' + t(data.meaning) + '</div>' +
      '<div class="jiao-advice">' + t(data.advice) + '</div>';
  }
  // 掷筊成功后：
  //   lastJiaoResult = data;
  //   renderJiaoResult(data);
  //   yumiaoI18nRefresh.register('jiao', function () { renderJiaoResult(lastJiaoResult); });
  // 关闭结果时：
  //   yumiaoI18nRefresh.unregister('jiao');

  // ===== 周易 (23-yijing-ui) =====
  // function renderYijingPanel(gua) {
  //   el.querySelector('.gua-name').textContent = gua.fullName; // 名称可保留中文
  //   el.querySelector('.gua-ci').textContent = t(gua.guaCi);
  //   el.querySelector('.gua-ci-modern').textContent = t(gua.guaCiModern);
  //   el.querySelector('.meaning').textContent = t(gua.meaning); // 若 meaning 已按句拆，可 map tList
  //   ...
  // }
  // yumiaoI18nRefresh.register('yijing', function () { renderYijingPanel(lastGua); });

  // ===== 八字结果 =====
  // 结果页里所有「解读段落」用 t()，表头/柱名保持中文
  // yumiaoI18nRefresh.register('bazi', function () { renderBaziResult(lastBazi); });

  // ===== 掌纹报告 =====
  // 线解读、总评、建议 → t()
  // yumiaoI18nRefresh.register('palm', function () { renderPalmReport(lastPalm); });

  // ===== 星座 / 塔罗 / 紫微 / 五格 / MBTI / 称骨 =====
  // 同一模式：正文 t()，标题不 t()，register 当前结果的纯重绘函数
  */

  // ---------- 3. 推荐的「译」按钮行为 ----------
  /*
  // 在结果卡角落放一个小按钮（文案保持中文，例如「译」或「EN」）
  // <button type="button" id="btnTranslateContent" class="no-lang-restore">译</button>
  document.getElementById('btnTranslateContent')?.addEventListener('click', function (e) {
    e.stopPropagation(); // 防止被「点击任意处还原」立刻吃掉
    if (window.isEnglishView && window.isEnglishView()) {
      window.exitEnglishView();
    } else {
      window.enterEnglishView();
    }
    // 触发重绘
    document.dispatchEvent(new CustomEvent('yumiao:content-lang-change', {
      detail: { lang: window.isEnglishView() ? 'en' : 'zh' }
    }));
  });
  */

  // ---------- 4. 页面就绪时绑定「点击任意处还原」 ----------
  /*
  document.addEventListener('DOMContentLoaded', function () {
    if (window.yumiaoI18n && window.yumiaoI18n.bindClickAnywhereToRestore) {
      window.yumiaoI18n.bindClickAnywhereToRestore({
        excludeSelector: 'button, a, input, textarea, select, [contenteditable], .no-lang-restore, #btnTranslateContent'
      });
    }
  });
  */
})();
