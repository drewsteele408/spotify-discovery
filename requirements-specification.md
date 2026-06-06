# Software Requirements Specification

---

## Title Page

**SRS Project Name:** Spotify Discovery

**Team Members:** Andrew Steele

**Description of Project:**
Spotify Discovery is a web application that authenticates users through their Spotify account and surfaces personalized music data — top tracks, top artists, saved library tracks, and recently played history — in a clean, browsable interface. The application also integrates with the Soundcharts API to enrich individual tracks with third-party chart and metadata information not available through Spotify alone.

---

## Section 1: Introduction

### Introduction

Music streaming has become one of the primary ways people consume audio content, yet the native Spotify application offers limited visibility into a user's own listening patterns and history. Users cannot easily answer questions like "What have I been listening to most over the past six months?" or "What genres do my top artists fall into?" without navigating through disconnected menus. The goal of Spotify Discovery is to solve that problem by pulling a user's personal Spotify data into a single, organized interface that makes listening trends immediately visible. This project was chosen because it sits at the intersection of OAuth security, REST API integration, and practical web development — all areas directly applicable to a career in software engineering.

### Purpose

Spotify Discovery provides authenticated users with a consolidated view of their Spotify listening history and music profile. The application allows a user to log in with their Spotify credentials, then browse their top tracks and artists (filterable by time range), their full saved library, and their recently played history. Additionally, users can request enriched metadata for any individual song through the Soundcharts API, which provides chart rankings and platform-specific data beyond what Spotify natively exposes. The application is designed to be simple, fast, and directly useful for any Spotify user who wants deeper insight into their own music habits.

### Scope

**In Scope:**
- Spotify OAuth 2.0 login and session management
- Displaying a user's top tracks, top artists, saved tracks, and recently played tracks
- Filtering and pagination controls (time range, limit, offset) on all data views
- Integration with the Soundcharts API to retrieve song metadata by Spotify track ID
- Server-side rendering of all pages using the Pug template engine
- Secure session handling with HTTP-only cookies

**Out of Scope:**
- Playing audio or controlling Spotify playback
- Creating, editing, or deleting playlists on behalf of the user
- Social features (sharing, following other users within this app)
- A mobile application — this is a browser-based web application only
- Storing user data in a persistent database between sessions

### Technologies Used

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Web Framework | Express.js v5 |
| Template Engine | Pug v3 |
| HTTP Client | Axios v1 |
| Session Management | express-session v1 |
| Authentication | Spotify OAuth 2.0 (Authorization Code Flow) |
| Third-Party Music API | Soundcharts API v2.25 |
| Primary Data Source | Spotify Web API |
| Environment Config | dotenv |
| Development Server | Nodemon |
| Frontend | Vanilla JavaScript (Fetch API), HTML/CSS via Pug templates |

---

## Section 2a: Must Have Requirements

Each requirement uses "shall" to indicate a mandatory, demonstrable behavior.

**Requirement 1 — Spotify OAuth Authentication**
The application shall allow a user to log in using their existing Spotify account via the OAuth 2.0 Authorization Code Flow, and shall store the resulting access token and user profile in a server-side session.

*Success Measure:* A new user clicks "Login with Spotify," is redirected to the official Spotify authorization page, grants permission, and is redirected back to the application dashboard showing their Spotify display name, email address, country, and subscription tier. No username or password is entered directly into this application. Demonstrated by walking through the full login flow live.

---

**Requirement 2 — Display User Top Tracks**
The application shall display a list of the authenticated user's top tracks, allowing the user to select a time range of last 4 weeks, last 6 months, or all time, and to specify the number of results returned (1–50).

*Success Measure:* After login, the user navigates to the Top Tracks page, selects a time range from the dropdown, enters a limit, and submits the form. The page renders a list of tracks showing track name, contributing artists, album, and popularity score. Changing the time range and resubmitting produces a visibly different ranked list. Demonstrated live with at least two different time range selections.

---

