// backend/routes/ingest.js
const express = require('express');
const router = express.Router();
const ingest = require('../controllers/ingest');

// Mounted behind `protect` in server.js.
router.get('/sources', ingest.listSources);
router.post('/sources', ingest.createSource);
router.delete('/sources/:id', ingest.deleteSource);
router.post('/sources/:id/run', ingest.runSourceNow);

// GitHub portfolio importer + webhook registration
router.post('/github/import', ingest.importGithub);
router.post('/github/webhooks', ingest.registerGithubWebhooks);

module.exports = router;
