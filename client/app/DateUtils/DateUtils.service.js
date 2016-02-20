'use strict';

angular.module('cassiopeiaApp')
  .factory('DateUtils', function () {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var factory = {},
        sec = 1000,
        minute = sec * 60,
        hour = minute * 60,
        day = hour * 24,
        week = day * 7,
        month = day * 31;

    factory.computeTicksType = function(min, max){
          var range = max - min, unit, interval, formatting;
          if(range >= 1 * month){
            unit = 'day';
            interval = 11;
            formatting = '%d %b';
          }else if(range >= 3 * day){
            unit = 'day';
            interval = 1;
            formatting = '%d %b';
          }else if(range >= 12 * hour){
            unit = 'hour';
            interval = 3;
            formatting = '%Hh';
          }else if(range >= 2 * hour){
            unit = 'minute';
            interval = 30;
            formatting = '%H:%M';
          }else if(range >= 20 * minute){
            unit = 'minute';
            interval = 10;
            formatting = '%H:%M';
          }else if(range >= 3 * minute){
            unit = 'minute';
            interval = 1;
            formatting = '%H:%M';
          }else{
            unit = 'second';
            interval = 10;
            formatting = '%H:%M:%S';
          }

          return {
            scale : d3.time[unit],
            interval : interval,
            formatting : d3.time.format(formatting)
          }
    };

    factory.computeGlobalTicksType = function(min, max){
          var range = max - min, unit, interval, formatting;
          if(range >= 1 * month){
            unit = 'day';
            interval = 11;
            formatting = '%d %b %Y';
          }else if(range >= 3 * day){
            unit = 'day';
            interval = 1;
            formatting = '%d %b %Y';
          }else if(range >= 12 * hour){
            unit = 'hour';
            interval = 3;
            formatting = '%d %b %Y, %Hh';
          }else if(range >= 2 * hour){
            unit = 'minute';
            interval = 30;
            formatting = '%d %b %Y, %H:%M';
          }else if(range >= 20 * minute){
            unit = 'minute';
            interval = 10;
            formatting = '%d %b %Y, %H:%M';
          }else if(range >= 3 * minute){
            unit = 'minute';
            interval = 1;
            formatting = '%d %b %Y, %H:%M';
          }else{
            unit = 'second';
            interval = 10;
            formatting = '%d %b %Y, %H:%M:%S';
          }

          return {
            scale : d3.time[unit],
            interval : interval,
            formatting : d3.time.format(formatting)
          }
    };


    return factory;
  });
