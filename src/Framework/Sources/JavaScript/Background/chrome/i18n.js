// https://developer.chrome.com/extensions/i18n

var i18n = { _locales: {} };

i18n.getUILanguage = function () {
    return navigator.language;
};

var DEFAULT_LOC = 'en';

function getLocale() {
    var langCode = i18n.getUILanguage().replace(/-/g, '_');

    if (i18n._locales[langCode]) {
        return langCode;
    }

    var parts = langCode.split('_');
    var shortCode = parts.shift().toLowerCase();
    var loUP = shortCode + '_' + parts.map(function (p) { return p.toUpperCase(); }).join('_');

    if (i18n._locales[loUP]) {
        return loUP;
    }

    if (i18n._locales[shortCode]) {
        return shortCode;
    }

    var long = Object.keys(i18n._locales).find(function (l) { return l.startsWith(shortCode); });
    if (long) {
        return long;  // this would return e.g. pt_BR for pt. not that great, but better than en
    }

    return DEFAULT_LOC;
}

i18n.getMessage = function (messageName) {
    var translation = i18n._locales[getLocale()] && i18n._locales[getLocale()][messageName];
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
