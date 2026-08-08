(function () {
  var cfg = window.NFC_SHOP;
  var form = document.getElementById('contact-form');
  if (!cfg || !form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var ok = document.getElementById('contact-ok');
    var err = document.getElementById('contact-err');
    var btn = document.getElementById('contact-btn');
    ok.classList.add('hidden');
    err.classList.add('hidden');

    var body = {
      name: document.getElementById('c_name').value.trim(),
      email: document.getElementById('c_email').value.trim(),
      business: document.getElementById('c_business').value.trim(),
      topic: document.getElementById('c_topic').value,
      message: document.getElementById('c_message').value.trim(),
      site: 'nfc',
    };

    if (!body.name || !body.email || !body.message) {
      err.textContent = 'Name, email, and message are required';
      err.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      var res = await fetch(cfg.CONTACT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not send');
      ok.classList.remove('hidden');
      form.reset();
    } catch (ex) {
      // Fallback: open mail client
      var subject = encodeURIComponent('NFC support — ' + (body.topic || 'help'));
      var mailBody = encodeURIComponent(
        body.message +
        '\n\n—\n' + body.name +
        (body.business ? '\n' + body.business : '') +
        '\n' + body.email
      );
      window.location.href = 'mailto:support@tapstamp.co?subject=' + subject + '&body=' + mailBody;
      err.textContent = 'Opening your email app — if nothing opens, write to support@tapstamp.co';
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send message';
    }
  });
})();
