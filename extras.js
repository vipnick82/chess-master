"use strict";
/* ============ XP, levels, badges, toasts, confetti ============ */
const LEVELS_XP = [[0,"Пешка"],[200,"Кон"],[600,"Офицер"],[1200,"Топ"],[2200,"Дама"],[3600,"Цар"],[5500,"Кандидат-майстор"],[8000,"Майстор"],[12000,"Гросмайстор"]];
function levelOf(xp){ let i=0; while (i+1<LEVELS_XP.length && xp>=LEVELS_XP[i+1][0]) i++; const cur=LEVELS_XP[i], nxt=LEVELS_XP[i+1]; return {i, name:cur[1], from:cur[0], to:nxt?nxt[0]:null, next:nxt?nxt[1]:null, pct: nxt ? (xp-cur[0])/(nxt[0]-cur[0])*100 : 100}; }
const BADGES = [
  {id:"lesson1", t:"Първи урок", d:"Мина първия си урок.", ok:()=>lessonsDoneCount()>=1},
  {id:"lesson5", t:"Ученик", d:"5 минати урока.", ok:()=>lessonsDoneCount()>=5},
  {id:"unit", t:"Цяла част", d:"Мина всички уроци от една част.", ok:()=>UNITS.some(u=>LESSONS.filter(l=>l.unit===u.id).every(l=>lessonDone(l.id)))},
  {id:"lessonAll", t:"Пълен курс", d:"Всички 20 урока.", ok:()=>lessonsDoneCount()>=LESSONS.length},
  {id:"streak3", t:"3 дни подред", d:"Тренира 3 дни подред.", ok:()=>streak()>=3},
  {id:"streak7", t:"Седмица", d:"7 дни подред.", ok:()=>streak()>=7},
  {id:"streak30", t:"Месец", d:"30 дни подред.", ok:()=>streak()>=30},
  {id:"puz100", t:"100 пъзела", d:"100 решени пъзела.", ok:()=>S.puz.ok>=100},
  {id:"puz500", t:"500 пъзела", d:"500 решени пъзела.", ok:()=>S.puz.ok>=500},
  {id:"r1200", t:"Рейтинг 1200", d:"Рейтинг на пъзелите 1200.", ok:()=>S.puz.rating>=1200},
  {id:"r1500", t:"Рейтинг 1500", d:"Рейтинг на пъзелите 1500.", ok:()=>S.puz.rating>=1500},
  {id:"storm15", t:"Буря", d:"15 пъзела в щурма.", ok:()=>(S.storm.best||0)>=15},
  {id:"storm25", t:"Ураган", d:"25 пъзела в щурма.", ok:()=>(S.storm.best||0)>=25},
  {id:"pstreak10", t:"Без грешка", d:"10 пъзела подред в „Пъзел серия“.", ok:()=>(S.pstreak.best||0)>=10},
  {id:"game1", t:"Първи разбор", d:"Анализира първата си партия.", ok:()=>(S.games||[]).some(g=>g.sum)},
  {id:"fix10", t:"Поправям се", d:"Поправи 10 грешки от партиите.", ok:()=>(S.cnt.fix||0)>=10},
  {id:"sess7", t:"Редовен", d:"7 дневни тренировки.", ok:()=>(S.cnt.sess||0)>=7},
  {id:"mateQ", t:"Мат с дама", d:"Даде мат с дама срещу Stockfish.", ok:()=>!!(S.eg["q-mate"]&&S.eg["q-mate"].done)},
  {id:"mateR", t:"Мат с топ", d:"Даде мат с топ срещу Stockfish.", ok:()=>!!(S.eg["r-mate"]&&S.eg["r-mate"].done)},
  {id:"coords20", t:"Зрение", d:"20 полета в тренировката на координати.", ok:()=>(S.coords.best||0)>=20},
];
function initXp(){
  S.cnt = S.cnt || {}; S.eg = S.eg || {}; S.coords = S.coords || {best:0}; S.pstreak = S.pstreak || {best:0}; S.badges = S.badges || null;
  if (S.xp==null){ S.xp = Math.round((S.puz.ok||0)*10 + lessonsDoneCount()*80 + (S.drills||0)*8 + (S.games||[]).length*20); }
  if (!S.badges){ S.badges={}; BADGES.forEach(b=>{ try { if (b.ok()) S.badges[b.id]=Date.now(); } catch(e){} }); }
}
function award(n, silent){
  const before=levelOf(S.xp||0); S.xp=(S.xp||0)+n; const after=levelOf(S.xp);
  if (!silent && n>0) toast(`+${n} точки`, "xp");
  if (after.i>before.i){ setTimeout(()=>{ toast(`Ново ниво: ${after.name}!`, "level"); confetti(); Sound.play("win"); }, 500); }
  checkBadges(); save();
}
function checkBadges(){
  BADGES.forEach(b=>{ if (S.badges[b.id]) return; let ok=false; try { ok=b.ok(); } catch(e){} if (ok){ S.badges[b.id]=Date.now(); setTimeout(()=>{ toast(`Нова значка: ${b.t}`, "badge"); confetti(70); }, 900); } });
}
function toast(text, kind){
  let box=document.getElementById("toasts"); if (!box){ box=h("div",{id:"toasts",class:"toasts","aria-live":"polite"}); document.body.append(box); }
  const t=h("div",{class:"toast "+(kind||"")}, text); box.append(t);
  setTimeout(()=>{ t.classList.add("out"); setTimeout(()=>t.remove(), 400); }, kind==="xp" ? 1400 : 3200);
}
function confetti(n=140){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c=h("canvas",{class:"confetti","aria-hidden":"true"}); document.body.append(c);
  const W=c.width=innerWidth*devicePixelRatio, H=c.height=innerHeight*devicePixelRatio; const ctx=c.getContext("2d");
  const cols=["#1e7650","#5bb88a","#e3ad48","#ebecd0","#739552","#ee6a55"];
  const ps=[...Array(n)].map(()=>({x:W/2+(Math.random()-.5)*W*.3, y:H*.35, vx:(Math.random()-.5)*16*devicePixelRatio, vy:(-Math.random()*16-6)*devicePixelRatio, s:(4+Math.random()*6)*devicePixelRatio, r:Math.random()*6, vr:(Math.random()-.5)*.4, c:cols[Math.floor(Math.random()*cols.length)]}));
  const t0=performance.now();
  (function f(t){ const k=(t-t0)/1700; ctx.clearRect(0,0,W,H); ps.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=.55*devicePixelRatio; p.r+=p.vr; ctx.save(); ctx.globalAlpha=Math.max(0,1-k); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c; ctx.fillRect(-p.s/2,-p.s/3,p.s,p.s*.66); ctx.restore(); }); if (k<1) requestAnimationFrame(f); else c.remove(); })(t0);
}

