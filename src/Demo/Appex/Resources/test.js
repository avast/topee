if (!window.location.href.startsWith('https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html')) {
  throw 'invalid injection';  // this is injected anywhere despite the Info.plist settings
}

/* perform the test body() in the background script */
var _currentTest = null;
var _currentSuite = null;
function performOnBackground() {
  return new Promise(function (resolve) {
    chrome.runtime.sendMessage({type: 'runtest', id: { suite: _currentSuite.description, test: _currentTest.description } }, resolve);
  });
}
function performInIframe(iframe) {
  if (iframe instanceof HTMLIFrameElement) {
    iframe = iframe.contentWindow;
  }

  var suite = _currentSuite.description;
  var test = _currentTest.description;

  return new Promise(function (resolve) {
    window.addEventListener('message', responseListener);

    iframe.postMessage({
      type: 'iruntest',
      suite: suite,
      test: test
    }, '*');

    function responseListener(msg) {
      if (msg.source === iframe && msg.data.type === 'itestresponse' && msg.data.suite === suite && msg.data.test === test) {
        window.removeEventListener('message', responseListener);
        resolve(msg.data.value);
      }
    }
  });
}


function promise() {
  return promise._queue.pop();
}
promise._queue = [];
promise.callback = function (timeoutMs, timeoutValue) {
  var signal;
  var p = new Promise(function (resolve) {
    if (typeof timeoutMs !== 'undefined') {
      setTimeout(function () { resolve(timeoutValue); }, timeoutMs);
    }
    signal = resolve;
  });
  promise._queue.push(p);
  return signal;
}

class Future {
  constructor () {
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
    });
  }

  complete(value) {
    this._resolve(value);
  }

  async getValue() {
    return await this._promise;
  }
}

function timeoutAfter(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve('timeout'), ms);
  });
}

var thisTabIsBroken = false;

function createTestIframe() {
  if (thisTabIsBroken) {
    return Promise.reject('timeout');
  }

  return new Promise(function (resolve, reject) {
    var iframe = document.createElement('iframe');

    window.addEventListener('message', windowMessageListener);
    var t1sec = setTimeout(function () {
      thisTabIsBroken = true;
      window.removeEventListener('message', windowMessageListener);
      removeTestIframe(iframe);
      reject('timeout');
    }, 1000);

    iframe.src = chrome.runtime.getURL('testIframe.html');
    document.body.appendChild(iframe);

    function windowMessageListener (event) {
      if (event.data.type === 'testIframeLoaded') {
        clearTimeout(t1sec);
        window.removeEventListener('message', windowMessageListener);
        resolve(iframe);
      }
    }
  });
}

function removeTestIframe(iframe) {
  document.body.removeChild(iframe);
}

