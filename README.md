# MS Dashboard: landing page

Single-page marketing site for **MS Dashboard by iSN**, a data dashboard for Mystery Shopping companies.
Next.js (App Router) · React 19 · Tailwind CSS v4 · React Three Fiber + drei · GSAP + ScrollTrigger · Framer Motion · Lenis.

## Run it

```bash
npm install
npm run dev        # http://localhost:3107
npm run build      # production build
npm run start      # serve the production build on :3107
npm run lint
npm run typecheck
```

Requires Node 20+. Fonts, the 3D font and all textures are self-hosted or generated in code. The only external requests are the iSN chatbot widget (see "Chatbot" below).

## Where things live

```
src/
  content/copy.ts            ALL marketing copy (edit wording here, in one place)
  app/
    page.tsx                 assembles the page: one component per section
    api/lead/route.ts        placeholder lead endpoint (see "Connect the form")
    globals.css              design tokens, glass, gradient borders, CTA, keyframes
  components/
    sections/                Hero, ValueProposition, Features, About, Contact, Footer
    features/                FeatureCard, TiltCard + visuals/ (the 10 animated card visuals)
    form/                    FloatingField, SuccessState
    three/                   every WebGL scene + shared shaders (see below)
    ui/                      Navbar, CursorGlow, ScrollProgress, RevealHeading, MagneticWrap, CtaButton, ...
    providers/SmoothScroll   Lenis, driven by GSAP's ticker
  hooks/                     useQuality (tiers, reduced motion, hover detection)
  lib/                       validation, submitLead, gsap setup, scroll helpers, quality tiers
public/fonts/                Space Grotesk (troika text) + generated typeface JSON for the 3D "25+"
scripts/build-typeface.mjs   regenerates the 3D numeral font:  npm run build:fonts
```

### The 3D scenes (`src/components/three`)

| Scene | Section | What it does |
| --- | --- | --- |
| `HeroScene` | Hero | Glass dashboard (bars, self-drawing line, donut, counting KPIs). Particles stream in from the screen edges and assemble onto it. Tilts and parallaxes with the mouse. |
| `ChaosScene` | Value proposition | One instanced draw call animates a pile of spreadsheets/reports (procedural texture atlas) that fly across, fold and dissolve into the clean dashboard. Driven by a single scroll-progress value. |
| `AboutScene` | About iSN | Extruded metallic "25+" in the brand font (counts 0 to 25 on entry) in front of a rotating network globe. |
| `FormScene` | Contact | Drifting particles and a ghosted 3D dashboard behind the form (30 fps, DPR 1). |

## Theme

Light "nude" palette: cream/sand surfaces, white glass cards, warm-brown text, one normal blue
(`#2f66d4`) for accents and a terracotta CTA. The CSS tokens live at the top of `src/app/globals.css`
(`--color-paper`, `--color-taupe`, `--color-blue`, ...). The 3D scenes take their colours from
`src/components/three/dashboardLayout.ts` (panels, donut), `DashboardModel.tsx` (bars, line, labels) and
`shaders.ts` (glass, particles), so a re-colour touches those four places plus the CSS.

## Performance and accessibility

- **Lazy 3D**: scenes are `next/dynamic` (client-only) and only mount a WebGL context when their section nears the viewport. three.js is not in the initial bundle. The render loop pauses when a scene is off-screen.
- **Quality tiers** (`src/lib/quality.ts`): `high` / `medium` / `low` (phones, data-saver, weak hardware: fewer particles, DPR 1) / `static`.
- **Adaptive resolution**: drei's `PerformanceMonitor` lowers the pixel ratio if the frame rate drops and restores it when it recovers.
- **`prefers-reduced-motion`**: Lenis is disabled, the pinned story becomes a normal stacked section, headings and cards show immediately, 3D renders still frames, looping visuals show their end state.
- **No WebGL?** Each scene falls back to a CSS illustration; the page still works.
- Semantic landmarks and heading order, skip link, real `<label>`s, `aria-invalid`/`aria-describedby` on the form, visible focus styles, decorative layers are `aria-hidden`.
- Fonts via `next/font/local` (preloaded, size-matched fallback) to avoid layout shift.