**Requirement 3 — Display User Top Artists**
The application shall display a list of the authenticated user's top artists, allowing the user to select a time range, limit (1–50), and offset (0–49) for pagination.

*Success Measure:* The user navigates to the Top Artists page and submits the form with varied parameters. The page renders artist name, associated genres, Spotify popularity score, follower count, and artist image. Adjusting the offset field shifts the list to a different page of results. Demonstrated live with offset set to 0 and then to 10, showing the list advances.

---

**Requirement 4 — Display Saved Library Tracks**
The application shall display a list of the authenticated user's saved (liked) tracks from their Spotify library, with a configurable result limit (1–50).

*Success Measure:* The user navigates to the Saved Tracks page, sets a limit, and the page renders a list of saved tracks showing track name, artists, album, and popularity. The tracks shown correspond to songs the user has liked in Spotify, verifiable by cross-referencing with the Spotify app. Demonstrated live.

---

**Requirement 5 — Display Recently Played Tracks**
The application shall display a list of the authenticated user's recently played tracks, including the exact timestamp each track was played, with a configurable result limit (1–50).

*Success Measure:* The user navigates to the Recently Played page, sets a limit, and the page renders a chronological list of tracks with their played-at timestamps (date and time). The most recently played track appears at the top of the list. Demonstrated live and cross-referenced against the user's Spotify listening history.

---

**Requirement 6 — Soundcharts Song Metadata Lookup**
The application shall allow the user to request additional metadata for any individual track displayed on the Top Tracks, Saved Tracks, or Recently Played pages by clicking a button next to that track, which fetches data from the Soundcharts API without reloading the page.

*Success Measure:* On any track listing page, the user clicks the "Get Soundcharts Data" button next to a song. The button shows a loading state, then the page updates inline (without a full page reload) to display the raw Soundcharts API response for that song including its Soundcharts UUID and associated metadata. Demonstrated live on at least two different tracks.

---

## Section 2b: Stretch Requirements

**Stretch Requirement 1 — Automatic Access Token Refresh**
The application shall automatically refresh an expired Spotify access token using the stored refresh token, without requiring the user to log out and log back in.

*Success Measure:* A user who has been logged in for more than one hour (after the access token naturally expires) performs any authenticated action (e.g., navigating to the Top Tracks page). Instead of receiving an authentication error, the page loads normally with fresh data. Demonstrated by manually setting a short token expiration window and observing seamless continuation of use.

---

**Stretch Requirement 2 — User Followed Artists Display**
The application shall display a list of artists that the authenticated user follows on Spotify, showing artist name, follower count, and genres.

*Success Measure:* A new page or section is accessible after login that lists the user's followed artists. The data matches what appears in the "Following" section of the user's Spotify profile. Demonstrated live and cross-referenced with the Spotify app.

---

**Stretch Requirement 3 — Spotify Playlist Browser**
The application shall display all private and public playlists owned by or saved by the authenticated user, showing playlist name, track count, and owner.

*Success Measure:* A new page is accessible after login listing all of the user's playlists. Each entry shows the playlist name, number of tracks, and the owning account. Demonstrated live with a Spotify account that has at least three playlists.

---

**Stretch Requirement 4 — Music Recommendations**
The application shall generate a list of up to 20 recommended tracks using Spotify's Recommendations API, seeded from the user's current top tracks or top artists.

*Success Measure:* A new page or section is accessible after login that displays a list of recommended tracks the user has not necessarily heard before, based on seeds drawn from their top listening data. Each recommendation shows track name, artist, and a link to the track on Spotify. The recommendations change when the user refreshes the page or changes the seed source. Demonstrated live.

---

## Section 2c: Weekly Schedule

