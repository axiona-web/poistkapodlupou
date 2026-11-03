const AUDIT_TYPES = {
 majetok:{title:'Dom a domácnosť',questions:[['Máte rozlíšené poistenie stavby a domácnosti?','Skontrolujte, či zmluva zahŕňa nehnuteľnosť aj vybavenie, ktoré chcete chrániť.'],['Zodpovedajú sumy aktuálnemu stavu majetku?','Preverte ocenenie, rekonštrukcie a nové vybavenie.'],['Poznáte limity, výluky a spoluúčasť pri dôležitých rizikách?','Porovnajte riziká, ktoré potrebujete kryť, s podmienkami zmluvy.']]},
 pzp:{title:'PZP',questions:[['Sú údaje o vozidle a jeho používaní aktuálne?','Porovnajte údaje o vozidle a spôsobe používania so zmluvou.'],['Poznáte dohodnuté limity zodpovednosti?','Vyhľadajte limity a rozsah zodpovednostného krytia v zmluve.'],['Viete, ktoré asistencie a pripoistenia máte?','Overte asistenciu, územnú platnosť a pripoistenia.'],['Máte osobitne vyriešené škody na vlastnom aute?','Overte ochranu vlastného vozidla v KASKO alebo konkrétnych pripoisteniach; samotné PZP ju nepotvrdzuje.']]},
 kasko:{title:'KASKO',questions:[['Zahŕňa zmluva riziká, ktoré chcete kryť?','Skontrolujte dohodnuté krytie havárie, krádeže, živlov a poškodenia podľa svojich potrieb.'],['Poznáte spoluúčasť pre jednotlivé riziká?','Porovnajte spoluúčasť a limity pre každé dohodnuté riziko.'],['Viete, ako sa určuje hodnota auta pri škode?','Preverte spôsob ocenenia a podmienky plnenia pri totálnej škode.'],['Vyhovujú vám podmienky opravy a asistencie?','Prečítajte si pravidlá opravy, zabezpečenia vozidla a územnej platnosti.']]},
 cestovne:{title:'Cestovné poistenie',questions:[['Zodpovedá územie a dĺžka krytia vašej ceste?','Overte destináciu, termíny a maximálnu dĺžku jednej cesty.'],['Sú plánované aktivity zahrnuté v krytí?','Overte športy, pracovné aktivity a ich prípadné výluky.'],['Poznáte limity liečebných nákladov a asistenciu?','Preverte limity, spoluúčasť a postup kontaktovania asistencie.'],['Overili ste obmedzenia pre svoj zdravotný stav?','Prečítajte si podmienky pre existujúce ochorenia; zdravotné údaje sem nezadávajte.']]},
 zivotne:{title:'Životné poistenie',questions:[['Zodpovedajú dohodnuté riziká vašim potrebám?','Porovnajte krytie smrti, invalidity, ochorení či výpadku príjmu s vlastnou situáciou.'],['Zohľadňujú poistné sumy záväzky a potreby blízkych?','Pri odbornej kontrole preverte záväzky, rezervy a závislosť rodiny od príjmu.'],['Poznáte definície udalostí, výluky a čakacie doby?','Preverte podmienky vzniku nároku pre každé riziko.'],['Viete oddeliť cenu krytia od prípadného sporenia a poplatkov?','Vyžiadajte si rozpis poistného a poplatkov, ak ho dokumenty neobsahujú.']]},
 zodpovednost:{title:'Zodpovednosť zamestnanca',questions:[['Zodpovedá zmluva vašej práci a pracovným činnostiam?','Overte uvedené povolanie a poistené činnosti.'],['Poznáte limit a spoluúčasť?','Porovnajte limit a spoluúčasť s možnými škodami pri svojej práci.'],['Overili ste špecifické riziká svojej práce?','Preverte napríklad vedenie vozidiel alebo obsluhu strojov, ak sa vás týkajú.'],['Poznáte výluky a územnú platnosť?','Skontrolujte výluky, územie a podmienky uplatnenia škody.']]}
};
// Same order, titles and art as the homepage tiles.
const AUDIT_ORDER=[['pzp','PZP','Limity, asistencia, pripoistenia','pzp-car'],['kasko','KASKO','Riziká, spoluúčasť, hodnota auta','kasko-car'],['majetok','Dom a domácnosť','Stavba, vybavenie, poistné sumy','home'],['cestovne','Cestovné','Územie, aktivity, liečebné náklady','travel'],['zodpovednost','Zodpovednosť','Pracovné činnosti, limit, výluky','work'],['zivotne','Životné poistenie','Riziká, poistné sumy, poplatky','life']];
const AUDIT_INSURERS=['Allianz','Generali','Komunálna poisťovňa','Kooperativa','ČSOB Poisťovňa','UNIQA','Wüstenrot','Iná'];
const AUDIT_ART={majetok:'home',pzp:'pzp-car',kasko:'kasko-car',cestovne:'travel',zivotne:'life',zodpovednost:'work'};
function auditPage(pilot=false){return `<div class="page-shell wrap audit-entry"><a class="back" href="/">← Späť na úvod</a><div class="page-intro"><span class="eyebrow">Audit poistky</span><h1>Viete, čo máte<br><em>v zmluve?</em></h1><p>${pilot?'Súkromný test čítania zmluvy. Vyberte typ poistenia.':'Vyberte typ poistenia. Zmluvu môžete nahrať, odfotiť alebo pokračovať krátkym dotazníkom.'}</p></div><div id="audit-flow"></div></div>`;}
function bindAudit(pilot=false){
 const root=document.querySelector('#audit-flow');if(!root)return;
 let documentData=null;
 let insurer='',type=null,step=0,answers=[],sums={sum:'',value:''};
 function focus(){const h=root.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
 function choose(){documentData=null;root.innerHTML=`<div class="quick-grid audit-grid">${AUDIT_ORDER.map(([id,title,desc,art],i)=>`<button type="button" class="product-tile tile-${i}" data-type="${id}"><span class="tile-art"><img src="assets/${art}.svg" alt="" width="300" height="200"></span><span class="tile-copy"><span class="tile-title">${title}</span><span class="tile-desc">${desc}</span><span>Skontrolovať <b aria-hidden="true">→</b></span></span></button>`).join('')}</div>`;root.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type;step=0;answers=[];sums={sum:'',value:''};upload();focus();});}
 function upload(){
  root.innerHTML=`<div class="audit-step"><button class="audit-back">← Typ zmluvy</button><h3>${AUDIT_TYPES[type].title} · Nahrajte zmluvu</h3><form class="contact-form"><label>Poisťovňa<select name="insurer" required><option value="">Vyberte poisťovňu</option>${AUDIT_INSURERS.map(i=>`<option>${i}</option>`).join('')}</select></label><p>Vyberte anonymizovanú zmluvu bez mien, podpisov, identifikátorov a zdravotných údajov. Odfoťte celú stranu pri dobrom svetle.</p><div class="document-actions"><label>Vybrať PDF alebo obrázok<input type="file" name="file" accept="application/pdf,image/*"></label><label>Odfotiť stranu<input type="file" name="camera" accept="image/*" capture="environment"></label></div><p class="note">PDF do 750 KiB. Fotku do 25 MB zmenšíme priamo v telefóne. Podľa zariadenia sa otvorí fotoaparát alebo výber obrázka.</p>${pilot?'<label>Testovací token<input type="password" name="token" autocomplete="off" minlength="32" required></label>':''}<label class="audit-consent"><input name="consent" type="checkbox" required> Súhlasím s odoslaním vybraného dokumentu cez Cloudflare do Anthropic na prečítanie.</label><a class="text-link" href="/sukromie">Ochrana osobných údajov</a><button class="btn" type="submit">Prečítať zmluvu</button><p role="status"></p></form><button class="audit-back" id="manual">Pokračovať bez dokumentu →</button></div>`;
  root.querySelector('.audit-back').onclick=choose;
  root.querySelector('#manual').onclick=()=>{draw();focus();};
  const form=root.querySelector('form'),status=form.querySelector('[role=status]');
  for(const [current,other] of [['file','camera'],['camera','file']]){
   form.elements[current].onchange=()=>{if(form.elements[current].files.length){form.elements[other].value='';status.textContent='Dokument je vybraný.';}};
  }
  form.onsubmit=async event=>{
   event.preventDefault();
   const token=pilot?readPilotToken(form.elements.token):null;
   if(pilot&&!token)return;
   if(!form.reportValidity())return;
   const selected=form.elements.file.files[0]||form.elements.camera.files[0];
   if(!selected){status.textContent='Vyberte PDF alebo odfoťte stranu zmluvy.';return;}
   insurer=form.elements.insurer.value;
   const submit=form.querySelector('button');submit.disabled=true;status.textContent='Čítame dokument…';
   try{
    const file=await prepareAuditFile(selected);
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
    if(pilot)form.elements.token.value='';
    const response=await fetch('https://poistkapodlupou.mdominik01.workers.dev/'+(pilot?'extract':'public/extract'),{method:'POST',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(70000),headers:{...(pilot?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},body:JSON.stringify({type,insurer:form.elements.insurer.value,mime:file.type,data,consent:form.elements.consent.checked})});
    if(!response.ok){const detail=await response.json().catch(()=>({}));throw Error(({quota_reached:'Limit pre čítanie dokumentov je vyčerpaný. Môžete pokračovať bez dokumentu.',document_too_long:'Dokument je príliš dlhý. Vyberte iba potrebné strany.',size_check_unavailable:'Nepodarilo sa skontrolovať rozsah dokumentu. Môžete pokračovať bez dokumentu.',public_unavailable:'Čítanie je dočasne nedostupné. Môžete pokračovať bez dokumentu.',output_truncated:'Odpoveď dosiahla limit dĺžky. Skúste kratší dokument.',model_refusal:'Model čítanie tohto dokumentu odmietol.',invalid_extraction:'Prečítané údaje neprešli kontrolou hodnôt, strán alebo podkladových úryvkov.',invalid_provider_response:'Anthropic vrátil nečitateľnú odpoveď.',provider_timeout:'Anthropic nestihol odpovedať do 60 sekúnd.',provider_connection:'Cloudflare nedokončil spojenie s Anthropic.'})[detail.error] || (response.status===401?'Skontrolujte testovací token.':'Dokument sa nepodarilo prečítať. Skúste čitateľný PDF, JPG alebo PNG.'));}
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
 root.querySelector('.audit-back').onclick=()=>{save();if(step){step--;draw();focus();}else if(documentData)review();else upload();};
 root.querySelector('form').onsubmit=e=>{e.preventDefault();save();if(step<total-1){step++;draw();}else result();focus();};
 }
 function result(){const t=AUDIT_TYPES[type];root.innerHTML=`<div class="audit-step audit-summary"><span class="eyebrow">${t.title}</span><h3>Máte jasnejší východiskový bod.</h3><div class="audit-findings"></div><p class="note">${documentData?'Prehľad obsahuje údaje, ktoré ste potvrdili po prečítaní dokumentu, a body na kontrolu podľa vašich odpovedí.':'Prehľad vychádza z vašich odpovedí bez čítania dokumentu.'}</p><section class="audit-send" aria-labelledby="audit-send-title"><h4 id="audit-send-title">Chcete, aby sa na to pozrela Alexandra?</h4><p>Pošleme jej tento prehľad. Ozve sa vám a prejde s vami, čo v zmluve chýba alebo čo by stálo za zmenu.</p><form id="audit-send-form" class="contact-form" novalidate><div class="form-row"><label>Meno<input name="name" required minlength="2" maxlength="100" autocomplete="name"></label><label>E-mail<input name="email" type="email" required maxlength="254" autocomplete="email"></label></div><label>Telefón <span class="optional">(nepovinné)</span><input name="phone" type="tel" maxlength="30" autocomplete="tel" placeholder="+421"></label><label>Poznámka <span class="optional">(nepovinné)</span><textarea name="note" rows="3" maxlength="1500" placeholder="Napríklad čo vás na zmluve trápi."></textarea></label><label class="hp" aria-hidden="true">Webstránka<input name="website" tabindex="-1" autocomplete="off"></label><label class="check-label"><input type="checkbox" name="consent" required><span>Súhlasím, aby Mgr. Alexandra Čurillová, s.\u00a0r.\u00a0o. použila tento prehľad a kontakt na odpoveď. <a href="/sukromie">Ochrana osobných údajov</a></span></label><button class="btn" type="submit">Poslať prehľad na kontrolu <span>→</span></button><div class="audit-send-result" role="status" aria-live="polite"></div></form></section><div class="audit-step-bottom"><button class="audit-back" id="audit-edit">← Upraviť odpovede</button><button class="audit-back" id="audit-restart">Preveriť inú zmluvu</button></div></div>`;
 const list=root.querySelector('.audit-findings');
 const add=(title,body)=>{const box=document.createElement('div'),h=document.createElement('h4'),p=document.createElement('p');h.textContent=title;p.textContent=body;box.append(h,p);list.append(box);};
 if(documentData){for(const field of documentData.fields)add(field.label,field.value+' · str. '+field.page);for(const item of documentData.missing)add('V dokumente nejasné',item);}
 const todo=t.questions.filter((q,i)=>answers[i]!=='yes');
 if(todo.length)todo.forEach((q,i)=>add('Na preverenie · '+(i+1),q[1]));else add('Základné oblasti máte podľa odpovedí overené','Pri ďalšej kontrole si overte aj aktuálne znenie podmienok a zmeny svojej situácie.');
 if(type==='majetok'){const s=Number(sums.sum),v=Number(sums.value);add('Poistná suma',s>0&&v>0?(s<v?`Zadaná suma predstavuje ${(s/v*100).toLocaleString('sk-SK',{maximumFractionDigits:1})} % zadanej hodnoty. Preverte možné podpoistenie. Nejde o výpočet poistného plnenia.`:'Zadaná suma nie je nižšia než hodnota. Správnosť ocenenia a rozsah krytia treba overiť v zmluve.'):'Bez porovnateľnej sumy a hodnoty sa možné podpoistenie nedá posúdiť.');}
 root.querySelector('#audit-edit').onclick=()=>{draw();focus();};root.querySelector('#audit-restart').onclick=choose;
 const sendForm=root.querySelector('#audit-send-form'),sendResult=sendForm.querySelector('.audit-send-result');
 sendForm.onsubmit=async e=>{e.preventDefault();if(!sendForm.reportValidity())return;const d=new FormData(sendForm),button=sendForm.querySelector('button[type=submit]');
  const lines=[`Typ zmluvy: ${t.title}`,`Poisťovňa: ${insurer||'neuvedená'}`,`Zdroj: ${documentData?'prečítaný dokument, údaje potvrdené klientom':'iba odpovede v dotazníku'}`,''];
  list.querySelectorAll('div').forEach(box=>lines.push('• '+box.querySelector('h4').textContent+': '+box.querySelector('p').textContent));
  lines.push('','Odpovede v dotazníku:');t.questions.forEach((q,i)=>lines.push(`- ${q[0]} → ${({yes:'Áno',no:'Nie',unknown:'Neviem'})[answers[i]]||'bez odpovede'}`));
  const note=String(d.get('note')||'').trim();
  button.disabled=true;sendResult.className='audit-send-result';sendResult.textContent='Odosielam…';
  try{const r=await fetch(REVIEWS_API+'/contact',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:d.get('name'),email:d.get('email'),phone:d.get('phone'),topic:'Moja poistka',message:note.length>=10?note:'Prosím o kontrolu výsledku auditu poistky.',website:d.get('website'),audit:lines.join('\n').slice(0,6000)})});
   if(r.ok){sendForm.reset();sendResult.className='audit-send-result ok';sendResult.textContent='Odoslané. Alexandra sa vám ozve spravidla do jedného pracovného dňa.';}
   else if(r.status===400){const j=await r.json().catch(()=>({}));sendResult.className='audit-send-result err';sendResult.textContent={email:'Skontrolujte prosím e-mail.',phone:'Skontrolujte prosím telefónne číslo.',name:'Skontrolujte prosím meno.'}[j.field]||'Skontrolujte prosím vyplnené údaje.';}
   else{sendResult.className='audit-send-result err';sendResult.innerHTML='Odoslanie sa nepodarilo. Napíšte nám prosím na <a href="mailto:ahoj@poistkapodlupou.sk">ahoj@poistkapodlupou.sk</a>.';}
  }catch{sendResult.className='audit-send-result err';sendResult.innerHTML='Spojenie zlyhalo. Napíšte nám prosím na <a href="mailto:ahoj@poistkapodlupou.sk">ahoj@poistkapodlupou.sk</a>.';}
  finally{button.disabled=false;}};
 }
 choose();
}
