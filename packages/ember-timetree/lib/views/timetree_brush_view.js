// Copyright (C) 2013 CrowdStrike, Inc.
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE in the main directory for details

Ember.Timetree.TimetreeBrushView = Ember.Timetree.TimetreeView.extend({
  classNames: ['timetree-brush-view'],

  height: 90,
  labelsWidth: 0,
  collapsable: false,
  scrubbable: false,
  selectable: false,
  showLabels: false,
  brushable: true
});