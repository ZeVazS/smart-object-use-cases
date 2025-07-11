const express = require("express");
const router = express.Router();
const db = require("../db");

const {
  toInternalLatitude,
  toInternalLongitude,
  transformAddressRecord,
  generateIdentifier
} = require("../utils/addressUtils");

// Obter todos os endereços (não eliminados)
router.get("/", async (req, res) => {
  try {
    const result = await db.any(
      "SELECT * FROM public.addresses WHERE deleted_at IS NULL"
    );
    res.json(result);
  } catch (err) {
    console.error("Erro ao buscar endereços:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Obter um endereço pelo código (se não eliminado)
router.get("/:address", async (req, res) => {
  try {
    const addressCode = req.params.address;
    const result = await db.oneOrNone(
      "SELECT * FROM public.addresses WHERE address = $1 AND deleted_at IS NULL",
      [addressCode]
    );
    if (result) res.json(result);
    else res.status(404).json({ error: "Endereço não encontrado" });
  } catch (err) {
    console.error("Erro ao buscar endereço:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Criar novo endereço (com transação)
router.post("/", async (req, res) => {
  const {
    type,
    country,
    latitude,
    longitude,
    altitude,
    characteristics,
  } = req.body;
  
  const owner_id = req.session?.user?.id;

    if (!owner_id) {
    return res.status(401).json({ error: "Autenticação obrigatória" });
  }
  // Validação básica
  if (
    (type !== "S" && type !== "D") ||
    !country ||
    latitude == null ||
    longitude == null ||
    altitude == null) {
    return res
      .status(400)
      .json({ error: "Campos obrigatórios em falta ou inválidos" });
  }

  const MAX_ATTEMPTS = 5;
  let lastError = null;

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const address = await generateIdentifier({ country, type }, db);
      const latInternal = toInternalLatitude(latitude);
      const lonInternal = toInternalLongitude(longitude);

      try {
        const newRecord = await db.tx(async (t) => {
          await t.none(
            `INSERT INTO public.addresses 
              (address, owner_id, characteristics, latitude, longitude, altitude)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              address,
              owner_id,
              characteristics || null,
              latInternal,
              lonInternal,
              parseInt(altitude, 10),
            ]
          );

          return t.one(
            "SELECT * FROM public.addresses WHERE address = $1",
            [address]
          );
        });

        // Sucesso: responder com 201 e o JSON criado
        return res.status(201).json(newRecord);
      } catch (err) {
        if (err.code === "23505") {
          console.warn(
            `Endereço duplicado (${address}), tentativa ${
              attempt + 1
            }/${MAX_ATTEMPTS}`
          );
          lastError = err;
        } else {
          throw err;
        }
      }
    }

    // Se esgotou tentativas
    return res.status(500).json({
      error: "Falha ao gerar endereço único",
      details: lastError?.message,
    });
  } catch (err) {
    console.error("Erro ao criar endereço:", err);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: err.message,
    });
  }
});


// Atualizar endereço (com transação)
router.put("/:address", async (req, res) => {
  try {
    const addressCode = req.params.address;
    const { owner_id, latitude, longitude, altitude, characteristics } =
      req.body;

    const updated = await db.tx(async (t) => {
      const existing = await t.oneOrNone(
        "SELECT * FROM public.addresses WHERE address = $1 AND deleted_at IS NULL",
        [addressCode]
      );
      if (!existing) throw new Error("Endereço não encontrado");
      if (existing.owner_id !== req.session?.user?.id) {
        throw { status: 403, message: "Não autorizado a modificar este endereço" };
      }

      await t.none(
        `UPDATE public.addresses
         SET owner_id = $1,
             characteristics = $2,
             latitude = $3,
             longitude = $4,
             altitude = $5,
             updated_at = NOW()
         WHERE address = $6`,
        [
          owner_id || existing.owner_id,
          characteristics !== undefined
            ? characteristics
            : existing.characteristics,
          latitude !== undefined
            ? toInternalLatitude(latitude)
            : existing.latitude,
          longitude !== undefined
            ? toInternalLongitude(longitude)
            : existing.longitude,
          altitude !== undefined ? parseInt(altitude) : existing.altitude,
          addressCode,
        ]
      );

      return t.one("SELECT * FROM public.addresses WHERE address = $1", [
        addressCode,
      ]);
    });

    res.status(200).json(updated);
  } catch (err) {
    if (err.message === "Endereço não encontrado") {
      res.status(404).json({ error: err.message });
    } else {
      console.error("Erro ao atualizar endereço:", err);
      res
        .status(500)
        .json({ error: "Erro interno do servidor", details: err.message });
    }
  }
});

// Eliminar (soft delete) endereço (com transação)
router.delete("/:address", async (req, res) => {
  try {
    const addressCode = req.params.address;

    await db.tx(async (t) => {
      const existing = await t.oneOrNone(
        "SELECT * FROM public.addresses WHERE address = $1 AND deleted_at IS NULL",
        [addressCode]
      );
      if (!existing) throw new Error("Endereço não encontrado");
      if (existing.owner_id !== req.session?.user?.id) {
        throw { status: 403, message: "Não autorizado a eliminar este endereço" };
      }

      await t.none(
        "UPDATE public.addresses SET deleted_at = NOW(), updated_at = NOW() WHERE address = $1",
        [addressCode]
      );
    });

    res.status(200).json({ message: "Endereço apagado com sucesso" });
  } catch (err) {
    if (err.message === "Endereço não encontrado") {
      res.status(404).json({ error: err.message });
    } else {
      console.error("Erro ao apagar endereço:", err);
      res
        .status(500)
        .json({ error: "Erro interno do servidor", details: err.message });
    }
  }
});

module.exports = router;
