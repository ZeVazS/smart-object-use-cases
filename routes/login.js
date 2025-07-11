const express = require('express');
const router = express.Router();
const db = require("../db");

// GET login page
router.get('/', (req, res) => {
  res.render('login', { error: false });
});

// POST login form
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.oneOrNone('SELECT * FROM users WHERE name = $1', [username]);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.user = { id: user.id, username: user.name };

    // Sessão criada, cookie será enviado automaticamente
    res.status(200).json({ message: 'Login successful', user: req.session.user });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;
