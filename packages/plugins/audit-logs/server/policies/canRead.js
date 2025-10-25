'use strict';

module.exports = async (ctx) => {
  if (!ctx.state.user) {
    return false;
  }

  // Check if the user has the required permission
  const { userAbility } = ctx.state;
  
  return userAbility.can('plugin::audit-logs.read');
};
