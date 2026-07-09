const axios = require('axios');

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

const createAuthorizationHeader = ({ accessToken }) => {
	if (!accessToken) {
		throw new Error('A Spotify access token is required.');
	}

	return `Bearer ${accessToken}`;
};

const sendSpotifyApiRequest = async ({ accessToken, method = 'GET', path, params, data }) => {
	if (!path) {
		throw new Error('A Spotify API path is required.');
	}

	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	const response = await axios({
		method,
		url: `${SPOTIFY_API_BASE_URL}${normalizedPath}`,
		headers: {
			Authorization: createAuthorizationHeader({ accessToken }),
		},
		params,
		data,
	});

	return response.data;
};

const getCurrentUserProfile = async ({ accessToken }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/me',
	});

const getCurrentUserTopTracks = async ({ accessToken, query = {} }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/me/top/tracks',
		params: query,
	});

const getCurrentUserTopArtists = async ({ accessToken, query = {} }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/me/top/artists',
		params: query,
	});

// Requires scope: user-library-read
const getUserSavedTracks = async ({ accessToken, query = {} }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/me/tracks',
		params: query,
	});

// Requires scope: user-read-recently-played
const getRecentlyPlayedTracks = async ({ accessToken, query = {} }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/me/player/recently-played',
		params: query,
	});

// Requires scope: user-follow-read
const getFollowedArtists = async ({ accessToken, query = {} }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/me/following',
		params: { type: 'artist', ...query },
	});

// Requires scope: playlist-read-private (and playlist-read-collaborative for collaborative playlists)
const getUserPlaylists = async ({ accessToken, query = {} }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/me/playlists',
		params: query,
	});

// Requires scope: playlist-read-private (and playlist-read-collaborative for collaborative playlists).
// Spotify renamed this endpoint from GET /playlists/{id}/tracks to GET /playlists/{id}/items as
// part of its February 2026 Web API migration; the old /tracks path now returns 403 Forbidden
// regardless of scope or ownership. Supports the standard limit/offset pagination params.
const getPlaylistTracks = async ({ accessToken, playlistId, query = {} }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: `/playlists/${playlistId}/items`,
		params: query,
	});

// Used to resolve a Gemini-recommended {artist, title} pair to a real Spotify track/uri.
const searchTracks = async ({ accessToken, query, limit = 1 }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/search',
		params: { q: query, type: 'track', limit },
	});

// Requires scope: user-modify-playback-state. Targets the Web Playback SDK device
// registered in the browser (device_id comes from the SDK's `ready` event).
const startPlayback = async ({ accessToken, deviceId, uris }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'PUT',
		path: '/me/player/play',
		params: { device_id: deviceId },
		data: { uris },
	});

// Spotify's February 2026 Web API migration replaced the track-specific save/remove/check
// endpoints below with generic library endpoints that take Spotify URIs (not bare ids) as a
// comma-separated query param, capped at 40 per call (down from the old 50-per-call limit).
const toTrackUris = (ids) => ids.map((id) => `spotify:track:${id}`).join(',');

// Requires scope: user-library-modify. ids: string[] (max 40 per call).
const saveTracks = async ({ accessToken, ids }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'PUT',
		path: '/me/library',
		params: { uris: toTrackUris(ids) },
	});

// Requires scope: user-library-modify. ids: string[] (max 40 per call).
const removeSavedTracks = async ({ accessToken, ids }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'DELETE',
		path: '/me/library',
		params: { uris: toTrackUris(ids) },
	});

// Requires scope: user-library-read. ids: string[] (max 40 per call).
// Returns a boolean[] in the same order as the ids passed in.
const checkSavedTracks = async ({ accessToken, ids }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'GET',
		path: '/me/library/contains',
		params: { uris: toTrackUris(ids) },
	});

// Requires scope: playlist-modify-public and/or playlist-modify-private, depending on the
// target playlist's visibility. uris: string[] of spotify:track:... uris. Spotify renamed this
// endpoint from POST /playlists/{id}/tracks to POST /playlists/{id}/items in its February 2026
// Web API migration; the old /tracks path now returns 403 Forbidden.
const addPlaylistItems = async ({ accessToken, playlistId, uris }) =>
	sendSpotifyApiRequest({
		accessToken,
		method: 'POST',
		path: `/playlists/${playlistId}/items`,
		data: { uris },
	});

module.exports = {
	sendSpotifyApiRequest,
	getCurrentUserProfile,
	getCurrentUserTopTracks,
	getCurrentUserTopArtists,
	getUserSavedTracks,
	getRecentlyPlayedTracks,
	getFollowedArtists,
	getUserPlaylists,
	getPlaylistTracks,
	searchTracks,
	startPlayback,
	saveTracks,
	removeSavedTracks,
	checkSavedTracks,
	addPlaylistItems,
};
