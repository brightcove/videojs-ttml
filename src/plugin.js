videojs.plugin('ttml', function(options) {
  const player = this;
  let ttmlDisplay;

  const dfxpurl = options.src;
  videojs.xhr({
    uri: dfxpurl
  }, function(err, res, body) {
    if (res.statusCode >= 400) {
      return videojs.error(err);
    }

    const styleParser = parseTtml(body, player.currentHeight());
    player.ttml.styleParser = styleParser;

    ttmlDisplay = player.addChild('ttmlDisplay');
  });

  document.querySelector('.on-button').addEventListener('click', function() {
    ttmlDisplay.enable();
  });
  document.querySelector('.off-button').addEventListener('click', function() {
    ttmlDisplay.disable();
  });

  document.querySelector('.en-button').addEventListener('click', function() {
    ttmlDisplay.setLanguage('en');
    ttmlDisplay.enable();
  });

  document.querySelector('.fr-button').addEventListener('click', function() {
    ttmlDisplay.setLanguage('fr');
    ttmlDisplay.enable();
  });
});
