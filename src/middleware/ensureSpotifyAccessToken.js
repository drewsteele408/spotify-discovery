const ensureSpotifyAccessToken = (req, res, next) => {
	const accessToken = req.session?.accessToken;
	const expiresAt = req.session?.expiresAt;
	const expectsHtml = req.accepts('html') && !req.accepts('json');

	if (!accessToken) {
		if (expectsHtml) {
			return res.status(401).render('test-api', {
				title: 'Spotify API Test',
				isAuthenticated: Boolean(req.session?.authenticated),
				spotifyProfile: req.session?.spotifyProfile || null,
				hasAccessToken: false,
				hasRefreshToken: Boolean(req.session?.refreshToken),
				expiresAt: req.session?.expiresAt || null,
				testApiReady: false,
				apiData: null,
				topTracks: [],
				apiError: 'A Spotify access token is required to access this page.',
			});
		}

		return res.status(401).json({
			error: 'spotify-access-token-missing',
			message: 'A Spotify access token is required to access this resource.',
		});
	}

	if (expiresAt && Number(expiresAt) <= Date.now()) {
		if (expectsHtml) {
			return res.status(401).render('test-api', {
				title: 'Spotify API Test',
				isAuthenticated: Boolean(req.session?.authenticated),
				spotifyProfile: req.session?.spotifyProfile || null,
				hasAccessToken: true,
				hasRefreshToken: Boolean(req.session?.refreshToken),
				expiresAt,
				testApiReady: false,
				apiData: null,
				topTracks: [],
				apiError: 'The Spotify access token has expired. Refresh logic is not enabled yet.',
			});
		}

		return res.status(401).json({
			error: 'spotify-access-token-expired',
			message: 'The Spotify access token has expired. Refresh logic is not enabled yet.',
		});
	}

	return next();
};

module.exports = ensureSpotifyAccessToken;
