"use strict";
/* ============ icons ============ */
const IC = {
  back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  flame:'<svg viewBox="0 0 24 24"><path d="M12 21c-4 0-7-2.7-7-6.6 0-3.3 2.4-5.3 3.7-7.4.4 1.7 1.3 2.9 2.5 3.5C11.4 7 12.6 4.6 15 3c-.2 2.7.8 4.6 2.2 6.2 1.2 1.4 1.8 3 1.8 5.2 0 3.9-3 6.6-7 6.6z"/></svg>',
  bolt:'<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
  timer:'<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/></svg>',
  wrench:'<svg viewBox="0 0 24 24"><path d="M14.5 5.5a4 4 0 00-5.2 5.2L4 16l4 4 5.3-5.3a4 4 0 005.2-5.2l-2.6 2.6-2.6-.6-.6-2.6z"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M3 6.5C5.5 5 8.5 5 12 6.8 15.5 5 18.5 5 21 6.5V19c-2.5-1.4-5.5-1.4-9 .4-3.5-1.8-6.5-1.8-9-.4z"/><path d="M12 6.8v12.6"/></svg>',
  knight:'<svg viewBox="0 0 24 24"><path d="M7 20h11l-1.2-3.5c2-1.7 2.6-4.6 1.6-7-1.3-3.1-4.7-5-8.2-4.5l-2.7.4 1.7 2L5.4 12l1.2 2 3.6-1.2-2.4 3.4z"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  arrow:'<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
  medal:'<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="M8.5 10L5 3h5l2 4 2-4h5l-3.5 7"/></svg>',
};
Object.assign(IC, {
  cap:'<svg viewBox="0 0 24 24"><path d="M2 9.5L12 4l10 5.5-10 5.5z"/><path d="M6 11.7v4.8c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.8"/><path d="M22 9.5v6"/></svg>',
  puzzle:'<svg viewBox="0 0 24 24"><path d="M5 7a2 2 0 012-2h3a2.3 2.3 0 114 0h3a2 2 0 012 2v3a2.3 2.3 0 110 4v3a2 2 0 01-2 2h-3a2.3 2.3 0 10-4 0H7a2 2 0 01-2-2v-3a2.3 2.3 0 100-4z"/></svg>',
  trophy:'<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 01-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 007.5 11M17 6h3v1.5a3.5 3.5 0 01-3.5 3.5"/><path d="M12 14v3.5M8.5 20.5h7M9.5 17.5h5"/></svg>',
  calendar:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/></svg>',
  star:'<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
  chev:'<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  robot:'<svg viewBox="0 0 24 24"><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-3.8 4.2-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/></svg>',
  shield:'<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.8-3.3 8-8 9.5C7.3 20 4 16.8 4 12V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/></svg>',
  crown:'<svg viewBox="0 0 24 24"><path d="M3.5 8l4.5 4 4-6.5 4 6.5 4.5-4-1.8 10H5.3z"/><path d="M5.5 21h13"/></svg>',
  flag:'<svg viewBox="0 0 24 24"><path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/></svg>',
  brain:'<svg viewBox="0 0 24 24"><path d="M9.5 4.5a3 3 0 00-3 3v.3A3 3 0 004.5 13a3 3 0 002 4.6 3 3 0 005.5.9V5.6a3 3 0 00-2.5-1.1zM14.5 4.5a3 3 0 013 3v.3a3 3 0 012 5.2 3 3 0 01-2 4.6 3 3 0 01-5.5.9"/></svg>',
});
function icon(k){ const s=document.createElement("span"); s.style.display="contents"; s.innerHTML=IC[k]||""; return s.firstChild; }

