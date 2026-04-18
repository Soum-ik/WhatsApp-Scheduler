import * as userRepo from "../infra/repos/user.repo";
import { signToken } from "../infra/auth/jwt";
import { badRequest, conflict, unauthorized } from "../shared/errors";

const hashPassword = (plain: string) =>
  Bun.password.hash(plain, { algorithm: "argon2id" });
const verifyPassword = (plain: string, hash: string) =>
  Bun.password.verify(plain, hash);

export const signUp = async (email: string, password: string) => {
  const normalized = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized)) throw badRequest("Invalid email");
  if (password.length < 8) throw badRequest("Password must be at least 8 characters");

  const existing = await userRepo.findUserByEmail(normalized);
  if (existing) throw conflict("Email already registered");

  const hash = await hashPassword(password);
  const user = await userRepo.createUser(normalized, hash);
  return { token: signToken(user.id), userId: user.id };
};

export const signIn = async (email: string, password: string) => {
  const normalized = email.trim().toLowerCase();
  const user = await userRepo.findUserByEmail(normalized);
  if (!user) throw unauthorized("Invalid credentials");
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw unauthorized("Invalid credentials");
  return { token: signToken(user.id), userId: user.id };
};
