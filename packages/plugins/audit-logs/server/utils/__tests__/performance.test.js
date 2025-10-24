'use strict';

const createPerformanceMonitor = require('../performance');
const { createDiff } = require('../diff');

describe('Performance Monitoring', () => {
  let strapi;

  beforeEach(() => {
    strapi = {
      log: {
        warn: jest.fn()
      }
    };
    global.strapi = strapi;

    // Reset all timers
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-10-25T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should track performance metrics for diff operations', () => {
    const oldData = {
      title: 'Old Title',
      description: 'Old Description',
      tags: ['old', 'tags']
    };

    const newData = {
      title: 'New Title',
      description: 'Old Description',
      tags: ['new', 'tags']
    };

    const contentType = {
      collectionName: 'api::article.article',
      attributes: {
        title: { type: 'string' },
        description: { type: 'text' },
        tags: { type: 'array' }
      }
    };

    const changes = createDiff(oldData, newData, contentType);

    // Verify performance metadata is stored in Symbol
    const perfData = changes[Symbol.for('audit-logs.performance')];
    expect(perfData).toBeDefined();
    expect(perfData.durationMs).toBeDefined();
    expect(perfData.timestamp).toBeDefined();
    expect(perfData.dataSize).toBeDefined();
    expect(perfData.changesCount).toBe(2); // title and tags changed
    expect(perfData.fieldsChecked).toBe(3); // all fields checked

    // Verify performance data is not enumerable
    expect(Object.keys(changes)).not.toContain('_meta');
    expect(Object.keys(changes)).not.toContain('performance');
  });

  it('should log warning for slow diff operations', () => {
    // Create large dataset to trigger slow operation warning
    const oldData = {};
    const newData = {};
    
    // Create an artificial delay
    jest.advanceTimersByTime(1000); // Advance timer by 1 second
    
    // Add fields to make the diff operation generate changes
    for (let i = 0; i < 10; i += 1) {
      oldData[`field${i}`] = `old value ${i}`;
      newData[`field${i}`] = `new value ${i}`;
    }

    const contentType = {
      collectionName: 'api::large-content.large-content',
      attributes: {}
    };

    const monitor = createPerformanceMonitor(strapi);
    monitor.start('diff-operation');
    jest.advanceTimersByTime(500); // Simulate operation taking time
    createDiff(oldData, newData, contentType);
    monitor.end('diff-operation');

    // Verify warning was logged for slow operation
    expect(strapi.log.warn).toHaveBeenCalledWith(
      'Performance notice: diff-operation took 500ms',
      expect.objectContaining({
        operation: 'diff-operation',
        durationMs: expect.any(Number)
      })
    );
  });
});
