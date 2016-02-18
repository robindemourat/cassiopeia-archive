/**
 * Main application file
 */

'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express');
var config = require('./config/environment');
// Setup server
var app = express();
var util = require('util');
var fs = require('fs');
// var oboe = require('oboe');
var dataHandler = require('./data-manager.js');

//dependencies
var server = require('http').createServer(app);

// require('events').EventEmitter.prototype._maxListeners = 0;


var request = require('request');
require('./config/express')(app);
require('./routes')(app);
exports = module.exports = app;
var globalTimelineProfile = [];

var fs = require('fs');

//abs dates utils
var sec = 1000,
  min = sec * 60,
  hour = min * 60,
  day = hour * 24,
  week = day * 7,
  month = day * 31;

// var externalSourceUpdateDelay = 2 * hour;//30 * min;//delay from updating from external json
var globalTimelineProfile  =[];//client-related global timeline
var jsonData, lastHour;

/*
  DATA PROCESSING FOR VIS
*/
//UNUSED
//I try to make a coherent choice of which timespan to set for timeline bars regarding the length of the period of time that is being covered by the timeline
var defineTimeSpan = function(range){
  if(range > 2 * month){
    return day;
  }else if(range > 6 * day){
    return hour;
  }else if(range > 1 * day){
    return 10 * min;
  }else if(range > 2 * hour){
    return 5 * min;
  }else if(range > min*10){
    return min;
  }else if(range > min){
    return sec * 10;
  }else return sec;
}

//UNUSED
//I make timeline data from a list of tweets, possibly decorated with color settings
var updateTimelineProfile = function(tweets, from, to, colors){
  // console.log('update timeline profile : ', tweets.length, new Date(from), to, colors);
  var min_abs = (from)?from:tweets[tweets.length-1].created_at_abs,
    max_abs = (to)?to:tweets[0].created_at_abs,

    min_bars_abs = new Date(min_abs),
    max_bars_abs = new Date(max_abs),

    timeSpan = defineTimeSpan(max_abs - min_abs);

  // console.log('time span defined ', timeSpan, 'min bar abs : ', min_bars_abs, ', max bar abs : ', max_bars_abs);

  //cleaning bars regarding timespans
  if(timeSpan >= min){
    min_bars_abs.setSeconds(0);
  }
  if(timeSpan >= hour){
    min_bars_abs.setMinutes(0);
  }
  if(timeSpan >= day){
    min_bars_abs.setHours(0);
  }

  if(timeSpan == 10 * min){
    min_bars_abs.setMinutes(0);
  }

  if(timeSpan == 10 * sec){
    min_bars_abs.setSeconds(parseInt(min_bars_abs.getSeconds()/10)*10);
  }

  var time = min_bars_abs.getTime();
  var timeSlots = new Array(parseInt((max_bars_abs - min_bars_abs)/timeSpan));

  //feeding time slots
  for(var i = 0; i < timeSlots.length ; i++){
    var end = time + timeSpan;
    timeSlots[i] = {
      begin_abs : time,
      begin : new Date(time),

      end_abs : end,
      end : new Date(end),

      count : 0,

      colors : []
    };
    time+= timeSpan;
  };
  console.log('processing tweets');
  for(var i in tweets){
    var t = tweets[i],
      index;
    for(var j in timeSlots){
      if(t.created_at_abs >= timeSlots[j].begin_abs && t.created_at_abs <= timeSlots[j].end_abs){
        timeSlots[j].count++;
        //set colors
        if(t.color != undefined){
          var has = false;
          timeSlots[j].colors.filter(function(d){
            if(d.color === t.color)
              has = true;
            return has;
          }).forEach(function(d){
            d.count++;
          });
          if(!has){
            timeSlots[j].colors.push({
              color : t.color,
              count : 1,
              expression : t.expression
            })
          }
        }
        break;
      }
    }
  }
  console.log('done with timeline');

  return {
    timeslots : timeSlots,

    begin_abs : min_abs,
    end_abs : max_abs,

    min_bars_abs : min_bars_abs.getTime(),
    max_bars_abs : max_bars_abs.getTime(),

    total : tweets.length,

    timeSpan : timeSpan
  }
};



/*
  MINI API
*/


app.getLocalData = function(params, callback){

  var data = {};
  dataHandler.getSlice(params.from, params.to, function(error, tweets){
    if(tweets.length == 0){
      console.log('tweets length is 0, leaving');
      return;
    }
    console.log('tweets loaded, processing');
    data.tweets = tweets;
    return callback(data);
  });
}

app.getGlobalTimelineProfile = function(){
  return globalTimelineProfile;
}




// Start server
server.listen(process.env.PORT || config.port);


dataHandler.init(function(err, tweets){
  console.log('data handler ready');
});
