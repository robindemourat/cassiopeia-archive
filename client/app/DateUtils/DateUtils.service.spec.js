'use strict';

describe('Service: DateUtils', function () {

  // load the service's module
  beforeEach(module('cassiopeiaApp'));

  // instantiate service
  var DateUtils;
  beforeEach(inject(function (_DateUtils_) {
    DateUtils = _DateUtils_;
  }));

  it('should do something', function () {
    expect(!!DateUtils).toBe(true);
  });

});
