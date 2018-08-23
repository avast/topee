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
        registry.hello(page: page, tabId: 1)
        XCTAssertEqual(registry.count, 1)
        XCTAssertEqual(registry.tabIds, [ 1 ])
    }

    func testRemovesPage() {
        let page = TestPage()
        var registry = PageRegistry<TestPage>()
        registry.hello(page: page, tabId: 1)
        registry.bye(tabId: 1)
        XCTAssertEqual(registry.count, 0)
        XCTAssertEqual(registry.tabIds, [])
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
