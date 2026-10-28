const app = require('./app');
const { redisClient } = require('./config/redisClient');
const {validateEnv} = require('./config/env');

const port = Number(process.env.PORT) || 3000;

async function start() {
	validateEnv();

	await redisClient.connect();
	console.log('Connected to Redis');

	app.listen(port, () => {
	console.log(`Server listening at http://127.0.0.1:${port}`);
	});	
}

start().catch((err) => {
	console.error('Failed to start server:', err);
	process.exit(1);
});