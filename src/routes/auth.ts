require("dotenv").config();
import express = require("express");
import db = require("@prisma/client");

import passport = require("passport");
import GoogleStrategy = require("passport-google-oauth2");
import LocalStrategy = require("passport-local");
import { randomBytes } from "crypto";

const SendEmail = require("../lib/nodemailer");
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
        "https://store-backend-v7uo.onrender.com/auth/google/callback",
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
          return res
            .status(400)
            .json({ success: false, message: "Invalid Password." });
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
        successRedirect: "https://txzira-ecommerce.netlify.app/auth/redirect",
        failureRedirect: "auth/failure",
      },
      (error: any, user: any, info: any) => {
        if (error) res.status(400).json({ success: false, message: error });
        req.login(user, function (error: any) {
          console.log("req.login", user);
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
    req.csrfToken === req.cookies.CSRF_Token
      ? next()
      : res.status(401).send(false);
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
  res
    .status(200)
    .redirect("https://txzira-ecommerce.netlify.app/auth/login-redirect");
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
  });
  res.end();
});

router.get(
  "/auth/google/redirect",
  googleAuth(),
  (request: any, response: any, next: any) => {
    const sessionUser = request.user;
    console.log(sessionUser);

    response.status(200).json({
      message: "success",
      user: { name: sessionUser.name, email: sessionUser.email },
    });
    response.end();
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

router.get("/auth/verify", async (req: any, res: any, next: any) => {
  const token = req.query.token;
  try {
    var decodedUser: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await prisma.user.findUnique({
      where: { email: decodedUser.user },
    });
    if (user) {
      if (user.verifiedEmail) {
        res
          .status(400)
          .json({ success: false, message: "Email already verified." });
      } else {
        await prisma.user.update({
          where: { email: decodedUser.user },
          data: { verifiedEmail: true },
        });
        res.status(200).json({ success: true, message: "success" });
      }
    } else {
      res.status(400).json({ success: false, message: "User does not exist." });
    }
  } catch (err) {
    res
      .status(400)
      .json({ success: false, message: "Email verification link expired!" });
  }
  res.end();
});

router.post("/auth/register-user", async (req: any, res: any, next: any) => {
  try {
    const saltHash = genPassword(req.body.password);
    const salt = saltHash.salt;
    const hash = saltHash.hash;

    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        password: hash,
        salt: salt,
      },
    });
    const token = jwt.sign({ user: user.email }, process.env.JWT_SECRET!, {
      expiresIn: 60 * 60 * 3,
    });
    const link = new URL(`${process.env.ORIGIN_URL}/auth/verify/`);
    link.search = new URLSearchParams({ token: token }).toString();
    const message = `<div>Email verification link will expire in 24 hours.</div></br><div>To verify your email copy and paste, or click the link below: </div></br><div>${link}</div>`;

    SendEmail(
      user.email,
      user.firstName + " " + user.lastName,
      "Email Verification Link",
      message
    );

    res.status(200).json({
      message: `Registration Successful. Email verification was sent to ${user.email} and is only valid for 3hours, unverified accounts are subject to deletion after this period.`,
      success: true,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({
        message: "Registration Failed. User already exists.",
        success: false,
      });
    } else {
      res.status(400).json({ message: "Registration Failed.", success: false });
    }
  }
  res.end();
});

// Helper Functions

function generateCSRFToken(req: any, res: any): void {
  const token = randomBytes(36).toString("base64");
  req.csrfToken = token;
  res.cookie("CSRF_Token", token, {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
  });
}

module.exports = router;
module.exports.checkCSRFToken = checkCSRFToken;
module.exports.isLoggedIn = isLoggedIn;
module.exports.isAdmin = isAdmin;
