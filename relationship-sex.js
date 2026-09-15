(() => {
  'use strict';
  const STORAGE_KEY='sajustep-state-v1';

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}
    catch{return {};}
  }
  function writeState(state){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  }
  function genderLabel(value){return value==='male'?'남성':'여성';}

  function enhancePersonForm(){
    const form=document.querySelector('form[data-form="person"]');
    if(!form||form.querySelector('[name="sex"]'))return;
    const editId=form.dataset.editPersonId||'';
    const state=readState();
    const person=(state.people||[]).find(item=>item.id===editId);
    const current=person?.sex==='male'?'male':'female';
    const note=form.querySelector('.form-note');
    const label=document.createElement('label');
    label.className='field-group';
    label.innerHTML=`성별 · 대운 계산 기준<select class="field-control" name="sex"><option value="female" ${current==='female'?'selected':''}>여성</option><option value="male" ${current==='male'?'selected':''}>남성</option></select>`;
    if(note)form.insertBefore(label,note); else form.appendChild(label);
  }

  function showStoredGender(){
    const hero=document.querySelector('.relation-hero');
    if(!hero||hero.dataset.genderEnhanced==='1')return;
    const title=hero.querySelector('h2')?.textContent||'';
    const nickname=title.split(' · ')[0]?.trim();
    if(!nickname)return;
    const people=readState().people||[];
    const person=people.find(item=>item.nickname===nickname&&item.sex);
    const meta=hero.querySelector('p');
    if(person&&meta&&!meta.textContent.includes(genderLabel(person.sex)))meta.textContent+=` · ${genderLabel(person.sex)}`;
    hero.dataset.genderEnhanced='1';
  }

  function enhance(){
    enhancePersonForm();
    showStoredGender();
  }

  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-form="person"]');
    if(!form)return;
    const sex=form.querySelector('[name="sex"]')?.value||'female';
    const editId=form.dataset.editPersonId||'';
    const before=readState();
    const beforeIds=new Set((before.people||[]).map(person=>person.id));
    setTimeout(()=>{
      const state=readState();
      const people=Array.isArray(state.people)?state.people:[];
      let person=editId?people.find(item=>item.id===editId):people.find(item=>!beforeIds.has(item.id));
      if(!person&&!editId)person=people[people.length-1];
      if(!person)return;
      person.sex=sex;
      person.updatedAt=new Date().toISOString();
      state.people=people;
      writeState(state);
      window.dispatchEvent(new Event('sajustep-sync-complete'));
    },0);
  },true);

  const main=document.getElementById('main');
  if(main)new MutationObserver(enhance).observe(main,{childList:true,subtree:true});
  enhance();
})();
