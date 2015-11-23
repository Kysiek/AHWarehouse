/**
 * Created by Kysiek on 19/11/15.
 */
var Catalogue = require("../../../model/catalogue");
var utility = require("../../../utility/utility");
var Emitter = require("events").EventEmitter;
var config = require("../../../config/config");
var util = require("util");

var DownloadFileResult = function(user, args) {
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

    var validateArguments = function(downloadFileResult) {
        if(!downloadFileResult.user) {
            downloadFileResult.message = "Pole uzytkownik nie moze byc puste";
            self.emit("download-invalid", downloadFileResult);
        } else if(!downloadFileResult.args.catalogueId) {
            downloadFileResult.message = "Nie podano id katalogu";
            self.emit("download-invalid", downloadFileResult);
        } else if(!downloadFileResult.args.fileId) {
            downloadFileResult.message = "Nie podano id pliku";
            self.emit("download-invalid", downloadFileResult);
        } else {
            self.emit("arguments-ok", downloadFileResult);
        }
    };
    var checkCatalogueExist = function(downloadFileResult) {
        dbConnection.query('SELECT * FROM Directory WHERE id = ?',
            [downloadFileResult.args.catalogueId],
            function (err, rows) {
                if(err) {
                    downloadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    console.log(err);
                    self.emit("download-invalid", downloadFileResult);
                    return;
                }
                if(rows != undefined && rows.length !== 0) {
                    downloadFileResult.catalogue = new Catalogue(rows[0]);
                    self.emit("catalogue-ok", downloadFileResult);
                }  else {
                    downloadFileResult.message = "Podany katalog nie istnieje";
                    self.emit("download-invalid", downloadFileResult);
                }

            });
    };
    var checkUserHasAccess = function(downloadFileResult) {
        if(config.ID_DIR_TYPE_MAP[downloadFileResult.catalogue.typeId] === config.PUBLIC_DIR_STRING) {
            self.emit("user-has-access", downloadFileResult);
        } else if(downloadFileResult.catalogue.ownerUserId == downloadFileResult.user.id) {
            self.emit("user-has-access", downloadFileResult);
        } else {
            dbConnection.query('SELECT * FROM AccessToDirectory WHERE userId = ? AND directoryId = ?',
                [downloadFileResult.user.id,downloadFileResult.catalogue.id],
                function (err, rows) {
                    if(err) {
                        downloadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                        console.log(err);
                        self.emit("download-invalid", downloadFileResult);
                        return;
                    }
                    if(rows === undefined || rows.length === 0) {
                        downloadFileResult.message = "Nie posiadasz dostêpu do katalogu zawieraj¹cego plik";
                        self.emit("download-invalid", downloadFileResult);
                    }  else {
                        self.emit("user-has-access", downloadFileResult);
                    }
                });
        }
    };

    var checkFileExist = function(downloadFileResult) {
        dbConnection.query('SELECT * FROM Resource WHERE id = ? AND directoryId = ?', [downloadFileResult.args.fileId, downloadFileResult.catalogue.id], function (err, rows) {
            if(err) {
                downloadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                console.log(err);
                self.emit("download-invalid", downloadFileResult);
                return;
            }
            if(rows === undefined || rows.length === 0) {
                downloadFileResult.message = "W folderze " + downloadFileResult.catalogue.name + " nie istnieje plik o id" + downloadFileResult.args.fileId;
                self.emit("download-invalid", downloadFileResult);
            }  else {
                downloadFileResult.resource = rows[0];
                self.emit("file-exist", downloadFileResult);
            }
        });
    };

    var DownloadFileOk = function(downloadFileResult) {
        downloadFileResult.message = "Plik pobrany pomyslnie!";
        downloadFileResult.success = true;
        self.emit("download-ok", downloadFileResult);
        if(continueWith) {
            continueWith(null, downloadFileResult);
        }
    };

    var DownloadFileNotOk = function(downloadFileResult) {
        downloadFileResult.success = false;
        self.emit("download-not-ok", downloadFileResult);
        if(continueWith) {
            continueWith(null, downloadFileResult);
        }
    };

    //Add catalogue path
    self.on("download-file-request-received", validateArguments);
    self.on("arguments-ok", checkCatalogueExist);
    self.on("catalogue-ok", checkUserHasAccess);
    self.on("user-has-access", checkFileExist);
    self.on("file-exist", DownloadFileOk);

    self.on("download-invalid", DownloadFileNotOk);

    self.download = function (user, args, next) {
        continueWith = next;
        var downloadFileResult = new DownloadFileResult(user, args);
        self.emit("download-file-request-received", downloadFileResult);
    };
};
util.inherits(DownloadFile, Emitter);
module.exports = DownloadFile;