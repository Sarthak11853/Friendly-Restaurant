# Friendly Restaurant 🍜

Restaurant reviews **only from your friends**. No strangers, no paid reviews, no bots.

* See a map and a ranked list of places your friends have rated.
* Review places with stars, a must-try dish, price, and "would go again".
* Add friends with an invite link you can share on WhatsApp, Instagram, or Snapchat.
* Privacy is enforced inside the database: you can never read a stranger's review.

For the product idea, the reasoning behind it, and the roadmap, see [docs/PLAN.md](docs/PLAN.md).

**Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · Leaflet/OpenStreetMap

---

## Setup (about 15 minutes)

You need **Node.js 20+**, plus free accounts on **Supabase**, **Google Cloud** (for "Sign in with Google"), and **Vercel** (for hosting).

### 1. Create the database (Supabase)

1. Go to <https://supabase.com> → **New project**. Pick a region near your users and save the DB password.
2. Open **SQL Editor** → **New query**, paste the whole of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and click **Run**.
3. Open **Project Settings → API Keys** and copy:
   * the Project URL
   * the **Publishable** key (or the legacy `anon` key)
   * the **Secret** key (or the legacy `service_role` key)

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the three Supabase values in `.env.local`. `GOOGLE_MAPS_API_KEY` is optional (see step 6).

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

### 7. Deploy (Vercel)

1. Push this repo to GitHub, then on <https://vercel.com> click **Add New → Project** and import it.
2. Add the same env vars from `.env.local` and deploy.
3. Put the Vercel URL in Supabase **Site URL** and **Redirect URLs** (step 4).

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
  me/                  Edit your profile, sign out
  api/places/search/   Place search (OpenStreetMap or Google)
src/lib/               Supabase clients, place search, helpers
src/components/        UI components
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
