"use strict";
/* ============ theme mastery: what you know, what you don't ============ */
// tactical themes in order of importance for an improving player
const CORE = [["hangingPiece",1],["fork",1],["mateIn1",.92],["defensiveMove",.9],["pin",.86],["mateIn2",.85],["discoveredAttack",.8],["backRankMate",.78],["skewer",.72],["capturingDefender",.7],["deflection",.7],["trappedPiece",.62],["promotion",.6],["pawnEndgame",.58],["exposedKing",.58],["attraction",.55],["rookEndgame",.54],["intermezzo",.5],["quietMove",.48],["sacrifice",.48]];
const HABIT_THEME = {hang:"hangingPiece", punish:"hangingPiece", threat:"defensiveMove", tactic:"fork", mate:"mateIn2", rush:"hangingPiece"};
const THEME_TIPS = {
  hangingPiece:"Преди всеки ход провери: коя фигура на противника не е защитена? И коя твоя?",
  fork:"Търси поле, от което една твоя фигура напада две ценни неща наведнъж. Най-често е кон или дама.",
  mateIn1:"Прегледай всеки шах. Ако царят няма поле, няма кой да вземе и няма как да се закрие, това е мат.",
  defensiveMove:"Първо разбери какво заплашва противникът. Понякога най-силният ход е тиха защита, а не атака.",
  pin:"Фигура пред по-ценна фигура на една линия не може да мърда свободно. Нападни я още веднъж.",
  mateIn2:"Първият ход трябва да е форсиращ: шах, жертва или заплаха, на която няма добър отговор.",
  discoveredAttack:"Когато твоя фигура стои пред друга твоя на линия, отместването ѝ отваря втора атака.",
  backRankMate:"Цар зад три пешки без въздух: провери дали топ или дама могат да влязат на последната редица.",
  skewer:"Нападни ценна фигура по линия. Когато тя избяга, вземи тази зад нея.",
  capturingDefender:"Виж кой пази нападнатата фигура. Вземи или прогони пазача.",
  deflection:"Ако една фигура пази две неща, принуди я с шах или жертва да изостави едното.",
  trappedPiece:"Преброй полетата на фигурата. Ако може да ѝ вземеш всичките, хвани я.",
  promotion:"Проходната пешка напред! Понякога жертва на фигура ѝ разчиства пътя.",
  pawnEndgame:"В пешечния ендшпил царят е най-важната фигура. Опозицията решава.",
  exposedKing:"Открит цар е мишена: дай шахове, които доближават фигурите ти до него.",
  attraction:"Примами царя или фигура на лошо поле с жертва, после удари.",
  rookEndgame:"Активният топ е по-важен от пешка. Топът стои зад проходната пешка.",
  intermezzo:"Преди очакваното взимане провери дали няма по-силен междинен ход, например шах.",
  quietMove:"Не всеки силен ход е шах или взимане. Понякога тих ход създава заплаха без отговор.",
  sacrifice:"Жертвата работи, когато после следва форсиран удар. Смятай докрай.",
};
function tmRecord(themeNames, score){
  S.tm = S.tm || {};
  themeNames.forEach(t=>{ if (META_T.has(t)) return; const a=S.tm[t]||[]; a.push(score===1?1:score===.5?.5:0); if (a.length>12) a.shift(); S.tm[t]=a; });
}
// recent, recency-weighted success rate for a theme (0..1) and how much evidence there is
function mastery(t){
  const a=(S.tm||{})[t];
  if (!a || !a.length){ const old=S.puz.theme[t]; if (old && old[1]>=3) return {m:old[0]/old[1], n:Math.min(old[1],5)}; return {m:null, n:0}; }
  let w=0, s=0; a.forEach((v,i)=>{ const wt=1+i*.3; w+=wt; s+=v*wt; }); return {m:s/w, n:a.length};
}
// themes ranked by how much they need work right now
function themePlan(){
  const lvl=(S.onb&&S.onb.lvl)||"basic"; const p=profile(); const hb={};
  p.habits.forEach(x=>{ const t=HABIT_THEME[x.k]; if (t) hb[t]=(hb[t]||0)+x.c; });
  return CORE.map(([t,imp],i)=>{
    const {m,n}=mastery(t); const unknown = m==null || n<3;
    const order = lvl==="new" ? Math.max(.25,1-i*.07) : lvl==="basic" ? Math.max(.4,1-i*.04) : Math.max(.6,1-i*.02);
    const need = unknown ? .55 : (1-m);
    const score = imp*order*(.2+need) + (hb[t]||0)*.15;
    return {t, m, n, score, unknown, habit:!!hb[t]};
  }).sort((a,b)=>b.score-a.score);
}
// weak themes get easier puzzles to build the pattern, strong ones harder
function themeTarget(t){ const {m,n}=mastery(t); const adj = (m!=null && n>=3) ? Math.max(-250, Math.min(150, (m-.65)*500)) : -120; return Math.round(S.puz.rating+adj); }

