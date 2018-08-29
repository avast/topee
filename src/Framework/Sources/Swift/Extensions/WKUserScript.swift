//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import WebKit

extension WKUserScript {
    convenience init(scripts: [String],
                     injectionTime: WKUserScriptInjectionTime = .atDocumentStart,
                     forMainFrameOnly: Bool = true) {
        let script = scripts.joined(separator: "\n")
        self.init(source: script, injectionTime: injectionTime, forMainFrameOnly: forMainFrameOnly)
    }

    convenience init(urls: [URL],
                     injectionTime: WKUserScriptInjectionTime = .atDocumentStart,
                     forMainFrameOnly: Bool = true) {
        let script = urls.map { try! String(contentsOf: $0, encoding: .utf8) }.joined(separator: "\n")
        self.init(source: script, injectionTime: injectionTime, forMainFrameOnly: forMainFrameOnly)
    }
}
