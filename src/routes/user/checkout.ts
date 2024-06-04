import express = require("express");
import Stripe = require("stripe");
import db = require("@prisma/client");

const prisma = new db.PrismaClient();
const router = express.Router();

const stripe = new Stripe.Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16",
});

interface CartItem {
  id: string;
  productId: number;
  productName: String;
  quantity: number;
  price: number;
  image: string;
  variant: CartItemVariant | undefined;
}
interface CartItemVariant {
  id: number;
  productVariantAttributes: Array<ProductVariantAttribute>;
}
interface ProductVariantAttribute {
  id: number;
  productVariantId: number;
  attibuteGroupId: number;
  attributeId: number;
  attribute: { id: number; name: string; attributeGroupId: number };
  attibuteGroup: { id: number; name: string; productId: number };
}
async function calculateOrderAmount(
  items: CartItem[],
  response: express.Response
) {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  let sum = 0;
  let minimumCharged = false;
  let productsNotAvailable = [];
  let productsNotExist = [];

  //using cart items' productId and productVariantId get price from server of product(s) to avoid client side manipulation of prices
  for (let i = 0; i < items.length; i++) {
    let product:
      | db.Product
      | (db.ProductVariant & { product: db.Product } & {
          productVariantAttributes: (db.ProductVariantAttribute & {
            attribute: db.Attribute;
          })[];
        })
      | null;

    if (items[i].variant) {
      product = await prisma.productVariant.findFirst({
        where: {
          AND: [
            { id: items[i].variant?.id },
            { productId: items[i].productId },
          ],
        },
        include: {
          product: true,
          productVariantAttributes: { include: { attribute: true } },
        },
      });
      //product availability validation
      if (product && !product.available) {
        let variantName = "";
        const productVariantAttributes = product.productVariantAttributes;
        for (let i = 0; i < productVariantAttributes.length; i++) {
          if (i !== productVariantAttributes.length - 1) {
            variantName += productVariantAttributes[i].attribute.name + " - ";
          } else {
            variantName += productVariantAttributes[i].attribute.name;
          }
        }
        productsNotAvailable.push({
          productName: product.product.name,
          isVariant: true,
          variantName,
        });
      }
    } else {
      product = await prisma.product.findFirst({
        where: {
          id: items[i].productId,
        },
      });
      //product availability validation
      if (product && !product.available) {
        productsNotAvailable.push({
          productName: product.name,
          isVariant: false,
          variantName: "",
        });
      }
    }
    if (product) {
      sum += product.price * items[i].quantity;
    } else {
      //item doesnt exist
      if (items[i].variant) {
        let variantName = "";
        const productVariantAttributes =
          items[i].variant!.productVariantAttributes;
        for (let j = 0; j < productVariantAttributes.length; j++) {
          if (j !== productVariantAttributes.length - 1) {
            variantName += productVariantAttributes[j].attribute.name + " - ";
          } else {
            variantName += productVariantAttributes[j].attribute.name;
          }
        }
        productsNotExist.push({
          productName: items[i].productName,
          isVariant: true,
          variantName,
        });
      } else {
        productsNotExist.push({
          productName: items[i].productName,
          isVariant: false,
          variantName: "",
        });
      }
    }
  }
  if (productsNotExist.length) {
    throw {
      message:
        "Product(s) in the cart does not exist. Remove the following product(s) from your cart:",
      products: JSON.stringify(productsNotExist),
    };
  }
  if (productsNotAvailable.length) {
    throw {
      message:
        "Product(s) in the cart does are not available. Remove the following product(s) from your cart:",
      products: JSON.stringify(productsNotAvailable),
    };
  }
  if (sum === 0) {
    //minimum stripe charge
    sum += 1;
    minimumCharged = true;
  }

  return { sum, minimumCharged };
}

router.post(
  "/create-payment-intent",
  async (request: express.Request, response: express.Response) => {
    try {
      // Creates a PaymentIntent with order total and sends PaymentIntent's client secret.
      const { items }: { items: CartItem[] } = request.body;
      const orderTotal = await calculateOrderAmount(items, response);
      if (orderTotal) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: orderTotal.sum * 100,
          currency: "usd",
          // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
          automatic_payment_methods: {
            enabled: true,
          },
        });
        return response.send({
          clientSecret: paymentIntent.client_secret,
          orderTotal: paymentIntent.amount,
          minimumCharged: orderTotal.minimumCharged,
        });
      }
    } catch (error: any) {
      if (error.type === "StripeInvalidRequestError") {
        return response.status(500).send("Stripe order error.");
      } else {
        if (error.code === 1234) {
          return response.status(400).json({
            message: error.message,
            productsNotExist: error.productsNotExist,
            code: error.code,
          });
        }
        if (error.code === 1235) {
          return response.status(400).json({
            message: error.message,
            productsNotAvailable: error.productsNotAvailable,
            code: error.code,
          });
        }
        return response.status(500).send(error);
      }
    }
  }
);

