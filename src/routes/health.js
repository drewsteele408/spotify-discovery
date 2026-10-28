const express = require('express');
const {redisClient} = require('../config/redisClient');

const router = express.Router();

// Liveness: the process is up and the event loop is responding 
router.get('/healthz', (req, res) => {
    res.status(200).json({status: 'ok'});
});

// Readiness: dependencies (Redis) are reachable, so the pod can take traffic
router.get('/readyz', async (req, res) => {
    if (!redisClient.isReady) {
        return res.status(503).json({status: 'unavailable', redis: 'disconnected'});
    }

    try {
        await redisClient.ping();
        res.status(200).json({status: 'ready', redis: 'ok'});
    } catch (err) {
        res.status(503).json({status: 'unavailable', redis: 'error'});
    }
});

module.exports = router;