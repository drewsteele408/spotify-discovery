const crypto = require('crypto');
const express = require('express');
const axios = require('axios');

const router = express.Router();

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const PROFILE_URL = 'https://api.spotify.com/v1/me';

const createOAuthState = () => crypto.randomBytes(16).toString('hex');

const getScopes = () =>
	(process.env.SPOTIFY_SCOPES).trim();

const buildAuthorizeUrl = ({ state }) => {
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: process.env.SPOTIFY_CLIENT_ID || '',
		redirect_uri: process.env.SPOTIFY_REDIRECT_URI || '',
		scope: getScopes(),
		state,
	});

	return `${AUTHORIZE_URL}?${params.toString()}`;
};

const exchangeCodeForTokens = async (code) => {
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: process.env.SPOTIFY_REDIRECT_URI || '',
	});

	const basicAuth = Buffer.from(
		`${process.env.SPOTIFY_CLIENT_ID || ''}:${process.env.SPOTIFY_CLIENT_SECRET || ''}`
	).toString('base64');

	const response = await axios.post(TOKEN_URL, body.toString(), {
		headers: {
			Authorization: `Basic ${basicAuth}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	return response.data;
};

const fetchSpotifyProfile = async (accessToken) => {
	const response = await axios.get(PROFILE_URL, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	return response.data;
};

const clearAuthSession = (session) => {
	if (!session) {
		return;
	}

	delete session.authenticated;
	delete session.accessToken;
	delete session.refreshToken;
	delete session.expiresAt;
	delete session.oauthState;
	delete session.spotifyProfile;
	delete session.tokenType;
	delete session.scopes;
};

const renderAuthError = (res, statusCode, message, error = null) => {
	res.status(statusCode).render('error', {
		title: 'Spotify Authentication Error',
		message,
		statusCode,
		error: process.env.NODE_ENV === 'development' ? error : null,
	});
};

router.get('/login', (req, res) => {
	if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REDIRECT_URI) {
		return renderAuthError(
			res,
			500,
			'Spotify authentication is not configured correctly. Check your environment variables.'
		);
	}

	const state = createOAuthState();

	req.session.oauthState = state;

	return res.redirect(buildAuthorizeUrl({ state }));
});

router.get('/callback', async (req, res) => {
	const { code, state, error } = req.query;
	const storedState = req.session?.oauthState;

	if (error) {
		return renderAuthError(res, 400, `Spotify returned an authorization error: ${error}`);
	}

	if (!code) {
		return renderAuthError(res, 400, 'Spotify did not return an authorization code.');
	}

	if (!state || !storedState || state !== storedState) {
		return renderAuthError(res, 400, 'The Spotify OAuth state validation failed. Please try logging in again.');
	}

	try {
		const tokenData = await exchangeCodeForTokens(code);
		const expiresInSeconds = Number(tokenData.expires_in || 0);

		req.session.authenticated = true;
		req.session.accessToken = tokenData.access_token;
		req.session.refreshToken = tokenData.refresh_token || null;
		req.session.expiresAt = Date.now() + expiresInSeconds * 1000;
		req.session.tokenType = tokenData.token_type || 'Bearer';
		req.session.scopes = tokenData.scope || getScopes();
		delete req.session.oauthState;

		try {
			const spotifyProfile = await fetchSpotifyProfile(tokenData.access_token);
			req.session.spotifyProfile = {
				id: spotifyProfile.id,
				display_name: spotifyProfile.display_name,
				email: spotifyProfile.email,
				country: spotifyProfile.country,
				product: spotifyProfile.product,
				external_urls: spotifyProfile.external_urls,
				images: spotifyProfile.images,
			};
		} catch (profileError) {
			req.session.spotifyProfile = null;

			if (process.env.NODE_ENV === 'development') {
				console.warn('Unable to fetch Spotify profile after login.', profileError.message);
			}
		}

		return res.redirect('/dashboard');
	} catch (exchangeError) {
		clearAuthSession(req.session);

		const spotifyMessage = exchangeError.response?.data?.error_description || exchangeError.response?.data?.error;

		return renderAuthError(
			res,
			exchangeError.response?.status || 500,
			spotifyMessage || 'Failed to exchange the Spotify authorization code for tokens.',
			exchangeError
		);
	}
});

const handleLogout = (req, res) => {
	if (!req.session) {
		return res.redirect('/');
	}

	clearAuthSession(req.session);

	return req.session.destroy((error) => {
		if (error) {
			return renderAuthError(res, 500, 'Unable to log out and clear the session.', error);
		}

		res.clearCookie('connect.sid');
		return res.redirect('/');
	});
};

router.get('/logout', handleLogout);
router.post('/logout', handleLogout);

module.exports = router;
