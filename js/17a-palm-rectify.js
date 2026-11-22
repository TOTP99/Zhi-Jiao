/* 掌纹摆正层（v2.16 新建）
   MediaPipe Hand Landmarker 校验 + 三点仿射摆正。
   思路参考 AstroVani 的做法（先摆正再检线、摆正后搜索带才有解剖学意义），代码全部自写，未复制任何一家。
   任何失败都返回 null，调用方原样走老流程；本模块绝不抛错到界面。
   接入方式：classic 脚本 + dynamic import() 加载 vision_bundle.mjs（ESM，无 UMD 版）。
   资源全部自托管在 vendor/mediapipe/（模型 + wasm + bundle），不走 CDN。 */
(function () {
  var MODEL_URL = 'vendor/mediapipe/hand_landmarker.task';
  var WASM_URL = 'vendor/mediapipe/wasm/';
  var BUNDLE_URL = 'vendor/mediapipe/vision_bundle.mjs';
  var DEFAULT_TIMEOUT = 20000;

  var landmarkerPromise = null;

  function loadLandmarker() {
    if (landmarkerPromise) return landmarkerPromise;
    landmarkerPromise = (async function () {
      /* import() 对不带 ./ 的相对路径按“裸模块名”处理会直接抛错，必须先转成绝对地址 */
      var mod = await import(new URL(BUNDLE_URL, document.baseURI).href);
      var vision = await mod.FilesetResolver.forVisionTasks(WASM_URL);
      var opts = function (delegate) {
        return {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: delegate },
          runningMode: 'IMAGE', numHands: 1,
          minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
        };
      };
      try {
        return await mod.HandLandmarker.createFromOptions(vision, opts('GPU'));
      } catch (e) {
        return await mod.HandLandmarker.createFromOptions(vision, opts('CPU'));
      }
    })().catch(function () { return null; });
    return landmarkerPromise;
  }

  /* 首次打开掌纹弹窗时调用：提前开始下载模型，用户拍照时多半已就绪。失败无声。 */
  function init() {
    try { loadLandmarker(); } catch (e) { /* 忽略：rectify 时会再次尝试并回退 */ }
  }

  function withTimeout(promise, ms) {
    var timer = null;
    var timeout = new Promise(function (resolve) { timer = setTimeout(function () { resolve(null); }, ms); });
    return Promise.race([promise, timeout]).then(function (r) { if (timer) clearTimeout(timer); return r; });
  }

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  /* 校验 21 个关键点（归一化坐标）：张开、居中、正向。纯函数，供测试。 */
  function validateLandmarks(lm) {
    if (!lm || lm.length < 21) return { ok: false, reason: 'nolandmark' };
    var wrist = lm[0], midMcp = lm[9];
    var palmW = dist(wrist, midMcp);
    if (!(palmW > 0.02)) return { ok: false, reason: 'nolandmark' };
    /* 张开：中指伸展、食指指尖与小指指尖张开 */
    var midExt = dist(lm[12], wrist) / (dist(midMcp, wrist) || 1);
    var spread = dist(lm[8], lm[20]) / palmW;
    if (midExt < 1.3 || spread < 0.5) return { ok: false, reason: 'closed' };
    /* 居中：腕点在框内 */
    if (wrist.x < 0.08 || wrist.x > 0.92 || wrist.y < 0.1 || wrist.y > 0.98) return { ok: false, reason: 'offcenter' };
    /* 正向：中指掌指关节在腕点上方（手指朝上），允许 ±75° 倾斜 */
    var ang = Math.atan2(midMcp.y - wrist.y, midMcp.x - wrist.x);
    var diff = Math.abs(((ang + Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (diff > Math.PI * 75 / 180) return { ok: false, reason: 'notupright' };
    return { ok: true };
  }

  /* 以腕→中指掌指关节为轴，拇指尖在轴的哪一侧。图坐标下 cross < 0 为右手。纯函数，供测试。 */
  function thumbSide(lm) {
    var ax = lm[9].x - lm[0].x, ay = lm[9].y - lm[0].y;
    var tx = lm[4].x - lm[0].x, ty = lm[4].y - lm[0].y;
    return (ax * ty - ay * tx) > 0 ? 'L' : 'R';
  }

  /* 由 3 组对应点解仿射：x' = a*x + c*y + e，y' = b*x + d*y + f。退化返回 null。纯函数，供测试。 */
  function solveAffine(src, dst) {
    var x1 = src[0][0], y1 = src[0][1], x2 = src[1][0], y2 = src[1][1], x3 = src[2][0], y3 = src[2][1];
    var u1 = dst[0][0], v1 = dst[0][1], u2 = dst[1][0], v2 = dst[1][1], u3 = dst[2][0], v3 = dst[2][1];
    var det = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    if (Math.abs(det) < 1e-9) return null;
    var a = ((u2 - u1) * (y3 - y1) - (u3 - u1) * (y2 - y1)) / det;
    var c = ((x2 - x1) * (u3 - u1) - (x3 - x1) * (u2 - u1)) / det;
    var e = u1 - a * x1 - c * y1;
    var b = ((v2 - v1) * (y3 - y1) - (v3 - v1) * (y2 - y1)) / det;
    var d = ((x2 - x1) * (v3 - v1) - (x3 - x1) * (v2 - v1)) / det;
    var f = v1 - b * x1 - d * y1;
    return [a, b, c, d, e, f];
  }

  /* 摆正一张图。imageData：{ data, width, height }。
     成功返回 { data, width, height, thumbSide, rectified: true }，任何失败返回 null。 */
  async function rectify(imageData, opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT;
    try {
      return await withTimeout((async function () {
        var lm = await loadLandmarker();
        if (!lm || typeof document === 'undefined') return null;
        var w = imageData.width, h = imageData.height;
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        var ctx = cv.getContext('2d');
        if (!ctx) return null;
        ctx.putImageData(new ImageData(imageData.data, w, h), 0, 0);
        var res = lm.detect(cv);
        var landmarks = res && res.landmarks && res.landmarks[0];
        if (!landmarks) return null;
        var v = validateLandmarks(landmarks);
        var side = thumbSide(landmarks);
        if (!v.ok) {
          /* v2.17：手掌被裁边/略歪（offcenter、notupright）时不摆正整图，但关键点仍可用于高清掌心裁切 */
          if (v.reason === 'offcenter' || v.reason === 'notupright') return { data: null, rectified: false, reason: v.reason, thumbSide: side, lm: landmarks.map(function (q) { return { x: q.x, y: q.y }; }) };
          return null;
        }
        var px = function (p) { return [p.x * w, p.y * h]; };
        var src = [px(landmarks[0]), px(landmarks[5]), px(landmarks[17])];
        /* 标准位置：整只手放得进框——腕 y≈0.92、指关节线 y≈0.42、掌指间距 0.30W，拇指统一在左。
           （草稿写的 y≈0.20–0.28 是 AstroVani 的掌心裁切框；本管线需要完整手指做 palmFrame，
           故改用能容下整只手的缩放，仿射本身不变。） */
        var dst = side === 'R'
          ? [[0.50 * w, 0.92 * h], [0.35 * w, 0.42 * h], [0.65 * w, 0.42 * h]]
          : [[0.50 * w, 0.92 * h], [0.65 * w, 0.42 * h], [0.35 * w, 0.42 * h]];
        var m = solveAffine(src, dst);
        if (!m) return null;
        var out = document.createElement('canvas');
        out.width = w; out.height = h;
        var octx = out.getContext('2d');
        if (!octx) return null;
        octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, w, h);   /* 仿射后露出的边角填白，不是透明 */
        octx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
        octx.drawImage(cv, 0, 0);
        var data = octx.getImageData(0, 0, w, h);
        return { data: data.data, width: w, height: h, thumbSide: side, rectified: true,
          lm: landmarks.map(function (q) { return { x: q.x, y: q.y }; }) };   /* v2.17：21 点（相对输入图 0~1），供高清掌心裁切与解剖端点追踪 */
      })(), timeoutMs);
    } catch (e) {
      return null;
    }
  }

  var api = { init: init, rectify: rectify, solveAffine: solveAffine, validateLandmarks: validateLandmarks, thumbSide: thumbSide };
  if (typeof window !== 'undefined') window.YumiaoPalmRectify = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
