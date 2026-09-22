/**
 * Schedule kiye hue mails.
 *
 * Gmail API me "schedule send" nahi hota, isliye job hum khud yaad rakhte
 * hain aur samay aane par bhejte hain. Iska matlab: us waqt server chalu
 * hona chahiye. Server band raha to job "missed" ho jaata hai (bhej nahi
 * dete, kyunki purani report aadhi raat ko bhejna theek nahi).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { dataFile } from './paths.js';
import { runAs } from './context.js';
import { sendReport } from './sendReport.js';

const FILE = dataFile('schedules.json');
const TICK_MS = 30000;          // har 30 second me dekho
const GRACE_MS = 10 * 60000;    // itni der ki deri chalegi, usse zyada = missed

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function writeAll(jobs) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(jobs, null, 2));
}

export async function listJobs(email) {
  const jobs = await readAll();
  return jobs
    .filter((j) => j.email === email)
    .sort((a, b) => new Date(a.when) - new Date(b.when));
}

export async function addJob(email, when, payload) {
  const at = new Date(when);
  if (isNaN(at)) throw new Error('That date and time do not look right.');
  if (at.getTime() < Date.now() - 60000) throw new Error('That time is already past.');

  const job = {
    id: crypto.randomBytes(8).toString('hex'),
    email,
    when: at.toISOString(),
    payload,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const jobs = await readAll();
  jobs.push(job);
  await writeAll(jobs);
  return job;
}

export async function cancelJob(email, id) {
  const jobs = await readAll();
  const job = jobs.find((j) => j.id === id && j.email === email);
  if (!job) throw new Error('That scheduled mail was not found.');
  if (job.status !== 'pending') throw new Error('That one already ran.');

  await writeAll(jobs.filter((j) => j !== job));
  return job;
}

/** Ek job chalao -- usi user ke context me. */
async function runJob(job) {
  try {
    const result = await runAs(job.email, () => sendReport(job.payload));
    job.status = 'sent';
    job.message = result.message;
  } catch (err) {
    job.status = 'failed';
    job.message = err.message;
  }
  job.doneAt = new Date().toISOString();
}

async function tick() {
  const jobs = await readAll();
  const due = jobs.filter((j) => j.status === 'pending' && new Date(j.when) <= new Date());
  if (!due.length) return;

  for (const job of due) {
    const late = Date.now() - new Date(job.when).getTime();
    if (late > GRACE_MS) {
      job.status = 'missed';
      job.message = 'The server was not running at that time.';
      job.doneAt = new Date().toISOString();
      continue;
    }
    await runJob(job);
  }

  await writeAll(jobs);
}

export function startScheduler() {
  tick().catch(() => {});
  const timer = setInterval(() => tick().catch(() => {}), TICK_MS);
  timer.unref?.();
  return timer;
}