/* ============ placement test ============ */
function vStart(app){
  const targets=[600,800,1000,1250,1500]; const avoid=new Set(); let best=0, solvedN=0;
  app.append(h("div",{class:"topbar"}, h("button",{class:"iconbtn","aria-label":"Затвори",onclick:()=>go("home")}, icon("close")), h("div",{class:"ttl grow"},"Начален тест")));
  const host=h("div"); app.append(host);
  host.append(h("div",{class:"result"},
    resultArt("target","blue"), h("span",{class:"chip gold"}, icon("target"), "5 пъзела · около 3 минути"),
    h("div",{class:"big"},"Да видим нивото ти"),
    h("p",{class:"muted",style:"max-width:46ch"},"Ще ти дам 5 пъзела, от лесни към трудни. Не бързай и не се притеснявай от грешки. По резултата ще нагласим уроците и пъзелите. Тестът не влияе на рейтинга ти."),
    h("button",{class:"btn primary big",onclick:run}, icon("play"), "Започни теста")));
  function run(){
    host.innerHTML="";
    loadPuzzles().then(()=>{
      const steps=targets.map(t=>({t}));
      app.innerHTML="";
      runSeq(app, {back:"home", label:"Тест", steps, render:(st, slot, next)=>{
        const pz=pickPuzzle("mix",{target:st.t, avoid, maxLen:6}); avoid.add(pz[0]);
        mountPuzzle(slot, pz, {label:`Тест · пъзел ${steps.indexOf(st)+1} от 5`, rated:false, xp:false, onResult:s=>{ if (s===1){ solvedN++; best=Math.max(best, pz[3]); } }, onNext:()=>next()});
      }, finish:(res, slot)=>{
        const r = best ? Math.min(1700, best+100) : 600; const lvl = r<900 ? "new" : r<1250 ? "basic" : "club";
        S.puz.rating = r; S.onb = {lvl, at:Date.now(), test:true}; save(); markDay();
        const nl=nextLesson(); confetti(80); Sound.play("win");
        slot.append(h("div",{class:"result"},
          h("span",{class:"eyebrow"},`${solvedN} от 5 решени`),
          h("div",{class:"big"}, r),
          h("p",{class:"muted"},`Това е началният ти рейтинг. Ниво: ${({new:"начинаещ",basic:"любител",club:"клубен играч"})[lvl]}. ${nl?"Препоръчвам да започнеш с урока „"+nl.l.title+"“.":""}`),
          h("div",{class:"row",style:"justify-content:center"},
            nl ? h("button",{class:"btn primary big",onclick:()=>go("lesson--"+nl.l.id)},"Започни урока") : null,
            h("button",{class:"btn big",onclick:()=>go("home")},"Към началото"))));
      }});
    }).catch(()=>host.append(h("div",{class:"status bad"},"Пъзелите не се заредиха. Опитай пак.")));
  }
}

