// Copyright (C) 2013 CrowdStrike, Inc.
// This file is subject to the terms and conditions of the BSD License.
// See the file LICENSE in the main directory for details

function lastEndTime(node, count) {
  if (!count) { count = 0; }
  if (count > 100) { throw new Error("Infinite loop in children when finding lastEndTime"); }

  var children = node.children || node._children,
      lastEnd = node.end;
  if (children) {
    children.forEach(function(child) {
      var childLastEnd = lastEndTime(child, count+1);
      if (childLastEnd > lastEnd) {
        lastEnd = childLastEnd;
      }
    });
  }
  return lastEnd;
}

Ember.Timetree.TimetreeView = Ember.View.extend({
  tagName: 'svg',

  width: 750,
  height: 400,
  labelsWidth: 200,
  axisHeight: 20,
  axisPosition: 'bottom',
  indentSize: 20,
  labelAlign: 'left',

  collapsable: true,
  scrubbable: true,
  selectable: true,
  brushable: false,

  showLabels: true,
  showLinks: true,

  attributeBindings: ['_width:width', 'height'],

  classNames: ['timetree-view'],

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

      // Content for selection, optional
      content:  {Obj}
    ]
  */
  content: null,

  selection: null,

  brushRange: null,
  range: null,

  _width: Ember.computed(function() {
    var width = this.get('width');

    if (width === 'auto') {
      if (this.get('element')) {
        width = this.$().parent().width();
      } else {
        width = 0;
      }
    }

    return width;
  }).property('width'),

  _range: Ember.computed(function() {
    var range = this.get('range');
    if (range && range.length === 2) { return range; }

    // Some of this is a bit redundant with renderNodes
    var rootNode = this.get('rootNode');
    if (rootNode.children.length === 0) { return []; }

    var tree = this.get('tree'),
        nodes = tree.nodes(rootNode).slice(1), // Skip root node
        min = d3.min(nodes, function(n) { return n.start; }),
        max = d3.max(nodes, function(n) { return n.lastEnd; });

    return [min, max];
  }).property('range', 'rootNode'),

  contentWidth: Ember.computed(function() {
    return this.get('_width') - this.get('labelsWidth');
  }).property('_width', 'labelsWidth'),

  contentHeight: Ember.computed(function() {
    return this.get('height') - this.get('axisHeight');
  }).property('height', 'axisHeight'),

  timeFormat: Ember.computed(function() {
    return d3.time.format.utc("%H:%M:%S.%L");
  }).property(),

  timeTickFormat: Ember.computed(function() {
    var timeFormat = this.get('timeFormat');
    return function(d){ return timeFormat(new Date(d)); };
  }).property('timeFormat'),

  xScale: Ember.computed(function() {
    return d3.scale.linear().range([0, this.get('contentWidth')]).clamp(true);
  }).property(),

  yScale: Ember.computed(function() {
    return d3.scale.ordinal().rangeRoundBands([0, this.get('contentHeight')], 0.2);
  }).property(),

  xAxis: Ember.computed(function() {
    return d3.svg.axis()
              .scale(this.get('xScale'))
              .orient("bottom")
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
    var nodes = this.get('content'),
        rootNode = { label: 'root', children: [] };

    if (nodes) {
      nodes = nodes.map(function(node) {
        return Ember.$.extend({}, node);
      });

      nodes.forEach(function(node) {
        var parentNode = node.parent != null ? nodes[node.parent] : rootNode;
        if (!parentNode.children) { parentNode.children = []; }
        parentNode.children.push(node);
      });

      nodes.forEach(function(node, idx) {
        if (!node.id) { node.id = idx; }
        if (!node.className) { node.className = ''; }
        node.lastEnd = lastEndTime(node);
      });
    }

    return rootNode;
  }).property('content'),

  adjustXScaleRange: Ember.observer(function() {
    this.get('xScale').range([0, this.get('contentWidth')]);
  }, 'contentWidth'),

  adjustYScaleRange: Ember.observer(function() {
    this.get('yScale').rangeRoundBands([0, this.get('contentHeight')], 0.2);
  }, 'contentHeight'),

  updateXAxisScale: Ember.observer(function() {
    this.get('xAxis').scale(this.get('xScale'));
  }, 'xScale'),

  updateRows: function(rowItems) {
    var yScale = this.get('yScale'),
        width = this.get('_width');

    rowItems
        .attr('x', 0)
        .attr('y', function(n,i) { return yScale(i); })
        .attr('width', width)
        .attr('height', yScale.rangeBand());
  },

  drawAxis: function() {
    this.get('svg').select(".x.axis").call(this.get('xAxis'));
  },

  renderNodes: function() {
    var rootNode = this.get('rootNode');
    if (rootNode.children.length === 0) { return; }

    var tree = this.get('tree'),
        nodes = tree.nodes(rootNode).slice(1); // Skip root node

    var width = this.get('_width'),
        labelsWidth = this.get('labelsWidth'),
        svg = this.get('svg'),
        rows = svg.select('.rows'),
        labels = svg.select('.labels'),
        timeTickFormat = this.get('timeTickFormat'),
        collapsable = this.get('collapsable'),
        brushable = this.get('brushable'),
        showLabels = this.get('showLabels'),
        showLinks = this.get('showLinks'),
        range = this.get('_range');

    var xScale = this.get('xScale'),
        yScale = this.get('yScale'),
        xAxis = this.get('xAxis'),
        content = svg.select('.content');

    xScale.domain(range);
    yScale.domain(d3.range(nodes.length));

    var rowItems = rows.selectAll('.row')
                        .data(nodes, function(n) { return n.id; });

    rowItems.enter().append('rect')
        .attr('class', function(n) { return 'row '+n.className; });

    rowItems.exit().remove();

    this.updateRows(rowItems);

    if (labelsWidth > 0) {
      var indentSize = this.get('indentSize'),
          labelAlign = this.get('labelAlign'),
          showCircles;

      showLinks = showLinks && indentSize > 0;
      showCircles = collapsable || showLinks;

      if (showLinks) {
        var links = tree.links(nodes),
            linkItems = labels.selectAll(".link")
                            .data(links);

        linkItems.enter().insert("path", ":first-child")
            .attr("class", "link");

        linkItems.exit().remove();

        linkItems.attr("d", function(d) {
              return "M" + (d.source.depth * indentSize) + "," + (yScale(nodes.indexOf(d.source)) + yScale.rangeBand() / 2) +
                     "V" + (yScale(nodes.indexOf(d.target)) + yScale.rangeBand() / 2) + "H" + (d.target.depth * indentSize);
            });
      }

      var labelItems = labels.selectAll('.label')
                          .data(nodes, function(n) { return n.id; });

      var labelItemsEnter = labelItems.enter().append('g')
            .attr('class', function(n) { return 'label '+n.className; });

      if (showCircles) {
        var circles = labelItemsEnter.append('circle');

        if (collapsable) {
          var self = this;
          circles.attr('class', 'collapsable')
            .on('click', function(n) {
              self.toggleNode(n);
              self.renderNodes();
            });
        }
      }

      labelItemsEnter.append('text');

      labelItems.exit().remove();

      labelItems
        .attr('transform', function(n,i) { return 'translate('+ (n.depth * indentSize) + ',' + (yScale(i) + yScale.rangeBand() / 2) + ')'; });

      labelItems
        .classed('has-children', function(n) { return n.children || n._children; });

      labelItems
        .classed('closed', function(n) { return n._children; });

      labelItems.selectAll('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 6);

      var labelText = labelItems.selectAll('text');

      labelText
        .attr('dx', showLinks ? 10 : 0) // padding-left
        .attr('dy', ".35em") // vertical-align: middle
        .text(function(n) { return n.label; });

      if (labelAlign === 'right') {
        labelText
          .attr("text-anchor", "end")
          .attr('x', function(n) { return labelsWidth + xScale(n.start) - 10; });
      }
    }

    this.drawAxis();

    var bars = content.selectAll('.bars').selectAll('.bar')
                      .data(nodes, function(n) { return n.id; });

    var barsEnter = bars.enter().append('g')
                            .attr('class', function(n) { return 'bar '+n.className; });

    barsEnter.append('rect')
      .attr('class', 'duration');

    barsEnter.call(function(sel) {
      sel.each(function(n, i) {
        if (n.sections) {
          d3.select(this).selectAll('.section').data(n.sections).enter()
            .append('rect')
              .attr('class', function(s) { return 'section '+s.className; });
        }
      });
    });

    if (showLabels) {
      barsEnter.append('text')
        .attr('class', 'duration');
    }

    bars.exit().remove();

    bars
        .attr("transform", function(n,i){ return "translate(" + xScale(n.start) + "," + yScale(i) + ")"; })
        .classed("collapsed", function(n) {
          return n._children;
        });


    bars.selectAll('rect.duration')
        .attr('width', function(n) { return xScale(n.end) - xScale(n.start); })
        .attr('height', yScale.rangeBand());

    bars.call(function(sel) {
      sel.each(function(n, i) {
        if (n.sections) {
          d3.select(this).selectAll('.section').data(n.sections)
              .attr('x', function(s) { return xScale(s.start) - xScale(n.start); })
              .attr('width', function(s) { return xScale(s.end) - xScale(s.start); })
              .attr('height', yScale.rangeBand());
        }
      });
    });

    if (showLabels) {
      bars.selectAll('text.duration')
          .attr('x', 0)
          .attr('y', function() { return yScale.rangeBand() / 2; })
          .attr('dx', 3) // padding-left
          .attr('dy', ".35em") // vertical-align: middle
          .text(function(n) { return (n.end - n.start)/1000 + 's'; });
    }

    if (brushable) {
      var brush = this.get('brush'),
          contentHeight = this.get('contentHeight');

      content.selectAll('.brush')
          .call(brush)
        .selectAll("rect")
          .attr("y", -6)
          .attr("height", contentHeight + 7);
    }

    if (this.didRenderNodes) {
      this.didRenderNodes(nodes);
    }
  },

  nodesNeedRerender: Ember.observer(function() {
    Ember.run.once(this, 'renderNodes');
  }, 'rootNode', 'height', '_width', '_range.[]'),

  doHighlight: function(y) {
    if (!this.get('selectable')) { return; }

    var svg = this.get('svg');
    svg.select('.rows').selectAll('.row')
      .classed('hover', function() {
        var top = Number(this.getAttribute('y')),
            bottom = top + Number(this.getAttribute('height'));
        return top <= y && y < bottom;
      });
  },

  doScrub: function(x) {
    if (!this.get('scrubbable')) { return; }

    var svg = this.get('svg'),
        scrubber = svg.select('.content').select('.scrubber');

    if (x === undefined) {
      x = Number(scrubber.attr('x1'));
    } else {
      scrubber
        .attr('x1', x)
        .attr('x2', x);
    }

    var bars = svg.select('.content').selectAll('.bar');
    bars.classed('hover', function() {
      // FIXME: This should be data based
      var transform = this.getAttribute('transform'),
          match = transform.match(/translate\(([\d\.]+),([\d\.]+)\)/);
      var start = Number(match[1]),
          end = start + Number(d3.select(this).select('rect.duration').attr('width'));
      return start <= x && x <= end;
    });
  },

  doBrush: function() {
    if (!this.get('brushable')) { return; }

    var brush = this.get('brush');

    this.set('brushRange', brush.empty() ? null : brush.extent());
  },

  toggleNode: function(node) {
    if (node.children) {
      node._children = node.children;
      delete node.children;
    } else {
      node.children = node._children;
      delete node._children;
    }
  },

  didInsertElement: function() {
    var labelsWidth = this.get('labelsWidth'),
        contentWidth = this.get('contentWidth'),
        contentHeight = this.get('contentHeight'),
        scrubbable = this.get('scrubbable'),
        selectable = this.get('selectable'),
        brushable = this.get('brushable'),
        axisHeight = this.get('axisHeight'),
        axisPosition = this.get('axisPosition'),
        contentTop = axisPosition === 'top' ? axisHeight : 0,
        axisTop = axisPosition === 'top' ? axisHeight : contentHeight;


    var svg = this.get('svg'),
        rows, labels, content, scrubber;

    var self = this;

    if (axisHeight > 0) {
      svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + labelsWidth + "," + axisTop + ")");
    }

    rows = svg.append("g")
              .attr('class', 'rows')
              .attr("transform", "translate(0,"+contentTop+")");

    if (labelsWidth > 0) {
      labels = svg.append("g")
                  .attr('class', 'labels')
                  .attr("transform", "translate(0,"+contentTop+")");
    }

    content = svg.append("g")
               .attr('class', 'content')
               .attr("transform", "translate(" + labelsWidth + ","+contentTop+")");

    content.append("g")
      .attr("class", "bars");

    if (scrubbable) {
      scrubber = content.append("line")
                      .attr('class', 'scrubber')
                      .attr('x1', 0)
                      .attr('x2', 0)
                      .attr('y1', 0)
                      .attr('y2', contentHeight);
    }

    if (scrubbable || selectable) {
      svg.on('mousemove', function(){
        var mouse = d3.mouse(content.node());
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
        var rowItems = rows.selectAll('.row');
        rowItems.classed('selected', function(){
          // FIXME: Not ideal to be checking classes here
          return this.className.baseVal.match('hover');
        });
        self.set('selection', rowItems.filter('.selected').data().mapProperty('content'));
      });
    }

    if (brushable) {
      content.append("g")
        .attr("class", "x brush");
    }

    this.renderNodes();

    Ember.$(window).on('resize', Ember.$.proxy(this, 'windowDidResize'));
    this.windowDidResize();
  },

  willDestroyElement: function() {
    Ember.$(window).off('resize', Ember.$.proxy(this, 'windowDidResize'));
  },

  windowDidResize: function() {
    this.notifyPropertyChange('_width');
  }
});
