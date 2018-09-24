var bin = require('./aes-crypto.js');
var bc = require('./binary-conversion.js');

module.exports = class TextCrypto {
    constructor(key) {
        if (!key) {
            this.readyPromise = bin.createKey().then(key => this.key = key);
        }
        else {
            this.readyPromise = bin.importKey(key).then(key => this.key = key);
        }
    }

    ready() {
        return !!this.key;
    }


    getKey() {
        return bin.exportKey(this.key);
    }

    /// @return { data: base64, salt: base64 }
    encrypt(str) {
        var salt = bin.createSalt();
        return bin.encrypt(bc.str2arrayBuffer(encodeURI(str)), salt, this.key)
            .then(ab => {
                return {
                    data: bc.arrayBuffer2base64(ab),
                    salt: bc.uint8array2base64(salt)
                };
            });
    }

    /// dataObj: { data: base64, salt: base64 }
    decrypt(dataObj) {
        return bin.decrypt(bc.base642arrayBuffer(dataObj.data), bc.base642uint8array(dataObj.salt), this.key)
            .then(ab => decodeURI(bc.arrayBuffer2str(ab)));
    }
};
