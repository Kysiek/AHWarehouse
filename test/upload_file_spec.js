/**
 * Created by KMACIAZE on 20.11.2015.
 */


var AddCatalogue = require('../services/catalogueManagement/lib/addCatalogue');
var UploadFile = require('../services/catalogueManagement/lib/uploadFile');
var Membership = require('../services/membership/index');
var mysqlDB = require('mysql');
var should = require('should');
var config = require('../config/config');
var assert = require('assert');

describe('Upload file', function () {
    var addCatalogue,
        uploadFile,
        connection,
        username = 'aajklafdgopaidfgn',
        password = 'pass',
        validUser,
        catalogueUnderRootParentId = 1,
        catalogueAName = "xyxyxyxyxyxvb",
        catalogueBName = "xyxyxyxyxyxvbUnderRootSecond",
        cataloguePublic = "Publiczny",
        catalogueAResult,
        catalogueBResult;

    before(function(done){
        connection = mysqlDB.createConnection({host: config.DB_HOST, user: config.DB_USER, password: config.DB_PASSWORD, database: config.DB_NAME});
        connection.connect(function(err) {
            if(err) {
                console.log('Error while connecting to the MySQL DB: ' + err.stack);
                done();
                return;
            }
            var membership = new Membership(connection);
            addCatalogue = new AddCatalogue(connection);
            uploadFile = new UploadFile(connection);
            membership.register(username, password, function (err, res) {
                validUser = res.user;
                    addCatalogue.add({name: catalogueAName, parentId:catalogueUnderRootParentId, type:cataloguePublic},
                        validUser,
                        function(err, result) {
                            catalogueAResult = result;
                            addCatalogue.add({name: catalogueBName, parentId:catalogueUnderRootParentId, type:cataloguePublic},
                                validUser,
                                function(err, result) {
                                    catalogueBResult = result;
                                    done();
                                }
                            );
                        }
                    );


            });
        });
    });
    after(function (done) {
        connection.query(
            'DELETE FROM Directory WHERE id IN (?,?)',
            [catalogueAResult.catalogue.id,catalogueBResult.catalogue.id],
            function (err, rows) {
                assert.ok(err === null, err);
                connection.query('DELETE FROM User WHERE username = ?', [username], function (err, rows) {
                    assert.ok(err === null, err);
                    connection.end();
                    done();

                });

            });

    });
    describe('correctly adds resource', function() {
        var uploadFileResult,
            resourceName = "GacieKaryny",
            mimeType = "png";
        before(function(done) {
            uploadFile.upload(validUser, {name: resourceName, mimeType:mimeType, catalogueId: catalogueAResult.catalogue.id}, function (err, result) {
                uploadFileResult = result;
                console.log(uploadFileResult);
                done();
            });
        });
        after(function (done) {
            connection.query('DELETE FROM Resource WHERE id = ?', [uploadFileResult.resource.id], function (err, rows) {
                assert.ok(err === null, err);
                done();

            });
        });
        it('is successful', function () {
            uploadFileResult.success.should.equal(true);
        });
        it('sets appropriate message', function () {
            uploadFileResult.message.should.equal('Plik dodany pomyslnie!');
        });
        it('inserts into database appropriate row', function () {
            uploadFileResult.resource.id.should.be.defined;
        });
        it('has appropriate mimetype', function () {
            uploadFileResult.resource.name.should.be.equal(resourceName);
        });
        it('has appropriate name', function () {
            uploadFileResult.resource.mimetype.should.be.equal(mimeType);
        });
    });
});