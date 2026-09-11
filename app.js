(() => {
  'use strict';
  const STORAGE_KEY = 'sajustep-state-v1';
  const APP_VERSION = '1.0.0';
  const defaultState = {
    version: APP_VERSION, xp: 0, attempts: 0, correct: 0, streak: 0,
    conceptStats: {}, recentQuestionIds: [], feedback: [], history: [], lastStudyAt: null
  };
  let state = loadState();
  let route = 'home';
  let session = null;
  let selectedConceptCategory = 'stems';
  let detail = null;
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
  function showToast(message) {
    toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>toast.classList.remove('show'),1600);
  }
  function setRoute(next) {
    route = next; detail = null; window.scrollTo(0,0); render();
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
    main.innerHTML=`<h1 class="page-title">마이</h1><p class="page-desc">학습 기록은 현재 이 기기에 안전하게 저장됩니다.</p>
      <section class="card"><p class="eyebrow">게스트 학습 중</p><h2 style="margin:0 0 7px;font-size:19px">로그인 없이 바로 배워요</h2><p style="margin:0;color:var(--muted);font-size:13px;line-height:1.6">Google 로그인과 기기 간 동기화는 Firebase 연결 후 제공될 예정입니다.</p><button class="btn btn-secondary" style="margin-top:16px" data-action="login-info">Google로 계속하기</button></section>
      <div class="section-head"><h2>학습 정보</h2></div><div class="list-card"><div class="list-row"><div><b>누적 XP</b><small>정답 10 XP · 오답도 학습 2 XP</small></div><b>${state.xp}</b></div><div class="list-row"><div><b>최근 학습</b><small>${state.lastStudyAt?new Date(state.lastStudyAt).toLocaleDateString('ko-KR'):'아직 기록 없음'}</small></div></div><button class="list-row" data-action="admin"><div><b>관리자 피드백 보기</b><small>현재 기기에 누적된 해설 평가</small></div><span>›</span></button></div>
      <div class="section-head"><h2>데이터</h2></div><div class="list-card"><button class="list-row" data-action="reset"><div><b>학습 기록 초기화</b><small>이 기기의 모든 학습 기록 삭제</small></div><span>›</span></button></div><p style="text-align:center;color:var(--muted);font-size:10px;margin-top:18px">SajuStep v${APP_VERSION}</p>`;
  }
  function renderAdmin(filter='') {
    const feedback=state.feedback.filter(f=>!filter||`${f.questionId} ${f.question}`.toLowerCase().includes(filter.toLowerCase()));
    main.innerHTML=`<button class="icon-btn" data-nav="my">←</button><h1 class="page-title" style="margin-top:16px">해설 피드백</h1><p class="page-desc">MVP에서는 이 기기에서 발생한 피드백을 확인합니다.</p><div class="notice">정식 운영 전 관리자 인증과 Firestore 저장을 연결해야 합니다.</div><input id="adminSearch" class="search" value="${escapeHtml(filter)}" placeholder="문제 ID 또는 질문 검색"><div class="admin-table">${feedback.length?feedback.slice().reverse().map(f=>`<article class="admin-item"><div class="admin-meta"><span>${f.type==='helpful'?'👍 도움됨':'✎ 보완 필요'}</span><span>${new Date(f.at).toLocaleString('ko-KR')}</span><span>${f.questionId}</span></div><p><b>${escapeHtml(f.question)}</b></p><p>정답: ${escapeHtml(f.answer)}</p></article>`).join(''):'<div class="empty">조건에 맞는 피드백이 없습니다.</div>'}</div>`;
  }
  function render() {
    document.getElementById('headerXp').textContent=`${state.xp} XP`; navState();
    if(route==='home')renderHome(); else if(route==='study')renderStudy(); else if(route==='concepts')renderConcepts(); else if(route==='report')renderReport(); else if(route==='my')renderMy(); else if(route==='admin')renderAdmin();
    navState(); main.focus({preventScroll:true});
  }

  document.addEventListener('click', e=>{
    const nav=e.target.closest('[data-nav]'); if(nav){setRoute(nav.dataset.nav);return;}
    const answer=e.target.closest('[data-answer]'); if(answer){answerQuestion(Number(answer.dataset.answer));return;}
    const cat=e.target.closest('[data-concept-category]'); if(cat){selectedConceptCategory=cat.dataset.conceptCategory;detail=null;render();return;}
    const concept=e.target.closest('[data-concept-index]'); if(concept){detail=Number(concept.dataset.conceptIndex);render();return;}
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
      case 'reset':if(confirm('이 기기의 학습 기록을 모두 삭제할까요?')){state={...defaultState};saveState();setRoute('home');}break;
    }
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
