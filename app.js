var express = require('express'),
    bodyParser = require('body-parser'),
    Membership = require('./services/membership/index'),
    CatalogueManagement = require('./services/catalogueManagement/index'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    mysql = require('mysql'),
    assert = require('assert'),
    flash = require('connect-flash'),
    config = require('./config/config'),
    fs = require('fs-extra'),
    busboy = require('connect-busboy'), //middleware for form/file upload
    path = require('path'),
    mkdirp = require('mkdirp'),
    mime = require('mime');

var app = express();
var membership;
var catalogueManagement;

connection = mysql.createConnection({host: config.DB_HOST, user: config.DB_USER, password: config.DB_PASSWORD, database: config.DB_NAME}, function (err, result) {
    assert(err == null, "Could not connect to the Database");
    console.log("Connected successfully to the database");
});
connection.connect(function (err) {
    assert(err == null, "Could not connect to the Database");
    console.log("Connected successfully to the database");
    membership = new Membership(connection);
    catalogueManagement = new CatalogueManagement(connection);
});


var port = process.env.PORT || 80;

passport.use(new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password'
    },
    function(username, password, done) {
        membership.authenticate(username, password, function (err, authResult) {
            if(authResult.success) {
                done(null, authResult.user);
            } else {
                done(null, false, {message: authResult.message, code: authResult.code});
            }
        });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.authenticationToken);
});
passport.deserializeUser(function (token, done) {
    membership.findUserByToken(token, done);
});
app.use(bodyParser.json());
app.use(busboy());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(session({
    secret: 'keyboard cat',
    proxy: true,
    resave: true,
    saveUninitialized: true }));
app.use(cookieParser('double secret probation'));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


var userRouter = express.Router();
var catalogueManagementRoute = express.Router();
var fileUploadRoute = express.Router();

userRouter.route('/register')
    .post(function (req, res) {
        var bodyArgs = req.body;
        membership.register(bodyArgs.username, bodyArgs.password, function (err, result) {
            if(result.success) {
                res.status(200).end();
            } else {
                res.status(500).json({message: result.message});
            }
        });
    });

userRouter.route('/login')
    .post(function (req,res,next) {

        passport.authenticate('local', function(err, user, info) {
            if (err) { return next(err); }
            if (!user) {
                return res.status(500).json({message: info.message}); }
            req.logIn(user, function(err) {
                if (err) { return next(err); }
                return res.status(200).end();
            });
        })(req, res, next);
    })
    .get(ensureAuthenticated, function(req, res){
        res.status(200).json({user: req.user});
    });
userRouter.route('/logout')
    .get(ensureAuthenticated, function(req, res){
        req.logout();
        res.status(200).end();
    });
catalogueManagementRoute.route('')
    .post(ensureAuthenticated, function(req, res) {
        var bodyArgs = req.body;
        catalogueManagement.addCatalogue(bodyArgs.name, bodyArgs.parentId, bodyArgs.type, req.user, function(err, result) {
            if(result.success) {
                res.status(200).end();
            } else {
                res.status(500).json({message: result.message});
            }
        });
    });
catalogueManagementRoute.route('/root')
    .get(ensureAuthenticated, function(req, res) {
        catalogueManagement.getCatalogue(req.user, 1, function(err, result) {
            if(result.success) {
                res.status(200).json(result.result);
            } else {
                res.status(500).json({message: result.message});
            }
        });
    });
catalogueManagementRoute.route('/:catalogueId')
    .get(ensureAuthenticated, function(req, res) {
        catalogueManagement.getCatalogue(req.user, req.params.catalogueId, function(err, result) {
            if(result.success) {
                res.status(200).json(result.result);
            } else {
                res.status(500).json({message: result.message});
            }
        });
    });
catalogueManagementRoute.route('/:catalogueId/upload/')
    .post(ensureAuthenticated, function (req,res) {
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            var mimeType = req.headers["mimetype"];
            var fileName = req.headers["filename"];
            if(!fileName) {
                console.log("Uploading failed: " +  "Nie podano nazwy pliku");
                res.status(500).json({message: "Nie podano nazwy pliku"});
                return;
            }
            console.log("Uploading: " + fileName);
            catalogueManagement.uploadFile(req.user, fileName, req.params.catalogueId, mimeType, function(err, result) {
                if(result.success) {
                    var cataloguePath = __dirname + '/../public/' + req.params.catalogueId + "/";
                    mkdirp(cataloguePath, function(err) {
                        var fstream = fs.createWriteStream(cataloguePath + fileName);
                        file.pipe(fstream);
                        fstream.on('close', function () {
                            console.log("Upload Finished of " + fileName);
                            res.status(200).end();
                        });
                    });
                } else {
                    console.log("Uploading failed: " +  result.message);
                    res.status(500).json({message: result.message});
                }
            });
        });
    });
catalogueManagementRoute.route('/:catalogueId/file/:fileId')
    .get(ensureAuthenticated, function (req,res) {
        var catalogueId =  req.params.catalogueId;
        catalogueManagement.downloadFile(req.user, req.params.fileId,catalogueId, function(err,result){
            if(result.success) {
                var file = __dirname + '/../public/' + catalogueId + "/" + result.resource.name;
                var filename = path.basename(file);
                var mimetype = mime.lookup(file);
                res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                res.setHeader('Content-type', mimetype);
                res.setHeader('mimetype', result.resource.mimetype);
                var filestream = fs.createReadStream(file);
                filestream.pipe(res);
            } else {
                res.status(500).json({message: result.message});
            }
        });
    });
catalogueManagementRoute.route('/access/grant')
    .post(ensureAuthenticated, function(req, res) {
        var bodyArgs = req.body;
        catalogueManagement.grantAccess(bodyArgs.username, bodyArgs.directoryId, function(err, result) {
            if(result.success) {
                res.status(200).end();
            } else {
                res.status(500).json({message: result.message});
            }
        });
    });
catalogueManagementRoute.route('/download/:catalogueId/:fileId')
    .get(ensureAuthenticated, function(req, res) {
        var catalogueId = req.params.catalogueId,
            fileId = req.params.fileId;


    });
app.use('/user', userRouter);
app.use('/directory', catalogueManagementRoute);

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.status(401).end();
}

app.listen(port, function () {
    console.log(__dirname);
    console.log('Running on PORT: ' + port);
});
