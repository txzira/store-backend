"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var auth = require("../auth");
var router = express.Router();
router.get("/user", [auth.isLoggedIn(), auth.checkCSRFToken()], function (req, res) {
    var user = req.session.passport.user;
    return res.status(200).json({ name: user.name, email: user.email });
});
module.exports = router;
