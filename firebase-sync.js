import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const STORAGE_KEY='sajustep-state-v1';
const OWNER_KEY='sajustep-state-owner-v1';
const GUEST_OWNER='guest';
const config=window.SAJU_FIREBASE_CONFIG;

let activeUser=null;
let lastLocalSnapshot=localStorage.getItem(STORAGE_KEY)||'';
let saveTimer=null;
let syncInProgress=false;

function readLocal(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}') || {}; }
  catch { return {}; }
}
function writeLocal(value){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(value));
  lastLocalSnapshot=localStorage.getItem(STORAGE_KEY)||'';
}
function num(v){ return Number.isFinite(Number(v)) ? Number(v) : 0; }
function later(a,b){
  if(!a) return b||null;
  if(!b) return a||null;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}
function mergeHistory(a=[],b=[],limit=500){
  const all=[...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])];
  const seen=new Set();
  return all.filter(item=>{
    const key=`${item?.questionId||''}|${item?.selected||''}|${item?.answer||''}|${item?.at||''}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((x,y)=>String(x?.at||'').localeCompare(String(y?.at||''))).slice(-limit);
}
function mergeFeedback(a=[],b=[]){
  const all=[...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])];
  const seen=new Set();
  return all.filter(item=>{
    const key=`${item?.questionId||''}|${item?.type||''}|${item?.at||''}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(-500);
}
function mergeProfile(local,remote){
  if(!local)return remote||null;
  if(!remote)return local;
  return (Date.parse(remote.updatedAt||'')||0)>(Date.parse(local.updatedAt||'')||0)?remote:local;
}
function mergePeople(a=[],b=[]){
  const out=[];
  const positions=new Map();
  for(const person of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){
    if(!person)continue;
    const key=person.id || `${person.nickname||''}|${person.birthDate||''}|${person.birthTime||''}|${person.relationship||''}`;
    const index=positions.get(key);
    if(index===undefined){positions.set(key,out.length);out.push(person);continue;}
    const currentTime=Date.parse(out[index]?.updatedAt||'')||0;
    const nextTime=Date.parse(person.updatedAt||'')||0;
    if(nextTime>currentTime)out[index]=person;
  }
  return out;
}
function mergeRecent(a=[],b=[]){
  return [...new Set([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])])].slice(-50);
}
function mergeConceptStatsSafe(local={},remote={}){
  const out={...remote};
  for(const [id,stat] of Object.entries(local||{})){
    const prev=out[id]||{};
    const attempts=Math.max(num(stat?.attempts),num(prev?.attempts));
    out[id]={attempts,correct:Math.min(attempts,Math.max(num(stat?.correct),num(prev?.correct))),streak:Math.max(num(stat?.streak),num(prev?.streak))};
  }
  return out;
}
function mergeConceptStatsAdd(guest={},remote={}){
  const out={...remote};
  for(const [id,stat] of Object.entries(guest||{})){
    const prev=out[id]||{};
    const attempts=num(stat?.attempts)+num(prev?.attempts);
    out[id]={attempts,correct:Math.min(attempts,num(stat?.correct)+num(prev?.correct)),streak:Math.max(num(stat?.streak),num(prev?.streak))};
  }
  return out;
}
function mergeSafe(local={},remote={}){
  const attempts=Math.max(num(local.attempts),num(remote.attempts));
  return {
    ...remote,...local,
    version:local.version||remote.version||'1.2.1',
    xp:Math.max(num(local.xp),num(remote.xp)),
    attempts,
    correct:Math.min(attempts,Math.max(num(local.correct),num(remote.correct))),
    streak:Math.max(num(local.streak),num(remote.streak)),
    conceptStats:mergeConceptStatsSafe(local.conceptStats,remote.conceptStats),
    recentQuestionIds:mergeRecent(remote.recentQuestionIds,local.recentQuestionIds),
    feedback:mergeFeedback(remote.feedback,local.feedback),
    history:mergeHistory(remote.history,local.history),
    lastStudyAt:later(local.lastStudyAt,remote.lastStudyAt),
    profile:mergeProfile(local.profile,remote.profile),
    people:mergePeople(local.people,remote.people)
  };
}
function mergeGuest(guest={},remote={}){
  const attempts=num(remote.attempts)+num(guest.attempts);
  return {
    ...remote,...guest,
    version:guest.version||remote.version||'1.2.1',
    xp:num(remote.xp)+num(guest.xp),
    attempts,
    correct:Math.min(attempts,num(remote.correct)+num(guest.correct)),
    streak:Math.max(num(remote.streak),num(guest.streak)),
    conceptStats:mergeConceptStatsAdd(guest.conceptStats,remote.conceptStats),
    recentQuestionIds:mergeRecent(remote.recentQuestionIds,guest.recentQuestionIds),
    feedback:mergeFeedback(remote.feedback,guest.feedback),
    history:mergeHistory(remote.history,guest.history),
    lastStudyAt:later(guest.lastStudyAt,remote.lastStudyAt),
    profile:mergeProfile(guest.profile,remote.profile),
    people:mergePeople(guest.people,remote.people)
  };
}
function authErrorMessage(err){
  const code=err?.code||'unknown';
  const messages={
    'auth/unauthorized-domain':'현재 접속한 도메인이 Firebase 승인 도메인에 등록되지 않았습니다.',
    'auth/operation-not-allowed':'Firebase Authentication에서 Google 로그인이 아직 활성화되지 않았습니다.',
    'auth/popup-blocked':'브라우저에서 로그인 팝업이 차단되었습니다.',
    'auth/popup-closed-by-user':'Google 로그인 창이 완료 전에 닫혔습니다.',
    'auth/cancelled-popup-request':'다른 로그인 요청이 진행 중입니다.'
  };
  return `${messages[code]||err?.message||'Google 로그인에 실패했습니다.'}\n\n오류 코드: ${code}\n접속 도메인: ${location.hostname}\nFirebase 프로젝트: ${config?.projectId||'설정 없음'}\n오류 내용: ${err?.message||'없음'}`;
}
function updateAccountCard(){
  const button=document.querySelector('[data-action="login-info"],[data-action="saju-logout"]');
  if(!button) return;
  const card=button.closest('.card');
  if(!card) return;
  const eyebrow=card.querySelector('.eyebrow');
  const title=card.querySelector('h2');
  const desc=card.querySelector('p:not(.eyebrow)');
  if(activeUser){
    if(eyebrow) eyebrow.textContent='Google 계정';
    if(title) title.textContent=activeUser.displayName||activeUser.email||'로그인됨';
    if(desc) desc.textContent='학습 기록, 내 사주정보와 관계 데이터를 이 계정에 동기화합니다.';
    button.dataset.action='saju-logout';
    button.textContent='로그아웃';
  }else{
    if(eyebrow) eyebrow.textContent='게스트 학습 중';
    if(title) title.textContent='로그인 없이 바로 배워요';
    if(desc) desc.textContent='Google로 로그인하면 학습 기록과 사주정보를 다른 기기에서도 이어볼 수 있습니다.';
    button.dataset.action='login-info';
    button.textContent='Google로 계속하기';
  }
}

