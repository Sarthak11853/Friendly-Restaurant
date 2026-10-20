import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendPush } from "@/lib/push";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Sends "How was it?" notifications for visits whose reminder is due.
 * Called every few minutes by a scheduled job (see README → Reminders).
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();
  const { data: due, error } = await admin
    .from("visits")
    .select("id, user_id, place:places(id, name)")
    .eq("status", "pending")
    .is("notified_at", null)
    .lte("remind_at", new Date().toISOString())
    .limit(200)
    .returns<{ id: string; user_id: string; place: { id: string; name: string } }[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ sent: 0 });

  // Mark first so a slow run can't double-send.
  await admin
    .from("visits")
    .update({ notified_at: new Date().toISOString() })
    .in("id", due.map((v) => v.id));

  await Promise.all(
    due.map((v) =>
      sendPush([v.user_id], {
        title: `How was ${v.place.name}?`,
        body: "Rate it for your friends. It takes 10 seconds ⭐",
        url: `/places/${v.place.id}`,
        tag: `visit-${v.id}`,
      }),
    ),
  );
  return NextResponse.json({ sent: due.length });
}

export const GET = handle;
export const POST = handle;
