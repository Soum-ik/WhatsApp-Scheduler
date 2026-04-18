import { sql } from "../db/pool";
import type { User } from "../../types";

export const createUser = async (email: string, passwordHash: string): Promise<User> => {
  const rows = await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email, password_hash, created_at
  ` as User[];
  return rows[0]!;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const rows = await sql`
    SELECT id, email, password_hash, created_at FROM users WHERE email = ${email}
  ` as User[];
  return rows[0] ?? null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const rows = await sql`
    SELECT id, email, password_hash, created_at FROM users WHERE id = ${id}
  ` as User[];
  return rows[0] ?? null;
};
