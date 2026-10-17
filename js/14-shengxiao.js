// 生肖：按出生年定生肖，显示性格、运势
(function () {
  var SX = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  var SX_INFO = {
    '鼠': { trait: '机智灵敏 · 善于理财', luck: '今年宜守不宜攻，财运稳中有升。' },
    '牛': { trait: '踏实稳重 · 任劳任怨', luck: '脚踏实地必有回报，贵人暗中相助。' },
    '虎': { trait: '勇敢果断 · 领导力强', luck: '气势如虹，宜主动出击，把握良机。' },
    '兔': { trait: '温柔细腻 · 谨慎周全', luck: '以柔克刚，低调行事反得好运。' },
    '龙': { trait: '志向高远 · 气度不凡', luck: '龙腾四海，大展宏图之年。' },
    '蛇': { trait: '智慧冷静 · 洞察力强', luck: '静观其变，谋定而后动。' },
    '马': { trait: '热情奔放 · 行动力强', luck: '马到成功，宜远行、宜开拓。' },
    '羊': { trait: '温顺善良 · 重情重义', luck: '人和为贵，合作生财。' },
    '猴': { trait: '聪明活泼 · 机变无穷', luck: '灵机一动，化险为夷。' },
    '鸡': { trait: '守时守信 · 注重细节', luck: '金鸡报晓，守得云开见月明。' },
    '狗': { trait: '忠诚正直 · 嫉恶如仇', luck: '忠义得福，朋友是最大贵人。' },
    '猪': { trait: '豁达乐观 · 福气深厚', luck: '知足常乐，好运自然来。' }
  };
  var GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
  function getShengxiao(year) {
    return SX[(((year - 4) % 12) + 12) % 12];
  }
  // 生肖按农历年（春节换年）而非公历年：1 月～春节前出生的人属上一年。
  // 农历换算在称骨模块（11-chenggu.js，懒加载）；加载失败时退回「2 月 4 日换年」的近似。
  function lunarYearOf(y, m, d) {
    if (typeof window.__solarToLunar === 'function') {
      var l = window.__solarToLunar(y, m, d);
      if (l) return l.year;
    }
    return (m < 2 || (m === 2 && d < 4)) ? y - 1 : y;
  }
  function ensureLunar() {
    if (typeof window.__solarToLunar === 'function' || typeof window.__yumiaoLoad !== 'function') return Promise.resolve();
    return window.__yumiaoLoad(['js/11a-chenggu-verses.js', 'js/11b-chenggu-modern.js', 'js/11-chenggu.js']).catch(function () {});
  }
  // 今年（农历年）生肖与本命生肖的关系：本命年 / 冲 / 合 / 三合 / 害 / 平
  var HE = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  var SANHE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
  var HAI = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
  function inPair(list, a, b) {
    for (var i = 0; i < list.length; i++) if ((list[i][0] === a && list[i][1] === b) || (list[i][0] === b && list[i][1] === a)) return true;
    return false;
  }
  function relation(me, cur) {
    if (me === cur) return { name: '本命年', text: '俗称「犯太岁」，宜低调稳健，重大决定多商量；红色贴身物件讨个吉利。' };
    if (((me - cur) % 12 + 12) % 12 === 6) return { name: '冲太岁', text: '与今年相冲，变动较多，出行、投资宜稳；遇事缓一步，反能化解。' };
    if (inPair(HE, me, cur)) return { name: '合太岁', text: '与今年六合，贵人缘旺，合作与人际顺畅，是借力的好年份。' };
    for (var i = 0; i < SANHE.length; i++) if (SANHE[i].indexOf(me) >= 0 && SANHE[i].indexOf(cur) >= 0) return { name: '三合', text: '与今年三合，天时人和，想做的事可以大胆推进。' };
    if (inPair(HAI, me, cur)) return { name: '害太岁', text: '与今年相害，小人口舌需防，言语留三分，少替人担保。' };
    return { name: '平', text: '与今年无冲无合，运势平稳，成败看自己的努力。' };
  }
  var ctx = null; // 当前面板的生肖/年份上下文，供「详细年运」使用
  function stars(n) { return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  function clamp(n) { return Math.max(1, Math.min(5, Math.round(n))); }
  function rng(seed) { // 固定种子：同一人同一年每次打开结果一致
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var BASE = { '本命年': 3, '冲太岁': 2, '合太岁': 4, '三合': 5, '害太岁': 3, '平': 3 };
  var DOMAIN_TEXT = {
    '事业': [
      ['今年职场阻力偏多，宜守不宜攻。手头的事做扎实，不急着跳槽或扩张，把口碑留住。', '工作中易有反复，重要决定多留一晚再下。少与人争功，默默积累反成转机。'],
      ['事业平稳推进，没有大起大落。适合打基础、考证、补短板，下半年更容易见成果。', '贵人不多不少，靠自己的节奏走。别被他人的进度带乱，稳中求进。'],
      ['事业有明显上升势头，主动争取的机会大概率能成。适合谈合作、接新项目、谋晋升。', '今年表现容易被看见，贵人愿意拉一把。抓住上半年的窗口，下半年巩固。']
    ],
    '财运': [
      ['财务宜保守，大额投资、借贷、担保尽量避开。开源不如节流，留足备用金。', '易有计划外的开销，先列清单再花钱。听来的「稳赚」多半不稳，慎入。'],
      ['正财稳定，偏财一般。收支大体平衡，适合做长期储蓄和小额稳健配置。', '财运随努力走，没有横财但也不至断流。年中留意一笔可回收的旧账。'],
      ['财运较旺，正财有增、合作得利。仍需分散风险，见好就收，别因顺手而加码过度。', '有机会通过项目、副业或人脉增收。大额决策仍要做功课，贪多易失。']
    ],
    '感情': [
      ['感情易起波折，言语上多一分体谅。已有伴侣的避免冷战，单身者不宜仓促定下。', '人际上易有误会，别在情绪上头时下结论。把话说开比猜测更有用。'],
      ['感情平稳细水长流。单身者靠朋友圈缘分，已有伴侣者宜多安排共处时间。', '不温不火的一年，适合经营而非冲刺。家人与老友的陪伴是主要的情绪来源。'],
      ['桃花与人缘都旺，单身者有望遇到合拍的人，有伴侣者感情升温，适合谈婚论嫁。', '社交活跃，容易得到真诚的支持与祝福。珍惜眼前人，别让忙碌挤掉陪伴。']
    ],
    '健康': [
      ['精力易透支，睡眠和饮食要守住底线。出行、运动注意安全，体检别拖。', '情绪压力偏大，给自己留出放松的时间。久坐久站都要适度，小毛病别硬扛。'],
      ['整体平稳，注意换季保养。规律作息、适度运动即可，不必过度担忧。', '小状况偶有，调整作息就能缓解。保持散步或拉伸的习惯，比突击锻炼有效。'],
      ['状态不错，精力充沛，适合建立长期的运动习惯。仍要避免因顺利而熬夜透支。', '身心舒展的一年，是调理旧疾、养成好习惯的好时机，坚持就有回报。']
    ]
  };
  var MONTH_N = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  var MONTH_TIP = { good: '宜推进要事、谈合作、见贵人', bad: '宜守不宜攻，凡事留余地' };
  function monthRel(me, branch) { // 流月地支与本命生肖地支的关系 → 加减分
    if (me === branch) return 0;
    if (((me - branch) % 12 + 12) % 12 === 6) return -1;
    if (inPair(HE, me, branch)) return 1;
    if (inPair(HAI, me, branch)) return -1;
    for (var i = 0; i < SANHE.length; i++) if (SANHE[i].indexOf(me) >= 0 && SANHE[i].indexOf(branch) >= 0) return 1;
    return 0;
  }
  function detailHtml() {
    var c = ctx, base = BASE[c.rel.name] || 3;
    var r = rng(c.cy * 131 + c.me * 17 + 7), html = '';
    html += '<button type="button" class="sx-back" data-act="back">‹ 返回</button>';
    html += '<div class="mbti-report"><div class="mbti-sec"><span class="mbti-sec-label">' + c.yearName + '年 · 属' + c.sx + ' · ' + c.rel.name + '</span>' +
      '综合 <span class="sx-stars">' + stars(base) + '</span><br>' + c.rel.text + '</div>';
    ['事业', '财运', '感情', '健康'].forEach(function (k) {
      var lv = clamp(base + (r() < 0.5 ? -1 : 0) + (r() < 0.35 ? 1 : 0));
      var tier = lv <= 2 ? 0 : (lv === 3 ? 1 : 2);
      var pool = DOMAIN_TEXT[k][tier];
      html += '<div class="mbti-sec"><span class="mbti-sec-label">' + k + '</span><span class="sx-stars">' + stars(lv) + '</span><br>' + pool[Math.floor(r() * pool.length)] + '</div>';
    });
    // 逐月：流月地支（正月寅…腊月丑）与本命生肖的冲合
    var best = [], worst = [], cells = '';
    for (var m = 1; m <= 12; m++) {
      var br = (m + 1) % 12, d = monthRel(c.me, br);
      var lv = clamp(base + d);
      if (d > 0) best.push(MONTH_N[m - 1]); else if (d < 0) worst.push(MONTH_N[m - 1]);
      cells += '<div class="sx-month' + (c.curMonth === m ? ' now' : '') + '"><b>' + MONTH_N[m - 1] + '月</b><span>' + stars(lv) + '</span>' +
        (c.curMonth === m ? '<i>本月</i>' : '') + '</div>';
    }
    html += '<div class="mbti-sec"><span class="mbti-sec-label">逐月</span>农历月，按月支与你的生肖冲合推算</div><div class="sx-months">' + cells + '</div>';
    html += '<div class="mbti-sec"><span class="mbti-sec-label">宜</span>' + (best.length ? best.join('、') + '月：' + MONTH_TIP.good : '全年起伏不大，顺势而为') + '</div>';
    html += '<div class="mbti-sec"><span class="mbti-sec-label">慎</span>' + (worst.length ? worst.join('、') + '月：' + MONTH_TIP.bad : '无明显相冲之月，保持平常心') + '</div>';
    html += '<div class="mbti-brief-note">传统生肖流年，仅供参考，重要决定请以现实为准</div></div>';
    return html;
  }
  function render(birth) {
    var body = document.getElementById('shengxiaoBody');
    if (!body) return;
    var ly = lunarYearOf(parseInt(birth.year, 10), parseInt(birth.month, 10) || 1, parseInt(birth.day, 10) || 1);
    var sx = getShengxiao(ly);
    var info = SX_INFO[sx];
    var now = new Date();
    var cy = lunarYearOf(now.getFullYear(), now.getMonth() + 1, now.getDate());
    var csx = getShengxiao(cy);
    var gi = (((cy - 4) % 60) + 60) % 60;
    var rel = relation(SX.indexOf(sx), SX.indexOf(csx));
    var curMonth = 0;
    if (typeof window.__solarToLunar === 'function') {
      var ln = window.__solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
      if (ln) curMonth = ln.month;
    }
    ctx = { sx: sx, me: SX.indexOf(sx), cy: cy, csx: csx, rel: rel, curMonth: curMonth, yearName: GAN[gi % 10] + ZHI[gi % 12] + csx };
    body.innerHTML =
      '<div class="tarot-card"><div class="tarot-card-pos">' + birth.year + '年生</div>' +
      '<div class="tarot-card-name" style="font-size:44px;margin:8px 0;">' + sx + '</div>' +
      '<div class="tarot-card-keys">' + info.trait + '</div></div>' +
      '<div class="mbti-report"><div class="mbti-sec sx-fortune"><div class="sx-fortune-head"><span class="mbti-sec-label">本年运势 · ' + ctx.yearName + '年 · ' + rel.name + '</span>' +
      '<button type="button" class="sx-plus" data-act="detail" aria-label="查看详细年运">＋</button></div>' +
      rel.text + '<br>' + info.luck + '</div></div>';
  }
  (function bindOnce() {
    function go() {
      var body = document.getElementById('shengxiaoBody');
      if (!body || body._sxBound) return;
      body._sxBound = true;
      body.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('[data-act], .sx-fortune') : null;
        if (!t || !ctx) return;
        var act = t.getAttribute('data-act') || 'detail';
        if (act === 'detail') { body.innerHTML = detailHtml(); var sc = body.closest('.sheet-scroll'); if (sc) sc.scrollTop = 0; }
        else if (act === 'back') { var b = null; try { b = JSON.parse(localStorage.getItem('yumiao_shared_birth_v1') || 'null'); } catch (_) {} if (b && b.year) { render(b); var sc2 = body.closest('.sheet-scroll'); if (sc2) sc2.scrollTop = 0; } }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
  function openShengxiao() {
    var birth = null;
    try { birth = JSON.parse(localStorage.getItem('yumiao_shared_birth_v1') || 'null'); } catch (e) {}
    var body = document.getElementById('shengxiaoBody');
    if (!birth || !birth.year) {
      body.innerHTML = '<p class="mbti-intro">请先到「我的」录入生辰档案。</p>';
    } else {
      render(birth);
      ensureLunar().then(function () { if (document.querySelector('#shengxiaoBody .sx-fortune')) render(birth); });
    }
    if (typeof ModalUI !== 'undefined' && ModalUI.open) ModalUI.open('shengxiao');
    else {
      document.getElementById('shengxiaoBackdrop').classList.add('show');
      document.getElementById('shengxiaoModal').classList.add('show');
    }
  }
  function closeShengxiao() {
    if (typeof ModalUI !== 'undefined' && ModalUI.close) ModalUI.close('shengxiao');
    else {
      document.getElementById('shengxiaoBackdrop').classList.remove('show');
      document.getElementById('shengxiaoModal').classList.remove('show');
    }
  }
  window.__shengxiao = { getShengxiao: getShengxiao, lunarYearOf: lunarYearOf, relation: relation, monthRel: monthRel };
  window.openShengxiao = openShengxiao;
  window.closeShengxiao = closeShengxiao;
})();