| Week | Dates | Planned Work |
|---|---|---|
| 1 | Jun 9 – Jun 15 | Project setup: Node/Express scaffold, Spotify OAuth flow, session management |
| 2 | Jun 16 – Jun 22 | Spotify API integration: top tracks and top artists endpoints with query params |
| 3 | Jun 23 – Jun 29 | Spotify API integration: saved tracks and recently played endpoints |
| 4 | Jun 30 – Jul 6 | Soundcharts API integration, inline fetch behavior on track listing pages |
| 5 | Jul 7 – Jul 13 | UI polish: Pug templates, navigation, responsive layout, error pages |
| 6 | Jul 14 – Jul 20 | Stretch: automatic token refresh implementation and testing |
| 7 | Jul 21 – Jul 27 | Stretch: followed artists page and playlist browser page |
| 8 | Jul 28 – Aug 3 | Stretch: Spotify Recommendations page |
| 9 | Aug 4 – Aug 10 | End-to-end testing, bug fixes, edge case handling |
| 10 | Aug 11 – Aug 17 | Final documentation, demo preparation, requirements verification run-through |

---

## Section 3: Design Overview of the Product

### Workflow

1. **Entry Point:** The user opens the application home page (`/`). If they are not authenticated, they see a welcome screen with a "Login with Spotify" link.

2. **Authentication:** The user clicks the login link, which sends them to Spotify's authorization server. After granting permission, Spotify redirects the user back to the application's callback URL (`/auth/callback`) with a short-lived authorization code.

3. **Token Exchange:** The server exchanges the authorization code for an access token and refresh token. The user's Spotify profile is fetched immediately and stored in the server-side session alongside the tokens.

4. **Dashboard:** The user lands on the dashboard (`/dashboard`), which displays their Spotify profile information and provides navigation links to all data views.

5. **Data Views:** The user navigates to any of the data pages:
   - Top Tracks — submits a form with time range and limit; sees a ranked track list
   - Top Artists — submits a form with time range, limit, offset; sees a ranked artist list
   - Saved Tracks — submits a form with limit; sees their library tracks
   - Recently Played — submits a form with limit; sees timestamped play history

6. **Soundcharts Lookup:** On any track listing page, the user clicks "Get Soundcharts Data" next to a song. A client-side Fetch request hits the internal `/api/soundcharts/song/:spotifyId` endpoint, which in turn calls the Soundcharts API. The response is rendered inline.

7. **Logout:** The user clicks "Logout," the session is destroyed, and they are returned to the home page.

---

### Resources

**Spotify Web API** (`https://api.spotify.com/v1`)
Used for all music data: user profile, top tracks, top artists, saved library tracks, and recently played history. Authentication with Spotify uses the Authorization Code Flow to obtain user-scoped access tokens.

**Soundcharts API** (`https://customer.api.soundcharts.com/api/v2.25`)
Used to fetch supplemental chart metadata for individual songs by Spotify track ID. Calls are proxied through the Express backend so that API credentials are never exposed to the browser.

**Express.js**
Handles routing, middleware, session management, and server-side rendering. All page rendering is done server-side using Pug templates. The backend also acts as a proxy layer between the browser and third-party APIs.

**express-session**
Manages authenticated sessions using HTTP-only, SameSite=lax cookies. The session stores the Spotify access token, refresh token, token expiration time, and the user's Spotify profile object. Sessions expire after 24 hours.

**Pug (Template Engine)**
All HTML views are written as Pug templates. A shared `layout.pug` provides the global header and navigation, and each page extends it with its own content block.

**Axios**
Used in the service layer (`spotifyApiService.js`, `soundchartsService.js`) to make HTTP requests to external APIs with proper authentication headers.

**Architecture Tiers:** This is a two-tier client/server application. The browser (client) makes requests to the Express server. The Express server handles authentication, session state, and acts as a gateway to both the Spotify Web API and the Soundcharts API. There is no separate database tier — all state is session-resident.

---

### Data at Rest

This application does not use a persistent database. No user data is written to disk or stored beyond the lifetime of a session.

All application state lives in **server-side sessions** managed by `express-session`. Each session stores:
- `accessToken` — Spotify OAuth access token (short-lived)
- `refreshToken` — Spotify OAuth refresh token (used to renew the access token)
- `expiresAt` — Unix timestamp of when the access token expires
- `spotifyProfile` — Object containing display name, email, country, Spotify ID, product type, and profile image URL
- `authenticated` — Boolean flag used by route middleware to gate protected pages

