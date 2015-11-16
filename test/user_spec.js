/**
 * Created by Krzysztof on 2015-05-23.
 */
var should = require("should");
var User = require("../model/user");

describe("User", function(){
    describe("defaults", function(){
        var user = {};
        before(function () {
           user = new User({username: "kysiek", phone: "698256044"});
        });
        it("name is kysiek", function() {
            user.username.should.equal("kysiek")
        });
        it("has an authentication token", function () {
            user.authenticationToken.should.be.defined;
        });
    });
});