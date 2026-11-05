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
    // Browser extensions can add attributes (for example data-qb-installed)
    // before hydration. Suppress root-only attribute warnings; descendants
    // retain React's normal hydration checks.
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
