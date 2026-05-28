import { NextResponse } from "next/server";

export function buildPathWithQuery(
  pathname: string,
  params: Record<string, string | null | undefined> = {},
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function redirectToPath(path: string, status = 303): NextResponse {
  return new NextResponse(null, {
    status,
    headers: {
      Location: path,
    },
  });
}
