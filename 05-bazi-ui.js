// ============================================================
// 八字表单/滚轮/掷筊揭晓 + 共用签文渲染与历史记录
// 原始行号（拆分前单文件 script.js 中的位置）: 2435-3211
// ============================================================
  // ---- 八字 & 神煞：表单收集 -> 排盘 -> 掷筊请示，依筊型决定详细/简版/不显示 ----
  const BAZI_STORAGE_KEY = 'yumiao_bazi_form_v1';
  let baziSelectedSex = 'M';
  let baziResult = null;
  function saveBaziForm() {
    try {
      const data = {
        year: document.getElementById('baziYear')?.value || '',
        month: document.getElementById('baziMonth')?.value || '',
        day: document.getElementById('baziDay')?.value || '',
        hour: document.getElementById('baziHour')?.value || '',
        minute: document.getElementById('baziMinute')?.value || '',
        timezone: document.getElementById('baziTimezone')?.value || '',
        sex: baziSelectedSex,
        trueSolar: !!(document.getElementById('baziTrueSolar')?.checked),
        longitude: document.getElementById('baziLongitude')?.value || ''
      };
      writeStorageJSON(BAZI_STORAGE_KEY, data);
    } catch (_) { /* ignore */ }
  }
  function loadBaziForm() {
    try {
      const data = readStorageJSON(BAZI_STORAGE_KEY, null);
      if (!data) return;
      const set = (id, v) => { const el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
      set('baziYear', data.year);
      set('baziMonth', data.month);
      set('baziDay', data.day);
      set('baziHour', data.hour);
      set('baziMinute', data.minute);
      if (data.timezone != null && data.timezone !== '') set('baziTimezone', data.timezone);
      if (data.longitude != null && data.longitude !== '') set('baziLongitude', data.longitude);
      if (data.sex) selectBaziSex(data.sex);
      const cb = document.getElementById('baziTrueSolar');
      if (cb) {
        cb.checked = !!data.trueSolar;
        toggleTrueSolarUI();
      }
    } catch (_) { /* ignore */ }
  }
  function selectBaziSex(sex) {
    baziSelectedSex = sex;
    document.querySelectorAll('.bazi-sex-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.sex === sex);
    });
    saveBaziForm();
  }
  // ---- 通用滚动轮选择器 ----
  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }
  // ============================================================
  // 共用出生信息（八字 / 星座 / 西方星盘自动对齐）
  // ============================================================
  const SHARED_BIRTH_KEY = 'yumiao_shared_birth_v1';
  function loadSharedBirth() {
    return readStorageJSON(SHARED_BIRTH_KEY, null);
  }
  function saveSharedBirth(partial) {
    const next = Object.assign({}, loadSharedBirth() || {}, partial || {});
    writeStorageJSON(SHARED_BIRTH_KEY, next);
  }
  function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el && value != null && value !== '') el.value = value;
  }
  function syncCityCheckboxes(prefix, city) {
    if (city !== 'shenyang' && city !== 'toronto') return;
    const sy = document.getElementById(prefix + 'CityShenyang');
    const to = document.getElementById(prefix + 'CityToronto');
    if (sy) sy.checked = city === 'shenyang';
    if (to) to.checked = city === 'toronto';
  }
  function applySharedToBazi() {
    const s = loadSharedBirth();
    if (!s) return;
    setInputValue('baziYear', s.year);
    setInputValue('baziMonth', s.month);
    setInputValue('baziDay', s.day);
    setInputValue('baziHour', s.hour);
    setInputValue('baziMinute', s.minute);
    setInputValue('baziTimezone', s.tzOffset);
    setInputValue('baziLongitude', s.lng);
    syncCityCheckboxes('bazi', s.city);
  }
  function applySharedToZodiac() {
    const s = loadSharedBirth();
    if (!s) return;
    if (s.month != null) zodiacMonthVal = +s.month;
    if (s.day != null) zodiacDayVal = +s.day;
    setInputValue('zodiacMonth', zodiacMonthVal);
    setInputValue('zodiacDay', zodiacDayVal);
    syncCityCheckboxes('zodiac', s.city);
  }
  function applySharedToWestern() {
    const s = loadSharedBirth();
    if (!s) return;
    if (s.year != null) westernYearVal = +s.year;
    if (s.month != null) westernMonthVal = +s.month;
    if (s.day != null) westernDayVal = +s.day;
    if (s.hour != null) westernHourVal = +s.hour;
    if (s.minute != null) westernMinuteVal = +s.minute;
    setInputValue('westernYear', westernYearVal);
    setInputValue('westernMonth', westernMonthVal);
    setInputValue('westernDay', westernDayVal);
    setInputValue('westernHour', westernHourVal);
    setInputValue('westernMinute', westernMinuteVal);
    setInputValue('westernLat', s.lat);
    setInputValue('westernLng', s.lng);
    setInputValue('westernTz', s.tz);
    syncCityCheckboxes('western', s.city);
  }
  function pushBaziToShared() {
    saveSharedBirth({
      year: document.getElementById('baziYear')?.value,
      month: document.getElementById('baziMonth')?.value,
      day: document.getElementById('baziDay')?.value,
      hour: document.getElementById('baziHour')?.value,
      minute: document.getElementById('baziMinute')?.value,
      tzOffset: document.getElementById('baziTimezone')?.value,
      lng: document.getElementById('baziLongitude')?.value,
      city: document.getElementById('baziCityShenyang')?.checked ? 'shenyang'
        : (document.getElementById('baziCityToronto')?.checked ? 'toronto' : undefined)
    });
  }
  // ===== 共用出生日期/时间滚轮 =====
  // 只抽取“范围、日期联动、滚轮构建”这类纯 UI 重复逻辑；
  // 八字/西方星盘仍保留各自的状态、存储和业务回调。
  function initDateTimeWheelSet(cfg) {
    if (!cfg || !cfg.ids || !cfg.state) return;
    const ids = cfg.ids, s = cfg.state;
    const get = id => document.getElementById(id);
    const yearEl=get(ids.yearWheel), monthEl=get(ids.monthWheel), dayEl=get(ids.dayWheel);
    if (!yearEl || !monthEl || !dayEl) return;

    const readNum = (id, fallback) => {
      const el=get(id), n=el ? Number(el.value) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };
    const write = (field, value) => {
      const el=get(ids[field]);
      if (el) el.value=value;
    };
    const notify = field => {
      if (cfg.onChange) cfg.onChange(field, s);
    };

    s.year=readNum(ids.year, s.year);
    s.month=readNum(ids.month, s.month);
    s.day=readNum(ids.day, s.day);
    if (ids.hour) s.hour=readNum(ids.hour, s.hour);
    if (ids.minute) s.minute=readNum(ids.minute, s.minute);

    const years=[];
    for(let y=cfg.yearMin ?? 1920;y<= (cfg.yearMax ?? 2030);y++) years.push(y);
    const months=[1,2,3,4,5,6,7,8,9,10,11,12];
    const hours=[];
    const minutes=[];
    if(ids.hourWheel) for(let h=0;h<=23;h++) hours.push(h);
    if(ids.minuteWheel) for(let m=0;m<=59;m++) minutes.push(m);

    const rebuildDays=()=>{
      const maxd=daysInMonth(s.year,s.month);
      if(s.day>maxd) s.day=maxd;
      const days=[];
      for(let d=1;d<=maxd;d++) days.push(d);
      buildWheel(dayEl,days,days.map(d=>d+'日'),s.day,v=>{
        s.day=v; write('day',v); notify('day');
      });
      write('day',s.day);
    };

    buildWheel(yearEl,years,years.map(y=>y+'年'),s.year,v=>{
      s.year=v; write('year',v); rebuildDays(); notify('year');
    });
    buildWheel(monthEl,months,months.map(m=>m+'月'),s.month,v=>{
      s.month=v; write('month',v); rebuildDays(); notify('month');
    });
    rebuildDays();

    if(ids.hourWheel){
      const el=get(ids.hourWheel);
      buildWheel(el,hours,hours.map(h=>String(h).padStart(2,'0')+'时'),s.hour,v=>{
        s.hour=v; write('hour',v); notify('hour');
      });
      write('hour',s.hour);
    }
    if(ids.minuteWheel){
      const el=get(ids.minuteWheel);
      buildWheel(el,minutes,minutes.map(m=>String(m).padStart(2,'0')+'分'),s.minute,v=>{
        s.minute=v; write('minute',v); notify('minute');
      });
      write('minute',s.minute);
    }
  }
  function playWheelTick() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!window._yumiaoWheelAC) window._yumiaoWheelAC = new AC();
      const ctx = window._yumiaoWheelAC;
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, t0);
      osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.045);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.055);
    } catch (_) {}
  }
  function buildWheel(colEl, values, labels, selected, onChange) {
    if (!colEl) return;
    colEl.innerHTML = '';
    const pad = document.createElement('div');
    pad.className = 'wheel-item';
    pad.style.visibility = 'hidden';
    colEl.appendChild(pad.cloneNode(true));
    values.forEach((v, i) => {
      const item = document.createElement('div');
      item.className = 'wheel-item' + (v === selected ? ' active' : '');
      item.dataset.value = v;
      item.textContent = labels ? labels[i] : String(v);
      colEl.appendChild(item);
    });
    colEl.appendChild(pad.cloneNode(true));
    const itemH = 36;
    let lastIdx = values.indexOf(selected);
    const scrollToSelected = () => {
      const idx = values.indexOf(selected);
      if (idx >= 0) colEl.scrollTop = idx * itemH;
    };
    requestAnimationFrame(scrollToSelected);
    let scrollTimer = null;
    colEl.onscroll = () => {
      clearTimeout(scrollTimer);
      const liveIdx = Math.round(colEl.scrollTop / itemH);
      const liveClamped = Math.max(0, Math.min(values.length - 1, liveIdx));
      colEl.querySelectorAll('.wheel-item').forEach((el, i) => {
        el.classList.toggle('active', i === liveClamped + 1);
      });
      if (liveClamped !== lastIdx) { lastIdx = liveClamped; playWheelTick(); }
      scrollTimer = setTimeout(() => {
        const idx = Math.round(colEl.scrollTop / itemH);
        const clamped = Math.max(0, Math.min(values.length - 1, idx));
        colEl.scrollTo({ top: clamped * itemH, behavior: 'smooth' });
        colEl.querySelectorAll('.wheel-item').forEach((el, i) => {
          el.classList.toggle('active', i === clamped + 1);
        });
        selected = values[clamped];
        if (onChange) onChange(selected);
      }, 80);
    };
  }
    function initBaziDateWheels() {
    const state = { year:1990, month:6, day:15, hour:12, minute:0 };
    initDateTimeWheelSet({
      state,
      ids:{
        yearWheel:'baziYearWheel', monthWheel:'baziMonthWheel', dayWheel:'baziDayWheel',
        hourWheel:'baziHourWheel', minuteWheel:'baziMinuteWheel',
        year:'baziYear', month:'baziMonth', day:'baziDay', hour:'baziHour', minute:'baziMinute'
      },
      onChange: () => pushBaziToShared()
    });
  }
  function openBaziPanel() {
    loadBaziForm();
    initBaziDateWheels();
    ModalUI.open('bazi');
  }
  function closeBaziPanel() {
    ModalUI.close('bazi');
    clearQuestionSelectionToDefault();
  }
  function backToBaziForm() {
    const reveal = document.getElementById('baziReveal');
    const form = document.getElementById('baziForm');
    if (reveal) reveal.style.display = 'none';
    if (form) form.style.display = '';
  }
  function toggleTrueSolarUI() {
    const cb = document.getElementById('baziTrueSolar');
    const row = document.getElementById('baziLonRow');
    if (row) row.style.display = (cb && cb.checked) ? 'flex' : 'none';
  }
  function readBaziInput() {
    const year = parseInt(document.getElementById('baziYear').value, 10);
    const month = parseInt(document.getElementById('baziMonth').value, 10);
    const day = parseInt(document.getElementById('baziDay').value, 10);
    const hour = parseInt(document.getElementById('baziHour').value, 10);
    const minuteRaw = document.getElementById('baziMinute').value;
    const minute = minuteRaw === '' ? 0 : parseInt(minuteRaw, 10);
    const tzRaw = document.getElementById('baziTimezone').value;
    const timezone = tzRaw === '' ? 8 : Number(tzRaw);
    const trueSolar = !!(document.getElementById('baziTrueSolar') && document.getElementById('baziTrueSolar').checked);
    const lonRaw = document.getElementById('baziLongitude') ? document.getElementById('baziLongitude').value : '';
    const longitude = lonRaw === '' ? null : Number(lonRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour)) {
      return { error: '请完整填写出生年、月、日、时。' };
    }
    if (month < 1 || month > 12) return { error: '月份需在 1-12 之间。' };
    if (day < 1 || day > 31) return { error: '日期需在 1-31 之间。' };
    if (hour < 0 || hour > 23) return { error: '小时需在 0-23 之间（24小时制）。' };
    if (trueSolar && (longitude == null || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      return { error: '启用真太阳时时请填写有效出生地经度（-180~180）。' };
    }
    return {
      input: { year, month, day, hour, minute, sex: baziSelectedSex, timezone, trueSolar, longitude }
    };
  }
  function submitBaziForm() {
    pushBaziToShared();
    const errEl = document.getElementById('baziError');
    if (errEl) errEl.textContent = '';
    const parsed = readBaziInput();
    if (parsed.error) {
      if (errEl) errEl.textContent = parsed.error;
      return;
    }
    saveBaziForm();
    let result;
    try {
      result = BaziShensha.calculate(parsed.input);
    } catch (_) {
      if (errEl) errEl.textContent = '排盘失败，请检查出生信息是否正确。';
      return;
    }
    baziResult = result;
    saveProfileSummary('bazi', `${result.bazi}·日主${result.dayMaster.stem}`);
    const form = document.getElementById('baziForm');
    const reveal = document.getElementById('baziReveal');
    if (form) form.style.display = 'none';
    if (reveal) reveal.style.display = 'flex';
    castBaziJiao();
  }
  function castBaziJiao() {
    if (!baziResult) return;
    const recastBtn = document.getElementById('baziRecast');
    const jiaoLabel = document.getElementById('baziJiaoLabel');
    const reportEl = document.getElementById('baziReport');
    const display = document.getElementById('baziJiaoDisplay');
    if (!display) return;
    if (recastBtn) recastBtn.style.display = 'none';
    if (jiaoLabel) { jiaoLabel.textContent = ''; jiaoLabel.className = 'mbti-jiao-label'; }
    if (reportEl) reportEl.innerHTML = '';
    getAudioCtx();
    display.innerHTML = '';
    const type = rollJiaoType();
    const [left, right] = facesForType(type);
    const jiao1 = document.createElement('div');
    const jiao2 = document.createElement('div');
    jiao1.className = 'jiao spinning';
    jiao2.className = 'jiao spinning';
    display.appendChild(jiao1);
    display.appendChild(jiao2);
    setTimeout(() => {
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
        renderBaziReveal(type);
      } catch (_) {
        if (reportEl) {
          reportEl.innerHTML = '<div class="mbti-no-report">掷筊失败，只能遵从内心，随遇而安。</div>';
        }
      } finally {
        if (recastBtn) recastBtn.style.display = 'inline-block';
      }
    }, 1000);
  }
  const BAZI_POS_LABEL = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };
  const SHENSHA_DICT = {
    '天乙贵人': '传统命理中常作为贵人、助力、人缘之象，逢凶多能化吉。',
    '太极贵人': '主悟性、钻研、玄学、哲思，适合学问与精神追求。',
    '文昌贵人': '主学习、考试、文书、表达与思维清晰。',
    '天厨贵人': '多与衣食、生活享受、福气有关。',
    '驿马': '主迁移、奔波、旅行、变化，动中求进。',
    '桃花': '主魅力、人缘、社交吸引力与感情缘分。',
    '华盖': '主独立、专研、艺术、宗教哲思。',
    '将星': '主组织、掌控、领导与执行力。',
    '亡神': '流派解释差异大，多提示需留意变化与隐患。',
    '劫煞': '多表示竞争、压力、突发变化。',
    '金舆': '常取富贵、生活条件、婚姻助力等象意。',
    '禄神': '主俸禄、资源、稳定收入与福气。',
    '羊刃': '主执行力、刚烈、竞争性，需善用其锋芒。',
    '红鸾': '主喜庆、婚恋、人际缘分。',
    '天喜': '主喜事、庆贺、关系缓和。',
    '孤辰': '主独立性、独处倾向。',
    '寡宿': '主内在世界、情感表达较为谨慎。',
    '天德贵人': '主逢凶化吉、长辈助力、福泽。',
    '月德贵人': '主和善、解厄、贵人助力。',
    '天德合': '天德之合神，辅助贵人力量。',
    '月德合': '月德之合神，辅助解厄。',
    '福星贵人': '主福气、衣食与贵人缘。',
    '国印贵人': '主权柄、责任、制度与专业资格。',
    '学堂': '主学习、专业能力、教育缘分。',
    '词馆': '主文字、表达、学术、专业输出。',
    '旬空': '常表示虚、迟、空、变化，需结合全局。',
    '天医': '传统命理神煞，不用于医学诊断。',
    '解神': '主缓解、转圜、化解。',
    '咸池': '与桃花同论，主情感与人缘。',
    '天罗': '流派差异较大，常见取辰。',
    '地网': '流派差异较大，常见取戌。'
  };
  function formatBaziPillar(label, p) {
    return `${label}${p.text}（${p.stemElement}/${p.branchElement}，${p.yinYang}）`;
  }
  function buildFortuneTexts(r) {
    const dm = r.dayMaster;
    const tg = r.tenGods;
    const el = r.fiveElements;
    const level = dm.level;
    const hasCai = [tg.year, tg.month, tg.hour].some(x => x === '正财' || x === '偏财');
    const hasGuan = [tg.year, tg.month, tg.hour].some(x => x === '正官' || x === '七杀');
    const hasYin = [tg.year, tg.month, tg.hour].some(x => x === '正印' || x === '偏印');
    const weak = level === '偏弱';
    const strong = level === '偏强';
    const wealth = hasCai
      ? (strong ? '财星透出且日主有力，财运多主稳健进取，宜把握正当渠道。' : '财星可见，然日主偏弱，宜量力而行，忌投机过重。')
      : (weak ? '财星不显且日主偏弱，财运宜守成，积少成多。' : '财星不显，财来财去皆需自省，宜勤恳积累。');
    const marriage = (r.shensha.items.some(i => i.name === '桃花' || i.name === '红鸾' || i.name === '天喜'))
      ? '命带桃花/红鸾/天喜之象，感情缘分较显，宜真诚相待。'
      : (hasCai || hasGuan ? '官财相关十神可见，婚姻关系多与现实条件交织，宜理性经营。' : '感情运需结合流年大运细看，宜修身以待缘。');
    const career = hasGuan
      ? '官杀透干，事业上多有责任与竞争，宜守正用权。'
      : (hasYin ? '印星助力，学业或专业技能可成事业根基。' : '事业宜从日主五行所喜方向发展，稳中求进。');
    const healthMap = { 木: '肝胆、筋骨', 火: '心脏、血压、眼目', 土: '脾胃、消化', 金: '肺、呼吸道、皮肤', 水: '肾、泌尿、耳' };
    const lowEls = Object.entries(el).filter(([, v]) => v <= 1).map(([k]) => k);
    const health = lowEls.length
      ? `五行偏缺于${lowEls.join('、')}，日常可留意${lowEls.map(e => healthMap[e] || e).join('与')}相关调养，作息规律为要。`
      : '五行分布相对均衡，健康关键在规律作息与情绪平和。';
    const currentYear = new Date().getFullYear();
    const liunian = `流年以公历${currentYear}年论，具体吉凶需对照当年干支与原局刑冲合会，宜把握「用神得力」之年主动作为。`;
    const dayun = '大运起运与顺逆依年干阴阳与性别而定，每运十年。详细起运岁数与运程干支建议以完整排盘软件核对；此处仅提示：大运引动原局喜用神时多为顺遂期。';
    return { wealth, marriage, career, health, liunian, dayun };
  }
  function openShenshaDict() {
    const items = (baziResult && baziResult.shensha && baziResult.shensha.items) || [];
    const names = items.length ? [...new Set(items.map(i => i.name))] : Object.keys(SHENSHA_DICT);
    let html = '<div class="mbti-intro" style="margin-bottom:8px;">以下为常见神煞简释（命理参考，非定论）。点击关闭返回。</div>';
    names.forEach(name => {
      const desc = SHENSHA_DICT[name] || (items.find(i => i.name === name) || {}).description || '传统神煞，流派解释不一。';
      const pos = items.filter(i => i.name === name).map(i => i.positionNames.join('、')).filter(Boolean);
      html += `<div class="mbti-sec" style="margin-bottom:8px;"><span class="mbti-sec-label">${escapeHtml(name)}</span>${pos.length ? '（' + escapeHtml(pos.join('；')) + '）' : ''}<br><span style="color:#5a4526;">${escapeHtml(desc)}</span></div>`;
    });
    const reportEl = document.getElementById('baziReport');
    if (reportEl) {
      reportEl.dataset.prevHtml = reportEl.innerHTML;
      reportEl.innerHTML = html + '<div style="text-align:center;margin-top:10px;"><button class="mbti-reset" onclick="closeShenshaDict()">返回排盘结果</button></div>';
    }
  }
  function closeShenshaDict() {
    const reportEl = document.getElementById('baziReport');
    if (reportEl && reportEl.dataset.prevHtml) {
      reportEl.innerHTML = reportEl.dataset.prevHtml;
      delete reportEl.dataset.prevHtml;
    }
  }
  function renderBaziReveal(type) {
    const meta = typeMeta[type] || typeMeta.xiao;
    const jiaoLabel = document.getElementById('baziJiaoLabel');
    const reportEl = document.getElementById('baziReport');
    if (jiaoLabel) {
      jiaoLabel.className = 'mbti-jiao-label ' + meta.class;
      jiaoLabel.textContent = `${meta.label} · ${meta.meaning}`;
    }
    if (!reportEl || !baziResult) return;
    if (type === 'yin') {
      reportEl.innerHTML =
        '<div class="mbti-no-report">两筊皆阴，神明未允此问。命理之相尚待重新省思，此次暂不显示排盘结果，可静心后再掷。</div>';
      return;
    }
    const r = baziResult;
    const p = r.pillars;
    const trueSolarNote = r.input && r.input.trueSolar
      ? `<div class="mbti-brief-note">已按真太阳时排盘（经度 ${r.input.longitude}°）</div>`
      : '';
    if (type === 'sheng') {
      const shenshaText = r.shensha.items.length
        ? r.shensha.items.map(it => `${it.name}(${it.positionNames.join('、')})`).join('、')
        : '未见明显神煞入命';
      const relationsText = r.relations.length
        ? r.relations.map(rel => `${BAZI_POS_LABEL[rel.a]}-${BAZI_POS_LABEL[rel.b]} ${rel.type}`).join('、')
        : '四柱之间无明显六合六冲';
      const f = buildFortuneTexts(r);
      reportEl.innerHTML = `
        <div class="mbti-type">${escapeHtml(r.bazi)}</div><div class="mbti-summary">日主 ${escapeHtml(r.dayMaster.stem)}（${escapeHtml(r.dayMaster.element)}）· ${escapeHtml(r.dayMaster.level)}</div>
        ${trueSolarNote}
        <div class="mbti-sec"><span class="mbti-sec-label">四柱</span>${escapeHtml(formatBaziPillar('年', p.year))}；${escapeHtml(formatBaziPillar('月', p.month))}；${escapeHtml(formatBaziPillar('日', p.day))}；${escapeHtml(formatBaziPillar('时', p.hour))}</div><div class="mbti-sec"><span class="mbti-sec-label">五行</span>木${r.fiveElements['木']} 火${r.fiveElements['火']} 土${r.fiveElements['土']} 金${r.fiveElements['金']} 水${r.fiveElements['水']}</div><div class="mbti-sec"><span class="mbti-sec-label">十神</span>年：${escapeHtml(r.tenGods.year)}；月：${escapeHtml(r.tenGods.month)}；时：${escapeHtml(r.tenGods.hour)}</div><div class="mbti-sec"><span class="mbti-sec-label">神煞</span>${escapeHtml(shenshaText)}</div><div class="mbti-sec"><span class="mbti-sec-label">地支</span>${escapeHtml(relationsText)}</div><div class="mbti-sec"><span class="mbti-sec-label">财运</span>${escapeHtml(f.wealth)}</div><div class="mbti-sec"><span class="mbti-sec-label">婚姻</span>${escapeHtml(f.marriage)}</div><div class="mbti-sec"><span class="mbti-sec-label">事业</span>${escapeHtml(f.career)}</div><div class="mbti-sec"><span class="mbti-sec-label">健康</span>${escapeHtml(f.health)}</div><div class="mbti-sec"><span class="mbti-sec-label">大运</span>${escapeHtml(f.dayun)}</div><div class="mbti-sec"><span class="mbti-sec-label">流年</span>${escapeHtml(f.liunian)}</div><div class="mbti-brief-note">${escapeHtml(r.dayMaster.note)}</div><div style="text-align:center;margin-top:10px;"><button class="mbti-cast-btn" onclick="openShenshaDict()">神煞词典</button></div>
      `;
    } else {
      reportEl.innerHTML = `
        <div class="mbti-type">${escapeHtml(r.bazi)}</div><div class="mbti-summary">日主 ${escapeHtml(r.dayMaster.stem)}（${escapeHtml(r.dayMaster.element)}）· ${escapeHtml(r.dayMaster.level)}</div>
        ${trueSolarNote}
        <div class="mbti-brief-note">两筊皆阳，天机含笑未决，此为简版排盘，仅供参考，非定论。</div>
      `;
    }
  }
  // 打开 MBTI/八字/星座 等扩展面板后，若用户中途关闭而未完成，
  // 主输入框不应残留该扩展的占位文字（否则误按下方掷筊会把它当成真实问题提交）。
  // 统一清回占位符状态，无需整页重置即可重新选择。
  function clearQuestionSelectionToDefault() {
    if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
    fillQuestionText('', true);
  }
  function closeMbtiQuiz() {
    ModalUI.close('mbti');
    clearQuestionSelectionToDefault();
  }
  function handleBeastKey(e, el) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      selectBeast(el);
    }
  }
  function selectBeast(el) {
    document.querySelectorAll('.jade-zone').forEach(z => z.classList.remove('active'));
    if (selectedBeast === el.dataset.beast) {
      selectedBeast = null;
      document.getElementById('selectedLine').innerHTML = '1️⃣⬆️预选🐲🐯🦁护法问卜／不选=随机🔮';
      return;
    }
    el.classList.add('active');
    selectedBeast = el.dataset.beast;
    const info = beastInfo[selectedBeast];
    document.getElementById('selectedLine').innerHTML =
      `已请示 <span>${info.emoji} ${info.name}</span>`;
    if (selectedBeast === 'dragon') playQing();
    else if (selectedBeast === 'tiger') playBell();
    else if (selectedBeast === 'lion') playZhong();
  }
  function getRandomBeast() {
    const keys = Object.keys(beastInfo);
    return keys[Math.floor(Math.random() * keys.length)];
  }
  function renderOracleHTML(obj) {
    // 渲染前强制校验，杜绝空字段或异常对象
    const safe = (typeof isValidOracle === 'function' && isValidOracle(obj))
      ? obj
      : (typeof pickGuardianOracle === 'function' ? pickGuardianOracle('xiao') : {
          神意: '护法示下：天机暂隐，宜顺其自然，耐心等待天时自至。',
          宜: '顺其自然',
          忌: '强求答案'
        });
    const poemHTML = (safe['诗偈'] && safe['诗偈'].length)
      ? `<div class="oracle-poem">${safe['诗偈'].map(l => `<div>${escapeHtml(l)}</div>`).join('')}</div>`
      : '';
    return `
      ${poemHTML}
      <div class="oracle-shenyi">${escapeHtml(safe['神意'])}</div><div class="oracle-yiji"><div class="oracle-pill yi"><span class="oracle-tag">宜</span>${escapeHtml(safe['宜'])}</div><div class="oracle-pill ji"><span class="oracle-tag">忌</span>${escapeHtml(safe['忌'])}</div></div>
    `;
  }
  const categoryLabels = {
    marriage: '婚姻情感', job: '工作职场', wealth: '财运钱财', career: '事业发展',
    children: '子女生育', dream: '梦境解析', life: '日常生活', abroad: '出国移民',
    travel: '旅行出游', weather: '天气气候', sports: '运动竞技'
  };
  async function castJiao() {
    const btn = document.getElementById('castBtn');
    if (btn.disabled) return;
    const question = document.getElementById('question').value.trim();
    if (!question) {
      const qEl = document.getElementById('question');
      if (typeof showMainMenu === 'function') showMainMenu();
      if (qEl) {
        qEl.style.borderColor = '#c08080';
        setTimeout(() => { qEl.style.borderColor = ''; }, 1200);
      }
      return;
    }
    const now = Date.now();
    const beastIdentity = selectedBeast || 'random'; // 未选择视为「随机」这一身份，用于冷却比对
    const sameBeastAsLast = lastBeastIdentity !== null && beastIdentity === lastBeastIdentity;
    if (typeof lastQuestion !== 'undefined' && question === lastQuestion && sameBeastAsLast && (now - lastQuestionAt) < SAME_Q_COOLDOWN_MS) {
      const descEl = document.getElementById('resultDesc');
      const remain = Math.ceil((SAME_Q_COOLDOWN_MS - (now - lastQuestionAt)) / 1000);
      document.getElementById('resultTitle').textContent = '静心片刻';
      document.getElementById('resultTitle').className = 'result-title xiao';
      document.getElementById('resultBeast').textContent = '';
      descEl.classList.remove('loading');
      descEl.innerHTML = renderOracleHTML(
        typeof makeOracle === 'function'
          ? makeOracle({
              神意: `同一所问，神明已有示兆。请静心体会约 ${remain} 秒后再求，勿急于连掷；若想请示别位瑞兽，可直接点选⬆️🐲🐯🦁换一位再问。`,
              宜: '静心体悟',
              忌: '反复追问'
            }, 'xiao', 'general', 'cooldown')
          : {
              神意: `同一所问，神明已有示兆。请静心体会约 ${remain} 秒后再求，勿急于连掷；若想请示别位瑞兽，可直接点选⬆️🐲🐯🦁换一位再问。`,
              宜: '静心体悟',
              忌: '反复追问'
            }
      );
      return;
    }
    btn.disabled = true;
    getAudioCtx();
    const myToken = ++castToken;
    document.getElementById('sealImg').classList.add('watermark');
    document.getElementById('resultTitle').textContent = '';
    const descEl = document.getElementById('resultDesc');
    descEl.textContent = '';
    descEl.classList.remove('loading');
    document.getElementById('resultBeast').textContent = '';
    const display = document.getElementById('jiaoDisplay');
    display.innerHTML = '';
    const type = rollJiaoType();
    const [left, right] = facesForType(type);
    const jiao1 = document.createElement('div');
    const jiao2 = document.createElement('div');
    jiao1.className = 'jiao spinning';
    jiao2.className = 'jiao spinning';
    display.appendChild(jiao1);
    display.appendChild(jiao2);
    setTimeout(async () => {
      if (myToken !== castToken) return;
      try {
        jiao1.classList.remove('spinning');
        jiao2.classList.remove('spinning');
        jiao1.classList.add(left === 1 ? 'yang' : 'yin');
        jiao2.classList.add(right === 1 ? 'yang' : 'yin');
        jiao1.style.setProperty('--land-rot', ((Math.random() * 14) - 7).toFixed(1) + 'deg');
        jiao2.style.setProperty('--land-rot', ((Math.random() * 14) - 7).toFixed(1) + 'deg');
        jiao1.classList.add('landed');
        jiao2.classList.add('landed');
        playJiaoLand();
        const beastKey = selectedBeast || getRandomBeast();
        const info = beastInfo[beastKey] || beastInfo.dragon;
        const meta = typeMeta[type] || typeMeta.xiao;
        const titleEl = document.getElementById('resultTitle');
        titleEl.textContent = meta.title;
        titleEl.className = 'result-title ' + meta.class;
        document.getElementById('resultBeast').textContent = `${info.emoji} ${info.name} · ${info.style}`;
        descEl.textContent = '叩问神明，判词生成中…';
        descEl.classList.add('loading');
        const oracle = await resolveOracle(question, type, beastKey);
        if (myToken !== castToken) return;
        try {
          descEl.classList.remove('loading');
          descEl.innerHTML = renderOracleHTML(oracle);
          lastQuestion = question;
          lastQuestionAt = Date.now();
          lastBeastIdentity = beastIdentity;
          addHistory(question, type, info.name, oracle);
        } catch (_) {
          descEl.classList.remove('loading');
          descEl.innerHTML = renderOracleHTML(
            (typeof pickGuardianOracle === 'function') ? pickGuardianOracle(type) : ultimateFallback
          );
        }
      } catch (_) {
        try {
          document.getElementById('resultTitle').textContent = '天机含蓄';
          document.getElementById('resultTitle').className = 'result-title xiao';
          document.getElementById('resultBeast').textContent = '';
          descEl.classList.remove('loading');
          descEl.innerHTML = renderOracleHTML(
            (typeof pickGuardianOracle === 'function') ? pickGuardianOracle('xiao') : ultimateFallback
          );
        } catch (__) {
          try {
            descEl.textContent = '护法示下：宜顺其自然，耐心等待天时。';
          } catch (___) {}
        }
      } finally {
        if (myToken === castToken) {
          setTimeout(() => { if (myToken === castToken) btn.disabled = false; }, POST_CAST_COOLDOWN_MS);
        }
      }
    }, 1000);
  }
  function addHistory(question, type, beastName, oracle) {
    const typeMap = {
      sheng: { text: '聖筊', cls: 'sheng' },
      xiao:  { text: '笑筊', cls: 'xiao' },
      yin:   { text: '陰筊', cls: 'yin' }
    };
    const safeType = typeMap[type] || typeMap.xiao;
    let snippet = '';
    try {
      if (oracle && oracle['神意']) {
        snippet = String(oracle['神意']);
        if (snippet.length > 16) snippet = snippet.slice(0, 16) + '…';
      }
    } catch (_) { snippet = ''; }
    history.unshift({
      q: question.length > 18 ? question.slice(0, 18) + '…' : question,
      result: safeType,
      beast: beastName || '',
      snippet,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });
    if (history.length > 8) history.pop();
    renderHistory();
  }
  function renderHistory() {
    const list = document.getElementById('historyList');
    const profileBar = renderProfileSummaryBar();
    if (history.length === 0) {
      list.innerHTML = profileBar + '<div class="history-empty">暂无请示记录</div>';
      return;
    }
    list.innerHTML = profileBar + history.map(h => `
      <div class="history-item"><span>${h.time} · ${escapeHtml(h.q)}${h.snippet ? `<br><span style="color:#a08c60;font-size:10px;">${escapeHtml(h.snippet)}</span>` : ''}</span><span class="history-result ${h.result.cls}">${h.result.text}（${escapeHtml(h.beast)}）</span></div>
    `).join('');
  }
  function toggleHistory() {
    const box = document.getElementById('historyBox');
    const backdrop = document.getElementById('historyBackdrop');
    const btn = document.getElementById('recordBtn');
    const opening = !box.classList.contains('show');
    if (opening) renderHistory();
    box.classList.toggle('show', opening);
    backdrop.classList.toggle('show', opening);
    btn.classList.toggle('on', opening);
    if (opening) lockPageScroll(); else unlockPageScroll();
  }
  function resetAll() {
    castToken++; // 使任何仍在等待神谕的请求失效
    customEditing = false;
    lastQuestion = '';
    lastQuestionAt = 0;
    lastBeastIdentity = null;
    if (typeof closeAllMenus === 'function') closeAllMenus();
    if (typeof clearPreferredCategory === 'function') clearPreferredCategory();
    const qEl = document.getElementById('question');
    qEl.value = '';
    qEl.style.borderColor = '';
    qEl.style.height = 'auto';
    qEl.readOnly = true;
    qEl.setAttribute('readonly', 'readonly');
    selectedBeast = null;
    document.querySelectorAll('.jade-zone').forEach(z => z.classList.remove('active'));
    document.getElementById('selectedLine').innerHTML = '1️⃣⬆️预选🐲🐯🦁护法问卜／不选=随机🔮';
    document.getElementById('jiaoDisplay').innerHTML = '';
    document.getElementById('resultTitle').textContent = '';
    document.getElementById('resultTitle').className = 'result-title';
    const descEl = document.getElementById('resultDesc');
    descEl.textContent = '';
    descEl.classList.remove('loading');
    document.getElementById('resultBeast').textContent = '';
    document.getElementById('sealImg').classList.remove('watermark');
    document.getElementById('castBtn').disabled = false;
    const _histBoxWasOpen = document.getElementById('historyBox').classList.contains('show');
    document.getElementById('historyBox').classList.remove('show');
    document.getElementById('historyBackdrop').classList.remove('show');
    document.getElementById('recordBtn').classList.remove('on');
    if (_histBoxWasOpen) unlockPageScroll();
  }
  document.getElementById('question').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      castJiao();
    }
  });
  document.getElementById('manualQuestionInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      confirmManualQuestion(true, true);
    }
  });
  document.getElementById('manualQuestionInput').addEventListener('blur', function() {
    setTimeout(() => { confirmManualQuestion(false, false); }, 120);
  });
