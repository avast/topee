'use strict';

var TextCrypto = require('../Common/text-crypto.js');
var txtCrypto = new TextCrypto();

var childFrames = {
    _frames: {},
    add: function (frameId, frameWindow) {
        this.garbageCollect();
        this._frames[frameId] = frameWindow;
    },
    get: function (frameId) {
        this.garbageCollect();
        return this._frames[frameId];
    },
    getAll: function () {
        this.garbageCollect();
        return Object.values(this._frames);
    },
    garbageCollect: function() {
        for (var frameId in this._frames) {
            if (this._frames[frameId].closed) {
                delete this._frames[frameId];
            }
        }
    }
};

function install() {
    window.addEventListener('message', function (event) {
        if (!safari.extension.baseURI.toLowerCase().startsWith(event.origin.toLowerCase())) {
            return;
        }

        if (event.data && event.data.type === 'topee_get_iframe_key') {
            childFrames.add(event.data.frameId, event.source);

            txtCrypto.readyPromise
                .then(() => txtCrypto.getKey())
                .then(function (key) {
                    event.source.postMessage({ type: 'topee_iframe_key', value: key}, event.origin);
                });
        }

        if (event.data && event.data.type === 'topee_iframe_request') {
            txtCrypto.decrypt(event.data.value)
                .then(function (str) {
                    var message = JSON.parse(str);

                    var messageId = event.data.messageId;
                    if (typeof messageId !== 'undefined') {
                        safari.self.addEventListener("message", listener);
                    }

                    // the correct tabId should already be there
                    safari.extension.dispatchMessage(message.name, message.value);

                    function listener(responseEvent) {
                        if (responseEvent.name === 'response' && responseEvent.message.messageId === messageId) {
                            txtCrypto.encrypt(JSON.stringify(responseEvent.message))
                                .then(function (e) {
                                    event.source.postMessage({ type: 'topee_iframe_response', value: e}, event.origin);
                                });
                            safari.self.removeEventListener("message", listener);
                        }
                    }
            });
        }
    });
}

function sendMessage(frameId, message) {
    var win = childFrames.get(frameId);
    if (!win) {
        window.topee_log && console.log('frame', frameId, 'not found');
        return;
    }
    txtCrypto.readyPromise
        .then(() => txtCrypto.encrypt(JSON.stringify(message)))
        .then(m => win.postMessage({ type: 'topee_iframe_request', value: m }, '*'));  // '*' is ok, it's encrypted
}

function broadcastMessage(message) {
    var children = childFrames.getAll();
    if (children.length == 0) {
        return;  // no recipients
    }
    txtCrypto.readyPromise
        .then(() => txtCrypto.encrypt(JSON.stringify(message)))
        .then(m => children.forEach(win => win.postMessage({ type: 'topee_iframe_request', value: m }, '*')));  // '*' is ok, it's encrypted
}


module.exports = {
    install: install,
    hasChild: function (frameId) { return !!frameId && !!childFrames.get(frameId); },
    forward: sendMessage,
    broadcast: broadcastMessage
};
