// https://developer.chrome.com/extensions/i18n

var i18n = {};

// TODO: Implementation
i18n.getUILanguage = function () {
    return "en-GB";
};

// TODO: Implementation
i18n.getMessage = function (messageName) {
    return messageName;
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
