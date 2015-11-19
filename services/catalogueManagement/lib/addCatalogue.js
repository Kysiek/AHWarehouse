/**
 * Created by KMACIAZE on 17.11.2015.
 */
var Catalogue = require("../../../model/catalogue");
var utility = require("../../../utility/utility");
var Emitter = require("events").EventEmitter;
var config = require("../../../config/config");
var util = require("util");

var AddCatalogueResult = function(args, user) {
    return {
        args: args,
        user: user,
        supCatalogue: null,
        catalogue: null,
        success: false,
        message: null
    }
};

var AddCatalogue = function(dbConnection) {
    Emitter.call(this);
    var self = this;
    var continueWith = null;

    var validateArguments = function(addCatalogueResult) {
        if(!addCatalogueResult.user) {
            addCatalogueResult.message = "Pole uzytkownik nie moze byc puste";
            self.emit("add-catalogue-invalid", addCatalogueResult);
        } else if(!addCatalogueResult.args.name) {
            addCatalogueResult.message = "Nie podano nazwy katalogu";
            self.emit("add-catalogue-invalid", addCatalogueResult);
        } else if(!addCatalogueResult.user.id) {
            addCatalogueResult.message = "Uzytkownik nie posiada id";
            self.emit("add-catalogue-invalid", addCatalogueResult);
        } else if(!addCatalogueResult.args.parentId) {
            addCatalogueResult.message = "Nie podano id katalogu nadrzednego";
            self.emit("add-catalogue-invalid", addCatalogueResult);
        } else {
            if(!addCatalogueResult.args.type ||
                addCatalogueResult.args.type !== config.PUBLIC_DIR_STRING &&
                addCatalogueResult.args.type !== config.PRIVATE_DIR_STRING) {
                addCatalogueResult.args.type = config.PUBLIC_DIR_STRING;
            }
            if(!addCatalogueResult.args.readOnly) {
                addCatalogueResult.args.readOnly = false;
            }
            self.emit("arguments-ok", addCatalogueResult);
        }
    };
    var checkSuperiorCatalogueExist = function(addCatalogueResult) {
        dbConnection.query('SELECT * FROM Directory WHERE id = ?',
            [addCatalogueResult.args.parentId],
            function (err, rows) {
                if(err) {
                    addCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("add-catalogue-invalid", addCatalogueResult);
                    return;
                }
                if(rows != undefined && rows.length !== 0) {
                    addCatalogueResult.supCatalogue = new Catalogue(rows[0]);
                    self.emit("subCatalogue-ok", addCatalogueResult);
                }  else {
                    addCatalogueResult.message = "Podany katalog nadrzedny nie istnieje";
                    self.emit("add-catalogue-invalid", addCatalogueResult);
                }

            });
    };
    var checkForNameDuplicates = function(addCatalogueResult) {
        dbConnection.query("SELECT * FROM Directory WHERE name = ? AND (rootPath LIKE '%,?]' OR rootPath LIKE '[?]')",
            [addCatalogueResult.args.name,addCatalogueResult.supCatalogue.id, addCatalogueResult.supCatalogue.id],
            function (err, rows) {
                if(err) {
                    addCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("add-catalogue-invalid", addCatalogueResult);
                    return;
                }
                if(rows == undefined || rows.length == 0) {
                    self.emit("name-ok", addCatalogueResult);
                }  else {
                    addCatalogueResult.message = "Katalog podrzedny zawiera juz katalog o takiej nazwie";
                    self.emit("add-catalogue-invalid", addCatalogueResult);
                }

            });
    };
    var createCatalogueObject = function(addCatalogueResult) {
        addCatalogueResult.catalogue = new Catalogue({
                name: addCatalogueResult.args.name,
                ownerUserId: addCatalogueResult.user.id,
                typeId: config.DIR_TYPE_MAP[addCatalogueResult.args.type],
                rootPath: utility.createNewRootPathForRootPathAndSubDir(addCatalogueResult.supCatalogue.rootPath,addCatalogueResult.supCatalogue.id),
                readOnly: addCatalogueResult.args.readOnly
            }
        );
        self.emit("catalogue-obj-created", addCatalogueResult);
    };

    var insertCatalogueIntoDB = function(addCatalogueResult) {
        dbConnection.query('INSERT INTO Directory SET ?', addCatalogueResult.catalogue, function(err, result) {
            if(err) {
                console.log("B³¹d1: " + err);
                addCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                self.emit("add-catalogue-invalid", addCatalogueResult);
                return;
            }
            dbConnection.query('SELECT * FROM Directory WHERE id = ?', [result.insertId], function (err, rows) {
                if(err) {
                    addCatalogueResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("add-catalogue-invalid", addCatalogueResult);
                    return;
                }
                addCatalogueResult.catalogue = rows[0];
                self.emit("catalogue-inserted", addCatalogueResult);
            });

        });
    };

    var addCatalogueOk = function(addCatalogueResult) {
        addCatalogueResult.message = "Katalog dodany pomyslnie!";
        addCatalogueResult.success = true;
        self.emit("added-catalogue-ok", addCatalogueResult);
        if(continueWith) {
            continueWith(null, addCatalogueResult);
        }
    };

    var addCatalogueNotOk = function(addCatalogueResult) {
        addCatalogueResult.success = false;
        self.emit("added-catalogue-not-ok", addCatalogueResult);
        if(continueWith) {
            continueWith(null, addCatalogueResult);
        }
    };

    //Add catalogue path
    self.on("add-catalogue-request-received", validateArguments);
    self.on("arguments-ok", checkSuperiorCatalogueExist);
    self.on("subCatalogue-ok", checkForNameDuplicates);
    self.on("name-ok", createCatalogueObject);
    self.on("catalogue-obj-created", insertCatalogueIntoDB);
    self.on("catalogue-inserted", addCatalogueOk);

    self.on("add-catalogue-invalid", addCatalogueNotOk);

    self.add = function (args, user, next) {
        continueWith = next;
        var addCatalogueResult = new AddCatalogueResult(args, user);
        self.emit("add-catalogue-request-received", addCatalogueResult);
    };
};
util.inherits(AddCatalogue, Emitter);
module.exports = AddCatalogue;