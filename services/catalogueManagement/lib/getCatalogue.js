/**
 * Created by Kysiek on 17/11/15.
 */

var Catalogue = require("../../../model/catalogue");
var utility = require("../../../utility/utility");
var Emitter = require("events").EventEmitter;
var config = require("../../../config/config");
var util = require("util");

var GetCatalogueResult = function(user, catalogueId) {
    return {
        user: user,
        pathToCatalogue: [],
        catalogueId: catalogueId,
        mainCatalogue: null,
        subCatalogues: [],
        success: false,
        message: null
    }
};

var GetCatalogue = function(dbConnection) {
    Emitter.call(this);
    var self = this;
    var continueWith = null;

    var validateArguments = function(getCatalogueResult) {
        if(!getCatalogueResult.user) {
            getCatalogueResult.message = "Pole uzytkownik nie moze byc puste";
            self.emit("get-catalogue-invalid", getCatalogueResult);
        } else if(!getCatalogueResult.catalogueId) {
            getCatalogueResult.message = "Nie podano id katalogu";
            self.emit("get-catalogue-invalid", getCatalogueResult);
        }  else {
            self.emit("arguments-ok", getCatalogueResult);
        }
    };
    var getMainCatalogueFromDB = function(getCatalogueResult) {
        dbConnection.query("SELECT * FROM Directory WHERE id = ?",
            [getCatalogueResult.catalogueId],
            function (err, rows) {
                if(err) {
                    getCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("get-catalogue-invalid", getCatalogueResult);
                    return;
                }
                if(rows != undefined && rows.length !== 0) {
                    getCatalogueResult.mainCatalogue = new Catalogue(rows[0]);
                    self.emit("main-catalogue-got", getCatalogueResult);
                }  else {
                    getCatalogueResult.message = "Katalog z danym id nie istnieje";
                    self.emit("get-catalogue-invalid", getCatalogueResult);
                }

            });
    };
    var getRootPath = function(getCatalogueResult) {

        if(getCatalogueResult.mainCatalogue.rootPath) {
            dbConnection.query("SELECT * FROM Directory WHERE id IN " + utility.createInStatementForArray(getCatalogueResult.mainCatalogue.rootPath),
                function (err, rows) {
                    if(err) {
                        getCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                        self.emit("get-catalogue-invalid", getCatalogueResult);
                        return;
                    }
                    if(rows != undefined && rows.length !== 0) {
                        getCatalogueResult.pathToCatalogue = [];
                        for(var i = 0, x = rows.length; i < x; i++) {
                            getCatalogueResult.pathToCatalogue.push({name: rows[i].name, id: rows[i].id});
                        }
                        self.emit("path-to-catalogue-got", getCatalogueResult);
                    }  else {
                        getCatalogueResult.message = "Katalog z danym id nie istnieje";
                        self.emit("get-catalogue-invalid", getCatalogueResult);
                    }

                });
        } else {
            getCatalogueResult.pathToCatalogue = [];
            self.emit("path-to-catalogue-got", getCatalogueResult);
        }

    };
    var getSubCatalogues = function(getCatalogueResult) {

        dbConnection.query("SELECT * FROM Directory WHERE rootPath LIKE '%?]'",
            [getCatalogueResult.mainCatalogue.id],
            function (err, rows) {
                if(err) {
                    getCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("get-catalogue-invalid", getCatalogueResult);
                    return;
                }
                getCatalogueResult.subCatalogues = [];
                for(var i = 0, x = rows.length; i < x; i++) {
                    getCatalogueResult.subCatalogues.push({name: rows[i].name, id: rows[i].id});
                }
                self.emit("subcatalogues-got", getCatalogueResult);

            });
    };

    var getCatalogueOk = function(getCatalogueResult) {
        getCatalogueResult.message = "Katalogi pobrane";
        getCatalogueResult.success = true;
        self.emit("get-catalogue-ok", getCatalogueResult);
        if(continueWith) {
            continueWith(null, getCatalogueResult);
        }
    };

    var getCatalogueNotOk = function(getCatalogueResult) {
        getCatalogueResult.success = false;
        self.emit("get-catalogue-not-ok", getCatalogueResult);
        if(continueWith) {
            continueWith(null, getCatalogueResult);
        }
    };

    //Add catalogue path
    self.on("get-request-received", validateArguments);
    self.on("arguments-ok", getMainCatalogueFromDB);
    self.on("get-rootPath-to-main-catalogue", getRootPath);
    self.on("path-to-catalogue-got", getSubCatalogues);
    self.on("subcatalogues-got", getCatalogueOk);

    self.on("get-catalogue-invalid", getCatalogueNotOk);

    self.get = function (user, catalogueId, next) {
        continueWith = next;
        var getCatalogueResult = new GetCatalogueResult(user, catalogueId);
        self.emit("get-request-received", getCatalogueResult);
    };
};
util.inherits(GetCatalogue, Emitter);
module.exports = GetCatalogue;