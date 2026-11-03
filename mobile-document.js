async function prepareAuditFile(file) {
  if (!file || !file.size) throw Error('Vyberte dokument alebo odfoťte jednu stranu zmluvy.');
  const limit = 750 * 1024;
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    if (file.size > 10 * 1024 * 1024) throw Error('Vybrané strany majú spolu viac ako 10 MB. Zmenšite rozsah strán.');
    return file.slice(0, file.size, 'application/pdf');
  }
  if (file.size > 25 * 1024 * 1024) throw Error('Fotografia môže mať najviac 25 MB.');
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    image.src = url;
    try { await image.decode(); }
    catch { throw Error('Tento formát telefón nedokázal otvoriť. Vyberte JPG alebo PNG, prípadne urobte snímku obrazovky.'); }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.75, 0.6, 0.45]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob?.size && blob.size <= limit) return blob;
    }
    throw Error('Fotografiu sa nepodarilo zmenšiť. Orežte ju na čitateľnú časť dokumentu.');
  } finally { URL.revokeObjectURL(url); }
}

// Long PDFs (contract bundled with conditions): find the contract pages in the browser
// and send only those, so the AI reads the right part and the cost stays low.
const PDF_LIBS = {
  pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  pdflib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
};
const MAX_SEND_PAGES = 30;
const scriptCache = {};
function loadScript(src) {
  return scriptCache[src] || (scriptCache[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = resolve; s.onerror = () => { delete scriptCache[src]; reject(Error('Nástroj na prácu s PDF sa nepodarilo načítať.')); };
    document.head.append(s);
  }));
}
const CONTRACT_HINTS = [
  [/poistn[áa] zmluv[ay]|návrh(u)? poistnej zmluvy|zmluva o poisten/i, 4], [/čísl[oa] (poistnej )?zmluvy|číslo návrhu/i, 4],
  [/poistník/i, 3], [/poisten[ýy]\b/i, 1], [/začiatok poistenia|poistenie vzniká|technický začiatok/i, 4], [/koniec poistenia|na dobu (ne)?určitú/i, 2],
  [/ročné poistné|výška poistného|poistné (za|spolu|celkom)|lehotné poistné|splátk/i, 4], [/rozsah poistenia|poistné riziká|pripoisten/i, 2],
  [/poistná suma|limit poistného plnenia/i, 2], [/spoluúčas/i, 1], [/evidenčné číslo|EČV|VIN|výrobné číslo|druh vozidla/i, 3],
  [/miesto poistenia|adresa poistenej nehnuteľnosti|podlahová plocha/i, 3], [/dátum uzavretia|v .{2,30} dňa|podpis poistníka/i, 3],
  [/súhlasím|vyhlasujem|vyhlásenie poistníka/i, 1], [/IBAN|variabilný symbol|spôsob platenia|frekvencia platenia/i, 2]
];
const CONDITIONS_HINTS = [/všeobecné poistné podmienky|osobitné poistné podmienky|zmluvné dojednania/i, /\b(článok|čl\.)\s*[0-9IVXL]+/gi, /\bvýluky z poistenia\b/i];
function scorePage(text) {
  let score = 0;
  for (const [re, w] of CONTRACT_HINTS) if (re.test(text)) score += w;
  if (CONDITIONS_HINTS[0].test(text)) score -= 3;
  const articles = (text.match(CONDITIONS_HINTS[1]) || []).length; if (articles >= 3) score -= Math.min(6, articles);
  if (text.replace(/\s/g, '').length < 40) score -= 1;
  return score;
}
async function analyzePdf(file) {
  await loadScript(PDF_LIBS.pdfjs);
  const pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = PDF_LIBS.worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = doc.numPages, scores = []; let textChars = 0;
  for (let i = 1; i <= pages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    const text = content.items.map(it => it.str).join(' ');
    textChars += text.replace(/\s/g, '').length; scores.push(scorePage(text));
  }
  const hasText = textChars > pages * 30;
  if (pages <= MAX_SEND_PAGES) return { pages, hasText, from: 1, to: pages, needsChoice: false };
  if (!hasText) return { pages, hasText, from: 1, to: Math.min(pages, 10), needsChoice: true };
  // Best window: start at the strongest page, grow while neighbours still look like the contract.
  let best = 0; scores.forEach((s, i) => { if (s > scores[best]) best = i; });
  let from = best, to = best;
  const good = i => i >= 0 && i < pages && scores[i] >= 3;
  while (to - from + 1 < MAX_SEND_PAGES && (good(from - 1) || good(to + 1))) { if (good(from - 1)) from--; else to++; }
  if (to - from + 1 < 3) { from = Math.max(0, best - 1); to = Math.min(pages - 1, best + 2); }
  return { pages, hasText, from: from + 1, to: to + 1, needsChoice: true, confident: scores[best] >= 8 };
}
async function slicePdf(file, from, to) {
  await loadScript(PDF_LIBS.pdflib);
  const { PDFDocument } = window.PDFLib;
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const idx = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
  (await out.copyPages(src, idx)).forEach(p => out.addPage(p));
  return new Blob([await out.save()], { type: 'application/pdf' });
}
