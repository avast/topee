'use strict';
var eventEmitter = require('../event-bus.js');

var runtime = {
    // Manifest will be updated by Topee SafariExtensionBridge before user
    // background scripts are executed.
    _manifest: undefined
};

runtime.onMessage = {
    addListener: function (listener) {
        eventEmitter.addListener('message', listener);
    },
    removeListener: function (listener) {
        eventEmitter.removeListener('message', listener);
    },

    _emit: function(message, sender, sendResponse) {
        eventEmitter.emit('message', message, sender, sendResponse);
    }
};

runtime.onUpdateAvailable = {
    addListener: function () {
        // Not available in Safari
    }
};

runtime.getManifest = function () {
    return runtime._manifest;
};

runtime.id = '';

runtime.getURL = function (path) {
    if (path[0] === '/') {
        path = path.substr(1);
    }
    return 'safari-extension://' + runtime.id + path;
};

// no other purpose than interception by messageReceivedFromBackground
runtime.sendMessage = function(message) {
    window.webkit.messageHandlers.appex.postMessage({
        type: 'userMessage',
        data: message
    });
};

var VERSION_INFO = '__topee_extension_version';

// you get the installed / updated notification basically once once per a run
runtime.onInstalled = {
    addListener (listener) {
        // just to be safe, if the caller didn't expect the callback synchronously
        setTimeout(function () {
            if (!runtime._manifest) {
                return;
            }

            var currentVersion = runtime._manifest.version;
            if (!currentVersion) {
                return;
            }

            var storedVersion = localStorage.getItem(VERSION_INFO);

            localStorage.setItem(VERSION_INFO, currentVersion);

            if (!storedVersion) {
                listener({
                    reason: 'install'
                });
            }
            else if (currentVersion !== storedVersion) {
                listener({
                    reason: 'update',
                    previousVersion: storedVersion
                });
            }
        }, 0);
    },
    removeListener: function () {}
};

module.exports = runtime;
