//
//  Copyright © 2018 Avast. All rights reserved.
//

import SafariServices

open class TopeeSafariExtensionHandler: SFSafariExtensionHandler {

    // MARK: - Public Members

    public var bridge: SafariExtensionBridgeType { return SafariExtensionBridge.shared }

    // MARK: - Initializers
    
    public override init() {
        super.init()
        self.setupBridge()
    }

    // override to pass optional parameters to bridge.setup()
    open func setupBridge() {
        bridge.setup()
    }

    // MARK: - SFSafariExtensionHandler
    
    open override func validateToolbarItem(in window: SFSafariWindow, validationHandler: @escaping (Bool, String) -> Void) {
        bridge.toolbarItemNeedsUpdate(in: window)
        validationHandler(true, "")
    }

    override open func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        bridge.messageReceived(withName: messageName, from: page, userInfo: userInfo)
    }

    override open func toolbarItemClicked(in window: SFSafariWindow) {
        bridge.toolbarItemClicked(in: window)
    }
}
