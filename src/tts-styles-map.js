const styleOptions = {};

const defaultFontPX = 18;

const languageDictionary = {
    en: "English",
    fr: "French",
    de: "German",
    it: "Italian",
    ja: "Japanese",
    ko: "Korean",
    es: "Spanish",
    th: "Thai"
};
const getLanguage = function (lang) {
    return languageDictionary[lang] || lang || "Default";
};

const defaultFontFamily = "\"Andale Mono\", \"Lucida Console\", monospace";
const fontMap = {
  'default':             defaultFontFamily,
  monospace:             'monospace',
  sansSerif:             'sans-serif',
  serif:                 'serif',
  monospaceSansSerif:    "\"Andale Mono\", \"Lucida Console\", monospace",
  monospaceSerif:        "\"Courier New\", monospace",
  proportionalSansSerif: 'sans-serif',
  proportionalSerif:     'serif',
  casual:                '"Comic Sans MS", Impact, fantasy',
  script:                '"Monotype Corsiva", cursive',
  smallcaps:             '"Andale Mono", "Lucida Console", monospace, sans-serif'
};

// Styles that should be applied directly on a paragraph
// verticalAlign needs to be special-cased and so not included here.
const paragraphSpecific = ['textAlign','lineHeight','origin','extent','textOutline','color',
                           'fontFamily','fontSize','fontStyle','fontWeight','lineHeight','textDecoration',
                           'textAlign','textDecoration','wrapOption'];

const inheritedStyles = ['color', 'direction', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'lineHeight', 
                         'textAlign', 'textDecoration', 'textOutline', 'visibility', 'wrapOption'];
const nonInheritedStyles = ['backgroundColor', 'display', 'extent', 'opacity', 'origin', 'overflow', 
                            'padding', 'showBackground', 'unicodeBidi', 'writingMode', 'zIndex'];

/**
 * A map of each TTS style property names to:
 *  o css:       The corresponding CSS property name 
 *  o tags:      A list of tags the property can be applied to
 *  o transform: A function that can transform a TTS value into a CSS value
 *  o values:    A list of legal values
 *  o init:     The default value
 */
