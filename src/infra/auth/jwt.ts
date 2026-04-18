import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export interface JwtPayload {
  sub: string;
}

export const signToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

export const verifyToken = (token: string): JwtPayload => {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token payload");
  }
  return { sub: String(payload.sub) };
};
