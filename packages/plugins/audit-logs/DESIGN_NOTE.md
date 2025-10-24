# Strapi Audit Logs Plugin — Design Note

This document briefly describes the design and approach. For full usage and API details, see the plugin README.

## Goal

Automatically record Content API mutations (create, update, delete) with useful metadata and expose read-only Admin API endpoints to query the logs.

## Architecture (high level)

- Middleware (Koa): Intercepts Content API mutations, detects bulk operations, computes metadata/diffs, and delegates persistence to a service. Registration is guarded by configuration.
- Service: Persists entries in an `audit_logs` collection and provides query/count operations used by controllers.
- Admin API: Read-only endpoints to list and fetch audit logs. Protected by admin authentication and RBAC.
- Policies: `plugin::audit-logs.isEnabled` (route gating) and `plugin::audit-logs.canRead` (RBAC check for `plugin::audit-logs.read`).

## Data model (summary)

`audit_logs` attributes:
- `action`: 'create' | 'update' | 'delete'
- `contentType`: string
- `entityId`: string
- `user`: relation to `admin::user`
- `payload`: json
- `changes`: json (diff for updates when available)
- `bulk`: boolean
- `bulkOperation`: json ({ type, total })

Indexed on `contentType`, `action`, `user`, `createdAt`, plus composite (`contentType`,`action`,`createdAt`). Hidden in Content Manager and Content-Type Builder.

## Configuration (summary)

`config/plugins.js`:

```js
module.exports = {
  'audit-logs': {
    enabled: true,
    excludeContentTypes: [],
    bulkLimit: 100,
  },
};
```

Notes: When disabled, middleware isn’t registered and routes are gated by policy.

## Security

- Admin authentication required for endpoints
- Permission: `plugin::audit-logs.read`
- Design avoids blocking user requests if logging fails (errors are logged server-side)

## Key decisions

- Guard middleware and routes via config, allowing safe bundling
- Per-entity log entries for bulk operations with a shared descriptor
- Indexes chosen to match common query filters
