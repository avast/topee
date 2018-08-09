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
            original[method].apply(console, arguments);

            // Forward log message to Swift side so that it appears in Xcode console
            window.webkit.messageHandlers.log.postMessage({
                type: 'log',
                level: method,
                message: [...arguments].join(' ')
            });
        };
    });

    return function () {
        original.log('%c >>>> ', 'background: #222; color: #AED6F1', 'Flushing collected logs...');

        // Dump collected messages
        logBuffer.forEach(item => original[item.method].apply(undefined, item.arguments));

        // Restore original console methods
        methods.forEach(method => console[method] = original[method]);
        console.flush = undefined;

        original.debug('%c >>>> ', 'background: #222; color: #AED6F1', '...done');
    };
}

function captureErrors () {
    function onError (error) {
        console.error.call(console, error.message);
    };

    window.addEventListener('error', onError);

    return () => window.removeEventListener('error', onError);
}

module.exports = {
    setup: function () {
        var removeErrorCapturer = captureErrors();
        var logsFlushFn = captureConsole();

        console.flush = function () {
            removeErrorCapturer();
            logsFlushFn();
        };
    }
};
