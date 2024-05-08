import express = require("express");
const auth = require("../auth");
const router = express.Router();

router.get(
  "/user",
  [auth.isLoggedIn(), auth.checkCSRFToken()],
  (req: any, res: express.Response) => {
    const user = req.session.passport.user;
    return res.status(200).json({ name: user.name, email: user.email });
  }
);

module.exports = router;
