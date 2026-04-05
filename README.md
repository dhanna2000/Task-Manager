# Task-Manager

Discord **quest board** bot for a private Minecraft server with friends (native buttons, embeds, modals — not a corporate task tracker). There is **one** slash command (`/setup-quests`) for admins; everyone else uses **buttons**, **embeds**, and a **modal** so it feels native to Discord — like a cozy **quest board**, not a corporate chore list.

- Every **quest** is **assigned** to someone (no “open” quests).
- Statuses: **Not Started**, **Working On It**, **Completed** — each card shows a tiny emoji **progress bar** next to the status line.
- Data is stored in a local **JSON** file so you don’t need a database server.

---

## One Quest Board per server (guild)

The bot stores **at most one active Quest Board per Discord server**:

- `data/quests.json` keeps a single entry per **guild ID**: which **channel** holds the board and the **message ID** of the board post.
- Running **`/setup-quests`** in a channel **refreshes** the board **if it’s already in that same channel** (same message updated).
- Running **`/setup-quests`** in a **different** channel makes **that** channel the new board; the bot updates storage to point there. (The old board message may still sit in chat, but **Create Quest** only works in the **current** board channel.)

There is **no** multi-board or per-user board in this MVP — intentionally simple.

---

## What the bot does

1. An admin runs **`/setup-quests`** in the channel that should be the **Quest Board**.
2. The bot posts a welcome embed with a **Create Quest** button.
3. Anyone clicks **Create Quest** → picks an adventurer from Discord’s **user menu** (ephemeral) → fills the **modal** (title, notes, category) → a **quest card** appears in the channel.
4. The **assigned** player uses **Start Quest** / **Reset**; **Complete Quest** works for the assignee **or** the creator — **including jumping straight from Not Started to Completed** if you want (no forced middle step).
5. **Completed** quests stay visible; buttons are turned off so the card looks “closed.”

---

## Install

Requires **Node.js 18+**.

```bash
cd path/to/this-project
npm install
```

