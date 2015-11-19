/**
 * Created by KMACIAZE on 18.11.2015.
 */
var Catalogue = require("../../../model/catalogue");
var utility = require("../../../utility/utility");
var Emitter = require("events").EventEmitter;
var config = require("../../../config/config");
var util = require("util");

var AddPermissionResult = function(username, catalogueId) {
    return {
        user: username,
        catalogue: catalogueId,
        success: false,
        message: null
    }
};

var AddPermission = function(dbConnection) {
    Emitter.call(this);
    var self = this;
    var continueWith = null;

    var validateArguments = function(addPermissionResult) {
        if(!addPermissionResult.user) {
            addPermissionResult.message = "Pole uzytkownik nie moze byc puste";
            self.emit("grant-permission-invalid", addPermissionResult);
        } else if(!addPermissionResult.catalogue) {
            addPermissionResult.message = "Nie podano id katalogu";
            self.emit("grant-permission-invalid", addPermissionResult);
        } else {
            self.emit("arguments-ok", addPermissionResult);
        }
    };

    var checkUserExists = function (addPermissionResult) {
        dbConnection.query('SELECT * FROM User WHERE username = ?',
            [addPermissionResult.user],
            function (err, rows) {
                if(err) {
                    addPermissionResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("grant-permission-invalid", addPermissionResult);
                    return;
                }
                if(rows != undefined && rows.length !== 0) {
                    addPermissionResult.user = rows[0];
                    self.emit("user-exists", addPermissionResult);
                }  else {
                    addPermissionResult.message = "Nie istnieje użytkownik o danym username";
                    self.emit("grant-permission-invalid", addPermissionResult);
                }

            });
    };
    var checkCatalogueExist = function(addPermissionResult) {
        dbConnection.query('SELECT * FROM Directory WHERE id = ?',
            [addPermissionResult.catalogue],
            function (err, rows) {
                if(err) {
                    addPermissionResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("grant-permission-invalid", addPermissionResult);
                    return;
                }
                if(rows != undefined && rows.length !== 0) {
                    addPermissionResult.catalogue = new Catalogue(rows[0]);
                    self.emit("catalogue-ok", addPermissionResult);
                }  else {
                    addPermissionResult.message = "Podany katalog nie istnieje";
                    self.emit("grant-permission-invalid", addPermissionResult);
                }

            });
    };
    var checkIfUserIsOwner = function(addPermissionResult) {
        if(addPermissionResult.user.id == addPermissionResult.catalogue.ownerUserId) {
            addPermissionResult.message = "Jestes wlascicielem tego katalogu";
            self.emit("grant-permission-invalid", addPermissionResult);
        } else {
            self.emit("user-not-owner-ok", addPermissionResult);
        }
    };
    var checkUserAlreadyHasAccess = function(addPermissionResult) {
        dbConnection.query('SELECT * FROM AccessToDirectory WHERE userId = ? AND directoryId = ?',
            [addPermissionResult.user.id,addPermissionResult.catalogue.id],
            function (err, rows) {
                if(err) {
                    addPermissionResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("grant-permission-invalid", addPermissionResult);
                    return;
                }
                if(rows === undefined || rows.length === 0) {
                    self.emit("user-does-not-have-access", addPermissionResult);
                }  else {
                    addPermissionResult.message = "Podany użytkownik już posiada dostęp do tego katalogu";
                    self.emit("grant-permission-invalid", addPermissionResult);
                }

            });
    };

    var grantAccess = function(addPermissionResult) {
        dbConnection.query('INSERT INTO AccessToDirectory SET ?', {userId: addPermissionResult.user.id, directoryId: addPermissionResult.catalogue.id}, function(err, result) {
            if(err) {
                addPermissionResult.message = "Blad serwera. Idz opierdol tego co go robil";
                self.emit("grant-permission-invalid", addPermissionResult);
                return;
            }
            self.emit("access-granted", addPermissionResult);
        });
    };

    var grantPermissionOk = function(addPermissionResult) {
        addPermissionResult.message = "Dostęp dodany pomyslnie!";
        addPermissionResult.success = true;
        self.emit("access-ok", addPermissionResult);
        if(continueWith) {
            continueWith(null, addPermissionResult);
        }
    };

    var grantPermissionNotOk = function(addPermissionResult) {
        addPermissionResult.success = false;
        self.emit("access-not-ok", addPermissionResult);
        if(continueWith) {
            continueWith(null, addPermissionResult);
        }
    };

    //Add catalogue path
    self.on("grant-permission-request-received", validateArguments);
    self.on("arguments-ok", checkUserExists);
    self.on("user-exists", checkCatalogueExist);
    self.on("catalogue-ok", checkIfUserIsOwner);
    self.on("user-not-owner-ok", checkUserAlreadyHasAccess);
    self.on("user-does-not-have-access", grantAccess);
    self.on("access-granted", grantPermissionOk);

    self.on("grant-permission-invalid", grantPermissionNotOk);

    self.add = function (username, catalogueId, next) {
        continueWith = next;
        var addPermissionResult = new AddPermissionResult(username, catalogueId);
        self.emit("grant-permission-request-received", addPermissionResult);
    };
};
util.inherits(AddPermission, Emitter);
module.exports = AddPermission;