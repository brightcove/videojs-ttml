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
  this.parseBody(dom);
};

/**
 * Parses the <body> element.
 */
TtmlDomParser.prototype.parseBody = function(dom) {
  var i,
      css,
      attr,
      bodyLanguage = this.langs[this.langs.length-1],
      body = dom.getElementsByTagName('body')[0],
      bodyParentNode;
  if (!body) { return; }

  this.parseStyleAttribute(body);
  css = this.parseNode(body);
  this.applyStyle(body, css);
  // Set all child <p> and <div> elements to have the same class as the container div
  for (i = 0; i < body.childNodes.length; i++) {
    child = body.childNodes[i];

    bodyNode = document.createElement("div");
    bodyNode.setAttribute('class', body.getAttribute('class'));
    bodyNode.setAttribute('style', body.getAttribute('style'));

    // Set positioning to relative as this will be put inside of a div 
    // that represents the region.
    bodyNode.style.position = 'relative'; 
    bodyNode.style.height= '100%'; 

    attr = body.getAttribute('xml:lang');
    if (attr) {
      // update language scope
      this.langs.push(attr);
      bodyLanguage = attr;
    }
    attr = body.getAttribute('xml:space');
    if (attr) {
      // update the whitespace handling state
      preserveWhitespaces.push(attr == 'preserve');
    }

    if (child.nodeName == "div") {
      this.parseDivs(bodyNode, child, bodyLanguage);
    }

    else if (child.nodeName == "p") {
      this.parseParagraph(child, bodyNode, bodyLanguage);
    }
  }
};

/**
 * Parses the <div> elements.
 */
TtmlDomParser.prototype.parseDivs = function(parentNode, currentDiv, language) {
  var i,
      begin,
      end,
      divLanguage,
      currentDivCopy,
      css;
  if (!currentDiv) { return; }

  css = this.parseNode(currentDiv);
  this.applyStyle(currentDiv, css);
  divLanguage = language;
  this.parseStyleAttribute(currentDiv);

  attr = currentDiv.getAttribute('xml:lang');
  if (attr) {
    this.langs.push(attr);
    divLanguage = attr;
  }

  currentDivCopy = document.createElement("div");
  currentDivCopy.setAttribute('class', currentDiv.getAttribute('class'));
  currentDivCopy.setAttribute('style', currentDiv.getAttribute('style'));
  currentDivCopy.style.height="100%";

  parentNode.appendChild(currentDivCopy);

  for (i = 0; i < currentDiv.childNodes.length; i++) {
    child = currentDiv.childNodes[i];
    if (child.nodeName == "div") {
      this.parseDivs(currentDivCopy, child, divLanguage);
    }

    else if (child.nodeName == "p") {
      this.parseParagraph(child, parentNode, divLanguage);
    }
  }
};

/**
 * Parses the <p> elements.
 */
TtmlDomParser.prototype.parseParagraph = function(child, parentElement, language) {
  var
    divNode = document.createElement("div"),
    tempParent = parentElement.cloneNode(true),
    attr,
    begin,
    end,
    defaultRegionNode,
    currentRegion,
    captionNode,
    regionClass = "",
    childStyle,
    childEntry,
    regionStyle = "";
 
  // We need to extract the origin and extent information on the paragraph and set it
  // at the div level, as p elements can not be positioned.
  currentRegion = this.getRegion(child);
  this.parseStyleAttribute(child);

  var topLevelElement = this.parseCaption(child);
  childStyle = child.getAttribute('style').split(';');
  for(var i=0; i < childStyle.length; i++) {
    childEntry = childStyle[i].split(':');
    if (childEntry[0] == "top" || 
        childEntry[0] == "bottom" || 
        childEntry[0] == "width" || 
        childEntry[0] == "height" || 
        childEntry[0] == "left" || 
        childEntry[0] == "right"){ 
      // This case is necessary to ensure the cell stretches to the edge of the screen if one is not specified.
      if (childEntry[0].replace(/\s+/g, '') == "right" && childEntry[1].replace(/\s+/g, '') == "auto") {
        regionStyle += " " + childEntry[0] + ": 0;";
      } else {
        regionStyle += " " + childEntry[0] + ": " + childEntry[1] + ";";
      }
    }
  }

  if (regionStyle) {
    regionStyle += "vertical-align:top;";  
  } else { 
    regionStyle += "vertical-align:bottom;";  
  }

  // <p> elements should all have begin and end attributes to indicate time constraints
  attr = child.getAttribute('begin');
  // record the current node
  begin = this.timeExprToOffset(attr);
  attr = child.getAttribute('end');
  if (attr) {
    end = Math.max(0, this.timeExprToOffset(attr));
  } else {
    end = begin + this.timeExprToOffset(child.getAttribute('dur'));
  }

  if (!this.captionsArray[language]) {
    // first caption for this language
    this.captionsArray[language] = new SortedList();
  }
  if(currentRegion) {

    this.getEdgeNode(tempParent).appendChild(this.copyDOM(topLevelElement));
    defaultRegionNode = document.createElement("div");
    defaultRegionNode.setAttribute('class', "bc-ttml-region-" + currentRegion);
    defaultRegionNode.setAttribute('style', "position: absolute; " + regionStyle);
    defaultRegionNode.appendChild(this.getTopLevelNode(tempParent));
    captionNode = defaultRegionNode;
  } else {
    this.getEdgeNode(tempParent).appendChild(this.copyDOM(topLevelElement));
    defaultRegionNode = document.createElement("div");
    defaultRegionNode.setAttribute('class', "bc-default-region-style");
    defaultRegionNode.setAttribute('style', "position: absolute;" + regionStyle);
    defaultRegionNode.appendChild(this.getTopLevelNode(tempParent));
    captionNode = defaultRegionNode;
  }

  this.captionsArray[language].add({
            begin: begin, 
            end: end,
            content: captionNode
  });
};

