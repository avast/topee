if (window.location.href !== 'https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html') {
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
    var testIframeLoadedFuture = new Future();
    var testIframeTabBroadcastReplyFuture = new Future();
    var chromeBroadcastFuture = new Future();

    chrome.runtime.onMessage.addListener(chromeMessageListener);
    window.addEventListener('message', windowMessageListener);

    function chromeMessageListener (request) {
      if (request.type === 'testIframeTabBroadcast') {
        chromeBroadcastFuture.complete(true);
      }
    }

    function windowMessageListener (event) {
      if (event.data.type === 'testIframeLoaded') {
        testIframeLoadedFuture.complete(true);
      }
      if (event.data.type === 'testIframeTabBroadcastReply') {
        testIframeTabBroadcastReplyFuture.complete(true);
      }
    }

    var iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('testIframe.html');

    document.body.appendChild(iframe);

    await testIframeLoadedFuture.getValue();

    performOnBackground();

    var replies = await Promise.all([
      testIframeTabBroadcastReplyFuture.getValue(),
      chromeBroadcastFuture.getValue()]);
    expect(replies).toEqual([true, true]);

    window.removeEventListener('message', windowMessageListener);
    document.body.removeChild(iframe);
    chrome.runtime.onMessage.removeListener(chromeMessageListener);
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

function getCurrentTabId () {
  var tabIdFuture = new Future();
  chrome.runtime.sendMessage({type: 'test.whoami'}, ({tabId, frameId}) => {
    tabIdFuture.complete(tabId);
  });
  return tabIdFuture.getValue();
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
 