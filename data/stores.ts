/**
 * Configured franchise store locations.
 *
 * To wire up real Google Places API data:
 *   1. Find each store on Google Maps.
 *   2. Copy the Place ID (use https://developers.google.com/maps/documentation/places/web-service/place-id
 *      or the Place ID Finder tool).
 *   3. Paste it into `googlePlaceId` below.
 *
 * If GOOGLE_MAPS_API_KEY is not set in the environment, the app runs in Mock Mode
 * and these placeholder IDs are ignored.
 */
export interface StoreConfig {
  id: string;
  displayName: string;
  city: string;
  region: string;
  managerName: string;
  googlePlaceId: string;
}

export const stores: StoreConfig[] = [
  {
    id: "klcc",
    displayName: "Demo Franchise - KLCC",
    // Level 3A, Podium Block, Plaza Berjaya, 12, Jln Imbi, Bukit Bintang, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia
    city: "Kuala Lumpur",
    region: "Central",
    managerName: "Alicia",
    // TODO: Replace with the real Place ID for this branch.
    googlePlaceId: "ChIJPUIgWCg2zDERYxF10pbf4no",
  },
  {
    id: "petronas",
    displayName: "Demo Franchise - petronas",
    city: "Kuala Lumpur",
    region: "Central",
    managerName: "Daniel",
    googlePlaceId: "ChIJuTUeytY3zDER1Z1HlAtjMTY",
  },
  {
    id: "cualan",
    displayName: "Demo Franchise - cualan",
    city: "George Town",
    region: "Northern",
    managerName: "Priya",
    googlePlaceId: "ChIJ6wvvTys2zDERXKicoXJWLOM",
  },
];
