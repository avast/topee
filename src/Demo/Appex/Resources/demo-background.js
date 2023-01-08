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

describe('chrome.tabs.update', function() {
    body('navigates to a new url', function (sender) {
        return new Promise(function (resolve) {
            chrome.tabs.update(sender.tab.id, { url: '#chrome_tabs_update' }, resolve);
        });
    });
});  

describe('iframe broadcast', function () {
    body('does not encrypt if there is no child iframe', function (sender) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'broadcasted' });  // no frameId
    });
});

describe('iframe message', function () {
    body('is received by the background script', function () {
        return new Promise(function (resolve) {
            chrome.runtime.onMessage.addListener(onMessage);
            function onMessage(msg) {
                if (msg.type === 'responseless') {
                    chrome.runtime.onMessage.removeListener(onMessage);
                    resolve('message received');
                }
            }
        });
    });

    body('is received by the iframe when broadcasted to all frames', function (sender) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'responseless' });
    });

    body('is received by the iframe when targeted to an iframe', function () {
        chrome.runtime.onMessage.addListener(onMessage);

        function onMessage(msg, sender) {
            if (msg.type === 'responsemessage') {
                chrome.runtime.onMessage.removeListener(onMessage);
                setTimeout(function () {
                    chrome.tabs.sendMessage(sender.tab.id, { type: 'messageresponse' }, { frameId: sender.frameId });
                }, 20);
            }
        }
    });

    body('receives a response from the background script', function () {
        chrome.runtime.onMessage.addListener(onMessage);
        function onMessage(msg, sender, sendResponse) {
            if (msg.type === 'responseful') {
                chrome.runtime.onMessage.removeListener(onMessage);
                setTimeout(function () {  // deferred sendResponse
                    sendResponse('response received');
                }, 20);
                return true;
            }
        }    
    });

    body('response is received by the background script', function (sender) {
        return new Promise(function (resolve) {
            chrome.tabs.sendMessage(sender.tab.id, { type: 'responseful' }, resolve);
        });        
    });

    body('receives only subscribed messages', async function () {
        chrome.runtime.onMessage.addListener(onTrigger);

        function onTrigger(msg, sender) {
            if (msg.type !== 'trigger') {
                return;
            }

            chrome.runtime.onMessage.removeListener(onTrigger);

            chrome.tabs.sendMessage(sender.tab.id, { type: 'triggerresponse' }, { frameId: sender.frameId });
        }
    });

    body('does not leak callback listeners', function () {
        var callCount = 0;
        chrome.runtime.onMessage.addListener(onMessage)

        function onMessage(msg, sender, sendResponse) {
            if (msg.type === 'callbackornot') {
                sendResponse(1);
                if (++callCount === 3) {
                    chrome.runtime.onMessage.removeListener(onMessage);
                }
            }
        }
    });
});

describe('chrome.runtime.getManifest', function () {
    body('returns the content_scripts in the background script', function () {
        return chrome.runtime.getManifest();
    });
});

describe('chrome.storage.session', function() {
    function randomString() {
        return 'x' + Math.random().toString()
    }

    body('sets and reads single key:value', async function () {
        const key = randomString();
        const value = randomString();
        await chrome.storage.session.set({ [key]: value });
        const r = await chrome.storage.session.get(key);
        return r && r[key] === value;
    });

    body('gets array of keys', async function () {
        const key1 = randomString();
        const key2 = randomString();
        const value1 = randomString();
        const value2 = randomString();
        await chrome.storage.session.set({ [key1]: value1, [key2]: value2 });
        const result = await chrome.storage.session.get([key1, key2]);
        return result[key1] == value1 && result[key2] == value2;
    });

    body('removes multiple keys', async function () {
        const key = randomString();
        const value = randomString();
        await chrome.storage.session.set({ [key]: value });
        await chrome.storage.session.remove(key);
        const r = await chrome.storage.session.get(key);
        return r && r[key] === null;
    });

    body('clears storage area', async function () {
        const key = randomString();
        const value = randomString();
        await chrome.storage.session.set({ [key]: value });
        await chrome.storage.session.clear();
        const contents = await chrome.storage.session.get();
        return Object.keys(contents).length === 0;
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
