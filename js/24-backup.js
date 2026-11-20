/* 档案备份 / 恢复
 * 用途：把本机全部 yumiao_ 数据（生辰档案、请示记录、偏好）导出为一个 .json 文件，或从该文件恢复。
 * 依赖：00c-version（版本号，可缺）；界面部分用 window.toast（可缺）。
 * 导出：window.YumiaoBackup = { build, parse, apply, KEY_PREFIX }（纯函数，传入 storage，便于测试）；
 *       window.backupExport()、window.backupImportPick()（供「我的」页按钮调用）。
 * 备份文件只含文字数据，不含任何照片。恢复只写入 yumiao_ 开头的键，其余键一律忽略。 */
(function () {
  'use strict';
  var PREFIX = 'yumiao_', APP = 'yumiao', SCHEMA = 1, MAX_BYTES = 5 * 1024 * 1024;

  function keysOf(st) {
    var ks = [];
    for (var i = 0; i < st.length; i++) { var k = st.key(i); if (k && k.indexOf(PREFIX) === 0) ks.push(k); }
    return ks.sort();
  }
  function build(st) {
    var data = {}, ks = keysOf(st);
    ks.forEach(function (k) { var v = st.getItem(k); if (typeof v === 'string') data[k] = v; });
    return { app: APP, schema: SCHEMA, version: window.YUMIAO_VERSION || '', exportedAt: new Date().toISOString(), data: data };
  }
  /* 解析并校验；返回 { ok, error?, data?, count? }，不抛异常 */
  function parse(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: '文件是空的' };
    if (text.length > MAX_BYTES) return { ok: false, error: '文件过大，不是御猫灵局的备份' };
    var o;
    try { o = JSON.parse(text); } catch (e) { return { ok: false, error: '不是有效的备份文件' }; }
    if (!o || o.app !== APP || !o.data || typeof o.data !== 'object' || Array.isArray(o.data)) return { ok: false, error: '不是御猫灵局的备份文件' };
    if (o.schema !== SCHEMA) return { ok: false, error: '备份格式版本不支持' };
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
    return { ok: true, data: clean, count: n };
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
  window.YumiaoBackup = { build: build, parse: parse, apply: apply, KEY_PREFIX: PREFIX };

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
        say('已恢复，页面即将刷新');
        setTimeout(function () { location.reload(); }, 900);
      };
      rd.onerror = function () { say('读取文件失败'); };
      rd.readAsText(f);
    };
    inp.click();
  };
})();
