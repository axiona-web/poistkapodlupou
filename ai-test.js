// A synthetic one-page PDF, deliberately without customer data.
function samplePDF(){
 const lines=['SYNTHETIC TEST - NOT A REAL INSURANCE CONTRACT','Property insurance - building','Insured sum: 150000 EUR','Annual premium: 240 EUR','Deductible: 150 EUR','Covered risks: fire, windstorm','Insurance terms and exclusions: not supplied'];
 const stream='BT /F1 14 Tf 50 760 Td '+lines.map((l,i)=>(i?'0 -28 Td ':'')+'('+l+') Tj').join('\n')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];
 let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
 const xref=pdf.length;pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';return btoa(pdf);
}
function sampleScan() {
 const canvas = document.createElement('canvas');
 canvas.width = 1000;
 canvas.height = 600;
 const context = canvas.getContext('2d');
 context.fillStyle = 'white';
 context.fillRect(0, 0, canvas.width, canvas.height);
 context.fillStyle = '#182124';
 context.font = '28px sans-serif';
 const lines = [
  'VZOR NA TESTOVANIE', 'Poistenie majetku – rodinný dom',
  'Poistná suma budovy: 185 000 EUR', 'Ročné poistné: 312 EUR',
  'Spoluúčasť: 200 EUR', 'Kryté riziká: požiar a víchrica',
  'Príloha s poistnými podmienkami nebola dodaná.'
 ];
 lines.forEach((line, index) => context.fillText(line, 48, 70 + 62 * index));
 return canvas.toDataURL('image/png').split(',')[1];
}
const form=document.querySelector('#pilot-form'),result=document.querySelector('#pilot-result');
form.onsubmit=async event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const button=form.querySelector('button'),field=form.elements.token;
 let token=readPilotToken(field);
 if(!token)return;
 field.value='';button.disabled=true;result.textContent='Čítam fiktívny dokument. Môže to chvíľu trvať…';
 try{
 const scan = form.elements.sample.value === 'scan';
 const response=await fetch('https://poistkapodlupou.mdominik01.workers.dev/extract',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(70000),headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({type:'majetok',mime:scan?'image/png':'application/pdf',data:scan?sampleScan():samplePDF()})});token='';
 const data=await response.json();if(!response.ok)throw Error(({output_truncated:'Odpoveď dosiahla limit dĺžky. Skúste kratší dokument.',model_refusal:'Model čítanie tohto dokumentu odmietol.',invalid_extraction:'Prečítané údaje neprešli kontrolou hodnôt, strán alebo podkladových úryvkov.',invalid_provider_response:'Anthropic vrátil nečitateľnú odpoveď.',provider_timeout:'Anthropic nestihol odpovedať do 60 sekúnd.',provider_connection:'Cloudflare nedokončil spojenie s Anthropic.',unauthorized:'Testovací token nie je správny.',pilot_not_configured:'Chýba nastavenie služby.',provider_unavailable:'Anthropic požiadavku neprijal. Treba preveriť model, kredit alebo API kľúč.',extraction_failed:'Nepodarilo sa získať úplný a overiteľný výstup. Skontrolujeme odpoveď služby.'})[data.error]||'Služba test nedokončila.');
 if(!Array.isArray(data.fields)||!Array.isArray(data.missing))throw Error('Služba vrátila neočakávaný výsledok.');
 result.replaceChildren();const h=document.createElement('h2');h.textContent='AI odpovedala. Skontrolujte prečítané údaje.';result.append(h);
 for(const f of data.fields){const box=document.createElement('div');box.className='info';const title=document.createElement('strong'),p=document.createElement('p'),source=document.createElement('small');title.textContent=f.label;p.textContent=f.value;source.textContent='Strana '+f.page+' · '+f.evidence;box.append(title,p,source);result.append(box);}
 if(data.missing.length){const h=document.createElement('h3');h.textContent='Čo v dokumente chýba alebo je nejasné';const ul=document.createElement('ul');data.missing.forEach(item=>{const li=document.createElement('li');li.textContent=item;ul.append(li)});result.append(h,ul);}
 const note=document.createElement('p');note.textContent=scan?'Očakávané údaje z obrázka: poistná suma 185 000 EUR, ročné poistné 312 EUR a spoluúčasť 200 EUR.':'Ide o test čítania, nie o potvrdenie krytia. Očakávané hodnoty: suma 150 000 EUR, ročné poistné 240 EUR a spoluúčasť 150 EUR.';result.append(note);
 }catch(error){result.textContent=error.name==='TimeoutError'?'Test prekročil časový limit. Pred opakovaním skontrolujeme službu.':error.message;}finally{token='';button.disabled=false;}
};
