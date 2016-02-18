'use strict';

angular.module('cassiopeiaApp')
  .directive('timeline', function ($rootScope, $compile, $timeout, DateUtils) {
    return {
      restrict: 'EAC',
      scope : {
        shortTransitions : '@shorttransitions',
        mediumTransitions : '@mediumtransitions',
        longTransitions : '@longtransitions',
        dataEvt : '@dataevt',
        dataProperty : '@dataproperty',
        brushOutputEvt : '@brushoutputevt',
        brushInputEvt : '@brushinputevt'
      },
      link: function (scope, element, attrs) {

        //todo : set parametric long transition, short fast transition, max brush length

        var id = angular.element(element).attr('id'),
            container = d3.select('#' + id),
            visPercentHeight = 80,//height of vis regarding ticks (%)
            tickHeight = (100-visPercentHeight)/3,
            scaleX,//scale used to display bars position and width
            //time utils
            sec = 1000,
            minute = sec * 60,
            hour = minute * 60,
            day = hour * 24,
            week = day * 7,
            month = day * 31,
            //brush setting
            brush, //brush object, must be global
            min_brush = minute * 30, //brush length is limited to avoid to have too few nodes to display
            max_brush = day, //brush length is limited to avoid to have too much nodes to display
            brush_prev_begin, //used to come back to previous brush extent if limit is exceeded
            brush_prev_end,
            brushScale = d3.scale.linear().range([0, angular.element(element).width()]),
            barsContainer = container.append('g').attr('class', 'barsContainer'),
             //I think I found a d3 bug with transitions of y+width in % while bars are updated, I go around it with a cache
            cache = container.append('rect')
                      .attr('class', 'timeline-cache')
                      .attr('x', 0)
                      .attr('y', function(){
                        return visPercentHeight + '%';
                      })
                      .attr('width', '100%')
                      .attr('height', function(){
                        return (100 - visPercentHeight + 2) + '%';
                      }),
            ticksContainer = container.append('g').attr('class', 'ticksContainer'),
            tooltip1 = d3.select('.tooltip-1'),
            tooltip2 = d3.select('.tooltip-2'),
            onUpdate = false,
            scaleX = d3.scale.linear().range([0, 100]);


        //setting brush if specified - I use this method instead of adding another boolean attribute brush to the component
        if(scope.brushOutputEvt){
          brush = d3.svg.brush()
            .on('brush', brushed)
            .on("brushend", brushend)
            .on('brushstart', brushstart);

          barsContainer.append("g")
              .attr("class", "x brush")
              .call(brush)
              .selectAll("rect")
                .attr("y", 0)
                .attr("height", function(){
                  return visPercentHeight + '%';
                });

          barsContainer
            .select('.brush .background')
              .attr('width', '100%')
              .attr('visiblity', 'visible')//added to be able to show it if needed
              .classed('animate', true)
        }

        function brushstart(){
          brushScale
            .range([0, angular.element(element).width()]);
          brush
            .x(brushScale);
        }

        function brushed(){
        }

        function brushend() {
          if(!brush.empty()){
            var extent = brush.extent(),
                range = extent[1] - extent[0],
                limit,
                end;

            if(range > max_brush){

              limit = true;
              end = extent[0] + max_brush;

            }else end = extent[1];

            //refuse if too small
            if(range < min_brush){
              // end = extent[0] + min_brush;
              updateBrush({begin_abs : brush_prev_begin, end_abs : brush_prev_end});
              barsContainer
                .select('.brush .extent')
                .classed('limit', true);

              setTimeout(function(){
                barsContainer
                  .select('.brush .extent')
                  .classed('limit', false);
              }, scope.longTransitions * 2);
              return;
            }


            $rootScope.$broadcast(scope.brushOutputEvt, [extent[0], end]);
            brush_prev_begin = extent[0];
            brush_prev_end = extent[1];
            //console.log('directive sends time update for', new Date(brush_prev_begin), new Date(brush_prev_end));

          }
          updateBrush({begin_abs : brush_prev_begin, end_abs : brush_prev_end});
        }

        var update = function(data){
          if(!data)
            return;

          onUpdate = true;
          $timeout(function(){
            onUpdate = false;
          }, scope.longTransitions);

          var width = element.width(),
            height = element.height(),
            min = data.begin_abs,
            max = data.end_abs,
            minVal = d3.min(data.timeslots, function(d){return d.count}),
            maxVal = d3.max(data.timeslots, function(d){return d.count}),
            scaleY = d3.scale.linear().domain([0, maxVal]).range([0, visPercentHeight]),
            barWidth = 100/(data.timeslots.length+1),
            ticksType = DateUtils.computeTicksType(min, max),
            xDate = d3.time.scale()
                      .domain([new Date(min), ticksType.scale.offset(new Date(max), 1)])
                      .range([0, 100]),
            xAxis = d3.svg.axis()
                      .scale(xDate)
                      .orient("bottom")
                      .ticks(ticksType.scale, ticksType.interval)
                      .tickFormat(ticksType.formatting)
                      .tickSize(0)
                      .tickPadding(8);

          scaleX = d3.scale.linear()
                    .domain([data.begin_abs,data.end_abs])
                    .range([0, 100]);

          if(brush){
            brushScale = d3.scale.linear().range([0, angular.element(element).width()])
            .domain([data.begin_abs,data.end_abs]);
            brush.x(brushScale);
          }


          var bars = barsContainer.selectAll('.bar').data(data.timeslots);

          var enter = bars
            .enter()
            .append('g')
            .attr('class', 'bar');

          enter
            .append('rect')
            .attr('class', 'main-bar')
            .attr('y', function(d){
                return visPercentHeight+ '%';
              })
            .attr('width', function(d){
              return barWidth + '%';
            })
            .attr('x', function(d, i){
                return (scaleX(d.begin_abs)) + '%';
              })
            .attr('height', function(d, i){
                return scaleY(d.count) + '%';
            });


          var onBarHover = function(d){


              var data = d;
              if(onUpdate){
                return;
              }else{
                $rootScope.$broadcast('overPeriod', d);
              }

                d3.select(this)
                  .transition().duration(scope.mediumTransitions)
                  .style('opacity', 1);

                barsContainer.selectAll('.bar')
                .filter(function(d){
                  return d.begin_abs != data.begin_abs;
                })
                .style('opacity', .5);




                var formatTooltip = DateUtils.computeTicksType(data.end_abs - data.begin_abs).formatting;

                tooltip1.style('visibility', 'visible')
                .style('opacity', 1)
                .style('z-index', 5)
                .html(function(){
                  var output = data.count +' tweets from '+formatTooltip(new Date(data.begin_abs)) + ' to ' + formatTooltip(new Date(data.end_abs));
                  if(data.colors.length){
                    for(var n in data.colors){
                      var col = data.colors[n];
                      if(n > 0)
                        output += '<br>'
                      else output += '<br><br>'
                      output += col.count+' tweets '+col.expression;
                    }
                  }
                  return output;
                });
          };

          var onBarEndHover = function(d){
              if(onUpdate){
                return;
              }
              if(!onUpdate){
                barsContainer.selectAll('.bar')
                .transition().duration(scope.mediumTransitions)
                .style('opacity', .5);
              }
              $rootScope.$broadcast('outPeriod', d);
              tooltip1.transition().duration(scope.shortTransitions).style('opacity', 0).each('end', function(){d3.select(this).style('z-index', -1)});
          };

          enter
            .on('mouseover', onBarHover)
            .on('mousemove', function(d){
              if(d3.select(this).style('opacity') != 1)
                onBarHover(d);
              var y = (window.innerHeight - d3.event.pageY + 30),
                  x = (d3.event.pageX-tooltip1[0][0].offsetWidth/2);
              if(x < 20)
                x = 20;
              else if (x + tooltip1[0][0].offsetWidth > window.innerWidth)
                x = window.innerWidth - tooltip1[0][0].offsetWidth - 20;
              tooltip1.style('opacity', 1).style('z-index', 5).style("bottom", y+"px").style("left",x+"px");
            })
            .on('mouseleave', onBarEndHover)
            .on('mouseout', onBarEndHover)
            .on('click', function(d){
              // min timespan = 1 hour minute
              if(d.end_abs - d.begin_abs >= min_brush){
                $rootScope.$broadcast('clickPeriod', d);
              }
            });

          container.on('mouseout', onBarEndHover);

          bars
            .select('.main-bar')
            .transition()
            .duration(scope.longTransitions)
            .attr('width', function(d){
              return barWidth + '%';
            })
            .attr('x', function(d, i){
                return (scaleX(d.begin_abs)) + '%';
              })
            .attr('y', function(d){
                  return visPercentHeight - scaleY(d.count) + '%';
            })
            .each('end', function(d){
              d3.select(this)
              .attr('height', function(d, i){
                  return scaleY(d.count) + '%';
              });
            })
            ;

          bars.exit()
            .remove();


          //STACKS UPDATE
          bars.each(function(d,i){

            if(d.colors){
              var data = d;

              var stacks = d3.select(this).selectAll('.color').data(d.colors);
              //ENTER
              var displaceY = visPercentHeight;
              var enter = stacks
                            .enter()
                            .append('rect')
                            .attr('class', 'color')
                            .attr('y', function(d){
                                displaceY -= scaleY(d.count);
                                return displaceY+ '%';
                              })
                            .attr('width', function(d){
                              return barWidth + '%';
                            })
                            .attr('x', function(d, i){
                                return (scaleX(data.begin_abs)) + '%';
                              })
                            .attr('height', function(d, i){
                                return scaleY(d.count) + '%';
                            })
                            .attr('fill', function(d){
                              return d.color;
                            });
              displaceY = visPercentHeight;
              stacks
                .transition()
                .duration(scope.longTransitions)
                .attr('width', function(d){
                  return barWidth + '%';
                })
                .attr('x', function(d, i){
                    return (scaleX(data.begin_abs)) + '%';
                  })
                .attr('y', function(d, i){
                      displaceY -= scaleY(d.count);
                      return displaceY+ '%';
                })
                .attr('fill', function(d){
                              return d.color;
                            })
                .each('end', function(d){
                  d3.select(this)
                  .attr('height', function(d, i){
                      return scaleY(d.count) + '%';
                  });
                })
                ;

              stacks.exit().remove();

            }
          });

          //TICKS UPDATE
          ticksContainer.selectAll('.tick').remove();

          ticksContainer
          .append('g')
          .attr('class', 'x axis')
          .call(xAxis);

          ticksContainer.selectAll('.tick')
          .attr('transform', null);

          ticksContainer.selectAll('.tick text')
          .attr('x', function(d){
            return scaleX(new Date(d))+'%';
          }).attr('y', function(d){
            return (visPercentHeight+tickHeight)+'%'
          });

          ticksContainer.selectAll('.tick line')
          .attr('x1', function(d){
            return scaleX(new Date(d))+'%';
          })
          .attr('x2', function(d){
            return scaleX(new Date(d))+'%';
          })
          .attr('y1', function(d){
            return (visPercentHeight+tickHeight/2)+'%'
          }).attr('y2', function(d){
            return (visPercentHeight+tickHeight)+'%'
          });

        };

        var updateBrush = function(d){

          if(scope.brushInputEvt){
            brush.extent([d.begin_abs, d.end_abs]);

            //resizing brush extent
            barsContainer.select('.extent')
            .attr('x', function(){
              return scaleX(d.begin_abs)+'%';
            }).attr('width', function(){
              return (scaleX(d.end_abs) - scaleX(d.begin_abs))+'%';
            });

            //resizing handles
            barsContainer
            .selectAll('.resize.w rect,.resize.e rect')
            .attr('width', function(){
              return (scaleX(d.end_abs) - scaleX(d.begin_abs))/3+'%';
            });
            barsContainer
            .selectAll('.resize.e rect')
            .attr('x', function(){
              return -(scaleX(d.end_abs) - scaleX(d.begin_abs))/3+'%';
            });

            brush_prev_begin = d.begin_abs;
            brush_prev_end = d.end_abs;

            //if no input > the timeline is in zoom mode
          }else if(!brush.empty()){
            barsContainer.select('.extent')
            .transition()
            .delay(scope.mediumTransitions)
            .duration(scope.longTransitions)
            .attr('x', 0)
            .attr('width', '100%')
            .each('end', function(){
              d3.select(this)
              .transition()
              .duration(scope.mediumTransitions)
              .style('opacity', 0)
              .each('end', function(){
                d3.select(this)
                .style('opacity', 1)
                .attr('width', 0);
              });

            });
          }
        };

        /*
        INITIALISATION
        */
        var initWatchers = function(){
          $rootScope.$on(scope.dataEvt, function(e, d){

            scope.data = (scope.dataProperty)?d[scope.dataProperty]:d;
            update(scope.data);
          });

          if(scope.brushInputEvt){
            $rootScope.$on(scope.brushInputEvt, function(e,d){
              updateBrush(d.timeline);
              //console.log('update brush');
            });
          }

          $rootScope.$on('overUser', function(e, user){

            var maxCount = 0,
                opScale = d3.scale.linear().range([.05, 1]);//todo : init on top
            barsContainer
            .selectAll('.bar')
            .each(function(d, i){
              var count = 0;
              for(var i in user.values){
                var val = user.values[i].created_at_abs;
                if(val >= d.begin_abs && val <= d.end_abs){
                  count++;
                  if(count > maxCount)
                    maxCount = count;
                }
              }
              d.tempCount = count;
            })
            .each(function(d, i){
              if(i == 0){//set scale
                opScale.domain([0, maxCount]);
              }
              d3.select(this)
              .transition()
              .duration(scope.mediumTransitions)
              .style('opacity', function(d){
                return opScale(d.tempCount);
              })
            });
          });

          $rootScope.$on('outUser', function(e, user){
            barsContainer
            .selectAll('.bar')
            .transition()
              .duration(scope.mediumTransitions)
            .style('opacity', .7);
          });
        };

        initWatchers();
      }
    };
  });