# Explain Code Helm Chart

This chart installs the Explain Code frontend, backend, PostgreSQL, and the database migration Job together.

## What It Deploys

- Frontend: React static files served by nginx
- Backend: Node API server
- PostgreSQL: single-pod StatefulSet with PVC
- Migration Job: runs `node dist/db/migrate.js` after install and upgrade
- Ingress: routes `/` to frontend and `/api` to backend

## Build And Push Images

```powershell
cd C:\Users\111\Desktop\Github\explain-code

docker build -t dy7314/explain-code-frontend:latest .\frontend
docker build -t dy7314/explain-code-backend:latest .\backend

docker push dy7314/explain-code-frontend:latest
docker push dy7314/explain-code-backend:latest
```

If your Docker Hub namespace is different, update `frontend.image.repository` and `backend.image.repository` in `values.yaml`.

## Install From GitHub

Use the packaged chart URL directly:

```powershell
helm upgrade --install explain-code `
  https://raw.githubusercontent.com/dong7314/explain-code/master/charts/explain-code-0.1.0.tgz `
  -n explain-code `
  --create-namespace `
  -f https://raw.githubusercontent.com/dong7314/explain-code/master/deploy/helm/explain-code/examples/values-traefik-cert-manager.yaml
```

Or add this repository as a Helm repo:

```powershell
helm repo add explain-code https://raw.githubusercontent.com/dong7314/explain-code/master/charts
helm repo update

helm upgrade --install explain-code explain-code/explain-code `
  -n explain-code `
  --create-namespace `
  -f https://raw.githubusercontent.com/dong7314/explain-code/master/deploy/helm/explain-code/examples/values-traefik-cert-manager.yaml
```

For production, override the default secrets with `--set` or a private values file.

## Install

Change the default secrets before installing.

```powershell
helm upgrade --install explain-code .\deploy\helm\explain-code `
  -n explain-code `
  --create-namespace `
  --set backend.secret.JWT_SECRET="replace-with-long-random-value" `
  --set backend.secret.TOKEN_PEPPER="replace-with-long-random-value" `
  --set postgres.auth.password="replace-with-postgres-password"
```

## Local k3s Hostname

The default ingress host is:

```text
explain-code.local
```

For local testing, point it to your k3s ingress address in your hosts file.

```text
127.0.0.1 explain-code.local
```

Then open:

```text
http://explain-code.local
```

## Traefik And cert-manager

For a k3s cluster using Traefik and cert-manager, configure the ingress values like this:

```yaml
global:
  publicHost: your-domain.example.com

frontend:
  config:
    apiBaseUrl: /api

ingress:
  enabled: true
  className: traefik
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/redirect-entry-point: websecure
  tls:
    enabled: true
    secretName: explain-code-tls
```

The `/api` path is routed to the backend service, and every other route is routed to the frontend service.
The backend CORS origin is automatically derived from `global.publicHost` unless `backend.config.CORS_ORIGIN` is explicitly set.

Use the shared example file and override only the domain:

```powershell
helm upgrade --install explain-code .\deploy\helm\explain-code `
  -n explain-code `
  --create-namespace `
  -f .\deploy\helm\explain-code\examples\values-traefik-cert-manager.yaml `
  --set global.publicHost=your-domain.example.com
```

## Seed Data

By default, the chart only runs migrations. To also insert demo seed data:

```powershell
helm upgrade --install explain-code .\deploy\helm\explain-code `
  -n explain-code `
  --create-namespace `
  --set migration.seed=true `
  --set backend.config.SEED_ADMIN_USERNAME="admin" `
  --set backend.secret.SEED_ADMIN_PASSWORD="replace-with-admin-password"
```

## External PostgreSQL

If you want to use an external PostgreSQL instead of the chart-managed pod:

```powershell
helm upgrade --install explain-code .\deploy\helm\explain-code `
  -n explain-code `
  --create-namespace `
  --set postgres.enabled=false `
  --set backend.config.PGHOST="your-postgres-host" `
  --set backend.config.PGPORT="5432" `
  --set backend.config.PGDATABASE="explain_code" `
  --set backend.config.PGUSER="explain_code" `
  --set backend.secret.PGPASSWORD="your-postgres-password"
```

## Verify

```powershell
kubectl get pods -n explain-code
kubectl get svc -n explain-code
kubectl get ingress -n explain-code
kubectl logs job/explain-code-explain-code-backend-migrate -n explain-code
```

If you install with `--set fullnameOverride=explain-code`, the migration Job name becomes `explain-code-backend-migrate`.
