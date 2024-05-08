import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");

const db: prisma.PrismaClient = require("../../lib/prisma.server");
const router = express.Router();

router.get(
  "/brands/get-all-brands",
  async (request: express.Request, response: express.Response) => {
    try {
      const brands = await db.brand.findMany({});

      return response.status(200).json(brands);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
