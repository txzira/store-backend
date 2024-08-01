import express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
// const session = require("cookie-session");
const session = require("express-session");
import createMemoryStore = require("memorystore");

const MemoryStore = createMemoryStore(session);

const passport = require("passport");
require("dotenv").config();

const chalk = require("chalk");
const debug = require("debug")("app");
const morgan = require("morgan");
import cors from "cors";

const authRoutes = require("./routes/auth");

const adminProductRoutes = require("./routes/admin/products");
const adminCategoriesRoutes = require("./routes/admin/categories");
const adminBrandsRoutes = require("./routes/admin/brands");
const adminOrdersRoutes = require("./routes/admin/orders");
const adminCustomersRoutes = require("./routes/admin/customers");
const adminShippingMethodRoutes = require("./routes/admin/shippingmethod");

const userCategoriesRoutes = require("./routes/user/categories");
const userCheckoutRoutes = require("./routes/user/checkout");
const userProductsRoutes = require("./routes/user/products");
const userUsersRoutes = require("./routes/user/users");
const userAccountRoutes = require("./routes/user/account");
const userBrandsRoutes = require("./routes/user/brands");
const userShippingMethodRoutes = require("./routes/user/shippingmethod");
const stripeWebhook = require("./routes/stripe/webhook");

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.static("public"));
app.use(cookieParser());
// app.use(bodyParser.raw({ type: "*/*" }));
app.use("/", stripeWebhook);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("tiny"));

process.env.PRODUCTION_ENVIR === "true" ? app.set("trust proxy", 1) : null;
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 3600000,
      ...(process.env.PRODUCTION_ENVIR === "true"
        ? { sameSite: "none", secure: true }
        : null),
    },
    store: new MemoryStore({ checkPeriod: 86400000 }),
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
app.use("/admin", adminShippingMethodRoutes);

app.use("/", userCategoriesRoutes);
app.use("/", userCheckoutRoutes);
app.use("/", userProductsRoutes);
app.use("/", userUsersRoutes);
app.use("/", userAccountRoutes);
app.use("/", userBrandsRoutes);
app.use("/", userShippingMethodRoutes);

app.listen(PORT, () => {
  debug(`Listening on port ${chalk.red(PORT)}`);
});