/* ============ puzzle streak ============ */
function vPStreak(app){
  app.append(topbar("Пъзел серия","train"));
  const host=h("div"); app.append(host);
  const intro=()=>{ host.innerHTML=""; host.append(h("div",{class:"result"},
    resultArt("flame","red"), h("span",{class:"chip good"}, icon("flame"), "Без часовник"),
    h("div",{class:"big"},"Пъзел серия"),
    h("p",{class:"muted",style:"max-width:46ch"},"Решавай пъзели един след друг. Всеки следващ е малко по-труден. Една грешка и серията свършва. Мисли спокойно, времето не е важно."),
    h("p",null,h("span",{class:"muted"},"Рекорд: "),h("b",{class:"num",style:"font-size:1.2rem"},S.pstreak.best||0)),
    h("button",{class:"btn primary big",onclick:start}, icon("play"), "Старт"))); };
  function start(){
    let n=0, target=Math.max(500, Math.min(1000, S.puz.rating-400)); const avoid=new Set();
    host.innerHTML=""; const cnt=h("b",{class:"num",style:"font-size:1.1rem"},"0");
    host.append(h("div",{class:"row",style:"justify-content:space-between;margin-bottom:12px"}, h("div",{class:"row"},h("span",{class:"muted small"},"Серия"),cnt), h("span",{class:"muted small"},`Рекорд ${S.pstreak.best||0}`)));
    const slot=h("div"); host.append(slot);
    const nextP=()=>{ slot.innerHTML=""; window.scrollTo(0,0);
      const pz=pickPuzzle("mix",{target, avoid, maxLen:8}); avoid.add(pz[0]);
      mountPuzzle(slot, pz, {label:`Серия · пъзел ${n+1}`, rated:false, auto:true, xp:false, onResult:s=>{ if (s===1){ n++; cnt.textContent=n; target+=60; award(4,true); } }, onNext:s=>{ if (s===1) nextP(); else end(); }});
    };
    function end(){
      const rec=n>(S.pstreak.best||0); if (rec) S.pstreak.best=n; markDay(); save(); checkBadges(); if (rec&&n>0){ confetti(); Sound.play("win"); }
      setTimeout(()=>{ host.innerHTML=""; host.append(h("div",{class:"result"},
        rec&&n>0 ? h("span",{class:"chip gold"},"Нов рекорд!") : null,
        h("div",{class:"big"},n), h("p",{class:"muted"},`${plural(n,"пъзел подред","пъзела подред")}. Рекорд: ${S.pstreak.best}.`),
        h("div",{class:"row",style:"justify-content:center"}, h("button",{class:"btn primary big",onclick:start},"Пак"), h("button",{class:"btn big",onclick:()=>go("train")},"Към тренировката")))); }, 1200);
    }
    loadPuzzles().then(nextP);
  }
  intro();
}

