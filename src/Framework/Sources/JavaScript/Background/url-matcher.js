'use strict';

function matchUrlPattern(pattern, url) {
	// matches: google.com/*
	var components = pattern.split('*');
	var isPrefixPattern = components.length === 2 && components[1] === "";
	return isPrefixPattern && url.startsWith(components[0]);
}

module.exports = {
	match: matchUrlPattern
}
