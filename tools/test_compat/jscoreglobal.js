if (typeof global === 'undefined' && typeof window === 'undefined' && typeof self === 'undefined') {
    // JavaScriptCore
    Object.defineProperty(this, "global", {
        configurable: true,
        get: () => {
            return this;
        }
    });

    global.console = {
        log: debug,
        error: debug
    };

    if (typeof setTimeout === 'undefined') {
      global.setTimeout = function (callback) { callback(); };
    }
    if (typeof setInterval === 'undefined') {
      global.setInterval = function () {};
    }
}
else {
    debug('global object already exists');
}