/* ============ play it out against Stockfish ============ */
const ENDGAMES = [
  {id:"q-mate", title:"Мат с дама", sub:"Дама и цар срещу цар", fen:"8/8/8/4k3/8/8/8/3QK3 w - - 0 1", goal:"mate", par:10, max:30,
   tip:"Стесни царя с дамата на „конско“ разстояние, без да даваш шах. Когато е на ръба, доведи своя цар и дай мат. Пази се от пат!"},
  {id:"r2-mate", title:"Мат с два топа", sub:"Стълбата", fen:"8/8/3k4/8/8/8/5K2/R6R w - - 0 1", goal:"mate", par:8, max:25,
   tip:"Топовете се редуват: единият дава шах, другият пази редицата. Така изтласкваш царя ред по ред до ръба."},
  {id:"r-mate", title:"Мат с топ", sub:"Топ и цар срещу цар", fen:"8/8/8/4k3/8/8/8/4K2R w - - 0 1", goal:"mate", par:16, max:45,
   tip:"Топът отрязва царя в „кутия“. Свиваш кутията с топа, а с царя заемаш опозиция. Мат се дава на ръба."},
  {id:"pawn-front", title:"Царят пред пешката", sub:"Произведи дама", fen:"4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", goal:"promote", max:20,
   tip:"Царят ти е пред пешката: това е печеливша позиция. Пази полетата пред пешката с царя и тогава я бутай."},
  {id:"pawn-opp", title:"Опозиция", sub:"Пешка и цар срещу цар", fen:"8/8/8/4k3/8/8/4PK2/8 w - - 0 1", goal:"promote", max:30,
   tip:"Първо изведи царя пред пешката. Когато царете са един срещу друг с едно поле между тях, на ход е по-лошо. Спечели опозицията."},
  {id:"pawn-draw", title:"Задръж реми", sub:"Защита срещу пешка", fen:"8/8/8/4k3/4p3/8/8/4K3 w - - 0 1", goal:"draw", hold:25,
   tip:"Застани пред пешката и пази опозицията. Ако царят ти е пред пешката, противникът не може да пробие. Издържи 25 хода."},
];
function vEndgames(app){
  app.append(topbar("Доиграй до победа","train"),
    h("div",{class:"stack",style:"gap:18px;max-width:820px;margin:0 auto"},
      h("div",{class:"homehead"}, tico("trophy","purple"), h("div",{class:"stack",style:"gap:4px"}, h("h1",null,"Доиграй до победа"), h("span",{class:"muted"},"Техниките, които всеки трябва да може срещу компютър."))),
      h("p",{class:"muted",style:"max-width:60ch"},"Играеш позицията до край срещу Stockfish на пълна сила. Така се учат техниките, които книгите само описват. Започни отгоре надолу."),
      h("div",{class:"list card",style:"padding-block:6px"}, ENDGAMES.map((e,i)=>{ const st=S.eg[e.id]; return h("button",{class:"lrow",onclick:()=>go("endgame--"+e.id)},
        h("span",{class:"ldot"+(st&&st.done?" done":"")}, st&&st.done?icon("check"):null),
        h("div",{class:"grow"}, h("div",{class:"t"},`${i+1}. ${e.title}`), h("div",{class:"s"},e.sub)),
        st&&st.done ? starsEl(st.stars||1) : h("span",{class:"chip"}, e.goal==="draw"?"Реми":e.goal==="mate"?"Мат":"Дама")); }))));
}
function vEndgame(app, id){
  const E=ENDGAMES.find(x=>x.id===id); if (!E){ go("endgames"); return; }
  app.append(topbar(E.title,"endgames")); const host=h("div"); app.append(host);
  const game=new Chess(E.fen); const uc=game.turn(); let last=null, busy=false, over=false, userMoves=0, hintN=0;
  const bel=h("div"); const board=new Board(bel,{orientation:uc});
  const status=h("div",{class:"status"},"Твой ход.");
  const goalTxt = E.goal==="mate" ? `Дай мат за не повече от ${E.max} хода.` : E.goal==="promote" ? "Произведи дама, без да изпуснеш печалбата." : `Издържи ${E.hold} хода, без противникът да произведе дама.`;
  const counter=h("span",{class:"pcount"},"0");
  const tip=h("div",{class:"comment small",hidden:true},E.tip);
  const actions=h("div",{class:"actions"},
    h("button",{class:"btn",onclick:hint}, icon("eye"), "Подсказка"),
    h("button",{class:"btn",onclick:()=>{ tip.hidden=!tip.hidden; }},"Съвет"),
    h("button",{class:"btn ghost",onclick:()=>go("endgame--"+id)},"Отначало"));
  const after=h("div",{class:"stack"});
  function end(ok, text){
    over=true; board.o.movable=null; setStatus(status, ok?"good":"bad", text); Sound.play(ok?"win":"bad");
    if (ok){ const stars = E.goal!=="mate" ? (hintN?2:3) : (userMoves<=E.par && !hintN ? 3 : userMoves<=E.par*1.6 ? 2 : 1);
      const prev=S.eg[id]||{}; const first=!prev.done; S.eg[id]={done:true, stars:Math.max(prev.stars||0,stars), best:Math.min(prev.best||999,userMoves)}; markDay(); save(); award(first?40:10); confetti();
      after.append(h("div",{class:"pcard"}, starsEl(stars), h("p",{class:"muted small"}, E.goal==="mate"?`Мат за ${userMoves} хода. Добър резултат е до ${E.par}.`:"Справи се."))); }
    actions.innerHTML=""; const ni=ENDGAMES.indexOf(E)+1;
    actions.append(h("button",{class:"btn",onclick:()=>go("endgame--"+id)},"Отначало"), ok && ENDGAMES[ni] ? h("button",{class:"btn primary",onclick:()=>go("endgame--"+ENDGAMES[ni].id)},"Следваща позиция") : h("button",{class:"btn primary",onclick:()=>go("endgames")},"Към позициите"));
  }
  function judge(){
    const pcs=game.fen().split(" ")[0]; const has=ch=>pcs.includes(ch); const userHasQueen = has(uc==="w"?"Q":"q");
    const oppHasQueen = has(uc==="w"?"q":"Q");
    if (game.in_checkmate()){ return game.turn()!==uc ? end(true, "Мат! Браво.") : end(false, "Получи мат. Опитай пак."); }
    if (game.in_draw() || game.in_stalemate()){ if (E.goal==="draw") return end(true,"Реми! Задържа позицията."); return end(false, game.in_stalemate() ? "Пат! Противникът няма ходове, но не е под шах. Остави му поле." : "Реми. Печалбата се изплъзна, опитай пак."); }
    if (E.goal==="promote" && userHasQueen) return end(true,"Дама! Позицията е спечелена.");
    if (E.goal==="promote" && !has(uc==="w"?"P":"p") && !userHasQueen) return end(false,"Пешката падна. Опитай пак.");
    if (E.goal==="draw" && oppHasQueen) return end(false,"Противникът произведе дама. Застани пред пешката по-рано.");
    if (E.goal==="draw" && userMoves>=E.hold) return end(true,`Издържа ${E.hold} хода. Това е реми.`);
    if (E.goal==="mate" && userMoves>=E.max) return end(false,`Минаха ${E.max} хода без мат. Виж съвета и опитай пак.`);
    return false;
  }
  async function reply(){
    busy=true; board.o.movable=null; setStatus(status,"info","Stockfish мисли...");
    const r=await Engine.run(game.fen(),"go movetime 450"); if (!r || !host.isConnected || over) return;
    const u=r.best; const m=game.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}); last={from:m.from,to:m.to}; sync(board,game,last);
    busy=false; if (judge()) return; if (over) return;
    board.o.movable=uc; setStatus(status,"info","Твой ход.");
  }
  async function hint(){
    if (busy||over) return; const r=await Engine.run(game.fen(),"go movetime 600"); if (!r||!r.best) return;
    hintN++; board.mark([r.best.slice(0,2)]); setStatus(status,"warn","Подсказка: най-добрият ход е с фигурата на маркираното поле.");
  }
  playable(board, game, uc, mv=>{
    if (busy||over) return; const m=game.move(mv); if (!m) return; userMoves++; counter.textContent=userMoves; board.mark([]);
    last={from:m.from,to:m.to}; sync(board,game,last);
    if (judge()) return; if (over) return; reply();
  });
  host.append(trainLayout([bel],[
    h("div",{class:"pcard"},
      h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"eyebrow"},"Срещу Stockfish"), h("span",{class:"row",style:"gap:6px"}, h("span",{class:"muted small"},"Ходове"), counter)),
      prompt(uc, E.sub), h("p",{class:"muted small"},goalTxt), status, tip, actions),
    after]));
  sync(board,game,null,false);
  Engine.init().then(ok=>{ if (!ok) setStatus(status,"bad","Енджинът не се зареди."); });
}

