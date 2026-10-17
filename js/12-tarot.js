// 塔罗牌占卜：选牌阵 → 抽牌 → 直接显示完整牌义
var TAROT_MAJOR = [
  { no: '0',   name: '愚者',   up: '新的开始 · 赤子之心 · 勇敢一跃', rev: '鲁莽冒进 · 犹豫不决 · 原地踏步',
    text: '愚者立于崖边，一步即是新程。正位宜放手一搏，天地会接住真诚的勇气；逆位则提醒：看清脚下再迈步，勿把冲动当作天命。' },
  { no: 'I',   name: '魔术师', up: '创造 · 意志 · 万事俱备', rev: '才具空耗 · 言过其实 · 时机未至',
    text: '魔术师手握四元素，象征资源俱足。正位是"动手之时"，心想即可事成；逆位警示：莫被花言巧语所惑，也别高估了眼前的牌面。' },
  { no: 'II',  name: '女祭司', up: '直觉 · 静观 · 内在智慧', rev: '压抑直觉 · 被表象迷惑',
    text: '女祭司端坐黑白柱间，答案不在喧哗处。正位请倾听心底那个微小的声音；逆位则说：你明明知道答案，只是假装没听见。' },
  { no: 'III', name: '女皇',   up: '丰盛 · 滋养 · 创造', rev: '过度操劳 · 创造力阻塞',
    text: '女皇是大地的母亲，万物因她丰盛。正位主收获与孕育，所问之事如春苗得雨；逆位提醒：先照顾好自己，枯井打不出水来。' },
  { no: 'IV',  name: '皇帝',   up: '秩序 · 权威 · 稳固', rev: '专断僵化 · 失控',
    text: '皇帝以秩序立国。正位宜建立规则、稳扎稳打，权威即是护城河；逆位则戒：控制欲太强会压垮身边人，铁腕之下易生裂痕。' },
  { no: 'V',   name: '教皇',   up: '信仰 · 传统 · 指引', rev: '教条束缚 · 盲从 · 另辟蹊径',
    text: '教皇是传统的守门人。正位宜寻师问道、遵循正道，前人走过的路最稳；逆位却说：规矩是死的，人是活的，该立自己的法了。' },
  { no: 'VI',  name: '恋人',   up: '结合 · 抉择 · 和谐', rev: '失衡 · 错误抉择 · 关系考验',
    text: '恋人牌关乎"选择"更甚于爱情。正位是心意相通的结合，选其所爱；逆位警示：看似两全的选项里藏着代价，莫被表象迷了眼。' },
  { no: 'VII', name: '战车',   up: '意志 · 胜利 · 勇往直前', rev: '失控 · 方向迷失 · 空转',
    text: '战车以意志驾驭两匹背道之马。正位主一往无前，目标既定便无可阻挡；逆位则说：缰绳松了，先找回方向，蛮力只会原地打转。' },
  { no: 'VIII', name: '力量',  up: '以柔克刚 · 耐心 · 内在力量', rev: '自我怀疑 · 强压反噬',
    text: '少女轻合狮口，柔能克刚。正位宜以耐心与温柔化解难题，真正的力量不动声色；逆位提醒：别硬撑，承认疲惫不是认输。' },
  { no: 'IX',  name: '隐者',   up: '内省 · 寻道 · 沉淀', rev: '孤立 · 迷失 · 闭门造车',
    text: '隐者提灯独行，答案在独处中显现。正位宜静下来，向内寻找；逆位则戒：离群太久会迷路，灯也要拿出来照照路。' },
  { no: 'X',   name: '命运之轮', up: '转机 · 时运流转', rev: '逆运 · 抗拒变化',
    text: '轮盘转动，否极泰来。正位是时来运转的信号，顺势而为；逆位则说：逆水行舟莫强求，先收帆，等风来。' },
  { no: 'XI',  name: '正义',   up: '公正 · 因果 · 诚实面对', rev: '偏颇 · 逃避责任',
    text: '正义手持天平与利剑，种何因得何果。正位宜坦荡行事，是非自有公论；逆位警示：别为自己开脱，该认的账迟早要还。' },
  { no: 'XII', name: '倒吊人', up: '换位 · 牺牲 · 等待', rev: '无谓牺牲 · 拖延',
    text: '倒吊人以悬置换取洞见。正位宜换个角度看问题，暂时的停顿是积蓄；逆位则说：别再自我感动式的付出了，及时止损也是智慧。' },
  { no: 'XIII', name: '死神',  up: '结束 · 蜕变 · 新生', rev: '抗拒结束 · 藕断丝连',
    text: '死神非关死亡，而是"旧的不去，新的不来"。正位主果断告别，蜕变在即；逆位提醒：拖着不放手的，正在悄悄耗干你。' },
  { no: 'XIV', name: '节制',  up: '调和 · 节制 · 水到渠成', rev: '失衡 · 急躁 · 过犹不及',
    text: '天使将水在两杯间来回倾注，恰是分寸之道。正位宜耐心调和，好事多磨终成；逆位则戒：用力过猛，满则溢，紧绷的弦易断。' },
  { no: 'XV',  name: '恶魔',   up: '执念 · 束缚 · 欲望', rev: '挣脱 · 看清枷锁',
    text: '恶魔的锁链其实松得很，囚徒是自己不愿走。正位直指执念与沉溺；逆位是好消息：你已经看清了枷锁，挣脱只在转念之间。' },
  { no: 'XVI', name: '高塔',   up: '剧变 · 旧构倾塌', rev: '劫后余生 · 勉强维持',
    text: '雷击高塔，旧世界轰然倒塌。正位是突变预警，也是重建的起点——塌的是危楼；逆位则说：最坏的已过，别再回头修补废墟。' },
  { no: 'XVII', name: '星星',  up: '希望 · 宁静 · 远景', rev: '信心动摇 · 迷惘',
    text: '高塔之后，星星升起。正位是黑夜后的第一颗星：希望真实不虚，静水流深；逆位提醒：别弄丢了信念，雾再浓，星还在。' },
  { no: 'XVIII', name: '月亮', up: '不安 · 幻象 · 潜意识', rev: '拨云见日 · 走出迷雾',
    text: '月夜之下，真假难辨。正位主迷惘与不安，宜缓行、宜观望，不做重大决定；逆位是转机：雾散了，你担心的事并没有发生。' },
  { no: 'XIX', name: '太阳',  up: '光明 · 成功 · 喜悦', rev: '暂时的阴霾 · 小成',
    text: '太阳是牌中最吉之兆。正位主光明磊落、心想事成，阴霾尽散；逆位也无大碍：只是云暂时遮了光，好事略迟，但一定会到。' },
  { no: 'XX',  name: '审判',   up: '觉醒 · 召唤 · 新生', rev: '自我审判 · 错过召唤',
    text: '号角响起，逝者复苏。正位是觉醒与召唤：过去的努力将被看见，新生之门已开；逆位则说：别再用旧账审判自己，接起那通电话。' },
  { no: 'XXI', name: '世界',   up: '圆满 · 完成 · 新的循环', rev: '未竟之业 · 画地自限',
    text: '世界牌是旅程的终点，也是起点。正位主圆满成就，一段功课修完；逆位提醒：还差最后一小步，别在终点前自己画地为牢。' }
];

