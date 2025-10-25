'use strict';

module.exports = {
  kind: 'collectionType',
  collectionName: 'audit_logs',
  info: {
    displayName: 'Audit Log',
    singularName: 'audit-log',
    pluralName: 'audit-logs',
    description: 'Audit logs for content changes'
  },
  options: {
    draftAndPublish: false,
    comment: 'Collection storing audit logs for content changes'
  },
  pluginOptions: {
    'content-manager': {
      visible: false
    },
    'content-type-builder': {
      visible: false
    }
  },
  attributes: {
    action: {
      type: 'enumeration',
      enum: ['create', 'update', 'delete'],
      required: true,
      description: 'The type of action performed'
    },
    contentType: {
      type: 'string',
      required: true,
      description: 'The content type name'
    },
    entityId: {
      type: 'string',
      required: true,
      description: 'ID of the content that was changed'
    },
    user: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'admin::user',
      description: 'The user who performed the action'
    },
    payload: {
      type: 'json',
      description: 'The data that was changed'
    },
    changes: {
      type: 'json',
      description: 'Specific fields that were changed (for updates)'
    },
    bulk: {
      type: 'boolean',
      default: false,
      description: 'Whether this was part of a bulk operation'
    },
    bulkOperation: {
      type: 'json',
      description: 'Details about the bulk operation (type and total affected records)'
    }
  }
};
