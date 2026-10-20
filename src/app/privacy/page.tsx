import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy · Friendly Restaurant" };

export default function PrivacyPage() {
  return (
    <article className="card space-y-4 text-stone-700 [&_h2]:mt-2 [&_h2]:font-semibold [&_h2]:text-stone-900">
      <h1 className="text-2xl font-bold text-stone-900">Privacy</h1>
      <p>Friendly Restaurant exists to show you honest reviews from people you know. Here&apos;s exactly what we do with your data.</p>

      <h2>What we store</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your name, profile photo, and email from Google, or just your email if you use a sign-in link.</li>
        <li>Your username, friends, and friend requests.</li>
        <li>The reviews you write.</li>
        <li>Places you asked us to remind you about (&quot;To review&quot;).</li>
      </ul>

      <h2>Who can see your reviews</h2>
      <p>Only you and people you have accepted as friends. Nobody else, including other users, can read them.</p>

      <h2>Location</h2>
      <p>
        Location is optional. If you turn on visit detection, your location is checked only while the app is open, and only to find
        restaurants near you. We never store your location or location history. If you choose &quot;Remind me&quot;, we save the
        restaurant, not your coordinates.
      </p>

      <h2>Notifications</h2>
      <p>If you allow notifications, we store a device token so we can send reminders and friend requests. You can turn them off at any time in Me → Reminders.</p>

      <h2>Services we use</h2>
      <p>
        Supabase (database and sign-in), Vercel (hosting), OpenStreetMap or Google Maps (restaurant search), and your browser&apos;s
        push service (notifications). We don&apos;t sell your data or show ads.
      </p>

      <h2>Deleting your data</h2>
      <p>Go to Me → Delete account. Your profile, reviews, friendships, and reminders are permanently deleted right away.</p>
    </article>
  );
}
