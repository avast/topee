// Signals Topee that all the background scripts have been successfully
// loaded and is time to respond to the pending requests (if any)
window.webkit.messageHandlers.appex.postMessage({ type: 'ready' })
