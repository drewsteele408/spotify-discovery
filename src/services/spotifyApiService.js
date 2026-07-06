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

module.exports = {
	sendSpotifyApiRequest,
	getCurrentUserProfile,
	getCurrentUserTopTracks,
	getCurrentUserTopArtists,
	getUserSavedTracks,
	getRecentlyPlayedTracks,
	getFollowedArtists,
	searchTracks,
	startPlayback,
};
