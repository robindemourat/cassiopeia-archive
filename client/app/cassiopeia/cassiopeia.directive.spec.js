'use strict';

describe('Directive: cassiopeia', function () {

  // load the directive's module
  beforeEach(module('cassiopeiaApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<cassiopeia></cassiopeia>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the cassiopeia directive');
  }));
});