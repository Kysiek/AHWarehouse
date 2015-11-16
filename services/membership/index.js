/**
 * Created by Krzysztof on 2015-05-24.
 */
var events = require("events");
var util = require("util");
var Registration = require("./lib/registration");
var Authentication = require("./lib/authentication");
var assert = require("assert");

var Membership = function (connection) {
    var self = this;
    events.EventEmitter.call(self);

    self.findUserByToken = function (token, next) {
        var sqlToFindUserByToken    = 'SELECT * FROM User WHERE authenticationToken = ' + connection.escape(token);
        connection.query(sqlToFindUserByToken, function(err, rows) {
            assert(rows.length === 1,"Could not find user id by token");
            next(err,rows[0]);
        });

    };
    
    self.authenticate = function (username, password, next) {
        var auth = new Authentication(connection);

        auth.on("authenticated", function (authResult) {
            self.emit("authenticated", authResult)
        });
        auth.on("non-authenticated", function (authResult) {
            self.emit("non-authenticated", authResult)
        });
        auth.authenticate({username: username, password: password}, next);
    };

    self.register = function (username, password, next) {
        var reg = new Registration(connection);

        reg.on("registered", function (regResult) {
            self.emit("registered", regResult)
        });
        reg.on("non-registered", function (regResult) {
            self.emit("non-registered", regResult)
        });
        reg.applyForMembership({username: username, password: password}, next);
    };
};

util.inherits(Membership, events.EventEmitter);
module.exports = Membership;