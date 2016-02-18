var fs = require('fs');
var oboe = require('oboe');
var inputAddress = __dirname + '/data/tweets-cop21.min.json';
var timelineAddress = __dirname + '/data/global-timeline-profile.json';
var manager = {};
var count = 0;
var tweets = [],
    globalTimeline;

manager.init = function(callback){
  console.log('manager : initiating');
  oboe( fs.createReadStream( inputAddress ) )
   .node('!.*', function(tweet){
      count++;
      if(count%5000 === 0){
        console.log('loading tweet ', count);
      }
   })
   .done(function(finalJSON){
    tweets = finalJSON.reverse();
    console.log('manager : tweets ok, getting global timeline');
    // callback(undefined, finalJSON);
    fs.readFile(timelineAddress, 'utf8', function(err, timeline){
      if(err){
        console.log('error while parsing globaltimeline file ', err);
        callback(err, finalJSON);
      }else{
        try{
          globalTimeline = JSON.parse(timeline);
          console.log('manager init : global timeline ok, calling back');
          callback(undefined, finalJSON);
        }catch(e){
          callback(e, finalJSON);
          console.log('error while deserializing globaltimeline json : ', e);
        }
      }
    })
   })
    .fail(function(e){
      callback(e, undefined);
    })
}

manager.loaded = function(){
  return tweets.length > 0;
}

manager.getSlice = function(from, to, callback){
  if(!callback){
    return;
  }
  console.log('data manager : get slice from ', new Date(from), ' to ', new Date(to), ', tweets length : ', tweets.length);
  if(tweets.length === 0){
    return callback(undefined, []);
  }else{
    return callback(undefined, tweets.filter(function(tweet){
      return tweet.created_at_abs >= from && tweet.created_at_abs <= to;
    }));
  }
}

manager.getGlobalTimeline = function(){
  if(globalTimeline){
    return globalTimeline;
  }else{
    return [];
  }
}


module.exports = manager;
