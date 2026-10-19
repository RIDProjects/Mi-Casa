# Deploy runbook

Single branch (`main`). Environments are Railway environments, not git branches.

## Environment matrix

| Env | Trigger | Database | Backend URL | Frontend (Vercel) | Mobile (EAS channel) |
|---|---|---|---|---|---|
| `dev` | auto, after CI on push to `main` | own empty Postgres | https://backend-dev-2110.up.railway.app | preview deployment (placeholder `https://mi-casa-dev.vercel.app`) | `dev` |
| `staging` | auto, after `dev` smoke test | own empty Postgres | https://backend-staging-494d.up.railway.app | placeholder `https://mi-casa-staging.vercel.app` | `staging` |
| `production` | after `staging`, **manual approval** | production Postgres | https://backend-production-0d37.up.railway.app | production Vercel project | `production` |

Each Railway environment has its own `JWT_SECRET` (96 hex chars, never shared), `SEED=false`, `NODE_ENV=production`
and no email credentials (`RESEND_API_KEY` / `SMTP_*` are absent, so email is skipped). `FRONTEND_URL` for
`dev`/`staging` is a placeholder: set it to the real Vercel URL (CORS only allows that origin).

## Release flow

1. **Develop on a feature branch and open a PR to `main`.** Branch protection requires the `backend`, `frontend`
   and `mobile` CI checks to pass; nobody pushes to `main` directly.
2. **Try it in `dev` (optional, before merging).** *Actions -> Deploy backend -> Run workflow*, selecting the
   feature branch. A run on any branch other than `main` runs CI and deploys to `dev` only.
3. **Merge to `main`.** The pipeline runs CI, deploys to `dev`, then to **`staging`** (the first deploy of the
   release), each followed by a smoke test.
4. **Promote to production.** Only if `staging` is healthy does the `production` job start, and it waits for the
   manual approval of the `production` GitHub Environment. After approval it deploys and runs the same smoke test.
5. **If something fails** at any stage the later stages do not run; production is untouched. See Rollback below.

## Pipeline

```
push to main (finanzas-app/backend/** or deploy workflows)
  └─ ci (backend-ci.yml: tsc, lint, tests)
      └─ dev      deploy -> assert pre-deploy -> wait healthy -> smoke
          └─ staging  deploy -> ... -> smoke
              └─ production  [GitHub Environment approval] deploy -> ... -> smoke
```

- Workflows: `.github/workflows/deploy-backend.yml` (orchestration), `_deploy-backend-env.yml` (reusable per-env job).
- Smoke test: `GET /health` must return `{"status":"ok"}` and `GET /api/v1/debts` without a token must return `401`.
- One pipeline at a time (`concurrency: deploy-backend`, no cancel). A run waiting for production approval queues newer runs.
- Backend-only: frontend/mobile changes do not trigger it. `workflow_dispatch` re-runs the pipeline manually.
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
2. **GitHub Environments** (Settings → Environments): create `dev`, `staging`, `production`.
   On `production` add *Required reviewers* (yourself) and restrict deployment branches to `main`.
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
  `dev`/`staging` use preview deployments whose `NEXT_PUBLIC_API_URL` targets the matching backend. Promote
  by promoting the deployment in Vercel (or alias it), separately from the backend.
- **Mobile (EAS)** uses update channels `dev`, `staging`, `production` (`eas update --channel <name>`),
  with `EXPO_PUBLIC_API_URL` set per EAS environment. Not automated yet.

## Rollback

- Fast: Railway Dashboard → backend (`<env>`) → Deployments → previous successful deployment → **Redeploy**
  (or `railway deployment list -s backend -e <env>` then `railway redeploy`/dashboard). Pre-deploy runs again but is a
  no-op when no new migration exists.
- Code: revert the commit on `main` and let the pipeline promote it through every stage.
- Schema: migrations are not auto-reverted. If a bad migration shipped, restore the pre-deploy backup, or
  `npx typeorm migration:revert -d dist/database/data-source.js` from a one-off Railway shell, **before** rolling
  back code that does not know the new schema.
