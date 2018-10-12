//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

public protocol TopeeLogger {
    func debug(_ msg: String)
    func info(_ msg: String)
    func warning(_ msg: String)
    func error(_ msg: String)
}