Sessions are stored in memory (Node.js process memory) by default, which means they do not survive server restarts. This is acceptable for a development and demonstration context.

---

### Data on the Wire

All communication between the browser and the Express server happens over HTTP (localhost during development, HTTPS in a production deployment). All communication between the Express server and Spotify or Soundcharts APIs happens over HTTPS.

**Browser → Express Server:**
- Standard HTML form submissions (GET requests with query string parameters) for data view pages
- Fetch API calls (JSON over XHR) for the Soundcharts inline lookup

**Express Server → Spotify Web API:**
- Bearer token authentication via `Authorization: Bearer <accessToken>` header
- GET requests to endpoints under `https://api.spotify.com/v1/me/...`
- Responses are JSON; the server parses and passes relevant fields to the Pug template

**Express Server → Soundcharts API:**
- API key authentication via `x-app-id` and `x-api-key` headers
- GET requests to `https://customer.api.soundcharts.com/api/v2.25/song/by-platform/spotify/:spotifyId`
- Response JSON is forwarded directly to the browser as the API response

**Session Cookie:**
- HTTP-only cookie named `connect.sid`
- SameSite=lax, Secure=true in production
- Max age: 24 hours

---

### Data State

```
[User Opens App]
        |
        v
   Not Authenticated?
   YES → [Home Page / Login CTA]
        |
        v
   [User Clicks Login]
        |
        v
   [Spotify Authorization Page]
        |
        v
   [User Grants Permission]
        |
        v
   [/auth/callback receives code]
        |
        v
   [Exchange code for tokens]
        |
        v
   [Fetch Spotify /me profile]
        |
        v
   [Store tokens + profile in session]
        |
        v
   [Redirect to /dashboard]
        |
        +---------+----------+----------------+
        |         |          |                |
        v         v          v                v
  [Top Tracks] [Top Artists] [Saved Tracks] [Recently Played]
        |         |          |                |
        v         v          v                v
  [Form Submit with query params]
        |
        v
  [Server validates session + token]
        |
        v
  [spotifyApiService.js calls Spotify API]
        |
        v
  [Pug template renders response]
        |
        v
  [User sees data]
        |
        v (optional)
  [User clicks Soundcharts button]
        |
        v
  [Fetch /api/soundcharts/song/:id]
        |
        v
  [soundchartsService.js calls Soundcharts API]
        |
        v
  [JSON response rendered inline]
        |
        v
  [User Logs Out → Session Destroyed → Home Page]
```

---

### HMI/HCI/GUI

The application uses a minimal, functional web interface with a consistent layout across all pages.

**Global Layout (all pages):**
```
+----------------------------------------------------------+
|  Spotify Discovery                         [Logout]      |
+----------------------------------------------------------+
|  [Dashboard] [Top Tracks] [Top Artists]                  |
|  [Saved Tracks] [Recently Played]                        |
+----------------------------------------------------------+
|                                                          |
|                   [Page Content]                         |
|                                                          |
+----------------------------------------------------------+
```

**Home Page (`/`):**
```
+----------------------------------------------------------+
|  Welcome to Spotify Discovery                            |
|                                                          |
|  Explore your Spotify listening history.                 |
|                                                          |
|  [Login with Spotify]                                    |
+----------------------------------------------------------+
```

**Dashboard (`/dashboard`):**
```
+----------------------------------------------------------+
|  Welcome, [Display Name]                                 |
|                                                          |
|  Email:    [user@email.com]                              |
|  Country:  [US]                                          |
|  Plan:     [premium]                                     |
|  Spotify ID: [spotify_user_id]                           |
|                                                          |
|  Explore your music:                                     |
|  [Top Tracks] [Top Artists] [Saved Tracks]               |
|  [Recently Played]                                       |
+----------------------------------------------------------+
```

