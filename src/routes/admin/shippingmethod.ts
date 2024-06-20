import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const db: prisma.PrismaClient = require("../../lib/prisma.server");

const router = express.Router();

router.get(
  "/shipping-methods/get-all-shipping-methods",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const shippingMethods = await db.shippingMethod.findMany({});

      response.status(200).json(shippingMethods);
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/shipping-methods/add-shipping-method",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    const shippingMethod = request.body.shippingMethod;
    try {
      const shippingRate = await stripe.shippingRates.create({
        display_name: shippingMethod.name,
        type: "fixed_amount",
        fixed_amount: {
          amount: Number(shippingMethod.price) * 100,
          currency: "usd",
        },
        tax_behavior: "exclusive",
        tax_code: "txcd_92010001",
      });

      await db.shippingMethod.create({
        data: {
          name: shippingMethod.name,
          price: Number(shippingMethod.price),
          active: shippingMethod.active,
          countries: shippingMethod.countries,
          stripeShippingId: shippingRate.id,
        },
      });

      const shippingMethods = await db.shippingMethod.findMany();
      response.status(200).json(shippingMethods);
    } catch (error) {
      console.log(error);
    }
  }
);

router.put(
  "/shipping-methods/edit-shipping-method",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const shippingMethod = request.body.shippingMethod;
      const dbShippingMethod = await db.shippingMethod.update({
        where: { id: shippingMethod.id },
        data: {
          name: shippingMethod.name,
          price: Number(shippingMethod.price),
          active: shippingMethod.active,
          countries: shippingMethod.countries,
        },
      });
      const shippingRate = await stripe.shippingRates.update(
        dbShippingMethod.stripeShippingId,
        {
          display_name: shippingMethod.name,
          fixed_amount: {
            amount: Number(shippingMethod.price) * 100,
            currency: "usd",
          },
        }
      );
      const shippingMethods = await db.shippingMethod.findMany();

      response.status(200).json(shippingMethods);
    } catch (error) {
      console.log(error);
    }
  }
);

router.delete(
  "/shipping-methods/delete-shipping-method/:shippingMethodId",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const shippingMethodId = request.params.shippingMethodId;
      await db.shippingMethod.delete({ where: { id: shippingMethodId } });
      const shippingMethods = await db.shippingMethod.findMany({});
      response.status(200).json(shippingMethods);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
