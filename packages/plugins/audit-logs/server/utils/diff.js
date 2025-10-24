'use strict';

const createPerformanceMonitor = require('./performance');

// Initialize performance monitor
let performanceMonitor;

/**
 * Checks if a value should be considered empty
 * @param {*} value The value to check
 * @returns {boolean} True if the value is empty
 */
const isEmpty = (value) => value === null || value === undefined;

/**
 * Determines if two values are different, handling special cases
 * @param {*} oldValue Previous value
 * @param {*} newValue New value
 * @returns {boolean} True if values are different
 */
const isDifferent = (oldValue, newValue) => {
  // Handle null/undefined/empty string cases
  if (isEmpty(oldValue) && isEmpty(newValue)) return false;
  if (isEmpty(oldValue) || isEmpty(newValue)) return true;
  if (oldValue === '' && newValue === '') return false;
  if (oldValue === '' || newValue === '') return true;

  // Handle arrays (including relationship arrays)
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length !== newValue.length) return true;
    // For relationship arrays, compare IDs
    if (oldValue[0]?.id) {
      const oldIds = new Set(oldValue.map(item => item.id));
      const newIds = new Set(newValue.map(item => item.id));
      return oldIds.size !== newIds.size || 
             oldValue.some(item => !newIds.has(item.id));
    }
    // For regular arrays, compare values
    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }

  // Handle objects (including components and dynamic zones)
  if (typeof oldValue === 'object' && typeof newValue === 'object') {
    if (oldValue === null || newValue === null) return oldValue !== newValue;
    // For components, compare by __component and fields
    if (oldValue.__component || newValue.__component) {
      return oldValue.__component !== newValue.__component ||
             JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }

  return oldValue !== newValue;
};

/**
 * Creates a detailed diff between two objects
 * @param {Object} oldData Previous state
 * @param {Object} newData New state
 * @param {Object} contentType Strapi content type schema
 * @returns {Object} Diff object with changes
 */
const createDiff = (oldData, newData, contentType) => {
  // Initialize performance monitor if not already done
  if (!performanceMonitor) {
    performanceMonitor = createPerformanceMonitor(strapi);
  }

  // Start tracking diff operation
  performanceMonitor.start('diff-operation', {
    contentType: contentType?.collectionName,
    dataSize: {
      old: JSON.stringify(oldData).length,
      new: JSON.stringify(newData).length
    }
  });

  const changes = {};
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];
    
    // Skip metadata fields
    if (!['id', 'created_at', 'updated_at', 'created_by', 'updated_by'].includes(key) && isDifferent(oldValue, newValue)) {
      const fieldType = contentType.attributes[key]?.type;
      
      changes[key] = {
        previous: oldValue,
        new: newValue,
        type: fieldType || 'unknown'
      };

      // Add relationship metadata if it's a relation field
        if (fieldType === 'relation' && newValue?.connect) {
          const newIds = newValue.connect.map(v => v.id);
          const removedIds = newValue.disconnect.map(v => v.id);
        changes[key].relationChanges = {
            added: newIds,
            removed: removedIds
        };
          // Add relationship type info
          changes[key].type = 'relation';
          changes[key].relationshipType = contentType.attributes[key].relation;
      }

      // Add component metadata if it's a component field
      if (fieldType === 'component' || fieldType === 'dynamiczone') {
        changes[key].componentType = oldValue?.__component || newValue?.__component;
      }
    }
  }

  // End performance tracking
  const perfMetrics = performanceMonitor.end('diff-operation', {
    changesCount: Object.keys(changes).length,
    fieldsChecked: allKeys.size
  });

  // Store performance data in a Symbol to keep it internal
  const performanceSymbol = Symbol.for('audit-logs.performance');
  changes[performanceSymbol] = {
    durationMs: perfMetrics.durationMs,
    timestamp: perfMetrics.timestamp,
    dataSize: perfMetrics.dataSize,
    changesCount: perfMetrics.changesCount,
    fieldsChecked: perfMetrics.fieldsChecked
  };

  return changes;
};

module.exports = {
  createDiff,
  isDifferent
};
