// Validate the credential before reading a document or constructing HTTP headers.
function readPilotToken(field) {
  const token = field.value.trim();
  if (/^[!-~]{32,128}$/.test(token)) return token;

  field.setCustomValidity('Vložte iba uložený testovací token bez medzier, diakritiky a skrytých znakov.');
  field.reportValidity();
  field.setCustomValidity('');
  field.focus();
  return null;
}
