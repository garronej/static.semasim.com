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
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

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

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":5}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var environnement_1 = require("../sync/utils/environnement");
var web_1 = require("./WorkerThread/web");
var node_1 = require("./WorkerThread/node");
var simulated_1 = require("./WorkerThread/simulated");
var WorkerThread;
(function (WorkerThread) {
    function factory(source, isMultithreadingEnabled) {
        return function () {
            if (!isMultithreadingEnabled()) {
                return simulated_1.spawn(source);
            }
            if (environnement_1.environnement.type === "LIQUID CORE" || environnement_1.environnement.type === "REACT NATIVE") {
                throw new Error(environnement_1.environnement.type + " cant fork");
            }
            switch (environnement_1.environnement.type) {
                case "BROWSER": return web_1.spawn(source);
                case "NODE": return node_1.spawn(source);
            }
        };
    }
    WorkerThread.factory = factory;
})(WorkerThread = exports.WorkerThread || (exports.WorkerThread = {}));

},{"../sync/utils/environnement":16,"./WorkerThread/node":7,"./WorkerThread/simulated":8,"./WorkerThread/web":10}],7:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var ThreadMessage_1 = require("../../sync/_worker_thread/ThreadMessage");
var path = require("path");
function spawn(source) {
    var child_process = require((function () { return "child_process"; })());
    var fs = require((function () { return "fs"; })());
    var random_file_path = (function () {
        var getRandom = (function () {
            var crypto = require((function () { return "crypto"; })());
            var base_path = (function () {
                var out = path.join("/", "tmp");
                if (!fs.existsSync(out)) {
                    out = path.join(".");
                }
                return out;
            })();
            return function () { return path.join(base_path, ".tmp_crypto-lib_you_can_remove_me_" + crypto
                .randomBytes(4)
                .toString("hex") + ".js"); };
        })();
        var out = getRandom();
        while (fs.existsSync(out)) {
            out = getRandom();
        }
        return out;
    })();
    fs.writeFileSync(random_file_path, Buffer.from([
        "console.log(\"__LOADED__\");",
        "process.title = \"crypto worker\";",
        "var __process_node= process;",
        source
    ].join("\n"), "utf8"));
    var childProcess = child_process.fork(random_file_path, [], { "silent": true });
    childProcess.stdout.once("data", function () { return fs.unlink(random_file_path, function () { }); });
    var evtResponse = new ts_events_extended_1.SyncEvent();
    childProcess.on("message", function (message) { return evtResponse.post(ThreadMessage_1.transfer.restore(message)); });
    return {
        evtResponse: evtResponse,
        "send": function (action) { return childProcess.send(ThreadMessage_1.transfer.prepare(action)); },
        "terminate": function () { return childProcess.kill(); }
    };
}
exports.spawn = spawn;

}).call(this,require("buffer").Buffer)
},{"../../sync/_worker_thread/ThreadMessage":13,"buffer":2,"path":4,"ts-events-extended":33}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var runTask_1 = require("./simulated/runTask");
function spawn(source) {
    var evtResponse = new ts_events_extended_1.SyncEvent();
    var actionListener;
    //@ts-ignore
    var __simulatedMainThreadApi = {
        "sendResponse": function (response) { return setTimeout(function () { return evtResponse.post(response); }, 0); },
        "setActionListener": function (actionListener_) { return actionListener = actionListener_; }
    };
    eval(source);
    return {
        evtResponse: evtResponse,
        "send": function (action) { return runTask_1.default(function () { return actionListener(action); }); },
        "terminate": function () { }
    };
}
exports.spawn = spawn;

},{"./simulated/runTask":9,"ts-events-extended":33}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var runTask = function (task) { return task(); };
exports.default = runTask;

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
function spawn(source) {
    var evtResponse = new ts_events_extended_1.SyncEvent();
    var worker = new Worker(URL.createObjectURL(new Blob([source], { "type": 'text/javascript' })));
    worker.addEventListener("message", function (_a) {
        var data = _a.data;
        return evtResponse.post(data);
    });
    return {
        evtResponse: evtResponse,
        "send": function (action, transfer) {
            worker.postMessage(action, transfer || []);
        },
        "terminate": function () { return worker.terminate(); }
    };
}
exports.spawn = spawn;

},{"ts-events-extended":33}],11:[function(require,module,exports){
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
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var Map_1 = require("minimal-polyfills/dist/lib/Map");
var Set_1 = require("minimal-polyfills/dist/lib/Set");
require("minimal-polyfills/dist/lib/Array.from");
var runExclusive = require("run-exclusive");
var WorkerThread_1 = require("./WorkerThread");
var environnement_1 = require("../sync/utils/environnement");
var bundle_source = (function () {
    
    var path = require("path");
    return Buffer("KGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9ImZ1bmN0aW9uIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoIkNhbm5vdCBmaW5kIG1vZHVsZSAnIitpKyInIik7dGhyb3cgYS5jb2RlPSJNT0RVTEVfTk9UX0ZPVU5EIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9ImZ1bmN0aW9uIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXsidXNlIHN0cmljdCI7T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIl9fZXNNb2R1bGUiLHt2YWx1ZTp0cnVlfSk7dmFyIGVudmlyb25uZW1lbnRfMT1yZXF1aXJlKCIuLi91dGlscy9lbnZpcm9ubmVtZW50Iik7dmFyIHRvQnVmZmVyXzE9cmVxdWlyZSgiLi4vdXRpbHMvdG9CdWZmZXIiKTt2YXIgdHJhbnNmZXI7KGZ1bmN0aW9uKHRyYW5zZmVyKXt2YXIgU2VyaWFsaXphYmxlVWludDhBcnJheTsoZnVuY3Rpb24oU2VyaWFsaXphYmxlVWludDhBcnJheSl7ZnVuY3Rpb24gbWF0Y2godmFsdWUpe3JldHVybiB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCYmdmFsdWUudHlwZT09PSJVaW50OEFycmF5IiYmdHlwZW9mIHZhbHVlLmRhdGE9PT0ic3RyaW5nIn1TZXJpYWxpemFibGVVaW50OEFycmF5Lm1hdGNoPW1hdGNoO2Z1bmN0aW9uIGJ1aWxkKHZhbHVlKXtyZXR1cm57dHlwZToiVWludDhBcnJheSIsZGF0YTp0b0J1ZmZlcl8xLnRvQnVmZmVyKHZhbHVlKS50b1N0cmluZygiYmluYXJ5Iil9fVNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkuYnVpbGQ9YnVpbGQ7ZnVuY3Rpb24gcmVzdG9yZSh2YWx1ZSl7cmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlLmRhdGEsImJpbmFyeSIpfVNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkucmVzdG9yZT1yZXN0b3JlfSkoU2VyaWFsaXphYmxlVWludDhBcnJheXx8KFNlcmlhbGl6YWJsZVVpbnQ4QXJyYXk9e30pKTtmdW5jdGlvbiBwcmVwYXJlKHRocmVhZE1lc3NhZ2Upe2lmKGVudmlyb25uZW1lbnRfMS5lbnZpcm9ubmVtZW50LnR5cGUhPT0iTk9ERSIpe3Rocm93IG5ldyBFcnJvcigib25seSBmb3Igbm9kZSIpfXZhciBtZXNzYWdlPWZ1bmN0aW9uKCl7aWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpe3JldHVybiBTZXJpYWxpemFibGVVaW50OEFycmF5LmJ1aWxkKHRocmVhZE1lc3NhZ2UpfWVsc2UgaWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIEFycmF5KXtyZXR1cm4gdGhyZWFkTWVzc2FnZS5tYXAoZnVuY3Rpb24oZW50cnkpe3JldHVybiBwcmVwYXJlKGVudHJ5KX0pfWVsc2UgaWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIE9iamVjdCl7dmFyIG91dD17fTtmb3IodmFyIGtleSBpbiB0aHJlYWRNZXNzYWdlKXtvdXRba2V5XT1wcmVwYXJlKHRocmVhZE1lc3NhZ2Vba2V5XSl9cmV0dXJuIG91dH1lbHNle3JldHVybiB0aHJlYWRNZXNzYWdlfX0oKTtyZXR1cm4gbWVzc2FnZX10cmFuc2Zlci5wcmVwYXJlPXByZXBhcmU7ZnVuY3Rpb24gcmVzdG9yZShtZXNzYWdlKXtpZihlbnZpcm9ubmVtZW50XzEuZW52aXJvbm5lbWVudC50eXBlIT09Ik5PREUiKXt0aHJvdyBuZXcgRXJyb3IoIm9ubHkgZm9yIG5vZGUiKX12YXIgdGhyZWFkTWVzc2FnZT1mdW5jdGlvbigpe2lmKFNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkubWF0Y2gobWVzc2FnZSkpe3JldHVybiBTZXJpYWxpemFibGVVaW50OEFycmF5LnJlc3RvcmUobWVzc2FnZSl9ZWxzZSBpZihtZXNzYWdlIGluc3RhbmNlb2YgQXJyYXkpe3JldHVybiBtZXNzYWdlLm1hcChmdW5jdGlvbihlbnRyeSl7cmV0dXJuIHJlc3RvcmUoZW50cnkpfSl9ZWxzZSBpZihtZXNzYWdlIGluc3RhbmNlb2YgT2JqZWN0KXt2YXIgb3V0PXt9O2Zvcih2YXIga2V5IGluIG1lc3NhZ2Upe291dFtrZXldPXJlc3RvcmUobWVzc2FnZVtrZXldKX1yZXR1cm4gb3V0fWVsc2V7cmV0dXJuIG1lc3NhZ2V9fSgpO3JldHVybiB0aHJlYWRNZXNzYWdlfXRyYW5zZmVyLnJlc3RvcmU9cmVzdG9yZX0pKHRyYW5zZmVyPWV4cG9ydHMudHJhbnNmZXJ8fChleHBvcnRzLnRyYW5zZmVyPXt9KSl9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi91dGlscy9lbnZpcm9ubmVtZW50IjoxMCwiLi4vdXRpbHMvdG9CdWZmZXIiOjEyLGJ1ZmZlcjoyN31dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTtyZXF1aXJlKCJtaW5pbWFsLXBvbHlmaWxscy9kaXN0L2xpYi9BcnJheUJ1ZmZlci5pc1ZpZXciKTt2YXIgTWFwXzE9cmVxdWlyZSgibWluaW1hbC1wb2x5ZmlsbHMvZGlzdC9saWIvTWFwIik7dmFyIGNyeXB0b0xpYj1yZXF1aXJlKCIuLi9pbmRleCIpO3ZhciBlbnZpcm9ubmVtZW50XzE9cmVxdWlyZSgiLi4vdXRpbHMvZW52aXJvbm5lbWVudCIpO3ZhciBUaHJlYWRNZXNzYWdlXzE9cmVxdWlyZSgiLi9UaHJlYWRNZXNzYWdlIik7aWYoZnVuY3Rpb24oKXtpZih0eXBlb2YgX19zaW11bGF0ZWRNYWluVGhyZWFkQXBpIT09InVuZGVmaW5lZCIpe3JldHVybiBmYWxzZX12YXIgaXNNYWluVGhlYWQ9ZW52aXJvbm5lbWVudF8xLmVudmlyb25uZW1lbnQuaXNNYWluVGhyZWFkIT09dW5kZWZpbmVkP2Vudmlyb25uZW1lbnRfMS5lbnZpcm9ubmVtZW50LmlzTWFpblRocmVhZDp0eXBlb2YgX19wcm9jZXNzX25vZGU9PT0idW5kZWZpbmVkIjtyZXR1cm4gaXNNYWluVGhlYWR9KCkpe19fY3J5cHRvTGliPWNyeXB0b0xpYn1lbHNle3ZhciBtYWluVGhyZWFkQXBpXzE9dHlwZW9mIF9fc2ltdWxhdGVkTWFpblRocmVhZEFwaSE9PSJ1bmRlZmluZWQiP19fc2ltdWxhdGVkTWFpblRocmVhZEFwaTp0eXBlb2YgX19wcm9jZXNzX25vZGU9PT0idW5kZWZpbmVkIj97c2VuZFJlc3BvbnNlOnNlbGYucG9zdE1lc3NhZ2UuYmluZChzZWxmKSxzZXRBY3Rpb25MaXN0ZW5lcjpmdW5jdGlvbihhY3Rpb25MaXN0ZW5lcil7cmV0dXJuIGFkZEV2ZW50TGlzdGVuZXIoIm1lc3NhZ2UiLGZ1bmN0aW9uKF9hKXt2YXIgZGF0YT1fYS5kYXRhO3JldHVybiBhY3Rpb25MaXN0ZW5lcihkYXRhKX0pfX06e3NlbmRSZXNwb25zZTpmdW5jdGlvbihyZXNwb25zZSl7cmV0dXJuIF9fcHJvY2Vzc19ub2RlLnNlbmQoVGhyZWFkTWVzc2FnZV8xLnRyYW5zZmVyLnByZXBhcmUocmVzcG9uc2UpKX0sc2V0QWN0aW9uTGlzdGVuZXI6ZnVuY3Rpb24oYWN0aW9uTGlzdGVuZXIpe3JldHVybiBfX3Byb2Nlc3Nfbm9kZS5vbigibWVzc2FnZSIsZnVuY3Rpb24obWVzc2FnZSl7cmV0dXJuIGFjdGlvbkxpc3RlbmVyKFRocmVhZE1lc3NhZ2VfMS50cmFuc2Zlci5yZXN0b3JlKG1lc3NhZ2UpKX0pfX07dmFyIGNpcGhlckluc3RhbmNlc18xPW5ldyBNYXBfMS5Qb2x5ZmlsbDttYWluVGhyZWFkQXBpXzEuc2V0QWN0aW9uTGlzdGVuZXIoZnVuY3Rpb24oYWN0aW9uKXt2YXIgX2EsX2I7c3dpdGNoKGFjdGlvbi5hY3Rpb24pe2Nhc2UiR2VuZXJhdGVSc2FLZXlzIjptYWluVGhyZWFkQXBpXzEuc2VuZFJlc3BvbnNlKGZ1bmN0aW9uKCl7dmFyIF9hO3ZhciByZXNwb25zZT17YWN0aW9uSWQ6YWN0aW9uLmFjdGlvbklkLG91dHB1dHM6KF9hPWNyeXB0b0xpYi5yc2EpLnN5bmNHZW5lcmF0ZUtleXMuYXBwbHkoX2EsYWN0aW9uLnBhcmFtcyl9O3JldHVybiByZXNwb25zZX0oKSk7YnJlYWs7Y2FzZSJDaXBoZXJGYWN0b3J5IjpjaXBoZXJJbnN0YW5jZXNfMS5zZXQoYWN0aW9uLmNpcGhlckluc3RhbmNlUmVmLChfYT1jcnlwdG9MaWJbYWN0aW9uLmNpcGhlck5hbWVdKVtmdW5jdGlvbigpe3N3aXRjaChhY3Rpb24uY29tcG9uZW50cyl7Y2FzZSJEZWNyeXB0b3IiOnJldHVybiJzeW5jRGVjcnlwdG9yRmFjdG9yeSI7Y2FzZSJFbmNyeXB0b3IiOnJldHVybiJzeW5jRW5jcnlwdG9yRmFjdG9yeSI7Y2FzZSJFbmNyeXB0b3JEZWNyeXB0b3IiOnJldHVybiJzeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeSJ9fSgpXS5hcHBseShfYSxhY3Rpb24ucGFyYW1zKSk7YnJlYWs7Y2FzZSJFbmNyeXB0T3JEZWNyeXB0Ijp7dmFyIG91dHB1dF8xPWNpcGhlckluc3RhbmNlc18xLmdldChhY3Rpb24uY2lwaGVySW5zdGFuY2VSZWYpW2FjdGlvbi5tZXRob2RdKGFjdGlvbi5pbnB1dCk7bWFpblRocmVhZEFwaV8xLnNlbmRSZXNwb25zZShmdW5jdGlvbigpe3ZhciByZXNwb25zZT17YWN0aW9uSWQ6YWN0aW9uLmFjdGlvbklkLG91dHB1dDpvdXRwdXRfMX07cmV0dXJuIHJlc3BvbnNlfSgpLFtvdXRwdXRfMS5idWZmZXJdKX1icmVhaztjYXNlIlNjcnlwdEhhc2giOnt2YXIgZGlnZXN0XzE9KF9iPWNyeXB0b0xpYi5zY3J5cHQpLnN5bmNIYXNoLmFwcGx5KF9iLGFjdGlvbi5wYXJhbXMuY29uY2F0KFtmdW5jdGlvbihwZXJjZW50KXtyZXR1cm4gbWFpblRocmVhZEFwaV8xLnNlbmRSZXNwb25zZShmdW5jdGlvbigpe3ZhciByZXNwb25zZT17YWN0aW9uSWQ6YWN0aW9uLmFjdGlvbklkLHBlcmNlbnQ6cGVyY2VudH07cmV0dXJuIHJlc3BvbnNlfSgpKX1dKSk7bWFpblRocmVhZEFwaV8xLnNlbmRSZXNwb25zZShmdW5jdGlvbigpe3ZhciByZXNwb25zZT17YWN0aW9uSWQ6YWN0aW9uLmFjdGlvbklkLGRpZ2VzdDpkaWdlc3RfMX07cmV0dXJuIHJlc3BvbnNlfSgpLFtkaWdlc3RfMS5idWZmZXJdKX1icmVha319KX19LHsiLi4vaW5kZXgiOjYsIi4uL3V0aWxzL2Vudmlyb25uZW1lbnQiOjEwLCIuL1RocmVhZE1lc3NhZ2UiOjEsIm1pbmltYWwtcG9seWZpbGxzL2Rpc3QvbGliL0FycmF5QnVmZmVyLmlzVmlldyI6NDAsIm1pbmltYWwtcG9seWZpbGxzL2Rpc3QvbGliL01hcCI6NDF9XSwzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIl9fZXNNb2R1bGUiLHt2YWx1ZTp0cnVlfSk7dmFyIGFlc2pzPXJlcXVpcmUoImFlcy1qcyIpO3ZhciByYW5kb21CeXRlc18xPXJlcXVpcmUoIi4uL3V0aWxzL3JhbmRvbUJ5dGVzIik7dmFyIGJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzE9cmVxdWlyZSgiLi4vdXRpbHMvYmluYXJ5RGF0YU1hbmlwdWxhdGlvbnMiKTtmdW5jdGlvbiBzeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeShrZXkpe3JldHVybntlbmNyeXB0OmZ1bmN0aW9uKCl7dmFyIGdldEl2PWZ1bmN0aW9uKCl7dmFyIGl2MD1yYW5kb21CeXRlc18xLnJhbmRvbUJ5dGVzKDE2KTtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gYmluYXJ5RGF0YU1hbmlwdWxhdGlvbnNfMS5sZWZ0U2hpZnQoaXYwKX19KCk7cmV0dXJuIGZ1bmN0aW9uKHBsYWluRGF0YSl7dmFyIGl2PWdldEl2KCk7dmFyIG9yaWdpbmFsTGVuZ3RoQXNCeXRlPWJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzEuYWRkUGFkZGluZygiTEVGVCIsYmluYXJ5RGF0YU1hbmlwdWxhdGlvbnNfMS5udW1iZXJUb1VpbnQ4QXJyYXkocGxhaW5EYXRhLmxlbmd0aCksNCk7dmFyIHBsYWluRGF0YU11bHRpcGxlT2YxNkJ5dGVzPWJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzEuYWRkUGFkZGluZygiUklHSFQiLHBsYWluRGF0YSxwbGFpbkRhdGEubGVuZ3RoKygxNi1wbGFpbkRhdGEubGVuZ3RoJTE2KSk7dmFyIGVuY3J5cHRlZERhdGFQYXlsb2FkPW5ldyBhZXNqcy5Nb2RlT2ZPcGVyYXRpb24uY2JjKGtleSxpdikuZW5jcnlwdChwbGFpbkRhdGFNdWx0aXBsZU9mMTZCeXRlcyk7cmV0dXJuIGJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzEuY29uY2F0VWludDhBcnJheShpdixvcmlnaW5hbExlbmd0aEFzQnl0ZSxlbmNyeXB0ZWREYXRhUGF5bG9hZCl9fSgpLGRlY3J5cHQ6ZnVuY3Rpb24oZW5jcnlwdGVkRGF0YSl7dmFyIGl2PWVuY3J5cHRlZERhdGEuc2xpY2UoMCwxNik7dmFyIG9yaWdpbmFsTGVuZ3RoQXNCeXRlPWVuY3J5cHRlZERhdGEuc2xpY2UoMTYsMTYrNCk7dmFyIG9yaWdpbmFsTGVuZ3RoPWJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzEudWludDhBcnJheVRvTnVtYmVyKG9yaWdpbmFsTGVuZ3RoQXNCeXRlKTtyZXR1cm4gbmV3IGFlc2pzLk1vZGVPZk9wZXJhdGlvbi5jYmMoa2V5LGl2KS5kZWNyeXB0KGVuY3J5cHRlZERhdGEuc2xpY2UoMTYrNCkpLnNsaWNlKDAsb3JpZ2luYWxMZW5ndGgpfX19ZXhwb3J0cy5zeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeT1zeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeTtmdW5jdGlvbiBnZW5lcmF0ZUtleSgpe3JldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLHJlamVjdCl7cmV0dXJuIHJhbmRvbUJ5dGVzXzEucmFuZG9tQnl0ZXMoMzIsZnVuY3Rpb24oZXJyLGJ1Zil7aWYoISFlcnIpe3JlamVjdChlcnIpfWVsc2V7cmVzb2x2ZShidWYpfX0pfSl9ZXhwb3J0cy5nZW5lcmF0ZUtleT1nZW5lcmF0ZUtleTtmdW5jdGlvbiBnZXRUZXN0S2V5KCl7cmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgVWludDhBcnJheShbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOSwyMCwyMSwyMiwyMywyNCwyNSwyNiwyNywyOCwyOSwzMCwzMV0pKX1leHBvcnRzLmdldFRlc3RLZXk9Z2V0VGVzdEtleX0seyIuLi91dGlscy9iaW5hcnlEYXRhTWFuaXB1bGF0aW9ucyI6OSwiLi4vdXRpbHMvcmFuZG9tQnl0ZXMiOjExLCJhZXMtanMiOjEzfV0sNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO2Z1bmN0aW9uIHN5bmNFbmNyeXB0b3JEZWNyeXB0b3JGYWN0b3J5KCl7cmV0dXJue2VuY3J5cHQ6ZnVuY3Rpb24ocGxhaW5EYXRhKXtyZXR1cm4gcGxhaW5EYXRhfSxkZWNyeXB0OmZ1bmN0aW9uKGVuY3J5cHRlZERhdGEpe3JldHVybiBlbmNyeXB0ZWREYXRhfX19ZXhwb3J0cy5zeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeT1zeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeX0se31dLDU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0Ijt2YXIgX19hc3NpZ249dGhpcyYmdGhpcy5fX2Fzc2lnbnx8ZnVuY3Rpb24oKXtfX2Fzc2lnbj1PYmplY3QuYXNzaWdufHxmdW5jdGlvbih0KXtmb3IodmFyIHMsaT0xLG49YXJndW1lbnRzLmxlbmd0aDtpPG47aSsrKXtzPWFyZ3VtZW50c1tpXTtmb3IodmFyIHAgaW4gcylpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocyxwKSl0W3BdPXNbcF19cmV0dXJuIHR9O3JldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9O09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3ZhciB0eXBlc18xPXJlcXVpcmUoIi4uL3R5cGVzIik7dmFyIE5vZGVSU0E9cmVxdWlyZSgibm9kZS1yc2EiKTt2YXIgZW52aXJvbm5lbWVudF8xPXJlcXVpcmUoIi4uL3V0aWxzL2Vudmlyb25uZW1lbnQiKTt2YXIgdG9CdWZmZXJfMT1yZXF1aXJlKCIuLi91dGlscy90b0J1ZmZlciIpO3ZhciB0YXJnZXRlZEVudmlyb25uZW1lbnQ9ZW52aXJvbm5lbWVudF8xLmVudmlyb25uZW1lbnQudHlwZT09PSJOT0RFIj8ibm9kZSI6ImJyb3dzZXIiO3ZhciBuZXdOb2RlUlNBPWZ1bmN0aW9uKGtleSl7cmV0dXJuIG5ldyBOb2RlUlNBKEJ1ZmZlci5mcm9tKGtleS5kYXRhKSxrZXkuZm9ybWF0LHtlbnZpcm9ubWVudDp0YXJnZXRlZEVudmlyb25uZW1lbnR9KX07ZnVuY3Rpb24gc3luY0VuY3J5cHRvckZhY3RvcnkoZW5jcnlwdEtleSl7cmV0dXJue2VuY3J5cHQ6ZnVuY3Rpb24oKXt2YXIgZW5jcnlwdE5vZGVSU0E9bmV3Tm9kZVJTQShlbmNyeXB0S2V5KTt2YXIgZW5jcnlwdE1ldGhvZD10eXBlc18xLlJzYUtleS5Qcml2YXRlLm1hdGNoKGVuY3J5cHRLZXkpPyJlbmNyeXB0UHJpdmF0ZSI6ImVuY3J5cHQiO3JldHVybiBmdW5jdGlvbihwbGFpbkRhdGEpe3JldHVybiBlbmNyeXB0Tm9kZVJTQVtlbmNyeXB0TWV0aG9kXSh0b0J1ZmZlcl8xLnRvQnVmZmVyKHBsYWluRGF0YSkpfX0oKX19ZXhwb3J0cy5zeW5jRW5jcnlwdG9yRmFjdG9yeT1zeW5jRW5jcnlwdG9yRmFjdG9yeTtmdW5jdGlvbiBzeW5jRGVjcnlwdG9yRmFjdG9yeShkZWNyeXB0S2V5KXtyZXR1cm57ZGVjcnlwdDpmdW5jdGlvbigpe3ZhciBkZWNyeXB0Tm9kZVJTQT1uZXdOb2RlUlNBKGRlY3J5cHRLZXkpO3ZhciBkZWNyeXB0TWV0aG9kPXR5cGVzXzEuUnNhS2V5LlB1YmxpYy5tYXRjaChkZWNyeXB0S2V5KT8iZGVjcnlwdFB1YmxpYyI6ImRlY3J5cHQiO3JldHVybiBmdW5jdGlvbihlbmNyeXB0ZWREYXRhKXtyZXR1cm4gZGVjcnlwdE5vZGVSU0FbZGVjcnlwdE1ldGhvZF0odG9CdWZmZXJfMS50b0J1ZmZlcihlbmNyeXB0ZWREYXRhKSl9fSgpfX1leHBvcnRzLnN5bmNEZWNyeXB0b3JGYWN0b3J5PXN5bmNEZWNyeXB0b3JGYWN0b3J5O2Z1bmN0aW9uIHN5bmNFbmNyeXB0b3JEZWNyeXB0b3JGYWN0b3J5KGVuY3J5cHRLZXksZGVjcnlwdEtleSl7cmV0dXJuIF9fYXNzaWduKHt9LHN5bmNFbmNyeXB0b3JGYWN0b3J5KGVuY3J5cHRLZXkpLHN5bmNEZWNyeXB0b3JGYWN0b3J5KGRlY3J5cHRLZXkpKX1leHBvcnRzLnN5bmNFbmNyeXB0b3JEZWNyeXB0b3JGYWN0b3J5PXN5bmNFbmNyeXB0b3JEZWNyeXB0b3JGYWN0b3J5O2Z1bmN0aW9uIHN5bmNHZW5lcmF0ZUtleXMoc2VlZCxrZXlzTGVuZ3RoQnl0ZXMpe2lmKGtleXNMZW5ndGhCeXRlcz09PXZvaWQgMCl7a2V5c0xlbmd0aEJ5dGVzPTgwfXZhciBub2RlUlNBPU5vZGVSU0EuZ2VuZXJhdGVLZXlQYWlyRnJvbVNlZWQoc2VlZCw4KmtleXNMZW5ndGhCeXRlcyx1bmRlZmluZWQsdGFyZ2V0ZWRFbnZpcm9ubmVtZW50KTtmdW5jdGlvbiBidWlsZEtleShmb3JtYXQpe3JldHVybntmb3JtYXQ6Zm9ybWF0LGRhdGE6bm9kZVJTQS5leHBvcnRLZXkoZm9ybWF0KX19cmV0dXJue3B1YmxpY0tleTpidWlsZEtleSgicGtjczEtcHVibGljLWRlciIpLHByaXZhdGVLZXk6YnVpbGRLZXkoInBrY3MxLXByaXZhdGUtZGVyIil9fWV4cG9ydHMuc3luY0dlbmVyYXRlS2V5cz1zeW5jR2VuZXJhdGVLZXlzfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi4vdHlwZXMiOjgsIi4uL3V0aWxzL2Vudmlyb25uZW1lbnQiOjEwLCIuLi91dGlscy90b0J1ZmZlciI6MTIsYnVmZmVyOjI3LCJub2RlLXJzYSI6NDJ9XSw2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7ZnVuY3Rpb24gX19leHBvcnQobSl7Zm9yKHZhciBwIGluIG0paWYoIWV4cG9ydHMuaGFzT3duUHJvcGVydHkocCkpZXhwb3J0c1twXT1tW3BdfU9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO19fZXhwb3J0KHJlcXVpcmUoIi4vdHlwZXMiKSk7dmFyIHNjcnlwdD1yZXF1aXJlKCIuL3NjcnlwdCIpO2V4cG9ydHMuc2NyeXB0PXNjcnlwdDt2YXIgYWVzPXJlcXVpcmUoIi4vY2lwaGVyL2FlcyIpO2V4cG9ydHMuYWVzPWFlczt2YXIgcnNhPXJlcXVpcmUoIi4vY2lwaGVyL3JzYSIpO2V4cG9ydHMucnNhPXJzYTt2YXIgcGxhaW49cmVxdWlyZSgiLi9jaXBoZXIvcGxhaW4iKTtleHBvcnRzLnBsYWluPXBsYWlufSx7Ii4vY2lwaGVyL2FlcyI6MywiLi9jaXBoZXIvcGxhaW4iOjQsIi4vY2lwaGVyL3JzYSI6NSwiLi9zY3J5cHQiOjcsIi4vdHlwZXMiOjh9XSw3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIF9fYXNzaWduPXRoaXMmJnRoaXMuX19hc3NpZ258fGZ1bmN0aW9uKCl7X19hc3NpZ249T2JqZWN0LmFzc2lnbnx8ZnVuY3Rpb24odCl7Zm9yKHZhciBzLGk9MSxuPWFyZ3VtZW50cy5sZW5ndGg7aTxuO2krKyl7cz1hcmd1bWVudHNbaV07Zm9yKHZhciBwIGluIHMpaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMscCkpdFtwXT1zW3BdfXJldHVybiB0fTtyZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcyxhcmd1bWVudHMpfTtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTt2YXIgc2NyeXB0c3k9cmVxdWlyZSgic2NyeXB0c3kiKTtleHBvcnRzLmRlZmF1bHRQYXJhbXM9e246MTMscjo4LHA6MSxkaWdlc3RMZW5ndGhCeXRlczoyNTR9O2Z1bmN0aW9uIHN5bmNIYXNoKHRleHQsc2FsdCxwYXJhbXMscHJvZ3Jlc3Mpe2lmKHBhcmFtcz09PXZvaWQgMCl7cGFyYW1zPXt9fXZhciBfYT1mdW5jdGlvbigpe3ZhciBvdXQ9X19hc3NpZ24oe30sZXhwb3J0cy5kZWZhdWx0UGFyYW1zKTtPYmplY3Qua2V5cyhwYXJhbXMpLmZpbHRlcihmdW5jdGlvbihrZXkpe3JldHVybiBwYXJhbXNba2V5XSE9PXVuZGVmaW5lZH0pLmZvckVhY2goZnVuY3Rpb24oa2V5KXtyZXR1cm4gb3V0W2tleV09cGFyYW1zW2tleV19KTtyZXR1cm4gb3V0fSgpLG49X2EubixyPV9hLnIscD1fYS5wLGRpZ2VzdExlbmd0aEJ5dGVzPV9hLmRpZ2VzdExlbmd0aEJ5dGVzO3JldHVybiBzY3J5cHRzeSh0ZXh0LHNhbHQsTWF0aC5wb3coMixuKSxyLHAsZGlnZXN0TGVuZ3RoQnl0ZXMscHJvZ3Jlc3MhPT11bmRlZmluZWQ/ZnVuY3Rpb24oX2Epe3ZhciBwZXJjZW50PV9hLnBlcmNlbnQ7cmV0dXJuIHByb2dyZXNzKHBlcmNlbnQpfTp1bmRlZmluZWQpfWV4cG9ydHMuc3luY0hhc2g9c3luY0hhc2h9LHtzY3J5cHRzeTo4NH1dLDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTt2YXIgdG9CdWZmZXJfMT1yZXF1aXJlKCIuL3V0aWxzL3RvQnVmZmVyIik7dmFyIFJzYUtleTsoZnVuY3Rpb24oUnNhS2V5KXtmdW5jdGlvbiBzdHJpbmdpZnkocnNhS2V5KXtyZXR1cm4gSlNPTi5zdHJpbmdpZnkoW3JzYUtleS5mb3JtYXQsdG9CdWZmZXJfMS50b0J1ZmZlcihyc2FLZXkuZGF0YSkudG9TdHJpbmcoImJhc2U2NCIpXSl9UnNhS2V5LnN0cmluZ2lmeT1zdHJpbmdpZnk7ZnVuY3Rpb24gcGFyc2Uoc3RyaW5naWZpZWRSc2FLZXkpe3ZhciBfYT1KU09OLnBhcnNlKHN0cmluZ2lmaWVkUnNhS2V5KSxmb3JtYXQ9X2FbMF0sc3RyRGF0YT1fYVsxXTtyZXR1cm57Zm9ybWF0OmZvcm1hdCxkYXRhOm5ldyBVaW50OEFycmF5KEJ1ZmZlci5mcm9tKHN0ckRhdGEsImJhc2U2NCIpKX19UnNhS2V5LnBhcnNlPXBhcnNlO3ZhciBQdWJsaWM7KGZ1bmN0aW9uKFB1YmxpYyl7ZnVuY3Rpb24gbWF0Y2gocnNhS2V5KXtyZXR1cm4gcnNhS2V5LmZvcm1hdD09PSJwa2NzMS1wdWJsaWMtZGVyIn1QdWJsaWMubWF0Y2g9bWF0Y2h9KShQdWJsaWM9UnNhS2V5LlB1YmxpY3x8KFJzYUtleS5QdWJsaWM9e30pKTt2YXIgUHJpdmF0ZTsoZnVuY3Rpb24oUHJpdmF0ZSl7ZnVuY3Rpb24gbWF0Y2gocnNhS2V5KXtyZXR1cm4gcnNhS2V5LmZvcm1hdD09PSJwa2NzMS1wcml2YXRlLWRlciJ9UHJpdmF0ZS5tYXRjaD1tYXRjaH0pKFByaXZhdGU9UnNhS2V5LlByaXZhdGV8fChSc2FLZXkuUHJpdmF0ZT17fSkpfSkoUnNhS2V5PWV4cG9ydHMuUnNhS2V5fHwoZXhwb3J0cy5Sc2FLZXk9e30pKX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4vdXRpbHMvdG9CdWZmZXIiOjEyLGJ1ZmZlcjoyN31dLDk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTtmdW5jdGlvbiBjb25jYXRVaW50OEFycmF5KCl7dmFyIHVpbnQ4QXJyYXlzPVtdO2Zvcih2YXIgX2k9MDtfaTxhcmd1bWVudHMubGVuZ3RoO19pKyspe3VpbnQ4QXJyYXlzW19pXT1hcmd1bWVudHNbX2ldfXZhciBvdXQ9bmV3IFVpbnQ4QXJyYXkodWludDhBcnJheXMubWFwKGZ1bmN0aW9uKF9hKXt2YXIgbGVuZ3RoPV9hLmxlbmd0aDtyZXR1cm4gbGVuZ3RofSkucmVkdWNlKGZ1bmN0aW9uKHByZXYsY3Vycil7cmV0dXJuIHByZXYrY3Vycn0sMCkpO3ZhciBvZmZzZXQ9MDtmb3IodmFyIGk9MDtpPHVpbnQ4QXJyYXlzLmxlbmd0aDtpKyspe3ZhciB1aW50OEFycmF5PXVpbnQ4QXJyYXlzW2ldO291dC5zZXQodWludDhBcnJheSxvZmZzZXQpO29mZnNldCs9dWludDhBcnJheS5sZW5ndGh9cmV0dXJuIG91dH1leHBvcnRzLmNvbmNhdFVpbnQ4QXJyYXk9Y29uY2F0VWludDhBcnJheTtmdW5jdGlvbiBhZGRQYWRkaW5nKHBvc2l0aW9uLHVpbnQ4QXJyYXksdGFyZ2V0TGVuZ3RoQnl0ZXMpe3ZhciBwYWRkaW5nQnl0ZXM9bmV3IFVpbnQ4QXJyYXkodGFyZ2V0TGVuZ3RoQnl0ZXMtdWludDhBcnJheS5sZW5ndGgpO2Zvcih2YXIgaT0wO2k8cGFkZGluZ0J5dGVzLmxlbmd0aDtpKyspe3BhZGRpbmdCeXRlc1tpXT0wfXJldHVybiBjb25jYXRVaW50OEFycmF5LmFwcGx5KHZvaWQgMCxmdW5jdGlvbigpe3N3aXRjaChwb3NpdGlvbil7Y2FzZSJMRUZUIjpyZXR1cm5bcGFkZGluZ0J5dGVzLHVpbnQ4QXJyYXldO2Nhc2UiUklHSFQiOnJldHVyblt1aW50OEFycmF5LHBhZGRpbmdCeXRlc119fSgpKX1leHBvcnRzLmFkZFBhZGRpbmc9YWRkUGFkZGluZztmdW5jdGlvbiBudW1iZXJUb1VpbnQ4QXJyYXkobil7dmFyIHN0cj1uLnRvU3RyaW5nKDE2KTt2YXIgYXJyPVtdO3ZhciBjdXJyPSIiO2Zvcih2YXIgaT1zdHIubGVuZ3RoLTE7aT49MDtpLS0pe2N1cnI9c3RyW2ldK2N1cnI7aWYoY3Vyci5sZW5ndGg9PT0yfHxpPT09MCl7YXJyPVtwYXJzZUludChjdXJyLDE2KV0uY29uY2F0KGFycik7Y3Vycj0iIn19cmV0dXJuIG5ldyBVaW50OEFycmF5KGFycil9ZXhwb3J0cy5udW1iZXJUb1VpbnQ4QXJyYXk9bnVtYmVyVG9VaW50OEFycmF5O2Z1bmN0aW9uIHVpbnQ4QXJyYXlUb051bWJlcih1aW50OEFycmF5KXt2YXIgbj0wO3ZhciBleHA9MDtmb3IodmFyIGk9dWludDhBcnJheS5sZW5ndGgtMTtpPj0wO2ktLSl7bis9dWludDhBcnJheVtpXSpNYXRoLnBvdygyNTYsZXhwKyspfXJldHVybiBufWV4cG9ydHMudWludDhBcnJheVRvTnVtYmVyPXVpbnQ4QXJyYXlUb051bWJlcjtmdW5jdGlvbiBsZWZ0U2hpZnQodWludDhBcnJheSl7dmFyIGM9dHJ1ZTtmb3IodmFyIGk9dWludDhBcnJheS5sZW5ndGgtMTtjJiZpPj0wO2ktLSl7aWYoKyt1aW50OEFycmF5W2ldIT09MjU2KXtjPWZhbHNlfX1yZXR1cm4gdWludDhBcnJheX1leHBvcnRzLmxlZnRTaGlmdD1sZWZ0U2hpZnR9LHt9XSwxMDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO2V4cG9ydHMuZW52aXJvbm5lbWVudD1mdW5jdGlvbigpe2lmKHR5cGVvZiBuYXZpZ2F0b3IhPT0idW5kZWZpbmVkIiYmbmF2aWdhdG9yLnByb2R1Y3Q9PT0iUmVhY3ROYXRpdmUiKXtyZXR1cm57dHlwZToiUkVBQ1QgTkFUSVZFIixpc01haW5UaHJlYWQ6dHJ1ZX19ZWxzZSBpZih0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCIpe3JldHVybnt0eXBlOiJCUk9XU0VSIixpc01haW5UaHJlYWQ6dHJ1ZX19ZWxzZSBpZih0eXBlb2Ygc2VsZiE9PSJ1bmRlZmluZWQiJiYhIXNlbGYucG9zdE1lc3NhZ2Upe3JldHVybnt0eXBlOiJCUk9XU0VSIixpc01haW5UaHJlYWQ6ZmFsc2V9fWVsc2UgaWYodHlwZW9mIHNldFRpbWVvdXQ9PT0idW5kZWZpbmVkIil7cmV0dXJue3R5cGU6IkxJUVVJRCBDT1JFIixpc01haW5UaHJlYWQ6dHJ1ZX19ZWxzZXtyZXR1cm57dHlwZToiTk9ERSIsaXNNYWluVGhyZWFkOnVuZGVmaW5lZH19fSgpfSx7fV0sMTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTt2YXIgZW52aXJvbm5lbWVudF8xPXJlcXVpcmUoIi4vZW52aXJvbm5lbWVudCIpO2Z1bmN0aW9uIHJhbmRvbUJ5dGVzKHNpemUsY2FsbGJhY2spe3ZhciBNQVhfVUlOVDMyPXJhbmRvbUJ5dGVzLk1BWF9VSU5UMzIsTUFYX0JZVEVTPXJhbmRvbUJ5dGVzLk1BWF9CWVRFUyxnZXRSYW5kb21WYWx1ZXM9cmFuZG9tQnl0ZXMuZ2V0UmFuZG9tVmFsdWVzLGdldE5vZGVSYW5kb21CeXRlcz1yYW5kb21CeXRlcy5nZXROb2RlUmFuZG9tQnl0ZXM7aWYoZW52aXJvbm5lbWVudF8xLmVudmlyb25uZW1lbnQudHlwZT09PSJOT0RFIil7dmFyIG5vZGVCdWZmZXJJbnN0PWdldE5vZGVSYW5kb21CeXRlcygpKHNpemUpO3JldHVybiBCdWZmZXIuZnJvbShub2RlQnVmZmVySW5zdC5idWZmZXIsbm9kZUJ1ZmZlckluc3QuYnl0ZU9mZnNldCxub2RlQnVmZmVySW5zdC5sZW5ndGgpfWlmKHNpemU+TUFYX1VJTlQzMil7dGhyb3cgbmV3IFJhbmdlRXJyb3IoInJlcXVlc3RlZCB0b28gbWFueSByYW5kb20gYnl0ZXMiKX12YXIgYnl0ZXM9QnVmZmVyLmFsbG9jVW5zYWZlKHNpemUpO2lmKHNpemU+MCl7aWYoc2l6ZT5NQVhfQllURVMpe2Zvcih2YXIgZ2VuZXJhdGVkPTA7Z2VuZXJhdGVkPHNpemU7Z2VuZXJhdGVkKz1NQVhfQllURVMpe2dldFJhbmRvbVZhbHVlcyhieXRlcy5zbGljZShnZW5lcmF0ZWQsZ2VuZXJhdGVkK01BWF9CWVRFUykpfX1lbHNle2dldFJhbmRvbVZhbHVlcyhieXRlcyl9fWlmKHR5cGVvZiBjYWxsYmFjaz09PSJmdW5jdGlvbiIpe3NldFRpbWVvdXQoZnVuY3Rpb24oKXtyZXR1cm4gY2FsbGJhY2sobnVsbCxieXRlcyl9LDApO3JldHVybn1yZXR1cm4gYnl0ZXN9ZXhwb3J0cy5yYW5kb21CeXRlcz1yYW5kb21CeXRlczsoZnVuY3Rpb24ocmFuZG9tQnl0ZXMpe3JhbmRvbUJ5dGVzLk1BWF9CWVRFUz02NTUzNjtyYW5kb21CeXRlcy5NQVhfVUlOVDMyPTQyOTQ5NjcyOTU7cmFuZG9tQnl0ZXMuZ2V0UmFuZG9tVmFsdWVzPWZ1bmN0aW9uKCl7dmFyIG5vbkNyeXB0b2dyYXBoaWNHZXRSYW5kb21WYWx1ZT1mdW5jdGlvbihhYnYpe3ZhciBsPWFidi5sZW5ndGg7d2hpbGUobC0tKXthYnZbbF09TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjI1Nil9cmV0dXJuIGFidn07dmFyIGJyb3dzZXJHZXRSYW5kb21WYWx1ZXM9ZnVuY3Rpb24oKXtpZih0eXBlb2YgY3J5cHRvPT09Im9iamVjdCImJiEhY3J5cHRvLmdldFJhbmRvbVZhbHVlcyl7cmV0dXJuIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChjcnlwdG8pfWVsc2UgaWYodHlwZW9mIG1zQ3J5cHRvPT09Im9iamVjdCImJiEhbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQobXNDcnlwdG8pfWVsc2UgaWYodHlwZW9mIHNlbGY9PT0ib2JqZWN0IiYmdHlwZW9mIHNlbGYuY3J5cHRvPT09Im9iamVjdCImJiEhc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoc2VsZi5jcnlwdG8pfWVsc2V7cmV0dXJuIHVuZGVmaW5lZH19KCk7cmV0dXJuISFicm93c2VyR2V0UmFuZG9tVmFsdWVzP2Jyb3dzZXJHZXRSYW5kb21WYWx1ZXM6bm9uQ3J5cHRvZ3JhcGhpY0dldFJhbmRvbVZhbHVlfSgpO3JhbmRvbUJ5dGVzLmdldE5vZGVSYW5kb21CeXRlcz1mdW5jdGlvbigpe3ZhciBub2RlUmFuZG9tQnl0ZXM9dW5kZWZpbmVkO3JldHVybiBmdW5jdGlvbigpe2lmKG5vZGVSYW5kb21CeXRlcz09PXVuZGVmaW5lZCl7bm9kZVJhbmRvbUJ5dGVzPXJlcXVpcmUoImNyeXB0byIrIiIpLnJhbmRvbUJ5dGVzfXJldHVybiBub2RlUmFuZG9tQnl0ZXN9fSgpfSkocmFuZG9tQnl0ZXM9ZXhwb3J0cy5yYW5kb21CeXRlc3x8KGV4cG9ydHMucmFuZG9tQnl0ZXM9e30pKX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4vZW52aXJvbm5lbWVudCI6MTAsYnVmZmVyOjI3fV0sMTI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTtmdW5jdGlvbiB0b0J1ZmZlcih1aW50OEFycmF5KXtyZXR1cm4gQnVmZmVyLmZyb20odWludDhBcnJheS5idWZmZXIsdWludDhBcnJheS5ieXRlT2Zmc2V0LHVpbnQ4QXJyYXkubGVuZ3RoKX1leHBvcnRzLnRvQnVmZmVyPXRvQnVmZmVyfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHtidWZmZXI6Mjd9XSwxMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHJvb3QpeyJ1c2Ugc3RyaWN0IjtmdW5jdGlvbiBjaGVja0ludCh2YWx1ZSl7cmV0dXJuIHBhcnNlSW50KHZhbHVlKT09PXZhbHVlfWZ1bmN0aW9uIGNoZWNrSW50cyhhcnJheWlzaCl7aWYoIWNoZWNrSW50KGFycmF5aXNoLmxlbmd0aCkpe3JldHVybiBmYWxzZX1mb3IodmFyIGk9MDtpPGFycmF5aXNoLmxlbmd0aDtpKyspe2lmKCFjaGVja0ludChhcnJheWlzaFtpXSl8fGFycmF5aXNoW2ldPDB8fGFycmF5aXNoW2ldPjI1NSl7cmV0dXJuIGZhbHNlfX1yZXR1cm4gdHJ1ZX1mdW5jdGlvbiBjb2VyY2VBcnJheShhcmcsY29weSl7aWYoYXJnLmJ1ZmZlciYmYXJnLm5hbWU9PT0iVWludDhBcnJheSIpe2lmKGNvcHkpe2lmKGFyZy5zbGljZSl7YXJnPWFyZy5zbGljZSgpfWVsc2V7YXJnPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZyl9fXJldHVybiBhcmd9aWYoQXJyYXkuaXNBcnJheShhcmcpKXtpZighY2hlY2tJbnRzKGFyZykpe3Rocm93IG5ldyBFcnJvcigiQXJyYXkgY29udGFpbnMgaW52YWxpZCB2YWx1ZTogIithcmcpfXJldHVybiBuZXcgVWludDhBcnJheShhcmcpfWlmKGNoZWNrSW50KGFyZy5sZW5ndGgpJiZjaGVja0ludHMoYXJnKSl7cmV0dXJuIG5ldyBVaW50OEFycmF5KGFyZyl9dGhyb3cgbmV3IEVycm9yKCJ1bnN1cHBvcnRlZCBhcnJheS1saWtlIG9iamVjdCIpfWZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCl7cmV0dXJuIG5ldyBVaW50OEFycmF5KGxlbmd0aCl9ZnVuY3Rpb24gY29weUFycmF5KHNvdXJjZUFycmF5LHRhcmdldEFycmF5LHRhcmdldFN0YXJ0LHNvdXJjZVN0YXJ0LHNvdXJjZUVuZCl7aWYoc291cmNlU3RhcnQhPW51bGx8fHNvdXJjZUVuZCE9bnVsbCl7aWYoc291cmNlQXJyYXkuc2xpY2Upe3NvdXJjZUFycmF5PXNvdXJjZUFycmF5LnNsaWNlKHNvdXJjZVN0YXJ0LHNvdXJjZUVuZCl9ZWxzZXtzb3VyY2VBcnJheT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChzb3VyY2VBcnJheSxzb3VyY2VTdGFydCxzb3VyY2VFbmQpfX10YXJnZXRBcnJheS5zZXQoc291cmNlQXJyYXksdGFyZ2V0U3RhcnQpfXZhciBjb252ZXJ0VXRmOD1mdW5jdGlvbigpe2Z1bmN0aW9uIHRvQnl0ZXModGV4dCl7dmFyIHJlc3VsdD1bXSxpPTA7dGV4dD1lbmNvZGVVUkkodGV4dCk7d2hpbGUoaTx0ZXh0Lmxlbmd0aCl7dmFyIGM9dGV4dC5jaGFyQ29kZUF0KGkrKyk7aWYoYz09PTM3KXtyZXN1bHQucHVzaChwYXJzZUludCh0ZXh0LnN1YnN0cihpLDIpLDE2KSk7aSs9Mn1lbHNle3Jlc3VsdC5wdXNoKGMpfX1yZXR1cm4gY29lcmNlQXJyYXkocmVzdWx0KX1mdW5jdGlvbiBmcm9tQnl0ZXMoYnl0ZXMpe3ZhciByZXN1bHQ9W10saT0wO3doaWxlKGk8Ynl0ZXMubGVuZ3RoKXt2YXIgYz1ieXRlc1tpXTtpZihjPDEyOCl7cmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShjKSk7aSsrfWVsc2UgaWYoYz4xOTEmJmM8MjI0KXtyZXN1bHQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKChjJjMxKTw8NnxieXRlc1tpKzFdJjYzKSk7aSs9Mn1lbHNle3Jlc3VsdC5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoKGMmMTUpPDwxMnwoYnl0ZXNbaSsxXSY2Myk8PDZ8Ynl0ZXNbaSsyXSY2MykpO2krPTN9fXJldHVybiByZXN1bHQuam9pbigiIil9cmV0dXJue3RvQnl0ZXM6dG9CeXRlcyxmcm9tQnl0ZXM6ZnJvbUJ5dGVzfX0oKTt2YXIgY29udmVydEhleD1mdW5jdGlvbigpe2Z1bmN0aW9uIHRvQnl0ZXModGV4dCl7dmFyIHJlc3VsdD1bXTtmb3IodmFyIGk9MDtpPHRleHQubGVuZ3RoO2krPTIpe3Jlc3VsdC5wdXNoKHBhcnNlSW50KHRleHQuc3Vic3RyKGksMiksMTYpKX1yZXR1cm4gcmVzdWx0fXZhciBIZXg9IjAxMjM0NTY3ODlhYmNkZWYiO2Z1bmN0aW9uIGZyb21CeXRlcyhieXRlcyl7dmFyIHJlc3VsdD1bXTtmb3IodmFyIGk9MDtpPGJ5dGVzLmxlbmd0aDtpKyspe3ZhciB2PWJ5dGVzW2ldO3Jlc3VsdC5wdXNoKEhleFsodiYyNDApPj40XStIZXhbdiYxNV0pfXJldHVybiByZXN1bHQuam9pbigiIil9cmV0dXJue3RvQnl0ZXM6dG9CeXRlcyxmcm9tQnl0ZXM6ZnJvbUJ5dGVzfX0oKTt2YXIgbnVtYmVyT2ZSb3VuZHM9ezE2OjEwLDI0OjEyLDMyOjE0fTt2YXIgcmNvbj1bMSwyLDQsOCwxNiwzMiw2NCwxMjgsMjcsNTQsMTA4LDIxNiwxNzEsNzcsMTU0LDQ3LDk0LDE4OCw5OSwxOTgsMTUxLDUzLDEwNiwyMTIsMTc5LDEyNSwyNTAsMjM5LDE5NywxNDVdO3ZhciBTPVs5OSwxMjQsMTE5LDEyMywyNDIsMTA3LDExMSwxOTcsNDgsMSwxMDMsNDMsMjU0LDIxNSwxNzEsMTE4LDIwMiwxMzAsMjAxLDEyNSwyNTAsODksNzEsMjQwLDE3MywyMTIsMTYyLDE3NSwxNTYsMTY0LDExNCwxOTIsMTgzLDI1MywxNDcsMzgsNTQsNjMsMjQ3LDIwNCw1MiwxNjUsMjI5LDI0MSwxMTMsMjE2LDQ5LDIxLDQsMTk5LDM1LDE5NSwyNCwxNTAsNSwxNTQsNywxOCwxMjgsMjI2LDIzNSwzOSwxNzgsMTE3LDksMTMxLDQ0LDI2LDI3LDExMCw5MCwxNjAsODIsNTksMjE0LDE3OSw0MSwyMjcsNDcsMTMyLDgzLDIwOSwwLDIzNywzMiwyNTIsMTc3LDkxLDEwNiwyMDMsMTkwLDU3LDc0LDc2LDg4LDIwNywyMDgsMjM5LDE3MCwyNTEsNjcsNzcsNTEsMTMzLDY5LDI0OSwyLDEyNyw4MCw2MCwxNTksMTY4LDgxLDE2Myw2NCwxNDMsMTQ2LDE1Nyw1NiwyNDUsMTg4LDE4MiwyMTgsMzMsMTYsMjU1LDI0MywyMTAsMjA1LDEyLDE5LDIzNiw5NSwxNTEsNjgsMjMsMTk2LDE2NywxMjYsNjEsMTAwLDkzLDI1LDExNSw5NiwxMjksNzksMjIwLDM0LDQyLDE0NCwxMzYsNzAsMjM4LDE4NCwyMCwyMjIsOTQsMTEsMjE5LDIyNCw1MCw1OCwxMCw3Myw2LDM2LDkyLDE5NCwyMTEsMTcyLDk4LDE0NSwxNDksMjI4LDEyMSwyMzEsMjAwLDU1LDEwOSwxNDEsMjEzLDc4LDE2OSwxMDgsODYsMjQ0LDIzNCwxMDEsMTIyLDE3NCw4LDE4NiwxMjAsMzcsNDYsMjgsMTY2LDE4MCwxOTgsMjMyLDIyMSwxMTYsMzEsNzUsMTg5LDEzOSwxMzgsMTEyLDYyLDE4MSwxMDIsNzIsMywyNDYsMTQsOTcsNTMsODcsMTg1LDEzNCwxOTMsMjksMTU4LDIyNSwyNDgsMTUyLDE3LDEwNSwyMTcsMTQyLDE0OCwxNTUsMzAsMTM1LDIzMywyMDYsODUsNDAsMjIzLDE0MCwxNjEsMTM3LDEzLDE5MSwyMzAsNjYsMTA0LDY1LDE1Myw0NSwxNSwxNzYsODQsMTg3LDIyXTt2YXIgU2k9WzgyLDksMTA2LDIxMyw0OCw1NCwxNjUsNTYsMTkxLDY0LDE2MywxNTgsMTI5LDI0MywyMTUsMjUxLDEyNCwyMjcsNTcsMTMwLDE1NSw0NywyNTUsMTM1LDUyLDE0Miw2Nyw2OCwxOTYsMjIyLDIzMywyMDMsODQsMTIzLDE0OCw1MCwxNjYsMTk0LDM1LDYxLDIzOCw3NiwxNDksMTEsNjYsMjUwLDE5NSw3OCw4LDQ2LDE2MSwxMDIsNDAsMjE3LDM2LDE3OCwxMTgsOTEsMTYyLDczLDEwOSwxMzksMjA5LDM3LDExNCwyNDgsMjQ2LDEwMCwxMzQsMTA0LDE1MiwyMiwyMTIsMTY0LDkyLDIwNCw5MywxMDEsMTgyLDE0NiwxMDgsMTEyLDcyLDgwLDI1MywyMzcsMTg1LDIxOCw5NCwyMSw3MCw4NywxNjcsMTQxLDE1NywxMzIsMTQ0LDIxNiwxNzEsMCwxNDAsMTg4LDIxMSwxMCwyNDcsMjI4LDg4LDUsMTg0LDE3OSw2OSw2LDIwOCw0NCwzMCwxNDMsMjAyLDYzLDE1LDIsMTkzLDE3NSwxODksMywxLDE5LDEzOCwxMDcsNTgsMTQ1LDE3LDY1LDc5LDEwMywyMjAsMjM0LDE1MSwyNDIsMjA3LDIwNiwyNDAsMTgwLDIzMCwxMTUsMTUwLDE3MiwxMTYsMzQsMjMxLDE3Myw1MywxMzMsMjI2LDI0OSw1NSwyMzIsMjgsMTE3LDIyMywxMTAsNzEsMjQxLDI2LDExMywyOSw0MSwxOTcsMTM3LDExMSwxODMsOTgsMTQsMTcwLDI0LDE5MCwyNywyNTIsODYsNjIsNzUsMTk4LDIxMCwxMjEsMzIsMTU0LDIxOSwxOTIsMjU0LDEyMCwyMDUsOTAsMjQ0LDMxLDIyMSwxNjgsNTEsMTM2LDcsMTk5LDQ5LDE3NywxOCwxNiw4OSwzOSwxMjgsMjM2LDk1LDk2LDgxLDEyNywxNjksMjUsMTgxLDc0LDEzLDQ1LDIyOSwxMjIsMTU5LDE0NywyMDEsMTU2LDIzOSwxNjAsMjI0LDU5LDc3LDE3NCw0MiwyNDUsMTc2LDIwMCwyMzUsMTg3LDYwLDEzMSw4MywxNTMsOTcsMjMsNDMsNCwxMjYsMTg2LDExOSwyMTQsMzgsMjI1LDEwNSwyMCw5OSw4NSwzMywxMiwxMjVdO3ZhciBUMT1bMzMyODQwMjM0MSw0MTY4OTA3OTA4LDQwMDA4MDY4MDksNDEzNTI4NzY5Myw0Mjk0MTExNzU3LDM1OTczNjQxNTcsMzczMTg0NTA0MSwyNDQ1NjU3NDI4LDE2MTM3NzA4MzIsMzM2MjAyMjcsMzQ2Mjg4MzI0MSwxNDQ1NjY5NzU3LDM4OTIyNDgwODksMzA1MDgyMTQ3NCwxMzAzMDk2Mjk0LDM5NjcxODY1ODYsMjQxMjQzMTk0MSw1Mjg2NDY4MTMsMjMxMTcwMjg0OCw0MjAyNTI4MTM1LDQwMjYyMDI2NDUsMjk5MjIwMDE3MSwyMzg3MDM2MTA1LDQyMjY4NzEzMDcsMTEwMTkwMTI5MiwzMDE3MDY5NjcxLDE2MDQ0OTQwNzcsMTE2OTE0MTczOCw1OTc0NjYzMDMsMTQwMzI5OTA2MywzODMyNzA1Njg2LDI2MTMxMDA2MzUsMTk3NDk3NDQwMiwzNzkxNTE5MDA0LDEwMzMwODE3NzQsMTI3NzU2ODYxOCwxODE1NDkyMTg2LDIxMTgwNzQxNzcsNDEyNjY2ODU0NiwyMjExMjM2OTQzLDE3NDgyNTE3NDAsMTM2OTgxMDQyMCwzNTIxNTA0NTY0LDQxOTMzODI2NjQsMzc5OTA4NTQ1OSwyODgzMTE1MTIzLDE2NDczOTEwNTksNzA2MDI0NzY3LDEzNDQ4MDkwOCwyNTEyODk3ODc0LDExNzY3MDc5NDEsMjY0Njg1MjQ0Niw4MDY4ODU0MTYsOTMyNjE1ODQxLDE2ODEwMTEzNSw3OTg2NjEzMDEsMjM1MzQxNTc3LDYwNTE2NDA4Niw0NjE0MDYzNjMsMzc1NjE4ODIyMSwzNDU0NzkwNDM4LDEzMTExODg4NDEsMjE0MjQxNzYxMywzOTMzNTY2MzY3LDMwMjU4MjA0Myw0OTUxNTgxNzQsMTQ3OTI4OTk3Miw4NzQxMjU4NzAsOTA3NzQ2MDkzLDM2OTgyMjQ4MTgsMzAyNTgyMDM5OCwxNTM3MjUzNjI3LDI3NTY4NTg2MTQsMTk4MzU5MzI5MywzMDg0MzEwMTEzLDIxMDg5Mjg5NzQsMTM3ODQyOTMwNywzNzIyNjk5NTgyLDE1ODAxNTA2NDEsMzI3NDUxNzk5LDI3OTA0Nzg4MzcsMzExNzUzNTU5MiwwLDMyNTM1OTU0MzYsMTA3NTg0NzI2NCwzODI1MDA3NjQ3LDIwNDE2ODg1MjAsMzA1OTQ0MDYyMSwzNTYzNzQzOTM0LDIzNzg5NDMzMDIsMTc0MDU1Mzk0NSwxOTE2MzUyODQzLDI0ODc4OTY3OTgsMjU1NTEzNzIzNiwyOTU4NTc5OTQ0LDIyNDQ5ODg3NDYsMzE1MTAyNDIzNSwzMzIwODM1ODgyLDEzMzY1ODQ5MzMsMzk5MjcxNDAwNiwyMjUyNTU1MjA1LDI1ODg3NTc0NjMsMTcxNDYzMTUwOSwyOTM5NjMxNTYsMjMxOTc5NTY2MywzOTI1NDczNTUyLDY3MjQwNDU0LDQyNjk3Njg1NzcsMjY4OTYxODE2MCwyMDE3MjEzNTA4LDYzMTIxODEwNiwxMjY5MzQ0NDgzLDI3MjMyMzgzODcsMTU3MTAwNTQzOCwyMTUxNjk0NTI4LDkzMjk0NDc0LDEwNjY1NzA0MTMsNTYzOTc3NjYwLDE4ODI3MzI2MTYsNDA1OTQyODEwMCwxNjczMzEzNTAzLDIwMDg0NjMwNDEsMjk1MDM1NTU3MywxMTA5NDY3NDkxLDUzNzkyMzYzMiwzODU4NzU5NDUwLDQyNjA2MjMxMTgsMzIxODI2NDY4NSwyMTc3NzQ4MzAwLDQwMzQ0MjcwOCw2Mzg3ODQzMDksMzI4NzA4NDA3OSwzMTkzOTIxNTA1LDg5OTEyNzIwMiwyMjg2MTc1NDM2LDc3MzI2NTIwOSwyNDc5MTQ2MDcxLDE0MzcwNTA4NjYsNDIzNjE0ODM1NCwyMDUwODMzNzM1LDMzNjIwMjI1NzIsMzEyNjY4MTA2Myw4NDA1MDU2NDMsMzg2NjMyNTkwOSwzMjI3NTQxNjY0LDQyNzkxNzcyMCwyNjU1OTk3OTA1LDI3NDkxNjA1NzUsMTE0MzA4NzcxOCwxNDEyMDQ5NTM0LDk5OTMyOTk2MywxOTM0OTcyMTksMjM1MzQxNTg4MiwzMzU0MzI0NTIxLDE4MDcyNjgwNTEsNjcyNDA0NTQwLDI4MTY0MDEwMTcsMzE2MDMwMTI4MiwzNjk4MjI0OTMsMjkxNjg2NjkzNCwzNjg4OTQ3NzcxLDE2ODEwMTEyODYsMTk0OTk3MzA3MCwzMzYyMDIyNzAsMjQ1NDI3NjU3MSwyMDE3MjEzNTQsMTIxMDMyODE3MiwzMDkzMDYwODM2LDI2ODAzNDEwODUsMzE4NDc3NjA0NiwxMTM1Mzg5OTM1LDMyOTQ3ODIxMTgsOTY1ODQxMzIwLDgzMTg4Njc1NiwzNTU0OTkzMjA3LDQwNjgwNDcyNDMsMzU4ODc0NTAxMCwyMzQ1MTkxNDkxLDE4NDkxMTI0MDksMzY2NDYwNDU5OSwyNjA1NDAyOCwyOTgzNTgxMDI4LDI2MjIzNzc2ODIsMTIzNTg1NTg0MCwzNjMwOTg0MzcyLDI4OTEzMzk1MTQsNDA5MjkxNjc0MywzNDg4Mjc5MDc3LDMzOTU2NDI3OTksNDEwMTY2NzQ3MCwxMjAyNjMwMzc3LDI2ODk2MTgxNiwxODc0NTA4NTAxLDQwMzQ0MjcwMTYsMTI0Mzk0ODM5OSwxNTQ2NTMwNDE4LDk0MTM2NjMwOCwxNDcwNTM5NTA1LDE5NDEyMjI1OTksMjU0NjM4NjUxMywzNDIxMDM4NjI3LDI3MTU2NzE5MzIsMzg5OTk0NjE0MCwxMDQyMjI2OTc3LDI1MjE1MTcwMjEsMTYzOTgyNDg2MCwyMjcyNDkwMzAsMjYwNzM3NjY5LDM3NjU0NjUyMzIsMjA4NDQ1Mzk1NCwxOTA3NzMzOTU2LDM0MjkyNjMwMTgsMjQyMDY1NjM0NCwxMDA4NjA2NzcsNDE2MDE1NzE4NSw0NzA2ODMxNTQsMzI2MTE2MTg5MSwxNzgxODcxOTY3LDI5MjQ5NTk3MzcsMTc3Mzc3OTQwOCwzOTQ2OTIyNDEsMjU3OTYxMTk5Miw5NzQ5ODY1MzUsNjY0NzA2NzQ1LDM2NTU0NTkxMjgsMzk1ODk2MjE5NSw3MzE0MjA4NTEsNTcxNTQzODU5LDM1MzAxMjM3MDcsMjg0OTYyNjQ4MCwxMjY3ODMxMTMsODY1Mzc1Mzk5LDc2NTE3MjY2MiwxMDA4NjA2NzU0LDM2MTIwMzYwMiwzMzg3NTQ5OTg0LDIyNzg0NzczODUsMjg1NzcxOTI5NSwxMzQ0ODA5MDgwLDI3ODI5MTIzNzgsNTk1NDI2NzEsMTUwMzc2NDk4NCwxNjAwMDg1NzYsNDM3MDYyOTM1LDE3MDcwNjUzMDYsMzYyMjIzMzY0OSwyMjE4OTM0OTgyLDM0OTY1MDM0ODAsMjE4NTMxNDc1NSw2OTc5MzIyMDgsMTUxMjkxMDE5OSw1MDQzMDMzNzcsMjA3NTE3NzE2MywyODI0MDk5MDY4LDE4NDEwMTk4NjIsNzM5NjQ0OTg2XTt2YXIgVDI9WzI3ODEyNDIyMTEsMjIzMDg3NzMwOCwyNTgyNTQyMTk5LDIzODE3NDA5MjMsMjM0ODc3NjgyLDMxODQ5NDYwMjcsMjk4NDE0NDc1MSwxNDE4ODM5NDkzLDEzNDg0ODEwNzIsNTA0NjI5NzcsMjg0ODg3NjM5MSwyMTAyNzk5MTQ3LDQzNDYzNDQ5NCwxNjU2MDg0NDM5LDM4NjM4NDk4OTksMjU5OTE4ODA4NiwxMTY3MDUxNDY2LDI2MzYwODc5MzgsMTA4Mjc3MTkxMywyMjgxMzQwMjg1LDM2ODA0ODg5MCwzOTU0MzM0MDQxLDMzODE1NDQ3NzUsMjAxMDYwNTkyLDM5NjM3MjcyNzcsMTczOTgzODY3Niw0MjUwOTAzMjAyLDM5MzA0MzU1MDMsMzIwNjc4MjEwOCw0MTQ5NDUzOTg4LDI1MzE1NTM5MDYsMTUzNjkzNDA4MCwzMjYyNDk0NjQ3LDQ4NDU3MjY2OSwyOTIzMjcxMDU5LDE3ODMzNzUzOTgsMTUxNzA0MTIwNiwxMDk4NzkyNzY3LDQ5Njc0MjMxLDEzMzQwMzc3MDgsMTU1MDMzMjk4MCw0MDk4OTkxNTI1LDg4NjE3MTEwOSwxNTA1OTgxMjksMjQ4MTA5MDkyOSwxOTQwNjQyMDA4LDEzOTg5NDQwNDksMTA1OTcyMjUxNywyMDE4NTE5MDgsMTM4NTU0NzcxOSwxNjk5MDk1MzMxLDE1ODczOTc1NzEsNjc0MjQwNTM2LDI3MDQ3NzQ4MDYsMjUyMzE0ODg1LDMwMzk3OTU4NjYsMTUxOTE0MjQ3LDkwODMzMzU4NiwyNjAyMjcwODQ4LDEwMzgwODI3ODYsNjUxMDI5NDgzLDE3NjY3Mjk1MTEsMzQ0NzY5ODA5OCwyNjgyOTQyODM3LDQ1NDE2Njc5MywyNjUyNzM0MzM5LDE5NTE5MzU1MzIsNzc1MTY2NDkwLDc1ODUyMDYwMywzMDAwNzkwNjM4LDQwMDQ3OTcwMTgsNDIxNzA4NjExMiw0MTM3OTY0MTE0LDEyOTk1OTQwNDMsMTYzOTQzODAzOCwzNDY0MzQ0NDk5LDIwNjg5ODIwNTcsMTA1NDcyOTE4NywxOTAxOTk3ODcxLDI1MzQ2Mzg3MjQsNDEyMTMxODIyNywxNzU3MDA4MzM3LDAsNzUwOTA2ODYxLDE2MTQ4MTUyNjQsNTM1MDM1MTMyLDMzNjM0MTg1NDUsMzk4ODE1MTEzMSwzMjAxNTkxOTE0LDExODM2OTc4NjcsMzY0NzQ1NDkxMCwxMjY1Nzc2OTUzLDM3MzQyNjAyOTgsMzU2Njc1MDc5NiwzOTAzODcxMDY0LDEyNTAyODM0NzEsMTgwNzQ3MDgwMCw3MTc2MTUwODcsMzg0NzIwMzQ5OCwzODQ2OTUyOTEsMzMxMzkxMDU5NSwzNjE3MjEzNzczLDE0MzI3NjExMzksMjQ4NDE3NjI2MSwzNDgxOTQ1NDEzLDI4Mzc2OTMzNywxMDA5MjU5NTQsMjE4MDkzOTY0Nyw0MDM3MDM4MTYwLDExNDg3MzA0MjgsMzEyMzAyNzg3MSwzODEzMzg2NDA4LDQwODc1MDExMzcsNDI2NzU0OTYwMywzMjI5NjMwNTI4LDIzMTU2MjAyMzksMjkwNjYyNDY1OCwzMTU2MzE5NjQ1LDEyMTUzMTM5NzYsODI5NjYwMDUsMzc0Nzg1NTU0OCwzMjQ1ODQ4MjQ2LDE5NzQ0NTkwOTgsMTY2NTI3ODI0MSw4MDc0MDc2MzIsNDUxMjgwODk1LDI1MTUyNDA4MywxODQxMjg3ODkwLDEyODM1NzUyNDUsMzM3MTIwMjY4LDg5MTY4NzY5OSw4MDEzNjkzMjQsMzc4NzM0OTg1NSwyNzIxNDIxMjA3LDM0MzE0ODI0MzYsOTU5MzIxODc5LDE0NjkzMDE5NTYsNDA2NTY5OTc1MSwyMTk3NTg1NTM0LDExOTkxOTM0MDUsMjg5ODgxNDA1MiwzODg3NzUwNDkzLDcyNDcwMzUxMywyNTE0OTA4MDE5LDI2OTY5NjIxNDQsMjU1MTgwODM4NSwzNTE2ODEzMTM1LDIxNDE0NDUzNDAsMTcxNTc0MTIxOCwyMTE5NDQ1MDM0LDI4NzI4MDc1NjgsMjE5ODU3MTE0NCwzMzk4MTkwNjYyLDcwMDk2ODY4NiwzNTQ3MDUyMjE2LDEwMDkyNTk1NDAsMjA0MTA0NDcwMiwzODAzOTk1NzQyLDQ4Nzk4Mzg4MywxOTkxMTA1NDk5LDEwMDQyNjU2OTYsMTQ0OTQwNzAyNiwxMzE2MjM5OTMwLDUwNDYyOTc3MCwzNjgzNzk3MzIxLDE2ODU2MDEzNCwxODE2NjY3MTcyLDM4MzcyODc1MTYsMTU3MDc1MTE3MCwxODU3OTM0MjkxLDQwMTQxODk3NDAsMjc5Nzg4ODA5OCwyODIyMzQ1MTA1LDI3NTQ3MTI5ODEsOTM2NjMzNTcyLDIzNDc5MjM4MzMsODUyODc5MzM1LDExMzMyMzQzNzYsMTUwMDM5NTMxOSwzMDg0NTQ1Mzg5LDIzNDg5MTIwMTMsMTY4OTM3NjIxMywzNTMzNDU5MDIyLDM3NjI5MjM5NDUsMzAzNDA4MjQxMiw0MjA1NTk4Mjk0LDEzMzQyODQ2OCw2MzQzODMwODIsMjk0OTI3NzAyOSwyMzk4Mzg2ODEwLDM5MTM3ODkxMDIsNDAzNzAzODE2LDM1ODA4NjkzMDYsMjI5NzQ2MDg1NiwxODY3MTMwMTQ5LDE5MTg2NDM3NTgsNjA3NjU2OTg4LDQwNDkwNTMzNTAsMzM0NjI0ODg4NCwxMzY4OTAxMzE4LDYwMDU2NTk5MiwyMDkwOTgyODc3LDI2MzI0Nzk4NjAsNTU3NzE5MzI3LDM3MTc2MTQ0MTEsMzY5NzM5MzA4NSwyMjQ5MDM0NjM1LDIyMzIzODgyMzQsMjQzMDYyNzk1MiwxMTE1NDM4NjU0LDMyOTU3ODY0MjEsMjg2NTUyMjI3OCwzNjMzMzM0MzQ0LDg0MjgwMDY3LDMzMDI3ODMwLDMwMzgyODQ5NCwyNzQ3NDI1MTIxLDE2MDA3OTU5NTcsNDE4ODk1MjQwNywzNDk2NTg5NzUzLDI0MzQyMzgwODYsMTQ4NjQ3MTYxNyw2NTgxMTk5NjUsMzEwNjM4MTQ3MCw5NTM4MDMyMzMsMzM0MjMxODAwLDMwMDU5Nzg3NzYsODU3ODcwNjA5LDMxNTExMjg5MzcsMTg5MDE3OTU0NSwyMjk4OTczODM4LDI4MDUxNzU0NDQsMzA1NjQ0MjI2Nyw1NzQzNjUyMTQsMjQ1MDg4NDQ4Nyw1NTAxMDM1MjksMTIzMzYzNzA3MCw0Mjg5MzUzMDQ1LDIwMTg1MTkwODAsMjA1NzY5MTEwMywyMzk5Mzc0NDc2LDQxNjY2MjM2NDksMjE0ODEwODY4MSwzODc1ODMyNDUsMzY2NDEwMTMxMSw4MzYyMzI5MzQsMzMzMDU1NjQ4MiwzMTAwNjY1OTYwLDMyODAwOTM1MDUsMjk1NTUxNjMxMywyMDAyMzk4NTA5LDI4NzE4MjYwNywzNDEzODgxMDA4LDQyMzg4OTAwNjgsMzU5NzUxNTcwNyw5NzU5Njc3NjZdO3ZhciBUMz1bMTY3MTgwODYxMSwyMDg5MDg5MTQ4LDIwMDY1NzY3NTksMjA3MjkwMTI0Myw0MDYxMDAzNzYyLDE4MDc2MDMzMDcsMTg3MzkyNzc5MSwzMzEwNjUzODkzLDgxMDU3Mzg3MiwxNjk3NDMzNywxNzM5MTgxNjcxLDcyOTYzNDM0Nyw0MjYzMTEwNjU0LDM2MTM1NzA1MTksMjg4Mzk5NzA5OSwxOTg5ODY0NTY2LDMzOTM1NTY0MjYsMjE5MTMzNTI5OCwzMzc2NDQ5OTkzLDIxMDYwNjM0ODUsNDE5NTc0MTY5MCwxNTA4NjE4ODQxLDEyMDQzOTE0OTUsNDAyNzMxNzIzMiwyOTE3OTQxNjc3LDM1NjM1NjYwMzYsMjczNDUxNDA4MiwyOTUxMzY2MDYzLDI2Mjk3NzIxODgsMjc2NzY3MjIyOCwxOTIyNDkxNTA2LDMyMjcyMjkxMjAsMzA4Mjk3NDY0Nyw0MjQ2NTI4NTA5LDI0Nzc2Njk3NzksNjQ0NTAwNTE4LDkxMTg5NTYwNiwxMDYxMjU2NzY3LDQxNDQxNjYzOTEsMzQyNzc2MzE0OCw4Nzg0NzEyMjAsMjc4NDI1MjMyNSwzODQ1NDQ0MDY5LDQwNDM4OTczMjksMTkwNTUxNzE2OSwzNjMxNDU5Mjg4LDgyNzU0ODIwOSwzNTY0NjEwNzcsNjc4OTczNDgsMzM0NDA3ODI3OSw1OTM4Mzk2NTEsMzI3Nzc1Nzg5MSw0MDUyODY5MzYsMjUyNzE0NzkyNiw4NDg3MTY4NSwyNTk1NTY1NDY2LDExODAzMzkyNywzMDU1MzgwNjYsMjE1NzY0ODc2OCwzNzk1NzA1ODI2LDM5NDUxODg4NDMsNjYxMjEyNzExLDI5OTk4MTIwMTgsMTk3MzQxNDUxNywxNTI3NjkwMzMsMjIwODE3NzUzOSw3NDU4MjIyNTIsNDM5MjM1NjEwLDQ1NTk0NzgwMywxODU3MjE1NTk4LDE1MjU1OTMxNzgsMjcwMDgyNzU1MiwxMzkxODk1NjM0LDk5NDkzMjI4MywzNTk2NzI4Mjc4LDMwMTY2NTQyNTksNjk1OTQ3ODE3LDM4MTI1NDgwNjcsNzk1OTU4ODMxLDIyMjQ0OTM0NDQsMTQwODYwNzgyNywzNTEzMzAxNDU3LDAsMzk3OTEzMzQyMSw1NDMxNzg3ODQsNDIyOTk0ODQxMiwyOTgyNzA1NTg1LDE1NDIzMDUzNzEsMTc5MDg5MTExNCwzNDEwMzk4NjY3LDMyMDE5MTg5MTAsOTYxMjQ1NzUzLDEyNTYxMDA5MzgsMTI4OTAwMTAzNiwxNDkxNjQ0NTA0LDM0Nzc3Njc2MzEsMzQ5NjcyMTM2MCw0MDEyNTU3ODA3LDI4NjcxNTQ4NTgsNDIxMjU4MzkzMSwxMTM3MDE4NDM1LDEzMDU5NzUzNzMsODYxMjM0NzM5LDIyNDEwNzM1NDEsMTE3MTIyOTI1Myw0MTc4NjM1MjU3LDMzOTQ4Njc0LDIxMzkyMjU3MjcsMTM1Nzk0Njk2MCwxMDExMTIwMTg4LDI2Nzk3NzY2NzEsMjgzMzQ2ODMyOCwxMzc0OTIxMjk3LDI3NTEzNTYzMjMsMTA4NjM1NzU2OCwyNDA4MTg3Mjc5LDI0NjA4Mjc1MzgsMjY0NjM1MjI4NSw5NDQyNzE0MTYsNDExMDc0MjAwNSwzMTY4NzU2NjY4LDMwNjYxMzI0MDYsMzY2NTE0NTgxOCw1NjAxNTMxMjEsMjcxNTg5MzkyLDQyNzk5NTI4OTUsNDA3Nzg0NjAwMywzNTMwNDA3ODkwLDM0NDQzNDMyNDUsMjAyNjQzNDY4LDMyMjI1MDI1OSwzOTYyNTUzMzI0LDE2MDg2Mjk4NTUsMjU0Mzk5MDE2NywxMTU0MjU0OTE2LDM4OTYyMzMxOSwzMjk0MDczNzk2LDI4MTc2NzY3MTEsMjEyMjUxMzUzNCwxMDI4MDk0NTI1LDE2ODkwNDUwOTIsMTU3NTQ2NzYxMyw0MjIyNjEyNzMsMTkzOTIwMzY5OSwxNjIxMTQ3NzQ0LDIxNzQyMjg4NjUsMTMzOTEzNzYxNSwzNjk5MzUyNTQwLDU3NzEyNzQ1OCw3MTI5MjIxNTQsMjQyNzE0MTAwOCwyMjkwMjg5NTQ0LDExODc2NzkzMDIsMzk5NTcxNTU2NiwzMTAwODYzNDE2LDMzOTQ4Njc0MCwzNzMyNTE0NzgyLDE1OTE5MTc2NjIsMTg2NDU1NTYzLDM2ODE5ODgwNTksMzc2MjAxOTI5Niw4NDQ1MjI1NDYsOTc4MjIwMDkwLDE2OTc0MzM3MCwxMjM5MTI2NjAxLDEwMTMyMTczNCw2MTEwNzYxMzIsMTU1ODQ5MzI3NiwzMjYwOTE1NjUwLDM1NDcyNTAxMzEsMjkwMTM2MTU4MCwxNjU1MDk2NDE4LDI0NDM3MjExMDUsMjUxMDU2NTc4MSwzODI4ODYzOTcyLDIwMzkyMTQ3MTMsMzg3ODg2ODQ1NSwzMzU5ODY5ODk2LDkyODYwNzc5OSwxODQwNzY1NTQ5LDIzNzQ3NjI4OTMsMzU4MDE0NjEzMywxMzIyNDI1NDIyLDI4NTAwNDg0MjUsMTgyMzc5MTIxMiwxNDU5MjY4Njk0LDQwOTQxNjE5MDgsMzkyODM0NjYwMiwxNzA2MDE5NDI5LDIwNTYxODkwNTAsMjkzNDUyMzgyMiwxMzU3OTQ2OTYsMzEzNDU0OTk0NiwyMDIyMjQwMzc2LDYyODA1MDQ2OSw3NzkyNDY2MzgsNDcyMTM1NzA4LDI4MDA4MzQ0NzAsMzAzMjk3MDE2NCwzMzI3MjM2MDM4LDM4OTQ2NjAwNzIsMzcxNTkzMjYzNywxOTU2NDQwMTgwLDUyMjI3MjI4NywxMjcyODEzMTMxLDMxODUzMzY3NjUsMjM0MDgxODMxNSwyMzIzOTc2MDc0LDE4ODg1NDI4MzIsMTA0NDU0NDU3NCwzMDQ5NTUwMjYxLDE3MjI0Njk0NzgsMTIyMjE1MjI2NCw1MDY2MDg2Nyw0MTI3MzI0MTUwLDIzNjA2Nzg1NCwxNjM4MTIyMDgxLDg5NTQ0NTU1NywxNDc1OTgwODg3LDMxMTc0NDM1MTMsMjI1NzY1NTY4NiwzMjQzODA5MjE3LDQ4OTExMDA0NSwyNjYyOTM0NDMwLDM3Nzg1OTkzOTMsNDE2MjA1NTE2MCwyNTYxODc4OTM2LDI4ODU2MzcyOSwxNzczOTE2Nzc3LDM2NDgwMzkzODUsMjM5MTM0NTAzOCwyNDkzOTg1Njg0LDI2MTI0MDc3MDcsNTA1NTYwMDk0LDIyNzQ0OTc5MjcsMzkxMTI0MDE2OSwzNDYwOTI1MzkwLDE0NDI4MTg2NDUsNjc4OTczNDgwLDM3NDkzNTcwMjMsMjM1ODE4Mjc5NiwyNzE3NDA3NjQ5LDIzMDY4Njk2NDEsMjE5NjE3ODA1LDMyMTg3NjExNTEsMzg2MjAyNjIxNCwxMTIwMzA2MjQyLDE3NTY5NDI0NDAsMTEwMzMzMTkwNSwyNTc4NDU5MDMzLDc2Mjc5NjU4OSwyNTI3ODAwNDcsMjk2NjEyNTQ4OCwxNDI1ODQ0MzA4LDMxNTEzOTIxODcsMzcyOTExMTI2XTt2YXIgVDQ9WzE2Njc0NzQ4ODYsMjA4ODUzNTI4OCwyMDA0MzI2ODk0LDIwNzE2OTQ4MzgsNDA3NTk0OTU2NywxODAyMjIzMDYyLDE4Njk1OTEwMDYsMzMxODA0Mzc5Myw4MDg0NzI2NzIsMTY4NDM1MjIsMTczNDg0NjkyNiw3MjQyNzA0MjIsNDI3ODA2NTYzOSwzNjIxMjE2OTQ5LDI4ODAxNjk1NDksMTk4NzQ4NDM5NiwzNDAyMjUzNzExLDIxODk1OTc5ODMsMzM4NTQwOTY3MywyMTA1Mzc4ODEwLDQyMTA2OTM2MTUsMTQ5OTA2NTI2NiwxMTk1ODg2OTkwLDQwNDIyNjM1NDcsMjkxMzg1NjU3NywzNTcwNjg5OTcxLDI3Mjg1OTA2ODcsMjk0NzU0MTU3MywyNjI3NTE4MjQzLDI3NjIyNzQ2NDMsMTkyMDExMjM1NiwzMjMzODMxODM1LDMwODIyNzMzOTcsNDI2MTIyMzY0OSwyNDc1OTI5MTQ5LDY0MDA1MTc4OCw5MDk1MzE3NTYsMTA2MTExMDE0Miw0MTYwMTYwNTAxLDM0MzU5NDE3NjMsODc1ODQ2NzYwLDI3NzkxMTY2MjUsMzg1NzAwMzcyOSw0MDU5MTA1NTI5LDE5MDMyNjg4MzQsMzYzODA2NDA0Myw4MjUzMTYxOTQsMzUzNzEzOTYyLDY3Mzc0MDg4LDMzNTE3Mjg3ODksNTg5NTIyMjQ2LDMyODQzNjA4NjEsNDA0MjM2MzM2LDI1MjY0NTQwNzEsODQyMTc2MTAsMjU5MzgzMDE5MSwxMTc5MDE1ODIsMzAzMTgzMzk2LDIxNTU5MTE5NjMsMzgwNjQ3Nzc5MSwzOTU4MDU2NjUzLDY1Njg5NDI4NiwyOTk4MDYyNDYzLDE5NzA2NDI5MjIsMTUxNTkxNjk4LDIyMDY0NDA5ODksNzQxMTEwODcyLDQzNzkyMzM4MCw0NTQ3NjU4NzgsMTg1Mjc0ODUwOCwxNTE1OTA4Nzg4LDI2OTQ5MDQ2NjcsMTM4MTE2ODgwNCw5OTM3NDIxOTgsMzYwNDM3Mzk0MywzMDE0OTA1NDY5LDY5MDU4NDQwMiwzODIzMzIwNzk3LDc5MTYzODM2NiwyMjIzMjgxOTM5LDEzOTgwMTEzMDIsMzUyMDE2MTk3NywwLDM5OTE3NDM2ODEsNTM4OTkyNzA0LDQyNDQzODE2NjcsMjk4MTIxODQyNSwxNTMyNzUxMjg2LDE3ODUzODA1NjQsMzQxOTA5NjcxNywzMjAwMTc4NTM1LDk2MDA1NjE3OCwxMjQ2NDIwNjI4LDEyODAxMDM1NzYsMTQ4MjIyMTc0NCwzNDg2NDY4NzQxLDM1MDMzMTk5OTUsNDAyNTQyODY3NywyODYzMzI2NTQzLDQyMjc1MzY2MjEsMTEyODUxNDk1MCwxMjk2OTQ3MDk4LDg1OTAwMjIxNCwyMjQwMTIzOTIxLDExNjIyMDMwMTgsNDE5Mzg0OTU3NywzMzY4NzA0NCwyMTM5MDYyNzgyLDEzNDc0ODE3NjAsMTAxMDU4MjY0OCwyNjc4MDQ1MjIxLDI4Mjk2NDA1MjMsMTM2NDMyNTI4MiwyNzQ1NDMzNjkzLDEwNzc5ODU0MDgsMjQwODU0ODg2OSwyNDU5MDg2MTQzLDI2NDQzNjAyMjUsOTQzMjEyNjU2LDQxMjY0NzU1MDUsMzE2NjQ5NDU2MywzMDY1NDMwMzkxLDM2NzE3NTAwNjMsNTU1ODM2MjI2LDI2OTQ5NjM1Miw0Mjk0OTA4NjQ1LDQwOTI3OTI1NzMsMzUzNzAwNjAxNSwzNDUyNzgzNzQ1LDIwMjExODE2OCwzMjAwMjU4OTQsMzk3NDkwMTY5OSwxNjAwMTE5MjMwLDI1NDMyOTcwNzcsMTE0NTM1OTQ5NiwzODczOTc5MzQsMzMwMTIwMTgxMSwyODEyODAxNjIxLDIxMjIyMjAyODQsMTAyNzQyNjE3MCwxNjg0MzE5NDMyLDE1NjY0MzUyNTgsNDIxMDc5ODU4LDE5MzY5NTQ4NTQsMTYxNjk0NTM0NCwyMTcyNzUzOTQ1LDEzMzA2MzEwNzAsMzcwNTQzODExNSw1NzI2Nzk3NDgsNzA3NDI3OTI0LDI0MjU0MDAxMjMsMjI5MDY0NzgxOSwxMTc5MDQ0NDkyLDQwMDg1ODU2NzEsMzA5OTEyMDQ5MSwzMzY4NzA0NDAsMzczOTEyMjA4NywxNTgzMjc2NzMyLDE4NTI3NzcxOCwzNjg4NTkzMDY5LDM3NzI3OTE3NzEsODQyMTU5NzE2LDk3Njg5OTcwMCwxNjg0MzUyMjAsMTIyOTU3NzEwNiwxMDEwNTkwODQsNjA2MzY2NzkyLDE1NDk1OTE3MzYsMzI2NzUxNzg1NSwzNTUzODQ5MDIxLDI4OTcwMTQ1OTUsMTY1MDYzMjM4OCwyNDQyMjQyMTA1LDI1MDk2MTIwODEsMzg0MDE2MTc0NywyMDM4MDA4ODE4LDM4OTA2ODg3MjUsMzM2ODU2NzY5MSw5MjYzNzQyNTQsMTgzNTkwNzAzNCwyMzc0ODYzODczLDM1ODc1MzE5NTMsMTMxMzc4ODU3MiwyODQ2NDgyNTA1LDE4MTkwNjM1MTIsMTQ0ODU0MDg0NCw0MTA5NjMzNTIzLDM5NDEyMTM2NDcsMTcwMTE2Mjk1NCwyMDU0ODUyMzQwLDI5MzA2OTg1NjcsMTM0NzQ4MTc2LDMxMzI4MDY1MTEsMjAyMTE2NTI5Niw2MjMyMTAzMTQsNzc0Nzk1ODY4LDQ3MTYwNjMyOCwyNzk1OTU4NjE1LDMwMzE3NDY0MTksMzMzNDg4NTc4MywzOTA3NTI3NjI3LDM3MjIyODAwOTcsMTk1Mzc5OTQwMCw1MjIxMzM4MjIsMTI2MzI2MzEyNiwzMTgzMzM2NTQ1LDIzNDExNzY4NDUsMjMyNDMzMzgzOSwxODg2NDI1MzEyLDEwNDQyNjc2NDQsMzA0ODU4ODQwMSwxNzE4MDA0NDI4LDEyMTI3MzM1ODQsNTA1Mjk1NDIsNDE0MzMxNzQ5NSwyMzU4MDMxNjQsMTYzMzc4ODg2Niw4OTI2OTAyODIsMTQ2NTM4MzM0MiwzMTE1OTYyNDczLDIyNTY5NjU5MTEsMzI1MDY3MzgxNyw0ODg0NDk4NTAsMjY2MTIwMjIxNSwzNzg5NjMzNzUzLDQxNzcwMDc1OTUsMjU2MDE0NDE3MSwyODYzMzk4NzQsMTc2ODUzNzA0MiwzNjU0OTA2MDI1LDIzOTE3MDU4NjMsMjQ5Mjc3MDA5OSwyNjEwNjczMTk3LDUwNTI5MTMyNCwyMjczODA4OTE3LDM5MjQzNjk2MDksMzQ2OTYyNTczNSwxNDMxNjk5MzcwLDY3Mzc0MDg4MCwzNzU1OTY1MDkzLDIzNTgwMjE4OTEsMjcxMTc0NjY0OSwyMzA3NDg5ODAxLDIxODk2MTY5MCwzMjE3MDIxNTQxLDM4NzM4NDU3MTksMTExMTY3MjQ1MiwxNzUxNjkzNTIwLDEwOTQ4Mjg5MzAsMjU3Njk4NjE1Myw3NTc5NTQzOTQsMjUyNjQ1NjYyLDI5NjQzNzY0NDMsMTQxNDg1NTg0OCwzMTQ5NjQ5NTE3LDM3MDU1NTQzNl07dmFyIFQ1PVsxMzc0OTg4MTEyLDIxMTgyMTQ5OTUsNDM3NzU3MTIzLDk3NTY1ODY0NiwxMDAxMDg5OTk1LDUzMDQwMDc1MywyOTAyMDg3ODUxLDEyNzMxNjg3ODcsNTQwMDgwNzI1LDI5MTAyMTk3NjYsMjI5NTEwMTA3Myw0MTEwNTY4NDg1LDEzNDA0NjMxMDAsMzMwNzkxNjI0Nyw2NDEwMjUxNTIsMzA0MzE0MDQ5NSwzNzM2MTY0OTM3LDYzMjk1MzcwMywxMTcyOTY3MDY0LDE1NzY5NzY2MDksMzI3NDY2NzI2NiwyMTY5MzAzMDU4LDIzNzAyMTM3OTUsMTgwOTA1NDE1MCw1OTcyNzg0NywzNjE5Mjk4NzcsMzIxMTYyMzE0NywyNTA1MjAyMTM4LDM1NjkyNTUyMTMsMTQ4NDAwNTg0MywxMjM5NDQzNzUzLDIzOTU1ODg2NzYsMTk3NTY4MzQzNCw0MTAyOTc3OTEyLDI1NzI2OTcxOTUsNjY2NDY0NzMzLDMyMDI0MzcwNDYsNDAzNTQ4OTA0NywzMzc0MzYxNzAyLDIxMTA2Njc0NDQsMTY3NTU3Nzg4MCwzODQzNjk5MDc0LDI1Mzg2ODExODQsMTY0OTYzOTIzNywyOTc2MTUxNTIwLDMxNDQzOTY0MjAsNDI2OTkwNzk5Niw0MTc4MDYyMjI4LDE4ODM3OTM0OTYsMjQwMzcyODY2NSwyNDk3NjA0NzQzLDEzODM4NTYzMTEsMjg3NjQ5NDYyNywxOTE3NTE4NTYyLDM4MTA0OTYzNDMsMTcxNjg5MDQxMCwzMDAxNzU1NjU1LDgwMDQ0MDgzNSwyMjYxMDg5MTc4LDM1NDM1OTkyNjksODA3OTYyNjEwLDU5OTc2MjM1NCwzMzc3ODM2MiwzOTc3Njc1MzU2LDIzMjg4Mjg5NzEsMjgwOTc3MTE1NCw0MDc3Mzg0NDMyLDEzMTU1NjIxNDUsMTcwODg0ODMzMywxMDEwMzk4MjksMzUwOTg3MTEzNSwzMjk5Mjc4NDc0LDg3NTQ1MTI5MywyNzMzODU2MTYwLDkyOTg3Njk4LDI3Njc2NDU1NTcsMTkzMTk1MDY1LDEwODAwOTQ2MzQsMTU4NDUwNDU4MiwzMTc4MTA2OTYxLDEwNDIzODU2NTcsMjUzMTA2NzQ1MywzNzExODI5NDIyLDEzMDY5NjczNjYsMjQzODIzNzYyMSwxOTA4Njk0Mjc3LDY3NTU2NDYzLDE2MTU4NjEyNDcsNDI5NDU2MTY0LDM2MDI3NzAzMjcsMjMwMjY5MDI1MiwxNzQyMzE1MTI3LDI5NjgwMTE0NTMsMTI2NDU0NjY0LDM4NzcxOTg2NDgsMjA0MzIxMTQ4MywyNzA5MjYwODcxLDIwODQ3MDQyMzMsNDE2OTQwODIwMSwwLDE1OTQxNzk4Nyw4NDE3Mzk1OTIsNTA0NDU5NDM2LDE4MTc4NjY4MzAsNDI0NTYxODY4MywyNjAzODg5NTAsMTAzNDg2Nzk5OCw5MDg5MzM0MTUsMTY4ODEwODUyLDE3NTA5MDIzMDUsMjYwNjQ1Mzk2OSw2MDc1MzA1NTQsMjAyMDA4NDk3LDI0NzIwMTE1MzUsMzAzNTUzNTA1OCw0NjMxODAxOTAsMjE2MDExNzA3MSwxNjQxODE2MjI2LDE1MTc3Njc1MjksNDcwOTQ4Mzc0LDM4MDEzMzIyMzQsMzIzMTcyMjIxMywxMDA4OTE4NTk1LDMwMzc2NTI3NywyMzU0NzQxODcsNDA2OTI0Njg5Myw3NjY5NDU0NjUsMzM3NTUzODY0LDE0NzU0MTg1MDEsMjk0MzY4MjM4MCw0MDAzMDYxMTc5LDI3NDMwMzQxMDksNDE0NDA0Nzc3NSwxNTUxMDM3ODg0LDExNDc1NTA2NjEsMTU0MzIwODUwMCwyMzM2NDM0NTUwLDM0MDgxMTk1MTYsMzA2OTA0OTk2MCwzMTAyMDExNzQ3LDM2MTAzNjkyMjYsMTExMzgxODM4NCwzMjg2NzE4MDgsMjIyNzU3MzAyNCwyMjM2MjI4NzMzLDM1MzU0ODY0NTYsMjkzNTU2Njg2NSwzMzQxMzk0Mjg1LDQ5NjkwNjA1OSwzNzAyNjY1NDU5LDIyNjkwNjg2MCwyMDA5MTk1NDcyLDczMzE1Njk3MiwyODQyNzM3MDQ5LDI5NDkzMDY4MiwxMjA2NDc3ODU4LDI4MzUxMjMzOTYsMjcwMDA5OTM1NCwxNDUxMDQ0MDU2LDU3MzgwNDc4MywyMjY5NzI4NDU1LDM2NDQzNzk1ODUsMjM2MjA5MDIzOCwyNTY0MDMzMzM0LDI4MDExMDc0MDcsMjc3NjI5MjkwNCwzNjY5NDYyNTY2LDEwNjgzNTEzOTYsNzQyMDM5MDEyLDEzNTAwNzg5ODksMTc4NDY2MzE5NSwxNDE3NTYxNjk4LDQxMzY0NDA3NzAsMjQzMDEyMjIxNiw3NzU1NTA4MTQsMjE5Mzg2MjY0NSwyNjczNzA1MTUwLDE3NzUyNzY5MjQsMTg3NjI0MTgzMywzNDc1MzEzMzMxLDMzNjY3NTQ2MTksMjcwMDQwNDg3LDM5MDI1NjMxODIsMzY3ODEyNDkyMywzNDQxODUwMzc3LDE4NTEzMzI4NTIsMzk2OTU2MjM2OSwyMjAzMDMyMjMyLDM4Njg1NTI4MDUsMjg2ODg5NzQwNiw1NjYwMjE4OTYsNDAxMTE5MDUwMiwzMTM1NzQwODg5LDEyNDg4MDI1MTAsMzkzNjI5MTI4NCw2OTk0MzIxNTAsODMyODc3MjMxLDcwODc4MDg0OSwzMzMyNzQwMTQ0LDg5OTgzNTU4NCwxOTUxMzE3MDQ3LDQyMzY0Mjk5OTAsMzc2NzU4Njk5Miw4NjY2Mzc4NDUsNDA0MzYxMDE4NiwxMTA2MDQxNTkxLDIxNDQxNjE4MDYsMzk1NDQxNzExLDE5ODQ4MTI2ODUsMTEzOTc4MTcwOSwzNDMzNzEyOTgwLDM4MzUwMzY4OTUsMjY2NDU0MzcxNSwxMjgyMDUwMDc1LDMyNDA4OTQzOTIsMTE4MTA0NTExOSwyNjQwMjQzMjA0LDI1OTY1OTE3LDQyMDMxODExNzEsNDIxMTgxODc5OCwzMDA5ODc5Mzg2LDI0NjM4Nzk3NjIsMzkxMDE2MTk3MSwxODQyNzU5NDQzLDI1OTc4MDY0NzYsOTMzMzAxMzcwLDE1MDk0MzA0MTQsMzk0MzkwNjQ0MSwzNDY3MTkyMzAyLDMwNzY2MzkwMjksMzc3Njc2NzQ2OSwyMDUxNTE4NzgwLDI2MzEwNjU0MzMsMTQ0MTk1MjU3NSw0MDQwMTY3NjEsMTk0MjQzNTc3NSwxNDA4NzQ5MDM0LDE2MTA0NTk3MzksMzc0NTM0NTMwMCwyMDE3Nzc4NTY2LDM0MDA1Mjg3NjksMzExMDY1MDk0Miw5NDE4OTY3NDgsMzI2NTQ3ODc1MSwzNzEwNDkzMzAsMzE2ODkzNzIyOCw2NzUwMzk2MjcsNDI3OTA4MDI1Nyw5NjczMTE3MjksMTM1MDUwMjA2LDM2MzU3MzM2NjAsMTY4MzQwNzI0OCwyMDc2OTM1MjY1LDM1NzY4NzA1MTIsMTIxNTA2MTEwOCwzNTAxNzQxODkwXTt2YXIgVDY9WzEzNDc1NDgzMjcsMTQwMDc4MzIwNSwzMjczMjY3MTA4LDI1MjAzOTM1NjYsMzQwOTY4NTM1NSw0MDQ1MzgwOTMzLDI4ODAyNDAyMTYsMjQ3MTIyNDA2NywxNDI4MTczMDUwLDQxMzg1NjMxODEsMjQ0MTY2MTU1OCw2MzY4MTM5MDAsNDIzMzA5NDYxNSwzNjIwMDIyOTg3LDIxNDk5ODc2NTIsMjQxMTAyOTE1NSwxMjM5MzMxMTYyLDE3MzA1MjU3MjMsMjU1NDcxODczNCwzNzgxMDMzNjY0LDQ2MzQ2MTAxLDMxMDQ2MzcyOCwyNzQzOTQ0ODU1LDMzMjg5NTUzODUsMzg3NTc3MDIwNywyNTAxMjE4OTcyLDM5NTUxOTExNjIsMzY2NzIxOTAzMyw3Njg5MTcxMjMsMzU0NTc4OTQ3Myw2OTI3MDc0MzMsMTE1MDIwODQ1NiwxNzg2MTAyNDA5LDIwMjkyOTMxNzcsMTgwNTIxMTcxMCwzNzEwMzY4MTEzLDMwNjU5NjI4MzEsNDAxNjM5NTk3LDE3MjQ0NTcxMzIsMzAyODE0MzY3NCw0MDkxOTg0MTAsMjE5NjA1MjUyOSwxNjIwNTI5NDU5LDExNjQwNzE4MDcsMzc2OTcyMTk3NSwyMjI2ODc1MzEwLDQ4NjQ0MTM3NiwyNDk5MzQ4NTIzLDE0ODM3NTM1NzYsNDI4ODE5OTY1LDIyNzQ2ODA0MjgsMzA3NTYzNjIxNiw1OTg0Mzg4NjcsMzc5OTE0MTEyMiwxNDc0NTAyNTQzLDcxMTM0OTY3NSwxMjkxNjYxMjAsNTM0NTgzNzAsMjU5MjUyMzY0MywyNzgyMDgyODI0LDQwNjMyNDIzNzUsMjk4ODY4NzI2OSwzMTIwNjk0MTIyLDE1NTkwNDE2NjYsNzMwNTE3Mjc2LDI0NjA0NDkyMDQsNDA0MjQ1OTEyMiwyNzA2MjcwNjkwLDM0NDYwMDQ0NjgsMzU3Mzk0MTY5NCw1MzM4MDQxMzAsMjMyODE0MzYxNCwyNjM3NDQyNjQzLDI2OTUwMzM2ODUsODM5MjI0MDMzLDE5NzM3NDUzODcsOTU3MDU1OTgwLDI4NTYzNDU4MzksMTA2ODUyNzY3LDEzNzEzNjg5NzYsNDE4MTU5ODYwMiwxMDMzMjk3MTU4LDI5MzM3MzQ5MTcsMTE3OTUxMDQ2MSwzMDQ2MjAwNDYxLDkxMzQxOTE3LDE4NjI1MzQ4NjgsNDI4NDUwMjAzNyw2MDU2NTczMzksMjU0NzQzMjkzNywzNDMxNTQ2OTQ3LDIwMDMyOTQ2MjIsMzE4MjQ4NzYxOCwyMjgyMTk1MzM5LDk1NDY2OTQwMywzNjgyMTkxNTk4LDEyMDE3NjUzODYsMzkxNzIzNDcwMywzMzg4NTA3MTY2LDAsMjE5ODQzODAyMiwxMjExMjQ3NTk3LDI4ODc2NTE2OTYsMTMxNTcyMzg5MCw0MjI3NjY1NjYzLDE0NDM4NTc3MjAsNTA3MzU4OTMzLDY1Nzg2MTk0NSwxNjc4MzgxMDE3LDU2MDQ4NzU5MCwzNTE2NjE5NjA0LDk3NTQ1MTY5NCwyOTcwMzU2MzI3LDI2MTMxNDUzNSwzNTM1MDcyOTE4LDI2NTI2MDk0MjUsMTMzMzgzODAyMSwyNzI0MzIyMzM2LDE3Njc1MzY0NTksMzcwOTM4Mzk0LDE4MjYyMTExNCwzODU0NjA2Mzc4LDExMjgwMTQ1NjAsNDg3NzI1ODQ3LDE4NTQ2OTE5NywyOTE4MzUzODYzLDMxMDY3ODA4NDAsMzM1Njc2MTc2OSwyMjM3MTMzMDgxLDEyODY1NjcxNzUsMzE1Mjk3NjM0OSw0MjU1MzUwNjI0LDI2ODM3NjUwMzAsMzE2MDE3NTM0OSwzMzA5NTk0MTcxLDg3ODQ0MzM5MCwxOTg4ODM4MTg1LDM3MDQzMDA0ODYsMTc1NjgxODk0MCwxNjczMDYxNjE3LDM0MDMxMDA2MzYsMjcyNzg2MzA5LDEwNzUwMjU2OTgsNTQ1NTcyMzY5LDIxMDU4ODcyNjgsNDE3NDU2MDA2MSwyOTY2Nzk3MzAsMTg0MTc2ODg2NSwxMjYwMjMyMjM5LDQwOTEzMjcwMjQsMzk2MDMwOTMzMCwzNDk3NTA5MzQ3LDE4MTQ4MDMyMjIsMjU3ODAxODQ4OSw0MTk1NDU2MDcyLDU3NTEzODE0OCwzMjk5NDA5MDM2LDQ0Njc1NDg3OSwzNjI5NTQ2Nzk2LDQwMTE5OTYwNDgsMzM0NzUzMjExMCwzMjUyMjM4NTQ1LDQyNzA2Mzk3NzgsOTE1OTg1NDE5LDM0ODM4MjU1MzcsNjgxOTMzNTM0LDY1MTg2ODA0NiwyNzU1NjM2NjcxLDM4MjgxMDM4MzcsMjIzMzc3NTU0LDI2MDc0Mzk4MjAsMTY0OTcwNDUxOCwzMjcwOTM3ODc1LDM5MDE4MDY3NzYsMTU4MDA4Nzc5OSw0MTE4OTg3Njk1LDMxOTgxMTUyMDAsMjA4NzMwOTQ1OSwyODQyNjc4NTczLDMwMTY2OTcxMDYsMTAwMzAwNzEyOSwyODAyODQ5OTE3LDE4NjA3MzgxNDcsMjA3Nzk2NTI0MywxNjQ0Mzk2NzIsNDEwMDg3MjQ3MiwzMjI4MzMxOSwyODI3MTc3ODgyLDE3MDk2MTAzNTAsMjEyNTEzNTg0NiwxMzY0Mjg3NTEsMzg3NDQyODM5MiwzNjUyOTA0ODU5LDM0NjA5ODQ2MzAsMzU3MjE0NTkyOSwzNTkzMDU2MzgwLDI5MzkyNjYyMjYsODI0ODUyMjU5LDgxODMyNDg4NCwzMjI0NzQwNDU0LDkzMDM2OTIxMiwyODAxNTY2NDEwLDI5Njc1MDcxNTIsMzU1NzA2ODQwLDEyNTczMDkzMzYsNDE0ODI5MjgyNiwyNDMyNTY2NTYsNzkwMDczODQ2LDIzNzMzNDA2MzAsMTI5NjI5NzkwNCwxNDIyNjk5MDg1LDM3NTYyOTk3ODAsMzgxODgzNjQwNSw0NTc5OTI4NDAsMzA5OTY2NzQ4NywyMTM1MzE5ODg5LDc3NDIyMzE0LDE1NjAzODI1MTcsMTk0NTc5ODUxNiw3ODgyMDQzNTMsMTUyMTcwNjc4MSwxMzg1MzU2MjQyLDg3MDkxMjA4NiwzMjU5NjUzODMsMjM1ODk1NzkyMSwyMDUwNDY2MDYwLDIzODgyNjA4ODQsMjMxMzg4NDQ3Niw0MDA2NTIxMTI3LDkwMTIxMDU2OSwzOTkwOTUzMTg5LDEwMTQ2NDY3MDUsMTUwMzQ0OTgyMywxMDYyNTk3MjM1LDIwMzE2MjEzMjYsMzIxMjAzNTg5NSwzOTMxMzcxNDY5LDE1MzMwMTc1MTQsMzUwMTc0NTc1LDIyNTYwMjg4OTEsMjE3NzU0NDE3OSwxMDUyMzM4MzcyLDc0MTg3Njc4OCwxNjA2NTkxMjk2LDE5MTQwNTIwMzUsMjEzNzA1MjUzLDIzMzQ2Njk4OTcsMTEwNzIzNDE5NywxODk5NjAzOTY5LDM3MjUwNjk0OTEsMjYzMTQ0Nzc4MCwyNDIyNDk0OTEzLDE2MzU1MDI5ODAsMTg5MzAyMDM0MiwxOTUwOTAzMzg4LDExMjA5NzQ5MzVdO3ZhciBUNz1bMjgwNzA1ODkzMiwxNjk5OTcwNjI1LDI3NjQyNDk2MjMsMTU4NjkwMzU5MSwxODA4NDgxMTk1LDExNzM0MzAxNzMsMTQ4NzY0NTk0Niw1OTk4NDg2Nyw0MTk5ODgyODAwLDE4NDQ4ODI4MDYsMTk4OTI0OTIyOCwxMjc3NTU1OTcwLDM2MjM2MzY5NjUsMzQxOTkxNTU2MiwxMTQ5MjQ5MDc3LDI3NDQxMDQyOTAsMTUxNDc5MDU3Nyw0NTk3NDQ2OTgsMjQ0ODYwMzk0LDMyMzU5OTUxMzQsMTk2MzExNTMxMSw0MDI3NzQ0NTg4LDI1NDQwNzgxNTAsNDE5MDUzMDUxNSwxNjA4OTc1MjQ3LDI2MjcwMTYwODIsMjA2MjI3MDMxNywxNTA3NDk3Mjk4LDIyMDA4MTg4NzgsNTY3NDk4ODY4LDE3NjQzMTM1NjgsMzM1OTkzNjIwMSwyMzA1NDU1NTU0LDIwMzc5NzAwNjIsMTA0NzIzOWUzLDE5MTAzMTkwMzMsMTMzNzM3NjQ4MSwyOTA0MDI3MjcyLDI4OTI0MTczMTIsOTg0OTA3MjE0LDEyNDMxMTI0MTUsODMwNjYxOTE0LDg2MTk2ODIwOSwyMTM1MjUzNTg3LDIwMTEyMTQxODAsMjkyNzkzNDMxNSwyNjg2MjU0NzIxLDczMTE4MzM2OCwxNzUwNjI2Mzc2LDQyNDYzMTA3MjUsMTgyMDgyNDc5OCw0MTcyNzYzNzcxLDM1NDIzMzAyMjcsNDgzOTQ4MjcsMjQwNDkwMTY2MywyODcxNjgyNjQ1LDY3MTU5MzE5NSwzMjU0OTg4NzI1LDIwNzM3MjQ2MTMsMTQ1MDg1MjM5LDIyODA3OTYyMDAsMjc3OTkxNTE5OSwxNzkwNTc1MTA3LDIxODcxMjgwODYsNDcyNjE1NjMxLDMwMjk1MTAwMDksNDA3NTg3NzEyNywzODAyMjIyMTg1LDQxMDcxMDE2NTgsMzIwMTYzMTc0OSwxNjQ2MjUyMzQwLDQyNzA1MDcxNzQsMTQwMjgxMTQzOCwxNDM2NTkwODM1LDM3NzgxNTE4MTgsMzk1MDM1NTcwMiwzOTYzMTYxNDc1LDQwMjA5MTIyMjQsMjY2Nzk5NDczNywyNzM3OTIzNjYsMjMzMTU5MDE3NywxMDQ2OTk2MTMsOTUzNDU5ODIsMzE3NTUwMTI4NiwyMzc3NDg2Njc2LDE1NjA2Mzc4OTIsMzU2NDA0NTMxOCwzNjkwNTc4NzIsNDIxMzQ0NzA2NCwzOTE5MDQyMjM3LDExMzc0Nzc5NTIsMjY1ODYyNTQ5NywxMTE5NzI3ODQ4LDIzNDA5NDc4NDksMTUzMDQ1NTgzMyw0MDA3MzYwOTY4LDE3MjQ2NjU1NiwyNjY5NTk5MzgsNTE2NTUyODM2LDAsMjI1NjczNDU5MiwzOTgwOTMxNjI3LDE4OTAzMjgwODEsMTkxNzc0MjE3MCw0Mjk0NzA0Mzk4LDk0NTE2NDE2NSwzNTc1NTI4ODc4LDk1ODg3MTA4NSwzNjQ3MjEyMDQ3LDI3ODcyMDcyNjAsMTQyMzAyMjkzOSw3NzU1NjIyOTQsMTczOTY1NjIwMiwzODc2NTU3NjU1LDI1MzAzOTEyNzgsMjQ0MzA1ODA3NSwzMzEwMzIxODU2LDU0NzUxMjc5NiwxMjY1MTk1NjM5LDQzNzY1NjU5NCwzMTIxMjc1NTM5LDcxOTcwMDEyOCwzNzYyNTAyNjkwLDM4Nzc4MTE0NywyMTg4MjgyOTcsMzM1MDA2NTgwMywyODMwNzA4MTUwLDI4NDg0NjE4NTQsNDI4MTY5MjAxLDEyMjQ2NjE2NSwzNzIwMDgxMDQ5LDE2MjcyMzUxOTksNjQ4MDE3NjY1LDQxMjI3NjIzNTQsMTAwMjc4Mzg0NiwyMTE3MzYwNjM1LDY5NTYzNDc1NSwzMzM2MzU4NjkxLDQyMzQ3MjEwMDUsNDA0OTg0NDQ1MiwzNzA0MjgwODgxLDIyMzI0MzUyOTksNTc0NjI0NjYzLDI4NzM0MzgxNCw2MTIyMDU4OTgsMTAzOTcxNzA1MSw4NDAwMTk3MDUsMjcwODMyNjE4NSw3OTM0NTE5MzQsODIxMjg4MTE0LDEzOTEyMDE2NzAsMzgyMjA5MDE3NywzNzYxODc4MjcsMzExMzg1NTM0NCwxMjI0MzQ4MDUyLDE2Nzk5NjgyMzMsMjM2MTY5ODU1NiwxMDU4NzA5NzQ0LDc1MjM3NTQyMSwyNDMxNTkwOTYzLDEzMjE2OTkxNDUsMzUxOTE0MjIwMCwyNzM0NTkxMTc4LDE4ODEyNzQ0NCwyMTc3ODY5NTU3LDM3MjcyMDU3NTQsMjM4NDkxMTAzMSwzMjE1MjEyNDYxLDI2NDg5NzY0NDIsMjQ1MDM0NjEwNCwzNDMyNzM3Mzc1LDExODA4NDkyNzgsMzMxNTQ0MjA1LDMxMDIyNDkxNzYsNDE1MDE0NDU2OSwyOTUyMTAyNTk1LDIxNTk5NzYyODUsMjQ3NDQwNDMwNCw3NjYwNzg5MzMsMzEzNzczODYxLDI1NzA4MzIwNDQsMjEwODEwMDYzMiwxNjY4MjEyODkyLDMxNDU0NTY0NDMsMjAxMzkwODI2Miw0MTg2NzIyMTcsMzA3MDM1NjYzNCwyNTk0NzM0OTI3LDE4NTIxNzE5MjUsMzg2NzA2MDk5MSwzNDczNDE2NjM2LDM5MDc0NDg1OTcsMjYxNDczNzYzOSw5MTk0ODkxMzUsMTY0OTQ4NjM5LDIwOTQ0MTAxNjAsMjk5NzgyNTk1Niw1OTA0MjQ2MzksMjQ4NjIyNDU0OSwxNzIzODcyNjc0LDMxNTc3NTA4NjIsMzM5OTk0MTI1MCwzNTAxMjUyNzUyLDM2MjUyNjgxMzUsMjU1NTA0ODE5NiwzNjczNjM3MzU2LDEzNDMxMjc1MDEsNDEzMDI4MTM2MSwzNTk5NTk1MDg1LDI5NTc4NTM2NzksMTI5NzQwMzA1MCw4MTc4MTkxMCwzMDUxNTkzNDI1LDIyODM0OTA0MTAsNTMyMjAxNzcyLDEzNjcyOTU1ODksMzkyNjE3MDk3NCw4OTUyODc2OTIsMTk1Mzc1NzgzMSwxMDkzNTk3OTYzLDQ5MjQ4MzQzMSwzNTI4NjI2OTA3LDE0NDYyNDI1NzYsMTE5MjQ1NTYzOCwxNjM2NjA0NjMxLDIwOTMzNjIyNSwzNDQ4NzM0NjQsMTAxNTY3MTU3MSw2Njk5NjE4OTcsMzM3NTc0MDc2OSwzODU3NTcyMTI0LDI5NzM1MzA2OTUsMzc0NzE5MjAxOCwxOTMzNTMwNjEwLDM0NjQwNDI1MTYsOTM1MjkzODk1LDM0NTQ2ODYxOTksMjg1ODExNTA2OSwxODYzNjM4ODQ1LDM2ODMwMjI5MTYsNDA4NTM2OTUxOSwzMjkyNDQ1MDMyLDg3NTMxMzE4OCwxMDgwMDE3NTcxLDMyNzkwMzM4ODUsNjIxNTkxNzc4LDEyMzM4NTY1NzIsMjUwNDEzMDMxNywyNDE5NzU0NCwzMDE3NjcyNzE2LDM4MzU0ODQzNDAsMzI0NzQ2NTU1OCwyMjIwOTgxMTk1LDMwNjA4NDc5MjIsMTU1MTEyNDU4OCwxNDYzOTk2NjAwXTt2YXIgVDg9WzQxMDQ2MDU3NzcsMTA5NzE1OTU1MCwzOTY2NzM4MTgsNjYwNTEwMjY2LDI4NzU5NjgzMTUsMjYzODYwNjYyMyw0MjAwMTE1MTE2LDM4MDg2NjIzNDcsODIxNzEyMTYwLDE5ODY5MTgwNjEsMzQzMDMyMjU2OCwzODU0NDg4NSwzODU2MTM3Mjk1LDcxODAwMjExNyw4OTM2ODE3MDIsMTY1NDg4NjMyNSwyOTc1NDg0MzgyLDMxMjIzNTgwNTMsMzkyNjgyNTAyOSw0Mjc0MDUzNDY5LDc5NjE5NzU3MSwxMjkwODAxNzkzLDExODQzNDI5MjUsMzU1NjM2MTgzNSwyNDA1NDI2OTQ3LDI0NTk3MzUzMTcsMTgzNjc3MjI4NywxMzgxNjIwMzczLDMxOTYyNjc5ODgsMTk0ODM3Mzg0OCwzNzY0OTg4MjMzLDMzODUzNDUxNjYsMzI2Mzc4NTU4OSwyMzkwMzI1NDkyLDE0ODA0ODU3ODUsMzExMTI0NzE0MywzNzgwMDk3NzI2LDIyOTMwNDUyMzIsNTQ4MTY5NDE3LDM0NTk5NTM3ODksMzc0NjE3NTA3NSw0Mzk0NTIzODksMTM2MjMyMTU1OSwxNDAwODQ5NzYyLDE2ODU1Nzc5MDUsMTgwNjU5OTM1NSwyMTc0NzU0MDQ2LDEzNzA3MzkxMywxMjE0Nzk3OTM2LDExNzQyMTUwNTUsMzczMTY1NDU0OCwyMDc5ODk3NDI2LDE5NDMyMTcwNjcsMTI1ODQ4MDI0Miw1Mjk0ODc4NDMsMTQzNzI4MDg3MCwzOTQ1MjY5MTcwLDMwNDkzOTA4OTUsMzMxMzIxMjAzOCw5MjMzMTM2MTksNjc5OTk4ZTMsMzIxNTMwNzI5OSw1NzMyNjA4MiwzNzc2NDIyMjEsMzQ3NDcyOTg2NiwyMDQxODc3MTU5LDEzMzM2MTkwNywxNzc2NDYwMTEwLDM2NzM0NzY0NTMsOTYzOTI0NTQsODc4ODQ1OTA1LDI4MDE2OTk1MjQsNzc3MjMxNjY4LDQwODI0NzUxNzAsMjMzMDAxNDIxMyw0MTQyNjI2MjEyLDIyMTMyOTYzOTUsMTYyNjMxOTQyNCwxOTA2MjQ3MjYyLDE4NDY1NjMyNjEsNTYyNzU1OTAyLDM3MDgxNzM3MTgsMTA0MDU1OTgzNywzODcxMTYzOTgxLDE0MTg1NzMyMDEsMzI5NDQzMDU3NywxMTQ1ODUzNDgsMTM0MzYxODkxMiwyNTY2NTk1NjA5LDMxODYyMDI1ODIsMTA3ODE4NTA5NywzNjUxMDQxMTI3LDM4OTY2ODgwNDgsMjMwNzYyMjkxOSw0MjU0MDg3NDMsMzM3MTA5Njk1MywyMDgxMDQ4NDgxLDExMDgzMzkwNjgsMjIxNjYxMDI5NiwwLDIxNTYyOTkwMTcsNzM2OTcwODAyLDI5MjU5Njc2NiwxNTE3NDQwNjIwLDI1MTY1NzIxMywyMjM1MDYxNzc1LDI5MzMyMDI0OTMsNzU4NzIwMzEwLDI2NTkwNTE2MiwxNTU0MzkxNDAwLDE1MzIyODUzMzksOTA4OTk5MjA0LDE3NDU2NzY5MiwxNDc0NzYwNTk1LDQwMDI4NjE3NDgsMjYxMDAxMTY3NSwzMjM0MTU2NDE2LDM2OTMxMjYyNDEsMjAwMTQzMDg3NCwzMDM2OTk0ODQsMjQ3ODQ0MzIzNCwyNjg3MTY1ODg4LDU4NTEyMjYyMCw0NTQ0OTk2MDIsMTUxODQ5NzQyLDIzNDUxMTkyMTgsMzA2NDUxMDc2NSw1MTQ0NDMyODQsNDA0NDk4MTU5MSwxOTYzNDEyNjU1LDI1ODE0NDU2MTQsMjEzNzA2MjgxOSwxOTMwODUzNSwxOTI4NzA3MTY0LDE3MTUxOTMxNTYsNDIxOTM1MjE1NSwxMTI2NzkwNzk1LDYwMDIzNTIxMSwzOTkyNzQyMDcwLDM4NDEwMjQ5NTIsODM2NTUzNDMxLDE2Njk2NjQ4MzQsMjUzNTYwNDI0MywzMzIzMDExMjA0LDEyNDM5MDU0MTMsMzE0MTQwMDc4Niw0MTgwODA4MTEwLDY5ODQ0NTI1NSwyNjUzODk5NTQ5LDI5ODk1NTI2MDQsMjI1MzU4MTMyNSwzMjUyOTMyNzI3LDMwMDQ1OTExNDcsMTg5MTIxMTY4OSwyNDg3ODEwNTc3LDM5MTU2NTM3MDMsNDIzNzA4MzgxNiw0MDMwNjY3NDI0LDIxMDAwOTA5NjYsODY1MTM2NDE4LDEyMjk4OTk2NTUsOTUzMjcwNzQ1LDMzOTk2Nzk2MjgsMzU1NzUwNDY2NCw0MTE4OTI1MjIyLDIwNjEzNzk3NDksMzA3OTU0NjU4NiwyOTE1MDE3NzkxLDk4MzQyNjA5MiwyMDIyODM3NTg0LDE2MDcyNDQ2NTAsMjExODU0MTkwOCwyMzY2ODgyNTUwLDM2MzU5OTY4MTYsOTcyNTEyODE0LDMyODMwODg3NzAsMTU2ODcxODQ5NSwzNDk5MzI2NTY5LDM1NzY1Mzk1MDMsNjIxOTgyNjcxLDI4OTU3MjM0NjQsNDEwODg3OTUyLDI2MjM3NjIxNTIsMTAwMjE0MjY4Myw2NDU0MDEwMzcsMTQ5NDgwNzY2MiwyNTk1Njg0ODQ0LDEzMzU1MzU3NDcsMjUwNzA0MDIzMCw0MjkzMjk1Nzg2LDMxNjc2ODQ2NDEsMzY3NTg1MDA3LDM4ODU3NTA3MTQsMTg2NTg2MjczMCwyNjY4MjIxNjc0LDI5NjA5NzEzMDUsMjc2MzE3MzY4MSwxMDU5MjcwOTU0LDI3Nzc5NTI0NTQsMjcyNDY0Mjg2OSwxMzIwOTU3ODEyLDIxOTQzMTkxMDAsMjQyOTU5NTg3MiwyODE1OTU2Mjc1LDc3MDg5NTIxLDM5NzM3NzMxMjEsMzQ0NDU3NTg3MSwyNDQ4ODMwMjMxLDEzMDU5MDY1NTAsNDAyMTMwODczOSwyODU3MTk0NzAwLDI1MTY5MDE4NjAsMzUxODM1ODQzMCwxNzg3MzA0NzgwLDc0MDI3NjQxNywxNjk5ODM5ODE0LDE1OTIzOTQ5MDksMjM1MjMwNzQ1NywyMjcyNTU2MDI2LDE4ODgyMTI0MywxNzI5OTc3MDExLDM2ODc5OTQwMDIsMjc0MDg0ODQxLDM1OTQ5ODIyNTMsMzYxMzQ5NDQyNiwyNzAxOTQ5NDk1LDQxNjIwOTY3MjksMzIyNzM0NTcxLDI4Mzc5NjY1NDIsMTY0MDU3NjQzOSw0ODQ4MzA2ODksMTIwMjc5NzY5MCwzNTM3ODUyODI4LDQwNjc2MzkxMjUsMzQ5MDc1NzM2LDMzNDIzMTk0NzUsNDE1NzQ2NzIxOSw0MjU1ODAwMTU5LDEwMzA2OTAwMTUsMTE1NTIzNzQ5NiwyOTUxOTcxMjc0LDE3NTc2OTE1NzcsNjA3Mzk4OTY4LDI3Mzg5MDUwMjYsNDk5MzQ3OTkwLDM3OTQwNzg5MDgsMTAxMTQ1MjcxMiwyMjc4ODU1NjcsMjgxODY2NjgwOSwyMTMxMTQzNzYsMzAzNDg4MTI0MCwxNDU1NTI1OTg4LDM0MTQ0NTA1NTUsODUwODE3MjM3LDE4MTc5OTg0MDgsMzA5MjcyNjQ4MF07dmFyIFUxPVswLDIzNTQ3NDE4Nyw0NzA5NDgzNzQsMzAzNzY1Mjc3LDk0MTg5Njc0OCw5MDg5MzM0MTUsNjA3NTMwNTU0LDcwODc4MDg0OSwxODgzNzkzNDk2LDIxMTgyMTQ5OTUsMTgxNzg2NjgzMCwxNjQ5NjM5MjM3LDEyMTUwNjExMDgsMTE4MTA0NTExOSwxNDE3NTYxNjk4LDE1MTc3Njc1MjksMzc2NzU4Njk5Miw0MDAzMDYxMTc5LDQyMzY0Mjk5OTAsNDA2OTI0Njg5MywzNjM1NzMzNjYwLDM2MDI3NzAzMjcsMzI5OTI3ODQ3NCwzNDAwNTI4NzY5LDI0MzAxMjIyMTYsMjY2NDU0MzcxNSwyMzYyMDkwMjM4LDIxOTM4NjI2NDUsMjgzNTEyMzM5NiwyODAxMTA3NDA3LDMwMzU1MzUwNTgsMzEzNTc0MDg4OSwzNjc4MTI0OTIzLDM1NzY4NzA1MTIsMzM0MTM5NDI4NSwzMzc0MzYxNzAyLDM4MTA0OTYzNDMsMzk3NzY3NTM1Niw0Mjc5MDgwMjU3LDQwNDM2MTAxODYsMjg3NjQ5NDYyNywyNzc2MjkyOTA0LDMwNzY2MzkwMjksMzExMDY1MDk0MiwyNDcyMDExNTM1LDI2NDAyNDMyMDQsMjQwMzcyODY2NSwyMTY5MzAzMDU4LDEwMDEwODk5OTUsODk5ODM1NTg0LDY2NjQ2NDczMyw2OTk0MzIxNTAsNTk3Mjc4NDcsMjI2OTA2ODYwLDUzMDQwMDc1MywyOTQ5MzA2ODIsMTI3MzE2ODc4NywxMTcyOTY3MDY0LDE0NzU0MTg1MDEsMTUwOTQzMDQxNCwxOTQyNDM1Nzc1LDIxMTA2Njc0NDQsMTg3NjI0MTgzMywxNjQxODE2MjI2LDI5MTAyMTk3NjYsMjc0MzAzNDEwOSwyOTc2MTUxNTIwLDMyMTE2MjMxNDcsMjUwNTIwMjEzOCwyNjA2NDUzOTY5LDIzMDI2OTAyNTIsMjI2OTcyODQ1NSwzNzExODI5NDIyLDM1NDM1OTkyNjksMzI0MDg5NDM5MiwzNDc1MzEzMzMxLDM4NDM2OTkwNzQsMzk0MzkwNjQ0MSw0MTc4MDYyMjI4LDQxNDQwNDc3NzUsMTMwNjk2NzM2NiwxMTM5NzgxNzA5LDEzNzQ5ODgxMTIsMTYxMDQ1OTczOSwxOTc1NjgzNDM0LDIwNzY5MzUyNjUsMTc3NTI3NjkyNCwxNzQyMzE1MTI3LDEwMzQ4Njc5OTgsODY2NjM3ODQ1LDU2NjAyMTg5Niw4MDA0NDA4MzUsOTI5ODc2OTgsMTkzMTk1MDY1LDQyOTQ1NjE2NCwzOTU0NDE3MTEsMTk4NDgxMjY4NSwyMDE3Nzc4NTY2LDE3ODQ2NjMxOTUsMTY4MzQwNzI0OCwxMzE1NTYyMTQ1LDEwODAwOTQ2MzQsMTM4Mzg1NjMxMSwxNTUxMDM3ODg0LDEwMTAzOTgyOSwxMzUwNTAyMDYsNDM3NzU3MTIzLDMzNzU1Mzg2NCwxMDQyMzg1NjU3LDgwNzk2MjYxMCw1NzM4MDQ3ODMsNzQyMDM5MDEyLDI1MzEwNjc0NTMsMjU2NDAzMzMzNCwyMzI4ODI4OTcxLDIyMjc1NzMwMjQsMjkzNTU2Njg2NSwyNzAwMDk5MzU0LDMwMDE3NTU2NTUsMzE2ODkzNzIyOCwzODY4NTUyODA1LDM5MDI1NjMxODIsNDIwMzE4MTE3MSw0MTAyOTc3OTEyLDM3MzYxNjQ5MzcsMzUwMTc0MTg5MCwzMjY1NDc4NzUxLDM0MzM3MTI5ODAsMTEwNjA0MTU5MSwxMzQwNDYzMTAwLDE1NzY5NzY2MDksMTQwODc0OTAzNCwyMDQzMjExNDgzLDIwMDkxOTU0NzIsMTcwODg0ODMzMywxODA5MDU0MTUwLDgzMjg3NzIzMSwxMDY4MzUxMzk2LDc2Njk0NTQ2NSw1OTk3NjIzNTQsMTU5NDE3OTg3LDEyNjQ1NDY2NCwzNjE5Mjk4NzcsNDYzMTgwMTkwLDI3MDkyNjA4NzEsMjk0MzY4MjM4MCwzMTc4MTA2OTYxLDMwMDk4NzkzODYsMjU3MjY5NzE5NSwyNTM4NjgxMTg0LDIyMzYyMjg3MzMsMjMzNjQzNDU1MCwzNTA5ODcxMTM1LDM3NDUzNDUzMDAsMzQ0MTg1MDM3NywzMjc0NjY3MjY2LDM5MTAxNjE5NzEsMzg3NzE5ODY0OCw0MTEwNTY4NDg1LDQyMTE4MTg3OTgsMjU5NzgwNjQ3NiwyNDk3NjA0NzQzLDIyNjEwODkxNzgsMjI5NTEwMTA3MywyNzMzODU2MTYwLDI5MDIwODc4NTEsMzIwMjQzNzA0NiwyOTY4MDExNDUzLDM5MzYyOTEyODQsMzgzNTAzNjg5NSw0MTM2NDQwNzcwLDQxNjk0MDgyMDEsMzUzNTQ4NjQ1NiwzNzAyNjY1NDU5LDM0NjcxOTIzMDIsMzIzMTcyMjIxMywyMDUxNTE4NzgwLDE5NTEzMTcwNDcsMTcxNjg5MDQxMCwxNzUwOTAyMzA1LDExMTM4MTgzODQsMTI4MjA1MDA3NSwxNTg0NTA0NTgyLDEzNTAwNzg5ODksMTY4ODEwODUyLDY3NTU2NDYzLDM3MTA0OTMzMCw0MDQwMTY3NjEsODQxNzM5NTkyLDEwMDg5MTg1OTUsNzc1NTUwODE0LDU0MDA4MDcyNSwzOTY5NTYyMzY5LDM4MDEzMzIyMzQsNDAzNTQ4OTA0Nyw0MjY5OTA3OTk2LDM1NjkyNTUyMTMsMzY2OTQ2MjU2NiwzMzY2NzU0NjE5LDMzMzI3NDAxNDQsMjYzMTA2NTQzMywyNDYzODc5NzYyLDIxNjAxMTcwNzEsMjM5NTU4ODY3NiwyNzY3NjQ1NTU3LDI4Njg4OTc0MDYsMzEwMjAxMTc0NywzMDY5MDQ5OTYwLDIwMjAwODQ5NywzMzc3ODM2MiwyNzAwNDA0ODcsNTA0NDU5NDM2LDg3NTQ1MTI5Myw5NzU2NTg2NDYsNjc1MDM5NjI3LDY0MTAyNTE1MiwyMDg0NzA0MjMzLDE5MTc1MTg1NjIsMTYxNTg2MTI0NywxODUxMzMyODUyLDExNDc1NTA2NjEsMTI0ODgwMjUxMCwxNDg0MDA1ODQzLDE0NTEwNDQwNTYsOTMzMzAxMzcwLDk2NzMxMTcyOSw3MzMxNTY5NzIsNjMyOTUzNzAzLDI2MDM4ODk1MCwyNTk2NTkxNywzMjg2NzE4MDgsNDk2OTA2MDU5LDEyMDY0Nzc4NTgsMTIzOTQ0Mzc1MywxNTQzMjA4NTAwLDE0NDE5NTI1NzUsMjE0NDE2MTgwNiwxOTA4Njk0Mjc3LDE2NzU1Nzc4ODAsMTg0Mjc1OTQ0MywzNjEwMzY5MjI2LDM2NDQzNzk1ODUsMzQwODExOTUxNiwzMzA3OTE2MjQ3LDQwMTExOTA1MDIsMzc3Njc2NzQ2OSw0MDc3Mzg0NDMyLDQyNDU2MTg2ODMsMjgwOTc3MTE1NCwyODQyNzM3MDQ5LDMxNDQzOTY0MjAsMzA0MzE0MDQ5NSwyNjczNzA1MTUwLDI0MzgyMzc2MjEsMjIwMzAzMjIzMiwyMzcwMjEzNzk1XTt2YXIgVTI9WzAsMTg1NDY5MTk3LDM3MDkzODM5NCw0ODc3MjU4NDcsNzQxODc2Nzg4LDY1Nzg2MTk0NSw5NzU0NTE2OTQsODI0ODUyMjU5LDE0ODM3NTM1NzYsMTQwMDc4MzIwNSwxMzE1NzIzODkwLDExNjQwNzE4MDcsMTk1MDkwMzM4OCwyMTM1MzE5ODg5LDE2NDk3MDQ1MTgsMTc2NzUzNjQ1OSwyOTY3NTA3MTUyLDMxNTI5NzYzNDksMjgwMTU2NjQxMCwyOTE4MzUzODYzLDI2MzE0NDc3ODAsMjU0NzQzMjkzNywyMzI4MTQzNjE0LDIxNzc1NDQxNzksMzkwMTgwNjc3NiwzODE4ODM2NDA1LDQyNzA2Mzk3NzgsNDExODk4NzY5NSwzMjk5NDA5MDM2LDM0ODM4MjU1MzcsMzUzNTA3MjkxOCwzNjUyOTA0ODU5LDIwNzc5NjUyNDMsMTg5MzAyMDM0MiwxODQxNzY4ODY1LDE3MjQ0NTcxMzIsMTQ3NDUwMjU0MywxNTU5MDQxNjY2LDExMDcyMzQxOTcsMTI1NzMwOTMzNiw1OTg0Mzg4NjcsNjgxOTMzNTM0LDkwMTIxMDU2OSwxMDUyMzM4MzcyLDI2MTMxNDUzNSw3NzQyMjMxNCw0Mjg4MTk5NjUsMzEwNDYzNzI4LDM0MDk2ODUzNTUsMzIyNDc0MDQ1NCwzNzEwMzY4MTEzLDM1OTMwNTYzODAsMzg3NTc3MDIwNywzOTYwMzA5MzMwLDQwNDUzODA5MzMsNDE5NTQ1NjA3MiwyNDcxMjI0MDY3LDI1NTQ3MTg3MzQsMjIzNzEzMzA4MSwyMzg4MjYwODg0LDMyMTIwMzU4OTUsMzAyODE0MzY3NCwyODQyNjc4NTczLDI3MjQzMjIzMzYsNDEzODU2MzE4MSw0MjU1MzUwNjI0LDM3Njk3MjE5NzUsMzk1NTE5MTE2MiwzNjY3MjE5MDMzLDM1MTY2MTk2MDQsMzQzMTU0Njk0NywzMzQ3NTMyMTEwLDI5MzM3MzQ5MTcsMjc4MjA4MjgyNCwzMDk5NjY3NDg3LDMwMTY2OTcxMDYsMjE5NjA1MjUyOSwyMzEzODg0NDc2LDI0OTkzNDg1MjMsMjY4Mzc2NTAzMCwxMTc5NTEwNDYxLDEyOTYyOTc5MDQsMTM0NzU0ODMyNywxNTMzMDE3NTE0LDE3ODYxMDI0MDksMTYzNTUwMjk4MCwyMDg3MzA5NDU5LDIwMDMyOTQ2MjIsNTA3MzU4OTMzLDM1NTcwNjg0MCwxMzY0Mjg3NTEsNTM0NTgzNzAsODM5MjI0MDMzLDk1NzA1NTk4MCw2MDU2NTczMzksNzkwMDczODQ2LDIzNzMzNDA2MzAsMjI1NjAyODg5MSwyNjA3NDM5ODIwLDI0MjI0OTQ5MTMsMjcwNjI3MDY5MCwyODU2MzQ1ODM5LDMwNzU2MzYyMTYsMzE2MDE3NTM0OSwzNTczOTQxNjk0LDM3MjUwNjk0OTEsMzI3MzI2NzEwOCwzMzU2NzYxNzY5LDQxODE1OTg2MDIsNDA2MzI0MjM3NSw0MDExOTk2MDQ4LDM4MjgxMDM4MzcsMTAzMzI5NzE1OCw5MTU5ODU0MTksNzMwNTE3Mjc2LDU0NTU3MjM2OSwyOTY2Nzk3MzAsNDQ2NzU0ODc5LDEyOTE2NjEyMCwyMTM3MDUyNTMsMTcwOTYxMDM1MCwxODYwNzM4MTQ3LDE5NDU3OTg1MTYsMjAyOTI5MzE3NywxMjM5MzMxMTYyLDExMjA5NzQ5MzUsMTYwNjU5MTI5NiwxNDIyNjk5MDg1LDQxNDgyOTI4MjYsNDIzMzA5NDYxNSwzNzgxMDMzNjY0LDM5MzEzNzE0NjksMzY4MjE5MTU5OCwzNDk3NTA5MzQ3LDM0NDYwMDQ0NjgsMzMyODk1NTM4NSwyOTM5MjY2MjI2LDI3NTU2MzY2NzEsMzEwNjc4MDg0MCwyOTg4Njg3MjY5LDIxOTg0MzgwMjIsMjI4MjE5NTMzOSwyNTAxMjE4OTcyLDI2NTI2MDk0MjUsMTIwMTc2NTM4NiwxMjg2NTY3MTc1LDEzNzEzNjg5NzYsMTUyMTcwNjc4MSwxODA1MjExNzEwLDE2MjA1Mjk0NTksMjEwNTg4NzI2OCwxOTg4ODM4MTg1LDUzMzgwNDEzMCwzNTAxNzQ1NzUsMTY0NDM5NjcyLDQ2MzQ2MTAxLDg3MDkxMjA4Niw5NTQ2Njk0MDMsNjM2ODEzOTAwLDc4ODIwNDM1MywyMzU4OTU3OTIxLDIyNzQ2ODA0MjgsMjU5MjUyMzY0MywyNDQxNjYxNTU4LDI2OTUwMzM2ODUsMjg4MDI0MDIxNiwzMDY1OTYyODMxLDMxODI0ODc2MTgsMzU3MjE0NTkyOSwzNzU2Mjk5NzgwLDMyNzA5Mzc4NzUsMzM4ODUwNzE2Niw0MTc0NTYwMDYxLDQwOTEzMjcwMjQsNDAwNjUyMTEyNywzODU0NjA2Mzc4LDEwMTQ2NDY3MDUsOTMwMzY5MjEyLDcxMTM0OTY3NSw1NjA0ODc1OTAsMjcyNzg2MzA5LDQ1Nzk5Mjg0MCwxMDY4NTI3NjcsMjIzMzc3NTU0LDE2NzgzODEwMTcsMTg2MjUzNDg2OCwxOTE0MDUyMDM1LDIwMzE2MjEzMjYsMTIxMTI0NzU5NywxMTI4MDE0NTYwLDE1ODAwODc3OTksMTQyODE3MzA1MCwzMjI4MzMxOSwxODI2MjExMTQsNDAxNjM5NTk3LDQ4NjQ0MTM3Niw3Njg5MTcxMjMsNjUxODY4MDQ2LDEwMDMwMDcxMjksODE4MzI0ODg0LDE1MDM0NDk4MjMsMTM4NTM1NjI0MiwxMzMzODM4MDIxLDExNTAyMDg0NTYsMTk3Mzc0NTM4NywyMTI1MTM1ODQ2LDE2NzMwNjE2MTcsMTc1NjgxODk0MCwyOTcwMzU2MzI3LDMxMjA2OTQxMjIsMjgwMjg0OTkxNywyODg3NjUxNjk2LDI2Mzc0NDI2NDMsMjUyMDM5MzU2NiwyMzM0NjY5ODk3LDIxNDk5ODc2NTIsMzkxNzIzNDcwMywzNzk5MTQxMTIyLDQyODQ1MDIwMzcsNDEwMDg3MjQ3MiwzMzA5NTk0MTcxLDM0NjA5ODQ2MzAsMzU0NTc4OTQ3MywzNjI5NTQ2Nzk2LDIwNTA0NjYwNjAsMTg5OTYwMzk2OSwxODE0ODAzMjIyLDE3MzA1MjU3MjMsMTQ0Mzg1NzcyMCwxNTYwMzgyNTE3LDEwNzUwMjU2OTgsMTI2MDIzMjIzOSw1NzUxMzgxNDgsNjkyNzA3NDMzLDg3ODQ0MzM5MCwxMDYyNTk3MjM1LDI0MzI1NjY1Niw5MTM0MTkxNyw0MDkxOTg0MTAsMzI1OTY1MzgzLDM0MDMxMDA2MzYsMzI1MjIzODU0NSwzNzA0MzAwNDg2LDM2MjAwMjI5ODcsMzg3NDQyODM5MiwzOTkwOTUzMTg5LDQwNDI0NTkxMjIsNDIyNzY2NTY2MywyNDYwNDQ5MjA0LDI1NzgwMTg0ODksMjIyNjg3NTMxMCwyNDExMDI5MTU1LDMxOTgxMTUyMDAsMzA0NjIwMDQ2MSwyODI3MTc3ODgyLDI3NDM5NDQ4NTVdO3ZhciBVMz1bMCwyMTg4MjgyOTcsNDM3NjU2NTk0LDM4Nzc4MTE0Nyw4NzUzMTMxODgsOTU4ODcxMDg1LDc3NTU2MjI5NCw1OTA0MjQ2MzksMTc1MDYyNjM3NiwxNjk5OTcwNjI1LDE5MTc3NDIxNzAsMjEzNTI1MzU4NywxNTUxMTI0NTg4LDEzNjcyOTU1ODksMTE4MDg0OTI3OCwxMjY1MTk1NjM5LDM1MDEyNTI3NTIsMzcyMDA4MTA0OSwzMzk5OTQxMjUwLDMzNTAwNjU4MDMsMzgzNTQ4NDM0MCwzOTE5MDQyMjM3LDQyNzA1MDcxNzQsNDA4NTM2OTUxOSwzMTAyMjQ5MTc2LDMwNTE1OTM0MjUsMjczNDU5MTE3OCwyOTUyMTAyNTk1LDIzNjE2OTg1NTYsMjE3Nzg2OTU1NywyNTMwMzkxMjc4LDI2MTQ3Mzc2MzksMzE0NTQ1NjQ0MywzMDYwODQ3OTIyLDI3MDgzMjYxODUsMjg5MjQxNzMxMiwyNDA0OTAxNjYzLDIxODcxMjgwODYsMjUwNDEzMDMxNywyNTU1MDQ4MTk2LDM1NDIzMzAyMjcsMzcyNzIwNTc1NCwzMzc1NzQwNzY5LDMyOTI0NDUwMzIsMzg3NjU1NzY1NSwzOTI2MTcwOTc0LDQyNDYzMTA3MjUsNDAyNzc0NDU4OCwxODA4NDgxMTk1LDE3MjM4NzI2NzQsMTkxMDMxOTAzMywyMDk0NDEwMTYwLDE2MDg5NzUyNDcsMTM5MTIwMTY3MCwxMTczNDMwMTczLDEyMjQzNDgwNTIsNTk5ODQ4NjcsMjQ0ODYwMzk0LDQyODE2OTIwMSwzNDQ4NzM0NjQsOTM1MjkzODk1LDk4NDkwNzIxNCw3NjYwNzg5MzMsNTQ3NTEyNzk2LDE4NDQ4ODI4MDYsMTYyNzIzNTE5OSwyMDExMjE0MTgwLDIwNjIyNzAzMTcsMTUwNzQ5NzI5OCwxNDIzMDIyOTM5LDExMzc0Nzc5NTIsMTMyMTY5OTE0NSw5NTM0NTk4MiwxNDUwODUyMzksNTMyMjAxNzcyLDMxMzc3Mzg2MSw4MzA2NjE5MTQsMTAxNTY3MTU3MSw3MzExODMzNjgsNjQ4MDE3NjY1LDMxNzU1MDEyODYsMjk1Nzg1MzY3OSwyODA3MDU4OTMyLDI4NTgxMTUwNjksMjMwNTQ1NTU1NCwyMjIwOTgxMTk1LDI0NzQ0MDQzMDQsMjY1ODYyNTQ5NywzNTc1NTI4ODc4LDM2MjUyNjgxMzUsMzQ3MzQxNjYzNiwzMjU0OTg4NzI1LDM3NzgxNTE4MTgsMzk2MzE2MTQ3NSw0MjEzNDQ3MDY0LDQxMzAyODEzNjEsMzU5OTU5NTA4NSwzNjgzMDIyOTE2LDM0MzI3MzczNzUsMzI0NzQ2NTU1OCwzODAyMjIyMTg1LDQwMjA5MTIyMjQsNDE3Mjc2Mzc3MSw0MTIyNzYyMzU0LDMyMDE2MzE3NDksMzAxNzY3MjcxNiwyNzY0MjQ5NjIzLDI4NDg0NjE4NTQsMjMzMTU5MDE3NywyMjgwNzk2MjAwLDI0MzE1OTA5NjMsMjY0ODk3NjQ0MiwxMDQ2OTk2MTMsMTg4MTI3NDQ0LDQ3MjYxNTYzMSwyODczNDM4MTQsODQwMDE5NzA1LDEwNTg3MDk3NDQsNjcxNTkzMTk1LDYyMTU5MTc3OCwxODUyMTcxOTI1LDE2NjgyMTI4OTIsMTk1Mzc1NzgzMSwyMDM3OTcwMDYyLDE1MTQ3OTA1NzcsMTQ2Mzk5NjYwMCwxMDgwMDE3NTcxLDEyOTc0MDMwNTAsMzY3MzYzNzM1NiwzNjIzNjM2OTY1LDMyMzU5OTUxMzQsMzQ1NDY4NjE5OSw0MDA3MzYwOTY4LDM4MjIwOTAxNzcsNDEwNzEwMTY1OCw0MTkwNTMwNTE1LDI5OTc4MjU5NTYsMzIxNTIxMjQ2MSwyODMwNzA4MTUwLDI3Nzk5MTUxOTksMjI1NjczNDU5MiwyMzQwOTQ3ODQ5LDI2MjcwMTYwODIsMjQ0MzA1ODA3NSwxNzI0NjY1NTYsMTIyNDY2MTY1LDI3Mzc5MjM2Niw0OTI0ODM0MzEsMTA0NzIzOWUzLDg2MTk2ODIwOSw2MTIyMDU4OTgsNjk1NjM0NzU1LDE2NDYyNTIzNDAsMTg2MzYzODg0NSwyMDEzOTA4MjYyLDE5NjMxMTUzMTEsMTQ0NjI0MjU3NiwxNTMwNDU1ODMzLDEyNzc1NTU5NzAsMTA5MzU5Nzk2MywxNjM2NjA0NjMxLDE4MjA4MjQ3OTgsMjA3MzcyNDYxMywxOTg5MjQ5MjI4LDE0MzY1OTA4MzUsMTQ4NzY0NTk0NiwxMzM3Mzc2NDgxLDExMTk3Mjc4NDgsMTY0OTQ4NjM5LDgxNzgxOTEwLDMzMTU0NDIwNSw1MTY1NTI4MzYsMTAzOTcxNzA1MSw4MjEyODgxMTQsNjY5OTYxODk3LDcxOTcwMDEyOCwyOTczNTMwNjk1LDMxNTc3NTA4NjIsMjg3MTY4MjY0NSwyNzg3MjA3MjYwLDIyMzI0MzUyOTksMjI4MzQ5MDQxMCwyNjY3OTk0NzM3LDI0NTAzNDYxMDQsMzY0NzIxMjA0NywzNTY0MDQ1MzE4LDMyNzkwMzM4ODUsMzQ2NDA0MjUxNiwzOTgwOTMxNjI3LDM3NjI1MDI2OTAsNDE1MDE0NDU2OSw0MTk5ODgyODAwLDMwNzAzNTY2MzQsMzEyMTI3NTUzOSwyOTA0MDI3MjcyLDI2ODYyNTQ3MjEsMjIwMDgxODg3OCwyMzg0OTExMDMxLDI1NzA4MzIwNDQsMjQ4NjIyNDU0OSwzNzQ3MTkyMDE4LDM1Mjg2MjY5MDcsMzMxMDMyMTg1NiwzMzU5OTM2MjAxLDM5NTAzNTU3MDIsMzg2NzA2MDk5MSw0MDQ5ODQ0NDUyLDQyMzQ3MjEwMDUsMTczOTY1NjIwMiwxNzkwNTc1MTA3LDIxMDgxMDA2MzIsMTg5MDMyODA4MSwxNDAyODExNDM4LDE1ODY5MDM1OTEsMTIzMzg1NjU3MiwxMTQ5MjQ5MDc3LDI2Njk1OTkzOCw0ODM5NDgyNywzNjkwNTc4NzIsNDE4NjcyMjE3LDEwMDI3ODM4NDYsOTE5NDg5MTM1LDU2NzQ5ODg2OCw3NTIzNzU0MjEsMjA5MzM2MjI1LDI0MTk3NTQ0LDM3NjE4NzgyNyw0NTk3NDQ2OTgsOTQ1MTY0MTY1LDg5NTI4NzY5Miw1NzQ2MjQ2NjMsNzkzNDUxOTM0LDE2Nzk5NjgyMzMsMTc2NDMxMzU2OCwyMTE3MzYwNjM1LDE5MzM1MzA2MTAsMTM0MzEyNzUwMSwxNTYwNjM3ODkyLDEyNDMxMTI0MTUsMTE5MjQ1NTYzOCwzNzA0MjgwODgxLDM1MTkxNDIyMDAsMzMzNjM1ODY5MSwzNDE5OTE1NTYyLDM5MDc0NDg1OTcsMzg1NzU3MjEyNCw0MDc1ODc3MTI3LDQyOTQ3MDQzOTgsMzAyOTUxMDAwOSwzMTEzODU1MzQ0LDI5Mjc5MzQzMTUsMjc0NDEwNDI5MCwyMTU5OTc2Mjg1LDIzNzc0ODY2NzYsMjU5NDczNDkyNywyNTQ0MDc4MTUwXTt2YXIgVTQ9WzAsMTUxODQ5NzQyLDMwMzY5OTQ4NCw0NTQ0OTk2MDIsNjA3Mzk4OTY4LDc1ODcyMDMxMCw5MDg5OTkyMDQsMTA1OTI3MDk1NCwxMjE0Nzk3OTM2LDEwOTcxNTk1NTAsMTUxNzQ0MDYyMCwxNDAwODQ5NzYyLDE4MTc5OTg0MDgsMTY5OTgzOTgxNCwyMTE4NTQxOTA4LDIwMDE0MzA4NzQsMjQyOTU5NTg3MiwyNTgxNDQ1NjE0LDIxOTQzMTkxMDAsMjM0NTExOTIxOCwzMDM0ODgxMjQwLDMxODYyMDI1ODIsMjgwMTY5OTUyNCwyOTUxOTcxMjc0LDM2MzU5OTY4MTYsMzUxODM1ODQzMCwzMzk5Njc5NjI4LDMyODMwODg3NzAsNDIzNzA4MzgxNiw0MTE4OTI1MjIyLDQwMDI4NjE3NDgsMzg4NTc1MDcxNCwxMDAyMTQyNjgzLDg1MDgxNzIzNyw2OTg0NDUyNTUsNTQ4MTY5NDE3LDUyOTQ4Nzg0MywzNzc2NDIyMjEsMjI3ODg1NTY3LDc3MDg5NTIxLDE5NDMyMTcwNjcsMjA2MTM3OTc0OSwxNjQwNTc2NDM5LDE3NTc2OTE1NzcsMTQ3NDc2MDU5NSwxNTkyMzk0OTA5LDExNzQyMTUwNTUsMTI5MDgwMTc5MywyODc1OTY4MzE1LDI3MjQ2NDI4NjksMzExMTI0NzE0MywyOTYwOTcxMzA1LDI0MDU0MjY5NDcsMjI1MzU4MTMyNSwyNjM4NjA2NjIzLDI0ODc4MTA1NzcsMzgwODY2MjM0NywzOTI2ODI1MDI5LDQwNDQ5ODE1OTEsNDE2MjA5NjcyOSwzMzQyMzE5NDc1LDM0NTk5NTM3ODksMzU3NjUzOTUwMywzNjkzMTI2MjQxLDE5ODY5MTgwNjEsMjEzNzA2MjgxOSwxNjg1NTc3OTA1LDE4MzY3NzIyODcsMTM4MTYyMDM3MywxNTMyMjg1MzM5LDEwNzgxODUwOTcsMTIyOTg5OTY1NSwxMDQwNTU5ODM3LDkyMzMxMzYxOSw3NDAyNzY0MTcsNjIxOTgyNjcxLDQzOTQ1MjM4OSwzMjI3MzQ1NzEsMTM3MDczOTEzLDE5MzA4NTM1LDM4NzExNjM5ODEsNDAyMTMwODczOSw0MTA0NjA1Nzc3LDQyNTU4MDAxNTksMzI2Mzc4NTU4OSwzNDE0NDUwNTU1LDM0OTkzMjY1NjksMzY1MTA0MTEyNywyOTMzMjAyNDkzLDI4MTU5NTYyNzUsMzE2NzY4NDY0MSwzMDQ5MzkwODk1LDIzMzAwMTQyMTMsMjIxMzI5NjM5NSwyNTY2NTk1NjA5LDI0NDg4MzAyMzEsMTMwNTkwNjU1MCwxMTU1MjM3NDk2LDE2MDcyNDQ2NTAsMTQ1NTUyNTk4OCwxNzc2NDYwMTEwLDE2MjYzMTk0MjQsMjA3OTg5NzQyNiwxOTI4NzA3MTY0LDk2MzkyNDU0LDIxMzExNDM3NiwzOTY2NzM4MTgsNTE0NDQzMjg0LDU2Mjc1NTkwMiw2Nzk5OThlMyw4NjUxMzY0MTgsOTgzNDI2MDkyLDM3MDgxNzM3MTgsMzU1NzUwNDY2NCwzNDc0NzI5ODY2LDMzMjMwMTEyMDQsNDE4MDgwODExMCw0MDMwNjY3NDI0LDM5NDUyNjkxNzAsMzc5NDA3ODkwOCwyNTA3MDQwMjMwLDI2MjM3NjIxNTIsMjI3MjU1NjAyNiwyMzkwMzI1NDkyLDI5NzU0ODQzODIsMzA5MjcyNjQ4MCwyNzM4OTA1MDI2LDI4NTcxOTQ3MDAsMzk3Mzc3MzEyMSwzODU2MTM3Mjk1LDQyNzQwNTM0NjksNDE1NzQ2NzIxOSwzMzcxMDk2OTUzLDMyNTI5MzI3MjcsMzY3MzQ3NjQ1MywzNTU2MzYxODM1LDI3NjMxNzM2ODEsMjkxNTAxNzc5MSwzMDY0NTEwNzY1LDMyMTUzMDcyOTksMjE1NjI5OTAxNywyMzA3NjIyOTE5LDI0NTk3MzUzMTcsMjYxMDAxMTY3NSwyMDgxMDQ4NDgxLDE5NjM0MTI2NTUsMTg0NjU2MzI2MSwxNzI5OTc3MDExLDE0ODA0ODU3ODUsMTM2MjMyMTU1OSwxMjQzOTA1NDEzLDExMjY3OTA3OTUsODc4ODQ1OTA1LDEwMzA2OTAwMTUsNjQ1NDAxMDM3LDc5NjE5NzU3MSwyNzQwODQ4NDEsNDI1NDA4NzQzLDM4NTQ0ODg1LDE4ODgyMTI0MywzNjEzNDk0NDI2LDM3MzE2NTQ1NDgsMzMxMzIxMjAzOCwzNDMwMzIyNTY4LDQwODI0NzUxNzAsNDIwMDExNTExNiwzNzgwMDk3NzI2LDM4OTY2ODgwNDgsMjY2ODIyMTY3NCwyNTE2OTAxODYwLDIzNjY4ODI1NTAsMjIxNjYxMDI5NiwzMTQxNDAwNzg2LDI5ODk1NTI2MDQsMjgzNzk2NjU0MiwyNjg3MTY1ODg4LDEyMDI3OTc2OTAsMTMyMDk1NzgxMiwxNDM3MjgwODcwLDE1NTQzOTE0MDAsMTY2OTY2NDgzNCwxNzg3MzA0NzgwLDE5MDYyNDcyNjIsMjAyMjgzNzU4NCwyNjU5MDUxNjIsMTE0NTg1MzQ4LDQ5OTM0Nzk5MCwzNDkwNzU3MzYsNzM2OTcwODAyLDU4NTEyMjYyMCw5NzI1MTI4MTQsODIxNzEyMTYwLDI1OTU2ODQ4NDQsMjQ3ODQ0MzIzNCwyMjkzMDQ1MjMyLDIxNzQ3NTQwNDYsMzE5NjI2Nzk4OCwzMDc5NTQ2NTg2LDI4OTU3MjM0NjQsMjc3Nzk1MjQ1NCwzNTM3ODUyODI4LDM2ODc5OTQwMDIsMzIzNDE1NjQxNiwzMzg1MzQ1MTY2LDQxNDI2MjYyMTIsNDI5MzI5NTc4NiwzODQxMDI0OTUyLDM5OTI3NDIwNzAsMTc0NTY3NjkyLDU3MzI2MDgyLDQxMDg4Nzk1MiwyOTI1OTY3NjYsNzc3MjMxNjY4LDY2MDUxMDI2NiwxMDExNDUyNzEyLDg5MzY4MTcwMiwxMTA4MzM5MDY4LDEyNTg0ODAyNDIsMTM0MzYxODkxMiwxNDk0ODA3NjYyLDE3MTUxOTMxNTYsMTg2NTg2MjczMCwxOTQ4MzczODQ4LDIxMDAwOTA5NjYsMjcwMTk0OTQ5NSwyODE4NjY2ODA5LDMwMDQ1OTExNDcsMzEyMjM1ODA1MywyMjM1MDYxNzc1LDIzNTIzMDc0NTcsMjUzNTYwNDI0MywyNjUzODk5NTQ5LDM5MTU2NTM3MDMsMzc2NDk4ODIzMyw0MjE5MzUyMTU1LDQwNjc2MzkxMjUsMzQ0NDU3NTg3MSwzMjk0NDMwNTc3LDM3NDYxNzUwNzUsMzU5NDk4MjI1Myw4MzY1NTM0MzEsOTUzMjcwNzQ1LDYwMDIzNTIxMSw3MTgwMDIxMTcsMzY3NTg1MDA3LDQ4NDgzMDY4OSwxMzMzNjE5MDcsMjUxNjU3MjEzLDIwNDE4NzcxNTksMTg5MTIxMTY4OSwxODA2NTk5MzU1LDE2NTQ4ODYzMjUsMTU2ODcxODQ5NSwxNDE4NTczMjAxLDEzMzU1MzU3NDcsMTE4NDM0MjkyNV07ZnVuY3Rpb24gY29udmVydFRvSW50MzIoYnl0ZXMpe3ZhciByZXN1bHQ9W107Zm9yKHZhciBpPTA7aTxieXRlcy5sZW5ndGg7aSs9NCl7cmVzdWx0LnB1c2goYnl0ZXNbaV08PDI0fGJ5dGVzW2krMV08PDE2fGJ5dGVzW2krMl08PDh8Ynl0ZXNbaSszXSl9cmV0dXJuIHJlc3VsdH12YXIgQUVTPWZ1bmN0aW9uKGtleSl7aWYoISh0aGlzIGluc3RhbmNlb2YgQUVTKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsImtleSIse3ZhbHVlOmNvZXJjZUFycmF5KGtleSx0cnVlKX0pO3RoaXMuX3ByZXBhcmUoKX07QUVTLnByb3RvdHlwZS5fcHJlcGFyZT1mdW5jdGlvbigpe3ZhciByb3VuZHM9bnVtYmVyT2ZSb3VuZHNbdGhpcy5rZXkubGVuZ3RoXTtpZihyb3VuZHM9PW51bGwpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBrZXkgc2l6ZSAobXVzdCBiZSAxNiwgMjQgb3IgMzIgYnl0ZXMpIil9dGhpcy5fS2U9W107dGhpcy5fS2Q9W107Zm9yKHZhciBpPTA7aTw9cm91bmRzO2krKyl7dGhpcy5fS2UucHVzaChbMCwwLDAsMF0pO3RoaXMuX0tkLnB1c2goWzAsMCwwLDBdKX12YXIgcm91bmRLZXlDb3VudD0ocm91bmRzKzEpKjQ7dmFyIEtDPXRoaXMua2V5Lmxlbmd0aC80O3ZhciB0az1jb252ZXJ0VG9JbnQzMih0aGlzLmtleSk7dmFyIGluZGV4O2Zvcih2YXIgaT0wO2k8S0M7aSsrKXtpbmRleD1pPj4yO3RoaXMuX0tlW2luZGV4XVtpJTRdPXRrW2ldO3RoaXMuX0tkW3JvdW5kcy1pbmRleF1baSU0XT10a1tpXX12YXIgcmNvbnBvaW50ZXI9MDt2YXIgdD1LQyx0dDt3aGlsZSh0PHJvdW5kS2V5Q291bnQpe3R0PXRrW0tDLTFdO3RrWzBdXj1TW3R0Pj4xNiYyNTVdPDwyNF5TW3R0Pj44JjI1NV08PDE2XlNbdHQmMjU1XTw8OF5TW3R0Pj4yNCYyNTVdXnJjb25bcmNvbnBvaW50ZXJdPDwyNDtyY29ucG9pbnRlcis9MTtpZihLQyE9OCl7Zm9yKHZhciBpPTE7aTxLQztpKyspe3RrW2ldXj10a1tpLTFdfX1lbHNle2Zvcih2YXIgaT0xO2k8S0MvMjtpKyspe3RrW2ldXj10a1tpLTFdfXR0PXRrW0tDLzItMV07dGtbS0MvMl1ePVNbdHQmMjU1XV5TW3R0Pj44JjI1NV08PDheU1t0dD4+MTYmMjU1XTw8MTZeU1t0dD4+MjQmMjU1XTw8MjQ7Zm9yKHZhciBpPUtDLzIrMTtpPEtDO2krKyl7dGtbaV1ePXRrW2ktMV19fXZhciBpPTAscixjO3doaWxlKGk8S0MmJnQ8cm91bmRLZXlDb3VudCl7cj10Pj4yO2M9dCU0O3RoaXMuX0tlW3JdW2NdPXRrW2ldO3RoaXMuX0tkW3JvdW5kcy1yXVtjXT10a1tpKytdO3QrK319Zm9yKHZhciByPTE7cjxyb3VuZHM7cisrKXtmb3IodmFyIGM9MDtjPDQ7YysrKXt0dD10aGlzLl9LZFtyXVtjXTt0aGlzLl9LZFtyXVtjXT1VMVt0dD4+MjQmMjU1XV5VMlt0dD4+MTYmMjU1XV5VM1t0dD4+OCYyNTVdXlU0W3R0JjI1NV19fX07QUVTLnByb3RvdHlwZS5lbmNyeXB0PWZ1bmN0aW9uKHBsYWludGV4dCl7aWYocGxhaW50ZXh0Lmxlbmd0aCE9MTYpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBwbGFpbnRleHQgc2l6ZSAobXVzdCBiZSAxNiBieXRlcykiKX12YXIgcm91bmRzPXRoaXMuX0tlLmxlbmd0aC0xO3ZhciBhPVswLDAsMCwwXTt2YXIgdD1jb252ZXJ0VG9JbnQzMihwbGFpbnRleHQpO2Zvcih2YXIgaT0wO2k8NDtpKyspe3RbaV1ePXRoaXMuX0tlWzBdW2ldfWZvcih2YXIgcj0xO3I8cm91bmRzO3IrKyl7Zm9yKHZhciBpPTA7aTw0O2krKyl7YVtpXT1UMVt0W2ldPj4yNCYyNTVdXlQyW3RbKGkrMSklNF0+PjE2JjI1NV1eVDNbdFsoaSsyKSU0XT4+OCYyNTVdXlQ0W3RbKGkrMyklNF0mMjU1XV50aGlzLl9LZVtyXVtpXX10PWEuc2xpY2UoKX12YXIgcmVzdWx0PWNyZWF0ZUFycmF5KDE2KSx0dDtmb3IodmFyIGk9MDtpPDQ7aSsrKXt0dD10aGlzLl9LZVtyb3VuZHNdW2ldO3Jlc3VsdFs0KmldPShTW3RbaV0+PjI0JjI1NV1edHQ+PjI0KSYyNTU7cmVzdWx0WzQqaSsxXT0oU1t0WyhpKzEpJTRdPj4xNiYyNTVdXnR0Pj4xNikmMjU1O3Jlc3VsdFs0KmkrMl09KFNbdFsoaSsyKSU0XT4+OCYyNTVdXnR0Pj44KSYyNTU7cmVzdWx0WzQqaSszXT0oU1t0WyhpKzMpJTRdJjI1NV1edHQpJjI1NX1yZXR1cm4gcmVzdWx0fTtBRVMucHJvdG90eXBlLmRlY3J5cHQ9ZnVuY3Rpb24oY2lwaGVydGV4dCl7aWYoY2lwaGVydGV4dC5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIDE2IGJ5dGVzKSIpfXZhciByb3VuZHM9dGhpcy5fS2QubGVuZ3RoLTE7dmFyIGE9WzAsMCwwLDBdO3ZhciB0PWNvbnZlcnRUb0ludDMyKGNpcGhlcnRleHQpO2Zvcih2YXIgaT0wO2k8NDtpKyspe3RbaV1ePXRoaXMuX0tkWzBdW2ldfWZvcih2YXIgcj0xO3I8cm91bmRzO3IrKyl7Zm9yKHZhciBpPTA7aTw0O2krKyl7YVtpXT1UNVt0W2ldPj4yNCYyNTVdXlQ2W3RbKGkrMyklNF0+PjE2JjI1NV1eVDdbdFsoaSsyKSU0XT4+OCYyNTVdXlQ4W3RbKGkrMSklNF0mMjU1XV50aGlzLl9LZFtyXVtpXX10PWEuc2xpY2UoKX12YXIgcmVzdWx0PWNyZWF0ZUFycmF5KDE2KSx0dDtmb3IodmFyIGk9MDtpPDQ7aSsrKXt0dD10aGlzLl9LZFtyb3VuZHNdW2ldO3Jlc3VsdFs0KmldPShTaVt0W2ldPj4yNCYyNTVdXnR0Pj4yNCkmMjU1O3Jlc3VsdFs0KmkrMV09KFNpW3RbKGkrMyklNF0+PjE2JjI1NV1edHQ+PjE2KSYyNTU7cmVzdWx0WzQqaSsyXT0oU2lbdFsoaSsyKSU0XT4+OCYyNTVdXnR0Pj44KSYyNTU7cmVzdWx0WzQqaSszXT0oU2lbdFsoaSsxKSU0XSYyNTVdXnR0KSYyNTV9cmV0dXJuIHJlc3VsdH07dmFyIE1vZGVPZk9wZXJhdGlvbkVDQj1mdW5jdGlvbihrZXkpe2lmKCEodGhpcyBpbnN0YW5jZW9mIE1vZGVPZk9wZXJhdGlvbkVDQikpe3Rocm93IEVycm9yKCJBRVMgbXVzdCBiZSBpbnN0YW5pdGF0ZWQgd2l0aCBgbmV3YCIpfXRoaXMuZGVzY3JpcHRpb249IkVsZWN0cm9uaWMgQ29kZSBCbG9jayI7dGhpcy5uYW1lPSJlY2IiO3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbkVDQi5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3BsYWludGV4dD1jb2VyY2VBcnJheShwbGFpbnRleHQpO2lmKHBsYWludGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgcGxhaW50ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIGNpcGhlcnRleHQ9Y3JlYXRlQXJyYXkocGxhaW50ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9MTYpe2NvcHlBcnJheShwbGFpbnRleHQsYmxvY2ssMCxpLGkrMTYpO2Jsb2NrPXRoaXMuX2Flcy5lbmNyeXB0KGJsb2NrKTtjb3B5QXJyYXkoYmxvY2ssY2lwaGVydGV4dCxpKX1yZXR1cm4gY2lwaGVydGV4dH07TW9kZU9mT3BlcmF0aW9uRUNCLnByb3RvdHlwZS5kZWNyeXB0PWZ1bmN0aW9uKGNpcGhlcnRleHQpe2NpcGhlcnRleHQ9Y29lcmNlQXJyYXkoY2lwaGVydGV4dCk7aWYoY2lwaGVydGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIG11bHRpcGxlIG9mIDE2IGJ5dGVzKSIpfXZhciBwbGFpbnRleHQ9Y3JlYXRlQXJyYXkoY2lwaGVydGV4dC5sZW5ndGgpO3ZhciBibG9jaz1jcmVhdGVBcnJheSgxNik7Zm9yKHZhciBpPTA7aTxjaXBoZXJ0ZXh0Lmxlbmd0aDtpKz0xNil7Y29weUFycmF5KGNpcGhlcnRleHQsYmxvY2ssMCxpLGkrMTYpO2Jsb2NrPXRoaXMuX2Flcy5kZWNyeXB0KGJsb2NrKTtjb3B5QXJyYXkoYmxvY2sscGxhaW50ZXh0LGkpfXJldHVybiBwbGFpbnRleHR9O3ZhciBNb2RlT2ZPcGVyYXRpb25DQkM9ZnVuY3Rpb24oa2V5LGl2KXtpZighKHRoaXMgaW5zdGFuY2VvZiBNb2RlT2ZPcGVyYXRpb25DQkMpKXt0aHJvdyBFcnJvcigiQUVTIG11c3QgYmUgaW5zdGFuaXRhdGVkIHdpdGggYG5ld2AiKX10aGlzLmRlc2NyaXB0aW9uPSJDaXBoZXIgQmxvY2sgQ2hhaW5pbmciO3RoaXMubmFtZT0iY2JjIjtpZighaXYpe2l2PWNyZWF0ZUFycmF5KDE2KX1lbHNlIGlmKGl2Lmxlbmd0aCE9MTYpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBpbml0aWFsYXRpb24gdmVjdG9yIHNpemUgKG11c3QgYmUgMTYgYnl0ZXMpIil9dGhpcy5fbGFzdENpcGhlcmJsb2NrPWNvZXJjZUFycmF5KGl2LHRydWUpO3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbkNCQy5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3BsYWludGV4dD1jb2VyY2VBcnJheShwbGFpbnRleHQpO2lmKHBsYWludGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgcGxhaW50ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIGNpcGhlcnRleHQ9Y3JlYXRlQXJyYXkocGxhaW50ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9MTYpe2NvcHlBcnJheShwbGFpbnRleHQsYmxvY2ssMCxpLGkrMTYpO2Zvcih2YXIgaj0wO2o8MTY7aisrKXtibG9ja1tqXV49dGhpcy5fbGFzdENpcGhlcmJsb2NrW2pdfXRoaXMuX2xhc3RDaXBoZXJibG9jaz10aGlzLl9hZXMuZW5jcnlwdChibG9jayk7Y29weUFycmF5KHRoaXMuX2xhc3RDaXBoZXJibG9jayxjaXBoZXJ0ZXh0LGkpfXJldHVybiBjaXBoZXJ0ZXh0fTtNb2RlT2ZPcGVyYXRpb25DQkMucHJvdG90eXBlLmRlY3J5cHQ9ZnVuY3Rpb24oY2lwaGVydGV4dCl7Y2lwaGVydGV4dD1jb2VyY2VBcnJheShjaXBoZXJ0ZXh0KTtpZihjaXBoZXJ0ZXh0Lmxlbmd0aCUxNiE9PTApe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBjaXBoZXJ0ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIHBsYWludGV4dD1jcmVhdGVBcnJheShjaXBoZXJ0ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPGNpcGhlcnRleHQubGVuZ3RoO2krPTE2KXtjb3B5QXJyYXkoY2lwaGVydGV4dCxibG9jaywwLGksaSsxNik7YmxvY2s9dGhpcy5fYWVzLmRlY3J5cHQoYmxvY2spO2Zvcih2YXIgaj0wO2o8MTY7aisrKXtwbGFpbnRleHRbaStqXT1ibG9ja1tqXV50aGlzLl9sYXN0Q2lwaGVyYmxvY2tbal19Y29weUFycmF5KGNpcGhlcnRleHQsdGhpcy5fbGFzdENpcGhlcmJsb2NrLDAsaSxpKzE2KX1yZXR1cm4gcGxhaW50ZXh0fTt2YXIgTW9kZU9mT3BlcmF0aW9uQ0ZCPWZ1bmN0aW9uKGtleSxpdixzZWdtZW50U2l6ZSl7aWYoISh0aGlzIGluc3RhbmNlb2YgTW9kZU9mT3BlcmF0aW9uQ0ZCKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9dGhpcy5kZXNjcmlwdGlvbj0iQ2lwaGVyIEZlZWRiYWNrIjt0aGlzLm5hbWU9ImNmYiI7aWYoIWl2KXtpdj1jcmVhdGVBcnJheSgxNil9ZWxzZSBpZihpdi5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgaW5pdGlhbGF0aW9uIHZlY3RvciBzaXplIChtdXN0IGJlIDE2IHNpemUpIil9aWYoIXNlZ21lbnRTaXplKXtzZWdtZW50U2l6ZT0xfXRoaXMuc2VnbWVudFNpemU9c2VnbWVudFNpemU7dGhpcy5fc2hpZnRSZWdpc3Rlcj1jb2VyY2VBcnJheShpdix0cnVlKTt0aGlzLl9hZXM9bmV3IEFFUyhrZXkpfTtNb2RlT2ZPcGVyYXRpb25DRkIucHJvdG90eXBlLmVuY3J5cHQ9ZnVuY3Rpb24ocGxhaW50ZXh0KXtpZihwbGFpbnRleHQubGVuZ3RoJXRoaXMuc2VnbWVudFNpemUhPTApe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBwbGFpbnRleHQgc2l6ZSAobXVzdCBiZSBzZWdtZW50U2l6ZSBieXRlcykiKX12YXIgZW5jcnlwdGVkPWNvZXJjZUFycmF5KHBsYWludGV4dCx0cnVlKTt2YXIgeG9yU2VnbWVudDtmb3IodmFyIGk9MDtpPGVuY3J5cHRlZC5sZW5ndGg7aSs9dGhpcy5zZWdtZW50U2l6ZSl7eG9yU2VnbWVudD10aGlzLl9hZXMuZW5jcnlwdCh0aGlzLl9zaGlmdFJlZ2lzdGVyKTtmb3IodmFyIGo9MDtqPHRoaXMuc2VnbWVudFNpemU7aisrKXtlbmNyeXB0ZWRbaStqXV49eG9yU2VnbWVudFtqXX1jb3B5QXJyYXkodGhpcy5fc2hpZnRSZWdpc3Rlcix0aGlzLl9zaGlmdFJlZ2lzdGVyLDAsdGhpcy5zZWdtZW50U2l6ZSk7Y29weUFycmF5KGVuY3J5cHRlZCx0aGlzLl9zaGlmdFJlZ2lzdGVyLDE2LXRoaXMuc2VnbWVudFNpemUsaSxpK3RoaXMuc2VnbWVudFNpemUpfXJldHVybiBlbmNyeXB0ZWR9O01vZGVPZk9wZXJhdGlvbkNGQi5wcm90b3R5cGUuZGVjcnlwdD1mdW5jdGlvbihjaXBoZXJ0ZXh0KXtpZihjaXBoZXJ0ZXh0Lmxlbmd0aCV0aGlzLnNlZ21lbnRTaXplIT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIHNlZ21lbnRTaXplIGJ5dGVzKSIpfXZhciBwbGFpbnRleHQ9Y29lcmNlQXJyYXkoY2lwaGVydGV4dCx0cnVlKTt2YXIgeG9yU2VnbWVudDtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9dGhpcy5zZWdtZW50U2l6ZSl7eG9yU2VnbWVudD10aGlzLl9hZXMuZW5jcnlwdCh0aGlzLl9zaGlmdFJlZ2lzdGVyKTtmb3IodmFyIGo9MDtqPHRoaXMuc2VnbWVudFNpemU7aisrKXtwbGFpbnRleHRbaStqXV49eG9yU2VnbWVudFtqXX1jb3B5QXJyYXkodGhpcy5fc2hpZnRSZWdpc3Rlcix0aGlzLl9zaGlmdFJlZ2lzdGVyLDAsdGhpcy5zZWdtZW50U2l6ZSk7Y29weUFycmF5KGNpcGhlcnRleHQsdGhpcy5fc2hpZnRSZWdpc3RlciwxNi10aGlzLnNlZ21lbnRTaXplLGksaSt0aGlzLnNlZ21lbnRTaXplKX1yZXR1cm4gcGxhaW50ZXh0fTt2YXIgTW9kZU9mT3BlcmF0aW9uT0ZCPWZ1bmN0aW9uKGtleSxpdil7aWYoISh0aGlzIGluc3RhbmNlb2YgTW9kZU9mT3BlcmF0aW9uT0ZCKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9dGhpcy5kZXNjcmlwdGlvbj0iT3V0cHV0IEZlZWRiYWNrIjt0aGlzLm5hbWU9Im9mYiI7aWYoIWl2KXtpdj1jcmVhdGVBcnJheSgxNil9ZWxzZSBpZihpdi5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgaW5pdGlhbGF0aW9uIHZlY3RvciBzaXplIChtdXN0IGJlIDE2IGJ5dGVzKSIpfXRoaXMuX2xhc3RQcmVjaXBoZXI9Y29lcmNlQXJyYXkoaXYsdHJ1ZSk7dGhpcy5fbGFzdFByZWNpcGhlckluZGV4PTE2O3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbk9GQi5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3ZhciBlbmNyeXB0ZWQ9Y29lcmNlQXJyYXkocGxhaW50ZXh0LHRydWUpO2Zvcih2YXIgaT0wO2k8ZW5jcnlwdGVkLmxlbmd0aDtpKyspe2lmKHRoaXMuX2xhc3RQcmVjaXBoZXJJbmRleD09PTE2KXt0aGlzLl9sYXN0UHJlY2lwaGVyPXRoaXMuX2Flcy5lbmNyeXB0KHRoaXMuX2xhc3RQcmVjaXBoZXIpO3RoaXMuX2xhc3RQcmVjaXBoZXJJbmRleD0wfWVuY3J5cHRlZFtpXV49dGhpcy5fbGFzdFByZWNpcGhlclt0aGlzLl9sYXN0UHJlY2lwaGVySW5kZXgrK119cmV0dXJuIGVuY3J5cHRlZH07TW9kZU9mT3BlcmF0aW9uT0ZCLnByb3RvdHlwZS5kZWNyeXB0PU1vZGVPZk9wZXJhdGlvbk9GQi5wcm90b3R5cGUuZW5jcnlwdDt2YXIgQ291bnRlcj1mdW5jdGlvbihpbml0aWFsVmFsdWUpe2lmKCEodGhpcyBpbnN0YW5jZW9mIENvdW50ZXIpKXt0aHJvdyBFcnJvcigiQ291bnRlciBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9aWYoaW5pdGlhbFZhbHVlIT09MCYmIWluaXRpYWxWYWx1ZSl7aW5pdGlhbFZhbHVlPTF9aWYodHlwZW9mIGluaXRpYWxWYWx1ZT09PSJudW1iZXIiKXt0aGlzLl9jb3VudGVyPWNyZWF0ZUFycmF5KDE2KTt0aGlzLnNldFZhbHVlKGluaXRpYWxWYWx1ZSl9ZWxzZXt0aGlzLnNldEJ5dGVzKGluaXRpYWxWYWx1ZSl9fTtDb3VudGVyLnByb3RvdHlwZS5zZXRWYWx1ZT1mdW5jdGlvbih2YWx1ZSl7aWYodHlwZW9mIHZhbHVlIT09Im51bWJlciJ8fHBhcnNlSW50KHZhbHVlKSE9dmFsdWUpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBjb3VudGVyIHZhbHVlIChtdXN0IGJlIGFuIGludGVnZXIpIil9aWYodmFsdWU+TnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpe3Rocm93IG5ldyBFcnJvcigiaW50ZWdlciB2YWx1ZSBvdXQgb2Ygc2FmZSByYW5nZSIpfWZvcih2YXIgaW5kZXg9MTU7aW5kZXg+PTA7LS1pbmRleCl7dGhpcy5fY291bnRlcltpbmRleF09dmFsdWUlMjU2O3ZhbHVlPXBhcnNlSW50KHZhbHVlLzI1Nil9fTtDb3VudGVyLnByb3RvdHlwZS5zZXRCeXRlcz1mdW5jdGlvbihieXRlcyl7Ynl0ZXM9Y29lcmNlQXJyYXkoYnl0ZXMsdHJ1ZSk7aWYoYnl0ZXMubGVuZ3RoIT0xNil7dGhyb3cgbmV3IEVycm9yKCJpbnZhbGlkIGNvdW50ZXIgYnl0ZXMgc2l6ZSAobXVzdCBiZSAxNiBieXRlcykiKX10aGlzLl9jb3VudGVyPWJ5dGVzfTtDb3VudGVyLnByb3RvdHlwZS5pbmNyZW1lbnQ9ZnVuY3Rpb24oKXtmb3IodmFyIGk9MTU7aT49MDtpLS0pe2lmKHRoaXMuX2NvdW50ZXJbaV09PT0yNTUpe3RoaXMuX2NvdW50ZXJbaV09MH1lbHNle3RoaXMuX2NvdW50ZXJbaV0rKzticmVha319fTt2YXIgTW9kZU9mT3BlcmF0aW9uQ1RSPWZ1bmN0aW9uKGtleSxjb3VudGVyKXtpZighKHRoaXMgaW5zdGFuY2VvZiBNb2RlT2ZPcGVyYXRpb25DVFIpKXt0aHJvdyBFcnJvcigiQUVTIG11c3QgYmUgaW5zdGFuaXRhdGVkIHdpdGggYG5ld2AiKX10aGlzLmRlc2NyaXB0aW9uPSJDb3VudGVyIjt0aGlzLm5hbWU9ImN0ciI7aWYoIShjb3VudGVyIGluc3RhbmNlb2YgQ291bnRlcikpe2NvdW50ZXI9bmV3IENvdW50ZXIoY291bnRlcil9dGhpcy5fY291bnRlcj1jb3VudGVyO3RoaXMuX3JlbWFpbmluZ0NvdW50ZXI9bnVsbDt0aGlzLl9yZW1haW5pbmdDb3VudGVySW5kZXg9MTY7dGhpcy5fYWVzPW5ldyBBRVMoa2V5KX07TW9kZU9mT3BlcmF0aW9uQ1RSLnByb3RvdHlwZS5lbmNyeXB0PWZ1bmN0aW9uKHBsYWludGV4dCl7dmFyIGVuY3J5cHRlZD1jb2VyY2VBcnJheShwbGFpbnRleHQsdHJ1ZSk7Zm9yKHZhciBpPTA7aTxlbmNyeXB0ZWQubGVuZ3RoO2krKyl7aWYodGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4PT09MTYpe3RoaXMuX3JlbWFpbmluZ0NvdW50ZXI9dGhpcy5fYWVzLmVuY3J5cHQodGhpcy5fY291bnRlci5fY291bnRlcik7dGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4PTA7dGhpcy5fY291bnRlci5pbmNyZW1lbnQoKX1lbmNyeXB0ZWRbaV1ePXRoaXMuX3JlbWFpbmluZ0NvdW50ZXJbdGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4KytdfXJldHVybiBlbmNyeXB0ZWR9O01vZGVPZk9wZXJhdGlvbkNUUi5wcm90b3R5cGUuZGVjcnlwdD1Nb2RlT2ZPcGVyYXRpb25DVFIucHJvdG90eXBlLmVuY3J5cHQ7ZnVuY3Rpb24gcGtjczdwYWQoZGF0YSl7ZGF0YT1jb2VyY2VBcnJheShkYXRhLHRydWUpO3ZhciBwYWRkZXI9MTYtZGF0YS5sZW5ndGglMTY7dmFyIHJlc3VsdD1jcmVhdGVBcnJheShkYXRhLmxlbmd0aCtwYWRkZXIpO2NvcHlBcnJheShkYXRhLHJlc3VsdCk7Zm9yKHZhciBpPWRhdGEubGVuZ3RoO2k8cmVzdWx0Lmxlbmd0aDtpKyspe3Jlc3VsdFtpXT1wYWRkZXJ9cmV0dXJuIHJlc3VsdH1mdW5jdGlvbiBwa2NzN3N0cmlwKGRhdGEpe2RhdGE9Y29lcmNlQXJyYXkoZGF0YSx0cnVlKTtpZihkYXRhLmxlbmd0aDwxNil7dGhyb3cgbmV3IEVycm9yKCJQS0NTIzcgaW52YWxpZCBsZW5ndGgiKX12YXIgcGFkZGVyPWRhdGFbZGF0YS5sZW5ndGgtMV07aWYocGFkZGVyPjE2KXt0aHJvdyBuZXcgRXJyb3IoIlBLQ1MjNyBwYWRkaW5nIGJ5dGUgb3V0IG9mIHJhbmdlIil9dmFyIGxlbmd0aD1kYXRhLmxlbmd0aC1wYWRkZXI7Zm9yKHZhciBpPTA7aTxwYWRkZXI7aSsrKXtpZihkYXRhW2xlbmd0aCtpXSE9PXBhZGRlcil7dGhyb3cgbmV3IEVycm9yKCJQS0NTIzcgaW52YWxpZCBwYWRkaW5nIGJ5dGUiKX19dmFyIHJlc3VsdD1jcmVhdGVBcnJheShsZW5ndGgpO2NvcHlBcnJheShkYXRhLHJlc3VsdCwwLDAsbGVuZ3RoKTtyZXR1cm4gcmVzdWx0fXZhciBhZXNqcz17QUVTOkFFUyxDb3VudGVyOkNvdW50ZXIsTW9kZU9mT3BlcmF0aW9uOntlY2I6TW9kZU9mT3BlcmF0aW9uRUNCLGNiYzpNb2RlT2ZPcGVyYXRpb25DQkMsY2ZiOk1vZGVPZk9wZXJhdGlvbkNGQixvZmI6TW9kZU9mT3BlcmF0aW9uT0ZCLGN0cjpNb2RlT2ZPcGVyYXRpb25DVFJ9LHV0aWxzOntoZXg6Y29udmVydEhleCx1dGY4OmNvbnZlcnRVdGY4fSxwYWRkaW5nOntwa2NzNzp7cGFkOnBrY3M3cGFkLHN0cmlwOnBrY3M3c3RyaXB9fSxfYXJyYXlUZXN0Ontjb2VyY2VBcnJheTpjb2VyY2VBcnJheSxjcmVhdGVBcnJheTpjcmVhdGVBcnJheSxjb3B5QXJyYXk6Y29weUFycmF5fX07aWYodHlwZW9mIGV4cG9ydHMhPT0idW5kZWZpbmVkIil7bW9kdWxlLmV4cG9ydHM9YWVzanN9ZWxzZSBpZih0eXBlb2YgZGVmaW5lPT09ImZ1bmN0aW9uIiYmZGVmaW5lLmFtZCl7ZGVmaW5lKFtdLGZ1bmN0aW9uKCl7cmV0dXJuIGFlc2pzfSl9ZWxzZXtpZihyb290LmFlc2pzKXthZXNqcy5fYWVzanM9cm9vdC5hZXNqc31yb290LmFlc2pzPWFlc2pzfX0pKHRoaXMpfSx7fV0sMTQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtuZXdJbnZhbGlkQXNuMUVycm9yOmZ1bmN0aW9uKG1zZyl7dmFyIGU9bmV3IEVycm9yO2UubmFtZT0iSW52YWxpZEFzbjFFcnJvciI7ZS5tZXNzYWdlPW1zZ3x8IiI7cmV0dXJuIGV9fX0se31dLDE1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgZXJyb3JzPXJlcXVpcmUoIi4vZXJyb3JzIik7dmFyIHR5cGVzPXJlcXVpcmUoIi4vdHlwZXMiKTt2YXIgUmVhZGVyPXJlcXVpcmUoIi4vcmVhZGVyIik7dmFyIFdyaXRlcj1yZXF1aXJlKCIuL3dyaXRlciIpO21vZHVsZS5leHBvcnRzPXtSZWFkZXI6UmVhZGVyLFdyaXRlcjpXcml0ZXJ9O2Zvcih2YXIgdCBpbiB0eXBlcyl7aWYodHlwZXMuaGFzT3duUHJvcGVydHkodCkpbW9kdWxlLmV4cG9ydHNbdF09dHlwZXNbdF19Zm9yKHZhciBlIGluIGVycm9ycyl7aWYoZXJyb3JzLmhhc093blByb3BlcnR5KGUpKW1vZHVsZS5leHBvcnRzW2VdPWVycm9yc1tlXX19LHsiLi9lcnJvcnMiOjE0LCIuL3JlYWRlciI6MTYsIi4vdHlwZXMiOjE3LCIuL3dyaXRlciI6MTh9XSwxNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGFzc2VydD1yZXF1aXJlKCJhc3NlcnQiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmVyLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgQVNOMT1yZXF1aXJlKCIuL3R5cGVzIik7dmFyIGVycm9ycz1yZXF1aXJlKCIuL2Vycm9ycyIpO3ZhciBuZXdJbnZhbGlkQXNuMUVycm9yPWVycm9ycy5uZXdJbnZhbGlkQXNuMUVycm9yO2Z1bmN0aW9uIFJlYWRlcihkYXRhKXtpZighZGF0YXx8IUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl0aHJvdyBuZXcgVHlwZUVycm9yKCJkYXRhIG11c3QgYmUgYSBub2RlIEJ1ZmZlciIpO3RoaXMuX2J1Zj1kYXRhO3RoaXMuX3NpemU9ZGF0YS5sZW5ndGg7dGhpcy5fbGVuPTA7dGhpcy5fb2Zmc2V0PTB9T2JqZWN0LmRlZmluZVByb3BlcnR5KFJlYWRlci5wcm90b3R5cGUsImxlbmd0aCIse2VudW1lcmFibGU6dHJ1ZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbGVufX0pO09iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWFkZXIucHJvdG90eXBlLCJvZmZzZXQiLHtlbnVtZXJhYmxlOnRydWUsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX29mZnNldH19KTtPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVhZGVyLnByb3RvdHlwZSwicmVtYWluIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3NpemUtdGhpcy5fb2Zmc2V0fX0pO09iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWFkZXIucHJvdG90eXBlLCJidWZmZXIiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fYnVmLnNsaWNlKHRoaXMuX29mZnNldCl9fSk7UmVhZGVyLnByb3RvdHlwZS5yZWFkQnl0ZT1mdW5jdGlvbihwZWVrKXtpZih0aGlzLl9zaXplLXRoaXMuX29mZnNldDwxKXJldHVybiBudWxsO3ZhciBiPXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXRdJjI1NTtpZighcGVlayl0aGlzLl9vZmZzZXQrPTE7cmV0dXJuIGJ9O1JlYWRlci5wcm90b3R5cGUucGVlaz1mdW5jdGlvbigpe3JldHVybiB0aGlzLnJlYWRCeXRlKHRydWUpfTtSZWFkZXIucHJvdG90eXBlLnJlYWRMZW5ndGg9ZnVuY3Rpb24ob2Zmc2V0KXtpZihvZmZzZXQ9PT11bmRlZmluZWQpb2Zmc2V0PXRoaXMuX29mZnNldDtpZihvZmZzZXQ+PXRoaXMuX3NpemUpcmV0dXJuIG51bGw7dmFyIGxlbkI9dGhpcy5fYnVmW29mZnNldCsrXSYyNTU7aWYobGVuQj09PW51bGwpcmV0dXJuIG51bGw7aWYoKGxlbkImMTI4KT09PTEyOCl7bGVuQiY9MTI3O2lmKGxlbkI9PT0wKXRocm93IG5ld0ludmFsaWRBc24xRXJyb3IoIkluZGVmaW5pdGUgbGVuZ3RoIG5vdCBzdXBwb3J0ZWQiKTtpZihsZW5CPjQpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiZW5jb2RpbmcgdG9vIGxvbmciKTtpZih0aGlzLl9zaXplLW9mZnNldDxsZW5CKXJldHVybiBudWxsO3RoaXMuX2xlbj0wO2Zvcih2YXIgaT0wO2k8bGVuQjtpKyspdGhpcy5fbGVuPSh0aGlzLl9sZW48PDgpKyh0aGlzLl9idWZbb2Zmc2V0KytdJjI1NSl9ZWxzZXt0aGlzLl9sZW49bGVuQn1yZXR1cm4gb2Zmc2V0fTtSZWFkZXIucHJvdG90eXBlLnJlYWRTZXF1ZW5jZT1mdW5jdGlvbih0YWcpe3ZhciBzZXE9dGhpcy5wZWVrKCk7aWYoc2VxPT09bnVsbClyZXR1cm4gbnVsbDtpZih0YWchPT11bmRlZmluZWQmJnRhZyE9PXNlcSl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJFeHBlY3RlZCAweCIrdGFnLnRvU3RyaW5nKDE2KSsiOiBnb3QgMHgiK3NlcS50b1N0cmluZygxNikpO3ZhciBvPXRoaXMucmVhZExlbmd0aCh0aGlzLl9vZmZzZXQrMSk7aWYobz09PW51bGwpcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87cmV0dXJuIHNlcX07UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRUYWcoQVNOMS5JbnRlZ2VyKX07UmVhZGVyLnByb3RvdHlwZS5yZWFkQm9vbGVhbj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9yZWFkVGFnKEFTTjEuQm9vbGVhbik9PT0wP2ZhbHNlOnRydWV9O1JlYWRlci5wcm90b3R5cGUucmVhZEVudW1lcmF0aW9uPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRUYWcoQVNOMS5FbnVtZXJhdGlvbil9O1JlYWRlci5wcm90b3R5cGUucmVhZFN0cmluZz1mdW5jdGlvbih0YWcscmV0YnVmKXtpZighdGFnKXRhZz1BU04xLk9jdGV0U3RyaW5nO3ZhciBiPXRoaXMucGVlaygpO2lmKGI9PT1udWxsKXJldHVybiBudWxsO2lmKGIhPT10YWcpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiRXhwZWN0ZWQgMHgiK3RhZy50b1N0cmluZygxNikrIjogZ290IDB4IitiLnRvU3RyaW5nKDE2KSk7dmFyIG89dGhpcy5yZWFkTGVuZ3RoKHRoaXMuX29mZnNldCsxKTtpZihvPT09bnVsbClyZXR1cm4gbnVsbDtpZih0aGlzLmxlbmd0aD50aGlzLl9zaXplLW8pcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87aWYodGhpcy5sZW5ndGg9PT0wKXJldHVybiByZXRidWY/QnVmZmVyLmFsbG9jKDApOiIiO3ZhciBzdHI9dGhpcy5fYnVmLnNsaWNlKHRoaXMuX29mZnNldCx0aGlzLl9vZmZzZXQrdGhpcy5sZW5ndGgpO3RoaXMuX29mZnNldCs9dGhpcy5sZW5ndGg7cmV0dXJuIHJldGJ1Zj9zdHI6c3RyLnRvU3RyaW5nKCJ1dGY4Iil9O1JlYWRlci5wcm90b3R5cGUucmVhZE9JRD1mdW5jdGlvbih0YWcpe2lmKCF0YWcpdGFnPUFTTjEuT0lEO3ZhciBiPXRoaXMucmVhZFN0cmluZyh0YWcsdHJ1ZSk7aWYoYj09PW51bGwpcmV0dXJuIG51bGw7dmFyIHZhbHVlcz1bXTt2YXIgdmFsdWU9MDtmb3IodmFyIGk9MDtpPGIubGVuZ3RoO2krKyl7dmFyIGJ5dGU9YltpXSYyNTU7dmFsdWU8PD03O3ZhbHVlKz1ieXRlJjEyNztpZigoYnl0ZSYxMjgpPT09MCl7dmFsdWVzLnB1c2godmFsdWUpO3ZhbHVlPTB9fXZhbHVlPXZhbHVlcy5zaGlmdCgpO3ZhbHVlcy51bnNoaWZ0KHZhbHVlJTQwKTt2YWx1ZXMudW5zaGlmdCh2YWx1ZS80MD4+MCk7cmV0dXJuIHZhbHVlcy5qb2luKCIuIil9O1JlYWRlci5wcm90b3R5cGUuX3JlYWRUYWc9ZnVuY3Rpb24odGFnKXthc3NlcnQub2sodGFnIT09dW5kZWZpbmVkKTt2YXIgYj10aGlzLnBlZWsoKTtpZihiPT09bnVsbClyZXR1cm4gbnVsbDtpZihiIT09dGFnKXRocm93IG5ld0ludmFsaWRBc24xRXJyb3IoIkV4cGVjdGVkIDB4Iit0YWcudG9TdHJpbmcoMTYpKyI6IGdvdCAweCIrYi50b1N0cmluZygxNikpO3ZhciBvPXRoaXMucmVhZExlbmd0aCh0aGlzLl9vZmZzZXQrMSk7aWYobz09PW51bGwpcmV0dXJuIG51bGw7aWYodGhpcy5sZW5ndGg+NCl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJJbnRlZ2VyIHRvbyBsb25nOiAiK3RoaXMubGVuZ3RoKTtpZih0aGlzLmxlbmd0aD50aGlzLl9zaXplLW8pcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87dmFyIGZiPXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXRdO3ZhciB2YWx1ZT0wO2Zvcih2YXIgaT0wO2k8dGhpcy5sZW5ndGg7aSsrKXt2YWx1ZTw8PTg7dmFsdWV8PXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK10mMjU1fWlmKChmYiYxMjgpPT09MTI4JiZpIT09NCl2YWx1ZS09MTw8aSo4O3JldHVybiB2YWx1ZT4+MH07bW9kdWxlLmV4cG9ydHM9UmVhZGVyfSx7Ii4vZXJyb3JzIjoxNCwiLi90eXBlcyI6MTcsYXNzZXJ0OjIwLCJzYWZlci1idWZmZXIiOjgzfV0sMTc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtFT0M6MCxCb29sZWFuOjEsSW50ZWdlcjoyLEJpdFN0cmluZzozLE9jdGV0U3RyaW5nOjQsTnVsbDo1LE9JRDo2LE9iamVjdERlc2NyaXB0b3I6NyxFeHRlcm5hbDo4LFJlYWw6OSxFbnVtZXJhdGlvbjoxMCxQRFY6MTEsVXRmOFN0cmluZzoxMixSZWxhdGl2ZU9JRDoxMyxTZXF1ZW5jZToxNixTZXQ6MTcsTnVtZXJpY1N0cmluZzoxOCxQcmludGFibGVTdHJpbmc6MTksVDYxU3RyaW5nOjIwLFZpZGVvdGV4U3RyaW5nOjIxLElBNVN0cmluZzoyMixVVENUaW1lOjIzLEdlbmVyYWxpemVkVGltZToyNCxHcmFwaGljU3RyaW5nOjI1LFZpc2libGVTdHJpbmc6MjYsR2VuZXJhbFN0cmluZzoyOCxVbml2ZXJzYWxTdHJpbmc6MjksQ2hhcmFjdGVyU3RyaW5nOjMwLEJNUFN0cmluZzozMSxDb25zdHJ1Y3RvcjozMixDb250ZXh0OjEyOH19LHt9XSwxODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGFzc2VydD1yZXF1aXJlKCJhc3NlcnQiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmVyLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgQVNOMT1yZXF1aXJlKCIuL3R5cGVzIik7dmFyIGVycm9ycz1yZXF1aXJlKCIuL2Vycm9ycyIpO3ZhciBuZXdJbnZhbGlkQXNuMUVycm9yPWVycm9ycy5uZXdJbnZhbGlkQXNuMUVycm9yO3ZhciBERUZBVUxUX09QVFM9e3NpemU6MTAyNCxncm93dGhGYWN0b3I6OH07ZnVuY3Rpb24gbWVyZ2UoZnJvbSx0byl7YXNzZXJ0Lm9rKGZyb20pO2Fzc2VydC5lcXVhbCh0eXBlb2YgZnJvbSwib2JqZWN0Iik7YXNzZXJ0Lm9rKHRvKTthc3NlcnQuZXF1YWwodHlwZW9mIHRvLCJvYmplY3QiKTt2YXIga2V5cz1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhmcm9tKTtrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtpZih0b1trZXldKXJldHVybjt2YXIgdmFsdWU9T2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihmcm9tLGtleSk7T2JqZWN0LmRlZmluZVByb3BlcnR5KHRvLGtleSx2YWx1ZSl9KTtyZXR1cm4gdG99ZnVuY3Rpb24gV3JpdGVyKG9wdGlvbnMpe29wdGlvbnM9bWVyZ2UoREVGQVVMVF9PUFRTLG9wdGlvbnN8fHt9KTt0aGlzLl9idWY9QnVmZmVyLmFsbG9jKG9wdGlvbnMuc2l6ZXx8MTAyNCk7dGhpcy5fc2l6ZT10aGlzLl9idWYubGVuZ3RoO3RoaXMuX29mZnNldD0wO3RoaXMuX29wdGlvbnM9b3B0aW9uczt0aGlzLl9zZXE9W119T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRlci5wcm90b3R5cGUsImJ1ZmZlciIse2dldDpmdW5jdGlvbigpe2lmKHRoaXMuX3NlcS5sZW5ndGgpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcih0aGlzLl9zZXEubGVuZ3RoKyIgdW5lbmRlZCBzZXF1ZW5jZShzKSIpO3JldHVybiB0aGlzLl9idWYuc2xpY2UoMCx0aGlzLl9vZmZzZXQpfX0pO1dyaXRlci5wcm90b3R5cGUud3JpdGVCeXRlPWZ1bmN0aW9uKGIpe2lmKHR5cGVvZiBiIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO3RoaXMuX2Vuc3VyZSgxKTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPWJ9O1dyaXRlci5wcm90b3R5cGUud3JpdGVJbnQ9ZnVuY3Rpb24oaSx0YWcpe2lmKHR5cGVvZiBpIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5JbnRlZ2VyO3ZhciBzej00O3doaWxlKCgoaSY0Mjg2NTc4Njg4KT09PTB8fChpJjQyODY1Nzg2ODgpPT09NDI4NjU3ODY4OD4+MCkmJnN6PjEpe3N6LS07aTw8PTh9aWYoc3o+NCl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJCRVIgaW50cyBjYW5ub3QgYmUgPiAweGZmZmZmZmZmIik7dGhpcy5fZW5zdXJlKDIrc3opO3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109dGFnO3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109c3o7d2hpbGUoc3otLSA+MCl7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT0oaSY0Mjc4MTkwMDgwKT4+PjI0O2k8PD04fX07V3JpdGVyLnByb3RvdHlwZS53cml0ZU51bGw9ZnVuY3Rpb24oKXt0aGlzLndyaXRlQnl0ZShBU04xLk51bGwpO3RoaXMud3JpdGVCeXRlKDApfTtXcml0ZXIucHJvdG90eXBlLndyaXRlRW51bWVyYXRpb249ZnVuY3Rpb24oaSx0YWcpe2lmKHR5cGVvZiBpIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5FbnVtZXJhdGlvbjtyZXR1cm4gdGhpcy53cml0ZUludChpLHRhZyl9O1dyaXRlci5wcm90b3R5cGUud3JpdGVCb29sZWFuPWZ1bmN0aW9uKGIsdGFnKXtpZih0eXBlb2YgYiE9PSJib29sZWFuIil0aHJvdyBuZXcgVHlwZUVycm9yKCJhcmd1bWVudCBtdXN0IGJlIGEgQm9vbGVhbiIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5Cb29sZWFuO3RoaXMuX2Vuc3VyZSgzKTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPXRhZzt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPTE7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1iPzI1NTowfTtXcml0ZXIucHJvdG90eXBlLndyaXRlU3RyaW5nPWZ1bmN0aW9uKHMsdGFnKXtpZih0eXBlb2YgcyE9PSJzdHJpbmciKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcgKHdhczogIit0eXBlb2YgcysiKSIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5PY3RldFN0cmluZzt2YXIgbGVuPUJ1ZmZlci5ieXRlTGVuZ3RoKHMpO3RoaXMud3JpdGVCeXRlKHRhZyk7dGhpcy53cml0ZUxlbmd0aChsZW4pO2lmKGxlbil7dGhpcy5fZW5zdXJlKGxlbik7dGhpcy5fYnVmLndyaXRlKHMsdGhpcy5fb2Zmc2V0KTt0aGlzLl9vZmZzZXQrPWxlbn19O1dyaXRlci5wcm90b3R5cGUud3JpdGVCdWZmZXI9ZnVuY3Rpb24oYnVmLHRhZyl7aWYodHlwZW9mIHRhZyE9PSJudW1iZXIiKXRocm93IG5ldyBUeXBlRXJyb3IoInRhZyBtdXN0IGJlIGEgbnVtYmVyIik7aWYoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBidWZmZXIiKTt0aGlzLndyaXRlQnl0ZSh0YWcpO3RoaXMud3JpdGVMZW5ndGgoYnVmLmxlbmd0aCk7dGhpcy5fZW5zdXJlKGJ1Zi5sZW5ndGgpO2J1Zi5jb3B5KHRoaXMuX2J1Zix0aGlzLl9vZmZzZXQsMCxidWYubGVuZ3RoKTt0aGlzLl9vZmZzZXQrPWJ1Zi5sZW5ndGh9O1dyaXRlci5wcm90b3R5cGUud3JpdGVTdHJpbmdBcnJheT1mdW5jdGlvbihzdHJpbmdzKXtpZighc3RyaW5ncyBpbnN0YW5jZW9mIEFycmF5KXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXlbU3RyaW5nXSIpO3ZhciBzZWxmPXRoaXM7c3RyaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKHMpe3NlbGYud3JpdGVTdHJpbmcocyl9KX07V3JpdGVyLnByb3RvdHlwZS53cml0ZU9JRD1mdW5jdGlvbihzLHRhZyl7aWYodHlwZW9mIHMhPT0ic3RyaW5nIil0aHJvdyBuZXcgVHlwZUVycm9yKCJhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nIik7aWYodHlwZW9mIHRhZyE9PSJudW1iZXIiKXRhZz1BU04xLk9JRDtpZighL14oWzAtOV0rXC4pezMsfVswLTldKyQvLnRlc3QocykpdGhyb3cgbmV3IEVycm9yKCJhcmd1bWVudCBpcyBub3QgYSB2YWxpZCBPSUQgc3RyaW5nIik7ZnVuY3Rpb24gZW5jb2RlT2N0ZXQoYnl0ZXMsb2N0ZXQpe2lmKG9jdGV0PDEyOCl7Ynl0ZXMucHVzaChvY3RldCl9ZWxzZSBpZihvY3RldDwxNjM4NCl7Ynl0ZXMucHVzaChvY3RldD4+Pjd8MTI4KTtieXRlcy5wdXNoKG9jdGV0JjEyNyl9ZWxzZSBpZihvY3RldDwyMDk3MTUyKXtieXRlcy5wdXNoKG9jdGV0Pj4+MTR8MTI4KTtieXRlcy5wdXNoKChvY3RldD4+Pjd8MTI4KSYyNTUpO2J5dGVzLnB1c2gob2N0ZXQmMTI3KX1lbHNlIGlmKG9jdGV0PDI2ODQzNTQ1Nil7Ynl0ZXMucHVzaChvY3RldD4+PjIxfDEyOCk7Ynl0ZXMucHVzaCgob2N0ZXQ+Pj4xNHwxMjgpJjI1NSk7Ynl0ZXMucHVzaCgob2N0ZXQ+Pj43fDEyOCkmMjU1KTtieXRlcy5wdXNoKG9jdGV0JjEyNyl9ZWxzZXtieXRlcy5wdXNoKChvY3RldD4+PjI4fDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+PjIxfDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+PjE0fDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+Pjd8MTI4KSYyNTUpO2J5dGVzLnB1c2gob2N0ZXQmMTI3KX19dmFyIHRtcD1zLnNwbGl0KCIuIik7dmFyIGJ5dGVzPVtdO2J5dGVzLnB1c2gocGFyc2VJbnQodG1wWzBdLDEwKSo0MCtwYXJzZUludCh0bXBbMV0sMTApKTt0bXAuc2xpY2UoMikuZm9yRWFjaChmdW5jdGlvbihiKXtlbmNvZGVPY3RldChieXRlcyxwYXJzZUludChiLDEwKSl9KTt2YXIgc2VsZj10aGlzO3RoaXMuX2Vuc3VyZSgyK2J5dGVzLmxlbmd0aCk7dGhpcy53cml0ZUJ5dGUodGFnKTt0aGlzLndyaXRlTGVuZ3RoKGJ5dGVzLmxlbmd0aCk7Ynl0ZXMuZm9yRWFjaChmdW5jdGlvbihiKXtzZWxmLndyaXRlQnl0ZShiKX0pfTtXcml0ZXIucHJvdG90eXBlLndyaXRlTGVuZ3RoPWZ1bmN0aW9uKGxlbil7aWYodHlwZW9mIGxlbiE9PSJudW1iZXIiKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBOdW1iZXIiKTt0aGlzLl9lbnN1cmUoNCk7aWYobGVuPD0xMjcpe3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109bGVufWVsc2UgaWYobGVuPD0yNTUpe3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109MTI5O3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109bGVufWVsc2UgaWYobGVuPD02NTUzNSl7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT0xMzA7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW4+Pjg7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW59ZWxzZSBpZihsZW48PTE2Nzc3MjE1KXt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPTEzMTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPWxlbj4+MTY7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW4+Pjg7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW59ZWxzZXt0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJMZW5ndGggdG9vIGxvbmcgKD4gNCBieXRlcykiKX19O1dyaXRlci5wcm90b3R5cGUuc3RhcnRTZXF1ZW5jZT1mdW5jdGlvbih0YWcpe2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5TZXF1ZW5jZXxBU04xLkNvbnN0cnVjdG9yO3RoaXMud3JpdGVCeXRlKHRhZyk7dGhpcy5fc2VxLnB1c2godGhpcy5fb2Zmc2V0KTt0aGlzLl9lbnN1cmUoMyk7dGhpcy5fb2Zmc2V0Kz0zfTtXcml0ZXIucHJvdG90eXBlLmVuZFNlcXVlbmNlPWZ1bmN0aW9uKCl7dmFyIHNlcT10aGlzLl9zZXEucG9wKCk7dmFyIHN0YXJ0PXNlcSszO3ZhciBsZW49dGhpcy5fb2Zmc2V0LXN0YXJ0O2lmKGxlbjw9MTI3KXt0aGlzLl9zaGlmdChzdGFydCxsZW4sLTIpO3RoaXMuX2J1ZltzZXFdPWxlbn1lbHNlIGlmKGxlbjw9MjU1KXt0aGlzLl9zaGlmdChzdGFydCxsZW4sLTEpO3RoaXMuX2J1ZltzZXFdPTEyOTt0aGlzLl9idWZbc2VxKzFdPWxlbn1lbHNlIGlmKGxlbjw9NjU1MzUpe3RoaXMuX2J1ZltzZXFdPTEzMDt0aGlzLl9idWZbc2VxKzFdPWxlbj4+ODt0aGlzLl9idWZbc2VxKzJdPWxlbn1lbHNlIGlmKGxlbjw9MTY3NzcyMTUpe3RoaXMuX3NoaWZ0KHN0YXJ0LGxlbiwxKTt0aGlzLl9idWZbc2VxXT0xMzE7dGhpcy5fYnVmW3NlcSsxXT1sZW4+PjE2O3RoaXMuX2J1ZltzZXErMl09bGVuPj44O3RoaXMuX2J1ZltzZXErM109bGVufWVsc2V7dGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiU2VxdWVuY2UgdG9vIGxvbmciKX19O1dyaXRlci5wcm90b3R5cGUuX3NoaWZ0PWZ1bmN0aW9uKHN0YXJ0LGxlbixzaGlmdCl7YXNzZXJ0Lm9rKHN0YXJ0IT09dW5kZWZpbmVkKTthc3NlcnQub2sobGVuIT09dW5kZWZpbmVkKTthc3NlcnQub2soc2hpZnQpO3RoaXMuX2J1Zi5jb3B5KHRoaXMuX2J1ZixzdGFydCtzaGlmdCxzdGFydCxzdGFydCtsZW4pO3RoaXMuX29mZnNldCs9c2hpZnR9O1dyaXRlci5wcm90b3R5cGUuX2Vuc3VyZT1mdW5jdGlvbihsZW4pe2Fzc2VydC5vayhsZW4pO2lmKHRoaXMuX3NpemUtdGhpcy5fb2Zmc2V0PGxlbil7dmFyIHN6PXRoaXMuX3NpemUqdGhpcy5fb3B0aW9ucy5ncm93dGhGYWN0b3I7aWYoc3otdGhpcy5fb2Zmc2V0PGxlbilzeis9bGVuO3ZhciBidWY9QnVmZmVyLmFsbG9jKHN6KTt0aGlzLl9idWYuY29weShidWYsMCwwLHRoaXMuX29mZnNldCk7dGhpcy5fYnVmPWJ1Zjt0aGlzLl9zaXplPXN6fX07bW9kdWxlLmV4cG9ydHM9V3JpdGVyfSx7Ii4vZXJyb3JzIjoxNCwiLi90eXBlcyI6MTcsYXNzZXJ0OjIwLCJzYWZlci1idWZmZXIiOjgzfV0sMTk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBCZXI9cmVxdWlyZSgiLi9iZXIvaW5kZXgiKTttb2R1bGUuZXhwb3J0cz17QmVyOkJlcixCZXJSZWFkZXI6QmVyLlJlYWRlcixCZXJXcml0ZXI6QmVyLldyaXRlcn19LHsiLi9iZXIvaW5kZXgiOjE1fV0sMjA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwpeyJ1c2Ugc3RyaWN0Ijt2YXIgb2JqZWN0QXNzaWduPXJlcXVpcmUoIm9iamVjdC1hc3NpZ24iKTtmdW5jdGlvbiBjb21wYXJlKGEsYil7aWYoYT09PWIpe3JldHVybiAwfXZhciB4PWEubGVuZ3RoO3ZhciB5PWIubGVuZ3RoO2Zvcih2YXIgaT0wLGxlbj1NYXRoLm1pbih4LHkpO2k8bGVuOysraSl7aWYoYVtpXSE9PWJbaV0pe3g9YVtpXTt5PWJbaV07YnJlYWt9fWlmKHg8eSl7cmV0dXJuLTF9aWYoeTx4KXtyZXR1cm4gMX1yZXR1cm4gMH1mdW5jdGlvbiBpc0J1ZmZlcihiKXtpZihnbG9iYWwuQnVmZmVyJiZ0eXBlb2YgZ2xvYmFsLkJ1ZmZlci5pc0J1ZmZlcj09PSJmdW5jdGlvbiIpe3JldHVybiBnbG9iYWwuQnVmZmVyLmlzQnVmZmVyKGIpfXJldHVybiEhKGIhPW51bGwmJmIuX2lzQnVmZmVyKX12YXIgdXRpbD1yZXF1aXJlKCJ1dGlsLyIpO3ZhciBoYXNPd249T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTt2YXIgcFNsaWNlPUFycmF5LnByb3RvdHlwZS5zbGljZTt2YXIgZnVuY3Rpb25zSGF2ZU5hbWVzPWZ1bmN0aW9uKCl7cmV0dXJuIGZ1bmN0aW9uIGZvbygpe30ubmFtZT09PSJmb28ifSgpO2Z1bmN0aW9uIHBUb1N0cmluZyhvYmope3JldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKX1mdW5jdGlvbiBpc1ZpZXcoYXJyYnVmKXtpZihpc0J1ZmZlcihhcnJidWYpKXtyZXR1cm4gZmFsc2V9aWYodHlwZW9mIGdsb2JhbC5BcnJheUJ1ZmZlciE9PSJmdW5jdGlvbiIpe3JldHVybiBmYWxzZX1pZih0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3PT09ImZ1bmN0aW9uIil7cmV0dXJuIEFycmF5QnVmZmVyLmlzVmlldyhhcnJidWYpfWlmKCFhcnJidWYpe3JldHVybiBmYWxzZX1pZihhcnJidWYgaW5zdGFuY2VvZiBEYXRhVmlldyl7cmV0dXJuIHRydWV9aWYoYXJyYnVmLmJ1ZmZlciYmYXJyYnVmLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKXtyZXR1cm4gdHJ1ZX1yZXR1cm4gZmFsc2V9dmFyIGFzc2VydD1tb2R1bGUuZXhwb3J0cz1vazt2YXIgcmVnZXg9L1xzKmZ1bmN0aW9uXHMrKFteXChcc10qKVxzKi87ZnVuY3Rpb24gZ2V0TmFtZShmdW5jKXtpZighdXRpbC5pc0Z1bmN0aW9uKGZ1bmMpKXtyZXR1cm59aWYoZnVuY3Rpb25zSGF2ZU5hbWVzKXtyZXR1cm4gZnVuYy5uYW1lfXZhciBzdHI9ZnVuYy50b1N0cmluZygpO3ZhciBtYXRjaD1zdHIubWF0Y2gocmVnZXgpO3JldHVybiBtYXRjaCYmbWF0Y2hbMV19YXNzZXJ0LkFzc2VydGlvbkVycm9yPWZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpe3RoaXMubmFtZT0iQXNzZXJ0aW9uRXJyb3IiO3RoaXMuYWN0dWFsPW9wdGlvbnMuYWN0dWFsO3RoaXMuZXhwZWN0ZWQ9b3B0aW9ucy5leHBlY3RlZDt0aGlzLm9wZXJhdG9yPW9wdGlvbnMub3BlcmF0b3I7aWYob3B0aW9ucy5tZXNzYWdlKXt0aGlzLm1lc3NhZ2U9b3B0aW9ucy5tZXNzYWdlO3RoaXMuZ2VuZXJhdGVkTWVzc2FnZT1mYWxzZX1lbHNle3RoaXMubWVzc2FnZT1nZXRNZXNzYWdlKHRoaXMpO3RoaXMuZ2VuZXJhdGVkTWVzc2FnZT10cnVlfXZhciBzdGFja1N0YXJ0RnVuY3Rpb249b3B0aW9ucy5zdGFja1N0YXJ0RnVuY3Rpb258fGZhaWw7aWYoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2Upe0Vycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsc3RhY2tTdGFydEZ1bmN0aW9uKX1lbHNle3ZhciBlcnI9bmV3IEVycm9yO2lmKGVyci5zdGFjayl7dmFyIG91dD1lcnIuc3RhY2s7dmFyIGZuX25hbWU9Z2V0TmFtZShzdGFja1N0YXJ0RnVuY3Rpb24pO3ZhciBpZHg9b3V0LmluZGV4T2YoIlxuIitmbl9uYW1lKTtpZihpZHg+PTApe3ZhciBuZXh0X2xpbmU9b3V0LmluZGV4T2YoIlxuIixpZHgrMSk7b3V0PW91dC5zdWJzdHJpbmcobmV4dF9saW5lKzEpfXRoaXMuc3RhY2s9b3V0fX19O3V0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLEVycm9yKTtmdW5jdGlvbiB0cnVuY2F0ZShzLG4pe2lmKHR5cGVvZiBzPT09InN0cmluZyIpe3JldHVybiBzLmxlbmd0aDxuP3M6cy5zbGljZSgwLG4pfWVsc2V7cmV0dXJuIHN9fWZ1bmN0aW9uIGluc3BlY3Qoc29tZXRoaW5nKXtpZihmdW5jdGlvbnNIYXZlTmFtZXN8fCF1dGlsLmlzRnVuY3Rpb24oc29tZXRoaW5nKSl7cmV0dXJuIHV0aWwuaW5zcGVjdChzb21ldGhpbmcpfXZhciByYXduYW1lPWdldE5hbWUoc29tZXRoaW5nKTt2YXIgbmFtZT1yYXduYW1lPyI6ICIrcmF3bmFtZToiIjtyZXR1cm4iW0Z1bmN0aW9uIituYW1lKyJdIn1mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpe3JldHVybiB0cnVuY2F0ZShpbnNwZWN0KHNlbGYuYWN0dWFsKSwxMjgpKyIgIitzZWxmLm9wZXJhdG9yKyIgIit0cnVuY2F0ZShpbnNwZWN0KHNlbGYuZXhwZWN0ZWQpLDEyOCl9ZnVuY3Rpb24gZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSxvcGVyYXRvcixzdGFja1N0YXJ0RnVuY3Rpb24pe3Rocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe21lc3NhZ2U6bWVzc2FnZSxhY3R1YWw6YWN0dWFsLGV4cGVjdGVkOmV4cGVjdGVkLG9wZXJhdG9yOm9wZXJhdG9yLHN0YWNrU3RhcnRGdW5jdGlvbjpzdGFja1N0YXJ0RnVuY3Rpb259KX1hc3NlcnQuZmFpbD1mYWlsO2Z1bmN0aW9uIG9rKHZhbHVlLG1lc3NhZ2Upe2lmKCF2YWx1ZSlmYWlsKHZhbHVlLHRydWUsbWVzc2FnZSwiPT0iLGFzc2VydC5vayl9YXNzZXJ0Lm9rPW9rO2Fzc2VydC5lcXVhbD1mdW5jdGlvbiBlcXVhbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSl7aWYoYWN0dWFsIT1leHBlY3RlZClmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCI9PSIsYXNzZXJ0LmVxdWFsKX07YXNzZXJ0Lm5vdEVxdWFsPWZ1bmN0aW9uIG5vdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWw9PWV4cGVjdGVkKXtmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCIhPSIsYXNzZXJ0Lm5vdEVxdWFsKX19O2Fzc2VydC5kZWVwRXF1YWw9ZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZighX2RlZXBFcXVhbChhY3R1YWwsZXhwZWN0ZWQsZmFsc2UpKXtmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCJkZWVwRXF1YWwiLGFzc2VydC5kZWVwRXF1YWwpfX07YXNzZXJ0LmRlZXBTdHJpY3RFcXVhbD1mdW5jdGlvbiBkZWVwU3RyaWN0RXF1YWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2Upe2lmKCFfZGVlcEVxdWFsKGFjdHVhbCxleHBlY3RlZCx0cnVlKSl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiZGVlcFN0cmljdEVxdWFsIixhc3NlcnQuZGVlcFN0cmljdEVxdWFsKX19O2Z1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLHN0cmljdCxtZW1vcyl7aWYoYWN0dWFsPT09ZXhwZWN0ZWQpe3JldHVybiB0cnVlfWVsc2UgaWYoaXNCdWZmZXIoYWN0dWFsKSYmaXNCdWZmZXIoZXhwZWN0ZWQpKXtyZXR1cm4gY29tcGFyZShhY3R1YWwsZXhwZWN0ZWQpPT09MH1lbHNlIGlmKHV0aWwuaXNEYXRlKGFjdHVhbCkmJnV0aWwuaXNEYXRlKGV4cGVjdGVkKSl7cmV0dXJuIGFjdHVhbC5nZXRUaW1lKCk9PT1leHBlY3RlZC5nZXRUaW1lKCl9ZWxzZSBpZih1dGlsLmlzUmVnRXhwKGFjdHVhbCkmJnV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKXtyZXR1cm4gYWN0dWFsLnNvdXJjZT09PWV4cGVjdGVkLnNvdXJjZSYmYWN0dWFsLmdsb2JhbD09PWV4cGVjdGVkLmdsb2JhbCYmYWN0dWFsLm11bHRpbGluZT09PWV4cGVjdGVkLm11bHRpbGluZSYmYWN0dWFsLmxhc3RJbmRleD09PWV4cGVjdGVkLmxhc3RJbmRleCYmYWN0dWFsLmlnbm9yZUNhc2U9PT1leHBlY3RlZC5pZ25vcmVDYXNlfWVsc2UgaWYoKGFjdHVhbD09PW51bGx8fHR5cGVvZiBhY3R1YWwhPT0ib2JqZWN0IikmJihleHBlY3RlZD09PW51bGx8fHR5cGVvZiBleHBlY3RlZCE9PSJvYmplY3QiKSl7cmV0dXJuIHN0cmljdD9hY3R1YWw9PT1leHBlY3RlZDphY3R1YWw9PWV4cGVjdGVkfWVsc2UgaWYoaXNWaWV3KGFjdHVhbCkmJmlzVmlldyhleHBlY3RlZCkmJnBUb1N0cmluZyhhY3R1YWwpPT09cFRvU3RyaW5nKGV4cGVjdGVkKSYmIShhY3R1YWwgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXl8fGFjdHVhbCBpbnN0YW5jZW9mIEZsb2F0NjRBcnJheSkpe3JldHVybiBjb21wYXJlKG5ldyBVaW50OEFycmF5KGFjdHVhbC5idWZmZXIpLG5ldyBVaW50OEFycmF5KGV4cGVjdGVkLmJ1ZmZlcikpPT09MH1lbHNlIGlmKGlzQnVmZmVyKGFjdHVhbCkhPT1pc0J1ZmZlcihleHBlY3RlZCkpe3JldHVybiBmYWxzZX1lbHNle21lbW9zPW1lbW9zfHx7YWN0dWFsOltdLGV4cGVjdGVkOltdfTt2YXIgYWN0dWFsSW5kZXg9bWVtb3MuYWN0dWFsLmluZGV4T2YoYWN0dWFsKTtpZihhY3R1YWxJbmRleCE9PS0xKXtpZihhY3R1YWxJbmRleD09PW1lbW9zLmV4cGVjdGVkLmluZGV4T2YoZXhwZWN0ZWQpKXtyZXR1cm4gdHJ1ZX19bWVtb3MuYWN0dWFsLnB1c2goYWN0dWFsKTttZW1vcy5leHBlY3RlZC5wdXNoKGV4cGVjdGVkKTtyZXR1cm4gb2JqRXF1aXYoYWN0dWFsLGV4cGVjdGVkLHN0cmljdCxtZW1vcyl9fWZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpPT0iW29iamVjdCBBcmd1bWVudHNdIn1mdW5jdGlvbiBvYmpFcXVpdihhLGIsc3RyaWN0LGFjdHVhbFZpc2l0ZWRPYmplY3RzKXtpZihhPT09bnVsbHx8YT09PXVuZGVmaW5lZHx8Yj09PW51bGx8fGI9PT11bmRlZmluZWQpcmV0dXJuIGZhbHNlO2lmKHV0aWwuaXNQcmltaXRpdmUoYSl8fHV0aWwuaXNQcmltaXRpdmUoYikpcmV0dXJuIGE9PT1iO2lmKHN0cmljdCYmT2JqZWN0LmdldFByb3RvdHlwZU9mKGEpIT09T2JqZWN0LmdldFByb3RvdHlwZU9mKGIpKXJldHVybiBmYWxzZTt2YXIgYUlzQXJncz1pc0FyZ3VtZW50cyhhKTt2YXIgYklzQXJncz1pc0FyZ3VtZW50cyhiKTtpZihhSXNBcmdzJiYhYklzQXJnc3x8IWFJc0FyZ3MmJmJJc0FyZ3MpcmV0dXJuIGZhbHNlO2lmKGFJc0FyZ3Mpe2E9cFNsaWNlLmNhbGwoYSk7Yj1wU2xpY2UuY2FsbChiKTtyZXR1cm4gX2RlZXBFcXVhbChhLGIsc3RyaWN0KX12YXIga2E9b2JqZWN0S2V5cyhhKTt2YXIga2I9b2JqZWN0S2V5cyhiKTt2YXIga2V5LGk7aWYoa2EubGVuZ3RoIT09a2IubGVuZ3RoKXJldHVybiBmYWxzZTtrYS5zb3J0KCk7a2Iuc29ydCgpO2ZvcihpPWthLmxlbmd0aC0xO2k+PTA7aS0tKXtpZihrYVtpXSE9PWtiW2ldKXJldHVybiBmYWxzZX1mb3IoaT1rYS5sZW5ndGgtMTtpPj0wO2ktLSl7a2V5PWthW2ldO2lmKCFfZGVlcEVxdWFsKGFba2V5XSxiW2tleV0sc3RyaWN0LGFjdHVhbFZpc2l0ZWRPYmplY3RzKSlyZXR1cm4gZmFsc2V9cmV0dXJuIHRydWV9YXNzZXJ0Lm5vdERlZXBFcXVhbD1mdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2Upe2lmKF9kZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLGZhbHNlKSl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwibm90RGVlcEVxdWFsIixhc3NlcnQubm90RGVlcEVxdWFsKX19O2Fzc2VydC5ub3REZWVwU3RyaWN0RXF1YWw9bm90RGVlcFN0cmljdEVxdWFsO2Z1bmN0aW9uIG5vdERlZXBTdHJpY3RFcXVhbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSl7aWYoX2RlZXBFcXVhbChhY3R1YWwsZXhwZWN0ZWQsdHJ1ZSkpe2ZhaWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2UsIm5vdERlZXBTdHJpY3RFcXVhbCIsbm90RGVlcFN0cmljdEVxdWFsKX19YXNzZXJ0LnN0cmljdEVxdWFsPWZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWwhPT1leHBlY3RlZCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiPT09Iixhc3NlcnQuc3RyaWN0RXF1YWwpfX07YXNzZXJ0Lm5vdFN0cmljdEVxdWFsPWZ1bmN0aW9uIG5vdFN0cmljdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWw9PT1leHBlY3RlZCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiIT09Iixhc3NlcnQubm90U3RyaWN0RXF1YWwpfX07ZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLGV4cGVjdGVkKXtpZighYWN0dWFsfHwhZXhwZWN0ZWQpe3JldHVybiBmYWxzZX1pZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXhwZWN0ZWQpPT0iW29iamVjdCBSZWdFeHBdIil7cmV0dXJuIGV4cGVjdGVkLnRlc3QoYWN0dWFsKX10cnl7aWYoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpe3JldHVybiB0cnVlfX1jYXRjaChlKXt9aWYoRXJyb3IuaXNQcm90b3R5cGVPZihleHBlY3RlZCkpe3JldHVybiBmYWxzZX1yZXR1cm4gZXhwZWN0ZWQuY2FsbCh7fSxhY3R1YWwpPT09dHJ1ZX1mdW5jdGlvbiBfdHJ5QmxvY2soYmxvY2spe3ZhciBlcnJvcjt0cnl7YmxvY2soKX1jYXRjaChlKXtlcnJvcj1lfXJldHVybiBlcnJvcn1mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LGJsb2NrLGV4cGVjdGVkLG1lc3NhZ2Upe3ZhciBhY3R1YWw7aWYodHlwZW9mIGJsb2NrIT09ImZ1bmN0aW9uIil7dGhyb3cgbmV3IFR5cGVFcnJvcignImJsb2NrIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKX1pZih0eXBlb2YgZXhwZWN0ZWQ9PT0ic3RyaW5nIil7bWVzc2FnZT1leHBlY3RlZDtleHBlY3RlZD1udWxsfWFjdHVhbD1fdHJ5QmxvY2soYmxvY2spO21lc3NhZ2U9KGV4cGVjdGVkJiZleHBlY3RlZC5uYW1lPyIgKCIrZXhwZWN0ZWQubmFtZSsiKS4iOiIuIikrKG1lc3NhZ2U/IiAiK21lc3NhZ2U6Ii4iKTtpZihzaG91bGRUaHJvdyYmIWFjdHVhbCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsIk1pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uIittZXNzYWdlKX12YXIgdXNlclByb3ZpZGVkTWVzc2FnZT10eXBlb2YgbWVzc2FnZT09PSJzdHJpbmciO3ZhciBpc1Vud2FudGVkRXhjZXB0aW9uPSFzaG91bGRUaHJvdyYmdXRpbC5pc0Vycm9yKGFjdHVhbCk7dmFyIGlzVW5leHBlY3RlZEV4Y2VwdGlvbj0hc2hvdWxkVGhyb3cmJmFjdHVhbCYmIWV4cGVjdGVkO2lmKGlzVW53YW50ZWRFeGNlcHRpb24mJnVzZXJQcm92aWRlZE1lc3NhZ2UmJmV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCxleHBlY3RlZCl8fGlzVW5leHBlY3RlZEV4Y2VwdGlvbil7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsIkdvdCB1bndhbnRlZCBleGNlcHRpb24iK21lc3NhZ2UpfWlmKHNob3VsZFRocm93JiZhY3R1YWwmJmV4cGVjdGVkJiYhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLGV4cGVjdGVkKXx8IXNob3VsZFRocm93JiZhY3R1YWwpe3Rocm93IGFjdHVhbH19YXNzZXJ0LnRocm93cz1mdW5jdGlvbihibG9jayxlcnJvcixtZXNzYWdlKXtfdGhyb3dzKHRydWUsYmxvY2ssZXJyb3IsbWVzc2FnZSl9O2Fzc2VydC5kb2VzTm90VGhyb3c9ZnVuY3Rpb24oYmxvY2ssZXJyb3IsbWVzc2FnZSl7X3Rocm93cyhmYWxzZSxibG9jayxlcnJvcixtZXNzYWdlKX07YXNzZXJ0LmlmRXJyb3I9ZnVuY3Rpb24oZXJyKXtpZihlcnIpdGhyb3cgZXJyfTtmdW5jdGlvbiBzdHJpY3QodmFsdWUsbWVzc2FnZSl7aWYoIXZhbHVlKWZhaWwodmFsdWUsdHJ1ZSxtZXNzYWdlLCI9PSIsc3RyaWN0KX1hc3NlcnQuc3RyaWN0PW9iamVjdEFzc2lnbihzdHJpY3QsYXNzZXJ0LHtlcXVhbDphc3NlcnQuc3RyaWN0RXF1YWwsZGVlcEVxdWFsOmFzc2VydC5kZWVwU3RyaWN0RXF1YWwsbm90RXF1YWw6YXNzZXJ0Lm5vdFN0cmljdEVxdWFsLG5vdERlZXBFcXVhbDphc3NlcnQubm90RGVlcFN0cmljdEVxdWFsfSk7YXNzZXJ0LnN0cmljdC5zdHJpY3Q9YXNzZXJ0LnN0cmljdDt2YXIgb2JqZWN0S2V5cz1PYmplY3Qua2V5c3x8ZnVuY3Rpb24ob2JqKXt2YXIga2V5cz1bXTtmb3IodmFyIGtleSBpbiBvYmope2lmKGhhc093bi5jYWxsKG9iaixrZXkpKWtleXMucHVzaChrZXkpfXJldHVybiBrZXlzfX0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsIT09InVuZGVmaW5lZCI/Z2xvYmFsOnR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCI/c2VsZjp0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCI/d2luZG93Ont9KX0seyJvYmplY3QtYXNzaWduIjo1OSwidXRpbC8iOjIzfV0sMjE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2lmKHR5cGVvZiBPYmplY3QuY3JlYXRlPT09ImZ1bmN0aW9uIil7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24gaW5oZXJpdHMoY3RvcixzdXBlckN0b3Ipe2N0b3Iuc3VwZXJfPXN1cGVyQ3RvcjtjdG9yLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUse2NvbnN0cnVjdG9yOnt2YWx1ZTpjdG9yLGVudW1lcmFibGU6ZmFsc2Usd3JpdGFibGU6dHJ1ZSxjb25maWd1cmFibGU6dHJ1ZX19KX19ZWxzZXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpbmhlcml0cyhjdG9yLHN1cGVyQ3Rvcil7Y3Rvci5zdXBlcl89c3VwZXJDdG9yO3ZhciBUZW1wQ3Rvcj1mdW5jdGlvbigpe307VGVtcEN0b3IucHJvdG90eXBlPXN1cGVyQ3Rvci5wcm90b3R5cGU7Y3Rvci5wcm90b3R5cGU9bmV3IFRlbXBDdG9yO2N0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yPWN0b3J9fX0se31dLDIyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpc0J1ZmZlcihhcmcpe3JldHVybiBhcmcmJnR5cGVvZiBhcmc9PT0ib2JqZWN0IiYmdHlwZW9mIGFyZy5jb3B5PT09ImZ1bmN0aW9uIiYmdHlwZW9mIGFyZy5maWxsPT09ImZ1bmN0aW9uIiYmdHlwZW9mIGFyZy5yZWFkVUludDg9PT0iZnVuY3Rpb24ifX0se31dLDIzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2VzcyxnbG9iYWwpe3ZhciBmb3JtYXRSZWdFeHA9LyVbc2RqJV0vZztleHBvcnRzLmZvcm1hdD1mdW5jdGlvbihmKXtpZighaXNTdHJpbmcoZikpe3ZhciBvYmplY3RzPVtdO2Zvcih2YXIgaT0wO2k8YXJndW1lbnRzLmxlbmd0aDtpKyspe29iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpfXJldHVybiBvYmplY3RzLmpvaW4oIiAiKX12YXIgaT0xO3ZhciBhcmdzPWFyZ3VtZW50czt2YXIgbGVuPWFyZ3MubGVuZ3RoO3ZhciBzdHI9U3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLGZ1bmN0aW9uKHgpe2lmKHg9PT0iJSUiKXJldHVybiIlIjtpZihpPj1sZW4pcmV0dXJuIHg7c3dpdGNoKHgpe2Nhc2UiJXMiOnJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtjYXNlIiVkIjpyZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7Y2FzZSIlaiI6dHJ5e3JldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pfWNhdGNoKF8pe3JldHVybiJbQ2lyY3VsYXJdIn1kZWZhdWx0OnJldHVybiB4fX0pO2Zvcih2YXIgeD1hcmdzW2ldO2k8bGVuO3g9YXJnc1srK2ldKXtpZihpc051bGwoeCl8fCFpc09iamVjdCh4KSl7c3RyKz0iICIreH1lbHNle3N0cis9IiAiK2luc3BlY3QoeCl9fXJldHVybiBzdHJ9O2V4cG9ydHMuZGVwcmVjYXRlPWZ1bmN0aW9uKGZuLG1zZyl7aWYoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sbXNnKS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWlmKHByb2Nlc3Mubm9EZXByZWNhdGlvbj09PXRydWUpe3JldHVybiBmbn12YXIgd2FybmVkPWZhbHNlO2Z1bmN0aW9uIGRlcHJlY2F0ZWQoKXtpZighd2FybmVkKXtpZihwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pe3Rocm93IG5ldyBFcnJvcihtc2cpfWVsc2UgaWYocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKXtjb25zb2xlLnRyYWNlKG1zZyl9ZWxzZXtjb25zb2xlLmVycm9yKG1zZyl9d2FybmVkPXRydWV9cmV0dXJuIGZuLmFwcGx5KHRoaXMsYXJndW1lbnRzKX1yZXR1cm4gZGVwcmVjYXRlZH07dmFyIGRlYnVncz17fTt2YXIgZGVidWdFbnZpcm9uO2V4cG9ydHMuZGVidWdsb2c9ZnVuY3Rpb24oc2V0KXtpZihpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKWRlYnVnRW52aXJvbj1wcm9jZXNzLmVudi5OT0RFX0RFQlVHfHwiIjtzZXQ9c2V0LnRvVXBwZXJDYXNlKCk7aWYoIWRlYnVnc1tzZXRdKXtpZihuZXcgUmVnRXhwKCJcXGIiK3NldCsiXFxiIiwiaSIpLnRlc3QoZGVidWdFbnZpcm9uKSl7dmFyIHBpZD1wcm9jZXNzLnBpZDtkZWJ1Z3Nbc2V0XT1mdW5jdGlvbigpe3ZhciBtc2c9ZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpO2NvbnNvbGUuZXJyb3IoIiVzICVkOiAlcyIsc2V0LHBpZCxtc2cpfX1lbHNle2RlYnVnc1tzZXRdPWZ1bmN0aW9uKCl7fX19cmV0dXJuIGRlYnVnc1tzZXRdfTtmdW5jdGlvbiBpbnNwZWN0KG9iaixvcHRzKXt2YXIgY3R4PXtzZWVuOltdLHN0eWxpemU6c3R5bGl6ZU5vQ29sb3J9O2lmKGFyZ3VtZW50cy5sZW5ndGg+PTMpY3R4LmRlcHRoPWFyZ3VtZW50c1syXTtpZihhcmd1bWVudHMubGVuZ3RoPj00KWN0eC5jb2xvcnM9YXJndW1lbnRzWzNdO2lmKGlzQm9vbGVhbihvcHRzKSl7Y3R4LnNob3dIaWRkZW49b3B0c31lbHNlIGlmKG9wdHMpe2V4cG9ydHMuX2V4dGVuZChjdHgsb3B0cyl9aWYoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKWN0eC5zaG93SGlkZGVuPWZhbHNlO2lmKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpY3R4LmRlcHRoPTI7aWYoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpY3R4LmNvbG9ycz1mYWxzZTtpZihpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpY3R4LmN1c3RvbUluc3BlY3Q9dHJ1ZTtpZihjdHguY29sb3JzKWN0eC5zdHlsaXplPXN0eWxpemVXaXRoQ29sb3I7cmV0dXJuIGZvcm1hdFZhbHVlKGN0eCxvYmosY3R4LmRlcHRoKX1leHBvcnRzLmluc3BlY3Q9aW5zcGVjdDtpbnNwZWN0LmNvbG9ycz17Ym9sZDpbMSwyMl0saXRhbGljOlszLDIzXSx1bmRlcmxpbmU6WzQsMjRdLGludmVyc2U6WzcsMjddLHdoaXRlOlszNywzOV0sZ3JleTpbOTAsMzldLGJsYWNrOlszMCwzOV0sYmx1ZTpbMzQsMzldLGN5YW46WzM2LDM5XSxncmVlbjpbMzIsMzldLG1hZ2VudGE6WzM1LDM5XSxyZWQ6WzMxLDM5XSx5ZWxsb3c6WzMzLDM5XX07aW5zcGVjdC5zdHlsZXM9e3NwZWNpYWw6ImN5YW4iLG51bWJlcjoieWVsbG93Iixib29sZWFuOiJ5ZWxsb3ciLHVuZGVmaW5lZDoiZ3JleSIsbnVsbDoiYm9sZCIsc3RyaW5nOiJncmVlbiIsZGF0ZToibWFnZW50YSIscmVnZXhwOiJyZWQifTtmdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0cixzdHlsZVR5cGUpe3ZhciBzdHlsZT1pbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO2lmKHN0eWxlKXtyZXR1cm4iG1siK2luc3BlY3QuY29sb3JzW3N0eWxlXVswXSsibSIrc3RyKyIbWyIraW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdKyJtIn1lbHNle3JldHVybiBzdHJ9fWZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0cixzdHlsZVR5cGUpe3JldHVybiBzdHJ9ZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpe3ZhciBoYXNoPXt9O2FycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLGlkeCl7aGFzaFt2YWxdPXRydWV9KTtyZXR1cm4gaGFzaH1mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsdmFsdWUscmVjdXJzZVRpbWVzKXtpZihjdHguY3VzdG9tSW5zcGVjdCYmdmFsdWUmJmlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkmJnZhbHVlLmluc3BlY3QhPT1leHBvcnRzLmluc3BlY3QmJiEodmFsdWUuY29uc3RydWN0b3ImJnZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZT09PXZhbHVlKSl7dmFyIHJldD12YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcyxjdHgpO2lmKCFpc1N0cmluZyhyZXQpKXtyZXQ9Zm9ybWF0VmFsdWUoY3R4LHJldCxyZWN1cnNlVGltZXMpfXJldHVybiByZXR9dmFyIHByaW1pdGl2ZT1mb3JtYXRQcmltaXRpdmUoY3R4LHZhbHVlKTtpZihwcmltaXRpdmUpe3JldHVybiBwcmltaXRpdmV9dmFyIGtleXM9T2JqZWN0LmtleXModmFsdWUpO3ZhciB2aXNpYmxlS2V5cz1hcnJheVRvSGFzaChrZXlzKTtpZihjdHguc2hvd0hpZGRlbil7a2V5cz1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSl9aWYoaXNFcnJvcih2YWx1ZSkmJihrZXlzLmluZGV4T2YoIm1lc3NhZ2UiKT49MHx8a2V5cy5pbmRleE9mKCJkZXNjcmlwdGlvbiIpPj0wKSl7cmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKX1pZihrZXlzLmxlbmd0aD09PTApe2lmKGlzRnVuY3Rpb24odmFsdWUpKXt2YXIgbmFtZT12YWx1ZS5uYW1lPyI6ICIrdmFsdWUubmFtZToiIjtyZXR1cm4gY3R4LnN0eWxpemUoIltGdW5jdGlvbiIrbmFtZSsiXSIsInNwZWNpYWwiKX1pZihpc1JlZ0V4cCh2YWx1ZSkpe3JldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCJyZWdleHAiKX1pZihpc0RhdGUodmFsdWUpKXtyZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksImRhdGUiKX1pZihpc0Vycm9yKHZhbHVlKSl7cmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKX19dmFyIGJhc2U9IiIsYXJyYXk9ZmFsc2UsYnJhY2VzPVsieyIsIn0iXTtpZihpc0FycmF5KHZhbHVlKSl7YXJyYXk9dHJ1ZTticmFjZXM9WyJbIiwiXSJdfWlmKGlzRnVuY3Rpb24odmFsdWUpKXt2YXIgbj12YWx1ZS5uYW1lPyI6ICIrdmFsdWUubmFtZToiIjtiYXNlPSIgW0Z1bmN0aW9uIituKyJdIn1pZihpc1JlZ0V4cCh2YWx1ZSkpe2Jhc2U9IiAiK1JlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSl9aWYoaXNEYXRlKHZhbHVlKSl7YmFzZT0iICIrRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSl9aWYoaXNFcnJvcih2YWx1ZSkpe2Jhc2U9IiAiK2Zvcm1hdEVycm9yKHZhbHVlKX1pZihrZXlzLmxlbmd0aD09PTAmJighYXJyYXl8fHZhbHVlLmxlbmd0aD09MCkpe3JldHVybiBicmFjZXNbMF0rYmFzZSticmFjZXNbMV19aWYocmVjdXJzZVRpbWVzPDApe2lmKGlzUmVnRXhwKHZhbHVlKSl7cmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksInJlZ2V4cCIpfWVsc2V7cmV0dXJuIGN0eC5zdHlsaXplKCJbT2JqZWN0XSIsInNwZWNpYWwiKX19Y3R4LnNlZW4ucHVzaCh2YWx1ZSk7dmFyIG91dHB1dDtpZihhcnJheSl7b3V0cHV0PWZvcm1hdEFycmF5KGN0eCx2YWx1ZSxyZWN1cnNlVGltZXMsdmlzaWJsZUtleXMsa2V5cyl9ZWxzZXtvdXRwdXQ9a2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtyZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LHZhbHVlLHJlY3Vyc2VUaW1lcyx2aXNpYmxlS2V5cyxrZXksYXJyYXkpfSl9Y3R4LnNlZW4ucG9wKCk7cmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCxiYXNlLGJyYWNlcyl9ZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCx2YWx1ZSl7aWYoaXNVbmRlZmluZWQodmFsdWUpKXJldHVybiBjdHguc3R5bGl6ZSgidW5kZWZpbmVkIiwidW5kZWZpbmVkIik7aWYoaXNTdHJpbmcodmFsdWUpKXt2YXIgc2ltcGxlPSInIitKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXiJ8IiQvZywiIikucmVwbGFjZSgvJy9nLCJcXCciKS5yZXBsYWNlKC9cXCIvZywnIicpKyInIjtyZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCJzdHJpbmciKX1pZihpc051bWJlcih2YWx1ZSkpcmV0dXJuIGN0eC5zdHlsaXplKCIiK3ZhbHVlLCJudW1iZXIiKTtpZihpc0Jvb2xlYW4odmFsdWUpKXJldHVybiBjdHguc3R5bGl6ZSgiIit2YWx1ZSwiYm9vbGVhbiIpO2lmKGlzTnVsbCh2YWx1ZSkpcmV0dXJuIGN0eC5zdHlsaXplKCJudWxsIiwibnVsbCIpfWZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKXtyZXR1cm4iWyIrRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpKyJdIn1mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleXMpe3ZhciBvdXRwdXQ9W107Zm9yKHZhciBpPTAsbD12YWx1ZS5sZW5ndGg7aTxsOysraSl7aWYoaGFzT3duUHJvcGVydHkodmFsdWUsU3RyaW5nKGkpKSl7b3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LHZhbHVlLHJlY3Vyc2VUaW1lcyx2aXNpYmxlS2V5cyxTdHJpbmcoaSksdHJ1ZSkpfWVsc2V7b3V0cHV0LnB1c2goIiIpfX1rZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtpZigha2V5Lm1hdGNoKC9eXGQrJC8pKXtvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleSx0cnVlKSl9fSk7cmV0dXJuIG91dHB1dH1mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleSxhcnJheSl7dmFyIG5hbWUsc3RyLGRlc2M7ZGVzYz1PYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLGtleSl8fHt2YWx1ZTp2YWx1ZVtrZXldfTtpZihkZXNjLmdldCl7aWYoZGVzYy5zZXQpe3N0cj1jdHguc3R5bGl6ZSgiW0dldHRlci9TZXR0ZXJdIiwic3BlY2lhbCIpfWVsc2V7c3RyPWN0eC5zdHlsaXplKCJbR2V0dGVyXSIsInNwZWNpYWwiKX19ZWxzZXtpZihkZXNjLnNldCl7c3RyPWN0eC5zdHlsaXplKCJbU2V0dGVyXSIsInNwZWNpYWwiKX19aWYoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLGtleSkpe25hbWU9IlsiK2tleSsiXSJ9aWYoIXN0cil7aWYoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKTwwKXtpZihpc051bGwocmVjdXJzZVRpbWVzKSl7c3RyPWZvcm1hdFZhbHVlKGN0eCxkZXNjLnZhbHVlLG51bGwpfWVsc2V7c3RyPWZvcm1hdFZhbHVlKGN0eCxkZXNjLnZhbHVlLHJlY3Vyc2VUaW1lcy0xKX1pZihzdHIuaW5kZXhPZigiXG4iKT4tMSl7aWYoYXJyYXkpe3N0cj1zdHIuc3BsaXQoIlxuIikubWFwKGZ1bmN0aW9uKGxpbmUpe3JldHVybiIgICIrbGluZX0pLmpvaW4oIlxuIikuc3Vic3RyKDIpfWVsc2V7c3RyPSJcbiIrc3RyLnNwbGl0KCJcbiIpLm1hcChmdW5jdGlvbihsaW5lKXtyZXR1cm4iICAgIitsaW5lfSkuam9pbigiXG4iKX19fWVsc2V7c3RyPWN0eC5zdHlsaXplKCJbQ2lyY3VsYXJdIiwic3BlY2lhbCIpfX1pZihpc1VuZGVmaW5lZChuYW1lKSl7aWYoYXJyYXkmJmtleS5tYXRjaCgvXlxkKyQvKSl7cmV0dXJuIHN0cn1uYW1lPUpTT04uc3RyaW5naWZ5KCIiK2tleSk7aWYobmFtZS5tYXRjaCgvXiIoW2EtekEtWl9dW2EtekEtWl8wLTldKikiJC8pKXtuYW1lPW5hbWUuc3Vic3RyKDEsbmFtZS5sZW5ndGgtMik7bmFtZT1jdHguc3R5bGl6ZShuYW1lLCJuYW1lIil9ZWxzZXtuYW1lPW5hbWUucmVwbGFjZSgvJy9nLCJcXCciKS5yZXBsYWNlKC9cXCIvZywnIicpLnJlcGxhY2UoLyheInwiJCkvZywiJyIpO25hbWU9Y3R4LnN0eWxpemUobmFtZSwic3RyaW5nIil9fXJldHVybiBuYW1lKyI6ICIrc3RyfWZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCxiYXNlLGJyYWNlcyl7dmFyIG51bUxpbmVzRXN0PTA7dmFyIGxlbmd0aD1vdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsY3VyKXtudW1MaW5lc0VzdCsrO2lmKGN1ci5pbmRleE9mKCJcbiIpPj0wKW51bUxpbmVzRXN0Kys7cmV0dXJuIHByZXYrY3VyLnJlcGxhY2UoL1x1MDAxYlxbXGRcZD9tL2csIiIpLmxlbmd0aCsxfSwwKTtpZihsZW5ndGg+NjApe3JldHVybiBicmFjZXNbMF0rKGJhc2U9PT0iIj8iIjpiYXNlKyJcbiAiKSsiICIrb3V0cHV0LmpvaW4oIixcbiAgIikrIiAiK2JyYWNlc1sxXX1yZXR1cm4gYnJhY2VzWzBdK2Jhc2UrIiAiK291dHB1dC5qb2luKCIsICIpKyIgIiticmFjZXNbMV19ZnVuY3Rpb24gaXNBcnJheShhcil7cmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpfWV4cG9ydHMuaXNBcnJheT1pc0FycmF5O2Z1bmN0aW9uIGlzQm9vbGVhbihhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09ImJvb2xlYW4ifWV4cG9ydHMuaXNCb29sZWFuPWlzQm9vbGVhbjtmdW5jdGlvbiBpc051bGwoYXJnKXtyZXR1cm4gYXJnPT09bnVsbH1leHBvcnRzLmlzTnVsbD1pc051bGw7ZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKXtyZXR1cm4gYXJnPT1udWxsfWV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQ9aXNOdWxsT3JVbmRlZmluZWQ7ZnVuY3Rpb24gaXNOdW1iZXIoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJudW1iZXIifWV4cG9ydHMuaXNOdW1iZXI9aXNOdW1iZXI7ZnVuY3Rpb24gaXNTdHJpbmcoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJzdHJpbmcifWV4cG9ydHMuaXNTdHJpbmc9aXNTdHJpbmc7ZnVuY3Rpb24gaXNTeW1ib2woYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJzeW1ib2wifWV4cG9ydHMuaXNTeW1ib2w9aXNTeW1ib2w7ZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKXtyZXR1cm4gYXJnPT09dm9pZCAwfWV4cG9ydHMuaXNVbmRlZmluZWQ9aXNVbmRlZmluZWQ7ZnVuY3Rpb24gaXNSZWdFeHAocmUpe3JldHVybiBpc09iamVjdChyZSkmJm9iamVjdFRvU3RyaW5nKHJlKT09PSJbb2JqZWN0IFJlZ0V4cF0ifWV4cG9ydHMuaXNSZWdFeHA9aXNSZWdFeHA7ZnVuY3Rpb24gaXNPYmplY3QoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJvYmplY3QiJiZhcmchPT1udWxsfWV4cG9ydHMuaXNPYmplY3Q9aXNPYmplY3Q7ZnVuY3Rpb24gaXNEYXRlKGQpe3JldHVybiBpc09iamVjdChkKSYmb2JqZWN0VG9TdHJpbmcoZCk9PT0iW29iamVjdCBEYXRlXSJ9ZXhwb3J0cy5pc0RhdGU9aXNEYXRlO2Z1bmN0aW9uIGlzRXJyb3IoZSl7cmV0dXJuIGlzT2JqZWN0KGUpJiYob2JqZWN0VG9TdHJpbmcoZSk9PT0iW29iamVjdCBFcnJvcl0ifHxlIGluc3RhbmNlb2YgRXJyb3IpfWV4cG9ydHMuaXNFcnJvcj1pc0Vycm9yO2Z1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJmdW5jdGlvbiJ9ZXhwb3J0cy5pc0Z1bmN0aW9uPWlzRnVuY3Rpb247ZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKXtyZXR1cm4gYXJnPT09bnVsbHx8dHlwZW9mIGFyZz09PSJib29sZWFuInx8dHlwZW9mIGFyZz09PSJudW1iZXIifHx0eXBlb2YgYXJnPT09InN0cmluZyJ8fHR5cGVvZiBhcmc9PT0ic3ltYm9sInx8dHlwZW9mIGFyZz09PSJ1bmRlZmluZWQifWV4cG9ydHMuaXNQcmltaXRpdmU9aXNQcmltaXRpdmU7ZXhwb3J0cy5pc0J1ZmZlcj1yZXF1aXJlKCIuL3N1cHBvcnQvaXNCdWZmZXIiKTtmdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pfWZ1bmN0aW9uIHBhZChuKXtyZXR1cm4gbjwxMD8iMCIrbi50b1N0cmluZygxMCk6bi50b1N0cmluZygxMCl9dmFyIG1vbnRocz1bIkphbiIsIkZlYiIsIk1hciIsIkFwciIsIk1heSIsIkp1biIsIkp1bCIsIkF1ZyIsIlNlcCIsIk9jdCIsIk5vdiIsIkRlYyJdO2Z1bmN0aW9uIHRpbWVzdGFtcCgpe3ZhciBkPW5ldyBEYXRlO3ZhciB0aW1lPVtwYWQoZC5nZXRIb3VycygpKSxwYWQoZC5nZXRNaW51dGVzKCkpLHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oIjoiKTtyZXR1cm5bZC5nZXREYXRlKCksbW9udGhzW2QuZ2V0TW9udGgoKV0sdGltZV0uam9pbigiICIpfWV4cG9ydHMubG9nPWZ1bmN0aW9uKCl7Y29uc29sZS5sb2coIiVzIC0gJXMiLHRpbWVzdGFtcCgpLGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsYXJndW1lbnRzKSl9O2V4cG9ydHMuaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTtleHBvcnRzLl9leHRlbmQ9ZnVuY3Rpb24ob3JpZ2luLGFkZCl7aWYoIWFkZHx8IWlzT2JqZWN0KGFkZCkpcmV0dXJuIG9yaWdpbjt2YXIga2V5cz1PYmplY3Qua2V5cyhhZGQpO3ZhciBpPWtleXMubGVuZ3RoO3doaWxlKGktLSl7b3JpZ2luW2tleXNbaV1dPWFkZFtrZXlzW2ldXX1yZXR1cm4gb3JpZ2lufTtmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmoscHJvcCl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmoscHJvcCl9fSkuY2FsbCh0aGlzLHJlcXVpcmUoIl9wcm9jZXNzIiksdHlwZW9mIGdsb2JhbCE9PSJ1bmRlZmluZWQiP2dsb2JhbDp0eXBlb2Ygc2VsZiE9PSJ1bmRlZmluZWQiP3NlbGY6dHlwZW9mIHdpbmRvdyE9PSJ1bmRlZmluZWQiP3dpbmRvdzp7fSl9LHsiLi9zdXBwb3J0L2lzQnVmZmVyIjoyMixfcHJvY2Vzczo2Nixpbmhlcml0czoyMX1dLDI0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7ZXhwb3J0cy5ieXRlTGVuZ3RoPWJ5dGVMZW5ndGg7ZXhwb3J0cy50b0J5dGVBcnJheT10b0J5dGVBcnJheTtleHBvcnRzLmZyb21CeXRlQXJyYXk9ZnJvbUJ5dGVBcnJheTt2YXIgbG9va3VwPVtdO3ZhciByZXZMb29rdXA9W107dmFyIEFycj10eXBlb2YgVWludDhBcnJheSE9PSJ1bmRlZmluZWQiP1VpbnQ4QXJyYXk6QXJyYXk7dmFyIGNvZGU9IkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8iO2Zvcih2YXIgaT0wLGxlbj1jb2RlLmxlbmd0aDtpPGxlbjsrK2kpe2xvb2t1cFtpXT1jb2RlW2ldO3Jldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldPWl9cmV2TG9va3VwWyItIi5jaGFyQ29kZUF0KDApXT02MjtyZXZMb29rdXBbIl8iLmNoYXJDb2RlQXQoMCldPTYzO2Z1bmN0aW9uIGdldExlbnMoYjY0KXt2YXIgbGVuPWI2NC5sZW5ndGg7aWYobGVuJTQ+MCl7dGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Iil9dmFyIHZhbGlkTGVuPWI2NC5pbmRleE9mKCI9Iik7aWYodmFsaWRMZW49PT0tMSl2YWxpZExlbj1sZW47dmFyIHBsYWNlSG9sZGVyc0xlbj12YWxpZExlbj09PWxlbj8wOjQtdmFsaWRMZW4lNDtyZXR1cm5bdmFsaWRMZW4scGxhY2VIb2xkZXJzTGVuXX1mdW5jdGlvbiBieXRlTGVuZ3RoKGI2NCl7dmFyIGxlbnM9Z2V0TGVucyhiNjQpO3ZhciB2YWxpZExlbj1sZW5zWzBdO3ZhciBwbGFjZUhvbGRlcnNMZW49bGVuc1sxXTtyZXR1cm4odmFsaWRMZW4rcGxhY2VIb2xkZXJzTGVuKSozLzQtcGxhY2VIb2xkZXJzTGVufWZ1bmN0aW9uIF9ieXRlTGVuZ3RoKGI2NCx2YWxpZExlbixwbGFjZUhvbGRlcnNMZW4pe3JldHVybih2YWxpZExlbitwbGFjZUhvbGRlcnNMZW4pKjMvNC1wbGFjZUhvbGRlcnNMZW59ZnVuY3Rpb24gdG9CeXRlQXJyYXkoYjY0KXt2YXIgdG1wO3ZhciBsZW5zPWdldExlbnMoYjY0KTt2YXIgdmFsaWRMZW49bGVuc1swXTt2YXIgcGxhY2VIb2xkZXJzTGVuPWxlbnNbMV07dmFyIGFycj1uZXcgQXJyKF9ieXRlTGVuZ3RoKGI2NCx2YWxpZExlbixwbGFjZUhvbGRlcnNMZW4pKTt2YXIgY3VyQnl0ZT0wO3ZhciBsZW49cGxhY2VIb2xkZXJzTGVuPjA/dmFsaWRMZW4tNDp2YWxpZExlbjtmb3IodmFyIGk9MDtpPGxlbjtpKz00KXt0bXA9cmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXTw8MTh8cmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkrMSldPDwxMnxyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSsyKV08PDZ8cmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkrMyldO2FycltjdXJCeXRlKytdPXRtcD4+MTYmMjU1O2FycltjdXJCeXRlKytdPXRtcD4+OCYyNTU7YXJyW2N1ckJ5dGUrK109dG1wJjI1NX1pZihwbGFjZUhvbGRlcnNMZW49PT0yKXt0bXA9cmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXTw8MnxyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSsxKV0+PjQ7YXJyW2N1ckJ5dGUrK109dG1wJjI1NX1pZihwbGFjZUhvbGRlcnNMZW49PT0xKXt0bXA9cmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXTw8MTB8cmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkrMSldPDw0fHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKzIpXT4+MjthcnJbY3VyQnl0ZSsrXT10bXA+PjgmMjU1O2FycltjdXJCeXRlKytdPXRtcCYyNTV9cmV0dXJuIGFycn1mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQobnVtKXtyZXR1cm4gbG9va3VwW251bT4+MTgmNjNdK2xvb2t1cFtudW0+PjEyJjYzXStsb29rdXBbbnVtPj42JjYzXStsb29rdXBbbnVtJjYzXX1mdW5jdGlvbiBlbmNvZGVDaHVuayh1aW50OCxzdGFydCxlbmQpe3ZhciB0bXA7dmFyIG91dHB1dD1bXTtmb3IodmFyIGk9c3RhcnQ7aTxlbmQ7aSs9Myl7dG1wPSh1aW50OFtpXTw8MTYmMTY3MTE2ODApKyh1aW50OFtpKzFdPDw4JjY1MjgwKSsodWludDhbaSsyXSYyNTUpO291dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKX1yZXR1cm4gb3V0cHV0LmpvaW4oIiIpfWZ1bmN0aW9uIGZyb21CeXRlQXJyYXkodWludDgpe3ZhciB0bXA7dmFyIGxlbj11aW50OC5sZW5ndGg7dmFyIGV4dHJhQnl0ZXM9bGVuJTM7dmFyIHBhcnRzPVtdO3ZhciBtYXhDaHVua0xlbmd0aD0xNjM4Mztmb3IodmFyIGk9MCxsZW4yPWxlbi1leHRyYUJ5dGVzO2k8bGVuMjtpKz1tYXhDaHVua0xlbmd0aCl7cGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCxpLGkrbWF4Q2h1bmtMZW5ndGg+bGVuMj9sZW4yOmkrbWF4Q2h1bmtMZW5ndGgpKX1pZihleHRyYUJ5dGVzPT09MSl7dG1wPXVpbnQ4W2xlbi0xXTtwYXJ0cy5wdXNoKGxvb2t1cFt0bXA+PjJdK2xvb2t1cFt0bXA8PDQmNjNdKyI9PSIpfWVsc2UgaWYoZXh0cmFCeXRlcz09PTIpe3RtcD0odWludDhbbGVuLTJdPDw4KSt1aW50OFtsZW4tMV07cGFydHMucHVzaChsb29rdXBbdG1wPj4xMF0rbG9va3VwW3RtcD4+NCY2M10rbG9va3VwW3RtcDw8MiY2M10rIj0iKX1yZXR1cm4gcGFydHMuam9pbigiIil9fSx7fV0sMjU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBiaWdJbnQ9ZnVuY3Rpb24odW5kZWZpbmVkKXsidXNlIHN0cmljdCI7dmFyIEJBU0U9MWU3LExPR19CQVNFPTcsTUFYX0lOVD05MDA3MTk5MjU0NzQwOTkyLE1BWF9JTlRfQVJSPXNtYWxsVG9BcnJheShNQVhfSU5UKSxERUZBVUxUX0FMUEhBQkVUPSIwMTIzNDU2Nzg5YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoiO3ZhciBzdXBwb3J0c05hdGl2ZUJpZ0ludD10eXBlb2YgQmlnSW50PT09ImZ1bmN0aW9uIjtmdW5jdGlvbiBJbnRlZ2VyKHYscmFkaXgsYWxwaGFiZXQsY2FzZVNlbnNpdGl2ZSl7aWYodHlwZW9mIHY9PT0idW5kZWZpbmVkIilyZXR1cm4gSW50ZWdlclswXTtpZih0eXBlb2YgcmFkaXghPT0idW5kZWZpbmVkIilyZXR1cm4rcmFkaXg9PT0xMCYmIWFscGhhYmV0P3BhcnNlVmFsdWUodik6cGFyc2VCYXNlKHYscmFkaXgsYWxwaGFiZXQsY2FzZVNlbnNpdGl2ZSk7cmV0dXJuIHBhcnNlVmFsdWUodil9ZnVuY3Rpb24gQmlnSW50ZWdlcih2YWx1ZSxzaWduKXt0aGlzLnZhbHVlPXZhbHVlO3RoaXMuc2lnbj1zaWduO3RoaXMuaXNTbWFsbD1mYWxzZX1CaWdJbnRlZ2VyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKEludGVnZXIucHJvdG90eXBlKTtmdW5jdGlvbiBTbWFsbEludGVnZXIodmFsdWUpe3RoaXMudmFsdWU9dmFsdWU7dGhpcy5zaWduPXZhbHVlPDA7dGhpcy5pc1NtYWxsPXRydWV9U21hbGxJbnRlZ2VyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKEludGVnZXIucHJvdG90eXBlKTtmdW5jdGlvbiBOYXRpdmVCaWdJbnQodmFsdWUpe3RoaXMudmFsdWU9dmFsdWV9TmF0aXZlQmlnSW50LnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKEludGVnZXIucHJvdG90eXBlKTtmdW5jdGlvbiBpc1ByZWNpc2Uobil7cmV0dXJuLU1BWF9JTlQ8biYmbjxNQVhfSU5UfWZ1bmN0aW9uIHNtYWxsVG9BcnJheShuKXtpZihuPDFlNylyZXR1cm5bbl07aWYobjwxZTE0KXJldHVybltuJTFlNyxNYXRoLmZsb29yKG4vMWU3KV07cmV0dXJuW24lMWU3LE1hdGguZmxvb3Iobi8xZTcpJTFlNyxNYXRoLmZsb29yKG4vMWUxNCldfWZ1bmN0aW9uIGFycmF5VG9TbWFsbChhcnIpe3RyaW0oYXJyKTt2YXIgbGVuZ3RoPWFyci5sZW5ndGg7aWYobGVuZ3RoPDQmJmNvbXBhcmVBYnMoYXJyLE1BWF9JTlRfQVJSKTwwKXtzd2l0Y2gobGVuZ3RoKXtjYXNlIDA6cmV0dXJuIDA7Y2FzZSAxOnJldHVybiBhcnJbMF07Y2FzZSAyOnJldHVybiBhcnJbMF0rYXJyWzFdKkJBU0U7ZGVmYXVsdDpyZXR1cm4gYXJyWzBdKyhhcnJbMV0rYXJyWzJdKkJBU0UpKkJBU0V9fXJldHVybiBhcnJ9ZnVuY3Rpb24gdHJpbSh2KXt2YXIgaT12Lmxlbmd0aDt3aGlsZSh2Wy0taV09PT0wKTt2Lmxlbmd0aD1pKzF9ZnVuY3Rpb24gY3JlYXRlQXJyYXkobGVuZ3RoKXt2YXIgeD1uZXcgQXJyYXkobGVuZ3RoKTt2YXIgaT0tMTt3aGlsZSgrK2k8bGVuZ3RoKXt4W2ldPTB9cmV0dXJuIHh9ZnVuY3Rpb24gdHJ1bmNhdGUobil7aWYobj4wKXJldHVybiBNYXRoLmZsb29yKG4pO3JldHVybiBNYXRoLmNlaWwobil9ZnVuY3Rpb24gYWRkKGEsYil7dmFyIGxfYT1hLmxlbmd0aCxsX2I9Yi5sZW5ndGgscj1uZXcgQXJyYXkobF9hKSxjYXJyeT0wLGJhc2U9QkFTRSxzdW0saTtmb3IoaT0wO2k8bF9iO2krKyl7c3VtPWFbaV0rYltpXStjYXJyeTtjYXJyeT1zdW0+PWJhc2U/MTowO3JbaV09c3VtLWNhcnJ5KmJhc2V9d2hpbGUoaTxsX2Epe3N1bT1hW2ldK2NhcnJ5O2NhcnJ5PXN1bT09PWJhc2U/MTowO3JbaSsrXT1zdW0tY2FycnkqYmFzZX1pZihjYXJyeT4wKXIucHVzaChjYXJyeSk7cmV0dXJuIHJ9ZnVuY3Rpb24gYWRkQW55KGEsYil7aWYoYS5sZW5ndGg+PWIubGVuZ3RoKXJldHVybiBhZGQoYSxiKTtyZXR1cm4gYWRkKGIsYSl9ZnVuY3Rpb24gYWRkU21hbGwoYSxjYXJyeSl7dmFyIGw9YS5sZW5ndGgscj1uZXcgQXJyYXkobCksYmFzZT1CQVNFLHN1bSxpO2ZvcihpPTA7aTxsO2krKyl7c3VtPWFbaV0tYmFzZStjYXJyeTtjYXJyeT1NYXRoLmZsb29yKHN1bS9iYXNlKTtyW2ldPXN1bS1jYXJyeSpiYXNlO2NhcnJ5Kz0xfXdoaWxlKGNhcnJ5PjApe3JbaSsrXT1jYXJyeSViYXNlO2NhcnJ5PU1hdGguZmxvb3IoY2FycnkvYmFzZSl9cmV0dXJuIHJ9QmlnSW50ZWdlci5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodik7aWYodGhpcy5zaWduIT09bi5zaWduKXtyZXR1cm4gdGhpcy5zdWJ0cmFjdChuLm5lZ2F0ZSgpKX12YXIgYT10aGlzLnZhbHVlLGI9bi52YWx1ZTtpZihuLmlzU21hbGwpe3JldHVybiBuZXcgQmlnSW50ZWdlcihhZGRTbWFsbChhLE1hdGguYWJzKGIpKSx0aGlzLnNpZ24pfXJldHVybiBuZXcgQmlnSW50ZWdlcihhZGRBbnkoYSxiKSx0aGlzLnNpZ24pfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5wbHVzPUJpZ0ludGVnZXIucHJvdG90eXBlLmFkZDtTbWFsbEludGVnZXIucHJvdG90eXBlLmFkZD1mdW5jdGlvbih2KXt2YXIgbj1wYXJzZVZhbHVlKHYpO3ZhciBhPXRoaXMudmFsdWU7aWYoYTwwIT09bi5zaWduKXtyZXR1cm4gdGhpcy5zdWJ0cmFjdChuLm5lZ2F0ZSgpKX12YXIgYj1uLnZhbHVlO2lmKG4uaXNTbWFsbCl7aWYoaXNQcmVjaXNlKGErYikpcmV0dXJuIG5ldyBTbWFsbEludGVnZXIoYStiKTtiPXNtYWxsVG9BcnJheShNYXRoLmFicyhiKSl9cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZFNtYWxsKGIsTWF0aC5hYnMoYSkpLGE8MCl9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUucGx1cz1TbWFsbEludGVnZXIucHJvdG90eXBlLmFkZDtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmFkZD1mdW5jdGlvbih2KXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlK3BhcnNlVmFsdWUodikudmFsdWUpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnBsdXM9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5hZGQ7ZnVuY3Rpb24gc3VidHJhY3QoYSxiKXt2YXIgYV9sPWEubGVuZ3RoLGJfbD1iLmxlbmd0aCxyPW5ldyBBcnJheShhX2wpLGJvcnJvdz0wLGJhc2U9QkFTRSxpLGRpZmZlcmVuY2U7Zm9yKGk9MDtpPGJfbDtpKyspe2RpZmZlcmVuY2U9YVtpXS1ib3Jyb3ctYltpXTtpZihkaWZmZXJlbmNlPDApe2RpZmZlcmVuY2UrPWJhc2U7Ym9ycm93PTF9ZWxzZSBib3Jyb3c9MDtyW2ldPWRpZmZlcmVuY2V9Zm9yKGk9Yl9sO2k8YV9sO2krKyl7ZGlmZmVyZW5jZT1hW2ldLWJvcnJvdztpZihkaWZmZXJlbmNlPDApZGlmZmVyZW5jZSs9YmFzZTtlbHNle3JbaSsrXT1kaWZmZXJlbmNlO2JyZWFrfXJbaV09ZGlmZmVyZW5jZX1mb3IoO2k8YV9sO2krKyl7cltpXT1hW2ldfXRyaW0ocik7cmV0dXJuIHJ9ZnVuY3Rpb24gc3VidHJhY3RBbnkoYSxiLHNpZ24pe3ZhciB2YWx1ZTtpZihjb21wYXJlQWJzKGEsYik+PTApe3ZhbHVlPXN1YnRyYWN0KGEsYil9ZWxzZXt2YWx1ZT1zdWJ0cmFjdChiLGEpO3NpZ249IXNpZ259dmFsdWU9YXJyYXlUb1NtYWxsKHZhbHVlKTtpZih0eXBlb2YgdmFsdWU9PT0ibnVtYmVyIil7aWYoc2lnbil2YWx1ZT0tdmFsdWU7cmV0dXJuIG5ldyBTbWFsbEludGVnZXIodmFsdWUpfXJldHVybiBuZXcgQmlnSW50ZWdlcih2YWx1ZSxzaWduKX1mdW5jdGlvbiBzdWJ0cmFjdFNtYWxsKGEsYixzaWduKXt2YXIgbD1hLmxlbmd0aCxyPW5ldyBBcnJheShsKSxjYXJyeT0tYixiYXNlPUJBU0UsaSxkaWZmZXJlbmNlO2ZvcihpPTA7aTxsO2krKyl7ZGlmZmVyZW5jZT1hW2ldK2NhcnJ5O2NhcnJ5PU1hdGguZmxvb3IoZGlmZmVyZW5jZS9iYXNlKTtkaWZmZXJlbmNlJT1iYXNlO3JbaV09ZGlmZmVyZW5jZTwwP2RpZmZlcmVuY2UrYmFzZTpkaWZmZXJlbmNlfXI9YXJyYXlUb1NtYWxsKHIpO2lmKHR5cGVvZiByPT09Im51bWJlciIpe2lmKHNpZ24pcj0tcjtyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcihyKX1yZXR1cm4gbmV3IEJpZ0ludGVnZXIocixzaWduKX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5zdWJ0cmFjdD1mdW5jdGlvbih2KXt2YXIgbj1wYXJzZVZhbHVlKHYpO2lmKHRoaXMuc2lnbiE9PW4uc2lnbil7cmV0dXJuIHRoaXMuYWRkKG4ubmVnYXRlKCkpfXZhciBhPXRoaXMudmFsdWUsYj1uLnZhbHVlO2lmKG4uaXNTbWFsbClyZXR1cm4gc3VidHJhY3RTbWFsbChhLE1hdGguYWJzKGIpLHRoaXMuc2lnbik7cmV0dXJuIHN1YnRyYWN0QW55KGEsYix0aGlzLnNpZ24pfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5taW51cz1CaWdJbnRlZ2VyLnByb3RvdHlwZS5zdWJ0cmFjdDtTbWFsbEludGVnZXIucHJvdG90eXBlLnN1YnRyYWN0PWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodik7dmFyIGE9dGhpcy52YWx1ZTtpZihhPDAhPT1uLnNpZ24pe3JldHVybiB0aGlzLmFkZChuLm5lZ2F0ZSgpKX12YXIgYj1uLnZhbHVlO2lmKG4uaXNTbWFsbCl7cmV0dXJuIG5ldyBTbWFsbEludGVnZXIoYS1iKX1yZXR1cm4gc3VidHJhY3RTbWFsbChiLE1hdGguYWJzKGEpLGE+PTApfTtTbWFsbEludGVnZXIucHJvdG90eXBlLm1pbnVzPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuc3VidHJhY3Q7TmF0aXZlQmlnSW50LnByb3RvdHlwZS5zdWJ0cmFjdD1mdW5jdGlvbih2KXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlLXBhcnNlVmFsdWUodikudmFsdWUpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm1pbnVzPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUuc3VidHJhY3Q7QmlnSW50ZWdlci5wcm90b3R5cGUubmVnYXRlPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHRoaXMudmFsdWUsIXRoaXMuc2lnbil9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUubmVnYXRlPWZ1bmN0aW9uKCl7dmFyIHNpZ249dGhpcy5zaWduO3ZhciBzbWFsbD1uZXcgU21hbGxJbnRlZ2VyKC10aGlzLnZhbHVlKTtzbWFsbC5zaWduPSFzaWduO3JldHVybiBzbWFsbH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5uZWdhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCgtdGhpcy52YWx1ZSl9O0JpZ0ludGVnZXIucHJvdG90eXBlLmFicz1mdW5jdGlvbigpe3JldHVybiBuZXcgQmlnSW50ZWdlcih0aGlzLnZhbHVlLGZhbHNlKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5hYnM9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcihNYXRoLmFicyh0aGlzLnZhbHVlKSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuYWJzPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBOYXRpdmVCaWdJbnQodGhpcy52YWx1ZT49MD90aGlzLnZhbHVlOi10aGlzLnZhbHVlKX07ZnVuY3Rpb24gbXVsdGlwbHlMb25nKGEsYil7dmFyIGFfbD1hLmxlbmd0aCxiX2w9Yi5sZW5ndGgsbD1hX2wrYl9sLHI9Y3JlYXRlQXJyYXkobCksYmFzZT1CQVNFLHByb2R1Y3QsY2FycnksaSxhX2ksYl9qO2ZvcihpPTA7aTxhX2w7KytpKXthX2k9YVtpXTtmb3IodmFyIGo9MDtqPGJfbDsrK2ope2Jfaj1iW2pdO3Byb2R1Y3Q9YV9pKmJfaityW2kral07Y2Fycnk9TWF0aC5mbG9vcihwcm9kdWN0L2Jhc2UpO3JbaStqXT1wcm9kdWN0LWNhcnJ5KmJhc2U7cltpK2orMV0rPWNhcnJ5fX10cmltKHIpO3JldHVybiByfWZ1bmN0aW9uIG11bHRpcGx5U21hbGwoYSxiKXt2YXIgbD1hLmxlbmd0aCxyPW5ldyBBcnJheShsKSxiYXNlPUJBU0UsY2Fycnk9MCxwcm9kdWN0LGk7Zm9yKGk9MDtpPGw7aSsrKXtwcm9kdWN0PWFbaV0qYitjYXJyeTtjYXJyeT1NYXRoLmZsb29yKHByb2R1Y3QvYmFzZSk7cltpXT1wcm9kdWN0LWNhcnJ5KmJhc2V9d2hpbGUoY2Fycnk+MCl7cltpKytdPWNhcnJ5JWJhc2U7Y2Fycnk9TWF0aC5mbG9vcihjYXJyeS9iYXNlKX1yZXR1cm4gcn1mdW5jdGlvbiBzaGlmdExlZnQoeCxuKXt2YXIgcj1bXTt3aGlsZShuLS0gPjApci5wdXNoKDApO3JldHVybiByLmNvbmNhdCh4KX1mdW5jdGlvbiBtdWx0aXBseUthcmF0c3ViYSh4LHkpe3ZhciBuPU1hdGgubWF4KHgubGVuZ3RoLHkubGVuZ3RoKTtpZihuPD0zMClyZXR1cm4gbXVsdGlwbHlMb25nKHgseSk7bj1NYXRoLmNlaWwobi8yKTt2YXIgYj14LnNsaWNlKG4pLGE9eC5zbGljZSgwLG4pLGQ9eS5zbGljZShuKSxjPXkuc2xpY2UoMCxuKTt2YXIgYWM9bXVsdGlwbHlLYXJhdHN1YmEoYSxjKSxiZD1tdWx0aXBseUthcmF0c3ViYShiLGQpLGFiY2Q9bXVsdGlwbHlLYXJhdHN1YmEoYWRkQW55KGEsYiksYWRkQW55KGMsZCkpO3ZhciBwcm9kdWN0PWFkZEFueShhZGRBbnkoYWMsc2hpZnRMZWZ0KHN1YnRyYWN0KHN1YnRyYWN0KGFiY2QsYWMpLGJkKSxuKSksc2hpZnRMZWZ0KGJkLDIqbikpO3RyaW0ocHJvZHVjdCk7cmV0dXJuIHByb2R1Y3R9ZnVuY3Rpb24gdXNlS2FyYXRzdWJhKGwxLGwyKXtyZXR1cm4tLjAxMipsMS0uMDEyKmwyKzE1ZS02KmwxKmwyPjB9QmlnSW50ZWdlci5wcm90b3R5cGUubXVsdGlwbHk9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KSxhPXRoaXMudmFsdWUsYj1uLnZhbHVlLHNpZ249dGhpcy5zaWduIT09bi5zaWduLGFicztpZihuLmlzU21hbGwpe2lmKGI9PT0wKXJldHVybiBJbnRlZ2VyWzBdO2lmKGI9PT0xKXJldHVybiB0aGlzO2lmKGI9PT0tMSlyZXR1cm4gdGhpcy5uZWdhdGUoKTthYnM9TWF0aC5hYnMoYik7aWYoYWJzPEJBU0Upe3JldHVybiBuZXcgQmlnSW50ZWdlcihtdWx0aXBseVNtYWxsKGEsYWJzKSxzaWduKX1iPXNtYWxsVG9BcnJheShhYnMpfWlmKHVzZUthcmF0c3ViYShhLmxlbmd0aCxiLmxlbmd0aCkpcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKG11bHRpcGx5S2FyYXRzdWJhKGEsYiksc2lnbik7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKG11bHRpcGx5TG9uZyhhLGIpLHNpZ24pfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS50aW1lcz1CaWdJbnRlZ2VyLnByb3RvdHlwZS5tdWx0aXBseTtmdW5jdGlvbiBtdWx0aXBseVNtYWxsQW5kQXJyYXkoYSxiLHNpZ24pe2lmKGE8QkFTRSl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKG11bHRpcGx5U21hbGwoYixhKSxzaWduKX1yZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlMb25nKGIsc21hbGxUb0FycmF5KGEpKSxzaWduKX1TbWFsbEludGVnZXIucHJvdG90eXBlLl9tdWx0aXBseUJ5U21hbGw9ZnVuY3Rpb24oYSl7aWYoaXNQcmVjaXNlKGEudmFsdWUqdGhpcy52YWx1ZSkpe3JldHVybiBuZXcgU21hbGxJbnRlZ2VyKGEudmFsdWUqdGhpcy52YWx1ZSl9cmV0dXJuIG11bHRpcGx5U21hbGxBbmRBcnJheShNYXRoLmFicyhhLnZhbHVlKSxzbWFsbFRvQXJyYXkoTWF0aC5hYnModGhpcy52YWx1ZSkpLHRoaXMuc2lnbiE9PWEuc2lnbil9O0JpZ0ludGVnZXIucHJvdG90eXBlLl9tdWx0aXBseUJ5U21hbGw9ZnVuY3Rpb24oYSl7aWYoYS52YWx1ZT09PTApcmV0dXJuIEludGVnZXJbMF07aWYoYS52YWx1ZT09PTEpcmV0dXJuIHRoaXM7aWYoYS52YWx1ZT09PS0xKXJldHVybiB0aGlzLm5lZ2F0ZSgpO3JldHVybiBtdWx0aXBseVNtYWxsQW5kQXJyYXkoTWF0aC5hYnMoYS52YWx1ZSksdGhpcy52YWx1ZSx0aGlzLnNpZ24hPT1hLnNpZ24pfTtTbWFsbEludGVnZXIucHJvdG90eXBlLm11bHRpcGx5PWZ1bmN0aW9uKHYpe3JldHVybiBwYXJzZVZhbHVlKHYpLl9tdWx0aXBseUJ5U21hbGwodGhpcyl9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUudGltZXM9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5tdWx0aXBseTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm11bHRpcGx5PWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUqcGFyc2VWYWx1ZSh2KS52YWx1ZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUudGltZXM9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5tdWx0aXBseTtmdW5jdGlvbiBzcXVhcmUoYSl7dmFyIGw9YS5sZW5ndGgscj1jcmVhdGVBcnJheShsK2wpLGJhc2U9QkFTRSxwcm9kdWN0LGNhcnJ5LGksYV9pLGFfajtmb3IoaT0wO2k8bDtpKyspe2FfaT1hW2ldO2NhcnJ5PTAtYV9pKmFfaTtmb3IodmFyIGo9aTtqPGw7aisrKXthX2o9YVtqXTtwcm9kdWN0PTIqKGFfaSphX2opK3JbaStqXStjYXJyeTtjYXJyeT1NYXRoLmZsb29yKHByb2R1Y3QvYmFzZSk7cltpK2pdPXByb2R1Y3QtY2FycnkqYmFzZX1yW2krbF09Y2Fycnl9dHJpbShyKTtyZXR1cm4gcn1CaWdJbnRlZ2VyLnByb3RvdHlwZS5zcXVhcmU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IEJpZ0ludGVnZXIoc3F1YXJlKHRoaXMudmFsdWUpLGZhbHNlKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5zcXVhcmU9ZnVuY3Rpb24oKXt2YXIgdmFsdWU9dGhpcy52YWx1ZSp0aGlzLnZhbHVlO2lmKGlzUHJlY2lzZSh2YWx1ZSkpcmV0dXJuIG5ldyBTbWFsbEludGVnZXIodmFsdWUpO3JldHVybiBuZXcgQmlnSW50ZWdlcihzcXVhcmUoc21hbGxUb0FycmF5KE1hdGguYWJzKHRoaXMudmFsdWUpKSksZmFsc2UpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnNxdWFyZT1mdW5jdGlvbih2KXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlKnRoaXMudmFsdWUpfTtmdW5jdGlvbiBkaXZNb2QxKGEsYil7dmFyIGFfbD1hLmxlbmd0aCxiX2w9Yi5sZW5ndGgsYmFzZT1CQVNFLHJlc3VsdD1jcmVhdGVBcnJheShiLmxlbmd0aCksZGl2aXNvck1vc3RTaWduaWZpY2FudERpZ2l0PWJbYl9sLTFdLGxhbWJkYT1NYXRoLmNlaWwoYmFzZS8oMipkaXZpc29yTW9zdFNpZ25pZmljYW50RGlnaXQpKSxyZW1haW5kZXI9bXVsdGlwbHlTbWFsbChhLGxhbWJkYSksZGl2aXNvcj1tdWx0aXBseVNtYWxsKGIsbGFtYmRhKSxxdW90aWVudERpZ2l0LHNoaWZ0LGNhcnJ5LGJvcnJvdyxpLGwscTtpZihyZW1haW5kZXIubGVuZ3RoPD1hX2wpcmVtYWluZGVyLnB1c2goMCk7ZGl2aXNvci5wdXNoKDApO2Rpdmlzb3JNb3N0U2lnbmlmaWNhbnREaWdpdD1kaXZpc29yW2JfbC0xXTtmb3Ioc2hpZnQ9YV9sLWJfbDtzaGlmdD49MDtzaGlmdC0tKXtxdW90aWVudERpZ2l0PWJhc2UtMTtpZihyZW1haW5kZXJbc2hpZnQrYl9sXSE9PWRpdmlzb3JNb3N0U2lnbmlmaWNhbnREaWdpdCl7cXVvdGllbnREaWdpdD1NYXRoLmZsb29yKChyZW1haW5kZXJbc2hpZnQrYl9sXSpiYXNlK3JlbWFpbmRlcltzaGlmdCtiX2wtMV0pL2Rpdmlzb3JNb3N0U2lnbmlmaWNhbnREaWdpdCl9Y2Fycnk9MDtib3Jyb3c9MDtsPWRpdmlzb3IubGVuZ3RoO2ZvcihpPTA7aTxsO2krKyl7Y2FycnkrPXF1b3RpZW50RGlnaXQqZGl2aXNvcltpXTtxPU1hdGguZmxvb3IoY2FycnkvYmFzZSk7Ym9ycm93Kz1yZW1haW5kZXJbc2hpZnQraV0tKGNhcnJ5LXEqYmFzZSk7Y2Fycnk9cTtpZihib3Jyb3c8MCl7cmVtYWluZGVyW3NoaWZ0K2ldPWJvcnJvdytiYXNlO2JvcnJvdz0tMX1lbHNle3JlbWFpbmRlcltzaGlmdCtpXT1ib3Jyb3c7Ym9ycm93PTB9fXdoaWxlKGJvcnJvdyE9PTApe3F1b3RpZW50RGlnaXQtPTE7Y2Fycnk9MDtmb3IoaT0wO2k8bDtpKyspe2NhcnJ5Kz1yZW1haW5kZXJbc2hpZnQraV0tYmFzZStkaXZpc29yW2ldO2lmKGNhcnJ5PDApe3JlbWFpbmRlcltzaGlmdCtpXT1jYXJyeStiYXNlO2NhcnJ5PTB9ZWxzZXtyZW1haW5kZXJbc2hpZnQraV09Y2Fycnk7Y2Fycnk9MX19Ym9ycm93Kz1jYXJyeX1yZXN1bHRbc2hpZnRdPXF1b3RpZW50RGlnaXR9cmVtYWluZGVyPWRpdk1vZFNtYWxsKHJlbWFpbmRlcixsYW1iZGEpWzBdO3JldHVyblthcnJheVRvU21hbGwocmVzdWx0KSxhcnJheVRvU21hbGwocmVtYWluZGVyKV19ZnVuY3Rpb24gZGl2TW9kMihhLGIpe3ZhciBhX2w9YS5sZW5ndGgsYl9sPWIubGVuZ3RoLHJlc3VsdD1bXSxwYXJ0PVtdLGJhc2U9QkFTRSxndWVzcyx4bGVuLGhpZ2h4LGhpZ2h5LGNoZWNrO3doaWxlKGFfbCl7cGFydC51bnNoaWZ0KGFbLS1hX2xdKTt0cmltKHBhcnQpO2lmKGNvbXBhcmVBYnMocGFydCxiKTwwKXtyZXN1bHQucHVzaCgwKTtjb250aW51ZX14bGVuPXBhcnQubGVuZ3RoO2hpZ2h4PXBhcnRbeGxlbi0xXSpiYXNlK3BhcnRbeGxlbi0yXTtoaWdoeT1iW2JfbC0xXSpiYXNlK2JbYl9sLTJdO2lmKHhsZW4+Yl9sKXtoaWdoeD0oaGlnaHgrMSkqYmFzZX1ndWVzcz1NYXRoLmNlaWwoaGlnaHgvaGlnaHkpO2Rve2NoZWNrPW11bHRpcGx5U21hbGwoYixndWVzcyk7aWYoY29tcGFyZUFicyhjaGVjayxwYXJ0KTw9MClicmVhaztndWVzcy0tfXdoaWxlKGd1ZXNzKTtyZXN1bHQucHVzaChndWVzcyk7cGFydD1zdWJ0cmFjdChwYXJ0LGNoZWNrKX1yZXN1bHQucmV2ZXJzZSgpO3JldHVyblthcnJheVRvU21hbGwocmVzdWx0KSxhcnJheVRvU21hbGwocGFydCldfWZ1bmN0aW9uIGRpdk1vZFNtYWxsKHZhbHVlLGxhbWJkYSl7dmFyIGxlbmd0aD12YWx1ZS5sZW5ndGgscXVvdGllbnQ9Y3JlYXRlQXJyYXkobGVuZ3RoKSxiYXNlPUJBU0UsaSxxLHJlbWFpbmRlcixkaXZpc29yO3JlbWFpbmRlcj0wO2ZvcihpPWxlbmd0aC0xO2k+PTA7LS1pKXtkaXZpc29yPXJlbWFpbmRlcipiYXNlK3ZhbHVlW2ldO3E9dHJ1bmNhdGUoZGl2aXNvci9sYW1iZGEpO3JlbWFpbmRlcj1kaXZpc29yLXEqbGFtYmRhO3F1b3RpZW50W2ldPXF8MH1yZXR1cm5bcXVvdGllbnQscmVtYWluZGVyfDBdfWZ1bmN0aW9uIGRpdk1vZEFueShzZWxmLHYpe3ZhciB2YWx1ZSxuPXBhcnNlVmFsdWUodik7aWYoc3VwcG9ydHNOYXRpdmVCaWdJbnQpe3JldHVybltuZXcgTmF0aXZlQmlnSW50KHNlbGYudmFsdWUvbi52YWx1ZSksbmV3IE5hdGl2ZUJpZ0ludChzZWxmLnZhbHVlJW4udmFsdWUpXX12YXIgYT1zZWxmLnZhbHVlLGI9bi52YWx1ZTt2YXIgcXVvdGllbnQ7aWYoYj09PTApdGhyb3cgbmV3IEVycm9yKCJDYW5ub3QgZGl2aWRlIGJ5IHplcm8iKTtpZihzZWxmLmlzU21hbGwpe2lmKG4uaXNTbWFsbCl7cmV0dXJuW25ldyBTbWFsbEludGVnZXIodHJ1bmNhdGUoYS9iKSksbmV3IFNtYWxsSW50ZWdlcihhJWIpXX1yZXR1cm5bSW50ZWdlclswXSxzZWxmXX1pZihuLmlzU21hbGwpe2lmKGI9PT0xKXJldHVybltzZWxmLEludGVnZXJbMF1dO2lmKGI9PS0xKXJldHVybltzZWxmLm5lZ2F0ZSgpLEludGVnZXJbMF1dO3ZhciBhYnM9TWF0aC5hYnMoYik7aWYoYWJzPEJBU0Upe3ZhbHVlPWRpdk1vZFNtYWxsKGEsYWJzKTtxdW90aWVudD1hcnJheVRvU21hbGwodmFsdWVbMF0pO3ZhciByZW1haW5kZXI9dmFsdWVbMV07aWYoc2VsZi5zaWduKXJlbWFpbmRlcj0tcmVtYWluZGVyO2lmKHR5cGVvZiBxdW90aWVudD09PSJudW1iZXIiKXtpZihzZWxmLnNpZ24hPT1uLnNpZ24pcXVvdGllbnQ9LXF1b3RpZW50O3JldHVybltuZXcgU21hbGxJbnRlZ2VyKHF1b3RpZW50KSxuZXcgU21hbGxJbnRlZ2VyKHJlbWFpbmRlcildfXJldHVybltuZXcgQmlnSW50ZWdlcihxdW90aWVudCxzZWxmLnNpZ24hPT1uLnNpZ24pLG5ldyBTbWFsbEludGVnZXIocmVtYWluZGVyKV19Yj1zbWFsbFRvQXJyYXkoYWJzKX12YXIgY29tcGFyaXNvbj1jb21wYXJlQWJzKGEsYik7aWYoY29tcGFyaXNvbj09PS0xKXJldHVybltJbnRlZ2VyWzBdLHNlbGZdO2lmKGNvbXBhcmlzb249PT0wKXJldHVybltJbnRlZ2VyW3NlbGYuc2lnbj09PW4uc2lnbj8xOi0xXSxJbnRlZ2VyWzBdXTtpZihhLmxlbmd0aCtiLmxlbmd0aDw9MjAwKXZhbHVlPWRpdk1vZDEoYSxiKTtlbHNlIHZhbHVlPWRpdk1vZDIoYSxiKTtxdW90aWVudD12YWx1ZVswXTt2YXIgcVNpZ249c2VsZi5zaWduIT09bi5zaWduLG1vZD12YWx1ZVsxXSxtU2lnbj1zZWxmLnNpZ247aWYodHlwZW9mIHF1b3RpZW50PT09Im51bWJlciIpe2lmKHFTaWduKXF1b3RpZW50PS1xdW90aWVudDtxdW90aWVudD1uZXcgU21hbGxJbnRlZ2VyKHF1b3RpZW50KX1lbHNlIHF1b3RpZW50PW5ldyBCaWdJbnRlZ2VyKHF1b3RpZW50LHFTaWduKTtpZih0eXBlb2YgbW9kPT09Im51bWJlciIpe2lmKG1TaWduKW1vZD0tbW9kO21vZD1uZXcgU21hbGxJbnRlZ2VyKG1vZCl9ZWxzZSBtb2Q9bmV3IEJpZ0ludGVnZXIobW9kLG1TaWduKTtyZXR1cm5bcXVvdGllbnQsbW9kXX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZtb2Q9ZnVuY3Rpb24odil7dmFyIHJlc3VsdD1kaXZNb2RBbnkodGhpcyx2KTtyZXR1cm57cXVvdGllbnQ6cmVzdWx0WzBdLHJlbWFpbmRlcjpyZXN1bHRbMV19fTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmRpdm1vZD1TbWFsbEludGVnZXIucHJvdG90eXBlLmRpdm1vZD1CaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZtb2Q7QmlnSW50ZWdlci5wcm90b3R5cGUuZGl2aWRlPWZ1bmN0aW9uKHYpe3JldHVybiBkaXZNb2RBbnkodGhpcyx2KVswXX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5vdmVyPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZGl2aWRlPWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUvcGFyc2VWYWx1ZSh2KS52YWx1ZSl9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUub3Zlcj1TbWFsbEludGVnZXIucHJvdG90eXBlLmRpdmlkZT1CaWdJbnRlZ2VyLnByb3RvdHlwZS5vdmVyPUJpZ0ludGVnZXIucHJvdG90eXBlLmRpdmlkZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2Q9ZnVuY3Rpb24odil7cmV0dXJuIGRpdk1vZEFueSh0aGlzLHYpWzFdfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm1vZD1OYXRpdmVCaWdJbnQucHJvdG90eXBlLnJlbWFpbmRlcj1mdW5jdGlvbih2KXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlJXBhcnNlVmFsdWUodikudmFsdWUpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLnJlbWFpbmRlcj1TbWFsbEludGVnZXIucHJvdG90eXBlLm1vZD1CaWdJbnRlZ2VyLnByb3RvdHlwZS5yZW1haW5kZXI9QmlnSW50ZWdlci5wcm90b3R5cGUubW9kO0JpZ0ludGVnZXIucHJvdG90eXBlLnBvdz1mdW5jdGlvbih2KXt2YXIgbj1wYXJzZVZhbHVlKHYpLGE9dGhpcy52YWx1ZSxiPW4udmFsdWUsdmFsdWUseCx5O2lmKGI9PT0wKXJldHVybiBJbnRlZ2VyWzFdO2lmKGE9PT0wKXJldHVybiBJbnRlZ2VyWzBdO2lmKGE9PT0xKXJldHVybiBJbnRlZ2VyWzFdO2lmKGE9PT0tMSlyZXR1cm4gbi5pc0V2ZW4oKT9JbnRlZ2VyWzFdOkludGVnZXJbLTFdO2lmKG4uc2lnbil7cmV0dXJuIEludGVnZXJbMF19aWYoIW4uaXNTbWFsbCl0aHJvdyBuZXcgRXJyb3IoIlRoZSBleHBvbmVudCAiK24udG9TdHJpbmcoKSsiIGlzIHRvbyBsYXJnZS4iKTtpZih0aGlzLmlzU21hbGwpe2lmKGlzUHJlY2lzZSh2YWx1ZT1NYXRoLnBvdyhhLGIpKSlyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih0cnVuY2F0ZSh2YWx1ZSkpfXg9dGhpczt5PUludGVnZXJbMV07d2hpbGUodHJ1ZSl7aWYoYiYxPT09MSl7eT15LnRpbWVzKHgpOy0tYn1pZihiPT09MClicmVhaztiLz0yO3g9eC5zcXVhcmUoKX1yZXR1cm4geX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5wb3c9QmlnSW50ZWdlci5wcm90b3R5cGUucG93O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUucG93PWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodik7dmFyIGE9dGhpcy52YWx1ZSxiPW4udmFsdWU7dmFyIF8wPUJpZ0ludCgwKSxfMT1CaWdJbnQoMSksXzI9QmlnSW50KDIpO2lmKGI9PT1fMClyZXR1cm4gSW50ZWdlclsxXTtpZihhPT09XzApcmV0dXJuIEludGVnZXJbMF07aWYoYT09PV8xKXJldHVybiBJbnRlZ2VyWzFdO2lmKGE9PT1CaWdJbnQoLTEpKXJldHVybiBuLmlzRXZlbigpP0ludGVnZXJbMV06SW50ZWdlclstMV07aWYobi5pc05lZ2F0aXZlKCkpcmV0dXJuIG5ldyBOYXRpdmVCaWdJbnQoXzApO3ZhciB4PXRoaXM7dmFyIHk9SW50ZWdlclsxXTt3aGlsZSh0cnVlKXtpZigoYiZfMSk9PT1fMSl7eT15LnRpbWVzKHgpOy0tYn1pZihiPT09XzApYnJlYWs7Yi89XzI7eD14LnNxdWFyZSgpfXJldHVybiB5fTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RQb3c9ZnVuY3Rpb24oZXhwLG1vZCl7ZXhwPXBhcnNlVmFsdWUoZXhwKTttb2Q9cGFyc2VWYWx1ZShtb2QpO2lmKG1vZC5pc1plcm8oKSl0aHJvdyBuZXcgRXJyb3IoIkNhbm5vdCB0YWtlIG1vZFBvdyB3aXRoIG1vZHVsdXMgMCIpO3ZhciByPUludGVnZXJbMV0sYmFzZT10aGlzLm1vZChtb2QpO2lmKGV4cC5pc05lZ2F0aXZlKCkpe2V4cD1leHAubXVsdGlwbHkoSW50ZWdlclstMV0pO2Jhc2U9YmFzZS5tb2RJbnYobW9kKX13aGlsZShleHAuaXNQb3NpdGl2ZSgpKXtpZihiYXNlLmlzWmVybygpKXJldHVybiBJbnRlZ2VyWzBdO2lmKGV4cC5pc09kZCgpKXI9ci5tdWx0aXBseShiYXNlKS5tb2QobW9kKTtleHA9ZXhwLmRpdmlkZSgyKTtiYXNlPWJhc2Uuc3F1YXJlKCkubW9kKG1vZCl9cmV0dXJuIHJ9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubW9kUG93PVNtYWxsSW50ZWdlci5wcm90b3R5cGUubW9kUG93PUJpZ0ludGVnZXIucHJvdG90eXBlLm1vZFBvdztmdW5jdGlvbiBjb21wYXJlQWJzKGEsYil7aWYoYS5sZW5ndGghPT1iLmxlbmd0aCl7cmV0dXJuIGEubGVuZ3RoPmIubGVuZ3RoPzE6LTF9Zm9yKHZhciBpPWEubGVuZ3RoLTE7aT49MDtpLS0pe2lmKGFbaV0hPT1iW2ldKXJldHVybiBhW2ldPmJbaV0/MTotMX1yZXR1cm4gMH1CaWdJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlQWJzPWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodiksYT10aGlzLnZhbHVlLGI9bi52YWx1ZTtpZihuLmlzU21hbGwpcmV0dXJuIDE7cmV0dXJuIGNvbXBhcmVBYnMoYSxiKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlQWJzPWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodiksYT1NYXRoLmFicyh0aGlzLnZhbHVlKSxiPW4udmFsdWU7aWYobi5pc1NtYWxsKXtiPU1hdGguYWJzKGIpO3JldHVybiBhPT09Yj8wOmE+Yj8xOi0xfXJldHVybi0xfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmNvbXBhcmVBYnM9ZnVuY3Rpb24odil7dmFyIGE9dGhpcy52YWx1ZTt2YXIgYj1wYXJzZVZhbHVlKHYpLnZhbHVlO2E9YT49MD9hOi1hO2I9Yj49MD9iOi1iO3JldHVybiBhPT09Yj8wOmE+Yj8xOi0xfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlPWZ1bmN0aW9uKHYpe2lmKHY9PT1JbmZpbml0eSl7cmV0dXJuLTF9aWYodj09PS1JbmZpbml0eSl7cmV0dXJuIDF9dmFyIG49cGFyc2VWYWx1ZSh2KSxhPXRoaXMudmFsdWUsYj1uLnZhbHVlO2lmKHRoaXMuc2lnbiE9PW4uc2lnbil7cmV0dXJuIG4uc2lnbj8xOi0xfWlmKG4uaXNTbWFsbCl7cmV0dXJuIHRoaXMuc2lnbj8tMToxfXJldHVybiBjb21wYXJlQWJzKGEsYikqKHRoaXMuc2lnbj8tMToxKX07QmlnSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZVRvPUJpZ0ludGVnZXIucHJvdG90eXBlLmNvbXBhcmU7U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlPWZ1bmN0aW9uKHYpe2lmKHY9PT1JbmZpbml0eSl7cmV0dXJuLTF9aWYodj09PS1JbmZpbml0eSl7cmV0dXJuIDF9dmFyIG49cGFyc2VWYWx1ZSh2KSxhPXRoaXMudmFsdWUsYj1uLnZhbHVlO2lmKG4uaXNTbWFsbCl7cmV0dXJuIGE9PWI/MDphPmI/MTotMX1pZihhPDAhPT1uLnNpZ24pe3JldHVybiBhPDA/LTE6MX1yZXR1cm4gYTwwPzE6LTF9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZVRvPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmNvbXBhcmU9ZnVuY3Rpb24odil7aWYodj09PUluZmluaXR5KXtyZXR1cm4tMX1pZih2PT09LUluZmluaXR5KXtyZXR1cm4gMX12YXIgYT10aGlzLnZhbHVlO3ZhciBiPXBhcnNlVmFsdWUodikudmFsdWU7cmV0dXJuIGE9PT1iPzA6YT5iPzE6LTF9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuY29tcGFyZVRvPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUuY29tcGFyZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5lcXVhbHM9ZnVuY3Rpb24odil7cmV0dXJuIHRoaXMuY29tcGFyZSh2KT09PTB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZXE9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5lcXVhbHM9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5lcT1TbWFsbEludGVnZXIucHJvdG90eXBlLmVxdWFscz1CaWdJbnRlZ2VyLnByb3RvdHlwZS5lcT1CaWdJbnRlZ2VyLnByb3RvdHlwZS5lcXVhbHM7QmlnSW50ZWdlci5wcm90b3R5cGUubm90RXF1YWxzPWZ1bmN0aW9uKHYpe3JldHVybiB0aGlzLmNvbXBhcmUodikhPT0wfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm5lcT1OYXRpdmVCaWdJbnQucHJvdG90eXBlLm5vdEVxdWFscz1TbWFsbEludGVnZXIucHJvdG90eXBlLm5lcT1TbWFsbEludGVnZXIucHJvdG90eXBlLm5vdEVxdWFscz1CaWdJbnRlZ2VyLnByb3RvdHlwZS5uZXE9QmlnSW50ZWdlci5wcm90b3R5cGUubm90RXF1YWxzO0JpZ0ludGVnZXIucHJvdG90eXBlLmdyZWF0ZXI9ZnVuY3Rpb24odil7cmV0dXJuIHRoaXMuY29tcGFyZSh2KT4wfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmd0PU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZ3JlYXRlcj1TbWFsbEludGVnZXIucHJvdG90eXBlLmd0PVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZ3JlYXRlcj1CaWdJbnRlZ2VyLnByb3RvdHlwZS5ndD1CaWdJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyO0JpZ0ludGVnZXIucHJvdG90eXBlLmxlc3Nlcj1mdW5jdGlvbih2KXtyZXR1cm4gdGhpcy5jb21wYXJlKHYpPDB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubHQ9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5sZXNzZXI9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5sdD1TbWFsbEludGVnZXIucHJvdG90eXBlLmxlc3Nlcj1CaWdJbnRlZ2VyLnByb3RvdHlwZS5sdD1CaWdJbnRlZ2VyLnByb3RvdHlwZS5sZXNzZXI7QmlnSW50ZWdlci5wcm90b3R5cGUuZ3JlYXRlck9yRXF1YWxzPWZ1bmN0aW9uKHYpe3JldHVybiB0aGlzLmNvbXBhcmUodik+PTB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZ2VxPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZ3JlYXRlck9yRXF1YWxzPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZ2VxPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZ3JlYXRlck9yRXF1YWxzPUJpZ0ludGVnZXIucHJvdG90eXBlLmdlcT1CaWdJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyT3JFcXVhbHM7QmlnSW50ZWdlci5wcm90b3R5cGUubGVzc2VyT3JFcXVhbHM9ZnVuY3Rpb24odil7cmV0dXJuIHRoaXMuY29tcGFyZSh2KTw9MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5sZXE9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5sZXNzZXJPckVxdWFscz1TbWFsbEludGVnZXIucHJvdG90eXBlLmxlcT1TbWFsbEludGVnZXIucHJvdG90eXBlLmxlc3Nlck9yRXF1YWxzPUJpZ0ludGVnZXIucHJvdG90eXBlLmxlcT1CaWdJbnRlZ2VyLnByb3RvdHlwZS5sZXNzZXJPckVxdWFscztCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc0V2ZW49ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZVswXSYxKT09PTB9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNFdmVuPWZ1bmN0aW9uKCl7cmV0dXJuKHRoaXMudmFsdWUmMSk9PT0wfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmlzRXZlbj1mdW5jdGlvbigpe3JldHVybih0aGlzLnZhbHVlJkJpZ0ludCgxKSk9PT1CaWdJbnQoMCl9O0JpZ0ludGVnZXIucHJvdG90eXBlLmlzT2RkPWZ1bmN0aW9uKCl7cmV0dXJuKHRoaXMudmFsdWVbMF0mMSk9PT0xfTtTbWFsbEludGVnZXIucHJvdG90eXBlLmlzT2RkPWZ1bmN0aW9uKCl7cmV0dXJuKHRoaXMudmFsdWUmMSk9PT0xfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmlzT2RkPWZ1bmN0aW9uKCl7cmV0dXJuKHRoaXMudmFsdWUmQmlnSW50KDEpKT09PUJpZ0ludCgxKX07QmlnSW50ZWdlci5wcm90b3R5cGUuaXNQb3NpdGl2ZT1mdW5jdGlvbigpe3JldHVybiF0aGlzLnNpZ259O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNQb3NpdGl2ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLnZhbHVlPjB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNQb3NpdGl2ZT1TbWFsbEludGVnZXIucHJvdG90eXBlLmlzUG9zaXRpdmU7QmlnSW50ZWdlci5wcm90b3R5cGUuaXNOZWdhdGl2ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLnNpZ259O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNOZWdhdGl2ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLnZhbHVlPDB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNOZWdhdGl2ZT1TbWFsbEludGVnZXIucHJvdG90eXBlLmlzTmVnYXRpdmU7QmlnSW50ZWdlci5wcm90b3R5cGUuaXNVbml0PWZ1bmN0aW9uKCl7cmV0dXJuIGZhbHNlfTtTbWFsbEludGVnZXIucHJvdG90eXBlLmlzVW5pdD1mdW5jdGlvbigpe3JldHVybiBNYXRoLmFicyh0aGlzLnZhbHVlKT09PTF9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNVbml0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuYWJzKCkudmFsdWU9PT1CaWdJbnQoMSl9O0JpZ0ludGVnZXIucHJvdG90eXBlLmlzWmVybz1mdW5jdGlvbigpe3JldHVybiBmYWxzZX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc1plcm89ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy52YWx1ZT09PTB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNaZXJvPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWU9PT1CaWdJbnQoMCl9O0JpZ0ludGVnZXIucHJvdG90eXBlLmlzRGl2aXNpYmxlQnk9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KTtpZihuLmlzWmVybygpKXJldHVybiBmYWxzZTtpZihuLmlzVW5pdCgpKXJldHVybiB0cnVlO2lmKG4uY29tcGFyZUFicygyKT09PTApcmV0dXJuIHRoaXMuaXNFdmVuKCk7cmV0dXJuIHRoaXMubW9kKG4pLmlzWmVybygpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmlzRGl2aXNpYmxlQnk9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc0RpdmlzaWJsZUJ5PUJpZ0ludGVnZXIucHJvdG90eXBlLmlzRGl2aXNpYmxlQnk7ZnVuY3Rpb24gaXNCYXNpY1ByaW1lKHYpe3ZhciBuPXYuYWJzKCk7aWYobi5pc1VuaXQoKSlyZXR1cm4gZmFsc2U7aWYobi5lcXVhbHMoMil8fG4uZXF1YWxzKDMpfHxuLmVxdWFscyg1KSlyZXR1cm4gdHJ1ZTtpZihuLmlzRXZlbigpfHxuLmlzRGl2aXNpYmxlQnkoMyl8fG4uaXNEaXZpc2libGVCeSg1KSlyZXR1cm4gZmFsc2U7aWYobi5sZXNzZXIoNDkpKXJldHVybiB0cnVlfWZ1bmN0aW9uIG1pbGxlclJhYmluVGVzdChuLGEpe3ZhciBuUHJldj1uLnByZXYoKSxiPW5QcmV2LHI9MCxkLHQsaSx4O3doaWxlKGIuaXNFdmVuKCkpYj1iLmRpdmlkZSgyKSxyKys7bmV4dDpmb3IoaT0wO2k8YS5sZW5ndGg7aSsrKXtpZihuLmxlc3NlcihhW2ldKSljb250aW51ZTt4PWJpZ0ludChhW2ldKS5tb2RQb3coYixuKTtpZih4LmlzVW5pdCgpfHx4LmVxdWFscyhuUHJldikpY29udGludWU7Zm9yKGQ9ci0xO2QhPTA7ZC0tKXt4PXguc3F1YXJlKCkubW9kKG4pO2lmKHguaXNVbml0KCkpcmV0dXJuIGZhbHNlO2lmKHguZXF1YWxzKG5QcmV2KSljb250aW51ZSBuZXh0fXJldHVybiBmYWxzZX1yZXR1cm4gdHJ1ZX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1ByaW1lPWZ1bmN0aW9uKHN0cmljdCl7dmFyIGlzUHJpbWU9aXNCYXNpY1ByaW1lKHRoaXMpO2lmKGlzUHJpbWUhPT11bmRlZmluZWQpcmV0dXJuIGlzUHJpbWU7dmFyIG49dGhpcy5hYnMoKTt2YXIgYml0cz1uLmJpdExlbmd0aCgpO2lmKGJpdHM8PTY0KXJldHVybiBtaWxsZXJSYWJpblRlc3QobixbMiwzLDUsNywxMSwxMywxNywxOSwyMywyOSwzMSwzN10pO3ZhciBsb2dOPU1hdGgubG9nKDIpKmJpdHMudG9KU051bWJlcigpO3ZhciB0PU1hdGguY2VpbChzdHJpY3Q9PT10cnVlPzIqTWF0aC5wb3cobG9nTiwyKTpsb2dOKTtmb3IodmFyIGE9W10saT0wO2k8dDtpKyspe2EucHVzaChiaWdJbnQoaSsyKSl9cmV0dXJuIG1pbGxlclJhYmluVGVzdChuLGEpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmlzUHJpbWU9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc1ByaW1lPUJpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJpbWU7QmlnSW50ZWdlci5wcm90b3R5cGUuaXNQcm9iYWJsZVByaW1lPWZ1bmN0aW9uKGl0ZXJhdGlvbnMpe3ZhciBpc1ByaW1lPWlzQmFzaWNQcmltZSh0aGlzKTtpZihpc1ByaW1lIT09dW5kZWZpbmVkKXJldHVybiBpc1ByaW1lO3ZhciBuPXRoaXMuYWJzKCk7dmFyIHQ9aXRlcmF0aW9ucz09PXVuZGVmaW5lZD81Oml0ZXJhdGlvbnM7Zm9yKHZhciBhPVtdLGk9MDtpPHQ7aSsrKXthLnB1c2goYmlnSW50LnJhbmRCZXR3ZWVuKDIsbi5taW51cygyKSkpfXJldHVybiBtaWxsZXJSYWJpblRlc3QobixhKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc1Byb2JhYmxlUHJpbWU9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc1Byb2JhYmxlUHJpbWU9QmlnSW50ZWdlci5wcm90b3R5cGUuaXNQcm9iYWJsZVByaW1lO0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZEludj1mdW5jdGlvbihuKXt2YXIgdD1iaWdJbnQuemVybyxuZXdUPWJpZ0ludC5vbmUscj1wYXJzZVZhbHVlKG4pLG5ld1I9dGhpcy5hYnMoKSxxLGxhc3RULGxhc3RSO3doaWxlKCFuZXdSLmlzWmVybygpKXtxPXIuZGl2aWRlKG5ld1IpO2xhc3RUPXQ7bGFzdFI9cjt0PW5ld1Q7cj1uZXdSO25ld1Q9bGFzdFQuc3VidHJhY3QocS5tdWx0aXBseShuZXdUKSk7bmV3Uj1sYXN0Ui5zdWJ0cmFjdChxLm11bHRpcGx5KG5ld1IpKX1pZighci5pc1VuaXQoKSl0aHJvdyBuZXcgRXJyb3IodGhpcy50b1N0cmluZygpKyIgYW5kICIrbi50b1N0cmluZygpKyIgYXJlIG5vdCBjby1wcmltZSIpO2lmKHQuY29tcGFyZSgwKT09PS0xKXt0PXQuYWRkKG4pfWlmKHRoaXMuaXNOZWdhdGl2ZSgpKXtyZXR1cm4gdC5uZWdhdGUoKX1yZXR1cm4gdH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5tb2RJbnY9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5tb2RJbnY9QmlnSW50ZWdlci5wcm90b3R5cGUubW9kSW52O0JpZ0ludGVnZXIucHJvdG90eXBlLm5leHQ9ZnVuY3Rpb24oKXt2YXIgdmFsdWU9dGhpcy52YWx1ZTtpZih0aGlzLnNpZ24pe3JldHVybiBzdWJ0cmFjdFNtYWxsKHZhbHVlLDEsdGhpcy5zaWduKX1yZXR1cm4gbmV3IEJpZ0ludGVnZXIoYWRkU21hbGwodmFsdWUsMSksdGhpcy5zaWduKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIHZhbHVlPXRoaXMudmFsdWU7aWYodmFsdWUrMTxNQVhfSU5UKXJldHVybiBuZXcgU21hbGxJbnRlZ2VyKHZhbHVlKzEpO3JldHVybiBuZXcgQmlnSW50ZWdlcihNQVhfSU5UX0FSUixmYWxzZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubmV4dD1mdW5jdGlvbigpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUrQmlnSW50KDEpKX07QmlnSW50ZWdlci5wcm90b3R5cGUucHJldj1mdW5jdGlvbigpe3ZhciB2YWx1ZT10aGlzLnZhbHVlO2lmKHRoaXMuc2lnbil7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZFNtYWxsKHZhbHVlLDEpLHRydWUpfXJldHVybiBzdWJ0cmFjdFNtYWxsKHZhbHVlLDEsdGhpcy5zaWduKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5wcmV2PWZ1bmN0aW9uKCl7dmFyIHZhbHVlPXRoaXMudmFsdWU7aWYodmFsdWUtMT4tTUFYX0lOVClyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2YWx1ZS0xKTtyZXR1cm4gbmV3IEJpZ0ludGVnZXIoTUFYX0lOVF9BUlIsdHJ1ZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUucHJldj1mdW5jdGlvbigpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUtQmlnSW50KDEpKX07dmFyIHBvd2Vyc09mVHdvPVsxXTt3aGlsZSgyKnBvd2Vyc09mVHdvW3Bvd2Vyc09mVHdvLmxlbmd0aC0xXTw9QkFTRSlwb3dlcnNPZlR3by5wdXNoKDIqcG93ZXJzT2ZUd29bcG93ZXJzT2ZUd28ubGVuZ3RoLTFdKTt2YXIgcG93ZXJzMkxlbmd0aD1wb3dlcnNPZlR3by5sZW5ndGgsaGlnaGVzdFBvd2VyMj1wb3dlcnNPZlR3b1twb3dlcnMyTGVuZ3RoLTFdO2Z1bmN0aW9uIHNoaWZ0X2lzU21hbGwobil7cmV0dXJuIE1hdGguYWJzKG4pPD1CQVNFfUJpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0TGVmdD1mdW5jdGlvbih2KXt2YXIgbj1wYXJzZVZhbHVlKHYpLnRvSlNOdW1iZXIoKTtpZighc2hpZnRfaXNTbWFsbChuKSl7dGhyb3cgbmV3IEVycm9yKFN0cmluZyhuKSsiIGlzIHRvbyBsYXJnZSBmb3Igc2hpZnRpbmcuIil9aWYobjwwKXJldHVybiB0aGlzLnNoaWZ0UmlnaHQoLW4pO3ZhciByZXN1bHQ9dGhpcztpZihyZXN1bHQuaXNaZXJvKCkpcmV0dXJuIHJlc3VsdDt3aGlsZShuPj1wb3dlcnMyTGVuZ3RoKXtyZXN1bHQ9cmVzdWx0Lm11bHRpcGx5KGhpZ2hlc3RQb3dlcjIpO24tPXBvd2VyczJMZW5ndGgtMX1yZXR1cm4gcmVzdWx0Lm11bHRpcGx5KHBvd2Vyc09mVHdvW25dKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5zaGlmdExlZnQ9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdExlZnQ9QmlnSW50ZWdlci5wcm90b3R5cGUuc2hpZnRMZWZ0O0JpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0UmlnaHQ9ZnVuY3Rpb24odil7dmFyIHJlbVF1bzt2YXIgbj1wYXJzZVZhbHVlKHYpLnRvSlNOdW1iZXIoKTtpZighc2hpZnRfaXNTbWFsbChuKSl7dGhyb3cgbmV3IEVycm9yKFN0cmluZyhuKSsiIGlzIHRvbyBsYXJnZSBmb3Igc2hpZnRpbmcuIil9aWYobjwwKXJldHVybiB0aGlzLnNoaWZ0TGVmdCgtbik7dmFyIHJlc3VsdD10aGlzO3doaWxlKG4+PXBvd2VyczJMZW5ndGgpe2lmKHJlc3VsdC5pc1plcm8oKXx8cmVzdWx0LmlzTmVnYXRpdmUoKSYmcmVzdWx0LmlzVW5pdCgpKXJldHVybiByZXN1bHQ7cmVtUXVvPWRpdk1vZEFueShyZXN1bHQsaGlnaGVzdFBvd2VyMik7cmVzdWx0PXJlbVF1b1sxXS5pc05lZ2F0aXZlKCk/cmVtUXVvWzBdLnByZXYoKTpyZW1RdW9bMF07bi09cG93ZXJzMkxlbmd0aC0xfXJlbVF1bz1kaXZNb2RBbnkocmVzdWx0LHBvd2Vyc09mVHdvW25dKTtyZXR1cm4gcmVtUXVvWzFdLmlzTmVnYXRpdmUoKT9yZW1RdW9bMF0ucHJldigpOnJlbVF1b1swXX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5zaGlmdFJpZ2h0PVNtYWxsSW50ZWdlci5wcm90b3R5cGUuc2hpZnRSaWdodD1CaWdJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdFJpZ2h0O2Z1bmN0aW9uIGJpdHdpc2UoeCx5LGZuKXt5PXBhcnNlVmFsdWUoeSk7dmFyIHhTaWduPXguaXNOZWdhdGl2ZSgpLHlTaWduPXkuaXNOZWdhdGl2ZSgpO3ZhciB4UmVtPXhTaWduP3gubm90KCk6eCx5UmVtPXlTaWduP3kubm90KCk6eTt2YXIgeERpZ2l0PTAseURpZ2l0PTA7dmFyIHhEaXZNb2Q9bnVsbCx5RGl2TW9kPW51bGw7dmFyIHJlc3VsdD1bXTt3aGlsZSgheFJlbS5pc1plcm8oKXx8IXlSZW0uaXNaZXJvKCkpe3hEaXZNb2Q9ZGl2TW9kQW55KHhSZW0saGlnaGVzdFBvd2VyMik7eERpZ2l0PXhEaXZNb2RbMV0udG9KU051bWJlcigpO2lmKHhTaWduKXt4RGlnaXQ9aGlnaGVzdFBvd2VyMi0xLXhEaWdpdH15RGl2TW9kPWRpdk1vZEFueSh5UmVtLGhpZ2hlc3RQb3dlcjIpO3lEaWdpdD15RGl2TW9kWzFdLnRvSlNOdW1iZXIoKTtpZih5U2lnbil7eURpZ2l0PWhpZ2hlc3RQb3dlcjItMS15RGlnaXR9eFJlbT14RGl2TW9kWzBdO3lSZW09eURpdk1vZFswXTtyZXN1bHQucHVzaChmbih4RGlnaXQseURpZ2l0KSl9dmFyIHN1bT1mbih4U2lnbj8xOjAseVNpZ24/MTowKSE9PTA/YmlnSW50KC0xKTpiaWdJbnQoMCk7Zm9yKHZhciBpPXJlc3VsdC5sZW5ndGgtMTtpPj0wO2ktPTEpe3N1bT1zdW0ubXVsdGlwbHkoaGlnaGVzdFBvd2VyMikuYWRkKGJpZ0ludChyZXN1bHRbaV0pKX1yZXR1cm4gc3VtfUJpZ0ludGVnZXIucHJvdG90eXBlLm5vdD1mdW5jdGlvbigpe3JldHVybiB0aGlzLm5lZ2F0ZSgpLnByZXYoKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5ub3Q9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5ub3Q9QmlnSW50ZWdlci5wcm90b3R5cGUubm90O0JpZ0ludGVnZXIucHJvdG90eXBlLmFuZD1mdW5jdGlvbihuKXtyZXR1cm4gYml0d2lzZSh0aGlzLG4sZnVuY3Rpb24oYSxiKXtyZXR1cm4gYSZifSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuYW5kPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuYW5kPUJpZ0ludGVnZXIucHJvdG90eXBlLmFuZDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5vcj1mdW5jdGlvbihuKXtyZXR1cm4gYml0d2lzZSh0aGlzLG4sZnVuY3Rpb24oYSxiKXtyZXR1cm4gYXxifSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUub3I9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5vcj1CaWdJbnRlZ2VyLnByb3RvdHlwZS5vcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS54b3I9ZnVuY3Rpb24obil7cmV0dXJuIGJpdHdpc2UodGhpcyxuLGZ1bmN0aW9uKGEsYil7cmV0dXJuIGFeYn0pfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnhvcj1TbWFsbEludGVnZXIucHJvdG90eXBlLnhvcj1CaWdJbnRlZ2VyLnByb3RvdHlwZS54b3I7dmFyIExPQk1BU0tfST0xPDwzMCxMT0JNQVNLX0JJPShCQVNFJi1CQVNFKSooQkFTRSYtQkFTRSl8TE9CTUFTS19JO2Z1bmN0aW9uIHJvdWdoTE9CKG4pe3ZhciB2PW4udmFsdWUseD10eXBlb2Ygdj09PSJudW1iZXIiP3Z8TE9CTUFTS19JOnR5cGVvZiB2PT09ImJpZ2ludCI/dnxCaWdJbnQoTE9CTUFTS19JKTp2WzBdK3ZbMV0qQkFTRXxMT0JNQVNLX0JJO3JldHVybiB4Ji14fWZ1bmN0aW9uIGludGVnZXJMb2dhcml0aG0odmFsdWUsYmFzZSl7aWYoYmFzZS5jb21wYXJlVG8odmFsdWUpPD0wKXt2YXIgdG1wPWludGVnZXJMb2dhcml0aG0odmFsdWUsYmFzZS5zcXVhcmUoYmFzZSkpO3ZhciBwPXRtcC5wO3ZhciBlPXRtcC5lO3ZhciB0PXAubXVsdGlwbHkoYmFzZSk7cmV0dXJuIHQuY29tcGFyZVRvKHZhbHVlKTw9MD97cDp0LGU6ZSoyKzF9OntwOnAsZTplKjJ9fXJldHVybntwOmJpZ0ludCgxKSxlOjB9fUJpZ0ludGVnZXIucHJvdG90eXBlLmJpdExlbmd0aD1mdW5jdGlvbigpe3ZhciBuPXRoaXM7aWYobi5jb21wYXJlVG8oYmlnSW50KDApKTwwKXtuPW4ubmVnYXRlKCkuc3VidHJhY3QoYmlnSW50KDEpKX1pZihuLmNvbXBhcmVUbyhiaWdJbnQoMCkpPT09MCl7cmV0dXJuIGJpZ0ludCgwKX1yZXR1cm4gYmlnSW50KGludGVnZXJMb2dhcml0aG0obixiaWdJbnQoMikpLmUpLmFkZChiaWdJbnQoMSkpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmJpdExlbmd0aD1TbWFsbEludGVnZXIucHJvdG90eXBlLmJpdExlbmd0aD1CaWdJbnRlZ2VyLnByb3RvdHlwZS5iaXRMZW5ndGg7ZnVuY3Rpb24gbWF4KGEsYil7YT1wYXJzZVZhbHVlKGEpO2I9cGFyc2VWYWx1ZShiKTtyZXR1cm4gYS5ncmVhdGVyKGIpP2E6Yn1mdW5jdGlvbiBtaW4oYSxiKXthPXBhcnNlVmFsdWUoYSk7Yj1wYXJzZVZhbHVlKGIpO3JldHVybiBhLmxlc3NlcihiKT9hOmJ9ZnVuY3Rpb24gZ2NkKGEsYil7YT1wYXJzZVZhbHVlKGEpLmFicygpO2I9cGFyc2VWYWx1ZShiKS5hYnMoKTtpZihhLmVxdWFscyhiKSlyZXR1cm4gYTtpZihhLmlzWmVybygpKXJldHVybiBiO2lmKGIuaXNaZXJvKCkpcmV0dXJuIGE7dmFyIGM9SW50ZWdlclsxXSxkLHQ7d2hpbGUoYS5pc0V2ZW4oKSYmYi5pc0V2ZW4oKSl7ZD1taW4ocm91Z2hMT0IoYSkscm91Z2hMT0IoYikpO2E9YS5kaXZpZGUoZCk7Yj1iLmRpdmlkZShkKTtjPWMubXVsdGlwbHkoZCl9d2hpbGUoYS5pc0V2ZW4oKSl7YT1hLmRpdmlkZShyb3VnaExPQihhKSl9ZG97d2hpbGUoYi5pc0V2ZW4oKSl7Yj1iLmRpdmlkZShyb3VnaExPQihiKSl9aWYoYS5ncmVhdGVyKGIpKXt0PWI7Yj1hO2E9dH1iPWIuc3VidHJhY3QoYSl9d2hpbGUoIWIuaXNaZXJvKCkpO3JldHVybiBjLmlzVW5pdCgpP2E6YS5tdWx0aXBseShjKX1mdW5jdGlvbiBsY20oYSxiKXthPXBhcnNlVmFsdWUoYSkuYWJzKCk7Yj1wYXJzZVZhbHVlKGIpLmFicygpO3JldHVybiBhLmRpdmlkZShnY2QoYSxiKSkubXVsdGlwbHkoYil9ZnVuY3Rpb24gcmFuZEJldHdlZW4oYSxiKXthPXBhcnNlVmFsdWUoYSk7Yj1wYXJzZVZhbHVlKGIpO3ZhciBsb3c9bWluKGEsYiksaGlnaD1tYXgoYSxiKTt2YXIgcmFuZ2U9aGlnaC5zdWJ0cmFjdChsb3cpLmFkZCgxKTtpZihyYW5nZS5pc1NtYWxsKXJldHVybiBsb3cuYWRkKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpyYW5nZSkpO3ZhciBkaWdpdHM9dG9CYXNlKHJhbmdlLEJBU0UpLnZhbHVlO3ZhciByZXN1bHQ9W10scmVzdHJpY3RlZD10cnVlO2Zvcih2YXIgaT0wO2k8ZGlnaXRzLmxlbmd0aDtpKyspe3ZhciB0b3A9cmVzdHJpY3RlZD9kaWdpdHNbaV06QkFTRTt2YXIgZGlnaXQ9dHJ1bmNhdGUoTWF0aC5yYW5kb20oKSp0b3ApO3Jlc3VsdC5wdXNoKGRpZ2l0KTtpZihkaWdpdDx0b3ApcmVzdHJpY3RlZD1mYWxzZX1yZXR1cm4gbG93LmFkZChJbnRlZ2VyLmZyb21BcnJheShyZXN1bHQsQkFTRSxmYWxzZSkpfXZhciBwYXJzZUJhc2U9ZnVuY3Rpb24odGV4dCxiYXNlLGFscGhhYmV0LGNhc2VTZW5zaXRpdmUpe2FscGhhYmV0PWFscGhhYmV0fHxERUZBVUxUX0FMUEhBQkVUO3RleHQ9U3RyaW5nKHRleHQpO2lmKCFjYXNlU2Vuc2l0aXZlKXt0ZXh0PXRleHQudG9Mb3dlckNhc2UoKTthbHBoYWJldD1hbHBoYWJldC50b0xvd2VyQ2FzZSgpfXZhciBsZW5ndGg9dGV4dC5sZW5ndGg7dmFyIGk7dmFyIGFic0Jhc2U9TWF0aC5hYnMoYmFzZSk7dmFyIGFscGhhYmV0VmFsdWVzPXt9O2ZvcihpPTA7aTxhbHBoYWJldC5sZW5ndGg7aSsrKXthbHBoYWJldFZhbHVlc1thbHBoYWJldFtpXV09aX1mb3IoaT0wO2k8bGVuZ3RoO2krKyl7dmFyIGM9dGV4dFtpXTtpZihjPT09Ii0iKWNvbnRpbnVlO2lmKGMgaW4gYWxwaGFiZXRWYWx1ZXMpe2lmKGFscGhhYmV0VmFsdWVzW2NdPj1hYnNCYXNlKXtpZihjPT09IjEiJiZhYnNCYXNlPT09MSljb250aW51ZTt0aHJvdyBuZXcgRXJyb3IoYysiIGlzIG5vdCBhIHZhbGlkIGRpZ2l0IGluIGJhc2UgIitiYXNlKyIuIil9fX1iYXNlPXBhcnNlVmFsdWUoYmFzZSk7dmFyIGRpZ2l0cz1bXTt2YXIgaXNOZWdhdGl2ZT10ZXh0WzBdPT09Ii0iO2ZvcihpPWlzTmVnYXRpdmU/MTowO2k8dGV4dC5sZW5ndGg7aSsrKXt2YXIgYz10ZXh0W2ldO2lmKGMgaW4gYWxwaGFiZXRWYWx1ZXMpZGlnaXRzLnB1c2gocGFyc2VWYWx1ZShhbHBoYWJldFZhbHVlc1tjXSkpO2Vsc2UgaWYoYz09PSI8Iil7dmFyIHN0YXJ0PWk7ZG97aSsrfXdoaWxlKHRleHRbaV0hPT0iPiImJmk8dGV4dC5sZW5ndGgpO2RpZ2l0cy5wdXNoKHBhcnNlVmFsdWUodGV4dC5zbGljZShzdGFydCsxLGkpKSl9ZWxzZSB0aHJvdyBuZXcgRXJyb3IoYysiIGlzIG5vdCBhIHZhbGlkIGNoYXJhY3RlciIpfXJldHVybiBwYXJzZUJhc2VGcm9tQXJyYXkoZGlnaXRzLGJhc2UsaXNOZWdhdGl2ZSl9O2Z1bmN0aW9uIHBhcnNlQmFzZUZyb21BcnJheShkaWdpdHMsYmFzZSxpc05lZ2F0aXZlKXt2YXIgdmFsPUludGVnZXJbMF0scG93PUludGVnZXJbMV0saTtmb3IoaT1kaWdpdHMubGVuZ3RoLTE7aT49MDtpLS0pe3ZhbD12YWwuYWRkKGRpZ2l0c1tpXS50aW1lcyhwb3cpKTtwb3c9cG93LnRpbWVzKGJhc2UpfXJldHVybiBpc05lZ2F0aXZlP3ZhbC5uZWdhdGUoKTp2YWx9ZnVuY3Rpb24gc3RyaW5naWZ5KGRpZ2l0LGFscGhhYmV0KXthbHBoYWJldD1hbHBoYWJldHx8REVGQVVMVF9BTFBIQUJFVDtpZihkaWdpdDxhbHBoYWJldC5sZW5ndGgpe3JldHVybiBhbHBoYWJldFtkaWdpdF19cmV0dXJuIjwiK2RpZ2l0KyI+In1mdW5jdGlvbiB0b0Jhc2UobixiYXNlKXtiYXNlPWJpZ0ludChiYXNlKTtpZihiYXNlLmlzWmVybygpKXtpZihuLmlzWmVybygpKXJldHVybnt2YWx1ZTpbMF0saXNOZWdhdGl2ZTpmYWxzZX07dGhyb3cgbmV3IEVycm9yKCJDYW5ub3QgY29udmVydCBub256ZXJvIG51bWJlcnMgdG8gYmFzZSAwLiIpfWlmKGJhc2UuZXF1YWxzKC0xKSl7aWYobi5pc1plcm8oKSlyZXR1cm57dmFsdWU6WzBdLGlzTmVnYXRpdmU6ZmFsc2V9O2lmKG4uaXNOZWdhdGl2ZSgpKXJldHVybnt2YWx1ZTpbXS5jb25jYXQuYXBwbHkoW10sQXJyYXkuYXBwbHkobnVsbCxBcnJheSgtbi50b0pTTnVtYmVyKCkpKS5tYXAoQXJyYXkucHJvdG90eXBlLnZhbHVlT2YsWzEsMF0pKSxpc05lZ2F0aXZlOmZhbHNlfTt2YXIgYXJyPUFycmF5LmFwcGx5KG51bGwsQXJyYXkobi50b0pTTnVtYmVyKCktMSkpLm1hcChBcnJheS5wcm90b3R5cGUudmFsdWVPZixbMCwxXSk7YXJyLnVuc2hpZnQoWzFdKTtyZXR1cm57dmFsdWU6W10uY29uY2F0LmFwcGx5KFtdLGFyciksaXNOZWdhdGl2ZTpmYWxzZX19dmFyIG5lZz1mYWxzZTtpZihuLmlzTmVnYXRpdmUoKSYmYmFzZS5pc1Bvc2l0aXZlKCkpe25lZz10cnVlO249bi5hYnMoKX1pZihiYXNlLmlzVW5pdCgpKXtpZihuLmlzWmVybygpKXJldHVybnt2YWx1ZTpbMF0saXNOZWdhdGl2ZTpmYWxzZX07cmV0dXJue3ZhbHVlOkFycmF5LmFwcGx5KG51bGwsQXJyYXkobi50b0pTTnVtYmVyKCkpKS5tYXAoTnVtYmVyLnByb3RvdHlwZS52YWx1ZU9mLDEpLGlzTmVnYXRpdmU6bmVnfX12YXIgb3V0PVtdO3ZhciBsZWZ0PW4sZGl2bW9kO3doaWxlKGxlZnQuaXNOZWdhdGl2ZSgpfHxsZWZ0LmNvbXBhcmVBYnMoYmFzZSk+PTApe2Rpdm1vZD1sZWZ0LmRpdm1vZChiYXNlKTtsZWZ0PWRpdm1vZC5xdW90aWVudDt2YXIgZGlnaXQ9ZGl2bW9kLnJlbWFpbmRlcjtpZihkaWdpdC5pc05lZ2F0aXZlKCkpe2RpZ2l0PWJhc2UubWludXMoZGlnaXQpLmFicygpO2xlZnQ9bGVmdC5uZXh0KCl9b3V0LnB1c2goZGlnaXQudG9KU051bWJlcigpKX1vdXQucHVzaChsZWZ0LnRvSlNOdW1iZXIoKSk7cmV0dXJue3ZhbHVlOm91dC5yZXZlcnNlKCksaXNOZWdhdGl2ZTpuZWd9fWZ1bmN0aW9uIHRvQmFzZVN0cmluZyhuLGJhc2UsYWxwaGFiZXQpe3ZhciBhcnI9dG9CYXNlKG4sYmFzZSk7cmV0dXJuKGFyci5pc05lZ2F0aXZlPyItIjoiIikrYXJyLnZhbHVlLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gc3RyaW5naWZ5KHgsYWxwaGFiZXQpfSkuam9pbigiIil9QmlnSW50ZWdlci5wcm90b3R5cGUudG9BcnJheT1mdW5jdGlvbihyYWRpeCl7cmV0dXJuIHRvQmFzZSh0aGlzLHJhZGl4KX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b0FycmF5PWZ1bmN0aW9uKHJhZGl4KXtyZXR1cm4gdG9CYXNlKHRoaXMscmFkaXgpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnRvQXJyYXk9ZnVuY3Rpb24ocmFkaXgpe3JldHVybiB0b0Jhc2UodGhpcyxyYWRpeCl9O0JpZ0ludGVnZXIucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKHJhZGl4LGFscGhhYmV0KXtpZihyYWRpeD09PXVuZGVmaW5lZClyYWRpeD0xMDtpZihyYWRpeCE9PTEwKXJldHVybiB0b0Jhc2VTdHJpbmcodGhpcyxyYWRpeCxhbHBoYWJldCk7dmFyIHY9dGhpcy52YWx1ZSxsPXYubGVuZ3RoLHN0cj1TdHJpbmcodlstLWxdKSx6ZXJvcz0iMDAwMDAwMCIsZGlnaXQ7d2hpbGUoLS1sPj0wKXtkaWdpdD1TdHJpbmcodltsXSk7c3RyKz16ZXJvcy5zbGljZShkaWdpdC5sZW5ndGgpK2RpZ2l0fXZhciBzaWduPXRoaXMuc2lnbj8iLSI6IiI7cmV0dXJuIHNpZ24rc3RyfTtTbWFsbEludGVnZXIucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKHJhZGl4LGFscGhhYmV0KXtpZihyYWRpeD09PXVuZGVmaW5lZClyYWRpeD0xMDtpZihyYWRpeCE9MTApcmV0dXJuIHRvQmFzZVN0cmluZyh0aGlzLHJhZGl4LGFscGhhYmV0KTtyZXR1cm4gU3RyaW5nKHRoaXMudmFsdWUpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnRvU3RyaW5nPVNtYWxsSW50ZWdlci5wcm90b3R5cGUudG9TdHJpbmc7TmF0aXZlQmlnSW50LnByb3RvdHlwZS50b0pTT049QmlnSW50ZWdlci5wcm90b3R5cGUudG9KU09OPVNtYWxsSW50ZWdlci5wcm90b3R5cGUudG9KU09OPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TdHJpbmcoKX07QmlnSW50ZWdlci5wcm90b3R5cGUudmFsdWVPZj1mdW5jdGlvbigpe3JldHVybiBwYXJzZUludCh0aGlzLnRvU3RyaW5nKCksMTApfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS50b0pTTnVtYmVyPUJpZ0ludGVnZXIucHJvdG90eXBlLnZhbHVlT2Y7U21hbGxJbnRlZ2VyLnByb3RvdHlwZS52YWx1ZU9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWV9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUudG9KU051bWJlcj1TbWFsbEludGVnZXIucHJvdG90eXBlLnZhbHVlT2Y7TmF0aXZlQmlnSW50LnByb3RvdHlwZS52YWx1ZU9mPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUudG9KU051bWJlcj1mdW5jdGlvbigpe3JldHVybiBwYXJzZUludCh0aGlzLnRvU3RyaW5nKCksMTApfTtmdW5jdGlvbiBwYXJzZVN0cmluZ1ZhbHVlKHYpe2lmKGlzUHJlY2lzZSgrdikpe3ZhciB4PSt2O2lmKHg9PT10cnVuY2F0ZSh4KSlyZXR1cm4gc3VwcG9ydHNOYXRpdmVCaWdJbnQ/bmV3IE5hdGl2ZUJpZ0ludChCaWdJbnQoeCkpOm5ldyBTbWFsbEludGVnZXIoeCk7dGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIGludGVnZXI6ICIrdil9dmFyIHNpZ249dlswXT09PSItIjtpZihzaWduKXY9di5zbGljZSgxKTt2YXIgc3BsaXQ9di5zcGxpdCgvZS9pKTtpZihzcGxpdC5sZW5ndGg+Mil0aHJvdyBuZXcgRXJyb3IoIkludmFsaWQgaW50ZWdlcjogIitzcGxpdC5qb2luKCJlIikpO2lmKHNwbGl0Lmxlbmd0aD09PTIpe3ZhciBleHA9c3BsaXRbMV07aWYoZXhwWzBdPT09IisiKWV4cD1leHAuc2xpY2UoMSk7ZXhwPStleHA7aWYoZXhwIT09dHJ1bmNhdGUoZXhwKXx8IWlzUHJlY2lzZShleHApKXRocm93IG5ldyBFcnJvcigiSW52YWxpZCBpbnRlZ2VyOiAiK2V4cCsiIGlzIG5vdCBhIHZhbGlkIGV4cG9uZW50LiIpO3ZhciB0ZXh0PXNwbGl0WzBdO3ZhciBkZWNpbWFsUGxhY2U9dGV4dC5pbmRleE9mKCIuIik7aWYoZGVjaW1hbFBsYWNlPj0wKXtleHAtPXRleHQubGVuZ3RoLWRlY2ltYWxQbGFjZS0xO3RleHQ9dGV4dC5zbGljZSgwLGRlY2ltYWxQbGFjZSkrdGV4dC5zbGljZShkZWNpbWFsUGxhY2UrMSl9aWYoZXhwPDApdGhyb3cgbmV3IEVycm9yKCJDYW5ub3QgaW5jbHVkZSBuZWdhdGl2ZSBleHBvbmVudCBwYXJ0IGZvciBpbnRlZ2VycyIpO3RleHQrPW5ldyBBcnJheShleHArMSkuam9pbigiMCIpO3Y9dGV4dH12YXIgaXNWYWxpZD0vXihbMC05XVswLTldKikkLy50ZXN0KHYpO2lmKCFpc1ZhbGlkKXRocm93IG5ldyBFcnJvcigiSW52YWxpZCBpbnRlZ2VyOiAiK3YpO2lmKHN1cHBvcnRzTmF0aXZlQmlnSW50KXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludChCaWdJbnQoc2lnbj8iLSIrdjp2KSl9dmFyIHI9W10sbWF4PXYubGVuZ3RoLGw9TE9HX0JBU0UsbWluPW1heC1sO3doaWxlKG1heD4wKXtyLnB1c2goK3Yuc2xpY2UobWluLG1heCkpO21pbi09bDtpZihtaW48MCltaW49MDttYXgtPWx9dHJpbShyKTtyZXR1cm4gbmV3IEJpZ0ludGVnZXIocixzaWduKX1mdW5jdGlvbiBwYXJzZU51bWJlclZhbHVlKHYpe2lmKHN1cHBvcnRzTmF0aXZlQmlnSW50KXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludChCaWdJbnQodikpfWlmKGlzUHJlY2lzZSh2KSl7aWYodiE9PXRydW5jYXRlKHYpKXRocm93IG5ldyBFcnJvcih2KyIgaXMgbm90IGFuIGludGVnZXIuIik7cmV0dXJuIG5ldyBTbWFsbEludGVnZXIodil9cmV0dXJuIHBhcnNlU3RyaW5nVmFsdWUodi50b1N0cmluZygpKX1mdW5jdGlvbiBwYXJzZVZhbHVlKHYpe2lmKHR5cGVvZiB2PT09Im51bWJlciIpe3JldHVybiBwYXJzZU51bWJlclZhbHVlKHYpfWlmKHR5cGVvZiB2PT09InN0cmluZyIpe3JldHVybiBwYXJzZVN0cmluZ1ZhbHVlKHYpfWlmKHR5cGVvZiB2PT09ImJpZ2ludCIpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHYpfXJldHVybiB2fWZvcih2YXIgaT0wO2k8MWUzO2krKyl7SW50ZWdlcltpXT1wYXJzZVZhbHVlKGkpO2lmKGk+MClJbnRlZ2VyWy1pXT1wYXJzZVZhbHVlKC1pKX1JbnRlZ2VyLm9uZT1JbnRlZ2VyWzFdO0ludGVnZXIuemVybz1JbnRlZ2VyWzBdO0ludGVnZXIubWludXNPbmU9SW50ZWdlclstMV07SW50ZWdlci5tYXg9bWF4O0ludGVnZXIubWluPW1pbjtJbnRlZ2VyLmdjZD1nY2Q7SW50ZWdlci5sY209bGNtO0ludGVnZXIuaXNJbnN0YW5jZT1mdW5jdGlvbih4KXtyZXR1cm4geCBpbnN0YW5jZW9mIEJpZ0ludGVnZXJ8fHggaW5zdGFuY2VvZiBTbWFsbEludGVnZXJ8fHggaW5zdGFuY2VvZiBOYXRpdmVCaWdJbnR9O0ludGVnZXIucmFuZEJldHdlZW49cmFuZEJldHdlZW47SW50ZWdlci5mcm9tQXJyYXk9ZnVuY3Rpb24oZGlnaXRzLGJhc2UsaXNOZWdhdGl2ZSl7cmV0dXJuIHBhcnNlQmFzZUZyb21BcnJheShkaWdpdHMubWFwKHBhcnNlVmFsdWUpLHBhcnNlVmFsdWUoYmFzZXx8MTApLGlzTmVnYXRpdmUpfTtyZXR1cm4gSW50ZWdlcn0oKTtpZih0eXBlb2YgbW9kdWxlIT09InVuZGVmaW5lZCImJm1vZHVsZS5oYXNPd25Qcm9wZXJ0eSgiZXhwb3J0cyIpKXttb2R1bGUuZXhwb3J0cz1iaWdJbnR9aWYodHlwZW9mIGRlZmluZT09PSJmdW5jdGlvbiImJmRlZmluZS5hbWQpe2RlZmluZSgiYmlnLWludGVnZXIiLFtdLGZ1bmN0aW9uKCl7cmV0dXJuIGJpZ0ludH0pfX0se31dLDI2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt9LHt9XSwyNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7InVzZSBzdHJpY3QiO3ZhciBiYXNlNjQ9cmVxdWlyZSgiYmFzZTY0LWpzIik7dmFyIGllZWU3NTQ9cmVxdWlyZSgiaWVlZTc1NCIpO2V4cG9ydHMuQnVmZmVyPUJ1ZmZlcjtleHBvcnRzLlNsb3dCdWZmZXI9U2xvd0J1ZmZlcjtleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTPTUwO3ZhciBLX01BWF9MRU5HVEg9MjE0NzQ4MzY0NztleHBvcnRzLmtNYXhMZW5ndGg9S19NQVhfTEVOR1RIO0J1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUPXR5cGVkQXJyYXlTdXBwb3J0KCk7aWYoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUJiZ0eXBlb2YgY29uc29sZSE9PSJ1bmRlZmluZWQiJiZ0eXBlb2YgY29uc29sZS5lcnJvcj09PSJmdW5jdGlvbiIpe2NvbnNvbGUuZXJyb3IoIlRoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAiKyJgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LiIpfWZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0KCl7dHJ5e3ZhciBhcnI9bmV3IFVpbnQ4QXJyYXkoMSk7YXJyLl9fcHJvdG9fXz17X19wcm90b19fOlVpbnQ4QXJyYXkucHJvdG90eXBlLGZvbzpmdW5jdGlvbigpe3JldHVybiA0Mn19O3JldHVybiBhcnIuZm9vKCk9PT00Mn1jYXRjaChlKXtyZXR1cm4gZmFsc2V9fU9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCJwYXJlbnQiLHtlbnVtZXJhYmxlOnRydWUsZ2V0OmZ1bmN0aW9uKCl7aWYoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSlyZXR1cm4gdW5kZWZpbmVkO3JldHVybiB0aGlzLmJ1ZmZlcn19KTtPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwib2Zmc2V0Iix7ZW51bWVyYWJsZTp0cnVlLGdldDpmdW5jdGlvbigpe2lmKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpcmV0dXJuIHVuZGVmaW5lZDtyZXR1cm4gdGhpcy5ieXRlT2Zmc2V0fX0pO2Z1bmN0aW9uIGNyZWF0ZUJ1ZmZlcihsZW5ndGgpe2lmKGxlbmd0aD5LX01BWF9MRU5HVEgpe3Rocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgIicrbGVuZ3RoKyciIGlzIGludmFsaWQgZm9yIG9wdGlvbiAic2l6ZSInKX12YXIgYnVmPW5ldyBVaW50OEFycmF5KGxlbmd0aCk7YnVmLl9fcHJvdG9fXz1CdWZmZXIucHJvdG90eXBlO3JldHVybiBidWZ9ZnVuY3Rpb24gQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl7aWYodHlwZW9mIGFyZz09PSJudW1iZXIiKXtpZih0eXBlb2YgZW5jb2RpbmdPck9mZnNldD09PSJzdHJpbmciKXt0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgInN0cmluZyIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4gUmVjZWl2ZWQgdHlwZSBudW1iZXInKX1yZXR1cm4gYWxsb2NVbnNhZmUoYXJnKX1yZXR1cm4gZnJvbShhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfWlmKHR5cGVvZiBTeW1ib2whPT0idW5kZWZpbmVkIiYmU3ltYm9sLnNwZWNpZXMhPW51bGwmJkJ1ZmZlcltTeW1ib2wuc3BlY2llc109PT1CdWZmZXIpe09iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsU3ltYm9sLnNwZWNpZXMse3ZhbHVlOm51bGwsY29uZmlndXJhYmxlOnRydWUsZW51bWVyYWJsZTpmYWxzZSx3cml0YWJsZTpmYWxzZX0pfUJ1ZmZlci5wb29sU2l6ZT04MTkyO2Z1bmN0aW9uIGZyb20odmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiB2YWx1ZT09PSJzdHJpbmciKXtyZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSxlbmNvZGluZ09yT2Zmc2V0KX1pZihBcnJheUJ1ZmZlci5pc1ZpZXcodmFsdWUpKXtyZXR1cm4gZnJvbUFycmF5TGlrZSh2YWx1ZSl9aWYodmFsdWU9PW51bGwpe3Rocm93IFR5cGVFcnJvcigiVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgIisib3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgIit0eXBlb2YgdmFsdWUpfWlmKGlzSW5zdGFuY2UodmFsdWUsQXJyYXlCdWZmZXIpfHx2YWx1ZSYmaXNJbnN0YW5jZSh2YWx1ZS5idWZmZXIsQXJyYXlCdWZmZXIpKXtyZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX1pZih0eXBlb2YgdmFsdWU9PT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJ2YWx1ZSIgYXJndW1lbnQgbXVzdCBub3QgYmUgb2YgdHlwZSBudW1iZXIuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJyl9dmFyIHZhbHVlT2Y9dmFsdWUudmFsdWVPZiYmdmFsdWUudmFsdWVPZigpO2lmKHZhbHVlT2YhPW51bGwmJnZhbHVlT2YhPT12YWx1ZSl7cmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlT2YsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfXZhciBiPWZyb21PYmplY3QodmFsdWUpO2lmKGIpcmV0dXJuIGI7aWYodHlwZW9mIFN5bWJvbCE9PSJ1bmRlZmluZWQiJiZTeW1ib2wudG9QcmltaXRpdmUhPW51bGwmJnR5cGVvZiB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdPT09ImZ1bmN0aW9uIil7cmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0oInN0cmluZyIpLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX10aHJvdyBuZXcgVHlwZUVycm9yKCJUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAiKyJvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAiK3R5cGVvZiB2YWx1ZSl9QnVmZmVyLmZyb209ZnVuY3Rpb24odmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe3JldHVybiBmcm9tKHZhbHVlLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX07QnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX189VWludDhBcnJheS5wcm90b3R5cGU7QnVmZmVyLl9fcHJvdG9fXz1VaW50OEFycmF5O2Z1bmN0aW9uIGFzc2VydFNpemUoc2l6ZSl7aWYodHlwZW9mIHNpemUhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcignInNpemUiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBudW1iZXInKX1lbHNlIGlmKHNpemU8MCl7dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSAiJytzaXplKyciIGlzIGludmFsaWQgZm9yIG9wdGlvbiAic2l6ZSInKX19ZnVuY3Rpb24gYWxsb2Moc2l6ZSxmaWxsLGVuY29kaW5nKXthc3NlcnRTaXplKHNpemUpO2lmKHNpemU8PTApe3JldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSl9aWYoZmlsbCE9PXVuZGVmaW5lZCl7cmV0dXJuIHR5cGVvZiBlbmNvZGluZz09PSJzdHJpbmciP2NyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwsZW5jb2RpbmcpOmNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpfXJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSl9QnVmZmVyLmFsbG9jPWZ1bmN0aW9uKHNpemUsZmlsbCxlbmNvZGluZyl7cmV0dXJuIGFsbG9jKHNpemUsZmlsbCxlbmNvZGluZyl9O2Z1bmN0aW9uIGFsbG9jVW5zYWZlKHNpemUpe2Fzc2VydFNpemUoc2l6ZSk7cmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplPDA/MDpjaGVja2VkKHNpemUpfDApfUJ1ZmZlci5hbGxvY1Vuc2FmZT1mdW5jdGlvbihzaXplKXtyZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSl9O0J1ZmZlci5hbGxvY1Vuc2FmZVNsb3c9ZnVuY3Rpb24oc2l6ZSl7cmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpfTtmdW5jdGlvbiBmcm9tU3RyaW5nKHN0cmluZyxlbmNvZGluZyl7aWYodHlwZW9mIGVuY29kaW5nIT09InN0cmluZyJ8fGVuY29kaW5nPT09IiIpe2VuY29kaW5nPSJ1dGY4In1pZighQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJVbmtub3duIGVuY29kaW5nOiAiK2VuY29kaW5nKX12YXIgbGVuZ3RoPWJ5dGVMZW5ndGgoc3RyaW5nLGVuY29kaW5nKXwwO3ZhciBidWY9Y3JlYXRlQnVmZmVyKGxlbmd0aCk7dmFyIGFjdHVhbD1idWYud3JpdGUoc3RyaW5nLGVuY29kaW5nKTtpZihhY3R1YWwhPT1sZW5ndGgpe2J1Zj1idWYuc2xpY2UoMCxhY3R1YWwpfXJldHVybiBidWZ9ZnVuY3Rpb24gZnJvbUFycmF5TGlrZShhcnJheSl7dmFyIGxlbmd0aD1hcnJheS5sZW5ndGg8MD8wOmNoZWNrZWQoYXJyYXkubGVuZ3RoKXwwO3ZhciBidWY9Y3JlYXRlQnVmZmVyKGxlbmd0aCk7Zm9yKHZhciBpPTA7aTxsZW5ndGg7aSs9MSl7YnVmW2ldPWFycmF5W2ldJjI1NX1yZXR1cm4gYnVmfWZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlcihhcnJheSxieXRlT2Zmc2V0LGxlbmd0aCl7aWYoYnl0ZU9mZnNldDwwfHxhcnJheS5ieXRlTGVuZ3RoPGJ5dGVPZmZzZXQpe3Rocm93IG5ldyBSYW5nZUVycm9yKCcib2Zmc2V0IiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKX1pZihhcnJheS5ieXRlTGVuZ3RoPGJ5dGVPZmZzZXQrKGxlbmd0aHx8MCkpe3Rocm93IG5ldyBSYW5nZUVycm9yKCcibGVuZ3RoIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKX12YXIgYnVmO2lmKGJ5dGVPZmZzZXQ9PT11bmRlZmluZWQmJmxlbmd0aD09PXVuZGVmaW5lZCl7YnVmPW5ldyBVaW50OEFycmF5KGFycmF5KX1lbHNlIGlmKGxlbmd0aD09PXVuZGVmaW5lZCl7YnVmPW5ldyBVaW50OEFycmF5KGFycmF5LGJ5dGVPZmZzZXQpfWVsc2V7YnVmPW5ldyBVaW50OEFycmF5KGFycmF5LGJ5dGVPZmZzZXQsbGVuZ3RoKX1idWYuX19wcm90b19fPUJ1ZmZlci5wcm90b3R5cGU7cmV0dXJuIGJ1Zn1mdW5jdGlvbiBmcm9tT2JqZWN0KG9iail7aWYoQnVmZmVyLmlzQnVmZmVyKG9iaikpe3ZhciBsZW49Y2hlY2tlZChvYmoubGVuZ3RoKXwwO3ZhciBidWY9Y3JlYXRlQnVmZmVyKGxlbik7aWYoYnVmLmxlbmd0aD09PTApe3JldHVybiBidWZ9b2JqLmNvcHkoYnVmLDAsMCxsZW4pO3JldHVybiBidWZ9aWYob2JqLmxlbmd0aCE9PXVuZGVmaW5lZCl7aWYodHlwZW9mIG9iai5sZW5ndGghPT0ibnVtYmVyInx8bnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpe3JldHVybiBjcmVhdGVCdWZmZXIoMCl9cmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKX1pZihvYmoudHlwZT09PSJCdWZmZXIiJiZBcnJheS5pc0FycmF5KG9iai5kYXRhKSl7cmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpfX1mdW5jdGlvbiBjaGVja2VkKGxlbmd0aCl7aWYobGVuZ3RoPj1LX01BWF9MRU5HVEgpe3Rocm93IG5ldyBSYW5nZUVycm9yKCJBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICIrInNpemU6IDB4IitLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpKyIgYnl0ZXMiKX1yZXR1cm4gbGVuZ3RofDB9ZnVuY3Rpb24gU2xvd0J1ZmZlcihsZW5ndGgpe2lmKCtsZW5ndGghPWxlbmd0aCl7bGVuZ3RoPTB9cmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKX1CdWZmZXIuaXNCdWZmZXI9ZnVuY3Rpb24gaXNCdWZmZXIoYil7cmV0dXJuIGIhPW51bGwmJmIuX2lzQnVmZmVyPT09dHJ1ZSYmYiE9PUJ1ZmZlci5wcm90b3R5cGV9O0J1ZmZlci5jb21wYXJlPWZ1bmN0aW9uIGNvbXBhcmUoYSxiKXtpZihpc0luc3RhbmNlKGEsVWludDhBcnJheSkpYT1CdWZmZXIuZnJvbShhLGEub2Zmc2V0LGEuYnl0ZUxlbmd0aCk7aWYoaXNJbnN0YW5jZShiLFVpbnQ4QXJyYXkpKWI9QnVmZmVyLmZyb20oYixiLm9mZnNldCxiLmJ5dGVMZW5ndGgpO2lmKCFCdWZmZXIuaXNCdWZmZXIoYSl8fCFCdWZmZXIuaXNCdWZmZXIoYikpe3Rocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSAiYnVmMSIsICJidWYyIiBhcmd1bWVudHMgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheScpfWlmKGE9PT1iKXJldHVybiAwO3ZhciB4PWEubGVuZ3RoO3ZhciB5PWIubGVuZ3RoO2Zvcih2YXIgaT0wLGxlbj1NYXRoLm1pbih4LHkpO2k8bGVuOysraSl7aWYoYVtpXSE9PWJbaV0pe3g9YVtpXTt5PWJbaV07YnJlYWt9fWlmKHg8eSlyZXR1cm4tMTtpZih5PHgpcmV0dXJuIDE7cmV0dXJuIDB9O0J1ZmZlci5pc0VuY29kaW5nPWZ1bmN0aW9uIGlzRW5jb2RpbmcoZW5jb2Rpbmcpe3N3aXRjaChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpe2Nhc2UiaGV4IjpjYXNlInV0ZjgiOmNhc2UidXRmLTgiOmNhc2UiYXNjaWkiOmNhc2UibGF0aW4xIjpjYXNlImJpbmFyeSI6Y2FzZSJiYXNlNjQiOmNhc2UidWNzMiI6Y2FzZSJ1Y3MtMiI6Y2FzZSJ1dGYxNmxlIjpjYXNlInV0Zi0xNmxlIjpyZXR1cm4gdHJ1ZTtkZWZhdWx0OnJldHVybiBmYWxzZX19O0J1ZmZlci5jb25jYXQ9ZnVuY3Rpb24gY29uY2F0KGxpc3QsbGVuZ3RoKXtpZighQXJyYXkuaXNBcnJheShsaXN0KSl7dGhyb3cgbmV3IFR5cGVFcnJvcignImxpc3QiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpfWlmKGxpc3QubGVuZ3RoPT09MCl7cmV0dXJuIEJ1ZmZlci5hbGxvYygwKX12YXIgaTtpZihsZW5ndGg9PT11bmRlZmluZWQpe2xlbmd0aD0wO2ZvcihpPTA7aTxsaXN0Lmxlbmd0aDsrK2kpe2xlbmd0aCs9bGlzdFtpXS5sZW5ndGh9fXZhciBidWZmZXI9QnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aCk7dmFyIHBvcz0wO2ZvcihpPTA7aTxsaXN0Lmxlbmd0aDsrK2kpe3ZhciBidWY9bGlzdFtpXTtpZihpc0luc3RhbmNlKGJ1ZixVaW50OEFycmF5KSl7YnVmPUJ1ZmZlci5mcm9tKGJ1Zil9aWYoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKXt0aHJvdyBuZXcgVHlwZUVycm9yKCcibGlzdCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJyl9YnVmLmNvcHkoYnVmZmVyLHBvcyk7cG9zKz1idWYubGVuZ3RofXJldHVybiBidWZmZXJ9O2Z1bmN0aW9uIGJ5dGVMZW5ndGgoc3RyaW5nLGVuY29kaW5nKXtpZihCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSl7cmV0dXJuIHN0cmluZy5sZW5ndGh9aWYoQXJyYXlCdWZmZXIuaXNWaWV3KHN0cmluZyl8fGlzSW5zdGFuY2Uoc3RyaW5nLEFycmF5QnVmZmVyKSl7cmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RofWlmKHR5cGVvZiBzdHJpbmchPT0ic3RyaW5nIil7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJzdHJpbmciIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIG9yIEFycmF5QnVmZmVyLiAnKyJSZWNlaXZlZCB0eXBlICIrdHlwZW9mIHN0cmluZyl9dmFyIGxlbj1zdHJpbmcubGVuZ3RoO3ZhciBtdXN0TWF0Y2g9YXJndW1lbnRzLmxlbmd0aD4yJiZhcmd1bWVudHNbMl09PT10cnVlO2lmKCFtdXN0TWF0Y2gmJmxlbj09PTApcmV0dXJuIDA7dmFyIGxvd2VyZWRDYXNlPWZhbHNlO2Zvcig7Oyl7c3dpdGNoKGVuY29kaW5nKXtjYXNlImFzY2lpIjpjYXNlImxhdGluMSI6Y2FzZSJiaW5hcnkiOnJldHVybiBsZW47Y2FzZSJ1dGY4IjpjYXNlInV0Zi04IjpyZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGg7Y2FzZSJ1Y3MyIjpjYXNlInVjcy0yIjpjYXNlInV0ZjE2bGUiOmNhc2UidXRmLTE2bGUiOnJldHVybiBsZW4qMjtjYXNlImhleCI6cmV0dXJuIGxlbj4+PjE7Y2FzZSJiYXNlNjQiOnJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoO2RlZmF1bHQ6aWYobG93ZXJlZENhc2Upe3JldHVybiBtdXN0TWF0Y2g/LTE6dXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGh9ZW5jb2Rpbmc9KCIiK2VuY29kaW5nKS50b0xvd2VyQ2FzZSgpO2xvd2VyZWRDYXNlPXRydWV9fX1CdWZmZXIuYnl0ZUxlbmd0aD1ieXRlTGVuZ3RoO2Z1bmN0aW9uIHNsb3dUb1N0cmluZyhlbmNvZGluZyxzdGFydCxlbmQpe3ZhciBsb3dlcmVkQ2FzZT1mYWxzZTtpZihzdGFydD09PXVuZGVmaW5lZHx8c3RhcnQ8MCl7c3RhcnQ9MH1pZihzdGFydD50aGlzLmxlbmd0aCl7cmV0dXJuIiJ9aWYoZW5kPT09dW5kZWZpbmVkfHxlbmQ+dGhpcy5sZW5ndGgpe2VuZD10aGlzLmxlbmd0aH1pZihlbmQ8PTApe3JldHVybiIifWVuZD4+Pj0wO3N0YXJ0Pj4+PTA7aWYoZW5kPD1zdGFydCl7cmV0dXJuIiJ9aWYoIWVuY29kaW5nKWVuY29kaW5nPSJ1dGY4Ijt3aGlsZSh0cnVlKXtzd2l0Y2goZW5jb2Rpbmcpe2Nhc2UiaGV4IjpyZXR1cm4gaGV4U2xpY2UodGhpcyxzdGFydCxlbmQpO2Nhc2UidXRmOCI6Y2FzZSJ1dGYtOCI6cmV0dXJuIHV0ZjhTbGljZSh0aGlzLHN0YXJ0LGVuZCk7Y2FzZSJhc2NpaSI6cmV0dXJuIGFzY2lpU2xpY2UodGhpcyxzdGFydCxlbmQpO2Nhc2UibGF0aW4xIjpjYXNlImJpbmFyeSI6cmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsc3RhcnQsZW5kKTtjYXNlImJhc2U2NCI6cmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsc3RhcnQsZW5kKTtjYXNlInVjczIiOmNhc2UidWNzLTIiOmNhc2UidXRmMTZsZSI6Y2FzZSJ1dGYtMTZsZSI6cmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLHN0YXJ0LGVuZCk7ZGVmYXVsdDppZihsb3dlcmVkQ2FzZSl0aHJvdyBuZXcgVHlwZUVycm9yKCJVbmtub3duIGVuY29kaW5nOiAiK2VuY29kaW5nKTtlbmNvZGluZz0oZW5jb2RpbmcrIiIpLnRvTG93ZXJDYXNlKCk7bG93ZXJlZENhc2U9dHJ1ZX19fUJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyPXRydWU7ZnVuY3Rpb24gc3dhcChiLG4sbSl7dmFyIGk9YltuXTtiW25dPWJbbV07YlttXT1pfUJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2PWZ1bmN0aW9uIHN3YXAxNigpe3ZhciBsZW49dGhpcy5sZW5ndGg7aWYobGVuJTIhPT0wKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigiQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMiKX1mb3IodmFyIGk9MDtpPGxlbjtpKz0yKXtzd2FwKHRoaXMsaSxpKzEpfXJldHVybiB0aGlzfTtCdWZmZXIucHJvdG90eXBlLnN3YXAzMj1mdW5jdGlvbiBzd2FwMzIoKXt2YXIgbGVuPXRoaXMubGVuZ3RoO2lmKGxlbiU0IT09MCl7dGhyb3cgbmV3IFJhbmdlRXJyb3IoIkJ1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzIil9Zm9yKHZhciBpPTA7aTxsZW47aSs9NCl7c3dhcCh0aGlzLGksaSszKTtzd2FwKHRoaXMsaSsxLGkrMil9cmV0dXJuIHRoaXN9O0J1ZmZlci5wcm90b3R5cGUuc3dhcDY0PWZ1bmN0aW9uIHN3YXA2NCgpe3ZhciBsZW49dGhpcy5sZW5ndGg7aWYobGVuJTghPT0wKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigiQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMiKX1mb3IodmFyIGk9MDtpPGxlbjtpKz04KXtzd2FwKHRoaXMsaSxpKzcpO3N3YXAodGhpcyxpKzEsaSs2KTtzd2FwKHRoaXMsaSsyLGkrNSk7c3dhcCh0aGlzLGkrMyxpKzQpfXJldHVybiB0aGlzfTtCdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uIHRvU3RyaW5nKCl7dmFyIGxlbmd0aD10aGlzLmxlbmd0aDtpZihsZW5ndGg9PT0wKXJldHVybiIiO2lmKGFyZ3VtZW50cy5sZW5ndGg9PT0wKXJldHVybiB1dGY4U2xpY2UodGhpcywwLGxlbmd0aCk7cmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLGFyZ3VtZW50cyl9O0J1ZmZlci5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmc9QnVmZmVyLnByb3RvdHlwZS50b1N0cmluZztCdWZmZXIucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbiBlcXVhbHMoYil7aWYoIUJ1ZmZlci5pc0J1ZmZlcihiKSl0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIik7aWYodGhpcz09PWIpcmV0dXJuIHRydWU7cmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsYik9PT0wfTtCdWZmZXIucHJvdG90eXBlLmluc3BlY3Q9ZnVuY3Rpb24gaW5zcGVjdCgpe3ZhciBzdHI9IiI7dmFyIG1heD1leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTO3N0cj10aGlzLnRvU3RyaW5nKCJoZXgiLDAsbWF4KS5yZXBsYWNlKC8oLnsyfSkvZywiJDEgIikudHJpbSgpO2lmKHRoaXMubGVuZ3RoPm1heClzdHIrPSIgLi4uICI7cmV0dXJuIjxCdWZmZXIgIitzdHIrIj4ifTtCdWZmZXIucHJvdG90eXBlLmNvbXBhcmU9ZnVuY3Rpb24gY29tcGFyZSh0YXJnZXQsc3RhcnQsZW5kLHRoaXNTdGFydCx0aGlzRW5kKXtpZihpc0luc3RhbmNlKHRhcmdldCxVaW50OEFycmF5KSl7dGFyZ2V0PUJ1ZmZlci5mcm9tKHRhcmdldCx0YXJnZXQub2Zmc2V0LHRhcmdldC5ieXRlTGVuZ3RoKX1pZighQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpe3Rocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSAidGFyZ2V0IiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5LiAnKyJSZWNlaXZlZCB0eXBlICIrdHlwZW9mIHRhcmdldCl9aWYoc3RhcnQ9PT11bmRlZmluZWQpe3N0YXJ0PTB9aWYoZW5kPT09dW5kZWZpbmVkKXtlbmQ9dGFyZ2V0P3RhcmdldC5sZW5ndGg6MH1pZih0aGlzU3RhcnQ9PT11bmRlZmluZWQpe3RoaXNTdGFydD0wfWlmKHRoaXNFbmQ9PT11bmRlZmluZWQpe3RoaXNFbmQ9dGhpcy5sZW5ndGh9aWYoc3RhcnQ8MHx8ZW5kPnRhcmdldC5sZW5ndGh8fHRoaXNTdGFydDwwfHx0aGlzRW5kPnRoaXMubGVuZ3RoKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigib3V0IG9mIHJhbmdlIGluZGV4Iil9aWYodGhpc1N0YXJ0Pj10aGlzRW5kJiZzdGFydD49ZW5kKXtyZXR1cm4gMH1pZih0aGlzU3RhcnQ+PXRoaXNFbmQpe3JldHVybi0xfWlmKHN0YXJ0Pj1lbmQpe3JldHVybiAxfXN0YXJ0Pj4+PTA7ZW5kPj4+PTA7dGhpc1N0YXJ0Pj4+PTA7dGhpc0VuZD4+Pj0wO2lmKHRoaXM9PT10YXJnZXQpcmV0dXJuIDA7dmFyIHg9dGhpc0VuZC10aGlzU3RhcnQ7dmFyIHk9ZW5kLXN0YXJ0O3ZhciBsZW49TWF0aC5taW4oeCx5KTt2YXIgdGhpc0NvcHk9dGhpcy5zbGljZSh0aGlzU3RhcnQsdGhpc0VuZCk7dmFyIHRhcmdldENvcHk9dGFyZ2V0LnNsaWNlKHN0YXJ0LGVuZCk7Zm9yKHZhciBpPTA7aTxsZW47KytpKXtpZih0aGlzQ29weVtpXSE9PXRhcmdldENvcHlbaV0pe3g9dGhpc0NvcHlbaV07eT10YXJnZXRDb3B5W2ldO2JyZWFrfX1pZih4PHkpcmV0dXJuLTE7aWYoeTx4KXJldHVybiAxO3JldHVybiAwfTtmdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZihidWZmZXIsdmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZGlyKXtpZihidWZmZXIubGVuZ3RoPT09MClyZXR1cm4tMTtpZih0eXBlb2YgYnl0ZU9mZnNldD09PSJzdHJpbmciKXtlbmNvZGluZz1ieXRlT2Zmc2V0O2J5dGVPZmZzZXQ9MH1lbHNlIGlmKGJ5dGVPZmZzZXQ+MjE0NzQ4MzY0Nyl7Ynl0ZU9mZnNldD0yMTQ3NDgzNjQ3fWVsc2UgaWYoYnl0ZU9mZnNldDwtMjE0NzQ4MzY0OCl7Ynl0ZU9mZnNldD0tMjE0NzQ4MzY0OH1ieXRlT2Zmc2V0PStieXRlT2Zmc2V0O2lmKG51bWJlcklzTmFOKGJ5dGVPZmZzZXQpKXtieXRlT2Zmc2V0PWRpcj8wOmJ1ZmZlci5sZW5ndGgtMX1pZihieXRlT2Zmc2V0PDApYnl0ZU9mZnNldD1idWZmZXIubGVuZ3RoK2J5dGVPZmZzZXQ7aWYoYnl0ZU9mZnNldD49YnVmZmVyLmxlbmd0aCl7aWYoZGlyKXJldHVybi0xO2Vsc2UgYnl0ZU9mZnNldD1idWZmZXIubGVuZ3RoLTF9ZWxzZSBpZihieXRlT2Zmc2V0PDApe2lmKGRpcilieXRlT2Zmc2V0PTA7ZWxzZSByZXR1cm4tMX1pZih0eXBlb2YgdmFsPT09InN0cmluZyIpe3ZhbD1CdWZmZXIuZnJvbSh2YWwsZW5jb2RpbmcpfWlmKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKXtpZih2YWwubGVuZ3RoPT09MCl7cmV0dXJuLTF9cmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsdmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZGlyKX1lbHNlIGlmKHR5cGVvZiB2YWw9PT0ibnVtYmVyIil7dmFsPXZhbCYyNTU7aWYodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2Y9PT0iZnVuY3Rpb24iKXtpZihkaXIpe3JldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLHZhbCxieXRlT2Zmc2V0KX1lbHNle3JldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlcix2YWwsYnl0ZU9mZnNldCl9fXJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLFt2YWxdLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZGlyKX10aHJvdyBuZXcgVHlwZUVycm9yKCJ2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXIiKX1mdW5jdGlvbiBhcnJheUluZGV4T2YoYXJyLHZhbCxieXRlT2Zmc2V0LGVuY29kaW5nLGRpcil7dmFyIGluZGV4U2l6ZT0xO3ZhciBhcnJMZW5ndGg9YXJyLmxlbmd0aDt2YXIgdmFsTGVuZ3RoPXZhbC5sZW5ndGg7aWYoZW5jb2RpbmchPT11bmRlZmluZWQpe2VuY29kaW5nPVN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKTtpZihlbmNvZGluZz09PSJ1Y3MyInx8ZW5jb2Rpbmc9PT0idWNzLTIifHxlbmNvZGluZz09PSJ1dGYxNmxlInx8ZW5jb2Rpbmc9PT0idXRmLTE2bGUiKXtpZihhcnIubGVuZ3RoPDJ8fHZhbC5sZW5ndGg8Mil7cmV0dXJuLTF9aW5kZXhTaXplPTI7YXJyTGVuZ3RoLz0yO3ZhbExlbmd0aC89MjtieXRlT2Zmc2V0Lz0yfX1mdW5jdGlvbiByZWFkKGJ1ZixpKXtpZihpbmRleFNpemU9PT0xKXtyZXR1cm4gYnVmW2ldfWVsc2V7cmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSppbmRleFNpemUpfX12YXIgaTtpZihkaXIpe3ZhciBmb3VuZEluZGV4PS0xO2ZvcihpPWJ5dGVPZmZzZXQ7aTxhcnJMZW5ndGg7aSsrKXtpZihyZWFkKGFycixpKT09PXJlYWQodmFsLGZvdW5kSW5kZXg9PT0tMT8wOmktZm91bmRJbmRleCkpe2lmKGZvdW5kSW5kZXg9PT0tMSlmb3VuZEluZGV4PWk7aWYoaS1mb3VuZEluZGV4KzE9PT12YWxMZW5ndGgpcmV0dXJuIGZvdW5kSW5kZXgqaW5kZXhTaXplfWVsc2V7aWYoZm91bmRJbmRleCE9PS0xKWktPWktZm91bmRJbmRleDtmb3VuZEluZGV4PS0xfX19ZWxzZXtpZihieXRlT2Zmc2V0K3ZhbExlbmd0aD5hcnJMZW5ndGgpYnl0ZU9mZnNldD1hcnJMZW5ndGgtdmFsTGVuZ3RoO2ZvcihpPWJ5dGVPZmZzZXQ7aT49MDtpLS0pe3ZhciBmb3VuZD10cnVlO2Zvcih2YXIgaj0wO2o8dmFsTGVuZ3RoO2orKyl7aWYocmVhZChhcnIsaStqKSE9PXJlYWQodmFsLGopKXtmb3VuZD1mYWxzZTticmVha319aWYoZm91bmQpcmV0dXJuIGl9fXJldHVybi0xfUJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXM9ZnVuY3Rpb24gaW5jbHVkZXModmFsLGJ5dGVPZmZzZXQsZW5jb2Rpbmcpe3JldHVybiB0aGlzLmluZGV4T2YodmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcpIT09LTF9O0J1ZmZlci5wcm90b3R5cGUuaW5kZXhPZj1mdW5jdGlvbiBpbmRleE9mKHZhbCxieXRlT2Zmc2V0LGVuY29kaW5nKXtyZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcyx2YWwsYnl0ZU9mZnNldCxlbmNvZGluZyx0cnVlKX07QnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZj1mdW5jdGlvbiBsYXN0SW5kZXhPZih2YWwsYnl0ZU9mZnNldCxlbmNvZGluZyl7cmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsdmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZmFsc2UpfTtmdW5jdGlvbiBoZXhXcml0ZShidWYsc3RyaW5nLG9mZnNldCxsZW5ndGgpe29mZnNldD1OdW1iZXIob2Zmc2V0KXx8MDt2YXIgcmVtYWluaW5nPWJ1Zi5sZW5ndGgtb2Zmc2V0O2lmKCFsZW5ndGgpe2xlbmd0aD1yZW1haW5pbmd9ZWxzZXtsZW5ndGg9TnVtYmVyKGxlbmd0aCk7aWYobGVuZ3RoPnJlbWFpbmluZyl7bGVuZ3RoPXJlbWFpbmluZ319dmFyIHN0ckxlbj1zdHJpbmcubGVuZ3RoO2lmKGxlbmd0aD5zdHJMZW4vMil7bGVuZ3RoPXN0ckxlbi8yfWZvcih2YXIgaT0wO2k8bGVuZ3RoOysraSl7dmFyIHBhcnNlZD1wYXJzZUludChzdHJpbmcuc3Vic3RyKGkqMiwyKSwxNik7aWYobnVtYmVySXNOYU4ocGFyc2VkKSlyZXR1cm4gaTtidWZbb2Zmc2V0K2ldPXBhcnNlZH1yZXR1cm4gaX1mdW5jdGlvbiB1dGY4V3JpdGUoYnVmLHN0cmluZyxvZmZzZXQsbGVuZ3RoKXtyZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsYnVmLmxlbmd0aC1vZmZzZXQpLGJ1ZixvZmZzZXQsbGVuZ3RoKX1mdW5jdGlvbiBhc2NpaVdyaXRlKGJ1ZixzdHJpbmcsb2Zmc2V0LGxlbmd0aCl7cmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksYnVmLG9mZnNldCxsZW5ndGgpfWZ1bmN0aW9uIGxhdGluMVdyaXRlKGJ1ZixzdHJpbmcsb2Zmc2V0LGxlbmd0aCl7cmV0dXJuIGFzY2lpV3JpdGUoYnVmLHN0cmluZyxvZmZzZXQsbGVuZ3RoKX1mdW5jdGlvbiBiYXNlNjRXcml0ZShidWYsc3RyaW5nLG9mZnNldCxsZW5ndGgpe3JldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSxidWYsb2Zmc2V0LGxlbmd0aCl9ZnVuY3Rpb24gdWNzMldyaXRlKGJ1ZixzdHJpbmcsb2Zmc2V0LGxlbmd0aCl7cmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLGJ1Zi5sZW5ndGgtb2Zmc2V0KSxidWYsb2Zmc2V0LGxlbmd0aCl9QnVmZmVyLnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbiB3cml0ZShzdHJpbmcsb2Zmc2V0LGxlbmd0aCxlbmNvZGluZyl7aWYob2Zmc2V0PT09dW5kZWZpbmVkKXtlbmNvZGluZz0idXRmOCI7bGVuZ3RoPXRoaXMubGVuZ3RoO29mZnNldD0wfWVsc2UgaWYobGVuZ3RoPT09dW5kZWZpbmVkJiZ0eXBlb2Ygb2Zmc2V0PT09InN0cmluZyIpe2VuY29kaW5nPW9mZnNldDtsZW5ndGg9dGhpcy5sZW5ndGg7b2Zmc2V0PTB9ZWxzZSBpZihpc0Zpbml0ZShvZmZzZXQpKXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZihpc0Zpbml0ZShsZW5ndGgpKXtsZW5ndGg9bGVuZ3RoPj4+MDtpZihlbmNvZGluZz09PXVuZGVmaW5lZCllbmNvZGluZz0idXRmOCJ9ZWxzZXtlbmNvZGluZz1sZW5ndGg7bGVuZ3RoPXVuZGVmaW5lZH19ZWxzZXt0aHJvdyBuZXcgRXJyb3IoIkJ1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkIil9dmFyIHJlbWFpbmluZz10aGlzLmxlbmd0aC1vZmZzZXQ7aWYobGVuZ3RoPT09dW5kZWZpbmVkfHxsZW5ndGg+cmVtYWluaW5nKWxlbmd0aD1yZW1haW5pbmc7aWYoc3RyaW5nLmxlbmd0aD4wJiYobGVuZ3RoPDB8fG9mZnNldDwwKXx8b2Zmc2V0PnRoaXMubGVuZ3RoKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigiQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMiKX1pZighZW5jb2RpbmcpZW5jb2Rpbmc9InV0ZjgiO3ZhciBsb3dlcmVkQ2FzZT1mYWxzZTtmb3IoOzspe3N3aXRjaChlbmNvZGluZyl7Y2FzZSJoZXgiOnJldHVybiBoZXhXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtjYXNlInV0ZjgiOmNhc2UidXRmLTgiOnJldHVybiB1dGY4V3JpdGUodGhpcyxzdHJpbmcsb2Zmc2V0LGxlbmd0aCk7Y2FzZSJhc2NpaSI6cmV0dXJuIGFzY2lpV3JpdGUodGhpcyxzdHJpbmcsb2Zmc2V0LGxlbmd0aCk7Y2FzZSJsYXRpbjEiOmNhc2UiYmluYXJ5IjpyZXR1cm4gbGF0aW4xV3JpdGUodGhpcyxzdHJpbmcsb2Zmc2V0LGxlbmd0aCk7Y2FzZSJiYXNlNjQiOnJldHVybiBiYXNlNjRXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtjYXNlInVjczIiOmNhc2UidWNzLTIiOmNhc2UidXRmMTZsZSI6Y2FzZSJ1dGYtMTZsZSI6cmV0dXJuIHVjczJXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtkZWZhdWx0OmlmKGxvd2VyZWRDYXNlKXRocm93IG5ldyBUeXBlRXJyb3IoIlVua25vd24gZW5jb2Rpbmc6ICIrZW5jb2RpbmcpO2VuY29kaW5nPSgiIitlbmNvZGluZykudG9Mb3dlckNhc2UoKTtsb3dlcmVkQ2FzZT10cnVlfX19O0J1ZmZlci5wcm90b3R5cGUudG9KU09OPWZ1bmN0aW9uIHRvSlNPTigpe3JldHVybnt0eXBlOiJCdWZmZXIiLGRhdGE6QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyfHx0aGlzLDApfX07ZnVuY3Rpb24gYmFzZTY0U2xpY2UoYnVmLHN0YXJ0LGVuZCl7aWYoc3RhcnQ9PT0wJiZlbmQ9PT1idWYubGVuZ3RoKXtyZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKX1lbHNle3JldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsZW5kKSl9fWZ1bmN0aW9uIHV0ZjhTbGljZShidWYsc3RhcnQsZW5kKXtlbmQ9TWF0aC5taW4oYnVmLmxlbmd0aCxlbmQpO3ZhciByZXM9W107dmFyIGk9c3RhcnQ7d2hpbGUoaTxlbmQpe3ZhciBmaXJzdEJ5dGU9YnVmW2ldO3ZhciBjb2RlUG9pbnQ9bnVsbDt2YXIgYnl0ZXNQZXJTZXF1ZW5jZT1maXJzdEJ5dGU+MjM5PzQ6Zmlyc3RCeXRlPjIyMz8zOmZpcnN0Qnl0ZT4xOTE/MjoxO2lmKGkrYnl0ZXNQZXJTZXF1ZW5jZTw9ZW5kKXt2YXIgc2Vjb25kQnl0ZSx0aGlyZEJ5dGUsZm91cnRoQnl0ZSx0ZW1wQ29kZVBvaW50O3N3aXRjaChieXRlc1BlclNlcXVlbmNlKXtjYXNlIDE6aWYoZmlyc3RCeXRlPDEyOCl7Y29kZVBvaW50PWZpcnN0Qnl0ZX1icmVhaztjYXNlIDI6c2Vjb25kQnl0ZT1idWZbaSsxXTtpZigoc2Vjb25kQnl0ZSYxOTIpPT09MTI4KXt0ZW1wQ29kZVBvaW50PShmaXJzdEJ5dGUmMzEpPDw2fHNlY29uZEJ5dGUmNjM7aWYodGVtcENvZGVQb2ludD4xMjcpe2NvZGVQb2ludD10ZW1wQ29kZVBvaW50fX1icmVhaztjYXNlIDM6c2Vjb25kQnl0ZT1idWZbaSsxXTt0aGlyZEJ5dGU9YnVmW2krMl07aWYoKHNlY29uZEJ5dGUmMTkyKT09PTEyOCYmKHRoaXJkQnl0ZSYxOTIpPT09MTI4KXt0ZW1wQ29kZVBvaW50PShmaXJzdEJ5dGUmMTUpPDwxMnwoc2Vjb25kQnl0ZSY2Myk8PDZ8dGhpcmRCeXRlJjYzO2lmKHRlbXBDb2RlUG9pbnQ+MjA0NyYmKHRlbXBDb2RlUG9pbnQ8NTUyOTZ8fHRlbXBDb2RlUG9pbnQ+NTczNDMpKXtjb2RlUG9pbnQ9dGVtcENvZGVQb2ludH19YnJlYWs7Y2FzZSA0OnNlY29uZEJ5dGU9YnVmW2krMV07dGhpcmRCeXRlPWJ1ZltpKzJdO2ZvdXJ0aEJ5dGU9YnVmW2krM107aWYoKHNlY29uZEJ5dGUmMTkyKT09PTEyOCYmKHRoaXJkQnl0ZSYxOTIpPT09MTI4JiYoZm91cnRoQnl0ZSYxOTIpPT09MTI4KXt0ZW1wQ29kZVBvaW50PShmaXJzdEJ5dGUmMTUpPDwxOHwoc2Vjb25kQnl0ZSY2Myk8PDEyfCh0aGlyZEJ5dGUmNjMpPDw2fGZvdXJ0aEJ5dGUmNjM7aWYodGVtcENvZGVQb2ludD42NTUzNSYmdGVtcENvZGVQb2ludDwxMTE0MTEyKXtjb2RlUG9pbnQ9dGVtcENvZGVQb2ludH19fX1pZihjb2RlUG9pbnQ9PT1udWxsKXtjb2RlUG9pbnQ9NjU1MzM7Ynl0ZXNQZXJTZXF1ZW5jZT0xfWVsc2UgaWYoY29kZVBvaW50PjY1NTM1KXtjb2RlUG9pbnQtPTY1NTM2O3Jlcy5wdXNoKGNvZGVQb2ludD4+PjEwJjEwMjN8NTUyOTYpO2NvZGVQb2ludD01NjMyMHxjb2RlUG9pbnQmMTAyM31yZXMucHVzaChjb2RlUG9pbnQpO2krPWJ5dGVzUGVyU2VxdWVuY2V9cmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpfXZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSD00MDk2O2Z1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheShjb2RlUG9pbnRzKXt2YXIgbGVuPWNvZGVQb2ludHMubGVuZ3RoO2lmKGxlbjw9TUFYX0FSR1VNRU5UU19MRU5HVEgpe3JldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZyxjb2RlUG9pbnRzKX12YXIgcmVzPSIiO3ZhciBpPTA7d2hpbGUoaTxsZW4pe3Jlcys9U3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsY29kZVBvaW50cy5zbGljZShpLGkrPU1BWF9BUkdVTUVOVFNfTEVOR1RIKSl9cmV0dXJuIHJlc31mdW5jdGlvbiBhc2NpaVNsaWNlKGJ1ZixzdGFydCxlbmQpe3ZhciByZXQ9IiI7ZW5kPU1hdGgubWluKGJ1Zi5sZW5ndGgsZW5kKTtmb3IodmFyIGk9c3RhcnQ7aTxlbmQ7KytpKXtyZXQrPVN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldJjEyNyl9cmV0dXJuIHJldH1mdW5jdGlvbiBsYXRpbjFTbGljZShidWYsc3RhcnQsZW5kKXt2YXIgcmV0PSIiO2VuZD1NYXRoLm1pbihidWYubGVuZ3RoLGVuZCk7Zm9yKHZhciBpPXN0YXJ0O2k8ZW5kOysraSl7cmV0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSl9cmV0dXJuIHJldH1mdW5jdGlvbiBoZXhTbGljZShidWYsc3RhcnQsZW5kKXt2YXIgbGVuPWJ1Zi5sZW5ndGg7aWYoIXN0YXJ0fHxzdGFydDwwKXN0YXJ0PTA7aWYoIWVuZHx8ZW5kPDB8fGVuZD5sZW4pZW5kPWxlbjt2YXIgb3V0PSIiO2Zvcih2YXIgaT1zdGFydDtpPGVuZDsrK2kpe291dCs9dG9IZXgoYnVmW2ldKX1yZXR1cm4gb3V0fWZ1bmN0aW9uIHV0ZjE2bGVTbGljZShidWYsc3RhcnQsZW5kKXt2YXIgYnl0ZXM9YnVmLnNsaWNlKHN0YXJ0LGVuZCk7dmFyIHJlcz0iIjtmb3IodmFyIGk9MDtpPGJ5dGVzLmxlbmd0aDtpKz0yKXtyZXMrPVN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0rYnl0ZXNbaSsxXSoyNTYpfXJldHVybiByZXN9QnVmZmVyLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbiBzbGljZShzdGFydCxlbmQpe3ZhciBsZW49dGhpcy5sZW5ndGg7c3RhcnQ9fn5zdGFydDtlbmQ9ZW5kPT09dW5kZWZpbmVkP2xlbjp+fmVuZDtpZihzdGFydDwwKXtzdGFydCs9bGVuO2lmKHN0YXJ0PDApc3RhcnQ9MH1lbHNlIGlmKHN0YXJ0Pmxlbil7c3RhcnQ9bGVufWlmKGVuZDwwKXtlbmQrPWxlbjtpZihlbmQ8MCllbmQ9MH1lbHNlIGlmKGVuZD5sZW4pe2VuZD1sZW59aWYoZW5kPHN0YXJ0KWVuZD1zdGFydDt2YXIgbmV3QnVmPXRoaXMuc3ViYXJyYXkoc3RhcnQsZW5kKTtuZXdCdWYuX19wcm90b19fPUJ1ZmZlci5wcm90b3R5cGU7cmV0dXJuIG5ld0J1Zn07ZnVuY3Rpb24gY2hlY2tPZmZzZXQob2Zmc2V0LGV4dCxsZW5ndGgpe2lmKG9mZnNldCUxIT09MHx8b2Zmc2V0PDApdGhyb3cgbmV3IFJhbmdlRXJyb3IoIm9mZnNldCBpcyBub3QgdWludCIpO2lmKG9mZnNldCtleHQ+bGVuZ3RoKXRocm93IG5ldyBSYW5nZUVycm9yKCJUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoIil9QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFPWZ1bmN0aW9uIHJlYWRVSW50TEUob2Zmc2V0LGJ5dGVMZW5ndGgsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCxieXRlTGVuZ3RoLHRoaXMubGVuZ3RoKTt2YXIgdmFsPXRoaXNbb2Zmc2V0XTt2YXIgbXVsPTE7dmFyIGk9MDt3aGlsZSgrK2k8Ynl0ZUxlbmd0aCYmKG11bCo9MjU2KSl7dmFsKz10aGlzW29mZnNldCtpXSptdWx9cmV0dXJuIHZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFPWZ1bmN0aW9uIHJlYWRVSW50QkUob2Zmc2V0LGJ5dGVMZW5ndGgsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KXtjaGVja09mZnNldChvZmZzZXQsYnl0ZUxlbmd0aCx0aGlzLmxlbmd0aCl9dmFyIHZhbD10aGlzW29mZnNldCstLWJ5dGVMZW5ndGhdO3ZhciBtdWw9MTt3aGlsZShieXRlTGVuZ3RoPjAmJihtdWwqPTI1Nikpe3ZhbCs9dGhpc1tvZmZzZXQrLS1ieXRlTGVuZ3RoXSptdWx9cmV0dXJuIHZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDg9ZnVuY3Rpb24gcmVhZFVJbnQ4KG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCwxLHRoaXMubGVuZ3RoKTtyZXR1cm4gdGhpc1tvZmZzZXRdfTtCdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRT1mdW5jdGlvbiByZWFkVUludDE2TEUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDIsdGhpcy5sZW5ndGgpO3JldHVybiB0aGlzW29mZnNldF18dGhpc1tvZmZzZXQrMV08PDh9O0J1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFPWZ1bmN0aW9uIHJlYWRVSW50MTZCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsMix0aGlzLmxlbmd0aCk7cmV0dXJuIHRoaXNbb2Zmc2V0XTw8OHx0aGlzW29mZnNldCsxXX07QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEU9ZnVuY3Rpb24gcmVhZFVJbnQzMkxFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCw0LHRoaXMubGVuZ3RoKTtyZXR1cm4odGhpc1tvZmZzZXRdfHRoaXNbb2Zmc2V0KzFdPDw4fHRoaXNbb2Zmc2V0KzJdPDwxNikrdGhpc1tvZmZzZXQrM10qMTY3NzcyMTZ9O0J1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFPWZ1bmN0aW9uIHJlYWRVSW50MzJCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsNCx0aGlzLmxlbmd0aCk7cmV0dXJuIHRoaXNbb2Zmc2V0XSoxNjc3NzIxNisodGhpc1tvZmZzZXQrMV08PDE2fHRoaXNbb2Zmc2V0KzJdPDw4fHRoaXNbb2Zmc2V0KzNdKX07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEU9ZnVuY3Rpb24gcmVhZEludExFKG9mZnNldCxieXRlTGVuZ3RoLG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtieXRlTGVuZ3RoPWJ5dGVMZW5ndGg+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsYnl0ZUxlbmd0aCx0aGlzLmxlbmd0aCk7dmFyIHZhbD10aGlzW29mZnNldF07dmFyIG11bD0xO3ZhciBpPTA7d2hpbGUoKytpPGJ5dGVMZW5ndGgmJihtdWwqPTI1Nikpe3ZhbCs9dGhpc1tvZmZzZXQraV0qbXVsfW11bCo9MTI4O2lmKHZhbD49bXVsKXZhbC09TWF0aC5wb3coMiw4KmJ5dGVMZW5ndGgpO3JldHVybiB2YWx9O0J1ZmZlci5wcm90b3R5cGUucmVhZEludEJFPWZ1bmN0aW9uIHJlYWRJbnRCRShvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7Ynl0ZUxlbmd0aD1ieXRlTGVuZ3RoPj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LGJ5dGVMZW5ndGgsdGhpcy5sZW5ndGgpO3ZhciBpPWJ5dGVMZW5ndGg7dmFyIG11bD0xO3ZhciB2YWw9dGhpc1tvZmZzZXQrLS1pXTt3aGlsZShpPjAmJihtdWwqPTI1Nikpe3ZhbCs9dGhpc1tvZmZzZXQrLS1pXSptdWx9bXVsKj0xMjg7aWYodmFsPj1tdWwpdmFsLT1NYXRoLnBvdygyLDgqYnl0ZUxlbmd0aCk7cmV0dXJuIHZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OD1mdW5jdGlvbiByZWFkSW50OChvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsMSx0aGlzLmxlbmd0aCk7aWYoISh0aGlzW29mZnNldF0mMTI4KSlyZXR1cm4gdGhpc1tvZmZzZXRdO3JldHVybigyNTUtdGhpc1tvZmZzZXRdKzEpKi0xfTtCdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFPWZ1bmN0aW9uIHJlYWRJbnQxNkxFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCwyLHRoaXMubGVuZ3RoKTt2YXIgdmFsPXRoaXNbb2Zmc2V0XXx0aGlzW29mZnNldCsxXTw8ODtyZXR1cm4gdmFsJjMyNzY4P3ZhbHw0Mjk0OTAxNzYwOnZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRT1mdW5jdGlvbiByZWFkSW50MTZCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsMix0aGlzLmxlbmd0aCk7dmFyIHZhbD10aGlzW29mZnNldCsxXXx0aGlzW29mZnNldF08PDg7cmV0dXJuIHZhbCYzMjc2OD92YWx8NDI5NDkwMTc2MDp2YWx9O0J1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEU9ZnVuY3Rpb24gcmVhZEludDMyTEUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDQsdGhpcy5sZW5ndGgpO3JldHVybiB0aGlzW29mZnNldF18dGhpc1tvZmZzZXQrMV08PDh8dGhpc1tvZmZzZXQrMl08PDE2fHRoaXNbb2Zmc2V0KzNdPDwyNH07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRT1mdW5jdGlvbiByZWFkSW50MzJCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsNCx0aGlzLmxlbmd0aCk7cmV0dXJuIHRoaXNbb2Zmc2V0XTw8MjR8dGhpc1tvZmZzZXQrMV08PDE2fHRoaXNbb2Zmc2V0KzJdPDw4fHRoaXNbb2Zmc2V0KzNdfTtCdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFPWZ1bmN0aW9uIHJlYWRGbG9hdExFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCw0LHRoaXMubGVuZ3RoKTtyZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsb2Zmc2V0LHRydWUsMjMsNCl9O0J1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkU9ZnVuY3Rpb24gcmVhZEZsb2F0QkUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDQsdGhpcy5sZW5ndGgpO3JldHVybiBpZWVlNzU0LnJlYWQodGhpcyxvZmZzZXQsZmFsc2UsMjMsNCl9O0J1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFPWZ1bmN0aW9uIHJlYWREb3VibGVMRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsOCx0aGlzLmxlbmd0aCk7cmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLG9mZnNldCx0cnVlLDUyLDgpfTtCdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRT1mdW5jdGlvbiByZWFkRG91YmxlQkUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDgsdGhpcy5sZW5ndGgpO3JldHVybiBpZWVlNzU0LnJlYWQodGhpcyxvZmZzZXQsZmFsc2UsNTIsOCl9O2Z1bmN0aW9uIGNoZWNrSW50KGJ1Zix2YWx1ZSxvZmZzZXQsZXh0LG1heCxtaW4pe2lmKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSl0aHJvdyBuZXcgVHlwZUVycm9yKCciYnVmZmVyIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJyk7aWYodmFsdWU+bWF4fHx2YWx1ZTxtaW4pdGhyb3cgbmV3IFJhbmdlRXJyb3IoJyJ2YWx1ZSIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpO2lmKG9mZnNldCtleHQ+YnVmLmxlbmd0aCl0aHJvdyBuZXcgUmFuZ2VFcnJvcigiSW5kZXggb3V0IG9mIHJhbmdlIil9QnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRT1mdW5jdGlvbiB3cml0ZVVJbnRMRSh2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KXt2YXIgbWF4Qnl0ZXM9TWF0aC5wb3coMiw4KmJ5dGVMZW5ndGgpLTE7Y2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxtYXhCeXRlcywwKX12YXIgbXVsPTE7dmFyIGk9MDt0aGlzW29mZnNldF09dmFsdWUmMjU1O3doaWxlKCsraTxieXRlTGVuZ3RoJiYobXVsKj0yNTYpKXt0aGlzW29mZnNldCtpXT12YWx1ZS9tdWwmMjU1fXJldHVybiBvZmZzZXQrYnl0ZUxlbmd0aH07QnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRT1mdW5jdGlvbiB3cml0ZVVJbnRCRSh2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KXt2YXIgbWF4Qnl0ZXM9TWF0aC5wb3coMiw4KmJ5dGVMZW5ndGgpLTE7Y2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxtYXhCeXRlcywwKX12YXIgaT1ieXRlTGVuZ3RoLTE7dmFyIG11bD0xO3RoaXNbb2Zmc2V0K2ldPXZhbHVlJjI1NTt3aGlsZSgtLWk+PTAmJihtdWwqPTI1Nikpe3RoaXNbb2Zmc2V0K2ldPXZhbHVlL211bCYyNTV9cmV0dXJuIG9mZnNldCtieXRlTGVuZ3RofTtCdWZmZXIucHJvdG90eXBlLndyaXRlVUludDg9ZnVuY3Rpb24gd3JpdGVVSW50OCh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsMSwyNTUsMCk7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTtyZXR1cm4gb2Zmc2V0KzF9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRT1mdW5jdGlvbiB3cml0ZVVJbnQxNkxFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCwyLDY1NTM1LDApO3RoaXNbb2Zmc2V0XT12YWx1ZSYyNTU7dGhpc1tvZmZzZXQrMV09dmFsdWU+Pj44O3JldHVybiBvZmZzZXQrMn07QnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFPWZ1bmN0aW9uIHdyaXRlVUludDE2QkUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LDIsNjU1MzUsMCk7dGhpc1tvZmZzZXRdPXZhbHVlPj4+ODt0aGlzW29mZnNldCsxXT12YWx1ZSYyNTU7cmV0dXJuIG9mZnNldCsyfTtCdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEU9ZnVuY3Rpb24gd3JpdGVVSW50MzJMRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsNCw0Mjk0OTY3Mjk1LDApO3RoaXNbb2Zmc2V0KzNdPXZhbHVlPj4+MjQ7dGhpc1tvZmZzZXQrMl09dmFsdWU+Pj4xNjt0aGlzW29mZnNldCsxXT12YWx1ZT4+Pjg7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTtyZXR1cm4gb2Zmc2V0KzR9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRT1mdW5jdGlvbiB3cml0ZVVJbnQzMkJFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCw0LDQyOTQ5NjcyOTUsMCk7dGhpc1tvZmZzZXRdPXZhbHVlPj4+MjQ7dGhpc1tvZmZzZXQrMV09dmFsdWU+Pj4xNjt0aGlzW29mZnNldCsyXT12YWx1ZT4+Pjg7dGhpc1tvZmZzZXQrM109dmFsdWUmMjU1O3JldHVybiBvZmZzZXQrNH07QnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFPWZ1bmN0aW9uIHdyaXRlSW50TEUodmFsdWUsb2Zmc2V0LGJ5dGVMZW5ndGgsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpe3ZhciBsaW1pdD1NYXRoLnBvdygyLDgqYnl0ZUxlbmd0aC0xKTtjaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCxieXRlTGVuZ3RoLGxpbWl0LTEsLWxpbWl0KX12YXIgaT0wO3ZhciBtdWw9MTt2YXIgc3ViPTA7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTt3aGlsZSgrK2k8Ynl0ZUxlbmd0aCYmKG11bCo9MjU2KSl7aWYodmFsdWU8MCYmc3ViPT09MCYmdGhpc1tvZmZzZXQraS0xXSE9PTApe3N1Yj0xfXRoaXNbb2Zmc2V0K2ldPSh2YWx1ZS9tdWw+PjApLXN1YiYyNTV9cmV0dXJuIG9mZnNldCtieXRlTGVuZ3RofTtCdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkU9ZnVuY3Rpb24gd3JpdGVJbnRCRSh2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCl7dmFyIGxpbWl0PU1hdGgucG93KDIsOCpieXRlTGVuZ3RoLTEpO2NoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LGJ5dGVMZW5ndGgsbGltaXQtMSwtbGltaXQpfXZhciBpPWJ5dGVMZW5ndGgtMTt2YXIgbXVsPTE7dmFyIHN1Yj0wO3RoaXNbb2Zmc2V0K2ldPXZhbHVlJjI1NTt3aGlsZSgtLWk+PTAmJihtdWwqPTI1Nikpe2lmKHZhbHVlPDAmJnN1Yj09PTAmJnRoaXNbb2Zmc2V0K2krMV0hPT0wKXtzdWI9MX10aGlzW29mZnNldCtpXT0odmFsdWUvbXVsPj4wKS1zdWImMjU1fXJldHVybiBvZmZzZXQrYnl0ZUxlbmd0aH07QnVmZmVyLnByb3RvdHlwZS53cml0ZUludDg9ZnVuY3Rpb24gd3JpdGVJbnQ4KHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCwxLDEyNywtMTI4KTtpZih2YWx1ZTwwKXZhbHVlPTI1NSt2YWx1ZSsxO3RoaXNbb2Zmc2V0XT12YWx1ZSYyNTU7cmV0dXJuIG9mZnNldCsxfTtCdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRT1mdW5jdGlvbiB3cml0ZUludDE2TEUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LDIsMzI3NjcsLTMyNzY4KTt0aGlzW29mZnNldF09dmFsdWUmMjU1O3RoaXNbb2Zmc2V0KzFdPXZhbHVlPj4+ODtyZXR1cm4gb2Zmc2V0KzJ9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFPWZ1bmN0aW9uIHdyaXRlSW50MTZCRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsMiwzMjc2NywtMzI3NjgpO3RoaXNbb2Zmc2V0XT12YWx1ZT4+Pjg7dGhpc1tvZmZzZXQrMV09dmFsdWUmMjU1O3JldHVybiBvZmZzZXQrMn07QnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEU9ZnVuY3Rpb24gd3JpdGVJbnQzMkxFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCw0LDIxNDc0ODM2NDcsLTIxNDc0ODM2NDgpO3RoaXNbb2Zmc2V0XT12YWx1ZSYyNTU7dGhpc1tvZmZzZXQrMV09dmFsdWU+Pj44O3RoaXNbb2Zmc2V0KzJdPXZhbHVlPj4+MTY7dGhpc1tvZmZzZXQrM109dmFsdWU+Pj4yNDtyZXR1cm4gb2Zmc2V0KzR9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFPWZ1bmN0aW9uIHdyaXRlSW50MzJCRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsNCwyMTQ3NDgzNjQ3LC0yMTQ3NDgzNjQ4KTtpZih2YWx1ZTwwKXZhbHVlPTQyOTQ5NjcyOTUrdmFsdWUrMTt0aGlzW29mZnNldF09dmFsdWU+Pj4yNDt0aGlzW29mZnNldCsxXT12YWx1ZT4+PjE2O3RoaXNbb2Zmc2V0KzJdPXZhbHVlPj4+ODt0aGlzW29mZnNldCszXT12YWx1ZSYyNTU7cmV0dXJuIG9mZnNldCs0fTtmdW5jdGlvbiBjaGVja0lFRUU3NTQoYnVmLHZhbHVlLG9mZnNldCxleHQsbWF4LG1pbil7aWYob2Zmc2V0K2V4dD5idWYubGVuZ3RoKXRocm93IG5ldyBSYW5nZUVycm9yKCJJbmRleCBvdXQgb2YgcmFuZ2UiKTtpZihvZmZzZXQ8MCl0aHJvdyBuZXcgUmFuZ2VFcnJvcigiSW5kZXggb3V0IG9mIHJhbmdlIil9ZnVuY3Rpb24gd3JpdGVGbG9hdChidWYsdmFsdWUsb2Zmc2V0LGxpdHRsZUVuZGlhbixub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCl7Y2hlY2tJRUVFNzU0KGJ1Zix2YWx1ZSxvZmZzZXQsNCwzNDAyODIzNDY2Mzg1Mjg4NmUyMiwtMzQwMjgyMzQ2NjM4NTI4ODZlMjIpfWllZWU3NTQud3JpdGUoYnVmLHZhbHVlLG9mZnNldCxsaXR0bGVFbmRpYW4sMjMsNCk7cmV0dXJuIG9mZnNldCs0fUJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFPWZ1bmN0aW9uIHdyaXRlRmxvYXRMRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3JldHVybiB3cml0ZUZsb2F0KHRoaXMsdmFsdWUsb2Zmc2V0LHRydWUsbm9Bc3NlcnQpfTtCdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRT1mdW5jdGlvbiB3cml0ZUZsb2F0QkUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXtyZXR1cm4gd3JpdGVGbG9hdCh0aGlzLHZhbHVlLG9mZnNldCxmYWxzZSxub0Fzc2VydCl9O2Z1bmN0aW9uIHdyaXRlRG91YmxlKGJ1Zix2YWx1ZSxvZmZzZXQsbGl0dGxlRW5kaWFuLG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KXtjaGVja0lFRUU3NTQoYnVmLHZhbHVlLG9mZnNldCw4LDE3OTc2OTMxMzQ4NjIzMTU3ZTI5MiwtMTc5NzY5MzEzNDg2MjMxNTdlMjkyKX1pZWVlNzU0LndyaXRlKGJ1Zix2YWx1ZSxvZmZzZXQsbGl0dGxlRW5kaWFuLDUyLDgpO3JldHVybiBvZmZzZXQrOH1CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEU9ZnVuY3Rpb24gd3JpdGVEb3VibGVMRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3JldHVybiB3cml0ZURvdWJsZSh0aGlzLHZhbHVlLG9mZnNldCx0cnVlLG5vQXNzZXJ0KX07QnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFPWZ1bmN0aW9uIHdyaXRlRG91YmxlQkUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXtyZXR1cm4gd3JpdGVEb3VibGUodGhpcyx2YWx1ZSxvZmZzZXQsZmFsc2Usbm9Bc3NlcnQpfTtCdWZmZXIucHJvdG90eXBlLmNvcHk9ZnVuY3Rpb24gY29weSh0YXJnZXQsdGFyZ2V0U3RhcnQsc3RhcnQsZW5kKXtpZighQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgc2hvdWxkIGJlIGEgQnVmZmVyIik7aWYoIXN0YXJ0KXN0YXJ0PTA7aWYoIWVuZCYmZW5kIT09MCllbmQ9dGhpcy5sZW5ndGg7aWYodGFyZ2V0U3RhcnQ+PXRhcmdldC5sZW5ndGgpdGFyZ2V0U3RhcnQ9dGFyZ2V0Lmxlbmd0aDtpZighdGFyZ2V0U3RhcnQpdGFyZ2V0U3RhcnQ9MDtpZihlbmQ+MCYmZW5kPHN0YXJ0KWVuZD1zdGFydDtpZihlbmQ9PT1zdGFydClyZXR1cm4gMDtpZih0YXJnZXQubGVuZ3RoPT09MHx8dGhpcy5sZW5ndGg9PT0wKXJldHVybiAwO2lmKHRhcmdldFN0YXJ0PDApe3Rocm93IG5ldyBSYW5nZUVycm9yKCJ0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzIil9aWYoc3RhcnQ8MHx8c3RhcnQ+PXRoaXMubGVuZ3RoKXRocm93IG5ldyBSYW5nZUVycm9yKCJJbmRleCBvdXQgb2YgcmFuZ2UiKTtpZihlbmQ8MCl0aHJvdyBuZXcgUmFuZ2VFcnJvcigic291cmNlRW5kIG91dCBvZiBib3VuZHMiKTtpZihlbmQ+dGhpcy5sZW5ndGgpZW5kPXRoaXMubGVuZ3RoO2lmKHRhcmdldC5sZW5ndGgtdGFyZ2V0U3RhcnQ8ZW5kLXN0YXJ0KXtlbmQ9dGFyZ2V0Lmxlbmd0aC10YXJnZXRTdGFydCtzdGFydH12YXIgbGVuPWVuZC1zdGFydDtpZih0aGlzPT09dGFyZ2V0JiZ0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuY29weVdpdGhpbj09PSJmdW5jdGlvbiIpe3RoaXMuY29weVdpdGhpbih0YXJnZXRTdGFydCxzdGFydCxlbmQpfWVsc2UgaWYodGhpcz09PXRhcmdldCYmc3RhcnQ8dGFyZ2V0U3RhcnQmJnRhcmdldFN0YXJ0PGVuZCl7Zm9yKHZhciBpPWxlbi0xO2k+PTA7LS1pKXt0YXJnZXRbaSt0YXJnZXRTdGFydF09dGhpc1tpK3N0YXJ0XX19ZWxzZXtVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbCh0YXJnZXQsdGhpcy5zdWJhcnJheShzdGFydCxlbmQpLHRhcmdldFN0YXJ0KX1yZXR1cm4gbGVufTtCdWZmZXIucHJvdG90eXBlLmZpbGw9ZnVuY3Rpb24gZmlsbCh2YWwsc3RhcnQsZW5kLGVuY29kaW5nKXtpZih0eXBlb2YgdmFsPT09InN0cmluZyIpe2lmKHR5cGVvZiBzdGFydD09PSJzdHJpbmciKXtlbmNvZGluZz1zdGFydDtzdGFydD0wO2VuZD10aGlzLmxlbmd0aH1lbHNlIGlmKHR5cGVvZiBlbmQ9PT0ic3RyaW5nIil7ZW5jb2Rpbmc9ZW5kO2VuZD10aGlzLmxlbmd0aH1pZihlbmNvZGluZyE9PXVuZGVmaW5lZCYmdHlwZW9mIGVuY29kaW5nIT09InN0cmluZyIpe3Rocm93IG5ldyBUeXBlRXJyb3IoImVuY29kaW5nIG11c3QgYmUgYSBzdHJpbmciKX1pZih0eXBlb2YgZW5jb2Rpbmc9PT0ic3RyaW5nIiYmIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSl7dGhyb3cgbmV3IFR5cGVFcnJvcigiVW5rbm93biBlbmNvZGluZzogIitlbmNvZGluZyl9aWYodmFsLmxlbmd0aD09PTEpe3ZhciBjb2RlPXZhbC5jaGFyQ29kZUF0KDApO2lmKGVuY29kaW5nPT09InV0ZjgiJiZjb2RlPDEyOHx8ZW5jb2Rpbmc9PT0ibGF0aW4xIil7dmFsPWNvZGV9fX1lbHNlIGlmKHR5cGVvZiB2YWw9PT0ibnVtYmVyIil7dmFsPXZhbCYyNTV9aWYoc3RhcnQ8MHx8dGhpcy5sZW5ndGg8c3RhcnR8fHRoaXMubGVuZ3RoPGVuZCl7dGhyb3cgbmV3IFJhbmdlRXJyb3IoIk91dCBvZiByYW5nZSBpbmRleCIpfWlmKGVuZDw9c3RhcnQpe3JldHVybiB0aGlzfXN0YXJ0PXN0YXJ0Pj4+MDtlbmQ9ZW5kPT09dW5kZWZpbmVkP3RoaXMubGVuZ3RoOmVuZD4+PjA7aWYoIXZhbCl2YWw9MDt2YXIgaTtpZih0eXBlb2YgdmFsPT09Im51bWJlciIpe2ZvcihpPXN0YXJ0O2k8ZW5kOysraSl7dGhpc1tpXT12YWx9fWVsc2V7dmFyIGJ5dGVzPUJ1ZmZlci5pc0J1ZmZlcih2YWwpP3ZhbDpCdWZmZXIuZnJvbSh2YWwsZW5jb2RpbmcpO3ZhciBsZW49Ynl0ZXMubGVuZ3RoO2lmKGxlbj09PTApe3Rocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSAiJyt2YWwrJyIgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgInZhbHVlIicpfWZvcihpPTA7aTxlbmQtc3RhcnQ7KytpKXt0aGlzW2krc3RhcnRdPWJ5dGVzW2klbGVuXX19cmV0dXJuIHRoaXN9O3ZhciBJTlZBTElEX0JBU0U2NF9SRT0vW14rLzAtOUEtWmEtei1fXS9nO2Z1bmN0aW9uIGJhc2U2NGNsZWFuKHN0cil7c3RyPXN0ci5zcGxpdCgiPSIpWzBdO3N0cj1zdHIudHJpbSgpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsIiIpO2lmKHN0ci5sZW5ndGg8MilyZXR1cm4iIjt3aGlsZShzdHIubGVuZ3RoJTQhPT0wKXtzdHI9c3RyKyI9In1yZXR1cm4gc3RyfWZ1bmN0aW9uIHRvSGV4KG4pe2lmKG48MTYpcmV0dXJuIjAiK24udG9TdHJpbmcoMTYpO3JldHVybiBuLnRvU3RyaW5nKDE2KX1mdW5jdGlvbiB1dGY4VG9CeXRlcyhzdHJpbmcsdW5pdHMpe3VuaXRzPXVuaXRzfHxJbmZpbml0eTt2YXIgY29kZVBvaW50O3ZhciBsZW5ndGg9c3RyaW5nLmxlbmd0aDt2YXIgbGVhZFN1cnJvZ2F0ZT1udWxsO3ZhciBieXRlcz1bXTtmb3IodmFyIGk9MDtpPGxlbmd0aDsrK2kpe2NvZGVQb2ludD1zdHJpbmcuY2hhckNvZGVBdChpKTtpZihjb2RlUG9pbnQ+NTUyOTUmJmNvZGVQb2ludDw1NzM0NCl7aWYoIWxlYWRTdXJyb2dhdGUpe2lmKGNvZGVQb2ludD41NjMxOSl7aWYoKHVuaXRzLT0zKT4tMSlieXRlcy5wdXNoKDIzOSwxOTEsMTg5KTtjb250aW51ZX1lbHNlIGlmKGkrMT09PWxlbmd0aCl7aWYoKHVuaXRzLT0zKT4tMSlieXRlcy5wdXNoKDIzOSwxOTEsMTg5KTtjb250aW51ZX1sZWFkU3Vycm9nYXRlPWNvZGVQb2ludDtjb250aW51ZX1pZihjb2RlUG9pbnQ8NTYzMjApe2lmKCh1bml0cy09Myk+LTEpYnl0ZXMucHVzaCgyMzksMTkxLDE4OSk7bGVhZFN1cnJvZ2F0ZT1jb2RlUG9pbnQ7Y29udGludWV9Y29kZVBvaW50PShsZWFkU3Vycm9nYXRlLTU1Mjk2PDwxMHxjb2RlUG9pbnQtNTYzMjApKzY1NTM2fWVsc2UgaWYobGVhZFN1cnJvZ2F0ZSl7aWYoKHVuaXRzLT0zKT4tMSlieXRlcy5wdXNoKDIzOSwxOTEsMTg5KX1sZWFkU3Vycm9nYXRlPW51bGw7aWYoY29kZVBvaW50PDEyOCl7aWYoKHVuaXRzLT0xKTwwKWJyZWFrO2J5dGVzLnB1c2goY29kZVBvaW50KX1lbHNlIGlmKGNvZGVQb2ludDwyMDQ4KXtpZigodW5pdHMtPTIpPDApYnJlYWs7Ynl0ZXMucHVzaChjb2RlUG9pbnQ+PjZ8MTkyLGNvZGVQb2ludCY2M3wxMjgpfWVsc2UgaWYoY29kZVBvaW50PDY1NTM2KXtpZigodW5pdHMtPTMpPDApYnJlYWs7Ynl0ZXMucHVzaChjb2RlUG9pbnQ+PjEyfDIyNCxjb2RlUG9pbnQ+PjYmNjN8MTI4LGNvZGVQb2ludCY2M3wxMjgpfWVsc2UgaWYoY29kZVBvaW50PDExMTQxMTIpe2lmKCh1bml0cy09NCk8MClicmVhaztieXRlcy5wdXNoKGNvZGVQb2ludD4+MTh8MjQwLGNvZGVQb2ludD4+MTImNjN8MTI4LGNvZGVQb2ludD4+NiY2M3wxMjgsY29kZVBvaW50JjYzfDEyOCl9ZWxzZXt0aHJvdyBuZXcgRXJyb3IoIkludmFsaWQgY29kZSBwb2ludCIpfX1yZXR1cm4gYnl0ZXN9ZnVuY3Rpb24gYXNjaWlUb0J5dGVzKHN0cil7dmFyIGJ5dGVBcnJheT1bXTtmb3IodmFyIGk9MDtpPHN0ci5sZW5ndGg7KytpKXtieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSYyNTUpfXJldHVybiBieXRlQXJyYXl9ZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMoc3RyLHVuaXRzKXt2YXIgYyxoaSxsbzt2YXIgYnl0ZUFycmF5PVtdO2Zvcih2YXIgaT0wO2k8c3RyLmxlbmd0aDsrK2kpe2lmKCh1bml0cy09Mik8MClicmVhaztjPXN0ci5jaGFyQ29kZUF0KGkpO2hpPWM+Pjg7bG89YyUyNTY7Ynl0ZUFycmF5LnB1c2gobG8pO2J5dGVBcnJheS5wdXNoKGhpKX1yZXR1cm4gYnl0ZUFycmF5fWZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMoc3RyKXtyZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpfWZ1bmN0aW9uIGJsaXRCdWZmZXIoc3JjLGRzdCxvZmZzZXQsbGVuZ3RoKXtmb3IodmFyIGk9MDtpPGxlbmd0aDsrK2kpe2lmKGkrb2Zmc2V0Pj1kc3QubGVuZ3RofHxpPj1zcmMubGVuZ3RoKWJyZWFrO2RzdFtpK29mZnNldF09c3JjW2ldfXJldHVybiBpfWZ1bmN0aW9uIGlzSW5zdGFuY2Uob2JqLHR5cGUpe3JldHVybiBvYmogaW5zdGFuY2VvZiB0eXBlfHxvYmohPW51bGwmJm9iai5jb25zdHJ1Y3RvciE9bnVsbCYmb2JqLmNvbnN0cnVjdG9yLm5hbWUhPW51bGwmJm9iai5jb25zdHJ1Y3Rvci5uYW1lPT09dHlwZS5uYW1lfWZ1bmN0aW9uIG51bWJlcklzTmFOKG9iail7cmV0dXJuIG9iaiE9PW9ian19KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyJiYXNlNjQtanMiOjI0LGJ1ZmZlcjoyNyxpZWVlNzU0OjM1fV0sMjg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIFRyYW5zZm9ybT1yZXF1aXJlKCJzdHJlYW0iKS5UcmFuc2Zvcm07dmFyIFN0cmluZ0RlY29kZXI9cmVxdWlyZSgic3RyaW5nX2RlY29kZXIiKS5TdHJpbmdEZWNvZGVyO3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO2Z1bmN0aW9uIENpcGhlckJhc2UoaGFzaE1vZGUpe1RyYW5zZm9ybS5jYWxsKHRoaXMpO3RoaXMuaGFzaE1vZGU9dHlwZW9mIGhhc2hNb2RlPT09InN0cmluZyI7aWYodGhpcy5oYXNoTW9kZSl7dGhpc1toYXNoTW9kZV09dGhpcy5fZmluYWxPckRpZ2VzdH1lbHNle3RoaXMuZmluYWw9dGhpcy5fZmluYWxPckRpZ2VzdH1pZih0aGlzLl9maW5hbCl7dGhpcy5fX2ZpbmFsPXRoaXMuX2ZpbmFsO3RoaXMuX2ZpbmFsPW51bGx9dGhpcy5fZGVjb2Rlcj1udWxsO3RoaXMuX2VuY29kaW5nPW51bGx9aW5oZXJpdHMoQ2lwaGVyQmFzZSxUcmFuc2Zvcm0pO0NpcGhlckJhc2UucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbihkYXRhLGlucHV0RW5jLG91dHB1dEVuYyl7aWYodHlwZW9mIGRhdGE9PT0ic3RyaW5nIil7ZGF0YT1CdWZmZXIuZnJvbShkYXRhLGlucHV0RW5jKX12YXIgb3V0RGF0YT10aGlzLl91cGRhdGUoZGF0YSk7aWYodGhpcy5oYXNoTW9kZSlyZXR1cm4gdGhpcztpZihvdXRwdXRFbmMpe291dERhdGE9dGhpcy5fdG9TdHJpbmcob3V0RGF0YSxvdXRwdXRFbmMpfXJldHVybiBvdXREYXRhfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5zZXRBdXRvUGFkZGluZz1mdW5jdGlvbigpe307Q2lwaGVyQmFzZS5wcm90b3R5cGUuZ2V0QXV0aFRhZz1mdW5jdGlvbigpe3Rocm93IG5ldyBFcnJvcigidHJ5aW5nIHRvIGdldCBhdXRoIHRhZyBpbiB1bnN1cHBvcnRlZCBzdGF0ZSIpfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5zZXRBdXRoVGFnPWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJ0cnlpbmcgdG8gc2V0IGF1dGggdGFnIGluIHVuc3VwcG9ydGVkIHN0YXRlIil9O0NpcGhlckJhc2UucHJvdG90eXBlLnNldEFBRD1mdW5jdGlvbigpe3Rocm93IG5ldyBFcnJvcigidHJ5aW5nIHRvIHNldCBhYWQgaW4gdW5zdXBwb3J0ZWQgc3RhdGUiKX07Q2lwaGVyQmFzZS5wcm90b3R5cGUuX3RyYW5zZm9ybT1mdW5jdGlvbihkYXRhLF8sbmV4dCl7dmFyIGVycjt0cnl7aWYodGhpcy5oYXNoTW9kZSl7dGhpcy5fdXBkYXRlKGRhdGEpfWVsc2V7dGhpcy5wdXNoKHRoaXMuX3VwZGF0ZShkYXRhKSl9fWNhdGNoKGUpe2Vycj1lfWZpbmFsbHl7bmV4dChlcnIpfX07Q2lwaGVyQmFzZS5wcm90b3R5cGUuX2ZsdXNoPWZ1bmN0aW9uKGRvbmUpe3ZhciBlcnI7dHJ5e3RoaXMucHVzaCh0aGlzLl9fZmluYWwoKSl9Y2F0Y2goZSl7ZXJyPWV9ZG9uZShlcnIpfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5fZmluYWxPckRpZ2VzdD1mdW5jdGlvbihvdXRwdXRFbmMpe3ZhciBvdXREYXRhPXRoaXMuX19maW5hbCgpfHxCdWZmZXIuYWxsb2MoMCk7aWYob3V0cHV0RW5jKXtvdXREYXRhPXRoaXMuX3RvU3RyaW5nKG91dERhdGEsb3V0cHV0RW5jLHRydWUpfXJldHVybiBvdXREYXRhfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5fdG9TdHJpbmc9ZnVuY3Rpb24odmFsdWUsZW5jLGZpbil7aWYoIXRoaXMuX2RlY29kZXIpe3RoaXMuX2RlY29kZXI9bmV3IFN0cmluZ0RlY29kZXIoZW5jKTt0aGlzLl9lbmNvZGluZz1lbmN9aWYodGhpcy5fZW5jb2RpbmchPT1lbmMpdGhyb3cgbmV3IEVycm9yKCJjYW4ndCBzd2l0Y2ggZW5jb2RpbmdzIik7dmFyIG91dD10aGlzLl9kZWNvZGVyLndyaXRlKHZhbHVlKTtpZihmaW4pe291dCs9dGhpcy5fZGVjb2Rlci5lbmQoKX1yZXR1cm4gb3V0fTttb2R1bGUuZXhwb3J0cz1DaXBoZXJCYXNlfSx7aW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4MixzdHJlYW06MTAxLHN0cmluZ19kZWNvZGVyOjEwMn1dLDI5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz17T19SRE9OTFk6MCxPX1dST05MWToxLE9fUkRXUjoyLFNfSUZNVDo2MTQ0MCxTX0lGUkVHOjMyNzY4LFNfSUZESVI6MTYzODQsU19JRkNIUjo4MTkyLFNfSUZCTEs6MjQ1NzYsU19JRklGTzo0MDk2LFNfSUZMTks6NDA5NjAsU19JRlNPQ0s6NDkxNTIsT19DUkVBVDo1MTIsT19FWENMOjIwNDgsT19OT0NUVFk6MTMxMDcyLE9fVFJVTkM6MTAyNCxPX0FQUEVORDo4LE9fRElSRUNUT1JZOjEwNDg1NzYsT19OT0ZPTExPVzoyNTYsT19TWU5DOjEyOCxPX1NZTUxJTks6MjA5NzE1MixPX05PTkJMT0NLOjQsU19JUldYVTo0NDgsU19JUlVTUjoyNTYsU19JV1VTUjoxMjgsU19JWFVTUjo2NCxTX0lSV1hHOjU2LFNfSVJHUlA6MzIsU19JV0dSUDoxNixTX0lYR1JQOjgsU19JUldYTzo3LFNfSVJPVEg6NCxTX0lXT1RIOjIsU19JWE9USDoxLEUyQklHOjcsRUFDQ0VTOjEzLEVBRERSSU5VU0U6NDgsRUFERFJOT1RBVkFJTDo0OSxFQUZOT1NVUFBPUlQ6NDcsRUFHQUlOOjM1LEVBTFJFQURZOjM3LEVCQURGOjksRUJBRE1TRzo5NCxFQlVTWToxNixFQ0FOQ0VMRUQ6ODksRUNISUxEOjEwLEVDT05OQUJPUlRFRDo1MyxFQ09OTlJFRlVTRUQ6NjEsRUNPTk5SRVNFVDo1NCxFREVBRExLOjExLEVERVNUQUREUlJFUTozOSxFRE9NOjMzLEVEUVVPVDo2OSxFRVhJU1Q6MTcsRUZBVUxUOjE0LEVGQklHOjI3LEVIT1NUVU5SRUFDSDo2NSxFSURSTTo5MCxFSUxTRVE6OTIsRUlOUFJPR1JFU1M6MzYsRUlOVFI6NCxFSU5WQUw6MjIsRUlPOjUsRUlTQ09OTjo1NixFSVNESVI6MjEsRUxPT1A6NjIsRU1GSUxFOjI0LEVNTElOSzozMSxFTVNHU0laRTo0MCxFTVVMVElIT1A6OTUsRU5BTUVUT09MT05HOjYzLEVORVRET1dOOjUwLEVORVRSRVNFVDo1MixFTkVUVU5SRUFDSDo1MSxFTkZJTEU6MjMsRU5PQlVGUzo1NSxFTk9EQVRBOjk2LEVOT0RFVjoxOSxFTk9FTlQ6MixFTk9FWEVDOjgsRU5PTENLOjc3LEVOT0xJTks6OTcsRU5PTUVNOjEyLEVOT01TRzo5MSxFTk9QUk9UT09QVDo0MixFTk9TUEM6MjgsRU5PU1I6OTgsRU5PU1RSOjk5LEVOT1NZUzo3OCxFTk9UQ09OTjo1NyxFTk9URElSOjIwLEVOT1RFTVBUWTo2NixFTk9UU09DSzozOCxFTk9UU1VQOjQ1LEVOT1RUWToyNSxFTlhJTzo2LEVPUE5PVFNVUFA6MTAyLEVPVkVSRkxPVzo4NCxFUEVSTToxLEVQSVBFOjMyLEVQUk9UTzoxMDAsRVBST1RPTk9TVVBQT1JUOjQzLEVQUk9UT1RZUEU6NDEsRVJBTkdFOjM0LEVST0ZTOjMwLEVTUElQRToyOSxFU1JDSDozLEVTVEFMRTo3MCxFVElNRToxMDEsRVRJTUVET1VUOjYwLEVUWFRCU1k6MjYsRVdPVUxEQkxPQ0s6MzUsRVhERVY6MTgsU0lHSFVQOjEsU0lHSU5UOjIsU0lHUVVJVDozLFNJR0lMTDo0LFNJR1RSQVA6NSxTSUdBQlJUOjYsU0lHSU9UOjYsU0lHQlVTOjEwLFNJR0ZQRTo4LFNJR0tJTEw6OSxTSUdVU1IxOjMwLFNJR1NFR1Y6MTEsU0lHVVNSMjozMSxTSUdQSVBFOjEzLFNJR0FMUk06MTQsU0lHVEVSTToxNSxTSUdDSExEOjIwLFNJR0NPTlQ6MTksU0lHU1RPUDoxNyxTSUdUU1RQOjE4LFNJR1RUSU46MjEsU0lHVFRPVToyMixTSUdVUkc6MTYsU0lHWENQVToyNCxTSUdYRlNaOjI1LFNJR1ZUQUxSTToyNixTSUdQUk9GOjI3LFNJR1dJTkNIOjI4LFNJR0lPOjIzLFNJR1NZUzoxMixTU0xfT1BfQUxMOjIxNDc0ODY3MTksU1NMX09QX0FMTE9XX1VOU0FGRV9MRUdBQ1lfUkVORUdPVElBVElPTjoyNjIxNDQsU1NMX09QX0NJUEhFUl9TRVJWRVJfUFJFRkVSRU5DRTo0MTk0MzA0LFNTTF9PUF9DSVNDT19BTllDT05ORUNUOjMyNzY4LFNTTF9PUF9DT09LSUVfRVhDSEFOR0U6ODE5MixTU0xfT1BfQ1JZUFRPUFJPX1RMU0VYVF9CVUc6MjE0NzQ4MzY0OCxTU0xfT1BfRE9OVF9JTlNFUlRfRU1QVFlfRlJBR01FTlRTOjIwNDgsU1NMX09QX0VQSEVNRVJBTF9SU0E6MCxTU0xfT1BfTEVHQUNZX1NFUlZFUl9DT05ORUNUOjQsU1NMX09QX01JQ1JPU09GVF9CSUdfU1NMVjNfQlVGRkVSOjMyLFNTTF9PUF9NSUNST1NPRlRfU0VTU19JRF9CVUc6MSxTU0xfT1BfTVNJRV9TU0xWMl9SU0FfUEFERElORzowLFNTTF9PUF9ORVRTQ0FQRV9DQV9ETl9CVUc6NTM2ODcwOTEyLFNTTF9PUF9ORVRTQ0FQRV9DSEFMTEVOR0VfQlVHOjIsU1NMX09QX05FVFNDQVBFX0RFTU9fQ0lQSEVSX0NIQU5HRV9CVUc6MTA3Mzc0MTgyNCxTU0xfT1BfTkVUU0NBUEVfUkVVU0VfQ0lQSEVSX0NIQU5HRV9CVUc6OCxTU0xfT1BfTk9fQ09NUFJFU1NJT046MTMxMDcyLFNTTF9PUF9OT19RVUVSWV9NVFU6NDA5NixTU0xfT1BfTk9fU0VTU0lPTl9SRVNVTVBUSU9OX09OX1JFTkVHT1RJQVRJT046NjU1MzYsU1NMX09QX05PX1NTTHYyOjE2Nzc3MjE2LFNTTF9PUF9OT19TU0x2MzozMzU1NDQzMixTU0xfT1BfTk9fVElDS0VUOjE2Mzg0LFNTTF9PUF9OT19UTFN2MTo2NzEwODg2NCxTU0xfT1BfTk9fVExTdjFfMToyNjg0MzU0NTYsU1NMX09QX05PX1RMU3YxXzI6MTM0MjE3NzI4LFNTTF9PUF9QS0NTMV9DSEVDS18xOjAsU1NMX09QX1BLQ1MxX0NIRUNLXzI6MCxTU0xfT1BfU0lOR0xFX0RIX1VTRToxMDQ4NTc2LFNTTF9PUF9TSU5HTEVfRUNESF9VU0U6NTI0Mjg4LFNTTF9PUF9TU0xFQVlfMDgwX0NMSUVOVF9ESF9CVUc6MTI4LFNTTF9PUF9TU0xSRUYyX1JFVVNFX0NFUlRfVFlQRV9CVUc6MCxTU0xfT1BfVExTX0JMT0NLX1BBRERJTkdfQlVHOjUxMixTU0xfT1BfVExTX0Q1X0JVRzoyNTYsU1NMX09QX1RMU19ST0xMQkFDS19CVUc6ODM4ODYwOCxFTkdJTkVfTUVUSE9EX0RTQToyLEVOR0lORV9NRVRIT0RfREg6NCxFTkdJTkVfTUVUSE9EX1JBTkQ6OCxFTkdJTkVfTUVUSE9EX0VDREg6MTYsRU5HSU5FX01FVEhPRF9FQ0RTQTozMixFTkdJTkVfTUVUSE9EX0NJUEhFUlM6NjQsRU5HSU5FX01FVEhPRF9ESUdFU1RTOjEyOCxFTkdJTkVfTUVUSE9EX1NUT1JFOjI1NixFTkdJTkVfTUVUSE9EX1BLRVlfTUVUSFM6NTEyLEVOR0lORV9NRVRIT0RfUEtFWV9BU04xX01FVEhTOjEwMjQsRU5HSU5FX01FVEhPRF9BTEw6NjU1MzUsRU5HSU5FX01FVEhPRF9OT05FOjAsREhfQ0hFQ0tfUF9OT1RfU0FGRV9QUklNRToyLERIX0NIRUNLX1BfTk9UX1BSSU1FOjEsREhfVU5BQkxFX1RPX0NIRUNLX0dFTkVSQVRPUjo0LERIX05PVF9TVUlUQUJMRV9HRU5FUkFUT1I6OCxOUE5fRU5BQkxFRDoxLFJTQV9QS0NTMV9QQURESU5HOjEsUlNBX1NTTFYyM19QQURESU5HOjIsUlNBX05PX1BBRERJTkc6MyxSU0FfUEtDUzFfT0FFUF9QQURESU5HOjQsUlNBX1g5MzFfUEFERElORzo1LFJTQV9QS0NTMV9QU1NfUEFERElORzo2LFBPSU5UX0NPTlZFUlNJT05fQ09NUFJFU1NFRDoyLFBPSU5UX0NPTlZFUlNJT05fVU5DT01QUkVTU0VEOjQsUE9JTlRfQ09OVkVSU0lPTl9IWUJSSUQ6NixGX09LOjAsUl9PSzo0LFdfT0s6MixYX09LOjEsVVZfVURQX1JFVVNFQUREUjo0fX0se31dLDMwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXtmdW5jdGlvbiBpc0FycmF5KGFyZyl7aWYoQXJyYXkuaXNBcnJheSl7cmV0dXJuIEFycmF5LmlzQXJyYXkoYXJnKX1yZXR1cm4gb2JqZWN0VG9TdHJpbmcoYXJnKT09PSJbb2JqZWN0IEFycmF5XSJ9ZXhwb3J0cy5pc0FycmF5PWlzQXJyYXk7ZnVuY3Rpb24gaXNCb29sZWFuKGFyZyl7cmV0dXJuIHR5cGVvZiBhcmc9PT0iYm9vbGVhbiJ9ZXhwb3J0cy5pc0Jvb2xlYW49aXNCb29sZWFuO2Z1bmN0aW9uIGlzTnVsbChhcmcpe3JldHVybiBhcmc9PT1udWxsfWV4cG9ydHMuaXNOdWxsPWlzTnVsbDtmdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpe3JldHVybiBhcmc9PW51bGx9ZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZD1pc051bGxPclVuZGVmaW5lZDtmdW5jdGlvbiBpc051bWJlcihhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09Im51bWJlciJ9ZXhwb3J0cy5pc051bWJlcj1pc051bWJlcjtmdW5jdGlvbiBpc1N0cmluZyhhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09InN0cmluZyJ9ZXhwb3J0cy5pc1N0cmluZz1pc1N0cmluZztmdW5jdGlvbiBpc1N5bWJvbChhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09InN5bWJvbCJ9ZXhwb3J0cy5pc1N5bWJvbD1pc1N5bWJvbDtmdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpe3JldHVybiBhcmc9PT12b2lkIDB9ZXhwb3J0cy5pc1VuZGVmaW5lZD1pc1VuZGVmaW5lZDtmdW5jdGlvbiBpc1JlZ0V4cChyZSl7cmV0dXJuIG9iamVjdFRvU3RyaW5nKHJlKT09PSJbb2JqZWN0IFJlZ0V4cF0ifWV4cG9ydHMuaXNSZWdFeHA9aXNSZWdFeHA7ZnVuY3Rpb24gaXNPYmplY3QoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJvYmplY3QiJiZhcmchPT1udWxsfWV4cG9ydHMuaXNPYmplY3Q9aXNPYmplY3Q7ZnVuY3Rpb24gaXNEYXRlKGQpe3JldHVybiBvYmplY3RUb1N0cmluZyhkKT09PSJbb2JqZWN0IERhdGVdIn1leHBvcnRzLmlzRGF0ZT1pc0RhdGU7ZnVuY3Rpb24gaXNFcnJvcihlKXtyZXR1cm4gb2JqZWN0VG9TdHJpbmcoZSk9PT0iW29iamVjdCBFcnJvcl0ifHxlIGluc3RhbmNlb2YgRXJyb3J9ZXhwb3J0cy5pc0Vycm9yPWlzRXJyb3I7ZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09ImZ1bmN0aW9uIn1leHBvcnRzLmlzRnVuY3Rpb249aXNGdW5jdGlvbjtmdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpe3JldHVybiBhcmc9PT1udWxsfHx0eXBlb2YgYXJnPT09ImJvb2xlYW4ifHx0eXBlb2YgYXJnPT09Im51bWJlciJ8fHR5cGVvZiBhcmc9PT0ic3RyaW5nInx8dHlwZW9mIGFyZz09PSJzeW1ib2wifHx0eXBlb2YgYXJnPT09InVuZGVmaW5lZCJ9ZXhwb3J0cy5pc1ByaW1pdGl2ZT1pc1ByaW1pdGl2ZTtleHBvcnRzLmlzQnVmZmVyPUJ1ZmZlci5pc0J1ZmZlcjtmdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pfX0pLmNhbGwodGhpcyx7aXNCdWZmZXI6cmVxdWlyZSgiLi4vLi4vaXMtYnVmZmVyL2luZGV4LmpzIil9KX0seyIuLi8uLi9pcy1idWZmZXIvaW5kZXguanMiOjM3fV0sMzE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgTUQ1PXJlcXVpcmUoIm1kNS5qcyIpO3ZhciBSSVBFTUQxNjA9cmVxdWlyZSgicmlwZW1kMTYwIik7dmFyIHNoYT1yZXF1aXJlKCJzaGEuanMiKTt2YXIgQmFzZT1yZXF1aXJlKCJjaXBoZXItYmFzZSIpO2Z1bmN0aW9uIEhhc2goaGFzaCl7QmFzZS5jYWxsKHRoaXMsImRpZ2VzdCIpO3RoaXMuX2hhc2g9aGFzaH1pbmhlcml0cyhIYXNoLEJhc2UpO0hhc2gucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oZGF0YSl7dGhpcy5faGFzaC51cGRhdGUoZGF0YSl9O0hhc2gucHJvdG90eXBlLl9maW5hbD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9oYXNoLmRpZ2VzdCgpfTttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBjcmVhdGVIYXNoKGFsZyl7YWxnPWFsZy50b0xvd2VyQ2FzZSgpO2lmKGFsZz09PSJtZDUiKXJldHVybiBuZXcgTUQ1O2lmKGFsZz09PSJybWQxNjAifHxhbGc9PT0icmlwZW1kMTYwIilyZXR1cm4gbmV3IFJJUEVNRDE2MDtyZXR1cm4gbmV3IEhhc2goc2hhKGFsZykpfX0seyJjaXBoZXItYmFzZSI6MjgsaW5oZXJpdHM6MzYsIm1kNS5qcyI6MzkscmlwZW1kMTYwOjgxLCJzaGEuanMiOjk0fV0sMzI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBNRDU9cmVxdWlyZSgibWQ1LmpzIik7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24oYnVmZmVyKXtyZXR1cm4obmV3IE1ENSkudXBkYXRlKGJ1ZmZlcikuZGlnZXN0KCl9fSx7Im1kNS5qcyI6Mzl9XSwzMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIG9iamVjdENyZWF0ZT1PYmplY3QuY3JlYXRlfHxvYmplY3RDcmVhdGVQb2x5ZmlsbDt2YXIgb2JqZWN0S2V5cz1PYmplY3Qua2V5c3x8b2JqZWN0S2V5c1BvbHlmaWxsO3ZhciBiaW5kPUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kfHxmdW5jdGlvbkJpbmRQb2x5ZmlsbDtmdW5jdGlvbiBFdmVudEVtaXR0ZXIoKXtpZighdGhpcy5fZXZlbnRzfHwhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsIl9ldmVudHMiKSl7dGhpcy5fZXZlbnRzPW9iamVjdENyZWF0ZShudWxsKTt0aGlzLl9ldmVudHNDb3VudD0wfXRoaXMuX21heExpc3RlbmVycz10aGlzLl9tYXhMaXN0ZW5lcnN8fHVuZGVmaW5lZH1tb2R1bGUuZXhwb3J0cz1FdmVudEVtaXR0ZXI7RXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcj1FdmVudEVtaXR0ZXI7RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzPXVuZGVmaW5lZDtFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnM9dW5kZWZpbmVkO3ZhciBkZWZhdWx0TWF4TGlzdGVuZXJzPTEwO3ZhciBoYXNEZWZpbmVQcm9wZXJ0eTt0cnl7dmFyIG89e307aWYoT2JqZWN0LmRlZmluZVByb3BlcnR5KU9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCJ4Iix7dmFsdWU6MH0pO2hhc0RlZmluZVByb3BlcnR5PW8ueD09PTB9Y2F0Y2goZXJyKXtoYXNEZWZpbmVQcm9wZXJ0eT1mYWxzZX1pZihoYXNEZWZpbmVQcm9wZXJ0eSl7T2JqZWN0LmRlZmluZVByb3BlcnR5KEV2ZW50RW1pdHRlciwiZGVmYXVsdE1heExpc3RlbmVycyIse2VudW1lcmFibGU6dHJ1ZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gZGVmYXVsdE1heExpc3RlbmVyc30sc2V0OmZ1bmN0aW9uKGFyZyl7aWYodHlwZW9mIGFyZyE9PSJudW1iZXIifHxhcmc8MHx8YXJnIT09YXJnKXRocm93IG5ldyBUeXBlRXJyb3IoJyJkZWZhdWx0TWF4TGlzdGVuZXJzIiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7ZGVmYXVsdE1heExpc3RlbmVycz1hcmd9fSl9ZWxzZXtFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycz1kZWZhdWx0TWF4TGlzdGVuZXJzfUV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uIHNldE1heExpc3RlbmVycyhuKXtpZih0eXBlb2YgbiE9PSJudW1iZXIifHxuPDB8fGlzTmFOKG4pKXRocm93IG5ldyBUeXBlRXJyb3IoJyJuIiBhcmd1bWVudCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7dGhpcy5fbWF4TGlzdGVuZXJzPW47cmV0dXJuIHRoaXN9O2Z1bmN0aW9uICRnZXRNYXhMaXN0ZW5lcnModGhhdCl7aWYodGhhdC5fbWF4TGlzdGVuZXJzPT09dW5kZWZpbmVkKXJldHVybiBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztyZXR1cm4gdGhhdC5fbWF4TGlzdGVuZXJzfUV2ZW50RW1pdHRlci5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uIGdldE1heExpc3RlbmVycygpe3JldHVybiAkZ2V0TWF4TGlzdGVuZXJzKHRoaXMpfTtmdW5jdGlvbiBlbWl0Tm9uZShoYW5kbGVyLGlzRm4sc2VsZil7aWYoaXNGbiloYW5kbGVyLmNhbGwoc2VsZik7ZWxzZXt2YXIgbGVuPWhhbmRsZXIubGVuZ3RoO3ZhciBsaXN0ZW5lcnM9YXJyYXlDbG9uZShoYW5kbGVyLGxlbik7Zm9yKHZhciBpPTA7aTxsZW47KytpKWxpc3RlbmVyc1tpXS5jYWxsKHNlbGYpfX1mdW5jdGlvbiBlbWl0T25lKGhhbmRsZXIsaXNGbixzZWxmLGFyZzEpe2lmKGlzRm4paGFuZGxlci5jYWxsKHNlbGYsYXJnMSk7ZWxzZXt2YXIgbGVuPWhhbmRsZXIubGVuZ3RoO3ZhciBsaXN0ZW5lcnM9YXJyYXlDbG9uZShoYW5kbGVyLGxlbik7Zm9yKHZhciBpPTA7aTxsZW47KytpKWxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsYXJnMSl9fWZ1bmN0aW9uIGVtaXRUd28oaGFuZGxlcixpc0ZuLHNlbGYsYXJnMSxhcmcyKXtpZihpc0ZuKWhhbmRsZXIuY2FsbChzZWxmLGFyZzEsYXJnMik7ZWxzZXt2YXIgbGVuPWhhbmRsZXIubGVuZ3RoO3ZhciBsaXN0ZW5lcnM9YXJyYXlDbG9uZShoYW5kbGVyLGxlbik7Zm9yKHZhciBpPTA7aTxsZW47KytpKWxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsYXJnMSxhcmcyKX19ZnVuY3Rpb24gZW1pdFRocmVlKGhhbmRsZXIsaXNGbixzZWxmLGFyZzEsYXJnMixhcmczKXtpZihpc0ZuKWhhbmRsZXIuY2FsbChzZWxmLGFyZzEsYXJnMixhcmczKTtlbHNle3ZhciBsZW49aGFuZGxlci5sZW5ndGg7dmFyIGxpc3RlbmVycz1hcnJheUNsb25lKGhhbmRsZXIsbGVuKTtmb3IodmFyIGk9MDtpPGxlbjsrK2kpbGlzdGVuZXJzW2ldLmNhbGwoc2VsZixhcmcxLGFyZzIsYXJnMyl9fWZ1bmN0aW9uIGVtaXRNYW55KGhhbmRsZXIsaXNGbixzZWxmLGFyZ3Mpe2lmKGlzRm4paGFuZGxlci5hcHBseShzZWxmLGFyZ3MpO2Vsc2V7dmFyIGxlbj1oYW5kbGVyLmxlbmd0aDt2YXIgbGlzdGVuZXJzPWFycmF5Q2xvbmUoaGFuZGxlcixsZW4pO2Zvcih2YXIgaT0wO2k8bGVuOysraSlsaXN0ZW5lcnNbaV0uYXBwbHkoc2VsZixhcmdzKX19RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0PWZ1bmN0aW9uIGVtaXQodHlwZSl7dmFyIGVyLGhhbmRsZXIsbGVuLGFyZ3MsaSxldmVudHM7dmFyIGRvRXJyb3I9dHlwZT09PSJlcnJvciI7ZXZlbnRzPXRoaXMuX2V2ZW50cztpZihldmVudHMpZG9FcnJvcj1kb0Vycm9yJiZldmVudHMuZXJyb3I9PW51bGw7ZWxzZSBpZighZG9FcnJvcilyZXR1cm4gZmFsc2U7aWYoZG9FcnJvcil7aWYoYXJndW1lbnRzLmxlbmd0aD4xKWVyPWFyZ3VtZW50c1sxXTtpZihlciBpbnN0YW5jZW9mIEVycm9yKXt0aHJvdyBlcn1lbHNle3ZhciBlcnI9bmV3IEVycm9yKCdVbmhhbmRsZWQgImVycm9yIiBldmVudC4gKCcrZXIrIikiKTtlcnIuY29udGV4dD1lcjt0aHJvdyBlcnJ9cmV0dXJuIGZhbHNlfWhhbmRsZXI9ZXZlbnRzW3R5cGVdO2lmKCFoYW5kbGVyKXJldHVybiBmYWxzZTt2YXIgaXNGbj10eXBlb2YgaGFuZGxlcj09PSJmdW5jdGlvbiI7bGVuPWFyZ3VtZW50cy5sZW5ndGg7c3dpdGNoKGxlbil7Y2FzZSAxOmVtaXROb25lKGhhbmRsZXIsaXNGbix0aGlzKTticmVhaztjYXNlIDI6ZW1pdE9uZShoYW5kbGVyLGlzRm4sdGhpcyxhcmd1bWVudHNbMV0pO2JyZWFrO2Nhc2UgMzplbWl0VHdvKGhhbmRsZXIsaXNGbix0aGlzLGFyZ3VtZW50c1sxXSxhcmd1bWVudHNbMl0pO2JyZWFrO2Nhc2UgNDplbWl0VGhyZWUoaGFuZGxlcixpc0ZuLHRoaXMsYXJndW1lbnRzWzFdLGFyZ3VtZW50c1syXSxhcmd1bWVudHNbM10pO2JyZWFrO2RlZmF1bHQ6YXJncz1uZXcgQXJyYXkobGVuLTEpO2ZvcihpPTE7aTxsZW47aSsrKWFyZ3NbaS0xXT1hcmd1bWVudHNbaV07ZW1pdE1hbnkoaGFuZGxlcixpc0ZuLHRoaXMsYXJncyl9cmV0dXJuIHRydWV9O2Z1bmN0aW9uIF9hZGRMaXN0ZW5lcih0YXJnZXQsdHlwZSxsaXN0ZW5lcixwcmVwZW5kKXt2YXIgbTt2YXIgZXZlbnRzO3ZhciBleGlzdGluZztpZih0eXBlb2YgbGlzdGVuZXIhPT0iZnVuY3Rpb24iKXRocm93IG5ldyBUeXBlRXJyb3IoJyJsaXN0ZW5lciIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7ZXZlbnRzPXRhcmdldC5fZXZlbnRzO2lmKCFldmVudHMpe2V2ZW50cz10YXJnZXQuX2V2ZW50cz1vYmplY3RDcmVhdGUobnVsbCk7dGFyZ2V0Ll9ldmVudHNDb3VudD0wfWVsc2V7aWYoZXZlbnRzLm5ld0xpc3RlbmVyKXt0YXJnZXQuZW1pdCgibmV3TGlzdGVuZXIiLHR5cGUsbGlzdGVuZXIubGlzdGVuZXI/bGlzdGVuZXIubGlzdGVuZXI6bGlzdGVuZXIpO2V2ZW50cz10YXJnZXQuX2V2ZW50c31leGlzdGluZz1ldmVudHNbdHlwZV19aWYoIWV4aXN0aW5nKXtleGlzdGluZz1ldmVudHNbdHlwZV09bGlzdGVuZXI7Kyt0YXJnZXQuX2V2ZW50c0NvdW50fWVsc2V7aWYodHlwZW9mIGV4aXN0aW5nPT09ImZ1bmN0aW9uIil7ZXhpc3Rpbmc9ZXZlbnRzW3R5cGVdPXByZXBlbmQ/W2xpc3RlbmVyLGV4aXN0aW5nXTpbZXhpc3RpbmcsbGlzdGVuZXJdfWVsc2V7aWYocHJlcGVuZCl7ZXhpc3RpbmcudW5zaGlmdChsaXN0ZW5lcil9ZWxzZXtleGlzdGluZy5wdXNoKGxpc3RlbmVyKX19aWYoIWV4aXN0aW5nLndhcm5lZCl7bT0kZ2V0TWF4TGlzdGVuZXJzKHRhcmdldCk7aWYobSYmbT4wJiZleGlzdGluZy5sZW5ndGg+bSl7ZXhpc3Rpbmcud2FybmVkPXRydWU7dmFyIHc9bmV3IEVycm9yKCJQb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5IGxlYWsgZGV0ZWN0ZWQuICIrZXhpc3RpbmcubGVuZ3RoKycgIicrU3RyaW5nKHR5cGUpKyciIGxpc3RlbmVycyAnKyJhZGRlZC4gVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gIisiaW5jcmVhc2UgbGltaXQuIik7dy5uYW1lPSJNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmciO3cuZW1pdHRlcj10YXJnZXQ7dy50eXBlPXR5cGU7dy5jb3VudD1leGlzdGluZy5sZW5ndGg7aWYodHlwZW9mIGNvbnNvbGU9PT0ib2JqZWN0IiYmY29uc29sZS53YXJuKXtjb25zb2xlLndhcm4oIiVzOiAlcyIsdy5uYW1lLHcubWVzc2FnZSl9fX19cmV0dXJuIHRhcmdldH1FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyPWZ1bmN0aW9uIGFkZExpc3RlbmVyKHR5cGUsbGlzdGVuZXIpe3JldHVybiBfYWRkTGlzdGVuZXIodGhpcyx0eXBlLGxpc3RlbmVyLGZhbHNlKX07RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbj1FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO0V2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyPWZ1bmN0aW9uIHByZXBlbmRMaXN0ZW5lcih0eXBlLGxpc3RlbmVyKXtyZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsdHlwZSxsaXN0ZW5lcix0cnVlKX07ZnVuY3Rpb24gb25jZVdyYXBwZXIoKXtpZighdGhpcy5maXJlZCl7dGhpcy50YXJnZXQucmVtb3ZlTGlzdGVuZXIodGhpcy50eXBlLHRoaXMud3JhcEZuKTt0aGlzLmZpcmVkPXRydWU7c3dpdGNoKGFyZ3VtZW50cy5sZW5ndGgpe2Nhc2UgMDpyZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0KTtjYXNlIDE6cmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCxhcmd1bWVudHNbMF0pO2Nhc2UgMjpyZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LGFyZ3VtZW50c1swXSxhcmd1bWVudHNbMV0pO2Nhc2UgMzpyZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LGFyZ3VtZW50c1swXSxhcmd1bWVudHNbMV0sYXJndW1lbnRzWzJdKTtkZWZhdWx0OnZhciBhcmdzPW5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtmb3IodmFyIGk9MDtpPGFyZ3MubGVuZ3RoOysraSlhcmdzW2ldPWFyZ3VtZW50c1tpXTt0aGlzLmxpc3RlbmVyLmFwcGx5KHRoaXMudGFyZ2V0LGFyZ3MpfX19ZnVuY3Rpb24gX29uY2VXcmFwKHRhcmdldCx0eXBlLGxpc3RlbmVyKXt2YXIgc3RhdGU9e2ZpcmVkOmZhbHNlLHdyYXBGbjp1bmRlZmluZWQsdGFyZ2V0OnRhcmdldCx0eXBlOnR5cGUsbGlzdGVuZXI6bGlzdGVuZXJ9O3ZhciB3cmFwcGVkPWJpbmQuY2FsbChvbmNlV3JhcHBlcixzdGF0ZSk7d3JhcHBlZC5saXN0ZW5lcj1saXN0ZW5lcjtzdGF0ZS53cmFwRm49d3JhcHBlZDtyZXR1cm4gd3JhcHBlZH1FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2U9ZnVuY3Rpb24gb25jZSh0eXBlLGxpc3RlbmVyKXtpZih0eXBlb2YgbGlzdGVuZXIhPT0iZnVuY3Rpb24iKXRocm93IG5ldyBUeXBlRXJyb3IoJyJsaXN0ZW5lciIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7dGhpcy5vbih0eXBlLF9vbmNlV3JhcCh0aGlzLHR5cGUsbGlzdGVuZXIpKTtyZXR1cm4gdGhpc307RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyPWZ1bmN0aW9uIHByZXBlbmRPbmNlTGlzdGVuZXIodHlwZSxsaXN0ZW5lcil7aWYodHlwZW9mIGxpc3RlbmVyIT09ImZ1bmN0aW9uIil0aHJvdyBuZXcgVHlwZUVycm9yKCcibGlzdGVuZXIiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO3RoaXMucHJlcGVuZExpc3RlbmVyKHR5cGUsX29uY2VXcmFwKHRoaXMsdHlwZSxsaXN0ZW5lcikpO3JldHVybiB0aGlzfTtFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyPWZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKHR5cGUsbGlzdGVuZXIpe3ZhciBsaXN0LGV2ZW50cyxwb3NpdGlvbixpLG9yaWdpbmFsTGlzdGVuZXI7aWYodHlwZW9mIGxpc3RlbmVyIT09ImZ1bmN0aW9uIil0aHJvdyBuZXcgVHlwZUVycm9yKCcibGlzdGVuZXIiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO2V2ZW50cz10aGlzLl9ldmVudHM7aWYoIWV2ZW50cylyZXR1cm4gdGhpcztsaXN0PWV2ZW50c1t0eXBlXTtpZighbGlzdClyZXR1cm4gdGhpcztpZihsaXN0PT09bGlzdGVuZXJ8fGxpc3QubGlzdGVuZXI9PT1saXN0ZW5lcil7aWYoLS10aGlzLl9ldmVudHNDb3VudD09PTApdGhpcy5fZXZlbnRzPW9iamVjdENyZWF0ZShudWxsKTtlbHNle2RlbGV0ZSBldmVudHNbdHlwZV07aWYoZXZlbnRzLnJlbW92ZUxpc3RlbmVyKXRoaXMuZW1pdCgicmVtb3ZlTGlzdGVuZXIiLHR5cGUsbGlzdC5saXN0ZW5lcnx8bGlzdGVuZXIpfX1lbHNlIGlmKHR5cGVvZiBsaXN0IT09ImZ1bmN0aW9uIil7cG9zaXRpb249LTE7Zm9yKGk9bGlzdC5sZW5ndGgtMTtpPj0wO2ktLSl7aWYobGlzdFtpXT09PWxpc3RlbmVyfHxsaXN0W2ldLmxpc3RlbmVyPT09bGlzdGVuZXIpe29yaWdpbmFsTGlzdGVuZXI9bGlzdFtpXS5saXN0ZW5lcjtwb3NpdGlvbj1pO2JyZWFrfX1pZihwb3NpdGlvbjwwKXJldHVybiB0aGlzO2lmKHBvc2l0aW9uPT09MClsaXN0LnNoaWZ0KCk7ZWxzZSBzcGxpY2VPbmUobGlzdCxwb3NpdGlvbik7aWYobGlzdC5sZW5ndGg9PT0xKWV2ZW50c1t0eXBlXT1saXN0WzBdO2lmKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcil0aGlzLmVtaXQoInJlbW92ZUxpc3RlbmVyIix0eXBlLG9yaWdpbmFsTGlzdGVuZXJ8fGxpc3RlbmVyKX1yZXR1cm4gdGhpc307RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnM9ZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKHR5cGUpe3ZhciBsaXN0ZW5lcnMsZXZlbnRzLGk7ZXZlbnRzPXRoaXMuX2V2ZW50cztpZighZXZlbnRzKXJldHVybiB0aGlzO2lmKCFldmVudHMucmVtb3ZlTGlzdGVuZXIpe2lmKGFyZ3VtZW50cy5sZW5ndGg9PT0wKXt0aGlzLl9ldmVudHM9b2JqZWN0Q3JlYXRlKG51bGwpO3RoaXMuX2V2ZW50c0NvdW50PTB9ZWxzZSBpZihldmVudHNbdHlwZV0pe2lmKC0tdGhpcy5fZXZlbnRzQ291bnQ9PT0wKXRoaXMuX2V2ZW50cz1vYmplY3RDcmVhdGUobnVsbCk7ZWxzZSBkZWxldGUgZXZlbnRzW3R5cGVdfXJldHVybiB0aGlzfWlmKGFyZ3VtZW50cy5sZW5ndGg9PT0wKXt2YXIga2V5cz1vYmplY3RLZXlzKGV2ZW50cyk7dmFyIGtleTtmb3IoaT0wO2k8a2V5cy5sZW5ndGg7KytpKXtrZXk9a2V5c1tpXTtpZihrZXk9PT0icmVtb3ZlTGlzdGVuZXIiKWNvbnRpbnVlO3RoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSl9dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoInJlbW92ZUxpc3RlbmVyIik7dGhpcy5fZXZlbnRzPW9iamVjdENyZWF0ZShudWxsKTt0aGlzLl9ldmVudHNDb3VudD0wO3JldHVybiB0aGlzfWxpc3RlbmVycz1ldmVudHNbdHlwZV07aWYodHlwZW9mIGxpc3RlbmVycz09PSJmdW5jdGlvbiIpe3RoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSxsaXN0ZW5lcnMpfWVsc2UgaWYobGlzdGVuZXJzKXtmb3IoaT1saXN0ZW5lcnMubGVuZ3RoLTE7aT49MDtpLS0pe3RoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSxsaXN0ZW5lcnNbaV0pfX1yZXR1cm4gdGhpc307ZnVuY3Rpb24gX2xpc3RlbmVycyh0YXJnZXQsdHlwZSx1bndyYXApe3ZhciBldmVudHM9dGFyZ2V0Ll9ldmVudHM7aWYoIWV2ZW50cylyZXR1cm5bXTt2YXIgZXZsaXN0ZW5lcj1ldmVudHNbdHlwZV07aWYoIWV2bGlzdGVuZXIpcmV0dXJuW107aWYodHlwZW9mIGV2bGlzdGVuZXI9PT0iZnVuY3Rpb24iKXJldHVybiB1bndyYXA/W2V2bGlzdGVuZXIubGlzdGVuZXJ8fGV2bGlzdGVuZXJdOltldmxpc3RlbmVyXTtyZXR1cm4gdW53cmFwP3Vud3JhcExpc3RlbmVycyhldmxpc3RlbmVyKTphcnJheUNsb25lKGV2bGlzdGVuZXIsZXZsaXN0ZW5lci5sZW5ndGgpfUV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzPWZ1bmN0aW9uIGxpc3RlbmVycyh0eXBlKXtyZXR1cm4gX2xpc3RlbmVycyh0aGlzLHR5cGUsdHJ1ZSl9O0V2ZW50RW1pdHRlci5wcm90b3R5cGUucmF3TGlzdGVuZXJzPWZ1bmN0aW9uIHJhd0xpc3RlbmVycyh0eXBlKXtyZXR1cm4gX2xpc3RlbmVycyh0aGlzLHR5cGUsZmFsc2UpfTtFdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudD1mdW5jdGlvbihlbWl0dGVyLHR5cGUpe2lmKHR5cGVvZiBlbWl0dGVyLmxpc3RlbmVyQ291bnQ9PT0iZnVuY3Rpb24iKXtyZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpfWVsc2V7cmV0dXJuIGxpc3RlbmVyQ291bnQuY2FsbChlbWl0dGVyLHR5cGUpfX07RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50PWxpc3RlbmVyQ291bnQ7ZnVuY3Rpb24gbGlzdGVuZXJDb3VudCh0eXBlKXt2YXIgZXZlbnRzPXRoaXMuX2V2ZW50cztpZihldmVudHMpe3ZhciBldmxpc3RlbmVyPWV2ZW50c1t0eXBlXTtpZih0eXBlb2YgZXZsaXN0ZW5lcj09PSJmdW5jdGlvbiIpe3JldHVybiAxfWVsc2UgaWYoZXZsaXN0ZW5lcil7cmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RofX1yZXR1cm4gMH1FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXM9ZnVuY3Rpb24gZXZlbnROYW1lcygpe3JldHVybiB0aGlzLl9ldmVudHNDb3VudD4wP1JlZmxlY3Qub3duS2V5cyh0aGlzLl9ldmVudHMpOltdfTtmdW5jdGlvbiBzcGxpY2VPbmUobGlzdCxpbmRleCl7Zm9yKHZhciBpPWluZGV4LGs9aSsxLG49bGlzdC5sZW5ndGg7azxuO2krPTEsays9MSlsaXN0W2ldPWxpc3Rba107bGlzdC5wb3AoKX1mdW5jdGlvbiBhcnJheUNsb25lKGFycixuKXt2YXIgY29weT1uZXcgQXJyYXkobik7Zm9yKHZhciBpPTA7aTxuOysraSljb3B5W2ldPWFycltpXTtyZXR1cm4gY29weX1mdW5jdGlvbiB1bndyYXBMaXN0ZW5lcnMoYXJyKXt2YXIgcmV0PW5ldyBBcnJheShhcnIubGVuZ3RoKTtmb3IodmFyIGk9MDtpPHJldC5sZW5ndGg7KytpKXtyZXRbaV09YXJyW2ldLmxpc3RlbmVyfHxhcnJbaV19cmV0dXJuIHJldH1mdW5jdGlvbiBvYmplY3RDcmVhdGVQb2x5ZmlsbChwcm90byl7dmFyIEY9ZnVuY3Rpb24oKXt9O0YucHJvdG90eXBlPXByb3RvO3JldHVybiBuZXcgRn1mdW5jdGlvbiBvYmplY3RLZXlzUG9seWZpbGwob2JqKXt2YXIga2V5cz1bXTtmb3IodmFyIGsgaW4gb2JqKWlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosaykpe2tleXMucHVzaChrKX1yZXR1cm4ga31mdW5jdGlvbiBmdW5jdGlvbkJpbmRQb2x5ZmlsbChjb250ZXh0KXt2YXIgZm49dGhpcztyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gZm4uYXBwbHkoY29udGV4dCxhcmd1bWVudHMpfX19LHt9XSwzNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIFRyYW5zZm9ybT1yZXF1aXJlKCJzdHJlYW0iKS5UcmFuc2Zvcm07dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7ZnVuY3Rpb24gdGhyb3dJZk5vdFN0cmluZ09yQnVmZmVyKHZhbCxwcmVmaXgpe2lmKCFCdWZmZXIuaXNCdWZmZXIodmFsKSYmdHlwZW9mIHZhbCE9PSJzdHJpbmciKXt0aHJvdyBuZXcgVHlwZUVycm9yKHByZWZpeCsiIG11c3QgYmUgYSBzdHJpbmcgb3IgYSBidWZmZXIiKX19ZnVuY3Rpb24gSGFzaEJhc2UoYmxvY2tTaXplKXtUcmFuc2Zvcm0uY2FsbCh0aGlzKTt0aGlzLl9ibG9jaz1CdWZmZXIuYWxsb2NVbnNhZmUoYmxvY2tTaXplKTt0aGlzLl9ibG9ja1NpemU9YmxvY2tTaXplO3RoaXMuX2Jsb2NrT2Zmc2V0PTA7dGhpcy5fbGVuZ3RoPVswLDAsMCwwXTt0aGlzLl9maW5hbGl6ZWQ9ZmFsc2V9aW5oZXJpdHMoSGFzaEJhc2UsVHJhbnNmb3JtKTtIYXNoQmFzZS5wcm90b3R5cGUuX3RyYW5zZm9ybT1mdW5jdGlvbihjaHVuayxlbmNvZGluZyxjYWxsYmFjayl7dmFyIGVycm9yPW51bGw7dHJ5e3RoaXMudXBkYXRlKGNodW5rLGVuY29kaW5nKX1jYXRjaChlcnIpe2Vycm9yPWVycn1jYWxsYmFjayhlcnJvcil9O0hhc2hCYXNlLnByb3RvdHlwZS5fZmx1c2g9ZnVuY3Rpb24oY2FsbGJhY2spe3ZhciBlcnJvcj1udWxsO3RyeXt0aGlzLnB1c2godGhpcy5kaWdlc3QoKSl9Y2F0Y2goZXJyKXtlcnJvcj1lcnJ9Y2FsbGJhY2soZXJyb3IpfTtIYXNoQmFzZS5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKGRhdGEsZW5jb2Rpbmcpe3Rocm93SWZOb3RTdHJpbmdPckJ1ZmZlcihkYXRhLCJEYXRhIik7aWYodGhpcy5fZmluYWxpemVkKXRocm93IG5ldyBFcnJvcigiRGlnZXN0IGFscmVhZHkgY2FsbGVkIik7aWYoIUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSlkYXRhPUJ1ZmZlci5mcm9tKGRhdGEsZW5jb2RpbmcpO3ZhciBibG9jaz10aGlzLl9ibG9jazt2YXIgb2Zmc2V0PTA7d2hpbGUodGhpcy5fYmxvY2tPZmZzZXQrZGF0YS5sZW5ndGgtb2Zmc2V0Pj10aGlzLl9ibG9ja1NpemUpe2Zvcih2YXIgaT10aGlzLl9ibG9ja09mZnNldDtpPHRoaXMuX2Jsb2NrU2l6ZTspYmxvY2tbaSsrXT1kYXRhW29mZnNldCsrXTt0aGlzLl91cGRhdGUoKTt0aGlzLl9ibG9ja09mZnNldD0wfXdoaWxlKG9mZnNldDxkYXRhLmxlbmd0aClibG9ja1t0aGlzLl9ibG9ja09mZnNldCsrXT1kYXRhW29mZnNldCsrXTtmb3IodmFyIGo9MCxjYXJyeT1kYXRhLmxlbmd0aCo4O2NhcnJ5PjA7KytqKXt0aGlzLl9sZW5ndGhbal0rPWNhcnJ5O2NhcnJ5PXRoaXMuX2xlbmd0aFtqXS80Mjk0OTY3Mjk2fDA7aWYoY2Fycnk+MCl0aGlzLl9sZW5ndGhbal0tPTQyOTQ5NjcyOTYqY2Fycnl9cmV0dXJuIHRoaXN9O0hhc2hCYXNlLnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJfdXBkYXRlIGlzIG5vdCBpbXBsZW1lbnRlZCIpfTtIYXNoQmFzZS5wcm90b3R5cGUuZGlnZXN0PWZ1bmN0aW9uKGVuY29kaW5nKXtpZih0aGlzLl9maW5hbGl6ZWQpdGhyb3cgbmV3IEVycm9yKCJEaWdlc3QgYWxyZWFkeSBjYWxsZWQiKTt0aGlzLl9maW5hbGl6ZWQ9dHJ1ZTt2YXIgZGlnZXN0PXRoaXMuX2RpZ2VzdCgpO2lmKGVuY29kaW5nIT09dW5kZWZpbmVkKWRpZ2VzdD1kaWdlc3QudG9TdHJpbmcoZW5jb2RpbmcpO3RoaXMuX2Jsb2NrLmZpbGwoMCk7dGhpcy5fYmxvY2tPZmZzZXQ9MDtmb3IodmFyIGk9MDtpPDQ7KytpKXRoaXMuX2xlbmd0aFtpXT0wO3JldHVybiBkaWdlc3R9O0hhc2hCYXNlLnByb3RvdHlwZS5fZGlnZXN0PWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJfZGlnZXN0IGlzIG5vdCBpbXBsZW1lbnRlZCIpfTttb2R1bGUuZXhwb3J0cz1IYXNoQmFzZX0se2luaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODIsc3RyZWFtOjEwMX1dLDM1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtleHBvcnRzLnJlYWQ9ZnVuY3Rpb24oYnVmZmVyLG9mZnNldCxpc0xFLG1MZW4sbkJ5dGVzKXt2YXIgZSxtO3ZhciBlTGVuPW5CeXRlcyo4LW1MZW4tMTt2YXIgZU1heD0oMTw8ZUxlbiktMTt2YXIgZUJpYXM9ZU1heD4+MTt2YXIgbkJpdHM9LTc7dmFyIGk9aXNMRT9uQnl0ZXMtMTowO3ZhciBkPWlzTEU/LTE6MTt2YXIgcz1idWZmZXJbb2Zmc2V0K2ldO2krPWQ7ZT1zJigxPDwtbkJpdHMpLTE7cz4+PS1uQml0cztuQml0cys9ZUxlbjtmb3IoO25CaXRzPjA7ZT1lKjI1NitidWZmZXJbb2Zmc2V0K2ldLGkrPWQsbkJpdHMtPTgpe31tPWUmKDE8PC1uQml0cyktMTtlPj49LW5CaXRzO25CaXRzKz1tTGVuO2Zvcig7bkJpdHM+MDttPW0qMjU2K2J1ZmZlcltvZmZzZXQraV0saSs9ZCxuQml0cy09OCl7fWlmKGU9PT0wKXtlPTEtZUJpYXN9ZWxzZSBpZihlPT09ZU1heCl7cmV0dXJuIG0/TmFOOihzPy0xOjEpKkluZmluaXR5fWVsc2V7bT1tK01hdGgucG93KDIsbUxlbik7ZT1lLWVCaWFzfXJldHVybihzPy0xOjEpKm0qTWF0aC5wb3coMixlLW1MZW4pfTtleHBvcnRzLndyaXRlPWZ1bmN0aW9uKGJ1ZmZlcix2YWx1ZSxvZmZzZXQsaXNMRSxtTGVuLG5CeXRlcyl7dmFyIGUsbSxjO3ZhciBlTGVuPW5CeXRlcyo4LW1MZW4tMTt2YXIgZU1heD0oMTw8ZUxlbiktMTt2YXIgZUJpYXM9ZU1heD4+MTt2YXIgcnQ9bUxlbj09PTIzP01hdGgucG93KDIsLTI0KS1NYXRoLnBvdygyLC03Nyk6MDt2YXIgaT1pc0xFPzA6bkJ5dGVzLTE7dmFyIGQ9aXNMRT8xOi0xO3ZhciBzPXZhbHVlPDB8fHZhbHVlPT09MCYmMS92YWx1ZTwwPzE6MDt2YWx1ZT1NYXRoLmFicyh2YWx1ZSk7aWYoaXNOYU4odmFsdWUpfHx2YWx1ZT09PUluZmluaXR5KXttPWlzTmFOKHZhbHVlKT8xOjA7ZT1lTWF4fWVsc2V7ZT1NYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKS9NYXRoLkxOMik7aWYodmFsdWUqKGM9TWF0aC5wb3coMiwtZSkpPDEpe2UtLTtjKj0yfWlmKGUrZUJpYXM+PTEpe3ZhbHVlKz1ydC9jfWVsc2V7dmFsdWUrPXJ0Kk1hdGgucG93KDIsMS1lQmlhcyl9aWYodmFsdWUqYz49Mil7ZSsrO2MvPTJ9aWYoZStlQmlhcz49ZU1heCl7bT0wO2U9ZU1heH1lbHNlIGlmKGUrZUJpYXM+PTEpe209KHZhbHVlKmMtMSkqTWF0aC5wb3coMixtTGVuKTtlPWUrZUJpYXN9ZWxzZXttPXZhbHVlKk1hdGgucG93KDIsZUJpYXMtMSkqTWF0aC5wb3coMixtTGVuKTtlPTB9fWZvcig7bUxlbj49ODtidWZmZXJbb2Zmc2V0K2ldPW0mMjU1LGkrPWQsbS89MjU2LG1MZW4tPTgpe31lPWU8PG1MZW58bTtlTGVuKz1tTGVuO2Zvcig7ZUxlbj4wO2J1ZmZlcltvZmZzZXQraV09ZSYyNTUsaSs9ZCxlLz0yNTYsZUxlbi09OCl7fWJ1ZmZlcltvZmZzZXQraS1kXXw9cyoxMjh9fSx7fV0sMzY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2lmKHR5cGVvZiBPYmplY3QuY3JlYXRlPT09ImZ1bmN0aW9uIil7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24gaW5oZXJpdHMoY3RvcixzdXBlckN0b3Ipe2lmKHN1cGVyQ3Rvcil7Y3Rvci5zdXBlcl89c3VwZXJDdG9yO2N0b3IucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSx7Y29uc3RydWN0b3I6e3ZhbHVlOmN0b3IsZW51bWVyYWJsZTpmYWxzZSx3cml0YWJsZTp0cnVlLGNvbmZpZ3VyYWJsZTp0cnVlfX0pfX19ZWxzZXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpbmhlcml0cyhjdG9yLHN1cGVyQ3Rvcil7aWYoc3VwZXJDdG9yKXtjdG9yLnN1cGVyXz1zdXBlckN0b3I7dmFyIFRlbXBDdG9yPWZ1bmN0aW9uKCl7fTtUZW1wQ3Rvci5wcm90b3R5cGU9c3VwZXJDdG9yLnByb3RvdHlwZTtjdG9yLnByb3RvdHlwZT1uZXcgVGVtcEN0b3I7Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3I9Y3Rvcn19fX0se31dLDM3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbihvYmope3JldHVybiBvYmohPW51bGwmJihpc0J1ZmZlcihvYmopfHxpc1Nsb3dCdWZmZXIob2JqKXx8ISFvYmouX2lzQnVmZmVyKX07ZnVuY3Rpb24gaXNCdWZmZXIob2JqKXtyZXR1cm4hIW9iai5jb25zdHJ1Y3RvciYmdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcj09PSJmdW5jdGlvbiImJm9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopfWZ1bmN0aW9uIGlzU2xvd0J1ZmZlcihvYmope3JldHVybiB0eXBlb2Ygb2JqLnJlYWRGbG9hdExFPT09ImZ1bmN0aW9uIiYmdHlwZW9mIG9iai5zbGljZT09PSJmdW5jdGlvbiImJmlzQnVmZmVyKG9iai5zbGljZSgwLDApKX19LHt9XSwzODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIHRvU3RyaW5nPXt9LnRvU3RyaW5nO21vZHVsZS5leHBvcnRzPUFycmF5LmlzQXJyYXl8fGZ1bmN0aW9uKGFycil7cmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKT09IltvYmplY3QgQXJyYXldIn19LHt9XSwzOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBIYXNoQmFzZT1yZXF1aXJlKCJoYXNoLWJhc2UiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBBUlJBWTE2PW5ldyBBcnJheSgxNik7ZnVuY3Rpb24gTUQ1KCl7SGFzaEJhc2UuY2FsbCh0aGlzLDY0KTt0aGlzLl9hPTE3MzI1ODQxOTM7dGhpcy5fYj00MDIzMjMzNDE3O3RoaXMuX2M9MjU2MjM4MzEwMjt0aGlzLl9kPTI3MTczMzg3OH1pbmhlcml0cyhNRDUsSGFzaEJhc2UpO01ENS5wcm90b3R5cGUuX3VwZGF0ZT1mdW5jdGlvbigpe3ZhciBNPUFSUkFZMTY7Zm9yKHZhciBpPTA7aTwxNjsrK2kpTVtpXT10aGlzLl9ibG9jay5yZWFkSW50MzJMRShpKjQpO3ZhciBhPXRoaXMuX2E7dmFyIGI9dGhpcy5fYjt2YXIgYz10aGlzLl9jO3ZhciBkPXRoaXMuX2Q7YT1mbkYoYSxiLGMsZCxNWzBdLDM2MTQwOTAzNjAsNyk7ZD1mbkYoZCxhLGIsYyxNWzFdLDM5MDU0MDI3MTAsMTIpO2M9Zm5GKGMsZCxhLGIsTVsyXSw2MDYxMDU4MTksMTcpO2I9Zm5GKGIsYyxkLGEsTVszXSwzMjUwNDQxOTY2LDIyKTthPWZuRihhLGIsYyxkLE1bNF0sNDExODU0ODM5OSw3KTtkPWZuRihkLGEsYixjLE1bNV0sMTIwMDA4MDQyNiwxMik7Yz1mbkYoYyxkLGEsYixNWzZdLDI4MjE3MzU5NTUsMTcpO2I9Zm5GKGIsYyxkLGEsTVs3XSw0MjQ5MjYxMzEzLDIyKTthPWZuRihhLGIsYyxkLE1bOF0sMTc3MDAzNTQxNiw3KTtkPWZuRihkLGEsYixjLE1bOV0sMjMzNjU1Mjg3OSwxMik7Yz1mbkYoYyxkLGEsYixNWzEwXSw0Mjk0OTI1MjMzLDE3KTtiPWZuRihiLGMsZCxhLE1bMTFdLDIzMDQ1NjMxMzQsMjIpO2E9Zm5GKGEsYixjLGQsTVsxMl0sMTgwNDYwMzY4Miw3KTtkPWZuRihkLGEsYixjLE1bMTNdLDQyNTQ2MjYxOTUsMTIpO2M9Zm5GKGMsZCxhLGIsTVsxNF0sMjc5Mjk2NTAwNiwxNyk7Yj1mbkYoYixjLGQsYSxNWzE1XSwxMjM2NTM1MzI5LDIyKTthPWZuRyhhLGIsYyxkLE1bMV0sNDEyOTE3MDc4Niw1KTtkPWZuRyhkLGEsYixjLE1bNl0sMzIyNTQ2NTY2NCw5KTtjPWZuRyhjLGQsYSxiLE1bMTFdLDY0MzcxNzcxMywxNCk7Yj1mbkcoYixjLGQsYSxNWzBdLDM5MjEwNjk5OTQsMjApO2E9Zm5HKGEsYixjLGQsTVs1XSwzNTkzNDA4NjA1LDUpO2Q9Zm5HKGQsYSxiLGMsTVsxMF0sMzgwMTYwODMsOSk7Yz1mbkcoYyxkLGEsYixNWzE1XSwzNjM0NDg4OTYxLDE0KTtiPWZuRyhiLGMsZCxhLE1bNF0sMzg4OTQyOTQ0OCwyMCk7YT1mbkcoYSxiLGMsZCxNWzldLDU2ODQ0NjQzOCw1KTtkPWZuRyhkLGEsYixjLE1bMTRdLDMyNzUxNjM2MDYsOSk7Yz1mbkcoYyxkLGEsYixNWzNdLDQxMDc2MDMzMzUsMTQpO2I9Zm5HKGIsYyxkLGEsTVs4XSwxMTYzNTMxNTAxLDIwKTthPWZuRyhhLGIsYyxkLE1bMTNdLDI4NTAyODU4MjksNSk7ZD1mbkcoZCxhLGIsYyxNWzJdLDQyNDM1NjM1MTIsOSk7Yz1mbkcoYyxkLGEsYixNWzddLDE3MzUzMjg0NzMsMTQpO2I9Zm5HKGIsYyxkLGEsTVsxMl0sMjM2ODM1OTU2MiwyMCk7YT1mbkgoYSxiLGMsZCxNWzVdLDQyOTQ1ODg3MzgsNCk7ZD1mbkgoZCxhLGIsYyxNWzhdLDIyNzIzOTI4MzMsMTEpO2M9Zm5IKGMsZCxhLGIsTVsxMV0sMTgzOTAzMDU2MiwxNik7Yj1mbkgoYixjLGQsYSxNWzE0XSw0MjU5NjU3NzQwLDIzKTthPWZuSChhLGIsYyxkLE1bMV0sMjc2Mzk3NTIzNiw0KTtkPWZuSChkLGEsYixjLE1bNF0sMTI3Mjg5MzM1MywxMSk7Yz1mbkgoYyxkLGEsYixNWzddLDQxMzk0Njk2NjQsMTYpO2I9Zm5IKGIsYyxkLGEsTVsxMF0sMzIwMDIzNjY1NiwyMyk7YT1mbkgoYSxiLGMsZCxNWzEzXSw2ODEyNzkxNzQsNCk7ZD1mbkgoZCxhLGIsYyxNWzBdLDM5MzY0MzAwNzQsMTEpO2M9Zm5IKGMsZCxhLGIsTVszXSwzNTcyNDQ1MzE3LDE2KTtiPWZuSChiLGMsZCxhLE1bNl0sNzYwMjkxODksMjMpO2E9Zm5IKGEsYixjLGQsTVs5XSwzNjU0NjAyODA5LDQpO2Q9Zm5IKGQsYSxiLGMsTVsxMl0sMzg3MzE1MTQ2MSwxMSk7Yz1mbkgoYyxkLGEsYixNWzE1XSw1MzA3NDI1MjAsMTYpO2I9Zm5IKGIsYyxkLGEsTVsyXSwzMjk5NjI4NjQ1LDIzKTthPWZuSShhLGIsYyxkLE1bMF0sNDA5NjMzNjQ1Miw2KTtkPWZuSShkLGEsYixjLE1bN10sMTEyNjg5MTQxNSwxMCk7Yz1mbkkoYyxkLGEsYixNWzE0XSwyODc4NjEyMzkxLDE1KTtiPWZuSShiLGMsZCxhLE1bNV0sNDIzNzUzMzI0MSwyMSk7YT1mbkkoYSxiLGMsZCxNWzEyXSwxNzAwNDg1NTcxLDYpO2Q9Zm5JKGQsYSxiLGMsTVszXSwyMzk5OTgwNjkwLDEwKTtjPWZuSShjLGQsYSxiLE1bMTBdLDQyOTM5MTU3NzMsMTUpO2I9Zm5JKGIsYyxkLGEsTVsxXSwyMjQwMDQ0NDk3LDIxKTthPWZuSShhLGIsYyxkLE1bOF0sMTg3MzMxMzM1OSw2KTtkPWZuSShkLGEsYixjLE1bMTVdLDQyNjQzNTU1NTIsMTApO2M9Zm5JKGMsZCxhLGIsTVs2XSwyNzM0NzY4OTE2LDE1KTtiPWZuSShiLGMsZCxhLE1bMTNdLDEzMDkxNTE2NDksMjEpO2E9Zm5JKGEsYixjLGQsTVs0XSw0MTQ5NDQ0MjI2LDYpO2Q9Zm5JKGQsYSxiLGMsTVsxMV0sMzE3NDc1NjkxNywxMCk7Yz1mbkkoYyxkLGEsYixNWzJdLDcxODc4NzI1OSwxNSk7Yj1mbkkoYixjLGQsYSxNWzldLDM5NTE0ODE3NDUsMjEpO3RoaXMuX2E9dGhpcy5fYSthfDA7dGhpcy5fYj10aGlzLl9iK2J8MDt0aGlzLl9jPXRoaXMuX2MrY3wwO3RoaXMuX2Q9dGhpcy5fZCtkfDB9O01ENS5wcm90b3R5cGUuX2RpZ2VzdD1mdW5jdGlvbigpe3RoaXMuX2Jsb2NrW3RoaXMuX2Jsb2NrT2Zmc2V0KytdPTEyODtpZih0aGlzLl9ibG9ja09mZnNldD41Nil7dGhpcy5fYmxvY2suZmlsbCgwLHRoaXMuX2Jsb2NrT2Zmc2V0LDY0KTt0aGlzLl91cGRhdGUoKTt0aGlzLl9ibG9ja09mZnNldD0wfXRoaXMuX2Jsb2NrLmZpbGwoMCx0aGlzLl9ibG9ja09mZnNldCw1Nik7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJMRSh0aGlzLl9sZW5ndGhbMF0sNTYpO3RoaXMuX2Jsb2NrLndyaXRlVUludDMyTEUodGhpcy5fbGVuZ3RoWzFdLDYwKTt0aGlzLl91cGRhdGUoKTt2YXIgYnVmZmVyPUJ1ZmZlci5hbGxvY1Vuc2FmZSgxNik7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9hLDApO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fYiw0KTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2MsOCk7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9kLDEyKTtyZXR1cm4gYnVmZmVyfTtmdW5jdGlvbiByb3RsKHgsbil7cmV0dXJuIHg8PG58eD4+PjMyLW59ZnVuY3Rpb24gZm5GKGEsYixjLGQsbSxrLHMpe3JldHVybiByb3RsKGErKGImY3x+YiZkKSttK2t8MCxzKStifDB9ZnVuY3Rpb24gZm5HKGEsYixjLGQsbSxrLHMpe3JldHVybiByb3RsKGErKGImZHxjJn5kKSttK2t8MCxzKStifDB9ZnVuY3Rpb24gZm5IKGEsYixjLGQsbSxrLHMpe3JldHVybiByb3RsKGErKGJeY15kKSttK2t8MCxzKStifDB9ZnVuY3Rpb24gZm5JKGEsYixjLGQsbSxrLHMpe3JldHVybiByb3RsKGErKGNeKGJ8fmQpKSttK2t8MCxzKStifDB9bW9kdWxlLmV4cG9ydHM9TUQ1fSx7Imhhc2gtYmFzZSI6MzQsaW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4Mn1dLDQwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtpZighQXJyYXlCdWZmZXJbImlzVmlldyJdKXtBcnJheUJ1ZmZlci5pc1ZpZXc9ZnVuY3Rpb24gaXNWaWV3KGEpe3JldHVybiBhIT09bnVsbCYmdHlwZW9mIGE9PT0ib2JqZWN0IiYmYVsiYnVmZmVyIl1pbnN0YW5jZW9mIEFycmF5QnVmZmVyfX19LHt9XSw0MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO2V4cG9ydHMuX19lc01vZHVsZT10cnVlO3ZhciBMaWdodE1hcEltcGw9ZnVuY3Rpb24oKXtmdW5jdGlvbiBMaWdodE1hcEltcGwoKXt0aGlzLnJlY29yZD1bXX1MaWdodE1hcEltcGwucHJvdG90eXBlLmhhcz1mdW5jdGlvbihrZXkpe3JldHVybiB0aGlzLnJlY29yZC5tYXAoZnVuY3Rpb24oX2Epe3ZhciBfa2V5PV9hWzBdO3JldHVybiBfa2V5fSkuaW5kZXhPZihrZXkpPj0wfTtMaWdodE1hcEltcGwucHJvdG90eXBlLmdldD1mdW5jdGlvbihrZXkpe3ZhciBlbnRyeT10aGlzLnJlY29yZC5maWx0ZXIoZnVuY3Rpb24oX2Epe3ZhciBfa2V5PV9hWzBdO3JldHVybiBfa2V5PT09a2V5fSlbMF07aWYoZW50cnk9PT11bmRlZmluZWQpe3JldHVybiB1bmRlZmluZWR9cmV0dXJuIGVudHJ5WzFdfTtMaWdodE1hcEltcGwucHJvdG90eXBlLnNldD1mdW5jdGlvbihrZXksdmFsdWUpe3ZhciBlbnRyeT10aGlzLnJlY29yZC5maWx0ZXIoZnVuY3Rpb24oX2Epe3ZhciBfa2V5PV9hWzBdO3JldHVybiBfa2V5PT09a2V5fSlbMF07aWYoZW50cnk9PT11bmRlZmluZWQpe3RoaXMucmVjb3JkLnB1c2goW2tleSx2YWx1ZV0pfWVsc2V7ZW50cnlbMV09dmFsdWV9cmV0dXJuIHRoaXN9O0xpZ2h0TWFwSW1wbC5wcm90b3R5cGVbImRlbGV0ZSJdPWZ1bmN0aW9uKGtleSl7dmFyIGluZGV4PXRoaXMucmVjb3JkLm1hcChmdW5jdGlvbihfYSl7dmFyIGtleT1fYVswXTtyZXR1cm4ga2V5fSkuaW5kZXhPZihrZXkpO2lmKGluZGV4PDApe3JldHVybiBmYWxzZX10aGlzLnJlY29yZC5zcGxpY2UoaW5kZXgsMSk7cmV0dXJuIHRydWV9O0xpZ2h0TWFwSW1wbC5wcm90b3R5cGUua2V5cz1mdW5jdGlvbigpe3JldHVybiB0aGlzLnJlY29yZC5tYXAoZnVuY3Rpb24oX2Epe3ZhciBrZXk9X2FbMF07cmV0dXJuIGtleX0pfTtyZXR1cm4gTGlnaHRNYXBJbXBsfSgpO2V4cG9ydHMuUG9seWZpbGw9dHlwZW9mIE1hcCE9PSJ1bmRlZmluZWQiP01hcDpMaWdodE1hcEltcGx9LHt9XSw0MjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIGNvbnN0YW50cz1yZXF1aXJlKCJjb25zdGFudHMiKTt2YXIgcnNhPXJlcXVpcmUoIi4vbGlicy9yc2EuanMiKTt2YXIgXz1yZXF1aXJlKCIuL3V0aWxzIikuXzt2YXIgdXRpbHM9cmVxdWlyZSgiLi91dGlscyIpO3ZhciBzY2hlbWVzPXJlcXVpcmUoIi4vc2NoZW1lcy9zY2hlbWVzLmpzIik7dmFyIGZvcm1hdHM9cmVxdWlyZSgiLi9mb3JtYXRzL2Zvcm1hdHMuanMiKTt2YXIgc2VlZHJhbmRvbT1yZXF1aXJlKCJzZWVkcmFuZG9tIik7aWYodHlwZW9mIGNvbnN0YW50cy5SU0FfTk9fUEFERElORz09PSJ1bmRlZmluZWQiKXtjb25zdGFudHMuUlNBX05PX1BBRERJTkc9M31tb2R1bGUuZXhwb3J0cz1mdW5jdGlvbigpe3ZhciBTVVBQT1JURURfSEFTSF9BTEdPUklUSE1TPXtub2RlMTA6WyJtZDQiLCJtZDUiLCJyaXBlbWQxNjAiLCJzaGExIiwic2hhMjI0Iiwic2hhMjU2Iiwic2hhMzg0Iiwic2hhNTEyIl0sbm9kZTpbIm1kNCIsIm1kNSIsInJpcGVtZDE2MCIsInNoYTEiLCJzaGEyMjQiLCJzaGEyNTYiLCJzaGEzODQiLCJzaGE1MTIiXSxpb2pzOlsibWQ0IiwibWQ1IiwicmlwZW1kMTYwIiwic2hhMSIsInNoYTIyNCIsInNoYTI1NiIsInNoYTM4NCIsInNoYTUxMiJdLGJyb3dzZXI6WyJtZDUiLCJyaXBlbWQxNjAiLCJzaGExIiwic2hhMjU2Iiwic2hhNTEyIl19O3ZhciBERUZBVUxUX0VOQ1JZUFRJT05fU0NIRU1FPSJwa2NzMV9vYWVwIjt2YXIgREVGQVVMVF9TSUdOSU5HX1NDSEVNRT0icGtjczEiO3ZhciBERUZBVUxUX0VYUE9SVF9GT1JNQVQ9InByaXZhdGUiO3ZhciBFWFBPUlRfRk9STUFUX0FMSUFTRVM9e3ByaXZhdGU6InBrY3MxLXByaXZhdGUtcGVtIiwicHJpdmF0ZS1kZXIiOiJwa2NzMS1wcml2YXRlLWRlciIscHVibGljOiJwa2NzOC1wdWJsaWMtcGVtIiwicHVibGljLWRlciI6InBrY3M4LXB1YmxpYy1kZXIifTtmdW5jdGlvbiBOb2RlUlNBKGtleSxmb3JtYXQsb3B0aW9ucyl7aWYoISh0aGlzIGluc3RhbmNlb2YgTm9kZVJTQSkpe3JldHVybiBuZXcgTm9kZVJTQShrZXksZm9ybWF0LG9wdGlvbnMpfWlmKF8uaXNPYmplY3QoZm9ybWF0KSl7b3B0aW9ucz1mb3JtYXQ7Zm9ybWF0PXVuZGVmaW5lZH10aGlzLiRvcHRpb25zPXtzaWduaW5nU2NoZW1lOkRFRkFVTFRfU0lHTklOR19TQ0hFTUUsc2lnbmluZ1NjaGVtZU9wdGlvbnM6e2hhc2g6InNoYTI1NiIsc2FsdExlbmd0aDpudWxsfSxlbmNyeXB0aW9uU2NoZW1lOkRFRkFVTFRfRU5DUllQVElPTl9TQ0hFTUUsZW5jcnlwdGlvblNjaGVtZU9wdGlvbnM6e2hhc2g6InNoYTEiLGxhYmVsOm51bGx9LGVudmlyb25tZW50OnV0aWxzLmRldGVjdEVudmlyb25tZW50KCkscnNhVXRpbHM6dGhpc307dGhpcy5rZXlQYWlyPW5ldyByc2EuS2V5O3RoaXMuJGNhY2hlPXt9O2lmKEJ1ZmZlci5pc0J1ZmZlcihrZXkpfHxfLmlzU3RyaW5nKGtleSkpe3RoaXMuaW1wb3J0S2V5KGtleSxmb3JtYXQpfWVsc2UgaWYoXy5pc09iamVjdChrZXkpKXt0aGlzLmdlbmVyYXRlS2V5UGFpcihrZXkuYixrZXkuZSl9dGhpcy5zZXRPcHRpb25zKG9wdGlvbnMpfU5vZGVSU0EuZ2VuZXJhdGVLZXlQYWlyRnJvbVNlZWQ9ZnVuY3Rpb24gZ2VuZXJhdGVLZXlQYWlyRnJvbVNlZWQoc2VlZCxiaXRzLGV4cCxlbnZpcm9ubWVudCl7dmFyIHJhbmRvbUJhY2t1cD1NYXRoLnJhbmRvbTtpZihzZWVkIT09bnVsbCl7TWF0aC5yYW5kb209ZnVuY3Rpb24oKXt2YXIgcHJldj11bmRlZmluZWQ7ZnVuY3Rpb24gcmFuZG9tKCl7cHJldj1zZWVkcmFuZG9tKHByZXY9PT11bmRlZmluZWQ/QnVmZmVyLmZyb20oc2VlZC5idWZmZXIsc2VlZC5ieXRlT2Zmc2V0LHNlZWQubGVuZ3RoKS50b1N0cmluZygiaGV4Iik6cHJldi50b0ZpeGVkKDEyKSx7Z2xvYmFsOmZhbHNlfSkucXVpY2soKTtyZXR1cm4gcHJldn1yYW5kb20uaXNTZWVkZWQ9dHJ1ZTtyZXR1cm4gcmFuZG9tfSgpfXZhciBvcHRpb25zPXVuZGVmaW5lZDtpZihlbnZpcm9ubWVudCE9PXVuZGVmaW5lZCl7b3B0aW9ucz17ZW52aXJvbm1lbnQ6ZW52aXJvbm1lbnR9fXZhciBub2RlUlNBPW5ldyBOb2RlUlNBKHVuZGVmaW5lZCx1bmRlZmluZWQsb3B0aW9ucyk7bm9kZVJTQS5nZW5lcmF0ZUtleVBhaXIoYml0cyxleHApO01hdGgucmFuZG9tPXJhbmRvbUJhY2t1cDtyZXR1cm4gbm9kZVJTQX07Tm9kZVJTQS5wcm90b3R5cGUuc2V0T3B0aW9ucz1mdW5jdGlvbihvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O2lmKG9wdGlvbnMuZW52aXJvbm1lbnQpe3RoaXMuJG9wdGlvbnMuZW52aXJvbm1lbnQ9b3B0aW9ucy5lbnZpcm9ubWVudH1pZihvcHRpb25zLnNpZ25pbmdTY2hlbWUpe2lmKF8uaXNTdHJpbmcob3B0aW9ucy5zaWduaW5nU2NoZW1lKSl7dmFyIHNpZ25pbmdTY2hlbWU9b3B0aW9ucy5zaWduaW5nU2NoZW1lLnRvTG93ZXJDYXNlKCkuc3BsaXQoIi0iKTtpZihzaWduaW5nU2NoZW1lLmxlbmd0aD09MSl7aWYoU1VQUE9SVEVEX0hBU0hfQUxHT1JJVEhNUy5ub2RlLmluZGV4T2Yoc2lnbmluZ1NjaGVtZVswXSk+LTEpe3RoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnM9e2hhc2g6c2lnbmluZ1NjaGVtZVswXX07dGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lPURFRkFVTFRfU0lHTklOR19TQ0hFTUV9ZWxzZXt0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWU9c2lnbmluZ1NjaGVtZVswXTt0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zPXtoYXNoOm51bGx9fX1lbHNle3RoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnM9e2hhc2g6c2lnbmluZ1NjaGVtZVsxXX07dGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lPXNpZ25pbmdTY2hlbWVbMF19fWVsc2UgaWYoXy5pc09iamVjdChvcHRpb25zLnNpZ25pbmdTY2hlbWUpKXt0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWU9b3B0aW9ucy5zaWduaW5nU2NoZW1lLnNjaGVtZXx8REVGQVVMVF9TSUdOSU5HX1NDSEVNRTt0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zPV8ub21pdChvcHRpb25zLnNpZ25pbmdTY2hlbWUsInNjaGVtZSIpfWlmKCFzY2hlbWVzLmlzU2lnbmF0dXJlKHRoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZSkpe3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBzaWduaW5nIHNjaGVtZSIpfWlmKHRoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuaGFzaCYmU1VQUE9SVEVEX0hBU0hfQUxHT1JJVEhNU1t0aGlzLiRvcHRpb25zLmVudmlyb25tZW50XS5pbmRleE9mKHRoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuaGFzaCk9PT0tMSl7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGhhc2hpbmcgYWxnb3JpdGhtIGZvciAiK3RoaXMuJG9wdGlvbnMuZW52aXJvbm1lbnQrIiBlbnZpcm9ubWVudCIpfX1pZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWUpe2lmKF8uaXNTdHJpbmcob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lKSl7dGhpcy4kb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lPW9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZS50b0xvd2VyQ2FzZSgpO3RoaXMuJG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnM9e319ZWxzZSBpZihfLmlzT2JqZWN0KG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZSkpe3RoaXMuJG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZT1vcHRpb25zLmVuY3J5cHRpb25TY2hlbWUuc2NoZW1lfHxERUZBVUxUX0VOQ1JZUFRJT05fU0NIRU1FO3RoaXMuJG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnM9Xy5vbWl0KG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZSwic2NoZW1lIil9aWYoIXNjaGVtZXMuaXNFbmNyeXB0aW9uKHRoaXMuJG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZSkpe3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBlbmNyeXB0aW9uIHNjaGVtZSIpfWlmKHRoaXMuJG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMuaGFzaCYmU1VQUE9SVEVEX0hBU0hfQUxHT1JJVEhNU1t0aGlzLiRvcHRpb25zLmVudmlyb25tZW50XS5pbmRleE9mKHRoaXMuJG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMuaGFzaCk9PT0tMSl7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGhhc2hpbmcgYWxnb3JpdGhtIGZvciAiK3RoaXMuJG9wdGlvbnMuZW52aXJvbm1lbnQrIiBlbnZpcm9ubWVudCIpfX10aGlzLmtleVBhaXIuc2V0T3B0aW9ucyh0aGlzLiRvcHRpb25zKX07Tm9kZVJTQS5wcm90b3R5cGUuZ2VuZXJhdGVLZXlQYWlyPWZ1bmN0aW9uKGJpdHMsZXhwKXtiaXRzPWJpdHN8fDIwNDg7ZXhwPWV4cHx8NjU1Mzc7aWYoYml0cyU4IT09MCl7dGhyb3cgRXJyb3IoIktleSBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA4LiIpfXRoaXMua2V5UGFpci5nZW5lcmF0ZShiaXRzLGV4cC50b1N0cmluZygxNikpO3RoaXMuJGNhY2hlPXt9O3JldHVybiB0aGlzfTtOb2RlUlNBLnByb3RvdHlwZS5pbXBvcnRLZXk9ZnVuY3Rpb24oa2V5RGF0YSxmb3JtYXQpe2lmKCFrZXlEYXRhKXt0aHJvdyBFcnJvcigiRW1wdHkga2V5IGdpdmVuIil9aWYoZm9ybWF0KXtmb3JtYXQ9RVhQT1JUX0ZPUk1BVF9BTElBU0VTW2Zvcm1hdF18fGZvcm1hdH1pZighZm9ybWF0cy5kZXRlY3RBbmRJbXBvcnQodGhpcy5rZXlQYWlyLGtleURhdGEsZm9ybWF0KSYmZm9ybWF0PT09dW5kZWZpbmVkKXt0aHJvdyBFcnJvcigiS2V5IGZvcm1hdCBtdXN0IGJlIHNwZWNpZmllZCIpfXRoaXMuJGNhY2hlPXt9O3JldHVybiB0aGlzfTtOb2RlUlNBLnByb3RvdHlwZS5leHBvcnRLZXk9ZnVuY3Rpb24oZm9ybWF0KXtmb3JtYXQ9Zm9ybWF0fHxERUZBVUxUX0VYUE9SVF9GT1JNQVQ7Zm9ybWF0PUVYUE9SVF9GT1JNQVRfQUxJQVNFU1tmb3JtYXRdfHxmb3JtYXQ7aWYoIXRoaXMuJGNhY2hlW2Zvcm1hdF0pe3RoaXMuJGNhY2hlW2Zvcm1hdF09Zm9ybWF0cy5kZXRlY3RBbmRFeHBvcnQodGhpcy5rZXlQYWlyLGZvcm1hdCl9cmV0dXJuIHRoaXMuJGNhY2hlW2Zvcm1hdF19O05vZGVSU0EucHJvdG90eXBlLmlzUHJpdmF0ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmtleVBhaXIuaXNQcml2YXRlKCl9O05vZGVSU0EucHJvdG90eXBlLmlzUHVibGljPWZ1bmN0aW9uKHN0cmljdCl7cmV0dXJuIHRoaXMua2V5UGFpci5pc1B1YmxpYyhzdHJpY3QpfTtOb2RlUlNBLnByb3RvdHlwZS5pc0VtcHR5PWZ1bmN0aW9uKHN0cmljdCl7cmV0dXJuISh0aGlzLmtleVBhaXIubnx8dGhpcy5rZXlQYWlyLmV8fHRoaXMua2V5UGFpci5kKX07Tm9kZVJTQS5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihidWZmZXIsZW5jb2Rpbmcsc291cmNlX2VuY29kaW5nKXtyZXR1cm4gdGhpcy4kJGVuY3J5cHRLZXkoZmFsc2UsYnVmZmVyLGVuY29kaW5nLHNvdXJjZV9lbmNvZGluZyl9O05vZGVSU0EucHJvdG90eXBlLmRlY3J5cHQ9ZnVuY3Rpb24oYnVmZmVyLGVuY29kaW5nKXtyZXR1cm4gdGhpcy4kJGRlY3J5cHRLZXkoZmFsc2UsYnVmZmVyLGVuY29kaW5nKX07Tm9kZVJTQS5wcm90b3R5cGUuZW5jcnlwdFByaXZhdGU9ZnVuY3Rpb24oYnVmZmVyLGVuY29kaW5nLHNvdXJjZV9lbmNvZGluZyl7cmV0dXJuIHRoaXMuJCRlbmNyeXB0S2V5KHRydWUsYnVmZmVyLGVuY29kaW5nLHNvdXJjZV9lbmNvZGluZyl9O05vZGVSU0EucHJvdG90eXBlLmRlY3J5cHRQdWJsaWM9ZnVuY3Rpb24oYnVmZmVyLGVuY29kaW5nKXtyZXR1cm4gdGhpcy4kJGRlY3J5cHRLZXkodHJ1ZSxidWZmZXIsZW5jb2RpbmcpfTtOb2RlUlNBLnByb3RvdHlwZS4kJGVuY3J5cHRLZXk9ZnVuY3Rpb24odXNlUHJpdmF0ZSxidWZmZXIsZW5jb2Rpbmcsc291cmNlX2VuY29kaW5nKXt0cnl7dmFyIHJlcz10aGlzLmtleVBhaXIuZW5jcnlwdCh0aGlzLiRnZXREYXRhRm9yRW5jcnlwdChidWZmZXIsc291cmNlX2VuY29kaW5nKSx1c2VQcml2YXRlKTtpZihlbmNvZGluZz09ImJ1ZmZlciJ8fCFlbmNvZGluZyl7cmV0dXJuIHJlc31lbHNle3JldHVybiByZXMudG9TdHJpbmcoZW5jb2RpbmcpfX1jYXRjaChlKXt0aHJvdyBFcnJvcigiRXJyb3IgZHVyaW5nIGVuY3J5cHRpb24uIE9yaWdpbmFsIGVycm9yOiAiK2Uuc3RhY2spfX07Tm9kZVJTQS5wcm90b3R5cGUuJCRkZWNyeXB0S2V5PWZ1bmN0aW9uKHVzZVB1YmxpYyxidWZmZXIsZW5jb2Rpbmcpe3RyeXtidWZmZXI9Xy5pc1N0cmluZyhidWZmZXIpP0J1ZmZlci5mcm9tKGJ1ZmZlciwiYmFzZTY0Iik6YnVmZmVyO3ZhciByZXM9dGhpcy5rZXlQYWlyLmRlY3J5cHQoYnVmZmVyLHVzZVB1YmxpYyk7aWYocmVzPT09bnVsbCl7dGhyb3cgRXJyb3IoIktleSBkZWNyeXB0IG1ldGhvZCByZXR1cm5zIG51bGwuIil9cmV0dXJuIHRoaXMuJGdldERlY3J5cHRlZERhdGEocmVzLGVuY29kaW5nKX1jYXRjaChlKXt0aHJvdyBFcnJvcigiRXJyb3IgZHVyaW5nIGRlY3J5cHRpb24gKHByb2JhYmx5IGluY29ycmVjdCBrZXkpLiBPcmlnaW5hbCBlcnJvcjogIitlLnN0YWNrKX19O05vZGVSU0EucHJvdG90eXBlLnNpZ249ZnVuY3Rpb24oYnVmZmVyLGVuY29kaW5nLHNvdXJjZV9lbmNvZGluZyl7aWYoIXRoaXMuaXNQcml2YXRlKCkpe3Rocm93IEVycm9yKCJUaGlzIGlzIG5vdCBwcml2YXRlIGtleSIpfXZhciByZXM9dGhpcy5rZXlQYWlyLnNpZ24odGhpcy4kZ2V0RGF0YUZvckVuY3J5cHQoYnVmZmVyLHNvdXJjZV9lbmNvZGluZykpO2lmKGVuY29kaW5nJiZlbmNvZGluZyE9ImJ1ZmZlciIpe3Jlcz1yZXMudG9TdHJpbmcoZW5jb2RpbmcpfXJldHVybiByZXN9O05vZGVSU0EucHJvdG90eXBlLnZlcmlmeT1mdW5jdGlvbihidWZmZXIsc2lnbmF0dXJlLHNvdXJjZV9lbmNvZGluZyxzaWduYXR1cmVfZW5jb2Rpbmcpe2lmKCF0aGlzLmlzUHVibGljKCkpe3Rocm93IEVycm9yKCJUaGlzIGlzIG5vdCBwdWJsaWMga2V5Iil9c2lnbmF0dXJlX2VuY29kaW5nPSFzaWduYXR1cmVfZW5jb2Rpbmd8fHNpZ25hdHVyZV9lbmNvZGluZz09ImJ1ZmZlciI/bnVsbDpzaWduYXR1cmVfZW5jb2Rpbmc7cmV0dXJuIHRoaXMua2V5UGFpci52ZXJpZnkodGhpcy4kZ2V0RGF0YUZvckVuY3J5cHQoYnVmZmVyLHNvdXJjZV9lbmNvZGluZyksc2lnbmF0dXJlLHNpZ25hdHVyZV9lbmNvZGluZyl9O05vZGVSU0EucHJvdG90eXBlLmdldEtleVNpemU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5rZXlQYWlyLmtleVNpemV9O05vZGVSU0EucHJvdG90eXBlLmdldE1heE1lc3NhZ2VTaXplPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMua2V5UGFpci5tYXhNZXNzYWdlTGVuZ3RofTtOb2RlUlNBLnByb3RvdHlwZS4kZ2V0RGF0YUZvckVuY3J5cHQ9ZnVuY3Rpb24oYnVmZmVyLGVuY29kaW5nKXtpZihfLmlzU3RyaW5nKGJ1ZmZlcil8fF8uaXNOdW1iZXIoYnVmZmVyKSl7cmV0dXJuIEJ1ZmZlci5mcm9tKCIiK2J1ZmZlcixlbmNvZGluZ3x8InV0ZjgiKX1lbHNlIGlmKEJ1ZmZlci5pc0J1ZmZlcihidWZmZXIpKXtyZXR1cm4gYnVmZmVyfWVsc2UgaWYoXy5pc09iamVjdChidWZmZXIpKXtyZXR1cm4gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoYnVmZmVyKSl9ZWxzZXt0aHJvdyBFcnJvcigiVW5leHBlY3RlZCBkYXRhIHR5cGUiKX19O05vZGVSU0EucHJvdG90eXBlLiRnZXREZWNyeXB0ZWREYXRhPWZ1bmN0aW9uKGJ1ZmZlcixlbmNvZGluZyl7ZW5jb2Rpbmc9ZW5jb2Rpbmd8fCJidWZmZXIiO2lmKGVuY29kaW5nPT0iYnVmZmVyIil7cmV0dXJuIGJ1ZmZlcn1lbHNlIGlmKGVuY29kaW5nPT0ianNvbiIpe3JldHVybiBKU09OLnBhcnNlKGJ1ZmZlci50b1N0cmluZygpKX1lbHNle3JldHVybiBidWZmZXIudG9TdHJpbmcoZW5jb2RpbmcpfX07cmV0dXJuIE5vZGVSU0F9KCl9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuL2Zvcm1hdHMvZm9ybWF0cy5qcyI6NDksIi4vbGlicy9yc2EuanMiOjUzLCIuL3NjaGVtZXMvc2NoZW1lcy5qcyI6NTcsIi4vdXRpbHMiOjU4LGJ1ZmZlcjoyNyxjb25zdGFudHM6Mjksc2VlZHJhbmRvbTo4NX1dLDQzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXsidXNlIHN0cmljdCI7dmFyIHV0aWxzPXJlcXVpcmUoIi4vdXRpbHMiKTt2YXIgc3RhbmRhbG9uZUNyZWF0ZUhhc2g9cmVxdWlyZSgiY3JlYXRlLWhhc2giKTt2YXIgZ2V0Tm9kZUNyeXB0bz1mdW5jdGlvbigpe3ZhciBub2RlQ3J5cHRvPXVuZGVmaW5lZDtyZXR1cm4gZnVuY3Rpb24oKXtpZihub2RlQ3J5cHRvPT09dW5kZWZpbmVkKXtub2RlQ3J5cHRvPXJlcXVpcmUoImNyeXB0byIrIiIpfXJldHVybiBub2RlQ3J5cHRvfX0oKTttb2R1bGUuZXhwb3J0cz17fTttb2R1bGUuZXhwb3J0cy5jcmVhdGVIYXNoPWZ1bmN0aW9uKCl7aWYodXRpbHMuZGV0ZWN0RW52aXJvbm1lbnQoKT09PSJub2RlIil7dHJ5e3ZhciBub2RlQ3J5cHRvPWdldE5vZGVDcnlwdG8oKTtyZXR1cm4gbm9kZUNyeXB0by5jcmVhdGVIYXNoLmJpbmQobm9kZUNyeXB0byl9Y2F0Y2goZXJyb3Ipe319cmV0dXJuIHN0YW5kYWxvbmVDcmVhdGVIYXNofSgpO1siY3JlYXRlU2lnbiIsImNyZWF0ZVZlcmlmeSJdLmZvckVhY2goZnVuY3Rpb24oZm5OYW1lKXttb2R1bGUuZXhwb3J0c1tmbk5hbWVdPWZ1bmN0aW9uKCl7dmFyIG5vZGVDcnlwdG89Z2V0Tm9kZUNyeXB0bygpO25vZGVDcnlwdG9bZm5OYW1lXS5hcHBseShub2RlQ3J5cHRvLGFyZ3VtZW50cyl9fSk7bW9kdWxlLmV4cG9ydHMucmFuZG9tQnl0ZXM9ZnVuY3Rpb24oKXt2YXIgYnJvd3NlckdldFJhbmRvbVZhbHVlcz1mdW5jdGlvbigpe2lmKHR5cGVvZiBjcnlwdG89PT0ib2JqZWN0IiYmISFjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gY3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKGNyeXB0byl9ZWxzZSBpZih0eXBlb2YgbXNDcnlwdG89PT0ib2JqZWN0IiYmISFtc0NyeXB0by5nZXRSYW5kb21WYWx1ZXMpe3JldHVybiBtc0NyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChtc0NyeXB0byl9ZWxzZSBpZih0eXBlb2Ygc2VsZj09PSJvYmplY3QiJiZ0eXBlb2Ygc2VsZi5jcnlwdG89PT0ib2JqZWN0IiYmISFzZWxmLmNyeXB0by5nZXRSYW5kb21WYWx1ZXMpe3JldHVybiBzZWxmLmNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChzZWxmLmNyeXB0byl9ZWxzZXtyZXR1cm4gdW5kZWZpbmVkfX0oKTt2YXIgZ2V0UmFuZG9tVmFsdWVzPWZ1bmN0aW9uKCl7dmFyIG5vbkNyeXB0b2dyYXBoaWNHZXRSYW5kb21WYWx1ZT1mdW5jdGlvbihhYnYpe3ZhciBsPWFidi5sZW5ndGg7d2hpbGUobC0tKXthYnZbbF09TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjI1Nil9cmV0dXJuIGFidn07cmV0dXJuIGZ1bmN0aW9uKGFidil7aWYoTWF0aC5yYW5kb20uaXNTZWVkZWQpe3JldHVybiBub25DcnlwdG9ncmFwaGljR2V0UmFuZG9tVmFsdWUoYWJ2KX1lbHNle2lmKCEhYnJvd3NlckdldFJhbmRvbVZhbHVlcyl7cmV0dXJuIGJyb3dzZXJHZXRSYW5kb21WYWx1ZXMoYWJ2KX1lbHNle3JldHVybiBub25DcnlwdG9ncmFwaGljR2V0UmFuZG9tVmFsdWUoYWJ2KX19fX0oKTt2YXIgTUFYX0JZVEVTPTY1NTM2O3ZhciBNQVhfVUlOVDMyPTQyOTQ5NjcyOTU7cmV0dXJuIGZ1bmN0aW9uIHJhbmRvbUJ5dGVzKHNpemUpe2lmKCFNYXRoLnJhbmRvbS5pc1NlZWRlZCYmIWJyb3dzZXJHZXRSYW5kb21WYWx1ZXMpe3RyeXt2YXIgbm9kZUJ1ZmZlckluc3Q9Z2V0Tm9kZUNyeXB0bygpLnJhbmRvbUJ5dGVzKHNpemUpO3JldHVybiBCdWZmZXIuZnJvbShub2RlQnVmZmVySW5zdC5idWZmZXIsbm9kZUJ1ZmZlckluc3QuYnl0ZU9mZnNldCxub2RlQnVmZmVySW5zdC5sZW5ndGgpfWNhdGNoKGVycm9yKXt9fWlmKHNpemU+TUFYX1VJTlQzMil0aHJvdyBuZXcgUmFuZ2VFcnJvcigicmVxdWVzdGVkIHRvbyBtYW55IHJhbmRvbSBieXRlcyIpO3ZhciBieXRlcz1CdWZmZXIuYWxsb2NVbnNhZmUoc2l6ZSk7aWYoc2l6ZT4wKXtpZihzaXplPk1BWF9CWVRFUyl7Zm9yKHZhciBnZW5lcmF0ZWQ9MDtnZW5lcmF0ZWQ8c2l6ZTtnZW5lcmF0ZWQrPU1BWF9CWVRFUyl7Z2V0UmFuZG9tVmFsdWVzKGJ5dGVzLnNsaWNlKGdlbmVyYXRlZCxnZW5lcmF0ZWQrTUFYX0JZVEVTKSl9fWVsc2V7Z2V0UmFuZG9tVmFsdWVzKGJ5dGVzKX19cmV0dXJuIGJ5dGVzfX0oKX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4vdXRpbHMiOjU4LGJ1ZmZlcjoyNywiY3JlYXRlLWhhc2giOjMxfV0sNDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtnZXRFbmdpbmU6ZnVuY3Rpb24oa2V5UGFpcixvcHRpb25zKXt2YXIgZW5naW5lPXJlcXVpcmUoIi4vanMuanMiKTtpZihvcHRpb25zLmVudmlyb25tZW50PT09Im5vZGUiKXt2YXIgY3J5cHQ9cmVxdWlyZSgiY3J5cHRvIisiIik7aWYodHlwZW9mIGNyeXB0LnB1YmxpY0VuY3J5cHQ9PT0iZnVuY3Rpb24iJiZ0eXBlb2YgY3J5cHQucHJpdmF0ZURlY3J5cHQ9PT0iZnVuY3Rpb24iKXtpZih0eXBlb2YgY3J5cHQucHJpdmF0ZUVuY3J5cHQ9PT0iZnVuY3Rpb24iJiZ0eXBlb2YgY3J5cHQucHVibGljRGVjcnlwdD09PSJmdW5jdGlvbiIpe2VuZ2luZT1yZXF1aXJlKCIuL2lvLmpzIil9ZWxzZXtlbmdpbmU9cmVxdWlyZSgiLi9ub2RlMTIuanMiKX19fXJldHVybiBlbmdpbmUoa2V5UGFpcixvcHRpb25zKX19fSx7Ii4vaW8uanMiOjQ1LCIuL2pzLmpzIjo0NiwiLi9ub2RlMTIuanMiOjQ3fV0sNDU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBjcnlwdG89cmVxdWlyZSgiY3J5cHRvIisiIik7dmFyIGNvbnN0YW50cz1yZXF1aXJlKCJjb25zdGFudHMiKTt2YXIgc2NoZW1lcz1yZXF1aXJlKCIuLi9zY2hlbWVzL3NjaGVtZXMuanMiKTttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbihrZXlQYWlyLG9wdGlvbnMpe3ZhciBwa2NzMVNjaGVtZT1zY2hlbWVzLnBrY3MxLm1ha2VTY2hlbWUoa2V5UGFpcixvcHRpb25zKTtyZXR1cm57ZW5jcnlwdDpmdW5jdGlvbihidWZmZXIsdXNlUHJpdmF0ZSl7dmFyIHBhZGRpbmc7aWYodXNlUHJpdmF0ZSl7cGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX1BBRERJTkc7aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nKXtwYWRkaW5nPW9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZ31yZXR1cm4gY3J5cHRvLnByaXZhdGVFbmNyeXB0KHtrZXk6b3B0aW9ucy5yc2FVdGlscy5leHBvcnRLZXkoInByaXZhdGUiKSxwYWRkaW5nOnBhZGRpbmd9LGJ1ZmZlcil9ZWxzZXtwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfT0FFUF9QQURESU5HO2lmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZT09PSJwa2NzMSIpe3BhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9QQURESU5HfWlmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZyl7cGFkZGluZz1vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmd9dmFyIGRhdGE9YnVmZmVyO2lmKHBhZGRpbmc9PT1jb25zdGFudHMuUlNBX05PX1BBRERJTkcpe2RhdGE9cGtjczFTY2hlbWUucGtjczBwYWQoYnVmZmVyKX1yZXR1cm4gY3J5cHRvLnB1YmxpY0VuY3J5cHQoe2tleTpvcHRpb25zLnJzYVV0aWxzLmV4cG9ydEtleSgicHVibGljIikscGFkZGluZzpwYWRkaW5nfSxkYXRhKX19LGRlY3J5cHQ6ZnVuY3Rpb24oYnVmZmVyLHVzZVB1YmxpYyl7dmFyIHBhZGRpbmc7aWYodXNlUHVibGljKXtwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfUEFERElORztpZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmcpe3BhZGRpbmc9b3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nfXJldHVybiBjcnlwdG8ucHVibGljRGVjcnlwdCh7a2V5Om9wdGlvbnMucnNhVXRpbHMuZXhwb3J0S2V5KCJwdWJsaWMiKSxwYWRkaW5nOnBhZGRpbmd9LGJ1ZmZlcil9ZWxzZXtwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfT0FFUF9QQURESU5HO2lmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZT09PSJwa2NzMSIpe3BhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9QQURESU5HfWlmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZyl7cGFkZGluZz1vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmd9dmFyIHJlcz1jcnlwdG8ucHJpdmF0ZURlY3J5cHQoe2tleTpvcHRpb25zLnJzYVV0aWxzLmV4cG9ydEtleSgicHJpdmF0ZSIpLHBhZGRpbmc6cGFkZGluZ30sYnVmZmVyKTtpZihwYWRkaW5nPT09Y29uc3RhbnRzLlJTQV9OT19QQURESU5HKXtyZXR1cm4gcGtjczFTY2hlbWUucGtjczB1bnBhZChyZXMpfXJldHVybiByZXN9fX19fSx7Ii4uL3NjaGVtZXMvc2NoZW1lcy5qcyI6NTcsY29uc3RhbnRzOjI5fV0sNDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBCaWdJbnRlZ2VyPXJlcXVpcmUoIi4uL2xpYnMvanNibi5qcyIpO3ZhciBzY2hlbWVzPXJlcXVpcmUoIi4uL3NjaGVtZXMvc2NoZW1lcy5qcyIpO21vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKGtleVBhaXIsb3B0aW9ucyl7dmFyIHBrY3MxU2NoZW1lPXNjaGVtZXMucGtjczEubWFrZVNjaGVtZShrZXlQYWlyLG9wdGlvbnMpO3JldHVybntlbmNyeXB0OmZ1bmN0aW9uKGJ1ZmZlcix1c2VQcml2YXRlKXt2YXIgbSxjO2lmKHVzZVByaXZhdGUpe209bmV3IEJpZ0ludGVnZXIocGtjczFTY2hlbWUuZW5jUGFkKGJ1ZmZlcix7dHlwZToxfSkpO2M9a2V5UGFpci4kZG9Qcml2YXRlKG0pfWVsc2V7bT1uZXcgQmlnSW50ZWdlcihrZXlQYWlyLmVuY3J5cHRpb25TY2hlbWUuZW5jUGFkKGJ1ZmZlcikpO2M9a2V5UGFpci4kZG9QdWJsaWMobSl9cmV0dXJuIGMudG9CdWZmZXIoa2V5UGFpci5lbmNyeXB0ZWREYXRhTGVuZ3RoKX0sZGVjcnlwdDpmdW5jdGlvbihidWZmZXIsdXNlUHVibGljKXt2YXIgbSxjPW5ldyBCaWdJbnRlZ2VyKGJ1ZmZlcik7aWYodXNlUHVibGljKXttPWtleVBhaXIuJGRvUHVibGljKGMpO3JldHVybiBwa2NzMVNjaGVtZS5lbmNVblBhZChtLnRvQnVmZmVyKGtleVBhaXIuZW5jcnlwdGVkRGF0YUxlbmd0aCkse3R5cGU6MX0pfWVsc2V7bT1rZXlQYWlyLiRkb1ByaXZhdGUoYyk7cmV0dXJuIGtleVBhaXIuZW5jcnlwdGlvblNjaGVtZS5lbmNVblBhZChtLnRvQnVmZmVyKGtleVBhaXIuZW5jcnlwdGVkRGF0YUxlbmd0aCkpfX19fX0seyIuLi9saWJzL2pzYm4uanMiOjUyLCIuLi9zY2hlbWVzL3NjaGVtZXMuanMiOjU3fV0sNDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBjcnlwdG89cmVxdWlyZSgiY3J5cHRvIisiIik7dmFyIGNvbnN0YW50cz1yZXF1aXJlKCJjb25zdGFudHMiKTt2YXIgc2NoZW1lcz1yZXF1aXJlKCIuLi9zY2hlbWVzL3NjaGVtZXMuanMiKTttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbihrZXlQYWlyLG9wdGlvbnMpe3ZhciBqc0VuZ2luZT1yZXF1aXJlKCIuL2pzLmpzIikoa2V5UGFpcixvcHRpb25zKTt2YXIgcGtjczFTY2hlbWU9c2NoZW1lcy5wa2NzMS5tYWtlU2NoZW1lKGtleVBhaXIsb3B0aW9ucyk7cmV0dXJue2VuY3J5cHQ6ZnVuY3Rpb24oYnVmZmVyLHVzZVByaXZhdGUpe2lmKHVzZVByaXZhdGUpe3JldHVybiBqc0VuZ2luZS5lbmNyeXB0KGJ1ZmZlcix1c2VQcml2YXRlKX12YXIgcGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX09BRVBfUEFERElORztpZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWU9PT0icGtjczEiKXtwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfUEFERElOR31pZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmcpe3BhZGRpbmc9b3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nfXZhciBkYXRhPWJ1ZmZlcjtpZihwYWRkaW5nPT09Y29uc3RhbnRzLlJTQV9OT19QQURESU5HKXtkYXRhPXBrY3MxU2NoZW1lLnBrY3MwcGFkKGJ1ZmZlcil9cmV0dXJuIGNyeXB0by5wdWJsaWNFbmNyeXB0KHtrZXk6b3B0aW9ucy5yc2FVdGlscy5leHBvcnRLZXkoInB1YmxpYyIpLHBhZGRpbmc6cGFkZGluZ30sZGF0YSl9LGRlY3J5cHQ6ZnVuY3Rpb24oYnVmZmVyLHVzZVB1YmxpYyl7aWYodXNlUHVibGljKXtyZXR1cm4ganNFbmdpbmUuZGVjcnlwdChidWZmZXIsdXNlUHVibGljKX12YXIgcGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX09BRVBfUEFERElORztpZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWU9PT0icGtjczEiKXtwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfUEFERElOR31pZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmcpe3BhZGRpbmc9b3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nfXZhciByZXM9Y3J5cHRvLnByaXZhdGVEZWNyeXB0KHtrZXk6b3B0aW9ucy5yc2FVdGlscy5leHBvcnRLZXkoInByaXZhdGUiKSxwYWRkaW5nOnBhZGRpbmd9LGJ1ZmZlcik7aWYocGFkZGluZz09PWNvbnN0YW50cy5SU0FfTk9fUEFERElORyl7cmV0dXJuIHBrY3MxU2NoZW1lLnBrY3MwdW5wYWQocmVzKX1yZXR1cm4gcmVzfX19fSx7Ii4uL3NjaGVtZXMvc2NoZW1lcy5qcyI6NTcsIi4vanMuanMiOjQ2LGNvbnN0YW50czoyOX1dLDQ4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgXz1yZXF1aXJlKCIuLi91dGlscyIpLl87bW9kdWxlLmV4cG9ydHM9e3ByaXZhdGVFeHBvcnQ6ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe3JldHVybntuOmtleS5uLnRvQnVmZmVyKCksZTprZXkuZSxkOmtleS5kLnRvQnVmZmVyKCkscDprZXkucC50b0J1ZmZlcigpLHE6a2V5LnEudG9CdWZmZXIoKSxkbXAxOmtleS5kbXAxLnRvQnVmZmVyKCksZG1xMTprZXkuZG1xMS50b0J1ZmZlcigpLGNvZWZmOmtleS5jb2VmZi50b0J1ZmZlcigpfX0scHJpdmF0ZUltcG9ydDpmdW5jdGlvbihrZXksZGF0YSxvcHRpb25zKXtpZihkYXRhLm4mJmRhdGEuZSYmZGF0YS5kJiZkYXRhLnAmJmRhdGEucSYmZGF0YS5kbXAxJiZkYXRhLmRtcTEmJmRhdGEuY29lZmYpe2tleS5zZXRQcml2YXRlKGRhdGEubixkYXRhLmUsZGF0YS5kLGRhdGEucCxkYXRhLnEsZGF0YS5kbXAxLGRhdGEuZG1xMSxkYXRhLmNvZWZmKX1lbHNle3Rocm93IEVycm9yKCJJbnZhbGlkIGtleSBkYXRhIil9fSxwdWJsaWNFeHBvcnQ6ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe3JldHVybntuOmtleS5uLnRvQnVmZmVyKCksZTprZXkuZX19LHB1YmxpY0ltcG9ydDpmdW5jdGlvbihrZXksZGF0YSxvcHRpb25zKXtpZihkYXRhLm4mJmRhdGEuZSl7a2V5LnNldFB1YmxpYyhkYXRhLm4sZGF0YS5lKX1lbHNle3Rocm93IEVycm9yKCJJbnZhbGlkIGtleSBkYXRhIil9fSxhdXRvSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhKXtpZihkYXRhLm4mJmRhdGEuZSl7aWYoZGF0YS5kJiZkYXRhLnAmJmRhdGEucSYmZGF0YS5kbXAxJiZkYXRhLmRtcTEmJmRhdGEuY29lZmYpe21vZHVsZS5leHBvcnRzLnByaXZhdGVJbXBvcnQoa2V5LGRhdGEpO3JldHVybiB0cnVlfWVsc2V7bW9kdWxlLmV4cG9ydHMucHVibGljSW1wb3J0KGtleSxkYXRhKTtyZXR1cm4gdHJ1ZX19cmV0dXJuIGZhbHNlfX19LHsiLi4vdXRpbHMiOjU4fV0sNDk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2Z1bmN0aW9uIGZvcm1hdFBhcnNlKGZvcm1hdCl7Zm9ybWF0PWZvcm1hdC5zcGxpdCgiLSIpO3ZhciBrZXlUeXBlPSJwcml2YXRlIjt2YXIga2V5T3B0PXt0eXBlOiJkZWZhdWx0In07Zm9yKHZhciBpPTE7aTxmb3JtYXQubGVuZ3RoO2krKyl7aWYoZm9ybWF0W2ldKXtzd2l0Y2goZm9ybWF0W2ldKXtjYXNlInB1YmxpYyI6a2V5VHlwZT1mb3JtYXRbaV07YnJlYWs7Y2FzZSJwcml2YXRlIjprZXlUeXBlPWZvcm1hdFtpXTticmVhaztjYXNlInBlbSI6a2V5T3B0LnR5cGU9Zm9ybWF0W2ldO2JyZWFrO2Nhc2UiZGVyIjprZXlPcHQudHlwZT1mb3JtYXRbaV07YnJlYWt9fX1yZXR1cm57c2NoZW1lOmZvcm1hdFswXSxrZXlUeXBlOmtleVR5cGUsa2V5T3B0OmtleU9wdH19bW9kdWxlLmV4cG9ydHM9e3BrY3MxOnJlcXVpcmUoIi4vcGtjczEiKSxwa2NzODpyZXF1aXJlKCIuL3BrY3M4IiksY29tcG9uZW50czpyZXF1aXJlKCIuL2NvbXBvbmVudHMiKSxpc1ByaXZhdGVFeHBvcnQ6ZnVuY3Rpb24oZm9ybWF0KXtyZXR1cm4gbW9kdWxlLmV4cG9ydHNbZm9ybWF0XSYmdHlwZW9mIG1vZHVsZS5leHBvcnRzW2Zvcm1hdF0ucHJpdmF0ZUV4cG9ydD09PSJmdW5jdGlvbiJ9LGlzUHJpdmF0ZUltcG9ydDpmdW5jdGlvbihmb3JtYXQpe3JldHVybiBtb2R1bGUuZXhwb3J0c1tmb3JtYXRdJiZ0eXBlb2YgbW9kdWxlLmV4cG9ydHNbZm9ybWF0XS5wcml2YXRlSW1wb3J0PT09ImZ1bmN0aW9uIn0saXNQdWJsaWNFeHBvcnQ6ZnVuY3Rpb24oZm9ybWF0KXtyZXR1cm4gbW9kdWxlLmV4cG9ydHNbZm9ybWF0XSYmdHlwZW9mIG1vZHVsZS5leHBvcnRzW2Zvcm1hdF0ucHVibGljRXhwb3J0PT09ImZ1bmN0aW9uIn0saXNQdWJsaWNJbXBvcnQ6ZnVuY3Rpb24oZm9ybWF0KXtyZXR1cm4gbW9kdWxlLmV4cG9ydHNbZm9ybWF0XSYmdHlwZW9mIG1vZHVsZS5leHBvcnRzW2Zvcm1hdF0ucHVibGljSW1wb3J0PT09ImZ1bmN0aW9uIn0sZGV0ZWN0QW5kSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhLGZvcm1hdCl7aWYoZm9ybWF0PT09dW5kZWZpbmVkKXtmb3IodmFyIHNjaGVtZSBpbiBtb2R1bGUuZXhwb3J0cyl7aWYodHlwZW9mIG1vZHVsZS5leHBvcnRzW3NjaGVtZV0uYXV0b0ltcG9ydD09PSJmdW5jdGlvbiImJm1vZHVsZS5leHBvcnRzW3NjaGVtZV0uYXV0b0ltcG9ydChrZXksZGF0YSkpe3JldHVybiB0cnVlfX19ZWxzZSBpZihmb3JtYXQpe3ZhciBmbXQ9Zm9ybWF0UGFyc2UoZm9ybWF0KTtpZihtb2R1bGUuZXhwb3J0c1tmbXQuc2NoZW1lXSl7aWYoZm10LmtleVR5cGU9PT0icHJpdmF0ZSIpe21vZHVsZS5leHBvcnRzW2ZtdC5zY2hlbWVdLnByaXZhdGVJbXBvcnQoa2V5LGRhdGEsZm10LmtleU9wdCl9ZWxzZXttb2R1bGUuZXhwb3J0c1tmbXQuc2NoZW1lXS5wdWJsaWNJbXBvcnQoa2V5LGRhdGEsZm10LmtleU9wdCl9fWVsc2V7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGtleSBmb3JtYXQiKX19cmV0dXJuIGZhbHNlfSxkZXRlY3RBbmRFeHBvcnQ6ZnVuY3Rpb24oa2V5LGZvcm1hdCl7aWYoZm9ybWF0KXt2YXIgZm10PWZvcm1hdFBhcnNlKGZvcm1hdCk7aWYobW9kdWxlLmV4cG9ydHNbZm10LnNjaGVtZV0pe2lmKGZtdC5rZXlUeXBlPT09InByaXZhdGUiKXtpZigha2V5LmlzUHJpdmF0ZSgpKXt0aHJvdyBFcnJvcigiVGhpcyBpcyBub3QgcHJpdmF0ZSBrZXkiKX1yZXR1cm4gbW9kdWxlLmV4cG9ydHNbZm10LnNjaGVtZV0ucHJpdmF0ZUV4cG9ydChrZXksZm10LmtleU9wdCl9ZWxzZXtpZigha2V5LmlzUHVibGljKCkpe3Rocm93IEVycm9yKCJUaGlzIGlzIG5vdCBwdWJsaWMga2V5Iil9cmV0dXJuIG1vZHVsZS5leHBvcnRzW2ZtdC5zY2hlbWVdLnB1YmxpY0V4cG9ydChrZXksZm10LmtleU9wdCl9fWVsc2V7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGtleSBmb3JtYXQiKX19fX19LHsiLi9jb21wb25lbnRzIjo0OCwiLi9wa2NzMSI6NTAsIi4vcGtjczgiOjUxfV0sNTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBiZXI9cmVxdWlyZSgiYXNuMSIpLkJlcjt2YXIgXz1yZXF1aXJlKCIuLi91dGlscyIpLl87dmFyIHV0aWxzPXJlcXVpcmUoIi4uL3V0aWxzIik7dmFyIFBSSVZBVEVfT1BFTklOR19CT1VOREFSWT0iLS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLSI7dmFyIFBSSVZBVEVfQ0xPU0lOR19CT1VOREFSWT0iLS0tLS1FTkQgUlNBIFBSSVZBVEUgS0VZLS0tLS0iO3ZhciBQVUJMSUNfT1BFTklOR19CT1VOREFSWT0iLS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tIjt2YXIgUFVCTElDX0NMT1NJTkdfQk9VTkRBUlk9Ii0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0iO21vZHVsZS5leHBvcnRzPXtwcml2YXRlRXhwb3J0OmZ1bmN0aW9uKGtleSxvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBuPWtleS5uLnRvQnVmZmVyKCk7dmFyIGQ9a2V5LmQudG9CdWZmZXIoKTt2YXIgcD1rZXkucC50b0J1ZmZlcigpO3ZhciBxPWtleS5xLnRvQnVmZmVyKCk7dmFyIGRtcDE9a2V5LmRtcDEudG9CdWZmZXIoKTt2YXIgZG1xMT1rZXkuZG1xMS50b0J1ZmZlcigpO3ZhciBjb2VmZj1rZXkuY29lZmYudG9CdWZmZXIoKTt2YXIgbGVuZ3RoPW4ubGVuZ3RoK2QubGVuZ3RoK3AubGVuZ3RoK3EubGVuZ3RoK2RtcDEubGVuZ3RoK2RtcTEubGVuZ3RoK2NvZWZmLmxlbmd0aCs1MTI7dmFyIHdyaXRlcj1uZXcgYmVyLldyaXRlcih7c2l6ZTpsZW5ndGh9KTt3cml0ZXIuc3RhcnRTZXF1ZW5jZSgpO3dyaXRlci53cml0ZUludCgwKTt3cml0ZXIud3JpdGVCdWZmZXIobiwyKTt3cml0ZXIud3JpdGVJbnQoa2V5LmUpO3dyaXRlci53cml0ZUJ1ZmZlcihkLDIpO3dyaXRlci53cml0ZUJ1ZmZlcihwLDIpO3dyaXRlci53cml0ZUJ1ZmZlcihxLDIpO3dyaXRlci53cml0ZUJ1ZmZlcihkbXAxLDIpO3dyaXRlci53cml0ZUJ1ZmZlcihkbXExLDIpO3dyaXRlci53cml0ZUJ1ZmZlcihjb2VmZiwyKTt3cml0ZXIuZW5kU2VxdWVuY2UoKTtpZihvcHRpb25zLnR5cGU9PT0iZGVyIil7cmV0dXJuIHdyaXRlci5idWZmZXJ9ZWxzZXtyZXR1cm4gUFJJVkFURV9PUEVOSU5HX0JPVU5EQVJZKyJcbiIrdXRpbHMubGluZWJyayh3cml0ZXIuYnVmZmVyLnRvU3RyaW5nKCJiYXNlNjQiKSw2NCkrIlxuIitQUklWQVRFX0NMT1NJTkdfQk9VTkRBUll9fSxwcml2YXRlSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhLG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGJ1ZmZlcjtpZihvcHRpb25zLnR5cGUhPT0iZGVyIil7aWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKXtkYXRhPWRhdGEudG9TdHJpbmcoInV0ZjgiKX1pZihfLmlzU3RyaW5nKGRhdGEpKXt2YXIgcGVtPXV0aWxzLnRyaW1TdXJyb3VuZGluZ1RleHQoZGF0YSxQUklWQVRFX09QRU5JTkdfQk9VTkRBUlksUFJJVkFURV9DTE9TSU5HX0JPVU5EQVJZKS5yZXBsYWNlKC9ccyt8XG5ccnxcbnxcciQvZ20sIiIpO2J1ZmZlcj1CdWZmZXIuZnJvbShwZW0sImJhc2U2NCIpfWVsc2V7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGtleSBmb3JtYXQiKX19ZWxzZSBpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpe2J1ZmZlcj1kYXRhfWVsc2V7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGtleSBmb3JtYXQiKX12YXIgcmVhZGVyPW5ldyBiZXIuUmVhZGVyKGJ1ZmZlcik7cmVhZGVyLnJlYWRTZXF1ZW5jZSgpO3JlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSk7a2V5LnNldFByaXZhdGUocmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKSxyZWFkZXIucmVhZFN0cmluZygyLHRydWUpLHJlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSkscmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKSxyZWFkZXIucmVhZFN0cmluZygyLHRydWUpLHJlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSkscmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKSxyZWFkZXIucmVhZFN0cmluZygyLHRydWUpKX0scHVibGljRXhwb3J0OmZ1bmN0aW9uKGtleSxvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBuPWtleS5uLnRvQnVmZmVyKCk7dmFyIGxlbmd0aD1uLmxlbmd0aCs1MTI7dmFyIGJvZHlXcml0ZXI9bmV3IGJlci5Xcml0ZXIoe3NpemU6bGVuZ3RofSk7Ym9keVdyaXRlci5zdGFydFNlcXVlbmNlKCk7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihuLDIpO2JvZHlXcml0ZXIud3JpdGVJbnQoa2V5LmUpO2JvZHlXcml0ZXIuZW5kU2VxdWVuY2UoKTtpZihvcHRpb25zLnR5cGU9PT0iZGVyIil7cmV0dXJuIGJvZHlXcml0ZXIuYnVmZmVyfWVsc2V7cmV0dXJuIFBVQkxJQ19PUEVOSU5HX0JPVU5EQVJZKyJcbiIrdXRpbHMubGluZWJyayhib2R5V3JpdGVyLmJ1ZmZlci50b1N0cmluZygiYmFzZTY0IiksNjQpKyJcbiIrUFVCTElDX0NMT1NJTkdfQk9VTkRBUll9fSxwdWJsaWNJbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEsb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgYnVmZmVyO2lmKG9wdGlvbnMudHlwZSE9PSJkZXIiKXtpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpe2RhdGE9ZGF0YS50b1N0cmluZygidXRmOCIpfWlmKF8uaXNTdHJpbmcoZGF0YSkpe3ZhciBwZW09dXRpbHMudHJpbVN1cnJvdW5kaW5nVGV4dChkYXRhLFBVQkxJQ19PUEVOSU5HX0JPVU5EQVJZLFBVQkxJQ19DTE9TSU5HX0JPVU5EQVJZKS5yZXBsYWNlKC9ccyt8XG5ccnxcbnxcciQvZ20sIiIpO2J1ZmZlcj1CdWZmZXIuZnJvbShwZW0sImJhc2U2NCIpfX1lbHNlIGlmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl7YnVmZmVyPWRhdGF9ZWxzZXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQga2V5IGZvcm1hdCIpfXZhciBib2R5PW5ldyBiZXIuUmVhZGVyKGJ1ZmZlcik7Ym9keS5yZWFkU2VxdWVuY2UoKTtrZXkuc2V0UHVibGljKGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpKX0sYXV0b0ltcG9ydDpmdW5jdGlvbihrZXksZGF0YSl7aWYoL15bXFNcc10qLS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLVxzKig/PSgoW0EtWmEtejAtOSsvPV0rXHMqKSspKVwxLS0tLS1FTkQgUlNBIFBSSVZBVEUgS0VZLS0tLS1bXFNcc10qJC9nLnRlc3QoZGF0YSkpe21vZHVsZS5leHBvcnRzLnByaXZhdGVJbXBvcnQoa2V5LGRhdGEpO3JldHVybiB0cnVlfWlmKC9eW1xTXHNdKi0tLS0tQkVHSU4gUlNBIFBVQkxJQyBLRVktLS0tLVxzKig/PSgoW0EtWmEtejAtOSsvPV0rXHMqKSspKVwxLS0tLS1FTkQgUlNBIFBVQkxJQyBLRVktLS0tLVtcU1xzXSokL2cudGVzdChkYXRhKSl7bW9kdWxlLmV4cG9ydHMucHVibGljSW1wb3J0KGtleSxkYXRhKTtyZXR1cm4gdHJ1ZX1yZXR1cm4gZmFsc2V9fX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4uL3V0aWxzIjo1OCxhc24xOjE5LGJ1ZmZlcjoyN31dLDUxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgYmVyPXJlcXVpcmUoImFzbjEiKS5CZXI7dmFyIF89cmVxdWlyZSgiLi4vdXRpbHMiKS5fO3ZhciBQVUJMSUNfUlNBX09JRD0iMS4yLjg0MC4xMTM1NDkuMS4xLjEiO3ZhciB1dGlscz1yZXF1aXJlKCIuLi91dGlscyIpO3ZhciBQUklWQVRFX09QRU5JTkdfQk9VTkRBUlk9Ii0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLSI7dmFyIFBSSVZBVEVfQ0xPU0lOR19CT1VOREFSWT0iLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLSI7dmFyIFBVQkxJQ19PUEVOSU5HX0JPVU5EQVJZPSItLS0tLUJFR0lOIFBVQkxJQyBLRVktLS0tLSI7dmFyIFBVQkxJQ19DTE9TSU5HX0JPVU5EQVJZPSItLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0iO21vZHVsZS5leHBvcnRzPXtwcml2YXRlRXhwb3J0OmZ1bmN0aW9uKGtleSxvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBuPWtleS5uLnRvQnVmZmVyKCk7dmFyIGQ9a2V5LmQudG9CdWZmZXIoKTt2YXIgcD1rZXkucC50b0J1ZmZlcigpO3ZhciBxPWtleS5xLnRvQnVmZmVyKCk7dmFyIGRtcDE9a2V5LmRtcDEudG9CdWZmZXIoKTt2YXIgZG1xMT1rZXkuZG1xMS50b0J1ZmZlcigpO3ZhciBjb2VmZj1rZXkuY29lZmYudG9CdWZmZXIoKTt2YXIgbGVuZ3RoPW4ubGVuZ3RoK2QubGVuZ3RoK3AubGVuZ3RoK3EubGVuZ3RoK2RtcDEubGVuZ3RoK2RtcTEubGVuZ3RoK2NvZWZmLmxlbmd0aCs1MTI7dmFyIGJvZHlXcml0ZXI9bmV3IGJlci5Xcml0ZXIoe3NpemU6bGVuZ3RofSk7Ym9keVdyaXRlci5zdGFydFNlcXVlbmNlKCk7Ym9keVdyaXRlci53cml0ZUludCgwKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKG4sMik7Ym9keVdyaXRlci53cml0ZUludChrZXkuZSk7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihkLDIpO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIocCwyKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKHEsMik7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihkbXAxLDIpO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIoZG1xMSwyKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKGNvZWZmLDIpO2JvZHlXcml0ZXIuZW5kU2VxdWVuY2UoKTt2YXIgd3JpdGVyPW5ldyBiZXIuV3JpdGVyKHtzaXplOmxlbmd0aH0pO3dyaXRlci5zdGFydFNlcXVlbmNlKCk7d3JpdGVyLndyaXRlSW50KDApO3dyaXRlci5zdGFydFNlcXVlbmNlKCk7d3JpdGVyLndyaXRlT0lEKFBVQkxJQ19SU0FfT0lEKTt3cml0ZXIud3JpdGVOdWxsKCk7d3JpdGVyLmVuZFNlcXVlbmNlKCk7d3JpdGVyLndyaXRlQnVmZmVyKGJvZHlXcml0ZXIuYnVmZmVyLDQpO3dyaXRlci5lbmRTZXF1ZW5jZSgpO2lmKG9wdGlvbnMudHlwZT09PSJkZXIiKXtyZXR1cm4gd3JpdGVyLmJ1ZmZlcn1lbHNle3JldHVybiBQUklWQVRFX09QRU5JTkdfQk9VTkRBUlkrIlxuIit1dGlscy5saW5lYnJrKHdyaXRlci5idWZmZXIudG9TdHJpbmcoImJhc2U2NCIpLDY0KSsiXG4iK1BSSVZBVEVfQ0xPU0lOR19CT1VOREFSWX19LHByaXZhdGVJbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEsb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgYnVmZmVyO2lmKG9wdGlvbnMudHlwZSE9PSJkZXIiKXtpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpe2RhdGE9ZGF0YS50b1N0cmluZygidXRmOCIpfWlmKF8uaXNTdHJpbmcoZGF0YSkpe3ZhciBwZW09dXRpbHMudHJpbVN1cnJvdW5kaW5nVGV4dChkYXRhLFBSSVZBVEVfT1BFTklOR19CT1VOREFSWSxQUklWQVRFX0NMT1NJTkdfQk9VTkRBUlkpLnJlcGxhY2UoIi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0iLCIiKS5yZXBsYWNlKC9ccyt8XG5ccnxcbnxcciQvZ20sIiIpO2J1ZmZlcj1CdWZmZXIuZnJvbShwZW0sImJhc2U2NCIpfWVsc2V7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGtleSBmb3JtYXQiKX19ZWxzZSBpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpe2J1ZmZlcj1kYXRhfWVsc2V7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGtleSBmb3JtYXQiKX12YXIgcmVhZGVyPW5ldyBiZXIuUmVhZGVyKGJ1ZmZlcik7cmVhZGVyLnJlYWRTZXF1ZW5jZSgpO3JlYWRlci5yZWFkSW50KDApO3ZhciBoZWFkZXI9bmV3IGJlci5SZWFkZXIocmVhZGVyLnJlYWRTdHJpbmcoNDgsdHJ1ZSkpO2lmKGhlYWRlci5yZWFkT0lEKDYsdHJ1ZSkhPT1QVUJMSUNfUlNBX09JRCl7dGhyb3cgRXJyb3IoIkludmFsaWQgUHVibGljIGtleSBmb3JtYXQiKX12YXIgYm9keT1uZXcgYmVyLlJlYWRlcihyZWFkZXIucmVhZFN0cmluZyg0LHRydWUpKTtib2R5LnJlYWRTZXF1ZW5jZSgpO2JvZHkucmVhZFN0cmluZygyLHRydWUpO2tleS5zZXRQcml2YXRlKGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpKX0scHVibGljRXhwb3J0OmZ1bmN0aW9uKGtleSxvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBuPWtleS5uLnRvQnVmZmVyKCk7dmFyIGxlbmd0aD1uLmxlbmd0aCs1MTI7dmFyIGJvZHlXcml0ZXI9bmV3IGJlci5Xcml0ZXIoe3NpemU6bGVuZ3RofSk7Ym9keVdyaXRlci53cml0ZUJ5dGUoMCk7Ym9keVdyaXRlci5zdGFydFNlcXVlbmNlKCk7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihuLDIpO2JvZHlXcml0ZXIud3JpdGVJbnQoa2V5LmUpO2JvZHlXcml0ZXIuZW5kU2VxdWVuY2UoKTt2YXIgd3JpdGVyPW5ldyBiZXIuV3JpdGVyKHtzaXplOmxlbmd0aH0pO3dyaXRlci5zdGFydFNlcXVlbmNlKCk7d3JpdGVyLnN0YXJ0U2VxdWVuY2UoKTt3cml0ZXIud3JpdGVPSUQoUFVCTElDX1JTQV9PSUQpO3dyaXRlci53cml0ZU51bGwoKTt3cml0ZXIuZW5kU2VxdWVuY2UoKTt3cml0ZXIud3JpdGVCdWZmZXIoYm9keVdyaXRlci5idWZmZXIsMyk7d3JpdGVyLmVuZFNlcXVlbmNlKCk7aWYob3B0aW9ucy50eXBlPT09ImRlciIpe3JldHVybiB3cml0ZXIuYnVmZmVyfWVsc2V7cmV0dXJuIFBVQkxJQ19PUEVOSU5HX0JPVU5EQVJZKyJcbiIrdXRpbHMubGluZWJyayh3cml0ZXIuYnVmZmVyLnRvU3RyaW5nKCJiYXNlNjQiKSw2NCkrIlxuIitQVUJMSUNfQ0xPU0lOR19CT1VOREFSWX19LHB1YmxpY0ltcG9ydDpmdW5jdGlvbihrZXksZGF0YSxvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBidWZmZXI7aWYob3B0aW9ucy50eXBlIT09ImRlciIpe2lmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl7ZGF0YT1kYXRhLnRvU3RyaW5nKCJ1dGY4Iil9aWYoXy5pc1N0cmluZyhkYXRhKSl7dmFyIHBlbT11dGlscy50cmltU3Vycm91bmRpbmdUZXh0KGRhdGEsUFVCTElDX09QRU5JTkdfQk9VTkRBUlksUFVCTElDX0NMT1NJTkdfQk9VTkRBUlkpLnJlcGxhY2UoL1xzK3xcblxyfFxufFxyJC9nbSwiIik7YnVmZmVyPUJ1ZmZlci5mcm9tKHBlbSwiYmFzZTY0Iil9fWVsc2UgaWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKXtidWZmZXI9ZGF0YX1lbHNle3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBrZXkgZm9ybWF0Iil9dmFyIHJlYWRlcj1uZXcgYmVyLlJlYWRlcihidWZmZXIpO3JlYWRlci5yZWFkU2VxdWVuY2UoKTt2YXIgaGVhZGVyPW5ldyBiZXIuUmVhZGVyKHJlYWRlci5yZWFkU3RyaW5nKDQ4LHRydWUpKTtpZihoZWFkZXIucmVhZE9JRCg2LHRydWUpIT09UFVCTElDX1JTQV9PSUQpe3Rocm93IEVycm9yKCJJbnZhbGlkIFB1YmxpYyBrZXkgZm9ybWF0Iil9dmFyIGJvZHk9bmV3IGJlci5SZWFkZXIocmVhZGVyLnJlYWRTdHJpbmcoMyx0cnVlKSk7Ym9keS5yZWFkQnl0ZSgpO2JvZHkucmVhZFNlcXVlbmNlKCk7a2V5LnNldFB1YmxpYyhib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSl9LGF1dG9JbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEpe2lmKC9eW1xTXHNdKi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxzKig/PSgoW0EtWmEtejAtOSsvPV0rXHMqKSspKVwxLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVtcU1xzXSokL2cudGVzdChkYXRhKSl7bW9kdWxlLmV4cG9ydHMucHJpdmF0ZUltcG9ydChrZXksZGF0YSk7cmV0dXJuIHRydWV9aWYoL15bXFNcc10qLS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS1ccyooPz0oKFtBLVphLXowLTkrLz1dK1xzKikrKSlcMS0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLVtcU1xzXSokL2cudGVzdChkYXRhKSl7bW9kdWxlLmV4cG9ydHMucHVibGljSW1wb3J0KGtleSxkYXRhKTtyZXR1cm4gdHJ1ZX1yZXR1cm4gZmFsc2V9fX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4uL3V0aWxzIjo1OCxhc24xOjE5LGJ1ZmZlcjoyN31dLDUyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgY3J5cHQ9cmVxdWlyZSgiLi4vY3J5cHRvIik7dmFyIF89cmVxdWlyZSgiLi4vdXRpbHMiKS5fO3ZhciBwZXRlck9sc29uX0JpZ0ludGVnZXJTdGF0aWM9cmVxdWlyZSgiYmlnLWludGVnZXIiKTt2YXIgZGJpdHM7dmFyIGNhbmFyeT0weGRlYWRiZWVmY2FmZTt2YXIgal9sbT0oY2FuYXJ5JjE2Nzc3MjE1KT09MTU3MTUwNzA7ZnVuY3Rpb24gQmlnSW50ZWdlcihhLGIpe2lmKGEhPW51bGwpe2lmKCJudW1iZXIiPT10eXBlb2YgYSl7dGhpcy5mcm9tTnVtYmVyKGEsYil9ZWxzZSBpZihCdWZmZXIuaXNCdWZmZXIoYSkpe3RoaXMuZnJvbUJ1ZmZlcihhKX1lbHNlIGlmKGI9PW51bGwmJiJzdHJpbmciIT10eXBlb2YgYSl7dGhpcy5mcm9tQnl0ZUFycmF5KGEpfWVsc2V7dGhpcy5mcm9tU3RyaW5nKGEsYil9fX1mdW5jdGlvbiBuYmkoKXtyZXR1cm4gbmV3IEJpZ0ludGVnZXIobnVsbCl9ZnVuY3Rpb24gYW0xKGkseCx3LGosYyxuKXt3aGlsZSgtLW4+PTApe3ZhciB2PXgqdGhpc1tpKytdK3dbal0rYztjPU1hdGguZmxvb3Iodi82NzEwODg2NCk7d1tqKytdPXYmNjcxMDg4NjN9cmV0dXJuIGN9ZnVuY3Rpb24gYW0yKGkseCx3LGosYyxuKXt2YXIgeGw9eCYzMjc2Nyx4aD14Pj4xNTt3aGlsZSgtLW4+PTApe3ZhciBsPXRoaXNbaV0mMzI3Njc7dmFyIGg9dGhpc1tpKytdPj4xNTt2YXIgbT14aCpsK2gqeGw7bD14bCpsKygobSYzMjc2Nyk8PDE1KSt3W2pdKyhjJjEwNzM3NDE4MjMpO2M9KGw+Pj4zMCkrKG0+Pj4xNSkreGgqaCsoYz4+PjMwKTt3W2orK109bCYxMDczNzQxODIzfXJldHVybiBjfWZ1bmN0aW9uIGFtMyhpLHgsdyxqLGMsbil7dmFyIHhsPXgmMTYzODMseGg9eD4+MTQ7d2hpbGUoLS1uPj0wKXt2YXIgbD10aGlzW2ldJjE2MzgzO3ZhciBoPXRoaXNbaSsrXT4+MTQ7dmFyIG09eGgqbCtoKnhsO2w9eGwqbCsoKG0mMTYzODMpPDwxNCkrd1tqXStjO2M9KGw+PjI4KSsobT4+MTQpK3hoKmg7d1tqKytdPWwmMjY4NDM1NDU1fXJldHVybiBjfUJpZ0ludGVnZXIucHJvdG90eXBlLmFtPWFtMztkYml0cz0yODtCaWdJbnRlZ2VyLnByb3RvdHlwZS5EQj1kYml0cztCaWdJbnRlZ2VyLnByb3RvdHlwZS5ETT0oMTw8ZGJpdHMpLTE7QmlnSW50ZWdlci5wcm90b3R5cGUuRFY9MTw8ZGJpdHM7dmFyIEJJX0ZQPTUyO0JpZ0ludGVnZXIucHJvdG90eXBlLkZWPU1hdGgucG93KDIsQklfRlApO0JpZ0ludGVnZXIucHJvdG90eXBlLkYxPUJJX0ZQLWRiaXRzO0JpZ0ludGVnZXIucHJvdG90eXBlLkYyPTIqZGJpdHMtQklfRlA7dmFyIEJJX1JNPSIwMTIzNDU2Nzg5YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoiO3ZhciBCSV9SQz1uZXcgQXJyYXk7dmFyIHJyLHZ2O3JyPSIwIi5jaGFyQ29kZUF0KDApO2Zvcih2dj0wO3Z2PD05OysrdnYpQklfUkNbcnIrK109dnY7cnI9ImEiLmNoYXJDb2RlQXQoMCk7Zm9yKHZ2PTEwO3Z2PDM2OysrdnYpQklfUkNbcnIrK109dnY7cnI9IkEiLmNoYXJDb2RlQXQoMCk7Zm9yKHZ2PTEwO3Z2PDM2OysrdnYpQklfUkNbcnIrK109dnY7ZnVuY3Rpb24gaW50MmNoYXIobil7cmV0dXJuIEJJX1JNLmNoYXJBdChuKX1mdW5jdGlvbiBpbnRBdChzLGkpe3ZhciBjPUJJX1JDW3MuY2hhckNvZGVBdChpKV07cmV0dXJuIGM9PW51bGw/LTE6Y31mdW5jdGlvbiBibnBDb3B5VG8ocil7Zm9yKHZhciBpPXRoaXMudC0xO2k+PTA7LS1pKXJbaV09dGhpc1tpXTtyLnQ9dGhpcy50O3Iucz10aGlzLnN9ZnVuY3Rpb24gYm5wRnJvbUludCh4KXt0aGlzLnQ9MTt0aGlzLnM9eDwwPy0xOjA7aWYoeD4wKXRoaXNbMF09eDtlbHNlIGlmKHg8LTEpdGhpc1swXT14K0RWO2Vsc2UgdGhpcy50PTB9ZnVuY3Rpb24gbmJ2KGkpe3ZhciByPW5iaSgpO3IuZnJvbUludChpKTtyZXR1cm4gcn1mdW5jdGlvbiBibnBGcm9tU3RyaW5nKGRhdGEscmFkaXgsdW5zaWduZWQpe3ZhciBrO3N3aXRjaChyYWRpeCl7Y2FzZSAyOms9MTticmVhaztjYXNlIDQ6az0yO2JyZWFrO2Nhc2UgODprPTM7YnJlYWs7Y2FzZSAxNjprPTQ7YnJlYWs7Y2FzZSAzMjprPTU7YnJlYWs7Y2FzZSAyNTY6az04O2JyZWFrO2RlZmF1bHQ6dGhpcy5mcm9tUmFkaXgoZGF0YSxyYWRpeCk7cmV0dXJufXRoaXMudD0wO3RoaXMucz0wO3ZhciBpPWRhdGEubGVuZ3RoO3ZhciBtaT1mYWxzZTt2YXIgc2g9MDt3aGlsZSgtLWk+PTApe3ZhciB4PWs9PTg/ZGF0YVtpXSYyNTU6aW50QXQoZGF0YSxpKTtpZih4PDApe2lmKGRhdGEuY2hhckF0KGkpPT0iLSIpbWk9dHJ1ZTtjb250aW51ZX1taT1mYWxzZTtpZihzaD09PTApdGhpc1t0aGlzLnQrK109eDtlbHNlIGlmKHNoK2s+dGhpcy5EQil7dGhpc1t0aGlzLnQtMV18PSh4JigxPDx0aGlzLkRCLXNoKS0xKTw8c2g7dGhpc1t0aGlzLnQrK109eD4+dGhpcy5EQi1zaH1lbHNlIHRoaXNbdGhpcy50LTFdfD14PDxzaDtzaCs9aztpZihzaD49dGhpcy5EQilzaC09dGhpcy5EQn1pZighdW5zaWduZWQmJms9PTgmJihkYXRhWzBdJjEyOCkhPTApe3RoaXMucz0tMTtpZihzaD4wKXRoaXNbdGhpcy50LTFdfD0oMTw8dGhpcy5EQi1zaCktMTw8c2h9dGhpcy5jbGFtcCgpO2lmKG1pKUJpZ0ludGVnZXIuWkVSTy5zdWJUbyh0aGlzLHRoaXMpfWZ1bmN0aW9uIGJucEZyb21CeXRlQXJyYXkoYSx1bnNpZ25lZCl7dGhpcy5mcm9tU3RyaW5nKGEsMjU2LHVuc2lnbmVkKX1mdW5jdGlvbiBibnBGcm9tQnVmZmVyKGEpe3RoaXMuZnJvbVN0cmluZyhhLDI1Nix0cnVlKX1mdW5jdGlvbiBibnBDbGFtcCgpe3ZhciBjPXRoaXMucyZ0aGlzLkRNO3doaWxlKHRoaXMudD4wJiZ0aGlzW3RoaXMudC0xXT09YyktLXRoaXMudH1mdW5jdGlvbiBiblRvU3RyaW5nKGIpe2lmKHRoaXMuczwwKXJldHVybiItIit0aGlzLm5lZ2F0ZSgpLnRvU3RyaW5nKGIpO3ZhciBrO2lmKGI9PTE2KWs9NDtlbHNlIGlmKGI9PTgpaz0zO2Vsc2UgaWYoYj09MilrPTE7ZWxzZSBpZihiPT0zMilrPTU7ZWxzZSBpZihiPT00KWs9MjtlbHNlIHJldHVybiB0aGlzLnRvUmFkaXgoYik7dmFyIGttPSgxPDxrKS0xLGQsbT1mYWxzZSxyPSIiLGk9dGhpcy50O3ZhciBwPXRoaXMuREItaSp0aGlzLkRCJWs7aWYoaS0tID4wKXtpZihwPHRoaXMuREImJihkPXRoaXNbaV0+PnApPjApe209dHJ1ZTtyPWludDJjaGFyKGQpfXdoaWxlKGk+PTApe2lmKHA8ayl7ZD0odGhpc1tpXSYoMTw8cCktMSk8PGstcDtkfD10aGlzWy0taV0+PihwKz10aGlzLkRCLWspfWVsc2V7ZD10aGlzW2ldPj4ocC09aykma207aWYocDw9MCl7cCs9dGhpcy5EQjstLWl9fWlmKGQ+MCltPXRydWU7aWYobSlyKz1pbnQyY2hhcihkKX19cmV0dXJuIG0/cjoiMCJ9ZnVuY3Rpb24gYm5OZWdhdGUoKXt2YXIgcj1uYmkoKTtCaWdJbnRlZ2VyLlpFUk8uc3ViVG8odGhpcyxyKTtyZXR1cm4gcn1mdW5jdGlvbiBibkFicygpe3JldHVybiB0aGlzLnM8MD90aGlzLm5lZ2F0ZSgpOnRoaXN9ZnVuY3Rpb24gYm5Db21wYXJlVG8oYSl7dmFyIHI9dGhpcy5zLWEucztpZihyIT0wKXJldHVybiByO3ZhciBpPXRoaXMudDtyPWktYS50O2lmKHIhPTApcmV0dXJuIHRoaXMuczwwPy1yOnI7d2hpbGUoLS1pPj0wKWlmKChyPXRoaXNbaV0tYVtpXSkhPTApcmV0dXJuIHI7cmV0dXJuIDB9ZnVuY3Rpb24gbmJpdHMoeCl7dmFyIHI9MSx0O2lmKCh0PXg+Pj4xNikhPTApe3g9dDtyKz0xNn1pZigodD14Pj44KSE9MCl7eD10O3IrPTh9aWYoKHQ9eD4+NCkhPTApe3g9dDtyKz00fWlmKCh0PXg+PjIpIT0wKXt4PXQ7cis9Mn1pZigodD14Pj4xKSE9MCl7eD10O3IrPTF9cmV0dXJuIHJ9ZnVuY3Rpb24gYm5CaXRMZW5ndGgoKXtpZih0aGlzLnQ8PTApcmV0dXJuIDA7cmV0dXJuIHRoaXMuREIqKHRoaXMudC0xKStuYml0cyh0aGlzW3RoaXMudC0xXV50aGlzLnMmdGhpcy5ETSl9ZnVuY3Rpb24gYm5wRExTaGlmdFRvKG4scil7dmFyIGk7Zm9yKGk9dGhpcy50LTE7aT49MDstLWkpcltpK25dPXRoaXNbaV07Zm9yKGk9bi0xO2k+PTA7LS1pKXJbaV09MDtyLnQ9dGhpcy50K247ci5zPXRoaXMuc31mdW5jdGlvbiBibnBEUlNoaWZ0VG8obixyKXtmb3IodmFyIGk9bjtpPHRoaXMudDsrK2kpcltpLW5dPXRoaXNbaV07ci50PU1hdGgubWF4KHRoaXMudC1uLDApO3Iucz10aGlzLnN9ZnVuY3Rpb24gYm5wTFNoaWZ0VG8obixyKXt2YXIgYnM9biV0aGlzLkRCO3ZhciBjYnM9dGhpcy5EQi1iczt2YXIgYm09KDE8PGNicyktMTt2YXIgZHM9TWF0aC5mbG9vcihuL3RoaXMuREIpLGM9dGhpcy5zPDxicyZ0aGlzLkRNLGk7Zm9yKGk9dGhpcy50LTE7aT49MDstLWkpe3JbaStkcysxXT10aGlzW2ldPj5jYnN8YztjPSh0aGlzW2ldJmJtKTw8YnN9Zm9yKGk9ZHMtMTtpPj0wOy0taSlyW2ldPTA7cltkc109YztyLnQ9dGhpcy50K2RzKzE7ci5zPXRoaXMucztyLmNsYW1wKCl9ZnVuY3Rpb24gYm5wUlNoaWZ0VG8obixyKXtyLnM9dGhpcy5zO3ZhciBkcz1NYXRoLmZsb29yKG4vdGhpcy5EQik7aWYoZHM+PXRoaXMudCl7ci50PTA7cmV0dXJufXZhciBicz1uJXRoaXMuREI7dmFyIGNicz10aGlzLkRCLWJzO3ZhciBibT0oMTw8YnMpLTE7clswXT10aGlzW2RzXT4+YnM7Zm9yKHZhciBpPWRzKzE7aTx0aGlzLnQ7KytpKXtyW2ktZHMtMV18PSh0aGlzW2ldJmJtKTw8Y2JzO3JbaS1kc109dGhpc1tpXT4+YnN9aWYoYnM+MClyW3RoaXMudC1kcy0xXXw9KHRoaXMucyZibSk8PGNicztyLnQ9dGhpcy50LWRzO3IuY2xhbXAoKX1mdW5jdGlvbiBibnBTdWJUbyhhLHIpe3ZhciBpPTAsYz0wLG09TWF0aC5taW4oYS50LHRoaXMudCk7d2hpbGUoaTxtKXtjKz10aGlzW2ldLWFbaV07cltpKytdPWMmdGhpcy5ETTtjPj49dGhpcy5EQn1pZihhLnQ8dGhpcy50KXtjLT1hLnM7d2hpbGUoaTx0aGlzLnQpe2MrPXRoaXNbaV07cltpKytdPWMmdGhpcy5ETTtjPj49dGhpcy5EQn1jKz10aGlzLnN9ZWxzZXtjKz10aGlzLnM7d2hpbGUoaTxhLnQpe2MtPWFbaV07cltpKytdPWMmdGhpcy5ETTtjPj49dGhpcy5EQn1jLT1hLnN9ci5zPWM8MD8tMTowO2lmKGM8LTEpcltpKytdPXRoaXMuRFYrYztlbHNlIGlmKGM+MClyW2krK109YztyLnQ9aTtyLmNsYW1wKCl9ZnVuY3Rpb24gYm5wTXVsdGlwbHlUbyhhLHIpe3ZhciB4PXRoaXMuYWJzKCkseT1hLmFicygpO3ZhciBpPXgudDtyLnQ9aSt5LnQ7d2hpbGUoLS1pPj0wKXJbaV09MDtmb3IoaT0wO2k8eS50OysraSlyW2kreC50XT14LmFtKDAseVtpXSxyLGksMCx4LnQpO3Iucz0wO3IuY2xhbXAoKTtpZih0aGlzLnMhPWEucylCaWdJbnRlZ2VyLlpFUk8uc3ViVG8ocixyKX1mdW5jdGlvbiBibnBTcXVhcmVUbyhyKXt2YXIgeD10aGlzLmFicygpO3ZhciBpPXIudD0yKngudDt3aGlsZSgtLWk+PTApcltpXT0wO2ZvcihpPTA7aTx4LnQtMTsrK2kpe3ZhciBjPXguYW0oaSx4W2ldLHIsMippLDAsMSk7aWYoKHJbaSt4LnRdKz14LmFtKGkrMSwyKnhbaV0sciwyKmkrMSxjLHgudC1pLTEpKT49eC5EVil7cltpK3gudF0tPXguRFY7cltpK3gudCsxXT0xfX1pZihyLnQ+MClyW3IudC0xXSs9eC5hbShpLHhbaV0sciwyKmksMCwxKTtyLnM9MDtyLmNsYW1wKCl9ZnVuY3Rpb24gYm5wRGl2UmVtVG8obSxxLHIpe3ZhciBwbT1tLmFicygpO2lmKHBtLnQ8PTApcmV0dXJuO3ZhciBwdD10aGlzLmFicygpO2lmKHB0LnQ8cG0udCl7aWYocSE9bnVsbClxLmZyb21JbnQoMCk7aWYociE9bnVsbCl0aGlzLmNvcHlUbyhyKTtyZXR1cm59aWYocj09bnVsbClyPW5iaSgpO3ZhciB5PW5iaSgpLHRzPXRoaXMucyxtcz1tLnM7dmFyIG5zaD10aGlzLkRCLW5iaXRzKHBtW3BtLnQtMV0pO2lmKG5zaD4wKXtwbS5sU2hpZnRUbyhuc2gseSk7cHQubFNoaWZ0VG8obnNoLHIpfWVsc2V7cG0uY29weVRvKHkpO3B0LmNvcHlUbyhyKX12YXIgeXM9eS50O3ZhciB5MD15W3lzLTFdO2lmKHkwPT09MClyZXR1cm47dmFyIHl0PXkwKigxPDx0aGlzLkYxKSsoeXM+MT95W3lzLTJdPj50aGlzLkYyOjApO3ZhciBkMT10aGlzLkZWL3l0LGQyPSgxPDx0aGlzLkYxKS95dCxlPTE8PHRoaXMuRjI7dmFyIGk9ci50LGo9aS15cyx0PXE9PW51bGw/bmJpKCk6cTt5LmRsU2hpZnRUbyhqLHQpO2lmKHIuY29tcGFyZVRvKHQpPj0wKXtyW3IudCsrXT0xO3Iuc3ViVG8odCxyKX1CaWdJbnRlZ2VyLk9ORS5kbFNoaWZ0VG8oeXMsdCk7dC5zdWJUbyh5LHkpO3doaWxlKHkudDx5cyl5W3kudCsrXT0wO3doaWxlKC0taj49MCl7dmFyIHFkPXJbLS1pXT09eTA/dGhpcy5ETTpNYXRoLmZsb29yKHJbaV0qZDErKHJbaS0xXStlKSpkMik7aWYoKHJbaV0rPXkuYW0oMCxxZCxyLGosMCx5cykpPHFkKXt5LmRsU2hpZnRUbyhqLHQpO3Iuc3ViVG8odCxyKTt3aGlsZShyW2ldPC0tcWQpci5zdWJUbyh0LHIpfX1pZihxIT1udWxsKXtyLmRyU2hpZnRUbyh5cyxxKTtpZih0cyE9bXMpQmlnSW50ZWdlci5aRVJPLnN1YlRvKHEscSl9ci50PXlzO3IuY2xhbXAoKTtpZihuc2g+MClyLnJTaGlmdFRvKG5zaCxyKTtpZih0czwwKUJpZ0ludGVnZXIuWkVSTy5zdWJUbyhyLHIpfWZ1bmN0aW9uIGJuTW9kKGEpe3ZhciByPW5iaSgpO3RoaXMuYWJzKCkuZGl2UmVtVG8oYSxudWxsLHIpO2lmKHRoaXMuczwwJiZyLmNvbXBhcmVUbyhCaWdJbnRlZ2VyLlpFUk8pPjApYS5zdWJUbyhyLHIpO3JldHVybiByfWZ1bmN0aW9uIENsYXNzaWMobSl7dGhpcy5tPW19ZnVuY3Rpb24gY0NvbnZlcnQoeCl7aWYoeC5zPDB8fHguY29tcGFyZVRvKHRoaXMubSk+PTApcmV0dXJuIHgubW9kKHRoaXMubSk7ZWxzZSByZXR1cm4geH1mdW5jdGlvbiBjUmV2ZXJ0KHgpe3JldHVybiB4fWZ1bmN0aW9uIGNSZWR1Y2UoeCl7eC5kaXZSZW1Ubyh0aGlzLm0sbnVsbCx4KX1mdW5jdGlvbiBjTXVsVG8oeCx5LHIpe3gubXVsdGlwbHlUbyh5LHIpO3RoaXMucmVkdWNlKHIpfWZ1bmN0aW9uIGNTcXJUbyh4LHIpe3guc3F1YXJlVG8ocik7dGhpcy5yZWR1Y2Uocil9Q2xhc3NpYy5wcm90b3R5cGUuY29udmVydD1jQ29udmVydDtDbGFzc2ljLnByb3RvdHlwZS5yZXZlcnQ9Y1JldmVydDtDbGFzc2ljLnByb3RvdHlwZS5yZWR1Y2U9Y1JlZHVjZTtDbGFzc2ljLnByb3RvdHlwZS5tdWxUbz1jTXVsVG87Q2xhc3NpYy5wcm90b3R5cGUuc3FyVG89Y1NxclRvO2Z1bmN0aW9uIGJucEludkRpZ2l0KCl7aWYodGhpcy50PDEpcmV0dXJuIDA7dmFyIHg9dGhpc1swXTtpZigoeCYxKT09PTApcmV0dXJuIDA7dmFyIHk9eCYzO3k9eSooMi0oeCYxNSkqeSkmMTU7eT15KigyLSh4JjI1NSkqeSkmMjU1O3k9eSooMi0oKHgmNjU1MzUpKnkmNjU1MzUpKSY2NTUzNTt5PXkqKDIteCp5JXRoaXMuRFYpJXRoaXMuRFY7cmV0dXJuIHk+MD90aGlzLkRWLXk6LXl9ZnVuY3Rpb24gTW9udGdvbWVyeShtKXt0aGlzLm09bTt0aGlzLm1wPW0uaW52RGlnaXQoKTt0aGlzLm1wbD10aGlzLm1wJjMyNzY3O3RoaXMubXBoPXRoaXMubXA+PjE1O3RoaXMudW09KDE8PG0uREItMTUpLTE7dGhpcy5tdDI9MiptLnR9ZnVuY3Rpb24gbW9udENvbnZlcnQoeCl7dmFyIHI9bmJpKCk7eC5hYnMoKS5kbFNoaWZ0VG8odGhpcy5tLnQscik7ci5kaXZSZW1Ubyh0aGlzLm0sbnVsbCxyKTtpZih4LnM8MCYmci5jb21wYXJlVG8oQmlnSW50ZWdlci5aRVJPKT4wKXRoaXMubS5zdWJUbyhyLHIpO3JldHVybiByfWZ1bmN0aW9uIG1vbnRSZXZlcnQoeCl7dmFyIHI9bmJpKCk7eC5jb3B5VG8ocik7dGhpcy5yZWR1Y2Uocik7cmV0dXJuIHJ9ZnVuY3Rpb24gbW9udFJlZHVjZSh4KXt3aGlsZSh4LnQ8PXRoaXMubXQyKXhbeC50KytdPTA7Zm9yKHZhciBpPTA7aTx0aGlzLm0udDsrK2kpe3ZhciBqPXhbaV0mMzI3Njc7dmFyIHUwPWoqdGhpcy5tcGwrKChqKnRoaXMubXBoKyh4W2ldPj4xNSkqdGhpcy5tcGwmdGhpcy51bSk8PDE1KSZ4LkRNO2o9aSt0aGlzLm0udDt4W2pdKz10aGlzLm0uYW0oMCx1MCx4LGksMCx0aGlzLm0udCk7d2hpbGUoeFtqXT49eC5EVil7eFtqXS09eC5EVjt4Wysral0rK319eC5jbGFtcCgpO3guZHJTaGlmdFRvKHRoaXMubS50LHgpO2lmKHguY29tcGFyZVRvKHRoaXMubSk+PTApeC5zdWJUbyh0aGlzLm0seCl9ZnVuY3Rpb24gbW9udFNxclRvKHgscil7eC5zcXVhcmVUbyhyKTt0aGlzLnJlZHVjZShyKX1mdW5jdGlvbiBtb250TXVsVG8oeCx5LHIpe3gubXVsdGlwbHlUbyh5LHIpO3RoaXMucmVkdWNlKHIpfU1vbnRnb21lcnkucHJvdG90eXBlLmNvbnZlcnQ9bW9udENvbnZlcnQ7TW9udGdvbWVyeS5wcm90b3R5cGUucmV2ZXJ0PW1vbnRSZXZlcnQ7TW9udGdvbWVyeS5wcm90b3R5cGUucmVkdWNlPW1vbnRSZWR1Y2U7TW9udGdvbWVyeS5wcm90b3R5cGUubXVsVG89bW9udE11bFRvO01vbnRnb21lcnkucHJvdG90eXBlLnNxclRvPW1vbnRTcXJUbztmdW5jdGlvbiBibnBJc0V2ZW4oKXtyZXR1cm4odGhpcy50PjA/dGhpc1swXSYxOnRoaXMucyk9PT0wfWZ1bmN0aW9uIGJucEV4cChlLHope2lmKGU+NDI5NDk2NzI5NXx8ZTwxKXJldHVybiBCaWdJbnRlZ2VyLk9ORTt2YXIgcj1uYmkoKSxyMj1uYmkoKSxnPXouY29udmVydCh0aGlzKSxpPW5iaXRzKGUpLTE7Zy5jb3B5VG8ocik7d2hpbGUoLS1pPj0wKXt6LnNxclRvKHIscjIpO2lmKChlJjE8PGkpPjApei5tdWxUbyhyMixnLHIpO2Vsc2V7dmFyIHQ9cjtyPXIyO3IyPXR9fXJldHVybiB6LnJldmVydChyKX1mdW5jdGlvbiBibk1vZFBvd0ludChlLG0pe3ZhciB6O2lmKGU8MjU2fHxtLmlzRXZlbigpKXo9bmV3IENsYXNzaWMobSk7ZWxzZSB6PW5ldyBNb250Z29tZXJ5KG0pO3JldHVybiB0aGlzLmV4cChlLHopfWZ1bmN0aW9uIGJuQ2xvbmUoKXt2YXIgcj1uYmkoKTt0aGlzLmNvcHlUbyhyKTtyZXR1cm4gcn1mdW5jdGlvbiBibkludFZhbHVlKCl7aWYodGhpcy5zPDApe2lmKHRoaXMudD09MSlyZXR1cm4gdGhpc1swXS10aGlzLkRWO2Vsc2UgaWYodGhpcy50PT09MClyZXR1cm4tMX1lbHNlIGlmKHRoaXMudD09MSlyZXR1cm4gdGhpc1swXTtlbHNlIGlmKHRoaXMudD09PTApcmV0dXJuIDA7cmV0dXJuKHRoaXNbMV0mKDE8PDMyLXRoaXMuREIpLTEpPDx0aGlzLkRCfHRoaXNbMF19ZnVuY3Rpb24gYm5CeXRlVmFsdWUoKXtyZXR1cm4gdGhpcy50PT0wP3RoaXMuczp0aGlzWzBdPDwyND4+MjR9ZnVuY3Rpb24gYm5TaG9ydFZhbHVlKCl7cmV0dXJuIHRoaXMudD09MD90aGlzLnM6dGhpc1swXTw8MTY+PjE2fWZ1bmN0aW9uIGJucENodW5rU2l6ZShyKXtyZXR1cm4gTWF0aC5mbG9vcihNYXRoLkxOMip0aGlzLkRCL01hdGgubG9nKHIpKX1mdW5jdGlvbiBiblNpZ051bSgpe2lmKHRoaXMuczwwKXJldHVybi0xO2Vsc2UgaWYodGhpcy50PD0wfHx0aGlzLnQ9PTEmJnRoaXNbMF08PTApcmV0dXJuIDA7ZWxzZSByZXR1cm4gMX1mdW5jdGlvbiBibnBUb1JhZGl4KGIpe2lmKGI9PW51bGwpYj0xMDtpZih0aGlzLnNpZ251bSgpPT09MHx8YjwyfHxiPjM2KXJldHVybiIwIjt2YXIgY3M9dGhpcy5jaHVua1NpemUoYik7dmFyIGE9TWF0aC5wb3coYixjcyk7dmFyIGQ9bmJ2KGEpLHk9bmJpKCksej1uYmkoKSxyPSIiO3RoaXMuZGl2UmVtVG8oZCx5LHopO3doaWxlKHkuc2lnbnVtKCk+MCl7cj0oYSt6LmludFZhbHVlKCkpLnRvU3RyaW5nKGIpLnN1YnN0cigxKStyO3kuZGl2UmVtVG8oZCx5LHopfXJldHVybiB6LmludFZhbHVlKCkudG9TdHJpbmcoYikrcn1mdW5jdGlvbiBibnBGcm9tUmFkaXgocyxiKXt0aGlzLmZyb21JbnQoMCk7aWYoYj09bnVsbCliPTEwO3ZhciBjcz10aGlzLmNodW5rU2l6ZShiKTt2YXIgZD1NYXRoLnBvdyhiLGNzKSxtaT1mYWxzZSxqPTAsdz0wO2Zvcih2YXIgaT0wO2k8cy5sZW5ndGg7KytpKXt2YXIgeD1pbnRBdChzLGkpO2lmKHg8MCl7aWYocy5jaGFyQXQoaSk9PSItIiYmdGhpcy5zaWdudW0oKT09PTApbWk9dHJ1ZTtjb250aW51ZX13PWIqdyt4O2lmKCsraj49Y3Mpe3RoaXMuZE11bHRpcGx5KGQpO3RoaXMuZEFkZE9mZnNldCh3LDApO2o9MDt3PTB9fWlmKGo+MCl7dGhpcy5kTXVsdGlwbHkoTWF0aC5wb3coYixqKSk7dGhpcy5kQWRkT2Zmc2V0KHcsMCl9aWYobWkpQmlnSW50ZWdlci5aRVJPLnN1YlRvKHRoaXMsdGhpcyl9ZnVuY3Rpb24gYm5wRnJvbU51bWJlcihhLGIpe2lmKCJudW1iZXIiPT10eXBlb2YgYil7aWYoYTwyKXRoaXMuZnJvbUludCgxKTtlbHNle3RoaXMuZnJvbU51bWJlcihhKTtpZighdGhpcy50ZXN0Qml0KGEtMSkpdGhpcy5iaXR3aXNlVG8oQmlnSW50ZWdlci5PTkUuc2hpZnRMZWZ0KGEtMSksb3Bfb3IsdGhpcyk7aWYodGhpcy5pc0V2ZW4oKSl0aGlzLmRBZGRPZmZzZXQoMSwwKTt3aGlsZSghdGhpcy5pc1Byb2JhYmxlUHJpbWUoYikpe3RoaXMuZEFkZE9mZnNldCgyLDApO2lmKHRoaXMuYml0TGVuZ3RoKCk+YSl0aGlzLnN1YlRvKEJpZ0ludGVnZXIuT05FLnNoaWZ0TGVmdChhLTEpLHRoaXMpfX19ZWxzZXt2YXIgeD1jcnlwdC5yYW5kb21CeXRlcygoYT4+MykrMSk7dmFyIHQ9YSY3O2lmKHQ+MCl4WzBdJj0oMTw8dCktMTtlbHNlIHhbMF09MDt0aGlzLmZyb21CeXRlQXJyYXkoeCl9fWZ1bmN0aW9uIGJuVG9CeXRlQXJyYXkoKXt2YXIgaT10aGlzLnQscj1uZXcgQXJyYXk7clswXT10aGlzLnM7dmFyIHA9dGhpcy5EQi1pKnRoaXMuREIlOCxkLGs9MDtpZihpLS0gPjApe2lmKHA8dGhpcy5EQiYmKGQ9dGhpc1tpXT4+cCkhPSh0aGlzLnMmdGhpcy5ETSk+PnApcltrKytdPWR8dGhpcy5zPDx0aGlzLkRCLXA7d2hpbGUoaT49MCl7aWYocDw4KXtkPSh0aGlzW2ldJigxPDxwKS0xKTw8OC1wO2R8PXRoaXNbLS1pXT4+KHArPXRoaXMuREItOCl9ZWxzZXtkPXRoaXNbaV0+PihwLT04KSYyNTU7aWYocDw9MCl7cCs9dGhpcy5EQjstLWl9fWlmKChkJjEyOCkhPTApZHw9LTI1NjtpZihrPT09MCYmKHRoaXMucyYxMjgpIT0oZCYxMjgpKSsraztpZihrPjB8fGQhPXRoaXMucylyW2srK109ZH19cmV0dXJuIHJ9ZnVuY3Rpb24gYm5Ub0J1ZmZlcih0cmltT3JTaXplKXt2YXIgcmVzPUJ1ZmZlci5mcm9tKHRoaXMudG9CeXRlQXJyYXkoKSk7aWYodHJpbU9yU2l6ZT09PXRydWUmJnJlc1swXT09PTApe3Jlcz1yZXMuc2xpY2UoMSl9ZWxzZSBpZihfLmlzTnVtYmVyKHRyaW1PclNpemUpKXtpZihyZXMubGVuZ3RoPnRyaW1PclNpemUpe2Zvcih2YXIgaT0wO2k8cmVzLmxlbmd0aC10cmltT3JTaXplO2krKyl7aWYocmVzW2ldIT09MCl7cmV0dXJuIG51bGx9fXJldHVybiByZXMuc2xpY2UocmVzLmxlbmd0aC10cmltT3JTaXplKX1lbHNlIGlmKHJlcy5sZW5ndGg8dHJpbU9yU2l6ZSl7dmFyIHBhZGRlZD1CdWZmZXIuYWxsb2ModHJpbU9yU2l6ZSk7cGFkZGVkLmZpbGwoMCwwLHRyaW1PclNpemUtcmVzLmxlbmd0aCk7cmVzLmNvcHkocGFkZGVkLHRyaW1PclNpemUtcmVzLmxlbmd0aCk7cmV0dXJuIHBhZGRlZH19cmV0dXJuIHJlc31mdW5jdGlvbiBibkVxdWFscyhhKXtyZXR1cm4gdGhpcy5jb21wYXJlVG8oYSk9PTB9ZnVuY3Rpb24gYm5NaW4oYSl7cmV0dXJuIHRoaXMuY29tcGFyZVRvKGEpPDA/dGhpczphfWZ1bmN0aW9uIGJuTWF4KGEpe3JldHVybiB0aGlzLmNvbXBhcmVUbyhhKT4wP3RoaXM6YX1mdW5jdGlvbiBibnBCaXR3aXNlVG8oYSxvcCxyKXt2YXIgaSxmLG09TWF0aC5taW4oYS50LHRoaXMudCk7Zm9yKGk9MDtpPG07KytpKXJbaV09b3AodGhpc1tpXSxhW2ldKTtpZihhLnQ8dGhpcy50KXtmPWEucyZ0aGlzLkRNO2ZvcihpPW07aTx0aGlzLnQ7KytpKXJbaV09b3AodGhpc1tpXSxmKTtyLnQ9dGhpcy50fWVsc2V7Zj10aGlzLnMmdGhpcy5ETTtmb3IoaT1tO2k8YS50OysraSlyW2ldPW9wKGYsYVtpXSk7ci50PWEudH1yLnM9b3AodGhpcy5zLGEucyk7ci5jbGFtcCgpfWZ1bmN0aW9uIG9wX2FuZCh4LHkpe3JldHVybiB4Jnl9ZnVuY3Rpb24gYm5BbmQoYSl7dmFyIHI9bmJpKCk7dGhpcy5iaXR3aXNlVG8oYSxvcF9hbmQscik7cmV0dXJuIHJ9ZnVuY3Rpb24gb3Bfb3IoeCx5KXtyZXR1cm4geHx5fWZ1bmN0aW9uIGJuT3IoYSl7dmFyIHI9bmJpKCk7dGhpcy5iaXR3aXNlVG8oYSxvcF9vcixyKTtyZXR1cm4gcn1mdW5jdGlvbiBvcF94b3IoeCx5KXtyZXR1cm4geF55fWZ1bmN0aW9uIGJuWG9yKGEpe3ZhciByPW5iaSgpO3RoaXMuYml0d2lzZVRvKGEsb3BfeG9yLHIpO3JldHVybiByfWZ1bmN0aW9uIG9wX2FuZG5vdCh4LHkpe3JldHVybiB4Jn55fWZ1bmN0aW9uIGJuQW5kTm90KGEpe3ZhciByPW5iaSgpO3RoaXMuYml0d2lzZVRvKGEsb3BfYW5kbm90LHIpO3JldHVybiByfWZ1bmN0aW9uIGJuTm90KCl7dmFyIHI9bmJpKCk7Zm9yKHZhciBpPTA7aTx0aGlzLnQ7KytpKXJbaV09dGhpcy5ETSZ+dGhpc1tpXTtyLnQ9dGhpcy50O3Iucz1+dGhpcy5zO3JldHVybiByfWZ1bmN0aW9uIGJuU2hpZnRMZWZ0KG4pe3ZhciByPW5iaSgpO2lmKG48MCl0aGlzLnJTaGlmdFRvKC1uLHIpO2Vsc2UgdGhpcy5sU2hpZnRUbyhuLHIpO3JldHVybiByfWZ1bmN0aW9uIGJuU2hpZnRSaWdodChuKXt2YXIgcj1uYmkoKTtpZihuPDApdGhpcy5sU2hpZnRUbygtbixyKTtlbHNlIHRoaXMuclNoaWZ0VG8obixyKTtyZXR1cm4gcn1mdW5jdGlvbiBsYml0KHgpe2lmKHg9PT0wKXJldHVybi0xO3ZhciByPTA7aWYoKHgmNjU1MzUpPT09MCl7eD4+PTE2O3IrPTE2fWlmKCh4JjI1NSk9PT0wKXt4Pj49ODtyKz04fWlmKCh4JjE1KT09PTApe3g+Pj00O3IrPTR9aWYoKHgmMyk9PT0wKXt4Pj49MjtyKz0yfWlmKCh4JjEpPT09MCkrK3I7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5HZXRMb3dlc3RTZXRCaXQoKXtmb3IodmFyIGk9MDtpPHRoaXMudDsrK2kpaWYodGhpc1tpXSE9MClyZXR1cm4gaSp0aGlzLkRCK2xiaXQodGhpc1tpXSk7aWYodGhpcy5zPDApcmV0dXJuIHRoaXMudCp0aGlzLkRCO3JldHVybi0xfWZ1bmN0aW9uIGNiaXQoeCl7dmFyIHI9MDt3aGlsZSh4IT0wKXt4Jj14LTE7KytyfXJldHVybiByfWZ1bmN0aW9uIGJuQml0Q291bnQoKXt2YXIgcj0wLHg9dGhpcy5zJnRoaXMuRE07Zm9yKHZhciBpPTA7aTx0aGlzLnQ7KytpKXIrPWNiaXQodGhpc1tpXV54KTtyZXR1cm4gcn1mdW5jdGlvbiBiblRlc3RCaXQobil7dmFyIGo9TWF0aC5mbG9vcihuL3RoaXMuREIpO2lmKGo+PXRoaXMudClyZXR1cm4gdGhpcy5zIT0wO3JldHVybih0aGlzW2pdJjE8PG4ldGhpcy5EQikhPTB9ZnVuY3Rpb24gYm5wQ2hhbmdlQml0KG4sb3Ape3ZhciByPUJpZ0ludGVnZXIuT05FLnNoaWZ0TGVmdChuKTt0aGlzLmJpdHdpc2VUbyhyLG9wLHIpO3JldHVybiByfWZ1bmN0aW9uIGJuU2V0Qml0KG4pe3JldHVybiB0aGlzLmNoYW5nZUJpdChuLG9wX29yKX1mdW5jdGlvbiBibkNsZWFyQml0KG4pe3JldHVybiB0aGlzLmNoYW5nZUJpdChuLG9wX2FuZG5vdCl9ZnVuY3Rpb24gYm5GbGlwQml0KG4pe3JldHVybiB0aGlzLmNoYW5nZUJpdChuLG9wX3hvcil9ZnVuY3Rpb24gYm5wQWRkVG8oYSxyKXt2YXIgaT0wLGM9MCxtPU1hdGgubWluKGEudCx0aGlzLnQpO3doaWxlKGk8bSl7Yys9dGhpc1tpXSthW2ldO3JbaSsrXT1jJnRoaXMuRE07Yz4+PXRoaXMuREJ9aWYoYS50PHRoaXMudCl7Yys9YS5zO3doaWxlKGk8dGhpcy50KXtjKz10aGlzW2ldO3JbaSsrXT1jJnRoaXMuRE07Yz4+PXRoaXMuREJ9Yys9dGhpcy5zfWVsc2V7Yys9dGhpcy5zO3doaWxlKGk8YS50KXtjKz1hW2ldO3JbaSsrXT1jJnRoaXMuRE07Yz4+PXRoaXMuREJ9Yys9YS5zfXIucz1jPDA/LTE6MDtpZihjPjApcltpKytdPWM7ZWxzZSBpZihjPC0xKXJbaSsrXT10aGlzLkRWK2M7ci50PWk7ci5jbGFtcCgpfWZ1bmN0aW9uIGJuQWRkKGEpe3ZhciByPW5iaSgpO3RoaXMuYWRkVG8oYSxyKTtyZXR1cm4gcn1mdW5jdGlvbiBiblN1YnRyYWN0KGEpe3ZhciByPW5iaSgpO3RoaXMuc3ViVG8oYSxyKTtyZXR1cm4gcn1mdW5jdGlvbiBibk11bHRpcGx5KGEpe3ZhciByPW5iaSgpO3RoaXMubXVsdGlwbHlUbyhhLHIpO3JldHVybiByfWZ1bmN0aW9uIGJuU3F1YXJlKCl7dmFyIHI9bmJpKCk7dGhpcy5zcXVhcmVUbyhyKTtyZXR1cm4gcn1mdW5jdGlvbiBibkRpdmlkZShhKXt2YXIgcj1uYmkoKTt0aGlzLmRpdlJlbVRvKGEscixudWxsKTtyZXR1cm4gcn1mdW5jdGlvbiBiblJlbWFpbmRlcihhKXt2YXIgcj1uYmkoKTt0aGlzLmRpdlJlbVRvKGEsbnVsbCxyKTtyZXR1cm4gcn1mdW5jdGlvbiBibkRpdmlkZUFuZFJlbWFpbmRlcihhKXt2YXIgcT1uYmkoKSxyPW5iaSgpO3RoaXMuZGl2UmVtVG8oYSxxLHIpO3JldHVybiBuZXcgQXJyYXkocSxyKX1mdW5jdGlvbiBibnBETXVsdGlwbHkobil7dGhpc1t0aGlzLnRdPXRoaXMuYW0oMCxuLTEsdGhpcywwLDAsdGhpcy50KTsrK3RoaXMudDt0aGlzLmNsYW1wKCl9ZnVuY3Rpb24gYm5wREFkZE9mZnNldChuLHcpe2lmKG49PT0wKXJldHVybjt3aGlsZSh0aGlzLnQ8PXcpdGhpc1t0aGlzLnQrK109MDt0aGlzW3ddKz1uO3doaWxlKHRoaXNbd10+PXRoaXMuRFYpe3RoaXNbd10tPXRoaXMuRFY7aWYoKyt3Pj10aGlzLnQpdGhpc1t0aGlzLnQrK109MDsrK3RoaXNbd119fWZ1bmN0aW9uIE51bGxFeHAoKXt9ZnVuY3Rpb24gbk5vcCh4KXtyZXR1cm4geH1mdW5jdGlvbiBuTXVsVG8oeCx5LHIpe3gubXVsdGlwbHlUbyh5LHIpfWZ1bmN0aW9uIG5TcXJUbyh4LHIpe3guc3F1YXJlVG8ocil9TnVsbEV4cC5wcm90b3R5cGUuY29udmVydD1uTm9wO051bGxFeHAucHJvdG90eXBlLnJldmVydD1uTm9wO051bGxFeHAucHJvdG90eXBlLm11bFRvPW5NdWxUbztOdWxsRXhwLnByb3RvdHlwZS5zcXJUbz1uU3FyVG87ZnVuY3Rpb24gYm5Qb3coZSl7cmV0dXJuIHRoaXMuZXhwKGUsbmV3IE51bGxFeHApfWZ1bmN0aW9uIGJucE11bHRpcGx5TG93ZXJUbyhhLG4scil7dmFyIGk9TWF0aC5taW4odGhpcy50K2EudCxuKTtyLnM9MDtyLnQ9aTt3aGlsZShpPjApclstLWldPTA7dmFyIGo7Zm9yKGo9ci50LXRoaXMudDtpPGo7KytpKXJbaSt0aGlzLnRdPXRoaXMuYW0oMCxhW2ldLHIsaSwwLHRoaXMudCk7Zm9yKGo9TWF0aC5taW4oYS50LG4pO2k8ajsrK2kpdGhpcy5hbSgwLGFbaV0scixpLDAsbi1pKTtyLmNsYW1wKCl9ZnVuY3Rpb24gYm5wTXVsdGlwbHlVcHBlclRvKGEsbixyKXstLW47dmFyIGk9ci50PXRoaXMudCthLnQtbjtyLnM9MDt3aGlsZSgtLWk+PTApcltpXT0wO2ZvcihpPU1hdGgubWF4KG4tdGhpcy50LDApO2k8YS50OysraSlyW3RoaXMudCtpLW5dPXRoaXMuYW0obi1pLGFbaV0sciwwLDAsdGhpcy50K2ktbik7ci5jbGFtcCgpO3IuZHJTaGlmdFRvKDEscil9ZnVuY3Rpb24gQmFycmV0dChtKXt0aGlzLnIyPW5iaSgpO3RoaXMucTM9bmJpKCk7QmlnSW50ZWdlci5PTkUuZGxTaGlmdFRvKDIqbS50LHRoaXMucjIpO3RoaXMubXU9dGhpcy5yMi5kaXZpZGUobSk7dGhpcy5tPW19ZnVuY3Rpb24gYmFycmV0dENvbnZlcnQoeCl7aWYoeC5zPDB8fHgudD4yKnRoaXMubS50KXJldHVybiB4Lm1vZCh0aGlzLm0pO2Vsc2UgaWYoeC5jb21wYXJlVG8odGhpcy5tKTwwKXJldHVybiB4O2Vsc2V7dmFyIHI9bmJpKCk7eC5jb3B5VG8ocik7dGhpcy5yZWR1Y2Uocik7cmV0dXJuIHJ9fWZ1bmN0aW9uIGJhcnJldHRSZXZlcnQoeCl7cmV0dXJuIHh9ZnVuY3Rpb24gYmFycmV0dFJlZHVjZSh4KXt4LmRyU2hpZnRUbyh0aGlzLm0udC0xLHRoaXMucjIpO2lmKHgudD50aGlzLm0udCsxKXt4LnQ9dGhpcy5tLnQrMTt4LmNsYW1wKCl9dGhpcy5tdS5tdWx0aXBseVVwcGVyVG8odGhpcy5yMix0aGlzLm0udCsxLHRoaXMucTMpO3RoaXMubS5tdWx0aXBseUxvd2VyVG8odGhpcy5xMyx0aGlzLm0udCsxLHRoaXMucjIpO3doaWxlKHguY29tcGFyZVRvKHRoaXMucjIpPDApeC5kQWRkT2Zmc2V0KDEsdGhpcy5tLnQrMSk7eC5zdWJUbyh0aGlzLnIyLHgpO3doaWxlKHguY29tcGFyZVRvKHRoaXMubSk+PTApeC5zdWJUbyh0aGlzLm0seCl9ZnVuY3Rpb24gYmFycmV0dFNxclRvKHgscil7eC5zcXVhcmVUbyhyKTt0aGlzLnJlZHVjZShyKX1mdW5jdGlvbiBiYXJyZXR0TXVsVG8oeCx5LHIpe3gubXVsdGlwbHlUbyh5LHIpO3RoaXMucmVkdWNlKHIpfUJhcnJldHQucHJvdG90eXBlLmNvbnZlcnQ9YmFycmV0dENvbnZlcnQ7QmFycmV0dC5wcm90b3R5cGUucmV2ZXJ0PWJhcnJldHRSZXZlcnQ7QmFycmV0dC5wcm90b3R5cGUucmVkdWNlPWJhcnJldHRSZWR1Y2U7QmFycmV0dC5wcm90b3R5cGUubXVsVG89YmFycmV0dE11bFRvO0JhcnJldHQucHJvdG90eXBlLnNxclRvPWJhcnJldHRTcXJUbztmdW5jdGlvbiBibk1vZFBvdyhlLG0pe3JldHVybiBnZXRPcHRpbWFsSW1wbCgpLmFwcGx5KHRoaXMsW2UsbV0pfUJpZ0ludGVnZXIubW9kUG93SW1wbD11bmRlZmluZWQ7QmlnSW50ZWdlci5zZXRNb2RQb3dJbXBsPWZ1bmN0aW9uKGF1dGhvck5hbWUpe0JpZ0ludGVnZXIubW9kUG93SW1wbD1mdW5jdGlvbigpe3N3aXRjaChhdXRob3JOYW1lKXtjYXNlIlBldGVyIE9sc29uIjpyZXR1cm4gYm5Nb2RQb3dfcGV0ZXJPbHNvbjtjYXNlIlRvbSBXdSI6cmV0dXJuIGJuTW9kUG93X3RvbVd1fX0oKX07dmFyIGdldE9wdGltYWxJbXBsPWZ1bmN0aW9uKCl7e3ZhciByZXN1bHQ9QmlnSW50ZWdlci5tb2RQb3dJbXBsO2lmKHJlc3VsdCE9PXVuZGVmaW5lZCl7cmV0dXJuIHJlc3VsdH19dmFyIHg9bmV3IEJpZ0ludGVnZXIoIjQzMzMzNzA3OTIzMDA4MzkyMTQ4ODA3ODM2NDc1NjAiLDEwKTt2YXIgZT1uZXcgQmlnSW50ZWdlcigiMzcwNzkyMzAwODM5MjE0ODgwNzgzNjQ3NTYwOTQxOSIsMTApO3ZhciBtPW5ldyBCaWdJbnRlZ2VyKCIxNDgzMTY5MjAzMzU2ODU5NTIzMTM0NTkwMjQzNzYwIiwxMCk7dmFyIHN0YXJ0PURhdGUubm93KCk7Ym5Nb2RQb3dfcGV0ZXJPbHNvbi5hcHBseSh4LFtlLG1dKTt2YXIgZHVyYXRpb25QZXRlck9sc29uPURhdGUubm93KCktc3RhcnQ7c3RhcnQ9RGF0ZS5ub3coKTtibk1vZFBvd190b21XdS5hcHBseSh4LFtlLG1dKTt2YXIgZHVyYXRpb25Ub21XdT1EYXRlLm5vdygpLXN0YXJ0O0JpZ0ludGVnZXIubW9kUG93SW1wbD1kdXJhdGlvblBldGVyT2xzb248ZHVyYXRpb25Ub21XdT9ibk1vZFBvd19wZXRlck9sc29uOmJuTW9kUG93X3RvbVd1O3JldHVybiBnZXRPcHRpbWFsSW1wbCgpfTtmdW5jdGlvbiBibk1vZFBvd19wZXRlck9sc29uKGUsbSl7dmFyIHBvVGhpcz1wZXRlck9sc29uX0JpZ0ludGVnZXJTdGF0aWModGhpcy50b1N0cmluZygxMCksMTApO3ZhciBwb0U9cGV0ZXJPbHNvbl9CaWdJbnRlZ2VyU3RhdGljKGUudG9TdHJpbmcoMTApLDEwKTt2YXIgcG9NPXBldGVyT2xzb25fQmlnSW50ZWdlclN0YXRpYyhtLnRvU3RyaW5nKDEwKSwxMCk7dmFyIHBvT3V0PXBvVGhpcy5tb2RQb3cocG9FLHBvTSk7dmFyIG91dD1uZXcgQmlnSW50ZWdlcihwb091dC50b1N0cmluZygxMCksMTApO3JldHVybiBvdXR9ZnVuY3Rpb24gYm5Nb2RQb3dfdG9tV3UoZSxtKXt2YXIgaT1lLmJpdExlbmd0aCgpLGsscj1uYnYoMSksejtpZihpPD0wKXJldHVybiByO2Vsc2UgaWYoaTwxOClrPTE7ZWxzZSBpZihpPDQ4KWs9MztlbHNlIGlmKGk8MTQ0KWs9NDtlbHNlIGlmKGk8NzY4KWs9NTtlbHNlIGs9NjtpZihpPDgpej1uZXcgQ2xhc3NpYyhtKTtlbHNlIGlmKG0uaXNFdmVuKCkpej1uZXcgQmFycmV0dChtKTtlbHNlIHo9bmV3IE1vbnRnb21lcnkobSk7dmFyIGc9bmV3IEFycmF5LG49MyxrMT1rLTEsa209KDE8PGspLTE7Z1sxXT16LmNvbnZlcnQodGhpcyk7aWYoaz4xKXt2YXIgZzI9bmJpKCk7ei5zcXJUbyhnWzFdLGcyKTt3aGlsZShuPD1rbSl7Z1tuXT1uYmkoKTt6Lm11bFRvKGcyLGdbbi0yXSxnW25dKTtuKz0yfX12YXIgaj1lLnQtMSx3LGlzMT10cnVlLHIyPW5iaSgpLHQ7aT1uYml0cyhlW2pdKS0xO3doaWxlKGo+PTApe2lmKGk+PWsxKXc9ZVtqXT4+aS1rMSZrbTtlbHNle3c9KGVbal0mKDE8PGkrMSktMSk8PGsxLWk7aWYoaj4wKXd8PWVbai0xXT4+dGhpcy5EQitpLWsxfW49azt3aGlsZSgodyYxKT09PTApe3c+Pj0xOy0tbn1pZigoaS09bik8MCl7aSs9dGhpcy5EQjstLWp9aWYoaXMxKXtnW3ddLmNvcHlUbyhyKTtpczE9ZmFsc2V9ZWxzZXt3aGlsZShuPjEpe3ouc3FyVG8ocixyMik7ei5zcXJUbyhyMixyKTtuLT0yfWlmKG4+MCl6LnNxclRvKHIscjIpO2Vsc2V7dD1yO3I9cjI7cjI9dH16Lm11bFRvKHIyLGdbd10scil9d2hpbGUoaj49MCYmKGVbal0mMTw8aSk9PT0wKXt6LnNxclRvKHIscjIpO3Q9cjtyPXIyO3IyPXQ7aWYoLS1pPDApe2k9dGhpcy5EQi0xOy0tan19fXJldHVybiB6LnJldmVydChyKX1mdW5jdGlvbiBibkdDRChhKXt2YXIgeD10aGlzLnM8MD90aGlzLm5lZ2F0ZSgpOnRoaXMuY2xvbmUoKTt2YXIgeT1hLnM8MD9hLm5lZ2F0ZSgpOmEuY2xvbmUoKTtpZih4LmNvbXBhcmVUbyh5KTwwKXt2YXIgdD14O3g9eTt5PXR9dmFyIGk9eC5nZXRMb3dlc3RTZXRCaXQoKSxnPXkuZ2V0TG93ZXN0U2V0Qml0KCk7aWYoZzwwKXJldHVybiB4O2lmKGk8ZylnPWk7aWYoZz4wKXt4LnJTaGlmdFRvKGcseCk7eS5yU2hpZnRUbyhnLHkpfXdoaWxlKHguc2lnbnVtKCk+MCl7aWYoKGk9eC5nZXRMb3dlc3RTZXRCaXQoKSk+MCl4LnJTaGlmdFRvKGkseCk7aWYoKGk9eS5nZXRMb3dlc3RTZXRCaXQoKSk+MCl5LnJTaGlmdFRvKGkseSk7aWYoeC5jb21wYXJlVG8oeSk+PTApe3guc3ViVG8oeSx4KTt4LnJTaGlmdFRvKDEseCl9ZWxzZXt5LnN1YlRvKHgseSk7eS5yU2hpZnRUbygxLHkpfX1pZihnPjApeS5sU2hpZnRUbyhnLHkpO3JldHVybiB5fWZ1bmN0aW9uIGJucE1vZEludChuKXtpZihuPD0wKXJldHVybiAwO3ZhciBkPXRoaXMuRFYlbixyPXRoaXMuczwwP24tMTowO2lmKHRoaXMudD4wKWlmKGQ9PT0wKXI9dGhpc1swXSVuO2Vsc2UgZm9yKHZhciBpPXRoaXMudC0xO2k+PTA7LS1pKXI9KGQqcit0aGlzW2ldKSVuO3JldHVybiByfWZ1bmN0aW9uIGJuTW9kSW52ZXJzZShtKXt2YXIgYWM9bS5pc0V2ZW4oKTtpZih0aGlzLmlzRXZlbigpJiZhY3x8bS5zaWdudW0oKT09PTApcmV0dXJuIEJpZ0ludGVnZXIuWkVSTzt2YXIgdT1tLmNsb25lKCksdj10aGlzLmNsb25lKCk7dmFyIGE9bmJ2KDEpLGI9bmJ2KDApLGM9bmJ2KDApLGQ9bmJ2KDEpO3doaWxlKHUuc2lnbnVtKCkhPTApe3doaWxlKHUuaXNFdmVuKCkpe3UuclNoaWZ0VG8oMSx1KTtpZihhYyl7aWYoIWEuaXNFdmVuKCl8fCFiLmlzRXZlbigpKXthLmFkZFRvKHRoaXMsYSk7Yi5zdWJUbyhtLGIpfWEuclNoaWZ0VG8oMSxhKX1lbHNlIGlmKCFiLmlzRXZlbigpKWIuc3ViVG8obSxiKTtiLnJTaGlmdFRvKDEsYil9d2hpbGUodi5pc0V2ZW4oKSl7di5yU2hpZnRUbygxLHYpO2lmKGFjKXtpZighYy5pc0V2ZW4oKXx8IWQuaXNFdmVuKCkpe2MuYWRkVG8odGhpcyxjKTtkLnN1YlRvKG0sZCl9Yy5yU2hpZnRUbygxLGMpfWVsc2UgaWYoIWQuaXNFdmVuKCkpZC5zdWJUbyhtLGQpO2QuclNoaWZ0VG8oMSxkKX1pZih1LmNvbXBhcmVUbyh2KT49MCl7dS5zdWJUbyh2LHUpO2lmKGFjKWEuc3ViVG8oYyxhKTtiLnN1YlRvKGQsYil9ZWxzZXt2LnN1YlRvKHUsdik7aWYoYWMpYy5zdWJUbyhhLGMpO2Quc3ViVG8oYixkKX19aWYodi5jb21wYXJlVG8oQmlnSW50ZWdlci5PTkUpIT0wKXJldHVybiBCaWdJbnRlZ2VyLlpFUk87aWYoZC5jb21wYXJlVG8obSk+PTApcmV0dXJuIGQuc3VidHJhY3QobSk7aWYoZC5zaWdudW0oKTwwKWQuYWRkVG8obSxkKTtlbHNlIHJldHVybiBkO2lmKGQuc2lnbnVtKCk8MClyZXR1cm4gZC5hZGQobSk7ZWxzZSByZXR1cm4gZH12YXIgbG93cHJpbWVzPVsyLDMsNSw3LDExLDEzLDE3LDE5LDIzLDI5LDMxLDM3LDQxLDQzLDQ3LDUzLDU5LDYxLDY3LDcxLDczLDc5LDgzLDg5LDk3LDEwMSwxMDMsMTA3LDEwOSwxMTMsMTI3LDEzMSwxMzcsMTM5LDE0OSwxNTEsMTU3LDE2MywxNjcsMTczLDE3OSwxODEsMTkxLDE5MywxOTcsMTk5LDIxMSwyMjMsMjI3LDIyOSwyMzMsMjM5LDI0MSwyNTEsMjU3LDI2MywyNjksMjcxLDI3NywyODEsMjgzLDI5MywzMDcsMzExLDMxMywzMTcsMzMxLDMzNywzNDcsMzQ5LDM1MywzNTksMzY3LDM3MywzNzksMzgzLDM4OSwzOTcsNDAxLDQwOSw0MTksNDIxLDQzMSw0MzMsNDM5LDQ0Myw0NDksNDU3LDQ2MSw0NjMsNDY3LDQ3OSw0ODcsNDkxLDQ5OSw1MDMsNTA5LDUyMSw1MjMsNTQxLDU0Nyw1NTcsNTYzLDU2OSw1NzEsNTc3LDU4Nyw1OTMsNTk5LDYwMSw2MDcsNjEzLDYxNyw2MTksNjMxLDY0MSw2NDMsNjQ3LDY1Myw2NTksNjYxLDY3Myw2NzcsNjgzLDY5MSw3MDEsNzA5LDcxOSw3MjcsNzMzLDczOSw3NDMsNzUxLDc1Nyw3NjEsNzY5LDc3Myw3ODcsNzk3LDgwOSw4MTEsODIxLDgyMyw4MjcsODI5LDgzOSw4NTMsODU3LDg1OSw4NjMsODc3LDg4MSw4ODMsODg3LDkwNyw5MTEsOTE5LDkyOSw5MzcsOTQxLDk0Nyw5NTMsOTY3LDk3MSw5NzcsOTgzLDk5MSw5OTddO3ZhciBscGxpbT0oMTw8MjYpL2xvd3ByaW1lc1tsb3dwcmltZXMubGVuZ3RoLTFdO2Z1bmN0aW9uIGJuSXNQcm9iYWJsZVByaW1lKHQpe3ZhciBpLHg9dGhpcy5hYnMoKTtpZih4LnQ9PTEmJnhbMF08PWxvd3ByaW1lc1tsb3dwcmltZXMubGVuZ3RoLTFdKXtmb3IoaT0wO2k8bG93cHJpbWVzLmxlbmd0aDsrK2kpaWYoeFswXT09bG93cHJpbWVzW2ldKXJldHVybiB0cnVlO3JldHVybiBmYWxzZX1pZih4LmlzRXZlbigpKXJldHVybiBmYWxzZTtpPTE7d2hpbGUoaTxsb3dwcmltZXMubGVuZ3RoKXt2YXIgbT1sb3dwcmltZXNbaV0saj1pKzE7d2hpbGUoajxsb3dwcmltZXMubGVuZ3RoJiZtPGxwbGltKW0qPWxvd3ByaW1lc1tqKytdO209eC5tb2RJbnQobSk7d2hpbGUoaTxqKWlmKG0lbG93cHJpbWVzW2krK109PT0wKXJldHVybiBmYWxzZX1yZXR1cm4geC5taWxsZXJSYWJpbih0KX1mdW5jdGlvbiBibnBNaWxsZXJSYWJpbih0KXt2YXIgbjE9dGhpcy5zdWJ0cmFjdChCaWdJbnRlZ2VyLk9ORSk7dmFyIGs9bjEuZ2V0TG93ZXN0U2V0Qml0KCk7aWYoazw9MClyZXR1cm4gZmFsc2U7dmFyIHI9bjEuc2hpZnRSaWdodChrKTt0PXQrMT4+MTtpZih0Pmxvd3ByaW1lcy5sZW5ndGgpdD1sb3dwcmltZXMubGVuZ3RoO3ZhciBhPW5iaSgpO2Zvcih2YXIgaT0wO2k8dDsrK2kpe2EuZnJvbUludChsb3dwcmltZXNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmxvd3ByaW1lcy5sZW5ndGgpXSk7dmFyIHk9YS5tb2RQb3cocix0aGlzKTtpZih5LmNvbXBhcmVUbyhCaWdJbnRlZ2VyLk9ORSkhPTAmJnkuY29tcGFyZVRvKG4xKSE9MCl7dmFyIGo9MTt3aGlsZShqKys8ayYmeS5jb21wYXJlVG8objEpIT0wKXt5PXkubW9kUG93SW50KDIsdGhpcyk7aWYoeS5jb21wYXJlVG8oQmlnSW50ZWdlci5PTkUpPT09MClyZXR1cm4gZmFsc2V9aWYoeS5jb21wYXJlVG8objEpIT0wKXJldHVybiBmYWxzZX19cmV0dXJuIHRydWV9QmlnSW50ZWdlci5wcm90b3R5cGUuY29weVRvPWJucENvcHlUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tSW50PWJucEZyb21JbnQ7QmlnSW50ZWdlci5wcm90b3R5cGUuZnJvbVN0cmluZz1ibnBGcm9tU3RyaW5nO0JpZ0ludGVnZXIucHJvdG90eXBlLmZyb21CeXRlQXJyYXk9Ym5wRnJvbUJ5dGVBcnJheTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tQnVmZmVyPWJucEZyb21CdWZmZXI7QmlnSW50ZWdlci5wcm90b3R5cGUuY2xhbXA9Ym5wQ2xhbXA7QmlnSW50ZWdlci5wcm90b3R5cGUuZGxTaGlmdFRvPWJucERMU2hpZnRUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5kclNoaWZ0VG89Ym5wRFJTaGlmdFRvO0JpZ0ludGVnZXIucHJvdG90eXBlLmxTaGlmdFRvPWJucExTaGlmdFRvO0JpZ0ludGVnZXIucHJvdG90eXBlLnJTaGlmdFRvPWJucFJTaGlmdFRvO0JpZ0ludGVnZXIucHJvdG90eXBlLnN1YlRvPWJucFN1YlRvO0JpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5VG89Ym5wTXVsdGlwbHlUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5zcXVhcmVUbz1ibnBTcXVhcmVUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZSZW1Ubz1ibnBEaXZSZW1UbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5pbnZEaWdpdD1ibnBJbnZEaWdpdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc0V2ZW49Ym5wSXNFdmVuO0JpZ0ludGVnZXIucHJvdG90eXBlLmV4cD1ibnBFeHA7QmlnSW50ZWdlci5wcm90b3R5cGUuY2h1bmtTaXplPWJucENodW5rU2l6ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS50b1JhZGl4PWJucFRvUmFkaXg7QmlnSW50ZWdlci5wcm90b3R5cGUuZnJvbVJhZGl4PWJucEZyb21SYWRpeDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tTnVtYmVyPWJucEZyb21OdW1iZXI7QmlnSW50ZWdlci5wcm90b3R5cGUuYml0d2lzZVRvPWJucEJpdHdpc2VUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5jaGFuZ2VCaXQ9Ym5wQ2hhbmdlQml0O0JpZ0ludGVnZXIucHJvdG90eXBlLmFkZFRvPWJucEFkZFRvO0JpZ0ludGVnZXIucHJvdG90eXBlLmRNdWx0aXBseT1ibnBETXVsdGlwbHk7QmlnSW50ZWdlci5wcm90b3R5cGUuZEFkZE9mZnNldD1ibnBEQWRkT2Zmc2V0O0JpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5TG93ZXJUbz1ibnBNdWx0aXBseUxvd2VyVG87QmlnSW50ZWdlci5wcm90b3R5cGUubXVsdGlwbHlVcHBlclRvPWJucE11bHRpcGx5VXBwZXJUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RJbnQ9Ym5wTW9kSW50O0JpZ0ludGVnZXIucHJvdG90eXBlLm1pbGxlclJhYmluPWJucE1pbGxlclJhYmluO0JpZ0ludGVnZXIucHJvdG90eXBlLnRvU3RyaW5nPWJuVG9TdHJpbmc7QmlnSW50ZWdlci5wcm90b3R5cGUubmVnYXRlPWJuTmVnYXRlO0JpZ0ludGVnZXIucHJvdG90eXBlLmFicz1ibkFicztCaWdJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlVG89Ym5Db21wYXJlVG87QmlnSW50ZWdlci5wcm90b3R5cGUuYml0TGVuZ3RoPWJuQml0TGVuZ3RoO0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZD1ibk1vZDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RQb3dJbnQ9Ym5Nb2RQb3dJbnQ7QmlnSW50ZWdlci5wcm90b3R5cGUuY2xvbmU9Ym5DbG9uZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pbnRWYWx1ZT1ibkludFZhbHVlO0JpZ0ludGVnZXIucHJvdG90eXBlLmJ5dGVWYWx1ZT1ibkJ5dGVWYWx1ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zaG9ydFZhbHVlPWJuU2hvcnRWYWx1ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zaWdudW09Ym5TaWdOdW07QmlnSW50ZWdlci5wcm90b3R5cGUudG9CeXRlQXJyYXk9Ym5Ub0J5dGVBcnJheTtCaWdJbnRlZ2VyLnByb3RvdHlwZS50b0J1ZmZlcj1iblRvQnVmZmVyO0JpZ0ludGVnZXIucHJvdG90eXBlLmVxdWFscz1ibkVxdWFscztCaWdJbnRlZ2VyLnByb3RvdHlwZS5taW49Ym5NaW47QmlnSW50ZWdlci5wcm90b3R5cGUubWF4PWJuTWF4O0JpZ0ludGVnZXIucHJvdG90eXBlLmFuZD1ibkFuZDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5vcj1ibk9yO0JpZ0ludGVnZXIucHJvdG90eXBlLnhvcj1iblhvcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5hbmROb3Q9Ym5BbmROb3Q7QmlnSW50ZWdlci5wcm90b3R5cGUubm90PWJuTm90O0JpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0TGVmdD1iblNoaWZ0TGVmdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdFJpZ2h0PWJuU2hpZnRSaWdodDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5nZXRMb3dlc3RTZXRCaXQ9Ym5HZXRMb3dlc3RTZXRCaXQ7QmlnSW50ZWdlci5wcm90b3R5cGUuYml0Q291bnQ9Ym5CaXRDb3VudDtCaWdJbnRlZ2VyLnByb3RvdHlwZS50ZXN0Qml0PWJuVGVzdEJpdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zZXRCaXQ9Ym5TZXRCaXQ7QmlnSW50ZWdlci5wcm90b3R5cGUuY2xlYXJCaXQ9Ym5DbGVhckJpdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5mbGlwQml0PWJuRmxpcEJpdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5hZGQ9Ym5BZGQ7QmlnSW50ZWdlci5wcm90b3R5cGUuc3VidHJhY3Q9Ym5TdWJ0cmFjdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tdWx0aXBseT1ibk11bHRpcGx5O0JpZ0ludGVnZXIucHJvdG90eXBlLmRpdmlkZT1ibkRpdmlkZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5yZW1haW5kZXI9Ym5SZW1haW5kZXI7QmlnSW50ZWdlci5wcm90b3R5cGUuZGl2aWRlQW5kUmVtYWluZGVyPWJuRGl2aWRlQW5kUmVtYWluZGVyO0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZFBvdz1ibk1vZFBvdztCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RJbnZlcnNlPWJuTW9kSW52ZXJzZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5wb3c9Ym5Qb3c7QmlnSW50ZWdlci5wcm90b3R5cGUuZ2NkPWJuR0NEO0JpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJvYmFibGVQcmltZT1ibklzUHJvYmFibGVQcmltZTtCaWdJbnRlZ2VyLmludDJjaGFyPWludDJjaGFyO0JpZ0ludGVnZXIuWkVSTz1uYnYoMCk7QmlnSW50ZWdlci5PTkU9bmJ2KDEpO0JpZ0ludGVnZXIucHJvdG90eXBlLnNxdWFyZT1iblNxdWFyZTttb2R1bGUuZXhwb3J0cz1CaWdJbnRlZ2VyfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi4vY3J5cHRvIjo0MywiLi4vdXRpbHMiOjU4LCJiaWctaW50ZWdlciI6MjUsYnVmZmVyOjI3fV0sNTM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBfPXJlcXVpcmUoIi4uL3V0aWxzIikuXzt2YXIgQmlnSW50ZWdlcj1yZXF1aXJlKCIuL2pzYm4uanMiKTt2YXIgdXRpbHM9cmVxdWlyZSgiLi4vdXRpbHMuanMiKTt2YXIgc2NoZW1lcz1yZXF1aXJlKCIuLi9zY2hlbWVzL3NjaGVtZXMuanMiKTt2YXIgZW5jcnlwdEVuZ2luZXM9cmVxdWlyZSgiLi4vZW5jcnlwdEVuZ2luZXMvZW5jcnlwdEVuZ2luZXMuanMiKTtleHBvcnRzLkJpZ0ludGVnZXI9QmlnSW50ZWdlcjttb2R1bGUuZXhwb3J0cy5LZXk9ZnVuY3Rpb24oKXtmdW5jdGlvbiBSU0FLZXkoKXt0aGlzLm49bnVsbDt0aGlzLmU9MDt0aGlzLmQ9bnVsbDt0aGlzLnA9bnVsbDt0aGlzLnE9bnVsbDt0aGlzLmRtcDE9bnVsbDt0aGlzLmRtcTE9bnVsbDt0aGlzLmNvZWZmPW51bGx9UlNBS2V5LnByb3RvdHlwZS5zZXRPcHRpb25zPWZ1bmN0aW9uKG9wdGlvbnMpe3ZhciBzaWduaW5nU2NoZW1lUHJvdmlkZXI9c2NoZW1lc1tvcHRpb25zLnNpZ25pbmdTY2hlbWVdO3ZhciBlbmNyeXB0aW9uU2NoZW1lUHJvdmlkZXI9c2NoZW1lc1tvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVdO2lmKHNpZ25pbmdTY2hlbWVQcm92aWRlcj09PWVuY3J5cHRpb25TY2hlbWVQcm92aWRlcil7dGhpcy5zaWduaW5nU2NoZW1lPXRoaXMuZW5jcnlwdGlvblNjaGVtZT1lbmNyeXB0aW9uU2NoZW1lUHJvdmlkZXIubWFrZVNjaGVtZSh0aGlzLG9wdGlvbnMpfWVsc2V7dGhpcy5lbmNyeXB0aW9uU2NoZW1lPWVuY3J5cHRpb25TY2hlbWVQcm92aWRlci5tYWtlU2NoZW1lKHRoaXMsb3B0aW9ucyk7dGhpcy5zaWduaW5nU2NoZW1lPXNpZ25pbmdTY2hlbWVQcm92aWRlci5tYWtlU2NoZW1lKHRoaXMsb3B0aW9ucyl9dGhpcy5lbmNyeXB0RW5naW5lPWVuY3J5cHRFbmdpbmVzLmdldEVuZ2luZSh0aGlzLG9wdGlvbnMpfTtSU0FLZXkucHJvdG90eXBlLmdlbmVyYXRlPWZ1bmN0aW9uKEIsRSl7dmFyIHFzPUI+PjE7dGhpcy5lPXBhcnNlSW50KEUsMTYpO3ZhciBlZT1uZXcgQmlnSW50ZWdlcihFLDE2KTt3aGlsZSh0cnVlKXt3aGlsZSh0cnVlKXt0aGlzLnA9bmV3IEJpZ0ludGVnZXIoQi1xcywxKTtpZih0aGlzLnAuc3VidHJhY3QoQmlnSW50ZWdlci5PTkUpLmdjZChlZSkuY29tcGFyZVRvKEJpZ0ludGVnZXIuT05FKT09PTAmJnRoaXMucC5pc1Byb2JhYmxlUHJpbWUoMTApKWJyZWFrfXdoaWxlKHRydWUpe3RoaXMucT1uZXcgQmlnSW50ZWdlcihxcywxKTtpZih0aGlzLnEuc3VidHJhY3QoQmlnSW50ZWdlci5PTkUpLmdjZChlZSkuY29tcGFyZVRvKEJpZ0ludGVnZXIuT05FKT09PTAmJnRoaXMucS5pc1Byb2JhYmxlUHJpbWUoMTApKWJyZWFrfWlmKHRoaXMucC5jb21wYXJlVG8odGhpcy5xKTw9MCl7dmFyIHQ9dGhpcy5wO3RoaXMucD10aGlzLnE7dGhpcy5xPXR9dmFyIHAxPXRoaXMucC5zdWJ0cmFjdChCaWdJbnRlZ2VyLk9ORSk7dmFyIHExPXRoaXMucS5zdWJ0cmFjdChCaWdJbnRlZ2VyLk9ORSk7dmFyIHBoaT1wMS5tdWx0aXBseShxMSk7aWYocGhpLmdjZChlZSkuY29tcGFyZVRvKEJpZ0ludGVnZXIuT05FKT09PTApe3RoaXMubj10aGlzLnAubXVsdGlwbHkodGhpcy5xKTtpZih0aGlzLm4uYml0TGVuZ3RoKCk8Qil7Y29udGludWV9dGhpcy5kPWVlLm1vZEludmVyc2UocGhpKTt0aGlzLmRtcDE9dGhpcy5kLm1vZChwMSk7dGhpcy5kbXExPXRoaXMuZC5tb2QocTEpO3RoaXMuY29lZmY9dGhpcy5xLm1vZEludmVyc2UodGhpcy5wKTticmVha319dGhpcy4kJHJlY2FsY3VsYXRlQ2FjaGUoKX07UlNBS2V5LnByb3RvdHlwZS5zZXRQcml2YXRlPWZ1bmN0aW9uKE4sRSxELFAsUSxEUCxEUSxDKXtpZihOJiZFJiZEJiZOLmxlbmd0aD4wJiYoXy5pc051bWJlcihFKXx8RS5sZW5ndGg+MCkmJkQubGVuZ3RoPjApe3RoaXMubj1uZXcgQmlnSW50ZWdlcihOKTt0aGlzLmU9Xy5pc051bWJlcihFKT9FOnV0aWxzLmdldDMySW50RnJvbUJ1ZmZlcihFLDApO3RoaXMuZD1uZXcgQmlnSW50ZWdlcihEKTtpZihQJiZRJiZEUCYmRFEmJkMpe3RoaXMucD1uZXcgQmlnSW50ZWdlcihQKTt0aGlzLnE9bmV3IEJpZ0ludGVnZXIoUSk7dGhpcy5kbXAxPW5ldyBCaWdJbnRlZ2VyKERQKTt0aGlzLmRtcTE9bmV3IEJpZ0ludGVnZXIoRFEpO3RoaXMuY29lZmY9bmV3IEJpZ0ludGVnZXIoQyl9ZWxzZXt9dGhpcy4kJHJlY2FsY3VsYXRlQ2FjaGUoKX1lbHNle3Rocm93IEVycm9yKCJJbnZhbGlkIFJTQSBwcml2YXRlIGtleSIpfX07UlNBS2V5LnByb3RvdHlwZS5zZXRQdWJsaWM9ZnVuY3Rpb24oTixFKXtpZihOJiZFJiZOLmxlbmd0aD4wJiYoXy5pc051bWJlcihFKXx8RS5sZW5ndGg+MCkpe3RoaXMubj1uZXcgQmlnSW50ZWdlcihOKTt0aGlzLmU9Xy5pc051bWJlcihFKT9FOnV0aWxzLmdldDMySW50RnJvbUJ1ZmZlcihFLDApO3RoaXMuJCRyZWNhbGN1bGF0ZUNhY2hlKCl9ZWxzZXt0aHJvdyBFcnJvcigiSW52YWxpZCBSU0EgcHVibGljIGtleSIpfX07UlNBS2V5LnByb3RvdHlwZS4kZG9Qcml2YXRlPWZ1bmN0aW9uKHgpe2lmKHRoaXMucHx8dGhpcy5xKXtyZXR1cm4geC5tb2RQb3codGhpcy5kLHRoaXMubil9dmFyIHhwPXgubW9kKHRoaXMucCkubW9kUG93KHRoaXMuZG1wMSx0aGlzLnApO3ZhciB4cT14Lm1vZCh0aGlzLnEpLm1vZFBvdyh0aGlzLmRtcTEsdGhpcy5xKTt3aGlsZSh4cC5jb21wYXJlVG8oeHEpPDApe3hwPXhwLmFkZCh0aGlzLnApfXJldHVybiB4cC5zdWJ0cmFjdCh4cSkubXVsdGlwbHkodGhpcy5jb2VmZikubW9kKHRoaXMucCkubXVsdGlwbHkodGhpcy5xKS5hZGQoeHEpfTtSU0FLZXkucHJvdG90eXBlLiRkb1B1YmxpYz1mdW5jdGlvbih4KXtyZXR1cm4geC5tb2RQb3dJbnQodGhpcy5lLHRoaXMubil9O1JTQUtleS5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihidWZmZXIsdXNlUHJpdmF0ZSl7dmFyIGJ1ZmZlcnM9W107dmFyIHJlc3VsdHM9W107dmFyIGJ1ZmZlclNpemU9YnVmZmVyLmxlbmd0aDt2YXIgYnVmZmVyc0NvdW50PU1hdGguY2VpbChidWZmZXJTaXplL3RoaXMubWF4TWVzc2FnZUxlbmd0aCl8fDE7dmFyIGRpdmlkZWRTaXplPU1hdGguY2VpbChidWZmZXJTaXplL2J1ZmZlcnNDb3VudHx8MSk7aWYoYnVmZmVyc0NvdW50PT0xKXtidWZmZXJzLnB1c2goYnVmZmVyKX1lbHNle2Zvcih2YXIgYnVmTnVtPTA7YnVmTnVtPGJ1ZmZlcnNDb3VudDtidWZOdW0rKyl7YnVmZmVycy5wdXNoKGJ1ZmZlci5zbGljZShidWZOdW0qZGl2aWRlZFNpemUsKGJ1Zk51bSsxKSpkaXZpZGVkU2l6ZSkpfX1mb3IodmFyIGk9MDtpPGJ1ZmZlcnMubGVuZ3RoO2krKyl7cmVzdWx0cy5wdXNoKHRoaXMuZW5jcnlwdEVuZ2luZS5lbmNyeXB0KGJ1ZmZlcnNbaV0sdXNlUHJpdmF0ZSkpfXJldHVybiBCdWZmZXIuY29uY2F0KHJlc3VsdHMpfTtSU0FLZXkucHJvdG90eXBlLmRlY3J5cHQ9ZnVuY3Rpb24oYnVmZmVyLHVzZVB1YmxpYyl7aWYoYnVmZmVyLmxlbmd0aCV0aGlzLmVuY3J5cHRlZERhdGFMZW5ndGg+MCl7dGhyb3cgRXJyb3IoIkluY29ycmVjdCBkYXRhIG9yIGtleSIpfXZhciByZXN1bHQ9W107dmFyIG9mZnNldD0wO3ZhciBsZW5ndGg9MDt2YXIgYnVmZmVyc0NvdW50PWJ1ZmZlci5sZW5ndGgvdGhpcy5lbmNyeXB0ZWREYXRhTGVuZ3RoO2Zvcih2YXIgaT0wO2k8YnVmZmVyc0NvdW50O2krKyl7b2Zmc2V0PWkqdGhpcy5lbmNyeXB0ZWREYXRhTGVuZ3RoO2xlbmd0aD1vZmZzZXQrdGhpcy5lbmNyeXB0ZWREYXRhTGVuZ3RoO3Jlc3VsdC5wdXNoKHRoaXMuZW5jcnlwdEVuZ2luZS5kZWNyeXB0KGJ1ZmZlci5zbGljZShvZmZzZXQsTWF0aC5taW4obGVuZ3RoLGJ1ZmZlci5sZW5ndGgpKSx1c2VQdWJsaWMpKX1yZXR1cm4gQnVmZmVyLmNvbmNhdChyZXN1bHQpfTtSU0FLZXkucHJvdG90eXBlLnNpZ249ZnVuY3Rpb24oYnVmZmVyKXtyZXR1cm4gdGhpcy5zaWduaW5nU2NoZW1lLnNpZ24uYXBwbHkodGhpcy5zaWduaW5nU2NoZW1lLGFyZ3VtZW50cyl9O1JTQUtleS5wcm90b3R5cGUudmVyaWZ5PWZ1bmN0aW9uKGJ1ZmZlcixzaWduYXR1cmUsc2lnbmF0dXJlX2VuY29kaW5nKXtyZXR1cm4gdGhpcy5zaWduaW5nU2NoZW1lLnZlcmlmeS5hcHBseSh0aGlzLnNpZ25pbmdTY2hlbWUsYXJndW1lbnRzKX07UlNBS2V5LnByb3RvdHlwZS5pc1ByaXZhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5uJiZ0aGlzLmUmJnRoaXMuZHx8ZmFsc2V9O1JTQUtleS5wcm90b3R5cGUuaXNQdWJsaWM9ZnVuY3Rpb24oc3RyaWN0KXtyZXR1cm4gdGhpcy5uJiZ0aGlzLmUmJiEoc3RyaWN0JiZ0aGlzLmQpfHxmYWxzZX07T2JqZWN0LmRlZmluZVByb3BlcnR5KFJTQUtleS5wcm90b3R5cGUsImtleVNpemUiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jYWNoZS5rZXlCaXRMZW5ndGh9fSk7T2JqZWN0LmRlZmluZVByb3BlcnR5KFJTQUtleS5wcm90b3R5cGUsImVuY3J5cHRlZERhdGFMZW5ndGgiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jYWNoZS5rZXlCeXRlTGVuZ3RofX0pO09iamVjdC5kZWZpbmVQcm9wZXJ0eShSU0FLZXkucHJvdG90eXBlLCJtYXhNZXNzYWdlTGVuZ3RoIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZW5jcnlwdGlvblNjaGVtZS5tYXhNZXNzYWdlTGVuZ3RoKCl9fSk7UlNBS2V5LnByb3RvdHlwZS4kJHJlY2FsY3VsYXRlQ2FjaGU9ZnVuY3Rpb24oKXt0aGlzLmNhY2hlPXRoaXMuY2FjaGV8fHt9O3RoaXMuY2FjaGUua2V5Qml0TGVuZ3RoPXRoaXMubi5iaXRMZW5ndGgoKTt0aGlzLmNhY2hlLmtleUJ5dGVMZW5ndGg9dGhpcy5jYWNoZS5rZXlCaXRMZW5ndGgrNj4+M307cmV0dXJuIFJTQUtleX0oKX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4uL2VuY3J5cHRFbmdpbmVzL2VuY3J5cHRFbmdpbmVzLmpzIjo0NCwiLi4vc2NoZW1lcy9zY2hlbWVzLmpzIjo1NywiLi4vdXRpbHMiOjU4LCIuLi91dGlscy5qcyI6NTgsIi4vanNibi5qcyI6NTIsYnVmZmVyOjI3fV0sNTQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBjcnlwdD1yZXF1aXJlKCIuLi9jcnlwdG8iKTttb2R1bGUuZXhwb3J0cz17aXNFbmNyeXB0aW9uOnRydWUsaXNTaWduYXR1cmU6ZmFsc2V9O21vZHVsZS5leHBvcnRzLmRpZ2VzdExlbmd0aD17bWQ0OjE2LG1kNToxNixyaXBlbWQxNjA6MjAscm1kMTYwOjIwLHNoYTE6MjAsc2hhMjI0OjI4LHNoYTI1NjozMixzaGEzODQ6NDgsc2hhNTEyOjY0fTt2YXIgREVGQVVMVF9IQVNIX0ZVTkNUSU9OPSJzaGExIjttb2R1bGUuZXhwb3J0cy5lbWVfb2FlcF9tZ2YxPWZ1bmN0aW9uKHNlZWQsbWFza0xlbmd0aCxoYXNoRnVuY3Rpb24pe2hhc2hGdW5jdGlvbj1oYXNoRnVuY3Rpb258fERFRkFVTFRfSEFTSF9GVU5DVElPTjt2YXIgaExlbj1tb2R1bGUuZXhwb3J0cy5kaWdlc3RMZW5ndGhbaGFzaEZ1bmN0aW9uXTt2YXIgY291bnQ9TWF0aC5jZWlsKG1hc2tMZW5ndGgvaExlbik7dmFyIFQ9QnVmZmVyLmFsbG9jKGhMZW4qY291bnQpO3ZhciBjPUJ1ZmZlci5hbGxvYyg0KTtmb3IodmFyIGk9MDtpPGNvdW50OysraSl7dmFyIGhhc2g9Y3J5cHQuY3JlYXRlSGFzaChoYXNoRnVuY3Rpb24pO2hhc2gudXBkYXRlKHNlZWQpO2Mud3JpdGVVSW50MzJCRShpLDApO2hhc2gudXBkYXRlKGMpO2hhc2guZGlnZXN0KCkuY29weShULGkqaExlbil9cmV0dXJuIFQuc2xpY2UoMCxtYXNrTGVuZ3RoKX07bW9kdWxlLmV4cG9ydHMubWFrZVNjaGVtZT1mdW5jdGlvbihrZXksb3B0aW9ucyl7ZnVuY3Rpb24gU2NoZW1lKGtleSxvcHRpb25zKXt0aGlzLmtleT1rZXk7dGhpcy5vcHRpb25zPW9wdGlvbnN9U2NoZW1lLnByb3RvdHlwZS5tYXhNZXNzYWdlTGVuZ3RoPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgtMiptb2R1bGUuZXhwb3J0cy5kaWdlc3RMZW5ndGhbdGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTl0tMn07U2NoZW1lLnByb3RvdHlwZS5lbmNQYWQ9ZnVuY3Rpb24oYnVmZmVyKXt2YXIgaGFzaD10aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OO3ZhciBtZ2Y9dGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLm1nZnx8bW9kdWxlLmV4cG9ydHMuZW1lX29hZXBfbWdmMTt2YXIgbGFiZWw9dGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLmxhYmVsfHxCdWZmZXIuYWxsb2MoMCk7dmFyIGVtTGVuPXRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGg7dmFyIGhMZW49bW9kdWxlLmV4cG9ydHMuZGlnZXN0TGVuZ3RoW2hhc2hdO2lmKGJ1ZmZlci5sZW5ndGg+ZW1MZW4tMipoTGVuLTIpe3Rocm93IG5ldyBFcnJvcigiTWVzc2FnZSBpcyB0b28gbG9uZyB0byBlbmNvZGUgaW50byBhbiBlbmNvZGVkIG1lc3NhZ2Ugd2l0aCBhIGxlbmd0aCBvZiAiK2VtTGVuKyIgYnl0ZXMsIGluY3JlYXNlIisiZW1MZW4gdG8gZml4IHRoaXMgZXJyb3IgKG1pbmltdW0gdmFsdWUgZm9yIGdpdmVuIHBhcmFtZXRlcnMgYW5kIG9wdGlvbnM6ICIrKGVtTGVuLTIqaExlbi0yKSsiKSIpfXZhciBsSGFzaD1jcnlwdC5jcmVhdGVIYXNoKGhhc2gpO2xIYXNoLnVwZGF0ZShsYWJlbCk7bEhhc2g9bEhhc2guZGlnZXN0KCk7dmFyIFBTPUJ1ZmZlci5hbGxvYyhlbUxlbi1idWZmZXIubGVuZ3RoLTIqaExlbi0xKTtQUy5maWxsKDApO1BTW1BTLmxlbmd0aC0xXT0xO3ZhciBEQj1CdWZmZXIuY29uY2F0KFtsSGFzaCxQUyxidWZmZXJdKTt2YXIgc2VlZD1jcnlwdC5yYW5kb21CeXRlcyhoTGVuKTt2YXIgbWFzaz1tZ2Yoc2VlZCxEQi5sZW5ndGgsaGFzaCk7Zm9yKHZhciBpPTA7aTxEQi5sZW5ndGg7aSsrKXtEQltpXV49bWFza1tpXX1tYXNrPW1nZihEQixoTGVuLGhhc2gpO2ZvcihpPTA7aTxzZWVkLmxlbmd0aDtpKyspe3NlZWRbaV1ePW1hc2tbaV19dmFyIGVtPUJ1ZmZlci5hbGxvYygxK3NlZWQubGVuZ3RoK0RCLmxlbmd0aCk7ZW1bMF09MDtzZWVkLmNvcHkoZW0sMSk7REIuY29weShlbSwxK3NlZWQubGVuZ3RoKTtyZXR1cm4gZW19O1NjaGVtZS5wcm90b3R5cGUuZW5jVW5QYWQ9ZnVuY3Rpb24oYnVmZmVyKXt2YXIgaGFzaD10aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OO3ZhciBtZ2Y9dGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLm1nZnx8bW9kdWxlLmV4cG9ydHMuZW1lX29hZXBfbWdmMTt2YXIgbGFiZWw9dGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLmxhYmVsfHxCdWZmZXIuYWxsb2MoMCk7dmFyIGhMZW49bW9kdWxlLmV4cG9ydHMuZGlnZXN0TGVuZ3RoW2hhc2hdO2lmKGJ1ZmZlci5sZW5ndGg8MipoTGVuKzIpe3Rocm93IG5ldyBFcnJvcigiRXJyb3IgZGVjb2RpbmcgbWVzc2FnZSwgdGhlIHN1cHBsaWVkIG1lc3NhZ2UgaXMgbm90IGxvbmcgZW5vdWdoIHRvIGJlIGEgdmFsaWQgT0FFUCBlbmNvZGVkIG1lc3NhZ2UiKX12YXIgc2VlZD1idWZmZXIuc2xpY2UoMSxoTGVuKzEpO3ZhciBEQj1idWZmZXIuc2xpY2UoMStoTGVuKTt2YXIgbWFzaz1tZ2YoREIsaExlbixoYXNoKTtmb3IodmFyIGk9MDtpPHNlZWQubGVuZ3RoO2krKyl7c2VlZFtpXV49bWFza1tpXX1tYXNrPW1nZihzZWVkLERCLmxlbmd0aCxoYXNoKTtmb3IoaT0wO2k8REIubGVuZ3RoO2krKyl7REJbaV1ePW1hc2tbaV19dmFyIGxIYXNoPWNyeXB0LmNyZWF0ZUhhc2goaGFzaCk7bEhhc2gudXBkYXRlKGxhYmVsKTtsSGFzaD1sSGFzaC5kaWdlc3QoKTt2YXIgbEhhc2hFTT1EQi5zbGljZSgwLGhMZW4pO2lmKGxIYXNoRU0udG9TdHJpbmcoImhleCIpIT1sSGFzaC50b1N0cmluZygiaGV4Iikpe3Rocm93IG5ldyBFcnJvcigiRXJyb3IgZGVjb2RpbmcgbWVzc2FnZSwgdGhlIGxIYXNoIGNhbGN1bGF0ZWQgZnJvbSB0aGUgbGFiZWwgcHJvdmlkZWQgYW5kIHRoZSBsSGFzaCBpbiB0aGUgZW5jcnlwdGVkIGRhdGEgZG8gbm90IG1hdGNoLiIpfWk9aExlbjt3aGlsZShEQltpKytdPT09MCYmaTxEQi5sZW5ndGgpO2lmKERCW2ktMV0hPTEpe3Rocm93IG5ldyBFcnJvcigiRXJyb3IgZGVjb2RpbmcgbWVzc2FnZSwgdGhlcmUgaXMgbm8gcGFkZGluZyBtZXNzYWdlIHNlcGFyYXRvciBieXRlIil9cmV0dXJuIERCLnNsaWNlKGkpfTtyZXR1cm4gbmV3IFNjaGVtZShrZXksb3B0aW9ucyl9fSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi4vY3J5cHRvIjo0MyxidWZmZXI6Mjd9XSw1NTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIEJpZ0ludGVnZXI9cmVxdWlyZSgiLi4vbGlicy9qc2JuIik7dmFyIGNyeXB0PXJlcXVpcmUoIi4uL2NyeXB0byIpO3ZhciBjb25zdGFudHM9cmVxdWlyZSgiY29uc3RhbnRzIik7dmFyIFNJR05fSU5GT19IRUFEPXttZDI6QnVmZmVyLmZyb20oIjMwMjAzMDBjMDYwODJhODY0ODg2ZjcwZDAyMDIwNTAwMDQxMCIsImhleCIpLG1kNTpCdWZmZXIuZnJvbSgiMzAyMDMwMGMwNjA4MmE4NjQ4ODZmNzBkMDIwNTA1MDAwNDEwIiwiaGV4Iiksc2hhMTpCdWZmZXIuZnJvbSgiMzAyMTMwMDkwNjA1MmIwZTAzMDIxYTA1MDAwNDE0IiwiaGV4Iiksc2hhMjI0OkJ1ZmZlci5mcm9tKCIzMDJkMzAwZDA2MDk2MDg2NDgwMTY1MDMwNDAyMDQwNTAwMDQxYyIsImhleCIpLHNoYTI1NjpCdWZmZXIuZnJvbSgiMzAzMTMwMGQwNjA5NjA4NjQ4MDE2NTAzMDQwMjAxMDUwMDA0MjAiLCJoZXgiKSxzaGEzODQ6QnVmZmVyLmZyb20oIjMwNDEzMDBkMDYwOTYwODY0ODAxNjUwMzA0MDIwMjA1MDAwNDMwIiwiaGV4Iiksc2hhNTEyOkJ1ZmZlci5mcm9tKCIzMDUxMzAwZDA2MDk2MDg2NDgwMTY1MDMwNDAyMDMwNTAwMDQ0MCIsImhleCIpLHJpcGVtZDE2MDpCdWZmZXIuZnJvbSgiMzAyMTMwMDkwNjA1MmIyNDAzMDIwMTA1MDAwNDE0IiwiaGV4Iikscm1kMTYwOkJ1ZmZlci5mcm9tKCIzMDIxMzAwOTA2MDUyYjI0MDMwMjAxMDUwMDA0MTQiLCJoZXgiKX07dmFyIFNJR05fQUxHX1RPX0hBU0hfQUxJQVNFUz17cmlwZW1kMTYwOiJybWQxNjAifTt2YXIgREVGQVVMVF9IQVNIX0ZVTkNUSU9OPSJzaGEyNTYiO21vZHVsZS5leHBvcnRzPXtpc0VuY3J5cHRpb246dHJ1ZSxpc1NpZ25hdHVyZTp0cnVlfTttb2R1bGUuZXhwb3J0cy5tYWtlU2NoZW1lPWZ1bmN0aW9uKGtleSxvcHRpb25zKXtmdW5jdGlvbiBTY2hlbWUoa2V5LG9wdGlvbnMpe3RoaXMua2V5PWtleTt0aGlzLm9wdGlvbnM9b3B0aW9uc31TY2hlbWUucHJvdG90eXBlLm1heE1lc3NhZ2VMZW5ndGg9ZnVuY3Rpb24oKXtpZih0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJnRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nPT1jb25zdGFudHMuUlNBX05PX1BBRERJTkcpe3JldHVybiB0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RofXJldHVybiB0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoLTExfTtTY2hlbWUucHJvdG90eXBlLmVuY1BhZD1mdW5jdGlvbihidWZmZXIsb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgZmlsbGVkO2lmKGJ1ZmZlci5sZW5ndGg+dGhpcy5rZXkubWF4TWVzc2FnZUxlbmd0aCl7dGhyb3cgbmV3IEVycm9yKCJNZXNzYWdlIHRvbyBsb25nIGZvciBSU0EgKG49Iit0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoKyIsIGw9IitidWZmZXIubGVuZ3RoKyIpIil9aWYodGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZ0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZz09Y29uc3RhbnRzLlJTQV9OT19QQURESU5HKXtmaWxsZWQ9QnVmZmVyLmFsbG9jKHRoaXMua2V5Lm1heE1lc3NhZ2VMZW5ndGgtYnVmZmVyLmxlbmd0aCk7ZmlsbGVkLmZpbGwoMCk7cmV0dXJuIEJ1ZmZlci5jb25jYXQoW2ZpbGxlZCxidWZmZXJdKX1pZihvcHRpb25zLnR5cGU9PT0xKXtmaWxsZWQ9QnVmZmVyLmFsbG9jKHRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgtYnVmZmVyLmxlbmd0aC0xKTtmaWxsZWQuZmlsbCgyNTUsMCxmaWxsZWQubGVuZ3RoLTEpO2ZpbGxlZFswXT0xO2ZpbGxlZFtmaWxsZWQubGVuZ3RoLTFdPTA7cmV0dXJuIEJ1ZmZlci5jb25jYXQoW2ZpbGxlZCxidWZmZXJdKX1lbHNle2ZpbGxlZD1CdWZmZXIuYWxsb2ModGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aC1idWZmZXIubGVuZ3RoKTtmaWxsZWRbMF09MDtmaWxsZWRbMV09Mjt2YXIgcmFuZD1jcnlwdC5yYW5kb21CeXRlcyhmaWxsZWQubGVuZ3RoLTMpO2Zvcih2YXIgaT0wO2k8cmFuZC5sZW5ndGg7aSsrKXt2YXIgcj1yYW5kW2ldO3doaWxlKHI9PT0wKXtyPWNyeXB0LnJhbmRvbUJ5dGVzKDEpWzBdfWZpbGxlZFtpKzJdPXJ9ZmlsbGVkW2ZpbGxlZC5sZW5ndGgtMV09MDtyZXR1cm4gQnVmZmVyLmNvbmNhdChbZmlsbGVkLGJ1ZmZlcl0pfX07U2NoZW1lLnByb3RvdHlwZS5lbmNVblBhZD1mdW5jdGlvbihidWZmZXIsb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgaT0wO2lmKHRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmdGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmc9PWNvbnN0YW50cy5SU0FfTk9fUEFERElORyl7dmFyIHVuUGFkO2lmKHR5cGVvZiBidWZmZXIubGFzdEluZGV4T2Y9PSJmdW5jdGlvbiIpe3VuUGFkPWJ1ZmZlci5zbGljZShidWZmZXIubGFzdEluZGV4T2YoIlwwIikrMSxidWZmZXIubGVuZ3RoKX1lbHNle3VuUGFkPWJ1ZmZlci5zbGljZShTdHJpbmcucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCJcMCIpKzEsYnVmZmVyLmxlbmd0aCl9cmV0dXJuIHVuUGFkfWlmKGJ1ZmZlci5sZW5ndGg8NCl7cmV0dXJuIG51bGx9aWYob3B0aW9ucy50eXBlPT09MSl7aWYoYnVmZmVyWzBdIT09MCYmYnVmZmVyWzFdIT09MSl7cmV0dXJuIG51bGx9aT0zO3doaWxlKGJ1ZmZlcltpXSE9PTApe2lmKGJ1ZmZlcltpXSE9MjU1fHwrK2k+PWJ1ZmZlci5sZW5ndGgpe3JldHVybiBudWxsfX19ZWxzZXtpZihidWZmZXJbMF0hPT0wJiZidWZmZXJbMV0hPT0yKXtyZXR1cm4gbnVsbH1pPTM7d2hpbGUoYnVmZmVyW2ldIT09MCl7aWYoKytpPj1idWZmZXIubGVuZ3RoKXtyZXR1cm4gbnVsbH19fXJldHVybiBidWZmZXIuc2xpY2UoaSsxLGJ1ZmZlci5sZW5ndGgpfTtTY2hlbWUucHJvdG90eXBlLnNpZ249ZnVuY3Rpb24oYnVmZmVyKXt2YXIgaGFzaEFsZ29yaXRobT10aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OO2lmKHRoaXMub3B0aW9ucy5lbnZpcm9ubWVudD09PSJicm93c2VyIil7aGFzaEFsZ29yaXRobT1TSUdOX0FMR19UT19IQVNIX0FMSUFTRVNbaGFzaEFsZ29yaXRobV18fGhhc2hBbGdvcml0aG07dmFyIGhhc2hlcj1jcnlwdC5jcmVhdGVIYXNoKGhhc2hBbGdvcml0aG0pO2hhc2hlci51cGRhdGUoYnVmZmVyKTt2YXIgaGFzaD10aGlzLnBrY3MxcGFkKGhhc2hlci5kaWdlc3QoKSxoYXNoQWxnb3JpdGhtKTt2YXIgcmVzPXRoaXMua2V5LiRkb1ByaXZhdGUobmV3IEJpZ0ludGVnZXIoaGFzaCkpLnRvQnVmZmVyKHRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgpO3JldHVybiByZXN9ZWxzZXt2YXIgc2lnbmVyPWNyeXB0LmNyZWF0ZVNpZ24oIlJTQS0iK2hhc2hBbGdvcml0aG0udG9VcHBlckNhc2UoKSk7c2lnbmVyLnVwZGF0ZShidWZmZXIpO3JldHVybiBzaWduZXIuc2lnbih0aGlzLm9wdGlvbnMucnNhVXRpbHMuZXhwb3J0S2V5KCJwcml2YXRlIikpfX07U2NoZW1lLnByb3RvdHlwZS52ZXJpZnk9ZnVuY3Rpb24oYnVmZmVyLHNpZ25hdHVyZSxzaWduYXR1cmVfZW5jb2Rpbmcpe2NvbnNvbGUubG9nKCJ2ZXJpZnkiKTtpZih0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJnRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nPT1jb25zdGFudHMuUlNBX05PX1BBRERJTkcpe3JldHVybiBmYWxzZX12YXIgaGFzaEFsZ29yaXRobT10aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OO2lmKHRoaXMub3B0aW9ucy5lbnZpcm9ubWVudD09PSJicm93c2VyIil7aGFzaEFsZ29yaXRobT1TSUdOX0FMR19UT19IQVNIX0FMSUFTRVNbaGFzaEFsZ29yaXRobV18fGhhc2hBbGdvcml0aG07aWYoc2lnbmF0dXJlX2VuY29kaW5nKXtzaWduYXR1cmU9QnVmZmVyLmZyb20oc2lnbmF0dXJlLHNpZ25hdHVyZV9lbmNvZGluZyl9dmFyIGhhc2hlcj1jcnlwdC5jcmVhdGVIYXNoKGhhc2hBbGdvcml0aG0pO2hhc2hlci51cGRhdGUoYnVmZmVyKTt2YXIgaGFzaD10aGlzLnBrY3MxcGFkKGhhc2hlci5kaWdlc3QoKSxoYXNoQWxnb3JpdGhtKTt2YXIgbT10aGlzLmtleS4kZG9QdWJsaWMobmV3IEJpZ0ludGVnZXIoc2lnbmF0dXJlKSk7cmV0dXJuIG0udG9CdWZmZXIoKS50b1N0cmluZygiaGV4Iik9PWhhc2gudG9TdHJpbmcoImhleCIpfWVsc2V7dmFyIHZlcmlmaWVyPWNyeXB0LmNyZWF0ZVZlcmlmeSgiUlNBLSIraGFzaEFsZ29yaXRobS50b1VwcGVyQ2FzZSgpKTt2ZXJpZmllci51cGRhdGUoYnVmZmVyKTtyZXR1cm4gdmVyaWZpZXIudmVyaWZ5KHRoaXMub3B0aW9ucy5yc2FVdGlscy5leHBvcnRLZXkoInB1YmxpYyIpLHNpZ25hdHVyZSxzaWduYXR1cmVfZW5jb2RpbmcpfX07U2NoZW1lLnByb3RvdHlwZS5wa2NzMHBhZD1mdW5jdGlvbihidWZmZXIpe3ZhciBmaWxsZWQ9QnVmZmVyLmFsbG9jKHRoaXMua2V5Lm1heE1lc3NhZ2VMZW5ndGgtYnVmZmVyLmxlbmd0aCk7ZmlsbGVkLmZpbGwoMCk7cmV0dXJuIEJ1ZmZlci5jb25jYXQoW2ZpbGxlZCxidWZmZXJdKX07U2NoZW1lLnByb3RvdHlwZS5wa2NzMHVucGFkPWZ1bmN0aW9uKGJ1ZmZlcil7dmFyIHVuUGFkO2lmKHR5cGVvZiBidWZmZXIubGFzdEluZGV4T2Y9PSJmdW5jdGlvbiIpe3VuUGFkPWJ1ZmZlci5zbGljZShidWZmZXIubGFzdEluZGV4T2YoIlwwIikrMSxidWZmZXIubGVuZ3RoKX1lbHNle3VuUGFkPWJ1ZmZlci5zbGljZShTdHJpbmcucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCJcMCIpKzEsYnVmZmVyLmxlbmd0aCl9cmV0dXJuIHVuUGFkfTtTY2hlbWUucHJvdG90eXBlLnBrY3MxcGFkPWZ1bmN0aW9uKGhhc2hCdWYsaGFzaEFsZ29yaXRobSl7dmFyIGRpZ2VzdD1TSUdOX0lORk9fSEVBRFtoYXNoQWxnb3JpdGhtXTtpZighZGlnZXN0KXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQgaGFzaCBhbGdvcml0aG0iKX12YXIgZGF0YT1CdWZmZXIuY29uY2F0KFtkaWdlc3QsaGFzaEJ1Zl0pO2lmKGRhdGEubGVuZ3RoKzEwPnRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgpe3Rocm93IEVycm9yKCJLZXkgaXMgdG9vIHNob3J0IGZvciBzaWduaW5nIGFsZ29yaXRobSAoIitoYXNoQWxnb3JpdGhtKyIpIil9dmFyIGZpbGxlZD1CdWZmZXIuYWxsb2ModGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aC1kYXRhLmxlbmd0aC0xKTtmaWxsZWQuZmlsbCgyNTUsMCxmaWxsZWQubGVuZ3RoLTEpO2ZpbGxlZFswXT0xO2ZpbGxlZFtmaWxsZWQubGVuZ3RoLTFdPTA7dmFyIHJlcz1CdWZmZXIuY29uY2F0KFtmaWxsZWQsZGF0YV0pO3JldHVybiByZXN9O3JldHVybiBuZXcgU2NoZW1lKGtleSxvcHRpb25zKX19KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi9jcnlwdG8iOjQzLCIuLi9saWJzL2pzYm4iOjUyLGJ1ZmZlcjoyNyxjb25zdGFudHM6Mjl9XSw1NjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIEJpZ0ludGVnZXI9cmVxdWlyZSgiLi4vbGlicy9qc2JuIik7dmFyIGNyeXB0PXJlcXVpcmUoIi4uL2NyeXB0byIpO21vZHVsZS5leHBvcnRzPXtpc0VuY3J5cHRpb246ZmFsc2UsaXNTaWduYXR1cmU6dHJ1ZX07dmFyIERFRkFVTFRfSEFTSF9GVU5DVElPTj0ic2hhMSI7dmFyIERFRkFVTFRfU0FMVF9MRU5HVEg9MjA7bW9kdWxlLmV4cG9ydHMubWFrZVNjaGVtZT1mdW5jdGlvbihrZXksb3B0aW9ucyl7dmFyIE9BRVA9cmVxdWlyZSgiLi9zY2hlbWVzIikucGtjczFfb2FlcDtmdW5jdGlvbiBTY2hlbWUoa2V5LG9wdGlvbnMpe3RoaXMua2V5PWtleTt0aGlzLm9wdGlvbnM9b3B0aW9uc31TY2hlbWUucHJvdG90eXBlLnNpZ249ZnVuY3Rpb24oYnVmZmVyKXt2YXIgbUhhc2g9Y3J5cHQuY3JlYXRlSGFzaCh0aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OKTttSGFzaC51cGRhdGUoYnVmZmVyKTt2YXIgZW5jb2RlZD10aGlzLmVtc2FfcHNzX2VuY29kZShtSGFzaC5kaWdlc3QoKSx0aGlzLmtleS5rZXlTaXplLTEpO3JldHVybiB0aGlzLmtleS4kZG9Qcml2YXRlKG5ldyBCaWdJbnRlZ2VyKGVuY29kZWQpKS50b0J1ZmZlcih0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoKX07U2NoZW1lLnByb3RvdHlwZS52ZXJpZnk9ZnVuY3Rpb24oYnVmZmVyLHNpZ25hdHVyZSxzaWduYXR1cmVfZW5jb2Rpbmcpe2lmKHNpZ25hdHVyZV9lbmNvZGluZyl7c2lnbmF0dXJlPUJ1ZmZlci5mcm9tKHNpZ25hdHVyZSxzaWduYXR1cmVfZW5jb2RpbmcpfXNpZ25hdHVyZT1uZXcgQmlnSW50ZWdlcihzaWduYXR1cmUpO3ZhciBlbUxlbj1NYXRoLmNlaWwoKHRoaXMua2V5LmtleVNpemUtMSkvOCk7dmFyIG09dGhpcy5rZXkuJGRvUHVibGljKHNpZ25hdHVyZSkudG9CdWZmZXIoZW1MZW4pO3ZhciBtSGFzaD1jcnlwdC5jcmVhdGVIYXNoKHRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT04pO21IYXNoLnVwZGF0ZShidWZmZXIpO3JldHVybiB0aGlzLmVtc2FfcHNzX3ZlcmlmeShtSGFzaC5kaWdlc3QoKSxtLHRoaXMua2V5LmtleVNpemUtMSl9O1NjaGVtZS5wcm90b3R5cGUuZW1zYV9wc3NfZW5jb2RlPWZ1bmN0aW9uKG1IYXNoLGVtQml0cyl7dmFyIGhhc2g9dGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTjt2YXIgbWdmPXRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5tZ2Z8fE9BRVAuZW1lX29hZXBfbWdmMTt2YXIgc0xlbj10aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuc2FsdExlbmd0aHx8REVGQVVMVF9TQUxUX0xFTkdUSDt2YXIgaExlbj1PQUVQLmRpZ2VzdExlbmd0aFtoYXNoXTt2YXIgZW1MZW49TWF0aC5jZWlsKGVtQml0cy84KTtpZihlbUxlbjxoTGVuK3NMZW4rMil7dGhyb3cgbmV3IEVycm9yKCJPdXRwdXQgbGVuZ3RoIHBhc3NlZCB0byBlbUJpdHMoIitlbUJpdHMrIikgaXMgdG9vIHNtYWxsIGZvciB0aGUgb3B0aW9ucyAiKyJzcGVjaWZpZWQoIitoYXNoKyIsICIrc0xlbisiKS4gVG8gZml4IHRoaXMgaXNzdWUgaW5jcmVhc2UgdGhlIHZhbHVlIG9mIGVtQml0cy4gKG1pbmltdW0gc2l6ZTogIisoOCpoTGVuKzgqc0xlbis5KSsiKSIpfXZhciBzYWx0PWNyeXB0LnJhbmRvbUJ5dGVzKHNMZW4pO3ZhciBNYXBvc3Ryb3BoZT1CdWZmZXIuYWxsb2MoOCtoTGVuK3NMZW4pO01hcG9zdHJvcGhlLmZpbGwoMCwwLDgpO21IYXNoLmNvcHkoTWFwb3N0cm9waGUsOCk7c2FsdC5jb3B5KE1hcG9zdHJvcGhlLDgrbUhhc2gubGVuZ3RoKTt2YXIgSD1jcnlwdC5jcmVhdGVIYXNoKGhhc2gpO0gudXBkYXRlKE1hcG9zdHJvcGhlKTtIPUguZGlnZXN0KCk7dmFyIFBTPUJ1ZmZlci5hbGxvYyhlbUxlbi1zYWx0Lmxlbmd0aC1oTGVuLTIpO1BTLmZpbGwoMCk7dmFyIERCPUJ1ZmZlci5hbGxvYyhQUy5sZW5ndGgrMStzYWx0Lmxlbmd0aCk7UFMuY29weShEQik7REJbUFMubGVuZ3RoXT0xO3NhbHQuY29weShEQixQUy5sZW5ndGgrMSk7dmFyIGRiTWFzaz1tZ2YoSCxEQi5sZW5ndGgsaGFzaCk7dmFyIG1hc2tlZERCPUJ1ZmZlci5hbGxvYyhEQi5sZW5ndGgpO2Zvcih2YXIgaT0wO2k8ZGJNYXNrLmxlbmd0aDtpKyspe21hc2tlZERCW2ldPURCW2ldXmRiTWFza1tpXX12YXIgYml0cz04KmVtTGVuLWVtQml0czt2YXIgbWFzaz0yNTVeMjU1Pj44LWJpdHM8PDgtYml0czttYXNrZWREQlswXT1tYXNrZWREQlswXSZtYXNrO3ZhciBFTT1CdWZmZXIuYWxsb2MobWFza2VkREIubGVuZ3RoK0gubGVuZ3RoKzEpO21hc2tlZERCLmNvcHkoRU0sMCk7SC5jb3B5KEVNLG1hc2tlZERCLmxlbmd0aCk7RU1bRU0ubGVuZ3RoLTFdPTE4ODtyZXR1cm4gRU19O1NjaGVtZS5wcm90b3R5cGUuZW1zYV9wc3NfdmVyaWZ5PWZ1bmN0aW9uKG1IYXNoLEVNLGVtQml0cyl7dmFyIGhhc2g9dGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTjt2YXIgbWdmPXRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5tZ2Z8fE9BRVAuZW1lX29hZXBfbWdmMTt2YXIgc0xlbj10aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuc2FsdExlbmd0aHx8REVGQVVMVF9TQUxUX0xFTkdUSDt2YXIgaExlbj1PQUVQLmRpZ2VzdExlbmd0aFtoYXNoXTt2YXIgZW1MZW49TWF0aC5jZWlsKGVtQml0cy84KTtpZihlbUxlbjxoTGVuK3NMZW4rMnx8RU1bRU0ubGVuZ3RoLTFdIT0xODgpe3JldHVybiBmYWxzZX12YXIgREI9QnVmZmVyLmFsbG9jKGVtTGVuLWhMZW4tMSk7RU0uY29weShEQiwwLDAsZW1MZW4taExlbi0xKTt2YXIgbWFzaz0wO2Zvcih2YXIgaT0wLGJpdHM9OCplbUxlbi1lbUJpdHM7aTxiaXRzO2krKyl7bWFza3w9MTw8Ny1pfWlmKChEQlswXSZtYXNrKSE9PTApe3JldHVybiBmYWxzZX12YXIgSD1FTS5zbGljZShlbUxlbi1oTGVuLTEsZW1MZW4tMSk7dmFyIGRiTWFzaz1tZ2YoSCxEQi5sZW5ndGgsaGFzaCk7Zm9yKGk9MDtpPERCLmxlbmd0aDtpKyspe0RCW2ldXj1kYk1hc2tbaV19Yml0cz04KmVtTGVuLWVtQml0czttYXNrPTI1NV4yNTU+PjgtYml0czw8OC1iaXRzO0RCWzBdPURCWzBdJm1hc2s7Zm9yKGk9MDtEQltpXT09PTAmJmk8REIubGVuZ3RoO2krKyk7aWYoREJbaV0hPTEpe3JldHVybiBmYWxzZX12YXIgc2FsdD1EQi5zbGljZShEQi5sZW5ndGgtc0xlbik7dmFyIE1hcG9zdHJvcGhlPUJ1ZmZlci5hbGxvYyg4K2hMZW4rc0xlbik7TWFwb3N0cm9waGUuZmlsbCgwLDAsOCk7bUhhc2guY29weShNYXBvc3Ryb3BoZSw4KTtzYWx0LmNvcHkoTWFwb3N0cm9waGUsOCttSGFzaC5sZW5ndGgpO3ZhciBIYXBvc3Ryb3BoZT1jcnlwdC5jcmVhdGVIYXNoKGhhc2gpO0hhcG9zdHJvcGhlLnVwZGF0ZShNYXBvc3Ryb3BoZSk7SGFwb3N0cm9waGU9SGFwb3N0cm9waGUuZGlnZXN0KCk7cmV0dXJuIEgudG9TdHJpbmcoImhleCIpPT09SGFwb3N0cm9waGUudG9TdHJpbmcoImhleCIpfTtyZXR1cm4gbmV3IFNjaGVtZShrZXksb3B0aW9ucyl9fSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi4vY3J5cHRvIjo0MywiLi4vbGlicy9qc2JuIjo1MiwiLi9zY2hlbWVzIjo1NyxidWZmZXI6Mjd9XSw1NzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9e3BrY3MxOnJlcXVpcmUoIi4vcGtjczEiKSxwa2NzMV9vYWVwOnJlcXVpcmUoIi4vb2FlcCIpLHBzczpyZXF1aXJlKCIuL3BzcyIpLGlzRW5jcnlwdGlvbjpmdW5jdGlvbihzY2hlbWUpe3JldHVybiBtb2R1bGUuZXhwb3J0c1tzY2hlbWVdJiZtb2R1bGUuZXhwb3J0c1tzY2hlbWVdLmlzRW5jcnlwdGlvbn0saXNTaWduYXR1cmU6ZnVuY3Rpb24oc2NoZW1lKXtyZXR1cm4gbW9kdWxlLmV4cG9ydHNbc2NoZW1lXSYmbW9kdWxlLmV4cG9ydHNbc2NoZW1lXS5pc1NpZ25hdHVyZX19fSx7Ii4vb2FlcCI6NTQsIi4vcGtjczEiOjU1LCIuL3BzcyI6NTZ9XSw1ODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHMubGluZWJyaz1mdW5jdGlvbihzdHIsbWF4TGVuKXt2YXIgcmVzPSIiO3ZhciBpPTA7d2hpbGUoaSttYXhMZW48c3RyLmxlbmd0aCl7cmVzKz1zdHIuc3Vic3RyaW5nKGksaSttYXhMZW4pKyJcbiI7aSs9bWF4TGVufXJldHVybiByZXMrc3RyLnN1YnN0cmluZyhpLHN0ci5sZW5ndGgpfTttb2R1bGUuZXhwb3J0cy5kZXRlY3RFbnZpcm9ubWVudD1mdW5jdGlvbigpe3JldHVybiB0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCJ8fHR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCImJiEhc2VsZi5wb3N0TWVzc2FnZT8iYnJvd3NlciI6Im5vZGUifTttb2R1bGUuZXhwb3J0cy5nZXQzMkludEZyb21CdWZmZXI9ZnVuY3Rpb24oYnVmZmVyLG9mZnNldCl7b2Zmc2V0PW9mZnNldHx8MDt2YXIgc2l6ZT0wO2lmKChzaXplPWJ1ZmZlci5sZW5ndGgtb2Zmc2V0KT4wKXtpZihzaXplPj00KXtyZXR1cm4gYnVmZmVyLnJlYWRVSW50MzJCRShvZmZzZXQpfWVsc2V7dmFyIHJlcz0wO2Zvcih2YXIgaT1vZmZzZXQrc2l6ZSxkPTA7aT5vZmZzZXQ7aS0tLGQrPTIpe3Jlcys9YnVmZmVyW2ktMV0qTWF0aC5wb3coMTYsZCl9cmV0dXJuIHJlc319ZWxzZXtyZXR1cm4gTmFOfX07bW9kdWxlLmV4cG9ydHMuXz17aXNPYmplY3Q6ZnVuY3Rpb24odmFsdWUpe3ZhciB0eXBlPXR5cGVvZiB2YWx1ZTtyZXR1cm4hIXZhbHVlJiYodHlwZT09Im9iamVjdCJ8fHR5cGU9PSJmdW5jdGlvbiIpfSxpc1N0cmluZzpmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHR5cGVvZiB2YWx1ZT09InN0cmluZyJ8fHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nfSxpc051bWJlcjpmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHR5cGVvZiB2YWx1ZT09Im51bWJlciJ8fCFpc05hTihwYXJzZUZsb2F0KHZhbHVlKSkmJmlzRmluaXRlKHZhbHVlKX0sb21pdDpmdW5jdGlvbihvYmoscmVtb3ZlUHJvcCl7dmFyIG5ld09iaj17fTtmb3IodmFyIHByb3AgaW4gb2JqKXtpZighb2JqLmhhc093blByb3BlcnR5KHByb3ApfHxwcm9wPT09cmVtb3ZlUHJvcCl7Y29udGludWV9bmV3T2JqW3Byb3BdPW9ialtwcm9wXX1yZXR1cm4gbmV3T2JqfX07bW9kdWxlLmV4cG9ydHMudHJpbVN1cnJvdW5kaW5nVGV4dD1mdW5jdGlvbihkYXRhLG9wZW5pbmcsY2xvc2luZyl7dmFyIHRyaW1TdGFydEluZGV4PTA7dmFyIHRyaW1FbmRJbmRleD1kYXRhLmxlbmd0aDt2YXIgb3BlbmluZ0JvdW5kYXJ5SW5kZXg9ZGF0YS5pbmRleE9mKG9wZW5pbmcpO2lmKG9wZW5pbmdCb3VuZGFyeUluZGV4Pj0wKXt0cmltU3RhcnRJbmRleD1vcGVuaW5nQm91bmRhcnlJbmRleCtvcGVuaW5nLmxlbmd0aH12YXIgY2xvc2luZ0JvdW5kYXJ5SW5kZXg9ZGF0YS5pbmRleE9mKGNsb3Npbmcsb3BlbmluZ0JvdW5kYXJ5SW5kZXgpO2lmKGNsb3NpbmdCb3VuZGFyeUluZGV4Pj0wKXt0cmltRW5kSW5kZXg9Y2xvc2luZ0JvdW5kYXJ5SW5kZXh9cmV0dXJuIGRhdGEuc3Vic3RyaW5nKHRyaW1TdGFydEluZGV4LHRyaW1FbmRJbmRleCl9fSx7fV0sNTk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgZ2V0T3duUHJvcGVydHlTeW1ib2xzPU9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHM7dmFyIGhhc093blByb3BlcnR5PU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7dmFyIHByb3BJc0VudW1lcmFibGU9T2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtmdW5jdGlvbiB0b09iamVjdCh2YWwpe2lmKHZhbD09PW51bGx8fHZhbD09PXVuZGVmaW5lZCl7dGhyb3cgbmV3IFR5cGVFcnJvcigiT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQiKX1yZXR1cm4gT2JqZWN0KHZhbCl9ZnVuY3Rpb24gc2hvdWxkVXNlTmF0aXZlKCl7dHJ5e2lmKCFPYmplY3QuYXNzaWduKXtyZXR1cm4gZmFsc2V9dmFyIHRlc3QxPW5ldyBTdHJpbmcoImFiYyIpO3Rlc3QxWzVdPSJkZSI7aWYoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDEpWzBdPT09IjUiKXtyZXR1cm4gZmFsc2V9dmFyIHRlc3QyPXt9O2Zvcih2YXIgaT0wO2k8MTA7aSsrKXt0ZXN0MlsiXyIrU3RyaW5nLmZyb21DaGFyQ29kZShpKV09aX12YXIgb3JkZXIyPU9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QyKS5tYXAoZnVuY3Rpb24obil7cmV0dXJuIHRlc3QyW25dfSk7aWYob3JkZXIyLmpvaW4oIiIpIT09IjAxMjM0NTY3ODkiKXtyZXR1cm4gZmFsc2V9dmFyIHRlc3QzPXt9OyJhYmNkZWZnaGlqa2xtbm9wcXJzdCIuc3BsaXQoIiIpLmZvckVhY2goZnVuY3Rpb24obGV0dGVyKXt0ZXN0M1tsZXR0ZXJdPWxldHRlcn0pO2lmKE9iamVjdC5rZXlzKE9iamVjdC5hc3NpZ24oe30sdGVzdDMpKS5qb2luKCIiKSE9PSJhYmNkZWZnaGlqa2xtbm9wcXJzdCIpe3JldHVybiBmYWxzZX1yZXR1cm4gdHJ1ZX1jYXRjaChlcnIpe3JldHVybiBmYWxzZX19bW9kdWxlLmV4cG9ydHM9c2hvdWxkVXNlTmF0aXZlKCk/T2JqZWN0LmFzc2lnbjpmdW5jdGlvbih0YXJnZXQsc291cmNlKXt2YXIgZnJvbTt2YXIgdG89dG9PYmplY3QodGFyZ2V0KTt2YXIgc3ltYm9scztmb3IodmFyIHM9MTtzPGFyZ3VtZW50cy5sZW5ndGg7cysrKXtmcm9tPU9iamVjdChhcmd1bWVudHNbc10pO2Zvcih2YXIga2V5IGluIGZyb20pe2lmKGhhc093blByb3BlcnR5LmNhbGwoZnJvbSxrZXkpKXt0b1trZXldPWZyb21ba2V5XX19aWYoZ2V0T3duUHJvcGVydHlTeW1ib2xzKXtzeW1ib2xzPWdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtmb3IodmFyIGk9MDtpPHN5bWJvbHMubGVuZ3RoO2krKyl7aWYocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sc3ltYm9sc1tpXSkpe3RvW3N5bWJvbHNbaV1dPWZyb21bc3ltYm9sc1tpXV19fX19cmV0dXJuIHRvfX0se31dLDYwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtleHBvcnRzLnBia2RmMj1yZXF1aXJlKCIuL2xpYi9hc3luYyIpO2V4cG9ydHMucGJrZGYyU3luYz1yZXF1aXJlKCIuL2xpYi9zeW5jIil9LHsiLi9saWIvYXN5bmMiOjYxLCIuL2xpYi9zeW5jIjo2NH1dLDYxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2VzcyxnbG9iYWwpe3ZhciBjaGVja1BhcmFtZXRlcnM9cmVxdWlyZSgiLi9wcmVjb25kaXRpb24iKTt2YXIgZGVmYXVsdEVuY29kaW5nPXJlcXVpcmUoIi4vZGVmYXVsdC1lbmNvZGluZyIpO3ZhciBzeW5jPXJlcXVpcmUoIi4vc3luYyIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIFpFUk9fQlVGO3ZhciBzdWJ0bGU9Z2xvYmFsLmNyeXB0byYmZ2xvYmFsLmNyeXB0by5zdWJ0bGU7dmFyIHRvQnJvd3Nlcj17c2hhOiJTSEEtMSIsInNoYS0xIjoiU0hBLTEiLHNoYTE6IlNIQS0xIixzaGEyNTY6IlNIQS0yNTYiLCJzaGEtMjU2IjoiU0hBLTI1NiIsc2hhMzg0OiJTSEEtMzg0Iiwic2hhLTM4NCI6IlNIQS0zODQiLCJzaGEtNTEyIjoiU0hBLTUxMiIsc2hhNTEyOiJTSEEtNTEyIn07dmFyIGNoZWNrcz1bXTtmdW5jdGlvbiBjaGVja05hdGl2ZShhbGdvKXtpZihnbG9iYWwucHJvY2VzcyYmIWdsb2JhbC5wcm9jZXNzLmJyb3dzZXIpe3JldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpfWlmKCFzdWJ0bGV8fCFzdWJ0bGUuaW1wb3J0S2V5fHwhc3VidGxlLmRlcml2ZUJpdHMpe3JldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpfWlmKGNoZWNrc1thbGdvXSE9PXVuZGVmaW5lZCl7cmV0dXJuIGNoZWNrc1thbGdvXX1aRVJPX0JVRj1aRVJPX0JVRnx8QnVmZmVyLmFsbG9jKDgpO3ZhciBwcm9tPWJyb3dzZXJQYmtkZjIoWkVST19CVUYsWkVST19CVUYsMTAsMTI4LGFsZ28pLnRoZW4oZnVuY3Rpb24oKXtyZXR1cm4gdHJ1ZX0pLmNhdGNoKGZ1bmN0aW9uKCl7cmV0dXJuIGZhbHNlfSk7Y2hlY2tzW2FsZ29dPXByb207cmV0dXJuIHByb219ZnVuY3Rpb24gYnJvd3NlclBia2RmMihwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsbGVuZ3RoLGFsZ28pe3JldHVybiBzdWJ0bGUuaW1wb3J0S2V5KCJyYXciLHBhc3N3b3JkLHtuYW1lOiJQQktERjIifSxmYWxzZSxbImRlcml2ZUJpdHMiXSkudGhlbihmdW5jdGlvbihrZXkpe3JldHVybiBzdWJ0bGUuZGVyaXZlQml0cyh7bmFtZToiUEJLREYyIixzYWx0OnNhbHQsaXRlcmF0aW9uczppdGVyYXRpb25zLGhhc2g6e25hbWU6YWxnb319LGtleSxsZW5ndGg8PDMpfSkudGhlbihmdW5jdGlvbihyZXMpe3JldHVybiBCdWZmZXIuZnJvbShyZXMpfSl9ZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UocHJvbWlzZSxjYWxsYmFjayl7cHJvbWlzZS50aGVuKGZ1bmN0aW9uKG91dCl7cHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpe2NhbGxiYWNrKG51bGwsb3V0KX0pfSxmdW5jdGlvbihlKXtwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCl7Y2FsbGJhY2soZSl9KX0pfW1vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxrZXlsZW4sZGlnZXN0LGNhbGxiYWNrKXtpZih0eXBlb2YgZGlnZXN0PT09ImZ1bmN0aW9uIil7Y2FsbGJhY2s9ZGlnZXN0O2RpZ2VzdD11bmRlZmluZWR9ZGlnZXN0PWRpZ2VzdHx8InNoYTEiO3ZhciBhbGdvPXRvQnJvd3NlcltkaWdlc3QudG9Mb3dlckNhc2UoKV07aWYoIWFsZ298fHR5cGVvZiBnbG9iYWwuUHJvbWlzZSE9PSJmdW5jdGlvbiIpe3JldHVybiBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCl7dmFyIG91dDt0cnl7b3V0PXN5bmMocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGtleWxlbixkaWdlc3QpfWNhdGNoKGUpe3JldHVybiBjYWxsYmFjayhlKX1jYWxsYmFjayhudWxsLG91dCl9KX1jaGVja1BhcmFtZXRlcnMocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGtleWxlbik7aWYodHlwZW9mIGNhbGxiYWNrIT09ImZ1bmN0aW9uIil0aHJvdyBuZXcgRXJyb3IoIk5vIGNhbGxiYWNrIHByb3ZpZGVkIHRvIHBia2RmMiIpO2lmKCFCdWZmZXIuaXNCdWZmZXIocGFzc3dvcmQpKXBhc3N3b3JkPUJ1ZmZlci5mcm9tKHBhc3N3b3JkLGRlZmF1bHRFbmNvZGluZyk7aWYoIUJ1ZmZlci5pc0J1ZmZlcihzYWx0KSlzYWx0PUJ1ZmZlci5mcm9tKHNhbHQsZGVmYXVsdEVuY29kaW5nKTtyZXNvbHZlUHJvbWlzZShjaGVja05hdGl2ZShhbGdvKS50aGVuKGZ1bmN0aW9uKHJlc3Ape2lmKHJlc3ApcmV0dXJuIGJyb3dzZXJQYmtkZjIocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGtleWxlbixhbGdvKTtyZXR1cm4gc3luYyhwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsa2V5bGVuLGRpZ2VzdCl9KSxjYWxsYmFjayl9fSkuY2FsbCh0aGlzLHJlcXVpcmUoIl9wcm9jZXNzIiksdHlwZW9mIGdsb2JhbCE9PSJ1bmRlZmluZWQiP2dsb2JhbDp0eXBlb2Ygc2VsZiE9PSJ1bmRlZmluZWQiP3NlbGY6dHlwZW9mIHdpbmRvdyE9PSJ1bmRlZmluZWQiP3dpbmRvdzp7fSl9LHsiLi9kZWZhdWx0LWVuY29kaW5nIjo2MiwiLi9wcmVjb25kaXRpb24iOjYzLCIuL3N5bmMiOjY0LF9wcm9jZXNzOjY2LCJzYWZlLWJ1ZmZlciI6ODJ9XSw2MjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHByb2Nlc3Mpe3ZhciBkZWZhdWx0RW5jb2Rpbmc7aWYocHJvY2Vzcy5icm93c2VyKXtkZWZhdWx0RW5jb2Rpbmc9InV0Zi04In1lbHNle3ZhciBwVmVyc2lvbk1ham9yPXBhcnNlSW50KHByb2Nlc3MudmVyc2lvbi5zcGxpdCgiLiIpWzBdLnNsaWNlKDEpLDEwKTtkZWZhdWx0RW5jb2Rpbmc9cFZlcnNpb25NYWpvcj49Nj8idXRmLTgiOiJiaW5hcnkifW1vZHVsZS5leHBvcnRzPWRlZmF1bHRFbmNvZGluZ30pLmNhbGwodGhpcyxyZXF1aXJlKCJfcHJvY2VzcyIpKX0se19wcm9jZXNzOjY2fV0sNjM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBNQVhfQUxMT0M9TWF0aC5wb3coMiwzMCktMTtmdW5jdGlvbiBjaGVja0J1ZmZlcihidWYsbmFtZSl7aWYodHlwZW9mIGJ1ZiE9PSJzdHJpbmciJiYhQnVmZmVyLmlzQnVmZmVyKGJ1Zikpe3Rocm93IG5ldyBUeXBlRXJyb3IobmFtZSsiIG11c3QgYmUgYSBidWZmZXIgb3Igc3RyaW5nIil9fW1vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxrZXlsZW4pe2NoZWNrQnVmZmVyKHBhc3N3b3JkLCJQYXNzd29yZCIpO2NoZWNrQnVmZmVyKHNhbHQsIlNhbHQiKTtpZih0eXBlb2YgaXRlcmF0aW9ucyE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJJdGVyYXRpb25zIG5vdCBhIG51bWJlciIpfWlmKGl0ZXJhdGlvbnM8MCl7dGhyb3cgbmV3IFR5cGVFcnJvcigiQmFkIGl0ZXJhdGlvbnMiKX1pZih0eXBlb2Yga2V5bGVuIT09Im51bWJlciIpe3Rocm93IG5ldyBUeXBlRXJyb3IoIktleSBsZW5ndGggbm90IGEgbnVtYmVyIil9aWYoa2V5bGVuPDB8fGtleWxlbj5NQVhfQUxMT0N8fGtleWxlbiE9PWtleWxlbil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQmFkIGtleSBsZW5ndGgiKX19fSkuY2FsbCh0aGlzLHtpc0J1ZmZlcjpyZXF1aXJlKCIuLi8uLi9pcy1idWZmZXIvaW5kZXguanMiKX0pfSx7Ii4uLy4uL2lzLWJ1ZmZlci9pbmRleC5qcyI6Mzd9XSw2NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIG1kNT1yZXF1aXJlKCJjcmVhdGUtaGFzaC9tZDUiKTt2YXIgUklQRU1EMTYwPXJlcXVpcmUoInJpcGVtZDE2MCIpO3ZhciBzaGE9cmVxdWlyZSgic2hhLmpzIik7dmFyIGNoZWNrUGFyYW1ldGVycz1yZXF1aXJlKCIuL3ByZWNvbmRpdGlvbiIpO3ZhciBkZWZhdWx0RW5jb2Rpbmc9cmVxdWlyZSgiLi9kZWZhdWx0LWVuY29kaW5nIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgWkVST1M9QnVmZmVyLmFsbG9jKDEyOCk7dmFyIHNpemVzPXttZDU6MTYsc2hhMToyMCxzaGEyMjQ6Mjgsc2hhMjU2OjMyLHNoYTM4NDo0OCxzaGE1MTI6NjQscm1kMTYwOjIwLHJpcGVtZDE2MDoyMH07ZnVuY3Rpb24gSG1hYyhhbGcsa2V5LHNhbHRMZW4pe3ZhciBoYXNoPWdldERpZ2VzdChhbGcpO3ZhciBibG9ja3NpemU9YWxnPT09InNoYTUxMiJ8fGFsZz09PSJzaGEzODQiPzEyODo2NDtpZihrZXkubGVuZ3RoPmJsb2Nrc2l6ZSl7a2V5PWhhc2goa2V5KX1lbHNlIGlmKGtleS5sZW5ndGg8YmxvY2tzaXplKXtrZXk9QnVmZmVyLmNvbmNhdChba2V5LFpFUk9TXSxibG9ja3NpemUpfXZhciBpcGFkPUJ1ZmZlci5hbGxvY1Vuc2FmZShibG9ja3NpemUrc2l6ZXNbYWxnXSk7dmFyIG9wYWQ9QnVmZmVyLmFsbG9jVW5zYWZlKGJsb2Nrc2l6ZStzaXplc1thbGddKTtmb3IodmFyIGk9MDtpPGJsb2Nrc2l6ZTtpKyspe2lwYWRbaV09a2V5W2ldXjU0O29wYWRbaV09a2V5W2ldXjkyfXZhciBpcGFkMT1CdWZmZXIuYWxsb2NVbnNhZmUoYmxvY2tzaXplK3NhbHRMZW4rNCk7aXBhZC5jb3B5KGlwYWQxLDAsMCxibG9ja3NpemUpO3RoaXMuaXBhZDE9aXBhZDE7dGhpcy5pcGFkMj1pcGFkO3RoaXMub3BhZD1vcGFkO3RoaXMuYWxnPWFsZzt0aGlzLmJsb2Nrc2l6ZT1ibG9ja3NpemU7dGhpcy5oYXNoPWhhc2g7dGhpcy5zaXplPXNpemVzW2FsZ119SG1hYy5wcm90b3R5cGUucnVuPWZ1bmN0aW9uKGRhdGEsaXBhZCl7ZGF0YS5jb3B5KGlwYWQsdGhpcy5ibG9ja3NpemUpO3ZhciBoPXRoaXMuaGFzaChpcGFkKTtoLmNvcHkodGhpcy5vcGFkLHRoaXMuYmxvY2tzaXplKTtyZXR1cm4gdGhpcy5oYXNoKHRoaXMub3BhZCl9O2Z1bmN0aW9uIGdldERpZ2VzdChhbGcpe2Z1bmN0aW9uIHNoYUZ1bmMoZGF0YSl7cmV0dXJuIHNoYShhbGcpLnVwZGF0ZShkYXRhKS5kaWdlc3QoKX1mdW5jdGlvbiBybWQxNjBGdW5jKGRhdGEpe3JldHVybihuZXcgUklQRU1EMTYwKS51cGRhdGUoZGF0YSkuZGlnZXN0KCl9aWYoYWxnPT09InJtZDE2MCJ8fGFsZz09PSJyaXBlbWQxNjAiKXJldHVybiBybWQxNjBGdW5jO2lmKGFsZz09PSJtZDUiKXJldHVybiBtZDU7cmV0dXJuIHNoYUZ1bmN9ZnVuY3Rpb24gcGJrZGYyKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxrZXlsZW4sZGlnZXN0KXtjaGVja1BhcmFtZXRlcnMocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGtleWxlbik7aWYoIUJ1ZmZlci5pc0J1ZmZlcihwYXNzd29yZCkpcGFzc3dvcmQ9QnVmZmVyLmZyb20ocGFzc3dvcmQsZGVmYXVsdEVuY29kaW5nKTtpZighQnVmZmVyLmlzQnVmZmVyKHNhbHQpKXNhbHQ9QnVmZmVyLmZyb20oc2FsdCxkZWZhdWx0RW5jb2RpbmcpO2RpZ2VzdD1kaWdlc3R8fCJzaGExIjt2YXIgaG1hYz1uZXcgSG1hYyhkaWdlc3QscGFzc3dvcmQsc2FsdC5sZW5ndGgpO3ZhciBESz1CdWZmZXIuYWxsb2NVbnNhZmUoa2V5bGVuKTt2YXIgYmxvY2sxPUJ1ZmZlci5hbGxvY1Vuc2FmZShzYWx0Lmxlbmd0aCs0KTtzYWx0LmNvcHkoYmxvY2sxLDAsMCxzYWx0Lmxlbmd0aCk7dmFyIGRlc3RQb3M9MDt2YXIgaExlbj1zaXplc1tkaWdlc3RdO3ZhciBsPU1hdGguY2VpbChrZXlsZW4vaExlbik7Zm9yKHZhciBpPTE7aTw9bDtpKyspe2Jsb2NrMS53cml0ZVVJbnQzMkJFKGksc2FsdC5sZW5ndGgpO3ZhciBUPWhtYWMucnVuKGJsb2NrMSxobWFjLmlwYWQxKTt2YXIgVT1UO2Zvcih2YXIgaj0xO2o8aXRlcmF0aW9ucztqKyspe1U9aG1hYy5ydW4oVSxobWFjLmlwYWQyKTtmb3IodmFyIGs9MDtrPGhMZW47aysrKVRba11ePVVba119VC5jb3B5KERLLGRlc3RQb3MpO2Rlc3RQb3MrPWhMZW59cmV0dXJuIERLfW1vZHVsZS5leHBvcnRzPXBia2RmMn0seyIuL2RlZmF1bHQtZW5jb2RpbmciOjYyLCIuL3ByZWNvbmRpdGlvbiI6NjMsImNyZWF0ZS1oYXNoL21kNSI6MzIscmlwZW1kMTYwOjgxLCJzYWZlLWJ1ZmZlciI6ODIsInNoYS5qcyI6OTR9XSw2NTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHByb2Nlc3MpeyJ1c2Ugc3RyaWN0IjtpZih0eXBlb2YgcHJvY2Vzcz09PSJ1bmRlZmluZWQifHwhcHJvY2Vzcy52ZXJzaW9ufHxwcm9jZXNzLnZlcnNpb24uaW5kZXhPZigidjAuIik9PT0wfHxwcm9jZXNzLnZlcnNpb24uaW5kZXhPZigidjEuIik9PT0wJiZwcm9jZXNzLnZlcnNpb24uaW5kZXhPZigidjEuOC4iKSE9PTApe21vZHVsZS5leHBvcnRzPXtuZXh0VGljazpuZXh0VGlja319ZWxzZXttb2R1bGUuZXhwb3J0cz1wcm9jZXNzfWZ1bmN0aW9uIG5leHRUaWNrKGZuLGFyZzEsYXJnMixhcmczKXtpZih0eXBlb2YgZm4hPT0iZnVuY3Rpb24iKXt0aHJvdyBuZXcgVHlwZUVycm9yKCciY2FsbGJhY2siIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpfXZhciBsZW49YXJndW1lbnRzLmxlbmd0aDt2YXIgYXJncyxpO3N3aXRjaChsZW4pe2Nhc2UgMDpjYXNlIDE6cmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZm4pO2Nhc2UgMjpyZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiBhZnRlclRpY2tPbmUoKXtmbi5jYWxsKG51bGwsYXJnMSl9KTtjYXNlIDM6cmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gYWZ0ZXJUaWNrVHdvKCl7Zm4uY2FsbChudWxsLGFyZzEsYXJnMil9KTtjYXNlIDQ6cmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gYWZ0ZXJUaWNrVGhyZWUoKXtmbi5jYWxsKG51bGwsYXJnMSxhcmcyLGFyZzMpfSk7ZGVmYXVsdDphcmdzPW5ldyBBcnJheShsZW4tMSk7aT0wO3doaWxlKGk8YXJncy5sZW5ndGgpe2FyZ3NbaSsrXT1hcmd1bWVudHNbaV19cmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gYWZ0ZXJUaWNrKCl7Zm4uYXBwbHkobnVsbCxhcmdzKX0pfX19KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSl9LHtfcHJvY2Vzczo2Nn1dLDY2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgcHJvY2Vzcz1tb2R1bGUuZXhwb3J0cz17fTt2YXIgY2FjaGVkU2V0VGltZW91dDt2YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O2Z1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKXt0aHJvdyBuZXcgRXJyb3IoInNldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQiKX1mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0KCl7dGhyb3cgbmV3IEVycm9yKCJjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQiKX0oZnVuY3Rpb24oKXt0cnl7aWYodHlwZW9mIHNldFRpbWVvdXQ9PT0iZnVuY3Rpb24iKXtjYWNoZWRTZXRUaW1lb3V0PXNldFRpbWVvdXR9ZWxzZXtjYWNoZWRTZXRUaW1lb3V0PWRlZmF1bHRTZXRUaW1vdXR9fWNhdGNoKGUpe2NhY2hlZFNldFRpbWVvdXQ9ZGVmYXVsdFNldFRpbW91dH10cnl7aWYodHlwZW9mIGNsZWFyVGltZW91dD09PSJmdW5jdGlvbiIpe2NhY2hlZENsZWFyVGltZW91dD1jbGVhclRpbWVvdXR9ZWxzZXtjYWNoZWRDbGVhclRpbWVvdXQ9ZGVmYXVsdENsZWFyVGltZW91dH19Y2F0Y2goZSl7Y2FjaGVkQ2xlYXJUaW1lb3V0PWRlZmF1bHRDbGVhclRpbWVvdXR9fSkoKTtmdW5jdGlvbiBydW5UaW1lb3V0KGZ1bil7aWYoY2FjaGVkU2V0VGltZW91dD09PXNldFRpbWVvdXQpe3JldHVybiBzZXRUaW1lb3V0KGZ1biwwKX1pZigoY2FjaGVkU2V0VGltZW91dD09PWRlZmF1bHRTZXRUaW1vdXR8fCFjYWNoZWRTZXRUaW1lb3V0KSYmc2V0VGltZW91dCl7Y2FjaGVkU2V0VGltZW91dD1zZXRUaW1lb3V0O3JldHVybiBzZXRUaW1lb3V0KGZ1biwwKX10cnl7cmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLDApfWNhdGNoKGUpe3RyeXtyZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsZnVuLDApfWNhdGNoKGUpe3JldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcyxmdW4sMCl9fX1mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKXtpZihjYWNoZWRDbGVhclRpbWVvdXQ9PT1jbGVhclRpbWVvdXQpe3JldHVybiBjbGVhclRpbWVvdXQobWFya2VyKX1pZigoY2FjaGVkQ2xlYXJUaW1lb3V0PT09ZGVmYXVsdENsZWFyVGltZW91dHx8IWNhY2hlZENsZWFyVGltZW91dCkmJmNsZWFyVGltZW91dCl7Y2FjaGVkQ2xlYXJUaW1lb3V0PWNsZWFyVGltZW91dDtyZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcil9dHJ5e3JldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKX1jYXRjaChlKXt0cnl7cmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsbWFya2VyKX1jYXRjaChlKXtyZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcyxtYXJrZXIpfX19dmFyIHF1ZXVlPVtdO3ZhciBkcmFpbmluZz1mYWxzZTt2YXIgY3VycmVudFF1ZXVlO3ZhciBxdWV1ZUluZGV4PS0xO2Z1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpe2lmKCFkcmFpbmluZ3x8IWN1cnJlbnRRdWV1ZSl7cmV0dXJufWRyYWluaW5nPWZhbHNlO2lmKGN1cnJlbnRRdWV1ZS5sZW5ndGgpe3F1ZXVlPWN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpfWVsc2V7cXVldWVJbmRleD0tMX1pZihxdWV1ZS5sZW5ndGgpe2RyYWluUXVldWUoKX19ZnVuY3Rpb24gZHJhaW5RdWV1ZSgpe2lmKGRyYWluaW5nKXtyZXR1cm59dmFyIHRpbWVvdXQ9cnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO2RyYWluaW5nPXRydWU7dmFyIGxlbj1xdWV1ZS5sZW5ndGg7d2hpbGUobGVuKXtjdXJyZW50UXVldWU9cXVldWU7cXVldWU9W107d2hpbGUoKytxdWV1ZUluZGV4PGxlbil7aWYoY3VycmVudFF1ZXVlKXtjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCl9fXF1ZXVlSW5kZXg9LTE7bGVuPXF1ZXVlLmxlbmd0aH1jdXJyZW50UXVldWU9bnVsbDtkcmFpbmluZz1mYWxzZTtydW5DbGVhclRpbWVvdXQodGltZW91dCl9cHJvY2Vzcy5uZXh0VGljaz1mdW5jdGlvbihmdW4pe3ZhciBhcmdzPW5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoLTEpO2lmKGFyZ3VtZW50cy5sZW5ndGg+MSl7Zm9yKHZhciBpPTE7aTxhcmd1bWVudHMubGVuZ3RoO2krKyl7YXJnc1tpLTFdPWFyZ3VtZW50c1tpXX19cXVldWUucHVzaChuZXcgSXRlbShmdW4sYXJncykpO2lmKHF1ZXVlLmxlbmd0aD09PTEmJiFkcmFpbmluZyl7cnVuVGltZW91dChkcmFpblF1ZXVlKX19O2Z1bmN0aW9uIEl0ZW0oZnVuLGFycmF5KXt0aGlzLmZ1bj1mdW47dGhpcy5hcnJheT1hcnJheX1JdGVtLnByb3RvdHlwZS5ydW49ZnVuY3Rpb24oKXt0aGlzLmZ1bi5hcHBseShudWxsLHRoaXMuYXJyYXkpfTtwcm9jZXNzLnRpdGxlPSJicm93c2VyIjtwcm9jZXNzLmJyb3dzZXI9dHJ1ZTtwcm9jZXNzLmVudj17fTtwcm9jZXNzLmFyZ3Y9W107cHJvY2Vzcy52ZXJzaW9uPSIiO3Byb2Nlc3MudmVyc2lvbnM9e307ZnVuY3Rpb24gbm9vcCgpe31wcm9jZXNzLm9uPW5vb3A7cHJvY2Vzcy5hZGRMaXN0ZW5lcj1ub29wO3Byb2Nlc3Mub25jZT1ub29wO3Byb2Nlc3Mub2ZmPW5vb3A7cHJvY2Vzcy5yZW1vdmVMaXN0ZW5lcj1ub29wO3Byb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzPW5vb3A7cHJvY2Vzcy5lbWl0PW5vb3A7cHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXI9bm9vcDtwcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXI9bm9vcDtwcm9jZXNzLmxpc3RlbmVycz1mdW5jdGlvbihuYW1lKXtyZXR1cm5bXX07cHJvY2Vzcy5iaW5kaW5nPWZ1bmN0aW9uKG5hbWUpe3Rocm93IG5ldyBFcnJvcigicHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQiKX07cHJvY2Vzcy5jd2Q9ZnVuY3Rpb24oKXtyZXR1cm4iLyJ9O3Byb2Nlc3MuY2hkaXI9ZnVuY3Rpb24oZGlyKXt0aHJvdyBuZXcgRXJyb3IoInByb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCIpfTtwcm9jZXNzLnVtYXNrPWZ1bmN0aW9uKCl7cmV0dXJuIDB9fSx7fV0sNjc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXJlcXVpcmUoIi4vbGliL19zdHJlYW1fZHVwbGV4LmpzIil9LHsiLi9saWIvX3N0cmVhbV9kdXBsZXguanMiOjY4fV0sNjg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgcG5hPXJlcXVpcmUoInByb2Nlc3MtbmV4dGljay1hcmdzIik7dmFyIG9iamVjdEtleXM9T2JqZWN0LmtleXN8fGZ1bmN0aW9uKG9iail7dmFyIGtleXM9W107Zm9yKHZhciBrZXkgaW4gb2JqKXtrZXlzLnB1c2goa2V5KX1yZXR1cm4ga2V5c307bW9kdWxlLmV4cG9ydHM9RHVwbGV4O3ZhciB1dGlsPXJlcXVpcmUoImNvcmUtdXRpbC1pcyIpO3V0aWwuaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgUmVhZGFibGU9cmVxdWlyZSgiLi9fc3RyZWFtX3JlYWRhYmxlIik7dmFyIFdyaXRhYmxlPXJlcXVpcmUoIi4vX3N0cmVhbV93cml0YWJsZSIpO3V0aWwuaW5oZXJpdHMoRHVwbGV4LFJlYWRhYmxlKTt7dmFyIGtleXM9b2JqZWN0S2V5cyhXcml0YWJsZS5wcm90b3R5cGUpO2Zvcih2YXIgdj0wO3Y8a2V5cy5sZW5ndGg7disrKXt2YXIgbWV0aG9kPWtleXNbdl07aWYoIUR1cGxleC5wcm90b3R5cGVbbWV0aG9kXSlEdXBsZXgucHJvdG90eXBlW21ldGhvZF09V3JpdGFibGUucHJvdG90eXBlW21ldGhvZF19fWZ1bmN0aW9uIER1cGxleChvcHRpb25zKXtpZighKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXgpKXJldHVybiBuZXcgRHVwbGV4KG9wdGlvbnMpO1JlYWRhYmxlLmNhbGwodGhpcyxvcHRpb25zKTtXcml0YWJsZS5jYWxsKHRoaXMsb3B0aW9ucyk7aWYob3B0aW9ucyYmb3B0aW9ucy5yZWFkYWJsZT09PWZhbHNlKXRoaXMucmVhZGFibGU9ZmFsc2U7aWYob3B0aW9ucyYmb3B0aW9ucy53cml0YWJsZT09PWZhbHNlKXRoaXMud3JpdGFibGU9ZmFsc2U7dGhpcy5hbGxvd0hhbGZPcGVuPXRydWU7aWYob3B0aW9ucyYmb3B0aW9ucy5hbGxvd0hhbGZPcGVuPT09ZmFsc2UpdGhpcy5hbGxvd0hhbGZPcGVuPWZhbHNlO3RoaXMub25jZSgiZW5kIixvbmVuZCl9T2JqZWN0LmRlZmluZVByb3BlcnR5KER1cGxleC5wcm90b3R5cGUsIndyaXRhYmxlSGlnaFdhdGVyTWFyayIse2VudW1lcmFibGU6ZmFsc2UsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3dyaXRhYmxlU3RhdGUuaGlnaFdhdGVyTWFya319KTtmdW5jdGlvbiBvbmVuZCgpe2lmKHRoaXMuYWxsb3dIYWxmT3Blbnx8dGhpcy5fd3JpdGFibGVTdGF0ZS5lbmRlZClyZXR1cm47cG5hLm5leHRUaWNrKG9uRW5kTlQsdGhpcyl9ZnVuY3Rpb24gb25FbmROVChzZWxmKXtzZWxmLmVuZCgpfU9iamVjdC5kZWZpbmVQcm9wZXJ0eShEdXBsZXgucHJvdG90eXBlLCJkZXN0cm95ZWQiLHtnZXQ6ZnVuY3Rpb24oKXtpZih0aGlzLl9yZWFkYWJsZVN0YXRlPT09dW5kZWZpbmVkfHx0aGlzLl93cml0YWJsZVN0YXRlPT09dW5kZWZpbmVkKXtyZXR1cm4gZmFsc2V9cmV0dXJuIHRoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkJiZ0aGlzLl93cml0YWJsZVN0YXRlLmRlc3Ryb3llZH0sc2V0OmZ1bmN0aW9uKHZhbHVlKXtpZih0aGlzLl9yZWFkYWJsZVN0YXRlPT09dW5kZWZpbmVkfHx0aGlzLl93cml0YWJsZVN0YXRlPT09dW5kZWZpbmVkKXtyZXR1cm59dGhpcy5fcmVhZGFibGVTdGF0ZS5kZXN0cm95ZWQ9dmFsdWU7dGhpcy5fd3JpdGFibGVTdGF0ZS5kZXN0cm95ZWQ9dmFsdWV9fSk7RHVwbGV4LnByb3RvdHlwZS5fZGVzdHJveT1mdW5jdGlvbihlcnIsY2Ipe3RoaXMucHVzaChudWxsKTt0aGlzLmVuZCgpO3BuYS5uZXh0VGljayhjYixlcnIpfX0seyIuL19zdHJlYW1fcmVhZGFibGUiOjcwLCIuL19zdHJlYW1fd3JpdGFibGUiOjcyLCJjb3JlLXV0aWwtaXMiOjMwLGluaGVyaXRzOjM2LCJwcm9jZXNzLW5leHRpY2stYXJncyI6NjV9XSw2OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO21vZHVsZS5leHBvcnRzPVBhc3NUaHJvdWdoO3ZhciBUcmFuc2Zvcm09cmVxdWlyZSgiLi9fc3RyZWFtX3RyYW5zZm9ybSIpO3ZhciB1dGlsPXJlcXVpcmUoImNvcmUtdXRpbC1pcyIpO3V0aWwuaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt1dGlsLmluaGVyaXRzKFBhc3NUaHJvdWdoLFRyYW5zZm9ybSk7ZnVuY3Rpb24gUGFzc1Rocm91Z2gob3B0aW9ucyl7aWYoISh0aGlzIGluc3RhbmNlb2YgUGFzc1Rocm91Z2gpKXJldHVybiBuZXcgUGFzc1Rocm91Z2gob3B0aW9ucyk7VHJhbnNmb3JtLmNhbGwodGhpcyxvcHRpb25zKX1QYXNzVGhyb3VnaC5wcm90b3R5cGUuX3RyYW5zZm9ybT1mdW5jdGlvbihjaHVuayxlbmNvZGluZyxjYil7Y2IobnVsbCxjaHVuayl9fSx7Ii4vX3N0cmVhbV90cmFuc2Zvcm0iOjcxLCJjb3JlLXV0aWwtaXMiOjMwLGluaGVyaXRzOjM2fV0sNzA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihwcm9jZXNzLGdsb2JhbCl7InVzZSBzdHJpY3QiO3ZhciBwbmE9cmVxdWlyZSgicHJvY2Vzcy1uZXh0aWNrLWFyZ3MiKTttb2R1bGUuZXhwb3J0cz1SZWFkYWJsZTt2YXIgaXNBcnJheT1yZXF1aXJlKCJpc2FycmF5Iik7dmFyIER1cGxleDtSZWFkYWJsZS5SZWFkYWJsZVN0YXRlPVJlYWRhYmxlU3RhdGU7dmFyIEVFPXJlcXVpcmUoImV2ZW50cyIpLkV2ZW50RW1pdHRlcjt2YXIgRUVsaXN0ZW5lckNvdW50PWZ1bmN0aW9uKGVtaXR0ZXIsdHlwZSl7cmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJzKHR5cGUpLmxlbmd0aH07dmFyIFN0cmVhbT1yZXF1aXJlKCIuL2ludGVybmFsL3N0cmVhbXMvc3RyZWFtIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgT3VyVWludDhBcnJheT1nbG9iYWwuVWludDhBcnJheXx8ZnVuY3Rpb24oKXt9O2Z1bmN0aW9uIF91aW50OEFycmF5VG9CdWZmZXIoY2h1bmspe3JldHVybiBCdWZmZXIuZnJvbShjaHVuayl9ZnVuY3Rpb24gX2lzVWludDhBcnJheShvYmope3JldHVybiBCdWZmZXIuaXNCdWZmZXIob2JqKXx8b2JqIGluc3RhbmNlb2YgT3VyVWludDhBcnJheX12YXIgdXRpbD1yZXF1aXJlKCJjb3JlLXV0aWwtaXMiKTt1dGlsLmluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIGRlYnVnVXRpbD1yZXF1aXJlKCJ1dGlsIik7dmFyIGRlYnVnPXZvaWQgMDtpZihkZWJ1Z1V0aWwmJmRlYnVnVXRpbC5kZWJ1Z2xvZyl7ZGVidWc9ZGVidWdVdGlsLmRlYnVnbG9nKCJzdHJlYW0iKX1lbHNle2RlYnVnPWZ1bmN0aW9uKCl7fX12YXIgQnVmZmVyTGlzdD1yZXF1aXJlKCIuL2ludGVybmFsL3N0cmVhbXMvQnVmZmVyTGlzdCIpO3ZhciBkZXN0cm95SW1wbD1yZXF1aXJlKCIuL2ludGVybmFsL3N0cmVhbXMvZGVzdHJveSIpO3ZhciBTdHJpbmdEZWNvZGVyO3V0aWwuaW5oZXJpdHMoUmVhZGFibGUsU3RyZWFtKTt2YXIga1Byb3h5RXZlbnRzPVsiZXJyb3IiLCJjbG9zZSIsImRlc3Ryb3kiLCJwYXVzZSIsInJlc3VtZSJdO2Z1bmN0aW9uIHByZXBlbmRMaXN0ZW5lcihlbWl0dGVyLGV2ZW50LGZuKXtpZih0eXBlb2YgZW1pdHRlci5wcmVwZW5kTGlzdGVuZXI9PT0iZnVuY3Rpb24iKXJldHVybiBlbWl0dGVyLnByZXBlbmRMaXN0ZW5lcihldmVudCxmbik7aWYoIWVtaXR0ZXIuX2V2ZW50c3x8IWVtaXR0ZXIuX2V2ZW50c1tldmVudF0pZW1pdHRlci5vbihldmVudCxmbik7ZWxzZSBpZihpc0FycmF5KGVtaXR0ZXIuX2V2ZW50c1tldmVudF0pKWVtaXR0ZXIuX2V2ZW50c1tldmVudF0udW5zaGlmdChmbik7ZWxzZSBlbWl0dGVyLl9ldmVudHNbZXZlbnRdPVtmbixlbWl0dGVyLl9ldmVudHNbZXZlbnRdXX1mdW5jdGlvbiBSZWFkYWJsZVN0YXRlKG9wdGlvbnMsc3RyZWFtKXtEdXBsZXg9RHVwbGV4fHxyZXF1aXJlKCIuL19zdHJlYW1fZHVwbGV4Iik7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgaXNEdXBsZXg9c3RyZWFtIGluc3RhbmNlb2YgRHVwbGV4O3RoaXMub2JqZWN0TW9kZT0hIW9wdGlvbnMub2JqZWN0TW9kZTtpZihpc0R1cGxleCl0aGlzLm9iamVjdE1vZGU9dGhpcy5vYmplY3RNb2RlfHwhIW9wdGlvbnMucmVhZGFibGVPYmplY3RNb2RlO3ZhciBod209b3B0aW9ucy5oaWdoV2F0ZXJNYXJrO3ZhciByZWFkYWJsZUh3bT1vcHRpb25zLnJlYWRhYmxlSGlnaFdhdGVyTWFyazt2YXIgZGVmYXVsdEh3bT10aGlzLm9iamVjdE1vZGU/MTY6MTYqMTAyNDtpZihod218fGh3bT09PTApdGhpcy5oaWdoV2F0ZXJNYXJrPWh3bTtlbHNlIGlmKGlzRHVwbGV4JiYocmVhZGFibGVId218fHJlYWRhYmxlSHdtPT09MCkpdGhpcy5oaWdoV2F0ZXJNYXJrPXJlYWRhYmxlSHdtO2Vsc2UgdGhpcy5oaWdoV2F0ZXJNYXJrPWRlZmF1bHRId207dGhpcy5oaWdoV2F0ZXJNYXJrPU1hdGguZmxvb3IodGhpcy5oaWdoV2F0ZXJNYXJrKTt0aGlzLmJ1ZmZlcj1uZXcgQnVmZmVyTGlzdDt0aGlzLmxlbmd0aD0wO3RoaXMucGlwZXM9bnVsbDt0aGlzLnBpcGVzQ291bnQ9MDt0aGlzLmZsb3dpbmc9bnVsbDt0aGlzLmVuZGVkPWZhbHNlO3RoaXMuZW5kRW1pdHRlZD1mYWxzZTt0aGlzLnJlYWRpbmc9ZmFsc2U7dGhpcy5zeW5jPXRydWU7dGhpcy5uZWVkUmVhZGFibGU9ZmFsc2U7dGhpcy5lbWl0dGVkUmVhZGFibGU9ZmFsc2U7dGhpcy5yZWFkYWJsZUxpc3RlbmluZz1mYWxzZTt0aGlzLnJlc3VtZVNjaGVkdWxlZD1mYWxzZTt0aGlzLmRlc3Ryb3llZD1mYWxzZTt0aGlzLmRlZmF1bHRFbmNvZGluZz1vcHRpb25zLmRlZmF1bHRFbmNvZGluZ3x8InV0ZjgiO3RoaXMuYXdhaXREcmFpbj0wO3RoaXMucmVhZGluZ01vcmU9ZmFsc2U7dGhpcy5kZWNvZGVyPW51bGw7dGhpcy5lbmNvZGluZz1udWxsO2lmKG9wdGlvbnMuZW5jb2Rpbmcpe2lmKCFTdHJpbmdEZWNvZGVyKVN0cmluZ0RlY29kZXI9cmVxdWlyZSgic3RyaW5nX2RlY29kZXIvIikuU3RyaW5nRGVjb2Rlcjt0aGlzLmRlY29kZXI9bmV3IFN0cmluZ0RlY29kZXIob3B0aW9ucy5lbmNvZGluZyk7dGhpcy5lbmNvZGluZz1vcHRpb25zLmVuY29kaW5nfX1mdW5jdGlvbiBSZWFkYWJsZShvcHRpb25zKXtEdXBsZXg9RHVwbGV4fHxyZXF1aXJlKCIuL19zdHJlYW1fZHVwbGV4Iik7aWYoISh0aGlzIGluc3RhbmNlb2YgUmVhZGFibGUpKXJldHVybiBuZXcgUmVhZGFibGUob3B0aW9ucyk7dGhpcy5fcmVhZGFibGVTdGF0ZT1uZXcgUmVhZGFibGVTdGF0ZShvcHRpb25zLHRoaXMpO3RoaXMucmVhZGFibGU9dHJ1ZTtpZihvcHRpb25zKXtpZih0eXBlb2Ygb3B0aW9ucy5yZWFkPT09ImZ1bmN0aW9uIil0aGlzLl9yZWFkPW9wdGlvbnMucmVhZDtpZih0eXBlb2Ygb3B0aW9ucy5kZXN0cm95PT09ImZ1bmN0aW9uIil0aGlzLl9kZXN0cm95PW9wdGlvbnMuZGVzdHJveX1TdHJlYW0uY2FsbCh0aGlzKX1PYmplY3QuZGVmaW5lUHJvcGVydHkoUmVhZGFibGUucHJvdG90eXBlLCJkZXN0cm95ZWQiLHtnZXQ6ZnVuY3Rpb24oKXtpZih0aGlzLl9yZWFkYWJsZVN0YXRlPT09dW5kZWZpbmVkKXtyZXR1cm4gZmFsc2V9cmV0dXJuIHRoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkfSxzZXQ6ZnVuY3Rpb24odmFsdWUpe2lmKCF0aGlzLl9yZWFkYWJsZVN0YXRlKXtyZXR1cm59dGhpcy5fcmVhZGFibGVTdGF0ZS5kZXN0cm95ZWQ9dmFsdWV9fSk7UmVhZGFibGUucHJvdG90eXBlLmRlc3Ryb3k9ZGVzdHJveUltcGwuZGVzdHJveTtSZWFkYWJsZS5wcm90b3R5cGUuX3VuZGVzdHJveT1kZXN0cm95SW1wbC51bmRlc3Ryb3k7UmVhZGFibGUucHJvdG90eXBlLl9kZXN0cm95PWZ1bmN0aW9uKGVycixjYil7dGhpcy5wdXNoKG51bGwpO2NiKGVycil9O1JlYWRhYmxlLnByb3RvdHlwZS5wdXNoPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nKXt2YXIgc3RhdGU9dGhpcy5fcmVhZGFibGVTdGF0ZTt2YXIgc2tpcENodW5rQ2hlY2s7aWYoIXN0YXRlLm9iamVjdE1vZGUpe2lmKHR5cGVvZiBjaHVuaz09PSJzdHJpbmciKXtlbmNvZGluZz1lbmNvZGluZ3x8c3RhdGUuZGVmYXVsdEVuY29kaW5nO2lmKGVuY29kaW5nIT09c3RhdGUuZW5jb2Rpbmcpe2NodW5rPUJ1ZmZlci5mcm9tKGNodW5rLGVuY29kaW5nKTtlbmNvZGluZz0iIn1za2lwQ2h1bmtDaGVjaz10cnVlfX1lbHNle3NraXBDaHVua0NoZWNrPXRydWV9cmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcyxjaHVuayxlbmNvZGluZyxmYWxzZSxza2lwQ2h1bmtDaGVjayl9O1JlYWRhYmxlLnByb3RvdHlwZS51bnNoaWZ0PWZ1bmN0aW9uKGNodW5rKXtyZXR1cm4gcmVhZGFibGVBZGRDaHVuayh0aGlzLGNodW5rLG51bGwsdHJ1ZSxmYWxzZSl9O2Z1bmN0aW9uIHJlYWRhYmxlQWRkQ2h1bmsoc3RyZWFtLGNodW5rLGVuY29kaW5nLGFkZFRvRnJvbnQsc2tpcENodW5rQ2hlY2spe3ZhciBzdGF0ZT1zdHJlYW0uX3JlYWRhYmxlU3RhdGU7aWYoY2h1bms9PT1udWxsKXtzdGF0ZS5yZWFkaW5nPWZhbHNlO29uRW9mQ2h1bmsoc3RyZWFtLHN0YXRlKX1lbHNle3ZhciBlcjtpZighc2tpcENodW5rQ2hlY2spZXI9Y2h1bmtJbnZhbGlkKHN0YXRlLGNodW5rKTtpZihlcil7c3RyZWFtLmVtaXQoImVycm9yIixlcil9ZWxzZSBpZihzdGF0ZS5vYmplY3RNb2RlfHxjaHVuayYmY2h1bmsubGVuZ3RoPjApe2lmKHR5cGVvZiBjaHVuayE9PSJzdHJpbmciJiYhc3RhdGUub2JqZWN0TW9kZSYmT2JqZWN0LmdldFByb3RvdHlwZU9mKGNodW5rKSE9PUJ1ZmZlci5wcm90b3R5cGUpe2NodW5rPV91aW50OEFycmF5VG9CdWZmZXIoY2h1bmspfWlmKGFkZFRvRnJvbnQpe2lmKHN0YXRlLmVuZEVtaXR0ZWQpc3RyZWFtLmVtaXQoImVycm9yIixuZXcgRXJyb3IoInN0cmVhbS51bnNoaWZ0KCkgYWZ0ZXIgZW5kIGV2ZW50IikpO2Vsc2UgYWRkQ2h1bmsoc3RyZWFtLHN0YXRlLGNodW5rLHRydWUpfWVsc2UgaWYoc3RhdGUuZW5kZWQpe3N0cmVhbS5lbWl0KCJlcnJvciIsbmV3IEVycm9yKCJzdHJlYW0ucHVzaCgpIGFmdGVyIEVPRiIpKX1lbHNle3N0YXRlLnJlYWRpbmc9ZmFsc2U7aWYoc3RhdGUuZGVjb2RlciYmIWVuY29kaW5nKXtjaHVuaz1zdGF0ZS5kZWNvZGVyLndyaXRlKGNodW5rKTtpZihzdGF0ZS5vYmplY3RNb2RlfHxjaHVuay5sZW5ndGghPT0wKWFkZENodW5rKHN0cmVhbSxzdGF0ZSxjaHVuayxmYWxzZSk7ZWxzZSBtYXliZVJlYWRNb3JlKHN0cmVhbSxzdGF0ZSl9ZWxzZXthZGRDaHVuayhzdHJlYW0sc3RhdGUsY2h1bmssZmFsc2UpfX19ZWxzZSBpZighYWRkVG9Gcm9udCl7c3RhdGUucmVhZGluZz1mYWxzZX19cmV0dXJuIG5lZWRNb3JlRGF0YShzdGF0ZSl9ZnVuY3Rpb24gYWRkQ2h1bmsoc3RyZWFtLHN0YXRlLGNodW5rLGFkZFRvRnJvbnQpe2lmKHN0YXRlLmZsb3dpbmcmJnN0YXRlLmxlbmd0aD09PTAmJiFzdGF0ZS5zeW5jKXtzdHJlYW0uZW1pdCgiZGF0YSIsY2h1bmspO3N0cmVhbS5yZWFkKDApfWVsc2V7c3RhdGUubGVuZ3RoKz1zdGF0ZS5vYmplY3RNb2RlPzE6Y2h1bmsubGVuZ3RoO2lmKGFkZFRvRnJvbnQpc3RhdGUuYnVmZmVyLnVuc2hpZnQoY2h1bmspO2Vsc2Ugc3RhdGUuYnVmZmVyLnB1c2goY2h1bmspO2lmKHN0YXRlLm5lZWRSZWFkYWJsZSllbWl0UmVhZGFibGUoc3RyZWFtKX1tYXliZVJlYWRNb3JlKHN0cmVhbSxzdGF0ZSl9ZnVuY3Rpb24gY2h1bmtJbnZhbGlkKHN0YXRlLGNodW5rKXt2YXIgZXI7aWYoIV9pc1VpbnQ4QXJyYXkoY2h1bmspJiZ0eXBlb2YgY2h1bmshPT0ic3RyaW5nIiYmY2h1bmshPT11bmRlZmluZWQmJiFzdGF0ZS5vYmplY3RNb2RlKXtlcj1uZXcgVHlwZUVycm9yKCJJbnZhbGlkIG5vbi1zdHJpbmcvYnVmZmVyIGNodW5rIil9cmV0dXJuIGVyfWZ1bmN0aW9uIG5lZWRNb3JlRGF0YShzdGF0ZSl7cmV0dXJuIXN0YXRlLmVuZGVkJiYoc3RhdGUubmVlZFJlYWRhYmxlfHxzdGF0ZS5sZW5ndGg8c3RhdGUuaGlnaFdhdGVyTWFya3x8c3RhdGUubGVuZ3RoPT09MCl9UmVhZGFibGUucHJvdG90eXBlLmlzUGF1c2VkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZz09PWZhbHNlfTtSZWFkYWJsZS5wcm90b3R5cGUuc2V0RW5jb2Rpbmc9ZnVuY3Rpb24oZW5jKXtpZighU3RyaW5nRGVjb2RlcilTdHJpbmdEZWNvZGVyPXJlcXVpcmUoInN0cmluZ19kZWNvZGVyLyIpLlN0cmluZ0RlY29kZXI7dGhpcy5fcmVhZGFibGVTdGF0ZS5kZWNvZGVyPW5ldyBTdHJpbmdEZWNvZGVyKGVuYyk7dGhpcy5fcmVhZGFibGVTdGF0ZS5lbmNvZGluZz1lbmM7cmV0dXJuIHRoaXN9O3ZhciBNQVhfSFdNPTgzODg2MDg7ZnVuY3Rpb24gY29tcHV0ZU5ld0hpZ2hXYXRlck1hcmsobil7aWYobj49TUFYX0hXTSl7bj1NQVhfSFdNfWVsc2V7bi0tO258PW4+Pj4xO258PW4+Pj4yO258PW4+Pj40O258PW4+Pj44O258PW4+Pj4xNjtuKyt9cmV0dXJuIG59ZnVuY3Rpb24gaG93TXVjaFRvUmVhZChuLHN0YXRlKXtpZihuPD0wfHxzdGF0ZS5sZW5ndGg9PT0wJiZzdGF0ZS5lbmRlZClyZXR1cm4gMDtpZihzdGF0ZS5vYmplY3RNb2RlKXJldHVybiAxO2lmKG4hPT1uKXtpZihzdGF0ZS5mbG93aW5nJiZzdGF0ZS5sZW5ndGgpcmV0dXJuIHN0YXRlLmJ1ZmZlci5oZWFkLmRhdGEubGVuZ3RoO2Vsc2UgcmV0dXJuIHN0YXRlLmxlbmd0aH1pZihuPnN0YXRlLmhpZ2hXYXRlck1hcmspc3RhdGUuaGlnaFdhdGVyTWFyaz1jb21wdXRlTmV3SGlnaFdhdGVyTWFyayhuKTtpZihuPD1zdGF0ZS5sZW5ndGgpcmV0dXJuIG47aWYoIXN0YXRlLmVuZGVkKXtzdGF0ZS5uZWVkUmVhZGFibGU9dHJ1ZTtyZXR1cm4gMH1yZXR1cm4gc3RhdGUubGVuZ3RofVJlYWRhYmxlLnByb3RvdHlwZS5yZWFkPWZ1bmN0aW9uKG4pe2RlYnVnKCJyZWFkIixuKTtuPXBhcnNlSW50KG4sMTApO3ZhciBzdGF0ZT10aGlzLl9yZWFkYWJsZVN0YXRlO3ZhciBuT3JpZz1uO2lmKG4hPT0wKXN0YXRlLmVtaXR0ZWRSZWFkYWJsZT1mYWxzZTtpZihuPT09MCYmc3RhdGUubmVlZFJlYWRhYmxlJiYoc3RhdGUubGVuZ3RoPj1zdGF0ZS5oaWdoV2F0ZXJNYXJrfHxzdGF0ZS5lbmRlZCkpe2RlYnVnKCJyZWFkOiBlbWl0UmVhZGFibGUiLHN0YXRlLmxlbmd0aCxzdGF0ZS5lbmRlZCk7aWYoc3RhdGUubGVuZ3RoPT09MCYmc3RhdGUuZW5kZWQpZW5kUmVhZGFibGUodGhpcyk7ZWxzZSBlbWl0UmVhZGFibGUodGhpcyk7cmV0dXJuIG51bGx9bj1ob3dNdWNoVG9SZWFkKG4sc3RhdGUpO2lmKG49PT0wJiZzdGF0ZS5lbmRlZCl7aWYoc3RhdGUubGVuZ3RoPT09MCllbmRSZWFkYWJsZSh0aGlzKTtyZXR1cm4gbnVsbH12YXIgZG9SZWFkPXN0YXRlLm5lZWRSZWFkYWJsZTtkZWJ1ZygibmVlZCByZWFkYWJsZSIsZG9SZWFkKTtpZihzdGF0ZS5sZW5ndGg9PT0wfHxzdGF0ZS5sZW5ndGgtbjxzdGF0ZS5oaWdoV2F0ZXJNYXJrKXtkb1JlYWQ9dHJ1ZTtkZWJ1ZygibGVuZ3RoIGxlc3MgdGhhbiB3YXRlcm1hcmsiLGRvUmVhZCl9aWYoc3RhdGUuZW5kZWR8fHN0YXRlLnJlYWRpbmcpe2RvUmVhZD1mYWxzZTtkZWJ1ZygicmVhZGluZyBvciBlbmRlZCIsZG9SZWFkKX1lbHNlIGlmKGRvUmVhZCl7ZGVidWcoImRvIHJlYWQiKTtzdGF0ZS5yZWFkaW5nPXRydWU7c3RhdGUuc3luYz10cnVlO2lmKHN0YXRlLmxlbmd0aD09PTApc3RhdGUubmVlZFJlYWRhYmxlPXRydWU7dGhpcy5fcmVhZChzdGF0ZS5oaWdoV2F0ZXJNYXJrKTtzdGF0ZS5zeW5jPWZhbHNlO2lmKCFzdGF0ZS5yZWFkaW5nKW49aG93TXVjaFRvUmVhZChuT3JpZyxzdGF0ZSl9dmFyIHJldDtpZihuPjApcmV0PWZyb21MaXN0KG4sc3RhdGUpO2Vsc2UgcmV0PW51bGw7aWYocmV0PT09bnVsbCl7c3RhdGUubmVlZFJlYWRhYmxlPXRydWU7bj0wfWVsc2V7c3RhdGUubGVuZ3RoLT1ufWlmKHN0YXRlLmxlbmd0aD09PTApe2lmKCFzdGF0ZS5lbmRlZClzdGF0ZS5uZWVkUmVhZGFibGU9dHJ1ZTtpZihuT3JpZyE9PW4mJnN0YXRlLmVuZGVkKWVuZFJlYWRhYmxlKHRoaXMpfWlmKHJldCE9PW51bGwpdGhpcy5lbWl0KCJkYXRhIixyZXQpO3JldHVybiByZXR9O2Z1bmN0aW9uIG9uRW9mQ2h1bmsoc3RyZWFtLHN0YXRlKXtpZihzdGF0ZS5lbmRlZClyZXR1cm47aWYoc3RhdGUuZGVjb2Rlcil7dmFyIGNodW5rPXN0YXRlLmRlY29kZXIuZW5kKCk7aWYoY2h1bmsmJmNodW5rLmxlbmd0aCl7c3RhdGUuYnVmZmVyLnB1c2goY2h1bmspO3N0YXRlLmxlbmd0aCs9c3RhdGUub2JqZWN0TW9kZT8xOmNodW5rLmxlbmd0aH19c3RhdGUuZW5kZWQ9dHJ1ZTtlbWl0UmVhZGFibGUoc3RyZWFtKX1mdW5jdGlvbiBlbWl0UmVhZGFibGUoc3RyZWFtKXt2YXIgc3RhdGU9c3RyZWFtLl9yZWFkYWJsZVN0YXRlO3N0YXRlLm5lZWRSZWFkYWJsZT1mYWxzZTtpZighc3RhdGUuZW1pdHRlZFJlYWRhYmxlKXtkZWJ1ZygiZW1pdFJlYWRhYmxlIixzdGF0ZS5mbG93aW5nKTtzdGF0ZS5lbWl0dGVkUmVhZGFibGU9dHJ1ZTtpZihzdGF0ZS5zeW5jKXBuYS5uZXh0VGljayhlbWl0UmVhZGFibGVfLHN0cmVhbSk7ZWxzZSBlbWl0UmVhZGFibGVfKHN0cmVhbSl9fWZ1bmN0aW9uIGVtaXRSZWFkYWJsZV8oc3RyZWFtKXtkZWJ1ZygiZW1pdCByZWFkYWJsZSIpO3N0cmVhbS5lbWl0KCJyZWFkYWJsZSIpO2Zsb3coc3RyZWFtKX1mdW5jdGlvbiBtYXliZVJlYWRNb3JlKHN0cmVhbSxzdGF0ZSl7aWYoIXN0YXRlLnJlYWRpbmdNb3JlKXtzdGF0ZS5yZWFkaW5nTW9yZT10cnVlO3BuYS5uZXh0VGljayhtYXliZVJlYWRNb3JlXyxzdHJlYW0sc3RhdGUpfX1mdW5jdGlvbiBtYXliZVJlYWRNb3JlXyhzdHJlYW0sc3RhdGUpe3ZhciBsZW49c3RhdGUubGVuZ3RoO3doaWxlKCFzdGF0ZS5yZWFkaW5nJiYhc3RhdGUuZmxvd2luZyYmIXN0YXRlLmVuZGVkJiZzdGF0ZS5sZW5ndGg8c3RhdGUuaGlnaFdhdGVyTWFyayl7ZGVidWcoIm1heWJlUmVhZE1vcmUgcmVhZCAwIik7c3RyZWFtLnJlYWQoMCk7aWYobGVuPT09c3RhdGUubGVuZ3RoKWJyZWFrO2Vsc2UgbGVuPXN0YXRlLmxlbmd0aH1zdGF0ZS5yZWFkaW5nTW9yZT1mYWxzZX1SZWFkYWJsZS5wcm90b3R5cGUuX3JlYWQ9ZnVuY3Rpb24obil7dGhpcy5lbWl0KCJlcnJvciIsbmV3IEVycm9yKCJfcmVhZCgpIGlzIG5vdCBpbXBsZW1lbnRlZCIpKX07UmVhZGFibGUucHJvdG90eXBlLnBpcGU9ZnVuY3Rpb24oZGVzdCxwaXBlT3B0cyl7dmFyIHNyYz10aGlzO3ZhciBzdGF0ZT10aGlzLl9yZWFkYWJsZVN0YXRlO3N3aXRjaChzdGF0ZS5waXBlc0NvdW50KXtjYXNlIDA6c3RhdGUucGlwZXM9ZGVzdDticmVhaztjYXNlIDE6c3RhdGUucGlwZXM9W3N0YXRlLnBpcGVzLGRlc3RdO2JyZWFrO2RlZmF1bHQ6c3RhdGUucGlwZXMucHVzaChkZXN0KTticmVha31zdGF0ZS5waXBlc0NvdW50Kz0xO2RlYnVnKCJwaXBlIGNvdW50PSVkIG9wdHM9JWoiLHN0YXRlLnBpcGVzQ291bnQscGlwZU9wdHMpO3ZhciBkb0VuZD0oIXBpcGVPcHRzfHxwaXBlT3B0cy5lbmQhPT1mYWxzZSkmJmRlc3QhPT1wcm9jZXNzLnN0ZG91dCYmZGVzdCE9PXByb2Nlc3Muc3RkZXJyO3ZhciBlbmRGbj1kb0VuZD9vbmVuZDp1bnBpcGU7aWYoc3RhdGUuZW5kRW1pdHRlZClwbmEubmV4dFRpY2soZW5kRm4pO2Vsc2Ugc3JjLm9uY2UoImVuZCIsZW5kRm4pO2Rlc3Qub24oInVucGlwZSIsb251bnBpcGUpO2Z1bmN0aW9uIG9udW5waXBlKHJlYWRhYmxlLHVucGlwZUluZm8pe2RlYnVnKCJvbnVucGlwZSIpO2lmKHJlYWRhYmxlPT09c3JjKXtpZih1bnBpcGVJbmZvJiZ1bnBpcGVJbmZvLmhhc1VucGlwZWQ9PT1mYWxzZSl7dW5waXBlSW5mby5oYXNVbnBpcGVkPXRydWU7Y2xlYW51cCgpfX19ZnVuY3Rpb24gb25lbmQoKXtkZWJ1Zygib25lbmQiKTtkZXN0LmVuZCgpfXZhciBvbmRyYWluPXBpcGVPbkRyYWluKHNyYyk7ZGVzdC5vbigiZHJhaW4iLG9uZHJhaW4pO3ZhciBjbGVhbmVkVXA9ZmFsc2U7ZnVuY3Rpb24gY2xlYW51cCgpe2RlYnVnKCJjbGVhbnVwIik7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiY2xvc2UiLG9uY2xvc2UpO2Rlc3QucmVtb3ZlTGlzdGVuZXIoImZpbmlzaCIsb25maW5pc2gpO2Rlc3QucmVtb3ZlTGlzdGVuZXIoImRyYWluIixvbmRyYWluKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJlcnJvciIsb25lcnJvcik7ZGVzdC5yZW1vdmVMaXN0ZW5lcigidW5waXBlIixvbnVucGlwZSk7c3JjLnJlbW92ZUxpc3RlbmVyKCJlbmQiLG9uZW5kKTtzcmMucmVtb3ZlTGlzdGVuZXIoImVuZCIsdW5waXBlKTtzcmMucmVtb3ZlTGlzdGVuZXIoImRhdGEiLG9uZGF0YSk7Y2xlYW5lZFVwPXRydWU7aWYoc3RhdGUuYXdhaXREcmFpbiYmKCFkZXN0Ll93cml0YWJsZVN0YXRlfHxkZXN0Ll93cml0YWJsZVN0YXRlLm5lZWREcmFpbikpb25kcmFpbigpfXZhciBpbmNyZWFzZWRBd2FpdERyYWluPWZhbHNlO3NyYy5vbigiZGF0YSIsb25kYXRhKTtmdW5jdGlvbiBvbmRhdGEoY2h1bmspe2RlYnVnKCJvbmRhdGEiKTtpbmNyZWFzZWRBd2FpdERyYWluPWZhbHNlO3ZhciByZXQ9ZGVzdC53cml0ZShjaHVuayk7aWYoZmFsc2U9PT1yZXQmJiFpbmNyZWFzZWRBd2FpdERyYWluKXtpZigoc3RhdGUucGlwZXNDb3VudD09PTEmJnN0YXRlLnBpcGVzPT09ZGVzdHx8c3RhdGUucGlwZXNDb3VudD4xJiZpbmRleE9mKHN0YXRlLnBpcGVzLGRlc3QpIT09LTEpJiYhY2xlYW5lZFVwKXtkZWJ1ZygiZmFsc2Ugd3JpdGUgcmVzcG9uc2UsIHBhdXNlIixzcmMuX3JlYWRhYmxlU3RhdGUuYXdhaXREcmFpbik7c3JjLl9yZWFkYWJsZVN0YXRlLmF3YWl0RHJhaW4rKztpbmNyZWFzZWRBd2FpdERyYWluPXRydWV9c3JjLnBhdXNlKCl9fWZ1bmN0aW9uIG9uZXJyb3IoZXIpe2RlYnVnKCJvbmVycm9yIixlcik7dW5waXBlKCk7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiZXJyb3IiLG9uZXJyb3IpO2lmKEVFbGlzdGVuZXJDb3VudChkZXN0LCJlcnJvciIpPT09MClkZXN0LmVtaXQoImVycm9yIixlcil9cHJlcGVuZExpc3RlbmVyKGRlc3QsImVycm9yIixvbmVycm9yKTtmdW5jdGlvbiBvbmNsb3NlKCl7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiZmluaXNoIixvbmZpbmlzaCk7dW5waXBlKCl9ZGVzdC5vbmNlKCJjbG9zZSIsb25jbG9zZSk7ZnVuY3Rpb24gb25maW5pc2goKXtkZWJ1Zygib25maW5pc2giKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJjbG9zZSIsb25jbG9zZSk7dW5waXBlKCl9ZGVzdC5vbmNlKCJmaW5pc2giLG9uZmluaXNoKTtmdW5jdGlvbiB1bnBpcGUoKXtkZWJ1ZygidW5waXBlIik7c3JjLnVucGlwZShkZXN0KX1kZXN0LmVtaXQoInBpcGUiLHNyYyk7aWYoIXN0YXRlLmZsb3dpbmcpe2RlYnVnKCJwaXBlIHJlc3VtZSIpO3NyYy5yZXN1bWUoKX1yZXR1cm4gZGVzdH07ZnVuY3Rpb24gcGlwZU9uRHJhaW4oc3JjKXtyZXR1cm4gZnVuY3Rpb24oKXt2YXIgc3RhdGU9c3JjLl9yZWFkYWJsZVN0YXRlO2RlYnVnKCJwaXBlT25EcmFpbiIsc3RhdGUuYXdhaXREcmFpbik7aWYoc3RhdGUuYXdhaXREcmFpbilzdGF0ZS5hd2FpdERyYWluLS07aWYoc3RhdGUuYXdhaXREcmFpbj09PTAmJkVFbGlzdGVuZXJDb3VudChzcmMsImRhdGEiKSl7c3RhdGUuZmxvd2luZz10cnVlO2Zsb3coc3JjKX19fVJlYWRhYmxlLnByb3RvdHlwZS51bnBpcGU9ZnVuY3Rpb24oZGVzdCl7dmFyIHN0YXRlPXRoaXMuX3JlYWRhYmxlU3RhdGU7dmFyIHVucGlwZUluZm89e2hhc1VucGlwZWQ6ZmFsc2V9O2lmKHN0YXRlLnBpcGVzQ291bnQ9PT0wKXJldHVybiB0aGlzO2lmKHN0YXRlLnBpcGVzQ291bnQ9PT0xKXtpZihkZXN0JiZkZXN0IT09c3RhdGUucGlwZXMpcmV0dXJuIHRoaXM7aWYoIWRlc3QpZGVzdD1zdGF0ZS5waXBlcztzdGF0ZS5waXBlcz1udWxsO3N0YXRlLnBpcGVzQ291bnQ9MDtzdGF0ZS5mbG93aW5nPWZhbHNlO2lmKGRlc3QpZGVzdC5lbWl0KCJ1bnBpcGUiLHRoaXMsdW5waXBlSW5mbyk7cmV0dXJuIHRoaXN9aWYoIWRlc3Qpe3ZhciBkZXN0cz1zdGF0ZS5waXBlczt2YXIgbGVuPXN0YXRlLnBpcGVzQ291bnQ7c3RhdGUucGlwZXM9bnVsbDtzdGF0ZS5waXBlc0NvdW50PTA7c3RhdGUuZmxvd2luZz1mYWxzZTtmb3IodmFyIGk9MDtpPGxlbjtpKyspe2Rlc3RzW2ldLmVtaXQoInVucGlwZSIsdGhpcyx1bnBpcGVJbmZvKX1yZXR1cm4gdGhpc312YXIgaW5kZXg9aW5kZXhPZihzdGF0ZS5waXBlcyxkZXN0KTtpZihpbmRleD09PS0xKXJldHVybiB0aGlzO3N0YXRlLnBpcGVzLnNwbGljZShpbmRleCwxKTtzdGF0ZS5waXBlc0NvdW50LT0xO2lmKHN0YXRlLnBpcGVzQ291bnQ9PT0xKXN0YXRlLnBpcGVzPXN0YXRlLnBpcGVzWzBdO2Rlc3QuZW1pdCgidW5waXBlIix0aGlzLHVucGlwZUluZm8pO3JldHVybiB0aGlzfTtSZWFkYWJsZS5wcm90b3R5cGUub249ZnVuY3Rpb24oZXYsZm4pe3ZhciByZXM9U3RyZWFtLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsZXYsZm4pO2lmKGV2PT09ImRhdGEiKXtpZih0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmchPT1mYWxzZSl0aGlzLnJlc3VtZSgpfWVsc2UgaWYoZXY9PT0icmVhZGFibGUiKXt2YXIgc3RhdGU9dGhpcy5fcmVhZGFibGVTdGF0ZTtpZighc3RhdGUuZW5kRW1pdHRlZCYmIXN0YXRlLnJlYWRhYmxlTGlzdGVuaW5nKXtzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZz1zdGF0ZS5uZWVkUmVhZGFibGU9dHJ1ZTtzdGF0ZS5lbWl0dGVkUmVhZGFibGU9ZmFsc2U7aWYoIXN0YXRlLnJlYWRpbmcpe3BuYS5uZXh0VGljayhuUmVhZGluZ05leHRUaWNrLHRoaXMpfWVsc2UgaWYoc3RhdGUubGVuZ3RoKXtlbWl0UmVhZGFibGUodGhpcyl9fX1yZXR1cm4gcmVzfTtSZWFkYWJsZS5wcm90b3R5cGUuYWRkTGlzdGVuZXI9UmVhZGFibGUucHJvdG90eXBlLm9uO2Z1bmN0aW9uIG5SZWFkaW5nTmV4dFRpY2soc2VsZil7ZGVidWcoInJlYWRhYmxlIG5leHR0aWNrIHJlYWQgMCIpO3NlbGYucmVhZCgwKX1SZWFkYWJsZS5wcm90b3R5cGUucmVzdW1lPWZ1bmN0aW9uKCl7dmFyIHN0YXRlPXRoaXMuX3JlYWRhYmxlU3RhdGU7aWYoIXN0YXRlLmZsb3dpbmcpe2RlYnVnKCJyZXN1bWUiKTtzdGF0ZS5mbG93aW5nPXRydWU7cmVzdW1lKHRoaXMsc3RhdGUpfXJldHVybiB0aGlzfTtmdW5jdGlvbiByZXN1bWUoc3RyZWFtLHN0YXRlKXtpZighc3RhdGUucmVzdW1lU2NoZWR1bGVkKXtzdGF0ZS5yZXN1bWVTY2hlZHVsZWQ9dHJ1ZTtwbmEubmV4dFRpY2socmVzdW1lXyxzdHJlYW0sc3RhdGUpfX1mdW5jdGlvbiByZXN1bWVfKHN0cmVhbSxzdGF0ZSl7aWYoIXN0YXRlLnJlYWRpbmcpe2RlYnVnKCJyZXN1bWUgcmVhZCAwIik7c3RyZWFtLnJlYWQoMCl9c3RhdGUucmVzdW1lU2NoZWR1bGVkPWZhbHNlO3N0YXRlLmF3YWl0RHJhaW49MDtzdHJlYW0uZW1pdCgicmVzdW1lIik7ZmxvdyhzdHJlYW0pO2lmKHN0YXRlLmZsb3dpbmcmJiFzdGF0ZS5yZWFkaW5nKXN0cmVhbS5yZWFkKDApfVJlYWRhYmxlLnByb3RvdHlwZS5wYXVzZT1mdW5jdGlvbigpe2RlYnVnKCJjYWxsIHBhdXNlIGZsb3dpbmc9JWoiLHRoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZyk7aWYoZmFsc2UhPT10aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmcpe2RlYnVnKCJwYXVzZSIpO3RoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZz1mYWxzZTt0aGlzLmVtaXQoInBhdXNlIil9cmV0dXJuIHRoaXN9O2Z1bmN0aW9uIGZsb3coc3RyZWFtKXt2YXIgc3RhdGU9c3RyZWFtLl9yZWFkYWJsZVN0YXRlO2RlYnVnKCJmbG93IixzdGF0ZS5mbG93aW5nKTt3aGlsZShzdGF0ZS5mbG93aW5nJiZzdHJlYW0ucmVhZCgpIT09bnVsbCl7fX1SZWFkYWJsZS5wcm90b3R5cGUud3JhcD1mdW5jdGlvbihzdHJlYW0pe3ZhciBfdGhpcz10aGlzO3ZhciBzdGF0ZT10aGlzLl9yZWFkYWJsZVN0YXRlO3ZhciBwYXVzZWQ9ZmFsc2U7c3RyZWFtLm9uKCJlbmQiLGZ1bmN0aW9uKCl7ZGVidWcoIndyYXBwZWQgZW5kIik7aWYoc3RhdGUuZGVjb2RlciYmIXN0YXRlLmVuZGVkKXt2YXIgY2h1bms9c3RhdGUuZGVjb2Rlci5lbmQoKTtpZihjaHVuayYmY2h1bmsubGVuZ3RoKV90aGlzLnB1c2goY2h1bmspfV90aGlzLnB1c2gobnVsbCl9KTtzdHJlYW0ub24oImRhdGEiLGZ1bmN0aW9uKGNodW5rKXtkZWJ1Zygid3JhcHBlZCBkYXRhIik7aWYoc3RhdGUuZGVjb2RlciljaHVuaz1zdGF0ZS5kZWNvZGVyLndyaXRlKGNodW5rKTtpZihzdGF0ZS5vYmplY3RNb2RlJiYoY2h1bms9PT1udWxsfHxjaHVuaz09PXVuZGVmaW5lZCkpcmV0dXJuO2Vsc2UgaWYoIXN0YXRlLm9iamVjdE1vZGUmJighY2h1bmt8fCFjaHVuay5sZW5ndGgpKXJldHVybjt2YXIgcmV0PV90aGlzLnB1c2goY2h1bmspO2lmKCFyZXQpe3BhdXNlZD10cnVlO3N0cmVhbS5wYXVzZSgpfX0pO2Zvcih2YXIgaSBpbiBzdHJlYW0pe2lmKHRoaXNbaV09PT11bmRlZmluZWQmJnR5cGVvZiBzdHJlYW1baV09PT0iZnVuY3Rpb24iKXt0aGlzW2ldPWZ1bmN0aW9uKG1ldGhvZCl7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIHN0cmVhbVttZXRob2RdLmFwcGx5KHN0cmVhbSxhcmd1bWVudHMpfX0oaSl9fWZvcih2YXIgbj0wO248a1Byb3h5RXZlbnRzLmxlbmd0aDtuKyspe3N0cmVhbS5vbihrUHJveHlFdmVudHNbbl0sdGhpcy5lbWl0LmJpbmQodGhpcyxrUHJveHlFdmVudHNbbl0pKX10aGlzLl9yZWFkPWZ1bmN0aW9uKG4pe2RlYnVnKCJ3cmFwcGVkIF9yZWFkIixuKTtpZihwYXVzZWQpe3BhdXNlZD1mYWxzZTtzdHJlYW0ucmVzdW1lKCl9fTtyZXR1cm4gdGhpc307T2JqZWN0LmRlZmluZVByb3BlcnR5KFJlYWRhYmxlLnByb3RvdHlwZSwicmVhZGFibGVIaWdoV2F0ZXJNYXJrIix7ZW51bWVyYWJsZTpmYWxzZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fcmVhZGFibGVTdGF0ZS5oaWdoV2F0ZXJNYXJrfX0pO1JlYWRhYmxlLl9mcm9tTGlzdD1mcm9tTGlzdDtmdW5jdGlvbiBmcm9tTGlzdChuLHN0YXRlKXtpZihzdGF0ZS5sZW5ndGg9PT0wKXJldHVybiBudWxsO3ZhciByZXQ7aWYoc3RhdGUub2JqZWN0TW9kZSlyZXQ9c3RhdGUuYnVmZmVyLnNoaWZ0KCk7ZWxzZSBpZighbnx8bj49c3RhdGUubGVuZ3RoKXtpZihzdGF0ZS5kZWNvZGVyKXJldD1zdGF0ZS5idWZmZXIuam9pbigiIik7ZWxzZSBpZihzdGF0ZS5idWZmZXIubGVuZ3RoPT09MSlyZXQ9c3RhdGUuYnVmZmVyLmhlYWQuZGF0YTtlbHNlIHJldD1zdGF0ZS5idWZmZXIuY29uY2F0KHN0YXRlLmxlbmd0aCk7c3RhdGUuYnVmZmVyLmNsZWFyKCl9ZWxzZXtyZXQ9ZnJvbUxpc3RQYXJ0aWFsKG4sc3RhdGUuYnVmZmVyLHN0YXRlLmRlY29kZXIpfXJldHVybiByZXR9ZnVuY3Rpb24gZnJvbUxpc3RQYXJ0aWFsKG4sbGlzdCxoYXNTdHJpbmdzKXt2YXIgcmV0O2lmKG48bGlzdC5oZWFkLmRhdGEubGVuZ3RoKXtyZXQ9bGlzdC5oZWFkLmRhdGEuc2xpY2UoMCxuKTtsaXN0LmhlYWQuZGF0YT1saXN0LmhlYWQuZGF0YS5zbGljZShuKX1lbHNlIGlmKG49PT1saXN0LmhlYWQuZGF0YS5sZW5ndGgpe3JldD1saXN0LnNoaWZ0KCl9ZWxzZXtyZXQ9aGFzU3RyaW5ncz9jb3B5RnJvbUJ1ZmZlclN0cmluZyhuLGxpc3QpOmNvcHlGcm9tQnVmZmVyKG4sbGlzdCl9cmV0dXJuIHJldH1mdW5jdGlvbiBjb3B5RnJvbUJ1ZmZlclN0cmluZyhuLGxpc3Qpe3ZhciBwPWxpc3QuaGVhZDt2YXIgYz0xO3ZhciByZXQ9cC5kYXRhO24tPXJldC5sZW5ndGg7d2hpbGUocD1wLm5leHQpe3ZhciBzdHI9cC5kYXRhO3ZhciBuYj1uPnN0ci5sZW5ndGg/c3RyLmxlbmd0aDpuO2lmKG5iPT09c3RyLmxlbmd0aClyZXQrPXN0cjtlbHNlIHJldCs9c3RyLnNsaWNlKDAsbik7bi09bmI7aWYobj09PTApe2lmKG5iPT09c3RyLmxlbmd0aCl7KytjO2lmKHAubmV4dClsaXN0LmhlYWQ9cC5uZXh0O2Vsc2UgbGlzdC5oZWFkPWxpc3QudGFpbD1udWxsfWVsc2V7bGlzdC5oZWFkPXA7cC5kYXRhPXN0ci5zbGljZShuYil9YnJlYWt9KytjfWxpc3QubGVuZ3RoLT1jO3JldHVybiByZXR9ZnVuY3Rpb24gY29weUZyb21CdWZmZXIobixsaXN0KXt2YXIgcmV0PUJ1ZmZlci5hbGxvY1Vuc2FmZShuKTt2YXIgcD1saXN0LmhlYWQ7dmFyIGM9MTtwLmRhdGEuY29weShyZXQpO24tPXAuZGF0YS5sZW5ndGg7d2hpbGUocD1wLm5leHQpe3ZhciBidWY9cC5kYXRhO3ZhciBuYj1uPmJ1Zi5sZW5ndGg/YnVmLmxlbmd0aDpuO2J1Zi5jb3B5KHJldCxyZXQubGVuZ3RoLW4sMCxuYik7bi09bmI7aWYobj09PTApe2lmKG5iPT09YnVmLmxlbmd0aCl7KytjO2lmKHAubmV4dClsaXN0LmhlYWQ9cC5uZXh0O2Vsc2UgbGlzdC5oZWFkPWxpc3QudGFpbD1udWxsfWVsc2V7bGlzdC5oZWFkPXA7cC5kYXRhPWJ1Zi5zbGljZShuYil9YnJlYWt9KytjfWxpc3QubGVuZ3RoLT1jO3JldHVybiByZXR9ZnVuY3Rpb24gZW5kUmVhZGFibGUoc3RyZWFtKXt2YXIgc3RhdGU9c3RyZWFtLl9yZWFkYWJsZVN0YXRlO2lmKHN0YXRlLmxlbmd0aD4wKXRocm93IG5ldyBFcnJvcignImVuZFJlYWRhYmxlKCkiIGNhbGxlZCBvbiBub24tZW1wdHkgc3RyZWFtJyk7aWYoIXN0YXRlLmVuZEVtaXR0ZWQpe3N0YXRlLmVuZGVkPXRydWU7cG5hLm5leHRUaWNrKGVuZFJlYWRhYmxlTlQsc3RhdGUsc3RyZWFtKX19ZnVuY3Rpb24gZW5kUmVhZGFibGVOVChzdGF0ZSxzdHJlYW0pe2lmKCFzdGF0ZS5lbmRFbWl0dGVkJiZzdGF0ZS5sZW5ndGg9PT0wKXtzdGF0ZS5lbmRFbWl0dGVkPXRydWU7c3RyZWFtLnJlYWRhYmxlPWZhbHNlO3N0cmVhbS5lbWl0KCJlbmQiKX19ZnVuY3Rpb24gaW5kZXhPZih4cyx4KXtmb3IodmFyIGk9MCxsPXhzLmxlbmd0aDtpPGw7aSsrKXtpZih4c1tpXT09PXgpcmV0dXJuIGl9cmV0dXJuLTF9fSkuY2FsbCh0aGlzLHJlcXVpcmUoIl9wcm9jZXNzIiksdHlwZW9mIGdsb2JhbCE9PSJ1bmRlZmluZWQiP2dsb2JhbDp0eXBlb2Ygc2VsZiE9PSJ1bmRlZmluZWQiP3NlbGY6dHlwZW9mIHdpbmRvdyE9PSJ1bmRlZmluZWQiP3dpbmRvdzp7fSl9LHsiLi9fc3RyZWFtX2R1cGxleCI6NjgsIi4vaW50ZXJuYWwvc3RyZWFtcy9CdWZmZXJMaXN0Ijo3MywiLi9pbnRlcm5hbC9zdHJlYW1zL2Rlc3Ryb3kiOjc0LCIuL2ludGVybmFsL3N0cmVhbXMvc3RyZWFtIjo3NSxfcHJvY2Vzczo2NiwiY29yZS11dGlsLWlzIjozMCxldmVudHM6MzMsaW5oZXJpdHM6MzYsaXNhcnJheTozOCwicHJvY2Vzcy1uZXh0aWNrLWFyZ3MiOjY1LCJzYWZlLWJ1ZmZlciI6NzYsInN0cmluZ19kZWNvZGVyLyI6MTAyLHV0aWw6MjZ9XSw3MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO21vZHVsZS5leHBvcnRzPVRyYW5zZm9ybTt2YXIgRHVwbGV4PXJlcXVpcmUoIi4vX3N0cmVhbV9kdXBsZXgiKTt2YXIgdXRpbD1yZXF1aXJlKCJjb3JlLXV0aWwtaXMiKTt1dGlsLmluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dXRpbC5pbmhlcml0cyhUcmFuc2Zvcm0sRHVwbGV4KTtmdW5jdGlvbiBhZnRlclRyYW5zZm9ybShlcixkYXRhKXt2YXIgdHM9dGhpcy5fdHJhbnNmb3JtU3RhdGU7dHMudHJhbnNmb3JtaW5nPWZhbHNlO3ZhciBjYj10cy53cml0ZWNiO2lmKCFjYil7cmV0dXJuIHRoaXMuZW1pdCgiZXJyb3IiLG5ldyBFcnJvcigid3JpdGUgY2FsbGJhY2sgY2FsbGVkIG11bHRpcGxlIHRpbWVzIikpfXRzLndyaXRlY2h1bms9bnVsbDt0cy53cml0ZWNiPW51bGw7aWYoZGF0YSE9bnVsbCl0aGlzLnB1c2goZGF0YSk7Y2IoZXIpO3ZhciBycz10aGlzLl9yZWFkYWJsZVN0YXRlO3JzLnJlYWRpbmc9ZmFsc2U7aWYocnMubmVlZFJlYWRhYmxlfHxycy5sZW5ndGg8cnMuaGlnaFdhdGVyTWFyayl7dGhpcy5fcmVhZChycy5oaWdoV2F0ZXJNYXJrKX19ZnVuY3Rpb24gVHJhbnNmb3JtKG9wdGlvbnMpe2lmKCEodGhpcyBpbnN0YW5jZW9mIFRyYW5zZm9ybSkpcmV0dXJuIG5ldyBUcmFuc2Zvcm0ob3B0aW9ucyk7RHVwbGV4LmNhbGwodGhpcyxvcHRpb25zKTt0aGlzLl90cmFuc2Zvcm1TdGF0ZT17YWZ0ZXJUcmFuc2Zvcm06YWZ0ZXJUcmFuc2Zvcm0uYmluZCh0aGlzKSxuZWVkVHJhbnNmb3JtOmZhbHNlLHRyYW5zZm9ybWluZzpmYWxzZSx3cml0ZWNiOm51bGwsd3JpdGVjaHVuazpudWxsLHdyaXRlZW5jb2Rpbmc6bnVsbH07dGhpcy5fcmVhZGFibGVTdGF0ZS5uZWVkUmVhZGFibGU9dHJ1ZTt0aGlzLl9yZWFkYWJsZVN0YXRlLnN5bmM9ZmFsc2U7aWYob3B0aW9ucyl7aWYodHlwZW9mIG9wdGlvbnMudHJhbnNmb3JtPT09ImZ1bmN0aW9uIil0aGlzLl90cmFuc2Zvcm09b3B0aW9ucy50cmFuc2Zvcm07aWYodHlwZW9mIG9wdGlvbnMuZmx1c2g9PT0iZnVuY3Rpb24iKXRoaXMuX2ZsdXNoPW9wdGlvbnMuZmx1c2h9dGhpcy5vbigicHJlZmluaXNoIixwcmVmaW5pc2gpfWZ1bmN0aW9uIHByZWZpbmlzaCgpe3ZhciBfdGhpcz10aGlzO2lmKHR5cGVvZiB0aGlzLl9mbHVzaD09PSJmdW5jdGlvbiIpe3RoaXMuX2ZsdXNoKGZ1bmN0aW9uKGVyLGRhdGEpe2RvbmUoX3RoaXMsZXIsZGF0YSl9KX1lbHNle2RvbmUodGhpcyxudWxsLG51bGwpfX1UcmFuc2Zvcm0ucHJvdG90eXBlLnB1c2g9ZnVuY3Rpb24oY2h1bmssZW5jb2Rpbmcpe3RoaXMuX3RyYW5zZm9ybVN0YXRlLm5lZWRUcmFuc2Zvcm09ZmFsc2U7cmV0dXJuIER1cGxleC5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsY2h1bmssZW5jb2RpbmcpfTtUcmFuc2Zvcm0ucHJvdG90eXBlLl90cmFuc2Zvcm09ZnVuY3Rpb24oY2h1bmssZW5jb2RpbmcsY2Ipe3Rocm93IG5ldyBFcnJvcigiX3RyYW5zZm9ybSgpIGlzIG5vdCBpbXBsZW1lbnRlZCIpfTtUcmFuc2Zvcm0ucHJvdG90eXBlLl93cml0ZT1mdW5jdGlvbihjaHVuayxlbmNvZGluZyxjYil7dmFyIHRzPXRoaXMuX3RyYW5zZm9ybVN0YXRlO3RzLndyaXRlY2I9Y2I7dHMud3JpdGVjaHVuaz1jaHVuazt0cy53cml0ZWVuY29kaW5nPWVuY29kaW5nO2lmKCF0cy50cmFuc2Zvcm1pbmcpe3ZhciBycz10aGlzLl9yZWFkYWJsZVN0YXRlO2lmKHRzLm5lZWRUcmFuc2Zvcm18fHJzLm5lZWRSZWFkYWJsZXx8cnMubGVuZ3RoPHJzLmhpZ2hXYXRlck1hcmspdGhpcy5fcmVhZChycy5oaWdoV2F0ZXJNYXJrKX19O1RyYW5zZm9ybS5wcm90b3R5cGUuX3JlYWQ9ZnVuY3Rpb24obil7dmFyIHRzPXRoaXMuX3RyYW5zZm9ybVN0YXRlO2lmKHRzLndyaXRlY2h1bmshPT1udWxsJiZ0cy53cml0ZWNiJiYhdHMudHJhbnNmb3JtaW5nKXt0cy50cmFuc2Zvcm1pbmc9dHJ1ZTt0aGlzLl90cmFuc2Zvcm0odHMud3JpdGVjaHVuayx0cy53cml0ZWVuY29kaW5nLHRzLmFmdGVyVHJhbnNmb3JtKX1lbHNle3RzLm5lZWRUcmFuc2Zvcm09dHJ1ZX19O1RyYW5zZm9ybS5wcm90b3R5cGUuX2Rlc3Ryb3k9ZnVuY3Rpb24oZXJyLGNiKXt2YXIgX3RoaXMyPXRoaXM7RHVwbGV4LnByb3RvdHlwZS5fZGVzdHJveS5jYWxsKHRoaXMsZXJyLGZ1bmN0aW9uKGVycjIpe2NiKGVycjIpO190aGlzMi5lbWl0KCJjbG9zZSIpfSl9O2Z1bmN0aW9uIGRvbmUoc3RyZWFtLGVyLGRhdGEpe2lmKGVyKXJldHVybiBzdHJlYW0uZW1pdCgiZXJyb3IiLGVyKTtpZihkYXRhIT1udWxsKXN0cmVhbS5wdXNoKGRhdGEpO2lmKHN0cmVhbS5fd3JpdGFibGVTdGF0ZS5sZW5ndGgpdGhyb3cgbmV3IEVycm9yKCJDYWxsaW5nIHRyYW5zZm9ybSBkb25lIHdoZW4gd3MubGVuZ3RoICE9IDAiKTtpZihzdHJlYW0uX3RyYW5zZm9ybVN0YXRlLnRyYW5zZm9ybWluZyl0aHJvdyBuZXcgRXJyb3IoIkNhbGxpbmcgdHJhbnNmb3JtIGRvbmUgd2hlbiBzdGlsbCB0cmFuc2Zvcm1pbmciKTtyZXR1cm4gc3RyZWFtLnB1c2gobnVsbCl9fSx7Ii4vX3N0cmVhbV9kdXBsZXgiOjY4LCJjb3JlLXV0aWwtaXMiOjMwLGluaGVyaXRzOjM2fV0sNzI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihwcm9jZXNzLGdsb2JhbCxzZXRJbW1lZGlhdGUpeyJ1c2Ugc3RyaWN0Ijt2YXIgcG5hPXJlcXVpcmUoInByb2Nlc3MtbmV4dGljay1hcmdzIik7bW9kdWxlLmV4cG9ydHM9V3JpdGFibGU7ZnVuY3Rpb24gV3JpdGVSZXEoY2h1bmssZW5jb2RpbmcsY2Ipe3RoaXMuY2h1bms9Y2h1bms7dGhpcy5lbmNvZGluZz1lbmNvZGluZzt0aGlzLmNhbGxiYWNrPWNiO3RoaXMubmV4dD1udWxsfWZ1bmN0aW9uIENvcmtlZFJlcXVlc3Qoc3RhdGUpe3ZhciBfdGhpcz10aGlzO3RoaXMubmV4dD1udWxsO3RoaXMuZW50cnk9bnVsbDt0aGlzLmZpbmlzaD1mdW5jdGlvbigpe29uQ29ya2VkRmluaXNoKF90aGlzLHN0YXRlKX19dmFyIGFzeW5jV3JpdGU9IXByb2Nlc3MuYnJvd3NlciYmWyJ2MC4xMCIsInYwLjkuIl0uaW5kZXhPZihwcm9jZXNzLnZlcnNpb24uc2xpY2UoMCw1KSk+LTE/c2V0SW1tZWRpYXRlOnBuYS5uZXh0VGljazt2YXIgRHVwbGV4O1dyaXRhYmxlLldyaXRhYmxlU3RhdGU9V3JpdGFibGVTdGF0ZTt2YXIgdXRpbD1yZXF1aXJlKCJjb3JlLXV0aWwtaXMiKTt1dGlsLmluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIGludGVybmFsVXRpbD17ZGVwcmVjYXRlOnJlcXVpcmUoInV0aWwtZGVwcmVjYXRlIil9O3ZhciBTdHJlYW09cmVxdWlyZSgiLi9pbnRlcm5hbC9zdHJlYW1zL3N0cmVhbSIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIE91clVpbnQ4QXJyYXk9Z2xvYmFsLlVpbnQ4QXJyYXl8fGZ1bmN0aW9uKCl7fTtmdW5jdGlvbiBfdWludDhBcnJheVRvQnVmZmVyKGNodW5rKXtyZXR1cm4gQnVmZmVyLmZyb20oY2h1bmspfWZ1bmN0aW9uIF9pc1VpbnQ4QXJyYXkob2JqKXtyZXR1cm4gQnVmZmVyLmlzQnVmZmVyKG9iail8fG9iaiBpbnN0YW5jZW9mIE91clVpbnQ4QXJyYXl9dmFyIGRlc3Ryb3lJbXBsPXJlcXVpcmUoIi4vaW50ZXJuYWwvc3RyZWFtcy9kZXN0cm95Iik7dXRpbC5pbmhlcml0cyhXcml0YWJsZSxTdHJlYW0pO2Z1bmN0aW9uIG5vcCgpe31mdW5jdGlvbiBXcml0YWJsZVN0YXRlKG9wdGlvbnMsc3RyZWFtKXtEdXBsZXg9RHVwbGV4fHxyZXF1aXJlKCIuL19zdHJlYW1fZHVwbGV4Iik7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgaXNEdXBsZXg9c3RyZWFtIGluc3RhbmNlb2YgRHVwbGV4O3RoaXMub2JqZWN0TW9kZT0hIW9wdGlvbnMub2JqZWN0TW9kZTtpZihpc0R1cGxleCl0aGlzLm9iamVjdE1vZGU9dGhpcy5vYmplY3RNb2RlfHwhIW9wdGlvbnMud3JpdGFibGVPYmplY3RNb2RlO3ZhciBod209b3B0aW9ucy5oaWdoV2F0ZXJNYXJrO3ZhciB3cml0YWJsZUh3bT1vcHRpb25zLndyaXRhYmxlSGlnaFdhdGVyTWFyazt2YXIgZGVmYXVsdEh3bT10aGlzLm9iamVjdE1vZGU/MTY6MTYqMTAyNDtpZihod218fGh3bT09PTApdGhpcy5oaWdoV2F0ZXJNYXJrPWh3bTtlbHNlIGlmKGlzRHVwbGV4JiYod3JpdGFibGVId218fHdyaXRhYmxlSHdtPT09MCkpdGhpcy5oaWdoV2F0ZXJNYXJrPXdyaXRhYmxlSHdtO2Vsc2UgdGhpcy5oaWdoV2F0ZXJNYXJrPWRlZmF1bHRId207dGhpcy5oaWdoV2F0ZXJNYXJrPU1hdGguZmxvb3IodGhpcy5oaWdoV2F0ZXJNYXJrKTt0aGlzLmZpbmFsQ2FsbGVkPWZhbHNlO3RoaXMubmVlZERyYWluPWZhbHNlO3RoaXMuZW5kaW5nPWZhbHNlO3RoaXMuZW5kZWQ9ZmFsc2U7dGhpcy5maW5pc2hlZD1mYWxzZTt0aGlzLmRlc3Ryb3llZD1mYWxzZTt2YXIgbm9EZWNvZGU9b3B0aW9ucy5kZWNvZGVTdHJpbmdzPT09ZmFsc2U7dGhpcy5kZWNvZGVTdHJpbmdzPSFub0RlY29kZTt0aGlzLmRlZmF1bHRFbmNvZGluZz1vcHRpb25zLmRlZmF1bHRFbmNvZGluZ3x8InV0ZjgiO3RoaXMubGVuZ3RoPTA7dGhpcy53cml0aW5nPWZhbHNlO3RoaXMuY29ya2VkPTA7dGhpcy5zeW5jPXRydWU7dGhpcy5idWZmZXJQcm9jZXNzaW5nPWZhbHNlO3RoaXMub253cml0ZT1mdW5jdGlvbihlcil7b253cml0ZShzdHJlYW0sZXIpfTt0aGlzLndyaXRlY2I9bnVsbDt0aGlzLndyaXRlbGVuPTA7dGhpcy5idWZmZXJlZFJlcXVlc3Q9bnVsbDt0aGlzLmxhc3RCdWZmZXJlZFJlcXVlc3Q9bnVsbDt0aGlzLnBlbmRpbmdjYj0wO3RoaXMucHJlZmluaXNoZWQ9ZmFsc2U7dGhpcy5lcnJvckVtaXR0ZWQ9ZmFsc2U7dGhpcy5idWZmZXJlZFJlcXVlc3RDb3VudD0wO3RoaXMuY29ya2VkUmVxdWVzdHNGcmVlPW5ldyBDb3JrZWRSZXF1ZXN0KHRoaXMpfVdyaXRhYmxlU3RhdGUucHJvdG90eXBlLmdldEJ1ZmZlcj1mdW5jdGlvbiBnZXRCdWZmZXIoKXt2YXIgY3VycmVudD10aGlzLmJ1ZmZlcmVkUmVxdWVzdDt2YXIgb3V0PVtdO3doaWxlKGN1cnJlbnQpe291dC5wdXNoKGN1cnJlbnQpO2N1cnJlbnQ9Y3VycmVudC5uZXh0fXJldHVybiBvdXR9OyhmdW5jdGlvbigpe3RyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkoV3JpdGFibGVTdGF0ZS5wcm90b3R5cGUsImJ1ZmZlciIse2dldDppbnRlcm5hbFV0aWwuZGVwcmVjYXRlKGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0QnVmZmVyKCl9LCJfd3JpdGFibGVTdGF0ZS5idWZmZXIgaXMgZGVwcmVjYXRlZC4gVXNlIF93cml0YWJsZVN0YXRlLmdldEJ1ZmZlciAiKyJpbnN0ZWFkLiIsIkRFUDAwMDMiKX0pfWNhdGNoKF8pe319KSgpO3ZhciByZWFsSGFzSW5zdGFuY2U7aWYodHlwZW9mIFN5bWJvbD09PSJmdW5jdGlvbiImJlN5bWJvbC5oYXNJbnN0YW5jZSYmdHlwZW9mIEZ1bmN0aW9uLnByb3RvdHlwZVtTeW1ib2wuaGFzSW5zdGFuY2VdPT09ImZ1bmN0aW9uIil7cmVhbEhhc0luc3RhbmNlPUZ1bmN0aW9uLnByb3RvdHlwZVtTeW1ib2wuaGFzSW5zdGFuY2VdO09iamVjdC5kZWZpbmVQcm9wZXJ0eShXcml0YWJsZSxTeW1ib2wuaGFzSW5zdGFuY2Use3ZhbHVlOmZ1bmN0aW9uKG9iamVjdCl7aWYocmVhbEhhc0luc3RhbmNlLmNhbGwodGhpcyxvYmplY3QpKXJldHVybiB0cnVlO2lmKHRoaXMhPT1Xcml0YWJsZSlyZXR1cm4gZmFsc2U7cmV0dXJuIG9iamVjdCYmb2JqZWN0Ll93cml0YWJsZVN0YXRlIGluc3RhbmNlb2YgV3JpdGFibGVTdGF0ZX19KX1lbHNle3JlYWxIYXNJbnN0YW5jZT1mdW5jdGlvbihvYmplY3Qpe3JldHVybiBvYmplY3QgaW5zdGFuY2VvZiB0aGlzfX1mdW5jdGlvbiBXcml0YWJsZShvcHRpb25zKXtEdXBsZXg9RHVwbGV4fHxyZXF1aXJlKCIuL19zdHJlYW1fZHVwbGV4Iik7aWYoIXJlYWxIYXNJbnN0YW5jZS5jYWxsKFdyaXRhYmxlLHRoaXMpJiYhKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXgpKXtyZXR1cm4gbmV3IFdyaXRhYmxlKG9wdGlvbnMpfXRoaXMuX3dyaXRhYmxlU3RhdGU9bmV3IFdyaXRhYmxlU3RhdGUob3B0aW9ucyx0aGlzKTt0aGlzLndyaXRhYmxlPXRydWU7aWYob3B0aW9ucyl7aWYodHlwZW9mIG9wdGlvbnMud3JpdGU9PT0iZnVuY3Rpb24iKXRoaXMuX3dyaXRlPW9wdGlvbnMud3JpdGU7aWYodHlwZW9mIG9wdGlvbnMud3JpdGV2PT09ImZ1bmN0aW9uIil0aGlzLl93cml0ZXY9b3B0aW9ucy53cml0ZXY7aWYodHlwZW9mIG9wdGlvbnMuZGVzdHJveT09PSJmdW5jdGlvbiIpdGhpcy5fZGVzdHJveT1vcHRpb25zLmRlc3Ryb3k7aWYodHlwZW9mIG9wdGlvbnMuZmluYWw9PT0iZnVuY3Rpb24iKXRoaXMuX2ZpbmFsPW9wdGlvbnMuZmluYWx9U3RyZWFtLmNhbGwodGhpcyl9V3JpdGFibGUucHJvdG90eXBlLnBpcGU9ZnVuY3Rpb24oKXt0aGlzLmVtaXQoImVycm9yIixuZXcgRXJyb3IoIkNhbm5vdCBwaXBlLCBub3QgcmVhZGFibGUiKSl9O2Z1bmN0aW9uIHdyaXRlQWZ0ZXJFbmQoc3RyZWFtLGNiKXt2YXIgZXI9bmV3IEVycm9yKCJ3cml0ZSBhZnRlciBlbmQiKTtzdHJlYW0uZW1pdCgiZXJyb3IiLGVyKTtwbmEubmV4dFRpY2soY2IsZXIpfWZ1bmN0aW9uIHZhbGlkQ2h1bmsoc3RyZWFtLHN0YXRlLGNodW5rLGNiKXt2YXIgdmFsaWQ9dHJ1ZTt2YXIgZXI9ZmFsc2U7aWYoY2h1bms9PT1udWxsKXtlcj1uZXcgVHlwZUVycm9yKCJNYXkgbm90IHdyaXRlIG51bGwgdmFsdWVzIHRvIHN0cmVhbSIpfWVsc2UgaWYodHlwZW9mIGNodW5rIT09InN0cmluZyImJmNodW5rIT09dW5kZWZpbmVkJiYhc3RhdGUub2JqZWN0TW9kZSl7ZXI9bmV3IFR5cGVFcnJvcigiSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuayIpfWlmKGVyKXtzdHJlYW0uZW1pdCgiZXJyb3IiLGVyKTtwbmEubmV4dFRpY2soY2IsZXIpO3ZhbGlkPWZhbHNlfXJldHVybiB2YWxpZH1Xcml0YWJsZS5wcm90b3R5cGUud3JpdGU9ZnVuY3Rpb24oY2h1bmssZW5jb2RpbmcsY2Ipe3ZhciBzdGF0ZT10aGlzLl93cml0YWJsZVN0YXRlO3ZhciByZXQ9ZmFsc2U7dmFyIGlzQnVmPSFzdGF0ZS5vYmplY3RNb2RlJiZfaXNVaW50OEFycmF5KGNodW5rKTtpZihpc0J1ZiYmIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpe2NodW5rPV91aW50OEFycmF5VG9CdWZmZXIoY2h1bmspfWlmKHR5cGVvZiBlbmNvZGluZz09PSJmdW5jdGlvbiIpe2NiPWVuY29kaW5nO2VuY29kaW5nPW51bGx9aWYoaXNCdWYpZW5jb2Rpbmc9ImJ1ZmZlciI7ZWxzZSBpZighZW5jb2RpbmcpZW5jb2Rpbmc9c3RhdGUuZGVmYXVsdEVuY29kaW5nO2lmKHR5cGVvZiBjYiE9PSJmdW5jdGlvbiIpY2I9bm9wO2lmKHN0YXRlLmVuZGVkKXdyaXRlQWZ0ZXJFbmQodGhpcyxjYik7ZWxzZSBpZihpc0J1Znx8dmFsaWRDaHVuayh0aGlzLHN0YXRlLGNodW5rLGNiKSl7c3RhdGUucGVuZGluZ2NiKys7cmV0PXdyaXRlT3JCdWZmZXIodGhpcyxzdGF0ZSxpc0J1ZixjaHVuayxlbmNvZGluZyxjYil9cmV0dXJuIHJldH07V3JpdGFibGUucHJvdG90eXBlLmNvcms9ZnVuY3Rpb24oKXt2YXIgc3RhdGU9dGhpcy5fd3JpdGFibGVTdGF0ZTtzdGF0ZS5jb3JrZWQrK307V3JpdGFibGUucHJvdG90eXBlLnVuY29yaz1mdW5jdGlvbigpe3ZhciBzdGF0ZT10aGlzLl93cml0YWJsZVN0YXRlO2lmKHN0YXRlLmNvcmtlZCl7c3RhdGUuY29ya2VkLS07aWYoIXN0YXRlLndyaXRpbmcmJiFzdGF0ZS5jb3JrZWQmJiFzdGF0ZS5maW5pc2hlZCYmIXN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcmJnN0YXRlLmJ1ZmZlcmVkUmVxdWVzdCljbGVhckJ1ZmZlcih0aGlzLHN0YXRlKX19O1dyaXRhYmxlLnByb3RvdHlwZS5zZXREZWZhdWx0RW5jb2Rpbmc9ZnVuY3Rpb24gc2V0RGVmYXVsdEVuY29kaW5nKGVuY29kaW5nKXtpZih0eXBlb2YgZW5jb2Rpbmc9PT0ic3RyaW5nIillbmNvZGluZz1lbmNvZGluZy50b0xvd2VyQ2FzZSgpO2lmKCEoWyJoZXgiLCJ1dGY4IiwidXRmLTgiLCJhc2NpaSIsImJpbmFyeSIsImJhc2U2NCIsInVjczIiLCJ1Y3MtMiIsInV0ZjE2bGUiLCJ1dGYtMTZsZSIsInJhdyJdLmluZGV4T2YoKGVuY29kaW5nKyIiKS50b0xvd2VyQ2FzZSgpKT4tMSkpdGhyb3cgbmV3IFR5cGVFcnJvcigiVW5rbm93biBlbmNvZGluZzogIitlbmNvZGluZyk7dGhpcy5fd3JpdGFibGVTdGF0ZS5kZWZhdWx0RW5jb2Rpbmc9ZW5jb2Rpbmc7cmV0dXJuIHRoaXN9O2Z1bmN0aW9uIGRlY29kZUNodW5rKHN0YXRlLGNodW5rLGVuY29kaW5nKXtpZighc3RhdGUub2JqZWN0TW9kZSYmc3RhdGUuZGVjb2RlU3RyaW5ncyE9PWZhbHNlJiZ0eXBlb2YgY2h1bms9PT0ic3RyaW5nIil7Y2h1bms9QnVmZmVyLmZyb20oY2h1bmssZW5jb2RpbmcpfXJldHVybiBjaHVua31PYmplY3QuZGVmaW5lUHJvcGVydHkoV3JpdGFibGUucHJvdG90eXBlLCJ3cml0YWJsZUhpZ2hXYXRlck1hcmsiLHtlbnVtZXJhYmxlOmZhbHNlLGdldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl93cml0YWJsZVN0YXRlLmhpZ2hXYXRlck1hcmt9fSk7ZnVuY3Rpb24gd3JpdGVPckJ1ZmZlcihzdHJlYW0sc3RhdGUsaXNCdWYsY2h1bmssZW5jb2RpbmcsY2Ipe2lmKCFpc0J1Zil7dmFyIG5ld0NodW5rPWRlY29kZUNodW5rKHN0YXRlLGNodW5rLGVuY29kaW5nKTtpZihjaHVuayE9PW5ld0NodW5rKXtpc0J1Zj10cnVlO2VuY29kaW5nPSJidWZmZXIiO2NodW5rPW5ld0NodW5rfX12YXIgbGVuPXN0YXRlLm9iamVjdE1vZGU/MTpjaHVuay5sZW5ndGg7c3RhdGUubGVuZ3RoKz1sZW47dmFyIHJldD1zdGF0ZS5sZW5ndGg8c3RhdGUuaGlnaFdhdGVyTWFyaztpZighcmV0KXN0YXRlLm5lZWREcmFpbj10cnVlO2lmKHN0YXRlLndyaXRpbmd8fHN0YXRlLmNvcmtlZCl7dmFyIGxhc3Q9c3RhdGUubGFzdEJ1ZmZlcmVkUmVxdWVzdDtzdGF0ZS5sYXN0QnVmZmVyZWRSZXF1ZXN0PXtjaHVuazpjaHVuayxlbmNvZGluZzplbmNvZGluZyxpc0J1Zjppc0J1ZixjYWxsYmFjazpjYixuZXh0Om51bGx9O2lmKGxhc3Qpe2xhc3QubmV4dD1zdGF0ZS5sYXN0QnVmZmVyZWRSZXF1ZXN0fWVsc2V7c3RhdGUuYnVmZmVyZWRSZXF1ZXN0PXN0YXRlLmxhc3RCdWZmZXJlZFJlcXVlc3R9c3RhdGUuYnVmZmVyZWRSZXF1ZXN0Q291bnQrPTF9ZWxzZXtkb1dyaXRlKHN0cmVhbSxzdGF0ZSxmYWxzZSxsZW4sY2h1bmssZW5jb2RpbmcsY2IpfXJldHVybiByZXR9ZnVuY3Rpb24gZG9Xcml0ZShzdHJlYW0sc3RhdGUsd3JpdGV2LGxlbixjaHVuayxlbmNvZGluZyxjYil7c3RhdGUud3JpdGVsZW49bGVuO3N0YXRlLndyaXRlY2I9Y2I7c3RhdGUud3JpdGluZz10cnVlO3N0YXRlLnN5bmM9dHJ1ZTtpZih3cml0ZXYpc3RyZWFtLl93cml0ZXYoY2h1bmssc3RhdGUub253cml0ZSk7ZWxzZSBzdHJlYW0uX3dyaXRlKGNodW5rLGVuY29kaW5nLHN0YXRlLm9ud3JpdGUpO3N0YXRlLnN5bmM9ZmFsc2V9ZnVuY3Rpb24gb253cml0ZUVycm9yKHN0cmVhbSxzdGF0ZSxzeW5jLGVyLGNiKXstLXN0YXRlLnBlbmRpbmdjYjtpZihzeW5jKXtwbmEubmV4dFRpY2soY2IsZXIpO3BuYS5uZXh0VGljayhmaW5pc2hNYXliZSxzdHJlYW0sc3RhdGUpO3N0cmVhbS5fd3JpdGFibGVTdGF0ZS5lcnJvckVtaXR0ZWQ9dHJ1ZTtzdHJlYW0uZW1pdCgiZXJyb3IiLGVyKX1lbHNle2NiKGVyKTtzdHJlYW0uX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkPXRydWU7c3RyZWFtLmVtaXQoImVycm9yIixlcik7ZmluaXNoTWF5YmUoc3RyZWFtLHN0YXRlKX19ZnVuY3Rpb24gb253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKXtzdGF0ZS53cml0aW5nPWZhbHNlO3N0YXRlLndyaXRlY2I9bnVsbDtzdGF0ZS5sZW5ndGgtPXN0YXRlLndyaXRlbGVuO3N0YXRlLndyaXRlbGVuPTB9ZnVuY3Rpb24gb253cml0ZShzdHJlYW0sZXIpe3ZhciBzdGF0ZT1zdHJlYW0uX3dyaXRhYmxlU3RhdGU7dmFyIHN5bmM9c3RhdGUuc3luYzt2YXIgY2I9c3RhdGUud3JpdGVjYjtvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpO2lmKGVyKW9ud3JpdGVFcnJvcihzdHJlYW0sc3RhdGUsc3luYyxlcixjYik7ZWxzZXt2YXIgZmluaXNoZWQ9bmVlZEZpbmlzaChzdGF0ZSk7aWYoIWZpbmlzaGVkJiYhc3RhdGUuY29ya2VkJiYhc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyYmc3RhdGUuYnVmZmVyZWRSZXF1ZXN0KXtjbGVhckJ1ZmZlcihzdHJlYW0sc3RhdGUpfWlmKHN5bmMpe2FzeW5jV3JpdGUoYWZ0ZXJXcml0ZSxzdHJlYW0sc3RhdGUsZmluaXNoZWQsY2IpfWVsc2V7YWZ0ZXJXcml0ZShzdHJlYW0sc3RhdGUsZmluaXNoZWQsY2IpfX19ZnVuY3Rpb24gYWZ0ZXJXcml0ZShzdHJlYW0sc3RhdGUsZmluaXNoZWQsY2Ipe2lmKCFmaW5pc2hlZClvbndyaXRlRHJhaW4oc3RyZWFtLHN0YXRlKTtzdGF0ZS5wZW5kaW5nY2ItLTtjYigpO2ZpbmlzaE1heWJlKHN0cmVhbSxzdGF0ZSl9ZnVuY3Rpb24gb253cml0ZURyYWluKHN0cmVhbSxzdGF0ZSl7aWYoc3RhdGUubGVuZ3RoPT09MCYmc3RhdGUubmVlZERyYWluKXtzdGF0ZS5uZWVkRHJhaW49ZmFsc2U7c3RyZWFtLmVtaXQoImRyYWluIil9fWZ1bmN0aW9uIGNsZWFyQnVmZmVyKHN0cmVhbSxzdGF0ZSl7c3RhdGUuYnVmZmVyUHJvY2Vzc2luZz10cnVlO3ZhciBlbnRyeT1zdGF0ZS5idWZmZXJlZFJlcXVlc3Q7aWYoc3RyZWFtLl93cml0ZXYmJmVudHJ5JiZlbnRyeS5uZXh0KXt2YXIgbD1zdGF0ZS5idWZmZXJlZFJlcXVlc3RDb3VudDt2YXIgYnVmZmVyPW5ldyBBcnJheShsKTt2YXIgaG9sZGVyPXN0YXRlLmNvcmtlZFJlcXVlc3RzRnJlZTtob2xkZXIuZW50cnk9ZW50cnk7dmFyIGNvdW50PTA7dmFyIGFsbEJ1ZmZlcnM9dHJ1ZTt3aGlsZShlbnRyeSl7YnVmZmVyW2NvdW50XT1lbnRyeTtpZighZW50cnkuaXNCdWYpYWxsQnVmZmVycz1mYWxzZTtlbnRyeT1lbnRyeS5uZXh0O2NvdW50Kz0xfWJ1ZmZlci5hbGxCdWZmZXJzPWFsbEJ1ZmZlcnM7ZG9Xcml0ZShzdHJlYW0sc3RhdGUsdHJ1ZSxzdGF0ZS5sZW5ndGgsYnVmZmVyLCIiLGhvbGRlci5maW5pc2gpO3N0YXRlLnBlbmRpbmdjYisrO3N0YXRlLmxhc3RCdWZmZXJlZFJlcXVlc3Q9bnVsbDtpZihob2xkZXIubmV4dCl7c3RhdGUuY29ya2VkUmVxdWVzdHNGcmVlPWhvbGRlci5uZXh0O2hvbGRlci5uZXh0PW51bGx9ZWxzZXtzdGF0ZS5jb3JrZWRSZXF1ZXN0c0ZyZWU9bmV3IENvcmtlZFJlcXVlc3Qoc3RhdGUpfXN0YXRlLmJ1ZmZlcmVkUmVxdWVzdENvdW50PTB9ZWxzZXt3aGlsZShlbnRyeSl7dmFyIGNodW5rPWVudHJ5LmNodW5rO3ZhciBlbmNvZGluZz1lbnRyeS5lbmNvZGluZzt2YXIgY2I9ZW50cnkuY2FsbGJhY2s7dmFyIGxlbj1zdGF0ZS5vYmplY3RNb2RlPzE6Y2h1bmsubGVuZ3RoO2RvV3JpdGUoc3RyZWFtLHN0YXRlLGZhbHNlLGxlbixjaHVuayxlbmNvZGluZyxjYik7ZW50cnk9ZW50cnkubmV4dDtzdGF0ZS5idWZmZXJlZFJlcXVlc3RDb3VudC0tO2lmKHN0YXRlLndyaXRpbmcpe2JyZWFrfX1pZihlbnRyeT09PW51bGwpc3RhdGUubGFzdEJ1ZmZlcmVkUmVxdWVzdD1udWxsfXN0YXRlLmJ1ZmZlcmVkUmVxdWVzdD1lbnRyeTtzdGF0ZS5idWZmZXJQcm9jZXNzaW5nPWZhbHNlfVdyaXRhYmxlLnByb3RvdHlwZS5fd3JpdGU9ZnVuY3Rpb24oY2h1bmssZW5jb2RpbmcsY2Ipe2NiKG5ldyBFcnJvcigiX3dyaXRlKCkgaXMgbm90IGltcGxlbWVudGVkIikpfTtXcml0YWJsZS5wcm90b3R5cGUuX3dyaXRldj1udWxsO1dyaXRhYmxlLnByb3RvdHlwZS5lbmQ9ZnVuY3Rpb24oY2h1bmssZW5jb2RpbmcsY2Ipe3ZhciBzdGF0ZT10aGlzLl93cml0YWJsZVN0YXRlO2lmKHR5cGVvZiBjaHVuaz09PSJmdW5jdGlvbiIpe2NiPWNodW5rO2NodW5rPW51bGw7ZW5jb2Rpbmc9bnVsbH1lbHNlIGlmKHR5cGVvZiBlbmNvZGluZz09PSJmdW5jdGlvbiIpe2NiPWVuY29kaW5nO2VuY29kaW5nPW51bGx9aWYoY2h1bmshPT1udWxsJiZjaHVuayE9PXVuZGVmaW5lZCl0aGlzLndyaXRlKGNodW5rLGVuY29kaW5nKTtpZihzdGF0ZS5jb3JrZWQpe3N0YXRlLmNvcmtlZD0xO3RoaXMudW5jb3JrKCl9aWYoIXN0YXRlLmVuZGluZyYmIXN0YXRlLmZpbmlzaGVkKWVuZFdyaXRhYmxlKHRoaXMsc3RhdGUsY2IpfTtmdW5jdGlvbiBuZWVkRmluaXNoKHN0YXRlKXtyZXR1cm4gc3RhdGUuZW5kaW5nJiZzdGF0ZS5sZW5ndGg9PT0wJiZzdGF0ZS5idWZmZXJlZFJlcXVlc3Q9PT1udWxsJiYhc3RhdGUuZmluaXNoZWQmJiFzdGF0ZS53cml0aW5nfWZ1bmN0aW9uIGNhbGxGaW5hbChzdHJlYW0sc3RhdGUpe3N0cmVhbS5fZmluYWwoZnVuY3Rpb24oZXJyKXtzdGF0ZS5wZW5kaW5nY2ItLTtpZihlcnIpe3N0cmVhbS5lbWl0KCJlcnJvciIsZXJyKX1zdGF0ZS5wcmVmaW5pc2hlZD10cnVlO3N0cmVhbS5lbWl0KCJwcmVmaW5pc2giKTtmaW5pc2hNYXliZShzdHJlYW0sc3RhdGUpfSl9ZnVuY3Rpb24gcHJlZmluaXNoKHN0cmVhbSxzdGF0ZSl7aWYoIXN0YXRlLnByZWZpbmlzaGVkJiYhc3RhdGUuZmluYWxDYWxsZWQpe2lmKHR5cGVvZiBzdHJlYW0uX2ZpbmFsPT09ImZ1bmN0aW9uIil7c3RhdGUucGVuZGluZ2NiKys7c3RhdGUuZmluYWxDYWxsZWQ9dHJ1ZTtwbmEubmV4dFRpY2soY2FsbEZpbmFsLHN0cmVhbSxzdGF0ZSl9ZWxzZXtzdGF0ZS5wcmVmaW5pc2hlZD10cnVlO3N0cmVhbS5lbWl0KCJwcmVmaW5pc2giKX19fWZ1bmN0aW9uIGZpbmlzaE1heWJlKHN0cmVhbSxzdGF0ZSl7dmFyIG5lZWQ9bmVlZEZpbmlzaChzdGF0ZSk7aWYobmVlZCl7cHJlZmluaXNoKHN0cmVhbSxzdGF0ZSk7aWYoc3RhdGUucGVuZGluZ2NiPT09MCl7c3RhdGUuZmluaXNoZWQ9dHJ1ZTtzdHJlYW0uZW1pdCgiZmluaXNoIil9fXJldHVybiBuZWVkfWZ1bmN0aW9uIGVuZFdyaXRhYmxlKHN0cmVhbSxzdGF0ZSxjYil7c3RhdGUuZW5kaW5nPXRydWU7ZmluaXNoTWF5YmUoc3RyZWFtLHN0YXRlKTtpZihjYil7aWYoc3RhdGUuZmluaXNoZWQpcG5hLm5leHRUaWNrKGNiKTtlbHNlIHN0cmVhbS5vbmNlKCJmaW5pc2giLGNiKX1zdGF0ZS5lbmRlZD10cnVlO3N0cmVhbS53cml0YWJsZT1mYWxzZX1mdW5jdGlvbiBvbkNvcmtlZEZpbmlzaChjb3JrUmVxLHN0YXRlLGVycil7dmFyIGVudHJ5PWNvcmtSZXEuZW50cnk7Y29ya1JlcS5lbnRyeT1udWxsO3doaWxlKGVudHJ5KXt2YXIgY2I9ZW50cnkuY2FsbGJhY2s7c3RhdGUucGVuZGluZ2NiLS07Y2IoZXJyKTtlbnRyeT1lbnRyeS5uZXh0fWlmKHN0YXRlLmNvcmtlZFJlcXVlc3RzRnJlZSl7c3RhdGUuY29ya2VkUmVxdWVzdHNGcmVlLm5leHQ9Y29ya1JlcX1lbHNle3N0YXRlLmNvcmtlZFJlcXVlc3RzRnJlZT1jb3JrUmVxfX1PYmplY3QuZGVmaW5lUHJvcGVydHkoV3JpdGFibGUucHJvdG90eXBlLCJkZXN0cm95ZWQiLHtnZXQ6ZnVuY3Rpb24oKXtpZih0aGlzLl93cml0YWJsZVN0YXRlPT09dW5kZWZpbmVkKXtyZXR1cm4gZmFsc2V9cmV0dXJuIHRoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkfSxzZXQ6ZnVuY3Rpb24odmFsdWUpe2lmKCF0aGlzLl93cml0YWJsZVN0YXRlKXtyZXR1cm59dGhpcy5fd3JpdGFibGVTdGF0ZS5kZXN0cm95ZWQ9dmFsdWV9fSk7V3JpdGFibGUucHJvdG90eXBlLmRlc3Ryb3k9ZGVzdHJveUltcGwuZGVzdHJveTtXcml0YWJsZS5wcm90b3R5cGUuX3VuZGVzdHJveT1kZXN0cm95SW1wbC51bmRlc3Ryb3k7V3JpdGFibGUucHJvdG90eXBlLl9kZXN0cm95PWZ1bmN0aW9uKGVycixjYil7dGhpcy5lbmQoKTtjYihlcnIpfX0pLmNhbGwodGhpcyxyZXF1aXJlKCJfcHJvY2VzcyIpLHR5cGVvZiBnbG9iYWwhPT0idW5kZWZpbmVkIj9nbG9iYWw6dHlwZW9mIHNlbGYhPT0idW5kZWZpbmVkIj9zZWxmOnR5cGVvZiB3aW5kb3chPT0idW5kZWZpbmVkIj93aW5kb3c6e30scmVxdWlyZSgidGltZXJzIikuc2V0SW1tZWRpYXRlKX0seyIuL19zdHJlYW1fZHVwbGV4Ijo2OCwiLi9pbnRlcm5hbC9zdHJlYW1zL2Rlc3Ryb3kiOjc0LCIuL2ludGVybmFsL3N0cmVhbXMvc3RyZWFtIjo3NSxfcHJvY2Vzczo2NiwiY29yZS11dGlsLWlzIjozMCxpbmhlcml0czozNiwicHJvY2Vzcy1uZXh0aWNrLWFyZ3MiOjY1LCJzYWZlLWJ1ZmZlciI6NzYsdGltZXJzOjEwNCwidXRpbC1kZXByZWNhdGUiOjEwNX1dLDczOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7ZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLENvbnN0cnVjdG9yKXtpZighKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb24iKX19dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgdXRpbD1yZXF1aXJlKCJ1dGlsIik7ZnVuY3Rpb24gY29weUJ1ZmZlcihzcmMsdGFyZ2V0LG9mZnNldCl7c3JjLmNvcHkodGFyZ2V0LG9mZnNldCl9bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24oKXtmdW5jdGlvbiBCdWZmZXJMaXN0KCl7X2NsYXNzQ2FsbENoZWNrKHRoaXMsQnVmZmVyTGlzdCk7dGhpcy5oZWFkPW51bGw7dGhpcy50YWlsPW51bGw7dGhpcy5sZW5ndGg9MH1CdWZmZXJMaXN0LnByb3RvdHlwZS5wdXNoPWZ1bmN0aW9uIHB1c2godil7dmFyIGVudHJ5PXtkYXRhOnYsbmV4dDpudWxsfTtpZih0aGlzLmxlbmd0aD4wKXRoaXMudGFpbC5uZXh0PWVudHJ5O2Vsc2UgdGhpcy5oZWFkPWVudHJ5O3RoaXMudGFpbD1lbnRyeTsrK3RoaXMubGVuZ3RofTtCdWZmZXJMaXN0LnByb3RvdHlwZS51bnNoaWZ0PWZ1bmN0aW9uIHVuc2hpZnQodil7dmFyIGVudHJ5PXtkYXRhOnYsbmV4dDp0aGlzLmhlYWR9O2lmKHRoaXMubGVuZ3RoPT09MCl0aGlzLnRhaWw9ZW50cnk7dGhpcy5oZWFkPWVudHJ5OysrdGhpcy5sZW5ndGh9O0J1ZmZlckxpc3QucHJvdG90eXBlLnNoaWZ0PWZ1bmN0aW9uIHNoaWZ0KCl7aWYodGhpcy5sZW5ndGg9PT0wKXJldHVybjt2YXIgcmV0PXRoaXMuaGVhZC5kYXRhO2lmKHRoaXMubGVuZ3RoPT09MSl0aGlzLmhlYWQ9dGhpcy50YWlsPW51bGw7ZWxzZSB0aGlzLmhlYWQ9dGhpcy5oZWFkLm5leHQ7LS10aGlzLmxlbmd0aDtyZXR1cm4gcmV0fTtCdWZmZXJMaXN0LnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbiBjbGVhcigpe3RoaXMuaGVhZD10aGlzLnRhaWw9bnVsbDt0aGlzLmxlbmd0aD0wfTtCdWZmZXJMaXN0LnByb3RvdHlwZS5qb2luPWZ1bmN0aW9uIGpvaW4ocyl7aWYodGhpcy5sZW5ndGg9PT0wKXJldHVybiIiO3ZhciBwPXRoaXMuaGVhZDt2YXIgcmV0PSIiK3AuZGF0YTt3aGlsZShwPXAubmV4dCl7cmV0Kz1zK3AuZGF0YX1yZXR1cm4gcmV0fTtCdWZmZXJMaXN0LnByb3RvdHlwZS5jb25jYXQ9ZnVuY3Rpb24gY29uY2F0KG4pe2lmKHRoaXMubGVuZ3RoPT09MClyZXR1cm4gQnVmZmVyLmFsbG9jKDApO2lmKHRoaXMubGVuZ3RoPT09MSlyZXR1cm4gdGhpcy5oZWFkLmRhdGE7dmFyIHJldD1CdWZmZXIuYWxsb2NVbnNhZmUobj4+PjApO3ZhciBwPXRoaXMuaGVhZDt2YXIgaT0wO3doaWxlKHApe2NvcHlCdWZmZXIocC5kYXRhLHJldCxpKTtpKz1wLmRhdGEubGVuZ3RoO3A9cC5uZXh0fXJldHVybiByZXR9O3JldHVybiBCdWZmZXJMaXN0fSgpO2lmKHV0aWwmJnV0aWwuaW5zcGVjdCYmdXRpbC5pbnNwZWN0LmN1c3RvbSl7bW9kdWxlLmV4cG9ydHMucHJvdG90eXBlW3V0aWwuaW5zcGVjdC5jdXN0b21dPWZ1bmN0aW9uKCl7dmFyIG9iaj11dGlsLmluc3BlY3Qoe2xlbmd0aDp0aGlzLmxlbmd0aH0pO3JldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWUrIiAiK29ian19fSx7InNhZmUtYnVmZmVyIjo3Nix1dGlsOjI2fV0sNzQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgcG5hPXJlcXVpcmUoInByb2Nlc3MtbmV4dGljay1hcmdzIik7ZnVuY3Rpb24gZGVzdHJveShlcnIsY2Ipe3ZhciBfdGhpcz10aGlzO3ZhciByZWFkYWJsZURlc3Ryb3llZD10aGlzLl9yZWFkYWJsZVN0YXRlJiZ0aGlzLl9yZWFkYWJsZVN0YXRlLmRlc3Ryb3llZDt2YXIgd3JpdGFibGVEZXN0cm95ZWQ9dGhpcy5fd3JpdGFibGVTdGF0ZSYmdGhpcy5fd3JpdGFibGVTdGF0ZS5kZXN0cm95ZWQ7aWYocmVhZGFibGVEZXN0cm95ZWR8fHdyaXRhYmxlRGVzdHJveWVkKXtpZihjYil7Y2IoZXJyKX1lbHNlIGlmKGVyciYmKCF0aGlzLl93cml0YWJsZVN0YXRlfHwhdGhpcy5fd3JpdGFibGVTdGF0ZS5lcnJvckVtaXR0ZWQpKXtwbmEubmV4dFRpY2soZW1pdEVycm9yTlQsdGhpcyxlcnIpfXJldHVybiB0aGlzfWlmKHRoaXMuX3JlYWRhYmxlU3RhdGUpe3RoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkPXRydWV9aWYodGhpcy5fd3JpdGFibGVTdGF0ZSl7dGhpcy5fd3JpdGFibGVTdGF0ZS5kZXN0cm95ZWQ9dHJ1ZX10aGlzLl9kZXN0cm95KGVycnx8bnVsbCxmdW5jdGlvbihlcnIpe2lmKCFjYiYmZXJyKXtwbmEubmV4dFRpY2soZW1pdEVycm9yTlQsX3RoaXMsZXJyKTtpZihfdGhpcy5fd3JpdGFibGVTdGF0ZSl7X3RoaXMuX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkPXRydWV9fWVsc2UgaWYoY2Ipe2NiKGVycil9fSk7cmV0dXJuIHRoaXN9ZnVuY3Rpb24gdW5kZXN0cm95KCl7aWYodGhpcy5fcmVhZGFibGVTdGF0ZSl7dGhpcy5fcmVhZGFibGVTdGF0ZS5kZXN0cm95ZWQ9ZmFsc2U7dGhpcy5fcmVhZGFibGVTdGF0ZS5yZWFkaW5nPWZhbHNlO3RoaXMuX3JlYWRhYmxlU3RhdGUuZW5kZWQ9ZmFsc2U7dGhpcy5fcmVhZGFibGVTdGF0ZS5lbmRFbWl0dGVkPWZhbHNlfWlmKHRoaXMuX3dyaXRhYmxlU3RhdGUpe3RoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkPWZhbHNlO3RoaXMuX3dyaXRhYmxlU3RhdGUuZW5kZWQ9ZmFsc2U7dGhpcy5fd3JpdGFibGVTdGF0ZS5lbmRpbmc9ZmFsc2U7dGhpcy5fd3JpdGFibGVTdGF0ZS5maW5pc2hlZD1mYWxzZTt0aGlzLl93cml0YWJsZVN0YXRlLmVycm9yRW1pdHRlZD1mYWxzZX19ZnVuY3Rpb24gZW1pdEVycm9yTlQoc2VsZixlcnIpe3NlbGYuZW1pdCgiZXJyb3IiLGVycil9bW9kdWxlLmV4cG9ydHM9e2Rlc3Ryb3k6ZGVzdHJveSx1bmRlc3Ryb3k6dW5kZXN0cm95fX0seyJwcm9jZXNzLW5leHRpY2stYXJncyI6NjV9XSw3NTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9cmVxdWlyZSgiZXZlbnRzIikuRXZlbnRFbWl0dGVyfSx7ZXZlbnRzOjMzfV0sNzY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBidWZmZXI9cmVxdWlyZSgiYnVmZmVyIik7dmFyIEJ1ZmZlcj1idWZmZXIuQnVmZmVyO2Z1bmN0aW9uIGNvcHlQcm9wcyhzcmMsZHN0KXtmb3IodmFyIGtleSBpbiBzcmMpe2RzdFtrZXldPXNyY1trZXldfX1pZihCdWZmZXIuZnJvbSYmQnVmZmVyLmFsbG9jJiZCdWZmZXIuYWxsb2NVbnNhZmUmJkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cpe21vZHVsZS5leHBvcnRzPWJ1ZmZlcn1lbHNle2NvcHlQcm9wcyhidWZmZXIsZXhwb3J0cyk7ZXhwb3J0cy5CdWZmZXI9U2FmZUJ1ZmZlcn1mdW5jdGlvbiBTYWZlQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl7cmV0dXJuIEJ1ZmZlcihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfWNvcHlQcm9wcyhCdWZmZXIsU2FmZUJ1ZmZlcik7U2FmZUJ1ZmZlci5mcm9tPWZ1bmN0aW9uKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl7aWYodHlwZW9mIGFyZz09PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IG5vdCBiZSBhIG51bWJlciIpfXJldHVybiBCdWZmZXIoYXJnLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX07U2FmZUJ1ZmZlci5hbGxvYz1mdW5jdGlvbihzaXplLGZpbGwsZW5jb2Rpbmcpe2lmKHR5cGVvZiBzaXplIT09Im51bWJlciIpe3Rocm93IG5ldyBUeXBlRXJyb3IoIkFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXIiKX12YXIgYnVmPUJ1ZmZlcihzaXplKTtpZihmaWxsIT09dW5kZWZpbmVkKXtpZih0eXBlb2YgZW5jb2Rpbmc9PT0ic3RyaW5nIil7YnVmLmZpbGwoZmlsbCxlbmNvZGluZyl9ZWxzZXtidWYuZmlsbChmaWxsKX19ZWxzZXtidWYuZmlsbCgwKX1yZXR1cm4gYnVmfTtTYWZlQnVmZmVyLmFsbG9jVW5zYWZlPWZ1bmN0aW9uKHNpemUpe2lmKHR5cGVvZiBzaXplIT09Im51bWJlciIpe3Rocm93IG5ldyBUeXBlRXJyb3IoIkFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXIiKX1yZXR1cm4gQnVmZmVyKHNpemUpfTtTYWZlQnVmZmVyLmFsbG9jVW5zYWZlU2xvdz1mdW5jdGlvbihzaXplKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9cmV0dXJuIGJ1ZmZlci5TbG93QnVmZmVyKHNpemUpfX0se2J1ZmZlcjoyN31dLDc3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1yZXF1aXJlKCIuL3JlYWRhYmxlIikuUGFzc1Rocm91Z2h9LHsiLi9yZWFkYWJsZSI6Nzh9XSw3ODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7ZXhwb3J0cz1tb2R1bGUuZXhwb3J0cz1yZXF1aXJlKCIuL2xpYi9fc3RyZWFtX3JlYWRhYmxlLmpzIik7ZXhwb3J0cy5TdHJlYW09ZXhwb3J0cztleHBvcnRzLlJlYWRhYmxlPWV4cG9ydHM7ZXhwb3J0cy5Xcml0YWJsZT1yZXF1aXJlKCIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzIik7ZXhwb3J0cy5EdXBsZXg9cmVxdWlyZSgiLi9saWIvX3N0cmVhbV9kdXBsZXguanMiKTtleHBvcnRzLlRyYW5zZm9ybT1yZXF1aXJlKCIuL2xpYi9fc3RyZWFtX3RyYW5zZm9ybS5qcyIpO2V4cG9ydHMuUGFzc1Rocm91Z2g9cmVxdWlyZSgiLi9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qcyIpfSx7Ii4vbGliL19zdHJlYW1fZHVwbGV4LmpzIjo2OCwiLi9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qcyI6NjksIi4vbGliL19zdHJlYW1fcmVhZGFibGUuanMiOjcwLCIuL2xpYi9fc3RyZWFtX3RyYW5zZm9ybS5qcyI6NzEsIi4vbGliL19zdHJlYW1fd3JpdGFibGUuanMiOjcyfV0sNzk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXJlcXVpcmUoIi4vcmVhZGFibGUiKS5UcmFuc2Zvcm19LHsiLi9yZWFkYWJsZSI6Nzh9XSw4MDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9cmVxdWlyZSgiLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcyIpfSx7Ii4vbGliL19zdHJlYW1fd3JpdGFibGUuanMiOjcyfV0sODE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgQnVmZmVyPXJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcjt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgSGFzaEJhc2U9cmVxdWlyZSgiaGFzaC1iYXNlIik7dmFyIEFSUkFZMTY9bmV3IEFycmF5KDE2KTt2YXIgemw9WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsNyw0LDEzLDEsMTAsNiwxNSwzLDEyLDAsOSw1LDIsMTQsMTEsOCwzLDEwLDE0LDQsOSwxNSw4LDEsMiw3LDAsNiwxMywxMSw1LDEyLDEsOSwxMSwxMCwwLDgsMTIsNCwxMywzLDcsMTUsMTQsNSw2LDIsNCwwLDUsOSw3LDEyLDIsMTAsMTQsMSwzLDgsMTEsNiwxNSwxM107dmFyIHpyPVs1LDE0LDcsMCw5LDIsMTEsNCwxMyw2LDE1LDgsMSwxMCwzLDEyLDYsMTEsMyw3LDAsMTMsNSwxMCwxNCwxNSw4LDEyLDQsOSwxLDIsMTUsNSwxLDMsNywxNCw2LDksMTEsOCwxMiwyLDEwLDAsNCwxMyw4LDYsNCwxLDMsMTEsMTUsMCw1LDEyLDIsMTMsOSw3LDEwLDE0LDEyLDE1LDEwLDQsMSw1LDgsNyw2LDIsMTMsMTQsMCwzLDksMTFdO3ZhciBzbD1bMTEsMTQsMTUsMTIsNSw4LDcsOSwxMSwxMywxNCwxNSw2LDcsOSw4LDcsNiw4LDEzLDExLDksNywxNSw3LDEyLDE1LDksMTEsNywxMywxMiwxMSwxMyw2LDcsMTQsOSwxMywxNSwxNCw4LDEzLDYsNSwxMiw3LDUsMTEsMTIsMTQsMTUsMTQsMTUsOSw4LDksMTQsNSw2LDgsNiw1LDEyLDksMTUsNSwxMSw2LDgsMTMsMTIsNSwxMiwxMywxNCwxMSw4LDUsNl07dmFyIHNyPVs4LDksOSwxMSwxMywxNSwxNSw1LDcsNyw4LDExLDE0LDE0LDEyLDYsOSwxMywxNSw3LDEyLDgsOSwxMSw3LDcsMTIsNyw2LDE1LDEzLDExLDksNywxNSwxMSw4LDYsNiwxNCwxMiwxMyw1LDE0LDEzLDEzLDcsNSwxNSw1LDgsMTEsMTQsMTQsNiwxNCw2LDksMTIsOSwxMiw1LDE1LDgsOCw1LDEyLDksMTIsNSwxNCw2LDgsMTMsNiw1LDE1LDEzLDExLDExXTt2YXIgaGw9WzAsMTUxODUwMDI0OSwxODU5Nzc1MzkzLDI0MDA5NTk3MDgsMjg0MDg1MzgzOF07dmFyIGhyPVsxMzUyODI5OTI2LDE1NDg2MDM2ODQsMTgzNjA3MjY5MSwyMDUzOTk0MjE3LDBdO2Z1bmN0aW9uIFJJUEVNRDE2MCgpe0hhc2hCYXNlLmNhbGwodGhpcyw2NCk7dGhpcy5fYT0xNzMyNTg0MTkzO3RoaXMuX2I9NDAyMzIzMzQxNzt0aGlzLl9jPTI1NjIzODMxMDI7dGhpcy5fZD0yNzE3MzM4Nzg7dGhpcy5fZT0zMjg1Mzc3NTIwfWluaGVyaXRzKFJJUEVNRDE2MCxIYXNoQmFzZSk7UklQRU1EMTYwLnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKCl7dmFyIHdvcmRzPUFSUkFZMTY7Zm9yKHZhciBqPTA7ajwxNjsrK2opd29yZHNbal09dGhpcy5fYmxvY2sucmVhZEludDMyTEUoaio0KTt2YXIgYWw9dGhpcy5fYXwwO3ZhciBibD10aGlzLl9ifDA7dmFyIGNsPXRoaXMuX2N8MDt2YXIgZGw9dGhpcy5fZHwwO3ZhciBlbD10aGlzLl9lfDA7dmFyIGFyPXRoaXMuX2F8MDt2YXIgYnI9dGhpcy5fYnwwO3ZhciBjcj10aGlzLl9jfDA7dmFyIGRyPXRoaXMuX2R8MDt2YXIgZXI9dGhpcy5fZXwwO2Zvcih2YXIgaT0wO2k8ODA7aSs9MSl7dmFyIHRsO3ZhciB0cjtpZihpPDE2KXt0bD1mbjEoYWwsYmwsY2wsZGwsZWwsd29yZHNbemxbaV1dLGhsWzBdLHNsW2ldKTt0cj1mbjUoYXIsYnIsY3IsZHIsZXIsd29yZHNbenJbaV1dLGhyWzBdLHNyW2ldKX1lbHNlIGlmKGk8MzIpe3RsPWZuMihhbCxibCxjbCxkbCxlbCx3b3Jkc1t6bFtpXV0saGxbMV0sc2xbaV0pO3RyPWZuNChhcixicixjcixkcixlcix3b3Jkc1t6cltpXV0saHJbMV0sc3JbaV0pfWVsc2UgaWYoaTw0OCl7dGw9Zm4zKGFsLGJsLGNsLGRsLGVsLHdvcmRzW3psW2ldXSxobFsyXSxzbFtpXSk7dHI9Zm4zKGFyLGJyLGNyLGRyLGVyLHdvcmRzW3pyW2ldXSxoclsyXSxzcltpXSl9ZWxzZSBpZihpPDY0KXt0bD1mbjQoYWwsYmwsY2wsZGwsZWwsd29yZHNbemxbaV1dLGhsWzNdLHNsW2ldKTt0cj1mbjIoYXIsYnIsY3IsZHIsZXIsd29yZHNbenJbaV1dLGhyWzNdLHNyW2ldKX1lbHNle3RsPWZuNShhbCxibCxjbCxkbCxlbCx3b3Jkc1t6bFtpXV0saGxbNF0sc2xbaV0pO3RyPWZuMShhcixicixjcixkcixlcix3b3Jkc1t6cltpXV0saHJbNF0sc3JbaV0pfWFsPWVsO2VsPWRsO2RsPXJvdGwoY2wsMTApO2NsPWJsO2JsPXRsO2FyPWVyO2VyPWRyO2RyPXJvdGwoY3IsMTApO2NyPWJyO2JyPXRyfXZhciB0PXRoaXMuX2IrY2wrZHJ8MDt0aGlzLl9iPXRoaXMuX2MrZGwrZXJ8MDt0aGlzLl9jPXRoaXMuX2QrZWwrYXJ8MDt0aGlzLl9kPXRoaXMuX2UrYWwrYnJ8MDt0aGlzLl9lPXRoaXMuX2ErYmwrY3J8MDt0aGlzLl9hPXR9O1JJUEVNRDE2MC5wcm90b3R5cGUuX2RpZ2VzdD1mdW5jdGlvbigpe3RoaXMuX2Jsb2NrW3RoaXMuX2Jsb2NrT2Zmc2V0KytdPTEyODtpZih0aGlzLl9ibG9ja09mZnNldD41Nil7dGhpcy5fYmxvY2suZmlsbCgwLHRoaXMuX2Jsb2NrT2Zmc2V0LDY0KTt0aGlzLl91cGRhdGUoKTt0aGlzLl9ibG9ja09mZnNldD0wfXRoaXMuX2Jsb2NrLmZpbGwoMCx0aGlzLl9ibG9ja09mZnNldCw1Nik7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJMRSh0aGlzLl9sZW5ndGhbMF0sNTYpO3RoaXMuX2Jsb2NrLndyaXRlVUludDMyTEUodGhpcy5fbGVuZ3RoWzFdLDYwKTt0aGlzLl91cGRhdGUoKTt2YXIgYnVmZmVyPUJ1ZmZlci5hbGxvYz9CdWZmZXIuYWxsb2MoMjApOm5ldyBCdWZmZXIoMjApO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fYSwwKTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2IsNCk7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9jLDgpO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fZCwxMik7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9lLDE2KTtyZXR1cm4gYnVmZmVyfTtmdW5jdGlvbiByb3RsKHgsbil7cmV0dXJuIHg8PG58eD4+PjMyLW59ZnVuY3Rpb24gZm4xKGEsYixjLGQsZSxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYl5jXmQpK20ra3wwLHMpK2V8MH1mdW5jdGlvbiBmbjIoYSxiLGMsZCxlLG0sayxzKXtyZXR1cm4gcm90bChhKyhiJmN8fmImZCkrbStrfDAscykrZXwwfWZ1bmN0aW9uIGZuMyhhLGIsYyxkLGUsbSxrLHMpe3JldHVybiByb3RsKGErKChifH5jKV5kKSttK2t8MCxzKStlfDB9ZnVuY3Rpb24gZm40KGEsYixjLGQsZSxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYiZkfGMmfmQpK20ra3wwLHMpK2V8MH1mdW5jdGlvbiBmbjUoYSxiLGMsZCxlLG0sayxzKXtyZXR1cm4gcm90bChhKyhiXihjfH5kKSkrbStrfDAscykrZXwwfW1vZHVsZS5leHBvcnRzPVJJUEVNRDE2MH0se2J1ZmZlcjoyNywiaGFzaC1iYXNlIjozNCxpbmhlcml0czozNn1dLDgyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgYnVmZmVyPXJlcXVpcmUoImJ1ZmZlciIpO3ZhciBCdWZmZXI9YnVmZmVyLkJ1ZmZlcjtmdW5jdGlvbiBjb3B5UHJvcHMoc3JjLGRzdCl7Zm9yKHZhciBrZXkgaW4gc3JjKXtkc3Rba2V5XT1zcmNba2V5XX19aWYoQnVmZmVyLmZyb20mJkJ1ZmZlci5hbGxvYyYmQnVmZmVyLmFsbG9jVW5zYWZlJiZCdWZmZXIuYWxsb2NVbnNhZmVTbG93KXttb2R1bGUuZXhwb3J0cz1idWZmZXJ9ZWxzZXtjb3B5UHJvcHMoYnVmZmVyLGV4cG9ydHMpO2V4cG9ydHMuQnVmZmVyPVNhZmVCdWZmZXJ9ZnVuY3Rpb24gU2FmZUJ1ZmZlcihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe3JldHVybiBCdWZmZXIoYXJnLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX1TYWZlQnVmZmVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKEJ1ZmZlci5wcm90b3R5cGUpO2NvcHlQcm9wcyhCdWZmZXIsU2FmZUJ1ZmZlcik7U2FmZUJ1ZmZlci5mcm9tPWZ1bmN0aW9uKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl7aWYodHlwZW9mIGFyZz09PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IG5vdCBiZSBhIG51bWJlciIpfXJldHVybiBCdWZmZXIoYXJnLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX07U2FmZUJ1ZmZlci5hbGxvYz1mdW5jdGlvbihzaXplLGZpbGwsZW5jb2Rpbmcpe2lmKHR5cGVvZiBzaXplIT09Im51bWJlciIpe3Rocm93IG5ldyBUeXBlRXJyb3IoIkFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXIiKX12YXIgYnVmPUJ1ZmZlcihzaXplKTtpZihmaWxsIT09dW5kZWZpbmVkKXtpZih0eXBlb2YgZW5jb2Rpbmc9PT0ic3RyaW5nIil7YnVmLmZpbGwoZmlsbCxlbmNvZGluZyl9ZWxzZXtidWYuZmlsbChmaWxsKX19ZWxzZXtidWYuZmlsbCgwKX1yZXR1cm4gYnVmfTtTYWZlQnVmZmVyLmFsbG9jVW5zYWZlPWZ1bmN0aW9uKHNpemUpe2lmKHR5cGVvZiBzaXplIT09Im51bWJlciIpe3Rocm93IG5ldyBUeXBlRXJyb3IoIkFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXIiKX1yZXR1cm4gQnVmZmVyKHNpemUpfTtTYWZlQnVmZmVyLmFsbG9jVW5zYWZlU2xvdz1mdW5jdGlvbihzaXplKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9cmV0dXJuIGJ1ZmZlci5TbG93QnVmZmVyKHNpemUpfX0se2J1ZmZlcjoyN31dLDgzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2Vzcyl7InVzZSBzdHJpY3QiO3ZhciBidWZmZXI9cmVxdWlyZSgiYnVmZmVyIik7dmFyIEJ1ZmZlcj1idWZmZXIuQnVmZmVyO3ZhciBzYWZlcj17fTt2YXIga2V5O2ZvcihrZXkgaW4gYnVmZmVyKXtpZighYnVmZmVyLmhhc093blByb3BlcnR5KGtleSkpY29udGludWU7aWYoa2V5PT09IlNsb3dCdWZmZXIifHxrZXk9PT0iQnVmZmVyIiljb250aW51ZTtzYWZlcltrZXldPWJ1ZmZlcltrZXldfXZhciBTYWZlcj1zYWZlci5CdWZmZXI9e307Zm9yKGtleSBpbiBCdWZmZXIpe2lmKCFCdWZmZXIuaGFzT3duUHJvcGVydHkoa2V5KSljb250aW51ZTtpZihrZXk9PT0iYWxsb2NVbnNhZmUifHxrZXk9PT0iYWxsb2NVbnNhZmVTbG93Iiljb250aW51ZTtTYWZlcltrZXldPUJ1ZmZlcltrZXldfXNhZmVyLkJ1ZmZlci5wcm90b3R5cGU9QnVmZmVyLnByb3RvdHlwZTtpZighU2FmZXIuZnJvbXx8U2FmZXIuZnJvbT09PVVpbnQ4QXJyYXkuZnJvbSl7U2FmZXIuZnJvbT1mdW5jdGlvbih2YWx1ZSxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl7aWYodHlwZW9mIHZhbHVlPT09Im51bWJlciIpe3Rocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSAidmFsdWUiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG9mIHR5cGUgbnVtYmVyLiBSZWNlaXZlZCB0eXBlICcrdHlwZW9mIHZhbHVlKX1pZih2YWx1ZSYmdHlwZW9mIHZhbHVlLmxlbmd0aD09PSJ1bmRlZmluZWQiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCBvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAiK3R5cGVvZiB2YWx1ZSl9cmV0dXJuIEJ1ZmZlcih2YWx1ZSxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl9fWlmKCFTYWZlci5hbGxvYyl7U2FmZXIuYWxsb2M9ZnVuY3Rpb24oc2l6ZSxmaWxsLGVuY29kaW5nKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgInNpemUiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuIFJlY2VpdmVkIHR5cGUgJyt0eXBlb2Ygc2l6ZSl9aWYoc2l6ZTwwfHxzaXplPj0yKigxPDwzMCkpe3Rocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgIicrc2l6ZSsnIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gInNpemUiJyl9dmFyIGJ1Zj1CdWZmZXIoc2l6ZSk7aWYoIWZpbGx8fGZpbGwubGVuZ3RoPT09MCl7YnVmLmZpbGwoMCl9ZWxzZSBpZih0eXBlb2YgZW5jb2Rpbmc9PT0ic3RyaW5nIil7YnVmLmZpbGwoZmlsbCxlbmNvZGluZyl9ZWxzZXtidWYuZmlsbChmaWxsKX1yZXR1cm4gYnVmfX1pZighc2FmZXIua1N0cmluZ01heExlbmd0aCl7dHJ5e3NhZmVyLmtTdHJpbmdNYXhMZW5ndGg9cHJvY2Vzcy5iaW5kaW5nKCJidWZmZXIiKS5rU3RyaW5nTWF4TGVuZ3RofWNhdGNoKGUpe319aWYoIXNhZmVyLmNvbnN0YW50cyl7c2FmZXIuY29uc3RhbnRzPXtNQVhfTEVOR1RIOnNhZmVyLmtNYXhMZW5ndGh9O2lmKHNhZmVyLmtTdHJpbmdNYXhMZW5ndGgpe3NhZmVyLmNvbnN0YW50cy5NQVhfU1RSSU5HX0xFTkdUSD1zYWZlci5rU3RyaW5nTWF4TGVuZ3RofX1tb2R1bGUuZXhwb3J0cz1zYWZlcn0pLmNhbGwodGhpcyxyZXF1aXJlKCJfcHJvY2VzcyIpKX0se19wcm9jZXNzOjY2LGJ1ZmZlcjoyN31dLDg0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgcGJrZGYyPXJlcXVpcmUoInBia2RmMiIpO3ZhciBNQVhfVkFMVUU9MjE0NzQ4MzY0NztmdW5jdGlvbiBzY3J5cHQoa2V5LHNhbHQsTixyLHAsZGtMZW4scHJvZ3Jlc3NDYWxsYmFjayl7aWYoTj09PTB8fChOJk4tMSkhPT0wKXRocm93IEVycm9yKCJOIG11c3QgYmUgPiAwIGFuZCBhIHBvd2VyIG9mIDIiKTtpZihOPk1BWF9WQUxVRS8xMjgvcil0aHJvdyBFcnJvcigiUGFyYW1ldGVyIE4gaXMgdG9vIGxhcmdlIik7aWYocj5NQVhfVkFMVUUvMTI4L3ApdGhyb3cgRXJyb3IoIlBhcmFtZXRlciByIGlzIHRvbyBsYXJnZSIpO3ZhciBYWT1uZXcgQnVmZmVyKDI1NipyKTt2YXIgVj1uZXcgQnVmZmVyKDEyOCpyKk4pO3ZhciBCMzI9bmV3IEludDMyQXJyYXkoMTYpO3ZhciB4PW5ldyBJbnQzMkFycmF5KDE2KTt2YXIgX1g9bmV3IEJ1ZmZlcig2NCk7dmFyIEI9cGJrZGYyLnBia2RmMlN5bmMoa2V5LHNhbHQsMSxwKjEyOCpyLCJzaGEyNTYiKTt2YXIgdGlja0NhbGxiYWNrO2lmKHByb2dyZXNzQ2FsbGJhY2spe3ZhciB0b3RhbE9wcz1wKk4qMjt2YXIgY3VycmVudE9wPTA7dGlja0NhbGxiYWNrPWZ1bmN0aW9uKCl7KytjdXJyZW50T3A7aWYoY3VycmVudE9wJTFlMz09PTApe3Byb2dyZXNzQ2FsbGJhY2soe2N1cnJlbnQ6Y3VycmVudE9wLHRvdGFsOnRvdGFsT3BzLHBlcmNlbnQ6Y3VycmVudE9wL3RvdGFsT3BzKjEwMH0pfX19Zm9yKHZhciBpPTA7aTxwO2krKyl7c21peChCLGkqMTI4KnIscixOLFYsWFkpfXJldHVybiBwYmtkZjIucGJrZGYyU3luYyhrZXksQiwxLGRrTGVuLCJzaGEyNTYiKTtmdW5jdGlvbiBzbWl4KEIsQmkscixOLFYsWFkpe3ZhciBYaT0wO3ZhciBZaT0xMjgqcjt2YXIgaTtCLmNvcHkoWFksWGksQmksQmkrWWkpO2ZvcihpPTA7aTxOO2krKyl7WFkuY29weShWLGkqWWksWGksWGkrWWkpO2Jsb2NrbWl4X3NhbHNhOChYWSxYaSxZaSxyKTtpZih0aWNrQ2FsbGJhY2spdGlja0NhbGxiYWNrKCl9Zm9yKGk9MDtpPE47aSsrKXt2YXIgb2Zmc2V0PVhpKygyKnItMSkqNjQ7dmFyIGo9WFkucmVhZFVJbnQzMkxFKG9mZnNldCkmTi0xO2Jsb2NreG9yKFYsaipZaSxYWSxYaSxZaSk7YmxvY2ttaXhfc2Fsc2E4KFhZLFhpLFlpLHIpO2lmKHRpY2tDYWxsYmFjayl0aWNrQ2FsbGJhY2soKX1YWS5jb3B5KEIsQmksWGksWGkrWWkpfWZ1bmN0aW9uIGJsb2NrbWl4X3NhbHNhOChCWSxCaSxZaSxyKXt2YXIgaTthcnJheWNvcHkoQlksQmkrKDIqci0xKSo2NCxfWCwwLDY0KTtmb3IoaT0wO2k8MipyO2krKyl7YmxvY2t4b3IoQlksaSo2NCxfWCwwLDY0KTtzYWxzYTIwXzgoX1gpO2FycmF5Y29weShfWCwwLEJZLFlpK2kqNjQsNjQpfWZvcihpPTA7aTxyO2krKyl7YXJyYXljb3B5KEJZLFlpK2kqMio2NCxCWSxCaStpKjY0LDY0KX1mb3IoaT0wO2k8cjtpKyspe2FycmF5Y29weShCWSxZaSsoaSoyKzEpKjY0LEJZLEJpKyhpK3IpKjY0LDY0KX19ZnVuY3Rpb24gUihhLGIpe3JldHVybiBhPDxifGE+Pj4zMi1ifWZ1bmN0aW9uIHNhbHNhMjBfOChCKXt2YXIgaTtmb3IoaT0wO2k8MTY7aSsrKXtCMzJbaV09KEJbaSo0KzBdJjI1NSk8PDA7QjMyW2ldfD0oQltpKjQrMV0mMjU1KTw8ODtCMzJbaV18PShCW2kqNCsyXSYyNTUpPDwxNjtCMzJbaV18PShCW2kqNCszXSYyNTUpPDwyNH1hcnJheWNvcHkoQjMyLDAseCwwLDE2KTtmb3IoaT04O2k+MDtpLT0yKXt4WzRdXj1SKHhbMF0reFsxMl0sNyk7eFs4XV49Uih4WzRdK3hbMF0sOSk7eFsxMl1ePVIoeFs4XSt4WzRdLDEzKTt4WzBdXj1SKHhbMTJdK3hbOF0sMTgpO3hbOV1ePVIoeFs1XSt4WzFdLDcpO3hbMTNdXj1SKHhbOV0reFs1XSw5KTt4WzFdXj1SKHhbMTNdK3hbOV0sMTMpO3hbNV1ePVIoeFsxXSt4WzEzXSwxOCk7eFsxNF1ePVIoeFsxMF0reFs2XSw3KTt4WzJdXj1SKHhbMTRdK3hbMTBdLDkpO3hbNl1ePVIoeFsyXSt4WzE0XSwxMyk7eFsxMF1ePVIoeFs2XSt4WzJdLDE4KTt4WzNdXj1SKHhbMTVdK3hbMTFdLDcpO3hbN11ePVIoeFszXSt4WzE1XSw5KTt4WzExXV49Uih4WzddK3hbM10sMTMpO3hbMTVdXj1SKHhbMTFdK3hbN10sMTgpO3hbMV1ePVIoeFswXSt4WzNdLDcpO3hbMl1ePVIoeFsxXSt4WzBdLDkpO3hbM11ePVIoeFsyXSt4WzFdLDEzKTt4WzBdXj1SKHhbM10reFsyXSwxOCk7eFs2XV49Uih4WzVdK3hbNF0sNyk7eFs3XV49Uih4WzZdK3hbNV0sOSk7eFs0XV49Uih4WzddK3hbNl0sMTMpO3hbNV1ePVIoeFs0XSt4WzddLDE4KTt4WzExXV49Uih4WzEwXSt4WzldLDcpO3hbOF1ePVIoeFsxMV0reFsxMF0sOSk7eFs5XV49Uih4WzhdK3hbMTFdLDEzKTt4WzEwXV49Uih4WzldK3hbOF0sMTgpO3hbMTJdXj1SKHhbMTVdK3hbMTRdLDcpO3hbMTNdXj1SKHhbMTJdK3hbMTVdLDkpO3hbMTRdXj1SKHhbMTNdK3hbMTJdLDEzKTt4WzE1XV49Uih4WzE0XSt4WzEzXSwxOCl9Zm9yKGk9MDtpPDE2OysraSlCMzJbaV09eFtpXStCMzJbaV07Zm9yKGk9MDtpPDE2O2krKyl7dmFyIGJpPWkqNDtCW2JpKzBdPUIzMltpXT4+MCYyNTU7QltiaSsxXT1CMzJbaV0+PjgmMjU1O0JbYmkrMl09QjMyW2ldPj4xNiYyNTU7QltiaSszXT1CMzJbaV0+PjI0JjI1NX19ZnVuY3Rpb24gYmxvY2t4b3IoUyxTaSxELERpLGxlbil7Zm9yKHZhciBpPTA7aTxsZW47aSsrKXtEW0RpK2ldXj1TW1NpK2ldfX19ZnVuY3Rpb24gYXJyYXljb3B5KHNyYyxzcmNQb3MsZGVzdCxkZXN0UG9zLGxlbmd0aCl7aWYoQnVmZmVyLmlzQnVmZmVyKHNyYykmJkJ1ZmZlci5pc0J1ZmZlcihkZXN0KSl7c3JjLmNvcHkoZGVzdCxkZXN0UG9zLHNyY1BvcyxzcmNQb3MrbGVuZ3RoKX1lbHNle3doaWxlKGxlbmd0aC0tKXtkZXN0W2Rlc3RQb3MrK109c3JjW3NyY1BvcysrXX19fW1vZHVsZS5leHBvcnRzPXNjcnlwdH0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7YnVmZmVyOjI3LHBia2RmMjo2MH1dLDg1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgYWxlYT1yZXF1aXJlKCIuL2xpYi9hbGVhIik7dmFyIHhvcjEyOD1yZXF1aXJlKCIuL2xpYi94b3IxMjgiKTt2YXIgeG9yd293PXJlcXVpcmUoIi4vbGliL3hvcndvdyIpO3ZhciB4b3JzaGlmdDc9cmVxdWlyZSgiLi9saWIveG9yc2hpZnQ3Iik7dmFyIHhvcjQwOTY9cmVxdWlyZSgiLi9saWIveG9yNDA5NiIpO3ZhciB0eWNoZWk9cmVxdWlyZSgiLi9saWIvdHljaGVpIik7dmFyIHNyPXJlcXVpcmUoIi4vc2VlZHJhbmRvbSIpO3NyLmFsZWE9YWxlYTtzci54b3IxMjg9eG9yMTI4O3NyLnhvcndvdz14b3J3b3c7c3IueG9yc2hpZnQ3PXhvcnNoaWZ0Nztzci54b3I0MDk2PXhvcjQwOTY7c3IudHljaGVpPXR5Y2hlaTttb2R1bGUuZXhwb3J0cz1zcn0seyIuL2xpYi9hbGVhIjo4NiwiLi9saWIvdHljaGVpIjo4NywiLi9saWIveG9yMTI4Ijo4OCwiLi9saWIveG9yNDA5NiI6ODksIi4vbGliL3hvcnNoaWZ0NyI6OTAsIi4vbGliL3hvcndvdyI6OTEsIi4vc2VlZHJhbmRvbSI6OTJ9XSw4NjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKGdsb2JhbCxtb2R1bGUsZGVmaW5lKXtmdW5jdGlvbiBBbGVhKHNlZWQpe3ZhciBtZT10aGlzLG1hc2g9TWFzaCgpO21lLm5leHQ9ZnVuY3Rpb24oKXt2YXIgdD0yMDkxNjM5Km1lLnMwK21lLmMqMi4zMjgzMDY0MzY1Mzg2OTYzZS0xMDttZS5zMD1tZS5zMTttZS5zMT1tZS5zMjtyZXR1cm4gbWUuczI9dC0obWUuYz10fDApfTttZS5jPTE7bWUuczA9bWFzaCgiICIpO21lLnMxPW1hc2goIiAiKTttZS5zMj1tYXNoKCIgIik7bWUuczAtPW1hc2goc2VlZCk7aWYobWUuczA8MCl7bWUuczArPTF9bWUuczEtPW1hc2goc2VlZCk7aWYobWUuczE8MCl7bWUuczErPTF9bWUuczItPW1hc2goc2VlZCk7aWYobWUuczI8MCl7bWUuczIrPTF9bWFzaD1udWxsfWZ1bmN0aW9uIGNvcHkoZix0KXt0LmM9Zi5jO3QuczA9Zi5zMDt0LnMxPWYuczE7dC5zMj1mLnMyO3JldHVybiB0fWZ1bmN0aW9uIGltcGwoc2VlZCxvcHRzKXt2YXIgeGc9bmV3IEFsZWEoc2VlZCksc3RhdGU9b3B0cyYmb3B0cy5zdGF0ZSxwcm5nPXhnLm5leHQ7cHJuZy5pbnQzMj1mdW5jdGlvbigpe3JldHVybiB4Zy5uZXh0KCkqNDI5NDk2NzI5NnwwfTtwcm5nLmRvdWJsZT1mdW5jdGlvbigpe3JldHVybiBwcm5nKCkrKHBybmcoKSoyMDk3MTUyfDApKjExMTAyMjMwMjQ2MjUxNTY1ZS0zMn07cHJuZy5xdWljaz1wcm5nO2lmKHN0YXRlKXtpZih0eXBlb2Ygc3RhdGU9PSJvYmplY3QiKWNvcHkoc3RhdGUseGcpO3Bybmcuc3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gY29weSh4Zyx7fSl9fXJldHVybiBwcm5nfWZ1bmN0aW9uIE1hc2goKXt2YXIgbj00MDIyODcxMTk3O3ZhciBtYXNoPWZ1bmN0aW9uKGRhdGEpe2RhdGE9U3RyaW5nKGRhdGEpO2Zvcih2YXIgaT0wO2k8ZGF0YS5sZW5ndGg7aSsrKXtuKz1kYXRhLmNoYXJDb2RlQXQoaSk7dmFyIGg9LjAyNTE5NjAzMjgyNDE2OTM4Km47bj1oPj4+MDtoLT1uO2gqPW47bj1oPj4+MDtoLT1uO24rPWgqNDI5NDk2NzI5Nn1yZXR1cm4obj4+PjApKjIuMzI4MzA2NDM2NTM4Njk2M2UtMTB9O3JldHVybiBtYXNofWlmKG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMpe21vZHVsZS5leHBvcnRzPWltcGx9ZWxzZSBpZihkZWZpbmUmJmRlZmluZS5hbWQpe2RlZmluZShmdW5jdGlvbigpe3JldHVybiBpbXBsfSl9ZWxzZXt0aGlzLmFsZWE9aW1wbH19KSh0aGlzLHR5cGVvZiBtb2R1bGU9PSJvYmplY3QiJiZtb2R1bGUsdHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lKX0se31dLDg3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oZ2xvYmFsLG1vZHVsZSxkZWZpbmUpe2Z1bmN0aW9uIFhvckdlbihzZWVkKXt2YXIgbWU9dGhpcyxzdHJzZWVkPSIiO21lLm5leHQ9ZnVuY3Rpb24oKXt2YXIgYj1tZS5iLGM9bWUuYyxkPW1lLmQsYT1tZS5hO2I9Yjw8MjVeYj4+PjdeYztjPWMtZHwwO2Q9ZDw8MjReZD4+PjheYTthPWEtYnwwO21lLmI9Yj1iPDwyMF5iPj4+MTJeYzttZS5jPWM9Yy1kfDA7bWUuZD1kPDwxNl5jPj4+MTZeYTtyZXR1cm4gbWUuYT1hLWJ8MH07bWUuYT0wO21lLmI9MDttZS5jPTI2NTQ0MzU3Njl8MDttZS5kPTEzNjcxMzA1NTE7aWYoc2VlZD09PU1hdGguZmxvb3Ioc2VlZCkpe21lLmE9c2VlZC80Mjk0OTY3Mjk2fDA7bWUuYj1zZWVkfDB9ZWxzZXtzdHJzZWVkKz1zZWVkfWZvcih2YXIgaz0wO2s8c3Ryc2VlZC5sZW5ndGgrMjA7aysrKXttZS5iXj1zdHJzZWVkLmNoYXJDb2RlQXQoayl8MDttZS5uZXh0KCl9fWZ1bmN0aW9uIGNvcHkoZix0KXt0LmE9Zi5hO3QuYj1mLmI7dC5jPWYuYzt0LmQ9Zi5kO3JldHVybiB0fWZ1bmN0aW9uIGltcGwoc2VlZCxvcHRzKXt2YXIgeGc9bmV3IFhvckdlbihzZWVkKSxzdGF0ZT1vcHRzJiZvcHRzLnN0YXRlLHBybmc9ZnVuY3Rpb24oKXtyZXR1cm4oeGcubmV4dCgpPj4+MCkvNDI5NDk2NzI5Nn07cHJuZy5kb3VibGU9ZnVuY3Rpb24oKXtkb3t2YXIgdG9wPXhnLm5leHQoKT4+PjExLGJvdD0oeGcubmV4dCgpPj4+MCkvNDI5NDk2NzI5NixyZXN1bHQ9KHRvcCtib3QpLygxPDwyMSl9d2hpbGUocmVzdWx0PT09MCk7cmV0dXJuIHJlc3VsdH07cHJuZy5pbnQzMj14Zy5uZXh0O3BybmcucXVpY2s9cHJuZztpZihzdGF0ZSl7aWYodHlwZW9mIHN0YXRlPT0ib2JqZWN0Iiljb3B5KHN0YXRlLHhnKTtwcm5nLnN0YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIGNvcHkoeGcse30pfX1yZXR1cm4gcHJuZ31pZihtb2R1bGUmJm1vZHVsZS5leHBvcnRzKXttb2R1bGUuZXhwb3J0cz1pbXBsfWVsc2UgaWYoZGVmaW5lJiZkZWZpbmUuYW1kKXtkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gaW1wbH0pfWVsc2V7dGhpcy50eWNoZWk9aW1wbH19KSh0aGlzLHR5cGVvZiBtb2R1bGU9PSJvYmplY3QiJiZtb2R1bGUsdHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lKX0se31dLDg4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oZ2xvYmFsLG1vZHVsZSxkZWZpbmUpe2Z1bmN0aW9uIFhvckdlbihzZWVkKXt2YXIgbWU9dGhpcyxzdHJzZWVkPSIiO21lLng9MDttZS55PTA7bWUuej0wO21lLnc9MDttZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIHQ9bWUueF5tZS54PDwxMTttZS54PW1lLnk7bWUueT1tZS56O21lLno9bWUudztyZXR1cm4gbWUud149bWUudz4+PjE5XnRedD4+Pjh9O2lmKHNlZWQ9PT0oc2VlZHwwKSl7bWUueD1zZWVkfWVsc2V7c3Ryc2VlZCs9c2VlZH1mb3IodmFyIGs9MDtrPHN0cnNlZWQubGVuZ3RoKzY0O2srKyl7bWUueF49c3Ryc2VlZC5jaGFyQ29kZUF0KGspfDA7bWUubmV4dCgpfX1mdW5jdGlvbiBjb3B5KGYsdCl7dC54PWYueDt0Lnk9Zi55O3Quej1mLno7dC53PWYudztyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7dmFyIHhnPW5ldyBYb3JHZW4oc2VlZCksc3RhdGU9b3B0cyYmb3B0cy5zdGF0ZSxwcm5nPWZ1bmN0aW9uKCl7cmV0dXJuKHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTZ9O3BybmcuZG91YmxlPWZ1bmN0aW9uKCl7ZG97dmFyIHRvcD14Zy5uZXh0KCk+Pj4xMSxib3Q9KHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTYscmVzdWx0PSh0b3ArYm90KS8oMTw8MjEpfXdoaWxlKHJlc3VsdD09PTApO3JldHVybiByZXN1bHR9O3BybmcuaW50MzI9eGcubmV4dDtwcm5nLnF1aWNrPXBybmc7aWYoc3RhdGUpe2lmKHR5cGVvZiBzdGF0ZT09Im9iamVjdCIpY29weShzdGF0ZSx4Zyk7cHJuZy5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiBjb3B5KHhnLHt9KX19cmV0dXJuIHBybmd9aWYobW9kdWxlJiZtb2R1bGUuZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9aW1wbH1lbHNlIGlmKGRlZmluZSYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIGltcGx9KX1lbHNle3RoaXMueG9yMTI4PWltcGx9fSkodGhpcyx0eXBlb2YgbW9kdWxlPT0ib2JqZWN0IiYmbW9kdWxlLHR5cGVvZiBkZWZpbmU9PSJmdW5jdGlvbiImJmRlZmluZSl9LHt9XSw4OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKGdsb2JhbCxtb2R1bGUsZGVmaW5lKXtmdW5jdGlvbiBYb3JHZW4oc2VlZCl7dmFyIG1lPXRoaXM7bWUubmV4dD1mdW5jdGlvbigpe3ZhciB3PW1lLncsWD1tZS5YLGk9bWUuaSx0LHY7bWUudz13PXcrMTY0MDUzMTUyN3wwO3Y9WFtpKzM0JjEyN107dD1YW2k9aSsxJjEyN107dl49djw8MTM7dF49dDw8MTc7dl49dj4+PjE1O3RePXQ+Pj4xMjt2PVhbaV09dl50O21lLmk9aTtyZXR1cm4gdisod153Pj4+MTYpfDB9O2Z1bmN0aW9uIGluaXQobWUsc2VlZCl7dmFyIHQsdixpLGosdyxYPVtdLGxpbWl0PTEyODtpZihzZWVkPT09KHNlZWR8MCkpe3Y9c2VlZDtzZWVkPW51bGx9ZWxzZXtzZWVkPXNlZWQrIlwwIjt2PTA7bGltaXQ9TWF0aC5tYXgobGltaXQsc2VlZC5sZW5ndGgpfWZvcihpPTAsaj0tMzI7ajxsaW1pdDsrK2ope2lmKHNlZWQpdl49c2VlZC5jaGFyQ29kZUF0KChqKzMyKSVzZWVkLmxlbmd0aCk7aWYoaj09PTApdz12O3ZePXY8PDEwO3ZePXY+Pj4xNTt2Xj12PDw0O3ZePXY+Pj4xMztpZihqPj0wKXt3PXcrMTY0MDUzMTUyN3wwO3Q9WFtqJjEyN11ePXYrdztpPTA9PXQ/aSsxOjB9fWlmKGk+PTEyOCl7WFsoc2VlZCYmc2VlZC5sZW5ndGh8fDApJjEyN109LTF9aT0xMjc7Zm9yKGo9NCoxMjg7aj4wOy0tail7dj1YW2krMzQmMTI3XTt0PVhbaT1pKzEmMTI3XTt2Xj12PDwxMzt0Xj10PDwxNzt2Xj12Pj4+MTU7dF49dD4+PjEyO1hbaV09dl50fW1lLnc9dzttZS5YPVg7bWUuaT1pfWluaXQobWUsc2VlZCl9ZnVuY3Rpb24gY29weShmLHQpe3QuaT1mLmk7dC53PWYudzt0Llg9Zi5YLnNsaWNlKCk7cmV0dXJuIHR9ZnVuY3Rpb24gaW1wbChzZWVkLG9wdHMpe2lmKHNlZWQ9PW51bGwpc2VlZD0rbmV3IERhdGU7dmFyIHhnPW5ldyBYb3JHZW4oc2VlZCksc3RhdGU9b3B0cyYmb3B0cy5zdGF0ZSxwcm5nPWZ1bmN0aW9uKCl7cmV0dXJuKHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTZ9O3BybmcuZG91YmxlPWZ1bmN0aW9uKCl7ZG97dmFyIHRvcD14Zy5uZXh0KCk+Pj4xMSxib3Q9KHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTYscmVzdWx0PSh0b3ArYm90KS8oMTw8MjEpfXdoaWxlKHJlc3VsdD09PTApO3JldHVybiByZXN1bHR9O3BybmcuaW50MzI9eGcubmV4dDtwcm5nLnF1aWNrPXBybmc7aWYoc3RhdGUpe2lmKHN0YXRlLlgpY29weShzdGF0ZSx4Zyk7cHJuZy5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiBjb3B5KHhnLHt9KX19cmV0dXJuIHBybmd9aWYobW9kdWxlJiZtb2R1bGUuZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9aW1wbH1lbHNlIGlmKGRlZmluZSYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIGltcGx9KX1lbHNle3RoaXMueG9yNDA5Nj1pbXBsfX0pKHRoaXMsdHlwZW9mIG1vZHVsZT09Im9iamVjdCImJm1vZHVsZSx0eXBlb2YgZGVmaW5lPT0iZnVuY3Rpb24iJiZkZWZpbmUpfSx7fV0sOTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwsbW9kdWxlLGRlZmluZSl7ZnVuY3Rpb24gWG9yR2VuKHNlZWQpe3ZhciBtZT10aGlzO21lLm5leHQ9ZnVuY3Rpb24oKXt2YXIgWD1tZS54LGk9bWUuaSx0LHYsdzt0PVhbaV07dF49dD4+Pjc7dj10XnQ8PDI0O3Q9WFtpKzEmN107dl49dF50Pj4+MTA7dD1YW2krMyY3XTt2Xj10XnQ+Pj4zO3Q9WFtpKzQmN107dl49dF50PDw3O3Q9WFtpKzcmN107dD10XnQ8PDEzO3ZePXRedDw8OTtYW2ldPXY7bWUuaT1pKzEmNztyZXR1cm4gdn07ZnVuY3Rpb24gaW5pdChtZSxzZWVkKXt2YXIgaix3LFg9W107aWYoc2VlZD09PShzZWVkfDApKXt3PVhbMF09c2VlZH1lbHNle3NlZWQ9IiIrc2VlZDtmb3Ioaj0wO2o8c2VlZC5sZW5ndGg7KytqKXtYW2omN109WFtqJjddPDwxNV5zZWVkLmNoYXJDb2RlQXQoaikrWFtqKzEmN108PDEzfX13aGlsZShYLmxlbmd0aDw4KVgucHVzaCgwKTtmb3Ioaj0wO2o8OCYmWFtqXT09PTA7KytqKTtpZihqPT04KXc9WFs3XT0tMTtlbHNlIHc9WFtqXTttZS54PVg7bWUuaT0wO2ZvcihqPTI1NjtqPjA7LS1qKXttZS5uZXh0KCl9fWluaXQobWUsc2VlZCl9ZnVuY3Rpb24gY29weShmLHQpe3QueD1mLnguc2xpY2UoKTt0Lmk9Zi5pO3JldHVybiB0fWZ1bmN0aW9uIGltcGwoc2VlZCxvcHRzKXtpZihzZWVkPT1udWxsKXNlZWQ9K25ldyBEYXRlO3ZhciB4Zz1uZXcgWG9yR2VuKHNlZWQpLHN0YXRlPW9wdHMmJm9wdHMuc3RhdGUscHJuZz1mdW5jdGlvbigpe3JldHVybih4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2fTtwcm5nLmRvdWJsZT1mdW5jdGlvbigpe2Rve3ZhciB0b3A9eGcubmV4dCgpPj4+MTEsYm90PSh4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2LHJlc3VsdD0odG9wK2JvdCkvKDE8PDIxKX13aGlsZShyZXN1bHQ9PT0wKTtyZXR1cm4gcmVzdWx0fTtwcm5nLmludDMyPXhnLm5leHQ7cHJuZy5xdWljaz1wcm5nO2lmKHN0YXRlKXtpZihzdGF0ZS54KWNvcHkoc3RhdGUseGcpO3Bybmcuc3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gY29weSh4Zyx7fSl9fXJldHVybiBwcm5nfWlmKG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMpe21vZHVsZS5leHBvcnRzPWltcGx9ZWxzZSBpZihkZWZpbmUmJmRlZmluZS5hbWQpe2RlZmluZShmdW5jdGlvbigpe3JldHVybiBpbXBsfSl9ZWxzZXt0aGlzLnhvcnNoaWZ0Nz1pbXBsfX0pKHRoaXMsdHlwZW9mIG1vZHVsZT09Im9iamVjdCImJm1vZHVsZSx0eXBlb2YgZGVmaW5lPT0iZnVuY3Rpb24iJiZkZWZpbmUpfSx7fV0sOTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwsbW9kdWxlLGRlZmluZSl7ZnVuY3Rpb24gWG9yR2VuKHNlZWQpe3ZhciBtZT10aGlzLHN0cnNlZWQ9IiI7bWUubmV4dD1mdW5jdGlvbigpe3ZhciB0PW1lLnhebWUueD4+PjI7bWUueD1tZS55O21lLnk9bWUuejttZS56PW1lLnc7bWUudz1tZS52O3JldHVybihtZS5kPW1lLmQrMzYyNDM3fDApKyhtZS52PW1lLnZebWUudjw8NF4odF50PDwxKSl8MH07bWUueD0wO21lLnk9MDttZS56PTA7bWUudz0wO21lLnY9MDtpZihzZWVkPT09KHNlZWR8MCkpe21lLng9c2VlZH1lbHNle3N0cnNlZWQrPXNlZWR9Zm9yKHZhciBrPTA7azxzdHJzZWVkLmxlbmd0aCs2NDtrKyspe21lLnhePXN0cnNlZWQuY2hhckNvZGVBdChrKXwwO2lmKGs9PXN0cnNlZWQubGVuZ3RoKXttZS5kPW1lLng8PDEwXm1lLng+Pj40fW1lLm5leHQoKX19ZnVuY3Rpb24gY29weShmLHQpe3QueD1mLng7dC55PWYueTt0Lno9Zi56O3Qudz1mLnc7dC52PWYudjt0LmQ9Zi5kO3JldHVybiB0fWZ1bmN0aW9uIGltcGwoc2VlZCxvcHRzKXt2YXIgeGc9bmV3IFhvckdlbihzZWVkKSxzdGF0ZT1vcHRzJiZvcHRzLnN0YXRlLHBybmc9ZnVuY3Rpb24oKXtyZXR1cm4oeGcubmV4dCgpPj4+MCkvNDI5NDk2NzI5Nn07cHJuZy5kb3VibGU9ZnVuY3Rpb24oKXtkb3t2YXIgdG9wPXhnLm5leHQoKT4+PjExLGJvdD0oeGcubmV4dCgpPj4+MCkvNDI5NDk2NzI5NixyZXN1bHQ9KHRvcCtib3QpLygxPDwyMSl9d2hpbGUocmVzdWx0PT09MCk7cmV0dXJuIHJlc3VsdH07cHJuZy5pbnQzMj14Zy5uZXh0O3BybmcucXVpY2s9cHJuZztpZihzdGF0ZSl7aWYodHlwZW9mIHN0YXRlPT0ib2JqZWN0Iiljb3B5KHN0YXRlLHhnKTtwcm5nLnN0YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIGNvcHkoeGcse30pfX1yZXR1cm4gcHJuZ31pZihtb2R1bGUmJm1vZHVsZS5leHBvcnRzKXttb2R1bGUuZXhwb3J0cz1pbXBsfWVsc2UgaWYoZGVmaW5lJiZkZWZpbmUuYW1kKXtkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gaW1wbH0pfWVsc2V7dGhpcy54b3J3b3c9aW1wbH19KSh0aGlzLHR5cGVvZiBtb2R1bGU9PSJvYmplY3QiJiZtb2R1bGUsdHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lKX0se31dLDkyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocG9vbCxtYXRoKXt2YXIgZ2xvYmFsPSgwLGV2YWwpKCJ0aGlzIiksd2lkdGg9MjU2LGNodW5rcz02LGRpZ2l0cz01MixybmduYW1lPSJyYW5kb20iLHN0YXJ0ZGVub209bWF0aC5wb3cod2lkdGgsY2h1bmtzKSxzaWduaWZpY2FuY2U9bWF0aC5wb3coMixkaWdpdHMpLG92ZXJmbG93PXNpZ25pZmljYW5jZSoyLG1hc2s9d2lkdGgtMSxub2RlY3J5cHRvO2Z1bmN0aW9uIHNlZWRyYW5kb20oc2VlZCxvcHRpb25zLGNhbGxiYWNrKXt2YXIga2V5PVtdO29wdGlvbnM9b3B0aW9ucz09dHJ1ZT97ZW50cm9weTp0cnVlfTpvcHRpb25zfHx7fTt2YXIgc2hvcnRzZWVkPW1peGtleShmbGF0dGVuKG9wdGlvbnMuZW50cm9weT9bc2VlZCx0b3N0cmluZyhwb29sKV06c2VlZD09bnVsbD9hdXRvc2VlZCgpOnNlZWQsMyksa2V5KTt2YXIgYXJjND1uZXcgQVJDNChrZXkpO3ZhciBwcm5nPWZ1bmN0aW9uKCl7dmFyIG49YXJjNC5nKGNodW5rcyksZD1zdGFydGRlbm9tLHg9MDt3aGlsZShuPHNpZ25pZmljYW5jZSl7bj0obit4KSp3aWR0aDtkKj13aWR0aDt4PWFyYzQuZygxKX13aGlsZShuPj1vdmVyZmxvdyl7bi89MjtkLz0yO3g+Pj49MX1yZXR1cm4obit4KS9kfTtwcm5nLmludDMyPWZ1bmN0aW9uKCl7cmV0dXJuIGFyYzQuZyg0KXwwfTtwcm5nLnF1aWNrPWZ1bmN0aW9uKCl7cmV0dXJuIGFyYzQuZyg0KS80Mjk0OTY3Mjk2fTtwcm5nLmRvdWJsZT1wcm5nO21peGtleSh0b3N0cmluZyhhcmM0LlMpLHBvb2wpO3JldHVybihvcHRpb25zLnBhc3N8fGNhbGxiYWNrfHxmdW5jdGlvbihwcm5nLHNlZWQsaXNfbWF0aF9jYWxsLHN0YXRlKXtpZihzdGF0ZSl7aWYoc3RhdGUuUyl7Y29weShzdGF0ZSxhcmM0KX1wcm5nLnN0YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIGNvcHkoYXJjNCx7fSl9fWlmKGlzX21hdGhfY2FsbCl7bWF0aFtybmduYW1lXT1wcm5nO3JldHVybiBzZWVkfWVsc2UgcmV0dXJuIHBybmd9KShwcm5nLHNob3J0c2VlZCwiZ2xvYmFsImluIG9wdGlvbnM/b3B0aW9ucy5nbG9iYWw6dGhpcz09bWF0aCxvcHRpb25zLnN0YXRlKX1mdW5jdGlvbiBBUkM0KGtleSl7dmFyIHQsa2V5bGVuPWtleS5sZW5ndGgsbWU9dGhpcyxpPTAsaj1tZS5pPW1lLmo9MCxzPW1lLlM9W107aWYoIWtleWxlbil7a2V5PVtrZXlsZW4rK119d2hpbGUoaTx3aWR0aCl7c1tpXT1pKyt9Zm9yKGk9MDtpPHdpZHRoO2krKyl7c1tpXT1zW2o9bWFzayZqK2tleVtpJWtleWxlbl0rKHQ9c1tpXSldO3Nbal09dH0obWUuZz1mdW5jdGlvbihjb3VudCl7dmFyIHQscj0wLGk9bWUuaSxqPW1lLmoscz1tZS5TO3doaWxlKGNvdW50LS0pe3Q9c1tpPW1hc2smaSsxXTtyPXIqd2lkdGgrc1ttYXNrJihzW2ldPXNbaj1tYXNrJmordF0pKyhzW2pdPXQpXX1tZS5pPWk7bWUuaj1qO3JldHVybiByfSkod2lkdGgpfWZ1bmN0aW9uIGNvcHkoZix0KXt0Lmk9Zi5pO3Quaj1mLmo7dC5TPWYuUy5zbGljZSgpO3JldHVybiB0fWZ1bmN0aW9uIGZsYXR0ZW4ob2JqLGRlcHRoKXt2YXIgcmVzdWx0PVtdLHR5cD10eXBlb2Ygb2JqLHByb3A7aWYoZGVwdGgmJnR5cD09Im9iamVjdCIpe2Zvcihwcm9wIGluIG9iail7dHJ5e3Jlc3VsdC5wdXNoKGZsYXR0ZW4ob2JqW3Byb3BdLGRlcHRoLTEpKX1jYXRjaChlKXt9fX1yZXR1cm4gcmVzdWx0Lmxlbmd0aD9yZXN1bHQ6dHlwPT0ic3RyaW5nIj9vYmo6b2JqKyJcMCJ9ZnVuY3Rpb24gbWl4a2V5KHNlZWQsa2V5KXt2YXIgc3RyaW5nc2VlZD1zZWVkKyIiLHNtZWFyLGo9MDt3aGlsZShqPHN0cmluZ3NlZWQubGVuZ3RoKXtrZXlbbWFzayZqXT1tYXNrJihzbWVhcl49a2V5W21hc2smal0qMTkpK3N0cmluZ3NlZWQuY2hhckNvZGVBdChqKyspfXJldHVybiB0b3N0cmluZyhrZXkpfWZ1bmN0aW9uIGF1dG9zZWVkKCl7dHJ5e3ZhciBvdXQ7aWYobm9kZWNyeXB0byYmKG91dD1ub2RlY3J5cHRvLnJhbmRvbUJ5dGVzKSl7b3V0PW91dCh3aWR0aCl9ZWxzZXtvdXQ9bmV3IFVpbnQ4QXJyYXkod2lkdGgpOyhnbG9iYWwuY3J5cHRvfHxnbG9iYWwubXNDcnlwdG8pLmdldFJhbmRvbVZhbHVlcyhvdXQpfXJldHVybiB0b3N0cmluZyhvdXQpfWNhdGNoKGUpe3ZhciBicm93c2VyPWdsb2JhbC5uYXZpZ2F0b3IscGx1Z2lucz1icm93c2VyJiZicm93c2VyLnBsdWdpbnM7cmV0dXJuWytuZXcgRGF0ZSxnbG9iYWwscGx1Z2lucyxnbG9iYWwuc2NyZWVuLHRvc3RyaW5nKHBvb2wpXX19ZnVuY3Rpb24gdG9zdHJpbmcoYSl7cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoMCxhKX1taXhrZXkobWF0aC5yYW5kb20oKSxwb29sKTtpZih0eXBlb2YgbW9kdWxlPT0ib2JqZWN0IiYmbW9kdWxlLmV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXNlZWRyYW5kb207dHJ5e25vZGVjcnlwdG89cmVxdWlyZSgiY3J5cHRvIil9Y2F0Y2goZXgpe319ZWxzZSBpZih0eXBlb2YgZGVmaW5lPT0iZnVuY3Rpb24iJiZkZWZpbmUuYW1kKXtkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gc2VlZHJhbmRvbX0pfWVsc2V7bWF0aFsic2VlZCIrcm5nbmFtZV09c2VlZHJhbmRvbX19KShbXSxNYXRoKX0se2NyeXB0bzoyNn1dLDkzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO2Z1bmN0aW9uIEhhc2goYmxvY2tTaXplLGZpbmFsU2l6ZSl7dGhpcy5fYmxvY2s9QnVmZmVyLmFsbG9jKGJsb2NrU2l6ZSk7dGhpcy5fZmluYWxTaXplPWZpbmFsU2l6ZTt0aGlzLl9ibG9ja1NpemU9YmxvY2tTaXplO3RoaXMuX2xlbj0wfUhhc2gucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbihkYXRhLGVuYyl7aWYodHlwZW9mIGRhdGE9PT0ic3RyaW5nIil7ZW5jPWVuY3x8InV0ZjgiO2RhdGE9QnVmZmVyLmZyb20oZGF0YSxlbmMpfXZhciBibG9jaz10aGlzLl9ibG9jazt2YXIgYmxvY2tTaXplPXRoaXMuX2Jsb2NrU2l6ZTt2YXIgbGVuZ3RoPWRhdGEubGVuZ3RoO3ZhciBhY2N1bT10aGlzLl9sZW47Zm9yKHZhciBvZmZzZXQ9MDtvZmZzZXQ8bGVuZ3RoOyl7dmFyIGFzc2lnbmVkPWFjY3VtJWJsb2NrU2l6ZTt2YXIgcmVtYWluZGVyPU1hdGgubWluKGxlbmd0aC1vZmZzZXQsYmxvY2tTaXplLWFzc2lnbmVkKTtmb3IodmFyIGk9MDtpPHJlbWFpbmRlcjtpKyspe2Jsb2NrW2Fzc2lnbmVkK2ldPWRhdGFbb2Zmc2V0K2ldfWFjY3VtKz1yZW1haW5kZXI7b2Zmc2V0Kz1yZW1haW5kZXI7aWYoYWNjdW0lYmxvY2tTaXplPT09MCl7dGhpcy5fdXBkYXRlKGJsb2NrKX19dGhpcy5fbGVuKz1sZW5ndGg7cmV0dXJuIHRoaXN9O0hhc2gucHJvdG90eXBlLmRpZ2VzdD1mdW5jdGlvbihlbmMpe3ZhciByZW09dGhpcy5fbGVuJXRoaXMuX2Jsb2NrU2l6ZTt0aGlzLl9ibG9ja1tyZW1dPTEyODt0aGlzLl9ibG9jay5maWxsKDAscmVtKzEpO2lmKHJlbT49dGhpcy5fZmluYWxTaXplKXt0aGlzLl91cGRhdGUodGhpcy5fYmxvY2spO3RoaXMuX2Jsb2NrLmZpbGwoMCl9dmFyIGJpdHM9dGhpcy5fbGVuKjg7aWYoYml0czw9NDI5NDk2NzI5NSl7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJCRShiaXRzLHRoaXMuX2Jsb2NrU2l6ZS00KX1lbHNle3ZhciBsb3dCaXRzPShiaXRzJjQyOTQ5NjcyOTUpPj4+MDt2YXIgaGlnaEJpdHM9KGJpdHMtbG93Qml0cykvNDI5NDk2NzI5Njt0aGlzLl9ibG9jay53cml0ZVVJbnQzMkJFKGhpZ2hCaXRzLHRoaXMuX2Jsb2NrU2l6ZS04KTt0aGlzLl9ibG9jay53cml0ZVVJbnQzMkJFKGxvd0JpdHMsdGhpcy5fYmxvY2tTaXplLTQpfXRoaXMuX3VwZGF0ZSh0aGlzLl9ibG9jayk7dmFyIGhhc2g9dGhpcy5faGFzaCgpO3JldHVybiBlbmM/aGFzaC50b1N0cmluZyhlbmMpOmhhc2h9O0hhc2gucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oKXt0aHJvdyBuZXcgRXJyb3IoIl91cGRhdGUgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzcyIpfTttb2R1bGUuZXhwb3J0cz1IYXNofSx7InNhZmUtYnVmZmVyIjo4Mn1dLDk0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgZXhwb3J0cz1tb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBTSEEoYWxnb3JpdGhtKXthbGdvcml0aG09YWxnb3JpdGhtLnRvTG93ZXJDYXNlKCk7dmFyIEFsZ29yaXRobT1leHBvcnRzW2FsZ29yaXRobV07aWYoIUFsZ29yaXRobSl0aHJvdyBuZXcgRXJyb3IoYWxnb3JpdGhtKyIgaXMgbm90IHN1cHBvcnRlZCAod2UgYWNjZXB0IHB1bGwgcmVxdWVzdHMpIik7cmV0dXJuIG5ldyBBbGdvcml0aG19O2V4cG9ydHMuc2hhPXJlcXVpcmUoIi4vc2hhIik7ZXhwb3J0cy5zaGExPXJlcXVpcmUoIi4vc2hhMSIpO2V4cG9ydHMuc2hhMjI0PXJlcXVpcmUoIi4vc2hhMjI0Iik7ZXhwb3J0cy5zaGEyNTY9cmVxdWlyZSgiLi9zaGEyNTYiKTtleHBvcnRzLnNoYTM4ND1yZXF1aXJlKCIuL3NoYTM4NCIpO2V4cG9ydHMuc2hhNTEyPXJlcXVpcmUoIi4vc2hhNTEyIil9LHsiLi9zaGEiOjk1LCIuL3NoYTEiOjk2LCIuL3NoYTIyNCI6OTcsIi4vc2hhMjU2Ijo5OCwiLi9zaGEzODQiOjk5LCIuL3NoYTUxMiI6MTAwfV0sOTU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBIYXNoPXJlcXVpcmUoIi4vaGFzaCIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIEs9WzE1MTg1MDAyNDksMTg1OTc3NTM5MywyNDAwOTU5NzA4fDAsMzM5NTQ2OTc4MnwwXTt2YXIgVz1uZXcgQXJyYXkoODApO2Z1bmN0aW9uIFNoYSgpe3RoaXMuaW5pdCgpO3RoaXMuX3c9VztIYXNoLmNhbGwodGhpcyw2NCw1Nil9aW5oZXJpdHMoU2hhLEhhc2gpO1NoYS5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3RoaXMuX2E9MTczMjU4NDE5Mzt0aGlzLl9iPTQwMjMyMzM0MTc7dGhpcy5fYz0yNTYyMzgzMTAyO3RoaXMuX2Q9MjcxNzMzODc4O3RoaXMuX2U9MzI4NTM3NzUyMDtyZXR1cm4gdGhpc307ZnVuY3Rpb24gcm90bDUobnVtKXtyZXR1cm4gbnVtPDw1fG51bT4+PjI3fWZ1bmN0aW9uIHJvdGwzMChudW0pe3JldHVybiBudW08PDMwfG51bT4+PjJ9ZnVuY3Rpb24gZnQocyxiLGMsZCl7aWYocz09PTApcmV0dXJuIGImY3x+YiZkO2lmKHM9PT0yKXJldHVybiBiJmN8YiZkfGMmZDtyZXR1cm4gYl5jXmR9U2hhLnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKE0pe3ZhciBXPXRoaXMuX3c7dmFyIGE9dGhpcy5fYXwwO3ZhciBiPXRoaXMuX2J8MDt2YXIgYz10aGlzLl9jfDA7dmFyIGQ9dGhpcy5fZHwwO3ZhciBlPXRoaXMuX2V8MDtmb3IodmFyIGk9MDtpPDE2OysraSlXW2ldPU0ucmVhZEludDMyQkUoaSo0KTtmb3IoO2k8ODA7KytpKVdbaV09V1tpLTNdXldbaS04XV5XW2ktMTRdXldbaS0xNl07Zm9yKHZhciBqPTA7ajw4MDsrK2ope3ZhciBzPX5+KGovMjApO3ZhciB0PXJvdGw1KGEpK2Z0KHMsYixjLGQpK2UrV1tqXStLW3NdfDA7ZT1kO2Q9YztjPXJvdGwzMChiKTtiPWE7YT10fXRoaXMuX2E9YSt0aGlzLl9hfDA7dGhpcy5fYj1iK3RoaXMuX2J8MDt0aGlzLl9jPWMrdGhpcy5fY3wwO3RoaXMuX2Q9ZCt0aGlzLl9kfDA7dGhpcy5fZT1lK3RoaXMuX2V8MH07U2hhLnByb3RvdHlwZS5faGFzaD1mdW5jdGlvbigpe3ZhciBIPUJ1ZmZlci5hbGxvY1Vuc2FmZSgyMCk7SC53cml0ZUludDMyQkUodGhpcy5fYXwwLDApO0gud3JpdGVJbnQzMkJFKHRoaXMuX2J8MCw0KTtILndyaXRlSW50MzJCRSh0aGlzLl9jfDAsOCk7SC53cml0ZUludDMyQkUodGhpcy5fZHwwLDEyKTtILndyaXRlSW50MzJCRSh0aGlzLl9lfDAsMTYpO3JldHVybiBIfTttb2R1bGUuZXhwb3J0cz1TaGF9LHsiLi9oYXNoIjo5Myxpbmhlcml0czozNiwic2FmZS1idWZmZXIiOjgyfV0sOTY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBIYXNoPXJlcXVpcmUoIi4vaGFzaCIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIEs9WzE1MTg1MDAyNDksMTg1OTc3NTM5MywyNDAwOTU5NzA4fDAsMzM5NTQ2OTc4MnwwXTt2YXIgVz1uZXcgQXJyYXkoODApO2Z1bmN0aW9uIFNoYTEoKXt0aGlzLmluaXQoKTt0aGlzLl93PVc7SGFzaC5jYWxsKHRoaXMsNjQsNTYpfWluaGVyaXRzKFNoYTEsSGFzaCk7U2hhMS5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3RoaXMuX2E9MTczMjU4NDE5Mzt0aGlzLl9iPTQwMjMyMzM0MTc7dGhpcy5fYz0yNTYyMzgzMTAyO3RoaXMuX2Q9MjcxNzMzODc4O3RoaXMuX2U9MzI4NTM3NzUyMDtyZXR1cm4gdGhpc307ZnVuY3Rpb24gcm90bDEobnVtKXtyZXR1cm4gbnVtPDwxfG51bT4+PjMxfWZ1bmN0aW9uIHJvdGw1KG51bSl7cmV0dXJuIG51bTw8NXxudW0+Pj4yN31mdW5jdGlvbiByb3RsMzAobnVtKXtyZXR1cm4gbnVtPDwzMHxudW0+Pj4yfWZ1bmN0aW9uIGZ0KHMsYixjLGQpe2lmKHM9PT0wKXJldHVybiBiJmN8fmImZDtpZihzPT09MilyZXR1cm4gYiZjfGImZHxjJmQ7cmV0dXJuIGJeY15kfVNoYTEucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oTSl7dmFyIFc9dGhpcy5fdzt2YXIgYT10aGlzLl9hfDA7dmFyIGI9dGhpcy5fYnwwO3ZhciBjPXRoaXMuX2N8MDt2YXIgZD10aGlzLl9kfDA7dmFyIGU9dGhpcy5fZXwwO2Zvcih2YXIgaT0wO2k8MTY7KytpKVdbaV09TS5yZWFkSW50MzJCRShpKjQpO2Zvcig7aTw4MDsrK2kpV1tpXT1yb3RsMShXW2ktM11eV1tpLThdXldbaS0xNF1eV1tpLTE2XSk7Zm9yKHZhciBqPTA7ajw4MDsrK2ope3ZhciBzPX5+KGovMjApO3ZhciB0PXJvdGw1KGEpK2Z0KHMsYixjLGQpK2UrV1tqXStLW3NdfDA7ZT1kO2Q9YztjPXJvdGwzMChiKTtiPWE7YT10fXRoaXMuX2E9YSt0aGlzLl9hfDA7dGhpcy5fYj1iK3RoaXMuX2J8MDt0aGlzLl9jPWMrdGhpcy5fY3wwO3RoaXMuX2Q9ZCt0aGlzLl9kfDA7dGhpcy5fZT1lK3RoaXMuX2V8MH07U2hhMS5wcm90b3R5cGUuX2hhc2g9ZnVuY3Rpb24oKXt2YXIgSD1CdWZmZXIuYWxsb2NVbnNhZmUoMjApO0gud3JpdGVJbnQzMkJFKHRoaXMuX2F8MCwwKTtILndyaXRlSW50MzJCRSh0aGlzLl9ifDAsNCk7SC53cml0ZUludDMyQkUodGhpcy5fY3wwLDgpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2R8MCwxMik7SC53cml0ZUludDMyQkUodGhpcy5fZXwwLDE2KTtyZXR1cm4gSH07bW9kdWxlLmV4cG9ydHM9U2hhMX0seyIuL2hhc2giOjkzLGluaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODJ9XSw5NzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIFNoYTI1Nj1yZXF1aXJlKCIuL3NoYTI1NiIpO3ZhciBIYXNoPXJlcXVpcmUoIi4vaGFzaCIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIFc9bmV3IEFycmF5KDY0KTtmdW5jdGlvbiBTaGEyMjQoKXt0aGlzLmluaXQoKTt0aGlzLl93PVc7SGFzaC5jYWxsKHRoaXMsNjQsNTYpfWluaGVyaXRzKFNoYTIyNCxTaGEyNTYpO1NoYTIyNC5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3RoaXMuX2E9MzIzODM3MTAzMjt0aGlzLl9iPTkxNDE1MDY2Mzt0aGlzLl9jPTgxMjcwMjk5OTt0aGlzLl9kPTQxNDQ5MTI2OTc7dGhpcy5fZT00MjkwNzc1ODU3O3RoaXMuX2Y9MTc1MDYwMzAyNTt0aGlzLl9nPTE2OTQwNzY4Mzk7dGhpcy5faD0zMjA0MDc1NDI4O3JldHVybiB0aGlzfTtTaGEyMjQucHJvdG90eXBlLl9oYXNoPWZ1bmN0aW9uKCl7dmFyIEg9QnVmZmVyLmFsbG9jVW5zYWZlKDI4KTtILndyaXRlSW50MzJCRSh0aGlzLl9hLDApO0gud3JpdGVJbnQzMkJFKHRoaXMuX2IsNCk7SC53cml0ZUludDMyQkUodGhpcy5fYyw4KTtILndyaXRlSW50MzJCRSh0aGlzLl9kLDEyKTtILndyaXRlSW50MzJCRSh0aGlzLl9lLDE2KTtILndyaXRlSW50MzJCRSh0aGlzLl9mLDIwKTtILndyaXRlSW50MzJCRSh0aGlzLl9nLDI0KTtyZXR1cm4gSH07bW9kdWxlLmV4cG9ydHM9U2hhMjI0fSx7Ii4vaGFzaCI6OTMsIi4vc2hhMjU2Ijo5OCxpbmhlcml0czozNiwic2FmZS1idWZmZXIiOjgyfV0sOTg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBIYXNoPXJlcXVpcmUoIi4vaGFzaCIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIEs9WzExMTYzNTI0MDgsMTg5OTQ0NzQ0MSwzMDQ5MzIzNDcxLDM5MjEwMDk1NzMsOTYxOTg3MTYzLDE1MDg5NzA5OTMsMjQ1MzYzNTc0OCwyODcwNzYzMjIxLDM2MjQzODEwODAsMzEwNTk4NDAxLDYwNzIyNTI3OCwxNDI2ODgxOTg3LDE5MjUwNzgzODgsMjE2MjA3ODIwNiwyNjE0ODg4MTAzLDMyNDgyMjI1ODAsMzgzNTM5MDQwMSw0MDIyMjI0Nzc0LDI2NDM0NzA3OCw2MDQ4MDc2MjgsNzcwMjU1OTgzLDEyNDkxNTAxMjIsMTU1NTA4MTY5MiwxOTk2MDY0OTg2LDI1NTQyMjA4ODIsMjgyMTgzNDM0OSwyOTUyOTk2ODA4LDMyMTAzMTM2NzEsMzMzNjU3MTg5MSwzNTg0NTI4NzExLDExMzkyNjk5MywzMzgyNDE4OTUsNjY2MzA3MjA1LDc3MzUyOTkxMiwxMjk0NzU3MzcyLDEzOTYxODIyOTEsMTY5NTE4MzcwMCwxOTg2NjYxMDUxLDIxNzcwMjYzNTAsMjQ1Njk1NjAzNywyNzMwNDg1OTIxLDI4MjAzMDI0MTEsMzI1OTczMDgwMCwzMzQ1NzY0NzcxLDM1MTYwNjU4MTcsMzYwMDM1MjgwNCw0MDk0NTcxOTA5LDI3NTQyMzM0NCw0MzAyMjc3MzQsNTA2OTQ4NjE2LDY1OTA2MDU1Niw4ODM5OTc4NzcsOTU4MTM5NTcxLDEzMjI4MjIyMTgsMTUzNzAwMjA2MywxNzQ3ODczNzc5LDE5NTU1NjIyMjIsMjAyNDEwNDgxNSwyMjI3NzMwNDUyLDIzNjE4NTI0MjQsMjQyODQzNjQ3NCwyNzU2NzM0MTg3LDMyMDQwMzE0NzksMzMyOTMyNTI5OF07dmFyIFc9bmV3IEFycmF5KDY0KTtmdW5jdGlvbiBTaGEyNTYoKXt0aGlzLmluaXQoKTt0aGlzLl93PVc7SGFzaC5jYWxsKHRoaXMsNjQsNTYpfWluaGVyaXRzKFNoYTI1NixIYXNoKTtTaGEyNTYucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt0aGlzLl9hPTE3NzkwMzM3MDM7dGhpcy5fYj0zMTQ0MTM0Mjc3O3RoaXMuX2M9MTAxMzkwNDI0Mjt0aGlzLl9kPTI3NzM0ODA3NjI7dGhpcy5fZT0xMzU5ODkzMTE5O3RoaXMuX2Y9MjYwMDgyMjkyNDt0aGlzLl9nPTUyODczNDYzNTt0aGlzLl9oPTE1NDE0NTkyMjU7cmV0dXJuIHRoaXN9O2Z1bmN0aW9uIGNoKHgseSx6KXtyZXR1cm4gel54Jih5XnopfWZ1bmN0aW9uIG1haih4LHkseil7cmV0dXJuIHgmeXx6Jih4fHkpfWZ1bmN0aW9uIHNpZ21hMCh4KXtyZXR1cm4oeD4+PjJ8eDw8MzApXih4Pj4+MTN8eDw8MTkpXih4Pj4+MjJ8eDw8MTApfWZ1bmN0aW9uIHNpZ21hMSh4KXtyZXR1cm4oeD4+PjZ8eDw8MjYpXih4Pj4+MTF8eDw8MjEpXih4Pj4+MjV8eDw8Nyl9ZnVuY3Rpb24gZ2FtbWEwKHgpe3JldHVybih4Pj4+N3x4PDwyNSleKHg+Pj4xOHx4PDwxNCleeD4+PjN9ZnVuY3Rpb24gZ2FtbWExKHgpe3JldHVybih4Pj4+MTd8eDw8MTUpXih4Pj4+MTl8eDw8MTMpXng+Pj4xMH1TaGEyNTYucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oTSl7dmFyIFc9dGhpcy5fdzt2YXIgYT10aGlzLl9hfDA7dmFyIGI9dGhpcy5fYnwwO3ZhciBjPXRoaXMuX2N8MDt2YXIgZD10aGlzLl9kfDA7dmFyIGU9dGhpcy5fZXwwO3ZhciBmPXRoaXMuX2Z8MDt2YXIgZz10aGlzLl9nfDA7dmFyIGg9dGhpcy5faHwwO2Zvcih2YXIgaT0wO2k8MTY7KytpKVdbaV09TS5yZWFkSW50MzJCRShpKjQpO2Zvcig7aTw2NDsrK2kpV1tpXT1nYW1tYTEoV1tpLTJdKStXW2ktN10rZ2FtbWEwKFdbaS0xNV0pK1dbaS0xNl18MDtmb3IodmFyIGo9MDtqPDY0Oysrail7dmFyIFQxPWgrc2lnbWExKGUpK2NoKGUsZixnKStLW2pdK1dbal18MDt2YXIgVDI9c2lnbWEwKGEpK21haihhLGIsYyl8MDtoPWc7Zz1mO2Y9ZTtlPWQrVDF8MDtkPWM7Yz1iO2I9YTthPVQxK1QyfDB9dGhpcy5fYT1hK3RoaXMuX2F8MDt0aGlzLl9iPWIrdGhpcy5fYnwwO3RoaXMuX2M9Yyt0aGlzLl9jfDA7dGhpcy5fZD1kK3RoaXMuX2R8MDt0aGlzLl9lPWUrdGhpcy5fZXwwO3RoaXMuX2Y9Zit0aGlzLl9mfDA7dGhpcy5fZz1nK3RoaXMuX2d8MDt0aGlzLl9oPWgrdGhpcy5faHwwfTtTaGEyNTYucHJvdG90eXBlLl9oYXNoPWZ1bmN0aW9uKCl7dmFyIEg9QnVmZmVyLmFsbG9jVW5zYWZlKDMyKTtILndyaXRlSW50MzJCRSh0aGlzLl9hLDApO0gud3JpdGVJbnQzMkJFKHRoaXMuX2IsNCk7SC53cml0ZUludDMyQkUodGhpcy5fYyw4KTtILndyaXRlSW50MzJCRSh0aGlzLl9kLDEyKTtILndyaXRlSW50MzJCRSh0aGlzLl9lLDE2KTtILndyaXRlSW50MzJCRSh0aGlzLl9mLDIwKTtILndyaXRlSW50MzJCRSh0aGlzLl9nLDI0KTtILndyaXRlSW50MzJCRSh0aGlzLl9oLDI4KTtyZXR1cm4gSH07bW9kdWxlLmV4cG9ydHM9U2hhMjU2fSx7Ii4vaGFzaCI6OTMsaW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4Mn1dLDk5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgU0hBNTEyPXJlcXVpcmUoIi4vc2hhNTEyIik7dmFyIEhhc2g9cmVxdWlyZSgiLi9oYXNoIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgVz1uZXcgQXJyYXkoMTYwKTtmdW5jdGlvbiBTaGEzODQoKXt0aGlzLmluaXQoKTt0aGlzLl93PVc7SGFzaC5jYWxsKHRoaXMsMTI4LDExMil9aW5oZXJpdHMoU2hhMzg0LFNIQTUxMik7U2hhMzg0LnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dGhpcy5fYWg9MzQxODA3MDM2NTt0aGlzLl9iaD0xNjU0MjcwMjUwO3RoaXMuX2NoPTI0Mzg1MjkzNzA7dGhpcy5fZGg9MzU1NDYyMzYwO3RoaXMuX2VoPTE3MzE0MDU0MTU7dGhpcy5fZmg9MjM5NDE4MDIzMTt0aGlzLl9naD0zNjc1MDA4NTI1O3RoaXMuX2hoPTEyMDMwNjI4MTM7dGhpcy5fYWw9MzIzODM3MTAzMjt0aGlzLl9ibD05MTQxNTA2NjM7dGhpcy5fY2w9ODEyNzAyOTk5O3RoaXMuX2RsPTQxNDQ5MTI2OTc7dGhpcy5fZWw9NDI5MDc3NTg1Nzt0aGlzLl9mbD0xNzUwNjAzMDI1O3RoaXMuX2dsPTE2OTQwNzY4Mzk7dGhpcy5faGw9MzIwNDA3NTQyODtyZXR1cm4gdGhpc307U2hhMzg0LnByb3RvdHlwZS5faGFzaD1mdW5jdGlvbigpe3ZhciBIPUJ1ZmZlci5hbGxvY1Vuc2FmZSg0OCk7ZnVuY3Rpb24gd3JpdGVJbnQ2NEJFKGgsbCxvZmZzZXQpe0gud3JpdGVJbnQzMkJFKGgsb2Zmc2V0KTtILndyaXRlSW50MzJCRShsLG9mZnNldCs0KX13cml0ZUludDY0QkUodGhpcy5fYWgsdGhpcy5fYWwsMCk7d3JpdGVJbnQ2NEJFKHRoaXMuX2JoLHRoaXMuX2JsLDgpO3dyaXRlSW50NjRCRSh0aGlzLl9jaCx0aGlzLl9jbCwxNik7d3JpdGVJbnQ2NEJFKHRoaXMuX2RoLHRoaXMuX2RsLDI0KTt3cml0ZUludDY0QkUodGhpcy5fZWgsdGhpcy5fZWwsMzIpO3dyaXRlSW50NjRCRSh0aGlzLl9maCx0aGlzLl9mbCw0MCk7cmV0dXJuIEh9O21vZHVsZS5leHBvcnRzPVNoYTM4NH0seyIuL2hhc2giOjkzLCIuL3NoYTUxMiI6MTAwLGluaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODJ9XSwxMDA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBIYXNoPXJlcXVpcmUoIi4vaGFzaCIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIEs9WzExMTYzNTI0MDgsMzYwOTc2NzQ1OCwxODk5NDQ3NDQxLDYwMjg5MTcyNSwzMDQ5MzIzNDcxLDM5NjQ0ODQzOTksMzkyMTAwOTU3MywyMTczMjk1NTQ4LDk2MTk4NzE2Myw0MDgxNjI4NDcyLDE1MDg5NzA5OTMsMzA1MzgzNDI2NSwyNDUzNjM1NzQ4LDI5Mzc2NzE1NzksMjg3MDc2MzIyMSwzNjY0NjA5NTYwLDM2MjQzODEwODAsMjczNDg4MzM5NCwzMTA1OTg0MDEsMTE2NDk5NjU0Miw2MDcyMjUyNzgsMTMyMzYxMDc2NCwxNDI2ODgxOTg3LDM1OTAzMDQ5OTQsMTkyNTA3ODM4OCw0MDY4MTgyMzgzLDIxNjIwNzgyMDYsOTkxMzM2MTEzLDI2MTQ4ODgxMDMsNjMzODAzMzE3LDMyNDgyMjI1ODAsMzQ3OTc3NDg2OCwzODM1MzkwNDAxLDI2NjY2MTM0NTgsNDAyMjIyNDc3NCw5NDQ3MTExMzksMjY0MzQ3MDc4LDIzNDEyNjI3NzMsNjA0ODA3NjI4LDIwMDc4MDA5MzMsNzcwMjU1OTgzLDE0OTU5OTA5MDEsMTI0OTE1MDEyMiwxODU2NDMxMjM1LDE1NTUwODE2OTIsMzE3NTIxODEzMiwxOTk2MDY0OTg2LDIxOTg5NTA4MzcsMjU1NDIyMDg4MiwzOTk5NzE5MzM5LDI4MjE4MzQzNDksNzY2Nzg0MDE2LDI5NTI5OTY4MDgsMjU2NjU5NDg3OSwzMjEwMzEzNjcxLDMyMDMzMzc5NTYsMzMzNjU3MTg5MSwxMDM0NDU3MDI2LDM1ODQ1Mjg3MTEsMjQ2Njk0ODkwMSwxMTM5MjY5OTMsMzc1ODMyNjM4MywzMzgyNDE4OTUsMTY4NzE3OTM2LDY2NjMwNzIwNSwxMTg4MTc5OTY0LDc3MzUyOTkxMiwxNTQ2MDQ1NzM0LDEyOTQ3NTczNzIsMTUyMjgwNTQ4NSwxMzk2MTgyMjkxLDI2NDM4MzM4MjMsMTY5NTE4MzcwMCwyMzQzNTI3MzkwLDE5ODY2NjEwNTEsMTAxNDQ3NzQ4MCwyMTc3MDI2MzUwLDEyMDY3NTkxNDIsMjQ1Njk1NjAzNywzNDQwNzc2MjcsMjczMDQ4NTkyMSwxMjkwODYzNDYwLDI4MjAzMDI0MTEsMzE1ODQ1NDI3MywzMjU5NzMwODAwLDM1MDU5NTI2NTcsMzM0NTc2NDc3MSwxMDYyMTcwMDgsMzUxNjA2NTgxNywzNjA2MDA4MzQ0LDM2MDAzNTI4MDQsMTQzMjcyNTc3Niw0MDk0NTcxOTA5LDE0NjcwMzE1OTQsMjc1NDIzMzQ0LDg1MTE2OTcyMCw0MzAyMjc3MzQsMzEwMDgyMzc1Miw1MDY5NDg2MTYsMTM2MzI1ODE5NSw2NTkwNjA1NTYsMzc1MDY4NTU5Myw4ODM5OTc4NzcsMzc4NTA1MDI4MCw5NTgxMzk1NzEsMzMxODMwNzQyNywxMzIyODIyMjE4LDM4MTI3MjM0MDMsMTUzNzAwMjA2MywyMDAzMDM0OTk1LDE3NDc4NzM3NzksMzYwMjAzNjg5OSwxOTU1NTYyMjIyLDE1NzU5OTAwMTIsMjAyNDEwNDgxNSwxMTI1NTkyOTI4LDIyMjc3MzA0NTIsMjcxNjkwNDMwNiwyMzYxODUyNDI0LDQ0Mjc3NjA0NCwyNDI4NDM2NDc0LDU5MzY5ODM0NCwyNzU2NzM0MTg3LDM3MzMxMTAyNDksMzIwNDAzMTQ3OSwyOTk5MzUxNTczLDMzMjkzMjUyOTgsMzgxNTkyMDQyNywzMzkxNTY5NjE0LDM5MjgzODM5MDAsMzUxNTI2NzI3MSw1NjYyODA3MTEsMzk0MDE4NzYwNiwzNDU0MDY5NTM0LDQxMTg2MzAyNzEsNDAwMDIzOTk5MiwxMTY0MTg0NzQsMTkxNDEzODU1NCwxNzQyOTI0MjEsMjczMTA1NTI3MCwyODkzODAzNTYsMzIwMzk5MzAwNiw0NjAzOTMyNjksMzIwNjIwMzE1LDY4NTQ3MTczMyw1ODc0OTY4MzYsODUyMTQyOTcxLDEwODY3OTI4NTEsMTAxNzAzNjI5OCwzNjU1NDMxMDAsMTEyNjAwMDU4MCwyNjE4Mjk3Njc2LDEyODgwMzM0NzAsMzQwOTg1NTE1OCwxNTAxNTA1OTQ4LDQyMzQ1MDk4NjYsMTYwNzE2NzkxNSw5ODcxNjc0NjgsMTgxNjQwMjMxNiwxMjQ2MTg5NTkxXTt2YXIgVz1uZXcgQXJyYXkoMTYwKTtmdW5jdGlvbiBTaGE1MTIoKXt0aGlzLmluaXQoKTt0aGlzLl93PVc7SGFzaC5jYWxsKHRoaXMsMTI4LDExMil9aW5oZXJpdHMoU2hhNTEyLEhhc2gpO1NoYTUxMi5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3RoaXMuX2FoPTE3NzkwMzM3MDM7dGhpcy5fYmg9MzE0NDEzNDI3Nzt0aGlzLl9jaD0xMDEzOTA0MjQyO3RoaXMuX2RoPTI3NzM0ODA3NjI7dGhpcy5fZWg9MTM1OTg5MzExOTt0aGlzLl9maD0yNjAwODIyOTI0O3RoaXMuX2doPTUyODczNDYzNTt0aGlzLl9oaD0xNTQxNDU5MjI1O3RoaXMuX2FsPTQwODkyMzU3MjA7dGhpcy5fYmw9MjIyNzg3MzU5NTt0aGlzLl9jbD00MjcxMTc1NzIzO3RoaXMuX2RsPTE1OTU3NTAxMjk7dGhpcy5fZWw9MjkxNzU2NTEzNzt0aGlzLl9mbD03MjU1MTExOTk7dGhpcy5fZ2w9NDIxNTM4OTU0Nzt0aGlzLl9obD0zMjcwMzMyMDk7cmV0dXJuIHRoaXN9O2Z1bmN0aW9uIENoKHgseSx6KXtyZXR1cm4gel54Jih5XnopfWZ1bmN0aW9uIG1haih4LHkseil7cmV0dXJuIHgmeXx6Jih4fHkpfWZ1bmN0aW9uIHNpZ21hMCh4LHhsKXtyZXR1cm4oeD4+PjI4fHhsPDw0KV4oeGw+Pj4yfHg8PDMwKV4oeGw+Pj43fHg8PDI1KX1mdW5jdGlvbiBzaWdtYTEoeCx4bCl7cmV0dXJuKHg+Pj4xNHx4bDw8MTgpXih4Pj4+MTh8eGw8PDE0KV4oeGw+Pj45fHg8PDIzKX1mdW5jdGlvbiBHYW1tYTAoeCx4bCl7cmV0dXJuKHg+Pj4xfHhsPDwzMSleKHg+Pj44fHhsPDwyNCleeD4+Pjd9ZnVuY3Rpb24gR2FtbWEwbCh4LHhsKXtyZXR1cm4oeD4+PjF8eGw8PDMxKV4oeD4+Pjh8eGw8PDI0KV4oeD4+Pjd8eGw8PDI1KX1mdW5jdGlvbiBHYW1tYTEoeCx4bCl7cmV0dXJuKHg+Pj4xOXx4bDw8MTMpXih4bD4+PjI5fHg8PDMpXng+Pj42fWZ1bmN0aW9uIEdhbW1hMWwoeCx4bCl7cmV0dXJuKHg+Pj4xOXx4bDw8MTMpXih4bD4+PjI5fHg8PDMpXih4Pj4+Nnx4bDw8MjYpfWZ1bmN0aW9uIGdldENhcnJ5KGEsYil7cmV0dXJuIGE+Pj4wPGI+Pj4wPzE6MH1TaGE1MTIucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oTSl7dmFyIFc9dGhpcy5fdzt2YXIgYWg9dGhpcy5fYWh8MDt2YXIgYmg9dGhpcy5fYmh8MDt2YXIgY2g9dGhpcy5fY2h8MDt2YXIgZGg9dGhpcy5fZGh8MDt2YXIgZWg9dGhpcy5fZWh8MDt2YXIgZmg9dGhpcy5fZmh8MDt2YXIgZ2g9dGhpcy5fZ2h8MDt2YXIgaGg9dGhpcy5faGh8MDt2YXIgYWw9dGhpcy5fYWx8MDt2YXIgYmw9dGhpcy5fYmx8MDt2YXIgY2w9dGhpcy5fY2x8MDt2YXIgZGw9dGhpcy5fZGx8MDt2YXIgZWw9dGhpcy5fZWx8MDt2YXIgZmw9dGhpcy5fZmx8MDt2YXIgZ2w9dGhpcy5fZ2x8MDt2YXIgaGw9dGhpcy5faGx8MDtmb3IodmFyIGk9MDtpPDMyO2krPTIpe1dbaV09TS5yZWFkSW50MzJCRShpKjQpO1dbaSsxXT1NLnJlYWRJbnQzMkJFKGkqNCs0KX1mb3IoO2k8MTYwO2krPTIpe3ZhciB4aD1XW2ktMTUqMl07dmFyIHhsPVdbaS0xNSoyKzFdO3ZhciBnYW1tYTA9R2FtbWEwKHhoLHhsKTt2YXIgZ2FtbWEwbD1HYW1tYTBsKHhsLHhoKTt4aD1XW2ktMioyXTt4bD1XW2ktMioyKzFdO3ZhciBnYW1tYTE9R2FtbWExKHhoLHhsKTt2YXIgZ2FtbWExbD1HYW1tYTFsKHhsLHhoKTt2YXIgV2k3aD1XW2ktNyoyXTt2YXIgV2k3bD1XW2ktNyoyKzFdO3ZhciBXaTE2aD1XW2ktMTYqMl07dmFyIFdpMTZsPVdbaS0xNioyKzFdO3ZhciBXaWw9Z2FtbWEwbCtXaTdsfDA7dmFyIFdpaD1nYW1tYTArV2k3aCtnZXRDYXJyeShXaWwsZ2FtbWEwbCl8MDtXaWw9V2lsK2dhbW1hMWx8MDtXaWg9V2loK2dhbW1hMStnZXRDYXJyeShXaWwsZ2FtbWExbCl8MDtXaWw9V2lsK1dpMTZsfDA7V2loPVdpaCtXaTE2aCtnZXRDYXJyeShXaWwsV2kxNmwpfDA7V1tpXT1XaWg7V1tpKzFdPVdpbH1mb3IodmFyIGo9MDtqPDE2MDtqKz0yKXtXaWg9V1tqXTtXaWw9V1tqKzFdO3ZhciBtYWpoPW1haihhaCxiaCxjaCk7dmFyIG1hamw9bWFqKGFsLGJsLGNsKTt2YXIgc2lnbWEwaD1zaWdtYTAoYWgsYWwpO3ZhciBzaWdtYTBsPXNpZ21hMChhbCxhaCk7dmFyIHNpZ21hMWg9c2lnbWExKGVoLGVsKTt2YXIgc2lnbWExbD1zaWdtYTEoZWwsZWgpO3ZhciBLaWg9S1tqXTt2YXIgS2lsPUtbaisxXTt2YXIgY2hoPUNoKGVoLGZoLGdoKTt2YXIgY2hsPUNoKGVsLGZsLGdsKTt2YXIgdDFsPWhsK3NpZ21hMWx8MDt2YXIgdDFoPWhoK3NpZ21hMWgrZ2V0Q2FycnkodDFsLGhsKXwwO3QxbD10MWwrY2hsfDA7dDFoPXQxaCtjaGgrZ2V0Q2FycnkodDFsLGNobCl8MDt0MWw9dDFsK0tpbHwwO3QxaD10MWgrS2loK2dldENhcnJ5KHQxbCxLaWwpfDA7dDFsPXQxbCtXaWx8MDt0MWg9dDFoK1dpaCtnZXRDYXJyeSh0MWwsV2lsKXwwO3ZhciB0Mmw9c2lnbWEwbCttYWpsfDA7dmFyIHQyaD1zaWdtYTBoK21hamgrZ2V0Q2FycnkodDJsLHNpZ21hMGwpfDA7aGg9Z2g7aGw9Z2w7Z2g9Zmg7Z2w9Zmw7Zmg9ZWg7Zmw9ZWw7ZWw9ZGwrdDFsfDA7ZWg9ZGgrdDFoK2dldENhcnJ5KGVsLGRsKXwwO2RoPWNoO2RsPWNsO2NoPWJoO2NsPWJsO2JoPWFoO2JsPWFsO2FsPXQxbCt0Mmx8MDthaD10MWgrdDJoK2dldENhcnJ5KGFsLHQxbCl8MH10aGlzLl9hbD10aGlzLl9hbCthbHwwO3RoaXMuX2JsPXRoaXMuX2JsK2JsfDA7dGhpcy5fY2w9dGhpcy5fY2wrY2x8MDt0aGlzLl9kbD10aGlzLl9kbCtkbHwwO3RoaXMuX2VsPXRoaXMuX2VsK2VsfDA7dGhpcy5fZmw9dGhpcy5fZmwrZmx8MDt0aGlzLl9nbD10aGlzLl9nbCtnbHwwO3RoaXMuX2hsPXRoaXMuX2hsK2hsfDA7dGhpcy5fYWg9dGhpcy5fYWgrYWgrZ2V0Q2FycnkodGhpcy5fYWwsYWwpfDA7dGhpcy5fYmg9dGhpcy5fYmgrYmgrZ2V0Q2FycnkodGhpcy5fYmwsYmwpfDA7dGhpcy5fY2g9dGhpcy5fY2grY2grZ2V0Q2FycnkodGhpcy5fY2wsY2wpfDA7dGhpcy5fZGg9dGhpcy5fZGgrZGgrZ2V0Q2FycnkodGhpcy5fZGwsZGwpfDA7dGhpcy5fZWg9dGhpcy5fZWgrZWgrZ2V0Q2FycnkodGhpcy5fZWwsZWwpfDA7dGhpcy5fZmg9dGhpcy5fZmgrZmgrZ2V0Q2FycnkodGhpcy5fZmwsZmwpfDA7dGhpcy5fZ2g9dGhpcy5fZ2grZ2grZ2V0Q2FycnkodGhpcy5fZ2wsZ2wpfDA7dGhpcy5faGg9dGhpcy5faGgraGgrZ2V0Q2FycnkodGhpcy5faGwsaGwpfDB9O1NoYTUxMi5wcm90b3R5cGUuX2hhc2g9ZnVuY3Rpb24oKXt2YXIgSD1CdWZmZXIuYWxsb2NVbnNhZmUoNjQpO2Z1bmN0aW9uIHdyaXRlSW50NjRCRShoLGwsb2Zmc2V0KXtILndyaXRlSW50MzJCRShoLG9mZnNldCk7SC53cml0ZUludDMyQkUobCxvZmZzZXQrNCl9d3JpdGVJbnQ2NEJFKHRoaXMuX2FoLHRoaXMuX2FsLDApO3dyaXRlSW50NjRCRSh0aGlzLl9iaCx0aGlzLl9ibCw4KTt3cml0ZUludDY0QkUodGhpcy5fY2gsdGhpcy5fY2wsMTYpO3dyaXRlSW50NjRCRSh0aGlzLl9kaCx0aGlzLl9kbCwyNCk7d3JpdGVJbnQ2NEJFKHRoaXMuX2VoLHRoaXMuX2VsLDMyKTt3cml0ZUludDY0QkUodGhpcy5fZmgsdGhpcy5fZmwsNDApO3dyaXRlSW50NjRCRSh0aGlzLl9naCx0aGlzLl9nbCw0OCk7d3JpdGVJbnQ2NEJFKHRoaXMuX2hoLHRoaXMuX2hsLDU2KTtyZXR1cm4gSH07bW9kdWxlLmV4cG9ydHM9U2hhNTEyfSx7Ii4vaGFzaCI6OTMsaW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4Mn1dLDEwMTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9U3RyZWFtO3ZhciBFRT1yZXF1aXJlKCJldmVudHMiKS5FdmVudEVtaXR0ZXI7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7aW5oZXJpdHMoU3RyZWFtLEVFKTtTdHJlYW0uUmVhZGFibGU9cmVxdWlyZSgicmVhZGFibGUtc3RyZWFtL3JlYWRhYmxlLmpzIik7U3RyZWFtLldyaXRhYmxlPXJlcXVpcmUoInJlYWRhYmxlLXN0cmVhbS93cml0YWJsZS5qcyIpO1N0cmVhbS5EdXBsZXg9cmVxdWlyZSgicmVhZGFibGUtc3RyZWFtL2R1cGxleC5qcyIpO1N0cmVhbS5UcmFuc2Zvcm09cmVxdWlyZSgicmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcyIpO1N0cmVhbS5QYXNzVGhyb3VnaD1yZXF1aXJlKCJyZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2guanMiKTtTdHJlYW0uU3RyZWFtPVN0cmVhbTtmdW5jdGlvbiBTdHJlYW0oKXtFRS5jYWxsKHRoaXMpfVN0cmVhbS5wcm90b3R5cGUucGlwZT1mdW5jdGlvbihkZXN0LG9wdGlvbnMpe3ZhciBzb3VyY2U9dGhpcztmdW5jdGlvbiBvbmRhdGEoY2h1bmspe2lmKGRlc3Qud3JpdGFibGUpe2lmKGZhbHNlPT09ZGVzdC53cml0ZShjaHVuaykmJnNvdXJjZS5wYXVzZSl7c291cmNlLnBhdXNlKCl9fX1zb3VyY2Uub24oImRhdGEiLG9uZGF0YSk7ZnVuY3Rpb24gb25kcmFpbigpe2lmKHNvdXJjZS5yZWFkYWJsZSYmc291cmNlLnJlc3VtZSl7c291cmNlLnJlc3VtZSgpfX1kZXN0Lm9uKCJkcmFpbiIsb25kcmFpbik7aWYoIWRlc3QuX2lzU3RkaW8mJighb3B0aW9uc3x8b3B0aW9ucy5lbmQhPT1mYWxzZSkpe3NvdXJjZS5vbigiZW5kIixvbmVuZCk7c291cmNlLm9uKCJjbG9zZSIsb25jbG9zZSl9dmFyIGRpZE9uRW5kPWZhbHNlO2Z1bmN0aW9uIG9uZW5kKCl7aWYoZGlkT25FbmQpcmV0dXJuO2RpZE9uRW5kPXRydWU7ZGVzdC5lbmQoKX1mdW5jdGlvbiBvbmNsb3NlKCl7aWYoZGlkT25FbmQpcmV0dXJuO2RpZE9uRW5kPXRydWU7aWYodHlwZW9mIGRlc3QuZGVzdHJveT09PSJmdW5jdGlvbiIpZGVzdC5kZXN0cm95KCl9ZnVuY3Rpb24gb25lcnJvcihlcil7Y2xlYW51cCgpO2lmKEVFLmxpc3RlbmVyQ291bnQodGhpcywiZXJyb3IiKT09PTApe3Rocm93IGVyfX1zb3VyY2Uub24oImVycm9yIixvbmVycm9yKTtkZXN0Lm9uKCJlcnJvciIsb25lcnJvcik7ZnVuY3Rpb24gY2xlYW51cCgpe3NvdXJjZS5yZW1vdmVMaXN0ZW5lcigiZGF0YSIsb25kYXRhKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJkcmFpbiIsb25kcmFpbik7c291cmNlLnJlbW92ZUxpc3RlbmVyKCJlbmQiLG9uZW5kKTtzb3VyY2UucmVtb3ZlTGlzdGVuZXIoImNsb3NlIixvbmNsb3NlKTtzb3VyY2UucmVtb3ZlTGlzdGVuZXIoImVycm9yIixvbmVycm9yKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJlcnJvciIsb25lcnJvcik7c291cmNlLnJlbW92ZUxpc3RlbmVyKCJlbmQiLGNsZWFudXApO3NvdXJjZS5yZW1vdmVMaXN0ZW5lcigiY2xvc2UiLGNsZWFudXApO2Rlc3QucmVtb3ZlTGlzdGVuZXIoImNsb3NlIixjbGVhbnVwKX1zb3VyY2Uub24oImVuZCIsY2xlYW51cCk7c291cmNlLm9uKCJjbG9zZSIsY2xlYW51cCk7ZGVzdC5vbigiY2xvc2UiLGNsZWFudXApO2Rlc3QuZW1pdCgicGlwZSIsc291cmNlKTtyZXR1cm4gZGVzdH19LHtldmVudHM6MzMsaW5oZXJpdHM6MzYsInJlYWRhYmxlLXN0cmVhbS9kdXBsZXguanMiOjY3LCJyZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2guanMiOjc3LCJyZWFkYWJsZS1zdHJlYW0vcmVhZGFibGUuanMiOjc4LCJyZWFkYWJsZS1zdHJlYW0vdHJhbnNmb3JtLmpzIjo3OSwicmVhZGFibGUtc3RyZWFtL3dyaXRhYmxlLmpzIjo4MH1dLDEwMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIGlzRW5jb2Rpbmc9QnVmZmVyLmlzRW5jb2Rpbmd8fGZ1bmN0aW9uKGVuY29kaW5nKXtlbmNvZGluZz0iIitlbmNvZGluZztzd2l0Y2goZW5jb2RpbmcmJmVuY29kaW5nLnRvTG93ZXJDYXNlKCkpe2Nhc2UiaGV4IjpjYXNlInV0ZjgiOmNhc2UidXRmLTgiOmNhc2UiYXNjaWkiOmNhc2UiYmluYXJ5IjpjYXNlImJhc2U2NCI6Y2FzZSJ1Y3MyIjpjYXNlInVjcy0yIjpjYXNlInV0ZjE2bGUiOmNhc2UidXRmLTE2bGUiOmNhc2UicmF3IjpyZXR1cm4gdHJ1ZTtkZWZhdWx0OnJldHVybiBmYWxzZX19O2Z1bmN0aW9uIF9ub3JtYWxpemVFbmNvZGluZyhlbmMpe2lmKCFlbmMpcmV0dXJuInV0ZjgiO3ZhciByZXRyaWVkO3doaWxlKHRydWUpe3N3aXRjaChlbmMpe2Nhc2UidXRmOCI6Y2FzZSJ1dGYtOCI6cmV0dXJuInV0ZjgiO2Nhc2UidWNzMiI6Y2FzZSJ1Y3MtMiI6Y2FzZSJ1dGYxNmxlIjpjYXNlInV0Zi0xNmxlIjpyZXR1cm4idXRmMTZsZSI7Y2FzZSJsYXRpbjEiOmNhc2UiYmluYXJ5IjpyZXR1cm4ibGF0aW4xIjtjYXNlImJhc2U2NCI6Y2FzZSJhc2NpaSI6Y2FzZSJoZXgiOnJldHVybiBlbmM7ZGVmYXVsdDppZihyZXRyaWVkKXJldHVybjtlbmM9KCIiK2VuYykudG9Mb3dlckNhc2UoKTtyZXRyaWVkPXRydWV9fX1mdW5jdGlvbiBub3JtYWxpemVFbmNvZGluZyhlbmMpe3ZhciBuZW5jPV9ub3JtYWxpemVFbmNvZGluZyhlbmMpO2lmKHR5cGVvZiBuZW5jIT09InN0cmluZyImJihCdWZmZXIuaXNFbmNvZGluZz09PWlzRW5jb2Rpbmd8fCFpc0VuY29kaW5nKGVuYykpKXRocm93IG5ldyBFcnJvcigiVW5rbm93biBlbmNvZGluZzogIitlbmMpO3JldHVybiBuZW5jfHxlbmN9ZXhwb3J0cy5TdHJpbmdEZWNvZGVyPVN0cmluZ0RlY29kZXI7ZnVuY3Rpb24gU3RyaW5nRGVjb2RlcihlbmNvZGluZyl7dGhpcy5lbmNvZGluZz1ub3JtYWxpemVFbmNvZGluZyhlbmNvZGluZyk7dmFyIG5iO3N3aXRjaCh0aGlzLmVuY29kaW5nKXtjYXNlInV0ZjE2bGUiOnRoaXMudGV4dD11dGYxNlRleHQ7dGhpcy5lbmQ9dXRmMTZFbmQ7bmI9NDticmVhaztjYXNlInV0ZjgiOnRoaXMuZmlsbExhc3Q9dXRmOEZpbGxMYXN0O25iPTQ7YnJlYWs7Y2FzZSJiYXNlNjQiOnRoaXMudGV4dD1iYXNlNjRUZXh0O3RoaXMuZW5kPWJhc2U2NEVuZDtuYj0zO2JyZWFrO2RlZmF1bHQ6dGhpcy53cml0ZT1zaW1wbGVXcml0ZTt0aGlzLmVuZD1zaW1wbGVFbmQ7cmV0dXJufXRoaXMubGFzdE5lZWQ9MDt0aGlzLmxhc3RUb3RhbD0wO3RoaXMubGFzdENoYXI9QnVmZmVyLmFsbG9jVW5zYWZlKG5iKX1TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbihidWYpe2lmKGJ1Zi5sZW5ndGg9PT0wKXJldHVybiIiO3ZhciByO3ZhciBpO2lmKHRoaXMubGFzdE5lZWQpe3I9dGhpcy5maWxsTGFzdChidWYpO2lmKHI9PT11bmRlZmluZWQpcmV0dXJuIiI7aT10aGlzLmxhc3ROZWVkO3RoaXMubGFzdE5lZWQ9MH1lbHNle2k9MH1pZihpPGJ1Zi5sZW5ndGgpcmV0dXJuIHI/cit0aGlzLnRleHQoYnVmLGkpOnRoaXMudGV4dChidWYsaSk7cmV0dXJuIHJ8fCIifTtTdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5lbmQ9dXRmOEVuZDtTdHJpbmdEZWNvZGVyLnByb3RvdHlwZS50ZXh0PXV0ZjhUZXh0O1N0cmluZ0RlY29kZXIucHJvdG90eXBlLmZpbGxMYXN0PWZ1bmN0aW9uKGJ1Zil7aWYodGhpcy5sYXN0TmVlZDw9YnVmLmxlbmd0aCl7YnVmLmNvcHkodGhpcy5sYXN0Q2hhcix0aGlzLmxhc3RUb3RhbC10aGlzLmxhc3ROZWVkLDAsdGhpcy5sYXN0TmVlZCk7cmV0dXJuIHRoaXMubGFzdENoYXIudG9TdHJpbmcodGhpcy5lbmNvZGluZywwLHRoaXMubGFzdFRvdGFsKX1idWYuY29weSh0aGlzLmxhc3RDaGFyLHRoaXMubGFzdFRvdGFsLXRoaXMubGFzdE5lZWQsMCxidWYubGVuZ3RoKTt0aGlzLmxhc3ROZWVkLT1idWYubGVuZ3RofTtmdW5jdGlvbiB1dGY4Q2hlY2tCeXRlKGJ5dGUpe2lmKGJ5dGU8PTEyNylyZXR1cm4gMDtlbHNlIGlmKGJ5dGU+PjU9PT02KXJldHVybiAyO2Vsc2UgaWYoYnl0ZT4+ND09PTE0KXJldHVybiAzO2Vsc2UgaWYoYnl0ZT4+Mz09PTMwKXJldHVybiA0O3JldHVybiBieXRlPj42PT09Mj8tMTotMn1mdW5jdGlvbiB1dGY4Q2hlY2tJbmNvbXBsZXRlKHNlbGYsYnVmLGkpe3ZhciBqPWJ1Zi5sZW5ndGgtMTtpZihqPGkpcmV0dXJuIDA7dmFyIG5iPXV0ZjhDaGVja0J5dGUoYnVmW2pdKTtpZihuYj49MCl7aWYobmI+MClzZWxmLmxhc3ROZWVkPW5iLTE7cmV0dXJuIG5ifWlmKC0tajxpfHxuYj09PS0yKXJldHVybiAwO25iPXV0ZjhDaGVja0J5dGUoYnVmW2pdKTtpZihuYj49MCl7aWYobmI+MClzZWxmLmxhc3ROZWVkPW5iLTI7cmV0dXJuIG5ifWlmKC0tajxpfHxuYj09PS0yKXJldHVybiAwO25iPXV0ZjhDaGVja0J5dGUoYnVmW2pdKTtpZihuYj49MCl7aWYobmI+MCl7aWYobmI9PT0yKW5iPTA7ZWxzZSBzZWxmLmxhc3ROZWVkPW5iLTN9cmV0dXJuIG5ifXJldHVybiAwfWZ1bmN0aW9uIHV0ZjhDaGVja0V4dHJhQnl0ZXMoc2VsZixidWYscCl7aWYoKGJ1ZlswXSYxOTIpIT09MTI4KXtzZWxmLmxhc3ROZWVkPTA7cmV0dXJuIu+/vSJ9aWYoc2VsZi5sYXN0TmVlZD4xJiZidWYubGVuZ3RoPjEpe2lmKChidWZbMV0mMTkyKSE9PTEyOCl7c2VsZi5sYXN0TmVlZD0xO3JldHVybiLvv70ifWlmKHNlbGYubGFzdE5lZWQ+MiYmYnVmLmxlbmd0aD4yKXtpZigoYnVmWzJdJjE5MikhPT0xMjgpe3NlbGYubGFzdE5lZWQ9MjtyZXR1cm4i77+9In19fX1mdW5jdGlvbiB1dGY4RmlsbExhc3QoYnVmKXt2YXIgcD10aGlzLmxhc3RUb3RhbC10aGlzLmxhc3ROZWVkO3ZhciByPXV0ZjhDaGVja0V4dHJhQnl0ZXModGhpcyxidWYscCk7aWYociE9PXVuZGVmaW5lZClyZXR1cm4gcjtpZih0aGlzLmxhc3ROZWVkPD1idWYubGVuZ3RoKXtidWYuY29weSh0aGlzLmxhc3RDaGFyLHAsMCx0aGlzLmxhc3ROZWVkKTtyZXR1cm4gdGhpcy5sYXN0Q2hhci50b1N0cmluZyh0aGlzLmVuY29kaW5nLDAsdGhpcy5sYXN0VG90YWwpfWJ1Zi5jb3B5KHRoaXMubGFzdENoYXIscCwwLGJ1Zi5sZW5ndGgpO3RoaXMubGFzdE5lZWQtPWJ1Zi5sZW5ndGh9ZnVuY3Rpb24gdXRmOFRleHQoYnVmLGkpe3ZhciB0b3RhbD11dGY4Q2hlY2tJbmNvbXBsZXRlKHRoaXMsYnVmLGkpO2lmKCF0aGlzLmxhc3ROZWVkKXJldHVybiBidWYudG9TdHJpbmcoInV0ZjgiLGkpO3RoaXMubGFzdFRvdGFsPXRvdGFsO3ZhciBlbmQ9YnVmLmxlbmd0aC0odG90YWwtdGhpcy5sYXN0TmVlZCk7YnVmLmNvcHkodGhpcy5sYXN0Q2hhciwwLGVuZCk7cmV0dXJuIGJ1Zi50b1N0cmluZygidXRmOCIsaSxlbmQpfWZ1bmN0aW9uIHV0ZjhFbmQoYnVmKXt2YXIgcj1idWYmJmJ1Zi5sZW5ndGg/dGhpcy53cml0ZShidWYpOiIiO2lmKHRoaXMubGFzdE5lZWQpcmV0dXJuIHIrIu+/vSI7cmV0dXJuIHJ9ZnVuY3Rpb24gdXRmMTZUZXh0KGJ1ZixpKXtpZigoYnVmLmxlbmd0aC1pKSUyPT09MCl7dmFyIHI9YnVmLnRvU3RyaW5nKCJ1dGYxNmxlIixpKTtpZihyKXt2YXIgYz1yLmNoYXJDb2RlQXQoci5sZW5ndGgtMSk7aWYoYz49NTUyOTYmJmM8PTU2MzE5KXt0aGlzLmxhc3ROZWVkPTI7dGhpcy5sYXN0VG90YWw9NDt0aGlzLmxhc3RDaGFyWzBdPWJ1ZltidWYubGVuZ3RoLTJdO3RoaXMubGFzdENoYXJbMV09YnVmW2J1Zi5sZW5ndGgtMV07cmV0dXJuIHIuc2xpY2UoMCwtMSl9fXJldHVybiByfXRoaXMubGFzdE5lZWQ9MTt0aGlzLmxhc3RUb3RhbD0yO3RoaXMubGFzdENoYXJbMF09YnVmW2J1Zi5sZW5ndGgtMV07cmV0dXJuIGJ1Zi50b1N0cmluZygidXRmMTZsZSIsaSxidWYubGVuZ3RoLTEpfWZ1bmN0aW9uIHV0ZjE2RW5kKGJ1Zil7dmFyIHI9YnVmJiZidWYubGVuZ3RoP3RoaXMud3JpdGUoYnVmKToiIjtpZih0aGlzLmxhc3ROZWVkKXt2YXIgZW5kPXRoaXMubGFzdFRvdGFsLXRoaXMubGFzdE5lZWQ7cmV0dXJuIHIrdGhpcy5sYXN0Q2hhci50b1N0cmluZygidXRmMTZsZSIsMCxlbmQpfXJldHVybiByfWZ1bmN0aW9uIGJhc2U2NFRleHQoYnVmLGkpe3ZhciBuPShidWYubGVuZ3RoLWkpJTM7aWYobj09PTApcmV0dXJuIGJ1Zi50b1N0cmluZygiYmFzZTY0IixpKTt0aGlzLmxhc3ROZWVkPTMtbjt0aGlzLmxhc3RUb3RhbD0zO2lmKG49PT0xKXt0aGlzLmxhc3RDaGFyWzBdPWJ1ZltidWYubGVuZ3RoLTFdfWVsc2V7dGhpcy5sYXN0Q2hhclswXT1idWZbYnVmLmxlbmd0aC0yXTt0aGlzLmxhc3RDaGFyWzFdPWJ1ZltidWYubGVuZ3RoLTFdfXJldHVybiBidWYudG9TdHJpbmcoImJhc2U2NCIsaSxidWYubGVuZ3RoLW4pfWZ1bmN0aW9uIGJhc2U2NEVuZChidWYpe3ZhciByPWJ1ZiYmYnVmLmxlbmd0aD90aGlzLndyaXRlKGJ1Zik6IiI7aWYodGhpcy5sYXN0TmVlZClyZXR1cm4gcit0aGlzLmxhc3RDaGFyLnRvU3RyaW5nKCJiYXNlNjQiLDAsMy10aGlzLmxhc3ROZWVkKTtyZXR1cm4gcn1mdW5jdGlvbiBzaW1wbGVXcml0ZShidWYpe3JldHVybiBidWYudG9TdHJpbmcodGhpcy5lbmNvZGluZyl9ZnVuY3Rpb24gc2ltcGxlRW5kKGJ1Zil7cmV0dXJuIGJ1ZiYmYnVmLmxlbmd0aD90aGlzLndyaXRlKGJ1Zik6IiJ9fSx7InNhZmUtYnVmZmVyIjoxMDN9XSwxMDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2FyZ3VtZW50c1s0XVs3Nl1bMF0uYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpfSx7YnVmZmVyOjI3LGR1cDo3Nn1dLDEwNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHNldEltbWVkaWF0ZSxjbGVhckltbWVkaWF0ZSl7dmFyIG5leHRUaWNrPXJlcXVpcmUoInByb2Nlc3MvYnJvd3Nlci5qcyIpLm5leHRUaWNrO3ZhciBhcHBseT1GdW5jdGlvbi5wcm90b3R5cGUuYXBwbHk7dmFyIHNsaWNlPUFycmF5LnByb3RvdHlwZS5zbGljZTt2YXIgaW1tZWRpYXRlSWRzPXt9O3ZhciBuZXh0SW1tZWRpYXRlSWQ9MDtleHBvcnRzLnNldFRpbWVvdXQ9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRUaW1lb3V0LHdpbmRvdyxhcmd1bWVudHMpLGNsZWFyVGltZW91dCl9O2V4cG9ydHMuc2V0SW50ZXJ2YWw9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRJbnRlcnZhbCx3aW5kb3csYXJndW1lbnRzKSxjbGVhckludGVydmFsKX07ZXhwb3J0cy5jbGVhclRpbWVvdXQ9ZXhwb3J0cy5jbGVhckludGVydmFsPWZ1bmN0aW9uKHRpbWVvdXQpe3RpbWVvdXQuY2xvc2UoKX07ZnVuY3Rpb24gVGltZW91dChpZCxjbGVhckZuKXt0aGlzLl9pZD1pZDt0aGlzLl9jbGVhckZuPWNsZWFyRm59VGltZW91dC5wcm90b3R5cGUudW5yZWY9VGltZW91dC5wcm90b3R5cGUucmVmPWZ1bmN0aW9uKCl7fTtUaW1lb3V0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3RoaXMuX2NsZWFyRm4uY2FsbCh3aW5kb3csdGhpcy5faWQpfTtleHBvcnRzLmVucm9sbD1mdW5jdGlvbihpdGVtLG1zZWNzKXtjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7aXRlbS5faWRsZVRpbWVvdXQ9bXNlY3N9O2V4cG9ydHMudW5lbnJvbGw9ZnVuY3Rpb24oaXRlbSl7Y2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO2l0ZW0uX2lkbGVUaW1lb3V0PS0xfTtleHBvcnRzLl91bnJlZkFjdGl2ZT1leHBvcnRzLmFjdGl2ZT1mdW5jdGlvbihpdGVtKXtjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7dmFyIG1zZWNzPWl0ZW0uX2lkbGVUaW1lb3V0O2lmKG1zZWNzPj0wKXtpdGVtLl9pZGxlVGltZW91dElkPXNldFRpbWVvdXQoZnVuY3Rpb24gb25UaW1lb3V0KCl7aWYoaXRlbS5fb25UaW1lb3V0KWl0ZW0uX29uVGltZW91dCgpfSxtc2Vjcyl9fTtleHBvcnRzLnNldEltbWVkaWF0ZT10eXBlb2Ygc2V0SW1tZWRpYXRlPT09ImZ1bmN0aW9uIj9zZXRJbW1lZGlhdGU6ZnVuY3Rpb24oZm4pe3ZhciBpZD1uZXh0SW1tZWRpYXRlSWQrKzt2YXIgYXJncz1hcmd1bWVudHMubGVuZ3RoPDI/ZmFsc2U6c2xpY2UuY2FsbChhcmd1bWVudHMsMSk7aW1tZWRpYXRlSWRzW2lkXT10cnVlO25leHRUaWNrKGZ1bmN0aW9uIG9uTmV4dFRpY2soKXtpZihpbW1lZGlhdGVJZHNbaWRdKXtpZihhcmdzKXtmbi5hcHBseShudWxsLGFyZ3MpfWVsc2V7Zm4uY2FsbChudWxsKX1leHBvcnRzLmNsZWFySW1tZWRpYXRlKGlkKX19KTtyZXR1cm4gaWR9O2V4cG9ydHMuY2xlYXJJbW1lZGlhdGU9dHlwZW9mIGNsZWFySW1tZWRpYXRlPT09ImZ1bmN0aW9uIj9jbGVhckltbWVkaWF0ZTpmdW5jdGlvbihpZCl7ZGVsZXRlIGltbWVkaWF0ZUlkc1tpZF19fSkuY2FsbCh0aGlzLHJlcXVpcmUoInRpbWVycyIpLnNldEltbWVkaWF0ZSxyZXF1aXJlKCJ0aW1lcnMiKS5jbGVhckltbWVkaWF0ZSl9LHsicHJvY2Vzcy9icm93c2VyLmpzIjo2Nix0aW1lcnM6MTA0fV0sMTA1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oZ2xvYmFsKXttb2R1bGUuZXhwb3J0cz1kZXByZWNhdGU7ZnVuY3Rpb24gZGVwcmVjYXRlKGZuLG1zZyl7aWYoY29uZmlnKCJub0RlcHJlY2F0aW9uIikpe3JldHVybiBmbn12YXIgd2FybmVkPWZhbHNlO2Z1bmN0aW9uIGRlcHJlY2F0ZWQoKXtpZighd2FybmVkKXtpZihjb25maWcoInRocm93RGVwcmVjYXRpb24iKSl7dGhyb3cgbmV3IEVycm9yKG1zZyl9ZWxzZSBpZihjb25maWcoInRyYWNlRGVwcmVjYXRpb24iKSl7Y29uc29sZS50cmFjZShtc2cpfWVsc2V7Y29uc29sZS53YXJuKG1zZyl9d2FybmVkPXRydWV9cmV0dXJuIGZuLmFwcGx5KHRoaXMsYXJndW1lbnRzKX1yZXR1cm4gZGVwcmVjYXRlZH1mdW5jdGlvbiBjb25maWcobmFtZSl7dHJ5e2lmKCFnbG9iYWwubG9jYWxTdG9yYWdlKXJldHVybiBmYWxzZX1jYXRjaChfKXtyZXR1cm4gZmFsc2V9dmFyIHZhbD1nbG9iYWwubG9jYWxTdG9yYWdlW25hbWVdO2lmKG51bGw9PXZhbClyZXR1cm4gZmFsc2U7cmV0dXJuIFN0cmluZyh2YWwpLnRvTG93ZXJDYXNlKCk9PT0idHJ1ZSJ9fSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwhPT0idW5kZWZpbmVkIj9nbG9iYWw6dHlwZW9mIHNlbGYhPT0idW5kZWZpbmVkIj9zZWxmOnR5cGVvZiB3aW5kb3chPT0idW5kZWZpbmVkIj93aW5kb3c6e30pfSx7fV19LHt9LFsyXSk7","base64").toString("utf8");
})();
var __cryptoLib;
eval(bundle_source);
__export(require("../sync/types"));
__export(require("./serializer"));
var toBuffer_1 = require("../sync/utils/toBuffer");
exports.toBuffer = toBuffer_1.toBuffer;
var isMultithreadingEnabled = (function () {
    switch (environnement_1.environnement.type) {
        case "BROWSER": return (typeof Worker !== "undefined" &&
            typeof URL !== "undefined" &&
            typeof Blob !== "undefined");
        case "LIQUID CORE": return false;
        case "NODE": return true;
        case "REACT NATIVE": return false;
    }
})();
function disableMultithreading() {
    isMultithreadingEnabled = false;
}
exports.disableMultithreading = disableMultithreading;
var WorkerThreadId;
(function (WorkerThreadId) {
    function generate() {
        return { "type": "WORKER THREAD ID" };
    }
    WorkerThreadId.generate = generate;
})(WorkerThreadId = exports.WorkerThreadId || (exports.WorkerThreadId = {}));
var _a = (function () {
    var spawn = WorkerThread_1.WorkerThread.factory(bundle_source, function () { return isMultithreadingEnabled; });
    var map = new Map_1.Polyfill();
    return [
        function (workerThreadId) {
            var workerThread = map.get(workerThreadId);
            if (workerThread === undefined) {
                workerThread = spawn();
                map.set(workerThreadId, workerThread);
            }
            return workerThread;
        },
        function (workerThreadId) {
            var match = workerThreadId === undefined ?
                (function () { return true; })
                :
                    (function (o) { return o === workerThreadId; });
            for (var _i = 0, _a = Array.from(map.keys()); _i < _a.length; _i++) {
                var workerThreadId_1 = _a[_i];
                if (!match(workerThreadId_1)) {
                    continue;
                }
                map.get(workerThreadId_1).terminate();
                map.delete(workerThreadId_1);
            }
        },
        function () { return Array.from(map.keys()); }
    ];
})(), getWorkerThread = _a[0], terminateWorkerThreads = _a[1], listWorkerThreadIds = _a[2];
exports.terminateWorkerThreads = terminateWorkerThreads;
function preSpawnWorkerThread(workerThreadId) {
    getWorkerThread(workerThreadId);
}
exports.preSpawnWorkerThread = preSpawnWorkerThread;
var workerThreadPool;
(function (workerThreadPool) {
    var Id;
    (function (Id) {
        function generate() {
            return { "type": "WORKER THREAD POOL ID" };
        }
        Id.generate = generate;
    })(Id = workerThreadPool.Id || (workerThreadPool.Id = {}));
    var map = new Map_1.Polyfill();
    function preSpawn(workerThreadPoolId, poolSize) {
        //TODO: When we pre spawn multiple time with the same 
        //id the treads adds up...
        if (!map.has(workerThreadPoolId)) {
            map.set(workerThreadPoolId, new Set_1.Polyfill());
        }
        for (var i = 1; i <= poolSize; i++) {
            var workerThreadId = WorkerThreadId.generate();
            map.get(workerThreadPoolId).add(workerThreadId);
            preSpawnWorkerThread(workerThreadId);
        }
    }
    workerThreadPool.preSpawn = preSpawn;
    function listIds(workerThreadPoolId) {
        var set = map.get(workerThreadPoolId) || new Set_1.Polyfill();
        return listWorkerThreadIds()
            .filter(function (workerThreadId) { return set.has(workerThreadId); });
    }
    workerThreadPool.listIds = listIds;
    function terminate(workerThreadPoolId) {
        for (var _i = 0, _a = listIds(workerThreadPoolId); _i < _a.length; _i++) {
            var workerThreadId = _a[_i];
            terminateWorkerThreads(workerThreadId);
        }
    }
    workerThreadPool.terminate = terminate;
})(workerThreadPool = exports.workerThreadPool || (exports.workerThreadPool = {}));
var getCounter = (function () {
    var counter = 0;
    return function () { return counter++; };
})();
var defaultWorkerPoolIds = {
    "aes": workerThreadPool.Id.generate(),
    "plain": workerThreadPool.Id.generate(),
    "rsa": workerThreadPool.Id.generate()
};
function cipherFactoryPool(params, workerThreadPoolId) {
    var _this = this;
    if (workerThreadPoolId === undefined) {
        workerThreadPoolId = defaultWorkerPoolIds[params.cipherName];
        workerThreadPool.preSpawn(workerThreadPoolId, 4);
    }
    else if (workerThreadPool.listIds(workerThreadPoolId).length === 0) {
        throw new Error("No thread in the pool");
    }
    var runExclusiveFunctions = workerThreadPool.listIds(workerThreadPoolId)
        .map(function (workerThreadId) {
        var cipher = cipherFactoryPool.cipherFactory(params, workerThreadId);
        return runExclusive.build(function (method, data) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, cipher[method](data)];
        }); }); });
    });
    return (function () {
        var _a = ["encrypt", "decrypt"]
            .map(function (method) { return function (data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, runExclusiveFunctions
                        .map(function (runExclusiveFunction) { return [
                        runExclusive.getQueuedCallCount(runExclusiveFunction),
                        runExclusiveFunction
                    ]; })
                        .sort(function (_a, _b) {
                        var n1 = _a[0];
                        var n2 = _b[0];
                        return n1 - n2;
                    })[0][1](method, data)];
            });
        }); }; }), encrypt = _a[0], decrypt = _a[1];
        switch (params.components) {
            case "EncryptorDecryptor": return { encrypt: encrypt, decrypt: decrypt };
            case "Decryptor": return { decrypt: decrypt };
            case "Encryptor": return { encrypt: encrypt };
        }
    })();
}
(function (cipherFactoryPool) {
    function cipherFactory(params, workerThreadId) {
        var cipherInstanceRef = getCounter();
        var appWorker = getWorkerThread(workerThreadId);
        appWorker.send((function () {
            var action = __assign({ "action": "CipherFactory", cipherInstanceRef: cipherInstanceRef }, params);
            return action;
        })());
        return (function () {
            var _a = ["encrypt", "decrypt"]
                .map(function (method) { return (function (data) { return cipherFactory.encryptOrDecrypt(cipherInstanceRef, method, data, workerThreadId); }); }), encrypt = _a[0], decrypt = _a[1];
            switch (params.components) {
                case "EncryptorDecryptor": return { encrypt: encrypt, decrypt: decrypt };
                case "Decryptor": return { decrypt: decrypt };
                case "Encryptor": return { encrypt: encrypt };
            }
        })();
    }
    cipherFactoryPool.cipherFactory = cipherFactory;
    (function (cipherFactory) {
        function encryptOrDecrypt(cipherInstanceRef, method, input, workerThreadId) {
            return __awaiter(this, void 0, void 0, function () {
                var actionId, appWorker, output;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actionId = getCounter();
                            appWorker = getWorkerThread(workerThreadId);
                            appWorker.send((function () {
                                var action = {
                                    "action": "EncryptOrDecrypt",
                                    actionId: actionId,
                                    cipherInstanceRef: cipherInstanceRef,
                                    method: method,
                                    input: input
                                };
                                return action;
                            })(), [input.buffer]);
                            return [4 /*yield*/, appWorker.evtResponse.waitFor(function (response) {
                                    return response.actionId === actionId;
                                })];
                        case 1:
                            output = (_a.sent()).output;
                            return [2 /*return*/, output];
                    }
                });
            });
        }
        cipherFactory.encryptOrDecrypt = encryptOrDecrypt;
    })(cipherFactory = cipherFactoryPool.cipherFactory || (cipherFactoryPool.cipherFactory = {}));
})(cipherFactoryPool || (cipherFactoryPool = {}));
exports.plain = (function () {
    var encryptorDecryptorFactory = function (workerThreadPoolId) {
        return cipherFactoryPool({
            "cipherName": "plain",
            "components": "EncryptorDecryptor",
            "params": []
        }, workerThreadPoolId);
    };
    return __assign({ encryptorDecryptorFactory: encryptorDecryptorFactory }, __cryptoLib.plain);
})();
exports.aes = (function () {
    var encryptorDecryptorFactory = function (key, workerThreadPoolId) {
        return cipherFactoryPool({
            "cipherName": "aes",
            "components": "EncryptorDecryptor",
            "params": [key]
        }, workerThreadPoolId);
    };
    return __assign({ encryptorDecryptorFactory: encryptorDecryptorFactory }, __cryptoLib.aes);
})();
exports.rsa = (function () {
    var encryptorFactory = function (encryptKey, workerThreadPoolId) {
        return cipherFactoryPool({
            "cipherName": "rsa",
            "components": "Encryptor",
            "params": [encryptKey]
        }, workerThreadPoolId);
    };
    var decryptorFactory = function (decryptKey, workerThreadPoolId) {
        return cipherFactoryPool({
            "cipherName": "rsa",
            "components": "Decryptor",
            "params": [decryptKey]
        }, workerThreadPoolId);
    };
    function encryptorDecryptorFactory(encryptKey, decryptKey, workerThreadPoolId) {
        return cipherFactoryPool({
            "cipherName": "rsa",
            "components": "EncryptorDecryptor",
            "params": [encryptKey, decryptKey]
        }, workerThreadPoolId);
    }
    var generateKeys = function (seed, keysLengthBytes, workerThreadId) { return __awaiter(_this, void 0, void 0, function () {
        var wasWorkerThreadIdSpecified, actionId, appWorker, outputs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    wasWorkerThreadIdSpecified = workerThreadId !== undefined;
                    workerThreadId = workerThreadId !== undefined ?
                        workerThreadId :
                        WorkerThreadId.generate();
                    actionId = getCounter();
                    appWorker = getWorkerThread(workerThreadId);
                    appWorker.send((function () {
                        var action = {
                            "action": "GenerateRsaKeys",
                            actionId: actionId,
                            "params": [seed, keysLengthBytes]
                        };
                        return action;
                    })());
                    return [4 /*yield*/, appWorker.evtResponse.waitFor(function (response) {
                            return response.actionId === actionId;
                        })];
                case 1:
                    outputs = (_a.sent()).outputs;
                    if (!wasWorkerThreadIdSpecified) {
                        terminateWorkerThreads(workerThreadId);
                    }
                    return [2 /*return*/, outputs];
            }
        });
    }); };
    return __assign({ encryptorFactory: encryptorFactory,
        decryptorFactory: decryptorFactory,
        encryptorDecryptorFactory: encryptorDecryptorFactory,
        generateKeys: generateKeys }, __cryptoLib.rsa);
})();
exports.scrypt = (function () {
    var hash = function (text, salt, params, progress, workerThreadId) {
        if (params === void 0) { params = {}; }
        if (progress === void 0) { progress = (function () { }); }
        return __awaiter(_this, void 0, void 0, function () {
            var actionId, wasWorkerThreadIdSpecified, appWorker, boundTo, digest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        actionId = getCounter();
                        wasWorkerThreadIdSpecified = workerThreadId !== undefined;
                        workerThreadId = workerThreadId !== undefined ?
                            workerThreadId :
                            WorkerThreadId.generate();
                        appWorker = getWorkerThread(workerThreadId);
                        appWorker.send((function () {
                            var action = {
                                "action": "ScryptHash",
                                actionId: actionId,
                                "params": [text, salt, params]
                            };
                            return action;
                        })());
                        boundTo = {};
                        appWorker.evtResponse.attach(function (response) { return (response.actionId === actionId &&
                            "percent" in response); }, boundTo, function (_a) {
                            var percent = _a.percent;
                            return progress(percent);
                        });
                        return [4 /*yield*/, appWorker.evtResponse.waitFor(function (response) { return (response.actionId === actionId &&
                                "digest" in response); })];
                    case 1:
                        digest = (_a.sent()).digest;
                        appWorker.evtResponse.detach(boundTo);
                        if (!wasWorkerThreadIdSpecified) {
                            terminateWorkerThreads(workerThreadId);
                        }
                        return [2 /*return*/, digest];
                }
            });
        });
    };
    return __assign({ hash: hash }, __cryptoLib.scrypt);
})();

}).call(this,require("buffer").Buffer)
},{"../sync/types":14,"../sync/utils/environnement":16,"../sync/utils/toBuffer":17,"./WorkerThread":6,"./serializer":12,"buffer":2,"minimal-polyfills/dist/lib/Array.from":18,"minimal-polyfills/dist/lib/Map":19,"minimal-polyfills/dist/lib/Set":20,"path":4,"run-exclusive":21}],12:[function(require,module,exports){
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
},{"../sync/utils/toBuffer":17,"buffer":2,"transfer-tools/dist/lib/JSON_CUSTOM":24}],13:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var environnement_1 = require("../utils/environnement");
var toBuffer_1 = require("../utils/toBuffer");
var transfer;
(function (transfer) {
    var SerializableUint8Array;
    (function (SerializableUint8Array) {
        function match(value) {
            return (value instanceof Object &&
                value.type === "Uint8Array" &&
                typeof value.data === "string");
        }
        SerializableUint8Array.match = match;
        function build(value) {
            return {
                "type": "Uint8Array",
                "data": toBuffer_1.toBuffer(value).toString("binary")
            };
        }
        SerializableUint8Array.build = build;
        function restore(value) {
            return Buffer.from(value.data, "binary");
        }
        SerializableUint8Array.restore = restore;
    })(SerializableUint8Array || (SerializableUint8Array = {}));
    function prepare(threadMessage) {
        if (environnement_1.environnement.type !== "NODE") {
            throw new Error("only for node");
        }
        var message = (function () {
            if (threadMessage instanceof Uint8Array) {
                return SerializableUint8Array.build(threadMessage);
            }
            else if (threadMessage instanceof Array) {
                return threadMessage.map(function (entry) { return prepare(entry); });
            }
            else if (threadMessage instanceof Object) {
                var out = {};
                for (var key in threadMessage) {
                    out[key] = prepare(threadMessage[key]);
                }
                return out;
            }
            else {
                return threadMessage;
            }
        })();
        return message;
    }
    transfer.prepare = prepare;
    function restore(message) {
        if (environnement_1.environnement.type !== "NODE") {
            throw new Error("only for node");
        }
        var threadMessage = (function () {
            if (SerializableUint8Array.match(message)) {
                return SerializableUint8Array.restore(message);
            }
            else if (message instanceof Array) {
                return message.map(function (entry) { return restore(entry); });
            }
            else if (message instanceof Object) {
                var out = {};
                for (var key in message) {
                    out[key] = restore(message[key]);
                }
                return out;
            }
            else {
                return message;
            }
        })();
        return threadMessage;
    }
    transfer.restore = restore;
})(transfer = exports.transfer || (exports.transfer = {}));

}).call(this,require("buffer").Buffer)
},{"../utils/environnement":16,"../utils/toBuffer":17,"buffer":2}],14:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var toBuffer_1 = require("./utils/toBuffer");
var RsaKey;
(function (RsaKey) {
    function stringify(rsaKey) {
        return JSON.stringify([rsaKey.format, toBuffer_1.toBuffer(rsaKey.data).toString("base64")]);
    }
    RsaKey.stringify = stringify;
    function parse(stringifiedRsaKey) {
        var _a = JSON.parse(stringifiedRsaKey), format = _a[0], strData = _a[1];
        return { format: format, "data": new Uint8Array(Buffer.from(strData, "base64")) };
    }
    RsaKey.parse = parse;
    var Public;
    (function (Public) {
        function match(rsaKey) {
            return rsaKey.format === "pkcs1-public-der";
        }
        Public.match = match;
    })(Public = RsaKey.Public || (RsaKey.Public = {}));
    var Private;
    (function (Private) {
        function match(rsaKey) {
            return rsaKey.format === "pkcs1-private-der";
        }
        Private.match = match;
    })(Private = RsaKey.Private || (RsaKey.Private = {}));
})(RsaKey = exports.RsaKey || (exports.RsaKey = {}));

}).call(this,require("buffer").Buffer)
},{"./utils/toBuffer":17,"buffer":2}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function concatUint8Array() {
    var uint8Arrays = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        uint8Arrays[_i] = arguments[_i];
    }
    var out = new Uint8Array(uint8Arrays
        .map(function (_a) {
        var length = _a.length;
        return length;
    })
        .reduce(function (prev, curr) { return prev + curr; }, 0));
    var offset = 0;
    for (var i = 0; i < uint8Arrays.length; i++) {
        var uint8Array = uint8Arrays[i];
        out.set(uint8Array, offset);
        offset += uint8Array.length;
    }
    return out;
}
exports.concatUint8Array = concatUint8Array;
function addPadding(position, uint8Array, targetLengthBytes) {
    var paddingBytes = new Uint8Array(targetLengthBytes - uint8Array.length);
    for (var i = 0; i < paddingBytes.length; i++) {
        paddingBytes[i] = 0;
    }
    return concatUint8Array.apply(void 0, (function () {
        switch (position) {
            case "LEFT": return [paddingBytes, uint8Array];
            case "RIGHT": return [uint8Array, paddingBytes];
        }
    })());
}
exports.addPadding = addPadding;
function numberToUint8Array(n) {
    var str = n.toString(16);
    var arr = [];
    var curr = "";
    for (var i = str.length - 1; i >= 0; i--) {
        curr = str[i] + curr;
        if (curr.length === 2 || i === 0) {
            arr = [parseInt(curr, 16)].concat(arr);
            curr = "";
        }
    }
    return new Uint8Array(arr);
}
exports.numberToUint8Array = numberToUint8Array;
function uint8ArrayToNumber(uint8Array) {
    var n = 0;
    var exp = 0;
    for (var i = uint8Array.length - 1; i >= 0; i--) {
        n += uint8Array[i] * Math.pow(256, exp++);
    }
    return n;
}
exports.uint8ArrayToNumber = uint8ArrayToNumber;
/** +1, in place ( array is updated ) */
function leftShift(uint8Array) {
    var c = true;
    for (var i = uint8Array.length - 1; c && i >= 0; i--) {
        if (++uint8Array[i] !== 256) {
            c = false;
        }
    }
    return uint8Array;
}
exports.leftShift = leftShift;

},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environnement = (function () {
    if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
        return {
            "type": "REACT NATIVE",
            "isMainThread": true
        };
    }
    else if (typeof window !== "undefined") {
        return {
            "type": "BROWSER",
            "isMainThread": true
        };
    }
    else if (typeof self !== "undefined" && !!self.postMessage) {
        return {
            "type": "BROWSER",
            "isMainThread": false
        };
    }
    else if (typeof setTimeout === "undefined") {
        return {
            "type": "LIQUID CORE",
            "isMainThread": true
        };
    }
    else {
        //NOTE: We do not check process.send because browserify hide it.
        return {
            "type": "NODE",
            "isMainThread": undefined
        };
    }
})();

},{}],17:[function(require,module,exports){
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
},{"buffer":2}],18:[function(require,module,exports){
// Production steps of ECMA-262, Edition 6, 22.1.2.1
if (!Array.from) {
    Array.from = (function () {
        var toStr = Object.prototype.toString;
        var isCallable = function (fn) {
            return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
        };
        var toInteger = function (value) {
            var number = Number(value);
            if (isNaN(number)) {
                return 0;
            }
            if (number === 0 || !isFinite(number)) {
                return number;
            }
            return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
        };
        var maxSafeInteger = Math.pow(2, 53) - 1;
        var toLength = function (value) {
            var len = toInteger(value);
            return Math.min(Math.max(len, 0), maxSafeInteger);
        };
        // The length property of the from method is 1.
        return function from(arrayLike /*, mapFn, thisArg */) {
            // 1. Let C be the this value.
            var C = this;
            // 2. Let items be ToObject(arrayLike).
            var items = Object(arrayLike);
            // 3. ReturnIfAbrupt(items).
            if (arrayLike == null) {
                throw new TypeError('Array.from requires an array-like object - not null or undefined');
            }
            // 4. If mapfn is undefined, then let mapping be false.
            var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
            var T;
            if (typeof mapFn !== 'undefined') {
                // 5. else
                // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
                if (!isCallable(mapFn)) {
                    throw new TypeError('Array.from: when provided, the second argument must be a function');
                }
                // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
                if (arguments.length > 2) {
                    T = arguments[2];
                }
            }
            // 10. Let lenValue be Get(items, "length").
            // 11. Let len be ToLength(lenValue).
            var len = toLength(items.length);
            // 13. If IsConstructor(C) is true, then
            // 13. a. Let A be the result of calling the [[Construct]] internal method 
            // of C with an argument list containing the single item len.
            // 14. a. Else, Let A be ArrayCreate(len).
            var A = isCallable(C) ? Object(new C(len)) : new Array(len);
            // 16. Let k be 0.
            var k = 0;
            // 17. Repeat, while k < len… (also steps a - h)
            var kValue;
            while (k < len) {
                kValue = items[k];
                if (mapFn) {
                    A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                }
                else {
                    A[k] = kValue;
                }
                k += 1;
            }
            // 18. Let putStatus be Put(A, "length", len, true).
            A.length = len;
            // 20. Return A.
            return A;
        };
    }());
}

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var Map_1 = require("./Map");
var LightSetImpl = /** @class */ (function () {
    function LightSetImpl(values) {
        this.map = new Map_1.Polyfill();
        if (values === undefined) {
            return;
        }
        for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
            var value = values_1[_i];
            this.add(value);
        }
    }
    LightSetImpl.prototype.has = function (value) {
        return this.map.has(value);
    };
    LightSetImpl.prototype.add = function (value) {
        this.map.set(value, true);
        return this;
    };
    LightSetImpl.prototype.values = function () {
        return this.map.keys();
    };
    LightSetImpl.prototype["delete"] = function (value) {
        return this.map["delete"](value);
    };
    return LightSetImpl;
}());
exports.LightSetImpl = LightSetImpl;
exports.Polyfill = typeof Set !== "undefined" ? Set : LightSetImpl;

},{"./Map":19}],21:[function(require,module,exports){
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

},{"minimal-polyfills/dist/lib/WeakMap":23}],22:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],23:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var Map_1 = require("./Map");
exports.Polyfill = typeof WeakMap !== "undefined" ? WeakMap : Map_1.Polyfill;

},{"./Map":22}],24:[function(require,module,exports){
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

},{"super-json":28}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":25}],27:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":26}],28:[function(require,module,exports){
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
},{"has":27}],29:[function(require,module,exports){
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

},{"./SyncEventBase":30}],30:[function(require,module,exports){
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

},{"./SyncEventBaseProtected":31}],31:[function(require,module,exports){
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

},{"./defs":32,"minimal-polyfills/dist/lib/Array.prototype.find":34,"minimal-polyfills/dist/lib/Map":35,"run-exclusive":36}],32:[function(require,module,exports){
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

},{"setprototypeof":39}],33:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var SyncEvent_1 = require("./SyncEvent");
exports.SyncEvent = SyncEvent_1.SyncEvent;
exports.VoidSyncEvent = SyncEvent_1.VoidSyncEvent;
var defs_1 = require("./defs");
exports.EvtError = defs_1.EvtError;

},{"./SyncEvent":29,"./defs":32}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],36:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21,"minimal-polyfills/dist/lib/WeakMap":38}],37:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],38:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Map":37,"dup":23}],39:[function(require,module,exports){
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

},{}],40:[function(require,module,exports){
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
exports.__esModule = true;
require("minimal-polyfills/dist/lib/ArrayBuffer.isView");
require("frontend-shared/dist/tools/polyfills/Object.assign");
var availablePages = require("frontend-shared/dist/lib/availablePages");
var hostKfd = require("frontend-shared/dist/lib/nativeModules/hostKfd");
var notifyHostWhenPageIsReady_1 = require("frontend-shared/dist/lib/notifyHostWhenPageIsReady");
var procedure = require("frontend-shared/dist/lib/procedure/login");
var TowardUserKeys_1 = require("frontend-shared/dist/lib/localStorage/TowardUserKeys");
var cryptoLib = require("frontend-shared/node_modules/crypto-lib");
var urlGetParameters = require("frontend-shared/dist/tools/urlGetParameters");
notifyHostWhenPageIsReady_1.notifyHostWhenPageIsReady();
var justRegistered;
var apiExposedToHost = __assign({}, hostKfd.apiExposedToHost);
Object.assign(window, { apiExposedToHost: apiExposedToHost });
function setHandlers() {
    /* Start import from theme */
    $("#login-form").validate({
        "ignore": 'input[type="hidden"]',
        "errorPlacement": function (error, element) {
            var place = element.closest(".input-group");
            if (!place.get(0)) {
                place = element;
            }
            if (error.text() !== "") {
                place.after(error);
            }
        },
        "errorClass": 'help-block',
        "rules": {
            "email": {
                "required": true,
                "email": true
            },
            "password": {
                "required": true,
                "minlength": 5
            }
        },
        "messages": {
            "password": {
                "required": "Please provide a password",
                "minlength": "Your password must be at least 5 characters long"
            },
            "email": "Please type your email"
        },
        "highlight": function (label) {
            return $(label).closest('.form-group').removeClass('has-success').addClass('has-error');
        },
        "success": function (label) {
            $(label).closest('.form-group').removeClass('has-error');
            label.remove();
        }
    });
    /* End import from theme */
    $("#login-form").on("submit", function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, email, password;
            var _this = this;
            return __generator(this, function (_b) {
                event.preventDefault();
                if (!$(this).valid())
                    return [2 /*return*/];
                _a = (function () {
                    var _a = ["#email", "#password"]
                        .map(function (sel) { return $(sel).val(); }), email = _a[0], password = _a[1];
                    return [email, password];
                })(), email = _a[0], password = _a[1];
                procedure.login(email, password, undefined, justRegistered, {
                    "resetPassword": function () { return $("#password").val(""); },
                    "loginSuccess": function (secret) { return __awaiter(_this, void 0, void 0, function () {
                        var towardUserKeys;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!(typeof apiExposedByHost !== "undefined")) return [3 /*break*/, 2];
                                    return [4 /*yield*/, TowardUserKeys_1.TowardUserKeys.retrieve()];
                                case 1:
                                    towardUserKeys = (_a.sent());
                                    apiExposedByHost.onDone(email, secret, cryptoLib.RsaKey.stringify(towardUserKeys.encryptKey), cryptoLib.RsaKey.stringify(towardUserKeys.decryptKey));
                                    return [2 /*return*/];
                                case 2:
                                    window.location.href = "/" + availablePages.PageName.manager;
                                    return [2 /*return*/];
                            }
                        });
                    }); }
                });
                return [2 /*return*/];
            });
        });
    });
    $("#forgot-password").click(function (event) {
        event.preventDefault();
        procedure.requestRenewPassword({
            "redirectToRegister": function () { return window.location.href = "/" + availablePages.PageName.register; },
            "getEmail": function () { return $("#email").val(); },
            "setEmail": function (email) { return $("#email").val(email); }
        });
    });
}
$(document).ready(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        setHandlers();
        procedure.init(urlGetParameters.parseUrl(), {
            "setEmail": function (email) { return $("#email").val(email); },
            "setJustRegistered": function (justRegistered_) { return justRegistered = justRegistered_; },
            "setPassword": function (password) { return $("#password").val(password); },
            "triggerClickLogin": function () { return $("#login-btn").trigger("click"); }
        });
        return [2 /*return*/];
    });
}); });

},{"frontend-shared/dist/lib/availablePages":43,"frontend-shared/dist/lib/localStorage/TowardUserKeys":52,"frontend-shared/dist/lib/nativeModules/hostKfd":56,"frontend-shared/dist/lib/notifyHostWhenPageIsReady":59,"frontend-shared/dist/lib/procedure/login":60,"frontend-shared/dist/tools/polyfills/Object.assign":71,"frontend-shared/dist/tools/urlGetParameters":72,"frontend-shared/node_modules/crypto-lib":11,"minimal-polyfills/dist/lib/ArrayBuffer.isView":41}],41:[function(require,module,exports){
if (!ArrayBuffer["isView"]) {
    ArrayBuffer.isView = function isView(a) {
        return a !== null && typeof (a) === "object" && a["buffer"] instanceof ArrayBuffer;
    };
}

},{}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var web_api_declaration_1 = require("semasim-gateway/dist/web_api_declaration");
exports.webApiPath = web_api_declaration_1.apiPath;

},{"semasim-gateway/dist/web_api_declaration":89}],43:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var PageName;
(function (PageName) {
    var _a;
    PageName.pagesNames = [
        "login",
        "register",
        "manager",
        "webphone",
        "subscription",
        "shop"
    ];
    _a = __read(PageName.pagesNames, 6), PageName.login = _a[0], PageName.register = _a[1], PageName.manager = _a[2], PageName.webphone = _a[3], PageName.subscription = _a[4], PageName.shop = _a[5];
})(PageName = exports.PageName || (exports.PageName = {}));

},{}],44:[function(require,module,exports){
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
var cryptoLib = require("crypto-lib");
var hostCrypto = require("../nativeModules/hostCryptoLib");
var env = require("../env");
var crypto_lib_1 = require("crypto-lib");
exports.WorkerThreadId = crypto_lib_1.WorkerThreadId;
exports.RsaKey = crypto_lib_1.RsaKey;
exports.scrypt = crypto_lib_1.scrypt;
exports.aes = crypto_lib_1.aes;
exports.toBuffer = crypto_lib_1.toBuffer;
exports.workerThreadPool = crypto_lib_1.workerThreadPool;
if (env.jsRuntimeEnv === "react-native") {
    cryptoLib.disableMultithreading();
}
var rsa;
(function (rsa) {
    var _this = this;
    rsa.generateKeys = env.jsRuntimeEnv === "browser" ?
        function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return (_a = cryptoLib.rsa).generateKeys.apply(_a, __spread(args));
        }
        :
            function (seed, keysLengthBytes) { return hostCrypto.rsaGenerateKeys(cryptoLib.toBuffer(seed).toString("base64"), keysLengthBytes).then(function (keys) { return ({
                "publicKey": cryptoLib.RsaKey.parse(keys.publicKeyStr),
                "privateKey": cryptoLib.RsaKey.parse(keys.privateKeyStr)
            }); }); };
    rsa.encryptorFactory = env.jsRuntimeEnv === "browser" ?
        function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return (_a = cryptoLib.rsa).encryptorFactory.apply(_a, __spread(args));
        }
        :
            function (encryptKey) { return ({
                "encrypt": function (plainData) { return hostCrypto.rsaEncryptOrDecrypt("ENCRYPT", cryptoLib.RsaKey.stringify(encryptKey), cryptoLib.toBuffer(plainData).toString("base64")).then(function (_a) {
                    var outputDataB64 = _a.outputDataB64;
                    return Buffer.from(outputDataB64, "base64");
                }); }
            }); };
    rsa.decryptorFactory = env.jsRuntimeEnv === "browser" ?
        function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return (_a = cryptoLib.rsa).decryptorFactory.apply(_a, __spread(args));
        }
        :
            function (decryptKey) { return ({
                "decrypt": function (encryptedData) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, hostCrypto.rsaEncryptOrDecrypt("DECRYPT", cryptoLib.RsaKey.stringify(decryptKey), cryptoLib.toBuffer(encryptedData).toString("base64")).then(function (_a) {
                                var outputDataB64 = _a.outputDataB64;
                                return Buffer.from(outputDataB64, "base64");
                            })];
                    });
                }); }
            }); };
})(rsa = exports.rsa || (exports.rsa = {}));

}).call(this,require("buffer").Buffer)
},{"../env":47,"../nativeModules/hostCryptoLib":55,"buffer":2,"crypto-lib":11}],45:[function(require,module,exports){
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
//import * as cryptoLib from "crypto-lib";
var cryptoLib = require("./cryptoLibProxy");
var dialog_1 = require("../../tools/modal/dialog");
var binaryDataManipulations_1 = require("crypto-lib/dist/sync/utils/binaryDataManipulations");
var kfd_1 = require("./kfd");
var workerThreadPoolId = cryptoLib.workerThreadPool.Id.generate();
var workerThreadId;
/** Must be called before using the async function */
function preSpawn() {
    cryptoLib.workerThreadPool.preSpawn(workerThreadPoolId, 1);
    workerThreadId = cryptoLib.workerThreadPool.listIds(workerThreadPoolId)[0];
}
exports.preSpawn = preSpawn;
function computeLoginSecretAndTowardUserKeys(password, uniqUserIdentification) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, digest1, digest2, towardUserKeys;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dialog_1.dialogApi.loading("Generating cryptographic digest from password \uD83D\uDD10", 0);
                    return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                            var salt;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, cryptoLib.scrypt.hash((function () {
                                            var realm = Buffer.from("semasim.com", "utf8");
                                            return cryptoLib.toBuffer(binaryDataManipulations_1.concatUint8Array(realm, binaryDataManipulations_1.addPadding("LEFT", Buffer.from(uniqUserIdentification, "utf8"), 100 - realm.length))).toString("utf8");
                                        })(), "", {
                                            "n": 3,
                                            "digestLengthBytes": 16
                                        }, undefined, workerThreadId)];
                                    case 1:
                                        salt = _a.sent();
                                        return [2 /*return*/, Promise.all([1, 2].map(function (i) { return __awaiter(_this, void 0, void 0, function () {
                                                var error_1;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            _a.trys.push([0, 2, , 3]);
                                                            return [4 /*yield*/, kfd_1.kfd(Buffer.from("" + password + i, "utf8").toString("hex"), salt, 100000)];
                                                        case 1: 
                                                        //NOTE: We convert password to hex so we are sure to have a password
                                                        //charset in ASCII. ( Java Modified UTF8 might cause problems ).
                                                        return [2 /*return*/, _a.sent()];
                                                        case 2:
                                                            error_1 = _a.sent();
                                                            if (i === 1) {
                                                                alert("Please use a different web browser");
                                                            }
                                                            throw error_1;
                                                        case 3: return [2 /*return*/];
                                                    }
                                                });
                                            }); }))];
                                }
                            });
                        }); })()];
                case 1:
                    _a = __read.apply(void 0, [_b.sent(), 2]), digest1 = _a[0], digest2 = _a[1];
                    dialog_1.dialogApi.loading("Computing RSA keys using digest as seed \uD83D\uDD10");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, (function (seed) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, publicKey, privateKey;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, cryptoLib.rsa.generateKeys(seed, 160, workerThreadId)];
                                    case 1:
                                        _a = _b.sent(), publicKey = _a.publicKey, privateKey = _a.privateKey;
                                        return [2 /*return*/, {
                                                "encryptKey": publicKey,
                                                "decryptKey": privateKey
                                            }];
                                }
                            });
                        }); })(digest2)];
                case 3:
                    towardUserKeys = _b.sent();
                    dialog_1.dialogApi.dismissLoading();
                    return [2 /*return*/, {
                            "secret": cryptoLib.toBuffer(digest1).toString("hex"),
                            towardUserKeys: towardUserKeys
                        }];
            }
        });
    });
}
exports.computeLoginSecretAndTowardUserKeys = computeLoginSecretAndTowardUserKeys;
var symmetricKey;
(function (symmetricKey) {
    function createThenEncryptKey(towardUserEncryptKey) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _b = (_a = cryptoLib).toBuffer;
                        _d = (_c = cryptoLib.rsa.encryptorFactory(towardUserEncryptKey, workerThreadPoolId)).encrypt;
                        return [4 /*yield*/, cryptoLib.aes.generateKey()];
                    case 1: return [4 /*yield*/, _d.apply(_c, [_e.sent()])];
                    case 2: return [2 /*return*/, _b.apply(_a, [_e.sent()]).toString("base64")];
                }
            });
        });
    }
    symmetricKey.createThenEncryptKey = createThenEncryptKey;
    function decryptKey(towardUserDecryptor, encryptedSymmetricKey) {
        return towardUserDecryptor.decrypt(Buffer.from(encryptedSymmetricKey, "base64"));
    }
    symmetricKey.decryptKey = decryptKey;
})(symmetricKey = exports.symmetricKey || (exports.symmetricKey = {}));

}).call(this,require("buffer").Buffer)
},{"../../tools/modal/dialog":68,"./cryptoLibProxy":44,"./kfd":46,"buffer":2,"crypto-lib/dist/sync/utils/binaryDataManipulations":15}],46:[function(require,module,exports){
(function (Buffer){
"use strict";
//export const kfdIterations = 100000;
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
var env = require("../env");
var hostKfd = require("../nativeModules/hostKfd");
var cryptoLibProxy_1 = require("./cryptoLibProxy");
exports.kfd = env.jsRuntimeEnv === "browser" ?
    (function (password, salt, iterations) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _a = Uint8Array.bind;
                    _c = (_b = window.crypto.subtle).deriveBits;
                    _d = [{
                            "name": "PBKDF2",
                            salt: salt,
                            iterations: iterations,
                            "hash": "SHA-1"
                        }];
                    return [4 /*yield*/, window.crypto.subtle.importKey("raw", (function Uint8ArrayToArrayBuffer(uint8Array) {
                            return uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteLength + uint8Array.byteOffset);
                        })(Buffer.from(password, "utf8")), { "name": "PBKDF2" }, false, ["deriveBits"])];
                case 1: return [4 /*yield*/, _c.apply(_b, _d.concat([_e.sent(),
                        256]))];
                case 2: return [2 /*return*/, new (_a.apply(Uint8Array, [void 0, _e.sent()]))()];
            }
        });
    }); })
    : function (password, salt, iterations) { return hostKfd.kfd(password, cryptoLibProxy_1.toBuffer(salt).toString("hex"), iterations).then(function (_a) {
        var resultHex = _a.resultHex;
        return Buffer.from(resultHex, "hex");
    }); };

}).call(this,require("buffer").Buffer)
},{"../env":47,"../nativeModules/hostKfd":56,"./cryptoLibProxy":44,"buffer":2}],47:[function(require,module,exports){
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

},{"./jsRuntimeEnv":48}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsRuntimeEnv = "browser";

},{}],49:[function(require,module,exports){
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
},{"./localStorageApi":54,"buffer":2}],50:[function(require,module,exports){
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
},{"../env":47,"./localStorageApi":54,"buffer":2}],51:[function(require,module,exports){
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
var TowardUserKeys_1 = require("./TowardUserKeys");
exports.key = "just-registered";
var JustRegistered;
(function (JustRegistered) {
    function store(justRegistered) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.setItem(exports.key, JSON.stringify(justRegistered, function (key, value) { return key === "towardUserKeys" ?
                            TowardUserKeys_1.TowardUserKeys.stringify(value) :
                            value; }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    JustRegistered.store = store;
    /** Will remove from internal storage */
    function retrieve() {
        return __awaiter(this, void 0, void 0, function () {
            var justRegisteredStr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.getItem(exports.key)];
                    case 1:
                        justRegisteredStr = _a.sent();
                        if (justRegisteredStr === null) {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, localStorageApi.removeItem(exports.key)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, JSON.parse(justRegisteredStr, function (key, value) { return key === "towardUserKeys" ?
                                TowardUserKeys_1.TowardUserKeys.parse(value) :
                                value; })];
                }
            });
        });
    }
    JustRegistered.retrieve = retrieve;
})(JustRegistered = exports.JustRegistered || (exports.JustRegistered = {}));

},{"./TowardUserKeys":52,"./localStorageApi":54}],52:[function(require,module,exports){
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
var localStorageApi = require("./localStorageApi");
var types_1 = require("crypto-lib/dist/sync/types");
exports.key = "toward-user-keys";
var TowardUserKeys;
(function (TowardUserKeys) {
    function stringify(towardUserKeys) {
        return JSON.stringify([towardUserKeys.encryptKey, towardUserKeys.decryptKey]
            .map(function (key) { return types_1.RsaKey.stringify(key); }));
    }
    TowardUserKeys.stringify = stringify;
    function parse(towardUserKeysStr) {
        var _a = __read(JSON.parse(towardUserKeysStr)
            .map(function (keyStr) { return types_1.RsaKey.parse(keyStr); }), 2), encryptKey = _a[0], decryptKey = _a[1];
        return { encryptKey: encryptKey, decryptKey: decryptKey };
    }
    TowardUserKeys.parse = parse;
    //TODO: Set expiration for the cookie based on the session id expiration.
    function store(towardUserKeys) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.setItem(exports.key, stringify(towardUserKeys))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    TowardUserKeys.store = store;
    /** Assert present, throw otherwise, should be always present when
     * AuthenticatedSessionDescriptionSharedData is present */
    function retrieve() {
        return __awaiter(this, void 0, void 0, function () {
            var towardUserKeysStr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.getItem(exports.key)];
                    case 1:
                        towardUserKeysStr = _a.sent();
                        if (towardUserKeysStr === null) {
                            throw new Error("Not present");
                        }
                        return [2 /*return*/, parse(towardUserKeysStr)];
                }
            });
        });
    }
    TowardUserKeys.retrieve = retrieve;
})(TowardUserKeys = exports.TowardUserKeys || (exports.TowardUserKeys = {}));

},{"./localStorageApi":54,"crypto-lib/dist/sync/types":14}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = localStorage;

},{}],54:[function(require,module,exports){
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
            return [2 /*return*/, asyncOrSyncLocalStorage_1.default.getItem(key)];
        });
    });
}
exports.getItem = getItem;
function setItem(key, value) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, asyncOrSyncLocalStorage_1.default.setItem(key, value)];
        });
    });
}
exports.setItem = setItem;
function removeItem(key) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, asyncOrSyncLocalStorage_1.default.removeItem(key)];
        });
    });
}
exports.removeItem = removeItem;

},{"./asyncOrSyncLocalStorage":53}],55:[function(require,module,exports){
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
var ts_events_extended_1 = require("ts-events-extended");
var evtRsaEncryptOrDecryptResult = new ts_events_extended_1.SyncEvent();
var evtRsaGenerateKeysResult = new ts_events_extended_1.SyncEvent();
exports.apiExposedToHost = {
    "onRsaEncryptOrDecryptResult": function (callRef, outputDataB64) {
        return evtRsaEncryptOrDecryptResult.post({ callRef: callRef, outputDataB64: outputDataB64 });
    },
    "onRsaGenerateKeysResult": function (callRef, publicKeyStr, privateKeyStr) {
        return evtRsaGenerateKeysResult.post({ callRef: callRef, publicKeyStr: publicKeyStr, privateKeyStr: privateKeyStr });
    }
};
var getCounter = (function () {
    var counter = 0;
    return function () { return counter++; };
})();
function rsaEncryptOrDecrypt(action, keyStr, inputDataB64) {
    return __awaiter(this, void 0, void 0, function () {
        var callRef, outputDataB64;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    callRef = getCounter();
                    apiExposedByHost.rsaEncryptOrDecrypt(action, keyStr, inputDataB64, callRef);
                    return [4 /*yield*/, evtRsaEncryptOrDecryptResult.waitFor(function (_a) {
                            var callRef_ = _a.callRef;
                            return callRef_ === callRef;
                        })];
                case 1:
                    outputDataB64 = (_a.sent()).outputDataB64;
                    return [2 /*return*/, { outputDataB64: outputDataB64 }];
            }
        });
    });
}
exports.rsaEncryptOrDecrypt = rsaEncryptOrDecrypt;
function rsaGenerateKeys(seedB64, keysLengthBytes) {
    return __awaiter(this, void 0, void 0, function () {
        var callRef, _a, publicKeyStr, privateKeyStr;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    callRef = getCounter();
                    apiExposedByHost.rsaGenerateKeys(seedB64, keysLengthBytes, callRef);
                    return [4 /*yield*/, evtRsaGenerateKeysResult.waitFor(function (_a) {
                            var callRef_ = _a.callRef;
                            return callRef_ === callRef;
                        })];
                case 1:
                    _a = _b.sent(), publicKeyStr = _a.publicKeyStr, privateKeyStr = _a.privateKeyStr;
                    return [2 /*return*/, { publicKeyStr: publicKeyStr, privateKeyStr: privateKeyStr }];
            }
        });
    });
}
exports.rsaGenerateKeys = rsaGenerateKeys;

},{"ts-events-extended":88}],56:[function(require,module,exports){
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
var ts_events_extended_1 = require("ts-events-extended");
var evtKfdResult = new ts_events_extended_1.SyncEvent();
exports.apiExposedToHost = {
    "onKfdResult": function (callRef, resultHex) { return evtKfdResult.post({ callRef: callRef, resultHex: resultHex }); }
};
var getCounter = (function () {
    var counter = 0;
    return function () { return counter++; };
})();
function kfd(password, saltHex, iterations) {
    return __awaiter(this, void 0, void 0, function () {
        var callRef, resultHex;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    callRef = getCounter();
                    apiExposedByHost.kfd(password, saltHex, iterations, callRef);
                    return [4 /*yield*/, evtKfdResult.waitFor(function (_a) {
                            var callRef_ = _a.callRef;
                            return callRef_ === callRef;
                        })];
                case 1:
                    resultHex = (_a.sent()).resultHex;
                    return [2 /*return*/, { resultHex: resultHex }];
            }
        });
    });
}
exports.kfd = kfd;
;

},{"ts-events-extended":88}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var api = {
    "getIsOnline": function () { return navigator.onLine; },
    "evtStateChange": (function () {
        var out = new ts_events_extended_1.VoidSyncEvent();
        window.addEventListener("online", function () { return out.post(); });
        window.addEventListener("offline", function () { return out.post(); });
        return out;
    })()
};
exports.getApi = function () { return Promise.resolve(api); };

},{"ts-events-extended":88}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var impl_1 = require("./impl");
exports.getApi = impl_1.getApi;

},{"./impl":57}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function notifyHostWhenPageIsReady() {
    $(document).ready(function () { return console.log("->__PAGE_READY__<-"); });
}
exports.notifyHostWhenPageIsReady = notifyHostWhenPageIsReady;

},{}],60:[function(require,module,exports){
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
var cryptoLib = require("../crypto/cryptoLibProxy");
var TowardUserKeys_1 = require("../localStorage/TowardUserKeys");
var webApiCaller = require("../webApiCaller");
var crypto = require("../crypto/keysGeneration");
var JustRegistered_1 = require("../localStorage/JustRegistered");
var dialog_1 = require("../../tools/modal/dialog");
/** uaInstanceId to provide only in react native */
function login(email, password, uaInstanceId, justRegistered, uiApi) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, secret, towardUserKeys, _b, resp, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = justRegistered;
                    if (_b) return [3 /*break*/, 2];
                    return [4 /*yield*/, crypto.computeLoginSecretAndTowardUserKeys(password, email)];
                case 1:
                    _b = (_d.sent());
                    _d.label = 2;
                case 2:
                    _a = _b, secret = _a.secret, towardUserKeys = _a.towardUserKeys;
                    webApiCaller.setCanRequestThrowToTrueForNextMethodCall();
                    return [4 /*yield*/, webApiCaller.loginUser(email, secret, uaInstanceId).catch(function (error) { return error; })];
                case 3:
                    resp = _d.sent();
                    if (!(resp instanceof Error)) return [3 /*break*/, 5];
                    return [4 /*yield*/, dialog_1.dialogApi.create("alert", {
                            "message": "Please try again later"
                        })];
                case 4:
                    _d.sent();
                    uiApi.resetPassword();
                    return [2 /*return*/];
                case 5:
                    if (resp.status !== "SUCCESS") {
                        uiApi.resetPassword();
                    }
                    _c = resp.status;
                    switch (_c) {
                        case "SUCCESS": return [3 /*break*/, 6];
                        case "NO SUCH ACCOUNT": return [3 /*break*/, 8];
                        case "WRONG PASSWORD": return [3 /*break*/, 10];
                        case "RETRY STILL FORBIDDEN": return [3 /*break*/, 12];
                        case "NOT VALIDATED YET": return [3 /*break*/, 14];
                    }
                    return [3 /*break*/, 16];
                case 6: 
                //TODO: if native declare ua.
                return [4 /*yield*/, TowardUserKeys_1.TowardUserKeys.store(towardUserKeys)];
                case 7:
                    //TODO: if native declare ua.
                    _d.sent();
                    //window.location.href = `/${availablePages.PageName.manager}`;
                    uiApi.loginSuccess(secret);
                    return [3 /*break*/, 16];
                case 8: return [4 /*yield*/, dialog_1.dialogApi.create("alert", { "message": "No Semasim account correspond to this email" })];
                case 9:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 10: return [4 /*yield*/, dialog_1.dialogApi.create("alert", {
                        "message": "Wrong password, please wait " + resp.retryDelay / 1000 + " second before retrying"
                    })];
                case 11:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 12: return [4 /*yield*/, dialog_1.dialogApi.create("alert", {
                        "message": [
                            "Due to unsuccessful attempt to login your account is temporally locked",
                            "please wait " + resp.retryDelayLeft / 1000 + " second before retrying"
                        ].join(" ")
                    })];
                case 13:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 14: return [4 /*yield*/, dialog_1.dialogApi.create("alert", {
                        "message": [
                            "This account have not been validated yet.",
                            "Please check your emails"
                        ].join(" ")
                    })];
                case 15:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
exports.login = login;
function init(params, uiApi) {
    return __awaiter(this, void 0, void 0, function () {
        var justRegistered, email_, email, email_confirmation_code, isEmailValidated, _a, _b, _c, _d, email_1;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    crypto.preSpawn();
                    return [4 /*yield*/, JustRegistered_1.JustRegistered.retrieve()];
                case 1:
                    justRegistered = _e.sent();
                    if (justRegistered) {
                        uiApi.setJustRegistered(justRegistered);
                    }
                    email_ = params.email;
                    if (email_ !== undefined) {
                        uiApi.setEmail(email_);
                    }
                    if (!(params.email_confirmation_code !== undefined ||
                        !!justRegistered && justRegistered.promptEmailValidationCode)) return [3 /*break*/, 11];
                    email = email_;
                    email_confirmation_code = params.email_confirmation_code;
                    webApiCaller.setCanRequestThrowToTrueForNextMethodCall();
                    _b = (_a = webApiCaller).validateEmail;
                    _c = [email];
                    if (!(email_confirmation_code !== undefined)) return [3 /*break*/, 2];
                    _d = email_confirmation_code;
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, (function callee() {
                        return __awaiter(this, void 0, void 0, function () {
                            var out;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("prompt", {
                                            "title": "Code you just received by email",
                                            "inputType": "number",
                                            "placeholder": "XXXX",
                                            "callback": function (result) { return resolve(result); }
                                        }); })];
                                    case 1:
                                        out = _a.sent();
                                        if (!!out) return [3 /*break*/, 3];
                                        return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("alert", {
                                                "message": "Validating you email address is mandatory to access Semasim services",
                                                "callback": function () { return resolve(); }
                                            }); })];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/, callee()];
                                    case 3: return [2 /*return*/, out];
                                }
                            });
                        });
                    })()];
                case 3:
                    _d = _e.sent();
                    _e.label = 4;
                case 4: return [4 /*yield*/, _b.apply(_a, _c.concat([_d])).catch(function (error) { return error; })];
                case 5:
                    isEmailValidated = _e.sent();
                    if (!(isEmailValidated instanceof Error)) return [3 /*break*/, 7];
                    return [4 /*yield*/, dialog_1.dialogApi.create("alert", {
                            "message": "Something went wrong please validate your email using the link that have via email"
                        })];
                case 6:
                    _e.sent();
                    return [2 /*return*/];
                case 7:
                    if (!!isEmailValidated) return [3 /*break*/, 9];
                    return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("alert", {
                            "message": [
                                "Email was already validated or provided activation code was wrong.",
                                "Follow the link you received by email to activate your account."
                            ].join(" "),
                            "callback": function () { return resolve(); }
                        }); })];
                case 8:
                    _e.sent();
                    return [2 /*return*/];
                case 9:
                    if (!(email_confirmation_code !== undefined)) return [3 /*break*/, 11];
                    return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("alert", {
                            "message": "Email successfully validated you can now proceed to login",
                            "callback": function () { return resolve(); }
                        }); })];
                case 10:
                    _e.sent();
                    _e.label = 11;
                case 11:
                    if (!!justRegistered) {
                        //$("#password").val(justRegistered.password);
                        uiApi.setPassword(justRegistered.password);
                        //$("#login-btn").trigger("click");
                        uiApi.triggerClickLogin();
                        return [2 /*return*/];
                    }
                    //NOTE: Never in React native.
                    if (params.renew_password_token !== undefined) {
                        email_1 = params.email;
                        (function callee() {
                            return __awaiter(this, void 0, void 0, function () {
                                var newPassword, newPasswordConfirm, _a, newSecret, towardUserKeys, wasTokenStillValid, _b, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0: return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("prompt", {
                                                "title": "Chose a new password",
                                                "inputType": "password",
                                                "callback": function (result) { return resolve(result); }
                                            }); })];
                                        case 1:
                                            newPassword = _e.sent();
                                            if (!(!newPassword || newPassword.length < 5)) return [3 /*break*/, 3];
                                            return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("alert", {
                                                    "message": "Password must be at least 5 character long",
                                                    "callback": function () { return resolve(); }
                                                }); })];
                                        case 2:
                                            _e.sent();
                                            callee();
                                            return [2 /*return*/];
                                        case 3: return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("prompt", {
                                                "title": "Confirm your new password",
                                                "inputType": "password",
                                                "callback": function (result) { return resolve(result); }
                                            }); })];
                                        case 4:
                                            newPasswordConfirm = _e.sent();
                                            if (!(newPassword !== newPasswordConfirm)) return [3 /*break*/, 6];
                                            return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("alert", {
                                                    "message": "The two entry mismatch",
                                                    "callback": function () { return resolve(); }
                                                }); })];
                                        case 5:
                                            _e.sent();
                                            callee();
                                            return [2 /*return*/];
                                        case 6: return [4 /*yield*/, crypto.computeLoginSecretAndTowardUserKeys(newPassword, email_1)];
                                        case 7:
                                            _a = _e.sent(), newSecret = _a.secret, towardUserKeys = _a.towardUserKeys;
                                            dialog_1.dialogApi.loading("Renewing password");
                                            webApiCaller.setCanRequestThrowToTrueForNextMethodCall();
                                            _c = (_b = webApiCaller).renewPassword;
                                            _d = [email_1,
                                                newSecret,
                                                cryptoLib.RsaKey.stringify(towardUserKeys.encryptKey)];
                                            return [4 /*yield*/, crypto.symmetricKey.createThenEncryptKey(towardUserKeys.encryptKey)];
                                        case 8: return [4 /*yield*/, _c.apply(_b, _d.concat([_e.sent(),
                                                params.renew_password_token])).catch(function (error) { return error; })];
                                        case 9:
                                            wasTokenStillValid = _e.sent();
                                            if (!(wasTokenStillValid instanceof Error)) return [3 /*break*/, 11];
                                            return [4 /*yield*/, dialog_1.dialogApi.create("alert", { "message": "Something went wrong please try again later" })];
                                        case 10:
                                            _e.sent();
                                            return [2 /*return*/];
                                        case 11:
                                            dialog_1.dialogApi.dismissLoading();
                                            if (!!wasTokenStillValid) return [3 /*break*/, 13];
                                            return [4 /*yield*/, dialog_1.dialogApi.create("alert", { "message": "This password renew email was no longer valid" })];
                                        case 12:
                                            _e.sent();
                                            return [2 /*return*/];
                                        case 13:
                                            uiApi.setJustRegistered({
                                                "password": newPassword,
                                                "secret": newSecret,
                                                towardUserKeys: towardUserKeys,
                                                "promptEmailValidationCode": false
                                            });
                                            //$("#password").val(newPassword);
                                            uiApi.setPassword(newPassword);
                                            //$("#login-form").submit();
                                            uiApi.triggerClickLogin();
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        })();
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.init = init;
function requestRenewPassword(uiApi) {
    return __awaiter(this, void 0, void 0, function () {
        var email, isSuccess, shouldProceed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("prompt", {
                        "title": "Account email?",
                        "inputType": "email",
                        "value": uiApi.getEmail(),
                        "callback": function (result) { return resolve(result); },
                    }); })];
                case 1:
                    email = _a.sent();
                    if (!email) {
                        return [2 /*return*/];
                    }
                    webApiCaller.setCanRequestThrowToTrueForNextMethodCall();
                    return [4 /*yield*/, webApiCaller.sendRenewPasswordEmail(email)
                            .catch(function (error) { return error; })];
                case 2:
                    isSuccess = _a.sent();
                    if (!(isSuccess instanceof Error)) return [3 /*break*/, 4];
                    return [4 /*yield*/, dialog_1.dialogApi.create("alert", { "message": "Something went wrong please try again later" })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
                case 4:
                    if (!isSuccess) return [3 /*break*/, 6];
                    return [4 /*yield*/, dialog_1.dialogApi.create("alert", { "message": "An email that will let you renew your password have been sent to you" })];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
                case 6: return [4 /*yield*/, new Promise(function (resolve) { return dialog_1.dialogApi.create("dialog", {
                        "title": "Not found",
                        "message": "Account '" + email + "' does not exist",
                        "buttons": {
                            "cancel": {
                                "label": "Retry",
                                "callback": function () { return resolve("RETRY"); }
                            },
                            "success": {
                                "label": "Register",
                                "className": "btn-success",
                                "callback": function () { return resolve("REGISTER"); }
                            }
                        },
                        "closeButton": true,
                        "onEscape": function () { return resolve("CANCEL"); }
                    }); })];
                case 7:
                    shouldProceed = _a.sent();
                    switch (shouldProceed) {
                        case "CANCEL": return [2 /*return*/];
                        case "REGISTER":
                            uiApi.redirectToRegister();
                            return [2 /*return*/];
                        case "RETRY":
                            uiApi.setEmail("");
                            requestRenewPassword(uiApi);
                            return [2 /*return*/];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.requestRenewPassword = requestRenewPassword;

},{"../../tools/modal/dialog":68,"../crypto/cryptoLibProxy":44,"../crypto/keysGeneration":45,"../localStorage/JustRegistered":51,"../localStorage/TowardUserKeys":52,"../webApiCaller":64}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var env = require("../env");
var default_ = function () {
    if (env.isDevEnv) {
        throw new Error("In prod the app would have been restarted");
    }
    location.reload();
};
exports.default = default_;

},{"../env":47}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var impl_1 = require("./impl");
exports.restartApp = impl_1.default;

},{"./impl":61}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectSidHttpHeaderName = "x-connect-sid";

},{}],64:[function(require,module,exports){
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
var sendRequest_1 = require("./sendRequest");
exports.WebApiError = sendRequest_1.WebApiError;
var AuthenticatedSessionDescriptorSharedData_1 = require("../localStorage/AuthenticatedSessionDescriptorSharedData");
var Credentials_1 = require("../localStorage/Credentials");
var env = require("../env");
var ts_events_extended_1 = require("ts-events-extended");
var restartApp_1 = require("../restartApp");
var networkStateMonitoring = require("../networkStateMonitoring");
var evtError = new ts_events_extended_1.SyncEvent();
evtError.attach(function (_a) {
    var methodName = _a.methodName, httpErrorStatus = _a.httpErrorStatus;
    switch (env.jsRuntimeEnv) {
        case "browser":
            {
                switch (httpErrorStatus) {
                    case 401:
                        restartApp_1.restartApp();
                        break;
                        ;
                    case 500:
                        alert("Internal server error");
                        break;
                    case 400:
                        alert("Request malformed");
                        break;
                    case undefined:
                        alert("Can't reach the server");
                        break;
                    default: alert(methodName + " httpErrorStatus: " + httpErrorStatus);
                }
            }
            break;
        case "react-native":
            {
                console.log("WebApi Error: " + methodName + " " + httpErrorStatus);
                restartApp_1.restartApp();
            }
            break;
    }
});
var canRequestThrow = false;
function setCanRequestThrowToTrueForNextMethodCall() {
    canRequestThrow = true;
}
exports.setCanRequestThrowToTrueForNextMethodCall = setCanRequestThrowToTrueForNextMethodCall;
var sendRequest = function (methodName, params) { return __awaiter(void 0, void 0, void 0, function () {
    var networkStateMonitoringApi, _a, _b, _c, _d, error_1;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0: return [4 /*yield*/, networkStateMonitoring.getApi()];
            case 1:
                networkStateMonitoringApi = _e.sent();
                if (!!networkStateMonitoringApi.getIsOnline()) return [3 /*break*/, 3];
                return [4 /*yield*/, networkStateMonitoringApi.evtStateChange.waitFor()];
            case 2:
                _e.sent();
                _e.label = 3;
            case 3:
                _e.trys.push([3, 9, , 10]);
                _a = sendRequest_1.sendRequest;
                _b = [methodName,
                    params];
                _d = env.jsRuntimeEnv === "react-native";
                if (!_d) return [3 /*break*/, 5];
                return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.isPresent()];
            case 4:
                _d = (_e.sent());
                _e.label = 5;
            case 5:
                if (!_d) return [3 /*break*/, 7];
                return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.get()];
            case 6:
                _c = (_e.sent()).connect_sid;
                return [3 /*break*/, 8];
            case 7:
                _c = undefined;
                _e.label = 8;
            case 8: return [2 /*return*/, _a.apply(void 0, _b.concat([_c]))];
            case 9:
                error_1 = _e.sent();
                if (!(error_1 instanceof sendRequest_1.WebApiError)) {
                    throw error_1;
                }
                if (canRequestThrow) {
                    canRequestThrow = false;
                    throw error_1;
                }
                evtError.post(error_1);
                return [2 /*return*/, new Promise(function () { })];
            case 10: return [2 /*return*/];
        }
    });
}); };
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
                    case 0:
                        email = email.toLowerCase();
                        return [4 /*yield*/, sendRequest(methodName, { email: email, secret: secret, uaInstanceId: uaInstanceId })];
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
                        if (!!isLoggedIn) return [3 /*break*/, 3];
                        return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.remove()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, isLoggedIn];
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
                        if (!(env.jsRuntimeEnv === "react-native")) return [3 /*break*/, 4];
                        return [4 /*yield*/, Credentials_1.Credentials.remove()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
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

},{"../../web_api_declaration":73,"../env":47,"../localStorage/AuthenticatedSessionDescriptorSharedData":49,"../localStorage/Credentials":50,"../networkStateMonitoring":58,"../restartApp":62,"./sendRequest":65,"ts-events-extended":88}],65:[function(require,module,exports){
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
var connectSidHttpHeaderName_1 = require("../types/connectSidHttpHeaderName");
var env = require("../env");
var JSON_CUSTOM_1 = require("transfer-tools/dist/lib/JSON_CUSTOM");
var webApiPath_1 = require("../../gateway/webApiPath");
var serializer = JSON_CUSTOM_1.get();
var WebApiError = /** @class */ (function (_super) {
    __extends(WebApiError, _super);
    function WebApiError(methodName, httpErrorStatus) {
        var _this = _super.call(this, "Web api error " + httpErrorStatus + " calling " + methodName) || this;
        _this.methodName = methodName;
        _this.httpErrorStatus = httpErrorStatus;
        Object.setPrototypeOf(_this, WebApiError.prototype);
        return _this;
    }
    return WebApiError;
}(Error));
exports.WebApiError = WebApiError;
function sendRequest(methodName, params, connectSid) {
    return __awaiter(this, void 0, void 0, function () {
        var fetchResp, resp, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, fetch("https://web." + env.baseDomain + webApiPath_1.webApiPath + "/" + methodName, {
                        "method": "POST",
                        "cache": "no-cache",
                        "credentials": "same-origin",
                        "headers": __assign({ "Content-Type": "application/json-custom; charset=utf-8" }, (connectSid !== undefined ?
                            (_c = {}, _c[connectSidHttpHeaderName_1.connectSidHttpHeaderName] = connectSid, _c) :
                            ({}))),
                        "redirect": "error",
                        "body": serializer.stringify(params)
                    }).catch(function (error) {
                        console.log("Fetch error: " + methodName + " " + JSON.stringify(params) + " " + error.message);
                        return new WebApiError(methodName, undefined);
                    })];
                case 1:
                    fetchResp = _d.sent();
                    if (fetchResp instanceof WebApiError) {
                        throw fetchResp;
                    }
                    if (fetchResp.status !== 200) {
                        throw new WebApiError(methodName, fetchResp.status);
                    }
                    _b = (_a = serializer).parse;
                    return [4 /*yield*/, fetchResp.text()];
                case 2:
                    resp = _b.apply(_a, [_d.sent()]);
                    console.log(methodName, { params: params, resp: resp });
                    return [2 /*return*/, resp];
            }
        });
    });
}
exports.sendRequest = sendRequest;

},{"../../gateway/webApiPath":42,"../env":47,"../types/connectSidHttpHeaderName":63,"transfer-tools/dist/lib/JSON_CUSTOM":83}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
/**
 * Assert bootstrap modal initialized on jQuery element.
 * bootbox already call .modal().
 * For custom modal .modal() need to be called first.
 *
 *
 * NOTE: For dialog remember to invoke removeFromDom once hidden.
 */
function createGenericProxyForBootstrapModal($initializedModalDiv) {
    var evtHide = new ts_events_extended_1.VoidSyncEvent();
    var evtShown = new ts_events_extended_1.VoidSyncEvent();
    var evtHidden = new ts_events_extended_1.VoidSyncEvent();
    $initializedModalDiv.on("hide.bs.modal", function () { return evtHide.post(); });
    $initializedModalDiv.on("shown.bs.modal", function () { return evtShown.post(); });
    $initializedModalDiv.on("hidden.bs.modal", function () { return evtHidden.post(); });
    var modal = {
        evtHide: evtHide, evtShown: evtShown, evtHidden: evtHidden,
        "show": function () { return $initializedModalDiv.modal("show"); },
        "hide": function () { return $initializedModalDiv.modal("hide"); },
        "removeFromDom": function () {
            $initializedModalDiv.off();
            $initializedModalDiv.data("bs.modal", null);
            $initializedModalDiv.remove();
        }
    };
    return modal;
}
exports.createGenericProxyForBootstrapModal = createGenericProxyForBootstrapModal;

},{"ts-events-extended":88}],67:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var createGenericProxyForBootstrapModal_1 = require("../createGenericProxyForBootstrapModal");
var customImplementationOfApi = undefined;
function provideCustomImplementationOfApi(api) {
    customImplementationOfApi = api;
}
exports.provideCustomImplementationOfApi = provideCustomImplementationOfApi;
var bootboxBasedImplementationOfBaseApi = {
    "create": function (dialogType, options) {
        var bootstrapModal = bootbox[dialogType](options);
        return createGenericProxyForBootstrapModal_1.createGenericProxyForBootstrapModal(bootstrapModal);
    },
    "createLoading": function (message) { return bootboxBasedImplementationOfBaseApi.create("dialog", {
        "message": [
            '<p class="text-center">',
            '<i class="fa fa-spin fa-spinner"></i>&nbsp;&nbsp;',
            "<span class=\"" + loading.spanClass + "\">" + message + "</span>",
            "</p>"
        ].join(""),
        "closeButton": false,
        "onEscape": false,
        "animate": false,
        "show": false
    }); }
};
//TODO: See if needed.
var loading;
(function (loading) {
    loading.spanClass = "loading_message";
})(loading || (loading = {}));
exports.getApi = function () { return customImplementationOfApi || bootboxBasedImplementationOfBaseApi; };

},{"../createGenericProxyForBootstrapModal":66}],68:[function(require,module,exports){
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var modalStack = require("../stack");
var types = require("./types");
exports.baseTypes = types;
var getApi_1 = require("./getApi");
exports.provideCustomImplementationOfBaseApi = getApi_1.provideCustomImplementationOfApi;
var runExclusive = require("run-exclusive");
var noLockDialogApi = (function () {
    var currentLoading = undefined;
    var currentModal = undefined;
    var restoreLoading = undefined;
    var out = {
        "dismissLoading": function () {
            if (!!currentLoading) {
                currentLoading.stop();
                currentLoading = undefined;
            }
            if (!!restoreLoading) {
                restoreLoading = undefined;
            }
        },
        "loading": function (message, delayBeforeShow) {
            if (delayBeforeShow === void 0) { delayBeforeShow = 700; }
            if (!!currentModal) {
                restoreLoading = function () { return out.loading(message, delayBeforeShow); };
                return;
            }
            if (!!currentLoading) {
                delayBeforeShow = 0;
            }
            out.dismissLoading();
            var modal = undefined;
            var timer = setTimeout(function () {
                modal = getApi_1.getApi().createLoading(message);
                modalStack.add(modal).show();
            }, delayBeforeShow);
            currentLoading = {
                "stop": function () { return !!modal ? modal.hide() : clearTimeout(timer); },
                message: message,
                delayBeforeShow: delayBeforeShow
            };
        },
        "create": function (method, options) {
            if (!!currentModal) {
                currentModal.hide();
                return out.create(method, options);
            }
            if (!!currentLoading) {
                var message_1 = currentLoading.message;
                var delayBeforeShow_1 = currentLoading.delayBeforeShow;
                out.dismissLoading();
                restoreLoading = function () { return out.loading(message_1, delayBeforeShow_1); };
            }
            var modal = getApi_1.getApi().create(method, __assign(__assign(__assign({}, options), { "show": false }), ("animate" in options ? ({}) : ({ "animate": false }))));
            modalStack.add(modal).show();
            currentModal = modal;
            modal.evtHide.attachOnce(function () { return currentModal = undefined; });
            modal.evtHidden.attachOnce(function () {
                if (restoreLoading) {
                    restoreLoading();
                }
                modal.removeFromDom();
            });
            return modal.evtHidden.waitFor();
        }
    };
    return out;
})();
var lockFn = runExclusive.build(function (pr) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!pr) {
                    return [2 /*return*/];
                }
                return [4 /*yield*/, pr];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
exports.startMultiDialogProcess = function () {
    var prLockAcquired = lockFn();
    var endMultiDialogProcess;
    lockFn(new Promise(function (resolve) { return endMultiDialogProcess = function () {
        dialogApi.dismissLoading();
        resolve();
    }; }));
    var dialogApi = {
        "create": function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return prLockAcquired.then(function () { return noLockDialogApi.create.apply(noLockDialogApi, __spread(args)); });
        },
        "loading": function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return prLockAcquired.then(function () { return noLockDialogApi.loading.apply(noLockDialogApi, __spread(args)); });
        },
        "dismissLoading": function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return prLockAcquired.then(function () { return noLockDialogApi.dismissLoading.apply(noLockDialogApi, __spread(args)); });
        }
    };
    return {
        endMultiDialogProcess: endMultiDialogProcess,
        dialogApi: dialogApi
    };
};
exports.dialogApi = {
    "create": function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(void 0, void 0, void 0, function () {
            var _a, endMultiDialogProcess, create;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = exports.startMultiDialogProcess(), endMultiDialogProcess = _a.endMultiDialogProcess, create = _a.dialogApi.create;
                        return [4 /*yield*/, create.apply(void 0, __spread(args))];
                    case 1:
                        _b.sent();
                        endMultiDialogProcess();
                        return [2 /*return*/];
                }
            });
        });
    },
    "loading": function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return lockFn().then(function () { return noLockDialogApi.loading.apply(noLockDialogApi, __spread(args)); });
    },
    "dismissLoading": function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return lockFn().then(function () { return noLockDialogApi.dismissLoading.apply(noLockDialogApi, __spread(args)); });
    }
};

},{"../stack":70,"./getApi":67,"./types":69,"run-exclusive":80}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],70:[function(require,module,exports){
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
var stack = [];
var onHideKey = " __hide_handler__ ";
//NOTE: Assert provided modal is not shown.
function add(modal) {
    var _this = this;
    return {
        "show": function () { return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var currentModal_1, handler, prHidden;
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
                                    modalToRestore_1.show();
                                }, 100);
                            }
                        };
                        //modal.one("hide.bs.modal", modal[onHideKey]);
                        modal.evtHide.attachOnce(modal[onHideKey]);
                        if (!(stack.length !== 1)) return [3 /*break*/, 2];
                        currentModal_1 = stack[stack.length - 2];
                        if (!!currentModal_1[" scheduled to be shown "]) return [3 /*break*/, 2];
                        //currentModal.off("hide.bs.modal", undefined, currentModal[onHideKey]);
                        {
                            handler = currentModal_1.evtHide.getHandlers()
                                .find(function (_a) {
                                var callback = _a.callback;
                                return callback === currentModal_1[onHideKey];
                            });
                            //NOTE: I think this can never be undefined by who know.
                            if (!!handler) {
                                handler.detach();
                            }
                        }
                        prHidden = new Promise(function (resolve) { return currentModal_1.evtHidden.attachOnce(function () { return resolve(); }); });
                        //currentModal.modal("hide");
                        currentModal_1.hide();
                        //currentModal.one("hide.bs.modal", currentModal[onHideKey]);
                        currentModal_1.evtHide.attachOnce(currentModal_1[onHideKey]);
                        return [4 /*yield*/, prHidden];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        //modal.one("shown.bs.modal", () => resolve());
                        modal.evtShown.attachOnce(function () { return resolve(); });
                        //modal.modal("show");
                        modal.show();
                        return [2 /*return*/];
                }
            });
        }); }); },
        "hide": function () { return new Promise(function (resolve) {
            if (stack.indexOf(modal) < 0) {
                resolve();
                return;
            }
            //modal.one("hidden.bs.modal", () => resolve());
            modal.evtHidden.attachOnce(function () { return resolve(); });
            //modal.modal("hide");
            modal.hide();
        }); }
    };
}
exports.add = add;

},{}],71:[function(require,module,exports){
if (typeof Object.assign !== 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) {
            'use strict';
            if (target === null || target === undefined) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            var to = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];
                if (nextSource !== null && nextSource !== undefined) {
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

},{}],72:[function(require,module,exports){
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

},{}],73:[function(require,module,exports){
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

},{}],74:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],75:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"./implementation":74,"dup":26}],76:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27,"function-bind":75}],77:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],78:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],79:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Map":78,"dup":23}],80:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21,"minimal-polyfills/dist/lib/WeakMap":79}],81:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],82:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"has":76}],83:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"super-json":82}],84:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"./SyncEventBase":85,"dup":29}],85:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"./SyncEventBaseProtected":86,"dup":30}],86:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./defs":87,"dup":31,"minimal-polyfills/dist/lib/Array.prototype.find":77,"minimal-polyfills/dist/lib/Map":78,"run-exclusive":80}],87:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32,"setprototypeof":81}],88:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"./SyncEvent":84,"./defs":87,"dup":33}],89:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPath = "/api";
var version;
(function (version) {
    version.methodName = "version";
})(version = exports.version || (exports.version = {}));

},{}]},{},[40]);
