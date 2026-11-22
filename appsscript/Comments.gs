/**
 * Asli Google Sheets comment (Ctrl+Alt+M wala) -- cell par anchored.
 *
 * Kaise: Sheets ka comment anchor coordinates nahi leta, wo ek internal
 * "range object" ka id leta hai. Aisa id API se bhi ban sakta hai --
 * ek protected range banao, uska protectedRangeId lo, aur wahi id
 * comment ke anchor me daal do. Comment us cell par ja lagta hai.
 *
 * SAVDHAAN: protected range hatate hi us par tika comment cell se alag ho
 * jaata hai (web app me test kiya gaya). Isliye range delete NAHI karte.
 *
 * SpreadsheetApp.getRange().setNote() sirf "note" banata hai, "comment"
 * nahi -- isliye yahan advanced services hi use karni padti hain.
 */

var COMMENT_MAP_KEY = 'commentMap';

function readCommentMap_() {
  return readJsonProp_(PropertiesService.getScriptProperties(), COMMENT_MAP_KEY);
}

function writeCommentMap_(map) {
  PropertiesService.getScriptProperties()
    .setProperty(COMMENT_MAP_KEY, JSON.stringify(map));
}

function commentKey_(fileId, gid, rowIdx, colIdx) {
  return [fileId, gid, rowIdx, colIdx].join(':');
}

/** Cell ke liye ek naya anchor id banata hai. */
function mintAnchorId_(fileId, gid, rowIdx, colIdx) {
  var res = Sheets.Spreadsheets.batchUpdate({
    requests: [{
      addProtectedRange: {
        protectedRange: {
          range: {
            sheetId: Number(gid),
            startRowIndex: rowIdx,
            endRowIndex: rowIdx + 1,
            startColumnIndex: colIdx,
            endColumnIndex: colIdx + 1
          },
          description: 'comment-anchor',
          warningOnly: true   // kisi ko sach me block nahi karta
        }
      }
    }]
  }, fileId);

  return res.replies[0].addProtectedRange.protectedRange.protectedRangeId;
}

/**
 * Cell par asli comment lagata hai.
 * Usi cell ka purana comment (jo is app ne banaya tha) hata deta hai,
 * taaki roz-roz duplicate na bane.
 */
function addCellComment_(fileId, gid, rowIdx, colIdx, text) {
  var map = readCommentMap_();
  var k = commentKey_(fileId, gid, rowIdx, colIdx);
  var old = map[k] || {};

  // purana comment hata do
  if (old.commentId) {
    try {
      Drive.Comments.remove(fileId, old.commentId);
    } catch (e) {
      // pehle se delete ho chuka hoga -- koi baat nahi
    }
  }

  // usi cell ka purana anchor phir se kaam aa jaata hai
  var anchorId = old.anchorId || mintAnchorId_(fileId, gid, rowIdx, colIdx);

  var created = Drive.Comments.create(
    {
      content: text,
      anchor: JSON.stringify({ type: 'workbook-range', uid: 0, range: String(anchorId) })
    },
    fileId,
    { fields: 'id,anchor' }
  );

  map[k] = { commentId: created.id, anchorId: anchorId, at: new Date().toISOString() };
  writeCommentMap_(map);

  return { id: created.id, anchored: true, anchorId: anchorId };
}

function listCellComments_(fileId) {
  var res = Drive.Comments.list(fileId, {
    fields: 'comments(id,content,anchor,resolved,createdTime,quotedFileContent)',
    pageSize: 100
  });
  return res.comments || [];
}
