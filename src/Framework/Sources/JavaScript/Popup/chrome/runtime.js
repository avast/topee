var runtime = {};

runtime.sendMessage = function(message, callback) {
    window.topee.dispatchRequest(0, {
        eventName: 'sendMessage',
        message: message
    }, callback);
};

module.exports = runtime;
