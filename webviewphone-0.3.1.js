(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":4}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],9:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":8,"_process":6,"inherits":7}],10:[function(require,module,exports){
(function (Buffer){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var toBuffer_1 = require("crypto-lib/dist/sync/utils/toBuffer");
var ts_events_extended_1 = require("ts-events-extended");
var evtEncryptedOrDecrypted = new ts_events_extended_1.SyncEvent();
exports.apiExposedToHost = {
    "onEncryptedOrDecrypted": function (outputDataB64, callRef) { return evtEncryptedOrDecrypted.post({ callRef: callRef, outputDataB64: outputDataB64 }); }
};
var getCounter = (function () {
    var counter = 0;
    return function () { return counter++; };
})();
function encryptOrDecrypt(action, keyStr, inputData) {
    return __awaiter(this, void 0, void 0, function () {
        var callRef, inputDataB64, outputDataB64;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    callRef = getCounter();
                    inputDataB64 = toBuffer_1.toBuffer(inputData).toString("base64");
                    apiExposedByHost.encryptOrDecrypt(action, keyStr, inputDataB64, callRef);
                    return [4 /*yield*/, evtEncryptedOrDecrypted.waitFor(function (_a) {
                            var callRef_ = _a.callRef;
                            return callRef_ === callRef;
                        })];
                case 1:
                    outputDataB64 = (_a.sent()).outputDataB64;
                    return [2 /*return*/, Buffer.from(outputDataB64, "base64")];
            }
        });
    });
}
exports.encryptOrDecrypt = encryptOrDecrypt;

}).call(this,require("buffer").Buffer)
},{"buffer":3,"crypto-lib/dist/sync/utils/toBuffer":13,"ts-events-extended":23}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var overrideWebRTCImplementation_1 = require("../../../shared/dist/tools/overrideWebRTCImplementation");
exports.apiExposedToHost = overrideWebRTCImplementation_1.overrideWebRTCImplementation(apiExposedByHost);

},{"../../../shared/dist/tools/overrideWebRTCImplementation":47}],12:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var Ua_1 = require("../../../shared/dist/lib/Ua");
var connection = require("../../../shared/dist/lib/toBackend/connection");
var remoteApiCaller = require("../../../shared/dist/lib/toBackend/remoteApiCaller/base");
var localApiHandler = require("../../../shared/dist/lib/toBackend/localApiHandlers");
var webApiCaller = require("../../../shared/dist/lib/webApiCaller");
var ts_events_extended_1 = require("ts-events-extended");
var hostCrypto = require("./hostCrypto");
var hostWebRtc = require("./hostWebRtc");
var notifyHostWhenPageIsReady_1 = require("../../../shared/dist/lib/notifyHostWhenPageIsReady");
notifyHostWhenPageIsReady_1.notifyHostWhenPageIsReady();
{
    var resolvePrErrorMessage_1;
    var prErrorMessage = new Promise(function (resolve) { return resolvePrErrorMessage_1 = resolve; });
    window.onerror = function (msg, url, lineNumber) {
        resolvePrErrorMessage_1(msg + "\n'" + url + ":" + lineNumber);
        return false;
    };
    Promise.onPossiblyUnhandledRejection(function (error) {
        resolvePrErrorMessage_1(error.message + " " + error.stack);
    });
    prErrorMessage.then(function (errorMessage) {
        return apiExposedByHost.onCallTerminated(errorMessage);
    });
}
/**
 * Never resolve and call onCallTerminated if anything goes wrong.
 * The returned ua is registering.
*/
function initUa(session, imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, userSim, ua;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    Ua_1.Ua.session = session;
                    connection.connect("AUXILIARY", "REQUEST TURN CRED");
                    //NOTE: UA does not receive the live update on sim online state.
                    localApiHandler.evtSimIsOnlineStatusChange.attachOnce(function (isOnline) { return !isOnline; }, function () { return apiExposedByHost.onCallTerminated("Socket disconnected"); });
                    return [4 /*yield*/, Promise.all([
                            remoteApiCaller.getUsableUserSims(false)
                                .then(function (userSims) { return userSims.find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            }); })
                        ])];
                case 1:
                    _a = __read.apply(void 0, [_b.sent(), 1]), userSim = _a[0];
                    if (!!userSim.reachableSimState) return [3 /*break*/, 3];
                    apiExposedByHost.onCallTerminated("Sim is offline");
                    return [4 /*yield*/, new Promise(function (_resolve) { })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    ua = new Ua_1.Ua(imsi, userSim.password, {
                        "encrypt": function (plainData) { return hostCrypto.encryptOrDecrypt("ENCRYPT", userSim.towardSimEncryptKeyStr, plainData); }
                    }, "DISABLE MESSAGES");
                    ua.register();
                    ua.evtRegistrationStateChanged.attachOnce(function (isRegistered) { return !isRegistered; }, function () { return apiExposedByHost.onCallTerminated("UA unregistered"); });
                    ua.evtRegistrationStateChanged.waitFor(6000)
                        .catch(function () { return apiExposedByHost.onCallTerminated("UA failed to register"); });
                    return [2 /*return*/, ua];
            }
        });
    });
}
var evtAcceptIncomingCall = new ts_events_extended_1.VoidSyncEvent();
var START_ACTION = {
    "PLACE_OUTGOING_CALL": 0,
    "GET_READY_TO_ACCEPT_INCOMING_CALL": 1
};
var apiExposedToHost = __assign(__assign(__assign({}, hostWebRtc.apiExposedToHost), hostCrypto.apiExposedToHost), { "start": function (action, email, secret, towardUserEncryptKeyStr, towardUserDecryptKeyStr, uaInstanceId, imsi, number) { return __awaiter(void 0, void 0, void 0, function () {
        var status_1, ua, _a, _b, terminate_1, prTerminated, prNextState, evtCallReceived_1, _c, terminate_2, prTerminated, onAccepted, sendDtmf_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, webApiCaller.loginUser(email, secret, uaInstanceId)];
                case 1:
                    status_1 = (_d.sent()).status;
                    if (status_1 !== "SUCCESS") {
                        apiExposedByHost.onCallTerminated("Login failed");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, initUa({
                            email: email,
                            "instanceId": uaInstanceId,
                            towardUserEncryptKeyStr: towardUserEncryptKeyStr,
                            "towardUserDecryptor": {
                                "decrypt": function (encryptedData) { return hostCrypto.encryptOrDecrypt("DECRYPT", towardUserDecryptKeyStr, encryptedData); }
                            }
                        }, imsi)];
                case 2:
                    ua = _d.sent();
                    _a = action;
                    switch (_a) {
                        case START_ACTION.PLACE_OUTGOING_CALL: return [3 /*break*/, 3];
                        case START_ACTION.GET_READY_TO_ACCEPT_INCOMING_CALL: return [3 /*break*/, 6];
                    }
                    return [3 /*break*/, 11];
                case 3:
                    ua.evtIncomingCall.attach(function (_a) {
                        var terminate = _a.terminate;
                        return terminate();
                    });
                    return [4 /*yield*/, ua.evtRegistrationStateChanged.waitFor()];
                case 4:
                    _d.sent();
                    return [4 /*yield*/, ua.placeOutgoingCall(number)];
                case 5:
                    _b = _d.sent(), terminate_1 = _b.terminate, prTerminated = _b.prTerminated, prNextState = _b.prNextState;
                    apiExposedToHost.terminateCall = function () { return terminate_1(); };
                    prTerminated.then(function () { return apiExposedByHost.onCallTerminated(null); });
                    prNextState.then(function (_a) {
                        var prNextState = _a.prNextState;
                        apiExposedByHost.onRingback();
                        prNextState.then(function (_a) {
                            var sendDtmf = _a.sendDtmf;
                            apiExposedToHost.sendDtmf = function (signal, duration) { return sendDtmf(signal, duration); };
                            apiExposedByHost.onEstablished();
                        });
                    });
                    return [3 /*break*/, 11];
                case 6:
                    evtCallReceived_1 = new ts_events_extended_1.VoidSyncEvent();
                    ua.evtRegistrationStateChanged.attachOnce(function (isRegistered) { return isRegistered; }, function () {
                        if (evtCallReceived_1.postCount === 0) {
                            evtCallReceived_1.waitFor(1500)
                                .catch(function () { return apiExposedByHost.onCallTerminated("Call missed"); });
                        }
                    });
                    return [4 /*yield*/, ua.evtIncomingCall.waitFor(function (_a) {
                            var fromNumber = _a.fromNumber;
                            return fromNumber === number;
                        })];
                case 7:
                    _c = _d.sent(), terminate_2 = _c.terminate, prTerminated = _c.prTerminated, onAccepted = _c.onAccepted;
                    evtCallReceived_1.post();
                    apiExposedToHost.terminateCall = function () { return terminate_2(); };
                    prTerminated.then(function () { return apiExposedByHost.onCallTerminated(null); });
                    if (!(evtAcceptIncomingCall.postCount === 0)) return [3 /*break*/, 9];
                    return [4 /*yield*/, evtAcceptIncomingCall.waitFor()];
                case 8:
                    _d.sent();
                    _d.label = 9;
                case 9: return [4 /*yield*/, onAccepted()];
                case 10:
                    sendDtmf_1 = (_d.sent()).sendDtmf;
                    apiExposedToHost.sendDtmf = function (signal, duration) { return sendDtmf_1(signal, duration); };
                    apiExposedByHost.onEstablished();
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    }); }, "sendDtmf": function () { return apiExposedByHost.onCallTerminated("never"); }, "terminateCall": function () { return apiExposedByHost.onCallTerminated(null); }, "acceptIncomingCall": function () { return evtAcceptIncomingCall.post(); } });
Object.assign(window, { apiExposedToHost: apiExposedToHost });

},{"../../../shared/dist/lib/Ua":28,"../../../shared/dist/lib/notifyHostWhenPageIsReady":35,"../../../shared/dist/lib/toBackend/connection":36,"../../../shared/dist/lib/toBackend/localApiHandlers":37,"../../../shared/dist/lib/toBackend/remoteApiCaller/base":38,"../../../shared/dist/lib/webApiCaller":41,"./hostCrypto":10,"./hostWebRtc":11,"ts-events-extended":23}],13:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The returned object is an instance of the global Buffer class.
 * ( toBuffer(data) instanceof Buffer === true )
 */
function toBuffer(uint8Array) {
    return Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.length);
}
exports.toBuffer = toBuffer;

}).call(this,require("buffer").Buffer)
},{"buffer":3}],14:[function(require,module,exports){
// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
        value: function (predicate) {
            // 1. Let O be ? ToObject(this value).
            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }
            var o = Object(this);
            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;
            // 3. If IsCallable(predicate) is false, throw a TypeError exception.
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
            var thisArg = arguments[1];
            // 5. Let k be 0.
            var k = 0;
            // 6. Repeat, while k < len
            while (k < len) {
                // a. Let Pk be ! ToString(k).
                // b. Let kValue be ? Get(O, Pk).
                // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
                // d. If testResult is true, return kValue.
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                    return kValue;
                }
                // e. Increase k by 1.
                k++;
            }
            // 7. Return undefined.
            return undefined;
        },
        configurable: true,
        writable: true
    });
}

},{}],15:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var LightMapImpl = /** @class */ (function () {
    function LightMapImpl() {
        this.record = [];
    }
    LightMapImpl.prototype.has = function (key) {
        return this.record
            .map(function (_a) {
            var _key = _a[0];
            return _key;
        })
            .indexOf(key) >= 0;
    };
    LightMapImpl.prototype.get = function (key) {
        var entry = this.record
            .filter(function (_a) {
            var _key = _a[0];
            return _key === key;
        })[0];
        if (entry === undefined) {
            return undefined;
        }
        return entry[1];
    };
    LightMapImpl.prototype.set = function (key, value) {
        var entry = this.record
            .filter(function (_a) {
            var _key = _a[0];
            return _key === key;
        })[0];
        if (entry === undefined) {
            this.record.push([key, value]);
        }
        else {
            entry[1] = value;
        }
        return this;
    };
    LightMapImpl.prototype["delete"] = function (key) {
        var index = this.record.map(function (_a) {
            var key = _a[0];
            return key;
        }).indexOf(key);
        if (index < 0) {
            return false;
        }
        this.record.splice(index, 1);
        return true;
    };
    LightMapImpl.prototype.keys = function () {
        return this.record.map(function (_a) {
            var key = _a[0];
            return key;
        });
    };
    return LightMapImpl;
}());
exports.Polyfill = typeof Map !== "undefined" ? Map : LightMapImpl;

},{}],16:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var Map_1 = require("./Map");
exports.Polyfill = typeof WeakMap !== "undefined" ? WeakMap : Map_1.Polyfill;

},{"./Map":15}],17:[function(require,module,exports){
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var WeakMap_1 = require("minimal-polyfills/dist/lib/WeakMap");
var ExecQueue = /** @class */ (function () {
    function ExecQueue() {
        this.queuedCalls = [];
        this.isRunning = false;
        this.prComplete = Promise.resolve();
    }
    //TODO: move where it is used.
    ExecQueue.prototype.cancelAllQueuedCalls = function () {
        var n;
        this.queuedCalls.splice(0, n = this.queuedCalls.length);
        return n;
    };
    return ExecQueue;
}());
var globalContext = {};
var clusters = new WeakMap_1.Polyfill();
//console.log("Map version");
//export const clusters = new Map<Object, Map<GroupRef,ExecQueue>>();
function getOrCreateExecQueue(context, groupRef) {
    var execQueueByGroup = clusters.get(context);
    if (!execQueueByGroup) {
        execQueueByGroup = new WeakMap_1.Polyfill();
        clusters.set(context, execQueueByGroup);
    }
    var execQueue = execQueueByGroup.get(groupRef);
    if (!execQueue) {
        execQueue = new ExecQueue();
        execQueueByGroup.set(groupRef, execQueue);
    }
    return execQueue;
}
function createGroupRef() {
    return new Array(0);
}
exports.createGroupRef = createGroupRef;
function build() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    switch (inputs.length) {
        case 1: return buildFnPromise(true, createGroupRef(), inputs[0]);
        case 2: return buildFnPromise(true, inputs[0], inputs[1]);
    }
}
exports.build = build;
function buildMethod() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    switch (inputs.length) {
        case 1: return buildFnPromise(false, createGroupRef(), inputs[0]);
        case 2: return buildFnPromise(false, inputs[0], inputs[1]);
    }
}
exports.buildMethod = buildMethod;
/**
 *
 * Get the number of queued call of a run-exclusive function.
 * Note that if you call a runExclusive function and call this
 * directly after it will return 0 as there is one function call
 * running but 0 queued.
 *
 * The classInstanceObject parameter is to provide only for the run-exclusive
 * function created with 'buildMethod[Cb].
 *
 * */
function getQueuedCallCount(runExclusiveFunction, classInstanceObject) {
    var execQueue = getExecQueueByFunctionAndContext(runExclusiveFunction, classInstanceObject);
    return execQueue ? execQueue.queuedCalls.length : 0;
}
exports.getQueuedCallCount = getQueuedCallCount;
/**
 *
 * Cancel all queued calls of a run-exclusive function.
 * Note that the current running call will not be cancelled.
 *
 * The classInstanceObject parameter is to provide only for the run-exclusive
 * function created with 'buildMethod[Cb].
 *
 */
function cancelAllQueuedCalls(runExclusiveFunction, classInstanceObject) {
    var execQueue = getExecQueueByFunctionAndContext(runExclusiveFunction, classInstanceObject);
    return execQueue ? execQueue.cancelAllQueuedCalls() : 0;
}
exports.cancelAllQueuedCalls = cancelAllQueuedCalls;
/**
 * Tell if a run-exclusive function has an instance of it's call currently being
 * performed.
 *
 * The classInstanceObject parameter is to provide only for the run-exclusive
 * function created with 'buildMethod[Cb].
 */
function isRunning(runExclusiveFunction, classInstanceObject) {
    var execQueue = getExecQueueByFunctionAndContext(runExclusiveFunction, classInstanceObject);
    return execQueue ? execQueue.isRunning : false;
}
exports.isRunning = isRunning;
/**
 * Return a promise that resolve when all the current queued call of a runExclusive functions
 * have completed.
 *
 * The classInstanceObject parameter is to provide only for the run-exclusive
 * function created with 'buildMethod[Cb].
 */