var _tarotSpread = 'single';
var _tarotNeed = 1;
var _tarotDeck = [];
var _tarotDrawn = [];
var TAROT_POS_SINGLE = ['指引'];
var TAROT_POS_THREE = ['过去', '现在', '未来'];

function tarotShuffle() {
  var idx = [];
  for (var i = 0; i < TAROT_MAJOR.length; i++) idx.push(i);
  for (var i = idx.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  return idx;
}
function tarotPosLabels() {
  return _tarotSpread === 'three' ? TAROT_POS_THREE : TAROT_POS_SINGLE;
}
function openTarotPanel() {
  tarotToSpread();
  ModalUI.open('tarot');
}
function closeTarotPanel() {
  ModalUI.close('tarot');
  if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
  if (typeof fillQuestionText === 'function') fillQuestionText('');
}
function tarotBody() { return document.getElementById('tarotBody'); }
function tarotToSpread() {
  _tarotSpread = 'single'; _tarotNeed = 1;
  _tarotDeck = []; _tarotDrawn = [];
  var el = tarotBody();
  if (!el) return;
  el.innerHTML =
    '<div class="tarot-step">' +
    '<p class="mbti-intro">二十二张大阿卡纳，心诚则显。默念所问，选定牌阵。</p>' +
    '<div class="tarot-spread-row">' +
    '<button type="button" class="btn-gold tarot-spread-btn" onclick="tarotChooseSpread(\'single\')"><strong>单张指引</strong><span>一牌断当下</span></button>' +
    '<button type="button" class="btn-gold tarot-spread-btn" onclick="tarotChooseSpread(\'three\')"><strong>三张牌阵</strong><span>过去 · 现在 · 未来</span></button>' +
    '</div></div>';
  try { tarotSaveState(); } catch (_) {}
}
function tarotChooseSpread(s) {
  _tarotSpread = s;
  _tarotNeed = (s === 'three') ? 3 : 1;
  _tarotDeck = tarotShuffle();
  _tarotDrawn = [];
  tarotRenderDraw();
}
function tarotRenderDraw() {
  var el = tarotBody();
  if (!el) return;
  var backs = '';
  for (var i = 0; i < _tarotDeck.length; i++) {
    backs += '<button type="button" class="tarot-back" data-i="' + i + '" onclick="tarotPick(' + i + ')" aria-label="抽牌"><span>✦</span></button>';
  }
  el.innerHTML =
    '<div class="tarot-step">' +
    '<p class="mbti-intro">牌已洗匀。凝神静气，点选 ' + _tarotNeed + ' 张。<span class="tarot-prog" id="tarotProg">已抽 0 / ' + _tarotNeed + '</span></p>' +
    '<div class="tarot-grid">' + backs + '</div>' +
    '<div class="tarot-actions"><button type="button" class="btn-ghost btn-sm" onclick="tarotToSpread()">重选牌阵</button></div>' +
    '</div>';
}
function tarotPick(i) {
  if (_tarotDrawn.length >= _tarotNeed) return;
  var btn = document.querySelector('.tarot-back[data-i="' + i + '"]');
  if (!btn || btn.classList.contains('picked')) return;
  btn.classList.add('picked');
  var card = TAROT_MAJOR[_tarotDeck[i]];
  var reversed = Math.random() < 0.5;
  _tarotDrawn.push({ card: card, reversed: reversed });
  var prog = document.getElementById('tarotProg');
  if (prog) prog.textContent = '已抽 ' + _tarotDrawn.length + ' / ' + _tarotNeed;
  if (_tarotDrawn.length >= _tarotNeed) {
    setTimeout(tarotRenderReveal, 450);
  }
}
function tarotRenderReveal() {
  var el = tarotBody();
  if (!el) return;
  var labels = tarotPosLabels();
  var html = '<div class="tarot-step"><p class="mbti-intro">牌面已定，牌义如下。</p><div class="tarot-result">';
  for (var i = 0; i < _tarotDrawn.length; i++) {
    var d = _tarotDrawn[i];
    var pos = labels[i] || ('第' + (i + 1) + '张');
    var ori = d.reversed ? '逆位' : '正位';
    html += '<div class="tarot-card' + (d.reversed ? ' rev' : '') + '">' +
      '<div class="tarot-card-pos">' + escapeHtml(pos) + '</div>' +
      '<div class="tarot-card-emblem">✦</div>' +
      '<div class="tarot-card-no">' + escapeHtml(d.card.no) + '</div>' +
      '<div class="tarot-card-name">' + escapeHtml(d.card.name) + '</div>' +
      '<div class="tarot-card-ori ' + (d.reversed ? 'is-rev' : 'is-up') + '">' + ori + '</div>' +
      '<div class="tarot-card-keys">' + escapeHtml(d.reversed ? d.card.rev : d.card.up) + '</div>' +
      '</div>';
  }
  html += '</div><div class="mbti-report" id="tarotReport">';
  for (var i = 0; i < _tarotDrawn.length; i++) {
    var d = _tarotDrawn[i];
    var pos = labels[i] || ('第' + (i + 1) + '张');
    var ori = d.reversed ? '逆位' : '正位';
    html += '<div class="mbti-sec"><span class="mbti-sec-label">' + escapeHtml(pos) + ' · ' + escapeHtml(d.card.name) + '（' + ori + '）</span>' +
      escapeHtml(d.reversed ? d.card.rev : d.card.up) + '<br>' + escapeHtml(d.card.text) + '</div>';
  }
  html += '<div class="mbti-brief-note">牌示方向，行止仍在人为。</div></div>' +
    '<div class="tarot-actions"><button type="button" class="btn-ghost btn-sm" onclick="tarotToSpread()">重新抽牌</button></div>' +
    '</div>';
  el.innerHTML = html;
  try {
    if (typeof saveReportHTML === 'function') saveReportHTML('yumiao_report_tarot_v1', '塔罗牌阵', 'tarotReport');
  } catch (_) {}
  try { tarotSaveState(); } catch (_) {}
}
function tarotSaveState() {
  try {
    localStorage.setItem('yumiao_tarot_v1', JSON.stringify({ spread: _tarotSpread, drawn: _tarotDrawn.map(function(d){ return { no: d.card.no, reversed: d.reversed }; }) }));
  } catch (_) {}
}
