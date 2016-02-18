'use strict';

angular.module('cassiopeiaApp', [
  /*'ngCookies',*/
  /*'ngResource',*/
  /*'ngSanitize',*/
  'ngRoute',
  'ngAnimate',
  'ui.bootstrap',
  'ngFileUpload',
  'angulike'
])
  .config(function ($locationProvider) {
    $locationProvider.html5Mode(true);
  });
