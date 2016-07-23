videojs.plugin('ttml', function(options) {
  const player = this;

  player.addChild('ttmlDisplay');

  const dfxpurl = options.src;
  videojs.xhr({
    uri: dfxpurl
  }, function(err, res, body) {
    if (res.statusCode >= 400) {
      return videojs.error(err);
    }

    parseTtml(body);
  });
});
