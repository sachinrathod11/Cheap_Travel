import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { store } from "@/lib/db";

const cookieName = "cheaptravel_session";
function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    return store.findUserById(payload.sub);
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
