/* 版本号单一源头
 * 用途：全站唯一的版本号定义；页面里所有「v x.y」文字由此填入。
 * 依赖：无。　导出：window.YUMIAO_VERSION（'3.0.0'）、window.yumiaoVersionLabel()（'v3.0'）。
 * 改版本号只改本文件一处。 */
(function () {
  'use strict';
  var VERSION = '3.0.0';
  window.YUMIAO_VERSION = VERSION;
  window.yumiaoVersionLabel = function () {
    var p = VERSION.split('.');
    return 'v' + p[0] + '.' + p[1];
  };
  function fill() {
    var nodes = document.querySelectorAll('[data-app-version]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = window.yumiaoVersionLabel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
})();
