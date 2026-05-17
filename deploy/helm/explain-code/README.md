# ExplainCode Helm Chart

This chart is a deployment skeleton for installing the frontend and backend together.

## Runtime Config Strategy

The frontend image should serve static files from `/usr/share/nginx/html`.
The chart mounts a ConfigMap over:

```text
/usr/share/nginx/html/runtime-config.js
```

The React app loads this file before the bundled JavaScript and reads:

```js
window.__EXPLAIN_CODE_CONFIG__ = {
  appEnv: "production",
  apiBaseUrl: "/api",
  authTokenStorageKey: "explain-code-auth-token",
  authStateStorageKey: "explain-code-logged-in",
};
```

This keeps API URL and browser storage keys configurable without rebuilding the frontend image.

## Example

```bash
helm upgrade --install explain-code ./deploy/helm/explain-code \
  --set frontend.image.repository=docker.io/YOUR_ID/explain-code-frontend \
  --set frontend.image.tag=0.1.0 \
  --set frontend.config.apiBaseUrl=/api
```

Enable the backend when its image is ready:

```bash
helm upgrade --install explain-code ./deploy/helm/explain-code \
  --set backend.enabled=true \
  --set backend.image.repository=docker.io/YOUR_ID/explain-code-backend \
  --set backend.image.tag=0.1.0 \
  --set backend.secret.DATABASE_URL='postgres://user:pass@postgres:5432/explain_code' \
  --set backend.secret.JWT_SECRET='replace-me'
```
