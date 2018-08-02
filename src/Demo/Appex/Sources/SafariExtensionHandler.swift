//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices
import Topee

class SafariExtensionHandler: TopeeSafariExtensionHandler {

    override var backgroundScripts: [URL] {
        let fileName = "demo-background"
        let fileExtension = "js"
        return [Bundle.main.url(forResource: fileName, withExtension: fileExtension)!]
    }
}