const ttsStyles = {
  backgroundColor: {
    css: ['background-color'],
    tags: ['body', 'div', 'p', 'region', 'span'],
    transform: function(value) {
        var bgcolor = value;
        if (styleOptions.set && styleOptions['show-background'] && styleOptions['background-color']) {
            bgcolor = styleOptions['background-color'];
        }
        return String(parseColor(bgcolor, styleOptions.set && styleOptions['background-opacity']));
    }
  },
  color: {
    css: ['color'],
    tags: ['span', 'p'],
    transform: function(value) {
        var color = value;
        if (styleOptions.set) {
            if (styleOptions['text-color']) {
                color = styleOptions['text-color'];
            } else if (styleOptions.color) {
                color = styleOptions.color;
            }
        }
        return String(parseColor(color, styleOptions.set && styleOptions['text-opacity']));
    }
  },
  fontFamily: {
    css: ['font-family'],
    tags: ['span', 'p'],
    transform: function(value) {
      var fonts = value.split(',').map(function (font) {
          font = font.trim();
          return fontMap[font] || font + ',' + defaultFontFamily;
      }).join(',');

      if (styleOptions.set && styleOptions['font-family']) {
          fonts = styleOptions['font-family'] + ',' + fonts;
      } else if (styleOptions.set && styleOptions['font-name']) {
          fonts = styleOptions['font-name'] + ',' + fonts;
      }
      if (styleOptions.set && styleOptions['font-family'] === "smallcaps" || styleOptions['font-name'] === "smallcaps") {
        return fonts + '; font-variant: small-caps;';
      }
      return fonts;
    }
  },
  fontSize: {
    css: ['font-size'],
    init: '1c',
    tags: ['span', 'p'],
    transform: function(value) {
      var lengths,
          fontWidth;
      value = styleOptions.set && styleOptions['font-size'] || value;
      // <length> <length>?
      // TODO: support second length property
      lengths = parseLengths(value);
      fontWidth = lengths[0];
      return fontWidth;
    }
  },
  fontWeight:  {
    css: ['font-weight'],
    values: ['normal', 'bold'],
    init: 'normal',
    tags: ['span', 'p']
  },
  fontStyle:  {
    css: ['font-style'],
    values: ['normal', 'italic', 'oblique'],
    init: 'normal',
    tags: ['span', 'p']
  },
  textAlign:  {
    css: ['text-align'],
    values: ['left', 'center', 'right', 'start', 'end'],
    init: 'start',
    tags: ['p'],
    transform: function (value) {
        return styleOptions.set && styleOptions["text-align"] || value;
    } 
  },
  textDecoration:  {
    css: ['text-decoration'],
    values: ['none',
             'underline',   'noUnderline',
             'lineThrough', 'noLineThrough',
             'overline',    'noOverline'],
    init: 'none',
    tags: ['span', 'p'],
    transform: function(value) {
      var 
          i,
          decorations = value.split(','),
          decoration,
          negativeDecoration = {
              none: 1,
              noUnderline: 1,
              noLineThrough: 1,
              noOverline: 1
          };
      // From the spec:
      // If a specified value of this attribute is not supported, then a presentation 
      // processor must interpret the attribute as if the value none were specified.

      // HTML text-decorations are not inherited, while in TTML they are, which is why
      // there are the negative values (noUnderline, noLineThrough, noOverline).

      // However, it is *not possible* to disable text-decorations on descendant
      // elements in HTML, so we must set text-decoration to 'none' if we encounter
      // any negative values.
      decorations = value.split(',');
      for(i = 0; i < decorations.length; i++){
        decoration = decorations[i].trim();
        if (negativeDecoration[decoration]) {
          decorations = ['none'];
          break;
        }
        if (decoration === 'lineThrough') { decorations[i] = 'line-through'; }
      }
      decorations = decorations.join(' ');
      return decorations;
    }
  },
  textOutline:  {
    css: ['text-shadow'],
    init: 'none',
    tags: ['span', 'p'],
    transform: function(value, css) {
      var 
          hasColor,
          lengths,
          blur,
          thickness,
          textShadows,
          color = null,
          edgeStyle,
          opacity,
          lightGray,
          darkGray;

      if (styleOptions.set && styleOptions['edge-style']) {
        edgeStyle = styleOptions['edge-style'];
        opacity = styleOptions['text-opacity'] || 1;
        lightGray = hexToRGBA('CCC', true, opacity);
        darkGray = hexToRGBA('222', true, opacity);
        if (edgeStyle === "none") {
          return "none";
        } else if (edgeStyle === "dropshadow") {
          return "2px 2px 3px " + darkGray + ", 2px 2px 4px " + darkGray + ", 2px 2px 5px " + darkGray + ";";
        } else if (edgeStyle === "raised") {
          return "1px 1px " + darkGray + ", 2px 2px " + darkGray + ", 3px 3px " + darkGray + ";";
        } else if (edgeStyle === "depressed") {
          return "1px 1px " + lightGray + ", 0 1px " + lightGray + ", -1px -1px " + darkGray + ", 0 -1px " + darkGray + ";";
        } else if (edgeStyle === "uniform") {
          return "0 0 4px " + darkGray + ", 0 0 4px " + darkGray + ", 0 0 4px " + darkGray + ", 0 0 4px " + darkGray + ";";
        }
      }

      // BNF: none | <color>? <length> <length>?
      // optional <color> term followed by one or two <length> terms
      if (value === 'none') { return value; }

      // if it starts with a number (digit, sign, or decimal place), it can't be a color
      hasColor = !(/^[\d\+\-\.]/.test(value));
      // if it doesn't start with a number, it must be a color
      if (hasColor) {
        color = parseColor(value);
        value = value.substring(color.originalLength).trim();
        color = String(color);
      }
      // From the spec:
      // "if no color term is present, the computed value of the tts:color applies."
      if (color == null) { color = css.color || 0xFFFFFF; }
      lengths = parseLengths(value);

      // The first length term denotes the outline thickness 
      // the second length term, if present, indicates the blur radius.
      if (lengths.length == 0) { return 'none'; }
      if (lengths.length  > 2) { return 'none'; }
      
      thickness = lengths[0];
      blur      = lengths[1] || '2px';
      
      // px are the only supported unit for text-outlines
      if (thickness.indexOf('px') < 1 || blur.indexOf('px') < 1) { return 'none'; }
      
      // text-outline is in css3, but not fully supported yet (no blur-radius).
      // to simulate it, we'll layer progressively blurrier text-shadows atop 
      // one another until we reach the desired thickness. Not perfect.
      
      textShadows = [];
      
      thickness = parseInt(thickness, 10);
      while (thickness > 0) {
        textShadows.push( "0px 0px " + (thickness--) + "px " + color);
      }
      
      return textShadows.join(",");
    }
  },
  opacity: {
    css: ['opacity'],
    init: '1.0',
    tags: ['region'],
    transform: function (value) {
      if (styleOptions.set && styleOptions.opacity == undefined) {
          return styleOptions.opacity;
      }
      if (/^(([0]*?\.\d*)|1|0)$/.test(value)) {
          return value;
      } else {
          return 1;
      }
    }
  },
  overflow: {
      css: ['overflow'],
      values: ['visible', 'hidden'],
      init: 'hidden',
      tags: ['region']
  },
  padding: {
      css: ['padding'],
      init: '0px',
      tags: ['region']
  },
  zIndex: {
      css: ['z-index'],
      init: 'auto',
      tags: ['region']
  },
  origin: {
      css: ['top', 'right', 'bottom', 'left'],
      init: ['auto', 'auto', 'auto', 'auto'],
      tags: ['region', 'div', 'p', 'body'],
      transform: function (value) {
          var values = value.split(' ').map(function (el) { return parseLengths(el)[0]; });
          return [values[1], '0', 'auto', values[0]];
      }
  },
  extent: {
      css: ['width', 'height'],
      init: ['auto', 'auto'],
      tags: ['region', 'div', 'p', 'body'],
      transform: function (value) {
          var values = value.split(' ').map(function (el) { return parseLengths(el)[0]; });
          return values;
      }
  },
  display: {
      css: ['display'], 
      init: 'inline-block', 
      tags: ['body', 'div', 'p', 'region', 'span'], 
      values: ['auto', 'none'], 
      transform: function (value) {
          var values = {'auto':1, 'none':1},
              init = this.init;
              
          return values[value] ?
                 (value == 'none' ? value : init) :
                 init;
      }
  },
  visibility: {
      css: ['visibility'], 
      init: 'visible', 
      tags: ['body', 'div', 'p', 'region', 'span'], 
      values: ['visible', 'hidden']
  },
  lineHeight: {
      css: ['line-height'], 
      init: 'normal',
      tags: ['p'],
      transform: function (value) {
          return value == 'normal' ? value : parseLengths(value)[0] || this.init;
      }
  },
  wrapOption: {
      css: ['white-space'],
      init: 'wrap',
      tags: ['span','p'], 
      values: ['wrap', 'noWrap'],
      transform: function (value) {
          var values = {wrap: 'normal', noWrap: 'nowrap'};
          return values[value] || this.init;
      }
  },
  displayAlign: {
      css: ['vertical-align'],
      values: ['before', 'center', 'after'],
      init: 'before',
      tags: ['region'],
      transform: function (value) {
          var values = {
              before: 'top',
              center: 'middle',
              after: 'bottom'
          };

          return values[value] || this.init;
      }
  } 
};

// TODO: Support 'cell' units
/*
   w = get width  of the display area
   h = get height of the display area
   cols = floor w / 32 
   rows = floor h / 15
   (32 & 15 are the defaults; this can be changed in metadata)
*/
const cellsToPx = function(value) {
    if (value.indexOf('c') == -1) { return value; }
    return ( (parseFloat(value, 10)/15) * playerHeight) + 'px';
};

const parseLengths = function(value) {
  if (typeof value === "number") {
    return value;
  }
  var 
      i,
      length,
      lengthRE = /([+-]?)\s*(\.\d+|\d+\.\d+|\d+)\s*(px|em|c|%)/gim,
      lengths  = value.match(lengthRE);
  if (!lengths) { return []; }
  for (i = 0; i < lengths.length; i++) {
    length = lengths[i];
    length = length.replace(/\s/gim, '');
    lengths[i] = cellsToPx(length);
  }
  return lengths;
};
