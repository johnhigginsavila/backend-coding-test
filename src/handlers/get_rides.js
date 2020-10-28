/* eslint-disable require-jsdoc */
const {
  param,
} = require('express-validator');

const sanitizeInput = [
  param('id').toInt(),
];

function generateQuery(req, res, next) {
  let {
    page = 1,
    limit = 10,
  } = req.query;
  if (page < 1) {
    page = 1;
  }

  const p = Number(page) || 1;
  const l = Number(limit) || 10;

  const offset = l * (p - 1);
  const queryString = `SELECT * FROM Rides LIMIT ? 
    OFFSET ?`;

  req.$scope.queryString = queryString;
  req.$scope.values = [l, offset];

  next();
}

function generateQueryById(req, res, next) {
  const queryString = `SELECT * FROM Rides WHERE rideID=?`;

  req.$scope.queryString = queryString;

  next();
}

async function getRides(req, res, next) {
  const queryString = req.$scope.queryString;
  const id = req.params.id;
  const values = id || req.$scope.values;
  try {
    const rides = await req.dbAsync.allAsync(queryString, values);

    req.logger.info({
      rows: rides.length,
      endpoint: 'GET /rides',
    });

    if (rides.length === 0) {
      return res.send({
        error_code: 'RIDES_NOT_FOUND_ERROR',
        message: 'Could not find any rides',
      });
    }

    req.$scope.rides = rides;
    next();
  } catch (e) {
    req.logger.error({
      error: e,
      endpoint: 'GET /rides',
    });
    return res.status(500).send({
      error_code: 'SERVER_ERROR',
      message: 'Unknown error',
    });
  }
}

function respond(req, res) {
  res.send(req.$scope.rides);
}

module.exports = {
  sanitizeInput,
  generateQuery,
  generateQueryById,
  getRides,
  respond,
};
