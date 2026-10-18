// ============================================================
// 御猫灵局 · 中央音效系统（Web Audio 全合成，无外部音频文件）
// 职责：① iOS 音频解锁 ② 各类点击/弹窗音效 ③ 尊重「仪式音效」开关
// 用法：YumiaoSound.tap() / .open() / .close() / .yi() / .select()
// ============================================================
(function () {
  'use strict';
  var LS_SOUND = 'yumiao_sound_v1';
  var ctx = null;
  var unlocked = false;

  function enabled() {
    try { return localStorage.getItem(LS_SOUND) !== 'off'; } catch (_) { return true; }
  }
  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  /* ── iOS 解锁：首次手势内创建并 resume；切回前台再 resume ── */
  function unlock() {
    if (unlocked) { try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (_) {} return; }
    try {
      var c = ac();
      if (c) {
        // 播放一段极短静音，强制 iOS 放行
        var buf = c.createBuffer(1, 1, c.sampleRate);
        var src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        src.start(0);
        unlocked = true;
      }
    } catch (_) {}
  }
  if (typeof document !== 'undefined') {
    ['pointerdown', 'touchend'].forEach(function (ev) {
      document.addEventListener(ev, unlock, { capture: true, passive: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (_) {} }
    });
  }

  /* ── 合成 helpers ── */
  function tone(freq, t, dur, vol, type) {
    var c = ac();
    if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function knock(t, freq, vol) { // 木鱼/竹板：短促
    var c = ac();
    if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.07);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.1);
  }

  var S = {
    enabled: enabled,
    unlock: unlock,
    /* 轻点：底栏 tab、普通按钮 */
    tap: function () {
      if (!enabled()) return;
      try { var c = ac(); if (!c) return; knock(c.currentTime, 740, 0.16); } catch (_) {}
    },
    /* 弹窗开：上行双音 */
    open: function () {
      if (!enabled()) return;
      try {
        var c = ac(); if (!c) return; var t = c.currentTime;
        tone(523.25, t, 0.28, 0.14); tone(783.99, t + 0.07, 0.34, 0.12);
      } catch (_) {}
    },
    /* 弹窗关：下行单音 */
    close: function () {
      if (!enabled()) return;
      try {
        var c = ac(); if (!c) return; var t = c.currentTime;
        tone(659.25, t, 0.2, 0.1); tone(523.25, t + 0.06, 0.24, 0.09);
      } catch (_) {}
    },
    /* 周易开：古琴拨弦 */
    yi: function () {
      if (!enabled()) return;
      try {
        var c = ac(); if (!c) return; var t = c.currentTime;
        [196, 293.66, 392].forEach(function (f, i) {
          var o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
          o.type = 'sawtooth'; o.frequency.value = f;
          fl.type = 'lowpass'; fl.frequency.value = 900;
          var st = t + i * 0.12;
          g.gain.setValueAtTime(0.0001, st);
          g.gain.exponentialRampToValueAtTime(0.16, st + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, st + 0.9);
          o.connect(fl); fl.connect(g); g.connect(c.destination);
          o.start(st); o.stop(st + 1);
        });
      } catch (_) {}
    },
    /* 选中：清脆小铃 */
    select: function () {
      if (!enabled()) return;
      try {
        var c = ac(); if (!c) return; var t = c.currentTime;
        tone(1567.98, t, 0.5, 0.1); tone(2093, t + 0.05, 0.6, 0.07);
      } catch (_) {}
    },
    /* 子弹窗：更轻的一声 */
    pop: function () {
      if (!enabled()) return;
      try { var c = ac(); if (!c) return; tone(880, c.currentTime, 0.18, 0.09); } catch (_) {}
    }
  };

  /* ── 全局挂钩 ── */
  function hook() {
    // 1) 所有 ModalUI 弹窗：开/关自动音效
    try {
      if (typeof ModalUI !== 'undefined' && ModalUI && !ModalUI._yumiaoSoundHooked) {
        ModalUI._yumiaoSoundHooked = true;
        var oOpen = ModalUI.open, oClose = ModalUI.close;
        ModalUI.open = function () { S.open(); return oOpen.apply(ModalUI, arguments); };
        ModalUI.close = function () { S.close(); return oClose.apply(ModalUI, arguments); };
      }
    } catch (_) {}
    // 2) 底栏 tab 点击
    try {
      document.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('.tab') : null;
        if (t) S.tap();
      }, { capture: false, passive: true });
    } catch (_) {}
    // 3) 周易打开
    try {
      if (typeof window.openYi === 'function' && !window.openYi._yumiaoSoundHooked) {
        var oYi = window.openYi;
        var nYi = function () { S.yi(); return oYi.apply(window, arguments); };
        nYi._yumiaoSoundHooked = true;
        window.openYi = nYi;
      }
    } catch (_) {}
    // 4) openSheet 系弹窗（每日运程/会员/声明）：开/关音效
    try {
      [['openDailySheet', 'open'], ['closeDailySheet', 'close'],
       ['openMemberSheet', 'open'], ['closeMemberSheet', 'close'],
       ['openDisclaimer', 'open'], ['closeDisclaimer', 'close']].forEach(function (pair) {
        var fnName = pair[0], snd = pair[1];
        if (typeof window[fnName] === 'function' && !window[fnName]._yumiaoSoundHooked) {
          (function (orig, s) {
            var w = function () { S[s](); return orig.apply(window, arguments); };
            w._yumiaoSoundHooked = true;
            window[fnName] = w;
          })(window[fnName], snd);
        }
      });
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook);
  else hook();

  window.YumiaoSound = S;
})();
