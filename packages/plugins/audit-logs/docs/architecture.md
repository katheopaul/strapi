# Audit Logs – High-level Architecture

This document shows how the automated audit logging works within a Strapi application when the plugin is enabled.

## Content API mutations → Audit entries

```mermaid
flowchart LR
  subgraph Client
    A[Client/App]
  end

  subgraph Strapi Core
    B["Koa Router<br/>(Content API routes)"]
    C["Controller/Service<br/>for target content-type"]
  end

  subgraph Audit Logs Plugin
    M[Middleware: auditLog]
    S[Service: audit]
    CT[(Collection: audit_logs)]
  end

  A -->|create/update/delete| B --> C -->|await next resolves| M

  M -->|check config.enabled| M
  M -->|"skip if excluded<br/>(excludeContentTypes)"| M
  M -->|"detect action<br/>from HTTP method"| M
  M -->|"bulk? validate size<br/>(bulkLimit)"| M
  M -->|"on update: compute diff<br/>(utils/diff via entityService)"| M
  M -->|"build log entry<br/>(action, contentType, entityId, user, payload, changes, bulk)"| S
  S -->|entityService.create| CT
```

Notes
- The middleware runs after the target route handler (await next()), so it only logs successful operations (status < 400).
- Bulk operations are detected via route handler names (createMany, updateMany, deleteMany) or an array body shape; oversized bulks are rejected with 400.
- On updates, a diff is computed between the current entity and the incoming payload to capture granular changes.
- Configuration gates behavior:
  - enabled: turn logging on/off
  - excludeContentTypes: skip specific content types
  - bulkLimit: constrain bulk operation size

## Admin API – Read access to logs

```mermaid
flowchart LR
  subgraph Admin Panel / API Consumer
    UA[Admin user]
  end

  subgraph Strapi Admin API
    R[(Route)]
    P1[Policy: plugin::audit-logs.isEnabled]
    P2[Policy: admin::isAuthenticatedAdmin]
    P3[Policy: plugin::audit-logs.canRead]
    Ctrl[Controller: audit-logs]
  end

  subgraph Audit Logs Plugin
    S[Service: audit]
    CT[(Collection: audit_logs)]
  end

  UA -->|GET /audit-logs\nor /audit-logs/:id| R --> P1 --> P2 --> P3 --> Ctrl --> S --> CT

  Ctrl -->|sanitize+paginate| UA
```

Notes
- Routes are type "admin" and protected by:
  - plugin::audit-logs.isEnabled – only accessible when the plugin is enabled
  - admin::isAuthenticatedAdmin – admin authentication
  - plugin::audit-logs.canRead – RBAC permission `plugin::audit-logs.read`
- The service populates the related `admin::user` on read; controller returns sanitized results with pagination metadata.

## Components and responsibilities

- Middleware (auditLog): observes successful Content API mutations; builds and dispatches log entries; enforces config and bulk limits.
- Service (audit): persists, queries, and counts `audit_logs`; sanitizes transient performance metadata from responses.
- Content-type: `plugin::audit-logs.audit-log` stored in `audit_logs` table/collection.
- Admin API: read-only listing and detail endpoints for admins with permission.
- Policies/Permissions: guard routes and visibility; permission `plugin::audit-logs.read` registered at startup.

## Error and performance considerations

- Logging failures never block mutations: errors are logged to Strapi logs and the request continues.
- Bulk operations are validated before writes; exceeding `bulkLimit` returns a 400 with a clear message.
- Update diffs use entityService with `populate: '*'`, which may be heavy on very large schemas; you can disable logging or exclude specific content types if needed.
