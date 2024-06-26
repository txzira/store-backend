import express = require("express");
import prisma = require("@prisma/client");
import { Pool } from "pg";
import test from "node:test";
const pool: Pool = require("../../lib/pgconfig").pool;

const db: prisma.PrismaClient = require("../../lib/prisma.server");

const router = express.Router();

router.get(
  "/products/get-all-active-products",
  async (request: express.Request, response: express.Response) => {
    try {
      // const supaProducts = await pool.query(
      //   `SELECT p.*, json_agg(json_build_object(
      //     \'id\',i.id,
      //     \'url\',i.url,
      //     \'productId\',i."productId",
      //     \'position\',i.position
      //   )) as images,
      //   json_agg(json_build_object(
      //     \'id\',a.id,
      //     \'name\',a.name
      //   )) as "attributeGroups"
      //   FROM "Product" p LEFT JOIN "ProductImage" i ON p.id=i."productId" LEFT OUTER JOIN "AttributeGroup" a ON p.id=a."productId"  WHERE active=true GROUP BY p.id ORDER BY "createdAt" ASC`
      // );

      // const testQuery = await pool.query(`WITH "Images" AS (
      //   SELECT "productId",json_agg(json_build_object(\'url\',url)) as urls
      //   FROM "ProductImage"
      //   GROUP BY "productId"
      // ),"AttrGroups" AS (
      //   SELECT "productId", json_agg(json_build_object(\'name\',name)) as attribute_groups
      //   FROM "AttributeGroup"
      //   GROUP BY "productId"
      // )
      // SELECT p.* FROM "Product" p
      // LEFT JOIN "Images" ON "Images"."productId"=p.id
      // LEFT JOIN "AttrGroups" ON "AttrGroups"."productId"=p.id
      // WHERE active=true
      // `);
      // console.log(testQuery.rows);
      // const supaProducts = await pool.query(
      //   `SELECT json_build_object(
      //       \'url\',p.id,
      //       \'productId\', p.id,
      //       \'position\',p.id
      //     )
      //     FROM "Product" p  WHERE active=true ORDER BY "createdAt" ASC`
      // );
      // const images = await pool.query(
      //   `SELECT "productId",json_agg(json_build_object(\'url\',url)) as urls FROM "ProductImage" GROUP BY "productId"`
      // );
      // console.log(images.rows[]); 7
      // json_agg(json_build_object(
      //   \'id\',a.id,
      //   \'name\',a.name
      // )) as "attributeGroups"

      // console.log(supaProducts.rows[9]);
      const products = await db.product.findMany({
        where: { active: true },
        include: {
          brand: true,
          images: { orderBy: { position: "asc" } },
          attributeGroups: {
            include: { attributes: { include: { images: true } } },
          },
          productVariants: {
            include: {
              productVariantAttributes: {
                include: {
                  attribute: true,
                },
              },
              variantImages: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      // console.log(products[9]);

      return response.status(200).json(products);
    } catch (error) {
      console.log(error);
    } finally {
    }
  }
);

router.get(
  "/products/prod-by-id/:id",
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
  "/products/prod-by-slug/:slug",
  async (request: express.Request, response: express.Response) => {
    try {
      const slug = request.params.slug;
      const product = await db.product.findUnique({
        where: { slug: slug },
        include: {
          images: true,
          brand: true,
          productVariants: {
            include: {
              productVariantAttributes: {
                include: {
                  attribute: { include: { images: true } },
                  attributeGroup: true,
                },
              },
              variantImages: { select: { url: true } },
            },
          },
          attributeGroups: {
            include: { attributes: true },
          },
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
        include: {
          images: true,
          attributeGroups: {
            include: { attributes: { include: { images: true } } },
          },
        },
      });
      return response.status(200).json(products);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
