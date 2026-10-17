/* TSC - Riposi, ferie e turni senza orario. Versione 2. */
(() => {
  'use strict';
  const isAbsence = s => s && ['riposo','ferie'].includes(s.dayType);
  const absenceLabel = type => type === 'ferie' ? 'Ferie' : 'Riposo';
  const originalForm = shiftForm;
  shiftForm = function(sid,dateArg,techArg) {
    originalForm(sid,dateArg,techArg);
    const form=document.getElementById('shiftForm');
    if(!form || form.querySelector('[name="dayType"]'))return;
    const old=db.shifts.find(x=>x.id===sid);
    const root=form.querySelector('.form');
    const field=document.createElement('label');field.className='full';field.textContent='Tipo di giornata';
    const type=document.createElement('select');type.name='dayType';
    [['lavoro','Turno di lavoro'],['riposo','Riposo'],['ferie','Ferie']].forEach(([value,text])=>{
      const option=document.createElement('option');option.value=value;option.textContent=text;type.append(option);
    });
    type.value=isAbsence(old)?old.dayType:'lavoro';field.append(type);root.prepend(field);
    const noTimeLabel=document.createElement('label');noTimeLabel.className='full';
    noTimeLabel.style.cssText='display:flex;flex-direction:row;gap:10px;align-items:center';
    const noTime=document.createElement('input');noTime.type='checkbox';noTime.name='withoutTime';
    noTime.style.cssText='width:18px;height:18px';
    noTime.checked=!!old&&!isAbsence(old)&&(old.withoutTime===true||(Array.isArray(old.slots)&&old.slots.length===0));
    noTimeLabel.append(noTime,document.createTextNode('Senza orario'));field.after(noTimeLabel);
    const note=document.createElement('p');note.className='note full';noTimeLabel.after(note);
    const slots=form.querySelector('#slots');
    if(slots&&!slots.querySelector('.slot'))slots.innerHTML=formSlots([{start:'09:00',end:'13:00'}]);
    const containers=new Set(),stored=new Map();
    for(const selector of ['[name="title"]','[name="space"]','[name="need"]','[name="status"]','[name="equipment"]','[name="van"]','#inlineSpace','#addSpace','#inlineRole','#addRole']){
      const input=form.querySelector(selector);if(!input)continue;
      stored.set(input,{disabled:input.disabled,required:input.required});
      const container=input.closest('label')||input.closest('.inline');if(container)containers.add(container);
    }
    const roles=form.querySelector('#roleChecks')?.closest('fieldset');if(roles)containers.add(roles);
    const slotField=slots?.closest('fieldset');
    function update(){
      const absent=type.value!=='lavoro',hideTime=absent||noTime.checked;
      noTimeLabel.hidden=absent;noTime.disabled=absent;
      containers.forEach(el=>el.hidden=absent);
      stored.forEach((state,input)=>{input.disabled=absent||state.disabled;input.required=!absent&&state.required;});
      form.querySelectorAll('#roleChecks input').forEach(input=>input.disabled=absent);
      if(slotField){slotField.hidden=hideTime;slotField.querySelectorAll('input,button').forEach(input=>input.disabled=hideTime);}
      note.hidden=!hideTime;
      note.textContent=absent?'Seleziona data e tecnici. Riposi e ferie non hanno orario.':'Il turno verrà salvato senza fasce orarie. Potrai aggiungerle in seguito.';
    }
    type.onchange=update;noTime.onchange=update;update();
    const originalSubmit=form.onsubmit;
    form.onsubmit=function(event){
      const absent=type.value!=='lavoro';
      if(!absent&&!noTime.checked){
        const previousType=old?.dayType,previousWithoutTime=old?.withoutTime;
        if(old){old.dayType='lavoro';old.withoutTime=false;}
        try{return originalSubmit.call(this,event);}
        finally{if(old&&db.shifts.includes(old)){old.dayType=previousType;old.withoutTime=previousWithoutTime;}}
      }
      event.preventDefault();if(!unlocked)return;
      const data=new FormData(form),tech=data.getAll('tech').map(String),day=String(data.get('date')||'');
      if(!day)return toast('Seleziona la data.');
      if(absent&&!tech.length)return toast('Seleziona almeno un tecnico per riposo o ferie.');
      const title=absent?absenceLabel(type.value):String(data.get('title')||'').trim();
      const space=absent?'':String(data.get('space')||'');
      if(!absent&&(!title||!space))return toast('Completa attività e spazio.');
      const roles=data.getAll('roles').map(String);
      const entry={...(old||{}),id:old?old.id:uid(),dayType:absent?type.value:'lavoro',withoutTime:true,title,date:day,space,slots:[],roles:absent?[]:(roles.length?roles:['Tecnico']),need:absent?tech.length:(Number(data.get('need'))||1),tech,equipment:absent?'':String(data.get('equipment')||'').trim(),van:!absent&&data.get('van')==='on',status:absent?'Confermato':String(data.get('status')||'In attesa'),notes:String(data.get('notes')||'')};
      if(old)db.shifts=db.shifts.map(x=>x.id===entry.id?entry:x);else db.shifts.push(entry);
      save();close();render();
    };
  };
  const originalView=viewShift;
  viewShift=function(sid){
    const entry=db.shifts.find(x=>x.id===sid);
    const noSlots=entry&&Array.isArray(entry.slots)&&entry.slots.length===0;
    if(!entry||(!isAbsence(entry)&&!noSlots))return originalView(sid);
    const absent=isAbsence(entry);
    let html='<div class="note"><p><b>Data:</b> '+esc(entry.date)+'</p>';
    if(!absent){
      html+='<p><b>Spazio:</b> '+esc(entry.space)+'</p><p><b>Mansioni:</b> '+esc((entry.roles||[]).join(', '))+'</p><p><b>Tecnici necessari:</b> '+esc(entry.need)+'</p><p><b>Stato:</b> '+esc(entry.status)+'</p>';
    }
    html+='<p><b>Tecnici assegnati:</b></p><ul>'+(entry.tech.length?entry.tech.map(id=>'<li>'+esc(tname(id))+'</li>').join(''):'<li>Nessuno</li>')+'</ul>';
    if(entry.equipment)html+='<p><b>Attrezzatura:</b></p><pre class="eq">'+esc(entry.equipment)+'</pre>';
    if(entry.van)html+='<p><b>Furgone:</b> richiesto</p>';
    if(entry.notes)html+='<p><b>Note:</b></p><pre class="eq">'+esc(entry.notes)+'</pre>';
    html+='</div><div class="actions"><button type="button" class="close">Chiudi</button>'+(unlocked?'<button type="button" id="editUntimedShift" class="primary">Modifica</button>':'')+'</div>';
    modal(absent?absenceLabel(entry.dayType):entry.title,html);
    const edit=document.getElementById('editUntimedShift');if(edit)edit.onclick=()=>{close();shiftForm(sid);};
    if(unlocked&&!absent&&typeof copyShiftCard==='function'){
      const copy=document.createElement('button');copy.type='button';copy.textContent='Copia card';copy.onclick=()=>copyShiftCard(sid);document.querySelector('#modalBody .actions').append(copy);
    }
  };
  function decorate(){
    document.querySelectorAll('[data-view-shift],[data-open-shift]').forEach(card=>{
      const entry=db.shifts.find(x=>x.id===(card.dataset.viewShift||card.dataset.openShift));if(!entry)return;
      if(isAbsence(entry)){
        if(card.dataset.absenceType===entry.dayType)return;
        card.dataset.absenceType=entry.dayType;card.classList.remove('open','wait');
        card.style.background=entry.dayType==='ferie'?'#e5f3ee':'#edf0f5';card.style.color='#233b42';card.style.borderLeftColor=entry.dayType==='ferie'?'#347458':'#66758b';card.textContent=absenceLabel(entry.dayType);
      }else if(Array.isArray(entry.slots)&&!entry.slots.length){
        const empty=card.querySelector('b');if(empty&&!empty.textContent.trim())empty.remove();
      }
    });
  }
  const style=document.createElement('style');style.textContent='#shiftForm [hidden]{display:none!important}';document.head.append(style);
  const content=document.getElementById('content');if(content)new MutationObserver(decorate).observe(content,{childList:true,subtree:true});decorate();
})();