**Windows / Cursor terminal — `npm` not recognized:** Install [Node.js LTS](https://nodejs.org) with **Add to PATH**, then **fully quit and reopen Cursor**. Or run the helper (refreshes PATH and checks common install folders):

```powershell
cd path/to/this-project
powershell -ExecutionPolicy Bypass -File .\run-bot.ps1
```

**Do not paste bot log lines into PowerShell** (e.g. `Slash commands registered…` or `Logged in as…`) — those are **output** from the bot, not commands. Only run `npm` commands or `run-bot.ps1`.

Copy `.env.example` to `.env` and fill in the values (see below).

---

## Environment variables (`.env`)

| Variable | What it is |
|----------|------------|
| `DISCORD_TOKEN` | Bot token (Discord Developer Portal → your app → **Bot** → reset / copy token). |
| `DISCORD_CLIENT_ID` | Application ID (**General Information**). |
| `DISCORD_GUILD_ID` | Your server ID (enable Developer Mode → right‑click server → **Copy Server ID**). Used to register slash commands to **one guild** quickly. |

Never commit `.env` or share your bot token.

---

## Discord app, bot user, and invite

### Create the application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Add Bot**, then **Reset Token** and copy it into `DISCORD_TOKEN`.

### Required: Server Members Intent

Under **Bot** → **Privileged Gateway Intents**, you **must** turn on:

- **Server Members Intent**

**Why:** The **user select menu** and assignee checks use `guild.members` / resolves members who may not be cached yet. Without this intent, picking or validating someone can fail incorrectly.

This bot also uses the **Guilds** intent (standard for guild-based bots).

### Invite link

Use an invite that includes **`bot`** and **`applications.commands`** scopes.

Minimum suggested **bot permissions**:

- View Channel  
- Send Messages  
- Embed Links  
- Read Message History  

Example permission value (decimal): **84992**

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=84992&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with `DISCORD_CLIENT_ID`.

---

## Register slash commands

```bash
npm run deploy-commands
```

Registers commands for **one guild** (`DISCORD_GUILD_ID`). Run again if you change the command definition.

---

## Run the bot locally

```bash
npm start
```

You should see `Logged in as YourBot#1234` in the terminal.

---

## Git & GitHub

`.env` and `data/quests.json` are listed in **`.gitignore`** — do not commit secrets or local quest data.

Create an **empty** repo on GitHub (no README/license there if you want a clean first push), then from the project folder:

```bash
git init
git add .
git status
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/dhanna2000/Task-Manager.git
git push -u origin main
```

Before `git commit`, check **`git status`**: you should **not** see `.env`. If it appears, stop and fix `.gitignore`.

**HTTPS push:** GitHub will ask for credentials — use a [Personal Access Token](https://github.com/settings/tokens) as the password (not your GitHub account password).

**Optional (PowerShell):** same flow with a safety check:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-github.ps1
```

Change the `origin` URL if you use a different user/repo or SSH (`git@github.com:USER/REPO.git`).

---

## Using `/setup-quests`

- Run **`/setup-quests`** in the channel you want as the **Quest Board**.
- Same channel again → board message is **refreshed** in place.
- New channel → that channel becomes the **only** active board for the server (see **One Quest Board per server** above).

---

## Normal user flow (no slash commands)

1. Open the Quest Board channel.
2. Click **Create Quest**.
3. In the **ephemeral** prompt, open the **user select** menu and choose **who the quest is for** (placeholder: *Choose an adventurer for this quest*).
4. Fill the **modal**: quest title (required), notes and category (optional).
5. A **quest embed** appears with **Start Quest**, **Complete Quest**, and **Reset** (Reset only while **Working On It**).
6. **Start** → only the **assigned** user; status and bar update.
7. **Complete** → assignee **or** creator; card goes green, buttons lock.
8. **Reset** → assignee or creator, only from **Working On It**, back to **Not Started**.

If you wait too long between picking someone and submitting the modal (~15 minutes), start over with **Create Quest**. Errors are **ephemeral** so the channel stays tidy.

---

## Statuses and progress bar

Each quest card shows:

1. A **status line** (emoji + label).
2. A **three-block bar** on the next line — same stage as the status, easy to skim.

| Stage | Status line | Bar (3 blocks) |
|-------|-------------|----------------|
| Fresh on the board | 🪵 Not Started | `🟫⬜⬜` |
| In progress | ⚒️ Working On It | `🟫🟨⬜` |
| Done | 🏆 Completed | `🟫🟨🟩` |

Embed **color** shifts with stage: warm neutral → sunny active → friendly green.

The bar is **derived from** the same stored status as the text — they always match.

---

## Completed quests & restarts

When a quest is **Completed**, the bot **edits** the Discord message to attach **disabled** buttons. Discord **stores** that message state, so after you **restart the bot**, the card usually **stays** visually locked with no extra work.

If an edit ever failed (permissions, network), a stray click on an old button will **re-sync** that card (embed + locked buttons) using data from `data/quests.json`, then reply with a gentle ephemeral — so storage remains the source of truth.

---

## Assignment rules

- Every quest **must** have an assignee at creation time.
- **Start Quest**: only the **assigned** user.
- **Complete Quest**: assignee **or** creator (allowed from **Not Started** or **Working On It**).
- **Reset**: assignee or creator, only from **Working On It** (not after **Completed**).

---

## Storage

Data lives in **`data/quests.json`**.

- **Why JSON:** no native addons, easy backups, trivial to inspect.
- Persisted fields include quest id, title, description, category, creator/assignee IDs, status, message/channel IDs, timestamps — so **button custom IDs** still match after a restart.

---

## How to expand it later (ideas)

- Extra board buttons (categories, filters) without spamming slash commands.
- Optional “quest done” shout in-channel (still no web UI).
- Multiple boards (change the `boards` shape in storage).

---

## Quick test checklist

1. `npm install` → fill `.env` → `npm run deploy-commands` → `npm start`
2. Invite bot with scopes + permissions; enable **Server Members Intent**.
3. `/setup-quests` in your quest channel
4. **Create Quest** → pick yourself in the user menu → submit the modal
5. **Complete** without **Start** (optional) → buttons should disable
6. Restart the bot → card should still show **Completed** with grayed-out buttons; clicking **Complete** again → ephemeral “already done”

---

## First file to read

**`src/index.js`** — wires Discord to setup, buttons, and modals. Then **`src/utils/embeds.js`** for how cards look.
