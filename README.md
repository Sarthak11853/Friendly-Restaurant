# Friendly Restaurant 🍜

Restaurant reviews **only from your friends**. No strangers, no paid reviews, no bots.

* See a map and a ranked list of places your friends have rated.
* Review places with stars, a must-try dish, price, and "would go again".
* Add friends with an invite link you can share on WhatsApp, Instagram, or Snapchat.
* **"Are you at X? Rate it for your friends"** pop-up when you open the app at a restaurant, plus a
  "How was it?" push notification after your meal.
* Installable on phones (Add to Home Screen), with push notifications for reminders and friend requests.
* Privacy is enforced inside the database: you can never read a stranger's review.

For the product idea, the reasoning behind it, and the roadmap, see [docs/PLAN.md](docs/PLAN.md).

**Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · Leaflet/OpenStreetMap

---

## Setup (about 15 minutes)

You need **Node.js 20+**, plus free accounts on **Supabase**, **Google Cloud** (for "Sign in with Google"), and **Vercel** (for hosting).

> Location and notifications need HTTPS. They work on `localhost` and on your deployed site, but not when
> you open your computer's IP address from your phone. To try them on a phone, deploy first (step 8).

### 1. Create the database (Supabase)

1. Go to <https://supabase.com> → **New project**. Pick a region near your users and save the DB password.
2. Open **SQL Editor** → **New query**, paste the whole of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and click **Run**.
   Then do the same with [`0002_visits_push.sql`](supabase/migrations/0002_visits_push.sql).
3. Open **Project Settings → API Keys** and copy:
   * the Project URL
   * the **Publishable** key (or the legacy `anon` key)
   * the **Secret** key (or the legacy `service_role` key)

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the three Supabase values in `.env.local`. `GOOGLE_MAPS_API_KEY` is optional (see step 6).
The notification values are covered in step 7.

### 3. Turn on Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project.
2. **APIs & Services → OAuth consent screen**: choose External, fill in the app name and your email, then publish the app.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → *Web application*.
   * **Authorized redirect URI:** `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
     (you can copy it from Supabase → Authentication → Sign In / Providers → Google).
4. Copy the Client ID and Client Secret into **Supabase → Authentication → Sign In / Providers → Google**, enable it, and save.

Email magic-link sign-in works out of the box. Supabase's built-in email sender is rate-limited, so for real users add your own SMTP under **Authentication → Emails → SMTP Settings** (for example Resend or Brevo, both of which have free tiers).

### 4. Allow your app's URLs

In **Supabase → Authentication → URL Configuration**:

* **Site URL:** `http://localhost:3000` for now (change it to your production URL after deploying)
* **Redirect URLs:** add `http://localhost:3000/**` and later `https://YOUR-DOMAIN/**`

### 5. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in, and you are ready to go.

### 6. (Optional) Better restaurant search with Google Places

Search uses free OpenStreetMap data by default. Coverage is good in big cities but can miss small places. For Google-quality results:

1. In Google Cloud Console, enable **Places API (New)** and add billing. Google gives a monthly free usage credit.
2. Create an **API key** and restrict it to *Places API (New)*.
3. Set `GOOGLE_MAPS_API_KEY` in your env vars and restart.

### 7. Push notifications

1. Generate a key pair:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Put the **Public Key** in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the **Private Key** in `VAPID_PRIVATE_KEY`.
   Set `VAPID_SUBJECT` to `mailto:` followed by your email address.
2. Set `CRON_SECRET` to a long random string (`openssl rand -hex 32`).
3. Restart the app. In the app, go to **Me → Reminders**, turn on **Push notifications**, and tap **Send me a test notification**.

> **iPhone:** Apple allows web notifications only for apps added to the Home Screen
> (Safari → Share → **Add to Home Screen**, iOS 16.4+). Android and desktop browsers work directly.

### 8. Deploy (Vercel)

1. Push this repo to GitHub, then on <https://vercel.com> click **Add New → Project** and import it.
2. Add the same env vars from `.env.local` and deploy.
3. Put the Vercel URL in Supabase **Site URL** and **Redirect URLs** (step 4).

### 9. Turn on "How was it?" reminders (after deploying)

Reminders are sent by `/api/cron/reminders`, which needs to be called every few minutes. Vercel's free plan
only runs scheduled jobs once a day, so we use Supabase's free scheduler instead:

1. Supabase → **Database → Extensions**: enable **pg_cron** and **pg_net**.
2. Supabase → **SQL Editor**, replace the two placeholders, and run:
   ```sql
   select cron.schedule(
     'review-reminders',
     '*/5 * * * *',  -- every 5 minutes
     $$
     select net.http_post(
       url := 'https://YOUR-APP.vercel.app/api/cron/reminders',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
     );
     $$
   );
   ```
3. To check it's working: **Integrations → Cron → Jobs** shows each run.

---

## Project structure

```
supabase/migrations/   Database schema + Row Level Security rules
src/app/               Pages (App Router) and Server Actions
  page.tsx             Home: friends map, top picks, feed (or the landing page)
  search/              Find a restaurant
  places/[id]/         Place page: friends' rating, reviews, your review form
  friends/             Invite link, search people, requests
  u/[username]/        Profile page; this is also the invite link
  me/                  Profile, reminder settings, sign out, delete account
  privacy/             Privacy page
  reminders/           Server actions: nearby check, "remind me", push subscriptions
  api/places/search/   Place search (OpenStreetMap or Google)
  api/cron/reminders/  Sends due "How was it?" notifications
src/lib/               Supabase clients, place search, push, helpers
src/components/        UI components (VisitPrompt = the "Are you at X?" pop-up)
public/sw.js           Service worker that shows push notifications
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