function getPrComplete(runExclusiveFunction, classInstanceObject) {
    var execQueue = getExecQueueByFunctionAndContext(runExclusiveFunction, classInstanceObject);
    return execQueue ? execQueue.prComplete : Promise.resolve();
}
exports.getPrComplete = getPrComplete;
var groupByRunExclusiveFunction = new WeakMap_1.Polyfill();
function getExecQueueByFunctionAndContext(runExclusiveFunction, context) {
    if (context === void 0) { context = globalContext; }
    var groupRef = groupByRunExclusiveFunction.get(runExclusiveFunction);
    if (!groupRef) {
        throw Error("Not a run exclusiveFunction");
    }
    var execQueueByGroup = clusters.get(context);
    if (!execQueueByGroup) {
        return undefined;
    }
    return execQueueByGroup.get(groupRef);
}
function buildFnPromise(isGlobal, groupRef, fun) {
    var execQueue;
    var runExclusiveFunction = (function () {
        var _this = this;
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        if (!isGlobal) {
            if (!(this instanceof Object)) {
                throw new Error("Run exclusive, <this> should be an object");
            }
            execQueue = getOrCreateExecQueue(this, groupRef);
        }
        return new Promise(function (resolve, reject) {
            var onPrCompleteResolve;
            execQueue.prComplete = new Promise(function (resolve) {
                return onPrCompleteResolve = function () { return resolve(); };
            });
            var onComplete = function (result) {
                onPrCompleteResolve();
                execQueue.isRunning = false;
                if (execQueue.queuedCalls.length) {
                    execQueue.queuedCalls.shift()();
                }
                if ("data" in result) {
                    resolve(result.data);
                }
                else {
                    reject(result.reason);
                }
            };
            (function callee() {
                var _this = this;
                var inputs = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    inputs[_i] = arguments[_i];
                }
                if (execQueue.isRunning) {
                    execQueue.queuedCalls.push(function () { return callee.apply(_this, inputs); });
                    return;
                }
                execQueue.isRunning = true;
                try {
                    fun.apply(this, inputs)
                        .then(function (data) { return onComplete({ data: data }); })["catch"](function (reason) { return onComplete({ reason: reason }); });
                }
                catch (error) {
                    onComplete({ "reason": error });
                }
            }).apply(_this, inputs);
        });
    });
    if (isGlobal) {
        execQueue = getOrCreateExecQueue(globalContext, groupRef);
    }
    groupByRunExclusiveFunction.set(runExclusiveFunction, groupRef);
    return runExclusiveFunction;
}
function buildCb() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    switch (inputs.length) {
        case 1: return buildFnCallback(true, createGroupRef(), inputs[0]);
        case 2: return buildFnCallback(true, inputs[0], inputs[1]);
    }
}
exports.buildCb = buildCb;
function buildMethodCb() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    switch (inputs.length) {
        case 1: return buildFnCallback(false, createGroupRef(), inputs[0]);
        case 2: return buildFnCallback(false, inputs[0], inputs[1]);
    }
}
exports.buildMethodCb = buildMethodCb;
function buildFnCallback(isGlobal, groupRef, fun) {
    var execQueue;
    var runExclusiveFunction = (function () {
        var _this = this;
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        if (!isGlobal) {
            if (!(this instanceof Object)) {
                throw new Error("Run exclusive, <this> should be an object");
            }
            execQueue = getOrCreateExecQueue(this, groupRef);
        }
        var callback = undefined;
        if (inputs.length && typeof inputs[inputs.length - 1] === "function") {
            callback = inputs.pop();
        }
        var onPrCompleteResolve;
        execQueue.prComplete = new Promise(function (resolve) {
            return onPrCompleteResolve = function () { return resolve(); };
        });
        var onComplete = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            onPrCompleteResolve();
            execQueue.isRunning = false;
            if (execQueue.queuedCalls.length) {
                execQueue.queuedCalls.shift()();
            }
            if (callback) {
                callback.apply(_this, inputs);
            }
        };
        onComplete.hasCallback = !!callback;
        (function callee() {
            var _this = this;
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            if (execQueue.isRunning) {
                execQueue.queuedCalls.push(function () { return callee.apply(_this, inputs); });
                return;
            }
            execQueue.isRunning = true;
            try {
                fun.apply(this, __spread(inputs, [onComplete]));
            }
            catch (error) {
                error.message += " ( This exception should not have been thrown, miss use of run-exclusive buildCb )";
                throw error;
            }
        }).apply(this, inputs);
    });
    if (isGlobal) {
        execQueue = getOrCreateExecQueue(globalContext, groupRef);
    }
    groupByRunExclusiveFunction.set(runExclusiveFunction, groupRef);
    return runExclusiveFunction;
}

},{"minimal-polyfills/dist/lib/WeakMap":16}],18:[function(require,module,exports){
'use strict'
/* eslint no-proto: 0 */
module.exports = Object.setPrototypeOf || ({ __proto__: [] } instanceof Array ? setProtoOf : mixinProperties)

function setProtoOf (obj, proto) {
  obj.__proto__ = proto
  return obj
}

function mixinProperties (obj, proto) {
  for (var prop in proto) {
    if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
      obj[prop] = proto[prop]
    }
  }
  return obj
}

},{}],19:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var SyncEventBase_1 = require("./SyncEventBase");
var SyncEvent = /** @class */ (function (_super) {
    __extends(SyncEvent, _super);
    function SyncEvent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.evtAttach = new SyncEventBase_1.SyncEventBase();
        return _this;
    }
    SyncEvent.prototype.addHandler = function (attachParams, implicitAttachParams) {
        var handler = _super.prototype.addHandler.call(this, attachParams, implicitAttachParams);
        this.evtAttach.post(handler);
        return handler;
    };
    return SyncEvent;
}(SyncEventBase_1.SyncEventBase));
exports.SyncEvent = SyncEvent;
var VoidSyncEvent = /** @class */ (function (_super) {
    __extends(VoidSyncEvent, _super);
    function VoidSyncEvent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VoidSyncEvent.prototype.post = function () {
        return _super.prototype.post.call(this, undefined);
    };
    return VoidSyncEvent;
}(SyncEvent));
exports.VoidSyncEvent = VoidSyncEvent;

},{"./SyncEventBase":20}],20:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var SyncEventBaseProtected_1 = require("./SyncEventBaseProtected");
function matchPostable(o) {
    return o instanceof Object && typeof o.post === "function";
}
function isCallable(o) {
    if (typeof o !== "function")
        return false;
    var prototype = o["prototype"];
    if (!prototype)
        return true;
    var methods = Object.getOwnPropertyNames(prototype);
    if (methods.length !== 1)
        return false;
    var name = o.name;
    if (!name)
        return true;
    if (name[0].toUpperCase() === name[0])
        return false;
    return true;
}
/** SyncEvent without evtAttach property */
var SyncEventBase = /** @class */ (function (_super) {
    __extends(SyncEventBase, _super);
    function SyncEventBase() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.defaultParams = {
            "matcher": function matchAll() { return true; },
            "boundTo": _this,
            "timeout": undefined,
            "callback": undefined
        };
        return _this;
    }
    SyncEventBase.prototype.getDefaultParams = function () {
        return __assign({}, this.defaultParams);
    };
    SyncEventBase.prototype.readParams = function (inputs) {
        var out = this.getDefaultParams();
        var n = inputs.length;
        if (!n)
            return out;
        //[ matcher, boundTo, timeout, callback ]
        //[ matcher, boundTo, callback ]
        //[ matcher, timeout, callback ]
        //[ boundTo, timeout, callback ]
        //[ matcher, callback ]
        //[ boundTo, callback ]
        //[ timeout, callback ]
        //[ callback ]
        //[ matcher, timeout, evt ]
        //[ matcher, evt ]
        //[ timeout, evt ]
        //[ evt ]
        if (matchPostable(inputs[n - 1])) {
            out.boundTo = inputs[n - 1];
            inputs[n - 1] = inputs[n - 1].post;
        }
        //[ matcher, boundTo, timeout, callback ]
        //[ matcher, boundTo, callback ]
        //[ matcher, timeout, callback ]
        //[ boundTo, timeout, callback ]
        //[ matcher, callback ]
        //[ boundTo, callback ]
        //[ timeout, callback ]
        //[ callback ]
        if (n === 4) {
            //[ matcher, boundTo, timeout, callback ]
            var p1 = inputs[0], p2 = inputs[1], p3 = inputs[2], p4 = inputs[3];
            out.matcher = p1;
            out.boundTo = p2;
            out.timeout = p3;
            out.callback = p4;
        }
        else if (n === 3) {
            //[ matcher, boundTo, callback ]
            //[ matcher, timeout, callback ]
            //[ boundTo, timeout, callback ]
            var p1 = inputs[0], p2 = inputs[1], p3 = inputs[2];
            if (typeof p2 === "number") {
                //[ matcher, timeout, callback ]
                //[ boundTo, timeout, callback ]
                out.timeout = p2;
                out.callback = p3;
                if (isCallable(p1)) {
                    //[ matcher, timeout, callback ]
                    out.matcher = p1;
                }
                else {
                    //[ boundTo, timeout, callback ]
                    out.boundTo = p1;
                }
            }
            else {
                //[ matcher, boundTo, callback ]
                out.matcher = p1;
                out.boundTo = p2;
                out.callback = p3;
            }
        }
        else if (n === 2) {
            //[ matcher, callback ]
            //[ boundTo, callback ]
            //[ timeout, callback ]
            var p1 = inputs[0], p2 = inputs[1];
            if (typeof p1 === "number") {
                //[ timeout, callback ]
                out.timeout = p1;
                out.callback = p2;
            }
            else {
                //[ matcher, callback ]
                //[ boundTo, callback ]
                out.callback = p2;
                if (isCallable(p1)) {
                    out.matcher = p1;
                }
                else {
                    out.boundTo = p1;
                }
            }
        }
        else if (n === 1) {
            //[ callback ]
            var p = inputs[0];
            out.callback = p;
        }
        return out;
    };
    SyncEventBase.prototype.waitFor = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        var params = this.getDefaultParams();
        var n = inputs.length;
        if (n === 2) {
            var p1 = inputs[0], p2 = inputs[1];
            params.matcher = p1;
            params.timeout = p2;
        }
        else {
            var p = inputs[0];
            if (isCallable(p)) {
                params.matcher = p;
            }
            else {
                params.timeout = p;
            }
        }
        return _super.prototype.__waitFor.call(this, params);
    };
    SyncEventBase.prototype.attach = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attach(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachOnce = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachOnce(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachExtract = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachExtract(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachPrepend = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachPrepend(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachOncePrepend = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachOncePrepend(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachOnceExtract = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachOnceExtract(this.readParams(inputs));
    };
    return SyncEventBase;
}(SyncEventBaseProtected_1.SyncEventBaseProtected));
exports.SyncEventBase = SyncEventBase;

},{"./SyncEventBaseProtected":21}],21:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var Map_1 = require("minimal-polyfills/dist/lib/Map");
require("minimal-polyfills/dist/lib/Array.prototype.find");
var runExclusive = require("run-exclusive");
var defs_1 = require("./defs");
/** SyncEvent without evtAttach property and without overload */
var SyncEventBaseProtected = /** @class */ (function () {
    function SyncEventBaseProtected() {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        var _this = this;
        this.tick = 0;
        this.postCount = 0;
        this.traceId = null;
        this.handlers = [];
        this.handlerTriggers = new Map_1.Polyfill();
        this.postAsync = runExclusive.buildCb(function (data, postTick, releaseLock) {
            var isHandled = false;
            for (var _i = 0, _a = _this.handlers.slice(); _i < _a.length; _i++) {
                var handler = _a[_i];
                var async = handler.async, matcher = handler.matcher;
                if (!async || !matcher(data))
                    continue;
                var handlerTrigger = _this.handlerTriggers.get(handler);
                if (!handlerTrigger)
                    continue;
                if (handlerTrigger.handlerTick > postTick)
                    continue;
                isHandled = true;
                handlerTrigger.trigger(data);
            }
            if (!isHandled) {
                releaseLock();
            }
            else {
                var handlersDump_1 = _this.handlers.slice();
                setTimeout(function () {
                    for (var _i = 0, _a = _this.handlers; _i < _a.length; _i++) {
                        var handler = _a[_i];
                        var async = handler.async;
                        if (!async)
                            continue;
                        if (handlersDump_1.indexOf(handler) >= 0)
                            continue;
                        _this.handlerTriggers.get(handler).handlerTick = postTick;
                    }
                    releaseLock();
                }, 0);
            }
        });
        if (!inputs.length)
            return;
        var eventEmitter = inputs[0], eventName = inputs[1];
        var formatter = inputs[2] || this.defaultFormatter;
        eventEmitter.on(eventName, function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.post(formatter.apply(null, inputs));
        });
    }
    SyncEventBaseProtected.prototype.defaultFormatter = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return inputs[0];
    };
    SyncEventBaseProtected.prototype.enableTrace = function (id, formatter, log) {
        this.traceId = id;
        if (!!formatter) {
            this.traceFormatter = formatter;
        }
        else {
            this.traceFormatter = function (data) {
                try {
                    return JSON.stringify(data, null, 2);
                }
                catch (_a) {
                    return "" + data;
                }
            };
        }
        if (!!log) {
            this.log = log;
        }
        else {
            this.log = function () {
                var inputs = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    inputs[_i] = arguments[_i];
                }
                return console.log.apply(console, inputs);
            };
        }
    };
    SyncEventBaseProtected.prototype.disableTrace = function () {
        this.traceId = null;
    };
    SyncEventBaseProtected.prototype.addHandler = function (attachParams, implicitAttachParams) {
        var _this = this;
        var handler = __assign({}, attachParams, implicitAttachParams, { "detach": null, "promise": null });
        handler.promise = new Promise(function (resolve, reject) {
            var timer = undefined;
            if (typeof handler.timeout === "number") {
                timer = setTimeout(function () {
                    timer = undefined;
                    handler.detach();
                    reject(new defs_1.EvtError.Timeout(handler.timeout));
                }, handler.timeout);
            }
            handler.detach = function () {
                var index = _this.handlers.indexOf(handler);
                if (index < 0)
                    return false;
                _this.handlers.splice(index, 1);
                _this.handlerTriggers["delete"](handler);
                if (timer) {
                    clearTimeout(timer);
                    reject(new defs_1.EvtError.Detached());
                }
                return true;
            };
            var handlerTick = _this.tick++;
            var trigger = function (data) {
                var callback = handler.callback, once = handler.once;
                if (timer) {
                    clearTimeout(timer);
                    timer = undefined;
                }
                if (once)
                    handler.detach();
                if (callback)
                    callback.call(handler.boundTo, data);
                resolve(data);
            };
            _this.handlerTriggers.set(handler, { handlerTick: handlerTick, trigger: trigger });
        });
        if (handler.prepend) {
            var i = void 0;
            for (i = 0; i < this.handlers.length; i++) {
                if (this.handlers[i].extract)
                    continue;
                else
                    break;
            }
            this.handlers.splice(i, 0, handler);
        }
        else {
            this.handlers.push(handler);
        }
        return handler;
    };
    SyncEventBaseProtected.prototype.trace = function (data) {
        if (this.traceId === null) {
            return;
        }
        var message = "(" + this.traceId + ") ";
        var isExtracted = !!this.handlers.find(function (_a) {
            var extract = _a.extract, matcher = _a.matcher;
            return extract && matcher(data);
        });
        if (isExtracted) {
            message += "extracted ";
        }
        else {
            var handlerCount = this.handlers
                .filter(function (_a) {
                var extract = _a.extract, matcher = _a.matcher;
                return !extract && matcher(data);
            })
                .length;
            message += handlerCount + " handler" + ((handlerCount > 1) ? "s" : "") + " => ";
        }
        this.log(message + this.traceFormatter(data));
    };
    SyncEventBaseProtected.prototype.post = function (data) {
        this.trace(data);
        this.postCount++;
        var postTick = this.tick++;
        var isExtracted = this.postSync(data);
        if (!isExtracted) {
            this.postAsync(data, postTick);
        }
        return this.postCount;
    };
    SyncEventBaseProtected.prototype.postSync = function (data) {
        for (var _i = 0, _a = this.handlers.slice(); _i < _a.length; _i++) {
            var handler = _a[_i];
            var async = handler.async, matcher = handler.matcher, extract = handler.extract;
            if (async || !matcher(data))
                continue;
            var handlerTrigger = this.handlerTriggers.get(handler);
            if (!handlerTrigger)
                continue;
            handlerTrigger.trigger(data);
            if (extract)
                return true;
        }
        return false;
    };
    SyncEventBaseProtected.prototype.__waitFor = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": true,
            "extract": false,
            "once": true,
            "prepend": false
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attach = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": false,
            "once": false,
            "prepend": false
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachExtract = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": true,
            "once": false,
            "prepend": true
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachPrepend = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": false,
            "once": false,
            "prepend": true
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachOnce = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": false,
            "once": true,
            "prepend": false
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachOncePrepend = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": false,
            "once": true,
            "prepend": true
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachOnceExtract = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": true,
            "once": true,
            "prepend": true
        }).promise;
    };
    SyncEventBaseProtected.prototype.getHandlers = function () { return this.handlers.slice(); };
    /** Detach every handler bound to a given object or all handlers, return the detached handlers */
    SyncEventBaseProtected.prototype.detach = function (boundTo) {
        var detachedHandlers = [];
        for (var _i = 0, _a = this.handlers.slice(); _i < _a.length; _i++) {
            var handler = _a[_i];
            if (boundTo === undefined || handler.boundTo === boundTo) {
                handler.detach();
                detachedHandlers.push(handler);
            }
        }
        return detachedHandlers;
    };
    return SyncEventBaseProtected;
}());
exports.SyncEventBaseProtected = SyncEventBaseProtected;

},{"./defs":22,"minimal-polyfills/dist/lib/Array.prototype.find":14,"minimal-polyfills/dist/lib/Map":15,"run-exclusive":17}],22:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var setPrototypeOf = require("setprototypeof");
var EvtError;
(function (EvtError) {
    var Timeout = /** @class */ (function (_super) {
        __extends(Timeout, _super);
        function Timeout(timeout) {
            var _newTarget = this.constructor;
            var _this = _super.call(this, "Evt timeout after " + timeout + "ms") || this;
            _this.timeout = timeout;
            setPrototypeOf(_this, _newTarget.prototype);
            return _this;
        }
        return Timeout;
    }(Error));
    EvtError.Timeout = Timeout;
    var Detached = /** @class */ (function (_super) {
        __extends(Detached, _super);
        function Detached() {
            var _newTarget = this.constructor;
            var _this = _super.call(this, "Evt handler detached") || this;
            setPrototypeOf(_this, _newTarget.prototype);
            return _this;
        }
        return Detached;
    }(Error));
    EvtError.Detached = Detached;
})(EvtError = exports.EvtError || (exports.EvtError = {}));

},{"setprototypeof":18}],23:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var SyncEvent_1 = require("./SyncEvent");
exports.SyncEvent = SyncEvent_1.SyncEvent;
exports.VoidSyncEvent = SyncEvent_1.VoidSyncEvent;
var defs_1 = require("./defs");
exports.EvtError = defs_1.EvtError;

},{"./SyncEvent":19,"./defs":22}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RegistrationParams_1 = require("semasim-gateway/dist/lib/misc/RegistrationParams");
exports.RegistrationParams = RegistrationParams_1.RegistrationParams;

},{"semasim-gateway/dist/lib/misc/RegistrationParams":101}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bundledData_1 = require("semasim-gateway/dist/lib/misc/bundledData");
exports.smuggleBundledDataInHeaders = bundledData_1.smuggleBundledDataInHeaders;
exports.extractBundledDataFromHeaders = bundledData_1.extractBundledDataFromHeaders;

},{"semasim-gateway/dist/lib/misc/bundledData":102}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sipRouting_1 = require("semasim-gateway/dist/lib/misc/sipRouting");
exports.readImsi = sipRouting_1.readImsi;

},{"semasim-gateway/dist/lib/misc/sipRouting":103}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var web_api_declaration_1 = require("semasim-gateway/dist/web_api_declaration");
exports.webApiPath = web_api_declaration_1.apiPath;

},{"semasim-gateway/dist/web_api_declaration":105}],28:[function(require,module,exports){
(function (Buffer){
"use strict";
//NOTE: Require jssip_compat loaded on the page.
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var bundledData_1 = require("../gateway/bundledData");
var readImsi_1 = require("../gateway/readImsi");
var RegistrationParams_1 = require("../gateway/RegistrationParams");
var sip = require("ts-sip");
var runExclusive = require("run-exclusive");
var connection = require("./toBackend/connection");
var localApiHandlers = require("./toBackend/localApiHandlers");
var env_1 = require("./env");
JsSIP.debug.enable("JsSIP:*");
//JsSIP.debug.disable("JsSIP:*");
var Ua = /** @class */ (function () {
    function Ua(imsi, sipPassword, towardSimEncryptor, disabledMessage) {
        var _this = this;
        if (disabledMessage === void 0) { disabledMessage = false; }
        this.towardSimEncryptor = towardSimEncryptor;
        /** post isRegistered */
        this.evtRegistrationStateChanged = new ts_events_extended_1.SyncEvent();
        this.evtRingback = new ts_events_extended_1.SyncEvent();
        this.isRegistered = false;
        this.evtIncomingMessage = new ts_events_extended_1.SyncEvent();
        this.postEvtIncomingMessage = runExclusive.buildMethod(function (evtData) {
            var onProcessed;
            var pr = new Promise(function (resolve) { return onProcessed = resolve; });
            _this.evtIncomingMessage.post(__assign(__assign({}, evtData), { "onProcessed": onProcessed }));
            return pr;
        });
        /*
        public sendMessage(
            number: phoneNumber,
            text: string,
            exactSendDate: Date,
            appendPromotionalMessage: boolean
        ): Promise<void> {
            return new Promise<void>(
                async (resolve, reject) => this.jsSipUa.sendMessage(
                    `sip:${number}@${baseDomain}`,
                    "| encrypted message bundled in header |",
                    {
                        "contentType": "text/plain; charset=UTF-8",
                        "extraHeaders": await smuggleBundledDataInHeaders<gwTypes.BundledData.ClientToServer.Message>(
                            {
                                "type": "MESSAGE",
                                "textB64": Buffer.from(text, "utf8").toString("base64"),
                                "exactSendDateTime": exactSendDate.getTime(),
                                appendPromotionalMessage
                            },
                            this.towardSimEncryptor
                        ).then(headers => Object.keys(headers).map(key => `${key}: ${headers[key]}`)),
                        "eventHandlers": {
                            "succeeded": () => resolve(),
                            "failed": ({ cause }) => reject(new Error(`Send message failed ${cause}`))
                        }
                    }
                )
            );
        }
        */
        /** return exactSendDate to match with sendReport and statusReport */
        this.evtIncomingCall = new ts_events_extended_1.SyncEvent();
        var uri = "sip:" + imsi + "-webRTC@" + env_1.baseDomain;
        this.jsSipSocket = new JsSipSocket(imsi, uri);
        this.jsSipUa = new JsSIP.UA({
            "sockets": this.jsSipSocket,
            uri: uri,
            "authorization_user": imsi,
            "password": sipPassword,
            "instance_id": Ua.session.instanceId.match(/"<urn:([^>]+)>"$/)[1],
            "register": false,
            "contact_uri": [
                uri,
                RegistrationParams_1.RegistrationParams.build({
                    "userEmail": Ua.session.email,
                    "towardUserEncryptKeyStr": Ua.session.towardUserEncryptKeyStr,
                    "messagesEnabled": !disabledMessage
                })
            ].join(";"),
            "register_expires": 345600
        });
        /*
        evt 'registered' is posted only when register change
        so we use this instead.
        */
        this.jsSipSocket.evtSipPacket.attach(function (sipPacket) { return (!sip.matchRequest(sipPacket) &&
            sipPacket.headers.cseq.method === "REGISTER" &&
            sipPacket.status === 200); }, function () {
            _this.isRegistered = true;
            _this.evtRegistrationStateChanged.post(true);
        });
        this.jsSipUa.on("unregistered", function () {
            _this.isRegistered = false;
            _this.evtRegistrationStateChanged.post(false);
        });
        this.jsSipUa.on("newMessage", function (_a) {
            var originator = _a.originator, request = _a.request;
            if (originator === "remote") {
                _this.onMessage(request);
            }
        });
        this.jsSipUa.on("newRTCSession", function (_a) {
            var originator = _a.originator, session = _a.session, request = _a.request;
            if (originator === "remote") {
                _this.onIncomingCall(session, request);
            }
        });
        this.jsSipUa.start();
    }
    //TODO: If no response to register do something
    Ua.prototype.register = function () {
        this.jsSipUa.register();
    };
    /**
     * Do not actually send a REGISTER expire=0.
     * Assert no packet will arrive to this UA until next register.
     * */
    Ua.prototype.unregister = function () {
        this.jsSipUa.emit("unregistered");
    };
    Ua.prototype.onMessage = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var bundledData, fromNumber, pr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, bundledData_1.extractBundledDataFromHeaders((function () {
                            var out = {};
                            for (var key in request.headers) {
                                out[key] = request.headers[key][0].raw;
                            }
                            return out;
                        })(), Ua.session.towardUserDecryptor)];
                    case 1:
                        bundledData = _a.sent();
                        fromNumber = request.from.uri.user;
                        if (bundledData.type === "RINGBACK") {
                            this.evtRingback.post(bundledData.callId);
                            return [2 /*return*/];
                        }
                        pr = this.postEvtIncomingMessage({
                            fromNumber: fromNumber,
                            bundledData: bundledData
                        });
                        this.jsSipSocket.setMessageOkDelay(request, pr);
                        return [2 /*return*/];
                }
            });
        });
    };
    Ua.prototype.sendMessage = function (number, bundledData) {
        var _this = this;
        return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _b = (_a = this.jsSipUa).sendMessage;
                        _c = ["sip:" + number + "@" + env_1.baseDomain,
                            "| encrypted message bundled in header |"];
                        _d = {
                            "contentType": "text/plain; charset=UTF-8"
                        };
                        _e = "extraHeaders";
                        return [4 /*yield*/, bundledData_1.smuggleBundledDataInHeaders(bundledData, this.towardSimEncryptor).then(function (headers) { return Object.keys(headers).map(function (key) { return key + ": " + headers[key]; }); })];
                    case 1: return [2 /*return*/, _b.apply(_a, _c.concat([(_d[_e] = _f.sent(),
                                _d["eventHandlers"] = {
                                    "succeeded": function () { return resolve(); },
                                    "failed": function (_a) {
                                        var cause = _a.cause;
                                        return reject(new Error("Send message failed " + cause));
                                    }
                                },
                                _d)]))];
                }
            });
        }); });
    };
    Ua.prototype.onIncomingCall = function (jsSipRtcSession, request) {
        var _this = this;
        var evtRequestTerminate = new ts_events_extended_1.VoidSyncEvent();
        var evtAccepted = new ts_events_extended_1.VoidSyncEvent();
        var evtTerminated = new ts_events_extended_1.VoidSyncEvent();
        var evtDtmf = new ts_events_extended_1.SyncEvent();
        var evtEstablished = new ts_events_extended_1.VoidSyncEvent();
        evtRequestTerminate.attachOnce(function () { return jsSipRtcSession.terminate(); });
        evtDtmf.attach(function (_a) {
            var signal = _a.signal, duration = _a.duration;
            return jsSipRtcSession.sendDTMF(signal, { duration: duration });
        });
        evtAccepted.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
            var rtcIceServer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localApiHandlers.getRTCIceServer()];
                    case 1:
                        rtcIceServer = _a.sent();
                        jsSipRtcSession.on("icecandidate", newIceCandidateHandler(rtcIceServer));
                        jsSipRtcSession.answer({
                            "mediaConstraints": { "audio": true, "video": false },
                            "pcConfig": { "iceServers": [rtcIceServer] }
                        });
                        jsSipRtcSession.connection.addEventListener("track", function (_a) {
                            var _b = __read(_a.streams, 1), stream = _b[0];
                            return playAudioStream(stream);
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        jsSipRtcSession.once("confirmed", function () { return evtEstablished.post(); });
        jsSipRtcSession.once("ended", function () { return evtTerminated.post(); });
        jsSipRtcSession.once("failed", function () { return evtTerminated.post(); });
        this.evtIncomingCall.post({
            "fromNumber": request.from.uri.user,
            "terminate": function () { return evtRequestTerminate.post(); },
            "prTerminated": Promise.race([
                evtRequestTerminate.waitFor(),
                evtTerminated.waitFor()
            ]),
            "onAccepted": function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            evtAccepted.post();
                            return [4 /*yield*/, evtEstablished.waitFor()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, {
                                    "state": "ESTABLISHED",
                                    "sendDtmf": function (signal, duration) { return evtDtmf.post({ signal: signal, duration: duration }); }
                                }];
                    }
                });
            }); }
        });
    };
    Ua.prototype.placeOutgoingCall = function (number) {
        return __awaiter(this, void 0, void 0, function () {
            var evtEstablished, evtTerminated, evtDtmf, evtRequestTerminate, evtRingback, rtcICEServer;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        evtEstablished = new ts_events_extended_1.VoidSyncEvent();
                        evtTerminated = new ts_events_extended_1.VoidSyncEvent();
                        evtDtmf = new ts_events_extended_1.SyncEvent();
                        evtRequestTerminate = new ts_events_extended_1.VoidSyncEvent();
                        evtRingback = new ts_events_extended_1.VoidSyncEvent();
                        return [4 /*yield*/, localApiHandlers.getRTCIceServer()];
                    case 1:
                        rtcICEServer = _a.sent();
                        this.jsSipUa.call("sip:" + number + "@" + env_1.baseDomain, {
                            "mediaConstraints": { "audio": true, "video": false },
                            "pcConfig": {
                                "iceServers": [rtcICEServer]
                            },
                            "eventHandlers": {
                                "icecandidate": newIceCandidateHandler(rtcICEServer),
                                "connecting": function () {
                                    var jsSipRtcSession = this;
                                    if (!!evtRequestTerminate.postCount) {
                                        jsSipRtcSession.terminate();
                                        return;
                                    }
                                    evtRequestTerminate.attachOnce(function () { return jsSipRtcSession.terminate(); });
                                    evtDtmf.attach(function (_a) {
                                        var signal = _a.signal, duration = _a.duration;
                                        return jsSipRtcSession.sendDTMF(signal, { duration: duration });
                                    });
                                    jsSipRtcSession.connection.addEventListener("track", function (_a) {
                                        var _b = __read(_a.streams, 1), stream = _b[0];
                                        return playAudioStream(stream);
                                    });
                                },
                                "confirmed": function () { return evtEstablished.post(); },
                                "ended": function () { return evtTerminated.post(); },
                                "failed": function () { return evtTerminated.post(); },
                                "sending": function (_a) {
                                    var request = _a.request;
                                    return _this.evtRingback.waitFor(function (callId) { return callId === request.call_id; }, 30000)
                                        .then(function () { return evtRingback.post(); })
                                        .catch(function () { });
                                }
                            }
                        });
                        return [2 /*return*/, {
                                "prNextState": new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
                                    var _this = this;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, Promise.race([
                                                    evtRingback.waitFor(),
                                                    evtEstablished.waitFor()
                                                ])];
                                            case 1:
                                                _a.sent();
                                                resolve({
                                                    "state": "RINGBACK",
                                                    "prNextState": new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
                                                        return __generator(this, function (_a) {
                                                            switch (_a.label) {
                                                                case 0:
                                                                    if (!!evtEstablished.postCount) return [3 /*break*/, 2];
                                                                    return [4 /*yield*/, evtEstablished.waitFor()];
                                                                case 1:
                                                                    _a.sent();
                                                                    _a.label = 2;
                                                                case 2:
                                                                    resolve({
                                                                        "state": "ESTABLISHED",
                                                                        "sendDtmf": function (signal, duration) {
                                                                            return evtDtmf.post({ signal: signal, duration: duration });
                                                                        }
                                                                    });
                                                                    return [2 /*return*/];
                                                            }
                                                        });
                                                    }); })
                                                });
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }),
                                "prTerminated": Promise.race([
                                    evtRequestTerminate.waitFor(),
                                    evtTerminated.waitFor()
                                ]),
                                "terminate": function () { return evtRequestTerminate.post(); }
                            }];
                }
            });
        });
    };
    return Ua;
}());
exports.Ua = Ua;
function playAudioStream(stream) {
    var audio = document.createElement("audio");
    audio.autoplay = true;
    audio.srcObject = stream;
}
var JsSipSocket = /** @class */ (function () {
    function JsSipSocket(imsi, sip_uri) {
        var _this = this;
        this.sip_uri = sip_uri;
        this.evtSipPacket = new ts_events_extended_1.SyncEvent();
        this.via_transport = "WSS";
        this.url = connection.url;
        this.messageOkDelays = new Map();
        var onBackedSocketConnect = function (backendSocket) {
            var onSipPacket = function (sipPacket) {
                if (readImsi_1.readImsi(sipPacket) !== imsi) {
                    return;
                }
                _this.sdpHacks("INCOMING", sipPacket);
                _this.evtSipPacket.post(sipPacket);
                _this.ondata(sip.toData(sipPacket).toString("utf8"));
            };
            backendSocket.evtRequest.attach(onSipPacket);
            backendSocket.evtResponse.attach(onSipPacket);
            backendSocket.evtPacketPreWrite.attach(function (sipPacket) { return _this.sdpHacks("OUTGOING", sipPacket); });
        };
        connection.evtConnect.attach(function (socket) { return onBackedSocketConnect(socket); });
        var socket = connection.get();
        if (!(socket instanceof Promise)) {
            onBackedSocketConnect(socket);
        }
    }
    JsSipSocket.prototype.sdpHacks = function (direction, sipPacket) {
        if (sipPacket.headers["content-type"] !== "application/sdp") {
            return;
        }
        var editSdp = function (sdpEditor) {
            var parsedSdp = sip.parseSdp(sip.getPacketContent(sipPacket)
                .toString("utf8"));
            sdpEditor(parsedSdp);
            sip.setPacketContent(sipPacket, sip.stringifySdp(parsedSdp));
        };
        switch (direction) {
            case "INCOMING":
                //NOTE: Sdp Hack for Mozilla
                if (!/firefox/i.test(navigator.userAgent)) {
                    return;
                }
                console.log("Firefox SDP hack !");
                editSdp(function (parsedSdp) {
                    var a = parsedSdp["m"][0]["a"];
                    if (!!a.find(function (v) { return /^mid:/i.test(v); })) {
                        return;
                    }
                    parsedSdp["m"][0]["a"] = __spread(a, ["mid:0"]);
                });
                break;
            case "OUTGOING":
                editSdp(function (parsedSdp) {
                    //NOTE: We allow to try establishing P2P connection only 
                    //when the public address resolved by the stun correspond
                    //to a private address of class A ( 192.168.x.x ).
                    //Otherwise we stripe out the srflx candidate and use turn.
                    var a = parsedSdp["m"][0]["a"];
                    var updated_a = a.filter(function (line) {
                        var match = line.match(/srflx\ raddr\ ([0-9]+)\./);
                        if (!match) {
                            return true;
                        }
                        return match[1] === "192";
                    });
                    parsedSdp["m"][0]["a"] = updated_a;
                });
                break;
        }
    };
    JsSipSocket.prototype.connect = function () {
        this.onconnect();
    };
    JsSipSocket.prototype.disconnect = function () {
        throw new Error("JsSip should not call disconnect");
    };
    /**
     * To call when receiving as SIP MESSAGE
     * to prevent directly sending the 200 OK
     * response immediately but rather wait
     * until some action have been completed.
     *
     * @param request the request prop of the
     * eventData emitted by JsSIP UA for the
     * "newMessage" event. ( when originator === remote )
     * @param pr The response to the SIP MESSAGE
     * will not be sent until this promise resolve.
     */
    JsSipSocket.prototype.setMessageOkDelay = function (request, pr) {
        this.messageOkDelays.set(request.getHeader("Call-ID"), pr);
    };
    JsSipSocket.prototype.send = function (data) {
        var _this = this;
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var sipPacket, sipResponse, callId, pr, socketOrPrSocket, socket, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sipPacket = sip.parse(Buffer.from(data, "utf8"));
                        if (!!sip.matchRequest(sipPacket)) return [3 /*break*/, 2];
                        sipResponse = sipPacket;
                        if (!(sipResponse.headers.cseq.method === "MESSAGE")) return [3 /*break*/, 2];
                        callId = sipResponse.headers["call-id"];
                        pr = this.messageOkDelays.get(callId);
                        if (!!!pr) return [3 /*break*/, 2];
                        return [4 /*yield*/, pr];
                    case 1:
                        _b.sent();
                        this.messageOkDelays.delete(callId);
                        _b.label = 2;
                    case 2:
                        socketOrPrSocket = connection.get();
                        if (!(socketOrPrSocket instanceof Promise)) return [3 /*break*/, 4];
                        return [4 /*yield*/, socketOrPrSocket];
                    case 3:
                        _a = (_b.sent());
                        return [3 /*break*/, 5];
                    case 4:
                        _a = socketOrPrSocket;
                        _b.label = 5;
                    case 5:
                        socket = _a;
                        socket.write(sip.parse(Buffer.from(data, "utf8")));
                        return [2 /*return*/];
                }
            });
        }); })();
        return true;
    };
    JsSipSocket.prototype.onconnect = function () {
        throw new Error("Missing impl");
    };
    JsSipSocket.prototype.ondisconnect = function (error, code, reason) {
        throw new Error("Missing impl");
    };
    JsSipSocket.prototype.ondata = function (data) {
        throw new Error("Missing impl");
    };
    return JsSipSocket;
}());
/** Let end gathering ICE candidates as quickly as possible. */
function newIceCandidateHandler(rtcICEServer) {
    var isReady = newIceCandidateHandler.isReadyFactory(rtcICEServer);
    var readyTimer = undefined;
    return function (data) {
        var candidate = data.candidate, ready = data.ready;
        //console.log(candidate);
        var readyState = isReady(candidate.candidate);
        console.log("ICE: " + readyState);
        switch (readyState) {
            case "NOT READY": return;
            case "AT LEAST ONE RELAY CANDIDATE READY":
                if (readyTimer === undefined) {
                    readyTimer = setTimeout(function () {
                        console.log("Timing out ice candidates gathering");
                        ready();
                    }, 300);
                }
                return;
            case "ALL CANDIDATES READY":
                clearTimeout(readyTimer);
                ready();
                return;
        }
    };
}
(function (newIceCandidateHandler) {
    function isReadyFactory(rtcICEServer) {
        //console.log(JSON.stringify(rtcICEServer, null, 2));
        var p = (function () {
            var urls = typeof rtcICEServer.urls === "string" ?
                [rtcICEServer.urls] : rtcICEServer.urls;
            ;
            return {
                "isSrflxCandidateExpected": !!urls.find(function (url) { return !!url.match(/^stun/i); }),
                "isRelayCandidateExpected": !!urls.find(function (url) { return !!url.match(/^turn:/i); }),
                "isEncryptedRelayCandidateExpected": !!urls.find(function (url) { return !!url.match(/^turns:/i); }),
                "lines": new Array()
            };
        })();
        //console.log(JSON.stringify(p, null, 2));
        return function (line) {
            p.lines.push(line);
            var isRtcpExcepted = !!p.lines
                .map(function (line) { return parseLine(line); })
                .find(function (_a) {
                var component = _a.component;
                return component === "RTCP";
            });
            if (isFullyReady(__assign(__assign({}, p), { isRtcpExcepted: isRtcpExcepted }))) {
                return "ALL CANDIDATES READY";
            }
            return countRelayCandidatesReady(p.lines, isRtcpExcepted) >= 1 ?
                "AT LEAST ONE RELAY CANDIDATE READY" : "NOT READY";
        };
    }
    newIceCandidateHandler.isReadyFactory = isReadyFactory;
    function parseLine(line) {
        var match = line.match(/(1|2)\s+(?:udp|tcp)\s+([0-9]+)\s/i);
        return {
            "component": match[1] === "1" ? "RTP" : "RTCP",
            "priority": parseInt(match[2])
        };
    }
    function countRelayCandidatesReady(lines, isRtcpExcepted) {
        var parsedLines = lines
            .filter(function (line) { return !!line.match(/udp.+relay/i); })
            .map(parseLine);
        var parsedRtpLines = parsedLines
            .filter(function (_a) {
            var component = _a.component;
            return component === "RTP";
        });
        if (!isRtcpExcepted) {
            return parsedRtpLines.length;
        }
        var parsedRtcpLines = parsedLines
            .filter(function (_a) {
            var component = _a.component;
            return component === "RTCP";
        });
        return parsedRtpLines
            .filter(function (_a) {
            var rtpPriority = _a.priority;
            return !!parsedRtcpLines.find(function (_a) {
                var priority = _a.priority;
                return Math.abs(priority - rtpPriority) === 1;
            });
        })
            .length;
    }
    function isSrflxCandidateReady(lines, isRtcpExcepted) {
        var parsedLines = lines
            .filter(function (line) { return !!line.match(/udp.+srflx/i); })
            .map(parseLine);
        var parsedRtpLines = parsedLines
            .filter(function (_a) {
            var component = _a.component;
            return component === "RTP";
        });
        if (!isRtcpExcepted) {
            return parsedRtpLines.length !== 0;
        }
        var parsedRtcpLines = parsedLines
            .filter(function (_a) {
            var component = _a.component;
            return component === "RTCP";
        });
        return !!parsedRtpLines
            .find(function (_a) {
            var rtpPriority = _a.priority;
            return !!parsedRtcpLines.find(function (_a) {
                var priority = _a.priority;
                return Math.abs(priority - rtpPriority) === 1;
            });
        });
    }
    function isFullyReady(p) {
        return (!p.isSrflxCandidateExpected ?
            true :
            isSrflxCandidateReady(p.lines, p.isRtcpExcepted)) && ((p.isRelayCandidateExpected ? 1 : 0)
            +
                (p.isEncryptedRelayCandidateExpected ? 1 : 0)
            <=
                countRelayCandidatesReady(p.lines, p.isRtcpExcepted));
    }
})(newIceCandidateHandler || (newIceCandidateHandler = {}));

}).call(this,require("buffer").Buffer)
},{"../gateway/RegistrationParams":24,"../gateway/bundledData":25,"../gateway/readImsi":26,"./env":29,"./toBackend/connection":36,"./toBackend/localApiHandlers":37,"buffer":3,"run-exclusive":69,"ts-events-extended":89,"ts-sip":97}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsRuntimeEnv_1 = require("./jsRuntimeEnv");
exports.jsRuntimeEnv = jsRuntimeEnv_1.jsRuntimeEnv;
//NOTE: For web Defined at ejs building in templates/head_common.ejs, must be defined for react-native.
exports.assetsRoot = jsRuntimeEnv_1.jsRuntimeEnv === "react-native" ? "https://static.semasim.com/" : window["assets_root"];
exports.isDevEnv = jsRuntimeEnv_1.jsRuntimeEnv === "react-native" ? true : window["isDevEnv"];
exports.baseDomain = jsRuntimeEnv_1.jsRuntimeEnv === "react-native" ?
    (exports.isDevEnv ? "dev.semasim.com" : "semasim.com") :
    window.location.href.match(/^https:\/\/web\.([^\/]+)/)[1];

},{"./jsRuntimeEnv":30}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsRuntimeEnv = "browser";

},{}],31:[function(require,module,exports){
(function (Buffer){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var localStorageApi = require("./localStorageApi");
exports.key = "authenticated-session-descriptor-shared-data";
var AuthenticatedSessionDescriptorSharedData;
(function (AuthenticatedSessionDescriptorSharedData) {
    function isPresent() {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.getItem(exports.key)];
                    case 1:
                        value = _a.sent();
                        return [2 /*return*/, value !== null];
                }
            });
        });
    }
    AuthenticatedSessionDescriptorSharedData.isPresent = isPresent;
    function remove() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, isPresent()];
                    case 1:
                        if (!(_a.sent())) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, localStorageApi.removeItem(exports.key)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    AuthenticatedSessionDescriptorSharedData.remove = remove;
    /** assert isPresent */
    function get() {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.getItem(exports.key)];
                    case 1:
                        value = _a.sent();
                        if (value === undefined) {
                            throw new Error("Auth not present in localStorage");
                        }
                        return [2 /*return*/, JSON.parse(Buffer.from(value, "hex").toString("utf8"))];
                }
            });
        });
    }
    AuthenticatedSessionDescriptorSharedData.get = get;
    function set(authenticatedSessionDescriptorSharedData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.setItem(exports.key, Buffer.from(JSON.stringify(authenticatedSessionDescriptorSharedData), "utf8").toString("hex"))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    AuthenticatedSessionDescriptorSharedData.set = set;
})(AuthenticatedSessionDescriptorSharedData = exports.AuthenticatedSessionDescriptorSharedData || (exports.AuthenticatedSessionDescriptorSharedData = {}));

}).call(this,require("buffer").Buffer)
},{"./localStorageApi":34,"buffer":3}],32:[function(require,module,exports){
(function (Buffer){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var localStorageApi = require("./localStorageApi");
var env = require("../env");
exports.key = "credentials";
var Credentials;
(function (Credentials) {
    function throwIfWeb() {
        if (env.jsRuntimeEnv === "react-native") {
            return;
        }
        throw new Error("Storing credentials in local storage should be done only on react-native");
    }
    function isPresent() {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        throwIfWeb();
                        return [4 /*yield*/, localStorageApi.getItem(exports.key)];
                    case 1:
                        value = _a.sent();
                        return [2 /*return*/, value !== null];
                }
            });
        });
    }
    Credentials.isPresent = isPresent;
    function remove() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        throwIfWeb();
                        return [4 /*yield*/, isPresent()];
                    case 1:
                        if (!(_a.sent())) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, localStorageApi.removeItem(exports.key)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    Credentials.remove = remove;
    /** assert isPresent */
    function get() {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        throwIfWeb();
                        return [4 /*yield*/, localStorageApi.getItem(exports.key)];
                    case 1:
                        value = _a.sent();
                        if (value === undefined) {
                            throw new Error("Auth not present in localStorage");
                        }
                        return [2 /*return*/, JSON.parse(Buffer.from(value, "hex").toString("utf8"))];
                }
            });
        });
    }
    Credentials.get = get;
    function set(authenticatedSessionDescriptorSharedData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        throwIfWeb();
                        return [4 /*yield*/, localStorageApi.setItem(exports.key, Buffer.from(JSON.stringify(authenticatedSessionDescriptorSharedData), "utf8").toString("hex"))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    Credentials.set = set;
})(Credentials = exports.Credentials || (exports.Credentials = {}));

}).call(this,require("buffer").Buffer)
},{"../env":29,"./localStorageApi":34,"buffer":3}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncOrSyncLocalStorage = localStorage;

},{}],34:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var asyncOrSyncLocalStorage_1 = require("./asyncOrSyncLocalStorage");
function getItem(key) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, asyncOrSyncLocalStorage_1.asyncOrSyncLocalStorage.getItem(key)];
        });
    });
}
exports.getItem = getItem;
function setItem(key, value) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, asyncOrSyncLocalStorage_1.asyncOrSyncLocalStorage.setItem(key, value)];
        });
    });
}
exports.setItem = setItem;
function removeItem(key) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, asyncOrSyncLocalStorage_1.asyncOrSyncLocalStorage.removeItem(key)];
        });
    });
}
exports.removeItem = removeItem;

},{"./asyncOrSyncLocalStorage":33}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function notifyHostWhenPageIsReady() {
    $(document).ready(function () { return console.log("->__PAGE_READY__<-"); });
}
exports.notifyHostWhenPageIsReady = notifyHostWhenPageIsReady;

},{}],36:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("ts-sip");
var ts_events_extended_1 = require("ts-events-extended");
var localApiHandlers = require("./localApiHandlers");
var remoteApiCaller = require("./remoteApiCaller/base");
var bootbox_custom = require("../../tools/bootbox_custom");
var urlGetParameters = require("../../tools/urlGetParameters");
var env_1 = require("../env");
var AuthenticatedSessionDescriptorSharedData_1 = require("../localStorage/AuthenticatedSessionDescriptorSharedData");
var Credentials_1 = require("../localStorage/Credentials");
var webApiCaller = require("../webApiCaller");
var env = require("../env");
exports.url = "wss://web." + env_1.baseDomain;
var idString = "toBackend";
var log = env_1.isDevEnv ? console.log.bind(console) : (function () { });
var apiServer = new sip.api.Server(localApiHandlers.handlers, sip.api.Server.getDefaultLogger({
    idString: idString,
    log: log,
    "hideKeepAlive": true
}));
var socketCurrent = undefined;
var userSims = undefined;
exports.evtConnect = new ts_events_extended_1.SyncEvent();
/**
 * - Multiple auxiliary connection can be established at the same time.
 * - On the contrary only one main connection can be active at the same time for a given user account )
 * - Auxiliary connections does not receive most of the events defined in localApiHandler.
 *   But will receive notifyIceServer ( if requestTurnCred === true ).
 * - Auxiliary connections will not receive phonebook entries
 * ( userSims will appear as if they had no contacts stored )
 *
 * Called from outside isReconnect should never be passed.
 *  */
function connect(connectionType, requestTurnCred, isReconnect) {
    return __awaiter(this, void 0, void 0, function () {
        var socket, _a, _b, _c, _d, _e, _f, _g, _h;
        var _this = this;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    //We register 'offline' event only on the first call of connect()
                    //TODO: React native.
                    if (socketCurrent === undefined && env.jsRuntimeEnv === "browser") {
                        window.addEventListener("offline", function () {
                            var socket = get();
                            if (socket instanceof Promise) {
                                return;
                            }
                            socket.destroy("Browser is offline");
                        });
                    }
                    _b = (_a = sip.Socket).bind;
                    _c = WebSocket.bind;
                    _e = (_d = urlGetParameters).buildUrl;
                    _f = [exports.url];
                    _g = {};
                    _h = "connect_sid";
                    return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.get()];
                case 1:
                    socket = new (_b.apply(_a, [void 0, new (_c.apply(WebSocket, [void 0, _e.apply(_d, _f.concat([(_g[_h] = (_j.sent()).connect_sid,
                                    _g.connectionType = connectionType,
                                    _g.requestTurnCred = requestTurnCred,
                                    _g)])), "SIP"]))(),
                        true,
                        {
                            "remoteAddress": "web." + env_1.baseDomain,
                            "remotePort": 443
                        },
                        20000]))();
                    apiServer.startListening(socket);
                    sip.api.client.enableKeepAlive(socket, 6 * 1000);
                    sip.api.client.enableErrorLogging(socket, sip.api.client.getDefaultErrorLogger({
                        idString: idString,
                        "log": console.log.bind(console)
                    }));
                    socket.enableLogger({
                        "socketId": idString,
                        "remoteEndId": "BACKEND",
                        "localEndId": "FRONTEND",
                        "connection": true,
                        "error": true,
                        "close": true,
                        "incomingTraffic": false,
                        "outgoingTraffic": false,
                        "ignoreApiTraffic": true
                    }, log);
                    socketCurrent = socket;
                    socket.evtConnect.attachOnce(function () {
                        log("Socket " + (!!isReconnect ? "re-" : "") + "connected");
                        if (!!isReconnect) {
                            bootbox_custom.dismissLoading();
                        }
                        var includeContacts = connectionType === "MAIN";
                        if (userSims === undefined) {
                            remoteApiCaller.getUsableUserSims(includeContacts)
                                .then(function (userSims_) { return userSims = userSims_; });
                        }
                        else {
                            remoteApiCaller.getUsableUserSims(includeContacts, "STATELESS")
                                .then(function (userSims_) {
                                var e_1, _a;
                                var _loop_1 = function (userSim_) {
                                    var userSim = userSims
                                        .find(function (_a) {
                                        var sim = _a.sim;
                                        return sim.imsi === userSim_.sim.imsi;
                                    });
                                    /*
                                    By testing if digests are the same we cover 99% of the case
                                    when the sim could have been modified while offline...good enough.
                                    */
                                    if (!userSim ||
                                        userSim.sim.storage.digest !== userSim_.sim.storage.digest) {
                                        location.reload();
                                        return { value: void 0 };
                                    }
                                    /*
                                    If userSim is online we received a notification before having the
                                    response of the request... even possible?
                                     */
                                    if (!!userSim.reachableSimState) {
                                        return "continue";
                                    }
                                    userSim.reachableSimState = userSim_.reachableSimState;
                                    userSim.password = userSim_.password;
                                    userSim.dongle = userSim_.dongle;
                                    userSim.gatewayLocation = userSim_.gatewayLocation;
                                    if (!!userSim.reachableSimState) {
                                        localApiHandlers.evtSimIsOnlineStatusChange.post(userSim);
                                    }
                                };
                                try {
                                    for (var userSims_1 = __values(userSims_), userSims_1_1 = userSims_1.next(); !userSims_1_1.done; userSims_1_1 = userSims_1.next()) {
                                        var userSim_ = userSims_1_1.value;
                                        var state_1 = _loop_1(userSim_);
                                        if (typeof state_1 === "object")
                                            return state_1.value;
                                    }
                                }
                                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                                finally {
                                    try {
                                        if (userSims_1_1 && !userSims_1_1.done && (_a = userSims_1.return)) _a.call(userSims_1);
                                    }
                                    finally { if (e_1) throw e_1.error; }
                                }
                            });
                        }
                        exports.evtConnect.post(socket);
                    });
                    socket.evtClose.attachOnce(function () { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b, userSim, _c, _d, email, secret, uaInstanceId, status_1;
                        var e_2, _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    log("Socket disconnected");
                                    try {
                                        for (_a = __values(userSims || []), _b = _a.next(); !_b.done; _b = _a.next()) {
                                            userSim = _b.value;
                                            userSim.reachableSimState = undefined;
                                            localApiHandlers.evtSimIsOnlineStatusChange.post(userSim);
                                        }
                                    }
                                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                    finally {
                                        try {
                                            if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                                        }
                                        finally { if (e_2) throw e_2.error; }
                                    }
                                    if (localApiHandlers.evtOpenElsewhere.postCount !== 0) {
                                        return [2 /*return*/];
                                    }
                                    if (socket.evtConnect.postCount === 1) {
                                        bootbox_custom.loading("Reconnecting...");
                                    }
                                    if (!(env.jsRuntimeEnv === "browser")) return [3 /*break*/, 3];
                                    _f.label = 1;
                                case 1:
                                    if (!!navigator.onLine) return [3 /*break*/, 3];
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                                case 2:
                                    _f.sent();
                                    return [3 /*break*/, 1];
                                case 3: return [4 /*yield*/, webApiCaller.isUserLoggedIn()];
                                case 4:
                                    if (!!(_f.sent())) return [3 /*break*/, 10];
                                    _c = env.jsRuntimeEnv;
                                    switch (_c) {
                                        case "browser": return [3 /*break*/, 5];
                                        case "react-native": return [3 /*break*/, 6];
                                    }
                                    return [3 /*break*/, 10];
                                case 5:
                                    window.location.reload();
                                    return [2 /*return*/];
                                case 6: return [4 /*yield*/, Credentials_1.Credentials.isPresent()];
                                case 7:
                                    if (!(_f.sent())) {
                                        throw new Error("TODO: ...");
                                    }
                                    return [4 /*yield*/, Credentials_1.Credentials.get()];
                                case 8:
                                    _d = _f.sent(), email = _d.email, secret = _d.secret, uaInstanceId = _d.uaInstanceId;
                                    return [4 /*yield*/, webApiCaller.loginUser(email, secret, uaInstanceId)];
                                case 9:
                                    status_1 = (_f.sent()).status;
                                    if (status_1 !== "SUCCESS") {
                                        throw new Error("TODO: relogin failed");
                                    }
                                    return [3 /*break*/, 10];
                                case 10:
                                    connect(connectionType, requestTurnCred, "RECONNECT");
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
            }
        });
    });
}
exports.connect = connect;
function get() {
    if (!socketCurrent ||
        socketCurrent.evtClose.postCount !== 0 ||
        !socketCurrent.evtConnect.postCount) {
        return new Promise(function (resolve) { return exports.evtConnect.attachOnce(function () { return resolve(socketCurrent); }); });
    }
    else {
        return socketCurrent;
    }
}
exports.get = get;

},{"../../tools/bootbox_custom":45,"../../tools/urlGetParameters":48,"../env":29,"../localStorage/AuthenticatedSessionDescriptorSharedData":31,"../localStorage/Credentials":32,"../webApiCaller":41,"./localApiHandlers":37,"./remoteApiCaller/base":38,"ts-events-extended":89,"ts-sip":97}],37:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var apiDeclaration = require("../../sip_api_declarations/uaToBackend");
var ts_events_extended_1 = require("ts-events-extended");
var dcTypes = require("chan-dongle-extended-client/dist/lib/types");
var remoteApiCaller = require("./remoteApiCaller/base");
//NOTE: Global JS deps.
var bootbox_custom = require("../../tools/bootbox_custom");
exports.handlers = {};
exports.evtSimIsOnlineStatusChange = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifySimOffline.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSim, hadOngoingCall;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSim = (_b.sent())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            hadOngoingCall = (userSim.reachableSimState !== undefined &&
                                userSim.reachableSimState.isGsmConnectivityOk &&
                                userSim.reachableSimState.ongoingCall !== undefined);
                            userSim.reachableSimState = undefined;
                            if (hadOngoingCall) {
                                exports.evtOngoingCall.post(userSim);
                            }
                            exports.evtSimIsOnlineStatusChange.post(userSim);
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
/**
 * Posted when a Dongle with an unlocked SIM goes online.
 * Used so we can display a loading between the moment
 * when the card have been unlocked and the card is ready
 * to use.
 */
