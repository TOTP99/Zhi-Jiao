/* 辅助脚本（网页运行时不会加载它，删掉也不影响任何功能）。
   作用：把 js/17c-palm-en.js 的结构化英文，按 id / 选项序号对应 js/17-palm.js 里的中文表（LINES / DIAG / DOCTOR_IF / HINTS / FOOT / FAIL_TEXT），
         重新生成 js/dict/dict-palm.js（含拼接规则）。
   用法（项目根目录）：node js/dict/tools/gen-palm-dict.js [输出路径]
   注意：默认会覆盖 dict-palm.js——如果你手改过 dict-palm.js 里的英文，先传一个别的输出路径再对比，别直接覆盖。
   只需 Node，无第三方依赖。 */
const fs=require('fs'),vm=require('vm'),path=require('path');
const J=path.resolve(__dirname,'..','..')+'/';  // = <项目>/js/
const OUT=process.argv[2]||(J+'dict/dict-palm.js');  // 默认直接覆盖 dict-palm.js；可传一个路径先输出到别处对比
global.window={};require(J+'17c-palm-en.js');const E=window.PALM_EN;
const src=fs.readFileSync(J+'17-palm.js','utf8');
function grab(name){const m=src.match(new RegExp('  var '+name+' = '));const i=m.index;let d=0,j=src.indexOf('=',i)+1,started=false;
  for(;j<src.length;j++){const c=src[j];if('[{'.includes(c)){d++;started=true}else if(']}'.includes(c)){d--;if(started&&d===0){j++;break}}else if(c==="'"){j++;while(src[j]!=="'"){if(src[j]==='\\')j++;j++}}}
  return vm.runInNewContext('('+src.slice(src.indexOf('=',i)+1,j)+')');}
const LINES=grab('LINES'),DIAG=grab('DIAG'),DOC=grab('DOCTOR_IF'),HINTS=grab('HINTS'),FOOT=grab('FOOT'),FAIL=grab('FAIL_TEXT');
const D={};const add=(zh,en)=>{if(!zh||!en)return;zh=zh.replace(/\s+/g,' ').trim();if(D[zh]&&D[zh]!==en)console.warn('dup',zh);D[zh]=en;};
const chk=(a,b,n)=>{if(a.length!==b.length)throw new Error('len '+n)};
chk(LINES,E.lines,'lines');chk(DIAG,E.diag,'diag');
const TR={}; // trait zh->en
LINES.forEach((l,i)=>{const e=E.lines[i];if(l.id!==e.id)throw 1;add(l.desc,e.desc);chk(l.opts,e.opts,l.id);
  l.opts.forEach((o,j)=>{const eo=e.opts[j];add(o[2],eo[2]);add(o[3],eo[3]);TR[o[1]]=eo[1];add(l.name+' · '+o[0],e.name+' · '+eo[0]);});});
DIAG.forEach((l,i)=>{const e=E.diag[i];if(l.id!==e.id)throw 1;add(l.desc,e.desc);chk(l.opts,e.opts,l.id);
  l.opts.forEach((o,j)=>{const eo=e.opts[j];add(o[2],eo[2]);add(o[3],eo[3]);add(l.name+' · '+o[0],e.name+' · '+eo[0]);});});
