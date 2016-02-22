'use strict';

angular.module('cassiopeiaApp', [
  /*'ngCookies',*/
  /*'ngResource',*/
  /*'ngSanitize',*/
  'ngRoute',
  'ngAnimate',
  'ui.bootstrap',
  'ngFileUpload',
  'angulike',
  'angularytics'
])
  .config(function ($locationProvider, AngularyticsProvider) {
    $locationProvider.html5Mode(true);
    // AngularyticsProvider.setEventHandlers(['Console', 'GoogleUniversal']);
    AngularyticsProvider.setEventHandlers(['GoogleUniversal']);
    AngularyticsProvider.setPageChangeEvent(undefined);
  }).run(function(Angularytics) {
    Angularytics.init();
  });
