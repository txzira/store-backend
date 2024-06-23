import express = require("express");
import Stripe = require("stripe");
import db = require("@prisma/client");

const prisma = new db.PrismaClient();
const router = express.Router();
const nodemailer = require("../../lib/nodemailer");

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

router.post(
  "/checkout/create-payment-intent",
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
          paymentIntent: paymentIntent.id,
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
  "/checkout/add-order-tax-and-shipping",
  async (request: express.Request, response: express.Response) => {
    try {
      const {
        items,
        paymentIntent,
        shippingMethod,
        shippingAddress,
      }: {
        items: CartItem[];
        paymentIntent: string;
        shippingMethod: db.ShippingMethod;
        shippingAddress: any;
      } = request.body;
      const lineItems = [];
      if (items.length) {
        for (let i = 0; i < items.length; i++) {
          const lineItemTotal = await calculateLineItemTotal(items[i]);
          lineItems.push({
            amount: lineItemTotal,
            quantity: items[i].quantity,
            reference: `${items[i].productName}${
              items[i].variant ? items[i].variant?.id : ""
            }`,
            tax_code: "txcd_99999999",
          });
        }

        const taxCalculation = await stripe.tax.calculations.create({
          line_items: lineItems,
          currency: "usd",
          shipping_cost: { shipping_rate: shippingMethod.stripeShippingId },
          customer_details: {
            address: {
              country: shippingAddress.country,
              city: shippingAddress.city,
              line1: shippingAddress.address1,
              line2: shippingAddress.address2,
              postal_code: shippingAddress.postalCode,
              state: shippingAddress.state,
            },
            address_source: "shipping",
          },
        });

        const updatedPaymentIntent = await stripe.paymentIntents.update(
          paymentIntent,
          {
            amount: taxCalculation.amount_total,
            metadata: { tax_calculation_id: taxCalculation.id },
          }
        );
        // taxCalculation.tax_breakdown.map((tax) => {
        //   console.log(tax.tax_rate_details);
        // });
        // console.log(taxCalculation.tax_breakdown);
        // console.log(taxCalculation);

        return response.json({
          orderTotal: updatedPaymentIntent.amount,
          calculatedTax: taxCalculation.tax_amount_exclusive,
        });
      } else {
        const oldPaymentIntent = await stripe.paymentIntents.retrieve(
          paymentIntent
        );
        const dbShippingMethod = await prisma.shippingMethod.findFirst({
          where: { id: shippingMethod.id },
        });
        if (dbShippingMethod) {
          const shippingPrice = dbShippingMethod.price * 100;
          const updatedPaymentIntent = await stripe.paymentIntents.update(
            paymentIntent,
            { amount: oldPaymentIntent.amount + shippingPrice }
          );
          return response.json({
            orderTotal: updatedPaymentIntent.amount,
            calculatedTax: 0,
          });
        }
      }
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/checkout/create-order",
  async (request: express.Request | any, response: express.Response) => {
    try {
      const {
        requestShippingForm,
        requestBillingForm,
        requestCart,
        shippingMethod,
        calculatedTax,
        orderTotal,
        paymentIntentId,
      }: {
        requestShippingForm: any;
        requestBillingForm: any;
        requestCart: any;
        shippingMethod: db.ShippingMethod;
        calculatedTax: any;
        orderTotal: any;
        paymentIntentId: any;
      } = request.body;
      const user = request.user;

      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      const charge = await stripe.charges.retrieve(
        paymentIntent.latest_charge?.toString()!
      );
      const card = charge.payment_method_details?.card!;

      // console.log({ shippingMethod, calculatedTax, orderTotal });

      const cart = await createCart(requestCart, user);

      const dbCard = await prisma.card.create({
        data: {
          brand: card.brand!,
          lastFourDigits: card.last4!,
          expir_month: card.exp_month!,
          expir_year: card.exp_year!,
        },
      });

      const order = await prisma.order.create({
        data: {
          ...(user ? { customerId: user.id } : null),
          cartId: cart.id,
          shippingTotal: shippingMethod.price,
          taxTotal: calculatedTax,
          cartTotal: cart.cartTotal,
          orderTotal: orderTotal,
          customerEmail: requestShippingForm.email,
          status: "PAYMENT_PENDING",
          shippingMethodId: shippingMethod.id,
          cardId: dbCard.id,
        },
        include: {
          cart: { include: { cartItems: true } },
          shippingMethod: { select: { name: true, price: true } },
        },
      });

      const shippingAddress = await prisma.orderShippingAddress.create({
        data: {
          firstName: requestShippingForm.firstName,
          lastName: requestShippingForm.lastName,
          phone: requestShippingForm.phone,
          country: requestShippingForm.country,
          streetAddress: requestShippingForm.address1,
          streetAddress2: requestShippingForm.address2,
          city: requestShippingForm.city,
          state: requestShippingForm.state,
          zipCode: requestShippingForm.postalCode,
          order_id: order.id,
        },
      });

      const billingAddress = await prisma.orderBillingAddress.create({
        data: {
          firstName: requestBillingForm.firstName,
          lastName: requestBillingForm.lastName,
          phone: requestBillingForm.phone,
          country: requestBillingForm.country,
          streetAddress: requestBillingForm.address1,
          streetAddress2: requestBillingForm.address2,
          city: requestBillingForm.city,
          state: requestBillingForm.state,
          zipCode: requestBillingForm.postalCode,
          order_id: order.id,
        },
      });

      //email confirmation
      const usDollarformatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      });

      const orderCart = order.cart.cartItems;
      let orderCartHtmlList = "";
      for (let i = 0; i < orderCart.length; i++) {
        const cartItemHtml = `
          <tr style="width:100%; border-bottom: 1px solid;">
            <td colspan="1">
              <img src="${
                orderCart[i].image
              }" width="75px" height="75px" alt="cart-item-image"/>
            </td>
            <td colspan="1">
              <p style="font-weight:600;">${orderCart[i].productName} x ${
          orderCart[i].quantity
        }</p>
              ${
                orderCart[i].variantName
                  ? `<p style="color:gray;">${orderCart[i].variantName}</p>`
                  : ""
              }
            </td>
            <td style="font-weight:600;" colspan="1">${usDollarformatter.format(
              orderCart[i].price
            )}</td>
          </tr>
        `;
        orderCartHtmlList += cartItemHtml;
      }

      const htmlPart = `
      <div style="width:75%; margin:0 auto; color:black;">
        <div style="text-align:center;">
          <img width="550px" height="75px" src="${process.env.COMPANY_LOGO} "/>
        </div>
        <p>Hello ${shippingAddress.firstName},</p>
        <br/>
        <p>This is a quick email to say we've received your order.</p>
        <p>Once everything is confirmed and ready to ship, we'll send you another email with the tracking details and any other information about your package.</p>
        <p>Your shipping ETA applies from the time you receive this email which should be about one working day from now. We'll follow up as quickly as possible!</p>
        <p>In the meantime, if you have any questions, send us an email at -company email- and we'll be happy to help.</p>
        <br/>
        <hr/>
        <br/>
        <h2>Order Summary</h2>
        <table style="width:80%; border-collapse: collapse;">
          <tbody>
            ${orderCartHtmlList}
            <tr style="width:100%; padding-top:8px;">
              <td colspan="1"></td>
              <td style="font-weight:600;" colspan="1">Sub-total</td>
              <td style="font-weight:600;" colspan="1">${usDollarformatter.format(
                order.cartTotal
              )}</td>
            </tr>
            <tr style="width:100%;">
              <td colspan="1"></td>
              <td style="font-weight:600;" colspan="1">Shipping</td>
              <td style="font-weight:600;" colspan="1">${usDollarformatter.format(
                order.shippingTotal
              )}</td>
            </tr>
            <tr style="width:100%; border-bottom: 1px solid; padding-bottom:8px;">
              <td colspan="1"></td>
              <td style="font-weight:600;" colspan="1">Taxes</td>
              <td style="font-weight:600;" colspan="1">${usDollarformatter.format(
                order.taxTotal
              )}</td>
            </tr>
            <tr style="width:100%;">
              <td colspan="1"></td>
              <td style="font-weight:600;" colspan="1">Total</td>
              <td style="font-weight:600;" colspan="1">${usDollarformatter.format(
                order.orderTotal
              )}</td>
            </tr>
          </tbody>
        </table>
        <br/>
        <hr/>
        <br/>
        <h2>Customer Information</h2>
        <div style="display:flex; width:100%;">
          <div style="margin-right: 150px;">
            <h3>Shipping Address</h3>
            <div>
              <p style="margin:0;">${shippingAddress.firstName} ${
        shippingAddress.lastName
      }</p>
              <p style="margin:0;">${shippingAddress.streetAddress}${
        shippingAddress.streetAddress2
          ? ` ${shippingAddress.streetAddress2}`
          : ""
      }</p>
              <p style="margin:0;">${shippingAddress.city}, ${
        shippingAddress.state
      } ${shippingAddress.zipCode}</p>
              <p style="margin:0;">${shippingAddress.country}</p>
            </div>
          </div>
          <div >
            <h3>Billing Address</h3>
            <div>
              <p style="margin:0;">${billingAddress.firstName} ${
        billingAddress.lastName
      }</p>
              <p style="margin:0;">${billingAddress.streetAddress}${
        billingAddress.streetAddress2 ? ` ${billingAddress.streetAddress2}` : ""
      }</p>
              <p style="margin:0;">${billingAddress.city}, ${
        billingAddress.state
      } ${billingAddress.zipCode}</p>
              <p style="margin:0;">${billingAddress.country}</p>
            </div>
          </div>
        </div>
        <div style="display:flex; width:100%; ">
          <div style="margin-right: 150px;">
              <h3>Shipping Method</h3>
              <p style="margin:0;">${
                order.shippingMethod.name
              } - ${usDollarformatter.format(order.shippingMethod.price)}</p>
          </div>
          <div>
              <h3>Payment Method</h3>
              <p style="margin:0;">${
                charge.payment_method_details?.card?.brand
              } - ${usDollarformatter.format(order.orderTotal)}</p>
              
          </div>

        </div>



        <p>-Your favorite shreders at ${process.env.COMPANY_NAME}</p>
      </div>
    `;

      const subject = `Order No. ${order.id} Confirmation - ${process.env.COMPANY_NAME}`;

      await nodemailer.sendEmail(
        order.customerEmail,
        `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        subject,
        htmlPart
      );

      return response.status(200).json({
        message: "success",
        order: { id: order.id, email: order.customerEmail },
      });
    } catch (error: any) {
      console.log(error.message);
      return response.status(400).json({ message: "Failed" });
    }
  }
);

router.get(
  "/checkout/order-review",
  async (request: express.Request, response: express.Response) => {
    try {
      const email = request.query.email?.toString();
      const orderId = Number(request.query.orderNumber);
      const order = await prisma.order.findFirst({
        where: { id: orderId, customerEmail: email },
        include: {
          cart: { include: { cartItems: true } },
          shippingAddress: true,
          billingAddress: true,
          shippingMethod: { select: { name: true, price: true } },
          card: {
            select: {
              lastFourDigits: true,
              brand: true,
              expir_month: true,
              expir_year: true,
            },
          },
        },
      });
      return response.status(200).json(order);
    } catch (error) {
      console.log(error);
    }
  }
);

async function calculateLineItemTotal(lineItem: CartItem): Promise<number> {
  let sum = 0;

  let product:
    | db.Product
    | (db.ProductVariant & { product: db.Product } & {
        productVariantAttributes: (db.ProductVariantAttribute & {
          attribute: db.Attribute;
        })[];
      })
    | null;
  if (lineItem.variant) {
    product = await prisma.productVariant.findFirst({
      where: {
        AND: [{ id: lineItem.variant?.id }, { productId: lineItem.productId }],
      },
      include: {
        product: true,
        productVariantAttributes: { include: { attribute: true } },
      },
    });
  } else {
    product = await prisma.product.findFirst({
      where: {
        id: lineItem.productId,
      },
    });
  }
  // Product should exist as this function is called within the calculate order tax route which can only be called after a stripe payment intent was created within the
  // create-payment-intent route. Create-payment-intent route handles both product exist/available validation.

  if (product) {
    // Product price multiplied by 100 to turn price from dollars to cents
    sum += product.price * 100 * lineItem.quantity;
  }

  return sum;
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

async function createCart(_cartItems: CartItem[], user: any = null) {
  let cartSum = 0;
  const cartItems: any = [];
  for (let i = 0; i < _cartItems.length; i++) {
    if (_cartItems[i].variant) {
      const productVariant = await getProductVariant(_cartItems[i].variant!.id);
      if (productVariant) {
        const { productName, variantName } =
          makeProductVariantName(productVariant);
        cartItems.push({
          productId: productVariant.productId,
          variantId: productVariant.id,
          productName: productName,
          image: _cartItems[i].image,
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
          image: _cartItems[i].image,
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

module.exports = router;