## Chatbot

The iSN chatbot is embedded on every page. It is the usual `<script src="https://chat.isngs.com/widget.js" data-client-key="pk_..." data-api-base="https://...">` snippet,
wired up once in `src/app/layout.tsx` through `src/components/ui/Chatbot.tsx`; the key and API URL live in `src/lib/chatbot.ts`.

- It loads with `strategy="lazyOnload"` (after the page is idle) because the widget is a ~1.5 MB bundle that ships its own React.
- The key (`pk_...`) is a *publishable* key and is meant to be public.
- **The chat server only answers allowed origins.** If the launcher does not appear and the console shows
  `CORS ... /widget/session` or `admission failed: NETWORK_ERROR`, add this site's origin to the allowed origins for that client key
  on the chatbot server: your production domain, plus `http://localhost:3107` for local testing.
- Optional attributes (add to `Chatbot.tsx`): `data-position="left"`, `data-mount="#selector"`, `data-debug="true"`.

## Lead form, "Schedule a Meet" and confirmation emails

Flow: the visitor fills the contact form and presses the submit button -> a **"Schedule a Meet"** pop-up opens
(`src/components/form/ScheduleModal.tsx`) with a date and time picker and a **"No, thanks, just email me"** button.
Nothing is sent until one of the two is chosen.

| Visitor chooses | Email sent through SendGrid |
| --- | --- |
| a date + time, "Book my meeting" | confirmation with the **meeting link**, the booked time in their time zone, and a calendar invite (`.ics`) attached |
| "No, thanks, just email me" | a normal confirmation email |

Code: the browser validates (`src/lib/validation.ts`) and posts to **`/api/lead`** (`src/app/api/lead/route.ts`), which re-validates,
builds the email (`src/lib/email/templates.ts`) and sends it with the SendGrid v3 API (`src/lib/email/sendgrid.ts`, plain `fetch`, no SDK).
Copy of the pop-up lives in `src/content/copy.ts`.

### Set it up

1. In SendGrid create an API key with **Mail Send** permission, and verify the sender address (or authenticate the domain) you will send from.
2. Copy `.env.example` to `.env.local` and fill in at least `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` (must be the verified sender). Restart the server.
3. Optional: `LEAD_NOTIFICATION_TO` also emails your team about every lead and booking.
4. The meeting link: leave `MEETING_URL` empty to give every booking its own private Jitsi Meet room, or set it to a fixed Google Meet / Teams / Zoom link.
   (`meet.jit.si` may ask the first person who joins to sign in; a fixed link of your own avoids that.)

Without the SendGrid variables: in development the emails are written to `.dev-outbox/` (open `latest-email.html`, `latest-email.txt` and the `.ics`)
so the whole flow can be tried locally; in production the endpoint answers 503 so a lead is never silently lost.

Safeguards in the endpoint: server-side validation of the lead and the slot (30 minutes to 90 days ahead), HTML-escaping of everything the visitor typed,
a hidden honeypot field, and rate limits (per IP and per address). The rate limiter is in-memory, fine for one server; use a shared store (Redis) if you run several.

The endpoint needs a Node server. On a static export (no server) it will not exist.

### Google Calendar and Google Meet (optional, recommended)

With Google credentials configured, a booking is created as a real **Google Calendar event with a Google Meet link** on your calendar
(`src/lib/google/calendar.ts`, plain `fetch` + `node:crypto`, no SDK):