var evtUsableDongle = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifySimOnline.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, hasInternalSimStorageChanged = _a.hasInternalSimStorageChanged, password = _a.password, simDongle = _a.simDongle, gatewayLocation = _a.gatewayLocation, isGsmConnectivityOk = _a.isGsmConnectivityOk, cellSignalStrength = _a.cellSignalStrength;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSim;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            evtUsableDongle.post({ "imei": simDongle.imei });
                            return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSim = (_b.sent())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            if (hasInternalSimStorageChanged) {
                                location.reload();
                                return [2 /*return*/];
                            }
                            userSim.reachableSimState = isGsmConnectivityOk ?
                                ({ "isGsmConnectivityOk": true, cellSignalStrength: cellSignalStrength, "ongoingCall": undefined }) :
                                ({ "isGsmConnectivityOk": false, cellSignalStrength: cellSignalStrength });
                            userSim.password = password;
                            userSim.dongle = simDongle;
                            userSim.gatewayLocation = gatewayLocation;
                            exports.evtSimIsOnlineStatusChange.post(userSim);
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
exports.evtSimGsmConnectivityChange = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifyGsmConnectivityChange.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, isGsmConnectivityOk = _a.isGsmConnectivityOk;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSim, reachableSimState, hadOngoingCall;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSim = (_b.sent())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            reachableSimState = userSim.reachableSimState;
                            if (reachableSimState === undefined) {
                                throw new Error("assert");
                            }
                            if (isGsmConnectivityOk === reachableSimState.isGsmConnectivityOk) {
                                throw new Error("assert");
                            }
                            if (reachableSimState.isGsmConnectivityOk) {
                                hadOngoingCall = false;
                                if (reachableSimState.ongoingCall !== undefined) {
                                    delete reachableSimState.ongoingCall;
                                    hadOngoingCall = true;
                                }
                                reachableSimState.isGsmConnectivityOk = false;
                                if (hadOngoingCall) {
                                    exports.evtOngoingCall.post(userSim);
                                }
                            }
                            else {
                                reachableSimState.isGsmConnectivityOk = true;
                            }
                            exports.evtSimGsmConnectivityChange.post(userSim);
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
exports.evtSimCellSignalStrengthChange = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifyCellSignalStrengthChange.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, cellSignalStrength = _a.cellSignalStrength;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSim;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSim = (_b.sent())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            if (userSim.reachableSimState === undefined) {
                                throw new Error("Sim should be reachable");
                            }
                            userSim.reachableSimState.cellSignalStrength = cellSignalStrength;
                            exports.evtSimCellSignalStrengthChange.post(userSim);
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
//TODO: Make use of.
exports.evtOngoingCall = new ts_events_extended_1.SyncEvent();
/*
evtOngoingCall.attach(userSim => {

    const { reachableSimState } = userSim;

    if( !reachableSimState ){

        console.log("===> sim no longer reachable");

        return;
        
    }

    if( !reachableSimState.isGsmConnectivityOk ){

        console.log("=============> cell connectivity lost");

        return;

    }

    if( reachableSimState.ongoingCall === undefined ){

        console.log("=================> call terminated");

        return;

    }

    console.log("===========> ", JSON.stringify(reachableSimState.ongoingCall, null, 2));

});
*/
{
    var methodName = apiDeclaration.notifyOngoingCall.methodName;
    var handler = {
        "handler": function (params) { return __awaiter(void 0, void 0, void 0, function () {
            var imsi, userSim, ongoingCallId, reachableSimState, ongoingCall, reachableSimState, ongoingCallId, from, number, isUserInCall, otherUserInCallEmails, prevOngoingCall_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        imsi = params.imsi;
                        return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                    case 1:
                        userSim = (_a.sent())
                            .find(function (_a) {
                            var sim = _a.sim;
                            return sim.imsi === imsi;
                        });
                        if (params.isTerminated) {
                            ongoingCallId = params.ongoingCallId;
                            reachableSimState = userSim.reachableSimState;
                            if (!reachableSimState) {
                                //NOTE: The event would have been posted in setSimOffline handler.
                                return [2 /*return*/];
                            }
                            if (!reachableSimState.isGsmConnectivityOk) {
                                //NOTE: If we have had event notifying connectivity lost
                                //before this event the evtOngoingCall will have been posted
                                //in notifyGsmConnectivityChange handler function.
                                return [2 /*return*/];
                            }
                            if (reachableSimState.ongoingCall === undefined ||
                                reachableSimState.ongoingCall.ongoingCallId !== ongoingCallId) {
                                return [2 /*return*/];
                            }
                            reachableSimState.ongoingCall = undefined;
                        }
                        else {
                            ongoingCall = params.ongoingCall;
                            reachableSimState = userSim.reachableSimState;
                            if (reachableSimState === undefined) {
                                throw new Error("assert");
                            }
                            if (!reachableSimState.isGsmConnectivityOk) {
                                throw new Error("assert");
                            }
                            if (reachableSimState.ongoingCall === undefined) {
                                reachableSimState.ongoingCall = ongoingCall;
                            }
                            else if (reachableSimState.ongoingCall.ongoingCallId !== ongoingCall.ongoingCallId) {
                                reachableSimState.ongoingCall === undefined;
                                exports.evtOngoingCall.post(userSim);
                                reachableSimState.ongoingCall = ongoingCall;
                            }
                            else {
                                ongoingCallId = ongoingCall.ongoingCallId, from = ongoingCall.from, number = ongoingCall.number, isUserInCall = ongoingCall.isUserInCall, otherUserInCallEmails = ongoingCall.otherUserInCallEmails;
                                prevOngoingCall_1 = reachableSimState.ongoingCall;
                                Object.assign(prevOngoingCall_1, { ongoingCallId: ongoingCallId, from: from, number: number, isUserInCall: isUserInCall });
                                prevOngoingCall_1.otherUserInCallEmails.splice(0, prevOngoingCall_1.otherUserInCallEmails.length);
                                otherUserInCallEmails.forEach(function (email) { return prevOngoingCall_1.otherUserInCallEmails.push(email); });
                            }
                        }
                        exports.evtOngoingCall.post(userSim);
                        return [2 /*return*/, undefined];
                }
            });
        }); }
    };
    exports.handlers[methodName] = handler;
}
/** posted when a user that share the SIM created or updated a contact. */
exports.evtContactCreatedOrUpdated = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifyContactCreatedOrUpdated.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, name = _a.name, number_raw = _a.number_raw, storage = _a.storage;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSim, contact;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSim = (_b.sent())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            contact = userSim.phonebook.find(function (contact) {
                                if (!!storage) {
                                    return contact.mem_index === storage.mem_index;
                                }
                                return contact.number_raw === number_raw;
                            });
                            if (!!contact) {
                                contact.name = name;
                                if (!!storage) {
                                    userSim.sim.storage.contacts
                                        .find(function (_a) {
                                        var index = _a.index;
                                        return index === storage.mem_index;
                                    }).name =
                                        storage.name_as_stored;
                                }
                            }
                            else {
                                contact = { name: name, number_raw: number_raw };
                                userSim.phonebook.push(contact);
                                if (!!storage) {
                                    userSim.sim.storage.infos.storageLeft--;
                                    contact.mem_index = storage.mem_index;
                                    userSim.sim.storage.contacts.push({
                                        "index": contact.mem_index,
                                        name: name,
                                        "number": number_raw
                                    });
                                }
                            }
                            if (!!storage) {
                                userSim.sim.storage.digest = storage.new_digest;
                            }
                            exports.evtContactCreatedOrUpdated.post({ userSim: userSim, contact: contact });
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
exports.evtContactDeleted = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifyContactDeleted.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, number_raw = _a.number_raw, storage = _a.storage;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSim, contact, i;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSim = (_b.sent())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            for (i = 0; i < userSim.phonebook.length; i++) {
                                contact = userSim.phonebook[i];
                                if (!!storage ?
                                    storage.mem_index === contact.mem_index :
                                    contact.number_raw === number_raw) {
                                    userSim.phonebook.splice(i, 1);
                                    break;
                                }
                            }
                            if (!!storage) {
                                userSim.sim.storage.digest = storage.new_digest;
                                userSim.sim.storage.infos.storageLeft--;
                                userSim.sim.storage.contacts.splice(userSim.sim.storage.contacts.indexOf(userSim.sim.storage.contacts.find(function (_a) {
                                    var index = _a.index;
                                    return index === storage.mem_index;
                                })), 1);
                            }
                            exports.evtContactDeleted.post({ userSim: userSim, "contact": contact });
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.notifyDongleOnLan.methodName;
    var handler = {
        "handler": function (dongle) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (dcTypes.Dongle.Locked.match(dongle)) {
                    interact_onLockedDongle_1(dongle);
                }
                else {
                    evtUsableDongle.post({ "imei": dongle.imei });
                    interact_onUsableDongle_1(dongle);
                }
                return [2 /*return*/, undefined];
            });
        }); }
    };
    exports.handlers[methodName] = handler;
    var interact_onLockedDongle_1 = function (dongle) { return __awaiter(void 0, void 0, void 0, function () {
        var pin, unlockResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (dongle.sim.pinState !== "SIM PIN") {
                        bootbox_custom.alert(dongle.sim.pinState + " require manual unlock");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (function callee() {
                            return __awaiter(this, void 0, void 0, function () {
                                var pin, shouldContinue;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.prompt({
                                                "title": "PIN code for sim inside " + dongle.manufacturer + " " + dongle.model + " (" + dongle.sim.tryLeft + " tries left)",
                                                "inputType": "number",
                                                "callback": function (result) { return resolve(result); }
                                            }); })];
                                        case 1:
                                            pin = _a.sent();
                                            if (pin === null) {
                                                return [2 /*return*/, undefined];
                                            }
                                            if (!!pin.match(/^[0-9]{4}$/)) return [3 /*break*/, 3];
                                            return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.confirm({
                                                    "title": "PIN malformed!",
                                                    "message": "A pin code is composed of 4 digits, e.g. 0000",
                                                    callback: function (result) { return resolve(result); }
                                                }); })];
                                        case 2:
                                            shouldContinue = _a.sent();
                                            if (!shouldContinue) {
                                                return [2 /*return*/, undefined];
                                            }
                                            return [2 /*return*/, callee()];
                                        case 3: return [2 /*return*/, pin];
                                    }
                                });
                            });
                        })()];
                case 1:
                    pin = _a.sent();
                    if (pin === undefined) {
                        return [2 /*return*/];
                    }
                    bootbox_custom.loading("Your sim is being unlocked please wait...", 0);
                    return [4 /*yield*/, remoteApiCaller.unlockSim(dongle, pin)];
                case 2:
                    unlockResult = _a.sent();
                    bootbox_custom.dismissLoading();
                    if (!unlockResult) {
                        alert("Unlock failed for unknown reason");
                        return [2 /*return*/];
                    }
                    if (!unlockResult.success) {
                        //NOTE: Interact will be called again with an updated dongle.
                        return [2 /*return*/];
                    }
                    bootbox_custom.loading("Initialization of the sim...", 0);
                    return [4 /*yield*/, evtUsableDongle.waitFor(function (_a) {
                            var imei = _a.imei;
                            return imei === dongle.imei;
                        })];
                case 3:
                    _a.sent();
                    bootbox_custom.dismissLoading();
                    return [2 /*return*/];
            }
        });
    }); };
    var interact_onUsableDongle_1 = function (dongle) { return __awaiter(void 0, void 0, void 0, function () {
        var shouldAdd_message, shouldAdd, friendlyName, friendlyNameSubmitted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    shouldAdd_message = [
                        "SIM inside:",
                        dongle.manufacturer + " " + dongle.model,
                        "Sim IMSI: " + dongle.sim.imsi,
                    ].join("<br>");
                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.dialog({
                            "title": "SIM ready to be registered",
                            "message": "<p class=\"text-center\">" + shouldAdd_message + "</p>",
                            "buttons": {
                                "cancel": {
                                    "label": "Not now",
                                    "callback": function () { return resolve(false); }
                                },
                                "success": {
                                    "label": "Yes, register this sim",
                                    "className": "btn-success",
                                    "callback": function () { return resolve(true); }
                                }
                            },
                            "closeButton": false
                        }); })];
                case 1:
                    shouldAdd = _a.sent();
                    if (!shouldAdd) {
                        return [2 /*return*/];
                    }
                    if (!(dongle.isVoiceEnabled === false)) return [3 /*break*/, 3];
                    //TODO: Improve message.
                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.alert([
                            "You won't be able to make phone call with this device until it have been voice enabled",
                            "See: <a href='https://www.semasim.com/enable-voice'></a>"
                        ].join("<br>"), function () { return resolve(); }); })];
                case 2:
                    //TODO: Improve message.
                    _a.sent();
                    _a.label = 3;
                case 3:
                    bootbox_custom.loading("Suggesting a suitable friendly name ...");
                    return [4 /*yield*/, getDefaultFriendlyName_1(dongle.sim)];
                case 4:
                    friendlyName = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.prompt({
                            "title": "Friendly name for this sim?",
                            "value": friendlyName,
                            "callback": function (result) { return resolve(result); },
                        }); })];
                case 5:
                    friendlyNameSubmitted = _a.sent();
                    if (!friendlyNameSubmitted) {
                        return [2 /*return*/];
                    }
                    friendlyName = friendlyNameSubmitted;
                    bootbox_custom.loading("Registering SIM...");
                    return [4 /*yield*/, remoteApiCaller.registerSim(dongle, friendlyName)];
                case 6:
                    _a.sent();
                    bootbox_custom.dismissLoading();
                    return [2 /*return*/];
            }
        });
    }); };
    var getDefaultFriendlyName_1 = function (sim) { return __awaiter(void 0, void 0, void 0, function () {
        var tag, num, build, i, userSims;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tag = sim.serviceProvider.fromImsi || sim.serviceProvider.fromNetwork || "";
                    num = sim.storage.number;
                    if (!tag && num && num.length > 6) {
                        tag = num.slice(0, 4) + ".." + num.slice(-2);
                    }
                    tag = tag || "X";
                    build = function (i) { return "SIM " + tag + (i === 0 ? "" : " ( " + i + " )"); };
                    i = 0;
                    return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                case 1:
                    userSims = _a.sent();
                    while (userSims.filter(function (_a) {
                        var friendlyName = _a.friendlyName, sim = _a.sim;
                        return friendlyName === build(i);
                    }).length) {
                        i++;
                    }
                    return [2 /*return*/, build(i)];
            }
        });
    }); };
}
exports.evtSimPermissionLost = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifySimPermissionLost.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSims, userSim;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSims = _b.sent();
                            userSim = userSims.find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            userSims.splice(userSims.indexOf(userSim), 1);
                            exports.evtSimPermissionLost.post(userSim);
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
{
    var methodName = apiDeclaration.notifySimSharingRequest.methodName;
    var handler = {
        "handler": function (params) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                interact_1(params);
                return [2 /*return*/, undefined];
            });
        }); }
    };
    exports.handlers[methodName] = handler;
    //TODO: run exclusive
    var interact_1 = function (userSim) { return __awaiter(void 0, void 0, void 0, function () {
        var shouldProceed, friendlyNameSubmitted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.dialog({
                        "title": userSim.ownership.ownerEmail + " would like to share a SIM with you, accept?",
                        "message": userSim.ownership.sharingRequestMessage ?
                            "\u00AB" + userSim.ownership.sharingRequestMessage.replace(/\n/g, "<br>") + "\u00BB" : "",
                        "buttons": {
                            "cancel": {
                                "label": "Refuse",
                                "callback": function () { return resolve("REFUSE"); }
                            },
                            "success": {
                                "label": "Yes, use this SIM",
                                "className": "btn-success",
                                "callback": function () { return resolve("ACCEPT"); }
                            }
                        },
                        "onEscape": function () { return resolve("LATER"); }
                    }); })];
                case 1:
                    shouldProceed = _a.sent();
                    if (shouldProceed === "LATER") {
                        return [2 /*return*/, undefined];
                    }
                    if (!(shouldProceed === "REFUSE")) return [3 /*break*/, 3];
                    bootbox_custom.loading("Rejecting SIM sharing request...");
                    return [4 /*yield*/, remoteApiCaller.rejectSharingRequest(userSim)];
                case 2:
                    _a.sent();
                    bootbox_custom.dismissLoading();
                    return [2 /*return*/, undefined];
                case 3: return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.prompt({
                        "title": "Friendly name for this sim?",
                        "value": userSim.friendlyName,
                        "callback": function (result) { return resolve(result); },
                    }); })];
                case 4:
                    friendlyNameSubmitted = _a.sent();
                    if (!!friendlyNameSubmitted) return [3 /*break*/, 6];
                    bootbox_custom.loading("Rejecting SIM sharing request...");
                    return [4 /*yield*/, remoteApiCaller.rejectSharingRequest(userSim)];
                case 5:
                    _a.sent();
                    bootbox_custom.dismissLoading();
                    return [2 /*return*/, undefined];
                case 6:
                    userSim.friendlyName = friendlyNameSubmitted;
                    bootbox_custom.loading("Accepting SIM sharing request...");
                    return [4 /*yield*/, remoteApiCaller.acceptSharingRequest(userSim, userSim.friendlyName)];
                case 7:
                    _a.sent();
                    bootbox_custom.dismissLoading();
                    return [2 /*return*/];
            }
        });
    }); };
}
exports.evtSharingRequestResponse = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifySharingRequestResponse.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, email = _a.email, isAccepted = _a.isAccepted;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSim;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSim = (_b.sent())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            switch (userSim.ownership.status) {
                                case "OWNED":
                                    userSim.ownership.sharedWith.notConfirmed.splice(userSim.ownership.sharedWith.notConfirmed.indexOf(email), 1);
                                    if (isAccepted) {
                                        userSim.ownership.sharedWith.confirmed.push(email);
                                    }
                                    break;
                                case "SHARED CONFIRMED":
                                    if (isAccepted) {
                                        userSim.ownership.otherUserEmails.push(email);
                                    }
                                    break;
                            }
                            bootbox_custom.alert(email + " " + (isAccepted ? "accepted" : "rejected") + " sharing request for " + userSim.friendlyName);
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
exports.evtOtherSimUserUnregisteredSim = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifyOtherSimUserUnregisteredSim.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, email = _a.email;
            return __awaiter(void 0, void 0, void 0, function () {
                var userSim;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
                        case 1:
                            userSim = (_b.sent())
                                .find(function (_a) {
                                var sim = _a.sim;
                                return sim.imsi === imsi;
                            });
                            switch (userSim.ownership.status) {
                                case "OWNED":
                                    userSim.ownership.sharedWith.confirmed.splice(userSim.ownership.sharedWith.confirmed.indexOf(email), 1);
                                    break;
                                case "SHARED CONFIRMED":
                                    userSim.ownership.otherUserEmails.splice(userSim.ownership.otherUserEmails.indexOf(email), 1);
                                    break;
                            }
                            bootbox_custom.alert(email + " no longer share " + userSim.friendlyName);
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
exports.evtOpenElsewhere = new ts_events_extended_1.VoidSyncEvent();
{
    var methodName = apiDeclaration.notifyLoggedFromOtherTab.methodName;
    var handler = {
        "handler": function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                exports.evtOpenElsewhere.post();
                bootbox_custom.alert("You are connected somewhere else", function () { return location.reload(); });
                return [2 /*return*/, undefined];
            });
        }); }
    };
    exports.handlers[methodName] = handler;
}
var evtRTCIceEServer = new ts_events_extended_1.SyncEvent();
exports.getRTCIceServer = (function () {
    var current = undefined;
    var evtUpdated = new ts_events_extended_1.VoidSyncEvent();
    evtRTCIceEServer.attach(function (_a) {
        var rtcIceServer = _a.rtcIceServer, socket = _a.socket;
        socket.evtClose.attachOnce(function () { return current = undefined; });
        current = rtcIceServer;
        evtUpdated.post();
    });
    return function callee() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (current !== undefined) {
                            return [2 /*return*/, current];
                        }
                        return [4 /*yield*/, evtUpdated.waitFor()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, callee()];
                }
            });
        });
    };
})();
{
    var methodName = apiDeclaration.notifyIceServer.methodName;
    var handler = {
        "handler": function (params, fromSocket) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                evtRTCIceEServer.post({
                    "rtcIceServer": params !== undefined ? params :
                        ({
                            "urls": [
                                "stun:stun1.l.google.com:19302",
                                "stun:stun2.l.google.com:19302",
                                "stun:stun3.l.google.com:19302",
                                "stun:stun4.l.google.com:19302"
                            ]
                        }),
                    "socket": fromSocket
                });
                return [2 /*return*/, undefined];
            });
        }); }
    };
    exports.handlers[methodName] = handler;
}

},{"../../sip_api_declarations/uaToBackend":44,"../../tools/bootbox_custom":45,"./remoteApiCaller/base":38,"chan-dongle-extended-client/dist/lib/types":50,"ts-events-extended":89}],38:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var sendRequest_1 = require("./sendRequest");
var ts_events_extended_1 = require("ts-events-extended");
var apiDeclaration = require("../../../sip_api_declarations/backendToUa");
/** Posted when user register a new sim on he's LAN or accept a sharing request */
exports.evtUsableSim = new ts_events_extended_1.SyncEvent();
//TODO: Fix, it's called two times!!
exports.getUsableUserSims = (function () {
    var methodName = apiDeclaration.getUsableUserSims.methodName;
    var prUsableUserSims = undefined;
    /**
     *
     * includeContacts is true by defaults.
     *
     * The stateless argument is used to re fetch the userSim from the server regardless
     * of if it have been done previously already, it will return a new array.
     * If the 'stateless' argument is omitted then the returned value is static.
     * ( only one request is sent to the server )
     *
     * Note that if the method have already been called and called with
     * stateless falsy includeContacts will not have any effect.
     *
     */
    return function (includeContacts, stateless) {
        if (includeContacts === void 0) { includeContacts = true; }
        if (stateless === void 0) { stateless = false; }
        if (!stateless && !!prUsableUserSims) {
            return prUsableUserSims;
        }
        var prUsableUserSims_ = sendRequest_1.sendRequest(methodName, { includeContacts: includeContacts });
        if (!!stateless) {
            return prUsableUserSims_;
        }
        else {
            prUsableUserSims = prUsableUserSims_;
            return exports.getUsableUserSims();
        }
    };
})();
exports.unlockSim = (function () {
    var methodName = apiDeclaration.unlockSim.methodName;
    return function (lockedDongle, pin) {
        return sendRequest_1.sendRequest(methodName, { "imei": lockedDongle.imei, pin: pin });
    };
})();
exports.registerSim = (function () {
    var methodName = apiDeclaration.registerSim.methodName;
    return function (dongle, friendlyName) {
        return __awaiter(this, void 0, void 0, function () {
            var userSim;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, {
                            "imsi": dongle.sim.imsi,
                            "imei": dongle.imei,
                            friendlyName: friendlyName
                        })];
                    case 1:
                        userSim = _a.sent();
                        return [4 /*yield*/, exports.getUsableUserSims()];
                    case 2:
                        (_a.sent()).push(userSim);
                        exports.evtUsableSim.post(userSim);
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.unregisterSim = (function () {
    var methodName = apiDeclaration.unregisterSim.methodName;
    return function (userSim) {
        return __awaiter(this, void 0, void 0, function () {
            var usableUserSims;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, { "imsi": userSim.sim.imsi })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, exports.getUsableUserSims()];
                    case 2:
                        usableUserSims = _a.sent();
                        usableUserSims.splice(usableUserSims.indexOf(userSim), 1);
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.rebootDongle = (function () {
    var methodName = apiDeclaration.rebootDongle.methodName;
    return function (userSim) {
        return sendRequest_1.sendRequest(methodName, { "imsi": userSim.sim.imsi });
    };
})();
exports.shareSim = (function () {
    var methodName = apiDeclaration.shareSim.methodName;
    return function (userSim, emails, message) {
        return __awaiter(this, void 0, void 0, function () {
            var emails_1, emails_1_1, email;
            var e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, { "imsi": userSim.sim.imsi, emails: emails, message: message })];
                    case 1:
                        _b.sent();
                        try {
                            for (emails_1 = __values(emails), emails_1_1 = emails_1.next(); !emails_1_1.done; emails_1_1 = emails_1.next()) {
                                email = emails_1_1.value;
                                userSim.ownership.sharedWith.notConfirmed.push(email);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (emails_1_1 && !emails_1_1.done && (_a = emails_1.return)) _a.call(emails_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.stopSharingSim = (function () {
    var methodName = apiDeclaration.stopSharingSim.methodName;
    return function (userSim, emails) {
        return __awaiter(this, void 0, void 0, function () {
            var emails_2, emails_2_1, email, _a, notConfirmed, confirmed, arr, index;
            var e_2, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, { "imsi": userSim.sim.imsi, emails: emails })];
                    case 1:
                        _c.sent();
                        try {
                            for (emails_2 = __values(emails), emails_2_1 = emails_2.next(); !emails_2_1.done; emails_2_1 = emails_2.next()) {
                                email = emails_2_1.value;
                                _a = userSim.ownership.sharedWith, notConfirmed = _a.notConfirmed, confirmed = _a.confirmed;
                                arr = void 0;
                                index = void 0;
                                index = notConfirmed.indexOf(email);
                                if (index > 0) {
                                    arr = notConfirmed;
                                }
                                else {
                                    index = confirmed.indexOf(email);
                                    arr = confirmed;
                                }
                                arr.splice(index, 1);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (emails_2_1 && !emails_2_1.done && (_b = emails_2.return)) _b.call(emails_2);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.changeSimFriendlyName = (function () {
    var methodName = apiDeclaration.changeSimFriendlyName.methodName;
    return function (userSim, friendlyName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, { "imsi": userSim.sim.imsi, friendlyName: friendlyName })];
                    case 1:
                        _a.sent();
                        userSim.friendlyName = friendlyName;
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.acceptSharingRequest = (function () {
    var methodName = apiDeclaration.acceptSharingRequest.methodName;
    return function (notConfirmedUserSim, friendlyName) {
        return __awaiter(this, void 0, void 0, function () {
            var password, userSim;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, { "imsi": notConfirmedUserSim.sim.imsi, friendlyName: friendlyName })];
                    case 1:
                        password = (_a.sent()).password;
                        userSim = {
                            "sim": notConfirmedUserSim.sim,
                            friendlyName: friendlyName,
                            password: password,
                            "towardSimEncryptKeyStr": notConfirmedUserSim.towardSimEncryptKeyStr,
                            "dongle": notConfirmedUserSim.dongle,
                            "gatewayLocation": notConfirmedUserSim.gatewayLocation,
                            "ownership": {
                                "status": "SHARED CONFIRMED",
                                "ownerEmail": notConfirmedUserSim.ownership.ownerEmail,
                                "otherUserEmails": notConfirmedUserSim.ownership.otherUserEmails
                            },
                            "phonebook": notConfirmedUserSim.phonebook,
                            "reachableSimState": notConfirmedUserSim.reachableSimState
                        };
                        return [4 /*yield*/, exports.getUsableUserSims()];
                    case 2:
                        (_a.sent()).push(userSim);
                        exports.evtUsableSim.post(userSim);
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.rejectSharingRequest = (function () {
    var methodName = apiDeclaration.rejectSharingRequest.methodName;
    return function (userSim) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, { "imsi": userSim.sim.imsi })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.createContact = (function () {
    var methodName = apiDeclaration.createContact.methodName;
    return function (userSim, name, number) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, contact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, { "imsi": userSim.sim.imsi, name: name, number: number })];
                    case 1:
                        resp = _a.sent();
                        contact = {
                            "mem_index": !!resp ? resp.mem_index : undefined,
                            name: name,
                            "number_raw": number
                        };
                        userSim.phonebook.push(contact);
                        if (!!resp) {
                            userSim.sim.storage.contacts.push({
                                "index": resp.mem_index,
                                name: name,
                                number: number
                            });
                            userSim.sim.storage.digest = resp.new_digest;
                            userSim.sim.storage.infos.storageLeft--;
                        }
                        return [2 /*return*/, contact];
                }
            });
        });
    };
})();
exports.updateContactName = (function () {
    var methodName = apiDeclaration.updateContactName.methodName;
    /** Assert contact is the ref of the object stored in userSim */
    return function (userSim, contact, newName) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, name_as_stored_in_sim, new_digest;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(contact.mem_index !== undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, sendRequest_1.sendRequest(methodName, {
                                "imsi": userSim.sim.imsi,
                                "contactRef": { "mem_index": contact.mem_index },
                                newName: newName
                            })];
                    case 1:
                        _a = _b.sent(), name_as_stored_in_sim = _a.name_as_stored_in_sim, new_digest = _a.new_digest;
                        contact.name = newName;
                        userSim
                            .sim.storage.contacts.find(function (_a) {
                            var index = _a.index;
                            return index === contact.mem_index;
                        })
                            .name = name_as_stored_in_sim;
                        userSim.sim.storage.digest = new_digest;
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, {
                            "imsi": userSim.sim.imsi,
                            "contactRef": { "number": contact.number_raw },
                            newName: newName
                        })];
                    case 3:
                        _b.sent();
                        contact.name = newName;
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
})();
exports.deleteContact = (function () {
    var methodName = apiDeclaration.deleteContact.methodName;
    return function (userSim, contact) {
        return __awaiter(this, void 0, void 0, function () {
            var new_digest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest_1.sendRequest(methodName, {
                            "imsi": userSim.sim.imsi,
                            "contactRef": contact.mem_index === null ?
                                ({ "mem_index": contact.mem_index }) :
                                ({ "number": contact.number_raw })
                        })];
                    case 1:
                        new_digest = (_a.sent()).new_digest;
                        if (contact.mem_index !== null) {
                            userSim.sim.storage.contacts.splice(userSim.sim.storage.contacts.findIndex(function (_a) {
                                var index = _a.index;
                                return index === contact.mem_index;
                            }), 1);
                        }
                        userSim.phonebook.splice(userSim.phonebook.indexOf(contact), 1);
                        if (new_digest !== undefined) {
                            userSim.sim.storage.digest = new_digest;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
})();
/** Api only called once */
exports.shouldAppendPromotionalMessage = (function () {
    var methodName = apiDeclaration.shouldAppendPromotionalMessage.methodName;
    var cachedResponse = undefined;
    return function () {
        if (cachedResponse !== undefined) {
            return cachedResponse;
        }
        return sendRequest_1.sendRequest(methodName, undefined).then(function (response) { return cachedResponse = response; });
    };
})();

},{"../../../sip_api_declarations/backendToUa":43,"./sendRequest":39,"ts-events-extended":89}],39:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var sipLibrary = require("ts-sip");
var connection = require("../connection");
function sendRequest(methodName, params, retry) {
    return __awaiter(this, void 0, void 0, function () {
        var response, _a, _b, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    _b = (_a = sipLibrary.api.client).sendRequest;
                    return [4 /*yield*/, connection.get()];
                case 1: return [4 /*yield*/, _b.apply(_a, [_c.sent(),
                        methodName,
                        params,
                        { "timeout": 60 * 1000 }])];
                case 2:
                    response = _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    if (!!retry) {
                        return [2 /*return*/, sendRequest(methodName, params, "RETRY")];
                    }
                    else {
                        throw error_1;
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, response];
            }
        });
    });
}
exports.sendRequest = sendRequest;

},{"../connection":36,"ts-sip":97}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectSidHttpHeaderName = "x-connect-sid";

},{}],41:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var apiDeclaration = require("../../web_api_declaration");
var JSON_CUSTOM_1 = require("transfer-tools/dist/lib/JSON_CUSTOM");
var webApiPath_1 = require("../../gateway/webApiPath");
var sendRequest_1 = require("./sendRequest");
var AuthenticatedSessionDescriptorSharedData_1 = require("../localStorage/AuthenticatedSessionDescriptorSharedData");
var Credentials_1 = require("../localStorage/Credentials");
var env = require("../env");
var sendRequest = sendRequest_1.sendRequestFactory(webApiPath_1.webApiPath, JSON_CUSTOM_1.get());
exports.registerUser = (function () {
    var methodName = apiDeclaration.registerUser.methodName;
    return function (email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey) {
        return sendRequest(methodName, {
            email: email,
            secret: secret,
            towardUserEncryptKeyStr: towardUserEncryptKeyStr,
            encryptedSymmetricKey: encryptedSymmetricKey
        });
    };
})();
exports.validateEmail = (function () {
    var methodName = apiDeclaration.validateEmail.methodName;
    return function (email, activationCode) {
        return sendRequest(methodName, { email: email, activationCode: activationCode });
    };
})();
/** uaInstanceId should be provided on android/iOS and undefined on the web */
exports.loginUser = (function () {
    var methodName = apiDeclaration.loginUser.methodName;
    return function (email, secret, uaInstanceId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, { email: email, secret: secret, uaInstanceId: uaInstanceId })];
                    case 1:
                        response = _a.sent();
                        if (response.status !== "SUCCESS") {
                            return [2 /*return*/, response];
                        }
                        if (!(env.jsRuntimeEnv === "react-native")) return [3 /*break*/, 3];
                        return [4 /*yield*/, Credentials_1.Credentials.set({
                                email: email,
                                secret: secret,
                                "uaInstanceId": uaInstanceId
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.set({
                            "connect_sid": response.connect_sid,
                            email: email,
                            "encryptedSymmetricKey": response.encryptedSymmetricKey,
                            "uaInstanceId": uaInstanceId === undefined ?
                                response.webUaInstanceId : uaInstanceId
                        })];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, { "status": response.status }];
                }
            });
        });
    };
})();
exports.isUserLoggedIn = (function () {
    var methodName = apiDeclaration.isUserLoggedIn.methodName;
    return function () {
        return __awaiter(this, void 0, void 0, function () {
            var isLoggedIn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, undefined)];
                    case 1:
                        isLoggedIn = _a.sent();
                        if (!!isLoggedIn) return [3 /*break*/, 5];
                        if (!(env.jsRuntimeEnv === "react-native")) return [3 /*break*/, 3];
                        return [4 /*yield*/, Credentials_1.Credentials.remove()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.remove()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, isLoggedIn];
                }
            });
        });
    };
})();
exports.declareUa = (function () {
    var methodName = apiDeclaration.declareUa.methodName;
    return function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, params)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.logoutUser = (function () {
    var methodName = apiDeclaration.logoutUser.methodName;
    return function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, undefined)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.remove()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
/** Return true if email has account */
exports.sendRenewPasswordEmail = (function () {
    var methodName = apiDeclaration.sendRenewPasswordEmail.methodName;
    return function (email) {
        return sendRequest(methodName, { email: email });
    };
})();
exports.renewPassword = (function () {
    var methodName = apiDeclaration.renewPassword.methodName;
    return function (email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token) {
        return sendRequest(methodName, {
            email: email,
            newSecret: newSecret,
            newTowardUserEncryptKeyStr: newTowardUserEncryptKeyStr,
            newEncryptedSymmetricKey: newEncryptedSymmetricKey,
            token: token
        });
    };
})();
exports.getCountryIso = (function () {
    var methodName = apiDeclaration.getCountryIso.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();
exports.getChangesRates = (function () {
    var methodName = apiDeclaration.getChangesRates.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();
exports.getSubscriptionInfos = (function () {
    var methodName = apiDeclaration.getSubscriptionInfos.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();
exports.subscribeOrUpdateSource = (function () {
    var methodName = apiDeclaration.subscribeOrUpdateSource.methodName;
    return function (sourceId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, { sourceId: sourceId })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.unsubscribe = (function () {
    var methodName = apiDeclaration.unsubscribe.methodName;
    return function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, undefined)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.createStripeCheckoutSessionForShop = (function () {
    var methodName = apiDeclaration.createStripeCheckoutSessionForShop.methodName;
    return function (cart, shippingFormData, currency, success_url, cancel_url) {
        return sendRequest(methodName, {
            "cartDescription": cart.map(function (_a) {
                var product = _a.product, quantity = _a.quantity;
                return ({
                    "productName": product.name,
                    quantity: quantity
                });
            }),
            shippingFormData: shippingFormData,
            currency: currency,
            success_url: success_url,
            cancel_url: cancel_url
        });
    };
})();
exports.createStripeCheckoutSessionForSubscription = (function () {
    var methodName = apiDeclaration.createStripeCheckoutSessionForSubscription.methodName;
    return function (currency, success_url, cancel_url) {
        return sendRequest(methodName, {
            currency: currency,
            success_url: success_url,
            cancel_url: cancel_url
        });
    };
})();
exports.getOrders = (function () {
    var methodName = apiDeclaration.getOrders.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();

},{"../../gateway/webApiPath":27,"../../web_api_declaration":49,"../env":29,"../localStorage/AuthenticatedSessionDescriptorSharedData":31,"../localStorage/Credentials":32,"./sendRequest":42,"transfer-tools/dist/lib/JSON_CUSTOM":80}],42:[function(require,module,exports){
"use strict";
//NOTE: Assert jQuery loaded on the page
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var AuthenticatedSessionDescriptorSharedData_1 = require("../localStorage/AuthenticatedSessionDescriptorSharedData");
var Credentials_1 = require("../localStorage/Credentials");
var connectSidHttpHeaderName_1 = require("../types/connectSidHttpHeaderName");
var env = require("../env");
//TODO: Locating reload in case of 401 unauthorized. and alert are not applicable in react-native.
function sendRequestFactory(webApiPath, serializer) {
    return function sendRequest(methodName, params) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            var _j;
            var _this = this;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        _a = fetch;
                        _b = ["https://web." + env.baseDomain + webApiPath + "/" + methodName];
                        _c = {
                            "method": "POST",
                            "cache": "no-cache",
                            "credentials": "same-origin"
                        };
                        _d = "headers";
                        _e = [{ "Content-Type": "application/json-custom; charset=utf-8" }];
                        _g = env.jsRuntimeEnv === "react-native";
                        if (!_g) return [3 /*break*/, 2];
                        return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.isPresent()];
                    case 1:
                        _g = (_k.sent());
                        _k.label = 2;
                    case 2:
                        if (!_g) return [3 /*break*/, 4];
                        _j = {};
                        _h = connectSidHttpHeaderName_1.connectSidHttpHeaderName;
                        return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.get()];
                    case 3:
                        _f = (_j[_h] = (_k.sent()).connect_sid, _j);
                        return [3 /*break*/, 5];
                    case 4:
                        _f = ({});
                        _k.label = 5;
                    case 5: return [2 /*return*/, _a.apply(void 0, _b.concat([(_c[_d] = __assign.apply(void 0, _e.concat([(_f)])),
                                _c["redirect"] = "error",
                                _c["body"] = serializer.stringify(params),
                                _c)])).then(function (response) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, text, out;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _a = response.status;
                                        switch (_a) {
                                            case 400: return [3 /*break*/, 1];
                                            case 401: return [3 /*break*/, 2];
                                            case 500: return [3 /*break*/, 6];
                                            case 200: return [3 /*break*/, 7];
                                        }
                                        return [3 /*break*/, 8];
                                    case 1:
                                        {
                                            //TODO: Bad request ( bug in the client )
                                            alert("Bad request ( bug in the client )");
                                        }
                                        return [2 /*return*/];
                                    case 2:
                                        if (!(env.jsRuntimeEnv === "react-native")) return [3 /*break*/, 4];
                                        return [4 /*yield*/, Credentials_1.Credentials.remove()];
                                    case 3:
                                        _b.sent();
                                        _b.label = 4;
                                    case 4: return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.remove()];
                                    case 5:
                                        _b.sent();
                                        window.location.reload();
                                        return [2 /*return*/];
                                    case 6:
                                        {
                                            //TODO: Server side error.
                                            alert("Bug on the server, sorry :(");
                                        }
                                        return [2 /*return*/];
                                    case 7:
                                        {
                                        }
                                        return [3 /*break*/, 9];
                                    case 8:
                                        {
                                            //TODO: Unknown result code.
                                        }
                                        return [2 /*return*/];
                                    case 9:
                                        console.log("great we got the 200 response!");
                                        return [4 /*yield*/, response.text()];
                                    case 10:
                                        text = _b.sent();
                                        console.log("we have the text! ", text);
                                        out = serializer.parse(text);
                                        console.log("we have the out", out);
                                        return [2 /*return*/, out];
                                }
                            });
                        }); })];
                }
            });
        });
    };
}
exports.sendRequestFactory = sendRequestFactory;

},{"../env":29,"../localStorage/AuthenticatedSessionDescriptorSharedData":31,"../localStorage/Credentials":32,"../types/connectSidHttpHeaderName":40}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getUsableUserSims;
(function (getUsableUserSims) {
    getUsableUserSims.methodName = "getUsableUserSims";
})(getUsableUserSims = exports.getUsableUserSims || (exports.getUsableUserSims = {}));
var unlockSim;
(function (unlockSim) {
    unlockSim.methodName = "unlockSim";
})(unlockSim = exports.unlockSim || (exports.unlockSim = {}));
var registerSim;
(function (registerSim) {
    registerSim.methodName = "registerSim";
})(registerSim = exports.registerSim || (exports.registerSim = {}));
var unregisterSim;
(function (unregisterSim) {
    unregisterSim.methodName = "unregisterSim";
})(unregisterSim = exports.unregisterSim || (exports.unregisterSim = {}));
var rebootDongle;
(function (rebootDongle) {
    rebootDongle.methodName = "rebootDongle";
})(rebootDongle = exports.rebootDongle || (exports.rebootDongle = {}));
var shareSim;
(function (shareSim) {
    shareSim.methodName = "shareSim";
})(shareSim = exports.shareSim || (exports.shareSim = {}));
var stopSharingSim;
(function (stopSharingSim) {
    stopSharingSim.methodName = "stopSharingSim";
})(stopSharingSim = exports.stopSharingSim || (exports.stopSharingSim = {}));
var changeSimFriendlyName;
(function (changeSimFriendlyName) {
    changeSimFriendlyName.methodName = "changeSimFriendlyName";
})(changeSimFriendlyName = exports.changeSimFriendlyName || (exports.changeSimFriendlyName = {}));
//NOTE: The DB transaction to use is setSimFriendlyName
var acceptSharingRequest;
(function (acceptSharingRequest) {
    acceptSharingRequest.methodName = "acceptSharingRequest";
})(acceptSharingRequest = exports.acceptSharingRequest || (exports.acceptSharingRequest = {}));
//NOTE: The DB transaction to use is unregisterSim
var rejectSharingRequest;
(function (rejectSharingRequest) {
    rejectSharingRequest.methodName = "rejectSharingRequest";
})(rejectSharingRequest = exports.rejectSharingRequest || (exports.rejectSharingRequest = {}));
var createContact;
(function (createContact) {
    createContact.methodName = "createContact";
})(createContact = exports.createContact || (exports.createContact = {}));
var updateContactName;
(function (updateContactName) {
    updateContactName.methodName = "updateContactName";
})(updateContactName = exports.updateContactName || (exports.updateContactName = {}));
var deleteContact;
(function (deleteContact) {
    deleteContact.methodName = "deleteContact";
})(deleteContact = exports.deleteContact || (exports.deleteContact = {}));
var shouldAppendPromotionalMessage;
(function (shouldAppendPromotionalMessage) {
    shouldAppendPromotionalMessage.methodName = "shouldAppendSenTWithSemasim";
})(shouldAppendPromotionalMessage = exports.shouldAppendPromotionalMessage || (exports.shouldAppendPromotionalMessage = {}));
//WebphoneData Sync things:
var getOrCreateInstance;
(function (getOrCreateInstance) {
    getOrCreateInstance.methodName = "getInstance";
})(getOrCreateInstance = exports.getOrCreateInstance || (exports.getOrCreateInstance = {}));
var newChat;
(function (newChat) {
    newChat.methodName = "newChat";
})(newChat = exports.newChat || (exports.newChat = {}));
var fetchOlderMessages;
(function (fetchOlderMessages) {
    fetchOlderMessages.methodName = "fetchOlderMessages";
})(fetchOlderMessages = exports.fetchOlderMessages || (exports.fetchOlderMessages = {}));
var updateChat;
(function (updateChat) {
    updateChat.methodName = "updateChat";
})(updateChat = exports.updateChat || (exports.updateChat = {}));
var destroyChat;
(function (destroyChat) {
    destroyChat.methodName = "destroyChat";
})(destroyChat = exports.destroyChat || (exports.destroyChat = {}));
var newMessage;
(function (newMessage) {
    newMessage.methodName = "newMessage";
})(newMessage = exports.newMessage || (exports.newMessage = {}));
var notifySendReportReceived;
(function (notifySendReportReceived) {
    notifySendReportReceived.methodName = "notifySendReportReceived";
})(notifySendReportReceived = exports.notifySendReportReceived || (exports.notifySendReportReceived = {}));
var notifyStatusReportReceived;
(function (notifyStatusReportReceived) {
    notifyStatusReportReceived.methodName = "notifyStatusReportReceived";
})(notifyStatusReportReceived = exports.notifyStatusReportReceived || (exports.notifyStatusReportReceived = {}));

},{}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var notifySimOffline;
(function (notifySimOffline) {
    notifySimOffline.methodName = "notifySimOffline";
})(notifySimOffline = exports.notifySimOffline || (exports.notifySimOffline = {}));
var notifySimOnline;
(function (notifySimOnline) {
    notifySimOnline.methodName = "notifySimOnline";
})(notifySimOnline = exports.notifySimOnline || (exports.notifySimOnline = {}));
var notifyGsmConnectivityChange;
(function (notifyGsmConnectivityChange) {
    notifyGsmConnectivityChange.methodName = "notifyGsmConnectivityChange";
})(notifyGsmConnectivityChange = exports.notifyGsmConnectivityChange || (exports.notifyGsmConnectivityChange = {}));
var notifyCellSignalStrengthChange;
(function (notifyCellSignalStrengthChange) {
    notifyCellSignalStrengthChange.methodName = "notifyCellSignalStrengthChange";
})(notifyCellSignalStrengthChange = exports.notifyCellSignalStrengthChange || (exports.notifyCellSignalStrengthChange = {}));
var notifyOngoingCall;
(function (notifyOngoingCall) {
    notifyOngoingCall.methodName = "notifyOngoingCall";
})(notifyOngoingCall = exports.notifyOngoingCall || (exports.notifyOngoingCall = {}));
/** posted when a user that share this SIM create or update a contact */
var notifyContactCreatedOrUpdated;
(function (notifyContactCreatedOrUpdated) {
    notifyContactCreatedOrUpdated.methodName = "notifyContactCreatedOrUpdated";
})(notifyContactCreatedOrUpdated = exports.notifyContactCreatedOrUpdated || (exports.notifyContactCreatedOrUpdated = {}));
var notifyContactDeleted;
(function (notifyContactDeleted) {
    notifyContactDeleted.methodName = "notifyContactDeleted";
})(notifyContactDeleted = exports.notifyContactDeleted || (exports.notifyContactDeleted = {}));
var notifyDongleOnLan;
(function (notifyDongleOnLan) {
    notifyDongleOnLan.methodName = "notifyDongleOnLan";
})(notifyDongleOnLan = exports.notifyDongleOnLan || (exports.notifyDongleOnLan = {}));
/**
 * posted when the owner of the sim stop sharing the sim with the user
 * or when the user unregister the sim.
 * */
