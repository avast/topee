//
//  Copyright © 2018 Avast. All rights reserved.
//

import XCTest
@testable import Topee

class TopeePageRegistryTests: XCTestCase {
    
    typealias TestPage = NSObject
    
    override func setUp() {
        super.setUp()
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }
    
    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
        super.tearDown()
    }
    
    func testAddsPage() {
        let page = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page, tabId: 1, referrer: "")
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [ 1 ])
    }

    func testRemovesPage() {
        let page = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page, tabId: 1, referrer: "")
        registry.bye(page: page, url: "")
        XCTAssertEqual(registry.count, 0)
        XCTAssertEqual(registry.tabIds, [])
    }
    
    func testAddsPageWithoutTabId() {
        let page = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page, tabId: nil, referrer: "")
        XCTAssertEqual(registry.count, 1)
    }

    func testDetectsPageNavigationAndKeepsSameTabId() {
        let page1 = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page1, tabId: nil, referrer: "")
        let tabId = registry.pageToTabId(page1)
        registry.bye(page: page1, url: "http://host1/abc")

        // Navigation
        let page2 = TestPage()
        registry.hello(page: page2, tabId: nil, referrer: "http://host1/")
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tabId])
    }

    func testOneByeOnlyMatchesFirstHelloForMatchingReferrer	() {
        let page1 = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page1, tabId: nil, referrer: "")
        registry.bye(page: page1, url: "http://host1/abc")
        
        // Navigation
        let page2 = TestPage()
        registry.hello(page: page2, tabId: nil, referrer: "http://host1/")

        // New, unrelated page (but for same domain as previous bye)
        let page3 = TestPage()
        registry.hello(page: page3, tabId: nil, referrer: "http://host1/")
        XCTAssertEqual(registry.count, 2)
    }
    
    func testPrefersTabIdOverReferrer() {
        let page1 = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page1, tabId: 1, referrer: "")
        registry.bye(page: page1, url: "http://host1/abc")
        
        // Navigation in other tab (with already assigned tabId which doesn't match previous bye
        let page2 = TestPage()
        registry.hello(page: page2, tabId: 2, referrer: "http://host1/")
        let tabId2 = registry.pageToTabId(page2)
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tabId2])
    }
    
    func testNavigationWithKnownTabIdShouldClearByeHistory() {
        let page1 = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page1, tabId: 1, referrer: "")
        let tabId1 = registry.pageToTabId(page1)
        registry.bye(page: page1, url: "http://host1/abc")
        
        // Navigation (with known tabId)
        let page2 = TestPage()
        registry.hello(page: page2, tabId: 1, referrer: "http://host1/")

        // Following unrelated navigation with same referrer but unknown tabId
        let page3 = TestPage()
        registry.hello(page: page3, tabId: nil, referrer: "http://host1/")
        let tabId3 = registry.pageToTabId(page3)
        XCTAssertEqual(registry.count, 2)
        XCTAssertEqual(registry.tabIds.sorted(), [tabId1, tabId3])
    }
    
    func testHandlesUnrelatedNewPageAfterByeAsNewTab() {
        let page1 = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page1, tabId: nil, referrer: "")
        let tabId1 = registry.pageToTabId(page1)
        registry.bye(page: page1, url: "http://host1/abc")
        
        // New, unrelated page opened
        let page2 = TestPage()
        registry.hello(page: page2, tabId: nil, referrer: "http://host2/")
        let tabId2 = registry.pageToTabId(page2)
        XCTAssertNotEqual(tabId1, tabId2)
        XCTAssertEqual(registry.tabIds, [tabId2])
    }
    
    func testHandlesRelatedNavigationWithoutReferrer() {
        // Referrer may be missing if source page contains Referrer-Policy: no-referrer header
        let page1 = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page1, tabId: nil, referrer: "")
        let tabId1 = registry.pageToTabId(page1)
        registry.bye(page: page1, url: "http://host1/abc", historyLength: 1)
        
        // Navigation
        let page2 = TestPage()
        registry.hello(page: page2, tabId: nil, referrer: "", historyLength: 2)
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tabId1])
    }
    


}

class TopeeTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }
    
    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
        super.tearDown()
    }
    
    func testExample() {
        // This is an example of a functional test case.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
    }
    
    func testPerformanceExample() {
        // This is an example of a performance test case.
        self.measure {
            // Put the code you want to measure the time of here.
        }
    }
    
}
