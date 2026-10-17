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
  function getShengxiao(year) {
    return SX[(year - 4) % 12];
  }
  function openShengxiao() {
    var birth = null;
    try { birth = JSON.parse(localStorage.getItem('yumiao_shared_birth_v1') || 'null'); } catch (e) {}
    var body = document.getElementById('shengxiaoBody');
    if (!birth || !birth.year) {
      body.innerHTML = '<p class="mbti-intro">请先到「我的」录入生辰档案。</p>';
    } else {
      var sx = getShengxiao(parseInt(birth.year, 10));
      var info = SX_INFO[sx];
      body.innerHTML =
        '<div class="tarot-card"><div class="tarot-card-pos">' + birth.year + '年生</div>' +
        '<div class="tarot-card-name" style="font-size:44px;margin:8px 0;">' + sx + '</div>' +
        '<div class="tarot-card-keys">' + info.trait + '</div></div>' +
        '<div class="mbti-report"><div class="mbti-sec"><span class="mbti-sec-label">本年运势</span>' + info.luck + '</div></div>';
    }
    if (typeof ModalUI !== 'undefined' && ModalUI.open) ModalUI.open('shengxiao');
    else document.getElementById('shengxiaoModal').classList.add('show');
  }
  function closeShengxiao() {
    if (typeof ModalUI !== 'undefined' && ModalUI.close) ModalUI.close('shengxiao');
    else document.getElementById('shengxiaoModal').classList.remove('show');
  }
  window.openShengxiao = openShengxiao;
  window.closeShengxiao = closeShengxiao;
})();