var notifySimPermissionLost;
(function (notifySimPermissionLost) {
    notifySimPermissionLost.methodName = "notifySimPermissionLost";
})(notifySimPermissionLost = exports.notifySimPermissionLost || (exports.notifySimPermissionLost = {}));
var notifySimSharingRequest;
(function (notifySimSharingRequest) {
    notifySimSharingRequest.methodName = "notifySimSharingRequest";
})(notifySimSharingRequest = exports.notifySimSharingRequest || (exports.notifySimSharingRequest = {}));
var notifySharingRequestResponse;
(function (notifySharingRequestResponse) {
    notifySharingRequestResponse.methodName = "notifySharingRequestResponse";
})(notifySharingRequestResponse = exports.notifySharingRequestResponse || (exports.notifySharingRequestResponse = {}));
var notifyOtherSimUserUnregisteredSim;
(function (notifyOtherSimUserUnregisteredSim) {
    notifyOtherSimUserUnregisteredSim.methodName = "notifyOtherSimUserUnregisteredSim";
})(notifyOtherSimUserUnregisteredSim = exports.notifyOtherSimUserUnregisteredSim || (exports.notifyOtherSimUserUnregisteredSim = {}));
var notifyLoggedFromOtherTab;
(function (notifyLoggedFromOtherTab) {
    notifyLoggedFromOtherTab.methodName = "notifyLoggedFromOtherTab";
})(notifyLoggedFromOtherTab = exports.notifyLoggedFromOtherTab || (exports.notifyLoggedFromOtherTab = {}));
var notifyIceServer;
(function (notifyIceServer) {
    notifyIceServer.methodName = "notifyIceServer";
})(notifyIceServer = exports.notifyIceServer || (exports.notifyIceServer = {}));

},{}],45:[function(require,module,exports){
"use strict";
//TODO: Assert jQuery bootstrap and bootbox loaded on the page.
Object.defineProperty(exports, "__esModule", { value: true });
var modal_stack = require("./modal_stack");
var currentLoading = undefined;
var currentModal = undefined;
var restoreLoading = undefined;
function dismissLoading() {
    if (currentLoading) {
        currentLoading.stop();
        currentLoading = undefined;
    }
    if (restoreLoading) {
        restoreLoading = undefined;
    }
}
exports.dismissLoading = dismissLoading;
function loading(message, delayBeforeShow) {
    if (delayBeforeShow === void 0) { delayBeforeShow = 700; }
    if (currentModal) {
        restoreLoading = function () { return loading(message, delayBeforeShow); };
        return;
    }
    if (currentLoading) {
        delayBeforeShow = 0;
    }
    dismissLoading();
    var modal = undefined;
    var timer = setTimeout(function () {
        var options = {
            "message": [
                '<p class="text-center">',
                '<i class="fa fa-spin fa-spinner"></i>&nbsp;&nbsp;',
                "<span class=\"" + loading.spanClass + "\">" + message + "</span>",
                "</p>"
            ].join(""),
            "closeButton": false
        };
        modal = run("dialog", [options], true);
    }, delayBeforeShow);
    currentLoading = {
        "stop": function () { return modal ? modal.modal("hide") : clearTimeout(timer); },
        message: message,
        delayBeforeShow: delayBeforeShow
    };
}
exports.loading = loading;
(function (loading) {
    loading.spanClass = "loading_message";
})(loading = exports.loading || (exports.loading = {}));
function run(method, args, isLoading) {
    if (isLoading === void 0) { isLoading = false; }
    if (!isLoading && currentModal) {
        currentModal.modal("hide");
        return run(method, args, false);
    }
    if (!isLoading && currentLoading) {
        var message_1 = currentLoading.message;
        var delayBeforeShow_1 = currentLoading.delayBeforeShow;
        dismissLoading();
        restoreLoading = function () { return loading(message_1, delayBeforeShow_1); };
    }
    var options = typeof args[0] === "string" ? ({
        "message": args[0],
        "callback": args[1]
    }) : args[0];
    if (!("animate" in options)) {
        options.animate = false;
    }
    options.show = false;
    //let modal: JQuery = bootbox[method].apply(bootbox, args);
    var modal = bootbox[method](options);
    modal_stack.add(modal, null).show();
    if (!isLoading) {
        currentModal = modal;
    }
    modal.one("hide.bs.modal", function () {
        if (!isLoading) {
            currentModal = undefined;
        }
    });
    modal.one("hidden.bs.modal", function () {
        if (restoreLoading) {
            restoreLoading();
        }
        modal.data("bs.modal", null);
        modal.remove();
    });
    return modal;
}
function dialog(options) {
    return run("dialog", [options]);
}
exports.dialog = dialog;
function alert() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return run("alert", args);
}
exports.alert = alert;
function prompt(options) {
    return run("prompt", [options]);
}
exports.prompt = prompt;
function confirm(options) {
    return run("confirm", [options]);
}
exports.confirm = confirm;

},{"./modal_stack":46}],46:[function(require,module,exports){
"use strict";
//TODO: Assert jQuery bootstrap loaded on the page.
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var stack = [];
var onHideKey = " __hide_handler__ ";
function add(modal, options) {
    var _this = this;
    //NOTE: null only when called by bootbox_custom.
    if (options !== null) {
        modal.modal(__assign(__assign({}, options), { "show": false }));
    }
    return {
        "show": function () { return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var currentModal_1, prHidden;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (stack.indexOf(modal) >= 0) {
                            resolve();
                            return [2 /*return*/];
                        }
                        stack.push(modal);
                        modal[onHideKey] = function () {
                            var index = stack.indexOf(modal);
                            var wasOnTop = index === stack.length - 1;
                            stack.splice(index, 1);
                            if (wasOnTop && stack.length !== 0) {
                                var modalToRestore_1 = stack[stack.length - 1];
                                modalToRestore_1[" scheduled to be shown "] = true;
                                /*
                                NOTE: To prevent flickering we do not restore
                                the previous modal if an other one is immediately
                                opened ( form with successive bootbox_custom )
                                */
                                setTimeout(function () {
                                    delete modalToRestore_1[" scheduled to be shown "];
                                    if (modalToRestore_1 !== stack[stack.length - 1]) {
                                        return;
                                    }
                                    modalToRestore_1.modal("show");
                                }, 100);
                            }
                        };
                        modal.one("hide.bs.modal", modal[onHideKey]);
                        if (!(stack.length !== 1)) return [3 /*break*/, 2];
                        currentModal_1 = stack[stack.length - 2];
                        if (!!currentModal_1[" scheduled to be shown "]) return [3 /*break*/, 2];
                        currentModal_1.off("hide.bs.modal", undefined, currentModal_1[onHideKey]);
                        prHidden = new Promise(function (resolve) { return currentModal_1.one("hidden.bs.modal", function () { return resolve(); }); });
                        currentModal_1.modal("hide");
                        currentModal_1.one("hide.bs.modal", currentModal_1[onHideKey]);
                        return [4 /*yield*/, prHidden];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        modal.one("shown.bs.modal", function () { return resolve(); });
                        modal.modal("show");
                        return [2 /*return*/];
                }
            });
        }); }); },
        "hide": function () { return new Promise(function (resolve) {
            if (stack.indexOf(modal) < 0) {
                resolve();
                return;
            }
            modal.one("hidden.bs.modal", function () { return resolve(); });
            modal.modal("hide");
        }); }
    };
}
exports.add = add;

},{}],47:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
function overrideWebRTCImplementation(methods) {
    console.log("Using alternative WebRTC implementation !!");
    //NOTE: Polyfills for deprecated RTCSessionDescription constructor.
    window["RTCSessionDescription"] = (function RTCSessionDescription(rtcSessionDescriptionInit) {
        return Object.setPrototypeOf((function () {
            var _a = __read(!!rtcSessionDescriptionInit ?
                [rtcSessionDescriptionInit.sdp || null, rtcSessionDescriptionInit.type || null] :
                [null, null], 2), sdp = _a[0], type = _a[1];
            return { sdp: sdp, type: type };
        })(), {
            "constructor": RTCSessionDescription,
            "toJSON": function toJSON() {
                var _a = this, sdp = _a.sdp, type = _a.type;
                return { sdp: sdp, type: type };
            }
        });
    });
    //NOTE: Polyfills RTCIceCandidate constructor not provided by react-native.
    window["RTCIceCandidate"] = (function RTCIceCandidate(rtcIceCandidateInit) {
        return Object.setPrototypeOf((function () {
            var p = rtcIceCandidateInit;
            var _a = __read(!!p ?
                [p.candidate || null, p.sdpMid || null, p.sdpMLineIndex || null, p.usernameFragment || null] :
                [null, null, null, null], 4), candidate = _a[0], sdpMid = _a[1], sdpMLineIndex = _a[2], usernameFragment = _a[3];
            return Object.defineProperties({ candidate: candidate, sdpMid: sdpMid, sdpMLineIndex: sdpMLineIndex, usernameFragment: usernameFragment }, {
                "component": {
                    "enumerable": true,
                    "get": function () {
                        throw new Error("component not implemented");
                    }
                },
                "foundation": {
                    "enumerable": true,
                    "get": function () {
                        throw new Error("foundation not implemented");
                    }
                },
                "ip": {
                    "enumerable": true,
                    "get": function () {
                        throw new Error("ip not implemented");
                    }
                },
                "port": {
                    "enumerable": true,
                    "get": function () {
                        throw new Error("port not implemented");
                    }
                },
                "priority": {
                    "enumerable": true,
                    "get": function () {
                        throw new Error("priority not implemented");
                    }
                },
                "protocol": {
                    "enumerable": true,
                    "get": function () {
                        throw new Error("protocol not implemented");
                    }
                },
                "relatedAddress": {
                    "enumerable": true,
                    "get": function () {
                        throw new Error("relatedAddress not implemented");
                    }
                },
                "relatedPort": {
                    "enumerable": true,
                    "get": function () {
                        throw new Error("relatedPort not implemented");
                    }
                }
            });
        })(), {
            "constructor": RTCIceCandidate,
            "toJSON": function toJSON() {
                var _a = this, candidate = _a.candidate, sdpMid = _a.sdpMid, sdpMLineIndex = _a.sdpMLineIndex, usernameFragment = _a.usernameFragment;
                return { candidate: candidate, sdpMid: sdpMid, sdpMLineIndex: sdpMLineIndex, usernameFragment: usernameFragment };
            },
        });
    });
    var getCounter = (function () {
        var counter = (function () {
            var min = -2147483000;
            var max = 1147483000;
            return Math.floor(Math.random() * (max - min)) + min;
        })();
        return function () { return counter++; };
    })();
    var evtIcecandidate = new ts_events_extended_1.SyncEvent();
    var evtIceconnectionstatechange = new ts_events_extended_1.SyncEvent();
    var evtSignalingstatechange = new ts_events_extended_1.SyncEvent();
    var evtMethodReturn = new ts_events_extended_1.SyncEvent();
    var refByMediaStream = new WeakMap();
    var getUserMediaProxy = function getUserMedia(mediaStreamConstraints) {
        return __awaiter(this, void 0, void 0, function () {
            var mediaStreamRef, ref_1, mediaStreamProxy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mediaStreamRef = getCounter();
                        ref_1 = getCounter();
                        methods.getUserMedia(mediaStreamRef, JSON.stringify(mediaStreamConstraints), ref_1);
                        return [4 /*yield*/, evtMethodReturn.waitFor(function (_a) {
                                var callRef = _a.callRef;
                                return callRef === ref_1;
                            })];
                    case 1:
                        _a.sent();
                        mediaStreamProxy = Object.setPrototypeOf({
                            "getTracks": function () { return [
                                ({
                                    "stop": function () { return methods.stopMediaStreamTrack(mediaStreamRef); }
                                })
                            ]; }
                        }, { "constructor": function MediaStream() { } });
                        refByMediaStream.set(mediaStreamProxy, mediaStreamRef);
                        return [2 /*return*/, mediaStreamProxy];
                }
            });
        });
    };
    var RTCPeerConnectionProxy = function RTCPeerConnection(rtcConfiguration) {
        var e_1, _a;
        var _this = this;
        var rtcPeerConnectionRef = getCounter();
        methods.createRTCPeerConnection(rtcPeerConnectionRef, JSON.stringify(rtcConfiguration));
        var properties = {
            //WARNING: Never updated, I guess in our implementation it's ok...
            "iceGatheringState": "new",
            "iceConnectionState": "new",
            "localDescription": null,
            "signalingState": "stable"
        };
        evtIceconnectionstatechange.attach(function (_a) {
            var ref = _a.rtcPeerConnectionRef;
            return ref === rtcPeerConnectionRef;
        }, function (_a) {
            var iceConnectionState = _a.iceConnectionState;
            return properties.iceConnectionState = iceConnectionState;
        });
        evtSignalingstatechange.attach(function (_a) {
            var ref = _a.rtcPeerConnectionRef;
            return ref === rtcPeerConnectionRef;
        }, function (_a) {
            var rtcSignalingState = _a.rtcSignalingState;
            return properties.signalingState = rtcSignalingState;
        });
        evtIcecandidate.attach(function (_a) {
            var ref = _a.rtcPeerConnectionRef;
            return ref === rtcPeerConnectionRef;
        }, function (_a) {
            var localDescriptionRTCSessionDescriptionInitOrNullJson = _a.localDescriptionRTCSessionDescriptionInitOrNullJson;
            return properties.localDescription = (function () {
                var localDescriptionRTCSessionDescriptionInitOrNull = JSON.parse(localDescriptionRTCSessionDescriptionInitOrNullJson);
                return localDescriptionRTCSessionDescriptionInitOrNull !== null ?
                    new RTCSessionDescription(localDescriptionRTCSessionDescriptionInitOrNull) : null;
            })();
        });
        var rtcPeerConnectionProxy = __assign(__assign({ "createAnswer": function (_options) { return __awaiter(_this, void 0, void 0, function () {
                var ref, rtcSessionDescriptionInitJson;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ref = getCounter();
                            methods.createAnswerForRTCPeerConnection(rtcPeerConnectionRef, ref);
                            return [4 /*yield*/, evtMethodReturn.waitFor(function (_a) {
                                    var callRef = _a.callRef;
                                    return callRef === ref;
                                })];
                        case 1:
                            rtcSessionDescriptionInitJson = (_a.sent()).out;
                            //NOTE: We could just JSON.parse, as the return type is *Init
                            return [2 /*return*/, new RTCSessionDescription(JSON.parse(rtcSessionDescriptionInitJson))];
                    }
                });
            }); }, "createOffer": function (_options) { return __awaiter(_this, void 0, void 0, function () {
                var ref, rtcSessionDescriptionInitJson;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ref = getCounter();
                            methods.createOfferForRTCPeerConnection(rtcPeerConnectionRef, ref);
                            return [4 /*yield*/, evtMethodReturn.waitFor(function (_a) {
                                    var callRef = _a.callRef;
                                    return callRef === ref;
                                })];
                        case 1:
                            rtcSessionDescriptionInitJson = (_a.sent()).out;
                            //NOTE: We could just JSON.parse, as the return type is *Init
                            return [2 /*return*/, new RTCSessionDescription(JSON.parse(rtcSessionDescriptionInitJson))];
                    }
                });
            }); }, "setLocalDescription": function (rtcSessionDescriptionInit) { return __awaiter(_this, void 0, void 0, function () {
                var ref;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            properties.localDescription = new RTCSessionDescription(rtcSessionDescriptionInit);
                            ref = getCounter();
                            methods.setLocalDescriptionOfRTCPeerConnection(rtcPeerConnectionRef, JSON.stringify(rtcSessionDescriptionInit), ref);
                            return [4 /*yield*/, evtMethodReturn.waitFor(function (_a) {
                                    var callRef = _a.callRef;
                                    return callRef === ref;
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); }, "setRemoteDescription": function (rtcSessionDescriptionInit) { return __awaiter(_this, void 0, void 0, function () {
                var ref;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ref = getCounter();
                            methods.setRemoteDescriptionOfRTCPeerConnection(rtcPeerConnectionRef, JSON.stringify(rtcSessionDescriptionInit), ref);
                            return [4 /*yield*/, evtMethodReturn.waitFor(function (_a) {
                                    var callRef = _a.callRef;
                                    return callRef === ref;
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); } }, (function () {
            var boundToByListener = new WeakMap();
            var addEventListener = function (type, listener) {
                var boundTo = {};
                boundToByListener.set(listener, boundTo);
                switch (type) {
                    case "iceconnectionstatechange":
                        evtIceconnectionstatechange.attach(function (_a) {
                            var ref = _a.rtcPeerConnectionRef;
                            return ref === rtcPeerConnectionRef;
                        }, boundTo, function () { return listener.call(rtcPeerConnectionProxy, undefined); });
                        return;
                        ;
                    case "icecandidate":
                        evtIcecandidate.attach(function (_a) {
                            var ref = _a.rtcPeerConnectionRef;
                            return ref === rtcPeerConnectionRef;
                        }, boundTo, function (_a) {
                            var rtcIceCandidateInitOrNullJson = _a.rtcIceCandidateInitOrNullJson;
                            return listener.call(rtcPeerConnectionProxy, {
                                "candidate": (function () {
                                    var rtcIceCandidateInitOrNull = JSON.parse(rtcIceCandidateInitOrNullJson);
                                    return rtcIceCandidateInitOrNull !== null ? new RTCIceCandidate(rtcIceCandidateInitOrNull) : null;
                                })()
                            });
                        });
                        return;
                    case "track":
                        //NOTE: Swallow the event, JsSip does not listen to this event, track attached by remote.
                        return;
                }
                throw Error("no handler for event " + type);
            };
            var removeEventListener = function (type, listener) {
                var evt = (function () {
                    switch (type) {
                        case "iceconnectionstatechange": return evtIceconnectionstatechange;
                        case "icecandidate": return evtIcecandidate;
                        default: return undefined;
                    }
                })();
                if (evt === undefined) {
                    return;
                }
                evt
                    .getHandlers()
                    .find(function (_a) {
                    var boundTo = _a.boundTo;
                    return boundTo === boundToByListener.get(listener);
                })
                    .detach();
            };
            return { addEventListener: addEventListener, removeEventListener: removeEventListener };
        })()), { "addStream": function (mediaStream) { return methods.addStreamToRTCPeerConnection(rtcPeerConnectionRef, refByMediaStream.get(mediaStream)); }, "close": function () { return methods.closeRTCPeerConnection(rtcPeerConnectionRef); } });
        var _loop_1 = function (propertyName) {
            Object.defineProperty(rtcPeerConnectionProxy, propertyName, {
                "get": function () { return properties[propertyName]; },
                "enumerable": true,
                "configurable": true
            });
        };
        try {
            for (var _b = __values(Object.keys(properties)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var propertyName = _c.value;
                _loop_1(propertyName);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return Object.setPrototypeOf(rtcPeerConnectionProxy, { "constructor": RTCPeerConnection });
    };
    //NOTE: For react-native
    if (!navigator.mediaDevices) {
        navigator.mediaDevices = {};
    }
    navigator.mediaDevices.getUserMedia = getUserMediaProxy;
    window["RTCPeerConnection"] = RTCPeerConnectionProxy;
    return {
        "onIcecandidate": function (rtcPeerConnectionRef, rtcIceCandidateInitOrNullJson, localDescriptionRTCSessionDescriptionInitOrNullJson) { return evtIcecandidate.post({
            rtcPeerConnectionRef: rtcPeerConnectionRef,
            rtcIceCandidateInitOrNullJson: rtcIceCandidateInitOrNullJson,
            localDescriptionRTCSessionDescriptionInitOrNullJson: localDescriptionRTCSessionDescriptionInitOrNullJson
        }); },
        "onIceconnectionstatechange": function (rtcPeerConnectionRef, iceConnectionState) { return evtIceconnectionstatechange.post({
            rtcPeerConnectionRef: rtcPeerConnectionRef,
            iceConnectionState: iceConnectionState
        }); },
        "onSignalingstatechange": function (rtcPeerConnectionRef, rtcSignalingState) { return evtSignalingstatechange.post({
            rtcPeerConnectionRef: rtcPeerConnectionRef,
            rtcSignalingState: rtcSignalingState
        }); },
        "onMethodReturn": function (callRef, out) { return evtMethodReturn.post({ callRef: callRef, out: out }); }
    };
}
exports.overrideWebRTCImplementation = overrideWebRTCImplementation;
function testOverrideWebRTCImplementation() {
    var RTCPeerConnectionBackup = RTCPeerConnection;
    var getUserMediaBackup = navigator.mediaDevices.getUserMedia;
    var mediaStreamByRef = new Map();
    var rtcPeerConnectionByRef = new Map();
    var listeners = overrideWebRTCImplementation(__assign(__assign({ "getUserMedia": function (mediaStreamRef, mediaStreamConstraintsJson, callRef) {
            return getUserMediaBackup(JSON.parse(mediaStreamConstraintsJson)).then(function (mediaStream) {
                mediaStreamByRef.set(mediaStreamRef, mediaStream);
                listeners.onMethodReturn(callRef, undefined);
            });
        }, "createRTCPeerConnection": function (rtcPeerConnectionRef, rtcConfigurationJson) {
            var rtcPeerConnection = new RTCPeerConnectionBackup((function () {
                var rtcConfiguration = JSON.parse(rtcConfigurationJson);
                return rtcConfiguration;
            })());
            rtcPeerConnection.addEventListener("iceconnectionstatechange", function () { return listeners.onIceconnectionstatechange(rtcPeerConnectionRef, rtcPeerConnection.iceConnectionState); });
            rtcPeerConnection.addEventListener("icecandidate", function (rtcPeerConnectionEvent) { return listeners.onIcecandidate(rtcPeerConnectionRef, JSON.stringify(rtcPeerConnectionEvent.candidate), JSON.stringify(rtcPeerConnection.localDescription)); });
            rtcPeerConnection.addEventListener("signalingstatechange", function () { return listeners.onSignalingstatechange(rtcPeerConnectionRef, rtcPeerConnection.signalingState); });
            rtcPeerConnection.addEventListener("track", function (_a) {
                var _b = __read(_a.streams, 1), stream = _b[0];
                var audio = document.createElement("audio");
                audio.autoplay = true;
                audio.srcObject = stream;
            });
            rtcPeerConnectionByRef.set(rtcPeerConnectionRef, rtcPeerConnection);
        }, "addStreamToRTCPeerConnection": function (rtcPeerConnectionRef, mediaStreamRef) {
            return rtcPeerConnectionByRef.get(rtcPeerConnectionRef)["addStream"](mediaStreamByRef.get(mediaStreamRef));
        }, "stopMediaStreamTrack": function (mediaStreamRef) {
            var _a = __read(mediaStreamByRef.get(mediaStreamRef).getTracks(), 1), mediaStreamTrack = _a[0];
            if (mediaStreamTrack === undefined) {
                return;
            }
            mediaStreamTrack.stop();
        } }, (function () {
        var createXForRTCPeerConnection = function (xIs, rtcPeerConnectionRef, callRef) { return rtcPeerConnectionByRef.get(rtcPeerConnectionRef)[xIs === "ANSWER" ? "createAnswer" : "createOffer"]()
            .then(function (rtcSessionDescriptionInit) { return listeners.onMethodReturn(callRef, JSON.stringify(rtcSessionDescriptionInit)); }); };
        var createAnswerForRTCPeerConnection = function (rtcPeerConnectionRef, callRef) { return createXForRTCPeerConnection("ANSWER", rtcPeerConnectionRef, callRef); };
        var createOfferForRTCPeerConnection = function (rtcPeerConnectionRef, callRef) { return createXForRTCPeerConnection("OFFER", rtcPeerConnectionRef, callRef); };
        return { createAnswerForRTCPeerConnection: createAnswerForRTCPeerConnection, createOfferForRTCPeerConnection: createOfferForRTCPeerConnection };
    })()), { "setLocalDescriptionOfRTCPeerConnection": function (rtcPeerConnectionRef, rtcSessionDescriptionInitJson, callRef) {
            return rtcPeerConnectionByRef.get(rtcPeerConnectionRef)
                .setLocalDescription(JSON.parse(rtcSessionDescriptionInitJson))
                .then(function () { return listeners.onMethodReturn(callRef, undefined); });
        }, "setRemoteDescriptionOfRTCPeerConnection": function (rtcPeerConnectionRef, rtcSessionDescriptionInitJson, callRef) {
            return rtcPeerConnectionByRef.get(rtcPeerConnectionRef)
                .setRemoteDescription(JSON.parse(rtcSessionDescriptionInitJson))
                .then(function () { return listeners.onMethodReturn(callRef, undefined); });
        }, "closeRTCPeerConnection": function (rtcPeerConnectionRef) {
            return rtcPeerConnectionByRef.get(rtcPeerConnectionRef)
                .close();
        } }));
}
exports.testOverrideWebRTCImplementation = testOverrideWebRTCImplementation;

},{"ts-events-extended":89}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function buildUrl(urlPath, params) {
    return urlPath + "?" + Object.keys(params)
        .filter(function (key) { return params[key] !== undefined; })
        .map(function (key) { return key + "=" + encodeURIComponent(params[key]); })
        .join("&");
}
exports.buildUrl = buildUrl;
function parseUrl(url) {
    if (url === void 0) { url = location.href; }
    var sPageURL = url.split("?")[1];
    if (sPageURL === undefined) {
        return {};
    }
    var sURLVariables = sPageURL.split("&");
    var out = {};
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split("=");
        out[sParameterName[0]] = decodeURIComponent(sParameterName[1]);
    }
    return out;
}
exports.parseUrl = parseUrl;

},{}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var registerUser;
(function (registerUser) {
    registerUser.methodName = "register-user";
})(registerUser = exports.registerUser || (exports.registerUser = {}));
var validateEmail;
(function (validateEmail) {
    validateEmail.methodName = "validate-email";
})(validateEmail = exports.validateEmail || (exports.validateEmail = {}));
var loginUser;
(function (loginUser) {
    loginUser.methodName = "login-user";
})(loginUser = exports.loginUser || (exports.loginUser = {}));
var isUserLoggedIn;
(function (isUserLoggedIn) {
    isUserLoggedIn.methodName = "isUserLoggedIn";
})(isUserLoggedIn = exports.isUserLoggedIn || (exports.isUserLoggedIn = {}));
var declareUa;
(function (declareUa) {
    declareUa.methodName = "declareUa";
})(declareUa = exports.declareUa || (exports.declareUa = {}));
var logoutUser;
(function (logoutUser) {
    logoutUser.methodName = "logout-user";
})(logoutUser = exports.logoutUser || (exports.logoutUser = {}));
var sendRenewPasswordEmail;
(function (sendRenewPasswordEmail) {
    sendRenewPasswordEmail.methodName = "send-renew-password-email";
})(sendRenewPasswordEmail = exports.sendRenewPasswordEmail || (exports.sendRenewPasswordEmail = {}));
var renewPassword;
(function (renewPassword) {
    renewPassword.methodName = "renew-password";
})(renewPassword = exports.renewPassword || (exports.renewPassword = {}));
var getCountryIso;
(function (getCountryIso) {
    getCountryIso.methodName = "guess-country-iso";
})(getCountryIso = exports.getCountryIso || (exports.getCountryIso = {}));
var getChangesRates;
(function (getChangesRates) {
    getChangesRates.methodName = "get-changes-rates";
})(getChangesRates = exports.getChangesRates || (exports.getChangesRates = {}));
var getSubscriptionInfos;
(function (getSubscriptionInfos) {
    getSubscriptionInfos.methodName = "get-subscription-infos";
})(getSubscriptionInfos = exports.getSubscriptionInfos || (exports.getSubscriptionInfos = {}));
var subscribeOrUpdateSource;
(function (subscribeOrUpdateSource) {
    subscribeOrUpdateSource.methodName = "subscribe-or-update-source";
})(subscribeOrUpdateSource = exports.subscribeOrUpdateSource || (exports.subscribeOrUpdateSource = {}));
var unsubscribe;
(function (unsubscribe) {
    unsubscribe.methodName = "unsubscribe";
})(unsubscribe = exports.unsubscribe || (exports.unsubscribe = {}));
var createStripeCheckoutSessionForShop;
(function (createStripeCheckoutSessionForShop) {
    createStripeCheckoutSessionForShop.methodName = "create-stripe-checkout-session-for-shop";
})(createStripeCheckoutSessionForShop = exports.createStripeCheckoutSessionForShop || (exports.createStripeCheckoutSessionForShop = {}));
var createStripeCheckoutSessionForSubscription;
(function (createStripeCheckoutSessionForSubscription) {
    createStripeCheckoutSessionForSubscription.methodName = "create-stripe-checkout-session-for-subscription";
})(createStripeCheckoutSessionForSubscription = exports.createStripeCheckoutSessionForSubscription || (exports.createStripeCheckoutSessionForSubscription = {}));
var getOrders;
(function (getOrders) {
    getOrders.methodName = "get-orders";
})(getOrders = exports.getOrders || (exports.getOrders = {}));

},{}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Dongle;
(function (Dongle) {
    var Locked;
    (function (Locked) {
        function match(dongle) {
            return dongle.sim.pinState !== undefined;
        }
        Locked.match = match;
    })(Locked = Dongle.Locked || (Dongle.Locked = {}));
    var Usable;
    (function (Usable) {
        function match(dongle) {
            return !Locked.match(dongle);
        }
        Usable.match = match;
    })(Usable = Dongle.Usable || (Dongle.Usable = {}));
})(Dongle = exports.Dongle || (exports.Dongle = {}));

},{}],51:[function(require,module,exports){
/*

The MIT License (MIT)

Original Library
  - Copyright (c) Marak Squires

Additional functionality
 - Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var colors = {};
module['exports'] = colors;

colors.themes = {};

var util = require('util');
var ansiStyles = colors.styles = require('./styles');
var defineProps = Object.defineProperties;
var newLineRegex = new RegExp(/[\r\n]+/g);

colors.supportsColor = require('./system/supports-colors').supportsColor;

if (typeof colors.enabled === 'undefined') {
  colors.enabled = colors.supportsColor() !== false;
}

colors.enable = function() {
  colors.enabled = true;
};

colors.disable = function() {
  colors.enabled = false;
};

colors.stripColors = colors.strip = function(str) {
  return ('' + str).replace(/\x1B\[\d+m/g, '');
};

// eslint-disable-next-line no-unused-vars
var stylize = colors.stylize = function stylize(str, style) {
  if (!colors.enabled) {
    return str+'';
  }

  var styleMap = ansiStyles[style];

  // Stylize should work for non-ANSI styles, too
  if(!styleMap && style in colors){
    // Style maps like trap operate as functions on strings;
    // they don't have properties like open or close.
    return colors[style](str);
  }

  return styleMap.open + str + styleMap.close;
};

var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
var escapeStringRegexp = function(str) {
  if (typeof str !== 'string') {
    throw new TypeError('Expected a string');
  }
  return str.replace(matchOperatorsRe, '\\$&');
};

function build(_styles) {
  var builder = function builder() {
    return applyStyle.apply(builder, arguments);
  };
  builder._styles = _styles;
  // __proto__ is used because we must return a function, but there is
  // no way to create a function with a different prototype.
  builder.__proto__ = proto;
  return builder;
}

var styles = (function() {
  var ret = {};
  ansiStyles.grey = ansiStyles.gray;
  Object.keys(ansiStyles).forEach(function(key) {
    ansiStyles[key].closeRe =
      new RegExp(escapeStringRegexp(ansiStyles[key].close), 'g');
    ret[key] = {
      get: function() {
        return build(this._styles.concat(key));
      },
    };
  });
  return ret;
})();

var proto = defineProps(function colors() {}, styles);

function applyStyle() {
  var args = Array.prototype.slice.call(arguments);

  var str = args.map(function(arg) {
    // Use weak equality check so we can colorize null/undefined in safe mode
    if (arg != null && arg.constructor === String) {
      return arg;
    } else {
      return util.inspect(arg);
    }
  }).join(' ');

  if (!colors.enabled || !str) {
    return str;
  }

  var newLinesPresent = str.indexOf('\n') != -1;

  var nestedStyles = this._styles;

  var i = nestedStyles.length;
  while (i--) {
    var code = ansiStyles[nestedStyles[i]];
    str = code.open + str.replace(code.closeRe, code.open) + code.close;
    if (newLinesPresent) {
      str = str.replace(newLineRegex, function(match) {
        return code.close + match + code.open;
      });
    }
  }

  return str;
}

colors.setTheme = function(theme) {
  if (typeof theme === 'string') {
    console.log('colors.setTheme now only accepts an object, not a string.  ' +
      'If you are trying to set a theme from a file, it is now your (the ' +
      'caller\'s) responsibility to require the file.  The old syntax ' +
      'looked like colors.setTheme(__dirname + ' +
      '\'/../themes/generic-logging.js\'); The new syntax looks like '+
      'colors.setTheme(require(__dirname + ' +
      '\'/../themes/generic-logging.js\'));');
    return;
  }
  for (var style in theme) {
    (function(style) {
      colors[style] = function(str) {
        if (typeof theme[style] === 'object') {
          var out = str;
          for (var i in theme[style]) {
            out = colors[theme[style][i]](out);
          }
          return out;
        }
        return colors[theme[style]](str);
      };
    })(style);
  }
};

function init() {
  var ret = {};
  Object.keys(styles).forEach(function(name) {
    ret[name] = {
      get: function() {
        return build([name]);
      },
    };
  });
  return ret;
}

var sequencer = function sequencer(map, str) {
  var exploded = str.split('');
  exploded = exploded.map(map);
  return exploded.join('');
};

// custom formatter methods
colors.trap = require('./custom/trap');
colors.zalgo = require('./custom/zalgo');

// maps
colors.maps = {};
colors.maps.america = require('./maps/america')(colors);
colors.maps.zebra = require('./maps/zebra')(colors);
colors.maps.rainbow = require('./maps/rainbow')(colors);
colors.maps.random = require('./maps/random')(colors);

for (var map in colors.maps) {
  (function(map) {
    colors[map] = function(str) {
      return sequencer(colors.maps[map], str);
    };
  })(map);
}

defineProps(colors, init());

},{"./custom/trap":52,"./custom/zalgo":53,"./maps/america":56,"./maps/rainbow":57,"./maps/random":58,"./maps/zebra":59,"./styles":60,"./system/supports-colors":62,"util":9}],52:[function(require,module,exports){
module['exports'] = function runTheTrap(text, options) {
  var result = '';
  text = text || 'Run the trap, drop the bass';
  text = text.split('');
  var trap = {
    a: ['\u0040', '\u0104', '\u023a', '\u0245', '\u0394', '\u039b', '\u0414'],
    b: ['\u00df', '\u0181', '\u0243', '\u026e', '\u03b2', '\u0e3f'],
    c: ['\u00a9', '\u023b', '\u03fe'],
    d: ['\u00d0', '\u018a', '\u0500', '\u0501', '\u0502', '\u0503'],
    e: ['\u00cb', '\u0115', '\u018e', '\u0258', '\u03a3', '\u03be', '\u04bc',
      '\u0a6c'],
    f: ['\u04fa'],
    g: ['\u0262'],
    h: ['\u0126', '\u0195', '\u04a2', '\u04ba', '\u04c7', '\u050a'],
    i: ['\u0f0f'],
    j: ['\u0134'],
    k: ['\u0138', '\u04a0', '\u04c3', '\u051e'],
    l: ['\u0139'],
    m: ['\u028d', '\u04cd', '\u04ce', '\u0520', '\u0521', '\u0d69'],
    n: ['\u00d1', '\u014b', '\u019d', '\u0376', '\u03a0', '\u048a'],
    o: ['\u00d8', '\u00f5', '\u00f8', '\u01fe', '\u0298', '\u047a', '\u05dd',
      '\u06dd', '\u0e4f'],
    p: ['\u01f7', '\u048e'],
    q: ['\u09cd'],
    r: ['\u00ae', '\u01a6', '\u0210', '\u024c', '\u0280', '\u042f'],
    s: ['\u00a7', '\u03de', '\u03df', '\u03e8'],
    t: ['\u0141', '\u0166', '\u0373'],
    u: ['\u01b1', '\u054d'],
    v: ['\u05d8'],
    w: ['\u0428', '\u0460', '\u047c', '\u0d70'],
    x: ['\u04b2', '\u04fe', '\u04fc', '\u04fd'],
    y: ['\u00a5', '\u04b0', '\u04cb'],
    z: ['\u01b5', '\u0240'],
  };
  text.forEach(function(c) {
    c = c.toLowerCase();
    var chars = trap[c] || [' '];
    var rand = Math.floor(Math.random() * chars.length);
    if (typeof trap[c] !== 'undefined') {
      result += trap[c][rand];
    } else {
      result += c;
    }
  });
  return result;
};

},{}],53:[function(require,module,exports){
// please no
module['exports'] = function zalgo(text, options) {
  text = text || '   he is here   ';
  var soul = {
    'up': [
      '̍', '̎', '̄', '̅',
      '̿', '̑', '̆', '̐',
      '͒', '͗', '͑', '̇',
      '̈', '̊', '͂', '̓',
      '̈', '͊', '͋', '͌',
      '̃', '̂', '̌', '͐',
      '̀', '́', '̋', '̏',
      '̒', '̓', '̔', '̽',
      '̉', 'ͣ', 'ͤ', 'ͥ',
      'ͦ', 'ͧ', 'ͨ', 'ͩ',
      'ͪ', 'ͫ', 'ͬ', 'ͭ',
      'ͮ', 'ͯ', '̾', '͛',
      '͆', '̚',
    ],
    'down': [
      '̖', '̗', '̘', '̙',
      '̜', '̝', '̞', '̟',
      '̠', '̤', '̥', '̦',
      '̩', '̪', '̫', '̬',
      '̭', '̮', '̯', '̰',
      '̱', '̲', '̳', '̹',
      '̺', '̻', '̼', 'ͅ',
      '͇', '͈', '͉', '͍',
      '͎', '͓', '͔', '͕',
      '͖', '͙', '͚', '̣',
    ],
    'mid': [
      '̕', '̛', '̀', '́',
      '͘', '̡', '̢', '̧',
      '̨', '̴', '̵', '̶',
      '͜', '͝', '͞',
      '͟', '͠', '͢', '̸',
      '̷', '͡', ' ҉',
    ],
  };
  var all = [].concat(soul.up, soul.down, soul.mid);

  function randomNumber(range) {
    var r = Math.floor(Math.random() * range);
    return r;
  }

  function isChar(character) {
    var bool = false;
    all.filter(function(i) {
      bool = (i === character);
    });
    return bool;
  }


  function heComes(text, options) {
    var result = '';
    var counts;
    var l;
    options = options || {};
    options['up'] =
      typeof options['up'] !== 'undefined' ? options['up'] : true;
    options['mid'] =
      typeof options['mid'] !== 'undefined' ? options['mid'] : true;
    options['down'] =
      typeof options['down'] !== 'undefined' ? options['down'] : true;
    options['size'] =
      typeof options['size'] !== 'undefined' ? options['size'] : 'maxi';
    text = text.split('');
    for (l in text) {
      if (isChar(l)) {
        continue;
      }
      result = result + text[l];
      counts = {'up': 0, 'down': 0, 'mid': 0};
      switch (options.size) {
        case 'mini':
          counts.up = randomNumber(8);
          counts.mid = randomNumber(2);
          counts.down = randomNumber(8);
          break;
        case 'maxi':
          counts.up = randomNumber(16) + 3;
          counts.mid = randomNumber(4) + 1;
          counts.down = randomNumber(64) + 3;
          break;
        default:
          counts.up = randomNumber(8) + 1;
          counts.mid = randomNumber(6) / 2;
          counts.down = randomNumber(8) + 1;
          break;
      }

      var arr = ['up', 'mid', 'down'];
      for (var d in arr) {
        var index = arr[d];
        for (var i = 0; i <= counts[index]; i++) {
          if (options[index]) {
            result = result + soul[index][randomNumber(soul[index].length)];
          }
        }
      }
    }
    return result;
  }
  // don't summon him
  return heComes(text, options);
};


},{}],54:[function(require,module,exports){
var colors = require('./colors');

module['exports'] = function() {
  //
  // Extends prototype of native string object to allow for "foo".red syntax
  //
  var addProperty = function(color, func) {
    String.prototype.__defineGetter__(color, func);
  };

  addProperty('strip', function() {
    return colors.strip(this);
  });

  addProperty('stripColors', function() {
    return colors.strip(this);
  });

  addProperty('trap', function() {
    return colors.trap(this);
  });

  addProperty('zalgo', function() {
    return colors.zalgo(this);
  });

  addProperty('zebra', function() {
    return colors.zebra(this);
  });

  addProperty('rainbow', function() {
    return colors.rainbow(this);
  });

  addProperty('random', function() {
    return colors.random(this);
  });

  addProperty('america', function() {
    return colors.america(this);
  });

  //
  // Iterate through all default styles and colors
  //
  var x = Object.keys(colors.styles);
  x.forEach(function(style) {
    addProperty(style, function() {
      return colors.stylize(this, style);
    });
  });

  function applyTheme(theme) {
    //
    // Remark: This is a list of methods that exist
    // on String that you should not overwrite.
    //
    var stringPrototypeBlacklist = [
      '__defineGetter__', '__defineSetter__', '__lookupGetter__',
      '__lookupSetter__', 'charAt', 'constructor', 'hasOwnProperty',
      'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString',
      'valueOf', 'charCodeAt', 'indexOf', 'lastIndexOf', 'length',
      'localeCompare', 'match', 'repeat', 'replace', 'search', 'slice',
      'split', 'substring', 'toLocaleLowerCase', 'toLocaleUpperCase',
      'toLowerCase', 'toUpperCase', 'trim', 'trimLeft', 'trimRight',
    ];

    Object.keys(theme).forEach(function(prop) {
      if (stringPrototypeBlacklist.indexOf(prop) !== -1) {
        console.log('warn: '.red + ('String.prototype' + prop).magenta +
          ' is probably something you don\'t want to override.  ' +
          'Ignoring style name');
      } else {
        if (typeof(theme[prop]) === 'string') {
          colors[prop] = colors[theme[prop]];
          addProperty(prop, function() {
            return colors[prop](this);
          });
        } else {
          var themePropApplicator = function(str) {
            var ret = str || this;
            for (var t = 0; t < theme[prop].length; t++) {
              ret = colors[theme[prop][t]](ret);
            }
            return ret;
          };
          addProperty(prop, themePropApplicator);
          colors[prop] = function(str) {
            return themePropApplicator(str);
          };
        }
      }
    });
  }

  colors.setTheme = function(theme) {
    if (typeof theme === 'string') {
      console.log('colors.setTheme now only accepts an object, not a string. ' +
        'If you are trying to set a theme from a file, it is now your (the ' +
        'caller\'s) responsibility to require the file.  The old syntax ' +
        'looked like colors.setTheme(__dirname + ' +
        '\'/../themes/generic-logging.js\'); The new syntax looks like '+
        'colors.setTheme(require(__dirname + ' +
        '\'/../themes/generic-logging.js\'));');
      return;
    } else {
      applyTheme(theme);
    }
  };
};

},{"./colors":51}],55:[function(require,module,exports){
var colors = require('./colors');
module['exports'] = colors;

// Remark: By default, colors will add style properties to String.prototype.
//
// If you don't wish to extend String.prototype, you can do this instead and
// native String will not be touched:
//
//   var colors = require('colors/safe);
//   colors.red("foo")
//
//
require('./extendStringPrototype')();

},{"./colors":51,"./extendStringPrototype":54}],56:[function(require,module,exports){
module['exports'] = function(colors) {
  return function(letter, i, exploded) {
    if (letter === ' ') return letter;
    switch (i%3) {
      case 0: return colors.red(letter);
      case 1: return colors.white(letter);
      case 2: return colors.blue(letter);
    }
  };
};

},{}],57:[function(require,module,exports){
module['exports'] = function(colors) {
  // RoY G BiV
  var rainbowColors = ['red', 'yellow', 'green', 'blue', 'magenta'];
  return function(letter, i, exploded) {
    if (letter === ' ') {
      return letter;
    } else {
      return colors[rainbowColors[i++ % rainbowColors.length]](letter);
    }
  };
};


},{}],58:[function(require,module,exports){
module['exports'] = function(colors) {
  var available = ['underline', 'inverse', 'grey', 'yellow', 'red', 'green',
    'blue', 'white', 'cyan', 'magenta', 'brightYellow', 'brightRed',
    'brightGreen', 'brightBlue', 'brightWhite', 'brightCyan', 'brightMagenta'];
  return function(letter, i, exploded) {
    return letter === ' ' ? letter :
      colors[
          available[Math.round(Math.random() * (available.length - 2))]
      ](letter);
  };
};

},{}],59:[function(require,module,exports){
module['exports'] = function(colors) {
  return function(letter, i, exploded) {
    return i % 2 === 0 ? letter : colors.inverse(letter);
  };
};

},{}],60:[function(require,module,exports){
/*
The MIT License (MIT)

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var styles = {};
module['exports'] = styles;

var codes = {
  reset: [0, 0],

  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],

  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
  grey: [90, 39],

  brightRed: [91, 39],
  brightGreen: [92, 39],
  brightYellow: [93, 39],
  brightBlue: [94, 39],
  brightMagenta: [95, 39],
  brightCyan: [96, 39],
  brightWhite: [97, 39],

  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgWhite: [47, 49],
  bgGray: [100, 49],
  bgGrey: [100, 49],

  bgBrightRed: [101, 49],
  bgBrightGreen: [102, 49],
  bgBrightYellow: [103, 49],
  bgBrightBlue: [104, 49],
  bgBrightMagenta: [105, 49],
  bgBrightCyan: [106, 49],
  bgBrightWhite: [107, 49],

  // legacy styles for colors pre v1.0.0
  blackBG: [40, 49],
  redBG: [41, 49],
  greenBG: [42, 49],
  yellowBG: [43, 49],
  blueBG: [44, 49],
  magentaBG: [45, 49],
  cyanBG: [46, 49],
  whiteBG: [47, 49],

};

Object.keys(codes).forEach(function(key) {
  var val = codes[key];
  var style = styles[key] = [];
  style.open = '\u001b[' + val[0] + 'm';
  style.close = '\u001b[' + val[1] + 'm';
});

},{}],61:[function(require,module,exports){
(function (process){
/*
MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

module.exports = function(flag, argv) {
  argv = argv || process.argv;

  var terminatorPos = argv.indexOf('--');
  var prefix = /^-{1,2}/.test(flag) ? '' : '--';
  var pos = argv.indexOf(prefix + flag);

  return pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos);
};

}).call(this,require('_process'))
},{"_process":6}],62:[function(require,module,exports){
(function (process){
/*
The MIT License (MIT)

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

'use strict';

var os = require('os');
var hasFlag = require('./has-flag.js');

var env = process.env;

var forceColor = void 0;
if (hasFlag('no-color') || hasFlag('no-colors') || hasFlag('color=false')) {
  forceColor = false;
} else if (hasFlag('color') || hasFlag('colors') || hasFlag('color=true')
           || hasFlag('color=always')) {
  forceColor = true;
}
if ('FORCE_COLOR' in env) {
  forceColor = env.FORCE_COLOR.length === 0
    || parseInt(env.FORCE_COLOR, 10) !== 0;
}

function translateLevel(level) {
  if (level === 0) {
    return false;
  }

  return {
    level: level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3,
  };
}

function supportsColor(stream) {
  if (forceColor === false) {
    return 0;
  }

  if (hasFlag('color=16m') || hasFlag('color=full')
      || hasFlag('color=truecolor')) {
    return 3;
  }

  if (hasFlag('color=256')) {
    return 2;
  }

  if (stream && !stream.isTTY && forceColor !== true) {
    return 0;
  }

  var min = forceColor ? 1 : 0;

  if (process.platform === 'win32') {
    // Node.js 7.5.0 is the first version of Node.js to include a patch to
    // libuv that enables 256 color output on Windows. Anything earlier and it
    // won't work. However, here we target Node.js 8 at minimum as it is an LTS
    // release, and Node.js 7 is not. Windows 10 build 10586 is the first
    // Windows release that supports 256 colors. Windows 10 build 14931 is the
    // first release that supports 16m/TrueColor.
    var osRelease = os.release().split('.');
    if (Number(process.versions.node.split('.')[0]) >= 8
        && Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }

    return 1;
  }

  if ('CI' in env) {
    if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'].some(function(sign) {
      return sign in env;
    }) || env.CI_NAME === 'codeship') {
      return 1;
    }

    return min;
  }

  if ('TEAMCITY_VERSION' in env) {
    return (/^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0
    );
  }

  if ('TERM_PROGRAM' in env) {
    var version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

    switch (env.TERM_PROGRAM) {
      case 'iTerm.app':
        return version >= 3 ? 3 : 2;
      case 'Hyper':
        return 3;
      case 'Apple_Terminal':
        return 2;
      // No default
    }
  }

  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }

  if (/^screen|^xterm|^vt100|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }

  if ('COLORTERM' in env) {
    return 1;
  }

  if (env.TERM === 'dumb') {
    return min;
  }

  return min;
}

function getSupportLevel(stream) {
  var level = supportsColor(stream);
  return translateLevel(level);
}

module.exports = {
  supportsColor: getSupportLevel,
  stdout: getSupportLevel(process.stdout),
  stderr: getSupportLevel(process.stderr),
};

}).call(this,require('_process'))
},{"./has-flag.js":61,"_process":6,"os":5}],63:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],64:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":63}],65:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":64}],66:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14}],67:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"dup":15}],68:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"./Map":67,"dup":16}],69:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"minimal-polyfills/dist/lib/WeakMap":68}],70:[function(require,module,exports){
// A library of seedable RNGs implemented in Javascript.
//
// Usage:
//
// var seedrandom = require('seedrandom');
// var random = seedrandom(1); // or any seed.
// var x = random();       // 0 <= x < 1.  Every bit is random.
// var x = random.quick(); // 0 <= x < 1.  32 bits of randomness.

// alea, a 53-bit multiply-with-carry generator by Johannes Baagøe.
// Period: ~2^116
// Reported to pass all BigCrush tests.
var alea = require('./lib/alea');

// xor128, a pure xor-shift generator by George Marsaglia.
// Period: 2^128-1.
// Reported to fail: MatrixRank and LinearComp.
var xor128 = require('./lib/xor128');

// xorwow, George Marsaglia's 160-bit xor-shift combined plus weyl.
// Period: 2^192-2^32
// Reported to fail: CollisionOver, SimpPoker, and LinearComp.
var xorwow = require('./lib/xorwow');

// xorshift7, by François Panneton and Pierre L'ecuyer, takes
// a different approach: it adds robustness by allowing more shifts
// than Marsaglia's original three.  It is a 7-shift generator
// with 256 bits, that passes BigCrush with no systmatic failures.
// Period 2^256-1.
// No systematic BigCrush failures reported.
var xorshift7 = require('./lib/xorshift7');

// xor4096, by Richard Brent, is a 4096-bit xor-shift with a
// very long period that also adds a Weyl generator. It also passes
// BigCrush with no systematic failures.  Its long period may
// be useful if you have many generators and need to avoid
// collisions.
// Period: 2^4128-2^32.
// No systematic BigCrush failures reported.
var xor4096 = require('./lib/xor4096');

// Tyche-i, by Samuel Neves and Filipe Araujo, is a bit-shifting random
// number generator derived from ChaCha, a modern stream cipher.
// https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf
// Period: ~2^127
// No systematic BigCrush failures reported.
var tychei = require('./lib/tychei');

// The original ARC4-based prng included in this library.
// Period: ~2^1600
var sr = require('./seedrandom');

sr.alea = alea;
sr.xor128 = xor128;
sr.xorwow = xorwow;
sr.xorshift7 = xorshift7;
sr.xor4096 = xor4096;
sr.tychei = tychei;

module.exports = sr;

},{"./lib/alea":71,"./lib/tychei":72,"./lib/xor128":73,"./lib/xor4096":74,"./lib/xorshift7":75,"./lib/xorwow":76,"./seedrandom":77}],71:[function(require,module,exports){
// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
// Original work is under MIT license -

// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.



(function(global, module, define) {

function Alea(seed) {
  var me = this, mash = Mash();

  me.next = function() {
    var t = 2091639 * me.s0 + me.c * 2.3283064365386963e-10; // 2^-32
    me.s0 = me.s1;
    me.s1 = me.s2;
    return me.s2 = t - (me.c = t | 0);
  };

  // Apply the seeding algorithm from Baagoe.
  me.c = 1;
  me.s0 = mash(' ');
  me.s1 = mash(' ');
  me.s2 = mash(' ');
  me.s0 -= mash(seed);
  if (me.s0 < 0) { me.s0 += 1; }
  me.s1 -= mash(seed);
  if (me.s1 < 0) { me.s1 += 1; }
  me.s2 -= mash(seed);
  if (me.s2 < 0) { me.s2 += 1; }
  mash = null;
}

function copy(f, t) {
  t.c = f.c;
  t.s0 = f.s0;
  t.s1 = f.s1;
  t.s2 = f.s2;
  return t;
}

function impl(seed, opts) {
  var xg = new Alea(seed),
      state = opts && opts.state,
      prng = xg.next;
  prng.int32 = function() { return (xg.next() * 0x100000000) | 0; }
  prng.double = function() {
    return prng() + (prng() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
  };
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = String(data);
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  return mash;
}


if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.alea = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],72:[function(require,module,exports){
// A Javascript implementaion of the "Tyche-i" prng algorithm by
// Samuel Neves and Filipe Araujo.
// See https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var b = me.b, c = me.c, d = me.d, a = me.a;
    b = (b << 25) ^ (b >>> 7) ^ c;
    c = (c - d) | 0;
    d = (d << 24) ^ (d >>> 8) ^ a;
    a = (a - b) | 0;
    me.b = b = (b << 20) ^ (b >>> 12) ^ c;
    me.c = c = (c - d) | 0;
    me.d = (d << 16) ^ (c >>> 16) ^ a;
    return me.a = (a - b) | 0;
  };

  /* The following is non-inverted tyche, which has better internal
   * bit diffusion, but which is about 25% slower than tyche-i in JS.
  me.next = function() {
    var a = me.a, b = me.b, c = me.c, d = me.d;
    a = (me.a + me.b | 0) >>> 0;
    d = me.d ^ a; d = d << 16 ^ d >>> 16;
    c = me.c + d | 0;
    b = me.b ^ c; b = b << 12 ^ d >>> 20;
    me.a = a = a + b | 0;
    d = d ^ a; me.d = d = d << 8 ^ d >>> 24;
    me.c = c = c + d | 0;
    b = b ^ c;
    return me.b = (b << 7 ^ b >>> 25);
  }
  */

  me.a = 0;
  me.b = 0;
  me.c = 2654435769 | 0;
  me.d = 1367130551;

  if (seed === Math.floor(seed)) {
    // Integer seed.
    me.a = (seed / 0x100000000) | 0;
    me.b = seed | 0;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 20; k++) {
    me.b ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.a = f.a;
  t.b = f.b;
  t.c = f.c;
  t.d = f.d;
  return t;
};

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.tychei = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],73:[function(require,module,exports){
// A Javascript implementaion of the "xor128" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;

  // Set up generator function.
  me.next = function() {
    var t = me.x ^ (me.x << 11);
    me.x = me.y;
    me.y = me.z;
    me.z = me.w;
    return me.w ^= (me.w >>> 19) ^ t ^ (t >>> 8);
  };

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor128 = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],74:[function(require,module,exports){
// A Javascript implementaion of Richard Brent's Xorgens xor4096 algorithm.
//
// This fast non-cryptographic random number generator is designed for
// use in Monte-Carlo algorithms. It combines a long-period xorshift
// generator with a Weyl generator, and it passes all common batteries
// of stasticial tests for randomness while consuming only a few nanoseconds
// for each prng generated.  For background on the generator, see Brent's
// paper: "Some long-period random number generators using shifts and xors."
// http://arxiv.org/pdf/1004.3115v1.pdf
//
// Usage:
//
// var xor4096 = require('xor4096');
// random = xor4096(1);                        // Seed with int32 or string.
// assert.equal(random(), 0.1520436450538547); // (0, 1) range, 53 bits.
// assert.equal(random.int32(), 1806534897);   // signed int32, 32 bits.
//
// For nonzero numeric keys, this impelementation provides a sequence
// identical to that by Brent's xorgens 3 implementaion in C.  This
// implementation also provides for initalizing the generator with
// string seeds, or for saving and restoring the state of the generator.
//
// On Chrome, this prng benchmarks about 2.1 times slower than
// Javascript's built-in Math.random().

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    var w = me.w,
        X = me.X, i = me.i, t, v;
    // Update Weyl generator.
    me.w = w = (w + 0x61c88647) | 0;
    // Update xor generator.
    v = X[(i + 34) & 127];
    t = X[i = ((i + 1) & 127)];
    v ^= v << 13;
    t ^= t << 17;
    v ^= v >>> 15;
    t ^= t >>> 12;
    // Update Xor generator array state.
    v = X[i] = v ^ t;
    me.i = i;
    // Result is the combination.
    return (v + (w ^ (w >>> 16))) | 0;
  };

  function init(me, seed) {
    var t, v, i, j, w, X = [], limit = 128;
    if (seed === (seed | 0)) {
      // Numeric seeds initialize v, which is used to generates X.
      v = seed;
      seed = null;
    } else {
      // String seeds are mixed into v and X one character at a time.
      seed = seed + '\0';
      v = 0;
      limit = Math.max(limit, seed.length);
    }
    // Initialize circular array and weyl value.
    for (i = 0, j = -32; j < limit; ++j) {
      // Put the unicode characters into the array, and shuffle them.
      if (seed) v ^= seed.charCodeAt((j + 32) % seed.length);
      // After 32 shuffles, take v as the starting w value.
      if (j === 0) w = v;
      v ^= v << 10;
      v ^= v >>> 15;
      v ^= v << 4;
      v ^= v >>> 13;
      if (j >= 0) {
        w = (w + 0x61c88647) | 0;     // Weyl.
        t = (X[j & 127] ^= (v + w));  // Combine xor and weyl to init array.
        i = (0 == t) ? i + 1 : 0;     // Count zeroes.
      }
    }
    // We have detected all zeroes; make the key nonzero.
    if (i >= 128) {
      X[(seed && seed.length || 0) & 127] = -1;
    }
    // Run the generator 512 times to further mix the state before using it.
    // Factoring this as a function slows the main generator, so it is just
    // unrolled here.  The weyl generator is not advanced while warming up.
    i = 127;
    for (j = 4 * 128; j > 0; --j) {
      v = X[(i + 34) & 127];
      t = X[i = ((i + 1) & 127)];
      v ^= v << 13;
      t ^= t << 17;
      v ^= v >>> 15;
      t ^= t >>> 12;
      X[i] = v ^ t;
    }
    // Storing state as object members is faster than using closure variables.
    me.w = w;
    me.X = X;
    me.i = i;
  }

  init(me, seed);
}

function copy(f, t) {
  t.i = f.i;
  t.w = f.w;
  t.X = f.X.slice();
  return t;
};

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.X) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor4096 = impl;
}

})(
  this,                                     // window object or global
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);

},{}],75:[function(require,module,exports){
// A Javascript implementaion of the "xorshift7" algorithm by
// François Panneton and Pierre L'ecuyer:
// "On the Xorgshift Random Number Generators"
// http://saluc.engr.uconn.edu/refs/crypto/rng/panneton05onthexorshift.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    // Update xor generator.
    var X = me.x, i = me.i, t, v, w;
    t = X[i]; t ^= (t >>> 7); v = t ^ (t << 24);
    t = X[(i + 1) & 7]; v ^= t ^ (t >>> 10);
    t = X[(i + 3) & 7]; v ^= t ^ (t >>> 3);
    t = X[(i + 4) & 7]; v ^= t ^ (t << 7);
    t = X[(i + 7) & 7]; t = t ^ (t << 13); v ^= t ^ (t << 9);
    X[i] = v;
    me.i = (i + 1) & 7;
    return v;
  };

  function init(me, seed) {
    var j, w, X = [];

    if (seed === (seed | 0)) {
      // Seed state array using a 32-bit integer.
      w = X[0] = seed;
    } else {
      // Seed state using a string.
      seed = '' + seed;
      for (j = 0; j < seed.length; ++j) {
        X[j & 7] = (X[j & 7] << 15) ^
            (seed.charCodeAt(j) + X[(j + 1) & 7] << 13);
      }
    }
    // Enforce an array length of 8, not all zeroes.
    while (X.length < 8) X.push(0);
    for (j = 0; j < 8 && X[j] === 0; ++j);
    if (j == 8) w = X[7] = -1; else w = X[j];

    me.x = X;
    me.i = 0;

    // Discard an initial 256 values.
    for (j = 256; j > 0; --j) {
      me.next();
    }
  }

  init(me, seed);
}

