/*global $ */

// Copyright (C) 2013 CrowdStrike, Inc.
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE in the main directory for details

var view;

function appendView(v) {
	v = v || view;
  Ember.run(function() { v.appendTo('#qunit-fixture'); });
}

module('Ember.Timetree.TimetreeView', {
	teardown: function() {
		if (view) {
			Ember.run(function() { view.destroy(); });
			view = null;
		}
	}
});

test("it's an Ember.View", function() {
  ok(Ember.View.detect(Ember.Timetree.TimetreeView), 'should be a subclass of Ember.View');
});

test("can be inserted into the DOM", function() {
  view = Ember.Timetree.TimetreeView.create();

  appendView();

  equal($('svg', '#qunit-fixture').length, 1);
});

test("renders content", function() {
	var content = [
    {
      "id"                : 1,
      "label"             : "One",
      "start"             : 1347800918,
      "end"               : 1347802918
    },
    {
      "id"                : 2,
      "label"             : "Two",
      "start"             : 1347800918,
      "end"               : 1347801918
    },
    {
      "id"                : 3,
      "label"             : "Three",
      "start"             : 1347802218,
      "end"               : 1347802518,
      "parent"            : 0
    },
    {
      "id"                : 4,
      "label"             : "Four",
      "start"             : 1347801118,
      "end"               : 1347801818,
      "parent"            : 1
    },
    {
      "id"                : 5,
      "label"             : "Five",
      "start"             : 1347801418,
      "end"               : 1347802618,
      "parent"            : 3
    },
    {
      "id"                : 6,
      "label"             : "Six",
      "start"             : 1347801218,
      "end"               : 1347801618,
      "parent"            : 0
    },
    {
      "id"                : 7,
      "label"             : "Seven",
      "start"             : 1347801418,
      "end"               : 1347801618,
      "parent"            : 5
    },
    {
      "id"                : 8,
      "label"             : "Eight",
      "start"             : 1347801519,
      "end"               : 1347801720
    },
    {
      "id"                : 9,
      "label"             : "Nine",
      "start"             : 1347801619,
      "end"               : 1347801720,
      "parent"            : 7
    }
  ];

  view = Ember.Timetree.TimetreeView.create({ content: content });

  appendView();

  equal(view.$('.content .bar').length, 9);
});
