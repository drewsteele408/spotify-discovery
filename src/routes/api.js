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
	getUserPlaylists,
	getPlaylistTracks,
	searchTracks,
	startPlayback,
	saveTracks,
	removeSavedTracks,
	checkSavedTracks,
	addPlaylistItems,
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

const mapPlaylist = (playlist) => ({
	id: playlist?.id || null,
	name: playlist?.name || 'Not available',
	description: playlist?.description || '',
	ownerName: playlist?.owner?.display_name || 'Not available',
	tracksTotal: typeof playlist?.tracks?.total === 'number' ? playlist.tracks.total : 'Not available',
	isPublic: Boolean(playlist?.public),
	imageUrl: Array.isArray(playlist?.images) && playlist.images[0] ? playlist.images[0].url : null,
	spotifyUrl: playlist?.external_urls?.spotify || null,
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
		scopes: req.session?.scopes || null,
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

// Requires scope: playlist-read-private
router.get('/api/playlists', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const requestedLimit = typeof req.query.limit === 'string' ? req.query.limit.trim() : '';
	const requestedOffset = typeof req.query.offset === 'string' ? req.query.offset.trim() : '';
	const query = {};

	const { limit, error: limitError } = parseValidatedLimit(requestedLimit);

	if (limitError) {
		return res.status(400).json({ error: limitError });
	}

	if (limit) {
		query.limit = limit;
	}

	if (requestedOffset) {
		const parsedOffset = Number(requestedOffset);

		if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
			return res.status(400).json({ error: 'Invalid offset value. Enter an integer of 0 or greater.' });
		}

		query.offset = parsedOffset;
	}

	try {
		const apiData = await getUserPlaylists({ accessToken: req.session?.accessToken, query });
		const playlists = Array.isArray(apiData?.items) ? apiData.items : [];

		return res.json({ playlists: playlists.map(mapPlaylist) });
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to retrieve your playlists.') });
	}
});

// Requires scope: playlist-read-private. Powers the expand/collapse track list under
// each playlist row on the "Your Playlists" panel. Calls Spotify's "Get Playlist Items"
// endpoint (GET /playlists/{id}/items — renamed from /tracks in Spotify's February 2026 Web
// API migration). Its paginated track list lives under `items` and each entry's payload is
// under `item` (not `track`) — `item` still has the familiar TrackSummary-shaped fields though.
router.get('/api/playlists/:playlistId/tracks', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const playlistId = typeof req.params.playlistId === 'string' ? req.params.playlistId.trim() : '';

	if (!playlistId) {
		return res.status(400).json({ error: 'A playlist id is required.' });
	}

	try {
		const apiData = await getPlaylistTracks({ accessToken: req.session?.accessToken, playlistId, query: {} });
		const items = Array.isArray(apiData?.items) ? apiData.items : [];
		const tracks = items
			.filter((entry) => entry?.item)
			.map(({ item, added_at }) => ({
				...mapTrack(item),
				addedAt: added_at || 'Not available',
			}));

		return res.json({
			tracks,
			total: typeof apiData?.total === 'number' ? apiData.total : tracks.length,
		});
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to retrieve tracks for this playlist.') });
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

// Surfaces the session's Spotify access token to the frontend. Required by the Web
// Playback SDK, which must run entirely in the browser and calls this on init (and
// periodically thereafter) via its `getOAuthToken` callback.
router.get('/api/player/token', requireAuth, ensureSpotifyAccessToken, (req, res) => {
	return res.json({ accessToken: req.session.accessToken });
});

// Resolves a Gemini-recommended {artist, title} pair (no Spotify id) to a real Spotify
// track so it can be played. Requires no additional scope beyond the standard user token.
router.get('/api/spotify/search-track', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const artist = typeof req.query.artist === 'string' ? req.query.artist.trim() : '';
	const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';

	if (!artist || !title) {
		return res.status(400).json({ error: 'Both "artist" and "title" query params are required.' });
	}

	try {
		const searchQuery = `track:${title} artist:${artist}`;
		const apiData = await searchTracks({ accessToken: req.session?.accessToken, query: searchQuery });
		const track = apiData?.tracks?.items?.[0] || null;

		if (!track) {
			return res.json({ track: null });
		}

		return res.json({
			track: {
				id: track.id || null,
				uri: track.uri || null,
				name: track.name || title,
				artists: Array.isArray(track.artists)
					? track.artists.map((a) => a.name).join(', ')
					: artist,
				spotifyUrl: track.external_urls?.spotify || null,
			},
		});
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to search Spotify for this track.') });
	}
});

// Requires scope: user-modify-playback-state. Starts playback of a track on the Web
// Playback SDK device already connected in the browser (see SpotifyPlayerService).
router.put('/api/player/play', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const { deviceId, uri } = req.body || {};

	if (!deviceId || !uri) {
		return res.status(400).json({ error: 'Request body must include "deviceId" and "uri".' });
	}

	try {
		await startPlayback({ accessToken: req.session?.accessToken, deviceId, uris: [uri] });
		return res.status(204).send();
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to start playback on this device.') });
	}
});

