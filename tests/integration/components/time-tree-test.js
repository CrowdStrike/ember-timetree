import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import fixtures from '../../helpers/fixtures';

moduleForComponent('time-tree', 'Integration | Component | time tree', {
  integration: true
});

test('it renders', function(assert) {
  assert.expect(2);

  this.set('content', fixtures);
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{time-tree content=content}}`);

  assert.equal(this.$("svg .labels").text(), "OneThreeSixSevenTwoFourFiveEightNine");
  assert.equal(this.$("svg .rows .row").length, fixtures.length);
});
