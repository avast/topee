// Background script may run in a webkit much older than Safari 12,
// if you install new Safari to an old MacOS.
// Use in addition to the common polyfills.

require('abortcontroller-polyfill/dist/polyfill-patch-fetch');
