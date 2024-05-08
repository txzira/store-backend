import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");

const db: prisma.PrismaClient = require("../../lib/prisma.server");
const router = express.Router();

router.post(
  "/brands/add-brand",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const brand = request.body.brand;
      await db.brand.create({ data: { name: brand.name } });
      const brands = await db.brand.findMany({});

      return response.status(200).json(brands);
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/brands/edit-brand",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const brand = request.body.brand;
      await db.brand.update({
        where: { id: brand.id },
        data: { name: brand.name },
      });
      const brands = await db.brand.findMany({});

      return response.status(200).json(brands);
    } catch (error) {
      console.log(error);
    }
  }
);

router.delete(
  "/brands/delete-brand/:brandId",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const brandId = request.params.brandId;
      console.log(brandId);
      await db.brand.delete({ where: { id: Number(brandId) } });
      const brands = await db.brand.findMany({});

      return response.status(200).json(brands);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
