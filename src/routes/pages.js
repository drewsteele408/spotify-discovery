const express = require('express');

const router = express.Router();

const loadedRequireAuth = require('../middleware/requireAuth');
const requireAuth =
	typeof loadedRequireAuth === 'function'
		? loadedRequireAuth
		: (req, res, next) => next();

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

router.get('/test-api', requireAuth, (req, res) => {
	res.render(
		'test-api',
		buildViewModel(req, 'Spotify API Test', {
			testApiReady: Boolean(req.session?.accessToken),
		})
	);
});

module.exports = router;
