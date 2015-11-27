/**
 * Created by Kysiek on 27/11/15.
 */

var Catalogue = require("../../../model/catalogue");
var utility = require("../../../utility/utility");
var Emitter = require("events").EventEmitter;
var config = require("../../../config/config");
var util = require("util");

var DeleteFileResult = function(user, args) {
    return {
        user: user,
        args: args,
        catalogue: null,
        resource: null,
        success: false,
        message: null
    }
};

var DownloadFile = function(dbConnection) {
    Emitter.call(this);
    var self = this;
    var continueWith = null;

    var validateArguments = function(deleteFileResult) {
        if(!deleteFileResult.user) {
            deleteFileResult.message = "Pole uzytkownik nie moze byc puste";
            self.emit("delete-invalid", deleteFileResult);
        } else if(!deleteFileResult.args.catalogueId) {
            deleteFileResult.message = "Nie podano id katalogu";
            self.emit("delete-invalid", deleteFileResult);
        } else if(!deleteFileResult.args.fileId) {
            deleteFileResult.message = "Nie podano id pliku";
            self.emit("delete-invalid", deleteFileResult);
        } else {
            self.emit("arguments-ok", deleteFileResult);
        }
    };
    var checkCatalogueExist = function(deleteFileResult) {
        dbConnection.query('SELECT * FROM Directory WHERE id = ?',
            [deleteFileResult.args.catalogueId],
            function (err, rows) {
                if(err) {
                    deleteFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    console.log(err);
                    self.emit("delete-invalid", deleteFileResult);
                    return;
                }
                if(rows != undefined && rows.length !== 0) {
                    deleteFileResult.catalogue = new Catalogue(rows[0]);
                    self.emit("catalogue-ok", deleteFileResult);
                }  else {
                    deleteFileResult.message = "Podany katalog nie istnieje";
                    self.emit("delete-invalid", deleteFileResult);
                }

            });
    };
    var checkUserHasAccess = function(deleteFileResult) {
        if(config.ID_DIR_TYPE_MAP[deleteFileResult.catalogue.typeId] === config.PUBLIC_DIR_STRING) {
            self.emit("user-has-access", deleteFileResult);
        } else if(deleteFileResult.catalogue.ownerUserId == deleteFileResult.user.id) {
            self.emit("user-has-access", deleteFileResult);
        } else {
            dbConnection.query('SELECT * FROM AccessToDirectory WHERE userId = ? AND directoryId = ?',
                [deleteFileResult.user.id,deleteFileResult.catalogue.id],
                function (err, rows) {
                    if(err) {
                        deleteFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                        console.log(err);
                        self.emit("delete-invalid", deleteFileResult);
                        return;
                    }
                    if(rows === undefined || rows.length === 0) {
                        deleteFileResult.message = "Nie posiadasz dost�pu do katalogu zawieraj�cego plik";
                        self.emit("delete-invalid", deleteFileResult);
                    }  else {
                        self.emit("user-has-access", deleteFileResult);
                    }
                });
        }
    };

    var checkFileExist = function(deleteFileResult) {
        dbConnection.query('SELECT * FROM Resource WHERE id = ? AND directoryId = ?', [deleteFileResult.args.fileId, deleteFileResult.catalogue.id], function (err, rows) {
            if(err) {
                deleteFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                console.log(err);
                self.emit("delete-invalid", deleteFileResult);
                return;
            }
            if(rows === undefined || rows.length === 0) {
                deleteFileResult.message = "W folderze " + deleteFileResult.catalogue.name + " nie istnieje plik o id" + deleteFileResult.args.fileId;
                self.emit("delete-invalid", deleteFileResult);
            }  else {
                deleteFileResult.resource = rows[0];
                self.emit("file-exist", deleteFileResult);
            }
        });
    };
    var deleteFileFromDB = function(deleteFileResult) {
        dbConnection.query('DELETE FROM Resource WHERE id = ?', [deleteFileResult.args.fileId], function (err, rows) {
            if(err) {
                deleteFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                console.log(err);
                self.emit("delete-invalid", deleteFileResult);
                return;
            }
            self.emit("file-deleted", deleteFileResult);
        });
    };

    var DeleteFileOk = function(deleteFileResult) {
        deleteFileResult.message = "Plik pobrany pomyslnie!";
        deleteFileResult.success = true;
        self.emit("download-ok", deleteFileResult);
        if(continueWith) {
            continueWith(null, deleteFileResult);
        }
    };

    var DeleteFileNotOk = function(deleteFileResult) {
        deleteFileResult.success = false;
        self.emit("download-not-ok", deleteFileResult);
        if(continueWith) {
            continueWith(null, deleteFileResult);
        }
    };

    //Add catalogue path
    self.on("delete-file-request-received", validateArguments);
    self.on("arguments-ok", checkCatalogueExist);
    self.on("catalogue-ok", checkUserHasAccess);
    self.on("user-has-access", checkFileExist);
    self.on("file-exist", deleteFileFromDB);
    self.on("file-deleted", DeleteFileOk);

    self.on("delete-invalid", DeleteFileNotOk);

    self.delete = function (user, args, next) {
        continueWith = next;
        var deleteFileResult = new DeleteFileResult(user, args);
        self.emit("delete-file-request-received", deleteFileResult);
    };
};
util.inherits(DownloadFile, Emitter);
module.exports = DownloadFile;