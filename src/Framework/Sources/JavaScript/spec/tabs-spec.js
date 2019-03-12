describe('chrome.tabs.query', function () {
    const chrome = {
        tabs: require('../Background/chrome/tabs.js')
    };
    const noop = function () {};

    beforeEach(function () {
        spyOn(console, 'error');
    });

    it('warns about unsupported options', function () {
        chrome.tabs.query({ pinned: true }, noop);
        expect(console.error).toHaveBeenCalledWith('chrome.tabs.query "pinned" option is not supported');
    });

    it('warns about unsupported options only once', function () {
        chrome.tabs.query({ audible: true }, noop);
        chrome.tabs.query({ audible: true }, noop);
        chrome.tabs.query({ muted: true }, noop);
        expect(console.error).toHaveBeenCalledWith('chrome.tabs.query "audible" option is not supported');
        expect(console.error).toHaveBeenCalledWith('chrome.tabs.query "muted" option is not supported');
        expect(console.error.calls.count()).toBe(2);
    });

    it('does not warn about supported options', function () {
        chrome.tabs.query({ url: 'abc' }, noop);
        expect(console.error).not.toHaveBeenCalled();
    });

    it('warns about active option', function () {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, noop);
        expect(console.error).not.toHaveBeenCalled();
        chrome.tabs.query({ active: true }, noop);
        expect(console.error).toHaveBeenCalledWith('chrome.tabs.query "active" option is only valid in a conjunction with "lastFocusedWindow"');
    });
});
