if (window.location.href !== 'https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html') {
  throw 'invalid injection';  // this is injected anywhere despite the Info.plist settings
}

function promise() {
  return promise._queue.pop();
}
promise._queue = [];
promise.callback = function () {
  var signal;
  var p = new Promise(function (resolve) {
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
    var resp = await promise(chrome.runtime.sendMessage({ type: 'test.setupListeners', value: {
      'chrome.runtime.onMessage.addListener': {
        type: 'testMessage',
        response: 'testResponse'
      }
    }}, promise.callback()));

    expect(Object.keys(resp).length).toBe(1);

    resp = await promise(chrome.runtime.sendMessage({ type: 'test.shutdownListeners', value: resp}, promise.callback()));

    expect(resp).toBe(1);
  });

  it('installs listeners correctly', async function () {
    var listeners = await promise(chrome.runtime.sendMessage({ type: 'test.setupListeners', value: {
      'chrome.runtime.onMessage.addListener': {
        type: 'testMessage',
        response: 'testResponse'
      }
    }}, promise.callback()));

    var resp = await promise(chrome.runtime.sendMessage({ type: 'testMessage'}, promise.callback()));

    expect(resp).toBe('testResponse');

    chrome.runtime.sendMessage({ type: 'test.shutdownListeners', value: listeners});
  });

  it('invokes a background script function', async function () {
    var result = await promise(chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
      name: 'chrome.tabs.query',
      arguments: {},
      wantCallback: true
    }}, promise.callback()));

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('background', function () {
  describe('chrome.runtime.sendMessage', function () {
    it('is able to receive reply', async function () {
      chrome.runtime.onMessage.addListener(response);

      await promise(chrome.runtime.sendMessage({ type: 'test.backgroundRequestResponse' }, promise.callback()));

      chrome.runtime.onMessage.removeListener(response);

      var success = new Future();
      var result = await Promise.race([success.getValue(), timeoutAfter(500)]);
      expect(result).toBe('success');

      function response (message, sender, callback) {
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
      var tabId = await getCurrentTabId();

      chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
        name: 'chrome.tabs.sendMessage',
        arguments: [tabId, {type: 'testIframeTabBroadcast'}],
        wantCallback: false
      }});

      var replies = await Promise.all([
        testIframeTabBroadcastReplyFuture.getValue(),
        chromeBroadcastFuture.getValue()]);
      expect(replies).toEqual([true, true]);

      window.removeEventListener('message', windowMessageListener);
      document.body.removeChild(iframe);
      chrome.runtime.onMessage.removeListener(chromeMessageListener);
    });
  });
});

describe('chrome.tabs', function () {
  describe('query', function () {
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

    cit('recognizes a new tab', async function () {
      var result;

      initialTabs = await promise(chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
        name: 'chrome.tabs.query',
        arguments: {},
        wantCallback: true
      }}, promise.callback()));

      var url = 'https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html?q=' + (Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)).toString();
      openTab = window.open(url, 'README.md');

      // addEventListener('load') does not trigger in this case
      await promise(setTimeout(promise.callback(), 300));

      result = await promise(chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
        name: 'chrome.tabs.query',
        arguments: {},
        wantCallback: true
      }}, promise.callback()));

      expect(result.find(tab => tab.url === url)).not.toBeNull();
      expect(result.length).toBe(initialTabs.length + 1);
    });

    cit('recognizes a tab being closed', async function () {
      var result;

      var url = 'https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html?q=' + (Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)).toString();
      openTab = window.open(url, 'README.md');

      // addEventListener('load') does not trigger in this case
      await promise(setTimeout(promise.callback(), 300));

      initialTabs = await promise(chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
        name: 'chrome.tabs.query',
        arguments: {},
        wantCallback: true
      }}, promise.callback()));

      openTab.close();
      openTab = null;
      
      result = await promise(chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
        name: 'chrome.tabs.query',
        arguments: {},
        wantCallback: true
      }}, promise.callback()));

      console.log('before');
      initialTabs.forEach(t => console.log(t.id, t.url));
      console.log('after');
      result.forEach(t => console.log(t.id, t.url));

      expect(result.find(tab => tab.url === url)).toBeUndefined();
      expect(result.length).toBe(initialTabs.length - 1);
    });
  });
});

function getCurrentTabId () {
  var tabIdFuture = new Future();
  chrome.runtime.sendMessage({type: 'test.whoami'}, ({tabId, frameId}) => {
    tabIdFuture.complete(tabId);
  });
  return tabIdFuture.getValue();
}
