# Department Balanced Scorecard System

Production-oriented internal/LAN Balanced Scorecard application built with Next.js App Router, Auth.js credentials auth, Prisma 7, PostgreSQL, Tailwind CSS, and shadcn/Base UI components.

## Requirements

- Node.js 24+
- PostgreSQL 16+
- npm

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `AUTH_SECRET`, `SEED_ADMIN_USERNAME`, and `SEED_ADMIN_PASSWORD`.
3. Install dependencies:

```bash
npm ci
```

4. Generate Prisma Client and apply migrations:

```bash
npm run db:generate
npx prisma migrate deploy
```

5. Seed the initial admin account:

```bash
npm run db:seed
```

6. Start the application:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Docker / LAN

Update secrets and passwords in `docker-compose.yml`, then run:

```bash
docker compose up --build
```

After the web container starts, seed the admin user once:

```bash
docker compose exec web npm run db:seed
```

Open `http://localhost:3000` from the host. For LAN access, expose port `3000` on the host machine or place a reverse proxy in front of the app.

## Validation Commands

```bash
npx prisma validate
npm run db:generate
npm run test:bsc
npx tsc --noEmit
npm run lint
npm run build
npm run verify:auth
```

## First End-to-End BSC Test

1. Sign in as the seeded admin.
2. Open `Administration > Departments` and confirm at least one active department exists.
3. Open `Scorecards` and create a scorecard for a department and fiscal year.
4. Open the scorecard and add perspectives totaling 100%.
5. Under each perspective, add objectives totaling 100%.
6. Under each objective, add activities totaling 100%, with unit, annual target, and baseline.
7. Click `Validate scorecard`; incomplete levels or totals other than 100% should be rejected.
8. Open `Plans & Actuals`, select the scorecard, and click `Initialize plans`.
9. Confirm the generated monthly plans are present and adjust one value as admin.
10. Sign in as a department user and confirm plans are read-only while actuals can be entered for the user department.
11. Enter actual values, save, refresh, and confirm the persisted values remain.
12. Open `Dashboard` and `Consolidated Reports` and confirm performance uses the saved plan/actual data.

## Notes

- Fiscal year runs July through June.
- Fiscal month indexes are July `0` through June `11`.
- Server actions authenticate and authorize every mutation.
- Client components receive serializable DTOs and do not import Prisma or server-only services.

SIMPLIFIED

npm ci
npm run db:generate
npx prisma migrate deploy
npm run db:seed
npm run dev
