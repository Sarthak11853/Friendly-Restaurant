import { NextResponse, type NextRequest } from "next/server";
import { searchPlaces } from "@/lib/places";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim().slice(0, 100);
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const lat = Number.parseFloat(params.get("lat") ?? "");
  const lng = Number.parseFloat(params.get("lng") ?? "");
  try {
    const results = await searchPlaces(q, Number.isFinite(lat) ? lat : undefined, Number.isFinite(lng) ? lng : undefined);
    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Search is unavailable right now" }, { status: 502 });
  }
}
