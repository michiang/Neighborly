'use strict';

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var pg = require('pg');
var app = express();
var request = require('request');
var apiHelpers = require('./apihelpers.js');
var db = require('../database/schemas.js');
var dbHelpers = require('./dbhelpers.js');
var jwt = require('express-jwt');
var asyncMap = require('async').map;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// var connectionString = '';

// pg.connect(connectionString, onConnect);

// function onConnect(err, client, done) {
//   if (err) { console.error(err); }
//   console.log('Connected to the DATABASE');
// }

app.use(express.static(path.join(__dirname, '../public')));

var port = process.env.PORT || 8080;

app.listen(port, function() {
    console.log('Listening on port:' + port);
});

var authenticate = jwt({
  secret:'XUQKqoN2X1eI-RDHb86YWz0s9phWphG53SU2iFQInDq-DmVqQBpZ-792ze66gpez'
});

//create a new user
app.post('/api/users', authenticate, function(req, res) {
  var user = {};
  user.username = req.user.name;
  user.hash = req.user.user_id;
  dbHelpers.createUser(user, function(user, created) {
    if(created) {
      res.send('User created');
    } else {
      res.send('User already exists');
    }
  });
});

//get neighorhoods for a given city
app.get('/api/neighborhoods/searchbycity/:city/:state', function(req, res) {
  var city = req.params.city;
  var state = req.params.state;
  apiHelpers.getZillowHoods(city, state, function(err, hoods) {
    if(err) {
      res.sendStatus(404);
    } else {
      // function parseUrlState(url) {
      var parsedState = hoods[0].url[0].substring(33,35);
      var parsedCity = hoods[0].url[0].substring(36).split('/')[0];
      asyncMap(hoods, function(hood, callback) {
        var query = {
          neighborhood_name: hood.name[0],
          city: parsedCity,
          state: parsedState
        }
        dbHelpers.getNeighborhoodData(query, function(data) {
          if (data !== null) {
            callback(null, Object.assign(hood, data.dataValues));
          } else {
            callback(null, Object.assign(hood, query));
          }
        });
      }, function(error, hoods) {
        error ? res.sendStatus(404) : res.json(hoods);
      });
    }
  });
});

app.get('/api/neighborhoods/demographics/:neighborhood/:city', function(req, res) {
  var neighborhood = req.params.neighborhood;
  var city = req.params.city;
  apiHelpers.getZillowDemographics(neighborhood, city, function(err, demographics) {
    if (err) {
      res.sendStatus(404);
    } else {
      console.log('DEMOGRAPHICS RETURNED', demographics);
      res.json(demographics);
    }
  });
});

app.get('/api/neighborhoods/amenities/:lat/:lon', function(req, res) {
  var lat = req.params.lat;
  var lon = req.params.lon;
  apiHelpers.getAmenities(lat, lon, function(err, amenities) {
    if (err) {
      console.log('ERRORED OUT', err);
    } else {
      console.log('AMENITIES', amenities);
      res.json(amenities);
    }
  })
})

app.get('/api/neighborhoods/walk/:address/:latitude/:longitude', function (req, res) {
  let address = req.params.address;
  let lat = req.params.latitude;
  let lon = req.params.longitude;
  apiHelpers.getWalkScore(lat, lon, address, function(err, score) {
    if(err) {
      console.log('ERRORED OUT', err);
    } else {
      res.json(score);
    }
  })
});

app.get('/api/neighborhoods/googlephoto/:latitude/:longitude', function (req, res) {
  let lat = req.params.latitude;
  let lon = req.params.longitude;
  apiHelpers.getGooglePhotos(lat, lon, function(err, data) {
    if(err) {
      console.log('ERRORED OUT', err);
    } else {
      console.log(data, 'this is data')
      res.json(data);
    }
  })
});

app.post('/api/neighborhoods/reviews', authenticate, function(req, res) {
  var user = {};
  user.username = req.user.username;
  user.hash = req.user.user_id;
  dbHelpers.createUser(user, function(user, created) {
    dbHelpers.addReview(req.body, user.id, function(err, created) {
      if (created) {
        res.status(204).send('Review added');
      } else {
        res.send('You have already reviewed this neighborhood');
      }
    })
  })
});

app.get('/api/neighborhoods/reviews/:neighborhood/:city/:state', function(req, res) {
  var query = {
    city: req.params.city,
    state: req.params.state,
    neighborhood_name: req.params.neighborhood
  }
  dbHelpers.getReviews(query, function(data) {
    console.log(query);
    res.json(data);
  })
});

app.get('/api/neighborhoods/data/:neighborhood/:city/:state', function(req, res) {
  var query = {
    city: req.params.city,
    state: req.params.state,
    neighborhood_name: req.params.neighborhood
  }
  dbHelpers.getNeighborhoodData(query, function(data) {
    res.json(data);
  })
});

app.post('/api/votes', authenticate, function(req,res) {
  var user = {};
  user.username = req.user.username;
  user.hash = req.user.user_id;
  dbHelpers.createUser(user, function(user, created) {
    dbHelpers.addVote(req.body.positiveVote, req.body.reviewId, user.dataValues.id, function(err, created) {
      if (created) {
        res.status(204).send('Vote added');
      } else {
        res.send('You have already voted on this review');
      }
    })
  })
});

module.exports = app;

