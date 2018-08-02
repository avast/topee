//
//  Copyright © 2018 Avast. All rights reserved.
//

import SafariServices

open class TopeeSafariExtensionHandler: SFSafariExtensionHandler {

    // MARK: - Public Members

    open var backgroundScripts: [URL] { return [] }
    public var bridge: SafariExtensionBridgeType!

    // MARK: - Initializers
    
    public override init() {
        super.init()
        bridge = SafariExtensionBridge.shared(backgroundScripts: backgroundScripts)
    }

    // MARK: - SFSafariExtensionHandler

    override open func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        bridge.messageReceived(withName: messageName, from: page, userInfo: userInfo)
    }
}
