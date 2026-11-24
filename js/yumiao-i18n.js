/** 御猫灵局 · 中英内容切换（加拿大英语）
 * 仅翻译命中词典的正文文本；界面标题、按钮、导航、图标和表单保持中文。
 */
(function () {
  'use strict';
  var english = false;
  var button = null;
  var originals = new WeakMap();
  var excluded = 'button,a,input,textarea,select,label,h1,h2,h3,h4,h5,h6,nav,header,footer,svg,script,style,[contenteditable],.kicker,.sheet-head,.panel-title,.modal-title,.no-translate,[aria-hidden="true"]';
  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
  function lookup(s){
    var dicts=window.YUMIAO_DICT||{}, key=norm(s);
    if(!key) return null;
    for(var mod in dicts){ if(!Object.prototype.hasOwnProperty.call(dicts,mod)) continue;
      var d=dicts[mod]; if(d && Object.prototype.hasOwnProperty.call(d,key) && typeof d[key]==='string' && d[key].trim()) return d[key];
    }
    return null;
  }
  function allowed(node){
    var p=node.parentElement;
    if(!p || p.closest(excluded)) return false;
    // Do not translate app chrome or navigation; inspect rendered content areas only.
    return !!p.closest('.sheet-scroll,.result-area,.result-desc,.result-beast,.mbti-report,.fortune-result,.history-item,.disclaimer-body,.panel-body,.report-body,.reading-content,.content-body,.palm-report,.bazi-result,.zodiac-result,.tarot-result,.yijing-result,.ziwei-result,.wuge-result,.chenggu-result,.western-result,.sheet');
  }
  function nodes(){
    var roots=document.querySelectorAll('.sheet-scroll,.result-area,.mbti-report,.fortune-result,.history-item,.disclaimer-body,.panel-body,.report-body,.reading-content,.content-body,.palm-report,.bazi-result,.zodiac-result,.tarot-result,.yijing-result,.ziwei-result,.wuge-result,.chenggu-result,.western-result,.sheet');
    var out=[];
    roots.forEach(function(root){
      var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      while(w.nextNode()){var n=w.currentNode; var base=originals.has(n)?originals.get(n):n.nodeValue; if(allowed(n) && lookup(base) && out.indexOf(n)<0) out.push(n);}
    });
    return out;
  }
  function refresh(){
    var list=nodes();
    if(!button){
      button=document.createElement('button'); button.type='button'; button.id='yumiaoLangSwitch';
      button.className='yumiao-lang-switch'; button.setAttribute('aria-label','切换正文语言');
      button.addEventListener('click',function(){ english=!english; render(); });
      document.body.appendChild(button);
    }
    button.hidden=list.length===0;
    if(english && list.length===0){ english=false; }
    render(list);
  }
  function render(list){
    list=list||nodes();
    list.forEach(function(n){
      if(!originals.has(n)) originals.set(n,n.nodeValue);
      var zh=originals.get(n), en=lookup(zh);
      if(en) n.nodeValue=english?en:zh;
    });
    if(button){
      button.textContent=english?'🇨🇦':'🇨🇳';
      button.title=english?'切换为中文':'Switch to Canadian English';
      button.setAttribute('aria-pressed',english?'true':'false');
    }
    document.documentElement.setAttribute('data-content-lang',english?'en':'zh');
  }
  window.yumiaoI18n={
    t:function(s){return english?(lookup(s)||s):s;},
    tContent:function(s){return this.t(s);},
    tList:function(a){return Array.isArray(a)?a.map(function(x){return typeof x==='string'? (english?(lookup(x)||x):x):x;}):a;},
    lookup:lookup,
    isEnglishView:function(){return english;},
    enterEnglishView:function(){english=true;render();},
    exitEnglishView:function(){english=false;render();},
    toggleEnglishView:function(){english=!english;render();return english;}
  };
  window.t=window.yumiaoI18n.t; window.tContent=window.yumiaoI18n.tContent;
  window.tList=window.yumiaoI18n.tList;
  window.enterEnglishView=window.yumiaoI18n.enterEnglishView;
  window.exitEnglishView=window.yumiaoI18n.exitEnglishView;
  window.toggleEnglishView=window.yumiaoI18n.toggleEnglishView;
  function start(){
    refresh();
    var mo=new MutationObserver(function(){ if(!mo._queued){mo._queued=true; requestAnimationFrame(function(){mo._queued=false;refresh();});} });
    mo.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
