// Copyright (C) 2015 CrowdStrike, Inc. and contributors
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE.md in the main directory for details
import Ember from 'ember';
import { moduleForComponent, test } from 'ember-qunit';
import fixtures from '../../helpers/fixtures';

moduleForComponent('time-tree', 'Unit | Component | time tree', {
  unit: true
});

test('it renders content', function(assert) {
  assert.expect(1);
  let component = this.subject();

  Ember.run(function() {
    component.set('content', fixtures);
  });

  assert.equal(this.$().find('.content .bar').length, fixtures.length);
});

test('handles transform: translate in Webkit', function(assert) {
  assert.expect(3);

  let translate = 'translate(30.12, 42.999)';
  let component = this.subject();
  let match = component._translateRegex.exec(translate);

  assert.equal(match.length, 3);
  assert.equal(match[1], '30.12');
  assert.equal(match[2], '42.999');
});

test('handles transform: translate in IE', function(assert) {
  assert.expect(3);

  // Notice that IE doesn't have comma between translate x, y!
  let translate = 'translate(30.12 42.999)';
  let component = this.subject();
  let match = component._translateRegex.exec(translate);

  assert.equal(match.length, 3);
  assert.equal(match[1], '30.12');
  assert.equal(match[2], '42.999');
});
