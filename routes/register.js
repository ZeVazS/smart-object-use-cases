const express = require("express");
const router = express.Router();
const db = require("../db");

// GET register form
router.get("/", function (req, res) {
  res.render("register");
});

// POST form submit
router.post("/", async function (req, res, next) {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.render("register", {
        error: "Name and password are required",
      });
    }

    const result = await db.query(
      "INSERT INTO users (name, password) VALUES ($1, $2) RETURNING id, name",
      [name, password]
    );

    const newUser = Array.isArray(result) ? result[0] : result.rows[0];

    req.session.user = {
      id: newUser.id,
      name: newUser.name,
    };

    res.redirect("/dashboard");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
