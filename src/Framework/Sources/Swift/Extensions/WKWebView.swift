//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import WebKit

extension WKWebView {
    
    func load(string: String) {
        let url = URL(string: string)!
        load(url: url)
    }

    func load(url: URL) {
        let request = URLRequest(url: url)
        load(request)
    }
}

