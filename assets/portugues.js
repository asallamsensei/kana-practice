/* Portugués: original catalog, fresh per-entry reviews. Exploring/listening never records. */
(function(root){'use strict';
const SETTINGS_KEY='asallam_portugues_settings_v1';
const BLOCK_LABELS={saludos:'Saludos',cotidiano:'Vida cotidiana',comida:'Comidas y bebidas',transporte:'Transporte y direcciones',social:'Vida social',aeroporto:'Aeropuerto',hospedagem:'Hospedaje',compras:'Compras y dinero',emergencias:'Emergencias',numeros:'Números y cantidades',cores:'Colores',tempo:'Tiempo y horarios',praia:'Playa'};
const BLOCKS=Object.keys(BLOCK_LABELS);
const MODES=['pt_es','es_pt','audio_es','audio_pt'];
const defaults={direction:'mixed',length:40,matchLength:39,autoAudio:true,rate:1,theme:'dark',blocks:BLOCKS.slice()};
function settingsValid(v){return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>Object.hasOwn(defaults,k))&&(!Object.hasOwn(v,'direction')||['mixed',...MODES,'dictado'].includes(v.direction))&&(!Object.hasOwn(v,'length')||[0,10,20,40].includes(v.length))&&(!Object.hasOwn(v,'matchLength')||[0,9,21,39].includes(v.matchLength))&&(!Object.hasOwn(v,'autoAudio')||typeof v.autoAudio==='boolean')&&(!Object.hasOwn(v,'rate')||[.7,.85,1].includes(v.rate))&&(!Object.hasOwn(v,'blocks')||(Array.isArray(v.blocks)&&v.blocks.length>0&&new Set(v.blocks).size===v.blocks.length&&v.blocks.every(b=>BLOCKS.includes(b))))&&(!Object.hasOwn(v,'theme')||['dark','light'].includes(v.theme));}
function readVariants(values){return Array.isArray(values)?[...new Set(values.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean))]:[];}
function normalize(raw){if(!Array.isArray(raw)||!raw.length)throw Error('Catálogo vacío o incompatible.');const map=new Map();for(const group of raw){if(!BLOCKS.includes(group.bloque)||!Array.isArray(group.items))throw Error('Bloque incompatible.');for(const row of group.items){if(!row||['portugues','espanol'].some(k=>typeof row[k]!=='string'||!row[k].trim()))throw Error('Hay una entrada incompleta en el catálogo.');const item={pt:row.portugues.trim(),es:row.espanol.trim(),extra:String(row.extra||'').trim(),audio:safeAudioFile(row.audio),block:group.bloque,ptVariants:readVariants(row.variantes_pt),esVariants:readVariants(row.variantes_es),confusionGroup:typeof row.grupo_confusion==='string'?row.grupo_confusion:''};item.id=[item.pt,item.es].join('||');if(!map.has(item.id))map.set(item.id,item);}}return [...map.values()];}
const audioMode=d=>['audio_es','audio_pt','dictado'].includes(d);
const answerField=d=>['pt_es','audio_es'].includes(d)?'es':'pt';
const purposeFor=d=>({pt_es:'Portugués → español',es_pt:'Español → portugués',audio_es:'Audio → español',audio_pt:'Audio → portugués',dictado:'Audio → portugués'})[d];
function shuffle(list,random=Math.random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const choiceKey=s=>searchText(s).replace(/[?!¡¿.,;:…]+/g,'').trim();
const variants=(item,field)=>[item[field],...(item[field+'Variants']||[])];
function sameMeaningDomain(a,b){
 return a===b||Boolean(a.confusionGroup&&a.confusionGroup===b.confusionGroup)||
  ['pt','es'].some(field=>{const keys=new Set(variants(a,field).map(choiceKey));return variants(b,field).some(value=>keys.has(choiceKey(value)));});
}
function choices(item,direction,catalog,random=Math.random){
 // Keep one scored answer. Never present a curated equivalent or a near
 // paraphrase as a distractor, even when the display translations differ.
 const answer=answerField(direction),samples=new Map(),size=s=>s.trim().split(/\s+/).length;
 for(const x of shuffle(catalog,random)){
  const text=x[answer],k=choiceKey(text);
  if(sameMeaningDomain(item,x))continue;
  const score=Math.min(8,Math.abs(size(text)-size(item[answer])))+(x.block===item.block?0:4);
  if(!samples.has(k)||score<samples.get(k).score)samples.set(k,{text,score});
 }
 const distractors=[...samples.values()].sort((a,b)=>a.score-b.score).slice(0,2).map(x=>x.text);
 return shuffle([item[answer],...distractors],random);
}
const searchText=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
function safeAudioFile(value){const file=typeof value==='string'?value.trim():'';return /^[\p{L}\p{N}][\p{L}\p{N} _-]*\.mp3$/iu.test(file)?file:'';}
function audioFiles(item){
 const text=typeof item==='string'?item:item?.pt;
 const slug=searchText(text||'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 return [...new Set([slug&&slug+'.mp3',safeAudioFile(item?.audio)].filter(Boolean))];
}
const core={normalize,choices,settingsValid,searchText,SETTINGS_KEY,defaults,MODES,BLOCKS,audioMode,answerField,purposeFor,sameMeaningDomain,safeAudioFile,audioFiles};
if(typeof module!=='undefined'&&module.exports)module.exports=core;
if(!root.document)return;
const $=id=>document.getElementById(id), ledger=root.AsallamReviews;
let settings={...defaults},settingsBroken=false;
try{const raw=localStorage.getItem(SETTINGS_KEY);if(raw!==null){const v=JSON.parse(raw);if(!settingsValid(v))throw Error('Ajustes incompatibles.');settings={...defaults,...v};if(settings.direction==='dictado')settings.direction='audio_pt';}else if(localStorage.getItem('asallam_ecosystem_theme')==='light')settings.theme='light';}catch{settingsBroken=true;}
let catalog=[],current=null,activity='quiz',loaded=false,answered=false,session={correct:0,wrong:0,skipped:0,errors:new Set()},reviewPending=null,reviewSize=0,pageSize=24,noticeTimer,summaryOpen=false,quizScopeDirty=false;
const selectedItems=()=>catalog.filter(x=>settings.blocks.includes(x.block));
const matcher=root.AsallamLanguageMatching?.create({host:$('matching'),ledger,audioBusy:audioBusy,app:'portugues',items:selectedItems,reviewErrors:true,waitForCorrectAudio:true,waitForCue,sessionLength:()=>settings.matchLength,mixedTiles:true,concise:true,onAudioStop:stopAudio,onCorrectAudio:(item,options)=>playAudio(item,{...options,automatic:true}),labels:x=>[x.pt,x.es],langs:['pt-BR','es'],sideNames:['Portugués','Español'],conflicts:sameMeaningDomain,changed:()=>{if(loaded)updateStats();}});
const quizMusic=root.MatchMusic?.create({isBusy:audioBusy});
function notice(message){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').hidden=false;noticeTimer=setTimeout(()=>{$('notice').hidden=true;},6000);}
function saveSettings(){quizMusic?.cancel();if(settingsBroken){notice('Los ajustes guardados no se han modificado porque no se pudieron leer. Puedes continuar sin guardar cambios.');return;}try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{notice('No se pudieron guardar los ajustes en este navegador.');}}
function applyTheme(){$('theme').textContent=settings.theme==='light'?'☾':'☀';$('theme').setAttribute('aria-label',settings.theme==='light'?'Activar tema oscuro':'Activar tema claro');document.documentElement.dataset.theme=settings.theme;}
applyTheme();for(const id of ['direction','length','matchLength','rate'])$(id).value=String(settings[id]);$('autoAudio').checked=settings.autoAudio;
$('theme').onclick=()=>{settings.theme=settings.theme==='dark'?'light':'dark';applyTheme();saveSettings();};
for(const id of ['direction','length','matchLength','rate'])$(id).onchange=()=>{settings[id]=id==='direction'?$(id).value:Number($(id).value);saveSettings();if(id==='direction'&&loaded&&activity==='quiz'&&!summaryOpen)nextQuestion(true);if(id==='length')writing?.reset();if(id==='matchLength')matcher?.reset();updateStats();};
$('autoAudio').onchange=()=>{settings.autoAudio=$('autoAudio').checked;if(!settings.autoAudio){discardPendingAutoAudio();quizMusic?.cancel();}saveSettings();};
// A single cancellable player per page: direct MP3 first, then on-device Portuguese voice.
const audioBase=new URL('data/portugues/',document.baseURI), unavailableFiles=new Set(), confirmedFiles=new Set(), probingFiles=new Set();
const fileUrl=file=>new URL(encodeURIComponent(file),audioBase).href;
function probeAudio(item){
 for(const file of audioFiles(item)){
  if(confirmedFiles.has(file)||unavailableFiles.has(file)||probingFiles.has(file))continue;
  probingFiles.add(file);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1400);
  fetch(fileUrl(file),{method:'HEAD',cache:'no-cache',signal:controller.signal}).then(res=>{
   const type=res.headers?.get('content-type')||'';
   if(res.ok&&/^(audio\/|application\/octet-stream\b|binary\/octet-stream\b)/i.test(type))confirmedFiles.add(file);
   else if(res.status===404||res.status===410)unavailableFiles.add(file);
  }).catch(()=>{}).finally(()=>{clearTimeout(timer);probingFiles.delete(file);});
 }
}
function mixedDirection(item){
 const direction=MODES[Math.floor(Math.random()*MODES.length)];
 if(!audioMode(direction)||brazilianVoice()||audioFiles(item).some(file=>confirmedFiles.has(file)))return direction;
 // Start discovery without holding up the quiz. Unknown audio is not an audible question.
 probeAudio(item);
 return Math.random()<.5?'pt_es':'es_pt';
}
let playingAudio=null,audioQueue=[],audioGeneration=0,voiceWait=null,winToken=0;
function audioBusy(){return Boolean(playingAudio||audioQueue.length);}
function portugueseVoices(){
 try{return (root.speechSynthesis?.getVoices()||[]).filter(v=>/^pt(?:[-_]|$)/i.test(v.lang));}catch{return [];}
}
function brazilianVoice(){
 const voices=portugueseVoices();
 return voices.find(v=>/^pt[-_]BR$/i.test(v.lang))||voices.find(v=>/^pt$/i.test(v.lang));
}
function awaitVoices(){
 if(brazilianVoice()||!root.speechSynthesis||!root.SpeechSynthesisUtterance)return Promise.resolve();
 if(!voiceWait)voiceWait=new Promise(resolve=>{
  const synth=root.speechSynthesis;let timer;
  const finish=()=>{clearTimeout(timer);synth.removeEventListener?.('voiceschanged',finish);resolve();};
  synth.addEventListener?.('voiceschanged',finish);timer=setTimeout(finish,700);
 }).finally(()=>{voiceWait=null;});
 return voiceWait;
}
function activeAudio(req){return playingAudio===req&&req.epoch===audioGeneration&&(!req.automatic||settings.autoAudio)&&(!req.valid||req.valid());}
function playFile(file,req){
 if(!root.Audio||unavailableFiles.has(file))return Promise.resolve(false);
 return new Promise(resolve=>{
  let clip,timer,ended=false;
  const finish=(ok,remember=false)=>{
   if(ended)return;ended=true;clearTimeout(timer);
   if(ok)confirmedFiles.add(file);else if(remember){unavailableFiles.add(file);confirmedFiles.delete(file);}
   if(clip){clip.onplaying=clip.onended=clip.onerror=null;if(!ok){try{clip.pause();clip.removeAttribute('src');clip.load();}catch{}}}
   req.cancel=null;resolve(ok);
  };
  try{
   clip=new root.Audio();clip.preload='auto';clip.playbackRate=settings.rate;
   req.cancel=()=>finish(false);
   const timeout=()=>finish(false);
   clip.onplaying=()=>{clearTimeout(timer);timer=setTimeout(timeout,25000);};
   clip.onended=()=>finish(true);
   clip.onerror=()=>finish(false,true);
   timer=setTimeout(timeout,2600);
   clip.src=fileUrl(file);
   const play=clip.play();play?.catch(error=>finish(false,error?.name==='NotSupportedError'));
  }catch{finish(false);}
 });
}
async function playVoice(text,req){
 await awaitVoices();
 if(!activeAudio(req))return false;
 const voice=brazilianVoice();
 if(!voice)return false;
 return new Promise(resolve=>{
  let timer,ended=false;
  const u=new root.SpeechSynthesisUtterance(text),synth=root.speechSynthesis;
  const finish=(ok,cancel=false)=>{
   if(ended)return;ended=true;clearTimeout(timer);u.onend=u.onerror=null;req.cancel=null;
   if(cancel)try{synth.cancel();}catch{}resolve(ok);
  };
  u.lang='pt-BR';u.voice=voice;u.rate=settings.rate;
  req.cancel=()=>finish(false,true);u.onend=()=>finish(true);u.onerror=()=>finish(false);
  timer=setTimeout(()=>finish(false,true),15000);
  try{synth.speak(u);}catch{finish(false);}
 });
}
async function pumpAudio(){
 if(playingAudio||!audioQueue.length)return;
 const req=audioQueue.shift();playingAudio=req;
 let ok=false;
 try{
  if(activeAudio(req))for(const file of audioFiles(req.item)){
   if(!activeAudio(req))break;
   if(await playFile(file,req)){ok=true;break;}
  }
  if(!ok&&activeAudio(req))ok=await playVoice(typeof req.item==='string'?req.item:req.item.pt,req);
 }catch{}
 const valid=activeAudio(req);
 if(playingAudio===req)playingAudio=null;
 req.resolve(Boolean(ok&&valid));
 pumpAudio();
}
function discardPendingAutoAudio(){
 const dropped=audioQueue.filter(req=>req.automatic);audioQueue=audioQueue.filter(req=>!req.automatic);
 dropped.forEach(req=>req.resolve(false));
 if(playingAudio?.automatic){const req=playingAudio;playingAudio=null;req.cancel?.();req.resolve(false);pumpAudio();}
}
function stopAudio(){
 quizMusic?.cancel();
 audioGeneration++;
 const queue=audioQueue;audioQueue=[];queue.forEach(req=>req.resolve(false));
 if(playingAudio){const req=playingAudio;playingAudio=null;req.cancel?.();req.resolve(false);}
}
function playAudio(item,{valid,automatic=false}={}){
 if(!(typeof item==='string'?item.trim():item?.pt?.trim())||automatic&&!settings.autoAudio||valid&&!valid())return Promise.resolve(false);
 return new Promise(resolve=>{audioQueue.push({item,valid,automatic,epoch:audioGeneration,resolve,cancel:null});pumpAudio();});
}
function afterCorrect(item,{valid}={}){
 const epoch=audioGeneration;
 const stillValid=()=>epoch===audioGeneration&&(!valid||valid());
 return new Promise(resolve=>{
  const after=cancelled=>{if(cancelled||!stillValid())return resolve(false);playAudio(item,{valid:stillValid,automatic:true}).then(resolve);};
  if(quizMusic)quizMusic.correct(++winToken,after);else after(false);
 });
}
function waitForCue(task,maxMs=4500){
 if(!task)return Promise.resolve();
 return new Promise(resolve=>{
  const timer=setTimeout(resolve,maxMs);
  Promise.resolve(task).then(()=>{clearTimeout(timer);resolve();},()=>{clearTimeout(timer);resolve();});
 });
}
root.AsallamPortugueseAudio={play:playAudio,afterCorrect,stop:stopAudio,busy:audioBusy,waitForCue};
function switchActivity(next){
 if(next!==activity){quizMusic?.cancel();stopAudio();if(activity==='match')matcher?.deactivate();}
 activity=next;
 if(loaded&&activity==='match')matcher?.activate();
 if(loaded&&activity==='explore')explore();
 if(loaded&&activity==='quiz'&&quizScopeDirty&&!reviewPending&&!summaryOpen){nextQuestion(true);return;}
 showPanels();
}
const writing=root.AsallamPortugueseWriting?.create({host:$('writing'),items:selectedItems,settings:()=>settings,ledger,changed:()=>updateStats(),notice});
function playQuestion(question=current,automatic=false){
 const valid=()=>activity==='quiz'&&!summaryOpen&&current===question;
 if(!question||!valid()||(!answered&&question.direction==='es_pt')||(automatic&&!settings.autoAudio))return;
 current.audioAttempt=(current.audioAttempt||0)+1;
 const attempt=current.audioAttempt;
 if(!automatic)stopAudio();
 const pending=()=>valid()&&question.audioAttempt===attempt;
 playAudio(question.item,{valid:pending,automatic}).then(ok=>{
  if(!pending()||automatic&&!settings.autoAudio)return;
  if(ok){question.heard=true;return;}
  if(!answered&&audioMode(question.direction)){
   const direction=question.direction==='audio_es'?'pt_es':'es_pt';
   renderQuestion(question.item,direction,{fallback:true});
   notice('No hay audio disponible para esta entrada. La pregunta se puede responder como ejercicio de texto.');
  }else if(!automatic)notice('No se pudo escuchar esta entrada. Comprueba que tu dispositivo tenga una voz de portugués de Brasil.');
 });
}
function answerText(){return current.item[answerField(current.direction)];}
function purpose(){return purposeFor(current.direction);}
function sessionTotal(){return session.correct+session.wrong+session.skipped;}
function targetSize(){return reviewPending?reviewSize:settings.length;}
function updateStats(){
 let text='';try{const s=ledger.summary('portugues');text=`${s.seen} / ${s.total??catalog.length} entradas practicadas · ${s.reviews} repasos · ${s.correct} aciertos · ${s.wrong} errores · ${s.skipped} sin responder`;}
 catch{text='Historial no disponible. Tus datos guardados no se han modificado.';}
 $('stats').textContent=text;
 const m=activity==='match'?matcher?.getState():null,w=activity==='write'?writing?.getState():null;
 const done=m?m.correct:w?w.done:sessionTotal(),target=m?m.length:w?w.total:targetSize(),pct=target?Math.min(100,done/target*100):0;
 $('roundCount').textContent=activity==='explore'?'':`${done}${target?' / '+target:''} ${m?'parejas':'respuestas'}`;
 $('bar').style.width=pct+'%';$('progressTrack').setAttribute('aria-valuenow',String(pct));$('progressTrack').hidden=activity==='explore'||!target;
}
function showPanels(){
 const quizOptions=$('quizOptions'),lengthOptions=$('lengthOptions'),matchOptions=$('matchOptions'),longSession=$('lengthUnlimited');
 if(quizOptions)quizOptions.hidden=activity!=='quiz';
 if(lengthOptions)lengthOptions.hidden=activity!=='quiz'&&activity!=='write';
 if(matchOptions)matchOptions.hidden=activity!=='match';
 if(longSession)longSession.textContent=activity==='write'?'Toda la selección':'Sin límite';
 $('practice').hidden=!loaded||activity!=='quiz'||summaryOpen;
 $('exploring').hidden=!loaded||activity!=='explore';$('matching').hidden=!loaded||activity!=='match';
 if($('writing'))$('writing').hidden=!loaded||activity!=='write';
 writing?.setActive(loaded&&activity==='write');
 $('summary').hidden=!loaded||activity!=='quiz'||!summaryOpen;
 $('finish').hidden=!loaded||activity!=='quiz'||summaryOpen;$('keyboardHint').hidden=activity!=='quiz'||summaryOpen;
 $('badge').textContent=activity==='explore'?'Explorar':activity==='match'?'Emparejar':activity==='write'?'Escribir':reviewPending?'Repaso de la sesión':'Practicar';
 for(const [id,active]of [['quizTab',activity==='quiz'],['exploreTab',activity==='explore'],['matchTab',activity==='match'],['writeTab',activity==='write']]){
  const btn=$(id);if(btn){btn.setAttribute('aria-pressed',String(active));btn.classList.toggle('is-active',active);}
 }
 updateStats();
}
function nextQuestion(changeDirection=false){
 if(!loaded)return;quizScopeDirty=false;quizMusic?.cancel();stopAudio();
 if(reviewPending?!reviewPending.size:settings.length&&sessionTotal()>=settings.length){finishSession();return;}
 const pool=reviewPending?catalog.filter(x=>reviewPending.has(x.id)):selectedItems();
 const candidates=pool.length>1?pool.filter(x=>x.id!==current?.item.id):pool;
 if(!candidates.length){finishSession();return;}
 const item=changeDirection&&!answered&&current&&pool.includes(current.item)?current.item:candidates[Math.floor(Math.random()*candidates.length)];
 const direction=settings.direction==='mixed'?mixedDirection(item):settings.direction;
 renderQuestion(item,direction);
}
function renderQuestion(item,direction,{fallback=false}={}){
 let choicePool=selectedItems();if(!choicePool.includes(item))choicePool=[item,...choicePool];
 current={item,direction,heard:false,options:choices(item,direction,choicePool)};
 answered=false;summaryOpen=false;
 $('prompt').textContent=audioMode(direction)?'Escucha y elige':direction==='pt_es'?item.pt:item.es;
 $('prompt').lang=direction==='pt_es'?'pt-BR':'es';$('prompt').classList.toggle('pt',direction==='pt_es');
 $('pinyin').textContent='';$('questionLabel').textContent=(fallback?'Sin audio · ':'')+(audioMode(direction)?(direction==='audio_es'?'¿Qué significa lo que escuchas?':'¿Qué escuchas en portugués?'):direction==='pt_es'?'¿Qué significa en español?':'¿Cómo se dice en portugués?');
 $('listen').hidden=direction==='es_pt';$('feedback').hidden=true;$('feedback').replaceChildren();$('next').disabled=true;$('skip').disabled=false;
 $('options').replaceChildren();
 current.options.forEach((text,i)=>{
  const b=document.createElement('button');b.className='option-button';b.lang=answerField(direction)==='pt'?'pt-BR':'es';
  const key=document.createElement('span');key.className='option-letter';key.textContent='ABC'[i];const label=document.createElement('span');label.textContent=text;b.append(key,label);
  const question=current;b.onclick=()=>{if(current===question)respond(text);};$('options').append(b);
 });
 showPanels();$('badge').textContent=(reviewPending?'Repaso · ':'')+purpose()+(direction==='dictado'?' · Dictado':'');
 if(!fallback&&settings.autoAudio&&activity==='quiz'&&direction!=='es_pt')playQuestion(current,true);
}
function respond(choice){
 if(!current||answered||activity!=='quiz'||summaryOpen)return;
 if(choice!==null&&audioMode(current.direction)&&!current.heard){notice('Escucha el audio completo antes de responder. Si no está disponible, pulsa Escuchar para intentar pasar a texto.');return;}
 answered=true;
 const outcome=choice===null?'skipped':choice===answerText()?'correct':'wrong';
 const question=current;
 session[outcome]++;
 if(outcome==='wrong')session.errors.add(question.item.id);
 reviewPending?.delete(question.item.id);
 ledger.record('portugues',question.item.id,purpose(),outcome);
 if(outcome==='correct')question.earnedCue=afterCorrect(question.item,{valid:()=>activity==='quiz'&&!summaryOpen&&current===question&&answered});
 for(const [i,b]of [...$('options').children].entries()){
  const correct=question.options[i]===answerText();b.disabled=true;
  if(correct||question.options[i]===choice){
   b.classList.add(correct?'correct':'wrong');
   const mark=document.createElement('span');mark.className='option-mark';mark.textContent=correct?'✓':'✕';mark.setAttribute('aria-label',correct?'Correcta':'Incorrecta');b.append(mark);
  }
 }
 $('listen').hidden=false;$('skip').disabled=true;$('next').disabled=false;
 const item=question.item;
 $('feedback').textContent=(outcome==='correct'?'✓ ¡Correcto!':outcome==='wrong'?'✕ Esta vez no.':'Sin responder · no cuenta como error.')+'\n'+item.pt+(item.extra?' · '+item.extra:'')+'\n'+item.es;
 $('feedback').hidden=false;
 const history=document.createElement('div');history.innerHTML=ledger.render('portugues',item.id);$('feedback').append(history);updateStats();
}
async function advanceQuiz(){
 const question=current;
 if(!question||!answered||summaryOpen||activity!=='quiz'||question.advancing)return;
 if(!question.earnedCue){nextQuestion();return;}
 const epoch=audioGeneration;
 question.advancing=true;$('next').disabled=true;
 await waitForCue(question.earnedCue);
 question.advancing=false;
 if(current!==question||summaryOpen)return;
 $('next').disabled=false;
 if(epoch===audioGeneration&&activity==='quiz')nextQuestion();
}
function finishSession(){
 quizMusic?.cancel();stopAudio();summaryOpen=true;
 $('summaryText').textContent=`${session.correct} aciertos · ${session.wrong} errores · ${session.skipped} sin responder. Las preguntas sin responder al salir no se registran.`;
 $('reviewSession').disabled=!session.errors.size;$('reviewSession').hidden=!session.errors.size;
 showPanels();
}
function startSession(ids=null){
 quizMusic?.reset();stopAudio();
 session={correct:0,wrong:0,skipped:0,errors:new Set()};
 reviewPending=ids?new Set(ids):null;reviewSize=reviewPending?.size||0;summaryOpen=false;activity='quiz';nextQuestion();
}
function explore(){const q=searchText($('search').value);const found=catalog.filter(x=>settings.blocks.includes(x.block)&&searchText([x.pt,x.extra,x.es].join(' ')).includes(q));$('exploreCount').textContent=`${found.length} de ${catalog.length} entradas · abrir y escuchar no registra repasos`;$('wordGrid').replaceChildren();if(!found.length){const p=document.createElement('p');p.className='empty-state';p.textContent='No se encontraron entradas. Prueba con portugués o español.';$('wordGrid').append(p);}for(const item of found.slice(0,pageSize)){const card=document.createElement('article');card.className='word-card explore-card';const title=document.createElement('h3');title.className='';title.lang='pt-BR';title.textContent=item.pt;const pin=document.createElement('p');pin.lang='pt-BR';pin.textContent=item.extra;const es=document.createElement('p');es.textContent=item.es;const button=document.createElement('button');button.className='listen-button';button.textContent='🔊 Escuchar';button.setAttribute('aria-label','Escuchar '+item.pt);button.onclick=()=>{playAudio(item,{valid:()=>activity==='explore'}).then(ok=>{if(!ok&&activity==='explore')notice('No hay audio disponible para esta entrada. Comprueba que tu dispositivo tenga una voz de portugués de Brasil.');});};const history=document.createElement('div');history.innerHTML=ledger.render('portugues',item.id);card.append(title,...(item.extra?[pin]:[]),es,button,history);$('wordGrid').append(card);}$('more').hidden=found.length<=pageSize;}
function applyBlocks(next){
 if(next.length===settings.blocks.length&&next.every(b=>settings.blocks.includes(b)))return;
 settings.blocks=next;
 saveSettings();renderBlocks();matcher?.reset();writing?.reset();
 if(activity==='explore'){pageSize=24;explore();}
 if(!summaryOpen&&!reviewPending&&!answered){
  quizScopeDirty=true;
  if(activity==='quiz'&&loaded)nextQuestion(true);
 }
}
function renderBlocks(){
 const select=$('blockSelect'),counts=new Map(BLOCKS.map(b=>[b,0]));
 for(const item of catalog)counts.set(item.block,(counts.get(item.block)||0)+1);
 if(select){
  const add=(value,label)=>{const opt=document.createElement('option');opt.value=value;opt.textContent=label;select.append(opt);};
  select.replaceChildren();add('all','Todos los bloques');
  for(const block of BLOCKS)add(block,BLOCK_LABELS[block]+' · '+counts.get(block));
  const picked=settings.blocks.length;
  if(picked>1&&picked<BLOCKS.length)add('custom','Selección personalizada · '+picked);
  select.value=picked===BLOCKS.length?'all':picked===1?settings.blocks[0]:'custom';
  select.onchange=()=>{const value=select.value;if(value==='all')applyBlocks(BLOCKS.slice());else if(BLOCKS.includes(value))applyBlocks([value]);};
 }
 const chips=$('blocks');chips.replaceChildren();
 for(const block of BLOCKS){
  const b=document.createElement('button'),picked=settings.blocks.includes(block);
  b.type='button';b.className='chip';b.textContent=BLOCK_LABELS[block];b.setAttribute('aria-pressed',String(picked));
  b.onclick=()=>{if(!picked)applyBlocks([...settings.blocks,block]);else if(settings.blocks.length>1)applyBlocks(settings.blocks.filter(x=>x!==block));};
  chips.append(b);
 }
 const all=document.createElement('button');all.type='button';all.className='chip';all.textContent='Todos';all.setAttribute('aria-pressed',String(settings.blocks.length===BLOCKS.length));all.onclick=()=>applyBlocks(BLOCKS.slice());chips.append(all);
 $('poolCount').textContent=selectedItems().length+' de '+catalog.length+' entradas seleccionadas';
}
$('quizTab').onclick=()=>switchActivity('quiz');
$('matchTab').onclick=()=>{if(!matcher){notice('No se pudo cargar Emparejar. Recarga la página para intentarlo de nuevo.');return;}switchActivity('match');};
if($('writeTab'))$('writeTab').onclick=()=>{if(!writing){notice('No se pudo cargar Escribir. Recarga la página para intentarlo de nuevo.');return;}switchActivity('write');};
$('exploreTab').onclick=()=>switchActivity('explore');
$('search').oninput=()=>{pageSize=24;explore();};$('more').onclick=()=>{pageSize+=24;explore();};
$('listen').onclick=()=>playQuestion();$('skip').onclick=()=>respond(null);
$('next').onclick=advanceQuiz;$('finish').onclick=finishSession;
$('repeat').onclick=()=>startSession();$('reviewSession').onclick=()=>{if(session.errors.size)startSession(session.errors);};
$('resetReviews').onclick=()=>{
 if(!root.confirm('¿Reiniciar solo los repasos registrados de portugués? No se borrará el progreso de otros aplicativos.'))return;
 if(ledger.clear('portugues')){
  const next=activity;writing?.reset();matcher?.reset();if(loaded){startSession();switchActivity(next);}
  updateStats();notice('Repasos de portugués reiniciados.');
 }
};
document.addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||e.target?.isContentEditable||/INPUT|SELECT|TEXTAREA|BUTTON|A|SUMMARY/.test(e.target?.tagName||'')||activity!=='quiz'||summaryOpen||!loaded||!current)return;
 const key=e.key.toLowerCase(),index='abc'.indexOf(key);
 if((index>=0&&key.length===1)||/^[1-3]$/.test(key)){const i=index>=0?index:Number(key)-1;if(!answered&&current.options[i]!==undefined){e.preventDefault();respond(current.options[i]);}}
 else if(key==='enter'&&answered){e.preventDefault();advanceQuiz();}
 else if(key==='r'&&(answered||current.direction!=='es_pt')){e.preventDefault();playQuestion();}
});
root.addEventListener('pagehide',()=>{quizMusic?.cancel();stopAudio();});
root.addEventListener('storage',e=>{if(e.key==='asallam_reviews_v1_portugues'||e.key===null){updateStats();if(activity==='explore'&&loaded)explore();}});
async function load(){loaded=false;$('loading').hidden=false;$('loading').textContent='Cargando vocabulario…';$('retry').hidden=true;showPanels();try{if(!ledger)throw Error('No se pudo cargar el registro de repasos. Recarga la página.');const response=await fetch('data/brasil.json?v=brasil-afinado-20261120');if(!response.ok)throw Error('No se pudo descargar el vocabulario.');catalog=normalize(await response.json());ledger.registerCatalog('portugues',catalog.map(x=>x.id));loaded=true;renderBlocks();$('loading').hidden=true;$('catalogIntro').textContent=catalog.length+' palabras y expresiones de Brasil · '+BLOCKS.length+' bloques';nextQuestion();if(activity==='explore')explore();if(activity==='match')matcher?.activate();if(settingsBroken)notice('No se pudieron leer los ajustes guardados. Se usan valores predeterminados sin sobrescribirlos.');}catch(error){$('loading').textContent=error.message||'No se pudo cargar el vocabulario.';$('retry').hidden=false;$('poolCount').textContent='Catálogo no disponible';showPanels();}}
$('retry').onclick=load;load();
})(typeof window!=='undefined'?window:globalThis);
