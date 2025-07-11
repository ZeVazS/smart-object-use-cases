const express = require("express");
const router = express.Router();
const db = require("../db");
const { transformAddressRecord } = require("../utils/addressUtils");

// GET /api/readable/address/
router.get("/", async (req, res) => {
  try {
    const result = await db.any(
      "SELECT * FROM public.addresses WHERE deleted_at IS NULL"
    );
    res.json(result.map(transformAddressRecord));
  } catch (err) {
    console.error("Erro ao buscar endereços (readable):", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/readable/address/:address
router.get("/:address", async (req, res) => {
  try {
    const addressCode = req.params.address;
    const result = await db.oneOrNone(
      "SELECT * FROM public.addresses WHERE address = $1 AND deleted_at IS NULL",
      [addressCode]
    );
    if (result) res.json(transformAddressRecord(result));
    else res.status(404).json({ error: "Endereço não encontrado" });
  } catch (err) {
    console.error("Erro ao buscar endereço (readable):", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;