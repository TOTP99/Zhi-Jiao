/* 周易六爻 · 核心逻辑（起卦/断法） */
(function () {
  'use strict';

  var YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
  var TRAD = {'临':'臨','为':'為','兑':'兌','剥':'剝','师':'師','恒':'恆','损':'損','晋':'晉','泽':'澤','涣':'渙','渐':'漸','节':'節','蛊':'蠱','观':'觀','讼':'訟','谦':'謙','贲':'賁','随':'隨','颐':'頤','风':'風'};

  function toTrad(s) {
    return String(s || '').split('').map(function (c) { return TRAD[c] || c; }).join('');
  }

  /* 三钱起卦：一爻 */
  function castOneLine() {
    var heads = 0, coins = [];
    for (var i = 0; i < 3; i++) {
      var h = Math.random() < 0.5;
      if (h) heads++;
      coins.push(h ? '正' : '反');
    }
    var r;
    if (heads === 3) r = { v: 9, yang: true, moving: true, tag: '老阳', sym: '○' };
    else if (heads === 2) r = { v: 7, yang: true, moving: false, tag: '少阳', sym: '▬' };
    else if (heads === 1) r = { v: 8, yang: false, moving: false, tag: '少阴', sym: '▬▬' };
    else r = { v: 6, yang: false, moving: true, tag: '老阴', sym: '×' };
    r.coins = coins.join('');
    return r;
  }

  /* 卦键：上爻→初爻，1阳0阴 */
  function linesToKey(lines) {
    var k = '';
    for (var i = 5; i >= 0; i--) k += lines[i].yang ? '1' : '0';
    return k;
  }
  function changedKey(lines) {
    var k = '';
    for (var i = 5; i >= 0; i--) {
      var y = lines[i].moving ? !lines[i].yang : lines[i].yang;
      k += y ? '1' : '0';
    }
    return k;
  }

  function getHex(key) { return (window.YIJING_DATA || {})[key] || null; }

  /* 传统断法 */
  function judge(lines) {
    var key = linesToKey(lines);
    var hex = getHex(key);
    if (!hex) return null;
    var mv = [];
    lines.forEach(function (l, i) { if (l.moving) mv.push(i); });
    var n = mv.length;
    var chex = n > 0 ? getHex(changedKey(lines)) : null;

    var out = { hex: hex, chex: chex, moving: mv, rule: '', parts: [] };
    function yaoci(h, idx) { return h.yaoCi[idx]; }
    function ymod(h, idx) { return (h.yaoCiModern || [])[idx] || ''; }

    if (n === 0) {
      out.rule = '六爻安静，以本卦卦辞断';
      out.parts.push({ t: '本卦卦辞', classical: hex.guaCi, modern: hex.guaCiModern });
    } else if (n === 1) {
      out.rule = '一爻动，以动爻爻辞断';
      out.parts.push({ t: '动爻爻辞 · ' + YAO_NAMES[mv[0]], classical: yaoci(hex, mv[0]), modern: ymod(hex, mv[0]) });
    } else if (n === 2) {
      out.rule = '二爻动，以上爻爻辞为主，兼看下爻';
      var hi = mv[1], lo = mv[0];
      out.parts.push({ t: '上动爻 · ' + YAO_NAMES[hi] + '（为主）', classical: yaoci(hex, hi), modern: ymod(hex, hi) });
      out.parts.push({ t: '下动爻 · ' + YAO_NAMES[lo] + '（为辅）', classical: yaoci(hex, lo), modern: ymod(hex, lo) });
    } else if (n === 3) {
      out.rule = '三爻动，本卦变卦参断';
      out.parts.push({ t: '本卦卦辞', classical: hex.guaCi, modern: hex.guaCiModern });
      if (chex) out.parts.push({ t: '变卦卦辞', classical: chex.guaCi, modern: chex.guaCiModern });
    } else if (n === 4 || n === 5) {
      out.rule = (n === 4 ? '四' : '五') + '爻动，变卦为主，本卦为辅';
      if (chex) out.parts.push({ t: '变卦卦辞（为主）', classical: chex.guaCi, modern: chex.guaCiModern });
      out.parts.push({ t: '本卦卦辞（参考）', classical: hex.guaCi, modern: hex.guaCiModern });
    } else {
      if (hex.id === 1 && hex.yaoCi[6]) {
        out.rule = '六爻全动，乾以用九断';
        out.parts.push({ t: '用九', classical: hex.yaoCi[6], modern: ymod(hex, 6) });
      } else if (hex.id === 2 && hex.yaoCi[6]) {
        out.rule = '六爻全动，坤以用六断';
        out.parts.push({ t: '用六', classical: hex.yaoCi[6], modern: ymod(hex, 6) });
      } else {
        out.rule = '六爻全动，以变卦卦辞断';
        if (chex) out.parts.push({ t: '变卦卦辞', classical: chex.guaCi, modern: chex.guaCiModern });
      }
    }
    return out;
  }

  function shortName(hex) {
    var m = String(hex.fullName || '').match(/（(.+?)卦）/);
    return m ? m[1] : hex.name;
  }

  window.YijingCore = {
    castOneLine: castOneLine,
    linesToKey: linesToKey,
    changedKey: changedKey,
    getHex: getHex,
    judge: judge,
    shortName: shortName,
    toTrad: toTrad,
    YAO_NAMES: YAO_NAMES
  };
})();
