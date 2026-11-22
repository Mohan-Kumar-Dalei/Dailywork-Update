# Daily Work Report — Apps Script version

Yahi app, bina kisi server ke. Google Apps Script par chalta hai, isliye:

- **Koi API setup nahi** — na Cloud project, na OAuth client, na redirect URI
- **Settings aur login kabhi nahi mitte** — Google ke paas rehte hain, Render ki tarah har deploy par wipe nahi hote
- **Schedule sach me chalta hai** — Google ka time-based trigger, computer band ho to bhi mail jaata hai
- **Har aadmi apne account se** — sheet me edit uske naam par, mail uske apne Gmail se, uske apne signature ke saath

UI bilkul wahi hai jo web app me hai — wahi React code, ek HTML file me pack karke.

---

## Pehli baar setup

> Pehle **demo sheet** par test karna. Real tracker par baad me switch karna —
> sirf settings me sheet badalni hogi, script dobara nahi lagana padega.

### 1. Script project banao

[script.google.com](https://script.google.com) → **New project** → naam do
`Daily Work Report`.

Ye script kisi sheet se bandha hua nahi hai (standalone). Kaunsi sheet par kaam
karna hai wo app ke andar settings me set hota hai.

### 2. Files daalo

**Aasaan tarika — clasp se (sab ek command me):**

```bash
npm install -g @google/clasp
```

```bash
clasp login
```

Phir is folder me aakar, apne script ka ID daalkar:

```bash
cd appsscript && clasp clone <SCRIPT_ID> --rootDir .
```

```bash
clasp push
```

Script ID project ke URL me hota hai:
`script.google.com/home/projects/`**`<SCRIPT_ID>`**`/edit`

**Ya haath se:** editor me har `.gs` file ke liye **+ → Script** aur naam wahi
rakho (`Code`, `Settings`, `Sheet`, ...), `index.html` ke liye **+ → HTML**.
`appsscript.json` dikhane ke liye **Project Settings → Show "appsscript.json"**
on karna padta hai.

### 3. Advanced services on karo

Editor me **Services (+)** → ye chaaro add karo, identifier wahi rakhte hue:

| Service | Identifier |
|---|---|
| Google Sheets API | `Sheets` |
| Google Drive API (v3) | `Drive` |
| Gmail API | `Gmail` |
| People API | `People` |

`clasp push` kiya ho to ye `appsscript.json` se apne aap aa jaate hain — bas
editor me ek baar kholkar confirm kar lena.

### 4. Ek baar authorize karo

Editor me function `authorizeOnce` chuno aur **Run** dabao. Google saari
permissions ek saath maangega. "Google hasn't verified this app" aaye to
**Advanced → Go to Daily Work Report (unsafe)** — ye tumhara hi script hai.

Log me apna email aur signature ka status dikhna chahiye.

### 5. Web app deploy karo

**Deploy → New deployment → Web app**

| Setting | Value |
|---|---|
| Execute as | **User accessing the web app** |
| Who has access | **Anyone with a Google Account** |

> **"Execute as" zaroor "User accessing" rakhna.** "Me" rakh diya to sabke mail
> tumhare Gmail se jaayenge aur sheet me har edit tumhare naam par dikhega.

Jo URL milega wahi team ko dena hai. Har aadmi pehli baar khud authorize karega.

### 6. App ke andar settings

1. **Sheet settings** — demo sheet ka link, tab, apna naam
2. **Mail settings** — kisko bhejna hai (naam type karte hi suggestions aayenge)
3. Table me numbers daalo aur **Save & send**

Table me ab sab kuch editable hai — row ke naam, Sheet Name, blank columns.
Row ka naam badal kar wapas default chahiye to use khaali kar do.

---

## UI badalni ho to

UI ka asli code `frontend/` me hai. Badal kar:

```bash
npm --prefix frontend run build:gas
```

Isse `appsscript/index.html` dobara ban jaati hai. **Us file ko haath se mat
edit karna** — wo generated hai. Phir `clasp push` (ya naya content paste).

Har UI change ke baad **Deploy → Manage deployments → edit → Version: New** karna
padta hai, warna purana version hi chalta rahega.

---

## Kaunsi file kya karti hai

| File | Kaam |
|---|---|
| `Code.gs` | `doGet` — web app khulta hai; `authorizeOnce` |
| `Api.gs` | Jo kuch UI maangti hai, sab yahan se (`google.script.run` ka target) |
| `Settings.gs` | Team aur per-user settings, Properties me |
| `Sheet.gs` | Tab dhoondhna, naam padhna, cell me likhna, history |
| `Layout.gs` | Naam ki row + aaj ke date ka column dhoondhna |
| `Comments.gs` | Asli anchored comment (Ctrl+Alt+M wala) |
| `Report.gs` | Numbers, cell ka comment text, subject |
| `MailBody.gs` | Mail ka colored table |
| `Mail.gs` | Gmail signature + mail bhejna |
| `Contacts.gs` | Recipients ke naam dhoondhna |
| `Trigger.gs` | Schedule — time-based trigger |
| `index.html` | UI (generated — `build:gas` se banti hai) |

---

## Atak jao to

**"Pick your name in the Sheet settings first."**
Sheet settings me apna naam select nahi kiya. Naam wahi hona chahiye jo sheet ke
column A me likha hai.

**`"<naam>" was not found in column A of this tab.`**
Galat tab chuna hua hai, ya sheet me naam ki spelling alag hai.

**`No column for "22-November" in header row 1`**
Header row ka number galat hai, ya us date ka column sheet me hai hi nahi.

**Comment nahi lag raha**
Advanced services me `Drive` aur `Sheets` dono on hone chahiye. Comment ek
protected range par tika hota hai — wo range kabhi delete mat karna, warna
comment cell se alag ho jaata hai.

**Schedule ka mail nahi gaya**
**Triggers** (ghadi wala icon) me jaakar us run ka error dekho. Trigger usi ke
account par chalta hai jisne schedule banaya tha.
