var bgPingCount = 0;

/* for describe() + body() */
var _tests = {};
var _currentSuite = null;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'test.whoami') {
        sendResponse({
          tabId: sender.tab.id,
          frameId: sender.frameId
        });
        return;
    }
    if (message.type === 'runtest') {
        return runtest(message.id, sender, sendResponse);
    }

    if (message.type === 'getDemoDlgBackground') {
        sendResponse(Math.random() >= 0.5 ? 'pink' : 'honeydew');
        setTimeout(function () {
            chrome.tabs.sendMessage(sender.tab.id, {type: 'changeDemoDlgBackground', value: Math.random() >= 0.5 ? 'lavender' : 'papayawhip' }, { frameId: sender.frameId });
        }, 3000);
    }

    if (message.type.indexOf('ping') != -1) {
        sendResponse("background pong #" + message.value);

        setTimeout(function () {
            chrome.tabs.sendMessage(sender.tab.id, {type: 'ping', value: ++bgPingCount }, { frameId: sender.frameId }, function (response)  {
                console.log(response);
            })
        }, 200);
    }
});

chrome.browserAction.onClicked.addListener(function () {
    chrome.tabs.create({ url: 'https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html'});
});

setTimeout(function () {
	chrome.tabs.query({ url: 'http://localhost:8000/ifra*'}, function (tabs) {
		tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {type: 'query'} ));
	});
}, 10000);

describe('jasmine setup', function () {
    body('sets and shuts down listeners', function () {
        chrome.runtime.onMessage.addListener(testResponse);
        setTimeout(function () { chrome.runtime.onMessage.removeListener(testResponse); }, 2000);

        function testResponse(message, sender, sendResponse) {
            switch (message.type) {
            case 'testMessage':
                sendResponse('testResponse');
                chrome.runtime.onMessage.removeListener(testResponse);
                break;
            }
        }
    });

    body('installs listeners correctly', function () {
        chrome.runtime.onMessage.addListener(testResponse);
        setTimeout(function () { chrome.runtime.onMessage.removeListener(testResponse); }, 2000);

        function testResponse(message, sender, sendResponse) {
            switch (message.type) {
            case 'testMessage':
                sendResponse('testResponse');
                chrome.runtime.onMessage.removeListener(testResponse);
                break;
            }
        }
    });

    body('invokes a background script function', function () {
        return new Promise(function (resolve) {
            chrome.tabs.query({}, resolve);
        });
    });
});

describe('background chrome.runtime.sendMessage', function () {
    body('is able to receive reply', function () {
        chrome.runtime.onMessage.addListener(testListener);
        setTimeout(function () { chrome.runtime.onMessage.removeListener(testListener); }, 2000);

        function testListener(message, sender) {
            if (message.type === 'test.backgroundRequestResponse') {
                chrome.tabs.sendMessage(sender.tab.id, {type: 'test.backgroundRequestResponse.request' }, {}, function (message) {
                    if (message === 'test.backgroundRequestResponse.response') {
                        // Let content script know that sendMessage callback has been called successfuly
                        chrome.tabs.sendMessage(sender.tab.id, {type: 'test.backgroundRequestResponse.success' }, {});
                        chrome.runtime.onMessage.removeListener(testListener);
                    }
                });
            }        
        }
    });

    body('is able to send broadcast message to all frames in specified tab', function (sender) {
        chrome.tabs.sendMessage(sender.tab.id, {type: 'testIframeTabBroadcast'});
    });
});

describe('chrome.tabs.query', function () {
    body('recognizes a new tab', function () {
        chrome.runtime.onMessage.addListener(testListener);
        setTimeout(function () { chrome.runtime.onMessage.removeListener(testListener); }, 2000);

        function testListener(message, sender, sendResponse) {
            if (message.type === 'test.query1') {
                chrome.tabs.query({}, sendResponse);
                return true;
            }
            if (message.type === 'test.query2') {
                chrome.tabs.query({}, sendResponse);
                chrome.runtime.onMessage.removeListener(testListener);
                return true;
            }
        }
    });

    body('recognizes a tab being closed', function () {
        chrome.runtime.onMessage.addListener(testListener);
        setTimeout(function () { chrome.runtime.onMessage.removeListener(testListener); }, 2000);

        function testListener(message, sender, sendResponse) {
            if (message.type === 'test.query1') {
                chrome.tabs.query({}, sendResponse);
                return true;
            }
            if (message.type === 'test.query2') {
                chrome.tabs.query({}, sendResponse);
                chrome.runtime.onMessage.removeListener(testListener);
                return true;
            }
        }
    });
});


/* background bodies of tests defined in content test.js */
function describe(name, describeBody) {
    _tests[name] = {};
    _currentSuite = _tests[name];
    describeBody();
}
  
function body(whatItDoes, testBody) {
    _currentSuite[whatItDoes] = testBody;
}
  
function runtest(id, sender, sendResponse) {
    var res = _tests[id.suite][id.test](sender);
    if (res && typeof res.then === 'function') {
        res.then(sendResponse);
        return true;
    }
    sendResponse(res);
    return false;
}