/**
 * Parses a caption <p> element. Iterates through the caption's
 * children and applies their TTS style as CSS. 
 * Returns a string of CSS text that will be applied to the 
 * caption from the CaptionOverlay class.
 * 
 * @param node {Element} The caption
 * @return {string} the css text representation of the TTS style
 */
TtmlDomParser.prototype.parseCaption = function(node) {
  var 
      i,
      j,
      css,
      child,
      span = node.ownerDocument.createElement('span'),
      tableDiv = node.ownerDocument.createElement('div'),
      tableCellDiv = node.ownerDocument.createElement('div'),
      verticalSpan,
      region,
      style,
      styleAttr,
      padding,
      height,
      verticalAlign,
      cssP = {},
      cssTable = {},
      cssCell = {},
      cssProp,
      cssVal,
      cssProps;

  this.copyChildren(node, span);
  node.appendChild(span);

  styleAttr = node.getAttribute('style');
  node.removeAttribute('style');

  region = this.getParentAttribute(node, 'region');
  style = styleClasses[region];
  verticalAlign = style && style['vertical-align'];

  if (!verticalAlign) {
    if(node.getAttribute('tts:origin') || node.getAttribute('tts:extent')) {
      verticalAlign = "top";
    } else {
      verticalAlign = "bottom";
    }
  }

  if (verticalAlign) {
      region && span.setAttribute('region', region);

      verticalSpan = node.ownerDocument.createElement('span');
      styleAttr && verticalSpan.setAttribute('style', styleAttr);
      this.copyChildren(span, verticalSpan);
      span.appendChild(verticalSpan);
  } else {
      styleAttr && span.setAttribute('style', styleAttr);
  }

  css = this.parseNode(node);

  for (i = 0; i < paragraphSpecific.length; i++) {
    cssProps = ttsStyles[paragraphSpecific[i]].css;
    for (j=0; j < cssProps.length; j++) {
        cssProp = cssProps[j];
        cssVal = css[cssProp];
        if (cssVal) {
          cssP[cssProp] = css[cssProp];
          delete css[cssProp];
        }
    }
  }

  if (verticalAlign) {
      if (cssP['text-align']) {
          css['text-align'] = cssP['text-align'];
      }

      cssCell['display'] = 'table-cell';
      cssCell['vertical-align'] = verticalAlign;
      // css['background-color'] = 'rgba(0,0,0,0)';

      cssTable['display'] = 'table';
      cssTable['table-layout'] = 'fixed';
      cssTable['width'] = '100%';
      cssTable['height'] = '100%';
      cssP['-webkit-margin-before'] = '0em';
      cssP['-webkit-margin-after'] = '0em';
      
      padding = style && style.padding || '5px';
      /*if (style.height && style.height != 'auto' && padding) {
          height = style.height + ' + (2 * ' + padding + ')';
          cssTable['height'] = '-webkit-calc(' + height + ');';
          cssTable['height'] += 'height: calc(' + height + ')';
      }*/

  }

  this.applyStyle(tableDiv, cssTable);
  this.applyStyle(tableCellDiv, cssCell);

  tableCellDiv.appendChild(node);
  tableDiv.appendChild(tableCellDiv);
  this.applyStyle(node, cssP);

  return tableDiv;
};

