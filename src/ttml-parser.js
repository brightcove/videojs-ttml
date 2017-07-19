const parseTtml = function(ttml, height) {
  const dom = (new DOMParser()).parseFromString(ttml, 'text/xml');
  if (!dom || dom.querySelector('parsererror')) {
    videojs.error('failed to parse the TTML');
  }

  // remove all potential <script> elements
  const domScripts = dom.querySelectorAll('script');
  for (let i = 0; i < domScripts; i++) {
    const domScript = domScripts[i];
    domScript.parentNode.removeChild(domScript);
  }

  const language = dom.documentElement.getAttribute('xml:lang');
  const body = dom.querySelector('body');

  const styleParser = new TtmlDomParser(dom, {}, height);

  return styleParser;
};
