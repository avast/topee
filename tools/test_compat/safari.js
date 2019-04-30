Object.defineProperty(global, "window", {
    configurable: true,
    get: function () {
        return global;
    }
});

global.URLSearchParams = {};
global.URLSearchParams.prototype = Object;
global.addEventListener = function () {};
global.localStorage = {
    getItem: function () { return null; },
    setItem: function () {},
    removeItem: function () {}
}
global.navigator = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15',
    platform: 'MacIntel',
    language: 'en-US'
};
//global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
(function () {
class XMLHttpRequest {
    constructor () {}
    abort() {}
    getAllResponseHeaders() { return null; }
    getResponseHeader() { return null; }
    open() {}
    overrideMimeType() {}
    send() {}
    setRequestHeader() {}
};
global.XMLHttpRequest = XMLHttpRequest;
})();
global.fetch = require('node-fetch/lib/index.js');

Object.defineProperty(global, "self", {
    configurable: true,
    get: function () {
        return global;
    }
});

window.safari = {
    extension: {
        baseURI: 'safari-extension://123456',
        dispatchMessage: function () {}
    },
    self: {
        addEventListener: function () {},
        removeEventListener: function () {}
    }
};

window.webkit = {
    messageHandlers: {
        log: {
            postMessage: function () {}
        },
        content: {
            postMessage: function () {}
        },
        appex: {
            postMessage: function () {}
        }
    }
};