function copy(f, t) {
  t.x = f.x.slice();
  t.i = f.i;
  return t;
}

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.x) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xorshift7 = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);


},{}],76:[function(require,module,exports){
// A Javascript implementaion of the "xorwow" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var t = (me.x ^ (me.x >>> 2));
    me.x = me.y; me.y = me.z; me.z = me.w; me.w = me.v;
    return (me.d = (me.d + 362437 | 0)) +
       (me.v = (me.v ^ (me.v << 4)) ^ (t ^ (t << 1))) | 0;
  };

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;
  me.v = 0;

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    if (k == strseed.length) {
      me.d = me.x << 10 ^ me.x >>> 4;
    }
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  t.v = f.v;
  t.d = f.d;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xorwow = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],77:[function(require,module,exports){
/*
Copyright 2019 David Bau.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

(function (global, pool, math) {
//
// The following constants are related to IEEE 754 limits.
//

var width = 256,        // each RC4 output is 0 <= x < 256
    chunks = 6,         // at least six RC4 outputs for each double
    digits = 52,        // there are 52 significant digits in a double
    rngname = 'random', // rngname: name for Math.random and Math.seedrandom
    startdenom = math.pow(width, chunks),
    significance = math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1,
    nodecrypto;         // node.js crypto module, initialized at the bottom.

//
// seedrandom()
// This is the seedrandom function described above.
//
function seedrandom(seed, options, callback) {
  var key = [];
  options = (options == true) ? { entropy: true } : (options || {});

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    options.entropy ? [seed, tostring(pool)] :
    (seed == null) ? autoseed() : seed, 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  var prng = function() {
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };

  prng.int32 = function() { return arc4.g(4) | 0; }
  prng.quick = function() { return arc4.g(4) / 0x100000000; }
  prng.double = prng;

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Calling convention: what to return as a function of prng, seed, is_math.
  return (options.pass || callback ||
      function(prng, seed, is_math_call, state) {
        if (state) {
          // Load the arc4 state from the given state if it has an S array.
          if (state.S) { copy(state, arc4); }
          // Only provide the .state method if requested via options.state.
          prng.state = function() { return copy(arc4, {}); }
        }

        // If called as a method of Math (Math.seedrandom()), mutate
        // Math.random because that is how seedrandom.js has worked since v1.0.
        if (is_math_call) { math[rngname] = prng; return seed; }

        // Otherwise, it is a newer calling convention, so return the
        // prng directly.
        else return prng;
      })(
  prng,
  shortseed,
  'global' in options ? options.global : (this == math),
  options.state);
}

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability, the function call below automatically
    // discards an initial batch of values.  This is called RC4-drop[256].
    // See http://google.com/search?q=rsa+fluhrer+response&btnI
  })(width);
}

//
// copy()
// Copies internal state of ARC4 to or from a plain object.
//
function copy(f, t) {
  t.i = f.i;
  t.j = f.j;
  t.S = f.S.slice();
  return t;
};

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj), prop;
  if (depth && typ == 'object') {
    for (prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
    }
  }
  return (result.length ? result : typ == 'string' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto and Node crypto
// module if available.
//
function autoseed() {
  try {
    var out;
    if (nodecrypto && (out = nodecrypto.randomBytes)) {
      // The use of 'out' to remember randomBytes makes tight minified code.
      out = out(width);
    } else {
      out = new Uint8Array(width);
      (global.crypto || global.msCrypto).getRandomValues(out);
    }
    return tostring(out);
  } catch (e) {
    var browser = global.navigator,
        plugins = browser && browser.plugins;
    return [+new Date, global, plugins, global.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to interfere with deterministic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math.random(), pool);

//
// Nodejs and AMD support: export the implementation as a module using
// either convention.
//
if ((typeof module) == 'object' && module.exports) {
  module.exports = seedrandom;
  // When in node.js, try using crypto package for autoseeding.
  try {
    nodecrypto = require('crypto');
  } catch (ex) {}
} else if ((typeof define) == 'function' && define.amd) {
  define(function() { return seedrandom; });
} else {
  // When included as a plain script, set up Math.seedrandom global.
  math['seed' + rngname] = seedrandom;
}


// End anonymous scope, and pass initial values.
})(
  // global: `self` in browsers (including strict mode and web workers),
  // otherwise `this` in Node and other environments
  (typeof self !== 'undefined') ? self : this,
  [],     // pool: entropy pool starts empty
  Math    // math: package containing random, pow, and seedrandom
);

},{"crypto":2}],78:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],79:[function(require,module,exports){
(function (global){
"use strict";
var has = require('has');

var toString = Object.prototype.toString;
var keys = Object.keys;
var jsonParse = JSON.parse;
var jsonStringify = JSON.stringify;
var identifierFormat = '[a-zA-Z_$][0-9a-zA-Z_$]*';
var identifierPattern = new RegExp('^' + identifierFormat + '$');
var functionPattern = new RegExp(
  '^\\s*function(?:\\s+' + identifierFormat  + ')?\\s*' +
  '\\(\\s*(?:(' + identifierFormat + ')' +
  '((?:\\s*,\\s*' + identifierFormat + ')*)?)?\\s*\\)\\s*' + 
  '\\{([\\s\\S]*)\\}\\s*', 'm');
var nativeFunctionBodyPattern = /^\s\[native\scode\]\s$/;

function isArray(obj) {
  return toString.call(obj) === '[object Array]';
}

function escapeForRegExp(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function isReplaceable(obj) {
  /*jshint -W122 */
  return (typeof obj === 'object' && obj !== null) ||
    typeof obj === 'function' || typeof obj === 'symbol';
}

var dateSerializer = {
  serialize: function(date) {
    return [date.getTime()];
  },
  deserialize: function(time) {
    return new Date(time);
  },
  isInstance: function(obj) {
    return obj instanceof Date;
  },
  name: 'Date'
};

var regExpSerializer = {
  serialize: function(regExp) {
    var flags = '';
    if (regExp.global) flags += 'g';
    if (regExp.multiline) flags += 'm';
    if (regExp.ignoreCase) flags += 'i';
    return [regExp.source, flags];
  },
  deserialize: function(source, flags) {
    return new RegExp(source, flags);
  },
  isInstance: function(obj) {
    return obj instanceof RegExp;
  },
  name: 'RegExp'
};

var functionSerializer = {
  serialize: function(f) {
    var firstArg, functionBody, parts, remainingArgs;
    var args = '';

    parts = functionPattern.exec(f.toString());

    if (!parts)
      throw new Error('Functions must have a working toString method' +
                      'in order to be serialized');

    firstArg = parts[1];
    remainingArgs = parts[2];
    functionBody = parts[3];

    if (nativeFunctionBodyPattern.test(functionBody))
      throw new Error('Native functions cannot be serialized');
    
    if (firstArg)
      args += firstArg.trim();

    if (remainingArgs) {
      remainingArgs = remainingArgs.split(',').slice(1);
      for (var i = 0; i < remainingArgs.length; i += 1) {
        args += ', ' + remainingArgs[i].trim();
      }
    }

    return [args, functionBody];
  },
  deserialize: function(args, functionBody) {
    var rv = new Function(args, functionBody);
    return rv;
  },
  isInstance: function(obj) {
    return typeof obj === 'function';
  },
  name: 'Function'
};

var symbolSerializer;

if (typeof global.Symbol !== 'undefined') {
  (function(Symbol) {
   /*jshint -W122 */
    // add symbol serializer for es6. this will probably break for private
    // symbols.
    symbolSerializer = {
      serialize: function(sym) {
        var key = Symbol.keyFor(sym);
        if (typeof key === 'string') {
          // symbol registered globally
          return [key, 0, 0];
        }
        var symStr = sym.toString();
        var match = /^Symbol\(Symbol\.([^)]+)\)$/.exec(symStr);
        if (match && has(Symbol, match[1])) {
          // well known symbol, return the key in the Symbol object
          return [0, match[1], 0];
        }
        match = /^Symbol\(([^)]*)\)$/.exec(symStr);
        return [0, 0, match[1]];
      },
      deserialize: function(key, wellKnownKey, description) {
        if (key) {
          return Symbol.for(key);
        } else if (wellKnownKey) {
          return Symbol[wellKnownKey];
        }
        return Symbol(description);
      },
      isInstance: function(obj) {
        return typeof obj === 'symbol';
      },
      name: 'Symbol'
    };
  })(global.Symbol);
}

