"use strict";
exports.__esModule = true;
var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var session = require("express-session");
var passport = require("passport");
var serverless = require("serverless-http");
require("dotenv").config();
var chalk = require("chalk");
var debug = require("debug")("app");
var morgan = require("morgan");
var cors_1 = require("cors");
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
    cookie: { maxAge: 3600000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((0, cors_1["default"])({
    credentials: true,
    origin: [process.env.ORIGIN_URL]
}));
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
module.exports.handler = serverless(app);
