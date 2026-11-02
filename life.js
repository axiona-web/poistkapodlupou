function lifePage() {
  const options = (name, legend, labels, multiple = false) => `
    <fieldset><legend>${legend}</legend><div class="life-options">
      ${labels.map(label => `<label><input type="${multiple ? 'checkbox' : 'radio'}" name="${name}" value="${label}" ${multiple ? '' : 'required'}><span>${label}</span></label>`).join('')}
    </div></fieldset>`;
  const number = (name, label, min, max, step) => `<label>${label}<input type="number" name="${name}" inputmode="${step === 1 ? 'numeric' : 'decimal'}" min="${min}" max="${max}" step="${step}" required></label>`;
  return `<article class="article life-page"><a class="back" href="#/">← Späť na úvod</a><h1>Životné poistenie</h1><p>Pripravte si podklady na rozhovor o poistení. Odpovede ostávajú v tejto otvorenej stránke.</p>
    <form class="contact-form" id="life-form" autocomplete="off">
      <section><h2>1. O vás</h2><div class="life-numbers">${number('age','Vek (roky)',1,115,1)}${number('height','Výška (cm)',40,250,1)}${number('weight','Hmotnosť (kg)',2,400,0.1)}</div>
      ${options('status','Aké je vaše pracovné postavenie?',['Zamestnanec na TPP','Podnikateľ / SZČO','Študent','Dôchodca','Rodičovská dovolenka','Iné'])}
      ${options('work','Akému druhu práce sa venujete?',['Kancelárska','Služby a obchod','Manuálna','Vodič / doprava','Práca vo výškach alebo s rizikovými strojmi','Iná práca','Momentálne nepracujem'])}</section>
      <section hidden><h2>2. Zdravie</h2><p>Stačí všeobecná odpoveď podľa toho, ako svoju situáciu vnímate. Diagnózy ani lekárske správy nepotrebujeme.</p>
      ${options('health','Ako by ste opísali svoj aktuálny zdravotný stav?',['Bez ťažkostí','Mám mierne alebo občasné ťažkosti','Mám dlhodobé alebo závažnejšie ťažkosti','Radšej preberiem osobne'])}</section>
      <section hidden><h2>3. Krytie a rozpočet</h2>${options('cover','Ktoré riziká chcete prebrať? Môžete vybrať viac možností.',['Úmrtie','Invalidita','Závažné ochorenie','Trvalé následky úrazu','Práceneschopnosť','Hospitalizácia'],true)}
      ${options('budget','Koľko chcete mesačne vyčleniť na poistenie?',['Do 25 €','Nad 25 až 50 €','Nad 50 až 75 €','Nad 75 až 100 €','Viac ako 100 €','Ešte neviem'])}<p class="note">Ide o váš rozpočet. Cenu ponuky určí poisťovňa.</p></section>
      <section hidden><h2>Váš prehľad</h2><dl id="life-summary"></dl><p>Na konzultáciu môžete otvoriť pripravený e-mail. Obsahuje vek, pracovné postavenie, druh práce, vybrané krytie a rozpočet. Výška, hmotnosť a odpoveď o zdraví zostanú na tejto stránke. Odošlete ho vo svojej e-mailovej aplikácii.</p><a class="btn" id="life-email">Pripraviť e-mail na konzultáciu ↗</a></section>
      <div class="audit-step-bottom"><button type="button" class="audit-back" id="life-back" hidden>← Späť</button><span id="life-progress">Krok 1 z 3</span><button type="submit" class="btn" id="life-next">Pokračovať →</button></div>
    </form></article>`;
}

function bindLife() {
  const form = document.querySelector('#life-form');
  if (!form) return;
  const steps = [...form.querySelectorAll('section')];
  let current = 0;
  function display(index, focus = true) {
    current = index;
    steps.forEach((section, i) => {
      section.hidden = i !== index;
      section.querySelectorAll('input').forEach(input => { input.disabled = i !== index; });
    });
    form.querySelector('#life-back').hidden = index === 0;
    form.querySelector('#life-progress').textContent = index < 3 ? 'Krok ' + (index + 1) + ' z 3' : '';
    form.querySelector('#life-next').hidden = index === 3;
    form.querySelector('#life-next').textContent = index === 2 ? 'Zobraziť prehľad →' : 'Pokračovať →';
    if (focus) {
      const heading = steps[index].querySelector('h2');
      heading.tabIndex = -1;
      heading.focus();
    }
  }
  form.onsubmit = event => {
    event.preventDefault();
    if (current >= 3 || !form.reportValidity()) return;
    if (current === 2) {
      const selected = name => [...form.querySelectorAll('input[name="'+ name +'"]:checked')].map(input => input.value).join(', ');
      const cover = selected('cover') || 'Výber pri konzultácii';
      const budget = selected('budget');
      const summary = form.querySelector('#life-summary');
      summary.replaceChildren();
      for (const [label, value] of [['Vek',form.elements.age.value+' r.'],['Výška a hmotnosť',form.elements.height.value+' cm · '+form.elements.weight.value+' kg'],['Postavenie',selected('status')],['Práca',selected('work')],['Zdravie',selected('health')],['Krytie',cover],['Mesačný rozpočet',budget]]) {
        const term = document.createElement('dt'), detail = document.createElement('dd');
        term.textContent = label; detail.textContent = value; summary.append(term,detail);
      }
      const body = 'Dobrý deň, mám záujem o konzultáciu k životnému poisteniu.\nVek: '+form.elements.age.value+'\nPostavenie: '+selected('status')+'\nPráca: '+selected('work')+'\nKrytie: '+cover+'\nMesačný rozpočet: '+budget;
      form.querySelector('#life-email').href = 'mailto:ahoj@poistkapodlupou.sk?subject='+encodeURIComponent('Životné poistenie – konzultácia')+'&body='+encodeURIComponent(body);
    }
    display(current+1);
  };
  form.querySelector('#life-back').onclick = () => display(current-1);
  display(0,false);
}
