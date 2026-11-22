/**
 * Recipients ke naam dhoondhna -- bilkul waise jaise Gmail me address
 * likhte hi naam dikh jaata hai.
 *
 * Do jagah dekhte hain:
 *   - saved contacts   (People.People.searchContacts)
 *   - "other contacts" (People.OtherContacts.search) -- jinhe mail kiya hai
 *
 * Naam na mile to bhi address haath se likhna chalta rehta hai.
 */

var CONTACT_READ_MASK = 'names,emailAddresses';

/** Google kehta hai: search se pehle ek khaali query bhejo, cache garam ho jaata hai. */
function warmContacts_() {
  var cache = CacheService.getUserCache();
  if (cache.get('contactsWarm')) return;
  cache.put('contactsWarm', '1', 1800);

  try { People.People.searchContacts({ query: '', readMask: CONTACT_READ_MASK }); } catch (e) {}
  try { People.OtherContacts.search({ query: '', readMask: CONTACT_READ_MASK }); } catch (e) {}
}

function flattenPeople_(results) {
  var out = [];
  (results || []).forEach(function (r) {
    var person = r.person || {};
    var name = (person.names && person.names.length) ? person.names[0].displayName : '';
    (person.emailAddresses || []).forEach(function (e) {
      if (e.value) out.push({ name: name || '', email: e.value });
    });
  });
  return out;
}

/** Lautata hai { people: [{name, email}] }. */
function searchContacts(query) {
  var q = String(query || '').trim();
  if (q.length < 2) return { people: [] };

  warmContacts_();

  var found = [];
  try {
    var a = People.People.searchContacts({
      query: q, readMask: CONTACT_READ_MASK, pageSize: 10
    });
    found = found.concat(flattenPeople_(a.results));
  } catch (e) {}

  try {
    var b = People.OtherContacts.search({
      query: q, readMask: CONTACT_READ_MASK, pageSize: 10
    });
    found = found.concat(flattenPeople_(b.results));
  } catch (e) {}

  var seen = {};
  var people = [];
  found.forEach(function (hit) {
    var key = hit.email.toLowerCase();
    if (!seen[key]) {
      seen[key] = hit;
      people.push(hit);
    } else if (!seen[key].name && hit.name) {
      seen[key].name = hit.name;
    }
  });

  return { people: people.slice(0, 8) };
}

/**
 * Jo address pehle se chune hue hain unke naam nikaalo.
 * Lautata hai { names: { "mail@x.com": "Full Name" } } -- jo na mile wo chhod diye.
 */
function contactNames(emails) {
  var list = [];
  var seen = {};
  (emails || []).forEach(function (e) {
    var v = String(e).trim();
    if (v && !seen[v]) { seen[v] = true; list.push(v); }
  });

  var names = {};
  list.forEach(function (email) {
    try {
      var r = searchContacts(email);
      for (var i = 0; i < r.people.length; i++) {
        if (r.people[i].email.toLowerCase() === email.toLowerCase() && r.people[i].name) {
          names[email] = r.people[i].name;
          break;
        }
      }
    } catch (e) {
      // ek address na mile to baaki ka kaam rukna nahi chahiye
    }
  });

  return { names: names };
}
