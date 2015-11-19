/**
 * Created by Krzysztof on 2015-05-24.
 */
var mysqlDB = require('mysql');
var assert = require("assert");
var Membership = require("../services/membership/index");
var should = require("should");
var config = require('../config/config');

describe("Main API", function () {
    var memb,
        connection,
        username = "aajklafdgopaidfgn",
        password = "pass";
    before(function (done) {
        connection = mysqlDB.createConnection({host: config.DB_HOST, user: config.DB_USER, password: config.DB_PASSWORD, database: config.DB_NAME});
        connection.connect(function (err) {
            if(err) {
                console.log("Error while connecting to the MySQL DB: " + err.stack);
                return done();
            }
            memb = new Membership(connection);
            done();
        });
    });
    after(function () {
        after(function(done) {
            connection.query('DELETE FROM User WHERE username = ?', [username], function (err, rows) {
                assert.ok(err === null, err);
                connection.end();
                done();
            });
        });
    });
    describe("authentication", function () {
        var newUser = {};
        before(function (done) {
            memb.register(username, password, function (err, result) {
                newUser = result.user;
                assert.ok(result.success, "Can't register");
                done();
            });
        });
        it("authenticates", function (done) {
            memb.authenticate(username, password, function (err, result) {
                result.success.should.be.equal(true);
                done();
            });
        });
        it("gets by token", function (done) {
            memb.findUserByToken(newUser.authenticationToken, function (err, result) {
                result.should.be.defined;
                done();
            });

        });
    });
});