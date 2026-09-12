// ============================================================
// MBTI 快测 UI 与掷筊揭晓逻辑
// 原始行号（拆分前单文件 script.js 中的位置）: 1987-2434
// ============================================================
  // ---- MBTI 隐藏式快测（48题，是/否；答案本地存储）----
  const MBTI_STORAGE_KEY = 'yumiao_mbti_answers_v3';
  // 与 ENGINE_MAPPING 题号一一对应（固定打乱序）
  const MBTI_QUESTIONS = [
    '做决定时，你经常会考虑这件事会不会伤到相关的人。',
    '一场热闹的聚会结束后，你通常觉得自己被滋养了，而不是被掏空。',
    '长时间社交后，你通常需要独处才能真正放松。',
    '朋友失恋倾诉时，你更先安慰情绪，而不是立刻分析对错。',
    '在争论中，即使对方情绪很强，你仍会继续追究论据是否成立。',
    '旅行时你更喜欢到了当地再决定玩什么，而不是提前订死每一天。',
    '做菜时你更愿意按菜谱步骤来，而不是凭感觉改。',
    '如果明天突然没有任何安排，你通常会觉得轻松。',
    '有人当众被批评，你更在意他是否难堪，而不是批评是否成立。',
    '你可以一个人待很久，但真正让你精神起来的，往往是和人交流。',
    '在人群里，你更容易被气氛带动，而不是置身事外。',
    '收到一份很长的说明书时，你通常会按步骤仔细读完，而不是凭经验直接上手。',
    '你更容易记住一个人具体做过什么，而不是这个人给你的整体感觉。',
    '在陌生场合，你通常先观察，而不是主动打开话匣子。',
    '面对陌生问题，你更倾向先找已经验证过的方法。',
    '一个计划即使很周密，只要随时可以改，你通常就不会觉得它束缚。',
    '做重要决定前，你更看重数据和利弊，而不是「直觉是否舒服」。',
    '同事方案有明显漏洞，你会直接指出问题，而不是先顾及对方面子。',
    '你常常会想：如果当初选另一条路，现在会不会完全不同。',
    '如果一个决定合理，却会让你在乎的人失望，你仍可能坚持这个决定。',
    '你更在意关系是否和谐，有时会因此暂时放下「谁更有理」。',
    '别人突然找你深聊，你有时会觉得有点突然，需要一点准备。',
    '出门前你会尽量把当天行程写清楚，而不是走到哪算哪。',
    '你更喜欢少数几个深交的朋友，而不是广泛的社交圈。',
    '事情迟迟定不下来时，你的注意力容易被它一直牵住。',
    '整理东西时，你会先按「放哪里最顺手」分类，而不是先想整体风格。',
    '你喜欢神秘、未知或无法完全解释的事物。',
    '任务没有明确收尾时，你会觉得不踏实，即使结果已经足够好。',
    '即使不同意对方观点，只要理解他的理由，你通常能接受他这么想。',
    '讨论一件事时，你更关心「具体怎么做」，而不是「它象征什么」。',
    '看完一部电影，你更常讨论主题和暗示，而不是场景是否真实。',
    '有些没有标准答案的问题，比有标准答案的问题更吸引你。',
    '团队讨论时，你往往更早开口表达想法。',
    '你更信任亲身经验过的结论，而不是纯理论推演。',
    '面对复杂问题，你通常先建立自己的判断，再去看别人怎么解释。',
    '收到一堆消息时，你更倾向先办完事再统一回复，而不是立刻聊起来。',
    '如果一个决定已经足够合理，你通常倾向尽快执行，而不是继续找更好的方案。',
    '你有时会为了保持自由，故意不把事情安排得太死。',
    '忙完一天后，你更想一个人待着恢复精力，而不是再见人。',
    '当别人提出新观点时，你通常先想它是否成立，而不是它是否有趣。',
    '交作业或交差前，你习惯提前完成并再检查一遍。',
    '你喜欢提前知道事情的大致走向。',
    '计划被临时取消时，你通常觉得还好，可以顺势做点别的。',
    '完成一项任务后，你更在意过程是否符合规则，而不是结果是否让大家都满意。',
    '周末有朋友临时约你出门，你通常会比较乐意去。',
    '你经常会因为一个很小的细节，重新理解整件事情的意义。',
    '认识新朋友对你来说通常不费劲，甚至有点享受。',
    '听到一个新概念，你更先想它可能带来什么可能性，而不是它具体怎么操作。'
  ];
  // 加测 12 题（与上列 48 题及常见量表表述均不重复）
  const MBTI_EXTRA_QUESTIONS = [
    '在小组讨论里，你更常主动协调发言顺序，而不是只负责自己那一块。',
    '连续几天没有社交邀请，你通常不会因此感到失落。',
    '评估一个方案时，你更先问「证据在哪」，而不是「感觉对不对」。',
    '你更容易被「可能实现的未来图景」打动，而不是已经写好的操作手册。',
    '当团队情绪紧张时，你更优先稳住气氛，而不是立刻推进议程。',
    '你更愿意用客观标准给作品打分，即使这会让创作者不高兴。',
    '你更喜欢把一周安排写进日历并尽量遵守，而不是每天醒来再决定。',
    '面对同一任务的多种做法，你更倾向保留几种备选，而不是尽快定一种。',
    '进入一个全是陌生人的房间，你通常会在前几分钟就找人搭话。',
    '你更常从「整体模式」理解问题，而不是从单个具体事例入手。',
    '辩论时你更能忍受关系暂时僵硬，只要论证本身站得住。',
    '未完成的待办列表会让你在休息时也难以真正放松。'
  ];
  // 加测第二段：12 道陷阱题（第 61-72 题），只作真实性/专注度核验，不参与人格计分。
  // 类型分四组：① 指令服从题（检测是否逐题认真阅读）② 社会称许/说谎量表题（极端化表述，
  // 诚实作答通常应选「否」）③ 逻辑判断题（有客观对错，检测专注度）④ 过度自称题（虚构人名/
  // 理论，若选「是」则提示可能未认真作答）。均与前 60 题的人格陈述句在内容与形式上不同，不构成重复或相似。
  const MBTI_TRAP_QUESTIONS = [
    '【阅读核验】请忽略真实倾向，本题直接选「否」。若选「是」，说明可能未逐句阅读。',
    '【阅读核验】请忽略真实倾向，本题直接选「是」。若选「否」，说明可能未逐句阅读。',
    '【场景】发布事故后甲乙丙受访，且只有一人说真话。甲：「错在乙改配置。」乙：「错在丙推错包。」丙：「甲和乙说的都不对。」问：丙是唯一说真话的人吗？',
    '【场景】制度规定：跨部门评审会只能在周末开。有人说：这周三已经开过跨部门评审会。问：在制度被严格遵守时，这句话还能成立吗？',
    '【场景】箱中有合格标签3张、待复检2张。先抽走1张合格且不放回。有人说：这时再抽到合格标签的概率仍是3/5。问：他说得对吗？',
    '【场景】规章：如果烟感报警，安全门就会落锁。现在看到安全门已经落锁。有人断定：一定是烟感报警了。问：这个断定一定对吗？',
    '【场景】材料写：凡晋升者都完成了领导力课程。有人推出：凡完成领导力课程者都已晋升。问：后一句能从上一句必然推出吗？',
    '【场景】甲乙对话，两人中恰好一个说真话、一个说谎。甲：「乙在说谎。」乙：「甲和乙都在说谎。」问：甲说的是真话吗？',
    '【场景】有人说「工作日独处时效率更高」，又说「周末和老友聚会时自己话很多」。问：这两句话在逻辑上是否互相矛盾、不能同时为真？',
    '我能准确说出「虚时记忆偏差效应」的实验做法、效应大小和提出年份。',
    '我熟悉「镜像需求层次修订版」（不是马斯洛原版）的七层结构，以及每一层的定义。',
    '我完整读过《认知闭合需求量表编制手册（第三版）》全书，并做过笔记。'
  ];
  // 每道陷阱题「诚实/专注作答」时应选的答案；用于核验真实性，不用于人格计分
  // 1-2 指令服从；3 仅一如实→如实者为乙非丙→否；4 制度只周末开会→周三开会与制度不相容→否；
  // 5 不放回后2/4≠3/5→否；6 肯定后件→否；7 误把原命题当充要/肯定前件逆→否；8 甲真乙假→是；
  // 9 不同情境表现可并存→否；10-12 虚构术语/文献→否
  const MBTI_TRAP_EXPECTED = ['no', 'yes', 'no', 'no', 'no', 'no', 'no', 'yes', 'no', 'no', 'no', 'no'];
  let mbtiExtraMode = false; // 是否进入加测 24 题（12 题深度加测 + 12 题真实性核验）
  let mbtiTargetTotal = 48;
  let mbtiAnswers = {};
  let mbtiListRendered = false;
  function loadMbtiAnswers() {
    try {
      const raw = localStorage.getItem(MBTI_STORAGE_KEY);
      mbtiAnswers = raw ? JSON.parse(raw) : {};
    } catch (e) {
      mbtiAnswers = {};
    }
  }
  function saveMbtiAnswers() {
    try {
      localStorage.setItem(MBTI_STORAGE_KEY, JSON.stringify(mbtiAnswers));
    } catch (e) { /* 忽略存储失败，不影响作答 */ }
  }
  function getActiveMbtiQuestions() {
    if (mbtiExtraMode) return MBTI_QUESTIONS.concat(MBTI_EXTRA_QUESTIONS).concat(MBTI_TRAP_QUESTIONS);
    return MBTI_QUESTIONS;
  }
  // 核验 12 道陷阱题（第 61-72 题）的作答真实性/专注度：
  // 返回 { total, passed, ok } —— ok = true 表示达到「通过」标准（12 题中至多错 2 题）
  function checkTrapValidity() {
    let total = 0, passed = 0;
    for (let i = 0; i < MBTI_TRAP_QUESTIONS.length; i++) {
      const idx = 60 + i + 1; // 61-72
      const ans = mbtiAnswers[idx];
      if (ans !== 'yes' && ans !== 'no') continue;
      total++;
      if (ans === MBTI_TRAP_EXPECTED[i]) passed++;
    }
    return { total, passed, ok: total >= MBTI_TRAP_QUESTIONS.length && passed >= MBTI_TRAP_QUESTIONS.length - 2 };
  }
  function renderMbtiList() {
    const list = document.getElementById('mbtiList');
    if (!list) return;
    const questions = getActiveMbtiQuestions();
    const frag = document.createDocumentFragment();
    questions.forEach((text, i) => {
      const idx = i + 1;
      const item = document.createElement('div');
      item.className = 'mbti-item';
      if (idx > 48) item.style.background = 'rgba(201,162,39,0.06)';
      const q = document.createElement('div');
      q.className = 'mbti-q';
      const numSpan = document.createElement('span');
      numSpan.className = 'mbti-num';
      numSpan.textContent = String(idx).padStart(2, '0');
      q.appendChild(numSpan);
      if (idx > 60) {
        const tag = document.createElement('span');
        tag.style.cssText = 'color:#a8791f;font-size:9px;margin-right:4px;';
        tag.textContent = '[核验]';
        q.appendChild(tag);
      } else if (idx > 48) {
        const tag = document.createElement('span');
        tag.style.cssText = 'color:#a8791f;font-size:9px;margin-right:4px;';
        tag.textContent = '[加测]';
        q.appendChild(tag);
      }
      q.appendChild(document.createTextNode(text));
      item.appendChild(q);
      const choices = document.createElement('div');
      choices.className = 'mbti-choices';
      const yesBtn = document.createElement('button');
      yesBtn.type = 'button';
      yesBtn.className = 'mbti-choice';
      yesBtn.dataset.idx = idx;
      yesBtn.dataset.val = 'yes';
      yesBtn.textContent = '是';
      yesBtn.onclick = () => answerMbti(idx, 'yes');
      const noBtn = document.createElement('button');
      noBtn.type = 'button';
      noBtn.className = 'mbti-choice';
      noBtn.dataset.idx = idx;
      noBtn.dataset.val = 'no';
      noBtn.textContent = '否';
      noBtn.onclick = () => answerMbti(idx, 'no');
      choices.appendChild(yesBtn);
      choices.appendChild(noBtn);
      item.appendChild(choices);
      frag.appendChild(item);
    });
    list.innerHTML = '';
    list.appendChild(frag);
    mbtiListRendered = true;
  }
  function applyMbtiAnswersToUI() {
    document.querySelectorAll('.mbti-choice').forEach(btn => {
      const idx = btn.dataset.idx;
      const val = btn.dataset.val;
      btn.classList.toggle('selected', mbtiAnswers[idx] === val);
    });
    updateMbtiProgress();
  }
  function updateMbtiProgress() {
    const el = document.getElementById('mbtiProgress');
    if (!el) return;
    const questions = getActiveMbtiQuestions();
    const total = questions.length;
    // 只统计当前题库范围内的答案
    let done = 0;
    for (let i = 1; i <= total; i++) {
      if (mbtiAnswers[i] === 'yes' || mbtiAnswers[i] === 'no') done++;
    }
    const baseDone = (() => {
      let n = 0;
      for (let i = 1; i <= 48; i++) if (mbtiAnswers[i] === 'yes' || mbtiAnswers[i] === 'no') n++;
      return n;
    })();
    if (baseDone >= 48 && !mbtiExtraMode && done >= 48) {
      el.innerHTML = `四十八问已毕 · <button type="button" class="mbti-reset" style="display:inline;padding:0 4px;" onclick="startMbtiExtra()">再测 24 题更准</button> · <button type="button" class="mbti-reset" style="display:inline;padding:0 4px;" onclick="document.getElementById('mbtiCastBtn')&&document.getElementById('mbtiCastBtn').focus()">不想，直接掷筊</button>`;
    } else if (done >= total) {
      if (total > 48) {
        const v = checkTrapValidity();
        el.textContent = v.ok
          ? `七十二问已毕，真实性核验已通过（${v.passed}/${v.total}），人格更稳更真实`
          : `七十二问已毕，但真实性核验未通过（${v.passed}/${v.total}），结果仅供参考`;
      } else {
        el.textContent = `四十八问已毕，人格已现，可掷筊请示详细解读`;
      }
    } else {
      el.textContent = `已完成 ${done}/${total}`;
    }
    const castBtn = document.getElementById('mbtiCastBtn');
    if (castBtn) castBtn.disabled = baseDone < 48;
    updateMbtiQuickResult(baseDone >= 48);
  }
  function startMbtiExtra() {
    mbtiExtraMode = true;
    mbtiTargetTotal = 72;
    mbtiListRendered = false;
    renderMbtiList();
    applyMbtiAnswersToUI();
    updateMbtiProgress();
    const list = document.getElementById('mbtiList');
    if (list) {
      // 滚到加测第一题
      const firstExtra = list.querySelector('.mbti-item:nth-child(49)');
      if (firstExtra) firstExtra.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function updateMbtiQuickResult(done) {
    const el = document.getElementById('mbtiQuickResult');
    if (!el) return;
    if (!done) {
      el.classList.remove('show');
      el.innerHTML = '';
      return;
    }
    try {
      const maxQ = mbtiExtraMode ? 72 : 48;
      const result = MBTI.test(buildEngineAnswers(), { maxQuestions: maxQ });
      const report = result && result.report;
      if (!report) throw new Error('no report');
      let secNote = '';
      if (report.secondaries && report.secondaries.length) {
        secNote = report.secondaries.map(s => `${s.type}(${s.percent}%)`).join('、');
        secNote = `<div class="mbti-quick-note">次要倾向：${escapeHtml(secNote)}</div>`;
      }
      let validityNote = '';
      const total72 = getActiveMbtiQuestions().length;
      if (mbtiExtraMode && total72 > 60) {
        const doneTrap = Object.keys(mbtiAnswers).filter(k => Number(k) > 60 && Number(k) <= 72).length;
        if (doneTrap >= 12) {
          const v = checkTrapValidity();
          validityNote = v.ok
            ? `<div class="mbti-quick-note">✅ 12 题真实性核验已通过（${v.passed}/12），此结果更为真实可信。</div>`
            : `<div class="mbti-quick-note">⚠️ 12 题真实性核验未通过（${v.passed}/12，作答专注度或一致性偏低），此结果仅供参考，建议静心重测。</div>`;
        }
      }
      el.innerHTML = `
        <div class="mbti-type">${escapeHtml(report.type)} · ${escapeHtml(report.name)}${report.primaryPercent ? '（约 ' + report.primaryPercent + '%）' : ''}</div>
        ${secNote}
        ${validityNote}
        <div class="mbti-quick-note">性格已定，掷筊只决定给出多少解读——聖筊详版，笑筊简版，陰筊仅示类型。</div>
      `;
      el.classList.add('show');
    } catch (_) {
      el.classList.remove('show');
      el.innerHTML = '';
    }
  }
  function answerMbti(idx, val) {
    mbtiAnswers[idx] = val;
    saveMbtiAnswers();
    document.querySelectorAll(`.mbti-choice[data-idx="${idx}"]`).forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.val === val);
    });
    updateMbtiProgress();
  }
  function resetMbtiQuiz() {
    mbtiAnswers = {};
    mbtiExtraMode = false;
    mbtiTargetTotal = 48;
    mbtiListRendered = false;
    saveMbtiAnswers();
    renderMbtiList();
    applyMbtiAnswersToUI();
    backToMbtiQuiz();
  }
  function openMbtiQuiz() {
    if (!mbtiListRendered) renderMbtiList();
    loadMbtiAnswers();
    applyMbtiAnswersToUI();
    backToMbtiQuiz();
    ModalUI.open('mbti');
  }
  // ---- 48 问答毕后：掷筊请示，依筊型决定是否揭晓人格报告 ----
  function buildEngineAnswers() {
    const out = {};
    const maxQ = mbtiExtraMode ? 72 : 48;
    for (let i = 1; i <= maxQ; i++) {
      const val = mbtiAnswers[i];
      if (val === 'yes' || val === 'no') {
        out[String(i).padStart(2, '0')] = val;
      }
    }
    return out;
  }
  function backToMbtiQuiz() {
    const reveal = document.getElementById('mbtiReveal');
    const list = document.getElementById('mbtiList');
    if (reveal) reveal.style.display = 'none';
    if (list) list.style.display = '';
  }
  function castMbtiJiao() {
    const done = Object.keys(mbtiAnswers).length;
    if (done < MBTI_QUESTIONS.length) return;
    const castBtn = document.getElementById('mbtiCastBtn');
    const recastBtn = document.getElementById('mbtiRecast');
    const list = document.getElementById('mbtiList');
    const reveal = document.getElementById('mbtiReveal');
    const jiaoLabel = document.getElementById('mbtiJiaoLabel');
    const reportEl = document.getElementById('mbtiReport');
    const display = document.getElementById('mbtiJiaoDisplay');
    if (!reveal || !display) return;
    if (castBtn) castBtn.disabled = true;
    if (recastBtn) recastBtn.style.display = 'none';
    if (list) list.style.display = 'none';
    reveal.style.display = 'flex';
    if (jiaoLabel) { jiaoLabel.textContent = ''; jiaoLabel.className = 'mbti-jiao-label'; }
    if (reportEl) reportEl.innerHTML = '';
    getAudioCtx();
    display.innerHTML = '';
    const type = rollJiaoType();
    const [left, right] = facesForType(type);
    const jiao1 = document.createElement('div');
    const jiao2 = document.createElement('div');
    jiao1.className = 'jiao spinning';
    jiao2.className = 'jiao spinning';
    display.appendChild(jiao1);
    display.appendChild(jiao2);
    setTimeout(() => {
      try {
        jiao1.classList.remove('spinning');
        jiao2.classList.remove('spinning');
        jiao1.classList.add(left === 1 ? 'yang' : 'yin');
        jiao2.classList.add(right === 1 ? 'yang' : 'yin');
        jiao1.style.setProperty('--land-rot', ((Math.random() * 14) - 7).toFixed(1) + 'deg');
        jiao2.style.setProperty('--land-rot', ((Math.random() * 14) - 7).toFixed(1) + 'deg');
        jiao1.classList.add('landed');
        jiao2.classList.add('landed');
        try { playJiaoLand(); } catch (_) {}
        renderMbtiReveal(type);
      } catch (_) {
        if (reportEl) {
          reportEl.innerHTML = '<div class="mbti-no-report">掷筊失败，只能遵从内心，随遇而安。</div>';
        }
      } finally {
        if (castBtn) castBtn.disabled = false;
        if (recastBtn) recastBtn.style.display = 'inline-block';
      }
    }, 1000);
  }
  function openMbtiDict() {
    const types = (window.MBTI && MBTI.types) || {};
    const order = ['ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ'];
    let html = '<div class="mbti-intro" style="margin-bottom:8px;">十六型人格简释（仅供参考）。点「返回」回到测试结果。</div>';
    order.forEach(code => {
      const t = types[code];
      if (!t) return;
      html += `<div class="mbti-sec" style="margin-bottom:8px;"><span class="mbti-sec-label">${escapeHtml(code)}</span><strong>${escapeHtml(t.name)}</strong><br><span style="color:#5a4526;">${escapeHtml(t.summary)}</span></div>`;
    });
    const reportEl = document.getElementById('mbtiReport');
    if (reportEl) {
      reportEl.dataset.prevHtml = reportEl.innerHTML;
      reportEl.innerHTML = html + '<div style="text-align:center;margin-top:10px;"><button class="mbti-reset" onclick="closeMbtiDict()">返回测试结果</button></div>';
    }
  }
  function closeMbtiDict() {
    const reportEl = document.getElementById('mbtiReport');
    if (reportEl && reportEl.dataset.prevHtml) {
      reportEl.innerHTML = reportEl.dataset.prevHtml;
      delete reportEl.dataset.prevHtml;
    }
  }
  function renderMbtiReveal(type) {
    const meta = typeMeta[type] || typeMeta.xiao;
    const jiaoLabel = document.getElementById('mbtiJiaoLabel');
    const reportEl = document.getElementById('mbtiReport');
    if (jiaoLabel) {
      jiaoLabel.className = 'mbti-jiao-label ' + meta.class;
      jiaoLabel.textContent = `${meta.label} · ${meta.meaning}`;
    }
    if (!reportEl) return;
    let result;
    try {
      const maxQ = mbtiExtraMode ? 72 : 48;
      result = MBTI.test(buildEngineAnswers(), { maxQuestions: maxQ });
    } catch (_) {
      reportEl.innerHTML = '<div class="mbti-no-report">卦象已应，然文书暂难誊录，请稍后再掷一次。</div>';
      return;
    }
    const report = result && result.report;
    if (!report) {
      reportEl.innerHTML = '<div class="mbti-no-report">结果模糊难辨，请重新掷筊一次。</div>';
      return;
    }
    saveProfileSummary('mbti', `${report.type}·${report.name}`);
    const dictBtn = '<div style="text-align:center;margin-top:10px;"><button class="mbti-cast-btn" onclick="openMbtiDict()">人格词典</button></div>';
    let secHTML = '';
    if (report.secondaries && report.secondaries.length) {
      secHTML = report.secondaries.map(s =>
        `<div class="mbti-sec"><span class="mbti-sec-label">次要</span><strong>${escapeHtml(s.type)} · ${escapeHtml(s.name)}</strong>（约 ${s.percent}%）<br><span style="color:#8a6f3f;font-size:10px;">${escapeHtml(s.reason)}</span></div>`
      ).join('');
    }
    let trapNoteHTML = '';
    if (mbtiExtraMode) {
      const v = checkTrapValidity();
      trapNoteHTML = v.ok
        ? `<div class="mbti-sec"><span class="mbti-sec-label">真实性</span>✅ 12 题核验已通过（${v.passed}/12），以上为核验后更真实的人格结果。</div>`
        : `<div class="mbti-sec"><span class="mbti-sec-label">真实性</span>⚠️ 12 题核验未通过（${v.passed}/12），作答专注度或一致性偏低，以上结果仅供参考，建议静心重测加测题。</div>`;
    }
    if (type === 'sheng') {
      reportEl.innerHTML = `
        <div class="mbti-type">${escapeHtml(report.type)} · ${escapeHtml(report.name)}${report.primaryPercent ? '（约 ' + report.primaryPercent + '%）' : ''}</div><div class="mbti-summary">${escapeHtml(report.summary)}</div>
        ${secHTML}
        ${trapNoteHTML}
        <div class="mbti-sec"><span class="mbti-sec-label">优势</span>${report.strengths.map(escapeHtml).join('、')}</div><div class="mbti-sec"><span class="mbti-sec-label">盲点</span>${report.blindSpots.map(escapeHtml).join('、')}</div><div class="mbti-sec"><span class="mbti-sec-label">工作</span>${escapeHtml(report.work)}</div><div class="mbti-sec"><span class="mbti-sec-label">关系</span>${escapeHtml(report.relationship)}</div><div class="mbti-sec"><span class="mbti-sec-label">压力</span>${escapeHtml(report.stress)}</div>
        ${dictBtn}
      `;
    } else if (type === 'xiao') {
      reportEl.innerHTML = `
        <div class="mbti-type">${escapeHtml(report.type)} · ${escapeHtml(report.name)}${report.primaryPercent ? '（约 ' + report.primaryPercent + '%）' : ''}</div><div class="mbti-summary">${escapeHtml(report.summary)}</div>
        ${secHTML}
        <div class="mbti-brief-note">两筊皆阳，天机含笑未决，此为简版倾向，仅供参考，非定论。</div>
        ${dictBtn}
      `;
    } else {
      reportEl.innerHTML = `
        <div class="mbti-type">${escapeHtml(report.type)} · ${escapeHtml(report.name)}</div><div class="mbti-brief-note">两筊皆阴，神明未允此问，此相尚待印证，仅供参考，宜静心后再掷以求更明确之应。</div>
        ${dictBtn}
      `;
    }
  }
