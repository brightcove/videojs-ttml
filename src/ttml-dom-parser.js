const defaultStyleOptions = {
  'set': false,
  'show-background': true,
  'background-color': '#000',
  'text-color': '#FFF'
};
const styleClasses = {};

const styleNode = document.createElement('style');

const TtmlDomParser = function(dom, styleOptions, height) {
  styleOptions = styleOptions || {};
  const cssObj = videojs.mergeOptions(defaultStyleOptions, styleOptions);
  const cssArr = [];

  /**
   * Maps a tag name (e.g., body, span) to a list of TTS styles that
   * can be applied to that type of node.
   */
  this.tagsMap = {
    body:   [],
    div:    [],
    p:      [],
    region: [],
    span:   []
  };
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

  this.setNamespaces(dom);
  this.parseHead(dom);
};

/**
 * The DFXP file may be using a legacy namespace, so we'll construct 
 * the "tts" styling namespace from the xmlns attribute (if it exists) 
 * and default to the stable namespace otherwise.
 * 
 * @param dom {Document} The XML dom created in CaptionsModule#loadDFXP
 */
TtmlDomParser.prototype.setNamespaces = function(dom) {
  var tt, ns, tts, attr;
  tt = dom.getElementsByTagName('tt');
  if (tt.length) {
    tt = tt[0];
    ns = tt.getAttribute('xmlns');
  }
  if (!ns) {
    ns = 'http://www.w3.org/ns/ttml';
  }
  tts = tt.getAttributeNS(ns, 'tts');
  if (!tts) {
    tts = ns + '#styling';
  }

  attr = tt.getAttribute('xml:lang');
  if (attr) {
    // update language scope
    this.langs.push(attr);
  }

  this.ttml = ns;
  this.tts = tts;
}

/**
 * `<style>` nodes work much like CSS classes. <style> nodes are defined
 * in the TTML document's `<head>` element. They have an `id` attribute
 * and a list of style properties (such as `color`). Captions with a 
 * `style` attribute will inherit the styling of the <style> node with
 * the corresponding `id`
 * .
 * This method creates new CSS declarations within the HTML's body.
 * The new CSS declarations are prefixed with "bc-ttml-" to prevent
 * conflicts with existing rules.
 */
TtmlDomParser.prototype.parseStyleNode = function(node, type) {
  var 
    id  = node.getAttribute('xml:id'),
  // an array of the css declarations to create for this style node
  declarations = {}, 
  inline = {}, 
  // the name of the TTS style property
  name, 
  // its corresponding CSS property
  cssName, 
  // the CSS value of the property
  value,
  declaration,
  declarationsArray,
  referential = {},
  i,
  j,
  properties,
  prop,
  styleDeclarations,
  regionDeclarations,
  regionId;


  for (name in ttsStyles) {
    cssName = ttsStyles[name].css;
    inline = this.addValue(cssName, name, inline, node);
  }

  referential = node.getAttribute('style');
  declarations = videojs.mergeOptions(styleClasses[referential], styleClasses[referential + '-region'], inline);


  if(type == 'styling'){
    if (!id) { return undefined; }
    // prefix the selector to avoid conflicts with existing rules
    properties = this.getPropertiesByTag('region');
    styleDeclarations = {};
    regionDeclarations = {};
    regionId = id + '-region';

    for (i = 0; i < properties.length; i++) {
      prop = ttsStyles[properties[i]];
      cssName = prop.css;
      if (prop.tags.length == 1) {
        for (j = 0; j < cssName.length; j++) {
          regionDeclarations[cssName[j]] = declarations[cssName[j]];
          delete declarations[cssName[j]];
        }
      }
    }
    for (prop in declarations) {
      styleDeclarations[prop] = declarations[prop];
    }
    styleClasses[id] = styleDeclarations;
    styleClasses[regionId] = regionDeclarations;
    id = 'bc-ttml-' + id;
    declarationsArray = [];
    for (declaration in styleDeclarations) {
      declarationsArray.push( declaration + ':' + styleDeclarations[declaration]);
    }
    this.addRule(id, declarationsArray);
    for (declaration in regionDeclarations) {
      declarationsArray.push( declaration + ':' + regionDeclarations[declaration]);
    }
    this.addRule(regionId, declarationsArray);
  }
  if(type == 'region') {
    return declarations;
  }
};

/**
 * Validates that a value is valid for a given TTS style property.
 *
 * @param name {string} The name of the TTS style property.
 * @param value {*} The current value of the TTS style property.
 * @return {boolean} `true` if the value is valid.
 */
TtmlDomParser.prototype.validate = function(prop, value){
  var 
      i,
      values = prop.values;
  if (!values || !values.length) { return true; }
  for (i = 0; i < values.length; i++) {
    if (values[i] === value) { return true; }
  }
  return false;
};

/**
 * Given a TTS property value, `parseValue` will:
 *   1) Validate the value to ensure it is a legal TTS value
 *      (If it is invalid, this value be transformed into the
 *       appropriate default value for that property)
 *   2) Translate TTML values into their CSS equivalents
 *      (e.g., #0000007F -> rgba(0,0,0,.5))
 *
 * The TTS attribute will then be removed from the node.
 *
 * @param name {string} The name of the TTS style property.
 * @param node {Element} The node on which the style is applied.
 * @return {string} The validated/translated value as a CSS string.
 */
TtmlDomParser.prototype.parseValue = function(name, node) {
  var 
      prop = ttsStyles[name],
      value = node.getAttributeNS(this.tts, name) || node.getAttribute('tts:' + name);
  if (!value) { return undefined; }
  if (!this.validate(prop, value)) {
    value = prop.init;
  }
  if (prop.transform) {
    value = prop.transform(value, node);
  }
  node.removeAttributeNS(this.tts, name);
  return value;
};

TtmlDomParser.prototype.addValue = function(cssName, name, css, node) {
  var i,
  value,
  values;
  values = [].concat(this.parseValue(name, node));
  for (i = 0; i < cssName.length; i++) {
    value = values[i];
    if (value != undefined) {
      css[cssName[i]] = value;
    }
  }

  return css;
};

/**
 * Parses the TTML document's <head> for any <style> elements.
 */
TtmlDomParser.prototype.parseHead = function(dom) {
  const stylings = dom.querySelectorAll('styling');
  for (let i = 0; i < stylings.length; i++) {
    const styling = stylings[i];
    const styles = styling.querySelectorAll('style');
    for (let j = 0; j < styles.length; j++) {
      const style = styles[j];
      this.parseStyleNode(style, 'styling');
    }
  }
  //this.parseLayout($(dom).find('layout').get(0));
};

/**
 * Given a TTML tag name, returns a list of style properties that can be applied.
 * @param tag {string} A TTML tag name (body, div, span, etc.)
 * @return {array} An array of style properties that can be applied to a given tag.
 */
TtmlDomParser.prototype.getPropertiesByTag = function(tag) {
  return this.tagsMap[tag];
},

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
