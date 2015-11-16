/**
 * Created by Krzysztof on 2015-05-23.
 */
var Application = require("../../../model/application");
var User = require("../../../model/user");
var assert = require("assert");
var bcrypt = require("bcrypt-nodejs");
var Emitter = require("events").EventEmitter;
var util = require("util");

var ReqResult = function() {


    var result = {
        success: false,
        message: null,
        user: null
    };

    return result;
};
var Registration = function(dbConnection) {

    Emitter.call(this);
    var self = this;
    var continueWith = null;


    var validateInputs = function(app) {
        if (!app.username) {
            app.invalidate("Username is required");
            self.emit("invalid", app);
        } else if(!app.password) {
            app.invalidate("Password is required");
            self.emit("invalid", app);
        } else {
            app.validate();
            self.emit("validated", app);
        }
    };

    var checkIfUsernameExist = function (app) {

        var sqlToCheckIfUsernameExist = 'SELECT username From User WHERE username = ' + dbConnection.escape(app.username);;
        dbConnection.query(sqlToCheckIfUsernameExist, function (err, rows) {
            assert.ok(err === null, err);
            if(rows === undefined || rows.length === 0) {
                self.emit("username-does-not-exist", app);
            } else {
                app.invalidate("This username already exists");
                self.emit("invalid", app);
            }
            
        });
    };

    var createUser = function (app) {
        var user = new User(app);
        user.hashedPassword = bcrypt.hashSync(app.password);
        dbConnection.query('INSERT INTO User SET ?', user, function(err, result) {
            assert.ok(err === null, err);

            dbConnection.query('SELECT * FROM User WHERE id = ?', [result.insertId], function (err, rows) {
                assert.ok(err === null, err);

                app.user = rows[0];
                self.emit("user-created", app);
            });

        });
    };


    self.applyForMembership = function (args, next) {
        continueWith = next;
        var app = new Application(args);
        self.emit("application-received", app);
    };

    var registrationOk = function(app) {
        var regResult = new ReqResult();
        regResult.success = true;
        regResult.message = "Welcome!";
        regResult.user = app.user;
        self.emit("registered", regResult);
        if(continueWith) {
            continueWith(null, regResult);
        }
    };
    var registrationNotOk = function(app) {
        var regResult = new ReqResult();
        regResult.success = false;
        regResult.message = app.message;
        self.emit("not-registered", regResult);
        if(continueWith) {
            continueWith(null, regResult);
        }
    };
    //event wiring
    self.on("application-received", validateInputs);
    self.on("validated", checkIfUsernameExist);
    self.on("username-does-not-exist", createUser);
    self.on("user-created", registrationOk);

    self.on("invalid", registrationNotOk);

    return self;
};
util.inherits(Registration, Emitter);
module.exports = Registration;

