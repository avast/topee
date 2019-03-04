// https://developer.chrome.com/extensions/webRequest

var webRequest = {};

webRequest.onBeforeRedirect = {
    addListener: function () {
        console.warn('webRequest.onBeforeRedirect.addListener is not implemented.');
    },
    removeListener: function() {
        console.warn('webRequest.onBeforeRedirect.removeListener is not implemented.');
    }
};

webRequest.onSendHeaders = {
    addListener: function () {
        console.warn('webRequest.onSendHeaders.addListener is not implemented.');
    },
    removeListener: function() {
        console.warn('webRequest.onSendHeaders.removeListener is not implemented.');
    },
};

webRequest.onBeforeRequest = {
    addListener: function () {
        console.warn('webRequest.onBeforeRequest.addListener is not implemented.');
    },
    removeListener: function() {
        console.warn('webRequest.onBeforeRequest.removeListener is not implemented.');
    },
};

module.exports = webRequest;