/* ============ settings & sound ============ */
const BOARDS = {green:["#ebecd0","#739552","Зелена"], wood:["#f0d9b5","#b58863","Дърво"], blue:["#dee3e6","#8ca2ad","Синя"], stone:["#e6e3dc","#9a958b","Камък"]};
function applySettings(){ const b=BOARDS[S.set.board]||BOARDS.green; const r=document.documentElement; r.style.setProperty("--sq-l",b[0]); r.style.setProperty("--sq-d",b[1]); }
const Sound = {
  ctx:null,
  unlock(){ try { if (!this.ctx){ const AC=window.AudioContext||window.webkitAudioContext; if (!AC) return; this.ctx=new AC(); } if (this.ctx.state==="suspended") this.ctx.resume(); this.loadSamples && this.loadSamples(); } catch(e){} },
  play(k){
    if (!S.set || !S.set.sound) return; const c=this.ctx; if (!c || c.state!=="running") return;
    try {
      const t=c.currentTime;
      const tone=(f,d,type,v,at=0)=>{ const o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f,t+at); g.gain.setValueAtTime(.0001,t+at); g.gain.exponentialRampToValueAtTime(v,t+at+.01); g.gain.exponentialRampToValueAtTime(.0001,t+at+d); o.connect(g); g.connect(c.destination); o.start(t+at); o.stop(t+at+d+.03); };
      const knock=(v,at,f)=>{ const n=Math.floor(c.sampleRate*.045); const b=c.createBuffer(1,n,c.sampleRate); const d=b.getChannelData(0); for (let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,5); const s=c.createBufferSource(); s.buffer=b; const bp=c.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=f; bp.Q.value=1.4; const g=c.createGain(); g.gain.value=v; s.connect(bp); bp.connect(g); g.connect(c.destination); s.start(t+at); };
      const smp = k==="check" ? "move" : k; const B=this.buf && this.buf[smp];
      if (B){ const s=c.createBufferSource(); s.buffer=B; const g=c.createGain(); g.gain.value=k==="win"?.55:.9; s.connect(g); g.connect(c.destination); s.start(); if (k==="check") tone(784,.16,"triangle",.05,.03); return; }
      if (k==="move"){ knock(1.4,0,1050); tone(170,.07,"sine",.06); }
      else if (k==="capture"){ knock(1.6,0,850); knock(1.1,.04,1500); tone(140,.08,"sine",.06); }
      else if (k==="check"){ knock(1.3,0,1050); tone(784,.14,"triangle",.07,.02); }
      else if (k==="good"){ tone(659,.14,"sine",.09); tone(988,.22,"sine",.09,.1); }
      else if (k==="bad"){ tone(220,.16,"triangle",.09); tone(165,.22,"triangle",.07,.09); }
      else if (k==="win"){ [523,659,784,1047].forEach((f,i)=>tone(f,.26,"sine",.08,i*.09)); }
    } catch(e){}
  }
};
document.addEventListener("pointerdown", ()=>Sound.unlock(), {passive:true});
document.addEventListener("keydown", ()=>Sound.unlock());

/* ============ small UI helpers ============ */
// a bright "app icon" square with a white glyph
function tico(name, grad, size){ return h("span",{class:"tico g-"+(grad||"green")+(size?" "+size:""),"aria-hidden":"true"}, icon(name)); }
function resultArt(name, grad){ return h("div",{class:"rart g-"+(grad||"gold"),"aria-hidden":"true"}, icon(name)); }
// a small board picture (not interactive)
function miniBoard(fen, orient){ const el=h("div",{class:"mini"}); const b=new Board(el,{orientation:orient||"w"}); b.el.classList.add("mini"); b.el.tabIndex=-1; b.setFen(fen,null); return el; }
// the coloured band at the top of a training sidebar: whose move and what to do; .set("ok"|"fail"|"", title, sub)
function phead(color, title, sub){
  const b=h("b",null,title), sm=h("small",null,sub||""); const el=h("div",{class:"phead"}, h("span",{class:"pico"}, h("i",{class:"pc "+color+"K"})), h("div",{class:"grow"}, b, sm));
  el.set=(state, t, st)=>{ el.className="phead"+(state?" "+state:""); if (t!=null) b.textContent=t; if (st!=null) sm.textContent=st; };
  return el;
}
function setStatus(el, kind, text){ el.className="status"+(kind&&kind!=="info"?" "+kind:""); el.textContent=text; }
function topbar(title, back, extra){
  return h("div",{class:"topbar"},
    h("button",{class:"iconbtn","aria-label":"Назад",onclick:()=>go(back||"home")}, icon(back==="home"||!back?"close":"back")),
    extra ? null : h("div",{class:"ttl grow"},title),
    extra || null);
}
function progressTop(back, label){
  const bar=h("div",{class:"pbar"},h("i")); const cnt=h("span",{class:"pcount"});
  const el=h("div",{class:"topbar"}, h("button",{class:"iconbtn","aria-label":"Затвори",onclick:()=>go(back||"home")}, icon("close")), label?h("span",{class:"ttl",style:"max-width:30%"},label):null, bar, cnt);
  el.set=(i,n)=>{ bar.firstChild.style.width=Math.round(Math.min(1,i/n)*100)+"%"; cnt.textContent = n ? `${Math.min(i+1,n)}/${n}` : ""; };
  el.done=()=>{ bar.firstChild.style.width="100%"; cnt.textContent=""; };
  return el;
}
function trainLayout(boardCol, panel){ return h("div",{class:"train"}, h("div",{class:"bcol"},boardCol), h("div",{class:"panel"},panel)); }
function sideName2(c){ return c==="w"?"Белите":"Черните"; }
function prompt(color, text){ return h("div",{class:"prompt"}, h("span",{class:"dot "+color}), text); }
function boardMark(board, sq, good){ const d=board.sq[sq]; if (!d) return; d.querySelectorAll(".mark-ok").forEach(x=>x.remove()); const m=h("span",{class:"mark-ok "+(good?"good":"bad")}, good?"✓":"✕"); d.append(m); }
function starsEl(n, max=3){ return h("span",{class:"stars","aria-label":`${n} от ${max} звезди`}, [...Array(max)].map((_,i)=>h("span",{class:i<n?"":"off"},"★"))); }
function plural(n, one, many){ return n===1 ? one : many; }

