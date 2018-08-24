//
//  Copyright © 2018 Avast. All rights reserved.
//

import XCTest
@testable import Topee

class TopeePageRegistryTests: XCTestCase {
    private var registry: PageRegistry<TestPage>! = nil

    override func setUp() {
        super.setUp()
        registry = PageRegistry<TestPage>()
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }
    
    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
        super.tearDown()
    }
    
    private func buildTab(trace: Bool = false) -> TestTab {
        return TestTab(registry: registry, trace: trace)
    }
    
    func testAddsPage() {
        let tab1 = buildTab().navigate(url: "http://host1")
        
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [ tab1.id ])
    }
    
    func testAddsPages() {
        let tab1 = buildTab().navigate(url: "http://host1")
        let tab2 = buildTab().navigate(url: "http://host2")

        XCTAssertEqual(registry.count, 2)
        XCTAssertEqual(registry.tabIds.sorted(), [tab1.id!, tab2.id!].sorted())
    }
    
    func testRemovesPage() {
        buildTab().navigate(url: "http://host1").close()

        XCTAssertEqual(registry.count, 0)
        XCTAssertEqual(registry.tabIds, [])
    }
    
    func testDetectsPageNavigationAndKeepsSameTabId() {
        let tab1 = buildTab().navigate(url: "http://host1/abc").navigate(url: "http://host1")
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tab1.id])
    }

    func testDetectsPageNavigationAndKeepsSameTabIdOtherDomain() {
        let tab1 = buildTab().navigate(url: "http://host1/abc").navigate(url: "http://host2")
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tab1.id])
    }
    
    func testDetectsPageNavigationAndKeepsSameTabIdOtherDomainNoReferrer() {
        // Should be handled by history lenght matching
//        let tab1 = buildTab().navigate(url: "http://host1/abc", referrerPolicy: "no-referrer")
//            .navigate(url: "http://host2")
//        XCTAssertEqual(registry.count, 1)
//        XCTAssertEqual(registry.tabIds, [tab1.id])
    }
    
    func testOneByeOnlyMatchesFirstHelloForMatchingReferrer	() {
        let page1 = TestPage()
        registry.hello(page: page1, tabId: nil, referrer: "", historyLength: nil)
        registry.bye(page: page1, url: "http://host1/abc", historyLength: nil)
        
        // Navigation
        let page2 = TestPage()
        registry.hello(page: page2, tabId: nil, referrer: "http://host1/", historyLength: nil)

        // New, unrelated page (but for same domain as previous bye)
        let page3 = TestPage()
        registry.hello(page: page3, tabId: nil, referrer: "http://host1/", historyLength: nil)
        XCTAssertEqual(registry.count, 2)
    }
    
    func testPrefersTabIdOverReferrer() {
        let page1 = TestPage()
        registry.hello(page: page1, tabId: 1, referrer: "", historyLength: 1)
        registry.bye(page: page1, url: "http://host1/abc", historyLength: 1)
        
        // Navigation in other tab (with already assigned tabId which doesn't match previous bye
        let page2 = TestPage()
        registry.hello(page: page2, tabId: 2, referrer: "http://host1/", historyLength: 2)
        let tabId2 = registry.pageToTabId(page2)
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tabId2])
    }
    
    func testPrefersTabIdOverHistory() {
        let page1 = TestPage()
        registry.hello(page: page1, tabId: 1, referrer: "", historyLength: 1)
        registry.bye(page: page1, url: "http://host1", historyLength: 1)
        
        let page2 = TestPage()
        registry.hello(page: page2, tabId: 2, referrer: "", historyLength: 2)
        
        let tabId2 = registry.pageToTabId(page2)
        XCTAssertEqual(tabId2, 2)
    }
    
    func testNavigationWithKnownTabIdShouldClearByeHistory() {
        let page1 = TestPage()
        registry.hello(page: page1, tabId: 1, referrer: "", historyLength: 1)
        let tabId1 = registry.pageToTabId(page1)
        registry.bye(page: page1, url: "http://host1/abc", historyLength: 1)
        
        // Navigation (with known tabId)
        let page2 = TestPage()
        registry.hello(page: page2, tabId: 1, referrer: "http://host1/", historyLength: 2)

        // Following unrelated navigation with same referrer but unknown tabId
        let page3 = TestPage()
        registry.hello(page: page3, tabId: nil, referrer: "http://host1/", historyLength: 2)
        let tabId3 = registry.pageToTabId(page3)
        XCTAssertEqual(registry.count, 2)
        XCTAssertEqual(registry.tabIds.sorted(), [tabId1, tabId3])
    }
    
    func testHandlesUnrelatedNewPageAfterByeAsNewTab() {
        let page1 = TestPage()
        registry.hello(page: page1, tabId: nil, referrer: "", historyLength: 1)
        let tabId1 = registry.pageToTabId(page1)
        registry.bye(page: page1, url: "http://host1/abc", historyLength: 1)
        
        // New, unrelated page opened
        let page2 = TestPage()
        registry.hello(page: page2, tabId: nil, referrer: "http://host2/", historyLength: 1)
        let tabId2 = registry.pageToTabId(page2)
        XCTAssertNotEqual(tabId1, tabId2)
        XCTAssertEqual(registry.tabIds, [tabId2])
    }
    
    func testHandlesRelatedNavigationWithoutReferrer() {
        // Referrer may be missing if source page contains Referrer-Policy: no-referrer header
        let page1 = TestPage()
        registry.hello(page: page1, tabId: nil, referrer: "", historyLength: 1)
        let tabId1 = registry.pageToTabId(page1)
        registry.bye(page: page1, url: "http://host1/abc", historyLength: 1)
        
        // Navigation
        let page2 = TestPage()
        registry.hello(page: page2, tabId: nil, referrer: "", historyLength: 2)
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tabId1])
    }
}
