import { requireAdminUser } from "@/lib/auth";
import { createStore, type StoreUpsertInput } from "@/lib/db/stores";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireAdminUser();
  const formData = await request.formData();

  try {
    const input = parseStoreForm(formData);
    await createStore(input);
    return redirectToPath(buildPathWithQuery("/admin/stores", { message: "created" }));
  } catch (error) {
    return redirectToPath(
      buildPathWithQuery("/admin/stores", {
        error: mapStoreError(error),
      }),
    );
  }
}

function parseStoreForm(formData: FormData): StoreUpsertInput {
  const input: StoreUpsertInput = {
    slug: String(formData.get("slug") ?? "").trim(),
    displayName: String(formData.get("displayName") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    region: String(formData.get("region") ?? "").trim(),
    managerName: String(formData.get("managerName") ?? "").trim(),
    googlePlaceId: String(formData.get("googlePlaceId") ?? "").trim(),
    googleLocationName: String(formData.get("googleLocationName") ?? "").trim() || null,
    googleAccountResourceName:
      String(formData.get("googleAccountResourceName") ?? "").trim() || null,
    isActive: formData.get("isActive") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (!input.slug || !input.displayName || !input.city || !input.region || !input.managerName) {
    throw new Error("missing_fields");
  }

  return input;
}

function mapStoreError(error: unknown): string {
  if (error instanceof Error && error.message === "missing_fields") {
    return "missing_fields";
  }

  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  ) {
    return "duplicate_slug";
  }

  return "missing_fields";
}
