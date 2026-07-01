/**
 * Shapes mirrored from src/routes/pages.js view-model mapping (topTracks / topArtists /
 * recentTracks / followedArtists arrays), which itself derives from raw Spotify Web API
 * responses returned by src/services/spotifyApiService.js. These are the JSON shapes the
 * still-to-be-built thin API routes should return so the Angular pages need no changes
 * beyond swapping mock data for a real HttpClient call.
 */

export interface TrackSummary {
  id: string | null;
  name: string;
  artists: string;
  album: string;
  popularity: number | string;
  spotifyUrl: string | null;
}

export interface RecentlyPlayedTrack extends TrackSummary {
  playedAt: string;
}

export interface ArtistSummary {
  id?: string | null;
  name: string;
  genres: string;
  popularity: number | string;
  followerCount: string;
  imageUrl: string | null;
  spotifyUrl: string | null;
}

export interface FollowedArtistsResult {
  followedArtists: ArtistSummary[];
  nextCursor: string | null;
}

/**
 * Shape returned by POST /songs/recommendations (src/routes/api.js), which forwards
 * whatever `audio` object it is given straight into a Gemini prompt and asks for 5
 * similar songs back. Gemini's own output shape, not derived from Spotify.
 */
export interface RecommendationItem {
  artist: string;
  title: string;
  reason: string;
}