/* ============ failed puzzles come back: 1, 3, 7 days ============ */
function rqRecord(pid, score){
  S.rq = S.rq || {}; const q=S.rq[pid];
  if (score<1){ S.rq[pid]={due:Date.now()+DAY-3600e3, box:0}; return; }
  if (q){ q.box++; if (q.box>=3) delete S.rq[pid]; else q.due=Date.now()+[1,3,7][q.box]*DAY-3600e3; }
  const ks=Object.keys(S.rq); if (ks.length>300) ks.sort((a,b)=>S.rq[a].due-S.rq[b].due).slice(0,ks.length-300).forEach(k=>delete S.rq[k]);
}
function rqDue(){ return Object.entries(S.rq||{}).filter(([k,v])=>v.due<=Date.now()).sort((a,b)=>a[1].due-b[1].due).map(([k])=>k); }
function puzzleById(id){ return PZ.p.find(p=>p[0]===id); }

/* ============ picking the next puzzle for you ============ */
// returns {pz, why}
function pickSmart(avoid){
  const due=rqDue().filter(id=>!avoid.has(id));
  if (due.length && Math.random()<.3){ const pz=puzzleById(due[0]); if (pz) return {pz, why:"Връща се сгрешен пъзел", theme:null}; }
  if (Math.random()<.2){ const pz=pickPuzzle("mix",{avoid}); if (pz) return {pz, why:"Като в партия: темата е скрита", theme:null}; }
  const plan=themePlan().slice(0,4); const tot=plan.reduce((a,x)=>a+x.score,0); let r=Math.random()*tot; let pick=plan[0];
  for (const x of plan){ r-=x.score; if (r<=0){ pick=x; break; } }
  const pz=pickPuzzle(pick.t,{target:themeTarget(pick.t), avoid}) || pickPuzzle("mix",{avoid});
  return {pz, why: pick.unknown ? `Нова тема · ${THEME_BG[pick.t]}` : `Слабо място · ${THEME_BG[pick.t]}`, theme:pick.t};
}

/* ============ thinking: rushing detector ============ */
function thinkRecord(fast, ok){ S.think=S.think||{log:[]}; S.think.log.push(fast?(ok?"f1":"f0"):(ok?"s1":"s0")); if (S.think.log.length>40) S.think.log.shift(); }
function rushRate(){ const l=(S.think&&S.think.log)||[]; const miss=l.filter(x=>x.endsWith("0")); if (miss.length<4) return null; return miss.filter(x=>x[0]==="f").length/miss.length; }
function thinkModeOn(){ if (S.set.think==="on") return true; if (S.set.think==="off") return false; const rr=rushRate(); return (S.onb&&S.onb.lvl==="new") || (rr!=null && rr>=.5); }

