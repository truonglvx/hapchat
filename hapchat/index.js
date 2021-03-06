// Load modules
var Path = require('path');
var Bell = require('bell');
var Hapi = require('hapi');
var HapiAuthCookie = require('hapi-auth-cookie');
var Hoek = require('hoek');
var Lib = require('./lib');
var Package = require('./package.json');


// Declare internals

var internals = {
    port: process.env.PORT || 8000
};


// Create required directories before anything else is done
Lib.initPaths(__dirname);

var server = new Hapi.Server(internals.port, {
    app: {
        oneDay: 86400000,
        root: __dirname,
        globalContext: {
            name: 'HapChat',
            year: new Date().getFullYear(),
            version: Package.version
        }
    }
});

// Register views
server.views({
    engines: {
        html: require('handlebars')
    },
    path: Path.join(__dirname, 'static', 'views'),
    layoutPath: Path.join(__dirname, 'static', 'views', 'layout'),
    layout: true,
    layoutKeyword: 'partial'
});

// Register methods
Lib.registerMethods(server);

// Server extension points
server.ext('onPreResponse', function (request, reply) {

    if (request.response.variety === 'view') {
        request.response.source.context = Hoek.applyToDefaults(server.settings.app.globalContext, request.response.source.context || {});
        request.response.source.context.path = request.path;

        server.methods.getNav(request.auth.isAuthenticated, function (error, result) {

            request.response.source.context.nav = result;
            reply();
        });
    }
    else {
        reply();
    }
});

// Register plugins
server.pack.register([
    HapiAuthCookie,
    Bell
], function (err) {

    // Registery auth strategies
    Lib.registerStrategies(server);

    // Register routes
    Lib.registerRoutes(server);

    // Start the server
    server.start(function start() {

        // Initilize web sockets
        Lib.sockets.init(server);

        console.log('Hapchat started at ' + server.info.uri);
    });
});
