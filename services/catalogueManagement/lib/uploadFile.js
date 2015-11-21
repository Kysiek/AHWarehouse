/**
 * Created by Kysiek on 19/11/15.
 */
var Catalogue = require("../../../model/catalogue");
var utility = require("../../../utility/utility");
var Emitter = require("events").EventEmitter;
var config = require("../../../config/config");
var util = require("util");

var UploadFileResult = function(user, args) {
    return {
        user: user,
        args: args,
        catalogue: null,
        resource: null,
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
        } else if(!uploadFileResult.args.catalogueId) {
            uploadFileResult.message = "Nie podano id katalogu";
            self.emit("upload-invalid", uploadFileResult);
        } else if(!uploadFileResult.args.name) {
            uploadFileResult.message = "Nie podano nazwy pliku";
            self.emit("upload-invalid", uploadFileResult);
        } else if(!uploadFileResult.args.mimeType) {
            uploadFileResult.message = "Nie podano mime type";
            self.emit("upload-invalid", uploadFileResult);
        } else {
            self.emit("arguments-ok", uploadFileResult);
        }
    };
    var checkCatalogueExist = function(uploadFileResult) {
        dbConnection.query('SELECT * FROM Directory WHERE id = ?',
            [uploadFileResult.args.catalogueId],
            function (err, rows) {
                if(err) {
                    uploadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    console.log(err);
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
                        console.log(err);
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

    var checkFileAlreadyExist = function(uploadFileResult) {
        dbConnection.query('SELECT * FROM Resource WHERE name = ? AND directoryId = ?', [uploadFileResult.args.name, uploadFileResult.catalogue.id], function (err, rows) {
            if(err) {
                uploadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                console.log(err);
                self.emit("upload-invalid", uploadFileResult);
                return;
            }
            if(rows === undefined || rows.length === 0) {
                self.emit("file-not-exist", uploadFileResult);
            }  else {
                uploadFileResult.resource = rows[0];
                self.emit("resource-inserted", uploadFileResult);
            }
        });
    };
    var insertResourceIntoDb = function(uploadFileResult) {
        dbConnection.query('INSERT INTO Resource SET ?', {ownerUserId: uploadFileResult.user.id, directoryId: uploadFileResult.catalogue.id, name: uploadFileResult.args.name, mimetype: uploadFileResult.args.mimeType}, function(err, result) {
            if(err) {
                uploadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                console.log(err);
                self.emit("upload-invalid", uploadFileResult);
                return;
            }
            dbConnection.query('SELECT * FROM Resource WHERE id = ?', [result.insertId], function (err, rows) {
                if(err) {
                    uploadFileResult.message = "Blad serwera. Idz opierdol tego co go robil";
                    console.log(err);
                    self.emit("upload-invalid", uploadFileResult);
                    return;
                }
                uploadFileResult.resource = rows[0];
                self.emit("resource-inserted", uploadFileResult);
            });

        });
    };

    var UploadFileOk = function(uploadFileResult) {
        uploadFileResult.message = "Plik dodany pomyslnie!";
        uploadFileResult.success = true;
        self.emit("upload-ok", uploadFileResult);
        if(continueWith) {
            continueWith(null, uploadFileResult);
        }
    };

    var UploadFileNotOk = function(uploadFileResult) {
        uploadFileResult.success = false;
        self.emit("upload-not-ok", uploadFileResult);
        if(continueWith) {
            continueWith(null, uploadFileResult);
        }
    };

    //Add catalogue path
    self.on("upload-file-request-received", validateArguments);
    self.on("arguments-ok", checkCatalogueExist);
    self.on("catalogue-ok", checkCatalogueNotReadOnly);
    self.on("catalogue-not-read-only", checkUserHasAccess);
    self.on("user-has-access", checkFileAlreadyExist);
    self.on("file-not-exist", insertResourceIntoDb);
    self.on("resource-inserted", UploadFileOk);

    self.on("upload-invalid", UploadFileNotOk);

    self.upload = function (user, args, next) {
        continueWith = next;
        var uploadFileResult = new UploadFileResult(user, args);
        self.emit("upload-file-request-received", uploadFileResult);
    };
};
util.inherits(UploadFile, Emitter);
module.exports = UploadFile;