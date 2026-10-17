// ============================================================
// 全局错误边界（原在 08 星盘模块里，随星盘懒加载才生效；现独立并最先加载）
// 未捕获异常 / Promise 拒绝 → 软恢复，不白屏
// 注意：本文件内的空 catch 是有意的——错误边界自身出错时必须静默，避免递归。
// ============================================================
(function () {
  'use strict';
  if (window.__yumiaoGuardInstalled) return;
  window.__yumiaoGuardInstalled = true;
  (function installGlobalErrorBoundary() {
    let lastGuardAt = 0;
    const GUARD_COOLDOWN_MS = 1500;
    function isBenignMessage(msg) {
      if (!msg) return false;
      const s = String(msg);
      // 浏览器扩展、ResizeObserver 等常见无害噪声
      return /ResizeObserver|Script error\.?$|chrome-extension:\/\/|moz-extension:\/\//i.test(s);
    }
    function softRecoverUI(reason) {
      const now = Date.now();
      if (now - lastGuardAt < GUARD_COOLDOWN_MS) return;
      lastGuardAt = now;
      try {
        const btn = document.getElementById('castBtn');
        if (btn) btn.disabled = false;
        const descEl = document.getElementById('resultDesc');
        if (descEl) {
          // 先判断是否处于加载/空态，再去掉 loading，避免误判
          const wasLoading = descEl.classList.contains('loading');
          const textNow = descEl.textContent || '';
          const loadingLike = wasLoading
            || /演化中|叩问神明/.test(textNow);
          descEl.classList.remove('loading');
          // 仅在加载中或空内容时写入护法示下，避免覆盖已有正常判词
          if (loadingLike || reason === 'force') {
            if (typeof renderOracleHTML === 'function' && typeof pickGuardianOracle === 'function') {
              descEl.innerHTML = renderOracleHTML(pickGuardianOracle('xiao', 'general'));
            } else {
              descEl.textContent = '护法示下：宜顺其自然，耐心等待天时。';
            }
          }
        }
        const titleEl = document.getElementById('resultTitle');
        if (titleEl && !titleEl.textContent) {
          titleEl.textContent = '天机含蓄';
          titleEl.className = 'result-title xiao';
        }
        // MBTI / 八字按钮若被锁，尽量解锁
        const mbtiCast = document.getElementById('mbtiCastBtn');
        if (mbtiCast && mbtiCast.disabled) {
          // 不强制打开：仅在有完整答案时由业务逻辑启用
        }
        const baziRecast = document.getElementById('baziRecast');
        if (baziRecast) baziRecast.disabled = false;
      } catch (_) { /* 边界自身失败则放弃，避免递归 */ }
    }
    window.onerror = function (message, source, lineno, colno, error) {
      try {
        if (isBenignMessage(message) || isBenignMessage(error && error.message)) {
          return true;
        }
        console.warn('[yumiao] uncaught', message, error);
        softRecoverUI();
      } catch (_) {}
      // 返回 true 减少部分浏览器默认控制台噪音；开发仍可在 Sources 见断点
      return true;
    };
    window.onunhandledrejection = function (event) {
      try {
        const reason = event && event.reason;
        const msg = (reason && reason.message) ? reason.message : String(reason || '');
        if (isBenignMessage(msg)) {
          if (event && event.preventDefault) event.preventDefault();
          return;
        }
        console.warn('[yumiao] unhandled rejection', msg);
        // 已知的神谕链路错误已在 resolveOracle 内处理；若仍漏出则软恢复
        softRecoverUI();
        if (event && event.preventDefault) event.preventDefault();
      } catch (_) {}
    };
    // 页面卸载前释放，避免残留
    window.addEventListener('pagehide', function () {
      try {
        window.onerror = null;
        window.onunhandledrejection = null;
      } catch (_) {}
    });
  })();
})();