**Top Tracks Page (`/test-api`):**
```
+----------------------------------------------------------+
|  Your Top Tracks                                         |
|                                                          |
|  Time Range: [short_term v]   Limit: [20]  [Submit]      |
|                                                          |
|  1. Track Name — Artist, Artist           Pop: 87        |
|     Album: Album Name                                    |
|     [Get Soundcharts Data]                               |
|     → { uuid: "...", name: "...", ... }  (inline result) |
|                                                          |
|  2. Track Name — Artist                   Pop: 72        |
|     ...                                                  |
|                                                          |
|  [View Full JSON Response ▾]                             |
+----------------------------------------------------------+
```

**Top Artists Page (`/test-top-artists`):**
```
+----------------------------------------------------------+
|  Your Top Artists                                        |
|                                                          |
|  Time Range: [medium_term v]  Limit: [10]  Offset: [0]   |
|  [Submit]                                                |
|                                                          |
|  [Artist Image]  Artist Name                             |
|  Genres: indie pop, folk                                 |
|  Popularity: 74    Followers: 1,204,893                  |
|                                                          |
|  [Artist Image]  Artist Name                             |
|  ...                                                     |
+----------------------------------------------------------+
```

---

### Pictures / Diagrams

*The wireframes above represent the intended interface layout. Actual screenshots of the running application will be included in the final project submission and demonstration.*

---

## Section 4: Verification

### Demo

The demonstration will be conducted live using a personal Spotify account with an established listening history. The following steps will be performed in order:

1. Open the application home page in a browser. Show that navigating to `/dashboard` without logging in returns an authentication error.
2. Click "Login with Spotify." Walk through the Spotify authorization page. Show that after granting permission, the browser redirects to the dashboard displaying real profile information (name, email, country, plan).
3. Navigate to Top Tracks. Select "Last 4 Weeks" time range with a limit of 10. Show the rendered track list. Change to "All Time" and re-submit. Show that the list changes.
4. Navigate to Top Artists. Select "Last 6 Months" with a limit of 5 and offset of 0. Show the artist list. Change offset to 5 and re-submit. Show that the list shifts to the next page.
5. Navigate to Saved Tracks. Set limit to 20. Show the rendered track list matches songs liked in the Spotify app.
6. Navigate to Recently Played. Set limit to 10. Show tracks with played-at timestamps in descending chronological order.
7. On any track listing page, click "Get Soundcharts Data" next to one track. Show the inline JSON response appear without a page reload.
8. Click Logout. Show the session is cleared and the user is returned to the home page.

---

### Testing

**Requirement 1 — Spotify OAuth Authentication**
- *How verified:* Navigate to `/dashboard` without logging in; confirm an error or redirect to login occurs. Complete the full OAuth flow; confirm the dashboard displays the user's actual Spotify profile data (name, email). Check browser DevTools to confirm the session cookie is HTTP-only.
- *Pass:* Dashboard shows correct profile info post-login; unauthenticated access to `/dashboard` is blocked.
- *Fail:* User can access dashboard without login, or profile data is missing/incorrect after login.

**Requirement 2 — Display User Top Tracks**
- *How verified:* On the Top Tracks page, submit with `time_range=short_term&limit=10`. Confirm 10 tracks are shown. Change to `time_range=long_term` and resubmit. Confirm the ranked list is different (long-term favorites differ from recent plays). Verify each row shows: track name, artist(s), album, popularity score.
- *Pass:* Correct number of tracks shown; time range changes produce different results; all four data fields present per track.
- *Fail:* Same results regardless of time range, incorrect track count, or missing data fields.

**Requirement 3 — Display User Top Artists**
- *How verified:* Submit with `time_range=medium_term&limit=5&offset=0`. Confirm 5 artists displayed with image, genres, popularity, and follower count. Change offset to 5; confirm a different set of 5 artists appears (pagination works).
- *Pass:* Correct number of artists; offset shifts results; all data fields present.
- *Fail:* Offset has no effect, wrong count, or missing fields.

