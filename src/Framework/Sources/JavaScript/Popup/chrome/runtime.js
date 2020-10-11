var runtime = {};

runtime.sendMessage = function(message, callback) {
    window.topee.dispatchRequest(0, {
        eventName: 'sendMessage',
        message: message
    }, callback);
};

runtime.onMessage = {
    addListener: function () {},
    removeListener: function () {}
}

runtime.getURL = function (path) {
    return "topee://" + (path.startsWith('/') ? path.substr(1) : path);
};

runtime.id = 'topee://';  // in sync with POPUP_PROTOCOL@PopupViewCOntroller.swift

module.exports = runtime;