chk(DOC,E.doctorIf,'doc');DOC.forEach((z,i)=>add(z,E.doctorIf[i]));
add(HINTS.fortune,'Lines the app detected are already selected (marked "识别"). Please check them against the photo; for anything you are unsure about, choose it yourself. Anything left unselected is not included in the reading.');
add(HINTS.diag,E.hints.diag);add(FOOT.fortune,E.foot.fortune);add(FOOT.diag,E.foot.diag);
for(const k in FAIL){add(FAIL[k],E.fail[k]);}
add('之前识别的结果已保留。',E.status.earlierKept);
// static
add('拍摄或选择一张手掌照片，自动找出主要掌纹，再对照确认。照片只在本机处理，不会上传，也不会保存。',E.intro);
add('还没有照片',E.emptyTitle);
add('掌心朝向镜头，手指自然张开，光线均匀，把手腕也拍进来',E.emptyDesc);
add('拍不清楚？这样拍更容易识别',E.guide.title);
['手掌完全张开，拇指在画面内','光线均匀，避免强反光','手腕尽量拍入','推荐用后置摄像头，保持 20–30cm','某条线看不清？再补拍一张：之前识别清楚的会保留，只更新更清楚的'].forEach((z,i)=>add(z,E.guide.tips[i]));
add('示意图：拇指在左，掌心朝向镜头。各人纹路位置略有差异，仅作对照。',E.guide.diagramCaption);
add('看不清，请自选或补拍','Unclear — please choose yourself or retake');
add('未识别，请自选或补拍','Not detected — please choose yourself or retake');
// progress (zh strings from source)
const P={'找手掌':'findPalm','摆正手掌':'straighten','提取掌纹':'extractLines','追踪主线':'traceLines','裁切掌心':'cropPalm','划定掌心':'definePalm','读取照片':'readPhoto','读取高清原图':'readFullPhoto'};
for(const z in P){add(z+'…',E.progress[P[z]]+'…');add(z,E.progress[P[z]]);}
add('请选一张照片（JPG 或 PNG）',E.file.choosePhoto);add('照片太大了（超过 10MB），请换一张小一点的',E.file.tooLarge);
// status fixed
add('这张没有比之前更清楚的纹路，之前的结果已保留。',E.status.retakeNoBetter);
add('纹路都不够清晰，请对照照片自行选择。',E.status.noneClear);
add('已按标准位置摆正。',E.status.straightened);add('未摆正，沿用原识别。',E.status.notStraightened);
// reports
add('掌纹解读源自传统手相，仅供娱乐与自我反思，不构成任何决策建议。',E.report.fortuneDisclaimer);
add('掌诊为传统观察，仅供参考，不能替代医学诊断。如有不适，请及时就医。',E.report.diagDisclaimer);
add('所选项目中有需要请医生确认的外观，请优先看下方"建议就医检查"的条目。','Some of the items you selected should be confirmed by a doctor — please read the items marked "建议就医检查" below first.');
add('所选项目大多属于常见变化，其中几项值得留意，见下方说明。',E.report.diagOverall.watch);
add('所选项目均属常见、无需特别担心的外观。',E.report.diagOverall.ok);
add('传统取手之法：男看左手、女看右手，左手主先天、右手主后天。',E.report.handNoteBase);
add('依据档案，宜以左手为主（本次所拍正是左手）。',E.report.handNote.maleLeftMatch);
add('依据档案，宜以左手为主，可再拍一次左手对照。',E.report.handNote.maleLeftMismatch);
add('依据档案，宜以右手为主（本次所拍正是右手）。',E.report.handNote.femaleRightMatch);
add('依据档案，宜以右手为主，可再拍一次右手对照。',E.report.handNote.femaleRightMismatch);
// auto sentences
const S=E.auto.lineSentences;
add('生命线绵长，传统主精力充沛、耐力足。',S.life.long);add('生命线长度适中，传统主精力平实、起伏有度。',S.life.medium);add('生命线偏短，传统主先天精力偏弱，宜作息有节、劳逸结合。',S.life.short);
add('纹路偶有断续，传统主阶段感较强，中年前后或有一段转折，稳住节奏即可。',S.life.brokenSuffix);
add('感情线长而微弯，传统主重情重义、感情丰富。',S.heart.longCurved);add('感情线长而平直，传统主感情稳定、重承诺。',S.heart.longStraight);
add('感情线短而弯，传统主感情热烈直接。',S.heart.shortCurved);add('感情线短而直，传统主内敛理性、不轻易表露。',S.heart.shortStraight);
add('感情线长短适中、略带弯曲，传统主感情细腻。',S.heart.mediumCurved);add('感情线长短适中、走势平直，传统主感情稳重。',S.heart.mediumStraight);
add('纹路偶有断续，传统主感情路有起伏，宜多沟通、少猜测。',S.heart.brokenSuffix);
add('智慧线长而下弯，传统主想象丰富、直觉敏锐。',S.head.longDown);add('智慧线长而平直，传统主思虑周密、逻辑清晰。',S.head.longStraight);
add('智慧线长度适中，传统主思维灵活、讲求实效。',S.head.medium);add('智慧线偏短，传统主行事干脆、重当下。',S.head.short);
add('纹路偶有断续，传统主思路活跃但易分心，宜把大事拆小。',S.head.brokenSuffix);
add('事业线深而清晰，传统主目标明确、事业稳步攀升。',S.fate.deep);add('事业线清晰可辨，传统主事业多靠自身积累、屡试屡进。',S.fate.visible);
add('头线与心线之间见十字纹，传统主直觉敏锐、悟性佳。',E.auto.markings.cross.text);
add('食指根部见弧形纹，传统主聪慧好学、善于洞察。',E.auto.markings.solomon.text);
add('神秘十字',E.auto.markings.cross.name);add('所罗门环',E.auto.markings.solomon.name);
add('自动解读由本次识别的量测生成，仅供参考；请以手动确认为准。',E.auto.disclaimer);
// names
const LN={'生命线':'Life line','感情线':'Heart line','智慧线':'Head line','事业线':'Career line'};
const MZ=[['金星丘','精力亲情'],['木星丘','进取抱负'],['土星丘','稳重忍耐'],['太阳丘','名声才华'],['水星丘','灵巧交际'],['月丘','想象直觉'],['火星平原','勇气魄力']];
const MN={},MK={};MZ.forEach((m,i)=>{MN[m[0]]=E.auto.mounts[i].name;MK[m[0]]=E.auto.mounts[i].key;});
const WZ=['手掌边缘被裁掉，生命线、感情线可能不准','手腕被裁掉，生命线、事业线可能不准','手指并拢，定位可能有偏差','感情线与智慧线挤在同一道沟里，感情线请自行选择','照片偏暗或偏糊'];
const WK=['sideCut','wristCut','fingersClosed','heartHeadMerged','darkBlurry'];
const WN={};WZ.forEach((z,i)=>WN[z]=E.status.warns[WK[i]]);
const LP=E.auto.labelParts;
const out=`/* 掌纹字典（palm）：由 17c-palm-en.js 的结构化英文逐条对应原中文生成（LINES / DIAG / DOCTOR_IF / 提示 / 失败文案 / 自动解读句子），
   另附带「句中夹变量」的拼接规则（日期、状态栏、自动解读标签、丘位、掌形）。标题 / 按钮 / 小节名保持中文，不在此列。
   改英文：直接改下面的值；整套重新生成见 README-dict.md。 */
(function(){"use strict";
window.YUMIAO_DICT=window.YUMIAO_DICT||{};
window.YUMIAO_DICT["palm"]=${JSON.stringify(D)};
var TR=${JSON.stringify(TR)},LN=${JSON.stringify(LN)},MN=${JSON.stringify(MN)},MK=${JSON.stringify(MK)},WN=${JSON.stringify(WN)};
var MONTHS=${JSON.stringify(E.months)};
var WALT=${JSON.stringify(WZ.map(z=>z.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))}.join('|');
var LP=${JSON.stringify(LP)};
function list(s){return String(s).split('、').map(function(x){return LN[x]||x;}).join(', ');}
function trait(s){return String(s).split('、').map(function(x){return TR[x]||null;});}
var R=window.YUMIAO_RULES=window.YUMIAO_RULES||[];
var NEW=[];
function rule(re,fn){NEW.push({re:re,fn:fn});}
/* 日期行：左手 · 2026年11月24日 */
rule(/(左|右)手 · (\\d{4})年(\\d{1,2})月(\\d{1,2})日/,function(m,h,y,mo,d){return (h==='左'?'Left':'Right')+' hand \\u00b7 '+MONTHS[+mo-1]+' '+(+d)+', '+y;});
/* 总评：此掌特点：A、B。以下逐线解读，仅供参考。 */
rule(/此掌特点：(.+?)。以下逐线解读，仅供参考。/,function(m,tags){var t=trait(tags);if(t.indexOf(null)>=0)return null;return E_TAGS.replace('{tags}',t.join(', '));});
var E_TAGS=${JSON.stringify(E.report.overallTemplate)};
/* 识别置信度 */
rule(/识别(清晰|一般|模糊)(?: · 照片(\\d+))?/,function(m,c,n){return 'Detected: '+({'清晰':'clear','一般':'fair','模糊':'unclear'})[c]+(n?' \\u00b7 Photo '+n:'');});
rule(/已拍 (\\d+) 张，点击查看：/,function(m,n){return 'Photos taken: '+n+' \\u2014 tap to view:';});
/* 状态栏 */
rule(/补拍有效：([^。]+?)已更新，之前清楚的纹路已保留。/,function(m,a){return 'Retake helped: '+list(a)+' updated; lines that were already clear have been kept.';});
rule(/目前已识别([^；。]+)(?:；([^。；]+?)不够清晰，(可再补拍或)?请自行选择)?。/,function(m,g,w,rt){
  var s='Detected so far: '+list(g);
  if(w){var n=w.split('、').length;s+='; '+list(w)+(n>1?' are':' is')+' not clear enough \\u2014 '+(rt?'retake or ':'please ')+'choose '+(n>1?'them':'it')+' yourself';}
  return s+'.';});
rule(/看起来是(左|右)手，如不符请在下方切换。/,function(m,h){return 'This looks like the '+(h==='左'?'left':'right')+' hand. If that is wrong, switch it below.';});
rule(/这张看起来是(左|右)手，和前面的(左|右)手不是同一只，没有合并。要换另一只手，请点「重新开始」。/,function(m,a,b){return 'This looks like the '+(a==='左'?'left':'right')+' hand, different from the earlier '+(b==='左'?'left':'right')+' hand, so the photos were not combined. To switch hands, tap \\u300c\\u91cd\\u65b0\\u5f00\\u59cb\\u300d (Start Over).';});
rule(new RegExp('注意：((?:'+WALT+')(?:，(?:'+WALT+'))*)，请核对。'),function(m,ws){
  var out=[],rest=ws;while(rest){var hit=null;${JSON.stringify(WZ)}.forEach(function(z){if(!hit&&rest.indexOf(z)===0)hit=z;});if(!hit)return null;out.push(WN[hit]);rest=rest.slice(hit.length).replace(/^，/,'');}
  return 'Please note: '+out.join('; ')+' \\u2014 check them.';});
/* 自动解读标签：生命线 · 深长连贯 / 感情线 · 清适中偶断·微弯 */
var PT={'长':LP.long,'适中':LP.medium,'短':LP.short,'深':LP.deep,'清':LP.clear,'连贯':LP.unbroken,'偶断':LP.occasional,'直':LP.straight,'微弯':LP.slightlyCurved,'弯':LP.curved,'下弯':LP.down,'平':LP.flat};
rule(/(生命线|感情线|智慧线|事业线) · (深而清晰|清晰可辨|(深|清)(长|适中|短)(连贯|偶断)(?:·(微弯|弯|直|下弯|平))?)/,function(m,n,lab,dp,ln,ct,cv){
  var d;if(lab==='深而清晰')d='deep and clear';else if(lab==='清晰可辨')d='clearly visible';
  else{var a=[PT[dp],PT[ln],PT[ct]];if(cv)a.push(PT[cv]);d=a.join(', ');}
  return LN[n]+' \\u00b7 '+d;});
/* 丘位 */
rule(/丘位纹理较密：([^；。]+)(?:；较疏：([^。]+))?。/,function(m,a,b){var ls=function(s){return s.split('、').map(function(x){return MN[x]||x;}).join(', ');};
  return b?'Denser texture on '+ls(a)+'; sparser on '+ls(b)+'.':'Denser texture on '+ls(a)+'.';});
rule(/传统以(.+?)，仅供参考。/,function(m,body){var parts=body.split('，'),g=[];for(var i=0;i<parts.length;i++){var k=parts[i].split('主')[0];if(!MN[k])return null;g.push(MN[k]+' governs '+MK[k]);}return 'Traditionally, '+g.join(', ')+'. For reference only.';});
/* 掌形 */
rule(/掌形(偏长|偏阔|方圆适中)（掌长约为掌宽的 ([\\d.]+) 倍，指长约为掌宽的 ([\\d.]+) 倍）。/,function(m,s,a,b){var sh={'偏长':'longer than average','偏阔':'wider than average','方圆适中':'well proportioned'}[s];
  return 'Palm shape: '+sh+' (palm length is about '+a+'\\u00d7 palm width; finger length about '+b+'\\u00d7 palm width).';});
Array.prototype.unshift.apply(R,NEW);
})();
`;
fs.writeFileSync(OUT,out);
console.log('entries',Object.keys(D).length);
