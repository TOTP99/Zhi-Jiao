// ============================================================
// ZJiao MBTI 测试引擎（内嵌库）
// 原始行号（拆分前单文件 script.js 中的位置）: 1245-1460
// ============================================================
  // ============================================================
  // ZJiao MBTI Engine v0.1（内嵌，供下方掷筊揭晓逻辑调用 window.MBTI.test()）
  // ============================================================
  (function (global) {
    "use strict";
    // 48 题 + 可选加测 12 题；权重 0.5 / 1 / 1.5 拉开区分度
    // 题序固定打乱；是/否分别指向对立字母
    const ENGINE_MAPPING = {
      "01": { dimension: "TF", yes: "F", no: "T", weight: 1 },
      "02": { dimension: "EI", yes: "E", no: "I", weight: 1.5 },
      "03": { dimension: "EI", yes: "I", no: "E", weight: 1 },
      "04": { dimension: "TF", yes: "F", no: "T", weight: 1.5 },
      "05": { dimension: "TF", yes: "T", no: "F", weight: 1 },
      "06": { dimension: "JP", yes: "P", no: "J", weight: 0.5 },
      "07": { dimension: "SN", yes: "S", no: "N", weight: 1 },
      "08": { dimension: "JP", yes: "P", no: "J", weight: 1 },
      "09": { dimension: "TF", yes: "F", no: "T", weight: 0.5 },
      "10": { dimension: "EI", yes: "E", no: "I", weight: 1 },
      "11": { dimension: "EI", yes: "E", no: "I", weight: 0.5 },
      "12": { dimension: "SN", yes: "S", no: "N", weight: 1.5 },
      "13": { dimension: "SN", yes: "S", no: "N", weight: 1.5 },
      "14": { dimension: "EI", yes: "I", no: "E", weight: 1 },
      "15": { dimension: "SN", yes: "S", no: "N", weight: 0.5 },
      "16": { dimension: "JP", yes: "P", no: "J", weight: 1 },
      "17": { dimension: "TF", yes: "T", no: "F", weight: 1.5 },
      "18": { dimension: "TF", yes: "T", no: "F", weight: 1 },
      "19": { dimension: "SN", yes: "N", no: "S", weight: 1 },
      "20": { dimension: "TF", yes: "T", no: "F", weight: 0.5 },
      "21": { dimension: "TF", yes: "F", no: "T", weight: 1 },
      "22": { dimension: "EI", yes: "I", no: "E", weight: 1.5 },
      "23": { dimension: "JP", yes: "J", no: "P", weight: 1 },
      "24": { dimension: "EI", yes: "I", no: "E", weight: 0.5 },
      "25": { dimension: "JP", yes: "J", no: "P", weight: 1.5 },
      "26": { dimension: "SN", yes: "S", no: "N", weight: 1 },
      "27": { dimension: "SN", yes: "N", no: "S", weight: 1.5 },
      "28": { dimension: "JP", yes: "J", no: "P", weight: 0.5 },
      "29": { dimension: "TF", yes: "F", no: "T", weight: 1 },
      "30": { dimension: "SN", yes: "S", no: "N", weight: 1 },
      "31": { dimension: "SN", yes: "N", no: "S", weight: 0.5 },
      "32": { dimension: "SN", yes: "N", no: "S", weight: 1 },
      "33": { dimension: "EI", yes: "E", no: "I", weight: 1 },
      "34": { dimension: "SN", yes: "S", no: "N", weight: 1 },
      "35": { dimension: "TF", yes: "T", no: "F", weight: 1 },
      "36": { dimension: "EI", yes: "I", no: "E", weight: 1 },
      "37": { dimension: "JP", yes: "J", no: "P", weight: 1 },
      "38": { dimension: "JP", yes: "P", no: "J", weight: 1 },
      "39": { dimension: "EI", yes: "I", no: "E", weight: 1 },
      "40": { dimension: "TF", yes: "T", no: "F", weight: 1 },
      "41": { dimension: "JP", yes: "J", no: "P", weight: 1 },
      "42": { dimension: "JP", yes: "J", no: "P", weight: 0.5 },
      "43": { dimension: "JP", yes: "P", no: "J", weight: 1 },
      "44": { dimension: "TF", yes: "T", no: "F", weight: 1 },
      "45": { dimension: "EI", yes: "E", no: "I", weight: 1 },
      "46": { dimension: "SN", yes: "N", no: "S", weight: 1 },
      "47": { dimension: "EI", yes: "E", no: "I", weight: 1 },
      "48": { dimension: "SN", yes: "N", no: "S", weight: 1 },
      // 加测 12 题（49-60），与前 48 题不重复
      "49": { dimension: "EI", yes: "E", no: "I", weight: 1.5 },
      "50": { dimension: "EI", yes: "I", no: "E", weight: 1 },
      "51": { dimension: "SN", yes: "S", no: "N", weight: 1.5 },
      "52": { dimension: "SN", yes: "N", no: "S", weight: 1 },
      "53": { dimension: "TF", yes: "F", no: "T", weight: 1.5 },
      "54": { dimension: "TF", yes: "T", no: "F", weight: 1 },
      "55": { dimension: "JP", yes: "J", no: "P", weight: 1.5 },
      "56": { dimension: "JP", yes: "P", no: "J", weight: 1 },
      "57": { dimension: "EI", yes: "E", no: "I", weight: 0.5 },
      "58": { dimension: "SN", yes: "N", no: "S", weight: 0.5 },
      "59": { dimension: "TF", yes: "T", no: "F", weight: 0.5 },
      "60": { dimension: "JP", yes: "J", no: "P", weight: 0.5 }
    };
    const ENGINE_TYPES = {
      ISTJ: { name: "物流师", summary: "务实、负责、重视秩序与可靠性。", strengths: ["责任感强","做事可靠","重视事实与细节","执行稳定"], blindSpots: ["有时过于依赖既有方法","可能低估变化带来的机会","容易把责任放在自己身上"], work: "适合需要责任感、流程意识、准确性和长期稳定执行的环境。", relationship: "通常通过实际行动表达在乎，而不是只靠语言表达。", stress: "压力较高时可能变得更加固执、谨慎或过度关注细节。", mystic: '如磐石之臣：可靠是刻进骨子里的。此生宜做「定海神针」，忌被浮躁裹挟。守住原则，便是最大的不凡。' },
      ISFJ: { name: "守卫者", summary: "细致、稳定，重视责任与他人的实际需要。", strengths: ["细致可靠","有责任感","善于照顾他人","执行稳定"], blindSpots: ["容易忽略自己的需求","有时过度承担责任","面对突然变化可能需要更多适应时间"], work: "适合稳定、明确，同时能够产生实际帮助和价值的工作环境。", relationship: "重视稳定、信任和长期的实际投入。", stress: "压力状态下可能变得过度谨慎或把别人的需要放在自己之前。", mystic: '如春雨润物：温柔而坚定地守护着重要的人。宜记得——照顾世界之前，先给自己留一盏灯。' },
      INFJ: { name: "提倡者", summary: "重视意义、愿景与价值一致性，倾向深入理解人和系统。", strengths: ["洞察力强","重视长期意义","善于理解复杂的人际关系","价值观明确"], blindSpots: ["容易想得过深","可能对自己要求过高","容易因理想与现实的落差产生疲惫感"], work: "适合需要洞察、长期愿景、价值判断和深度理解的环境。", relationship: "重视精神层面的理解和深层连接。", stress: "压力状态下可能过度内省，并不断寻找事情背后的意义。", mystic: '如深夜灯塔：为意义而活，为理想而燃。宜把宏大的愿景拆成每日可行的小事，理想才不会烫伤自己。' },
      INTJ: { name: "建筑师", summary: "战略、独立，重视逻辑与长期规划。", strengths: ["战略思维","独立分析","长期规划能力强","擅长建立系统"], blindSpots: ["可能显得过于直接","容易忽视情绪因素","对低效率和重复沟通容忍度较低"], work: "适合复杂问题、战略规划、系统设计和需要独立判断的环境。", relationship: "通常重视深度、诚实、独立空间和思想上的交流。", stress: "压力状态下可能进一步封闭自己，并试图通过控制变量解决所有问题。", mystic: '如弈者观全局：落子之前已算十步。宜警惕「众人皆醉我独醒」的孤傲——再完美的蓝图，也需要人来建造。' },
      ISTP: { name: "鉴赏家", summary: "灵活、务实，擅长现场分析与解决问题。", strengths: ["反应快","实践能力强","善于拆解问题","临场适应能力强"], blindSpots: ["可能不喜欢长期承诺","容易快速失去兴趣","有时不愿解释自己的思路"], work: "适合实践、技术、操作、分析和需要快速解决问题的环境。", relationship: "重视自由和真实，不喜欢过度控制。", stress: "压力状态下可能减少沟通，转而独自解决问题。", mystic: '如庖丁解牛：于实操中见真章。宜把「动手」的天赋炼成一门手艺，游刃有余处，皆是道场。' },
      ISFP: { name: "探险家", summary: "重视体验、个人价值与真实感受。", strengths: ["敏感细腻","审美和体验感强","尊重他人差异","适应性好"], blindSpots: ["可能回避长期规划","不喜欢被强迫","有时难以快速表达内在想法"], work: "适合能够保留自主空间，同时具有实际体验和创造性的环境。", relationship: "重视真实感受、尊重和自由空间。", stress: "压力状态下可能退回自己的世界，减少外部沟通。", mystic: '如林间之鹿：敏感而自由，活在当下的美里。宜为热爱留白，也为未来留一盏现实的灯。' },
      INFP: { name: "调停者", summary: "重视内在价值、意义、可能性与同理心。", strengths: ["价值感强","想象力丰富","同理心强","重视真实性"], blindSpots: ["容易理想化","可能过度内耗","面对现实限制时容易失去动力"], work: "适合具有意义感、创造空间和价值一致性的环境。", relationship: "重视深度理解、真诚和情感上的安全感。", stress: "压力状态下可能反复思考过去的选择，并对自己产生过度批判。", mystic: '如溪涧之月：内心理想国澄澈明亮。宜把「意义感」变成作品而非内耗——写出来、做出来，便是治愈。' },
      INTP: { name: "逻辑学家", summary: "喜欢分析概念、建立模型和探索复杂问题。", strengths: ["逻辑分析能力强","好奇心强","善于发现系统漏洞","独立思考"], blindSpots: ["容易过度分析","可能忽略执行","有时表达方式显得过于抽象"], work: "适合研究、分析、系统设计、技术和复杂问题解决。", relationship: "重视思想交流和彼此独立。", stress: "压力状态下可能进一步陷入分析循环，迟迟无法行动。", mystic: '如观星者：于混沌中寻找秩序。宜记得——想通一百遍，不如动手一遍。模型再美，也要落地。' },
      ESTP: { name: "企业家", summary: "行动导向、反应迅速，喜欢实际挑战。", strengths: ["行动力强","反应迅速","现实感强","擅长处理突发情况"], blindSpots: ["可能忽略长期后果","容易追求刺激","不喜欢过度理论化"], work: "适合高变化、需要快速判断和实际行动的环境。", relationship: "重视直接、真实和共同体验。", stress: "压力状态下可能更冲动，试图通过行动摆脱压力。", mystic: '如烈马逐风：行动是最好的答案。宜把「快」用在抢占先机，把「稳」留给复盘总结。' },
      ESFP: { name: "表演者", summary: "重视体验、人际互动和当下的活力。", strengths: ["亲和力强","善于活跃气氛","现实感强","适应性好"], blindSpots: ["可能不喜欢长期规划","容易受环境影响","有时优先考虑当下体验"], work: "适合人与人互动频繁、变化丰富、能够产生即时反馈的环境。", relationship: "重视陪伴、体验和情绪上的积极互动。", stress: "压力状态下可能通过不断活动来逃避内在问题。", mystic: '如篝火之夜：走到哪里，热闹到哪里。宜把感染力变成事业——舞台越大，命越旺。' },
      ENFP: { name: "竞选者", summary: "好奇、热情，重视可能性与人与人的连接。", strengths: ["创造力强","热情","善于发现可能性","人际感染力强"], blindSpots: ["容易同时开启太多事情","可能缺乏持续执行","容易被新想法分散"], work: "适合创新、沟通、创意和能够不断产生新可能性的环境。", relationship: "重视精神交流、自由和共同成长。", stress: "压力状态下可能不断寻找新可能性，却难以真正停下来。", mystic: '如春风过境：点燃无数可能。宜练习「收束」——把漫天星光聚成一束，才能照亮前路。' },
      ENTP: { name: "辩论家", summary: "喜欢探索观点、挑战假设和寻找创新方案。", strengths: ["思维灵活","善于辩证","创新能力强","擅长发现漏洞"], blindSpots: ["可能为了讨论而讨论","容易低估执行难度","有时显得过于挑战他人"], work: "适合创新、策略、创业、研究和需要不断挑战假设的环境。", relationship: "重视思想刺激和能够接受观点碰撞的关系。", stress: "压力状态下可能变得更加争辩，并通过分析回避情绪问题。", mystic: '如利刃剖竹：以思辨为乐，以创新为命。宜把「赢过一场辩论」的快感，换成「做成一件事」的踏实。' },
      ESTJ: { name: "总经理", summary: "务实、有组织性，倾向推动事情落地。", strengths: ["执行力强","组织能力强","目标明确","责任感强"], blindSpots: ["可能过于强调效率","对低执行力容忍度低","有时忽略主观感受"], work: "适合管理、运营、组织和需要明确目标与执行的环境。", relationship: "重视可靠、直接和共同承担责任。", stress: "压力状态下可能变得更控制、更强调规则和结果。", mystic: '如良将治军：赏罚分明，令行禁止。宜在效率之外留三分温情——被心服口服地追随，方为真领导。' },
      ESFJ: { name: "执政官", summary: "重视合作、责任与团队和谐。", strengths: ["善于协调","责任感强","关注他人","团队意识强"], blindSpots: ["容易过度关注他人评价","可能不喜欢冲突","容易承担过多责任"], work: "适合需要沟通、协调、服务和团队合作的环境。", relationship: "重视稳定、回应和明确的情感投入。", stress: "压力状态下可能过度关注他人的看法和关系变化。", mystic: '如大家长：把一屋子人照顾得妥妥帖帖。宜设立边界——你的好，值得被珍惜而非被消耗。' },
      ENFJ: { name: "主人公", summary: "重视人的成长、愿景与团队协作。", strengths: ["沟通能力强","善于激励他人","有愿景","重视团队"], blindSpots: ["容易过度承担他人的问题","可能忽视自己的需求","有时过于追求关系和谐"], work: "适合领导、教育、咨询、组织和人与人连接密集的环境。", relationship: "重视成长、理解和彼此支持。", stress: "压力状态下可能过度介入他人的问题。", mystic: '如火炬手：照亮他人，也点燃自己。宜记得给自己充电——持续发光的人，最需要独处回血。' },
      ENTJ: { name: "指挥官", summary: "目标导向、战略性强，重视效率和组织能力。", strengths: ["领导力","战略思维","决策速度快","组织能力强"], blindSpots: ["可能过于直接","对低效率缺乏耐心","容易把关系问题当成结构问题处理"], work: "适合战略、管理、创业、组织建设和高自主性的环境。", relationship: "重视能力、诚实、独立和共同目标。", stress: "压力状态下可能进一步强调控制、效率和结果。", mystic: '如帅旗猎猎：天生为大场面而生。宜修炼「听」功——最快的路，有时是先听完别人的那条。' }
    };
    // 注：key 用传统写法 "SN"，但 left/right 特意写成 N/S（而非 S/N），
    // 这样最终拼接类型字符串时四个维度都是"先看 left 是否占优"，代码逻辑不受影响，仅为可读性说明。
    const ENGINE_DIMENSIONS = [
      { key: "EI", left: "E", right: "I" },
      { key: "SN", left: "N", right: "S" },
      { key: "TF", left: "T", right: "F" },
      { key: "JP", left: "J", right: "P" }
    ];
    function normalizeAnswer(value) {
      if (value === true) return "yes";
      if (value === false) return "no";
      if (typeof value === "string") {
        const v = value.toLowerCase().trim();
        if (v === "yes" || v === "y" || v === "true" || v === "是") return "yes";
        if (v === "no" || v === "n" || v === "false" || v === "否") return "no";
      }
      return null;
    }
    function getClarity(distance) {
      if (distance < 10) return "接近临界";
      if (distance < 25) return "轻微倾向";
      if (distance < 40) return "中等明确";
      return "明显倾向";
    }
    function getDimensionAnalysis(left, right, leftPct, rightPct) {
      const distance = Math.abs(leftPct - rightPct);
      let tendency = null;
      if (leftPct > rightPct) tendency = left;
      else if (rightPct > leftPct) tendency = right;
      return { left, right, [left]: leftPct, [right]: rightPct, tendency, distance, clarity: getClarity(distance) };
    }
    function calculateOverallClarity(dimensions) {
      const distances = ENGINE_DIMENSIONS.map(d => dimensions[d.key].distance);
      const average = distances.reduce((sum, v) => sum + v, 0) / distances.length;
      if (average < 12) return "接近临界";
      if (average < 25) return "轻微倾向";
      if (average < 40) return "中等明确";
      return "明显明确";
    }
    function test(answers, opts) {
      if (!answers || typeof answers !== "object") {
        throw new Error("MBTI.test() 需要传入一个答案对象。");
      }
      const maxQ = (opts && opts.maxQuestions) || 48;
      const score = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
      const normalizedAnswers = {};
      const missing = [];
      for (let i = 1; i <= maxQ; i++) {
        const id = String(i).padStart(2, "0");
        const raw = answers[id] !== undefined ? answers[id] : answers[i];
        const answer = normalizeAnswer(raw);
        if (!answer) { missing.push(id); continue; }
        normalizedAnswers[id] = answer;
        const rule = ENGINE_MAPPING[id];
        if (!rule) continue;
        score[rule[answer]] += rule.weight;
      }
      // 仅要求基础 48 题完整；加测 12 题可选
      const baseMissing = missing.filter(id => parseInt(id, 10) <= 48);
      if (baseMissing.length > 0) {
        throw new Error(`还有 ${baseMissing.length} 道基础题未回答：${baseMissing.join(", ")}`);
      }
      const dimensions = {};
      ENGINE_DIMENSIONS.forEach(dimension => {
        const leftScore = score[dimension.left];
        const rightScore = score[dimension.right];
        const total = leftScore + rightScore || 1;
        const leftPct = Math.round((leftScore / total) * 100);
        const rightPct = 100 - leftPct;
        dimensions[dimension.key] = getDimensionAnalysis(dimension.left, dimension.right, leftPct, rightPct);
      });
      let type = "";
      ENGINE_DIMENSIONS.forEach(dimension => {
        const result = dimensions[dimension.key];
        if (result.tendency) {
          type += result.tendency;
        } else {
          type += result.left;
          result.isTie = true;
        }
      });
      // 次要性格：翻转距离最近（临界）的 1～2 个维度，得到邻近类型
      const rankedDims = ENGINE_DIMENSIONS
        .map(d => ({ key: d.key, left: d.left, right: d.right, distance: dimensions[d.key].distance, tendency: dimensions[d.key].tendency || d.left }))
        .sort((a, b) => a.distance - b.distance);
      function flipType(base, dimKey) {
        const dim = ENGINE_DIMENSIONS.find(d => d.key === dimKey);
        if (!dim) return base;
        const chars = base.split("");
        const idx = ENGINE_DIMENSIONS.indexOf(dim);
        const cur = chars[idx];
        chars[idx] = cur === dim.left ? dim.right : dim.left;
        return chars.join("");
      }
      const secondaries = [];
      for (let i = 0; i < rankedDims.length && secondaries.length < 2; i++) {
        const d = rankedDims[i];
        if (d.distance >= 28) break; // 太明确则不再算次性格
        const alt = flipType(type, d.key);
        if (alt === type || !ENGINE_TYPES[alt]) continue;
        const pct = Math.max(8, Math.round(50 - d.distance * 0.7));
        const reason = d.distance < 10
          ? `${d.key} 维度接近临界（差距约 ${d.distance}%），翻转后仍有显著可能`
          : `${d.key} 维度倾向较轻（差距约 ${d.distance}%），存在次要面`;
        secondaries.push({ type: alt, name: ENGINE_TYPES[alt].name, percent: pct, reason });
      }
      const overallClarity = calculateOverallClarity(dimensions);
      // 主类型置信度：四维平均倾向强度，映射到约 55%–92%
      const avgDist = ENGINE_DIMENSIONS.reduce((s, d) => s + dimensions[d.key].distance, 0) / 4;
      const primaryPercent = Math.min(92, Math.max(55, Math.round(55 + avgDist * 0.9)));
      const typeInfo = ENGINE_TYPES[type] || null;
      const report = typeInfo ? {
        type,
        name: typeInfo.name,
        summary: typeInfo.summary,
        strengths: [...typeInfo.strengths],
        blindSpots: [...typeInfo.blindSpots],
        work: typeInfo.work,
        relationship: typeInfo.relationship,
        stress: typeInfo.stress,
        mystic: typeInfo.mystic || '',
        primaryPercent,
        secondaries
      } : null;
      return { type, overallClarity, primaryPercent, score: { ...score }, answers: { ...normalizedAnswers }, dimensions, report, secondaries };
    }
    const MBTI = { version: "0.2.0", test, types: ENGINE_TYPES };
    if (typeof global !== "undefined") global.MBTI = MBTI;
  })(typeof window !== "undefined" ? window : this);