/* ============ six-area profile ============ */
function avgM(ts){ const v=ts.map(t=>mastery(t)).filter(x=>x.m!=null); if (!v.length) return null; return v.reduce((a,x)=>a+x.m*x.n,0)/v.reduce((a,x)=>a+x.n,0); }
function areas(){
  const p=profile(); const clamp=v=>v==null?null:Math.round(Math.max(0,Math.min(100,v)));
  const tac=avgM(["hangingPiece","fork","pin","skewer","discoveredAttack","capturingDefender","deflection","trappedPiece"]);
  const mate=avgM(["mateIn1","mateIn2","backRankMate","exposedKing"]);
  const def=avgM(["defensiveMove"]); const thr=p.habits.find(x=>x.k==="threat");
  const end=avgM(["pawnEndgame","rookEndgame","promotion"]); const egDone=ENDGAMES.filter(e=>S.eg[e.id]&&S.eg[e.id].done).length;
  const lines=Object.keys(S.lines).filter(id=>findLine(id)); const mastered=lines.reduce((t,id)=>t+Math.min(S.lines[id].box||0,3)/3,0);
  const rr=rushRate(); const bl=p.blunders;
  const mix=(a,b)=>a==null?b:b==null?a:(a+b)/2;
  return [
    {k:"think", t:"Мислене", d:"Не бързаш и проверяваш хода", v:clamp(mix(rr==null?null:100-rr*100, bl==null?null:100-bl*30)), go:"lesson--safe-check"},
    {k:"tactic", t:"Тактика", d:"Виждаш ударите", v:clamp(tac==null?null:tac*100), go:"puzzle--mix"},
    {k:"mate", t:"Атака и мат", d:"Довършваш атаката", v:clamp(mate==null?null:mate*100), go:"puzzle--mateIn2"},
    {k:"defense", t:"Защита", d:"Виждаш заплахите", v:clamp(mix(def==null?null:def*100, thr&&p.n?100-thr.c/p.n*60:null)), go:"lesson--safe-threat"},
    {k:"opening", t:"Дебют", d:"Знаеш и играеш линиите си", v:clamp(mix(lines.length?mastered/lines.length*100:null, p.phase.o)), go:"learn"},
    {k:"endgame", t:"Ендшпил", d:"Довършваш спечеленото", v:clamp(mix(end==null?null:end*100, egDone?egDone/ENDGAMES.length*100:null)), go:"endgames"},
  ];
}

/* ============ repertoire ============ */
const REP_W = {d4:{name:"1.d4 · Лондонска система", courses:["london"]}, e4:{name:"1.e4 · Виенска + отговори", courses:["vienna","e4"]}};
const REP_B = ["caro","qgd"];
function repCourses(color){ if (color==="w") return S.rep && REP_W[S.rep.w] ? REP_W[S.rep.w].courses : []; return S.rep ? REP_B : []; }
// fenKey -> [{san, c(comment), line}]
function repBook(color){
  const ids=repCourses(color); if (!ids.length) return null; const book=new Map();
  for (const cid of ids){ const course=allCourses().find(c=>c.id===cid); if (!course) continue;
    for (const ch of course.chapters) for (const l of ch.lines){ const g=new Chess();
      for (const m of l.moves){ const k=fenKey(g.fen()); const arr=book.get(k)||[]; if (!arr.some(x=>x.san===m.s)) arr.push({san:m.s, c:m.c||"", line:l.id}); book.set(k,arr); if (!g.move(m.s)) break; } } }
  return book;
}
function repLines(){ return [...repCourses("w"), ...repCourses("b")].flatMap(cid=>{ const c=allCourses().find(x=>x.id===cid); return c?c.chapters.flatMap(ch=>ch.lines.map(l=>l.id)):[]; }); }
function nextRepLine(){ const ids=repLines(); return ids.find(id=>!S.lines[id] || !(S.lines[id].seen||S.lines[id].box)) || null; }
// after a game: first move where you left your repertoire becomes an exercise
function checkRepertoire(game){
  if (game.repChecked) return null; game.repChecked=true;
  const book=repBook(game.uc); if (!book || game.start) return null;
  const g=new Chess(); let ply=0;
  for (const s of game.sans){
    const fen=g.fen(); const opts=book.get(fenKey(fen)); const m=g.move(s,{sloppy:true}); if (!m) break;
    if (!opts || !opts.length) break;
    if (m.color===game.uc && !opts.some(o=>o.san===m.san)){
      const exp=new Chess(fen).move(opts[0].san); if (!exp) break;
      const id=game.id+"-book";
      if (!(S.mist||[]).some(x=>x.id===id)){
        const cw=game.an && game.an.cw ? game.an.cw[ply] : 0; const bcp = fen.split(" ")[1]==="w" ? cw : -cw;
        S.mist.push({id, gid:game.id, ply, fen, best:exp.from+exp.to+(exp.promotion||""), bcp, san:m.san, cat:"book", text:`Тук по твоя репертоар се играе ${opts.map(o=>o.san).join(" или ")}. ${opts[0].c||""}`.trim(), box:0, due:Date.now()});
      }
      return {ply, played:m.san, expected:opts.map(o=>o.san)};
    }
    ply++;
  }
  return null;
}

