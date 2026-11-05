export type Offer = {
  provider: string;
  total: number;
  refundable: boolean;
  cancellationFee: number;
  meals: string;
};
export type Hotel = {
  id: string;
  name: string;
  location: string;
  city: string;
  category: string;
  rating: number;
  reviews: number;
  image: string;
  color: string;
  amenities: string[];
  description: string;
  policy: string;
  offers: Offer[];
};
export const hotels: Hotel[] = [
  {
    id: "alila",
    name: "Alila Diwa Goa",
    location: "Majorda, South Goa",
    city: "Goa",
    category: "A little luxury",
    rating: 9.2,
    reviews: 1248,
    image: "/images/stay-3.jpg",
    color: "#bfd2b0",
    amenities: ["Pool", "Spa", "Breakfast", "Free cancellation"],
    description:
      "Slow mornings, lush gardens, and an infinity pool overlooking the paddy fields. A peaceful hideaway in South Goa.",
    policy:
      "Demo policy: King room for two adults. Breakfast included. Free cancellation until 48 hours before check-in. After that, a one-night cancellation charge applies. Taxes are included in displayed prices.",
    offers: [
      {
        provider: "Booking.com",
        total: 8400,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
      {
        provider: "MakeMyTrip",
        total: 9150,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
      {
        provider: "Agoda",
        total: 8750,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
    ],
  },
  {
    id: "taj",
    name: "Taj Fort Aguada Resort & Spa",
    location: "Sinquerim, North Goa",
    city: "Goa",
    category: "Oceanfront escape",
    rating: 9.4,
    reviews: 2186,
    image: "/images/escape.jpg",
    color: "#d8d2ba",
    amenities: ["Beachfront", "Pool", "Breakfast", "Free cancellation"],
    description:
      "Wake up to the Arabian Sea. An iconic coastal retreat with sun-soaked terraces and room to unwind.",
    policy:
      "Demo policy: Garden-view king room for two adults. Breakfast included. Free cancellation until 72 hours before check-in; after that, the full stay is charged. Taxes included.",
    offers: [
      {
        provider: "MakeMyTrip",
        total: 12600,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
      {
        provider: "Booking.com",
        total: 13400,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
      {
        provider: "Agoda",
        total: 12950,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
    ],
  },
  {
    id: "bloom",
    name: "Bloom Hotel · Calangute",
    location: "Calangute, North Goa",
    city: "Goa",
    category: "Small price, big personality",
    rating: 8.7,
    reviews: 864,
    image: "/images/stay-2.jpg",
    color: "#d7d6bc",
    amenities: ["Pool", "Wi-Fi", "Restaurant", "Free cancellation"],
    description:
      "Bright spaces, easy beach days, and a friendly base for exploring the livelier side of Goa.",
    policy:
      "Demo policy: Standard double room for two adults, room only. Free cancellation until 24 hours before check-in; after that, one night is charged. Taxes included.",
    offers: [
      {
        provider: "Agoda",
        total: 3200,
        refundable: true,
        cancellationFee: 0,
        meals: "Room only",
      },
      {
        provider: "Booking.com",
        total: 3650,
        refundable: true,
        cancellationFee: 0,
        meals: "Room only",
      },
      {
        provider: "MakeMyTrip",
        total: 3480,
        refundable: true,
        cancellationFee: 0,
        meals: "Room only",
      },
    ],
  },
  {
    id: "jaipur",
    name: "Samode Haveli",
    location: "Gangapole, Jaipur",
    city: "Jaipur",
    category: "A heritage hideaway",
    rating: 9.3,
    reviews: 972,
    image: "/images/stay-1.jpg",
    color: "#dfcbb0",
    amenities: ["Pool", "Heritage", "Breakfast", "Free cancellation"],
    description:
      "Quiet courtyards and hand-painted rooms in a beautifully restored heritage haveli.",
    policy:
      "Demo policy: Deluxe double room for two adults. Breakfast included. Free cancellation until 72 hours before arrival. Thereafter the first night is charged. Taxes included.",
    offers: [
      {
        provider: "Booking.com",
        total: 7600,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
      {
        provider: "Agoda",
        total: 8100,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
    ],
  },
  {
    id: "udaipur",
    name: "Trident Udaipur",
    location: "Lake Pichola, Udaipur",
    city: "Udaipur",
    category: "Lakeside living",
    rating: 9.1,
    reviews: 1543,
    image: "/images/stay-3.jpg",
    color: "#b8cbd0",
    amenities: ["Pool", "Lake view", "Breakfast", "Free cancellation"],
    description:
      "Garden walks and warm hospitality beside the quiet waters of Lake Pichola.",
    policy:
      "Demo policy: Garden-view room for two adults. Breakfast included. Free cancellation until 48 hours before check-in. Thereafter a one-night charge applies. Taxes included.",
    offers: [
      {
        provider: "MakeMyTrip",
        total: 8900,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
      {
        provider: "Booking.com",
        total: 9400,
        refundable: true,
        cancellationFee: 0,
        meals: "Breakfast included",
      },
    ],
  },
];
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export function savings(original: number, replacement: number, fee: number) {
  if ([original, replacement, fee].some((v) => !Number.isFinite(v) || v < 0))
    throw new Error("Prices must be non-negative finite numbers");
  return Math.max(0, original - replacement - fee);
}
export function nightsBetween(checkIn: string, checkOut: string) {
  const n = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  return Number.isInteger(n) && n > 0 ? n : 0;
}
