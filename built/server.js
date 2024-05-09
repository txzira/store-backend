"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var session = require("cookie-session");
var passport = require("passport");
require("dotenv").config();
var chalk = require("chalk");
var debug = require("debug")("app");
var morgan = require("morgan");
var cors_1 = __importDefault(require("cors"));
var authRoutes = require("./routes/auth");
var adminProductRoutes = require("./routes/admin/products");
var adminCategoriesRoutes = require("./routes/admin/categories");
var adminBrandsRoutes = require("./routes/admin/brands");
var adminOrdersRoutes = require("./routes/admin/orders");
var adminCustomersRoutes = require("./routes/admin/customers");
var userCategoriesRoutes = require("./routes/user/categories");
var userCheckoutRoutes = require("./routes/user/checkout");
var userProductsRoutes = require("./routes/user/products");
var userUsersRoutes = require("./routes/user/users");
var userAccountRoutes = require("./routes/user/account");
var userBrandsRoutes = require("./routes/user/brands");
var PORT = Number(process.env.PORT) || 3000;
var app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(morgan("tiny"));
// app.use(express.static(path.join(__dirname, "/public/")));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((0, cors_1.default)({
    credentials: true,
    origin: [process.env.ORIGIN_URL],
}));
app.get("/", function (request, response) {
    return response.send("hello world");
});
app.use("/", authRoutes);
app.use("/admin", adminProductRoutes);
app.use("/admin", adminCategoriesRoutes);
app.use("/admin", adminBrandsRoutes);
app.use("/admin", adminOrdersRoutes);
app.use("/admin", adminCustomersRoutes);
app.use("/", userCategoriesRoutes);
app.use("/", userCheckoutRoutes);
app.use("/", userProductsRoutes);
app.use("/", userUsersRoutes);
app.use("/", userAccountRoutes);
app.use("/", userBrandsRoutes);
app.listen(PORT, "0.0.0.0", function () {
    debug("Listening on port ".concat(chalk.red(PORT)));
});
