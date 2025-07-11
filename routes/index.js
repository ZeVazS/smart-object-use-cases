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

/* GET dashboard */
router.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const success = req.session.successMessage;
  const error = req.session.errorMessage;
  delete req.session.successMessage;
  delete req.session.errorMessage;

  const username = req.session.user.username;
  const userId = req.session.user.id;

  try {
    const rows = await db.any(
      "SELECT * FROM addresses WHERE owner_id = $1 AND deleted_at IS NULL",
      [userId]
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
      const latitude = row.latitude;
      const reallatitude = toRealLatitude(row.latitude);
      const longitude = row.longitude;
      const reallongitude = toRealLongitude(row.longitude);
      const altitude = row.altitude !== null ? row.altitude : 0;
      const country = address.split("-")[1] || "N/A";
      const fullAddress = `${address}@${latitude}-${longitude}-${altitude}`;

      return {
        id: row.id,
        address,
        fullAddress,
        country,
        latitude,
        reallatitude,
        longitude,
        reallongitude,
        altitude,
        characteristics,
      };
    });

    res.render("dashboard", { username, smartObjects, success, error });
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
