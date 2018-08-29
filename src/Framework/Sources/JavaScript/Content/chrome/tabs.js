'use strict';

const tabInfo = require('../tabInfo.js');

var tabs = {};

// TODO: Implementation
tabs.query = function(queryInfo, callback) {
    tabInfo.tabId.then(tabId => {
        callback([
            {
                id: tabId,
                url: window.location.href
            }
        ]);
    });
};

module.exports = tabs;
