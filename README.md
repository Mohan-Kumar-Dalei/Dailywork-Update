# Daily Work Report — MERN app

Roz ke counts bharo → sheet ke cell par note lagta hai → manager/TL ko mail chala jaata hai.
MongoDB nahi hai: **Google Sheet hi database** hai.

```
client (React + Vite)  →  server (Express)  →  Google Sheets API
                                            →  Gmail (SMTP / nodemailer)
```

## Chalane ke liye

Do terminal chahiye.

```bash
cd backend && npm install && cp .env.example .env && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Kholo: http://localhost:5173

## Safety

`.env` me `TEST_MODE=true` default hai:

- mail sirf `TEST_RECIPIENT` (aapke apne address) par jaata hai
- subject me `[TEST]` lagta hai
- app me peela banner dikhta hai

Jab sab sahi chale tabhi `TEST_MODE=false` karna — tab hi mail sir logon ko jaayega.

## Sheet aur naam app ke andar se

Kaunsi sheet, kaunsa tab aur kiska naam — sab app ke **Sheet settings** panel se set hote hain
(`data/settings.json` me save hote hain, restart ke baad bhi yaad rehte hain). `.env` sirf
pehli baar ka default deta hai. "Sheet ke naam dikhao" button column A ke saare naam le aata
hai, usme se apna naam chun lo — spelling ki galti nahi hogi.

## Storage: json vs sheets

`.env` me `STORE`:

- `json` (default) — history `data/history.json` me. Bina kisi Google setup ke chalta hai,
  app turant chalu ho jaata hai. Sheet ko haath nahi lagta.
- `sheets` — asli Google Sheet me note lagta hai aur `Report_Log` tab me row add hoti hai.

### Google login (OAuth) — recommended

App aapke apne account se chalta hai, to sheet kisi ko share karne ki zarurat nahi.
Office ki asli sheet par bhi seedha chalega.

1. Cloud Console -> APIs & Services -> OAuth consent screen -> Internal (office account me).
2. Credentials -> Create credentials -> OAuth client ID -> **Desktop app**.
3. Client ID aur secret `backend/.env` me daalo (`OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`).
4. `cd backend` phir `npm run login` — browser khulega, Allow dabao, `backend/token.json` ban jaayega.

Bas. `STORE=auto` hai, to login milte hi app sheet me likhne lagega.

### Service account ka setup (alternative)

1. [console.cloud.google.com](https://console.cloud.google.com) → naya project.
2. **Google Sheets API** enable karo.
3. **Credentials → Create credentials → Service account** → bana lo.
4. Us service account me **Keys → Add key → JSON** → file download hogi.
5. File ko `backend/service-account.json` naam se rakho (gitignore me hai).
6. JSON ke andar ek email hai jaise `xyz@project.iam.gserviceaccount.com` —
   apni Google Sheet ko us email se **Editor** share karo. Ye step bhoolne par
   "permission denied" aayega.
7. `.env` me `STORE=sheets`, `SHEET_ID`, `SHEET_TAB`, `NAME_COLUMN`, `DATE_HEADER_ROW` set karo.
8. Check: http://localhost:4000/api/health — store aur mail dono ka status batata hai.

Sheet ka asli dhancha (demo sheet se confirm kiya gaya):

```
Row 1 : [blank] | Target | 1-September | 2-September | ... 30-September
Row 2 : [blank] |        | Tue         | Wed         | ...
...
Row 148 : Mohan Kumar Dalei        | 0    |    |    |
Row 149 : Daily Achieved           | 1200 | 70 | 70 | ...   <- yahan count
Row 150 : Additional (OT)          | 0    |    |    |
Row 151 : Difference (Target-...)  | 1200 | 70 | 70 | ...   (formula)
```

App naam ki row dhoondhta hai, uske neeche "Daily Achieved" row leta hai, aur aaj ke
date wale column me: cell ki value = Sourcing count, aur usi cell ke note me poora
breakdown. Row/column numbers hardcoded nahi hain — har baar dhoondhe jaate hain, to
sheet me rows upar-neeche hone par bhi kaam karega.

## Mail setup (abhi OFF)

`.env` me `MAIL_ENABLED=false` hai, is liye app me mail ka subject/body dikhta hi nahi
aur `/api/send` mana kar deta hai. Sheet ka kaam pakka ho jaane ke baad `true` karna.


Gmail normal password se SMTP nahi hone deta, **App Password** chahiye:

1. Google Account → Security → 2-Step Verification on karo.
2. App passwords → naya banao → 16 character ka password milega.
3. `.env` me `SMTP_USER` (apna gmail) aur `SMTP_PASS` (wahi app password).

Office ka `@contify.com` Workspace account app passwords block kar sakta hai — us case me
admin se poochna padega, ya Gmail API + OAuth pe shift karenge.

## API

| Method | Path | Kaam |
| --- | --- | --- |
| GET | `/api/config` | aaj ki date, test mode, recipients |
| GET | `/api/health` | sheet + SMTP connection status |
| POST | `/api/preview` | sirf preview, kuch bhejta/likhta nahi |
| POST | `/api/save-note` | sheet cell par note |
| POST | `/api/send` | note + mail |
| GET | `/api/history` | pichhle records |

## Folders

- `frontend/` — React UI
- `backend/` — Express API
- `backend/data/` — tokens, sessions, team settings, history
- `apps-script/` — purana Google Apps Script version, fallback ke taur pe rakha hai

## Render par deploy

Do alag services hoti hain. `render.yaml` me dono likhi hain — Blueprint se
deploy karo, ya haath se banao aur wahi values daal do.

| | Frontend | Backend |
| --- | --- | --- |
| Type | Static site | Web service |
| Root | `frontend` | `backend` |
| Build | `npm install && npm run build` | `npm install` |
| Start | — (`dist` serve hoti hai) | `npm start` |

**Dono ko jodne ke liye teen cheezein:**

1. Frontend me `VITE_API_URL` = backend ka pura URL
   (dev me khali rakho -- Vite khud `/api` proxy kar deta hai)
2. Backend me `CLIENT_ORIGIN` = frontend ka URL (comma se ek se zyada bhi)
3. Alag domain par hone ki wajah se cookie ke liye:
   `COOKIE_SAMESITE=none` aur `COOKIE_SECURE=true`

**Google Cloud me** OAuth client ki redirect URIs me backend wali URI bhi
jodni padegi, localhost wali hatani nahi:

```
https://<backend>.onrender.com/api/auth/callback
```

Aur backend ke `.env` me `OAUTH_REDIRECT` wahi URL rakhna.

**Data ka dhyan rakhna.** Tokens, sessions, team settings aur history
`backend/data/` me files me rehti hain. Render par disk na ho to har deploy
ke baad ye mit jaati hain aur sabko dobara sign in karna padta hai.
`render.yaml` me 1 GB ka disk `/var/data` par laga hai aur `DATA_DIR` usi par
set hai.