/* ============ puzzles: data, picking, rating ============ */
let PZ=null, pzLoad=null;
const META_T = new Set(["short","long","opening","middlegame","endgame"]);
function loadPuzzles(){ if (!pzLoad) pzLoad = fetch("puzzles.json").then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(d=>{ PZ=d; return d; }).catch(e=>{ pzLoad=null; throw e; }); return pzLoad; }
// pick a puzzle for a theme ("mix" = any, "failed" = earlier misses) near a target rating, avoiding ids in `avoid`
function pickPuzzle(mode, o={}){
  const target = o.target!=null ? o.target : S.puz.rating; const hist=S.puz.hist; const avoid=o.avoid||new Set();
  if (mode==="failed"){
    const pool=PZ.p.filter(p=>hist[p[0]] && hist[p[0]][0]===0 && !avoid.has(p[0])); return pool.length? pool[Math.floor(Math.random()*pool.length)] : null;
  }
  let pool=PZ.p;
  if (mode && mode!=="mix"){ const ti=PZ.themes.indexOf(mode); if (ti<0) return null; pool=pool.filter(p=>p[4].includes(ti)); }
  if (o.maxLen) pool=pool.filter(p=>p[2].split(" ").length<=o.maxLen);
  pool=pool.filter(p=>!avoid.has(p[0]));
  for (const w of [100,200,350,600,3000]){
    const c=pool.filter(p=>Math.abs(p[3]-target)<=w && !hist[p[0]]);
    if (c.length>=4 || w===3000){ if (c.length) return c[Math.floor(Math.random()*c.length)]; break; }
  }
  if (!pool.length) return null;
  return pool.slice().sort((a,b)=>Math.abs(a[3]-target)-Math.abs(b[3]-target))[Math.floor(Math.random()*Math.min(6,pool.length))];
}
function ratePuzzle(pid, rating, themes, score, noRating){
  const r=S.puz.rating, E=1/(1+Math.pow(10,(rating-r)/400)); const K = S.puz.n<20 ? 40 : 24;
  if (!noRating) S.puz.rating = Math.max(400, r + K*(score-E)); S.puz.n++; if (score===1) S.puz.ok++;
  themes.map(i=>PZ.themes[i]).forEach(t=>{ const a=S.puz.theme[t]||[0,0]; a[1]++; if (score===1) a[0]++; S.puz.theme[t]=a; });
  S.puz.hist[pid]=[score===1?1:0, Date.now()];
  tmRecord(themes.map(i=>PZ.themes[i]), score); rqRecord(pid, score);
  const keys=Object.keys(S.puz.hist); if (keys.length>4000){ for (const k of keys) if (S.puz.hist[k][0]===1){ delete S.puz.hist[k]; if (Object.keys(S.puz.hist).length<=3500) break; } }
  const d=today(), rh=S.puz.rh; if (rh.length && rh[rh.length-1].d===d) rh[rh.length-1].r=Math.round(S.puz.rating); else rh.push({d, r:Math.round(S.puz.rating)}); if (rh.length>120) rh.shift();
  bump("puz"); markDay(); save();
  return Math.round(S.puz.rating-r);
}