**Requirement 4 — Display Saved Library Tracks**
- *How verified:* Submit with `limit=20`. Open the Spotify app on the same account, navigate to "Liked Songs." Confirm the first track in the Spotify app matches the first track on the application page.
- *Pass:* Track list matches Spotify's Liked Songs in order and content.
- *Fail:* Tracks are missing, out of order, or do not match the user's actual library.

**Requirement 5 — Display Recently Played Tracks**
- *How verified:* Play two or three songs in Spotify. Wait 30 seconds, then submit the Recently Played page with `limit=5`. Confirm the songs just played appear at the top of the list with the correct played-at timestamp (within a minute of when they were played).
- *Pass:* Recently played songs appear at the top with accurate timestamps.
- *Fail:* Songs do not appear, timestamps are wrong, or the list is not in chronological order.

**Requirement 6 — Soundcharts Song Metadata Lookup**
- *How verified:* On the Top Tracks page, click "Get Soundcharts Data" for one track. Confirm the button shows a loading state, then the page updates inline (no full reload) with a JSON object. The JSON must contain a Soundcharts UUID for the song. Click the button for a second track; confirm a different UUID appears.
- *Pass:* JSON response appears inline without page reload; each song produces a distinct UUID.
- *Fail:* Page reloads on click, no data appears, or all tracks return the same result.

**Stretch Requirement 1 — Automatic Token Refresh**
- *How verified:* After login, artificially set `expiresAt` in the session to a time in the past (or wait for the 1-hour token window to lapse). Navigate to any data page. Confirm data loads successfully (not an authentication error), indicating the refresh token was used automatically.
- *Pass:* Data loads without re-login after token expiration.
- *Fail:* User receives an authentication error or is redirected to login.

**Stretch Requirement 2 — Followed Artists Display**
- *How verified:* Navigate to the Followed Artists page. Open the Spotify app, navigate to "Following." Confirm the first several artists match between both views.
- *Pass:* Artist list matches Spotify's Following list.
- *Fail:* Page does not exist, or artists shown do not match the user's actual followed artists.

**Stretch Requirement 3 — Spotify Playlist Browser**
- *How verified:* Navigate to the Playlists page. Confirm playlists are listed with name, track count, and owner. Cross-reference at least three playlists against the Spotify app.
- *Pass:* Playlists match the user's Spotify library; name, track count, and owner shown correctly.
- *Fail:* Page does not exist, playlists are missing, or data fields are incorrect.

**Stretch Requirement 4 — Music Recommendations**
- *How verified:* Navigate to the Recommendations page. Confirm at least 5 and up to 20 tracks are shown, each with a name, artist, and Spotify link. Refresh the page; confirm the list is either the same (deterministic seeding) or reasonably different. Verify none of the tracks are obviously impossible recommendations (e.g., identical to the seed tracks themselves).
- *Pass:* Recommendations page loads with 5–20 tracks; each has name, artist, and a functional Spotify link.
- *Fail:* Page does not exist, fewer than 5 tracks shown, or tracks are missing required data fields.

---

## Sources / Citations / Resources Links

- Spotify Web API Documentation — https://developer.spotify.com/documentation/web-api
- Spotify Authorization Guide (OAuth 2.0 Authorization Code Flow) — https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- Spotify API Endpoint Reference — https://developer.spotify.com/documentation/web-api/reference
- Soundcharts API Documentation — https://customer.api.soundcharts.com/api/v2.25/docs
- Express.js Documentation — https://expressjs.com/
- Express Session Middleware — https://www.npmjs.com/package/express-session
- Pug Template Engine Documentation — https://pugjs.org/api/getting-started.html
- Axios HTTP Client — https://axios-http.com/docs/intro
- dotenv — https://www.npmjs.com/package/dotenv
- Node.js Documentation — https://nodejs.org/en/docs
- MDN Web Docs: Fetch API — https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- MDN Web Docs: HTTP Cookies — https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
- OWASP Session Management Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
