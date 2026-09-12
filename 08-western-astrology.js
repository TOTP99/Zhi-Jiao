// ============================================================
// 西方星盘计算引擎 + 报告渲染 UI
// 原始行号（拆分前单文件 script.js 中的位置）: 3712-4593
// ============================================================
  // ============================================================
  // 全局错误边界：未捕获异常 / Promise 拒绝 → 软恢复，不白屏
  // ============================================================
  (function installGlobalErrorBoundary() {
    let lastGuardAt = 0;
    const GUARD_COOLDOWN_MS = 1500;
    function isBenignMessage(msg) {
      if (!msg) return false;
      const s = String(msg);
      // 浏览器扩展、ResizeObserver 等常见无害噪声
      return /ResizeObserver|Script error\.?$|chrome-extension:\/\/|moz-extension:\/\//i.test(s);
    }
    function reportToSentry(error, message) {
      try {
        if (!window.YumiaoSentry || !window.YumiaoSentry.enabled) return;
        if (error) window.YumiaoSentry.captureException(error, { tags: { area: 'global' } });
        else if (message) window.YumiaoSentry.captureMessage(String(message), 'error');
      } catch (_) {}
    }
    function softRecoverUI(reason) {
      const now = Date.now();
      if (now - lastGuardAt < GUARD_COOLDOWN_MS) return;
      lastGuardAt = now;
      try {
        const btn = document.getElementById('castBtn');
        if (btn) btn.disabled = false;
        const descEl = document.getElementById('resultDesc');
        if (descEl) {
          // 先判断是否处于加载/空态，再去掉 loading，避免误判
          const wasLoading = descEl.classList.contains('loading');
          const textNow = descEl.textContent || '';
          const htmlNow = String(descEl.innerHTML || '').trim();
          const loadingLike = wasLoading
            || /演化中|叩问神明/.test(textNow)
            || !htmlNow;
          descEl.classList.remove('loading');
          // 仅在加载中或空内容时写入护法示下，避免覆盖已有正常判词
          if (loadingLike || reason === 'force') {
            if (typeof renderOracleHTML === 'function' && typeof pickGuardianOracle === 'function') {
              descEl.innerHTML = renderOracleHTML(pickGuardianOracle('xiao', 'general'));
            } else {
              descEl.textContent = '护法示下：宜顺其自然，耐心等待天时。';
            }
          }
        }
        const titleEl = document.getElementById('resultTitle');
        if (titleEl && !titleEl.textContent) {
          titleEl.textContent = '天机含蓄';
          titleEl.className = 'result-title xiao';
        }
        // MBTI / 八字按钮若被锁，尽量解锁
        const mbtiCast = document.getElementById('mbtiCastBtn');
        if (mbtiCast && mbtiCast.disabled) {
          // 不强制打开：仅在有完整答案时由业务逻辑启用
        }
        const baziRecast = document.getElementById('baziRecast');
        if (baziRecast) baziRecast.disabled = false;
      } catch (_) { /* 边界自身失败则放弃，避免递归 */ }
    }
    window.onerror = function (message, source, lineno, colno, error) {
      try {
        if (isBenignMessage(message) || isBenignMessage(error && error.message)) {
          return true;
        }
        reportToSentry(error || null, message);
        softRecoverUI();
      } catch (_) {}
      // 返回 true 减少部分浏览器默认控制台噪音；开发仍可在 Sources 见断点
      return true;
    };
    window.onunhandledrejection = function (event) {
      try {
        const reason = event && event.reason;
        const msg = (reason && reason.message) ? reason.message : String(reason || '');
        if (isBenignMessage(msg)) {
          if (event && event.preventDefault) event.preventDefault();
          return;
        }
        reportToSentry(reason instanceof Error ? reason : null, msg);
        // 已知的神谕链路错误已在 resolveOracle 内处理；若仍漏出则软恢复
        softRecoverUI();
        if (event && event.preventDefault) event.preventDefault();
      } catch (_) {}
    };
    // 页面卸载前释放，避免残留
    window.addEventListener('pagehide', function () {
      try {
        window.onerror = null;
        window.onunhandledrejection = null;
      } catch (_) {}
    });
  })();
  // ============================================================
  // ============================================================
  // 西方星盘模块（纯前端，无需 Python）
  // 触发：长按 #sealHit 热区（覆盖猫徽章，禁止系统「保存图片」）
  // 流程：滚轮选生日时间 → 开始分析 → 折叠报告 / 小词典 → 知道了返回
  // ============================================================
  // ============================================================
  const WESTERN_STORAGE_KEY = 'yumiao_western_form_v1';
  const W_SIGN = ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'];
  const W_SIGN_GLYPH = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  function signName(idx){ return W_SIGN_GLYPH[idx]+W_SIGN[idx]; }
  function signOf(p){ return signName(p.signIdx); }
  const W_ELEM = ['火','土','风','水','火','土','风','水','火','土','风','水'];
  const W_QUAL = ['基本','固定','变动','基本','固定','变动','基本','固定','变动','基本','固定','变动'];
  const W_PLANETS = [
    {key:'sun', cn:'太阳', glyph:'☉'}, {key:'moon', cn:'月亮', glyph:'☽'},
    {key:'mercury', cn:'水星', glyph:'☿'}, {key:'venus', cn:'金星', glyph:'♀'},
    {key:'mars', cn:'火星', glyph:'♂'}, {key:'jupiter', cn:'木星', glyph:'♃'},
    {key:'saturn', cn:'土星', glyph:'♄'}, {key:'uranus', cn:'天王星', glyph:'♅'},
    {key:'neptune', cn:'海王星', glyph:'♆'}, {key:'pluto', cn:'冥王星', glyph:'♇'}
  ];
  const W_HOUSE_CN = ['第1宫 自我/外貌','第2宫 财富/价值观','第3宫 沟通/学习','第4宫 家庭/根基','第5宫 创造/恋爱','第6宫 工作/健康','第7宫 伴侣/合作','第8宫 转化/共享','第9宫 哲学/远行','第10宫 事业/地位','第11宫 朋友/理想','第12宫 潜意识/隐秘'];
  const SUN_I = {0:'热情主动、冲动、领导力强，喜欢开创与挑战。',1:'稳定务实、享受感官、有耐心与毅力，重视安全感。',2:'好奇多变、沟通力强、思维敏捷，喜欢学习与交流。',3:'情感丰富、护家、直觉敏锐，重视安全感与情感连结。',4:'自信大方、有创造力与表现欲，喜欢被认可与领导。',5:'细致分析、追求完美、服务导向，务实且注重细节。',6:'追求和谐、外交手腕佳、审美高，重视关系与公平。',7:'深刻强烈、洞察力强、有转化力，情感与意志坚定。',8:'乐观冒险、追求真理与自由，喜欢探索与哲学思考。',9:'有责任感、野心强、务实坚韧，追求成就与地位。',10:'独立创新、人道主义、思想前卫，重视自由与群体。',11:'敏感浪漫、同情心强、有艺术与灵性倾向，易受环境影响。'};
  const MOON_I = {0:'情绪直接冲动，需要行动与独立空间来处理感受。',1:'情感稳定，通过感官与物质安全感获得安慰。',2:'情绪多变，需要通过说话、写作或学习来调节情绪。',3:'情感需求强烈，重视家庭与照顾他人，情绪易受影响。',4:'需要被欣赏与表现，情感表达戏剧化且温暖。',5:'通过服务与分析来处理情绪，可能过度自我批评。',6:'需要和谐关系，情绪受伴侣与环境平衡影响大。',7:'情感深刻强烈，需要深度亲密与信任，不易轻易表露。',8:'情绪乐观，通过冒险、旅行或哲学思考来获得自由感。',9:'情感内敛务实，通过成就与责任感获得安全感。',10:'情感独立客观，重视友谊与自由，可能显得疏离。',11:'情绪敏感易共鸣，需要独处与艺术/灵性来滋养。'};
  const ASC_I = {0:'外在给人直接、有活力、主动的印象，行动力强。',1:'外在沉稳、可靠、有气质，给人安全与美感。',2:'外在灵活、健谈、年轻感，思维反应快。',3:'外在温和、有保护欲、情绪敏感，亲和力强。',4:'外在自信、有魅力、存在感强，喜欢被注意。',5:'外在整洁、细致、谦逊，给人可靠与专业感。',6:'外在优雅、有礼貌、追求平衡，社交能力佳。',7:'外在神秘、强烈、有穿透力，给人深刻印象。',8:'外在乐观、直率、有冒险气质，喜欢广阔视野。',9:'外在严肃、有威严、成熟稳重，给人可靠感。',10:'外在独特、独立、有未来感，思想前卫。',11:'外在柔和、梦幻、有艺术气质，易适应环境。'};
  const MERCURY_I = {0:'思考快、说话直，想到就说，擅长临场反应，但易漏细节，宜说完先停一停再补充。',1:'思路稳、讲求实用，不喜空谈，习惯把话想透再开口，语速慢但可信度高。',2:'一心多用，话题跳得快，擅长归纳信息、串联人脉，但容易只讲皮毛，需练深挖一件事。',3:'凭感觉思考，记性好、重情境，讲道理前先讲情绪，适合共情式沟通而非纯说理。',4:'表达自信有戏剧性，擅长讲故事、带节奏，但要留意是否听得进不同意见。',5:'逻辑严谨、挑错本能强，适合做审核与规划，但对自己和别人都容易太苛刻。',6:'习惯先看双方立场再表态，说话讲分寸、给台阶，优点是圆融，缺点是决断慢。',7:'话不多但一开口有分量，善于看穿表面，适合深度对话，不喜欢寒暄式社交。',8:'想法跳跃、爱讲大道理和远景，乐观有感染力，但细节和时限容易被忽略。',9:'说话务实克制，重证据轻情绪，适合谈判与规划，但有时显得不近人情。',10:'思维跳脱常规，点子多、爱唱反调，适合出主意，但需要有人帮忙落地执行。',11:'思考跳跃、直觉先于逻辑，语言有画面感，容易被情绪或环境带偏方向。'};
  const VENUS_I = {0:'喜欢直接的追求方式，讨厌拖泥带水，热恋期来得快也退得快，忠于当下的心动。',1:'重视稳定与实感，喜欢被用心对待而非甜言蜜语，一旦认定较少变心。',2:'喜欢有话聊、够聪明的对象，怕关系一成不变，需要新鲜感与思想上的共振。',3:'重感情、念旧，喜欢被照顾也享受照顾人，安全感是感情能否深入的关键。',4:'喜欢被崇拜、被公开表达在意，恋爱带点戏剧感，大方给爱也要求同等回应。',5:'表达含蓄，习惯用行动而非言语示爱，挑剔是因为在意，值得被读懂。',6:'看重公平与美感，讨厌冲突，愿意为关系妥协，但要小心一味迁就失去自我。',7:'爱得深、也占有欲强，喜欢强度高的连结，不满足于表面关系，重信任与忠诚。',8:'喜欢自由、有空间的关系，怕被束缚，吸引力来自共同冒险与见识的碰撞。',9:'择偶务实、重长期承诺，不轻易开始也不轻易结束，看重责任与匹配度。',10:'喜欢独立、有个性的对象，需要关系里保留自我空间，忽冷忽热是常态。',11:'浪漫、易心软，容易为爱奉献甚至忽略界限，宜分清幻想与现实中的对方。'};
  const MARS_I = {0:'行动力强、说做就做，遇事第一反应是冲上去，优点是效率高，缺点是欠考虑。',1:'启动慢但后劲足，一旦下定决心很难被劝退，发火前会先隐忍很久。',2:'精力分散在多件事上，靠脑力和话语较量而非蛮力，需要防止三分钟热度。',3:'情绪化行动，被戳中软肋才会真正爆发，平常更倾向以退为进、迂回处理。',4:'做事讲排场、要面子，冲劲十足也要被看见，压力多来自「输不起」的心态。',5:'行动前先做计划和检查清单，效率高但容易因追求完美而拖延启动。',6:'不喜欢正面冲突，倾向谈判与折中，压抑的怒气容易转成拖延式抵抗。',7:'意志力极强，认定的事会不计代价拿下，一旦被激怒，报复心也强，宜找出口宣泄而非隐忍。',8:'行动直率、爱冒险，讨厌被规则束缚，冲劲很足但耐力容易随热情消退。',9:'行动有纪律、按部就班，愿意为长期目标忍耐一时，是团队里的定海神针。',10:'行动方式反传统，喜欢用新方法解决旧问题，压力下容易突然抽离或反叛。',11:'行动力受情绪影响大，动力时高时低，适合把目标和感受结合起来做事。'};
  const URANUS_I = {0:'这代人共有的觉醒主题落在开创与自我表达上，个人层面看落宫，最能感受到「打破常规、抢先出发」的冲动。',1:'世代对「安全与价值观」发起革新，个人层面看落宫，容易在钱、物质或自我价值上有突然的转折。',2:'世代重塑沟通与资讯方式，个人层面看落宫，那个领域的想法和表达方式最容易忽然「换频道」。',3:'世代重新定义家庭与归属感的形式，个人层面看落宫，安全感的来源在那里容易被打破重建。',4:'世代对「自我表现与权威」提出质疑，个人层面看落宫，那个领域最容易出现出人意料的自我突破。',5:'世代改写工作与健康的常规方式，个人层面看落宫，习惯与例行事务在那里最容易被打乱重组。',6:'世代重新协商关系与公平的定义，个人层面看落宫，那个领域的合作方式最容易被颠覆更新。',7:'世代对权力与深层控制发起变革，个人层面看落宫，那里最容易经历突然的转化与重生式转折。',8:'世代拓宽信念与世界观的边界，个人层面看落宫，那个领域最容易被新观念、新旅程忽然打开。',9:'世代冲击既有的权威与结构，个人层面看落宫，那个领域最容易经历体制性的突破与重建。',10:'天王星回到本位，这代人对自由、群体与未来格外敏感，个人特质会更直接体现在落宫领域。',11:'世代把灵性与集体潜意识议题推上台面，个人层面看落宫，那个领域最容易出现顿悟式的转折。'};
  const NEPTUNE_I = {0:'这代人共享的理想化浪潮落在个人冲劲与自我形象上，个人层面看落宫，那里容易理想化也容易感到迷雾重重。',1:'世代对物质与价值产生集体性的憧憬或幻灭，个人层面看落宫，钱财、资源相关的判断在那里最容易失焦。',2:'世代的信息环境真假交织，个人层面看落宫，沟通与学习在那个领域容易理想化，需多一分查证。',3:'世代对「家」与情感归属有集体乡愁式的向往，个人层面看落宫，情感依附在那里容易分不清现实与想象。',4:'世代的舞台感被放大，个人层面看落宫，自我表现在那个领域容易被浪漫化或过度理想化。',5:'世代对健康、服务与日常秩序有理想化或混乱交织的经验，个人层面看落宫，例行事务在那里最容易失序又渴望救赎。',6:'世代对关系与美的想象被拉高，个人层面看落宫，人际期待在那个领域容易脱离现实、需要落地检验。',7:'世代把亲密与失控的边界模糊化，个人层面看落宫，深层情感和信任议题在那里最容易理想化。',8:'世代的信仰与远方充满浪漫想象，个人层面看落宫，人生方向感在那个领域最容易亦真亦幻。',9:'世代对权威与成就的定义变得柔性、去中心化，个人层面看落宫，事业与责任在那里最容易理想主义化。',10:'世代把自由与集体愿景理想化，个人层面看落宫，人际与理想在那个领域容易既浪漫又飘忽。',11:'海王星回到本位，这代人对灵性、艺术与共情格外敏锐，个人特质会更直接体现在落宫领域，也更需要现实感的锚点。'};
  const PLUTO_I = {0:'这代人的集体蜕变主题与「争取自我主导权」有关，个人层面看落宫，那个领域最容易经历深刻的掌控与重生议题。',1:'世代经历价值观与资源分配的深层洗牌，个人层面看落宫，物质与自我价值在那里最容易被彻底重塑。',2:'世代的信息与思想被颠覆式重构，个人层面看落宫，认知与表达方式在那个领域最容易经历脱胎换骨。',3:'世代对家庭结构与集体安全感有深层次冲击，个人层面看落宫，情感根基在那里最容易被连根拔起再重建。',4:'世代重新定义权威与被看见的方式，个人层面看落宫，自我意志在那个领域最容易经历极端的掌控或失控体验。',5:'世代对劳动、身体与秩序的关系发生结构性转变，个人层面看落宫，日常与健康议题在那里最容易被迫彻底调整。',6:'世代重新协商权力在关系中的分配，个人层面看落宫，一对一关系在那个领域最容易涉及深层的控制与臣服议题。',7:'冥王星回到本位，这代人对生死、性与深层心理格外敏感，个人特质会更直接体现在落宫领域，转化的力量也最强。',8:'世代的信念系统经历彻底的解构与重建，个人层面看落宫，人生哲学与远方在那里最容易被连根重塑。',9:'世代目睹权威结构的崩解与重组，个人层面看落宫，事业与社会地位在那个领域最容易经历深度洗牌。',10:'世代推动集体与体制的彻底变革，个人层面看落宫，人际网络与理想在那里最容易牵涉权力更迭。',11:'世代的集体潜意识经历深层清洗，个人层面看落宫，隐秘与灵性议题在那个领域最容易触发深刻蜕变。'};
  function wNorm(deg){ deg%=360; if(deg<0)deg+=360; return deg; }
  function wSignIdx(lon){ return Math.floor(wNorm(lon)/30); }
  function wSignDeg(lon){ const n=wNorm(lon); const d=Math.floor(n%30); const m=Math.floor((n%30-d)*60); return String(d).padStart(2,'0')+'°'+String(m).padStart(2,'0')+"'"; }
  function wJd(y,m,d,hourUT){ if(m<=2){y-=1;m+=12;} const A=Math.floor(y/100); const B=2-A+Math.floor(A/4); return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5+hourUT/24; }
  function wPlanetLons(jd){
    const T=(jd-2451545.0)/36525;
    const L0=wNorm(280.46646+36000.76983*T+0.0003032*T*T);
    const M=wNorm(357.52911+35999.05029*T-0.0001537*T*T)*Math.PI/180;
    const C=(1.914602-0.004817*T)*Math.sin(M)+0.019993*Math.sin(2*M);
    const sun=wNorm(L0+C);
    const Mp=wNorm(134.9634+477198.8676*T)*Math.PI/180;
    const D=wNorm(297.8502+445267.1115*T)*Math.PI/180;
    const moon=wNorm(218.3165+481267.8813*T+6.289*Math.sin(Mp)+1.274*Math.sin(2*D-Mp)+0.658*Math.sin(2*D)+0.214*Math.sin(2*Mp));
    const mean=function(a0,a1){return wNorm(a0+a1*T);};
    return {
      sun:sun, moon:moon,
      mercury:wNorm(mean(252.2509,149472.6746)+23.4*Math.sin(mean(174.7948,149472.515)*Math.PI/180)),
      venus:wNorm(mean(181.9798,58517.8156)+0.78*Math.sin(mean(50.4161,58517.298)*Math.PI/180)),
      mars:wNorm(mean(355.433,19140.3023)+10.69*Math.sin(mean(19.373,19140.3)*Math.PI/180)),
      jupiter:wNorm(mean(34.3515,3034.9057)+5.55*Math.sin(mean(19.895,3034.69)*Math.PI/180)),
      saturn:wNorm(mean(50.0774,1222.1138)+6.41*Math.sin(mean(317.02,1222.11)*Math.PI/180)),
      uranus:mean(314.055,428.49), neptune:mean(304.349,218.486), pluto:mean(238.929,145.208)
    };
  }
  function wSidereal(jd,lng){ const T=(jd-2451545.0)/36525; return wNorm(280.46061837+360.98564736629*(jd-2451545.0)+0.000387933*T*T+lng); }
  function wAscendant(jd,lat,lng){
    if(lat==null||lng==null||!Number.isFinite(lat)||!Number.isFinite(lng)) return null;
    const ramc=wSidereal(jd,lng)*Math.PI/180;
    const eps=(23.4393-0.0000004*(jd-2451545))*Math.PI/180;
    const phi=lat*Math.PI/180;
    const y=-Math.cos(ramc);
    const x=Math.sin(ramc)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps);
    return wNorm(Math.atan2(y,x)*180/Math.PI);
  }
  function wHouseOf(lon,asc){ if(asc==null) return null; return ((wSignIdx(lon)-wSignIdx(asc)+12)%12)+1; }
  function wAspects(lons){
    const defs=[{name:'合相',angle:0,orb:8},{name:'六分相',angle:60,orb:6},{name:'刑相',angle:90,orb:7},{name:'拱相',angle:120,orb:8},{name:'对分相',angle:180,orb:8}];
    const keys=Object.keys(lons), out=[];
    for(let i=0;i<keys.length;i++) for(let j=i+1;j<keys.length;j++){
      let d=Math.abs(wNorm(lons[keys[i]])-wNorm(lons[keys[j]])); if(d>180)d=360-d;
      for(const def of defs){ const orb=Math.abs(d-def.angle); if(orb<=def.orb){ out.push({p1:keys[i],p2:keys[j],name:def.name,orb}); break; } }
    }
    out.sort((a,b)=>a.orb-b.orb); return out;
  }
  function wTzOffsetHours(tzStr,y,m,d){
    if(!tzStr) return 8;
    const s=tzStr.trim();
    if(/Shanghai|Beijing|CST|北京|沈阳|Chongqing/i.test(s)) return 8;
    if(/Toronto|New_York|Detroit|EDT|EST/i.test(s)){ const month=new Date(Date.UTC(y,m-1,d)).getUTCMonth(); return (month>2&&month<10)?-4:-5; }
    if(/UTC|GMT/i.test(s)) return 0;
    if(/Tokyo/i.test(s)) return 9;
    const m1=s.match(/([+-]?\d+(?:\.\d+)?)/); return m1?parseFloat(m1[1]):8;
  }
  function computeNatalChart(input){
    const {year,month,day,hour,minute,lat,lng,tz}=input;
    const off=wTzOffsetHours(tz,year,month,day);
    const jd=wJd(year,month,day,hour+minute/60-off);
    const lons=wPlanetLons(jd);
    const asc=wAscendant(jd,lat,lng);
    const planets={};
    W_PLANETS.forEach(p=>{
      const lon=lons[p.key], si=wSignIdx(lon);
      planets[p.key]={cn:p.cn,glyph:p.glyph,lon,signIdx:si,sign:W_SIGN[si],deg:wSignDeg(lon),house:wHouseOf(lon,asc),elem:W_ELEM[si],qual:W_QUAL[si]};
    });
    const ascInfo=asc!=null?{lon:asc,signIdx:wSignIdx(asc),sign:W_SIGN[wSignIdx(asc)],deg:wSignDeg(asc)}:null;
    const elemCount={火:0,土:0,风:0,水:0}, qualCount={基本:0,固定:0,变动:0};
    Object.values(planets).forEach(p=>{ elemCount[p.elem]++; qualCount[p.qual]++; });
    if(ascInfo){ elemCount[W_ELEM[ascInfo.signIdx]]++; qualCount[W_QUAL[ascInfo.signIdx]]++; }
    return {input,planets,asc:ascInfo,aspects:wAspects(lons),elemCount,qualCount,houseSystem:asc!=null?'整宫制 Whole Sign':'未排宫（缺坐标）'};
  }
  
  function renderNatalChartViz(r){
    const host = document.getElementById('westernChartViz');
    if (!host || !r || !r.planets) return;
    const W = 320, H = 320, cx = 160, cy = 160;
    const signColors = ['#e07050','#c9a227','#6bb3c9','#5a9e8f','#e07050','#c9a227','#6bb3c9','#5a9e8f','#e07050','#c9a227','#6bb3c9','#5a9e8f'];
    const signShort = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
    const glyphSign = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
    const planetColor = {
      sun:'#d4a017', moon:'#c0c8d0', mercury:'#8a9a5b', venus:'#e8a0bf',
      mars:'#c04030', jupiter:'#c47b2c', saturn:'#7a6b4a',
      uranus:'#4a9aaa', neptune:'#5a6fd4', pluto:'#6a4060'
    };
    const ascLon = r.asc ? r.asc.lon : 0;
    function polar(lon, radius){
      // ASC（或0°白羊）放在左侧，逆时针
      const deg = (lon - ascLon + 360) % 360;
      const rad = (180 - deg) * Math.PI / 180;
      return [cx + radius * Math.cos(rad), cy - radius * Math.sin(rad)];
    }
    let svg = '';
    svg += '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="本命星盘图">';
    // outer disc
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="148" fill="#fffdf6" stroke="#b8892f" stroke-width="2"/>';
    // sign wedges
    for (let i=0;i<12;i++){
      const a0 = (i*30);
      const a1 = ((i+1)*30);
      const p0 = polar(ascLon + a0, 148);
      const p1 = polar(ascLon + a1, 148);
      const p0i = polar(ascLon + a0, 118);
      const p1i = polar(ascLon + a1, 118);
      // approximate wedge with path (outer arc via lines for simplicity)
      const mid = polar(ascLon + a0 + 15, 133);
      svg += '<path d="M'+cx+','+cy+' L'+p0[0].toFixed(1)+','+p0[1].toFixed(1)+' A148,148 0 0,1 '+p1[0].toFixed(1)+','+p1[1].toFixed(1)+' Z" fill="'+signColors[i]+'" fill-opacity="0.14" stroke="rgba(184,137,47,0.35)" stroke-width="0.6"/>';
      svg += '<text x="'+mid[0].toFixed(1)+'" y="'+mid[1].toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#5a4526">'+glyphSign[i]+'</text>';
    }
    // inner rings
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="118" fill="none" stroke="#c9a227" stroke-width="1.2" stroke-opacity="0.7"/>';
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="78" fill="#faf6ea" stroke="#b8892f" stroke-width="1" stroke-opacity="0.5"/>';
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="28" fill="#f3e8cf" stroke="#a8791f" stroke-width="1.2"/>';
    // house lines (whole sign from ASC)
    if (r.asc){
      for (let h=0;h<12;h++){
        const p = polar(ascLon + h*30, 118);
        svg += '<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'" stroke="rgba(90,70,30,0.2)" stroke-width="0.8"/>';
        const hl = polar(ascLon + h*30 + 15, 98);
        svg += '<text x="'+hl[0].toFixed(1)+'" y="'+hl[1].toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#8a6f3f">'+(h+1)+'</text>';
      }
      // ASC marker
      const ascPt = polar(ascLon, 148);
      svg += '<polygon points="'+(ascPt[0]-6).toFixed(1)+','+ascPt[1].toFixed(1)+' '+(ascPt[0]+2).toFixed(1)+','+(ascPt[1]-5).toFixed(1)+' '+(ascPt[0]+2).toFixed(1)+','+(ascPt[1]+5).toFixed(1)+'" fill="#a8453c"/>';
      svg += '<text x="18" y="24" font-size="10" fill="#a8453c" font-weight="700">ASC '+r.asc.sign+'</text>';
    } else {
      svg += '<text x="16" y="22" font-size="9" fill="#8a6f3f">无出生地后显示上升与宫位</text>';
    }
    // aspects (inner)
    const aspectStroke = {'合相':'#c9a227','六分相':'#2f8f5a','刑相':'#a8453c','拱相':'#2f8f5a','对分相':'#a8453c'};
    (r.aspects||[]).slice(0,14).forEach(function(a){
      const p1 = r.planets[a.p1], p2 = r.planets[a.p2];
      if (!p1 || !p2) return;
      const xy1 = polar(p1.lon, 78);
      const xy2 = polar(p2.lon, 78);
      const col = aspectStroke[a.name] || '#8a6f3f';
      const op = a.name==='合相'||a.name==='拱相'||a.name==='六分相' ? 0.35 : 0.4;
      svg += '<line x1="'+xy1[0].toFixed(1)+'" y1="'+xy1[1].toFixed(1)+'" x2="'+xy2[0].toFixed(1)+'" y2="'+xy2[1].toFixed(1)+'" stroke="'+col+'" stroke-width="1" stroke-opacity="'+op+'"/>';
    });
    // planets
    const keys = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
    // stack offsets if close
    const placed = [];
    keys.forEach(function(k){
      const p = r.planets[k];
      if (!p) return;
      let rad = 100;
      let [x,y] = polar(p.lon, rad);
      // nudge if overlapping
      for (let n=0;n<6;n++){
        let hit = false;
        for (const prev of placed){
          const dx=x-prev[0], dy=y-prev[1];
          if (dx*dx+dy*dy < 14*14){ hit = true; break; }
        }
        if (!hit) break;
        rad -= 7;
        [x,y] = polar(p.lon, rad);
      }
      placed.push([x,y]);
      const col = planetColor[k] || '#5a4526';
      svg += '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="9" fill="#fffdf6" stroke="'+col+'" stroke-width="1.5"/>';
      svg += '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" text-anchor="middle" dominant-baseline="central" font-size="11" fill="'+col+'">'+p.glyph+'</text>';
    });
    // center label
    const sun = r.planets.sun;
    svg += '<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" font-size="10" fill="#6b4e10" font-weight="700">'+(sun?sun.sign:'')+'</text>';
    svg += '<text x="'+cx+'" y="'+(cy+10)+'" text-anchor="middle" font-size="8" fill="#8a6f3f">本命盘</text>';
    svg += '</svg>';

    // element bars
    const elems = ['火','土','风','水'];
    const elemCol = {火:'#e07050',土:'#c9a227',风:'#6bb3c9',水:'#5a9e8f'};
    const total = elems.reduce(function(s,e){ return s+(r.elemCount[e]||0); },0) || 1;
    let bars = '<div class="viz-bars">';
    elems.forEach(function(e){
      const n = r.elemCount[e]||0;
      const pct = Math.round(n/total*100);
      const h = Math.max(4, Math.round(52 * n / Math.max(4, Math.max.apply(null, elems.map(function(x){return r.elemCount[x]||0;})))));
      bars += '<div class="viz-bar-col"><div class="viz-bar-track"><div class="viz-bar-fill" style="height:'+h+'px;background:'+elemCol[e]+'"></div></div>'+e+' '+n+'</div>';
    });
    bars += '</div>';

    // planet legend
    let leg = '<div class="viz-legend">';
    keys.forEach(function(k){
      const p = r.planets[k];
      if (!p) return;
      leg += '<span><i class="viz-dot" style="background:'+(planetColor[k]||'#999')+'"></i>'+p.glyph+p.cn+' '+p.sign+'</span>';
    });
    leg += '</div>';

    const mode = r.asc ? ('上升'+r.asc.sign+' · 整宫制') : '热带黄道 · 未排宫';
    host.innerHTML = '<div class="viz-caption">星盘数据可视化 · '+mode+'</div>' + svg + bars + leg;
  }
  
  function renderWesternReport(r){
    const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s));
    const sun = r.planets.sun, moon = r.planets.moon;
    const mercury = r.planets.mercury, venus = r.planets.venus, mars = r.planets.mars;
    const jupiter = r.planets.jupiter, saturn = r.planets.saturn;
    const uranus = r.planets.uranus, neptune = r.planets.neptune, pluto = r.planets.pluto;
    const { year, month, day, hour, minute, lat, lng, tz } = r.input;
    const houseTheme = {1:'自我与开创',2:'金钱与价值',3:'学习与沟通',4:'家庭与根基',5:'恋爱与创造',6:'工作与健康',7:'伴侣与合作',8:'共享与转化',9:'信念与远行',10:'事业与声望',11:'社群与愿景',12:'潜意识与休整'};
    const signPersona = {
      0:{tag:'行动派开创者', chat:'直球、节奏快'},
      1:{tag:'稳健享乐派', chat:'务实、重感受'},
      2:{tag:'好奇沟通者', chat:'话题多、反应快'},
      3:{tag:'情感守护者', chat:'温柔、记挂人'},
      4:{tag:'舞台中心者', chat:'有感染力'},
      5:{tag:'细致分析者', chat:'讲逻辑、重细节'},
      6:{tag:'平衡协调者', chat:'会圆场、重对等'},
      7:{tag:'深刻洞察者', chat:'话少但有分量'},
      8:{tag:'自由探索者', chat:'幽默、大格局'},
      9:{tag:'目标建筑师', chat:'克制、重计划'},
      10:{tag:'独立创新者', chat:'观点新、需空间'},
      11:{tag:'共感梦想家', chat:'柔软、易共情'}
    };
    const elemTone = {
      火:'热情、敢冲，适合把冲劲切成可完成的小目标，避免虎头蛇尾。',
      土:'务实能守，适合长期积累与落地执行，小心别太固执、错过变化的信号。',
      风:'脑子活、善沟通，长于连接信息与人脉，注意想法多、落地少。',
      水:'感受力强，共情能力突出，宜管好情绪边界，别过度卷入他人的课题。'
    };
    const QUAL_DESC = {
      基本:'开创力强，擅长起头、抢占先机，是团队里第一个举手的人，但容易虎头蛇尾，需要有人或制度帮忙盯后半程。',
      固定:'稳定持久，认定的事很难被动摇，擅长把事情做深做透，但也要提防过度固执、拒绝调整。',
      变动:'适应力强，善于随机应变、切换赛道，缺点是容易见异思迁，缺乏把事情收尾的耐心。'
    };
    const ELEM_MISSING = {
      火:'盘中火象缺席：行动力不是本能反应，需要刻意给自己设短期截止日来「点火」，否则容易一直停在计划阶段。',
      土:'盘中土象缺席：落地执行是相对弱项，想法常常很好但难持续推进，建议借助清单、伙伴或制度把创意变成现实。',
      风:'盘中风象缺席：抽离、客观分析的视角较弱，遇事容易先讲情绪，可练习「先说事实、再说感受」的表达顺序。',
      水:'盘中水象缺席：对情绪信号不够敏感，容易忽略自己和他人的感受，建议刻意练习共情与倾听。'
    };
    let topElem = '火', topN = -1;
    Object.keys(r.elemCount).forEach(e => { if (r.elemCount[e] > topN) { topN = r.elemCount[e]; topElem = e; } });
    let topQual = '基本', topQn = -1;
    Object.keys(r.qualCount).forEach(q => { if (r.qualCount[q] > topQn) { topQn = r.qualCount[q]; topQual = q; } });
    const fireN = r.elemCount['火']||0, waterN = r.elemCount['水']||0, airN = r.elemCount['风']||0, earthN = r.elemCount['土']||0;
    const et = Object.values(r.elemCount).reduce((a,b)=>a+b,0)||1;
    const qt = Object.values(r.qualCount).reduce((a,b)=>a+b,0)||1;
    const softN = r.aspects.filter(a => a.name==='拱相'||a.name==='六分相'||a.name==='合相').length;
    const hardN = r.aspects.filter(a => a.name==='刑相'||a.name==='对分相').length;
    let happy = 62 + Math.min(12, softN*2) - Math.min(14, hardN*2);
    if (sun.elem === moon.elem) happy += 6;
    if (waterN >= 2 && earthN >= 1) happy += 4;
    if (fireN >= 3 && earthN === 0) happy -= 4;
    if (r.asc && (r.asc.signIdx === sun.signIdx || r.asc.signIdx === moon.signIdx)) happy += 3;
    happy = Math.max(35, Math.min(92, Math.round(happy)));
    const happyStars = Math.max(1, Math.min(5, Math.round(happy/20)));
    const happyBar = '★'.repeat(happyStars) + '☆'.repeat(5 - happyStars);
    const happyLevel = happy>=80?'很高':happy>=70?'偏高':happy>=55?'中等':'需主动经营';
    let temperStars = fireN>=3?4:fireN>=2?3:2;
    if (earthN>=3) temperStars = Math.min(temperStars, 2);
    if (waterN>=3) temperStars = Math.max(temperStars, 3);
    const temperBar = '★'.repeat(temperStars) + '☆'.repeat(5-temperStars);
    let mj = 3.0;
    if (jupiter.house===5||jupiter.house===9) mj += 0.6;
    if (fireN+airN>=4) mj += 0.4;
    if (earthN>=3) mj += 0.2;
    if (saturn.house===5) mj -= 0.5;
    if (hardN>=4) mj -= 0.3;
    mj = Math.max(1.5, Math.min(4.8, mj));
    const mjStars = Math.round(mj);
    const mjBar = '★'.repeat(mjStars) + '☆'.repeat(5-mjStars);
    const mjStyle = fireN>=3?'豪放搏进型':earthN>=3?'稳健防守型':airN>=3?'观察算牌型':waterN>=3?'凭感觉流型':'均衡型';
    const sp = signPersona[sun.signIdx], mp = signPersona[moon.signIdx];
    const ap = r.asc ? signPersona[r.asc.signIdx] : null;
    const heroTitle = sp.tag + ' · ' + signOf(sun) + (r.asc ? '上升' + signOf(r.asc) : '');
    const heroSub = signOf(moon) + '月亮托底' + (sun.elem===moon.elem ? '，内外较同调' : '，表里有反差') + ' · 主导' + topElem + '象';
    function acc(id, title, body, open) {
      return '<div class="w-acc'+(open?' open':'')+'" id="'+id+'">' +
        '<div class="w-acc-hd" onclick="toggleWesternAcc(\''+id+'\')"><span>'+title+'</span><span class="w-acc-ico">▶</span></div>' +
        '<div class="w-acc-bd">'+body+'</div></div>';
    }
    function lines(arr){ return arr.map(t => '<div class="w-line">'+t+'</div>').join(''); }
    function hSign(offset){ return r.asc ? signName((r.asc.signIdx + offset) % 12) : null; }
    // 一、核心三轴 · 太阳·月亮·上升
    const axisBody = lines([
      '<span class="w-chip">☉ 太阳</span> '+signOf(sun)+' '+sun.deg+(sun.house?' · '+W_HOUSE_CN[sun.house-1]:''),
      '→ '+SUN_I[sun.signIdx],
      '<span class="w-chip">☽ 月亮</span> '+signOf(moon)+' '+moon.deg+(moon.house?' · '+W_HOUSE_CN[moon.house-1]:''),
      '→ '+MOON_I[moon.signIdx],
      r.asc ? ('<span class="w-chip">↑ 上升</span> '+signOf(r.asc)+' '+r.asc.deg+'<br>→ '+ASC_I[r.asc.signIdx]) : '↑ 上升：填写出生地后可计算',
      sun.signIdx!==moon.signIdx ? '太阳与月亮不同星座：外人眼中的你，和独处时的你可能有明显反差，这是正常的「表里两面」，不是矛盾。' : '太阳与月亮同星座：表里高度一致，情绪与目标常同步，决策也更干脆利落。',
      (r.asc && r.asc.signIdx===sun.signIdx) ? '上升与太阳同星座：第一印象就是本色出演，辨识度高。' : ((r.asc && r.asc.signIdx===moon.signIdx) ? '上升与月亮同星座：初次见面就能感受到你的情绪底色，亲和力强。' : '')
    ].filter(Boolean));
    // 二、元素与模式 · 四象结构解读
    const elemLines = ['火','土','风','水'].map(e => {
      const n = r.elemCount[e]||0, pct = Math.round(n/et*100);
      return e+'象 '+n+'（'+pct+'%）'+(e===topElem?'　★主导':'')+' — '+elemTone[e];
    });
    const qualLines = ['基本','固定','变动'].map(q => {
      const n = r.qualCount[q]||0, pct = Math.round(n/qt*100);
      return q+' '+n+'（'+pct+'%）'+(q===topQual?'　★主导':'')+' — '+QUAL_DESC[q];
    });
    const missingElem = ['火','土','风','水'].find(e => (r.elemCount[e]||0)===0);
    const elemBody =
      '<div class="w-sub">四象力量分布</div>' + lines(elemLines) +
      '<div class="w-sub">三种行动模式</div>' + lines(qualLines) +
      lines(['脾气起伏：'+temperBar, missingElem ? ELEM_MISSING[missingElem] : '四象皆有分布：性格弹性较好，不容易在某一类课题上长期卡住。'].filter(Boolean));
    // 三、命运主线 · 人生课题与总基调
    const coreLine = '人生底层逻辑：用「'+sp.tag+'」去争取想要的东西，用「'+mp.tag+'」的方式安顿内心'+(ap?'，再借「'+ap.tag+'」的姿态走向世界。':'。');
    const pathLine = hardN>softN
      ? '整体阻力：挑战相位偏多（'+hardN+'组），人生更像「闯关升级」，每个阶段都有明确关卡，但闯过去往往就是真本事。'
      : (softN>hardN
        ? '整体阻力：和谐相位偏多（'+softN+'组），人生更像「顺风张帆」，天赋帮你省了不少力气，风险是容易因为太顺而怠惰、不逼自己成长。'
        : '整体阻力：软硬相位大致均衡，人生有阻力也有助力，节奏相对平稳，进退全看自己怎么选。');
    const syncLine = sun.elem===moon.elem
      ? '太阳与月亮同为'+sun.elem+'象：理智想要的和内心需要的方向一致，一旦下定决心就能迅速转化为行动。'
      : '太阳（'+sun.elem+'象）与月亮（'+moon.elem+'象）分属不同元素：理智想要的和内心需要的不完全同步，先说服自己的情感面，事情才走得远、走得稳。';
    const fateBody = lines([coreLine, pathLine, syncLine]);
    // 四、事业与志业 · 天赋定位与发展路径
    const mc10 = hSign(9);
    const careerBody = lines([
      '太阳落在「'+(sun.house?houseTheme[sun.house]:'（需出生地）')+'」相关领域时，最容易感到「这就是我该做的事」。',
      mc10 ? '事业宫（第10宫）落在'+mc10+'：这是外界眼中你职业形象的底色，找工作、立人设时可以参考。' : '补全出生地后，可看到事业宫（第10宫）星座，让职业形象定位更精准。',
      '土星在'+signOf(saturn)+(saturn.house?'落第'+saturn.house+'宫':'')+'：现实会在这个领域反复考验你，熬过去往往就是你中年后最扎实的专业壁垒。',
      '木星在'+signOf(jupiter)+(jupiter.house?'落第'+jupiter.house+'宫':'')+'：这是学习、贵人与机会容易靠近的方向，值得主动伸手争取。',
      '实操建议：把太阳特质当职业标签对外介绍，把土星领域当长期深耕的根据地，把木星领域当找机会、找老师的方向。'
    ]);
    // 五、财富与资源 · 价值取向与聚财方式
    const h2 = hSign(1), h8 = hSign(7);
    const moneyBody = lines([
      '金星在'+signOf(venus)+'：这是你真正愿意为之付钱、也容易因此被钱吸引的价值偏好。',
      h2 ? '财帛宫（第2宫）落在'+h2+'：反映你赚钱与花钱的本能风格。' : '补全出生地后，可看到财帛宫（第2宫）星座。',
      h8 ? '第8宫落在'+h8+'：涉及合作资金、债务与他人资源，是「共同财务」课题的所在。' : '',
      (jupiter.house===2||jupiter.house===8) ? '木星恰好触及财务相关宫位：扩张财运的窗口值得抓，但忌贪多嚼不烂、赌性过重。' : '财运节奏偏平稳积累型，靠技能与信用比靠运气更稳。',
      earthN>=3 ? '土象力量偏强：比起追逐高回报，你更倾向把钱换成看得见、摸得着的资产，守成能力强。' : (fireN>=3 && earthN===0 ? '火象强而土象缺席：赚钱冲劲十足，但落袋为安的耐心不够，宜找个务实的搭档或工具帮忙管钱。' : '')
    ].filter(Boolean));
    // 六、亲密关系 · 相处模式
    const h7 = hSign(6);
    const loveBody = lines([
      '情感安全感的根基已由月亮'+signOf(moon)+'决定（详见「一、核心三轴」），这里聚焦你在关系里的实际互动方式。',
      h7 ? '伴侣宫（第7宫）落在'+h7+'：暗示你容易被什么样的人吸引，也容易在关系里扮演什么角色。' : '补全出生地后，可看到伴侣宫（第7宫）星座，进一步定位择偶倾向。',
      r.asc ? '上升'+signOf(r.asc)+'也会影响你留给对方的第一印象（详见「一」）。' : '',
      '火星'+signOf(mars)+'决定你追求与争吵时的动作，完整解读见「九、行动张力」。',
      waterN>=3 ? '水象偏多：容易共情、也容易在关系中过度牺牲，宜练习设定情感边界。' : (fireN>=3 ? '火象偏多：主动直接、追求效率，记得给关系留一点耐心和缓冲。' : (earthN>=3 ? '土象偏多：重视承诺与实际付出，表达爱的方式偏行动派而非甜言蜜语。' : '感情节奏建议先安顿好月亮的安全感，再展现金星的魅力。'))
    ].filter(Boolean));
    // 七、沟通思维 · 学习与表达风格
    const h3 = hSign(2);
    const mercuryBody = lines([
      '水星在'+signOf(mercury)+'：'+MERCURY_I[mercury.signIdx],
      mercury.house ? '水星落第'+mercury.house+'宫：沟通与学习的课题会集中在「'+houseTheme[mercury.house]+'」相关的场合。' : '',
      h3 ? '沟通宫（第3宫）落在'+h3+'：这是你日常交流、社交圈氛围的底色。' : '补全出生地后，可看到沟通宫（第3宫）星座。'
    ].filter(Boolean));
    // 八、魅力吸引 · 审美偏好与情感连结
    const h5 = hSign(4);
    const venusBody = lines([
      '金星在'+signOf(venus)+'：'+VENUS_I[venus.signIdx],
      venus.house ? '金星落第'+venus.house+'宫：审美与喜好会集中体现在「'+houseTheme[venus.house]+'」相关的领域。' : '',
      h5 ? '第5宫（恋爱/创造/娱乐）落在'+h5+'：这是你享受生活、放松身心的偏好方式。' : ''
    ].filter(Boolean));
    // 九、行动张力 · 欲望驱动与冲突反应
    const marsBody = lines([
      '火星在'+signOf(mars)+'：'+MARS_I[mars.signIdx],
      mars.house ? '火星落第'+mars.house+'宫：你的行动力和竞争心，会最先在「'+houseTheme[mars.house]+'」相关领域被点燃。' : '',
      '把水星（怎么想）、金星（喜欢什么）、火星（怎么做）连起来看，就是你从想法到行动的完整链路。'
    ].filter(Boolean));
    // 十、相位网络 · 天赋顺风与功课清单
    const nm = Object.fromEntries(W_PLANETS.map(x => [x.key, x.cn]));
    const aspectMeaning = {
      '合相': '能量融合、同一主题被放大，天赋与执念常一体两面。',
      '六分相': '轻松的机会与助力，主动伸手时更易接通。',
      '刑相': '摩擦与压力，逼你做选择、练能力，短期不舒服、长期长本事。',
      '拱相': '自然流畅的才能通道，做起来相对顺，也容易吃老本。',
      '对分相': '拉锯与平衡题，人生常在两极之间找中线。'
    };
    const topAsp = r.aspects.slice(0, 6);
    let aspectBody = '';
    if (!topAsp.length) {
      aspectBody = '<div class="w-line">本盘主要相位较少或较宽，性格弹性大，外在事件驱动会更明显。</div>';
    } else {
      aspectBody = '<div class="w-sub">最值得盯的相位（按紧密度）</div>';
      topAsp.forEach(a => {
        aspectBody += '<div class="w-line"><span class="w-chip">'+(nm[a.p1]||a.p1)+' '+a.name+' '+(nm[a.p2]||a.p2)+'</span> 容许 '+a.orb.toFixed(1)+'°</div>';
        aspectBody += '<div class="w-sub">'+(aspectMeaning[a.name]||'')+' 这两颗星的主题会反复在生活里「绑在一起」出现。</div>';
      });
      aspectBody += '<div class="w-line">读法提示：合/拱/六分偏顺风；刑/对偏功课。顺风要主动用，功课要拆小步做，不要硬刚。</div>';
    }
    // 十一、人生舞台 · 十二宫生活地图
    let houseBody = '';
    if (r.asc) {
      houseBody = '<div class="w-sub">整宫制：上升'+signOf(r.asc)+'为第1宫，十二个人生舞台一览</div>';
      for (let h=1; h<=12; h++) {
        houseBody += '<div class="w-line"><span class="w-chip">第'+h+'宫</span> '+hSign(h-1)+' · '+houseTheme[h]+'</div>';
      }
      houseBody += '<div class="w-sub">重点参考：1/10宫看形象与事业方向，7宫看一对一关系，2/8宫看钱与深层联结，5宫看恋爱与创造欲。</div>';
    } else {
      houseBody = '<div class="w-line">填写出生地经纬度后，可生成上升与十二宫生活舞台解读。</div>';
    }
    // 十二、世代印记与成长功课 · 外行星与土星整合
    const growthBody = lines([
      '土星在'+signOf(saturn)+(saturn.house?'落第'+saturn.house+'宫':'')+'：这是你最容易感到「压力大、成长也最扎实」的领域，心理功课多围绕「够不够格、值不值得」展开，扎实面对比逃避更省力。',
      '天王星在'+signOf(uranus)+(uranus.house?'落第'+uranus.house+'宫':'')+'：'+URANUS_I[uranus.signIdx],
      '海王星在'+signOf(neptune)+(neptune.house?'落第'+neptune.house+'宫':'')+'：'+NEPTUNE_I[neptune.signIdx],
      '冥王星在'+signOf(pluto)+(pluto.house?'落第'+pluto.house+'宫':'')+'：'+PLUTO_I[pluto.signIdx],
      '提示：天王/海王/冥王星移动极慢，星座本身是「整代人」共有的印记，真正个人化的是它们所落的宫位——那才是这份世代议题在你身上展开的具体舞台。'
    ]);
    // 附：日常体感 · 幸福感与手气（趣味参考，非严肃分析）
    const vibeBody = lines([
      '幸福倾向：'+happy+' / 100　'+happyBar+'　（'+happyLevel+'）',
      '算法参考：和谐相位、日月是否同调、水象感受力与土象落地是否兼顾。',
      '麻将手气：'+mjBar+'（约 '+mj.toFixed(1)+'/5）　牌风：'+mjStyle,
      '木星与火风偏多时临场更「活」；土星压娱乐宫则宜稳打少贪。',
      '这两项都是盘面「体感倾向」，不是宿命——睡眠、关系与牌桌选择影响更大。'
    ]);
    // 附：专业盘面 · 行星·宫位·数据
    let pro = '<div class="w-sub">出生数据</div>'+lines([
      year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')+' '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0'),
      '地点：'+(lat!=null?lat.toFixed(4)+'°, '+lng.toFixed(4)+'°':'未填')+'　时区：'+esc(tz||'默认 UTC+8'),
      '宫位：'+esc(r.houseSystem)+' · 热带黄道'
    ]);
    pro += '<div class="w-sub">行星</div>';
    W_PLANETS.forEach(meta => {
      const x = r.planets[meta.key];
      pro += '<div class="w-line">'+x.glyph+' '+x.cn+'：'+signOf(x)+' '+x.deg+(x.house?' · '+W_HOUSE_CN[x.house-1]:'')+'</div>';
    });
    if (r.asc) {
      pro += '<div class="w-sub">十二宫（整宫制）</div>';
      for (let i=0;i<12;i++) pro += '<div class="w-line">'+W_HOUSE_CN[i]+'：'+hSign(i)+'</div>';
    }
    pro += '<div class="w-sub">主要相位</div>';
    if (!r.aspects.length) pro += '<div class="w-line">无明显主要相位</div>';
    r.aspects.slice(0,16).forEach(a => {
      pro += '<div class="w-line">'+(nm[a.p1]||a.p1)+' '+a.name+' '+(nm[a.p2]||a.p2)+'（'+a.orb.toFixed(1)+'°）</div>';
    });
    pro += '<div class="w-sub">元素 / 模式</div>';
    ['火','土','风','水'].forEach(e => { pro += '<div class="w-line">'+e+'象 '+(r.elemCount[e]||0)+'（'+Math.round((r.elemCount[e]||0)/et*100)+'%）</div>'; });
    ['基本','固定','变动'].forEach(q => { pro += '<div class="w-line">'+q+' '+(r.qualCount[q]||0)+'（'+Math.round((r.qualCount[q]||0)/qt*100)+'%）</div>'; });
    return (
      '<div class="w-hero"><div class="w-hero-title">'+heroTitle+'</div><div class="w-hero-sub">'+heroSub+'</div></div>' +
      acc('wAcc01', '一、核心三轴 · 太阳·月亮·上升', axisBody, false) +
      acc('wAcc02', '二、元素与模式 · 四象结构解读', elemBody, false) +
      acc('wAcc03', '三、命运主线 · 人生课题与总基调', fateBody, false) +
      acc('wAcc04', '四、事业与志业 · 天赋定位与发展路径', careerBody, false) +
      acc('wAcc05', '五、财富与资源 · 价值取向与聚财方式', moneyBody, false) +
      acc('wAcc06', '六、亲密关系 · 爱的语言与相处模式', loveBody, false) +
      acc('wAcc07', '七、沟通思维 · 学习与表达风格', mercuryBody, false) +
      acc('wAcc08', '八、魅力吸引 · 审美偏好与情感连结', venusBody, false) +
      acc('wAcc09', '九、行动张力 · 欲望驱动与冲突反应', marsBody, false) +
      acc('wAcc10', '十、相位网络 · 天赋顺风与功课清单', aspectBody, false) +
      acc('wAcc11', '十一、人生舞台 · 十二宫生活地图', houseBody, false) +
      acc('wAcc12', '十二、世代印记与成长功课 · 外行星与土星整合', growthBody, false) +
      acc('wAccVibe', '附一、日常体感 · 幸福感与手气', vibeBody, false) +
      acc('wAccPro', '附二、专业盘面 · 行星·宫位·数据', pro, false) +
      '<div class="w-note">阅读顺序建议：一 → 三 → 四~九（按兴趣）→ 十~十二。全部默认收起，点标题展开/收起。补全出生时间与地点，上升与宫位解读会更准确。</div>'
    );
  }
  function toggleWesternAcc(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
  }
  const WESTERN_DICT = [
    { k: '太阳 ☉', d: '核心自我、生命力与人生主轴。太阳星座常被称作「你的星座」，代表你想成为怎样的人。' },
    { k: '月亮 ☽', d: '情绪、安全感与本能反应。决定你私下如何充电、如何需要被对待。' },
    { k: '上升（ASC）', d: '出生地地平线东升点。第一印象、身体气质与对外界面，也是宫位系统的起点。' },
    { k: '金星 ♀', d: '审美、喜爱、金钱偏好与示爱方式。看你被什么吸引、愿意为什么付出。' },
    { k: '火星 ♂', d: '行动力、欲望与冲突方式。追求目标与吵架时的「动作脚本」。' },
    { k: '木星 ♃', d: '扩展、幸运、信仰与贵人。木星所在领域较易成长、遇见机会。' },
    { k: '土星 ♄', d: '责任、限制、时间与成就。土星所在领域要下苦功，也往往越老越稳。' },
    { k: '宫位', d: '人生十二个生活领域。例如第10宫偏事业声望，第7宫偏伴侣合作。本程序采用整宫制。' },
    { k: '整宫制', d: '以上升星座整座为第1宫、依次类推的宫位系统。简洁稳定，适合快速解读人生领域。' },
    { k: '相位', d: '行星之间的角度关系。合/拱/六分偏和谐，刑/对偏挑战。容许度是「差几度仍算数」。' },
    { k: '元素', d: '火土风水。火=行动热情，土=务实稳定，风=思维沟通，水=情感直觉。' },
    { k: '模式', d: '基本/固定/变动。基本爱开创，固定能坚持，变动善调整。' },
    { k: '热带黄道', d: '西方主流占星使用的季节黄道，与节气相关，与出生年份的「星座日期」表一致。' },
    { k: '幸福指数', d: '根据相位、日月同调、元素平衡等做的倾向评分，反映盘面气质，不是命运判决。' },
    { k: '麻将手气', d: '趣味项：综合木星与元素活跃度的娱乐指数，请勿用于真金白银决策。' }
  ];
  function toggleWesternDict() {
    const report = document.getElementById('westernReport');
    const dict = document.getElementById('westernDictBox');
    if (!report || !dict) return;
    const showing = dict.style.display === 'block';
    if (showing) {
      dict.style.display = 'none';
      report.style.display = '';
    } else {
      dict.innerHTML =
        '<div class="w-hero"><div class="w-hero-title">星盘小词典</div><div class="w-hero-sub">点「返回分析」可回到你的星盘报告</div></div>' +
        WESTERN_DICT.map(item =>
          '<div class="w-dict-item"><strong>'+item.k+'</strong><p>'+item.d+'</p></div>'
        ).join('') +
        '<div style="text-align:center;margin-top:10px;"><button class="mbti-reset" type="button" onclick="toggleWesternDict()">返回分析</button></div>';
      dict.style.display = 'block';
      report.style.display = 'none';
    }
  }
  let westernYearVal=1990, westernMonthVal=7, westernDayVal=15, westernHourVal=12, westernMinuteVal=0;
    function initWesternWheels(){
    if(typeof buildWheel!=='function') return;
    const state = {
      get year(){return westernYearVal;}, set year(v){westernYearVal=v;},
      get month(){return westernMonthVal;}, set month(v){westernMonthVal=v;},
      get day(){return westernDayVal;}, set day(v){westernDayVal=v;},
      get hour(){return westernHourVal;}, set hour(v){westernHourVal=v;},
      get minute(){return westernMinuteVal;}, set minute(v){westernMinuteVal=v;}
    };
    initDateTimeWheelSet({
      state,
      ids:{
        yearWheel:'westernYearWheel', monthWheel:'westernMonthWheel', dayWheel:'westernDayWheel',
        hourWheel:'westernHourWheel', minuteWheel:'westernMinuteWheel',
        year:'westernYear', month:'westernMonth', day:'westernDay',
        hour:'westernHour', minute:'westernMinute'
      },
      onChange: () => saveSharedBirth({
        year:westernYearVal, month:westernMonthVal, day:westernDayVal,
        hour:westernHourVal, minute:westernMinuteVal
      })
    });
  }
  // 沈阳 / 多伦多 地点预设（八字 + 西方星盘共用数据）
  const CITY_PRESETS = {
    shenyang: { name: '沈阳', lat: 41.8057, lng: 123.4315, tz: 'Asia/Shanghai', tzOffset: 8 },
    toronto:  { name: '多伦多', lat: 43.6532, lng: -79.3832, tz: 'America/Toronto', tzOffset: -5 }
  };
  function applyCityPreset(prefix, city, onPicked) {
    const sy = document.getElementById(prefix + 'CityShenyang');
    const to = document.getElementById(prefix + 'CityToronto');
    if (!sy || !to) return null;
    if (city === 'shenyang' && sy.checked) to.checked = false;
    if (city === 'toronto' && to.checked) sy.checked = false;
    const picked = sy.checked ? 'shenyang' : (to.checked ? 'toronto' : null);
    if (!picked) return null;
    const preset = CITY_PRESETS[picked];
    if (preset && onPicked) onPicked(preset, picked);
    return picked;
  }
  function applyBaziCityPreset(city) {
    applyCityPreset('bazi', city, (c, picked) => {
      const tzEl = document.getElementById('baziTimezone');
      const lonEl = document.getElementById('baziLongitude');
      if (tzEl) tzEl.value = c.tzOffset;
      if (lonEl) lonEl.value = c.lng;
      const cb = document.getElementById('baziTrueSolar');
      if (cb && !cb.checked) {
        cb.checked = true;
        if (typeof toggleTrueSolarUI === 'function') toggleTrueSolarUI();
      }
      if (typeof saveBaziForm === 'function') try { saveBaziForm(); } catch (_) {}
      saveSharedBirth({ city: picked, lat: c.lat, lng: c.lng, tz: c.tz, tzOffset: c.tzOffset });
    });
  }
  function applyWesternCityPreset(city) {
    applyCityPreset('western', city, (c, picked) => {
      const latEl = document.getElementById('westernLat');
      const lngEl = document.getElementById('westernLng');
      const tzEl = document.getElementById('westernTz');
      if (latEl) latEl.value = c.lat;
      if (lngEl) lngEl.value = c.lng;
      if (tzEl) tzEl.value = c.tz;
      saveSharedBirth({ city: picked, lat: c.lat, lng: c.lng, tz: c.tz, tzOffset: c.tzOffset });
    });
  }
  function applyZodiacCityPreset(city) {
    applyCityPreset('zodiac', city, (c, picked) => {
      saveSharedBirth({ city: picked, lat: c.lat, lng: c.lng, tz: c.tz, tzOffset: c.tzOffset });
    });
  }
  let westernInputTimer = null;
  function showWesternInputForm(){
    const chart = document.getElementById('westernChartWrap');
    const form = document.getElementById('westernForm');
    const cta = document.getElementById('westernInputCta');
    if (!chart || !form) return;
    if (westernInputTimer) clearTimeout(westernInputTimer);
    if (cta) cta.hidden = true;
    chart.classList.add('chart-leaving');
    westernInputTimer = setTimeout(() => {
      form.style.display = '';
      westernInputTimer = null;
    }, 260);
  }
  function openWesternPanel(){
    applySharedToWestern();
    try{
      const by=document.getElementById('baziYear')?.value, bm=document.getElementById('baziMonth')?.value, bd=document.getElementById('baziDay')?.value;
      const bh=document.getElementById('baziHour')?.value, bmin=document.getElementById('baziMinute')?.value;
      if(by) westernYearVal=parseInt(by,10)||westernYearVal;
      if(bm) westernMonthVal=parseInt(bm,10)||westernMonthVal;
      if(bd) westernDayVal=parseInt(bd,10)||westernDayVal;
      if(bh!==undefined&&bh!=='') westernHourVal=parseInt(bh,10);
      if(bmin!==undefined&&bmin!=='') westernMinuteVal=parseInt(bmin,10)||0;
    }catch(_){}
    try{
      const s=readStorageJSON(WESTERN_STORAGE_KEY, null);
      if(s){
        if(s.year) westernYearVal=+s.year; if(s.month) westernMonthVal=+s.month; if(s.day) westernDayVal=+s.day;
        if(s.hour!=null) westernHourVal=+s.hour; if(s.minute!=null) westernMinuteVal=+s.minute;
        if(s.lat!=null&&s.lat!=='') document.getElementById('westernLat').value=s.lat;
        if(s.lng!=null&&s.lng!=='') document.getElementById('westernLng').value=s.lng;
        if(s.tz) document.getElementById('westernTz').value=s.tz;
      }
    }catch(_){}
    if (westernInputTimer) { clearTimeout(westernInputTimer); westernInputTimer = null; }
    document.getElementById('westernError').textContent='';
    document.getElementById('westernForm').style.display='none';
    document.getElementById('westernReveal').style.display='none';
    document.getElementById('westernInputCta').hidden = false;
    const _wd=document.getElementById('westernDictBox'); if(_wd){ _wd.style.display='none'; _wd.innerHTML=''; }
    const _wr=document.getElementById('westernReport'); if(_wr) _wr.style.display='';
    ModalUI.open('western');
    setTimeout(initWesternWheels, 30);
    const chartWrap = document.getElementById('westernChartWrap');
    if (chartWrap) chartWrap.classList.remove('hidden', 'chart-leaving');
  }
  function closeWesternPanel(){
    const wmd = document.getElementById('westernModal');
    // 横屏嵌入时不卸下面板，仅允许「重新填写」等内部切换
    if (wmd && wmd.classList.contains('land-embed')) {
      if (westernInputTimer) { clearTimeout(westernInputTimer); westernInputTimer = null; }
      const dict = document.getElementById('westernDictBox');
      const report = document.getElementById('westernReport');
      if (dict) { dict.style.display = 'none'; dict.innerHTML = ''; }
      if (report) report.style.display = '';
      // 回到输入表单而不是关掉整层
      if (typeof backToWesternForm === 'function') {
        try { backToWesternForm(); } catch (_) {}
      }
      return;
    }
    if (westernInputTimer) { clearTimeout(westernInputTimer); westernInputTimer = null; }
    // 复位词典/报告显示，避免下次打开仍停在词典页
    const dict = document.getElementById('westernDictBox');
    const report = document.getElementById('westernReport');
    if (dict) { dict.style.display = 'none'; dict.innerHTML = ''; }
    if (report) report.style.display = '';
    ModalUI.close('western');
    if (typeof clearQuestionSelectionToDefault === 'function') clearQuestionSelectionToDefault();
  }
  function backToWesternForm(){
    const viz = document.getElementById('westernChartViz');
    if (viz) viz.innerHTML = '';
    const reveal = document.getElementById('westernReveal');
    const form = document.getElementById('westernForm');
    const dict = document.getElementById('westernDictBox');
    const report = document.getElementById('westernReport');
    const chartWrap = document.getElementById('westernChartWrap');
    const cta = document.getElementById('westernInputCta');
    if (westernInputTimer) { clearTimeout(westernInputTimer); westernInputTimer = null; }
    if (dict) { dict.style.display = 'none'; dict.innerHTML = ''; }
    if (report) report.style.display = '';
    if (reveal) reveal.style.display = 'none';
    if (form) form.style.display = 'none';
    if (chartWrap) chartWrap.classList.remove('hidden', 'chart-leaving');
    if (cta) cta.hidden = false;
  }
  function submitWesternForm(){
    const errEl = document.getElementById('westernError');
    if (errEl) errEl.textContent = '';
    const year = westernYearVal, month = westernMonthVal, day = westernDayVal;
    const hour = westernHourVal, minute = westernMinuteVal;
    const latEl = document.getElementById('westernLat');
    const lngEl = document.getElementById('westernLng');
    const tzEl = document.getElementById('westernTz');
    const latRaw = latEl ? latEl.value : '';
    const lngRaw = lngEl ? lngEl.value : '';
    const tz = (tzEl && tzEl.value || '').trim();
    const lat = latRaw === '' ? null : parseFloat(latRaw);
    const lng = lngRaw === '' ? null : parseFloat(lngRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      if (errEl) errEl.textContent = '请选择有效出生日期。';
      return;
    }
    if (latRaw !== '' && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      if (errEl) errEl.textContent = '纬度无效（-90~90）。';
      return;
    }
    if (lngRaw !== '' && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      if (errEl) errEl.textContent = '经度无效（-180~180）。';
      return;
    }
    const input = { year, month, day, hour, minute, lat, lng, tz };
    writeStorageJSON(WESTERN_STORAGE_KEY, input);
    saveSharedBirth({ year, month, day, hour, minute, lat, lng, tz });
    if (typeof saveProfileSummary === 'function') {
      saveProfileSummary('western', year + '-' + month + '-' + day + '·西盘');
    }
    const report = document.getElementById('westernReport');
    const dict = document.getElementById('westernDictBox');
    const form = document.getElementById('westernForm');
    const reveal = document.getElementById('westernReveal');
    if (dict) { dict.style.display = 'none'; dict.innerHTML = ''; }
    try {
      const result = computeNatalChart(input);
      if (typeof renderNatalChartViz === 'function') {
        try { renderNatalChartViz(result); } catch (vizErr) { console.warn('chart viz', vizErr); }
      }
      if (report) {
        report.style.display = '';
        report.innerHTML = renderWesternReport(result);
      }
      if (form) form.style.display = 'none';
      if (reveal) reveal.style.display = 'flex';
      const chartWrap = document.getElementById('westernChartWrap') || document.querySelector('.western-chart-wrap');
      if (chartWrap) chartWrap.classList.add('hidden');
    } catch (err) {
      console.error('western analyze failed', err);
      if (errEl) errEl.textContent = '分析出错：' + (err && err.message ? err.message : '请重试');
    }
  }
  (function bindSealLongPress(){
    function wire(){
      const hit = document.getElementById('sealHit');
      const seal = document.getElementById('sealImg');
      if (!hit) return;
      let timer = null;
      let armed = false;
      const LONG_MS = 550;
      function isWatermark() {
        return seal && seal.classList.contains('watermark');
      }
      function clearTimer() {
        if (timer) { clearTimeout(timer); timer = null; }
        armed = false;
      }
      function startPress(e) {
        if (isWatermark()) return;
        if (hit.classList.contains('disabled')) return;
        clearTimer();
        armed = true;
        timer = setTimeout(function () {
          if (!armed) return;
          timer = null;
          armed = false;
          if (typeof openWesternPanel === 'function') openWesternPanel();
        }, LONG_MS);
      }
      function endPress() { clearTimer(); }
      // 禁止系统菜单 / 保存图片 / 选中
      hit.addEventListener('contextmenu', function (e) { e.preventDefault(); e.stopPropagation(); return false; });
      hit.addEventListener('dragstart', function (e) { e.preventDefault(); });
      if (seal) {
        seal.addEventListener('contextmenu', function (e) { e.preventDefault(); e.stopPropagation(); return false; });
        seal.addEventListener('dragstart', function (e) { e.preventDefault(); });
      }
      hit.addEventListener('touchstart', startPress, { passive: true });
      hit.addEventListener('touchend', endPress);
      hit.addEventListener('touchcancel', endPress);
      hit.addEventListener('touchmove', endPress);
      hit.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        startPress(e);
      });
      hit.addEventListener('mouseup', endPress);
      hit.addEventListener('mouseleave', endPress);
      // 水印切换时同步热区
      try {
        const mo = new MutationObserver(function () {
          if (isWatermark()) hit.classList.add('disabled');
          else hit.classList.remove('disabled');
        });
        if (seal) mo.observe(seal, { attributes: true, attributeFilter: ['class'] });
      } catch (_) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
  })();
