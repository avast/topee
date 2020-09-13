var tabs = {};

tabs.query = function(queryInfo, callback) {
    window.topee.dispatchRequest(0, {
        eventName: 'tabs.query',
        queryInfo: queryInfo
    }, callback);
};

module.exports = tabs;
