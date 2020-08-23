module.exports = {
	browserAction: require('./browser-action.js'),
	contextMenus: require('./context-menus.js'),
	commands: require('./commands.js'),
	extension: require('./extension.js'),
	i18n: require('./i18n.js'),
	runtime: require('./runtime.js'),
	tabs: require('./tabs.js'),
	webRequest: require('./web-request.js'),
	webNavigation: require('./web-navigation.js'),
    windows: require('./windows.js'),
    storage: require('./storage.js'),
};
