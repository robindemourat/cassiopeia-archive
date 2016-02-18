'use strict';

angular.module('cassiopeiaApp')
  .directive('fitheight', function ($window, $timeout) {
    return {
      restrict: 'AC',
      scope : {
        trigger : "@resizetrigger"
      },
      link: function postLink(scope, element, attrs) {
        var parent = $(element).parent(),
        	 prev = $(element).prev(),
        	 next = $(element).next(),
           first = false;

        var fitHeight = function(){
        	var posY = element.offset().top - $(window).scrollTop();
        	var gHeight = window.innerHeight;
        	$(element).css({
        		height : gHeight - posY
        	});
        };
        
        $timeout(fitHeight);

        var w = angular.element($window);
        w.bind('resize', fitHeight);

      }
    };
  });