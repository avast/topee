describe('jasmine setup', function () {
  it('sets and shuts down listeners', function (done) {
    chrome.runtime.sendMessage({ type: 'test.setupListeners', value: {
      'chrome.runtime.onMessage.addListener': {
        type: 'testMessage',
        response: 'testResponse'
      }
    }}, function (resp) {
      expect(Object.keys(resp).length).toBe(1);
      chrome.runtime.sendMessage({ type: 'test.shutdownListeners', value: resp}, function (resp) {
        expect(resp).toBe(1);
        done();
      });
    });
  });

  it('installs listeners correctly', function (done) {
    chrome.runtime.sendMessage({ type: 'test.setupListeners', value: {
      'chrome.runtime.onMessage.addListener': {
        type: 'testMessage',
        response: 'testResponse'
      }
    }}, function (listeners) {
      chrome.runtime.sendMessage({ type: 'testMessage'}, function(resp) {
        expect(resp).toBe('testResponse');
        chrome.runtime.sendMessage({ type: 'test.shutdownListeners', value: listeners});
        done();
      });
    });
  });

  it('invokes a background script function', function (done) {
    chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
      name: 'chrome.tabs.query',
      arguments: {},
      wantCallback: true
    }}, function (result) {
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      done();
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

    beforeEach(function (done) {
      openTab = null;
    });

    afterEach(function () {
      if (openTab) {
        openTab.close();
        openTab = null;
      }
    });

    cit('recognizes a new tab', function (done) {
      chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
        name: 'chrome.tabs.query',
        arguments: {},
        wantCallback: true
      }}, function (result) {
        console.log('got tabs', result);
        initialTabs = result;

        var url = 'https://raw.githubusercontent.com/avast/topee/master/README.md?q=' + (Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)).toString();
        openTab = window.open();
        // addEventListener('load') does not trigger in this case
        setTimeout(function () {
          console.log('openTab loaded');
          chrome.runtime.sendMessage({ type: 'test.backgroundInvoke', value: {
            name: 'chrome.tabs.query',
            arguments: {},
            wantCallback: true
          }}, function (result) {
            console.log('updated tabs', result);
            expect(result.find(tab => tab.url === url)).not.toBeNull();
            expect(result.length).toBe(initialTabs.length + 1);
            done();
          });
        }, 100);
        console.log('assigning location to', url);
        openTab.location = url;
      });
    });
  });
});
