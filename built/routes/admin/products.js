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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var auth = require("../auth");
var cloudinary = require("../../lib/cloudinary");
var db = require("../../lib/prisma.server");
var router = express.Router();
router.get("/products/get-all-products", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var products, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db.product.findMany({
                        include: {
                            images: { orderBy: { position: "asc" } },
                            attributeGroups: {
                                include: { attributes: { include: { images: true } } },
                            },
                        },
                    })];
            case 1:
                products = _a.sent();
                return [2 /*return*/, response.status(200).json(products)];
            case 2:
                error_1 = _a.sent();
                console.log(error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post("/products/add-product", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var product, productImages, dbProduct, i, cloudinaryImage, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                product = request.body.product;
                productImages = request.body.productImages;
                return [4 /*yield*/, db.product.create({
                        data: __assign(__assign({ name: product.name, slug: product.slug, sku: product.sku, quantity: product.stock, active: product.active }, (product.brand ? { brandId: product.brand } : 0)), { price: product.price, description: product.description }),
                    })];
            case 1:
                dbProduct = _a.sent();
                i = 0;
                _a.label = 2;
            case 2:
                if (!(i < productImages.length)) return [3 /*break*/, 6];
                return [4 /*yield*/, cloudinary.uploadImage(productImages[i].imagePath, productImages[i].imageName)];
            case 3:
                cloudinaryImage = _a.sent();
                return [4 /*yield*/, db.productImage.create({
                        data: {
                            product: { connect: { id: Number(dbProduct.id) } },
                            publicId: cloudinaryImage === null || cloudinaryImage === void 0 ? void 0 : cloudinaryImage.public_id,
                            url: cloudinaryImage === null || cloudinaryImage === void 0 ? void 0 : cloudinaryImage.url,
                            position: i + 1,
                        },
                    })];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5:
                i++;
                return [3 /*break*/, 2];
            case 6: return [2 /*return*/, response.status(200).json(dbProduct)];
            case 7:
                error_2 = _a.sent();
                console.log(error_2);
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
router.post("/products/edit-product/:id", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, product, productImages, i, cloudinaryImage, categories, i, dbProduct, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 9, , 10]);
                productId = request.params.id;
                product = request.body.product;
                productImages = request.body.productImages;
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < productImages.length)) return [3 /*break*/, 7];
                if (!!productImages[i].id) return [3 /*break*/, 4];
                return [4 /*yield*/, cloudinary.uploadImage(productImages[i].imagePath, productImages[i].imageName)];
            case 2:
                cloudinaryImage = _a.sent();
                return [4 /*yield*/, db.productImage.create({
                        data: {
                            product: { connect: { id: Number(productId) } },
                            publicId: cloudinaryImage === null || cloudinaryImage === void 0 ? void 0 : cloudinaryImage.public_id,
                            url: cloudinaryImage === null || cloudinaryImage === void 0 ? void 0 : cloudinaryImage.url,
                            position: i + 1,
                        },
                    })];
            case 3:
                _a.sent();
                return [3 /*break*/, 6];
            case 4: return [4 /*yield*/, db.productImage.update({
                    where: { id: productImages[i].id },
                    data: {
                        position: i + 1,
                    },
                })];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6:
                i++;
                return [3 /*break*/, 1];
            case 7:
                categories = [];
                for (i = 0; i < product.categories.length; i++) {
                    categories.push({ id: product.categories[i] });
                }
                return [4 /*yield*/, db.product.update({
                        where: { id: Number(productId) },
                        data: __assign(__assign({ name: product.name, slug: product.slug, sku: product.sku, quantity: product.stock, categories: { connect: categories }, active: product.active }, (product.brand
                            ? { brandId: product.brand }
                            : { brand: { disconnect: true } })), { price: product.price, description: product.description }),
                    })];
            case 8:
                dbProduct = _a.sent();
                return [2 /*return*/, response.status(200).json(dbProduct)];
            case 9:
                error_3 = _a.sent();
                console.log(error_3);
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
router.delete("/products/delete-product/:productId", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, products, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                productId = request.params.productId;
                return [4 /*yield*/, db.product.delete({ where: { id: Number(productId) } })];
            case 1:
                _a.sent();
                return [4 /*yield*/, db.product.findMany({})];
            case 2:
                products = _a.sent();
                return [2 /*return*/, response.status(200).json(products)];
            case 3:
                error_4 = _a.sent();
                console.log(error_4);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get("/products/get-attr-groups-by-prod-id/:productId", function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, attributeGroups, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                productId = request.params.productId;
                return [4 /*yield*/, db.attributeGroup.findMany({
                        where: { productId: Number(productId) },
                        include: {
                            attributes: { include: { images: { orderBy: { position: "asc" } } } },
                        },
                    })];
            case 1:
                attributeGroups = _a.sent();
                return [2 /*return*/, response.status(200).json(attributeGroups)];
            case 2:
                error_5 = _a.sent();
                console.log(error_5);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post("/products/save-attr-groups-changes", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, attributeGroups, attributesToDelete, i, i, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 9, , 10]);
                productId = request.body.productId;
                attributeGroups = request.body.attributeGroups;
                attributesToDelete = request.body.attributesToDelete;
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < attributeGroups.length)) return [3 /*break*/, 4];
                return [4 /*yield*/, db.attributeGroup.upsert({
                        where: { id: attributeGroups[i].id },
                        create: {
                            name: attributeGroups[i].name,
                            product: { connect: { id: Number(productId) } },
                            attributes: {
                                createMany: {
                                    data: attributeGroups[i].attributes.map(function (attribute) {
                                        return { name: attribute.name };
                                    }),
                                },
                            },
                        },
                        update: {
                            name: attributeGroups[i].name,
                            attributes: {
                                upsert: attributeGroups[i].attributes.map(function (attribute) {
                                    return {
                                        where: { id: attribute.id },
                                        create: { name: attribute.name },
                                        update: {},
                                    };
                                }),
                            },
                        },
                    })];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                i++;
                return [3 /*break*/, 1];
            case 4:
                i = 0;
                _a.label = 5;
            case 5:
                if (!(i < attributesToDelete.length)) return [3 /*break*/, 8];
                return [4 /*yield*/, db.attribute.delete({
                        where: {
                            id: attributesToDelete[i].id,
                        },
                    })];
            case 6:
                _a.sent();
                _a.label = 7;
            case 7:
                i++;
                return [3 /*break*/, 5];
            case 8: return [3 /*break*/, 10];
            case 9:
                error_6 = _a.sent();
                console.log(error_6);
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
router.post("/products/save-and-generate-variants", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    function generateVariants(attributeGroupsArray) {
        var firstAttributeGroupArray = attributeGroupsArray[0];
        var attributeGroupIncrementor = 1;
        if (attributeGroupIncrementor === attributeGroupsArray.length) {
            return firstAttributeGroupArray.map(function (attribute) {
                return [attribute];
            });
        }
        else {
            var combinations = makeCombinations(firstAttributeGroupArray);
            return combinations;
        }
        function makeCombinations(arr) {
            var startArray = arr;
            var combinations = [];
            for (var x = 0; x < startArray.length; x++) {
                for (var y = 0; y < attributeGroupsArray[attributeGroupIncrementor].length; y++) {
                    if (Array.isArray(startArray[x])) {
                        var temp = __spreadArray(__spreadArray([], startArray[x], true), [
                            attributeGroupsArray[attributeGroupIncrementor][y],
                        ], false);
                        combinations.push(temp);
                    }
                    else {
                        combinations.push([
                            startArray[x],
                            attributeGroupsArray[attributeGroupIncrementor][y],
                        ]);
                    }
                }
            }
            attributeGroupIncrementor++;
            if (attributeGroupIncrementor === attributeGroupsArray.length) {
                return combinations;
            }
            return makeCombinations(combinations);
        }
    }
    var productId, product_1, attributeGroups, array_1, combinations, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                productId = request.body.productId;
                return [4 /*yield*/, db.product.findUnique({
                        where: { id: Number(productId) },
                        include: {
                            attributeGroups: {
                                include: { attributes: { include: { images: true } } },
                            },
                        },
                    })];
            case 1:
                product_1 = _a.sent();
                if (product_1) {
                    attributeGroups = product_1.attributeGroups;
                    array_1 = [];
                    attributeGroups.map(function (attributeGroup) {
                        array_1.push(attributeGroup.attributes);
                    });
                    combinations = generateVariants(array_1);
                    combinations.map(function (combination) { return __awaiter(void 0, void 0, void 0, function () {
                        var images, arr;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    images = [];
                                    arr = combination.map(function (group) {
                                        var attributeObj = {
                                            attributeGroup: { connect: { id: group.attributeGroupId } },
                                            attribute: { connect: { id: group.id } },
                                        };
                                        group.images.map(function (image) {
                                            images.push({
                                                publicId: image.publicId,
                                                url: image.url,
                                                importedFromAttribute: true,
                                            });
                                        });
                                        return attributeObj;
                                    });
                                    return [4 /*yield*/, db.productVariant.create({
                                            data: {
                                                product: { connect: { id: product_1.id } },
                                                price: product_1.price,
                                                quantity: 0,
                                                productVariantAttributes: {
                                                    create: arr,
                                                },
                                                variantImages: {
                                                    create: __spreadArray([], images, true),
                                                },
                                            },
                                        })];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/, response.status(201).json("Success.")];
                }
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                return [2 /*return*/, response.status(500).json(error_7.message)];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get("/products/get-product-images/:productId", function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, productImages, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                productId = request.params.productId;
                return [4 /*yield*/, db.productImage.findMany({
                        where: { productId: Number(productId) },
                        orderBy: { position: "asc" },
                    })];
            case 1:
                productImages = _a.sent();
                if (productImages) {
                    return [2 /*return*/, response.status(200).json(productImages)];
                }
                else {
                    return [2 /*return*/, response.status(200).send("No product images.")];
                }
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.log(error_8);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get("/products/get-variants-by-prod-id/:productId", function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, variants, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                productId = request.params.productId;
                return [4 /*yield*/, db.productVariant.findMany({
                        where: { productId: Number(productId) },
                        include: {
                            productVariantAttributes: {
                                include: {
                                    attributeGroup: { include: { attributes: true } },
                                    attribute: true,
                                },
                            },
                            variantImages: true,
                        },
                    })];
            case 1:
                variants = _a.sent();
                return [2 /*return*/, response.status(200).json(variants)];
            case 2:
                error_9 = _a.sent();
                console.log(error_9);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post("/products/edit-attributes", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var attributeGroupId, attributes, i, attribute, dbAttribute, j, attributeImage, cloudinaryImage, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 11, , 12]);
                attributeGroupId = request.body.attributeGroupId;
                attributes = request.body.attributes;
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < attributes.length)) return [3 /*break*/, 10];
                attribute = attributes[i];
                return [4 /*yield*/, db.attribute.upsert({
                        where: { id: Number(attribute.attributeId) },
                        create: {
                            name: attribute.name,
                            attributeGroup: { connect: { id: Number(attributeGroupId) } },
                        },
                        update: { name: attribute.name },
                    })];
            case 2:
                dbAttribute = _a.sent();
                j = 0;
                _a.label = 3;
            case 3:
                if (!(j < attribute.images.length)) return [3 /*break*/, 9];
                attributeImage = attribute.images[j];
                if (!!attributeImage.id) return [3 /*break*/, 6];
                return [4 /*yield*/, cloudinary.uploadImage(attributeImage.imagePath, attributeImage.imageName)];
            case 4:
                cloudinaryImage = _a.sent();
                return [4 /*yield*/, db.attributeImage.create({
                        data: {
                            publicId: cloudinaryImage === null || cloudinaryImage === void 0 ? void 0 : cloudinaryImage.public_id,
                            url: cloudinaryImage === null || cloudinaryImage === void 0 ? void 0 : cloudinaryImage.url,
                            position: j + 1,
                            attribute: { connect: { id: dbAttribute.id } },
                        },
                    })];
            case 5:
                _a.sent();
                return [3 /*break*/, 8];
            case 6: return [4 /*yield*/, db.attributeImage.update({
                    where: {
                        id: attributeImage.id,
                    },
                    data: {
                        position: j + 1,
                    },
                })];
            case 7:
                _a.sent();
                _a.label = 8;
            case 8:
                j++;
                return [3 /*break*/, 3];
            case 9:
                i++;
                return [3 /*break*/, 1];
            case 10:
                response.status(200);
                return [3 /*break*/, 12];
            case 11:
                error_10 = _a.sent();
                console.log(error_10);
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
module.exports = router;
