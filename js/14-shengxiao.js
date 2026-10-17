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
    body.innerHTML =
      '<div class="tarot-card"><div class="tarot-card-pos">' + birth.year + '年生</div>' +
      '<div class="tarot-card-name" style="font-size:44px;margin:8px 0;">' + sx + '</div>' +
      '<div class="tarot-card-keys">' + info.trait + '</div></div>' +
      '<div class="mbti-report"><div class="mbti-sec"><span class="mbti-sec-label">本年运势 · ' + GAN[gi % 10] + ZHI[gi % 12] + csx + '年 · ' + rel.name + '</span>' +
      rel.text + '<br>' + info.luck + '</div></div>';
  }
  function openShengxiao() {
    var birth = null;
    try { birth = JSON.parse(localStorage.getItem('yumiao_shared_birth_v1') || 'null'); } catch (e) {}
    var body = document.getElementById('shengxiaoBody');
    if (!birth || !birth.year) {
      body.innerHTML = '<p class="mbti-intro">请先到「我的」录入生辰档案。</p>';
    } else {
      render(birth);
      ensureLunar().then(function () { render(birth); });
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
  window.__shengxiao = { getShengxiao: getShengxiao, lunarYearOf: lunarYearOf, relation: relation };
  window.openShengxiao = openShengxiao;
  window.closeShengxiao = closeShengxiao;
})();