if(!config){
  console.info('[SajuStep] Firebase config not set. Guest mode is active.');
  localStorage.setItem(OWNER_KEY,GUEST_OWNER);
}else{
  const app=initializeApp(config,'sajustep');
  const auth=getAuth(app);
  const db=getFirestore(app);
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  await setPersistence(auth,browserLocalPersistence);

  async function pushState(user){
    if(!user) return;
    await setDoc(doc(db,'users',user.uid),{
      sajuStep:{state:readLocal(),updatedAt:serverTimestamp()},
      email:user.email||null,
      displayName:user.displayName||null
    },{merge:true});
  }
  async function loadOrMerge(user,mode){
    const ref=doc(db,'users',user.uid);
    const snap=await getDoc(ref);
    const local=readLocal();
    const remote=snap.exists()?(snap.data()?.sajuStep?.state||{}):{};
    const merged=mode==='guest'?mergeGuest(local,remote):mode==='same'?mergeSafe(local,remote):mergeSafe({},remote);
    writeLocal(merged);
    await setDoc(ref,{
      sajuStep:{state:merged,updatedAt:serverTimestamp()},
      email:user.email||null,
      displayName:user.displayName||null
    },{merge:true});
  }
  async function login(){
    try { await signInWithPopup(auth,provider); }
    catch(err){ console.error('[SajuStep] Google login failed',err); alert(authErrorMessage(err)); }
  }
  async function logout(){
    try { if(activeUser) await pushState(activeUser); } catch(err){ console.error('[SajuStep] final cloud save failed',err); }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(OWNER_KEY,GUEST_OWNER);
    await signOut(auth);
    location.reload();
  }

  document.addEventListener('click',event=>{
    const loginButton=event.target.closest('[data-action="login-info"]');
    const logoutButton=event.target.closest('[data-action="saju-logout"]');
    if(!loginButton&&!logoutButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(loginButton) login(); else logout();
  },true);

  const observer=new MutationObserver(()=>updateAccountCard());
  observer.observe(document.getElementById('main'),{childList:true});

  onAuthStateChanged(auth,async user=>{
    syncInProgress=true;
    clearTimeout(saveTimer);
    window.dispatchEvent(new Event('sajustep-sync-start'));
    activeUser=user;
    window.SAJU_AUTH_USER=user?{uid:user.uid,displayName:user.displayName||'',email:user.email||'',photoURL:user.photoURL||''}:null;
    if(!user){
      const owner=localStorage.getItem(OWNER_KEY);
      if(owner&&owner!==GUEST_OWNER) localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(OWNER_KEY,GUEST_OWNER);
      syncInProgress=false;
      lastLocalSnapshot=localStorage.getItem(STORAGE_KEY)||'';
      window.dispatchEvent(new Event('sajustep-sync-complete'));
      updateAccountCard();
      return;
    }
    const owner=localStorage.getItem(OWNER_KEY);
    const mode=!owner||owner===GUEST_OWNER?'guest':owner===user.uid?'same':'other';
    if(mode==='other') localStorage.removeItem(STORAGE_KEY);
    try{
      await loadOrMerge(user,mode);
      localStorage.setItem(OWNER_KEY,user.uid);
    }catch(err){
      console.error('[SajuStep] cloud sync failed',err);
      localStorage.setItem(OWNER_KEY,user.uid);
    }
    syncInProgress=false;
    lastLocalSnapshot=localStorage.getItem(STORAGE_KEY)||'';
    window.dispatchEvent(new Event('sajustep-sync-complete'));
    updateAccountCard();
  });

  setInterval(()=>{
    if(!activeUser||syncInProgress) return;
    const current=localStorage.getItem(STORAGE_KEY)||'';
    if(current===lastLocalSnapshot) return;
    lastLocalSnapshot=current;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>pushState(activeUser).catch(err=>console.error('[SajuStep] cloud save failed',err)),500);
  },1000);
}
