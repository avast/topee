//
//  Copyright © 2018 Avast. All rights reserved.
//

function manageRequest(stringifiedPayload) {
    var payload = JSON.parse(stringifiedPayload);
    var message = payload.message;

    window.webkit.messageHandlers.sendResponse.postMessage({
        tabId: payload.tabId,
        messageId: payload.messageId,
        response: "background pong" + message.value
    });
}