/* ============ task: one puzzle ============ */
// o: {label, showTheme, rated(default true), onResult(score), onNext(), nextLabel, auto (storm: advance by itself), quick}
function mountPuzzle(host, pz, o={}){
  const [pid,fen,movesStr,rating,themes]=pz; const sol=movesStr.split(" ");
  const game=new Chess(fen); const uc = game.turn()==="w" ? "b" : "w";
  let idx=0, result=null, hinted=false, last=null, retry=false, tStart=0, firstDt=null;
  const bel=h("div"); const board=new Board(bel,{orientation:uc}); bel.dataset.sol=movesStr;
  const status=h("div",{class:"status"},"Гледай хода на противника...");
  const names=themes.map(i=>PZ.themes[i]).filter(t=>!META_T.has(t)).map(t=>THEME_BG[t]||t).slice(0,3);
  const chips=h("div",{class:"chips"}); const showThemes=()=>{ chips.innerHTML=""; names.forEach(t=>chips.append(h("span",{class:"chip"},t))); };
  if (o.showTheme) showThemes();
  const ratingEl=h("span",{class:"chip"},"Пъзел "+rating);
  const head=phead(uc, `${sideName2(uc)} са на ход`, "Намери най-силното продължение");
  const actions=h("div",{class:"actions"});
  const after=h("div",{class:"stack"});
  // "think first": three questions before the board unlocks
  const think = !o.auto && o.think!==false && thinkModeOn();
  const gate=h("div",{class:"think",hidden:true});
  if (think){ const qs=[["Шахове","Има ли шах за мен или за него?"],["Взимания","Какво може да се вземе?"],["Заплахи","Какво заплашва всяка страна?"]]; let n=0;
    gate.append(h("span",{class:"eyebrow"},"Преди да местиш, провери"), h("div",{class:"tq"}, qs.map(([t,d])=>h("button",{class:"tqb",title:d,onclick:(e)=>{ const b=e.currentTarget; if (b.classList.contains("on")) return; b.classList.add("on"); b.setAttribute("aria-pressed","true"); n++; if (n===3) unlock(); }}, h("b",null,t), h("small",null,d)))),
      h("button",{class:"btn ghost sm",style:"align-self:flex-start",onclick:()=>unlock()},"Пропусни този път")); }
  function unlock(){ gate.hidden=true; board.o.movable=uc; tStart=Date.now(); setStatus(status,"info","Твой ход."); }
  const btnHint=h("button",{class:"btn",onclick:()=>{ if (result!=null&&!retry) return; const u=sol[idx]; if (!u) return; hinted=true; board.mark([u.slice(0,2)]); setStatus(status,"warn","Подсказка: ходът е с фигурата на маркираното поле."); }}, icon("eye"), "Подсказка");
  const btnSol=h("button",{class:"btn ghost",onclick:()=>showSolution()},"Решение");
  if (!o.auto) actions.append(btnHint, btnSol);
  function applyUci(u){ const m=game.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}); last={from:m.from,to:m.to}; sync(board,game,last); return m; }
  function finish(score){
    if (result!=null) return; result=score;
    let delta=null; if (o.rated!==false) delta=ratePuzzle(pid, rating, themes, score); else if (o.track) ratePuzzle(pid, rating, themes, score, true);
    if (o.xp!==false && score>0) award(o.xpAmt || (score===1?10:5), !!o.auto);
    o.onResult && o.onResult(score);
    showThemes(); btnHint.disabled=true;
    if (score<1 && !o.auto){ const tt=themes.map(i=>PZ.themes[i]).find(t=>THEME_TIPS[t]); if (tt){ const lid=THEME_LESSON[tt];
      after.append(h("div",{class:"pcard tip"}, h("span",{class:"eyebrow"},"Съвет · "+(THEME_BG[tt]||tt)), h("p",{class:"comment"},THEME_TIPS[tt]), lid && !o.inLesson ? h("button",{class:"btn sm",style:"align-self:flex-start",onclick:()=>go("lesson--"+lid)},"Урок: "+LESSON_BY_ID[lid].title) : null)); } }
    if (o.auto){ board.o.movable=null; setTimeout(()=>o.onNext && o.onNext(score), score===1?420:900); return; }
    if (delta!=null) ratingEl.textContent=`Рейтинг ${Math.round(S.puz.rating)} (${delta>=0?"+":""}${delta})`;
    const next=h("button",{class:"btn primary big block",onclick:()=>o.onNext && o.onNext(score)}, o.nextLabel||"Напред", icon("arrow"));
    actions.innerHTML=""; actions.append(next);
    if (score!==1 && sol.length>idx){ btnSol.className="btn"; actions.prepend(btnSol); }
    after.append(coachCard(()=>`Ученикът решава тактически пъзел. Начална позиция (FEN): ${fen}. Противникът изигра ${pvToSan(fen,[sol[0]],1)[0]}, правилното решение е: ${sanLine(new Chess(fen).fen(), pvToSan(fen, sol, 20))}. Теми: ${names.join(", ")}. Ученикът ${score===1?"го реши":"не го реши"}. Обясни как да се ВИДИ този удар: кои признаци в позицията подсказват тактиката и какъв мисловен навик да си изгради.`, "Как да видя този удар?"));
  }
  async function showSolution(){
    if (result==null){ finish(0); head.set("fail","Решението","Гледай внимателно"); }
    board.o.movable=null; btnSol.disabled=true; board.mark([]);
    while (idx<sol.length && host.isConnected){ await sleep(650); applyUci(sol[idx]); idx++; }
    setStatus(status,"info","Това е решението. Разгледай го спокойно.");
  }
  playable(board, game, uc, async mv=>{
    if (result!=null && !retry) return;
    const u=sol[idx]; const uci=mv.from+mv.to+(mv.promotion||"");
    const tmp=new Chess(game.fen()); const tm=tmp.move(mv); if (!tm) return;
    const isMate = tmp.in_checkmate();
    if (idx===1 && firstDt==null && tStart) firstDt=Date.now()-tStart;
    const fast = firstDt!=null && firstDt<6000;
    if (uci===u || isMate){
      applyUci(isMate?uciOf(tm):u); idx++; board.mark([]);
      if (idx>=sol.length || isMate){
        boardMark(board, tm.to, true); Sound.play("good"); if (!retry) head.set("ok", hinted?"Решено с подсказка":"Решено!", "Точно така");
        setStatus(status,"good", retry ? "Да, това е решението." : hinted ? "Решено с подсказка." : "Решено! Точно така.");
        board.o.movable=null; if (retry){ retry=false; return; }
        if (!o.auto && result==null && firstDt!=null) thinkRecord(fast, true);
        finish(hinted?0.5:1); return;
      }
      setStatus(status,"good","Добре! Продължи...");
      await sleep(o.quick?300:480); if (!host.isConnected) return; applyUci(sol[idx]); idx++;
      setStatus(status,"info","Твой ход. Довърши удара.");
    } else {
      board.setFen(game.fen(), last); board.flashBad(mv.to); Sound.play("bad"); if (result==null) head.set("fail","Не е това", `${tm.san} не е най-силното`);
      setStatus(status,"bad",`${tm.san} не е най-силното. `+(o.auto?"":(fast&&result==null?`Изигра го за ${Math.max(1,Math.round(firstDt/1000))} сек. Не бързай: провери шахове, взимания и заплахи.`:"Виж решението или опитай пак.")));
      if (result==null && !o.auto && firstDt!=null) thinkRecord(fast, false);
      if (result==null){
        finish(0);
        if (!o.auto){ board.o.movable=null; actions.prepend(h("button",{class:"btn",onclick:(e)=>{ retry=true; setStatus(status,"info","Опитай пак. Резултатът вече е отчетен."); board.o.movable=uc; e.currentTarget.remove(); }},"Опитай пак")); }
      } else if (retry){ board.o.movable=uc; }
    }
  });
  host.append(trainLayout(
    [bel],
    [h("div",{class:"pcard"},
      head,
      h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"eyebrow"},o.label||"Пъзел"), ratingEl),
      status, gate, chips, actions),
     after]));
  sync(board,game,null,false);
  setTimeout(()=>{ if (!host.isConnected) return; applyUci(sol[0]); idx=1; if (think){ board.o.movable=null; gate.hidden=false; setStatus(status,"info","Огледай позицията. Какво се промени с последния ход?"); } else { tStart=Date.now(); setStatus(status,"info","Твой ход."); } }, o.quick?350:700);
  return {board};
}

