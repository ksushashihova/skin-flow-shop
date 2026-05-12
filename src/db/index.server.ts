import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | undefined;



function makeDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, {
    prepare: false,
    max: 10,
    connection: { search_path: "oblako,public" },
    ssl: {
      rejectUnauthorized: false,   // <-- добавить
    },
  });

  return drizzle(client, { schema });
}

export const db = new Proxy({} as ReturnType<typeof makeDb>, {
  get(_t, prop, recv) {
    if (!_db) _db = makeDb();
    return Reflect.get(_db, prop, recv);
  },
});

export { schema };
