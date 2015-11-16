/**
 * Created by Krzysztof on 2015-05-23.
 */
var assert = require("assert");
var utility = require("../utility/utility");



var User = function(args) {
    var user = {};
    if(args.id) {
        user.id = args.id;
    }
    user.username = args.username;
    user.authenticationToken = args.authenticationToken || utility.randomString(18);
    user.hashedPassword = args.hashedPassword || null;
    user.lastLogin = args.lastLogin;
    return user;
};
module.exports = User;