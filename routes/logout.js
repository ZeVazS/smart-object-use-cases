const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid", { path: "/" });

    if (req.headers.accept.includes("application/json")) {
      return res.json({ message: "Logged out" });
    }

    res.redirect("/login");
  });
});


module.exports = router;
