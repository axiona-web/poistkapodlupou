async function prepareAuditFile(file) {
  if (!file || !file.size) throw Error('Vyberte dokument alebo odfoťte jednu stranu zmluvy.');
  const limit = 750 * 1024;
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    if (file.size > limit) throw Error('PDF je príliš veľké. Vyberte výrez do 750 KiB alebo odfoťte jednu stranu.');
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
