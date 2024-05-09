import express = require("express");
import prisma = require("@prisma/client");

const db: prisma.PrismaClient = require("../../lib/prisma.server");

const router = express.Router();

// router.get(
//   "/products/get-all-active-products",
//   async (request: express.Request, response: express.Response) => {
//     try {
//       console.log("prducts url");
//       const products = await db.product.findMany({
//         where: { active: true },
//         include: {
//           images: { orderBy: { position: "asc" } },
//           attributeGroups: {
//             include: { attributes: { include: { images: true } } },
//           },
//         },
//       });

//       return response.status(200).json({ products });
//     } catch (error) {
//       console.log(error);
//     }
//   }
// );

router.get(
  "/products/:id",
  async (request: express.Request, response: express.Response) => {
    try {
      const id = request.params.id;
      const product = await db.product.findUnique({
        where: { id: Number(id) },
        include: {
          images: true,
          brand: true,
          productVariants: {
            include: {
              productVariantAttributes: {
                include: { attribute: true, attributeGroup: true },
              },
              variantImages: { select: { url: true } },
            },
          },
          attributeGroups: { include: { attributes: true } },
          categories: true,
        },
      });
      return response.status(200).json(product);
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/products/get-products-by-category/:categoryName",
  async (request: express.Request, response: express.Response) => {
    try {
      let categoryName = request.params.categoryName;
      categoryName =
        categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
      const products = await db.product.findMany({
        where: { categories: { some: { name: categoryName } }, active: true },
        include: { images: true },
      });
      return response.status(200).json(products);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
