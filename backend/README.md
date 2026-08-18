# backend

NestJS + Prisma 7 API for the Vanigar Ani Bearer Platform. See
`../specs/001-bearer-hierarchy-register/` (and 002, 003) for the specs, plans,
and task breakdowns this implements.

## Local database

This machine already runs two other PostgreSQL services (ports 5432 and 5433),
so local dev uses a **separate, dedicated Postgres instance** on port 5434
rather than touching either existing one.

**One-time setup** (already done on this machine — kept here for a fresh
machine or a teammate):

```bash
initdb -D ~/.local/pgdata/vanigarani -U vanigarani -A scram-sha-256 --pwfile=<file containing the password> -E UTF8
pg_ctl -D ~/.local/pgdata/vanigarani -o "-p 5434" -l ~/.local/pgdata/vanigarani.log start
createdb -h localhost -p 5434 -U vanigarani vanigarani
psql -h localhost -p 5434 -U vanigarani -d vanigarani -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

**Day to day**:

```bash
# start
pg_ctl -D ~/.local/pgdata/vanigarani -o "-p 5434" -l ~/.local/pgdata/vanigarani.log start
# stop
pg_ctl -D ~/.local/pgdata/vanigarani stop
```

`DATABASE_URL` in `.env` already points at this instance
(`postgresql://vanigarani:***@localhost:5434/vanigarani`). Copy `.env.example`
to `.env` and fill in the password (not committed) if setting this up fresh.

## First Super Admin

No bearer can self-register (Constitution Principle V). On a fresh database,
create the first Super Admin with:

```bash
npm run bootstrap:super-admin -- "Full Name" "+91XXXXXXXXXX" "admin@example.com"
```

Every other bearer is created from inside the app by an admin from then on.

## Razorpay test-mode setup (feature 002)

`PAYMENT_PROVIDER=mock` (the `.env.example` default) keeps Order creation and
webhook signature verification fully testable with no external account —
`MockPaymentProvider` fabricates an order id and `webhook-signature.guard.ts`
verifies against whatever `RAZORPAY_WEBHOOK_SECRET` you set locally, the same
HMAC check it would run against a real Razorpay-signed payload. This is
enough for all automated tests and for developing the events/contributions
flow end-to-end without touching Razorpay at all.

To exercise a **real** payment (an actual UPI/card checkout), you need a
Razorpay account:

1. Sign up at <https://dashboard.razorpay.com> (test mode is available
   immediately, no business verification needed to start).
2. **Settings → API Keys** → generate a test-mode key pair → set
   `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `.env`.
3. **Settings → Webhooks** → add an endpoint pointing at
   `POST /webhooks/razorpay` on this backend (use a tunnel like `ngrok` for
   local dev, since Razorpay's servers need to reach it) → copy the generated
   secret into `RAZORPAY_WEBHOOK_SECRET`.
4. Set `PAYMENT_PROVIDER=razorpay` in `.env`.

Neither of us (agent or you) can create that account from here — it needs a
human with an email/phone to complete Razorpay's own signup.

## News module (feature 003)

The mock push/SMS providers in `src/common/notifications/` (bound
unconditionally in `notifications.module.ts` — there's no env toggle for
these yet, unlike `EMAIL_PROVIDER`/`PAYMENT_PROVIDER` above) are enough to
develop and test the whole publish → fan-out → feed loop locally; they just
log what they would have sent. Publishing a post (`POST /news/:id/publish`)
fires `FanoutJob.run()` without awaiting it (FR-010), so the API responds
immediately even for a statewide "everyone" audience — watch the server log
for `[NotificationService]` lines to confirm delivery attempts. Swapping in a
real FCM/SMS vendor means implementing `PushProvider`/`MessageProvider` and
changing the `useClass` in `notifications.module.ts`, the same shape of
change as `EMAIL_PROVIDER`/`PAYMENT_PROVIDER`, just not env-driven yet.

## Commands

```bash
npm run start:dev       # NestJS in watch mode
npm run build            # tsc + nest build
npm run lint              # eslint
npm run format             # prettier --write
npm run prisma:generate   # regenerate the Prisma client after a schema change
npm run prisma:migrate    # create + apply a new migration
npm run prisma:seed       # load sample jurisdiction data (see prisma/seed-data/)
npm run bootstrap:super-admin -- "Name" "+91..." "email@example.com"  # create the first Super Admin
npm test                  # jest
```

## Structure

See `../specs/001-bearer-hierarchy-register/plan.md` Project Structure for the
intended module layout (`src/modules/posts`, `jurisdictions`, `bearers`,
`assignments`, `auth`, `src/common/guards`).
