/* 周易六爻 · UI（青灯古卷） */
(function () {
  'use strict';
  var C = window.YijingCore;

  var S = {
    lines: null, result: null,
    expanded: null, // 'trans' | 'app' | null
    casting: false,
    page: 'home' // 'home' | 'cast' | 'result'
  };

  function $(id) {
    return (typeof window.$ === 'function') ? window.$(id) : document.getElementById(id);
  }

  /* ---------- 卦象图 ---------- */
  function hexDiagram(lines) {
    var h = '<div class="yj-diagram">';
    for (var i = 5; i >= 0; i--) {
      var L = lines[i];
      h += '<div class="yj-dline' + (L.moving ? ' moving' : '') + '">' +
        '<span class="yj-yao">' + (L.yang ? '▬▬▬▬▬▬▬' : '▬▬▬&nbsp;&nbsp;&nbsp;▬▬▬') + '</span>' +
        (L.moving ? '<em>动</em>' : '') + '</div>';
    }
    return h + '</div>';
  }

  /* ---------- 页：主页 ---------- */
  function showHome() {
    S.page = 'home'; S.expanded = null;
    $('yiApp').innerHTML =
      '<div class="scroll-wrap"><div class="book">' +
      '<div class="book-title">周易六爻</div>' +
      '<div class="book-sub">三 钱 起 卦</div>' +
      '<div class="seal-big">' + sealChars('乾坤') + '</div>' +
      '<p class="book-desc">诚心正意，默念所问<br>三枚铜钱，六摇成卦</p>' +
      '<button class="btn-bronze" onclick="YijingUI.goCast()">起 卦</button>' +
      '<div class="book-foot">大衍之数五十，其用四十有九</div>' +
      '</div></div>' +
      lampHTML();
  }

  /* ---------- 页：摇卦 ---------- */
  function showCast() {
    S.page = 'cast'; S.casting = false; S.lines = null;
    // 已授权过则自动开启摇一摇
    var autoShake = false;
    try { autoShake = localStorage.getItem('yijing_shake_on') === '1'; } catch (_) {}
    $('yiApp').innerHTML =
      '<div class="scroll-wrap"><div class="book">' +
      '<button class="back" onclick="YijingUI.goHome()">‹ 返回</button>' +
      '<div class="book-title sm">诚心起卦</div>' +
      '<input id="yjQ" class="qinput" placeholder="默念所问之事（可不填）" maxlength="50">' +
      '<p class="hint">三钱摇六次，自下而上<br>○ 老阳为动 · × 老阴为动</p>' +
      '<div id="castArea" class="cast-area"></div>' +
      '<button id="castBtn" class="btn-bronze" onclick="YijingUI.startCast()">摇 卦</button>' +
      '<button id="shakeBtn" class="btn-ghost" onclick="YijingUI.enableShake()" style="' + (autoShake ? 'display:none' : '') + '">开启摇一摇</button>' +
      '<p id="shakeHint" class="hint" style="' + (autoShake ? '' : 'display:none') + '">摇动手机即可起卦</p>' +
      '</div></div>' +
      lampHTML();
    if (autoShake) window.YijingUI.enableShake(true);
  }

  /* ---------- 页：结果 ---------- */
  function showResult() {
    S.page = 'result';
    var r = S.result, hex = r.hex;
    var sn = C.shortName(hex);
    var h = '<div class="scroll-wrap"><div class="book result-book">';
    h += '<button class="back" onclick="YijingUI.goCast()">‹ 再摇</button>';
    // 印章 + 卦名
    h += '<div class="seal-row"><div class="seal">' + sealChars(hex.name) + '</div></div>';
    h += '<div class="hex-title">' + escapeHtml(sn) + ' <span class="hex-qian">' + escapeHtml(hex.qian) + '</span></div>';
    h += hexDiagram(S.lines);
    h += '<div class="rule">断法 · ' + escapeHtml(r.rule) + '</div>';
    // 原文：卦辞常显，爻辞折叠（主次分明）
    r.parts.forEach(function (p, idx) {
      if (idx === 0) {
        h += '<section class="sec"><h4>' + escapeHtml(p.t) + '</h4><p class="classical">' + escapeHtml(p.classical) + '</p></section>';
      } else {
        h += '<section class="sec fold' + (idx === 1 ? ' open' : '') + '">' +
          '<h4 onclick="YijingUI.fold(this)">' + escapeHtml(p.t) + '<span class="fold-arrow">▾</span></h4>' +
          '<div class="fold-body"><p class="classical">' + escapeHtml(p.classical) + '</p></div></section>';
      }
    });
    if (r.moving.length) {
      h += '<section class="sec"><h4>动爻</h4><p class="info">' +
        r.moving.map(function (i) { return C.YAO_NAMES[i] + '（' + S.lines[i].tag + '）'; }).join('、') + '</p></section>';
    }
    if (r.chex) {
      h += '<section class="sec"><h4>变卦</h4><p class="info">' + escapeHtml(r.chex.fullName) + '</p></section>';
    }
    // 两按钮
    h += '<div class="tab2">' +
      '<button class="' + (S.expanded === 'trans' ? 'on' : '') + '" onclick="YijingUI.toggle(\'trans\')">今译</button>' +
      '<button class="' + (S.expanded === 'app' ? 'on' : '') + '" onclick="YijingUI.toggle(\'app\')">今用</button>' +
      '</div><div id="expand"></div>';
    h += '<button class="btn-bronze" onclick="YijingUI.goCast()">再摇一卦</button>';
    h += '</div></div>' + lampHTML();
    $('yiApp').innerHTML = h;
    if (S.expanded) renderExpand();
  }

  function sealChars(name) {
    return String(name || '').split('').map(function (c) {
      return '<span>' + escapeHtml(C.toTrad(c)) + '</span>';
    }).join('');
  }

  function renderExpand() {
    var el = $('expand');
    if (!el) return;
    var r = S.result, h = '';
    if (S.expanded === 'trans') {
      h = '<div class="expand">';
      r.parts.forEach(function (p, idx) {
        if (idx === 0) {
          h += '<section class="sec"><h4>' + escapeHtml(p.t) + ' · 译</h4><p class="modern">' + escapeHtml(p.modern || '—') + '</p></section>';
        } else {
          h += '<section class="sec fold' + (idx === 1 ? ' open' : '') + '">' +
            '<h4 onclick="YijingUI.fold(this)">' + escapeHtml(p.t) + ' · 译<span class="fold-arrow">▾</span></h4>' +
            '<div class="fold-body"><p class="modern">' + escapeHtml(p.modern || '—') + '</p></div></section>';
        }
      });
      h += '</div>';
    } else if (S.expanded === 'app') {
      h = '<div class="expand"><section class="sec"><h4>今用</h4><div class="modern">' +
        escapeHtml(r.hex.meaning).replace(/\n/g, '<br>') + '</div></section></div>';
    }
    el.innerHTML = h;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- 孤灯 ---------- */
  function lampHTML() {
    return '<div class="lamp" aria-hidden="true">' +
      '<div class="lamp-glow"></div>' +
      '<div class="lamp-flame"><i></i></div>' +
      '<div class="lamp-smoke"><i></i><i></i><i></i></div>' +
      '<div class="lamp-body"></div>' +
      '<div class="lamp-base"></div>' +
      '</div>';
  }

  /* ---------- 铜钱声效（Web Audio 合成） ---------- */
  var AC = null;
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  function coinClick(delay, vol) {
    var ctx = ac(); if (!ctx) return;
    var t = ctx.currentTime + delay;
    // 金属碰击：高频振荡 + 快速衰减
    [5230, 7450, 9320].forEach(function (f, i) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f * (0.98 + Math.random() * 0.04);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol / (i + 1), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12 + Math.random() * 0.08);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.25);
    });
  }
  function playRattle() {
    // 一串铜钱碰击声
    for (var i = 0; i < 9; i++) {
      coinClick(i * 0.09 + Math.random() * 0.03, 0.16);
    }
  }

  /* ---------- 摇一摇感应 ---------- */
  var shakeOn = false, lastA = null, lastT = 0, shakeCount = 0, lastSnd = 0;
  // 摇动中发声：只要有明显晃动就响一声铜钱
  function shakeSound(mag) {
    var now = Date.now();
    if (mag > 10 && now - lastSnd > 180) {
      lastSnd = now;
      coinClick(0, 0.14);
    }
  }
  function onMotion(e) {
    if (!shakeOn || S.casting) return;
    if (S.page === 'result') { // 结果页摇一摇 → 自动再摇
      var a0 = e.accelerationIncludingGravity;
      if (!a0) return;
      var now0 = Date.now();
      if (now0 - lastT < 120) return;
      lastT = now0;
      if (lastA) {
        var dx = a0.x - lastA.x, dy = a0.y - lastA.y, dz = a0.z - lastA.z;
        var mg0 = Math.sqrt(dx*dx + dy*dy + dz*dz);
        shakeSound(mg0);
        if (mg0 > 22) {
          lastA = null; shakeCount = 0;
          playRattle();
          window.YijingUI.goCast();
          setTimeout(function(){ window.YijingUI.startCast(); }, 350);
          return;
        }
      }
      lastA = { x: a0.x, y: a0.y, z: a0.z };
      return;
    }
    if (S.page !== 'cast') return;
    var a = e.accelerationIncludingGravity;
    if (!a) return;
    var now = Date.now();
    if (now - lastT < 120) return;
    lastT = now;
    if (lastA) {
      var dx = a.x - lastA.x, dy = a.y - lastA.y, dz = a.z - lastA.z;
      var mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
      shakeSound(mag);
      if (mag > 22) { // 摇动阈值
        shakeCount++;
        playRattle();
        if (shakeCount >= 2) { // 连续摇两次触发
          shakeCount = 0;
          window.YijingUI.startCast();
        }
      }
    }
    lastA = { x: a.x, y: a.y, z: a.z };
  }

  /* ---------- 对外 ---------- */
  window.YijingUI = {
    goHome: showHome,
    goCast: function () { S.result = null; S.expanded = null; showCast(); },
    toggle: function (w) { S.expanded = (S.expanded === w) ? null : w; showResult(); },
    fold: function (el) {
      var sec = el.parentNode;
      sec.classList.toggle('open');
    },
    enableShake: function (silent) {
      function on() {
        shakeOn = true;
        try { localStorage.setItem('yijing_shake_on', '1'); } catch (_) {}
        var b = $('shakeBtn'); if (b) b.style.display = 'none';
        var h = $('shakeHint'); if (h) h.style.display = '';
        try { window.addEventListener('devicemotion', onMotion); } catch (_) {}
      }
      if (silent) {
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
          DeviceMotionEvent.requestPermission().then(function (r) {
            if (r === 'granted') on();
            else showBtn();
          }).catch(showBtn);
        } else { on(); }
        return;
      }
      function showBtn() {
        var b = $('shakeBtn'); if (b) b.style.display = '';
        var h = $('shakeHint'); if (h) h.style.display = 'none';
      }
      // iOS 13+ 需用户手势授权
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(function (r) {
          if (r === 'granted') on();
        }).catch(function () {});
      } else {
        on();
      }
    },
    startCast: function () {
      if (S.casting) return;
      S.casting = true;
      playRattle();
      var btn = $('castBtn'), area = $('castArea');
      if (btn) btn.disabled = true;
      if (area) area.innerHTML = '';
      var lines = [], idx = 0;
      (function next() {
        if (idx >= 6) {
          S.lines = lines;
          S.result = C.judge(lines);
          S.expanded = null;
          if (!S.result) {
            if (area) area.innerHTML = '<p class="err">起卦异常，请重试</p>';
            S.casting = false; if (btn) btn.disabled = false; return;
          }
          /* v2.21：起卦完成即回传主程序记入统一记录（toggle 再渲染不重复记） */
          if (typeof window.__yumiaoYiResult === 'function') {
            try {
              var _q = document.getElementById('yjQ');
              window.__yumiaoYiResult(S.result, S.lines, _q ? _q.value : '');
            } catch (_) {}
          }
          setTimeout(showResult, 700);
          return;
        }
        var L = C.castOneLine();
        lines.push(L);
        coinClick(0, 0.12);
        if (area) {
          var d = document.createElement('div');
          d.className = 'cast-line' + (L.moving ? ' mv' : '');
          d.innerHTML = '<span>' + C.YAO_NAMES[idx] + '</span><span>' + escapeHtml(L.coins) + '</span>' +
            '<span>' + escapeHtml(L.tag) + '</span><b>' + escapeHtml(L.sym) + (L.moving ? ' 动' : '') + '</b>';
          area.appendChild(d);
        }
        idx++;
        setTimeout(next, 520);
      })();
    }
  };

  document.addEventListener('DOMContentLoaded', showHome);
})();
