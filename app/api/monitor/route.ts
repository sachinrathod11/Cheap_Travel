import { timingSafeEqual } from "node:crypto";
import { getUser } from "@/lib/auth";
import { monitorBookings } from "@/lib/monitor";
export const maxDuration = 300;
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (auth) {
    const expected = `Bearer ${process.env.MONITOR_SECRET || ""}`;
    if (
      !process.env.MONITOR_SECRET ||
      process.env.MONITOR_SECRET.length < 32 ||
      Buffer.byteLength(auth) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
    )
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json(await monitorBookings());
  }
  const user = await getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to check prices." },
      { status: 401 },
    );
  return Response.json(await monitorBookings(user.id));
}
