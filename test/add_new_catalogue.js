/**
 * Created by KMACIAZE on 11.11.2015.
 */

var AddCatalogue = require('../services/catalogueManagement/lib/addCatalogue');
var Membership = require('../services/membership/index');
var mysqlDB = require('mysql');
var should = require('should');
var config = require('../config/config');
var assert = require('assert');

describe('Add catalogue', function () {
    var addCatalogue,
        connection,
        username = 'aajklafdgopaidfgn',
        password = 'pass',
        validUser;
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
            membership.register(username, password, function (err, result) {
                validUser = result.user;
                done();
            });
        });
    });
    after(function (done) {
        connection.query('DELETE FROM User WHERE username = ?', [username], function (err, rows) {
            assert.ok(err === null, err);
            connection.end();
            done();
        });
    });
    describe('correctly adds public catalogue under root catalogue without readOnly parametr', function() {
        var addedCatalogueResult;
        var catalogueName = 'Kyœka',
            catalogueParentId = 1,
            catalogueType = 'Publiczny';

        before(function(done) {
            addCatalogue.add({name: catalogueName, parentId:catalogueParentId, type:catalogueType},
                validUser,
                function(err, result) {
                    addedCatalogueResult = result;
                    done();
                }
            );
        });
        after(function(done) {
            connection.query('DELETE FROM Directory WHERE id = ?', [addedCatalogueResult.catalogue.id], function (err, rows) {
                assert.ok(err === null, err);
                done();
            });
        });
        it('is successful', function () {
            addedCatalogueResult.success.should.equal(true);
        });
        it('creates a catalogue in db', function () {
            addedCatalogueResult.catalogue.id.should.be.defined;
        });
        it('created catalogue should contain rootPath', function () {
            addedCatalogueResult.catalogue.rootPath.should.be.defined;
        });
        it('created catalogue should contain correct rootPath', function () {
            addedCatalogueResult.catalogue.rootPath.should.equal("[1]");
        });
        it('created catalogue should contain correct ownerUserId', function () {
            addedCatalogueResult.catalogue.ownerUserId.should.equal(validUser.id);
        });
        it('sets appropriate message', function () {
            addedCatalogueResult.message.should.equal('Katalog dodany pomyslnie!');
        });
        it('created catalogue has an appropriate name', function () {
            addedCatalogueResult.catalogue.name.should.equal(catalogueName);
        });
        it('created catalogue has an appropriate type', function () {
            addedCatalogueResult.catalogue.typeId.should.equal(config.DIR_TYPE_MAP[catalogueType]);
        });
        it('created catalogue false on readOnly field', function () {
            addedCatalogueResult.catalogue.readOnly.should.equal(0);
        });
    });
    describe('correctly adds public catalogue under root catalogue with readOnly as true', function() {
        var addedCatalogueResult;
        var catalogueName = 'Kyœka',
            catalogueParentId = 1,
            catalogueType = 'Publiczny';

        before(function(done) {
            addCatalogue.add({name: catalogueName, parentId:catalogueParentId, type:catalogueType, readOnly: true},
                validUser,
                function(err, result) {
                    addedCatalogueResult = result;
                    done();
                }
            );
        });
        after(function(done) {
            connection.query('DELETE FROM Directory WHERE id = ?', [addedCatalogueResult.catalogue.id], function (err, rows) {
                assert.ok(err === null, err);
                done();
            });
        });
        it('is successful', function () {
            addedCatalogueResult.success.should.equal(true);
        });
        it('creates a catalogue in db', function () {
            addedCatalogueResult.catalogue.id.should.be.defined;
        });
        it('created catalogue true on readOnly field', function () {
            addedCatalogueResult.catalogue.readOnly.should.equal(1);
        });
    });
    describe('correctly adds public catalogue under root catalogue with readOnly as undefined', function() {
        var addedCatalogueResult;
        var catalogueName = 'Kyœka',
            catalogueParentId = 1,
            catalogueType = 'Publiczny';

        before(function(done) {
            addCatalogue.add({name: catalogueName, parentId:catalogueParentId, type:catalogueType, readOnly: undefined},
                validUser,
                function(err, result) {
                    addedCatalogueResult = result;
                    done();
                }
            );
        });
        after(function(done) {
            connection.query('DELETE FROM Directory WHERE id = ?', [addedCatalogueResult.catalogue.id], function (err, rows) {
                assert.ok(err === null, err);
                done();
            });
        });
        it('is successful', function () {
            addedCatalogueResult.success.should.equal(true);
        });
        it('creates a catalogue in db', function () {
            addedCatalogueResult.catalogue.id.should.be.defined;
        });
        it('created catalogue false on readOnly field', function () {
            addedCatalogueResult.catalogue.readOnly.should.equal(0);
        });
    });
    describe('does not allow to add two the same names under the same directory', function() {
        var addedCatalogueFirstResult,
            addedCatalogueSecondResult,
            catalogueName = 'Kyœka',
            catalogueParentId = 1,
            catalogueType = 'Publiczny';

        before(function(done) {
            addCatalogue.add({name: catalogueName, parentId:catalogueParentId, type:catalogueType},
                validUser,
                function(erro, res) {
                    addedCatalogueFirstResult = res;
                    addCatalogue.add({name: catalogueName, parentId:catalogueParentId, type:catalogueType},
                        validUser,
                        function(err, result) {
                            addedCatalogueSecondResult = result;
                            done();
                        }
                    );
                }
            );
        });
        after(function(done) {
            connection.query('DELETE FROM Directory WHERE id = ?', [addedCatalogueFirstResult.catalogue.id], function (err, rows) {
                assert.ok(err === null, err);
                done();
            });
        });
        it('is not successful', function () {
            addedCatalogueSecondResult.success.should.equal(false);
        });
        it('sets appropriate message', function () {
            addedCatalogueSecondResult.message.should.equal('Katalog podrzedny zawiera juz katalog o takiej nazwie');
        });
    });
    describe('given incorrect parent id', function() {
        var addedCatalogueResult,
            catalogueName = 'Kyœka',
            catalogueParentId = 2,
            catalogueType = 'Publiczny';

        before(function(done) {
            addCatalogue.add({name: catalogueName, parentId:catalogueParentId, type:catalogueType},
                validUser,
                function(err, result) {
                    addedCatalogueResult = result;
                    done();
                }
            );
        });
        it('is not successful', function () {
            addedCatalogueResult.success.should.equal(false);
        });
        it('sets appropriate message', function () {
            addedCatalogueResult.message.should.equal('Podany katalog nadrzedny nie istnieje');
        });
    });
    describe('name not given', function() {
        var addedCatalogueResult,
            catalogueParentId = 2,
            catalogueType = 'Publiczny';

        before(function(done) {
            addCatalogue.add({parentId:catalogueParentId, type:catalogueType},
                validUser,
                function(err, result) {
                    addedCatalogueResult = result;
                    done();
                }
            );
        });
        it('is not successful', function () {
            addedCatalogueResult.success.should.equal(false);
        });
        it('sets appropriate message', function () {
            addedCatalogueResult.message.should.equal('Nie podano nazwy katalogu');
        });
    });
    describe('parentId not given', function() {
        var addedCatalogueResult,
            catalogueName = 'Kyœka',
            catalogueType = 'Publiczny';

        before(function(done) {
            addCatalogue.add({name: catalogueName, type:catalogueType},
                validUser,
                function(err, result) {
                    addedCatalogueResult = result;
                    done();
                }
            );
        });
        it('is not successful', function () {
            addedCatalogueResult.success.should.equal(false);
        });
        it('sets appropriate message', function () {
            addedCatalogueResult.message.should.equal('Nie podano id katalogu nadrzednego');
        });
    });
});