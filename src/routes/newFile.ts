import db = require("@prisma/client");
import { router, prisma, CartItem } from "./checkout";

router.post("/create-order", async (request: any, response: any) => {
  const { requestShippingForm, requestCart }: { requestShippingForm: any; requestCart: any } = request.body;
  try {
    let user: any = null;
    if (request.session.passport) {
      user = request.session.passport.user;
    }
    console.log(user, "4");

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
    // const cart = await createCart(requestCart, user);
    // const order = await prisma.order.create({
    //   data: {
    //     ...(user ? { customerId: user.id } : null),
    //     cartId: cart.id,
    //     amount: cart.cartTotal,
    //     customerEmail: requestShippingForm.email,
    //     status: "PAYMENT_PENDING",
    //     shippingAddressId: shippingAddress.id,
    //   },
    // });
    response.status(200);
    // .json({ message: "success", order: order.id, cart: cart.id });
  } catch (error: any) {
    console.log(error.message);
    response.status(400).json({ message: "Failed" });
  }

  async function createCart(_cartItems: CartItem[], user: any = null) {
    let cartSum = 0;
    const cartItems: any = [];
    for (let i = 0; i < _cartItems.length; i++) {
      if (_cartItems[i].variant) {
        const productVariant = await getProductVariant(_cartItems[i].variant!.id);
        if (productVariant) {
          const { productName, variantName } = makeProductVariantName(productVariant);
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

    productVariant.productVariantAttributes.map((productVariantAttribute, index: number) => {
      const group = productVariantAttribute.attributeGroup.name;
      const option = productVariantAttribute.attribute.option;
      variantName += group + ": " + option;
      productVariant.productVariantAttributes.length - 1 > index ? (variantName += " - ") : null;
    });

    return {
      productName: productVariant.product.name,
      variantName: variantName,
    };
  }
});
