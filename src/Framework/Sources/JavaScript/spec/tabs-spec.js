describe('chrome.tabs.query', function () {
    const chrome = {
        tabs: require('../Background/chrome/tabs.js')
    };

    beforeEach(function () {
        spyOn(console, 'error');
    });

    it('warns about unsupported options', function (done) {
        chrome.tabs.query({ pinned: true }, function () {
            expect(console.error).toHaveBeenCalledWith('chrome.tabs.query "pinned" option is not supported');
            done();
        });
    });

    it('warns about unsupported options only once', function (done) {
        var numResults = 0;
        chrome.tabs.query({ audible: true }, collect);
        chrome.tabs.query({ audible: true }, collect);
        chrome.tabs.query({ muted: true }, collect);

        function collect() {
            if (++numResults == 3) {
                expect(console.error).toHaveBeenCalledWith('chrome.tabs.query "audible" option is not supported');
                expect(console.error).toHaveBeenCalledWith('chrome.tabs.query "muted" option is not supported');
                expect(console.error.calls.count()).toBe(2);    
                done();    
            }
        }
    });

    it('does not warn about supported options', function (done) {
        chrome.tabs.query({ url: 'abc' }, function () {
            expect(console.error).not.toHaveBeenCalled();
            done();
        });
    });

    it('warns about active option', function (done) {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function () {
            expect(console.error).not.toHaveBeenCalled();
            chrome.tabs.query({ active: true }, function () {
                expect(console.error).toHaveBeenCalledWith('chrome.tabs.query "active" option is only valid in a conjunction with "lastFocusedWindow"');
                done();
            });
        });
    });
});
