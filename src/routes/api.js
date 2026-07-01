const express = require('express');

const router = express.Router();

const loadedRequireAuth = require('../middleware/requireAuth');
const requireAuth =
	typeof loadedRequireAuth === 'function'
		? loadedRequireAuth
		: (req, res, next) => next();

const { getSongBySpotifyId } = require('../services/soundchartsService');
const { getSongRecommendations } = require('../services/geminiService');

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

// Requires GEMINI_API_KEY in .env
router.post('/songs/recommendations', requireAuth, async (req, res) => {
	const { audio } = req.body;

	if (!audio || typeof audio !== 'object') {
		return res.status(400).json({ error: 'Request body must include an "audio" object.' });
	}

	try {
		const recommendations = await getSongRecommendations({ audio });
		return res.json({ recommendations });
	} catch (error) {
		const errorMessage =
			error.message ||
			'Failed to fetch Gemini recommendations.';

		return res.status(500).json({ error: errorMessage });
	}
});

module.exports = router;
