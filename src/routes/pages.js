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
	getUserSavedTracks,
	getRecentlyPlayedTracks,
	getFollowedArtists,
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

// The routes below rendered Pug templates (views/*.pug) used only to manually exercise the
// Spotify API integration during backend development. The Angular app in client/ is now the
// real frontend for all of these pages, backed by the equivalent JSON routes in src/routes/api.js
// (/api/top-tracks, /api/top-artists, /api/saved-tracks, /api/recently-played,
// /api/followed-artists, /api/session). Commented out rather than deleted, per project
// convention — the .pug view files themselves are left in place, untouched.

/*
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
			id: track.id || null,
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

// Requires scope: user-library-read
router.get('/test-saved-tracks', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const query = {};

	if (requestedLimit) {
		const parsedLimit = Number(requestedLimit);

		if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
			return res.status(400).render(
				'test-saved-tracks',
				buildViewModel(req, 'Saved Tracks Test', {
					testApiReady: Boolean(req.session?.accessToken),
					apiData: null,
					topTracks: [],
					apiError: 'Invalid limit value. Enter an integer between 1 and 50.',
					selectedLimit: requestedLimit,
				})
			);
		}

		query.limit = parsedLimit;
	}

	try {
		const apiData = await getUserSavedTracks({
			accessToken: req.session?.accessToken,
			query,
		});
		const items = Array.isArray(apiData?.items) ? apiData.items : [];
		const topTracks = items.map(({ track }) => ({
			id: track?.id || null,
			name: track?.name || 'Not available',
			artists: Array.isArray(track?.artists)
				? track.artists.map((artist) => artist.name).join(', ')
				: 'Not available',
			album: track?.album?.name || 'Not available',
			popularity: typeof track?.popularity === 'number' ? track.popularity : 'Not available',
			spotifyUrl: track?.external_urls?.spotify || null,
		}));

		return res.render(
			'test-saved-tracks',
			buildViewModel(req, 'Saved Tracks Test', {
				testApiReady: Boolean(req.session?.accessToken),
				apiData,
				topTracks,
				apiError: null,
				selectedLimit: requestedLimit,
			})
		);
	} catch (error) {
		const errorMessage =
			error.response?.data?.error?.message ||
			error.response?.data?.error_description ||
			error.message ||
			'Unable to retrieve Spotify saved tracks.';

		return res.status(error.response?.status || 500).render(
			'test-saved-tracks',
			buildViewModel(req, 'Saved Tracks Test', {
				testApiReady: Boolean(req.session?.accessToken),
				apiData: null,
				topTracks: [],
				apiError: errorMessage,
				selectedLimit: requestedLimit,
			})
		);
	}
});

// Requires scope: user-read-recently-played
router.get('/test-recently-played', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const query = {};

	if (requestedLimit) {
		const parsedLimit = Number(requestedLimit);

		if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
			return res.status(400).render(
				'test-recently-played',
				buildViewModel(req, 'Recently Played Test', {
					apiData: null,
					recentTracks: [],
					apiError: 'Invalid limit value. Enter an integer between 1 and 50.',
					selectedLimit: requestedLimit,
				})
			);
		}

		query.limit = parsedLimit;
	}

	try {
		const apiData = await getRecentlyPlayedTracks({
			accessToken: req.session?.accessToken,
			query,
		});
		const items = Array.isArray(apiData?.items) ? apiData.items : [];
		const recentTracks = items.map(({ track, played_at }) => ({
			id: track?.id || null,
			name: track?.name || 'Not available',
			artists: Array.isArray(track?.artists)
				? track.artists.map((artist) => artist.name).join(', ')
				: 'Not available',
			album: track?.album?.name || 'Not available',
			popularity: typeof track?.popularity === 'number' ? track.popularity : 'Not available',
			playedAt: played_at || 'Not available',
			spotifyUrl: track?.external_urls?.spotify || null,
		}));

		return res.render(
			'test-recently-played',
			buildViewModel(req, 'Recently Played Test', {
				apiData,
				recentTracks,
				apiError: null,
				selectedLimit: requestedLimit,
			})
		);
	} catch (error) {
		const errorMessage =
			error.response?.data?.error?.message ||
			error.response?.data?.error_description ||
			error.message ||
			'Unable to retrieve recently played tracks.';

		return res.status(error.response?.status || 500).render(
			'test-recently-played',
			buildViewModel(req, 'Recently Played Test', {
				apiData: null,
				recentTracks: [],
				apiError: errorMessage,
				selectedLimit: requestedLimit,
			})
		);
	}
});

// Requires scope: user-follow-read
router.get('/test-followed-artists', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const requestedAfter = typeof req.query.after === 'string' ? req.query.after.trim() : '';
	const query = {};

	if (requestedLimit) {
		const parsedLimit = Number(requestedLimit);

		if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
			return res.status(400).render(
				'test-followed-artists',
				buildViewModel(req, 'Followed Artists Test', {
					apiData: null,
					followedArtists: [],
					apiError: 'Invalid limit value. Enter an integer between 1 and 50.',
					selectedLimit: requestedLimit,
					selectedAfter: requestedAfter,
				})
			);
		}

		query.limit = parsedLimit;
	}

	if (requestedAfter) {
		query.after = requestedAfter;
	}

	try {
		const apiData = await getFollowedArtists({
			accessToken: req.session?.accessToken,
			query,
		});
		const artists = Array.isArray(apiData?.artists?.items) ? apiData.artists.items : [];
		const followedArtists = artists.map((artist) => ({
			id: artist.id || null,
			name: artist.name || 'Not available',
			genres: Array.isArray(artist.genres) && artist.genres.length
				? artist.genres.join(', ')
				: 'Not available',
			followerCount: typeof artist.followers?.total === 'number'
				? artist.followers.total.toLocaleString()
				: 'Not available',
			popularity: typeof artist.popularity === 'number' ? artist.popularity : 'Not available',
			imageUrl: Array.isArray(artist.images) && artist.images[0]
				? artist.images[0].url
				: null,
			spotifyUrl: artist.external_urls?.spotify || null,
		}));

		const nextCursor = apiData?.artists?.cursors?.after || null;

		return res.render(
			'test-followed-artists',
			buildViewModel(req, 'Followed Artists Test', {
				apiData,
				followedArtists,
				apiError: null,
				selectedLimit: requestedLimit,
				selectedAfter: requestedAfter,
				nextCursor,
			})
		);
	} catch (error) {
		const errorMessage =
			error.response?.data?.error?.message ||
			error.response?.data?.error_description ||
			error.message ||
			'Unable to retrieve followed artists.';

		return res.status(error.response?.status || 500).render(
			'test-followed-artists',
			buildViewModel(req, 'Followed Artists Test', {
				apiData: null,
				followedArtists: [],
				apiError: errorMessage,
				selectedLimit: requestedLimit,
				selectedAfter: requestedAfter,
				nextCursor: null,
			})
		);
	}
});
*/

module.exports = router;
