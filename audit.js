const AUDIT_TYPES = {
 majetok:{title:'Poistenie majetku',questions:[['Máte rozlíšené poistenie stavby a domácnosti?','Skontrolujte, či zmluva zahŕňa nehnuteľnosť aj vybavenie, ktoré chcete chrániť.'],['Zodpovedajú sumy aktuálnemu stavu majetku?','Preverte ocenenie, rekonštrukcie a nové vybavenie.'],['Poznáte limity, výluky a spoluúčasť pri dôležitých rizikách?','Porovnajte riziká, ktoré potrebujete kryť, s podmienkami zmluvy.']]},
 pzp:{title:'PZP',questions:[['Sú údaje o vozidle a jeho používaní aktuálne?','Porovnajte údaje o vozidle a spôsobe používania so zmluvou.'],['Poznáte dohodnuté limity zodpovednosti?','Vyhľadajte limity a rozsah zodpovednostného krytia v zmluve.'],['Viete, ktoré asistencie a pripoistenia máte?','Overte asistenciu, územnú platnosť a pripoistenia.'],['Máte osobitne vyriešené škody na vlastnom aute?','Overte ochranu vlastného vozidla v KASKO alebo konkrétnych pripoisteniach; samotné PZP ju nepotvrdzuje.']]},
 kasko:{title:'KASKO',questions:[['Zahŕňa zmluva riziká, ktoré chcete kryť?','Skontrolujte dohodnuté krytie havárie, krádeže, živlov a poškodenia podľa svojich potrieb.'],['Poznáte spoluúčasť pre jednotlivé riziká?','Porovnajte spoluúčasť a limity pre každé dohodnuté riziko.'],['Viete, ako sa určuje hodnota auta pri škode?','Preverte spôsob ocenenia a podmienky plnenia pri totálnej škode.'],['Vyhovujú vám podmienky opravy a asistencie?','Prečítajte si pravidlá opravy, zabezpečenia vozidla a územnej platnosti.']]},
 cestovne:{title:'Cestovné poistenie',questions:[['Zodpovedá územie a dĺžka krytia vašej ceste?','Overte destináciu, termíny a maximálnu dĺžku jednej cesty.'],['Sú plánované aktivity zahrnuté v krytí?','Overte športy, pracovné aktivity a ich prípadné výluky.'],['Poznáte limity liečebných nákladov a asistenciu?','Preverte limity, spoluúčasť a postup kontaktovania asistencie.'],['Overili ste obmedzenia pre svoj zdravotný stav?','Prečítajte si podmienky pre existujúce ochorenia; zdravotné údaje sem nezadávajte.']]},
 zivotne:{title:'Životné poistenie',questions:[['Zodpovedajú dohodnuté riziká vašim potrebám?','Porovnajte krytie smrti, invalidity, ochorení či výpadku príjmu s vlastnou situáciou.'],['Zohľadňujú poistné sumy záväzky a potreby blízkych?','Pri odbornej kontrole preverte záväzky, rezervy a závislosť rodiny od príjmu.'],['Poznáte definície udalostí, výluky a čakacie doby?','Preverte podmienky vzniku nároku pre každé riziko.'],['Viete oddeliť cenu krytia od prípadného sporenia a poplatkov?','Vyžiadajte si rozpis poistného a poplatkov, ak ho dokumenty neobsahujú.']]},
 zodpovednost:{title:'Zodpovednosť zamestnanca',questions:[['Zodpovedá zmluva vašej práci a pracovným činnostiam?','Overte uvedené povolanie a poistené činnosti.'],['Poznáte limit a spoluúčasť?','Porovnajte limit a spoluúčasť s možnými škodami pri svojej práci.'],['Overili ste špecifické riziká svojej práce?','Preverte napríklad vedenie vozidiel alebo obsluhu strojov, ak sa vás týkajú.'],['Poznáte výluky a územnú platnosť?','Skontrolujte výluky, územie a podmienky uplatnenia škody.']]}
};
const AUDIT_ART={majetok:'home',pzp:'pzp-car',kasko:'kasko-car',cestovne:'travel',zivotne:'logo',zodpovednost:'work'};
function auditPage(pilot=false){return `<section class="audit-entry wrap" aria-label="Audit poistky"><div class="audit-heading"><div><h1>Audit poistky</h1><p>${pilot?'Súkromný test čítania zmluvy. Vyberte typ poistenia.':'Vyberte typ poistenia a odpovedzte na krátke otázky podľa svojej zmluvy.'}</p></div></div><div id="audit-flow"></div></section>`;}
function bindAudit(pilot=false){
 const root=document.querySelector('#audit-flow');if(!root)return;
 let documentData=null;
 let type=null,step=0,answers=[],sums={sum:'',value:''};
 function focus(){const h=root.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
 function choose(){documentData=null;root.innerHTML=`<div class="audit-choices">${Object.entries(AUDIT_TYPES).map(([id,t])=>`<button class="audit-choice" data-type="${id}"><img src="assets/${AUDIT_ART[id]}.svg" alt="" width="130" height="85"><span>${t.title}</span><b aria-hidden="true">↗</b></button>`).join('')}</div>`;root.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type;step=0;answers=[];sums={sum:'',value:''};if(pilot)upload();else draw();focus();});}
 function upload(){
  root.innerHTML=`<div class="audit-step"><button class="audit-back">← Typ zmluvy</button><h3>${AUDIT_TYPES[type].title} · Nahrajte zmluvu</h3><form class="contact-form"><p>Súkromný test. Použite vzor bez osobných údajov. Dokument odošleme cez Cloudflare do Anthropic až po kliknutí na tlačidlo.</p><label>PDF alebo fotografia (JPG, PNG), najviac 750 KiB<input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required></label><label>Testovací token<input type="password" name="token" autocomplete="off" minlength="32" required></label><button class="btn" type="submit">Prečítať zmluvu</button><p role="status"></p></form><button class="audit-back" id="manual">Pokračovať bez dokumentu →</button></div>`;
  root.querySelector('.audit-back').onclick=choose;
  root.querySelector('#manual').onclick=()=>{draw();focus();};
  const form=root.querySelector('form'),status=form.querySelector('[role=status]');
  form.onsubmit=async event=>{
   event.preventDefault();
   const token=readPilotToken(form.elements.token);
   if(!token)return;
   const file=form.elements.file.files[0];
   if(!file||file.size>750*1024||!file.size){status.textContent='Vyberte súbor do 750 KiB.';return;}
   const submit=form.querySelector('button');submit.disabled=true;status.textContent='Čítame dokument…';
   try{
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
    form.elements.token.value='';
    const response=await fetch('https://poistkapodlupou.mdominik01.workers.dev/extract',{method:'POST',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(70000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({type,mime:file.type,data})});
    if(!response.ok){const detail=await response.json().catch(()=>({}));throw Error(({output_truncated:'Odpoveď dosiahla limit dĺžky. Skúste kratší dokument.',model_refusal:'Model čítanie tohto dokumentu odmietol.',invalid_extraction:'Prečítané údaje neprešli kontrolou hodnôt, strán alebo podkladových úryvkov.',invalid_provider_response:'Anthropic vrátil nečitateľnú odpoveď.',provider_timeout:'Anthropic nestihol odpovedať do 60 sekúnd.',provider_connection:'Cloudflare nedokončil spojenie s Anthropic.'})[detail.error] || (response.status===401?'Skontrolujte testovací token.':'Dokument sa nepodarilo prečítať. Skúste čitateľný PDF, JPG alebo PNG.'));}
    const extracted=await response.json();
    if(!Array.isArray(extracted.fields)||!Array.isArray(extracted.missing))throw Error('Neúplná odpoveď služby.');
    if(!form.isConnected)return;
    documentData=extracted;review();focus();
   }catch(error){status.textContent=error.message||'Čítanie sa nepodarilo.';}finally{submit.disabled=false;}
  };
 }
 function review(){
  root.innerHTML='<div class="audit-step"><h3>Skontrolujte prečítané údaje</h3><p>Porovnajte hodnoty s dokumentom a podľa potreby ich opravte.</p><form class="contact-form"><div class="fields"></div><button class="btn">Potvrdiť a doplniť odpovede →</button></form><button class="audit-back">Vybrať iný dokument</button></div>';
  const fields=root.querySelector('.fields');
  for(const field of documentData.fields){
   const label=document.createElement('label'),input=document.createElement('input'),source=document.createElement('small');
   label.textContent=field.label;input.value=field.value;input.required=true;source.textContent='Strana '+field.page+' · '+field.evidence;
   label.append(input,source);fields.append(label);
  }
  for(const item of documentData.missing){const p=document.createElement('p');p.textContent='Nejasné: '+item;fields.append(p);}
  if(!documentData.fields.length)fields.prepend('Žiadne údaje sa nepodarilo spoľahlivo prečítať.');
  root.querySelector('.audit-back').onclick=()=>{documentData=null;upload();};
  root.querySelector('form').onsubmit=e=>{e.preventDefault();fields.querySelectorAll('input').forEach((input,i)=>documentData.fields[i].value=input.value);draw();focus();};
 }
 function draw(){const t=AUDIT_TYPES[type],total=t.questions.length+(type==='majetok'?1:0);const numeric=step===t.questions.length;
 root.innerHTML=`<div class="audit-step"><div class="audit-step-top"><button class="audit-back" type="button">← ${step?'Späť':'Typ zmluvy'}</button><span>${t.title} · ${step+1} / ${total}</span></div><progress value="${step+1}" max="${total}" aria-label="Postup kontroly"></progress><form id="audit-question"><h3>${numeric?'Sedia ešte poistné sumy?':t.questions[step][0]}</h3>${numeric?`<p class="note">Nepovinné. Porovnajte rovnaký majetok a spôsob ocenenia zo zmluvy. Trhová cena nemusí byť poistnou hodnotou.</p><div class="audit-numbers"><label>Poistná suma (€)<input name="sum" type="number" min="1" max="100000000" step="0.01"></label><label>Aktuálna poistná hodnota (€)<input name="value" type="number" min="1" max="100000000" step="0.01"></label></div>`:`<div class="audit-answers">${[['yes','Áno','Mám to overené'],['no','Nie','Chcem to preveriť'],['unknown','Neviem','Potrebujem sa pozrieť']].map(([v,label,desc])=>`<label><input type="radio" name="answer" value="${v}" required ${answers[step]===v?'checked':''}><span><b>${label}</b><small>${desc}</small></span></label>`).join('')}</div>`}<div class="audit-step-bottom"><span>${numeric?'Ak čísla nepoznáte, pokračujte bez nich.':'Vyberte jednu odpoveď.'}</span><button type="submit" class="btn">${step===total-1?'Zobraziť prehľad':'Pokračovať'} →</button></div></form></div>`;
 if(numeric)for(const key of ['sum','value'])root.querySelector(`[name=${key}]`).value=sums[key];
 const save=()=>{if(numeric)for(const key of ['sum','value'])sums[key]=root.querySelector(`[name=${key}]`).value;else answers[step]=root.querySelector('[name=answer]:checked')?.value;};
 root.querySelector('.audit-back').onclick=()=>{save();if(step){step--;draw();focus();}else if(documentData)review();else if(pilot)upload();else choose();};
 root.querySelector('form').onsubmit=e=>{e.preventDefault();save();if(step<total-1){step++;draw();}else result();focus();};
 }
 function result(){const t=AUDIT_TYPES[type];root.innerHTML=`<div class="audit-step audit-summary"><span class="eyebrow">${t.title}</span><h3>Máte jasnejší východiskový bod.</h3><div class="audit-findings"></div><p class="note">${documentData?'Prehľad obsahuje údaje, ktoré ste potvrdili po prečítaní dokumentu, a body na kontrolu podľa vašich odpovedí.':'Prehľad vychádza z vašich odpovedí bez čítania dokumentu.'}</p><div class="audit-step-bottom"><button class="audit-back" id="audit-edit">← Upraviť odpovede</button><a class="btn" href="#/kontakt">Podrobná kontrola →</a></div><p class="note">Kontakt je zatiaľ náhľad bez odosielania.</p><button class="audit-back" id="audit-restart">Preveriť inú zmluvu</button></div>`;
 const list=root.querySelector('.audit-findings');
 const add=(title,body)=>{const box=document.createElement('div'),h=document.createElement('h4'),p=document.createElement('p');h.textContent=title;p.textContent=body;box.append(h,p);list.append(box);};
 if(documentData){for(const field of documentData.fields)add(field.label,field.value+' · str. '+field.page);for(const item of documentData.missing)add('V dokumente nejasné',item);}
 const todo=t.questions.filter((q,i)=>answers[i]!=='yes');
 if(todo.length)todo.forEach((q,i)=>add('Na preverenie · '+(i+1),q[1]));else add('Základné oblasti máte podľa odpovedí overené','Pri ďalšej kontrole si overte aj aktuálne znenie podmienok a zmeny svojej situácie.');
 if(type==='majetok'){const s=Number(sums.sum),v=Number(sums.value);add('Poistná suma',s>0&&v>0?(s<v?`Zadaná suma predstavuje ${(s/v*100).toLocaleString('sk-SK',{maximumFractionDigits:1})} % zadanej hodnoty. Preverte možné podpoistenie. Nejde o výpočet poistného plnenia.`:'Zadaná suma nie je nižšia než hodnota. Správnosť ocenenia a rozsah krytia treba overiť v zmluve.'):'Bez porovnateľnej sumy a hodnoty sa možné podpoistenie nedá posúdiť.');}
 root.querySelector('#audit-edit').onclick=()=>{draw();focus();};root.querySelector('#audit-restart').onclick=choose;
 }
 choose();
}
