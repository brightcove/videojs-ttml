/**
 * We fully support all color values as defined in the TTML spec. 
 * See http://www.w3.org/TR/ttaf1-dfxp/#style-value-color
 * 
 * Hex:            #000000        (RRGGBB)
 * Hex with Alpha: #000000FF      (RRGGBBAA)
 * RGB:            rgb(0,0,0)     (R,G,B)
 * RGBA:           rbga(0,0,0,1)  (R,G,B,A)
 * Named Colors:   transparent, black, silver, gray, white, maroon, red, 
 *                 purple, fuchsia, magenta, green, lime, olive, yellow, 
 *                 navy, blue, teal, aqua, cyan
 *
 * @param value {string} A TTS color value
 * @return {String} A String with the corresponding CSS color value, tagged
 *                  with the length of the TTS color value string.
 */
const parseColor = function(value, alphaOverride) {
  var alpha;

  alpha = alphaOverride !== undefined ? alphaOverride || 1 : 1;

  // HEX color
  if (/^#/.test(value)) {
    return hexToRGBA(value.slice(1), alphaOverride, alpha);
  }

  // RGB or RGBA color
  if (/^(?:rgb|RGB)/.test(value)) {
    return rgbToRGBA(value, alphaOverride !== undefined, alpha);
  }

  // named color
  value = value.trim();
  // test for inner spaces in case we're parsing a text-shadow "black 0px 0px"
  if (value.indexOf(' ') > -1) {
    // TODO does this need to recurse? (textShadow = #00000FF for instance?)
    value = value.substring(0, value.indexOf(" "));
  }  
  return createColorString(value);
};

/**
 * RGB/RGBA to RGBA
 */
const rgbToRGBA = function(value, alphaOverride, alpha) {
    var rgba;
    rgba = value.slice(value.indexOf('('), value.indexOf(')'));
    rgba = rgba.split(',');
    if (alphaOverride) {
      rgba[3] = alpha;
    }
    return createColorString('rgba(' + rgba.join(',') + ')');
};

/**
 * HEX to RGBA converter
 */
const hexToRGBA = function(hex, alphaOverride, alpha) {
    var r, g, b, rgb, rgba, l;

    rgb = hex;
    if (hex.length === 8 && !alphaOverride) {
      alpha = parseInt(hex.substring(6,8), 16);
      alpha = alpha / 255;
      alpha = Math.round(alpha * 100) / 100;  // 0.00 -> 1.00
      l = 9;
    } else if (hex.length === 3) {
      r     = hex.charAt(0);
      g     = hex.charAt(1);
      b     = hex.charAt(2);
      rgb   = r + r + g + g + b + b;
      l = 4;
    } else {
      l = 6;
    }

    r     = rgb.slice(0, 2);
    g     = rgb.slice(2, 4);
    b     = rgb.slice(4, 6);
    rgba  = [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), alpha || 1];
    return createColorString("rgba(" + rgba.join(',') + ")", l);
};

/**
 * Helper function that creates a String tagged with a TTS color value's
 * length (e.g., #0000007F => new String('rgba(0,0,0,.5)).originalLength = 9;
 * 
 * @param cssColor {string} The CSS color string
 * @param originalLength {number} (optional) The length of the TTS color value.
 *                                           Defaults to the length of the cssColor.
 */
const createColorString = function(cssColor, originalLength){
  var color;
  if (originalLength === undefined) { originalLength = cssColor.length; }
  color = String(cssColor);
  color.originalLength = originalLength;
  return color;
};
