/**
 * Mail bhejna -- user ke apne Gmail se, uske apne signature ke saath.
 *
 * GmailApp.sendEmail ke bajaye Gmail advanced service se raw MIME bhejte
 * hain, bilkul web app jaisa. Isse From header, multipart/alternative aur
 * signature sab waise ke waise rehte hain.
 */

function b64_(text) {
  return Utilities.base64Encode(text, Utilities.Charset.UTF_8);
}

function b64Url_(text) {
  return Utilities.base64EncodeWebSafe(text, Utilities.Charset.UTF_8)
    .replace(/=+$/, '');
}

/** Mail kisko jaayega -- jo settings me likha hai, wahi. */
function recipientsFrom_(s) {
  return { to: s.mailTo || [], cc: s.mailCc || [] };
}

/**
 * Gmail signature ke images ka asli link nikalo.
 *
 * Gmail signature me images ka src uske apne proxy ka hota hai
 * (ci3.googleusercontent.com/meips/...), jo sirf aapke apne mailbox me
 * chalta hai -- doosron ko photo nahi dikhti. Asli public link usi URL me
 * "#" ke baad chhupa hota hai, wahi laga dete hain.
 */
function fixSignatureImages_(html) {
  return String(html || '').replace(/src="[^"]*#(https?:[^"]+)"/gi, 'src="$1"');
}

/**
 * Gmail ka apna signature.
 *
 * Gmail signature sirf compose window me apne aap lagta hai -- API se
 * bheje mail me nahi. Isliye settings se padh kar khud jodte hain.
 */
function signatureHtml_() {
  var cache = CacheService.getUserCache();
  var hit = cache.get('signature');
  if (hit !== null) return hit;

  var html = '';
  try {
    var res = Gmail.Users.Settings.SendAs.list('me');
    var list = res.sendAs || [];
    var mine = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].isDefault) { mine = list[i]; break; }
    }
    if (!mine) mine = list[0];
    html = fixSignatureImages_(mine && mine.signature);
  } catch (e) {
    html = '';   // permission na ho to bina signature ke bhej do
  }

  cache.put('signature', html, 1800);
  return html;
}

function forgetSignature() {
  CacheService.getUserCache().remove('signature');
}

/** Jo aadmi abhi app chala raha hai. */
function whoami_() {
  var email = Session.getActiveUser().getEmail();
  var name = '';
  try {
    var me = People.People.get('people/me', { personFields: 'names' });
    if (me.names && me.names.length) name = me.names[0].displayName || '';
  } catch (e) {
    // naam na mile to sirf address se kaam chala lenge
  }
  return { email: email, name: name };
}

/**
 * From header standard tareeke se.
 * Display name quotes me aur non-ASCII ho to RFC 2047 encoding --
 * bina iske kuch mail clients naam/address ko theek se nahi padhte.
 */
function formatFrom_(me) {
  if (!me.name) return me.email || '';

  var ascii = /^[ -~]*$/.test(me.name);
  var name = ascii
    ? '"' + me.name.replace(/"/g, '') + '"'
    : '=?UTF-8?B?' + b64_(me.name) + '?=';

  return name + ' <' + me.email + '>';
}

/** RFC 2822 message -> base64url. HTML aur plain text dono bhejte hain. */
function encodeMessage_(m) {
  var boundary = 'dwr_' + Date.now().toString(36);

  var headers = [
    'From: ' + m.from,
    'To: ' + m.to.join(', '),
    m.cc.length ? 'Cc: ' + m.cc.join(', ') : null,
    'Subject: =?UTF-8?B?' + b64_(m.subject) + '?=',
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"'
  ].filter(function (h) { return h; });

  var parts = [
    '--' + boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64_(m.text),
    '--' + boundary,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64_(m.html),
    '--' + boundary + '--'
  ];

  return b64Url_(headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n'));
}

function sendReportMail_(s, report) {
  var box = recipientsFrom_(s);
  if (!box.to.length) {
    throw new Error('No recipients set. Add them in Mail settings.');
  }

  var raw = encodeMessage_({
    from: formatFrom_(whoami_()),
    to: box.to,
    cc: box.cc,
    subject: report.subject,
    text: report.text,
    html: report.html
  });

  var sent = Gmail.Users.Messages.send({ raw: raw }, 'me');
  return { id: sent.id, to: box.to, cc: box.cc };
}
