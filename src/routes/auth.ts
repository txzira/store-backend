require("dotenv").config();
import express = require("express");
import db = require("@prisma/client");

import passport = require("passport");
import GoogleStrategy = require("passport-google-oauth2");
import LocalStrategy = require("passport-local");
import { randomBytes } from "crypto";

const nodemailer = require("../lib/nodemailer");
import jwt = require("jsonwebtoken");
import { URL } from "url";

const genPassword = require("../lib/password").genPassword;
const validatePassword = require("../lib/password").validatePassword;

const router = express.Router();
const prisma = new db.PrismaClient();

// Passport Middleware
passport.use(
  new GoogleStrategy.Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.PRODUCTION_ENVIR === "true"
          ? "https://store-backend-v7uo.onrender.com/auth/google/callback"
          : "http://localhost:4000/auth/google/callback",

      passReqToCallback: true,
    },
    async function (
      request: any,
      accessToken: any,
      refreshToken: any,
      profile: any,
      cb: any
    ) {
      const user = await prisma.user.findFirst({
        where: {
          email: profile.email,
          socialId: profile.id,
          socialProvider: "google",
        },
      });
      if (user) {
        await prisma.$disconnect();
        return cb(null, user);
      } else {
        const user = await prisma.user.create({
          data: {
            email: profile.email,
            firstName: profile.given_name,
            lastName: profile.family_name,
            socialId: profile.id,
            socialProvider: profile.provider,
            verifiedEmail: true,
          },
        });
        await prisma.$disconnect();
        return cb(null, user);
      }
    }
  )
);

passport.use(
  new LocalStrategy.Strategy(async function verify(
    email: any,
    password: any,
    cb: any
  ) {
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        socialId: null,
        socialProvider: null,
      },
    });
    if (user) {
      //check password
      if (validatePassword(password, user.password, user.salt)) {
        // correct password
        return cb(null, user);
      } else {
        // incorrect password

        return cb(null, false, { message: "Incorrect username or password." });
      }
    } else {
      //user does not exist
      return cb(null, false, { message: "Incorrect username or password." });
    }
  })
);

passport.serializeUser(function (user: any, done: any) {
  process.nextTick(function () {
    done(null, {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
    });
  });
});

passport.deserializeUser(function (user: any, done: any) {
  process.nextTick(function () {
    done(null, user);
  });
});

// Middleware functions

const localAuth = () => {
  return (req: any, res: any, next: any) => {
    passport.authenticate(
      "local",
      {
        successRedirect: "/protected",
        failureRedirect: "auth/failure",
      },
      (error: any, user: any, info: any) => {
        if (user === false) {
          return res.status(400).json({
            success: false,
            message: "Invalid Password.",
            state: "invalid",
          });
        }
        if (!user.verifiedEmail) {
          return res.status(400).json({
            success: false,
            message: "Email not verified.",
            state: "unverified",
          });
        }
        if (error)
          return res.status(400).json({ success: false, message: error });
        req.login(user, function (error: any) {
          if (error) return next(error);
          generateCSRFToken(req, res);
          next();
        });
      }
    )(req, res, next);
  };
};

const googleAuth = () => {
  return (req: any, res: any, next: any) => {
    passport.authenticate(
      "google",
      {
        scope: ["email", "profile"],
        failureRedirect: "https://txzira-ecommerce.netlify.app",
      },
      (error: any, user: any, info: any) => {
        if (error) res.status(400).json({ success: false, message: error });
        req.login(user, function (error: any) {
          if (error) return next(error);
          generateCSRFToken(req, res);
          next();
        });
      }
    )(req, res, next);
  };
};

const checkCSRFToken = () => {
  return (req: any, res: any, next: any) => {
    if (process.env.PRODUCTION_ENVIR === "true") {
      req.csrfToken === req.cookies.CSRF_Token
        ? next()
        : res.status(401).send(false);
    } else {
      req.session.csrfToken === req.cookies.CSRF_Token
        ? next()
        : res.status(401).send(false);
    }
  };
};

const isLoggedIn = () => {
  return (request: express.Request, response: any, next: any) => {
    request.user && request.isAuthenticated()
      ? next()
      : response.status(401).send(false);
  };
};

const isAdmin = () => {
  return (
    request: express.Request | any,
    response: express.Response,
    next: any
  ) => {
    request.user.role === "ADMIN" ? next() : response.status(401).send(false);
  };
};

