// ============================================================
// 可选 Sentry 上报 + 全局错误边界
// 原始行号（拆分前单文件 script.js 中的位置）: 3637-3711
// ============================================================
  // ============================================================
  // 可选 Sentry：仅当配置了 DSN 时加载；未配置则完全 no-op
  // 用法：在本文件顶部或控制台执行
  //   window.YUMIAO_SENTRY_DSN = 'https://...@....ingest.sentry.io/...';
  // 然后再刷新页面。也可在下方 DEFAULT 处填入（留空=关闭）。
  // ============================================================
  const YUMIAO_SENTRY_DEFAULT_DSN = ''; // 需要时填入 DSN，留空则不启用
  window.YumiaoSentry = {
    enabled: false,
    captureException: function () {},
    captureMessage: function () {}
  };
  (function initOptionalSentry() {
    let dsn = '';
    try {
      dsn = (window.YUMIAO_SENTRY_DSN || YUMIAO_SENTRY_DEFAULT_DSN || '').trim();
    } catch (_) { dsn = ''; }
    if (!dsn) return;
    const BENIGN = /ResizeObserver|Script error\.?$|chrome-extension:\/\/|moz-extension:\/\//i;
    function wireSentry() {
      if (!window.Sentry || typeof window.Sentry.init !== 'function') return;
      try {
        window.Sentry.init({
          dsn: dsn,
          environment: (function () {
            try {
              const h = location.hostname || '';
              if (h === 'localhost' || h === '127.0.0.1') return 'development';
              if (!h) return 'local-file';
              return 'production';
            } catch (_) { return 'unknown'; }
          })(),
          // 本应用以 fail-soft 为主，性能追踪默认关闭
          tracesSampleRate: 0,
          beforeSend: function (event) {
            try {
              const vals = event && event.exception && event.exception.values;
              const msg = (vals && vals[0] && vals[0].value) || (event && event.message) || '';
              if (BENIGN.test(String(msg))) return null;
              // 不把用户问卜原文默认带出（隐私）
              if (event.request) {
                delete event.request.data;
              }
            } catch (_) {}
            return event;
          }
        });
        window.YumiaoSentry = {
          enabled: true,
          captureException: function (err, ctx) {
            try { window.Sentry.captureException(err, ctx || undefined); } catch (_) {}
          },
          captureMessage: function (msg, level) {
            try { window.Sentry.captureMessage(String(msg), level || 'info'); } catch (_) {}
          }
        };
      } catch (_) {
        // init 失败则保持 no-op，不影响主流程
      }
    }
    // 已存在全局 Sentry（例如外部先注入）则直接 wire
    if (window.Sentry && window.Sentry.init) {
      wireSentry();
      return;
    }
    // 动态加载官方 Browser SDK（失败则静默）
    try {
      const s = document.createElement('script');
      s.src = 'https://browser.sentry-cdn.com/8.41.0/bundle.min.js';
      s.crossOrigin = 'anonymous';
      s.onload = function () { wireSentry(); };
      s.onerror = function () { /* 无网络或被拦：保持 no-op */ };
      document.head.appendChild(s);
    } catch (_) {}
  })();
