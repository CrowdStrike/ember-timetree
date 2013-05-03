App = Ember.Application.create({
  rootElement: '#app'
});

App.ApiData = [
  {
    "label"             : "Network Requests",
    "start"             : 1347800918,
    "end"               : 1347801818,
    "className"         : "network"
  },
  {
    "label"             : "Layout",
    "start"             : 1347801100,
    "end"               : 1347801918,
    "className"         : "layout"
  },
  {
    "label"             : "index.html",
    "start"             : 1347800918,
    "end"               : 1347801818,
    "className"         : "network",
    "parent"            : 0
  },
  {
    "label"             : "Paint",
    "start"             : 1347801118,
    "end"               : 1347801818,
    "className"         : "layout",
    "sections"          : [{
                            "start"     : 1347801118,
                            "end"       : 1347801218
                          }, {
                            "start"     : 1347801618,
                            "end"       : 1347801718
                          }],
    "parent"            : 1
  },
  {
    "label"             : "Reflow",
    "start"             : 1347801756,
    "end"               : 1347801907,
    "className"         : "layout",
    "parent"            : 1
  },
  {
    "label"             : "screen.css",
    "start"             : 1347801218,
    "end"               : 1347801618,
    "className"         : "network",
    "parent"            : 2
  },
  {
    "label"             : "app.js",
    "start"             : 1347801418,
    "end"               : 1347801818,
    "className"         : "network",
    "parent"            : 2
  },
  {
    "label"             : "JavaScript",
    "start"             : 1347801619,
    "end"               : 1347801920,
    "className"         : "javascript"
  },
  {
    "label"             : "domready",
    "start"             : 1347801664,
    "end"               : 1347801670,
    "className"         : "javascript",
    "parent"            : 7
  },
  {
    "label"             : "eval",
    "start"             : 1347801447,
    "end"               : 1347801920,
    "className"         : "javascript",
    "sections"          : [{
                            "start"     : 1347801447,
                            "end"       : 1347801497
                          }, {
                            "start"     : 1347801831,
                            "end"       : 1347801920
                          }],
    "parent"            : 7
  },
  {
    "label"             : "load",
    "start"             : 1347801820,
    "end"               : 1347801830,
    "className"         : "javascript",
    "parent"            : 7
  }
];

App.ChromeDevToolsTimetreeView = Ember.Timetree.TimetreeView.extend({
  timeTickFormat: Ember.computed(function() {
    var minTime = this.get('xScale').domain()[0];
    var minTime = d3.min(this.content.mapProperty('start'));
    return function(d){ return parseInt(d - minTime) + 'ms'; };
  }).property(),

  durationFormatter: function(n) { return (n.end - n.start) + 'ms'; }
});
