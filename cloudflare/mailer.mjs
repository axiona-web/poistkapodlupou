// Minimal SMTP client over implicit TLS (port 465) for Cloudflare Workers.
// Sends one plain-text message through the site's own Websupport mailbox.
const enc = new TextEncoder();
const b64 = s => btoa(String.fromCharCode(...enc.encode(s)));
const header = s => String(s).replace(/[\r\n]+/g, ' ').trim();
const encodeWord = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;

export function buildMessage({ from, fromName, to, replyTo, subject, text, date = new Date(), id = crypto.randomUUID() }) {
  const domain = from.split('@')[1];
  const body = b64(text.replace(/\r?\n/g, '\r\n')).replace(/.{1,76}/g, '$&\r\n');
  return [
    `From: ${encodeWord(header(fromName))} <${header(from)}>`,
    `To: <${header(to)}>`,
    replyTo ? `Reply-To: <${header(replyTo)}>` : null,
    `Subject: ${encodeWord(header(subject))}`,
    `Date: ${date.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body
  ].filter(l => l !== null).join('\r\n');
}

export async function sendMail(options, connect) {
  const { host, port = 465, user, pass, to } = options;
  const socket = connect({ hostname: host, port }, { secureTransport: 'on', allowHalfOpen: false });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const dec = new TextDecoder();
  let buffer = '';
  let lastText = '';
  async function reply() {
    for (;;) {
      const lines = buffer.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) { lastText = lines.slice(0, i + 1).join('\n'); buffer = lines.slice(i + 1).join('\r\n'); return Number(lines[i].slice(0, 3)); }
      }
      const { value, done } = await reader.read();
      if (done) throw Error('smtp_closed');
      buffer += dec.decode(value, { stream: true });
    }
  }
  const send = async line => writer.write(enc.encode(line + '\r\n'));
  const expect = async (code, step) => { const got = await reply(); if (got !== code) throw Error(`smtp_${step}_${got}`); };
  try {
    await expect(220, 'greeting');
    await send(`EHLO ${user.split('@')[1]}`); await expect(250, 'ehlo');
    if (/AUTH[ =][^\n]*PLAIN/i.test(lastText)) {
      await send('AUTH PLAIN ' + b64('\u0000' + user + '\u0000' + pass)); await expect(235, 'plain');
    } else {
      await send('AUTH LOGIN'); await expect(334, 'auth');
      await send(b64(user)); await expect(334, 'user');
      await send(b64(pass)); await expect(235, 'pass');
    }
    await send(`MAIL FROM:<${user}>`); await expect(250, 'from');
    await send(`RCPT TO:<${to}>`); await expect(250, 'rcpt');
    await send('DATA'); await expect(354, 'data');
    const data = buildMessage({ ...options, from: user }).split('\r\n').map(l => l.startsWith('.') ? '.' + l : l).join('\r\n');
    await writer.write(enc.encode(data.replace(/(\r\n)+$/, '') + '\r\n.\r\n')); await expect(250, 'sent');
    await send('QUIT');
  } finally {
    try { await socket.close(); } catch {}
  }
}
