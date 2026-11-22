# Daily Work Report — Apps Script version

**[English](#english) · [Hinglish](#hinglish)**

---

<a name="english"></a>

## English

The same app, without a server. It runs on Google Apps Script, which means:

- **No API setup** — no Cloud project, no OAuth client, no redirect URI
- **Settings and sign-in never disappear** — they live with Google, instead of being wiped on every deploy the way they were on Render
- **Scheduling actually works** — a Google time-based trigger sends the mail even if your computer is off
- **Everyone acts as themselves** — the sheet edit is in their name, and the mail goes from their own Gmail with their own signature

The interface is the same one as the web app — the same React code, packed into a single HTML file.

### First-time setup

> Test on the **demo sheet** first. Switching to the real tracker later only means
> changing the sheet in settings; the script does not have to be set up again.

#### 1. Create the script project

Go to [script.google.com](https://script.google.com) → **New project** → name it
`Daily Work Report`.

This script is not bound to any sheet (it is standalone). Which sheet it works on is
set inside the app, in settings.

#### 2. Add the files

**The easy way — with clasp.** One command pushes every file, so you never
paste anything again. Worth the five minutes even if the files are already in
place by hand — this is also how you take later updates.

First turn the API on once, at
[script.google.com/home/usersettings](https://script.google.com/home/usersettings)
→ **Google Apps Script API: On**. Then:

```bash
npm install -g @google/clasp
```

```bash
clasp login
```

Make a `.clasp.json` inside `appsscript/` holding your script's ID — the ID is
in the project URL, `script.google.com/home/projects/`**`<SCRIPT_ID>`**`/edit`:

```json
{ "scriptId": "PASTE_YOUR_SCRIPT_ID_HERE", "rootDir": "." }
```

Then, from `appsscript/`:

```bash
clasp push --force
```

That uploads all the `.gs` files, `index.html` and `appsscript.json` together,
replacing what is up there. `.clasp.json` is gitignored because the ID is yours.

**By hand:** in the editor use **+ → Script** for each `.gs` file, keeping the same
names (`Code`, `Settings`, `Sheet`, …), and **+ → HTML** for `index.html`. To see
`appsscript.json` you first have to turn on **Project Settings → Show "appsscript.json"**.

#### 3. Turn on the advanced services

In the editor, **Services (+)** → add all four, keeping the identifiers exactly as shown:

| Service | Identifier |
|---|---|
| Google Sheets API | `Sheets` |
| Google Drive API (v3) | `Drive` |
| Gmail API | `Gmail` |
| People API | `People` |

If you used `clasp push`, these come across from `appsscript.json` on their own — just
open the editor once and confirm.

#### 4. Authorize once

Pick the `authorizeOnce` function in the editor and press **Run**. Google asks for all
the permissions at once. If "Google hasn't verified this app" appears, choose
**Advanced → Go to Daily Work Report (unsafe)** — this is your own script.

The log should show your email address and whether a signature was found.

#### 5. Deploy as a web app

**Deploy → New deployment → Web app**

| Setting | Value |
|---|---|
| Execute as | **User accessing the web app** |
| Who has access | **Anyone with a Google Account** |

> **"Execute as" must be "User accessing".** If it is left as "Me", everyone's mail goes
> out from your Gmail and every edit in the sheet shows up under your name.

Share the URL you get with the team. Each person authorizes it themselves the first time.

#### 6. Settings inside the app

1. **Sheet settings** — the demo sheet's link, the tab, your own name
2. **Mail settings** — who it goes to (names appear as you type an address)
3. Fill in the numbers in the table and press **Save & send**

Everything in the table is editable — the row names, Sheet Name, the blank columns.
To get a row's default name back, clear the field.

### Changing the interface

The real UI code lives in `frontend/`. After changing it:

```bash
npm --prefix frontend run build:gas
```

That rebuilds `appsscript/index.html`. **Never edit that file by hand** — it is
generated. Then `clasp push` (or paste the new contents).

After every UI change you also have to go to **Deploy → Manage deployments → edit →
Version: New**, otherwise the old version keeps serving.

### What each file does

| File | Purpose |
|---|---|
| `Code.gs` | `doGet` — opens the web app; `authorizeOnce` |
| `Api.gs` | Everything the UI asks for (the target of `google.script.run`) |
| `Settings.gs` | Team and per-user settings, kept in Properties |
| `Sheet.gs` | Finding the tab, reading names, writing the cell, history |
| `Layout.gs` | Finding the name row and today's date column |
| `Comments.gs` | The real anchored comment (the Ctrl+Alt+M kind) |
| `Report.gs` | The numbers, the cell comment text, the subject |
| `MailBody.gs` | The coloured table in the mail |
| `Mail.gs` | Gmail signature and sending |
| `Contacts.gs` | Looking up recipients' names |
| `Trigger.gs` | Scheduling, through a time-based trigger |
| `index.html` | The UI (generated by `build:gas`) |

### When something goes wrong

**"Pick your name in the Sheet settings first."**
No name has been selected in Sheet settings. It has to match what is written in
column A of the sheet.

**`"<name>" was not found in column A of this tab.`**
The wrong tab is selected, or the name is spelled differently in the sheet.

**`No column for "22-November" in header row 1`**
The header row number is wrong, or the sheet has no column for that date.

**The comment is not appearing**
Both `Drive` and `Sheets` have to be on under advanced services. A comment hangs on a
protected range — never delete that range, or the comment detaches from the cell.

**A scheduled mail did not go out**
Open **Triggers** (the clock icon) and look at the error for that run. The trigger runs
as whoever created the schedule.

---

<a name="hinglish"></a>

## Hinglish

Yahi app, bina kisi server ke. Google Apps Script par chalta hai, isliye:

- **Koi API setup nahi** — na Cloud project, na OAuth client, na redirect URI
- **Settings aur login kabhi nahi mitte** — Google ke paas rehte hain, Render ki tarah har deploy par wipe nahi hote
- **Schedule sach me chalta hai** — Google ka time-based trigger, computer band ho to bhi mail jaata hai
- **Har aadmi apne account se** — sheet me edit uske naam par, mail uske apne Gmail se, uske apne signature ke saath

UI bilkul wahi hai jo web app me hai — wahi React code, ek HTML file me pack karke.

### Pehli baar setup

> Pehle **demo sheet** par test karna. Real tracker par baad me switch karna —
> sirf settings me sheet badalni hogi, script dobara nahi lagana padega.

#### 1. Script project banao

[script.google.com](https://script.google.com) → **New project** → naam do
`Daily Work Report`.

Ye script kisi sheet se bandha hua nahi hai (standalone). Kaunsi sheet par kaam
karna hai wo app ke andar settings me set hota hai.

#### 2. Files daalo

**Aasaan tarika — clasp se.** Ek command me saari files chadh jaati hain,
dobara kabhi paste nahi karna padta. Files pehle se haath se daal rakhi hon to
bhi ye paanch minute laga lena — aage ke update bhi isi se aayenge.

Pehle ek baar API on karo:
[script.google.com/home/usersettings](https://script.google.com/home/usersettings)
→ **Google Apps Script API: On**. Phir:

```bash
npm install -g @google/clasp
```

```bash
clasp login
```

`appsscript/` ke andar ek `.clasp.json` banao jisme tumhare script ka ID ho —
ID project ke URL me hota hai,
`script.google.com/home/projects/`**`<SCRIPT_ID>`**`/edit`:

```json
{ "scriptId": "PASTE_YOUR_SCRIPT_ID_HERE", "rootDir": "." }
```

Phir `appsscript/` me aakar:

```bash
clasp push --force
```

Isse saari `.gs`, `index.html` aur `appsscript.json` ek saath chadh jaati hain
aur upar wali purani files replace ho jaati hain. `.clasp.json` gitignore me hai
kyunki ID tumhara apna hai.

**Ya haath se:** editor me har `.gs` file ke liye **+ → Script** aur naam wahi
rakho (`Code`, `Settings`, `Sheet`, …), `index.html` ke liye **+ → HTML**.
`appsscript.json` dikhane ke liye **Project Settings → Show "appsscript.json"**
on karna padta hai.

#### 3. Advanced services on karo

Editor me **Services (+)** → ye chaaro add karo, identifier wahi rakhte hue:

| Service | Identifier |
|---|---|
| Google Sheets API | `Sheets` |
| Google Drive API (v3) | `Drive` |
| Gmail API | `Gmail` |
| People API | `People` |

`clasp push` kiya ho to ye `appsscript.json` se apne aap aa jaate hain — bas
editor me ek baar kholkar confirm kar lena.

#### 4. Ek baar authorize karo

Editor me function `authorizeOnce` chuno aur **Run** dabao. Google saari
permissions ek saath maangega. "Google hasn't verified this app" aaye to
**Advanced → Go to Daily Work Report (unsafe)** — ye tumhara hi script hai.

Log me apna email aur signature ka status dikhna chahiye.

#### 5. Web app deploy karo

**Deploy → New deployment → Web app**

| Setting | Value |
|---|---|
| Execute as | **User accessing the web app** |
| Who has access | **Anyone with a Google Account** |

> **"Execute as" zaroor "User accessing" rakhna.** "Me" rakh diya to sabke mail
> tumhare Gmail se jaayenge aur sheet me har edit tumhare naam par dikhega.

Jo URL milega wahi team ko dena hai. Har aadmi pehli baar khud authorize karega.

#### 6. App ke andar settings

1. **Sheet settings** — demo sheet ka link, tab, apna naam
2. **Mail settings** — kisko bhejna hai (naam type karte hi suggestions aayenge)
3. Table me numbers daalo aur **Save & send**

Table me ab sab kuch editable hai — row ke naam, Sheet Name, blank columns.
Row ka naam badal kar wapas default chahiye to use khaali kar do.

### UI badalni ho to

UI ka asli code `frontend/` me hai. Badal kar:

```bash
npm --prefix frontend run build:gas
```

Isse `appsscript/index.html` dobara ban jaati hai. **Us file ko haath se mat
edit karna** — wo generated hai. Phir `clasp push` (ya naya content paste).

Har UI change ke baad **Deploy → Manage deployments → edit → Version: New** karna
padta hai, warna purana version hi chalta rahega.

### Kaunsi file kya karti hai

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

### Atak jao to

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