router.post(
  "/create-order",
  async (request: express.Request | any, response: express.Response) => {
    const {
      requestShippingForm,
      requestCart,
    }: { requestShippingForm: any; requestCart: any } = request.body;
    try {
      const user = request.user;

      const shippingAddress = await prisma.orderShippingAddress.create({
        data: {
          firstName: requestShippingForm.firstName,
          lastName: requestShippingForm.lastName,
          country: requestShippingForm.country,
          streetAddress: requestShippingForm.address1,
          streetAddress2: requestShippingForm.address2,
          city: requestShippingForm.city,
          state: requestShippingForm.state,
          zipCode: requestShippingForm.postalCode,
        },
      });
      const cart = await createCart(requestCart, user);

      const order = await prisma.order.create({
        data: {
          ...(user ? { customerId: user.id } : null),
          cartId: cart.id,
          amount: cart.cartTotal,
          customerEmail: requestShippingForm.email,
          status: "PAYMENT_PENDING",
          shippingAddressId: shippingAddress.id,
          shippingMethodId: "",
        },
      });
      return response
        .status(200)
        .json({ message: "success", order: order.id, cart: cart.id });
    } catch (error: any) {
      console.log(error.message);
      return response.status(400).json({ message: "Failed" });
    }

    async function createCart(_cartItems: CartItem[], user: any = null) {
      let cartSum = 0;
      const cartItems: any = [];
      for (let i = 0; i < _cartItems.length; i++) {
        if (_cartItems[i].variant) {
          const productVariant = await getProductVariant(
            _cartItems[i].variant!.id
          );
          if (productVariant) {
            const { productName, variantName } =
              makeProductVariantName(productVariant);
            cartItems.push({
              productId: productVariant.productId,
              variantId: productVariant.id,
              productName: productName,
              variantName: variantName,
              price: productVariant.price,
              quantity: _cartItems[i].quantity,
            });
            cartSum += productVariant.price * _cartItems[i].quantity;
          } else {
            console.log("ERROR: Invalid product variant in cart");
          }
        } else {
          const product = await getProduct(_cartItems[i].productId);
          if (product) {
            cartItems.push({
              productId: product.id,
              productName: product.name,
              price: product.price,
              quantity: _cartItems[i].quantity,
            });
            cartSum += product.price * _cartItems[i].quantity;
          } else {
            console.log("ERROR: Invalid product in cart");
          }
        }
      }

      const cart = await prisma.cart.create({
        data: {
          ...(user && { userId: user.id }),
          currentCart: false,
          cartTotal: cartSum,
          cartItems: {
            createMany: {
              data: cartItems,
            },
          },
        },
      });
      return cart;
    }

    async function getProduct(productId: number) {
      return await prisma.product.findFirst({
        where: { id: productId },
      });
    }

    async function getProductVariant(variantId: number) {
      return await prisma.productVariant.findFirst({
        where: { id: variantId },
        include: {
          product: true,
          productVariantAttributes: {
            include: { attribute: true, attributeGroup: true },
          },
        },
      });
    }

    function makeProductVariantName(
      productVariant: db.ProductVariant & {
        product: db.Product;
        productVariantAttributes: (db.ProductVariantAttribute & {
          attributeGroup: db.AttributeGroup;
          attribute: db.Attribute;
        })[];
      }
    ) {
      let variantName: string = "";

      productVariant.productVariantAttributes.map(
        (productVariantAttribute, index: number) => {
          const group = productVariantAttribute.attributeGroup.name;
          const option = productVariantAttribute.attribute.name;
          variantName += group + ": " + option;
          productVariant.productVariantAttributes.length - 1 > index
            ? (variantName += " - ")
            : null;
        }
      );

      return {
        productName: productVariant.product.name,
        variantName: variantName,
      };
    }
  }
);

module.exports = router;