/* ============ coordinates trainer ============ */
function vCoords(app){
  app.append(topbar("Координати","train")); const host=h("div"); app.append(host);
  let orient="w";
  const intro=()=>{ host.innerHTML=""; const seg=h("div",{class:"seg"},["w","b"].map(c=>h("button",{"aria-pressed":String(orient===c),onclick:(e)=>{ orient=c; seg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===e.currentTarget))); }}, c==="w"?"От белите":"От черните")));
    host.append(h("div",{class:"result"}, resultArt("grid","teal"), h("span",{class:"chip"}, icon("timer"), "30 секунди"), h("div",{class:"big"},"Координати"),
      h("p",{class:"muted",style:"max-width:46ch"},"Показвам име на поле, ти го натискаш на дъската. Бързото намиране на полетата помага да четеш нотация и да смяташ варианти наум."),
      seg, h("p",null,h("span",{class:"muted"},"Рекорд: "),h("b",{class:"num",style:"font-size:1.2rem"},S.coords.best||0)),
      h("button",{class:"btn primary big",onclick:start}, icon("play"), "Старт"))); };
  function start(){
    host.innerHTML=""; let score=0, t=30, target=null, over=false;
    const bel=h("div"); const board=new Board(bel,{orientation:orient}); board.setFen("8/8/8/8/8/8/8/8 w - - 0 1", null);
    bel.querySelectorAll(".coord").forEach(x=>x.remove());
    const big=h("div",{class:"num",style:"font-size:3.2rem;text-align:center;font-family:var(--f-mono)"}); const sc=h("b",{class:"num"},"0"); const tl=h("b",{class:"num"},"30");
    const pick=()=>{ let s; do { s="abcdefgh"[Math.floor(Math.random()*8)]+(1+Math.floor(Math.random()*8)); } while (s===target); target=s; big.textContent=s; };
    bel.addEventListener("pointerdown", e=>{ if (over) return; const s=board.sqAt(e.clientX,e.clientY); if (!s) return;
      if (s===target){ score++; sc.textContent=score; const d=board.sq[s]; d.classList.remove("okflash"); void d.offsetWidth; d.classList.add("okflash"); pick(); }
      else { board.flashBad(s); Sound.play("bad"); } });
    const iv=setInterval(()=>{ t--; tl.textContent=t; if (t<=0) end(); },1000); onLeave(()=>clearInterval(iv));
    function end(){ over=true; clearInterval(iv); const rec=score>(S.coords.best||0); if (rec) S.coords.best=score; markDay(); save(); award(Math.min(30,score)); if (rec&&score) confetti();
      host.innerHTML=""; host.append(h("div",{class:"result"}, rec&&score?h("span",{class:"chip gold"},"Нов рекорд!"):null, h("div",{class:"big"},score), h("p",{class:"muted"},`${plural(score,"поле","полета")} за 30 секунди. Рекорд: ${S.coords.best}.`), h("div",{class:"row",style:"justify-content:center"}, h("button",{class:"btn primary big",onclick:start},"Пак"), h("button",{class:"btn big",onclick:intro},"Смени страната")))); }
    host.append(trainLayout([bel],[h("div",{class:"pcard"}, h("span",{class:"eyebrow"},"Намери полето"), big, h("div",{class:"row",style:"justify-content:space-between"}, h("span",{class:"row"},h("span",{class:"muted small"},"Точни"),sc), h("span",{class:"row"},h("span",{class:"muted small"},"Секунди"),tl)))]));
    pick();
  }
  intro();
}

