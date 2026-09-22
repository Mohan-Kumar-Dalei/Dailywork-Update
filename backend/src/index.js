import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { router } from './routes.js';
import { withUser } from './middleware.js';
import { startScheduler } from './scheduler.js';

const app = express();
app.use(cors({
  origin(origin, done) {
    // bina origin wali requests (curl, health check) bhi chalein
    if (!origin || config.clientOrigins.includes(origin)) return done(null, true);
    done(new Error('Origin not allowed: ' + origin));
  },
  credentials: true
}));
app.use(express.json());
app.use('/api', withUser, router);

startScheduler();

app.listen(config.port, () => {
  console.log(`Server: http://localhost:${config.port}`);
  console.log(`Store : ${config.store}`);
  console.log(`Mail  : ${config.testMode ? 'TEST MODE -> ' + config.testRecipient : config.mailTo.join(', ')}`);
});
