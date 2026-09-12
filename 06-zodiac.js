// ============================================================
// 星座运势模块
// 原始行号（拆分前单文件 script.js 中的位置）: 3212-3636
// ============================================================
  // ============================================================
  // 星座运势模块
  // ============================================================
  const ZODIAC_LIST = [
    { key: 'capricorn', name: '摩羯座', en: 'Capricorn', icon: '♑', from: [12, 22], to: [1, 19], element: '土', modality: '开创', planet: '土星',
      keywords: '务实、野心、纪律', trait: '踏实可靠，目标感强，愿意为长远目标默默付出。做事有章法，不轻易半途而废，也因此有时显得过于严肃。',
      pair: '最佳：金牛、处女（土象共鸣）；次佳：天蝎、双鱼。慎配：白羊、巨蟹（节奏易冲突）。',
      contrast: '表面冷静克制，内心其实很在意成就与被认可；外表佛系，实则野心不小。',
      slots: '工作狂倾向；把「休息」也排进效率表；对懒散的人缺乏耐心。',
      iq: '规划与执行型聪明 · 指数 ★★★★☆', temper: '慢热怒 · 记仇持久 · ★★☆☆☆爆发频率',
      love: '慢热专一 · 恋爱脑 ★★☆☆☆ · 聊天偏务实少肉麻', chat: '表达克制，深度聊事业与计划时更自在。',
      mahjong: '稳健防守 · 手气 ★★★☆☆ · 宜守中求进，少搏自摸大牌',
      luckyColor: '墨绿、炭黑', luckyNum: '8、10', career: '管理、金融、工程、法律等需长期积累的领域。',
      openLuck: '穿深色显专业感；整理书桌与账单；少承诺、多交付。' },
    { key: 'aquarius', name: '水瓶座', en: 'Aquarius', icon: '♒', from: [1, 20], to: [2, 18], element: '风', modality: '固定', planet: '天王星',
      keywords: '独立、创新、疏离', trait: '思想前卫，重视自由与独特性。善于看清系统问题，却不喜欢被情绪或规则绑住；朋友多，真正交心的少。',
      pair: '最佳：双子、天秤；次佳：射手、白羊。慎配：金牛、天蝎（控制与自由之争）。',
      contrast: '看起来很合群、很懂潮流，其实内心极需独处与精神空间。',
      slots: '聊到兴头上人间蒸发；用理性挡情感；「我们只是朋友」说得太自然。',
      iq: '抽象与系统思维 · ★★★★★', temper: '冷处理大师 · 真翻脸难挽回 · ★★☆☆☆',
      love: '需精神共鸣 · 恋爱脑 ★★☆☆☆ · 忌粘人控制', chat: '话题跳跃快，喜欢新奇观点，不爱重复情感确认。',
      mahjong: '出奇制胜 · 手气 ★★★☆☆ 波动大 · 宜观察再动手',
      luckyColor: '电光蓝、银色', luckyNum: '4、11', career: '科技、设计、公益、研究、非传统行业。',
      openLuck: '接触新知识与新圈子；留白独处时间；避免被琐事绑死。' },
    { key: 'pisces', name: '双鱼座', en: 'Pisces', icon: '♓', from: [2, 19], to: [3, 20], element: '水', modality: '变动', planet: '海王星',
      keywords: '敏感、幻想、共情', trait: '情感细腻，直觉强，容易代入他人处境。艺术与想象是避风港，现实压力大时易逃避或自我怀疑。',
      pair: '最佳：巨蟹、天蝎；次佳：金牛、摩羯。慎配：双子、射手（节奏与安全感不合）。',
      contrast: '温柔体贴的外表下，可能有坚硬的自我边界与偶尔的小脾气。',
      slots: '答应太多做不到；把幻想当现实；情绪来时整个人「下线」。',
      iq: '情感与艺术智力 · ★★★★☆', temper: '生闷气为主 · ★★★☆☆',
      love: '易理想化 · 恋爱脑 ★★★★★ · 需被温柔对待', chat: '擅长倾听与共鸣，文字偏诗意，有时答非所问。',
      mahjong: '凭感觉出牌 · 手气 ★★★☆☆ · 偶有神来之笔',
      luckyColor: '海雾紫、浅海水绿', luckyNum: '3、7', career: '艺术、疗愈、设计、影视、公益服务。',
      openLuck: '亲近水与音乐；写日记清理情绪；别一次帮所有人。' },
    { key: 'aries', name: '白羊座', en: 'Aries', icon: '♈', from: [3, 21], to: [4, 19], element: '火', modality: '开创', planet: '火星',
      keywords: '冲动、勇敢、直接', trait: '行动力强，敢开先河，讨厌拖沓与弯弯绕绕。热情来得快，兴趣转移也快；适合冲锋，需补「收尾」。',
      pair: '最佳：狮子、射手；次佳：双子、水瓶。慎配：巨蟹、摩羯（节奏冲突）。',
      contrast: '表面天不怕地不怕，内心其实很在意被认可与「我是不是够强」。',
      slots: '说完就忘；开局猛收尾弱；把直率当成无需解释。',
      iq: '临场决策型 · ★★★★☆', temper: '点火快灭火也快 · ★★★★☆ · 少记仇',
      love: '热情直球 · 恋爱脑 ★★★☆☆ · 喜欢即时回应', chat: '短句多、节奏快，讨厌车轱辘话，行动比情话多。',
      mahjong: '进攻型 · 手气 ★★★☆☆ · 爱胡大牌、波动大',
      luckyColor: '正红、橙红', luckyNum: '1、9', career: '创业、销售、运动、应急、领导一线。',
      openLuck: '先动起来再优化；适度运动泄火；重要事先冷静三分钟。' },
    { key: 'taurus', name: '金牛座', en: 'Taurus', icon: '♉', from: [4, 20], to: [5, 20], element: '土', modality: '固定', planet: '金星',
      keywords: '稳定、享受、固执', trait: '重视安全感与生活品质。一旦认定方向很难动摇，也因此可靠；改变来临时需要更多缓冲时间。',
      pair: '最佳：处女、摩羯；次佳：巨蟹、双鱼。慎配：狮子、水瓶（节奏与价值观易冲突）。',
      contrast: '看起来佛系不争，其实对喜欢的人与物占有欲不低。',
      slots: '决定慢到让人着急；吃好睡好处境一变就不安；嘴上说随便心里有标准。',
      iq: '实务与审美兼备 · ★★★★☆', temper: '能忍很久 · 爆发很可怕 · ★★☆☆☆频率',
      love: '用行动与陪伴 · 恋爱脑 ★★★☆☆ · 忌空谈承诺', chat: '语速稳、内容实，聊美食旅行生活最来劲。',
      mahjong: '稳扎稳打 · 手气 ★★★★☆ · 长线胜率高',
      luckyColor: '奶油白、森绿', luckyNum: '2、6', career: '金融、餐饮、设计、地产、手工与品质相关。',
      openLuck: '投资身体与居家舒适；闻香听音乐；别在饿的时候做决定。' },
    { key: 'gemini', name: '双子座', en: 'Gemini', icon: '♊', from: [5, 21], to: [6, 21], element: '风', modality: '变动', planet: '水星',
      keywords: '好奇、多变、沟通', trait: '信息吞吐量大，兴趣广泛，表达欲强。思维跳脱是优势，也容易让人觉得「不够专注」；深度只留给懂的人。',
      pair: '最佳：天秤、水瓶；次佳：白羊、狮子。慎配：处女、摩羯（细节与自由之争）。',
      contrast: '话多不等于浅薄；对外轻松幽默，对内可能焦虑与自我怀疑。',
      slots: '同时开太多坑；消息已读不回；承诺时太乐观。',
      iq: '学习与联结速度 · ★★★★★', temper: '嘴上不饶人 · 心里不一定真怒 · ★★★☆☆',
      love: '需新鲜感与对话 · 恋爱脑 ★★★☆☆ · 忌沉闷', chat: '连麦狂魔，话题切换快，梗多，适合聊天指数 ★★★★★',
      mahjong: '算牌灵活 · 手气 ★★★☆☆ · 爱变招、适合快节奏',
      luckyColor: '明黄、天空蓝', luckyNum: '5、14', career: '媒体、教育、销售、写作、互联网运营。',
      openLuck: '多走路多说话换环境；记灵感备忘录；一次只深挖一件事。' },
    { key: 'cancer', name: '巨蟹座', en: 'Cancer', icon: '♋', from: [6, 22], to: [7, 22], element: '水', modality: '开创', planet: '月亮',
      keywords: '守护、情绪、家庭', trait: '重视归属与亲密关系，感知力极强。对外可能害羞，对内里人温柔护短；情绪潮汐明显，需被理解而非说教。',
      pair: '最佳：天蝎、双鱼；次佳：金牛、处女。慎配：白羊、天秤（表达方式不同）。',
      contrast: '外表柔软好说话，保护欲与防备心其实都很强。',
      slots: '翻旧账；用沉默惩罚；把「为你好」说成控制。',
      iq: '记忆与情感联结 · ★★★★☆', temper: '潮汐型 · 退缩多于爆发 · ★★★☆☆',
      love: '高投入高敏感 · 恋爱脑 ★★★★☆ · 安全感第一', chat: '擅长关心起居，聊家常与回忆，忌被敷衍。',
      mahjong: '凭气场 · 手气 ★★★☆☆ · 心情好时顺到离谱',
      luckyColor: '月白、银蓝', luckyNum: '2、7', career: '教育、护理、餐饮、房产、内容与照护类。',
      openLuck: '整理小窝；做饭给自己；与信任的人说真话。' },
    { key: 'leo', name: '狮子座', en: 'Leo', icon: '♌', from: [7, 23], to: [8, 22], element: '火', modality: '固定', planet: '太阳',
      keywords: '自信、领导、荣耀', trait: '天生存在感，乐于带动气氛与承担责任。大方热情，也需要舞台与掌声；被忽视时锋芒会收回去。',
      pair: '最佳：白羊、射手；次佳：双子、天秤。慎配：金牛、天蝎（主导权之争）。',
      contrast: '看起来高傲自信，其实很怕被忽视、被当众否定。',
      slots: '戏份不够就不开心；把面子看得比问题本身重；大方到忘记边界。',
      iq: '组织与感染力 · ★★★★☆', temper: '面子触发器 · 当众被驳易炸 · ★★★★☆',
      love: '浪漫大方 · 恋爱脑 ★★★★☆ · 需被看见与欣赏', chat: '表达有画面感，喜欢被接住情绪与夸赞，聊天指数 ★★★★☆',
      mahjong: '气场压场 · 手气 ★★★★☆ · 爱做大牌',
      luckyColor: '金色、阳光橙', luckyNum: '1、19', career: '表演、管理、公关、教育、品牌与舞台相关。',
      openLuck: '穿能撑场面的颜色；公开表达感谢；把聚光灯也分给别人。' },
    { key: 'virgo', name: '处女座', en: 'Virgo', icon: '♍', from: [8, 23], to: [9, 22], element: '土', modality: '变动', planet: '水星',
      keywords: '细致、分析、完美', trait: '标准高，善于优化流程与发现问题。服务意识强，也容易自我苛责；「差不多」三个字很难从嘴里说出来。',
      pair: '最佳：金牛、摩羯；次佳：巨蟹、天蝎。慎配：射手、双鱼（松紧度不合）。',
      contrast: '嘴上挑剔、要求多，行动上其实很愿意默默帮忙。',
      slots: '改别人计划改到对方崩溃；焦虑时清洁狂魔；难说「我需要帮助」。',
      iq: '细节与系统分析 · ★★★★★', temper: '沉默或纠正式不满 · ★★☆☆☆',
      love: '用服务与改进表达爱 · 恋爱脑 ★★☆☆☆ · 忌笼统敷衍', chat: '逻辑清晰、爱补充细节，适合解决问题型对话。',
      mahjong: '精算型 · 手气 ★★★★☆ · 少失误、宜细磨',
      luckyColor: '米灰、草木绿', luckyNum: '5、15', career: '医疗、编辑、技术、分析、品控与顾问。',
      openLuck: '允许 80 分也合格；规律作息；把「批评」改成「建议」。' },
    { key: 'libra', name: '天秤座', en: 'Libra', icon: '♎', from: [9, 23], to: [10, 23], element: '风', modality: '开创', planet: '金星',
      keywords: '平衡、审美、犹豫', trait: '追求和谐与美感，决策时常左右衡量。善于调解，也容易为了不得罪人而委屈自己；一旦想清楚，立场可以很坚定。',
      pair: '最佳：双子、水瓶；次佳：狮子、射手。慎配：巨蟹、摩羯（决策速度不同）。',
      contrast: '看起来和气好说话，其实内心评分标准很细，主见不弱。',
      slots: '选择困难到外卖都点半小时；用礼貌回避冲突；外观管理强迫症。',
      iq: '人际与审美智慧 · ★★★★☆', temper: '讨厌冲突 · 生气也优雅 · ★★☆☆☆',
      love: '需对等与仪式感 · 恋爱脑 ★★★★☆ · 忌单方面付出', chat: '会接话会圆场，聊天舒适度高，指数 ★★★★★',
      mahjong: '顾全大局 · 手气 ★★★☆☆ · 牌风优雅、忌急躁',
      luckyColor: '玫瑰粉、淡粉金', luckyNum: '6、15', career: '设计、法律、公关、艺术、人力与协调类。',
      openLuck: '整理穿搭与空间；与人合作而非单打；重要决定设截止时点。' },
    { key: 'scorpio', name: '天蝎座', en: 'Scorpio', icon: '♏', from: [10, 24], to: [11, 22], element: '水', modality: '固定', planet: '冥王星',
      keywords: '深刻、控制、洞察', trait: '情感浓烈，洞察力强，不轻易交底。信任建立慢，一旦交付就极深；对虚伪与背叛零容忍。',
      pair: '最佳：巨蟹、双鱼；次佳：处女、摩羯。慎配：狮子、水瓶（权力与自由）。',
      contrast: '表面淡定甚至冷感，内心戏与感受浓度极高。',
      slots: '试探多于直说；记仇也记恩；「没事」往往有事。',
      iq: '洞察与策略 · ★★★★★', temper: '怒火深藏 · 报复欲与忠诚同级 · ★★★☆☆',
      love: '极致投入 · 恋爱脑 ★★★★☆ · 占有与忠诚并存', chat: '话不多但句句有信息量，讨厌浮夸，适合深聊。',
      mahjong: '心理战强 · 手气 ★★★★☆ · 爱设陷阱',
      luckyColor: '酒红、墨黑', luckyNum: '9、13', career: '调研、心理、金融、刑侦、危机处理与深度创作。',
      openLuck: '运动或写作泄压；只对可信之人交底；把控制欲换成边界感。' },
    { key: 'sagittarius', name: '射手座', en: 'Sagittarius', icon: '♐', from: [11, 23], to: [12, 21], element: '火', modality: '变动', planet: '木星',
      keywords: '自由、乐观、探索', trait: '向往远方与真理，厌恶被绑住。幽默豁达，有时直球到让人接不住；原则问题上一丝不苟。',
      pair: '最佳：白羊、狮子；次佳：水瓶、双子。慎配：处女、双鱼（松紧与现实感）。',
      contrast: '看起来没心没肺、永远在路上，其实原则很硬，也怕失去自由。',
      slots: '过度承诺行程；把诚实当借口不顾情面；长期计划写了也不执行。',
      iq: '宏观与跨文化理解 · ★★★★☆', temper: '直球吐槽 · 过了就算 · ★★★☆☆',
      love: '需空间与共同冒险 · 恋爱脑 ★★★☆☆ · 忌束缚', chat: '段子手潜质，话题天南地北，聊天轻松指数 ★★★★★',
      mahjong: '豪放型 · 手气 ★★★☆☆ · 宜放松打、忌纠结',
      luckyColor: '紫色、天空蓝', luckyNum: '3、12', career: '旅行、教育、出版、外贸、运动与户外。',
      openLuck: '计划一次短途出走；学一点新语言或哲学；对承诺做减法。' }
  ];
  const ZODIAC_STORAGE_KEY = 'yumiao_zodiac_v1';
  let zodiacSelected = null;
  let zodiacMonthVal = 6;
  let zodiacDayVal = 15;
  function getZodiacByDate(month, day) {
    for (const z of ZODIAC_LIST) {
      const [fm, fd] = z.from;
      const [tm, td] = z.to;
      if (fm <= tm) {
        if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm)) return z;
      } else {
        if ((month === fm && day >= fd) || (month === tm && day <= td) || month > fm || month < tm) return z;
      }
    }
    return ZODIAC_LIST[0];
  }
  function updateZodiacPreview() {
    const z = getZodiacByDate(zodiacMonthVal, zodiacDayVal);
    zodiacSelected = z;
    const el = document.getElementById('zodiacPreviewName');
    if (el) el.textContent = z.icon + ' ' + z.name + ' · ' + z.en + '（' + z.element + '象）';
  }
  function initZodiacWheels() {
    const mEl = document.getElementById('zodiacMonthWheel');
    const dEl = document.getElementById('zodiacDayWheel');
    if (!mEl || !dEl) return;
    const data = readStorageJSON(ZODIAC_STORAGE_KEY, null);
    if (data) {
      if (data.month) zodiacMonthVal = Number(data.month);
      if (data.day) zodiacDayVal = Number(data.day);
    }
    document.getElementById('zodiacMonth').value = zodiacMonthVal;
    document.getElementById('zodiacDay').value = zodiacDayVal;
    const months = [1,2,3,4,5,6,7,8,9,10,11,12];
    const syncDay = () => {
      const maxD = daysInMonth(2000, zodiacMonthVal);
      if (zodiacDayVal > maxD) zodiacDayVal = maxD;
      document.getElementById('zodiacDay').value = zodiacDayVal;
      const days = [];
      for (let d = 1; d <= maxD; d++) days.push(d);
      buildWheel(dEl, days, days.map(d => d + '日'), zodiacDayVal, (v) => {
        zodiacDayVal = v;
        document.getElementById('zodiacDay').value = v;
        updateZodiacPreview();
        saveSharedBirth({ month: zodiacMonthVal, day: zodiacDayVal });
        writeStorageJSON(ZODIAC_STORAGE_KEY, { month: zodiacMonthVal, day: zodiacDayVal });
      });
      updateZodiacPreview();
    };
    buildWheel(mEl, months, months.map(m => m + '月'), zodiacMonthVal, (v) => {
      zodiacMonthVal = v;
      document.getElementById('zodiacMonth').value = v;
      syncDay();
      saveSharedBirth({ month: zodiacMonthVal, day: zodiacDayVal });
      writeStorageJSON(ZODIAC_STORAGE_KEY, { month: zodiacMonthVal, day: zodiacDayVal });
    });
    syncDay();
  }
  function openZodiacPanel() {
    applySharedToZodiac();
    initZodiacWheels();
    backToZodiacForm();
    ModalUI.open('zodiac');
  }
  function closeZodiacPanel() {
    ModalUI.close('zodiac');
    clearQuestionSelectionToDefault();
  }
  function backToZodiacForm() {
    const reveal = document.getElementById('zodiacReveal');
    const form = document.getElementById('zodiacForm');
    if (reveal) reveal.style.display = 'none';
    if (form) form.style.display = '';
  }
  function submitZodiacForm() {
    saveSharedBirth({ month: zodiacMonthVal, day: zodiacDayVal });
    updateZodiacPreview();
    if (!zodiacSelected) return;
    saveProfileSummary('zodiac', `${zodiacSelected.name}·${zodiacSelected.element}象`);
    document.getElementById('zodiacForm').style.display = 'none';
    document.getElementById('zodiacReveal').style.display = 'flex';
    castZodiacJiao();
  }
  function castZodiacJiao() {
    if (!zodiacSelected) {
      updateZodiacPreview();
      if (!zodiacSelected) return;
    }
    const recastBtn = document.getElementById('zodiacRecast');
    const jiaoLabel = document.getElementById('zodiacJiaoLabel');
    const reportEl = document.getElementById('zodiacReport');
    const display = document.getElementById('zodiacJiaoDisplay');
    if (!display) return;
    if (recastBtn) recastBtn.style.display = 'none';
    if (jiaoLabel) { jiaoLabel.textContent = ''; jiaoLabel.className = 'mbti-jiao-label'; }
    if (reportEl) reportEl.innerHTML = '';
    try { getAudioCtx(); } catch (_) {}
    display.innerHTML = '';
    const type = rollJiaoType();
    const faces = facesForType(type);
    const left = faces[0], right = faces[1];
    const jiao1 = document.createElement('div');
    const jiao2 = document.createElement('div');
    jiao1.className = 'jiao spinning';
    jiao2.className = 'jiao spinning';
    display.appendChild(jiao1);
    display.appendChild(jiao2);
    setTimeout(function () {
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
        renderZodiacReveal(type);
      } catch (err) {
        if (reportEl) {
          reportEl.innerHTML = '<div class="mbti-no-report">掷筊失败，请再试一次。</div>';
        }
      } finally {
        if (recastBtn) recastBtn.style.display = 'inline-block';
      }
    }, 1000);
  }
  function zodiacSeed() {
    const z = zodiacSelected;
    if (!z) return 1;
    const s = z.key + '|' + zodiacMonthVal + '|' + zodiacDayVal + '|' + new Date().toDateString();
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h) >>> 0;
  }
  function zodiacPick(arr, salt) {
    const seed = (zodiacSeed() + (salt || 0)) >>> 0;
    return arr[seed % arr.length];
  }
  function zodiacScore(salt) {
    // 返回 1–5 星与文案档位
    const seed = (zodiacSeed() + (salt || 0)) >>> 0;
    const n = (seed % 5) + 1;
    const stars = '★'.repeat(n) + '☆'.repeat(5 - n);
    const labels = ['需谨慎', '平平', '小吉', '中吉', '大吉'];
    return { n: n, stars: stars, label: labels[n - 1] };
  }
  function zodiacFortuneText(kind) {
    const z = zodiacSelected;
    const el = z ? z.element : '土';
    const sc = zodiacScore(kind === 'today' ? 11 : kind === 'month' ? 29 : 47);
    const todayLines = [
      '今日整体 ' + sc.stars + '（' + sc.label + '）。宜顺势推进已有安排，忌临时起意的大额决定。' + el + '象今日宜稳中带进。',
      '今日气场 ' + sc.stars + '。人际上多听少辩，事务上先完成再完美；傍晚后运势更顺。',
      '今日运势偏' + sc.label + '。适合整理、复盘与小范围沟通，不宜硬闯陌生局。',
      '今日 ' + sc.stars + '：贵人可能以「提醒」而非「送礼」的形式出现，细心即是开运。'
    ];
    const monthLines = [
      '本月基调 ' + sc.stars + '（' + sc.label + '）。上旬宜布局，中旬看执行，下旬适合收尾与复盘。',
      '月运呈现' + sc.label + '之象。工作与感情皆有起伏，稳住重心、减少比较心即可过关。',
      '本月宜守中有攻，运势 ' + sc.stars + '。贵人多在月中之后，重要邀约可往后排。',
      '本月 ' + el + '象能量被调动：学习与健康同抓，忌只顾一头。整体 ' + sc.stars + '。'
    ];
    const yearLines = [
      '今年大方向 ' + sc.stars + '（' + sc.label + '）。适合打基础、扩人脉，忌投机与透支信誉。',
      '年运以' + sc.label + '为主。上半年偏积累，下半年更有外显机会；健康作息是放大器。',
      '年度运势 ' + sc.stars + '。关键转折多在换季之时，提前准备比临时应变更重要。',
      '今年宜「做减法」：减无效社交与空耗项目，能量会回流到真正重要的事上。'
    ];
    if (kind === 'month') return zodiacPick(monthLines, 3);
    if (kind === 'year') return zodiacPick(yearLines, 7);
    return zodiacPick(todayLines, 1);
  }
  function mercuryRetroText() {
    const windows = {
      1: '1 月常见水逆余波：沟通易有歧义，合同与行程请二次确认；适合复盘旧项目。',
      2: '2–3 月或进入水逆窗口：电子设备、旅行票务多留心；话说一半不如说清楚。',
      3: '3 月水逆高发期：重要文件双备份，避免在情绪上头时发长文或做承诺。',
      4: '4 月水逆影响减弱：适合重启被搁置的计划，但仍忌口头承诺过满。',
      5: '5 月相对顺畅：表达与学习运不错，仍建议重要约定落实到文字。',
      6: '6–7 月或有水逆：感情与合作表述要清晰，旅行预留弹性时间。',
      7: '7 月水逆窗口：交通与电子设备故障率上升，备份与耐心是护身符。',
      8: '8 月影响收尾：适合修复关系、整理对话记录，把误会讲开。',
      9: '9 月可能再入水逆：考试与学习宜提前准备，勿压在截止日当天。',
      10: '10 月水逆期：职场邮件与汇报多检查错别字与附件，避免误读。',
      11: '11 月逐步顺畅：适合推进长期项目，沟通成本下降。',
      12: '12 月偶有波动：年底事务列清单防漏，送礼与祝福话术宜真诚简洁。'
    };
    return windows[zodiacMonthVal] || '水逆提示仅供娱乐参考：沟通慢半拍、备份多一份，总不会错。';
  }
  function zodiacDomainScores() {
    // 事业/财运/感情/健康 四维今日分数，由种子衍生，彼此略相关
    const base = zodiacSeed();
    const mk = function (salt) {
      const n = ((base + salt * 97) % 5) + 1;
      return { n: n, stars: '★'.repeat(n) + '☆'.repeat(5 - n) };
    };
    return {
      career: mk(3),
      wealth: mk(5),
      love: mk(7),
      health: mk(11)
    };
  }
  function renderZodiacReveal(type) {
    const meta = typeMeta[type] || typeMeta.xiao;
    const jiaoLabel = document.getElementById('zodiacJiaoLabel');
    const reportEl = document.getElementById('zodiacReport');
    const z = zodiacSelected;
    if (jiaoLabel) {
      jiaoLabel.className = 'mbti-jiao-label ' + meta.class;
      jiaoLabel.textContent = meta.label + ' · ' + meta.meaning;
    }
    if (!reportEl || !z) return;
    const range = z.from[0] === 12
      ? ('12.' + z.from[1] + '–1.' + z.to[1])
      : (z.from[0] + '.' + z.from[1] + '–' + z.to[0] + '.' + z.to[1]);
    if (type === 'yin') {
      reportEl.innerHTML =
        '<div class="mbti-type">' + z.icon + ' ' + escapeHtml(z.name) + ' · ' + escapeHtml(z.en) + '</div>' +
        '<div class="mbti-summary">' + escapeHtml(z.element) + '象 · ' + escapeHtml(z.keywords) + ' · ' + escapeHtml(range) + '</div>' +
        '<div class="mbti-brief-note">两筊皆阴，神明未允细问。仅示星座本身，详细运势请静心后再掷。</div>';
      return;
    }
    if (type === 'xiao') {
      reportEl.innerHTML =
        '<div class="mbti-type">' + z.icon + ' ' + escapeHtml(z.name) + ' · ' + escapeHtml(z.en) + '</div>' +
        '<div class="mbti-summary">' + escapeHtml(z.element) + '象 · ' + escapeHtml(z.planet || '') + '守护 · ' + escapeHtml(z.keywords) + '</div>' +
        '<div class="mbti-sec"><span class="mbti-sec-label">性格</span>' + escapeHtml(z.trait) + '</div>' +
        '<div class="mbti-sec"><span class="mbti-sec-label">今日</span>' + escapeHtml(zodiacFortuneText('today')) + '</div>' +
        '<div class="mbti-sec"><span class="mbti-sec-label">开运</span>' + escapeHtml(z.openLuck || '') + '</div>' +
        '<div class="mbti-brief-note">两筊皆阳，此为简版，仅供参考。再掷或求聖筊可阅详版。</div>';
      return;
    }
    // 聖筊详版
    const dom = zodiacDomainScores();
    reportEl.innerHTML =
      '<div class="mbti-type">' + z.icon + ' ' + escapeHtml(z.name) + ' · ' + escapeHtml(z.en) + '</div>' +
      '<div class="mbti-summary">' + escapeHtml(z.element) + '象 · ' + escapeHtml(z.modality || '') + ' · ' + escapeHtml(z.planet || '') + '守护<br>' +
      escapeHtml(z.keywords) + ' · 生日 ' + escapeHtml(range) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">性格</span>' + escapeHtml(z.trait) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">配对</span>' + escapeHtml(z.pair) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">今日</span>' + escapeHtml(zodiacFortuneText('today')) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">四维</span>' +
        '事业 ' + dom.career.stars + '　财运 ' + dom.wealth.stars + '<br>' +
        '感情 ' + dom.love.stars + '　健康 ' + dom.health.stars +
      '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">月运</span>' + escapeHtml(zodiacFortuneText('month')) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">年运</span>' + escapeHtml(zodiacFortuneText('year')) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">水逆</span>' + escapeHtml(mercuryRetroText()) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">开运</span>' + escapeHtml(z.openLuck || '') +
        '　幸运色：' + escapeHtml(z.luckyColor || '—') +
        '　幸运数：' + escapeHtml(z.luckyNum || '—') + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">事业</span>' + escapeHtml(z.career || '') + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">反差</span>' + escapeHtml(z.contrast) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">槽点</span>' + escapeHtml(z.slots || '') + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">智商</span>' + escapeHtml(z.iq) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">脾气</span>' + escapeHtml(z.temper) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">恋爱</span>' + escapeHtml(z.love) + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">聊天</span>' + escapeHtml(z.chat || '') + '</div>' +
      '<div class="mbti-sec"><span class="mbti-sec-label">麻将</span>' + escapeHtml(z.mahjong) + '</div>' +
      '<div class="mbti-brief-note">星座与运势仅供娱乐参考，不构成任何决策建议。擲筊只决定详略，不改变星座本身。</div>';
  }
  function openZodiacDict() {
    let html = '<div class="mbti-intro" style="margin-bottom:8px;">十二星座词典（图标 · 中英文 · 日期 · 元素）。点返回可回到结果。</div>';
    ZODIAC_LIST.forEach(function (z) {
      const range = z.from[0] === 12
        ? ('12.' + z.from[1] + '–1.' + z.to[1])
        : (z.from[0] + '.' + z.from[1] + '–' + z.to[0] + '.' + z.to[1]);
      html += '<div class="mbti-sec" style="margin-bottom:8px;"><span class="mbti-sec-label">' + z.icon + '</span><strong>' + escapeHtml(z.name) + '</strong> ' + escapeHtml(z.en) +
        '<br><span style="color:#5a4526;">' + escapeHtml(range) + ' · ' + escapeHtml(z.element) + '象 · ' + escapeHtml(z.planet || '') + ' · ' + escapeHtml(z.keywords) + '</span></div>';
    });
    const reportEl = document.getElementById('zodiacReport');
    if (reportEl) {
      reportEl.dataset.prevHtml = reportEl.innerHTML;
      reportEl.innerHTML = html + '<div style="text-align:center;margin-top:10px;"><button class="mbti-reset" onclick="closeZodiacDict()">返回结果</button></div>';
    }
  }
  function closeZodiacDict() {
    const reportEl = document.getElementById('zodiacReport');
    if (reportEl && reportEl.dataset.prevHtml) {
      reportEl.innerHTML = reportEl.dataset.prevHtml;
      delete reportEl.dataset.prevHtml;
    }
  }
  // 统一的 ESC 关闭监听：历史记录框 + ModalUI 管理的四个弹窗（原来分散在两处 keydown 监听器里，现合并为一处）
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('historyBox').classList.contains('show')) {
      toggleHistory();
    }
    if (ModalUI.isOpen('mbti')) closeMbtiQuiz();
    if (ModalUI.isOpen('zodiac')) closeZodiacPanel();
    if (ModalUI.isOpen('bazi')) closeBaziPanel();
    if (ModalUI.isOpen('western')) closeWesternPanel();
  });