/* ============ preferences ============ */
function vPrefs(app){
  app.append(topbar("Настройки", "home"));
  const soundChk=h("input",{type:"checkbox",id:"snd",checked:!!S.set.sound,onchange:()=>{ S.set.sound=soundChk.checked; save(); if (S.set.sound){ Sound.unlock(); Sound.play("move"); } }});
  const sw=h("div",{class:"swatches"}, Object.entries(BOARDS).map(([k,b])=>h("button",{class:"swatch","aria-label":"Дъска: "+b[2],title:b[2],"aria-pressed":String(S.set.board===k),onclick:(e)=>{ const me=e.currentTarget; S.set.board=k; save(); applySettings(); sw.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===me))); }}, h("i",{style:`background:${b[0]}`}),h("i",{style:`background:${b[1]}`}),h("i",{style:`background:${b[1]}`}),h("i",{style:`background:${b[0]}`}))));
  const lv=(S.onb&&S.onb.lvl)||"basic";
  const lseg=h("div",{class:"seg"}, [["new","Начинаещ"],["basic","Любител"],["club","Клубен"]].map(([k,t])=>h("button",{"aria-pressed":String(lv===k),onclick:(e)=>{ S.onb=Object.assign(S.onb||{}, {lvl:k}); save(); lseg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===e.currentTarget))); toast("Нивото е запазено"); }}, t)));
  app.append(h("div",{class:"stack",style:"gap:16px;max-width:640px;margin:0 auto"},
    h("div",{class:"card stack"}, h("h3",null,"Твоето ниво"), h("p",{class:"muted small"},"Определя от кой урок започва пътят и колко трудни са първите пъзели."), lseg,
      h("button",{class:"btn",style:"align-self:flex-start",onclick:()=>go("start")},"Направи теста отново")),
    (()=>{ const v=S.set.think||"auto"; const tseg=h("div",{class:"seg"}, [["auto","Автоматично"],["on","Винаги"],["off","Изключен"]].map(([k,t])=>h("button",{"aria-pressed":String(v===k),onclick:(e)=>{ S.set.think=k; save(); tseg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===e.currentTarget))); }}, t)));
      return h("div",{class:"card stack"}, h("h3",null,"Режим „Мислене“"), h("p",{class:"muted small"},"Преди хода в пъзел отмяташ три въпроса: шахове, взимания, заплахи. Автоматично се включва, ако бързаш и грешиш."), tseg); })(),
    (()=>{ const box=h("div",{class:"pieceset"}, h("span",{class:"muted small"},"Зареждам комплектите..."));
      const draw=()=>{ const cur=S.set.pieces||"maestro"; box.innerHTML="";
        Object.entries(PIECE_NAMES).forEach(([k,t])=>{ const st=p=>!PIECE_SETS[k] ? "" : `background-image:url(data:image/svg+xml;base64,${PIECE_SETS[k][p]})`;
          box.append(h("button",{class:"psw","aria-pressed":String(cur===k),onclick:()=>{ S.set.pieces=k; save(); applyPieces(); draw(); }}, h("span",{class:"pv"}, h("i",{class:"pc wN",style:st("wN")}), h("i",{class:"pc bK",style:st("bK")})), h("small",null,t))); }); };
      loadMorePieces().then(draw);
      return h("div",{class:"card stack"}, h("h3",null,"Фигури"), box); })(),
    h("div",{class:"card stack"}, h("h3",null,"Звук"), h("label",{class:"switch",for:"snd"}, h("span",null,"Звуци при ход и резултат"), soundChk)),
    h("div",{class:"card stack"}, h("h3",null,"Цвят на дъската"), sw),
    (()=>{ const nameIn=h("input",{type:"text",id:"uname",value:S.set.name||"",placeholder:"Как да те наричам?",maxlength:"30",style:"width:100%",onchange:()=>{ S.set.name=nameIn.value.trim().slice(0,30); save(); if (S.set.name) viewerName=S.set.name; toast("Името е запазено"); }});
      return h("div",{class:"card stack"}, h("h3",null,"Твоето име"), h("label",{class:"field",for:"uname"}, h("span",null,"Показва се в поздрава на началния екран"), nameIn)); })(),
    transferCard(),
    window.PWA ? null : h("div",{class:"card stack"}, h("h3",null,"Приложение за телефона"),
      h("p",{class:"muted small"},"Същото приложение като отделна иконка на телефона, което работи и без интернет. Отвори линка в Safari, натисни „Сподели“ и „Добави към началния екран“. После пренеси прогреса си с кода по-горе."),
      h("a",{class:"btn",style:"align-self:flex-start",href:"https://vipnick82.github.io/chess-master/",target:"_blank",rel:"noopener"},"vipnick82.github.io/chess-master/")),
    h("div",{class:"card stack"}, h("h3",null,"Управление с клавиатура"), h("p",{class:"muted small"},"Натисни Tab, докато дъската се огради. Стрелките местят курсора, Enter избира фигура и поле. В уроците ← и → вървят напред и назад."))));
}

