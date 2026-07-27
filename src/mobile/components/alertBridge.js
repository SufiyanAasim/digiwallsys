// Lets the web Alert polyfill in index.js render through the in-app dialog
// instead of window.alert(). index.js runs before React mounts, so it cannot use
// context directly — ConfirmProvider registers a handler here once it is live,
// and the polyfill falls back to window.alert until then.
let handler = null;

export function setAlertHandler(fn) {
  handler = fn;
}

// Returns true when the in-app dialog took the message.
export function dispatchAlert(title, message) {
  if (!handler) return false;
  handler(title, message);
  return true;
}
