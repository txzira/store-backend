import express = require("express");
import prisma = require("@prisma/client");

const db: prisma.PrismaClient = require("../../lib/prisma.server");
const router = express.Router();

router.get(
  "/categories/get-categories",
  async (request: express.Request, response: express.Response) => {
    try {
      const categories = await db.category.findMany({
        include: { children: true },
      });

      return response.status(200).json(categories);
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/categories/get-parent-categories",
  async (request: express.Request, response: express.Response) => {
    try {
      const categories = await db.category.findMany({
        where: { parentId: null, product: { some: { active: true } } },
      });
      return response.status(200).json(categories);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
