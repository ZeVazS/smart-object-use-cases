const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  toRealLatitude,
  toRealLongitude,
} = require("../utils/addressUtils");

/* GET home page */
router.get("/", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const result = await req.app.db.query(
    "SELECT * FROM addresses WHERE owner_id = $1",
    [req.session.user.id]
  );

  res.render("index", {
    username: req.session.user.name,
    smartObjects: result.rows,
  });
});

/* GET form page */
router.get("/form", function (req, res) {
  res.render("form/index", {
    success: false,
    error: false,
    user: req.session.user,
  });
});

/* GET dashboard paginado com filtro */
router.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const success = req.session.successMessage;
  const error = req.session.errorMessage;
  delete req.session.successMessage;
  delete req.session.errorMessage;

  const username = req.session.user.name;
  const userId = req.session.user.id;

  const page = parseInt(req.query.page) || 1;
  const lowStock = req.query.lowStock === '1';
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    let baseQuery = `FROM addresses WHERE owner_id = $1 AND deleted_at IS NULL`;
    let params = [userId];

    if (lowStock) {
      baseQuery += ` AND (characteristics->>'remainingBags')::int < 10`;
    }

    // Contagem total (para paginação)
    const countResult = await db.one(`SELECT COUNT(*) ${baseQuery}`, params);
    const totalCount = parseInt(countResult.count);
    const totalPages = Math.ceil(totalCount / limit);

    // Objetos paginados
    const rows = await db.any(
      `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [...params, limit, offset]
    );

    const smartObjects = rows.map((row) => {
      let characteristics = {};

      if (row.characteristics) {
        if (typeof row.characteristics === "string") {
          try {
            characteristics = JSON.parse(row.characteristics);
          } catch (e) {
            console.error("Error parsing characteristics JSON", e);
          }
        } else if (typeof row.characteristics === "object") {
          characteristics = row.characteristics;
        }
      }

      const address = row.address || "N/A";
      const reallatitude = toRealLatitude(row.latitude);
      const reallongitude = toRealLongitude(row.longitude);
      const altitude = row.altitude !== null ? row.altitude : 0;
      const fullAddress = `${address}@${row.latitude}-${row.longitude}-${altitude}`;

      return {
        id: row.id,
        address,
        fullAddress,
        latitude: row.latitude,
        reallatitude,
        longitude: row.longitude,
        reallongitude,
        altitude,
        characteristics,
      };
    });

    res.render("dashboard", {
      username,
      smartObjects,
      success,
      error,
      totalCount,
      currentPage: page,
      totalPages,
      showLowStock: lowStock,
    });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.status(500).send("Internal Server Error");
  }
});


/* GET edit page */
router.get("/edit/:address", async (req, res) => {
  try {
    const addressCode = req.params.address;

    const row = await db.oneOrNone(
      "SELECT * FROM public.addresses WHERE address = $1 AND deleted_at IS NULL",
      [addressCode]
    );

    if (!row) {
      return res.status(404).send("Endereço não encontrado");
    }

    let characteristics = {};

    if (row.characteristics) {
      if (typeof row.characteristics === "string") {
        try {
          characteristics = JSON.parse(row.characteristics);
        } catch (e) {
          console.error("Error parsing characteristics JSON", e);
        }
      } else if (typeof row.characteristics === "object") {
        characteristics = row.characteristics;
      }
    }

    const country = row.address ? row.address.split("-")[1] : "N/A";

    const smartObject = {
      id: row.id,
      address: row.address || "N/A",
      country,
      latitude: toRealLatitude(row.latitude),
      longitude: toRealLongitude(row.longitude),
      altitude: row.altitude !== null ? row.altitude : 0,
      characteristics,
      owner_id: row.owner_id,
    };

    res.render("edit", { smartObject });
  } catch (err) {
    console.error("Error loading edit page:", err);
    res.status(500).send("Erro interno do servidor");
  }
});

module.exports = router;




