const express = require('express');

const router = express.Router();

const loadedRequireAuth = require('../middleware/requireAuth');
const requireAuth =
	typeof loadedRequireAuth === 'function'
		? loadedRequireAuth
		: (req, res, next) => next();

const { getSongBySpotifyId } = require('../services/soundchartsService');

// Requires SOUNDCHARTS_APP_ID and SOUNDCHARTS_API_KEY in .env
router.get('/api/soundcharts/song/:spotifyId', requireAuth, async (req, res) => {
	try {
		const data = await getSongBySpotifyId({ spotifyId: req.params.spotifyId });
		return res.json(data);
	} catch (error) {
		const errorMessage =
			error.response?.data?.error?.message ||
			error.response?.data?.message ||
			error.message ||
			'Failed to fetch Soundcharts data.';

		return res.status(error.response?.status || 500).json({ error: errorMessage });
	}
});

module.exports = router;