describe('jasmine setup', function () {
  it('sets and shuts down listeners', async function () {
    await performOnBackground();

    var startTime = Date.now();
    var resp = await promise(chrome.runtime.sendMessage({ type: 'testMessage' }, promise.callback()));
    var msgDuration = Date.now() - startTime;

    expect(resp).toBe('testResponse');

    resp = await promise(chrome.runtime.sendMessage({ type: 'testMessage' }, promise.callback(200 + 3 * msgDuration, 'timeout')));

    expect(resp).toBe('timeout');
  });

  it('installs listeners correctly', async function () {
    await performOnBackground();

    var resp = await promise(chrome.runtime.sendMessage({ type: 'testMessage' }, promise.callback()));

    expect(resp).toBe('testResponse');
  });

  it('invokes a background script function', async function () {
    var result = await performOnBackground();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('processes commands in iframes', async function () {
    var iframe;
    try {
      iframe = await createTestIframe();
    }
    catch (ex) {
      console.error(ex, 'Safari does this until #43230564@bugreport.apple.com is fixed');
      return;
    }
    var result = await performInIframe(iframe);
    expect(result).toBe('hello from iframe');
    removeTestIframe(iframe);
  })
});

describe('background chrome.runtime.sendMessage', function () {
  it('is able to receive reply', async function () {
    chrome.runtime.onMessage.addListener(onResponse);
    var success = new Future();

    await performOnBackground();

    chrome.runtime.sendMessage({ type: 'test.backgroundRequestResponse' });

    var result = await Promise.race([success.getValue(), timeoutAfter(500)]);

    chrome.runtime.onMessage.removeListener(onResponse);

    expect(result).toBe('success');

    function onResponse (message, sender, callback) {
      if (message.type === 'test.backgroundRequestResponse.request') {
        callback('test.backgroundRequestResponse.response');
      }

      if (message.type === 'test.backgroundRequestResponse.success') {
        success.complete('success');
      }
    }
  });

  it('is able to send broadcast message to all frames in specified tab', async function () {
    var iframe;
    try {
      iframe = await createTestIframe();
    }
    catch (ex) {
      console.error(ex, 'Safari does this until #43230564@bugreport.apple.com is fixed');
      return;
    }

    var iframeMessageReceived = performInIframe(iframe);

    var chromeBroadcastFuture = new Future();

    chrome.runtime.onMessage.addListener(chromeMessageListener);

    function chromeMessageListener (request) {
      if (request.type === 'testIframeTabBroadcast') {
        chrome.runtime.onMessage.removeListener(chromeMessageListener);
        chromeBroadcastFuture.complete(true);
      }
    }

    performOnBackground();

    var replies = await Promise.all([
      iframeMessageReceived,
      chromeBroadcastFuture.getValue()]);

    expect(replies).toEqual([true, true]);

    removeTestIframe(iframe);
  });
});

describe('chrome.tabs.query', function () {
  var initialTabs;
  var openTab;
  var cit = popupsEnabled() ? it : xit;

  function popupsEnabled() {
    if (!window.location.protocol.toLowerCase().startsWith('http')) {  // prevent infinite window.open() loop
      return false;
    }
    var w = window.open();
    if (w) {
      w.close();
    }

    return !!w;
  }

  beforeEach(function () {
    openTab = null;
  });

  afterEach(function () {
    if (openTab) {
      openTab.close();
      openTab = null;
    }
  });

  // TODO: this quite often fails and the new tab is not registered
  //      'closing an undetected tab' is then in  the background script console
  cit('recognizes a new tab', async function () {
    var result;

    await performOnBackground();

    initialTabs = await promise(chrome.runtime.sendMessage({ type: 'test.query1' }, promise.callback()));

    var url = 'https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html?q=' + (Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)).toString();
    openTab = window.open(url, 'README.md');

    // addEventListener('load') does not trigger in this case
    await promise(setTimeout(promise.callback(), 500));

    result = await promise(chrome.runtime.sendMessage({ type: 'test.query2' }, promise.callback()));

    expect(result.find(tab => tab.url === url)).not.toBeNull();
    expect(result.length).toBe(initialTabs.length + 1);
  });

  cit('recognizes a tab being closed', async function () {
    var result;

    var url = 'https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html?q=' + (Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)).toString();
    openTab = window.open(url, 'README.md');

    // the wait below is way enough, no need to also wait here
    performOnBackground();

    // addEventListener('load') does not trigger in this case
    await promise(setTimeout(promise.callback(), 500));

    initialTabs = await promise(chrome.runtime.sendMessage({ type: 'test.query1' }, promise.callback()));

    openTab.close();
    openTab = null;

    await promise(setTimeout(promise.callback(), 1000));

    result = await promise(chrome.runtime.sendMessage({ type: 'test.query2' }, promise.callback()));

    console.log('before');
    initialTabs.forEach(t => console.log(t.id, t.url));
    console.log('after');
    result.forEach(t => console.log(t.id, t.url));

    expect(result.find(tab => tab.url === url)).toBeUndefined();
    expect(result.length).toBe(initialTabs.length - 1);
  });
});

describe('chrome.tabs.update', function() {
  it('navigates to a new url', async function () {
    if (window.location.hash) {
      window.location = '#';
    }

    await performOnBackground();

    expect(window.location.hash).toBe('#chrome_tabs_update');

    window.location = '#';
  });
});

