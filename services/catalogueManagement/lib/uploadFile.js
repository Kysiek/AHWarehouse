/**
 * Created by Kysiek on 19/11/15.
 */
var Catalogue = require("../../../model/catalogue");
var utility = require("../../../utility/utility");
var Emitter = require("events").EventEmitter;
var config = require("../../../config/config");
var util = require("util");

var UploadFileResult = function(user, catalogueId) {
    return {
        user: user,
        catalogue: catalogueId,
        success: false,
        message: null
    }
};

var UploadFile = function(dbConnection) {
    Emitter.call(this);
    var self = this;
    var continueWith = null;

    var validateArguments = function(uploadFileResult) {
        if(!uploadFileResult.user) {
            uploadFileResult.message = "Pole uzytkownik nie moze byc puste";
            self.emit("upload-invalid", uploadFileResult);
        } else if(!uploadFileResult.catalogue) {
            uploadFileResult.message = "Nie podano id katalogu";
            self.emit("upload-invalid", uploadFileResult);
        } else {
            self.emit("arguments-ok", uploadFileResult);
        }
    };
    var checkCatalogueExist = function(uploadFileResult) {
        dbConnection.query('SELECT * FROM Directory WHERE id = ?',
            [uploadFileResult.catalogue],
            function (err, rows) {
                if(err) {
                    uploadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    self.emit("upload-invalid", uploadFileResult);
                    return;
                }
                if(rows != undefined && rows.length !== 0) {
                    uploadFileResult.catalogue = new Catalogue(rows[0]);
                    self.emit("catalogue-ok", uploadFileResult);
                }  else {
                    uploadFileResult.message = "Podany katalog nie istnieje";
                    self.emit("upload-invalid", uploadFileResult);
                }

            });
    };
    var checkCatalogueNotReadOnly = function (uploadFileResult) {
        if(uploadFileResult.catalogue.readOnly && uploadFileResult.user.id !== uploadFileResult.catalogue.ownerUserId) {
            uploadFileResult.message = "Nie można wykonac. Podany katalog jest tylko do odczytu a Ty nie jesteś jego właścicielem.";
            self.emit("upload-invalid", uploadFileResult);
        } else {
            self.emit("catalogue-not-read-only", uploadFileResult);
        }
    };
    var checkUserHasAccess = function(uploadFileResult) {
        if(config.ID_DIR_TYPE_MAP[uploadFileResult.catalogue.typeId] === config.PUBLIC_DIR_STRING) {
            self.emit("user-has-access", uploadFileResult);
        } else {
            dbConnection.query('SELECT * FROM AccessToDirectory WHERE userId = ? AND directoryId = ?',
                [uploadFileResult.user.id,uploadFileResult.catalogue.id],
                function (err, rows) {
                    if(err) {
                        uploadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                        self.emit("upload-invalid", uploadFileResult);
                        return;
                    }
                    if(rows === undefined || rows.length === 0) {
                        uploadFileResult.message = "Nie posiadasz dostępu do tego katalogu";
                        self.emit("upload-invalid", uploadFileResult);
                    }  else {
                        self.emit("user-has-access", uploadFileResult);
                    }

                });
        }
    };

    //Tutaj skończyłem <- dopisz to niżej. Trzeba tutaj mieć nazwę pliku, aby wstawić to do bazy.
    var insertResourceIntoDb = function(uploadFileResult) {
        dbConnection.query('INSERT INTO Resource SET ?', {userId: addPermissionResult.user.id, directoryId: addPermissionResult.catalogue.id}, function(err, result) {
            if(err) {
                addPermissionResult.message = "Blad serwera. Idz opierdol tego co go robil";
                self.emit("upload-invalid", addPermissionResult);
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
    self.on("upload-file-request-received", validateArguments);
    self.on("arguments-ok", checkCatalogueExist);
    self.on("catalogue-ok", checkCatalogueNotReadOnly);
    self.on("catalogue-not-read-only", checkUserHasAccess);
    self.on("user-has-access", insertResourceIntoDb);
    self.on("user-not-owner-ok", checkUserAlreadyHasAccess);
    self.on("user-does-not-have-access", grantAccess);
    self.on("access-granted", grantPermissionOk);

    self.on("upload-invalid", grantPermissionNotOk);

    self.upload = function (user, catalogueId, next) {
        continueWith = next;
        var uploadFileResult = new UploadFileResult(user, catalogueId);
        self.emit("upload-file-request-received", uploadFileResult);
    };
};
util.inherits(UploadFile, Emitter);
module.exports = UploadFile;