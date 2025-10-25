# Audit Logs API Documentation

This document provides comprehensive documentation for the Audit Logs API endpoints.

## List Audit Logs

Retrieve a paginated list of audit logs with filtering options.

```http
GET /api/audit-logs
```

### Query Parameters

| Parameter    | Type     | Description                                           | Example                    |
|-------------|----------|-------------------------------------------------------|----------------------------|
| page        | integer  | Page number (default: 1)                              | `?page=2`                  |
| pageSize    | integer  | Items per page (default: 25, max: 100)               | `?pageSize=50`            |
| contentType | string   | Filter by content type                                | `?contentType=api::article.article` |
| action      | string   | Filter by action type (create/update/delete)          | `?action=update`          |
| userId      | integer  | Filter by user ID                                     | `?userId=123`             |
| from        | string   | Start date (ISO format)                               | `?from=2025-10-01`        |
| to          | string   | End date (ISO format)                                 | `?to=2025-10-25`          |
| sort        | string   | Sort field and direction                              | `?sort=createdAt:desc`    |

### Example Requests

1. List all audit logs for a specific content type:
```http
GET /api/audit-logs?contentType=api::article.article
```

2. Get recent updates by a specific user:
```http
GET /api/audit-logs?action=update&userId=123&sort=createdAt:desc
```

3. View logs within a date range:
```http
GET /api/audit-logs?from=2025-10-01&to=2025-10-25&sort=createdAt:asc
```

4. Complex query with multiple filters:
```http
GET /api/audit-logs?contentType=api::article.article&action=update&from=2025-10-01&page=1&pageSize=50
```

### Response Format

```javascript
{
  "data": [
    {
      "id": 1,
      "action": "update",
      "contentType": "api::article.article",
      "entityId": "123",
      "user": {
        "id": 1,
        "username": "admin"
      },
      "changes": {
        "title": {
          "previous": "Old Title",
          "new": "New Title",
          "type": "string"
        }
      },
      "createdAt": "2025-10-24T14:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 4,
      "total": 100
    }
  }
}
```

### Error Responses

```javascript
// Invalid date range
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "To date must be after From date"
  }
}

// Invalid sort field
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid sort parameter"
  }
}

// Unauthorized access
{
  "error": {
    "status": 403,
    "name": "UnauthorizedError",
    "message": "Missing permission: read_audit_logs"
  }
}
```

## Best Practices

1. Use appropriate page sizes to manage response times
2. Include date ranges when querying large datasets
3. Use indexes fields for sorting (createdAt, action, contentType, user)
4. Consider using the `populate` parameter to include/exclude user details

## Rate Limiting

The API follows Strapi's global rate limiting settings. Consider implementing additional rate limiting for high-traffic scenarios.

## Performance Considerations

1. Large date ranges may impact response times
2. Sorting on non-indexed fields should be avoided
3. Use appropriate page sizes (recommended: 25-50 items)
4. Consider using date ranges to limit result sets