/**
 * Created by Krzysztof on 2015-05-23.
 */
var Application = function(args) {
    var app = {};
    app.username = args.username;
    app.password = args.password;
    app.status = "pending";
    app.code = null;
    app.message = null;
    app.user = null;

    app.isValid = function() {
        return app.status == "validated";
    };

    app.isInvalid = function() {
        return !app.isValid();
    };
    app.invalidate = function(message) {
        app.status = "invalid";
        app.message = message;
    };

    app.validate = function(message) {
        app.status = "validated";
        app.message = message;
    };

    return app;
};

module.exports = Application;