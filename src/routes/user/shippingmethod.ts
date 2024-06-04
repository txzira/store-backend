import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");

const db: prisma.PrismaClient = require("../../lib/prisma.server");

const router = express.Router();

router.get(
  "/shipping-method/get-shipping-methods",
  async (request: express.Request, response: express.Response) => {
    try {
      const shippingMethods = await db.shippingMethod.findMany();
      response.status(200).json(shippingMethods);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