describe('iframe broadcast', function () {
  it('does not encrypt if there is no child iframe', async function () {
    spyOn(crypto.subtle, 'encrypt').and.callThrough();

    var messageReceived = new Promise(function (resolve) {
      chrome.runtime.onMessage.addListener(onMessage);
      function onMessage(msg) {
        if (msg.type === 'broadcasted') {
          chrome.runtime.onMessage.removeListener(onMessage);
          setTimeout(function () {
            resolve('message received');
          }, 0);
        }
      }
    });

    performOnBackground();

    await messageReceived;

    expect(crypto.subtle.encrypt).not.toHaveBeenCalled();
  });
});

const STORAGE_AREAS = ['local', 'sync']
for(const area of STORAGE_AREAS) {
    const storageArea = chrome.storage[area]
    describe(`chrome.storage.${area}`, function() {
        afterEach(function () {
          storageArea.clear();
        });

        it('sets and reads single key:value', function (done) {
            const key = randomString()
            const value = randomString()
            storageArea.set({ [key]: value })
            storageArea.get(key, (result) => {
                expect(result[key]).toEqual(value)
                done()
            })
        });

        it('gets array of keys', function (done) {
            const key1 = randomString()
            const key2 = randomString()
            const value1 = randomString()
            const value2 = randomString()
            storageArea.set({ [key1]: value1, [key2]: value2 })
            storageArea.get([key1, key2], (result) => {
                expect(result[key1]).toEqual(value1)
                expect(result[key2]).toEqual(value2)
                done()
            })
        });

        it('gets with default values if object passed', function (done) {
            const key1 = randomString()
            const key2 = randomString()
            const value1 = randomString()
            storageArea.set({ [key1]: value1 })
            storageArea.get({ [key1]: 'defaultValue', [key2]: 'defaultValue' }, (result) => {
                expect(result[key1]).toEqual(value1) // because we just wrote it
                expect(result[key2]).toEqual('defaultValue') // because it is empty in storage
                done()
            })
        });

        it('gets all keys', function (done) {
            const key = randomString()
            const value = randomString()
            storageArea.set({ [key]: value })
            storageArea.get((result) => {
                // key which we just set should be there
                expect(result[key]).toEqual(value)
                done()
            })
        });

        it('removes multiple keys i.e. storage.remove([key1,key2,key3])', function (done) {
            const key1 = randomString()
            const key2 = randomString()
            const value = randomString()
            storageArea.set({ [key1]: value, [key2]: value })
            storageArea.get((result) => {
                // keys which we just set should be there
                expect(result[key1]).toEqual(value)
                expect(result[key2]).toEqual(value)
                // now remove and check again
                storageArea.remove([key1, key2], () => {
                    storageArea.get((result) => {
                        // key which we set should not be there
                        expect(result[key1]).toEqual(undefined)
                        expect(result[key2]).toEqual(undefined)
                        done()
                    })
                })
            })
        });

        it('removes one key i.e. storage.remove(key1)', function (done) {
            const key = randomString()
            const value = randomString()
            storageArea.set({ [key]: value })
            storageArea.get((result) => {
                // key which we just set should be there
                expect(result[key]).toEqual(value)
                // now remove and check again
                console.log('before storageArea.remove')
                console.log(typeof key)
                storageArea.remove(key, () => {
                  console.log('after storageArea.remove')
                    storageArea.get((result) => {
                        // key which we set should not be there
                        expect(result[key]).toEqual(undefined)
                        done()
                    })
                })
            })
        });

        it('cleares all keys i.e. storage.clear()', function (done) {
            const key = randomString()
            const value = randomString()
            storageArea.set({ [key]: value })
            storageArea.get((result) => {
                // key which we just set should be there
                expect(result[key]).toEqual(value)
                // now remove and check again
                storageArea.clear(() => {
                    storageArea.get((result) => {
                        // storage should be empty
                        expect(Object.keys(result).length).toEqual(0)
                        done()
                    })
                })
            })
        });

        it('read/writes to correct storage area (regression test)', function (done) {
            const anotherArea = STORAGE_AREAS.filter(s => s !== area)[0]
            const key = randomString()
            const originalValue = randomString()
            const overridenValue = randomString()
            // just in case. to prevent false-positives
            expect(originalValue).not.toEqual(overridenValue)
            // write to main area first, then write same key to another area
            // if all writes go to same area then second command will be overwritten
            // so if it's not - then we are good
            storageArea.set({ [key]: originalValue })
            chrome.storage[anotherArea].set({ [key]: overridenValue })
            storageArea.get(key, (result) => {
                expect(result[key]).toEqual(originalValue)
                // just in case check another area
                chrome.storage[anotherArea].get(key, (result) => {
                    expect(result[key]).toEqual(overridenValue)
                    done()
                });
            })
        })
    });
}

