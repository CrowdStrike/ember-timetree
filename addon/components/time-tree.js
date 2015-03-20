// Copyright (C) 2015 CrowdStrike, Inc. and contributors
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE.md in the main directory for details

/* global d3 */
import Ember from 'ember';

const TimeTreeComponent = Ember.Component.extend({
  tagName: 'svg',

  width: 750,
  rowHeight: 15,
  rowSpacing: 10,
  labelsWidth: 200,
  axisHeight: 20,
  axisPosition: 'bottom',
  indentSize: 20,
  labelAlign: 'left',
  contentMargin: null, // { top: 0, left: 0, bottom: 0, right: 0 },

  collapsable: true,
  scrubbable: true,
  selectable: true,
  brushable: false,
  resizeOnCollapse: false,

  showLabels: true,
  showLinks: true,

  attributeBindings: ['_width:width', 'height'],

  classNames: ['time-tree'],

  /**
    [
      parent:   null, // index of parent in array
      label:    "Name",
      start:    12345,
      end:      67890,

      // id for determining uniqueness, optional, defaults to index
      id: null,

      // Class name applied to labels and bars, optional
      className: null,

      // Bar sections to apply different classes to, optional
      sections: [{ start: 12345, end: 23456, className: 'active' },
                 { start: 23456, end: 67890, className: 'inactive' }],

      // Content for selection, optional. If empty, the outer object is selected.
      content:  {Obj}
    ]
  */
  content: null,

  selection: null,

  brushRange: null,
  range: null,

  _translateRegex: /translate\(([\d\.]+),?\s*([\d\.]+)\)/,

  minimumWidth: Ember.computed(function() {
    return this.get('labelsWidth') + 100;
  }).property('labelsWidth'),

  maximumWidth: Ember.computed(function() {
    if (this.get('element')) {
      return this.$().parent().width();
    } else {
      return 0;
    }
  }).property('element').volatile(),

  _width: Ember.computed(function() {
    var width = this.get('width');
    if (width === 'auto') { width = this.get('maximumWidth'); }
    return Math.max(this.get('minimumWidth'), width);
  }).property('width', 'maximumWidth', 'minimumWidth'),

  barsHeight: Ember.computed(function() {
    return (this.get('rowHeight') + this.get('rowSpacing')) * (this.get('resizeOnCollapse') ? this.get('visibleNodeCount') : this.get('content.length'));
  }).property('rowHeight', 'rowSpacing', 'content.length', 'visibleNodeCount', 'resizeOnCollapse'),

  contentHeight: Ember.computed(function() {
    return this.get('barsHeight') + (this.get('contentMargin.top') || 0) + (this.get('contentMargin.bottom') || 0);
  }).property('barsHeight'),

  height: Ember.computed(function() {
    return this.get('axisHeight') + this.get('contentHeight');
  }).property('axisHeight', 'contentHeight'),

  _range: Ember.computed(function() {
    let range = this.get('range');
    if (range && range.length === 2) { return range; }

    // Some of this is a bit redundant with renderNodes
    let rootNode = this.get('rootNode');
    if (rootNode.children.length === 0) { return []; }

    let tree = this.get('tree');
    let nodes = tree.nodes(rootNode).slice(1); // Skip root node
    let min = d3.min(nodes, n => n.start);
    let max = d3.max(nodes, n => n.lastEnd);

    return [min, max];
  }).property('range', 'rootNode'),

  _labelAt(i) {
    return d3.select(this.get('svg').selectAll('.labels .label')[0][i]);
  },

  contentWidth: Ember.computed(function() {
    return this.get('_width') - this.get('labelsWidth');
  }).property('_width', 'labelsWidth'),

  barsWidth: Ember.computed(function() {
    return this.get('contentWidth') - (this.get('contentMargin.left') || 0) - (this.get('contentMargin.right') || 0);
  }).property('contentWidth', 'contentMargin.left', 'contentMargin.right'),

  timeFormat: Ember.computed(function() {
    return d3.time.format.utc('%H:%M:%S.%L');
  }).property(),

  timeTickFormat: Ember.computed(function() {
    var timeFormat = this.get('timeFormat');
    return function(d) { return timeFormat(new Date(d)); };
  }).property('timeFormat'),

  xScale: Ember.computed(function() {
    return d3.scale.linear().range([0, this.get('contentWidth')]).clamp(true);
  }).property(),

  yScale: Ember.computed(function() {
    let rowHeight = this.get('rowHeight');
    let rowSpacing = this.get('rowSpacing');
    let paddingFactor = rowSpacing / (rowHeight + rowSpacing);
    return d3.scale.ordinal()
      .rangeRoundBands(
        [0, this.get('barsHeight')],
        paddingFactor,
        paddingFactor / 2
      );
  }).property(),

  xAxis: Ember.computed(function() {
    return d3.svg.axis()
      .scale(this.get('xScale'))
      .orient('bottom')
      .tickFormat(this.get('timeTickFormat'))
      .ticks(5);
  }).property(),

  brush: Ember.computed(function() {
    return d3.svg.brush()
      .x(this.get('xScale'))
      .on('brush', Ember.$.proxy(this, 'doBrush'));
  }).property(),

  tree: Ember.computed(function() {
    return d3.layout.tree();
  }).property(),

  svg: Ember.computed(function() {
    var element = this.get('element');
    return element ? d3.select(element) : null;
  }).property('element'),

  rootNode: Ember.computed(function() {
    let nodes = this.get('content');
    let rootNode = { label: 'root', children: [] };

    if (nodes) {
      nodes = nodes.map(node => Ember.$.extend({}, node));

      nodes.forEach(node => {
        let parentNode = node.parent != null ? nodes[node.parent] : rootNode;
        if (!parentNode.children) { parentNode.children = []; }
        parentNode.children.push(node);
      });

      nodes.forEach((node, idx) => {
        if (!node.id) { node.id = idx; }
        if (!node.className) { node.className = ''; }
        node.lastEnd = lastEndTime(node);
      });
    }

    return rootNode;
  }).property('content'),

  visibleNodeCount: Ember.computed(function() {
    let total = 1;
    let computeTotal = function(node) {
      for (let i = 0; i < node.length; i++) {
        let n = node[i];
        if (n.children) {
          total += n.children.length;
          computeTotal(n.children);
        }
      }
    };

    computeTotal([this.get('rootNode')]);
    return total;
  }).property('rootNode'),

  adjustXScaleRange: Ember.on('init', Ember.observer(function() {
    this.get('xScale').range([0, this.get('barsWidth')]);
  }, 'barsWidth')),

  adjustYScaleRange: Ember.on('init', Ember.observer(function() {
    // TODO: This is a copy of `yScale`, clean it up
    let rowHeight = this.get('rowHeight');
    let rowSpacing = this.get('rowSpacing');
    let paddingFactor = rowSpacing / (rowHeight + rowSpacing);
    this.get('yScale')
      .rangeRoundBands(
        [0, this.get('barsHeight')],
        paddingFactor,
        paddingFactor / 2
      );
  }, 'barsHeight', 'rowHeight', 'rowSpacing')),

  adjustScrubberHeight: Ember.observer(function() {
    if (this.get('scrubbable')) {
      let height = this.get('contentHeight');
      let scrubber = this.get('svg').select('.scrubber');
      scrubber.select('line').attr('y2', height);
      scrubber.select('text').attr('y', height);
    }
  }, 'contentHeight'),

  updateXAxisScale: Ember.on('init', Ember.observer(function() {
    this.get('xAxis').scale(this.get('xScale'));
  }, 'xScale')),

  updateRows(rowItems) {
    let yScale = this.get('yScale').copy();
    let width = this.get('_width');
    let height = this.get('barsHeight');

    yScale.rangeRoundBands([0, height], 0, 0);

    rowItems
      .attr('x', 0)
      .attr('y', (n, i) => yScale(i))
      .attr('width', width)
      .attr('height', yScale.rangeBand());
  },

  drawAxis() {
    this.get('svg').select('.x.axis').call(this.get('xAxis'));
  },

  // This function is passed to d3, it's not called as a member of the View
  durationFormatter: ({ start, end }) => (end - start) / 1000 + 's',

  renderNodes() {
    let rootNode = this.get('rootNode');
    if (rootNode.children.length === 0) { return; }

    let tree = this.get('tree');
    let nodes = tree.nodes(rootNode).slice(1); // Skip root node

    let labelsWidth = this.get('labelsWidth');
    let leftPadding = this.get('contentMargin.left') || 0;
    let svg = this.get('svg');
    let rows = svg.select('.rows');
    let labels = svg.select('.labels');
    let collapsable = this.get('collapsable');
    let scrubbable = this.get('scrubbable');
    let brushable = this.get('brushable');
    let showLabels = this.get('showLabels');
    let showLinks = this.get('showLinks');
    let durationFormatter = this.get('durationFormatter');
    let applyLabel;
    let range = this.get('_range');

    let xScale = this.get('xScale');
    let yScale = this.get('yScale');
    let content = svg.select('.content');

    xScale.domain(range);
    yScale.domain(d3.range(
      this.get('resizeOnCollapse') ? this.get('visibleNodeCount') : this.get('content.length'))
    );

    let rowItems = rows.selectAll('.row').data(nodes, n => n.id);

    rowItems.enter().append('rect').attr('class', n => 'row ' + n.className);

    rowItems.exit().remove();

    this.updateRows(rowItems);

    if (labelsWidth > 0) {
      let indentSize = this.get('indentSize');
      let labelAlign = this.get('labelAlign');
      let showCircles;

      showLinks = showLinks && indentSize > 0;
      showCircles = collapsable || showLinks;

      if (showLinks) {
        let links = tree.links(nodes);
        let linkItems = labels.selectAll('.link').data(links);

        linkItems.enter().insert('path', ':first-child').attr('class', 'link');

        linkItems.exit().remove();

        linkItems.attr('d', function(d) {
          return 'M' + (d.source.depth * indentSize) + ',' + (yScale(nodes.indexOf(d.source)) + yScale.rangeBand() / 2) +
            'V' + (yScale(nodes.indexOf(d.target)) + yScale.rangeBand() / 2) + 'H' + (d.target.depth * indentSize);
        });
      }

      let labelItems = labels.selectAll('.label').data(nodes, n => n.id);
      let labelItemsEnter = labelItems.enter().append('g').attr('class', n => 'label ' + n.className);

      if (showCircles) {
        let circles = labelItemsEnter.append('circle');

        if (collapsable) {
          circles.attr('class', 'collapsable')
            .on('click', n => {
              this.toggleNode(n);
              this.renderNodes();
            });
          // update after initial draw if nodes changed
          labelItems.selectAll('circle').data(nodes, n => n.id);
        }
      }

      labelItemsEnter.append('text');

      labelItems.exit().remove();

      labelItems.attr('transform', (n, i) => {
        return 'translate(' + (n.depth * indentSize) + ',' + (yScale(i) + yScale.rangeBand() / 2) + ')';
      });

      labelItems.classed('has-children', n => n.children || n._children);
      labelItems.classed('closed', n => n._children);

      labelItems.selectAll('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 6);

      let labelText = labelItems.selectAll('text');

      labelText
        .attr('dx', showLinks ? 10 : 0) // padding-left
        .attr('dy', '.35em') // vertical-align: middle
        .text(n => n.label);

      if (labelAlign === 'right') {
        labelText
          .attr('text-anchor', 'end')
          .attr('x', n => labelsWidth + xScale(n.start) - 10);
      }
    }

    this.drawAxis();

    let bars = content.selectAll('.bars').selectAll('.bar').data(nodes, n => n.id);

    let barsEnter = bars.enter().append('g').attr('class', n => {
      return 'bar ' + n.className + ' ' + (n.sections ? 'sectional' : '');
    });

    let barsEnterDurationGroup = barsEnter.append('g').attr('class', 'whole duration');

    barsEnterDurationGroup.append('rect');
    barsEnterDurationGroup.append('text');

    barsEnter.call(function(sel) {
      sel.each(function(n) {
        let sectionGroup;
        if (n.sections) {
          sectionGroup = d3.select(this)
            .selectAll('.section.duration')
            .data(n.sections)
            .enter()
            .append('g')
            .attr('class', s => 'section duration ' + (s.className || ''));

          sectionGroup.append('rect');
          sectionGroup.append('text');
        }
      });
    });

    applyLabel = function(selection) {
      return selection
        .attr('y', () => yScale.rangeBand() / 2)
        .attr('dx', 3) // padding-left
        .attr('dy', '.35em') // vertical-align: middle
        .text(durationFormatter);
    };

    bars.exit().remove();

    bars
      .attr('transform', (n, i) => {
        return 'translate(' + (xScale(n.start) + leftPadding) + ',' + yScale(i) + ')';
      })
      .classed('collapsed', n => n._children);

    bars.selectAll('.duration rect')
      .attr('width', n => xScale(n.end) - xScale(n.start))
      .attr('height', yScale.rangeBand());

    bars.call(function(sel) {
      sel.each(function(n) {
        let sectionData;
        if (n.sections) {
          sectionData = d3.select(this).selectAll('.section').data(n.sections);
          sectionData.select('rect')
            .attr('x', s => xScale(s.start) - xScale(n.start))
            .attr('width', s => xScale(s.end) - xScale(s.start))
            .attr('height', yScale.rangeBand());

          if (showLabels) {
            sectionData.select('text')
              .attr('x', s => xScale(s.start) - xScale(n.start))
              .call(applyLabel);
          }
        }
      });
    });

    if (showLabels) {
      bars.selectAll('.whole.duration text')
        .attr('x', 0)
        .call(applyLabel);
    }

    if (scrubbable) {
      this.doScrub(this._currentScrubberX());
    }

    if (brushable) {
      let brush = this.get('brush');
      let contentHeight = this.get('contentHeight');

      content.selectAll('.brush')
        .call(brush)
        .selectAll('rect')
        .attr('height', contentHeight);
    }

    if (this.didRenderNodes) {
      this.didRenderNodes(nodes);
    }
  },

  nodesNeedRerender: Ember.observer(function() {
    Ember.run.once(this, 'renderNodes');
  }, 'rootNode', 'height', '_width', '_range.[]'),

  doHighlight(y) {
    if (!this.get('selectable')) { return; }

    let self = this;

    this.get('svg').select('.rows').selectAll('.row')
      .classed('hover', function(d, i) {
        let top = Number(this.getAttribute('y'));
        let bottom = top + Number(this.getAttribute('height'));
        let isSelected = top <= y && y < bottom;

        self._labelAt(i).classed('hover', isSelected);

        return isSelected;
      });
  },

  doScrub(x) {
    if (!this.get('scrubbable')) { return; }

    let svg = this.get('svg');
    let scrubber = svg.select('.content').select('.scrubber');
    let xScale = this.get('xScale');
    let contentWidth = this.get('contentWidth');
    let leftPadding = this.get('contentMargin.left') || 0;
    let self = this;

    if (x === undefined) { x = 0; }

    scrubber.attr('transform', 'translate(' + x + ', 0)');

    let text = scrubber.select('text').attr('dy', -1);

    text.text(x > 0 ? this.get('timeTickFormat')(xScale.invert(x-leftPadding)) : '');

    let textWidth = text.node().getComputedTextLength ? text.node().getComputedTextLength() : 0;
    if (x + textWidth * 1.5 > contentWidth) {
      scrubber.classed('switched', true);
      text.attr('text-anchor', 'end')
        .attr('x', -4);
    } else {
      scrubber.classed('switched', false);
      text.attr('text-anchor', 'start')
        .attr('x', 4);
    }

    let bars = svg.select('.content').selectAll('.bar');
    bars.each(function() {
      // FIXME: This should be data based
      let transform = this.getAttribute('transform');
      let match = self._translateRegex.exec(transform);
      let relStart = Number(match[1]);

      d3.select(this).selectAll('.duration').classed('hover', function() {
        let rect = d3.select(this).select('rect');
        let start = relStart + Number(rect.attr('x') || 0);
        let end = start + Number(rect.attr('width'));
        return start <= x && x <= end;
      });
    });
  },

  _currentScrubberX() {
    let scrubber = this.get('svg').select('.scrubber');
    let transform = !scrubber.empty() && scrubber.attr('transform');
    let match = this._translateRegex.exec(transform) || [];
    let translateX = match[1];

    return translateX ? Number(translateX) : undefined;
  },

  doBrush() {
    if (!this.get('brushable')) { return; }

    var brush = this.get('brush');

    this.set('brushRange', brush.empty() ? null : brush.extent());
  },

  toggleNode(node) {
    if (node.children) {
      node._children = node.children;
      delete node.children;
    } else {
      node.children = node._children;
      delete node._children;
    }
    this.notifyPropertyChange('visibleNodeCount');
  },

  didInsertElement() {
    let labelsWidth = this.get('labelsWidth');
    let contentHeight = this.get('contentHeight');
    let scrubbable = this.get('scrubbable');
    let selectable = this.get('selectable');
    let brushable = this.get('brushable');
    let axisHeight = this.get('axisHeight');
    let axisPosition = this.get('axisPosition');
    let contentTop = axisPosition === 'top' ? axisHeight : 0;
    let axisTop = axisPosition === 'top' ? axisHeight : contentHeight;

    this.adjustScrubberHeight();

    let svg = this.get('svg');
    let rows, labels, content, scrubber;
    let self = this;

    if (axisHeight > 0) {
      svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(' + labelsWidth + ',' + axisTop + ')');
    }

    rows = svg.insert('g', ':first-child')
      .attr('class', 'rows')
      .attr('transform', 'translate(0,' + contentTop + ')');

    if (labelsWidth > 0) {
      labels = svg.append('g')
        .attr('class', 'labels')
        .attr('transform', 'translate(0,' + contentTop + ')');
    }

    content = svg.append("g")
      .attr('class', 'content')
      .attr('transform', 'translate(' + labelsWidth + ',' + contentTop + ')');

    content.append('g').attr('class', 'bars');

    if (scrubbable) {
      scrubber = content.append('g').attr('class', 'scrubber');

      scrubber.append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', contentHeight);

      scrubber.append('text')
        .attr('y', contentHeight);
    }

    if (scrubbable || selectable) {
      svg.on('mousemove', function() {
        let contentWidth = self.get('contentWidth');
        let contentHeight = self.get('contentHeight');

        let mouse = d3.mouse(content.node());
        if (mouse[1] >= 0 && mouse[1] <= contentHeight) {
          if (selectable) {
            self.doHighlight(mouse[1]);
          }

          if (scrubbable) {
            if (mouse[0] >= 0 && mouse[0] <= contentWidth) {
              self.doScrub(mouse[0]);
            }
          }
        }
      });
    }

    if (selectable) {
      svg.on('click', function() {
        let rowItems = rows.selectAll('.row');
        let y = d3.mouse(svg.node())[1];

        rowItems.classed('selected', function(d, i) {
          let top = Number(this.getAttribute('y'));
          let bottom = top + Number(this.getAttribute('height'));
          let isSelected = top <= y && y < bottom;

          self._labelAt(i).classed('selected', isSelected);

          return isSelected;
        });

        self.set('selection', rowItems.filter('.selected').data().map(function (item) {
          return item.content || item;
        }));
      });
    }

    if (brushable) {
      content.append('g').attr('class', 'x brush');
    }

    this.renderNodes();
  },

  setupWindowResizeListener: Ember.on('didInsertElement', function() {
    Ember.$(window).on('resize.' + this.get('elementId'), Ember.run.bind(this, 'windowDidResize'));
    this.windowDidResize();
  }),

  teardownWindowResizeListener: Ember.on('willDestroyElement', function() {
    Ember.$(window).off('resize.' + this.get('elementId'));
  }),

  windowDidResize() {
    this.notifyPropertyChange('maximumWidth');
  }
});

export default TimeTreeComponent;

function lastEndTime(node, count) {
  if (!count) { count = 0; }
  if (count > 100) {
    throw new Error('Infinite loop in children when finding lastEndTime');
  }
  let children = node.children || node._children;
  let lastEnd = node.end;
  if (children) {
    children.forEach(child => {
      let childLastEnd = lastEndTime(child, count + 1);
      if (childLastEnd > lastEnd) {
        lastEnd = childLastEnd;
      }
    });
  }
  return lastEnd;
}
