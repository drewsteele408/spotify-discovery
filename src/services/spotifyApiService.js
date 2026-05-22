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

module.exports = {
	sendSpotifyApiRequest,
	getCurrentUserProfile,
	getCurrentUserTopTracks,
	getCurrentUserTopArtists,
};
