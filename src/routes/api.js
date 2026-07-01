const express = require('express');

const router = express.Router();

const loadedRequireAuth = require('../middleware/requireAuth');
const requireAuth =
	typeof loadedRequireAuth === 'function'
		? loadedRequireAuth
		: (req, res, next) => next();
const loadedEnsureSpotifyAccessToken = require('../middleware/ensureSpotifyAccessToken');
const ensureSpotifyAccessToken =
	typeof loadedEnsureSpotifyAccessToken === 'function'
		? loadedEnsureSpotifyAccessToken
		: (req, res, next) => next();

const { getSongBySpotifyId } = require('../services/soundchartsService');
const { getSongRecommendations } = require('../services/geminiService');
const {
	getCurrentUserTopTracks,
	getCurrentUserTopArtists,
	getUserSavedTracks,
	getRecentlyPlayedTracks,
	getFollowedArtists,
} = require('../services/spotifyApiService');

// JSON mirrors of the query validation and view-model mapping already implemented in
// src/routes/pages.js for the Pug test pages. These exist so the Angular frontend (client/)
// has real data to call; the underlying service calls and validation rules are unchanged.
const VALID_TIME_RANGES = ['short_term', 'medium_term', 'long_term'];

const parseValidatedLimit = (rawLimit) => {
	if (!rawLimit) {
		return { limit: undefined };
	}

	const parsedLimit = Number(rawLimit);

	if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
		return { error: 'Invalid limit value. Enter an integer between 1 and 50.' };
	}

	return { limit: parsedLimit };
};

const mapTrack = (track) => ({
	id: track?.id || null,
	name: track?.name || 'Not available',
	artists: Array.isArray(track?.artists)
		? track.artists.map((artist) => artist.name).join(', ')
		: 'Not available',
	album: track?.album?.name || 'Not available',
	popularity: typeof track?.popularity === 'number' ? track.popularity : 'Not available',
	spotifyUrl: track?.external_urls?.spotify || null,
});

const mapArtist = (artist) => ({
	id: artist?.id || null,
	name: artist?.name || 'Not available',
	genres: Array.isArray(artist?.genres) && artist.genres.length
		? artist.genres.join(', ')
		: 'Not available',
	popularity: typeof artist?.popularity === 'number' ? artist.popularity : 'Not available',
	followerCount: typeof artist?.followers?.total === 'number'
		? artist.followers.total.toLocaleString()
		: 'Not available',
	imageUrl: Array.isArray(artist?.images) && artist.images[0] ? artist.images[0].url : null,
	spotifyUrl: artist?.external_urls?.spotify || null,
});

const errorMessageFrom = (error, fallback) =>
	error.response?.data?.error?.message ||
	error.response?.data?.error_description ||
	error.message ||
	fallback;

router.get('/api/session', (req, res) => {
	res.json({
		isAuthenticated: Boolean(req.session?.authenticated),
		spotifyProfile: req.session?.spotifyProfile || null,
	});
});

router.get('/api/top-tracks', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedTimeRange = typeof req.query.time_range === 'string' ? req.query.time_range : '';
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const query = {};

	if (requestedTimeRange) {
		if (!VALID_TIME_RANGES.includes(requestedTimeRange)) {
			return res.status(400).json({
				error: 'Invalid time_range value. Choose short_term, medium_term, or long_term.',
			});
		}

		query.time_range = requestedTimeRange;
	}

	const { limit, error: limitError } = parseValidatedLimit(requestedLimit);

	if (limitError) {
		return res.status(400).json({ error: limitError });
	}

	if (limit) {
		query.limit = limit;
	}

	try {
		const apiData = await getCurrentUserTopTracks({ accessToken: req.session?.accessToken, query });
		const tracks = Array.isArray(apiData?.items) ? apiData.items : [];

		return res.json({ tracks: tracks.map(mapTrack) });
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to retrieve Spotify top tracks.') });
	}
});

// Requires scope: user-top-read
router.get('/api/top-artists', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedTimeRange = typeof req.query.time_range === 'string' ? req.query.time_range : '';
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const requestedOffset = typeof req.query.offset === 'string' ? req.query.offset.trim() : '';
	const query = {};

	if (requestedTimeRange) {
		if (!VALID_TIME_RANGES.includes(requestedTimeRange)) {
			return res.status(400).json({
				error: 'Invalid time_range value. Choose short_term, medium_term, or long_term.',
			});
		}

		query.time_range = requestedTimeRange;
	}

	const { limit, error: limitError } = parseValidatedLimit(requestedLimit);

	if (limitError) {
		return res.status(400).json({ error: limitError });
	}

	if (limit) {
		query.limit = limit;
	}

	if (requestedOffset) {
		const parsedOffset = Number(requestedOffset);

		if (!Number.isInteger(parsedOffset) || parsedOffset < 0 || parsedOffset > 49) {
			return res.status(400).json({ error: 'Invalid offset value. Enter an integer between 0 and 49.' });
		}

		query.offset = parsedOffset;
	}

	try {
		const apiData = await getCurrentUserTopArtists({ accessToken: req.session?.accessToken, query });
		const artists = Array.isArray(apiData?.items) ? apiData.items : [];

		return res.json({ artists: artists.map(mapArtist) });
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to retrieve Spotify top artists.') });
	}
});

// Requires scope: user-library-read
router.get('/api/saved-tracks', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const query = {};

	const { limit, error: limitError } = parseValidatedLimit(requestedLimit);

	if (limitError) {
		return res.status(400).json({ error: limitError });
	}

	if (limit) {
		query.limit = limit;
	}

	try {
		const apiData = await getUserSavedTracks({ accessToken: req.session?.accessToken, query });
		const items = Array.isArray(apiData?.items) ? apiData.items : [];

		return res.json({ tracks: items.map(({ track }) => mapTrack(track)) });
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to retrieve Spotify saved tracks.') });
	}
});

// Requires scope: user-read-recently-played
router.get('/api/recently-played', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const query = {};

	const { limit, error: limitError } = parseValidatedLimit(requestedLimit);

	if (limitError) {
		return res.status(400).json({ error: limitError });
	}

	if (limit) {
		query.limit = limit;
	}

	try {
		const apiData = await getRecentlyPlayedTracks({ accessToken: req.session?.accessToken, query });
		const items = Array.isArray(apiData?.items) ? apiData.items : [];
		const tracks = items.map(({ track, played_at }) => ({
			...mapTrack(track),
			playedAt: played_at || 'Not available',
		}));

		return res.json({ tracks });
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to retrieve recently played tracks.') });
	}
});

// Requires scope: user-follow-read
router.get('/api/followed-artists', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const requestedAfter = typeof req.query.after === 'string' ? req.query.after.trim() : '';
	const query = {};

	const { limit, error: limitError } = parseValidatedLimit(requestedLimit);

	if (limitError) {
		return res.status(400).json({ error: limitError });
	}

	if (limit) {
		query.limit = limit;
	}

	if (requestedAfter) {
		query.after = requestedAfter;
	}

	try {
		const apiData = await getFollowedArtists({ accessToken: req.session?.accessToken, query });
		const artists = Array.isArray(apiData?.artists?.items) ? apiData.artists.items : [];
		const nextCursor = apiData?.artists?.cursors?.after || null;

		return res.json({ followedArtists: artists.map(mapArtist), nextCursor });
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to retrieve followed artists.') });
	}
});

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
