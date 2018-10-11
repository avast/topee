//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import WebKit

extension WKWebView {
    func load(url: URL) {
        let request = URLRequest(url: url)
        load(request)
    }
}
