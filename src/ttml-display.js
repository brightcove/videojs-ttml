//import videojs from 'video.js';
const Component = videojs.getComponent('Component');

const TtmlDisplay = videojs.extend(Component, {
  constructor: function(player, options) {
    Component.apply(this, arguments);
  },

  /**
   * Create the component's DOM element
   *
   * @return {Element}
   * @method createEl
   */
  createEl: function() {
    return Component.prototype.createEl.call(this, 'div', {
      className: 'vjs-ttml-display'
    }, {
      'aria-live': 'assertive',
      'aria-atomic': 'true'
    });
  }
});

videojs.registerComponent('TtmlDisplay', TtmlDisplay);
