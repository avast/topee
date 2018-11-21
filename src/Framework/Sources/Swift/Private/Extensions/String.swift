//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

extension String {
    func matches(regex: String) -> Bool {
        return NSPredicate(format: "SELF MATCHES %@", regex).evaluate(with: self)
    }
}
