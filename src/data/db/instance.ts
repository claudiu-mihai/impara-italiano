import { createDb } from "./db.ts";

/** Instanța unică a bazei de date locale folosită de aplicație. */
export const db = createDb();
