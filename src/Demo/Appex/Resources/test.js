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
