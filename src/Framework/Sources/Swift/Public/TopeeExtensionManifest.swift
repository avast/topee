//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

public class TopeeExtensionManifest: Equatable {
    public let name: String
    public let version: String
    public let bundleId: String
    public let contentScripts: String

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
        self.contentScripts = TopeeExtensionManifest.detectContentScripts()
    }

    public init(name: String, version: String, bundleId: String) {
        self.name = name
        self.version = version
        self.bundleId = bundleId
        self.contentScripts = TopeeExtensionManifest.detectContentScripts()
    }

    public static func == (lhs: TopeeExtensionManifest, rhs: TopeeExtensionManifest) -> Bool {
        guard lhs.name == rhs.name else { return false }
        guard lhs.version == rhs.version else { return false }
        guard lhs.bundleId == rhs.bundleId else { return false }
        return true
    }
    
    private static func detectContentScripts() -> String {
        let js = TopeeExtensionManifest.detectInjectedContents(type: "SFSafariContentScript", key: "Script", chrKey: "js")
        let css = TopeeExtensionManifest.detectInjectedContents(type: "SFSafariStyleSheet", key: "Style Sheet", chrKey: "css")
        
        if js.isEmpty && css.isEmpty {
            return ""
        }
        
        var contentScripts = "[" + js
        if !js.isEmpty && !css.isEmpty {
            contentScripts += ","
        }
        contentScripts += css + "]"
        return contentScripts
    }
    
    private static func detectInjectedContents(type: String, key: String, chrKey: String) -> String {
        guard let nsExtension = Bundle.main.object(forInfoDictionaryKey: "NSExtension") as? [String:Any] else {return ""}
        guard let injectedContents = nsExtension[type] as? [[String:Any]] else {return ""}
        var scripts = ""
        var patterns: [String] = []
        for cs in injectedContents {
            guard let files: String = cs[key] as? String else { continue }
            let matches = (cs["Allowed URL Patterns"] != nil && cs["Allowed URL Patterns"] as? [String] != nil) ?
                cs["Allowed URL Patterns"] as? [String] :
                ["<all_urls>"]
            
            if matches != patterns {
                if patterns != [] {
                    scripts += "]},"
                }
                scripts += "{\"all_frames\":true,\"run_at\":\"document_end\",\"" + chrKey + "\":["
                scripts += "\"" + files + "\""
            }
            else {
                scripts += ",\"" + files + "\""
            }
            patterns = matches!
        }
        if patterns != [] {
            scripts += "]}"
        }
        
        return scripts
    }
}
