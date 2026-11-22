/* ============================================================
   御猫灵局 · 掌纹分析（js/17）
   一、图像：肤色分割 → 摆正 → 认左右手 → 掌纹（脊线）提取 → 追踪四条主线 → 量取特征
   二、算命：6 条纹路的传统解读（4 条可由照片识别，其余手动选择）
   三、掌诊：对照照片自查（颜色受光线影响，不做照片判色），含就医提示
   全部在本机完成：照片不上传、不保存，只存生成的文字报告（yumiao_ 前缀）。
   ============================================================ */
(function () {
  'use strict';

  // 本地小助手：优先用全局单点，无则本地兜底
  function $(id) {
    return (typeof window.$ === 'function') ? window.$(id) : document.getElementById(id);
  }

  /* ════════════════════════════════════════════════════════════
     A. 图像核心（纯数组运算，不碰 DOM，可在 Node 里直接测试）
     ════════════════════════════════════════════════════════════ */
  var PW = 640;                       /* 分析分辨率：长边缩到 640 */
  function clampN(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function tickAsync() { return new Promise(function (r) { setTimeout(r, 0); }); }

  /* —— 肤色分割（YCrCb 范围） —— */
  function skinMask(d, w, h) {
    var n = w * h, m = new Uint8Array(n);
    for (var i = 0, p = 0; i < n; i++, p += 4) {
      if (d[p + 3] < 128) continue;
      var r = d[p], g = d[p + 1], b = d[p + 2];
      var y = 0.299 * r + 0.587 * g + 0.114 * b;
      var cr = (r - y) * 0.713 + 128, cb = (b - y) * 0.564 + 128;
      if (cr > 133 && cr < 180 && cb > 77 && cb < 135 && y > 40) m[i] = 1;
    }
    return m;
  }
  /* 方框形态学（可分离；越界取边缘像素，贴边的手不会被"吃掉"） */
  function morph(m, w, h, rx, ry, isMax) {
    var t = new Uint8Array(m.length), o = new Uint8Array(m.length), x, y, k, v;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        v = isMax ? 0 : 1;
        for (k = -rx; k <= rx; k++) {
          var xx = clampN(x + k, 0, w - 1), q = m[y * w + xx];
          if (isMax) { if (q) { v = 1; break; } } else if (!q) { v = 0; break; }
        }
        t[y * w + x] = v;
      }
    }
    for (x = 0; x < w; x++) {
      for (y = 0; y < h; y++) {
        v = isMax ? 0 : 1;
        for (k = -ry; k <= ry; k++) {
          var yy = clampN(y + k, 0, h - 1), q2 = t[yy * w + x];
          if (isMax) { if (q2) { v = 1; break; } } else if (!q2) { v = 0; break; }
        }
        o[y * w + x] = v;
      }
    }
    return o;
  }
  function labelComps(m, w, h, minArea) {
    var n = w * h, lab = new Int32Array(n), comps = [], q = new Int32Array(n), id = 0;
    for (var s = 0; s < n; s++) {
      if (!m[s] || lab[s]) continue;
      id++; var qh = 0, qt = 0, area = 0, minX = w, maxX = 0, minY = h, maxY = 0, sx = 0, sy = 0;
      q[qt++] = s; lab[s] = id;
      while (qh < qt) {
        var c = q[qh++], cx = c % w, cy = (c / w) | 0;
        area++; sx += cx; sy += cy;
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx; if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        if (cx > 0 && m[c - 1] && !lab[c - 1]) { lab[c - 1] = id; q[qt++] = c - 1; }
        if (cx < w - 1 && m[c + 1] && !lab[c + 1]) { lab[c + 1] = id; q[qt++] = c + 1; }
        if (cy > 0 && m[c - w] && !lab[c - w]) { lab[c - w] = id; q[qt++] = c - w; }
        if (cy < h - 1 && m[c + w] && !lab[c + w]) { lab[c + w] = id; q[qt++] = c + w; }
      }
      if (area >= (minArea || 1)) comps.push({ id: id, area: area, minX: minX, maxX: maxX, minY: minY, maxY: maxY, cx: sx / area, cy: sy / area });
    }
    return { lab: lab, comps: comps };
  }
  function keepLargest(m, w, h) {
    var L = labelComps(m, w, h, 1);
    if (!L.comps.length) return { mask: new Uint8Array(m.length), area: 0 };
    var best = L.comps[0];
    for (var i = 1; i < L.comps.length; i++) if (L.comps[i].area > best.area) best = L.comps[i];
    var o = new Uint8Array(m.length);
    for (var k = 0; k < m.length; k++) if (L.lab[k] === best.id) o[k] = 1;
    return { mask: o, area: best.area };
  }
  function fillHoles(m, w, h) {
    var n = w * h, seen = new Uint8Array(n), q = new Int32Array(n), qh = 0, qt = 0, i;
    function push(p) { if (!m[p] && !seen[p]) { seen[p] = 1; q[qt++] = p; } }
    for (i = 0; i < w; i++) { push(i); push((h - 1) * w + i); }
    for (i = 0; i < h; i++) { push(i * w); push(i * w + w - 1); }
    while (qh < qt) {
      var c = q[qh++], cx = c % w, cy = (c / w) | 0;
      if (cx > 0) push(c - 1); if (cx < w - 1) push(c + 1); if (cy > 0) push(c - w); if (cy < h - 1) push(c + w);
    }
    var o = new Uint8Array(n);
    for (i = 0; i < n; i++) o[i] = (m[i] || !seen[i]) ? 1 : 0;
    return o;
  }
  /* 手的主轴方向：返回"手指所指方向相对正上方"的顺时针角（度），正值 = 手向右倾 */
  function pcaTilt(m, w, h) {
    var n = 0, sx = 0, sy = 0, i, x, y;
    for (i = 0; i < m.length; i++) if (m[i]) { sx += i % w; sy += (i / w) | 0; n++; }
    if (!n) return 0;
    var mx = sx / n, my = sy / n, cxx = 0, cyy = 0, cxy = 0;
    for (i = 0; i < m.length; i++) if (m[i]) { x = (i % w) - mx; y = ((i / w) | 0) - my; cxx += x * x; cyy += y * y; cxy += x * y; }
    cxx /= n; cyy /= n; cxy /= n;
    var ang = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    var ax = Math.cos(ang), ay = Math.sin(ang);
    if (ay > 0) { ax = -ax; ay = -ay; }
    return Math.atan2(ax, -ay) * 180 / Math.PI;
  }
  /* 逆时针旋转 deg 度（画布按需扩大，空白处 alpha=0），双线性插值 */
  function rotateRGBA(d, w, h, deg) {
    var th = deg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
    var nw = Math.ceil(Math.abs(w * c) + Math.abs(h * s)), nh = Math.ceil(Math.abs(w * s) + Math.abs(h * c));
    var o = new Uint8ClampedArray(nw * nh * 4), cx = w / 2, cy = h / 2, ncx = nw / 2, ncy = nh / 2;
    for (var y = 0; y < nh; y++) {
      for (var x = 0; x < nw; x++) {
        var px = x - ncx + 0.5, py = y - ncy + 0.5;
        var sx = px * c - py * s + cx - 0.5, sy = px * s + py * c + cy - 0.5;
        if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) continue;
        var x0 = sx | 0, y0 = sy | 0, x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1), fx = sx - x0, fy = sy - y0;
        var i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4, oo = (y * nw + x) * 4;
        for (var ch = 0; ch < 4; ch++) {
          o[oo + ch] = (d[i00 + ch] * (1 - fx) + d[i10 + ch] * fx) * (1 - fy) + (d[i01 + ch] * (1 - fx) + d[i11 + ch] * fx) * fy;
        }
      }
    }
    return { data: o, w: nw, h: nh };
  }
  function flipRGBA(d, w, h) {
    var o = new Uint8ClampedArray(d.length);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var a = (y * w + x) * 4, b = (y * w + (w - 1 - x)) * 4;
      o[a] = d[b]; o[a + 1] = d[b + 1]; o[a + 2] = d[b + 2]; o[a + 3] = d[b + 3];
    }
    return o;
  }
  function rot180RGBA(d, w, h) {
    var n = w * h, o = new Uint8ClampedArray(d.length);
    for (var i = 0; i < n; i++) {
      var a = i * 4, b = (n - 1 - i) * 4;
      o[a] = d[b]; o[a + 1] = d[b + 1]; o[a + 2] = d[b + 2]; o[a + 3] = d[b + 3];
    }
    return o;
  }
  /* 手指在上还是在下：指尖一端的行里会出现多段（4 根手指），手腕一端只有一段。看不出来返回 null */
  function fingersUp(mask, w, h) {
    var y0 = h, y1 = -1, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (mask[y * w + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (y1 < 0) return null;
    var bh = y1 - y0 + 1;
    function band(ya, yb) {
      var hit = 0, rows = 0;
      for (var yy = Math.round(ya); yy <= Math.round(yb); yy++) {
        var runs = 0, inRun = 0, len = 0;
        for (var xx = 0; xx < w; xx++) {
          if (mask[yy * w + xx]) { inRun = 1; len++; }
          else if (inRun) { if (len >= 5) runs++; inRun = 0; len = 0; }
        }
        if (inRun && len >= 5) runs++;
        rows++; if (runs >= 3) hit++;
      }
      return hit / Math.max(1, rows);
    }
    var top = band(y0, y0 + 0.3 * bh), bot = band(y1 - 0.3 * bh, y1);
    if (Math.abs(top - bot) < 0.05) return null;
    return top > bot;
  }
  function flipMask(m, w, h) {
    var o = new Uint8Array(m.length);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) o[y * w + x] = m[y * w + (w - 1 - x)];
    return o;
  }

  /* —— 可分离高斯与二阶导 —— */
  function gKernels(sig) {
    var r = Math.max(2, Math.ceil(3 * sig)), g = new Float32Array(2 * r + 1), g1 = new Float32Array(2 * r + 1), g2 = new Float32Array(2 * r + 1), s = 0, i;
    for (i = -r; i <= r; i++) { g[i + r] = Math.exp(-i * i / (2 * sig * sig)); s += g[i + r]; }
    for (i = -r; i <= r; i++) {
      g[i + r] /= s;
      g1[i + r] = -(i / (sig * sig)) * g[i + r];
      g2[i + r] = ((i * i - sig * sig) / (sig * sig * sig * sig)) * g[i + r];
    }
    return { r: r, g: g, g1: g1, g2: g2 };
  }
  function conv1(src, w, h, k, r, horiz) {
    var o = new Float32Array(w * h), x, y, j, acc;
    if (horiz) {
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        acc = 0;
        for (j = -r; j <= r; j++) acc += src[y * w + clampN(x + j, 0, w - 1)] * k[j + r];
        o[y * w + x] = acc;
      }
    } else {
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        acc = 0;
        for (j = -r; j <= r; j++) acc += src[clampN(y + j, 0, h - 1) * w + x] * k[j + r];
        o[y * w + x] = acc;
      }
    }
    return o;
  }
  function gaussBlur(src, w, h, sig) {
    var K = gKernels(sig);
    return conv1(conv1(src, w, h, K.g, K.r, true), w, h, K.g, K.r, false);
  }
  /* 谷（暗线）响应：Hessian 较大特征值，抑制斑点 */
  function valleyResponse(img, w, h, sig) {
    var K = gKernels(sig), n = w * h, i;
    var gx = conv1(img, w, h, K.g, K.r, true), g2x = conv1(img, w, h, K.g2, K.r, true), g1x = conv1(img, w, h, K.g1, K.r, true);
    var Lxx = conv1(g2x, w, h, K.g, K.r, false), Lyy = conv1(gx, w, h, K.g2, K.r, false), Lxy = conv1(g1x, w, h, K.g1, K.r, false);
    var out = new Float32Array(n), s2 = sig * sig;
    for (i = 0; i < n; i++) {
      var a = (Lxx[i] + Lyy[i]) / 2, dd = (Lxx[i] - Lyy[i]) / 2, t = Math.sqrt(dd * dd + Lxy[i] * Lxy[i]);
      var l1 = a + t, l2 = a - t;
      if (l1 <= 0) continue;
      var ratio = Math.abs(l2) / (Math.abs(l1) + 1e-6);
      out[i] = l1 * s2 * Math.exp(-ratio * ratio / 0.5);
    }
    return out;
  }
  function percentileOf(arr, idxMask, p) {
    var vals = [], i;
    for (i = 0; i < arr.length; i++) if (idxMask[i]) vals.push(arr[i]);
    if (!vals.length) return 1;
    vals.sort(function (a, b) { return a - b; });
    return vals[Math.min(vals.length - 1, Math.floor(vals.length * p))];
  }

  /* —— 最小代价路径（多源 Dijkstra，8 邻接） —— */
  function minPath(cost, w, h, starts, targets) {
    var n = w * h, dist = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
    var cap = 1 << 16, hd = new Float32Array(cap), hi = new Int32Array(cap), hs = 0;
    function push(d, i) {
      if (hs >= cap) { cap *= 2; var nd = new Float32Array(cap); nd.set(hd); hd = nd; var ni = new Int32Array(cap); ni.set(hi); hi = ni; }
      var c = hs++; while (c > 0) { var p = (c - 1) >> 1; if (hd[p] <= d) break; hd[c] = hd[p]; hi[c] = hi[p]; c = p; } hd[c] = d; hi[c] = i;
    }
    function pop() {
      var d = hd[0], i = hi[0], ld = hd[--hs], li = hi[hs], c = 0;
      while (true) { var l = 2 * c + 1; if (l >= hs) break; if (l + 1 < hs && hd[l + 1] < hd[l]) l++; if (hd[l] >= ld) break; hd[c] = hd[l]; hi[c] = hi[l]; c = l; }
      if (hs > 0) { hd[c] = ld; hi[c] = li; }
      return { d: d, i: i };
    }
    var k;
    for (k = 0; k < starts.length; k++) { var s = starts[k]; if (cost[s] < Infinity) { dist[s] = cost[s]; push(cost[s], s); } }
    var DX = [-1, 0, 1, -1, 1, -1, 0, 1], DY = [-1, -1, -1, 0, 0, 1, 1, 1], DW = [1.4142, 1, 1.4142, 1, 1, 1.4142, 1, 1.4142];
    var found = -1;
    while (hs > 0) {
      var e = pop(), u = e.i;
      if (e.d > dist[u]) continue;
      if (targets[u]) { found = u; break; }
      var ux = u % w, uy = (u / w) | 0;
      for (k = 0; k < 8; k++) {
        var vx = ux + DX[k], vy = uy + DY[k];
        if (vx < 0 || vy < 0 || vx >= w || vy >= h) continue;
        var v = vy * w + vx, cv = cost[v];
        if (cv === Infinity) continue;
        var nd2 = e.d + cv * DW[k];
        if (nd2 < dist[v]) { dist[v] = nd2; prev[v] = u; push(nd2, v); }
      }
    }
    if (found < 0) return null;
    var path = [], cur = found;
    while (cur >= 0) { path.push(cur); cur = prev[cur]; }
    path.reverse();
    return path;
  }
  function smoothPoints(pts, win) {
    var o = [], half = win >> 1;
    for (var i = 0; i < pts.length; i++) {
      var a = Math.max(0, i - half), b = Math.min(pts.length - 1, i + half), sx = 0, sy = 0;
      for (var j = a; j <= b; j++) { sx += pts[j].x; sy += pts[j].y; }
      o.push({ x: sx / (b - a + 1), y: sy / (b - a + 1) });
    }
    return o;
  }

  /* —— 掌心几何：以手指缝底部定位掌心上沿（约定：拇指在左、小指在右） —— */
  function palmFrame(mask, w, h) {
    var bx0 = w, bx1 = 0, by0 = h, by1 = 0, i, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (mask[y * w + x]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    var bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
    var kw = Math.max(7, Math.round(0.105 * bw) | 1);
    var closed = morph(morph(mask, w, h, kw >> 1, 0, true), w, h, kw >> 1, 0, false);
    var gaps = new Uint8Array(mask.length);
    for (i = 0; i < gaps.length; i++) gaps[i] = (closed[i] && !mask[i]) ? 1 : 0;
    var G = labelComps(gaps, w, h, 40), gapMax = -1, gapCx = [];
    G.comps.forEach(function (c) {
      if (c.minY < by0 + 0.35 * bh) { gapCx.push(c.cx); if (c.maxY > gapMax) gapMax = c.maxY; }
    });
    gapCx.sort(function (a, b) { return a - b; });
    var nGaps = gapCx.length;
    var y0 = nGaps >= 2 ? gapMax + 0.09 * bw : by0 + 0.45 * bh;
    var yMid = Math.min(y0 + 0.35 * bw, by1 - 4);
    var xL = w, xR = 0, yy = Math.round(yMid);
    for (x = 0; x < w; x++) if (mask[yy * w + x]) { if (x < xL) xL = x; if (x > xR) xR = x; }
    if (xR - xL < 0.3 * bw) { xL = bx0; xR = bx1; }
    return {
      box: { x0: bx0, x1: bx1, y0: by0, y1: by1, w: bw, h: bh },
      y0: y0, xL: xL, xR: xR, Wp: xR - xL, nGaps: nGaps, gapCx: gapCx,
      cropped: {
        thumb: bx0 <= 2, ulnar: bx1 >= w - 3, tips: by0 <= 2,
        wrist: by1 >= h - 3 && (by1 - y0) < 1.15 * (xR - xL)
      }
    };
  }
  /* 认拇指在哪一侧：小指比食指短，指尖更低；两端手指指尖都被裁切时返回 null */
  function thumbSideOf(mask, w, h, F) {
    if (F.nGaps < 2) return null;
    var cx = F.gapCx, bx0 = F.box.x0, bx1 = F.box.x1, x, y;
    function topOf(xa, xb) {
      var best = h;
      for (x = Math.max(0, Math.round(xa)); x <= Math.min(w - 1, Math.round(xb)); x++) {
        for (y = 0; y < h; y++) if (mask[y * w + x]) { if (y < best) best = y; break; }
      }
      return best;
    }
    var tl = topOf(bx0, cx[0]), tr = topOf(cx[cx.length - 1], bx1);
    if (tl <= 2 && tr <= 2) return null;
    if (Math.abs(tl - tr) < 0.03 * F.box.h) return null;
    return tr > tl ? 'R' : 'L';              /* 指尖更低的一端是小指，拇指在另一端；返回的是手：掌心朝镜头时拇指在画面左 = 右手 */
  }
  function zoneRect(x0, x1, y0, y1) { return { x0: Math.round(x0), x1: Math.round(x1), y0: Math.round(y0), y1: Math.round(y1) }; }
  function zonesFor(F, h) {
    var Wp = F.Wp, xL = F.xL, xR = F.xR, y0 = F.y0, yb = Math.min(F.box.y1, h - 1);
    return {
      heart: [zoneRect(xR - .22 * Wp, xR - .01 * Wp, y0 + .08 * Wp, y0 + .5 * Wp), zoneRect(xL + .22 * Wp, xL + .68 * Wp, y0 + .0 * Wp, y0 + .22 * Wp)],
      head: [zoneRect(xL + .0 * Wp, xL + .26 * Wp, y0 + .18 * Wp, y0 + .55 * Wp), zoneRect(xR - .22 * Wp, xR - .0 * Wp, y0 + .35 * Wp, y0 + .98 * Wp)],
      life: [zoneRect(xL + .15 * Wp, xL + .5 * Wp, y0 + .0 * Wp, y0 + .35 * Wp), zoneRect(xL + .0 * Wp, xL + .6 * Wp, yb - .12 * Wp, yb)],
      fate: [zoneRect(xL + .36 * Wp, xL + .68 * Wp, yb - .2 * Wp, yb), zoneRect(xL + .42 * Wp, xL + .74 * Wp, y0 + .02 * Wp, y0 + .3 * Wp)]
    };
  }
  function zoneIdx(z, domain, w, h) {
    var out = [];
    for (var y = Math.max(0, z.y0); y <= Math.min(h - 1, z.y1); y++) for (var x = Math.max(0, z.x0); x <= Math.min(w - 1, z.x1); x++) if (domain[y * w + x]) out.push(y * w + x);
    return out;
  }

  /* —— 量取单条纹路的特征（长度按掌宽归一） —— */
  function measureLine(pts, R, w, F) {
    var Wp = F.Wp, n = pts.length, i, len = 0, sumR = 0, ok = 0;
    for (i = 1; i < n; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    for (i = 0; i < n; i++) { var r = R[Math.round(pts[i].y) * w + Math.round(pts[i].x)]; sumR += r; if (r > 0.15) ok++; }
    var a = pts[0], b = pts[n - 1], chord = Math.hypot(b.x - a.x, b.y - a.y) || 1, maxDev = 0;
    for (i = 0; i < n; i++) {
      var dev = Math.abs((b.x - a.x) * (a.y - pts[i].y) - (a.x - pts[i].x) * (b.y - a.y)) / chord;
      if (dev > maxDev) maxDev = dev;
    }
    var yBase = F.y0;
    return {
      lenRel: len / Wp, meanR: sumR / n, cont: ok / n, sinu: len / chord, bulge: maxDev / chord,
      chordDeg: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI,
      start: { u: (a.x - F.xL) / Wp, v: (a.y - yBase) / Wp }, end: { u: (b.x - F.xL) / Wp, v: (b.y - yBase) / Wp }
    };
  }
  function confOf(m) {
    if (m.meanR >= 0.6 && m.cont >= 0.85) return 3;
    if (m.meanR >= 0.42 && m.cont >= 0.7) return 2;
    return 1;
  }
  var CONF_LABEL = { 3: '清晰', 2: '一般', 1: '模糊' };

  /* —— 丘位纹理密度（v2.16 解读层钩子）：各丘位区内 R>0.2 的占比。
     区域按摆正后标准坐标划（u = (x-xL)/Wp，v = (y-y0)/Wp，拇指在左）；数值为纹理疏密，不是隆起程度。 */
  var MOUNT_ZONES = {
    venus: [0.00, 0.45, 0.30, 0.85], jupiter: [0.05, 0.30, 0.00, 0.28], saturn: [0.30, 0.55, 0.00, 0.28],
    sun: [0.55, 0.78, 0.00, 0.28], mercury: [0.78, 1.00, 0.00, 0.28], luna: [0.72, 1.00, 0.45, 0.85],
    mars: [0.38, 0.68, 0.30, 0.55]
  };
  function measureMounts(R, w, h, F, palmMask) {
    var out = {}, Wp = F.Wp, id, z, x0, x1, y0, y1, x, y, tot, hit, ii;
    for (id in MOUNT_ZONES) {
      z = MOUNT_ZONES[id];
      x0 = Math.max(0, Math.round(F.xL + z[0] * Wp)); x1 = Math.min(w - 1, Math.round(F.xL + z[1] * Wp));
      y0 = Math.max(0, Math.round(F.y0 + z[2] * Wp)); y1 = Math.min(h - 1, Math.round(F.y0 + z[3] * Wp));
      tot = 0; hit = 0;
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
        ii = y * w + x;
        if (palmMask[ii]) { tot++; if (R[ii] > 0.2) hit++; }
      }
      out[id] = tot >= 20 ? Math.round((hit / tot) * 100) / 100 : 0;
    }
    return out;
  }

  /* —— 总流程（异步分段，便于界面显示进度） ——
     rgba: 缩放后的像素；opts.hand: 'L'|'R'（认不出拇指方向时的兜底：左手掌心朝镜头 = 拇指在右） */
  async function analyzeImage(rgba, w, h, opts) {
    opts = opts || {}; var prog = opts.onProgress || function () {};
    var res = { ok: false, reason: '', notes: [] }, i;
    prog('找手掌');
    var m0 = skinMask(rgba, w, h), frac0 = 0;
    for (i = 0; i < m0.length; i++) frac0 += m0[i];
    frac0 /= m0.length;
    var m1 = morph(morph(m0, w, h, 2, 2, false), w, h, 2, 2, true);
    var big = keepLargest(m1, w, h);
    if (frac0 < 0.06 || big.area < 0.08 * w * h) { res.reason = 'nohand'; return res; }
    var mask = fillHoles(morph(morph(big.mask, w, h, 3, 3, true), w, h, 3, 3, false), w, h);
    var tilt = pcaTilt(mask, w, h);
    await tickAsync(); prog('摆正手掌');
    var rot = rotateRGBA(rgba, w, h, tilt), rw = rot.w, rh = rot.h;
    function maskOf(data) {
      var mm = morph(morph(skinMask(data, rw, rh), rw, rh, 2, 2, false), rw, rh, 2, 2, true);
      return fillHoles(morph(morph(keepLargest(mm, rw, rh).mask, rw, rh, 3, 3, true), rw, rh, 3, 3, false), rw, rh);
    }
    var rmask = maskOf(rot.data);
    if (fingersUp(rmask, rw, rh) === false) {                 /* 手指朝下（或横拍转过来后朝下）：转 180° */
      rot = { data: rot180RGBA(rot.data, rw, rh), w: rw, h: rh };
      rmask = maskOf(rot.data);
      res.notes.push('turned');
    }
    var F0 = palmFrame(rmask, rw, rh);
    var side = thumbSideOf(rmask, rw, rh, F0), sideGuess = false;
    if (!side) { side = opts.hand === 'R' ? 'R' : 'L'; sideGuess = true; res.notes.push('thumbGuess'); }
    var work = rot.data, F = F0;
    if (side === 'L') {                                       /* 左手（拇指在画面右）：整幅镜像，统一成"拇指在左"再分析 */
      work = flipRGBA(rot.data, rw, rh);
      rmask = flipMask(rmask, rw, rh);
      F = palmFrame(rmask, rw, rh);
    }
    res.thumbSide = side; res.thumbGuess = sideGuess;
    res.handLabel = side === 'L' ? '左' : '右';              /* 掌心朝向镜头，拇指在画面右侧 = 左手 */
    if (F.Wp < 0.5 * F.box.w || F.Wp < 0.12 * rw || (F.box.y1 - F.y0) < 0.5 * F.Wp) { res.reason = 'palmcut'; return res; }
    if (F.nGaps < 2) res.notes.push('fingersClosed');
    if (F.cropped.thumb || F.cropped.ulnar) res.notes.push('sideCut');
    if (F.cropped.wrist) res.notes.push('wristCut');
    await tickAsync(); prog('提取掌纹');
    var n = rw * rh, g = new Float32Array(n), sum = 0, cnt = 0;
    for (i = 0; i < n; i++) if (rmask[i]) { sum += work[i * 4 + 1]; cnt++; }
    var meanG = sum / cnt;
    for (i = 0; i < n; i++) g[i] = rmask[i] ? work[i * 4 + 1] : meanG;
    var bg = gaussBlur(g, rw, rh, 16), n1 = new Float32Array(n);
    for (i = 0; i < n; i++) n1[i] = g[i] - bg[i];
    var inside = morph(rmask, rw, rh, 6, 6, false);
    var R = new Float32Array(n), sigs = [1.6, 2.4, 3.4];
    for (var si = 0; si < sigs.length; si++) {
      var vr = valleyResponse(n1, rw, rh, sigs[si]);
      for (i = 0; i < n; i++) if (vr[i] > R[i]) R[i] = vr[i];
      await tickAsync();
    }
    var palmMask = new Uint8Array(n), rowTop = Math.max(0, Math.round(F.y0 - 0.02 * F.Wp));
    for (var y = rowTop; y < rh; y++) for (var x = 0; x < rw; x++) { var ii = y * rw + x; if (inside[ii]) palmMask[ii] = 1; }
    var p99 = percentileOf(R, palmMask, 0.99) || 1;
    res.sharp = p99;
    if (p99 < 7) { res.reason = 'lowcontrast'; return res; }
    for (i = 0; i < n; i++) R[i] = palmMask[i] ? clampN(R[i] / p99, 0, 1) : 0;
    res.mounts = measureMounts(R, rw, rh, F, palmMask);   /* v2.16：丘位密度，供自动解读 */
    await tickAsync(); prog('追踪主线');
    var cost = new Float32Array(n);
    for (i = 0; i < n; i++) cost[i] = palmMask[i] ? 0.03 + Math.pow(1 - R[i], 3) : Infinity;
    var Z = zonesFor(F, rh), lines = {}, paths = {};
    function trace(key, costArr) {
      var st = zoneIdx(Z[key][0], palmMask, rw, rh), tg = zoneIdx(Z[key][1], palmMask, rw, rh);
      if (!st.length || !tg.length) return null;
      var tgm = new Uint8Array(n); tg.forEach(function (t) { tgm[t] = 1; });
      var path = minPath(costArr, rw, rh, st, tgm);
      return (path && path.length >= 12) ? path : null;
    }
    var MINLEN = { heart: 0.28, head: 0.3, life: 0.4, fate: 0.25 };   /* 比这还短，多半是追到了一小段杂纹 */
    function finish(key, path) {
      if (!path) { lines[key] = { found: false }; return; }
      var pts = smoothPoints(path.map(function (p) { return { x: p % rw, y: (p / rw) | 0 }; }), 9);
      var ms = measureLine(pts, R, rw, F);
      if (ms.lenRel < MINLEN[key]) { lines[key] = { found: false }; return; }
      ms.found = true; ms.conf = confOf(ms); ms.pts = pts;
      lines[key] = ms;
    }
    ['heart', 'head', 'life'].forEach(function (k) { paths[k] = trace(k, cost); finish(k, paths[k]); });
    /* 事业线：避开已找到的生命线（否则两条会走同一条沟），重叠过多则放弃 */
    var near = new Uint8Array(n), RAD = 4;
    if (paths.life) paths.life.forEach(function (p) {
      var px = p % rw, py = (p / rw) | 0;
      for (var dy = -RAD; dy <= RAD; dy++) for (var dx = -RAD; dx <= RAD; dx++) {
        var qx = px + dx, qy = py + dy;
        if (qx >= 0 && qy >= 0 && qx < rw && qy < rh) near[qy * rw + qx] = 1;
      }
    });
    var cost2 = new Float32Array(cost);
    for (i = 0; i < n; i++) if (near[i] && cost2[i] < Infinity) cost2[i] = cost2[i] * 4 + 0.6;
    paths.fate = trace('fate', cost2);
    if (paths.fate) {
      var shared = 0;
      paths.fate.forEach(function (p) { if (near[p]) shared++; });
      if (shared / paths.fate.length > 0.35) paths.fate = null;
    }
    finish('fate', paths.fate);
    var dens = 0, pc = 0;
    for (i = 0; i < n; i++) if (palmMask[i]) { pc++; if (R[i] > 0.2) dens++; }
    res.density = dens / Math.max(1, pc);
    res.ok = true; res.lines = lines; res.frame = F; res.tilt = tilt;
    /* 审计修复：自动解读（17b）按规范空间（拇指在左）的 frame 取区域，必须配规范空间的线与响应图；
       下面的翻回只用于展示。原先把翻回后的数据与规范 frame 混用，右手（拇指在右）照片的所罗门环区域落到小指一侧，恒为 0。 */
    res.linesC = {}; Object.keys(lines).forEach(function (k) { res.linesC[k] = lines[k]; });
    res.ridgeC = { R: R, w: rw, h: rh };
    /* 展示图：保持原样（拇指在右时翻回），线坐标同步翻回 */
    res.show = { data: rot.data, w: rw, h: rh };
    if (side === 'L') Object.keys(lines).forEach(function (k) {
      if (lines[k].found) { lines[k] = Object.assign({}, lines[k]); lines[k].pts = lines[k].pts.map(function (p) { return { x: rw - 1 - p.x, y: p.y }; }); }
    });
    /* v2.16：把归一化响应图交给解读层做特殊纹检测；拇指在右时同步翻回，与线坐标同空间 */
    if (side === 'L') {
      var Rf = new Float32Array(n), yy, xx;
      for (yy = 0; yy < rh; yy++) for (xx = 0; xx < rw; xx++) Rf[yy * rw + xx] = R[yy * rw + (rw - 1 - xx)];
      res.ridge = { R: Rf, w: rw, h: rh };
    } else {
      res.ridge = { R: R, w: rw, h: rh };
    }
    res.skinFrac = frac0;
    return res;
  }

  /* ════════════════════════════════════════════════════════════
     A2. v2.17 地标驱动识别
     MediaPipe 21 点 → 以（腕、食指掌指关节、小指掌指关节）三点把掌心从原始高清图直接裁成标准掌心图
     → 局部对比归一 + 粗尺度纹线响应（压住细碎皱纹）→ 只保留“又长又连续”的纹
     → 按解剖端点区域 + 宽走廊，用最小代价路径追踪四条主线。
     ════════════════════════════════════════════════════════════ */
  var CR = { W: 760, H: 700, ux: 180, wm: 400, uy: 60, wy: 600 };     /* 标准掌心图：食指根(180,60)、小指根(580,60)、腕(380,600) */
  function crX(u) { return CR.ux + u * CR.wm; }
  function crY(s) { return CR.uy + s * (CR.wy - CR.uy); }
  /* 走向参考（u 横向：0=食指掌指关节、1=小指掌指关节；s 纵向：0=掌指关节线、1=腕横纹；拇指在左）。只做宽走廊的中轴，不硬套 */
  var TPL = {
    heart: [[1.12, .28], [.92, .22], [.68, .20], [.44, .20], [.24, .22]],
    head:  [[.05, .26], [.30, .32], [.55, .42], [.82, .54], [1.05, .62]],
    life:  [[.05, .26], [.14, .42], [.22, .62], [.30, .82], [.40, .98]],
    fate:  [[.50, 1.00], [.50, .80], [.52, .60], [.52, .42], [.50, .26]]
  };
  /* 起止端点区域 [u0,u1,s0,s1]：宽松，只说明“大致从哪到哪”，具体走向由纹线自己决定 */
  var ENDS = {
    heart: [[1.02, 1.30, 0.10, 0.55], [0.00, 0.22, 0.05, 0.40]],
    head:  [[-0.30, 0.18, 0.12, 0.45], [0.95, 1.30, 0.38, 0.90]],
    life:  [[-0.30, 0.18, 0.12, 0.45], [0.10, 0.70, 0.80, 0.98]],
    fate:  [[0.30, 0.70, 0.80, 0.98], [0.35, 0.65, 0.10, 0.32]]
  };
  function loadFullCanvas(file) {
    var MAXS = 1800;
    function fromSrc(src, sw, sh) {
      var s = Math.min(1, MAXS / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * s)), h = Math.max(1, Math.round(sh * s));
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d', { willReadFrequently: true }).drawImage(src, 0, 0, w, h);
      return { cv: cv, w: w, h: h };
    }
    function viaImg() {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () { try { var o = fromSrc(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); resolve(o); } catch (e) { URL.revokeObjectURL(url); reject(e); } };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
        img.src = url;
      });
    }
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
        try { return fromSrc(bmp, bmp.width, bmp.height); }
        finally { if (bmp.close) bmp.close(); } /* 成功/抛错都释放位图 */
      }, viaImg);
    }
    return viaImg();
  }
  function distSeg(px, py, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, t = L2 ? ((px - a.x) * dx + (py - a.y) * dy) / L2 : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
  }
  /* 到折线距离² / σ²（走廊罚项），只在给定框内计算 */
  function corridorPen(poly, w, h, x0, x1, y0, y1, sigma) {
    var pen = new Float32Array(w * h), x, y, k, d, best, s2 = sigma * sigma;
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      best = 1e9;
      for (k = 1; k < poly.length; k++) { d = distSeg(x, y, poly[k - 1], poly[k]); if (d < best) best = d; }
      pen[y * w + x] = (best * best) / s2;
    }
    return pen;
  }
  async function analyzeLM(full, lm, side, opts) {
    opts = opts || {}; var prog = opts.onProgress || function () {};
    var RC = window.YumiaoPalmRectify;
    if (!RC || !RC.solveAffine || !lm || lm.length < 21) return null;
    var res = { ok: false, reason: '', notes: [], engine: 'lm' }, i, x, y;
    var W = CR.W, H = CR.H, n = W * H;
    prog('裁切掌心');
    var P = function (k) { return [lm[k].x * full.w, lm[k].y * full.h]; };
    var xA = CR.ux, xB = CR.ux + CR.wm;
    /* 无论拇指在哪侧，都映射成“拇指在左”的标准图（拇指在右时自然成为镜像，展示时翻回） */
    var dst = [[(xA + xB) / 2, CR.wy], [xA, CR.uy], [xB, CR.uy]];
    var m = RC.solveAffine([P(0), P(5), P(17)], dst);
    if (!m) return null;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.drawImage(full.cv, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var work = ctx.getImageData(0, 0, W, H).data;
    var L = lm.map(function (q, k) { var p = P(k); return { x: m[0] * p[0] + m[2] * p[1] + m[4], y: m[1] * p[0] + m[3] * p[1] + m[5] }; });
    await tickAsync(); prog('划定掌心');
    /* 掌心区域：肤色 ∩ 掌指关节线以下；扣掉拇指指节 */
    var sm = skinMask(work, W, H);
    sm = morph(morph(sm, W, H, 2, 2, false), W, H, 2, 2, true);
    var kl = keepLargest(sm, W, H);
    var skin = fillHoles(morph(morph(kl.mask, W, H, 3, 3, true), W, H, 3, 3, false), W, H);
    var dom = new Uint8Array(n), cnt = 0, capR = 0.16 * CR.wm, t3 = L[3], t4 = L[4];
    var yWrist = Math.round(crY(0.98));     /* 腕横纹以下是手腕，不属于掌心 */
    for (y = CR.uy - 6; y <= yWrist; y++) for (x = 0; x < W; x++) {
      if (!skin[y * W + x]) continue;
      if (distSeg(x, y, t3, t4) < capR) continue;
      dom[y * W + x] = 1; cnt++;
    }
    if (cnt < 0.4 * CR.wm * CR.wm) {          /* 肤色分割失败（偏色、过曝）：退回多边形 */
      dom.fill(0); cnt = 0;
      var poly = [[130, 60], [640, 60], [665, 330], [620, 560], [540, 640], [300, 640], [190, 560], [110, 330]];
      for (y = 60; y <= yWrist; y++) for (x = 0; x < W; x++) {
        var inP = false;
        for (var a = 0, b = poly.length - 1; a < poly.length; b = a++) {
          if (((poly[a][1] > y) !== (poly[b][1] > y)) && (x < (poly[b][0] - poly[a][0]) * (y - poly[a][1]) / (poly[b][1] - poly[a][1]) + poly[a][0])) inP = !inP;
        }
        if (inP) { dom[y * W + x] = 1; cnt++; }
      }
      res.notes.push('polyDomain');
    }
    /* 区域边缘（肤色/背景交界、掌指线上沿）会产生很强的假纹：往里缩一圈 */
    var dom2 = morph(dom, W, H, 13, 13, false);
    for (y = 0; y < CR.uy + 14; y++) for (x = 0; x < W; x++) dom2[y * W + x] = 0;
    await tickAsync(); prog('提取掌纹');
    var g = new Float32Array(n), sum = 0;
    for (i = 0; i < n; i++) { g[i] = work[i * 4 + 1]; if (dom[i]) sum += g[i]; }
    var meanG = sum / Math.max(1, cnt);
    for (i = 0; i < n; i++) if (!dom[i]) g[i] = meanG;
    /* 清晰度：原图细节（σ≈1.6 以内的高频）能量占中频能量的比例；糊图细纹被抹掉，比值低 */
    var gs = gaussBlur(g, W, H, 1.6), gm = gaussBlur(g, W, H, 5), eHi = 0, eMid = 0;
    for (i = 0; i < n; i++) if (dom2[i]) { var dh = g[i] - gs[i], dmid = gs[i] - gm[i]; eHi += dh * dh; eMid += dmid * dmid; }
    res.sharpness = eHi / (eMid + 1e-6);
    var bg = gaussBlur(g, W, H, 18), n1 = new Float32Array(n), sq = new Float32Array(n);
    for (i = 0; i < n; i++) { n1[i] = g[i] - bg[i]; sq[i] = n1[i] * n1[i]; }
    var sdL = gaussBlur(sq, W, H, 40), sdSum = 0;
    for (i = 0; i < n; i++) if (dom[i]) sdSum += sdL[i];
    var sdG = Math.sqrt(sdSum / Math.max(1, cnt)) + 1e-3;
    for (i = 0; i < n; i++) n1[i] = n1[i] / (0.5 * Math.sqrt(sdL[i]) + 0.5 * sdG);   /* 局部对比归一：明暗不均、偏糊都更稳 */
    function multiScale(sigs) {
      var out = new Float32Array(n);
      for (var si = 0; si < sigs.length; si++) {
        var vr = valleyResponse(n1, W, H, sigs[si]);
        for (var q = 0; q < n; q++) if (vr[q] > out[q]) out[q] = vr[q];
      }
      return out;
    }
    var R = multiScale([2.0, 3.0]);               /* 细尺度：纹理疏密、特殊纹 */
    await tickAsync();
    var RM = multiScale([3.4, 4.6, 6.0]);         /* 粗尺度：只留主线，压住拇指根的细密皱纹 */
    await tickAsync();
    var p99 = percentileOf(R, dom2, 0.99) || 1, pm99 = percentileOf(RM, dom2, 0.99) || 1;
    res.sharp = res.sharpness * 60;           /* 与旧口径同量级（<13 提示偏糊） */
    for (i = 0; i < n; i++) {
      R[i] = dom2[i] ? clampN(R[i] / p99, 0, 1) : 0;
      RM[i] = dom2[i] ? clampN(RM[i] / pm99, 0, 1) : 0;
    }
    /* 长纹滞后阈值：含强点且足够长的连通块才算“主线候选”，其余杂纹降权 */
    var weak = new Uint8Array(n), strong = new Uint8Array(n), hasStrong = {}, areaOf = {}, longM = new Uint8Array(n);
    for (i = 0; i < n; i++) { if (RM[i] > 0.22) weak[i] = 1; if (RM[i] > 0.45) strong[i] = 1; }
    var CC = labelComps(weak, W, H, 1);
    CC.comps.forEach(function (c) { areaOf[c.id] = c.area; });
    for (i = 0; i < n; i++) if (strong[i] && CC.lab[i] > 0) hasStrong[CC.lab[i]] = true;
    for (i = 0; i < n; i++) { var lb = CC.lab[i]; if (lb > 0 && hasStrong[lb] && areaOf[lb] >= 700) longM[i] = 1; }
    var RT = new Float32Array(n);
    for (i = 0; i < n; i++) RT[i] = longM[i] ? RM[i] : RM[i] * 0.4;
    /* 标准框架（与旧 palmFrame 同语义，供量测/丘位/解读层复用）；掌长、指长按原图关键点实测 */
    var Wm = CR.wm, Wp = 1.25 * Wm, y0 = crY(0);
    var dpx = function (a, b) { return Math.hypot((lm[a].x - lm[b].x) * full.w, (lm[a].y - lm[b].y) * full.h); };
    var wmReal = dpx(5, 17) || 1, palmLenRel = dpx(0, 9) / (1.25 * wmReal), fingLenRel = dpx(9, 12) / (1.25 * wmReal);
    var F = {
      xL: crX(-.15), xR: crX(1.10), Wp: Wp, y0: y0, nGaps: 3, gapCx: [],
      box: { x0: 0, x1: W - 1, y0: y0 - fingLenRel * Wp, y1: y0 + palmLenRel * Wp, w: W, h: H },
      cropped: { thumb: false, ulnar: false, tips: false, wrist: false }
    };
    /* 审计修复：此前 LM 路径的裁切警告写死为 false，手掌贴边/手腕出框时不提示。
       这里只按关键点是否贴近原图边缘追加提示（不改 F.cropped，避免影响量测结果）。 */
    try {
      var _edge = false;
      [0, 1, 2, 3, 4, 5, 9, 13, 17].forEach(function (k) { if (lm[k] && (lm[k].x < 0.012 || lm[k].x > 0.988)) _edge = true; });
      if (_edge) res.notes.push('sideCut');
      if (lm[0] && lm[0].y > 0.985) res.notes.push('wristCut');
    } catch (_) {}
    res.mounts = measureMounts(R, W, H, F, dom);
    await tickAsync(); prog('追踪主线');
    var lines = {}, paths = {}, sigma = 0.30 * CR.wm, LAM = 0.10;
    function rectIdx(r) {
      var out = [], xa = Math.round(crX(r[0])), xb = Math.round(crX(r[1])), ya = Math.round(crY(r[2])), yb = Math.round(crY(r[3]));
      for (var yy = Math.max(0, ya); yy <= Math.min(H - 1, yb); yy++) for (var xx = Math.max(0, xa); xx <= Math.min(W - 1, xb); xx++) if (dom2[yy * W + xx]) out.push(yy * W + xx);
      return out;
    }
    function trace(key, extra) {
      var poly = TPL[key].map(function (q) { return { x: crX(q[0]), y: crY(q[1]) }; });
      var xs = poly.map(function (q) { return q.x; }), ys = poly.map(function (q) { return q.y; }), pad = Math.round(3 * sigma);
      var bx0 = clampN(Math.floor(Math.min.apply(null, xs)) - pad, 0, W - 1), bx1 = clampN(Math.ceil(Math.max.apply(null, xs)) + pad, 0, W - 1);
      var by0 = clampN(Math.floor(Math.min.apply(null, ys)) - pad, 0, H - 1), by1 = clampN(Math.ceil(Math.max.apply(null, ys)) + pad, 0, H - 1);
      var pen = corridorPen(poly, W, H, bx0, bx1, by0, by1, sigma), cost = new Float32Array(n).fill(Infinity);
      for (y = by0; y <= by1; y++) for (x = bx0; x <= bx1; x++) {
        var q = y * W + x;
        if (!dom2[q] || pen[q] > 9) continue;
        var c = 0.03 + Math.pow(1 - RT[q], 3) + LAM * pen[q];
        if (extra && extra[q]) c = c * 4 + 0.6;
        cost[q] = c;
      }
      var st = rectIdx(ENDS[key][0]), tg = rectIdx(ENDS[key][1]);
      if (!st.length || !tg.length) return null;
      var tgm = new Uint8Array(n); tg.forEach(function (t) { tgm[t] = 1; });
      var path = minPath(cost, W, H, st, tgm);
      return (path && path.length >= 12) ? path : null;
    }
    var MINLEN = { heart: 0.28, head: 0.3, life: 0.4, fate: 0.25 };
    function finish(key, path) {
      if (!path) { lines[key] = { found: false }; return; }
      var pts = smoothPoints(path.map(function (p) { return { x: p % W, y: (p / W) | 0 }; }), 9);
      /* 端点区域放得远，路径两头可能拖着没有纹的尾巴：按局部响应把弱尾巴剪掉 */
      var rv = pts.map(function (q) { return RM[Math.round(q.y) * W + Math.round(q.x)]; });
      var loc = function (k) { var a = Math.max(0, k - 12), b = Math.min(rv.length - 1, k + 12), t = 0; for (var j = a; j <= b; j++) t += rv[j]; return t / (b - a + 1); };
      var lo = 0, hi = pts.length - 1;
      while (lo < hi && loc(lo) < 0.16) lo++;
      while (hi > lo && loc(hi) < 0.16) hi--;
      pts = pts.slice(lo, hi + 1);
      if (pts.length < 12) { lines[key] = { found: false }; return; }
      var ms = measureLine(pts, RM, W, F);
      if (ms.lenRel < MINLEN[key]) { lines[key] = { found: false }; return; }
      ms.found = true; ms.conf = confOf(ms); ms.pts = pts;
      lines[key] = ms;
    }
    paths.life = trace('life'); finish('life', paths.life);
    var near = new Uint8Array(n), RAD = 5;
    if (paths.life) paths.life.slice(Math.floor(paths.life.length * 0.22)).forEach(function (p) {
      var px = p % W, py = (p / W) | 0;
      for (var dy = -RAD; dy <= RAD; dy++) for (var dx = -RAD; dx <= RAD; dx++) {
        var qx = px + dx, qy = py + dy;
        if (qx >= 0 && qy >= 0 && qx < W && qy < H) near[qy * W + qx] = 1;
      }
    });
    /* 感情线、智慧线、事业线都不许顺着生命线走（否则几条会挤在同一道沟里） */
    paths.heart = trace('heart', near); finish('heart', paths.heart);
    paths.head = trace('head', near); finish('head', paths.head);
    /* 调整（按真实照片）：感情线与智慧线有时会挤进同一道沟里（两条线重合成一条）。
       重合时：先让智慧线避开感情线重追一次；仍然重合就把感情线降为「看不清」，不再给出肯定的自动解读。 */
    function overlapFrac(a, b) {
      if (!a || !b || !a.pts || !b.pts) return 0;
      var hit = 0, step = Math.max(1, Math.floor(a.pts.length / 60)), tot = 0;
      for (var ia = 0; ia < a.pts.length; ia += step) {
        tot++;
        for (var ib = 0; ib < b.pts.length; ib += 2) { if (Math.abs(a.pts[ia].x - b.pts[ib].x) < 7 && Math.abs(a.pts[ia].y - b.pts[ib].y) < 7) { hit++; break; } }
      }
      return tot ? hit / tot : 0;
    }
    if (lines.heart && lines.heart.found && lines.head && lines.head.found &&
        Math.max(overlapFrac(lines.heart, lines.head), overlapFrac(lines.head, lines.heart)) > 0.5) {
      var near2 = new Uint8Array(near);
      (paths.heart || []).forEach(function (p) {
        var px = p % W, py = (p / W) | 0;
        for (var dy = -RAD; dy <= RAD; dy++) for (var dx = -RAD; dx <= RAD; dx++) {
          var qx = px + dx, qy = py + dy;
          if (qx >= 0 && qy >= 0 && qx < W && qy < H) near2[qy * W + qx] = 1;
        }
      });
      var oldHead = lines.head, oldHeadPath = paths.head;
      paths.head = trace('head', near2); finish('head', paths.head);
      if (!lines.head || !lines.head.found) { lines.head = oldHead; paths.head = oldHeadPath; }
      if (Math.max(overlapFrac(lines.heart, lines.head), overlapFrac(lines.head, lines.heart)) > 0.5) {
        lines.heart = Object.assign({}, lines.heart, { conf: Math.min(lines.heart.conf, 1), overlap: true });
        res.notes.push('heartHeadMerged');
      }
    }
    paths.fate = trace('fate', near);
    if (paths.fate) {
      var shared = 0; paths.fate.forEach(function (p) { if (near[p]) shared++; });
      if (shared / paths.fate.length > 0.35) paths.fate = null;
    }
    finish('fate', paths.fate);
    var dens = 0;
    for (i = 0; i < n; i++) if (dom2[i] && R[i] > 0.2) dens++;
    res.density = dens / Math.max(1, cnt);
    res.ok = true; res.lines = lines; res.frame = F; res.tilt = 0; res.skinFrac = kl.area / n;
    res.thumbSide = side; res.thumbGuess = false; res.handLabel = side === 'L' ? '左' : '右';
    /* 审计修复：保留规范空间（拇指在左）的线与响应图供自动解读使用，见 analyzeImage 同名注释 */
    res.linesC = {}; Object.keys(lines).forEach(function (k) { res.linesC[k] = lines[k]; });
    res.ridgeC = { R: R, w: W, h: H };
    /* 展示图与坐标：拇指原本在右时翻回原方向，线与响应图同步翻回 */
    if (side === 'L') {
      res.show = { data: flipRGBA(work, W, H), w: W, h: H };
      Object.keys(lines).forEach(function (k) {
        if (lines[k].found) { lines[k] = Object.assign({}, lines[k]); lines[k].pts = lines[k].pts.map(function (p) { return { x: W - 1 - p.x, y: p.y }; }); }
      });
      var Rf = new Float32Array(n), yy, xx;
      for (yy = 0; yy < H; yy++) for (xx = 0; xx < W; xx++) Rf[yy * W + xx] = R[yy * W + (W - 1 - xx)];
      res.ridge = { R: Rf, w: W, h: H };
    } else {
      res.show = { data: work, w: W, h: H };
      res.ridge = { R: R, w: W, h: H };
    }
    return res;
  }

  /* —— 特征 → 选项（返回 -1 = 没把握，交给用户选） —— */
  function autoPick(key, m) {
    if (!m || !m.found) return -1;
    if (key === 'life') {
      if (m.conf < 2) return -1;
      if (m.cont < 0.78) return 3;
      if (m.conf === 3 && m.lenRel >= 0.75) return 0;
      return m.lenRel >= 0.6 ? 1 : 2;
    }
    if (key === 'heart') {
      if (m.conf < 2) return -1;
      if (m.cont < 0.8) return 4;
      var long_ = m.end.u <= 0.5, curved = m.bulge >= 0.09;
      return long_ ? (curved ? 0 : 1) : (curved ? 2 : 3);
    }
    if (key === 'head') {
      if (m.conf < 2) return -1;
      if (m.lenRel < 0.5) return 2;
      if (m.cont < 0.8) return 3;
      return m.chordDeg >= 30 ? 1 : 0;
    }
    if (key === 'fate') {
      if (m.conf === 3) return 0;
      if (m.conf === 2) return 1;
      return -1;
    }
    return -1;
  }

  /* v2.18：引导卡片显示规则（纯函数）：失败必显示；成功但四条主线未全自动选中、或有警告时显示；全清才隐藏 */
  function palmGuideNeeded(ok, autoCount, warnsLen) {
    if (!ok) return true;
    return autoCount < 4 || warnsLen > 0;
  }
  /* v2.18：线条画法（纯函数）：lm 引擎下看不清（conf<2）的线画灰色虚线；旧引擎保持原行为（found 画、未 found 不画） */
  function palmLineStyle(engine, m) {
    if (!m || !m.found) return { draw: false, greyDash: false };
    if (engine === 'lm' && m.conf < 2) return { draw: true, greyDash: true };
    return { draw: true, greyDash: false };
  }
  /* v3.0：引导并成一套（palmGuideSet 内含拍摄提示卡 + 对照图）；容器与按钮同开同关；诊断模式下恒关 */
  function renderGuide(show) {
    if (ST && ST.mode !== 'fortune') show = false;
    var el = $('palmGuideSet'); if (el) el.hidden = !show;
    var b = $('palmGuideBtn'); if (b) b.classList.toggle('on', !!show);
  }

  /* ════════════════════════════════════════════════════════════
     B. 内容：算命（纹路 → 选项 → 解读）与掌诊
     选项：[标题, 一句特质, 解读, 小建议]
     ════════════════════════════════════════════════════════════ */
  var LINES = [
    { id: 'life', name: '生命线', desc: '环绕拇指根部的弧线，主精力与根基', color: '#5da88a', opts: [
      ['长而深', '精力充沛', '生命线绵长而深，主精力充沛、根基扎实，做事耐力足，中年之后运势趋于平稳。', '保持规律作息，把精力用在长线的事情上。'],
      ['清晰连贯', '根基稳', '生命线清晰连贯，主一生起伏有度，遇事多能化险为夷，身边常有贵人相助。', '遇到难题先稳住节奏，贵人往往在你坚持时出现。'],
      ['短而浅', '宜养精蓄锐', '生命线短而浅，传统主先天精力偏弱，宜作息有节、劳逸结合，持之以恒则可补其不足。', '给自己留出恢复的时间，不要连续透支。'],
      ['断续不连', '阶段感强', '生命线断续不连，主人生阶段感强，中年前后会有一段转折期，量力而行、稳住节奏即可平顺度过。', '重大决定前多留一段缓冲期，每年做一次体检。'],
      ['末端分叉', '晚年多彩', '生命线末端分叉，主晚年多变化，或有迁居、远行之象，亦主人生后段活动圈广、人缘开阔。', '尝试拓展新的圈子和兴趣，不必固守一处。']
    ] },
    { id: 'heart', name: '感情线', desc: '掌上部的横线，主情感与人际', color: '#c0574a', opts: [
      ['长而弯', '重情重义', '感情线长而微弯，主重情重义、感情丰富，待人温厚，容易得人缘。', '把心里在意的话说出口，关系会更亲近。'],
      ['长而直', '感情稳重', '感情线长而平直，主感情稳定、重承诺，表达偏含蓄，细水长流。', '偶尔主动表达，让在乎的人听得见。'],
      ['短而弯', '感情热烈', '感情线短而弯，主感情热烈直接，来得快，宜多些耐心经营关系。', '下判断前先慢半拍，给彼此一点时间。'],
      ['短而直', '内敛理性', '感情线短而直，主理性内敛，不轻易表露，缘分宜晚成，越相处越见真心。', '不急着定义关系，多相处，缘分自会显现。'],
      ['断续不连', '感情有起伏', '感情线断续不连，主感情路有起伏，宜多沟通、少猜测，磨合之后反而更稳固。', '遇到误会先开口沟通，不要靠猜。'],
      ['末端分叉', '人缘广', '感情线末端分叉，主人缘旺、情感面广，宜专一用心，方能得到踏实的缘分。', '广结善缘的同时，认准重要的人用心经营。']
    ] },
    { id: 'head', name: '智慧线', desc: '掌中部的横线，主思维与才智', color: '#e8c766', opts: [
      ['长而直', '思虑周密', '智慧线长而平直，主思虑周密、逻辑清晰，适合实务、管理、经营一类的工作。', '重要决定先写下利弊再定，条理就是你的优势。'],
      ['弯而向下', '直觉敏锐', '智慧线弯而向下，主想象丰富、感受敏锐，直觉强，适合文艺、创意、设计之业。', '随手记录灵感，再用数据检验一遍。'],
      ['短而浅', '干脆果断', '智慧线短而浅，主行事干脆、重当下，宜多留一步思考的余地，再付诸行动。', '行动之前多问一句"还缺什么"。'],
      ['断续不连', '思路活跃', '智慧线断续不连，主思路活跃但易分心，宜把大事拆小、逐项收尾。', '把大目标拆成小步骤，逐项完成。'],
      ['末端分叉', '多才多艺', '智慧线末端分叉，主多才多艺、思路活泼，宜发展一两项副业，兼顾理性与感性。', '挑一项副业认真做出成果，不要只停在想法。']
    ] },
    { id: 'fate', name: '事业线', desc: '由掌根向中指的纵线，主事业走向', color: '#f3ead3', opts: [
      ['深而直上', '目标明确', '事业线深而直上，主目标明确，事业稳步攀升，中年以后成就渐显，贵人扶持。', '把长期目标拆成年度小目标，稳步推进。'],
      ['浅而断续', '事业多变', '事业线浅而断续，主事业多变、阶段性转换，宜以自身积累为本，屡试屡进终有所成。', '每次转换都沉淀一项可迁移的技能。'],
      ['不明显', '不拘一格', '掌中事业线不明显，主自由洒脱、不拘一格，宜自主安排生计，机缘到时水到渠成。', '自由之中也要有方向，给自己设一条底线目标。'],
      ['起自生命线', '白手起家', '事业线起自生命线，主白手起家、靠自身奋斗立业，晚景丰足。', '靠自己积累的口碑和作品，比关系更可靠。']
    ] },
    { id: 'marriage', name: '婚姻线', desc: '小指下方掌缘的短横线（选填）', manual: true, opts: [
      ['一条深长', '感情专一', '婚姻线一条深长，主感情专一，婚姻美满，宜携手长久。', ''],
      ['多条浅短', '缘分多', '婚姻线多条浅短，主异性缘多，婚事宜晚，晚婚更稳。', ''],
      ['末端分叉', '需要体谅', '婚姻线末端分叉，主夫妻偶有口角，宜互相体谅，家和万事兴。', '']
    ] },
    { id: 'sun', name: '太阳线', desc: '无名指下方的纵线（选填）', manual: true, opts: [
      ['清晰深长', '名声财运佳', '太阳线清晰深长，主名声财运俱佳，晚年尤为显达。', ''],
      ['浅短或无', '淡泊名利', '太阳线浅短或无，主名利淡泊，宜修身养性，财来有道。', '']
    ] }
  ];
  var LINE_BY_ID = {}; LINES.forEach(function (l) { LINE_BY_ID[l.id] = l; });
  var CORE_IDS = ['life', 'heart', 'head', 'fate'];

  /* 掌诊：[标题, 关注度, 传统说法, 建议]；关注度 ok 常见 / watch 可留意 / doctor 建议就医检查 */
  var DIAG = [
    { id: 'color', name: '掌色', desc: '掌心整体颜色，请在自然光下对照', opts: [
      ['红润均匀', 'ok', '掌色红润均匀，传统认为气血调和。', '保持规律作息与适度运动。'],
      ['偏白', 'watch', '掌色偏白，传统认为多与气血偏虚、受寒或疲劳有关；室温低、刚洗过手也会如此。', '注意保暖，规律饮食，保证睡眠；若长期畏寒乏力、常头晕，可请医生查血常规。'],
      ['偏暗红', 'watch', '掌色偏暗红，传统认为多见于上火、熬夜、血行不畅；饮酒或刚运动后也常如此。', '少熬夜、少辛辣烟酒，多喝水；长期持续请体检时留意。'],
      ['偏黄', 'watch', '掌色偏黄，传统认为与脾胃运化有关；大量吃胡萝卜、橙子等也会让手掌发黄。', '先排除饮食影响；如果眼白或皮肤同时明显发黄，请尽快就医检查。'],
      ['发青发紫', 'doctor', '掌色发青发紫，传统认为多与受寒、血行不畅有关；天冷时短暂出现较常见。', '先到温暖处观察；在温暖环境下仍持续发紫，或伴气短、胸闷，请尽快就医。']
    ] },
    { id: 'temp', name: '掌温', desc: '掌心温度', opts: [
      ['温热', 'ok', '掌温温热，传统认为气血通畅、阳气充足。', ''],
      ['偏凉', 'watch', '掌温偏凉，传统认为阳气偏弱、手足易凉，也常见于紧张、久坐或室温低。', '注意保暖，睡前温水泡脚，多活动手脚促进循环。'],
      ['潮热多汗', 'watch', '掌心潮热多汗，传统认为与内热或脾虚湿盛有关；紧张、天热时也会出现。', '饮食清淡，规律作息；长期多汗影响生活时，建议请医生检查。']
    ] },
    { id: 'thenar', name: '大鱼际', desc: '拇指根部的隆起，传统主脾胃', opts: [
      ['饱满红润', 'ok', '大鱼际饱满红润，传统认为脾胃功能较好、消化吸收佳。', ''],
      ['偏薄偏白', 'watch', '大鱼际偏薄偏白，传统认为脾胃偏弱；近期消瘦、劳累也会使其变薄。', '少食多餐，细嚼慢咽；近期体重不明原因下降时，请就医检查。'],
      ['青筋显露', 'watch', '大鱼际青筋显露，传统认为多与受寒、肠胃积滞有关；皮肤偏薄的人也常见。', '饮食清淡，少吃生冷，适度运动。']
    ] },
    { id: 'hypo', name: '小鱼际', desc: '小指一侧的掌缘隆起，传统主精力', opts: [
      ['饱满红润', 'ok', '小鱼际饱满红润，传统认为精力较充沛。', ''],
      ['偏平偏白', 'watch', '小鱼际偏平偏白，传统认为精力偏弱；久坐少动、睡眠不足也会如此。', '早睡养精神，每周坚持几次中等强度运动。']
    ] },
    { id: 'fingers', name: '手指', desc: '手指形态与指尖', opts: [
      ['修长灵活', 'ok', '手指修长灵活，传统认为气血通达、关节灵便。', ''],
      ['指节粗大', 'watch', '指节粗大，常与关节劳损、受凉有关，阴雨天更明显。', '注意手部保暖，避免长时间重复用力；晨起关节僵硬超过半小时，建议就医。'],
      ['指尖发白发凉', 'watch', '指尖发白发凉，传统认为末梢气血不足；遇冷时短暂出现较常见。', '多活动手指、按摩手部；若遇冷反复变白变紫并伴疼痛，请就医。']
    ] },
    { id: 'nails', name: '指甲', desc: '指甲颜色与纹理', opts: [
      ['红润光滑', 'ok', '指甲红润光滑，传统认为气血充足、肝血调和。', ''],
      ['偏白无光', 'watch', '指甲偏白无光，传统认为血虚；缺铁、营养不足或长期劳累也可能表现为指甲变白变脆。', '保证睡眠与均衡饮食；长期如此，可请医生检查是否缺铁。'],
      ['纵纹多', 'ok', '指甲纵纹多，随年龄增长很常见，传统认为与劳累、肝血不足有关。', '多休息，注意补水。'],
      ['月牙少', 'ok', '月牙少或不明显，个体差异很大，通常无需担心。', '规律作息，均衡营养。'],
      ['暗色竖条或变形', 'doctor', '指甲上出现深褐或黑色竖条、明显增厚或变形，需要由医生判断原因。', '尤其是单个指甲上的深色竖条逐渐变宽，请尽快就医检查，不要自行判断。']
    ] }
  ];
  var DOCTOR_IF = [
    '同一处异常持续两周以上，或在逐渐加重',
    '手指遇冷反复变白、变紫，并伴有疼痛',
    '指甲出现单条深色竖带，或明显增厚、变形',
    '掌心、眼白或皮肤明显发黄',
    '手部异常的同时，出现胸闷气短、持续乏力或体重不明原因下降',
    '任何让你担心的变化，直接咨询医生都比自行判断可靠'
  ];
  var LV_LABEL = { ok: '常见', watch: '可留意', doctor: '建议就医检查' };

  /* 报告生成（纯函数，便于测试） */
  function dateText() {
    var d = new Date();
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function handNote(hand, sex) {
    var base = '传统取手之法：男看左手、女看右手，左手主先天、右手主后天。';
    if (sex === 'M') return base + '依据档案，宜以左手为主' + (hand === '左' ? '（本次所拍正是左手）' : '，可再拍一次左手对照') + '。';
    if (sex === 'F') return base + '依据档案，宜以右手为主' + (hand === '右' ? '（本次所拍正是右手）' : '，可再拍一次右手对照') + '。';
    return base;
  }
  function buildFortune(sel, hand, sex) {
    var picked = [];
    LINES.forEach(function (l) { var i = sel[l.id]; if (i != null && i >= 0 && l.opts[i]) picked.push({ l: l, o: l.opts[i] }); });
    if (!picked.length) return null;
    var tags = picked.map(function (p) { return p.o[1]; });
    var html = '<div class="mbti-type">掌纹算命</div>' +
      '<p class="palm-meta">' + escapeHtml(hand) + '手 · ' + escapeHtml(dateText()) + '</p>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">总评</span>此掌特点：' + escapeHtml(tags.join('、')) + '。以下逐线解读，仅供参考。</div>';
    var text = '掌纹算命 · ' + hand + '手 · ' + dateText() + '\n\n总评：' + tags.join('、') + '\n\n';
    picked.forEach(function (p) {
      html += '<div class="mbti-sec"><span class="mbti-sec-label">' + escapeHtml(p.l.name) + ' · ' + escapeHtml(p.o[0]) + '</span>' + escapeHtml(p.o[2]) + '</div>';
      text += p.l.name + ' · ' + p.o[0] + '\n' + p.o[2] + '\n\n';
    });
    var tips = [];
    picked.forEach(function (p) { if (p.o[3] && tips.length < 3) tips.push(p.o[3]); });
    if (tips.length) {
      html += '<div class="mbti-sec"><span class="mbti-sec-label">小建议</span>' + tips.map(function (t, i) { return (i + 1) + '. ' + escapeHtml(t); }).join('<br>') + '</div>';
      text += '小建议\n' + tips.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n') + '\n\n';
    }
    var hn = handNote(hand, sex);
    html += '<div class="mbti-sec palm-handnote">' + escapeHtml(hn) + '</div>' +
      '<div class="mbti-brief-note">掌纹解读源自传统手相，仅供娱乐与自我反思，不构成任何决策建议。</div>';
    text += hn + '\n（掌纹解读源自传统手相，仅供娱乐，不构成任何决策建议。）';
    return { html: html, text: text };
  }
  function buildDiag(sel, hand) {
    var picked = [], worst = 'ok';
    DIAG.forEach(function (d) { var i = sel[d.id]; if (i != null && i >= 0 && d.opts[i]) { picked.push({ d: d, o: d.opts[i] }); } });
    if (!picked.length) return null;
    var rank = { ok: 0, watch: 1, doctor: 2 };
    picked.forEach(function (p) { if (rank[p.o[1]] > rank[worst]) worst = p.o[1]; });
    var sum = worst === 'doctor' ? '所选项目中有需要请医生确认的外观，请优先看下方"建议就医检查"的条目。'
      : worst === 'watch' ? '所选项目大多属于常见变化，其中几项值得留意，见下方说明。'
      : '所选项目均属常见、无需特别担心的外观。';
    var html = '<div class="mbti-type">掌诊自查</div>' +
      '<p class="palm-meta">' + escapeHtml(hand) + '手 · ' + escapeHtml(dateText()) + '</p>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">整体</span>' + escapeHtml(sum) + '</div>';
    var text = '掌诊自查 · ' + hand + '手 · ' + dateText() + '\n\n整体：' + sum + '\n\n';
    picked.forEach(function (p) {
      html += '<div class="mbti-sec"><span class="mbti-sec-label">' + escapeHtml(p.d.name) + ' · ' + escapeHtml(p.o[0]) + '</span>' +
        '<span class="palm-lv ' + p.o[1] + '">' + LV_LABEL[p.o[1]] + '</span><br>' + escapeHtml(p.o[2]) +
        (p.o[3] ? '<br><b class="palm-adv">建议：</b>' + escapeHtml(p.o[3]) : '') + '</div>';
      text += p.d.name + ' · ' + p.o[0] + '（' + LV_LABEL[p.o[1]] + '）\n' + p.o[2] + (p.o[3] ? '\n建议：' + p.o[3] : '') + '\n\n';
    });
    html += '<div class="mbti-sec"><span class="mbti-sec-label">出现这些情况请看医生</span><br>' +
      DOCTOR_IF.map(function (t) { return '· ' + escapeHtml(t); }).join('<br>') + '</div>' +
      '<div class="mbti-brief-note">掌诊为传统观察，仅供参考，不能替代医学诊断。如有不适，请及时就医。</div>';
    text += '出现这些情况请看医生\n' + DOCTOR_IF.map(function (t) { return '· ' + t; }).join('\n') +
      '\n\n（掌诊为传统观察，仅供参考，不能替代医学诊断。如有不适，请及时就医。）';
    return { html: html, text: text, worst: worst };
  }

  /* ════════════════════════════════════════════════════════════
     C. 界面
     ════════════════════════════════════════════════════════════ */
  var ST = null;
  function freshState() {
    var sex = null;
    var b = (typeof readBirth === 'function') ? readBirth() : null; sex = b && b.sex || null;
    return {
      mode: 'fortune', hand: sex === 'F' ? '右' : '左', sex: sex,
      ana: null, auto: {}, conf: {}, selF: {}, selD: {}, overlay: true, token: 0, lastText: '', insight: null,
      /* 多张照片：shots=每张的识别结果；src/score=每条线当前采用哪张、得分；manual=用户手动改过的线（不被补拍覆盖） */
      shots: [], src: {}, score: {}, manual: {}, cur: -1
    };
  }

  var HTML_BODY =
    '<div class="palm">' +
    '<p class="mbti-intro">拍摄或选择一张手掌照片，自动找出主要掌纹，再对照确认。照片只在本机处理，不会上传，也不会保存。</p>' +
    '<div class="palm-cols">' +
    '<div class="palm-col">' +
    '<div class="palm-stage" id="palmStage">' +
    '<div class="palm-empty" id="palmEmpty">' +
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 41c-3-4-6-8-8-12-1-2 0-4 2-4s3 1 4 3V13c0-2 4-2 4 0v10-14c0-2 4-2 4 0v14-12c0-2 4-2 4 0v13-8c0-2 4-2 4 0v16c0 6-2 11-6 15"/></svg>' +
    '<strong>还没有照片</strong><span>掌心朝向镜头，手指自然张开，光线均匀，把手腕也拍进来</span></div>' +
    '<canvas id="palmCanvas" hidden aria-label="掌纹照片"></canvas>' +
    '<div class="palm-busy" id="palmBusy" hidden><span class="palm-spin" aria-hidden="true"></span><span id="palmBusyTxt">分析中…</span></div>' +
    '</div>' +
    '<div class="palm-status" id="palmStatus" role="status" aria-live="polite"></div>' +
    '<div class="palm-shots" id="palmShots" hidden></div>' +
    '<div class="palm-actions">' +
    '<button type="button" class="btn-gold btn-sm" id="palmShoot">拍照</button>' +
    '<button type="button" class="btn-ghost btn-sm" id="palmPick">相册</button>' +
    '<button type="button" class="btn-ghost btn-sm" id="palmOverlayBtn" hidden>标注</button>' +
    '<button type="button" class="btn-ghost btn-sm" id="palmGuideBtn">对照图</button>' +
    '<button type="button" class="btn-ghost btn-sm" id="palmResetAll" hidden>重新开始</button>' +
    '</div>' +
    '<input type="file" id="palmFileShoot" accept="image/*" capture="environment" hidden>' +
    '<input type="file" id="palmFilePick" accept="image/*" hidden>' +
    '<div class="palm-guide-set" id="palmGuideSet" hidden>' +
    '<div class="palm-guide-card" id="palmGuideCard">' +
    '<strong>拍不清楚？这样拍更容易识别</strong>' +
    '<ul><li>手掌完全张开，拇指在画面内</li><li>光线均匀，避免强反光</li><li>手腕尽量拍入</li><li>推荐用后置摄像头，保持 20–30cm</li><li>某条线看不清？再补拍一张：之前识别清楚的会保留，只更新更清楚的</li></ul>' +
    '<div class="palm-guide-card-actions">' +
    '<button type="button" class="btn-gold btn-sm" id="palmGuideRetake">补拍一张</button>' +
    '<button type="button" class="btn-ghost btn-sm" id="palmGuideManual">对照照片手动选择</button>' +
    '</div></div>' +
    '<div class="palm-guide" id="palmGuide">' +
    '<svg viewBox="0 0 300 400" aria-label="手掌六条纹路位置对照" role="img">' +
    '<g fill="rgba(243,234,211,.05)" stroke="#8f8062" stroke-width="1.6">' +
    '<rect x="58" y="150" width="184" height="215" rx="42"/><rect x="72" y="52" width="34" height="112" rx="17"/>' +
    '<rect x="112" y="28" width="34" height="136" rx="17"/><rect x="152" y="42" width="34" height="122" rx="17"/>' +
    '<rect x="192" y="70" width="30" height="94" rx="15"/><rect x="18" y="190" width="38" height="120" rx="19" transform="rotate(-28 37 250)"/></g>' +
    '<g fill="none" stroke-width="3" stroke-linecap="round">' +
    '<path stroke="#5da88a" d="M 98 158 C 72 215, 78 295, 118 348"/>' +
    '<path stroke="#c0574a" d="M 236 206 C 190 186, 120 186, 70 206"/>' +
    '<path stroke="#e8c766" d="M 72 250 C 120 240, 185 246, 232 266"/>' +
    '<path stroke="#f3ead3" d="M 148 362 C 148 305, 146 245, 142 175"/>' +
    '<path stroke="#a8853f" d="M 168 205 C 168 185, 167 168, 166 152"/>' +
    '<path stroke="#a8853f" d="M 238 190 L 258 184 M 238 206 L 256 200"/></g>' +
    '<g font-size="12" fill="#f3ead3" style="paint-order:stroke;stroke:#14110b;stroke-width:3px">' +
    '<text x="40" y="330">生命线</text><text x="244" y="204">感情线</text><text x="244" y="262">智慧线</text>' +
    '<text x="150" y="392" text-anchor="middle">事业线</text><text x="174" y="150">太阳线</text><text x="256" y="176">婚姻线</text></g></svg>' +
    '<p>示意图：拇指在左，掌心朝向镜头。各人纹路位置略有差异，仅作对照。</p></div>' +
    '</div>' +
    '</div>' +
    '<div class="palm-col">' +
    '<div class="form-row palm-hand-row"><label>所拍的手</label><div class="seg" id="palmHand">' +
    '<button type="button" data-v="左">左手</button><button type="button" data-v="右">右手</button></div></div>' +
    '<div class="seg palm-mode" id="palmMode" role="tablist" aria-label="解读方式">' +
    '<button type="button" data-v="fortune" class="on" role="tab">算命</button><button type="button" data-v="diag" role="tab">诊断</button></div>' +
    '<p class="palm-hint" id="palmHint"></p>' +
    '<div class="palm-insight" id="palmInsight" hidden></div>' +
    '<div id="palmPickers"></div>' +
    '<button type="button" class="btn-gold btn-block" id="palmGo">生成解读</button>' +
    '<div class="mbti-report palm-report" id="palmReport" hidden></div>' +
    '<p class="foot-note" id="palmFoot"></p>' +
    '</div></div></div>';

  var HINTS = {
    fortune: '识别到的纹路已自动选中（带"识别"标记），请对照照片确认；没把握的项目请自己选择，不选则不参与解读。',
    diag: '颜色受光线和相机影响，无法从照片可靠判断。请对照照片和自己的手，选出相符的描述，不选则不参与。'
  };
  var FOOT = {
    fortune: '掌纹解读源自传统手相，仅供娱乐与怡情',
    diag: '掌诊为传统观察，不能替代医学诊断，身体不适请及时就医'
  };

  function renderPickers() {
    var box = $('palmPickers'); if (!box) return;
    var fortune = ST.mode === 'fortune', data = fortune ? LINES : DIAG, sel = fortune ? ST.selF : ST.selD, html = '', moreOpen = false;
    data.forEach(function (it) {
      if (fortune && it.manual && !moreOpen) { html += '<div class="palm-more">更多纹路（选填）</div>'; moreOpen = true; }
      var conf = fortune && ST.conf[it.id], note = '';
      if (fortune && ST.ana && CORE_IDS.indexOf(it.id) >= 0) {
        var _se = (ST.shots.length && ST.src[it.id] != null && ST.shots[ST.src[it.id]]) ? ST.shots[ST.src[it.id]].ana.engine : ST.ana.engine;
        if (conf && _se === 'lm' && conf < 2) note = '<span class="palm-conf c0">看不清，请自选或补拍</span>';
        else note = conf ? '<span class="palm-conf c' + conf + '">识别' + CONF_LABEL[conf] + (ST.shots.length > 1 && ST.src[it.id] != null ? ' · 照片' + ST.shots[ST.src[it.id]].no : '') + '</span>' : '<span class="palm-conf c0">未识别，请自选或补拍</span>';
      }
      html += '<div class="palm-pk" data-id="' + it.id + '"><div class="palm-pk-head"><strong>' + it.name + '</strong>' + note + '</div>' +
        '<div class="palm-pk-desc">' + it.desc + '</div><div class="palm-chips">';
      it.opts.forEach(function (o, i) {
        var on = sel[it.id] === i, isAuto = fortune && ST.auto[it.id] === i;
        var lv = fortune ? '' : ' lv-' + o[1];
        html += '<button type="button" class="palm-chip' + (on ? ' on' : '') + lv + '" data-i="' + i + '" aria-pressed="' + on + '">' + o[0] + (isAuto ? '<i>识别</i>' : '') + '</button>';
      });
      html += '</div></div>';
    });
    box.innerHTML = html;
  }

  function setStatus(msg, cls) {
    var el = $('palmStatus'); if (!el) return;
    el.textContent = msg || ''; el.className = 'palm-status' + (cls ? ' ' + cls : '');
  }
  function showBusy(on, txt) {
    var b = $('palmBusy'); if (!b) return;
    b.hidden = !on; if (txt) $('palmBusyTxt').textContent = txt;
  }
  /* v2.16：自动解读卡片（只在算命模式、有解读结果时显示） */
  function renderInsight() {
    var el = $('palmInsight'); if (!el) return;
    if (ST.mode === 'fortune' && ST.insight && ST.insight.html) { el.innerHTML = ST.insight.html; el.hidden = false; }
    else { el.hidden = true; el.innerHTML = ''; }
  }
  function applyMode() {
    var fortune = ST.mode === 'fortune';
    document.querySelectorAll('#palmMode button').forEach(function (b) { var on = b.dataset.v === ST.mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('palmHint').textContent = HINTS[ST.mode];
    $('palmFoot').textContent = FOOT[ST.mode];
    $('palmGo').textContent = fortune ? '生成算命解读' : '生成掌诊提示';
    $('palmGuideBtn').hidden = !fortune;
    $('palmOverlayBtn').hidden = !(fortune && ST.ana && ST.ana.ok);
    $('palmOverlayBtn').classList.toggle('on', ST.overlay);
    hideReport();
    renderPickers();
    renderInsight();
    renderShots();
    if (!fortune) renderGuide(false);
    drawCanvas();
  }
  function hideReport() {
    var r = $('palmReport'); if (r) { r.hidden = true; r.innerHTML = ''; }
    var a = $('palmResultActions'); if (a) a.hidden = true;
    var g = $('palmGo'); if (g) g.hidden = false;
  }

  /* 画布：摆正后的照片 + 识别出的纹路标注 */
  function drawCanvas() {
    var cv = $('palmCanvas'); if (!cv) return;
    if (!ST.ana || !ST.ana.show) { cv.hidden = true; $('palmEmpty').hidden = false; return; }
    var s = ST.ana.show, ctx = cv.getContext('2d');
    cv.width = s.w; cv.height = s.h;
    ctx.putImageData(new ImageData(s.data, s.w, s.h), 0, 0);
    $('palmEmpty').hidden = true; cv.hidden = false;
    if (ST.mode !== 'fortune' || !ST.overlay || !ST.ana.ok) return;
    var k = Math.max(1, s.w / 360);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    CORE_IDS.forEach(function (id) {
      if (ST.shots.length > 1 && ST.src[id] !== ST.cur) return;   /* 多张照片：只画当前这张负责的线 */
      var m = ST.ana.lines[id];
      var st = palmLineStyle(ST.ana.engine, m);
      if (!st.draw) return;
      var line = LINE_BY_ID[id];
      var col = st.greyDash ? 'rgba(138,131,120,.9)' : line.color;
      ctx.save();
      ctx.lineWidth = 4.5 * k; ctx.strokeStyle = st.greyDash ? 'rgba(11,9,6,.5)' : 'rgba(11,9,6,.7)'; ctx.setLineDash(st.greyDash ? [7 * k, 5 * k] : []);
      path(ctx, m.pts); ctx.stroke();
      var dash = (st.greyDash || m.conf === 1) ? [7 * k, 5 * k] : [];
      ctx.lineWidth = 2.6 * k; ctx.strokeStyle = col; ctx.setLineDash(dash);
      path(ctx, m.pts); ctx.stroke();
      ctx.restore();
      var mid = m.pts[Math.floor(m.pts.length / 2)];
      ctx.font = '700 ' + Math.round(12 * k) + 'px "Noto Sans SC","PingFang SC",sans-serif';
      ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(11,9,6,.85)'; ctx.fillStyle = col;
      var tx = clampN(mid.x + 6 * k, 4, s.w - 44 * k), ty = clampN(mid.y - 8 * k, 14 * k, s.h - 4);
      ctx.strokeText(line.name, tx, ty); ctx.fillText(line.name, tx, ty);
    });
  }
  function path(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }

  /* 读取照片：缩到长边 PW，返回 ImageData */
  function loadImageData(file) {
    // EXIF 方向显式处理：优先用 createImageBitmap + imageOrientation:'from-image'（由解码器校正方向）；
    // 不支持或解码失败时回退到 <img> 路径（浏览器解码 <img> 时同样按 EXIF 方向处理）。两路都失败才报 decode。
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
        try {
          var s = Math.min(1, PW / Math.max(bmp.width, bmp.height));
          var w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var ctx = cv.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(bmp, 0, 0, w, h);
          return ctx.getImageData(0, 0, w, h);
        } catch (e) { return loadImageDataViaImg(file); }
        finally { if (bmp.close) bmp.close(); } /* canvas 读取失败走回退路径时也释放位图 */
      }, function () { return loadImageDataViaImg(file); });
    }
    return loadImageDataViaImg(file);
  }
  function loadImageDataViaImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var s = Math.min(1, PW / Math.max(img.naturalWidth, img.naturalHeight));
          var w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var ctx = cv.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(ctx.getImageData(0, 0, w, h));
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function renderShots() {
    var el = $('palmShots'); if (!el) return;
    if (!ST.shots.length) { el.hidden = true; el.innerHTML = ''; }
    else {
      var html = '<span class="palm-shots-lab">已拍 ' + ST.shots.length + ' 张，点击查看：</span>';
      ST.shots.forEach(function (sh, i) {
        var own = CORE_IDS.filter(function (id) { return ST.src[id] === i && ST.auto[id] >= 0; }).map(function (id) { return LINE_BY_ID[id].name.replace('线', ''); });
        html += '<button type="button" class="palm-shot' + (i === ST.cur ? ' on' : '') + '" data-i="' + i + '">照片' + sh.no + (own.length ? ' · ' + own.join('/') : '') + '</button>';
      });
      el.innerHTML = html; el.hidden = false;
    }
    var rb = $('palmResetAll'); if (rb) rb.hidden = !ST.shots.length;
  }
  /* 多张照片的合并解读：每条线取其「负责的那张」；框架、丘位、响应图取负责线条最多的那张。
     所有照片都被摆正到同一标准框，线条坐标可比；不同识别引擎的线不混用。 */
  function mergedInsight() {
    var IN = (typeof window !== 'undefined') ? window.YumiaoPalmInsight : null;
    if (!IN || typeof IN.buildAutoInsight !== 'function' || !ST.shots.length) return null;
    var own = {}, prim = 0, bestN = -1;
    CORE_IDS.forEach(function (id) { var si = ST.src[id]; if (si != null && ST.auto[id] >= 0) own[si] = (own[si] || 0) + 1; });
    Object.keys(own).forEach(function (k) { if (own[k] > bestN) { bestN = own[k]; prim = +k; } });
    if (bestN < 0) prim = ST.cur >= 0 ? ST.cur : 0;
    var pa = ST.shots[prim].ana, lines = {};
    CORE_IDS.forEach(function (id) {
      var si = ST.src[id]; if (si == null) return;
      var a = ST.shots[si].ana; if (a.engine !== pa.engine) return;
      var m = (a.linesC || a.lines)[id]; if (m) lines[id] = m;
    });
    return IN.buildAutoInsight(lines, pa.frame, pa.mounts, pa.ridgeC || pa.ridge);
  }
  function resetAllShots() {
    if (!ST) return;
    ST.token++; showBusy(false);
    ST.shots = []; ST.src = {}; ST.score = {}; ST.manual = {}; ST.auto = {}; ST.conf = {}; ST.selF = {};
    ST.ana = null; ST.cur = -1; ST.insight = null; ST.overlay = true;
    setStatus(''); renderGuide(false); applyMode();
  }

  var FAIL_TEXT = {
    nohand: '没有找到手掌。请把手掌放满画面、背景尽量简单后重拍；也可以直接在下方手动选择。',
    palmcut: '手掌不完整或光线不足，无法定位掌纹。请把手指和手腕都拍进去、光线均匀后重拍；也可以手动选择。',
    lowcontrast: '照片偏暗或偏糊，看不清掌纹。请在明亮均匀的光线下、对好焦后重拍；也可以手动选择。',
    decode: '这张照片读取不了，请换一张 JPG 或 PNG 照片。',
    heic: '这张是 HEIC 格式照片，当前浏览器读不出来。请在相册里选一张 JPG 或 PNG，或者把照片转存为 JPG 后再传；也可以直接在下方手动选择。',
    error: '识别过程出了点问题，请重拍一张；也可以直接在下方手动选择。'
  };

  async function onFile(file) {
    if (!file || !ST) return;
    /* 前置拦截：非图片、超大文件直接提示，不进识别流程 */
    if (file.type && !/^image\//.test(file.type)) { setStatus('请选一张照片（JPG 或 PNG）', 'warn'); return; }
    if (file.size && file.size > 10 * 1024 * 1024) { setStatus('照片太大了（超过 10MB），请换一张小一点的', 'warn'); return; }
    var token = ++ST.token;
    /* 多张照片：不再清空之前的识别结果；新照片只更新比之前更清楚的纹路。selD（掌诊）与照片无关，也保留 */
    hideReport(); setStatus(''); renderGuide(false);
    showBusy(true, '读取照片…');
    var res = null, rectState = 'skipped';
    try {
      var im = await loadImageData(file);
      if ((!ST || token !== ST.token)) return;
      /* v2.16：先摆正（MediaPipe），任何失败都回退原图，不影响识别 */
      var useIm = im;
      try {
        var RC = (typeof window !== 'undefined') ? window.YumiaoPalmRectify : null;
        if (RC && typeof RC.rectify === 'function') {
          showBusy(true, '摆正手掌…');
          var rc = await RC.rectify(im, { timeoutMs: 20000 });
          if ((!ST || token !== ST.token)) return;
          if (rc && rc.data) { useIm = { data: rc.data, width: rc.width, height: rc.height }; rectState = 'done'; }
          else rectState = (rc && rc.lm) ? 'lmonly' : 'failed';
        }
      } catch (e) { rectState = 'failed'; }
      /* v2.17：有手部关键点时走地标驱动的高清识别；失败再回退到旧的肤色轮廓识别 */
      res = null;
      if (rc && rc.lm) {
        try {
          showBusy(true, '读取高清原图…');
          var full = await loadFullCanvas(file);
          if ((!ST || token !== ST.token)) return;
          res = await analyzeLM(full, rc.lm, rc.thumbSide, { onProgress: function (t) { if ((ST && token === ST.token)) showBusy(true, t + '…'); } });
          if (res && !res.ok) res = null;
        } catch (e2) { res = null; console.warn('[yumiao] palm-lm', e2); }
        if ((!ST || token !== ST.token)) return;
      }
      if (!res) res = await analyzeImage(useIm.data, useIm.width, useIm.height, {
        hand: ST.hand === '右' ? 'R' : 'L',
        onProgress: function (t) { if ((ST && token === ST.token)) showBusy(true, t + '…'); }
      });
      if ((!ST || token !== ST.token)) return;
      if (!res.ok && res.reason !== 'nohand' && res.reason !== 'palmcut' && res.reason !== 'lowcontrast') res = { ok: false, reason: 'error' };
      /* 失败时也把照片画出来，方便用户对照着手动选（已有识别结果时不覆盖） */
      if (!res.ok && !res.show) res.show = { data: im.data, w: im.width, h: im.height };
    } catch (e) {
      if ((!ST || token !== ST.token)) return;
      // HEIC/HEIF 在部分浏览器（桌面 Chrome、旧安卓）解码不了：给明确提示，不静默失败
      var _isHeic = /hei[cf]/i.test(file.type || '') || /\.hei[cf]$/i.test(file.name || '');
      res = { ok: false, reason: (e && e.message === 'decode') ? (_isHeic ? 'heic' : 'decode') : 'error' };
      console.warn('[yumiao] palm', e);
    }
    showBusy(false);
    if (!ST || token !== ST.token) return;
    var hadShots = ST.shots.length > 0;
    if (res.ok) {
      var firstA = hadShots ? ST.shots[0].ana : null;
      if (firstA && !res.thumbGuess && !firstA.thumbGuess && res.handLabel !== firstA.handLabel) {
        setStatus('这张看起来是' + res.handLabel + '手，和前面的' + firstA.handLabel + '手不是同一只，没有合并。要换另一只手，请点「重新开始」。', 'warn');
        applyMode(); return;
      }
      var shot = { ana: res, no: ST.shots.length + 1 };
      ST.shots.push(shot);
      var si = ST.shots.length - 1, improved = [];
      CORE_IDS.forEach(function (id) {
        var m = res.lines[id], idx = autoPick(id, m);
        var sc = (idx >= 0 ? 10 : 0) + (m && m.found ? (m.conf || 0) : 0);
        if (ST.src[id] == null || sc > ST.score[id]) {      /* 只有更清楚才替换；打平保留以前的 */
          ST.score[id] = sc; ST.src[id] = si;
          if (m && m.found) ST.conf[id] = m.conf; else delete ST.conf[id];
          if (idx >= 0) { ST.auto[id] = idx; if (!ST.manual[id]) ST.selF[id] = idx; improved.push(LINE_BY_ID[id].name); }
          else { delete ST.auto[id]; if (!ST.manual[id]) delete ST.selF[id]; }
        }
      });
      if (!hadShots || improved.length) ST.cur = si;
      if (ST.cur < 0) ST.cur = si;
      ST.ana = ST.shots[ST.cur].ana;
      ST.overlay = true;
      var good = [], weak = [];
      CORE_IDS.forEach(function (id) { (ST.auto[id] >= 0 ? good : weak).push(LINE_BY_ID[id].name); });
      if (!hadShots && !res.thumbGuess) {
        ST.hand = res.handLabel;
        document.querySelectorAll('#palmHand button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === ST.hand); });
      }
      /* v2.16：自动解读（只在算命模式展示；诊断模式不展示）。多张照片时按每条线的最佳来源合并 */
      ST.insight = null;
      try { ST.insight = mergedInsight(); } catch (e) { ST.insight = null; }
      var msg = '';
      if (hadShots) msg += improved.length ? '补拍有效：' + improved.join('、') + '已更新，之前清楚的纹路已保留。' : '这张没有比之前更清楚的纹路，之前的结果已保留。';
      msg += good.length ? '目前已识别' + good.join('、') + (weak.length ? '；' + weak.join('、') + '不够清晰，' + (hadShots ? '可再补拍或' : '') + '请自行选择' : '') + '。' : '纹路都不够清晰，请对照照片自行选择。';
      if (!hadShots && !res.thumbGuess) msg += '看起来是' + res.handLabel + '手，如不符请在下方切换。';
      var warns = [];
      if (res.notes.indexOf('sideCut') >= 0) warns.push('手掌边缘被裁掉，生命线、感情线可能不准');
      if (res.notes.indexOf('wristCut') >= 0) warns.push('手腕被裁掉，生命线、事业线可能不准');
      if (res.notes.indexOf('fingersClosed') >= 0) warns.push('手指并拢，定位可能有偏差');
      if (res.notes.indexOf('heartHeadMerged') >= 0) warns.push('感情线与智慧线挤在同一道沟里，感情线请自行选择');
      if (res.sharp < 13) warns.push('照片偏暗或偏糊');
      if (warns.length) msg += '注意：' + warns.join('，') + '，请核对。';
      if (rectState === 'done') msg += '已按标准位置摆正。';
      else if (rectState === 'failed') msg += '未摆正，沿用原识别。';
      setStatus(msg, warns.length || !good.length ? 'warn' : 'ok');
      renderGuide(palmGuideNeeded(true, good.length, warns.length));
    } else if (hadShots) {
      setStatus((FAIL_TEXT[res.reason] || FAIL_TEXT.error) + ' 之前识别的结果已保留。', 'warn');
      renderGuide(true);
    } else {
      ST.ana = res; ST.cur = -1;
      setStatus(FAIL_TEXT[res.reason] || FAIL_TEXT.error, 'warn');
      renderGuide(palmGuideNeeded(false, 0, 0));
    }
    applyMode();
  }

  function genReport() {
    var out = ST.mode === 'fortune' ? buildFortune(ST.selF, ST.hand, ST.sex) : buildDiag(ST.selD, ST.hand);
    if (!out) { if (typeof window.toast === 'function') window.toast(ST.mode === 'fortune' ? '请至少选择一条纹路' : '请至少选择一项观察'); return; }
    /* v2.16：算命模式附上自动解读（手动点选的报告为主，自动解读在后） */
    if (ST.mode === 'fortune' && ST.insight) {
      out.text += '\n\n' + ST.insight.text;
      out.html += ST.insight.html;
    }
    ST.lastText = out.text;
    var r = $('palmReport'); r.innerHTML = out.html; r.hidden = false;
    $('palmResultActions').hidden = false; $('palmGo').hidden = true;
    try {
      if (typeof saveReportHTML === 'function') {
        saveReportHTML(ST.mode === 'fortune' ? 'yumiao_report_palm_fortune_v1' : 'yumiao_report_palm_diag_v1', ST.mode === 'fortune' ? '掌纹算命' : '掌诊自查', 'palmReport');
      }
    } catch (e) { console.warn('[yumiao] palm save report', e); }
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    r.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function bind() {
    $('palmShoot').onclick = function () { $('palmFileShoot').click(); };
    $('palmPick').onclick = function () { $('palmFilePick').click(); };
    ['palmFileShoot', 'palmFilePick'].forEach(function (id) {
      $(id).onchange = function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onFile(f); };
    });
    $('palmGuideBtn').onclick = function () { renderGuide($('palmGuideSet').hidden); };
    $('palmGuideRetake').onclick = function () { $('palmFileShoot').click(); };
    $('palmGuideManual').onclick = function () { renderGuide(false); };
    $('palmOverlayBtn').onclick = function () { ST.overlay = !ST.overlay; this.classList.toggle('on', ST.overlay); drawCanvas(); };
    $('palmHand').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      ST.hand = b.dataset.v;
      this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      hideReport();
    };
    $('palmMode').onclick = function (e) {
      var b = e.target.closest('button'); if (!b || b.dataset.v === ST.mode) return;
      ST.mode = b.dataset.v; applyMode();
    };
    $('palmPickers').onclick = function (e) {
      var c = e.target.closest('.palm-chip'); if (!c) return;
      var pk = c.closest('.palm-pk'), id = pk.dataset.id, i = +c.dataset.i, sel = ST.mode === 'fortune' ? ST.selF : ST.selD;
      sel[id] = sel[id] === i ? -1 : i;
      if (ST.mode === 'fortune') ST.manual[id] = true;   /* 手动改过的线，补拍不再覆盖 */
      pk.querySelectorAll('.palm-chip').forEach(function (x) { var on = +x.dataset.i === sel[id]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      hideReport();
    };
    $('palmShots').onclick = function (e) {
      var b = e.target.closest('.palm-shot'); if (!b || !ST) return;
      var i = +b.dataset.i; if (!ST.shots[i]) return;
      ST.cur = i; ST.ana = ST.shots[i].ana; renderShots(); drawCanvas();
    };
    $('palmResetAll').onclick = resetAllShots;
    $('palmGo').onclick = genReport;
    $('palmRetake').onclick = function () { $('palmFileShoot').click(); };
    $('palmBack').onclick = function () {
      hideReport();
      var el = $('palmStage'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    $('palmCopy').onclick = function () { if (ST.lastText) copyText(ST.lastText); };
  }

  function openPalmPanel() {
    var body = $('palmBody'); if (!body) return;
    ST = freshState();
    body.innerHTML = HTML_BODY;
    document.querySelectorAll('#palmHand button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === ST.hand); });
    bind();
    setStatus('');
    /* v2.16：提前开始加载摆正模型，用户拍照时多半已就绪；失败无声 */
    try { if (window.YumiaoPalmRectify && window.YumiaoPalmRectify.init) window.YumiaoPalmRectify.init(); } catch (e) {}
    applyMode();
    if (typeof ModalUI !== 'undefined') ModalUI.open('palm');
  }
  function closePalmPanel() {
    if (typeof ModalUI !== 'undefined') ModalUI.close('palm');
    if (ST) ST.token++;                         /* 作废进行中的分析 */
    ST = null;
    var body = $('palmBody'); if (body) body.innerHTML = '';   /* 照片只在内存里，关闭即释放 */
  }
  if (typeof ModalRegistry !== 'undefined' && !ModalRegistry.palm) ModalRegistry.palm = { backdrop: 'palmBackdrop', modal: 'palmModal' };
  /* 挂到 window 供页面调用；无 window 时（Node）不挂，只导出纯函数，供测试直接取用 */
  var YumiaoPalmExport = {
    analyzeImage: analyzeImage, autoPick: autoPick, buildFortune: buildFortune, buildDiag: buildDiag,
    LINES: LINES, DIAG: DIAG, DOCTOR_IF: DOCTOR_IF, CONF_LABEL: CONF_LABEL,
    /* A 节纯函数（不碰 DOM），供 Node / tests.html 直接测试 */
    skinMask: skinMask, morph: morph, labelComps: labelComps, keepLargest: keepLargest, fillHoles: fillHoles,
    pcaTilt: pcaTilt, valleyResponse: valleyResponse, minPath: minPath, smoothPoints: smoothPoints,
    palmFrame: palmFrame, measureLine: measureLine, confOf: confOf, measureMounts: measureMounts,
    palmGuideNeeded: palmGuideNeeded, palmLineStyle: palmLineStyle
  };
  if (typeof window !== 'undefined') {
    window.openPalmPanel = openPalmPanel;
    window.closePalmPanel = closePalmPanel;
    window.YumiaoPalm = YumiaoPalmExport;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = YumiaoPalmExport;
})();
