/**
 * Created by KMACIAZE on 17.11.2015.
 */

var events = require("events");
var util = require("util");
var AddCatalogue = require("./lib/addCatalogue");
var GetCatalogue = require("./lib/getCatalogue");
var AddPermission = require("./lib/addPermission");
var assert = require("assert");

var CatalogueManagement = function (connection) {
    var self = this;
    events.EventEmitter.call(self);

    self.addCatalogue = function (name, parentId, type, user, next) {
        var addCatalogue = new AddCatalogue(connection);


        addCatalogue.on("added-catalogue-ok", function (addCatalogueResult) {
            self.emit("added-catalogue-ok", addCatalogueResult)
        });
        addCatalogue.on("added-catalogue-not-ok", function (addCatalogueResult) {
            self.emit("added-catalogue-not-ok", addCatalogueResult)
        });
        addCatalogue.add({name: name, parentId: parentId, type: type}, user, next);
    };
    self.getCatalogue = function (user, catalogueId, next) {
        var getCatalogue = new GetCatalogue(connection);


        getCatalogue.on("get-catalogue-ok", function (getCatalogueResult) {
            self.emit("get-catalogue-ok", getCatalogueResult)
        });
        getCatalogue.on("get-catalogue-not-ok", function (getCatalogueResult) {
            self.emit("get-catalogue-not-ok", getCatalogueResult)
        });
        getCatalogue.get(user, catalogueId, next);
    };
    self.grantAccess = function(username, catalogueId, next) {
        var addPermission = new AddPermission(connection);


        addPermission.on("access-ok", function (addPermissionResult) {
            self.emit("access-ok", addPermissionResult)
        });
        addPermission.on("access-not-ok", function (addPermissionResult) {
            self.emit("access-not-ok", addPermissionResult)
        });
        addPermission.add(username, catalogueId, next);
    }
};


util.inherits(CatalogueManagement, events.EventEmitter);
module.exports = CatalogueManagement;