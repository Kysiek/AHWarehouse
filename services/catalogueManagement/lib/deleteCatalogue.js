/**
 * Created by Kysiek on 28/11/15.
 */
var Catalogue = require("../../../model/catalogue");
var Emitter = require("events").EventEmitter;
var config = require("../../../config/config");
var util = require("util");

var DeleteCatalogueResult = function(user, args) {
    return {
        user: user,
        args: args,
        catalogue: null,
        success: false,
        message: null
    }
};

var DeleteCatalogue = function(dbConnection) {
    Emitter.call(this);
    var self = this;
    var continueWith = null;

    var validateArguments = function(deleteCatalogueResult) {
        if(!deleteCatalogueResult.user) {
            deleteCatalogueResult.message = "Pole uzytkownik nie moze byc puste";
            self.emit("delete-catalogue-invalid", deleteCatalogueResult);
        } else if(!deleteCatalogueResult.args.catalogueId) {
            deleteCatalogueResult.message = "Nie podano id katalogu";
            self.emit("delete-catalogue-invalid", deleteCatalogueResult);
        } else if(deleteCatalogueResult.args.catalogueId == 1) {
            deleteCatalogueResult.message = "Nie mozna usunac katalogu root";
            self.emit("delete-catalogue-invalid", deleteCatalogueResult);
        } else {
            self.emit("arguments-ok", deleteCatalogueResult);
        }
    };
    var checkCatalogueExist = function(deleteCatalogueResult) {
        dbConnection.query('SELECT * FROM Directory WHERE id = ?',
            [deleteCatalogueResult.args.catalogueId],
            function (err, rows) {
                if(err) {
                    deleteCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    console.log(err);
                    self.emit("delete-catalogue-invalid", deleteCatalogueResult);
                    return;
                }
                if(rows != undefined && rows.length !== 0) {
                    deleteCatalogueResult.catalogue = new Catalogue(rows[0]);
                    self.emit("catalogue-ok", deleteCatalogueResult);
                }  else {
                    deleteCatalogueResult.message = "Podany katalog nie istnieje";
                    self.emit("delete-catalogue-invalid", deleteCatalogueResult);
                }

            });
    };
    var checkUserHasAccess = function(deleteCatalogueResult) {
        if(config.ID_DIR_TYPE_MAP[deleteCatalogueResult.catalogue.typeId] === config.PUBLIC_DIR_STRING) {
            self.emit("user-has-access", deleteCatalogueResult);
        } else if(deleteCatalogueResult.catalogue.ownerUserId == deleteCatalogueResult.user.id) {
            self.emit("user-has-access", deleteCatalogueResult);
        } else {
            dbConnection.query('SELECT * FROM AccessToDirectory WHERE userId = ? AND directoryId = ?',
                [deleteCatalogueResult.user.id,deleteCatalogueResult.catalogue.id],
                function (err, rows) {
                    if(err) {
                        deleteCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                        console.log(err);
                        self.emit("delete-catalogue-invalid", deleteCatalogueResult);
                        return;
                    }
                    if(rows === undefined || rows.length === 0) {
                        deleteCatalogueResult.message = "Nie posiadasz dostępu do tego katalogu";
                        self.emit("delete-catalogue-invalid", deleteCatalogueResult);
                    }  else {
                        self.emit("user-has-access", deleteCatalogueResult);
                    }

                });
        }
    };

    var deleteDirectories = function(deleteCatalogueResult) {
        dbConnection.query("DELETE FROM Directory WHERE rootPath LIKE '%,?,%' OR rootPath LIKE '%,?]' OR id = ?",
            [deleteCatalogueResult.catalogue.id,deleteCatalogueResult.catalogue.id,deleteCatalogueResult.catalogue.id],
            function (err, rows) {
                if(err) {
                    deleteCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    console.log(err);
                    self.emit("delete-catalogue-invalid", deleteCatalogueResult);
                    return;
                }
                self.emit('directories-deleted', deleteCatalogueResult);
            }
        );
    };

    var deleteCatalogueOk = function(deleteCatalogueResult) {
        deleteCatalogueResult.message = "Katalog usunięty pomyslnie!";
        deleteCatalogueResult.success = true;
        self.emit("delete-catalogue-ok", deleteCatalogueResult);
        if(continueWith) {
            continueWith(null, deleteCatalogueResult);
        }
    };

    var deleteCatalogueNotOk = function(deleteCatalogueResult) {
        deleteCatalogueResult.success = false;
        self.emit("delete-catalogue-not-ok", deleteCatalogueResult);
        if(continueWith) {
            continueWith(null, deleteCatalogueResult);
        }
    };

    //Add catalogue path
    self.on("delete-catalogue-request-received", validateArguments);
    self.on("arguments-ok", checkCatalogueExist);
    self.on("catalogue-ok", checkUserHasAccess);
    self.on("user-has-access", deleteDirectories);
    self.on("directories-deleted", deleteCatalogueOk);

    self.on("delete-catalogue-invalid", deleteCatalogueNotOk);

    self.delete = function (user, args, next) {
        continueWith = next;
        var deleteCatalogueResult = new DeleteCatalogueResult(user, args);
        self.emit("delete-catalogue-request-received", deleteCatalogueResult);
    };
};
util.inherits(DeleteCatalogue, Emitter);
module.exports = DeleteCatalogue;