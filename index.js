/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-timetree',
  included: function(app) {
  	this._super.included.apply(this, arguments);

  	app.import({
  		development: app.bowerDirectory + '/d3/d3.js',
  		production: app.bowerDirectory + '/d3/d3.min.js'
  	});
  }
};
