//
//  Copyright © 2018 Avast. All rights reserved.
//

function manageRequest(payload) {
     var message = JSON.parse(payload);

     window.webkit.messageHandlers.sendResponse.postMessage({
         tabId: message.tabId,
         messageId: message.messageId,
         response: "background pong"
     });
}
