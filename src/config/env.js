const REQUIRED_IN_PRODUCTION = [
    'SESSION_SECRET', 
    'REDIS_URL', 
    'SPOTIFY_CLIENT_ID', 
    'SPOTIFY_CLIENT_SECRET',
    'SPOTIFY_REDIRECT_URI', 
    'SPOTIFY_SCOPES', 
    'GEMINI_API_KEY',
    'SOUNDCHARTS_APP_ID', 
    'SOUNDCHARTS_API_KEY'
];

const MIN_SESSION_LENGTH = 32;

function validateEnv() {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (process.env.SESSION_SECRET.length < MIN_SESSION_LENGTH) {
        throw new Error(`SESSION_SECRET must be at least ${MIN_SESSION_LENGTH} characters long`);
    }
}

module.exports = {validateEnv};