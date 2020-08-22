var tabs = {};

tabs.query = function(message, callback) {
    window.topee.dispatchRequest(0, {
        eventName: 'tabs.query',
        message: message
    }, callback);
};

module.exports = tabs;
