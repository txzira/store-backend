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
// import Stripe = require("stripe");
var express = require("express");
var db = require("@prisma/client");
var auth = require("../auth");
var genPassword = require("../../lib/password").genPassword;
var validatePassword = require("../../lib/password").validatePassword;
var prisma = new db.PrismaClient();
var router = express.Router();
router.get("/account-information", [auth.isLoggedIn(), auth.checkCSRFToken()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var user, account, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                user = request.session.passport.user;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.user.findFirst({
                        where: { id: user.id },
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            socialProvider: true,
                        },
                        // include: { orders: true, shippingAddresses: true },
                    })];
            case 2:
                account = _a.sent();
                return [2 /*return*/, response.status(200).json({ message: "Success", account: account })];
            case 3:
                error_1 = _a.sent();
                return [2 /*return*/, response
                        .status(400)
                        .json({ message: "Failed", error: error_1.message })];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get("/account-orders", [auth.isLoggedIn(), auth.checkCSRFToken()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var user, orders, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                user = request.session.passport.user;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.order.findMany({
                        where: { customerId: user.id },
                        include: {
                            cart: {
                                include: {
                                    cartItems: {
                                        include: {
                                            variant: { select: { variantImages: true } },
                                            product: { select: { images: { select: { url: true } } } },
                                        },
                                    },
                                },
                            },
                            shippingAddress: true,
                        },
                    })];
            case 2:
                orders = _a.sent();
                return [2 /*return*/, response.status(200).json({ message: "Success", orders: orders })];
            case 3:
                error_2 = _a.sent();
                return [2 /*return*/, response
                        .status(400)
                        .json({ message: "Failed", error: error_2.message })];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post("/change-password", [auth.isLoggedIn(), auth.checkCSRFToken()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionUser, oldPassword, newPassword, user, saltHash, salt, hash, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sessionUser = request.session.passport.user;
                oldPassword = request.body.oldPassword;
                newPassword = request.body.newPassword;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, prisma.user.findFirst({
                        where: { id: sessionUser.id },
                    })];
            case 2:
                user = _a.sent();
                if (!validatePassword(oldPassword, user === null || user === void 0 ? void 0 : user.password, user === null || user === void 0 ? void 0 : user.salt)) return [3 /*break*/, 4];
                saltHash = genPassword(newPassword);
                salt = saltHash.salt;
                hash = saltHash.hash;
                // if (user?.password === hash) {
                //   response.status(400).json({
                //     message: "Failed",
                //     error: "New password cannot be the same as old password.",
                //   });
                // }
                return [4 /*yield*/, prisma.user.update({
                        where: { id: sessionUser.id },
                        data: {
                            password: hash,
                            salt: salt,
                        },
                    })];
            case 3:
                // if (user?.password === hash) {
                //   response.status(400).json({
                //     message: "Failed",
                //     error: "New password cannot be the same as old password.",
                //   });
                // }
                _a.sent();
                return [2 /*return*/, response.status(200).json({ status: "Success" })];
            case 4: 
            // Old password invalid
            return [2 /*return*/, response
                    .status(400)
                    .json({ status: "Failed", message: "Invalid Password" })];
            case 5: return [3 /*break*/, 7];
            case 6:
                error_3 = _a.sent();
                return [2 /*return*/, response
                        .status(400)
                        .json({ message: "Failed", error: error_3.message })];
            case 7: return [2 /*return*/];
        }
    });
}); });
module.exports = router;
