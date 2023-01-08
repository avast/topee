module.exports = function dummySessionStorage () {
  function noAccess() {
    if (arguments.length < 1 || typeof arguments[arguments.length - 1] !== 'function') {
      return Promise.reject('No access to session storage in this context');
    }
  }
  return {
    get: noAccess,
    set: noAccess,
    remove: noAccess,
    clear: noAccess
  };
};
