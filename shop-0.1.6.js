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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("frontend-shared/dist/lib/loadUiClassHtml");
var ts_events_extended_1 = require("frontend-shared/node_modules/ts-events-extended");
var types = require("frontend-shared/dist/lib/types/shop");
var env_1 = require("frontend-shared/dist/lib/env");
var shipping_1 = require("frontend-shared/dist/lib/shipping");
var currency_1 = require("frontend-shared/dist/tools/currency");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiCart.html"), "UiCart");
require("../templates/UiCart.less");
var UiCart = /** @class */ (function () {
    function UiCart(currency, shipToCountryIso) {
        var _this = this;
        this.structure = html.structure.clone();
        this.evtUserClickCheckout = new ts_events_extended_1.VoidSyncEvent();
        this.uiCartEntries = [];
        this.structure.find(".id_checkout")
            .on("click", function () { return _this.evtUserClickCheckout.post(); });
        this.updateLocals({ currency: currency, shipToCountryIso: shipToCountryIso });
    }
    UiCart.prototype.getCart = function () {
        return this.uiCartEntries
            .map(function (_a) {
            var cartEntry = _a.cartEntry;
            return cartEntry;
        });
    };
    UiCart.prototype.updateLocals = function (locals) {
        var currency = locals.currency, shipToCountryIso = locals.shipToCountryIso;
        if (currency !== undefined) {
            this.currency = currency;
            for (var _i = 0, _a = this.uiCartEntries; _i < _a.length; _i++) {
                var uiShoppingBagEntry = _a[_i];
                uiShoppingBagEntry.updateCurrency(currency);
            }
        }
        if (shipToCountryIso !== undefined) {
            this.shipToCountryIso = shipToCountryIso;
        }
        this.updateTotal();
    };
    UiCart.prototype.updateTotal = function () {
        var cart = this.getCart();
        if (cart.length === 0) {
            this.structure.hide();
        }
        else {
            this.structure.show();
        }
        var shipping = shipping_1.solve(this.shipToCountryIso, types.Cart.getOverallFootprint(cart), types.Cart.getOverallWeight(cart));
        var cartPrice = types.Cart.getPrice(cart, currency_1.convertFromEuro);
        console.log("TODO: display delay ", shipping.delay);
        this.structure.find(".id_cart_price").text(types.Price.prettyPrint(cartPrice, this.currency, currency_1.convertFromEuro));
        this.structure.find(".id_shipping_price").text(types.Price.prettyPrint({ "eur": shipping.eurAmount }, this.currency, currency_1.convertFromEuro));
        this.structure.find(".id_cart_total").text(types.Price.prettyPrint(types.Price.addition(cartPrice, { "eur": shipping.eurAmount }, currency_1.convertFromEuro), this.currency, currency_1.convertFromEuro));
    };
    UiCart.prototype.addProduct = function (product) {
        var _this = this;
        {
            var uiCartEntry_1 = this.uiCartEntries.find(function (_a) {
                var cartEntry = _a.cartEntry;
                return cartEntry.product === product;
            });
            if (!!uiCartEntry_1) {
                uiCartEntry_1.simulatePlusClick();
                return;
            }
        }
        var uiCartEntry = new UiCartEntry({ product: product, "quantity": 1 }, this.currency);
        this.uiCartEntries.push(uiCartEntry);
        this.structure.find(".shopping-cart").append(uiCartEntry.structure);
        uiCartEntry.evtUserClickDelete.attachOnce(function () {
            _this.uiCartEntries.splice(_this.uiCartEntries.indexOf(uiCartEntry), 1);
            uiCartEntry.structure.detach();
            _this.updateTotal();
        });
        uiCartEntry.evtQuantityChanged.attach(function () {
            return _this.updateTotal();
        });
        this.updateTotal();
    };
    return UiCart;
}());
exports.UiCart = UiCart;
var UiCartEntry = /** @class */ (function () {
    function UiCartEntry(cartEntry, currency) {
        var _this = this;
        this.cartEntry = cartEntry;
        this.structure = html.templates.find(".id_UiCartEntry").clone();
        this.evtUserClickDelete = new ts_events_extended_1.VoidSyncEvent();
        this.evtQuantityChanged = new ts_events_extended_1.VoidSyncEvent();
        this.structure.find(".delete-btn").css("background", "url(\"" + env_1.env.assetsRoot + "svg/delete-icn.svg\") no-repeat center");
        for (var _i = 0, _a = ["plus", "minus"]; _i < _a.length; _i++) {
            var selector = _a[_i];
            this.structure.find("." + selector + "-btn img").attr("src", env_1.env.assetsRoot + "svg/" + selector + ".svg");
        }
        this.structure.find(".image img").attr("src", cartEntry.product.cartImageUrl);
        this.structure.find(".id_item_name").text(cartEntry.product.name);
        this.structure.find(".id_short_description").text(cartEntry.product.shortDescription);
        {
            var $input_1 = this.structure.find(".quantity input");
            $input_1.val(cartEntry.quantity);
            var updateCounter = function (op) { return (function (event) {
                event.preventDefault();
                var oldValue = cartEntry.quantity;
                var newValue = (op === "++" ? oldValue < 100 : oldValue > 1) ?
                    (oldValue + (op === "++" ? 1 : -1)) :
                    (op === "++" ? 100 : 1);
                if (newValue === oldValue) {
                    return;
                }
                $input_1.val(newValue);
                cartEntry.quantity = newValue;
                _this.updateDisplayedPrice();
                _this.evtQuantityChanged.post();
            }); };
            this.structure.find(".minus-btn").on("click", updateCounter("--"));
            this.structure.find(".plus-btn").on("click", updateCounter("++"));
        }
        this.structure.find(".delete-btn").one("click", function () { return _this.evtUserClickDelete.post(); });
        this.updateCurrency(currency);
    }
    UiCartEntry.prototype.simulatePlusClick = function () {
        this.structure.find(".plus-btn").trigger("click");
    };
    UiCartEntry.prototype.updateCurrency = function (currency) {
        this.currency = currency;
        this.updateDisplayedPrice();
    };
    UiCartEntry.prototype.updateDisplayedPrice = function () {
        var _this = this;
        this.structure.find(".total-price").html(types.Price.prettyPrint(types.Price.operation(this.cartEntry.product.price, function (amount) { return amount * _this.cartEntry.quantity; }), this.currency, currency_1.convertFromEuro));
    };
    return UiCartEntry;
}());

},{"../templates/UiCart.html":13,"../templates/UiCart.less":14,"frontend-shared/dist/lib/env":27,"frontend-shared/dist/lib/loadUiClassHtml":28,"frontend-shared/dist/lib/shipping":37,"frontend-shared/dist/lib/types/shop":40,"frontend-shared/dist/tools/currency":43,"frontend-shared/node_modules/ts-events-extended":66}],5:[function(require,module,exports){
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
var loadUiClassHtml_1 = require("frontend-shared/dist/lib/loadUiClassHtml");
var UiCart_1 = require("./UiCart");
var UiProduct_1 = require("./UiProduct");
var shopProducts_1 = require("frontend-shared/dist/lib/shopProducts");
var env_1 = require("frontend-shared/dist/lib/env");
var UiShipTo_1 = require("./UiShipTo");
var currency_1 = require("frontend-shared/dist/tools/currency");
var UiCurrency_1 = require("./UiCurrency");
var UiShippingForm_1 = require("./UiShippingForm");
var dialog_1 = require("frontend-shared/dist/tools/modal/dialog");
var webApiCaller = require("frontend-shared/dist/lib/webApiCaller");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiController.html"), "UiController");
var UiController = /** @class */ (function () {
    function UiController(defaultCountryIso) {
        var _this = this;
        this.structure = html.structure.clone();
        if (defaultCountryIso === undefined) {
            //TODO: change to "fr"
            defaultCountryIso = "us";
        }
        var currency = currency_1.getCountryCurrency(defaultCountryIso);
        var uiCurrency = new UiCurrency_1.UiCurrency(currency);
        $(".navbar-right").prepend(uiCurrency.structure);
        var uiShipTo = new UiShipTo_1.UiShipTo(defaultCountryIso);
        uiShipTo.evtChange.attach(function (shipToCountryIso) { return uiCurrency.change(currency_1.getCountryCurrency(shipToCountryIso)); });
        //We break the rules of our framework here by inserting outside of the ui structure...
        $(".navbar-right").prepend(uiShipTo.structure);
        var uiCart = new UiCart_1.UiCart(currency, defaultCountryIso);
        {
            var uiShippingAddress_1 = new UiShippingForm_1.UiShippingForm();
            uiCart.evtUserClickCheckout.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                var shippingFormData, currency;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, uiShippingAddress_1.interact_getAddress()];
                        case 1:
                            shippingFormData = _a.sent();
                            if (shippingFormData === undefined) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, uiCurrency.interact_getCurrency()];
                        case 2:
                            currency = _a.sent();
                            this.interact_checkout(uiCart.getCart(), shippingFormData, currency);
                            return [2 /*return*/];
                    }
                });
            }); });
        }
        uiCurrency.evtChange.attach(function (currency) { return uiCart.updateLocals({ currency: currency }); });
        uiShipTo.evtChange.attach(function (shipToCountryIso) { return uiCart.updateLocals({ shipToCountryIso: shipToCountryIso }); });
        this.structure.find(".id_container").append(uiCart.structure);
        var _loop_1 = function (product) {
            var uiProduct = new UiProduct_1.UiProduct(product, currency);
            uiCurrency.evtChange.attach(function (currency) { return uiProduct.updateCurrency(currency); });
            uiProduct.evtUserClickAddToCart.attach(function () {
                uiCart.addProduct(product);
                $("html, body").animate({ "scrollTop": 0 }, "slow");
            });
            this_1.structure.find(".id_container")
                .append(uiProduct.structure);
        };
        var this_1 = this;
        for (var _i = 0, _a = shopProducts_1.getProducts(env_1.env.assetsRoot); _i < _a.length; _i++) {
            var product = _a[_i];
            _loop_1(product);
        }
    }
    UiController.prototype.interact_checkout = function (cart, shippingFormData, currency) {
        return __awaiter(this, void 0, void 0, function () {
            var url, _a, stripePublicApiKey, sessionId, stripe;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        dialog_1.dialogApi.loading("Redirecting to payment page");
                        url = window.location.href.split("?")[0];
                        return [4 /*yield*/, webApiCaller.createStripeCheckoutSessionForShop(cart, shippingFormData, currency, url + "?success=true", url + "?success=false")];
                    case 1:
                        _a = _b.sent(), stripePublicApiKey = _a.stripePublicApiKey, sessionId = _a.checkoutSessionId;
                        stripe = Stripe(stripePublicApiKey);
                        stripe.redirectToCheckout({ sessionId: sessionId })
                            .then(function (result) {
                            if (!!result.error) {
                                alert(result.error.message);
                            }
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    return UiController;
}());
exports.UiController = UiController;

},{"../templates/UiController.html":15,"./UiCart":4,"./UiCurrency":6,"./UiProduct":7,"./UiShipTo":8,"./UiShippingForm":9,"frontend-shared/dist/lib/env":27,"frontend-shared/dist/lib/loadUiClassHtml":28,"frontend-shared/dist/lib/shopProducts":38,"frontend-shared/dist/lib/webApiCaller":41,"frontend-shared/dist/tools/currency":43,"frontend-shared/dist/tools/modal/dialog":46}],6:[function(require,module,exports){
"use strict";
//NOTE: Assert Select2 v4.0.6-rc.0 loaded.
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
var loadUiClassHtml_1 = require("frontend-shared/dist/lib/loadUiClassHtml");
var ts_events_extended_1 = require("frontend-shared/node_modules/ts-events-extended");
var currencyLib = require("frontend-shared/dist/tools/currency");
var dialog_1 = require("frontend-shared/dist/tools/modal/dialog");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiCurrency.html"), "UiCurrency");
require("../templates/UiCurrency.less");
var UiCurrency = /** @class */ (function () {
    function UiCurrency(defaultCurrency) {
        var _this = this;
        this.structure = html.structure.clone();
        this.evtChange = new ts_events_extended_1.SyncEvent();
        this.evt$select_on_change = new ts_events_extended_1.VoidSyncEvent();
        this.structure.one("show.bs.dropdown", function () {
            var $select = _this.structure.find("select");
            var sortedCurrencies = Object.keys(currencyLib.data)
                .map(function (currency) { return ({ currency: currency, "count": currencyLib.data[currency].countriesIso.length }); })
                .sort(function (a, b) { return b.count - a.count; })
                .map(function (_a) {
                var currency = _a.currency;
                return currency;
            });
            for (var _i = 0, sortedCurrencies_1 = sortedCurrencies; _i < sortedCurrencies_1.length; _i++) {
                var currency = sortedCurrencies_1[_i];
                var $option = html.templates.find("option").clone();
                $option.attr("value", currency);
                var _a = currencyLib.data[currency], symbol = _a.symbol, name_1 = _a.name;
                $option.html(symbol + " - " + name_1);
                $select.append($option);
            }
            $select["select2"]();
            $select.on("change", function () { return _this.evt$select_on_change.post(); });
            _this.evt$select_on_change.attach(function () {
                _this.structure.find("a").trigger("click");
                _this.change($select.val());
            });
        });
        this.structure.on("shown.bs.dropdown", function () {
            var $select = _this.structure.find("select");
            if ($select.val() === _this.currency) {
                return;
            }
            _this.evt$select_on_change.attachOnceExtract(function () { });
            $select.val(_this.currency).trigger("change");
        });
        //NOTE: Preventing dropdown from closing.
        {
            var target_1;
            $("body").on("click", function (e) { target_1 = e.target; });
            this.structure.on("hide.bs.dropdown", function () {
                if (_this.structure.find("a").is(target_1)) {
                    return true;
                }
                if (_this.structure.has(target_1).length !== 0) {
                    return false;
                }
                if ($(".select2-dropdown").has(target_1).length !== 0) {
                    return false;
                }
                return true;
            });
        }
        this.change(defaultCurrency);
    }
    UiCurrency.prototype.change = function (currency) {
        this.currency = currency;
        this.structure.find(".id_currency").text(currencyLib.data[currency].symbol);
        this.evtChange.post(currency);
    };
    UiCurrency.prototype.interact_getCurrency = function () {
        return __awaiter(this, void 0, void 0, function () {
            var doChange;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) {
                            return dialog_1.dialogApi.create("dialog", {
                                "title": "Currency",
                                "message": "Pay in " + currencyLib.data[_this.currency].name + " ?",
                                "closeButton": false,
                                "buttons": {
                                    "btn1": {
                                        "label": "Yes, pay in " + currencyLib.data[_this.currency].symbol,
                                        "className": "btn-success",
                                        "callback": function () { return resolve(false); }
                                    },
                                    "btn2": {
                                        "label": "No, pay with an other currency",
                                        "className": 'btn-warning',
                                        "callback": function () { return resolve(true); }
                                    }
                                },
                                "onEscape": false
                            });
                        })];
                    case 1:
                        doChange = _a.sent();
                        if (!doChange) {
                            return [2 /*return*/, this.currency];
                        }
                        this.structure.one("shown.bs.dropdown", function () { return _this.structure.find("select")["select2"]("open"); });
                        this.structure.find("a").trigger("click");
                        return [4 /*yield*/, new Promise(function (resolve) {
                                return _this.structure.one("hide.bs.dropdown", function () { return resolve(); });
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, this.currency];
                }
            });
        });
    };
    return UiCurrency;
}());
exports.UiCurrency = UiCurrency;

},{"../templates/UiCurrency.html":16,"../templates/UiCurrency.less":17,"frontend-shared/dist/lib/loadUiClassHtml":28,"frontend-shared/dist/tools/currency":43,"frontend-shared/dist/tools/modal/dialog":46,"frontend-shared/node_modules/ts-events-extended":66}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("frontend-shared/dist/lib/loadUiClassHtml");
var ts_events_extended_1 = require("frontend-shared/node_modules/ts-events-extended");
var types = require("frontend-shared/dist/lib/types/shop");
var currency_1 = require("frontend-shared/dist/tools/currency");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiProduct.html"), "UiProduct");
require("../templates/UiProduct.less");
var UiProduct = /** @class */ (function () {
    function UiProduct(product, currency) {
        var _this = this;
        this.product = product;
        this.structure = html.structure.clone();
        this.evtUserClickAddToCart = new ts_events_extended_1.VoidSyncEvent();
        {
            var carouselId_1 = "carousel-" + UiProduct.getCounter();
            var $divCarousel = this.structure.find(".carousel");
            $divCarousel.attr("id", carouselId_1);
            var _loop_1 = function (i) {
                $divCarousel.find(".carousel-indicators").append(function () {
                    var $li = html.templates.find("li").clone();
                    $li.attr("data-target", carouselId_1);
                    $li.attr("data-slide-to", "" + i);
                    if (i === 0) {
                        $li.addClass("active");
                    }
                    return $li;
                });
                $divCarousel.find(".carousel-inner").append(function () {
                    var $div = html.templates.find(".item").clone();
                    if (i === 0) {
                        $div.addClass("active");
                    }
                    $div.find("img").attr("src", product.imageUrls[i]);
                    return $div;
                });
            };
            for (var i = 0; i < product.imageUrls.length; i++) {
                _loop_1(i);
            }
            {
                var $divs = $divCarousel.find(".carousel-control");
                $divs.attr("href", "#" + carouselId_1);
                if (product.imageUrls.length === 1) {
                    $divs.hide();
                }
            }
            $divCarousel.carousel({ "interval": 0 });
        }
        this.structure.find(".id_short_description").text(product.shortDescription);
        this.structure.find(".id_product_name").text(product.name);
        this.structure.find(".id_product_description").text(product.description);
        this.structure.find(".id_add_to_cart")
            .on("click", function () { return _this.evtUserClickAddToCart.post(); });
        this.updateCurrency(currency);
    }
    UiProduct.prototype.updateCurrency = function (currency) {
        this.currency = currency;
        this.updatePrice();
    };
    UiProduct.prototype.updatePrice = function () {
        this.structure.find(".id_product_price").text(types.Price.prettyPrint(this.product.price, this.currency, currency_1.convertFromEuro));
    };
    UiProduct.getCounter = (function () {
        var counter = 0;
        return function () { return counter++; };
    })();
    return UiProduct;
}());
exports.UiProduct = UiProduct;

},{"../templates/UiProduct.html":18,"../templates/UiProduct.less":19,"frontend-shared/dist/lib/loadUiClassHtml":28,"frontend-shared/dist/lib/types/shop":40,"frontend-shared/dist/tools/currency":43,"frontend-shared/node_modules/ts-events-extended":66}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("frontend-shared/dist/lib/loadUiClassHtml");
var ts_events_extended_1 = require("frontend-shared/node_modules/ts-events-extended");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiShipTo.html"), "UiShipTo");
require("../templates/UiShipTo.less");
var UiShipTo = /** @class */ (function () {
    function UiShipTo(shipToCountryIso) {
        var _this = this;
        this.structure = html.structure.clone();
        this.evtChange = new ts_events_extended_1.SyncEvent();
        //NOTE: Safe to access, set at creation.
        this.shipToCountryIso = "";
        this.structure.one("show.bs.dropdown", function () {
            return (new window["NiceCountryInput"]($countrySelector)).init();
        });
        var $countrySelector = this.structure.find(".id_countrySelector");
        var cbName = "UiShipTo_onChangeCallback_" + UiShipTo.getCounter();
        $countrySelector
            .attr("data-selectedcountry", shipToCountryIso.toUpperCase())
            .attr("data-onchangecallback", cbName);
        window[cbName] = function (iso) {
            //NOTE: To close the dropdown
            $("body").trigger("click");
            _this.change(iso.toLowerCase());
            _this.evtChange.post(_this.shipToCountryIso);
        };
        this.change(shipToCountryIso);
        //NOTE: Prevent dropdown from closing when select country is clicked.
        this.structure.find(".dropdown-menu").on("click", function () { return false; });
    }
    UiShipTo.prototype.change = function (shipToCountryIso) {
        var $divFlag = this.structure.find(".id_flag");
        if (this.shipToCountryIso !== "") {
            $divFlag.removeClass(this.shipToCountryIso);
        }
        this.shipToCountryIso = shipToCountryIso;
        $divFlag.addClass(this.shipToCountryIso);
    };
    UiShipTo.getCounter = function () {
        var counter = 0;
        return function () { return counter++; };
    };
    return UiShipTo;
}());
exports.UiShipTo = UiShipTo;

},{"../templates/UiShipTo.html":20,"../templates/UiShipTo.less":21,"frontend-shared/dist/lib/loadUiClassHtml":28,"frontend-shared/node_modules/ts-events-extended":66}],9:[function(require,module,exports){
"use strict";
//NOTE: assert maps.googleapis.com/maps/api/js?libraries=places loaded ( or loading ) on the page.
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
var ts_events_extended_1 = require("frontend-shared/node_modules/ts-events-extended");
var loadUiClassHtml_1 = require("frontend-shared/dist/lib/loadUiClassHtml");
var modalApi = require("frontend-shared/dist/tools/modal");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiShippingForm.html"), "UiShippingForm");
require("../templates/UiShippingForm.less");
var UiShippingForm = /** @class */ (function () {
    /**
     * The evt argument should post be posted whenever.
     * -An user accept a sharing request.
     * -An user reject a sharing request.
     * -An user unregistered a shared sim.
     */
    function UiShippingForm() {
        var _this = this;
        this.structure = html.structure.clone();
        this.evt_id_close_click = new ts_events_extended_1.VoidSyncEvent();
        this.evt_button_click = new ts_events_extended_1.VoidSyncEvent();
        this.autocomplete = undefined;
        {
            var _a = modalApi.createModal(this.structure, {
                "keyboard": false,
                "backdrop": true
            }), hide = _a.hide, show = _a.show;
            this.hideModal = hide;
            this.showModal = show;
        }
        this.structure.find(".id_close")
            .on("click", function () { return _this.evt_id_close_click.post(); });
        this.structure.find("button")
            .on("click", function () { return _this.evt_button_click.post(); });
        var _loop_1 = function (selector) {
            var $input = this_1.structure.find(selector);
            $input.on("keypress", function () {
                return $input.removeClass("field-error");
            });
        };
        var this_1 = this;
        for (var _i = 0, _b = [
            ".id_firstName",
            ".id_lastName",
            ".id_placeAutocomplete",
            ".id_extra"
        ]; _i < _b.length; _i++) {
            var selector = _b[_i];
            _loop_1(selector);
        }
    }
    UiShippingForm.prototype.initAutocomplete = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isGoogleMapScriptReady;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isGoogleMapScriptReady = function () {
                            if (typeof google === "undefined") {
                                return false;
                            }
                            try {
                                google.maps.places.Autocomplete;
                            }
                            catch (_a) {
                                return false;
                            }
                            return true;
                        };
                        _a.label = 1;
                    case 1:
                        if (!!isGoogleMapScriptReady()) return [3 /*break*/, 3];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 200); })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        this.autocomplete = new google.maps.places.Autocomplete(this.structure.find(".id_placeAutocomplete").get(0), { "types": ["geocode"] });
                        this.autocomplete.setFields(["address_component"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    UiShippingForm.prototype.interact_getAddress = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resolvePrOut, prOut;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prOut = new Promise(function (resolve) { return resolvePrOut = resolve; });
                        this.evt_id_close_click.detach();
                        this.evt_button_click.detach();
                        this.evt_id_close_click.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.hideModal()];
                                    case 1:
                                        _a.sent();
                                        resolvePrOut(undefined);
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.evt_button_click.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                            var isFormValidated, _i, _a, selector, $input, isValid;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        {
                                            isFormValidated = true;
                                            for (_i = 0, _a = [
                                                ".id_firstName",
                                                ".id_lastName",
                                                ".id_placeAutocomplete"
                                            ]; _i < _a.length; _i++) {
                                                selector = _a[_i];
                                                $input = this.structure.find(selector);
                                                isValid = !!$input.val();
                                                if (selector === ".id_placeAutocomplete") {
                                                    isValid = isValid && !!this.autocomplete.getPlace();
                                                }
                                                if (!isValid) {
                                                    $input.addClass("field-error");
                                                    isFormValidated = false;
                                                }
                                            }
                                            if (!isFormValidated) {
                                                return [2 /*return*/];
                                            }
                                        }
                                        return [4 /*yield*/, this.hideModal()];
                                    case 1:
                                        _b.sent();
                                        resolvePrOut({
                                            "firstName": this.structure.find(".id_firstName").val(),
                                            "lastName": this.structure.find(".id_lastName").val(),
                                            "addressComponents": this.autocomplete.getPlace()["address_components"],
                                            "addressExtra": this.structure.find(".id_extra").val() || undefined
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.evt_id_close_click.attachOnce(function () { return resolvePrOut(undefined); });
                        return [4 /*yield*/, this.showModal()];
                    case 1:
                        _a.sent();
                        if (!(this.autocomplete === undefined)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.initAutocomplete()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, prOut];
                }
            });
        });
    };
    return UiShippingForm;
}());
exports.UiShippingForm = UiShippingForm;

},{"../templates/UiShippingForm.html":22,"../templates/UiShippingForm.less":23,"frontend-shared/dist/lib/loadUiClassHtml":28,"frontend-shared/dist/tools/modal":49,"frontend-shared/node_modules/ts-events-extended":66}],10:[function(require,module,exports){
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
var webApiCaller = require("frontend-shared/dist/lib/webApiCaller");
var UiController_1 = require("./UiController");
var currency_1 = require("frontend-shared/dist/tools/currency");
var availablePages = require("frontend-shared/dist/lib/availablePages");
$(document).ready(function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, changesRates, _b, countryIsoFromLocation, countryIsoForLanguage, uiController;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                $("#logout").click(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, webApiCaller.logoutUser()];
                            case 1:
                                _a.sent();
                                location.href = "/" + availablePages.PageName.login;
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [4 /*yield*/, Promise.all([
                        webApiCaller.getChangesRates(),
                        webApiCaller.getCountryIso()
                    ])];
            case 1:
                _a = _c.sent(), changesRates = _a[0], _b = _a[1], countryIsoFromLocation = _b.location, countryIsoForLanguage = _b.language;
                currency_1.convertFromEuro.setChangeRates(changesRates);
                console.log({ countryIsoForLanguage: countryIsoForLanguage, countryIsoFromLocation: countryIsoFromLocation });
                uiController = new UiController_1.UiController(countryIsoFromLocation || countryIsoForLanguage);
                $("#page-payload").html("").append(uiController.structure);
                return [2 /*return*/];
        }
    });
}); });

},{"./UiController":5,"frontend-shared/dist/lib/availablePages":25,"frontend-shared/dist/lib/webApiCaller":41,"frontend-shared/dist/tools/currency":43}],11:[function(require,module,exports){
module.exports = function (css, customDocument) {
  var doc = customDocument || document;
  if (doc.createStyleSheet) {
    var sheet = doc.createStyleSheet()
    sheet.cssText = css;
    return sheet.ownerNode;
  } else {
    var head = doc.getElementsByTagName('head')[0],
        style = doc.createElement('style');

    style.type = 'text/css';

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(doc.createTextNode(css));
    }

    head.appendChild(style);
    return style;
  }
};

module.exports.byUrl = function(url) {
  if (document.createStyleSheet) {
    return document.createStyleSheet(url).ownerNode;
  } else {
    var head = document.getElementsByTagName('head')[0],
        link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = url;

    head.appendChild(link);
    return link;
  }
};

},{}],12:[function(require,module,exports){
module.exports = require('cssify');

},{"cssify":11}],13:[function(require,module,exports){
module.exports = "\r\n\r\n<!--TODO: col-sm-12 should be externalized -->\r\n<div class=\"id_UiCart panel plain col-sm-12 col-lg-10\">\r\n\r\n    <div class=\"panel-heading\">\r\n        <h4 class=\"panel-title\"><i class=\"glyphicon glyphicon-shopping-cart\"></i> Shopping bag</h4>\r\n    </div>\r\n\r\n    <div class=\"panel-body\">\r\n\r\n      <div class=\"shopping-cart\">\r\n\r\n      </div>\r\n\r\n      <div class=\"pull-right mt15\">\r\n\r\n        <span class=\"id_cart_price\"></span>\r\n        &nbsp;\r\n        <span>+</span>\r\n        &nbsp;\r\n        <span style=\"font-style: italic;\">shipping:</span>\r\n        &nbsp;\r\n        <span class=\"id_shipping_price\"></span>\r\n        &nbsp;\r\n        &nbsp;\r\n        <span style=\"font-weight: bold;\">Total: </span><span class=\"id_cart_total\" ></span>\r\n        &nbsp;\r\n        <button type=\"button\" class=\"id_checkout btn btn-success\">Checkout</button>\r\n\r\n      </div>\r\n\r\n    </div>\r\n\r\n</div>\r\n\r\n<div class=\"templates\">\r\n\r\n  <div class=\"item id_UiCartEntry\">\r\n    <div class=\"buttons\">\r\n      <span class=\"delete-btn\"></span>\r\n    </div>\r\n\r\n    <div class=\"image\">\r\n      <img src=\"\" alt=\"\" />\r\n    </div>\r\n\r\n    <div class=\"description\">\r\n      <span class=\"id_item_name\">Common Projects</span>\r\n      <span class=\"id_short_description\" >White</span>\r\n    </div>\r\n\r\n    <div class=\"quantity\">\r\n      <button class=\"plus-btn\" type=\"button\" name=\"button\">\r\n        <img  alt=\"\" /><!-- src=\"/svg/plus.svg\" -->\r\n      </button>\r\n      <input type=\"text\" name=\"name\" value=\"1\">\r\n      <button class=\"minus-btn\" type=\"button\" name=\"button\">\r\n        <img src=\"\" alt=\"\" /><!-- src=\"/svg/minus.svg\" -->\r\n      </button>\r\n    </div>\r\n\r\n    <div class=\"total-price\">$549</div>\r\n  </div>\r\n\r\n\r\n</div>\r\n\r\n\r\n\r\n";
},{}],14:[function(require,module,exports){
var css = "div.id_UiCart {\n  /* Responsive */\n}\ndiv.id_UiCart .shopping-cart {\n  box-shadow: 1px 2px 3px 0px rgba(0, 0, 0, 0.1);\n  border-radius: 6px;\n  display: flex;\n  flex-direction: column;\n  border-top: 1px solid #E1E8EE;\n  border-left: 1px solid #E1E8EE;\n  border-right: 1px solid #E1E8EE;\n  /* Buttons -  Delete and Like */\n  /* Product Image */\n  /* Product Description */\n  /* Product Quantity */\n  /* Total Price */\n}\ndiv.id_UiCart .shopping-cart .item {\n  padding: 20px 30px;\n  height: 120px;\n  display: flex;\n  border-bottom: 1px solid #E1E8EE;\n}\ndiv.id_UiCart .shopping-cart .buttons {\n  position: relative;\n  padding-top: 30px;\n  margin-right: 60px;\n}\ndiv.id_UiCart .shopping-cart .delete-btn {\n  display: inline-block;\n  cursor: pointer;\n  width: 18px;\n  height: 17px;\n  margin-right: 20px;\n}\ndiv.id_UiCart .shopping-cart .is-active {\n  animation-name: animate;\n  animation-duration: .8s;\n  animation-iteration-count: 1;\n  animation-timing-function: steps(28);\n  animation-fill-mode: forwards;\n}\n@keyframes animate {\n  0% {\n    background-position: left;\n  }\n  50% {\n    background-position: right;\n  }\n  100% {\n    background-position: right;\n  }\n}\ndiv.id_UiCart .shopping-cart .image {\n  margin-right: 50px;\n}\ndiv.id_UiCart .shopping-cart .image img {\n  height: 80px;\n}\ndiv.id_UiCart .shopping-cart .description {\n  padding-top: 10px;\n  margin-right: 60px;\n  width: 115px;\n}\ndiv.id_UiCart .shopping-cart .description span {\n  display: block;\n  font-size: 14px;\n  color: #43484D;\n  font-weight: 400;\n}\ndiv.id_UiCart .shopping-cart .description span.id_item_name {\n  margin-bottom: 5px;\n}\ndiv.id_UiCart .shopping-cart .description span.id_short_description {\n  font-weight: 300;\n  margin-top: 8px;\n  color: #86939E;\n}\ndiv.id_UiCart .shopping-cart .quantity {\n  padding-top: 20px;\n  margin-right: 60px;\n}\ndiv.id_UiCart .shopping-cart .quantity input {\n  -webkit-appearance: none;\n  border: none;\n  text-align: center;\n  width: 32px;\n  font-size: 16px;\n  color: #43484D;\n  font-weight: 300;\n}\ndiv.id_UiCart .shopping-cart button[class*=btn] {\n  width: 30px;\n  height: 30px;\n  background-color: #E1E8EE;\n  border-radius: 6px;\n  border: none;\n  cursor: pointer;\n}\ndiv.id_UiCart .shopping-cart .minus-btn img {\n  margin-bottom: 3px;\n}\ndiv.id_UiCart .shopping-cart .plus-btn img {\n  margin-top: 2px;\n}\ndiv.id_UiCart .shopping-cart button:focus,\ndiv.id_UiCart .shopping-cart input:focus {\n  outline: 0;\n}\ndiv.id_UiCart .shopping-cart .total-price {\n  width: 83px;\n  padding-top: 27px;\n  text-align: center;\n  font-size: 16px;\n  color: #43484D;\n  font-weight: 300;\n}\n@media (max-width: 800px) {\n  div.id_UiCart .shopping-cart {\n    width: 100%;\n    height: auto;\n    overflow: hidden;\n  }\n  div.id_UiCart .shopping-cart .item {\n    height: auto;\n    flex-wrap: wrap;\n    justify-content: center;\n  }\n  div.id_UiCart .shopping-cart .image,\n  div.id_UiCart .shopping-cart .quantity,\n  div.id_UiCart .shopping-cart .description {\n    width: 100%;\n    text-align: center;\n    margin: 6px 0;\n  }\n  div.id_UiCart .shopping-cart .buttons {\n    margin-right: 20px;\n  }\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":12}],15:[function(require,module,exports){
module.exports = "<div class=\"id_UiController\">\r\n\r\n    <div class=\"row id_container pt5\">\r\n\r\n    </div>\r\n\r\n</div>";
},{}],16:[function(require,module,exports){
module.exports = "<li class=\"id_UiCurrency dropdown\">\r\n\r\n  <a href=\"#\" data-toggle=\"dropdown\" aria-expanded=\"false\">\r\n    <span class=\"id_currency\"></span>\r\n  </a>\r\n\r\n  <div class=\"dropdown-menu dropdown-form dynamic-settings right animated fadeIn\" role=\"menu\">\r\n\r\n    <select>\r\n    </select>\r\n\r\n  </div>\r\n\r\n</li>\r\n\r\n\r\n<div class=\"templates\">\r\n\r\n  <option></option>\r\n\r\n</div>";
},{}],17:[function(require,module,exports){
var css = ".id_UiCurrency {\n  /*@media all and (max-width: 767px) {*/\n}\n@media all and (max-width: 768px) {\n  .id_UiCurrency {\n    top: -21px;\n  }\n}\n.id_UiCurrency select {\n  width: 200px;\n}\n.id_UiCurrency .dropdown-menu.dynamic-settings {\n  min-width: unset !important;\n}\n.id_UiCurrency .dropdown-menu {\n  border-bottom-width: 0px;\n  border-left-width: 0px;\n  border-right-width: 0px;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":12}],18:[function(require,module,exports){
module.exports = "<!--TODO: col-sm-12 should be externalized -->\r\n<div class=\"id_UiProduct panel plain col-sm-12 col-lg-10\">\r\n\r\n    <div class=\"panel-body\">\r\n\r\n        <div class=\"left-column\">\r\n\r\n            <div class=\"carousel slide\">\r\n                <ol class=\"carousel-indicators dotstyle center\">\r\n                </ol>\r\n                <div class=\"carousel-inner\">\r\n                </div>\r\n                <a class=\"left carousel-control\" data-slide=\"prev\">\r\n                    <i class=\"fa fa-angle-left\"></i>\r\n                </a>\r\n                <a class=\"right carousel-control\" data-slide=\"next\">\r\n                    <i class=\"fa fa-angle-right\"></i>\r\n                </a>\r\n            </div>\r\n\r\n\r\n\r\n        </div>\r\n\r\n        <div class=\"right-column\">\r\n\r\n            <div class=\"product-description\">\r\n                <span class=\"id_short_description\"></span>\r\n                <h1 class=\"id_product_name\"></h1>\r\n                <p class=\"id_product_description\"></p>\r\n            </div>\r\n\r\n            <div class=\"product-price\">\r\n                <span class=\"id_product_price\"></span>\r\n            </div>\r\n\r\n            <div class=\"pull-right mt10\">\r\n                <button type=\"button\" class=\"id_add_to_cart btn btn-success\">Add to cart</button>\r\n            </div>\r\n\r\n        </div>\r\n\r\n    </div>\r\n\r\n</div>\r\n\r\n<div class=\"templates\">\r\n\r\n    <div class=\"item\">\r\n        <img src=\"\">\r\n    </div>\r\n\r\n    <li>\r\n        <a href=\"#\"></a>\r\n    </li>\r\n\r\n</div>";
},{}],19:[function(require,module,exports){
var css = "div.id_UiProduct .panel-body {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 15px;\n  display: flex;\n}\ndiv.id_UiProduct .panel-body .left-column {\n  width: 35%;\n  padding-right: 4%;\n}\ndiv.id_UiProduct .panel-body .right-column {\n  width: 65%;\n}\ndiv.id_UiProduct .panel-body .carousel-control {\n  background-image: none !important;\n}\ndiv.id_UiProduct .panel-body .product-description {\n  border-bottom: 1px solid #E1E8EE;\n  margin-bottom: 20px;\n}\ndiv.id_UiProduct .panel-body .product-description span {\n  font-size: 12px;\n  color: #358ED7;\n  letter-spacing: 1px;\n  text-transform: uppercase;\n  text-decoration: none;\n}\ndiv.id_UiProduct .panel-body .product-description h1 {\n  font-weight: 300;\n  font-size: 52px;\n  color: #43484D;\n  letter-spacing: -2px;\n}\ndiv.id_UiProduct .panel-body .product-description p {\n  font-size: 16px;\n  font-weight: 300;\n  color: #86939E;\n  line-height: 24px;\n}\ndiv.id_UiProduct .panel-body .product-price {\n  display: flex;\n  align-items: center;\n}\ndiv.id_UiProduct .panel-body .product-price .id_product_price {\n  font-size: 26px;\n  font-weight: 300;\n  color: #43474D;\n  margin-right: 20px;\n}\n@media (max-width: 940px) {\n  div.id_UiProduct .panel-body {\n    flex-direction: column;\n    /*margin-top    : 60px;*/\n  }\n  div.id_UiProduct .panel-body .left-column,\n  div.id_UiProduct .panel-body .right-column {\n    width: 100%;\n  }\n  div.id_UiProduct .panel-body .carousel {\n    max-width: 445px;\n    margin: auto;\n  }\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":12}],20:[function(require,module,exports){
module.exports = "<li class=\"id_UiShipTo dropdown\">\r\n\r\n    <a href=\"#\" data-toggle=\"dropdown\" aria-expanded=\"false\">\r\n        <span>Ship to</span>\r\n        <div class=\"id_flag iti-flag\"></div>\r\n    </a>\r\n\r\n    <div class=\"dropdown-menu dropdown-form dynamic-settings right animated fadeIn\" role=\"menu\">\r\n\r\n        <div class=\"id_countrySelector\" data-showspecial=\"false\" data-showflags=\"true\" data-i18nall=\"All selected\"\r\n            data-i18nnofilter=\"No selection\" data-i18nfilter=\"Filter\">\r\n        </div>\r\n\r\n    </div>\r\n\r\n</li>";
},{}],21:[function(require,module,exports){
var css = ".id_UiShipTo {\n  /*@media all and (max-width: 767px) {*/\n}\n@media all and (max-width: 768px) {\n  .id_UiShipTo {\n    top: -21px;\n  }\n}\n.id_UiShipTo .id_countrySelector {\n  width: 200px;\n}\n.id_UiShipTo .dropdown-menu.dynamic-settings {\n  min-width: unset !important;\n}\n.id_UiShipTo .dropdown-menu {\n  border-bottom-width: 0px;\n  border-left-width: 0px;\n  border-right-width: 0px;\n}\n.id_UiShipTo .iti-flag {\n  display: inline-block;\n  position: relative;\n  top: 2px;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":12}],22:[function(require,module,exports){
module.exports = "<!-- Panel Modal -->\r\n<div class=\"id_UiShippingForm modal fade\" tabindex=\"-1\" role=\"dialog\">\r\n    <div class=\"modal-dialog\">\r\n        <div class=\"modal-content\">\r\n            <div class=\"modal-body p0\">\r\n                <div class=\"panel panel-default mb0\">\r\n                    <!-- Start .panel -->\r\n                    <div class=\"panel-heading\">\r\n                        <h4 class=\"panel-title\">Shipping information</h4>\r\n                        <div class=\"panel-controls panel-controls-right\">\r\n                            <a href=\"#\" class=\"panel-close id_close\">\r\n                                <i class=\"fa fa-times\"></i>\r\n                            </a>\r\n                        </div>\r\n\r\n                    </div>\r\n                    <div class=\"panel-body\">\r\n                        <div class=\"row\">\r\n\r\n                            <div class=\"col-sm-12 col-md-6 pb5\">\r\n                                <label>First name *</label>\r\n                                <input class=\"id_firstName form-control\" type=\"text\" />\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12 col-md-6 pb5\">\r\n                                <label>Last name *</label>\r\n                                <input class=\"id_lastName form-control\" type=\"text\" />\r\n                            </div>\r\n\r\n\r\n                            <div class=\"col-sm-12 pb5\">\r\n\r\n                                <label>Shipping address *</label>\r\n                                <input class=\"id_placeAutocomplete form-control\" placeholder=\"Enter your address\"\r\n                                    type=\"text\" />\r\n\r\n\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12 pb5\">\r\n                                <label>Extra infos (optional)</label>\r\n                                <input class=\"id_extra form-control\" type=\"text\"\r\n                                    placeholder=\"Something that could help the postman\" />\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12\">\r\n\r\n                                <div style=\"float: right\">\r\n\r\n                                    <button class=\"btn btn-success btn-sm\" type=\"button\">\r\n                                        <i class=\"glyphicon glyphicon-ok\"></i>\r\n                                    </button>\r\n\r\n                                </div>\r\n\r\n                            </div>\r\n\r\n\r\n                        </div>\r\n\r\n\r\n\r\n                    </div>\r\n\r\n\r\n                </div>\r\n            </div>\r\n            <!-- End .panel -->\r\n        </div>\r\n    </div>\r\n</div>";
},{}],23:[function(require,module,exports){
var css = "@media all and (max-width: 768px) {\n  .id_UiShippingForm .id_placeAutocomplete {\n    font-size: 80%;\n    padding-left: 2px;\n    padding-right: 0;\n  }\n  .id_UiShippingForm .panel-body {\n    padding: 0;\n  }\n}\n.id_UiShippingForm .field-error {\n  border-color: #db5565;\n}\n.pac-container {\n  z-index: 10000 !important;\n}\n.pac-container:after {\n  content: none !important;\n}\n@media all and (max-width: 768px) {\n  .pac-container span {\n    font-size: 80%;\n  }\n  .pac-container .pac-icon {\n    display: none;\n  }\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":12}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var web_api_declaration_1 = require("semasim-gateway/dist/web_api_declaration");
exports.webApiPath = web_api_declaration_1.apiPath;

},{"semasim-gateway/dist/web_api_declaration":68}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//NOTE: Defined at ejs building in templates/head_common.ejs
var default_ = {
    "assetsRoot": window["assets_root"],
    "isDevEnv": window["isDevEnv"],
    "baseDomain": window.location.href.match(/^https:\/\/web\.([^\/]+)/)[1],
    "jsRuntimeEnv": "browser",
    "hostOs": undefined
};
exports.default = default_;

},{}],27:[function(require,module,exports){
"use strict";
/*
import { jsRuntimeEnv } from "./jsRuntimeEnv";

export { jsRuntimeEnv };

//NOTE: For web Defined at ejs building in templates/head_common.ejs, must be defined for react-native.
export const assetsRoot: string = jsRuntimeEnv === "react-native" ? "https://static.semasim.com/" : window["assets_root"];
export const isDevEnv: boolean = jsRuntimeEnv === "react-native" ? true : window["isDevEnv"];

export const baseDomain: "semasim.com" | "dev.semasim.com" = jsRuntimeEnv === "react-native" ?
    (isDevEnv ? "dev.semasim.com" : "semasim.com") :
    window.location.href.match(/^https:\/\/web\.([^\/]+)/)![1] as any
    ;
    */
Object.defineProperty(exports, "__esModule", { value: true });
var impl_1 = require("./impl");
exports.env = impl_1.default;

},{"./impl":26}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Assert jQuery is loaded on the page. */
function loadUiClassHtml(html, widgetClassName) {
    var wrap = $("<div>").html(html);
    $("head").append(wrap.find("style"));
    return {
        "structure": wrap.find(".id_" + widgetClassName),
        "templates": wrap.find(".templates")
    };
}
exports.loadUiClassHtml = loadUiClassHtml;

},{}],29:[function(require,module,exports){
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
var key = "authenticated-session-descriptor-shared-data";
var AuthenticatedSessionDescriptorSharedData;
(function (AuthenticatedSessionDescriptorSharedData) {
    function isPresent() {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.getItem(key)];
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
                        return [4 /*yield*/, localStorageApi.removeItem(key)];
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
                    case 0: return [4 /*yield*/, localStorageApi.getItem(key)];
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
                    case 0: return [4 /*yield*/, localStorageApi.setItem(key, Buffer.from(JSON.stringify(authenticatedSessionDescriptorSharedData), "utf8").toString("hex"))];
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
},{"./localStorageApi":32,"buffer":2}],30:[function(require,module,exports){
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
var key = "credentials";
var Credentials;
(function (Credentials) {
    function isPresent() {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.getItem(key)];
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
                    case 0: return [4 /*yield*/, isPresent()];
                    case 1:
                        if (!(_a.sent())) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, localStorageApi.removeItem(key)];
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
                    case 0: return [4 /*yield*/, localStorageApi.getItem(key)];
                    case 1:
                        value = _a.sent();
                        if (value === null) {
                            throw new Error("Auth not present in localStorage");
                        }
                        return [2 /*return*/, JSON.parse(value)];
                }
            });
        });
    }
    Credentials.get = get;
    function set(authenticatedSessionDescriptorSharedData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.setItem(key, JSON.stringify(authenticatedSessionDescriptorSharedData))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    Credentials.set = set;
})(Credentials = exports.Credentials || (exports.Credentials = {}));

},{"./localStorageApi":32}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = localStorage;

},{}],32:[function(require,module,exports){
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

},{"./asyncOrSyncLocalStorage":31}],33:[function(require,module,exports){
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

},{"ts-events-extended":66}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var impl_1 = require("./impl");
exports.getApi = impl_1.getApi;

},{"./impl":33}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var env_1 = require("../env");
var default_ = function () {
    if (env_1.env.isDevEnv) {
        throw new Error("In prod the app would have been restarted");
    }
    location.reload();
};
exports.default = default_;

},{"../env":27}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var impl_1 = require("./impl");
exports.restartApp = impl_1.default;

},{"./impl":35}],37:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var availablePackaging = {
    "light": {
        "weight": 21.5,
        "eurAmount": 20
    },
    "normal": {
        "weight": 45,
        "eurAmount": 50
    }
};
function getZone(destinationCountryIso) {
    var out = (function () {
        if (getZone.national.indexOf(destinationCountryIso) >= 0) {
            return "Metropolitan France, Andorra et Monaco";
        }
        if (__spread(getZone.om1, getZone.om2).indexOf(destinationCountryIso) >= 0) {
            return "DOM";
        }
        if ([
            "be", "el", "lt", "pt", "bg", "es", "lu", "ro", "cz", "fr",
            "hu", "si", "dk", "hr", "mt", "sk", "de", "it", "nl", "fi",
            "ee", "cy", "at", "se", "ie", "lv", "pl", "uk"
        ].indexOf(destinationCountryIso) > 0) {
            return "Europe";
        }
        if ([
            "no", "by", "hu​", "md", "ua", "dz",
            "ly", "ma", "eh", "mr", "tn"
        ].indexOf(destinationCountryIso) >= 0) {
            return "Eastern Europe - Maghreb - Norway";
        }
        return "Rest of the world";
    })();
    console.log("getZone(" + destinationCountryIso + ") -> " + out);
    return out;
}
(function (getZone) {
    getZone.national = ["fr", "mc", "ad"];
    getZone.om1 = ["gf", "gp", "mq", "re", "pm", "bl", "mf", "yt"];
    getZone.om2 = ["nc", "pf", "wf", "tf"];
})(getZone || (getZone = {}));
function getLaPostDelay(destinationCountryIso) {
    var out = (function () {
        if (destinationCountryIso === "de") {
            return [3, 4];
        }
        switch (destinationCountryIso) {
            case "de": return [3, 4];
            case "at": return [3, 5];
            case "be": return [3, 5];
            case "it": return [3, 5];
            case "nl": return [3, 6];
            case "pt": return [3, 6];
            case "gb": return [3, 4];
            case "ch": return [3, 5];
            case "ca": return [4, 8];
            case "us": return [4, 8];
        }
        var zone = getZone(destinationCountryIso);
        switch (zone) {
            case "Metropolitan France, Andorra et Monaco": return [1, 2];
            case "DOM": return [4, 7];
            case "Europe":
            case "Eastern Europe - Maghreb - Norway": return [6, 8];
            default: return [7, 12];
        }
    })();
    console.log("getLaPostDelay(" + destinationCountryIso + ") -> " + out);
    return out;
}
/** To use for delivery to france and DOM Flat */
function solveLaPost(_a) {
    var footprint = _a.footprint, weight = _a.weight, destinationCountryIso = _a.destinationCountryIso;
    var out = (function () {
        if (footprint === "VOLUME") {
            throw new Error("Volume not supported by La Poste ( max 3cm )");
        }
        var packaging = weight + availablePackaging.light.weight < 100 ?
            availablePackaging.light : availablePackaging.normal;
        var totalWeight = weight + packaging.weight;
        if (totalWeight > 250) {
            throw new Error("Suboptimal for parcel > 250g");
        }
        var zone = getZone(destinationCountryIso);
        if (totalWeight > 100 && zone !== "Metropolitan France, Andorra et Monaco" && zone !== "DOM") {
            throw new Error("Suboptimal for international shipping of parcel > 100g");
        }
        var eurAmount = packaging.eurAmount;
        var offer;
        if (zone === "Metropolitan France, Andorra et Monaco" || zone === "DOM") {
            offer = "Lettre prioritaire, +sticker de suivie";
            eurAmount += totalWeight < 100 ? 210 : 420;
            if (zone === "DOM") {
                //NOTE: Extra for DOM-TOM
                eurAmount += (getZone.om1.indexOf(destinationCountryIso) >= 0 ? 5 : 11)
                    * Math.floor(totalWeight / 10);
            }
            //NOTE: For tracking.
            eurAmount += 40;
        }
        else {
            offer = "Lettre suivie internationale";
            eurAmount += 580;
        }
        return {
            "carrier": "La Poste",
            offer: offer,
            "delay": getLaPostDelay(destinationCountryIso),
            eurAmount: eurAmount,
            "needLightPackage": (availablePackaging.light === packaging &&
                weight + availablePackaging.normal.weight > 100)
        };
    })();
    console.log("solveLaPoste(" + JSON.stringify({ footprint: footprint, weight: weight, destinationCountryIso: destinationCountryIso }) + " -> " + JSON.stringify(out, null, 2));
    return out;
}
function solveColissimo(_a) {
    var footprint = _a.footprint, weight = _a.weight, destinationCountryIso = _a.destinationCountryIso;
    var out = (function () {
        var zone = getZone(destinationCountryIso);
        if (zone !== "Metropolitan France, Andorra et Monaco") {
            throw new Error("Colissimo is suboptimal for shipping outside of France (zone)");
        }
        if (footprint === "FLAT" && weight + availablePackaging.light.weight < 100) {
            throw new Error("Colissimo is suboptimal for flat parcel of < 100g");
        }
        var packaging = availablePackaging.normal;
        return {
            "carrier": "Colissimo",
            "offer": "Colissimo France",
            "delay": getLaPostDelay(destinationCountryIso),
            "eurAmount": packaging.eurAmount + (function () {
                var totalWeight = weight + packaging.weight;
                if (totalWeight < 250) {
                    return 495;
                }
                else if (totalWeight < 500) {
                    return 625;
                }
                else if (totalWeight < 750) {
                    return 710;
                }
                else {
                    return 880;
                }
            })(),
            "needLightPackage": false
        };
    })();
    console.log("solveColissimo(" + JSON.stringify({ footprint: footprint, weight: weight, destinationCountryIso: destinationCountryIso }) + " -> " + JSON.stringify(out, null, 2));
    return out;
}
function solveDelivengo(_a) {
    var weight = _a.weight, destinationCountryIso = _a.destinationCountryIso;
    var out = (function () {
        var zone = getZone(destinationCountryIso);
        if (zone === "Metropolitan France, Andorra et Monaco") {
            throw new Error("Suboptimal for international");
        }
        return {
            "carrier": "Delivengo",
            "offer": "Delivengo Easy",
            "delay": getLaPostDelay(destinationCountryIso),
            "eurAmount": Math.round(1.20 * (function () {
                var totalWeight = weight + availablePackaging.normal.weight;
                var isEu = zone === "Europe";
                if (totalWeight < 250) {
                    return isEu ? 630 : 700;
                }
                else if (totalWeight < 500) {
                    return isEu ? 720 : 920;
                }
                else {
                    return isEu ? 900 : 1400;
                }
            })()),
            "needLightPackage": false
        };
    })();
    console.log("solveDelivengo(" + JSON.stringify({ weight: weight, destinationCountryIso: destinationCountryIso }) + " -> " + JSON.stringify(out, null, 2));
    return out;
}
function solve(destinationCountryIso, footprint, weight) {
    var params = { destinationCountryIso: destinationCountryIso, footprint: footprint, weight: weight };
    try {
        return solveLaPost(params);
    }
    catch (error) {
        console.log(error.message);
        try {
            return solveColissimo(params);
        }
        catch (error) {
            console.log(error.message);
            return solveDelivengo(params);
        }
    }
}
exports.solve = solve;

},{}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getProducts(assetsRoot) {
    return [
        {
            "name": "Semasim Gateway v1.0",
            "shortDescription": "PiZero powered",
            "description": [
                "-Fully plug and play",
                "-Support for one SIM card.",
                "-Support up to 3 SIM ( require additional Sim dongle, sold separately ).",
                "-Grant you 6 month of free access to Semasim subscriptions"
            ].join(" "),
            "cartImageUrl": assetsRoot + "img/sample-shop-items/raspberry.jpg",
            "imageUrls": [
                assetsRoot + "img/sample-shop-items/raspberry.jpg"
            ],
            "price": { "eur": 5900 },
            "footprint": "FLAT",
            "weight": 150
        },
        {
            "name": "SIM usb Dongle",
            "shortDescription": "Huawei E180",
            "description": [
                "Add support for more SIM cards on your Semasim gateway.",
                "OR if you already have a server like a raspberry pi you do not need",
                "the semasim gateway you simply need one of those dongles for every",
                "SIM that you want to put online. [Ref for installing manually]"
            ].join(" "),
            "cartImageUrl": assetsRoot + "img/sample-shop-items/e180_cart.jpg",
            "imageUrls": [
                assetsRoot + "img/sample-shop-items/e180.jpg",
                assetsRoot + "img/sample-shop-items/e180_1.png",
                assetsRoot + "img/sample-shop-items/adapter.jpg"
            ],
            "price": { "eur": 1490 },
            "footprint": "FLAT",
            "weight": 35
        },
        {
            "name": "Sim adapter",
            "shortDescription": "Adapter for nano and micro SIM",
            "description": "Adapter to put a nano or micro sim in the SIM's dongle",
            "cartImageUrl": assetsRoot + "img/sample-shop-items/adapter_cart.jpg",
            "imageUrls": [assetsRoot + "img/sample-shop-items/adapter.jpg"],
            "price": { "eur": 290 },
            "footprint": "FLAT",
            "weight": 10
        }
    ];
}
exports.getProducts = getProducts;
;

},{}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectSidHttpHeaderName = "x-connect-sid";

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
var currencyLib = require("../../tools/currency");
var Cart;
(function (Cart) {
    function getPrice(cart, convertFromEuro) {
        var out = cart
            .map(function (_a) {
            var price = _a.product.price, quantity = _a.quantity;
            return Price.operation(price, function (amount) { return amount * quantity; });
        })
            .reduce(function (out, price) { return Price.addition(out, price, convertFromEuro); }, { "eur": 0 });
        //console.log("Cart.getGoodsPrice: ", JSON.stringify({ cart, out }, null, 2));
        return out;
    }
    Cart.getPrice = getPrice;
    function getOverallFootprint(cart) {
        return !!cart.find(function (_a) {
            var product = _a.product;
            return product.footprint === "VOLUME";
        }) ? "VOLUME" : "FLAT";
    }
    Cart.getOverallFootprint = getOverallFootprint;
    function getOverallWeight(cart) {
        return cart.reduce(function (out, _a) {
            var weight = _a.product.weight, quantity = _a.quantity;
            return out + weight * quantity;
        }, 0);
    }
    Cart.getOverallWeight = getOverallWeight;
})(Cart = exports.Cart || (exports.Cart = {}));
var Price;
(function (Price) {
    /**
     * Out of place.
     * If the amount for a currency is defined in one object
     * but not in the other the undefined amount will be
     * computed from the rateChange
     *
     */
    function binaryOperation(price1, price2, op, convertFromEuro) {
        var e_1, _a, e_2, _b;
        price1 = __assign({}, price1);
        price2 = __assign({}, price2);
        try {
            //NOTE: Ugly but does not involve map and less verbose.
            for (var _c = __values(__spread(Object.keys(price1), Object.keys(price2))), _d = _c.next(); !_d.done; _d = _c.next()) {
                var currency = _d.value;
                try {
                    for (var _e = (e_2 = void 0, __values([price1, price2])), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var price = _f.value;
                        if (!(currency in price)) {
                            price[currency] = convertFromEuro(price["eur"], currency);
                        }
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
        var out = { "eur": 0 };
        for (var currency in price1) {
            out[currency] = op(price1[currency], price2[currency]);
        }
        return out;
    }
    Price.binaryOperation = binaryOperation;
    function operation(price, op) {
        var out = { "eur": 0 };
        for (var currency in price) {
            out[currency] = Math.round(op(price[currency]));
        }
        return out;
    }
    Price.operation = operation;
    function addition(price1, price2, convertFromEuro) {
        return binaryOperation(price1, price2, function (amount1, amount2) { return amount1 + amount2; }, convertFromEuro);
    }
    Price.addition = addition;
    /**
     * return the amount of a price in a given currency.
     * If the amount for the currency is not defined in
     * the price object it will be computer from the
     * euro amount.
     * */
    function getAmountInCurrency(price, currency, convertFromEuro) {
        return currency in price ?
            price[currency] :
            convertFromEuro(price["eur"], currency);
    }
    Price.getAmountInCurrency = getAmountInCurrency;
    function prettyPrint(price, currency, convertFromEuro) {
        return currencyLib.prettyPrint(getAmountInCurrency(price, currency, convertFromEuro), currency);
    }
    Price.prettyPrint = prettyPrint;
})(Price = exports.Price || (exports.Price = {}));
;
var ShippingFormData;
(function (ShippingFormData) {
    function toStripeShippingInformation(shippingFormData, carrier) {
        var get = function (key) {
            var component = shippingFormData.addressComponents
                .find(function (_a) {
                var _b = __read(_a.types, 1), type = _b[0];
                return type === key;
            });
            return component !== undefined ? component["long_name"] : undefined;
        };
        return {
            "name": shippingFormData.firstName + " " + shippingFormData.lastName,
            "address": {
                "line1": get("street_number") + " " + get("route"),
                "line2": shippingFormData.addressExtra,
                "postal_code": get("postal_code") || "",
                "city": get("locality") || "",
                "state": get("administrative_area_level_1") || "",
                "country": get("country") || ""
            },
            carrier: carrier,
        };
    }
    ShippingFormData.toStripeShippingInformation = toStripeShippingInformation;
})(ShippingFormData = exports.ShippingFormData || (exports.ShippingFormData = {}));

},{"../../tools/currency":43}],41:[function(require,module,exports){
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
var env_1 = require("../env");
var ts_events_extended_1 = require("ts-events-extended");
var restartApp_1 = require("../restartApp");
var networkStateMonitoring = require("../networkStateMonitoring");
var evtError = new ts_events_extended_1.SyncEvent();
evtError.attach(function (_a) {
    var methodName = _a.methodName, httpErrorStatus = _a.httpErrorStatus;
    switch (env_1.env.jsRuntimeEnv) {
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
                _d = env_1.env.jsRuntimeEnv === "react-native";
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
                        if (!(env_1.env.jsRuntimeEnv === "react-native")) return [3 /*break*/, 3];
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
                        if (!(env_1.env.jsRuntimeEnv === "react-native")) return [3 /*break*/, 4];
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

},{"../../web_api_declaration":51,"../env":27,"../localStorage/AuthenticatedSessionDescriptorSharedData":29,"../localStorage/Credentials":30,"../networkStateMonitoring":34,"../restartApp":36,"./sendRequest":42,"ts-events-extended":66}],42:[function(require,module,exports){
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
var env_1 = require("../env");
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
                case 0: return [4 /*yield*/, fetch("https://web." + env_1.env.baseDomain + webApiPath_1.webApiPath + "/" + methodName, {
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

},{"../../gateway/webApiPath":24,"../env":27,"../types/connectSidHttpHeaderName":39,"transfer-tools/dist/lib/JSON_CUSTOM":61}],43:[function(require,module,exports){
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
exports.data = require("../../res/currency.json");
function isValidCountryIso(countryIso) {
    //NOTE: Avoid loading if we do not need
    if (isValidCountryIso.countryIsoRecord === undefined) {
        isValidCountryIso.countryIsoRecord = (function () {
            var e_1, _a, e_2, _b;
            var out = {};
            try {
                for (var _c = __values(Object.keys(exports.data)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var currency = _d.value;
                    try {
                        for (var _e = (e_2 = void 0, __values(exports.data[currency].countriesIso)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var countryIso_1 = _f.value;
                            out[countryIso_1] = true;
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
            return out;
        })();
        return isValidCountryIso(countryIso);
    }
    if (typeof countryIso !== "string" || !/^[a-z]{2}$/.test(countryIso)) {
        return false;
    }
    return !!isValidCountryIso.countryIsoRecord[countryIso];
}
exports.isValidCountryIso = isValidCountryIso;
(function (isValidCountryIso) {
    isValidCountryIso.countryIsoRecord = undefined;
})(isValidCountryIso = exports.isValidCountryIso || (exports.isValidCountryIso = {}));
function getCountryCurrency(countryIso) {
    var cache = getCountryCurrency.cache;
    {
        var currency = cache[countryIso];
        if (currency !== undefined) {
            return currency;
        }
    }
    cache[countryIso] = Object.keys(exports.data)
        .map(function (currency) { return ({ currency: currency, "countriesIso": exports.data[currency].countriesIso }); })
        .find(function (_a) {
        var countriesIso = _a.countriesIso;
        return !!countriesIso.find(function (_countryIso) { return _countryIso === countryIso; });
    })
        .currency;
    return getCountryCurrency(countryIso);
}
exports.getCountryCurrency = getCountryCurrency;
(function (getCountryCurrency) {
    getCountryCurrency.cache = {};
})(getCountryCurrency = exports.getCountryCurrency || (exports.getCountryCurrency = {}));
/** Must define convertFromEuro.changeRates first */
function convertFromEuro(euroAmount, currencyTo) {
    return Math.round(euroAmount * convertFromEuro.getChangeRates()[currencyTo]);
}
exports.convertFromEuro = convertFromEuro;
(function (convertFromEuro) {
    var changeRates_ = undefined;
    var lastUpdateDate = new Date(0);
    function setChangeRates(changeRates) {
        lastUpdateDate = new Date();
        changeRates_ = changeRates;
    }
    convertFromEuro.setChangeRates = setChangeRates;
    function getChangeRates() {
        if (changeRates_ === undefined) {
            throw new Error("Change rates not defined");
        }
        return changeRates_;
    }
    convertFromEuro.getChangeRates = getChangeRates;
    var updater = undefined;
    function setChangeRatesFetchMethod(fetchChangeRates, ttl) {
        updater = { fetchChangeRates: fetchChangeRates, ttl: ttl };
    }
    convertFromEuro.setChangeRatesFetchMethod = setChangeRatesFetchMethod;
    function refreshChangeRates() {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (updater === undefined) {
                            throw new Error("No method for updating rates changes have been defined");
                        }
                        if (Date.now() - lastUpdateDate.getTime() < updater.ttl) {
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        _a = setChangeRates;
                        return [4 /*yield*/, updater.fetchChangeRates()];
                    case 2:
                        _a.apply(void 0, [_b.sent()]);
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        if (lastUpdateDate.getTime() === 0) {
                            throw error_1;
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    convertFromEuro.refreshChangeRates = refreshChangeRates;
})(convertFromEuro = exports.convertFromEuro || (exports.convertFromEuro = {}));
/**
 * get currency of stripe card,
 * if there is no special pricing for the currency
 * "eur" will be returned.
 *
 * NOTE: This function does seems to come out of left field
 * but this operation is done on the frontend and the backend
 * so we export it.
 *
 */
function getCardCurrency(stripeCard, pricingByCurrency) {
    var currency = getCountryCurrency(stripeCard.country.toLowerCase());
    if (!(currency in pricingByCurrency)) {
        currency = "eur";
    }
    return currency;
}
exports.getCardCurrency = getCardCurrency;
function prettyPrint(amount, currency) {
    return (amount / 100).toLocaleString(undefined, {
        "style": "currency",
        currency: currency
    });
}
exports.prettyPrint = prettyPrint;

},{"../../res/currency.json":67}],44:[function(require,module,exports){
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

},{"ts-events-extended":66}],45:[function(require,module,exports){
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

},{"../createGenericProxyForBootstrapModal":44}],46:[function(require,module,exports){
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

},{"../stack":50,"./getApi":45,"./types":47,"run-exclusive":58}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var createGenericProxyForBootstrapModal_1 = require("./createGenericProxyForBootstrapModal");
//NOTE: Assert jQuery bootstrap on the page ( if use via web )
var customImplementationOfApi = undefined;
function provideCustomImplementationOfApi(api) {
    customImplementationOfApi = api;
}
exports.provideCustomImplementationOfApi = provideCustomImplementationOfApi;
var bootstrapBasedImplementationOfApi = {
    "create": function ($uninitializedModalDiv, options) {
        $uninitializedModalDiv.modal(options);
        return createGenericProxyForBootstrapModal_1.createGenericProxyForBootstrapModal($uninitializedModalDiv);
    }
};
exports.getApi = function () { return customImplementationOfApi || bootstrapBasedImplementationOfApi; };

},{"./createGenericProxyForBootstrapModal":44}],49:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var getApi_1 = require("./getApi");
var stack = require("./stack");
var getApi_2 = require("./getApi");
exports.provideCustomImplementationOfApi = getApi_2.provideCustomImplementationOfApi;
function createModal(structure, options) {
    var modal = getApi_1.getApi().create(structure, __assign(__assign({}, options), { "show": false }));
    return stack.add(modal);
}
exports.createModal = createModal;

},{"./getApi":48,"./stack":50}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
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

},{}],52:[function(require,module,exports){
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

},{}],53:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":52}],54:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":53}],55:[function(require,module,exports){
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

},{}],56:[function(require,module,exports){
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

},{}],57:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var Map_1 = require("./Map");
exports.Polyfill = typeof WeakMap !== "undefined" ? WeakMap : Map_1.Polyfill;

},{"./Map":56}],58:[function(require,module,exports){
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

},{"minimal-polyfills/dist/lib/WeakMap":57}],59:[function(require,module,exports){
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

},{}],60:[function(require,module,exports){
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
},{"has":54}],61:[function(require,module,exports){
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

},{"super-json":60}],62:[function(require,module,exports){
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

},{"./SyncEventBase":63}],63:[function(require,module,exports){
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

},{"./SyncEventBaseProtected":64}],64:[function(require,module,exports){
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

},{"./defs":65,"minimal-polyfills/dist/lib/Array.prototype.find":55,"minimal-polyfills/dist/lib/Map":56,"run-exclusive":58}],65:[function(require,module,exports){
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

},{"setprototypeof":59}],66:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var SyncEvent_1 = require("./SyncEvent");
exports.SyncEvent = SyncEvent_1.SyncEvent;
exports.VoidSyncEvent = SyncEvent_1.VoidSyncEvent;
var defs_1 = require("./defs");
exports.EvtError = defs_1.EvtError;

},{"./SyncEvent":62,"./defs":65}],67:[function(require,module,exports){
module.exports={
  "usd": {
    "symbol": "$",
    "name": "US Dollar",
    "countriesIso": [
      "bq",
      "tl",
      "gu",
      "sv",
      "pr",
      "pw",
      "ec",
      "mh",
      "mp",
      "io",
      "fm",
      "vg",
      "us",
      "um",
      "tc",
      "vi",
      "as"
    ]
  },
  "cad": {
    "symbol": "CA$",
    "name": "Canadian Dollar",
    "countriesIso": [
      "ca"
    ]
  },
  "eur": {
    "symbol": "€",
    "name": "Euro",
    "countriesIso": [
      "be",
      "bl",
      "re",
      "gr",
      "gp",
      "gf",
      "pt",
      "pm",
      "ee",
      "it",
      "es",
      "me",
      "mf",
      "mc",
      "mt",
      "mq",
      "fr",
      "fi",
      "nl",
      "xk",
      "cy",
      "sk",
      "si",
      "sm",
      "de",
      "yt",
      "lv",
      "lu",
      "tf",
      "va",
      "ad",
      "at",
      "ax",
      "ie"
    ]
  },
  "aed": {
    "symbol": "AED",
    "name": "United Arab Emirates Dirham",
    "countriesIso": [
      "ae"
    ]
  },
  "afn": {
    "symbol": "Af",
    "name": "Afghan Afghani",
    "countriesIso": [
      "af"
    ]
  },
  "all": {
    "symbol": "ALL",
    "name": "Albanian Lek",
    "countriesIso": [
      "al"
    ]
  },
  "amd": {
    "symbol": "AMD",
    "name": "Armenian Dram",
    "countriesIso": [
      "am"
    ]
  },
  "ars": {
    "symbol": "AR$",
    "name": "Argentine Peso",
    "countriesIso": [
      "ar"
    ]
  },
  "aud": {
    "symbol": "AU$",
    "name": "Australian Dollar",
    "countriesIso": [
      "hm",
      "nf",
      "nr",
      "cc",
      "cx",
      "ki",
      "tv",
      "au"
    ]
  },
  "azn": {
    "symbol": "man.",
    "name": "Azerbaijani Manat",
    "countriesIso": [
      "az"
    ]
  },
  "bam": {
    "symbol": "KM",
    "name": "Bosnia-Herzegovina Convertible Mark",
    "countriesIso": [
      "ba"
    ]
  },
  "bdt": {
    "symbol": "Tk",
    "name": "Bangladeshi Taka",
    "countriesIso": [
      "bd"
    ]
  },
  "bgn": {
    "symbol": "BGN",
    "name": "Bulgarian Lev",
    "countriesIso": [
      "bg"
    ]
  },
  "bhd": {
    "symbol": "BD",
    "name": "Bahraini Dinar",
    "countriesIso": [
      "bh"
    ]
  },
  "bif": {
    "symbol": "FBu",
    "name": "Burundian Franc",
    "countriesIso": [
      "bi"
    ]
  },
  "bnd": {
    "symbol": "BN$",
    "name": "Brunei Dollar",
    "countriesIso": [
      "bn"
    ]
  },
  "bob": {
    "symbol": "Bs",
    "name": "Bolivian Boliviano",
    "countriesIso": [
      "bo"
    ]
  },
  "brl": {
    "symbol": "R$",
    "name": "Brazilian Real",
    "countriesIso": [
      "br"
    ]
  },
  "bwp": {
    "symbol": "BWP",
    "name": "Botswanan Pula",
    "countriesIso": [
      "bw"
    ]
  },
  "byr": {
    "symbol": "BYR",
    "name": "Belarusian Ruble",
    "countriesIso": [
      "by"
    ]
  },
  "bzd": {
    "symbol": "BZ$",
    "name": "Belize Dollar",
    "countriesIso": [
      "bz"
    ]
  },
  "cdf": {
    "symbol": "CDF",
    "name": "Congolese Franc",
    "countriesIso": [
      "cd"
    ]
  },
  "chf": {
    "symbol": "CHF",
    "name": "Swiss Franc",
    "countriesIso": [
      "ch",
      "li"
    ]
  },
  "clp": {
    "symbol": "CL$",
    "name": "Chilean Peso",
    "countriesIso": [
      "cl"
    ]
  },
  "cny": {
    "symbol": "CN¥",
    "name": "Chinese Yuan",
    "countriesIso": [
      "cn"
    ]
  },
  "cop": {
    "symbol": "CO$",
    "name": "Colombian Peso",
    "countriesIso": [
      "co"
    ]
  },
  "crc": {
    "symbol": "₡",
    "name": "Costa Rican Colón",
    "countriesIso": [
      "cr"
    ]
  },
  "cve": {
    "symbol": "CV$",
    "name": "Cape Verdean Escudo",
    "countriesIso": [
      "cv"
    ]
  },
  "czk": {
    "symbol": "Kč",
    "name": "Czech Republic Koruna",
    "countriesIso": [
      "cz"
    ]
  },
  "djf": {
    "symbol": "Fdj",
    "name": "Djiboutian Franc",
    "countriesIso": [
      "dj"
    ]
  },
  "dkk": {
    "symbol": "Dkr",
    "name": "Danish Krone",
    "countriesIso": [
      "gl",
      "fo",
      "dk"
    ]
  },
  "dop": {
    "symbol": "RD$",
    "name": "Dominican Peso",
    "countriesIso": [
      "do"
    ]
  },
  "dzd": {
    "symbol": "DA",
    "name": "Algerian Dinar",
    "countriesIso": [
      "dz"
    ]
  },
  "eek": {
    "symbol": "Ekr",
    "name": "Estonian Kroon",
    "countriesIso": []
  },
  "egp": {
    "symbol": "EGP",
    "name": "Egyptian Pound",
    "countriesIso": [
      "eg"
    ]
  },
  "ern": {
    "symbol": "Nfk",
    "name": "Eritrean Nakfa",
    "countriesIso": [
      "er"
    ]
  },
  "etb": {
    "symbol": "Br",
    "name": "Ethiopian Birr",
    "countriesIso": [
      "et"
    ]
  },
  "gbp": {
    "symbol": "£",
    "name": "British Pound Sterling",
    "countriesIso": [
      "je",
      "gs",
      "gg",
      "gb",
      "im"
    ]
  },
  "gel": {
    "symbol": "GEL",
    "name": "Georgian Lari",
    "countriesIso": [
      "ge"
    ]
  },
  "ghs": {
    "symbol": "GH₵",
    "name": "Ghanaian Cedi",
    "countriesIso": [
      "gh"
    ]
  },
  "gnf": {
    "symbol": "FG",
    "name": "Guinean Franc",
    "countriesIso": [
      "gn"
    ]
  },
  "gtq": {
    "symbol": "GTQ",
    "name": "Guatemalan Quetzal",
    "countriesIso": [
      "gt"
    ]
  },
  "hkd": {
    "symbol": "HK$",
    "name": "Hong Kong Dollar",
    "countriesIso": [
      "hk"
    ]
  },
  "hnl": {
    "symbol": "HNL",
    "name": "Honduran Lempira",
    "countriesIso": [
      "hn"
    ]
  },
  "hrk": {
    "symbol": "kn",
    "name": "Croatian Kuna",
    "countriesIso": [
      "hr"
    ]
  },
  "huf": {
    "symbol": "Ft",
    "name": "Hungarian Forint",
    "countriesIso": [
      "hu"
    ]
  },
  "idr": {
    "symbol": "Rp",
    "name": "Indonesian Rupiah",
    "countriesIso": [
      "id"
    ]
  },
  "ils": {
    "symbol": "₪",
    "name": "Israeli New Sheqel",
    "countriesIso": [
      "ps",
      "il"
    ]
  },
  "inr": {
    "symbol": "Rs",
    "name": "Indian Rupee",
    "countriesIso": [
      "in"
    ]
  },
  "iqd": {
    "symbol": "IQD",
    "name": "Iraqi Dinar",
    "countriesIso": [
      "iq"
    ]
  },
  "irr": {
    "symbol": "IRR",
    "name": "Iranian Rial",
    "countriesIso": [
      "ir"
    ]
  },
  "isk": {
    "symbol": "Ikr",
    "name": "Icelandic Króna",
    "countriesIso": [
      "is"
    ]
  },
  "jmd": {
    "symbol": "J$",
    "name": "Jamaican Dollar",
    "countriesIso": [
      "jm"
    ]
  },
  "jod": {
    "symbol": "JD",
    "name": "Jordanian Dinar",
    "countriesIso": [
      "jo"
    ]
  },
  "jpy": {
    "symbol": "¥",
    "name": "Japanese Yen",
    "countriesIso": [
      "jp"
    ]
  },
  "kes": {
    "symbol": "Ksh",
    "name": "Kenyan Shilling",
    "countriesIso": [
      "ke"
    ]
  },
  "khr": {
    "symbol": "KHR",
    "name": "Cambodian Riel",
    "countriesIso": [
      "kh"
    ]
  },
  "kmf": {
    "symbol": "CF",
    "name": "Comorian Franc",
    "countriesIso": [
      "km"
    ]
  },
  "krw": {
    "symbol": "₩",
    "name": "South Korean Won",
    "countriesIso": [
      "kr"
    ]
  },
  "kwd": {
    "symbol": "KD",
    "name": "Kuwaiti Dinar",
    "countriesIso": [
      "kw"
    ]
  },
  "kzt": {
    "symbol": "KZT",
    "name": "Kazakhstani Tenge",
    "countriesIso": [
      "kz"
    ]
  },
  "lbp": {
    "symbol": "LB£",
    "name": "Lebanese Pound",
    "countriesIso": [
      "lb"
    ]
  },
  "lkr": {
    "symbol": "SLRs",
    "name": "Sri Lankan Rupee",
    "countriesIso": [
      "lk"
    ]
  },
  "ltl": {
    "symbol": "Lt",
    "name": "Lithuanian Litas",
    "countriesIso": [
      "lt"
    ]
  },
  "lvl": {
    "symbol": "Ls",
    "name": "Latvian Lats",
    "countriesIso": []
  },
  "lyd": {
    "symbol": "LD",
    "name": "Libyan Dinar",
    "countriesIso": [
      "ly"
    ]
  },
  "mad": {
    "symbol": "MAD",
    "name": "Moroccan Dirham",
    "countriesIso": [
      "eh",
      "ma"
    ]
  },
  "mdl": {
    "symbol": "MDL",
    "name": "Moldovan Leu",
    "countriesIso": [
      "md"
    ]
  },
  "mga": {
    "symbol": "MGA",
    "name": "Malagasy Ariary",
    "countriesIso": [
      "mg"
    ]
  },
  "mkd": {
    "symbol": "MKD",
    "name": "Macedonian Denar",
    "countriesIso": [
      "mk"
    ]
  },
  "mmk": {
    "symbol": "MMK",
    "name": "Myanma Kyat",
    "countriesIso": [
      "mm"
    ]
  },
  "mop": {
    "symbol": "MOP$",
    "name": "Macanese Pataca",
    "countriesIso": [
      "mo"
    ]
  },
  "mur": {
    "symbol": "MURs",
    "name": "Mauritian Rupee",
    "countriesIso": [
      "mu"
    ]
  },
  "mxn": {
    "symbol": "MX$",
    "name": "Mexican Peso",
    "countriesIso": [
      "mx"
    ]
  },
  "myr": {
    "symbol": "RM",
    "name": "Malaysian Ringgit",
    "countriesIso": [
      "my"
    ]
  },
  "mzn": {
    "symbol": "MTn",
    "name": "Mozambican Metical",
    "countriesIso": [
      "mz"
    ]
  },
  "nad": {
    "symbol": "N$",
    "name": "Namibian Dollar",
    "countriesIso": [
      "na"
    ]
  },
  "ngn": {
    "symbol": "₦",
    "name": "Nigerian Naira",
    "countriesIso": [
      "ng"
    ]
  },
  "nio": {
    "symbol": "C$",
    "name": "Nicaraguan Córdoba",
    "countriesIso": [
      "ni"
    ]
  },
  "nok": {
    "symbol": "Nkr",
    "name": "Norwegian Krone",
    "countriesIso": [
      "bv",
      "sj",
      "no"
    ]
  },
  "npr": {
    "symbol": "NPRs",
    "name": "Nepalese Rupee",
    "countriesIso": [
      "np"
    ]
  },
  "nzd": {
    "symbol": "NZ$",
    "name": "New Zealand Dollar",
    "countriesIso": [
      "tk",
      "pn",
      "nz",
      "nu",
      "ck"
    ]
  },
  "omr": {
    "symbol": "OMR",
    "name": "Omani Rial",
    "countriesIso": [
      "om"
    ]
  },
  "pab": {
    "symbol": "B/.",
    "name": "Panamanian Balboa",
    "countriesIso": [
      "pa"
    ]
  },
  "pen": {
    "symbol": "S/.",
    "name": "Peruvian Nuevo Sol",
    "countriesIso": [
      "pe"
    ]
  },
  "php": {
    "symbol": "₱",
    "name": "Philippine Peso",
    "countriesIso": [
      "ph"
    ]
  },
  "pkr": {
    "symbol": "PKRs",
    "name": "Pakistani Rupee",
    "countriesIso": [
      "pk"
    ]
  },
  "pln": {
    "symbol": "zł",
    "name": "Polish Zloty",
    "countriesIso": [
      "pl"
    ]
  },
  "pyg": {
    "symbol": "₲",
    "name": "Paraguayan Guarani",
    "countriesIso": [
      "py"
    ]
  },
  "qar": {
    "symbol": "QR",
    "name": "Qatari Rial",
    "countriesIso": [
      "qa"
    ]
  },
  "ron": {
    "symbol": "RON",
    "name": "Romanian Leu",
    "countriesIso": [
      "ro"
    ]
  },
  "rsd": {
    "symbol": "din.",
    "name": "Serbian Dinar",
    "countriesIso": [
      "rs"
    ]
  },
  "rub": {
    "symbol": "RUB",
    "name": "Russian Ruble",
    "countriesIso": [
      "ru"
    ]
  },
  "rwf": {
    "symbol": "RWF",
    "name": "Rwandan Franc",
    "countriesIso": [
      "rw"
    ]
  },
  "sar": {
    "symbol": "SR",
    "name": "Saudi Riyal",
    "countriesIso": [
      "sa"
    ]
  },
  "sdg": {
    "symbol": "SDG",
    "name": "Sudanese Pound",
    "countriesIso": [
      "sd"
    ]
  },
  "sek": {
    "symbol": "Skr",
    "name": "Swedish Krona",
    "countriesIso": [
      "se"
    ]
  },
  "sgd": {
    "symbol": "S$",
    "name": "Singapore Dollar",
    "countriesIso": [
      "sg"
    ]
  },
  "sos": {
    "symbol": "Ssh",
    "name": "Somali Shilling",
    "countriesIso": [
      "so"
    ]
  },
  "syp": {
    "symbol": "SY£",
    "name": "Syrian Pound",
    "countriesIso": [
      "sy"
    ]
  },
  "thb": {
    "symbol": "฿",
    "name": "Thai Baht",
    "countriesIso": [
      "th"
    ]
  },
  "tnd": {
    "symbol": "DT",
    "name": "Tunisian Dinar",
    "countriesIso": [
      "tn"
    ]
  },
  "top": {
    "symbol": "T$",
    "name": "Tongan Paʻanga",
    "countriesIso": [
      "to"
    ]
  },
  "try": {
    "symbol": "TL",
    "name": "Turkish Lira",
    "countriesIso": [
      "tr"
    ]
  },
  "ttd": {
    "symbol": "TT$",
    "name": "Trinidad and Tobago Dollar",
    "countriesIso": [
      "tt"
    ]
  },
  "twd": {
    "symbol": "NT$",
    "name": "New Taiwan Dollar",
    "countriesIso": [
      "tw"
    ]
  },
  "tzs": {
    "symbol": "TSh",
    "name": "Tanzanian Shilling",
    "countriesIso": [
      "tz"
    ]
  },
  "uah": {
    "symbol": "₴",
    "name": "Ukrainian Hryvnia",
    "countriesIso": [
      "ua"
    ]
  },
  "ugx": {
    "symbol": "USh",
    "name": "Ugandan Shilling",
    "countriesIso": [
      "ug"
    ]
  },
  "uyu": {
    "symbol": "$U",
    "name": "Uruguayan Peso",
    "countriesIso": [
      "uy"
    ]
  },
  "uzs": {
    "symbol": "UZS",
    "name": "Uzbekistan Som",
    "countriesIso": [
      "uz"
    ]
  },
  "vef": {
    "symbol": "Bs.F.",
    "name": "Venezuelan Bolívar",
    "countriesIso": [
      "ve"
    ]
  },
  "vnd": {
    "symbol": "₫",
    "name": "Vietnamese Dong",
    "countriesIso": [
      "vn"
    ]
  },
  "xaf": {
    "symbol": "FCFA",
    "name": "CFA Franc BEAC",
    "countriesIso": [
      "gq",
      "ga",
      "cm",
      "cg",
      "cf",
      "td"
    ]
  },
  "xof": {
    "symbol": "CFA",
    "name": "CFA Franc BCEAO",
    "countriesIso": [
      "bf",
      "bj",
      "gw",
      "ml",
      "ne",
      "ci",
      "sn",
      "tg"
    ]
  },
  "yer": {
    "symbol": "YR",
    "name": "Yemeni Rial",
    "countriesIso": [
      "ye"
    ]
  },
  "zar": {
    "symbol": "R",
    "name": "South African Rand",
    "countriesIso": [
      "za"
    ]
  },
  "zmk": {
    "symbol": "ZK",
    "name": "Zambian Kwacha",
    "countriesIso": [
      "zm"
    ]
  }
}

},{}],68:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPath = "/api";
var version;
(function (version) {
    version.methodName = "version";
})(version = exports.version || (exports.version = {}));

},{}]},{},[10]);