/* ============ task: play an opening line from memory ============ */
// o: {label, quiz, onResult(mistakes), onNext(), nextLabel, extraButtons}
function mountDrill(host, id, o={}){
  const f=findLine(id); if (!f){ host.append(h("div",{class:"card empty"},"Линията не е намерена.")); return; }
  const {line, side, course} = f; const userColor = side==="both" ? "w" : side;
  const game=new Chess(); let ply=0, mistakes=0, wrongHere=0, hintLvl=0, finished=false, last=null, missed=false;
  const miss=()=>{ if (!missed){ missed=true; mistakes++; } };
  const bel=h("div"); const board=new Board(bel,{orientation:userColor});
  const status=h("div",{class:"status"}); const comment=h("div",{class:"comment"},"");
  const dots=h("div",{class:"pdots"}, line.moves.map(()=>h("i")));
  const dhead=phead(userColor, line.name, `Играеш с ${sideName(userColor)} · по памет`);
  const ideaCard=h("div",{class:"pcard",hidden:true}, h("span",{class:"eyebrow"},"Идеята на хода"), comment);
  const actions=h("div",{class:"actions"}); const after=h("div",{class:"stack"});
  const hintBtn=h("button",{class:"btn",onclick:hint}, icon("eye"), "Подсказка"); actions.append(hintBtn);
  const setDot=(i,cls)=>{ const d=dots.children[i]; if (d) d.className=cls; };
  const expected=()=>line.moves[ply];
  function hint(){
    if (finished) return; const m=expected(); if (!m) return;
    const g2=new Chess(game.fen()); const mv=g2.move(m.s); if (!mv) return;
    hintLvl++;
    if (hintLvl===1){ board.mark([mv.from]); setStatus(status,"warn","Коя фигура? Маркирано е полето, от което тръгва."); }
    else { board.arrows([{from:mv.from,to:mv.to,color:"rgba(200,140,20,.9)"}]); setStatus(status,"warn",`Ходът е ${m.s}.`); }
    miss();
  }
  async function autoOpponent(){
    while (!finished && ply<line.moves.length && game.turn()!==userColor){
      await sleep(480); if (finished || !host.isConnected) return;
      const m=line.moves[ply]; const r=game.move(m.s); last={from:r.from,to:r.to}; sync(board,game,last); setDot(ply,"ok"); ply++;
      if (m.c){ comment.textContent=m.c; ideaCard.hidden=false; }
    }
    if (ply>=line.moves.length) return done();
    setDot(ply,"cur"); setStatus(status,"info", ply===0 ? `Ти си с ${sideName(userColor)}. Твой ход.` : "Твой ход. Кой е следващият ход по линията?");
  }
  playable(board, game, userColor, async mv=>{
    if (finished) return;
    const exp=expected(); const g2=new Chess(game.fen()); const em=g2.move(exp.s);
    const ok = em && em.from===mv.from && em.to===mv.to && (!em.promotion || em.promotion===(mv.promotion||"q"));
    if (!ok){
      const tmp=new Chess(game.fen()); const tried=tmp.move(mv);
      board.setFen(game.fen(), last); board.flashBad(mv.to); Sound.play("bad"); wrongHere++; miss();
      setStatus(status,"bad",`${tried?tried.san:"Този ход"} не е по линията. Опитай пак.`);
      if (wrongHere>=2 && hintLvl<1) hint();
      return;
    }
    const r=game.move(exp.s); last={from:r.from,to:r.to}; board.arrows([]); board.mark([]); sync(board,game,last);
    setDot(ply,(wrongHere||hintLvl)?"bad":"ok"); ply++; wrongHere=0; hintLvl=0; missed=false;
    comment.textContent=exp.c||""; ideaCard.hidden=!exp.c; setStatus(status,"good","Вярно.");
    autoOpponent();
  });
  function done(){
    finished=true; board.o.movable=null; hintBtn.disabled=true;
    recordDrill(id, mistakes); award(mistakes?4:10); dhead.set(mistakes?"fail":"ok", mistakes?`${mistakes} ${plural(mistakes,"грешка","грешки")}`:"Чисто!", line.name);
    Sound.play(mistakes?"move":"good");
    setStatus(status, mistakes?"warn":"good", mistakes===0 ? "Чисто! Линията отива на по-дълъг интервал." : mistakes===1 ? "Една грешка. Линията ще се върне скоро." : `${mistakes} грешки. Ще я повторим след малко.`);
    o.onResult && o.onResult(mistakes);
    if (o.quiz) (line.quiz||[]).forEach(q=>after.append(quizCard(q)));
    actions.innerHTML="";
    actions.append(h("button",{class:"btn primary big block",onclick:()=>o.onNext && o.onNext(mistakes)}, o.nextLabel||"Напред", icon("arrow")));
    (o.extraButtons||[]).forEach(b=>after.append(b));
  }
  host.append(trainLayout([bel],[
    h("div",{class:"pcard"},
      dhead,
      h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"eyebrow"},o.label||course.name), dots),
      status, actions),
    ideaCard,
    after]));
  sync(board,game,null,false); autoOpponent();
}

