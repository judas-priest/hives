/* ============================================================================
 * Webpack module system and runtime utilities
 * Lines 6-38 from original k_da_deobfuscated.js
 * 
 * NOTE: This file is part of a webpack bundle split for readability.
 * It shares closure scope with other parts and cannot run independently.
 * Use the build script to create a working executable.
 * ============================================================================ */

var ocr = Object.create;
var oK = Object.defineProperty;
var lcr = Object.getOwnPropertyDescriptor;
var ucr = Object.getOwnPropertyNames;
var ccr = Object.getPrototypeOf,
  dcr = Object.prototype.hasOwnProperty;
var Te = ((t) =>
  typeof require < 'u'
    ? require
    : typeof Proxy < 'u'
      ? new Proxy(t, { get: (e, r) => (typeof require < 'u' ? require : e)[r] })
      : t)(function (t) {
  if (typeof require < 'u') return require.apply(this, arguments);
  throw Error('Dynamic require of "' + t + '" is not supported');
});
var Oe = (t, e) => () => (t && (e = t((t = 0))), e);
var T = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports),
  $R = (t, e) => {
    for (var r in e) oK(t, r, { get: e[r], enumerable: !0 });
  },
  L$e = (t, e, r, n) => {
    if ((e && typeof e == 'object') || typeof e == 'function')
      for (let i of ucr(e))
        !dcr.call(t, i) &&
          i !== r &&
          oK(t, i, { get: () => e[i], enumerable: !(n = lcr(e, i)) || n.enumerable });
    return t;
  };
var qe = (t, e, r) => (
    (r = t != null ? ocr(ccr(t)) : {}),
    L$e(e || !t || !t.__esModule ? oK(r, 'default', { value: t, enumerable: !0 }) : r, t)
  ),
  gr = (t) => L$e(oK({}, '__esModule', { value: !0 }), t);