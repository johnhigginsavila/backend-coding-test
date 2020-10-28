/* eslint-disable require-jsdoc */
const winston = require('winston');
const {createLogger, format, transports} = winston;
const {combine, timestamp, prettyPrint} = format;
const Promise = require('bluebird');
const path = require('path');
function _noop() {}
module.exports = (app, db) => {
  const dbAsync = Promise.promisifyAll(db);

  let logger = createLogger({
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

  /* istanbul ignore next */
  if (process.env.NODE_ENV === 'test') {
    // disabling logs during test
    logger = {
      info: _noop,
      log: _noop,
      warn: _noop,
      error: _noop,
    };
  }

  app.use((req, res, next) => {
    req.logger = logger;
    req.$scope = {};
    req.dbAsync = dbAsync;
    req.db = db;
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
};
