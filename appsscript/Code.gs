/**
 * Entry point.
 *
 * Ye script kisi sheet se bandha nahi hai -- standalone hai. Kaunsi sheet
 * par kaam karna hai wo settings me likha rehta hai, isliye pehle demo
 * sheet par test karke baad me real sheet par switch kiya ja sakta hai,
 * bina script badle.
 *
 * Web app ke roop me deploy karo:
 *   Execute as        : User accessing the web app
 *   Who has access    : Anyone with a Google Account
 *
 * "Execute as" zaroor "User accessing" rakhna. "Me" rakh diya to sabke
 * mail tumhare Gmail se jaayenge aur sheet me sab edit tumhare naam par
 * dikhenge.
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Daily Work Report')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Script Editor se ek baar chalao -- isse saare permissions ek saath
 * maang liye jaate hain aur baad me beech kaam me prompt nahi aata.
 */
function authorizeOnce() {
  var out = [];

  out.push('Signed in as: ' + Session.getActiveUser().getEmail());

  var s = getSettings();
  out.push('Sheet: ' + (s.sheetId || 'not set yet'));
  out.push('Name: ' + (s.personName || 'not set yet'));

  try {
    out.push('Signature: ' + (signatureHtml_() ? 'found' : 'none'));
  } catch (e) {
    out.push('Signature: ' + e.message);
  }

  Logger.log(out.join('\n'));
  return out.join('\n');
}
