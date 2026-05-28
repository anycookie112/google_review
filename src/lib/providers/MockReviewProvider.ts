import type { Review, StoreConfig, StoreWithReviews } from "@/types";
import { buildSuggestedReply, deriveSentiment, deriveStatus } from "@/lib/demoLogic";
import type { ReviewProvider } from "./ReviewProvider";

/**
 * Fallback provider used whenever GOOGLE_MAPS_API_KEY is missing OR when the
 * caller explicitly opts into demo data. Produces a deterministic, varied set
 * of reviews across positive / neutral / negative ratings and across stores.
 */
export class MockReviewProvider implements ReviewProvider {
  readonly name = "mock";

  async getStoresWithReviews(stores: StoreConfig[]) {
    const data: StoreWithReviews[] = stores.map((store, idx) =>
      buildMockStore(store, idx),
    );
    return { data, errors: [] };
  }
}

function buildMockStore(store: StoreConfig, storeIndex: number): StoreWithReviews {
  const seedReviews = REVIEW_SEEDS[storeIndex % REVIEW_SEEDS.length];

  const reviews: Review[] = seedReviews.map((seed, i) => {
    const id = `mock-${store.id}-${i}`;
    return {
      id,
      authorName: seed.author,
      authorPhotoUrl: undefined,
      rating: seed.rating,
      text: seed.text,
      relativeTimeDescription: seed.relativeTime,
      publishTime: seed.publishTime,
      sentiment: deriveSentiment(seed.rating, seed.text),
      status: deriveStatus(id, seed.rating),
      suggestedReply: buildSuggestedReply({
        authorName: seed.author,
        rating: seed.rating,
        city: store.city,
        storeName: store.displayName,
      }),
    };
  });

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(reviews.length, 1);

  return {
    storeId: store.id,
    storeName: store.displayName,
    city: store.city,
    region: store.region,
    managerName: store.managerName,
    placeId: store.googlePlaceId || `mock-place-${store.id}`,
    address: MOCK_ADDRESSES[storeIndex % MOCK_ADDRESSES.length],
    googleMapsUrl: "https://maps.google.com/",
    rating: Math.round(avg * 10) / 10,
    totalReviewCount: 120 + storeIndex * 47,
    reviews,
  };
}

const MOCK_ADDRESSES = [
  "Suria KLCC, Kuala Lumpur City Centre, 50088 Kuala Lumpur",
  "Bangsar Village II, 2, Jln Telawi 1, Bangsar, 59100 Kuala Lumpur",
  "Lebuh Chulia, George Town, 10200 George Town, Penang",
  "Johor Bahru City Square, 106-108, Jalan Wong Ah Fook, 80000 Johor Bahru",
];

interface ReviewSeed {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
}