describe('chrome.storage.onChanged', function() {
    it('get old and new values for each changed key', function (done) {
        const key = 'onchange-test-' + randomString()
        const value = randomString()
        chrome.storage.onChanged.addListener((changes, areaName) => {
            // other tests will trigger this callback, so we need a protection
            if (typeof changes[key] === 'undefined') {
                // console.warn('discarded', { key, changes }, { value }, key in changes,  typeof changes[key] )
                return
            }
            // LT uses areaName only in one place and i think we can skip it for now
            // because we don't support sync and/or managed
            expect(areaName).toEqual('local')
            expect(changes[key].oldValue).toEqual(null)
            expect(changes[key].newValue).toEqual(value)
            done()
        })
        chrome.storage.local.set({ [key]: value })
    });
});

describe('iframe message', function () {
  var skipTest = false;
  var iframe;

  beforeEach(async function () {
    try {
      iframe = await createTestIframe();
    }
    catch (ex) {
      iframe = null;
      skipTest = true;
      return;
    }
    skipTest = false;
  });

  afterEach(function () {
    if (iframe) {
      removeTestIframe(iframe);
    }
  });

  it('is received by the background script', async function () {
    if (skipTest) return;

    var bg = performOnBackground();
    performInIframe(iframe);

    expect(await bg).toBe('message received');
  });

  it('is received by the iframe when broadcasted to all frames', async function () {
    if (skipTest) return;

    var fr = performInIframe(iframe);
    performOnBackground();

    expect(await fr).toBe('message received');
  });

  it('is received by the iframe when targeted to an iframe', async function () {
    if (skipTest) return;

    var alsoGotTheMessage = false;

    chrome.runtime.onMessage.addListener(onMessage);
    performOnBackground();
    var fr = performInIframe(iframe);


    expect(await fr).toBe('message received');

    // the message has already reached the iframe, but rather wait a bit more
    await promise(setTimeout(promise.callback(), 100));

    expect(alsoGotTheMessage).toBe(false);

    function onMessage(msg) {
      if (msg.type === 'messageresponse') {
          chrome.runtime.onMessage.removeListener(onMessage);
          alsoGotTheMessage = true;
      }
    }
  });

  it('receives a response from the background script', async function () {
    if (skipTest) return;

    performOnBackground();
    var fr = performInIframe(iframe);

    expect(await fr).toBe('response received');
  });

  it('response is received by the background script', async function () {
    if (skipTest) return;

    performInIframe(iframe);
    var bg = performOnBackground();

    expect(await bg).toBe('response received');
  });

  it('receives only subscribed messages', async function () {
    if (skipTest) return;

    performOnBackground();
    var fr = performInIframe(iframe);

    expect(await fr).toBe(110);  // only detects up 9 wrong messages
  });

  it('does not leak callback listeners', async function () {
    if (skipTest) return;

    performOnBackground();
    var fr = performInIframe(iframe);

    expect(await fr).toBe(1);
  });
});

function getCurrentTabId () {
  var tabIdFuture = new Future();
  chrome.runtime.sendMessage({type: 'test.whoami'}, ({tabId, frameId}) => {
    tabIdFuture.complete(tabId);
  });
  return tabIdFuture.getValue();
}

function randomString() {
    return 'x' + Math.random().toString()
}

/* fill _currentTest and _currentSuite, used for background execution */
jasmine.getEnv().addReporter({
  jasmineDone: function () {},
  jasmineStarted: function () {},
  specDone: function () {},
  specStarted: function (desc) { _currentTest = desc; },
  suiteDone: function () {},
  suiteStarted: function (desc) { _currentSuite = desc; }
});
