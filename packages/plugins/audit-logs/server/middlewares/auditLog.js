'use strict';

const getService = require('../utils/getService');

/**
 * Validates bulk operation size against configured limit
 * @param {Array} ids Array of IDs or items
 * @param {Object} config Plugin configuration
 * @throws {Error} If bulk operation exceeds size limit
 */
const validateBulkSize = (ids, config) => {
  const limit = config.bulkLimit || 100; // Use configured limit or default to 100
  if (ids.length > limit) {
    const error = new Error(`Bulk operation exceeds maximum size of ${limit} items`);
    error.status = 400;
    throw error;
  }
};

/**
 * Detects if the current request is a bulk operation
 * @param {Object} ctx Koa context
 * @returns {boolean} True if this is a bulk operation
 */
const isBulkOperation = (ctx) => {
  const handler = ctx.request.route?.handler || '';
  return handler.includes('deleteMany') || // Bulk delete
    handler.includes('createMany') || // Bulk create
    handler.includes('updateMany') || // Bulk update
    (ctx.request.method === 'POST' && Array.isArray(ctx.request.body.data)) || // Alternate bulk create
    (ctx.request.method === 'PUT' && Array.isArray(ctx.request.body.data)); // Alternate bulk update
};

/**
 * Extracts IDs affected by a bulk operation
 * @param {Object} ctx Koa context
 * @returns {Array<string>} Array of affected IDs
 */
const getBulkOperationIds = (ctx) => {
  // Get raw IDs
  let ids;
  if (ctx.request.method === 'DELETE') {
    ids = ctx.request.body?.ids || [];
    } else if (ctx.request.method === 'POST') {
      // For bulk create, we need to get IDs from the response
      ids = (ctx.response.body?.data || []).map(item => item.id).filter(Boolean);
  } else {
    ids = (ctx.request.body.data || []).map(item => item.id).filter(Boolean);
  }
  // Filter out any invalid values
  return ids.filter(id => id != null && id !== '' && id !== false);
};

module.exports = () => {
  return async (ctx, next) => {
    // Skip if audit logging is disabled
    const config = strapi.config.get('plugin.audit-logs');
    if (!config.enabled) {
      return next();
    }

    const { auth } = ctx.state;
    const route = ctx.request.route;

    // Only process Content API routes
    if (!route || !route.handler) {
      return next();
    }

    // Extract content type from route
    const contentType = route.handler.split('.')[0];
    
    // Skip excluded content types
    if (config.excludeContentTypes.includes(contentType)) {
      return next();
    }

    // Get the action type based on the HTTP method
    const actionMap = {
      POST: 'create',
      PUT: 'update',
      DELETE: 'delete'
    };
    
    const action = actionMap[ctx.request.method];
    if (!action) {
      return next();
    }

    try {
      // Call next to get the response
      await next();

      // Don't log if there was an error
      if (ctx.status >= 400) {
        return;
      }

      const auditService = getService('audit');
      const userId = auth?.user?.id;

      // Handle bulk operations
      if (isBulkOperation(ctx)) {
        const bulkIds = getBulkOperationIds(ctx);
        
         // Filter out invalid IDs
         const validIds = bulkIds.filter(id => id != null && id !== '');
         
        // Validate bulk operation size
        try {
            validateBulkSize(validIds, config);
        } catch (error) {
          ctx.status = error.status;
          ctx.body = { error: error.message };
          return;
        }
        
        const isBulkDelete = ctx.request.route.handler.includes('deleteMany');
        
        // Create audit entries for each affected record
          await Promise.all(validIds.map(async (id) => {
          const logEntry = {
            action,
            contentType,
            entityId: id.toString(),
            user: userId,
            payload: isBulkDelete ? null : ctx.request.body.data.find(item => item.id === id),
            changes: action === 'update' ? ctx.request.body.data.find(item => item.id === id) : null,
            bulk: true,
            bulkOperation: {
              total: bulkIds.length,
              type: isBulkDelete ? 'deleteMany' : `bulk${action}`
            }
          };
          await auditService.create(logEntry);
        }));
      } else {
        // Handle single record operations
        const entityId = ctx.params.id || (ctx.response.body?.data?.id);
        
          // For updates, fetch the current state to compute diff
          let changes = null;
          if (action === 'update') {
            try {
              const contentTypeUid = `api::${contentType}.${contentType}`;
              const oldData = await strapi.entityService.findOne(contentTypeUid, entityId, {
                populate: '*' // Populate all relations and components
              });
              
              const { createDiff } = require('../utils/diff');
              changes = createDiff(
                oldData,
                ctx.request.body.data,
                strapi.contentTypes[contentTypeUid]
              );
            } catch (error) {
              strapi.log.error('Failed to compute changes diff:', error);
            }
          }

          const logEntry = {
            action,
            contentType,
            entityId: entityId?.toString(),
            user: userId,
            payload: ctx.request.body,
            changes,
            bulk: false
          };        // Create audit log entry
        await auditService.create(logEntry);
      }

    } catch (error) {
      strapi.log.error('Audit log creation failed:', error);
      // Don't block the request if logging fails
    }
  };
};