TtmlDomParser.prototype.getRegion = function(element) {
  if(element.getAttribute('region')) { 
    return element.getAttribute('region');
  } else if (!element.parentElement) {
    return null;
  } else {
    return this.getRegion(element.parentElement);
  }
};

TtmlDomParser.prototype.getTopLevelNode = function(element) {
  if(element.parentElement) {
    return this.getTopLevelNode(element.parentElement); 
  } else { return element; }
};

TtmlDomParser.prototype.getEdgeNode = function(element) {
  if(element.children.length == 0) {
    return element;
  } else {
    return element.children[0];
  }
};

TtmlDomParser.prototype.copyDOM = function(node) {
    var newNode = this.copyNode(node),
        child,
        i;

    for (i = 0; i < node.childNodes.length; i++) {
        child = this.copyDOM(node.childNodes[i]);
        newNode.appendChild(child);
    }
    return newNode;
};

TtmlDomParser.prototype.copyNode = function(node) {
    var newNode;
    if (node.nodeType == Node.ELEMENT_NODE) {
        newNode = document.createElement(node.nodeName);
        newNode.setAttribute('class', node.getAttribute('class'));
        newNode.setAttribute('style', node.getAttribute('style'));
    }  else if ((node.nodeType == Node.TEXT_NODE) || (node.nodeType == Node.CDATA_SECTION_NODE)) {
        newNode = document.createTextNode(node.textContent);
    }
    return newNode;
};

/**
 * Transforms a TTS "style" attribute to an HTML "class" attribute (for CSS).
 */
TtmlDomParser.prototype.parseStyleAttribute = function(node) {
  var 
      style = node.getAttribute('style');
  if (style) {
    node.removeAttribute('style');
    // The class name is prefixed with "bc-ttml-" to prevent conflicts with
    // existing CSS rules.
    this.addClass(node, 'bc-ttml-' + style);
  }
  if (styleOptions.set) {
      this.addClass(node, 'bc-default-style');
  }
  return node;
};

TtmlDomParser.prototype.addClass = function (elem, value) {
    classNames = [value];
    if (elem.nodeType === Node.ELEMENT_NODE) {
        if (!elem.getAttribute('class') && classNames.length === 1) {
            elem.setAttribute('class', value);
        } else {
            setClass = " " + elem.getAttribute('class') + " ";
            for (c = 0, cl = classNames.length; c < cl; c++) {
                if (!~setClass.indexOf(" " + classNames[c] + " ")) {
                    setClass += classNames[c] + " ";
                }
            }
            elem.setAttribute('class', jQuery.trim(setClass));
        }
    }

    return elem;
};

/**
 * Parses a TTML node (such as a <body>, <div> or <span>) and translates
 * any TTS styling to a map of CSS properties and values.
 * 
 * Removes any unsupported attributes. 
 *
 * @return {object} A map of CSS property names to CSS values.
 */
TtmlDomParser.prototype.parseNode = function(node) {
  var 
      i,
      // the CSS properties and values to apply
      css,
      // the TTML node's tag name (e.g, "span").
      tag = node.nodeName.toLowerCase(),
      // a list of the TTS properties that can be applied to this tag
      properties = this.getPropertiesByTag(tag),
      // the name of the TTS property
      name,
      // the associated CSS name
      cssName,
      // the CSS value
      value,
      child;

  for (i = 0; i < node.childNodes.length; i++) {
    child = node.childNodes[i];

    if (child.nodeType == Node.ELEMENT_NODE && tag != "body" && tag != "div") { 
      css = this.parseNode(child);
      this.applyStyle(child, css);
    }
  }
  if (!properties) { return undefined; }
  this.parseStyleAttribute(node);
  css = {};
  for (i = 0; i < properties.length; i++) {
    name    = properties[i];
    cssName = ttsStyles[name].css;
    css = this.addValue(cssName, name, css, node);
  }

  css = videojs.mergeOptions(this.getInheritedProperties(node), css);
  return css;
};

