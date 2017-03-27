//import videojs from 'video.js';
const Component = videojs.getComponent('Component');

const TtmlDisplay = videojs.extend(Component, {
  constructor: function(player, options) {
    Component.apply(this, arguments);

    const captionsArray = player.ttml.styleParser.captionsArray;
    if ('Default' in captionsArray) {
      this.lang_ = 'Default';
    } else if ('en' in captionsArray) {
      this.lang_ = 'Default';
    } else {
      for (let lang in captionsArray) {
        this.lang_ = lang;
        break;
      }
    }
    this.visibleCaptions = {};
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
  },

  setLanguage: function(lang) {
    this.lang_ = lang;
  },

  enable: function() {
    this.on(this.player(), 'timeupdate', this.update);
  },

  disable: function() {
    this.off(this.player(), 'timeupdate', this.update);
    this.removeCaptions();
  },

  removeCaption: function(index) {
    const caption = this.visibleCaptions[index];
    caption.parentNode.removeChild(caption);
    delete this.visibleCaptions[index];
  },

  removeCaptions: function(ct) {
    const player = this.player();
    const captions = player.ttml.styleParser.captionsArray[this.lang_]

    for (const i in this.visibleCaptions) {
      const caption = captions.get(i);

      if (!ct && caption ||
          (caption &&
           ct && (caption.begin > ct || caption.end <= ct))) {
        this.removeCaption(i);
      }
    }
  },

  update(e) {
    const player = this.player();
    const captions = player.ttml.styleParser.captionsArray[this.lang_]
    const ct = player.currentTime();
    let index = captions.ceil({begin: ct});
    let caption;

    this.removeCaptions(ct);

    for (caption = captions.get(--index);
         caption;
         caption = captions.get(--index)) {
      if (!this.visibleCaptions[index] && caption.end > ct) {
        this.el_.appendChild(caption.content);
        this.visibleCaptions[index] = caption.content;
      }
    }
  }
});

videojs.registerComponent('TtmlDisplay', TtmlDisplay);
