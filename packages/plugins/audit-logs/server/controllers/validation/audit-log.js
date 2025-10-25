'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const validateFindMany = validateYupSchema(
  yup.object().shape({
    page: yup.number().integer().positive(),
    pageSize: yup.number().integer().positive().max(100),
    sort: yup.string(),
    filters: yup.object().shape({
      contentType: yup.string(),
      action: yup.string().oneOf(['create', 'update', 'delete']),
      user: yup.number().integer().positive(),
      createdAt: yup.object().shape({
        $gt: yup.date(),
        $gte: yup.date(),
        $lt: yup.date(),
        $lte: yup.date(),
      }),
    }),
  })
);

module.exports = {
  validateFindMany,
};
