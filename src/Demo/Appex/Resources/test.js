describe('jasmine setup', function () {
  it('sets and shuts down listeners', function (done) {
    chrome.runtime.sendMessage({ type: 'jasmine.setup', value: {
      'chrome.runtime.onMessage.addListener': {
        type: 'testMessage',
        response: 'testResponse'
      }
    }}, function (resp) {
      expect(Object.keys(resp).length).toBe(1);
      chrome.runtime.sendMessage({ type: 'jasmine.shutdown', value: resp}, function (resp) {
        expect(resp).toBe(1);
        done();
      });
    });
  });

  it('installs listeners correctly', function (done) {
    chrome.runtime.sendMessage({ type: 'jasmine.setup', value: {
      'chrome.runtime.onMessage.addListener': {
        type: 'testMessage',
        response: 'testResponse'
      }
    }}, function (listeners) {
      chrome.runtime.sendMessage({ type: 'testMessage'}, function(resp) {
        expect(resp).toBe('testResponse');
        chrome.runtime.sendMessage({ type: 'jasmine.shutdown', value: listeners});
        done();
      });
    });
  });
});
