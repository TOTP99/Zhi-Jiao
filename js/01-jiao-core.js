// ============================================================
// 掷筊核心：滚动锁 / 弹窗开关 / 瑞兽信息 / 音效 / 签文数据库 / 问卜菜单
// 原始行号（拆分前单文件 script.js 中的位置）: 1-1244
// ============================================================
  // ---- 弹层滚动锁：打开星盘/八字/星座/MBTI/记录 等浮层时，锁住背景掷筊页面的滚动，
  // 避免在浮层内上下滑动选择年月日时时，手指误触发背景页面跟着滚动。
  // 用计数器支持"浮层里再叠一层"（如星盘小词典）的嵌套开关场景。
  let _scrollLockCount = 0;
  let _savedScrollY = 0;
  function lockPageScroll() {
    if (_scrollLockCount === 0) {
      _savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.style.position = 'fixed';
      document.body.style.top = (-_savedScrollY) + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.documentElement.classList.add('scroll-locked');
    }
    _scrollLockCount++;
  }
  function unlockPageScroll() {
    _scrollLockCount = Math.max(0, _scrollLockCount - 1);
    if (_scrollLockCount === 0) {
      document.documentElement.classList.remove('scroll-locked');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, _savedScrollY);
    }
  }
  // ---- 统一弹窗开关层（ModalUI）----
  // 只负责"弹窗怎么开/怎么关"这类纯 UI 行为（加减 show class、背景滚动锁）。
  // 各业务模块（八字/星座/星盘/MBTI）打开或关闭前后要做的具体业务动作
  // （加载表单数据、初始化滚轮、清空状态等）仍留在各自的 openXxxPanel/closeXxxPanel 里，
  // 这里不替它们决定该做什么业务逻辑，只统一"显示/隐藏 + 滚动锁"这一层。
  const ModalRegistry = {
    mbti:    { backdrop: 'mbtiBackdrop',    modal: 'mbtiModal' },
    bazi:    { backdrop: 'baziBackdrop',    modal: 'baziModal' },
    zodiac:  { backdrop: 'zodiacBackdrop',  modal: 'zodiacModal' },
    western: { backdrop: 'westernBackdrop', modal: 'westernModal' }
  };
  const ModalUI = {
    isOpen(name) {
      const cfg = ModalRegistry[name];
      if (!cfg) return false;
      const backdrop = document.getElementById(cfg.backdrop);
      return !!(backdrop && backdrop.classList.contains('show'));
    },
    open(name) {
      const cfg = ModalRegistry[name];
      if (!cfg) return;
      const backdrop = document.getElementById(cfg.backdrop);
      const modal = document.getElementById(cfg.modal);
      const wasOpen = !!(backdrop && backdrop.classList.contains('show'));
      if (backdrop) backdrop.classList.add('show');
      if (modal) modal.classList.add('show');
      if (!wasOpen) lockPageScroll();
    },
    close(name) {
      const cfg = ModalRegistry[name];
      if (!cfg) return;
      const backdrop = document.getElementById(cfg.backdrop);
      const modal = document.getElementById(cfg.modal);
      if (backdrop) backdrop.classList.remove('show');
      if (modal) modal.classList.remove('show');
      unlockPageScroll();
    }
  };
  let selectedBeast = null;
  const beastInfo = {
    dragon: { name: '唤醒天龙', emoji: '🐉', style: '突破与转机' },
    tiger:  { name: '平定四方', emoji: '🐯', style: '稳定与守护' },
    lion:   { name: '瑞兽祈福', emoji: '🦁', style: '福气与庇佑' }
  };
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function makeNoiseBurst(ctx, t, dur, freq, q, vol) {
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(bp).connect(g).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + dur);
  }
  // 铜铃 — 清亮回响铃声，用于选中猛虎
  function playBell() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const freqs = [1318.5, 1975.5, 2637];
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.28, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    master.connect(ctx.destination);
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
      const g = ctx.createGain();
      g.gain.value = 1 / (i + 1.6);
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }
  // 掷筊落地 — 龟甲筊落地时的三响弹跳声，用于掷筊按键
  function playJiaoLand() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    function knock(t, freq, vol) {
      makeNoiseBurst(ctx, t, 0.07, freq, 4, vol);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 0.6, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.35, t + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    }
    knock(now, 500, 0.5);
    knock(now + 0.09, 460, 0.42);
    knock(now + 0.19, 480, 0.32);
  }
  // 磬 — 石钟清越长鸣，用于选中天龙
  function playQing() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    makeNoiseBurst(ctx, now, 0.035, 3200, 8, 0.22);
    const freqs = [622.25, 933, 1244.5, 1866];
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.3, now + 0.006);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    master.connect(ctx.destination);
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.002);
      const g = ctx.createGain();
      g.gain.value = 1 / (i + 1.3);
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + 1.9);
    });
  }
  // 击钟 — 洪钟深沉一击，用于选中瑞狮
  function playZhong() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    makeNoiseBurst(ctx, now, 0.05, 800, 3, 0.3);
    const freqs = [196, 293.7, 392, 587];
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.4, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    master.connect(ctx.destination);
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.003);
      const g = ctx.createGain();
      g.gain.value = 1 / (i + 1.2);
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + 2.7);
    });
  }
  const typeMeta = {
    sheng: { title: '聖 筊', class: 'sheng', label: '聖筊', meaning: '一正一反，神明应允' },
    xiao:  { title: '笑 筊', class: 'xiao',  label: '笑筊', meaning: '两筊皆阳，神明含笑未决' },
    yin:   { title: '陰 筊', class: 'yin',   label: '陰筊', meaning: '两筊皆阴，神明未允' }
  };
  // 静态备用文案，仅在 AI 神谕生成失败时使用
  const fallbackOracles = {
    sheng: { 神意: '时机已至，顺势而行，此事可成。', 宜: '主动争取', 忌: '犹豫不决' },
    xiao:  { 神意: '天机未明，此事尚在变化之中。', 宜: '静观其变', 忌: '仓促决断' },
    yin:   { 神意: '时机未到，强行推进恐有阻碍。', 宜: '韬光养晦', 忌: '强求硬闯' }
  };
  // 分类判词库（约 537 条神意，覆盖常见人生议题）
  const judgmentBank = {
    marriage: {
      sheng: ['姻缘将至，两心渐近，宜主动争取促成美满良缘。', '此时姻缘正浓，双方情投意合，宜把握良机共订终身。', '情意相通，正宜坦诚相待，可推进关系更进一步。', '旧情若再续，时机尚可，宜以诚相见勿再猜忌。', '表白时机尚可，态度真诚为要。', '婚礼筹备诸事较顺，宜把握节点。', '相亲对象缘分可试，宜多了解少急断。', '婚姻经营宜多沟通，家和则事兴。', '两心渐近，宜坦诚相待推进关系。', '缘分正浓，可认真考虑长期承诺。', '和解旧怨时机好，夫妻或伴侣宜软语。', '共同面对困难可使感情更深。'],
      xiao: ['缘分未定，情意难辨，宜静待时机勿操之过急。', '双方心意尚未对齐，宜多沟通少假设。', '情意未明，宜再观察对方态度。', '双方节奏不一，宜放慢脚步。', '婚礼或承诺宜再议细节。', '暗恋尚在朦胧，不宜强推。', '感情需时间发酵。', '线上热络线下再验。'],
      yin: ['姻缘未合，强求无益，此时不宜急于定下终身。', '感情生变，恐有第三者介入或误会横生，宜谨慎处理为要。', '此刻强求表白或复合，恐反生隔阂，宜暂缓。', '强求姻缘恐生反感，宜暂缓。', '此时不宜定终身或闪婚。', '口舌误会易起，宜少争辩。', '三角关系勿入。', '因寂寞结合不稳。'],
    },
    romance: {
      sheng: ['桃花运显，社交场合易遇有缘人，宜自然大方。', '暗恋表白有机会，态度真诚为要。', '约会氛围好。', '暧昧可推进确认。', '异地坚持有回报。', '兴趣社群易生情。', '旧识生新情。', '坦诚能加深好感。'],
      xiao: ['情愫若有若无，宜观察对方态度再行动。', '节奏宜慢。', '对方忙，勿催。', '线上热络线下再验。'],
      yin: ['此时强推感情易碰壁，宜先经营自己。', '三角关系勿入。', '霸道追求惹反感。', '因寂寞结合不稳。'],
    },
    job: {
      sheng: ['职途顺遂，此时行动必有所获，宜把握机会前行。', '此时求职面试运势正旺，宜积极展现自我把握良机。', '升迁调岗窗口已开，宜主动争取表现。', '与上级沟通此事，时机正好，宜坦诚说明。', '跳槽目标较明确，可推进面试。', '团队合作项目宜主动协调。', '述职汇报可顺利过关。', '新岗位适应较快，宜多请教。', '加班换来的成果将被看见。', '面试运佳，宜积极展现真实能力。', '工作上的卡点将松动。', '贵人在职场侧翼相助。'],
      xiao: ['职途未明，去留难定，宜多方权衡莫仓促决断。', '跳槽与否犹豫难定，新旧去留两难，宜多加权衡从长计议。', 'offer 条件可再谈，勿急签。', '同事关系需再磨合。', '工作节奏宜稳，勿一次揽过多。', '去留两难，宜列利弊再决。'],
      yin: ['职途受阻，此时行动恐生波折，宜暂缓行事为宜。', '此时递辞呈或强提条件，恐不利，宜再观望。', '职场口舌宜避，少议是非。', '强提条件易碰壁。', '重要汇报宜改期更稳。', '硬刚上级易伤。'],
    },
    wealth: {
      sheng: ['财运亨通，此时投入必有所得，宜把握良机进财。', '进账之机将现，宜把握正当渠道，勿因小失大。', '债务回收或借款周转，此时较顺，宜主动推进。', '小额投资可试，见好即收。', '理财调整方向正确，可执行。', '兼职副业有起色，宜坚持。', '省下不必要开支即是进财。', '合作分成比例可谈拢。', '红包礼金往来平稳。', '财运上扬宜记账不浪。', '正当经营有进项。', '回收尾款有望。'],
      xiao: ['财运未明，得失难料，宜谨慎理财莫贸然投入。', '投资时机尚未明朗，盈亏难料，宜小额试探莫孤注一掷。', '大额投入宜再调研。', '股市基金波动中，宜小仓。', '借贷需量力，勿超负荷。', '消费欲望高，宜设预算。', '冲动消费宜再等一夜。', '预算紧张，做减法。'],
      yin: ['财运不佳，此时投入恐有损失，宜暂缓理财计划。', '此时财运低迷，投资恐有亏损，宜守成为上勿轻举妄动。', '大额消费或借贷此时不宜，宜量入为出。', '投机博彩宜止，守成为上。', '担保借款风险高，宜拒。', '财来财去快，宜记账自省。', '高息借贷陷阱。', '临时起意消费后悔。'],
    },
    career: {
      sheng: ['事业运势正旺，此时开拓必有所成，宜大胆进取。', '合伙创业时机正好，此时携手共进必得顺遂发展。', '新项目启动有贵人暗助，宜抓紧推进。', '品牌曝光机会好，宜把握。', '转型方向与时势相合。', '开店选址运势尚可。', '融资沟通有进展。', '团队扩编可推进。', '专利或资质申报较顺。', '创业窗口未关宜行动。', '事业贵人将现。', '长期布局开始见效。'],
      xiao: ['事业前景未明，宜多方考量，不宜贸然扩张求进。', '合作细节尚未谈拢，宜再议条件勿急签字。', '扩张宜缓，先稳基本盘。', '合作方需再核实信誉。', '商业计划宜再打磨。', '竞争加剧，宜差异化。'],
      yin: ['事业运势不佳，此时扩张恐生波折，宜暂缓脚步。', '事业转型恐生波折，此时贸然改弦更张恐得不偿失。', '贸然转型成本高。', '大额举债扩张不宜。', '合伙分歧大，宜缓签。', '市场冷清，宜收缩战线。'],
    },
    health: {
      sheng: ['身体渐入佳境，调养得法必见起色，宜坚持规律作息。', '问病求医此时较顺，宜及早检查勿拖延。', '术后或调理阶段运势向好，宜遵医嘱安心休养。', '运动计划可坚持，循序渐进。', '睡眠质量有望改善。', '饮食调整方向正确。', '体检结果总体无大碍。', '情绪疏导有效，宜继续。', '健康为第一财富今日可护。', '小病将愈宜巩固。', '养生习惯见效。', '身心平衡可期。'],
      xiao: ['身体状态平平，小恙未清，宜观察几日再决定是否就医。', '调养见效尚慢，宜耐心配合，勿急于停药或换方。', '运动强度宜减，以不累为度。', '复诊时间可再约。', '作息紊乱，宜先固定睡眠。', '健康指标临界观察。'],
      yin: ['此时身体信号需重视，不宜硬撑，宜尽早休息检查。', '剧烈运动或熬夜此时不宜，恐加重负担。', '硬撑加班伤身，宜休息。', '忽视信号恐加重，宜就医。', '烟酒宜减，肠胃需护。', '透支健康不值。', '医嘱勿违。', '连续熬夜伤元气。'],
    },
    exam: {
      sheng: ['考运正旺，复习得法，临场可发挥正常甚至超常。', '面试答辩运势佳，宜沉着应答，展现真实水平。', '证书考试准备充分可过。', '复习进入状态，宜攻坚弱项。', '考研方向适合，可坚持。', '作业论文进度可赶上。', '竞赛有发挥空间。', '留学申请材料较完整。'],
      xiao: ['考运未明，发挥在于临场心态，宜稳住节奏勿慌乱。', '成绩尚有变数，宜再巩固薄弱环节。', '复习计划宜微调。', '选专业仍可再比。', '考试发挥看临场。'],
      yin: ['此时考运偏弱，宜降低预期、稳住心态，勿自乱阵脚。', '临考前不宜大幅改计划，以熟悉内容为主。', '通宵突击效率低。', '作弊投机切忌。', '分心事多，先理优先级。'],
    },
    study: {
      sheng: ['学业思路渐通，宜集中一段完整时间攻坚。', '拜师求学或报课时机好，宜选与目标匹配者。', '技能练习有进步。', '阅读输入转化为用。', '笔记方法可固定。', '公开分享倒逼成长。', '跨领域学习有启发。', '学习曲线已过陡峭段。'],
      xiao: ['学习进度一般，宜调整方法，勿只堆时间。', '目标拆小再执行。', '陪伴学习更稳。', '资讯太多，做减法。'],
      yin: ['此时分心事多，硬学效率低，宜先理清优先级。', '三分钟热度勿起新坑。', '比较焦虑无益。', '熬夜学习伤效率。'],
    },
    house: {
      sheng: ['置业安家运势顺，看房签约可推进，宜把握合适房源。', '装修动工时机尚可，宜选良工、定清晰预算。', '搬家择日无妨，新居可渐入安定。', '租金谈判有空间。', '房贷方案可比较后选。', '物业沟通较顺。', '学区或地段符合预期。', '二手交割手续可办。'],
      xiao: ['房价与条件仍在变动，宜多看少定，勿被催单。', '合同细节未明，宜再审条款再签字。', '装修增项需控预算。', '邻居关系需磨合。'],
      yin: ['此时买房或大额装修宜缓，恐有隐藏风险。', '与邻居或物业纠纷，宜先协商，不宜硬碰。', '高价追涨不宜。', '无证或纠纷房勿碰。'],
    },
    travel: {
      sheng: ['出行运势正旺，此时启程必有一路顺遂之喜。', '此时结伴出游诸事顺遂，一路风光尽兴而归。', '短途出行无妨，择晴日动身更佳。', '机票酒店可订。', '签证材料较齐。', '自驾路况尚可。', '景点人流可接受。', '返程安排妥当。'],
      xiao: ['出行运势未定，行程尚有变数，宜从长计议莫早订票。', '天气反复，备雨具。', '早订票或改期两可。', '行李精简更轻松。'],
      yin: ['出行运势不佳，此时启程恐生波折，宜暂缓行程。', '远行途中恐有意外插曲，宜提前做好万全准备。', '高峰拥堵，改时更好。', '陌生路段勿夜行。'],
    },
    weather: {
      sheng: ['此时天时相助，风调雨顺，诸事顺遂可期可待。', '近日天朗气清，正宜户外活动，把握晴好时光出行为佳。', '风雨将歇可安排。', '温度适宜出行。', '空气质量尚可。', '晾晒衣被好时机。'],
      xiao: ['天时阴晴不定，近日天气反复，宜多加关注随时应变。', '关注预警再出门。', '早晚温差大添衣。', '紫外线强注意防晒。'],
      yin: ['天象示警，近日恐有风雨，诸事宜谨慎安排为上。', '近日恐有骤雨雷电，出行诸事宜多加防备莫强行。', '暴雨雷电宜闭门。', '台风路径靠近勿出。'],
    },
    sports: {
      sheng: ['此时运动竞技运势正旺，宜把握良机全力以赴。', '此时体能状态正佳，参赛竞技必有出色发挥可期。', '训练计划有效。', '团队配合默契。', '比赛心态稳。', '复出首战可打。'],
      xiao: ['运动竞技胜负难料，状态起伏不定，宜稳扎稳打勿轻敌躁进。', '强度循序渐进。', '伤病边缘宜控量。', '战术可再演练。'],
      yin: ['此时运动竞技运势不佳，宜谨慎参与避免受伤。', '此时体力欠佳，参赛恐有伤病之虞，宜量力而行为宜。', '带伤上阵不宜。', '赌气加训易伤。'],
    },
    decision: {
      sheng: ['此事可做，时机已至，宜当机立断付诸行动。', '两难之中，偏正向选择更稳妥，宜果断迈步。', '先小步试验再扩大。', '有贵人可询，再定更准。', '长期利益大于短期。', '与价值观相符即可行。', '准备充分即可动手。', '今日宜决断勿再拖。', '所问向好，宜积极作为。', '神明应允，可试行。', '心念与时机相合。', '小步前进可见效。'],
      xiao: ['此事尚在两可，宜再收集信息，勿今日强下定论。', '做与不做皆有代价，宜想清楚底线再动。', '信息不足，再观数日。', '两边代价需想清。', '可做但非必须急做。', '征求关键人意见再定。', '半明半暗宜谨慎。', '事缓则圆，勿催。'],
      yin: ['此事暂不宜做，强行推进恐生阻碍。', '今日做决定易后悔，宜过几日再议。', '情绪上头时勿定。', '违反底线之事勿为。', '妄动生灾，宜止。', '强求无益。', '宜退一步海阔。', '等待更好时机。'],
    },
    luck: {
      sheng: ['今日气运上扬，宜主动作为，小事可成。', '手气尚可，适度参与无妨，见好即收。', '贵人运显，宜求助。', '抽签抓阄运气不差。', '排队办事较顺。', '意外惊喜可能出现。', '社交场合运势好。', '气运上扬，主动作为。'],
      xiao: ['气运平平，不宜贪多，守成为上。', '手气一般，少动。', '今日不宜博弈。', '贵人暂隐，自力。'],
      yin: ['今日气运偏低，宜少动口舌、少碰博弈。', '手气不佳，宜收手休息，改日再试。', '冲动下注必失。', '霉运期宜低调。'],
    },
    family: {
      sheng: ['家人和睦，长辈沟通顺畅，宜借机表达关心。', '家中大事可商量，众人意见易趋向一致。', '亲子陪伴有益。', '手足协作可成事。', '家族聚会和睦。', '照顾病人有成效。', '和解旧怨时机好。', '家和万事兴应验于今日。'],
      xiao: ['家事尚有分歧，宜各退一步再谈。', '话题敏感，少提钱。', '照顾压力大，求分担。', '代际观念差，多倾听。'],
      yin: ['家中气氛略紧，宜避免争执话题。', '与家人意见相左时，今日不宜强行说服。', '冷战伤亲，宜破冰。', '家丑勿外扬。'],
    },
    friendship: {
      sheng: ['友缘和顺，深谈或求助皆宜，对方多能回应。', '新友可交，志同道合者渐近。', '旧友重逢有喜。', '组局聚会顺利。', '误会可澄清。', '合作朋友靠谱。', '引荐贵人有望。', '倾诉得到理解。'],
      xiao: ['朋友关系不冷不热，宜随缘往来，勿强求亲密。', '请托之事再斟酌。', '聚会可去可不去。', '交浅言深宜慎。'],
      yin: ['此时口舌易生，与友相处宜少议是非。', '请托之事暂缓，恐令对方为难。', '酒局口舌多，少饮。', '借钱给友宜量力。'],
    },
    business: {
      sheng: ['谈单议价运势顺，宜把握客户意向尽快推进。', '进货或合作条件可谈，宜锁定书面约定。', '回款跟进有效。', '供应商可换更优。', '展会获客有望。', '定价策略合适。', '渠道合作可签。', '售后纠纷可和解。'],
      xiao: ['生意往来需再核实对方信誉，宜小步试水。', '账期条件再谈。', '库存别压太满。', '先小单试水。'],
      yin: ['大额交易此时风险高，宜缓签缓付。', '口头承诺不可靠。', '恶性竞争勿跟。', '假货仿品远离。'],
    },
    legal: {
      sheng: ['诉讼或维权有理可依，此时推进较有利，宜备齐证据。', '调解和解窗口存在，宜把握协商空间。', '律师咨询有价值。', '合同条款可改有利。', '执行阶段有进展。', '劳动仲裁有理据。', '知识产权可维。', '证据齐则可推进。'],
      xiao: ['案情尚有变数，宜咨询专业意见，勿凭情绪行动。', '和解条件再权衡。', '时效问题要盯。', '先咨询再行动。'],
      yin: ['此时兴讼或强争恐不利，宜先求稳再图进。', '合同纠纷宜冷处理，避免扩大损失。', '无证硬争不利。', '网络泄愤增责。'],
    },
    lost: {
      sheng: ['失物可寻，宜沿原路与记忆仔细查找，或有人代为保管。', '走失联系之人，消息有望，宜保持畅通渠道。', '挂失补办可成。', '监控或证人有线索。', '失物招领处可问。', '定位功能有用。', '沿原路可寻。', '有人代为保管。'],
      xiao: ['下落未明，宜再扩大范围寻找，勿过早放弃。', '回忆细节再搜。', '多平台发寻人。', '勿过早放弃。'],
      yin: ['此时寻回希望较小，宜止损并做好遗失登记。', '危险区域勿独寻。', '勿轻信陌生人带路。', '重复购买前再等一日。'],
    },
    abroad: {
      sheng: ['出国之事运势正顺，此时申办必有好消息传来。', '留学签证此时办理顺利，材料齐全必得批复喜讯。', '面试语言关可过。', '奖学金申请有戏。', '租房住宿可定。', '落地适应较快。', '签证批复有望。', '材料齐全宜交。'],
      xiao: ['出国之事尚有变数，宜多加准备，静待时机成熟。', '补材料再递。', '语言再刷分。', '费用预算再算。'],
      yin: ['出国之事此时多有阻碍，宜暂缓计划静待转机。', '移民之路此时多有波折，材料审核恐受阻，宜耐心等待。', '材料造假切忌。', '无计划盲出国不宜。'],
    },
    children: {
      sheng: ['子息运势正旺，此时求子或教养皆顺，宜安心以待。', '此时子女教养顺遂，亲子关系融洽，宜多加陪伴用心引导。', '入学择校可定。', '亲子活动有益。', '兴趣班可试听。', '托育机构可靠。', '教养顺遂多陪伴。', '备孕调理有方向。'],
      xiao: ['子息运势未明，求子之事宜顺其自然莫强求。', '备孕之事尚需耐心，此时结果未定，宜顺其自然莫心急。', '教育方法再调整。', '与校方多沟通。'],
      yin: ['子息运势不佳，此时求子之事宜暂缓莫强求。', '打骂教育不宜。', '攀比报班无益。', '忽视情绪有害。'],
    },
    dream: {
      sheng: ['此梦乃吉兆，心中所盼将得应验，宜安心以待。', '潜意识提醒积极面。', '创意灵感来自梦。', '情感需求得见。'],
      xiao: ['此梦意味未明，乃心中所虑之投射，不必过度解读。', '梦境虚实难辨，未必预示吉凶，宜平常心视之即可。', '日有所思夜有所梦。', '压力投射而已。'],
      yin: ['此梦乃心中不安之投射，宜多加宽心，不必过虑。', '此梦乃近日忧思过重所致，宜放松心情，不必对号入座。', '勿对号入座恐慌。', '连续噩梦查作息。'],
    },
    move: {
      sheng: ['迁徙调动时机尚可，新环境有利于展开。', '换城市或换岗位，贵人运在侧，宜主动联系。', '调动手续可办。', '安家落户顺利。'],
      xiao: ['去留未定，宜把两边条件列清再比。', '适应期需耐心。', '成本核算再清。'],
      yin: ['此时大搬迁成本偏高，宜暂缓。', '仓促搬迁成本高。', '无计划远走不宜。'],
    },
    tech: {
      sheng: ['技术难题将有突破，宜持续试验并记录。', '上线发布窗口较好，做好回滚预案即可。', '重构收益大于成本。', '工具选型合适。', '代码审查能发现问题。', '性能优化可见效。', '安全补丁宜打。', '文档补齐利协作。'],
      xiao: ['系统问题未完全定位，宜再查日志勿盲目改。', '灰度发布更稳。', '需求再确认。', '技术债分批还。'],
      yin: ['此时大改架构或强制上线易出事故，宜暂缓。', '无备份操作危险。', '权限过大勿给。', '生产环境禁试毒。'],
    },
    pet: {
      sheng: ['宠物安康，就医或训练皆较顺利。', '新宠适应良好。', '疫苗驱虫可做。', '寄养环境可靠。', '行为纠正有效。', '绝育手术顺利。'],
      xiao: ['宠物状态需观察，异常则及时问诊。', '换粮宜慢。', '训练需耐心。', '选择寄养再比。'],
      yin: ['此时宠物易应激，宜少换环境、少强迫。', '自行用药危险。', '高温封闭车内禁忌。', '强迫互动易应激。'],
    },
    life: {
      sheng: ['生活运势渐入佳境，此时心境平和诸事皆顺遂。', '家宅安宁，人心和睦，此时经营日常必得温馨长久。', '起居渐入佳境，身心调和，宜多亲近自然舒展心怀。', '此时人际渐暖，故交新友皆增缘分，宜广结善缘。', '生活节律渐顺，饮食起居得宜，身体自会渐入康泰。', '此时家中添置或修缮皆顺，宜趁势打理居所焕然一新。', '闲情逸致正浓，此时培养兴趣爱好必得心灵滋养。', '此时亲情渐浓，多陪伴家人长辈，暖意自然流转不息。'],
      xiao: ['生活运势平平，诸事尚在变化之中，宜顺其自然。', '生活琐事纷繁，头绪未清，宜静心梳理不必急于求成。', '此时作息尚未调顺，宜循序渐进，不必强求一时之效。', '人际往来时冷时热，宜顺其自然，不必刻意强求亲疏。', '此时居所或环境尚在变动，宜耐心适应静待安顿。', '生活重心尚未明确，宜多加思量，不必仓促做出改变。', '此时情绪起伏不定，宜给自己多些宽容，静待心境平复。', '家中琐事悬而未决，宜耐心协商，不必急于一时定论。'],
      yin: ['生活运势欠佳，此时诸事不顺，宜静心调整心态。', '生活步调紊乱，此时诸事繁杂，宜暂缓脚步静心整顿。', '此时家宅略有不安，宜多加沟通化解，不宜冷战积怨。', '起居失序，身心俱疲，宜暂缓外务，先调养自身为要。', '此时人际略有摩擦，宜以柔克刚，不宜针锋相对硬碰。', '生活压力此时正重，宜适度放缓节奏，莫要硬撑到底。', '此时家中变故渐生，宜沉着应对，不宜慌乱仓促决断。'],
    },
    general: {
      sheng: ['所问之事总体向好，宜积极作为顺势完成。', '神明应允，心中所念可试行之。', '心念与时机相合。', '小步前进可见效。', '贵人暗助不显山。', '今日诸事宜早不宜迟。', '诚信行事得善果。', '坚持正确方向。', '和气生财事顺。', '收心专注一事成。', '行善积德有感应。', '顺应自然不强求反成。', '积善之家必有余庆，所问可成。', '谋事在人成事在天，今日人和。', '东方启明，所求渐近。', '脚踏实地必有收获。', '水到渠成不必焦急。', '与智者谋事半功倍。', '今日宜结新缘。', '守正出奇可破局。', '细处着手大事可成。', '晨光初现正宜起行。', '量力而行亦是胜利。', '小善日行可转大气运。', '纪律执行带来自由。', '危机中藏转机。', '等待之人将有回音。', '协议双方可共赢。', '创意火花可落地。', '长辈祝福加持所求。'],
      xiao: ['所问之事未有定论，宜再观数日。', '天机含笑，答案在你行动之后自显。', '勿反复同一问。', '内外条件未齐。', '可做可不做，随心而不执。', '信息仍不足。', '静心再问更明。', '半明半暗宜谨慎。', '事缓则圆，勿催。', '条件未齐，再备。', '人心难测，再观。', '利弊各半，慎选。', '消息未实，勿信单方。', '热情有余，方法不足。', '方向对，节奏慢。', '外援将至尚未到。', '复盘后再决策。', '半杯水可满可空在心。'],
      yin: ['所问之事暂不宜推进，宜收心守静。', '今日不宜反复追问同一事，宜先体悟已有示兆。', '妄动生灾，宜止。', '贪念一起便失。', '口舌是非宜缄。', '逆势操作易损。', '带情绪决策必悔。', '无准备的冒险禁止。', '宜退一步海阔。', '等待更好时机。', '强求无益。', '勿以身试险。', '频繁换方向无成。', '对神明不敬空耗。', '自我设限错过窗。', '听信谣言慌乱。', '过度承诺难兑现。', '否认问题延误。'],
    },
  };
  // 按问题关键字判断主题（计分取最接近；无命中则 general）
  const categoryKeywords = {
    marriage: ['婚姻', '结婚', '对象', '伴侣', '恋爱', '相亲', '离婚', '男友', '女友', '复合', '订婚', '婚礼', '缘分', '分手'],
    romance:  ['暗恋', '表白', '桃花', '喜欢的人', '追', '约会', '暧昧'],
    job:      ['工作', '上班', '跳槽', '辞职', '加班', '面试', '入职', '同事', '老板', '升职', 'offer', '离职', '职场'],
    wealth:   ['财运', '发财', '投资', '理财', '股票', '基金', '彩票', '赚钱', '收入', '存款', '炒股', '借钱', '还债', '消费', '买不买'],
    career:   ['事业', '创业', '生意', '公司', '项目', '合伙', '转型', '开店'],
    business: ['谈单', '客户', '合同', '进货', '报价', '成交', '合作伙伴'],
    children: ['孩子', '子女', '怀孕', '生育', '小孩', '备孕', '生子', '育儿', '宝宝', '教育'],
    dream:    ['梦见', '梦境', '做梦', '噩梦', '预兆'],
    abroad:   ['出国', '移民', '签证', '留学', '绿卡', '海外', '入籍'],
    travel:   ['旅游', '旅行', '出游', '度假', '游玩', '景点', '出行', '平安'],
    weather:  ['天气', '下雨', '晴天', '气温', '台风', '下雪', '降雨', '气候'],
    sports:   ['比赛', '球赛', '运动', '健身', '跑步', '篮球', '足球', '马拉松', '锻炼', '训练'],
    health:   ['健康', '身体', '生病', '医院', '体检', '手术', '疼痛', '失眠', '调养', '小恙'],
    exam:     ['考试', '高考', '考研', '雅思', '托福', '证书', '答辩', '分数', '考证'],
    study:    ['学习', '复习', '功课', '作业', '课程', '读书', '学业'],
    house:    ['买房', '卖房', '租房', '装修', '搬家', '楼盘', '房价', '换房'],
    move:     ['调动', '迁居', '换城市', '外派'],
    legal:    ['官司', '起诉', '律师', '纠纷', '维权', '赔偿'],
    lost:     ['丢失', '找不到', '失物', '走失', '失踪'],
    decision: ['做与否', '该不该', '能不能', '是否应该', '要不要', '现在做'],
    luck:     ['运气', '手气', '运气如何', '今日运'],
    friendship: ['朋友', '友谊', '闺蜜', '兄弟', '深交'],
    family:   ['家人', '父母', '长辈', '亲戚', '家事', '矛盾'],
    tech:     ['程序', '代码', '上线', 'bug', '系统', '服务器', '技术难题'],
    pet:      ['宠物', '猫', '狗', '寄养'],
    life:     ['生活', '日常', '家庭']
  };
  // 通用宜/忌（第二层安全库配套）
  const genericAdvice = {
    sheng: [
      { 宜: '主动争取', 忌: '犹豫不决' },
      { 宜: '把握良机', 忌: '错失时机' },
      { 宜: '顺势而为', 忌: '畏首畏尾' },
      { 宜: '诚实推进', 忌: '三心二意' }
    ],
    xiao: [
      { 宜: '静观其变', 忌: '仓促决断' },
      { 宜: '耐心等待', 忌: '操之过急' },
      { 宜: '从长计议', 忌: '贸然行动' },
      { 宜: '再观数日', 忌: '强下定论' }
    ],
    yin: [
      { 宜: '韬光养晦', 忌: '强求硬闯' },
      { 宜: '安守本分', 忌: '冒险行事' },
      { 宜: '静待时机', 忌: '执意强行' },
      { 宜: '收心守静', 忌: '反复追问' }
    ]
  };
  // 第二层：安全通用判词（按筊象，不依赖分类）
  const safeOraclePool = {
    sheng: [
      '时机已至，顺势而行，此事可成。',
      '心诚则灵，所问向好，宜积极作为。',
      '人和天时相合，小步推进可见效。',
      '贵人暗助，正当其时，勿再迟疑。',
      '根基已稳，此时行动多半顺遂。'
    ],
    xiao: [
      '天机未明，此事尚在变化之中。',
      '半明半暗，宜再观察，勿急于定论。',
      '条件未齐，暂缓推进更稳妥。',
      '利弊各半，宜静心权衡后再动。',
      '答案尚未完全显露，再观数日。'
    ],
    yin: [
      '时机未到，强行推进恐有阻碍。',
      '此时宜守不宜攻，收心静待转机。',
      '妄动易生波折，暂止更为上策。',
      '外缘未合，宜安守本分勿强求。',
      '今日不宜强决，且待天时自转。'
    ]
  };
  // 第三层：护法最终兜底（永远言之有物，绝不报错）
  const guardianOraclePool = {
    sheng: [
      { 神意: '护法示下：所问虽未尽显，大体向顺，宜耐心守正，顺其自然以待天时。', 宜: '守正待时', 忌: '急躁妄动' },
      { 神意: '此时虽无锋芒之示，心念端正即可徐徐推进，勿强求一日之功。', 宜: '徐徐推进', 忌: '一日求成' }
    ],
    xiao: [
      { 神意: '护法示下：此事暂无定论，宜耐心等待，顺其自然，静观天时变化。', 宜: '耐心等待', 忌: '强求结论' },
      { 神意: '天机含蓄未宣，眼下不宜强断，且将身心安放，待机缘自明。', 宜: '安放身心', 忌: '强行决断' },
      { 神意: '神明示意：结论尚未成熟，宜顺其自然，勿反复追问同一事。', 宜: '顺其自然', 忌: '反复追问' }
    ],
    yin: [
      { 神意: '护法示下：此时不宜强进，宜收心守静，耐心等待更合宜的时机。', 宜: '收心守静', 忌: '强行推进' },
      { 神意: '外缘未开，强求无益。且放下执念，待天时转圜再议不迟。', 宜: '放下执念', 忌: '执意强求' }
    ]
  };
  const ultimateFallback = {
    神意: '护法示下：天机暂隐，宜遵从内心，顺其自然，耐心等待天时自至。',
    宜: '顺其自然',
    忌: '强求答案'
  };
  /**
   * 判词标准结构（全链路统一出口）：
   * {
   *   诗偈: string[] | null,   // 四句偈，可空
   *   神意: string,            // 必填，18–80 字为宜
   *   宜:   string,            // 必填，2–12 字
   *   忌:   string,            // 必填，2–12 字
   *   meta: {                  // 内部元数据，渲染可忽略
   *     type: 'sheng'|'xiao'|'yin',
   *     category: string,
   *     source: 'ai'|'bank'|'safe'|'guardian'|'cooldown'
   *   }
   * }
   */
  function normalizeJiaoType(type) {
    if (type === 'sheng' || type === 'xiao' || type === 'yin') return type;
    return 'xiao';
  }
  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function cleanOracleText(s, maxLen) {
    if (s == null) return '';
    let t = String(s).trim()
      .replace(/^[*"'“”\-\s]+|[*"'“”\s]+$/g, '')
      .replace(/\s+/g, ' ');
    if (maxLen && t.length > maxLen) t = t.slice(0, maxLen);
    return t;
  }
  function isValidOracle(o) {
    if (!o || typeof o !== 'object') return false;
    const sy = cleanOracleText(o['神意'] ?? o.shenyi);
    const yi = cleanOracleText(o['宜'] ?? o.yi);
    const ji = cleanOracleText(o['忌'] ?? o.ji);
    return sy.length >= 4 && yi.length >= 1 && ji.length >= 1;
  }
  /** 统一工厂：任意来源 → 标准 JSON */
  function makeOracle(partial, type, category, source) {
    const t = normalizeJiaoType(type);
    const sy = cleanOracleText(partial && (partial['神意'] ?? partial.shenyi), 120);
    const yi = cleanOracleText(partial && (partial['宜'] ?? partial.yi), 16);
    const ji = cleanOracleText(partial && (partial['忌'] ?? partial.ji), 16);
    let poem = null;
    const rawPoem = partial && (partial['诗偈'] ?? partial.poem);
    if (Array.isArray(rawPoem) && rawPoem.length) {
      const lines = rawPoem.map(l => cleanOracleText(l, 16)).filter(l => l.length > 0);
      if (lines.length >= 4) poem = lines.slice(0, 4);
      else if (lines.length > 0) poem = lines;
    }
    return {
      诗偈: poem,
      神意: sy,
      宜: yi,
      忌: ji,
      meta: {
        type: t,
        category: category || 'general',
        source: source || 'unknown'
      }
    };
  }
  function sanitizeOracle(o, type, category, source) {
    const t = normalizeJiaoType(type);
    if (isValidOracle(o)) {
      return makeOracle(o, t, category, source || (o.meta && o.meta.source) || 'unknown');
    }
    return pickGuardianOracle(t, category);
  }
  function detectCategory(question) {
    const q = String(question || '');
    if (!q.trim()) return 'general';
    let best = 'general';
    let bestScore = 0;
    const scores = {};
    for (const cat in categoryKeywords) {
      let score = 0;
      const kws = categoryKeywords[cat];
      for (let i = 0; i < kws.length; i++) {
        if (q.includes(kws[i])) {
          // 更长的关键词权重更高；主题词额外加权
          score += Math.max(1, kws[i].length);
        }
      }
      // 具体主题相对「decision」加权，避免「该不该+跳槽」被 decision 抢走
      if (cat !== 'decision' && score > 0) score += 2;
      scores[cat] = score;
      if (score > bestScore) {
        bestScore = score;
        best = cat;
      }
    }
    return bestScore > 0 ? best : 'general';
  }
  // 关联分类回退链：本类池空或过薄时，按语义相近类再取
  const categoryFallbackChain = {
    romance: ['marriage', 'general'],
    marriage: ['romance', 'general'],
    job: ['career', 'business', 'general'],
    career: ['job', 'business', 'general'],
    business: ['career', 'wealth', 'general'],
    wealth: ['business', 'career', 'general'],
    exam: ['study', 'general'],
    study: ['exam', 'general'],
    travel: ['weather', 'move', 'general'],
    weather: ['travel', 'general'],
    move: ['house', 'travel', 'general'],
    house: ['move', 'life', 'general'],
    family: ['children', 'friendship', 'life', 'general'],
    children: ['family', 'general'],
    friendship: ['family', 'romance', 'general'],
    health: ['life', 'general'],
    sports: ['health', 'general'],
    tech: ['job', 'career', 'general'],
    pet: ['life', 'family', 'general'],
    legal: ['general'],
    lost: ['general'],
    abroad: ['travel', 'study', 'general'],
    dream: ['general'],
    luck: ['general'],
    decision: ['general'],
    life: ['general'],
    general: []
  };
  // 会话级：避免连续两次抽到完全相同神意；可选分类提示（一百零八问直连）
  let preferredCategory = null;
  const recentShenyi = [];
  const RECENT_SHENYI_MAX = 8;
  function rememberShenyi(line) {
    if (!line) return;
    recentShenyi.unshift(line);
    if (recentShenyi.length > RECENT_SHENYI_MAX) recentShenyi.length = RECENT_SHENYI_MAX;
  }
  function pickLineFromPool(pool) {
    if (!pool || !pool.length) return null;
    // 优先未在近期出现过的
    const fresh = pool.filter(l => recentShenyi.indexOf(l) === -1);
    const use = fresh.length ? fresh : pool;
    return pickRandom(use);
  }
  function resolveCategory(question) {
    if (preferredCategory && judgmentBank[preferredCategory]) {
      return preferredCategory;
    }
    return detectCategory(question);
  }
  function setPreferredCategory(cat) {
    preferredCategory = (cat && judgmentBank[cat]) ? cat : null;
  }
  function clearPreferredCategory() {
    preferredCategory = null;
  }
  /**
   * 从判词库取最接近文案：
   * 分类提示 → 关键词检测 → 关联回退链 → general
   * 返回 { line, category } 或 null
   */
  function pickFromJudgmentBank(question, type) {
    const t = normalizeJiaoType(type);
    const primary = resolveCategory(question);
    const tried = {};
    const queue = [primary];
    const chain = categoryFallbackChain[primary] || ['general'];
    for (let i = 0; i < chain.length; i++) queue.push(chain[i]);
    // general 兜底：链中未包含时再补一次
    if (primary !== 'general' && chain.indexOf('general') === -1) queue.push('general');
    for (let i = 0; i < queue.length; i++) {
      const cat = queue[i];
      if (!cat || tried[cat]) continue;
      tried[cat] = true;
      const pool = judgmentBank[cat] && judgmentBank[cat][t];
      const line = pickLineFromPool(pool);
      if (line) return { line: line, category: cat };
    }
    return null;
  }
  function pickSafeOracle(type, category) {
    const t = normalizeJiaoType(type);
    const line = pickRandom(safeOraclePool[t]) || pickRandom(safeOraclePool.xiao);
    const advice = pickRandom(genericAdvice[t]) || pickRandom(genericAdvice.xiao);
    return makeOracle({
      神意: line || ultimateFallback['神意'],
      宜: (advice && advice['宜']) || ultimateFallback['宜'],
      忌: (advice && advice['忌']) || ultimateFallback['忌']
    }, t, category, 'safe');
  }
  function pickGuardianOracle(type, category) {
    const t = normalizeJiaoType(type);
    const g = pickRandom(guardianOraclePool[t]) || pickRandom(guardianOraclePool.xiao);
    if (g && g['神意']) {
      return makeOracle(g, t, category, 'guardian');
    }
    return makeOracle(ultimateFallback, t, category, 'guardian');
  }
  /**
   * 三重保护本地判词（永远返回标准 JSON，绝不抛错）：
   * 1) bank  分类判词库
   * 2) safe  安全通用库
   * 3) guardian 护法最终示下
   */
  function pickFallbackOracle(question, type) {
    try {
      const t = normalizeJiaoType(type);
      const detected = resolveCategory(question || '');
      // 第一层：分类库 + 关联回退
      const hit = pickFromJudgmentBank(question, t);
      if (hit && hit.line) {
        const advice = pickRandom(genericAdvice[t]) || pickRandom(genericAdvice.xiao);
        rememberShenyi(hit.line);
        return makeOracle({
          神意: hit.line,
          宜: (advice && advice['宜']) || ultimateFallback['宜'],
          忌: (advice && advice['忌']) || ultimateFallback['忌']
        }, t, hit.category || detected, 'bank');
      }
      // 第二层
      const safe = pickSafeOracle(t, detected);
      if (isValidOracle(safe)) {
        rememberShenyi(safe['神意']);
        return safe;
      }
      // 第三层
      const g = pickGuardianOracle(t, detected);
      rememberShenyi(g['神意']);
      return g;
    } catch (_) {
      try { return pickGuardianOracle(type, 'general'); }
      catch (__) { return makeOracle(ultimateFallback, 'xiao', 'general', 'guardian'); }
    }
  }
  const history = [];
  // ---- 性格 / 八字 / 星座 测试摘要：本地浏览器存储，供"记录"面板展示 ----
  // 若某项已测过，记录面板会以「不超过 20 字」的极简说明 + 时间戳展示，无需重新测试即可一眼看到此前结果。
  const PROFILE_SUMMARY_KEY = 'yumiao_profile_summary_v1';
  const PROFILE_LABELS = { mbti: '性格', bazi: '八字', zodiac: '星座', western: '西盘' };
  // ---- 轻量存储工具：统一处理 JSON + localStorage 异常 ----
  function readStorageJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function writeStorageJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadProfileSummaries() {
    try {
      const raw = localStorage.getItem(PROFILE_SUMMARY_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }
  function saveProfileSummary(kind, text) {
    try {
      const data = loadProfileSummaries();
      let brief = String(text || '').trim();
      if (brief.length > 20) brief = brief.slice(0, 20);
      data[kind] = { text: brief, time: Date.now() };
      localStorage.setItem(PROFILE_SUMMARY_KEY, JSON.stringify(data));
    } catch (_) { /* 存储失败不影响主流程 */ }
    if (typeof renderHistory === 'function') renderHistory();
  }
  function formatProfileTime(ts) {
    try {
      const d = new Date(ts);
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (_) { return ''; }
  }
  function renderProfileSummaryBar() {
    const data = loadProfileSummaries();
    const kinds = ['mbti', 'bazi', 'zodiac', 'western'];
    const items = kinds.filter(k => data[k] && data[k].text);
    if (!items.length) return '';
    const chips = items.map(k => {
      const d = data[k];
      return `<div class="history-item" style="opacity:0.92;"><span>${escapeHtml(PROFILE_LABELS[k])}已验 · ${escapeHtml(d.text)}<br><span style="color:#a08c60;font-size:10px;">${escapeHtml(formatProfileTime(d.time))}</span></span></div>`;
    }).join('');
    return `<div class="history-empty" style="text-align:left;padding:2px 6px 6px;color:#8a6f3f;font-size:10px;">已验档案（本机存储）</div>${chips}`;
  }
  let castToken = 0;
  let lastQuestion = '';
  let lastQuestionAt = 0;
  let lastBeastIdentity = null; // 记录上次实际请示的瑞兽（或 'random'），换一位即可不受冷却限制
  const SAME_Q_COOLDOWN_MS = 90000;
  const POST_CAST_COOLDOWN_MS = 1200;
  function rollJiaoType() {
    const r = Math.random();
    if (r < 0.46) return 'sheng';
    if (r < 0.72) return 'xiao';
    return 'yin';
  }
  function facesForType(type) {
    if (type === 'sheng') return Math.random() < 0.5 ? [1, 0] : [0, 1];
    if (type === 'xiao') return [1, 1];
    return [0, 0];
  }
  /**
   * 解析神谕：仅本地三重保护（已关闭外部 AI API）
   * bank → safe → guardian，界面永不出现错误提示。
   */
  async function resolveOracle(question, type, beastKey) {
    const t = normalizeJiaoType(type);
    const cat = (typeof resolveCategory === 'function')
      ? resolveCategory(question || '')
      : detectCategory(question || '');
    try {
      const local = pickFallbackOracle(question, t);
      if (isValidOracle(local)) return local;
    } catch (_) {}
    return pickGuardianOracle(t, cat);
  }
  // AI 神谕已关闭：保留函数名以免旧引用报错，直接失败以走本地库
  const USE_AI_ORACLE = false;
  async function generateOracle(/* question, typeKey, beastKey */) {
    if (!USE_AI_ORACLE) throw new Error('AI_ORACLE_DISABLED');
    throw new Error('AI_ORACLE_DISABLED');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function autoGrowQuestion(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }
  // ---- 问卜范例浮动菜单 ----
  // 输入栏默认 readonly：点击时不弹键盘，先出现菜单；
  // 仅选择「1 自定义问题」时才解除 readonly 并唤起键盘。
  let questionMenuHideTimer = null;
  let questionReminderTimer = null;
  let customEditing = false; // 自定义输入中：禁止 blur 再锁回 readonly
  // 常见 108 问：前 72 问覆盖生活各领域（逐条核对，确保互不重复、互不相似、语义不歧义）；
  // 后 36 问为宏大议题（移民、财经、法律、政治、经济、哲学、宗教、心理、宇宙、数学、物理、新发现、人工智能），
  // 不设 cat（不对应具体判词分类），揭示时走通用/护法判词，更契合此类问题的性质。
  const CASUAL_QUESTIONS = [
    // ---- 1-36：原有三十六问（保留不变）----
    { q: '此事现在该不该做？', cat: 'decision' },
    { q: '今天运气如何？', cat: 'luck' },
    { q: '我和他/她有没有缘分？', cat: 'marriage' },
    { q: '该不该表白？', cat: 'romance' },
    { q: '这段感情还能不能继续？', cat: 'marriage' },
    { q: '该不该分手/离婚？', cat: 'marriage' },
    { q: '工作上的烦恼何时能解？', cat: 'job' },
    { q: '该不该跳槽？', cat: 'job' },
    { q: '面试能否成功？', cat: 'job' },
    { q: '能不能升职加薪？', cat: 'job' },
    { q: '今年财运好不好？', cat: 'wealth' },
    { q: '这笔投资该不该做？', cat: 'wealth' },
    { q: '债务能否顺利收回？', cat: 'wealth' },
    { q: '身体小恙要紧吗？', cat: 'health' },
    { q: '这次体检会不会有问题？', cat: 'health' },
    { q: '考试/考证能否过关？', cat: 'exam' },
    { q: '学业如何才能进步？', cat: 'study' },
    { q: '该不该买房/换房？', cat: 'house' },
    { q: '搬家是否顺利？', cat: 'house' },
    { q: '这次出行是否平安？', cat: 'travel' },
    { q: '今明天气是否适宜出门？', cat: 'weather' },
    { q: '比赛/竞技能否取胜？', cat: 'sports' },
    { q: '和家人的矛盾如何化解？', cat: 'family' },
    { q: '朋友是否值得深交？', cat: 'friendship' },
    { q: '创业/开店时机到了吗？', cat: 'career' },
    { q: '合作伙伴是否可靠？', cat: 'business' },
    { q: '官司/纠纷能否胜诉？', cat: 'legal' },
    { q: '丢失的东西还能找回吗？', cat: 'lost' },
    { q: '出国/留学是否顺利？', cat: 'abroad' },
    { q: '孩子教育问题如何处理？', cat: 'children' },
    { q: '最近总做梦是何预兆？', cat: 'dream' },
    { q: '该不该换城市发展？', cat: 'move' },
    { q: '技术难题能否突破？', cat: 'tech' },
    { q: '养宠物是否顺利？', cat: 'pet' },
    { q: '冲动消费该不该买？', cat: 'wealth' },
    { q: '心中所念之事能否如愿？', cat: 'general' },
    // ---- 37-72：新增三十六问，进一步覆盖消费、婚恋、事业、天气、旅游等生活方方面面 ----
    { q: '相亲对象是否合适深交？', cat: 'marriage' },
    { q: '单身多年，何时能脱单？', cat: 'romance' },
    { q: '异地恋能否修成正果？', cat: 'marriage' },
    { q: '分手后还能否复合？', cat: 'marriage' },
    { q: '二婚/再婚是否合适？', cat: 'marriage' },
    { q: '该不该要孩子？备孕时机如何？', cat: 'children' },
    { q: '二胎该不该生？', cat: 'children' },
    { q: '被裁员的风险大不大？', cat: 'job' },
    { q: '该不该裸辞休整一段时间？', cat: 'job' },
    { q: '副业能否做出起色？', cat: 'career' },
    { q: '该不该报考公务员或事业编？', cat: 'exam' },
    { q: '驾照考试能否顺利通过？', cat: 'exam' },
    { q: '退休后的生活该如何规划？', cat: 'life' },
    { q: '该不该提前还清房贷？', cat: 'wealth' },
    { q: '贷款申请能否顺利批下来？', cat: 'wealth' },
    { q: '该买哪种保险更合适？', cat: 'wealth' },
    { q: '该不该换一辆车？', cat: 'life' },
    { q: '装修该如何规划才顺利？', cat: 'house' },
    { q: '手上的房子该不该卖？', cat: 'house' },
    { q: '和邻居的纠纷该如何化解？', cat: 'general' },
    { q: '和室友的矛盾该如何处理？', cat: 'friendship' },
    { q: '和上司关系紧张该如何应对？', cat: 'job' },
    { q: '手头的项目能否顺利完成？', cat: 'career' },
    { q: '面试/选拔能否顺利入围？', cat: 'exam' },
    { q: '合同签署是否顺利？', cat: 'business' },
    { q: '短线操作股票或基金是否可行？', cat: 'wealth' },
    { q: '父母的养老该如何安排？', cat: 'family' },
    { q: '是否需要做这台手术？', cat: 'health' },
    { q: '长期焦虑失眠该如何缓解？', cat: 'health' },
    { q: '关系闹僵后，道歉能否被接受？', cat: 'friendship' },
    { q: '该不该在意网上的评价和口碑？', cat: 'general' },
    { q: '信用卡或网贷额度审批能否通过？', cat: 'wealth' },
    { q: '学一门新技能是否值得投入？', cat: 'study' },
    { q: '特长生或艺考升学是否顺利？', cat: 'exam' },
    { q: '旅途中航班或车次延误该如何应对？', cat: 'travel' },
    { q: '眼下最烦心的事，何时能真正过去？', cat: 'life' },
    // ---- 73-108：宏大议题三十六问（移民/财经/法律/政治/经济/哲学/宗教/心理/宇宙/数学/物理/人工智能）----
    { q: '移民他国是否会带来更好的生活？' },
    { q: '未来数十年，全球移民政策会更宽松还是更严格？' },
    { q: '一个人该不该为了子女教育移民海外？' },
    { q: '未来十年，全球经济格局会如何变化？' },
    { q: '通货膨胀长期来看是否难以避免？' },
    { q: '数字货币会不会取代传统货币？' },
    { q: '法律的根本目的是维护公平还是维护秩序？' },
    { q: '未来的法律体系会不会因科技发展而被颠覆？' },
    { q: '一个社会的法治水平由什么决定？' },
    { q: '民主制度是否是最适合人类社会的治理方式？' },
    { q: '国际局势长期是否会趋于更加合作？' },
    { q: '一个国家的强盛究竟取决于制度还是资源？' },
    { q: '自由市场经济能否解决贫富差距问题？' },
    { q: '未来的工作形态会因自动化发生哪些根本改变？' },
    { q: '经济增长是否终将面临自然资源的极限？' },
    { q: '人生的意义究竟是什么？' },
    { q: '自由意志是否真实存在？' },
    { q: '幸福更多来自外在条件还是内心状态？' },
    { q: '不同宗教信仰的核心追求是否殊途同归？' },
    { q: '信仰对现代人的意义是否正在改变？' },
    { q: '灵魂是否会在肉体消亡后继续存在？' },
    { q: '人的性格究竟由先天决定还是后天塑造？' },
    { q: '潜意识对人的行为影响究竟有多大？' },
    { q: '人为什么会重复同样的情感模式？' },
    { q: '宇宙之外是否还存在其他宇宙？' },
    { q: '人类是否终将在宇宙中找到地外生命？' },
    { q: '时间的本质究竟是什么？' },
    { q: '数学究竟是被发现的还是被发明的？' },
    { q: '是否存在人类永远无法证明的数学真理？' },
    { q: '数学能否完全描述这个物理世界？' },
    { q: '物理学界会不会迎来颠覆现有理论的新发现？' },
    { q: '暗物质与暗能量的真面目何时能被揭开？' },
    { q: '量子力学与相对论能否最终统一？' },
    { q: '人工智能会不会最终超越人类的智慧？' },
    { q: '人工智能的发展会给人类社会带来更多福祉还是风险？' },
    { q: '未来人类与人工智能会形成怎样的关系？' },
  ];
  // 预设快捷问句（选 4–8 直接填入；选 9 打开一百零八问菜单）
  const PRESET_QUESTIONS = {
    4: '此事现在做与否？',
    5: '今日运气与手气如何？',
    6: '今明两天天气是否利于出行？',
    7: '这笔冲动消费该不该买？',
    8: '此次出行是否平安顺利？',
    9: '无事随便问问，神明有何示下？'
  };
  // ---- 菜单状态：main | casual | none ----
  // 交互原则：
  // 1) 只读输入框聚焦 → 打开主菜单
  // 2) 自定义编辑中不弹菜单、不因 blur 锁回 readonly
  // 3) 二级菜单（一百零八问）打开时忽略 blur，靠外部点击关闭
  // 4) 菜单项 mousedown 一律 preventDefault，避免抢焦点导致菜单闪关
  let menuLayer = 'none'; // 'none' | 'main' | 'casual'
  let menuPinned = false; // 二级菜单或过渡期：blur 不自动关
  let casualMenuRendered = false;
  let casualTouchStartY = 0;
  let casualTouchDragging = false;
  let outsideClickBound = false;
  function getQuestionEl() {
    return document.getElementById('question');
  }
  function setQuestionReadonly(ro) {
    const q = getQuestionEl();
    if (!q) return;
    if (ro) {
      q.readOnly = true;
      q.setAttribute('readonly', 'readonly');
    } else {
      q.readOnly = false;
      q.removeAttribute('readonly');
    }
  }
  function fillQuestionText(text, readonly) {
    const q = getQuestionEl();
    if (!q) return;
    customEditing = false;
    q.value = text;
    setQuestionReadonly(!!readonly);
    autoGrowQuestion(q);
  }
  function closeAllMenus() {
    clearTimeout(questionMenuHideTimer);
    menuLayer = 'none';
    menuPinned = false;
    const main = document.getElementById('questionMenu');
    const casual = document.getElementById('casualMenu');
    if (main) main.classList.remove('show');
    if (casual) casual.classList.remove('show');
    document.querySelectorAll('.method-cell.armed').forEach(c => c.classList.remove('armed'));
  }
  function showMainMenu() {
    if (customEditing) return;
    clearTimeout(questionMenuHideTimer);
    menuPinned = false;
    menuLayer = 'main';
    const main = document.getElementById('questionMenu');
    const casual = document.getElementById('casualMenu');
    if (casual) casual.classList.remove('show');
    if (main) main.classList.add('show');
    bindOutsideClickOnce();
  }
  function onQuestionInput() {
    customEditing = true;
    // 一旦开始打字，收起菜单以免挡输入
    if (menuLayer !== 'none') closeAllMenus();
  }
  function enableCustomInput() {
    const q = getQuestionEl();
    if (!q) return;
    closeAllMenus();
    if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
    customEditing = true;
    setQuestionReadonly(false);
    q.value = '';
    autoGrowQuestion(q);
    const tryFocus = () => {
      q.focus();
      try {
        if (typeof q.setSelectionRange === 'function') q.setSelectionRange(0, 0);
      } catch (_) {}
    };
    tryFocus();
    setTimeout(tryFocus, 50);
    setTimeout(tryFocus, 180);
    showQuestionReminder();
  }
  function hideQuestionMenuDelayed() {
    // 二级菜单钉住、或自定义编辑中：blur 不关菜单/不锁输入
    if (menuPinned || customEditing) return;
    clearTimeout(questionMenuHideTimer);
    questionMenuHideTimer = setTimeout(() => {
      if (menuPinned || customEditing) return;
      const q = getQuestionEl();
      if (q && document.activeElement === q) return;
      // 若焦点仍在菜单内部（极少见），也不关
      const active = document.activeElement;
      if (active && active.closest && (
        active.closest('#questionMenu') || active.closest('#casualMenu')
      )) return;
      closeAllMenus();
      if (q && !q.readOnly && !customEditing) setQuestionReadonly(true);
    }, 200);
  }
  function bindOutsideClickOnce() {
    if (outsideClickBound) return;
    outsideClickBound = true;
    document.addEventListener('pointerdown', onMenuOutsidePointer, true);
  }
  function onMenuOutsidePointer(e) {
    if (menuLayer === 'none') return;
    const t = e.target;
    if (!t) return;
    // 点在输入框或任一菜单内：不关
    if (t.closest && (
      t.closest('#question') ||
      t.closest('#questionMenu') ||
      t.closest('#casualMenu') ||
      t.closest('.question-wrap')
    )) return;
    // 自定义编辑中点外部：只关菜单，不锁键盘
    closeAllMenus();
    if (!customEditing) {
      const q = getQuestionEl();
      if (q && !q.readOnly) setQuestionReadonly(true);
    }
  }
  // 问卜方式两步选择：第一次点击=选中（淡黄高亮），第二次点击同一项=确认进入
  function armOrSelectMethod(el, method) {
    if (el.classList.contains('armed')) {
      el.classList.add('entering');
      setTimeout(() => {
        selectQuestionMenuItem(method);
        el.classList.remove('entering');
      }, 120);
      return;
    }
    document.querySelectorAll('.method-cell.armed').forEach(c => c.classList.remove('armed'));
    el.classList.add('armed');
    try {
      if (navigator.vibrate) navigator.vibrate(12);
    } catch (_) {}
  }
  function selectQuestionMenuItem(n) {
    const q = getQuestionEl();
    if (!q) return;
    clearTimeout(questionMenuHideTimer);
    // 兼容旧数字编号
    if (n === 1 || n === '1') n = 'manual';
    if (n === 2 || n === '2') n = 'mbti';
    if (n === 3 || n === '3') n = 'bazi';
    if (n === 9 || n === '9') n = 'casual';
    if (n === 'manual') {
      enableCustomInput();
      return;
    }
    if (n === 'mbti') {
      closeAllMenus();
      if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
      fillQuestionText('MBTI 性格测试', true);
      q.blur();
      openMbtiQuiz();
      return;
    }
    if (n === 'bazi') {
      closeAllMenus();
      if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
      fillQuestionText('八字运程与神煞', true);
      q.blur();
      openBaziPanel();
      return;
    }
    if (n === 'zodiac') {
      closeAllMenus();
      if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
      fillQuestionText('星座运势测试', true);
      q.blur();
      if (typeof openZodiacPanel === 'function') openZodiacPanel();
      return;
    }
    if (n === 'casual') {
      openCasualMenu();
      return;
    }
  }
  // 手动输入：菜单内独立输入框，与其它扩展选项区分，不复用主展示框直接编辑
  function confirmManualQuestion(autoCast, isExplicit) {
    const input = document.getElementById('manualQuestionInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      if (isExplicit) input.focus(); // 主动确认但未填写：提示继续输入，不打断随手点开又关闭的场景
      return;
    }
    if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
    fillQuestionText(text, true);
    input.value = '';
    closeAllMenus();
    const q = getQuestionEl();
    if (q) q.blur();
    if (autoCast) castJiao();
  }
  function openCasualMenu() {
    clearTimeout(questionMenuHideTimer);
    menuPinned = true;
    menuLayer = 'casual';
    const main = document.getElementById('questionMenu');
    const casual = document.getElementById('casualMenu');
    if (main) main.classList.remove('show');
    if (!casual) return;
    if (!casualMenuRendered) renderCasualMenu();
    casual.classList.add('show');
    bindOutsideClickOnce();
    // 滚动列表时保持钉住，避免误关
    const grid = document.getElementById('casualMenuGrid');
    if (grid && !grid._scrollPinBound) {
      const pin = function () {
        menuPinned = true;
        menuLayer = 'casual';
        clearTimeout(questionMenuHideTimer);
      };
      grid.addEventListener('scroll', pin, { passive: true });
      grid.addEventListener('touchstart', pin, { passive: true });
      grid.addEventListener('wheel', pin, { passive: true });
      // 滑动误触修复：滑动超过阈值时，本次触摸视为滚动，不触发选项点击
      grid.addEventListener('touchstart', (e) => {
        casualTouchStartY = e.touches[0].clientY;
        casualTouchDragging = false;
      }, { passive: true });
      grid.addEventListener('touchmove', (e) => {
        if (Math.abs(e.touches[0].clientY - casualTouchStartY) > 8) {
          casualTouchDragging = true;
        }
      }, { passive: true });
      grid._scrollPinBound = true;
    }
  }
  // 生成单个问题格子（供三份循环列表复用）；点击回调始终使用真实题目索引 i（0-107）
  function buildCasualCell(item, i) {
    const cell = document.createElement('div');
    cell.className = 'question-menu-cell casual-item';
    cell.setAttribute('role', 'option');
    cell.style.cssText = 'flex-direction:row;justify-content:flex-start;gap:8px;padding:10px 12px;text-align:left;flex-shrink:0;transition:background 0.18s ease,transform 0.12s ease;';
    // 滑动防误触：记录指针起点，位移超过阈值则取消点击
    let ptrX = 0, ptrY = 0, moved = false;
    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      ptrX = p.clientX; ptrY = p.clientY; moved = false;
      casualTouchDragging = false;
    };
    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e;
      if (Math.abs(p.clientX - ptrX) > 10 || Math.abs(p.clientY - ptrY) > 10) {
        moved = true;
        casualTouchDragging = true;
      }
    };
    const onUp = (e) => {
      if (moved || casualTouchDragging) {
        casualTouchDragging = false;
        return;
      }
      e.preventDefault();
      cell.style.transform = 'scale(0.98)';
      setTimeout(() => { cell.style.transform = ''; }, 120);
      selectCasualQuestion(i);
    };
    cell.addEventListener('pointerdown', onDown, { passive: true });
    cell.addEventListener('pointermove', onMove, { passive: true });
    cell.addEventListener('pointerup', onUp);
    cell.addEventListener('touchstart', onDown, { passive: true });
    cell.addEventListener('touchmove', onMove, { passive: true });
    cell.addEventListener('touchend', onUp, { passive: false });
    // 阻断旧的 click，避免滑动结束后仍触发
    cell.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
    const num = document.createElement('span');
    num.className = 'qm-num';
    num.textContent = String(i + 1).padStart(2, '0');
    const lab = document.createElement('span');
    lab.textContent = item.q;
    cell.appendChild(num);
    cell.appendChild(lab);
    return cell;
  }
  // 循环滚动：内容渲染 3 份完全相同的列表首尾相接，滚动到第 1 份或第 3 份时
  // 无感跳回中间那份对应位置，视觉上就是"滑到 108 问后又回到第 1 问"的无限循环。
  const CASUAL_LOOP_COPIES = 3;
  let casualLoopBound = false;
  function renderCasualMenu() {
    const grid = document.getElementById('casualMenuGrid');
    if (!grid || typeof CASUAL_QUESTIONS === 'undefined') return;
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let copy = 0; copy < CASUAL_LOOP_COPIES; copy++) {
      CASUAL_QUESTIONS.forEach((item, i) => {
        frag.appendChild(buildCasualCell(item, i));
      });
    }
    grid.appendChild(frag);
    casualMenuRendered = true;
    // 渲染完成后跳到中间那份的起点，两端都留有可继续滑动的空间
    const blockHeight = grid.scrollHeight / CASUAL_LOOP_COPIES;
    grid._casualBlockHeight = blockHeight;
    grid.scrollTop = blockHeight;
    setupCasualLoopScroll(grid);
  }
  function setupCasualLoopScroll(grid) {
    if (casualLoopBound) return;
    casualLoopBound = true;
    grid.addEventListener('scroll', () => {
      const bh = grid._casualBlockHeight;
      if (!bh) return;
      // 越过中间份的上/下边界时，直接跳到相邻份的对应位置，实现无缝循环
      if (grid.scrollTop < bh * 0.5) {
        grid.scrollTop += bh;
      } else if (grid.scrollTop > bh * 1.5) {
        grid.scrollTop -= bh;
      }
    }, { passive: true });
  }
  function closeCasualMenu() {
    // 返回主菜单，保持 pinned 短暂，避免 blur 立刻关掉
    clearTimeout(questionMenuHideTimer);
    menuPinned = true;
    menuLayer = 'main';
    const casual = document.getElementById('casualMenu');
    const main = document.getElementById('questionMenu');
    if (casual) casual.classList.remove('show');
    if (main) main.classList.add('show');
    // 下一拍解除 pinned，之后仍可由外部点击关闭
    setTimeout(() => {
      if (menuLayer === 'main') menuPinned = false;
    }, 300);
  }
  function selectCasualQuestion(index) {
    const item = CASUAL_QUESTIONS[index];
    if (!item) return;
    closeAllMenus();
    // 一百零八问自带分类标签（后 36 条宏大议题无 cat） → 直连判词库对应桶
    if (typeof setPreferredCategory === 'function') {
      setPreferredCategory(item.cat || null);
    }
    fillQuestionText(item.q, true);
    const q = getQuestionEl();
    if (q) q.blur();
  }
  function showQuestionReminder() {
    const el = document.getElementById('questionReminder');
    if (!el) return;
    clearTimeout(questionReminderTimer);
    el.classList.add('show');
    questionReminderTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 2800);
  }
