"use strict";
/* ============ play with the coach ============ */
const STRICT = [{v:0,l:"Изключен"},{v:30,l:"Само груби грешки"},{v:20,l:"Грешки"},{v:12,l:"И неточности"}];
function lossLabel(l){ return l>=25 ? "Груба грешка" : l>=12 ? "Грешка" : "Неточност"; }
function vPlay(app, courseId){
  const course = courseId ? allCourses().find(c=>c.id===courseId) : null;
  let book = null; let times=[], tTurn=0, lastUserEval=null;
  const coach=coachBubble();
  let userColor = course ? course.side : (S.play.color || "w");
  let level = Math.min(S.play.level ?? 2, LEVELS.length-1);
  if (S.play.strict==null) S.play.strict = 20;
  let showEval = !!S.play.showEval;
  const game=new Chess(); let last=null, pre=null, busy=false, over=false, preJob=0, stops=0;
  let tipsShown=new Set();
  const bel=h("div"); const board=new Board(bel,{orientation:userColor});
  const status=h("div",{class:"status"}); const movesEl=h("div",{class:"moves"});
  const alertBox=h("div",{class:"stack"}); const tipBox=h("div");
  const evalBar=h("div",{class:"evalbar"},h("i",{style:"width:50%"})); const evalTxt=h("span",{class:"mono muted small"}); const evalRow=h("div",{class:"row",hidden:!showEval},evalBar,evalTxt);
  const lvlSel=h("select",{id:"lvl",onchange:()=>{ level=+lvlSel.value; S.play.level=level; save(); oppName.textContent=LEVELS[level].name+" "+LEVELS[level].elo; }}, LEVELS.map((l,i)=>h("option",{value:i,selected:i===level},`${l.name} (${l.elo})`)));
  const strictSel=h("select",{id:"strict",onchange:()=>{ S.play.strict=+strictSel.value; save(); }}, STRICT.map(o=>h("option",{value:o.v,selected:o.v===S.play.strict},o.l)));
  const colorSeg=h("div",{class:"seg"}, ["w","b"].map(c=>h("button",{"aria-pressed":String(userColor===c),"data-c":c,onclick:()=>{ if (course) return; userColor=c; S.play.color=c; save(); colorSeg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.c===c))); youDot.className="dot "+c; oppDot.className="dot "+(c==="w"?"b":"w"); newGame(); }}, c==="w"?"Бели":"Черни")));
  const evalChk=h("input",{type:"checkbox",id:"evalchk",checked:showEval,onchange:()=>{ showEval=evalChk.checked; S.play.showEval=showEval; save(); evalRow.hidden=!showEval; }});
  const engineMsg=h("div",{class:"status"},"Зареждам Stockfish...");
  const oppName=h("span",null,LEVELS[level].name+" "+LEVELS[level].elo);
  const youDot=h("span",{class:"dot "+userColor}), oppDot=h("span",{class:"dot "+(userColor==="w"?"b":"w")});
  const suggest=h("div");
  function renderMoves(){ movesEl.innerHTML=""; game.history().forEach((s,i)=>{ if (i%2===0) movesEl.append(h("span",{class:"n"},(i/2+1)+".")); movesEl.append(h("span",null,s)); }); movesEl.scrollTop=movesEl.scrollHeight; }
  function setEval(cpWhite){ evalBar.firstChild.style.width=Math.max(4,Math.min(96,50+cpWhite/12))+"%"; evalTxt.textContent=fmtEval(cpWhite); }
  function userMoveNo(){ return game.history().filter((_,i)=>(i%2===0)===(userColor==="w")).length; }
  function tip(key){ if (tipsShown.has(key)) return; tipsShown.add(key); const hb=HABITS[key]; tipBox.innerHTML=""; tipBox.append(h("div",{class:"status warn small"}, h("b",null,"Съвет: "), hb.t+". "+hb.fix)); }
  function liveHabits(m){
    const n=userMoveNo();
    if (n<=5 && m.piece==="q" && !m.captured) tip("earlyQueen");
    if (n<=8 && m.piece==="p" && !m.captured && ((userColor==="w"&&(m.to==="f3"||m.to==="g4"))||(userColor==="b"&&(m.to==="f6"||m.to==="g5")))) tip("weakKing");
    if (n<=12 && m.piece==="k" && !m.flags.includes("k") && !m.flags.includes("q")) tip("kingWalk");
    if (n===10){ const g=grid(game.fen()); const [r,f]=sqRF(userColor==="w"?"e1":"e8"); const k=g[r][f]; if (k&&k.t==="k"&&k.c===userColor) tip("lateCastle"); }
  }
  function finish(res, reason){
    if (game.history().length<4){ setStatus(status,"info","Партията е твърде кратка за анализ."); return; }
    over=true; board.o.movable=null;
    const g={id:"g"+Date.now().toString(36), date:Date.now(), src:"bot", name:`${LEVELS[level].name} (${LEVELS[level].elo})`, uc:userColor, res, reason:reason||"", lvl:level, sans:game.history(), stops, times:times.slice()};
    S.play.games=(S.play.games||0)+1; bump("games"); saveGame(g); go("game--"+g.id);
  }
  function checkOver(){
    if (!game.game_over()) return false;
    over=true; board.o.movable=null;
    let res="1/2-1/2", t="Реми.";
    if (game.in_checkmate()){ const loser=game.turn(); res = loser==="w"?"0-1":"1-0"; t = loser===userColor ? "Мат. Тази партия е загубена." : "Мат! Ти печелиш."; Sound.play(loser===userColor?"bad":"win"); }
    setStatus(status, res==="1/2-1/2" ? "info" : ((res==="1-0")===(userColor==="w") ? "good" : "bad"), t);
    alertBox.innerHTML=""; alertBox.append(h("div",{class:"pcard"}, h("strong",{style:"color:var(--ink)"},"Партията свърши. Сега най-важното: разборът."), h("p",{class:"muted small"},"Намирам грешките ти и ги добавям към упражненията."), h("button",{class:"btn primary big block",onclick:()=>finish(res, game.in_checkmate()?"мат":"реми")},"Анализирай партията")));
    return true;
  }
  async function userPre(){
    const job=++preJob; const fen=game.fen(); const r=await Engine.analyse(fen,{depth:16,movetime:900});
    if (!r || job!==preJob || fen!==game.fen()) return; pre={fen, ev:{cp:scoreOf(r.top), mate:r.top?r.top.mate:null, best:r.best, pv:r.top?r.top.pv:[]}};
    if (lastUserEval!=null && game.turn()===userColor && !over){ const gain=pre.ev.cp-lastUserEval; if (gain>=180 && pre.ev.cp>=120) coach.say(pre.ev.mate>0 ? "Внимание! Противникът сгреши и има форсиран мат за теб. Потърси шаховете." : "Противникът сгреши! Тук има нещо силно за теб. Провери шаховете, взиманията и незащитените фигури.", "warn"); }
    setEval(game.turn()==="w" ? pre.ev.cp : -pre.ev.cp);
  }
  async function engineMove(){
    if (over) return; busy=true; board.o.movable=null; setStatus(status,"info","Противникът мисли...");
    const t0=Date.now(); let san=null;
    if (book){ const opts=book.get(fenKey(game.fen())); if (opts && opts.length) san=opts[Math.floor(Math.random()*opts.length)].san; }
    let m;
    if (san) m=game.move(san);
    else { const u=await botMove(game.fen(), LEVELS[level]); if (!u || u==="(none)" || !app.isConnected){ busy=false; return; } m=game.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}); }
    const wait=Math.max(0, 450+Math.random()*500-(Date.now()-t0)); if (wait) await sleep(wait);
    last={from:m.from,to:m.to}; sync(board,game,last); renderMoves(); board.arrows([]);
    busy=false; if (checkOver()) return;
    board.o.movable=userColor; tTurn=Date.now(); setStatus(status,"info","Твой ход. Какво иска противникът с последния си ход?");
    if (book){ const opts=book.get(fenKey(game.fen())); if (opts && opts.length){ tipBox.innerHTML=""; tipBox.append(h("div",{class:"status small"},"Още си в линиите от курса.")); } }
    pre=null; userPre();
  }
  function commitUser(mv){
    const before=game.fen(); const bookOpts = book ? book.get(fenKey(before)) : null; const preNow = pre && pre.fen===before ? pre : null;
    const m=game.move(mv); if (!m) return;
    if (tTurn) times.push(Date.now()-tTurn); tTurn=0;
    last={from:m.from,to:m.to}; sync(board,game,last); renderMoves(); board.arrows([]); board.mark([]);
    const inBook = bookOpts && bookOpts.length; const hit = inBook && bookOpts.find(o=>o.san===m.san);
    if (inBook && !hit){ tipBox.innerHTML=""; coach.say(`Излезе от репертоара. Тук по линията се играе ${bookOpts.map(o=>o.san).join(" или ")}. Ще го добавя към упражненията след партията.`, "warn"); }
    else if (hit){ coach.say(hit.c ? "По репертоара. "+hit.c : `По репертоара: ${m.san}.`, "good"); }
    else liveHabits(m);
    if (checkOver()) return;
    if (!hit && preNow) commentMove(before, m, preNow);
    engineMove();
  }
  // a short coach comment on every move you make (like a coach sitting next to you)
  async function commentMove(before, m, preNow){
    const after=game.fen(); const r=await Engine.analyse(after,{depth:12,movetime:250}); if (!r || over) return;
    const evA={cp:scoreOf(r.top), mate:r.top?r.top.mate:null, best:r.best, pv:r.top?r.top.pv:[]}; lastUserEval=-evA.cp;
    const isBest = preNow.ev.best===uciOf(m); const loss = isBest ? 0 : Math.max(0, winPct(preNow.ev.cp)-winPct(-evA.cp)); const k=classify(loss,isBest);
    if (tipsShown.size && tipBox.childNodes.length && (k==="best"||k==="exc"||k==="good")) return;
    const bestSan = preNow.ev.best ? pvToSan(before,[preNow.ev.best],1)[0] : null;
    if (k==="best"||k==="exc"||k==="good") coach.say(praise(k), "good");
    else if (k==="inacc") coach.say(`Неточност. По-добре беше ${bestSan}.`, "warn");
    else { const ex=await explainMove(before, m, preNow.ev, evA, {loss, threat:null}); if (ex && !over) coach.say(ex.text, "bad"); }
  }
  playable(board, game, userColor, async mv=>{
    if (busy || over) return;
    const strict=S.play.strict;
    if (!strict){ commitUser(mv); return; }
    busy=true; board.o.movable=null; setStatus(status,"info","Треньорът проверява хода...");
    if (!pre || pre.fen!==game.fen()) await userPre();
    const tmp=new Chess(game.fen()); const tm=tmp.move(mv);
    if (!tm || tmp.game_over() || !pre){ busy=false; commitUser(mv); return; }
    const r=await Engine.analyse(tmp.fen(),{depth:16,movetime:700}); if (!r){ busy=false; return; }
    const evA={cp:scoreOf(r.top), mate:r.top?r.top.mate:null, best:r.best, pv:r.top?r.top.pv:[]};
    const loss = (pre.ev.best===uciOf(tm)) ? 0 : winPct(pre.ev.cp) - winPct(-evA.cp);
    if (loss>=strict){
      const ex=await explainMove(game.fen(), tm, pre.ev, evA, {ply:game.history().length, loss}); busy=false;
      if (!ex) return;
      stops++; board.o.movable=null; Sound.play("bad"); coach.say("Спри за момент. Този ход има проблем. Виж по-долу.", "bad");
      board.setFen(tmp.fen(), {from:tm.from,to:tm.to});
      setStatus(status, loss>=25?"bad":"warn", `Спри! ${lossLabel(loss)}: ${tm.san}.`);
      alertBox.innerHTML="";
      const why=h("div",{class:"comment",hidden:true}, ex.text);
      alertBox.append(h("div",{class:"pcard"},
        h("strong",{style:"color:var(--ink)"},"Помисли отново, преди да продължиш."),
        h("div",{class:"muted"}, ex.cat==="positional" ? "Има по-силен ход. Какъв е планът тук?" : "Какъв е най-силният отговор на противника? Провери шаховете, взиманията и заплахите."),
        why,
        h("div",{class:"actions"},
          h("button",{class:"btn primary",onclick:()=>{ alertBox.innerHTML=""; board.setFen(game.fen(), last); board.arrows([]); board.o.movable=userColor; setStatus(status,"info","Помисли и намери по-добър ход."); }},"Ще помисля пак"),
          h("button",{class:"btn",onclick:(e)=>{ why.hidden=false; const red=ex.arrows.slice(1).filter(a=>a.color.includes("228")); if (red.length){ board.setFen(tmp.fen(), {from:tm.from,to:tm.to}); board.arrows(red); } else { board.setFen(game.fen(), last); board.arrows([]); } e.currentTarget.disabled=true; }},"Покажи защо")),
        h("button",{class:"btn ghost sm",style:"align-self:flex-start",onclick:()=>{ alertBox.innerHTML=""; board.setFen(game.fen(), last); commitUser(mv); }},"Играй хода все пак")));
      return;
    }
    busy=false; alertBox.innerHTML=""; commitUser(mv);
  });
  async function threat(){
    if (busy||over) return;
    if (game.in_check()){ setStatus(status,"warn","Под шах си. Първо се защити."); return; }
    setStatus(status,"info","Търся какво заплашва противникът...");
    const th=await threatOf(game.fen()); if (!th){ setStatus(status,"info","Не мога да проверя заплахата тук."); return; }
    const base = pre ? -pre.ev.cp : 0; const gain = th.cp-base;
    board.arrows([{from:th.u.slice(0,2),to:th.u.slice(2,4),color:"rgba(214,64,45,.9)"}]);
    setStatus(status, gain>120?"warn":"info", gain>120 ? `Внимание: противникът заплашва ${th.san}.` : `Ако противникът беше на ход, би играл ${th.san}. Сериозна заплаха няма.`);
  }
  async function hintMove(){
    if (busy||over||game.turn()!==userColor) return;
    if (!pre || pre.fen!==game.fen()) await userPre();
    if (pre && pre.ev.best){ board.mark([pre.ev.best.slice(0,2)]); setStatus(status,"info","Подсказка: най-силният ход е с фигурата на маркираното поле. Какво прави тя?"); }
  }
  function takeBack(){
    if (busy) return; if (game.history().length<2 && game.turn()===userColor) return;
    if (game.turn()===userColor) game.undo(); game.undo(); over=false; alertBox.innerHTML="";
    const hv=game.history({verbose:true}); const lm=hv[hv.length-1]; last=lm?{from:lm.from,to:lm.to}:null; sync(board,game,last,false); board.arrows([]); board.mark([]); renderMoves(); board.o.movable=userColor;
    setStatus(status,"info","Ходът е върнат. Твой ход."); pre=null; userPre();
  }
  function resign(e){
    if (over || game.history().length<2) return;
    const b=e.currentTarget; if (!b.dataset.sure){ b.dataset.sure="1"; b.textContent="Сигурен ли си?"; setTimeout(()=>{ b.dataset.sure=""; b.textContent="Предай се"; },3000); return; }
    finish(userColor==="w"?"0-1":"1-0","предаване");
  }
  function newGame(){
    Engine.cancel(); preJob++; game.reset(); last=null; over=false; busy=false; pre=null; stops=0; tipsShown=new Set(); alertBox.innerHTML=""; tipBox.innerHTML="";
    book = course ? buildBook(course) : repBook(userColor); times=[]; lastUserEval=null;
    coach.say(book ? (course ? `Играем „${course.name}“. Следвай линиите от курса.` : "Играем твоя репертоар. Ще ти казвам, ако излезеш от линиите.") : "Аз съм до теб. След всеки ход ще ти казвам какво мисля.", "");
    board.setOrientation(userColor); board.o.movable=userColor; sync(board,game,null,false); renderMoves(); board.arrows([]); board.mark([]);
    const bot=(S.games||[]).filter(g=>g.src==="bot"&&g.lvl===level).slice(0,3);
    suggest.innerHTML="";
    if (bot.length===3 && bot.every(g=>(g.res==="1-0")===(g.uc==="w") && g.res!=="1/2-1/2") && level<LEVELS.length-1) suggest.append(h("div",{class:"status good small"},`Спечели 3 поредни партии на това ниво. Време е за „${LEVELS[level+1].name}“.`));
    if (game.turn()!==userColor) engineMove(); else { setStatus(status,"info","Твой ход."); tTurn=Date.now(); userPre(); }
  }
  app.append(topbar(course ? "Дебют: "+course.name : "Игра с треньор", course ? "course--"+course.id : "home"));
  app.append(trainLayout(
    [h("div",{class:"player"}, h("span",{class:"pav g-gray"}, icon("robot")), oppName, oppDot), bel, h("div",{class:"player"}, h("span",{class:"pav g-green"}, icon("user")), viewerName||"Ти", youDot), evalRow],
    [h("div",{class:"pcard"},
       h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"eyebrow"}, course?"Дебютна практика":"Треньорът те спира преди грешка"), h("span",{class:"side-pill"},h("span",{class:"pawn-dot "+userColor}),"С "+sideName(userColor))),
       course ? h("p",{class:"muted small"},`Ботът играе ходовете от „${course.name}“, докато линиите свършат.`) : null,
       coach, engineMsg, status, tipBox,
       h("div",{class:"actions"}, h("button",{class:"btn sm",onclick:threat},"Каква е заплахата?"), h("button",{class:"btn sm",onclick:hintMove},"Подсказка"), h("button",{class:"btn sm",onclick:takeBack},"Върни ход"))),
     alertBox,
     h("div",{class:"pcard"},movesEl),
     h("div",{class:"pcard"},
       suggest,
       h("div",{class:"actions"}, h("button",{class:"btn primary",onclick:newGame},"Нова партия"), h("button",{class:"btn",onclick:()=>finish("*","прекъсната")},"Анализирай"), h("button",{class:"btn ghost",onclick:resign},"Предай се")),
       h("details",null, h("summary",{class:"small"},"Настройки на партията"),
         h("div",{class:"stack",style:"margin-top:12px"},
           h("label",{class:"field",for:"lvl"},h("span",null,"Противник"),lvlSel),
           h("label",{class:"field",for:"strict"},h("span",null,"Треньорът ме спира при"),strictSel),
           course?null:h("span",{class:"field"},h("span",null,"Твоят цвят"),colorSeg),
           h("label",{class:"switch",for:"evalchk"},h("span",{class:"small"},"Показвай оценката (по-добре изключено)"),evalChk)))),
     coachChat(()=>`Ученикът играе партия срещу бот, с ${sideName(userColor)}. Позиция (FEN): ${game.fen()}. Ходове: ${game.pgn()||"няма"}. Не казвай директно най-добрия ход, ако той пита за текущата позиция; помогни му да мисли.`),
     coachCard(()=>`Партия срещу бот, ученикът е с ${sideName(userColor)}. Позиция (FEN): ${game.fen()}. Ходове: ${game.pgn()||"няма"}. Оценка за страната на ход: ${pre?fmtEval(pre.ev.cp):"неизвестна"}, най-добър ход: ${pre&&pre.ev.best?pvToSan(game.fen(),[pre.ev.best],1)[0]:"неизвестен"}. Вредни навици на ученика: ${profile().habits.slice(0,3).map(x=>HABITS[x.k]?HABITS[x.k].t:x.k).join("; ")||"няма данни"}. НЕ казвай директно най-добрия ход. Помогни му да мисли: какво иска противникът, кои са слабостите, кои кандидат-ходове да разгледа. Завърши с един въпрос.`, "Помогни ми да мисля")]));
  Engine.init().then(ok=>{ engineMsg.remove(); if (!ok) setStatus(status,"bad","Енджинът не се зареди. Опитай с Chrome, Edge или Safari."); });
  newGame();
}

