(function () {
'use strict';

var TextCrypto = require('../Common/text-crypto.js');

var txtCrypto = null;
var buffer = [];
var freshListeners = {};
var pendingResponseListeners = [];

if (typeof window.ApplePayError === 'undefined' && typeof window.WebKitNamespace === 'undefined') {
    return;  // not safari
}

if (typeof safari === 'undefined')
    window.safari = {};

if (typeof safari.extension === 'undefined')
    safari.extension = {};

if (typeof safari.self === 'undefined')
    safari.self = {};

if (typeof safari.extension.dispatchMessage === 'undefined') {
    safari.extension.dispatchMessage = txtCrypto ? dispatchMessage : bufferMessage;
}

if (typeof safari.self.addEventListener === 'undefined') {
    safari.self.addEventListener = function (type, callback) {
        if (type !== 'message') {
            console.error('Unexpected message listener:', type);
            return;
        }

        if (callback && callback.messageId) {
            freshListeners[callback.messageId] = true;
            setTimeout(function () {
                delete freshListeners[callback.messageId];
            }, 1000);  // to prevent leaks
        }

        pendingResponseListeners.push({ type: type, safariCallback: callback, decryptingCallback: decryptingCallback });
        window.addEventListener('message', decryptingCallback);

        function decryptingCallback(event) {
            if (event.data && event.data.type === 'topee_iframe_response') {
                txtCrypto.decrypt(event.data.value)
                    .then(function (str) {
                        var payload = JSON.parse(str);

                        if (payload.messageId === callback.messageId)  {
                            window.removeEventListener('message', callback);
                            callback({ name: payload.eventName, message: { messageId: payload.messageId, payload: payload.payload } });
                        }
                });
            }
            else if (event.data && event.data.type === 'topee_iframe_request') {
                txtCrypto.decrypt(event.data.value)
                    .then(function (str) {
                        var payload = JSON.parse(str);

                        callback({ name: payload.eventName, message: { messageId: payload.messageId, payload: payload.payload } });
                });
            }
        }
    };

    safari.self.removeEventListener = function(type, callback) {
        var i = pendingResponseListeners.findIndex(function (p) {
            return p.type === type && p.safariCallback === callback;
        });
        if (i != -1) {
            window.removeEventListener('message', pendingResponseListeners[i].decryptingCallback);
            pendingResponseListeners.splice(i, 1);
        }
        else {
            window.topee_log && console.log('listener for', type, 'not found');
        }
    };
}

window.addEventListener('message', function (event) {
    if (event.data.type === 'topee_iframe_key' && event.data.value) {
        if (txtCrypto) {
            console.error('cannot overwrite encryption key');
            return;
        }

        txtCrypto = new TextCrypto(event.data.value);
        txtCrypto.readyPromise
            .then(function () {
                safari.extension.dispatchMessage = dispatchMessage;
                while (buffer.length > 0) {
                    dispatchMessage.apply(window, buffer.shift());
                }
            })
            .catch(function (ex) {
                console.error(ex);
                txtCrypto = null;
            });
    }
});

var tabInfo = require('../Content/tabInfo.js');
tabInfo.init();

window.parent.postMessage({ type: 'topee_get_iframe_key', frameId: tabInfo.frameId }, '*');

window.chrome = require('../Content/chrome/index.js');


function bufferMessage(name, value) {
    buffer.push([ name, value ]);
}

function dispatchMessage(name, value) {
    var messageId = null;

    if (value && value.payload) {
        messageId = value.payload.messageId;

        if (typeof messageId === 'undefined' || !freshListeners[messageId]) {
            messageId = null;
        }

        delete freshListeners[messageId];
    }

    txtCrypto.encrypt(JSON.stringify({ name: name, value: value }))
        .then(function (e) {
            var msg = { type: 'topee_iframe_request', value: e };
            if (messageId !== null) {
                msg.messageId = messageId;  // to indicate that a response is awaited
            }
            window.topee_log && console.log('sending', msg);
            window.parent.postMessage(msg, '*');
        });
}

})();
