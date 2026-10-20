# Deploy runbook

One long-lived branch per environment, promoted with pull requests: `dev` -> `staging` -> `main`.

## Environment matrix

| Branch | Env | Trigger | Database | Backend URL | Frontend (Vercel) | Mobile (EAS channel) |
|---|---|---|---|---|---|---|
| `dev` | `dev` | push (merged PR) | own empty Postgres | https://backend-dev-2110.up.railway.app | branch preview (placeholder `https://mi-casa-dev.vercel.app`) | none |
| `staging` | `staging` | push (PR `dev` -> `staging`) | own empty Postgres | https://backend-staging-494d.up.railway.app | branch preview (placeholder `https://mi-casa-staging.vercel.app`) | none |
| `main` | `production` | push (PR `staging` -> `main`), **manual approval** | production Postgres | https://backend-production-0d37.up.railway.app | production Vercel project | `preview` (EAS Update, from `main`) |

Each Railway environment has its own `JWT_SECRET` (96 hex chars, never shared), `SEED=false`, `NODE_ENV=production`
and no email credentials (`RESEND_API_KEY` / `SMTP_*` are absent, so email is skipped). `FRONTEND_URL` for
`dev`/`staging` is a placeholder: set it to the real Vercel URL (CORS only allows that origin).

## Release flow

1. **Work on a feature branch and open a PR into `dev`.** All three long-lived branches are protected by the
   `Protect branches` ruleset: PR required, the `backend`, `frontend` and `mobile` CI checks must pass, no force
   pushes, no deletion. Nobody pushes to them directly.
2. **Merge into `dev`.** The pipeline runs CI, deploys the backend to Railway `dev`, waits until it is healthy and
   smoke-tests it. This is where the work is exercised first.
3. **Promote to `staging`.** Open a PR `dev` -> `staging`. Merging it deploys Railway `staging` (the first
   production-like deploy: `NODE_ENV=production`, own database, migrations run from scratch-compatible state).
4. **Promote to production.** Only when staging is healthy, open a PR `staging` -> `main`. Merging it starts the
   `production` deploy, which waits for the manual approval of the `production` GitHub Environment (required
   reviewer, `main` only), then deploys and smoke-tests.
5. **If something fails** the branch does not advance: fix forward in `dev` and promote again. Production is only
   touched by a push to `main`. See Rollback below. Hotfixes follow the same path (PR into `dev`, promote).

## Pipeline

```
push to dev | staging | main  (finanzas-app/backend/**)
  └─ ci (backend-ci.yml: tsc, lint, tests)
      └─ deploy -> assert pre-deploy -> wait healthy -> smoke
         environment = dev | staging | production (main; waits for GitHub Environment approval)
```

- Workflows: `.github/workflows/deploy-backend.yml` (orchestration), the deploy job (all steps inline: GitHub does not pass environment secrets into reusable workflows).
- Smoke test: `GET /health` must return `{"status":"ok"}` and `GET /api/v1/debts` without a token must return `401`.
- One deploy per environment at a time (`concurrency: deploy-backend-<branch>`, no cancel). A run waiting for production approval queues newer pushes to `main`.
- Backend-only: frontend/mobile changes do not trigger it. `workflow_dispatch` re-runs it manually on `dev`, `staging` or `main` (other branches are refused).
- Migrations run as Railway **pre-deploy** (`typeorm migration:run`), not in the container `CMD`. A failed migration
  aborts the deploy and the previous deployment keeps serving. Back up production first (README → Backups).
- Image: non-root (`node`), `CMD ["node","dist/main"]`, Docker `HEALTHCHECK`, Railway `healthcheckPath=/health`.

## One-time setup (owner)

1. **Apply the deploy settings to `production`** (already done for `dev`/`staging`). Railway ignores the `deploy`
   block of `railway.json` for CLI uploads, so it is stored on the service instance. Until this is done the
   pipeline's "Assert pre-deploy" step refuses to deploy to production (the image no longer migrates on start):
   ```bash
   cd finanzas-app/backend
   railway api 'mutation($s:String!,$e:String!,$i:ServiceInstanceUpdateInput!){serviceInstanceUpdate(serviceId:$s,environmentId:$e,input:$i)}' \
     --raw-var s=2a74668b-b339-4f9c-9664-fa824a25f4e3 --raw-var e=16e6b268-217d-451f-a160-6550c36a446a \
     --var i='{"preDeployCommand":["npx typeorm migration:run -d dist/database/data-source.js"],"healthcheckPath":"/health","healthcheckTimeout":60,"restartPolicyType":"ON_FAILURE","restartPolicyMaxRetries":5}'
   ```
   (Or Dashboard → backend → Settings → Deploy → Pre-deploy command / Healthcheck path.)
2. **GitHub Environments** (already created): `dev`, `staging`, `production`. `production` has *Required reviewers*
   and is restricted to `main`; restrict `dev` / `staging` to their own branch if you want.
3. **Railway project tokens** (Dashboard → project `mi-casa-pro` → Settings → Tokens → New token, one per environment).
   Add each as the environment secret **`RAILWAY_TOKEN`** of the matching GitHub Environment:

   | GitHub Environment | Railway token scope |
   |---|---|
   | `dev` | environment `dev` |
   | `staging` | environment `staging` |
   | `production` | environment `production` |

   (Named `RAILWAY_TOKEN_DEV` / `_STAGING` / `_PRODUCTION` in notes; as Environment secrets the per-env scoping makes
   the suffix unnecessary, all three are called `RAILWAY_TOKEN`.)
4. Set `FRONTEND_URL` in `dev`/`staging` to the real Vercel URLs once they exist, and point the Vercel
   preview/staging `NEXT_PUBLIC_API_URL` at the matching backend URL.
5. Run the workflow once via *Actions → Deploy backend → Run workflow* and approve `production`.

If a service domain is recreated, update `base_url` in `deploy-backend.yml`.

## Frontend and mobile

- **Frontend (Vercel)** is deployed by Vercel's Git integration, outside this pipeline. Production = `main` build;
  the `dev` and `staging` branches get Vercel branch previews; in Vercel -> Settings -> Environment Variables set
  `NEXT_PUBLIC_API_URL` for *Preview* with the Git branch `dev` / `staging` pointing at the matching backend URL.
- **Mobile (EAS Update)** is published only from `main`, by `.github/workflows/deploy-mobile.yml`, when a push touches
  `finanzas-app/mobile/**` (mobile CI first, then the manual approval of the `production` environment). It publishes
  to the `preview` channel (the one installed builds listen to; set the environment variable `EAS_CHANNEL` to
  `production` once a store build exists) with `EXPO_PUBLIC_API_URL` pointing at the production backend.
  `dev` and `staging` do not publish updates.
  One-time setup: create an Expo access token (expo.dev -> Account settings -> Access tokens) and store it as the
  `EXPO_TOKEN` secret of the GitHub Environment `production`.
  OTA ships JS and assets only: a change that adds a native module needs a new `eas build` first.

## Rollback

- Fast: Railway Dashboard → backend (`<env>`) → Deployments → previous successful deployment → **Redeploy**
  (or `railway deployment list -s backend -e <env>` then `railway redeploy`/dashboard). Pre-deploy runs again but is a
  no-op when no new migration exists.
- Code: revert the commit and promote the revert through `dev` -> `staging` -> `main`.
- Schema: migrations are not auto-reverted. If a bad migration shipped, restore the pre-deploy backup, or
  `npx typeorm migration:revert -d dist/database/data-source.js` from a one-off Railway shell, **before** rolling
  back code that does not know the new schema.
