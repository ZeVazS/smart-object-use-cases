const db = require('./db');
import { generateIdentifier } from './utils/addressUtils.js';
import { faker } from '@faker-js/faker';


// Cidades portuguesas com coordenadas centrais
const portugueseCities = [
  { name: 'Lisboa', lat: 38.7169, lon: -9.1399 },
  { name: 'Porto', lat: 41.1496, lon: -8.6109 },
  { name: 'Braga', lat: 41.5454, lon: -8.4265 },
  { name: 'Coimbra', lat: 40.2033, lon: -8.4103 },
  { name: 'Faro', lat: 37.0194, lon: -7.9304 },
  { name: 'Setúbal', lat: 38.5244, lon: -8.8882 },
  { name: 'Aveiro', lat: 40.6405, lon: -8.6538 },
  { name: 'Évora', lat: 38.5717, lon: -7.9136 },
];

// Pequena variação (até ±0.05 graus, cerca de 5km)
function randomizeCoord(coord, maxDelta = 0.05) {
  const delta = (Math.random() - 0.5) * 2 * maxDelta;
  return +(coord + delta).toFixed(6);
}

function toInternalLongitude(real) {
  return Math.round((real + 180) * 10000);
}
function toInternalLatitude(real) {
  return Math.round((real + 90) * 10000);
}
async function seed() {
  try {
    console.log('A apagar dados existentes...');
    await db.none('DELETE FROM addresses');
    await db.none('DELETE FROM users');

    console.log('A inserir utilizadores...');
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const name = `user${i}`;
      const password = `pass${i}`;
      const user = await db.one(
        'INSERT INTO users(name, password) VALUES($1, $2) RETURNING *',
        [name, password]
      );
      users.push(user);
    }

    console.log('A inserir endereços...');
    
    const country = '640'; //PORTUGAL

    for (let i = 0; i < 1000; i++) {
      const type = 'S';
      const owner = users[i % users.length];
      const address = await generateIdentifier({ country, type }, db);

      const city = portugueseCities[Math.floor(Math.random() * portugueseCities.length)];

      // Variação de até ~5km na posição
      const variedLat = randomizeCoord(city.lat, 0.03); // ~3km
      const variedLon = randomizeCoord(city.lon, 0.03); // ~3km

      const internalLat = toInternalLatitude(variedLat);
      const internalLon = toInternalLongitude(variedLon);
      const altitude = faker.number.int({ min: 0, max: 20 });

      const remainingBags = faker.number.int({ min: 0, max: 50 });
      const characteristics = { remainingBags };

      const visibility = false; //sao todos privados
        

        await db.none(
        `INSERT INTO addresses(address, owner_id, characteristics, latitude, longitude, altitude, visibility)
        VALUES($1, $2, $3, $4, $5, $6, $7)`,
        [address, owner.id, characteristics, internalLat, internalLon, altitude, visibility]
        );

      if (i % 100 === 0) console.log(`Inseridos ${i} objetos...`);
    }

    console.log('✅ Dados de teste inseridos com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro no seeding:', err);
    process.exit(1);
  }
}

seed();
