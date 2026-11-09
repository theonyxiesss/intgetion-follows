# intgetion-follows

Company follows of the INTGETION platform as a standalone service: follow and unfollow a company by its slug (at most 50), follower counts, and the daily alert with the company's newly published jobs (D239, D240). Not connected to the platform yet; it is integrated later through a separate branch and PR. The buttons stay in the platform.

- Package `@intgetion/follows`, HTTP service on port `4170`.
- Depends by git tag on `@intgetion/kit` v0.3.1 and, for types, on jobs v0.1.2, feedback v0.1.0 and notifications v0.1.1.
- Owns `company_follows` (migration `0001_follows.sql`, the final state of platform migration 0026, with the `app_rw` grant).
- Reads only, outside its table: `users` (status, locale) and `companies` (name, slug).

## Alerts

The alert slot is claimed in the same transaction as the notice: a second
run within 20 hours sends nothing, and a failed notice gives the slot back.
In-process the platform wires `deliver` to notifications'
`deliverInTransaction(tx, …)`; over HTTP it is notifications `POST /v1/deliver`.

## Ports (`src/ports.ts`)

Types are the owners' own signatures: jobs (`getVisibleCompany`, `listPublishedJobsForCompany`), feedback (`getHiddenSetsForViewer`), notifications (`deliver`). Over HTTP, jobs and hidden jobs go to the platform callback `POST /api/internal/follows/:op` with `{args}`.

## HTTP

Every route except `/health` needs `authorization: Bearer $FOLLOWS_SERVICE_TOKEN`; the person comes in `x-user-id`.

| Method | Path | Does |
| --- | --- | --- |
| POST / DELETE | `/v1/companies/:slug/follow` | follow, unfollow |
| GET | `/v1/me/follows` | followed companies |
| GET | `/v1/companies/:id/followers` | follower count |
| GET | `/v1/companies/:id/following` | whether the person follows it |
| POST | `/v1/tasks/company-alerts` | cron: daily alerts |

## Run

```bash
cp .env.example .env
npm ci
npm run migrate
npm start
```

## Tests

Unit tests run without a database. Integration tests run when `DATABASE_URL`
is set, on a database prepared as in CI: `test/sql/pre/*.sql`, then
`npm run migrate`. Jobs, hidden jobs and delivery are stand-ins
(`src/test-support.ts`); a delivered notice records whether it came inside
the claim's transaction.
