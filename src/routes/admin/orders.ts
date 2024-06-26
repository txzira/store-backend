import express = require("express");
import prisma = require("@prisma/client");
const db: prisma.PrismaClient = require("../../lib/prisma.server");
const auth = require("../auth");

const router = express.Router();

const nodemailer = require("../../lib/nodemailer");

router.get(
  "/orders/get-all-orders",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const orders = await db.order.findMany({
        include: {
          customer: { select: { firstName: true, lastName: true } },
          shippingAddress: { select: { firstName: true, lastName: true } },
        },
      });
      response.status(200).json(orders);
    } catch (error) {
      console.log(error);
    }
  }
);

router.get(
  "/orders/get-order-by-id/:orderId",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const orderId = request.params.orderId;
      const order = await db.order.findUnique({
        where: { id: Number(orderId) },
        include: {
          shippingAddress: true,
          card: { select: { brand: true, lastFourDigits: true } },
          shippingMethod: true,
          tracking: {
            select: {
              id: true,
              tracking_number: true,
              carrier: true,
              email_sent: true,
            },
          },
          cart: { include: { cartItems: true } },
        },
      });
      return response.status(200).json(order);
    } catch (error) {}
  }
);

router.post(
  "/orders/set-tracking",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const { orderId, tracking } = request.body;
      if (!tracking.tracking_number) {
        return response.status(400).json({ status: "failed" });
      }
      const dbTracking = await db.tracking.upsert({
        where: { id: tracking.id },
        create: {
          tracking_number: tracking.tracking_number,
          carrier: tracking.carrier,
          order_id: Number(orderId),
        },
        update: {
          tracking_number: tracking.tracking_number,
          carrier: tracking.carrier,
        },
        select: { id: true },
      });
      return response
        .status(200)
        .json({ status: "success", trackingId: dbTracking.id });
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/orders/send-tracking-email",
  [auth.isLoggedIn(), auth.checkCSRFToken(), auth.isAdmin()],
  async (request: express.Request, response: express.Response) => {
    try {
      const trackingId = request.body.trackingId;
      const tracking = await db.tracking.update({
        where: { id: trackingId },
        data: { email_sent: true },
        select: {
          id: true,
          carrier: true,
          tracking_number: true,
          order: {
            select: {
              id: true,
              customerEmail: true,
              shippingAddress: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      if (tracking) {
        const order = await db.order.update({
          where: { id: tracking.order.id },
          data: { status: "ORDER_SHIPPED" },
          select: { status: true },
        });
        const carrierTrackingUrlsMap = new Map([
          [
            "UPS",
            `https://www.ups.com/track?loc=en_US&tracknum=${tracking.tracking_number}&requester=WT/trackdetails\\`,
          ],
          [
            "USPS",
            `https://tools.usps.com/go/TrackConfirmAction_input?strOrigTrackNum=${tracking.tracking_number}`,
          ],
          [
            "FEDEX",
            `https://www.fedex.com/fedextrack/?trknbr=${tracking.tracking_number}`,
          ],
        ]);
        const trackingLink = carrierTrackingUrlsMap.get(tracking.carrier);

        const subject = `Order No. ${tracking.order.id} Tracking Number - ${process.env.COMPANY_NAME}`;

        const htmlPart = `
          <div style="width:50%; margin:0 auto; color:black;">
            <div style="text-align:center;">
              <img width="550px" height="75px" src="${process.env.COMPANY_LOGO} "/>
            </div>
            <p>Hello ${tracking.order.shippingAddress?.firstName},</p>
            <br/>
            <p>Your order has been shipped and is on its way to you.</p>
            <p>You can use this tracking code to follow the progress of your order:</p>
            <p>${tracking.carrier}-Tracking Number <a href="${trackingLink}">${tracking.tracking_number}</a></p>
            <br/>
            <p>-Your favorite shreders at ${process.env.COMPANY_NAME}</p>
          </div>
        `;

        await nodemailer.sendEmail(
          tracking.order.customerEmail,
          `${tracking.order.shippingAddress?.firstName} ${tracking.order.shippingAddress?.lastName}`,
          subject,
          htmlPart
        );

        return response
          .status(200)
          .json({ status: "success", orderStatus: order.status });
      } else {
        return response
          .status(400)
          .json({ status: "failed", message: "No tracking found" });
      }
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = router;

// https://www.fedex.com/fedextrack/?trknbr=99999999999
//https://tools.usps.com/go/TrackConfirmAction_input?strOrigTrackNum=420913069361210944102316518138
//"https://www.ups.com/track?loc=en_US&tracknum=[TRACKING NUMBER]&requester=WT/trackdetails\"
