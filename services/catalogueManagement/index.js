/**
 * Created by KMACIAZE on 17.11.2015.
 */

var events = require("events");
var util = require("util");
var AddCatalogue = require("./lib/addCatalogue");
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

};


util.inherits(CatalogueManagement, events.EventEmitter);
module.exports = CatalogueManagement;