var defaultOpts = {
  magic: '#!',
  serializers: [dateSerializer, regExpSerializer, functionSerializer]
};

if (symbolSerializer)
  defaultOpts.serializers.push(symbolSerializer);

function create(options) {
  var magic = escapeForRegExp((options && options.magic) ||
                              defaultOpts.magic);
  var initialSerializers = (options && options.serializers) ||
    defaultOpts.serializers;
  var serializers = [];
  var magicEscaper = new RegExp('([' + magic + '])', 'g');
  var magicUnescaper = new RegExp('([' + magic + '])\\1', 'g');
  var superJsonStringPattern = new RegExp('^([' + magic + ']+)' +
                                    '(' + identifierFormat +
                                    '\\[.*\\])$');
  var superJsonPattern = new RegExp('^' + magic +
                                    '(' + identifierFormat + ')' +
                                    '(\\[.*\\])$');


  function installSerializer(serializer) {
    if (typeof serializer.name === 'function') {
      if (serializer.deserialize) {
        throw new Error('Serializers with a function name should not define ' +
                        'a deserialize function');
      }
    } else {
      if (!identifierPattern.test(serializer.name))
        throw new Error("Serializers must have a 'name' property " +
                        'that is a valid javascript identifier.');

      if (typeof serializer.deserialize !== 'function' &&
          typeof serializer.replace !== 'function')
        throw new Error("Serializers must have a 'deserialize' function " +
                        'that when passed the arguments generated by ' +
                        "'serialize' will return a instance that is equal " +
                        'to the one serialized');
    }

    if (typeof serializer.serialize !== 'function' &&
        typeof serializer.replace !== 'function')
      throw new Error("Serializers must have a 'serialize' function " +
                      'that will receive an instance and return an array ' +
                      'of arguments necessary to reconstruct the object ' +
                      'state.');

    if (typeof serializer.isInstance !== 'function')
      throw new Error("Serializers must have a 'isInstance' function " +
                      'that tells if an object is an instance of the ' +
                      'type represented by the serializer');

    serializers.push(serializer);
  }

  function stringify(obj, userReplacer, indent) {
    function replaceValue(value) {
      var match;

      if (typeof value === 'string' && 
          (match = superJsonStringPattern.exec(value))) {
        // Escape magic string at the start only
        return match[1].replace(magicEscaper, '$1$1') + match[2];
      } else {
        for (var i = 0; i < serializers.length; i++) {
          var serializer = serializers[i];
          if (serializer.isInstance(value)) {
            if (typeof serializer.replace === 'function') {
              return serializer.replace(value);
            }
            var name;
            if (typeof serializer.name === 'function')
              name = serializer.name(value);
            else
              name = serializer.name;
            var args = serializer.serialize(value);
            if (!isArray(args))
              throw new Error("'serialize' function must return an array " +
                              "containing arguments for 'deserialize'");
              return magic + name + jsonStringify(args);
          }
        }
      }
    }

    function replacer(key, value) {
      var rv = null;

      if (isReplaceable(value)) {
        if (isArray(value)) {
          rv = [];
          value.forEach(function(v) {
            var replacedValue = replaceValue(v);
            if (replacedValue === undefined) replacedValue = v;
            rv.push(replacedValue);
          });
        } else {
          rv = {};
          keys(value).forEach(function(k) {
            var v = value[k];
            var replacedValue = replaceValue(v);
            if (replacedValue === undefined) replacedValue = v;
            rv[k] = replacedValue;
          });
        }
      }

      if (!rv) return value;
      return rv;
    }

    var rv;

    if (typeof userReplacer === 'number') 
      indent = userReplacer;

    if (!userReplacer && isReplaceable(obj))
      rv = replaceValue(obj);

    if (rv) 
      return jsonStringify(rv, null, indent);

    return jsonStringify(obj, typeof userReplacer === 'function' ?
                         userReplacer : replacer, indent);
  }

  function parse(json, userReviver) {
    var revived = [];

    function reviveValue(value) {
      var args, match, name;

      if ((match = superJsonPattern.exec(value))) {
        name = match[1];
        try {
          args = jsonParse(match[2]);
        } catch (e) {
          // Ignore parse errors
          return;
        }
        for (var i = 0; i < serializers.length; i += 1) {
          var serializer = serializers[i];
          if (name === serializer.name)
            return serializer.deserialize.apply(serializer, args);
        }
      } else if ((match = superJsonStringPattern.exec(value))) {
        return match[1].replace(magicUnescaper, '$1') + match[2];
      }
    }

    function reviver(key, value) {
      if (typeof value === 'object' && value && revived.indexOf(value) === -1) {
        keys(value).forEach(function(k) {
          var revivedValue;
          var v = value[k];
          if (typeof v === 'string')
            revivedValue = reviveValue(v);
          if (revivedValue) revived.push(revivedValue);
          else revivedValue = v;
          value[k] = revivedValue;
        });
      }

      return value;
    }

    var rv;
    var parsed = jsonParse(json, typeof userReviver === 'function' ?
                          userReviver : reviver);

    if (typeof parsed === 'string') rv = reviveValue(parsed);
    if (!rv) rv = parsed;
    return rv;
  }

  initialSerializers.forEach(installSerializer);

  return {
    stringify: stringify,
    parse: parse,
    installSerializer: installSerializer
  };
}

exports.dateSerializer = dateSerializer;
exports.regExpSerializer = regExpSerializer;
exports.functionSerializer = functionSerializer;
if (symbolSerializer) exports.symbolSerializer = symbolSerializer;
exports.create = create;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"has":65}],80:[function(require,module,exports){
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var superJson = require("super-json");
/** Support undefined and Date by default*/
function get(serializers) {
    if (serializers === void 0) { serializers = []; }
    var myJson = superJson.create({
        "magic": '#!',
        "serializers": __spread([
            superJson.dateSerializer
        ], serializers)
    });
    return {
        "stringify": function (obj) {
            if (obj === undefined) {
                return "undefined";
            }
            return myJson.stringify([obj]);
        },
        "parse": function (str) {
            if (str === "undefined") {
                return undefined;
            }
            return myJson.parse(str).pop();
        }
    };
}
exports.get = get;

},{"super-json":79}],81:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var JSON_CUSTOM = require("./JSON_CUSTOM");
exports.JSON_CUSTOM = JSON_CUSTOM;
var stringTransform = require("./stringTransform");
exports.stringTransform = stringTransform;
var stringTransformExt = require("./stringTransformExt");
exports.stringTransformExt = stringTransformExt;
var testing = require("./testing");
exports.testing = testing;

},{"./JSON_CUSTOM":80,"./stringTransform":82,"./stringTransformExt":83,"./testing":84}],82:[function(require,module,exports){
(function (Buffer){
"use strict";
exports.__esModule = true;
function safeBufferFromTo(str, fromEnc, toEnc) {
    try {
        return Buffer.from(str, fromEnc).toString(toEnc);
    }
    catch (_a) {
        return (new Buffer(str, fromEnc)).toString(toEnc);
    }
}
exports.safeBufferFromTo = safeBufferFromTo;
function transcode(encoding, alphabetMap) {
    if (alphabetMap === void 0) { alphabetMap = {}; }
    var reverseAlphabetMap = {};
    for (var char in alphabetMap) {
        reverseAlphabetMap[alphabetMap[char]] = char;
    }
    return {
        "enc": function (str) { return transcode.applyNewAlphabet(safeBufferFromTo(str, "utf8", encoding), alphabetMap); },
        "dec": function (encStr) { return safeBufferFromTo(transcode.applyNewAlphabet(encStr, reverseAlphabetMap), encoding, "utf8"); }
    };
}
exports.transcode = transcode;
(function (transcode) {
    var regExpCache = {};
    function applyNewAlphabet(str, alphabetMap) {
        for (var char in alphabetMap) {
            var regExp = regExpCache[char];
            if (!regExp) {
                regExp = new RegExp("\\" + char, "g");
                regExpCache[char] = regExp;
            }
            str = str.replace(regExp, alphabetMap[char]);
        }
        return str;
    }
    transcode.applyNewAlphabet = applyNewAlphabet;
})(transcode = exports.transcode || (exports.transcode = {}));
/**
 * partLength correspond to string length not byte
 * but in base 64 all char are ascii so partMaxLength <=> partMaxBytes
 **/
function textSplit(partMaxLength, text) {
    var parts = [];
    var rest = text;
    while (rest) {
        if (partMaxLength >= rest.length) {
            parts.push(rest);
            rest = "";
        }
        else {
            parts.push(rest.substring(0, partMaxLength));
            rest = rest.substring(partMaxLength, rest.length);
        }
    }
    return parts;
}
exports.textSplit = textSplit;

}).call(this,require("buffer").Buffer)
},{"buffer":3}],83:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var stringTransform_1 = require("./stringTransform");
/**
 * Assuming there is an index n in [ 0 ... lastIndex ] such as
 * for all i <= n condition(i) is true
 * and for all i > n condition(i) is false
 * this function find n
 */
