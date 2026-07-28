/* ============================================================
   The Life I'm Building — a calm personal operating system.
   All data lives on this device only. No accounts, no servers.
   ============================================================ */

/* ---------- storage ---------- */
const DB = {
  get(k, fb){ try{ const v = localStorage.getItem('intotheday:'+k); return v===null ? fb : JSON.parse(v); }catch(e){ return fb; } },
  set(k, v){ try{ localStorage.setItem('intotheday:'+k, JSON.stringify(v)); }catch(e){ console.error('save failed', k, e); } },
  del(k){ try{ localStorage.removeItem('intotheday:'+k); }catch(e){} }
};
if(navigator.storage && navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); }
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js').catch(()=>{}); });
}

/* ---------- tiny helpers ---------- */
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function dateKey(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function prettyDate(){ return new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'}); }
function hourNow(){ return new Date().getHours(); }
function uid(){ return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function weekDates(offset){
  if(offset===undefined) offset=0;
  const d=new Date(); const day=(d.getDay()+6)%7;
  const mon=new Date(d); mon.setDate(d.getDate()-day+offset*7); mon.setHours(0,0,0,0);
  const out=[]; for(let i=0;i<7;i++){ const x=new Date(mon); x.setDate(mon.getDate()+i); out.push(dateKey(x)); }
  return out;
}
function fortnightKey(){ return 'f'+Math.floor(Date.now()/(1000*60*60*24*14)); }
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('on');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'), 2600);
}

/* ---------- identity lines (one greets you each day) ---------- */
const IDENTITIES = [
  'I am someone who gets out of bed and starts the day.',
  'I am someone who protects her mornings.',
  'I am someone who moves for strength, not punishment.',
  'I am someone who stretches because her body needs care.',
  'I am someone who returns to the water.',
  'I am someone who uses the pool that is already in her building.',
  'I am someone who builds strength slowly and consistently.',
  'I am someone who recovers after demanding workdays.',
  'I am someone who protects her evenings.',
  'I am someone who sketches and notices beauty.',
  'I am someone who captures ideas before they disappear.',
  'I am someone who makes her small apartment support her life.',
  'I am someone who looks at her money instead of avoiding it.',
  'I am someone who plans joy, not just responsibilities.',
  'I am someone who parks tomorrow before bed.',
  'I am someone who builds a future beyond survival.',
  'I am someone who comes back after a bad day.',
  'I am someone who builds self-trust through small repeated actions.'
];
/* ---------- personal constitution ----------
   Placeholder articles drawn from our conversation. They are meant to be
   replaced with the real articles from Megan's own constitution project —
   editable in-app on the "My Constitution" screen. Each article's `ev`
   lists the habit ids that count as evidence toward it, so every tick
   quietly builds the identity it belongs to. */
const DEFAULT_CONSTITUTION = [
  {id:'better',     text:'I leave things better than I found them.', ev:['sketch','notice','homeidea']},
  {id:'considered', text:'I have chosen a considered life over a merely secure one — and I let myself enjoy it now.', ev:['joy']},
  {id:'sustain',    text:'I work in a way my body can sustain. Movement is for strength, not punishment.', ev:['mstretch','stretch','reset','legsup','hips','winddown','swim','strength']},
  {id:'number',     text:'I look at the number. Money is information, not fear.', ev:['money','moneyweek']},
  {id:'protect',    text:'I protect my mornings, and I let my evenings end.', ev:['noscroll','land','close','park']},
  {id:'forme',      text:'I am learning to fight for myself as fiercely as I fight for others.', ev:['returned']},
  {id:'trust',      text:'I build self-trust through small, repeated, real actions.', ev:[]}
];
const OLD_CONST_IDS = 'mornings,body,water,land,create,money,joy,park,return,trust';
function identityToday(){
  const arts = (S.constitution && S.constitution.length) ? S.constitution : null;
  const d=new Date();
  const doy=Math.floor((d - new Date(d.getFullYear(),0,0))/86400000);
  if(arts) return arts[doy % arts.length].text;
  return IDENTITIES[doy % IDENTITIES.length];
}

/* ---------- tone ---------- */
function tone(v){ // v = {soft, direct, firm}
  const t=(S.settings.tone)||'firm';
  return v[t] || v.firm || v.direct || v.soft;
}

/* ---------- default habits (Habit Design sample data) ---------- */
const DEFAULT_HABITS = [
  {id:'noscroll', area:'Morning', name:'Get out of bed without scrolling',
   identity:'I am someone who protects her mornings.',
   cue:'Waking up', stack:'When I wake up, I will sit up and put my feet on the floor.',
   tiny:'Sit up and put feet on the floor.', full:'Get up, drink water, open curtains, start the day.',
   low:'Sit up. That is all for now.', recovery:'If I have already scrolled, notice it and stand up now.',
   env:'Put the phone across the room before bed.', done:'You interrupted the scroll. That counts.'},
  {id:'mstretch', area:'Morning', name:'Morning stretch',
   identity:'I am someone who cares for her body before the day takes over.',
   cue:'Making coffee', stack:'When I make coffee, I will stretch for five minutes.',
   tiny:'One stretch.', full:'Five to ten minutes of mobility.',
   low:'Stretch while sitting on the edge of the bed.', recovery:'Stretch after shower or before leaving.',
   env:'Leave the stretch mat visible.', done:'Your body gets a say in the morning too.'},
  {id:'stretch', area:'Body care', name:'Evening stretch',
   identity:'I am someone who gives her body something back after work.',
   cue:'Getting home', stack:'When I get home from work, I will change clothes before my phone.',
   tiny:'One hip or hamstring stretch.', full:'Fifteen minutes of stretching.',
   low:'Legs up the wall for two minutes.', recovery:'One stretch before bed.',
   env:'Leave the stretch mat where I can see it from the couch.', done:'This is care, not punishment.'},
  {id:'legsup', area:'Body care', name:'Legs up the wall',
   identity:'I am someone who lets her nervous system land.',
   cue:'Feeling wrung out', stack:'When I feel too tired to stretch, I will do legs up the wall.',
   tiny:'Two minutes.', full:'Ten minutes.',
   low:'Lie down and breathe.', recovery:'Lie down and breathe.',
   env:'Keep a clear patch of wall by the bed.', done:'You are allowed to land.'},
  {id:'swim', area:'Swim & strength', name:'Swim downstairs',
   identity:'I am someone who returns to the water.',
   cue:'Bathers where I can see them', stack:'When I want to swim, I will put bathers on and go downstairs.',
   tiny:'Put bathers on and go downstairs.', full:'Go downstairs and swim.',
   low:'Get in the water for ten minutes.', recovery:'Put towel and bathers where I can see them, and choose the next swim time.',
   env:'Pack the swim bag the night before and leave it by the door.', done:'You got in the water. That counts.'},
  {id:'strength', area:'Swim & strength', name:'Gym downstairs',
   identity:'I am someone who builds strength slowly.',
   cue:'Gym clothes visible', stack:'When I want to use the gym, I will go downstairs and do one set.',
   tiny:'Go downstairs and do one set.', full:'A simple strength session in the building gym.',
   low:'One machine, one exercise, or five minutes.', recovery:'Put gym clothes where I can see them.',
   env:'Leave gym clothes and shoes out where I can see them.', done:'One set is still a vote for strength.'},
  {id:'land', area:'After work', name:'Land after work',
   identity:'I am someone who lets work end.',
   cue:'Walking in the front door', stack:'When I get home from work, I will change clothes and land.',
   tiny:'Change clothes.', full:'Change clothes, drink water, eat or shower, stretch or rest.',
   low:'Sit down without scrolling for two minutes.', recovery:'Choose one kind, useful action.',
   env:'Leave comfortable clothes out before leaving for work.', done:'You are allowed to land.'},
  {id:'close', area:'Evening', name:"Choose tomorrow's top 3",
   identity:'I am someone who parks tomorrow before bed.',
   cue:'Brushing teeth', stack:"After I brush my teeth, I will choose tomorrow's top 3.",
   tiny:'Choose one priority.', full:'Choose top 3 priorities and the first tiny action.',
   low:'Write down what is still in my head.', recovery:"Park everything and choose only tomorrow's first action.",
   env:"Write the first priority where I'll see it in the morning.", done:'Tomorrow is held. You do not have to hold it in bed.'},
  {id:'park', area:'Evening', name:'Parking lot',
   identity:'I am someone who captures thoughts instead of carrying them.',
   cue:'Tomorrow circling in my head', stack:'When tomorrow is circling in my head, I will open the parking lot and park it.',
   tiny:'Add one thought.', full:'Add thoughts and sort them into tomorrow, later, or not urgent.',
   low:'Dump everything without sorting.', recovery:'Add one thing and close the app.',
   env:'Keep the app on the first home-screen page.', done:'Captured means you can stop holding it.'},
  {id:'sketch', area:'Creative', name:'Five-minute sketch',
   identity:'I am someone who sketches ideas before they disappear.',
   cue:'Saving an inspiration image', stack:'When I save an interiors image, I will sketch one detail.',
   tiny:'One line or shape.', full:'Five to twenty minutes sketching.',
   low:'One line. Really.', recovery:'Save one reference and write one note.',
   env:'Leave the sketchbook open on the table, pencil on top.', done:'You are building your eye.'},
  {id:'notice', area:'Creative', name:'Notice beauty',
   identity:'I am someone who notices materials, plants, light and spaces.',
   cue:'Walking anywhere', stack:'When something catches my eye, I will capture it before it disappears.',
   tiny:'Photograph one texture, shadow, tile or plant.', full:'Capture and describe one idea.',
   low:'Just look at it properly for ten seconds.', recovery:'Write one sentence about something you noticed.',
   env:'Keep the camera on the lock screen.', done:'Noticing is part of the work.'},
  {id:'homeidea', area:'Home', name:'Home idea capture',
   identity:'I am someone who makes her home support her life.',
   cue:'Something at home annoys me', stack:'When something at home annoys me, I will note it instead of stewing.',
   tiny:'Note one annoyance or idea.', full:'Sketch or save one apartment improvement.',
   low:'One word is enough to hold it.', recovery:'Add one bathroom, lighting or storage idea.',
   env:'Keep the home ideas list one tap away.', done:'You captured it. You do not have to solve it today.'},
  {id:'money', area:'Money', name:'Money check',
   identity:'I am someone who looks at the number.',
   cue:'Feeling anxious about money', stack:'When I feel anxious about money, I will look at one actual number.',
   tiny:'Open one account and look.', full:'Check bills, mortgage, spending and upcoming payments.',
   low:'Look at the balance. Nothing else.', recovery:'Confirm only the bills and mortgage setup.',
   env:'Keep money notes in one place, not five.', done:'The number is information.'},
  {id:'moneyweek', area:'Money', name:'Weekly money calm',
   identity:'I am someone who chooses clarity over fear.',
   cue:'Weekly reset', stack:'When I do my weekly reset, I will choose one money action.',
   tiny:'Write down one upcoming payment.', full:'Review bills, mortgage, spending and savings.',
   low:'Choose one thing needing attention.', recovery:'Choose one thing needing attention.',
   env:'Put bills in one physical spot.', done:'Clarity first. Decisions second.'},
  {id:'joy', area:'Joy', name:'Plan one good thing',
   identity:'I am someone who puts joy into the week on purpose.',
   cue:'Feeling flat', stack:'When I feel flat, I will plan one small thing to look forward to.',
   tiny:'Write down one thing to look forward to.', full:'Plan one solo, social, creative or beautiful thing.',
   low:'Choose one small pleasure for tomorrow.', recovery:'Choose one small pleasure for tomorrow.',
   env:'Keep a visible joy list.', done:'This is part of having a life.'}
];

/* ---------- categories ---------- */
const PARK_CATS = ['Tomorrow','Later this week','Money','Home','Body','Family','Creative','Work thought','Joy idea','Not urgent'];
const CREATIVE_CATS = ['Interiors','Landscape ideas','Planting combinations','Materials','Colour','Lighting','Bathroom ideas','Storage ideas','Tile ideas','Mirror & light','Gardens to visit','Form & Foliage','Textures','Shadows','Small apartment','Courtyards'];
const HOME_CATS = ['Bathroom','Lighting','Storage','Tiles','Mirrors','Small apartment','Kitchen / dining','Bedroom','Calm home','Repairs','Inspiration','Budget thought','Future home'];
const JOY_CATS = ['Food','Gardens','Interiors','Art','Friends','Family','Home','Beauty','Learning','Nature','Swimming','Solo time','Small adventures','Markets','Nurseries','Galleries','Theatre','Books','Rest'];

/* ---------- seed sample data (first run only) ---------- */
function ensureSeed(){
  if(DB.get('seeded')) return;
  if(!DB.get('parking')) DB.set('parking', [
    {id:uid(), text:'Ring the strata about the bathroom fan', cat:'Home', done:false},
    {id:uid(), text:"Check the date of Mum's next appointment", cat:'Family', done:false},
    {id:uid(), text:'Electricity bill lands this fortnight', cat:'Money', done:false},
    {id:uid(), text:'That rostering thought — it can wait until my shift', cat:'Work thought', done:false},
    {id:uid(), text:'Look up what’s on at the NGV this month', cat:'Joy idea', done:false}
  ]);
  if(!DB.get('ideasCreative')) DB.set('ideasCreative', [
    {id:uid(), text:'Zellige tiles in eucalyptus green — bathroom splashback?', cat:'Tile ideas', date:todayStr()},
    {id:uid(), text:'Planting combo: correa, lomandra, silver spear — takes wind, soft movement', cat:'Planting combinations', date:todayStr()},
    {id:uid(), text:'The shadow the tram wires throw at dusk. Sketch it.', cat:'Shadows', date:todayStr()}
  ]);
  if(!DB.get('ideasHome')) DB.set('ideasHome', [
    {id:uid(), text:'Keep the big mirror — add a slim shelf under it and a warm sconce either side', cat:'Mirrors', date:todayStr()},
    {id:uid(), text:'Baskets under the bench for the linen overflow', cat:'Storage', date:todayStr()},
    {id:uid(), text:'Warm dimmable bulb for the hallway — the white one is hostile at 10pm', cat:'Lighting', date:todayStr()}
  ]);
  if(!DB.get('joyList')) DB.set('joyList', [
    {id:uid(), text:'Saturday breakfast at South Melbourne Market — coffee and flowers', cat:'Markets', done:false},
    {id:uid(), text:'Heide — gallery and the sculpture garden', cat:'Gardens', done:false},
    {id:uid(), text:'A quiet weekday hour at the NGV', cat:'Galleries', done:false},
    {id:uid(), text:'See what’s on at Buxton Contemporary — ten minutes’ walk away', cat:'Art', done:false}
  ]);
  if(!DB.get('moneyData')) DB.set('moneyData', {
    upcoming:[
      {id:uid(), name:'Electricity', amount:180, when:'This fortnight'},
      {id:uid(), name:'Council rates', amount:210, when:'Next month'},
      {id:uid(), name:'Phone', amount:49, when:'Monthly'}
    ],
    confirms:{}, looks:[], action:''
  });
  DB.set('seeded', 1);
}
/* One-time fix for earlier sample data that guessed wrong:
   right market, no phantom coffee strip, no tennis without a partner. */
function fixSeeds(){
  if(DB.get('seedfix1')) return;
  let joy = DB.get('joyList', null);
  if(joy){
    const swap = {
      'Early Saturday at Queen Vic Market': 'Saturday breakfast at South Melbourne Market — coffee and flowers',
      'Morning swim, then a proper coffee on Southbank Boulevard': 'Morning swim, then breakfast at South Melbourne Market'
    };
    joy = joy.filter(j=>j.text!=='Book a tennis hit');
    joy.forEach(j=>{ if(swap[j.text]) j.text = swap[j.text]; });
    DB.set('joyList', joy);
  }
  DB.set('seedfix1', 1);
}

/* ---------- state ---------- */
let S = {};
function loadState(){
  S.settings = Object.assign({
    name:'Megan', tone:'firm',
    workdays:['Wed','Thu','Fri','Sat','Sun'],
    resetDay:'Mon', reviewDay:1,
    bills:530, mortgage:800
  }, DB.get('settings', {}));
  S.habits = DB.get('habits', null) || DEFAULT_HABITS.map(h=>Object.assign({},h));
  S.tracking = DB.get('tracking', {});
  S.parking = DB.get('parking', []);
  S.ideasCreative = DB.get('ideasCreative', []);
  S.ideasHome = DB.get('ideasHome', []);
  S.joyList = DB.get('joyList', []);
  S.money = DB.get('moneyData', {upcoming:[],confirms:{},looks:[],action:''});
  S.weekly = DB.get('weekly', {});
  S.monthly = DB.get('monthly', {});
  S.constitution = DB.get('constitution', DEFAULT_CONSTITUTION.map(a=>Object.assign({},a)));
  S.constitutionDoc = DB.get('constitutionDoc', '');
  // upgrade untouched placeholder vows to the values-based set
  if(S.constitution.map(a=>a.id).join(',')===OLD_CONST_IDS){
    S.constitution = DEFAULT_CONSTITUTION.map(a=>Object.assign({},a));
    DB.set('constitution', S.constitution);
  }
  S.planToday = DB.get('plan_today', null);
  S.planTomorrow = DB.get('plan_tomorrow', null);
}
function saveHabits(){ DB.set('habits', S.habits); }

/* ---------- day rollover ----------
   New day: last night's plan becomes today's, the day resets gently.
   Hospitality shifts move around — if last night's close named a start
   time, the whole day reshapes around it. */
function rollover(){
  const ds = DB.get('dayState', null);
  const today = todayStr();
  if(!ds || ds.date !== today){
    const plan = DB.get('plan_tomorrow', null);
    if(plan){ DB.set('plan_today', plan); DB.del('plan_tomorrow'); }
    S.day = {date:today, dayType:null, shiftStart:null, lowEnergy:false, morningDone:false, landed:false, closed:false, returned:false};
    // remember when yesterday ended, so a late-close/early-start turnaround is recognised
    S.day.prevShiftEnd = (ds && ds.shiftStart!=null) ? ds.shiftStart+8 : null;
    if(plan && plan.shift!=null && plan.shift!==''){
      S.day.shiftStart = plan.shift;
      S.day.dayType = 'work';
    } else if(plan && plan.dayOff){
      S.day.dayType = 'off';
    } else {
      const wd = new Date().toLocaleDateString('en-AU',{weekday:'short'});
      S.day.dayType = (S.settings.workdays||[]).includes(wd) ? 'work' : 'off';
      S.day.guessed = true;
    }
    DB.set('dayState', S.day);
  } else {
    S.day = ds;
  }
  S.planToday = DB.get('plan_today', null);
  S.planTomorrow = DB.get('plan_tomorrow', null);
}
function saveDay(){ DB.set('dayState', S.day); }

/* ---------- shifts (no 9-to-5 here) ---------- */
const SHIFT_CHOICES = [[9.5,'9:30'],[10,'10am'],[11,'11am'],[12,'12pm'],[14,'2pm'],[15,'3pm']];
function fmtHour(h){
  if(h==null) return '';
  const hh=Math.floor(h), mm=Math.round((h-hh)*60);
  const ap=hh>=12?'pm':'am'; const h12=((hh+11)%12)+1;
  return h12+(mm?':'+String(mm).padStart(2,'0'):'')+ap;
}
function setShift(h){
  S.day.shiftStart = (S.day.shiftStart===h) ? null : h;
  if(S.day.shiftStart!=null) S.day.dayType='work';
  saveDay(); render();
}
function shiftEnd(){ return S.day.shiftStart==null ? null : S.day.shiftStart+8; }
/* Closed at 11pm, opening at 10am: a turnaround. The app's job on these
   mornings is getting you moving with the smallest honest versions. */
function isTurnaround(){
  return S.day.prevShiftEnd!=null && S.day.prevShiftEnd>=22
      && S.day.shiftStart!=null && S.day.shiftStart<=11.5;
}
function effectiveLow(){ return S.day.lowEnergy || isTurnaround(); }

/* ---------- kept promises (the day's collected achievements) ----------
   Every meaningful tick anywhere in the app lands here, so there is one
   place that fills up with evidence of what you did today. */
function keptKey(){ return 'kept:'+todayStr(); }
function keptToday(){ return DB.get(keptKey(), []); }
function markKept(id, label){
  const arr = keptToday();
  if(!arr.some(k=>k.id===id)){ arr.push({id, label: label||id}); DB.set(keptKey(), arr); return true; }
  return false;
}
function unmarkKept(id){ DB.set(keptKey(), keptToday().filter(k=>k.id!==id)); }

/* ---------- habit logging ---------- */
function logHabit(id, label){
  const t = todayStr();
  if(!S.tracking[t]) S.tracking[t] = {};
  S.tracking[t][id] = true;
  DB.set('tracking', S.tracking);
  if(label) markKept(id, label);
}
function loggedToday(id){ const t=S.tracking[todayStr()]; return !!(t && t[id]); }
function habit(id){ return S.habits.find(h=>h.id===id); }
function verOn(id, vi){ const t=S.tracking[todayStr()]; return !!(t && t[id+'_v']===vi+1); }
function markVersion(id, vi){
  if(vi===undefined) return;
  const t=todayStr();
  if(!S.tracking[t]) S.tracking[t]={};
  S.tracking[t][id+'_v']=vi+1;
  DB.set('tracking', S.tracking);
}
function completeHabit(id, vi){
  const h = habit(id);
  logHabit(id, h ? h.name : 'Kept a promise');
  markVersion(id, vi);
  toast(h ? h.done : 'That counts.');
  render();
}

/* ============================================================
   ROUTER
   ============================================================ */
const ROUTES = {};
function go(id){ location.hash = '#/'+id; }
function currentRoute(){
  const h = location.hash.replace(/^#\/?/, '');
  return ROUTES[h] ? h : 'home';
}
function render(){
  const r = currentRoute();
  document.getElementById('view').innerHTML = ROUTES[r]();
  window.scrollTo(0,0);
  if(r==='home') drawSprig();
  const tb=document.getElementById('tabbar');
  if(tb){
    tb.classList.remove('hidden');
    tb.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.r===r));
  }
}
window.addEventListener('hashchange', render);

function shead(title, intro){
  return `<div class="shead"><button class="back" onclick="go('home')"><span>&lsaquo;</span> Today</button></div>
    <h1 class="stitle">${esc(title)}</h1>
    ${intro?`<p class="sintro">${intro}</p>`:''}`;
}
function tickSvg(){ return '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#F3F5EC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }

/* ============================================================
   1. HOME / TODAY
   ============================================================ */
ROUTES.home = function(){
  const h = hourNow();
  const g = h<12 ? 'Good morning,' : h<17 ? 'Good afternoon,' : 'Good evening,';
  const plan = S.planToday;
  const things = (plan && plan.things || []).filter(t=>t && t.trim());
  const work = S.day.dayType==='work';

  // --- one clear next action ---
  const next = nextAction();

  let html = `
    <div class="date">${prettyDate()}${S.day.lowEnergy?' · tired day':''}</div>
    <h1 class="greet">${g} <em>${esc(S.settings.name)}</em></h1>
    <p class="identity" onclick="go('constitution')" style="cursor:pointer">${esc(identityToday())}</p>

    <div class="chips">
      <button class="chip ${work?'on':''}" onclick="setDayType('work')">Workday</button>
      <button class="chip ${!work?'on':''}" onclick="setDayType('off')">Day off</button>
      <button class="chip ${S.day.lowEnergy?'on':''}" onclick="toggleLowEnergy()">Low energy</button>
    </div>
    ${work?`<div class="chips" style="margin-top:8px">
      <span class="chip tag">Shift</span>
      ${SHIFT_CHOICES.map(c=>`<button class="chip ${S.day.shiftStart===c[0]?'on':''}" onclick="setShift(${c[0]})">${c[1]}</button>`).join('')}
    </div>
    ${isTurnaround()?`<p class="smallprint" style="margin-top:6px">Late finish, early start — a turnaround. Tiny versions carry today.</p>`
      : (S.day.shiftStart!=null && S.day.shiftStart>=12 ? `<p class="smallprint" style="margin-top:6px">Shift at ${fmtHour(S.day.shiftStart)} — the morning is yours.</p>`:'')}`:''}

    <div class="next-card">
      <div class="nk">The next small thing</div>
      <div class="nx">${next.text}</div>
      ${next.sub?`<div class="nsub">${next.sub}</div>`:''}
      <div class="btnrow">
        <button class="btn soft" onclick="go('${next.route}')">${esc(next.cta)}</button>
      </div>
    </div>`;

  // ---- today's habits: the heart of the app, tickable right here ----
  const ids = todayHabitIds();
  const doneN = ids.filter(id=>loggedToday(id)).length;
  const extraKept = keptToday().filter(k=>!ids.includes(k.id)).length;
  html += `<div class="t-label">Today's habits — votes for the life you're building</div>
    <div class="sprig-row">
      <div class="sprig-wrap" style="margin:0"><svg id="sprig" viewBox="0 0 120 150"></svg></div>
      <div class="sprig-side">
        <div class="kept-count" style="text-align:left;margin:0"><b>${doneN}</b> of ${ids.length} kept</div>
        <p class="sub" style="margin-top:4px">Each tick grows a leaf.${extraKept?`<br>+${extraKept} more kept elsewhere today.`:''}</p>
      </div>
    </div>
    <div class="list">` +
    ids.map(id=>{
      const h = habit(id) || {name:id, tiny:''};
      const on = loggedToday(id);
      const meta = id==='close'
        ? (on ? 'Tomorrow is held.' : 'Opens Evening Close — park it, then sleep.')
        : (effectiveLow() && h.low ? 'Low energy: '+h.low : 'Tiny version: '+h.tiny);
      return `<div class="item ${on?'done':''}" onclick="homeTick(event,'${id}')">
        <div class="tick">${tickSvg()}</div>
        <div class="txt"><div class="label">${esc(h.name)}</div><div class="meta">${esc(meta)}</div></div>
      </div>`;
    }).join('') + `</div>`;
  if(doneN===ids.length){
    html += `<div class="mantra">Every promise kept.<br>This is the life, being built.</div>`;
  } else {
    html += `<p class="grid-note">The tiny version counts. It keeps the habit alive.</p>`;
  }

  html += priorityBlock();
  html += swapsBlock();

  // sections hub
  const hub = [
    ['constitution','My Constitution','who I am becoming'],
    ['why','Why this works','the three books underneath'],
    ['morning','Morning Start','feet on the floor first'],
    ['body','Body Care','stretch, mobility, recovery'],
    ['move','Swim & Strength','the pool is downstairs'],
    ['recover','After Work','you are allowed to land'],
    ['close','Evening Close','park tomorrow before bed'],
    ['parking','Parking Lot','stop carrying it'],
    ['creative','Creative Practice','sketch and notice'],
    ['homeideas','Home & Ideas','make the apartment yours'],
    ['joy','Joy Plan','plan something good'],
    ['moneycalm','Money Calm','the number is information'],
    ['weekly','Weekly Reset','a kind look at the week'],
    ['monthly','Monthly Review','the bigger picture'],
    ['habits','Habit Design','make it easier'],
    ['settings','Settings','make it yours']
  ];
  html += `<div class="t-label">Everything else</div><div class="hub">` +
    hub.map(x=>`<a href="#/${x[0]}"><div class="hname">${x[1]}</div><div class="hsub">${x[2]}</div></a>`).join('') +
    `</div>
    <button class="btn ghost wide" onclick="openReset()">Reset me — I'm stuck</button>
    <p class="footer-note">This app never asks how far behind you are.<br>Only: what is the next small thing?</p>`;
  return html;
};

function nextAction(){
  const h = hourNow(), work = S.day.dayType==='work', low = effectiveLow();
  const s = work ? S.day.shiftStart : null, e = work ? shiftEnd() : null;

  // --- workday with a known shift: the day bends around it ---
  if(work && s!=null){
    if(h < s){
      const gap = s - h;
      if(!S.day.morningDone){
        if(isTurnaround())
          return {text:'Late finish, early start. Up anyway — feet on the floor.',
                  sub:'Tiny versions only today. They still count.', route:'morning', cta:'Morning Start'};
        return {text:'Feet on the floor. Then water.',
                sub:'Shift at '+fmtHour(s)+". Don't give the gap to the scroll.", route:'morning', cta:'Morning Start'};
      }
      if(gap>=3 && !loggedToday('swim') && !low)
        return {text:'The morning is yours until '+fmtHour(s)+'.', sub:'The pool, before the shift takes the day.', route:'move', cta:'Swim & Strength'};
      if(gap>=2 && !low)
        return {text:'Still '+Math.floor(gap)+' hours yours. Sketch, stretch, or one look at the money.', sub:'The gap is the life part of the day.', route:'creative', cta:'Creative Practice'};
      return {text: low ? 'One stretch. Water. Nothing heroic.' : 'One stretch before the shift.', sub:'Then go earn. The evening is already planned for.', route:'body', cta:'Body Care'};
    }
    if(h < e)
      return {text:'Two minutes: posture and breath.', sub:'Mid-shift. Release the shoulders before service takes them.', route:'body', cta:'Body Care'};
    if(!S.day.landed)
      return {text:'Shift done. Change clothes before the phone.', sub:'Landing is the whole job now.', route:'recover', cta:'After Work'};
    if(!S.day.closed)
      return {text:'Park tomorrow before bed.', sub:'Three priorities and a shift time. Then sleep.', route:'close', cta:'Evening Close'};
    return {text:'Tomorrow is held. You are done.', sub:'Phone away from the bed, if you can.', route:'close', cta:'Review tonight'};
  }

  // --- day off, or workday without a shift set yet ---
  if(h<11 && !S.day.morningDone)
    return {text: low ? 'Sit up. That is all for now.' : 'Feet on the floor. Then water.',
            sub: work ? "Set today's shift below so the day can bend around it." : "Don't negotiate with the scroll.", route:'morning', cta:'Morning Start'};
  if(h<11 && !work && !loggedToday('swim') && !low)
    return {text:'The pool is already downstairs.', sub:'Bathers on. That is the whole first step.', route:'move', cta:'Swim & Strength'};
  if(h>=11 && h<16)
    return {text: work ? 'Two minutes: posture and breath.' : (low ? 'One stretch. Or just lie on the floor.' : 'Twenty minutes for something of yours — a sketch, the pool, a corner of the apartment.'),
            sub: work ? 'Release the shoulders before service takes them.' : 'This is the life part of the day.', route: work?'body':'creative', cta: work?'Body Care':'Creative Practice'};
  if(h>=16 && h<20 && work && !S.day.landed)
    return {text:'Home soon? Change clothes before the phone.', sub:'Landing is the whole job tonight.', route:'recover', cta:'After Work'};
  if(h>=19 && !S.day.closed)
    return {text:'Park tomorrow before bed.', sub:'Three priorities. Then nothing else needs solving tonight.', route:'close', cta:'Evening Close'};
  if(S.day.closed)
    return {text:'Tomorrow is held. You are done.', sub:'Phone away from the bed, if you can.', route:'close', cta:'Review tonight'};
  return {text: low ? 'The tiny version of anything counts today.' : 'Pick one small kept promise.', sub:'', route:'body', cta:'Body Care'};
}

function setDayType(t){ S.day.dayType=t; S.day.guessed=false; saveDay(); render(); }
function toggleLowEnergy(){ S.day.lowEnergy=!S.day.lowEnergy; saveDay(); render(); }

/* ---------- today's priorities (chosen last night, tickable today) ---------- */
function priList(){ return (S.planToday && S.planToday.things || []).map(t=>(t||'').trim()).filter(Boolean); }
function priDone(i){ const t=S.tracking[todayStr()]; return !!(t && t['pri'+i]); }
function togglePri(ev, i){
  const things = priList();
  if(!things[i]) return;
  if(priDone(i)){ unlogHabit('pri'+i); render(); return; }
  logHabit('pri'+i, things[i]);
  leafBurst(ev);
  const doneN = things.filter((x,j)=> j===i || priDone(j)).length;
  toast(doneN>=things.length ? 'All of them. The day is won.' :
        doneN===2 ? 'Two down. That is momentum.' : 'One of three. Started is the hard part.');
  render();
}
function priorityBlock(){
  const things = priList();
  if(!things.length) return '';
  const plan = S.planToday;
  return `<div class="t-label">You already chose what matters today</div>
    <div class="list">` +
    things.map((t,i)=>`<div class="item ${priDone(i)?'done':''}" onclick="togglePri(event,${i})">
      <div class="tick">${tickSvg()}</div>
      <div class="txt"><div class="label">${esc(t)}</div></div>
    </div>`).join('') + `</div>
    ${plan.first && !things.every((x,i)=>priDone(i)) ? `<div class="first-action">First tiny action: <b>${esc(plan.first)}</b></div>`:''}`;
}

/* ---------- instead of the scroll: small trades from your own life ---------- */
let SWAPS_NOW = [];
function swapPool(){
  const d=new Date();
  const doy=Math.floor((d - new Date(d.getFullYear(),0,0))/86400000);
  const pool=[];
  pool.push({id:'sketch', label:CREATIVE_PROMPTS[doy % CREATIVE_PROMPTS.length], meta:'Five minutes builds the eye.', route:'creative'});
  const joy = S.joyList.find(j=>!j.done);
  if(joy) pool.push({id:'joy_nudge', label:'Move a joy plan along: '+joy.text, meta:'Book it, or just picture when.', route:'joy'});
  const hi = S.ideasHome[0];
  if(hi) pool.push({id:'home_nudge', label:'Sketch one detail of: '+hi.text, meta:'Captured ideas want ten minutes.', route:'homeideas'});
  if(!loggedToday('money')) pool.push({id:'money', label:'Look at one money number', meta:'The number is information.', route:'moneycalm'});
  pool.push(
    {id:'crawlplan', label:'Pick a street for a design crawl — Gertrude, Church, Smith', meta:'Shops as free galleries. Form & Foliage research.', route:'joy'},
    {id:'read', label:'Read ten pages', meta:'A chapter a week is a shelf a year.', route:null},
    {id:'balance', label:'Balance on one leg, thirty seconds a side', meta:'While the kettle boils — bones love load. (Unbreakable)', route:null},
    {id:'posture', label:'Two-minute posture and breath reset', meta:'Shoulders down, jaw loose. (How to Have a Good Day)', route:null}
  );
  return pool.filter(p=>!keptToday().some(k=>k.id===p.id));
}
function swapsBlock(){
  const pool = swapPool();
  if(!pool.length) return '';
  const d=new Date();
  const doy=Math.floor((d - new Date(d.getFullYear(),0,0))/86400000);
  const off=(doy*3 + Math.floor(hourNow()/4)) % pool.length;
  const n=Math.min(3, pool.length);
  SWAPS_NOW = Array.from({length:n},(_,k)=>pool[(off+k)%pool.length]);
  return `<div class="t-label">Instead of the scroll</div>
    <p class="smallprint" style="margin:0 0 4px">Phone in hand, hour going nowhere? Trade ten minutes. The swap is the trick — not willpower.</p>
    <div class="list">` +
    SWAPS_NOW.map((s,k)=>`<div class="item" onclick="swapTick(event,${k})">
      <div class="tick">${tickSvg()}</div>
      <div class="txt"><div class="label">${esc(s.label)}</div><div class="meta">${esc(s.meta)}</div></div>
      ${s.route?`<button class="mini" onclick="event.stopPropagation();go('${s.route}')" title="open">›</button>`:''}
    </div>`).join('') + `</div>`;
}
function swapTick(ev, k){
  const s = SWAPS_NOW[k]; if(!s) return;
  logHabit(s.id, s.label.length>60 ? s.label.slice(0,57)+'…' : s.label);
  leafBurst(ev);
  toast('Ten minutes you’ll remember. That counts.');
  render();
}

/* ---------- today's habits (front and centre on Home) ---------- */
function todayHabitIds(){
  const work = S.day.dayType==='work';
  if(!work) return ['noscroll','mstretch','swim','strength','sketch','close'];
  // late start = a free morning: the pool goes where the evening stretch was
  if(S.day.shiftStart!=null && S.day.shiftStart>=12)
    return ['noscroll','mstretch','swim','land','close'];
  return ['noscroll','mstretch','land','stretch','close'];
}
function unlogHabit(id){
  const t=todayStr();
  if(S.tracking[t]){ delete S.tracking[t][id]; delete S.tracking[t][id+'_v']; DB.set('tracking',S.tracking); }
  unmarkKept(id);
}
function homeTick(ev, id){
  // 'close' is a real ritual, not a checkbox — ticking it opens Evening Close
  if(id==='close'){
    if(loggedToday('close')) toast('Tomorrow is held.');
    else go('close');
    return;
  }
  if(loggedToday(id)){ unlogHabit(id); render(); return; }
  const h = habit(id);
  logHabit(id, h ? h.name : 'Kept a promise');
  leafBurst(ev);
  toast(h ? h.done : 'That counts.');
  render();
}
function leafBurst(ev){
  if(!ev || ev.clientX===undefined) return;
  const s=document.createElement('span');
  s.className='leafburst'; s.textContent='🌿';
  s.style.left=(ev.clientX-10)+'px';
  s.style.top=(ev.clientY-16)+'px';
  document.body.appendChild(s);
  setTimeout(()=>s.remove(), 950);
}

function drawSprig(){
  const svg=document.getElementById('sprig'); if(!svg) return;
  // one leaf per habit — tick it, watch it grow; keep them all and it blooms
  const ids=todayHabitIds();
  const n=ids.length;
  const doneCount=ids.filter(id=>loggedToday(id)).length;
  const allDone=doneCount===n && n>0;
  const baseX=60, baseY=145, topY=34;
  let html=`<path d="M${baseX} ${baseY} C ${baseX-10} ${baseY-40}, ${baseX+9} ${baseY-70}, ${baseX} ${topY+6}" stroke="var(--moss)" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  for(let i=0;i<n;i++){
    const frac=(i+1)/(n+1), y=baseY-frac*(baseY-topY), side=i%2===0?1:-1, cx=baseX+side*3, grown=i<doneCount, rot=side>0?38:-38;
    // outer g holds position (attribute transform); inner g takes the CSS
    // grow animation — CSS transforms would otherwise override the position
    html+=`<g transform="translate(${cx} ${y}) rotate(${rot})"><g class="leaf ${grown?'show':'hide'}">
      <path d="M0 0 C 14 -6, 30 -3, 34 4 C 28 11, 12 11, 0 0 Z" fill="${grown?'var(--leaf-bright)':'var(--sage)'}" transform="scale(${side>0?1:-1},1)"/>
      <path d="M2 1 L 28 5" stroke="rgba(35,54,42,.25)" stroke-width="1" fill="none" transform="scale(${side>0?1:-1},1)"/></g></g>`;
  }
  html+=`<g transform="translate(${baseX} ${topY})"><g class="bud ${allDone?'show':'hide'}"><circle r="7" fill="var(--leaf-bright)"/><circle r="3.4" fill="#EDE3B8"/></g></g>`;
  svg.innerHTML=html;
}

/* ============================================================
   2. MORNING START
   ============================================================ */
let morningStep = -1; // -1 = entry, 0..n = sequence
const MORNING_SEQ = [
  {t:'Sit up.', s:'Just that.'},
  {t:'Feet on the floor.', s:'The day starts when you move.'},
  {t:'Drink water.', s:'Before coffee decides everything.'},
  {t:'Open the curtains or turn on a light.', s:'Let the day in.'},
  {t:'Walk to the bathroom.', s:'You only need the next action.'},
  {t:"Choose today's first anchor.", s:'One. Not the whole list.'}
];
function msOn(i){ const t=S.tracking[todayStr()]; return !!(t && t['ms'+i]); }
function toggleMs(i){
  const t=todayStr();
  if(!S.tracking[t]) S.tracking[t]={};
  if(S.tracking[t]['ms'+i]) delete S.tracking[t]['ms'+i];
  else S.tracking[t]['ms'+i]=true;
  DB.set('tracking', S.tracking);
  if(MORNING_SEQ.every((s,j)=>S.tracking[t]['ms'+j])) morningFinish();
  render();
}
function morningFinish(){
  if(S.day.morningDone) return;
  S.day.morningDone=true; saveDay();
  logHabit('noscroll','Got up without scrolling');
  toast(tone({soft:'You are up. That is the whole victory.',
              direct:'You moved. The morning is yours now.',
              firm:'You moved before the phone did. That is evidence.'}));
}
ROUTES.morning = function(){
  const plan=S.planToday;
  const things=(plan&&plan.things||[]).filter(t=>t&&t.trim());
  let html = shead('Morning Start', isTurnaround()
    ? 'Late finish, early start. No perfect morning required — just movement. Tiny versions carry a turnaround, and they count in full.'
    : tone({
      soft:"No rush. Just the next small thing.",
      direct:"Don't negotiate with the scroll.",
      firm:"Don't negotiate with the scroll. Feet on the floor first."}));
  if(S.day.dayType==='work' && S.day.shiftStart!=null && !isTurnaround()){
    html += `<p class="smallprint" style="margin-top:2px">Shift at ${fmtHour(S.day.shiftStart)} — the time before it is yours.</p>`;
  }

  if(morningStep>=0 && morningStep<MORNING_SEQ.length){
    // optional guided mode — one step at a time, for the hardest mornings
    const s = MORNING_SEQ[morningStep];
    html += `<div class="wdots">${MORNING_SEQ.map((x,i)=>`<i class="${i<=morningStep?'on':''}"></i>`).join('')}</div>
      <div class="wq">${esc(s.t)}</div><div class="whint">${esc(s.s)}</div>`;
    if(morningStep===MORNING_SEQ.length-1 && things.length){
      html += `<div class="focus" style="margin-top:16px"><ul>${things.map((t,i)=>`<li><span>${i+1}</span>${esc(t)}</li>`).join('')}</ul></div>`;
    }
    html += `<div class="wnav">
      <button class="btn ghost" onclick="morningStep=-1;render()">Back to the list</button>
      <button class="btn" onclick="morningNext()">${morningStep===MORNING_SEQ.length-1?'Day started':'Done — next'}</button>
    </div>`;
    return html;
  }

  html += priorityBlock();

  const allDone = MORNING_SEQ.every((s,i)=>msOn(i));
  html += `<div class="t-label">Tick as you go</div><div class="list">` +
    MORNING_SEQ.map((s,i)=>`<div class="item ${msOn(i)?'done':''}" onclick="toggleMs(${i})">
      <div class="tick">${tickSvg()}</div>
      <div class="txt"><div class="label">${esc(s.t)}</div><div class="meta">${esc(s.s)}</div></div>
    </div>`).join('') + `</div>`;

  if(allDone){
    html += `<div class="mantra">${tone({
      soft:'You are up. That is the whole victory.',
      direct:'You moved. The morning is yours now.',
      firm:'You moved before the phone did. That is evidence.'})}</div>`;
  } else {
    html += `<div class="btnrow">
        <button class="btn ghost" onclick="morningScrolled()">I already scrolled</button>
        <button class="btn ghost" onclick="morningStep=0;render()">Walk me through it</button>
      </div>
      <p class="footer-note">Scrolled already? That's not failure — noticing is the interruption.<br>Come back to the life you're building.</p>`;
  }
  return html;
};
function morningNext(){
  // guided mode also ticks the list as you go
  const t=todayStr();
  if(!S.tracking[t]) S.tracking[t]={};
  S.tracking[t]['ms'+morningStep]=true;
  DB.set('tracking', S.tracking);
  morningStep++;
  if(morningStep>=MORNING_SEQ.length){ morningFinish(); morningStep=-1; }
  render();
}
function morningScrolled(){
  toast('You noticed. That is the interruption. Now feet on the floor.');
  render();
}

/* ============================================================
   3. BODY CARE
   ============================================================ */
const BODY_HABITS = [
  {id:'mstretch', name:'Morning mobility', why:'Wake the body gently.',
   full:'A ten-minute mobility sequence.', tiny:'One stretch.', low:'Stretch sitting on the edge of the bed.', recovery:'One stretch before showering.'},
  {id:'stretch', name:'Evening stretch', why:'Ease stiffness and leg pain — hips, back, hamstrings.',
   full:'Fifteen to twenty minutes of stretching.', tiny:'Hamstrings or hips only.', low:'Legs up the wall.', recovery:'One stretch before bed.'},
  {id:'reset', name:'Workday body reset', why:'Your body has worked today.',
   full:'A ten-minute stretch after work.', tiny:'Lie on the floor for two minutes.', low:'Legs up the wall.', recovery:'Stretch calves or hips before bed.'},
  {id:'legsup', name:'Legs up the wall', why:'Calm the nervous system.',
   full:'Ten minutes, breathing slowly.', tiny:'Two minutes.', low:'Lie down and breathe.', recovery:'Lie down and breathe.'},
  {id:'hips', name:'Hip & back care', why:'Support the joints hospitality leans on.',
   full:'Hip flexor + glute + lower back sequence.', tiny:'One hip flexor stretch each side.', low:'Child’s pose for one minute.', recovery:'One gentle twist lying in bed.'},
  {id:'winddown', name:'Sleep wind-down', why:'Ease the switch from doing to resting.',
   full:'Stretch, dim lights, phone away, slow breaths.', tiny:'Three deep breaths, lights down.', low:'Phone across the room. That alone.', recovery:'One deep breath before sleep. It still counts.'}
];
ROUTES.body = function(){
  let html = shead('Body Care',
    'You already walk more than 10,000 steps at work. You do not need more steps — you need care. This is recovery, mobility and strength for a body that works hard.');
  html += `<p class="smallprint">Tap the version you did — full, tiny, low-energy or recovery. Something counts.</p>`;
  html += BODY_HABITS.map(b=>versionCard(b)).join('');
  html += `<p class="footer-note">Do the version that helps tomorrow. The tiny version keeps the habit alive.<br>
    After Dr Vonda Wright's <i>Unbreakable</i>: muscle and bone are the organs of longevity —<br>strength, mobility, balance and recovery, not more steps.</p>`;
  return html;
};
function versionCard(b){
  const logged = loggedToday(b.id);
  return `<div class="card">
    <h3>${esc(b.name)}${logged?' 🌿':''}</h3>
    <div class="why">${esc(b.why)}</div>
    <div class="versions">
      ${[['Full',b.full],['Tiny',b.tiny],['Low energy',b.low],['Recovery',b.recovery]].map((v,vi)=>
        `<div class="vrow ${verOn(b.id,vi)?'logged':''}" onclick="logBody('${b.id}',${vi})">
          <span class="vtag">${v[0]}</span><span class="vtxt">${esc(v[1])}</span>
        </div>`).join('')}
    </div>
  </div>`;
}
function logBody(id, vi){
  const bn=(BODY_HABITS.find(x=>x.id===id)||{}).name;
  logHabit(id, bn||'Cared for my body');
  logHabit('stretch_any');
  markVersion(id, vi);
  const msgs = {
    mstretch:'Your body gets a say in the morning too.',
    stretch:'This is care, not punishment.',
    reset:'Your job takes enough from your body. You just gave something back.',
    legsup:'You are allowed to land.',
    hips:'Support for the joints that carry you.',
    winddown:'Sleep is being protected.'
  };
  toast(msgs[id]||'That counts.');
  render();
}

/* ============================================================
   4. SWIM & STRENGTH
   ============================================================ */
ROUTES.move = function(){
  const swimLogged = loggedToday('swim'), strLogged = loggedToday('strength');
  return shead('Swim & Strength', 'The pool is already here. The gym is already here. You only have to get downstairs.') + `

    <div class="card">
      <h3>Swim ${swimLogged?'🌿':''}</h3>
      <div class="why">Bathers on. Towel. Lift down. That is the whole start.</div>
      <div class="versions">
        <div class="vrow ${verOn('swim',0)?'logged':''}" onclick="completeHabit('swim',0)"><span class="vtag">Full</span><span class="vtxt">Go downstairs and swim.</span></div>
        <div class="vrow ${verOn('swim',1)?'logged':''}" onclick="completeHabit('swim',1)"><span class="vtag">Tiny</span><span class="vtxt">Put bathers on and go downstairs.</span></div>
        <div class="vrow ${verOn('swim',2)?'logged':''}" onclick="completeHabit('swim',2)"><span class="vtag">Low energy</span><span class="vtxt">Sit by the pool, walk in the water, or ten minutes in.</span></div>
        <div class="vrow" onclick="recoverMove('swim')"><span class="vtag">Recovery</span><span class="vtxt">Put towel and bathers where you can see them. Choose the next swim time.</span></div>
      </div>
      <p class="smallprint">What is the smallest swim that would still count? Could you just get in the water?</p>
    </div>

    <div class="card">
      <h3>Strength ${strLogged?'🌿':''}</h3>
      <div class="why">One set downstairs counts. You are building muscle by returning.</div>
      <div class="versions">
        <div class="vrow ${verOn('strength',0)?'logged':''}" onclick="completeHabit('strength',0)"><span class="vtag">Full</span><span class="vtxt">A simple strength session in the building gym.</span></div>
        <div class="vrow ${verOn('strength',1)?'logged':''}" onclick="completeHabit('strength',1)"><span class="vtag">Tiny</span><span class="vtxt">Go downstairs and do one set.</span></div>
        <div class="vrow ${verOn('strength',2)?'logged':''}" onclick="completeHabit('strength',2)"><span class="vtag">Low energy</span><span class="vtxt">One machine, one exercise, or five minutes.</span></div>
        <div class="vrow" onclick="recoverMove('strength')"><span class="vtag">Recovery</span><span class="vtxt">Put gym clothes, shoes or headphones somewhere visible.</span></div>
      </div>
      <p class="smallprint">What would make tomorrow's visit obvious? Make it too easy to refuse.</p>
    </div>

    <p class="footer-note">This is not a fitness challenge.<br>It is using what is already built into your life.</p>`;
};
function recoverMove(kind){
  toast(kind==='swim' ? 'The next swim is already easier.' : "Tomorrow's gym visit is now obvious.");
}

/* ============================================================
   5. AFTER WORK RECOVERY
   ============================================================ */
let recoverKind = null;
const RECOVER_KINDS = [
  {id:'body', label:'Body tired', steps:['Legs up the wall','A shower','One gentle stretch','Early night']},
  {id:'brain', label:'Brain tired', steps:['No more decisions tonight','Simple dinner','Phone somewhere else','Quiet']},
  {id:'emotional', label:'Emotionally overloaded', steps:['Write one sentence — just one','Three slow breaths','No fixing anything tonight','Something warm to eat or drink']},
  {id:'wired', label:'Still wired', steps:['One stretch to downshift','Tidy one surface, not the whole flat','Make one thing easier for tomorrow','Then stop']},
  {id:'spark', label:'A little spark left', steps:['Sketch for five minutes','Or ten minutes in the pool','Or one set downstairs','Then land properly']}
];
ROUTES.recover = function(){
  let html = shead('After Work Recovery', 'You are allowed to land. No walking prompts here — your shift already covered the steps.');
  const lsteps=['Put the phone down','Change clothes','Drink water','Eat something simple if needed','Shower if it helps','Five-minute body reset or legs up the wall'];
  html += `<div class="t-label">The landing sequence</div><div class="list">` +
    lsteps.map((s,i)=>`<div class="item ${landStepOn(i)?'done':''}" onclick="toggleLandStep(${i})"><div class="tick">${tickSvg()}</div><div class="txt"><div class="label">${esc(s)}</div></div></div>`).join('') + `</div>`;

  html += `<div class="t-label">What kind of day was it?</div><div class="chips">` +
    RECOVER_KINDS.map(k=>`<button class="chip ${recoverKind===k.id?'on':''}" onclick="recoverKind='${k.id}';render()">${esc(k.label)}</button>`).join('') + `</div>`;

  if(recoverKind){
    const k = RECOVER_KINDS.find(x=>x.id===recoverKind);
    html += `<div class="card"><h3>Tonight, kindly</h3>
      <div class="versions">${k.steps.map(s=>`<div class="vrow"><span class="vtxt">${esc(s)}</span></div>`).join('')}</div>
      <button class="btn wide" onclick="landed()">I've landed</button>
    </div>`;
  }
  html += `<p class="footer-note">Choose the kindest useful action. What can wait until tomorrow — can wait.<br>Do not turn the whole evening into recovery admin.</p>`;
  return html;
};
function landStepOn(i){ const t=S.tracking[todayStr()]; return !!(t && t['ls'+i]); }
function toggleLandStep(i){
  const t=todayStr();
  if(!S.tracking[t]) S.tracking[t]={};
  if(S.tracking[t]['ls'+i]) delete S.tracking[t]['ls'+i]; else S.tracking[t]['ls'+i]=true;
  DB.set('tracking',S.tracking); render();
}
function landed(){
  S.day.landed=true; saveDay();
  logHabit('land','Landed after work');
  recoverKind=null;
  toast('You are allowed to land.');
  go('home');
}

/* ============================================================
   6. EVENING CLOSE (wizard)
   ============================================================ */
let closeData = null;
ROUTES.close = function(){
  // already closed tonight → the held state, with a way back in
  if(S.day.closed && !closeData){
    const plan = S.planTomorrow || {};
    const things = (plan.things||[]).filter(t=>t&&t.trim());
    return shead('Evening Close','') + `
      <div class="mantra" style="margin-top:30px">Tomorrow is held.<br>You do not have to hold it in bed.</div>
      ${plan.shift!=null?`<p class="sub" style="text-align:center;margin-top:8px">Tomorrow's shift: ${fmtHour(plan.shift)}${plan.shift>=12?' — the morning is yours':''}.</p>`:(plan.dayOff?'<p class="sub" style="text-align:center;margin-top:8px">Tomorrow is a day off.</p>':'')}
      ${things.length?`<div class="focus" style="margin-top:18px"><ul>${things.map((t,i)=>`<li><span>${i+1}</span>${esc(t)}</li>`).join('')}</ul></div>`:''}
      ${plan.first?`<div class="first-action" style="margin-top:14px">Tomorrow's first action: <b>${esc(plan.first)}</b></div>`:''}
      <p class="footer-note">Nothing else needs solving tonight.</p>
      <button class="linklike" onclick="closeReopen()">Adjust tonight's close</button>`;
  }
  if(!closeData){
    const p = S.planTomorrow || {};
    closeData = {head:p.note||'', p:(p.things||[]).slice(0,3), first:p.first||'', parked:[], easier:[], shift:(p.shift!=null?p.shift:null)};
    while(closeData.p.length<3) closeData.p.push('');
  }
  // one calm page — fill what helps, skip what doesn't
  return shead('Evening Close', 'Practical mental unloading. Fill what helps, skip the rest — one button at the end.') + `

    <div class="t-label">Working tomorrow? What time?</div>
    <p class="smallprint" style="margin:0 0 4px">Tomorrow bends around this — a 2pm start means the morning is yours.</p>
    <div class="chips">
      ${SHIFT_CHOICES.map(c=>`<button class="chip ${closeData.shift===c[0]?'on':''}" onclick="closeSetShift(${c[0]})">${c[1]}</button>`).join('')}
      <button class="chip ${closeData.shift==='off'?'on':''}" onclick="closeSetShift('off')">Day off</button>
    </div>

    <div class="t-label">What is still in your head?</div>
    <div class="field"><textarea id="cw_head" placeholder="Everything circling — big, small, silly. Out it goes.">${esc(closeData.head)}</textarea></div>

    <div class="t-label">Tomorrow's top 3</div>
    <p class="smallprint" style="margin:0 0 8px">Three is enough. This is not tomorrow's entire life.</p>
    ${[0,1,2].map(i=>`<div class="field" style="margin-top:8px"><input type="text" id="cw_p${i}" maxlength="80" placeholder="${['The one that counts','Then this','And this'][i]}" value="${esc(closeData.p[i])}"></div>`).join('')}

    <div class="t-label">First tiny action</div>
    <div class="field" style="margin-top:6px"><input type="text" id="cw_first" maxlength="90" placeholder="e.g. Feet on the floor. Drink water." value="${esc(closeData.first)}"></div>
    <div class="chips">${['Feet on the floor. Drink water.','Bathers on, go downstairs.','One stretch before coffee.','Open the sketchbook.','Look at one money number.'].map(c=>
      `<button class="chip" onclick="closeCollect();closeData.first='${esc(c)}';render()">${esc(c)}</button>`).join('')}</div>

    <div class="t-label">Park the rest</div>
    <p class="smallprint" style="margin:0 0 4px">Captured means you can stop holding it.</p>
    <div class="addrow"><input type="text" id="cw_park" maxlength="120" placeholder="Park it here"><button class="btn" onclick="closeAddPark()">Park</button></div>
    ${closeData.parked.length?`<div style="margin-top:8px">${closeData.parked.map(p=>`<div class="entry"><div class="etxt">${esc(p)}<span class="ecat">parked for tomorrow</span></div></div>`).join('')}</div>`:''}

    <div class="t-label">Make tomorrow easier</div>
    <div class="chips">${['Phone away from the bed','Bathers and towel out','Gym clothes visible','Stretch mat visible','Sketchbook open on the table','Tomorrow’s clothes out','Keys and bag by the door','Bills in one place'].map(c=>
      `<button class="chip ${closeData.easier.includes(c)?'on':''}" onclick="closeToggleEasier('${esc(c)}')">${esc(c)}</button>`).join('')}</div>

    <button class="btn wide" onclick="closeFinish()">Close the day</button>
    <p class="footer-note">You do not have to fill all of this. One priority is a real close.<br>
    Caroline Webb, <i>How to Have a Good Day</i>: a good day is designed at its edges —<br>intentions in the morning, a clean close at night.</p>`;
};
function closeReopen(){
  const p = S.planTomorrow || {};
  closeData = {head:p.note||'', p:(p.things||[]).slice(0,3), first:p.first||'', parked:[], easier:[], shift:(p.dayOff?'off':(p.shift!=null?p.shift:null))};
  while(closeData.p.length<3) closeData.p.push('');
  render();
}
function closeCollect(){
  const g=id=>{ const e=document.getElementById(id); return e?e.value.trim():null; };
  if(g('cw_head')!==null) closeData.head=g('cw_head');
  [0,1,2].forEach(i=>{ if(g('cw_p'+i)!==null) closeData.p[i]=g('cw_p'+i); });
  if(g('cw_first')!==null) closeData.first=g('cw_first');
}
function closeAddPark(){
  closeCollect();
  const e=document.getElementById('cw_park');
  const v=e.value.trim(); if(!v) return;
  closeData.parked.push(v);
  // straight into the parking lot — held even if you fall asleep mid-close
  S.parking.unshift({id:uid(), text:v, cat:'Tomorrow', done:false});
  DB.set('parking', S.parking);
  logHabit('park','Parked a thought');
  render();
}
function closeToggleEasier(c){
  closeCollect();
  const i=closeData.easier.indexOf(c);
  if(i>=0) closeData.easier.splice(i,1); else closeData.easier.push(c);
  render();
}
function closeSetShift(v){
  closeCollect();
  closeData.shift = (closeData.shift===v) ? null : v;
  render();
}
function closeFinish(){
  closeCollect();
  // priorities + tomorrow's shift → tomorrow's plan (rollover shapes the new day)
  const shift = (closeData.shift==='off' || closeData.shift==null) ? null : closeData.shift;
  DB.set('plan_tomorrow', {things:closeData.p, first:closeData.first, note:closeData.head, shift:shift, dayOff:closeData.shift==='off'});
  S.planTomorrow = DB.get('plan_tomorrow');
  S.day.closed=true; saveDay();
  logHabit('close','Closed the day');
  closeData=null;
  toast('Tomorrow is held.');
  render();
}

/* ============================================================
   7. TOMORROW PARKING LOT
   ============================================================ */
let parkCat = 'Tomorrow';
ROUTES.parking = function(){
  let html = shead('Parking Lot', 'Not every thought is a task. Some things are only loud because you are tired. Capture it — decide later.');
  html += `<div class="chips">${PARK_CATS.map(c=>`<button class="chip ${parkCat===c?'on':''}" onclick="parkCat='${esc(c)}';render()">${esc(c)}</button>`).join('')}</div>
    <div class="addrow"><input type="text" id="parkInput" maxlength="140" placeholder="Park it here"><button class="btn" onclick="addPark()">Park</button></div>`;
  const open = S.parking.filter(p=>!p.done), doneList = S.parking.filter(p=>p.done);
  if(open.length){
    html += `<div class="t-label">Held for you</div>` + open.map(p=>parkEntry(p)).join('');
  } else {
    html += `<p class="sintro" style="margin-top:22px;font-style:italic;color:var(--sage)">Nothing parked. Your head must be quiet — enjoy it.</p>`;
  }
  if(doneList.length){
    html += `<div class="t-label">Let go</div>` + doneList.slice(0,6).map(p=>parkEntry(p)).join('');
  }
  html += `<p class="footer-note">You do not have to solve any of this in bed.<br>The weekly reset will ask what still matters.</p>`;
  return html;
};
function parkEntry(p){
  return `<div class="entry ${p.done?'dim':''}">
    <div class="etxt">${esc(p.text)}<span class="ecat">${esc(p.cat)}</span></div>
    <button class="mini" title="${p.done?'bring back':'done / let go'}" onclick="togglePark('${p.id}')">${p.done?'↺':'✓'}</button>
    <button class="mini" title="delete" onclick="delPark('${p.id}')">×</button>
  </div>`;
}
function addPark(){
  const e=document.getElementById('parkInput');
  const v=e.value.trim(); if(!v) return;
  S.parking.unshift({id:uid(), text:v, cat:parkCat, done:false});
  DB.set('parking', S.parking);
  logHabit('park','Parked a thought');
  e.value='';
  toast('Captured means you can stop holding it.');
  render();
}
function togglePark(id){ const p=S.parking.find(x=>x.id===id); if(p){p.done=!p.done; DB.set('parking',S.parking); render();} }
function delPark(id){ S.parking=S.parking.filter(x=>x.id!==id); DB.set('parking',S.parking); render(); }

/* ============================================================
   8 & 9. CREATIVE PRACTICE + HOME & IDEAS (shared capture)
   ============================================================ */
const CREATIVE_PROMPTS = [
  'Sketch one corner of the room you are in.',
  'Draw one plant shape from memory.',
  'Sketch one tile pattern you would actually use.',
  'Note one planting combination you saw or imagined.',
  'Photograph one texture, tile, colour or shadow.',
  'Draw one thing you noticed today.',
  'Sketch one improvement for the apartment.',
  'One bathroom idea — drawn badly is fine.',
  'One lighting idea for a room you know.',
  'Write one idea for a future Form & Foliage project.'
];
let capCatCreative = null, capCatHome = null;

ROUTES.creative = function(){
  const d=new Date(); const doy=Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);
  const prompt = CREATIVE_PROMPTS[doy % CREATIVE_PROMPTS.length];
  let html = shead('Creative Practice', 'Regular noticing, not polished output. One line counts. This is how you build your eye.');
  html += `<div class="next-card"><div class="nk">Today, if you feel like it</div><div class="nx">${esc(prompt)}</div>
      <div class="btnrow">
        <button class="btn soft" onclick="logCreative('sketch')">I sketched</button>
        <button class="btn soft" onclick="logCreative('notice')">I noticed something</button>
      </div></div>`;
  html += captureBlock('creative', 'What did you notice or want to keep?', CREATIVE_CATS, S.ideasCreative, capCatCreative);
  html += `<p class="footer-note">Collecting ideas is part of the work.<br>Five minutes is still creative practice.</p>`;
  return html;
};
ROUTES.homeideas = function(){
  let html = shead('Home & Ideas', 'Your home is part of the life you are building. Capture the idea — you do not have to solve it today.');
  html += `<div class="card quiet"><h3>Gentle prompts</h3>
    <p class="body-txt" style="margin-top:8px">What is one thing at home that would make life easier?<br>
    What storage problem keeps annoying you?<br>
    What lighting would make a space feel better?<br>
    What could improve the bathroom — keeping that good big mirror?</p></div>`;
  html += captureBlock('home', 'One idea, annoyance or reference', HOME_CATS, S.ideasHome, capCatHome);
  html += `<p class="footer-note">Practical can still be beautiful.<br>Make the apartment support you.</p>`;
  return html;
};
function captureBlock(kind, placeholder, cats, listData, activeCat){
  let html = `<div class="t-label">Capture</div>
    <div class="chips">${cats.map(c=>`<button class="chip ${activeCat===c?'on':''}" onclick="setCapCat('${kind}','${esc(c)}')">${esc(c)}</button>`).join('')}</div>
    <div class="addrow"><input type="text" id="cap_${kind}" maxlength="180" placeholder="${esc(placeholder)}"><button class="btn" onclick="addCapture('${kind}')">Keep</button></div>`;
  if(listData.length){
    html += `<div class="t-label">Kept</div>` + listData.map(e=>
      `<div class="entry"><div class="etxt">${esc(e.text)}<span class="ecat">${esc(e.cat||'')}</span></div>
       <button class="mini" onclick="delCapture('${kind}','${e.id}')">×</button></div>`).join('');
  }
  return html;
}
function setCapCat(kind,c){
  if(kind==='creative') capCatCreative = capCatCreative===c?null:c;
  else capCatHome = capCatHome===c?null:c;
  render();
}
function addCapture(kind){
  const e=document.getElementById('cap_'+kind);
  const v=e.value.trim(); if(!v) return;
  const entry={id:uid(), text:v, cat:(kind==='creative'?capCatCreative:capCatHome)||'', date:todayStr()};
  if(kind==='creative'){ S.ideasCreative.unshift(entry); DB.set('ideasCreative',S.ideasCreative); logHabit('notice','Kept a creative idea'); toast('Noticing is part of the work.'); }
  else { S.ideasHome.unshift(entry); DB.set('ideasHome',S.ideasHome); logHabit('homeidea','Captured a home idea'); toast('You captured it. You do not have to solve it today.'); }
  e.value='';
  render();
}
function delCapture(kind,id){
  if(kind==='creative'){ S.ideasCreative=S.ideasCreative.filter(x=>x.id!==id); DB.set('ideasCreative',S.ideasCreative); }
  else { S.ideasHome=S.ideasHome.filter(x=>x.id!==id); DB.set('ideasHome',S.ideasHome); }
  render();
}
function logCreative(which){
  logHabit(which, which==='sketch'?'Sketched':'Noticed something');
  toast(which==='sketch'?'You are building your eye.':'Noticing is part of the work.');
  render();
}

/* ============================================================
   10. JOY PLAN
   ============================================================ */
let joyCat = null;
/* Living sources — what's-on pages for the places that match her taste,
   weighted to walkable-from-Southbank and the arts precinct at her door. */
const JOY_SOURCES = [
  {group:'At your door — the arts precinct', items:[
    {label:'NGV — what’s on', url:'https://www.ngv.vic.gov.au/whats-on/', note:'ten minutes on foot'},
    {label:'Buxton Contemporary', url:'https://buxtoncontemporary.com/', note:'Southbank’s quiet gallery'},
    {label:'Arts Centre Melbourne — calendar', url:'https://www.artscentremelbourne.com.au/whats-on/event-calendar', note:'theatre, music, talks'},
    {label:'Melbourne Recital Centre', url:'https://www.melbournerecital.com.au/whats-on', note:'an hour of music, walk home after'},
    {label:'ACCA', url:'https://acca.melbourne/', note:'contemporary art, free'}
  ]},
  {group:'Gardens, markets, design', items:[
    {label:'South Melbourne Market — what’s on', url:'https://www.southmelbournemarket.com.au/what-s-on', note:'your market'},
    {label:'Royal Botanic Gardens', url:'https://www.rbg.vic.gov.au/', note:'sensory planting research, disguised as a walk'},
    {label:'Heide — exhibitions', url:'https://www.heide.com.au/exhibitions/', note:'gallery + sculpture garden'},
    {label:'MPavilion program', url:'https://mpavilion.org/', note:'design talks in a garden'},
    {label:'Open House Melbourne', url:'https://openhousemelbourne.org/', note:'inside the city’s best buildings'}
  ]},
  {group:'Shops that teach the eye', items:[
    {label:'Jardan — Richmond flagship', url:'https://www.jardan.com.au/pages/melbourne-showroom', note:'522 Church St — furniture row starts here'},
    {label:'Eco Outdoor — Melbourne showroom', url:'https://www.eco-outdoor.com/en-au/showrooms/melbourne-vic-au', note:'422 Burnley St — stone, cladding, outdoor pieces'},
    {label:'Modern Times — Fitzroy', url:'https://moderntimes.com.au/', note:'mid-century + local art'},
    {label:'Mr Kitly — Brunswick', url:'https://mrkitly.com.au/', note:'ceramics and indoor plants above Sydney Rd'},
    {label:'Tait — outdoor furniture', url:'https://madebytait.com.au/', note:'Melbourne-made, garden-adjacent'},
    {label:'Craft Victoria', url:'https://craft.org.au/', note:'makers, materials, exhibitions'}
  ]},
  {group:'Browse what’s on', items:[
    {label:'What’s On Melbourne', url:'https://whatson.melbourne.vic.gov.au/', note:'the city’s official listing'},
    {label:'Broadsheet Melbourne', url:'https://www.broadsheet.com.au/melbourne', note:'good taste, kept current'},
    {label:'Eventbrite — arts this weekend', url:'https://www.eventbrite.com.au/d/australia--melbourne/arts--events--this-weekend/', note:'workshops, openings, classes'},
    {label:'TryBooking — search events', url:'https://www.trybooking.com/book/search', note:'the small and local ones'}
  ]}
];
/* Design crawls — whole streets as inspiration. One tap puts it in the week. */
const CRAWLS = [
  {text:'Design crawl: Gertrude & Brunswick St, Fitzroy — homewares, galleries, the good windows', cat:'Small adventures'},
  {text:'Design crawl: Church St, Richmond — furniture row, starting at Jardan', cat:'Interiors'},
  {text:'Design crawl: Smith & Johnston St — Modern Times and the vintage rooms', cat:'Interiors'},
  {text:'Eco Outdoor, Richmond — stone and outdoor furniture, Form & Foliage research', cat:'Learning'},
  {text:'Mr Kitly, Brunswick — ceramics and indoor plants above Sydney Road', cat:'Beauty'},
  {text:'Michelle Guglielmo Park, Brunswick — GLAS’s double-AILA-winner pocket park, opposite the Town Hall (pair with Mr Kitly)', cat:'Gardens'},
  {text:'Riverfront crawl: Greenline Stage 1 → Seafarers Rest Park — new Melbourne, on foot from home', cat:'Small adventures'}
];
ROUTES.joy = function(){
  let html = shead('Joy Plan', 'Joy does not happen by accident. This is not indulgence — it is maintenance.');
  html += `<div class="card quiet"><h3>This week I want to look forward to…</h3>
    <p class="body-txt" style="margin-top:8px">One small pleasure. One beautiful place. One thing just because you like it.<br>
    What would make this week feel more like a life?</p></div>`;
  html += `<div class="chips">${JOY_CATS.map(c=>`<button class="chip ${joyCat===c?'on':''}" onclick="joyCat=joyCat==='${esc(c)}'?null:'${esc(c)}';render()">${esc(c)}</button>`).join('')}</div>
    <div class="addrow"><input type="text" id="joyInput" maxlength="140" placeholder="Put something good in the week"><button class="btn" onclick="addJoy()">Plan it</button></div>`;
  const open=S.joyList.filter(j=>!j.done), had=S.joyList.filter(j=>j.done);
  if(open.length) html += `<div class="t-label">To look forward to</div>` + open.map(j=>joyEntry(j)).join('');
  if(had.length) html += `<div class="t-label">Enjoyed</div>` + had.slice(0,8).map(j=>joyEntry(j)).join('');

  // design crawls — one tap from suggestion to plan
  html += `<div class="t-label">Design crawls — shops that teach the eye</div>
    <p class="smallprint" style="margin:0 0 4px">Whole streets as free galleries. Tap + and it joins the week.</p>` +
    CRAWLS.map((c,i)=>{
      const added = S.joyList.some(j=>j.text===c.text && !j.done);
      return `<div class="entry ${added?'dim':''}">
        <div class="etxt">${esc(c.text)}<span class="ecat">${esc(c.cat)}</span></div>
        <button class="mini" onclick="addCrawl(${i})">${added?'✓':'+'}</button>
      </div>`;
    }).join('');

  // find something good — live what's-on pages, opened in the browser
  html += `<div class="t-label">Find something good</div>
    <p class="smallprint" style="margin:0 0 4px">These open the real what's-on pages. Found something? Come back and put it in the week above.</p>`;
  JOY_SOURCES.forEach(g=>{
    html += `<div class="card"><h3 style="font-size:15.5px">${esc(g.group)}</h3>
      <div class="versions" style="margin-top:9px">` +
      g.items.map(it=>`<a class="vrow" style="text-decoration:none" href="${esc(it.url)}" target="_blank" rel="noopener">
        <span class="vtxt"><b style="font-weight:500;color:var(--canopy)">${esc(it.label)}</b><br><span style="font-size:12.5px;font-style:italic;color:var(--moss)">${esc(it.note)}</span></span>
        <span class="vtag" style="min-width:auto">↗</span>
      </a>`).join('') + `</div></div>`;
  });
  html += `<p class="footer-note">Not everything has to be useful.</p>`;
  return html;
};
function joyEntry(j){
  return `<div class="entry ${j.done?'dim':''}">
    <div class="etxt">${esc(j.text)}<span class="ecat">${esc(j.cat||'')}</span></div>
    <button class="mini" onclick="toggleJoy('${j.id}')">${j.done?'↺':'✓'}</button>
    <button class="mini" onclick="delJoy('${j.id}')">×</button>
  </div>`;
}
function addJoy(){
  const e=document.getElementById('joyInput'); const v=e.value.trim(); if(!v) return;
  S.joyList.unshift({id:uid(), text:v, cat:joyCat||'', done:false});
  DB.set('joyList',S.joyList);
  logHabit('joy','Planned something good');
  e.value='';
  toast('This is part of having a life.');
  render();
}
function toggleJoy(id){ const j=S.joyList.find(x=>x.id===id); if(j){ j.done=!j.done; DB.set('joyList',S.joyList); if(j.done) toast('Enjoyed. That was the point.'); render(); } }
function delJoy(id){ S.joyList=S.joyList.filter(x=>x.id!==id); DB.set('joyList',S.joyList); render(); }
function addCrawl(i){
  const c=CRAWLS[i]; if(!c) return;
  if(S.joyList.some(j=>j.text===c.text && !j.done)){ toast('Already in the week.'); return; }
  S.joyList.unshift({id:uid(), text:c.text, cat:c.cat, done:false});
  DB.set('joyList',S.joyList);
  logHabit('joy','Planned something good');
  toast('In the week. Take the sketchbook.');
  render();
}

/* ============================================================
   11. MONEY CALM
   ============================================================ */
ROUTES.moneycalm = function(){
  const m=S.money, fk=fortnightKey();
  const conf=m.confirms[fk]||{};
  const lastLook=m.looks[0];
  let html = shead('Money Calm', 'Look at the number. The number is information. Avoiding it makes it scarier.');

  html += `<div class="card"><h3>The setup that already exists</h3>
    <div class="why">Check it — do not spiral. It is already working.</div>
    <div style="margin-top:10px">
      <div class="kv"><span class="k">Bills account</span><span class="v">$${esc(S.settings.bills)} <small>/ fortnight</small></span></div>
      <div class="kv"><span class="k">Mortgage</span><span class="v">$${esc(S.settings.mortgage)} <small>/ fortnight</small></span></div>
    </div>
    <div class="btnrow">
      <button class="btn ${conf.bills?'soft':'ghost'}" onclick="confirmMoney('bills')">${conf.bills?'✓ Bills confirmed':'Confirm bills went'}</button>
      <button class="btn ${conf.mortgage?'soft':'ghost'}" onclick="confirmMoney('mortgage')">${conf.mortgage?'✓ Mortgage confirmed':'Confirm mortgage'}</button>
    </div>
    <p class="smallprint">This fortnight. Two taps and the fear has nowhere to live.</p>
  </div>`;

  html += `<div class="card"><h3>Just look</h3>
    <div class="why">Write down the actual number instead of catastrophising.</div>
    <div class="field" style="display:flex;gap:8px"><input type="text" id="lookNum" placeholder="Balance or number you checked" style="flex:1">
    <button class="btn" onclick="addLook()">Looked</button></div>
    ${lastLook?`<p class="smallprint">Last look: ${esc(lastLook.num)} — ${esc(lastLook.date)}</p>`:''}
  </div>`;

  html += `<div class="card"><h3>Upcoming</h3>
    ${m.upcoming.map(u=>`<div class="kv"><span class="k">${esc(u.name)} <small style="color:var(--sage)">· ${esc(u.when)}</small></span>
      <span class="v">$${esc(u.amount)} <button class="mini" style="display:inline-flex;vertical-align:middle;margin-left:6px" onclick="delUpcoming('${u.id}')">×</button></span></div>`).join('')||'<p class="smallprint">Nothing noted yet.</p>'}
    <div class="addrow"><input type="text" id="upName" placeholder="What" style="flex:2"><input type="number" id="upAmt" placeholder="$" style="flex:1"><button class="btn" onclick="addUpcoming()">Note</button></div>
  </div>`;

  html += `<div class="card"><h3>One small money action</h3>
    <div class="why">You do not need to solve everything today. Clarity first, decisions second.</div>
    <div class="chips">${['Check one balance','Open the bill','Check one subscription','Write down what is actually due','Move a small amount to savings','Choose the week’s one money priority'].map(a=>
      `<button class="chip ${m.action===a?'on':''}" onclick="setMoneyAction('${esc(a)}')">${esc(a)}</button>`).join('')}</div>
    ${m.action?`<div class="first-action" style="margin-top:12px">This week: <b>${esc(m.action)}</b></div>`:''}
    <button class="btn wide" onclick="completeHabit('money')">I looked — done for today</button>
  </div>`;

  html += `<p class="footer-note">Manual only. No banks connected, nothing leaves this phone.<br>This is clarity, not a budgeting app.</p>`;
  return html;
};
function confirmMoney(which){
  const fk=fortnightKey();
  if(!S.money.confirms[fk]) S.money.confirms[fk]={};
  S.money.confirms[fk][which]=!S.money.confirms[fk][which];
  DB.set('moneyData',S.money);
  if(S.money.confirms[fk][which]) toast(which==='bills'?'The bills system is doing its job.':'The mortgage is accounted for.');
  render();
}
function addLook(){
  const e=document.getElementById('lookNum'); const v=e.value.trim(); if(!v) return;
  S.money.looks.unshift({num:v, date:prettyDate()});
  S.money.looks=S.money.looks.slice(0,10);
  DB.set('moneyData',S.money);
  logHabit('money','Looked at the money');
  toast('The number is information.');
  render();
}
function addUpcoming(){
  const n=document.getElementById('upName').value.trim();
  const a=document.getElementById('upAmt').value.trim();
  if(!n) return;
  S.money.upcoming.push({id:uid(), name:n, amount:a||'—', when:'Noted'});
  DB.set('moneyData',S.money);
  render();
}
function delUpcoming(id){ S.money.upcoming=S.money.upcoming.filter(u=>u.id!==id); DB.set('moneyData',S.money); render(); }
function setMoneyAction(a){ S.money.action = S.money.action===a?'':a; DB.set('moneyData',S.money); render(); }

/* ============================================================
   12. WEEKLY RESET (wizard)
   ============================================================ */
let wkData=null;
const WK_QUESTIONS = [
  {id:'worked', q:'What worked this week?', hint:'Small counts. "I got in the water twice" is an answer.'},
  {id:'harder', q:'What made life harder?', hint:'Information, not judgement.'},
  {id:'energy', q:'What is coming up that will take energy?', hint:'Demanding shifts, family things, anything looming.'},
  {id:'protect', q:'What will you protect this week?', hint:'One swim? One evening? Name it and it is harder to lose.'},
  {id:'no', q:'What do you need to say no to?', hint:'Boundaries are environment design too.'}
];
ROUTES.weekly = function(){
  const wk=weekDates(0)[0];
  const saved=S.weekly[wk];
  if(!wkData) wkData = saved ? JSON.parse(JSON.stringify(saved)) : {answers:{}, keepPark:[], plan:{anchors:['','',''], body:'', move:'', creative:'', money:'', joy:'', home:'', protect:'', easier:''}};
  const p=wkData.plan;
  const open=S.parking.filter(x=>!x.done);

  // one scrollable page — look back, sort the lot, shape the week, one save
  return shead('Weekly Reset', 'A kind look at the week — not a performance review. Answer what helps, skip the rest.')
    + weekGridHtml() + `

    <div class="t-label">Looking back, kindly</div>
    ${WK_QUESTIONS.map(q=>`<div class="field"><label>${esc(q.q)}</label>
      <input type="text" id="wk_q_${q.id}" maxlength="140" placeholder="${esc(q.hint)}" value="${esc(wkData.answers[q.id]||'')}"></div>`).join('')}

    <div class="t-label">The parking lot</div>
    <p class="smallprint" style="margin:0 0 4px">Some things were only loud because you were tired. Tick = done with it. × = let it go.</p>
    ${open.length ? open.map(x=>`<div class="entry">
        <div class="etxt">${esc(x.text)}<span class="ecat">${esc(x.cat)}</span></div>
        <button class="mini" onclick="wkPark('${x.id}',1)">✓</button>
        <button class="mini" onclick="wkPark('${x.id}',0)">×</button>
      </div>`).join('') : '<p class="sintro" style="font-style:italic;color:var(--sage)">Empty. Nothing carried over.</p>'}

    <div class="t-label">The week, simply</div>
    <div class="field"><label>Three anchor habits — attach them to things you already do</label>
      ${[0,1,2].map(i=>`<input type="text" id="wk_an${i}" style="margin-bottom:8px" maxlength="80" placeholder="${['After I wake up, I put my feet on the floor','After I make coffee, I stretch for five minutes','After I brush my teeth, I choose tomorrow’s top 3'][i]}" value="${esc(p.anchors[i]||'')}">`).join('')}
    </div>
    ${[['body','Body care focus','e.g. evening stretch on work nights'],
       ['move','Swim or strength to protect','e.g. Wednesday swim before anything else'],
       ['creative','Creative focus','e.g. three five-minute sketches'],
       ['money','One money action','e.g. confirm bills + check electricity'],
       ['joy','One joy plan','e.g. Saturday morning at the market'],
       ['home','One home idea or reset','e.g. sort the hallway light'],
       ['protect','One thing to protect','e.g. Sunday evening — no plans'],
       ['easier','One thing to make easier','e.g. swim bag packed and by the door']
      ].map(f=>`<div class="field"><label>${f[1]}</label><input type="text" id="wk_${f[0]}" maxlength="90" placeholder="${esc(f[2])}" value="${esc(p[f[0]]||'')}"></div>`).join('')}

    <button class="btn wide" onclick="wkFinish()">Set the week</button>
    <p class="footer-note">Three anchors is enough. Hold the rest loosely.</p>`;
};
function wkCollect(){
  WK_QUESTIONS.forEach(q=>{ const e=document.getElementById('wk_q_'+q.id); if(e) wkData.answers[q.id]=e.value.trim(); });
  [0,1,2].forEach(i=>{ const e=document.getElementById('wk_an'+i); if(e) wkData.plan.anchors[i]=e.value.trim(); });
  ['body','move','creative','money','joy','home','protect','easier'].forEach(f=>{
    const e=document.getElementById('wk_'+f); if(e) wkData.plan[f]=e.value.trim();
  });
}
function wkPark(id, keep){
  wkCollect(); // don't lose typed answers when the list re-renders
  if(keep) { const x=S.parking.find(v=>v.id===id); if(x) x.done=true; }
  else S.parking=S.parking.filter(v=>v.id!==id);
  DB.set('parking', S.parking);
  render();
}
function weekGridHtml(){
  const dates=weekDates(0), today=todayStr();
  // second key = legacy ids from the earlier version of the app, so old ticks still show
  const rows=[['noscroll|r_morning','No-scroll morning'],['stretch_any|stretch','Stretched'],['swim','Swim'],['strength','Strength'],['land','Landed after work'],['sketch','Sketched'],['notice','Noticed'],['money','Looked at money'],['close','Closed the day']];
  const letters=['M','T','W','T','F','S','S'];
  let h='<div class="grid-scroll"><table class="grid"><thead><tr><th style="text-align:left"></th>';
  dates.forEach((d,i)=>h+=`<th class="${d===today?'col-today':''}">${letters[i]}</th>`);
  h+='</tr></thead><tbody>';
  rows.forEach(r=>{
    h+=`<tr><td class="hlabel">${r[1]}</td>`;
    dates.forEach(d=>{
      const on=S.tracking[d] && r[0].split('|').some(k=>S.tracking[d][k]);
      h+=`<td class="${d===today?'col-today':''}"><div class="cell ${on?'on':''}"><span class="dot"></span></div></td>`;
    });
    h+='</tr>';
  });
  h+='</tbody></table></div><p class="grid-note">Empty is rest, not a miss.</p>';
  return h;
}
function wkFinish(){
  wkCollect();
  const wk=weekDates(0)[0];
  S.weekly[wk]=wkData;
  DB.set('weekly',S.weekly);
  logHabit('moneyweek','Did the weekly reset');
  wkData=null;
  toast('The week has a shape now. Hold it loosely.');
  go('home');
}

/* ============================================================
   13. MONTHLY REVIEW (wizard)
   ============================================================ */
let moStep=0, moData=null;
const MO_STEPS = [
  {id:'improved', q:'Three things that improved.', hint:'What are you becoming more consistent with?', n:3},
  {id:'attention', q:'Three things asking for attention.', hint:'Not failures — signals.', n:3},
  {id:'stop', q:'One thing to stop doing.', hint:'Where are you still relying on willpower?', n:1},
  {id:'protectt', q:'One thing to protect.', hint:'What helped you feel more like yourself?', n:1},
  {id:'easier', q:'One thing to make easier.', hint:'What environment change would help?', n:1},
  {id:'focus', q:'Next month, gently.', hint:'One creative focus, one body focus, one money focus, one joy focus.', n:4,
   labels:['Creative focus','Body focus','Money focus','Joy focus']}
];
ROUTES.monthly = function(){
  const mk=(new Date()).getFullYear()+'-'+((new Date()).getMonth()+1);
  const saved=S.monthly[mk];
  if(!moData) moData = saved ? JSON.parse(JSON.stringify(saved)) : {};
  let html = shead('Monthly Review', 'The bigger picture — reflective, practical, forward-moving. Not a school report.');
  html += `<div class="wdots">${MO_STEPS.map((x,i)=>`<i class="${i<=moStep?'on':''}"></i>`).join('')}</div>`;
  if(moStep < MO_STEPS.length){
    const s=MO_STEPS[moStep];
    const vals=moData[s.id]||[];
    html += `<div class="wq">${esc(s.q)}</div><div class="whint">${esc(s.hint)}</div>` +
      Array.from({length:s.n},(_,i)=>`<div class="field">${s.labels?`<label>${s.labels[i]}</label>`:''}<input type="text" id="mo_${i}" maxlength="100" value="${esc(vals[i]||'')}"></div>`).join('') +
      `<div class="wnav">${moStep>0?`<button class="btn ghost" onclick="moNav(-1)">Back</button>`:''}<button class="btn" onclick="moNav(1)">${moStep===MO_STEPS.length-1?'Set the month':'Next'}</button></div>`;
  } else {
    html += `<div class="mantra" style="margin-top:26px">Noted, kept, carried forward.</div><div class="review-out">`;
    MO_STEPS.forEach(s=>{
      (moData[s.id]||[]).forEach((v,i)=>{
        if(v) html+=`<div class="ro"><span>${s.labels?esc(s.labels[i]):'·'}</span>${esc(v)}</div>`;
      });
    });
    html += `</div><button class="btn wide" onclick="moStep=0;moData=null;go('home')">Done</button>`;
  }
  return html;
};
function moNav(dir){
  const s=MO_STEPS[moStep];
  if(s && dir>0){
    moData[s.id]=Array.from({length:s.n},(_,i)=>{ const e=document.getElementById('mo_'+i); return e?e.value.trim():''; });
    const mk=(new Date()).getFullYear()+'-'+((new Date()).getMonth()+1);
    S.monthly[mk]=moData; DB.set('monthly',S.monthly);
  }
  moStep+=dir; render();
}

/* ============================================================
   14. HABIT DESIGN
   ============================================================ */
let editHabitId=null;
ROUTES.habits = function(){
  if(editHabitId){
    const h=habit(editHabitId);
    if(!h){ editHabitId=null; return ROUTES.habits(); }
    return shead('Habit Design', '') + `
      <div class="card">
      <h3>${esc(h.name)}</h3>
      ${[['name','Habit name'],['identity','Identity — who this makes you'],['stack','Implementation intention — “When [situation], I will [small action]”'],
         ['full','Full version'],['tiny','Tiny version'],['low','Low-energy version'],['recovery','Recovery version'],
         ['env','Make it easier — environment support'],['done','Completion message']
        ].map(f=>`<div class="field"><label>${f[1]}</label><input type="text" id="hb_${f[0]}" maxlength="160" value="${esc(h[f[0]]||'')}"></div>`).join('')}
      <div class="btnrow">
        <button class="btn ghost" onclick="editHabitId=null;render()">Back</button>
        <button class="btn" onclick="saveHabit('${h.id}')">Save</button>
      </div>
      </div>`;
  }
  let html = shead('Habit Design', 'Cue → reason → response → reward. Every habit has a tiny version, a recovery version, and an identity it feeds. Design the environment; do not rely on willpower.');
  const areas=[...new Set(S.habits.map(h=>h.area))];
  areas.forEach(a=>{
    html+=`<div class="t-label">${esc(a)}</div>`;
    S.habits.filter(h=>h.area===a).forEach(h=>{
      html+=`<div class="card" onclick="editHabitId='${h.id}';render()" style="cursor:pointer">
        <h3>${esc(h.name)}</h3>
        <div class="why">${esc(h.identity)}</div>
        <p class="smallprint" style="margin-top:8px">${esc(h.stack)}</p>
        <p class="smallprint">Tiny: ${esc(h.tiny)} · Easier: ${esc(h.env)}</p>
      </div>`;
    });
  });
  html += `<div class="addrow"><input type="text" id="newHabit" maxlength="60" placeholder="Add a habit"><button class="btn" onclick="addHabit()">Add</button></div>
    <p class="footer-note">Make it obvious. Make it easy. Make it satisfying. Never miss twice.<br>— James Clear's <i>Atomic Habits</i>, applied to your actual life.</p>`;
  return html;
};
function saveHabit(id){
  const h=habit(id); if(!h) return;
  ['name','identity','stack','full','tiny','low','recovery','env','done'].forEach(f=>{
    const e=document.getElementById('hb_'+f); if(e) h[f]=e.value.trim();
  });
  saveHabits();
  editHabitId=null;
  toast('Habit shaped.');
  render();
}
function addHabit(){
  const e=document.getElementById('newHabit'); const v=e.value.trim(); if(!v) return;
  const h={id:uid(), area:'Mine', name:v, identity:'I am someone who keeps small promises.',
    cue:'', stack:'When ____, I will ____.', tiny:'The two-minute version.', full:'', low:'', recovery:'Come back with the tiny version.',
    env:'What can I put out, remove or prepare?', done:'That counts.'};
  S.habits.push(h); saveHabits();
  editHabitId=h.id;
  render();
}

/* ============================================================
   15. SETTINGS
   ============================================================ */
ROUTES.settings = function(){
  const s=S.settings;
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return shead('Settings', 'Make it yours. Nothing here is complicated.') + `
    <div class="field"><label>Your name</label><input type="text" id="st_name" maxlength="30" value="${esc(s.name)}"></div>
    <div class="field"><label>Tone</label>
      <div class="chips">${[['soft','Soft'],['direct','Direct'],['firm','Firm but kind']].map(t=>
        `<button class="chip ${s.tone===t[0]?'on':''}" onclick="setSetting('tone','${t[0]}')">${t[1]}</button>`).join('')}</div></div>
    <div class="field"><label>Usual workdays</label>
      <div class="chips">${days.map(d=>`<button class="chip ${(s.workdays||[]).includes(d)?'on':''}" onclick="toggleWorkday('${d}')">${d}</button>`).join('')}</div>
      <p class="smallprint">Hospitality weeks move around — you can always correct the day type on the Today screen.</p></div>
    <div class="field"><label>Weekly reset day</label>
      <div class="chips">${days.map(d=>`<button class="chip ${s.resetDay===d?'on':''}" onclick="setSetting('resetDay','${d}')">${d}</button>`).join('')}</div></div>
    <div class="field"><label>Bills — $ per fortnight</label><div class="inline-num"><input type="number" id="st_bills" value="${esc(s.bills)}"></div></div>
    <div class="field"><label>Mortgage — $ per fortnight</label><div class="inline-num"><input type="number" id="st_mortgage" value="${esc(s.mortgage)}"></div></div>
    <button class="btn wide" onclick="saveSettings()">Save</button>
    <p class="footer-note">Everything stays on this phone. No accounts, no servers, nothing shared.</p>`;
};
function setSetting(k,v){ S.settings[k]=v; DB.set('settings',S.settings); render(); }
function toggleWorkday(d){
  const w=S.settings.workdays||[];
  const i=w.indexOf(d);
  if(i>=0) w.splice(i,1); else w.push(d);
  S.settings.workdays=w; DB.set('settings',S.settings); render();
}
function saveSettings(){
  const g=id=>document.getElementById(id);
  if(g('st_name').value.trim()) S.settings.name=g('st_name').value.trim();
  S.settings.bills=Number(g('st_bills').value)||S.settings.bills;
  S.settings.mortgage=Number(g('st_mortgage').value)||S.settings.mortgage;
  DB.set('settings',S.settings);
  toast('Saved.');
  go('home');
}

/* ============================================================
   WHY THIS WORKS — the three books under the hood
   ============================================================ */
ROUTES.why = function(){
  return shead('Why this works', 'This app is not made-up wellness. Three books sit underneath it — here is what each one contributes.') + `

    <div class="card">
      <h3>Atomic Habits — James Clear</h3>
      <div class="why">Every action is a vote for the person you're becoming.</div>
      <p class="body-txt" style="margin-top:9px">
      The tiny versions under every habit are Clear's two-minute rule: shrink the habit until refusing it is harder than doing it.
      The tick, the leaf, the count — that's making it satisfying. "Instead of the scroll" is habit substitution: don't fight the cue, redirect it.
      The kept ledger is identity evidence. And missing a day is designed for: never miss twice, no drama, just return.</p>
    </div>

    <div class="card">
      <h3>Unbreakable — Dr Vonda Wright</h3>
      <div class="why">Muscle and bone are the organs of longevity — especially for women from midlife on.</div>
      <p class="body-txt" style="margin-top:9px">
      This is why Body Care is strength, stretching, mobility and balance — not step counts (your shifts already cover those).
      One set downstairs genuinely counts: bone responds to load, muscle to consistency, and both to returning week after week.
      Recovery is training too — legs up the wall is not slacking, it is part of the program. You are building the body that carries the next thirty years.</p>
    </div>

    <div class="card">
      <h3>How to Have a Good Day — Caroline Webb</h3>
      <div class="why">A good day is designed at its edges.</div>
      <p class="body-txt" style="margin-top:9px">
      Your top 3 priorities are Webb's morning intentions: decide what matters before the day decides for you — which is why they're chosen the night before and tickable the moment you wake.
      The two-minute resets are her micro-breaks. Evening Close is her end-of-day bookend: capture, choose, park, sleep.
      When-then plans ("when I get home, I change clothes before the phone") live in Habit Design.</p>
    </div>

    <p class="footer-note">Small trades, repeated, in a body kept strong, inside days with edges.<br>That is the whole method.</p>`;
};

/* ============================================================
   MY CONSTITUTION — the person being built
   ============================================================ */
let editArtId = null;
let showDocEdit = false;
function evidenceCount(a, wk){
  if(!a.ev || !a.ev.length){
    // the "self-trust" kind of vow: evidence = every kept promise this week
    return wk.reduce((s,d)=> s + DB.get('kept:'+d, []).length, 0);
  }
  return wk.reduce((s,d)=>{ const t=S.tracking[d]||{}; return s + a.ev.filter(id=>t[id]).length; }, 0);
}
function docSectionHtml(text){
  const SECTIONS=['Personal Constitution','A Living Document','Preamble','Core Values','Beliefs','Principles','Identity','The Complicated Stuff','For AI Systems Reading This Document'];
  return text.split(/\r?\n/).map(ln=>{
    const t=ln.trim();
    if(!t) return '';
    if(SECTIONS.includes(t)) return `<h3 class="doc-h">${esc(t)}</h3>`;
    if(/^Melbourne,\s*20/.test(t)) return `<p class="doc-meta">${esc(t)}</p>`;
    if(t.length<=46 && t===t.toUpperCase() && /[A-Z]/.test(t)) return `<div class="doc-sub">${esc(t)}</div>`;
    return `<p class="doc-p">${esc(t)}</p>`;
  }).join('');
}
ROUTES.constitution = function(){
  const wk = weekDates(0);
  const doc = S.constitutionDoc || '';
  let html = shead('My Constitution', 'The person you are becoming — in your own words. Every kept promise is a quiet vote for one of these.');

  // --- the living vows (these earn evidence as you tick) ---
  html += `<div class="t-label">Your vows</div>`;
  html += S.constitution.map(a=>{
    if(editArtId===a.id){
      return `<div class="card"><div class="field"><textarea id="art_${a.id}" maxlength="220">${esc(a.text)}</textarea></div>
        <div class="btnrow"><button class="btn ghost" onclick="editArtId=null;render()">Cancel</button><button class="btn" onclick="saveArticle('${a.id}')">Save</button></div></div>`;
    }
    const hasEv = (a.ev && a.ev.length) || a.id==='trust';
    let ev='';
    if(hasEv){
      const n = evidenceCount(a, wk);
      ev = `<div class="why" style="margin-top:9px">${ n ? ('Evidence this week &nbsp; '+'🌿'.repeat(Math.min(n,7))+(n>7?(' +'+(n-7)):'')) : 'No evidence yet this week — one small action counts.'}</div>`;
    }
    return `<div class="card">
      <div class="const-art">${esc(a.text)}</div>${ev}
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
        <button class="mini" title="edit" onclick="editArtId='${a.id}';render()">&#9998;</button>
        <button class="mini" title="remove" onclick="delArticle('${a.id}')">&times;</button>
      </div>
    </div>`;
  }).join('');
  html += `<div class="addrow"><input type="text" id="artInput" maxlength="220" placeholder="Add a vow — in your own words"><button class="btn" onclick="addArticle()">Add</button></div>`;

  // --- the full document (private, on-device only) ---
  html += `<hr class="divider">`;
  if(doc && !showDocEdit){
    html += `<div class="t-label">The document</div>
      <div class="doc">${docSectionHtml(doc)}</div>
      <button class="linklike" onclick="showDocEdit=true;render()">Edit the document</button>`;
  } else {
    html += `<div class="t-label">The document</div>
      <p class="sintro">Paste your constitution here. It is deeply personal, so it stays on this device only — never in the code, never uploaded.</p>
      <div class="field"><textarea id="docInput" style="min-height:220px" placeholder="Paste the full text of your constitution…">${esc(doc)}</textarea></div>
      <div class="btnrow">${doc?`<button class="btn ghost" onclick="showDocEdit=false;render()">Cancel</button>`:''}<button class="btn" onclick="saveDoc()">Keep it</button></div>`;
  }
  html += `<p class="footer-note">Your words live only on this phone.<br>Edit any vow to match your voice — those edits stay on-device too.</p>`;
  return html;
};
function saveDoc(){
  const e=document.getElementById('docInput'); if(!e) return;
  S.constitutionDoc = e.value.trim();
  DB.set('constitutionDoc', S.constitutionDoc);
  showDocEdit=false;
  toast('Held. In your own words.');
  render();
}
function saveArticle(id){
  const e=document.getElementById('art_'+id);
  const a=S.constitution.find(x=>x.id===id);
  if(a && e && e.value.trim()){ a.text=e.value.trim(); DB.set('constitution',S.constitution); }
  editArtId=null; toast('Written in.'); render();
}
function addArticle(){
  const e=document.getElementById('artInput'); const v=e.value.trim(); if(!v) return;
  S.constitution.push({id:uid(), text:v, ev:[]});
  DB.set('constitution',S.constitution);
  e.value=''; toast('An article of your own.'); render();
}
function delArticle(id){ S.constitution=S.constitution.filter(x=>x.id!==id); DB.set('constitution',S.constitution); render(); }

/* ============================================================
   RESET ME — the return flow
   ============================================================ */
let resetState=null;
const RESET_NAMES = ['I am scrolling','I am avoiding money','I am tired','I am overwhelmed','I am overthinking','I am stuck in bed','I am putting off stretching','I am waiting to feel motivated','I am physically wrecked from work','I am emotionally overloaded','Tomorrow is circling in my head','I am carrying work into bed'];
const RESET_ACTIONS = {
  'I am scrolling':{a:'Put the phone face-down. Stand up. That is the whole move.', r:'morning'},
  'I am avoiding money':{a:'Open Money Calm and confirm just the bills and mortgage. Nothing else.', r:'moneycalm'},
  'I am tired':{a:'Legs up the wall for two minutes. Tired is information, not failure.', r:'body'},
  'I am overwhelmed':{a:'Park everything in your head, then do one tiny thing.', r:'parking'},
  'I am overthinking':{a:'Out of your head, onto the list. Park it.', r:'parking'},
  'I am stuck in bed':{a:'Sit up. Feet on the floor. Nothing else yet.', r:'morning'},
  'I am putting off stretching':{a:'One stretch. The one you like. Sixty seconds.', r:'body'},
  'I am waiting to feel motivated':{a:'Motivation follows movement. Do the two-minute version of anything.', r:'body'},
  'I am physically wrecked from work':{a:'You need recovery, not more output. Land: change clothes, water, legs up the wall.', r:'recover'},
  'I am emotionally overloaded':{a:'One sentence, three breaths, no fixing tonight.', r:'recover'},
  'Tomorrow is circling in my head':{a:'Open Evening Close and park it. Three priorities, then done.', r:'close'},
  'I am carrying work into bed':{a:'Work thoughts go in the parking lot. They will keep until your shift.', r:'parking'}
};
function openReset(){ resetState={step:0, name:null}; drawReset(); }
function drawReset(){
  const o=document.getElementById('overlay');
  o.classList.remove('hidden');
  let inner='';
  if(resetState.step===0){
    inner=`<h2 class="stitle">Name what is happening</h2>
      <p class="sintro">No judgement — this is information.</p>
      <div class="chips">${RESET_NAMES.map(n=>`<button class="chip" onclick="resetPick('${esc(n)}')">${esc(n)}</button>`).join('')}</div>
      <button class="linklike" onclick="closeReset()">Never mind</button>`;
  } else {
    const act=RESET_ACTIONS[resetState.name]||{a:'Do the two-minute version of anything.', r:'home'};
    inner=`<h2 class="stitle">Okay. ${esc(resetState.name.replace('I am','You are'))}.</h2>
      <p class="sintro">Missing once is normal. No catching up — just come back.</p>
      <div class="next-card"><div class="nk">The next two minutes</div><div class="nx">${esc(act.a)}</div></div>
      <div class="field"><label>Remove one obstacle</label><input type="text" id="rs_obstacle" maxlength="90" placeholder="e.g. phone to the other room, mat onto the floor"></div>
      <div class="btnrow">
        <button class="btn" onclick="resetReturned('${act.r}')">Mark today as returned</button>
        <button class="btn ghost" onclick="closeReset()">Close</button>
      </div>`;
  }
  o.innerHTML=`<div class="sheet">${inner}</div>`;
}
function resetPick(n){ resetState.name=n; resetState.step=1; drawReset(); }
function resetReturned(route){
  logHabit('returned','Came back');
  S.day.returned=true; saveDay();
  closeReset();
  toast('You returned. That matters.');
  if(route && route!=='home') go(route); else render();
}
function closeReset(){ document.getElementById('overlay').classList.add('hidden'); resetState=null; }

/* ============================================================
   BOOT
   ============================================================ */
function init(){
  ensureSeed();
  fixSeeds();
  loadState();
  rollover();
  document.getElementById('loading').classList.add('hidden');
  render();
}
init();
