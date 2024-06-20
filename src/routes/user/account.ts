// import Stripe = require("stripe");
import express = require("express");
import db = require("@prisma/client");
const auth = require("../auth");
const genPassword = require("../../lib/password").genPassword;
const validatePassword = require("../../lib/password").validatePassword;
const prisma = new db.PrismaClient();
const router = express.Router();

router.get(
  "/account-information",
  [auth.isLoggedIn(), auth.checkCSRFToken()],
  async (request: express.Request | any, response: express.Response) => {
    const user = request.user;
    console.log(user);
    try {
      const account = await prisma.user.findFirst({
        where: { id: user.id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          socialProvider: true,
        },
        // include: { orders: true, shippingAddresses: true },
      });

      return response.status(200).json({ message: "Success", account });
    } catch (error: any) {
      return response
        .status(400)
        .json({ message: "Failed", error: error.message });
    }
  }
);

router.get(
  "/account-initial-orders",
  [auth.isLoggedIn(), auth.checkCSRFToken()],
  async (request: express.Request | any, response: express.Response) => {
    const limit = Number(request.query.limit);

    const user = request.user;
    try {
      const orders = await prisma.$transaction([
        prisma.order.count({ where: { customerId: user.id } }),
        prisma.order.findMany({
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
          take: limit,
          skip: 0,
          orderBy: { date: "desc" },
        }),
      ]);
      console.log(orders);
      return response.status(200).json({ message: "Success", orders });
    } catch (error: any) {
      return response
        .status(400)
        .json({ message: "Failed", error: error.message });
    }
  }
);
router.get(
  "/account-orders",
  [auth.isLoggedIn(), auth.checkCSRFToken()],
  async (request: express.Request | any, response: express.Response) => {
    const page = Number(request.query.page) - 1;
    const limit = Number(request.query.limit);
    console.log({ page, limit });

    const user = request.user;
    try {
      const orders = await prisma.order.findMany({
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
        take: limit,
        skip: limit * page,
        orderBy: { date: "desc" },
      });

      console.log(orders);
      return response.status(200).json({ message: "Success", orders });
    } catch (error: any) {
      return response
        .status(400)
        .json({ message: "Failed", error: error.message });
    }
  }
);

router.post(
  "/change-password",
  [auth.isLoggedIn(), auth.checkCSRFToken()],
  async (request: express.Request | any, response: express.Response) => {
    const sessionUser = request.session.passport.user;
    const oldPassword = request.body.oldPassword;
    const newPassword = request.body.newPassword;

    try {
      const user = await prisma.user.findFirst({
        where: { id: sessionUser.id },
      });
      if (validatePassword(oldPassword, user?.password, user?.salt)) {
        //change password
        const saltHash = genPassword(newPassword);
        const salt = saltHash.salt;
        const hash = saltHash.hash;
        // if (user?.password === hash) {
        //   response.status(400).json({
        //     message: "Failed",
        //     error: "New password cannot be the same as old password.",
        //   });
        // }
        await prisma.user.update({
          where: { id: sessionUser.id },
          data: {
            password: hash,
            salt: salt,
          },
        });
        return response.status(200).json({ status: "Success" });
      } else {
        // Old password invalid
        return response
          .status(400)
          .json({ status: "Failed", message: "Invalid Password" });
      }
    } catch (error: any) {
      return response
        .status(400)
        .json({ message: "Failed", error: error.message });
    }
  }
);

module.exports = router;