// Requires scope: user-library-modify
router.put('/api/liked-songs', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];

	if (!ids.length) {
		return res.status(400).json({ error: 'Request body must include a non-empty "ids" array.' });
	}

	try {
		await saveTracks({ accessToken: req.session?.accessToken, ids });
		return res.status(204).send();
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to save this track to Liked Songs.') });
	}
});

// Requires scope: user-library-modify
router.delete('/api/liked-songs', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];

	if (!ids.length) {
		return res.status(400).json({ error: 'Request body must include a non-empty "ids" array.' });
	}

	try {
		await removeSavedTracks({ accessToken: req.session?.accessToken, ids });
		return res.status(204).send();
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to remove this track from Liked Songs.') });
	}
});

// Requires scope: user-library-read. Chunks the ids into groups of 40 (Spotify's per-call max
// for the generic GET /me/library/contains endpoint since its February 2026 Web API migration)
// and runs the chunks in parallel, so a whole rendered list of tracks can be checked with one
// request from the frontend regardless of how many tracks it has.
router.get('/api/liked-songs/contains', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const ids = typeof req.query.ids === 'string'
		? req.query.ids.split(',').map((id) => id.trim()).filter(Boolean)
		: [];

	if (!ids.length) {
		return res.status(400).json({ error: 'An "ids" query param (comma-separated) is required.' });
	}

	const CHUNK_SIZE = 40;
	const chunks = [];

	for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
		chunks.push(ids.slice(i, i + CHUNK_SIZE));
	}

	try {
		const results = await Promise.all(
			chunks.map((chunk) => checkSavedTracks({ accessToken: req.session?.accessToken, ids: chunk }))
		);
		const flags = results.flat();
		const liked = {};

		ids.forEach((id, index) => {
			liked[id] = Boolean(flags[index]);
		});

		return res.json({ liked });
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to check Liked Songs status.') });
	}
});

// Requires scope: playlist-modify-public and/or playlist-modify-private
router.post('/api/playlists/:playlistId/tracks', requireAuth, ensureSpotifyAccessToken, async (req, res) => {
	const playlistId = typeof req.params.playlistId === 'string' ? req.params.playlistId.trim() : '';
	const uri = typeof req.body?.uri === 'string' ? req.body.uri.trim() : '';

	if (!playlistId || !uri) {
		return res.status(400).json({ error: 'A playlist id (path) and "uri" (body) are required.' });
	}

	try {
		const data = await addPlaylistItems({ accessToken: req.session?.accessToken, playlistId, uris: [uri] });
		return res.status(201).json({ snapshotId: data?.snapshot_id || null });
	} catch (error) {
		return res
			.status(error.response?.status || 500)
			.json({ error: errorMessageFrom(error, 'Unable to add this track to the playlist.') });
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
