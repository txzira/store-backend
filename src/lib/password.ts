import crypto = require("crypto");

function genPassword(password: string) {
  const salt = crypto.randomBytes(32).toString("hex");
  const genHash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return {
    salt: salt,
    hash: genHash,
  };
}

function validatePassword(
  password: string,
  hash: string,
  salt: string
): boolean {
  const hashVerify = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hashVerify)
  );

  return isValid;
}

module.exports.validatePassword = validatePassword;
module.exports.genPassword = genPassword;
