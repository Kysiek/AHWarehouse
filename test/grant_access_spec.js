/**
 * Created by Kysiek on 18/11/15.
 */

var AddCatalogue = require('../services/catalogueManagement/lib/addCatalogue');
var GetCatalogue = require('../services/catalogueManagement/lib/getCatalogue');
var AddPermission = require('../services/catalogueManagement/lib/addPermission');
var Membership = require('../services/membership/index');
var mysqlDB = require('mysql');
var should = require('should');
var config = require('../config/config');
var assert = require('assert');

describe('Grant access', function () {
    var addCatalogue,
        getCatalogue,
        addPermission,
        connection,
        username = 'aajklafdgopaidfgn',
        usernameSecond = 'aajklafdgopaidfgnSecond',
        password = 'pass',
        validUser,
        validUserSecond,
        getCataloguesResult,
        catalogueUnderRootParentId = 1,
        catalogueAName = "xyxyxyxyxyxvb",
        catalogueBName = "xyxyxyxyxyxvbUnderRootSecond",
        catalogueAaName = "xyxyxyxyxyxvbFirst",
        catalogueAbName = "xyxyxyxyxyxvbSecond",
        catalogueAbaName = "xyxyxyxyxyxvbAba",
        catalogueBaName = "xyxyxyxyxyxvbBa",
        catalogueBbName = "xyxyxyxyxyxvbBb",
        cataloguePublic = "Publiczny",
        cataloguePrivate = "Prywatny",
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
            addPermission = new AddPermission(connection);
            membership.register(username, password, function (err, result) {
                validUser = result.user;
                membership.register(usernameSecond, password, function (err, result) {
                    validUserSecond = result.user;
                    addCatalogue.add({name: catalogueAName, parentId:catalogueUnderRootParentId, type:cataloguePublic},
                        validUser,
                        function(err, result) {
                            catalogueAResult = result;
                            addCatalogue.add({name: catalogueAaName, parentId:catalogueAResult.catalogue.id, type:cataloguePublic},
                                validUser,
                                function(err2, result2) {
                                    catalogueAaResult = result2;
                                    addCatalogue.add({name: catalogueAbName, parentId:catalogueAResult.catalogue.id, type:cataloguePrivate},
                                        validUser,
                                        function(err3, result3) {
                                            catalogueAbResult = result3;
                                            getCatalogue.get(validUser,catalogueAResult.catalogue.id, function (err4, result4) {
                                                getCataloguesResult =  result4;
                                                addCatalogue.add({name: catalogueBName, parentId:catalogueUnderRootParentId, type:cataloguePrivate},
                                                    validUser,
                                                    function(err4, result4) {
                                                        catalogueBResult = result4;
                                                        addCatalogue.add({name: catalogueBaName, parentId:catalogueBResult.catalogue.id, type:cataloguePublic},
                                                            validUser,
                                                            function(err5, result5) {
                                                                catalogueBaResult = result5;
                                                                addCatalogue.add({name: catalogueBbName, parentId:catalogueBResult.catalogue.id, type:cataloguePrivate},
                                                                    validUser,
                                                                    function(err6, result6) {
                                                                        catalogueBbResult = result6;
                                                                        addCatalogue.add({name: catalogueAbaName, parentId:catalogueAbResult.catalogue.id, type:cataloguePrivate},
                                                                            validUser,
                                                                            function(err7, result7) {
                                                                                catalogueAbaResult = result7;
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
                connection.query('DELETE FROM User WHERE username IN (?,?)', [username,usernameSecond], function (err, rows) {
                    assert.ok(err === null, err);
                    connection.end();
                    done();

                });

            });

    });
    describe('correctly grants access', function() {
        var getCataloguesResult,
            getCataloguesResultAfterGrantingAccess,
            getCataloguesOfBChildrenResult,
            addPermissionResult,
            catalogueId = 1;
        before(function(done) {
            getCatalogue.get(validUserSecond,catalogueId, function (err, result) {
                getCataloguesResult =  result;
                addPermission.add(usernameSecond, catalogueBResult.catalogue.id, function (err, result) {
                    assert(err === null, err);
                    addPermissionResult =  result;
                    getCatalogue.get(validUserSecond,catalogueId, function (err, result) {
                        getCataloguesResultAfterGrantingAccess =  result;
                        getCatalogue.get(validUserSecond,catalogueBResult.catalogue.id, function (err, result) {
                            getCataloguesOfBChildrenResult =  result;
                            done();
                        });
                    });
                });

            });
        });
        after(function (done) {
            connection.query('DELETE FROM AccessToDirectory WHERE userId = ? AND directoryId = ?', [validUserSecond.id,catalogueBResult.catalogue.id], function (err, rows) {
                assert.ok(err === null, err);
                done();

            });
        });
        it('is successful', function () {
            addPermissionResult.success.should.equal(true);
        });
        it('sets appropriate message', function () {
            addPermissionResult.message.should.equal('Dostęp dodany pomyslnie!');
        });
        it('before has access to the only one catalogue', function () {
            getCataloguesResult.result.subDirectories.length.should.equal(1);
        });
        it('before has access to the appropriate catalogue', function () {
            getCataloguesResult.result.subDirectories[0].name.should.be.equal(catalogueAName);
        });
        it('after has access to two catalogues', function () {
            getCataloguesResultAfterGrantingAccess.result.subDirectories.length.should.equal(2);
        });
        it('after has access to the appropriate catalogues', function () {
            getCataloguesResultAfterGrantingAccess.result.subDirectories[0].name.should.be.equal(catalogueAName);
            getCataloguesResultAfterGrantingAccess.result.subDirectories[1].name.should.be.equal(catalogueBName);
        });
        it('after has access to one child catalogue', function () {
            getCataloguesOfBChildrenResult.result.subDirectories.length.should.equal(1);
        });
        it('after has access to the appropriate child catalogue', function () {
            getCataloguesOfBChildrenResult.result.subDirectories[0].name.should.be.equal(catalogueBaName);
        });
    });
});