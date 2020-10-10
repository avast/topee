//
//  Copyright © 2018 Avast. All rights reserved.
//

import SafariServices

class EmptyPopup: SFSafariExtensionViewController {
    init() {
        super.init(nibName: nil, bundle: nil)
        self.preferredContentSize = NSMakeSize(CGFloat(0.1), CGFloat(0.1))

        self.view = NSView()
        let height = NSLayoutConstraint(item: self.view, attribute: .height, relatedBy: .equal, toItem: self.view, attribute: .height, multiplier: 1, constant: 0)
        let width = NSLayoutConstraint(item: self.view, attribute: .width, relatedBy: .equal, toItem: self.view, attribute: .width, multiplier: 1, constant: 0)
        self.view.addConstraints([height,width])
    }
    
    required init?(coder: NSCoder) {
        super.init(nibName: nil, bundle: nil)
        self.view = NSView()
    }

    override func viewWillAppear() {
        dismissPopover()
    }
}

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
            return EmptyPopup()
        }
        guard let browserAction = extensionDictionary["SFSafariToolbarItem"] as? [String: Any] else {
            return EmptyPopup()
        }
        guard let popupPath = browserAction["PopoverPath"] as? String else {
            return EmptyPopup()
        }
        
        let inactivePopupPath = browserAction["InactivePopoverPath"] as? String
        if inactivePopupPath != nil && !bridge.backgroundScriptStarted() {
            if inactivePopupPath!.isEmpty {
                return EmptyPopup()
            }
            PopupViewController.shared.load(inactivePopupPath!)
            return PopupViewController.shared
        }

        PopupViewController.shared.load(popupPath)
        return PopupViewController.shared
    }

}
