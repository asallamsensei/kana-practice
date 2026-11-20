/* Portuguese writing practice: translate, take dictation, or retry session mistakes. */
(function(root){'use strict';
const clean=s=>String(s).normalize('NFC').toLocaleLowerCase('pt-BR').replace(/[.,?!¡¿;:…“”"()[\]{}]/g,'').trim().replace(/\s+/g,' ');
const withoutMarks=s=>s.normalize('NFD').replace(/\p{M}/gu,'');
function grade(input,answers){
 const value=clean(input);
 if(answers.some(x=>clean(x)===value))return 'correct';
 if(answers.some(x=>withoutMarks(clean(x))===withoutMarks(value)))return 'accent';
 return 'wrong';
}
function acceptedAnswers(item,catalog,dictation=false){
 // Dictation tests what was heard, not interchangeable meanings.
 if(dictation)return [item.pt];
 const prompt=clean(item.es);
 const fromPrompt=x=>[x.es,...(x.esVariants||[])].some(es=>clean(es)===prompt);
 return [...new Set([item.pt,...(item.ptVariants||[]),...catalog.filter(fromPrompt).flatMap(x=>[x.pt,...(x.ptVariants||[])])])];
}
function shuffled(items){
 const a=[...items];
 for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
 return a;
}
function create({host,items,settings,ledger,changed,notice}){
 const $=id=>host.querySelector('#'+id), audio=()=>root.AsallamPortugueseAudio;
 const mode=$('writeMode'), work=$('writeWork'), result=$('writeResult'), prompt=$('writePrompt'), form=$('writeForm'), input=$('writeInput'), feedback=$('writeFeedback'), listen=$('writeListen'), check=$('writeCheck'), next=$('writeNext'), skip=$('writeSkip'), finish=$('writeFinish'), review=$('writeReview'), summary=$('writeSummary');
 const audioStatus=$('writeAudioStatus');
 let earnedCue=null,fallback=false,active=false,queue=[],catalog=[],faults=new Map(),count={correct:0,wrong:0,skipped:0},current=null,finished=false,index=0,batch=0,revision=0,isReview=false,settled=false,heard=false,dictation=false;
 function getState(){return {done:count.correct+count.wrong+count.skipped,total:batch,review:isReview,finished};}
 function reset(redo=null){
  revision++;if(active)audio()?.stop();isReview=Array.isArray(redo);catalog=items();queue=shuffled(isReview?redo:catalog);index=0;
  batch=isReview?queue.length:settings().length?Math.min(queue.length,settings().length):0;
  if(batch)queue=queue.slice(0,batch);
  finished=false;faults.clear();count={correct:0,wrong:0,skipped:0};current=null;
  if(active)advance();else changed();
 }
 function displayPrompt(){
  prompt.textContent=dictation?'Escucha y escribe':current.es;
  if(audioStatus){audioStatus.hidden=!fallback;audioStatus.textContent=fallback?'Sin audio · escribe la traducción':'';}
  listen.hidden=!dictation&&!settled;
  input.placeholder='Escribe en portugués';
 }
 async function play(automatic=false){
  if(!active||finished||!current||(!dictation&&!settled))return;
  const token=revision, item=current, valid=()=>active&&revision===token;
  listen.disabled=true;
  const ok=await audio()?.play(item,{valid,automatic});
  if(!valid())return;
  listen.disabled=false;
  if(ok){heard=true;return;}
  if(dictation&&!settled){dictation=false;fallback=true;displayPrompt();}
 }
 function advance(){
  revision++;audio()?.stop();earnedCue=null;fallback=false;next.disabled=false;
  if(index>=queue.length){close();return;}
  work.hidden=false;result.hidden=true;current=queue[index++];settled=false;heard=false;dictation=mode.value==='dictation';
  feedback.hidden=true;feedback.replaceChildren();input.value='';input.disabled=false;skip.disabled=false;check.hidden=false;next.hidden=true;listen.disabled=false;displayPrompt();changed();
  if(dictation&&settings().autoAudio)void play(true);
 }
 function report(skipped){
  if(!active||finished||settled||!current)return;
  if(!skipped&&!input.value.trim())return;
  if(!skipped&&dictation&&!heard){notice('Escucha el audio completo antes de responder.');return;}
  const validAnswers=acceptedAnswers(current,catalog,dictation);
  const match=skipped?'skipped':grade(input.value,validAnswers);
  const outcome=match==='accent'?'correct':match;
  count[outcome]++;settled=true;
  if(outcome==='wrong')faults.set(current.id,current);
  ledger.record('portugues',current.id,dictation?'Escribir · Dictado':'Escribir · Español → portugués',outcome);
  input.disabled=true;skip.disabled=true;check.hidden=true;next.hidden=false;listen.disabled=false;listen.hidden=false;
  const line=document.createElement('strong'), answer=document.createElement('div'), translation=document.createElement('div');
  line.textContent=match==='accent'?'✓ Bien. Revisa la tilde o el signo en la letra.':outcome==='correct'?'✓ ¡Correcto!':outcome==='wrong'?'✕ Esta vez no.':'Sin responder';
  answer.lang='pt-BR';answer.textContent=(match==='correct'&&clean(input.value)!==clean(current.pt)?'También: ':'')+current.pt;
  translation.textContent=current.es;
  feedback.replaceChildren(line,answer,translation);
  if(current.extra){const extra=document.createElement('div');extra.textContent=current.extra;feedback.append(extra);}
  feedback.hidden=false;
  const token=revision;
  if(outcome==='correct')earnedCue=audio()?.afterCorrect(current,{valid:()=>active&&revision===token});
  changed();
 }
 function close(){
  revision++;audio()?.stop();earnedCue=null;next.disabled=false;finished=true;work.hidden=true;result.hidden=false;
  summary.textContent=count.correct+' aciertos · '+count.wrong+' errores · '+count.skipped+' sin responder';
  review.hidden=!faults.size;changed();
 }
 mode.onchange=()=>reset();
 form.onsubmit=e=>{e.preventDefault();report(false);};
 listen.onclick=()=>{void play();};skip.onclick=()=>report(true);
 next.onclick=async()=>{
  if(!active||finished||!settled||next.disabled)return;
  const token=revision;
  if(earnedCue&&audio()?.waitForCue){
   next.disabled=true;
   await audio().waitForCue(earnedCue);
   if(!active||revision!==token)return;
  }
  advance();if(!finished&&root.matchMedia?.('(pointer:fine)').matches)input.focus();
 };
 finish.onclick=close;$('writeRestart').onclick=()=>reset();
 review.onclick=()=>{if(faults.size)reset([...faults.values()]);};
 return {setActive(value){if(value===active)return;active=value;if(!value){revision++;audio()?.stop();earnedCue=null;next.disabled=false;listen.disabled=false;}else if(!current&&!finished)reset();},reset,getState};
}
const api={create,grade,clean,acceptedAnswers};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.AsallamPortugueseWriting=api;
})(typeof window!=='undefined'?window:globalThis);
