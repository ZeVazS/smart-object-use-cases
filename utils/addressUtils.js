// --- Funções auxiliares ---

function toInternalLatitude(real) {
  const num = parseFloat(real);
  if (isNaN(num) || num < -90 || num > 90) {
    throw new Error("Latitude inválida: deve estar entre -90 e 90.");
  }
  return Math.round((num + 90) * 10000);
}

function toInternalLongitude(real) {
  const num = parseFloat(real);
  if (isNaN(num) || num < -180 || num > 180) {
    throw new Error("Longitude inválida: deve estar entre -180 e 180.");
  }
  return Math.round((num + 180) * 10000);
}

function toRealLatitude(value) {
  return parseFloat((value / 10000 - 90).toFixed(4));
}

function toRealLongitude(value) {
  return parseFloat((value / 10000 - 180).toFixed(4));
}

function transformAddressRecord(record) {
  return {
    ...record,
    latitude: toRealLatitude(record.latitude),
    longitude: toRealLongitude(record.longitude),
  };
}

function incrementSerial(serial = "000000000") {
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const chars = serial.split("");

  for (let i = chars.length - 1; i >= 0; i--) {
    const index = charset.indexOf(chars[i]);
    if (index < charset.length - 1) {
      chars[i] = charset[index + 1];
      return chars.join("");
    } else {
      chars[i] = charset[0];
    }
  }

  throw new Error("Limite máximo de identificadores atingido.");
}

async function getNextSerialFromPrefix(prefix, db) {
  const result = await db.oneOrNone(
    `SELECT address FROM public.addresses
     WHERE address LIKE $1
     ORDER BY address DESC
     LIMIT 1`,
    [`${prefix}-%`]
  );

  if (!result) return "000000000";

  const match = result.address.match(/-(\w{3})-(\w{3})-(\w{3})$/);
  if (!match) return "000000000";

  const lastSerial = match.slice(1, 4).join("");
  return incrementSerial(lastSerial);
}

async function generateIdentifier({ country, type }, db) {
  const prefix = `${type}-${country}`;
  const serial = await getNextSerialFromPrefix(prefix, db);

  const XXX = serial.slice(0, 3);
  const YYY = serial.slice(3, 6);
  const ZZZ = serial.slice(6, 9);

  return `${prefix}-${XXX}-${YYY}-${ZZZ}`;
}

module.exports = {
  toInternalLatitude,
  toInternalLongitude,
  toRealLatitude,
  toRealLongitude,
  transformAddressRecord,
  incrementSerial,
  getNextSerialFromPrefix,
  generateIdentifier,
};
