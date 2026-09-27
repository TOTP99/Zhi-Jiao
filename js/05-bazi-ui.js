// ============================================================
// 八字表单/滚轮/掷筊揭晓 + 共用签文渲染与历史记录
// 原始行号（拆分前单文件 script.js 中的位置）: 2435-3211
// ============================================================
  // ---- 八字 & 神煞：表单收集 -> 排盘 -> 掷筊请示，依筊型决定详细/简版/不显示 ----
  let baziResult = null;
  // ============================================================
  // 共用出生信息（八字 / 星座 / 西方星盘自动对齐）
  // ============================================================
  const SHARED_BIRTH_KEY = 'yumiao_shared_birth_v1';
  function loadSharedBirth() {
    return readStorageJSON(SHARED_BIRTH_KEY, null);
  }
  function saveSharedBirth(partial) {
    const next = Object.assign({}, loadSharedBirth() || {}, partial || {});
    writeStorageJSON(SHARED_BIRTH_KEY, next);
  }
  // 统一档案桥：旧的各面板表单同步入口保留为档案条刷新（供命运圆盘嵌入等调用）
  function applySharedToWestern() {
    if (typeof window.renderProfileBar === 'function') window.renderProfileBar('westernProfileBar');
  }
  function openBaziPanel() {
    backToBaziForm();
    if (typeof window.renderProfileBar === 'function') window.renderProfileBar('baziProfileBar');
    ModalUI.open('bazi');
  }
  function closeBaziPanel() {
    ModalUI.close('bazi');
    clearQuestionSelectionToDefault();
  }
  function backToBaziForm() {
    const reveal = document.getElementById('baziReveal');
    const form = document.getElementById('baziForm');
    if (reveal) reveal.style.display = 'none';
    if (form) form.style.display = '';
  }
  function readBaziInput() {
    const b = (typeof loadSharedBirth === 'function') ? loadSharedBirth() : null;
    if (!b || !b.year || !b.month || !b.day) {
      return { error: '请先录入生辰档案，再来排盘。' };
    }
    const year = +b.year, month = +b.month, day = +b.day;
    const hour = (b.hour == null || b.hour === '') ? 12 : +b.hour;
    const minute = (b.minute == null || b.minute === '') ? 0 : +b.minute;
    const timezone = (b.tzOffset == null || b.tzOffset === '') ? 8 : +b.tzOffset;
    const sex = b.sex || 'M';
    const trueSolar = !!(document.getElementById('baziTrueSolar') && document.getElementById('baziTrueSolar').checked);
    const longitude = (b.lng == null || b.lng === '') ? null : +b.lng;
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour)) {
      return { error: '生辰档案不完整，请到「我的」重新录入。' };
    }
    if (trueSolar && (longitude == null || !Number.isFinite(longitude))) {
      return { error: '档案中没有出生地经度：请到「我的」补录城市或经度后，再用真太阳时。' };
    }
    return {
      input: { year, month, day, hour, minute, sex, timezone, trueSolar, longitude }
    };
  }
  function submitBaziForm() {
    const errEl = document.getElementById('baziError');
    if (errEl) errEl.textContent = '';
    const parsed = readBaziInput();
    if (parsed.error) {
      if (errEl) errEl.textContent = parsed.error;
      return;
    }
    let result;
    try {
      result = BaziShensha.calculate(parsed.input);
    } catch (_) {
      if (errEl) errEl.textContent = '排盘失败，请检查出生信息是否正确。';
      return;
    }
    baziResult = result;
    saveProfileSummary('bazi', `${result.bazi}·日主${result.dayMaster.stem}`);
    const form = document.getElementById('baziForm');
    const reveal = document.getElementById('baziReveal');
    if (form) form.style.display = 'none';
    if (reveal) reveal.style.display = 'flex';
    castBaziJiao();
  }
  function castBaziJiao() {
    if (!baziResult) return;
    const recastBtn = document.getElementById('baziRecast');
    const jiaoLabel = document.getElementById('baziJiaoLabel');
    const reportEl = document.getElementById('baziReport');
    const display = document.getElementById('baziJiaoDisplay');
    if (!display) return;
    if (recastBtn) recastBtn.style.display = 'none';
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
        renderBaziReveal(type);
      } catch (_) {
        if (reportEl) {
          reportEl.innerHTML = '<div class="mbti-no-report">掷筊失败，只能遵从内心，随遇而安。</div>';
        }
      } finally {
        if (recastBtn) recastBtn.style.display = 'inline-block';
      }
    }, 1000);
  }
  const BAZI_POS_LABEL = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };
  // 神煞词典：[白话释义, 神秘注语] —— 注语同名恒定
  const SHENSHA_DICT = {
    '天乙贵人': ['传统命理中常作为贵人、助力、人缘之象，逢凶多能化吉。', '天乙如暗夜明灯：命带此星者，危难之际常有贵人垂手相援。宜多行善举，贵气方能常驻。'],
    '太极贵人': ['主悟性、钻研、玄学、哲思，适合学问与精神追求。', '太极为万物之始：此星主慧根，宜参玄悟道、钻研学问。心越静，悟得越深。'],
    '文昌贵人': ['主学习、考试、文书、表达与思维清晰。', '文昌照命，笔下有神：利考试、写作与表达。案头常备书卷，文气自会聚拢。'],
    '天厨贵人': ['多与衣食、生活享受、福气有关。', '天厨主禄养之福：一生少有冻馁之忧。惜福方能长福，暴殄则福气渐薄。'],
    '驿马': ['主迁移、奔波、旅行、变化，动中求进。', '驿马星动，命带风尘：宜动不宜静，越走动越有生机。安于一隅反埋没此星之力。'],
    '桃花': ['主魅力、人缘、社交吸引力与感情缘分。', '桃花者，人缘之精华也：得之者众星捧月。然桃花亦分墙内墙外，宜以真诚驭之，方不致多情反被情伤。'],
    '华盖': ['主独立、专研、艺术、宗教哲思。', '华盖如孤峰独立：主才华出众而性喜独处。宜走艺术、学术、玄学之路，闹市中亦可自成净土。'],
    '将星': ['主组织、掌控、领导与执行力。', '将星入命，如帅旗在握：天生有号令之气。宜居领导之位，忌屈居人下郁郁寡欢。'],
    '亡神': ['流派解释差异大，多提示需留意变化与隐患。', '亡神者，失脱之象：宜看管好财物文书，防小人暗算。心细一分，祸患远一分。'],
    '劫煞': ['多表示竞争、压力、突发变化。', '劫煞如途中劫道：主竞争与突发变故。宜低调行事、预留后路，方能化险为夷。'],
    '金舆': ['常取富贵、生活条件、婚姻助力等象意。', '金舆为贵人之车乘：主生活优渥、出行有派。亦主配偶条件不俗，是为「坐享其成」之福星。'],
    '禄神': ['主俸禄、资源、稳定收入与福气。', '禄神即衣禄之神：主一生不缺钱花，尤利稳定收入。宜珍惜正业，偏门之财反损禄气。'],
    '羊刃': ['主执行力、刚烈、竞争性，需善用其锋芒。', '羊刃为刀剑之锋：用之正则所向披靡，用之偏则伤人伤己。宜以纪律束之，方成大器。'],
    '红鸾': ['主喜庆、婚恋、人际缘分。', '红鸾星动，喜事临门：主婚恋嫁娶之庆。单身者宜主动赴约，良缘多在热闹处。'],
    '天喜': ['主喜事、庆贺、关系缓和。', '天喜如春风拂面：主添丁、升迁、和解之喜。宜多与人分享喜悦，喜气越传越旺。'],
    '孤辰': ['主独立性、独处倾向。', '孤辰者，天煞孤星之余绪：性喜独处，不擅群居。宜培养一门可终身相伴的爱好，孤独亦可成诗。'],
    '寡宿': ['主内在世界、情感表达较为谨慎。', '寡宿主内敛：情感深藏不露，非无情，实为谨慎。宜学着把心意说出口，莫让在乎的人猜谜。'],
    '天德贵人': ['主逢凶化吉、长辈助力、福泽。', '天德为众吉之首：如有神助，逢凶化吉。命带天德者，宜心存善念，德不配位则吉力渐退。'],
    '月德贵人': ['主和善、解厄、贵人助力。', '月德如月之温柔：主一生多得女性长辈或柔性贵人相助。以柔克刚，是此星的处世心法。'],
    '天德合': ['天德之合神，辅助贵人力量。', '天德逢合，吉力加倍：如虎添翼。宜在贵人运旺时主动请益，莫辜负天意美意。'],
    '月德合': ['月德之合神，辅助解厄。', '月德逢合，解厄之力倍增：大事化小、小事化无。宜广结善缘，善缘即是护身符。'],
    '福星贵人': ['主福气、衣食与贵人缘。', '福星高照者，一生少有大灾：福气多来自祖荫与前世善因。今生继续行善，福泽绵长。'],
    '国印贵人': ['主权柄、责任、制度与专业资格。', '国印为权力之玺：主掌权柄、宜公职或管理之位。得此星者，责任重于权力，宜以公心用之。'],
    '学堂': ['主学习、专业能力、教育缘分。', '学堂星明者，读书种子也：一生与学习结缘。活到老学到老，是此星最好的供养。'],
    '词馆': ['主文字、表达、学术、专业输出。', '词馆主文采：宜以文字立身——写作、讲授、著述皆能成名。腹有诗书，气自华。'],
    '旬空': ['常表示虚、迟、空、变化，需结合全局。', '旬空者，十干不到之处：主此事虚、迟、变。宜顺其自然，强求反空；有时「空」恰是转机。'],
    '天医': ['传统命理神煞，不用于医学诊断。', '天医为病符之解星：古传主医药缘分，今作文化参考。身体之事，仍以现代医学为准。'],
    '解神': ['主缓解、转圜、化解。', '解神如和事佬：专解纠结、化干戈为人缘。遇事宜找中间人转圜，硬碰硬不如绕个弯。'],
    '咸池': ['与桃花同论，主情感与人缘。', '咸池为桃花之别名：日晒之处桃花败，宜自重自爱。把魅力用在正途，人缘即贵人缘。'],
    '天罗': ['流派差异较大，常见取辰。', '天罗地网，主困顿纠缠：宜耐心守成，忌轻举妄动。网开一面之日，多在退一步之后。'],
    '地网': ['流派差异较大，常见取戌。', '地网主羁绊：如陷泥淖，越挣扎越深。宜静不宜动，韬光养晦待时而出。']
  };
  function shenshaEntry(name) {
    const v = SHENSHA_DICT[name];
    if (Array.isArray(v)) return { base: v[0], note: v[1] };
    return { base: v || '传统神煞，流派解释不一。', note: '' };
  }
  function formatBaziPillar(label, p) {
    return `${label}${p.text}（${p.stemElement}/${p.branchElement}，${p.yinYang}）`;
  }
  // ══════════ 八字判词变体库：古典神秘文风 · 同命恒得同一变体 ══════════
  const BAZI_VERSE = {
    zonglun: {
      '偏强': [
        '日主得势，如劲松立于岩上：自主果决，不易为外物所移。然刚者易折，宜以柔济刚，方得长青。',
        '身强而气盛，恰似秋阳正烈：行动力与担当皆胜于常人。命书云「强者宜泄」，多施多予反增福泽。',
        '日主偏强，如江河之水丰沛：宜疏导而不宜壅塞。把过剩的精力投向长远志业，便是此命最大的风水。'
      ],
      '偏弱': [
        '日主偏弱，如幽兰生于深谷：敏锐细腻，善察人心。宜借力而行——贵人、团队、平台，皆是此命的阳光雨露。',
        '身弱如烛火临风，非是命薄，而是宜静不宜躁。养精蓄锐、择善而从，待时而动反能后发先至。',
        '日主气弱，恰似新苗待哺：切忌与人硬碰硬争一时之长。积学养德、广结善缘，是此局最稳的改运之法。'
      ],
      '中和': [
        '日主中和，如四时之气流转有度：进退得宜，少有极端。此乃「中庸得福」之局，稳扎稳打自有回甘。',
        '身局调和，阴阳大体平衡：可塑性强，顺境能进、逆境能守。命之所赠，在于「稳」字。',
        '五行气息相对匀停，如良玉未琢：方向对了便温润生光。宜早立志、早深耕，忌三心二意。'
      ]
    },
    wealth: {
      caiStrong: [
        '财星透出而日主有力，正所谓「身强能胜财」：财运多主稳健进取，宜走正当渠道，越是光明磊落，财越聚得住。',
        '财星有气、日主能担，如库满而钥匙在手：宜主动布局，见机而作。忌贪快冒进，稳中求进反得大利。',
        '财星与日主两相得宜：求财宜凭本事与信誉。命理有言「财为养命之源」，取之有道方能细水长流。'
      ],
      caiWeak: [
        '财星可见而日主偏弱，是为「财多身弱」：眼中有财、手中难留。宜量力而行，忌投机过重，先强自身再谈进取。',
        '财星虽透，日主难担，如小儿抱金过市：宜守成、宜合作，借他人之力分一杯羹，胜过独吞而噎。',
        '见财而身弱，古诀谓之「富屋贫人」：宜积小成多、细水长流。把欲望放小，把本事放大，财自然来就。'
      ],
      noCaiWeak: [
        '财星不显且日主偏弱：财运宜守成，积少成多。开源之前先节流，守住的每一分都是未来的种子。',
        '局中无财、日主又弱，如田薄而苗弱：宜先养身强本，再图财路。急功近利反耗元气。',
        '财星隐伏、身弱难求：此阶段宜藏锋守拙，把精力投向长本事，财是本事的影子，形到了影自来。'
      ],
      noCai: [
        '财星不显，财来财去皆需自省：宜勤恳积累，忌羡他人之得。命无偏财者，正财之路走得最稳。',
        '局中财星深藏：求财宜靠一技之长与口碑。看似来得慢，实则根基牢，不怕风浪。',
        '财星未透，如矿藏深埋：宜深挖一口井，不羡慕满山跑。专注之处，财气自聚。'
      ]
    },
    marriage: {
      taoHua: [
        '命带桃花、红鸾或天喜之象：感情缘分较显，人前不缺青睐。宜真诚相待，莫把良缘当游戏。',
        '桃花星动，红鸾照命：近年异性缘分偏旺。缘分是敲门砖，相处才是压舱石，宜用心经营。',
        '墙内桃花既显，人缘婚缘皆有助力：单身者宜多出门走动；有伴者宜制造仪式感，感情方能常新。'
      ],
      guanCai: [
        '官财相关十神可见：婚姻多与现实条件交织，是为「先成家业、再论风月」之象。宜理性经营，门当户对未必是俗话。',
        '夫星/妻星有位，感情偏向务实：谈婚论嫁宜把物质与规划摊开谈，算清楚的账，过得去的日子。',
        '官杀财星交参：感情中现实考量偏重。宜在浪漫与面包之间找平衡，偏废任何一边都会失衡。'
      ],
      plain: [
        '感情运需结合流年大运细看：眼下宜修身以待缘。是花总会开，是缘总会来，急不得。',
        '姻缘星象暂不明朗：与其四处寻觅，不如把自己活成风景。缘分多在不经意处叩门。',
        '命局于情字一笔较淡：宜先立业、再成家，或顺其自然。强扭的瓜不甜，时候到了水自到渠成。'
      ]
    },
    career: {
      guan: [
        '官杀透干，是为「官星护身」：事业上多有责任与竞争，宜守正用权。体制内、平台型组织中更易出头。',
        '官杀为事业之星既显：宜走正道、树口碑。命书云「官星有制化为权」，把压力变成自律，便是升迁的阶梯。',
        '官星当令：事业心重，宜在大平台、大体系中一展抱负。忌单打独斗，借势方能青云直上。'
      ],
      yin: [
        '印星为靠山、为文凭、为贵人：学业或专业技能可成事业根基。宜深耕一门手艺，越老越吃香。',
        '印星助力，如有靠山在后：宜走专业路线、考取资质。把「会」变成「精」，便是此命的事业密码。',
        '印为生我之神：事业宜依附知识、文化、教育而兴。持续学习一日不停，运便一日不衰。'
      ],
      shiShang: [
        '食伤泄秀，才华宜外放：适合技艺、表达、创作、营销一类「把想法变成作品」的行当。',
        '食伤为才华之星：宜靠嘴、靠笔、靠手艺吃饭。把灵感落地为产品，名利会自己找上门。',
        '食伤吐秀：此命利自由发挥，忌被条条框框困住。有一技傍身，走遍天下都不怕。'
      ],
      plain: [
        '事业宜从日主五行所喜方向发展：稳中求进，忌朝三暮四。深耕三年，必见分晓。',
        '命局于事业一途宜「慢火细熬」：选定赛道便长期主义，时间会把复利交到耐心者手里。',
        '事业星象平和：宜先安身、再立命。不必羡慕风口，找准自己的节奏，一样能走到彼岸。'
      ]
    },
    healthLack: [
        '五行偏缺于{E}，日常可留意{O}相关调养。古人云「虚则补之」，作息规律、心绪平和为第一要义。',
        '局中{E}气不足，对应{O}宜多养护：早睡以养精，少思以养神。身体是命局的载体，载体稳了运才稳。',
        '五行于{E}略有亏空，{O}方面宜未病先防：饮食有节、起居有常，便是最好的「风水调理」。'
      ],
    healthEven: [
        '五行分布相对均衡：健康关键在规律作息与情绪平和。命局给了好底子，生活习惯决定上限。',
        '五气流转大体匀停：宜保持运动习惯、定期体检。平衡是最难得的福，守住便是赢。',
        '五行无大偏枯：身心之安，七分靠养、三分靠心。少熬夜、少动怒，福寿自然绵长。'
      ],
    liunian: [
        '流年以公历{Y}年论：吉凶需对照当年干支与原局刑冲合会。宜把握「用神得力」之年主动作为，逆水行舟不如顺水推舟。',
        '{Y}年干支与原局的生克合冲，是这一年运势的晴雨表：宜顺势而为，该进则进、该守则守，方为智者。',
        '论流年如观天时：{Y}年宜对照原局喜忌行事。用神到位之年宜大胆，忌神当头之年宜蛰伏。'
      ],
    dayun: [
        '大运起运与顺逆依年干阴阳与性别而定，每运十年：大运引动原局喜用神时多为顺遂期，宜提前布局、乘势而上。',
        '十年一大运，如四季之轮转：交运之年宜审慎。运好时广种福田，运平时韬光养晦，皆是顺天之道。',
        '大运为后天之「时势」：顺逆既定，宜知命而不认命。好运时加倍努力，坏运时守住底线，命运的天平自会倾斜。'
      ]
  };
  function buildFortuneTexts(r) {
    const dm = r.dayMaster;
    const tg = r.tenGods;
    const el = r.fiveElements;
    const level = dm.level;
    const saltBase = r.bazi || (dm.stem + dm.element + level);
    const pick = (pool, tag) => pickVariant(pool, saltBase + '|' + tag);
    const gods = [tg.year, tg.month, tg.hour];
    const hasCai = gods.some(x => x === '正财' || x === '偏财');
    const hasGuan = gods.some(x => x === '正官' || x === '七杀');
    const hasYin = gods.some(x => x === '正印' || x === '偏印');
    const hasShi = gods.some(x => x === '食神' || x === '伤官');
    const weak = level === '偏弱';
    const strong = level === '偏强';
    const zonglun = pick(BAZI_VERSE.zonglun[level] || BAZI_VERSE.zonglun['中和'], 'zonglun')
      .replace('日主', '日主' + dm.stem + '(' + dm.element + ')');
    const wealth = hasCai
      ? pick(strong ? BAZI_VERSE.wealth.caiStrong : BAZI_VERSE.wealth.caiWeak, 'wealth')
      : pick(weak ? BAZI_VERSE.wealth.noCaiWeak : BAZI_VERSE.wealth.noCai, 'wealth');
    const hasTao = r.shensha.items.some(i => i.name === '桃花' || i.name === '红鸾' || i.name === '天喜');
    const marriage = hasTao
      ? pick(BAZI_VERSE.marriage.taoHua, 'marriage')
      : pick((hasCai || hasGuan) ? BAZI_VERSE.marriage.guanCai : BAZI_VERSE.marriage.plain, 'marriage');
    const career = hasGuan
      ? pick(BAZI_VERSE.career.guan, 'career')
      : hasYin ? pick(BAZI_VERSE.career.yin, 'career')
      : hasShi ? pick(BAZI_VERSE.career.shiShang, 'career')
      : pick(BAZI_VERSE.career.plain, 'career');
    const healthMap = { 木: '肝胆、筋骨', 火: '心脏、血压、眼目', 土: '脾胃、消化', 金: '肺、呼吸道、皮肤', 水: '肾、泌尿、耳' };
    const lowEls = Object.entries(el).filter(([, v]) => v <= 1).map(([k]) => k);
    const health = lowEls.length
      ? pick(BAZI_VERSE.healthLack, 'health')
          .replace('{E}', lowEls.join('、'))
          .replace('{O}', lowEls.map(e => healthMap[e] || e).join('与'))
      : pick(BAZI_VERSE.healthEven, 'health');
    const currentYear = new Date().getFullYear();
    const liunian = pick(BAZI_VERSE.liunian, 'liunian').replace(/\{Y\}/g, currentYear);
    const dayun = pick(BAZI_VERSE.dayun, 'dayun');
    return { zonglun, wealth, marriage, career, health, liunian, dayun };
  }
  function openShenshaDict() {
    const items = (baziResult && baziResult.shensha && baziResult.shensha.items) || [];
    const names = items.length ? [...new Set(items.map(i => i.name))] : Object.keys(SHENSHA_DICT);
    let html = '<div class="mbti-intro" style="margin-bottom:8px;">以下为常见神煞简释（命理参考，非定论）。点击关闭返回。</div>';
    names.forEach(name => {
      const entry = shenshaEntry(name);
      const desc = entry.base || (items.find(i => i.name === name) || {}).description || '传统神煞，流派解释不一。';
      const pos = items.filter(i => i.name === name).map(i => i.positionNames.join('、')).filter(Boolean);
      html += `<div class="mbti-sec" style="margin-bottom:8px;"><span class="mbti-sec-label">${escapeHtml(name)}</span>${pos.length ? '（' + escapeHtml(pos.join('；')) + '）' : ''}<br><span style="color:#5a4526;">${escapeHtml(desc)}</span>${entry.note ? '<br><span style="color:#8a6f3a;">\u25C6 ' + escapeHtml(entry.note) + '</span>' : ''}</div>`;
    });
    const reportEl = document.getElementById('baziReport');
    if (reportEl) {
      reportEl.dataset.prevHtml = reportEl.innerHTML;
      reportEl.innerHTML = html + '<div style="text-align:center;margin-top:10px;"><button class="mbti-reset" onclick="closeShenshaDict()">返回排盘结果</button></div>';
    }
  }
  function closeShenshaDict() {
    const reportEl = document.getElementById('baziReport');
    if (reportEl && reportEl.dataset.prevHtml) {
      reportEl.innerHTML = reportEl.dataset.prevHtml;
      delete reportEl.dataset.prevHtml;
    }
  }
  function renderBaziReveal(type) {
    const meta = typeMeta[type] || typeMeta.xiao;
    const jiaoLabel = document.getElementById('baziJiaoLabel');
    const reportEl = document.getElementById('baziReport');
    if (jiaoLabel) {
      jiaoLabel.className = 'mbti-jiao-label ' + meta.class;
      jiaoLabel.textContent = `${meta.label} · ${meta.meaning}`;
    }
    if (!reportEl || !baziResult) return;
    if (type === 'yin') {
      reportEl.innerHTML =
        '<div class="mbti-no-report">两筊皆阴，神明未允此问。命理之相尚待重新省思，此次暂不显示排盘结果，可静心后再掷。</div>';
      return;
    }
    const r = baziResult;
    const p = r.pillars;
    const trueSolarNote = r.input && r.input.trueSolar
      ? `<div class="mbti-brief-note">已按真太阳时排盘（经度 ${r.input.longitude}°）</div>`
      : '';
    if (type === 'sheng') {
      const shenshaText = r.shensha.items.length
        ? r.shensha.items.map(it => `${it.name}(${it.positionNames.join('、')})`).join('、')
        : '未见明显神煞入命';
      const relationsText = r.relations.length
        ? r.relations.map(rel => `${BAZI_POS_LABEL[rel.a]}-${BAZI_POS_LABEL[rel.b]} ${rel.type}`).join('、')
        : '四柱之间无明显六合六冲';
      const f = buildFortuneTexts(r);
      reportEl.innerHTML = `
        <div class="mbti-type">${escapeHtml(r.bazi)}</div><div class="mbti-summary">日主 ${escapeHtml(r.dayMaster.stem)}（${escapeHtml(r.dayMaster.element)}）· ${escapeHtml(r.dayMaster.level)}</div>
        ${trueSolarNote}
        <div class="mbti-sec"><span class="mbti-sec-label">四柱</span>${escapeHtml(formatBaziPillar('年', p.year))}；${escapeHtml(formatBaziPillar('月', p.month))}；${escapeHtml(formatBaziPillar('日', p.day))}；${escapeHtml(formatBaziPillar('时', p.hour))}</div><div class="mbti-sec"><span class="mbti-sec-label">五行</span>木${r.fiveElements['木']} 火${r.fiveElements['火']} 土${r.fiveElements['土']} 金${r.fiveElements['金']} 水${r.fiveElements['水']}</div><div class="mbti-sec"><span class="mbti-sec-label">十神</span>年：${escapeHtml(r.tenGods.year)}；月：${escapeHtml(r.tenGods.month)}；时：${escapeHtml(r.tenGods.hour)}</div><div class="mbti-sec"><span class="mbti-sec-label">神煞</span>${escapeHtml(shenshaText)}</div><div class="mbti-sec"><span class="mbti-sec-label">地支</span>${escapeHtml(relationsText)}</div><div class="mbti-sec"><span class="mbti-sec-label">总论</span>${escapeHtml(f.zonglun)}</div><div class="mbti-sec"><span class="mbti-sec-label">财运</span>${escapeHtml(f.wealth)}</div><div class="mbti-sec"><span class="mbti-sec-label">婚姻</span>${escapeHtml(f.marriage)}</div><div class="mbti-sec"><span class="mbti-sec-label">事业</span>${escapeHtml(f.career)}</div><div class="mbti-sec"><span class="mbti-sec-label">健康</span>${escapeHtml(f.health)}</div><div class="mbti-sec"><span class="mbti-sec-label">大运</span>${escapeHtml(f.dayun)}</div><div class="mbti-sec"><span class="mbti-sec-label">流年</span>${escapeHtml(f.liunian)}</div><div class="mbti-brief-note">${escapeHtml(r.dayMaster.note)}</div><div style="text-align:center;margin-top:10px;"><button class="mbti-cast-btn" onclick="openShenshaDict()">神煞词典</button></div>
      `;
    } else {
      reportEl.innerHTML = `
        <div class="mbti-type">${escapeHtml(r.bazi)}</div><div class="mbti-summary">日主 ${escapeHtml(r.dayMaster.stem)}（${escapeHtml(r.dayMaster.element)}）· ${escapeHtml(r.dayMaster.level)}</div>
        ${trueSolarNote}
        <div class="mbti-brief-note">两筊皆阳，天机含笑未决，此为简版排盘，仅供参考，非定论。</div>
      `;
    }
  }
  // 打开 MBTI/八字/星座 等扩展面板后，若用户中途关闭而未完成，
  // 主输入框不应残留该扩展的占位文字（否则误按下方掷筊会把它当成真实问题提交）。
  // 统一清回占位符状态，无需整页重置即可重新选择。
  function clearQuestionSelectionToDefault() {
    if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
    fillQuestionText('');
  }
  function closeMbtiQuiz() {
    ModalUI.close('mbti');
    clearQuestionSelectionToDefault();
  }
  function handleBeastKey(e, el) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      selectBeast(el);
    }
  }
  function selectBeast(el) {
    document.querySelectorAll('.jade-zone').forEach(z => z.classList.remove('active'));
    if (selectedBeast === el.dataset.beast) {
      selectedBeast = null;
      document.getElementById('selectedLine').textContent = '轻触瑞兽请护法，不选则随机';
      return;
    }
    el.classList.add('active');
    selectedBeast = el.dataset.beast;
    const info = beastInfo[selectedBeast];
    document.getElementById('selectedLine').innerHTML =
      `已请示 <span>${info.name}</span>`;
    if (selectedBeast === 'dragon') playQing();
    else if (selectedBeast === 'tiger') playBell();
    else if (selectedBeast === 'lion') playZhong();
  }
  function getRandomBeast() {
    const keys = Object.keys(beastInfo);
    return keys[Math.floor(Math.random() * keys.length)];
  }
  function renderOracleHTML(obj) {
    // 渲染前强制校验，杜绝空字段或异常对象
    const safe = (typeof isValidOracle === 'function' && isValidOracle(obj))
      ? obj
      : (typeof pickGuardianOracle === 'function' ? pickGuardianOracle('xiao') : {
          神意: '护法示下：天机暂隐，宜顺其自然，耐心等待天时自至。',
          宜: '顺其自然',
          忌: '强求答案'
        });
    const poemHTML = (safe['诗偈'] && safe['诗偈'].length)
      ? `<div class="oracle-poem">${safe['诗偈'].map(l => `<div>${escapeHtml(l)}</div>`).join('')}</div>`
      : '';
    return `
      ${poemHTML}
      <div class="oracle-shenyi">${escapeHtml(safe['神意'])}</div><div class="oracle-yiji"><div class="oracle-pill yi"><span class="oracle-tag">宜</span>${escapeHtml(safe['宜'])}</div><div class="oracle-pill ji"><span class="oracle-tag">忌</span>${escapeHtml(safe['忌'])}</div></div>
    `;
  }
  async function castJiao() {
    const btn = document.getElementById('castBtn');
    if (btn.disabled) return;
    /* 未写问题则直接以「今日运势」起卦，不再弹出选项 */
    const question = document.getElementById('question').value.trim() || '今日运势';
    const now = Date.now();
    const beastIdentity = selectedBeast || 'random'; // 未选择视为「随机」这一身份，用于冷却比对
    const sameBeastAsLast = lastBeastIdentity !== null && beastIdentity === lastBeastIdentity;
    if (typeof lastQuestion !== 'undefined' && question === lastQuestion && sameBeastAsLast && (now - lastQuestionAt) < SAME_Q_COOLDOWN_MS) {
      const descEl = document.getElementById('resultDesc');
      const remain = Math.ceil((SAME_Q_COOLDOWN_MS - (now - lastQuestionAt)) / 1000);
      document.getElementById('resultTitle').textContent = '静心片刻';
      document.getElementById('resultTitle').className = 'result-title xiao';
      document.getElementById('resultBeast').textContent = '';
      descEl.classList.remove('loading');
      descEl.innerHTML = renderOracleHTML(
        typeof makeOracle === 'function'
          ? makeOracle({
              神意: `同一所问，神明已有示兆。请静心体会约 ${remain} 秒后再求，勿急于连掷；若想请示别位瑞兽，可直接点选宝盒上方瑞兽换一位再问。`,
              宜: '静心体悟',
              忌: '反复追问'
            }, 'xiao', 'general', 'cooldown')
          : {
              神意: `同一所问，神明已有示兆。请静心体会约 ${remain} 秒后再求，勿急于连掷；若想请示别位瑞兽，可直接点选宝盒上方瑞兽换一位再问。`,
              宜: '静心体悟',
              忌: '反复追问'
            }
      );
      return;
    }
    btn.disabled = true;
    getAudioCtx();
    const myToken = ++castToken;
    var _halo = document.getElementById('beastOverlay'); if (_halo) _halo.classList.add('watermark');
    document.getElementById('resultTitle').textContent = '';
    const descEl = document.getElementById('resultDesc');
    descEl.textContent = '';
    descEl.classList.remove('loading');
    document.getElementById('resultBeast').textContent = '';
    const display = document.getElementById('jiaoDisplay');
    display.innerHTML = '';
    const type = rollJiaoType();
    const [left, right] = facesForType(type);
    const jiao1 = document.createElement('div');
    const jiao2 = document.createElement('div');
    jiao1.className = 'jiao spinning';
    jiao2.className = 'jiao spinning';
    display.appendChild(jiao1);
    display.appendChild(jiao2);
    setTimeout(async () => {
      if (myToken !== castToken) return;
      try {
        jiao1.classList.remove('spinning');
        jiao2.classList.remove('spinning');
        jiao1.classList.add(left === 1 ? 'yang' : 'yin');
        jiao2.classList.add(right === 1 ? 'yang' : 'yin');
        jiao1.style.setProperty('--land-rot', ((Math.random() * 14) - 7).toFixed(1) + 'deg');
        jiao2.style.setProperty('--land-rot', ((Math.random() * 14) - 7).toFixed(1) + 'deg');
        jiao1.classList.add('landed');
        jiao2.classList.add('landed');
        playJiaoLand();
        const beastKey = selectedBeast || getRandomBeast();
        const info = beastInfo[beastKey] || beastInfo.dragon;
        const meta = typeMeta[type] || typeMeta.xiao;
        const titleEl = document.getElementById('resultTitle');
        titleEl.textContent = meta.title;
        titleEl.className = 'result-title ' + meta.class;
        document.getElementById('resultBeast').innerHTML = (window.beastIconHTML ? window.beastIconHTML(beastKey) : '') + escapeHtml(info.name) + ' · ' + escapeHtml(info.style);
        descEl.textContent = '叩问神明，判词生成中…';
        descEl.classList.add('loading');
        const oracle = await resolveOracle(question, type, beastKey);
        if (myToken !== castToken) return;
        try {
          descEl.classList.remove('loading');
          descEl.innerHTML = renderOracleHTML(oracle);
          lastQuestion = question;
          lastQuestionAt = Date.now();
          lastBeastIdentity = beastIdentity;
          addHistory(question, type, info.name, oracle);
        } catch (_) {
          descEl.classList.remove('loading');
          descEl.innerHTML = renderOracleHTML(
            (typeof pickGuardianOracle === 'function') ? pickGuardianOracle(type) : ultimateFallback
          );
        }
      } catch (_) {
        try {
          document.getElementById('resultTitle').textContent = '天机含蓄';
          document.getElementById('resultTitle').className = 'result-title xiao';
          document.getElementById('resultBeast').textContent = '';
          descEl.classList.remove('loading');
          descEl.innerHTML = renderOracleHTML(
            (typeof pickGuardianOracle === 'function') ? pickGuardianOracle('xiao') : ultimateFallback
          );
        } catch (__) {
          try {
            descEl.textContent = '护法示下：宜顺其自然，耐心等待天时。';
          } catch (___) {}
        }
      } finally {
        if (myToken === castToken) {
          setTimeout(() => { if (myToken === castToken) btn.disabled = false; }, POST_CAST_COOLDOWN_MS);
        }
      }
    }, 1000);
  }
  function addHistory(question, type, beastName, oracle) {
    const typeMap = {
      sheng: { text: '聖筊', cls: 'sheng' },
      xiao:  { text: '笑筊', cls: 'xiao' },
      yin:   { text: '陰筊', cls: 'yin' }
    };
    const safeType = typeMap[type] || typeMap.xiao;
    let snippet = '';
    try {
      if (oracle && oracle['神意']) {
        snippet = String(oracle['神意']);
        if (snippet.length > 16) snippet = snippet.slice(0, 16) + '…';
      }
    } catch (_) { snippet = ''; }
    history.unshift({
      q: question.length > 18 ? question.slice(0, 18) + '…' : question,
      result: safeType,
      beast: beastName || '',
      snippet,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });
    if (history.length > 8) history.pop();
    renderHistory();
  }
  function renderHistory() {
    const list = document.getElementById('historyList');
    const profileBar = renderProfileSummaryBar();
    if (history.length === 0) {
      list.innerHTML = profileBar + '<div class="history-empty">暂无请示记录</div>';
      return;
    }
    list.innerHTML = profileBar + history.map(h => `
      <div class="history-item"><span>${h.time} · ${escapeHtml(h.q)}${h.snippet ? `<br><span style="color:#a08c60;font-size:10px;">${escapeHtml(h.snippet)}</span>` : ''}</span><span class="history-result ${h.result.cls}">${h.result.text}（${window.beastIconHTML ? window.beastIconHTML(window.beastKeyByName ? window.beastKeyByName(h.beast) : '', 'sm') : ''}${escapeHtml(h.beast)}）</span></div>
    `).join('');
  }
  function toggleHistory() {
    const box = document.getElementById('historyBox');
    const backdrop = document.getElementById('historyBackdrop');
    const btn = document.getElementById('recordBtn');
    const opening = !box.classList.contains('show');
    if (opening) renderHistory();
    box.classList.toggle('show', opening);
    backdrop.classList.toggle('show', opening);
    btn.classList.toggle('on', opening);
    if (opening) lockPageScroll(); else unlockPageScroll();
  }
  function resetAll() {
    castToken++; // 使任何仍在等待神谕的请求失效
    customEditing = false;
    lastQuestion = '';
    lastQuestionAt = 0;
    lastBeastIdentity = null;
    if (typeof closeAllMenus === 'function') closeAllMenus();
    if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
    const qEl = document.getElementById('question');
    qEl.value = '';
    qEl.style.borderColor = '';
    qEl.blur();
    selectedBeast = null;
    document.querySelectorAll('.jade-zone').forEach(z => z.classList.remove('active'));
    document.getElementById('selectedLine').textContent = '轻触瑞兽请护法，不选则随机';
    document.getElementById('jiaoDisplay').innerHTML = '';
    document.getElementById('resultTitle').textContent = '';
    document.getElementById('resultTitle').className = 'result-title';
    const descEl = document.getElementById('resultDesc');
    descEl.textContent = '';
    descEl.classList.remove('loading');
    document.getElementById('resultBeast').textContent = '';
    var _halo2 = document.getElementById('beastOverlay'); if (_halo2) _halo2.classList.remove('watermark');
    document.getElementById('castBtn').disabled = false;
    const _histBoxWasOpen = document.getElementById('historyBox').classList.contains('show');
    document.getElementById('historyBox').classList.remove('show');
    document.getElementById('historyBackdrop').classList.remove('show');
    document.getElementById('recordBtn').classList.remove('on');
    if (_histBoxWasOpen) unlockPageScroll();
  }
  document.getElementById('question').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      castJiao();
    }
  });
