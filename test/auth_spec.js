/**
 * Created by Krzysztof on 2015-05-24.
 */
var Registration = require("../services/membership/lib/registration");
var mysqlDB = require("mysql");
var assert = require("assert");
var Authentication = require("../services/membership/lib/authentication");
var should = require("should");
var config = require('../config/config');

describe("Authentication", function () {
    var reg = {},
        auth = {},
        connection,
        username = "aajklafdgopaidfgn",
        password = "pass";
    before(function(done){
        connection = mysqlDB.createConnection({host: config.DB_HOST, user: config.DB_USER, password: config.DB_PASSWORD, database: config.DB_NAME});
        connection.connect(function (err) {
            if(err) {
                console.log("Error while connecting to the MySQL DB: " + err.stack);
                done();
            }
            auth = new Authentication(connection);
            reg = new Registration(connection);

            reg.applyForMembership({username: username, password: password }, function (err, result) {
                regResult = result;
                console.log(regResult);
                done();
            });
        });
    });
    after(function (done) {
        connection.query('DELETE FROM User WHERE username = ?', [username], function (err, rows) {
            assert.ok(err === null, err);
            connection.end();
            done();
        });
    });
    describe("a valid login", function () {
        var authResult = {};
        before(function(done) {
            auth.authenticate({username: username, password: password}, function (err, result) {
                assert.ok(err === null, err);
                authResult = result;
                console.log(authResult);
                done();
            });

        });
        it("is successful", function () {
            authResult.success.should.be.equal(true);
        });
        it("return a user", function () {
            authResult.user.should.be.defined;
        });
    }); 


    describe("empty password", function () {
        var authResult = {};
        before(function(done) {
            auth.authenticate({username: username, password: ""}, function (err, result) {
                assert.ok(err === null, err);
                authResult = result;
                done();
            });

        });
        it("is not successful", function () {
            authResult.success.should.be.equal(false);
        });
        it("returns a message saying 'Password cannot be empty'", function () {
            authResult.message.should.be.equal("Password cannot be empty");
        });
    });
    describe("password does not match", function () {
        var authResult = {};
        before(function(done) {
            auth.authenticate({username: username, password: password + "asd"}, function (err, result) {
                assert.ok(err === null, err);
                authResult = result;
                done();
            });

        });
        it("is not successful", function () {
            authResult.success.should.be.equal(false);
        });
        it("returns a message saying 'Password is incorrect'", function () {
            authResult.message.should.be.equal("Incorrect username or password");
        });
    });
});