const axios = require('axios');

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const getRequiredEnvValue = (key) => {
	const value = process.env[key];

	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}

	return value;
};

const getScopes = () => getRequiredEnvValue('SPOTIFY_SCOPES');

const getBasicAuthHeader = () => {
	const clientId = getRequiredEnvValue('SPOTIFY_CLIENT_ID');
	const clientSecret = getRequiredEnvValue('SPOTIFY_CLIENT_SECRET');
	const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

	return `Basic ${encodedCredentials}`;
};

const buildAuthorizeUrl = ({ state }) => {
	if (!state) {
		throw new Error('A Spotify OAuth state value is required.');
	}

	const params = new URLSearchParams({
		client_id: getRequiredEnvValue('SPOTIFY_CLIENT_ID'),
		response_type: 'code',
		redirect_uri: getRequiredEnvValue('SPOTIFY_REDIRECT_URI'),
		scope: getScopes(),
		state,
	});

	return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
};

const exchangeCodeForTokens = async ({ code }) => {
	if (!code) {
		throw new Error('A Spotify authorization code is required.');
	}

	const payload = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: getRequiredEnvValue('SPOTIFY_REDIRECT_URI'),
	});

	const response = await axios.post(SPOTIFY_TOKEN_URL, payload.toString(), {
		headers: {
			Authorization: getBasicAuthHeader(),
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	return response.data;
};

const refreshAccessToken = async ({ refreshToken }) => {
	if (!refreshToken) {
		throw new Error('A Spotify refresh token is required.');
	}

	const payload = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
	});

	const response = await axios.post(SPOTIFY_TOKEN_URL, payload.toString(), {
		headers: {
			Authorization: getBasicAuthHeader(),
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	return response.data;
};

module.exports = {
	buildAuthorizeUrl,
	exchangeCodeForTokens,
	refreshAccessToken,
};
