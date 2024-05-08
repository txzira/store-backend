import express = require("express");
import prisma = require("@prisma/client");
const auth = require("../auth");

import cloudinary = require("../../lib/cloudinary");

const db: prisma.PrismaClient = require("../../lib/prisma.server");
const router = express.Router();

router.get(
  "/products/get-all-products",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: any, response: express.Response) => {
    try {
      const products = await db.product.findMany({
        include: {
          images: { orderBy: { position: "asc" } },
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

router.post(
  "/products/add-product",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const product = request.body.product;
      const productImages = request.body.productImages;

      const dbProduct = await db.product.create({
        data: {
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          quantity: product.stock,

          active: product.active,
          ...(product.brand ? { brandId: product.brand } : 0),

          price: product.price,
          description: product.description,
        },
      });

      for (let i = 0; i < productImages.length; i++) {
        const cloudinaryImage = await cloudinary.uploadImage(
          productImages[i].imagePath,
          productImages[i].imageName
        );
        await db.productImage.create({
          data: {
            product: { connect: { id: Number(dbProduct.id) } },
            publicId: cloudinaryImage?.public_id!,
            url: cloudinaryImage?.url!,
            position: i + 1,
          },
        });
      }
      return response.status(200).json(dbProduct);
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/products/edit-product/:id",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const productId = request.params.id;
      const product = request.body.product;
      const productImages = request.body.productImages;

      for (let i = 0; i < productImages.length; i++) {
        if (!productImages[i].id) {
          const cloudinaryImage = await cloudinary.uploadImage(
            productImages[i].imagePath,
            productImages[i].imageName
          );
          await db.productImage.create({
            data: {
              product: { connect: { id: Number(productId) } },
              publicId: cloudinaryImage?.public_id!,
              url: cloudinaryImage?.url!,
              position: i + 1,
            },
          });
        } else {
          await db.productImage.update({
            where: { id: productImages[i].id },

            data: {
              position: i + 1,
            },
          });
        }
      }
      const categories = [];

      for (let i = 0; i < product.categories.length; i++) {
        categories.push({ id: product.categories[i] });
      }

      const dbProduct = await db.product.update({
        where: { id: Number(productId) },
        data: {
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          quantity: product.stock,
          categories: { connect: categories },
          active: product.active,
          ...(product.brand
            ? { brandId: product.brand }
            : { brand: { disconnect: true } }),

          price: product.price,
          description: product.description,
        },
      });
      return response.status(200).json(dbProduct);
    } catch (error) {
      console.log(error);
    }
  }
);

router.delete(
  "/products/delete-product/:productId",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const productId = request.params.productId;
      await db.product.delete({ where: { id: Number(productId) } });
      const products = await db.product.findMany({});

      return response.status(200).json(products);
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/products/get-attr-groups-by-prod-id/:productId",
  async (request: express.Request, response: express.Response) => {
    try {
      const productId = request.params.productId;
      const attributeGroups = await db.attributeGroup.findMany({
        where: { productId: Number(productId) },
        include: {
          attributes: { include: { images: { orderBy: { position: "asc" } } } },
        },
      });
      return response.status(200).json(attributeGroups);
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/products/save-attr-groups-changes",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const productId = request.body.productId;
      const attributeGroups = request.body.attributeGroups;
      const attributesToDelete = request.body.attributesToDelete;

      for (let i = 0; i < attributeGroups.length; i++) {
        await db.attributeGroup.upsert({
          where: { id: attributeGroups[i].id },
          create: {
            name: attributeGroups[i].name,
            product: { connect: { id: Number(productId) } },
            attributes: {
              createMany: {
                data: attributeGroups[i].attributes.map((attribute: any) => {
                  return { name: attribute.name };
                }),
              },
            },
          },
          update: {
            name: attributeGroups[i].name,
            attributes: {
              upsert: attributeGroups[i].attributes.map((attribute: any) => {
                return {
                  where: { id: attribute.id },
                  create: { name: attribute.name },
                  update: {},
                };
              }),
            },
          },
        });
      }
      for (let i = 0; i < attributesToDelete.length; i++) {
        await db.attribute.delete({
          where: {
            id: attributesToDelete[i].id,
          },
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/products/save-and-generate-variants",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const productId = request.body.productId;
      const product = await db.product.findUnique({
        where: { id: Number(productId) },
        include: {
          attributeGroups: {
            include: { attributes: { include: { images: true } } },
          },
        },
      });
      if (product) {
        const attributeGroups = product.attributeGroups;

        const array: prisma.Attribute[][] = [];

        attributeGroups.map((attributeGroup) => {
          array.push(attributeGroup.attributes);
        });

        const combinations = generateVariants(array);
        combinations.map(async (combination) => {
          const images: any[] = [];
          const arr = combination.map((group) => {
            const attributeObj = {
              attributeGroup: { connect: { id: group.attributeGroupId } },
              attribute: { connect: { id: group.id } },
            };
            group.images.map((image: any) => {
              images.push({
                publicId: image.publicId,
                url: image.url,
                importedFromAttribute: true,
              });
            });
            return attributeObj;
          });
          await db.productVariant.create({
            data: {
              product: { connect: { id: product.id } },
              price: product.price,
              quantity: 0,
              productVariantAttributes: {
                create: arr,
              },
              variantImages: {
                create: [...images],
              },
            },
          });
        });
        return response.status(201).json(`Success.`);
      }
    } catch (error: any) {
      return response.status(500).json(error.message);
    }

    function generateVariants(attributeGroupsArray: prisma.Attribute[][]) {
      let firstAttributeGroupArray = attributeGroupsArray[0];
      let attributeGroupIncrementor = 1;
      if (attributeGroupIncrementor === attributeGroupsArray.length) {
        return firstAttributeGroupArray.map((attribute) => {
          return [attribute];
        });
      } else {
        const combinations = makeCombinations(firstAttributeGroupArray);
        return combinations;
      }

      function makeCombinations(arr: any) {
        const startArray = arr;
        const combinations = [];

        for (let x = 0; x < startArray.length; x++) {
          for (
            let y = 0;
            y < attributeGroupsArray[attributeGroupIncrementor].length;
            y++
          ) {
            if (Array.isArray(startArray[x])) {
              const temp = [
                ...startArray[x],
                attributeGroupsArray[attributeGroupIncrementor][y],
              ];
              combinations.push(temp);
            } else {
              combinations.push([
                startArray[x],
                attributeGroupsArray[attributeGroupIncrementor][y],
              ]);
            }
          }
        }
        attributeGroupIncrementor++;
        if (attributeGroupIncrementor === attributeGroupsArray.length) {
          return combinations;
        }

        return makeCombinations(combinations);
      }
    }
  }
);

router.get(
  "/products/get-product-images/:productId",
  async (request: express.Request, response: express.Response) => {
    try {
      const productId = request.params.productId;

      const productImages = await db.productImage.findMany({
        where: { productId: Number(productId) },
        orderBy: { position: "asc" },
      });
      if (productImages) {
        return response.status(200).json(productImages);
      } else {
        return response.status(200).send("No product images.");
      }
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/products/get-variants-by-prod-id/:productId",
  async (request: express.Request, response: express.Response) => {
    try {
      const productId = request.params.productId;
      const variants = await db.productVariant.findMany({
        where: { productId: Number(productId) },
        include: {
          productVariantAttributes: {
            include: {
              attributeGroup: { include: { attributes: true } },
              attribute: true,
            },
          },

          variantImages: true,
        },
      });
      return response.status(200).json(variants);
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/products/edit-attributes",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const attributeGroupId = request.body.attributeGroupId;
      const attributes = request.body.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attribute = attributes[i];
        const dbAttribute = await db.attribute.upsert({
          where: { id: Number(attribute.attributeId) },
          create: {
            name: attribute.name,
            attributeGroup: { connect: { id: Number(attributeGroupId) } },
          },
          update: { name: attribute.name },
        });
        for (let j = 0; j < attribute.images.length; j++) {
          const attributeImage = attribute.images[j];
          if (!attributeImage.id) {
            const cloudinaryImage = await cloudinary.uploadImage(
              attributeImage.imagePath,
              attributeImage.imageName
            );
            await db.attributeImage.create({
              data: {
                publicId: cloudinaryImage?.public_id!,
                url: cloudinaryImage?.url!,
                position: j + 1,
                attribute: { connect: { id: dbAttribute.id } },
              },
            });
          } else {
            await db.attributeImage.update({
              where: {
                id: attributeImage.id,
              },
              data: {
                position: j + 1,
              },
            });
          }
        }
      }

      response.status(200);
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;
