/* 掌纹自动解读层（v2.16 新建）
   纯函数，不碰 DOM。输入复用 js/17-palm.js 量出的线条特征（measureLine）与丘位密度，
   输出结构化解读 + 文言风 html / text。
   解读思路参考 Palmistra 的分层（线条量测 → 丘位 → 特殊纹），文案与阈值全部自写；
   只报量到的，不编造；特殊纹只报高置信度，低置信度不写进正文。
   掌形只报实测比值，不套元素 / 五行标签。 */
(function () {
  var LINE_NAMES = { life: '生命线', heart: '感情线', head: '智慧线', fate: '事业线' };
  var MOUNT_NAMES = [
    { id: 'venus', name: '金星丘', key: '精力亲情' },
    { id: 'jupiter', name: '木星丘', key: '进取抱负' },
    { id: 'saturn', name: '土星丘', key: '稳重忍耐' },
    { id: 'sun', name: '太阳丘', key: '名声才华' },
    { id: 'mercury', name: '水星丘', key: '灵巧交际' },
    { id: 'luna', name: '月丘', key: '想象直觉' },
    { id: 'mars', name: '火星平原', key: '勇气魄力' }
  ];
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function round2(v) { return Math.round(v * 100) / 100; }

  /* 单线评级：模糊（conf < 2）或未找到 → null，不乱猜。分档与 17-palm.js 的 autoPick 口径一致。 */
  function rateLine(id, m) {
    if (!m || !m.found || m.conf < 2) return null;
    var len = m.lenRel >= 0.75 ? '长' : (m.lenRel >= 0.5 ? '适中' : '短');
    var dep = m.meanR >= 0.6 ? '深' : '清';
    var cont = m.cont >= 0.85 ? '连贯' : '偶断';
    var curve = m.sinu >= 1.15 ? '弯' : (m.sinu >= 1.05 ? '微弯' : '直');
    var label, sentence = '';
    if (id === 'life') {
      label = dep + len + cont;
      sentence = len === '长' ? '生命线绵长，传统主精力充沛、耐力足。'
        : len === '适中' ? '生命线长度适中，传统主精力平实、起伏有度。'
        : '生命线偏短，传统主先天精力偏弱，宜作息有节、劳逸结合。';
      if (cont === '偶断') sentence += '纹路偶有断续，传统主阶段感较强，中年前后或有一段转折，稳住节奏即可。';
    } else if (id === 'heart') {
      label = dep + len + cont + '·' + curve;
      if (len === '长' && curve !== '直') sentence = '感情线长而微弯，传统主重情重义、感情丰富。';
      else if (len === '长') sentence = '感情线长而平直，传统主感情稳定、重承诺。';
      else if (len === '短' && curve !== '直') sentence = '感情线短而弯，传统主感情热烈直接。';
      else if (len === '短') sentence = '感情线短而直，传统主内敛理性、不轻易表露。';
      else if (curve !== '直') sentence = '感情线长短适中、略带弯曲，传统主感情细腻。';
      else sentence = '感情线长短适中、走势平直，传统主感情稳重。';
      if (cont === '偶断') sentence += '纹路偶有断续，传统主感情路有起伏，宜多沟通、少猜测。';
    } else if (id === 'head') {
      label = dep + len + cont + (m.chordDeg >= 30 ? '·下弯' : '·平');
      if (len === '长' && m.chordDeg >= 30) sentence = '智慧线长而下弯，传统主想象丰富、直觉敏锐。';
      else if (len === '长') sentence = '智慧线长而平直，传统主思虑周密、逻辑清晰。';
      else if (len === '适中') sentence = '智慧线长度适中，传统主思维灵活、讲求实效。';
      else sentence = '智慧线偏短，传统主行事干脆、重当下。';
      if (cont === '偶断') sentence += '纹路偶有断续，传统主思路活跃但易分心，宜把大事拆小。';
    } else if (id === 'fate') {
      label = m.conf === 3 ? '深而清晰' : '清晰可辨';
      sentence = m.conf === 3 ? '事业线深而清晰，传统主目标明确、事业稳步攀升。'
        : '事业线清晰可辨，传统主事业多靠自身积累、屡试屡进。';
    } else {
      return null;
    }
    return { id: id, name: LINE_NAMES[id], label: label, sentence: sentence };
  }

  /* 丘位按密度排序。供测试与展示共用。 */
  function rankMounts(mounts) {
    var list = MOUNT_NAMES.map(function (m) {
      var d = (mounts && typeof mounts[m.id] === 'number') ? mounts[m.id] : 0;
      return { id: m.id, name: m.name, key: m.key, d: round2(clamp01(d)) };
    });
    list.sort(function (a, b) { return b.d - a.d; });
    return list;
  }

  /* 在一组轨迹点里找 x 附近的平均 y（轨迹点不按 x 排序，故用邻域平均）。 */
  function yAt(pts, x0) {
    var sum = 0, n = 0;
    for (var i = 0; i < pts.length; i++) {
      if (Math.abs(pts[i].x - x0) <= 3) { sum += pts[i].y; n++; }
    }
    return n ? sum / n : null;
  }

  /* 神秘十字：头线与心线之间，有一段横纹纵贯两线（覆盖 ≥60% 间距、均值够深）。返回 0–1 分。 */
  function crossScore(R, w, h, heart, head, F) {
    if (!heart || !heart.pts || !head || !head.pts || !F || !F.Wp) return 0;
    var best = 0, Wp = F.Wp;
    var step = Math.max(2, Math.round(Wp / 20));
    for (var x = Math.round(F.xL + 0.30 * Wp); x <= Math.round(F.xL + 0.70 * Wp); x += step) {
      var yH = yAt(heart.pts, x), yD = yAt(head.pts, x);
      if (yH == null || yD == null) continue;
      var y0 = Math.min(yH, yD), y1 = Math.max(yH, yD);
      var gap = y1 - y0;
      if (gap < 0.08 * Wp) continue;
      var run = 0, runSum = 0, bestRun = 0, bestSum = 0;
      for (var y = Math.max(0, Math.round(y0)); y <= Math.min(h - 1, Math.round(y1)); y++) {
        var r = R[y * w + x];
        if (r > 0.35) { run++; runSum += r; } else { if (run > bestRun) { bestRun = run; bestSum = runSum; } run = 0; runSum = 0; }
      }
      if (run > bestRun) { bestRun = run; bestSum = runSum; }
      if (!bestRun) continue;
      var cov = bestRun / gap, meanR = bestSum / bestRun;
      var s = cov * (meanR >= 0.45 ? 1 : meanR / 0.45);
      if (s > best) best = s;
    }
    return clamp01(best);
  }

  /* 所罗门环：食指根部、心线上方有一段横向弧纹（长度 ≥60% 区宽、均值够深）。返回 0–1 分。 */
  function ringScore(R, w, h, heart, F) {
    if (!heart || !heart.pts || !F || !F.Wp) return 0;
    var Wp = F.Wp;
    var x0 = Math.round(F.xL + 0.06 * Wp), x1 = Math.round(F.xL + 0.32 * Wp);
    var zoneW = x1 - x0;
    if (zoneW < 6) return 0;
    var best = 0;
    var yTop = Math.max(0, Math.round(F.y0 - 0.10 * Wp));
    for (var y = yTop; y <= Math.min(h - 1, Math.round(F.y0 + 0.08 * Wp)); y++) {
      var run = 0, runSum = 0, bestRun = 0, bestSum = 0;
      for (var x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
        /* 只取心线以上的行：心线本身不算环 */
        var yH = yAt(heart.pts, x);
        if (yH != null && y >= yH - 0.02 * Wp) { if (run > bestRun) { bestRun = run; bestSum = runSum; } run = 0; runSum = 0; continue; }
        var r = R[y * w + x];
        if (r > 0.35) { run++; runSum += r; } else { if (run > bestRun) { bestRun = run; bestSum = runSum; } run = 0; runSum = 0; }
      }
      if (run > bestRun) { bestRun = run; bestSum = runSum; }
      if (!bestRun) continue;
      var s = (bestRun / zoneW) * ((bestSum / bestRun) >= 0.45 ? 1 : (bestSum / bestRun) / 0.45);
      if (s > best) best = s;
    }
    return clamp01(best);
  }

  /* 特殊纹：只报高置信度（≥0.75），低置信度不写进正文。 */
  function detectMarkings(lines, frame, ridge) {
    var out = [];
    if (!lines || !frame || !ridge || !ridge.R || !ridge.w || !ridge.h) return out;
    var R = ridge.R, w = ridge.w, h = ridge.h;
    var cs = crossScore(R, w, h, lines.heart, lines.head, frame);
    if (cs >= 0.75) out.push({ id: 'cross', name: '神秘十字', score: round2(cs), text: '头线与心线之间见十字纹，传统主直觉敏锐、悟性佳。' });
    var rs = ringScore(R, w, h, lines.heart, frame);
    if (rs >= 0.75) out.push({ id: 'solomon', name: '所罗门环', score: round2(rs), text: '食指根部见弧形纹，传统主聪慧好学、善于洞察。' });
    return out;
  }

  /* 掌形：只报实测比值（掌长/掌宽、指长/掌宽），不套元素 / 五行标签。 */
  function handShape(frame) {
    if (!frame || !frame.box || !(frame.Wp > 0)) return null;
    var palmLen = (frame.box.y1 - frame.y0) / frame.Wp;
    var fingerLen = (frame.y0 - frame.box.y0) / frame.Wp;
    if (!(palmLen > 0) || !(fingerLen >= 0)) return null;
    var shape = palmLen >= 1.15 ? '偏长' : (palmLen <= 0.95 ? '偏阔' : '方圆适中');
    return {
      palmLen: round2(palmLen), fingerLen: round2(fingerLen), shape: shape,
      text: '掌形' + shape + '（掌长约为掌宽的 ' + palmLen.toFixed(2) + ' 倍，指长约为掌宽的 ' + fingerLen.toFixed(2) + ' 倍）。'
    };
  }

  /* 主入口。lines：measureLine 的结果；frame：palmFrame 的框；mounts：丘位密度；ridge：{ R, w, h } 归一化响应图（可选）。
     量不到任何东西返回 null。 */
  function buildAutoInsight(lines, frame, mounts, ridge) {
    lines = lines || {};
    var rated = {};
    ['life', 'heart', 'head', 'fate'].forEach(function (id) { rated[id] = rateLine(id, lines[id]); });
    var anyLine = rated.life || rated.heart || rated.head || rated.fate;
    var ranked = rankMounts(mounts);
    var hasMounts = ranked.some(function (m) { return m.d > 0.02; });
    var markings = detectMarkings(lines, frame, ridge);
    var shape = handShape(frame);
    if (!anyLine && !hasMounts && !markings.length && !shape) return null;

    var html = '<div class="mbti-type">自动解读</div>';
    var text = '自动解读（由识别结果生成，仅供参考）\n';
    if (anyLine) {
      var lineHtml = '', lineText = '';
      ['life', 'heart', 'head', 'fate'].forEach(function (id) {
        var r = rated[id];
        if (!r) return;
        lineHtml += '<b>' + r.name + ' · ' + r.label + '</b><br>' + r.sentence + '<br>';
        lineText += r.name + ' · ' + r.label + '\n' + r.sentence + '\n';
      });
      html += '<div class="mbti-sec"><span class="mbti-sec-label">四线</span>' + lineHtml + '</div>';
      text += '四线\n' + lineText;
    }
    if (hasMounts) {
      var top = ranked.filter(function (m) { return m.d > 0.02; }).slice(0, 3);
      var weak = ranked[ranked.length - 1];
      var mountLine = '丘位纹理较密：' + top.map(function (m) { return m.name; }).join('、') +
        (weak && weak.d <= 0.3 ? '；较疏：' + weak.name + '。' : '。');
      var keys = top.map(function (m) { return m.name + '主' + m.key; }).join('，');
      html += '<div class="mbti-sec"><span class="mbti-sec-label">丘位</span>' + mountLine + '<br>传统以' + keys + '，仅供参考。</div>';
      text += '丘位\n' + mountLine + '传统以' + keys + '，仅供参考。\n';
    }
    if (markings.length) {
      var markHtml = '', markText = '';
      markings.forEach(function (mk) {
        markHtml += '<b>' + mk.name + '</b>：' + mk.text + '<br>';
        markText += mk.name + '：' + mk.text + '\n';
      });
      html += '<div class="mbti-sec"><span class="mbti-sec-label">特殊纹</span>' + markHtml + '</div>';
      text += '特殊纹\n' + markText;
    }
    if (shape) {
      html += '<div class="mbti-sec"><span class="mbti-sec-label">掌形</span>' + shape.text + '</div>';
      text += '掌形\n' + shape.text + '\n';
    }
    html += '<div class="mbti-brief-note">自动解读由本次识别的量测生成，仅供参考；请以手动确认为准。</div>';
    text += '（自动解读由本次识别的量测生成，仅供参考；请以手动确认为准。）';
    return { html: html, text: text, lines: rated, mounts: ranked, markings: markings, shape: shape };
  }

  var api = {
    buildAutoInsight: buildAutoInsight, rateLine: rateLine, rankMounts: rankMounts,
    detectMarkings: detectMarkings, handShape: handShape,
    crossScore: crossScore, ringScore: ringScore, MOUNT_NAMES: MOUNT_NAMES
  };
  if (typeof window !== 'undefined') window.YumiaoPalmInsight = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
