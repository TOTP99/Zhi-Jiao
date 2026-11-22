/* 档案备份 / 恢复
 * 用途：把本机全部 yumiao_ 数据（生辰档案、请示记录、偏好）导出为一个 .json 文件，或从该文件恢复。
 * 依赖：00c-version（版本号，可缺）；界面部分用 window.toast（可缺）。
 * 导出：window.YumiaoBackup = { build, parse, apply, KEY_PREFIX }（纯函数，传入 storage，便于测试）；
 *       window.backupExport()、window.backupImportPick()（供「我的」页按钮调用）。
 * 备份文件只含文字数据，不含任何照片。恢复只写入 yumiao_ 开头的键，其余键一律忽略。
 * 备份签名：导出时对内容算 SHA-256 存入 sig；恢复前先验，验不过 parse 直接返回失败，apply 根本不会被调用，旧数据不动。
 *           这是完整性校验（防文件损坏、传输截断、手滑改动），不是防篡改：无密钥，有心人可重算 sig。
 *           没有 sig 的旧版备份（签名上线前导出）仍可恢复，返回 unsigned: true 供界面提示。 */
(function () {
  'use strict';
  var PREFIX = 'yumiao_', APP = 'yumiao', SCHEMA = 1, MAX_BYTES = 5 * 1024 * 1024;

  /* 同步 SHA-256（纯函数，输入 JS 字符串，按 UTF-8 编码，返回小写 hex）。WebCrypto 是异步的，会让 build/parse 变异步，故手写。 */
  var K256 = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  function utf8Bytes(str) {
    var s = unescape(encodeURIComponent(str)), out = new Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function sha256Hex(str) {
    var b = utf8Bytes(str), bitLen = b.length * 8, i, j;
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    var hi = Math.floor(bitLen / 4294967296), lo = bitLen >>> 0;
    b.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], w = new Array(64);
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (i = 0; i < b.length; i += 64) {
      for (j = 0; j < 16; j++) w[j] = ((b[i + 4 * j] << 24) | (b[i + 4 * j + 1] << 16) | (b[i + 4 * j + 2] << 8) | b[i + 4 * j + 3]) | 0;
      for (j = 16; j < 64; j++) {
        var s0 = rr(w[j - 15], 7) ^ rr(w[j - 15], 18) ^ (w[j - 15] >>> 3), s1 = rr(w[j - 2], 17) ^ rr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K256[j] + w[j]) | 0;
        var S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  /* 签名内容：app + schema + 按键名排序的 [键, 值] 列表（与键在文件里的顺序无关） */
  function signOf(data) {
    var ks = [];
    for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) ks.push(k);
    ks.sort();
    return 'sha256:' + sha256Hex(JSON.stringify([APP, SCHEMA, ks.map(function (k) { return [k, data[k]]; })]));
  }

  function keysOf(st) {
    var ks = [];
    for (var i = 0; i < st.length; i++) { var k = st.key(i); if (k && k.indexOf(PREFIX) === 0) ks.push(k); }
    return ks.sort();
  }
  function build(st) {
    var data = {}, ks = keysOf(st);
    ks.forEach(function (k) { var v = st.getItem(k); if (typeof v === 'string') data[k] = v; });
    return { app: APP, schema: SCHEMA, version: window.YUMIAO_VERSION || '', exportedAt: new Date().toISOString(), sig: signOf(data), data: data };
  }
  /* 解析并校验；返回 { ok, error?, data?, count? }，不抛异常 */
  function parse(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: '文件是空的' };
    if (text.length > MAX_BYTES) return { ok: false, error: '文件过大，不是御猫灵局的备份' };
    var o;
    try { o = JSON.parse(text); } catch (e) { return { ok: false, error: '不是有效的备份文件' }; }
    if (!o || o.app !== APP || !o.data || typeof o.data !== 'object' || Array.isArray(o.data)) return { ok: false, error: '不是御猫灵局的备份文件' };
    if (o.schema !== SCHEMA) return { ok: false, error: '备份格式版本不支持' };
    /* 签名：有 sig 就必须对得上，对不上说明文件损坏或被改过，拒绝，旧数据一概不动；没有 sig 的是签名上线前的旧备份，放行但标记 */
    var unsigned = (o.sig == null);
    if (!unsigned && (typeof o.sig !== 'string' || o.sig !== signOf(o.data))) return { ok: false, error: '备份文件已损坏或被改动，未恢复，原有数据已保留' };
    var clean = {}, n = 0;
    for (var k in o.data) {
      if (!Object.prototype.hasOwnProperty.call(o.data, k)) continue;
      if (k.indexOf(PREFIX) !== 0 || typeof o.data[k] !== 'string') continue;
      clean[k] = o.data[k]; n++;
    }
    if (!n) return { ok: false, error: '备份里没有可恢复的数据' };
    var b = clean['yumiao_shared_birth_v1'];
    if (b != null) {
      try { var bo = JSON.parse(b); if (!bo || typeof bo !== 'object') throw 0; } catch (e) { return { ok: false, error: '备份中的生辰档案已损坏' }; }
    }
    return { ok: true, data: clean, count: n, unsigned: unsigned };
  }
  /* 写入：先清掉现有 yumiao_ 键再写，保证恢复后与备份一致。
     先给旧数据拍快照；中途任何写入异常（配额不足等）都回滚到快照，旧数据不丢；写失败返回 false。 */
  function snapshot(st) {
    var snap = {};
    keysOf(st).forEach(function (k) { var v = st.getItem(k); if (typeof v === 'string') snap[k] = v; });
    return snap;
  }
  function rollback(st, snap) {
    try {
      keysOf(st).forEach(function (k) { st.removeItem(k); });
      for (var k in snap) st.setItem(k, snap[k]);
      return true;
    } catch (e) { console.warn('[yumiao] backup rollback failed', e); return false; }
  }
  function apply(st, parsed) {
    if (!parsed || !parsed.ok) return false;
    var snap;
    try { snap = snapshot(st); } catch (e) { console.warn('[yumiao] backup snapshot', e); return false; }
    try {
      keysOf(st).forEach(function (k) { st.removeItem(k); });
      for (var k in parsed.data) st.setItem(k, parsed.data[k]);
      return true;
    } catch (e) {
      console.warn('[yumiao] backup apply', e);
      rollback(st, snap);
      return false;
    }
  }
  window.YumiaoBackup = { build: build, parse: parse, apply: apply, sign: signOf, sha256: sha256Hex, KEY_PREFIX: PREFIX };

  function say(m) { if (typeof window.toast === 'function') window.toast(m); }
  window.backupExport = function () {
    try {
      var text = JSON.stringify(window.YumiaoBackup.build(localStorage), null, 1);
      var d = new Date();
      var name = '御猫灵局备份-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.json';
      var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      var a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      say('备份已生成');
    } catch (e) { console.warn('[yumiao] backup export', e); say('备份失败，请重试'); }
  };
  window.backupImportPick = function () {
    var inp = document.getElementById('backupFile');
    if (!inp) return;
    inp.value = '';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var p = window.YumiaoBackup.parse(String(rd.result || ''));
        if (!p.ok) { say(p.error); return; }
        if (!window.YumiaoBackup.apply(localStorage, p)) { say('恢复失败（本机存储不足或不可用），原有数据已保留'); return; }
        say(p.unsigned ? '已恢复（旧版备份，无校验），页面即将刷新' : '校验通过，已恢复，页面即将刷新');
        setTimeout(function () { location.reload(); }, 900);
      };
      rd.onerror = function () { say('读取文件失败'); };
      rd.readAsText(f);
    };
    inp.click();
  };
})();