/* ============ game review ============ */
function evalGraph(cw, cls, moves, uc, onPick){
  const n=cw.length; const W=600, H=110; const ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg"); svg.setAttribute("viewBox",`0 0 ${W} ${H}`); svg.setAttribute("class","egraph"); svg.setAttribute("preserveAspectRatio","none");
  const x=i=>n<=1?0:i/(n-1)*W; const y=v=>H/2-Math.max(-1000,Math.min(1000,v))/1000*(H/2-4);
  const bg=document.createElementNS(ns,"rect"); bg.setAttribute("width",W); bg.setAttribute("height",H); bg.setAttribute("fill","#3a3f3c"); svg.append(bg);
  let d=`M0 ${H} `; cw.forEach((v,i)=>d+=`L${x(i).toFixed(1)} ${y(v).toFixed(1)} `); d+=`L${W} ${H} Z`;
  const area=document.createElementNS(ns,"path"); area.setAttribute("d",d); area.setAttribute("fill","#f1efe8"); svg.append(area);
  const mid=document.createElementNS(ns,"line"); mid.setAttribute("x1",0); mid.setAttribute("x2",W); mid.setAttribute("y1",H/2); mid.setAttribute("y2",H/2); mid.setAttribute("stroke","#8a8780"); mid.setAttribute("stroke-dasharray","4 4"); svg.append(mid);
  const cursor=document.createElementNS(ns,"line"); cursor.setAttribute("y1",0); cursor.setAttribute("y2",H); cursor.setAttribute("stroke","#3fae74"); cursor.setAttribute("stroke-width","3"); svg.append(cursor);
  moves.forEach((m,j)=>{ const k=cls[j]; if (m.color!==uc || !["mist","blun","miss"].includes(k)) return; const c=document.createElementNS(ns,"circle"); c.setAttribute("cx",x(j+1)); c.setAttribute("cy",y(cw[j+1])); c.setAttribute("r",5); c.setAttribute("fill",k==="blun"?"#e0533d":k==="miss"?"#8a63d2":"#e39a2b"); c.setAttribute("stroke","#3a3f3c"); c.setAttribute("stroke-width","1.5"); svg.append(c); });
  svg.addEventListener("click", e=>{ const r=svg.getBoundingClientRect(); const i=Math.round((e.clientX-r.left)/r.width*(n-1)); onPick(Math.max(0,Math.min(n-1,i))); });
  svg.setCursor = i => { cursor.setAttribute("x1",x(i)); cursor.setAttribute("x2",x(i)); };
  return svg;
}
// after the engine review: rushed mistakes and where you left your repertoire
function postAnalysis(g){
  try {
    if (g.times && g.times.length && g.an){ let k=0, rush=0; g.sans.forEach((s,j)=>{ const mine = (j%2===0)===(g.uc==="w") && !g.start; if (!mine) return; const t=g.times[k++]; if (t!=null && t<5000 && ["mist","blun"].includes(g.an.cls[j])) rush++; }); if (rush>=1){ g.sum.habits=g.sum.habits||{}; g.sum.habits.rush=rush; g.sum.rush=rush; } }
    const dev=checkRepertoire(g); if (dev) g.sum.dev=dev;
  } catch(e){}
}
function badge(k){ const c=CLS[k]; return h("span",{class:"mbadge "+c.c}, c.l); }
function vGame(app, id){
  const game=(S.games||[]).find(g=>g.id===id); if (!game){ go("progress"); return; }
  app.append(topbar("Разбор на партията","progress"));
  if (!game.an){
    const bar=h("i",{style:"width:0%"}); const txt=h("span",{class:"muted small"},"Подготвям енджина...");
    app.append(h("div",{class:"card stack",style:"max-width:560px;margin:30px auto"}, h("h2",null,"Анализирам партията"), h("p",{class:"muted"},"Stockfish проверява всеки ход и търси навиците ти. Отнема около половин минута."), h("div",{class:"bar"},bar), txt));
    analyseGame(game,(i,n)=>{ bar.style.width=Math.round(i/n*100)+"%"; txt.textContent=`Позиция ${i} от ${n}`; }).then(g=>{ if (!g) return; postAnalysis(g); saveGame(g); award(20, true); if (location.hash==="#game--"+id) route(); });
    return;
  }
  const an=game.an; const start=game.start||new Chess().fen();
  const g=new Chess(start); const fens=[g.fen()], moves=[]; for (const s of game.sans){ const m=g.move(s,{sloppy:true}); if (!m) break; moves.push(m); fens.push(g.fen()); }
  let p=moves.length;
  const bel=h("div"); const board=new Board(bel,{orientation:game.uc});
  const info=h("div",{class:"stack"}); const movesEl=h("div",{class:"moves"});
  const graph=evalGraph(an.cw, an.cls, moves, game.uc, i=>{ p=i; show(); });
  const evalTxt=h("span",{class:"mono muted small"});
  function show(){
    const j=p-1; const m=moves[j]; const k=j>=0?an.cls[j]:null;
    const mistake = m && m.color===game.uc && ["mist","blun","miss","inacc"].includes(k) && an.best[j];
    if (mistake){ const gg=new Chess(fens[j]); board.setCheck(gg.in_check()); board.setFen(fens[j], j>0?{from:moves[j-1].from,to:moves[j-1].to}:null); board.arrows([{from:m.from,to:m.to,color:"rgba(214,64,45,.9)"},{from:an.best[j].slice(0,2),to:an.best[j].slice(2,4),color:"rgba(30,140,85,.92)"}]); }
    else { const gg=new Chess(fens[p]); board.setCheck(gg.in_check()); board.setFen(fens[p], m?{from:m.from,to:m.to}:null); board.arrows([]); }
    graph.setCursor(p); evalTxt.textContent="Оценка: "+fmtEval(an.cw[p]);
    [...movesEl.querySelectorAll("button")].forEach(b=>b.classList.toggle("cur", +b.dataset.p===p));
    info.innerHTML="";
    if (!m){ info.append(h("div",{class:"muted"},"Начална позиция. Използвай стрелките или кликни ход.")); return; }
    info.append(h("div",{class:"row"}, h("strong",{class:"mono",style:"font-size:1.05rem;color:var(--ink)"},`${Math.floor(j/2)+1}${m.color==="w"?".":"..."} ${m.san}`), badge(k), h("span",{class:"muted small"}, m.color===game.uc?"Ти":"Противникът")));
    if (an.txt[j]) info.append(h("div",{class:"comment"},an.txt[j]));
    else if (k==="best"||k==="exc") info.append(h("div",{class:"muted"},"Силен ход."));
    else if (an.best[j] && k!=="good") info.append(h("div",{class:"muted"},`По-добре беше ${pvToSan(fens[j],[an.best[j]],1)[0]}.`));
    if (mistake) info.append(h("div",{class:"muted small"},"Червено: твоят ход. Зелено: по-добрият."));
    if (an.txt[j] && m.color===game.uc){
      const card=(S.mist||[]).find(x=>x.id===game.id+"-"+j);
      const out=h("div",{class:"coach muted"}); const cb=h("button",{class:"btn sm",onclick:()=>coachInto(out,cb,`Ученикът (с ${sideName(game.uc)}) направи грешка. Позиция преди хода (FEN): ${fens[j]}. Изигра ${m.san}. Енджинът предпочита ${pvToSan(fens[j],[an.best[j]],1)[0]}. Автоматичното обяснение: "${an.txt[j]}". Обясни простичко защо ходът е грешка, какво е трябвало да забележи и как да мисли следващия път.`)},"Обясни по-подробно");
      info.append(h("div",{class:"row"}, card? h("button",{class:"btn sm primary",onclick:()=>go("fix--"+card.id)},"Опитай сам") : null, cb));
      getSample().then(s=>{ if (!s) cb.remove(); });
      info.append(out);
    }
  }
  moves.forEach((m,j)=>{ if (j%2===0) movesEl.append(h("span",{class:"n"},(j/2+1)+".")); const k=an.cls[j]; const mine=m.color===game.uc; movesEl.append(h("button",{"data-p":j+1,class:mine&&CLS[k].m?"mk-"+CLS[k].c:"",onclick:()=>{ p=j+1; show(); }}, m.san+(mine&&CLS[k].m?CLS[k].m:""))); });
  if (moves.length && moves[0].color==="b"){ movesEl.prepend(h("span",null,"...")); movesEl.prepend(h("span",{class:"n"},"1.")); }
  const nav=h("div",{class:"navrow"},
    h("button",{class:"btn sm","aria-label":"Начало",onclick:()=>{ p=0; show(); }},"⏮"), h("button",{class:"btn sm","aria-label":"Назад",onclick:()=>{ if (p>0){ p--; show(); } }},"◀"),
    h("button",{class:"btn sm","aria-label":"Напред",onclick:()=>{ if (p<moves.length){ p++; show(); } }},"▶"), h("button",{class:"btn sm","aria-label":"Край",onclick:()=>{ p=moves.length; show(); }},"⏭"));
  const key=e=>{ if (e.target.closest("input,textarea,select")) return; if (e.key==="ArrowRight"&&p<moves.length){ p++; show(); } if (e.key==="ArrowLeft"&&p>0){ p--; show(); } };
  document.addEventListener("keydown",key); onLeave(()=>document.removeEventListener("keydown",key));
  const sm=game.sum; const keyMoments=moves.map((m,j)=>({m,j})).filter(x=>x.m.color===game.uc && an.txt[x.j]).sort((a,b)=>an.loss[b.j]-an.loss[a.j]).slice(0,5).sort((a,b)=>a.j-b.j);
  const habitsHere=Object.keys(sm.habits||{}).filter(k=>HABITS[k] && k!=="positional");
  const resTxt = game.res==="*" ? "Незавършена" : game.res==="1/2-1/2" ? "Реми" : ((game.res==="1-0")===(game.uc==="w") ? "Победа" : "Загуба");
  const fixN=(S.mist||[]).filter(x=>x.gid===game.id).length;
  // guided review: the coach walks you through the key moments
  const cb=coachBubble(); const walkNav=h("div",{class:"actions"}); const walkCard=h("div",{class:"pcard walk",hidden:true}, cb, walkNav);
  let walk=null;
  const topHabit=Object.keys(sm.habits||{}).filter(k=>HABITS[k]&&k!=="positional").sort((a,b)=>(sm.habits[b]||0)-(sm.habits[a]||0))[0];
  const autoIntro=`${resTxt}. Точността ти е ${sm.acc}%.${sm.dev?` В дебюта излезе от репертоара на ${Math.floor(sm.dev.ply/2)+1}-ия ход.`:""} ${keyMoments.length?`Да разгледаме ${keyMoments.length} ${plural(keyMoments.length,"ключов момент","ключови момента")}.`:"Нямаше сериозни грешки. Браво!"}`;
  const autoOutro= topHabit ? `Главният урок от партията: ${HABITS[topHabit].t.toLowerCase()}. ${HABITS[topHabit].fix}` : "Добра партия. Продължавай с тренировката за деня.";
  function texts(){ return game.coach || {}; }
  function walkShow(){
    const it=walk.list[walk.i]; const T=texts();
    if (it.k==="intro"){ p=0; show(); cb.say(T.intro||autoIntro); }
    else if (it.k==="m"){ p=it.j+1; show(); const mm=(T.moments||[]).find(x=>x.ply===it.j); cb.say(mm&&mm.text ? mm.text : an.txt[it.j], "warn"); }
    else { p=moves.length; show(); cb.say(T.outro||autoOutro, "good"); }
    walkNav.innerHTML=""; const card=it.k==="m" ? (S.mist||[]).find(x=>x.id===game.id+"-"+it.j) : null;
    walkNav.append(h("button",{class:"btn",disabled:walk.i===0,onclick:()=>{ walk.i--; walkShow(); }}, icon("back")),
      card ? h("button",{class:"btn",onclick:()=>go("fix--"+card.id)},"Опитай сам") : null,
      walk.i<walk.list.length-1 ? h("button",{class:"btn primary",style:"flex:2",onclick:()=>{ walk.i++; walkShow(); }},`Напред (${walk.i+1}/${walk.list.length})`)
        : topHabit && HABIT_LESSON[topHabit] ? h("button",{class:"btn primary",style:"flex:2",onclick:()=>go("lesson--"+HABIT_LESSON[topHabit])},"Урок: "+LESSON_BY_ID[HABIT_LESSON[topHabit]].title) : h("button",{class:"btn primary",style:"flex:2",onclick:()=>go("home")},"Готово"));
  }
  async function startWalk(){
    walk={i:0, list:[{k:"intro"}, ...keyMoments.map(x=>({k:"m", j:x.j})), {k:"outro"}]}; walkCard.hidden=false; walkStart.hidden=true; walkShow(); window.scrollTo(0,0);
    if (game.coach) return; const sample=await getSample(); if (!sample || !sample.json) return;
    try {
      cb.say("Треньорът преглежда партията...", "");
      const prompt=`${COACH_RULES.replace("{R}", Math.round(S.puz.rating))}\n\nРазбор на партия. Ученикът е с ${sideName(game.uc)}. Резултат: ${resTxt}. Точност ${sm.acc}%. Ходове: ${sanLine(start, game.sans)}.${sm.dev?` Излезе от репертоара си на ${Math.floor(sm.dev.ply/2)+1}-ия ход: изигра ${sm.dev.played}, а по линията е ${sm.dev.expected.join(" или ")}.`:""}\nКлючови моменти (ply е номер на полуход от 0): ${keyMoments.map(x=>`ply ${x.j}: ${Math.floor(x.j/2)+1}${x.m.color==="w"?".":"..."} ${x.m.san} (${CLS[an.cls[x.j]].l}); енджинът: ${an.txt[x.j]}`).join(" | ")||"няма"}.\nНавици: ${Object.keys(sm.habits||{}).filter(k=>HABITS[k]).map(k=>HABITS[k].t).join("; ")||"няма"}.\nНапиши разбор като треньор до ученика, на ти, топло и просто. Върни JSON: {"intro": "2-3 изречения за партията", "moments": [{"ply": число, "text": "2-3 изречения: какво стана, какво е трябвало да забележи и какъв въпрос да си зададе следващия път"}], "outro": "2 изречения: най-важният урок и какво да тренира"}. По един запис за всеки ключов момент, със същите ply.`;
      const res=await sample.json(prompt,{modelTier:"default"});
      if (res && (res.intro || res.moments)){ ["intro","outro"].forEach(k=>{ if (res[k]) res[k]=String(res[k]).replace(/—/g,"-"); }); (res.moments||[]).forEach(m=>{ m.ply=+m.ply; m.text=String(m.text||"").replace(/—/g,"-"); }); game.coach=res; save(); walkShow(); }
    } catch(e){ walkShow(); }
  }
  const walkStart=h("button",{class:"btn primary block",onclick:startWalk},"Разбор с треньора");
  app.append(trainLayout(
    [bel, nav, graph, evalTxt],
    [h("div",{class:"pcard"},
       h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"eyebrow"},game.name), h("span",{class:"chip "+(resTxt==="Победа"?"good":resTxt==="Загуба"?"bad":"")},resTxt)),
       h("div",{class:"accrow"},
         h("div",{class:"accbox"}, h("span",{class:"eyebrow"},"Твоята точност"), h("span",{class:"num"},sm.acc+"%")),
         h("div",{class:"accbox"}, h("span",{class:"eyebrow"},"Противник"), h("span",{class:"num",style:"color:var(--muted)"},sm.accOpp+"%"))),
       h("div",{class:"row",style:"gap:6px"}, h("span",{class:"mbadge blun"},`${sm.cnt.blun} груби`), h("span",{class:"mbadge mist"},`${sm.cnt.mist} грешки`), h("span",{class:"mbadge inacc"},`${sm.cnt.inacc} неточности`)),
       sm.dev ? h("div",{class:"status warn small"},`Дебют: на ${Math.floor(sm.dev.ply/2)+1}-ия ход изигра ${sm.dev.played}, а по репертоара се играе ${sm.dev.expected.join(" или ")}.`) : null,
       walkStart,
       fixN ? h("button",{class:"btn block",onclick:()=>go("fix")},`Поправи грешките (${fixN})`) : null),
     walkCard,
     h("div",{class:"pcard"}, info),
     keyMoments.length ? h("div",{class:"pcard"}, h("span",{class:"eyebrow"},"Ключови моменти"),
       h("div",{class:"list"}, keyMoments.map(x=>h("button",{class:"kmoment",onclick:()=>{ p=x.j+1; show(); }}, h("span",{class:"mono"},`${Math.floor(x.j/2)+1}${x.m.color==="w"?".":"..."} ${x.m.san}`), badge(an.cls[x.j]), h("span",{class:"muted small grow"}, CAT_LABEL[an.cat[x.j+"c"]] || (an.cat[x.j]==="punish"?"Ненаказана грешка":""))))))
       : h("div",{class:"pcard"}, h("div",{class:"status good"},"Няма сериозни грешки в тази партия. Браво!")),
     habitsHere.length ? h("div",{class:"pcard"}, h("span",{class:"eyebrow"},"Навици в тази партия"), habitsHere.map(k=>h("div",{class:"stack",style:"gap:4px"}, h("b",{style:"color:var(--ink)"},HABITS[k].t), h("span",{class:"muted small"},HABITS[k].fix), HABIT_LESSON[k] ? h("button",{class:"btn sm",style:"align-self:flex-start",onclick:()=>go("lesson--"+HABIT_LESSON[k])},"Урок: "+LESSON_BY_ID[HABIT_LESSON[k]].title) : null))) : null,
     h("div",{class:"pcard"},movesEl),
     coachChat(()=>`Ученикът разглежда своя партия (с ${sideName(game.uc)}). Ходове: ${sanLine(start, game.sans)}. Текуща позиция на дъската (FEN): ${fens[p]}.`),
     coachCard(()=>`Разбор на партия. Ученикът е с ${sideName(game.uc)}, резултат: ${resTxt}. Ходове: ${sanLine(start, game.sans)}. Точност ${sm.acc}%. Грешки: ${keyMoments.map(x=>`${Math.floor(x.j/2)+1}. ${x.m.san} - ${an.txt[x.j]}`).join(" | ")||"няма"}. Навици: ${habitsHere.map(k=>HABITS[k].t).join("; ")||"няма"}. Дай кратък разбор: 2-3 урока от партията, кой навик е най-важен за поправяне и конкретно упражнение.`, "Разбор от треньора"),
     h("button",{class:"btn ghost sm",style:"align-self:flex-start",onclick:(e)=>{ const b=e.currentTarget; if (!b.dataset.sure){ b.dataset.sure="1"; b.textContent="Натисни пак за изтриване"; return; } S.games=S.games.filter(x=>x.id!==id); S.mist=(S.mist||[]).filter(x=>x.gid!==id); save(); go("progress"); }},"Изтрий партията")]));
  if (keyMoments.length) p=keyMoments[0].j+1;
  show();
}

/* ============ boot ============ */
Object.assign(VIEWS, {play:vPlay, game:vGame, progress:vProgress});
viewerName = (S.set && S.set.name) || "";
applySettings();
applyPieces();
initXp();
route();
initDb();
(async()=>{ try { if (!window.claude || !claude.use) return; const u=await claude.use("user"); if (!u) return; const me=await u.me(); const first=(me && me.name || "").trim().split(/\s+/)[0]; if (first && !(S.set && S.set.name)){ viewerName=first; softRefresh(); } } catch(e){} })();
