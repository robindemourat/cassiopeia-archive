'use strict';

angular.module('cassiopeiaApp')
  .controller('MainCtrl', function ($scope, $http, $interval, $rootScope, $timeout, $location, $log, DateUtils, Angularytics) {

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
            Angularytics.trackEvent("Interaction", "New time span");
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
            Angularytics.trackEvent("Interation", "User clicked");
            addFilter({
                user_id : user.user.id,
                type : 'user',
                message : 'Show only tweets from',
                value : user.user.name + ' alias '+user.user.screen_name
            });
            $scope.displayedTweets = $scope.filteredTweets.slice(0, $scope.displayedTweetsLength);

        });

        $rootScope.$on('clickPeriod', function(e, period){
            Angularytics.trackEvent("Interation", "Period clicked");
            $scope.fromDate = period.begin_abs;
            $scope.toDate = period.end_abs;
            $scope.getLocalData([$scope.fromDate, $scope.toDate]);
            $scope.loading = true;
        });

        $scope.$watch('loading', function(loading){
            if(!loading && $scope.autoPlay){
                $timeout(function(){
                    $scope.seekForward();
                }, $scope.params.longTransitions * 2);
            }
        });

        $scope.$watch('autoPlay', function(autoPlay){
            Angularytics.trackEvent("Interaction", "Autoplay set");
            if(autoPlay){
                $scope.seekForward();
            }
        });

    };


    var initFunctions =  function(){


        $http
            .get('api/globaltimeline')
            .success(function(d){
                if(d.timeslots){

                    $scope.serverWorking = false;
                    $rootScope.$broadcast("globalDataUpdate", d);
                    $scope.absoluteBegin = d.begin_abs;
                    $scope.absoluteEnd = d.end_abs;
                    $timeout(function(){
                        $scope.dataAvailable = true;
                    });
                }else{
                    $scope.serverWorking = true;
                    setTimeout(initFunctions, 10000);
                }
            })
            .error(function(e){
                console.error('error while loading : ', e);
            });

        var search = $location.search();
        //get timespan from search params
        if(search.from && search.to){
            $scope.getLocalData([search.from, search.to]);
        //or get random timespan
        }else{
            var initialDuration = hour * 6;
            var begining = new Date("May 1, 2015");
            var end = new Date("June 21, 2015");
            var durationSpan = end.getTime() - begining.getTime() - initialDuration;
            var randomDate = begining.getTime() + parseInt(durationSpan * Math.random());

            var initBrush = [randomDate, randomDate + initialDuration];
            $scope.getLocalData(initBrush);
        }

        //get colors from search
        if(search.colors){
            $scope.colors = deUrifyColors(search.colors);
            console.info('got colors from url', $scope.colors);
        }else{
            $http
                .get('assets/cassiopeia-data/colors.csv')
                .success(updateColors)
                .error(function(e){
                    $log.error('colors input error : ',e);
                });
            }
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

        $scope.minimumSpan = min * 10;
        $scope.maximumSpan = day;

        $scope.filters = [];
        $scope.colors = [];
        $scope.tweetsList = [];
    };

    var onLocalUpdate = function(data){
        if(!data||!data.tweets)return;


        $timeout(function(){
            $scope.dataAvailable = true;
        });



        if(!data.processed){
            data.tweets = prepareTweets(data.tweets, $scope.colors);
            data.users = updateUsers(data.tweets, data.usersList, $scope.colors);
            data.timeline = updateTimelineProfile(data.tweets, /*$scope.fromDate, $scope.toDate*/undefined, undefined, $scope.colors);
            $scope.fromDate = data.timeline.begin_abs;
            $scope.toDate = data.timeline.end_abs;
            $scope.zoomLevel = $scope.activeTimeSpan / ($scope.maximumSpan - $scope.minimumSpan);
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
        });
        //console.log('local update');

        if(data.timeline.begin_abs && data.timeline.end_abs){
            $location.search('from',  data.timeline.begin_abs);
            $location.search('to',  data.timeline.end_abs);
        }

        updateDisplayedDates(data);

        $scope.transitionning = true;
        setTimeout(function(){
            $scope.$apply();
        })
        setTimeout(function(){
            $scope.transitionning = false;
            $scope.$apply();
        }, 2000);

        data = null;
    };


    /*
    API CALLS
    */
    $scope.getLocalData = function(timespan){
        $scope.loading = true;
        var dataRequest = '/api/slice/'+parseInt(timespan[0])+'/'+parseInt(timespan[1]);
        console.info('launching local data request ', dataRequest);
        $scope.fromDate = timespan[0];
        $scope.toDate = timespan[1];
        $scope.activeTimeSpan = $scope.toDate - $scope.fromDate;
        $http
            .get(dataRequest)
            .success(onLocalUpdate)
            .error(function(e){
                console.error('init local data request error : ', e);
                $scope.loading = false;
            });
    }

    /*
    TIME TRAVELLING
    */

    $scope.seekForward = function(){
        Angularytics.trackEvent("Interaction", "Forward/backward used");
        var wanted = $scope.fromDate + $scope.activeTimeSpan/4;

        if(wanted <= $scope.absoluteEnd){
            $scope.getLocalData([wanted, wanted + $scope.activeTimeSpan]);
        }else{
            $scope.autoPlay = false;
        }
    }

    $scope.seekBackward = function(){
        Angularytics.trackEvent("Interaction", "Forward/backward used");
        var wanted = $scope.fromDate - $scope.activeTimeSpan/4;

        if(wanted >= $scope.absoluteBegin){
            $scope.getLocalData([wanted, wanted + $scope.activeTimeSpan]);
        }
    }

    $scope.zoomTo = function(newZoom){
        Angularytics.trackEvent("Interaction", "Zoom changed");
        var newSpan = ($scope.maximumSpan - $scope.minimumSpan)* newZoom;
        if(newSpan >= $scope.minimumSpan && newSpan <= $scope.maximumSpan){
            var middle = $scope.fromDate + ($scope.toDate - $scope.fromDate) / 2;
            var newBegining = middle - newSpan/2;
            var newEnd = middle + newSpan/2;
            if(newBegining >= $scope.absoluteBegin && newEnd <= $scope.absoluteEnd){
                $scope.zoomLevel = newZoom;
                $scope.getLocalData([newBegining, newEnd]);
            }
        }
    }

    $scope.zoomByClick = function(event){
        var x = event.offsetX,
            width = angular.element(event.target).width(),
            rapport= x/width;

        $scope.zoomTo(1 - rapport);
    }

    $scope.zoomOut = function(){
        $scope.zoomTo($scope.zoomLevel + .1);
    }

    $scope.zoomIn = function(){
        $scope.zoomTo($scope.zoomLevel - .1);
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

    var deUrifyColors = function(str){
        str = decodeURIComponent(str);
        var colors = str.split('|||');
        var output = [];
        colors.forEach(function(colorStr){
            var vals = colorStr.split('||');
            var color = {};
            color.expressions = vals[0].split('|').map(function(exp){
                return exp.trim();
            });
            color.color = (vals[2])?vals[1].trim():undefined;
            color.name = (vals[2])?vals[2].trim():undefined;
            output.push(color);
        });
        return output;
    }

    var urifyColors = function(colors){
        var str = '';
        colors.forEach(function(color, i){
            var colorStr = '';
            colorStr+= color.expressions.join('|') + '||';
            colorStr += color.color + '||';
            colorStr += color.name;
            if(i != colors.length - 1){
                colorStr += '|||';
            }
            str += colorStr;
        });
        return encodeURIComponent(str);
    }

    $scope.removeColor = function(index){
        $scope.colors.splice(index, 1);
        updateColors();
    }

    $scope.addColor = function(expr, col, name){
        if(!expr || !col || !name){
            return;
        }
        Angularytics.trackEvent("Interaction", "color added");

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
            var vals = content.split('\n').map(function(val){
                return val.replace(/"/g, '');
            });
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



        var uriColors = urifyColors($scope.colors);
        $location.search('colors', uriColors);

        setTimeout(function(){
            $scope.$apply();
            if($scope.tweetsList.length){
                console.log('updated colors, launching onupdate')
                onLocalUpdate({tweets:$scope.tweetsList});
            }
        });
    }

    /* color file upload */

    $scope.$watch('files', function () {
            Angularytics.trackEvent("Interaction", "Color file uploaded");
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
        var ticking = DateUtils.computeGlobalTicksType(timeline.begin_abs, timeline.end_abs);
        var span = timeline.end_abs - timeline.begin_abs;
        //set to live tweet if the users asks the end of timeline
        var now = new Date();
        $scope.displayedBegin = (ticking.formatting(new Date(timeline.begin_abs)));
        $scope.displayedEnd = (ticking.formatting(new Date(timeline.end_abs)));
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


    $scope.makeShareUrl = function(){
        return window.location.href.split('?')[0];
    }

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
