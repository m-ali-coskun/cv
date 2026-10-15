# designTab

**Freelance designers and clients in one workspace: match, brief, build, deliver.**

designTab is a collaboration hub where clients **match** with freelance designers (and designers with clients), send **rich briefs** (deadline, design language, assets), track every **job** through a status pipeline, **chat**, request **revisions** on pinned annotations, and release **payments**. You can explore it from both sides: switch between a **Client workspace** and a **Designer studio** at any time.

It is a fully client-side React app. Simulated counterparts type, reply, accept briefs, ask for changes, approve work and like you back, so every flow can be tried end-to-end in the browser with no backend.

## Highlights

- **Discipline themes.** The tabs *Visual design · Video editing · Motion · Illustration · Brand & print · UI/UX · 3D* filter the whole app and re-theme it live in creative-app colours (Photoshop blue, Premiere violet, After Effects purple, Illustrator orange, InDesign pink, XD magenta, Substance teal). The theme colours are animated CSS custom properties. Fixed themes can be chosen in *Settings → Color themes*.
- **Liquid glass UI.** Frosted, specular surfaces, cursor spotlights, 3D tilt, an animated aurora background, rolling odometer counters, a rareui-style folder component, and spring and blur-in motion everywhere. Motion has three levels: *Expressive / Subtle / Off*.
- **Matching.** Tinder-style swipe deck with super likes and undo, a grid view, and a **"New designers" lane** showing newcomers' bios and past work. Mutual likes trigger a match celebration with confetti.
- **Designer sign-up** (`/join`). New designers add their bio and portfolio, publish, and appear immediately in clients' Discover lane.
- **Briefs.** A 6-step wizard with templates, AI-style description writer, deliverables builder, palette editor (including *extract colours from an image*), fonts, mood, references, asset uploads (IndexedDB), and a brief-quality gauge.
- **Jobs.** Kanban board (drag & drop) with list and timeline views, and a requests inbox (accept / decline / counter-offer a deadline). The job page has a live countdown, status journey, time tracker, versioned deliveries with **pin annotations** and a before/after compare, revision checklists, style guide, assets, and milestones.
- **Messages.** Rich cards for briefs, deliveries, revisions and approvals, plus reactions, replies, edits, read receipts, typing indicators, voice notes, attachments, and drafts per thread.
- **Calendar, Files, Payments/Earnings, Reports, Notifications**, a **⌘K command palette**, a first-visit **welcome tour**, light/dark mode, **English (default), Deutsch, Türkçe**, and a mobile layout with a floating tab bar.
- **Persistence.** Everything is stored in `localStorage` (data) and IndexedDB (uploads). Demo dates shift forward automatically when you come back later. *Settings → Data* can reset, export or import the demo.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Motion · Zustand · dnd-kit · date-fns · DiceBear (offline avatars) · canvas-confetti. Portfolio artwork is generated procedurally (SVG), so the app needs no network images.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (works from any sub-path)
```

Useful routes: `#/overview`, `#/discover`, `#/jobs`, `#/brief/new`, `#/messages`, `#/join`, `#/settings`, and `#/kit` (component gallery).

## Deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to **GitHub Pages**. To turn it on, enable *Settings → Pages → Source: GitHub Actions* in the repository. The app uses hash routing, so no server rewrites are needed.

## Project layout

```
src/store/        domain model, actions, simulation (bot counterparts), seed data
src/components/   liquid-glass UI kit, charts, generative art, app shell
src/features/     overview, discover, network, jobs, brief, messages, profile,
                  calendar, files, payments, analytics, settings
src/i18n/         EN / DE / TR dictionaries (UI chrome only; content stays English)
```

---

Designed & built by Ali.
