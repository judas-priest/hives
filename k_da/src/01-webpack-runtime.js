/**
 * Webpack module system and runtime utilities
 * Lines 6-39 from original k_da_deobfuscated.js
 * This file is part of the k_da application split from webpack bundle
 */

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
var Y$e = T((sa) => {