'use strict';

var TextCrypto = require('../text-crypto.js');
var txtCrypto = new TextCrypto();

var childFrames = {
    _frames: {},
    add: function (frameId, frameWindow) {
        this.garbageCollect();
        this._frames[frameId] = frameWindow;
    },
    get: function (frameId) {
        return this._frames[frameId];
    },
    getAll: function () {
        return Object.values(this._frames);
    },
    garbageCollect: function() {
        for (var frameId in this._frames) {
            if (!Array.prototype.find.call(window.frames, f => this._frames[frameId] === f)) {
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
                    var payload = JSON.parse(str);
                    console.log('got message from iframe:', payload, event.data);
    
                    if (typeof event.data.messageId !== 'undefined') {
                        safari.self.addEventListener("message", listener);
                    }
    
                    // the correct tabId should already be there
                    safari.extension.dispatchMessage(payload.name, payload.value);
                
                    function listener(responseEvent) {
                        if (responseEvent.name === 'response' && responseEvent.message.messageId === event.data.messageId) {
                            console.log("sending a callback id", event.data.messageId);
                            txtCrypto.encrypt(JSON.stringify(responseEvent.message))
                                .then(function (e) {
                                    event.source.postMessage({ type: 'topee_iframe_response', value: e}, event.origin);
                                });
                            safari.self.removeEventListener(listener);
                        }
                    }
            });
        }
    });    
}

function sendMessage(frameId, message) {
    var win = childFrames.get(frameId);
    if (!win) {
        console.log('frame', frameId, 'not found');
        return;
    }
    txtCrypto.readyPromise
        .then(() => txtCrypto.encrypt(JSON.stringify(message)))
        .then(m => win.postMessage({ type: 'topee_iframe_request', value: m }, '*'));  // '*' is ok, it's encrypted
}

function broadcastMessage(message) {
    txtCrypto.readyPromise
        .then(() => txtCrypto.encrypt(JSON.stringify(message)))
        .then(m => childFrames.getAll().forEach(win => win.postMessage({ type: 'topee_iframe_request', value: m }, '*')));  // '*' is ok, it's encrypted
}


module.exports = {
    install: install,
    hasChild: function (frameId) { return !!frameId && !!childFrames.get(frameId); },
    forward: sendMessage,
    broadcast: broadcastMessage
};
