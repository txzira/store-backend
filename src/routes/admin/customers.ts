import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");

const db: prisma.PrismaClient = require("../../lib/prisma.server");
const router = express.Router();

router.get(
  "/customers/get-all-customers",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const customers = await db.user.findMany({
        where: { role: "CUSTOMER" },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      response.status(200).json(customers);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
