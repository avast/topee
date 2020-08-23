var runtime = {};

runtime.sendMessage = function(message, callback) {
    window.topee.dispatchRequest(0, {
        eventName: 'sendMessage',
        message: message
    }, callback);
};

runtime.id = 'topee://';  // in sync with POPUP_PROTOCOL@PopupViewCOntroller.swift

module.exports = runtime;
