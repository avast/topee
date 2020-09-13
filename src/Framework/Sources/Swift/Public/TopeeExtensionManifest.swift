//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

public class TopeeExtensionManifest: Equatable {
    public let name: String
    public let version: String
    public let bundleId: String

    /// Constructs a Manifest with the data of the provided bundle.
    /// The provided bundle must contain an `Info.plist` file with
    /// the 'CFBundleDisplayName', 'CFBundleShortVersionString' and
    /// 'CFBundleIdentifier' keys in it. In case you want use the
    /// values from the Topee framework you can pass:
    /// `Bundle.for(TopeeExtensionManifest.self)`
    public init(bundle: Bundle = .main) {
        self.name = bundle.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? bundle.object(forInfoDictionaryKey: "CFBundleExecutable") as? String ?? ""
        self.version = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        self.bundleId = bundle.object(forInfoDictionaryKey: "CFBundleIdentifier") as? String ?? ""
    }

    public init(name: String, version: String, bundleId: String) {
        self.name = name
        self.version = version
        self.bundleId = bundleId
    }

    public static func == (lhs: TopeeExtensionManifest, rhs: TopeeExtensionManifest) -> Bool {
        guard lhs.name == rhs.name else { return false }
        guard lhs.version == rhs.version else { return false }
        guard lhs.bundleId == rhs.bundleId else { return false }
        return true
    }
}
