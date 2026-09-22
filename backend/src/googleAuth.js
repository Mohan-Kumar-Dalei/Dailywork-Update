/**
 * Google login -- har user ka apna token.
 *
 * App me "Sign in with Google" dabate hi Google ka consent page khulta hai.
 * Allow karte hi token server par us user ke naam se save hota hai, aur
 * browser ko sirf ek session cookie milti hai.
 *
 * Service account (server/service-account.json) bhi support hai, lekin kai
 * organizations me uski key banana block hota hai.
 */
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { currentUser } from './context.js';
import { tokenFor, saveToken, dropToken } from './sessions.js';

export const SCOPES = (
  process.env.GOOGLE_SCOPES ||
  'https://www.googleapis.com/auth/spreadsheets ' +
  'https://www.googleapis.com/auth/drive ' +
  'https://www.googleapis.com/auth/gmail.send ' +
  'https://www.googleapis.com/auth/gmail.settings.basic ' +
  'https://www.googleapis.com/auth/userinfo.email ' +
  'https://www.googleapis.com/auth/userinfo.profile'
).split(/\s+/).filter(Boolean);

export const REDIRECT_URI =
  process.env.OAUTH_REDIRECT ||
  'http://localhost:' + (process.env.PORT || 4000) + '/api/auth/callback';

/**
 * Do OAuth clients:
 *   personal -> aapka External client (koi bhi Gmail)
 *   work     -> Contify Workspace ka Internal client (sirf @contify.com)
 *
 * Dono ka redirect URI ek hi hai. Jis client se login hua tha, token refresh
 * bhi usi se hota hai -- isliye token ke saath client ka naam bhi save hota hai.
 */
export const CLIENTS = {
  personal: {
    id: process.env.OAUTH_CLIENT_ID,
    secret: process.env.OAUTH_CLIENT_SECRET,
    label: 'Personal Gmail',
    hd: null
  },
  work: {
    id: process.env.OAUTH_WORK_CLIENT_ID,
    secret: process.env.OAUTH_WORK_CLIENT_SECRET,
    label: process.env.OAUTH_WORK_LABEL || 'Contify account',
    hd: process.env.OAUTH_WORK_DOMAIN || null
  }
};

export function clientConfigured(kind) {
  const c = CLIENTS[kind];
  return Boolean(c && c.id && c.secret);
}

/** Login screen ko batata hai ki kaunse buttons dikhane hain. */
export function availableClients() {
  return Object.entries(CLIENTS)
    .filter(([kind]) => clientConfigured(kind))
    .map(([kind, c]) => ({ kind, label: c.label }));
}

export function oauthConfigured() {
  return clientConfigured('personal') || clientConfigured('work');
}

export function hasServiceAccount() {
  const file = process.env.GOOGLE_KEY_FILE || './service-account.json';
  return fs.existsSync(path.resolve(process.cwd(), file));
}

export function makeOAuthClient(kind = 'personal') {
  const c = CLIENTS[kind];
  if (!c || !c.id) throw new Error(`The "${kind}" sign-in option is not set up yet.`);
  return new google.auth.OAuth2(c.id, c.secret, REDIRECT_URI);
}

/** Consent page ka URL. state me "<sessionId>.<client>" jaata hai. */
export function authUrl(sid, kind = 'personal') {
  if (!clientConfigured(kind)) {
    throw new Error(
      'This sign-in option is not configured yet. Add its client ID and secret to server/.env.'
    );
  }
  const opts = {
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: sid + '.' + kind
  };
  if (CLIENTS[kind].hd) opts.hd = CLIENTS[kind].hd;   // account chooser usi domain tak
  return makeOAuthClient(kind).generateAuthUrl(opts);
}

/** state string ko wapas khol do. */
export function parseState(state) {
  const text = String(state || '');
  const dot = text.lastIndexOf('.');
  if (dot === -1) return { sid: text, kind: 'personal' };
  return { sid: text.slice(0, dot), kind: text.slice(dot + 1) || 'personal' };
}

/** Code -> token + us token ka email. */
export async function exchangeCode(code, kind = 'personal') {
  const client = makeOAuthClient(kind);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const { data } = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
  const email = data.email;
  if (!email) throw new Error('Google did not return an email address.');

  await saveToken(email, { ...tokens, client: kind });
  profiles.set(email, {
    email,
    name: data.name || null,
    picture: data.picture || null
  });
  return { email, profile: profiles.get(email) };
}

export async function logout(email) {
  profiles.delete(email);
  await dropToken(email);
}

/* ---------- profile (naam + photo) ---------- */

const profiles = new Map();

export async function whoami() {
  const email = currentUser();
  if (!email) return null;
  if (profiles.has(email)) return profiles.get(email);

  try {
    const client = await getAuthClient();
    const { data } = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
    const profile = {
      email: data.email || email,
      name: data.name || null,
      picture: data.picture || null
    };
    profiles.set(email, profile);
    return profile;
  } catch {
    return { email, name: null, picture: null };
  }
}

/* ---------- auth client ---------- */

export async function getAuthClient() {
  const email = currentUser();

  if (oauthConfigured() && email) {
    const tokens = await tokenFor(email);
    if (tokens) {
      const kind = tokens.client || 'personal';
      const client = makeOAuthClient(kind);
      client.setCredentials(tokens);
      // refresh hone par naya token save kar lo (usi client ke saath)
      client.on('tokens', (fresh) => {
        saveToken(email, { ...tokens, ...fresh, client: kind });
      });
      return client;
    }
  }

  if (hasServiceAccount()) {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_KEY_FILE || './service-account.json',
      scopes: SCOPES
    });
    return auth.getClient();
  }

  throw new Error('Not signed in. Click "Sign in with Google".');
}

/** Kya ye request likh sakti hai. */
export async function authKind() {
  const email = currentUser();
  if (oauthConfigured() && email && (await tokenFor(email))) return 'oauth';
  if (hasServiceAccount()) return 'service-account';
  return 'none';
}
