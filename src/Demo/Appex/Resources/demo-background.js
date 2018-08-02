chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    sendResponse("background pong #" + message.value);
});
