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
var auth = require("../auth");
var db = require("../../lib/prisma.server");
var router = express.Router();
router.post("/categories/add-category", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var category, dbCategory, categories, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                category = request.body.category;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db.category.create({
                        data: __assign({ name: category.name, slug: category.slug, description: category.description }, (category.parentId ? { parentId: category.parentId } : null)),
                    })];
            case 2:
                dbCategory = _a.sent();
                return [4 /*yield*/, db.category.findMany({
                        select: { id: true, name: true },
                    })];
            case 3:
                categories = _a.sent();
                return [2 /*return*/, response.status(200).json({
                        categories: categories,
                        message: "Category '".concat(dbCategory.name, "' successfully added."),
                    })];
            case 4:
                error_1 = _a.sent();
                return [2 /*return*/, response
                        .status(400)
                        .send("Operation to add category '".concat(category.name, "' failed."))];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get("/categories/get-category/:categoryId", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var categoryId, category, subcategories, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                categoryId = request.params.categoryId;
                return [4 /*yield*/, db.category.findUnique({
                        where: { id: Number(categoryId) },
                        include: {
                            children: true,
                        },
                    })];
            case 1:
                category = _a.sent();
                return [4 /*yield*/, db.category.findMany({
                        where: { NOT: { id: Number(categoryId) } },
                        select: { name: true, id: true },
                    })];
            case 2:
                subcategories = _a.sent();
                return [2 /*return*/, response.status(200).json({ category: category, subcategories: subcategories })];
            case 3:
                error_2 = _a.sent();
                console.log(error_2.message);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post("/categories/edit-category/:categoryId", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var categoryId, category, subcategoryIds, i, updatedCategory, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                categoryId = request.params.categoryId;
                category = request.body.category;
                subcategoryIds = [];
                for (i = 0; i < category.subcategories.length; i++) {
                    subcategoryIds.push({ id: category.subcategories[i] });
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db.category.update({
                        where: { id: Number(categoryId) },
                        data: {
                            name: category.name,
                            slug: category.slug,
                            description: category.description,
                            children: { set: [], connect: subcategoryIds },
                        },
                        include: { children: true },
                    })];
            case 2:
                updatedCategory = _a.sent();
                return [2 /*return*/, response.status(200).json(updatedCategory)];
            case 3:
                error_3 = _a.sent();
                console.log(error_3.message);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.delete("/categories/delete-category/:categoryId", [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()], function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var categoryId, categories, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                categoryId = request.params.categoryId;
                return [4 /*yield*/, db.category.delete({ where: { id: Number(categoryId) } })];
            case 1:
                _a.sent();
                return [4 /*yield*/, db.category.findMany({
                        include: { children: true },
                    })];
            case 2:
                categories = _a.sent();
                return [2 /*return*/, response.status(200).json(categories)];
            case 3:
                error_4 = _a.sent();
                console.log(error_4);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
module.exports = router;
