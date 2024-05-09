"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
function genPassword(password) {
    var salt = crypto.randomBytes(32).toString("hex");
    var genHash = crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex");
    return {
        salt: salt,
        hash: genHash,
    };
}
function validatePassword(password, hash, salt) {
    var hashVerify = crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex");
    var isValid = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashVerify));
    return isValid;
}
module.exports.validatePassword = validatePassword;
module.exports.genPassword = genPassword;
