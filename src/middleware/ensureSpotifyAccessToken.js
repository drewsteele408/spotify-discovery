const ensureSpotifyAccessToken = (req, res, next) => {
	const accessToken = req.session?.accessToken;
	const expiresAt = req.session?.expiresAt;

	if (!accessToken) {
		return res.status(401).json({
			error: 'spotify-access-token-missing',
			message: 'A Spotify access token is required to access this resource.',
		});
	}

	if (expiresAt && Number(expiresAt) <= Date.now()) {
		return res.status(401).json({
			error: 'spotify-access-token-expired',
			message: 'The Spotify access token has expired. Refresh logic is not enabled yet.',
		});
	}

	return next();
};

module.exports = ensureSpotifyAccessToken;
