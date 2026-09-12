// ============================================================
// 命运圆盘小游戏
// 原始行号（拆分前单文件 script.js 中的位置）: 4594-4936
// ============================================================
  // ============================================================
  // 命运圆盘：长按箱图（龙虎狮宝箱画）· 禁止保存图片 · 转盘 3 秒
  // ============================================================
  const FORTUNE_SEGMENTS = [
    { label: '今日心情', tag: '心情', lines: [
      '像被太阳晒过的毛线球，懒洋洋但心里暖。',
      '有点冒泡的苏打水：轻快、想笑、坐不住。',
      '窗外细雨敲窗，适合把心事叠整齐再出门。',
      '胸口像藏了一小盏灯，不刺眼，但一直亮着。'
    ], cat: '🐱 猫曰：心情不需满分，真实就好。'},
    { label: '运势风向', tag: '运势', lines: [
      '东风徐来，琐事易顺；大事仍宜留一寸余地。',
      '今日宜守不宜抢，像猫盯猎物——再等半息。',
      '贵人气息若隐若现，主动一句问候可能接通。',
      '小波折是提示而非拦路，绕行比硬闯更省力。'
    ], cat: '🐱 猫曰：顺风时收帆，逆风时调整舵角。'},
    { label: '宜做什么', tag: '宜', lines: [
      '今日适合散步、晒背、把拖延的小任务收掉一件。',
      '宜整理桌面或相册，给脑袋腾出空位。',
      '宜联系一位久未问候的人，短讯即可。',
      '宜尝试一道新菜或一条没走过的路。'
    ], cat: '🐱 猫曰：小事做成，也是修行。'},
    { label: '忌什么', tag: '忌', lines: [
      '忌在情绪顶峰做不可逆决定，先喝口水再说。',
      '忌同时开启三件难事，选一件打穿即可。',
      '忌与人比进度，比的是自己的节律。',
      '忌熬夜刷信息流，睡眠是明天的贵人。'
    ], cat: '🐱 猫曰：不做什么，有时比做什么更聪明。'},
    { label: '一则笑话', tag: '笑话', lines: [
      '猫为什么不玩扑克？怕自己是「抓」牌高手，却总被「鼠」套牢。',
      '程序员的猫调试人生：能复现的叫日常，复现不了的叫玄学。',
      '问猫幸福是什么？猫：有窗、有暖、有你晚归时记得先摸我。',
      '算命猫开业第一天就休息——它说今日「不宜营业」，明日亦然。'
    ], cat: '🐱 猫曰：笑一下，胸腔会亮一格。'},
    { label: '猫哲言', tag: '哲思', lines: [
      '不必每扇窗都跳出去，选一扇光最好的就够了。',
      '蜷成一团不是退缩，是把世界暂时调成静音。',
      '好奇害死猫是谣言；好奇养活了所有还想看看的人。',
      '落地要轻，起跳要决断——中间那段叫信任自己。'
    ], cat: '🐱 猫曰：哲学就是把「喵」想清楚。'},
    { label: '佛系一句', tag: '静心', lines: [
      '应无所住而生其心——事先计划，事中不执。',
      '宠辱不惊，看庭前花开花落；去留无意，望天上云卷云舒。',
      '心若无尘，何处不是净土。',
      '惜福者福深，知止者常安。'
    ], cat: '🐱 打坐中的猫：一呼一吸，已是功德。'},
    { label: '随机彩蛋', tag: '彩蛋', lines: [
      '今日隐藏成就：对镜子说一句「我值得被善待」。',
      '系统提示：你的耐心值 +1，可在任何排队场景使用。',
      '天降小幸运缓冲包，专治「差一点点就好」的焦虑。',
      '猫已在你的待办列表末尾悄悄写上：也要休息。'
    ], cat: '🐱 猫曰：彩蛋的意义是让你笑出声。'}
  ];
  let fortuneSpinning = false;
  let fortuneAngle = 0;
  let fortuneSoundTimer = null;
  function playFortuneSpinSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!window._yumiaoFortuneAC) window._yumiaoFortuneAC = new AC();
      const ctx = window._yumiaoFortuneAC;
      if (ctx.state === 'suspended') ctx.resume();
      const start = ctx.currentTime;
      // 金属转盘持续嘶嘶 + 节奏嘀嗒，约 3 秒
      const dur = 2.85;
      const bufSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.pow(1 - t / dur, 0.45);
        const tick = (Math.floor(t * (14 + t * 8)) % 2 === 0) ? 0.35 : 0.08;
        data[i] = (Math.random() * 2 - 1) * 0.12 * env * tick;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0.55;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(start);
      // 结束「咔」一声
      setTimeout(function() {
        try {
          const t0 = ctx.currentTime;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(520, t0);
          osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.12);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t0); osc.stop(t0 + 0.15);
        } catch (_) {}
      }, 2950);
    } catch (_) {}
  }
  function buildFortuneWheelUI() {
    const labels = document.getElementById('fortuneLabels');
    if (!labels) return;
    labels.innerHTML = '';
    const n = FORTUNE_SEGMENTS.length;
    FORTUNE_SEGMENTS.forEach(function(seg, i) {
      const span = document.createElement('span');
      span.textContent = seg.label;
      const mid = -90 + (i + 0.5) * (360 / n);
      span.style.transform = 'rotate(' + mid + 'deg) translate(0, -88px) rotate(90deg)';
      labels.appendChild(span);
    });
  }
  function openFortuneWheel() {
    buildFortuneWheelUI();
    const bd = document.getElementById('fortuneBackdrop');
    const md = document.getElementById('fortuneModal');
    const res = document.getElementById('fortuneResult');
    const again = document.getElementById('fortuneAgain');
    if (bd) bd.classList.add('show');
    if (md) { md.classList.remove('landscape-result'); md.classList.add('show'); }
    if (res) res.innerHTML = '<span style="color:#a08c60">禅猫就位 · 圆盘待命…</span>';
    if (again) { again.style.display = 'none'; again.disabled = false; }
    setTimeout(function(){ spinFortuneWheel(); }, 280);
  }
  function closeFortuneWheel() {
    if (fortuneSpinning) return;
    const md = document.getElementById('fortuneModal');
    // 横屏嵌入时不关闭（两侧正方形常驻）
    if (md && md.classList.contains('land-embed')) return;
    const bd = document.getElementById('fortuneBackdrop');
    if (bd) bd.classList.remove('show');
    if (md) md.classList.remove('show');
  }
  function spinFortuneWheel() {
    if (fortuneSpinning) return;
    const wheel = document.getElementById('fortuneWheel');
    const res = document.getElementById('fortuneResult');
    const again = document.getElementById('fortuneAgain');
    if (!wheel || !res) return;
    fortuneSpinning = true;
    if (again) { again.style.display = 'none'; again.disabled = true; }
    res.innerHTML = '<span style="color:#a08c60">圆盘旋转中…</span>';
    playFortuneSpinSound();
    const n = FORTUNE_SEGMENTS.length;
    const idx = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const targetCenter = idx * seg + seg / 2;
    const extraTurns = 5 + Math.floor(Math.random() * 2);
    const finalRot = extraTurns * 360 + (360 - targetCenter);
    // 从当前角度继续累加，保证每次都有完整 3 秒过渡
    const current = fortuneAngle % 360;
    fortuneAngle = fortuneAngle + finalRot + ((360 - (current % 360)) % 360);
    wheel.classList.remove('spinning');
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(' + (fortuneAngle - finalRot) + 'deg)';
    void wheel.offsetWidth;
    wheel.classList.add('spinning');
    wheel.style.transition = 'transform 3s cubic-bezier(0.08,0.7,0.12,1)';
    wheel.style.transform = 'rotate(' + fortuneAngle + 'deg)';
    setTimeout(function() {
      fortuneSpinning = false;
      const segData = FORTUNE_SEGMENTS[idx];
      const line = segData.lines[Math.floor(Math.random() * segData.lines.length)];
      res.innerHTML = '<div class="fr-tag">' + segData.tag + ' · ' + segData.label + '</div>' +
        '<div>' + line + '</div>' +
        '<div class="fr-catline">' + segData.cat + '</div>';
      if (again) { again.style.display = ''; again.disabled = false; }
      // 仅横屏：圆盘转完后缩小退场，再把结论移到屏幕中央。竖屏保持原逻辑。
      if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
        var md = document.getElementById('fortuneModal');
        if (md) {
          setTimeout(function(){ md.classList.add('landscape-result'); }, 420);
        }
      }
    }, 3000);
  }
  (function bindBoxLongPress(){
    function wire(){
      const img = document.querySelector('.box-img');
      const wrap = document.querySelector('.box-wrap');
      const target = wrap || img;
      if (!target) return;
      let timer = null;
      let armed = false;
      const LONG_MS = 560;
      function blockSave(e){ e.preventDefault(); e.stopPropagation(); return false; }
      if (img) {
        img.addEventListener('contextmenu', blockSave);
        img.addEventListener('dragstart', blockSave);
        img.setAttribute('draggable', 'false');
      }
      target.addEventListener('contextmenu', blockSave);
      function clearTimer(){ if (timer) { clearTimeout(timer); timer = null; } armed = false; }
      function startPress(e){
        // 不与玉佩热区点击冲突：若点在 jade-zone 上则不触发
        if (e.target && e.target.classList && e.target.classList.contains('jade-zone')) return;
        clearTimer();
        armed = true;
        timer = setTimeout(function(){
          if (!armed) return;
          timer = null; armed = false;
          openFortuneWheel();
        }, LONG_MS);
      }
      function endPress(){ clearTimer(); }
      target.addEventListener('touchstart', startPress, { passive: true });
      target.addEventListener('touchend', endPress);
      target.addEventListener('touchcancel', endPress);
      target.addEventListener('touchmove', endPress);
      target.addEventListener('mousedown', function(e){ if (e.button === 0) startPress(e); });
      target.addEventListener('mouseup', endPress);
      target.addEventListener('mouseleave', endPress);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
  })();
  // 横屏：丝滑动画切换到 All-in-one（含全部横屏入口链接）；竖屏恢复本页掷筊。
  // 横屏：观音居中，左侧每日运程（50%），右侧星图输入（60%）；竖屏恢复掷筊。
  (function bindLandscapeFortune(){
    var overlay, fortuneHome, westernHome, embedded = false;

    function isLandscape(){
      return window.matchMedia && window.matchMedia('(orientation: landscape)').matches;
    }
    function ensure(){
      if (!overlay) overlay = document.getElementById('allInOneOverlay');
      return !!overlay;
    }
    function embedPanels(){
      if (embedded) return;
      var fInner = document.getElementById('landFortuneInner');
      var wInner = document.getElementById('landWesternInner');
      var fortune = document.getElementById('fortuneModal');
      var western = document.getElementById('westernModal');
      if (!fInner || !wInner || !fortune || !western) return;

      fortuneHome = fortune.parentNode;
      westernHome = western.parentNode;
      fInner.appendChild(fortune);
      wInner.appendChild(western);

      fortune.classList.add('show', 'land-embed');
      western.classList.add('show', 'land-embed');

      // 运程：确保圆盘与结果区可见
      try {
        if (typeof buildFortuneWheelUI === 'function') buildFortuneWheelUI();
        var again = document.getElementById('fortuneAgain');
        if (again) { again.style.display = ''; again.disabled = false; }
        var res = document.getElementById('fortuneResult');
        if (res && (!res.textContent || res.textContent.indexOf('圆盘待命') !== -1 || res.textContent.indexOf('禅猫就位') !== -1)) {
          // 自动转一次
          if (typeof spinFortuneWheel === 'function' && !fortuneSpinning) {
            setTimeout(function(){ try { spinFortuneWheel(); } catch(_){} }, 400);
          }
        }
      } catch (_) {}

      // 星盘：显示输入表单
      try {
        if (typeof applySharedToWestern === 'function') applySharedToWestern();
        var form = document.getElementById('westernForm');
        var reveal = document.getElementById('westernReveal');
        var chart = document.getElementById('westernChartWrap');
        var cta = document.getElementById('westernInputCta');
        if (reveal) reveal.style.display = 'none';
        if (form) form.style.display = '';
        if (chart) chart.classList.remove('hidden', 'chart-leaving');
        if (cta) cta.hidden = true;
        setTimeout(function(){
          if (typeof initWesternWheels === 'function') initWesternWheels();
        }, 80);
      } catch (_) {}

      embedded = true;
    }
    function restorePanels(){
      if (!embedded) return;
      var fortune = document.getElementById('fortuneModal');
      var western = document.getElementById('westernModal');
      if (fortune) {
        fortune.classList.remove('show', 'land-embed', 'landscape-result');
        if (fortuneHome) fortuneHome.appendChild(fortune);
      }
      if (western) {
        western.classList.remove('show', 'land-embed');
        if (westernHome) westernHome.appendChild(western);
      }
      // 复位星盘内部显示
      try {
        var form = document.getElementById('westernForm');
        var reveal = document.getElementById('westernReveal');
        if (form) form.style.display = 'none';
        if (reveal) reveal.style.display = 'none';
      } catch (_) {}
      embedded = false;
    }
    function showOverlay(){
      if (!ensure()) return;
      document.body.classList.add('land-mode');
      try { document.documentElement.classList.add('scroll-locked'); } catch (_) {}
      overlay.setAttribute('aria-hidden', 'false');
      void overlay.offsetWidth;
      overlay.classList.add('show');
      embedPanels();
    }
    function hideOverlay(){
      if (!ensure()) return;
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      restorePanels();
      document.body.classList.remove('land-mode');
      try { document.documentElement.classList.remove('scroll-locked'); } catch (_) {}
    }
    function sync(){
      if (isLandscape()) showOverlay();
      else hideOverlay();
    }

    // 横屏嵌入时，关闭按钮不退出横屏布局（已隐藏）；阻止 close 把节点弄乱
    window.addEventListener('orientationchange', function(){ setTimeout(sync, 140); });
    window.addEventListener('resize', function(){
      clearTimeout(window._aioSyncTimer);
      window._aioSyncTimer = setTimeout(sync, 120);
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ setTimeout(sync, 60); }, { once:true });
    } else {
      setTimeout(sync, 60);
    }
  })();
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && document.getElementById('fortuneModal') && document.getElementById('fortuneModal').classList.contains('show')) {
      closeFortuneWheel();
    }
  });

