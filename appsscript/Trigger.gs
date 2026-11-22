/**
 * Schedule -- "ye report is din is time par bhej dena".
 *
 * Web app me ye server par ek loop tha, jo tabhi chalta tha jab server
 * jaag raha ho. Render ke free plan par wo 15 minute baad so jaata tha,
 * isliye scheduled mail kabhi jaate hi nahi the.
 *
 * Yahan Google ka apna time-based trigger chalta hai. Computer band ho ya
 * browser khula na ho, mail phir bhi apne time par chala jaayega.
 *
 * Trigger banane wale ke apne account par chalta hai, isliye har aadmi ka
 * mail uske apne Gmail se jaata hai.
 */

var JOBS_KEY = 'jobs';

function readJobs_() {
  var raw = PropertiesService.getUserProperties().getProperty(JOBS_KEY);
  if (!raw) return [];
  try {
    var list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function writeJobs_(jobs) {
  PropertiesService.getUserProperties().setProperty(JOBS_KEY, JSON.stringify(jobs));
}

/** UI ke liye -- aane wale aur ho chuke jobs. */
function listSchedules() {
  return readJobs_().sort(function (a, b) {
    return String(a.at).localeCompare(String(b.at));
  });
}

/**
 * Naya schedule. UI ek hi object bhejti hai jisme `when` (ISO string,
 * local time se bani) aur baaki wahi form hota hai jo send ko jaata.
 */
function addSchedule(payload) {
  payload = payload || {};
  var when = new Date(payload.when);
  if (isNaN(when.getTime())) throw new Error('That date and time could not be read.');
  if (when.getTime() < Date.now() + 60000) {
    throw new Error('Pick a time at least a minute from now.');
  }

  var s = getSettings();
  if (!s.personName) throw new Error('Pick your name in the Sheet settings first.');
  if (!(s.mailTo || []).length) {
    throw new Error('No recipients set. Add them in Mail settings.');
  }

  var trigger = ScriptApp.newTrigger('runScheduledJob')
    .timeBased()
    .at(when)
    .create();

  var jobs = readJobs_();
  jobs.push({
    id: Utilities.getUuid(),
    at: when.toISOString(),
    triggerUid: trigger.getUniqueId(),
    payload: payload,
    status: 'waiting',
    createdAt: new Date().toISOString()
  });
  writeJobs_(jobs);

  return listSchedules();
}

function cancelSchedule(id) {
  var jobs = readJobs_();
  var keep = [];

  jobs.forEach(function (job) {
    if (job.id !== id) { keep.push(job); return; }
    dropTrigger_(job.triggerUid);
  });

  writeJobs_(keep);
  return listSchedules();
}

function dropTrigger_(uid) {
  if (!uid) return;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getUniqueId() === uid) ScriptApp.deleteTrigger(t);
  });
}

/**
 * Trigger yahi bulata hai. `e.triggerUid` se pata chalta hai kaunsa job tha.
 */
function runScheduledJob(e) {
  var uid = e && e.triggerUid;
  var jobs = readJobs_();

  var job = null;
  for (var i = 0; i < jobs.length; i++) {
    if (jobs[i].triggerUid === uid) { job = jobs[i]; break; }
  }

  // trigger ek hi baar chalna hai -- chahe job mile ya na mile
  dropTrigger_(uid);
  if (!job) return;

  try {
    var payload = job.payload || {};
    payload.saveNote = payload.saveNote !== false;
    var result = sendReportNow(payload);
    job.status = 'sent';
    job.message = result.message;
  } catch (err) {
    job.status = 'failed';
    job.message = err.message;
  }
  job.ranAt = new Date().toISOString();

  writeJobs_(jobs);
}