// Five reviews per store across the four mock stores = 20 reviews total.
// Each store has a mix of positive / neutral / negative ratings so the demo
// exercises every UI state.
const REVIEW_SEEDS: ReviewSeed[][] = [
  // Store 0 — KLCC
  [
    {
      author: "Aisha Rahman",
      rating: 5,
      text: "Service was warm and attentive, and the drinks came out quickly even during the lunch rush. Will definitely be back!",
      relativeTime: "2 days ago",
      publishTime: "2026-05-12T10:15:00Z",
    },
    {
      author: "Marcus Lim",
      rating: 1,
      text: "Waited 35 minutes for a simple order. Staff seemed overwhelmed and no one acknowledged us when we asked about the delay. Very disappointed.",
      relativeTime: "5 days ago",
      publishTime: "2026-05-09T13:42:00Z",
    },
    {
      author: "Priya Devi",
      rating: 4,
      text: "Solid experience overall. The seating area could use better aircon, but the food was great and the staff were friendly.",
      relativeTime: "1 week ago",
      publishTime: "2026-05-07T09:00:00Z",
    },
    {
      author: "Tan Wei Ming",
      rating: 3,
      text: "Food was decent but a bit inconsistent compared to other branches. Hoping it's just a one-off.",
      relativeTime: "2 weeks ago",
      publishTime: "2026-04-30T18:20:00Z",
    },
    {
      author: "Hannah Yeoh",
      rating: 5,
      text: "Genuinely the best branch in KL. The team here remembers regulars and always goes the extra mile.",
      relativeTime: "3 weeks ago",
      publishTime: "2026-04-23T12:10:00Z",
    },
  ],
  // Store 1 — Bangsar
  [
    {
      author: "Daniel Wong",
      rating: 2,
      text: "Found a hair in my food. The replacement came quickly but no apology and no follow-up. Won't be coming back to this branch.",
      relativeTime: "3 days ago",
      publishTime: "2026-05-11T17:30:00Z",
    },
    {
      author: "Sarah Lee",
      rating: 5,
      text: "Lovely vibe, great coffee. Took my parents here and they loved it. The staff were super patient with our questions.",
      relativeTime: "1 week ago",
      publishTime: "2026-05-07T11:00:00Z",
    },
    {
      author: "Kevin Tan",
      rating: 4,
      text: "Pretty good. The new menu items are creative. Prices have crept up though.",
      relativeTime: "2 weeks ago",
      publishTime: "2026-04-30T15:00:00Z",
    },
    {
      author: "Nurul Iman",
      rating: 5,
      text: "Always reliable. I drop by twice a week for the breakfast set and it's never let me down.",
      relativeTime: "1 month ago",
      publishTime: "2026-04-14T08:30:00Z",
    },
    {
      author: "Jason Chua",
      rating: 3,
      text: "Mixed visit. The mains were great but the dessert was clearly not fresh. The team apologised which I appreciated.",
      relativeTime: "1 month ago",
      publishTime: "2026-04-12T19:45:00Z",
    },
  ],
  // Store 2 — Georgetown
  [
    {
      author: "Cheryl Goh",
      rating: 5,
      text: "Hidden gem in Georgetown. The staff went above and beyond to recommend dishes for first-timers.",
      relativeTime: "4 days ago",
      publishTime: "2026-05-10T14:00:00Z",
    },
    {
      author: "Rajesh Kumar",
      rating: 2,
      text: "Order was wrong twice in a row. Manager wasn't around and the team didn't seem to know how to handle it. Frustrating visit.",
      relativeTime: "1 week ago",
      publishTime: "2026-05-07T12:30:00Z",
    },
    {
      author: "Amelia Tan",
      rating: 5,
      text: "Outstanding service. We were a group of 9 and they handled it without missing a beat.",
      relativeTime: "2 weeks ago",
      publishTime: "2026-04-30T20:15:00Z",
    },
    {
      author: "Lim Chong Wei",
      rating: 3,
      text: "Decent food but the place was quite warm. Could really use stronger fans or aircon in the back area.",
      relativeTime: "3 weeks ago",
      publishTime: "2026-04-23T16:45:00Z",
    },
    {
      author: "Farah Aziz",
      rating: 4,
      text: "Friendly staff and clean toilets, which honestly matters a lot. Food was good, will visit again.",
      relativeTime: "1 month ago",
      publishTime: "2026-04-14T10:00:00Z",
    },
  ],
  // Store 3 — JB City Square
  [
    {
      author: "Bryan Ng",
      rating: 1,
      text: "Worst experience at any branch. Staff were rude when I asked for the receipt and the table next to us was not cleaned for the entire hour we were there.",
      relativeTime: "2 days ago",
      publishTime: "2026-05-12T19:00:00Z",
    },
    {
      author: "Siti Aminah",
      rating: 4,
      text: "Convenient location inside the mall. Food came out fast and was tasty. A bit noisy at peak hours.",
      relativeTime: "5 days ago",
      publishTime: "2026-05-09T13:30:00Z",
    },
    {
      author: "Edmund Teo",
      rating: 3,
      text: "It was okay. Nothing special compared to the KL branches. Coffee was lukewarm when it arrived.",
      relativeTime: "1 week ago",
      publishTime: "2026-05-07T08:45:00Z",
    },
    {
      author: "Vivian Soh",
      rating: 5,
      text: "Surprised by how good this branch is. Service was attentive even though they were clearly busy.",
      relativeTime: "2 weeks ago",
      publishTime: "2026-04-30T17:00:00Z",
    },
    {
      author: "Iskandar Yusof",
      rating: 2,
      text: "Long wait and a missing item from the order. Staff were polite about it but it shouldn't happen on a quiet Tuesday afternoon.",
      relativeTime: "3 weeks ago",
      publishTime: "2026-04-23T15:20:00Z",
    },
  ],
];
