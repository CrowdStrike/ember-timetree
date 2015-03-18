// Copyright (C) 2015 CrowdStrike, Inc. and contributors
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE.md in the main directory for details

import Ember from 'ember';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('cs-timetree');

test('it renders', function(assert) {
  assert.expect(2);

  var component = this.subject();
  assert.equal(component._state, 'preRender');

  this.render();
  assert.equal(component._state, 'inDOM');
});


test('it renders content', function(assert) {
  assert.expect(1);

  var events = [{
      'id': 1,
      'label': 'One',
      'start': 1347800918,
      'end': 1347802918
  }, {
      'id': 2,
      'label': 'Two',
      'start': 1347800918,
      'end': 1347801918
  }, {
      'id': 3,
      'label': 'Three',
      'start': 1347802218,
      'end': 1347802518,
      'parent': 0
  }, {
      'id': 4,
      'label': 'Four',
      'start': 1347801118,
      'end': 1347801818,
      'parent': 1
  }, {
      'id': 5,
      'label': 'Five',
      'start': 1347801418,
      'end': 1347802618,
      'parent': 3
  }, {
      'id': 6,
      'label': 'Six',
      'start': 1347801218,
      'end': 1347801618,
      'parent': 0
  }, {
      'id': 7,
      'label': 'Seven',
      'start': 1347801418,
      'end': 1347801618,
      'parent': 5
  }, {
      'id': 8,
      'label': 'Eight',
      'start': 1347801519,
      'end': 1347801720
  }, {
      'id': 9,
      'label': 'Nine',
      'start': 1347801619,
      'end': 1347801720,
      'parent': 7
  }];

  var component = this.subject();

  Ember.run(function() {
    component.set('content', events);
  });

  assert.equal(this.$().find('.content .bar').length, 9);
});

test('handles transform: translate in Webkit', function(assert) {
  assert.expect(3);

  var translate = 'translate(30.12, 42.999)';
  var component = this.subject();
  var match = component._translateRegex.exec(translate);

  assert.equal(match.length, 3);
  assert.equal(match[1], '30.12');
  assert.equal(match[2], '42.999');
});

test('handles transform: translate in IE', function(assert) {
  assert.expect(3);

  // Notice that IE doesn't have comma between translate x, y!
  var translate = 'translate(30.12 42.999)';
  var component = this.subject();
  var match = component._translateRegex.exec(translate);

  assert.equal(match.length, 3);
  assert.equal(match[1], '30.12');
  assert.equal(match[2], '42.999');
});