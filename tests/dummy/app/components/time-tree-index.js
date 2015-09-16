import Ember from 'ember';

export default Ember.Component.extend({

  events: [
    {
      label: "part 1",
      start: 0,
      end: 2
    },
    {
      label: "part 2",
      start: 2,
      end: 4
    },
    {
      label: "part 3",
      start: 4,
      end: 6
    }
  ],

  actions: {
    dummyAction: function(){
      this.set('events', [
        {
          label: "part 1",
          start: 0,
          end: 1.9
        },
        {
          label: "part 2",
          start: 1.9,
          end: 3.7
        },
        {
          label: "part 3",
          start: 3.7,
          end: 5.5
        }
      ]);

      this.rerender();
    }
  }

});

