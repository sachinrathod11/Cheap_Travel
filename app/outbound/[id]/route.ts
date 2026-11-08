import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicWebsite } from "@/lib/public-url";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return new Response("Sign in to open this saved hotel visit.", {
      status: 401,
    });
  const { id } = await params;
  const record = (
    await db.query(
      'SELECT "targetUrl" FROM "BookingHandoff" WHERE id=$1 AND "userId"=$2',
      [id, user.id],
    )
  ).rows[0];
  if (!record) return new Response("Saved visit not found.", { status: 404 });
  const target = publicWebsite(record.targetUrl);
  if (!target)
    return new Response("This link cannot be opened safely.", { status: 400 });
  await db.query(
    'UPDATE "BookingHandoff" SET "openedAt"=COALESCE("openedAt",now()),"lastOpenedAt"=now(),"openCount"="openCount"+1,status=CASE WHEN status IN (\'pending\',\'dismissed\') THEN \'opened\' ELSE status END WHERE id=$1 AND "userId"=$2',
    [id, user.id],
  );
  return new Response(null, {
    status: 303,
    headers: {
      Location: target,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
