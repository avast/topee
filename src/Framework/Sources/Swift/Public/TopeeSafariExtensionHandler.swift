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

    /// override to use custom perameters to setup the `bridge` via
    open func setupBridge() {
        bridge.setup()
    }

    // MARK: - SFSafariExtensionHandler

    open override func validateToolbarItem(in window: SFSafariWindow, validationHandler: @escaping (Bool, String) -> Void) {
        bridge.toolbarItemNeedsUpdate(in: window)
        validationHandler(true, "")
    }

    open override func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String: Any]?) {
        bridge.messageReceived(withName: messageName, from: page, userInfo: userInfo)
    }

    open override func toolbarItemClicked(in window: SFSafariWindow) {
        bridge.toolbarItemClicked(in: window)
    }

    open override func popoverViewController() -> SFSafariExtensionViewController {
        let dict = Bundle.main.infoDictionary!
        guard let extensionDictionary = dict["NSExtension"] as? [String: Any] else {
            return PopupViewController.shared
        }
        guard let browserAction = extensionDictionary["SFSafariToolbarItem"] as? [String: Any] else {
            return PopupViewController.shared
        }
        guard let popupPath = browserAction["PopoverPath"] as? String else {
            return PopupViewController.shared
        }

        PopupViewController.shared.load(popupPath)
        return PopupViewController.shared
    }

}
