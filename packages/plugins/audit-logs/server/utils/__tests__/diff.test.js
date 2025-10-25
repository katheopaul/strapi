'use strict';

const { createDiff, isDifferent } = require('../diff');

describe('Diff Utils', () => {
  describe('isDifferent', () => {
    it('should handle null and undefined values', () => {
      expect(isDifferent(null, null)).toBe(false);
      expect(isDifferent(undefined, undefined)).toBe(false);
      expect(isDifferent(null, undefined)).toBe(false);
      expect(isDifferent(null, 'value')).toBe(true);
      expect(isDifferent('value', null)).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(isDifferent('', '')).toBe(false);
      expect(isDifferent('', 'value')).toBe(true);
      expect(isDifferent('value', '')).toBe(true);
    });

    it('should handle relationship arrays', () => {
      const oldRels = [{ id: 1 }, { id: 2 }];
      const newRels = [{ id: 2 }, { id: 3 }];
      expect(isDifferent(oldRels, newRels)).toBe(true);
      expect(isDifferent(oldRels, [...oldRels])).toBe(false);
    });

    it('should handle components', () => {
      const oldComp = { __component: 'basic.title', value: 'Old' };
      const newComp = { __component: 'basic.title', value: 'New' };
      expect(isDifferent(oldComp, newComp)).toBe(true);
      expect(isDifferent(oldComp, { ...oldComp })).toBe(false);
    });
  });

  describe('createDiff', () => {
    const contentType = {
      attributes: {
        title: { type: 'string' },
        description: { type: 'text' },
        category: { type: 'relation' },
        header: { type: 'component' },
        sections: { type: 'dynamiczone' }
      }
    };

    it('should detect simple field changes', () => {
      const oldData = { title: 'Old Title', description: 'Old Desc' };
      const newData = { title: 'New Title', description: 'Old Desc' };
      
      const diff = createDiff(oldData, newData, contentType);
      
      expect(diff.title).toEqual({
        previous: 'Old Title',
        new: 'New Title',
        type: 'string'
      });
      expect(diff.description).toBeUndefined();
    });

    it('should handle relationship changes', () => {
      const oldData = { category: { id: 1, name: 'Old Category' } };
      const newData = { 
        category: { 
          connect: [{ id: 2 }], 
          disconnect: [{ id: 1 }]
        } 
      };
      
      const diff = createDiff(oldData, newData, contentType);
      
      expect(diff.category.type).toBe('relation');
      expect(diff.category.relationChanges).toEqual({
        added: expect.arrayContaining([2]),
        removed: expect.arrayContaining([1])
      });
      expect(diff.category.relationChanges.added).toHaveLength(1);
      expect(diff.category.relationChanges.removed).toHaveLength(1);
    });

    it('should handle component changes', () => {
      const oldData = {
        header: {
          __component: 'basic.header',
          title: 'Old Header'
        }
      };
      const newData = {
        header: {
          __component: 'basic.header',
          title: 'New Header'
        }
      };
      
      const diff = createDiff(oldData, newData, contentType);
      
      expect(diff.header.type).toBe('component');
      expect(diff.header.componentType).toBe('basic.header');
      expect(diff.header.previous.title).toBe('Old Header');
      expect(diff.header.new.title).toBe('New Header');
    });

    it('should ignore metadata fields', () => {
      const oldData = {
        title: 'Old',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };
      const newData = {
        title: 'New',
        created_at: '2023-01-01',
        updated_at: '2023-01-02'
      };
      
      const diff = createDiff(oldData, newData, contentType);
      
      expect(diff.created_at).toBeUndefined();
      expect(diff.updated_at).toBeUndefined();
      expect(diff.title).toBeDefined();
    });
  });
});
