/**
 * Main application routes
 */

'use strict';


var errors = require('./components/errors');
var cors = require('cors');
var manager = require('./data-manager.js');



module.exports = function(app) {

  //add cors to enable cross site requests
  app.use(cors());

  //MINI API
  app.route('/api/globaltimeline')
  .get(function(req, res){
    res.json(manager.getGlobalTimeline());
  });


  app.route('/api/slice/:from/:to')
  .get(function(req, res){

    res.header('Content-Type', 'application/json; charset=utf-8')

    console.log('got demand from api ', req.params.from, req.params.to);;

    var params = {
      from : +req.params.from,
      to : +req.params.to
    }
    if(params.from && params.to){
      app.getLocalData(params, function(d){
        res.json(d);
      });
    }else res.json({'error':'api error'});

  });

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get(function(req, res) {
      res.sendfile(app.get('appPath') + '/index.html');
    });
};
