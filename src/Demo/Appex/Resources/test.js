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
