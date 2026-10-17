/* TSC - Riposi e ferie: caricare dopo gli script originali. */
(() => {
  'use strict';
  const isAbsence = s => s && ['riposo', 'ferie'].includes(s.dayType);
  const label = type => type === 'ferie' ? 'Ferie' : 'Riposo';
  const originalForm = shiftForm;
  shiftForm = function(sid, dateArg, techArg) {
    originalForm(sid, dateArg, techArg);
    const form = document.getElementById('shiftForm');
    if (!form || form.querySelector('[name="dayType"]')) return;
    const old = db.shifts.find(x => x.id === sid);
    const field = document.createElement('label');
    field.className = 'full';
    field.append(document.createTextNode('Tipo di giornata'));
    const type = document.createElement('select');
    type.name = 'dayType';
    [['lavoro','Turno di lavoro'],['riposo','Riposo'],['ferie','Ferie']].forEach(([value,text]) => {
      const option = document.createElement('option'); option.value=value; option.textContent=text; type.append(option);
    });
    type.value = isAbsence(old) ? old.dayType : 'lavoro';
    field.append(type);form.querySelector('.form').prepend(field);
    const notice=document.createElement('p');notice.className='note full';
    notice.textContent='Riposi e ferie non hanno orario. Seleziona i tecnici e la data; le note sono facoltative.';
    field.after(notice);
    const selectors=['[name="title"]','[name="space"]','[name="need"]','[name="status"]','[name="equipment"]','[name="van"]','#inlineSpace','#addSpace','#inlineRole','#addRole'];
    const stored = new Map();
    const containers=new Set();
    selectors.forEach(selector=>{
      const input=form.querySelector(selector);if(!input)return;
      stored.set(input,{disabled:input.disabled,required:input.required});
      const container=input.closest('label')||input.closest('.inline');if(container)containers.add(container);
    });
    for(const selector of ['#slots','#roleChecks']){const el=form.querySelector(selector);if(el)containers.add(el.closest('fieldset'));}
    function update(){
      const absent=type.value!=='lavoro';notice.hidden=!absent;
      containers.forEach(el=>{if(el)el.hidden=absent;});
      stored.forEach((state,input)=>{input.disabled=absent||state.disabled;input.required=!absent&&state.required;});
      form.querySelectorAll('#slots input,#slots button,#addSlot,#roleChecks input').forEach(input=>input.disabled=absent);
      if(!absent && !form.querySelector('#slots .slot')) form.querySelector('#slots').innerHTML=formSlots([{start:'09:00',end:'13:00'}]);
    }
    type.onchange=update;update();
    const originalSubmit=form.onsubmit;
    form.onsubmit=function(event){
      if(type.value==='lavoro'){
        const prior=old&&old.dayType;
        if(old)old.dayType='lavoro';
        try{return originalSubmit.call(this,event);}finally{if(old&&db.shifts.includes(old))old.dayType=prior;}
      }
      event.preventDefault();
      if(!unlocked)return;
      const data=new FormData(form),tech=data.getAll('tech').map(String),day=String(data.get('date')||'');
      if(!day)return toast('Seleziona la data.');
      if(!tech.length)return toast('Seleziona almeno un tecnico per riposo o ferie.');
      const entry={...(old||{}),id:old?old.id:uid(),dayType:type.value,title:label(type.value),date:day,space:'',slots:[],roles:[],need:tech.length,tech,equipment:'',van:false,status:'Confermato',notes:String(data.get('notes')||'')};
      if(old)db.shifts=db.shifts.map(x=>x.id===entry.id?entry:x);else db.shifts.push(entry);
      save();close();render();
    };
  };
  const originalView=viewShift;
  viewShift=function(sid){
    const entry=db.shifts.find(x=>x.id===sid);
    if(!isAbsence(entry))return originalView(sid);
    modal(label(entry.dayType),'<div class="note"><p><b>Data:</b> '+esc(entry.date)+'</p><p><b>Tecnici:</b></p><ul>'+entry.tech.map(id=>'<li>'+esc(tname(id))+'</li>').join('')+'</ul>'+(entry.notes?'<p><b>Note:</b></p><pre class="eq">'+esc(entry.notes)+'</pre>':'')+'</div><div class="actions"><button type="button" class="close">Chiudi</button>'+(unlocked?'<button type="button" id="editAbsence" class="primary">Modifica</button>':'')+'</div>');
    const button=document.getElementById('editAbsence');if(button)button.onclick=()=>{close();shiftForm(sid);};
  };
  function decorate(){
    document.querySelectorAll('[data-view-shift],[data-open-shift]').forEach(card=>{
      const entry=db.shifts.find(x=>x.id===(card.dataset.viewShift||card.dataset.openShift));
      if(!isAbsence(entry))return;
      const background=entry.dayType==='ferie'?'#e5f3ee':'#edf0f5';
      if(card.dataset.absenceType===entry.dayType)return;
      card.dataset.absenceType=entry.dayType;card.classList.remove('open','wait');card.style.background=background;card.style.color='#233b42';card.style.borderLeftColor=entry.dayType==='ferie'?'#347458':'#66758b';card.textContent=label(entry.dayType);
    });
  }
  const style=document.createElement('style');style.textContent='#shiftForm [hidden]{display:none!important}';document.head.append(style);
  const content=document.getElementById('content');if(content)new MutationObserver(decorate).observe(content,{childList:true,subtree:true});
  decorate();
})();