1. the slot is checked against your calendar (free/busy); if it is taken the pop-up says "That time isn't available" and the visitor picks another time (HTTP 409);
2. the event is created with the visitor as an attendee and a Meet link requested; Google emails the visitor its own invite (`GOOGLE_SEND_UPDATES`, default `all`);
3. our SendGrid confirmation email carries the same Meet link (no `.ics`, Google's invite replaces it);
4. if the confirmation email then fails, the event is deleted again so no half-booking is left behind.

Without Google credentials the site falls back to the Jitsi / `MEETING_URL` link plus `.ics` described above. Visitors who choose "No, thanks, just email me" never touch Google.

**Option A, OAuth refresh token (any Google account, simplest)**

1. Google Cloud Console: create or pick a project, enable **Google Calendar API**.
2. OAuth consent screen: choose **Internal** (Google Workspace) or press **Publish app** ("In production"). A project left in "Testing" makes the refresh token expire after 7 days.
3. Credentials, Create credentials, OAuth client ID, application type **Desktop app**. Put the client id and secret in `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. Run `npm run google:auth`, sign in with the Google account whose calendar should receive the bookings and approve access. The script saves `GOOGLE_REFRESH_TOKEN` into `.env.local`.
5. Restart the server. Set `GOOGLE_CALENDAR_ID` if the bookings should go to a calendar other than the account's primary one.

**Option B, service account (Google Workspace only)**: create a service account, enable domain-wide delegation for the scope
`https://www.googleapis.com/auth/calendar.events` (and `calendar.freebusy`) in the Admin console, then set `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (keep the `\n` escapes on one line) and `GOOGLE_IMPERSONATE_USER` (the mailbox that owns the calendar).
A plain service account cannot create Meet links or invite people on its own, which is why the impersonation is required.

Other variables: `GOOGLE_EXTRA_ATTENDEES` (comma separated teammates added to every meeting), `MEETING_DURATION_MIN` (15 to 120, default 30). All are listed in `.env.example`.

### Which times can be picked

After choosing a date the visitor sees a grid of start times (every 30 minutes). Times that are **already booked** on your Google Calendar, or already past, are
**greyed out with a line through them and cannot be selected** (`src/components/form/SlotPicker.tsx`, data from `GET /api/availability`, which only returns free / busy,
never event details).

- Everything in the pop-up is in **Eastern Time** (`America/New_York`, so EST in winter and EDT in summer), whatever time zone the visitor is in: the date, the times
  and the confirmation email. The zone is the `BOOKING_TIME_ZONE` constant in `src/lib/time.ts`.
- Only your **working hours** are offered: `MEETING_HOURS` (default `09:00-18:00`, read as Eastern Time). Set it in `.env.local`.
- Free/busy comes from the same calendar the bookings go to (`GOOGLE_CALENDAR_ID`). Without Google credentials the grid still shows your working hours, with nothing greyed out for busy.
- The booking endpoint checks the slot again (working hours and free/busy), so a time that gets taken while the pop-up is open is rejected; the pop-up then refreshes the grid.
  Availability answers are cached for 15 seconds and dropped as soon as this server books or cancels something.

Known limits: weekends are offered like any other day (there is no day-of-week setting yet), and two visitors submitting the exact same free slot at the same moment
could both pass the free/busy check; the second one would still see the conflict the next time the calendar is read.

## Deploy on Render

`render.yaml` is a Render Blueprint: Dashboard, New +, **Blueprint**, pick this repo. Render asks for the secrets (SendGrid and Google values, see `.env.example`);
everything else is pre-filled. It builds with `npm ci --include=dev && npm run build` and starts with `npm start`, which listens on the `PORT` Render provides (on 3107 when run locally).
If you create the service by hand instead, use those same two commands. After the first deploy:

1. Google Cloud consent screen must be **Internal** or **In production**, otherwise the refresh token expires after 7 days.
2. Add the Render URL (and your custom domain) to the chatbot's allowed origins on the chat server.
3. Make one real booking and check both emails arrive.

The in-memory rate limiter and availability cache assume a single instance; keep it at 1 or move them to Redis.

## Notes

- Dev runs on port 3107 (change it in `package.json`). `npm start` uses the `PORT` environment variable when set (hosting platforms set it), otherwise 3107.
- three.js logs a `THREE.Clock` deprecation warning in dev; it comes from React Three Fiber internals and is harmless.
