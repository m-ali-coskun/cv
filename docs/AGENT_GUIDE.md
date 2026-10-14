# designTab — Contributor guide (read fully before writing code)

designTab is a **fully client-side** web app (Vite + React 19 + TypeScript + Tailwind v4 +
`motion` + zustand) where freelance designers and clients **match**, exchange **briefs**
(deadline, style guide, assets), track **jobs** through a status pipeline, **chat**, request
**revisions**, and handle **payments**. The signed-in user is **Ali**, who can switch between a
**Client workspace** ("Northlight Studio") and a **Designer studio** (Ali as a freelancer).
Counterparts are simulated bots (`src/store/simulation.ts`) so every flow really works.

It will be shown on a CV, so the bar is: *looks like a top-tier Dribbble shot, and every button
works*. UI reference: a light-grey dashboard with big white rounded cards, black capsule CTAs,
lime accent pills, a black "AI" card, a semicircle tick gauge, monospaced IDs/dates — upgraded with
**Apple liquid-glass**, **exaggerated (but smooth) motion**, and **per-discipline colour themes**.

## Hard rules

1. **Only edit the files/directories you own** (given in your task). You may create new files inside
   your owned directories. Shared files you may touch *additively only* with the Edit tool (never
   rewrite them wholesale, never reformat): `src/store/index.ts` (add an action if truly needed),
   `src/store/selectors.ts` (add a hook). Do NOT edit `src/components/ui/*`, `src/components/layout/*`,
   `src/styles/index.css`, `src/i18n/index.tsx`, `src/i18n/locales/core.ts`, `src/App.tsx` unless your
   task explicitly owns them. If you need a missing primitive, build it inside your feature dir.
2. **Do not install npm packages. Do not run git commands that change state** (no commit/checkout/stash/reset).
3. Other agents are editing other files **at the same time**. `npx tsc --noEmit -p .` may show errors in
   files you don't own — ignore those, but **your files must have zero TS errors**. Never "fix" other
   people's files.
4. **Language**: English is the base. All UI chrome (headings, labels, buttons, empty states, tooltips,
   statuses, placeholders) goes through `t()` with **en + de + tr** entries in your namespace file
   `src/i18n/locales/<ns>.ts`. User/seed content (names, bios, briefs, chat messages, bot replies, job
   titles) stays **English only** and is never translated.
5. **zustand v5 pitfall**: a selector must return a stable reference. ❌ `useApp(s => s.jobs.filter(...))`
   (infinite render loop). ✅ select raw slices (`useApp(s => s.jobs)`) then `useMemo`, or use the hooks
   in `src/store/selectors.ts`, or `useShallow` from `zustand/react/shallow`.
6. Must work at **360px wide** (phones) up to 1680px. No horizontal page scroll. Use responsive grids;
   tables become cards on mobile. Bottom 7rem on mobile is covered by the floating tab bar (the shell
   already pads `main` for it).
7. Respect `settings.motion` implicitly: the shell wraps the app in `<MotionConfig reducedMotion>`;
   don't hand-roll JS animation loops that ignore it.

## Where things are

```
src/store/types.ts        domain model (Designer, Client, Job, Message, …) + ME_CLIENT_ID / ME_DESIGNER_ID
src/store/index.ts        useApp store: data + ALL actions (read the AppActions interface!)
src/store/selectors.ts    useMe, useRole, useMyJobs, useAttentionJobs, jobRisk, useConversations,
                          useMyMatches, useMyNotifications, useJob, useDesigner, useClient, usePerson, matchScore
src/store/simulation.ts   bot behaviour (replies, accepts, approvals, likes back, incoming requests)
src/store/ui.ts           useUI: paletteOpen, notificationsOpen, welcomeOpen, celebration (Match), typing{convId}
src/store/toasts.ts       toast({ title, description, tone, avatarSeed, link, action })
src/i18n/index.tsx        useT() → t('ns.key', vars) ; useLang() ; LANGUAGES
src/theme/disciplines.ts  DISCIPLINES (accent/ink/deep/glow per discipline), disciplineTheme(id)
src/theme/ThemeProvider   useIsDark(), useActiveTheme()
src/lib/                  cn, motion presets (spring, item, stagger, popIn, EASE_OUT…), dates (timeAgo,
                          dueLabel, shortDate, chatTime, fromNow, daysUntil, greetingKey), format
                          (formatMoney, formatBytes, formatDuration), files (saveFile, fileToAsset,
                          linkAsset, kindFromMime, mediaIsImage/Video), useMediaUrl, random (prng), ids (uid)
src/components/ui/        Glass(+CardHeader), Button, IconButton, Pill, StatusBadge, PriorityBadge,
                          RiskBadge, DisciplineIcon, DisciplineBadge, CountBadge, Kbd, Avatar, AvatarStack,
                          AnimatedCounter, Modal, Drawer, Segmented, Toggle, Field/Label/Input/Textarea/
                          Select/Chip, ProgressBar, ProgressRing, Menu, Tooltip, EmptyState, Dropzone
                          (+ whatever the kit agent adds: FolderCard, Gauge, charts, DatePicker, …)
src/components/art/       GenerativeArt (offline artwork from a seed), MediaView (renders any MediaRef)
src/features/<x>/         pages (default export) — routes are already wired in src/App.tsx
```

