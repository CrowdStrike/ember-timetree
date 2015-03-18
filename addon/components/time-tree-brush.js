// Copyright (C) 2015 CrowdStrike, Inc. and contributors
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE.md in the main directory for details

import TimeTreeComponent from './time-tree';

const TimeTreeBrushComponent = TimeTreeComponent.extend({
  classNames: ['time-tree-brush'],

  rowHeight: 4,
  rowSpacing: 2,
  labelsWidth: 0,
  collapsable: false,
  scrubbable: false,
  selectable: false,
  showLabels: false,
  brushable: true
});

export default TimeTreeBrushComponent;
