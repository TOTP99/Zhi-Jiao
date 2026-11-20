// ============================================================
// 紫微斗数：排盘引擎 + 命盘弹窗（自研算法；十二宫自命宫起按逆时针排列）
// 读共用生辰档案 yumiao_shared_birth_v1，直接显示完整命盘
// ============================================================
(function () {
  'use strict';

  /* ────────── 农历换算（1900–2100，自研数据表） ────────── */
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  /* 农历换算已抽到共享模块 js/00a-lunar.js（以本文件的表为准）；此处改调 window.YumiaoLunar.solarToLunar */
  function hourToDiZhi(h) {
    return ZHI[yumiaoMod(Math.floor(((h % 24) + 1) / 2), 12)];
  }

  /* ────────── 紫微斗数排盘引擎 ────────── */
  var PALACES = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'];
  var SIHUA = {
    '甲': ['廉贞','破军','武曲','太阳'], '乙': ['天机','天梁','紫微','太阴'],
    '丙': ['天同','天机','文昌','廉贞'], '丁': ['太阴','天同','天机','巨门'],
    '戊': ['贪狼','太阴','右弼','天机'], '己': ['武曲','贪狼','天梁','文曲'],
    '庚': ['太阳','武曲','太阴','天同'], '辛': ['巨门','太阳','文曲','文昌'],
    '壬': ['天梁','紫微','左辅','武曲'], '癸': ['破军','巨门','太阴','贪狼']
  };
  var SIHUA_NAME = ['禄','权','科','忌'];
  var MINGZHU = ['贪狼','巨门','禄存','文曲','廉贞','武曲','破军','武曲','廉贞','文曲','禄存','巨门'];
  var SHENZHU = ['火星','天相','天梁','天同','文昌','天机','火星','天相','天梁','天同','文昌','天机'];

  function firstMonthGan(yearGan) {
    return { '甲': 2, '己': 2, '乙': 4, '庚': 4, '丙': 6, '辛': 6, '丁': 8, '壬': 8, '戊': 0, '癸': 0 }[yearGan];
  }
  function effectiveMonth(lunar, yearGan) {
    var m = lunar.month, yg = yearGan;
    if (lunar.isLeap && lunar.day > 15) {
      m += 1;
      if (m > 12) { m = 1; yg = GAN[yumiaoMod(GAN.indexOf(yg) + 1, 10)]; }
    }
    return { month: m, yearGan: yg };
  }
  function mingBranch(eMonth, hourZhi) { return yumiaoMod(2 + (eMonth - 1) - ZHI.indexOf(hourZhi), 12); }
  function shenBranch(eMonth, hourZhi) { return yumiaoMod(2 + (eMonth - 1) + ZHI.indexOf(hourZhi), 12); }
  function palaceGan(eYearGan, branch) { return GAN[yumiaoMod(firstMonthGan(eYearGan) + yumiaoMod(branch - 2, 12), 10)]; }

  var JU_NUM = { '水': 2, '木': 3, '金': 4, '土': 5, '火': 6 };
  var JU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
  function wuXingJu(mingGanZhi) {
    var g = GAN.indexOf(mingGanZhi[0]), z = ZHI.indexOf(mingGanZhi[1]);
    var s = Math.floor(g / 2) + 1 + Math.floor(yumiaoMod(z, 6) / 2) + 1;
    while (s > 5) s -= 5;
    var wx = ['木', '金', '水', '火', '土'][s - 1];
    return { num: JU_NUM[wx], name: JU_NAME[JU_NUM[wx]] };
  }
  function ziweiBranch(day, juNum) {
    var offset = -1, divisor, q;
    do { offset++; divisor = day + offset; q = Math.floor(divisor / juNum); }
    while (divisor % juNum !== 0);
    q = q % 12;
    var p = q - 1;
    if (offset % 2 === 0) p += offset; else p -= offset;
    return yumiaoMod(p + 2, 12);
  }
  function majorStars(zw) {
    var tf = yumiaoMod(4 - zw, 12), s = {};
    s['紫微'] = zw;
    s['天机'] = yumiaoMod(zw - 1, 12);
    s['太阳'] = yumiaoMod(zw - 3, 12);
    s['武曲'] = yumiaoMod(zw - 4, 12);
    s['天同'] = yumiaoMod(zw - 5, 12);
    s['廉贞'] = yumiaoMod(zw - 8, 12);
    s['天府'] = tf;
    s['太阴'] = yumiaoMod(tf + 1, 12);
    s['贪狼'] = yumiaoMod(tf + 2, 12);
    s['巨门'] = yumiaoMod(tf + 3, 12);
    s['天相'] = yumiaoMod(tf + 4, 12);
    s['天梁'] = yumiaoMod(tf + 5, 12);
    s['七杀'] = yumiaoMod(tf + 6, 12);
    s['破军'] = yumiaoMod(tf + 10, 12);
    return s;
  }
  function auxStars(eMonth, hourZhi, yearGan, yearZhi, lunarDay, mingBr, shenBr) {
    var hz = ZHI.indexOf(hourZhi), m0 = eMonth - 1;
    var yg = GAN.indexOf(yearGan), yz = ZHI.indexOf(yearZhi);
    var sanhe = yz % 4, s = {};
    s['文昌'] = yumiaoMod(10 - hz, 12);
    s['文曲'] = yumiaoMod(4 + hz, 12);
    s['左辅'] = yumiaoMod(4 + m0, 12);
    s['右弼'] = yumiaoMod(10 - m0, 12);
    s['天魁'] = [1, 0, 11, 11, 1, 0, 1, 6, 3, 3][yg];
    s['天钺'] = [7, 8, 9, 9, 7, 8, 7, 2, 5, 5][yg];
    var lu = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][yg];
    s['禄存'] = lu;
    s['擎羊'] = yumiaoMod(lu + 1, 12);
    s['陀罗'] = yumiaoMod(lu - 1, 12);
    s['天马'] = [2, 11, 8, 5][sanhe];
    s['火星'] = yumiaoMod([2, 3, 1, 9][sanhe] + hz, 12);
    s['铃星'] = yumiaoMod([10, 10, 3, 10][sanhe] + hz, 12);
    s['地劫'] = yumiaoMod(11 + hz, 12);
    s['地空'] = yumiaoMod(11 - hz, 12);
    var hl = yumiaoMod(3 - yz, 12);
    s['红鸾'] = hl;
    s['天喜'] = yumiaoMod(hl + 6, 12);
    s['天刑'] = yumiaoMod(9 + m0, 12);
    s['天姚'] = yumiaoMod(1 + m0, 12);
    s['天哭'] = yumiaoMod(6 - yz, 12);
    s['天虚'] = yumiaoMod(6 + yz, 12);
    s['龙池'] = yumiaoMod(4 + yz, 12);
    s['凤阁'] = yumiaoMod(10 - yz, 12);
    var d0 = lunarDay - 1;
    s['三台'] = yumiaoMod(s['左辅'] + d0, 12);
    s['八座'] = yumiaoMod(s['右弼'] - d0, 12);
    s['恩光'] = yumiaoMod(s['文昌'] + d0 - 1, 12);
    s['天贵'] = yumiaoMod(s['文曲'] + d0 - 1, 12);
    s['孤辰'] = [2, 2, 5, 5, 5, 8, 8, 8, 11, 11, 11, 2][yz];
    s['寡宿'] = [10, 10, 1, 1, 1, 4, 4, 4, 7, 7, 7, 10][yz];
    s['华盖'] = [4, 1, 10, 7][sanhe];
    s['咸池'] = [9, 6, 3, 0][sanhe];
    s['天才'] = yumiaoMod(mingBr + yz, 12);
    s['天寿'] = yumiaoMod(shenBr + yz, 12);
    s['蜚廉'] = [8, 9, 10, 5, 6, 7, 2, 3, 4, 11, 0, 1][yz];
    s['破碎'] = [5, 1, 9][yz % 3];
    s['天德'] = yumiaoMod(9 + yz, 12);
    s['月德'] = yumiaoMod(5 + yz, 12);
    s['天空'] = yumiaoMod(yz + 1, 12);
    s['天官'] = [7, 4, 5, 2, 3, 9, 11, 9, 10, 6][yg];
    s['天福'] = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5][yg];
    s['天厨'] = [5, 6, 0, 5, 6, 8, 2, 6, 9, 11][yg];
    s['截路'] = [8, 6, 4, 2, 0][yg % 5];
    s['空亡'] = [9, 7, 5, 3, 1][yg % 5];
    var xk = yumiaoMod(yumiaoMod(yz - 2, 12) + 9 - yg + 1, 12);
    if ((yz % 2) !== (xk % 2)) xk = yumiaoMod(xk + 1, 12);
    s['旬空'] = yumiaoMod(xk + 2, 12);
    s['解神'] = [8, 10, 0, 2, 4, 6][Math.floor(m0 / 2)];
    s['阴煞'] = [2, 0, 10, 8, 6, 4][m0 % 6];
    s['天月'] = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2][m0];
    s['天巫'] = [5, 8, 2, 11][m0 % 4];
    s['年解'] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 11][yz];
    s['台辅'] = yumiaoMod(6 + hz, 12);
    s['封诰'] = yumiaoMod(2 + hz, 12);
    s['天使'] = yumiaoMod(mingBr + 7, 12);
    s['天伤'] = yumiaoMod(mingBr + 5, 12);
    return s;
  }
  /* ────────── 三组十二神 + 庙旺亮度 + 天罗地网（v3.0 补） ────────── */
  /* 博士十二神：自禄存起，阳男阴女顺行、阴男阳女逆行 */
  var BOSHI = ['博士','力士','青龙','小耗','将军','奏书','飞廉','喜神','病符','大耗','伏兵','官府'];
  /* 将前十二神：自将星（寅午戌→午、申子辰→子、巳酉丑→酉、亥卯未→卯）起，顺行 */
  var JIANGQIAN = ['将星','攀鞍','岁驿','息神','华盖','劫煞','灾煞','天煞','指背','咸池','月煞','亡神'];
  /* 岁前十二星：自年支起，顺行 */
  var SUIQIAN = ['岁建','晦气','丧门','贯索','官符','小耗','大耗','龙德','白虎','天德','吊客','病符'];
  function twelveGods(lu, yearZhiIdx, isYangGender) {
    var dir = isYangGender ? 1 : -1, bs = {}, jq = {}, sq = {};
    var jStart = [0, 9, 6, 3][yearZhiIdx % 4];
    for (var i = 0; i < 12; i++) {
      bs[BOSHI[i]] = yumiaoMod(lu + dir * i, 12);
      jq[JIANGQIAN[i]] = yumiaoMod(jStart + i, 12);
      sq[SUIQIAN[i]] = yumiaoMod(yearZhiIdx + i, 12);
    }
    return { boshi: bs, jiangqian: jq, suiqian: sq };
  }
  /* 十四主星庙旺利陷（子丑寅…亥；依《紫微斗数全书》〈命宫〉，各版少数格有出入，取通行排盘程序口径）
     庙=庙 旺=旺 得=得地 利=利益 平=平和 不=不得地 陷=落陷 */
  var BRIGHT = {
    '紫微': '平庙旺旺得旺庙庙旺旺得旺', '天机': '庙陷得旺利平庙陷得旺利平',
    '太阳': '陷不旺庙旺旺旺得得平不陷', '武曲': '旺庙得利庙平旺庙得利庙平',
    '天同': '旺不利平平庙陷不旺平平庙', '廉贞': '平利庙平利陷平利庙平利陷',
    '天府': '庙庙庙得庙得旺庙得旺庙得', '太阴': '庙庙旺陷陷陷不不利旺旺庙',
    '贪狼': '旺庙平利庙陷旺庙平利庙陷', '巨门': '旺不庙庙陷旺旺不庙庙陷旺',
    '天相': '庙庙庙陷得得庙得庙陷得得', '天梁': '庙旺庙庙庙陷庙旺陷得庙陷',
    '七杀': '旺庙庙旺庙平旺庙庙旺庙平', '破军': '庙旺得陷旺平庙旺得陷旺平'
  };
  function brightness(star, branchIdx) {
    var row = BRIGHT[star];
    return row ? row.charAt(yumiaoMod(branchIdx, 12)) : '';
  }
  /* 天罗地网：辰为天罗、戌为地网（固定宫位，命宫/他宫落此二支者另论） */
  var TIANLUO = 4, DIWANG = 10;
  function netOf(branchIdx) { return branchIdx === TIANLUO ? '天罗' : (branchIdx === DIWANG ? '地网' : ''); }

  var CHANGSHENG = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'];
  function changsheng(juNum, isYangGender) {
    var start = { 2: 8, 5: 8, 3: 11, 6: 2, 4: 5 }[juNum];
    var dir = isYangGender ? 1 : -1, s = {};
    for (var i = 0; i < 12; i++) s[CHANGSHENG[i]] = yumiaoMod(start + dir * i, 12);
    return s;
  }
  function daxian(mingBr, eYearGan, juNum, isYangGender) {
    var dir = isYangGender ? 1 : -1, out = [];
    for (var i = 0; i < 12; i++) {
      var br = yumiaoMod(mingBr + dir * i, 12), start = juNum + i * 10;
      out.push({ branch: br, ganzhi: palaceGan(eYearGan, br) + ZHI[br], from: start, to: start + 9 });
    }
    return out;
  }
  /* 入参校验：小时必须 0–23 的整数（取模会把 24 当子时）；性别只认「男 / 女」（其余值会被当阴性，改变大限顺逆与十二神）；
     日期是否真实存在由 solarToLunar 把关；农历模块缺失时给出明确报错而不是 TypeError。 */
  function inputError(msg) { var e = new Error(msg); e.name = 'ZiweiInputError'; e.isInputError = true; return e; }
  function validateOpt(opt) {
    if (!opt || typeof opt !== 'object') throw inputError('缺少排盘参数');
    if (!window.YumiaoLunar || typeof window.YumiaoLunar.solarToLunar !== 'function') throw new Error('农历换算模块未加载（js/00a-lunar.js）');
    if (typeof opt.hour !== 'number' || !isFinite(opt.hour) || Math.floor(opt.hour) !== opt.hour || opt.hour < 0 || opt.hour > 23) throw inputError('出生小时应为 0–23 的整数');
    if (opt.gender !== '男' && opt.gender !== '女') throw inputError('性别应为「男」或「女」');
  }
  function chart(opt) {
    validateOpt(opt);
    var lunar = window.YumiaoLunar.solarToLunar(opt.year, opt.month, opt.day);
    if (!lunar) throw inputError('日期不存在或超出范围（1900–2100）');
    var hourZhi = hourToDiZhi(opt.hour);
    var yearGan = lunar.yearGanZhi[0], yearZhi = lunar.yearGanZhi[1];
    var isYang = '甲丙戊庚壬'.indexOf(yearGan) >= 0;
    var isYangGender = (isYang && opt.gender === '男') || (!isYang && opt.gender === '女');
    var eff = effectiveMonth(lunar, yearGan);
    var ming = mingBranch(eff.month, hourZhi);
    var shen = shenBranch(eff.month, hourZhi);
    var mingGZ = palaceGan(eff.yearGan, ming) + ZHI[ming];
    var ju = wuXingJu(mingGZ);
    var zw = ziweiBranch(lunar.day, ju.num);
    var majors = majorStars(zw);
    var aux = auxStars(eff.month, hourZhi, yearGan, yearZhi, lunar.day, ming, shen);
    var palaces = [];
    for (var i = 0; i < 12; i++) {
      var br = yumiaoMod(ming - i, 12); // 十二宫逆时针：命宫→兄弟→夫妻……，地支递减
      palaces.push({ name: PALACES[i], branch: ZHI[br], ganzhi: palaceGan(eff.yearGan, br) + ZHI[br] });
    }
    var sihua = SIHUA[yearGan], sihuaMap = {};
    for (var k = 0; k < 4; k++) sihuaMap[sihua[k]] = SIHUA_NAME[k];
    return {
      input: opt, lunar: lunar, hourZhi: hourZhi, yearGanZhi: lunar.yearGanZhi,
      mingBranch: ZHI[ming], shenBranch: ZHI[shen], mingGanzhi: mingGZ, ju: ju,
      ziweiBranch: ZHI[zw], palaces: palaces, majorStars: majors, auxStars: aux,
      sihua: sihuaMap, changsheng: changsheng(ju.num, isYangGender),
      daxian: daxian(ming, eff.yearGan, ju.num, isYangGender),
      mingzhu: MINGZHU[ming], shenzhu: SHENZHU[ZHI.indexOf(yearZhi)],
      gods: twelveGods(aux['禄存'], ZHI.indexOf(yearZhi), isYangGender),
      brightness: function (star, br) { return brightness(star, typeof br === 'string' ? ZHI.indexOf(br) : br); },
      net: function (br) { return netOf(typeof br === 'string' ? ZHI.indexOf(br) : br); }
    };
  }

  /* ────────── 弹窗界面 ────────── */
  var LAYOUT = [
    ['巳',1,1],['午',1,2],['未',1,3],['申',1,4],
    ['辰',2,1],['CENTER',2,2],['酉',2,4],
    ['卯',3,1],['戌',3,4],
    ['寅',4,1],['丑',4,2],['子',4,3],['亥',4,4]
  ];
  function starsIn(c, br) {
    var out = [];
    Object.keys(c.majorStars).forEach(function (nm) {
      if (ZHI[c.majorStars[nm]] !== br) return;
      var mh = c.sihua[nm] ? '<i class="zw-hua">' + c.sihua[nm] + '</i>' : '';
      var bl = brightness(nm, ZHI.indexOf(br));
      out.push('<span class="zw-major">' + escapeHtml(nm) + '</span>' + (bl ? '<i class="zw-br">' + bl + '</i>' : '') + mh);
    });
    Object.keys(c.auxStars).forEach(function (nm) {
      if (ZHI[c.auxStars[nm]] !== br) return;
      var mh2 = c.sihua[nm] ? '<i class="zw-hua">' + c.sihua[nm] + '</i>' : '';
      out.push('<span class="zw-minor">' + escapeHtml(nm) + '</span>' + mh2);
    });
    return out.join(' ');
  }
  function renderChart(c) {
    function palaceOf(br) { return c.palaces.find(function (p) { return p.branch === br; }); }
    var h = '<div class="zw-board">';
    LAYOUT.forEach(function (item) {
      var br = item[0];
      if (br === 'CENTER') {
        h += '<div class="zw-cell zw-center zw-tap zw-center" onclick="openZwCenter()" role="button" tabindex="0">' +
          '<div class="zw-center-title">紫微斗数</div>' +
          '<div>农历 ' + c.lunar.year + '年' + (c.lunar.isLeap ? '闰' : '') + c.lunar.month + '月' + c.lunar.day + '日 ' + escapeHtml(c.hourZhi) + '时</div>' +
          '<div>' + escapeHtml(c.yearGanZhi) + '年 · ' + escapeHtml(c.input.gender) + '命</div>' +
          '<div>命宫 <b>' + escapeHtml(c.mingGanzhi) + '</b> · 身居' + escapeHtml(c.shenBranch) + '</div>' +
          '<div>' + escapeHtml(c.ju.name) + ' · 命主' + escapeHtml(c.mingzhu) + ' · 身主' + escapeHtml(c.shenzhu) + '</div></div>';
        return;
      }
      var p = palaceOf(br);
      var dx = c.daxian.find(function (x) { return ZHI[x.branch] === br; });
      h += '<div class="zw-cell zw-tap" style="grid-row:' + item[1] + ';grid-column:' + item[2] + ';" onclick="openZwPalace(\'' + p.name + '\')" role="button" tabindex="0">' +
        '<div class="zw-palace"><span class="zw-palace-name">' + escapeHtml(p.name) + '</span><span class="zw-ganzhi">' + escapeHtml(p.ganzhi) + '</span></div>' +
        '<div class="zw-stars">' + starsIn(c, br) + '</div>' +
        '<div class="zw-daxian">' + dx.from + '–' + dx.to + '岁</div></div>';
    });
    h += '</div>';
    // 四化表
    var sh = Object.keys(c.sihua).map(function (nm) {
      return '<span class="zw-sh">' + escapeHtml(nm) + '<i class="zw-hua">' + c.sihua[nm] + '</i></span>';
    }).join('');
    h += '<div class="mbti-report"><div class="mbti-sec zw-tap" onclick="openZwSihua()" role="button" tabindex="0"><span class="mbti-sec-label">生年四化</span>' + sh + '</div>';
    // 大限表
    var dxh = c.daxian.map(function (x) {
      return '<span class="zw-dx">' + escapeHtml(x.ganzhi) + x.from + '–' + x.to + '</span>';
    }).join('');
    h += '<div class="mbti-sec zw-tap" onclick="openZwDaxian()" role="button" tabindex="0"><span class="mbti-sec-label">大限</span>' + dxh + '</div>' + ziweiCalcNoteHTML(c) + '</div>';
    return h;
  }
  /* v2.20（v3.0 重建）：紫微「计算说明」（纯函数，不碰 DOM；缺失数据时该条省略，不写假话） */
  function ziweiCalcNoteHTML(c) {
    if (!c || !c.lunar || !c.ju) return '';
    var meta = c._calcMeta, items = [], inp = c.input || {}, lu = c.lunar;
    items.push('农历 ' + lu.year + '年' + (lu.isLeap ? '闰' : '') + lu.month + '月' + lu.day + '日（公历 ' + inp.year + '-' + inp.month + '-' + inp.day + ' 换算）');
    if (lu.isLeap) {
      var em = effectiveMonth(lu, (c.yearGanZhi || ' ')[0]).month;
      items.push('闰月按半月制：十五日及以前并入本月，十六日起并入下月；本盘按 ' + em + ' 月起盘（与称骨一致）');
    }
    if (c.yearGanZhi) items.push('年干支 ' + c.yearGanZhi + '，以农历正月初一换年，不以立春');
    if (meta) {
      items.push(meta.dstAdjusted ? '出生时当地实行夏令时，已回拨到标准时' : '未做夏令时回拨');
      items.push(meta.hourDefaulted ? '出生时间未填，按午时（12:00）计算' : '出生时辰 ' + c.hourZhi + '时（以档案为准）');
    }
    items.push('命宫 ' + c.mingGanzhi + '，身宫在 ' + c.shenBranch + ' 宫');
    items.push('五行局：' + c.ju.name);
    items.push('紫微星在 ' + c.ziweiBranch + '宫');
    if (c.daxian && c.daxian[0]) items.push('大限自 ' + c.daxian[0].from + ' 岁起运，每限十年');
    if (c.yearGanZhi) items.push('四化按生年天干 ' + c.yearGanZhi[0] + ' 取');
    items.push('星曜庙旺与十二神按通行口径，各流派略有出入，仅供参考');
    return '<details class="ziwei-calc-note"><summary>计算说明</summary><ul>' + items.map(function (x) { return '<li>' + escapeHtml(x) + '</li>'; }).join('') + '</ul></details>';
  }
  window.YumiaoZiweiCalcNote = ziweiCalcNoteHTML;
  function openZiwei() {
    if (typeof window.renderProfileBar === 'function') window.renderProfileBar('ziweiProfileBar');
    var body = document.getElementById('ziweiBody');
    var b = (typeof readBirth === 'function') ? readBirth({ dst: true, validate: true, shape: true }) : null;
    if (!b) {
      body.innerHTML = '<p class="mbti-intro">请先到「我的」录入生辰档案。</p>';
    } else {
      try {
        var c = chart({ year: b.year, month: b.month, day: b.day, hour: b.hour, gender: b.gender });
        var raw = readBirth({ validate: true }), std = readBirth({ dst: true, validate: true });
        c._calcMeta = { hourDefaulted: !!(raw && (raw.hour == null || raw.hour === '')), dstAdjusted: !!(std && std._dstAdjusted) };
        zwCurrent = c; // 供子弹窗取数
        body.innerHTML = renderChart(c);
        if (typeof saveReportHTML === 'function') {
          /* 只存报告片段（.mbti-report：四化/大限摘要），不存交互命盘（.zw-board） */
          var _rep = body.querySelector('.mbti-report');
          saveReportHTML('yumiao_report_ziwei_v1', '紫微斗数', 'ziweiBody', _rep ? _rep.outerHTML : null);
        }
      } catch (e) {
        body.innerHTML = '<p class="mbti-intro">排盘失败，请检查生辰档案是否正确。</p>';
      }
    }
    if (typeof ModalUI !== 'undefined' && ModalUI.open) ModalUI.open('ziwei');
  }
  function closeZiwei() {
    closeZwPop();
    if (typeof ModalUI !== 'undefined' && ModalUI.close) ModalUI.close('ziwei');
  }
  /* ── 子弹窗：宫格即按钮，底图模糊，说明分层递进 ── */
  var zwCurrent = null; // 当前命盘，供弹窗取数
  var ZW_PALACE_MEAN = {
    '命宫': '性格、天赋与一生格局，命盘的核心',
    '兄弟': '兄弟姐妹、朋友助力与团队缘',
    '夫妻': '感情婚姻、亲密关系与合作对象',
    '子女': '子女缘、创作力与晚辈关系',
    '财帛': '赚钱方式、理财习惯与物质欲',
    '疾厄': '体质健康、潜在病灶与心理状态',
    '迁移': '外出发展、旅行运与给人的第一印象',
    '交友': '朋友下属、人际网络与贵人小人',
    '官禄': '事业方向、工作态度与成就高低',
    '田宅': '房产置业、家庭环境与不动产运',
    '福德': '精神生活、兴趣爱好与晚年福气',
    '父母': '父母长辈、师长缘与家庭背景'
  };
  var ZW_STAR_MEAN = {
    '紫微': '帝星：有主见、好面子，天生的领导者',
    '天机': '谋星：机智善变，宜动脑、策划',
    '太阳': '贵星：光明博爱，主名声，乐于付出',
    '武曲': '财星：刚毅果决，正财得力',
    '天同': '福星：温和安逸，知足常乐',
    '廉贞': '精明多才，公关能力强',
    '天府': '库星：稳重守成，天生的"财库"',
    '太阴': '富星：温柔细腻，主积蓄与不动产',
    '贪狼': '多才多艺、交际广，宜用才华',
    '巨门': '口才好、观察深，宜靠嘴吃饭',
    '天相': '热心助人、重承诺，宜服务管理',
    '天梁': '稳重，有长者缘，宜医疗教育',
    '七杀': '果断敢冲，开创力强',
    '破军': '破旧立新，变动大，宜创新行业'
  };
  var ZW_HUA_MEAN = { '禄': '得益顺遂', '权': '掌控奋进', '科': '名声贵人', '忌': '阻滞执念' };
  function zwPop(title, html) {
    var bd = document.getElementById('zwPopBackdrop');
    var t = document.getElementById('zwPopTitle');
    var b = document.getElementById('zwPopBody');
    if (!bd || !t || !b) return;
    t.textContent = title;
    b.innerHTML = html;
    b.scrollTop = 0;
    bd.classList.add('show');
    if (window.YumiaoNav) window.YumiaoNav.noteOpened('zwPop', 'zwpop');
    if (typeof YumiaoSound !== 'undefined') YumiaoSound.pop();
  }
  function closeZwPop() {
    var bd = document.getElementById('zwPopBackdrop');
    if (bd && bd.classList.contains('show')) {
      bd.classList.remove('show');
      if (typeof YumiaoSound !== 'undefined') YumiaoSound.close();
    } else if (bd) {
      bd.classList.remove('show');
    }
    if (window.YumiaoNav) window.YumiaoNav.noteClosed('zwPop');
  }
  function zwMoreBtn(fn) {
    return '<button type="button" class="zw-more" onclick="' + fn + '">详细说明</button>';
  }
  function zwBackBtn(fn) {
    return '<button type="button" class="btn-back" onclick="' + fn + '">← 返回上一层</button>';
  }
  // 某宫的星曜（含四化）
  function zwPalaceStars(palaceName) {
    if (!zwCurrent) return '';
    var p = zwCurrent.palaces.filter(function (x) { return x.name === palaceName; })[0];
    if (!p) return '';
    var out = [];
    Object.keys(zwCurrent.majorStars).forEach(function (nm) {
      if (ZHI[zwCurrent.majorStars[nm]] === p.branch)
        out.push('<b>' + escapeHtml(nm) + '</b>' + (zwCurrent.sihua[nm] ? '<i class="zw-hua">' + zwCurrent.sihua[nm] + '</i>' : ''));
    });
    Object.keys(zwCurrent.auxStars).forEach(function (nm) {
      if (ZHI[zwCurrent.auxStars[nm]] === p.branch)
        out.push(escapeHtml(nm) + (zwCurrent.sihua[nm] ? '<i class="zw-hua">' + zwCurrent.sihua[nm] + '</i>' : ''));
    });
    return out.length ? out.join('、') : '（空宫，对宫星曜借来看）';
  }
  // 十二宫弹窗 · 第一层（一句话）
  function openZwPalace(name) {
    var p = zwCurrent ? zwCurrent.palaces.filter(function (x) { return x.name === name; })[0] : null;
    var h = '<div><b>' + escapeHtml(name) + '</b>：' + escapeHtml(ZW_PALACE_MEAN[name] || '') + '</div>';
    if (p) h += '<div class="mt-8">本宫星曜：' + zwPalaceStars(name) + '</div>';
    h += zwMoreBtn("openZwPalace2('" + name + "')");
    zwPop(name, h);
  }
  // 十二宫弹窗 · 第二层（详细）
  function openZwPalace2(name) {
    var h = '<div><b>' + escapeHtml(name) + '</b>：' + escapeHtml(ZW_PALACE_MEAN[name] || '') + '</div>';
    h += '<div class="mt-8">本宫星曜：' + zwPalaceStars(name) + '</div>';
    if (zwCurrent) {
      var p = zwCurrent.palaces.filter(function (x) { return x.name === name; })[0];
      var majors = [];
      Object.keys(zwCurrent.majorStars).forEach(function (nm) {
        if (ZHI[zwCurrent.majorStars[nm]] === p.branch) majors.push(nm);
      });
      if (majors.length) {
        h += '<div class="mt-8">' + majors.map(function (nm) {
          return '· <b>' + escapeHtml(nm) + '</b>' + (zwCurrent.sihua[nm] ? '<i class="zw-hua">' + zwCurrent.sihua[nm] + '</i>' : '') +
            '：' + escapeHtml(ZW_STAR_MEAN[nm] || '吉星') +
            (zwCurrent.sihua[nm] ? '（化' + zwCurrent.sihua[nm] + '：' + ZW_HUA_MEAN[zwCurrent.sihua[nm]] + '）' : '');
        }).join('<br>') + '</div>';
      }
    }
    if (zwCurrent) {
      var pp = zwCurrent.palaces.filter(function (x) { return x.name === name; })[0], bi = ZHI.indexOf(pp.branch);
      function godsAt(map) { return Object.keys(map).filter(function (k) { return map[k] === bi; }); }
      var gl = [['博士十二神', godsAt(zwCurrent.gods.boshi)], ['将前十二神', godsAt(zwCurrent.gods.jiangqian)], ['岁前十二星', godsAt(zwCurrent.gods.suiqian)]];
      h += '<div class="mt-8">' + gl.map(function (g) { return escapeHtml(g[0]) + '：<b>' + escapeHtml(g[1].join('、')) + '</b>'; }).join('<br>') + '</div>';
      var cs = Object.keys(zwCurrent.changsheng).filter(function (k) { return zwCurrent.changsheng[k] === bi; })[0];
      if (cs) h += '<div class="mt-6">长生十二神：<b>' + escapeHtml(cs) + '</b></div>';
      var nt = netOf(bi);
      if (nt) h += '<div class="mt-6">此宫为<b>' + nt + '</b>：' + (nt === '天罗' ? '辰为天罗' : '戌为地网') + '，主受牵绊，宜守不宜躁；星曜得力者可化解。</div>';
    }
    h += zwBackBtn("openZwPalace('" + name + "')");
    zwPop(name + ' · 详解', h);
  }
  // 中央命盘弹窗 · 第一层（最简）
  function openZwCenter() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    var h = '<div>你的性格底盘在<b>命宫' + escapeHtml(c.mingGanzhi) + '</b>；</div>';
    h += '<div class="mt-6">中年后重心看<b>身宫（' + escapeHtml(c.shenBranch) + '）</b>；</div>';
    h += '<div class="mt-6"><b>' + escapeHtml(c.ju.name) + '</b>，' + c.ju.num + '岁起运，十年一换大限。</div>';
    h += zwMoreBtn('openZwCenter2()');
    zwPop('命盘总览', h);
  }
  // 中央命盘弹窗 · 第二层（详细）
  function openZwCenter2() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    var h = '<div><b>命宫' + escapeHtml(c.mingGanzhi) + '</b>：先天性格与一生格局，整张盘的核心。</div>';
    h += '<div class="mt-6"><b>身宫居' + escapeHtml(c.shenBranch) + '</b>：后天修为与归宿，中年后影响渐重；命身同宫者表里如一。</div>';
    h += '<div class="mt-6"><b>' + escapeHtml(c.ju.name) + '</b>：决定起运早晚，局数越小起运越早。</div>';
    h += '<div class="mt-6"><b>命主' + escapeHtml(c.mingzhu) + '</b>、<b>身主' + escapeHtml(c.shenzhu) + '</b>：命身二宫的守护星，辅助参看吉凶。</div>';
    h += '<div class="mt-6">十四主星：' + Object.keys(ZW_STAR_MEAN).map(function (k) {
      return '<br>· <b>' + k + '</b>：' + ZW_STAR_MEAN[k];
    }).join('') + '</div>';
    h += zwBackBtn('openZwCenter()');
    zwPop('命盘总览 · 详解', h);
  }
  // 生年四化弹窗 · 第一层
  function openZwSihua() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    var h = '<div>出生年天干带来的四种变化，标在星名右上角小圈里：</div>';
    h += '<div class="mt-6">' + Object.keys(c.sihua).map(function (nm) {
      return '· <b>' + escapeHtml(nm) + '</b>化<b>' + c.sihua[nm] + '</b>（' + ZW_HUA_MEAN[c.sihua[nm]] + '）';
    }).join('<br>') + '</div>';
    h += zwMoreBtn('openZwSihua2()');
    zwPop('生年四化', h);
  }
  function openZwSihua2() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    function palaceOfStar(nm) {
      var br = c.majorStars[nm] != null ? ZHI[c.majorStars[nm]] : (c.auxStars[nm] != null ? ZHI[c.auxStars[nm]] : null);
      if (br == null) return '';
      var p = c.palaces.filter(function (x) { return x.branch === br; })[0];
      return p ? p.name : '';
    }
    var h = '<div>' + Object.keys(c.sihua).map(function (nm) {
      return '· <b>' + escapeHtml(nm) + '</b>化<b>' + c.sihua[nm] + '</b>在<b>' + escapeHtml(palaceOfStar(nm)) + '</b>：' +
        ZW_HUA_MEAN[c.sihua[nm]] + '之力落在此宫';
    }).join('<br>') + '</div>';
    h += '<div class="note">化忌所在之宫，是这辈子最费心的地方；化禄所在，多有得益。</div>';
    h += zwBackBtn('openZwSihua()');
    zwPop('生年四化 · 详解', h);
  }
  // 大限弹窗 · 第一层
  function openZwDaxian() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    var now = new Date().getFullYear() - c.input.year + 1; // 虚岁
    var cur = c.daxian.filter(function (x) { return now >= x.from && now <= x.to; })[0] || c.daxian[0];
    var h = '<div>大限是十年一站的运势车站，每十年走一宫。</div>';
    h += '<div class="mt-6">你今年虚岁<b>' + now + '</b>，正走<b>' + escapeHtml(cur.ganzhi) + '（' + cur.from + '–' + cur.to + '岁）</b>大限。</div>';
    h += zwMoreBtn('openZwDaxian2()');
    zwPop('大限', h);
  }
  function openZwDaxian2() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    var h = '<div>' + c.daxian.map(function (x) {
      var p = c.palaces.filter(function (pl) { return ZHI[x.branch] === pl.branch; })[0];
      return '· <b>' + escapeHtml(x.ganzhi) + '</b> ' + x.from + '–' + x.to + '岁（' + escapeHtml(p ? p.name : '') + '）';
    }).join('<br>') + '</div>';
    h += '<div class="note">看某阶段运势，重心落在该大限之宫，合参本命盘同宫星曜一起看。</div>';
    h += zwBackBtn('openZwDaxian()');
    zwPop('大限 · 详解', h);
  }
  window.openZiwei = openZiwei;
  window.closeZiwei = closeZiwei;
  window.openZwPalace = openZwPalace;
  window.openZwPalace2 = openZwPalace2;
  window.openZwCenter = openZwCenter;
  window.openZwCenter2 = openZwCenter2;
  window.openZwSihua = openZwSihua;
  window.openZwSihua2 = openZwSihua2;
  window.openZwDaxian = openZwDaxian;
  window.openZwDaxian2 = openZwDaxian2;
  window.closeZwPop = closeZwPop;
  window.ZiweiChart = chart; // 供 tests.html 调用
  window.ZiweiTables = { BOSHI: BOSHI, JIANGQIAN: JIANGQIAN, SUIQIAN: SUIQIAN, BRIGHT: BRIGHT };
})();