/* ============ task: walk through a line with explanations ============ */
function mountStudy(host, id, o={}){
  const f=findLine(id); if (!f){ host.append(h("div",{class:"card empty"},"Линията не е намерена.")); return; }
  const {line, side} = f; let ply=0;
  const g=new Chess(); const fens=[g.fen()]; const lasts=[null];
  for (const m of line.moves){ const r=g.move(m.s); fens.push(g.fen()); lasts.push(r?{from:r.from,to:r.to}:null); }
  const bel=h("div"); const board=new Board(bel,{orientation:side==="both"?"w":side});
  const comment=h("div",{class:"comment"}); const movesEl=h("div",{class:"moves"}); const counter=h("span",{class:"pcount"});
  const btnPrev=h("button",{class:"btn","aria-label":"Назад",onclick:()=>{ if (ply>0){ ply--; show(false); } }}, icon("back"));
  const btnNext=h("button",{class:"btn primary",style:"flex:3",onclick:()=>{ if (ply<line.moves.length){ ply++; show(true); } else o.onDone && o.onDone(); }},"Напред");
  function show(anim){
    const gg=new Chess(fens[ply]); board.setCheck(gg.in_check()); board.setFen(fens[ply], lasts[ply], {anim});
    if (ply===0) comment.textContent = line.intro || `Играеш с ${sideName(side==="both"?"w":side)}. Натискай „Напред“, за да видиш линията ход по ход.`;
    else { const m=line.moves[ply-1]; comment.innerHTML=""; comment.append(h("b",{class:"mono"}, `${Math.ceil(ply/2)}${ply%2?".":"..."} ${m.s}`), document.createTextNode(m.c ? "  "+m.c : "  Продължаваме.")); }
    counter.textContent=`${ply}/${line.moves.length}`;
    [...movesEl.querySelectorAll("button")].forEach(b=>b.classList.toggle("cur", +b.dataset.i===ply));
    btnPrev.disabled = ply===0;
    btnNext.textContent = ply===line.moves.length ? (o.doneLabel||"Изиграй я по памет") : "Напред";
    if (ply===line.moves.length){ const st=S.lines[id]||{box:0,due:0}; if (!st.seen){ st.seen=true; S.lines[id]=st; save(); } }
  }
  line.moves.forEach((m,i)=>{ if (i%2===0) movesEl.append(h("span",{class:"n"},(i/2+1)+".")); movesEl.append(h("button",{"data-i":i+1,onclick:()=>{ ply=i+1; show(false); }},m.s)); });
  const key=e=>{ if (e.target.closest("input,textarea,select")) return; if (e.key==="ArrowRight") btnNext.click(); if (e.key==="ArrowLeft") btnPrev.click(); };
  document.addEventListener("keydown",key); onLeave(()=>document.removeEventListener("keydown",key));
  host.append(trainLayout([bel],[
    h("div",{class:"pcard"},
      h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"eyebrow"},f.chapter.name), counter),
      h("h2",null,line.name), comment, h("div",{class:"actions"},btnPrev,btnNext)),
    h("div",{class:"pcard"}, movesEl),
    coachCard(()=>`Ученикът учи дебютната линия „${line.name}“ (${f.course.name}), играе с ${sideName(side==="both"?"w":side)}. Позиция FEN: ${fens[ply]}. Изиграни ходове: ${sanLine(new Chess().fen(), line.moves.slice(0,ply).map(m=>m.s))}. Обясни идеята на последния ход и типичния план оттук. Спомени 1 типична грешка.`, "Обясни по-подробно")]));
  show(false);
}