TtmlDomParser.prototype.getInheritedProperty = function(node, prop) {
    if (node == null || !node.getAttribute) { return null; }
    var val = node.getAttribute('tts:' + prop);
    //var val = ttsStyles[prop] && ttsStyles[prop].css[0] ];
    if (val) { return val; }
    else { return this.getInheritedProperty(node.parentNode, prop); }
};
TtmlDomParser.prototype.getInheritedProperties = function (node, css) {
    var i,
        property,
        inprop;

    css = css || {};

    for (i = 0; i < inheritedStyles.length; i++) {
        property = inheritedStyles[i];
        inprop = this.getInheritedProperty(node, property);
        if (inprop) { css[ttsStyles[property] && ttsStyles[property].css[0]] = inprop; }
    }

    return css;
};

/**
 * Iterates through a map of CSS property names to values
 * and constructs a CSS text string to apply to a node
 * via `setAttribute('style', ...
 * 
 * Because the span is not an HTML node, we can't effect the 
 * styling by modifying the `style` *property* directly (the 
 * semantics are not the same). I.e., we can't simply use
 * `$(span).css(...)`. Instead, we set the `style` attribute,
 * and when the `node` node is cloned and added to the DOM, 
 * the style attribute will adopt the semantics of an HTML node (and
 * the style will be applied).
 * 
 * @param node {Element} the TTML element on which to apply the style
 * @param css {Object} the map of CSS properties -> values
 * @return {string} the css text
 */
TtmlDomParser.prototype.applyStyle = function(node, css) {
  var 
      prop,
      cssText = '';
  for (prop in css) {
    //if (css[prop] != undefined){
      cssText += prop + ": " + css[prop] + ';';
    //}
  }
  node.setAttribute('style', cssText);
  return cssText;
};

// a function to copy DOM element children from `from' to `to'
// this funciton mutates but also return `to'
TtmlDomParser.prototype.copyChildren = function (from, to) {
    var child;
    while(from.firstChild){
        child = from.removeChild(from.firstChild);
        to.appendChild(child);
    }

    return to;
};

TtmlDomParser.prototype.getParentAttribute = function(node, attribute) {
    if (node == null || !node.getAttribute) { return null; }
    
    var region = node.getAttribute(attribute);
    if (region) { return region; }
    else { return this.getParentAttribute(node.parentNode, attribute); }
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
  // TODO!!!
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

/**
 * Parses a <a
 * href="http://www.w3.org/TR/ttaf1-dfxp/#timing-value-timeExpression">time
 * expression</a> string and returns the number of seconds from video start
 * it represents.
 * 
 * @param pTimeExpr -
 *            a string representation of a DFXP time expression
 * @returns the number of seconds from video start.
 */
TtmlDomParser.prototype.timeExprToOffset = function(pTimeExpr) {
    var
        offsetTimeRxp =  /^(\d+(?:\.\d+)?)(h|m|s|ms)$/,
        clockTimeRxp  =  /^(\d{2,})(?::)(\d{2})(?::)(\d{2})(?:(\.\d+)|:(\d{2,})(?:(\.\d+))?)?$/, 
        defaultFrameRate  = 30,
        defaultSubFrameRate =  1,
        secondsPerMinute = 60,
        secondsPerHour = secondsPerMinute * 60,
        metricConversion = {
          h: secondsPerHour,
          m: secondsPerMinute,
          s: 1,
          ms: 1/1000
        },
        offsetTimeMatch = pTimeExpr.match(offsetTimeRxp), 
        clockTimeMatch,
        result,
        hours,
        minutes,
        seconds,
        fraction,
        frame,
        subframe;

    if (offsetTimeMatch) {
        return parseFloat( offsetTimeMatch[1] * metricConversion[offsetTimeMatch[2]] );
    }
    clockTimeMatch = pTimeExpr.match(clockTimeRxp);
    if (clockTimeMatch) {
        hours = parseInt(clockTimeMatch[1], 10);
        minutes = parseInt(clockTimeMatch[2], 10);
        seconds = parseInt(clockTimeMatch[3], 10);
        fraction = parseFloat(clockTimeMatch[4]);
        frame = parseInt(clockTimeMatch[5], 10);
        subframe = parseFloat(clockTimeMatch[6]);

        result = (secondsPerHour * hours) + 
                 (secondsPerMinute * minutes) + 
                 (seconds);

        if (fraction) {
            result += fraction;
        } else if (frame) {
            frame = Math.max(0, Math.min(defaultFrameRate, frame));

            if (subframe) {
                subframe = Math.max(0, Math.min(defaultSubFrameRate, subframe));
                frame += (subframe/defaultSubFrameRate);
            }
            result += (frame/defaultFrameRate);
        }

        return result;     
    }
};
