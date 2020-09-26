module.exports = function getSubstitutionsMessage(dictionary, key, substitutions) {
    if (typeof substitutions !== 'undefined' && !Array.isArray(substitutions)) {
        substitutions = [ substitutions ];
    }

    var translation = dictionary[key];
    if (!translation || typeof translation.message === 'undefined') {
        return key;
    }

    if (typeof translation.message !== 'string' || !translation.placeholders) {
        return translation.message;
    }

    var replaced = translation.message;

    for (var placeholder in translation.placeholders) {
        var content = translation.placeholders[placeholder].content;
        var substIndex = typeof content === 'string' && content[0] === '$' && content.length > 1 ? parseInt(content.substr(1)) : 1;
        if (isNaN(substIndex)) {
            substIndex = 1;
        }
        --substIndex;
        var substitution = substitutions && substitutions.length > substIndex ? substitutions[substIndex] : '';

        // placeholders are case-insensitive
        var haystack = replaced.toLowerCase();
        var needle = '$' + placeholder.toLowerCase() + '$';
        var i;

        while ((i = haystack.indexOf(needle)) != -1) {
            replaced = replaced.substring(0, i) + substitution + replaced.substring(i + needle.length);
            haystack = replaced.toLowerCase();
        }
    }

    return replaced;
};
