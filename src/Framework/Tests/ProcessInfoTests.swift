//
//  Copyright © 2018 Avast. All rights reserved.
//

import XCTest

@testable import Topee

class ProcessInfoTests: XCTestCase {
    func testOperatingSystemVersionStringForUserAgent() {
        // Given:
        let sut = ProcessInfo.processInfo

        // When:
        let string = sut.operatingSystemVersionStringForUserAgent
        
        // Then:
        XCTAssertTrue(string.matches(regex: "([0-9]+)(_[0-9]+){1,2}"))
    }
}
