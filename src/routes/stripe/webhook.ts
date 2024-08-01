import express = require("express");
const router = express.Router();
import Stripe from "stripe";
const bodyParser = require("body-parser");

import prisma = require("@prisma/client");
const db: prisma.PrismaClient = require("../../lib/prisma.server");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (request: express.Request, response: express.Response) => {
    const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET!;
    const body = request.body;
    const sig = request.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    let orderId;

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntentId = event.data.object.id;
        orderId = event.data.object.metadata.orderId;
        const taxCalculationId = event.data.object.metadata.tax_calculation_id;
        await db.order.update({
          where: { id: Number(orderId) },
          data: {
            status: "PAYMENT_RECEIVED",
          },
        });
        const taxTransaction =
          await stripe.tax.transactions.createFromCalculation({
            calculation: taxCalculationId,
            reference: paymentIntentId,
          });
        await stripe.paymentIntents.update(paymentIntentId, {
          metadata: { tax_transaction: taxTransaction.id },
        });

        break;
      case "payment_intent.canceled":
        orderId = event.data.object.metadata.orderId;
        await db.order.update({
          where: { id: Number(orderId) },
          data: {
            status: "PAYMENT_FAILED",
          },
        });

        break;
    }

    return response.status(200);
  }
);

module.exports = router;