Routes: `/overview /discover /network /network/:id /jobs /jobs/:id /requests /brief/new(?designer=ID)
/messages /messages/:id /profile(?add=1) /join /calendar /files /payments /analytics /settings`.
The shell (sidebar, top bar with page title/greeting, discipline tabs, mobile tab bar, toasts) is
already rendered around your page — **don't render another page title h1**; start with content.

## Roles & data

- `settings.role` is `'client' | 'designer'`. Every page must work in **both** roles (or show a
  sensible role-specific variant). Client = Ali hires designers (jobs where `clientId === ME_CLIENT_ID`),
  Designer = Ali is hired (jobs where `designerId === ME_DESIGNER_ID`). Use `useMyJobs()` etc.
- `settings.discipline` is the active discipline tab (`'all' | DisciplineId`). **Filter your lists by it**
  (jobs via `useMyJobs`, designers via `d.disciplines.includes`, clients via `disciplinesNeeded`).
- Media: `MediaRef` can be generated art, an uploaded file (IndexedDB) or a URL → render with
  `<MediaView media={...} />`. Uploads: `fileToAsset(file, meId)` / `saveFile(file)`.
- Avatars: `<Avatar seed={person.avatarSeed} media={designer.avatar} />`; clients look nicer as
  `<Avatar kind="brand" name={client.name} color={client.logoColor} seed={client.avatarSeed} />`.
- Money: `formatMoney(amount, currency, lang)`. Dates: helpers in `src/lib/dates.ts` (pass `lang`).

## Visual language

- Surfaces: `<Glass>` (default variant `card` = white glass card, radius 28px), `variant="night"` for the
  black AI-style card, `"accent"` for lime/accent glass, `"tile"` for inner grey tiles (`bg-surface-2`,
  radius 16px). Add `spotlight` (cursor light) and `tilt` on hero/feature cards, `interactive` for lift.
- Colour tokens as Tailwind classes: `bg-accent text-accent-ink bg-accent-soft text-accent-text
  text-ink text-ink-2 text-ink-3 bg-surface bg-surface-2 border-line bg-night text-on-night
  bg-danger bg-warning-soft …` — never hard-code the accent; it changes with the discipline tab.
  Discipline-specific chips may use `disciplineTheme(id).accent` explicitly.
- Type: Geist (sans) / Geist Mono for IDs, dates, numbers (`font-mono`). Headings `font-medium
  tracking-[-0.02em]`. Big numbers use `<AnimatedCounter>`.
- Buttons: black capsule `Button` (primary), `variant="accent"` lime glass, `glass`, `ghost`, `soft`.
- Motion (Apple / Emil Kowalski): ease-out curves, springs for interactive things, press scale .96,
  entrances = fade + rise + de-blur (`variants={item}` inside `variants={stagger()}` with
  `initial="hidden" animate="show"`), `layoutId` sliding pills, `AnimatePresence` for lists/modals,
  hover lift/tilt, number rolls. Make it feel **alive and generous** — the user explicitly asked for
  exaggerated animations everywhere — but never janky: animate transform/opacity/filter only.
- Dense, information-rich layouts (the user wants "dolu dolu" — full, overflowing with features).
  Empty states must be illustrated (`EmptyState`) and actionable.

## Definition of done (for your area)

- Every control does something real via store actions (persisted in localStorage).
- en/de/tr strings for all chrome. No raw i18n keys or "humanised key" fallbacks visible.
- Zero TS errors in your files (`npx tsc --noEmit -p . 2>&1 | grep <your path>`), zero console errors.
- Verify visually: the dev server is running at http://localhost:5173 (do NOT start another one; if it
  is down, start it with `npx vite --port 5173 --strictPort &`). Screenshot with
  `node scripts/shot.mjs <outDir> /route1 /route2` — env: `VIEWPORT=mobile`, `ROLE=designer`,
  `THEME=dark`, `LANG_UI=de|tr`, `DISC=video`, `FULL=1` (full page), `WAIT=ms`. Write screenshots under
  `.qa/<your-area>/` and LOOK at them (Read the PNG). Check desktop + mobile, light + dark, client +
  designer, and one non-English language. For interaction tests, write a small Playwright script in
  `.qa/<your-area>/` (copy the launch code from scripts/shot.mjs; `window.__designTab` exposes the store).
- Final answer: a concise list of files created/changed, features implemented, and anything you could
  not finish.
