// Copyright (C) 2015 CrowdStrike, Inc. and contributors
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE.md in the main directory for details

import TimetreeComponent from './cs-timetree';

var TimetreeBrushComponent = TimetreeComponent.extend({
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

export default TimetreeBrushComponent;