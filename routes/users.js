const express = require("express");
const router = express.Router();
const db = require("../db"); // <-- uses db.js

// Get all users
router.get("/", async function (req, res, next) {
  try {
    const [rows] = await db.query("SELECT id, name FROM users");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get one user by ID
router.get("/:id", async function (req, res, next) {
  try {
    const [rows] = await db.query("SELECT id, name FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    next(err);
  }
});

// Create new user
router.post("/", async function (req, res, next) {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }
    const [result] = await db.query(
      "INSERT INTO users (name, password) VALUES (?, ?)",
      [name, password]
    );
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    next(err);
  }
});

// Update user by ID
router.put("/:id", async function (req, res, next) {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }
    const [result] = await db.query(
      "UPDATE users SET name = ?, password = ? WHERE id = ?",
      [name, password, req.params.id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json({ id: req.params.id, name });
    }
  } catch (err) {
    next(err);
  }
});

// Delete user by ID
router.delete("/:id", async function (req, res, next) {
  try {
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json({ message: "User deleted" });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