/* ============ task: a mistake from your own games ============ */
function mountFix(host, card, o={}){
  const game=new Chess(card.fen); const me=game.turn(); let done=false, tries=0;
  const bel=h("div"); const board=new Board(bel,{orientation:me});
  const status=h("div",{class:"status"},"Намери по-добрия ход.");
  const why=h("div",{class:"comment",hidden:true},card.text);
  const actions=h("div",{class:"actions"});
  const bestSan=pvToSan(card.fen,[card.best],1)[0];
  const fhead=phead(me, "Твоя позиция", "Намери по-добрия ход");
  function grade(ok){
    done=true; board.o.movable=null;
    if (ok && tries===0){ card.box=Math.min((card.box||0)+1, INTERVALS.length-1); card.due=Date.now()+INTERVALS[card.box]*DAY-3600e3; }
    else { card.box=0; card.due=Date.now()+10*60e3; }
    fhead.set(ok?"ok":"fail", ok?"Поправено!":"Ще се върне", ok?"Този път го видя":"Упражнението ще дойде пак");
    bump("fix"); S.cnt.fix=(S.cnt.fix||0)+1; markDay(); save(); why.hidden=false; award(ok&&tries===0?15:5);
    o.onResult && o.onResult(ok && tries===0 ? 1 : 0);
    actions.innerHTML=""; actions.append(h("button",{class:"btn primary big block",onclick:()=>o.onNext && o.onNext()}, o.nextLabel||"Напред", icon("arrow")));
  }
  playable(board, game, me, async mv=>{
    if (done) return;
    const tmp=new Chess(card.fen); const tm=tmp.move(mv); if (!tm) return;
    if (uciOf(tm)===card.best || tmp.in_checkmate()){ board.setFen(tmp.fen(),{from:tm.from,to:tm.to},{anim:false}); boardMark(board,tm.to,true); Sound.play("good"); setStatus(status,"good", tries? "Да, това е ходът." : "Точно така! Този път го видя."); grade(true); return; }
    setStatus(status,"info","Проверявам хода..."); board.o.movable=null;
    const r=await Engine.analyse(tmp.fen(),{depth:15,movetime:600}); if (!r || !host.isConnected) return;
    const loss=winPct(card.bcp)-winPct(-scoreOf(r.top));
    if (loss<6){ board.setFen(tmp.fen(),{from:tm.from,to:tm.to}); boardMark(board,tm.to,true); Sound.play("good"); setStatus(status,"good",`Добър ход! ${tm.san} е почти толкова силен, колкото ${bestSan}.`); grade(true); return; }
    tries++; board.setFen(card.fen,null); board.flashBad(tm.to); Sound.play("bad"); board.o.movable=me;
    setStatus(status,"bad",`${tm.san} не е достатъчно добър. Опитай пак.`);
    if (tries>=2){ board.arrows([{from:card.best.slice(0,2),to:card.best.slice(2,4),color:"rgba(40,150,90,.9)"}]); setStatus(status,"info",`Най-добрият ход е ${bestSan}.`); grade(false); }
  });
  actions.append(
    h("button",{class:"btn",onclick:(e)=>{ if (done) return; const b=e.currentTarget; if (!b.dataset.n){ b.dataset.n="1"; board.mark([card.best.slice(0,2)]); setStatus(status,"warn","Подсказка: ходът е с фигурата на маркираното поле."); } else why.hidden=false; }}, icon("eye"), "Подсказка"),
    h("button",{class:"btn ghost",onclick:()=>{ if (done) return; tries=2; board.arrows([{from:card.best.slice(0,2),to:card.best.slice(2,4),color:"rgba(40,150,90,.9)"}]); setStatus(status,"info",`Най-добрият ход е ${bestSan}.`); grade(false); }},"Покажи"));
  host.append(trainLayout([bel],[
    h("div",{class:"pcard"},
      fhead,
      h("span",{class:"eyebrow"},o.label||"Грешка от твоя партия"),
      h("p",{class:"muted small"},`В партията изигра ${card.san}${CAT_LABEL[card.cat]?" ("+CAT_LABEL[card.cat].toLowerCase()+")":""}.`),
      status, actions),
    h("div",{class:"pcard"}, h("span",{class:"eyebrow"},"Защо ходът в партията беше грешка"), why, h("span",{class:"muted small"},"Показва се след опита."))]));
  sync(board,game,null,false);
}

