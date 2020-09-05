// https://developer.chrome.com/extensions/i18n

var i18n = { _locale: {} };

i18n.getUILanguage = function () {
    return navigator.language;
};

i18n.getMessage = function (messageName) {
    var translation = i18n._locale[messageName];
    if (!translation || typeof translation.message === 'undefined') {
        return messageName;
    }
    return translation.message;
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
