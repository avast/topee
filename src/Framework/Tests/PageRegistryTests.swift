//
//  Copyright © 2018 Avast. All rights reserved.
//

@testable import Topee
import XCTest

class PageRegistryTests: XCTestCase {
    private var registry: PageRegistry<TestPage>!

    override func setUp() {
        super.setUp()
        registry = PageRegistry<TestPage>(thread: Thread.current)
    }

    override func tearDown() {
        super.tearDown()
    }

    private func buildTab(trace: Bool = true, assertTabId: Bool = true) -> TestTab {
        return TestTab(registry: registry,
                       trace: trace,
                       assertTabId: assertTabId)
    }

    func testEachNewTabIsRegistered() {
        let tab1 = buildTab().navigate(url: "http://host1")
        let tab2 = buildTab().navigate(url: "http://host2")

        XCTAssertEqual(registry.count, 2)
        XCTAssertEqual(registry.tabIds.sorted(), [tab1.id!, tab2.id!].sorted())
    }

    func testClosedPageIsRemoved() {
        buildTab().navigate(url: "http://host1").close()

        XCTAssertEqual(registry.count, 0)
        XCTAssertEqual(registry.tabIds, [])
    }

    func testPageNavigationInTabKeepsSameTabId() {
        let tab1 = buildTab().navigate(url: "http://host1/1")
            .navigate(url: "http://host1/2")
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tab1.id])
    }

    func testPageNavigationInTabKeepsSameTabIdOtherDomain() {
        let tab1 = buildTab().navigate(url: "http://host1/abc")
            .navigate(url: "http://host2/")
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tab1.id])
    }

    func testByeIsOnlyMatchedOnce() {
        // Say bye from host1 and consume it right away in hellow
        buildTab().navigate(url: "http://host1/abc").navigate(url: "http://host2/")

        // New, unrelated page (but for same domain as previous bye)
        buildTab().navigate(url: "http://host1/")

        XCTAssertEqual(registry.count, 2)
    }

    func testLatestMatchingByeIsChosen() {
        let tab1 = buildTab().navigate(url: "http://host1/").navigate(url: "http://host2/")
        let tab2 = buildTab().navigate(url: "http://host1/").navigate(url: "http://host2/")

        tab2.navigate(url: "http://host3/") { bye2, hello2 in
            tab1.close()
            bye2()
            hello2()
        }

        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tab2.id!])
    }

    func testUsesSessionStorageForTabIdPersistence() {
        let tab1 = buildTab().navigate(url: "http://host1/a")
        let tab2 = buildTab().navigate(url: "http://host1/a")

        // Both tabs navigate from same origin, but tab2 is faster
        tab1.navigate(url: "http://host1/b") { bye1, hello1 in
            tab2.navigate(url: "http://host1/b") { bye2, hello2 in
                bye2()
                bye1()
                hello2()
                hello1()
            }
        }

        // They both should keep their IDs
        XCTAssertNotEqual(tab1.id!, tab2.id!)
    }

    func testTabsMayGetMixedIfTabIdIsntInSession() {
        let tab1 = buildTab(assertTabId: false).navigate(url: "http://host1/")
        let tab2 = buildTab(assertTabId: false).navigate(url: "http://host1/")
        let tab1IdStart = tab1.id!
        let tab2IdStart = tab2.id!

        // Both tabs navigate from same origin, but tab2 is faster (+ cross origin)
        tab1.navigate(url: "http://host2/a") { bye1, hello1 in
            tab2.navigate(url: "http://host2/b") { bye2, hello2 in
                bye2()
                bye1()
                hello2()
                hello1()
            }
        }

        // Unfortunatelly tab IDs get mixed
        XCTAssertEqual(tab1IdStart, tab2.id!)
        XCTAssertEqual(tab2IdStart, tab1.id!)
    }

    func testHandlesNavigationInATabAfterCloseOfOtherTab() {
        let tab1 = buildTab().navigate(url: "http://host1/")
        let tab2 = buildTab().navigate(url: "http://host1/")

        tab1.close()
        tab2.navigate(url: "http://host2/")

        XCTAssertNotEqual(tab1.id, tab2.id)
        XCTAssertEqual(registry.tabIds, [tab2.id])
    }

    func testHandlesRelatedNavigationWithoutReferrer() {
        let tab1 = buildTab().navigate(url: "http://host1/", referrerPolicy: .noReferrer)

        tab1.navigate(url: "http://host2/")

        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tab1.id!])
    }

    func testUsesHistoryLengthToExcludeByeMatches() {
        let tab1 = buildTab()
            .navigate(url: "http://host1/")
            .navigate(url: "http://host2/")
            .navigate(url: "http://host3/")

        let tab2 = buildTab()
            .navigate(url: "http://host3/")

        tab2.navigate(url: "http://host4") { bye2, hello2 in
            bye2()
            tab1.close()
            hello2()
        }

        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tab2.id!])
    }

    func testHandlesReload() {
        let tab1 = buildTab()
            .navigate(url: "http://host1/")
            .navigate(url: "http://host2/")

        tab1.reload()

        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [tab1.id!])
    }

    func testHistorySimpleBack() {
        // TestTab itself asserts that ID didn't change
        buildTab()
            .navigate(url: "http://host1/")
            .navigate(url: "http://host2/")
            .back()
            .navigate(url: "http://host3/")
    }

    func testHistoryMatchWithSameLength() {
        // TestTab itself asserts that ID didn't change
        buildTab()
            .navigate(url: "http://host1/", referrerPolicy: .noReferrer)
            .navigate(url: "http://host2/")
            .back()
            .navigate(url: "http://host3/")
    }

    func testHistoryMatchWithLowerLength() {
        // TestTab itself asserts that ID didn't change
        buildTab()
            .navigate(url: "http://host1/")
            .navigate(url: "http://host2/")
            .navigate(url: "http://host3/")
            .back()
            .back()
            .navigate(url: "http://host4/")
    }

    func testHistoryMatchWithLowerLengthNoReferrer() {
        // TestTab itself asserts that ID didn't change
        buildTab()
            .navigate(url: "http://host1/", referrerPolicy: .noReferrer)
            .navigate(url: "http://host2/")
            .navigate(url: "http://host3/")
            .back()
            .back()
            .navigate(url: "http://host4/")
    }
}
