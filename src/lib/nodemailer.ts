// import Mailjet from "node-mailjet";
// const mailjet = Mailjet.apiConnect(
//   process.env.MJ_APIKEY_PUBLIC!,
//   process.env.MJ_APIKEY_PRIVATE!
// );

// function SendEmail(toEmail: any, toName: any, subject: any, htmlPart: any) {
//   const request = mailjet.post("send", { version: "v3.1" }).request({
//     Messages: [
//       {
//         From: {
//           Email: "ronnsr15@gmail.com",
//           Name: "East West Emporium",
//         },
//         To: [
//           {
//             Email: toEmail,
//             Name: toName,
//           },
//         ],
//         Subject: subject,

//         HTMLPart: htmlPart,
//       },
//     ],
//   });
//   request
//     .then((result) => {
//       console.log(JSON.stringify(result.body));
//     })
//     .catch((err) => {
//       console.log(err.statusCode);
//     });
// }

// module.exports.SendEmail = SendEmail;

import nodemailer = require("nodemailer");
import db = require("@prisma/client");
const prisma = new db.PrismaClient();

var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAILNODEMAILER_EMAIL,
    pass: process.env.GMAILNODEMAILER_PASSWORD,
  },
});

function sendEmail(toEmail: any, toName: any, subject: any, htmlPart: any) {
  var mailOptions = {
    from: process.env.GMAILNODEMAILER_EMAIL,
    to: `"${toName}" <${toEmail}>`,
    subject: subject,
    html: htmlPart,
    // attachments: [
    //   {
    //     filename: "logo.png",
    //     path: __dirname + "/../images/pseudo-corp.png",
    //     cid: "logoimage",
    //   },
    // ],
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

module.exports.sendEmail = sendEmail;
