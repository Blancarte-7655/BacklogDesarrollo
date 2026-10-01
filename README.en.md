# UniAccess · CUTlaquepaque

> Check-in / check-out for the Tlaquepaque University Center campus **from each person's own phone**, with no card readers or turnstiles.

![Node.js](https://img.shields.io/badge/Node.js-22.13%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

🇲🇽 [Versión en español](README.md)

Course project for **Integration Seminar: Development** · 7th semester, Computer Engineering.

---

## The problem

The campus needs to know **who is inside** and keep a history of entries and exits for students, faculty, staff and guests, but it has **no hardware** (card readers or turnstiles) at its gates.

**Our solution:** each person's phone acts as their ID. Identity is confirmed with the **phone's own fingerprint or face unlock** (WebAuthn) and, optionally, a **geofence** that checks the person is actually at the gate.

Full scope, user stories (MoSCoW) and business rules (in Spanish): **[docs/ALCANCE.md](docs/ALCANCE.md)**.

---

## Features

Two separate portals, each with its own session:

| Portal | Path | Who | How |
| --- | --- | --- | --- |
| Access portal | `/acceso` | Students, faculty, staff | Student ID or institutional email + password, on their phone |
| Institutional portal | `/control` | Security guards and admins | Pre-registered institutional email + password |

- **Check-in and check-out** as separate actions, confirmed with device biometrics.
- **Optional geofence** per gate.
- Denied attempts (expired or revoked ID, role not allowed, outside the area) **alert security**.
- Check-out without check-in is recorded as an **incident**; duplicate check-outs are rejected.
- **Live dashboard** of who is on campus, **guest passes**, **manual fallback check-in**, alerts, history with CSV export, and administration of people, gates and operators.

---

## Quick start

**Requirements:** [Node.js 22.13+](https://nodejs.org/) (built-in SQLite, no database to install).

```bash
git clone https://github.com/DannNS20/BacklogDesarrollo.git
cd BacklogDesarrollo
npm install
cp .env.example .env        # Windows (PowerShell): Copy-Item .env.example .env
# Edit .env: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD
npm run dev
```

- Portals: http://localhost:5190
- API: http://localhost:4590

On first run the server creates the **initial admin** from `.env` and three sample gates.

### Try the demo

1. Set `REQUIRE_BIOMETRIC=false` in `.env` to check in from a computer without biometrics.
2. Go to http://localhost:5190/control and sign in as the admin.
3. Under **Personas**, create a student (6–10 digit ID, email ending in `udg.mx`). Copy the generated password, which is **shown only once**.
4. Go to http://localhost:5190/acceso, sign in as that student and check in.
5. Watch the record appear on the live dashboard.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router |
| API | Node.js, Express 5, Zod |
| Database | Built-in SQLite (`node:sqlite`), standard SQL schema |
| Biometrics | WebAuthn / passkeys via `@simplewebauthn`, verified server-side |
| Email | Nodemailer (SMTP) |

---

## Known limitations

- Traffic reports (user story 10) are out of scope for this cycle.
- Location is reported by the phone and can be spoofed; the geofence is a deterrent, not a guarantee.
- Rate limiting and WebAuthn challenges are in memory (reset on restart, single instance only).
- No automated tests yet.

---

## Production

```bash
npm run build
npm start
```

HTTPS is required for biometrics and geolocation. Set `APP_ORIGIN` to the exact public URL and back up `server/data/`.

---

## Contributing

Fork → branch per change (`feat/…`, `fix/…`, `docs/…`) → [Conventional Commits](https://www.conventionalcommits.org/) → run `npm run typecheck` and `npm run lint` → open a Pull Request to `main`. Every PR needs at least one review from a teammate.

---

## License

MIT. See [LICENSE](LICENSE).