'use strict';

/**
 * Simple performance monitoring utility for tracking operation durations
 * and logging slow operations.
 */
const createPerformanceMonitor = (strapi) => {
  const measurements = new Map();
  
  return {
    /**
     * Start tracking an operation
     * @param {string} operation Operation identifier
     * @param {Object} metadata Additional context about the operation
     */
    start(operation, metadata = {}) {
      measurements.set(operation, {
        startTime: process.hrtime(),
        metadata
      });
    },

    /**
     * End tracking an operation and process results
     * @param {string} operation Operation identifier
     * @param {Object} finalMetadata Additional metadata to add
     * @returns {Object} Performance metrics
     */
    end(operation, finalMetadata = {}) {
      const measurement = measurements.get(operation);
      if (!measurement) return null;

      const diff = process.hrtime(measurement.startTime);
      const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to milliseconds

      const metadata = {
        ...measurement.metadata,
        ...finalMetadata
      };

      // Log warning if operation is slow (> 100ms), but never throw errors
      if (durationMs > 100) {
        strapi.log.warn(`Performance notice: ${operation} took ${Math.round(durationMs)}ms`, {
          operation,
          durationMs,
          ...metadata
        });
      }

      // Clean up
      measurements.delete(operation);

      return {
        operation,
        durationMs,
        timestamp: new Date().toISOString(),
        ...metadata
      };
    }
  };
};

module.exports = createPerformanceMonitor;
