# Performance Monitoring in Audit Logs

The audit-logs plugin includes built-in performance monitoring capabilities that help track the performance impact of audit logging operations without exposing sensitive metrics in API responses.

## Overview

Performance monitoring in the audit-logs plugin:
- Tracks operation duration using high-resolution timers
- Provides warning logs for slow operations
- Keeps performance data private using Symbol-based storage
- Automatically sanitizes API responses

## Implementation Details

### Performance Tracking

Performance metrics are tracked using `process.hrtime` for high-precision timing:
```javascript
const start = process.hrtime.bigint();
// ... operation ...
const end = process.hrtime.bigint();
const durationMs = Number(end - start) / 1e6;
```

### Private Storage

Performance data is stored using Symbols to prevent accidental exposure:
```javascript
const PERFORMANCE_SYMBOL = Symbol.for('audit-logs.performance');
changes[PERFORMANCE_SYMBOL] = { durationMs };
```

### Warning System

The plugin monitors operation duration and logs warnings for potentially slow operations:
- Bulk operations: Warning threshold > 1000ms
- Single operations: Warning threshold > 200ms

Warnings are non-blocking and don't affect normal operation.

### API Response Sanitization

All API responses are automatically sanitized to remove performance data:
- Performance metrics are stripped before sending responses
- Other metadata and audit information is preserved
- Process is transparent to API consumers

## Configuration

Performance monitoring is enabled by default. You can configure warning thresholds in your `config/plugins.js`:

```javascript
module.exports = {
  'audit-logs': {
    performance: {
      warningThresholds: {
        bulk: 1000, // ms
        single: 200  // ms
      }
    }
  }
};
```

## Best Practices

1. Monitor warning logs to identify potential performance bottlenecks
2. Adjust warning thresholds based on your application's requirements
3. Use bulk operations when possible for better performance
4. Consider implementing custom monitoring for specific use cases

## Troubleshooting

If you see frequent performance warnings:
1. Check database indexes
2. Review bulk operation sizes
3. Monitor system resources
4. Consider adjusting warning thresholds