'use strict';

const express = require('express');
const path = require('path');
const app = express();

const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const jsonParser = bodyParser.json();
const winston = require('winston');
const {createLogger, format, transports} = winston;
const {combine, timestamp, prettyPrint} = format;

module.exports = (db) => {
  const logger = createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: {service: 'backend-coding-test'},
    transports: [
      //
      // - Write all logs with level `error` and below to `error.log`
      // - Write all logs with level `info` and below to `combined.log`
      //
      new transports.File({
        filename: path.resolve(__dirname, '..', 'error.log'), level: 'error',
      }),
      new transports.File({
        filename: path.resolve(__dirname, '..', 'combined.log'),
      }),
      new transports.Console({
        format: combine(
            timestamp(),
            prettyPrint(),
        ),
      }),
    ],
  });

  app.use((req, res, next) => {
    req.logger = logger;

    next();
  });

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods',
        'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  const swaggerDocument =
    YAML.load(path.resolve(__dirname, '..', 'tools/documentation.yaml'));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.get('/health', (req, res) => res.status(200).send('Healthy'));

  app.post('/rides', jsonParser, (req, res) => {
    const startLatitude = Number(req.body.start_lat);
    const startLongitude = Number(req.body.start_long);
    const endLatitude = Number(req.body.end_lat);
    const endLongitude = Number(req.body.end_long);
    const riderName = req.body.rider_name;
    const driverName = req.body.driver_name;
    const driverVehicle = req.body.driver_vehicle;
    if (startLatitude < -90 ||
        startLatitude > 90 || startLongitude < -180 || startLongitude > 180) {
      return res.status(400).send({
        error_code: 'VALIDATION_ERROR',
        message: `Start latitude and longitude must
         be between -90 - 90 and -180 to 180 degrees respectively`,
      });
    }

    if (endLatitude < -90 ||
        endLatitude > 90 || endLongitude < -180 || endLongitude > 180) {
      return res.status(400).send({
        error_code: 'VALIDATION_ERROR',
        message: `End latitude and longitude must 
          be between -90 - 90 and -180 to 180 degrees respectively`,
      });
    }

    if (typeof riderName !== 'string' || riderName.length < 1) {
      return res.status(400).send({
        error_code: 'VALIDATION_ERROR',
        message: 'Rider name must be a non empty string',
      });
    }

    if (typeof driverName !== 'string' || driverName.length < 1) {
      return res.status(400).send({
        error_code: 'VALIDATION_ERROR',
        message: 'Driver name must be a non empty string',
      });
    }

    if (typeof driverVehicle !== 'string' || driverVehicle.length < 1) {
      return res.status(400).send({
        error_code: 'VALIDATION_ERROR',
        message: 'Driver vehicle must be a non empty string',
      });
    }

    const values = [
      req.body.start_lat,
      req.body.start_long,
      req.body.end_lat,
      req.body.end_long,
      req.body.rider_name,
      req.body.driver_name,
      req.body.driver_vehicle,
    ];

    db.run(
        `INSERT INTO Rides(startLat, startLong,
          endLat, endLong, riderName, driverName,
          driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        values, function(err) {
          if (err) {
            return res.status(500).send({
              error_code: 'SERVER_ERROR',
              message: 'Unknown error',
            });
          }

          db.all('SELECT * FROM Rides WHERE rideID = ?',
              // eslint-disable-next-line no-invalid-this
              this.lastID, function(err, rows) {
                if (err) {
                  return res.status(500).send({
                    error_code: 'SERVER_ERROR',
                    message: 'Unknown error',
                  });
                }

                res.send(rows);
              });
        });
  });

  app.get('/rides', (req, res) => {
    let {
      page = 1,
      limit = 10,
    } = req.query;
    if (page < 1) {
      page = 1;
    }
    const offset = limit * (page - 1);
    const queryString = `SELECT * FROM Rides LIMIT ${limit} 
      OFFSET ${offset}`;
    db.all(queryString, function(err, rows) {
      if (err) {
        req.logger.error(err);
        return res.status(500).send({
          error_code: 'SERVER_ERROR',
          message: 'Unknown error',
        });
      }

      req.logger.info({
        rows: rows.length,
        endpoint: 'GET /rides',
      });

      if (rows.length === 0) {
        return res.send({
          error_code: 'RIDES_NOT_FOUND_ERROR',
          message: 'Could not find any rides',
        });
      }

      res.send(rows);
    });
  });

  app.get('/rides/:id', (req, res) => {
    db.all(`SELECT * FROM Rides WHERE rideID='${req.params.id}'`,
        function(err, rows) {
          if (err) {
            return res.status(500).send({
              error_code: 'SERVER_ERROR',
              message: 'Unknown error',
            });
          }

          if (rows.length === 0) {
            return res.send({
              error_code: 'RIDES_NOT_FOUND_ERROR',
              message: 'Could not find any rides',
            });
          }

          res.send(rows);
        });
  });

  return app;
};
