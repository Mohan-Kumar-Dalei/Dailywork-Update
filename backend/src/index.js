import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { router } from './routes.js';
import { withUser } from './middleware.js';
import { startScheduler } from './scheduler.js';
import { CLIENT_DIST, DATA_DIR } from './paths.js';

const app = express();

/*
 * CORS sirf tab kaam aata hai jab frontend kisi aur domain par ho.
 * Ek hi service me dono chal rahe hon to same origin hota hai aur ye
 * beech me aata hi nahi.
 */
app.use(cors((req, done) => {
  const origin = req.headers.origin;

  // apne hi host se aayi request hamesha chalegi -- ek hi service me
  // frontend aur API same origin par hote hain
  const self = req.headers.host
    ? ['http://' + req.headers.host, 'https://' + req.headers.host]
    : [];

  const allowed = !origin || config.clientOrigins.includes(origin) || self.includes(origin);

  // mana karna ho to sirf CORS headers mat bhejo -- error phenkne se
  // request 500 ban jaati hai
  done(null, { origin: allowed, credentials: true });
}));

app.use(express.json());
app.use('/api', withUser, router);

/*
 * React ka build isi server se.
 * Build maujood ho to hi -- warna dev me (jab Vite alag chal raha hota hai)
 * ye bekaar me 404 dene lagega.
 */
const hasBuild = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

if (hasBuild) {
  app.use(express.static(CLIENT_DIST));

  // React ka routing client side hai, to baaki har raasta index.html par
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

startScheduler();

app.listen(config.port, () => {
  console.log(`Server: http://localhost:${config.port}`);
  console.log(`Data  : ${DATA_DIR}`);
  console.log(`Client: ${hasBuild ? CLIENT_DIST : 'not built (Vite alag chal raha hoga)'}`);
  console.log(`Mail  : ${config.testMode ? 'TEST MODE' : 'live'}`);
});
