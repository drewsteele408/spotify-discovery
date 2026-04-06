const path = require('path');
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();

const resolveRouter = (modulePath) => {
	const loadedModule = require(modulePath);
	const router = loadedModule.default || loadedModule;

	return typeof router === 'function' ? router : express.Router();
};

const pageRoutes = resolveRouter('./routes/pages');
const authRoutes = resolveRouter('./routes/auth');

app.set('view engine', 'pug');
app.set('views', path.resolve(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
	session({
		secret: process.env.SESSION_SECRET || 'development-session-secret',
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 1000 * 60 * 60 * 24,
		},
	})
);

app.use((req, res, next) => {
	const spotifyProfile = req.session?.spotifyProfile || null;

	res.locals.appName = 'Spotify Discovery';
	res.locals.currentPath = req.path;
	res.locals.isAuthenticated = Boolean(req.session?.authenticated);
	res.locals.spotifyProfile = spotifyProfile;

	next();
});

app.use('/', pageRoutes);
app.use('/auth', authRoutes);

app.use((req, res) => {
	res.status(404).render('error', {
		title: 'Page Not Found',
		message: 'The page you requested could not be found.',
		statusCode: 404,
	});
});

app.use((err, req, res, next) => {
	const statusCode = err.status || err.statusCode || 500;

	if (process.env.NODE_ENV !== 'test') {
		console.error(err);
	}

	res.status(statusCode).render('error', {
		title: statusCode === 500 ? 'Application Error' : 'Request Error',
		message: err.message || 'Something went wrong.',
		statusCode,
		error: process.env.NODE_ENV === 'development' ? err : null,
	});
});

module.exports = app;
