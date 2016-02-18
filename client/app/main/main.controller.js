'use strict';

angular.module('cassiopeiaApp')
  .controller('MainCtrl', function ($scope, $http, $interval, $rootScope, $timeout, $location, $log, DateUtils) {

    var begin = true;

    var sec = 1000,
            min = sec * 60,
            hour = min * 60,
            day = hour * 24,
            week = day * 7,
            month = day * 31;


    /*
    INITIALIZATIONS
    */

    var initWatchers = function(){

        $scope.$on('destroy', function(){

        });

        /* LINKED VIS CONTROL */

        $rootScope.$on('overPeriod', function(){
            $scope.onUserInteraction = true;
        });

        $rootScope.$on('outPeriod', function(){
            $scope.onUserInteraction = false;
        });

        $rootScope.$on('newtimespan', function(e, timespan){
            console.log('new timespan : ', timespan);
            $scope.getLocalData(timespan);
        })


        $rootScope.$on('overUser', function(e, user){
            $scope.onUserInteraction = true;
            var selected=$scope.tweetsList.filter(function(d){
                    return d.user_id === user.user.id;
                });
            if(selected.length > 0){
                $scope.displayedTweets = selected;
            }
            $scope.$apply();
        });

        $rootScope.$on('outUser', function(e, user){
            $scope.onUserInteraction = false;
            $scope.displayedTweets = $scope.filteredTweets.slice(0, $scope.displayedTweetsLength);
            $scope.$apply();
        });

        $rootScope.$on('userClicked', function(d, user){

            addFilter({
                user_id : user.user.id,
                type : 'user',
                message : 'Show only tweets from',
                value : user.user.name + ' alias '+user.user.screen_name
            });
            $scope.displayedTweets = $scope.filteredTweets.slice(0, $scope.displayedTweetsLength);

        });

        $rootScope.$on('clickPeriod', function(e, period){
            console.log('click period ', e);
            $scope.fromDate = period.begin_abs;
            $scope.toDate = period.end_abs;
            $scope.getLocalData([$scope.fromDate, $scope.toDate]);
            $scope.loading = true;
        });

    };


    var initFunctions =  function(){
        $http
            .get('assets/cassiopeia-data/colors.csv')
            .success(updateColors)
            .error(function(e){
                $log.error('colors input error : ',e);
            });

        $http
            .get('api/globaltimeline')
            .success(function(d){
                if(d.timeslots){
                    $rootScope.$broadcast("globalDataUpdate", d);
                    $scope.dataAvailable = true;
                }
            });


        var initialDuration = hour * 6;
        var begining = new Date("May 1, 2015");
        var end = new Date("June 21, 2015");
        var durationSpan = end.getTime() - begining.getTime() - initialDuration;
        var randomDate = begining.getTime() + parseInt(durationSpan * Math.random());

        var initBrush = [randomDate, randomDate + initialDuration];
        $scope.getLocalData(initBrush);
    };

    var initVariables = function(){

        $scope.query = 'cop21';
        $scope.loading = true;
        $scope.params = {
            shortTransitions : 100,
            mediumTransitions : 500,
            longTransitions : 1000,
            visMode : 'nova'
        };
        $scope.displayedTweetsSpan = 20;//default number of tweets displayed in right column's list
        $scope.displayedTweetsLength = $scope.displayedTweetsSpan;//computed length of tweet list
        $scope.tempFilterValue = '';

        $scope.filters = [];
        $scope.colors = [];
        $scope.tweetsList = [];
    };

    var onLocalUpdate = function(data){
        if(!data||!data.tweets)return;

        console.log('updating locally, colors :', $scope.colors);

        $scope.dataAvailable = true;

        if(!data.processed){
            data.tweets = prepareTweets(data.tweets, $scope.colors);
            data.users = updateUsers(data.tweets, data.usersList, $scope.colors);
            data.timeline = updateTimelineProfile(data.tweets, $scope.fromDate, $scope.toDate, $scope.colors);
        }


        for(var i in data.tweets){
            try{
                data.tweets[i].text = (decodeURIComponent(escape(data.tweets[i].text)));
                data.tweets[i].user_screen_name = (decodeURIComponent(escape(data.tweets[i].user_screen_name)));
                data.tweets[i].user_name = (decodeURIComponent(escape(data.tweets[i].user_name)));

            }catch(er){
                //console.log(er);
            }

        }

        $rootScope.$broadcast('localDataUpdate', data);
        $scope.tweetsList = data.tweets;
        updateFilters();
        if(!$scope.onUserInteraction){
            $scope.displayedTweets = $scope.filteredTweets.slice(0, $scope.displayedTweetsLength);
        }
        $timeout(function(){
            $scope.loading = false;
        })
        //console.log('local update');



        updateDisplayedDates(data);

        $scope.transitionning = true;
        setTimeout(function(){
            $scope.$apply();
        })
        setTimeout(function(){
            $scope.transitionning = false;
            $scope.$apply();
        }, 2000);

    };


    /*
    API CALLS
    */
    $scope.getLocalData = function(timespan){
        $scope.loading = true;
        var dataRequest = '/api/slice/'+parseInt(timespan[0])+'/'+parseInt(timespan[1]);
        console.info('launching local data request ', dataRequest);
        $http
            .get(dataRequest)
            .success(onLocalUpdate)
            .error(function(e){
                console.error('init local data request error : ', e);
                $scope.loading = false;
            });
    }


    /*
    DATA PROCESSING
    */

    //I update a user with a new tweet, by verifying that it does not exist, attributing a color to the user, and updating its min and max update dates
    var updateUser = function(tweet, user){
           var u;

            if(!user)
                u = {
                    user : {
                        id : tweet.user_id,
                        screen_name : tweet.user_screen_name,
                        image : tweet.profile_image_url,
                        name : tweet.user_name
                    },
                    values : []
            };
            else u = user;
            var exists = false, tindex;
            for(var i in u.values){
                if(tweet.id === u.values[i].id){
                    tindex = i;
                    exists = true;
                    break;
                }
            }
            //add the new tweet to user
            if(!exists){
                u.values.push(tweet);
                tindex = u.values.length - 1;
            }

            //color
            /*if(u.values.length === 1){
                console.log(tindex);
            }*/
            if(tweet.color && tindex == 0){
                u.color = tweet.color;
            }

            //update first and last update
            var min = Infinity, max = -Infinity;
            var tweets = u.values;
            for(var i in tweets){
                var t = tweets[i].created_at_abs;
                if(t >= max)
                    max = t;
                if(t <= min)
                    min = t;
            }
            u.firstUpdateOnTopic = min;
            u.lastUpdateOnTopic = max;


            return u;
     }

    //I attribute a tweet to list of users, and return the list of users
    var updateUsersWithNewTweet = function(tweet, users){
            if(!tweet.user_id||!users)
                return;
            //users are already filled
            else if(users.length > 0){
                var user_id = tweet.user_id, hasUser = false;
                for(var i in users){
                    if(users[i].user.id === user_id){
                        hasUser =true;
                        users[i] = updateUser(tweet, users[i]);
                        return users;
                    }
                }
                if(!hasUser){
                    users.push(updateUser(tweet));
                }
                return users;

            //first user creation
            }else{
                users.push(updateUser(tweet));
                return users;
            }
      };

    //I nest a list of tweets into a list of users
    var updateUsers = function(tweets, users){
        if(!users)
            users = [];
        for(var i in tweets){
            users = updateUsersWithNewTweet(tweets[i], users);
        }
        return users;
    }

    //I try to make a coherent choice of which timespan to set for timeline bars regarding the length of the period of time that is being covered by the timeline
    var defineTimeSpan = function(range){

        if(range > 2 * month){
            return day;
        }else if(range > 6 * day){
            return hour;
        }else if(range > 1 * day){
            return 10 * min;
        }
        else if(range > 2 * hour){
            return 5 * min;
        }else if(range > min*10){
            return min;
        }else if(range > min){
            return sec * 10;
        }else return sec;
    }

    //I make timeline data from a list of tweets, possibly decorated with color settings
    var updateTimelineProfile = function(tweets, from, to, colors){
        var ok = tweets && tweets.length && tweets[tweets.length-1].created_at_abs;
        if(!ok)return;


        var min_abs = (from)?from:tweets[tweets.length-1].created_at_abs,
            max_abs = (to)?to:tweets[0].created_at_abs,

            min_bars_abs = new Date(min_abs),
            max_bars_abs = new Date(max_abs),

            timeSpan = defineTimeSpan(max_abs - min_abs);

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
            min_bars_abs.setSeconds(parseInt(min_bars_abs.getSeconds()/10) * 10);
        }


        var time = min_bars_abs.getTime();
        var timeSlots = new Array(parseInt((max_bars_abs - min_bars_abs)/timeSpan));

        //feeding time slots
        for(var i = 0; i < timeSlots.length ; i++){
            var end = time + timeSpan;
            var c = (colors)?colors.slice():undefined;
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

    //I attribute colors to a list of tweets
    var prepareTweets = function(tweets, colors){

        if(!colors)
            return tweets;

        var expression;


        for(var i in tweets){
            for(var j in colors){
                if(tweets[i].color)
                    break;
                for(var k in colors[j].expressions){
                    expression = colors[j].expressions[k];
                    if(tweets[i].user_name.indexOf(expression) > -1 || tweets[i].user_screen_name.indexOf(expression)> -1){
                        tweets[i].color = colors[j].color;
                        tweets[i].expression = colors[j].name;
                        break;
                    }else if(tweets[i].text.toLowerCase().match(new RegExp(expression.toLowerCase()))){
                        tweets[i].color = colors[j].color;
                        tweets[i].expression = colors[j].name;
                        break;
                    }
                }

            }
        }
        return tweets;
    };




    /*
    COLORS SETTING
    */

    $scope.removeColor = function(index){
        $scope.colors.splice(index, 1);
        updateColors();
    }

    $scope.addColor = function(expr, col, name){
        if(!expr || !col || !name){
            return;
        }
        $scope.tempColorExpression = "";
        $scope.tempColorName = "";
        $scope.tempLegend = "";
        $scope.colors.push({expressions: [expr], color : col, name : name});
        updateColors();
    }

    var updateColors = function(content){
        //update content
        //csv content
        if(content){
            var vals = content.split('\n');
            for(var i = 1; i < vals.length ; i++){
                var detail = vals[i].split(';');
                var expressions = detail[0].split(',');
                expressions = expressions.map(function(expression){
                    return expression.trim();
                });

                var color = (detail[1])?detail[1].trim():'';
                var name = (detail[2])?detail[2].trim():'';


                if(!expressions.length || !color.length || !name.length){
                    continue;
                }

                $scope.colors.push({
                    name : name,
                    color : color,
                    expressions : expressions
                });
            }
        }

        if($scope.tweetsList.length){
            onLocalUpdate({tweets:$scope.tweetsList});
        }

        setTimeout(function(){
            $scope.$apply();
        });
    }

    /* color file upload */

    $scope.$watch('files', function () {
            $scope.uploadcolorfile($scope.files);
    });

    $scope.uploadcolorfile = function(files){
        if(files && files.length){
            var file = files[0];
            var fR = new FileReader();
            fR.addEventListener("load", function(event) {
                var textFile = event.target;
                var content = textFile.result.trim();

                updateColors(content);
                $scope.$apply();

            });
            //Read the text file
            fR.readAsText(file);
            $scope.optionsVisible = false;//to finish with hide options
        }
    }

    /*
    FILTERS BUILDING
    */

    var updateFilters = function(){
        $scope.filteredTweets = $scope.tweetsList;
        for(var i in $scope.filters){
            var filter = $scope.filters[i];
            switch(filter.type){
                case 'user':
                    $scope.filteredTweets = $scope.filteredTweets.filter(function(d){

                        return d.user_id === filter.user_id;
                    });
                break;

                case 'term':
                    // console.log('before', $scope.filteredTweets.length);
                    $scope.filteredTweets = $scope.filteredTweets.filter(function(d){
                        return d.text.toLowerCase().indexOf(filter.value.toLowerCase())> -1;
                    });
                    // console.log('after', $scope.filteredTweets.length);
                break;
            }
        }
        $scope.displayedTweets = $scope.filteredTweets.slice(0, $scope.displayedTweetsLength);
    }

    var addFilter = function(filter){
        var exists;
        $scope.filters.some(function(other){
            if(filter.type === other.type && filter.value === other.value){
                return exists = true;
            }
        });
        if(!exists){
            $scope.filters.push(filter);
            updateFilters();
        }
    }

    var filterMessages = {
        'user' : 'show only tweets of user',
        'term': 'show only tweets containing'
    }

    $scope.addTermFilter = function(){
        var toAdd = {
                type : 'term',
                value : $scope.tempFilterValue,
                message: filterMessages.term
            };


        addFilter(toAdd);
        $scope.tempFilterValue = '';
    }

    $scope.addUserFilter = function(tweet){
        addFilter({
            type : 'user',
            value : tweet.user_name+' alias '+tweet.user_screen_name,
            user_id : tweet.user_id,
            message: filterMessages.user
        });
    }

    $scope.removeFilter = function(index){
        $scope.filters.splice(index, 1);
        updateFilters();
    }

    var getFilterMessage = function(type){
        return $scope.filterMessages[type];
    }

    /*
        USER INTERACTIONS ON COLUMNS
    */


    $scope.overTweet = function(tweet){
        $rootScope.$broadcast('overTweet', tweet);
    };

    $scope.outTweet = function(tweet){
        $rootScope.$broadcast('outTweet', tweet);
    };

    //list control
    $scope.showMore = function(){
        $scope.displayedTweetsLength = $scope.displayedTweetsLength + $scope.displayedTweetsSpan;
        $scope.displayedTweets = $scope.filteredTweets.slice(0, $scope.displayedTweetsLength);
    }

    /*
    DISPLAY UTILS
    */

    var updateDisplayedDates = function(d){
        var timeline = d.timeline;
        var ticking = DateUtils.computeTicksType(timeline.begin_abs, timeline.end_abs);
        var span = timeline.end_abs - timeline.begin_abs;
        //set to live tweet if the users asks the end of timeline
        var now = new Date();
        $scope.displayedBegin = (ticking.formatting(new Date(timeline.begin_abs))) + ' 2015';
        $scope.displayedEnd = (ticking.formatting(new Date(timeline.end_abs))) + ' 2015';
    }


    //choose which color to attribute to an item
    $scope.getContrastYIQ = function(hexcolor){
            if(!hexcolor)
              return;
            if(hexcolor.length > 6){
              hexcolor = (hexcolor.substring(1));
            }
            var r = parseInt(hexcolor.substr(0,2),16);
            var g = parseInt(hexcolor.substr(2,2),16);
            var b = parseInt(hexcolor.substr(4,2),16);
            var yiq = ((r*299)+(g*587)+(b*114))/1000;
            return (yiq >= 128) ? '#493132' : '#ffdfc2';
    };

    /*
    DATA PROCESSING UTILS
    */

    var tweetDateFormat = d3.time.format('%A %d of %B, %Hh%M');

    $scope.tweetDateFormat = function(date){
        return tweetDateFormat(new Date(date));
    }


    //input csv w/ header, output list of flat json objects
    function csvJSON(csv){

      var lines=csv.split("\n");
      var result = [];
      var headers=lines[0].split(",");

      for(var i=1;i<lines.length;i++){
          var obj = {};
          var currentline=lines[i].split(",");

          for(var j=0;j<headers.length;j++){
              obj[headers[j]] = currentline[j];
          }
          result.push(obj);
      }
      return JSON.stringify(result); //JSON
    }

    /*
    INITIATING
    */
    initVariables();
    initFunctions();
    initWatchers();

  });
