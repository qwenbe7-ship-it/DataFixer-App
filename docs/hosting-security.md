# DataFixer Hosting Security Requirements

DataFixer V1 must be served as static assets only. Runtime dependencies must be bundled locally; do not add analytics, remote fonts, CDN scripts, remote error reporting, or customer-data APIs.

The HTML build contains the restrictive meta Content Security Policy used by the application. The production host must additionally send this HTTP response header because `frame-ancestors` is not enforced from a meta CSP:

```text
Content-Security-Policy: frame-ancestors 'none'
```

The host may serve the static application and worker assets with same-origin GET requests. Processing customer files must create no non-GET request and no cross-origin request. Release verification must confirm this from browser network logs.
