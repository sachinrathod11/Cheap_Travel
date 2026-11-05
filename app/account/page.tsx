import BookingsPanel from "@/app/bookings-panel";
import { hotels } from "@/lib/hotels";
export default function AccountPage() {
  return (
    <main style={{ paddingTop: 32 }}>
      <a href="/">← Cheap Travel</a>
      <BookingsPanel hotels={hotels} />
    </main>
  );
}
