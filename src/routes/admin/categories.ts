import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");

const db: prisma.PrismaClient = require("../../lib/prisma.server");
const router = express.Router();

router.post(
  "/categories/add-category",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    const category = request.body.category;
    try {
      const dbCategory = await db.category.create({
        data: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          ...(category.parentId ? { parentId: category.parentId } : null),
        },
      });
      const categories = await db.category.findMany({
        select: { id: true, name: true },
      });
      return response.status(200).json({
        categories,
        message: `Category '${dbCategory.name}' successfully added.`,
      });
    } catch (error) {
      return response
        .status(400)
        .send(`Operation to add category '${category.name}' failed.`);
    }
  }
);

router.get(
  "/categories/get-category/:categoryId",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const categoryId = request.params.categoryId;
      const category = await db.category.findUnique({
        where: { id: Number(categoryId) },
        include: {
          children: true,
        },
      });
      const subcategories = await db.category.findMany({
        where: { NOT: { id: Number(categoryId) } },
        select: { name: true, id: true },
      });
      return response.status(200).json({ category, subcategories });
    } catch (error: any) {
      console.log(error.message);
    }
  }
);

router.post(
  "/categories/edit-category/:categoryId",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    const categoryId = request.params.categoryId;
    const category = request.body.category;
    const subcategoryIds = [];
    for (let i = 0; i < category.subcategories.length; i++) {
      subcategoryIds.push({ id: category.subcategories[i] });
    }
    try {
      const updatedCategory = await db.category.update({
        where: { id: Number(categoryId) },
        data: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          children: { set: [], connect: subcategoryIds },
        },
        include: { children: true },
      });
      return response.status(200).json(updatedCategory);
    } catch (error: any) {
      console.log(error.message);
    }
  }
);

router.delete(
  "/categories/delete-category/:categoryId",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const categoryId = request.params.categoryId;
      await db.category.delete({ where: { id: Number(categoryId) } });
      const categories = await db.category.findMany({
        include: { children: true },
      });
      return response.status(200).json(categories);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