// Auth Routes

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get("/auth/google/callback", googleAuth(), (req: any, res: any) => {
  res.status(200).redirect(`${process.env.ORIGIN_URL}/auth/login-redirect`);
  res.end();
});

router.get(
  "/auth/isauth",
  [isLoggedIn(), checkCSRFToken()],
  (request: any, response: any) => {
    return response.send(true);
  }
);

router.get(
  "/auth/isadmin",
  [isLoggedIn(), checkCSRFToken()],
  async (request: any, response: any) => {
    const sessionUser = request.user;
    try {
      const admin = await prisma.user.findFirst({
        where: { id: sessionUser.id },
        select: { role: true },
      });
      if (admin?.role === "ADMIN") {
        return response.send(true);
      } else return response.status(401).send(false);
    } catch (error) {
      return response.status(400).send("Invalid user.");
    }
  }
);

router.post("/auth/login", localAuth(), (req: any, res: any) => {
  const sessionUser = req.user;

  res.status(200).json({
    message: "success",
    user: {
      name: `${sessionUser.firstName} ${sessionUser.lastName}`,
      email: sessionUser.email,
    },
    state: "verified",
  });
  res.end();
});

router.get(
  "/auth/google/redirect",
  (request: any, response: any, next: any) => {
    const sessionUser = request.user;

    return response.status(200).json({
      message: "success",
      user: { name: sessionUser.name, email: sessionUser.email },
    });
  }
);

router.get("/auth/logout", (req: any, res: any, next: any) => {
  req.logout(function (err: any) {
    if (err) {
      return next(err);
    }
    req.session.destroy();
    res.send("Goodbye!");
    res.end();
  });
});

router.put(
  "/auth/verify-email",
  async (request: any, response: any, next: any) => {
    try {
      const { userId, tokenId } = request.body;
      console.log({ userId, tokenId });
      if (isNaN(userId) || !tokenId) {
        // error
        return response.status(406).send({ validLink: false });
      } else {
        const token = await prisma.token.findUnique({
          where: { id: tokenId, user_id: Number(userId) },
        });

        if (token) {
          if (new Date(Date.now()) <= token.expir_at) {
            //token not expired continue...
            //set verifiedEmail of user to true
            await prisma.user.update({
              where: { id: token.user_id },
              data: { verifiedEmail: true },
            });
            await prisma.token.deleteMany({
              where: {
                user_id: token.user_id,
                token_type: "EMAIL_VERIFICATION",
              },
            });
            return response.status(200).send({ validLink: true });
          } else {
            //token expired delete from database
            await prisma.token.delete({
              where: { id: token.id, user_id: token.user_id },
            });
            return response.status(403).send({ validLink: false });
          }
        } else {
          // invalid token - token does not exist
          return response.status(401).send({ validLink: false });
        }
      }
    } catch (err) {
      console.log(err);
      return response
        .status(400)
        .json({ success: false, message: "Email verification link expired!" });
    }
  }
);

