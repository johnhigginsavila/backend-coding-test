/* eslint-disable require-jsdoc */
const Promise = require('bluebird');
const internals = {};
const {
  body,
  validationResult,
  check,
} = require('express-validator');

const sanitizeRequestBody = [
  body('start_lat').trim().toFloat(),
  body('end_lat').trim().toFloat(),
  body('start_long').trim().toFloat(),
  body('end_long').trim().toFloat(),
  body('rider_name').trim().escape(),
  body('driver_name').trim().escape(),
  body('driver_vehicle').trim().escape(),
];

internals.runInsertPromise = function(db, query, values) {
  return new Promise((res, rej) => {
    db.run(query, values, function(err) {
      if (err) {
        return rej(err);
      }
      res(this.lastID);
    });
  });
};

async function validateInput(req, res, next) {
  await check('start_lat').notEmpty().isNumeric().run(req);
  await check('end_lat').notEmpty().isNumeric().run(req);
  await check('start_long').notEmpty().isNumeric().run(req);
  await check('end_long').notEmpty().isNumeric().run(req);
  await check('rider_name').notEmpty().run(req);
  await check('driver_name').notEmpty().run(req);
  await check('driver_vehicle').notEmpty().run(req);
  const results = validationResult(req);

  const startLatitude = Number(req.body.start_lat);
  const startLongitude = Number(req.body.start_long);
  const endLatitude = Number(req.body.end_lat);
  const endLongitude = Number(req.body.end_long);
  const riderName = req.body.rider_name;
  const driverName = req.body.driver_name;
  const driverVehicle = req.body.driver_vehicle;

  if (results.errors.length > 0) {
    const validationErr = results.errors[0];
    const message = validationErr.value ?
      'has Invalid Value' : 'Should not be empty';
    return res.status(400).send({
      error_code: 'VALIDATION_ERROR',
      message: `${validationErr.param} ${message}`,
    });
  }

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

  if (typeof riderName !== 'string') {
    return res.status(400).send({
      error_code: 'VALIDATION_ERROR',
      message: 'Rider name must be a non empty string',
    });
  }

  if (typeof driverName !== 'string') {
    return res.status(400).send({
      error_code: 'VALIDATION_ERROR',
      message: 'Driver name must be a non empty string',
    });
  }

  if (typeof driverVehicle !== 'string') {
    return res.status(400).send({
      error_code: 'VALIDATION_ERROR',
      message: 'Driver vehicle must be a non empty string',
    });
  }

  next();
}

function generateQuery(req, res, next) {
  const values = [
    req.body.start_lat,
    req.body.start_long,
    req.body.end_lat,
    req.body.end_long,
    req.body.rider_name,
    req.body.driver_name,
    req.body.driver_vehicle,
  ];

  req.$scope.queryString = `INSERT INTO Rides(startLat, startLong,
    endLat, endLong, riderName, driverName,
    driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  req.$scope.values = values;

  next();
}

async function runQuery(req, res, next) {
  const {queryString, values} = req.$scope;
  try {
    const lastId = await internals
        .runInsertPromise(req.db, queryString, values);

    req.$scope.lastId = lastId;
    next();
  } catch (e) {
    req.logger.error({
      error: e,
      endpoint: 'POST /rides',
    });
    return res.status(500).send({
      error_code: 'SERVER_ERROR',
      message: 'Unknown error',
    });
  }
}

async function getInsertedRide(req, res, next) {
  const lastId = req.$scope.lastId;
  const queryString = `SELECT * FROM Rides WHERE rideID = ?`;
  try {
    const rides = await req.dbAsync.allAsync(queryString, lastId);
    req.logger.info({
      rideID: lastId,
      endpoint: 'POST /rides',
    });
    req.$scope.rides = rides;
    next();
  } catch (e) {
    req.logger.error({
      error: e,
      endpoint: 'POST /rides',
    });
    return res.status(500).send({
      error_code: 'SERVER_ERROR',
      message: 'Unknown error',
    });
  }
}

function respond(req, res) {
  const rides = req.$scope.rides;
  res.send(rides);
}

module.exports = {
  sanitizeRequestBody,
  validateInput,
  generateQuery,
  runQuery,
  getInsertedRide,
  respond,
};
