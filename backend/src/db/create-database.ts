import pg from "pg";
import { config } from "../config.js";

const { Client } = pg;

const escapeIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

const run = async () => {
  const database = config.pg.database;
  const client = new Client(
    config.databaseUrl
      ? { connectionString: config.databaseUrl.replace(/\/[^/?]+(\?|$)/, "/postgres$1") }
      : {
          host: config.pg.host,
          port: config.pg.port,
          database: "postgres",
          user: config.pg.user,
          password: config.pg.password,
        },
  );

  await client.connect();

  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    database,
  ]);

  if (!existing.rowCount) {
    await client.query(`CREATE DATABASE ${escapeIdentifier(database)}`);
    console.log(`Database created: ${database}`);
  } else {
    console.log(`Database already exists: ${database}`);
  }

  await client.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
