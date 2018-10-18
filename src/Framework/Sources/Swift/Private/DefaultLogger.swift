//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

struct DefaultLogger: TopeeLogger {
    func debug(_ msg: String) {
        log(msg)
    }

    func info(_ msg: String) {
        log(msg)
    }

    func warning(_ msg: String) {
        log(msg)
    }

    func error(_ msg: String) {
        log(msg)
    }

    private func log(_ msg: String) {
        // Since 'msg' can contain control characters – e.g: "google.com?search=this%20may%20crash"
        // we need to provide a format string ("%@") as a first parameter to NSLog.
        NSLog("%@", msg)
    }
}
