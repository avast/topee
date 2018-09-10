// https://developer.chrome.com/extensions/i18n

var i18n = {};

i18n.getUILanguage = function () {
    return navigator.language;
};

// TODO: Implementation
// this may be impossible to implement nicely:
// * either you have to include the language files in Info.plist for content scripts and reference them for resource iframes
// * or you cannot call getMessage before the translations are loaded
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
