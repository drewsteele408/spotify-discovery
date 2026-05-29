const axios = require('axios');

const SOUNDCHARTS_API_BASE_URL = 'https://customer.api.soundcharts.com/api/v2.25';

const getSoundchartsHeaders = () => ({
	'x-app-id': process.env.SOUNDCHARTS_APP_ID,
	'x-api-key': process.env.SOUNDCHARTS_API_KEY,
});

const getSongBySpotifyId = async ({ spotifyId }) => {
	if (!spotifyId) {
		throw new Error('A Spotify track ID is required.');
	}

	const response = await axios.get(
		`${SOUNDCHARTS_API_BASE_URL}/song/by-platform/spotify/${spotifyId}`,
		{ headers: getSoundchartsHeaders() }
	);

	return response.data;
};

module.exports = { getSongBySpotifyId };
