import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");

const db: prisma.PrismaClient = require("../../lib/prisma.server");
const router = express.Router();

router.get(
  "/orders/get-all-orders",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const orders = await db.order.findMany({
        include: { customer: { select: { firstName: true, lastName: true } } },
      });
      response.status(200).json(orders);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
