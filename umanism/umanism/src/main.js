import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, PROMPTS, TEMPLATES, pick, shuffle, makeRound } from './data.js';
import './style.css';

const MAX_PLAYERS = 32, CREATE_MS = 180000, VOTE_MS = 45000;
const $ = s => document.querySelector(s), app = $('#app');
const me = { id: sessionStorage.getItem('umanism_player_id') || crypto.randomUUID(), name: localStorage.getItem('umanism_player_name') || '' };
sessionStorage.setItem('umanism_player_id', me.id);
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key) : null;
let channel = null, roomCode = '', isHost = false, players = [], game = null, privateRound = null;
let timer = null, localTick = null, selectedCategory = '', selectedTemplate = '', canvas = null, color = '#211b2d', brush = 4, drawing = false;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = msg => { const e=document.createElement('div'); e.className='toast'; e.textContent=msg; document.body.append(e); setTimeout(()=>e.remove(),2600); };
const fmt = ms => { const n=Math.max(0,Math.ceil(ms/1000)); return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; };
const code = () => Math.random().toString(36).slice(2,8).toUpperCase();
const creator = () => game?.round?.creatorId === me.id;

function home() {
  app.innerHTML = `<div class="wrap"><header class="top"><div class="brand"><div class="brand-mark">✦</div><div><h1>Atelierul Umanismului</h1><small>Un joc de creație și deducție</small></div></div><span class="pill">2–32 jucători</span></header>
  <section class="hero"><div class="eyebrow">Creează · Observă · Ghicește</div><h2>Ideile prind formă.</h2><p>Primește o provocare, creează în 3 minute și descoperă ce tip de umanism se ascunde în lucrările celorlalți.</p></section>
  <div class="grid"><section class="card"><h3>✦ Creează o cameră</h3><p class="muted">Devii gazda jocului.</p><div class="field"><label>Numele tău</label><input id="create-name" maxlength="18" placeholder="Ex.: Alex" value="${esc(me.name)}"></div><button class="btn" id="create">Creează camera</button></section>
  <section class="card"><h3>↗ Intră într-o cameră</h3><p class="muted">Introdu codul primit de la gazdă.</p><div class="field"><label>Numele tău</label><input id="join-name" maxlength="18" placeholder="Ex.: Mara" value="${esc(me.name)}"></div><div class="field"><label>Codul camerei</label><input id="join-code" maxlength="6" placeholder="ABC123"></div><button class="btn secondary" id="join">Intră în cameră</button></section></div>
  <p class="footer">Joc educativ · Interfață în limba română</p></div>`;
  $('#create').onclick=()=>connect(code(),$('#create-name').value.trim(),true);
  $('#join').onclick=()=>connect($('#join-code').value.trim().toUpperCase(),$('#join-name').value.trim(),false);
  if(!supabase) toast('Configurează variabilele Supabase în Cloudflare.');
}
function head(){return `<header class="top"><div class="brand"><div class="brand-mark">✦</div><div><h1>Atelierul Umanismului</h1><small>Camera ${esc(roomCode)}</small></div></div><span class="pill">${isHost?'Gazdă':'Jucător'}</span></header>`;}
function pubRound(r){
  if(!r)return null;
  const p={number:r.number,mode:r.mode,creatorId:r.creatorId,creatorName:r.creatorName,phase:r.phase,deadlineAt:r.deadlineAt,votingDeadlineAt:r.votingDeadlineAt,artwork:r.artwork,votesCount:Object.keys(r.votes||{}).length,votedIds:Object.keys(r.votes||{})};
  if(r.phase==='voting'&&r.mode==='B') p.choices=r.choices.map(t=>({id:t.id,kind:t.kind,content:t.content}));
  if(r.phase==='results') p.result=r.result;
  return p;
}
function broadcast(){
  if(!isHost||!channel||!game)return;
  const state={...game,round:pubRound(game.round),players:game.players.map(p=>({...p,score:game.scores[p.id]||0}))};
  channel.send({type:'broadcast',event:'state',payload:state});
  if(game.round?.phase==='creating'){
    const secret={category:game.round.category,prompt:game.round.prompt,template:game.round.template||null};
    if(game.round.creatorId===me.id) privateRound=secret;
    else channel.send({type:'broadcast',event:'private',payload:{to:game.round.creatorId,round:secret}});
  }
  render();
}
function onPresence(){
  const all=Object.values(channel.presenceState()).flat().map(p=>({id:p.id,name:p.name||'Jucător'}));
  players=[...new Map(all.map(p=>[p.id,p])).values()];
  if(isHost&&game){
    const old=game.players||[];
    game.players=players.map(p=>({...p,score:game.scores?.[p.id]??old.find(x=>x.id===p.id)?.score??0}));
    game.scores ||= {};
    game.players.forEach(p=>game.scores[p.id]??=0);
    broadcast(); // also refreshes the in-game player list
  } else render();
}
async function connect(room,name,host){
  if(!supabase)return alert('Lipsește configurarea Supabase.');
  if(!room||!name)return toast('Completează numele și codul camerei.');
  if(name.length>18)return toast('Numele poate avea maximum 18 caractere.');
  me.name=name; localStorage.setItem('umanism_player_name',name); roomCode=room; isHost=host;
  channel=supabase.channel(`umanism-${room}`,{config:{presence:{key:me.id},broadcast:{self:false}}});
  channel.on('presence',{event:'sync'},onPresence);
  channel.on('broadcast',{event:'state'},({payload})=>{if(!isHost){game=payload;players=payload?.players||players;render();}});
  channel.on('broadcast',{event:'private'},({payload})=>{if(payload?.to===me.id){privateRound=payload.round;render();}});
  channel.on('broadcast',{event:'action'},({payload})=>{if(isHost)action(payload);});
  channel.on('broadcast',{event:'request-state'},({payload})=>{if(isHost&&payload?.id)broadcast();});
  const status=await new Promise(resolve=>channel.subscribe(s=>{if(s==='SUBSCRIBED'||s==='CHANNEL_ERROR'||s==='TIMED_OUT')resolve(s);}));
  if(status!=='SUBSCRIBED'){toast('Conectarea la Supabase a eșuat.');channel=null;return;}
  const existing=Object.values(channel.presenceState()).flat(), ids=new Set(existing.map(p=>p.id).filter(Boolean));
  if(!host&&!ids.has(me.id)&&ids.size>=MAX_PLAYERS){await channel.unsubscribe();channel=null;roomCode='';home();toast('Camera este plină.');return;}
  await channel.track({id:me.id,name:me.name,joinedAt:Date.now()});
  if(host){game={status:'lobby',hostId:me.id,players:[],order:[],roundIndex:0,totalRounds:0,round:null,scores:{},history:[]};}
  else channel.send({type:'broadcast',event:'request-state',payload:{id:me.id}});
  render();
}
function send(a){const payload={...a,playerId:me.id};if(isHost)action(payload);else channel?.send({type:'broadcast',event:'action',payload});}
function action(a){
  if(!game?.round)return;
  const r=game.round;
  if(a.type==='submit'&&a.playerId===r.creatorId&&r.phase==='creating'){
    r.artwork=a.artwork;r.phase='voting';r.votingDeadlineAt=Date.now()+VOTE_MS;r.votes={};r.templateVotes={};broadcast();return;
  }
  if(a.type==='vote'&&r.phase==='voting'&&a.playerId!==r.creatorId){
    if(!game.players.some(p=>p.id===a.playerId)||!CATEGORIES.includes(a.category))return;
    if(r.votes[a.playerId])return;
    if(r.mode==='B'&&!r.choices.some(t=>t.id===a.templateId))return;
    r.votes[a.playerId]=a.category;
    if(r.mode==='B')r.templateVotes[a.playerId]=a.templateId;
    broadcast();
    const voters=game.players.filter(p=>p.id!==r.creatorId);
    if(voters.length&&voters.every(p=>r.votes[p.id]&&(r.mode!=='B'||r.templateVotes[p.id])))finishVoting();
  }
}
function startGame(){
  if(players.length<2)return toast('Ai nevoie de cel puțin 2 jucători.');
  if(players.length>MAX_PLAYERS)return toast('Maximum 32 de jucători.');
  game.players=players.map(p=>({...p,score:0}));game.scores=Object.fromEntries(players.map(p=>[p.id,0]));
  game.order=shuffle(players.map(p=>p.id));game.roundIndex=0;game.totalRounds=players.length;game.history=[];game.status='playing';startRound();
}
function startRound(){
  if(game.roundIndex>=game.totalRounds){game.status='finished';game.round=null;clearInterval(timer);broadcast();return;}
  const order=game.order.map(id=>game.players.find(p=>p.id===id)).filter(Boolean);
  const r=makeRound(order,game.roundIndex);r.deadlineAt=Date.now()+CREATE_MS;game.round=r;privateRound=null;broadcast();runHostTimer();
}
function runHostTimer(){
  clearInterval(timer);
  timer=setInterval(()=>{
    if(!isHost||!game?.round)return;
    const r=game.round;
    if(r.phase==='creating'&&Date.now()>=r.deadlineAt){
      r.artwork ||= {kind:'text',data:'Creatorul nu a trimis o lucrare.'};
      r.phase='voting';r.votingDeadlineAt=Date.now()+VOTE_MS;r.votes={};r.templateVotes={};broadcast();
    }else if(r.phase==='voting'&&Date.now()>=r.votingDeadlineAt)finishVoting();
  },400);
}
function finishVoting(){
  const r=game?.round;if(!isHost||!r||r.phase!=='voting')return;
  const count=vals=>vals.reduce((o,v)=>(o[v]=(o[v]||0)+1,o),{});
  const categoryCounts=count(Object.values(r.votes)), max=Math.max(0,...Object.values(categoryCounts));
  const topCategories=Object.keys(categoryCounts).filter(c=>categoryCounts[c]===max&&max>0);
  const templateCounts=count(Object.values(r.templateVotes)), tmax=Math.max(0,...Object.values(templateCounts));
  const topTemplates=Object.keys(templateCounts).filter(id=>templateCounts[id]===tmax&&tmax>0);
  // Category points are awarded only when there is one unique top category AND it is correct.
  if(topCategories.length===1&&topCategories[0]===r.category){
    for(const [id,c] of Object.entries(r.votes))if(c===r.category)game.scores[id]=(game.scores[id]||0)+100;
    game.scores[r.creatorId]=(game.scores[r.creatorId]||0)+300;
  }
  // Mode B original-model points are independent of category ties.
  if(r.mode==='B'){
    for(const [id,t] of Object.entries(r.templateVotes))if(t===r.template.id)game.scores[id]=(game.scores[id]||0)+150;
    if(topTemplates.length===1&&topTemplates[0]===r.template.id)game.scores[r.creatorId]=(game.scores[r.creatorId]||0)+50;
  }
  game.players=game.players.map(p=>({...p,score:game.scores[p.id]||0}));
  r.result={category:r.category,categoryCounts,topCategories,template:r.template||null,templateCounts,topTemplates,votes:r.votes,templateVotes:r.templateVotes,creatorId:r.creatorId};
  r.phase='results';game.history.push({number:r.number,mode:r.mode,creatorName:r.creatorName,result:r.result});broadcast();
}
function nextRound(){if(!isHost)return;game.roundIndex++;startRound();}
function restart(){if(!isHost)return;clearInterval(timer);game.status='lobby';game.round=null;game.order=[];game.roundIndex=0;game.history=[];game.scores=Object.fromEntries(players.map(p=>[p.id,0]));game.players=players.map(p=>({...p,score:0}));broadcast();}
function render(){
  if(!channel)return home();
  if(!game)return app.innerHTML=`<div class="wrap">${head()}<section class="card">Te-ai conectat. Așteptăm sincronizarea camerei…</section></div>`;
  if(game.status==='lobby')return lobby();
  if(game.status==='finished')return finished();
  if(!game.round)return lobby();
  if(game.round.phase==='creating')return creating();
  if(game.round.phase==='voting')return voting();
  return results();
}
function lobby(){
  const list=game.players||players;
  app.innerHTML=`<div class="wrap">${head()}<section class="hero"><div class="eyebrow">Camera de joc</div><h2>Ne pregătim de creație.</h2><p>Trimite codul camerei prietenilor.</p></section><section class="card"><div class="between"><div><div class="small">CODUL CAMEREI</div><div class="roomcode">${esc(roomCode)}</div></div><button class="btn secondary" id="copy">Copiază codul</button></div><div class="divider"></div><h3>Jucători (${list.length}/${MAX_PLAYERS})</h3><div class="players">${list.map(p=>`<div class="player"><span class="dot"></span>${esc(p.name)} ${p.id===game.hostId?'★':''}</div>`).join('')}</div>${isHost?`<button class="btn" id="start" ${list.length<2||list.length>MAX_PLAYERS?'disabled':''}>Începe jocul</button>`:'<div class="notice">Așteaptă gazda să înceapă partida. Nu închide pagina.</div>'}<p class="small">Fiecare jucător va crea o dată, într-o ordine aleatorie.</p></section></div>`;
  $('#copy').onclick=()=>{navigator.clipboard?.writeText(roomCode);toast('Cod copiat.');};if(isHost)$('#start').onclick=startGame;
}
function imageMarkup(src,alt='Model desenat'){return `<img class="model-image" src="${esc(src)}" alt="${esc(alt)}">`;}
function modelMarkup(t){return t?.kind==='drawing'?imageMarkup(t.content,'Model original'):esc(t?.content||'');}
function creating(){
  const r=game.round,mine=creator(),pr=mine?privateRound:null;
  const kind=pr?.prompt?.type||'text';
  let content='';
  if(mine){
    if(!pr)content='<div class="notice">Se încarcă cerința…</div>';
    else if(r.mode==='A')content=`<div class="notice"><b>Tipul secret de umanism: ${esc(pr.category)}.</b> Această categorie este doar pentru tine. Creează lucrarea astfel încât ceilalți să o poată deduce, fără să scrii numele categoriei.</div>`;
    else content=`<div class="notice"><b>Model original (${esc(pr.category)})</b><br>Reprodu cât mai fidel modelul. Categoria și modelul original nu vor fi vizibile celorlalți.</div><div class="art model-art">${modelMarkup(pr.template)}</div>`;
    if(pr)content+=`<div class="prompt">${esc(pr.prompt.text)}</div>`;
    if(kind==='desen'||(r.mode==='B'&&pr?.template?.kind==='drawing'))content+=`<div class="toolbar"><label class="small">Culoare</label><input id="color" type="color" value="#211b2d"><label class="small">Grosime</label><input id="brush" type="range" min="1" max="18" value="4"><button class="btn ghost" id="clear">Șterge</button></div><div class="canvas-wrap"><canvas id="canvas" width="1000" height="620"></canvas></div>`;
    else content+=`<div class="field"><label>Lucrarea ta</label><textarea id="work" class="work-text" maxlength="1800" placeholder="Scrie aici…"></textarea></div>`;
    content+='<button class="btn" id="submit">Trimite lucrarea</button>';
  }else content=`<div class="notice"><b>${esc(r.creatorName)}</b> creează acum. Nu vei vedea categoria sau modelul original.</div><div class="empty-art">✎</div>`;
  app.innerHTML=`<div class="wrap">${head()}<div class="between"><span class="tag">Runda ${r.number} · ${r.mode==='A'?'Creație liberă':'Reproducere după model'}</span><div class="timer" id="timer">${fmt(r.deadlineAt-Date.now())}</div></div><section class="card"><h3>${mine?'Este rândul tău să creezi!':'Un jucător creează…'}</h3>${content}</section></div>`;
  localTimer(r.deadlineAt);
  if(mine&&pr&&($('#canvas')))setupCanvas();
  if(mine&&$('#submit'))$('#submit').onclick=submit;
}
function localTimer(deadline){
  clearInterval(localTick);localTick=setInterval(()=>{if($('#timer'))$('#timer').textContent=fmt(deadline-Date.now());else clearInterval(localTick);},250);
}
function setupCanvas(){
  canvas=$('#canvas');const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.lineCap='round';ctx.lineJoin='round';
  const pos=e=>{const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height};};
  canvas.onpointerdown=e=>{drawing=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!drawing)return;const p=pos(e);ctx.strokeStyle=color;ctx.lineWidth=brush;ctx.lineTo(p.x,p.y);ctx.stroke();};
  canvas.onpointerup=canvas.onpointercancel=()=>drawing=false;
  $('#color').oninput=e=>color=e.target.value;$('#brush').oninput=e=>brush=Number(e.target.value);
  $('#clear').onclick=()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);};
}
function submit(){
  const pr=privateRound;if(!pr)return;
  let artwork;
  if(pr.prompt.type==='desen'||(game.round.mode==='B'&&pr.template?.kind==='drawing'))artwork={kind:'drawing',data:canvas.toDataURL('image/jpeg',0.72)};
  else{const value=$('#work')?.value.trim();if(!value)return toast('Scrie ceva înainte de trimitere.');artwork={kind:'text',data:value};}
  $('#submit').disabled=true;send({type:'submit',artwork});
}
function art(a){return !a?'<div class="art">Lucrarea lipsește.</div>':a.kind==='drawing'?`<div class="art">${imageMarkup(a.data,'Lucrare realizată de creator')}</div>`:`<div class="art">${esc(a.data)}</div>`;}
function voting(){
  const r=game.round,mine=creator(),already=(r.votedIds||[]).includes(me.id);
  const cats=CATEGORIES.map(c=>`<button class="choice ${selectedCategory===c?'selected':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const choices=r.mode==='B'?(r.choices||[]).map((t,i)=>`<button class="choice ${selectedTemplate===t.id?'selected':''}" data-tpl="${esc(t.id)}"><small>Varianta ${i+1}</small>${modelMarkup(t)}</button>`).join(''):'';
  const form=mine?'<div class="notice">Ai trimis lucrarea. Așteaptă voturile.</div>':already?'<div class="notice">Răspunsul tău a fost înregistrat.</div>':`<h3>1. Ce tip de umanism reprezintă?</h3><div class="category-grid">${cats}</div>${r.mode==='B'?`<div class="divider"></div><h3>2. Care este modelul original?</h3><div class="choices">${choices}</div>`:''}<button class="btn" id="vote" disabled>Trimite răspunsul</button>`;
  app.innerHTML=`<div class="wrap">${head()}<div class="between"><span class="tag">Runda ${r.number} · Votare</span><div class="timer" id="timer">${fmt(r.votingDeadlineAt-Date.now())}</div></div><section class="card"><h3>Lucrarea lui ${esc(r.creatorName)}</h3>${art(r.artwork)}<div class="divider"></div>${form}</section></div>`;
  localTimer(r.votingDeadlineAt);
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;voting();});
  document.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{selectedTemplate=b.dataset.tpl;voting();});
  const btn=$('#vote');if(btn){btn.disabled=!selectedCategory||(r.mode==='B'&&!selectedTemplate);btn.onclick=()=>{send({type:'vote',category:selectedCategory,templateId:selectedTemplate});toast('Răspuns înregistrat.');};}
}
function results(){
  const r=game.round,x=r.result||{},top=x.topCategories||[],winner=top.length===1?top[0]:'Egalitate';
  const rows=Object.entries(x.categoryCounts||{}).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="between score-row"><span>${esc(c)}</span><b>${n} voturi</b></div>`).join('');
  const scores=[...(game.players||[])].sort((a,b)=>(game.scores[b.id]||0)-(game.scores[a.id]||0));
  app.innerHTML=`<div class="wrap">${head()}<section class="card"><span class="tag">Runda ${r.number} · Rezultate</span><div class="eyebrow" style="margin-top:20px">Categoria câștigătoare</div><h2 class="result-title">${esc(winner)}</h2><p class="muted">Categoria secretă: <b>${esc(x.category)}</b></p>${top.length!==1?'<div class="notice">Egalitate: nimeni nu primește puncte pentru ghicirea categoriei.</div>':''}<div class="divider"></div><h3>Voturi pe categorii</h3>${rows||'<p class="muted">Nu au fost voturi.</p>'}${r.mode==='B'?`<div class="divider"></div><h3>Modelul original</h3><div class="art">${modelMarkup(x.template)}</div><p class="muted">${Object.values(x.templateVotes||{}).filter(v=>v===x.template?.id).length} jucători au identificat modelul corect.</p>`:''}<div class="divider"></div><h3>Clasament</h3>${scores.map((p,i)=>`<div class="score-row"><span class="rank">#${i+1}</span><span>${esc(p.name)}</span><b class="score">${game.scores[p.id]||0} pct.</b></div>`).join('')}${isHost?`<button class="btn" id="next">${game.roundIndex+1>=game.totalRounds?'Clasament final':'Următoarea rundă'}</button>`:'<div class="notice">Așteaptă gazda.</div>'}</section></div>`;
  if(isHost)$('#next').onclick=nextRound;
}
function finished(){
  const scores=[...(game.players||[])].sort((a,b)=>(game.scores[b.id]||0)-(game.scores[a.id]||0));
  app.innerHTML=`<div class="wrap">${head()}<section class="hero"><div class="eyebrow">Partidă încheiată</div><h2>Felicitări!</h2><p>Clasamentul final al Atelierului Umanismului.</p></section><section class="card"><h3>Clasament final</h3>${scores.map((p,i)=>`<div class="score-row"><span class="rank">${i===0?'🏆':'#'+(i+1)}</span><b>${esc(p.name)}</b><b class="score">${game.scores[p.id]||0} pct.</b></div>`).join('')}${isHost?'<button class="btn" id="restart">Joacă din nou</button>':'<div class="notice">Așteaptă gazda.</div>'}</section></div>`;
  if(isHost)$('#restart').onclick=restart;
}
home();
