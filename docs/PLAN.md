# Friendly Restaurant — Product & Technical Plan

> Only see restaurant reviews written by people you actually know.
> No strangers, no paid reviews, no bots.

## 1. The problem

Public review platforms (Google Maps, Zomato, Yelp, TripAdvisor) are full of
fake, paid, or incentivised reviews. A 4.6★ from 3,000 strangers tells you
less than "my friend Priya went last week and says the biryani is the best
in town."

## 2. The core idea

A restaurant review app where **the only reviews you can ever see are your
friends'**. Every review is tied to a real account, and a review is visible
to a person only if the two of them are mutual friends.

## 3. Where do the friends come from? (Instagram / Snapchat / Google Maps?)

We looked at connecting to existing networks:

| Option | Can we get the user's friend list? | Verdict |
|---|---|---|
| **Google Maps reviews** | No. No API shows who wrote a review or filters reviews by your contacts. The Places API returns at most 5 reviews per place, and scraping breaks Google's terms. | ❌ Not possible |
| **Instagram** | No. Meta shut down the Basic Display API (Dec 2024). The Graph API only works for Business/Creator accounts and never returns follower/following lists. | ❌ Not possible |
| **Snapchat** (Login Kit) | No. Login Kit only gives display name and Bitmoji, not the friend list. | ❌ Not possible |
| **Facebook** (`user_friends`) | Only friends who *also* use our app, and only after Meta app review. Young users rarely use Facebook now. | ⚠️ Possible, low value |
| **Phone contacts** (mobile app) | Yes. Match hashed phone numbers of contacts who are already on the app (WhatsApp, Venmo, and BeReal do this). | ✅ Phase 2 (needs the mobile app) |
| **Own friend graph** (invite links, QR, username search) | Yes, and we fully control it. | ✅ **MVP** |

**Decision:** build **our own friend graph**, and use Instagram, Snapchat,
and WhatsApp as **distribution channels** rather than data sources. Every
user gets a personal invite link (`/u/<username>`) to drop in an Insta bio, a
Snap story, or a WhatsApp group. Whoever opens it signs in with Google and
taps **Add friend**. That gives:

* Mutual, consent-based friendships (both people have to agree), which is
  the strongest protection against fake reviews.
* No dependence on another company's API, which can be shut off at any
  time (as happened with Instagram).
* Built-in viral growth: every user has a reason to invite friends,
  because the app gets more useful with each friend.

## 4. MVP features (this build)

1. **Sign in** with Google or an email magic link (no passwords).
2. **Profile** with a unique `@username` and a shareable invite link.
3. **Friends**: search by username or name, send, accept, or decline
   requests, and unfriend.
4. **Find a restaurant**: search real places through OpenStreetMap (free,
   no key needed) or the Google Places API when a key is configured. Search
   is biased toward the user's location.
5. **Review**: a 1–5★ rating, notes, the dish to try, a price level, a
   "would go again" answer, and the date visited. One review per person per
   place; it can be edited or deleted.
6. **Place page**: the friends' average rating and each friend's review,
   plus a link to open the place in Google Maps for directions.
7. **Home**: a map of every place friends have rated, a "Top picks from
   friends" list, and a feed of recent friend reviews.
8. **Privacy enforced in the database** (Postgres Row Level Security). Even
   someone calling the API directly cannot read a stranger's review.

## 5. "Rate it for your friends" reminders

Goal: when someone visits a restaurant, the app reminds them to rate it.

**What a web app can and can't do:** browsers don't let websites run in the
background, so a website can't notice a visit while it's closed. Only native
apps can do that, using the phone's geofencing / visit detection. So reminders
come in two stages:

| | Web app (built now) | Native app (Phase 2) |
|---|---|---|
| Detect the visit | When you **open the app** at a restaurant, it checks your location and pops up "Are you at X?" | Automatically in the background, even when the app is closed |
| Remind later | "Remind me after my meal" → push notification ~90 min later: "How was X?" | Local notification after you leave the restaurant |
| Location stored? | Never. Only the place you choose to be reminded about | Never. Detection happens on the phone |

The `visits` table, push sending, and the "To review" list are shared, so the
native app plugs into the same backend.

Built alongside it:
* Push notifications for friend requests and accepted requests.
* Installable app: icons, manifest, and iPhone Home Screen support.
* **Delete account** (required by app stores and privacy law) and a privacy page.

## 6. Later phases

* **Phase 2:** a native mobile app (Expo / React Native, same Supabase
  backend) with **automatic background visit detection**, phone-contact
  matching, and photos on reviews.
* **Phase 3:** optional friends-of-friends reviews (clearly labelled and
  weighted lower), wishlists ("want to go"), lists ("Best momos in Delhi"),
  and group decisions ("where should 5 of us eat tonight?").
* **Trust signals:** "visited" verification using location check-in and
  receipt photos.

## 7. Tech stack (chosen for low cost and fast development)

| Layer | Choice | Why |
|---|---|---|
| Web app | **Next.js 15** (App Router, Server Components, Server Actions) + TypeScript | One codebase for UI and API; deploys to Vercel for free. |
| Styling | Tailwind CSS v4 | Fast, mobile-first. |
| Auth + DB | **Supabase** (Postgres + Auth + Row Level Security) | Free tier; Google login built in; privacy rules live in the DB. The future mobile app reuses it unchanged. |
| Places data | OpenStreetMap via Photon (default), Google Places API (optional) | Free to start; switch to Google with an env var for better coverage. |
| Map | Leaflet + OpenStreetMap tiles | Free, no key. |
| Hosting | Vercel | Free tier, automatic HTTPS, preview deploys. |

## 8. Data model

```
profiles     id (= auth user id), username (unique), display_name, avatar_url
friendships  requester_id, addressee_id, status (pending | accepted)
             one row per pair (unique on the unordered pair)
places       id, provider (osm | google), provider_id, name, address, lat, lng, category
reviews      id, user_id, place_id, rating 1-5, body, must_try, price_level,
             would_return, visited_on    (unique per user + place)
visits       id, user_id, place_id, status (pending | reviewed | dismissed),
             remind_at, notified_at      ("To review" list + reminders)
push_subscriptions  endpoint, user_id, keys   (one per device with notifications on)
```

### Security rules (RLS)
* `reviews`: you can read a review only if it is **yours** or its author is
  an **accepted friend**. You can write only your own.
* `friendships`: you see only the rows you are part of. Sending and
  accepting go through `security definer` functions, so nobody can forge
  an "accepted" friendship.
* `places`: anyone signed in can read them. Only the server can create them,
  and only from search results it signed itself (HMAC), so place data
  cannot be spoofed.
* `profiles`: signed-in users can read basic public info (needed for friend
  search). Email is never exposed.
