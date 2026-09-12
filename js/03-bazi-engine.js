// ============================================================
// 八字神煞排盘引擎（内嵌库）
// 原始行号（拆分前单文件 script.js 中的位置）: 1461-1986
// ============================================================
  // ============================================================
  // bazi_shensha.js（内嵌，供下方八字掷筊揭晓逻辑调用 window.BaziShensha.calculate()）
  // ============================================================
  (function (global) {
    "use strict";
    const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
    const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
    const ELEMENTS = ["木","火","土","金","水"];
    const STEM_ELEMENT = [0,0,1,1,2,2,3,3,4,4];
    const BRANCH_ELEMENT = [4,2,0,0,2,1,1,2,3,3,2,4];
    const POSITION_NAMES = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
    function mod(n, m) { return ((n % m) + m) % m; }
    function elementName(index) { return ELEMENTS[index]; }
    function stemName(index) { return STEMS[mod(index, 10)]; }
    function branchName(index) { return BRANCHES[mod(index, 12)]; }
    function stemIndex(value) { return typeof value === "number" ? mod(value, 10) : STEMS.indexOf(value); }
    function branchIndex(value) { return typeof value === "number" ? mod(value, 12) : BRANCHES.indexOf(value); }
    // 近似均时差（分钟）：基于太阳平黄经与平近点角的简易公式，误差通常 <1 分钟量级
    function equationOfTimeMinutes(year, month, day, hour, minute, timezone) {
      const utcApprox = new Date(Date.UTC(year, month - 1, day, (hour || 0) - timezone, minute || 0, 0));
      const jd = julianDay(utcApprox);
      const T = (jd - 2451545.0) / 36525.0;
      const L0 = mod(280.46646 + 36000.76983 * T + 0.0003032 * T * T, 360);
      const M = mod(357.52911 + 35999.05029 * T - 0.0001537 * T * T, 360);
      const e = 0.016708634 - 0.000042037 * T;
      const Mrad = M * Math.PI / 180;
      const y = Math.tan((23.439 - 0.0000004 * T) * Math.PI / 360);
      const y2 = y * y;
      const eot = 4 * (180 / Math.PI) * (
        y2 * Math.sin(2 * L0 * Math.PI / 180)
        - 2 * e * Math.sin(Mrad)
        + 4 * e * y2 * Math.sin(Mrad) * Math.cos(2 * L0 * Math.PI / 180)
        - 0.5 * y2 * y2 * Math.sin(4 * L0 * Math.PI / 180)
        - 1.25 * e * e * Math.sin(2 * Mrad)
      );
      return eot; // 分钟
    }
    function localDateToUTC(input) {
      const timezone = input.timezone == null ? 8 : Number(input.timezone);
      let hour = Number(input.hour || 0);
      let minute = Number(input.minute || 0);
      // 真太阳时：经度改正 + 均时差
      if (input.trueSolar && input.longitude != null && Number.isFinite(Number(input.longitude))) {
        const lon = Number(input.longitude);
        const standardMeridian = timezone * 15;
        const longCorrMin = (lon - standardMeridian) * 4; // 每度 4 分钟
        const eotMin = equationOfTimeMinutes(
          Number(input.year), Number(input.month), Number(input.day),
          hour, minute, timezone
        );
        const totalAdjMin = longCorrMin + eotMin;
        const totalMin = hour * 60 + minute + totalAdjMin;
        hour = Math.floor(totalMin / 60);
        minute = totalMin - hour * 60;
        // 跨日由后续 Date 构造自然处理（负小时会回退日期）
      }
      return new Date(Date.UTC(
        Number(input.year), Number(input.month) - 1, Number(input.day),
        hour - timezone, minute, Number(input.second || 0)
      ));
    }
    function julianDay(date) { return date.getTime() / 86400000 + 2440587.5; }
    function solarLongitude(date) {
      const jd = julianDay(date);
      const T = (jd - 2451545.0) / 36525.0;
      const L0 = mod(280.46646 + 36000.76983 * T + 0.0003032 * T * T, 360);
      const M = mod(357.52911 + 35999.05029 * T - 0.0001537 * T * T, 360);
      const rad = M * Math.PI / 180;
      const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(rad)
        + (0.019993 - 0.000101 * T) * Math.sin(2 * rad)
        + 0.000289 * Math.sin(3 * rad);
      return mod(L0 + C, 360);
    }
    function angularDiff(a, b) { return mod(a - b + 180, 360) - 180; }
    const JIEQI_NAMES = ["立春","惊蛰","清明","立夏","芒种","小暑","立秋","白露","寒露","立冬","大雪","小寒"];
    const JIEQI_LONGITUDES = [315,345,15,45,75,105,135,165,195,225,255,285];
    function findSolarTerm(year, longitude, month) {
      const center = new Date(Date.UTC(year, month - 1, 5, 0, 0, 0));
      const start = center.getTime() - 20 * 86400000;
      const end = center.getTime() + 20 * 86400000;
      let previous = new Date(start);
      let previousDiff = angularDiff(solarLongitude(previous), longitude);
      const step = 3 * 60 * 60 * 1000;
      for (let t = start + step; t <= end; t += step) {
        const current = new Date(t);
        const currentDiff = angularDiff(solarLongitude(current), longitude);
        const crossed = (previousDiff <= 0 && currentDiff >= 0)
          || (previousDiff >= 0 && currentDiff <= 0 && Math.abs(previousDiff - currentDiff) > 100);
        if (crossed) {
          let lo = previous.getTime();
          let hi = current.getTime();
          for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2;
            const md = angularDiff(solarLongitude(new Date(mid)), longitude);
            const crossedMid = (previousDiff <= 0 && md >= 0)
              || (previousDiff >= 0 && md <= 0 && Math.abs(previousDiff - md) > 100);
            if (crossedMid) hi = mid; else lo = mid;
          }
          return new Date((lo + hi) / 2);
        }
        previous = current;
        previousDiff = currentDiff;
      }
      return center;
    }
    function getJieQi(year) {
      const result = [];
      for (let i = 0; i < 12; i++) {
        let y = year;
        let month = i + 2;
        if (month > 12) { month -= 12; y++; }
        const date = findSolarTerm(y, JIEQI_LONGITUDES[i], month);
        result.push({ name: JIEQI_NAMES[i], longitude: JIEQI_LONGITUDES[i], date });
      }
      return result;
    }
    function allJieQi(year) {
      return [...getJieQi(year - 1), ...getJieQi(year), ...getJieQi(year + 1)]
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    function getCurrentJieQi(utcDate) {
      const list = allJieQi(utcDate.getUTCFullYear());
      let result = null;
      for (const item of list) {
        if (item.date.getTime() <= utcDate.getTime()) result = item;
      }
      return result;
    }
    function ganzhi(index) {
      index = mod(index, 60);
      return {
        index, stemIndex: index % 10, branchIndex: index % 12,
        stem: STEMS[index % 10], branch: BRANCHES[index % 12],
        text: STEMS[index % 10] + BRANCHES[index % 12]
      };
    }
    function getYearPillar(utcDate) {
      const year = utcDate.getUTCFullYear();
      const liChun = getJieQi(year).find(x => x.name === "立春");
      const actualYear = utcDate.getTime() >= liChun.date.getTime() ? year : year - 1;
      return ganzhi(actualYear - 1984);
    }
    const MONTH_BRANCHES = [2,3,4,5,6,7,8,9,10,11,0,1];
    function firstMonthStem(yearStem) {
      const map = { 0:2, 5:2, 1:4, 6:4, 2:6, 7:6, 3:8, 8:8, 4:0, 9:0 };
      return map[yearStem];
    }
    function getMonthPillar(utcDate) {
      const yearPillar = getYearPillar(utcDate);
      const jie = getCurrentJieQi(utcDate);
      let index = JIEQI_LONGITUDES.indexOf(jie.longitude);
      if (index < 0) index = 0;
      const branch = MONTH_BRANCHES[index];
      const startStem = firstMonthStem(yearPillar.stemIndex);
      const stem = mod(startStem + mod(branch - 2, 12), 10);
      return {
        stemIndex: stem, branchIndex: branch,
        stem: stemName(stem), branch: branchName(branch),
        text: stemName(stem) + branchName(branch),
        jieqi: jie.name, jieqiDate: jie.date
      };
    }
    function getDayPillar(utcDate) {
      const y = utcDate.getUTCFullYear();
      const m = utcDate.getUTCMonth();
      const d = utcDate.getUTCDate();
      const base = Date.UTC(2000, 0, 7);
      const current = Date.UTC(y, m, d);
      const days = Math.floor((current - base) / 86400000);
      return ganzhi(days);
    }
    // 将 UTC 时间戳换算为「本地时区的挂钟时间」，返回的 Date 对象以 UTC 字段存取本地年/月/日/时——
    // 这样后续用 getUTCFullYear/getUTCMonth/getUTCDate/getUTCHours 取到的就是当地（出生地）的日历字段。
    function toLocalWallClock(utcDate, timezone) {
      return new Date(utcDate.getTime() + timezone * 3600000);
    }
    // 计算「日柱应归属的日期」：默认按当地日历日期换日柱（午夜 00:00 换日）；
    // 若采用"晚子时归次日"的传统流派（23:00-23:59 视为次日子时），可在此处按 hour>=23 提前进位——
    // 本实现遵循多数现代排盘工具的常见做法，统一在此单一函数内决定，供日柱与时柱共用，避免两处各算一次而互相矛盾。
    function getEffectiveDayDate(localWallClock) {
      const hour = localWallClock.getUTCHours();
      let dayDate = new Date(Date.UTC(localWallClock.getUTCFullYear(), localWallClock.getUTCMonth(), localWallClock.getUTCDate()));
      if (hour >= 23) dayDate = new Date(dayDate.getTime() + 86400000); // 晚子时（23点后）归入次日
      return dayDate;
    }
    function getHourPillar(utcDate, input, dayPillar) {
      const timezone = input.timezone == null ? 8 : Number(input.timezone);
      const local = toLocalWallClock(utcDate, timezone);
      const hour = local.getUTCHours();
      const branch = mod(Math.floor((hour + 1) / 2), 12);
      // 五鼠遁时口诀：甲己还加甲、乙庚丙作初、丙辛从戊起、丁壬庚子居、戊癸何方发/壬子是真途
      // 即日干与其 +5 位的日干（如 甲/己、乙/庚……）共用同一个子时天干，
      // 分组依据是 stemIndex % 5，而非 floor(stemIndex / 2)（后者会把相邻天干如甲乙、戊己错误地分到同一组）。
      // dayPillar 由 calculatePillars 统一计算并传入，确保与显示出来的日柱完全一致。
      const ziStem = [0,2,4,6,8][dayPillar.stemIndex % 5];
      const stem = mod(ziStem + branch, 10);
      return {
        stemIndex: stem, branchIndex: branch,
        stem: stemName(stem), branch: branchName(branch),
        text: stemName(stem) + branchName(branch)
      };
    }
    function decoratePillar(pillar) {
      return {
        text: pillar.text, stem: pillar.stem, branch: pillar.branch,
        stemElement: elementName(STEM_ELEMENT[pillar.stemIndex]),
        branchElement: elementName(BRANCH_ELEMENT[pillar.branchIndex]),
        yinYang: pillar.stemIndex % 2 === 0 ? "阳" : "阴"
      };
    }
    function calculatePillars(input) {
      const timezone = input.timezone == null ? 8 : Number(input.timezone);
      const utc = localDateToUTC(input);
      const year = getYearPillar(utc);
      const month = getMonthPillar(utc);
      // 日柱必须按「出生地当地日历日期」换日，而不是 utc 时间戳自身的 UTC 日期——
      // 二者在时区不为 0 时会不一致（例如 UTC+8 当地 00:00–07:59 对应的 UTC 日期仍是前一天），
      // 原实现直接取 utc 的 UTC 年/月/日，导致清晨出生者的日柱整体错算为前一天。
      const localWallClock = toLocalWallClock(utc, timezone);
      const day = getDayPillar(getEffectiveDayDate(localWallClock));
      const hour = getHourPillar(utc, input, day);
      return {
        raw: { year, month, day, hour },
        year: decoratePillar(year), month: decoratePillar(month),
        day: decoratePillar(day), hour: decoratePillar(hour),
        text: year.text + " " + month.text + " " + day.text + " " + hour.text,
        jieqi: { name: month.jieqi, date: month.jieqiDate ? month.jieqiDate.toISOString() : null }
      };
    }
    function calculateFiveElements(pillars) {
      const count = { 木:0, 火:0, 土:0, 金:0, 水:0 };
      for (const key of ["year","month","day","hour"]) {
        const p = pillars.raw[key];
        count[elementName(STEM_ELEMENT[p.stemIndex])]++;
        count[elementName(BRANCH_ELEMENT[p.branchIndex])]++;
      }
      return count;
    }
    // 十神判断依据「同我 / 我生 / 生我 / 我克 / 克我」五种关系，再按阴阳是否相同（same）细分：
    //   同我：同性=比肩，异性=劫财
    //   我生（日主生other）：同性=食神，异性=伤官
    //   生我（other生日主）：同性=偏印，异性=正印   ←（原代码 正印/偏印 写反）
    //   我克（日主克other）：同性=偏财，异性=正财   ←（原代码与"克我"分支整体错位）
    //   克我（other克日主）：同性=七杀，异性=正官   ←（原代码与"我克"分支整体错位）
    function getTenGod(dayStem, otherStem) {
      const dayElement = STEM_ELEMENT[dayStem];
      const otherElement = STEM_ELEMENT[otherStem];
      const same = dayStem % 2 === otherStem % 2;
      if (otherElement === dayElement) return same ? "比肩" : "劫财";
      if (mod(otherElement - dayElement, 5) === 1) return same ? "食神" : "伤官"; // 我生者
      if (mod(dayElement - otherElement, 5) === 1) return same ? "偏印" : "正印"; // 生我者
      if (mod(otherElement - dayElement, 5) === 2) return same ? "偏财" : "正财"; // 我克者
      return same ? "七杀" : "正官"; // 克我者
    }
    function calculateTenGods(pillars) {
      const dayStem = pillars.raw.day.stemIndex;
      return {
        year: getTenGod(dayStem, pillars.raw.year.stemIndex),
        month: getTenGod(dayStem, pillars.raw.month.stemIndex),
        day: "日主",
        hour: getTenGod(dayStem, pillars.raw.hour.stemIndex)
      };
    }
    function hitBranches(pillars, targetBranches) {
      if (!targetBranches || !targetBranches.length) return [];
      const set = new Set(targetBranches.map(branchIndex));
      return ["year","month","day","hour"].filter(key => set.has(pillars.raw[key].branchIndex));
    }
    function hitStems(pillars, targetStems) {
      if (!targetStems || !targetStems.length) return [];
      const set = new Set(targetStems.map(stemIndex));
      return ["year","month","day","hour"].filter(key => set.has(pillars.raw[key].stemIndex));
    }
    function addShensha(list, name, category, rule, positions, description) {
      if (!positions || !positions.length) return;
      list.push({
        name, category, rule, positions,
        positionNames: positions.map(p => POSITION_NAMES[p]),
        description
      });
    }
    // 神煞审计说明（2026 检查，第二轮）：本函数内的口诀已对照权威资料（含《三命通会》歌诀及主流命理站点交叉校验）
    // 核对并修正了「桃花/咸池」「禄神」「羊刃」「太极贵人」四处错误：
    //   · 太极贵人：原数组为错误排列（与任何流派口诀均不符），已按通行歌诀「甲乙生人子午中，丙丁鸡兔定亨通，
    //     戊己两干临四季，庚辛寅亥禄丰隆，壬癸巳申偏喜美」修正——注意戊己对应辰戌丑未四支（非两支）。
    //   · 羊刃：阳干（甲丙戊庚壬）取法各派一致，无争议；阴干（乙丁己辛癸）历来有两种流行取法——
    //     「禄前一位」（乙刃寅/丁己刃巳/辛刃申/癸刃亥）与「同柱帝旺」（乙刃辰/丁己刃未/辛刃戌/癸刃丑）。
    //     经交叉核对多方资料，「帝旺」一说更贴合"羊刃即十二长生帝旺"的本义、且被主流工具书列为首选，
    //     故本版本改用帝旺版；如需切换回"禄前一位"版本，可将下方 yangRen 数组的阴干四项改回 [2,5,8,11]。
    // 其余神煞（天乙贵人、文昌贵人、天厨贵人、驿马、华盖、将星、亡神、劫煞、金舆、红鸾、天喜、
    // 孤辰、寡宿、天德、月德及其"合"、福星贵人、国印贵人、学堂、词馆、旬空、天医、解神、天罗地网）
    // 经抽查未发现问题，但未逐一穷尽核对所有流派差异，建议后续如有余力再做一次全量交叉校验。
    function calculateShensha(pillars) {
      const r = pillars.raw;
      const dayStem = r.day.stemIndex;
      const dayBranch = r.day.branchIndex;
      const yearStem = r.year.stemIndex;
      const yearBranch = r.year.branchIndex;
      const monthBranch = r.month.branchIndex;
      const list = [];
      const sixHeMap = { 0:1,1:0,2:11,11:2,3:10,10:3,4:9,9:4,5:8,8:5,6:7,7:6 };
      const tianYi = { 0:[1,7],1:[0,8],2:[11,9],3:[11,9],4:[1,7],5:[0,8],6:[1,7],7:[6,2],8:[3,5],9:[3,5] };
      const tianYiTargets = Array.from(new Set([...(tianYi[yearStem] || []), ...(tianYi[dayStem] || [])]));
      addShensha(list, "天乙贵人", "贵人", "按年干/日干取贵人地支", hitBranches(pillars, tianYiTargets), "传统命理中常作为贵人、助力、人缘之象。");
      const taiJi = { 0:[0,6],1:[0,6],2:[3,9],3:[3,9],4:[4,10,1,7],5:[4,10,1,7],6:[2,11],7:[2,11],8:[5,8],9:[5,8] };
      addShensha(list, "太极贵人", "贵人", "按日干取地支", hitBranches(pillars, taiJi[dayStem]), "传统上主悟性、钻研、玄学、哲思等象意。");
      // 文昌贵人口诀：甲乙巳午报君知，丙戊申宫丁己鸡，庚猪辛鼠壬逢虎，癸人见卯入云梯
      // 甲巳 乙午 丙申 丁酉 戊申 己酉 庚亥 辛子 壬寅 癸卯（原数组除甲、庚外均错，已修正）
      const wenChang = [5,6,8,9,8,9,11,0,2,3];
      addShensha(list, "文昌贵人", "学业", "按日干取文昌地支", hitBranches(pillars, [wenChang[dayStem]]), "传统上主学习、考试、文书、表达与思维。");
      // 天厨贵人口诀：甲乙巳午丙在子，丁戊巳午己申储，庚落寅中辛寻午……
      // 综合权威资料：甲巳 乙午 丙巳 丁午 戊申 己酉 庚亥 辛子 壬寅 癸卯（原数组为递减序列，10干全错，已修正）
      const tianChu = { 0:[5],1:[6],2:[5],3:[6],4:[8],5:[9],6:[11],7:[0],8:[2],9:[3] };
      addShensha(list, "天厨贵人", "福星", "按日干取天厨", hitBranches(pillars, tianChu[dayStem]), "传统上多与衣食、生活享受、福气有关。");
      function triadTargets(mapFn) {
        const set = new Set();
        for (const b of [yearBranch, dayBranch]) {
          const t = mapFn(b);
          if (t !== null && t !== undefined) set.add(t);
        }
        return Array.from(set);
      }
      const yiMaTargets = triadTargets(b => {
        if ([0,4,8].includes(b)) return 2;
        if ([2,6,10].includes(b)) return 8;
        if ([3,7,11].includes(b)) return 5;
        if ([1,5,9].includes(b)) return 11;
        return null;
      });
      addShensha(list, "驿马", "动态", "按年支/日支三合局取驿马", hitBranches(pillars, yiMaTargets), "传统上主迁移、奔波、旅行、变化。");
      const peachTargets = triadTargets(b => {
        if ([0,4,8].includes(b)) return 9;
        if ([2,6,10].includes(b)) return 3;
        if ([3,7,11].includes(b)) return 0;
        if ([1,5,9].includes(b)) return 6;
        return null;
      });
      addShensha(list, "桃花", "人缘", "按年支/日支三合局取桃花", hitBranches(pillars, peachTargets), "传统上主魅力、人缘、社交吸引力与感情缘分。");
      const huaGaiTargets = triadTargets(b => {
        if ([0,4,8].includes(b)) return 4;
        if ([2,6,10].includes(b)) return 10;
        if ([3,7,11].includes(b)) return 7;
        if ([1,5,9].includes(b)) return 1;
        return null;
      });
      addShensha(list, "华盖", "孤高", "按年支/日支三合局取华盖", hitBranches(pillars, huaGaiTargets), "传统上主独立、专研、艺术、宗教哲思等。");
      const jiangXingTargets = triadTargets(b => {
        if ([0,4,8].includes(b)) return 0;
        if ([2,6,10].includes(b)) return 6;
        if ([3,7,11].includes(b)) return 3;
        if ([1,5,9].includes(b)) return 9;
        return null;
      });
      addShensha(list, "将星", "权柄", "按年支/日支三合局取将星", hitBranches(pillars, jiangXingTargets), "传统上主组织、掌控、领导与执行。");
      const wangShenTargets = triadTargets(b => {
        if ([2,6,10].includes(b)) return 5;
        if ([3,7,11].includes(b)) return 2;
        if ([0,4,8].includes(b)) return 11;
        if ([1,5,9].includes(b)) return 8;
        return null;
      });
      addShensha(list, "亡神", "杂曜", "按年支/日支三合局取亡神", hitBranches(pillars, wangShenTargets), "传统流派解释差异较大。");
      const jieShaTargets = triadTargets(b => {
        if ([2,6,10].includes(b)) return 11;
        if ([3,7,11].includes(b)) return 8;
        if ([0,4,8].includes(b)) return 5;
        if ([1,5,9].includes(b)) return 2;
        return null;
      });
      addShensha(list, "劫煞", "杂曜", "按年支/日支三合局取劫煞", hitBranches(pillars, jieShaTargets), "传统上多用于表示竞争、压力、突发变化等象意。");
      // 金舆＝禄前两位：甲辰 乙巳 丙未 丁申 戊未 己申 庚戌 辛亥 壬丑 癸寅（原数组癸项写成丑，已修正为寅）
      const jinYu = { 0:[4],1:[5],2:[7],3:[8],4:[7],5:[8],6:[10],7:[11],8:[1],9:[2] };
      addShensha(list, "金舆", "福贵", "按日干取金舆", hitBranches(pillars, jinYu[dayStem]), "传统上常取富贵、生活条件、婚姻助力等象意。");
      // 禄神口诀：甲禄寅 乙禄卯 丙禄巳 丁禄午 戊禄巳 己禄午 庚禄申 辛禄酉 壬禄亥 癸禄子
      const lu = [2,3,5,6,5,6,8,9,11,0]; // 原数组戊(index4)/己(index5)两项写反，已修正
      addShensha(list, "禄神", "福禄", "按日干取临官地支", hitBranches(pillars, [lu[dayStem]]), "传统上主俸禄、资源、稳定收入与福气。");
      // 羊刃口诀（帝旺版，阳干各派一致，阴干取同性质"帝旺"支）：
      // 甲刃卯 乙刃辰 丙戊刃午 丁己刃未 庚刃酉 辛刃戌 壬刃子 癸刃丑
      const yangRen = [3,4,6,7,6,7,9,10,0,1];
      addShensha(list, "羊刃", "强势", "按日干取羊刃", hitBranches(pillars, [yangRen[dayStem]]), "传统上主执行力、刚烈、竞争性。");
      // 红鸾口诀：卯上起子逆行——子见卯 丑见寅 寅见丑 卯见子 辰见亥……（原数组整体错位一格，已修正）
      const hongLuan = [3,2,1,0,11,10,9,8,7,6,5,4];
      addShensha(list, "红鸾", "婚恋", "按年支取红鸾", hitBranches(pillars, [hongLuan[yearBranch]]), "传统上主喜庆、婚恋、人际缘分。");
      // 天喜＝红鸾对宫（红鸾+6位），子见酉 丑见申 寅见未……（原数组整体错位一格，已修正）
      const tianXi = [9,8,7,6,5,4,3,2,1,0,11,10];
      addShensha(list, "天喜", "婚恋", "按年支取天喜", hitBranches(pillars, [tianXi[yearBranch]]), "传统上主喜事、庆贺、关系缓和。");
      // 孤辰寡宿口诀：亥子丑见寅(孤)戌(寡)，寅卯辰见巳(孤)丑(寡)，巳午未见申(孤)辰(寡)，申酉戌见亥(孤)未(寡)
      // 原代码按"三合"分组（申子辰/寅午戌/巳酉丑/亥卯未），应为按"三会"季节分组，已修正
      let guChen;
      if ([11,0,1].includes(yearBranch)) guChen = 2;       // 亥子丑 -> 寅
      else if ([2,3,4].includes(yearBranch)) guChen = 5;   // 寅卯辰 -> 巳
      else if ([5,6,7].includes(yearBranch)) guChen = 8;   // 巳午未 -> 申
      else guChen = 11;                                     // 申酉戌 -> 亥
      addShensha(list, "孤辰", "孤独", "按年支三会取孤辰", hitBranches(pillars, [guChen]), "传统上主独立性、独处倾向。");
      let guaSu;
      if ([11,0,1].includes(yearBranch)) guaSu = 10;       // 亥子丑 -> 戌
      else if ([2,3,4].includes(yearBranch)) guaSu = 1;    // 寅卯辰 -> 丑
      else if ([5,6,7].includes(yearBranch)) guaSu = 4;    // 巳午未 -> 辰
      else guaSu = 7;                                       // 申酉戌 -> 未
      addShensha(list, "寡宿", "孤独", "按年支三会取寡宿", hitBranches(pillars, [guaSu]), "传统上主内在世界、情感表达谨慎等象意。");
      // 天德贵人口诀：正丁二申三壬四辛五亥六甲七癸八寅九丙十乙十一巳十二庚
      // 注意：12个月中有8个月对应"天干"、4个月（卯午酉子）对应"地支"，原代码把全部当地支处理，已按干支混合类型修正
      const tianDe = {
        2: { type: "stem", idx: 3 },   // 寅月见丁
        3: { type: "branch", idx: 8 }, // 卯月见申
        4: { type: "stem", idx: 8 },   // 辰月见壬
        5: { type: "stem", idx: 7 },   // 巳月见辛
        6: { type: "branch", idx: 11 },// 午月见亥
        7: { type: "stem", idx: 0 },   // 未月见甲
        8: { type: "stem", idx: 9 },   // 申月见癸
        9: { type: "branch", idx: 2 }, // 酉月见寅
        10: { type: "stem", idx: 2 },  // 戌月见丙
        11: { type: "stem", idx: 1 },  // 亥月见乙
        0: { type: "branch", idx: 5 }, // 子月见巳
        1: { type: "stem", idx: 6 }    // 丑月见庚
      };
      const tianDeEntry = tianDe[monthBranch];
      const tianDePos = tianDeEntry.type === "stem"
        ? hitStems(pillars, [tianDeEntry.idx])
        : hitBranches(pillars, [tianDeEntry.idx]);
      addShensha(list, "天德贵人", "贵人", "按月支取天德（干支各半，非全部为地支）", tianDePos, "传统上主逢凶化吉、长辈助力、福泽。");
      // 月德贵人口诀：寅午戌月见丙，申子辰月见壬，巳酉丑月见庚，亥卯未月见甲（原数组四组全部对应错，已修正）
      const yueDe = { 2:2,6:2,10:2, 8:8,0:8,4:8, 5:6,9:6,1:6, 11:0,3:0,7:0 };
      addShensha(list, "月德贵人", "贵人", "按月支三合取月德", hitStems(pillars, [yueDe[monthBranch]]), "传统上主和善、解厄、贵人助力。");
      // 天德合：天德为天干者取五合，天德为地支者取六合（原逻辑对地支类月份不成立，已按类型分别处理）
      const tianDeHeIdx = tianDeEntry.type === "stem" ? mod(tianDeEntry.idx + 5, 10) : sixHeMap[tianDeEntry.idx];
      const tianDeHePos = tianDeEntry.type === "stem"
        ? hitStems(pillars, [tianDeHeIdx])
        : hitBranches(pillars, [tianDeHeIdx]);
      addShensha(list, "天德合", "贵人", "天德五合／六合", tianDeHePos, "天德之合神。");
      // 月德合＝月德天干五合：寅午戌见辛，申子辰见丁，巳酉丑见乙，亥卯未见己
      const yueDeHe = mod(yueDe[monthBranch] + 5, 10);
      addShensha(list, "月德合", "贵人", "月德天干五合", hitStems(pillars, [yueDeHe]), "月德之合神。");
      // 福星贵人口诀：甲丙相邀入虎乡，更游鼠穴最高强，戊猴己未丁宜亥，乙癸逢牛卯禄昌，庚赶马头辛到巳，壬骑龙背喜非常
      // 甲丙见寅/子，乙癸见卯/丑，戊见申，己见未，丁见亥，庚见午，辛见巳，壬见辰（原数组10干全错，已修正）
      const fuXing = { 0:[2,0],1:[3,1],2:[2,0],3:[11],4:[8],5:[7],6:[6],7:[5],8:[4],9:[3,1] };
      addShensha(list, "福星贵人", "福星", "按日干取福星", hitBranches(pillars, fuXing[dayStem]), "传统上主福气、衣食与贵人缘。");
      // 国印贵人口诀：甲见戌 乙见亥 丙见丑 丁见寅 戊见丑 己见寅 庚见辰 辛见巳 壬见未 癸见申（原数组10干全错，已修正）
      const guoYin = [10,11,1,2,1,2,4,5,7,8];
      addShensha(list, "国印贵人", "权柄", "按日干取国印", hitBranches(pillars, [guoYin[dayStem]]), "传统上主权柄、责任、制度与专业资格。");
      // 学堂/词馆采用子平"长生法"（学堂=如人读书启蒙=日干十二长生位；词馆=学业精专=日干临官/禄位）
      // 说明：学堂另有"纳音法"（需取年柱纳音五行对应长生支），因涉及六十甲子纳音查表、与本引擎单支比对架构不兼容，故未采用；
      // 如需切换为纳音法版本，需另行改造为按年柱干支纳音取值。
      // 长生：甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯
      const xueTang = [11,6,2,9,2,9,5,0,8,3];
      addShensha(list, "学堂", "学业", "按日干取长生（学堂）", hitBranches(pillars, [xueTang[dayStem]]), "传统上主学习、专业能力、教育缘分。");
      // 临官／禄：与"禄神"同支，甲寅 乙卯 丙巳 丁午 戊巳 己午 庚申 辛酉 壬亥 癸子
      addShensha(list, "词馆", "文才", "按日干取临官（词馆）", hitBranches(pillars, [lu[dayStem]]), "传统上主文字、表达、学术、专业输出。");
      const xunStart = mod(r.day.index - r.day.stemIndex, 60);
      const xunEndBranch = mod(xunStart + 9, 12);
      const kong1 = mod(xunEndBranch + 1, 12);
      const kong2 = mod(xunEndBranch + 2, 12);
      addShensha(list, "旬空", "空亡", "按日柱所在旬取空亡", hitBranches(pillars, [kong1, kong2]), "传统上常表示虚、迟、空、变化等象意，需要结合全局。");
      const tianYiBranch = mod(monthBranch + 1, 12);
      addShensha(list, "天医", "传统神煞", "按月支取天医", hitBranches(pillars, [tianYiBranch]), "传统命理神煞，不用于医学诊断。");
      const jieShen = { 0:9,1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:1,9:0,10:11,11:10 };
      addShensha(list, "解神", "解厄", "按月支取解神", hitBranches(pillars, [jieShen[monthBranch]]), "传统上主缓解、转圜、化解。");
      addShensha(list, "咸池", "人缘", "桃花同源规则（年支/日支双查）", hitBranches(pillars, peachTargets), "传统神煞中通常与桃花同论。");
      addShensha(list, "天罗", "杂曜", "常见法取辰", hitBranches(pillars, [4]), "流派差异较大。");
      addShensha(list, "地网", "杂曜", "常见法取戌", hitBranches(pillars, [10]), "流派差异较大。");
      const byCategory = {};
      for (const item of list) {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
      }
      return { count: list.length, items: list, byCategory };
    }
    function calculateRelations(pillars) {
      const names = ["year","month","day","hour"];
      const branches = names.map(key => pillars.raw[key].branchIndex);
      const result = [];
      const sixHe = { 0:1,1:0,2:11,11:2,3:10,10:3,4:9,9:4,5:8,8:5,6:7,7:6 };
      const sixChong = { 0:6,6:0,1:7,7:1,2:8,8:2,3:9,9:3,4:10,10:4,5:11,11:5 };
      for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
          const a = branches[i];
          const b = branches[j];
          if (sixHe[a] === b) result.push({ type: "六合", a: names[i], b: names[j] });
          if (sixChong[a] === b) result.push({ type: "六冲", a: names[i], b: names[j] });
        }
      }
      return result;
    }
    function calculateDayMaster(pillars, elements) {
      const dayStem = pillars.raw.day.stemIndex;
      const element = STEM_ELEMENT[dayStem];
      const own = elements[elementName(element)];
      let level = "中和";
      if (own >= 4) level = "偏强";
      else if (own <= 1) level = "偏弱";
      return {
        stem: stemName(dayStem), element: elementName(element), level,
        note: "基础五行统计，不等同于完整旺衰、格局或用神判断。"
      };
    }
    function calculate(input) {
      if (!input) throw new Error("BaziShensha.calculate() 缺少参数");
      if (input.year == null || input.month == null || input.day == null || input.hour == null) {
        throw new Error("year、month、day、hour 为必填项");
      }
      const pillars = calculatePillars(input);
      const elements = calculateFiveElements(pillars);
      const tenGods = calculateTenGods(pillars);
      const shensha = calculateShensha(pillars);
      const relations = calculateRelations(pillars);
      const dayMaster = calculateDayMaster(pillars, elements);
      return {
        version: "1.0.0",
        input: {
          year: Number(input.year), month: Number(input.month), day: Number(input.day),
          hour: Number(input.hour), minute: Number(input.minute || 0), sex: input.sex || null,
          timezone: input.timezone == null ? 8 : Number(input.timezone),
          trueSolar: !!input.trueSolar,
          longitude: input.longitude != null ? Number(input.longitude) : null
        },
        pillars, bazi: pillars.text, dayMaster,
        fiveElements: elements, tenGods, relations, shensha,
        jieqi: pillars.jieqi
      };
    }
    const API = {
      calculate,
      constants: { stems: STEMS.slice(), branches: BRANCHES.slice(), elements: ELEMENTS.slice() }
    };
    if (typeof global !== "undefined") global.BaziShensha = API;
  })(typeof window !== "undefined" ? window : this);
