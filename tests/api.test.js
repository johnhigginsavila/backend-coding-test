'use strict';

const request = require('supertest');
const expect = require('chai').expect;
const sinon = require('sinon');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

const app = require('../src/app')(db);
const buildSchemas = require('../src/schemas');
const fixtures = require('../tools/fixtures');

describe('API tests', () => {
  const insertValues = [
    fixtures.ride.startLat,
    fixtures.ride.startLong,
    fixtures.ride.endLat,
    fixtures.ride.endLong,
    fixtures.ride.riderName,
    fixtures.ride.driverName,
    fixtures.ride.driverVehicle,
  ];

  let sandbox;

  before((done) => {
    db.serialize((err) => {
      if (err) {
        return done(err);
      }

      buildSchemas(db);

      done();
    });
  });

  describe('GET /health', () => {
    it('should return health', (done) => {
      request(app)
          .get('/health')
          .expect('Content-Type', /text/)
          .expect(200, done);
    });
  });

  describe('POST /rides', () => {
    let rideInput;

    beforeEach((done) => {
      rideInput = {
        start_lat: fixtures.ride.startLat,
        start_long: fixtures.ride.startLong,
        end_lat: fixtures.ride.endLat,
        end_long: fixtures.ride.endLong,
        rider_name: fixtures.ride.riderName,
        driver_name: fixtures.ride.driverName,
        driver_vehicle: fixtures.ride.driverVehicle,
      };

      done();
    });

    describe('POST /rides SUCCESS', () => {
      it('should return 200 response', (done) => {
        request(app)
            .post('/rides')
            .send(rideInput)
            .expect(200, done);
      });
    });

    describe('POST /rides Invalid input', () => {
      rideInput = {
        start_lat: fixtures.ride.startLat,
        start_long: fixtures.ride.startLong,
        end_lat: fixtures.ride.endLat,
        end_long: fixtures.ride.endLong,
        rider_name: fixtures.ride.riderName,
        driver_name: fixtures.ride.driverName,
        driver_vehicle: fixtures.ride.driverVehicle,
      };

      const invalidInputs = [
        {...rideInput, start_lat: -100},
        {...rideInput, end_lat: -100},
        {...rideInput, rider_name: null},
        {...rideInput, rider_name: ''},
        {...rideInput, driver_name: null},
        {...rideInput, driver_name: ''},
        {...rideInput, driver_vehicle: null},
      ];
      invalidInputs.forEach((invalidInput, index) => {
        describe(`POST /rides Invalid input (${index + 1})`, () => {
          it('should throw validation error', (done) => {
            request(app)
                .post('/rides')
                .send(invalidInput)
                .expect(400, done);
          });
        });
      });
    });

    describe('POST /rides SERVER ERROR', () => {
      describe('POST /rides SERVER ERROR (1)', () => {
        beforeEach((done) => {
          sandbox = sinon.stub(db, 'run').yields('ERROR');
          done();
        });

        afterEach((done) => {
          sandbox.restore();
          done();
        });

        it('should throw server error', (done) => {
          request(app)
              .post('/rides')
              .send({
                start_lat: fixtures.ride.startLat,
                start_long: fixtures.ride.startLong,
                end_lat: fixtures.ride.endLat,
                end_long: fixtures.ride.endLong,
                rider_name: fixtures.ride.riderName,
                driver_name: fixtures.ride.driverName,
                driver_vehicle: fixtures.ride.driverVehicle,
              })
              .expect(500, done);
        });
      });

      describe('POST /rides SERVER ERROR (2)', () => {
        beforeEach((done) => {
          sandbox = sinon.stub(db, 'all').yields('ERROR');
          done();
        });

        afterEach((done) => {
          sandbox.restore();
          done();
        });

        it('should throw server error', (done) => {
          request(app)
              .post('/rides')
              .send({
                start_lat: fixtures.ride.startLat,
                start_long: fixtures.ride.startLong,
                end_lat: fixtures.ride.endLat,
                end_long: fixtures.ride.endLong,
                rider_name: fixtures.ride.riderName,
                driver_name: fixtures.ride.driverName,
                driver_vehicle: fixtures.ride.driverVehicle,
              })
              .expect(500, done);
        });
      });
    });
  });

  describe('GET /rides', () => {
    describe('GET /rides SUCCESS', () => {
      beforeEach((done) => {
        db.run(
            `INSERT INTO Rides(startLat, startLong,
              endLat, endLong, riderName, driverName,
              driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            insertValues, function(err) {
              if (err) {
                return done(err);
              }

              done();
            },
        );
      });

      it('should return list of rides', (done) => {
        request(app)
            .get('/rides')
            .expect(function(res) {
              expect(res.body[0].startLat).to.equal(fixtures.ride.startLat);
              expect(res.body[0].startLong).to.equal(fixtures.ride.startLong);
              expect(res.body[0].endLat).to.equal(fixtures.ride.endLat);
              expect(res.body[0].endLong).to.equal(fixtures.ride.endLong);
              expect(res.body[0].riderName).to.equal(fixtures.ride.riderName);
              expect(res.body[0].driverName).to.equal(fixtures.ride.driverName);
              expect(res.body[0].driverVehicle)
                  .to.equal(fixtures.ride.driverVehicle);
            })
            .end(done);
      });

      it('should return pagified list', (done) => {
        request(app)
            .get('/rides?page=0')
            .expect(function(res) {
              expect(res.body[0].startLat).to.equal(fixtures.ride.startLat);
              expect(res.body[0].startLong).to.equal(fixtures.ride.startLong);
              expect(res.body[0].endLat).to.equal(fixtures.ride.endLat);
              expect(res.body[0].endLong).to.equal(fixtures.ride.endLong);
              expect(res.body[0].riderName).to.equal(fixtures.ride.riderName);
              expect(res.body[0].driverName).to.equal(fixtures.ride.driverName);
              expect(res.body[0].driverVehicle)
                  .to.equal(fixtures.ride.driverVehicle);
            })
            .end(done);
      });
    });

    describe('GET /rides SERVER ERROR', () => {
      beforeEach((done) => {
        sandbox = sinon.stub(db, 'all').yields('ERROR');
        done();
      });

      afterEach((done) => {
        sandbox.restore();
        done();
      });

      it('should throw server error', (done) => {
        request(app)
            .get('/rides')
            .expect(500, done);
      });
    });

    describe('GET /rides RIDES NOT FOUND', () => {
      beforeEach((done) => {
        sandbox = sinon.stub(db, 'all').yields(null, []);
        done();
      });

      afterEach((done) => {
        sandbox.restore();
        done();
      });
      it('should return list of rides', (done) => {
        request(app)
            .get('/rides')
            .expect(200)
            .expect(function(res) {
              expect(res.body).to.deep.equal({
                error_code: 'RIDES_NOT_FOUND_ERROR',
                message: 'Could not find any rides',
              });
            })
            .end(done);
      });
    });
  });

  describe('GET /rides/:id', () => {
    describe('GET /rides/:id SUCCESS', () => {
      beforeEach((done) => {
        db.run(
            `INSERT INTO Rides(startLat, startLong,
              endLat, endLong, riderName, driverName,
              driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            insertValues, function(err) {
              if (err) {
                return done(err);
              }

              done();
            },
        );
      });

      it('should return list of rides', (done) => {
        request(app)
            .get('/rides/1')
            .expect(function(res) {
              expect(res.body[0].startLat).to.equal(fixtures.ride.startLat);
              expect(res.body[0].startLong).to.equal(fixtures.ride.startLong);
              expect(res.body[0].endLat).to.equal(fixtures.ride.endLat);
              expect(res.body[0].endLong).to.equal(fixtures.ride.endLong);
              expect(res.body[0].riderName).to.equal(fixtures.ride.riderName);
              expect(res.body[0].driverName).to.equal(fixtures.ride.driverName);
              expect(res.body[0].driverVehicle)
                  .to.equal(fixtures.ride.driverVehicle);
            })
            .end(done);
      });
    });

    describe('GET /rides/:id SERVER ERROR', () => {
      beforeEach((done) => {
        sandbox = sinon.stub(db, 'all').yields('ERROR');
        done();
      });

      afterEach((done) => {
        sandbox.restore();
        done();
      });

      it('should throw server error', (done) => {
        request(app)
            .get('/rides/1')
            .expect(500, done);
      });
    });

    describe('GET /rides/:id RIDES NOT FOUND', () => {
      beforeEach((done) => {
        sandbox = sinon.stub(db, 'all').yields(null, []);
        done();
      });

      afterEach((done) => {
        sandbox.restore();
        done();
      });
      it('should return list of rides', (done) => {
        request(app)
            .get('/rides/1')
            .expect(200)
            .expect(function(res) {
              expect(res.body).to.deep.equal({
                error_code: 'RIDES_NOT_FOUND_ERROR',
                message: 'Could not find any rides',
              });
            })
            .end(done);
      });
    });
  });
});
