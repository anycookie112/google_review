import type { StoreConfig } from "@/types";

/**
 * Default store seed data.
 *
 * On first boot, when the `stores` table is empty, the app inserts these rows
 * into Postgres automatically. After that, the database becomes the source of
 * truth and editing this file will not change existing environments unless you
 * reset the table.
 */
export const seedStores: StoreConfig[] = [
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
