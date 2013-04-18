// Copyright (C) 2013 CrowdStrike, Inc. and contributors
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE in the main directory for details

Ember.Timetree.TimetreeBrushView = Ember.Timetree.TimetreeView.extend({
  classNames: ['timetree-brush-view'],

  rowHeight: 4,
  rowSpacing: 2,
  labelsWidth: 0,
  collapsable: false,
  scrubbable: false,
  selectable: false,
  showLabels: false,
  brushable: true
});