/**
 * Shapes mirrored from the Express session (see src/routes/auth.js `req.session.spotifyProfile`
 * and src/routes/pages.js `buildViewModel`). The backend does not yet expose a JSON
 * "whoami" endpoint — see AuthService for the thin contract this app expects once one exists.
 */

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  product: string | null;
  external_urls?: { spotify?: string };
  images?: SpotifyImage[];
}

export interface SessionStatus {
  isAuthenticated: boolean;
  spotifyProfile: SpotifyProfile | null;
}
