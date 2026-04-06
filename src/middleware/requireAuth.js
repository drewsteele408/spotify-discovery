const requireAuth = (req, res, next) => {
	if (req.session?.authenticated) {
		return next();
	}

	return res.status(401).json({
		error: 'login-required',
		message: 'You must be authenticated to access this resource.',
	});
};

module.exports = requireAuth;
