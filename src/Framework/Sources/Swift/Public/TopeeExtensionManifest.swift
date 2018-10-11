//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

public struct TopeeExtensionManifest: Equatable {
    public let id: String
    public let version: String
    public let name: String

    public init(_ infoDictionary: [String: Any]? = Bundle.main.infoDictionary) {
        id = infoDictionary?["CFBundleIdentifier"] as? String ?? ""
        version = infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
        name = infoDictionary?["CFBundleDisplayName"] as? String ?? ""
    }

    /// For Resources directory use path like:
    ///   Bundle(for: MyClass.self).path(forResource: "Info", ofType: "plist")
    /// For main appex directory use path like:
    ///   Bundle.main.bundlePath + "/Contents/Info.plist"
    public init(infoPath: String) {
        self.init(NSDictionary(contentsOfFile: infoPath) as? [String: Any])
    }

    public init(name: String, version: String = "1.0.0", id: String = "com.avast.topee") {
        self.id = id
        self.version = version
        self.name = name
    }
}
