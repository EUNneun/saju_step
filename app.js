(() => {
  'use strict';
  const STORAGE_KEY = 'sajustep-state-v1';
  const APP_VERSION = '1.1.1';
  const defaultState = {
    version: APP_VERSION, xp: 0, attempts: 0, correct: 0, streak: 0,
    conceptStats: {}, recentQuestionIds: [], feedback: [], history: [], lastStudyAt: null,
    profile: null, people: []
  };
  let state = loadState();
  let route = 'home';
  let session = null;
  let selectedConceptCategory = 'stems';
  let detail = null;
  let myView = 'summary';
  let nobleView = 'map';
  let selectedPersonId = null;
  const main = document.getElementById('main');
  const toast = document.getElementById('toast');

  function loadState() {
    try { return {...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')}; }
    catch { return {...defaultState}; }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.getElementById('headerXp').textContent = `${state.xp} XP`;
  }
  function escapeHtml(value='') {
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function pct(a,b) { return b ? Math.round((a/b)*100) : 0; }
  function accuracy() { return pct(state.correct, state.attempts); }
  function overallMastery() {
    const entries = Object.values(state.conceptStats);
    return entries.length ? Math.round(entries.reduce((sum,s)=>sum+mastery(s),0)/entries.length) : 0;
  }
  function mastery(s={}) {
    if (!s.attempts) return 0;
    const rate = s.correct / s.attempts;
    const repetition = Math.min(1, s.attempts / 8);
    const streakBonus = Math.min(10, (s.streak || 0) * 2);
    return Math.min(100, Math.round(rate * 85 * repetition + streakBonus));
  }
  function calculateChart(profile) {
    if (typeof Solar === 'undefined' || typeof Lunar === 'undefined') throw new Error('원국 계산 모듈을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
    const [year,month,day]=profile.birthDate.split('-').map(Number);
    const [hour,minute]=(profile.timeUnknown?'12:00':profile.birthTime).split(':').map(Number);
    let solar;
    if(profile.calendar==='solar') solar=Solar.fromYmdHms(year,month,day,hour,minute,0);
    else solar=Lunar.fromYmdHms(year,profile.calendar==='lunarLeap'?-month:month,day,hour,minute,0).getSolar();
    const eight=solar.getLunar().getEightChar();
    return { year:eight.getYear(), month:eight.getMonth(), day:eight.getDay(), time:profile.timeUnknown?null:eight.getTime(), dayMaster:eight.getDayGan(), monthBranch:eight.getMonthZhi() };
  }
  function chartPillars(chart) {
    return [['시주',chart.time||'—'],['일주',chart.day],['월주',chart.month],['년주',chart.year]];
  }
  function calendarLabel(value) { return value==='solar'?'양력':value==='lunarLeap'?'음력 윤달':'음력 평달'; }
  function stemInfo(char) { return SAJU.stems.find(s=>s.char===char); }
  function elementRelation(me,target) {
    const flow={목:'화',화:'토',토:'금',금:'수',수:'목'};
    const control={목:'토',화:'금',토:'수',금:'목',수:'화'};
    if(me===target)return {tag:'공감',kind:'support',text:`두 사람의 일간이 모두 ${me} 기운이라 사고방식이나 속도에서 닮은 점을 찾기 쉽습니다.`};
    if(flow[target]===me)return {tag:'보완',kind:'support',text:`상대의 ${target} 기운이 나의 ${me} 기운을 생하는 흐름이라 정보나 정서적 지원으로 연결될 수 있습니다.`};
    if(flow[me]===target)return {tag:'활력',kind:'energy',text:`나의 ${me} 기운이 상대의 ${target} 기운을 생해 함께 움직일 때 표현과 활동이 활발해질 수 있습니다.`};
    if(control[target]===me)return {tag:'긴장',kind:'tension',text:`상대의 ${target} 기운이 나의 ${me} 기운을 제어하는 관계라 기준이나 속도 차이가 자극으로 느껴질 수 있습니다.`};
    return {tag:'조정',kind:'tension',text:`나의 ${me} 기운이 상대의 ${target} 기운을 제어하는 관계라 역할과 경계를 조율하는 과정이 중요합니다.`};
  }
  function branchRelations(aChart,bChart) {
    const pairs={육합:['子丑','寅亥','卯戌','辰酉','巳申','午未'],충:['子午','丑未','寅申','卯酉','辰戌','巳亥'],파:['子酉','丑辰','寅亥','卯午','巳申','未戌'],해:['子未','丑午','寅巳','卯辰','申亥','酉戌']};
    const a=[aChart.year,aChart.month,aChart.day,aChart.time].filter(Boolean).map(x=>x[1]);
    const b=[bChart.year,bChart.month,bChart.day,bChart.time].filter(Boolean).map(x=>x[1]);
    const found=[];
    Object.entries(pairs).forEach(([name,list])=>a.forEach(x=>b.forEach(y=>{if(list.some(p=>p.includes(x)&&p.includes(y))&&!found.some(f=>f.name===name&&f.pair.includes(x)&&f.pair.includes(y)))found.push({name,pair:`${x}${y}`});})));
    return found.slice(0,4);
  }
  function analyzePerson(person) {
    if(!state.profile?.chart||!person.chart)return null;
    const me=stemInfo(state.profile.chart.dayMaster), target=stemInfo(person.chart.dayMaster);
    if(!me||!target)return null;
    const base=elementRelation(me.element,target.element), relations=branchRelations(state.profile.chart,person.chart);
    return {...base,me,target,relations};
  }
  function showToast(message) {
    toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>toast.classList.remove('show'),1600);
  }
  function setRoute(next) {
    route = next; detail = null;
    if(next==='my')myView='summary';
    if(next==='noble')nobleView='map';
    window.scrollTo(0,0); render();
  }
  function navState() {
    document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===route));
    document.querySelector('.bottom-nav').classList.toggle('hidden', route==='study');
  }

  function nextLesson() {
    if (!state.attempts) return {title:'음양오행 첫걸음',desc:'오행의 흐름과 천간의 기본 속성부터 시작해요.',category:'음양오행'};
    const categoryAttempts = aggregateCategories();
    const order = ['천간','지지','십성','합충형파해','원국 읽기'];
    const next = order.find(cat => (categoryAttempts[cat]?.attempts || 0) < 8) || weakestCategory();
    return {title:`${next} 이어보기`,desc:'기초 규칙과 헷갈리는 개념을 함께 복습해요.',category:next};
  }
  function aggregateCategories() {
    const result={};
    state.history.forEach(h=>{ const r=result[h.category] ||= {attempts:0,correct:0}; r.attempts++; if(h.correct) r.correct++; });
    return result;
  }
  function weakestCategory() {
    const grouped=aggregateCategories();
    return Object.entries(grouped).sort((a,b)=>(a[1].correct/a[1].attempts)-(b[1].correct/b[1].attempts))[0]?.[0] || '천간';
  }

  function renderHome() {
    const lesson=nextLesson(); const masteryValue=overallMastery();
    main.innerHTML = `
      <section class="card hero">
        <div class="hero-top"><div><p>오늘도 한 걸음</p><h1>원국을 읽는 힘을 키워요</h1></div><span class="level-badge">${state.attempts<30?'입문':state.attempts<100?'초급':'중급'}</span></div>
        <div class="progress"><i style="width:${masteryValue}%"></i></div>
        <div class="hero-metrics"><div><b>${masteryValue}%</b><span>숙련도</span></div><div><b>${accuracy()}%</b><span>정답률</span></div><div><b>${state.xp}</b><span>누적 XP</span></div></div>
      </section>
      <div class="section-head"><h2>오늘의 학습</h2><span>약 5분 · 10문제</span></div>
      <section class="card lesson-card"><p class="eyebrow">추천 학습</p><h3>${lesson.title}</h3><p>${lesson.desc}</p><button class="btn btn-primary" data-action="start" data-category="${lesson.category}">이어서 학습</button></section>
      <div class="section-head"><h2>바로가기</h2></div>
      <div class="shortcut-grid">
        <button class="shortcut" data-action="review"><span>↻</span><b>오답 복습</b><small>${state.history.filter(x=>!x.correct).length}문제</small></button>
        <button class="shortcut" data-action="consult"><span>☵</span><b>오늘의 상담</b><small>근거 중심 해석</small></button>
        <button class="shortcut" data-nav="concepts"><span>冊</span><b>개념 사전</b><small>글자부터 십성까지</small></button>
      </div>
      <div class="section-head"><h2>학습 여정</h2><span>기초부터 상담까지</span></div>
      <div class="path-list">
        ${[['1','글자 읽기','음양오행·천간·지지'],['2','관계 계산','십성·합충형파해'],['3','원국 해체','일간·월지·분포'],['4','조합 해석','세력·흐름·운'],['5','상담 연습','근거와 한계 설명']].map((x,i)=>`<div class="path-item"><span class="path-num">${x[0]}</span><div><b>${x[1]}</b><small>${x[2]}</small></div><span class="path-state">${i===0?'학습 중':'예정'}</span></div>`).join('')}
      </div>`;
  }

  function pickQuestions({category=null, review=false, consult=false}={}) {
    let pool=[...SAJU.questions];
    if (consult) pool=pool.filter(q=>q.category==='상담');
    else if(review) {
      const wrongIds=[...new Set(state.history.filter(h=>!h.correct).map(h=>h.questionId))];
      pool=pool.filter(q=>wrongIds.includes(q.id));
      if(!pool.length) { showToast('아직 복습할 오답이 없어 추천 문제를 준비했어요'); pool=[...SAJU.questions]; }
    } else if(category) {
      const same=pool.filter(q=>q.category===category);
      const rest=pool.filter(q=>q.category!==category);
      pool=[...same,...rest];
    }
    const recent=new Set(state.recentQuestionIds.slice(-20));
    const score=q=>{
      const stats=q.conceptIds.map(id=>state.conceptStats[id]||{});
      const weak=stats.length ? 100-(stats.reduce((s,x)=>s+mastery(x),0)/stats.length) : 75;
      return weak + (category&&q.category===category?55:0) + (recent.has(q.id)?-90:0) + Math.random()*25;
    };
    pool.sort((a,b)=>score(b)-score(a));
    const count=consult?1:Math.min(10,pool.length);
    return pool.slice(0,count).map(shuffleQuestion);
  }
  function shuffleQuestion(q) {
    const indexed=q.options.map((option,index)=>({option,index}));
    for(let i=indexed.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [indexed[i],indexed[j]]=[indexed[j],indexed[i]]; }
    return {...q, options:indexed.map(x=>x.option), answer:indexed.findIndex(x=>x.index===q.answer)};
  }
  function startStudy(options={}) {
    session={questions:pickQuestions(options),index:0,answered:false,selected:null,correct:0,earned:0,startedAt:Date.now()};
    route='study'; window.scrollTo(0,0); render();
  }
  function renderStudy() {
    if(!session || session.index>=session.questions.length) return renderComplete();
    const q=session.questions[session.index];
    main.innerHTML=`
      <div class="study-head"><button class="icon-btn" data-action="exit-study">✕</button><div class="study-progress"><i style="width:${(session.index/session.questions.length)*100}%"></i></div><span class="study-count">${session.index+1}/${session.questions.length}</span></div>
      <section class="question"><span class="question-type">${q.type}</span><h2>${escapeHtml(q.question)}</h2>${q.context?`<div class="question-context">${escapeHtml(q.context)}</div>`:''}</section>
      <div class="options">${q.options.map((o,i)=>`<button class="option ${session.answered?(i===q.answer?'correct':i===session.selected?'wrong':''):''}" data-answer="${i}" ${session.answered?'disabled':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${escapeHtml(o.text)}</span></button>`).join('')}</div>
      ${session.answered?renderExplanation(q):''}`;
  }
  function renderExplanation(q) {
    const isCorrect=session.selected===q.answer;
    return `<section class="explanation">
      <div class="result-title"><b>${isCorrect?'✓ 정답입니다':'✕ 다시 구분해 볼까요?'}</b></div>
      <div class="ex-section"><b>핵심 의미</b><p>${escapeHtml(q.explanation.core)}</p></div>
      <div class="ex-section"><b>정답 근거</b><p>${escapeHtml(q.explanation.reason)}</p></div>
      <div class="ex-section"><b>보기 비교</b><p>${escapeHtml(q.explanation.compare)}</p></div>
      <div class="feedback-row"><span>이 해설은 어땠나요?</span><div class="feedback-buttons"><button data-feedback="needs" aria-label="해설 보완 필요">✎</button><button data-feedback="helpful" aria-label="좋은 해설">👍</button></div></div>
      <div class="next-wrap"><button class="btn btn-primary" data-action="next">${session.index===session.questions.length-1?'결과 보기':'다음 문제'}</button></div>
    </section>`;
  }
  function answerQuestion(index) {
    if(session.answered) return;
    const q=session.questions[session.index], correct=index===q.answer;
    session.answered=true; session.selected=index;
    state.attempts++; if(correct){state.correct++;state.streak++;session.correct++;session.earned+=10;state.xp+=10;}else{state.streak=0;session.earned+=2;state.xp+=2;}
    q.conceptIds.forEach(id=>{ const s=state.conceptStats[id] ||= {attempts:0,correct:0,streak:0}; s.attempts++; if(correct){s.correct++;s.streak++;}else{s.streak=0;} });
    state.history.push({questionId:q.id,category:q.category,correct,selected:q.options[index].text,answer:q.options[q.answer].text,at:new Date().toISOString()});
    state.history=state.history.slice(-500); state.recentQuestionIds.push(q.id); state.recentQuestionIds=state.recentQuestionIds.slice(-50); state.lastStudyAt=new Date().toISOString(); saveState(); renderStudy();
  }
  function renderComplete() {
    const rate=pct(session.correct,session.questions.length);
    main.innerHTML=`<section class="complete"><div class="complete-icon">${rate>=70?'✓':'↻'}</div><p class="eyebrow">학습 완료</p><h2>${rate>=80?'아주 잘했어요!':rate>=50?'한 걸음 더 익혔어요':'복습하면 금방 익숙해져요'}</h2><p>틀린 문제는 다시 만날수록 오래 기억됩니다.</p><div class="complete-stats"><div><b>${session.correct}</b><span>정답</span></div><div><b>${rate}%</b><span>정답률</span></div><div><b>+${session.earned}</b><span>XP</span></div></div><button class="btn btn-primary" data-nav="home">홈으로</button><button class="btn btn-secondary" style="margin-top:10px" data-action="review">오답 복습</button></section>`;
  }

  function getConceptCollection(cat) { return SAJU[cat] || []; }
  function renderConcepts() {
    if(detail) return renderConceptDetail();
    const list=getConceptCollection(selectedConceptCategory);
    main.innerHTML=`<h1 class="page-title">개념 사전</h1><p class="page-desc">한자와 한글을 함께 보고, 헷갈리는 개념을 비교해 보세요.</p>
      <div class="chip-row">${SAJU.categories.map(c=>`<button class="chip ${c.id===selectedConceptCategory?'active':''}" data-concept-category="${c.id}">${c.name}</button>`).join('')}</div>
      <div class="concept-grid">${list.map((c,i)=>{const m=mastery(state.conceptStats[c.id]);return `<button class="concept-card" data-concept-index="${i}"><span class="concept-char ${c.element?`element-${c.element}`:''}">${escapeHtml(c.char||c.name)}</span><b>${escapeHtml(c.name)}</b><small>${escapeHtml(c.polarity?`${c.polarity} · ${c.element}`:(c.relation||c.core||c.group))}</small><div class="mastery-mini"><i style="width:${m}%"></i></div></button>`}).join('')}</div>`;
  }
  function renderConceptDetail() {
    const list=getConceptCollection(selectedConceptCategory), c=list[detail]; const stat=state.conceptStats[c.id]||{};
    const body = selectedConceptCategory==='stems' ? `<div class="detail-section"><h3>핵심 성질</h3><p>${c.nature}</p></div><div class="detail-section"><h3>계절과 키워드</h3><p>${c.season} · ${c.keywords.join(' · ')}</p></div><div class="detail-section"><h3>십성 계산 예시</h3><p>${c.char}을 일간으로 두고 상대 글자의 오행 관계와 음양을 차례로 비교합니다.</p></div>`:
      selectedConceptCategory==='branches' ? `<div class="detail-section"><h3>계절과 월</h3><p>${c.season} · ${c.month}</p></div><div class="detail-section"><h3>지장간</h3><p>${c.hidden}</p></div>`:
      selectedConceptCategory==='tenGods' ? `<div class="detail-section"><h3>판단 기준</h3><p>${c.core}</p></div><div class="detail-section"><h3>해석 키워드</h3><p>${c.meaning}</p></div><div class="detail-section"><h3>비교 포인트</h3><p>${c.compare}</p></div>`:
      selectedConceptCategory==='elements' ? `<div class="detail-section"><h3>핵심 흐름</h3><p>${c.relation}</p></div><div class="detail-section"><h3>계절과 키워드</h3><p>${c.season} · ${c.keywords.join(' · ')}</p></div>`:
      `<div class="detail-section"><h3>기본 관계</h3><p>${c.core}</p></div><div class="detail-section"><h3>해석할 때 주의</h3><p>${c.note}</p></div>`;
    main.innerHTML=`<button class="icon-btn" data-action="close-detail">←</button><div class="detail-hero"><span class="detail-char ${c.element?`element-${c.element}`:''}">${escapeHtml(c.char||c.name)}</span><h2>${escapeHtml(c.name)}</h2><p>${escapeHtml(c.polarity?`${c.polarity} · ${c.element}`:(c.group||c.relation||''))}</p></div>${body}<div class="detail-section"><h3>내 학습 기록</h3><p>시도 ${stat.attempts||0} · 정답 ${stat.correct||0} · 숙련도 ${mastery(stat)}%</p></div><button class="btn btn-primary" data-action="practice-concept" data-concept="${c.id}">관련 문제 풀기</button><div class="detail-nav"><button class="btn btn-secondary" data-action="prev-concept">이전</button><button class="btn btn-secondary" data-action="next-concept">다음</button></div>`;
  }

  function renderNoble() {
    if(nobleView==='person-form')return renderPersonForm();
    if(nobleView==='detail')return renderPersonDetail();
    if(!state.profile?.chart){
      main.innerHTML=`<h1 class="page-title">관계</h1><p class="page-desc">내 원국을 중심으로 주변 사람과의 관계를 읽어보세요.</p><section class="card"><div class="empty-illustration">命</div><div class="empty"><b>먼저 내 사주정보가 필요해요</b><p>마이에서 생년월일과 출생시간을 입력하면 관계지도를 만들 수 있습니다.</p></div><button class="btn btn-primary" data-action="open-profile-form">내 사주정보 등록</button></section>`;
      return;
    }
    const positions=[[29,25],[74,31],[78,67],[28,74],[19,47],[54,16],[52,84],[84,48]];
    main.innerHTML=`<div class="section-head" style="margin-top:0"><div><h1 class="page-title">내 관계지도</h1><p class="page-desc" style="margin-bottom:0">관계를 누르면 해석 근거를 볼 수 있어요.</p></div><button class="text-btn" data-action="add-person">+ 등록</button></div>
      ${state.people.length?`<div class="map-wrap"><span class="map-axis map-axis-x"></span><span class="map-axis map-axis-y"></span><button class="person-node me"><b>나</b><small>${state.profile.chart.dayMaster}${stemInfo(state.profile.chart.dayMaster)?.element||''}</small></button>${state.people.slice(0,8).map((p,i)=>{const a=analyzePerson(p)||{tag:'확인',kind:'support'};const pos=positions[i];return `<button class="person-node ${a.kind}" style="left:${pos[0]}%;top:${pos[1]}%" data-person-id="${p.id}"><b>${escapeHtml(p.nickname)}</b><small>${a.tag}</small></button>`}).join('')}</div><div class="map-legend"><span><i class="legend-dot"></i>보완·공감</span><span><i class="legend-dot energy"></i>활력</span><span><i class="legend-dot tension"></i>긴장·조정</span></div>`:`<section class="card"><div class="empty-illustration">縁</div><div class="empty"><b>아직 등록된 사람이 없어요</b><p>가족, 친구, 연인, 동료를 직접 등록해 관계의 흐름을 살펴보세요.</p></div><button class="btn btn-primary" data-action="add-person">첫 사람 등록하기</button></section>`}
      ${state.people.length?`<div class="section-head"><h2>등록한 사람</h2><span>${state.people.length}명</span></div><div class="person-list">${state.people.map(p=>{const a=analyzePerson(p)||{tag:'확인'};return `<div class="person-list-item"><button data-person-id="${p.id}"><b>${escapeHtml(p.nickname)} · ${escapeHtml(p.relationship)}</b><small>${p.chart.dayMaster}${stemInfo(p.chart.dayMaster)?.element||''} · ${a.tag}${p.timeUnknown?' · 출생시간 모름':''}</small></button><button class="delete-btn" data-delete-person="${p.id}" aria-label="${escapeHtml(p.nickname)} 삭제">×</button></div>`}).join('')}</div>`:''}`;
  }
  function renderPersonForm() {
    main.innerHTML=`<button class="icon-btn" data-action="close-person-form">←</button><h1 class="page-title" style="margin-top:16px">주변 사람 등록</h1><p class="page-desc">상대방의 회원가입 없이 별명과 출생정보를 직접 입력합니다.</p>
      <form class="form-stack" data-form="person"><label class="field-group">별명<input class="field-control" name="nickname" maxlength="12" required placeholder="예: 민아"></label><label class="field-group">관계<select class="field-control" name="relationship"><option>친구</option><option>가족</option><option>연인</option><option>직장동료</option><option>기타</option></select></label><div class="field-row"><label class="field-group">생년월일<input class="field-control" name="birthDate" type="date" required></label><label class="field-group">달력 기준<select class="field-control" name="calendar"><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="lunarLeap">음력 윤달</option></select></label></div><label class="field-group">출생시간<input class="field-control" name="birthTime" type="time" value="12:00" required></label><label class="check-row"><input type="checkbox" name="timeUnknown"> 출생시간을 모릅니다</label><div class="form-note">출생시간을 모르면 시주를 제외하고 분석하며 결과에 정보 제한을 표시합니다. 실명 대신 별명 사용을 권장합니다.</div><button class="btn btn-primary" type="submit">등록하고 지도 보기</button></form>`;
  }
  function renderPersonDetail() {
    const person=state.people.find(p=>p.id===selectedPersonId); if(!person){nobleView='map';return renderNoble();}
    const a=analyzePerson(person); const relationText=a.relations.length?a.relations.map(r=>`${r.pair} ${r.name}`).join(', '):'두 원국 사이에서 기본 합·충·파·해가 두드러지지 않습니다.';
    main.innerHTML=`<button class="icon-btn" data-action="back-to-map">←</button><div class="relation-hero" style="margin-top:14px"><strong>${person.chart.day}</strong><h2>${escapeHtml(person.nickname)} · ${escapeHtml(person.relationship)}</h2><p>나 ${state.profile.chart.dayMaster}${a.me.element} ↔ ${escapeHtml(person.nickname)} ${person.chart.dayMaster}${a.target.element}${person.timeUnknown?' · 출생시간 미입력':''}</p></div><section class="relation-section"><h3>${a.tag} 관계의 기본 흐름</h3><p>${a.text}</p></section><section class="relation-section"><h3>지지에서 찾은 관계</h3><p>${relationText}</p></section><section class="relation-section"><h3>해석할 때 주의</h3><p>한 가지 합이나 충만으로 좋은 인연 또는 나쁜 인연을 단정하지 않습니다. 두 원국 전체와 실제 관계 경험을 함께 살펴야 합니다.</p></section><div class="form-note" style="margin:14px 0">이 결과는 명리학 학습을 위한 관계 해석이며 상대의 성격이나 관계의 미래를 확정하지 않습니다.</div><button class="btn btn-secondary" data-action="back-to-map">지도로 돌아가기</button>`;
  }

  function renderReport() {
    const groups=aggregateCategories(); const allCats=['음양오행','천간','지지','십성','합충형파해','원국 읽기','상담'];
    const weak=Object.entries(state.conceptStats).map(([id,s])=>({id,m:mastery(s),...s})).filter(x=>x.attempts>=2).sort((a,b)=>a.m-b.m).slice(0,4);
    const confusions=getConfusions();
    main.innerHTML=`<h1 class="page-title">학습 리포트</h1><p class="page-desc">정답률보다 어디서 헷갈렸는지 확인하는 것이 중요해요.</p><div class="stat-grid"><div class="stat-card"><span>전체 정답률</span><b>${accuracy()}%</b></div><div class="stat-card"><span>푼 문제</span><b>${state.attempts}</b></div><div class="stat-card"><span>숙련 개념</span><b>${Object.values(state.conceptStats).filter(s=>mastery(s)>=70).length}</b></div><div class="stat-card"><span>연속 정답</span><b>${state.streak}</b></div></div>
      <div class="section-head"><h2>영역별 학습</h2></div><section class="card"><div class="bar-list">${allCats.map(c=>{const g=groups[c]||{attempts:0,correct:0};return `<div><div class="bar-label"><span>${c}</span><b>${g.attempts?pct(g.correct,g.attempts)+'%':'미학습'}</b></div><div class="bar"><i style="width:${pct(g.correct,g.attempts)}%"></i></div></div>`}).join('')}</div></section>
      <div class="section-head"><h2>취약 개념</h2></div><section class="card">${weak.length?weak.map(x=>`<div class="bar-label"><span>${conceptName(x.id)}</span><b>${x.m}%</b></div>`).join(''):'<div class="empty">문제를 더 풀면 취약 개념을 찾아드려요.</div>'}</section>
      <div class="section-head"><h2>자주 헷갈리는 개념</h2></div><section class="card">${confusions.length?confusions.map(x=>`<div class="bar-label"><span>${escapeHtml(x.pair)}</span><b>${x.count}회</b></div>`).join(''):'<div class="empty">아직 뚜렷한 혼동 패턴이 없어요.</div>'}</section>`;
  }
  function conceptName(id) {
    for(const key of ['stems','branches','tenGods','elements','relations']) { const c=SAJU[key].find(x=>x.id===id); if(c)return c.name; }
    return id;
  }
  function getConfusions() {
    const map={}; state.history.filter(h=>!h.correct).forEach(h=>{ const pair=[h.selected,h.answer].sort().join(' ↔ '); map[pair]=(map[pair]||0)+1; });
    return Object.entries(map).map(([pair,count])=>({pair,count})).sort((a,b)=>b.count-a.count).slice(0,5);
  }
  function renderMy() {
    if(myView==='profile-form')return renderProfileForm();
    const profile=state.profile;
    main.innerHTML=`<h1 class="page-title">마이</h1><p class="page-desc">내 사주정보와 학습 기록을 관리합니다.</p>
      ${profile?.chart?`<section class="card profile-card"><div class="profile-head"><div><p class="eyebrow">내 사주정보</p><h2>${escapeHtml(profile.nickname)}</h2><p>${escapeHtml(profile.birthDate)} · ${calendarLabel(profile.calendar)}${profile.timeUnknown?' · 출생시간 모름':` · ${profile.birthTime}`}</p></div><button class="text-btn" data-action="open-profile-form">수정</button></div><div class="pillars">${chartPillars(profile.chart).map(x=>`<div class="pillar"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div></section>`:`<section class="card profile-card"><p class="eyebrow">내 사주정보</p><h2 style="margin:0 0 7px;font-size:19px">관계 분석의 기준을 등록해요</h2><p style="margin:0;color:var(--muted);font-size:13px;line-height:1.6">생년월일과 출생시간을 입력하면 내 원국을 계산하고 관계지도에 활용합니다.</p><button class="btn btn-primary" style="margin-top:16px" data-action="open-profile-form">내 사주정보 등록</button></section>`}
      <section class="card"><p class="eyebrow">게스트 학습 중</p><h2 style="margin:0 0 7px;font-size:19px">로그인 없이 바로 배워요</h2><p style="margin:0;color:var(--muted);font-size:13px;line-height:1.6">Google 로그인과 기기 간 동기화는 Firebase 연결 후 제공될 예정입니다.</p><button class="btn btn-secondary" style="margin-top:16px" data-action="login-info">Google로 계속하기</button></section>
      <div class="section-head"><h2>학습 정보</h2></div><div class="list-card"><div class="list-row"><div><b>누적 XP</b><small>정답 10 XP · 오답도 학습 2 XP</small></div><b>${state.xp}</b></div><div class="list-row"><div><b>최근 학습</b><small>${state.lastStudyAt?new Date(state.lastStudyAt).toLocaleDateString('ko-KR'):'아직 기록 없음'}</small></div></div><button class="list-row" data-action="admin"><div><b>관리자 피드백 보기</b><small>현재 기기에 누적된 해설 평가</small></div><span>›</span></button></div>
      <div class="section-head"><h2>데이터</h2></div><div class="list-card"><button class="list-row" data-action="reset"><div><b>학습 기록 초기화</b><small>이 기기의 모든 학습 기록 삭제</small></div><span>›</span></button></div><p style="text-align:center;color:var(--muted);font-size:10px;margin-top:18px">SajuStep v${APP_VERSION}</p>`;
  }
  function renderProfileForm() {
    const p=state.profile||{nickname:'나',birthDate:'',calendar:'solar',birthTime:'12:00',timeUnknown:false,sex:'female'};
    main.innerHTML=`<button class="icon-btn" data-action="close-profile-form">←</button><h1 class="page-title" style="margin-top:16px">내 사주정보</h1><p class="page-desc">입력한 정보로 원국을 자동 계산합니다.</p><form class="form-stack" data-form="profile"><label class="field-group">이름 또는 별명<input class="field-control" name="nickname" value="${escapeHtml(p.nickname)}" maxlength="12" required></label><div class="field-row"><label class="field-group">생년월일<input class="field-control" name="birthDate" type="date" value="${escapeHtml(p.birthDate)}" required></label><label class="field-group">달력 기준<select class="field-control" name="calendar"><option value="solar" ${p.calendar==='solar'?'selected':''}>양력</option><option value="lunar" ${p.calendar==='lunar'?'selected':''}>음력 평달</option><option value="lunarLeap" ${p.calendar==='lunarLeap'?'selected':''}>음력 윤달</option></select></label></div><label class="field-group">출생시간<input class="field-control" name="birthTime" type="time" value="${escapeHtml(p.birthTime||'12:00')}" ${p.timeUnknown?'disabled':''} required></label><label class="check-row"><input type="checkbox" name="timeUnknown" ${p.timeUnknown?'checked':''}> 출생시간을 모릅니다</label><label class="field-group">성별 · 대운 계산 기준<select class="field-control" name="sex"><option value="female" ${p.sex==='female'?'selected':''}>여성</option><option value="male" ${p.sex==='male'?'selected':''}>남성</option></select></label><div class="form-note">현재는 원국과 관계 분석에 사용합니다. 명리학의 운 해석 방식은 관점 차이가 있어 추후 학습 과정에서 구분해 안내합니다.</div><button class="btn btn-primary" type="submit">저장하기</button></form>`;
  }
  function renderAdmin(filter='') {
    const feedback=state.feedback.filter(f=>!filter||`${f.questionId} ${f.question}`.toLowerCase().includes(filter.toLowerCase()));
    main.innerHTML=`<button class="icon-btn" data-nav="my">←</button><h1 class="page-title" style="margin-top:16px">해설 피드백</h1><p class="page-desc">MVP에서는 이 기기에서 발생한 피드백을 확인합니다.</p><div class="notice">정식 운영 전 관리자 인증과 Firestore 저장을 연결해야 합니다.</div><input id="adminSearch" class="search" value="${escapeHtml(filter)}" placeholder="문제 ID 또는 질문 검색"><div class="admin-table">${feedback.length?feedback.slice().reverse().map(f=>`<article class="admin-item"><div class="admin-meta"><span>${f.type==='helpful'?'👍 도움됨':'✎ 보완 필요'}</span><span>${new Date(f.at).toLocaleString('ko-KR')}</span><span>${f.questionId}</span></div><p><b>${escapeHtml(f.question)}</b></p><p>정답: ${escapeHtml(f.answer)}</p></article>`).join(''):'<div class="empty">조건에 맞는 피드백이 없습니다.</div>'}</div>`;
  }
  function render() {
    document.getElementById('headerXp').textContent=`${state.xp} XP`; navState();
    if(route==='home')renderHome(); else if(route==='study')renderStudy(); else if(route==='concepts')renderConcepts(); else if(route==='noble')renderNoble(); else if(route==='report')renderReport(); else if(route==='my')renderMy(); else if(route==='admin')renderAdmin();
    navState(); main.focus({preventScroll:true});
  }

  document.addEventListener('click', e=>{
    const nav=e.target.closest('[data-nav]'); if(nav){setRoute(nav.dataset.nav);return;}
    const answer=e.target.closest('[data-answer]'); if(answer){answerQuestion(Number(answer.dataset.answer));return;}
    const cat=e.target.closest('[data-concept-category]'); if(cat){selectedConceptCategory=cat.dataset.conceptCategory;detail=null;render();return;}
    const concept=e.target.closest('[data-concept-index]'); if(concept){detail=Number(concept.dataset.conceptIndex);render();return;}
    const person=e.target.closest('[data-person-id]'); if(person){selectedPersonId=person.dataset.personId;nobleView='detail';render();return;}
    const deletePerson=e.target.closest('[data-delete-person]'); if(deletePerson){const target=state.people.find(p=>p.id===deletePerson.dataset.deletePerson);if(target&&confirm(`${target.nickname} 정보를 삭제할까요?`)){state.people=state.people.filter(p=>p.id!==target.id);saveState();render();}return;}
    const feedback=e.target.closest('[data-feedback]'); if(feedback){const q=session.questions[session.index];state.feedback.push({type:feedback.dataset.feedback,questionId:q.id,question:q.question,answer:q.options[q.answer].text,at:new Date().toISOString()});saveState();showToast('체크되었습니다');return;}
    const action=e.target.closest('[data-action]'); if(!action)return;
    switch(action.dataset.action){
      case 'start':startStudy({category:action.dataset.category});break;
      case 'review':startStudy({review:true});break;
      case 'consult':startStudy({consult:true});break;
      case 'exit-study':setRoute('home');break;
      case 'next':session.index++;session.answered=false;session.selected=null;window.scrollTo(0,0);renderStudy();break;
      case 'close-detail':detail=null;render();break;
      case 'prev-concept':{const l=getConceptCollection(selectedConceptCategory);detail=(detail-1+l.length)%l.length;render();break;}
      case 'next-concept':{const l=getConceptCollection(selectedConceptCategory);detail=(detail+1)%l.length;render();break;}
      case 'practice-concept':{const pool=SAJU.questions.filter(q=>q.conceptIds.includes(action.dataset.concept));session={questions:(pool.length?pool:SAJU.questions).slice(0,10).map(shuffleQuestion),index:0,answered:false,selected:null,correct:0,earned:0};route='study';render();break;}
      case 'login-info':showToast('Firebase 설정 후 Google 로그인을 연결할 예정입니다');break;
      case 'admin':route='admin';render();break;
      case 'open-profile-form':route='my';myView='profile-form';render();break;
      case 'close-profile-form':myView='summary';render();break;
      case 'add-person':nobleView='person-form';render();break;
      case 'close-person-form':nobleView='map';render();break;
      case 'back-to-map':nobleView='map';selectedPersonId=null;render();break;
      case 'reset':if(confirm('이 기기의 학습 기록을 모두 삭제할까요?')){state={...defaultState};saveState();setRoute('home');}break;
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.name==='timeUnknown'){
      const form=e.target.closest('form'), time=form?.querySelector('[name="birthTime"]');
      if(time)time.disabled=e.target.checked;
    }
  });
  document.addEventListener('submit',e=>{
    const form=e.target.closest('[data-form]'); if(!form)return; e.preventDefault();
    const fd=new FormData(form), profile={nickname:String(fd.get('nickname')||'').trim(),birthDate:String(fd.get('birthDate')||''),calendar:String(fd.get('calendar')||'solar'),birthTime:String(fd.get('birthTime')||'12:00'),timeUnknown:fd.get('timeUnknown')==='on'};
    try{
      profile.chart=calculateChart(profile);
      if(form.dataset.form==='profile'){
        profile.sex=String(fd.get('sex')||'female'); state.profile=profile; myView='summary'; saveState(); showToast('내 사주정보를 저장했습니다'); render();
      }else{
        profile.relationship=String(fd.get('relationship')||'기타'); profile.id=`person-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; state.people.push(profile); nobleView='map'; saveState(); showToast('관계지도에 등록했습니다'); render();
      }
    }catch(error){showToast(error.message||'입력 정보를 확인해 주세요');}
  });
  document.addEventListener('input',e=>{if(e.target.id==='adminSearch')renderAdmin(e.target.value);});
  let touchX=0;
  main.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].screenX;},{passive:true});
  main.addEventListener('touchend',e=>{if(route!=='concepts'||detail===null)return;const dx=e.changedTouches[0].screenX-touchX;if(Math.abs(dx)>70){const l=getConceptCollection(selectedConceptCategory);detail=dx<0?(detail+1)%l.length:(detail-1+l.length)%l.length;render();}},{passive:true});

  async function checkVersion(){
    try { const res=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'}); if(!res.ok)return; const {version}=await res.json(); const key='sajustep-reloaded-version'; if(version&&version!==APP_VERSION&&sessionStorage.getItem(key)!==version){sessionStorage.setItem(key,version);location.reload();} } catch { /* 오프라인에서는 기존 화면 유지 */ }
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkVersion();});
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  checkVersion(); render();
})();
