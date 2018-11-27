// see https://github.com/diafygi/webcrypto-examples#aes-cbc---generatekey

function createSalt() {
  return crypto.getRandomValues(new Uint8Array(16));  // direct value, not a promise
}

function createKey() {
  return crypto.subtle.generateKey(
    {
      name: 'AES-CBC',
      length: 256
    },
    true,
    [ 'encrypt', 'decrypt' ]);
}

function importKey(jwkKey) {
  return crypto.subtle.importKey(
    "jwk",
    {
        kty: "oct",
        k: jwkKey,
        alg: "A256CBC",
        ext: true,
    },
    {
        name: "AES-CBC",
    },
    true,
    ["encrypt", "decrypt"]);
}

function exportKey(key) {
  return crypto.subtle.exportKey(
    "jwk",
    key
  ).then(function (jwkKey) { return jwkKey.k; });
}

function encrypt(arrayBufferata, ui8aSalt, key) {
  return crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv: ui8aSalt
    },
    key,
    arrayBufferata);
}

function decrypt(arrayBufferData, ui8aSalt, key) {
  return crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: ui8aSalt
    },
    key,
    arrayBufferData);
}

module.exports = {
  createSalt: createSalt,
  createKey: createKey,
  importKey: importKey,
  exportKey: exportKey,
  encrypt: encrypt,
  decrypt: decrypt
};