function quizCard(q, onAnswer){
  const exp=h("div",{class:"muted",hidden:true});
  const opts=q.o.map((t,i)=>h("button",{class:"opt",onclick:()=>{
    if (card.dataset.done) return; card.dataset.done="1";
    opts.forEach((b,j)=>{ if (j===q.a) b.classList.add("right"); else if (j===i) b.classList.add("wrong"); });
    Sound.play(i===q.a?"good":"bad");
    exp.hidden=false; exp.textContent=(i===q.a?"Вярно. ":"Не точно. ")+q.w; onAnswer && onAnswer(i===q.a);
  }},t));
  const card=h("div",{class:"pcard quiz"}, h("span",{class:"eyebrow"},"Въпрос"), h("strong",{style:"color:var(--ink)"},q.q), h("div",null,opts), exp);
  return card;
}

/* ============ a run of tasks with one progress bar ============ */
// cfg: {back, label, steps:[...], render(step, host, next(result)), finish(results, host)}
function runSeq(app, cfg){
  let i=cfg.start||0; const results=cfg.results||[]; const top=progressTop(cfg.back, cfg.label); const host=h("div");
  app.append(top, host);
  function show(){
    host.innerHTML=""; Engine.cancel();
    if (i>=cfg.steps.length){ top.done(); cfg.finish(results, host); return; }
    top.set(i, cfg.steps.length);
    const slot=h("div"); host.append(slot);
    cfg.render(cfg.steps[i], slot, res=>{ results.push({step:cfg.steps[i], res}); i++; cfg.onStep && cfg.onStep(i, results); show(); window.scrollTo(0,0); });
  }
  show();
}
