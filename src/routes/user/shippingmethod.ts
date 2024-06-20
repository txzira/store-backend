import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");

const db: prisma.PrismaClient = require("../../lib/prisma.server");

const router = express.Router();

router.get(
  "/shipping-methods/get-shipping-methods-by-country/:country",
  async (request: express.Request, response: express.Response) => {
    try {
      const country = request.params.country;
      const shippingMethods = await db.shippingMethod.findMany({
        where: { active: true, countries: { has: country } },
      });
      response.status(200).json(shippingMethods);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
