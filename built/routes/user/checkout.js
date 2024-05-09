"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var express = require("express");
var Stripe = require("stripe");
var db = require("@prisma/client");
var prisma = new db.PrismaClient();
var router = express.Router();
var stripe = new Stripe.Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-08-16",
});
function calculateOrderAmount(items, response) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var sum, minimumCharged, i, product;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sum = 0;
                    minimumCharged = false;
                    i = 0;
                    _b.label = 1;
                case 1:
                    if (!(i < items.length)) return [3 /*break*/, 7];
                    product = void 0;
                    if (!items[i].variant) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.productVariant.findFirst({
                            where: {
                                AND: [
                                    { id: (_a = items[i].variant) === null || _a === void 0 ? void 0 : _a.id },
                                    { productId: items[i].productId },
                                ],
                            },
                        })];
                case 2:
                    product = _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, prisma.product.findFirst({
                        where: {
                            id: items[i].productId,
                        },
                    })];
                case 4:
                    product = _b.sent();
                    _b.label = 5;
                case 5:
                    if (product) {
                        sum += product.price;
                    }
                    else {
                        //error
                        throw "A product in the cart does not exist.";
                    }
                    _b.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 1];
                case 7:
                    if (sum === 0) {
                        //minimum stripe charge
                        sum += 1;
                        minimumCharged = true;
                    }
                    return [2 /*return*/, { sum: sum, minimumCharged: minimumCharged }];
            }
        });
    });
}
router.post("/create-payment-intent", function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var items, orderTotal, paymentIntent, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                items = request.body.items;
                return [4 /*yield*/, calculateOrderAmount(items, response)];
            case 1:
                orderTotal = _a.sent();
                if (!orderTotal) return [3 /*break*/, 3];
                return [4 /*yield*/, stripe.paymentIntents.create({
                        amount: orderTotal.sum * 100,
                        currency: "usd",
                        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
                        automatic_payment_methods: {
                            enabled: true,
                        },
                    })];
            case 2:
                paymentIntent = _a.sent();
                return [2 /*return*/, response.send({
                        clientSecret: paymentIntent.client_secret,
                        orderTotal: paymentIntent.amount,
                        minimumCharged: orderTotal.minimumCharged,
                    })];
            case 3: return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                if (error_1.type === "StripeInvalidRequestError") {
                    return [2 /*return*/, response.status(500).send("Stripe order error.")];
                }
                else {
                    return [2 /*return*/, response.status(500).send(error_1)];
                }
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post("/create-order", function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    function createCart(_cartItems, user) {
        if (user === void 0) { user = null; }
        return __awaiter(this, void 0, void 0, function () {
            var cartSum, cartItems, i, productVariant, _a, productName, variantName, product, cart;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cartSum = 0;
                        cartItems = [];
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < _cartItems.length)) return [3 /*break*/, 6];
                        if (!_cartItems[i].variant) return [3 /*break*/, 3];
                        return [4 /*yield*/, getProductVariant(_cartItems[i].variant.id)];
                    case 2:
                        productVariant = _b.sent();
                        if (productVariant) {
                            _a = makeProductVariantName(productVariant), productName = _a.productName, variantName = _a.variantName;
                            cartItems.push({
                                productId: productVariant.productId,
                                variantId: productVariant.id,
                                productName: productName,
                                variantName: variantName,
                                price: productVariant.price,
                                quantity: _cartItems[i].quantity,
                            });
                            cartSum += productVariant.price * _cartItems[i].quantity;
                        }
                        else {
                            console.log("ERROR: Invalid product variant in cart");
                        }
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, getProduct(_cartItems[i].productId)];
                    case 4:
                        product = _b.sent();
                        if (product) {
                            cartItems.push({
                                productId: product.id,
                                productName: product.name,
                                price: product.price,
                                quantity: _cartItems[i].quantity,
                            });
                            cartSum += product.price * _cartItems[i].quantity;
                        }
                        else {
                            console.log("ERROR: Invalid product in cart");
                        }
                        _b.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 1];
                    case 6: return [4 /*yield*/, prisma.cart.create({
                            data: __assign(__assign({}, (user && { userId: user.id })), { currentCart: false, cartTotal: cartSum, cartItems: {
                                    createMany: {
                                        data: cartItems,
                                    },
                                } }),
                        })];
                    case 7:
                        cart = _b.sent();
                        return [2 /*return*/, cart];
                }
            });
        });
    }
    function getProduct(productId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.product.findFirst({
                            where: { id: productId },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    }
    function getProductVariant(variantId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.productVariant.findFirst({
                            where: { id: variantId },
                            include: {
                                product: true,
                                productVariantAttributes: {
                                    include: { attribute: true, attributeGroup: true },
                                },
                            },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    }
    function makeProductVariantName(productVariant) {
        var variantName = "";
        productVariant.productVariantAttributes.map(function (productVariantAttribute, index) {
            var group = productVariantAttribute.attributeGroup.name;
            var option = productVariantAttribute.attribute.name;
            variantName += group + ": " + option;
            productVariant.productVariantAttributes.length - 1 > index
                ? (variantName += " - ")
                : null;
        });
        return {
            productName: productVariant.product.name,
            variantName: variantName,
        };
    }
    var _a, requestShippingForm, requestCart, user, shippingAddress, cart, order, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.body, requestShippingForm = _a.requestShippingForm, requestCart = _a.requestCart;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                user = request.session.passport.user;
                return [4 /*yield*/, prisma.orderShippingAddress.create({
                        data: {
                            firstName: requestShippingForm.firstName,
                            lastName: requestShippingForm.lastName,
                            country: requestShippingForm.country,
                            streetAddress: requestShippingForm.address1,
                            streetAddress2: requestShippingForm.address2,
                            city: requestShippingForm.city,
                            state: requestShippingForm.state,
                            zipCode: requestShippingForm.postalCode,
                        },
                    })];
            case 2:
                shippingAddress = _b.sent();
                return [4 /*yield*/, createCart(requestCart, user)];
            case 3:
                cart = _b.sent();
                return [4 /*yield*/, prisma.order.create({
                        data: __assign(__assign({}, (user ? { customerId: user.id } : null)), { cartId: cart.id, amount: cart.cartTotal, customerEmail: requestShippingForm.email, status: "PAYMENT_PENDING", shippingAddressId: shippingAddress.id }),
                    })];
            case 4:
                order = _b.sent();
                return [2 /*return*/, response
                        .status(200)
                        .json({ message: "success", order: order.id, cart: cart.id })];
            case 5:
                error_2 = _b.sent();
                console.log(error_2.message);
                return [2 /*return*/, response.status(400).json({ message: "Failed" })];
            case 6: return [2 /*return*/];
        }
    });
}); });
module.exports = router;
