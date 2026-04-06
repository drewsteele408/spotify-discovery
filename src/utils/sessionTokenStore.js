const OAUTH_STATE_KEY = 'oauthState';
const SPOTIFY_PROFILE_KEY = 'spotifyProfile';

const assertSession = (session) => {
	if (!session) {
		throw new Error('A session object is required.');
	}

	return session;
};

const saveOAuthState = (session, state) => {
	const currentSession = assertSession(session);

	if (!state) {
		throw new Error('An OAuth state value is required.');
	}

	currentSession[OAUTH_STATE_KEY] = state;

	return currentSession[OAUTH_STATE_KEY];
};

const getOAuthState = (session) => {
	const currentSession = assertSession(session);

	return currentSession[OAUTH_STATE_KEY] || null;
};

const saveTokenData = (
	session,
	{ accessToken, refreshToken = null, expiresIn, spotifyProfile = null }
) => {
	const currentSession = assertSession(session);

	if (!accessToken) {
		throw new Error('An access token is required.');
	}

	if (expiresIn === undefined || expiresIn === null) {
		throw new Error('An expiresIn value is required.');
	}

	currentSession.accessToken = accessToken;
	currentSession.refreshToken = refreshToken;
	currentSession.expiresAt = Date.now() + Number(expiresIn) * 1000;
	currentSession.authenticated = true;

	if (spotifyProfile) {
		currentSession[SPOTIFY_PROFILE_KEY] = spotifyProfile;
		return currentSession;
	}

	delete currentSession[SPOTIFY_PROFILE_KEY];

	return currentSession;
};

const clearAuthSession = (session) => {
	const currentSession = assertSession(session);

	delete currentSession[OAUTH_STATE_KEY];
	delete currentSession.accessToken;
	delete currentSession.refreshToken;
	delete currentSession.expiresAt;
	delete currentSession.authenticated;
	delete currentSession.tokenType;
	delete currentSession[SPOTIFY_PROFILE_KEY];

	return currentSession;
};

module.exports = {
	saveOAuthState,
	getOAuthState,
	saveTokenData,
	clearAuthSession,
};
