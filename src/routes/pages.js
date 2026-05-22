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
const {
	getCurrentUserTopTracks,
	getCurrentUserTopArtists,
} = require('../services/spotifyApiService');

const VALID_TIME_RANGES = ['short_term', 'medium_term', 'long_term'];

const buildViewModel = (req, title, extras = {}) => ({
	title,
	isAuthenticated: Boolean(req.session?.authenticated),
	spotifyProfile: req.session?.spotifyProfile || null,
	hasAccessToken: Boolean(req.session?.accessToken),
	hasRefreshToken: Boolean(req.session?.refreshToken),
	expiresAt: req.session?.expiresAt || null,
	...extras,
});

router.get('/', (req, res) => {
	res.render('index', buildViewModel(req, 'Home'));
});

router.get('/dashboard', (req, res) => {
	res.render(
		'auth-success',
		buildViewModel(req, 'Dashboard', {
			authenticated: Boolean(req.session?.authenticated),
		})
	);
});

router.get('/test-api', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedTimeRange = typeof req.query.time_range === 'string' ? req.query.time_range : '';
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const query = {};

	if (requestedTimeRange) {
		if (!VALID_TIME_RANGES.includes(requestedTimeRange)) {
			return res.status(400).render(
				'test-api',
				buildViewModel(req, 'Spotify API Test', {
					testApiReady: Boolean(req.session?.accessToken),
					apiData: null,
					topTracks: [],
					apiError:
						'Invalid time_range value. Choose short_term, medium_term, or long_term.',
					selectedTimeRange: requestedTimeRange,
					selectedLimit: requestedLimit,
				})
			);
		}

		query.time_range = requestedTimeRange;
	}

	if (requestedLimit) {
		const parsedLimit = Number(requestedLimit);

		if (
			!Number.isInteger(parsedLimit) ||
			parsedLimit < 1 ||
			parsedLimit > 50
		) {
			return res.status(400).render(
				'test-api',
				buildViewModel(req, 'Spotify API Test', {
					testApiReady: Boolean(req.session?.accessToken),
					apiData: null,
					topTracks: [],
					apiError: 'Invalid limit value. Enter an integer between 1 and 50.',
					selectedTimeRange: requestedTimeRange,
					selectedLimit: requestedLimit,
				})
			);
		}

		query.limit = parsedLimit;
	}

	try {
		const apiData = await getCurrentUserTopTracks({
			accessToken: req.session?.accessToken,
			query,
		});
		const tracks = Array.isArray(apiData?.items) ? apiData.items : [];
		const topTracks = tracks.map((track) => ({
			name: track.name,
			artists: Array.isArray(track.artists)
				? track.artists.map((artist) => artist.name).join(', ')
				: 'Not available',
			album: track.album?.name || 'Not available',
			popularity: typeof track.popularity === 'number' ? track.popularity : 'Not available',
			spotifyUrl: track.external_urls?.spotify || null,
		}));

		return res.render(
			'test-api',
			buildViewModel(req, 'Spotify API Test', {
				testApiReady: Boolean(req.session?.accessToken),
				apiData,
				topTracks,
				apiError: null,
				selectedTimeRange: requestedTimeRange,
				selectedLimit: requestedLimit,
			})
		);
	} catch (error) {
		const errorMessage =
			error.response?.data?.error?.message ||
			error.response?.data?.error_description ||
			error.message ||
			'Unable to retrieve Spotify top tracks.';

		return res.status(error.response?.status || 500).render(
			'test-api',
			buildViewModel(req, 'Spotify API Test', {
				testApiReady: Boolean(req.session?.accessToken),
				apiData: null,
				topTracks: [],
				apiError: errorMessage,
				selectedTimeRange: requestedTimeRange,
				selectedLimit: requestedLimit,
			})
		);
	}
});

// Requires scope: user-top-read
router.get('/test-top-artists', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedTimeRange = typeof req.query.time_range === 'string' ? req.query.time_range : '';
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const requestedOffset = typeof req.query.offset === 'string' ? req.query.offset.trim() : '';
	const query = {};

	if (requestedTimeRange) {
		if (!VALID_TIME_RANGES.includes(requestedTimeRange)) {
			return res.status(400).render(
				'test-top-artists',
				buildViewModel(req, 'Top Artists Test', {
					apiData: null,
					topArtists: [],
					artistError: 'Invalid time_range value. Choose short_term, medium_term, or long_term.',
					selectedTimeRange: requestedTimeRange,
					selectedLimit: requestedLimit,
					selectedOffset: requestedOffset,
				})
			);
		}

		query.time_range = requestedTimeRange;
	}

	if (requestedLimit) {
		const parsedLimit = Number(requestedLimit);

		if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
			return res.status(400).render(
				'test-top-artists',
				buildViewModel(req, 'Top Artists Test', {
					apiData: null,
					topArtists: [],
					artistError: 'Invalid limit value. Enter an integer between 1 and 50.',
					selectedTimeRange: requestedTimeRange,
					selectedLimit: requestedLimit,
					selectedOffset: requestedOffset,
				})
			);
		}

		query.limit = parsedLimit;
	}

	if (requestedOffset) {
		const parsedOffset = Number(requestedOffset);

		if (!Number.isInteger(parsedOffset) || parsedOffset < 0 || parsedOffset > 49) {
			return res.status(400).render(
				'test-top-artists',
				buildViewModel(req, 'Top Artists Test', {
					apiData: null,
					topArtists: [],
					artistError: 'Invalid offset value. Enter an integer between 0 and 49.',
					selectedTimeRange: requestedTimeRange,
					selectedLimit: requestedLimit,
					selectedOffset: requestedOffset,
				})
			);
		}

		query.offset = parsedOffset;
	}

	try {
		const apiData = await getCurrentUserTopArtists({
			accessToken: req.session?.accessToken,
			query,
		});
		const artists = Array.isArray(apiData?.items) ? apiData.items : [];
		const topArtists = artists.map((artist) => ({
			name: artist.name,
			genres: Array.isArray(artist.genres) && artist.genres.length
				? artist.genres.join(', ')
				: 'Not available',
			popularity: typeof artist.popularity === 'number' ? artist.popularity : 'Not available',
			followerCount: typeof artist.followers?.total === 'number'
				? artist.followers.total.toLocaleString()
				: 'Not available',
			imageUrl: Array.isArray(artist.images) && artist.images[0]
				? artist.images[0].url
				: null,
			spotifyUrl: artist.external_urls?.spotify || null,
		}));

		return res.render(
			'test-top-artists',
			buildViewModel(req, 'Top Artists Test', {
				apiData,
				topArtists,
				artistError: null,
				selectedTimeRange: requestedTimeRange,
				selectedLimit: requestedLimit,
				selectedOffset: requestedOffset,
			})
		);
	} catch (error) {
		const errorMessage =
			error.response?.data?.error?.message ||
			error.response?.data?.error_description ||
			error.message ||
			'Unable to retrieve Spotify top artists.';

		return res.status(error.response?.status || 500).render(
			'test-top-artists',
			buildViewModel(req, 'Top Artists Test', {
				apiData: null,
				topArtists: [],
				artistError: errorMessage,
				selectedTimeRange: requestedTimeRange,
				selectedLimit: requestedLimit,
				selectedOffset: requestedOffset,
			})
		);
	}
});

module.exports = router;
