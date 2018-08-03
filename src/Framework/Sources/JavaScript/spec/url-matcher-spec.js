var urlMatcher = require('../Background/url-matcher.js');

describe("urlMatcher", function () {
    it("should match prefix queries", function () {
        expect(urlMatcher.match('http://google.com/te*', 'http://google.com/test')).toBe(true);
    });
});