router.put(
  "/auth/resend-email-verification",
  async (request: express.Request, response: express.Response) => {
    try {
      const email = request.body.email;

      const hours = 3;
      const expiration_date = new Date(Date.now() + 60 * 60 * hours * 1000);

      await prisma.token.deleteMany({
        where: { user: { email }, token_type: "EMAIL_VERIFICATION" },
      });

      const token = await prisma.token.create({
        data: {
          user: { connect: { email: email } },
          expir_at: expiration_date,
          token_type: "EMAIL_VERIFICATION",
        },
        select: {
          id: true,
          user_id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });
      const link = new URL(`${process.env.ORIGIN_URL}/auth/verify/`);

      link.searchParams.append("userId", token.user_id.toString());
      link.searchParams.append("tokenId", token.id);

      const htmlPart = `
      <div style="width:50%; margin:0 auto; color:black;">
        <div style="text-align:center;">
          <img width="550px" height="75px" src="${process.env.COMPANY_LOGO} "/>
        </div>
        <h2 style="text-align:center;">Email Verification</h2>
        <p>Hello ${token.user.firstName},</p>
        <br/>
        <p>Thank you for creating an account with us. Before you login we need you to verify your email to make sure you created this account. To verif your email copy and paste, or click the link below:</p>
        <p>${link.href}</p> 
        <p> Email verification link will expire in 3 hours.</p>
        <br/>
        <p>-Your favorite shreders at ${process.env.COMPANY_NAME}</p>
      </div>`;

      const subject = `Email Verification Link - ${process.env.COMPANY_NAME}`;
      nodemailer.sendEmail(
        email,
        token.user.firstName + " " + token.user.lastName,
        subject,
        htmlPart
      );
      return response.status(200).json({ status: "success" });
    } catch (error) {
      console.log(error);
    }
  }
);

router.post("/auth/register-user", async (req: any, res: any, next: any) => {
  const email = req.body.email;
  try {
    const saltHash = genPassword(req.body.password);
    const salt = saltHash.salt;
    const hash = saltHash.hash;

    const user = await prisma.user.create({
      data: {
        email: email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        password: hash,
        salt: salt,
      },
    });

    if (user) {
      const hours = 3;
      const expiration_date = new Date(Date.now() + 60 * 60 * hours * 1000);

      const token = await prisma.token.create({
        data: {
          user_id: user.id,
          expir_at: expiration_date,
          token_type: "EMAIL_VERIFICATION",
        },
        select: {
          id: true,
          user_id: true,
          user: { select: { firstName: true } },
        },
      });
      const link = new URL(`${process.env.ORIGIN_URL}/auth/verify/`);

      link.searchParams.append("userId", token.user_id.toString());
      link.searchParams.append("tokenId", token.id);

      const htmlPart = `
      <div style="width:50%; margin:0 auto; color:black;">
        <div style="text-align:center;">
          <img width="550px" height="75px" src="${process.env.COMPANY_LOGO} "/>
        </div>
        <h2 style="text-align:center;">Email Verification</h2>
        <p>Hello ${token.user.firstName},</p>
        <br/>
        <p>Thank you for creating an account with us. Before you login we need you to verify your email to make sure you created this account. To verif your email copy and paste, or click the link below:</p>
        <p>${link.href}</p> 
        <p> Email verification link will expire in 3 hours.</p>
        <br/>
        <p>-Your favorite shreders at ${process.env.COMPANY_NAME}</p>
      </div>`;

      const subject = `Email Verification Link - ${process.env.COMPANY_NAME}`;
      nodemailer.sendEmail(
        user.email,
        user.firstName + " " + user.lastName,
        subject,
        htmlPart
      );

      res.status(200).json({
        message: `Registration Successful. Email verification was sent to ${user.email} and is only valid for 3hours, unverified accounts are subject to deletion after this period.`,
        success: true,
        state: "success",
      });
    }
  } catch (error: any) {
    if (error.code === "P2002") {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { verifiedEmail: true },
      });

      if (user?.verifiedEmail) {
        res.status(400).json({
          message: "Registration Failed. User already exists.",
          success: false,
          state: "verified",
        });
      } else {
        res.status(400).json({
          message: "Registration Failed. User already exists.",
          success: false,
          state: "unverified",
        });
      }
    } else {
      res.status(400).json({
        message: "Registration Failed.",
        success: false,
        state: "failed",
      });
    }
  }
  res.end();
});

router.post(
  "/auth/forgot-password",
  async (request: express.Request, response: express.Response) => {
    try {
      const email = request.body.email;
      const hours = 3;
      const expiration_date = new Date(Date.now() + 60 * 60 * hours * 1000);
      // Find user given email
      const user = await prisma.user.findUnique({ where: { email: email } });

      // if user exist send email verification
      // else user doesnt exist, do nothing
      if (user) {
        const token = await prisma.token.create({
          data: {
            user_id: user.id,
            expir_at: expiration_date,
            token_type: "PASSWORD_RESET",
          },
          select: {
            id: true,
            user_id: true,
            user: { select: { firstName: true } },
          },
        });

        const link = new URL(`${process.env.ORIGIN_URL}/auth/reset-password`);
        link.searchParams.append("userId", token.user_id.toString());
        link.searchParams.append("tokenId", token.id);

        const htmlPart = `
          <div style="width:50%; margin:0 auto; color:black;">
            <div style="text-align:center;">
              <img width="550px" height="75px" src="${process.env.COMPANY_LOGO} "/>
            </div>
            <h2 style="color: red; text-align:center;">Forgot Your Password?</h2>
            <p>Hello ${token.user.firstName},</p>
            <br/>
            <p>We have received a request to change your password on ${process.env.COMPANY_NAME}.</p>
            <p>Click <a href='${link.href}'>here</a> to reset your password. This link is valid for three hours.</p>
            <p>If you didn't request a password change or you remember your password, you can ignore this message and continue to use your current password.</p>
            <br/>
            <p>-Your favorite shreders at ${process.env.COMPANY_NAME}</p>
          </div>
        `;

        const subject = `Request to reset ${token.user.firstName}'s Password - ${process.env.COMPANY_NAME}`;
        await nodemailer.sendEmail(
          email,
          `${user.firstName} ${user.lastName}`,
          subject,
          htmlPart
        );
      }
      return response.status(200).json({ message: "success" });
    } catch (error) {
      console.log(error);
    }
  }
);

