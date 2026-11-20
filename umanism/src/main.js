import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, PROMPTS, TEMPLATES, pick, shuffle, makeRound } from './data.js';
import './style.css';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const params = new URLSearchParams(location.search);
const savedId = localStorage.getItem('umanism_player_id') || crypto.randomUUID();
localStorage.setItem('umanism_player_id', savedId);
const me = { id: savedId, name: localStorage.getItem('umanism_player_name') || '' };
let supabase = null, channel = null, roomCode = '', isHost = false;
let players = [], game = null, privateRound = null, timerHandle = null, lastPhase = '';
let canvas = null, drawing = false, drawColor = '#211b2d', brushSize = 4;
let selectedCategory = '', selectedTemplate = '';
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (envUrl && envKey) supabase = createClient(envUrl, envKey);

function esc(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(message) { const el = document.createElement('div'); el.className='toast'; el.textContent=message; document.body.append(el); setTimeout(()=>el.remove(),2600); }
function code() { return Math.random().toString(36).slice(2,8).toUpperCase(); }
function playerById(id) { return players.find(p=>p.id===id) || {id,name:'Jucător'}; }
function orderedPlayers() { return (game?.order || []).map(id=>playerById(id)); }
function fmtTime(ms) { const s=Math.max(0,Math.ceil(ms/1000)); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

function renderHome() {
  app.innerHTML = `<div class="wrap">
    <header class="top"><div class="brand"><div class="brand-mark">✦</div><div><h1>Atelierul Umanismului</h1><small>Un joc de creație și deducție</small></div></div><span class="pill">2–20 jucători</span></header>
    <section class="hero"><div class="eyebrow">Creează · Observă · Ghicește</div><h2>Ideile prind formă.</h2><p>Primește o provocare, creează în 3 minute și încearcă să descoperi ce tip de umanism se ascunde în lucrările celorlalți.</p></section>
    <div class="grid"><section class="card"><h3>✦ Creează o cameră</h3><p class="muted">Devii gazda jocului și vei putea începe partida.</p><div class="field"><label for="create-name">Numele tău</label><input id="create-name" maxlength="18" placeholder="Ex.: Alex" value="${esc(me.name)}"></div><button class="btn" id="create-room">Creează camera</button></section>
    <section class="card"><h3>↗ Intră într-o cameră</h3><p class="muted">Introdu codul primit de la gazdă.</p><div class="field"><label for="join-name">Numele tău</label><input id="join-name" maxlength="18" placeholder="Ex.: Mara" value="${esc(me.name)}"></div><div class="field"><label for="join-code">Codul camerei</label><input id="join-code" maxlength="6" placeholder="ABC123" style="text-transform:uppercase"></div><button class="btn secondary" id="join-room">Intră în cameră</button></section></div>
    <div class="footer">Joc educativ inspirat de tipurile umanismului · Interfață în limba română</div></div>`;
  $('#create-room').onclick = () => createRoom($('#create-name').value.trim());
  $('#join-room').onclick = () => joinRoom($('#join-name').value.trim(), $('#join-code').value.trim().toUpperCase());
  if (!supabase) toast('Adaugă URL-ul și cheia Supabase în fișierul .env.');
}

function configError() { if (!supabase) { alert('Mai întâi configurează VITE_SUPABASE_URL și VITE_SUPABASE_PUBLISHABLE_KEY în fișierul .env.'); return true; } return false; }
async function connect(codeValue, name, host) {
  if (configError()) return;
  if (!name) { toast('Alege un nume înainte de a continua.'); return; }
  if (name.length > 18) { toast('Numele poate avea maximum 18 caractere.'); return; }
  me.name = name; localStorage.setItem('umanism_player_name', name);
  roomCode = codeValue; isHost = host;
  channel = supabase.channel(`umanism-${roomCode}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
  channel.on('presence', { event: 'sync' }, syncPresence);
  channel.on('broadcast', { event: 'state' }, ({payload}) => { if (!isHost) { game = payload; players = payload?.players || players; onStateChanged(); } });
  channel.on('broadcast', { event: 'private' }, ({payload}) => { if (payload?.to === me.id) { privateRound = payload.round; render(); } });
  channel.on('broadcast', { event: 'action' }, ({payload}) => { if (isHost) handleAction(payload); });
  channel.on('broadcast', { event: 'notice' }, ({payload}) => { if (payload?.message) toast(payload.message); });
  const status = await new Promise(resolve => channel.subscribe(s => { if (s === 'SUBSCRIBED') resolve(s); if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') resolve(s); }));
  if (status !== 'SUBSCRIBED') { toast('Nu m-am putut conecta. Verifică setările Supabase.'); return; }
  await channel.track({ id: me.id, name: me.name, joinedAt: Date.now() });
  if (host) {
    game = { status: 'lobby', hostId: me.id, players: [], order: [], roundIndex: 0, totalRounds: 0, round: null, scores: {}, history: [] };
    broadcastState();
  }
  render();
}
async function createRoom(name) { if (!name) return toast('Introdu numele tău.'); await connect(code(), name, true); }
async function joinRoom(name, room) { if (!name || !room) return toast('Completează numele și codul camerei.'); await connect(room, name, false); }

function syncPresence() {
  if (!channel) return;
  const presence = channel.presenceState();
  const list = Object.values(presence).flat().map(p=>({id:p.id,name:p.name || 'Jucător'}));
  const unique = [...new Map(list.map(p=>[p.id,p])).values()];
  players = unique;
  if (isHost && game) {
    const previous = game.players || [];
    game.players = unique.map(p=>({...p, score: game.scores?.[p.id] ?? previous.find(x=>x.id===p.id)?.score ?? 0}));
    game.scores ||= {};
    for (const p of game.players) game.scores[p.id] ??= 0;
    if (game.status === 'lobby') broadcastState();
  }
  render();
}
function publicRound(r) {
  if (!r) return null;
  const result = { number:r.number, mode:r.mode, creatorId:r.creatorId, creatorName:r.creatorName, phase:r.phase, createdAt:r.createdAt, deadlineAt:r.deadlineAt, artwork:r.artwork, votesCount:Object.keys(r.votes||{}).length, votedIds:Object.keys(r.votes||{}), votingDeadlineAt:r.votingDeadlineAt, templateVotesCount:Object.keys(r.templateVotes||{}).length };
  if (r.phase === 'voting' && r.mode === 'B') result.choices = r.choices.map(t=>({id:t.id,content:t.content,kind:t.kind}));
  if (r.phase === 'results') result.result = r.result;
  return result;
}
function broadcastState() {
  if (!isHost || !channel || !game) return;
  const pub = { ...game, round: publicRound(game.round), players: (game.players||[]).map(p=>({...p,score:game.scores?.[p.id]||0})) };
  channel.send({type:'broadcast',event:'state',payload:pub});
  if (game.round && game.round.phase === 'creating') {
    const secret = { category:game.round.category, prompt:game.round.prompt, template:game.round.template || null };
    if (game.round.creatorId === me.id) privateRound = secret;
    else channel.send({type:'broadcast',event:'private',payload:{to:game.round.creatorId,round:secret}});
  }
  onStateChanged();
}
function onStateChanged() {
  if (game?.round?.phase !== lastPhase) { lastPhase = game?.round?.phase || ''; selectedCategory=''; selectedTemplate=''; }
  render();
}
function sendAction(action) {
  const payload = {...action, playerId:me.id, playerName:me.name};
  if (isHost) handleAction(payload);
  else channel.send({type:'broadcast',event:'action',payload});
}
function handleAction(a) {
  if (!game || !game.round) return;
  const r=game.round;
  if (a.type==='submit' && a.playerId===r.creatorId && r.phase==='creating') {
    r.artwork=a.artwork; r.phase='voting'; r.votingDeadlineAt=Date.now()+45000; r.votes={}; r.templateVotes={};
    broadcastState(); return;
  }
  if (a.type==='vote' && r.phase==='voting' && a.playerId!==r.creatorId) {
    if (!CATEGORIES.includes(a.category)) return;
    if (r.mode==='B' && !r.choices.some(t=>t.id===a.templateId)) return;
    r.votes[a.playerId]=a.category;
    if (r.mode==='B') r.templateVotes[a.playerId]=a.templateId;
    broadcastState();
    const voters=game.players.filter(p=>p.id!==r.creatorId);
    if (voters.length && voters.every(p=>r.votes[p.id] && (r.mode!=='B' || r.templateVotes[p.id]))) finishVoting();
  }
}
function startGame() {
  if (!isHost || players.length < 2) return toast('Ai nevoie de cel puțin 2 jucători.');
  game.players=players.map(p=>({...p,score:0})); game.scores=Object.fromEntries(players.map(p=>[p.id,0]));
  game.order=shuffle(players.map(p=>p.id)); game.roundIndex=0; game.totalRounds=players.length; game.history=[]; game.status='playing';
  startRound();
}
function startRound() {
  if (game.roundIndex >= game.totalRounds) { game.status='finished'; game.round=null; broadcastState(); return; }
  const order=orderedPlayers();
  const r=makeRound(order,game.roundIndex);
  r.deadlineAt=Date.now()+180000;
  game.round=r; privateRound=null;
  broadcastState();
  ensureTimer();
}
function ensureTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle=setInterval(()=>{
    if (!isHost || !game?.round) return;
    const r=game.round;
    if (r.phase==='creating' && Date.now()>=r.deadlineAt) {
      r.artwork ||= {kind:r.prompt.type==='desen'?'drawing':'text',data:r.prompt.type==='desen'?'': 'Creatorul nu a trimis o lucrare.'};
      r.phase='voting'; r.votingDeadlineAt=Date.now()+45000; r.votes={}; r.templateVotes={}; broadcastState();
    } else if (r.phase==='voting' && Date.now()>=r.votingDeadlineAt) finishVoting();
  },500);
}
function finishVoting() {
  if (!isHost || !game?.round || game.round.phase!=='voting') return;
  const r=game.round, counts={}; Object.values(r.votes).forEach(c=>counts[c]=(counts[c]||0)+1);
  const max=Math.max(0,...Object.values(counts)); const topCategories=Object.keys(counts).filter(c=>counts[c]===max && max>0);
  const templateCounts={}; Object.values(r.templateVotes).forEach(id=>templateCounts[id]=(templateCounts[id]||0)+1);
  const tmax=Math.max(0,...Object.values(templateCounts)); const topTemplates=Object.keys(templateCounts).filter(id=>templateCounts[id]===tmax && tmax>0);
  for (const [id,category] of Object.entries(r.votes)) if (topCategories.includes(category)) game.scores[id]=(game.scores[id]||0)+100;
  if (topCategories.length===1 && topCategories[0]===r.category) game.scores[r.creatorId]=(game.scores[r.creatorId]||0)+300;
  if (r.mode==='B') {
    for (const [id,templateId] of Object.entries(r.templateVotes)) if (templateId===r.template.id) game.scores[id]=(game.scores[id]||0)+150;
    if (topTemplates.length===1 && topTemplates[0]===r.template.id) game.scores[r.creatorId]=(game.scores[r.creatorId]||0)+50;
  }
  game.players=game.players.map(p=>({...p,score:game.scores[p.id]||0}));
  r.result={category:r.category,categoryCounts:counts,topCategories,template:r.template||null,templateCounts,topTemplates,votes:r.votes,templateVotes:r.templateVotes,creatorId:r.creatorId};
  r.phase='results'; game.history.push({number:r.number,mode:r.mode,creatorName:r.creatorName,result:r.result});
  broadcastState();
}
function nextRound() { if (!isHost) return; game.roundIndex++; startRound(); }
function restartGame() { if (!isHost) return; game.status='lobby';game.round=null;game.order=[];game.roundIndex=0;game.history=[];game.scores=Object.fromEntries(players.map(p=>[p.id,0]));game.players=players.map(p=>({...p,score:0}));broadcastState(); }

function render() {
  if (!channel) return renderHome();
  if (!game) return renderWaiting();
  if (game.status==='lobby') return renderLobby();
  if (game.status==='finished') return renderFinished();
  if (!game.round) return renderLobby();
  if (game.round.phase==='creating') return renderCreating();
  if (game.round.phase==='voting') return renderVoting();
  if (game.round.phase==='results') return renderResults();
}
function header() { return `<header class="top"><div class="brand"><div class="brand-mark">✦</div><div><h1>Atelierul Umanismului</h1><small>Camera ${esc(roomCode)}</small></div></div><span class="pill">${isHost?'Gazdă':'Jucător'}</span></header>`; }
function renderWaiting() { app.innerHTML=`<div class="wrap">${header()}<section class="card"><h3>Te-ai conectat!</h3><p class="muted">Așteptăm sincronizarea camerei…</p></section></div>`; }
function renderLobby() {
  const list=game.players||players;
  app.innerHTML=`<div class="wrap">${header()}<section class="hero"><div class="eyebrow">Camera de joc</div><h2>Ne pregătim de creație.</h2><p>Trimite codul camerei prietenilor. Când sunt pregătiți, gazda poate începe partida.</p></section><section class="card"><div class="between"><div><div class="small">CODUL CAMEREI</div><div style="font-size:32px;font-weight:800;letter-spacing:5px;color:#f0c17a">${esc(roomCode)}</div></div><button class="btn secondary" id="copy-code">Copiază codul</button></div><div class="divider"></div><div class="between"><h3>Jucători (${list.length}/20)</h3><span class="tag">${list.length>=2?'Gata de joc':'Așteptăm jucători'}</span></div><div class="players">${list.map((p,i)=>`<div class="player"><span class="dot"></span><span>${esc(p.name)}</span>${p.id===game.hostId?'<span class="small">★</span>':''}</div>`).join('')}</div>${isHost?`<button class="btn" id="start-game" ${list.length<2?'disabled':''}>Începe jocul</button>`:`<div class="notice">Așteaptă ca gazda să înceapă jocul. Nu închide această pagină.</div>`}<p class="small" style="margin-top:13px">Creatorii vor fi aleși pe rând, într-o ordine aleatorie. Fiecare jucător va crea o dată pe parcursul unei partide.</p></section></div>`;
  $('#copy-code').onclick=()=>{navigator.clipboard?.writeText(roomCode);toast('Codul camerei a fost copiat.');};
  if(isHost) $('#start-game').onclick=startGame;
}
function creatorView() { return game.round.creatorId===me.id; }
function renderCreating() {
  const r=game.round, mine=creatorView(), pr=mine?privateRound:null;
  const remaining=r.deadlineAt-Date.now();
  const modeLabel=r.mode==='A'?'Creație liberă':'Reproducere după model';
  let creatorContent='';
  if (mine) {
    if (!pr) creatorContent='<div class="notice">Se încarcă cerința ta…</div>';
    else if (r.mode==='B') creatorContent=`<div class="notice"><b>Modelul original – ${esc(pr.category)}</b><br>Reprodu cât mai fidel creația de mai jos. Ceilalți nu vor vedea modelul original.</div><div class="art" style="margin-top:12px">${esc(pr.template?.content||'')}</div>`;
    else creatorContent=`<div class="notice"><b>Categoria ta secretă: ${esc(pr.category)}</b><br>Ceilalți jucători nu vor vedea această categorie.</div>`;
    creatorContent+=`<div class="prompt">${esc(pr?.prompt?.text||'Pregătește-te pentru provocare…')}</div>`;
    const kind=pr?.prompt?.type||'text';
    if(kind==='desen') creatorContent+=`<div class="toolbar"><label class="small">Culoare</label><input id="draw-color" type="color" value="#211b2d"><label class="small">Grosime</label><input id="brush-size" type="range" min="1" max="18" value="4"><button class="btn ghost" id="clear-canvas">Șterge</button></div><div class="canvas-wrap"><canvas id="drawing-canvas" width="1000" height="620"></canvas></div>`;
    else creatorContent+=`<div class="field"><label>Lucrarea ta</label><textarea id="work-text" class="work-text" maxlength="1800" placeholder="Scrie aici…"></textarea></div>`;
    creatorContent+=`<button class="btn" id="submit-art">Trimite lucrarea</button>`;
  } else {
    creatorContent=`<div class="notice"><b>${esc(r.creatorName)}</b> creează acum. Pregătește-te să ghicești categoria după ce timpul expiră sau creatorul trimite lucrarea.</div><div style="text-align:center;padding:35px 10px;font-size:54px">✎</div><p class="muted" style="text-align:center">Nu vei vedea cerința sau categoria secretă.</p>`;
  }
  app.innerHTML=`<div class="wrap">${header()}<div class="between"><span class="tag">Runda ${r.number} · ${modeLabel}</span><div class="timer" id="timer">${fmtTime(remaining)}</div></div><div class="round-list" style="margin:14px 0">${Array.from({length:game.totalRounds},(_,i)=>`<span class="round-chip ${i<game.roundIndex?'done':''}">Runda ${i+1}</span>`).join('')}</div><section class="card"><div class="between"><h3>${mine?'Este rândul tău să creezi!':'Un jucător creează…'}</h3><span class="pill">${mine?'Creator':'Ghicitor'}</span></div>${creatorContent}</section></div>`;
  startLocalTimer();
  if(mine && pr && pr.prompt?.type==='desen') setupCanvas();
  if(mine && $('#submit-art')) $('#submit-art').onclick=submitArtwork;
}
function startLocalTimer() {
  const el=$('#timer'); if(!el)return;
  const tick=()=>{ if($('#timer')) $('#timer').textContent=fmtTime((game?.round?.deadlineAt||Date.now())-Date.now()); };
  tick(); const old=window._localTick; if(old)clearInterval(old); window._localTick=setInterval(tick,250);
}
function setupCanvas() {
  canvas=$('#drawing-canvas'); const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.lineCap='round';ctx.lineJoin='round';
  const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
  canvas.onpointerdown=e=>{drawing=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!drawing)return;const p=pos(e);ctx.strokeStyle=drawColor;ctx.lineWidth=brushSize;ctx.lineTo(p.x,p.y);ctx.stroke();};
  canvas.onpointerup=()=>drawing=false;canvas.onpointercancel=()=>drawing=false;
  $('#draw-color').oninput=e=>drawColor=e.target.value;$('#brush-size').oninput=e=>brushSize=Number(e.target.value);
  $('#clear-canvas').onclick=()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);};
}
function submitArtwork() {
  const pr=privateRound; if(!pr)return;
  let artwork;
  if(pr.prompt.type==='desen') artwork={kind:'drawing',data:canvas?.toDataURL('image/png')||''};
  else {const text=$('#work-text')?.value.trim()||'';if(!text)return toast('Adaugă ceva în lucrare înainte de trimitere.');artwork={kind:'text',data:text};}
  $('#submit-art').disabled=true;sendAction({type:'submit',artwork});
  if(isHost) toast('Lucrarea a fost trimisă. Începe votarea.');
}
function artworkMarkup(a) { if(!a)return '<div class="art">Lucrarea nu a fost trimisă.</div>'; if(a.kind==='drawing')return `<div class="art"><img src="${a.data}" alt="Desen realizat de creator"></div>`; return `<div class="art">${esc(a.data)}</div>`; }
function renderVoting() {
  const r=game.round, mine=creatorView();
  const already=(r.votedIds||Object.keys(r.votes||{})).includes(me.id);
  const art=artworkMarkup(r.artwork);
  const categories=CATEGORIES.map(c=>`<button class="choice ${selectedCategory===c?'selected':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
  const templates=r.mode==='B'?(r.choices||[]).map((t,i)=>`<button class="choice ${selectedTemplate===t.id?'selected':''}" data-template="${esc(t.id)}"><small>Varianta ${i+1}</small>${esc(t.content)}</button>`).join(''):'';
  const guessContent=mine?`<div class="notice">Ai trimis lucrarea. Așteaptă răspunsurile celorlalți jucători.</div>`:already?`<div class="notice">Ai votat. Așteaptă rezultatele sau ceilalți jucători.</div>`:`<h3>1. Ce tip de umanism reprezintă?</h3><div class="category-grid">${categories}</div>${r.mode==='B'?`<div class="divider"></div><h3>2. Care este creația originală?</h3><div class="choices">${templates}</div>`:''}<button class="btn" id="send-vote" style="margin-top:16px" ${r.mode==='B'?'disabled':''}>Trimite răspunsul</button>`;
  app.innerHTML=`<div class="wrap">${header()}<div class="between"><span class="tag">Runda ${r.number} · Votare</span><div class="timer" id="timer">${fmtTime((r.votingDeadlineAt||Date.now())-Date.now())}</div></div><section class="card"><div class="between"><h3>Lucrarea lui ${esc(r.creatorName)}</h3><span class="pill">${r.mode==='A'?'Creație liberă':'Reproducere'}</span></div>${art}<div class="divider"></div>${mine?guessContent:guessContent}</section></div>`;
  startVotingTimer();
  document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.category;renderVoting();});
  document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{selectedTemplate=b.dataset.template;renderVoting();});
  const send=$('#send-vote'); if(send){send.disabled=!selectedCategory||(r.mode==='B'&&!selectedTemplate);send.onclick=()=>{sendAction({type:'vote',category:selectedCategory,templateId:selectedTemplate});toast('Răspunsul tău a fost înregistrat.');renderVoting();};}
}
function startVotingTimer(){const el=$('#timer');if(!el)return;const tick=()=>{if($('#timer'))$('#timer').textContent=fmtTime((game?.round?.votingDeadlineAt||Date.now())-Date.now());};tick();const old=window._localTick;if(old)clearInterval(old);window._localTick=setInterval(tick,250);}
function renderResults() {
  const r=game.round,res=r.result||{}, mine=creatorView();
  const cats=res.categoryCounts||{},catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="between" style="padding:8px 0"><span>${esc(c)}</span><b>${n} voturi</b></div>`).join('');
  const rightCat=res.topCategories?.length===1?res.topCategories[0]:'Egalitate';
  const templateCorrect=res.template?.content||'';
  const scores=[...(game.players||[])].sort((a,b)=>(game.scores?.[b.id]||0)-(game.scores?.[a.id]||0));
  app.innerHTML=`<div class="wrap">${header()}<div class="between"><span class="tag">Runda ${r.number} · Rezultate</span><span class="pill">${r.mode==='A'?'Modul A':'Modul B'}</span></div><section class="card"><div class="eyebrow">Categoria oficială</div><h2 style="font:800 34px 'Playfair Display',serif;margin:8px 0 15px">${esc(rightCat)}</h2><p class="muted">Categoria primită de creator: <b style="color:#f0c17a">${esc(res.category)}</b></p><div class="divider"></div><h3>Voturile pentru categorie</h3>${catRows||'<p class="muted">Nu au fost voturi.</p>'}${r.mode==='B'?`<div class="divider"></div><h3>Creația originală</h3><div class="art">${esc(templateCorrect)}</div><p class="muted">Au ghicit corect: ${Object.entries(res.templateVotes||{}).filter(([id,v])=>v===res.template?.id).length} jucători</p>`:''}<div class="divider"></div><h3>Clasament</h3>${scores.map((p,i)=>`<div class="score-row"><span class="rank">#${i+1}</span><span>${esc(p.name)} ${p.id===r.creatorId?'<span class="small">· creator</span>':''}</span><span class="score">${game.scores?.[p.id]||0} pct.</span></div>`).join('')}<div class="divider"></div>${isHost?`<button class="btn" id="next-round">${game.roundIndex+1>=game.totalRounds?'Vezi clasamentul final':'Următoarea rundă'}</button>`:`<div class="notice">Așteaptă gazda să pornească următoarea rundă.</div>`}</section></div>`;
  if(isHost)$('#next-round').onclick=nextRound;
}
function renderFinished() {
  const scores=[...(game.players||[])].sort((a,b)=>(game.scores?.[b.id]||0)-(game.scores?.[a.id]||0));
  app.innerHTML=`<div class="wrap">${header()}<section class="hero"><div class="eyebrow">Partidă încheiată</div><h2>Felicitări!</h2><p>Acesta este clasamentul final al Atelierului Umanismului.</p></section><section class="card"><h3>Clasament final</h3>${scores.map((p,i)=>`<div class="score-row"><span class="rank">${i===0?'🏆':'#'+(i+1)}</span><b>${esc(p.name)}</b><span class="score">${game.scores?.[p.id]||0} pct.</span></div>`).join('')}${isHost?'<button class="btn" id="restart" style="margin-top:18px">Joacă din nou</button>':'<div class="notice" style="margin-top:18px">Așteaptă gazda să pornească o nouă partidă.</div>'}</section>`;
  if(isHost)$('#restart').onclick=restartGame;
}

renderHome();
