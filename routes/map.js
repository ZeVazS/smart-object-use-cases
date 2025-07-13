const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  toRealLatitude,
  toRealLongitude,
} = require("../utils/addressUtils");

// GET /map - Show all smart object locations
router.get("/", async (req, res) => {
  try {
    const rows = await db.any(`
      SELECT * FROM addresses 
      WHERE deleted_at IS NULL
    `);

    const smartObjects = rows.map(row => {
  let remainingBags = 0;
        console.log('CHARACTERISTICS:', row.characteristics);
  try {
    const parsed = typeof row.characteristics === 'string'
      ? JSON.parse(row.characteristics)
      : row.characteristics;

    remainingBags = parsed?.remainingBags ?? 0;
  } catch (e) {
    console.error(`Erro ao interpretar characteristics: ${e}`);
  }

  return {
    fullAddress: `${row.address}@${row.latitude}-${row.longitude}-${row.altitude}`,
    reallatitude: toRealLatitude(row.latitude),
    reallongitude: toRealLongitude(row.longitude),
    remainingBags
  };
});


    res.render("map", { smartObjects });
  } catch (err) {
    console.error("Error loading map page:", err);
    res.status(500).send("Internal Server Error");
  }
});
module.exports = router;

