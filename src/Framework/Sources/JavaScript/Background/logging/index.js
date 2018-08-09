var logBuffer = [];
var methods = ['trace', 'debug', 'info', 'warn', 'error', 'log'];

function captureConsole () {
    var original = methods.reduce((result, method) => {
        result[method] = console[method];
        return result;
    }, {});

    methods.forEach(method => {
        console[method] = function () {
            logBuffer.push({
                method: method,
                arguments: arguments
                // TODO: capture file/line
            });
            original[method].apply(null, arguments);

            // Forward log message to Swift side so that it appears in Xcode console
            window.webkit.messageHandlers.log.postMessage({
                type: 'log',
                level: method,
                message: [...arguments].join(' ')
            });
        };
    });

    console.flush = function () {
        original.log('%c >>>> ', 'background: #222; color: #AED6F1', 'Flushing collected logs...');

        // Dump collected messages
        logBuffer.forEach(item => original[item.method].apply(undefined, item.arguments));

        // Restore original console methods
        methods.forEach(method => console[method] = original[method]);
        console.flush = undefined;

        original.debug('%c >>>> ', 'background: #222; color: #AED6F1', '...done');
    };
}

module.exports = {
    setup: function () {
        captureConsole();
    }
};