router.post(
  "/auth/verify-password-reset",
  async (request: express.Request, response: express.Response) => {
    try {
      const userId = Number(request.body.userId);
      const tokenId = request.body.tokenId;

      if (isNaN(userId) || !tokenId) {
        // error
        return response.status(406).send({ validLink: false });
      } else {
        const token = await prisma.token.findUnique({
          where: { id: tokenId, user_id: userId },
        });

        if (token) {
          if (new Date(Date.now()) <= token.expir_at) {
            //token not expired continue...

            return response.status(200).send({ validLink: true });
          } else {
            //token expired delete from database
            await prisma.token.delete({
              where: { id: token.id, user_id: token.user_id },
            });
            return response.status(403).send({ validLink: false });
          }
        } else {
          // invalid token - token does not exist
          return response.status(401).send({ validLink: false });
        }
      }
    } catch (error) {
      console.log(error);
      return response.status(500).send({ validLink: false });
    }
  }
);

router.post(
  "/auth/reset-password",
  async (request: express.Request, response: express.Response) => {
    const { newPassword, tokenId } = request.body;
    const userId = Number(request.body.userId);

    if (isNaN(userId) || !tokenId) {
      // error
      return response.status(406).send({ message: "Invalid Credentials." });
    } else {
      console.log({ newPassword, userId, tokenId });
      const token = await prisma.token.findUnique({
        where: { id: tokenId, user_id: userId },
        select: {
          id: true,
          user_id: true,
          expir_at: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      });

      if (token) {
        if (new Date(Date.now()) <= token.expir_at) {
          //token not expired continue...
          const saltHash = genPassword(newPassword);
          const salt = saltHash.salt;
          const hash = saltHash.hash;
          await prisma.user.update({
            where: { id: userId },
            data: { salt, password: hash },
          });
          await prisma.token.deleteMany({
            where: {
              user_id: token.user_id,
              token_type: "PASSWORD_RESET",
            },
          });

          const htmlPart = `
          <div style="width:50%; margin:0 auto; color:black;">
            <div style="text-align:center;">
              <img width="550px" height="75px" src="${process.env.COMPANY_LOGO} "/>
            </div>
            <p>Hello ${token.user.firstName},</p>
            <br/>
            <p>Your request to change your password on ${process.env.COMPANY_NAME} was successful.</p>
            <br/>
            <p>-Your favorite shreders at ${process.env.COMPANY_NAME}</p>
          </div>
        `;

          const subject = `Password Reset Successful - ${process.env.COMPANY_NAME}`;

          await nodemailer.sendEmail(
            token.user.email,
            `${token.user.firstName} ${token.user.lastName}`,
            subject,
            htmlPart
          );

          return response.status(200).send({ status: true });
        } else {
          //token expired delete from database
          await prisma.token.delete({
            where: { id: token.id, user_id: token.user_id },
          });
          return response.status(403).send({ message: "Token has expired." });
        }
      } else {
        // invalid token - token does not exist
        return response.status(401).send({ message: "Invalid Credentials." });
      }
    }
  }
);

// Helper Functions

function generateCSRFToken(req: any, res: any): void {
  const token = randomBytes(36).toString("base64");
  if (process.env.PRODUCTION_ENVIR === "true") {
    req.csrfToken = token;
  } else {
    req.session.csrfToken = token;
  }
  res.cookie("CSRF_Token", token, {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
  });
}

module.exports = router;
module.exports.checkCSRFToken = checkCSRFToken;
module.exports.isLoggedIn = isLoggedIn;
module.exports.isAdmin = isAdmin;
