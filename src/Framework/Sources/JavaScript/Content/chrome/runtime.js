'use strict';

var EventEmitter = require('events');
var tabInfo = require('../tabInfo.js');
var iframesParent = require('../iframes.js');
var background = require('../background-bridge.js');

var runtime = { _manifest: {} };

var eventEmitter = new EventEmitter();

// We are adding quite a few listeners so let's increase listeners limit. Otherwise we get following warning:
// (node) warning: possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit.
eventEmitter.setMaxListeners(1024);


var version = sessionStorage.getItem('topee_manifest_version');
if (version) {
    runtime._manifest.version = version;
}
var name = sessionStorage.getItem('topee_manifest_name');
if (name) {
    runtime._manifest.name = name;
}

runtime.sendMessage = function(message, callback) {
    background.dispatchRequest({
        eventName: 'sendMessage',
        message: message
    }, callback);
};

runtime.onMessage = {
    addListener: function(callback) {
        eventEmitter.addListener('message', callback);
    },
    removeListener: function(callback) {
        eventEmitter.removeListener('message', callback);
    }
};

runtime.getManifest = function () {
    return runtime._manifest;
};

safari.self.addEventListener("message", function (event) {
    // message from the background script and a response
    if (event.name === 'request' && tabInfo.isForThisFrame(event.message.frameId)) {
        eventEmitter.emit('message', event.message.payload, {id: 'topee'}, function (message) {
            background.dispatchRequest({
                eventName: 'messageResponse',
                messageId: event.message.messageId,
                message: message
            });
        });

        // It's a broadcast message so let's pass it to all children IFRAMEs
        if (typeof event.message.frameId === 'undefined') {
            iframesParent.broadcast(event.message);
        }
        return;
    }
    if (event.name === 'request' && iframesParent.hasChild(event.message.frameId)) {
        iframesParent.forward(event.message.frameId, event.message);
        return;
    }
});

runtime.getURL = function (path) {
    if (!safari.extension.baseURI) {
        // Sometimes this happens (on first page load after XCode build & run)
        throw new Error('safari.extension.baseURI didn\'t return usable value');
    }
    if (path[0] === '/') {
        path = path.substr(1);
    }

    return safari.extension.baseURI + path;
};

runtime.getPlatformInfo = function (fn) {
    fn({
        os: 'mac',
        arch: 'x86-64',
        nacl_arch: 'x86-64'
    });
};

module.exports = runtime;
