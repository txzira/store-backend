"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
var express = require("express");
var db = require("@prisma/client");
var passport = require("passport");
var GoogleStrategy = require("passport-google-oauth2");
var LocalStrategy = require("passport-local");
var crypto_1 = require("crypto");
var SendEmail = require("../lib/nodemailer");
var jwt = require("jsonwebtoken");
var url_1 = require("url");
var genPassword = require("../lib/password").genPassword;
var validatePassword = require("../lib/password").validatePassword;
var router = express.Router();
var prisma = new db.PrismaClient();
// Passport Middleware
passport.use(new GoogleStrategy.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/callback",
    passReqToCallback: true,
}, function (request, accessToken, refreshToken, profile, cb) {
    return __awaiter(this, void 0, void 0, function () {
        var user, user_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.user.findFirst({
                        where: {
                            email: profile.email,
                            socialId: profile.id,
                            socialProvider: "google",
                        },
                    })];
                case 1:
                    user = _a.sent();
                    if (!user) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.$disconnect()];
                case 2:
                    _a.sent();
                    return [2 /*return*/, cb(null, user)];
                case 3: return [4 /*yield*/, prisma.user.create({
                        data: {
                            email: profile.email,
                            firstName: profile.given_name,
                            lastName: profile.family_name,
                            socialId: profile.id,
                            socialProvider: profile.provider,
                            verifiedEmail: true,
                        },
                    })];
                case 4:
                    user_1 = _a.sent();
                    return [4 /*yield*/, prisma.$disconnect()];
                case 5:
                    _a.sent();
                    return [2 /*return*/, cb(null, user_1)];
            }
        });
    });
}));
passport.use(new LocalStrategy.Strategy(function verify(email, password, cb) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.user.findFirst({
                        where: {
                            email: email,
                            socialId: null,
                            socialProvider: null,
                        },
                    })];
                case 1:
                    user = _a.sent();
                    if (user) {
                        //check password
                        if (validatePassword(password, user.password, user.salt)) {
                            // correct password
                            return [2 /*return*/, cb(null, user)];
                        }
                        else {
                            // incorrect password
                            return [2 /*return*/, cb(null, false, { message: "Incorrect username or password." })];
                        }
                    }
                    else {
                        //user does not exist
                        return [2 /*return*/, cb(null, false, { message: "Incorrect username or password." })];
                    }
                    return [2 /*return*/];
            }
        });
    });
}));
passport.serializeUser(function (user, done) {
    process.nextTick(function () {
        done(null, {
            id: user.id,
            name: "".concat(user.firstName, " ").concat(user.lastName),
            email: user.email,
            role: user.role,
        });
    });
});
passport.deserializeUser(function (user, done) {
    process.nextTick(function () {
        done(null, user);
    });
});
// Middleware functions
var localAuth = function () {
    return function (req, res, next) {
        passport.authenticate("local", {
            successRedirect: "/protected",
            failureRedirect: "auth/failure",
        }, function (error, user, info) {
            if (user === false) {
                return res
                    .status(400)
                    .json({ success: false, message: "Invalid Password." });
            }
            if (error)
                return res.status(400).json({ success: false, message: error });
            req.login(user, function (error) {
                if (error)
                    return next(error);
                generateCSRFToken(req, res);
                next();
            });
        })(req, res, next);
    };
};
var googleAuth = function () {
    return function (req, res, next) {
        passport.authenticate("google", {
            scope: ["email", "profile"],
            successRedirect: "/protected",
            failureRedirect: "auth/failure",
        }, function (error, user, info) {
            if (error)
                res.status(400).json({ success: false, message: error });
            req.login(user, function (error) {
                if (error)
                    return next(error);
                generateCSRFToken(req, res);
                next();
            });
        })(req, res, next);
    };
};
var checkCSRFToken = function () {
    return function (req, res, next) {
        req.session.csrfToken === req.cookies.CSRF_Token
            ? next()
            : res.status(401).send(false);
    };
};
var isLoggedIn = function () {
    return function (request, response, next) {
        request.user && request.isAuthenticated() && request.session.passport.user
            ? next()
            : response.status(401).send(false);
    };
};
var isAdmin = function () {
    return function (request, response, next) {
        request.user.role === "ADMIN" ? next() : response.status(401).send(false);
    };
};
// Auth Routes
router.get("/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));
router.get("/auth/google/callback", googleAuth(), function (req, res) {
    res.status(200).redirect("http://localhost:4200/auth/login-redirect");
    res.end();
});
router.get("/auth/isauth", [isLoggedIn(), checkCSRFToken()], function (request, response) {
    response.send(true);
});
router.get("/auth/isadmin", [isLoggedIn(), checkCSRFToken()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionUser, admin, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sessionUser = request.session.passport.user;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.user.findFirst({
                        where: { id: sessionUser.id },
                        select: { role: true },
                    })];
            case 2:
                admin = _a.sent();
                if ((admin === null || admin === void 0 ? void 0 : admin.role) === "ADMIN") {
                    return [2 /*return*/, response.send(true)];
                }
                else
                    return [2 /*return*/, response.status(401).send(false)];
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                return [2 /*return*/, response.status(400).send("Invalid user.")];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post("/auth/login", localAuth(), function (req, res) {
    var sessionUser = req.session.passport.user;
    res.status(200).json({
        message: "success",
        user: { name: sessionUser.name, email: sessionUser.email },
    });
    res.end();
});
router.get("/auth/google/redirect", function (request, response, next) {
    var sessionUser = request.session.passport.user;
    response.status(200).json({
        message: "success",
        user: { name: sessionUser.name, email: sessionUser.email },
    });
    response.end();
});
router.get("/auth/logout", function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.session.destroy();
        res.send("Goodbye!");
        res.end();
    });
});
router.get("/auth/verify", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var token, decodedUser, user, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                token = req.query.token;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 8, , 9]);
                decodedUser = jwt.verify(token, process.env.JWT_SECRET);
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { email: decodedUser.user },
                    })];
            case 2:
                user = _a.sent();
                if (!user) return [3 /*break*/, 6];
                if (!user.verifiedEmail) return [3 /*break*/, 3];
                res
                    .status(400)
                    .json({ success: false, message: "Email already verified." });
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, prisma.user.update({
                    where: { email: decodedUser.user },
                    data: { verifiedEmail: true },
                })];
            case 4:
                _a.sent();
                res.status(200).json({ success: true, message: "success" });
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                res.status(400).json({ success: false, message: "User does not exist." });
                _a.label = 7;
            case 7: return [3 /*break*/, 9];
            case 8:
                err_1 = _a.sent();
                res
                    .status(400)
                    .json({ success: false, message: "Email verification link expired!" });
                return [3 /*break*/, 9];
            case 9:
                res.end();
                return [2 /*return*/];
        }
    });
}); });
router.post("/auth/register-user", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var saltHash, salt, hash, user, token, link, message, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                saltHash = genPassword(req.body.password);
                salt = saltHash.salt;
                hash = saltHash.hash;
                return [4 /*yield*/, prisma.user.create({
                        data: {
                            email: req.body.email,
                            firstName: req.body.firstName,
                            lastName: req.body.lastName,
                            password: hash,
                            salt: salt,
                        },
                    })];
            case 1:
                user = _a.sent();
                token = jwt.sign({ user: user.email }, process.env.JWT_SECRET, {
                    expiresIn: 60 * 60 * 3,
                });
                link = new url_1.URL("".concat(process.env.ORIGIN_URL, "/auth/verify/"));
                link.search = new URLSearchParams({ token: token }).toString();
                message = "<div>Email verification link will expire in 24 hours.</div></br><div>To verify your email copy and paste, or click the link below: </div></br><div>".concat(link, "</div>");
                SendEmail(user.email, user.firstName + " " + user.lastName, "Email Verification Link", message);
                res.status(200).json({
                    message: "Registration Successful. Email verification was sent to ".concat(user.email, " and is only valid for 3hours, unverified accounts are subject to deletion after this period."),
                    success: true,
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                if (error_2.code === "P2002") {
                    res.status(400).json({
                        message: "Registration Failed. User already exists.",
                        success: false,
                    });
                }
                else {
                    console.log(error_2.message);
                    res.status(400).json({ message: "Registration Failed.", success: false });
                }
                return [3 /*break*/, 3];
            case 3:
                res.end();
                return [2 /*return*/];
        }
    });
}); });
// Helper Functions
function generateCSRFToken(req, res) {
    var token = (0, crypto_1.randomBytes)(36).toString("base64");
    req.session.csrfToken = token;
    res.cookie("CSRF_Token", token, {
        maxAge: 1000 * 60 * 60,
        httpOnly: true,
    });
}
module.exports = router;
module.exports.checkCSRFToken = checkCSRFToken;
module.exports.isLoggedIn = isLoggedIn;
module.exports.isAdmin = isAdmin;