function findLastIndexFulfilling(condition, lastIndex) {
    if (lastIndex < 0) {
        throw Error("range error");
    }
    if (!condition(0)) {
        throw Error("no index fullfil the condition");
    }
    return (function callee(fromIndex, toIndex) {
        if (fromIndex === toIndex) {
            return fromIndex;
        }
        else if (fromIndex + 1 === toIndex) {
            if (condition(toIndex)) {
                return toIndex;
            }
            else {
                return fromIndex;
            }
        }
        else {
            var length_1 = toIndex - fromIndex + 1;
            var halfLength = Math.floor(length_1 / 2);
            var middleIndex = fromIndex + halfLength;
            if (condition(middleIndex)) {
                return callee(middleIndex, toIndex);
            }
            else {
                return callee(fromIndex, middleIndex);
            }
        }
    })(0, lastIndex);
}
exports.findLastIndexFulfilling = findLastIndexFulfilling;
function b64crop(partMaxLength, text) {
    var _a = stringTransform_1.transcode("base64"), enc = _a.enc, dec = _a.dec;
    var isNotTooLong = function (index) {
        var part = text.substring(0, index);
        var encPart = enc(part);
        return encPart.length <= partMaxLength;
    };
    //99.9% of the cases for SMS
    if (isNotTooLong(text.length)) {
        return enc(text.substring(0, text.length));
    }
    var index = findLastIndexFulfilling(isNotTooLong, text.length);
    while (true) {
        var part = text.substring(0, index);
        var rest = text.substring(index, text.length);
        if ((dec(enc(part)) + dec(enc(rest))) !== dec(enc(text))) {
            index--;
        }
        else {
            return enc(part + "[...]");
        }
    }
}
exports.b64crop = b64crop;

},{"./stringTransform":82}],84:[function(require,module,exports){
"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
exports.__esModule = true;
var stringTransform_1 = require("./stringTransform");
var seedrandom = require("seedrandom");
function assert(bool, message) {
    if (!bool) {
        throw new Error(message);
    }
}
/** Compare if two object represent the same data, [ "ok", "foo" ] <=> [ "foo", "ok" ] */
function assertSame(o1, o2, errorMessage) {
    if (errorMessage === void 0) { errorMessage = "assertSame error"; }
    try {
        assertSame.perform(o1, o2);
    }
    catch (e) {
        var error = new Error(errorMessage + " (" + e.message + ")");
        error["o1"] = o1;
        error["o2"] = o2;
        throw error;
    }
}
exports.assertSame = assertSame;
(function (assertSame) {
    assertSame.handleArrayAsSet = true;
    function perform(o1, o2) {
        var e_1, _a, e_2, _b;
        if (o1 instanceof Date) {
            if (!(o2 instanceof Date)) {
                assert(false, "M0");
                return;
            }
            assert(o1.getTime() === o2.getTime(), "Date mismatch");
        }
        else if (o1 instanceof Object) {
            assert(o2 instanceof Object, "M1");
            if (assertSame.handleArrayAsSet && o1 instanceof Array) {
                if (!(o2 instanceof Array)) {
                    assert(false, "M2");
                    return;
                }
                assert(o1.length === o2.length, "M3");
                var o2Set = new Set(o2);
                try {
                    for (var o1_1 = __values(o1), o1_1_1 = o1_1.next(); !o1_1_1.done; o1_1_1 = o1_1.next()) {
                        var val1 = o1_1_1.value;
                        var isFound = false;
                        try {
                            for (var o2Set_1 = (e_2 = void 0, __values(o2Set)), o2Set_1_1 = o2Set_1.next(); !o2Set_1_1.done; o2Set_1_1 = o2Set_1.next()) {
                                var val2 = o2Set_1_1.value;
                                try {
                                    perform(val1, val2);
                                }
                                catch (_c) {
                                    continue;
                                }
                                isFound = true;
                                o2Set["delete"](val2);
                                break;
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (o2Set_1_1 && !o2Set_1_1.done && (_b = o2Set_1["return"])) _b.call(o2Set_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        assert(isFound, "M4");
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (o1_1_1 && !o1_1_1.done && (_a = o1_1["return"])) _a.call(o1_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            else {
                if (o1 instanceof Array) {
                    if (!(o2 instanceof Array)) {
                        assert(false, "M5");
                        return;
                    }
                    assert(o1.length === o2.length, "M6");
                }
                else {
                    perform(Object.keys(o1).filter(function (key) { return o1[key] !== undefined; }), Object.keys(o2).filter(function (key) { return o2[key] !== undefined; }));
                }
                for (var key in o1) {
                    perform(o1[key], o2[key]);
                }
            }
        }
        else {
            assert(o1 === o2, o1 + " !== " + o2);
        }
    }
    assertSame.perform = perform;
})(assertSame = exports.assertSame || (exports.assertSame = {}));
/** ex 123320 */
exports.genDigits = function (n) {
    return (new Array(n))
        .fill("")
        .map(function () { return "" + ~~(Math.random() * 10); })
        .join("");
};
/** Hex str to lower char */
exports.genHexStr = function (n) { return (new Array(n))
    .fill("")
    .map(function () { return (~~(Math.random() * 0x10)).toString(16); })
    .join(""); };
var seedRandom;
(function (seedRandom) {
    var random = Math.random;
    function plant(seed) {
        Math.random = (function () {
            var prev = undefined;
            return function random() {
                prev = seedrandom(prev === undefined ?
                    seed :
                    prev.toFixed(12), { "global": false }).quick();
                return prev;
            };
        })();
    }
    seedRandom.plant = plant;
    function restore() {
        Math.random = random;
    }
    seedRandom.restore = restore;
})(seedRandom = exports.seedRandom || (exports.seedRandom = {}));
/** Length is not Byte length but the number of char */
function genUtf8Str(length, restrict, seed) {
    var charGenerator;
    switch (restrict) {
        case undefined:
            charGenerator = genUtf8Str.genUtf8Char;
            break;
        case "ONLY 1 BYTE CHAR":
            charGenerator = genUtf8Str.genUtf8Char1B;
            break;
        case "ONLY 4 BYTE CHAR":
            charGenerator = genUtf8Str.genUtf8Char4B;
            break;
    }
    if (typeof seed === "string") {
        seedRandom.plant(seed);
    }
    var out = (new Array(length)).fill("").map(function () { return charGenerator(); }).join("");
    seedRandom.restore();
    return out;
}
exports.genUtf8Str = genUtf8Str;
(function (genUtf8Str) {
    /** "11110000" => "f0" */
    function bitStrToHexStr(bin) {
        var hexChars = [];
        var i = 0;
        while (bin[i] !== undefined) {
            var fourBits = "" + bin[i] + bin[i + 1] + bin[i + 2] + bin[i + 3];
            var hexChar = parseInt(fourBits, 2).toString(16);
            hexChars.push(hexChar);
            i = i + 4;
        }
        return hexChars.join("");
    }
    ;
    /** 8 => "11010001"  */
    function genBitStr(length) {
        return (new Array(length)).fill("").map(function () { return "" + ~~(Math.random() * 2); }).join("");
    }
    /** throw error if hex does not represent a valid utf8 string */
    function hexStrToUtf8Str(hex) {
        var str = stringTransform_1.safeBufferFromTo(hex, "hex", "utf8");
        if (stringTransform_1.safeBufferFromTo(str, "utf8", "hex") !== hex) {
            throw new Error("Invalid UTF8 data");
        }
        return str;
    }
    /** return a random utf8 char that fit on one byte */
    function genUtf8Char1B() {
        var bin = "0" + genBitStr(7);
        var hex = bitStrToHexStr(bin);
        try {
            return hexStrToUtf8Str(hex);
        }
        catch (_a) {
            return genUtf8Char1B();
        }
    }
    genUtf8Str.genUtf8Char1B = genUtf8Char1B;
    genUtf8Str.genUtf8Char2B = function () {
        var bin = "110" + genBitStr(5) + "10" + genBitStr(6);
        var hex = bitStrToHexStr(bin);
        try {
            return hexStrToUtf8Str(hex);
        }
        catch (_a) {
            return genUtf8Str.genUtf8Char2B();
        }
    };
    function genUtf8Char3B(rand) {
        if (rand === undefined) {
            rand = ~~(Math.random() * 8);
        }
        var bin;
        switch (rand) {
            case 0:
                bin = "11100000101" + genBitStr(5) + "10" + genBitStr(6);
                break;
            case 1:
                bin = "1110000110" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 2:
                bin = "1110001" + genBitStr(1) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 3:
                bin = "111001" + genBitStr(2) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 4:
                bin = "111010" + genBitStr(2) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 5:
                bin = "1110110010" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 6:
                bin = "11101101100" + genBitStr(5) + "10" + genBitStr(6);
                break;
            case 7:
                bin = "1110111" + genBitStr(1) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
        }
        var hex = bitStrToHexStr(bin);
        try {
            return hexStrToUtf8Str(hex);
        }
        catch (_a) {
            return genUtf8Char3B();
        }
    }
    genUtf8Str.genUtf8Char3B = genUtf8Char3B;
    ;
    function genUtf8Char4B(rand) {
        if (rand === undefined) {
            rand = ~~(Math.random() * 5);
        }
        var bin;
        switch (rand) {
            case 0:
                bin = "111100001001" + genBitStr(4) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 1:
                bin = "11110000101" + genBitStr(5) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 2:
                bin = "1111000110" + genBitStr(6) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 3:
                bin = "1111001" + genBitStr(1) + "10" + genBitStr(6) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
            case 4:
                bin = "111101001000" + genBitStr(4) + "10" + genBitStr(6) + "10" + genBitStr(6);
                break;
        }
        var hex = bitStrToHexStr(bin);
        try {
            return hexStrToUtf8Str(hex);
        }
        catch (_a) {
            return genUtf8Char4B();
        }
    }
    genUtf8Str.genUtf8Char4B = genUtf8Char4B;
    ;
    function genUtf8Char() {
        var rand = ~~(Math.random() * 4);
        switch (rand) {
            case 0: return genUtf8Char1B();
            case 1: return genUtf8Str.genUtf8Char2B();
            case 2: return genUtf8Char3B();
            case 3: return genUtf8Char4B();
        }
    }
    genUtf8Str.genUtf8Char = genUtf8Char;
    ;
})(genUtf8Str = exports.genUtf8Str || (exports.genUtf8Str = {}));

},{"./stringTransform":82,"seedrandom":70}],85:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./SyncEventBase":86,"dup":19}],86:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./SyncEventBaseProtected":87,"dup":20}],87:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./defs":88,"dup":21,"minimal-polyfills/dist/lib/Array.prototype.find":66,"minimal-polyfills/dist/lib/Map":67,"run-exclusive":69}],88:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22,"setprototypeof":78}],89:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./SyncEvent":85,"./defs":88,"dup":23}],90:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
/** Implementation for net.Socket and tls.Socket */
var NetSocketConnection = /** @class */ (function () {
    function NetSocketConnection(netSocket) {
        var _this = this;
        this.localPort = NaN;
        this.remotePort = NaN;
        this.localAddress = "";
        this.remoteAddress = "";
        this.netSocket = netSocket;
        this.netSocket.setMaxListeners(Infinity);
        var setAddrAndPort = function () {
            _this.localPort = _this.netSocket.localPort;
            if (_this.netSocket.remotePort !== undefined) {
                _this.remotePort = _this.netSocket.remotePort;
            }
            _this.localAddress = _this.netSocket.localAddress;
            if (!!_this.netSocket.remoteAddress) {
                _this.remoteAddress = _this.netSocket.remoteAddress;
            }
        };
        setAddrAndPort();
        var connectEvtName;
        if (this.netSocket["encrypted"]) {
            this.protocol = "TLS";
            connectEvtName = "secureConnect";
        }
        else {
            this.protocol = "TCP";
            connectEvtName = "connect";
        }
        this.netSocket.once(connectEvtName, function () { return setAddrAndPort(); });
    }
    NetSocketConnection.prototype.emit = function (evtName, evtData) {
        this.netSocket.emit(evtName, evtData);
    };
    ;
    NetSocketConnection.prototype.once = function (evtName, handler) {
        this.netSocket.once(evtName, handler);
        return this;
    };
    NetSocketConnection.prototype.on = function (_evtName, handler) {
        this.netSocket.on("data", handler);
        return this;
    };
    NetSocketConnection.prototype.isConnecting = function () {
        return this.netSocket.connecting;
    };
    NetSocketConnection.prototype.destroy = function () {
        this.netSocket.destroy();
    };
    NetSocketConnection.prototype.write = function (data, callback) {
        var _this = this;
        var isFlushed = this.netSocket.write(data);
        if (isFlushed) {
            callback(true);
        }
        else {
            var onceClose_1;
            var onceDrain_1;
            Promise.race([
                new Promise(function (resolve) { return _this.netSocket.once("close", onceClose_1 = function () { return resolve(false); }); }),
                new Promise(function (resolve) { return _this.netSocket.once("drain", onceDrain_1 = function () { return resolve(true); }); })
            ]).then(function (isSent) {
                _this.netSocket.removeListener("close", onceClose_1);
                _this.netSocket.removeListener("drain", onceDrain_1);
                callback(isSent);
            });
        }
    };
    return NetSocketConnection;
}());
exports.NetSocketConnection = NetSocketConnection;
/** Implementation for WebSocket */
var WebSocketConnection = /** @class */ (function () {
    function WebSocketConnection(websocket) {
        var _this = this;
        this.protocol = "WSS";
        this.localPort = NaN;
        this.remotePort = NaN;
        this.localAddress = "_unknown_local_address_";
        this.remoteAddress = "_unknown_remote_address_";
        this.evtMessageEvent = new ts_events_extended_1.SyncEvent();
        this.evtError = new ts_events_extended_1.SyncEvent();
        this.evtClose = new ts_events_extended_1.SyncEvent();
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        this.websocket = websocket;
        this.websocket.onmessage = function (messageEvent) {
            return _this.evtMessageEvent.post(messageEvent);
        };
        this.websocket.onerror = function () {
            websocket.onerror = function () { };
            _this.evtError.post(new Error("Native Websocket Error"));
        };
        this.websocket.onclose = function () {
            websocket.onclose = function () { };
            _this.evtClose.post(_this.evtError.postCount !== 0);
        };
        if (this.isConnecting()) {
            this.websocket.onopen = function () { return _this.evtConnect.post(); };
        }
    }
    WebSocketConnection.prototype.emit = function (evtName, evtData) {
        var _this = this;
        switch (evtName) {
            case "error":
                (function (error) {
                    _this.evtError.post(error);
                })(evtData);
                break;
            case "close":
                (function (had_error) {
                    _this.evtClose.post(had_error);
                })(evtData);
                break;
        }
    };
    ;
    WebSocketConnection.prototype.once = function (evtName, handler) {
        var _this = this;
        switch (evtName) {
            case "error":
                (function (handler) {
                    _this.evtError.attachOnce(function (error) { return handler(error); });
                })(handler);
                break;
            case "close":
                (function (handler) {
                    _this.evtClose.attachOnce(function (had_error) { return handler(had_error); });
                })(handler);
                break;
            case "connect":
                (function (handler) {
                    _this.evtConnect.attachOnce(function () { return handler(); });
                })(handler);
                break;
        }
        return this;
    };
    WebSocketConnection.prototype.on = function (_evtName, handler) {
        this.evtMessageEvent.attach(function (messageEvent) {
            return handler(Buffer.from(messageEvent.data));
        });
        return this;
    };
    WebSocketConnection.prototype.isConnecting = function () {
        return this.websocket.readyState === this.websocket.CONNECTING;
    };
    WebSocketConnection.prototype.destroy = function () {
        this.evtMessageEvent.detach();
        this.websocket.close();
    };
    WebSocketConnection.prototype.write = function (data, callback) {
        try {
            var dataAsString = data.toString("utf8");
            //This should not have to be casted :(
            this.websocket.send(dataAsString);
        }
        catch (_a) {
            callback(false);
        }
        callback(true);
    };
    return WebSocketConnection;
}());
exports.WebSocketConnection = WebSocketConnection;

}).call(this,require("buffer").Buffer)
},{"buffer":3,"ts-events-extended":89}],91:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var core = require("./core");
var misc = require("./misc");
var ApiMessage_1 = require("./api/ApiMessage");
var IConnection_1 = require("./IConnection");
require("colors");
//TODO: make a function to test if message are well formed: have from, to via ect.
var Socket = /** @class */ (function () {
    /**
     * @param socket net.Socket ( include tls.TLSSocket ) or an instance of an object that implement
     * the HTML5's websocket interface. ( in node use 'ws' module ).
     * The type of this param is not exposed because WebSocket as defined in the dom is not present
     * in a node environment and the modules "net" "tls" and "ws" should not have types definition
     * in a web environment.
     * @param isRemoteTrusted if set to false enable flood detection.
     * @param spoofedAddressAndPort source address and port of both source and destination can be overwritten
     * those are used in buildNextHopPacket and for logging purpose.
     * If not provided the values of the underlying connection will be used.
     * There is two reason you may want to use this:
     * 1) WebSocket interface does not have .localPort, .remotePort, .localAddress, .remoteAddress
     * so providing them explicitly is the only way.
     * 2) If using a load balancer the addresses/ports that you want to expose are not really the one
     * used by the underlying socket connection.
     */
    function Socket(socket, isRemoteTrusted, spoofedAddressAndPort, connectionTimeout) {
        var _this = this;
        if (spoofedAddressAndPort === void 0) { spoofedAddressAndPort = {}; }
        if (connectionTimeout === void 0) { connectionTimeout = 3000; }
        this.spoofedAddressAndPort = spoofedAddressAndPort;
        /** To store data contextually link to this socket */
        this.misc = {};
        /**
         *
         * Post has_error.
         *
         * Posted synchronously ( with false ) when destroy is called,
         * OR
         * ( with true ) when evtError is posted
         * OR
         * ( with false ) when underlying socket post "close"
         *
         */
        this.evtClose = new ts_events_extended_1.SyncEvent();
        /**
         * Posted when underlying socket connect,
         * If underlying socket was already connected when
         * when constructed posted synchronously when instantiated.
         *
         *  */
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        /** API traffic is extracted, won't be posted here */
        this.evtResponse = new ts_events_extended_1.SyncEvent();
        this.evtRequest = new ts_events_extended_1.SyncEvent();
        /** Post chunk of data as received by the underlying connection*/
        this.evtData = new ts_events_extended_1.SyncEvent();
        /** Post chunk of data as wrote on underlying socket (once write return true )*/
        this.evtDataOut = new ts_events_extended_1.SyncEvent();
        /** Chance to modify packet before it is serialized */
        this.evtPacketPreWrite = new ts_events_extended_1.SyncEvent();
        /**
         * Provided only so the error can be logged.
         *
         * Posted when underlying socket emit "error" event
         * OR
         * When the socket is flooded
         * OR
         * When the stream parser throw an Error ( possible ? YES! )
         * OR
         * Socket took to much time to connect.
         *
         *
         * */
        this.evtError = new ts_events_extended_1.SyncEvent();
        this.openTimer = null;
        /** Readonly, true if destroy have been called ( not called internally ) */
        this.haveBeedDestroyed = false;
        /** Readonly, message provide when and if destroy have been called */
        this.destroyReason = undefined;
        this.loggerEvt = {};
        var matchNetSocket = function (socket) {
            return socket.destroy !== undefined;
        };
        if (matchNetSocket(socket)) {
            this.connection = new IConnection_1.NetSocketConnection(socket);
        }
        else {
            this.connection = new IConnection_1.WebSocketConnection(socket);
        }
        var streamParser = core.makeStreamParser(function (sipPacket) {
            if (!!_this.loggerEvt.evtPacketIn) {
                _this.loggerEvt.evtPacketIn.post(sipPacket);
            }
            if (misc.matchRequest(sipPacket)) {
                _this.evtRequest.post(sipPacket);
            }
            else {
                _this.evtResponse.post(sipPacket);
            }
        }, isRemoteTrusted ? undefined : ({
            "onFlood": function (floodError) { return _this.connection.emit("error", floodError); },
            "maxBytesHeaders": Socket.maxBytesHeaders,
            "maxContentLength": Socket.maxContentLength
        }));
        this.connection
            .once("error", function (error) {
            _this.evtError.post(error);
            _this.connection.emit("close", true);
        })
            .once("close", function (had_error) {
            //NOTE: 99.9% chance it's already cleared.
            clearTimeout(_this.openTimer);
            _this.connection.destroy();
            _this.evtClose.post(had_error);
        })
            .on("data", function (data) {
            _this.evtData.post(data);
            try {
                streamParser(data);
            }
            catch (error) {
                _this.connection.emit("error", error);
            }
        });
        if (!this.connection.isConnecting()) {
            this.evtConnect.post();
        }
        else {
            this.openTimer = setTimeout(function () {
                if (!!_this.evtClose.postCount) {
                    return;
                }
                _this.connection.emit("error", new Error("Sip socket connection timeout after " + connectionTimeout));
            }, connectionTimeout);
            this.connection.once("connect", function () {
                clearTimeout(_this.openTimer);
                _this.evtConnect.post();
            });
        }
    }
    Object.defineProperty(Socket.prototype, "localPort", {
        get: function () {
            return this.spoofedAddressAndPort.localPort || this.connection.localPort;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remotePort", {
        get: function () {
            return this.spoofedAddressAndPort.remotePort || this.connection.remotePort;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "localAddress", {
        get: function () {
            return this.spoofedAddressAndPort.localAddress || this.connection.localAddress;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remoteAddress", {
        get: function () {
            return this.spoofedAddressAndPort.remoteAddress || this.connection.remoteAddress;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Return true if sent successfully
     * If socket had not connected yet throw error.
     * WARNING: If socket has closed will never resolve!
     * */
    Socket.prototype.write = function (sipPacket) {
        var _this = this;
        if (!this.evtConnect.postCount) {
            throw new Error("Trying to write before socket connect");
        }
        if (this.evtClose.postCount) {
            return new Promise(function (resolve) { });
        }
        if (misc.matchRequest(sipPacket)) {
            var maxForwardsHeaderValue = sipPacket.headers["max-forwards"];
            if (maxForwardsHeaderValue !== undefined) {
                var maxForwards = parseInt(maxForwardsHeaderValue);
                if (maxForwards < 0) {
                    return false;
                }
            }
        }
        this.evtPacketPreWrite.post(sipPacket);
        /*NOTE: this could throw but it would mean that it's an error
        on our part as a packet that have been parsed should be stringifiable.*/
        var data = core.toData(sipPacket);
        var isSent = undefined;
        var prIsSent = new Promise(function (resolve) { return _this.connection.write(data, function (_isSent) {
            isSent = _isSent;
            resolve(isSent);
        }); });
        prIsSent.then(function (isSent) {
            if (!isSent) {
                return;
            }
            if (!!_this.loggerEvt.evtPacketOut) {
                _this.loggerEvt.evtPacketOut.post(sipPacket);
            }
            _this.evtDataOut.post(data);
        });
        return isSent !== undefined ? isSent : prIsSent;
    };
    /**
     * Destroy underlying connection, evtClose is posted synchronously.
     * No more traffic will occur on the socket.
     * */
    Socket.prototype.destroy = function (reason) {
        if (this.haveBeedDestroyed) {
            return;
        }
        this.haveBeedDestroyed = true;
        this.destroyReason = reason;
        this.connection.emit("close", false);
    };
    Object.defineProperty(Socket.prototype, "protocol", {
        get: function () {
            return this.connection.protocol;
        },
        enumerable: true,
        configurable: true
    });
    Socket.prototype.buildNextHopPacket = function (sipPacket) {
        return misc.buildNextHopPacket(this, sipPacket);
    };
    Socket.prototype.enableLogger = function (params, log) {
        var _this = this;
        if (log === void 0) { log = console.log.bind(console); }
        var prefix = ("[ Sip Socket " + this.protocol + " ]").yellow;
        var getKey = (params.colorizedTraffic === "IN") ? (function (direction) { return [
            prefix,
            params.remoteEndId,
            direction === "IN" ? "=>" : "<=",
            params.localEndId + " ( " + params.socketId + " )",
            "\n"
        ].join(" "); }) : (function (direction) { return [
            prefix,
            params.localEndId + " ( " + params.socketId + " )",
            direction === "IN" ? "<=" : "=>",
            params.remoteEndId,
            "\n"
        ].join(" "); });
        var getColor = function (direction) {
            return (params.colorizedTraffic === direction) ? "yellow" : "white";
        };
        var matchPacket = function (sipPacket) { return params.ignoreApiTraffic ? !(misc.matchRequest(sipPacket) &&
            sipPacket.method === ApiMessage_1.sipMethodName) : true; };
        var onPacket = function (sipPacket, direction) {
            return log(getKey(direction), misc.stringify(sipPacket)[getColor(direction)]);
        };
        if (!!params.incomingTraffic) {
            this.loggerEvt.evtPacketIn = new ts_events_extended_1.SyncEvent();
            this.loggerEvt.evtPacketIn.attach(matchPacket, function (sipPacket) { return onPacket(sipPacket, "IN"); });
        }
        if (!!params.outgoingTraffic) {
            this.loggerEvt.evtPacketOut = new ts_events_extended_1.SyncEvent();
            this.loggerEvt.evtPacketOut.attach(matchPacket, function (sipPacket) { return onPacket(sipPacket, "OUT"); });
        }
        if (!!params.error) {
            this.evtError.attachOnce(function (error) {
                return log((prefix + " " + params.socketId + " Error").red, error.toString(), error.stack);
            });
        }
        if (!!params.connection) {
            var message_1 = prefix + " " + params.socketId + " connected";
            if (!!this.evtConnect.postCount) {
                log(message_1);
            }
            else {
                this.evtConnect.attachOnce(function () { return log(message_1); });
            }
        }
        if (!!params.close) {
            var getMessage_1 = function () {
                var message = prefix + " " + params.socketId + " closed, ";
                if (_this.haveBeedDestroyed) {
                    message += ".destroy have been called, ";
                    if (!!_this.destroyReason) {
                        message += "reason: " + _this.destroyReason;
                    }
                    else {
                        message += "no reason have been provided.";
                    }
                }
                else {
                    message += ".destroy NOT called.";
                }
                return message;
            };
            if (!!this.evtClose.postCount) {
                log(getMessage_1());
            }
            else {
                this.evtClose.attachOnce(function () { return log(getMessage_1()); });
            }
        }
    };
    Socket.maxBytesHeaders = 156400;
    Socket.maxContentLength = 24624;
    return Socket;
}());
exports.Socket = Socket;

},{"./IConnection":90,"./api/ApiMessage":92,"./core":96,"./misc":100,"colors":55,"ts-events-extended":89}],92:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core = require("../core");
var misc = require("../misc");
var transfer_tools_1 = require("transfer-tools");
var JSON_CUSTOM = transfer_tools_1.JSON_CUSTOM.get();
exports.sipMethodName = "API";
var ApiMessage;
(function (ApiMessage) {
    var actionIdKey = "api-action-id";
    function buildSip(actionId, payload) {
        var sipRequest = core.parse(Buffer.from([
            exports.sipMethodName + " _ SIP/2.0",
            "Max-Forwards: 0",
            "\r\n"
        ].join("\r\n"), "utf8"));
        sipRequest.headers[actionIdKey] = "" + actionId++;
        console.assert(payload !== null, "null is not stringifiable");
        console.assert(!(typeof payload === "number" && isNaN(payload)), "NaN is not stringifiable");
        misc.setPacketContent(sipRequest, JSON_CUSTOM.stringify(payload));
        return sipRequest;
    }
    ApiMessage.buildSip = buildSip;
    function matchSip(sipRequest) {
        return (!!sipRequest.headers &&
            !isNaN(parseInt(sipRequest.headers[actionIdKey])));
    }
    ApiMessage.matchSip = matchSip;
    function readActionId(sipRequest) {
        return parseInt(sipRequest.headers[actionIdKey]);
    }
    ApiMessage.readActionId = readActionId;
    function parsePayload(sipRequest, sanityCheck) {
        var payload = JSON_CUSTOM.parse(misc.getPacketContent(sipRequest).toString("utf8"));
        console.assert(!sanityCheck || sanityCheck(payload));
        return payload;
    }
    ApiMessage.parsePayload = parsePayload;
    var methodNameKey = "method";
    var Request;
    (function (Request) {
        var actionIdCounter = 0;
        function buildSip(methodName, params) {
            var sipRequest = ApiMessage.buildSip(actionIdCounter++, params);
            sipRequest.headers[methodNameKey] = methodName;
            return sipRequest;
        }
        Request.buildSip = buildSip;
        function matchSip(sipRequest) {
            return (ApiMessage.matchSip(sipRequest) &&
                !!sipRequest.headers[methodNameKey]);
        }
        Request.matchSip = matchSip;
        function readMethodName(sipRequest) {
            return sipRequest.headers[methodNameKey];
        }
        Request.readMethodName = readMethodName;
    })(Request = ApiMessage.Request || (ApiMessage.Request = {}));
    var Response;
    (function (Response) {
        function buildSip(actionId, response) {
            var sipRequest = ApiMessage.buildSip(actionId, response);
            return sipRequest;
        }
        Response.buildSip = buildSip;
        function matchSip(sipRequest, actionId) {
            return (ApiMessage.matchSip(sipRequest) &&
                sipRequest.headers[methodNameKey] === undefined &&
                ApiMessage.readActionId(sipRequest) === actionId);
        }
        Response.matchSip = matchSip;
    })(Response = ApiMessage.Response || (ApiMessage.Response = {}));
})(ApiMessage = exports.ApiMessage || (exports.ApiMessage = {}));
var keepAlive;
(function (keepAlive) {
    keepAlive.methodName = "__keepAlive__";
})(keepAlive = exports.keepAlive || (exports.keepAlive = {}));

}).call(this,require("buffer").Buffer)
},{"../core":96,"../misc":100,"buffer":3,"transfer-tools":81}],93:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var misc = require("../misc");
var ApiMessage_1 = require("./ApiMessage");
var util = require("util");
require("colors");
var Server = /** @class */ (function () {
    function Server(handlers, logger) {
        var _this = this;
        if (logger === void 0) { logger = {}; }
        this.handlers = handlers;
        this.logger = logger;
        (function () {
            var methodName = ApiMessage_1.keepAlive.methodName;
            var handler = {
                "sanityCheck": function (params) { return params === "PING"; },
                "handler": function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, "PONG"];
                }); }); }
            };
            _this.handlers[methodName] = handler;
        })();
    }
    /** Can be called as soon as the socket is created ( no need to wait for connection ) */
    Server.prototype.startListening = function (socket) {
        var _this = this;
        var mkDestroyMsg = function (message) { return "( handling local API ) " + message; };
        socket.evtRequest.attachExtract(function (sipRequest) { return ApiMessage_1.ApiMessage.Request.matchSip(sipRequest); }, function (sipRequest) { return __awaiter(_this, void 0, void 0, function () {
            var rcvTime, methodName, _a, handler, sanityCheck, params, response, error, _error_1, duration, sipRequestResp, prDidWriteSuccessfully;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        rcvTime = Date.now();
                        methodName = ApiMessage_1.ApiMessage.Request.readMethodName(sipRequest);
                        try {
                            _a = this.handlers[methodName], handler = _a.handler, sanityCheck = _a.sanityCheck;
                        }
                        catch (_c) {
                            if (!!this.logger.onMethodNotImplemented) {
                                this.logger.onMethodNotImplemented(methodName, socket);
                            }
                            socket.destroy(mkDestroyMsg("method " + methodName + " not implemented"));
                            return [2 /*return*/];
                        }
                        try {
                            params = ApiMessage_1.ApiMessage.parsePayload(sipRequest, sanityCheck);
                        }
                        catch (_d) {
                            if (!!this.logger.onRequestMalformed) {
                                this.logger.onRequestMalformed(methodName, misc.getPacketContent(sipRequest), socket);
                            }
                            socket.destroy(mkDestroyMsg("received malformed request params for method " + methodName));
                            return [2 /*return*/];
                        }
                        error = undefined;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handler(params, socket)];
                    case 2:
                        response = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _error_1 = _b.sent();
                        error = _error_1;
                        return [3 /*break*/, 4];
                    case 4:
                        duration = Date.now() - rcvTime;
                        if (!!error) {
                            if (!!this.logger.onHandlerThrowError) {
                                this.logger.onHandlerThrowError(methodName, params, error, socket, duration);
                            }
                            socket.destroy(mkDestroyMsg(methodName + " handler thrown error: " + (error instanceof Error ? error.message : error)));
                            return [2 /*return*/];
                        }
                        try {
                            sipRequestResp = ApiMessage_1.ApiMessage.Response.buildSip(ApiMessage_1.ApiMessage.readActionId(sipRequest), response);
                        }
                        catch (_e) {
                            if (!!this.logger.onHandlerReturnNonStringifiableResponse) {
                                this.logger.onHandlerReturnNonStringifiableResponse(methodName, params, response, socket, duration);
                            }
                            socket.destroy(mkDestroyMsg("Handler returned non stringifiable response"));
                            return [2 /*return*/];
                        }
                        misc.buildNextHopPacket.pushVia(socket, sipRequestResp);
                        if (socket.evtClose.postCount === 0) {
                            prDidWriteSuccessfully = socket.write(sipRequestResp);
                        }
                        else {
                            prDidWriteSuccessfully = false;
                        }
                        if (!!this.logger.onRequestSuccessfullyHandled) {
                            this.logger.onRequestSuccessfullyHandled(methodName, params, response, socket, duration, prDidWriteSuccessfully);
                        }
                        return [4 /*yield*/, prDidWriteSuccessfully];
                    case 5:
                        if (!(_b.sent())) {
                            socket.destroy(mkDestroyMsg("write(response) did not return true"));
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    };
    return Server;
}());
exports.Server = Server;
(function (Server) {
    function getDefaultLogger(options) {
        options = options || {};
        var idString = options.idString || "";
        var log = options.log || console.log.bind(console);
        var displayOnlyErrors = options.displayOnlyErrors || false;
        var hideKeepAlive = options.hideKeepAlive || false;
        var common = function (socket, methodName, duration, p, r, concat) {
            var isSocketClosedAndNotDestroyed = !!socket.evtClose.postCount && !socket.haveBeedDestroyed;
            var isError = (r === undefined) || isSocketClosedAndNotDestroyed;
            if (!isError && displayOnlyErrors) {
                return;
            }
            if (hideKeepAlive && ApiMessage_1.keepAlive.methodName === methodName) {
                return;
            }
            log([
                (isError ? "[ Sip API handler Error ]".red : "[ Sip API handler ]".green) + " " + idString + ":" + methodName.yellow,
                ((duration !== undefined) ? " " + duration + "ms" : "") + "\n",
                socket.localAddress + ":" + socket.localPort + " (local) <= " + socket.remoteAddress + ":" + socket.remotePort + " (remote)\n",
                isSocketClosedAndNotDestroyed ? "Socket closed while processing request ( not locally destroyed )\n" : "",
                !!p ? "---Params:".blue + "   " + JSON.stringify(p.params) + "\n" : "",
                !!r ? "---Response:".blue + "   " + JSON.stringify(r.response) + "\n" : "",
                concat
            ].join(""));
        };
        return {
            "onMethodNotImplemented": function (methodName, socket) { return common(socket, methodName, undefined, undefined, undefined, "Not implemented"); },
            "onRequestMalformed": function (methodName, rawParams, socket) { return common(socket, methodName, undefined, undefined, undefined, "Request malformed " + util.format({ "rawParams": "" + rawParams })); },
            "onHandlerThrowError": function (methodName, params, error, socket, duration) { return common(socket, methodName, duration, { params: params }, undefined, "Handler thrown error: " + util.format(error)); },
            "onHandlerReturnNonStringifiableResponse": function (methodName, params, response, socket, duration) { return common(socket, methodName, duration, { params: params }, undefined, "Non stringifiable resp " + util.format({ response: response })); },
            "onRequestSuccessfullyHandled": function (methodName, params, response, socket, duration) { return common(socket, methodName, duration, { params: params }, { response: response }); }
        };
    }
    Server.getDefaultLogger = getDefaultLogger;
})(Server = exports.Server || (exports.Server = {}));
exports.Server = Server;

},{"../misc":100,"./ApiMessage":92,"colors":55,"util":9}],94:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var misc = require("../misc");
var ApiMessage_1 = require("./ApiMessage");
var setPrototypeOf = require("setprototypeof");
function sendRequest(socket, methodName, params, extra) {
    if (extra === void 0) { extra = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var mkDestroyMsg, errorLogger, sipRequest, actionId, writeSuccess, sipRequestResponse, timeoutValue, error_1, sendRequestError, response, sendRequestError;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mkDestroyMsg = function (message) { return "( calling remote API ) " + message; };
                    errorLogger = socket.misc[enableErrorLogging.miscKey] || {};
                    sipRequest = ApiMessage_1.ApiMessage.Request.buildSip(methodName, params);
                    misc.buildNextHopPacket.pushVia(socket, sipRequest);
                    actionId = ApiMessage_1.ApiMessage.readActionId(sipRequest);
                    return [4 /*yield*/, socket.write(sipRequest)];
                case 1:
                    writeSuccess = _a.sent();
                    if (!writeSuccess) {
                        if (!!errorLogger.onRequestNotSent) {
                            errorLogger.onRequestNotSent(methodName, params, socket);
                        }
                        socket.destroy(mkDestroyMsg("write did not return true (request not sent)"));
                        throw new SendRequestError(methodName, params, "CANNOT SEND REQUEST");
                    }
                    timeoutValue = extra.timeout || 5 * 60 * 1000;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, Promise.race([
                            socket.evtRequest.attachOnceExtract(function (sipRequestResponse) { return ApiMessage_1.ApiMessage.Response.matchSip(sipRequestResponse, actionId); }, timeoutValue, function () { }),
                            new Promise(function (_, reject) { return socket.evtClose.attachOnce(sipRequest, function () { return reject(new Error("CLOSE")); }); })
                        ])];
                case 3:
                    sipRequestResponse = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    sendRequestError = new SendRequestError(methodName, params, (error_1.message === "CLOSE") ?
                        "SOCKET CLOSED BEFORE RECEIVING RESPONSE" : "REQUEST TIMEOUT");
                    if (sendRequestError.cause === "REQUEST TIMEOUT") {
                        if (!!errorLogger.onRequestTimeout) {
                            errorLogger.onRequestTimeout(methodName, params, timeoutValue, socket);
                        }
                        socket.destroy(mkDestroyMsg("Request timed out"));
                    }
                    else {
                        if (!!errorLogger.onClosedConnection) {
                            errorLogger.onClosedConnection(methodName, params, socket);
                        }
                    }
                    throw sendRequestError;
                case 5:
                    try {
                        response = ApiMessage_1.ApiMessage.parsePayload(sipRequestResponse, extra.sanityCheck);
                    }
                    catch (_b) {
                        sendRequestError = new SendRequestError(methodName, params, "MALFORMED RESPONSE");
                        sendRequestError.misc["sipRequestResponse"] = sipRequestResponse;
                        if (!!errorLogger.onMalformedResponse) {
                            errorLogger.onMalformedResponse(methodName, params, misc.getPacketContent(sipRequestResponse), socket);
                        }
                        socket.destroy("Response is malformed");
                        throw sendRequestError;
                    }
                    return [2 /*return*/, response];
            }
        });
    });
}
exports.sendRequest = sendRequest;
function enableErrorLogging(socket, errorLogger) {
    socket.misc[enableErrorLogging.miscKey] = errorLogger;
}
exports.enableErrorLogging = enableErrorLogging;
(function (enableErrorLogging) {
    enableErrorLogging.miscKey = " __api_client_error_logger__ ";
})(enableErrorLogging = exports.enableErrorLogging || (exports.enableErrorLogging = {}));
function enableKeepAlive(socket, interval) {
    var _this = this;
    if (interval === void 0) { interval = 120 * 1000; }
    var methodName = ApiMessage_1.keepAlive.methodName;
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!!socket.evtConnect.postCount) return [3 /*break*/, 2];
                    return [4 /*yield*/, socket.evtConnect.waitFor()];
                case 1:
                    _c.sent();
                    _c.label = 2;
                case 2:
                    if (!true) return [3 /*break*/, 10];
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, sendRequest(socket, methodName, "PING", {
                            "timeout": 5 * 1000,
                            "sanityCheck": function (response) { return response === "PONG"; }
                        })];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 6];
                case 5:
                    _a = _c.sent();
                    return [3 /*break*/, 10];
                case 6:
                    _c.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, socket.evtClose.waitFor(interval)];
                case 7:
                    _c.sent();
                    return [3 /*break*/, 10];
                case 8:
                    _b = _c.sent();
                    return [3 /*break*/, 9];
                case 9: return [3 /*break*/, 2];
                case 10: return [2 /*return*/];
            }
        });
    }); })();
}
exports.enableKeepAlive = enableKeepAlive;
var SendRequestError = /** @class */ (function (_super) {
    __extends(SendRequestError, _super);
    function SendRequestError(methodName, params, cause) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, "Send request " + methodName + " " + cause) || this;
        _this.methodName = methodName;
        _this.params = params;
        _this.cause = cause;
        _this.misc = {};
        setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return SendRequestError;
}(Error));
exports.SendRequestError = SendRequestError;
function getDefaultErrorLogger(options) {
    options = options || {};
    var idString = options.idString || "";
    var log = options.log || console.log.bind(console);
    var base = function (socket, methodName, params) { return [
        ("[ Sip API " + idString + " call Error ]").red,
        methodName,
        socket.localAddress + ":" + socket.localPort + " (local)",
        "=>",
        socket.remoteAddress + ":" + socket.remotePort + " (remote)",
        "\n",
        "params: " + JSON.stringify(params) + "\n",
    ].join(" "); };
    return {
        "onRequestNotSent": function (methodName, params, socket) {
            return log(base(socket, methodName, params) + "Request not sent");
        },
        "onClosedConnection": function (methodName, params, socket) {
            return log(base(socket, methodName, params) + "Remote connection lost");
        },
        "onRequestTimeout": function (methodName, params, timeoutValue, socket) {
            return log(base(socket, methodName, params) + "Request timeout after " + timeoutValue + "ms");
        },
        "onMalformedResponse": function (methodName, params, rawResponse, socket) {
            return log(base(socket, methodName, params) + "Malformed response\nrawResponse: " + rawResponse);
        }
    };
}
exports.getDefaultErrorLogger = getDefaultErrorLogger;

},{"../misc":100,"./ApiMessage":92,"setprototypeof":78}],95:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Server_1 = require("./Server");
exports.Server = Server_1.Server;
var client = require("./client");
exports.client = client;

},{"./Server":93,"./client":94}],96:[function(require,module,exports){
(function (Buffer){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("./legacy/sip");
var _sdp_ = require("./legacy/sdp");
var setPrototypeOf = require("setprototypeof");
function makeStreamParser(handler, floodHandler) {
    var streamParser = (function () {
        if (!floodHandler) {
            return sip.makeStreamParser(handler);
        }
        else {
            var onFlood_1 = floodHandler.onFlood, maxBytesHeaders_1 = floodHandler.maxBytesHeaders, maxContentLength_1 = floodHandler.maxContentLength;
            return sip.makeStreamParser(handler, function (dataAsBinaryStr, floodType) { return onFlood_1(new makeStreamParser.FloodError(floodType, Buffer.from(dataAsBinaryStr, "binary"), maxBytesHeaders_1, maxContentLength_1)); }, maxBytesHeaders_1, maxContentLength_1);
        }
    })();
    return function (data) { return streamParser(data.toString("binary")); };
}
exports.makeStreamParser = makeStreamParser;
(function (makeStreamParser) {
    var FloodError = /** @class */ (function (_super) {
        __extends(FloodError, _super);
        function FloodError(floodType, data, maxBytesHeaders, maxContentLength) {
            var _newTarget = this.constructor;
            var _this = _super.call(this, (function () {
                switch (floodType) {
                    case "HEADERS":
                        return "Sip Headers length > " + maxBytesHeaders + " Bytes";
                    case "CONTENT":
                        return "Sip content length > " + maxContentLength + " Bytes";
                }
            })()) || this;
            _this.floodType = floodType;
            _this.data = data;
            _this.maxBytesHeaders = maxBytesHeaders;
            _this.maxContentLength = maxContentLength;
            setPrototypeOf(_this, _newTarget.prototype);
            return _this;
        }
        FloodError.prototype.toString = function () {
            return [
                "SIP Socket flood: " + this.message,
                "cause: " + this.floodType,
                "data ( as binary string ): >" + this.data.toString("binary") + "<"
            ].join("\n");
        };
        return FloodError;
    }(Error));
    makeStreamParser.FloodError = FloodError;
})(makeStreamParser = exports.makeStreamParser || (exports.makeStreamParser = {}));
function toData(sipPacket) {
    var dataAsBinaryString = sip.stringify(sipPacket);
    return Buffer.from(dataAsBinaryString, "binary");
}
exports.toData = toData;
//** Can throw */
exports.parse = function (data) {
    var sipPacket = sip.parse(data.toString("binary"));
    if (!sipPacket) {
        throw new Error("Can't parse SIP packet");
    }
    return sipPacket;
};
exports.parseUri = sip.parseUri;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parseSdp = _sdp_.parse;
exports.stringifySdp = _sdp_.stringify;

}).call(this,require("buffer").Buffer)
},{"./legacy/sdp":98,"./legacy/sip":99,"buffer":3,"setprototypeof":78}],97:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./core"));
__export(require("./Socket"));
__export(require("./misc"));
var api = require("./api");
exports.api = api;

},{"./Socket":91,"./api":95,"./core":96,"./misc":100}],98:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parsers = {
    o: function (o) {
        var t = o.split(/\s+/);
        return {
            username: t[0],
            id: t[1],
            version: t[2],
            nettype: t[3],
            addrtype: t[4],
            address: t[5]
        };
    },
    c: function (c) {
        var t = c.split(/\s+/);
        return { nettype: t[0], addrtype: t[1], address: t[2] };
    },
    m: function (m) {
        var t = /^(\w+) +(\d+)(?:\/(\d))? +(\S+) (\d+( +\d+)*)/.exec(m);
        return {
            media: t[1],
            port: +t[2],
            portnum: +(t[3] || 1),
            proto: t[4],
            fmt: t[5].split(/\s+/).map(function (x) { return +x; })
        };
    },
    a: function (a) {
        return a;
    }
};
function parse(sdp) {
    var sdp = sdp.split(/\r\n/);
    var root = {};
    var m;
    root.m = [];
    for (var i = 0; i < sdp.length; ++i) {
        var tmp = /^(\w)=(.*)/.exec(sdp[i]);
        if (tmp) {
            var c = (parsers[tmp[1]] || function (x) { return x; })(tmp[2]);
            switch (tmp[1]) {
                case 'm':
                    if (m)
                        root.m.push(m);
                    m = c;
                    break;
                case 'a':
                    var o = (m || root);
                    if (o.a === undefined)
                        o.a = [];
                    o.a.push(c);
                    break;
                default:
                    (m || root)[tmp[1]] = c;
                    break;
            }
        }
    }
    if (m)
        root.m.push(m);
    return root;
}
exports.parse = parse;
;
var stringifiers = {
    o: function (o) {
        return [o.username || '-', o.id, o.version, o.nettype || 'IN', o.addrtype || 'IP4', o.address].join(' ');
    },
    c: function (c) {
        return [c.nettype || 'IN', c.addrtype || 'IP4', c.address].join(' ');
    },
    m: function (m) {
        return [m.media || 'audio', m.port, m.proto || 'RTP/AVP', m.fmt.join(' ')].join(' ');
    }
};
function stringifyParam(sdp, type, def) {
    if (sdp[type] !== undefined) {
        var stringifier = function (x) { return type + '=' + ((stringifiers[type] && stringifiers[type](x)) || x) + '\r\n'; };
        if (Array.isArray(sdp[type]))
            return sdp[type].map(stringifier).join('');
        return stringifier(sdp[type]);
    }
    if (def !== undefined)
        return type + '=' + def + '\r\n';
    return '';
}
function stringify(sdp) {
    var s = '';
    s += stringifyParam(sdp, 'v', 0);
    s += stringifyParam(sdp, 'o');
    s += stringifyParam(sdp, 's', '-');
    s += stringifyParam(sdp, 'i');
    s += stringifyParam(sdp, 'u');
    s += stringifyParam(sdp, 'e');
    s += stringifyParam(sdp, 'p');
    s += stringifyParam(sdp, 'c');
    s += stringifyParam(sdp, 'b');
    s += stringifyParam(sdp, 't', '0 0');
    s += stringifyParam(sdp, 'r');
    s += stringifyParam(sdp, 'z');
    s += stringifyParam(sdp, 'k');
    s += stringifyParam(sdp, 'a');
    sdp.m.forEach(function (m) {
        s += stringifyParam({ m: m }, 'm');
        s += stringifyParam(m, 'i');
        s += stringifyParam(m, 'c');
        s += stringifyParam(m, 'b');
        s += stringifyParam(m, 'k');
        s += stringifyParam(m, 'a');
    });
    return s;
}
exports.stringify = stringify;

},{}],99:[function(require,module,exports){
"use strict";
/** Trim from sip.js project */
Object.defineProperty(exports, "__esModule", { value: true });
// Actual stack code begins here
function parseResponse(rs, m) {
    var r = rs.match(/^SIP\/(\d+\.\d+)\s+(\d+)\s*(.*)\s*$/);
    if (r) {
        m.version = r[1];
        m.status = +r[2];
        m.reason = r[3];
        return m;
    }
}
function parseRequest(rq, m) {
    var r = rq.match(/^([\w\-.!%*_+`'~]+)\s([^\s]+)\sSIP\s*\/\s*(\d+\.\d+)/);
    if (r) {
        m.method = unescape(r[1]);
        m.uri = r[2];
        m.version = r[3];
        return m;
    }
}
function applyRegex(regex, data) {
    regex.lastIndex = data.i;
    var r = regex.exec(data.s);
    if (r && (r.index === data.i)) {
        data.i = regex.lastIndex;
        return r;
    }
}
function parseParams(data, hdr) {
    hdr.params = hdr.params || {};
    var re = /\s*;\s*([\w\-.!%*_+`'~]+)(?:\s*=\s*([\w\-.!%*_+`'~]+|"[^"\\]*(\\.[^"\\]*)*"))?/g;
    for (var r = applyRegex(re, data); r; r = applyRegex(re, data)) {
        hdr.params[r[1].toLowerCase()] = r[2] || null;
    }
    return hdr;
}
function parseMultiHeader(parser, d, h) {
    h = h || [];
    var re = /\s*,\s*/g;
    do {
        h.push(parser(d));
    } while (d.i < d.s.length && applyRegex(re, d));
    return h;
}
function parseGenericHeader(d, h) {
    return h ? h + ',' + d.s : d.s;
}
function parseAOR(data) {
    var r = applyRegex(/((?:[\w\-.!%*_+`'~]+)(?:\s+[\w\-.!%*_+`'~]+)*|"[^"\\]*(?:\\.[^"\\]*)*")?\s*\<\s*([^>]*)\s*\>|((?:[^\s@"<]@)?[^\s;]+)/g, data);
    return parseParams(data, { name: r[1], uri: r[2] || r[3] || '' });
}
exports.parseAOR = parseAOR;
function parseAorWithUri(data) {
    var r = parseAOR(data);
    r.uri = parseUri(r.uri);
    return r;
}
function parseVia(data) {
    var r = applyRegex(/SIP\s*\/\s*(\d+\.\d+)\s*\/\s*([\S]+)\s+([^\s;:]+)(?:\s*:\s*(\d+))?/g, data);
    return parseParams(data, { version: r[1], protocol: r[2], host: r[3], port: r[4] && +r[4] });
}
function parseCSeq(d) {
    var r = /(\d+)\s*([\S]+)/.exec(d.s);
    if (r === null) {
        throw new Error("CSeq can't be parsed");
    }
    return { seq: +r[1], method: unescape(r[2]) };
}
function parseAuthHeader(d) {
    var r1 = applyRegex(/([^\s]*)\s+/g, d);
    var a = { scheme: r1[1] };
    var r2 = applyRegex(/([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d);
    a[r2[1]] = r2[2];
    while (r2 = applyRegex(/,\s*([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d)) {
        a[r2[1]] = r2[2];
    }
    return a;
}
function parseAuthenticationInfoHeader(d) {
    var a = {};
    var r = applyRegex(/([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d);
    a[r[1]] = r[2];
    while (r = applyRegex(/,\s*([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d)) {
        a[r[1]] = r[2];
    }
    return a;
}
var compactForm = {
    i: 'call-id',
    m: 'contact',
    e: 'contact-encoding',
    l: 'content-length',
    c: 'content-type',
    f: 'from',
    s: 'subject',
    k: 'supported',
    t: 'to',
    v: 'via'
};
var parsers = {
    'to': parseAOR,
    'from': parseAOR,
    'contact': function (v, h) {
        if (v == '*')
            return v;
        else
            return parseMultiHeader(parseAOR, v, h);
    },
    'route': parseMultiHeader.bind(0, parseAorWithUri),
    'record-route': parseMultiHeader.bind(0, parseAorWithUri),
    'path': parseMultiHeader.bind(0, parseAorWithUri),
    'cseq': parseCSeq,
    'content-length': function (v) { return +v.s; },
    'via': parseMultiHeader.bind(0, parseVia),
    'www-authenticate': parseMultiHeader.bind(0, parseAuthHeader),
    'proxy-authenticate': parseMultiHeader.bind(0, parseAuthHeader),
    'authorization': parseMultiHeader.bind(0, parseAuthHeader),
    'proxy-authorization': parseMultiHeader.bind(0, parseAuthHeader),
    'authentication-info': parseAuthenticationInfoHeader,
    'refer-to': parseAOR
};
/** Can throw */
function parse(data) {
    data = data.split(/\r\n(?![ \t])/);
    if (data[0] === '')
        return;
    var m = {};
    if (!(parseResponse(data[0], m) || parseRequest(data[0], m)))
        return;
    m.headers = {};
    for (var i = 1; i < data.length; ++i) {
        var r = data[i].match(/^([\S]*?)\s*:\s*([\s\S]*)$/);
        if (!r) {
            return;
        }
        var name = unescape(r[1]).toLowerCase();
        name = compactForm[name] || name;
        m.headers[name] = (parsers[name] || parseGenericHeader)({ s: r[2], i: 0 }, m.headers[name]);
    }
    return m;
}
function parseUri(s) {
    if (typeof s === 'object')
        return s;
    var re = /^(sips?):(?:([^\s>:@]+)(?::([^\s@>]+))?@)?([\w\-\.]+)(?::(\d+))?((?:;[^\s=\?>;]+(?:=[^\s?\;]+)?)*)(?:\?(([^\s&=>]+=[^\s&=>]+)(&[^\s&=>]+=[^\s&=>]+)*))?$/;
    var r = re.exec(s);
    if (r) {
        return {
            schema: r[1],
            user: r[2],
            password: r[3],
            host: r[4],
            port: +r[5],
            params: (r[6].match(/([^;=]+)(=([^;=]+))?/g) || [])
                .map(function (s) { return s.split('='); })
                .reduce(function (params, x) { params[x[0]] = x[1] || null; return params; }, {}),
            headers: ((r[7] || '').match(/[^&=]+=[^&=]+/g) || [])
                .map(function (s) { return s.split('='); })
                .reduce(function (params, x) { params[x[0]] = x[1]; return params; }, {})
        };
    }
}
exports.parseUri = parseUri;
function stringifyVersion(v) {
    return v || '2.0';
}
function stringifyParams(params) {
    var s = '';
    for (var n in params) {
        s += ';' + n + (params[n] ? '=' + params[n] : '');
    }
    return s;
}
function stringifyUri(uri) {
    if (typeof uri === 'string')
        return uri;
    var s = (uri.schema || 'sip') + ':';
    if (uri.user) {
        if (uri.password)
            s += uri.user + ':' + uri.password + '@';
        else
            s += uri.user + '@';
    }
    s += uri.host;
    if (uri.port)
        s += ':' + uri.port;
    if (uri.params)
        s += stringifyParams(uri.params);
    if (uri.headers) {
        var h = Object.keys(uri.headers).map(function (x) { return x + '=' + uri.headers[x]; }).join('&');
        if (h.length)
            s += '?' + h;
    }
    return s;
}
exports.stringifyUri = stringifyUri;
function stringifyAOR(aor) {
    return (aor.name || '') + ' <' + stringifyUri(aor.uri) + '>' + stringifyParams(aor.params);
}
function stringifyAuthHeader(a) {
    var s = [];
    for (var n in a) {
        if (n !== 'scheme' && a[n] !== undefined) {
            s.push(n + '=' + a[n]);
        }
    }
    return a.scheme ? a.scheme + ' ' + s.join(',') : s.join(',');
}
exports.stringifyAuthHeader = stringifyAuthHeader;
var stringifiers = {
    via: function (h) {
        return h.map(function (via) {
            if (via.host) {
                return 'Via: SIP/' + stringifyVersion(via.version) + '/' + via.protocol.toUpperCase() + ' ' + via.host + (via.port ? ':' + via.port : '') + stringifyParams(via.params) + '\r\n';
            }
            else {
                return '';
            }
        }).join('');
    },
    to: function (h) {
        return 'To: ' + stringifyAOR(h) + '\r\n';
    },
    from: function (h) {
        return 'From: ' + stringifyAOR(h) + '\r\n';
    },
    contact: function (h) {
        return 'Contact: ' + ((h !== '*' && h.length) ? h.map(stringifyAOR).join(', ') : '*') + '\r\n';
    },
    route: function (h) {
        return h.length ? 'Route: ' + h.map(stringifyAOR).join(', ') + '\r\n' : '';
    },
    'record-route': function (h) {
        return h.map(function (x) { return 'Record-Route: ' + stringifyAOR(x) + '\r\n'; }).join('');
    },
    'path': function (h) {
        return h.length ? 'Path: ' + h.map(stringifyAOR).join(', ') + '\r\n' : '';
    },
    cseq: function (cseq) {
        return 'CSeq: ' + cseq.seq + ' ' + cseq.method + '\r\n';
    },
    'www-authenticate': function (h) {
        return h.map(function (x) { return 'WWW-Authenticate: ' + stringifyAuthHeader(x) + '\r\n'; }).join('');
    },
    'proxy-authenticate': function (h) {
        return h.map(function (x) { return 'Proxy-Authenticate: ' + stringifyAuthHeader(x) + '\r\n'; }).join('');
    },
    'authorization': function (h) {
        return h.map(function (x) { return 'Authorization: ' + stringifyAuthHeader(x) + '\r\n'; }).join('');
    },
    'proxy-authorization': function (h) {
        return h.map(function (x) { return 'Proxy-Authorization: ' + stringifyAuthHeader(x) + '\r\n'; }).join('');
        ;
    },
    'authentication-info': function (h) {
        return 'Authentication-Info: ' + stringifyAuthHeader(h) + '\r\n';
    },
    'refer-to': function (h) { return 'Refer-To: ' + stringifyAOR(h) + '\r\n'; }
};
function prettifyHeaderName(s) {
    if (s == 'call-id')
        return 'Call-ID';
    return s.replace(/\b([a-z])/g, function (a) { return a.toUpperCase(); });
}
function stringify(m) {
    var s;
    if (m.status) {
        s = 'SIP/' + stringifyVersion(m.version) + ' ' + m.status + ' ' + m.reason + '\r\n';
    }
    else {
        s = m.method + ' ' + stringifyUri(m.uri) + ' SIP/' + stringifyVersion(m.version) + '\r\n';
    }
    m.headers['content-length'] = (m.content || '').length;
    for (var n in m.headers) {
        if (typeof m.headers[n] !== "undefined") {
            if (typeof m.headers[n] === 'string' || !stringifiers[n])
                s += prettifyHeaderName(n) + ': ' + m.headers[n] + '\r\n';
            else
                s += stringifiers[n](m.headers[n], n);
        }
    }
    s += '\r\n';
    if (m.content)
        s += m.content;
    return s;
}
exports.stringify = stringify;
/**
 *
 * @param onMessage: (sipPacket: types.Packet) => void
 * @param onFlood?: (dataAsBinaryString: string, floodType: "HEADERS" | "CONTENT")=> void
 * @param maxBytesHeaders?: number
 * @param maxContentLength?: number
 *
 * return (dataAsBinaryString: string)=> void;
 *
 * if onFlood is undefined no flood detection will be enabled.
 *
 */
function makeStreamParser(onMessage, onFlood, maxBytesHeaders, maxContentLength) {
    maxBytesHeaders = maxBytesHeaders || 60480;
    maxContentLength = maxContentLength || 604800;
    var m;
    var r = '';
    var _onFlood = function () {
        onFlood.apply(null, arguments);
        r = '';
    };
    function headers(data) {
        r += data;
        var a = r.match(/^\s*([\S\s]*?)\r\n\r\n([\S\s]*)$/);
        if (!!a) {
            r = a[2];
            if (!!onFlood && a[1].length > maxBytesHeaders) {
                _onFlood(a.input, "HEADERS");
                return;
            }
            m = parse(a[1]);
            if (m && m.headers['content-length'] !== undefined) {
                if (!!onFlood && m.headers['content-length'] > maxContentLength) {
                    _onFlood(a.input, "CONTENT");
                    return;
                }
                state = content;
                content('');
            }
            else
                headers('');
        }
        else if (!!onFlood && r.length > maxBytesHeaders) {
            _onFlood(r, "HEADERS");
        }
    }
    function content(data) {
        r += data;
        var contentLength = m.headers['content-length'];
        if (r.length >= contentLength) {
            m.content = r.substring(0, contentLength);
            onMessage(m);
            var s = r.substring(contentLength);
            state = headers;
            r = '';
            headers(s);
        }
    }
    var state = headers;
    return function (data) { state(data); };
}
exports.makeStreamParser = makeStreamParser;
/** Can throw, can return undefined */
function parseMessage(s) {
    var r = s.toString('binary').match(/^\s*([\S\s]*?)\r\n\r\n([\S\s]*)$/);
    if (r) {
        var m = parse(r[1]);
        if (m) {
            if (m.headers['content-length']) {
                var c = Math.max(0, Math.min(m.headers['content-length'], r[2].length));
                m.content = r[2].substring(0, c);
            }
            else {
                m.content = r[2];
            }
            if (!m.headers.via) {
                m.headers.via = [];
            }
            return m;
        }
    }
}
exports.parse = parseMessage;
//TODO: use
function checkMessage(msg) {
    return (msg.method || (msg.status >= 100 && msg.status <= 999)) &&
        msg.headers &&
        Array.isArray(msg.headers.via) &&
        msg.headers.via.length > 0 &&
        msg.headers['call-id'] &&
        msg.headers.to &&
        msg.headers.from &&
        msg.headers.cseq;
}
exports.checkMessage = checkMessage;
//transaction layer
function generateBranch() {
    return ['z9hG4bK', Math.round(Math.random() * 1000000)].join('');
}
exports.generateBranch = generateBranch;

},{}],100:[function(require,module,exports){
(function (Buffer){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var core = require("./core");
//export const regIdKey = "reg-id";
//export const instanceIdKey = "+sip.instance";
/** For debug purpose only, assume sipPacket content is UTF-8 encoded text */
function stringify(sipPacket) {
    return core.toData(sipPacket).toString("utf8");
}
exports.stringify = stringify;
function matchRequest(sipPacket) {
    return "method" in sipPacket;
}
exports.matchRequest = matchRequest;
function clonePacket(sipPacket) {
    return core.parse(core.toData(sipPacket));
}
exports.clonePacket = clonePacket;
function setPacketContent(sipPacket, data) {
    if (typeof data === "string") {
        data = Buffer.from(data, "utf8");
    }
    sipPacket.headers["content-length"] = data.byteLength;
    sipPacket.content = data.toString("binary");
}
exports.setPacketContent = setPacketContent;
/** Get the RAW content as buffer */
function getPacketContent(sipPacket) {
    return Buffer.from(sipPacket.content, "binary");
}
exports.getPacketContent = getPacketContent;
function readSrflxAddrInSdp(sdp) {
    var e_1, _a, e_2, _b;
    try {
        for (var _c = __values(core.parseSdp(sdp).m), _d = _c.next(); !_d.done; _d = _c.next()) {
            var m_i = _d.value;
            if (m_i.media !== "audio")
                continue;
            try {
                for (var _e = (e_2 = void 0, __values(m_i.a)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var a_i = _f.value;
                    var match = a_i.match(/^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/);
                    if (match)
                        return match[1];
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return undefined;
}
exports.readSrflxAddrInSdp = readSrflxAddrInSdp;
function isPlainMessageRequest(sipRequest, withAuth) {
    if (withAuth === void 0) { withAuth = undefined; }
    return (sipRequest.method === "MESSAGE" &&
        (!withAuth || "authorization" in sipRequest.headers) &&
        sipRequest.headers["content-type"].toLowerCase().match(/^text\/plain/));
}
exports.isPlainMessageRequest = isPlainMessageRequest;
function parsePath(path) {
    var message = core.parse(Buffer.from([
        "DUMMY _ SIP/2.0",
        "Path: " + path,
        "\r\n"
    ].join("\r\n"), "utf8"));
    return message.headers.path;
}
exports.parsePath = parsePath;
function stringifyPath(parsedPath) {
    var message = core.parse(Buffer.from([
        "DUMMY _ SIP/2.0",
        "\r\n"
    ].join("\r\n"), "utf8"));
    message.headers.path = parsedPath;
    return core.toData(message).toString("utf8").match(/\r\nPath:\ +(.*)\r\n/)[1];
}
exports.stringifyPath = stringifyPath;
function parseOptionTags(headerFieldValue) {
    if (!headerFieldValue) {
        return [];
    }
    return headerFieldValue.split(",").map(function (optionTag) { return optionTag.replace(/\s/g, ""); });
}
exports.parseOptionTags = parseOptionTags;
function hasOptionTag(headers, headerField, optionTag) {
    var headerFieldValue = headers[headerField];
    var optionTags = parseOptionTags(headerFieldValue);
    return optionTags.indexOf(optionTag) >= 0;
}
exports.hasOptionTag = hasOptionTag;
/** Do nothing if already present */
function addOptionTag(headers, headerField, optionTag) {
    if (hasOptionTag(headers, headerField, optionTag)) {
        return;
    }
    var optionTags = parseOptionTags(headers[headerField]);
    optionTags.push(optionTag);
    headers[headerField] = optionTags.join(", ");
}
exports.addOptionTag = addOptionTag;
function filterSdpCandidates(keep, sdp) {
    var e_3, _a;
    var shouldKeepCandidate = function (candidateLine) {
        return ((keep.host && !!candidateLine.match(/host/)) ||
            (keep.srflx && !!candidateLine.match(/srflx/)) ||
            (keep.relay && !!candidateLine.match(/relay/)));
    };
    var parsedSdp = core.parseSdp(sdp);
    var arr = parsedSdp.m[0].a;
    try {
        for (var _b = __values(__spread(arr)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var line = _c.value;
            if (!line.match(/^candidate/))
                continue;
            if (!shouldKeepCandidate(line)) {
                arr.splice(arr.indexOf(line), 1);
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return core.stringifySdp(sdp);
}
exports.filterSdpCandidates = filterSdpCandidates;
function getContact(sipRequest) {
    if (!sipRequest.headers.contact || !sipRequest.headers.contact.length) {
        return undefined;
    }
    return sipRequest.headers.contact[0];
}
exports.getContact = getContact;
function isResponse(sipRequestNextHop, sipResponse) {
    return sipResponse.headers.via[0].params["branch"] ===
        sipRequestNextHop.headers.via[0].params["branch"];
}
exports.isResponse = isResponse;
function buildNextHopPacket(socket, sipPacketAsReceived) {
    var sipPacketNextHop = clonePacket(sipPacketAsReceived);
    if (matchRequest(sipPacketNextHop)) {
        var sipRequestNextHop = sipPacketNextHop;
        buildNextHopPacket.popRoute(sipRequestNextHop);
        if (sipRequestNextHop.method === "REGISTER") {
            var sipRequestRegister = sipRequestNextHop;
            buildNextHopPacket.pushPath(socket, sipRequestRegister);
        }
        else {
            if (getContact(sipRequestNextHop)) {
                buildNextHopPacket.pushRecordRoute(socket, sipRequestNextHop);
            }
        }
        buildNextHopPacket.pushVia(socket, sipRequestNextHop);
        buildNextHopPacket.decrementMaxForward(sipRequestNextHop);
    }
    else {
        var sipResponseNextHop = sipPacketNextHop;
        buildNextHopPacket.rewriteRecordRoute(socket, sipResponseNextHop);
        buildNextHopPacket.popVia(sipResponseNextHop);
    }
    return sipPacketNextHop;
}
exports.buildNextHopPacket = buildNextHopPacket;
/** pop and shift refer to stack operations */
(function (buildNextHopPacket) {
    function buildLocalAoRWithParsedUri(socket) {
        return {
            "uri": __assign({}, core.parseUri("sip:" + socket.localAddress + ":" + socket.localPort), { "params": {
                    "transport": socket.protocol,
                    "lr": null
                } }),
            "params": {}
        };
    }
    function popRoute(sipRequest) {
        if (!sipRequest.headers.route) {
            return;
        }
        sipRequest.headers.route.shift();
        //For tests
        if (!sipRequest.headers.route.length) {
            delete sipRequest.headers.route;
        }
    }
    buildNextHopPacket.popRoute = popRoute;
    function pushPath(socket, sipRequestRegister) {
        addOptionTag(sipRequestRegister.headers, "supported", "path");
        if (!sipRequestRegister.headers.path) {
            sipRequestRegister.headers.path = [];
        }
        sipRequestRegister.headers.path.unshift(buildLocalAoRWithParsedUri(socket));
    }
    buildNextHopPacket.pushPath = pushPath;
    function pushRecordRoute(socket, sipRequest) {
        if (!sipRequest.headers["record-route"]) {
            sipRequest.headers["record-route"] = [];
        }
        sipRequest.headers["record-route"].unshift(buildLocalAoRWithParsedUri(socket));
    }
    buildNextHopPacket.pushRecordRoute = pushRecordRoute;
    function pushVia(socket, sipRequest) {
        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": socket.protocol,
            "host": socket.localAddress,
            "port": socket.localPort,
            "params": {
                "branch": (function () {
                    var via = sipRequest.headers.via;
                    return via.length ? "z9hG4bK-" + via[0].params["branch"] : core.generateBranch();
                })(),
                "rport": null
            }
        });
    }
    buildNextHopPacket.pushVia = pushVia;
    function popVia(sipResponse) {
        sipResponse.headers.via.shift();
    }
    buildNextHopPacket.popVia = popVia;
    /** Need to be called before Via is poped */
    function rewriteRecordRoute(socket, sipResponse) {
        var recordRoute = sipResponse.headers["record-route"];
        if (recordRoute) {
            recordRoute[recordRoute.length - sipResponse.headers.via.length + 1] = buildLocalAoRWithParsedUri(socket);
        }
    }
    buildNextHopPacket.rewriteRecordRoute = rewriteRecordRoute;
    function decrementMaxForward(sipRequest) {
        var maxForwards = parseInt(sipRequest.headers["max-forwards"]);
        if (isNaN(maxForwards)) {
            throw new Error("Max-Forwards not defined");
        }
        sipRequest.headers["max-forwards"] = "" + (maxForwards - 1);
    }
    buildNextHopPacket.decrementMaxForward = decrementMaxForward;
})(buildNextHopPacket = exports.buildNextHopPacket || (exports.buildNextHopPacket = {}));

}).call(this,require("buffer").Buffer)
},{"./core":96,"buffer":3}],101:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var urlSafeBase64encoderDecoder_1 = require("./urlSafeBase64encoderDecoder");
var RegistrationParams;
(function (RegistrationParams) {
    var key = "registration_params";
    /** returns registration_params=eyJ1c2VyRW1haWwiOiJqb3...cWw__ */
    function build(registrationParams) {
        return key + "=" + urlSafeBase64encoderDecoder_1.urlSafeB64.enc(JSON.stringify(registrationParams));
    }
    RegistrationParams.build = build;
    function parse(contactUirParams, contactAorParams) {
        return JSON.parse(urlSafeBase64encoderDecoder_1.urlSafeB64.dec((contactUirParams[key] || contactAorParams[key])));
    }
    RegistrationParams.parse = parse;
})(RegistrationParams = exports.RegistrationParams || (exports.RegistrationParams = {}));
;

},{"./urlSafeBase64encoderDecoder":104}],102:[function(require,module,exports){
"use strict";
/* NOTE: Used in the browser. */
Object.defineProperty(exports, "__esModule", { value: true });
var serializer_1 = require("crypto-lib/dist/async/serializer");
var urlSafeBase64encoderDecoder_1 = require("./urlSafeBase64encoderDecoder");
//NOTE: Transpiled to ES3.
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
//NOTE: Exported for semasim-mobile
var getIndexedHeaderName = function (i) { return "Bundled-Data-" + i; };
function smuggleBundledDataInHeaders(data, encryptor, headers) {
    if (headers === void 0) { headers = {}; }
    var followUp = function (value) {
        var split = stringTransform.textSplit(125, urlSafeBase64encoderDecoder_1.urlSafeB64.enc(value));
        for (var i = 0; i < split.length; i++) {
            headers[getIndexedHeaderName(i)] = split[i];
        }
        return headers;
    };
    var prValueOrValue = serializer_1.stringifyThenEncryptFactory(encryptor)(data);
    return (typeof prValueOrValue === "string" ?
        followUp(prValueOrValue) :
        prValueOrValue.then(function (value) { return followUp(value); }));
}
exports.smuggleBundledDataInHeaders = smuggleBundledDataInHeaders;
var BundledDataSipHeaders;
(function (BundledDataSipHeaders) {
    function build(getHeaderValue) {
        var headersValues = [];
        var i = 0;
        while (true) {
            var headerName = getIndexedHeaderName(i++);
            var headerValue = getHeaderValue(headerName) ||
                getHeaderValue(headerName.toLocaleLowerCase());
            if (!headerValue) {
                break;
            }
            headersValues.push(headerValue);
        }
        return headersValues;
    }
    BundledDataSipHeaders.build = build;
})(BundledDataSipHeaders = exports.BundledDataSipHeaders || (exports.BundledDataSipHeaders = {}));
function extractBundledDataFromHeaders(headers, decryptor) {
    var split = headers instanceof Array ?
        headers :
        BundledDataSipHeaders.build(function (headerName) { return headers[headerName] || null; });
    if (!split.length) {
        throw new Error("No bundled data in header");
    }
    return serializer_1.decryptThenParseFactory(decryptor)(urlSafeBase64encoderDecoder_1.urlSafeB64.dec(split.join("")));
}
exports.extractBundledDataFromHeaders = extractBundledDataFromHeaders;

},{"./urlSafeBase64encoderDecoder":104,"crypto-lib/dist/async/serializer":118,"transfer-tools/dist/lib/stringTransform":134}],103:[function(require,module,exports){
"use strict";
/* NOTE: Used in the browser. */
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var urlSafeBase64encoderDecoder_1 = require("./urlSafeBase64encoderDecoder");
//NOTE: Transpiled to ES5
var sipLibrary = require("ts-sip");
/**
 * Return true if it's a sipRequest originated of UA
 * or if it's a sipResponse of a request originated by UA.
 * */
function isRequestFromClient(sipPacket) {
    return sipPacket.headers.via[sipPacket.headers.via.length - 1].protocol !== "TCP";
}
function readImsi(sipPacket) {
    return sipLibrary.parseUri(sipPacket.headers[isRequestFromClient(sipPacket) ? "from" : "to"].uri).user.match(/^([0-9]{15})/)[1];
}
exports.readImsi = readImsi;
/**
 *
 * connectionId:
 *
 * An uniq id of every UA connection to the backend
 * Should be included in every sip packet.
 * The token enclose a timestamp of when the
 * UA connection to the backend was established,
 * the public address of the UA and the source
 * port the UA used to connect.
 *
 * */
var cid;
(function (cid) {
    /** on backend when ua connect */
    function generate(uaSocket, timestamp) {
        if (timestamp === void 0) { timestamp = Date.now(); }
        return urlSafeBase64encoderDecoder_1.urlSafeB64.enc(timestamp + ":" + uaSocket.remoteAddress + ":" + uaSocket.remotePort);
    }
    cid.generate = generate;
    function parse(connectionId) {
        var _a = __read(urlSafeBase64encoderDecoder_1.urlSafeB64.dec(connectionId).split(":"), 3), a = _a[0], b = _a[1], c = _a[2];
        return {
            "timestamp": parseInt(a),
            "uaSocket": {
                "remoteAddress": b,
                "remotePort": parseInt(c)
            }
        };
    }
    cid.parse = parse;
    var key = "connection_id";
    /**
     * Include a connection id in a sipRequest.
     * This must be applied to every new sip request.
     * ( No need to include the connection id on sip response
     * as it is already present )
     */
    function set(sipRequestNextHop, connectionId) {
        sipRequestNextHop.headers[isRequestFromClient(sipRequestNextHop) ? "from" : "to"].params[key] = connectionId;
    }
    cid.set = set;
    /** Read the connection id */
    function read(sipPacket) {
        return sipPacket.headers[isRequestFromClient(sipPacket) ? "from" : "to"].params[key];
    }
    cid.read = read;
})(cid = exports.cid || (exports.cid = {}));

},{"./urlSafeBase64encoderDecoder":104,"ts-sip":142}],104:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//NOTE: Transpiled to ES3.
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
exports.urlSafeB64 = stringTransform.transcode("base64", {
    "=": "_",
    "/": "-"
});

},{"transfer-tools/dist/lib/stringTransform":134}],105:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPath = "/api";
var version;
(function (version) {
    version.methodName = "version";
})(version = exports.version || (exports.version = {}));

},{}],106:[function(require,module,exports){
/*

The MIT License (MIT)

Original Library
  - Copyright (c) Marak Squires

Additional functionality
 - Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var colors = {};
module['exports'] = colors;

colors.themes = {};

var util = require('util');
var ansiStyles = colors.styles = require('./styles');
var defineProps = Object.defineProperties;
var newLineRegex = new RegExp(/[\r\n]+/g);

colors.supportsColor = require('./system/supports-colors').supportsColor;

if (typeof colors.enabled === 'undefined') {
  colors.enabled = colors.supportsColor() !== false;
}

colors.enable = function() {
  colors.enabled = true;
};

colors.disable = function() {
  colors.enabled = false;
};

colors.stripColors = colors.strip = function(str) {
  return ('' + str).replace(/\x1B\[\d+m/g, '');
};

// eslint-disable-next-line no-unused-vars
var stylize = colors.stylize = function stylize(str, style) {
  if (!colors.enabled) {
    return str+'';
  }

  return ansiStyles[style].open + str + ansiStyles[style].close;
};

var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
var escapeStringRegexp = function(str) {
  if (typeof str !== 'string') {
    throw new TypeError('Expected a string');
  }
  return str.replace(matchOperatorsRe, '\\$&');
};

function build(_styles) {
  var builder = function builder() {
    return applyStyle.apply(builder, arguments);
  };
  builder._styles = _styles;
  // __proto__ is used because we must return a function, but there is
  // no way to create a function with a different prototype.
  builder.__proto__ = proto;
  return builder;
}

var styles = (function() {
  var ret = {};
  ansiStyles.grey = ansiStyles.gray;
  Object.keys(ansiStyles).forEach(function(key) {
    ansiStyles[key].closeRe =
      new RegExp(escapeStringRegexp(ansiStyles[key].close), 'g');
    ret[key] = {
      get: function() {
        return build(this._styles.concat(key));
      },
    };
  });
  return ret;
})();

var proto = defineProps(function colors() {}, styles);

function applyStyle() {
  var args = Array.prototype.slice.call(arguments);

  var str = args.map(function(arg) {
    if (arg !== undefined && arg.constructor === String) {
      return arg;
    } else {
      return util.inspect(arg);
    }
  }).join(' ');

  if (!colors.enabled || !str) {
    return str;
  }

  var newLinesPresent = str.indexOf('\n') != -1;

  var nestedStyles = this._styles;

  var i = nestedStyles.length;
  while (i--) {
    var code = ansiStyles[nestedStyles[i]];
    str = code.open + str.replace(code.closeRe, code.open) + code.close;
    if (newLinesPresent) {
      str = str.replace(newLineRegex, function(match) {
        return code.close + match + code.open;
      });
    }
  }

  return str;
}

colors.setTheme = function(theme) {
  if (typeof theme === 'string') {
    console.log('colors.setTheme now only accepts an object, not a string.  ' +
      'If you are trying to set a theme from a file, it is now your (the ' +
      'caller\'s) responsibility to require the file.  The old syntax ' +
      'looked like colors.setTheme(__dirname + ' +
      '\'/../themes/generic-logging.js\'); The new syntax looks like '+
      'colors.setTheme(require(__dirname + ' +
      '\'/../themes/generic-logging.js\'));');
    return;
  }
  for (var style in theme) {
    (function(style) {
      colors[style] = function(str) {
        if (typeof theme[style] === 'object') {
          var out = str;
          for (var i in theme[style]) {
            out = colors[theme[style][i]](out);
          }
          return out;
        }
        return colors[theme[style]](str);
      };
    })(style);
  }
};

function init() {
  var ret = {};
  Object.keys(styles).forEach(function(name) {
    ret[name] = {
      get: function() {
        return build([name]);
      },
    };
  });
  return ret;
}

var sequencer = function sequencer(map, str) {
  var exploded = str.split('');
  exploded = exploded.map(map);
  return exploded.join('');
};

// custom formatter methods
colors.trap = require('./custom/trap');
colors.zalgo = require('./custom/zalgo');

// maps
colors.maps = {};
colors.maps.america = require('./maps/america')(colors);
colors.maps.zebra = require('./maps/zebra')(colors);
colors.maps.rainbow = require('./maps/rainbow')(colors);
colors.maps.random = require('./maps/random')(colors);

for (var map in colors.maps) {
  (function(map) {
    colors[map] = function(str) {
      return sequencer(colors.maps[map], str);
    };
  })(map);
}

defineProps(colors, init());

},{"./custom/trap":107,"./custom/zalgo":108,"./maps/america":111,"./maps/rainbow":112,"./maps/random":113,"./maps/zebra":114,"./styles":115,"./system/supports-colors":117,"util":9}],107:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"dup":52}],108:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53}],109:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"./colors":106,"dup":54}],110:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"./colors":106,"./extendStringPrototype":109,"dup":55}],111:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],112:[function(require,module,exports){
arguments[4][57][0].apply(exports,arguments)
},{"dup":57}],113:[function(require,module,exports){
module['exports'] = function(colors) {
  var available = ['underline', 'inverse', 'grey', 'yellow', 'red', 'green',
    'blue', 'white', 'cyan', 'magenta'];
  return function(letter, i, exploded) {
    return letter === ' ' ? letter :
      colors[
          available[Math.round(Math.random() * (available.length - 2))]
      ](letter);
  };
};

},{}],114:[function(require,module,exports){
arguments[4][59][0].apply(exports,arguments)
},{"dup":59}],115:[function(require,module,exports){
/*
The MIT License (MIT)

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var styles = {};
module['exports'] = styles;

var codes = {
  reset: [0, 0],

  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],

  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
  grey: [90, 39],

  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgWhite: [47, 49],

  // legacy styles for colors pre v1.0.0
  blackBG: [40, 49],
  redBG: [41, 49],
  greenBG: [42, 49],
  yellowBG: [43, 49],
  blueBG: [44, 49],
  magentaBG: [45, 49],
  cyanBG: [46, 49],
  whiteBG: [47, 49],

};

Object.keys(codes).forEach(function(key) {
  var val = codes[key];
  var style = styles[key] = [];
  style.open = '\u001b[' + val[0] + 'm';
  style.close = '\u001b[' + val[1] + 'm';
});

},{}],116:[function(require,module,exports){
arguments[4][61][0].apply(exports,arguments)
},{"_process":6,"dup":61}],117:[function(require,module,exports){
arguments[4][62][0].apply(exports,arguments)
},{"./has-flag.js":116,"_process":6,"dup":62,"os":5}],118:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var toBuffer_1 = require("../sync/utils/toBuffer");
var ttJC = require("transfer-tools/dist/lib/JSON_CUSTOM");
function matchPromise(prOrValue) {
    return "then" in prOrValue;
}
var stringRepresentationEncoding = "base64";
function stringifyThenEncryptFactory(encryptor) {
    var stringify = ttJC.get().stringify;
    return function stringifyThenEncrypt(value) {
        var prOrValue = encryptor.encrypt(Buffer.from([
            stringify(value),
            (new Array(9 + Math.floor(Math.random() * 20)))
                .fill(" ")
                .join("")
        ].join(""), "utf8"));
        var finalize = function (value) { return toBuffer_1.toBuffer(value).toString(stringRepresentationEncoding); };
        return (matchPromise(prOrValue) ?
            prOrValue.then(function (value) { return finalize(value); }) :
            finalize(prOrValue));
    };
}
exports.stringifyThenEncryptFactory = stringifyThenEncryptFactory;
function decryptThenParseFactory(decryptor) {
    var parse = ttJC.get().parse;
    return function decryptThenParse(encryptedValue) {
        var prOrValue = decryptor.decrypt(Buffer.from(encryptedValue, stringRepresentationEncoding));
        var finalize = function (value) { return parse(toBuffer_1.toBuffer(value).toString("utf8")); };
        return matchPromise(prOrValue) ?
            prOrValue.then(function (value) { return finalize(value); }) :
            finalize(prOrValue);
    };
}
exports.decryptThenParseFactory = decryptThenParseFactory;

}).call(this,require("buffer").Buffer)
},{"../sync/utils/toBuffer":119,"buffer":3,"transfer-tools/dist/lib/JSON_CUSTOM":120}],119:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"buffer":3,"dup":13}],120:[function(require,module,exports){
arguments[4][80][0].apply(exports,arguments)
},{"dup":80,"super-json":133}],121:[function(require,module,exports){
arguments[4][63][0].apply(exports,arguments)
},{"dup":63}],122:[function(require,module,exports){
arguments[4][64][0].apply(exports,arguments)
},{"./implementation":121,"dup":64}],123:[function(require,module,exports){
arguments[4][65][0].apply(exports,arguments)
},{"dup":65,"function-bind":122}],124:[function(require,module,exports){
arguments[4][70][0].apply(exports,arguments)
},{"./lib/alea":125,"./lib/tychei":126,"./lib/xor128":127,"./lib/xor4096":128,"./lib/xorshift7":129,"./lib/xorwow":130,"./seedrandom":131,"dup":70}],125:[function(require,module,exports){
arguments[4][71][0].apply(exports,arguments)
},{"dup":71}],126:[function(require,module,exports){
arguments[4][72][0].apply(exports,arguments)
},{"dup":72}],127:[function(require,module,exports){
arguments[4][73][0].apply(exports,arguments)
},{"dup":73}],128:[function(require,module,exports){
arguments[4][74][0].apply(exports,arguments)
},{"dup":74}],129:[function(require,module,exports){
arguments[4][75][0].apply(exports,arguments)
},{"dup":75}],130:[function(require,module,exports){
arguments[4][76][0].apply(exports,arguments)
},{"dup":76}],131:[function(require,module,exports){
/*
Copyright 2019 David Bau.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

(function (pool, math) {
//
// The following constants are related to IEEE 754 limits.
//

// Detect the global object, even if operating in strict mode.
// http://stackoverflow.com/a/14387057/265298
var global = (0, eval)('this'),
    width = 256,        // each RC4 output is 0 <= x < 256
    chunks = 6,         // at least six RC4 outputs for each double
    digits = 52,        // there are 52 significant digits in a double
    rngname = 'random', // rngname: name for Math.random and Math.seedrandom
    startdenom = math.pow(width, chunks),
    significance = math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1,
    nodecrypto;         // node.js crypto module, initialized at the bottom.

//
// seedrandom()
// This is the seedrandom function described above.
//
function seedrandom(seed, options, callback) {
  var key = [];
  options = (options == true) ? { entropy: true } : (options || {});

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    options.entropy ? [seed, tostring(pool)] :
    (seed == null) ? autoseed() : seed, 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  var prng = function() {
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };

  prng.int32 = function() { return arc4.g(4) | 0; }
  prng.quick = function() { return arc4.g(4) / 0x100000000; }
  prng.double = prng;

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Calling convention: what to return as a function of prng, seed, is_math.
  return (options.pass || callback ||
      function(prng, seed, is_math_call, state) {
        if (state) {
          // Load the arc4 state from the given state if it has an S array.
          if (state.S) { copy(state, arc4); }
          // Only provide the .state method if requested via options.state.
          prng.state = function() { return copy(arc4, {}); }
        }

        // If called as a method of Math (Math.seedrandom()), mutate
        // Math.random because that is how seedrandom.js has worked since v1.0.
        if (is_math_call) { math[rngname] = prng; return seed; }

        // Otherwise, it is a newer calling convention, so return the
        // prng directly.
        else return prng;
      })(
  prng,
  shortseed,
  'global' in options ? options.global : (this == math),
  options.state);
}

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability, the function call below automatically
    // discards an initial batch of values.  This is called RC4-drop[256].
    // See http://google.com/search?q=rsa+fluhrer+response&btnI
  })(width);
}

//
// copy()
// Copies internal state of ARC4 to or from a plain object.
//
function copy(f, t) {
  t.i = f.i;
  t.j = f.j;
  t.S = f.S.slice();
  return t;
};

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj), prop;
  if (depth && typ == 'object') {
    for (prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
    }
  }
  return (result.length ? result : typ == 'string' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto and Node crypto
// module if available.
//
function autoseed() {
  try {
    var out;
    if (nodecrypto && (out = nodecrypto.randomBytes)) {
      // The use of 'out' to remember randomBytes makes tight minified code.
      out = out(width);
    } else {
      out = new Uint8Array(width);
      (global.crypto || global.msCrypto).getRandomValues(out);
    }
    return tostring(out);
  } catch (e) {
    var browser = global.navigator,
        plugins = browser && browser.plugins;
    return [+new Date, global, plugins, global.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to interfere with deterministic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math.random(), pool);

//
// Nodejs and AMD support: export the implementation as a module using
// either convention.
//
if ((typeof module) == 'object' && module.exports) {
  module.exports = seedrandom;
  // When in node.js, try using crypto package for autoseeding.
  try {
    nodecrypto = require('crypto');
  } catch (ex) {}
} else if ((typeof define) == 'function' && define.amd) {
  define(function() { return seedrandom; });
} else {
  // When included as a plain script, set up Math.seedrandom global.
  math['seed' + rngname] = seedrandom;
}


// End anonymous scope, and pass initial values.
})(
  [],     // pool: entropy pool starts empty
  Math    // math: package containing random, pow, and seedrandom
);

},{"crypto":2}],132:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],133:[function(require,module,exports){
arguments[4][79][0].apply(exports,arguments)
},{"dup":79,"has":123}],134:[function(require,module,exports){
arguments[4][82][0].apply(exports,arguments)
},{"buffer":3,"dup":82}],135:[function(require,module,exports){
arguments[4][90][0].apply(exports,arguments)
},{"buffer":3,"dup":90,"ts-events-extended":160}],136:[function(require,module,exports){
arguments[4][91][0].apply(exports,arguments)
},{"./IConnection":135,"./api/ApiMessage":137,"./core":141,"./misc":145,"colors":110,"dup":91,"ts-events-extended":160}],137:[function(require,module,exports){
arguments[4][92][0].apply(exports,arguments)
},{"../core":141,"../misc":145,"buffer":3,"dup":92,"transfer-tools":152}],138:[function(require,module,exports){
arguments[4][93][0].apply(exports,arguments)
},{"../misc":145,"./ApiMessage":137,"colors":110,"dup":93,"util":9}],139:[function(require,module,exports){
arguments[4][94][0].apply(exports,arguments)
},{"../misc":145,"./ApiMessage":137,"dup":94,"setprototypeof":132}],140:[function(require,module,exports){
arguments[4][95][0].apply(exports,arguments)
},{"./Server":138,"./client":139,"dup":95}],141:[function(require,module,exports){
arguments[4][96][0].apply(exports,arguments)
},{"./legacy/sdp":143,"./legacy/sip":144,"buffer":3,"dup":96,"setprototypeof":132}],142:[function(require,module,exports){
arguments[4][97][0].apply(exports,arguments)
},{"./Socket":136,"./api":140,"./core":141,"./misc":145,"dup":97}],143:[function(require,module,exports){
arguments[4][98][0].apply(exports,arguments)
},{"dup":98}],144:[function(require,module,exports){
arguments[4][99][0].apply(exports,arguments)
},{"dup":99}],145:[function(require,module,exports){
arguments[4][100][0].apply(exports,arguments)
},{"./core":141,"buffer":3,"dup":100}],146:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14}],147:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"dup":15}],148:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"minimal-polyfills/dist/lib/WeakMap":150}],149:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"dup":15}],150:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"./Map":149,"dup":16}],151:[function(require,module,exports){
arguments[4][80][0].apply(exports,arguments)
},{"dup":80,"super-json":133}],152:[function(require,module,exports){
arguments[4][81][0].apply(exports,arguments)
},{"./JSON_CUSTOM":151,"./stringTransform":153,"./stringTransformExt":154,"./testing":155,"dup":81}],153:[function(require,module,exports){
arguments[4][82][0].apply(exports,arguments)
},{"buffer":3,"dup":82}],154:[function(require,module,exports){
arguments[4][83][0].apply(exports,arguments)
},{"./stringTransform":153,"dup":83}],155:[function(require,module,exports){
arguments[4][84][0].apply(exports,arguments)
},{"./stringTransform":153,"dup":84,"seedrandom":124}],156:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./SyncEventBase":157,"dup":19}],157:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./SyncEventBaseProtected":158,"dup":20}],158:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./defs":159,"dup":21,"minimal-polyfills/dist/lib/Array.prototype.find":146,"minimal-polyfills/dist/lib/Map":147,"run-exclusive":148}],159:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22,"setprototypeof":132}],160:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./SyncEvent":156,"./defs":159,"dup":23}]},{},[12]);
