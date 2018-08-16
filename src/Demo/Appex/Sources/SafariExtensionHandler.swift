//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices
import Topee

class SafariExtensionHandler: TopeeSafariExtensionHandler {
    override func setupBridge() {
        bridge.setup(
            backgroundScripts: [
                Bundle.main.url(forResource: "demo-background", withExtension: "js")!
            ]
        )
    }
}
