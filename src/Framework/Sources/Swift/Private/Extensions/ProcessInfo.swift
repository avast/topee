//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

extension ProcessInfo {
    /// Returns the OS version of the current machine
    /// formatted for the userAgent string –e.g: "10_13_6"
    var operatingSystemVersionStringForUserAgent: String {
        let components = operatingSystemVersionString.components(separatedBy: " ")
        guard components.count > 1 else { return "" }
        let versionString = components[1]
        let formattedVersionString = versionString.replacingOccurrences(of: ".", with: "_")
        return formattedVersionString
    }
}
