'use strict';

const background = require('../background-bridge.js');

var tabs = {};

tabs.query = function(queryInfo, callback) {
    background.dispatchRequest({
        eventName: 'tabs.query',
        queryInfo: queryInfo
    }, callback);
};

module.exports = tabs;
