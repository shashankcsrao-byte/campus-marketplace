# Manual QA — Test Results

Tested in a fresh Incognito window. Mark each row **Pass** / **Fail** and add notes.

**Build:** `npm run build` ☐  **Preview:** `npm run preview` click-through ☐  **Date:** ____  **URL:** ____

| # | Area | Test case | Expected | Result | Notes |
|---|------|-----------|----------|--------|-------|
| 1 | Auth | Register account A | Row in `profiles` with name + campus | | |
| 2 | Auth | Logout → login → refresh | Still logged in | | |
| 3 | Auth | Wrong password | "Incorrect email or password." | | |
| 4 | Auth | Register existing email | "An account with this email already exists." | | |
| 5 | Auth | Logged out → `/create` | Sent to `/login`, then back to `/create` | | |
| 6 | Auth | Edit profile name, refresh | New name persists | | |
| 7 | Listings | Create listing with image | Row has `seller_id` = your id; redirected to details | | |
| 8 | Listings | Empty fields / price 0 / 2-char title | Blocked with field errors | | |
| 9 | Listings | Console insert with price -5 | Database rejects (23514) | | |
| 10 | Listings | `/listing/<random-uuid>` | "This listing doesn't exist or was removed." | | |
| 11 | Listings | Logged out browse + details | Works | | |
| 12 | Listings | Edit listing, change photos | Saved; removed files gone from Storage | | |
| 13 | Listings | Delete with confirm | Row + Storage files removed → /my-listings | | |
| 14 | Authorization | `rls-test.mjs` | All PASS | | |
| 15 | Authorization | B opens `/edit/<A's id>` | "You can't edit this listing" | | |
| 16 | Sold | Mark sold / available | SOLD ribbon, greyscale, struck price; Contact hidden | | |
| 17 | Search | "KEYBOARD" finds "Mechanical keyboard" | Case-insensitive | | |
| 18 | Search | Word only in description | Found | | |
| 19 | Search | Network tab while typing | One request after you stop | | |
| 20 | Filters | Category / price / status, alone + combined | Correct results | | |
| 21 | Filters | Min > max | Error shown, not applied | | |
| 22 | Sort | Newest / price ↑ / price ↓ | Correct order | | |
| 23 | Filters | Copy URL to new tab | Same results | | |
| 24 | Search | Type `a,b(c)` | No crash | | |
| 25 | Favourites | Toggle heart, refresh | Persists | | |
| 26 | Favourites | Double-click fast | No duplicate | | |
| 27 | Favourites | Delete a favourited listing | Gone from Favourites | | |
| 28 | Images | JPG + PNG upload | Stored as `.webp` under `<uid>/<listingId>/` | | |
| 29 | Images | PDF / 15 MB file | Friendly error, nothing uploaded | | |
| 30 | Images | Submit with no image | Blocked | | |
| 31 | Images | DevTools Offline → submit | Friendly error, no orphan row | | |
| 32 | Images | Broken image URL | Placeholder shown | | |
| 33 | Location | "NMIT Bangalore" | Match; stored with 3 decimals | | |
| 34 | Location | Nonsense text | "Couldn't find that place…"; still saves | | |
| 35 | Location | Offline | "Location service unavailable…"; still saves | | |
| 36 | Location | View map link | Opens correct area in new tab | | |
| 37 | Chat | B → Contact Seller twice | Same chat reused | | |
| 38 | Chat | Messages in two windows | Instant both sides | | |
| 39 | Chat | New message | Chat list re-orders | | |
| 40 | Chat | Leave/reopen chat 5× | Each message appears once | | |
| 41 | Real-time | New / sold listing in window 1 | Appears in window 2 | | |
| 42 | Responsive | 360 / 768 / 1024 / 1440 px + real phone | No horizontal scroll, usable | | |
| 43 | Console | Every page | No red errors | | |

## rls-test.mjs output

```
<paste here>
```
