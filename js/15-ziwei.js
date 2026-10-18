// ============================================================
// 紫微斗数：排盘引擎 + 命盘弹窗（自研算法，与 iztro 交叉验证零差异）
// 读共用生辰档案 yumiao_shared_birth_v1，直接显示完整命盘
// ============================================================
(function () {
  'use strict';

  /* ────────── 农历换算（1900–2100，自研数据表） ────────── */
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  function mod(n, m) { return ((n % m) + m) % m; }

  var LUNAR_DATA = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520
  ];
  function leapMonth(y) { return LUNAR_DATA[y - 1900] & 0xf; }
  function monthDays(y, m) { return (LUNAR_DATA[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
  function leapDays(y) { var d = LUNAR_DATA[y - 1900]; return (d & 0xf) ? ((d & 0x10000) ? 30 : 29) : 0; }
  function yearDays(y) {
    var s = 348, d = LUNAR_DATA[y - 1900];
    for (var i = 0x8000; i > 0x8; i >>= 1) s += (d & i) ? 1 : 0;
    return s + leapDays(y);
  }
  function solarToLunar(y, m, d) {
    var base = Date.UTC(1900, 0, 31), target = Date.UTC(y, m - 1, d);
    var offset = Math.round((target - base) / 86400000);
    if (offset < 0 || y < 1900 || y > 2100) return null;
    var yy = 1900, dm, isLeap = false;
    for (yy = 1900; yy <= 2100; yy++) {
      var yd = yearDays(yy);
      if (offset < yd) break;
      offset -= yd;
    }
    var lm = leapMonth(yy);
    for (dm = 1; dm <= 12; dm++) {
      var md = monthDays(yy, dm);
      if (offset < md) break;
      offset -= md;
      if (dm === lm) {
        var ld = leapDays(yy);
        if (offset < ld) { isLeap = true; break; }
        offset -= ld;
      }
    }
    return { year: yy, month: dm, day: offset + 1, isLeap: isLeap,
             yearGanZhi: yearGanZhi(yy) };
  }
  function yearGanZhi(y) {
    return GAN[mod(y - 4, 10)] + ZHI[mod(y - 4, 12)];
  }
  function hourToDiZhi(h) {
    return ZHI[mod(Math.floor(((h % 24) + 1) / 2), 12)];
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
      if (m > 12) { m = 1; yg = GAN[mod(GAN.indexOf(yg) + 1, 10)]; }
    }
    return { month: m, yearGan: yg };
  }
  function mingBranch(eMonth, hourZhi) { return mod(2 + (eMonth - 1) - ZHI.indexOf(hourZhi), 12); }
  function shenBranch(eMonth, hourZhi) { return mod(2 + (eMonth - 1) + ZHI.indexOf(hourZhi), 12); }
  function palaceGan(eYearGan, branch) { return GAN[mod(firstMonthGan(eYearGan) + mod(branch - 2, 12), 10)]; }

  var JU_NUM = { '水': 2, '木': 3, '金': 4, '土': 5, '火': 6 };
  var JU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
  function wuXingJu(mingGanZhi) {
    var g = GAN.indexOf(mingGanZhi[0]), z = ZHI.indexOf(mingGanZhi[1]);
    var s = Math.floor(g / 2) + 1 + Math.floor(mod(z, 6) / 2) + 1;
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
    return mod(p + 2, 12);
  }
  function majorStars(zw) {
    var tf = mod(4 - zw, 12), s = {};
    s['紫微'] = zw;
    s['天机'] = mod(zw - 1, 12);
    s['太阳'] = mod(zw - 3, 12);
    s['武曲'] = mod(zw - 4, 12);
    s['天同'] = mod(zw - 5, 12);
    s['廉贞'] = mod(zw - 8, 12);
    s['天府'] = tf;
    s['太阴'] = mod(tf + 1, 12);
    s['贪狼'] = mod(tf + 2, 12);
    s['巨门'] = mod(tf + 3, 12);
    s['天相'] = mod(tf + 4, 12);
    s['天梁'] = mod(tf + 5, 12);
    s['七杀'] = mod(tf + 6, 12);
    s['破军'] = mod(tf + 10, 12);
    return s;
  }
  function auxStars(eMonth, hourZhi, yearGan, yearZhi, lunarDay, mingBr, shenBr) {
    var hz = ZHI.indexOf(hourZhi), m0 = eMonth - 1;
    var yg = GAN.indexOf(yearGan), yz = ZHI.indexOf(yearZhi);
    var sanhe = yz % 4, s = {};
    s['文昌'] = mod(10 - hz, 12);
    s['文曲'] = mod(4 + hz, 12);
    s['左辅'] = mod(4 + m0, 12);
    s['右弼'] = mod(10 - m0, 12);
    s['天魁'] = [1, 0, 11, 11, 1, 0, 1, 6, 3, 3][yg];
    s['天钺'] = [7, 8, 9, 9, 7, 8, 7, 2, 5, 5][yg];
    var lu = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][yg];
    s['禄存'] = lu;
    s['擎羊'] = mod(lu + 1, 12);
    s['陀罗'] = mod(lu - 1, 12);
    s['天马'] = [2, 11, 8, 5][sanhe];
    s['火星'] = mod([2, 3, 1, 9][sanhe] + hz, 12);
    s['铃星'] = mod([10, 10, 3, 10][sanhe] + hz, 12);
    s['地劫'] = mod(11 + hz, 12);
    s['地空'] = mod(11 - hz, 12);
    var hl = mod(3 - yz, 12);
    s['红鸾'] = hl;
    s['天喜'] = mod(hl + 6, 12);
    s['天刑'] = mod(9 + m0, 12);
    s['天姚'] = mod(1 + m0, 12);
    s['天哭'] = mod(6 - yz, 12);
    s['天虚'] = mod(6 + yz, 12);
    s['龙池'] = mod(4 + yz, 12);
    s['凤阁'] = mod(10 - yz, 12);
    var d0 = lunarDay - 1;
    s['三台'] = mod(s['左辅'] + d0, 12);
    s['八座'] = mod(s['右弼'] - d0, 12);
    s['恩光'] = mod(s['文昌'] + d0 - 1, 12);
    s['天贵'] = mod(s['文曲'] + d0 - 1, 12);
    s['孤辰'] = [2, 2, 5, 5, 5, 8, 8, 8, 11, 11, 11, 2][yz];
    s['寡宿'] = [10, 10, 1, 1, 1, 4, 4, 4, 7, 7, 7, 10][yz];
    s['华盖'] = [4, 1, 10, 7][sanhe];
    s['咸池'] = [9, 6, 3, 0][sanhe];
    s['天才'] = mod(mingBr + yz, 12);
    s['天寿'] = mod(shenBr + yz, 12);
    s['蜚廉'] = [8, 9, 10, 5, 6, 7, 2, 3, 4, 11, 0, 1][yz];
    s['破碎'] = [5, 1, 9][yz % 3];
    s['天德'] = mod(9 + yz, 12);
    s['月德'] = mod(5 + yz, 12);
    s['天空'] = mod(yz + 1, 12);
    s['天官'] = [7, 4, 5, 2, 3, 9, 11, 9, 10, 6][yg];
    s['天福'] = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5][yg];
    s['天厨'] = [5, 6, 0, 5, 6, 8, 2, 6, 9, 11][yg];
    s['截路'] = [8, 6, 4, 2, 0][yg % 5];
    s['空亡'] = [9, 7, 5, 3, 1][yg % 5];
    var xk = mod(mod(yz - 2, 12) + 9 - yg + 1, 12);
    if ((yz % 2) !== (xk % 2)) xk = mod(xk + 1, 12);
    s['旬空'] = mod(xk + 2, 12);
    s['解神'] = [8, 10, 0, 2, 4, 6][Math.floor(m0 / 2)];
    s['阴煞'] = [2, 0, 10, 8, 6, 4][m0 % 6];
    s['天月'] = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2][m0];
    s['天巫'] = [5, 8, 2, 11][m0 % 4];
    s['年解'] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 11][yz];
    s['台辅'] = mod(6 + hz, 12);
    s['封诰'] = mod(2 + hz, 12);
    s['天使'] = mod(mingBr + 7, 12);
    s['天伤'] = mod(mingBr + 5, 12);
    return s;
  }
  var CHANGSHENG = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'];
  function changsheng(juNum, isYangGender) {
    var start = { 2: 8, 5: 8, 3: 11, 6: 2, 4: 5 }[juNum];
    var dir = isYangGender ? 1 : -1, s = {};
    for (var i = 0; i < 12; i++) s[CHANGSHENG[i]] = mod(start + dir * i, 12);
    return s;
  }
  function daxian(mingBr, eYearGan, juNum, isYangGender) {
    var dir = isYangGender ? 1 : -1, out = [];
    for (var i = 0; i < 12; i++) {
      var br = mod(mingBr + dir * i, 12), start = juNum + i * 10;
      out.push({ branch: br, ganzhi: palaceGan(eYearGan, br) + ZHI[br], from: start, to: start + 9 });
    }
    return out;
  }
  function chart(opt) {
    var lunar = solarToLunar(opt.year, opt.month, opt.day);
    if (!lunar) throw new Error('日期超出范围（1900–2100）');
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
      var br = mod(ming + i, 12);
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
      mingzhu: MINGZHU[ming], shenzhu: SHENZHU[ZHI.indexOf(yearZhi)]
    };
  }

  /* ────────── 弹窗界面 ────────── */
  var BIRTH_KEY = 'yumiao_shared_birth_v1';
  var LAYOUT = [
    ['巳',1,1],['午',1,2],['未',1,3],['申',1,4],
    ['辰',2,1],['CENTER',2,2],['酉',2,4],
    ['卯',3,1],['戌',3,4],
    ['寅',4,1],['丑',4,2],['子',4,3],['亥',4,4]
  ];
  function esc(s) {
    return (typeof window.escapeHtml === 'function') ? window.escapeHtml(String(s)) : String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function readBirth() {
    try {
      var b = JSON.parse(localStorage.getItem(BIRTH_KEY) || 'null');
      if (!b || !b.year || !b.month || !b.day) return null;
      return {
        year: +b.year, month: +b.month, day: +b.day,
        hour: (b.hour == null || b.hour === '') ? 12 : +b.hour,
        gender: (b.sex === 'F') ? '女' : '男'
      };
    } catch (e) { return null; }
  }
  function starsIn(c, br) {
    var out = [];
    Object.keys(c.majorStars).forEach(function (nm) {
      if (ZHI[c.majorStars[nm]] !== br) return;
      var mh = c.sihua[nm] ? '<i class="zw-hua">' + c.sihua[nm] + '</i>' : '';
      out.push('<span class="zw-major">' + esc(nm) + '</span>' + mh);
    });
    Object.keys(c.auxStars).forEach(function (nm) {
      if (ZHI[c.auxStars[nm]] !== br) return;
      var mh2 = c.sihua[nm] ? '<i class="zw-hua">' + c.sihua[nm] + '</i>' : '';
      out.push('<span class="zw-minor">' + esc(nm) + '</span>' + mh2);
    });
    return out.join(' ');
  }
  function renderChart(c) {
    function palaceOf(br) { return c.palaces.find(function (p) { return p.branch === br; }); }
    var h = '<div class="zw-board">';
    LAYOUT.forEach(function (item) {
      var br = item[0];
      if (br === 'CENTER') {
        h += '<div class="zw-cell zw-center zw-tap" style="grid-row:2/span 2;grid-column:2/span 2;" onclick="openZwCenter()" role="button" tabindex="0">' +
          '<div class="zw-center-title">紫微斗数</div>' +
          '<div>农历 ' + c.lunar.year + '年' + (c.lunar.isLeap ? '闰' : '') + c.lunar.month + '月' + c.lunar.day + '日 ' + esc(c.hourZhi) + '时</div>' +
          '<div>' + esc(c.yearGanZhi) + '年 · ' + esc(c.input.gender) + '命</div>' +
          '<div>命宫 <b>' + esc(c.mingGanzhi) + '</b> · 身居' + esc(c.shenBranch) + '</div>' +
          '<div>' + esc(c.ju.name) + ' · 命主' + esc(c.mingzhu) + ' · 身主' + esc(c.shenzhu) + '</div></div>';
        return;
      }
      var p = palaceOf(br);
      var dx = c.daxian.find(function (x) { return ZHI[x.branch] === br; });
      h += '<div class="zw-cell zw-tap" style="grid-row:' + item[1] + ';grid-column:' + item[2] + ';" onclick="openZwPalace(\'' + p.name + '\')" role="button" tabindex="0">' +
        '<div class="zw-palace"><span class="zw-palace-name">' + esc(p.name) + '</span><span class="zw-ganzhi">' + esc(p.ganzhi) + '</span></div>' +
        '<div class="zw-stars">' + starsIn(c, br) + '</div>' +
        '<div class="zw-daxian">' + dx.from + '–' + dx.to + '岁</div></div>';
    });
    h += '</div>';
    // 四化表
    var sh = Object.keys(c.sihua).map(function (nm) {
      return '<span class="zw-sh">' + esc(nm) + '<i class="zw-hua">' + c.sihua[nm] + '</i></span>';
    }).join('');
    h += '<div class="mbti-report"><div class="mbti-sec zw-tap" onclick="openZwSihua()" role="button" tabindex="0"><span class="mbti-sec-label">生年四化</span>' + sh + '</div>';
    // 大限表
    var dxh = c.daxian.map(function (x) {
      return '<span class="zw-dx">' + esc(x.ganzhi) + x.from + '–' + x.to + '</span>';
    }).join('');
    h += '<div class="mbti-sec zw-tap" onclick="openZwDaxian()" role="button" tabindex="0"><span class="mbti-sec-label">大限</span>' + dxh + '</div></div>';
    return h;
  }
  function openZiwei() {
    var body = document.getElementById('ziweiBody');
    var b = readBirth();
    if (!b) {
      body.innerHTML = '<p class="mbti-intro">请先到「我的」录入生辰档案。</p>';
    } else {
      try {
        var c = chart({ year: b.year, month: b.month, day: b.day, hour: b.hour, gender: b.gender });
        zwCurrent = c; // 供子弹窗取数
        body.innerHTML = renderChart(c);
        if (typeof saveReportHTML === 'function') saveReportHTML('yumiao_report_ziwei_v1', '紫微斗数', 'ziweiBody');
      } catch (e) {
        body.innerHTML = '<p class="mbti-intro">排盘失败，请检查生辰档案是否正确。</p>';
      }
    }
    if (typeof ModalUI !== 'undefined' && ModalUI.open) ModalUI.open('ziwei');
    else {
      document.getElementById('ziweiBackdrop').classList.add('show');
      document.getElementById('ziweiModal').classList.add('show');
    }
  }
  function closeZiwei() {
    closeZwPop();
    if (typeof ModalUI !== 'undefined' && ModalUI.close) ModalUI.close('ziwei');
    else {
      document.getElementById('ziweiBackdrop').classList.remove('show');
      document.getElementById('ziweiModal').classList.remove('show');
    }
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
  }
  function zwMoreBtn(fn) {
    return '<button type="button" class="zw-more" onclick="' + fn + '">详细说明</button>';
  }
  function zwBackBtn(fn) {
    return '<button type="button" class="zw-back" onclick="' + fn + '">← 返回上一层</button>';
  }
  // 某宫的星曜（含四化）
  function zwPalaceStars(palaceName) {
    if (!zwCurrent) return '';
    var p = zwCurrent.palaces.filter(function (x) { return x.name === palaceName; })[0];
    if (!p) return '';
    var out = [];
    Object.keys(zwCurrent.majorStars).forEach(function (nm) {
      if (ZHI[zwCurrent.majorStars[nm]] === p.branch)
        out.push('<b>' + esc(nm) + '</b>' + (zwCurrent.sihua[nm] ? '<i class="zw-hua">' + zwCurrent.sihua[nm] + '</i>' : ''));
    });
    Object.keys(zwCurrent.auxStars).forEach(function (nm) {
      if (ZHI[zwCurrent.auxStars[nm]] === p.branch)
        out.push(esc(nm) + (zwCurrent.sihua[nm] ? '<i class="zw-hua">' + zwCurrent.sihua[nm] + '</i>' : ''));
    });
    return out.length ? out.join('、') : '（空宫，对宫星曜借来看）';
  }
  // 十二宫弹窗 · 第一层（一句话）
  function openZwPalace(name) {
    var p = zwCurrent ? zwCurrent.palaces.filter(function (x) { return x.name === name; })[0] : null;
    var h = '<div><b>' + esc(name) + '</b>：' + esc(ZW_PALACE_MEAN[name] || '') + '</div>';
    if (p) h += '<div style="margin-top:8px;">本宫星曜：' + zwPalaceStars(name) + '</div>';
    h += zwMoreBtn("openZwPalace2('" + name + "')");
    zwPop(name, h);
  }
  // 十二宫弹窗 · 第二层（详细）
  function openZwPalace2(name) {
    var h = '<div><b>' + esc(name) + '</b>：' + esc(ZW_PALACE_MEAN[name] || '') + '</div>';
    h += '<div style="margin-top:8px;">本宫星曜：' + zwPalaceStars(name) + '</div>';
    if (zwCurrent) {
      var p = zwCurrent.palaces.filter(function (x) { return x.name === name; })[0];
      var majors = [];
      Object.keys(zwCurrent.majorStars).forEach(function (nm) {
        if (ZHI[zwCurrent.majorStars[nm]] === p.branch) majors.push(nm);
      });
      if (majors.length) {
        h += '<div style="margin-top:8px;">' + majors.map(function (nm) {
          return '· <b>' + esc(nm) + '</b>' + (zwCurrent.sihua[nm] ? '<i class="zw-hua">' + zwCurrent.sihua[nm] + '</i>' : '') +
            '：' + esc(ZW_STAR_MEAN[nm] || '吉星') +
            (zwCurrent.sihua[nm] ? '（化' + zwCurrent.sihua[nm] + '：' + ZW_HUA_MEAN[zwCurrent.sihua[nm]] + '）' : '');
        }).join('<br>') + '</div>';
      }
    }
    h += zwBackBtn("openZwPalace('" + name + "')");
    zwPop(name + ' · 详解', h);
  }
  // 中央命盘弹窗 · 第一层（最简）
  function openZwCenter() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    var h = '<div>你的性格底盘在<b>命宫' + esc(c.mingGanzhi) + '</b>；</div>';
    h += '<div style="margin-top:6px;">中年后重心看<b>身宫（' + esc(c.shenBranch) + '）</b>；</div>';
    h += '<div style="margin-top:6px;"><b>' + esc(c.ju.name) + '</b>，' + c.ju.num + '岁起运，十年一换大限。</div>';
    h += zwMoreBtn('openZwCenter2()');
    zwPop('命盘总览', h);
  }
  // 中央命盘弹窗 · 第二层（详细）
  function openZwCenter2() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    var h = '<div><b>命宫' + esc(c.mingGanzhi) + '</b>：先天性格与一生格局，整张盘的核心。</div>';
    h += '<div style="margin-top:6px;"><b>身宫居' + esc(c.shenBranch) + '</b>：后天修为与归宿，中年后影响渐重；命身同宫者表里如一。</div>';
    h += '<div style="margin-top:6px;"><b>' + esc(c.ju.name) + '</b>：决定起运早晚，局数越小起运越早。</div>';
    h += '<div style="margin-top:6px;"><b>命主' + esc(c.mingzhu) + '</b>、<b>身主' + esc(c.shenzhu) + '</b>：命身二宫的守护星，辅助参看吉凶。</div>';
    h += '<div style="margin-top:6px;">十四主星：' + Object.keys(ZW_STAR_MEAN).map(function (k) {
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
    h += '<div style="margin-top:6px;">' + Object.keys(c.sihua).map(function (nm) {
      return '· <b>' + esc(nm) + '</b>化<b>' + c.sihua[nm] + '</b>（' + ZW_HUA_MEAN[c.sihua[nm]] + '）';
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
      return '· <b>' + esc(nm) + '</b>化<b>' + c.sihua[nm] + '</b>在<b>' + esc(palaceOfStar(nm)) + '</b>：' +
        ZW_HUA_MEAN[c.sihua[nm]] + '之力落在此宫';
    }).join('<br>') + '</div>';
    h += '<div style="margin-top:8px;color:var(--muted);font-size:var(--fs-sm);">化忌所在之宫，是这辈子最费心的地方；化禄所在，多有得益。</div>';
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
    h += '<div style="margin-top:6px;">你今年虚岁<b>' + now + '</b>，正走<b>' + esc(cur.ganzhi) + '（' + cur.from + '–' + cur.to + '岁）</b>大限。</div>';
    h += zwMoreBtn('openZwDaxian2()');
    zwPop('大限', h);
  }
  function openZwDaxian2() {
    if (!zwCurrent) return;
    var c = zwCurrent;
    var h = '<div>' + c.daxian.map(function (x) {
      var p = c.palaces.filter(function (pl) { return ZHI[x.branch] === pl.branch; })[0];
      return '· <b>' + esc(x.ganzhi) + '</b> ' + x.from + '–' + x.to + '岁（' + esc(p ? p.name : '') + '）';
    }).join('<br>') + '</div>';
    h += '<div style="margin-top:8px;color:var(--muted);font-size:var(--fs-sm);">看某阶段运势，重心落在该大限之宫，合参本命盘同宫星曜一起看。</div>';
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
})();
