import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hotels } from "@/lib/hotels";
export type Source = {
  id: string;
  title: string;
  text: string;
  source: string;
};
export async function retrieve(question: string, hotelId?: string) {
  const sources: Source[] = [];
  try {
    const { rows } = await db.query(
      "SELECT id,title,content AS text,source FROM \"KnowledgeDocument\", plainto_tsquery('english',$1) q WHERE to_tsvector('english',title || ' ' || content) @@ q ORDER BY ts_rank(to_tsvector('english',title || ' ' || content),q) DESC LIMIT 4",
      [question],
    );
    sources.push(...rows);
    if (/my |booking|reserv|track|price|cancel/i.test(question)) {
      const user = await getUser();
      if (user) {
        const { rows: bookings } = await db.query(
          'SELECT id,"hotelName","checkIn","checkOut","roomDescription","mealPlan","originalTotal","cancellationFee","cancellationBefore",currency,"checkError","lastCheckedAt" FROM "Booking" WHERE "userId"=$1 ORDER BY "checkIn" DESC LIMIT 5',
          [user.id],
        );
        sources.push(
          ...bookings.map((b) => ({
            id: b.id,
            title: `Your booking: ${b.hotelName}`,
            text: JSON.stringify(b),
            source: "Your private booking record",
          })),
        );
      }
    }
  } catch {
    /* Missing data is never presented as retrieved evidence. */
  }
  const selected =
    hotels.find((h) => h.id === hotelId) ||
    hotels.find((h) =>
      question.toLowerCase().includes(h.name.toLowerCase().split(" ")[0]),
    );
  if (selected)
    sources.push({
      id: selected.id,
      title: `DEMO: ${selected.name}`,
      text: selected.policy,
      source: "Sample policy — never use for real cancellation decisions",
    });
  return sources;
}
