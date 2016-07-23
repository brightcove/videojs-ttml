const parseTtml = function(ttml) {
  const dom = (new DOMParser()).parseFromString(ttml, 'text/xml');

  // remove all potential <script> elements
  const domScripts = dom.querySelectorAll('script');
  for (let i = 0; i < domScripts; i++) {
    const domScript = domScripts[i];
    domScript.parentNode.removeChild(domScript);
  }

  if (!dom || dom.querySelector('parsererror')) {
    videojs.error('failed to parse the TTML');
  }

  const language = dom.documentElement.getAttribute('xml:lang');
  const body = dom.querySelector('body');
  
  console.log(language, body);
};
