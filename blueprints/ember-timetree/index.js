'use strict';

var path = require('path');

module.exports = {
  normalizeEntityName: function() {
    // this prevents an error when the entityName is
    // not specified (since that doesn't actually matter
    // to us
  },

  afterInstall: function() {
    var bowerJsonPath = path.join(__dirname, '..', '..', 'bower.json');
    var bowerJson = require(bowerJsonPath);
    return this.addBowerPackageToProject('d3', bowerJson.devDependencies.d3);
  }
};
