'use strict';

describe('Service: nova', function () {

  // load the service's module
  beforeEach(module('cassiopeiaApp'));

  // instantiate service
  var nova;
  beforeEach(inject(function (_nova_) {
    nova = _nova_;
  }));

  it('should do something', function () {
    expect(!!nova).toBe(true);
  });

});
