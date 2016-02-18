'use strict';

angular.module('cassiopeiaApp')
  .directive('cassiopeia', function ($rootScope, $timeout, nova, $window) {
    return {
      scope : {
      	shortTransitions : '@shorttransitions',      	
      	mediumTransitions : '@mediumtransitions',      	
      	longTransitions : '@longtransitions',      	
      	visMode : '@vismode',
      	externalInfo : '@externalinfo'
      },
      restrict: 'EA',
      link: function (scope, element, attrs) {

      	var container = d3.select('#' + angular.element(element).attr('id')),
      		width, height,
      		svg = container
 				 .append('g')
 				 .attr('class', 'container-group'),
			nova = d3.layout.nova(),
			nodeSize, size, scaleVal, meteorStarted = false,
			x = d3.scale.linear(),
			y = d3.scale.linear(),
			onUpdate = false,
			radiusScale = d3.scale.linear().range([0, .3]), 
			begin, 
			end, 
			users, 
			showChildren,
			actualNodeSize,
			onNewTweet = false,
			tweetTooltip = d3.select('.tweet-tooltip'),
			nbTweets= 0,
    		tweetDateFormat = d3.time.format('%A %d of %B, %Hh%M');
			;

		var flashTooltip = function(tweet, auto){
	        	tweetTooltip
	       		.style('z-index', 10)
	       		.transition()
	       		.duration(500)
	       		.style('opacity', 1)

	       		tweetTooltip
	       		.transition()
	       		.delay(3000)
	       		.duration(500)
	       		.style('opacity', 1e-6)
       			.each('end', function(){
       				d3.select(this).style('z-index', -1);
       			});

       			tweetTooltip
       			.select('.username')
       			.text(function(){
       				return tweet.user_name;
       			});

       			tweetTooltip
       			.select('.screenname')
       			.text(function(){
       				return tweet.user_screen_name;
       			});

       			tweetTooltip
       			.select('.tweet-text')
       			.text(function(){
       				return tweet.text;
       			});



       			var element = d3.selectAll('.cassiopeia-user,.cassiopeia-tweet')
       							.filter(function(d){
       								if(d.user){
       									return d.user.id == tweet.user_id;
       								}else return d.user_id == tweet.user_id;
       							}), pos;
       			if(element[0][0]){
       				pos = element[0][0].getBoundingClientRect();

	       			var w = tweetTooltip[0][0].offsetWidth,
	       				h = tweetTooltip[0][0].offsetHeight;


	       			var top = (auto === true)?pos.top - h/2:d3.event.offsetY - h/2;
	       			var right = (auto === true)?50:window.innerWidth - d3.event.offsetX +20;

	       			if(right > window.innerWidth - w){
	       				right = window.innerWidth - d3.event.offsetX - w - 20
	       			}

	       			if(top < 20)
	       				top = 20;


	       			tweetTooltip
	       			.style('right', function(){
	       				return right + 'px';
	       			})
	       			.style('top', function(){
	       				return top + 'px';
	       			});
	       		}
	      }//end flash tooltip

		//UPDATE FUNCTION
        var update = function(e, data){


        	showChildren = (data.users.length < 800)?true:false;

        	begin = data.timeline.begin_abs,
    		end = data.timeline.end_abs,
    		users = (showChildren)?
			    		nova(data.users, function(d){
			    			return d.lastUpdateOnTopic;
			    		}, function(d){
			    			return d.firstUpdateOnTopic;
			    		}, begin, end, data.timeline.timeSpan, function(d){
			    			//tweets accessors for nested display
			    			return d.created_at_abs;
			    		})
			    		:
			    		nova(data.users, function(d){
			    			return d.lastUpdateOnTopic;
			    		}, function(d){
			    			return d.firstUpdateOnTopic;
			    		}, begin, end, data.timeline.timeSpan);

	    	resize();

	    	onUpdate = true;
	    	$timeout(function(){
	    		onUpdate = false;
	    	},1000);

	    	var maxTweets = d3.max(users, function(d){
	    		return d.values.length;
	    	}),
	    	minTweets = d3.min(users, function(d){
	    		return d.values.length;
	    	});
	    	radiusScale.domain([minTweets, maxTweets]);


	    	//if new tweet
	        if(nbTweets < data.tweets.length){
	        	onNewTweet = true;
	        }else onNewTweet = false;
	        nbTweets = data.tweets.length;
	        //console.log(users.length , svg.selectAll('.cassiopeia-user')[0].length, onNewTweet)


    		//DATA BINDING
        	var els = svg
	        .selectAll('.cassiopeia-user')
	        .data(users, function(d,i){
	        	return d.user.id;
	        });


	        

	        //ENTER
	        var enter = els
	        .enter()
	        .append('g')
	        .attr('class', 'cassiopeia-user')
	        .attr('transform', function(d){
	        	return 'translate('+x(end)+','+y(0)+')scale(0)';
	        });



	        //CHILDREN
	        if(showChildren){
	        	els.each(function(d,i){
					var data = d;
					var vals = data.values.slice(1);
					var children = d3.select(this)
									.selectAll('.cassiopeia-tweet')
									.data(vals);

					var enter = children
								.enter()
								.append('g')
								.attr('class', 'cassiopeia-tweet')
								.attr('id', function(){
									return d.id;
								})
								.attr('transform', 'scale(0)');
					enter
					.append('path')
					.attr('class', 'mini-shape')
					.attr('d', 'M -3 0 L 0 -3 L 3 0 L 0 3 Z');

					if(scope.externalInfo == 'false'){
						enter.on('mouseover', flashTooltip);
						enter.on('mousemove', flashTooltip);
					}
					


					children.selectAll('.connection').remove();

					children
					.append('line')
					.attr('class', 'connection')
					.attr('x1', 0)
					.attr('y1', 0)
					.attr('x2', 0)
					.attr('y2', 0)
					.style('stroke', function(t){
						return (t.color)?t.color:'#FFDFC2';
					});
					
					children
					.select('.mini-shape')
					/*.transition()
					.duration(1000)*/
					.style('fill', function(t){
						return (t.color)?t.color:'#FFDFC2';
					});





					children.exit().remove();
				});//end of children update
	        }else{
	        	d3.selectAll('.cassiopeia-tweet').remove();
	        }
				

	        

	        

	        //transparent circle for interactivity
	        enter.append('circle')
	        .attr('class', 'subshape')
	        .attr('cx', 0)
	        .attr('cy', 0)
	        .attr('r', function(d){
	        	return radiusScale(d.values.length);
	        });

	        enter
	        .append('circle')
	        .attr('class', 'shape')
	        .attr('cx', 0)
	        .attr('cy', 0)
	        .attr('r', function(d){
	        	return 0.1;//radiusScale(d.values.length);
	        })
	        .style('fill', function(d){
	        	return d.color?d.color:'#FFDFC2';
	        });

	        enter
	        .append('circle')
	        .attr('class', 'stroke')
	        .attr('cx', 0)
	        .attr('cy', 0)
	        .attr('r', function(d){
	        	return 0.1;
	        });


	        


	        var onHover = function(d, i){
	        	svg.selectAll('.cassiopeia-user')
	        	.transition()
	        	.duration(500)
	        	.style('opacity', .4);

	        	d3.select(this)
	        	.transition()
	        	.duration(500)
	        	.style('opacity', 1);

	        	$rootScope.$broadcast('overUser', d);

	        };



	        enter.on('mouseover', onHover)
	        .on('mousemove', onHover)
	        .on('mouseleave', function(d){
	        	svg.selectAll('.cassiopeia-user')
	        	.transition()
	        	.duration(500)
	        	.style('opacity', .8);
	        	$rootScope.$broadcast('outUser', d);


	        	tweetTooltip
	        	.transition()
	        	.duration(500)
	       		.style('opacity', 1e-6)
       			.each('end', function(){
       				d3.select(this).style('z-index', -1);
       			});
	        })
	        .on('click', function(d){
	        	$rootScope.$broadcast('userClicked', d)
	        });

	        


	        //hover user
	        enter.selectAll('circle')
	        .on('mouseover', function(d){
	        	if(scope.externalInfo == "false"){
	        		flashTooltip(d.values[0]);
	        	}
	        })

	        //tooltip on new tweet
	       	if(scope.externalInfo == 'false' && onNewTweet){
	       		var lastTweet = data.tweets[data.tweets.length - 1];
	       		flashTooltip(lastTweet, true);
	       	}

	       
	        
	        //EXIT
	        els
	        .exit()
	        .style('opacity', .8)
	        .attr('class', 'exit')
	        .remove()
	        ;

	        //UPDATE
	        //position update
	        els
	        .transition()
	        .duration(1000)
	        .attr('transform', function(d){
	        	return 'translate('+x(d.x)+','+y(d.y)+')scale(1)';
	        });

	        //shapes update
	        els
	        .select('.subshape')
	        .transition()
	        .duration(scope.mediumTransitions)
	        .attr('r', function(d){
	        	return radiusScale(.1 + d.values.length)*2;
	        });


	        els
	        .select('.stroke')
	        .transition()
	        .duration(scope.mediumTransitions)
	        .style('stroke', function(d){
	        	return (d.color)?d.color:'#FFDFC2';
	        })
	        .attr('r', function(d){
	        	return .2 + radiusScale(d.values.length);
	        })
	        ;

	        els
	        .select('.shape')
	        .transition()
	        .delay(500)
	        .duration(1000)
	        .attr('r', function(d){
	        	return .2 + radiusScale(d.values.length * .8);
	        })
	        .style('fill', function(d){
	        	return d.color?d.color:'#FFDFC2';
	        });

			
			
			resize();
      	};//end of update function


      	/*
      		RESIZE CUISINE - TO IMPROVE
      	*/
      	var resize = function(){
    		var dims = getElementDimensions();

    		x.range([0, dims.w]);
    		y.range([0, dims.h]);

    		var nodeSize = nova.nodeSize();
    		if(!nodeSize)
    			return;

    		var wSize = (dims.w) * nodeSize[0];
    		var hSize = (dims.h) * nodeSize[1];
    		actualNodeSize = (wSize < hSize)?wSize:hSize;

    		d3.selectAll('.cassiopeia-user')
    		.transition()
    		.duration(1000)
    		.attr('transform', function(d, i){
    			return 'translate('+x(d.x) + ',' + y(d.y) + ')scale('+actualNodeSize+')';
    		});


    		d3.selectAll('.cassiopeia-tweet')
    		.transition()
    		.duration(1000)
    		.attr('transform', function(d, i){
    			return 'translate('+x(d.relx)/actualNodeSize + ',' + y(d.rely)/actualNodeSize + ')scale('+1/actualNodeSize /*(1/(actualNodeSize))*/+')';
    		});

    		d3.selectAll('.cassiopeia-tweet .mini-shape')
    		.transition()
    		.duration(1000)
    		.attr('transform', function(d, i){
    			return 'scale('+Math.log(actualNodeSize) * .3 +')';
    		});


    		d3.selectAll('.cassiopeia-tweet .connection')
    		.attr('x2', function(d){
    			return x(d.nextrelx);
    		})
    		.attr('y2', function(d){
    			return y(d.nextrely);
    		});

      	}

      	var getElementDimensions = function () {
		    return { 'h': element.height(), 'w': element.width() };
		 };

		attrs.$observe('resizetriggers', function(){
			//ugly
			$timeout(resize, 500);
			$timeout(resize, 2000);
		}, true);

		/* EVENTS RESPONSES*/
		var resetAll = function(){
      		//if(!onUpdate){
      			svg.selectAll('.cassiopeia-user')
      			.transition()
      			.duration(500)
      			.style('opacity', .8);
      		//}
      	}

      	var onOverPeriod = function(e,period){
			svg.selectAll('.cassiopeia-user')
				.filter(function(d){
					for(var i in d.values){
						if(d.values[i].created_at_abs >= period.begin_abs && d.values[i].created_at_abs <= period.end_abs)
							return false;
					}
					return true;
				})
				.transition()
				.duration(500)
				.style('opacity', .3);
      			
      	};

      	var onOverTweet = function(e,tweet){

			svg.selectAll('.cassiopeia-user')
				.filter(function(d){
					return d.user.id != tweet.user_id;
				})
				.transition()
				.duration(500)
				.style('opacity', .3)

			svg.selectAll('.cassiopeia-user')
				.filter(function(d){
					return d.user.id == tweet.user_id;
				})
				.each(function(d){
					var index = 0;
					for(var i in d.values){
						if(d.values[i].id == tweet.id)
							index = +i;
					}
					if(index == 0){
						d3.select(this)
						.selectAll('.stroke,.shape')
						.transition()
						.duration(500)	
						.style('opacity', 1)
						.attr('r', function(d, i){
		    				return .2 + radiusScale(d.values.length*8);
		    			})
		    			.each('end', function(d){
		    				d3.select(this)
		    				.transition()
		    				.delay(500)
		    				.duration(500)
		    				.attr('r', function(d, i){
			    				return .2 + radiusScale(d.values.length);
			    			})
		    			});  
					}else{
						d3.select(this)
						.selectAll('.cassiopeia-tweet')
						.filter(function(d){
							return d.id == tweet.id;
						})
						.select('.mini-shape')
						.transition()
						.duration(500)
						.attr('d', 'M -12 0 L 0 -12 L 12 0 L 0 12 Z')
						.each('end', function(){
							d3.select(this)
							.transition()
							.delay(500)
							.duration(500)
							.attr('d', 'M -3 0 L 0 -3 L 3 0 L 0 3 Z')
							.each('end', function(){
								d3.select(this).attr('d', 'M -3 0 L 0 -3 L 3 0 L 0 3 Z');
							});
						})
					}
				})
					   			
      	};


      	/*
      	INITS
      	*/
      	var w = angular.element($window);
      	w.bind('resize', resize);

      	var initWatchers = function(){
      		//DATA UPDATING
        	$rootScope.$on('localDataUpdate', update);
        	//LINKED VIS EVENTS
      		$rootScope.$on('overPeriod', onOverPeriod);
      		$rootScope.$on('outPeriod', resetAll);
      		$rootScope.$on('outTweet', resetAll);
      		$rootScope.$on('overTweet', onOverTweet);
      	}

      	initWatchers();

      }
    }
  });