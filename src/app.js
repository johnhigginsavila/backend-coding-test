'use strict';

const express = require('express');
const path = require('path');
const app = express();

const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const jsonParser = bodyParser.json();
const handlers = require('./handlers');
const middlewares = require('./middleware_setup');


const swaggerDocument =
    YAML.load(path.resolve(__dirname, '..', 'tools/documentation.yaml'));
module.exports = (db) => {
  middlewares(app, db);

  app.use('/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument),
  );

  app.get('/health',
      (req, res) => res.status(200).send('Healthy'),
  );

  app.post('/rides',
      jsonParser,
      handlers.postRide.validateInput,
      ...handlers.postRide.sanitizeRequestBody,
      handlers.postRide.generateQuery,
      handlers.postRide.runQuery,
      handlers.postRide.getInsertedRide,
      handlers.postRide.respond,
  );

  app.get('/rides',
      ...handlers.getRides.sanitizeInput,
      handlers.getRides.generateQuery,
      handlers.getRides.getRides,
      handlers.getRides.respond,
  );

  app.get('/rides/:id',
      ...handlers.getRides.sanitizeInput,
      handlers.getRides.generateQueryById,
      handlers.getRides.getRides,
      handlers.getRides.respond,
  );

  return app;
};
