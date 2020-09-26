// https://developer.chrome.com/extensions/i18n
var getSubstitutionsMessage = require('../../Common/i18n-getmessage.js');

var i18n = { _locale: {} };

i18n.getUILanguage = function () {
    return navigator.language;
};

i18n.getMessage = function (messageName, substitutions) {
    return getSubstitutionsMessage(i18n._locale, messageName, substitutions);
};

// TODO: Implementation
i18n.detectLanguage = function (text, callback) {
    callback({
        isReliable: true,
        languages: [
            {language: "en", percentage: 100}
        ]
    });
};

module.exports = i18n;