/* ============ moving progress between the Claude page and the phone app ============ */
function transferCard(){
  const out=h("textarea",{id:"expcode",readonly:true,hidden:true,style:"min-height:70px"}); const inp=h("textarea",{id:"impcode",placeholder:"Постави тук кода от другата версия",style:"min-height:70px"}); const msg=h("div");
  const say=(k,t)=>{ msg.innerHTML=""; msg.append(h("div",{class:"status "+k},t)); };
  const copyBtn=h("button",{class:"btn",onclick:async()=>{
    const code="CM1:"+btoa(unescape(encodeURIComponent(JSON.stringify(S)))); out.value=code; out.hidden=false;
    try { await navigator.clipboard.writeText(code); say("good","Кодът е копиран. Постави го в другата версия, в „Настройки“ → „Пренеси прогреса“."); }
    catch(e){ out.focus(); out.select(); say("warn","Маркирах кода. Копирай го ръчно и го постави в другата версия."); } }}, icon("arrow"), "Копирай прогреса");
  let armed=false;
  const loadBtn=h("button",{class:"btn primary",style:"align-self:flex-start",onclick:()=>{
    let data=null; try { data=JSON.parse(decodeURIComponent(escape(atob(inp.value.trim().replace(/^CM1:/,""))))); } catch(e){}
    if (!data || !data.puz || typeof data.puz.rating!=="number"){ say("bad","Кодът не е разпознат. Копирай го отново целия и опитай пак."); return; }
    if (!armed){ armed=true; loadBtn.textContent="Натисни пак, за да замениш прогреса тук"; say("warn",`В кода има ниво с ${Math.round(data.xp||0)} точки и рейтинг ${Math.round(data.puz.rating)}. Прогресът на това устройство ще бъде заменен.`); return; }
    S=Object.assign(blankState(), data); migrate(); S.updatedAt=Date.now(); initXp(); save(); applySettings(); applyPieces(); toast("Прогресът е пренесен"); go("home"); }}, "Зареди прогреса");
  return h("div",{class:"card stack"}, h("h3",null,"Пренеси прогреса"),
    h("p",{class:"muted small"},"Така местиш нивото, уроците и статистиката между версията в Claude и приложението на телефона."),
    h("div",{class:"row"}, copyBtn), out,
    h("label",{class:"field",for:"impcode"}, h("span",null,"Код от другата версия"), inp), loadBtn, msg);
}
Object.assign(VIEWS, {start:vStart, pstreak:vPStreak, endgames:vEndgames, endgame:vEndgame, coords:vCoords, prefs:vPrefs});
Object.assign(TAB, {start:"home", pstreak:"train", endgames:"train", endgame:"train", coords:"train", prefs:"home"});
["start","pstreak","endgames","endgame","coords","prefs"].forEach(v=>FOCUS.add(v));
