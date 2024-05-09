import express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
// const session = require("cookie-session");
const session = require("express-session");

const passport = require("passport");
require("dotenv").config();

const chalk = require("chalk");
const debug = require("debug")("app");
const morgan = require("morgan");
import cors from "cors";
import { hostname } from "os";
const authRoutes = require("./routes/auth");

const adminProductRoutes = require("./routes/admin/products");
const adminCategoriesRoutes = require("./routes/admin/categories");
const adminBrandsRoutes = require("./routes/admin/brands");
const adminOrdersRoutes = require("./routes/admin/orders");
const adminCustomersRoutes = require("./routes/admin/customers");

const userCategoriesRoutes = require("./routes/user/categories");
const userCheckoutRoutes = require("./routes/user/checkout");
const userProductsRoutes = require("./routes/user/products");
const userUsersRoutes = require("./routes/user/users");
const userAccountRoutes = require("./routes/user/account");
const userBrandsRoutes = require("./routes/user/brands");

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.static("public"));
// app.use(express.static(path.join(__dirname, 'build')));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("tiny"));

// app.use(express.static(path.join(__dirname, "/public/")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000, secure: true },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(
  cors({
    credentials: true,
    origin: [process.env.ORIGIN_URL!],
  })
);
app.get("/", (request: express.Request, response: express.Response) => {
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

app.listen(PORT, "0.0.0.0", () => {
  debug(`Listening on port ${chalk.red(PORT)}`);
});