/* ============ the coach: a face and a voice ============ */
const COACH_AV = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#81b64c"/><path d="M0 20a20 20 0 0040 0z" fill="#6aa23a"/><path d="M13 31h15l-1.6-4.7c2.7-2.3 3.5-6.2 2.1-9.4-1.7-4.1-6.3-6.7-11-6.1l-3.6.5 2.3 2.7-4.5 5 1.6 2.7 4.8-1.6-3.2 4.6z" fill="#fff"/><circle cx="20.5" cy="15.2" r="1.2" fill="#3b5e20"/></svg>';
function coachBubble(){
  const txt=h("div",{class:"say"}); const av=h("span",{class:"cav"}); av.innerHTML=COACH_AV;
  const el=h("div",{class:"coachb",hidden:true}, av, txt);
  el.say=(t, tone)=>{ el.hidden=!t; txt.className="say"+(tone?" "+tone:""); txt.innerHTML=""; if (tone) txt.append(h("span",{class:"cbadge"}, {good:"✓",warn:"?!",bad:"!"}[tone]||"")); txt.append(document.createTextNode(t||"")); txt.animate && txt.animate([{opacity:.3,transform:"translateY(4px)"},{opacity:1,transform:"none"}],{duration:220}); };
  return el;
}
const PRAISE = {best:["Отличен ход!","Точно така, най-силното.","Браво, това е ходът."], exc:["Много добре.","Силен ход."], good:["Добър ход.","Разумно."]};
function praise(k){ const a=PRAISE[k]||PRAISE.good; return a[Math.floor(Math.random()*a.length)]; }
// free questions to the coach (Claude), with the position as context
function coachChat(getCtx){
  const out=h("div",{class:"coach"}); const inp=h("input",{type:"text",id:"askcoach",placeholder:"Например: защо не мога да взема пешката на e5?",style:"flex:1;min-width:0"});
  const btn=h("button",{class:"btn primary",onclick:ask},"Питай");
  const card=h("div",{class:"pcard",hidden:true}, h("div",{class:"row",style:"gap:10px"}, h("span",{class:"cav sm",html:COACH_AV}), h("span",{class:"eyebrow"},"Попитай треньора")), h("div",{class:"row",style:"flex-wrap:nowrap"},inp,btn), out);
  inp.addEventListener("keydown",e=>{ if (e.key==="Enter") ask(); });
  function ask(){ const q=inp.value.trim(); if (!q) return; coachInto(out, btn, `${getCtx()}\n\nВъпрос на ученика: "${q}". Отговори кратко (до 5 изречения), конкретно за позицията.`); inp.value=""; }
  getSample().then(s=>{ if (s) card.hidden=false; });
  return card;
}

/* ============ pieces & sounds ============ */
const PIECE_NAMES = {maestro:"Маестро", cburnett:"Класически", fresca:"Фреска", celtic:"Келтик", merida:"Мерида", alpha:"Алфа", california:"Калифорния"};
let piecesLoad=null;
function loadMorePieces(){ if (!piecesLoad) piecesLoad=new Promise(res=>{ const sc=document.createElement("script"); sc.src="pieces.js"; sc.onload=()=>res(true); sc.onerror=()=>{ piecesLoad=null; res(false); }; document.head.append(sc); }); return piecesLoad; }
function applyPieces(){
  let st=document.getElementById("pcs-style"); let set=S.set.pieces||"maestro"; if (!PIECE_NAMES[set]) set="maestro";
  if (typeof PIECE_SETS!=="undefined" && set!=="cburnett" && !PIECE_SETS[set]){ loadMorePieces().then(ok=>{ if (ok && PIECE_SETS[set]) applyPieces(); }); return; }
  if (set==="cburnett" || typeof PIECE_SETS==="undefined" || !PIECE_SETS[set]){ if (st) st.remove(); return; }
  if (!st){ st=document.createElement("style"); st.id="pcs-style"; document.head.append(st); }
  st.textContent=Object.entries(PIECE_SETS[set]).map(([p,b])=>`.pc.${p}{background-image:url("data:image/svg+xml;base64,${b}")}`).join("");
}
Sound.buf = {};
Sound.loadSamples = function(){
  if (this._loading || !this.ctx || typeof SND_DATA==="undefined") return; this._loading=true;
  Object.entries(SND_DATA).forEach(([k,b64])=>{ try { const bin=atob(b64); const u=new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); this.ctx.decodeAudioData(u.buffer, b=>{ this.buf[k]=b; }, ()=>{}); } catch(e){} });
};
