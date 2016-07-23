const defaultStyleOptions = {
  'set': false,
  'show-background': true,
  'background-color': '#000',
  'text-color': '#FFF'
};

const styleNode = document.createElement('style');

const TtmlDomParser = function(dom, styleOptions, height) {
  styleOptions = styleOptions || {};
  const cssObj = videojs.mergeOptions(defaultStyleOptions, styleOptions);
  const cssArr = [];

  this.captionsArray = [];
  this.regionsDictionary = [];
  this.langs = ['Default'];

  for (let styleProp in cssObj) {
    if (styleProp == 'show-background') {
      continue;
    }
    cssArr.push(styleProp + ':' + cssObj[styleProp]);
  }
  styleNode.textContent = '';
  this.addRule('bc-default-style', cssArr);
  this.addRule('caption',
               ['position:absolute',
                'bottom:10%',
                'left:2.5%',
                'width:95%',
                'margin:0 auto',
                'padding:5px',
                'box-sizing:border-box']);

  this.addRule('bc-default-region-style',
               ['width:auto',
                'height:auto',
                'top: 10%',
                'right: 2.5%',
                'bottom: 10%',
                'left: 2.5%',
                'padding: auto']);

};

/**
 * Creates a new CSS rule from a selector and a list of declarations.
 * @param selector {string} The `id` attribute of a TTS <style> tag
 * @param decls {array} An array of style declarations as strings:
 *                      e.g., ["color:rgb(0,0,0)", "background-color:white"]
 */
TtmlDomParser.prototype.addRule = function(selector, decls){
  if (!decls || !decls.length) {
    return;
  }
  if (!styleNode.parentNode) {
    document.head.insertBefore(styleNode, document.head.firstChild);
  }
  let rule = '.' + selector + "{\n  " + decls.join(';\n  ') + ';' + "\n}";
  rule = document.createTextNode(rule);
  styleNode.appendChild(rule);
}
