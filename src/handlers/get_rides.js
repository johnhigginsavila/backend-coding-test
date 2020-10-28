/* eslint-disable require-jsdoc */
function generateQuery(req, res, next) {
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

  req.$scope.queryString = queryString;

  next();
}

function generateQueryById(req, res, next) {
  const queryString = `SELECT * FROM Rides WHERE rideID='${req.params.id}'`;

  req.$scope.queryString = queryString;

  next();
}

async function getRides(req, res, next) {
  const queryString = req.$scope.queryString;
  try {
    const rides = await req.dbAsync.allAsync(queryString);

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
  generateQuery,
  generateQueryById,
  getRides,
  respond,
};
