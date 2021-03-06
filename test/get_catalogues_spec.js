/**
 * Created by KMACIAZE on 18.11.2015.
 */

var AddCatalogue = require('../services/catalogueManagement/lib/addCatalogue');
var GetCatalogue = require('../services/catalogueManagement/lib/getCatalogue');
var Membership = require('../services/membership/index');
var mysqlDB = require('mysql');
var should = require('should');
var config = require('../config/config');
var assert = require('assert');

describe('Get catalogues', function () {
    var addCatalogue,
        getCatalogue,
        connection,
        username = 'aajklafdgopaidfgn',
        password = 'pass',
        validUser,
        getCataloguesResult,
        catalogueUnderRootParentId = 1,
        catalogueAName = "xyxyxyxyxyxvb",
        catalogueBName = "xyxyxyxyxyxvbUnderRootSecond",
        catalogueAaName = "xyxyxyxyxyxvbFirst",
        catalogueAbName = "xyxyxyxyxyxvbSecond",
        catalogueAbaName = "xyxyxyxyxyxvbAba",
        catalogueBaName = "xyxyxyxyxyxvbBa",
        catalogueBbName = "xyxyxyxyxyxvbBb",
        catalogueType = "Publiczny",
        catalogueAResult,
        catalogueBResult,
        catalogueAaResult,
        catalogueAbResult,
        catalogueAbaResult,
        catalogueBaResult,
        catalogueBbResult;

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
            getCatalogue = new GetCatalogue(connection);
            membership.register(username, password, function (err, result) {
                validUser = result.user;
                addCatalogue.add({name: catalogueAName, parentId:catalogueUnderRootParentId, type:catalogueType},
                    validUser,
                    function(err, result) {
                        catalogueAResult = result;
                        addCatalogue.add({name: catalogueAaName, parentId:catalogueAResult.catalogue.id, type:catalogueType},
                            validUser,
                            function(err2, result2) {
                                catalogueAaResult = result2;
                                addCatalogue.add({name: catalogueAbName, parentId:catalogueAResult.catalogue.id, type:catalogueType},
                                    validUser,
                                    function(err3, result3) {
                                        catalogueAbResult = result3;
                                        getCatalogue.get(validUser,catalogueAResult.catalogue.id, function (err4, result4) {
                                            getCataloguesResult =  result4;
                                            addCatalogue.add({name: catalogueBName, parentId:catalogueUnderRootParentId, type:catalogueType},
                                                validUser,
                                                function(err5, result5) {
                                                    catalogueBResult = result5;
                                                    addCatalogue.add({name: catalogueBaName, parentId:catalogueBResult.catalogue.id, type:catalogueType},
                                                        validUser,
                                                        function(err6, result6) {
                                                            catalogueBaResult = result6;
                                                            addCatalogue.add({name: catalogueBbName, parentId:catalogueBResult.catalogue.id, type:catalogueType},
                                                                validUser,
                                                                function(err7, result7) {
                                                                    catalogueBbResult = result7;
                                                                    addCatalogue.add({name: catalogueAbaName, parentId:catalogueAbResult.catalogue.id, type:catalogueType},
                                                                        validUser,
                                                                        function(err8, result8) {
                                                                            catalogueAbaResult = result8;
                                                                            done();
                                                                        }
                                                                    );
                                                                }
                                                            );
                                                        }
                                                    );
                                                }
                                            );
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    });
    after(function (done) {
        connection.query(
            'DELETE FROM Directory WHERE id IN (?,?,?,?,?,?,?)',
            [
                catalogueAResult.catalogue.id,
                catalogueAaResult.catalogue.id,
                catalogueAbResult.catalogue.id,
                catalogueAbaResult.catalogue.id,
                catalogueBResult.catalogue.id,
                catalogueBaResult.catalogue.id,
                catalogueBbResult.catalogue.id
            ],
            function (err, rows) {
                assert.ok(err === null, err);
                connection.query('DELETE FROM User WHERE username = ?', [username], function (err, rows) {
                    assert.ok(err === null, err);
                    connection.end();
                    done();

                });

            });

    });
    describe('correctly gets root catalogues', function() {
        var getCataloguesResult,
            catalogueId = 1;
        before(function(done) {
            getCatalogue.get(validUser,catalogueId, function (err, result) {
               getCataloguesResult =  result;
                done();
            });
        });
        it('is successful', function () {
            getCataloguesResult.success.should.equal(true);
        });
        it('sets appropriate message', function () {
            getCataloguesResult.message.should.equal('Katalogi pobrane');
        });
        it('contains appropriate name', function () {
            getCataloguesResult.result.name.should.equal('root');
        });
        it('contains false in readOnly', function () {
            getCataloguesResult.result.readOnly.should.equal(false);
        });
        it('should has appropriate rootPath', function () {
            getCataloguesResult.result.pathToDirectory.length.should.equal(0);
        });
        it('should has appropriate amount subDirectories', function () {
            getCataloguesResult.result.subDirectories.length.should.greaterThanOrEqual(2);
        });
    });
    describe('correctly gets public first level catalogue', function() {
        before(function(done) {
            getCatalogue.get(validUser,catalogueAResult.catalogue.id, function (err, result) {
                getCataloguesResult =  result;
                done();
            });
        });
        it('is successful', function () {
            getCataloguesResult.success.should.equal(true);
        });
        it('sets appropriate message', function () {
            getCataloguesResult.message.should.equal('Katalogi pobrane');
        });
        it('contains appropriate name', function () {
            getCataloguesResult.result.name.should.equal(catalogueAName);
        });
        it('should has appropriate amount of rootPath', function () {
            getCataloguesResult.result.pathToDirectory.length.should.equal(1);
        });
        it('should has appropriate rootPath', function () {
            getCataloguesResult.result.pathToDirectory[0].name.should.equal('root');
        });
        it('rootPath should has appropriate readOnly value', function () {
            getCataloguesResult.result.pathToDirectory[0].readOnly.should.equal(false);
        });
        it('should has appropriate amount subDirectories', function () {
            getCataloguesResult.result.subDirectories.length.should.equal(2);
        });
    });
    describe('correctly gets public second level catalogue', function() {
        before(function(done) {
            getCatalogue.get(validUser,catalogueAbResult.catalogue.id, function (err, result) {
                getCataloguesResult =  result;
                done();
            });
        });
        it('is successful', function () {
            getCataloguesResult.success.should.equal(true);
        });
        it('sets appropriate message', function () {
            getCataloguesResult.message.should.equal('Katalogi pobrane');
        });
        it('contains appropriate name', function () {
            getCataloguesResult.result.name.should.equal(catalogueAbName);
        });
        it('should have appropriate amount of rootPath', function () {
            getCataloguesResult.result.pathToDirectory.length.should.equal(2);
        });
        it('should have appropriate rootPath', function () {
            getCataloguesResult.result.pathToDirectory[0].name.should.equal('root');
            getCataloguesResult.result.pathToDirectory[1].name.should.equal(catalogueAName);
        });
        it('should have appropriate amount subDirectories', function () {
            getCataloguesResult.result.subDirectories.length.should.equal(1);
        });
        it('should have appropriate subDirectories', function () {
            getCataloguesResult.result.subDirectories[0].name.should.be.equal(catalogueAbaName);
            getCataloguesResult.result.subDirectories[0].id.should.be.equal(catalogueAbaResult.catalogue.id);
        });
        it('subdirs should have appropriate readOnly field', function () {
            getCataloguesResult.result.subDirectories[0].readOnly.should.equal(false);
        });
    });
    describe('correctly gets public third level catalogue', function() {
        before(function(done) {
            getCatalogue.get(validUser,catalogueAbaResult.catalogue.id, function (err, result) {
                getCataloguesResult =  result;
                done();
            });
        });
        it('is successful', function () {
            getCataloguesResult.success.should.equal(true);
        });
        it('sets appropriate message', function () {
            getCataloguesResult.message.should.equal('Katalogi pobrane');
        });
        it('contains appropriate name', function () {
            getCataloguesResult.result.name.should.equal(catalogueAbaName);
        });
        it('should has appropriate amount of rootPath', function () {
            getCataloguesResult.result.pathToDirectory.length.should.equal(3);
        });
        it('should has appropriate rootPath', function () {
            getCataloguesResult.result.pathToDirectory[0].name.should.equal('root');
            getCataloguesResult.result.pathToDirectory[1].name.should.equal(catalogueAName);
            getCataloguesResult.result.pathToDirectory[2].name.should.equal(catalogueAbName);
        });
        it('should has appropriate amount subDirectories', function () {
            getCataloguesResult.result.subDirectories.length.should.equal(0);
        });
    });
});