# Bulk Operations Support

The audit-logs plugin supports logging of bulk operations performed through Strapi's Content API. This document explains how bulk operations are handled and what information is recorded.

## Supported Bulk Operations

The plugin supports the following bulk operations:

1. Bulk Delete (`deleteMany`)
2. Bulk Create (multiple records in one request)
3. Bulk Update (multiple records in one request)

## How It Works

### Bulk Delete Operations

When a bulk delete operation is performed:
```javascript
// Example DELETE request
DELETE /api/articles
{
  "ids": ["1", "2", "3"]
}
```

The plugin creates separate audit log entries for each deleted item, with:
- `bulk: true`
- `bulkOperation.type: 'deleteMany'`
- `bulkOperation.total: <total number of items>`

### Bulk Create Operations

For bulk create operations:
```javascript
// Example POST request
POST /api/articles
{
  "data": [
    { "title": "Article 1" },
    { "title": "Article 2" }
  ]
}
```

Each created item gets its own audit log entry with:
- `bulk: true`
- `bulkOperation.type: 'bulkcreate'`
- `bulkOperation.total: <total number of items>`
- Full payload for each item

### Bulk Update Operations

For bulk update operations:
```javascript
// Example PUT request
PUT /api/articles
{
  "data": [
    { "id": 1, "title": "Updated Article 1" },
    { "id": 2, "title": "Updated Article 2" }
  ]
}
```

Each updated item gets its own audit log entry with:
- `bulk: true`
- `bulkOperation.type: 'bulkupdate'`
- `bulkOperation.total: <total number of items>`
- Changes recorded for each item

## Limitations

1. Maximum Size: Bulk operations are limited to 100 items per request
2. Performance: Each item in a bulk operation generates its own audit log entry
3. Rollback: If audit logging fails for any item in a bulk operation, the operation continues (logs are non-blocking)

## Example Audit Log Entry

```javascript
{
  "action": "delete",
  "contentType": "api::article.article",
  "entityId": "123",
  "user": 1,
  "bulk": true,
  "bulkOperation": {
    "total": 50,
    "type": "deleteMany"
  }
}
```

## Best Practices

1. Keep bulk operations within the size limit (100 items)
2. For very large operations, break them into smaller batches
3. Monitor performance when performing large bulk operations
4. Use the `bulk` and `bulkOperation` fields when querying logs to identify related entries