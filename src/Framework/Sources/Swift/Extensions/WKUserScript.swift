//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import WebKit

extension WKUserScript {
    convenience init(fileName: String,
                     fileExtension: String = "js",
                     bundle: Bundle = .main,
                     injectionTime: WKUserScriptInjectionTime = .atDocumentStart,
                     forMainFrameOnly: Bool = true) {
        guard let url = bundle.url(forResource: fileName, withExtension: fileExtension) else {
            fatalError("Could not find \(fileName).\(fileExtension) in the bundle")
        }
        guard let script = try? String(contentsOf: url, encoding: .utf8) else {
            fatalError("Could not decode \(fileName).\(fileExtension) as utf8 string")
        }
        self.init(source: script, injectionTime: injectionTime, forMainFrameOnly: forMainFrameOnly)
    }
}
