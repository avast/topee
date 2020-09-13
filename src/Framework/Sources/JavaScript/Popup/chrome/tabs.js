var tabs = {};

tabs.query = function(queryInfo, callback) {
    window.topee.dispatchRequest(0, {
        eventName: 'tabs.query',
        queryInfo: queryInfo
    }, callback);
};

tabs.executeScript = function() {
    console.log('chrome.tabs.executeScript is not supported');
    var cb = arguments.length > 0 ? arguments[arguments.length - 1] : null;
    if (typeof cb === 'function') {
        cb();
    }
};

module.exports = tabs;
