import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Cheap Travel — Stay a little smarter",
  description:
    "Compare hotel stays, track your booking, and discover price drops before check-in.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
