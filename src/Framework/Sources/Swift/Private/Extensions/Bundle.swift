//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

extension Bundle {
    static var current: Bundle {
        return Bundle(for: BundleToken.self)
    }

    var infoPlist: [String: Any]? {
        guard let infoPlistPath = path(forResource: "Info", ofType: "plist") else { return nil }
        guard let infoPlist = NSDictionary(contentsOfFile: infoPlistPath) as? [String: Any] else { return nil }
        return infoPlist
    }

    var shortVersionString: String? {
        return infoPlist.flatMap { $0["CFBundleShortVersionString"] as? String }
    }

    var displayName: String? {
        return infoPlist.flatMap { $0["CFBundleDisplayName"] as? String }
    }

    var bundleId: String? {
        return infoPlist.flatMap { $0["CFBundleIdentifier"] as? String }
    }
}

private final class BundleToken {}
