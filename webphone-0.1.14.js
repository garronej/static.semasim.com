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
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],8:[function(require,module,exports){
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
},{"./support/isBuffer":7,"_process":6,"inherits":4}],9:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var phone_number_1 = require("phone-number");
var ts_events_extended_1 = require("ts-events-extended");
var types = require("../../../shared/dist/lib/types");
var wd = types.webphoneData;
var moment = require("moment");
//declare const titlenotifier: any;
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiConversation.html"), "UiConversation");
require("../templates/UiConversation.less");
//const checkMark= "\u221a";
var checkMark = Buffer.from("e29c93", "hex").toString("utf8");
var crossMark = Buffer.from("e29d8c", "hex").toString("utf8");
var UiConversation = /** @class */ (function () {
    function UiConversation(userSim, wdChat) {
        var _this = this;
        var e_1, _a;
        this.userSim = userSim;
        this.wdChat = wdChat;
        this.structure = html.structure.clone();
        this.evtUpdateContact = new ts_events_extended_1.VoidSyncEvent();
        this.evtVoiceCall = new ts_events_extended_1.VoidSyncEvent();
        this.evtSendText = new ts_events_extended_1.SyncEvent();
        this.evtDelete = new ts_events_extended_1.VoidSyncEvent();
        this.evtChecked = new ts_events_extended_1.VoidSyncEvent();
        this.textarea = this.structure.find("textarea");
        this.aSend = this.structure.find("a.id_send");
        this.ul = this.structure.find("ul");
        this.btnUpdateContact = this.structure.find("button.id_updateContact");
        this.btnCall = this.structure.find("button.id_call");
        this.btnDelete = this.structure.find("button.id_delete");
        this.evtLoadMore = new ts_events_extended_1.SyncEvent();
        /** indexed by wd.Message.id_ */
        this.uiBubbles = new Map();
        this.notifyContactNameUpdated();
        this.setReadonly(true);
        this.btnUpdateContact
            .on("click", function () { return _this.evtUpdateContact.post(); });
        this.btnCall
            .on("click", function () { return _this.evtVoiceCall.post(); });
        this.btnDelete
            .on("click", function () { return _this.evtDelete.post(); });
        this.structure.find("span.id_number")
            .on("dblclick", function (e) {
            e.preventDefault();
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            if (selection !== null) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });
        this.aSend.on("click", function () {
            var text = _this.textarea.val();
            if (!text || text.match(/^\ +$/)) {
                return;
            }
            _this.evtSendText.post(text);
            _this.textarea.val("");
            _this.textarea.trigger("autosize.resizeIncludeStyle");
        });
        this.textarea
            .on("keypress", function (event) {
            _this.evtChecked.post();
            if (event.key === "Enter" && !event.shiftKey) {
                _this.aSend.trigger("click");
                return false;
            }
        })
            .on("focus", function () { return _this.evtChecked.post(); });
        this.ul.slimScroll({
            "position": "right",
            "distance": '0px',
            "railVisible": true,
            "height": '400px',
            "start": "bottom"
        }).bind("slimscroll", (function (_e, pos) {
            if (pos !== "top") {
                return;
            }
            _this.evtLoadMore.post({
                "onLoaded": function (wdMessages) {
                    var e_2, _a;
                    if (wdMessages.length === 0) {
                        return;
                    }
                    var li = _this.ul.find("li:first");
                    try {
                        for (var wdMessages_1 = __values(wdMessages), wdMessages_1_1 = wdMessages_1.next(); !wdMessages_1_1.done; wdMessages_1_1 = wdMessages_1.next()) {
                            var wdMessage = wdMessages_1_1.value;
                            _this.newMessage(wdMessage, "MUTE");
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (wdMessages_1_1 && !wdMessages_1_1.done && (_a = wdMessages_1.return)) _a.call(wdMessages_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    _this.ul.slimScroll({ "scrollTo": li.position().top + "px" });
                }
            });
        }));
        try {
            for (var _b = __values(this.wdChat.messages), _c = _b.next(); !_c.done; _c = _b.next()) {
                var wdMessage = _c.value;
                this.newMessage(wdMessage, "MUTE");
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.unselect();
    }
    UiConversation.prototype.setReadonly = function (isReadonly) {
        if (isReadonly) {
            this.textarea.attr("disabled", true);
            this.aSend.hide();
            this.btnUpdateContact.prop("disabled", true);
            this.btnCall.prop("disabled", true);
            this.btnDelete.prop("disabled", true);
        }
        else {
            if (!phone_number_1.phoneNumber.isDialable(this.wdChat.contactNumber)) {
                return;
            }
            this.textarea.removeAttr("disabled");
            this.aSend.show();
            this.btnUpdateContact.prop("disabled", false);
            this.btnCall.prop("disabled", false);
            this.btnDelete.prop("disabled", false);
        }
    };
    UiConversation.prototype.setSelected = function () {
        var _this = this;
        this.structure.show({
            "duration": 0,
            "complete": function () {
                _this.ul.slimScroll({ "scrollTo": _this.ul.prop("scrollHeight") + "px" });
                _this.textarea.trigger("focus");
                _this.textarea["autosize"]();
            }
        });
    };
    UiConversation.prototype.unselect = function () {
        this.structure.hide();
    };
    Object.defineProperty(UiConversation.prototype, "isSelected", {
        get: function () {
            return this.structure.is(":visible");
        },
        enumerable: true,
        configurable: true
    });
    UiConversation.prototype.notifyContactNameUpdated = function () {
        var prettyNumber = phone_number_1.phoneNumber.prettyPrint(this.wdChat.contactNumber, this.userSim.sim.country ?
            this.userSim.sim.country.iso : undefined);
        if (this.wdChat.contactName) {
            this.structure.find("span.id_name").text(this.wdChat.contactName);
            this.structure.find("span.id_number").text(prettyNumber);
        }
        else {
            this.structure.find("span.id_name").text("");
            this.structure.find("span.id_number").text(prettyNumber);
        }
    };
    /**
     * Place uiBubble in the structure, assume all bubbles already sorted
     * return true if the bubble is the last <li> of the <ul>
     * */
    UiConversation.prototype.placeUiBubble = function (uiBubble) {
        var _this = this;
        var getUiBubbleFromStructure = function (li_elem) {
            var e_3, _a;
            try {
                for (var _b = __values(_this.uiBubbles.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var uiBubble_1 = _c.value;
                    if (uiBubble_1.structure.get(0) === li_elem) {
                        return uiBubble_1;
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
            throw new Error("uiBubble not found");
        };
        var lis = this.ul.find("li");
        for (var i = lis.length - 1; i >= 0; i--) {
            var uiBubble_i = getUiBubbleFromStructure(lis.get(i));
            if (wd.compareMessage(uiBubble.wdMessage, uiBubble_i.wdMessage) >= 0) {
                //Message is more recent than current
                uiBubble.structure.insertAfter(uiBubble_i.structure);
                return i === lis.length - 1;
            }
        }
        this.ul.prepend(uiBubble.structure);
        return false;
    };
    /** new Message or update existing one */
    UiConversation.prototype.newMessage = function (wdMessage, mute) {
        if (mute === void 0) { mute = undefined; }
        if (this.uiBubbles.has(wdMessage.id_)) {
            this.uiBubbles.get(wdMessage.id_).structure.remove();
            this.uiBubbles.delete(wdMessage.id_);
        }
        var uiBubble;
        if (wdMessage.direction === "INCOMING") {
            if (wdMessage.isNotification) {
                var uiBubbleIncomingNotification = new UiBubble.IncomingNotification(wdMessage, this.wdChat, this.userSim);
                uiBubble = uiBubbleIncomingNotification;
            }
            else {
                if (!mute) {
                    ion.sound.play(this.isSelected ? "water_droplet" : "button_tiny");
                }
                var uiBubbleIncomingText = new UiBubble.IncomingText(wdMessage, this.wdChat, this.userSim);
                uiBubble = uiBubbleIncomingText;
            }
        }
        else {
            var uiBubbleOutgoing = new UiBubble.Outgoing(wdMessage);
            uiBubble = uiBubbleOutgoing;
        }
        this.uiBubbles.set(wdMessage.id_, uiBubble);
        var isAtBottom = this.placeUiBubble(uiBubble);
        if (this.isSelected && isAtBottom) {
            this.ul.slimScroll({ "scrollTo": this.ul.prop("scrollHeight") });
        }
    };
    return UiConversation;
}());
exports.UiConversation = UiConversation;
var UiBubble = /** @class */ (function () {
    function UiBubble(wdMessage) {
        this.wdMessage = wdMessage;
        this.structure = html.templates.find("li").clone();
        this.structure.find("p.id_content")
            .html(wdMessage.text.split("\n").join("<br>"));
        this.structure.find("span.id_date")
            .html(moment.unix(~~(wdMessage.time / 1000)).format("Do MMMM H:mm"));
    }
    return UiBubble;
}());
(function (UiBubble) {
    var IncomingText = /** @class */ (function (_super) {
        __extends(IncomingText, _super);
        function IncomingText(wdMessage, wdChat, userSim) {
            var _this = _super.call(this, wdMessage) || this;
            _this.wdMessage = wdMessage;
            _this.wdChat = wdChat;
            _this.userSim = userSim;
            _this.structure.find("div.message").addClass("in");
            _this.structure.find("p.id_emitter").html((function () {
                if (_this.wdChat.contactName) {
                    return _this.wdChat.contactName;
                }
                else {
                    return phone_number_1.phoneNumber.prettyPrint(_this.wdChat.contactNumber, _this.userSim.sim.country ?
                        _this.userSim.sim.country.iso : undefined);
                }
            })());
            return _this;
        }
        return IncomingText;
    }(UiBubble));
    UiBubble.IncomingText = IncomingText;
    var IncomingNotification = /** @class */ (function (_super) {
        __extends(IncomingNotification, _super);
        function IncomingNotification(wdMessage, wdChat, userSim) {
            var _this = _super.call(this, wdMessage) || this;
            _this.wdMessage = wdMessage;
            _this.wdChat = wdChat;
            _this.userSim = userSim;
            _this.structure.find("div.message").addClass("notification");
            return _this;
        }
        return IncomingNotification;
    }(UiBubble));
    UiBubble.IncomingNotification = IncomingNotification;
    var Outgoing = /** @class */ (function (_super) {
        __extends(Outgoing, _super);
        function Outgoing(wdMessage) {
            var _this = _super.call(this, wdMessage) || this;
            _this.wdMessage = wdMessage;
            _this.structure.find("div.message")
                .addClass("out")
                .find("p.id_emitter")
                .html((wdMessage.status === "STATUS REPORT RECEIVED" &&
                wdMessage.sentBy.who === "OTHER") ? wdMessage.sentBy.email : "You");
            _this.structure.find("span.id_check").text((function () {
                switch (wdMessage.status) {
                    case "SEND REPORT RECEIVED": return !!wdMessage.isSentSuccessfully ? checkMark : crossMark;
                    case "STATUS REPORT RECEIVED": return "" + checkMark + checkMark;
                    case "PENDING": return "";
                }
            })());
            return _this;
        }
        return Outgoing;
    }(UiBubble));
    UiBubble.Outgoing = Outgoing;
})(UiBubble || (UiBubble = {}));

}).call(this,require("buffer").Buffer)
},{"../../../shared/dist/lib/loadUiClassHtml":138,"../../../shared/dist/lib/types":146,"../templates/UiConversation.html":128,"../templates/UiConversation.less":129,"buffer":2,"moment":116,"phone-number":120,"ts-events-extended":127}],10:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var phone_number_1 = require("phone-number");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiHeader.html"), "UiHeader");
var UiHeader = /** @class */ (function () {
    function UiHeader(userSim) {
        var _this = this;
        this.userSim = userSim;
        this.structure = html.structure.clone();
        this.templates = html.templates.clone();
        this.setIsOnline(userSim.isOnline);
        this.structure.find("a.id_friendly_name").popover({
            "html": true,
            "trigger": "hover",
            "placement": "right",
            "container": "body",
            "title": "SIM card infos",
            "content": function () { return _this.templates.find("div.id_popover").html(); }
        }).find("span").text(this.userSim.friendlyName);
        this.structure.find("span.id_number").text(function () {
            if (!!_this.userSim.sim.storage.number) {
                var iso = _this.userSim.sim.country ?
                    _this.userSim.sim.country.iso : undefined;
                return phone_number_1.phoneNumber.prettyPrint(phone_number_1.phoneNumber.build(_this.userSim.sim.storage.number, iso), iso);
            }
            else {
                return "";
            }
        })
            .on("dblclick", function (e) {
            e.preventDefault();
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            if (selection !== null) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });
        this.templates.find("div.id_popover div.id_flag").addClass(this.userSim.sim.country ? this.userSim.sim.country.iso : "");
        this.templates.find("div.id_popover span.id_network").html(this.userSim.sim.serviceProvider.fromImsi ||
            this.userSim.sim.serviceProvider.fromNetwork ||
            "Unknown");
        this.templates.find("span.id_geoInfo").html((function () {
            var loc = _this.userSim.gatewayLocation;
            return loc.city || loc.subdivisions || loc.countryIso || "?";
        })());
        /*
        this.structure.find("div.id_flag").addClass(
            this.userSim.gatewayLocation.countryIso || ""
        );
        */
    }
    UiHeader.prototype.setIsOnline = function (isOnline) {
        var e_1, _a;
        this.structure.find(".id_icon_sim_up")[isOnline ? "show" : "hide"]();
        try {
            for (var _b = __values([".id_offline", ".id_icon_sim_down"]), _c = _b.next(); !_c.done; _c = _b.next()) {
                var selector = _c.value;
                this.structure.find(selector)[isOnline ? "hide" : "show"]();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    return UiHeader;
}());
exports.UiHeader = UiHeader;

},{"../../../shared/dist/lib/loadUiClassHtml":138,"../templates/UiHeader.html":130,"phone-number":120}],11:[function(require,module,exports){
"use strict";
//NOTE: Slimscroll must be loaded on the page.
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
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var types = require("../../../shared/dist/lib/types");
var phone_number_1 = require("phone-number");
var wd = types.webphoneData;
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiPhonebook.html"), "UiPhonebook");
var UiPhonebook = /** @class */ (function () {
    function UiPhonebook(userSim, wdInstance) {
        var e_1, _a;
        this.userSim = userSim;
        this.wdInstance = wdInstance;
        this.structure = html.structure.clone();
        this.evtContactSelected = new ts_events_extended_1.SyncEvent();
        /** mapped by wdChat.id_ */
        this.uiContacts = new Map();
        this.structure.find("ul").slimScroll({
            "position": "right",
            "distance": '0px',
            "railVisible": true,
            "height": '290px',
            "size": "5px"
        });
        try {
            for (var _b = __values(this.wdInstance.chats), _c = _b.next(); !_c.done; _c = _b.next()) {
                var wdChat = _c.value;
                this.createUiContact(wdChat);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.updateSearch();
    }
    UiPhonebook.prototype.triggerClickOnLastSeenChat = function () {
        var wdChat = wd.getChatWithLatestActivity(this.wdInstance);
        if (!wdChat) {
            return;
        }
        this.uiContacts.get(wdChat.id_).evtClick.post();
    };
    UiPhonebook.prototype.createUiContact = function (wdChat) {
        var _this = this;
        var uiContact = new UiContact(this.userSim, wdChat);
        uiContact.evtClick.attach(function () {
            var uiContactPrev = Array.from(_this.uiContacts.values())
                .find(function (_a) {
                var isSelected = _a.isSelected;
                return isSelected;
            });
            var wdChatPrev;
            if (uiContactPrev) {
                uiContactPrev.unselect();
                wdChatPrev = uiContactPrev.wdChat;
            }
            else {
                wdChatPrev = undefined;
            }
            uiContact.setSelected();
            //this.uiContacts.get(wdChat.id_)!.setSelected();
            _this.evtContactSelected.post({ wdChatPrev: wdChatPrev, wdChat: wdChat });
        });
        this.uiContacts.set(wdChat.id_, uiContact);
        this.placeUiContact(uiContact);
    };
    UiPhonebook.prototype.updateSearch = function () {
        this.structure.find("input")
            .quicksearch(this.structure.find("ul li"));
        this.structure.find("ul").slimScroll({ "scrollTo": "0" });
    };
    UiPhonebook.prototype.placeUiContact = function (uiContact) {
        var _this = this;
        var getUiContactFromStructure = function (li_elem) {
            var e_2, _a;
            try {
                for (var _b = __values(_this.uiContacts.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var uiContact_1 = _c.value;
                    if (uiContact_1.structure.get(0) === li_elem) {
                        return uiContact_1;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            throw new Error("UiContact not found");
        };
        var lis = this.structure.find("ul li");
        for (var i = 0; i < lis.length; i++) {
            var uiContact_i = getUiContactFromStructure(lis.get(i));
            if (wd.compareChat(uiContact.wdChat, uiContact_i.wdChat) >= 0) {
                uiContact.structure.insertBefore(uiContact_i.structure);
                return;
            }
        }
        this.structure.find("ul").append(uiContact.structure);
    };
    /** To create ui contact after init */
    UiPhonebook.prototype.insertContact = function (wdChat) {
        this.structure.find("input").val("");
        this.createUiContact(wdChat);
        this.updateSearch();
    };
    /**
     * triggered by: evt on text input => update last seen => call
     * OR
     * new message arrive => update wdMessage => call
     * OR
     * contact name changed
     * OR
     * contact deleted
     * */
    UiPhonebook.prototype.notifyContactChanged = function (wdChat) {
        var uiContact = this.uiContacts.get(wdChat.id_);
        if (this.wdInstance.chats.indexOf(wdChat) < 0) {
            uiContact.structure.detach();
            this.uiContacts.delete(wdChat.id_);
        }
        else {
            uiContact.refreshNotificationLabel();
            uiContact.updateContactName();
            this.placeUiContact(uiContact);
        }
    };
    UiPhonebook.prototype.triggerContactClick = function (wdChat) {
        this.uiContacts.get(wdChat.id_).evtClick.post();
    };
    return UiPhonebook;
}());
exports.UiPhonebook = UiPhonebook;
var UiContact = /** @class */ (function () {
    function UiContact(userSim, wdChat) {
        var _this = this;
        this.userSim = userSim;
        this.wdChat = wdChat;
        this.structure = html.templates.find("li").clone();
        /** only forward click event, need to be selected manually from outside */
        this.evtClick = new ts_events_extended_1.VoidSyncEvent();
        this.structure
            .on("click", function () {
            var selection = window.getSelection();
            //Do not trigger click if text selected.
            if (selection !== null && selection.toString().length !== 0) {
                return;
            }
            _this.evtClick.post();
        })
            .find(".id_number")
            .on("dblclick", function (e) {
            e.preventDefault(); //cancel system double-click event
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            if (selection !== null) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });
        this.updateContactName();
        this.structure.find("span.id_notifications").hide();
        this.refreshNotificationLabel();
    }
    //TODO: optimization
    UiContact.prototype.refreshNotificationLabel = function () {
        if (this.wdChat.messages.length) {
            this.structure.addClass("has-messages");
        }
        else {
            this.structure.removeClass("has-messages");
        }
        var count = wd.getUnreadMessagesCount(this.wdChat);
        var span = this.structure.find("span.id_notifications");
        span.html("" + count);
        if (count !== 0) {
            span.stop().fadeIn(0);
        }
        else {
            span.fadeOut(2000);
        }
    };
    //TODO: optimization
    /** updateName if different */
    UiContact.prototype.updateContactName = function () {
        this.structure.find("span.id_name").html(this.wdChat.contactName);
        var spanNumber = this.structure.find("span.id_number");
        var prettyNumber = phone_number_1.phoneNumber.prettyPrint(this.wdChat.contactNumber, this.userSim.sim.country ?
            this.userSim.sim.country.iso : undefined);
        if (this.wdChat.contactName) {
            spanNumber
                .addClass("visible-lg-inline")
                .html(prettyNumber);
        }
        else {
            spanNumber
                .removeClass("visible-lg-inline")
                .html(prettyNumber);
        }
    };
    /** update wsChat */
    UiContact.prototype.setSelected = function () {
        this.structure.addClass("selected");
    };
    /** default state */
    UiContact.prototype.unselect = function () {
        this.structure.removeClass("selected");
    };
    Object.defineProperty(UiContact.prototype, "isSelected", {
        get: function () {
            return this.structure.hasClass("selected");
        },
        enumerable: true,
        configurable: true
    });
    return UiContact;
}());

},{"../../../shared/dist/lib/loadUiClassHtml":138,"../../../shared/dist/lib/types":146,"../templates/UiPhonebook.html":131,"phone-number":120,"ts-events-extended":127}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var phone_number_1 = require("phone-number");
var bootbox_custom = require("../../../shared/dist/lib/tools/bootbox_custom");
$.validator.addMethod("validateTelInput", function (value, element) {
    try {
        phone_number_1.phoneNumber.build(value, $(element).intlTelInput("getSelectedCountryData").iso2, "MUST BE DIALABLE");
    }
    catch (_a) {
        return false;
    }
    return true;
}, "Malformed phone number");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiQuickAction.html"), "UiQuickAction");
var UiQuickAction = /** @class */ (function () {
    function UiQuickAction(userSim) {
        var _this = this;
        this.userSim = userSim;
        this.structure = html.structure.clone();
        this.templates = html.templates.clone();
        this.evtVoiceCall = new ts_events_extended_1.SyncEvent();
        this.evtSms = new ts_events_extended_1.SyncEvent();
        this.evtNewContact = new ts_events_extended_1.SyncEvent();
        var input = this.structure.find("input.id_tel-input");
        //TODO add if bug "utilsScript": "/intl-tel-input/build/js/utils.js",
        var simIso = this.userSim.sim.country ? this.userSim.sim.country.iso : undefined;
        var gwIso = this.userSim.gatewayLocation.countryIso;
        (function () {
            var intlTelInputOptions = {
                "dropdownContainer": "body"
            };
            var preferredCountries = [];
            if (simIso) {
                preferredCountries.push(simIso);
            }
            if (gwIso && simIso !== gwIso) {
                preferredCountries.push(gwIso);
            }
            if (preferredCountries.length) {
                intlTelInputOptions.preferredCountries = preferredCountries;
            }
            if (simIso || gwIso) {
                intlTelInputOptions.initialCountry = simIso || gwIso;
            }
            input.intlTelInput(intlTelInputOptions);
        })();
        (function () {
            var self = _this;
            input.on("countrychange", function calleeA(_, countryData) {
                if (countryData.iso2 === simIso)
                    return;
                input.off("countrychange", undefined, calleeA);
                bootbox_custom.alert([
                    "Warning: Consult ",
                    self.userSim.sim.serviceProvider.fromImsi || "Your operator",
                    "'s pricing for Calls/SMS toward " + countryData.name
                ].join(""));
                input.on("countrychange", function calleeB(_, countryData) {
                    if (countryData.iso2 !== simIso)
                        return;
                    //staticNotification.close();
                    input.off("countrychange", undefined, calleeB);
                    input.on("countrychange", calleeA);
                });
            });
        })();
        input.popover({
            "html": true,
            "trigger": "manual",
            "placement": "right",
            "container": "body",
            "content": function () { return _this.templates.find("div.id_popover").html(); }
        });
        var validator = this.structure.find("form.id_form").validate({
            "debug": true,
            "onsubmit": false,
            "rules": {
                "tel-input": {
                    "validateTelInput": true
                }
            },
            "errorPlacement": function (error) {
                var message = input.val() === "" ? "First enter the number" : $(error).text();
                _this.templates.find("div.id_popover span.id_error-message").html(message);
                input.popover("show");
            },
            "success": function () { return input.popover("hide"); }
        });
        this.structure.on("mouseleave", function () { return input.popover("hide"); });
        this.structure.find("button").on("click", function (event) {
            if (!validator.form()) {
                return;
            }
            var evt;
            if ($(event.currentTarget).hasClass("id_call")) {
                evt = _this.evtVoiceCall;
            }
            else if ($(event.currentTarget).hasClass("id_sms")) {
                evt = _this.evtSms;
            }
            else if ($(event.currentTarget).hasClass("id_contact")) {
                evt = _this.evtNewContact;
            }
            evt.post(phone_number_1.phoneNumber.build(input.val(), input.intlTelInput("getSelectedCountryData").iso2));
            if (simIso) {
                input.intlTelInput("setCountry", simIso);
            }
            input.intlTelInput("setNumber", "");
        });
        this.notifySimOnlineStatusChanged();
    }
    UiQuickAction.prototype.notifySimOnlineStatusChanged = function () {
        this.structure.find("button").prop("disabled", !this.userSim.isOnline);
    };
    return UiQuickAction;
}());
exports.UiQuickAction = UiQuickAction;

},{"../../../shared/dist/lib/loadUiClassHtml":138,"../../../shared/dist/lib/tools/bootbox_custom":142,"../templates/UiQuickAction.html":132,"phone-number":120,"ts-events-extended":127}],13:[function(require,module,exports){
"use strict";
//NOTE: Require ion sound loaded on the page.
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
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var phone_number_1 = require("phone-number");
var modal_stack = require("../../../shared/dist/lib/tools/modal_stack");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiVoiceCall.html"), "UiVoiceCall");
var UiVoiceCall = /** @class */ (function () {
    function UiVoiceCall(userSim) {
        var _this = this;
        this.userSim = userSim;
        this.structure = html.structure.clone();
        this.btnGreen = this.structure.find(".id_btn-green");
        this.btnRed = this.structure.find(".id_btn-red");
        this.evtBtnClick = new ts_events_extended_1.SyncEvent();
        this.evtNumpadDtmf = new ts_events_extended_1.SyncEvent();
        this.state = "TERMINATED";
        //Debug only
        window["uiVoiceCall"] = this;
        this.countryIso = userSim.sim.country ?
            userSim.sim.country.iso : undefined;
        {
            var _a = modal_stack.add(this.structure, {
                "keyboard": false,
                "backdrop": "static"
            }), hide = _a.hide, show = _a.show;
            this.hideModal = hide;
            this.showModal = show;
        }
        this.structure.find("span.id_me").html(userSim.friendlyName);
        this.structure.find("span.id_me_under").html(!!this.userSim.sim.storage.number ?
            (function () {
                var iso = _this.userSim.sim.country ?
                    _this.userSim.sim.country.iso : undefined;
                return phone_number_1.phoneNumber.prettyPrint(phone_number_1.phoneNumber.build(_this.userSim.sim.storage.number, iso), iso);
            })() : "");
        this.btnGreen.on("click", function () { return _this.evtBtnClick.post("GREEN"); });
        this.btnRed.on("click", function () { return _this.evtBtnClick.post("RED"); });
        var mouseDownStart = {};
        var _loop_1 = function (i) {
            var signal = (i <= 9) ? "" + i : (i === 10) ? "*" : "#";
            this_1.structure
                .find("button.id_key" + (signal === "*" ? "Ast" : (signal === "#" ? "Sharp" : signal)))
                .on("mousedown", function () { return mouseDownStart[signal] = Date.now(); })
                .on("click", function () {
                var duration = Date.now() - mouseDownStart[signal];
                if (duration < 250) {
                    duration = 250;
                }
                _this.evtNumpadDtmf.post({
                    signal: signal,
                    duration: duration
                });
            });
        };
        var this_1 = this;
        for (var i = 0; i <= 11; i++) {
            _loop_1(i);
        }
    }
    UiVoiceCall.prototype.setContact = function (wdChat) {
        var prettyNumber = phone_number_1.phoneNumber.prettyPrint(wdChat.contactNumber, this.countryIso);
        this.structure.find("span.id_contact")
            .html(wdChat.contactName ? wdChat.contactName : "");
        this.structure.find("span.id_contact_under")
            .html(prettyNumber);
    };
    UiVoiceCall.prototype.setArrows = function (direction) {
        this.structure.find("[class^='sel_arrow-']").addClass("hide");
        this.structure
            .find(".sel_arrow-" + ((direction === "INCOMING") ? "left" : "right"))
            .removeClass("hide");
    };
    UiVoiceCall.prototype.onEstablished = function () {
        var _this = this;
        this.setState("ESTABLISHED", "In call");
        var evtUserInput = new ts_events_extended_1.SyncEvent();
        this.evtNumpadDtmf.attach(function (_a) {
            var signal = _a.signal, duration = _a.duration;
            return evtUserInput.post({ "userAction": "DTMF", signal: signal, duration: duration });
        });
        this.evtBtnClick.attachOnce(function () {
            _this.setState("TERMINATED", "You hanged up");
            evtUserInput.post({ "userAction": "HANGUP" });
        });
        return { evtUserInput: evtUserInput };
    };
    UiVoiceCall.prototype.onIncoming = function (wdChat) {
        var _this = this;
        this.setContact(wdChat);
        this.setArrows("INCOMING");
        this.setState("RINGING", "Incoming call");
        return {
            "onTerminated": function (message) { return _this.setState("TERMINATED", message); },
            "prUserInput": new Promise(function (resolve) { return _this.evtBtnClick.attachOnce(function (btnId) {
                if (btnId === "RED") {
                    _this.setState("TERMINATED", "You rejected the call");
                    resolve({ "userAction": "REJECT" });
                }
                else {
                    _this.setState("LOADING", "Connecting...");
                    resolve({
                        "userAction": "ANSWER",
                        "onEstablished": function () { return _this.onEstablished(); }
                    });
                }
            }); })
        };
    };
    UiVoiceCall.prototype.onOutgoing = function (wdChat) {
        var _this = this;
        this.setContact(wdChat);
        this.setArrows("OUTGOING");
        this.setState("LOADING", "Loading...");
        return {
            "onTerminated": function (message) { return _this.setState("TERMINATED", message); },
            "onRingback": function () {
                _this.setState("RINGBACK", "Remote is ringing");
                return {
                    "onEstablished": function () { return _this.onEstablished(); },
                    "prUserInput": new Promise(function (resolve) { return _this.evtBtnClick.attachOnce(function () {
                        _this.setState("TERMINATED", "You hanged up before remote answered");
                        resolve({ "userAction": "HANGUP" });
                    }); })
                };
            },
            "prUserInput": new Promise(function (resolve) { return _this.evtBtnClick.attachOnce(function () {
                _this.setState("TERMINATED", "You canceled the call before remote was ringing");
                resolve({ "userAction": "CANCEL" });
            }); })
        };
    };
    UiVoiceCall.prototype.setState = function (state, message) {
        var _this = this;
        var e_1, _a;
        if (state === this.state) {
            return;
        }
        this.state = state;
        this.evtBtnClick.detach();
        var keyPad = this.structure.find(".id_numpad");
        keyPad.hide();
        this.structure.find("[class^='id_icon-']").addClass("hide");
        var spanTimer = this.structure.find("span.id_timer");
        if (spanTimer["timer"] instanceof Function) {
            spanTimer["timer"]("remove");
            spanTimer.text("");
        }
        this.evtNumpadDtmf.detach();
        this.btnGreen.addClass("hide");
        this.btnRed.addClass("hide");
        this.showModal();
        try {
            try {
                for (var _b = __values(["semasim_ringtone", "loading"]), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var soundName = _c.value;
                    ion.sound.stop(soundName);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        catch (_d) { }
        switch (state) {
            case "RINGING":
                ion.sound.play("semasim_ringtone", { "loop": true });
                this.btnGreen.removeClass("hide").html("Answer");
                this.btnRed.removeClass("hide").html("Reject");
                this.structure.find(".id_icon-ring").removeClass("hide");
                break;
            case "RINGBACK":
                this.structure.find(".id_icon-ring").removeClass("hide");
                this.btnRed.removeClass("hide").html("Hangup");
                break;
            case "ESTABLISHED":
                keyPad.show();
                this.btnRed.removeClass("hide").html("Hangup");
                spanTimer["timer"]("start");
                break;
            case "LOADING":
                ion.sound.play("loading", { "loop": true });
                this.btnRed.removeClass("hide").html("Cancel");
                this.structure.find(".id_icon-spin").removeClass("hide");
                break;
            case "TERMINATED":
                this.structure.find(".id_icon-hangup").removeClass("hide");
                setTimeout(function () { return _this.hideModal(); }, 1500);
                break;
            default: break;
        }
        this.structure.find(".id_status").html(message);
    };
    return UiVoiceCall;
}());
exports.UiVoiceCall = UiVoiceCall;

},{"../../../shared/dist/lib/loadUiClassHtml":138,"../../../shared/dist/lib/tools/modal_stack":144,"../templates/UiVoiceCall.html":133,"phone-number":120,"ts-events-extended":127}],14:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var UiQuickAction_1 = require("./UiQuickAction");
var UiHeader_1 = require("./UiHeader");
var UiPhonebook_1 = require("./UiPhonebook");
var UiConversation_1 = require("./UiConversation");
var UiVoiceCall_1 = require("./UiVoiceCall");
var Ua_1 = require("../../../shared/dist/lib/Ua");
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var remoteApiCaller = require("../../../shared/dist/lib/toBackend/remoteApiCaller");
var localApiHandlers = require("../../../shared/dist/lib/toBackend/localApiHandlers");
var phone_number_1 = require("phone-number");
var bootbox_custom = require("../../../shared/dist/lib/tools/bootbox_custom");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiWebphoneController.html"), "UiWebphoneController");
var UiWebphoneController = /** @class */ (function () {
    function UiWebphoneController(userSim, wdInstance) {
        var _this = this;
        this.userSim = userSim;
        this.wdInstance = wdInstance;
        this.structure = html.structure.clone();
        this._uiConversations = new Map();
        this.ua = new Ua_1.Ua(userSim.sim.imsi, userSim.password);
        this.uiVoiceCall = new UiVoiceCall_1.UiVoiceCall(userSim);
        this.uiHeader = new UiHeader_1.UiHeader(userSim);
        this.uiQuickAction = new UiQuickAction_1.UiQuickAction(userSim);
        this.uiPhonebook = new UiPhonebook_1.UiPhonebook(userSim, wdInstance);
        this.registerRemoteNotifyHandlers();
        this.initUa();
        this.initUiHeader();
        this.initUiQuickAction();
        this.initUiPhonebook();
        $("body").data("dynamic").panels();
        setTimeout(function () { return _this.uiPhonebook.triggerClickOnLastSeenChat(); }, 0);
    }
    UiWebphoneController.prototype.registerRemoteNotifyHandlers = function () {
        var _this = this;
        localApiHandlers.evtSharedSimUnregistered.attachOnce(function (_a) {
            var userSim = _a.userSim;
            return userSim === _this.userSim;
        }, function () {
            //TODO: Terminate UA.
            _this.structure.detach();
        });
        localApiHandlers.evtContactCreatedOrUpdated.attach(function (_a) {
            var userSim = _a.userSim;
            return userSim === _this.userSim;
        }, function (_a) {
            var contact = _a.contact;
            return __awaiter(_this, void 0, void 0, function () {
                var wdChat, isUpdated;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            wdChat = this.wdInstance.chats.find(function (_a) {
                                var contactNumber = _a.contactNumber;
                                return phone_number_1.phoneNumber.areSame(contactNumber, contact.number_raw);
                            });
                            if (!!wdChat) return [3 /*break*/, 2];
                            return [4 /*yield*/, remoteApiCaller.newWdChat(this.wdInstance, phone_number_1.phoneNumber.build(contact.number_raw, this.userSim.sim.country ? this.userSim.sim.country.iso : undefined), contact.name, contact.mem_index !== undefined ? contact.mem_index : null)];
                        case 1:
                            wdChat = _b.sent();
                            this.getOrCreateUiConversation(wdChat);
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, remoteApiCaller.updateWdChatContactInfos(wdChat, contact.name, contact.mem_index !== undefined ? contact.mem_index : null)];
                        case 3:
                            isUpdated = _b.sent();
                            if (!isUpdated) {
                                return [2 /*return*/];
                            }
                            this.uiPhonebook.notifyContactChanged(wdChat);
                            this.getOrCreateUiConversation(wdChat)
                                .notifyContactNameUpdated();
                            _b.label = 4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        });
        localApiHandlers.evtContactDeleted.attach(function (_a) {
            var userSim = _a.userSim;
            return userSim === _this.userSim;
        }, function (_a) {
            var contact = _a.contact;
            return __awaiter(_this, void 0, void 0, function () {
                var wdChat, isUpdated;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            wdChat = this.wdInstance.chats.find(function (_a) {
                                var contactNumber = _a.contactNumber;
                                return phone_number_1.phoneNumber.areSame(contactNumber, contact.number_raw);
                            });
                            return [4 /*yield*/, remoteApiCaller.updateWdChatContactInfos(wdChat, "", null)];
                        case 1:
                            isUpdated = _b.sent();
                            if (!isUpdated) {
                                return [2 /*return*/];
                            }
                            this.uiPhonebook.notifyContactChanged(wdChat);
                            this.getOrCreateUiConversation(wdChat)
                                .notifyContactNameUpdated();
                            return [2 /*return*/];
                    }
                });
            });
        });
        localApiHandlers.evtSimIsOnlineStatusChange.attach(function (userSim) { return userSim === _this.userSim; }, function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.userSim.isOnline) {
                    if (this.ua.isRegistered) {
                        this.ua.unregister();
                    }
                }
                else {
                    this.ua.register();
                }
                this.uiQuickAction.notifySimOnlineStatusChanged();
                return [2 /*return*/];
            });
        }); });
    };
    UiWebphoneController.prototype.initUa = function () {
        var _this = this;
        this.ua.evtRegistrationStateChanged.attach(function (isRegistered) {
            var e_1, _a;
            _this.uiHeader.setIsOnline(isRegistered);
            try {
                for (var _b = __values(_this._uiConversations.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var uiConversation = _c.value;
                    uiConversation.setReadonly(!isRegistered);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
        this.ua.evtIncomingMessage.attach(function (_a) {
            var fromNumber = _a.fromNumber, bundledData = _a.bundledData, text = _a.text, onProcessed = _a.onProcessed;
            return __awaiter(_this, void 0, void 0, function () {
                var wdChat, prWdMessage, wdMessage;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getOrCreateChatByPhoneNumber(fromNumber)];
                        case 1:
                            wdChat = _b.sent();
                            prWdMessage = (function () {
                                switch (bundledData.type) {
                                    case "MESSAGE": {
                                        var message = {
                                            "direction": "INCOMING",
                                            "isNotification": false,
                                            "time": bundledData.pduDate.getTime(),
                                            text: text
                                        };
                                        return remoteApiCaller.newWdMessage(wdChat, message);
                                    }
                                    case "SEND REPORT": {
                                        return remoteApiCaller.notifySendReportReceived(wdChat, bundledData);
                                    }
                                    case "STATUS REPORT": {
                                        if (bundledData.messageTowardGsm.uaSim.ua.instance === Ua_1.Ua.instanceId) {
                                            return remoteApiCaller.notifyStatusReportReceived(wdChat, bundledData);
                                        }
                                        else {
                                            var message = {
                                                "time": bundledData.messageTowardGsm.date.getTime(),
                                                "direction": "OUTGOING",
                                                "text": bundledData.messageTowardGsm.text,
                                                "sentBy": (function () {
                                                    return (bundledData.messageTowardGsm.uaSim.ua.userEmail === Ua_1.Ua.email) ?
                                                        ({ "who": "USER" }) :
                                                        ({ "who": "OTHER", "email": bundledData.messageTowardGsm.uaSim.ua.userEmail });
                                                })(),
                                                "status": "STATUS REPORT RECEIVED",
                                                "deliveredTime": bundledData.statusReport.isDelivered ?
                                                    bundledData.statusReport.dischargeDate.getTime() : null
                                            };
                                            return remoteApiCaller.newWdMessage(wdChat, message);
                                        }
                                    }
                                    case "MMS NOTIFICATION": console.log("WPA PUSH: " + bundledData.wapPushMessage);
                                    case "CALL ANSWERED BY":
                                    case "MISSED CALL": {
                                        var message = {
                                            "direction": "INCOMING",
                                            "isNotification": true,
                                            "time": (bundledData.type === "MMS NOTIFICATION" ?
                                                bundledData.pduDate : bundledData.date).getTime(),
                                            text: text
                                        };
                                        return remoteApiCaller.newWdMessage(wdChat, message);
                                    }
                                }
                            })();
                            return [4 /*yield*/, prWdMessage];
                        case 2:
                            wdMessage = _b.sent();
                            onProcessed();
                            if (!!wdMessage) {
                                this.getOrCreateUiConversation(wdChat).newMessage(wdMessage);
                                this.uiPhonebook.notifyContactChanged(wdChat);
                            }
                            return [2 /*return*/];
                    }
                });
            });
        });
        this.ua.evtIncomingCall.attach(function (_a) {
            var fromNumber = _a.fromNumber, terminate = _a.terminate, prTerminated = _a.prTerminated, onAccepted = _a.onAccepted;
            return __awaiter(_this, void 0, void 0, function () {
                var wdChat, _b, onTerminated, prUserInput;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.getOrCreateChatByPhoneNumber(fromNumber)];
                        case 1:
                            wdChat = _c.sent();
                            this.uiPhonebook.triggerContactClick(wdChat);
                            _b = this.uiVoiceCall.onIncoming(wdChat), onTerminated = _b.onTerminated, prUserInput = _b.prUserInput;
                            prTerminated.then(function () { return onTerminated("Call ended"); });
                            prUserInput.then(function (ua) {
                                if (ua.userAction === "REJECT") {
                                    terminate();
                                }
                            });
                            prUserInput.then(function (ua) {
                                if (ua.userAction === "ANSWER") {
                                    var onEstablished_1 = ua.onEstablished;
                                    onAccepted().then(function (_a) {
                                        var sendDtmf = _a.sendDtmf;
                                        var evtUserInput = onEstablished_1().evtUserInput;
                                        evtUserInput.attach(function (eventData) {
                                            return eventData.userAction === "DTMF";
                                        }, function (_a) {
                                            var signal = _a.signal, duration = _a.duration;
                                            return sendDtmf(signal, duration);
                                        });
                                        evtUserInput.attachOnce(function (_a) {
                                            var userAction = _a.userAction;
                                            return userAction === "HANGUP";
                                        }, function () { return terminate(); });
                                    });
                                }
                            });
                            return [2 /*return*/];
                    }
                });
            });
        });
        if (this.userSim.isOnline) {
            this.ua.register();
        }
    };
    UiWebphoneController.prototype.initUiHeader = function () {
        this.structure
            .find("div.id_header")
            .append(this.uiHeader.structure);
    };
    UiWebphoneController.prototype.initUiQuickAction = function () {
        var _this = this;
        this.structure
            .find("div.id_colLeft")
            .append(this.uiQuickAction.structure);
        var onEvt = function (action, number) { return __awaiter(_this, void 0, void 0, function () {
            var wdChat, uiConversation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getOrCreateChatByPhoneNumber(number)];
                    case 1:
                        wdChat = _a.sent();
                        this.uiPhonebook.triggerContactClick(wdChat);
                        if (action === "SMS") {
                            return [2 /*return*/];
                        }
                        uiConversation = this.getOrCreateUiConversation(wdChat);
                        switch (action) {
                            case "CALL":
                                uiConversation.evtVoiceCall.post();
                                break;
                            case "CONTACT":
                                uiConversation.evtUpdateContact.post();
                                break;
                        }
                        return [2 /*return*/];
                }
            });
        }); };
        this.uiQuickAction.evtSms.attach(function (number) { return onEvt("SMS", number); });
        this.uiQuickAction.evtVoiceCall.attach(function (number) { return onEvt("CALL", number); });
        this.uiQuickAction.evtNewContact.attach(function (number) { return onEvt("CONTACT", number); });
    };
    UiWebphoneController.prototype.initUiPhonebook = function () {
        var _this = this;
        this.structure
            .find("div.id_colLeft")
            .append(this.uiPhonebook.structure);
        this.uiPhonebook.evtContactSelected.attach(function (_a) {
            var wdChatPrev = _a.wdChatPrev, wdChat = _a.wdChat;
            if (wdChatPrev) {
                _this.getOrCreateUiConversation(wdChatPrev).unselect();
            }
            _this.getOrCreateUiConversation(wdChat).setSelected();
        });
    };
    UiWebphoneController.prototype.getOrCreateUiConversation = function (wdChat) {
        var _this = this;
        if (this._uiConversations.has(wdChat)) {
            return this._uiConversations.get(wdChat);
        }
        var uiConversation = new UiConversation_1.UiConversation(this.userSim, wdChat);
        if (this.ua.isRegistered) {
            uiConversation.setReadonly(false);
        }
        this._uiConversations.set(wdChat, uiConversation);
        this.structure.find("div.id_colRight").append(uiConversation.structure);
        uiConversation.evtChecked.attach(function () { return __awaiter(_this, void 0, void 0, function () {
            var isUpdated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, remoteApiCaller.updateWdChatIdOfLastMessageSeen(wdChat)];
                    case 1:
                        isUpdated = _a.sent();
                        if (!isUpdated) {
                            return [2 /*return*/];
                        }
                        this.uiPhonebook.notifyContactChanged(wdChat);
                        return [2 /*return*/];
                }
            });
        }); });
        uiConversation.evtSendText.attach(function (text) { return __awaiter(_this, void 0, void 0, function () {
            var exactSendDate, wdMessage, _a, _b, _c, error_1, wdMessageUpdated;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        exactSendDate = new Date();
                        return [4 /*yield*/, remoteApiCaller.newWdMessage(uiConversation.wdChat, (function () {
                                var message = {
                                    "time": exactSendDate.getTime(),
                                    "direction": "OUTGOING",
                                    "status": "PENDING",
                                    text: text,
                                };
                                return message;
                            })())];
                    case 1:
                        wdMessage = _d.sent();
                        uiConversation.newMessage(wdMessage);
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 5, , 7]);
                        _b = (_a = this.ua).sendMessage;
                        _c = [uiConversation.wdChat.contactNumber,
                            text,
                            exactSendDate];
                        return [4 /*yield*/, remoteApiCaller.shouldAppendPromotionalMessage()];
                    case 3: return [4 /*yield*/, _b.apply(_a, _c.concat([_d.sent()]))];
                    case 4:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        error_1 = _d.sent();
                        console.log("ua send message error", error_1);
                        return [4 /*yield*/, remoteApiCaller.notifyUaFailedToSendMessage(uiConversation.wdChat, wdMessage)];
                    case 6:
                        wdMessageUpdated = _d.sent();
                        uiConversation.newMessage(wdMessageUpdated);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        }); });
        uiConversation.evtVoiceCall.attach(function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, terminate, prTerminated, prNextState, _b, onTerminated, onRingback, prUserInput;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.ua.placeOutgoingCall(wdChat.contactNumber)];
                    case 1:
                        _a = _c.sent(), terminate = _a.terminate, prTerminated = _a.prTerminated, prNextState = _a.prNextState;
                        _b = this.uiVoiceCall.onOutgoing(wdChat), onTerminated = _b.onTerminated, onRingback = _b.onRingback, prUserInput = _b.prUserInput;
                        prTerminated.then(function () { return onTerminated("Call terminated"); });
                        prUserInput.then(function () { return terminate(); });
                        prNextState.then(function (_a) {
                            var prNextState = _a.prNextState;
                            var _b = onRingback(), onEstablished = _b.onEstablished, prUserInput = _b.prUserInput;
                            prUserInput.then(function () { return terminate(); });
                            prNextState.then(function (_a) {
                                var sendDtmf = _a.sendDtmf;
                                var evtUserInput = onEstablished().evtUserInput;
                                evtUserInput.attach(function (eventData) {
                                    return eventData.userAction === "DTMF";
                                }, function (_a) {
                                    var signal = _a.signal, duration = _a.duration;
                                    return sendDtmf(signal, duration);
                                });
                                evtUserInput.attachOnce(function (_a) {
                                    var userAction = _a.userAction;
                                    return userAction === "HANGUP";
                                }, function () { return terminate(); });
                            });
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        uiConversation.evtUpdateContact.attach(function () { return __awaiter(_this, void 0, void 0, function () {
            var name, contact, isUpdated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.prompt({
                            "title": "Contact name for " + wdChat.contactNumber,
                            "value": wdChat.contactName || "",
                            "callback": function (result) { return resolve(result); },
                        }); })];
                    case 1:
                        name = _a.sent();
                        if (!name) {
                            return [2 /*return*/, undefined];
                        }
                        bootbox_custom.loading("Create or update contact");
                        contact = this.userSim.phonebook.find(function (_a) {
                            var mem_index = _a.mem_index, number_raw = _a.number_raw;
                            if (wdChat.contactIndexInSim !== null) {
                                return mem_index === wdChat.contactIndexInSim;
                            }
                            return phone_number_1.phoneNumber.areSame(wdChat.contactNumber, number_raw);
                        });
                        if (!!!contact) return [3 /*break*/, 3];
                        return [4 /*yield*/, remoteApiCaller.updateContactName(this.userSim, contact, name)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, remoteApiCaller.createContact(this.userSim, name, wdChat.contactNumber)];
                    case 4:
                        contact = _a.sent();
                        _a.label = 5;
                    case 5: return [4 /*yield*/, remoteApiCaller.updateWdChatContactInfos(wdChat, name, contact.mem_index !== undefined ? contact.mem_index : null)];
                    case 6:
                        isUpdated = _a.sent();
                        bootbox_custom.dismissLoading();
                        if (!isUpdated) {
                            return [2 /*return*/];
                        }
                        this.uiPhonebook.notifyContactChanged(wdChat);
                        uiConversation.notifyContactNameUpdated();
                        return [2 /*return*/];
                }
            });
        }); });
        uiConversation.evtDelete.attach(function () { return __awaiter(_this, void 0, void 0, function () {
            var shouldProceed, contact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return bootbox_custom.confirm({
                            "title": "Delete chat",
                            "message": "Delete contact and conversation ?",
                            callback: function (result) { return resolve(result); }
                        }); })];
                    case 1:
                        shouldProceed = _a.sent();
                        if (!shouldProceed) {
                            return [2 /*return*/];
                        }
                        bootbox_custom.loading("Deleting contact and conversation");
                        contact = this.userSim.phonebook.find(function (_a) {
                            var mem_index = _a.mem_index, number_raw = _a.number_raw;
                            if (wdChat.contactIndexInSim !== null) {
                                return mem_index === wdChat.contactIndexInSim;
                            }
                            return phone_number_1.phoneNumber.areSame(wdChat.contactNumber, number_raw);
                        });
                        if (!!!contact) return [3 /*break*/, 3];
                        return [4 /*yield*/, remoteApiCaller.deleteContact(this.userSim, contact)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, remoteApiCaller.destroyWdChat(this.wdInstance, wdChat)];
                    case 4:
                        _a.sent();
                        bootbox_custom.dismissLoading();
                        this.uiPhonebook.notifyContactChanged(wdChat);
                        uiConversation.structure.detach();
                        this._uiConversations.delete(wdChat);
                        this.uiPhonebook.triggerClickOnLastSeenChat();
                        return [2 /*return*/];
                }
            });
        }); });
        uiConversation.evtLoadMore.attach(function (_a) {
            var onLoaded = _a.onLoaded;
            return remoteApiCaller.fetchOlderWdMessages(wdChat)
                .then(function (wdMessages) { return onLoaded(wdMessages); });
        });
        return uiConversation;
    };
    UiWebphoneController.prototype.getOrCreateChatByPhoneNumber = function (number) {
        return __awaiter(this, void 0, void 0, function () {
            var wdChat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wdChat = this.wdInstance.chats.find(function (_a) {
                            var contactNumber = _a.contactNumber;
                            return contactNumber === number;
                        });
                        if (!!wdChat) return [3 /*break*/, 2];
                        return [4 /*yield*/, remoteApiCaller.newWdChat(this.wdInstance, number, "", null)];
                    case 1:
                        wdChat = _a.sent();
                        this.uiPhonebook.insertContact(wdChat);
                        $('body').data('dynamic').panels();
                        _a.label = 2;
                    case 2: return [2 /*return*/, wdChat];
                }
            });
        });
    };
    return UiWebphoneController;
}());
exports.UiWebphoneController = UiWebphoneController;

},{"../../../shared/dist/lib/Ua":136,"../../../shared/dist/lib/loadUiClassHtml":138,"../../../shared/dist/lib/toBackend/localApiHandlers":140,"../../../shared/dist/lib/toBackend/remoteApiCaller":141,"../../../shared/dist/lib/tools/bootbox_custom":142,"../templates/UiWebphoneController.html":134,"./UiConversation":9,"./UiHeader":10,"./UiPhonebook":11,"./UiQuickAction":12,"./UiVoiceCall":13,"phone-number":120}],15:[function(require,module,exports){
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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
require("es6-map/implement");
require("es6-weak-map/implement");
require("array.prototype.find").shim();
require("../../../shared/dist/lib/tools/standalonePolyfills");
var Ua_1 = require("../../../shared/dist/lib/Ua");
var UiWebphoneController_1 = require("./UiWebphoneController");
var connection = require("../../../shared/dist/lib/toBackend/connection");
var remoteApiCaller = require("../../../shared/dist/lib/toBackend/remoteApiCaller");
var webApiCaller = require("../../../shared/dist/lib/webApiCaller");
var bootbox_custom = require("../../../shared/dist/lib/tools/bootbox_custom");
var localApiHandlers = require("../../../shared/dist/lib/toBackend/localApiHandlers");
var types = require("../../../shared/dist/lib/types");
$(document).ready(function () { return __awaiter(_this, void 0, void 0, function () {
    var userSims, wdInstances;
    var _this = this;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                $("#logout").click(function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, webApiCaller.logoutUser()];
                            case 1:
                                _a.sent();
                                window.location.href = "/login";
                                return [2 /*return*/];
                        }
                    });
                }); });
                connection.connect({ "requestTurnCred": true });
                $("#page-payload").html("");
                bootbox_custom.loading("Fetching contacts and SMS history", 0);
                return [4 /*yield*/, remoteApiCaller.getUsableUserSims()];
            case 1:
                userSims = _a.sent();
                if (userSims.length === 0) {
                    window.location.href = "/manager";
                }
                wdInstances = new Map();
                return [4 /*yield*/, Promise.all(__spread([
                        remoteApiCaller.getUaInstanceId()
                            .then(function (_a) {
                            var uaInstanceId = _a.uaInstanceId, email = _a.email;
                            return Ua_1.Ua.setUaInstanceId(uaInstanceId, email);
                        })
                    ], userSims.map(function (userSim) { return remoteApiCaller.getOrCreateWdInstance(userSim)
                        .then(function (wdInstance) { wdInstances.set(userSim, wdInstance); }); })))];
            case 2:
                _a.sent();
                //NOTE: Sort user sims so we always have the most relevant at the top of the page.
                userSims
                    .sort(function (s1, s2) {
                    if (s1.isOnline !== s2.isOnline) {
                        return s1.isOnline ? 1 : -1;
                    }
                    var _a = __read([s1, s2].map(function (userSim) {
                        return types.webphoneData.getChatWithLatestActivity(wdInstances.get(userSim));
                    }), 2), c1 = _a[0], c2 = _a[1];
                    if (!c1 !== !c2) {
                        return !!c1 ? 1 : -1;
                    }
                    if (!c1) {
                        return 0;
                    }
                    return types.webphoneData.compareChat(c1, c2);
                })
                    .reverse()
                    .forEach(function (userSim) { return $("#page-payload").append((new UiWebphoneController_1.UiWebphoneController(userSim, wdInstances.get(userSim))).structure); });
                bootbox_custom.dismissLoading();
                localApiHandlers.evtSimPermissionLost.attachOnce(function (userSim) {
                    bootbox_custom.alert(userSim.ownership.ownerEmail + " revoked your access to " + userSim.friendlyName);
                    //TODO: Improve
                    location.reload();
                });
                remoteApiCaller.evtUsableSim.attach(function (userSim) { return __awaiter(_this, void 0, void 0, function () {
                    var _a, _b, _c, _d;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                _b = (_a = $("#page-payload")).append;
                                _c = UiWebphoneController_1.UiWebphoneController.bind;
                                _d = [void 0, userSim];
                                return [4 /*yield*/, remoteApiCaller.getOrCreateWdInstance(userSim)];
                            case 1: return [2 /*return*/, _b.apply(_a, [(new (_c.apply(UiWebphoneController_1.UiWebphoneController, _d.concat([_e.sent()])))()).structure])];
                        }
                    });
                }); });
                return [2 /*return*/];
        }
    });
}); });

},{"../../../shared/dist/lib/Ua":136,"../../../shared/dist/lib/toBackend/connection":139,"../../../shared/dist/lib/toBackend/localApiHandlers":140,"../../../shared/dist/lib/toBackend/remoteApiCaller":141,"../../../shared/dist/lib/tools/bootbox_custom":142,"../../../shared/dist/lib/tools/standalonePolyfills":145,"../../../shared/dist/lib/types":146,"../../../shared/dist/lib/webApiCaller":147,"./UiWebphoneController":14,"array.prototype.find":17,"es6-map/implement":90,"es6-weak-map/implement":101}],16:[function(require,module,exports){
'use strict';

var ES = require('es-abstract/es6');

module.exports = function find(predicate) {
	var list = ES.ToObject(this);
	var length = ES.ToInteger(ES.ToLength(list.length));
	if (!ES.IsCallable(predicate)) {
		throw new TypeError('Array#find: predicate must be a function');
	}
	if (length === 0) {
		return undefined;
	}
	var thisArg = arguments[1];
	for (var i = 0, value; i < length; i++) {
		value = list[i];
		if (ES.Call(predicate, thisArg, [value, i, list])) {
			return value;
		}
	}
	return undefined;
};

},{"es-abstract/es6":27}],17:[function(require,module,exports){
'use strict';

var define = require('define-properties');
var ES = require('es-abstract/es6');

var implementation = require('./implementation');
var getPolyfill = require('./polyfill');
var shim = require('./shim');

var slice = Array.prototype.slice;

var polyfill = getPolyfill();

var boundFindShim = function find(array, predicate) { // eslint-disable-line no-unused-vars
	ES.RequireObjectCoercible(array);
	var args = slice.call(arguments, 1);
	return polyfill.apply(array, args);
};

define(boundFindShim, {
	getPolyfill: getPolyfill,
	implementation: implementation,
	shim: shim
});

module.exports = boundFindShim;

},{"./implementation":16,"./polyfill":18,"./shim":19,"define-properties":23,"es-abstract/es6":27}],18:[function(require,module,exports){
'use strict';

module.exports = function getPolyfill() {
	// Detect if an implementation exists
	// Detect early implementations which skipped holes in sparse arrays
  // eslint-disable-next-line no-sparse-arrays
	var implemented = Array.prototype.find && [, 1].find(function () {
		return true;
	}) !== 1;

  // eslint-disable-next-line global-require
	return implemented ? Array.prototype.find : require('./implementation');
};

},{"./implementation":16}],19:[function(require,module,exports){
'use strict';

var define = require('define-properties');
var getPolyfill = require('./polyfill');

module.exports = function shimArrayPrototypeFind() {
	var polyfill = getPolyfill();

	define(Array.prototype, { find: polyfill }, {
		find: function () {
			return Array.prototype.find !== polyfill;
		}
	});

	return polyfill;
};

},{"./polyfill":18,"define-properties":23}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
'use strict';

var copy             = require('es5-ext/object/copy')
  , normalizeOptions = require('es5-ext/object/normalize-options')
  , ensureCallable   = require('es5-ext/object/valid-callable')
  , map              = require('es5-ext/object/map')
  , callable         = require('es5-ext/object/valid-callable')
  , validValue       = require('es5-ext/object/valid-value')

  , bind = Function.prototype.bind, defineProperty = Object.defineProperty
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , define;

define = function (name, desc, options) {
	var value = validValue(desc) && callable(desc.value), dgs;
	dgs = copy(desc);
	delete dgs.writable;
	delete dgs.value;
	dgs.get = function () {
		if (!options.overwriteDefinition && hasOwnProperty.call(this, name)) return value;
		desc.value = bind.call(value, options.resolveContext ? options.resolveContext(this) : this);
		defineProperty(this, name, desc);
		return this[name];
	};
	return dgs;
};

module.exports = function (props/*, options*/) {
	var options = normalizeOptions(arguments[1]);
	if (options.resolveContext != null) ensureCallable(options.resolveContext);
	return map(props, function (desc, name) { return define(name, desc, options); });
};

},{"es5-ext/object/copy":60,"es5-ext/object/map":69,"es5-ext/object/normalize-options":70,"es5-ext/object/valid-callable":75,"es5-ext/object/valid-value":77}],22:[function(require,module,exports){
'use strict';

var assign        = require('es5-ext/object/assign')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , isCallable    = require('es5-ext/object/is-callable')
  , contains      = require('es5-ext/string/#/contains')

  , d;

d = module.exports = function (dscr, value/*, options*/) {
	var c, e, w, options, desc;
	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
		options = value;
		value = dscr;
		dscr = null;
	} else {
		options = arguments[2];
	}
	if (dscr == null) {
		c = w = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
		w = contains.call(dscr, 'w');
	}

	desc = { value: value, configurable: c, enumerable: e, writable: w };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

d.gs = function (dscr, get, set/*, options*/) {
	var c, e, options, desc;
	if (typeof dscr !== 'string') {
		options = set;
		set = get;
		get = dscr;
		dscr = null;
	} else {
		options = arguments[3];
	}
	if (get == null) {
		get = undefined;
	} else if (!isCallable(get)) {
		options = get;
		get = set = undefined;
	} else if (set == null) {
		set = undefined;
	} else if (!isCallable(set)) {
		options = set;
		set = undefined;
	}
	if (dscr == null) {
		c = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
	}

	desc = { get: get, set: set, configurable: c, enumerable: e };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

},{"es5-ext/object/assign":57,"es5-ext/object/is-callable":63,"es5-ext/object/normalize-options":70,"es5-ext/string/#/contains":78}],23:[function(require,module,exports){
'use strict';

var keys = require('object-keys');
var hasSymbols = typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol';

var toStr = Object.prototype.toString;
var concat = Array.prototype.concat;
var origDefineProperty = Object.defineProperty;

var isFunction = function (fn) {
	return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
};

var arePropertyDescriptorsSupported = function () {
	var obj = {};
	try {
		origDefineProperty(obj, 'x', { enumerable: false, value: obj });
		// eslint-disable-next-line no-unused-vars, no-restricted-syntax
		for (var _ in obj) { // jscs:ignore disallowUnusedVariables
			return false;
		}
		return obj.x === obj;
	} catch (e) { /* this is IE 8. */
		return false;
	}
};
var supportsDescriptors = origDefineProperty && arePropertyDescriptorsSupported();

var defineProperty = function (object, name, value, predicate) {
	if (name in object && (!isFunction(predicate) || !predicate())) {
		return;
	}
	if (supportsDescriptors) {
		origDefineProperty(object, name, {
			configurable: true,
			enumerable: false,
			value: value,
			writable: true
		});
	} else {
		object[name] = value;
	}
};

var defineProperties = function (object, map) {
	var predicates = arguments.length > 2 ? arguments[2] : {};
	var props = keys(map);
	if (hasSymbols) {
		props = concat.call(props, Object.getOwnPropertySymbols(map));
	}
	for (var i = 0; i < props.length; i += 1) {
		defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
	}
};

defineProperties.supportsDescriptors = !!supportsDescriptors;

module.exports = defineProperties;

},{"object-keys":118}],24:[function(require,module,exports){
'use strict';

/* globals
	Set,
	Map,
	WeakSet,
	WeakMap,

	Promise,

	Symbol,
	Proxy,

	Atomics,
	SharedArrayBuffer,

	ArrayBuffer,
	DataView,
	Uint8Array,
	Float32Array,
	Float64Array,
	Int8Array,
	Int16Array,
	Int32Array,
	Uint8ClampedArray,
	Uint16Array,
	Uint32Array,
*/

var undefined; // eslint-disable-line no-shadow-restricted-names

var ThrowTypeError = Object.getOwnPropertyDescriptor
	? (function () { return Object.getOwnPropertyDescriptor(arguments, 'callee').get; }())
	: function () { throw new TypeError(); };

var hasSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol';

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var generator; // = function * () {};
var generatorFunction = generator ? getProto(generator) : undefined;
var asyncFn; // async function() {};
var asyncFunction = asyncFn ? asyncFn.constructor : undefined;
var asyncGen; // async function * () {};
var asyncGenFunction = asyncGen ? getProto(asyncGen) : undefined;
var asyncGenIterator = asyncGen ? asyncGen() : undefined;

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'$ %Array%': Array,
	'$ %ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'$ %ArrayBufferPrototype%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer.prototype,
	'$ %ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'$ %ArrayPrototype%': Array.prototype,
	'$ %ArrayProto_entries%': Array.prototype.entries,
	'$ %ArrayProto_forEach%': Array.prototype.forEach,
	'$ %ArrayProto_keys%': Array.prototype.keys,
	'$ %ArrayProto_values%': Array.prototype.values,
	'$ %AsyncFromSyncIteratorPrototype%': undefined,
	'$ %AsyncFunction%': asyncFunction,
	'$ %AsyncFunctionPrototype%': asyncFunction ? asyncFunction.prototype : undefined,
	'$ %AsyncGenerator%': asyncGen ? getProto(asyncGenIterator) : undefined,
	'$ %AsyncGeneratorFunction%': asyncGenFunction,
	'$ %AsyncGeneratorPrototype%': asyncGenFunction ? asyncGenFunction.prototype : undefined,
	'$ %AsyncIteratorPrototype%': asyncGenIterator && hasSymbols && Symbol.asyncIterator ? asyncGenIterator[Symbol.asyncIterator]() : undefined,
	'$ %Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'$ %Boolean%': Boolean,
	'$ %BooleanPrototype%': Boolean.prototype,
	'$ %DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'$ %DataViewPrototype%': typeof DataView === 'undefined' ? undefined : DataView.prototype,
	'$ %Date%': Date,
	'$ %DatePrototype%': Date.prototype,
	'$ %decodeURI%': decodeURI,
	'$ %decodeURIComponent%': decodeURIComponent,
	'$ %encodeURI%': encodeURI,
	'$ %encodeURIComponent%': encodeURIComponent,
	'$ %Error%': Error,
	'$ %ErrorPrototype%': Error.prototype,
	'$ %eval%': eval, // eslint-disable-line no-eval
	'$ %EvalError%': EvalError,
	'$ %EvalErrorPrototype%': EvalError.prototype,
	'$ %Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'$ %Float32ArrayPrototype%': typeof Float32Array === 'undefined' ? undefined : Float32Array.prototype,
	'$ %Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'$ %Float64ArrayPrototype%': typeof Float64Array === 'undefined' ? undefined : Float64Array.prototype,
	'$ %Function%': Function,
	'$ %FunctionPrototype%': Function.prototype,
	'$ %Generator%': generator ? getProto(generator()) : undefined,
	'$ %GeneratorFunction%': generatorFunction,
	'$ %GeneratorPrototype%': generatorFunction ? generatorFunction.prototype : undefined,
	'$ %Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'$ %Int8ArrayPrototype%': typeof Int8Array === 'undefined' ? undefined : Int8Array.prototype,
	'$ %Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'$ %Int16ArrayPrototype%': typeof Int16Array === 'undefined' ? undefined : Int8Array.prototype,
	'$ %Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'$ %Int32ArrayPrototype%': typeof Int32Array === 'undefined' ? undefined : Int32Array.prototype,
	'$ %isFinite%': isFinite,
	'$ %isNaN%': isNaN,
	'$ %IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'$ %JSON%': JSON,
	'$ %JSONParse%': JSON.parse,
	'$ %Map%': typeof Map === 'undefined' ? undefined : Map,
	'$ %MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'$ %MapPrototype%': typeof Map === 'undefined' ? undefined : Map.prototype,
	'$ %Math%': Math,
	'$ %Number%': Number,
	'$ %NumberPrototype%': Number.prototype,
	'$ %Object%': Object,
	'$ %ObjectPrototype%': Object.prototype,
	'$ %ObjProto_toString%': Object.prototype.toString,
	'$ %ObjProto_valueOf%': Object.prototype.valueOf,
	'$ %parseFloat%': parseFloat,
	'$ %parseInt%': parseInt,
	'$ %Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'$ %PromisePrototype%': typeof Promise === 'undefined' ? undefined : Promise.prototype,
	'$ %PromiseProto_then%': typeof Promise === 'undefined' ? undefined : Promise.prototype.then,
	'$ %Promise_all%': typeof Promise === 'undefined' ? undefined : Promise.all,
	'$ %Promise_reject%': typeof Promise === 'undefined' ? undefined : Promise.reject,
	'$ %Promise_resolve%': typeof Promise === 'undefined' ? undefined : Promise.resolve,
	'$ %Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'$ %RangeError%': RangeError,
	'$ %RangeErrorPrototype%': RangeError.prototype,
	'$ %ReferenceError%': ReferenceError,
	'$ %ReferenceErrorPrototype%': ReferenceError.prototype,
	'$ %Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'$ %RegExp%': RegExp,
	'$ %RegExpPrototype%': RegExp.prototype,
	'$ %Set%': typeof Set === 'undefined' ? undefined : Set,
	'$ %SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'$ %SetPrototype%': typeof Set === 'undefined' ? undefined : Set.prototype,
	'$ %SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'$ %SharedArrayBufferPrototype%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer.prototype,
	'$ %String%': String,
	'$ %StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'$ %StringPrototype%': String.prototype,
	'$ %Symbol%': hasSymbols ? Symbol : undefined,
	'$ %SymbolPrototype%': hasSymbols ? Symbol.prototype : undefined,
	'$ %SyntaxError%': SyntaxError,
	'$ %SyntaxErrorPrototype%': SyntaxError.prototype,
	'$ %ThrowTypeError%': ThrowTypeError,
	'$ %TypedArray%': TypedArray,
	'$ %TypedArrayPrototype%': TypedArray ? TypedArray.prototype : undefined,
	'$ %TypeError%': TypeError,
	'$ %TypeErrorPrototype%': TypeError.prototype,
	'$ %Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'$ %Uint8ArrayPrototype%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array.prototype,
	'$ %Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'$ %Uint8ClampedArrayPrototype%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray.prototype,
	'$ %Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'$ %Uint16ArrayPrototype%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array.prototype,
	'$ %Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'$ %Uint32ArrayPrototype%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array.prototype,
	'$ %URIError%': URIError,
	'$ %URIErrorPrototype%': URIError.prototype,
	'$ %WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'$ %WeakMapPrototype%': typeof WeakMap === 'undefined' ? undefined : WeakMap.prototype,
	'$ %WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet,
	'$ %WeakSetPrototype%': typeof WeakSet === 'undefined' ? undefined : WeakSet.prototype
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new TypeError('"allowMissing" argument must be a boolean');
	}

	var key = '$ ' + name;
	if (!(key in INTRINSICS)) {
		throw new SyntaxError('intrinsic ' + name + ' does not exist!');
	}

	// istanbul ignore if // hopefully this is impossible to test :-)
	if (typeof INTRINSICS[key] === 'undefined' && !allowMissing) {
		throw new TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
	}
	return INTRINSICS[key];
};

},{}],25:[function(require,module,exports){
'use strict';

var has = require('has');
var toPrimitive = require('es-to-primitive/es6');
var keys = require('object-keys');

var GetIntrinsic = require('./GetIntrinsic');

var $TypeError = GetIntrinsic('%TypeError%');
var $SyntaxError = GetIntrinsic('%SyntaxError%');
var $Array = GetIntrinsic('%Array%');
var $String = GetIntrinsic('%String%');
var $Object = GetIntrinsic('%Object%');
var $Number = GetIntrinsic('%Number%');
var $Symbol = GetIntrinsic('%Symbol%', true);
var $RegExp = GetIntrinsic('%RegExp%');

var hasSymbols = !!$Symbol;

var assertRecord = require('./helpers/assertRecord');
var $isNaN = require('./helpers/isNaN');
var $isFinite = require('./helpers/isFinite');
var MAX_SAFE_INTEGER = $Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;

var assign = require('./helpers/assign');
var sign = require('./helpers/sign');
var mod = require('./helpers/mod');
var isPrimitive = require('./helpers/isPrimitive');
var parseInteger = parseInt;
var bind = require('function-bind');
var arraySlice = bind.call(Function.call, $Array.prototype.slice);
var strSlice = bind.call(Function.call, $String.prototype.slice);
var isBinary = bind.call(Function.call, $RegExp.prototype.test, /^0b[01]+$/i);
var isOctal = bind.call(Function.call, $RegExp.prototype.test, /^0o[0-7]+$/i);
var regexExec = bind.call(Function.call, $RegExp.prototype.exec);
var nonWS = ['\u0085', '\u200b', '\ufffe'].join('');
var nonWSregex = new $RegExp('[' + nonWS + ']', 'g');
var hasNonWS = bind.call(Function.call, $RegExp.prototype.test, nonWSregex);
var invalidHexLiteral = /^[-+]0x[0-9a-f]+$/i;
var isInvalidHexLiteral = bind.call(Function.call, $RegExp.prototype.test, invalidHexLiteral);
var $charCodeAt = bind.call(Function.call, $String.prototype.charCodeAt);

var toStr = bind.call(Function.call, Object.prototype.toString);

var $NumberValueOf = bind.call(Function.call, GetIntrinsic('%NumberPrototype%').valueOf);
var $BooleanValueOf = bind.call(Function.call, GetIntrinsic('%BooleanPrototype%').valueOf);
var $StringValueOf = bind.call(Function.call, GetIntrinsic('%StringPrototype%').valueOf);
var $DateValueOf = bind.call(Function.call, GetIntrinsic('%DatePrototype%').valueOf);

var $floor = Math.floor;
var $abs = Math.abs;

var $ObjectCreate = Object.create;
var $gOPD = $Object.getOwnPropertyDescriptor;

var $isExtensible = $Object.isExtensible;

var $defineProperty = $Object.defineProperty;

// whitespace from: http://es5.github.io/#x15.5.4.20
// implementation from https://github.com/es-shims/es5-shim/blob/v3.4.0/es5-shim.js#L1304-L1324
var ws = [
	'\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003',
	'\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028',
	'\u2029\uFEFF'
].join('');
var trimRegex = new RegExp('(^[' + ws + ']+)|([' + ws + ']+$)', 'g');
var replace = bind.call(Function.call, $String.prototype.replace);
var trim = function (value) {
	return replace(value, trimRegex, '');
};

var ES5 = require('./es5');

var hasRegExpMatcher = require('is-regex');

// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-abstract-operations
var ES6 = assign(assign({}, ES5), {

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-call-f-v-args
	Call: function Call(F, V) {
		var args = arguments.length > 2 ? arguments[2] : [];
		if (!this.IsCallable(F)) {
			throw new $TypeError(F + ' is not a function');
		}
		return F.apply(V, args);
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toprimitive
	ToPrimitive: toPrimitive,

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toboolean
	// ToBoolean: ES5.ToBoolean,

	// https://ecma-international.org/ecma-262/6.0/#sec-tonumber
	ToNumber: function ToNumber(argument) {
		var value = isPrimitive(argument) ? argument : toPrimitive(argument, $Number);
		if (typeof value === 'symbol') {
			throw new $TypeError('Cannot convert a Symbol value to a number');
		}
		if (typeof value === 'string') {
			if (isBinary(value)) {
				return this.ToNumber(parseInteger(strSlice(value, 2), 2));
			} else if (isOctal(value)) {
				return this.ToNumber(parseInteger(strSlice(value, 2), 8));
			} else if (hasNonWS(value) || isInvalidHexLiteral(value)) {
				return NaN;
			} else {
				var trimmed = trim(value);
				if (trimmed !== value) {
					return this.ToNumber(trimmed);
				}
			}
		}
		return $Number(value);
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tointeger
	// ToInteger: ES5.ToNumber,

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint32
	// ToInt32: ES5.ToInt32,

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint32
	// ToUint32: ES5.ToUint32,

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint16
	ToInt16: function ToInt16(argument) {
		var int16bit = this.ToUint16(argument);
		return int16bit >= 0x8000 ? int16bit - 0x10000 : int16bit;
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint16
	// ToUint16: ES5.ToUint16,

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint8
	ToInt8: function ToInt8(argument) {
		var int8bit = this.ToUint8(argument);
		return int8bit >= 0x80 ? int8bit - 0x100 : int8bit;
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint8
	ToUint8: function ToUint8(argument) {
		var number = this.ToNumber(argument);
		if ($isNaN(number) || number === 0 || !$isFinite(number)) { return 0; }
		var posInt = sign(number) * $floor($abs(number));
		return mod(posInt, 0x100);
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint8clamp
	ToUint8Clamp: function ToUint8Clamp(argument) {
		var number = this.ToNumber(argument);
		if ($isNaN(number) || number <= 0) { return 0; }
		if (number >= 0xFF) { return 0xFF; }
		var f = $floor(argument);
		if (f + 0.5 < number) { return f + 1; }
		if (number < f + 0.5) { return f; }
		if (f % 2 !== 0) { return f + 1; }
		return f;
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tostring
	ToString: function ToString(argument) {
		if (typeof argument === 'symbol') {
			throw new $TypeError('Cannot convert a Symbol value to a string');
		}
		return $String(argument);
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toobject
	ToObject: function ToObject(value) {
		this.RequireObjectCoercible(value);
		return $Object(value);
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-topropertykey
	ToPropertyKey: function ToPropertyKey(argument) {
		var key = this.ToPrimitive(argument, $String);
		return typeof key === 'symbol' ? key : this.ToString(key);
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
	ToLength: function ToLength(argument) {
		var len = this.ToInteger(argument);
		if (len <= 0) { return 0; } // includes converting -0 to +0
		if (len > MAX_SAFE_INTEGER) { return MAX_SAFE_INTEGER; }
		return len;
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-canonicalnumericindexstring
	CanonicalNumericIndexString: function CanonicalNumericIndexString(argument) {
		if (toStr(argument) !== '[object String]') {
			throw new $TypeError('must be a string');
		}
		if (argument === '-0') { return -0; }
		var n = this.ToNumber(argument);
		if (this.SameValue(this.ToString(n), argument)) { return n; }
		return void 0;
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-requireobjectcoercible
	RequireObjectCoercible: ES5.CheckObjectCoercible,

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isarray
	IsArray: $Array.isArray || function IsArray(argument) {
		return toStr(argument) === '[object Array]';
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-iscallable
	// IsCallable: ES5.IsCallable,

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isconstructor
	IsConstructor: function IsConstructor(argument) {
		return typeof argument === 'function' && !!argument.prototype; // unfortunately there's no way to truly check this without try/catch `new argument`
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isextensible-o
	IsExtensible: Object.preventExtensions
		? function IsExtensible(obj) {
			if (isPrimitive(obj)) {
				return false;
			}
			return $isExtensible(obj);
		}
		: function isExtensible(obj) { return true; }, // eslint-disable-line no-unused-vars

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isinteger
	IsInteger: function IsInteger(argument) {
		if (typeof argument !== 'number' || $isNaN(argument) || !$isFinite(argument)) {
			return false;
		}
		var abs = $abs(argument);
		return $floor(abs) === abs;
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-ispropertykey
	IsPropertyKey: function IsPropertyKey(argument) {
		return typeof argument === 'string' || typeof argument === 'symbol';
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-isregexp
	IsRegExp: function IsRegExp(argument) {
		if (!argument || typeof argument !== 'object') {
			return false;
		}
		if (hasSymbols) {
			var isRegExp = argument[$Symbol.match];
			if (typeof isRegExp !== 'undefined') {
				return ES5.ToBoolean(isRegExp);
			}
		}
		return hasRegExpMatcher(argument);
	},

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevalue
	// SameValue: ES5.SameValue,

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero
	SameValueZero: function SameValueZero(x, y) {
		return (x === y) || ($isNaN(x) && $isNaN(y));
	},

	/**
	 * 7.3.2 GetV (V, P)
	 * 1. Assert: IsPropertyKey(P) is true.
	 * 2. Let O be ToObject(V).
	 * 3. ReturnIfAbrupt(O).
	 * 4. Return O.[[Get]](P, V).
	 */
	GetV: function GetV(V, P) {
		// 7.3.2.1
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true');
		}

		// 7.3.2.2-3
		var O = this.ToObject(V);

		// 7.3.2.4
		return O[P];
	},

	/**
	 * 7.3.9 - https://ecma-international.org/ecma-262/6.0/#sec-getmethod
	 * 1. Assert: IsPropertyKey(P) is true.
	 * 2. Let func be GetV(O, P).
	 * 3. ReturnIfAbrupt(func).
	 * 4. If func is either undefined or null, return undefined.
	 * 5. If IsCallable(func) is false, throw a TypeError exception.
	 * 6. Return func.
	 */
	GetMethod: function GetMethod(O, P) {
		// 7.3.9.1
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true');
		}

		// 7.3.9.2
		var func = this.GetV(O, P);

		// 7.3.9.4
		if (func == null) {
			return void 0;
		}

		// 7.3.9.5
		if (!this.IsCallable(func)) {
			throw new $TypeError(P + 'is not a function');
		}

		// 7.3.9.6
		return func;
	},

	/**
	 * 7.3.1 Get (O, P) - https://ecma-international.org/ecma-262/6.0/#sec-get-o-p
	 * 1. Assert: Type(O) is Object.
	 * 2. Assert: IsPropertyKey(P) is true.
	 * 3. Return O.[[Get]](P, O).
	 */
	Get: function Get(O, P) {
		// 7.3.1.1
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}
		// 7.3.1.2
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true');
		}
		// 7.3.1.3
		return O[P];
	},

	Type: function Type(x) {
		if (typeof x === 'symbol') {
			return 'Symbol';
		}
		return ES5.Type(x);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-speciesconstructor
	SpeciesConstructor: function SpeciesConstructor(O, defaultConstructor) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}
		var C = O.constructor;
		if (typeof C === 'undefined') {
			return defaultConstructor;
		}
		if (this.Type(C) !== 'Object') {
			throw new $TypeError('O.constructor is not an Object');
		}
		var S = hasSymbols && $Symbol.species ? C[$Symbol.species] : void 0;
		if (S == null) {
			return defaultConstructor;
		}
		if (this.IsConstructor(S)) {
			return S;
		}
		throw new $TypeError('no constructor found');
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-completepropertydescriptor
	CompletePropertyDescriptor: function CompletePropertyDescriptor(Desc) {
		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (this.IsGenericDescriptor(Desc) || this.IsDataDescriptor(Desc)) {
			if (!has(Desc, '[[Value]]')) {
				Desc['[[Value]]'] = void 0;
			}
			if (!has(Desc, '[[Writable]]')) {
				Desc['[[Writable]]'] = false;
			}
		} else {
			if (!has(Desc, '[[Get]]')) {
				Desc['[[Get]]'] = void 0;
			}
			if (!has(Desc, '[[Set]]')) {
				Desc['[[Set]]'] = void 0;
			}
		}
		if (!has(Desc, '[[Enumerable]]')) {
			Desc['[[Enumerable]]'] = false;
		}
		if (!has(Desc, '[[Configurable]]')) {
			Desc['[[Configurable]]'] = false;
		}
		return Desc;
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-set-o-p-v-throw
	Set: function Set(O, P, V, Throw) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('O must be an Object');
		}
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('P must be a Property Key');
		}
		if (this.Type(Throw) !== 'Boolean') {
			throw new $TypeError('Throw must be a Boolean');
		}
		if (Throw) {
			O[P] = V;
			return true;
		} else {
			try {
				O[P] = V;
			} catch (e) {
				return false;
			}
		}
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-hasownproperty
	HasOwnProperty: function HasOwnProperty(O, P) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('O must be an Object');
		}
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('P must be a Property Key');
		}
		return has(O, P);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-hasproperty
	HasProperty: function HasProperty(O, P) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('O must be an Object');
		}
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('P must be a Property Key');
		}
		return P in O;
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-isconcatspreadable
	IsConcatSpreadable: function IsConcatSpreadable(O) {
		if (this.Type(O) !== 'Object') {
			return false;
		}
		if (hasSymbols && typeof $Symbol.isConcatSpreadable === 'symbol') {
			var spreadable = this.Get(O, Symbol.isConcatSpreadable);
			if (typeof spreadable !== 'undefined') {
				return this.ToBoolean(spreadable);
			}
		}
		return this.IsArray(O);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-invoke
	Invoke: function Invoke(O, P) {
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('P must be a Property Key');
		}
		var argumentsList = arraySlice(arguments, 2);
		var func = this.GetV(O, P);
		return this.Call(func, O, argumentsList);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-getiterator
	GetIterator: function GetIterator(obj, method) {
		if (!hasSymbols) {
			throw new SyntaxError('ES.GetIterator depends on native iterator support.');
		}

		var actualMethod = method;
		if (arguments.length < 2) {
			actualMethod = this.GetMethod(obj, $Symbol.iterator);
		}
		var iterator = this.Call(actualMethod, obj);
		if (this.Type(iterator) !== 'Object') {
			throw new $TypeError('iterator must return an object');
		}

		return iterator;
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-iteratornext
	IteratorNext: function IteratorNext(iterator, value) {
		var result = this.Invoke(iterator, 'next', arguments.length < 2 ? [] : [value]);
		if (this.Type(result) !== 'Object') {
			throw new $TypeError('iterator next must return an object');
		}
		return result;
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-iteratorcomplete
	IteratorComplete: function IteratorComplete(iterResult) {
		if (this.Type(iterResult) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(iterResult) is not Object');
		}
		return this.ToBoolean(this.Get(iterResult, 'done'));
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-iteratorvalue
	IteratorValue: function IteratorValue(iterResult) {
		if (this.Type(iterResult) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(iterResult) is not Object');
		}
		return this.Get(iterResult, 'value');
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-iteratorstep
	IteratorStep: function IteratorStep(iterator) {
		var result = this.IteratorNext(iterator);
		var done = this.IteratorComplete(result);
		return done === true ? false : result;
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-iteratorclose
	IteratorClose: function IteratorClose(iterator, completion) {
		if (this.Type(iterator) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(iterator) is not Object');
		}
		if (!this.IsCallable(completion)) {
			throw new $TypeError('Assertion failed: completion is not a thunk for a Completion Record');
		}
		var completionThunk = completion;

		var iteratorReturn = this.GetMethod(iterator, 'return');

		if (typeof iteratorReturn === 'undefined') {
			return completionThunk();
		}

		var completionRecord;
		try {
			var innerResult = this.Call(iteratorReturn, iterator, []);
		} catch (e) {
			// if we hit here, then "e" is the innerResult completion that needs re-throwing

			// if the completion is of type "throw", this will throw.
			completionRecord = completionThunk();
			completionThunk = null; // ensure it's not called twice.

			// if not, then return the innerResult completion
			throw e;
		}
		completionRecord = completionThunk(); // if innerResult worked, then throw if the completion does
		completionThunk = null; // ensure it's not called twice.

		if (this.Type(innerResult) !== 'Object') {
			throw new $TypeError('iterator .return must return an object');
		}

		return completionRecord;
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-createiterresultobject
	CreateIterResultObject: function CreateIterResultObject(value, done) {
		if (this.Type(done) !== 'Boolean') {
			throw new $TypeError('Assertion failed: Type(done) is not Boolean');
		}
		return {
			value: value,
			done: done
		};
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-regexpexec
	RegExpExec: function RegExpExec(R, S) {
		if (this.Type(R) !== 'Object') {
			throw new $TypeError('R must be an Object');
		}
		if (this.Type(S) !== 'String') {
			throw new $TypeError('S must be a String');
		}
		var exec = this.Get(R, 'exec');
		if (this.IsCallable(exec)) {
			var result = this.Call(exec, R, [S]);
			if (result === null || this.Type(result) === 'Object') {
				return result;
			}
			throw new $TypeError('"exec" method must return `null` or an Object');
		}
		return regexExec(R, S);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-arrayspeciescreate
	ArraySpeciesCreate: function ArraySpeciesCreate(originalArray, length) {
		if (!this.IsInteger(length) || length < 0) {
			throw new $TypeError('Assertion failed: length must be an integer >= 0');
		}
		var len = length === 0 ? 0 : length;
		var C;
		var isArray = this.IsArray(originalArray);
		if (isArray) {
			C = this.Get(originalArray, 'constructor');
			// TODO: figure out how to make a cross-realm normal Array, a same-realm Array
			// if (this.IsConstructor(C)) {
			// 	if C is another realm's Array, C = undefined
			// 	Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(Array))) === null ?
			// }
			if (this.Type(C) === 'Object' && hasSymbols && $Symbol.species) {
				C = this.Get(C, $Symbol.species);
				if (C === null) {
					C = void 0;
				}
			}
		}
		if (typeof C === 'undefined') {
			return $Array(len);
		}
		if (!this.IsConstructor(C)) {
			throw new $TypeError('C must be a constructor');
		}
		return new C(len); // this.Construct(C, len);
	},

	CreateDataProperty: function CreateDataProperty(O, P, V) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true');
		}
		var oldDesc = $gOPD(O, P);
		var extensible = oldDesc || (typeof $isExtensible !== 'function' || $isExtensible(O));
		var immutable = oldDesc && (!oldDesc.writable || !oldDesc.configurable);
		if (immutable || !extensible) {
			return false;
		}
		var newDesc = {
			configurable: true,
			enumerable: true,
			value: V,
			writable: true
		};
		$defineProperty(O, P, newDesc);
		return true;
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-createdatapropertyorthrow
	CreateDataPropertyOrThrow: function CreateDataPropertyOrThrow(O, P, V) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}
		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true');
		}
		var success = this.CreateDataProperty(O, P, V);
		if (!success) {
			throw new $TypeError('unable to create data property');
		}
		return success;
	},

	// https://www.ecma-international.org/ecma-262/6.0/#sec-objectcreate
	ObjectCreate: function ObjectCreate(proto, internalSlotsList) {
		if (proto !== null && this.Type(proto) !== 'Object') {
			throw new $TypeError('Assertion failed: proto must be null or an object');
		}
		var slots = arguments.length < 2 ? [] : internalSlotsList;
		if (slots.length > 0) {
			throw new $SyntaxError('es-abstract does not yet support internal slots');
		}

		if (proto === null && !$ObjectCreate) {
			throw new $SyntaxError('native Object.create support is required to create null objects');
		}

		return $ObjectCreate(proto);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-advancestringindex
	AdvanceStringIndex: function AdvanceStringIndex(S, index, unicode) {
		if (this.Type(S) !== 'String') {
			throw new $TypeError('S must be a String');
		}
		if (!this.IsInteger(index) || index < 0 || index > MAX_SAFE_INTEGER) {
			throw new $TypeError('Assertion failed: length must be an integer >= 0 and <= 2**53');
		}
		if (this.Type(unicode) !== 'Boolean') {
			throw new $TypeError('Assertion failed: unicode must be a Boolean');
		}
		if (!unicode) {
			return index + 1;
		}
		var length = S.length;
		if ((index + 1) >= length) {
			return index + 1;
		}

		var first = $charCodeAt(S, index);
		if (first < 0xD800 || first > 0xDBFF) {
			return index + 1;
		}

		var second = $charCodeAt(S, index + 1);
		if (second < 0xDC00 || second > 0xDFFF) {
			return index + 1;
		}

		return index + 2;
	},

	// https://www.ecma-international.org/ecma-262/6.0/#sec-createmethodproperty
	CreateMethodProperty: function CreateMethodProperty(O, P, V) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}

		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true');
		}

		var newDesc = {
			configurable: true,
			enumerable: false,
			value: V,
			writable: true
		};
		return !!$defineProperty(O, P, newDesc);
	},

	// https://www.ecma-international.org/ecma-262/6.0/#sec-definepropertyorthrow
	DefinePropertyOrThrow: function DefinePropertyOrThrow(O, P, desc) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}

		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true');
		}

		return !!$defineProperty(O, P, desc);
	},

	// https://www.ecma-international.org/ecma-262/6.0/#sec-deletepropertyorthrow
	DeletePropertyOrThrow: function DeletePropertyOrThrow(O, P) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}

		if (!this.IsPropertyKey(P)) {
			throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true');
		}

		var success = delete O[P];
		if (!success) {
			throw new TypeError('Attempt to delete property failed.');
		}
		return success;
	},

	// https://www.ecma-international.org/ecma-262/6.0/#sec-enumerableownnames
	EnumerableOwnNames: function EnumerableOwnNames(O) {
		if (this.Type(O) !== 'Object') {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}

		return keys(O);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-properties-of-the-number-prototype-object
	thisNumberValue: function thisNumberValue(value) {
		if (this.Type(value) === 'Number') {
			return value;
		}

		return $NumberValueOf(value);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-properties-of-the-boolean-prototype-object
	thisBooleanValue: function thisBooleanValue(value) {
		if (this.Type(value) === 'Boolean') {
			return value;
		}

		return $BooleanValueOf(value);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-properties-of-the-string-prototype-object
	thisStringValue: function thisStringValue(value) {
		if (this.Type(value) === 'String') {
			return value;
		}

		return $StringValueOf(value);
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-properties-of-the-date-prototype-object
	thisTimeValue: function thisTimeValue(value) {
		return $DateValueOf(value);
	}
});

delete ES6.CheckObjectCoercible; // renamed in ES6 to RequireObjectCoercible

module.exports = ES6;

},{"./GetIntrinsic":24,"./es5":26,"./helpers/assertRecord":28,"./helpers/assign":29,"./helpers/isFinite":30,"./helpers/isNaN":31,"./helpers/isPrimitive":32,"./helpers/mod":33,"./helpers/sign":34,"es-to-primitive/es6":37,"function-bind":107,"has":110,"is-regex":113,"object-keys":118}],26:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('./GetIntrinsic');

var $Object = GetIntrinsic('%Object%');
var $TypeError = GetIntrinsic('%TypeError%');
var $String = GetIntrinsic('%String%');

var assertRecord = require('./helpers/assertRecord');
var $isNaN = require('./helpers/isNaN');
var $isFinite = require('./helpers/isFinite');

var sign = require('./helpers/sign');
var mod = require('./helpers/mod');

var IsCallable = require('is-callable');
var toPrimitive = require('es-to-primitive/es5');

var has = require('has');

// https://es5.github.io/#x9
var ES5 = {
	ToPrimitive: toPrimitive,

	ToBoolean: function ToBoolean(value) {
		return !!value;
	},
	ToNumber: function ToNumber(value) {
		return +value; // eslint-disable-line no-implicit-coercion
	},
	ToInteger: function ToInteger(value) {
		var number = this.ToNumber(value);
		if ($isNaN(number)) { return 0; }
		if (number === 0 || !$isFinite(number)) { return number; }
		return sign(number) * Math.floor(Math.abs(number));
	},
	ToInt32: function ToInt32(x) {
		return this.ToNumber(x) >> 0;
	},
	ToUint32: function ToUint32(x) {
		return this.ToNumber(x) >>> 0;
	},
	ToUint16: function ToUint16(value) {
		var number = this.ToNumber(value);
		if ($isNaN(number) || number === 0 || !$isFinite(number)) { return 0; }
		var posInt = sign(number) * Math.floor(Math.abs(number));
		return mod(posInt, 0x10000);
	},
	ToString: function ToString(value) {
		return $String(value);
	},
	ToObject: function ToObject(value) {
		this.CheckObjectCoercible(value);
		return $Object(value);
	},
	CheckObjectCoercible: function CheckObjectCoercible(value, optMessage) {
		/* jshint eqnull:true */
		if (value == null) {
			throw new $TypeError(optMessage || 'Cannot call method on ' + value);
		}
		return value;
	},
	IsCallable: IsCallable,
	SameValue: function SameValue(x, y) {
		if (x === y) { // 0 === -0, but they are not identical.
			if (x === 0) { return 1 / x === 1 / y; }
			return true;
		}
		return $isNaN(x) && $isNaN(y);
	},

	// https://www.ecma-international.org/ecma-262/5.1/#sec-8
	Type: function Type(x) {
		if (x === null) {
			return 'Null';
		}
		if (typeof x === 'undefined') {
			return 'Undefined';
		}
		if (typeof x === 'function' || typeof x === 'object') {
			return 'Object';
		}
		if (typeof x === 'number') {
			return 'Number';
		}
		if (typeof x === 'boolean') {
			return 'Boolean';
		}
		if (typeof x === 'string') {
			return 'String';
		}
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-property-descriptor-specification-type
	IsPropertyDescriptor: function IsPropertyDescriptor(Desc) {
		if (this.Type(Desc) !== 'Object') {
			return false;
		}
		var allowed = {
			'[[Configurable]]': true,
			'[[Enumerable]]': true,
			'[[Get]]': true,
			'[[Set]]': true,
			'[[Value]]': true,
			'[[Writable]]': true
		};

		for (var key in Desc) { // eslint-disable-line
			if (has(Desc, key) && !allowed[key]) {
				return false;
			}
		}

		var isData = has(Desc, '[[Value]]');
		var IsAccessor = has(Desc, '[[Get]]') || has(Desc, '[[Set]]');
		if (isData && IsAccessor) {
			throw new $TypeError('Property Descriptors may not be both accessor and data descriptors');
		}
		return true;
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.1
	IsAccessorDescriptor: function IsAccessorDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (!has(Desc, '[[Get]]') && !has(Desc, '[[Set]]')) {
			return false;
		}

		return true;
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.2
	IsDataDescriptor: function IsDataDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (!has(Desc, '[[Value]]') && !has(Desc, '[[Writable]]')) {
			return false;
		}

		return true;
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.3
	IsGenericDescriptor: function IsGenericDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (!this.IsAccessorDescriptor(Desc) && !this.IsDataDescriptor(Desc)) {
			return true;
		}

		return false;
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.4
	FromPropertyDescriptor: function FromPropertyDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return Desc;
		}

		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (this.IsDataDescriptor(Desc)) {
			return {
				value: Desc['[[Value]]'],
				writable: !!Desc['[[Writable]]'],
				enumerable: !!Desc['[[Enumerable]]'],
				configurable: !!Desc['[[Configurable]]']
			};
		} else if (this.IsAccessorDescriptor(Desc)) {
			return {
				get: Desc['[[Get]]'],
				set: Desc['[[Set]]'],
				enumerable: !!Desc['[[Enumerable]]'],
				configurable: !!Desc['[[Configurable]]']
			};
		} else {
			throw new $TypeError('FromPropertyDescriptor must be called with a fully populated Property Descriptor');
		}
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.5
	ToPropertyDescriptor: function ToPropertyDescriptor(Obj) {
		if (this.Type(Obj) !== 'Object') {
			throw new $TypeError('ToPropertyDescriptor requires an object');
		}

		var desc = {};
		if (has(Obj, 'enumerable')) {
			desc['[[Enumerable]]'] = this.ToBoolean(Obj.enumerable);
		}
		if (has(Obj, 'configurable')) {
			desc['[[Configurable]]'] = this.ToBoolean(Obj.configurable);
		}
		if (has(Obj, 'value')) {
			desc['[[Value]]'] = Obj.value;
		}
		if (has(Obj, 'writable')) {
			desc['[[Writable]]'] = this.ToBoolean(Obj.writable);
		}
		if (has(Obj, 'get')) {
			var getter = Obj.get;
			if (typeof getter !== 'undefined' && !this.IsCallable(getter)) {
				throw new TypeError('getter must be a function');
			}
			desc['[[Get]]'] = getter;
		}
		if (has(Obj, 'set')) {
			var setter = Obj.set;
			if (typeof setter !== 'undefined' && !this.IsCallable(setter)) {
				throw new $TypeError('setter must be a function');
			}
			desc['[[Set]]'] = setter;
		}

		if ((has(desc, '[[Get]]') || has(desc, '[[Set]]')) && (has(desc, '[[Value]]') || has(desc, '[[Writable]]'))) {
			throw new $TypeError('Invalid property descriptor. Cannot both specify accessors and a value or writable attribute');
		}
		return desc;
	}
};

module.exports = ES5;

},{"./GetIntrinsic":24,"./helpers/assertRecord":28,"./helpers/isFinite":30,"./helpers/isNaN":31,"./helpers/mod":33,"./helpers/sign":34,"es-to-primitive/es5":36,"has":110,"is-callable":111}],27:[function(require,module,exports){
'use strict';

module.exports = require('./es2015');

},{"./es2015":25}],28:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('../GetIntrinsic');

var $TypeError = GetIntrinsic('%TypeError%');
var $SyntaxError = GetIntrinsic('%SyntaxError%');

var has = require('has');

var predicates = {
  // https://ecma-international.org/ecma-262/6.0/#sec-property-descriptor-specification-type
  'Property Descriptor': function isPropertyDescriptor(ES, Desc) {
    if (ES.Type(Desc) !== 'Object') {
      return false;
    }
    var allowed = {
      '[[Configurable]]': true,
      '[[Enumerable]]': true,
      '[[Get]]': true,
      '[[Set]]': true,
      '[[Value]]': true,
      '[[Writable]]': true
    };

    for (var key in Desc) { // eslint-disable-line
      if (has(Desc, key) && !allowed[key]) {
        return false;
      }
    }

    var isData = has(Desc, '[[Value]]');
    var IsAccessor = has(Desc, '[[Get]]') || has(Desc, '[[Set]]');
    if (isData && IsAccessor) {
      throw new $TypeError('Property Descriptors may not be both accessor and data descriptors');
    }
    return true;
  }
};

module.exports = function assertRecord(ES, recordType, argumentName, value) {
  var predicate = predicates[recordType];
  if (typeof predicate !== 'function') {
    throw new $SyntaxError('unknown record type: ' + recordType);
  }
  if (!predicate(ES, value)) {
    throw new $TypeError(argumentName + ' must be a ' + recordType);
  }
  console.log(predicate(ES, value), value);
};

},{"../GetIntrinsic":24,"has":110}],29:[function(require,module,exports){
var bind = require('function-bind');
var has = bind.call(Function.call, Object.prototype.hasOwnProperty);

var $assign = Object.assign;

module.exports = function assign(target, source) {
	if ($assign) {
		return $assign(target, source);
	}

	for (var key in source) {
		if (has(source, key)) {
			target[key] = source[key];
		}
	}
	return target;
};

},{"function-bind":107}],30:[function(require,module,exports){
var $isNaN = Number.isNaN || function (a) { return a !== a; };

module.exports = Number.isFinite || function (x) { return typeof x === 'number' && !$isNaN(x) && x !== Infinity && x !== -Infinity; };

},{}],31:[function(require,module,exports){
module.exports = Number.isNaN || function isNaN(a) {
	return a !== a;
};

},{}],32:[function(require,module,exports){
module.exports = function isPrimitive(value) {
	return value === null || (typeof value !== 'function' && typeof value !== 'object');
};

},{}],33:[function(require,module,exports){
module.exports = function mod(number, modulo) {
	var remain = number % modulo;
	return Math.floor(remain >= 0 ? remain : remain + modulo);
};

},{}],34:[function(require,module,exports){
module.exports = function sign(number) {
	return number >= 0 ? 1 : -1;
};

},{}],35:[function(require,module,exports){
'use strict';

var hasSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol';

var isPrimitive = require('./helpers/isPrimitive');
var isCallable = require('is-callable');
var isDate = require('is-date-object');
var isSymbol = require('is-symbol');

var ordinaryToPrimitive = function OrdinaryToPrimitive(O, hint) {
	if (typeof O === 'undefined' || O === null) {
		throw new TypeError('Cannot call method on ' + O);
	}
	if (typeof hint !== 'string' || (hint !== 'number' && hint !== 'string')) {
		throw new TypeError('hint must be "string" or "number"');
	}
	var methodNames = hint === 'string' ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
	var method, result, i;
	for (i = 0; i < methodNames.length; ++i) {
		method = O[methodNames[i]];
		if (isCallable(method)) {
			result = method.call(O);
			if (isPrimitive(result)) {
				return result;
			}
		}
	}
	throw new TypeError('No default value');
};

var GetMethod = function GetMethod(O, P) {
	var func = O[P];
	if (func !== null && typeof func !== 'undefined') {
		if (!isCallable(func)) {
			throw new TypeError(func + ' returned for property ' + P + ' of object ' + O + ' is not a function');
		}
		return func;
	}
	return void 0;
};

// http://www.ecma-international.org/ecma-262/6.0/#sec-toprimitive
module.exports = function ToPrimitive(input) {
	if (isPrimitive(input)) {
		return input;
	}
	var hint = 'default';
	if (arguments.length > 1) {
		if (arguments[1] === String) {
			hint = 'string';
		} else if (arguments[1] === Number) {
			hint = 'number';
		}
	}

	var exoticToPrim;
	if (hasSymbols) {
		if (Symbol.toPrimitive) {
			exoticToPrim = GetMethod(input, Symbol.toPrimitive);
		} else if (isSymbol(input)) {
			exoticToPrim = Symbol.prototype.valueOf;
		}
	}
	if (typeof exoticToPrim !== 'undefined') {
		var result = exoticToPrim.call(input, hint);
		if (isPrimitive(result)) {
			return result;
		}
		throw new TypeError('unable to convert exotic object to primitive');
	}
	if (hint === 'default' && (isDate(input) || isSymbol(input))) {
		hint = 'string';
	}
	return ordinaryToPrimitive(input, hint === 'default' ? 'number' : hint);
};

},{"./helpers/isPrimitive":38,"is-callable":111,"is-date-object":112,"is-symbol":114}],36:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

var isPrimitive = require('./helpers/isPrimitive');

var isCallable = require('is-callable');

// http://ecma-international.org/ecma-262/5.1/#sec-8.12.8
var ES5internalSlots = {
	'[[DefaultValue]]': function (O) {
		var actualHint;
		if (arguments.length > 1) {
			actualHint = arguments[1];
		} else {
			actualHint = toStr.call(O) === '[object Date]' ? String : Number;
		}

		if (actualHint === String || actualHint === Number) {
			var methods = actualHint === String ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
			var value, i;
			for (i = 0; i < methods.length; ++i) {
				if (isCallable(O[methods[i]])) {
					value = O[methods[i]]();
					if (isPrimitive(value)) {
						return value;
					}
				}
			}
			throw new TypeError('No default value');
		}
		throw new TypeError('invalid [[DefaultValue]] hint supplied');
	}
};

// http://ecma-international.org/ecma-262/5.1/#sec-9.1
module.exports = function ToPrimitive(input) {
	if (isPrimitive(input)) {
		return input;
	}
	if (arguments.length > 1) {
		return ES5internalSlots['[[DefaultValue]]'](input, arguments[1]);
	}
	return ES5internalSlots['[[DefaultValue]]'](input);
};

},{"./helpers/isPrimitive":38,"is-callable":111}],37:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"./es2015":35,"dup":27}],38:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],39:[function(require,module,exports){
// Inspired by Google Closure:
// http://closure-library.googlecode.com/svn/docs/
// closure_goog_array_array.js.html#goog.array.clear

"use strict";

var value = require("../../object/valid-value");

module.exports = function () {
	value(this).length = 0;
	return this;
};

},{"../../object/valid-value":77}],40:[function(require,module,exports){
"use strict";

var numberIsNaN       = require("../../number/is-nan")
  , toPosInt          = require("../../number/to-pos-integer")
  , value             = require("../../object/valid-value")
  , indexOf           = Array.prototype.indexOf
  , objHasOwnProperty = Object.prototype.hasOwnProperty
  , abs               = Math.abs
  , floor             = Math.floor;

module.exports = function (searchElement /*, fromIndex*/) {
	var i, length, fromIndex, val;
	if (!numberIsNaN(searchElement)) return indexOf.apply(this, arguments);

	length = toPosInt(value(this).length);
	fromIndex = arguments[1];
	if (isNaN(fromIndex)) fromIndex = 0;
	else if (fromIndex >= 0) fromIndex = floor(fromIndex);
	else fromIndex = toPosInt(this.length) - floor(abs(fromIndex));

	for (i = fromIndex; i < length; ++i) {
		if (objHasOwnProperty.call(this, i)) {
			val = this[i];
			if (numberIsNaN(val)) return i; // Jslint: ignore
		}
	}
	return -1;
};

},{"../../number/is-nan":51,"../../number/to-pos-integer":55,"../../object/valid-value":77}],41:[function(require,module,exports){
"use strict";

module.exports = require("./is-implemented")()
	? Array.from
	: require("./shim");

},{"./is-implemented":42,"./shim":43}],42:[function(require,module,exports){
"use strict";

module.exports = function () {
	var from = Array.from, arr, result;
	if (typeof from !== "function") return false;
	arr = ["raz", "dwa"];
	result = from(arr);
	return Boolean(result && (result !== arr) && (result[1] === "dwa"));
};

},{}],43:[function(require,module,exports){
"use strict";

var iteratorSymbol = require("es6-symbol").iterator
  , isArguments    = require("../../function/is-arguments")
  , isFunction     = require("../../function/is-function")
  , toPosInt       = require("../../number/to-pos-integer")
  , callable       = require("../../object/valid-callable")
  , validValue     = require("../../object/valid-value")
  , isValue        = require("../../object/is-value")
  , isString       = require("../../string/is-string")
  , isArray        = Array.isArray
  , call           = Function.prototype.call
  , desc           = { configurable: true, enumerable: true, writable: true, value: null }
  , defineProperty = Object.defineProperty;

// eslint-disable-next-line complexity, max-lines-per-function
module.exports = function (arrayLike /*, mapFn, thisArg*/) {
	var mapFn = arguments[1]
	  , thisArg = arguments[2]
	  , Context
	  , i
	  , j
	  , arr
	  , length
	  , code
	  , iterator
	  , result
	  , getIterator
	  , value;

	arrayLike = Object(validValue(arrayLike));

	if (isValue(mapFn)) callable(mapFn);
	if (!this || this === Array || !isFunction(this)) {
		// Result: Plain array
		if (!mapFn) {
			if (isArguments(arrayLike)) {
				// Source: Arguments
				length = arrayLike.length;
				if (length !== 1) return Array.apply(null, arrayLike);
				arr = new Array(1);
				arr[0] = arrayLike[0];
				return arr;
			}
			if (isArray(arrayLike)) {
				// Source: Array
				arr = new Array(length = arrayLike.length);
				for (i = 0; i < length; ++i) arr[i] = arrayLike[i];
				return arr;
			}
		}
		arr = [];
	} else {
		// Result: Non plain array
		Context = this;
	}

	if (!isArray(arrayLike)) {
		if ((getIterator = arrayLike[iteratorSymbol]) !== undefined) {
			// Source: Iterator
			iterator = callable(getIterator).call(arrayLike);
			if (Context) arr = new Context();
			result = iterator.next();
			i = 0;
			while (!result.done) {
				value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
				if (Context) {
					desc.value = value;
					defineProperty(arr, i, desc);
				} else {
					arr[i] = value;
				}
				result = iterator.next();
				++i;
			}
			length = i;
		} else if (isString(arrayLike)) {
			// Source: String
			length = arrayLike.length;
			if (Context) arr = new Context();
			for (i = 0, j = 0; i < length; ++i) {
				value = arrayLike[i];
				if (i + 1 < length) {
					code = value.charCodeAt(0);
					// eslint-disable-next-line max-depth
					if (code >= 0xd800 && code <= 0xdbff) value += arrayLike[++i];
				}
				value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
				if (Context) {
					desc.value = value;
					defineProperty(arr, j, desc);
				} else {
					arr[j] = value;
				}
				++j;
			}
			length = j;
		}
	}
	if (length === undefined) {
		// Source: array or array-like
		length = toPosInt(arrayLike.length);
		if (Context) arr = new Context(length);
		for (i = 0; i < length; ++i) {
			value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
			if (Context) {
				desc.value = value;
				defineProperty(arr, i, desc);
			} else {
				arr[i] = value;
			}
		}
	}
	if (Context) {
		desc.value = null;
		arr.length = length;
	}
	return arr;
};

},{"../../function/is-arguments":44,"../../function/is-function":45,"../../number/to-pos-integer":55,"../../object/is-value":65,"../../object/valid-callable":75,"../../object/valid-value":77,"../../string/is-string":81,"es6-symbol":96}],44:[function(require,module,exports){
"use strict";

var objToString = Object.prototype.toString
  , id = objToString.call(
	(function () {
		return arguments;
	})()
);

module.exports = function (value) {
	return objToString.call(value) === id;
};

},{}],45:[function(require,module,exports){
"use strict";

var objToString = Object.prototype.toString, id = objToString.call(require("./noop"));

module.exports = function (value) {
	return typeof value === "function" && objToString.call(value) === id;
};

},{"./noop":46}],46:[function(require,module,exports){
"use strict";

// eslint-disable-next-line no-empty-function
module.exports = function () {};

},{}],47:[function(require,module,exports){
/* eslint strict: "off" */

module.exports = (function () {
	return this;
}());

},{}],48:[function(require,module,exports){
"use strict";

module.exports = require("./is-implemented")()
	? Math.sign
	: require("./shim");

},{"./is-implemented":49,"./shim":50}],49:[function(require,module,exports){
"use strict";

module.exports = function () {
	var sign = Math.sign;
	if (typeof sign !== "function") return false;
	return (sign(10) === 1) && (sign(-20) === -1);
};

},{}],50:[function(require,module,exports){
"use strict";

module.exports = function (value) {
	value = Number(value);
	if (isNaN(value) || (value === 0)) return value;
	return value > 0 ? 1 : -1;
};

},{}],51:[function(require,module,exports){
"use strict";

module.exports = require("./is-implemented")()
	? Number.isNaN
	: require("./shim");

},{"./is-implemented":52,"./shim":53}],52:[function(require,module,exports){
"use strict";

module.exports = function () {
	var numberIsNaN = Number.isNaN;
	if (typeof numberIsNaN !== "function") return false;
	return !numberIsNaN({}) && numberIsNaN(NaN) && !numberIsNaN(34);
};

},{}],53:[function(require,module,exports){
"use strict";

module.exports = function (value) {
	// eslint-disable-next-line no-self-compare
	return value !== value;
};

},{}],54:[function(require,module,exports){
"use strict";

var sign = require("../math/sign")

  , abs = Math.abs, floor = Math.floor;

module.exports = function (value) {
	if (isNaN(value)) return 0;
	value = Number(value);
	if ((value === 0) || !isFinite(value)) return value;
	return sign(value) * floor(abs(value));
};

},{"../math/sign":48}],55:[function(require,module,exports){
"use strict";

var toInteger = require("./to-integer")

  , max = Math.max;

module.exports = function (value) {
 return max(0, toInteger(value));
};

},{"./to-integer":54}],56:[function(require,module,exports){
// Internal method, used by iteration functions.
// Calls a function for each key-value pair found in object
// Optionally takes compareFn to iterate object in specific order

"use strict";

var callable                = require("./valid-callable")
  , value                   = require("./valid-value")
  , bind                    = Function.prototype.bind
  , call                    = Function.prototype.call
  , keys                    = Object.keys
  , objPropertyIsEnumerable = Object.prototype.propertyIsEnumerable;

module.exports = function (method, defVal) {
	return function (obj, cb /*, thisArg, compareFn*/) {
		var list, thisArg = arguments[2], compareFn = arguments[3];
		obj = Object(value(obj));
		callable(cb);

		list = keys(obj);
		if (compareFn) {
			list.sort(typeof compareFn === "function" ? bind.call(compareFn, obj) : undefined);
		}
		if (typeof method !== "function") method = list[method];
		return call.call(method, list, function (key, index) {
			if (!objPropertyIsEnumerable.call(obj, key)) return defVal;
			return call.call(cb, thisArg, obj[key], key, obj, index);
		});
	};
};

},{"./valid-callable":75,"./valid-value":77}],57:[function(require,module,exports){
"use strict";

module.exports = require("./is-implemented")()
	? Object.assign
	: require("./shim");

},{"./is-implemented":58,"./shim":59}],58:[function(require,module,exports){
"use strict";

module.exports = function () {
	var assign = Object.assign, obj;
	if (typeof assign !== "function") return false;
	obj = { foo: "raz" };
	assign(obj, { bar: "dwa" }, { trzy: "trzy" });
	return (obj.foo + obj.bar + obj.trzy) === "razdwatrzy";
};

},{}],59:[function(require,module,exports){
"use strict";

var keys  = require("../keys")
  , value = require("../valid-value")
  , max   = Math.max;

module.exports = function (dest, src /*, …srcn*/) {
	var error, i, length = max(arguments.length, 2), assign;
	dest = Object(value(dest));
	assign = function (key) {
		try {
			dest[key] = src[key];
		} catch (e) {
			if (!error) error = e;
		}
	};
	for (i = 1; i < length; ++i) {
		src = arguments[i];
		keys(src).forEach(assign);
	}
	if (error !== undefined) throw error;
	return dest;
};

},{"../keys":66,"../valid-value":77}],60:[function(require,module,exports){
"use strict";

var aFrom  = require("../array/from")
  , assign = require("./assign")
  , value  = require("./valid-value");

module.exports = function (obj/*, propertyNames, options*/) {
	var copy = Object(value(obj)), propertyNames = arguments[1], options = Object(arguments[2]);
	if (copy !== obj && !propertyNames) return copy;
	var result = {};
	if (propertyNames) {
		aFrom(propertyNames, function (propertyName) {
			if (options.ensure || propertyName in obj) result[propertyName] = obj[propertyName];
		});
	} else {
		assign(result, obj);
	}
	return result;
};

},{"../array/from":41,"./assign":57,"./valid-value":77}],61:[function(require,module,exports){
// Workaround for http://code.google.com/p/v8/issues/detail?id=2804

"use strict";

var create = Object.create, shim;

if (!require("./set-prototype-of/is-implemented")()) {
	shim = require("./set-prototype-of/shim");
}

module.exports = (function () {
	var nullObject, polyProps, desc;
	if (!shim) return create;
	if (shim.level !== 1) return create;

	nullObject = {};
	polyProps = {};
	desc = {
		configurable: false,
		enumerable: false,
		writable: true,
		value: undefined
	};
	Object.getOwnPropertyNames(Object.prototype).forEach(function (name) {
		if (name === "__proto__") {
			polyProps[name] = {
				configurable: true,
				enumerable: false,
				writable: true,
				value: undefined
			};
			return;
		}
		polyProps[name] = desc;
	});
	Object.defineProperties(nullObject, polyProps);

	Object.defineProperty(shim, "nullPolyfill", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: nullObject
	});

	return function (prototype, props) {
		return create(prototype === null ? nullObject : prototype, props);
	};
}());

},{"./set-prototype-of/is-implemented":73,"./set-prototype-of/shim":74}],62:[function(require,module,exports){
"use strict";

module.exports = require("./_iterate")("forEach");

},{"./_iterate":56}],63:[function(require,module,exports){
// Deprecated

"use strict";

module.exports = function (obj) {
 return typeof obj === "function";
};

},{}],64:[function(require,module,exports){
"use strict";

var isValue = require("./is-value");

var map = { function: true, object: true };

module.exports = function (value) {
	return (isValue(value) && map[typeof value]) || false;
};

},{"./is-value":65}],65:[function(require,module,exports){
"use strict";

var _undefined = require("../function/noop")(); // Support ES3 engines

module.exports = function (val) {
 return (val !== _undefined) && (val !== null);
};

},{"../function/noop":46}],66:[function(require,module,exports){
"use strict";

module.exports = require("./is-implemented")() ? Object.keys : require("./shim");

},{"./is-implemented":67,"./shim":68}],67:[function(require,module,exports){
"use strict";

module.exports = function () {
	try {
		Object.keys("primitive");
		return true;
	} catch (e) {
		return false;
	}
};

},{}],68:[function(require,module,exports){
"use strict";

var isValue = require("../is-value");

var keys = Object.keys;

module.exports = function (object) { return keys(isValue(object) ? Object(object) : object); };

},{"../is-value":65}],69:[function(require,module,exports){
"use strict";

var callable = require("./valid-callable")
  , forEach  = require("./for-each")
  , call     = Function.prototype.call;

module.exports = function (obj, cb /*, thisArg*/) {
	var result = {}, thisArg = arguments[2];
	callable(cb);
	forEach(obj, function (value, key, targetObj, index) {
		result[key] = call.call(cb, thisArg, value, key, targetObj, index);
	});
	return result;
};

},{"./for-each":62,"./valid-callable":75}],70:[function(require,module,exports){
"use strict";

var isValue = require("./is-value");

var forEach = Array.prototype.forEach, create = Object.create;

var process = function (src, obj) {
	var key;
	for (key in src) obj[key] = src[key];
};

// eslint-disable-next-line no-unused-vars
module.exports = function (opts1 /*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (!isValue(options)) return;
		process(Object(options), result);
	});
	return result;
};

},{"./is-value":65}],71:[function(require,module,exports){
"use strict";

var forEach = Array.prototype.forEach, create = Object.create;

// eslint-disable-next-line no-unused-vars
module.exports = function (arg /*, …args*/) {
	var set = create(null);
	forEach.call(arguments, function (name) {
		set[name] = true;
	});
	return set;
};

},{}],72:[function(require,module,exports){
"use strict";

module.exports = require("./is-implemented")()
	? Object.setPrototypeOf
	: require("./shim");

},{"./is-implemented":73,"./shim":74}],73:[function(require,module,exports){
"use strict";

var create = Object.create, getPrototypeOf = Object.getPrototypeOf, plainObject = {};

module.exports = function (/* CustomCreate*/) {
	var setPrototypeOf = Object.setPrototypeOf, customCreate = arguments[0] || create;
	if (typeof setPrototypeOf !== "function") return false;
	return getPrototypeOf(setPrototypeOf(customCreate(null), plainObject)) === plainObject;
};

},{}],74:[function(require,module,exports){
/* eslint no-proto: "off" */

// Big thanks to @WebReflection for sorting this out
// https://gist.github.com/WebReflection/5593554

"use strict";

var isObject        = require("../is-object")
  , value           = require("../valid-value")
  , objIsPrototypeOf = Object.prototype.isPrototypeOf
  , defineProperty  = Object.defineProperty
  , nullDesc        = {
	configurable: true,
	enumerable: false,
	writable: true,
	value: undefined
}
  , validate;

validate = function (obj, prototype) {
	value(obj);
	if (prototype === null || isObject(prototype)) return obj;
	throw new TypeError("Prototype must be null or an object");
};

module.exports = (function (status) {
	var fn, set;
	if (!status) return null;
	if (status.level === 2) {
		if (status.set) {
			set = status.set;
			fn = function (obj, prototype) {
				set.call(validate(obj, prototype), prototype);
				return obj;
			};
		} else {
			fn = function (obj, prototype) {
				validate(obj, prototype).__proto__ = prototype;
				return obj;
			};
		}
	} else {
		fn = function self(obj, prototype) {
			var isNullBase;
			validate(obj, prototype);
			isNullBase = objIsPrototypeOf.call(self.nullPolyfill, obj);
			if (isNullBase) delete self.nullPolyfill.__proto__;
			if (prototype === null) prototype = self.nullPolyfill;
			obj.__proto__ = prototype;
			if (isNullBase) defineProperty(self.nullPolyfill, "__proto__", nullDesc);
			return obj;
		};
	}
	return Object.defineProperty(fn, "level", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: status.level
	});
}(
	(function () {
		var tmpObj1 = Object.create(null)
		  , tmpObj2 = {}
		  , set
		  , desc = Object.getOwnPropertyDescriptor(Object.prototype, "__proto__");

		if (desc) {
			try {
				set = desc.set; // Opera crashes at this point
				set.call(tmpObj1, tmpObj2);
			} catch (ignore) {}
			if (Object.getPrototypeOf(tmpObj1) === tmpObj2) return { set: set, level: 2 };
		}

		tmpObj1.__proto__ = tmpObj2;
		if (Object.getPrototypeOf(tmpObj1) === tmpObj2) return { level: 2 };

		tmpObj1 = {};
		tmpObj1.__proto__ = tmpObj2;
		if (Object.getPrototypeOf(tmpObj1) === tmpObj2) return { level: 1 };

		return false;
	})()
));

require("../create");

},{"../create":61,"../is-object":64,"../valid-value":77}],75:[function(require,module,exports){
"use strict";

module.exports = function (fn) {
	if (typeof fn !== "function") throw new TypeError(fn + " is not a function");
	return fn;
};

},{}],76:[function(require,module,exports){
"use strict";

var isObject = require("./is-object");

module.exports = function (value) {
	if (!isObject(value)) throw new TypeError(value + " is not an Object");
	return value;
};

},{"./is-object":64}],77:[function(require,module,exports){
"use strict";

var isValue = require("./is-value");

module.exports = function (value) {
	if (!isValue(value)) throw new TypeError("Cannot use null or undefined");
	return value;
};

},{"./is-value":65}],78:[function(require,module,exports){
"use strict";

module.exports = require("./is-implemented")()
	? String.prototype.contains
	: require("./shim");

},{"./is-implemented":79,"./shim":80}],79:[function(require,module,exports){
"use strict";

var str = "razdwatrzy";

module.exports = function () {
	if (typeof str.contains !== "function") return false;
	return (str.contains("dwa") === true) && (str.contains("foo") === false);
};

},{}],80:[function(require,module,exports){
"use strict";

var indexOf = String.prototype.indexOf;

module.exports = function (searchString/*, position*/) {
	return indexOf.call(this, searchString, arguments[1]) > -1;
};

},{}],81:[function(require,module,exports){
"use strict";

var objToString = Object.prototype.toString, id = objToString.call("");

module.exports = function (value) {
	return (
		typeof value === "string" ||
		(value &&
			typeof value === "object" &&
			(value instanceof String || objToString.call(value) === id)) ||
		false
	);
};

},{}],82:[function(require,module,exports){
"use strict";

var generated = Object.create(null), random = Math.random;

module.exports = function () {
	var str;
	do {
		str = random()
			.toString(36)
			.slice(2);
	} while (generated[str]);
	return str;
};

},{}],83:[function(require,module,exports){
"use strict";

var setPrototypeOf = require("es5-ext/object/set-prototype-of")
  , contains       = require("es5-ext/string/#/contains")
  , d              = require("d")
  , Symbol         = require("es6-symbol")
  , Iterator       = require("./");

var defineProperty = Object.defineProperty, ArrayIterator;

ArrayIterator = module.exports = function (arr, kind) {
	if (!(this instanceof ArrayIterator)) throw new TypeError("Constructor requires 'new'");
	Iterator.call(this, arr);
	if (!kind) kind = "value";
	else if (contains.call(kind, "key+value")) kind = "key+value";
	else if (contains.call(kind, "key")) kind = "key";
	else kind = "value";
	defineProperty(this, "__kind__", d("", kind));
};
if (setPrototypeOf) setPrototypeOf(ArrayIterator, Iterator);

// Internal %ArrayIteratorPrototype% doesn't expose its constructor
delete ArrayIterator.prototype.constructor;

ArrayIterator.prototype = Object.create(Iterator.prototype, {
	_resolve: d(function (i) {
		if (this.__kind__ === "value") return this.__list__[i];
		if (this.__kind__ === "key+value") return [i, this.__list__[i]];
		return i;
	})
});
defineProperty(ArrayIterator.prototype, Symbol.toStringTag, d("c", "Array Iterator"));

},{"./":86,"d":22,"es5-ext/object/set-prototype-of":72,"es5-ext/string/#/contains":78,"es6-symbol":96}],84:[function(require,module,exports){
"use strict";

var isArguments = require("es5-ext/function/is-arguments")
  , callable    = require("es5-ext/object/valid-callable")
  , isString    = require("es5-ext/string/is-string")
  , get         = require("./get");

var isArray = Array.isArray, call = Function.prototype.call, some = Array.prototype.some;

module.exports = function (iterable, cb /*, thisArg*/) {
	var mode, thisArg = arguments[2], result, doBreak, broken, i, length, char, code;
	if (isArray(iterable) || isArguments(iterable)) mode = "array";
	else if (isString(iterable)) mode = "string";
	else iterable = get(iterable);

	callable(cb);
	doBreak = function () {
		broken = true;
	};
	if (mode === "array") {
		some.call(iterable, function (value) {
			call.call(cb, thisArg, value, doBreak);
			return broken;
		});
		return;
	}
	if (mode === "string") {
		length = iterable.length;
		for (i = 0; i < length; ++i) {
			char = iterable[i];
			if (i + 1 < length) {
				code = char.charCodeAt(0);
				if (code >= 0xd800 && code <= 0xdbff) char += iterable[++i];
			}
			call.call(cb, thisArg, char, doBreak);
			if (broken) break;
		}
		return;
	}
	result = iterable.next();

	while (!result.done) {
		call.call(cb, thisArg, result.value, doBreak);
		if (broken) return;
		result = iterable.next();
	}
};

},{"./get":85,"es5-ext/function/is-arguments":44,"es5-ext/object/valid-callable":75,"es5-ext/string/is-string":81}],85:[function(require,module,exports){
"use strict";

var isArguments    = require("es5-ext/function/is-arguments")
  , isString       = require("es5-ext/string/is-string")
  , ArrayIterator  = require("./array")
  , StringIterator = require("./string")
  , iterable       = require("./valid-iterable")
  , iteratorSymbol = require("es6-symbol").iterator;

module.exports = function (obj) {
	if (typeof iterable(obj)[iteratorSymbol] === "function") return obj[iteratorSymbol]();
	if (isArguments(obj)) return new ArrayIterator(obj);
	if (isString(obj)) return new StringIterator(obj);
	return new ArrayIterator(obj);
};

},{"./array":83,"./string":88,"./valid-iterable":89,"es5-ext/function/is-arguments":44,"es5-ext/string/is-string":81,"es6-symbol":96}],86:[function(require,module,exports){
"use strict";

var clear    = require("es5-ext/array/#/clear")
  , assign   = require("es5-ext/object/assign")
  , callable = require("es5-ext/object/valid-callable")
  , value    = require("es5-ext/object/valid-value")
  , d        = require("d")
  , autoBind = require("d/auto-bind")
  , Symbol   = require("es6-symbol");

var defineProperty = Object.defineProperty, defineProperties = Object.defineProperties, Iterator;

module.exports = Iterator = function (list, context) {
	if (!(this instanceof Iterator)) throw new TypeError("Constructor requires 'new'");
	defineProperties(this, {
		__list__: d("w", value(list)),
		__context__: d("w", context),
		__nextIndex__: d("w", 0)
	});
	if (!context) return;
	callable(context.on);
	context.on("_add", this._onAdd);
	context.on("_delete", this._onDelete);
	context.on("_clear", this._onClear);
};

// Internal %IteratorPrototype% doesn't expose its constructor
delete Iterator.prototype.constructor;

defineProperties(
	Iterator.prototype,
	assign(
		{
			_next: d(function () {
				var i;
				if (!this.__list__) return undefined;
				if (this.__redo__) {
					i = this.__redo__.shift();
					if (i !== undefined) return i;
				}
				if (this.__nextIndex__ < this.__list__.length) return this.__nextIndex__++;
				this._unBind();
				return undefined;
			}),
			next: d(function () {
				return this._createResult(this._next());
			}),
			_createResult: d(function (i) {
				if (i === undefined) return { done: true, value: undefined };
				return { done: false, value: this._resolve(i) };
			}),
			_resolve: d(function (i) {
				return this.__list__[i];
			}),
			_unBind: d(function () {
				this.__list__ = null;
				delete this.__redo__;
				if (!this.__context__) return;
				this.__context__.off("_add", this._onAdd);
				this.__context__.off("_delete", this._onDelete);
				this.__context__.off("_clear", this._onClear);
				this.__context__ = null;
			}),
			toString: d(function () {
				return "[object " + (this[Symbol.toStringTag] || "Object") + "]";
			})
		},
		autoBind({
			_onAdd: d(function (index) {
				if (index >= this.__nextIndex__) return;
				++this.__nextIndex__;
				if (!this.__redo__) {
					defineProperty(this, "__redo__", d("c", [index]));
					return;
				}
				this.__redo__.forEach(function (redo, i) {
					if (redo >= index) this.__redo__[i] = ++redo;
				}, this);
				this.__redo__.push(index);
			}),
			_onDelete: d(function (index) {
				var i;
				if (index >= this.__nextIndex__) return;
				--this.__nextIndex__;
				if (!this.__redo__) return;
				i = this.__redo__.indexOf(index);
				if (i !== -1) this.__redo__.splice(i, 1);
				this.__redo__.forEach(function (redo, j) {
					if (redo > index) this.__redo__[j] = --redo;
				}, this);
			}),
			_onClear: d(function () {
				if (this.__redo__) clear.call(this.__redo__);
				this.__nextIndex__ = 0;
			})
		})
	)
);

defineProperty(
	Iterator.prototype,
	Symbol.iterator,
	d(function () {
		return this;
	})
);

},{"d":22,"d/auto-bind":21,"es5-ext/array/#/clear":39,"es5-ext/object/assign":57,"es5-ext/object/valid-callable":75,"es5-ext/object/valid-value":77,"es6-symbol":96}],87:[function(require,module,exports){
"use strict";

var isArguments = require("es5-ext/function/is-arguments")
  , isValue     = require("es5-ext/object/is-value")
  , isString    = require("es5-ext/string/is-string");

var iteratorSymbol = require("es6-symbol").iterator
  , isArray        = Array.isArray;

module.exports = function (value) {
	if (!isValue(value)) return false;
	if (isArray(value)) return true;
	if (isString(value)) return true;
	if (isArguments(value)) return true;
	return typeof value[iteratorSymbol] === "function";
};

},{"es5-ext/function/is-arguments":44,"es5-ext/object/is-value":65,"es5-ext/string/is-string":81,"es6-symbol":96}],88:[function(require,module,exports){
// Thanks @mathiasbynens
// http://mathiasbynens.be/notes/javascript-unicode#iterating-over-symbols

"use strict";

var setPrototypeOf = require("es5-ext/object/set-prototype-of")
  , d              = require("d")
  , Symbol         = require("es6-symbol")
  , Iterator       = require("./");

var defineProperty = Object.defineProperty, StringIterator;

StringIterator = module.exports = function (str) {
	if (!(this instanceof StringIterator)) throw new TypeError("Constructor requires 'new'");
	str = String(str);
	Iterator.call(this, str);
	defineProperty(this, "__length__", d("", str.length));
};
if (setPrototypeOf) setPrototypeOf(StringIterator, Iterator);

// Internal %ArrayIteratorPrototype% doesn't expose its constructor
delete StringIterator.prototype.constructor;

StringIterator.prototype = Object.create(Iterator.prototype, {
	_next: d(function () {
		if (!this.__list__) return undefined;
		if (this.__nextIndex__ < this.__length__) return this.__nextIndex__++;
		this._unBind();
		return undefined;
	}),
	_resolve: d(function (i) {
		var char = this.__list__[i], code;
		if (this.__nextIndex__ === this.__length__) return char;
		code = char.charCodeAt(0);
		if (code >= 0xd800 && code <= 0xdbff) return char + this.__list__[this.__nextIndex__++];
		return char;
	})
});
defineProperty(StringIterator.prototype, Symbol.toStringTag, d("c", "String Iterator"));

},{"./":86,"d":22,"es5-ext/object/set-prototype-of":72,"es6-symbol":96}],89:[function(require,module,exports){
"use strict";

var isIterable = require("./is-iterable");

module.exports = function (value) {
	if (!isIterable(value)) throw new TypeError(value + " is not iterable");
	return value;
};

},{"./is-iterable":87}],90:[function(require,module,exports){
'use strict';

if (!require('./is-implemented')()) {
	Object.defineProperty(require('es5-ext/global'), 'Map',
		{ value: require('./polyfill'), configurable: true, enumerable: false,
			writable: true });
}

},{"./is-implemented":91,"./polyfill":95,"es5-ext/global":47}],91:[function(require,module,exports){
'use strict';

module.exports = function () {
	var map, iterator, result;
	if (typeof Map !== 'function') return false;
	try {
		// WebKit doesn't support arguments and crashes
		map = new Map([['raz', 'one'], ['dwa', 'two'], ['trzy', 'three']]);
	} catch (e) {
		return false;
	}
	if (String(map) !== '[object Map]') return false;
	if (map.size !== 3) return false;
	if (typeof map.clear !== 'function') return false;
	if (typeof map.delete !== 'function') return false;
	if (typeof map.entries !== 'function') return false;
	if (typeof map.forEach !== 'function') return false;
	if (typeof map.get !== 'function') return false;
	if (typeof map.has !== 'function') return false;
	if (typeof map.keys !== 'function') return false;
	if (typeof map.set !== 'function') return false;
	if (typeof map.values !== 'function') return false;

	iterator = map.entries();
	result = iterator.next();
	if (result.done !== false) return false;
	if (!result.value) return false;
	if (result.value[0] !== 'raz') return false;
	if (result.value[1] !== 'one') return false;

	return true;
};

},{}],92:[function(require,module,exports){
// Exports true if environment provides native `Map` implementation,
// whatever that is.

'use strict';

module.exports = (function () {
	if (typeof Map === 'undefined') return false;
	return (Object.prototype.toString.call(new Map()) === '[object Map]');
}());

},{}],93:[function(require,module,exports){
'use strict';

module.exports = require('es5-ext/object/primitive-set')('key',
	'value', 'key+value');

},{"es5-ext/object/primitive-set":71}],94:[function(require,module,exports){
'use strict';

var setPrototypeOf    = require('es5-ext/object/set-prototype-of')
  , d                 = require('d')
  , Iterator          = require('es6-iterator')
  , toStringTagSymbol = require('es6-symbol').toStringTag
  , kinds             = require('./iterator-kinds')

  , defineProperties = Object.defineProperties
  , unBind = Iterator.prototype._unBind
  , MapIterator;

MapIterator = module.exports = function (map, kind) {
	if (!(this instanceof MapIterator)) return new MapIterator(map, kind);
	Iterator.call(this, map.__mapKeysData__, map);
	if (!kind || !kinds[kind]) kind = 'key+value';
	defineProperties(this, {
		__kind__: d('', kind),
		__values__: d('w', map.__mapValuesData__)
	});
};
if (setPrototypeOf) setPrototypeOf(MapIterator, Iterator);

MapIterator.prototype = Object.create(Iterator.prototype, {
	constructor: d(MapIterator),
	_resolve: d(function (i) {
		if (this.__kind__ === 'value') return this.__values__[i];
		if (this.__kind__ === 'key') return this.__list__[i];
		return [this.__list__[i], this.__values__[i]];
	}),
	_unBind: d(function () {
		this.__values__ = null;
		unBind.call(this);
	}),
	toString: d(function () { return '[object Map Iterator]'; })
});
Object.defineProperty(MapIterator.prototype, toStringTagSymbol,
	d('c', 'Map Iterator'));

},{"./iterator-kinds":93,"d":22,"es5-ext/object/set-prototype-of":72,"es6-iterator":86,"es6-symbol":96}],95:[function(require,module,exports){
'use strict';

var clear          = require('es5-ext/array/#/clear')
  , eIndexOf       = require('es5-ext/array/#/e-index-of')
  , setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , callable       = require('es5-ext/object/valid-callable')
  , validValue     = require('es5-ext/object/valid-value')
  , d              = require('d')
  , ee             = require('event-emitter')
  , Symbol         = require('es6-symbol')
  , iterator       = require('es6-iterator/valid-iterable')
  , forOf          = require('es6-iterator/for-of')
  , Iterator       = require('./lib/iterator')
  , isNative       = require('./is-native-implemented')

  , call = Function.prototype.call
  , defineProperties = Object.defineProperties, getPrototypeOf = Object.getPrototypeOf
  , MapPoly;

module.exports = MapPoly = function (/*iterable*/) {
	var iterable = arguments[0], keys, values, self;
	if (!(this instanceof MapPoly)) throw new TypeError('Constructor requires \'new\'');
	if (isNative && setPrototypeOf && (Map !== MapPoly)) {
		self = setPrototypeOf(new Map(), getPrototypeOf(this));
	} else {
		self = this;
	}
	if (iterable != null) iterator(iterable);
	defineProperties(self, {
		__mapKeysData__: d('c', keys = []),
		__mapValuesData__: d('c', values = [])
	});
	if (!iterable) return self;
	forOf(iterable, function (value) {
		var key = validValue(value)[0];
		value = value[1];
		if (eIndexOf.call(keys, key) !== -1) return;
		keys.push(key);
		values.push(value);
	}, self);
	return self;
};

if (isNative) {
	if (setPrototypeOf) setPrototypeOf(MapPoly, Map);
	MapPoly.prototype = Object.create(Map.prototype, {
		constructor: d(MapPoly)
	});
}

ee(defineProperties(MapPoly.prototype, {
	clear: d(function () {
		if (!this.__mapKeysData__.length) return;
		clear.call(this.__mapKeysData__);
		clear.call(this.__mapValuesData__);
		this.emit('_clear');
	}),
	delete: d(function (key) {
		var index = eIndexOf.call(this.__mapKeysData__, key);
		if (index === -1) return false;
		this.__mapKeysData__.splice(index, 1);
		this.__mapValuesData__.splice(index, 1);
		this.emit('_delete', index, key);
		return true;
	}),
	entries: d(function () { return new Iterator(this, 'key+value'); }),
	forEach: d(function (cb/*, thisArg*/) {
		var thisArg = arguments[1], iterator, result;
		callable(cb);
		iterator = this.entries();
		result = iterator._next();
		while (result !== undefined) {
			call.call(cb, thisArg, this.__mapValuesData__[result],
				this.__mapKeysData__[result], this);
			result = iterator._next();
		}
	}),
	get: d(function (key) {
		var index = eIndexOf.call(this.__mapKeysData__, key);
		if (index === -1) return;
		return this.__mapValuesData__[index];
	}),
	has: d(function (key) {
		return (eIndexOf.call(this.__mapKeysData__, key) !== -1);
	}),
	keys: d(function () { return new Iterator(this, 'key'); }),
	set: d(function (key, value) {
		var index = eIndexOf.call(this.__mapKeysData__, key), emit;
		if (index === -1) {
			index = this.__mapKeysData__.push(key) - 1;
			emit = true;
		}
		this.__mapValuesData__[index] = value;
		if (emit) this.emit('_add', index, key);
		return this;
	}),
	size: d.gs(function () { return this.__mapKeysData__.length; }),
	values: d(function () { return new Iterator(this, 'value'); }),
	toString: d(function () { return '[object Map]'; })
}));
Object.defineProperty(MapPoly.prototype, Symbol.iterator, d(function () {
	return this.entries();
}));
Object.defineProperty(MapPoly.prototype, Symbol.toStringTag, d('c', 'Map'));

},{"./is-native-implemented":92,"./lib/iterator":94,"d":22,"es5-ext/array/#/clear":39,"es5-ext/array/#/e-index-of":40,"es5-ext/object/set-prototype-of":72,"es5-ext/object/valid-callable":75,"es5-ext/object/valid-value":77,"es6-iterator/for-of":84,"es6-iterator/valid-iterable":89,"es6-symbol":96,"event-emitter":105}],96:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')() ? Symbol : require('./polyfill');

},{"./is-implemented":97,"./polyfill":99}],97:[function(require,module,exports){
'use strict';

var validTypes = { object: true, symbol: true };

module.exports = function () {
	var symbol;
	if (typeof Symbol !== 'function') return false;
	symbol = Symbol('test symbol');
	try { String(symbol); } catch (e) { return false; }

	// Return 'true' also for polyfills
	if (!validTypes[typeof Symbol.iterator]) return false;
	if (!validTypes[typeof Symbol.toPrimitive]) return false;
	if (!validTypes[typeof Symbol.toStringTag]) return false;

	return true;
};

},{}],98:[function(require,module,exports){
'use strict';

module.exports = function (x) {
	if (!x) return false;
	if (typeof x === 'symbol') return true;
	if (!x.constructor) return false;
	if (x.constructor.name !== 'Symbol') return false;
	return (x[x.constructor.toStringTag] === 'Symbol');
};

},{}],99:[function(require,module,exports){
// ES2015 Symbol polyfill for environments that do not (or partially) support it

'use strict';

var d              = require('d')
  , validateSymbol = require('./validate-symbol')

  , create = Object.create, defineProperties = Object.defineProperties
  , defineProperty = Object.defineProperty, objPrototype = Object.prototype
  , NativeSymbol, SymbolPolyfill, HiddenSymbol, globalSymbols = create(null)
  , isNativeSafe;

if (typeof Symbol === 'function') {
	NativeSymbol = Symbol;
	try {
		String(NativeSymbol());
		isNativeSafe = true;
	} catch (ignore) {}
}

var generateName = (function () {
	var created = create(null);
	return function (desc) {
		var postfix = 0, name, ie11BugWorkaround;
		while (created[desc + (postfix || '')]) ++postfix;
		desc += (postfix || '');
		created[desc] = true;
		name = '@@' + desc;
		defineProperty(objPrototype, name, d.gs(null, function (value) {
			// For IE11 issue see:
			// https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
			//    ie11-broken-getters-on-dom-objects
			// https://github.com/medikoo/es6-symbol/issues/12
			if (ie11BugWorkaround) return;
			ie11BugWorkaround = true;
			defineProperty(this, name, d(value));
			ie11BugWorkaround = false;
		}));
		return name;
	};
}());

// Internal constructor (not one exposed) for creating Symbol instances.
// This one is used to ensure that `someSymbol instanceof Symbol` always return false
HiddenSymbol = function Symbol(description) {
	if (this instanceof HiddenSymbol) throw new TypeError('Symbol is not a constructor');
	return SymbolPolyfill(description);
};

// Exposed `Symbol` constructor
// (returns instances of HiddenSymbol)
module.exports = SymbolPolyfill = function Symbol(description) {
	var symbol;
	if (this instanceof Symbol) throw new TypeError('Symbol is not a constructor');
	if (isNativeSafe) return NativeSymbol(description);
	symbol = create(HiddenSymbol.prototype);
	description = (description === undefined ? '' : String(description));
	return defineProperties(symbol, {
		__description__: d('', description),
		__name__: d('', generateName(description))
	});
};
defineProperties(SymbolPolyfill, {
	for: d(function (key) {
		if (globalSymbols[key]) return globalSymbols[key];
		return (globalSymbols[key] = SymbolPolyfill(String(key)));
	}),
	keyFor: d(function (s) {
		var key;
		validateSymbol(s);
		for (key in globalSymbols) if (globalSymbols[key] === s) return key;
	}),

	// To ensure proper interoperability with other native functions (e.g. Array.from)
	// fallback to eventual native implementation of given symbol
	hasInstance: d('', (NativeSymbol && NativeSymbol.hasInstance) || SymbolPolyfill('hasInstance')),
	isConcatSpreadable: d('', (NativeSymbol && NativeSymbol.isConcatSpreadable) ||
		SymbolPolyfill('isConcatSpreadable')),
	iterator: d('', (NativeSymbol && NativeSymbol.iterator) || SymbolPolyfill('iterator')),
	match: d('', (NativeSymbol && NativeSymbol.match) || SymbolPolyfill('match')),
	replace: d('', (NativeSymbol && NativeSymbol.replace) || SymbolPolyfill('replace')),
	search: d('', (NativeSymbol && NativeSymbol.search) || SymbolPolyfill('search')),
	species: d('', (NativeSymbol && NativeSymbol.species) || SymbolPolyfill('species')),
	split: d('', (NativeSymbol && NativeSymbol.split) || SymbolPolyfill('split')),
	toPrimitive: d('', (NativeSymbol && NativeSymbol.toPrimitive) || SymbolPolyfill('toPrimitive')),
	toStringTag: d('', (NativeSymbol && NativeSymbol.toStringTag) || SymbolPolyfill('toStringTag')),
	unscopables: d('', (NativeSymbol && NativeSymbol.unscopables) || SymbolPolyfill('unscopables'))
});

// Internal tweaks for real symbol producer
defineProperties(HiddenSymbol.prototype, {
	constructor: d(SymbolPolyfill),
	toString: d('', function () { return this.__name__; })
});

// Proper implementation of methods exposed on Symbol.prototype
// They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
defineProperties(SymbolPolyfill.prototype, {
	toString: d(function () { return 'Symbol (' + validateSymbol(this).__description__ + ')'; }),
	valueOf: d(function () { return validateSymbol(this); })
});
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d('', function () {
	var symbol = validateSymbol(this);
	if (typeof symbol === 'symbol') return symbol;
	return symbol.toString();
}));
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d('c', 'Symbol'));

// Proper implementaton of toPrimitive and toStringTag for returned symbol instances
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toStringTag,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]));

// Note: It's important to define `toPrimitive` as last one, as some implementations
// implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
// And that may invoke error in definition flow:
// See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toPrimitive,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]));

},{"./validate-symbol":100,"d":22}],100:[function(require,module,exports){
'use strict';

var isSymbol = require('./is-symbol');

module.exports = function (value) {
	if (!isSymbol(value)) throw new TypeError(value + " is not a symbol");
	return value;
};

},{"./is-symbol":98}],101:[function(require,module,exports){
'use strict';

if (!require('./is-implemented')()) {
	Object.defineProperty(require('es5-ext/global'), 'WeakMap',
		{ value: require('./polyfill'), configurable: true, enumerable: false,
			writable: true });
}

},{"./is-implemented":102,"./polyfill":104,"es5-ext/global":47}],102:[function(require,module,exports){
'use strict';

module.exports = function () {
	var weakMap, x;
	if (typeof WeakMap !== 'function') return false;
	try {
		// WebKit doesn't support arguments and crashes
		weakMap = new WeakMap([[x = {}, 'one'], [{}, 'two'], [{}, 'three']]);
	} catch (e) {
		return false;
	}
	if (String(weakMap) !== '[object WeakMap]') return false;
	if (typeof weakMap.set !== 'function') return false;
	if (weakMap.set({}, 1) !== weakMap) return false;
	if (typeof weakMap.delete !== 'function') return false;
	if (typeof weakMap.has !== 'function') return false;
	if (weakMap.get(x) !== 'one') return false;

	return true;
};

},{}],103:[function(require,module,exports){
// Exports true if environment provides native `WeakMap` implementation, whatever that is.

'use strict';

module.exports = (function () {
	if (typeof WeakMap !== 'function') return false;
	return (Object.prototype.toString.call(new WeakMap()) === '[object WeakMap]');
}());

},{}],104:[function(require,module,exports){
'use strict';

var setPrototypeOf    = require('es5-ext/object/set-prototype-of')
  , object            = require('es5-ext/object/valid-object')
  , value             = require('es5-ext/object/valid-value')
  , randomUniq        = require('es5-ext/string/random-uniq')
  , d                 = require('d')
  , getIterator       = require('es6-iterator/get')
  , forOf             = require('es6-iterator/for-of')
  , toStringTagSymbol = require('es6-symbol').toStringTag
  , isNative          = require('./is-native-implemented')

  , isArray = Array.isArray, defineProperty = Object.defineProperty
  , hasOwnProperty = Object.prototype.hasOwnProperty, getPrototypeOf = Object.getPrototypeOf
  , WeakMapPoly;

module.exports = WeakMapPoly = function (/*iterable*/) {
	var iterable = arguments[0], self;
	if (!(this instanceof WeakMapPoly)) throw new TypeError('Constructor requires \'new\'');
	if (isNative && setPrototypeOf && (WeakMap !== WeakMapPoly)) {
		self = setPrototypeOf(new WeakMap(), getPrototypeOf(this));
	} else {
		self = this;
	}
	if (iterable != null) {
		if (!isArray(iterable)) iterable = getIterator(iterable);
	}
	defineProperty(self, '__weakMapData__', d('c', '$weakMap$' + randomUniq()));
	if (!iterable) return self;
	forOf(iterable, function (val) {
		value(val);
		self.set(val[0], val[1]);
	});
	return self;
};

if (isNative) {
	if (setPrototypeOf) setPrototypeOf(WeakMapPoly, WeakMap);
	WeakMapPoly.prototype = Object.create(WeakMap.prototype, {
		constructor: d(WeakMapPoly)
	});
}

Object.defineProperties(WeakMapPoly.prototype, {
	delete: d(function (key) {
		if (hasOwnProperty.call(object(key), this.__weakMapData__)) {
			delete key[this.__weakMapData__];
			return true;
		}
		return false;
	}),
	get: d(function (key) {
		if (hasOwnProperty.call(object(key), this.__weakMapData__)) {
			return key[this.__weakMapData__];
		}
	}),
	has: d(function (key) {
		return hasOwnProperty.call(object(key), this.__weakMapData__);
	}),
	set: d(function (key, value) {
		defineProperty(object(key), this.__weakMapData__, d('c', value));
		return this;
	}),
	toString: d(function () { return '[object WeakMap]'; })
});
defineProperty(WeakMapPoly.prototype, toStringTagSymbol, d('c', 'WeakMap'));

},{"./is-native-implemented":103,"d":22,"es5-ext/object/set-prototype-of":72,"es5-ext/object/valid-object":76,"es5-ext/object/valid-value":77,"es5-ext/string/random-uniq":82,"es6-iterator/for-of":84,"es6-iterator/get":85,"es6-symbol":96}],105:[function(require,module,exports){
'use strict';

var d        = require('d')
  , callable = require('es5-ext/object/valid-callable')

  , apply = Function.prototype.apply, call = Function.prototype.call
  , create = Object.create, defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , descriptor = { configurable: true, enumerable: false, writable: true }

  , on, once, off, emit, methods, descriptors, base;

on = function (type, listener) {
	var data;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) {
		data = descriptor.value = create(null);
		defineProperty(this, '__ee__', descriptor);
		descriptor.value = null;
	} else {
		data = this.__ee__;
	}
	if (!data[type]) data[type] = listener;
	else if (typeof data[type] === 'object') data[type].push(listener);
	else data[type] = [data[type], listener];

	return this;
};

once = function (type, listener) {
	var once, self;

	callable(listener);
	self = this;
	on.call(this, type, once = function () {
		off.call(self, type, once);
		apply.call(listener, this, arguments);
	});

	once.__eeOnceListener__ = listener;
	return this;
};

off = function (type, listener) {
	var data, listeners, candidate, i;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) return this;
	data = this.__ee__;
	if (!data[type]) return this;
	listeners = data[type];

	if (typeof listeners === 'object') {
		for (i = 0; (candidate = listeners[i]); ++i) {
			if ((candidate === listener) ||
					(candidate.__eeOnceListener__ === listener)) {
				if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
				else listeners.splice(i, 1);
			}
		}
	} else {
		if ((listeners === listener) ||
				(listeners.__eeOnceListener__ === listener)) {
			delete data[type];
		}
	}

	return this;
};

emit = function (type) {
	var i, l, listener, listeners, args;

	if (!hasOwnProperty.call(this, '__ee__')) return;
	listeners = this.__ee__[type];
	if (!listeners) return;

	if (typeof listeners === 'object') {
		l = arguments.length;
		args = new Array(l - 1);
		for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

		listeners = listeners.slice();
		for (i = 0; (listener = listeners[i]); ++i) {
			apply.call(listener, this, args);
		}
	} else {
		switch (arguments.length) {
		case 1:
			call.call(listeners, this);
			break;
		case 2:
			call.call(listeners, this, arguments[1]);
			break;
		case 3:
			call.call(listeners, this, arguments[1], arguments[2]);
			break;
		default:
			l = arguments.length;
			args = new Array(l - 1);
			for (i = 1; i < l; ++i) {
				args[i - 1] = arguments[i];
			}
			apply.call(listeners, this, args);
		}
	}
};

methods = {
	on: on,
	once: once,
	off: off,
	emit: emit
};

descriptors = {
	on: d(on),
	once: d(once),
	off: d(off),
	emit: d(emit)
};

base = defineProperties({}, descriptors);

module.exports = exports = function (o) {
	return (o == null) ? create(base) : defineProperties(Object(o), descriptors);
};
exports.methods = methods;

},{"d":22,"es5-ext/object/valid-callable":75}],106:[function(require,module,exports){
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

},{}],107:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":106}],108:[function(require,module,exports){
(function (global){
'use strict';

var origSymbol = global.Symbol;
var hasSymbolSham = require('./shams');

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./shams":109}],109:[function(require,module,exports){
'use strict';

/* eslint complexity: [2, 17], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],110:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":107}],111:[function(require,module,exports){
'use strict';

var fnToStr = Function.prototype.toString;

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isCallable(value) {
	if (!value) { return false; }
	if (typeof value !== 'function' && typeof value !== 'object') { return false; }
	if (typeof value === 'function' && !value.prototype) { return true; }
	if (hasToStringTag) { return tryFunctionObject(value); }
	if (isES6ClassFn(value)) { return false; }
	var strClass = toStr.call(value);
	return strClass === fnClass || strClass === genClass;
};

},{}],112:[function(require,module,exports){
'use strict';

var getDay = Date.prototype.getDay;
var tryDateObject = function tryDateObject(value) {
	try {
		getDay.call(value);
		return true;
	} catch (e) {
		return false;
	}
};

var toStr = Object.prototype.toString;
var dateClass = '[object Date]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isDateObject(value) {
	if (typeof value !== 'object' || value === null) { return false; }
	return hasToStringTag ? tryDateObject(value) : toStr.call(value) === dateClass;
};

},{}],113:[function(require,module,exports){
'use strict';

var has = require('has');
var regexExec = RegExp.prototype.exec;
var gOPD = Object.getOwnPropertyDescriptor;

var tryRegexExecCall = function tryRegexExec(value) {
	try {
		var lastIndex = value.lastIndex;
		value.lastIndex = 0;

		regexExec.call(value);
		return true;
	} catch (e) {
		return false;
	} finally {
		value.lastIndex = lastIndex;
	}
};
var toStr = Object.prototype.toString;
var regexClass = '[object RegExp]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isRegex(value) {
	if (!value || typeof value !== 'object') {
		return false;
	}
	if (!hasToStringTag) {
		return toStr.call(value) === regexClass;
	}

	var descriptor = gOPD(value, 'lastIndex');
	var hasLastIndexDataProperty = descriptor && has(descriptor, 'value');
	if (!hasLastIndexDataProperty) {
		return false;
	}

	return tryRegexExecCall(value);
};

},{"has":110}],114:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;
var hasSymbols = require('has-symbols')();

if (hasSymbols) {
	var symToStr = Symbol.prototype.toString;
	var symStringRegex = /^Symbol\(.*\)$/;
	var isSymbolObject = function isRealSymbolObject(value) {
		if (typeof value.valueOf() !== 'symbol') {
			return false;
		}
		return symStringRegex.test(symToStr.call(value));
	};

	module.exports = function isSymbol(value) {
		if (typeof value === 'symbol') {
			return true;
		}
		if (toStr.call(value) !== '[object Symbol]') {
			return false;
		}
		try {
			return isSymbolObject(value);
		} catch (e) {
			return false;
		}
	};
} else {

	module.exports = function isSymbol(value) {
		// this environment does not support Symbols.
		return false && value;
	};
}

},{"has-symbols":108}],115:[function(require,module,exports){
module.exports = require('cssify');

},{"cssify":20}],116:[function(require,module,exports){
//! moment.js

;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.moment = factory()
}(this, (function () { 'use strict';

    var hookCallback;

    function hooks () {
        return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback (callback) {
        hookCallback = callback;
    }

    function isArray(input) {
        return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
    }

    function isObject(input) {
        // IE8 will treat undefined and null as object if it wasn't for
        // input != null
        return input != null && Object.prototype.toString.call(input) === '[object Object]';
    }

    function isObjectEmpty(obj) {
        if (Object.getOwnPropertyNames) {
            return (Object.getOwnPropertyNames(obj).length === 0);
        } else {
            var k;
            for (k in obj) {
                if (obj.hasOwnProperty(k)) {
                    return false;
                }
            }
            return true;
        }
    }

    function isUndefined(input) {
        return input === void 0;
    }

    function isNumber(input) {
        return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
    }

    function isDate(input) {
        return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }

    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function createUTC (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
        // We need to deep clone this object.
        return {
            empty           : false,
            unusedTokens    : [],
            unusedInput     : [],
            overflow        : -2,
            charsLeftOver   : 0,
            nullInput       : false,
            invalidMonth    : null,
            invalidFormat   : false,
            userInvalidated : false,
            iso             : false,
            parsedDateParts : [],
            meridiem        : null,
            rfc2822         : false,
            weekdayMismatch : false
        };
    }

    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }

    var some;
    if (Array.prototype.some) {
        some = Array.prototype.some;
    } else {
        some = function (fun) {
            var t = Object(this);
            var len = t.length >>> 0;

            for (var i = 0; i < len; i++) {
                if (i in t && fun.call(this, t[i], i, t)) {
                    return true;
                }
            }

            return false;
        };
    }

    function isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m);
            var parsedParts = some.call(flags.parsedDateParts, function (i) {
                return i != null;
            });
            var isNowValid = !isNaN(m._d.getTime()) &&
                flags.overflow < 0 &&
                !flags.empty &&
                !flags.invalidMonth &&
                !flags.invalidWeekday &&
                !flags.weekdayMismatch &&
                !flags.nullInput &&
                !flags.invalidFormat &&
                !flags.userInvalidated &&
                (!flags.meridiem || (flags.meridiem && parsedParts));

            if (m._strict) {
                isNowValid = isNowValid &&
                    flags.charsLeftOver === 0 &&
                    flags.unusedTokens.length === 0 &&
                    flags.bigHour === undefined;
            }

            if (Object.isFrozen == null || !Object.isFrozen(m)) {
                m._isValid = isNowValid;
            }
            else {
                return isNowValid;
            }
        }
        return m._isValid;
    }

    function createInvalid (flags) {
        var m = createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        }
        else {
            getParsingFlags(m).userInvalidated = true;
        }

        return m;
    }

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    var momentProperties = hooks.momentProperties = [];

    function copyConfig(to, from) {
        var i, prop, val;

        if (!isUndefined(from._isAMomentObject)) {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (!isUndefined(from._i)) {
            to._i = from._i;
        }
        if (!isUndefined(from._f)) {
            to._f = from._f;
        }
        if (!isUndefined(from._l)) {
            to._l = from._l;
        }
        if (!isUndefined(from._strict)) {
            to._strict = from._strict;
        }
        if (!isUndefined(from._tzm)) {
            to._tzm = from._tzm;
        }
        if (!isUndefined(from._isUTC)) {
            to._isUTC = from._isUTC;
        }
        if (!isUndefined(from._offset)) {
            to._offset = from._offset;
        }
        if (!isUndefined(from._pf)) {
            to._pf = getParsingFlags(from);
        }
        if (!isUndefined(from._locale)) {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i = 0; i < momentProperties.length; i++) {
                prop = momentProperties[i];
                val = from[prop];
                if (!isUndefined(val)) {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    var updateInProgress = false;

    // Moment prototype object
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
        if (!this.isValid()) {
            this._d = new Date(NaN);
        }
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    function isMoment (obj) {
        return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
    }

    function absFloor (number) {
        if (number < 0) {
            // -0 -> 0
            return Math.ceil(number) || 0;
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function warn(msg) {
        if (hooks.suppressDeprecationWarnings === false &&
                (typeof console !==  'undefined') && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;

        return extend(function () {
            if (hooks.deprecationHandler != null) {
                hooks.deprecationHandler(null, msg);
            }
            if (firstTime) {
                var args = [];
                var arg;
                for (var i = 0; i < arguments.length; i++) {
                    arg = '';
                    if (typeof arguments[i] === 'object') {
                        arg += '\n[' + i + '] ';
                        for (var key in arguments[0]) {
                            arg += key + ': ' + arguments[0][key] + ', ';
                        }
                        arg = arg.slice(0, -2); // Remove trailing comma and space
                    } else {
                        arg = arguments[i];
                    }
                    args.push(arg);
                }
                warn(msg + '\nArguments: ' + Array.prototype.slice.call(args).join('') + '\n' + (new Error()).stack);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
        if (hooks.deprecationHandler != null) {
            hooks.deprecationHandler(name, msg);
        }
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }

    hooks.suppressDeprecationWarnings = false;
    hooks.deprecationHandler = null;

    function isFunction(input) {
        return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
    }

    function set (config) {
        var prop, i;
        for (i in config) {
            prop = config[i];
            if (isFunction(prop)) {
                this[i] = prop;
            } else {
                this['_' + i] = prop;
            }
        }
        this._config = config;
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
        // TODO: Remove "ordinalParse" fallback in next major release.
        this._dayOfMonthOrdinalParseLenient = new RegExp(
            (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
                '|' + (/\d{1,2}/).source);
    }

    function mergeConfigs(parentConfig, childConfig) {
        var res = extend({}, parentConfig), prop;
        for (prop in childConfig) {
            if (hasOwnProp(childConfig, prop)) {
                if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                    res[prop] = {};
                    extend(res[prop], parentConfig[prop]);
                    extend(res[prop], childConfig[prop]);
                } else if (childConfig[prop] != null) {
                    res[prop] = childConfig[prop];
                } else {
                    delete res[prop];
                }
            }
        }
        for (prop in parentConfig) {
            if (hasOwnProp(parentConfig, prop) &&
                    !hasOwnProp(childConfig, prop) &&
                    isObject(parentConfig[prop])) {
                // make sure changes to properties don't modify parent config
                res[prop] = extend({}, res[prop]);
            }
        }
        return res;
    }

    function Locale(config) {
        if (config != null) {
            this.set(config);
        }
    }

    var keys;

    if (Object.keys) {
        keys = Object.keys;
    } else {
        keys = function (obj) {
            var i, res = [];
            for (i in obj) {
                if (hasOwnProp(obj, i)) {
                    res.push(i);
                }
            }
            return res;
        };
    }

    var defaultCalendar = {
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        nextWeek : 'dddd [at] LT',
        lastDay : '[Yesterday at] LT',
        lastWeek : '[Last] dddd [at] LT',
        sameElse : 'L'
    };

    function calendar (key, mom, now) {
        var output = this._calendar[key] || this._calendar['sameElse'];
        return isFunction(output) ? output.call(mom, now) : output;
    }

    var defaultLongDateFormat = {
        LTS  : 'h:mm:ss A',
        LT   : 'h:mm A',
        L    : 'MM/DD/YYYY',
        LL   : 'MMMM D, YYYY',
        LLL  : 'MMMM D, YYYY h:mm A',
        LLLL : 'dddd, MMMM D, YYYY h:mm A'
    };

    function longDateFormat (key) {
        var format = this._longDateFormat[key],
            formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate () {
        return this._invalidDate;
    }

    var defaultOrdinal = '%d';
    var defaultDayOfMonthOrdinalParse = /\d{1,2}/;

    function ordinal (number) {
        return this._ordinal.replace('%d', number);
    }

    var defaultRelativeTime = {
        future : 'in %s',
        past   : '%s ago',
        s  : 'a few seconds',
        ss : '%d seconds',
        m  : 'a minute',
        mm : '%d minutes',
        h  : 'an hour',
        hh : '%d hours',
        d  : 'a day',
        dd : '%d days',
        M  : 'a month',
        MM : '%d months',
        y  : 'a year',
        yy : '%d years'
    };

    function relativeTime (number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return (isFunction(output)) ?
            output(number, withoutSuffix, string, isFuture) :
            output.replace(/%d/i, number);
    }

    function pastFuture (diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return isFunction(format) ? format(output) : format.replace(/%s/i, output);
    }

    var aliases = {};

    function addUnitAlias (unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
        return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    var priorities = {};

    function addUnitPriority(unit, priority) {
        priorities[unit] = priority;
    }

    function getPrioritizedUnits(unitsObj) {
        var units = [];
        for (var u in unitsObj) {
            units.push({unit: u, priority: priorities[u]});
        }
        units.sort(function (a, b) {
            return a.priority - b.priority;
        });
        return units;
    }

    function zeroFill(number, targetLength, forceSign) {
        var absNumber = '' + Math.abs(number),
            zerosToFill = targetLength - absNumber.length,
            sign = number >= 0;
        return (sign ? (forceSign ? '+' : '') : '-') +
            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

    var formatFunctions = {};

    var formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken (token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === 'string') {
            func = function () {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function () {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function () {
                return this.localeData().ordinal(func.apply(this, arguments), token);
            };
        }
    }

    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '', i;
            for (i = 0; i < length; i++) {
                output += isFunction(array[i]) ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());
        formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }

    var match1         = /\d/;            //       0 - 9
    var match2         = /\d\d/;          //      00 - 99
    var match3         = /\d{3}/;         //     000 - 999
    var match4         = /\d{4}/;         //    0000 - 9999
    var match6         = /[+-]?\d{6}/;    // -999999 - 999999
    var match1to2      = /\d\d?/;         //       0 - 99
    var match3to4      = /\d\d\d\d?/;     //     999 - 9999
    var match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
    var match1to3      = /\d{1,3}/;       //       0 - 999
    var match1to4      = /\d{1,4}/;       //       0 - 9999
    var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

    var matchUnsigned  = /\d+/;           //       0 - inf
    var matchSigned    = /[+-]?\d+/;      //    -inf - inf

    var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
    var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

    // any word (or two) characters or numbers including two/three word month in arabic.
    // includes scottish gaelic two word and hyphenated months
    var matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i;

    var regexes = {};

    function addRegexToken (token, regex, strictRegex) {
        regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
            return (isStrict && strictRegex) ? strictRegex : regex;
        };
    }

    function getParseRegexForToken (token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }

        return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
        return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        }));
    }

    function regexEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken (token, callback) {
        var i, func = callback;
        if (typeof token === 'string') {
            token = [token];
        }
        if (isNumber(callback)) {
            func = function (input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }

    function addWeekParseToken (token, callback) {
        addParseToken(token, function (input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }

    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }

    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;
    var WEEK = 7;
    var WEEKDAY = 8;

    // FORMATTING

    addFormatToken('Y', 0, 0, function () {
        var y = this.year();
        return y <= 9999 ? '' + y : '+' + y;
    });

    addFormatToken(0, ['YY', 2], 0, function () {
        return this.year() % 100;
    });

    addFormatToken(0, ['YYYY',   4],       0, 'year');
    addFormatToken(0, ['YYYYY',  5],       0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PRIORITIES

    addUnitPriority('year', 1);

    // PARSING

    addRegexToken('Y',      matchSigned);
    addRegexToken('YY',     match1to2, match2);
    addRegexToken('YYYY',   match1to4, match4);
    addRegexToken('YYYYY',  match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
        array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
        array[YEAR] = hooks.parseTwoDigitYear(input);
    });
    addParseToken('Y', function (input, array) {
        array[YEAR] = parseInt(input, 10);
    });

    // HELPERS

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    // HOOKS

    hooks.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', true);

    function getIsLeapYear () {
        return isLeapYear(this.year());
    }

    function makeGetSet (unit, keepTime) {
        return function (value) {
            if (value != null) {
                set$1(this, unit, value);
                hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get(this, unit);
            }
        };
    }

    function get (mom, unit) {
        return mom.isValid() ?
            mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
    }

    function set$1 (mom, unit, value) {
        if (mom.isValid() && !isNaN(value)) {
            if (unit === 'FullYear' && isLeapYear(mom.year()) && mom.month() === 1 && mom.date() === 29) {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value, mom.month(), daysInMonth(value, mom.month()));
            }
            else {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
            }
        }
    }

    // MOMENTS

    function stringGet (units) {
        units = normalizeUnits(units);
        if (isFunction(this[units])) {
            return this[units]();
        }
        return this;
    }


    function stringSet (units, value) {
        if (typeof units === 'object') {
            units = normalizeObjectUnits(units);
            var prioritized = getPrioritizedUnits(units);
            for (var i = 0; i < prioritized.length; i++) {
                this[prioritized[i].unit](units[prioritized[i].unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (isFunction(this[units])) {
                return this[units](value);
            }
        }
        return this;
    }

    function mod(n, x) {
        return ((n % x) + x) % x;
    }

    var indexOf;

    if (Array.prototype.indexOf) {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function (o) {
            // I know
            var i;
            for (i = 0; i < this.length; ++i) {
                if (this[i] === o) {
                    return i;
                }
            }
            return -1;
        };
    }

    function daysInMonth(year, month) {
        if (isNaN(year) || isNaN(month)) {
            return NaN;
        }
        var modMonth = mod(month, 12);
        year += (month - modMonth) / 12;
        return modMonth === 1 ? (isLeapYear(year) ? 29 : 28) : (31 - modMonth % 7 % 2);
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
        return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
        return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PRIORITY

    addUnitPriority('month', 8);

    // PARSING

    addRegexToken('M',    match1to2);
    addRegexToken('MM',   match1to2, match2);
    addRegexToken('MMM',  function (isStrict, locale) {
        return locale.monthsShortRegex(isStrict);
    });
    addRegexToken('MMMM', function (isStrict, locale) {
        return locale.monthsRegex(isStrict);
    });

    addParseToken(['M', 'MM'], function (input, array) {
        array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        // if we didn't find a month name, mark the date as invalid.
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });

    // LOCALES

    var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/;
    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
    function localeMonths (m, format) {
        if (!m) {
            return isArray(this._months) ? this._months :
                this._months['standalone'];
        }
        return isArray(this._months) ? this._months[m.month()] :
            this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
    }

    var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
    function localeMonthsShort (m, format) {
        if (!m) {
            return isArray(this._monthsShort) ? this._monthsShort :
                this._monthsShort['standalone'];
        }
        return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
            this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
    }

    function handleStrictParse(monthName, format, strict) {
        var i, ii, mom, llc = monthName.toLocaleLowerCase();
        if (!this._monthsParse) {
            // this is not used
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
            for (i = 0; i < 12; ++i) {
                mom = createUTC([2000, i]);
                this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
                this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeMonthsParse (monthName, format, strict) {
        var i, mom, regex;

        if (this._monthsParseExact) {
            return handleStrictParse.call(this, monthName, format, strict);
        }

        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }

        // TODO: add sorting
        // Sorting makes sure if one month (or abbr) is a prefix of another
        // see sorting in computeMonthsParse
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
            }
            if (!strict && !this._monthsParse[i]) {
                regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                return i;
            } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function setMonth (mom, value) {
        var dayOfMonth;

        if (!mom.isValid()) {
            // No op
            return mom;
        }

        if (typeof value === 'string') {
            if (/^\d+$/.test(value)) {
                value = toInt(value);
            } else {
                value = mom.localeData().monthsParse(value);
                // TODO: Another silent failure?
                if (!isNumber(value)) {
                    return mom;
                }
            }
        }

        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function getSetMonth (value) {
        if (value != null) {
            setMonth(this, value);
            hooks.updateOffset(this, true);
            return this;
        } else {
            return get(this, 'Month');
        }
    }

    function getDaysInMonth () {
        return daysInMonth(this.year(), this.month());
    }

    var defaultMonthsShortRegex = matchWord;
    function monthsShortRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsShortStrictRegex;
            } else {
                return this._monthsShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsShortRegex')) {
                this._monthsShortRegex = defaultMonthsShortRegex;
            }
            return this._monthsShortStrictRegex && isStrict ?
                this._monthsShortStrictRegex : this._monthsShortRegex;
        }
    }

    var defaultMonthsRegex = matchWord;
    function monthsRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsStrictRegex;
            } else {
                return this._monthsRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsRegex')) {
                this._monthsRegex = defaultMonthsRegex;
            }
            return this._monthsStrictRegex && isStrict ?
                this._monthsStrictRegex : this._monthsRegex;
        }
    }

    function computeMonthsParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom;
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            shortPieces.push(this.monthsShort(mom, ''));
            longPieces.push(this.months(mom, ''));
            mixedPieces.push(this.months(mom, ''));
            mixedPieces.push(this.monthsShort(mom, ''));
        }
        // Sorting makes sure if one month (or abbr) is a prefix of another it
        // will match the longer piece.
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 12; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
        }
        for (i = 0; i < 24; i++) {
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._monthsShortRegex = this._monthsRegex;
        this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    }

    function createDate (y, m, d, h, M, s, ms) {
        // can't just apply() to create a date:
        // https://stackoverflow.com/q/181348
        var date;
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            date = new Date(y + 400, m, d, h, M, s, ms);
            if (isFinite(date.getFullYear())) {
                date.setFullYear(y);
            }
        } else {
            date = new Date(y, m, d, h, M, s, ms);
        }

        return date;
    }

    function createUTCDate (y) {
        var date;
        // the Date.UTC function remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            var args = Array.prototype.slice.call(arguments);
            // preserve leap years using a full 400 year cycle, then reset
            args[0] = y + 400;
            date = new Date(Date.UTC.apply(null, args));
            if (isFinite(date.getUTCFullYear())) {
                date.setUTCFullYear(y);
            }
        } else {
            date = new Date(Date.UTC.apply(null, arguments));
        }

        return date;
    }

    // start-of-first-week - start-of-year
    function firstWeekOffset(year, dow, doy) {
        var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
            fwd = 7 + dow - doy,
            // first-week day local weekday -- which local weekday is fwd
            fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

        return -fwdlw + fwd - 1;
    }

    // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
        var localWeekday = (7 + weekday - dow) % 7,
            weekOffset = firstWeekOffset(year, dow, doy),
            dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
            resYear, resDayOfYear;

        if (dayOfYear <= 0) {
            resYear = year - 1;
            resDayOfYear = daysInYear(resYear) + dayOfYear;
        } else if (dayOfYear > daysInYear(year)) {
            resYear = year + 1;
            resDayOfYear = dayOfYear - daysInYear(year);
        } else {
            resYear = year;
            resDayOfYear = dayOfYear;
        }

        return {
            year: resYear,
            dayOfYear: resDayOfYear
        };
    }

    function weekOfYear(mom, dow, doy) {
        var weekOffset = firstWeekOffset(mom.year(), dow, doy),
            week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
            resWeek, resYear;

        if (week < 1) {
            resYear = mom.year() - 1;
            resWeek = week + weeksInYear(resYear, dow, doy);
        } else if (week > weeksInYear(mom.year(), dow, doy)) {
            resWeek = week - weeksInYear(mom.year(), dow, doy);
            resYear = mom.year() + 1;
        } else {
            resYear = mom.year();
            resWeek = week;
        }

        return {
            week: resWeek,
            year: resYear
        };
    }

    function weeksInYear(year, dow, doy) {
        var weekOffset = firstWeekOffset(year, dow, doy),
            weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
        return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
    }

    // FORMATTING

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PRIORITIES

    addUnitPriority('week', 5);
    addUnitPriority('isoWeek', 5);

    // PARSING

    addRegexToken('w',  match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W',  match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
        week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // LOCALES

    function localeWeek (mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
        dow : 0, // Sunday is the first day of the week.
        doy : 6  // The week that contains Jan 6th is the first week of the year.
    };

    function localeFirstDayOfWeek () {
        return this._week.dow;
    }

    function localeFirstDayOfYear () {
        return this._week.doy;
    }

    // MOMENTS

    function getSetWeek (input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek (input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    // FORMATTING

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
        return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
        return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
        return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PRIORITY
    addUnitPriority('day', 11);
    addUnitPriority('weekday', 11);
    addUnitPriority('isoWeekday', 11);

    // PARSING

    addRegexToken('d',    match1to2);
    addRegexToken('e',    match1to2);
    addRegexToken('E',    match1to2);
    addRegexToken('dd',   function (isStrict, locale) {
        return locale.weekdaysMinRegex(isStrict);
    });
    addRegexToken('ddd',   function (isStrict, locale) {
        return locale.weekdaysShortRegex(isStrict);
    });
    addRegexToken('dddd',   function (isStrict, locale) {
        return locale.weekdaysRegex(isStrict);
    });

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
        var weekday = config._locale.weekdaysParse(input, token, config._strict);
        // if we didn't get a weekday name, mark the date as invalid
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
        week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
        if (typeof input !== 'string') {
            return input;
        }

        if (!isNaN(input)) {
            return parseInt(input, 10);
        }

        input = locale.weekdaysParse(input);
        if (typeof input === 'number') {
            return input;
        }

        return null;
    }

    function parseIsoWeekday(input, locale) {
        if (typeof input === 'string') {
            return locale.weekdaysParse(input) % 7 || 7;
        }
        return isNaN(input) ? null : input;
    }

    // LOCALES
    function shiftWeekdays (ws, n) {
        return ws.slice(n, 7).concat(ws.slice(0, n));
    }

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
    function localeWeekdays (m, format) {
        var weekdays = isArray(this._weekdays) ? this._weekdays :
            this._weekdays[(m && m !== true && this._weekdays.isFormat.test(format)) ? 'format' : 'standalone'];
        return (m === true) ? shiftWeekdays(weekdays, this._week.dow)
            : (m) ? weekdays[m.day()] : weekdays;
    }

    var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
    function localeWeekdaysShort (m) {
        return (m === true) ? shiftWeekdays(this._weekdaysShort, this._week.dow)
            : (m) ? this._weekdaysShort[m.day()] : this._weekdaysShort;
    }

    var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
    function localeWeekdaysMin (m) {
        return (m === true) ? shiftWeekdays(this._weekdaysMin, this._week.dow)
            : (m) ? this._weekdaysMin[m.day()] : this._weekdaysMin;
    }

    function handleStrictParse$1(weekdayName, format, strict) {
        var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._minWeekdaysParse = [];

            for (i = 0; i < 7; ++i) {
                mom = createUTC([2000, 1]).day(i);
                this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
                this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
                this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeWeekdaysParse (weekdayName, format, strict) {
        var i, mom, regex;

        if (this._weekdaysParseExact) {
            return handleStrictParse$1.call(this, weekdayName, format, strict);
        }

        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._minWeekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._fullWeekdaysParse = [];
        }

        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already

            mom = createUTC([2000, 1]).day(i);
            if (strict && !this._fullWeekdaysParse[i]) {
                this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\\.?') + '$', 'i');
                this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$', 'i');
                this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$', 'i');
            }
            if (!this._weekdaysParse[i]) {
                regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function getSetDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, 'd');
        } else {
            return day;
        }
    }

    function getSetLocaleDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }

        // behaves the same as moment#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.

        if (input != null) {
            var weekday = parseIsoWeekday(input, this.localeData());
            return this.day(this.day() % 7 ? weekday : weekday - 7);
        } else {
            return this.day() || 7;
        }
    }

    var defaultWeekdaysRegex = matchWord;
    function weekdaysRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysStrictRegex;
            } else {
                return this._weekdaysRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                this._weekdaysRegex = defaultWeekdaysRegex;
            }
            return this._weekdaysStrictRegex && isStrict ?
                this._weekdaysStrictRegex : this._weekdaysRegex;
        }
    }

    var defaultWeekdaysShortRegex = matchWord;
    function weekdaysShortRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysShortStrictRegex;
            } else {
                return this._weekdaysShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysShortRegex')) {
                this._weekdaysShortRegex = defaultWeekdaysShortRegex;
            }
            return this._weekdaysShortStrictRegex && isStrict ?
                this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
        }
    }

    var defaultWeekdaysMinRegex = matchWord;
    function weekdaysMinRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysMinStrictRegex;
            } else {
                return this._weekdaysMinRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysMinRegex')) {
                this._weekdaysMinRegex = defaultWeekdaysMinRegex;
            }
            return this._weekdaysMinStrictRegex && isStrict ?
                this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
        }
    }


    function computeWeekdaysParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom, minp, shortp, longp;
        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, 1]).day(i);
            minp = this.weekdaysMin(mom, '');
            shortp = this.weekdaysShort(mom, '');
            longp = this.weekdays(mom, '');
            minPieces.push(minp);
            shortPieces.push(shortp);
            longPieces.push(longp);
            mixedPieces.push(minp);
            mixedPieces.push(shortp);
            mixedPieces.push(longp);
        }
        // Sorting makes sure if one weekday (or abbr) is a prefix of another it
        // will match the longer piece.
        minPieces.sort(cmpLenRev);
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 7; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._weekdaysShortRegex = this._weekdaysRegex;
        this._weekdaysMinRegex = this._weekdaysRegex;

        this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
        this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
    }

    // FORMATTING

    function hFormat() {
        return this.hours() % 12 || 12;
    }

    function kFormat() {
        return this.hours() || 24;
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, hFormat);
    addFormatToken('k', ['kk', 2], 0, kFormat);

    addFormatToken('hmm', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
    });

    addFormatToken('hmmss', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    addFormatToken('Hmm', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2);
    });

    addFormatToken('Hmmss', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    function meridiem (token, lowercase) {
        addFormatToken(token, 0, 0, function () {
            return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
        });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PRIORITY
    addUnitPriority('hour', 13);

    // PARSING

    function matchMeridiem (isStrict, locale) {
        return locale._meridiemParse;
    }

    addRegexToken('a',  matchMeridiem);
    addRegexToken('A',  matchMeridiem);
    addRegexToken('H',  match1to2);
    addRegexToken('h',  match1to2);
    addRegexToken('k',  match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);
    addRegexToken('kk', match1to2, match2);

    addRegexToken('hmm', match3to4);
    addRegexToken('hmmss', match5to6);
    addRegexToken('Hmm', match3to4);
    addRegexToken('Hmmss', match5to6);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['k', 'kk'], function (input, array, config) {
        var kInput = toInt(input);
        array[HOUR] = kInput === 24 ? 0 : kInput;
    });
    addParseToken(['a', 'A'], function (input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('Hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
    });
    addParseToken('Hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
    });

    // LOCALES

    function localeIsPM (input) {
        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
        // Using charAt should be more compatible.
        return ((input + '').toLowerCase().charAt(0) === 'p');
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem (hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? 'pm' : 'PM';
        } else {
            return isLower ? 'am' : 'AM';
        }
    }


    // MOMENTS

    // Setting the hour should keep the time, because the user explicitly
    // specified which hour they want. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    var getSetHour = makeGetSet('Hours', true);

    var baseConfig = {
        calendar: defaultCalendar,
        longDateFormat: defaultLongDateFormat,
        invalidDate: defaultInvalidDate,
        ordinal: defaultOrdinal,
        dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
        relativeTime: defaultRelativeTime,

        months: defaultLocaleMonths,
        monthsShort: defaultLocaleMonthsShort,

        week: defaultLocaleWeek,

        weekdays: defaultLocaleWeekdays,
        weekdaysMin: defaultLocaleWeekdaysMin,
        weekdaysShort: defaultLocaleWeekdaysShort,

        meridiemParse: defaultLocaleMeridiemParse
    };

    // internal storage for locale config files
    var locales = {};
    var localeFamilies = {};
    var globalLocale;

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return globalLocale;
    }

    function loadLocale(name) {
        var oldLocale = null;
        // TODO: Find a better way to register and load all the locales in Node
        if (!locales[name] && (typeof module !== 'undefined') &&
                module && module.exports) {
            try {
                oldLocale = globalLocale._abbr;
                var aliasedRequire = require;
                aliasedRequire('./locale/' + name);
                getSetGlobalLocale(oldLocale);
            } catch (e) {}
        }
        return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function getSetGlobalLocale (key, values) {
        var data;
        if (key) {
            if (isUndefined(values)) {
                data = getLocale(key);
            }
            else {
                data = defineLocale(key, values);
            }

            if (data) {
                // moment.duration._locale = moment._locale = data;
                globalLocale = data;
            }
            else {
                if ((typeof console !==  'undefined') && console.warn) {
                    //warn user if arguments are passed but the locale could not be set
                    console.warn('Locale ' + key +  ' not found. Did you forget to load it?');
                }
            }
        }

        return globalLocale._abbr;
    }

    function defineLocale (name, config) {
        if (config !== null) {
            var locale, parentConfig = baseConfig;
            config.abbr = name;
            if (locales[name] != null) {
                deprecateSimple('defineLocaleOverride',
                        'use moment.updateLocale(localeName, config) to change ' +
                        'an existing locale. moment.defineLocale(localeName, ' +
                        'config) should only be used for creating a new locale ' +
                        'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
                parentConfig = locales[name]._config;
            } else if (config.parentLocale != null) {
                if (locales[config.parentLocale] != null) {
                    parentConfig = locales[config.parentLocale]._config;
                } else {
                    locale = loadLocale(config.parentLocale);
                    if (locale != null) {
                        parentConfig = locale._config;
                    } else {
                        if (!localeFamilies[config.parentLocale]) {
                            localeFamilies[config.parentLocale] = [];
                        }
                        localeFamilies[config.parentLocale].push({
                            name: name,
                            config: config
                        });
                        return null;
                    }
                }
            }
            locales[name] = new Locale(mergeConfigs(parentConfig, config));

            if (localeFamilies[name]) {
                localeFamilies[name].forEach(function (x) {
                    defineLocale(x.name, x.config);
                });
            }

            // backwards compat for now: also set the locale
            // make sure we set the locale AFTER all child locales have been
            // created, so we won't end up with the child locale set.
            getSetGlobalLocale(name);


            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    }

    function updateLocale(name, config) {
        if (config != null) {
            var locale, tmpLocale, parentConfig = baseConfig;
            // MERGE
            tmpLocale = loadLocale(name);
            if (tmpLocale != null) {
                parentConfig = tmpLocale._config;
            }
            config = mergeConfigs(parentConfig, config);
            locale = new Locale(config);
            locale.parentLocale = locales[name];
            locales[name] = locale;

            // backwards compat for now: also set the locale
            getSetGlobalLocale(name);
        } else {
            // pass null for config to unupdate, useful for tests
            if (locales[name] != null) {
                if (locales[name].parentLocale != null) {
                    locales[name] = locales[name].parentLocale;
                } else if (locales[name] != null) {
                    delete locales[name];
                }
            }
        }
        return locales[name];
    }

    // returns locale data
    function getLocale (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return globalLocale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    }

    function listLocales() {
        return keys(locales);
    }

    function checkOverflow (m) {
        var overflow;
        var a = m._a;

        if (a && getParsingFlags(m).overflow === -2) {
            overflow =
                a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
                a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
                a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }
            if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
                overflow = WEEK;
            }
            if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
                overflow = WEEKDAY;
            }

            getParsingFlags(m).overflow = overflow;
        }

        return m;
    }

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }

    function currentDateArray(config) {
        // hooks is actually the exported moment object
        var nowValue = new Date(hooks.now());
        if (config._useUTC) {
            return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
        }
        return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray (config) {
        var i, date, input = [], currentDate, expectedWeekday, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear != null) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse) || config._dayOfYear === 0) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }

            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
        expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();

        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }

        // check for mismatching day of week
        if (config._w && typeof config._w.d !== 'undefined' && config._w.d !== expectedWeekday) {
            getParsingFlags(config).weekdayMismatch = true;
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(createLocal(), 1, 4).year);
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
            if (weekday < 1 || weekday > 7) {
                weekdayOverflow = true;
            }
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            var curWeek = weekOfYear(createLocal(), dow, doy);

            weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

            // Default to current week.
            week = defaults(w.w, curWeek.week);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < 0 || weekday > 6) {
                    weekdayOverflow = true;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from beginning of week
                weekday = w.e + dow;
                if (w.e < 0 || w.e > 6) {
                    weekdayOverflow = true;
                }
            } else {
                // default to beginning of week
                weekday = dow;
            }
        }
        if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
            getParsingFlags(config)._overflowWeeks = true;
        } else if (weekdayOverflow != null) {
            getParsingFlags(config)._overflowWeekday = true;
        } else {
            temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }
    }

    // iso 8601 regex
    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
    var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
    var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

    var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

    var isoDates = [
        ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
        ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
        ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
        ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
        ['YYYY-DDD', /\d{4}-\d{3}/],
        ['YYYY-MM', /\d{4}-\d\d/, false],
        ['YYYYYYMMDD', /[+-]\d{10}/],
        ['YYYYMMDD', /\d{8}/],
        // YYYYMM is NOT allowed by the standard
        ['GGGG[W]WWE', /\d{4}W\d{3}/],
        ['GGGG[W]WW', /\d{4}W\d{2}/, false],
        ['YYYYDDD', /\d{7}/]
    ];

    // iso time formats and regexes
    var isoTimes = [
        ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
        ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
        ['HH:mm:ss', /\d\d:\d\d:\d\d/],
        ['HH:mm', /\d\d:\d\d/],
        ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
        ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
        ['HHmmss', /\d\d\d\d\d\d/],
        ['HHmm', /\d\d\d\d/],
        ['HH', /\d\d/]
    ];

    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

    // date from iso format
    function configFromISO(config) {
        var i, l,
            string = config._i,
            match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
            allowTime, dateFormat, timeFormat, tzFormat;

        if (match) {
            getParsingFlags(config).iso = true;

            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(match[1])) {
                    dateFormat = isoDates[i][0];
                    allowTime = isoDates[i][2] !== false;
                    break;
                }
            }
            if (dateFormat == null) {
                config._isValid = false;
                return;
            }
            if (match[3]) {
                for (i = 0, l = isoTimes.length; i < l; i++) {
                    if (isoTimes[i][1].exec(match[3])) {
                        // match[2] should be 'T' or space
                        timeFormat = (match[2] || ' ') + isoTimes[i][0];
                        break;
                    }
                }
                if (timeFormat == null) {
                    config._isValid = false;
                    return;
                }
            }
            if (!allowTime && timeFormat != null) {
                config._isValid = false;
                return;
            }
            if (match[4]) {
                if (tzRegex.exec(match[4])) {
                    tzFormat = 'Z';
                } else {
                    config._isValid = false;
                    return;
                }
            }
            config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
    var rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;

    function extractFromRFC2822Strings(yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
        var result = [
            untruncateYear(yearStr),
            defaultLocaleMonthsShort.indexOf(monthStr),
            parseInt(dayStr, 10),
            parseInt(hourStr, 10),
            parseInt(minuteStr, 10)
        ];

        if (secondStr) {
            result.push(parseInt(secondStr, 10));
        }

        return result;
    }

    function untruncateYear(yearStr) {
        var year = parseInt(yearStr, 10);
        if (year <= 49) {
            return 2000 + year;
        } else if (year <= 999) {
            return 1900 + year;
        }
        return year;
    }

    function preprocessRFC2822(s) {
        // Remove comments and folding whitespace and replace multiple-spaces with a single space
        return s.replace(/\([^)]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }

    function checkWeekday(weekdayStr, parsedInput, config) {
        if (weekdayStr) {
            // TODO: Replace the vanilla JS Date object with an indepentent day-of-week check.
            var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
                weekdayActual = new Date(parsedInput[0], parsedInput[1], parsedInput[2]).getDay();
            if (weekdayProvided !== weekdayActual) {
                getParsingFlags(config).weekdayMismatch = true;
                config._isValid = false;
                return false;
            }
        }
        return true;
    }

    var obsOffsets = {
        UT: 0,
        GMT: 0,
        EDT: -4 * 60,
        EST: -5 * 60,
        CDT: -5 * 60,
        CST: -6 * 60,
        MDT: -6 * 60,
        MST: -7 * 60,
        PDT: -7 * 60,
        PST: -8 * 60
    };

    function calculateOffset(obsOffset, militaryOffset, numOffset) {
        if (obsOffset) {
            return obsOffsets[obsOffset];
        } else if (militaryOffset) {
            // the only allowed military tz is Z
            return 0;
        } else {
            var hm = parseInt(numOffset, 10);
            var m = hm % 100, h = (hm - m) / 100;
            return h * 60 + m;
        }
    }

    // date and time from ref 2822 format
    function configFromRFC2822(config) {
        var match = rfc2822.exec(preprocessRFC2822(config._i));
        if (match) {
            var parsedArray = extractFromRFC2822Strings(match[4], match[3], match[2], match[5], match[6], match[7]);
            if (!checkWeekday(match[1], parsedArray, config)) {
                return;
            }

            config._a = parsedArray;
            config._tzm = calculateOffset(match[8], match[9], match[10]);

            config._d = createUTCDate.apply(null, config._a);
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

            getParsingFlags(config).rfc2822 = true;
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);

        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }

        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        configFromRFC2822(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        // Final attempt, use Input Fallback
        hooks.createFromInputFallback(config);
    }

    hooks.createFromInputFallback = deprecate(
        'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
        'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
        'discouraged and will be removed in an upcoming major release. Please refer to ' +
        'http://momentjs.com/guides/#/warnings/js-date/ for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // constant that refers to the ISO standard
    hooks.ISO_8601 = function () {};

    // constant that refers to the RFC 2822 form
    hooks.RFC_2822 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
        // TODO: Move this to another part of the creation flow to prevent circular deps
        if (config._f === hooks.ISO_8601) {
            configFromISO(config);
            return;
        }
        if (config._f === hooks.RFC_2822) {
            configFromRFC2822(config);
            return;
        }
        config._a = [];
        getParsingFlags(config).empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            // console.log('token', token, 'parsedInput', parsedInput,
            //         'regex', getParseRegexForToken(token, config));
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                }
                else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._a[HOUR] <= 12 &&
            getParsingFlags(config).bigHour === true &&
            config._a[HOUR] > 0) {
            getParsingFlags(config).bigHour = undefined;
        }

        getParsingFlags(config).parsedDateParts = config._a.slice(0);
        getParsingFlags(config).meridiem = config._meridiem;
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

        configFromArray(config);
        checkOverflow(config);
    }


    function meridiemFixWrap (locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // this is not supposed to happen
            return hour;
        }
    }

    // date from string and array of format strings
    function configFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += getParsingFlags(tempConfig).charsLeftOver;

            //or tokens
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

            getParsingFlags(tempConfig).score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
        if (config._d) {
            return;
        }

        var i = normalizeObjectUnits(config._i);
        config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
            return obj && parseInt(obj, 10);
        });

        configFromArray(config);
    }

    function createFromConfig (config) {
        var res = new Moment(checkOverflow(prepareConfig(config)));
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    function prepareConfig (config) {
        var input = config._i,
            format = config._f;

        config._locale = config._locale || getLocale(config._l);

        if (input === null || (format === undefined && input === '')) {
            return createInvalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isDate(input)) {
            config._d = input;
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        }  else {
            configFromInput(config);
        }

        if (!isValid(config)) {
            config._d = null;
        }

        return config;
    }

    function configFromInput(config) {
        var input = config._i;
        if (isUndefined(input)) {
            config._d = new Date(hooks.now());
        } else if (isDate(input)) {
            config._d = new Date(input.valueOf());
        } else if (typeof input === 'string') {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (isObject(input)) {
            configFromObject(config);
        } else if (isNumber(input)) {
            // from milliseconds
            config._d = new Date(input);
        } else {
            hooks.createFromInputFallback(config);
        }
    }

    function createLocalOrUTC (input, format, locale, strict, isUTC) {
        var c = {};

        if (locale === true || locale === false) {
            strict = locale;
            locale = undefined;
        }

        if ((isObject(input) && isObjectEmpty(input)) ||
                (isArray(input) && input.length === 0)) {
            input = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;

        return createFromConfig(c);
    }

    function createLocal (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
        'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
        function () {
            var other = createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other < this ? this : other;
            } else {
                return createInvalid();
            }
        }
    );

    var prototypeMax = deprecate(
        'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
        function () {
            var other = createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other > this ? this : other;
            } else {
                return createInvalid();
            }
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (!moments[i].isValid() || moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    // TODO: Use [].sort instead?
    function min () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    }

    function max () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    }

    var now = function () {
        return Date.now ? Date.now() : +(new Date());
    };

    var ordering = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

    function isDurationValid(m) {
        for (var key in m) {
            if (!(indexOf.call(ordering, key) !== -1 && (m[key] == null || !isNaN(m[key])))) {
                return false;
            }
        }

        var unitHasDecimal = false;
        for (var i = 0; i < ordering.length; ++i) {
            if (m[ordering[i]]) {
                if (unitHasDecimal) {
                    return false; // only allow non-integers for smallest unit
                }
                if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
                    unitHasDecimal = true;
                }
            }
        }

        return true;
    }

    function isValid$1() {
        return this._isValid;
    }

    function createInvalid$1() {
        return createDuration(NaN);
    }

    function Duration (duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        this._isValid = isDurationValid(normalizedInput);

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible to translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = getLocale();

        this._bubble();
    }

    function isDuration (obj) {
        return obj instanceof Duration;
    }

    function absRound (number) {
        if (number < 0) {
            return Math.round(-1 * number) * -1;
        } else {
            return Math.round(number);
        }
    }

    // FORMATTING

    function offset (token, separator) {
        addFormatToken(token, 0, 0, function () {
            var offset = this.utcOffset();
            var sign = '+';
            if (offset < 0) {
                offset = -offset;
                sign = '-';
            }
            return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
        });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z',  matchShortOffset);
    addRegexToken('ZZ', matchShortOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(matchShortOffset, input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(matcher, string) {
        var matches = (string || '').match(matcher);

        if (matches === null) {
            return null;
        }

        var chunk   = matches[matches.length - 1] || [];
        var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
        var minutes = +(parts[1] * 60) + toInt(parts[2]);

        return minutes === 0 ?
          0 :
          parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (isMoment(input) || isDate(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(res._d.valueOf() + diff);
            hooks.updateOffset(res, false);
            return res;
        } else {
            return createLocal(input).local();
        }
    }

    function getDateOffset (m) {
        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
        // https://github.com/moment/moment/pull/1871
        return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset (input, keepLocalTime, keepMinutes) {
        var offset = this._offset || 0,
            localAdjust;
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        if (input != null) {
            if (typeof input === 'string') {
                input = offsetFromString(matchShortOffset, input);
                if (input === null) {
                    return this;
                }
            } else if (Math.abs(input) < 16 && !keepMinutes) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, 'm');
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    addSubtract(this, createDuration(input - offset, 'm'), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    function getSetZone (input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== 'string') {
                input = -input;
            }

            this.utcOffset(input, keepLocalTime);

            return this;
        } else {
            return -this.utcOffset();
        }
    }

    function setOffsetToUTC (keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal (keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), 'm');
            }
        }
        return this;
    }

    function setOffsetToParsedOffset () {
        if (this._tzm != null) {
            this.utcOffset(this._tzm, false, true);
        } else if (typeof this._i === 'string') {
            var tZone = offsetFromString(matchOffset, this._i);
            if (tZone != null) {
                this.utcOffset(tZone);
            }
            else {
                this.utcOffset(0, true);
            }
        }
        return this;
    }

    function hasAlignedHourOffset (input) {
        if (!this.isValid()) {
            return false;
        }
        input = input ? createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime () {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    function isDaylightSavingTimeShifted () {
        if (!isUndefined(this._isDSTShifted)) {
            return this._isDSTShifted;
        }

        var c = {};

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            var other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
            this._isDSTShifted = this.isValid() &&
                compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    function isLocal () {
        return this.isValid() ? !this._isUTC : false;
    }

    function isUtcOffset () {
        return this.isValid() ? this._isUTC : false;
    }

    function isUtc () {
        return this.isValid() ? this._isUTC && this._offset === 0 : false;
    }

    // ASP.NET json date format regex
    var aspNetRegex = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/;

    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    // and further modified to allow for strings containing both week and day
    var isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

    function createDuration (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            diffRes;

        if (isDuration(input)) {
            duration = {
                ms : input._milliseconds,
                d  : input._days,
                M  : input._months
            };
        } else if (isNumber(input)) {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y  : 0,
                d  : toInt(match[DATE])                         * sign,
                h  : toInt(match[HOUR])                         * sign,
                m  : toInt(match[MINUTE])                       * sign,
                s  : toInt(match[SECOND])                       * sign,
                ms : toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
            };
        } else if (!!(match = isoRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y : parseIso(match[2], sign),
                M : parseIso(match[3], sign),
                w : parseIso(match[4], sign),
                d : parseIso(match[5], sign),
                h : parseIso(match[6], sign),
                m : parseIso(match[7], sign),
                s : parseIso(match[8], sign)
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(createLocal(duration.from), createLocal(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    }

    createDuration.fn = Duration.prototype;
    createDuration.invalid = createInvalid$1;

    function parseIso (inp, sign) {
        // We'd normally use ~~inp for this, but unfortunately it also
        // converts floats to ints.
        // inp may be undefined, so careful calling replace on it.
        var res = inp && parseFloat(inp.replace(',', '.'));
        // apply sign while we're at it
        return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
        var res = {};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        if (!(base.isValid() && other.isValid())) {
            return {milliseconds: 0, months: 0};
        }

        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' +
                'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = createDuration(val, period);
            addSubtract(this, dur, direction);
            return this;
        };
    }

    function addSubtract (mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = absRound(duration._days),
            months = absRound(duration._months);

        if (!mom.isValid()) {
            // No op
            return;
        }

        updateOffset = updateOffset == null ? true : updateOffset;

        if (months) {
            setMonth(mom, get(mom, 'Month') + months * isAdding);
        }
        if (days) {
            set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
        }
        if (milliseconds) {
            mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
        }
        if (updateOffset) {
            hooks.updateOffset(mom, days || months);
        }
    }

    var add      = createAdder(1, 'add');
    var subtract = createAdder(-1, 'subtract');

    function getCalendarFormat(myMoment, now) {
        var diff = myMoment.diff(now, 'days', true);
        return diff < -6 ? 'sameElse' :
                diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                diff < 1 ? 'sameDay' :
                diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';
    }

    function calendar$1 (time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        var now = time || createLocal(),
            sod = cloneWithOffset(now, this).startOf('day'),
            format = hooks.calendarFormat(this, sod) || 'sameElse';

        var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);

        return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
    }

    function clone () {
        return new Moment(this);
    }

    function isAfter (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() > localInput.valueOf();
        } else {
            return localInput.valueOf() < this.clone().startOf(units).valueOf();
        }
    }

    function isBefore (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() < localInput.valueOf();
        } else {
            return this.clone().endOf(units).valueOf() < localInput.valueOf();
        }
    }

    function isBetween (from, to, units, inclusivity) {
        var localFrom = isMoment(from) ? from : createLocal(from),
            localTo = isMoment(to) ? to : createLocal(to);
        if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
            return false;
        }
        inclusivity = inclusivity || '()';
        return (inclusivity[0] === '(' ? this.isAfter(localFrom, units) : !this.isBefore(localFrom, units)) &&
            (inclusivity[1] === ')' ? this.isBefore(localTo, units) : !this.isAfter(localTo, units));
    }

    function isSame (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input),
            inputMs;
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() === localInput.valueOf();
        } else {
            inputMs = localInput.valueOf();
            return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
        }
    }

    function isSameOrAfter (input, units) {
        return this.isSame(input, units) || this.isAfter(input, units);
    }

    function isSameOrBefore (input, units) {
        return this.isSame(input, units) || this.isBefore(input, units);
    }

    function diff (input, units, asFloat) {
        var that,
            zoneDelta,
            output;

        if (!this.isValid()) {
            return NaN;
        }

        that = cloneWithOffset(input, this);

        if (!that.isValid()) {
            return NaN;
        }

        zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

        units = normalizeUnits(units);

        switch (units) {
            case 'year': output = monthDiff(this, that) / 12; break;
            case 'month': output = monthDiff(this, that); break;
            case 'quarter': output = monthDiff(this, that) / 3; break;
            case 'second': output = (this - that) / 1e3; break; // 1000
            case 'minute': output = (this - that) / 6e4; break; // 1000 * 60
            case 'hour': output = (this - that) / 36e5; break; // 1000 * 60 * 60
            case 'day': output = (this - that - zoneDelta) / 864e5; break; // 1000 * 60 * 60 * 24, negate dst
            case 'week': output = (this - that - zoneDelta) / 6048e5; break; // 1000 * 60 * 60 * 24 * 7, negate dst
            default: output = this - that;
        }

        return asFloat ? output : absFloor(output);
    }

    function monthDiff (a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        //check for negative zero, return zero if negative zero
        return -(wholeMonthDiff + adjust) || 0;
    }

    hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
    hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

    function toString () {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function toISOString(keepOffset) {
        if (!this.isValid()) {
            return null;
        }
        var utc = keepOffset !== true;
        var m = utc ? this.clone().utc() : this;
        if (m.year() < 0 || m.year() > 9999) {
            return formatMoment(m, utc ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ');
        }
        if (isFunction(Date.prototype.toISOString)) {
            // native implementation is ~50x faster, use it when we can
            if (utc) {
                return this.toDate().toISOString();
            } else {
                return new Date(this.valueOf() + this.utcOffset() * 60 * 1000).toISOString().replace('Z', formatMoment(m, 'Z'));
            }
        }
        return formatMoment(m, utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ');
    }

    /**
     * Return a human readable representation of a moment that can
     * also be evaluated to get a new moment which is the same
     *
     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
     */
    function inspect () {
        if (!this.isValid()) {
            return 'moment.invalid(/* ' + this._i + ' */)';
        }
        var func = 'moment';
        var zone = '';
        if (!this.isLocal()) {
            func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
            zone = 'Z';
        }
        var prefix = '[' + func + '("]';
        var year = (0 <= this.year() && this.year() <= 9999) ? 'YYYY' : 'YYYYYY';
        var datetime = '-MM-DD[T]HH:mm:ss.SSS';
        var suffix = zone + '[")]';

        return this.format(prefix + year + datetime + suffix);
    }

    function format (inputString) {
        if (!inputString) {
            inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
        }
        var output = formatMoment(this, inputString);
        return this.localeData().postformat(output);
    }

    function from (time, withoutSuffix) {
        if (this.isValid() &&
                ((isMoment(time) && time.isValid()) ||
                 createLocal(time).isValid())) {
            return createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function fromNow (withoutSuffix) {
        return this.from(createLocal(), withoutSuffix);
    }

    function to (time, withoutSuffix) {
        if (this.isValid() &&
                ((isMoment(time) && time.isValid()) ||
                 createLocal(time).isValid())) {
            return createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function toNow (withoutSuffix) {
        return this.to(createLocal(), withoutSuffix);
    }

    // If passed a locale key, it will set the locale for this
    // instance.  Otherwise, it will return the locale configuration
    // variables for this instance.
    function locale (key) {
        var newLocaleData;

        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    var lang = deprecate(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (key) {
            if (key === undefined) {
                return this.localeData();
            } else {
                return this.locale(key);
            }
        }
    );

    function localeData () {
        return this._locale;
    }

    var MS_PER_SECOND = 1000;
    var MS_PER_MINUTE = 60 * MS_PER_SECOND;
    var MS_PER_HOUR = 60 * MS_PER_MINUTE;
    var MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

    // actual modulo - handles negative numbers (for dates before 1970):
    function mod$1(dividend, divisor) {
        return (dividend % divisor + divisor) % divisor;
    }

    function localStartOfDate(y, m, d) {
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return new Date(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return new Date(y, m, d).valueOf();
        }
    }

    function utcStartOfDate(y, m, d) {
        // Date.UTC remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return Date.UTC(y, m, d);
        }
    }

    function startOf (units) {
        var time;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year(), 0, 1);
                break;
            case 'quarter':
                time = startOfDate(this.year(), this.month() - this.month() % 3, 1);
                break;
            case 'month':
                time = startOfDate(this.year(), this.month(), 1);
                break;
            case 'week':
                time = startOfDate(this.year(), this.month(), this.date() - this.weekday());
                break;
            case 'isoWeek':
                time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1));
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date());
                break;
            case 'hour':
                time = this._d.valueOf();
                time -= mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR);
                break;
            case 'minute':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_MINUTE);
                break;
            case 'second':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_SECOND);
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function endOf (units) {
        var time;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year() + 1, 0, 1) - 1;
                break;
            case 'quarter':
                time = startOfDate(this.year(), this.month() - this.month() % 3 + 3, 1) - 1;
                break;
            case 'month':
                time = startOfDate(this.year(), this.month() + 1, 1) - 1;
                break;
            case 'week':
                time = startOfDate(this.year(), this.month(), this.date() - this.weekday() + 7) - 1;
                break;
            case 'isoWeek':
                time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1) + 7) - 1;
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
                break;
            case 'hour':
                time = this._d.valueOf();
                time += MS_PER_HOUR - mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR) - 1;
                break;
            case 'minute':
                time = this._d.valueOf();
                time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
                break;
            case 'second':
                time = this._d.valueOf();
                time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function valueOf () {
        return this._d.valueOf() - ((this._offset || 0) * 60000);
    }

    function unix () {
        return Math.floor(this.valueOf() / 1000);
    }

    function toDate () {
        return new Date(this.valueOf());
    }

    function toArray () {
        var m = this;
        return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    function toObject () {
        var m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds()
        };
    }

    function toJSON () {
        // new Date(NaN).toJSON() === null
        return this.isValid() ? this.toISOString() : null;
    }

    function isValid$2 () {
        return isValid(this);
    }

    function parsingFlags () {
        return extend({}, getParsingFlags(this));
    }

    function invalidAt () {
        return getParsingFlags(this).overflow;
    }

    function creationData() {
        return {
            input: this._i,
            format: this._f,
            locale: this._locale,
            isUTC: this._isUTC,
            strict: this._strict
        };
    }

    // FORMATTING

    addFormatToken(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
        return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken (token, getter) {
        addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg',     'weekYear');
    addWeekYearFormatToken('ggggg',    'weekYear');
    addWeekYearFormatToken('GGGG',  'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PRIORITY

    addUnitPriority('weekYear', 1);
    addUnitPriority('isoWeekYear', 1);


    // PARSING

    addRegexToken('G',      matchSigned);
    addRegexToken('g',      matchSigned);
    addRegexToken('GG',     match1to2, match2);
    addRegexToken('gg',     match1to2, match2);
    addRegexToken('GGGG',   match1to4, match4);
    addRegexToken('gggg',   match1to4, match4);
    addRegexToken('GGGGG',  match1to6, match6);
    addRegexToken('ggggg',  match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
        week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
        week[token] = hooks.parseTwoDigitYear(input);
    });

    // MOMENTS

    function getSetWeekYear (input) {
        return getSetWeekYearHelper.call(this,
                input,
                this.week(),
                this.weekday(),
                this.localeData()._week.dow,
                this.localeData()._week.doy);
    }

    function getSetISOWeekYear (input) {
        return getSetWeekYearHelper.call(this,
                input, this.isoWeek(), this.isoWeekday(), 1, 4);
    }

    function getISOWeeksInYear () {
        return weeksInYear(this.year(), 1, 4);
    }

    function getWeeksInYear () {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
        var weeksTarget;
        if (input == null) {
            return weekOfYear(this, dow, doy).year;
        } else {
            weeksTarget = weeksInYear(input, dow, doy);
            if (week > weeksTarget) {
                week = weeksTarget;
            }
            return setWeekAll.call(this, input, week, weekday, dow, doy);
        }
    }

    function setWeekAll(weekYear, week, weekday, dow, doy) {
        var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
            date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

        this.year(date.getUTCFullYear());
        this.month(date.getUTCMonth());
        this.date(date.getUTCDate());
        return this;
    }

    // FORMATTING

    addFormatToken('Q', 0, 'Qo', 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PRIORITY

    addUnitPriority('quarter', 7);

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter (input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }

    // FORMATTING

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PRIORITY
    addUnitPriority('date', 9);

    // PARSING

    addRegexToken('D',  match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
        // TODO: Remove "ordinalParse" fallback in next major release.
        return isStrict ?
          (locale._dayOfMonthOrdinalParse || locale._ordinalParse) :
          locale._dayOfMonthOrdinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
        array[DATE] = toInt(input.match(match1to2)[0]);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    // FORMATTING

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PRIORITY
    addUnitPriority('dayOfYear', 4);

    // PARSING

    addRegexToken('DDD',  match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
        config._dayOfYear = toInt(input);
    });

    // HELPERS

    // MOMENTS

    function getSetDayOfYear (input) {
        var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
        return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
    }

    // FORMATTING

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PRIORITY

    addUnitPriority('minute', 14);

    // PARSING

    addRegexToken('m',  match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    // FORMATTING

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PRIORITY

    addUnitPriority('second', 15);

    // PARSING

    addRegexToken('s',  match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    // FORMATTING

    addFormatToken('S', 0, 0, function () {
        return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
        return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
        return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
        return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
        return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
        return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
        return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
        return this.millisecond() * 1000000;
    });


    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PRIORITY

    addUnitPriority('millisecond', 16);

    // PARSING

    addRegexToken('S',    match1to3, match1);
    addRegexToken('SS',   match1to3, match2);
    addRegexToken('SSS',  match1to3, match3);

    var token;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
        addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
        addParseToken(token, parseMs);
    }
    // MOMENTS

    var getSetMillisecond = makeGetSet('Milliseconds', false);

    // FORMATTING

    addFormatToken('z',  0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr () {
        return this._isUTC ? 'UTC' : '';
    }

    function getZoneName () {
        return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var proto = Moment.prototype;

    proto.add               = add;
    proto.calendar          = calendar$1;
    proto.clone             = clone;
    proto.diff              = diff;
    proto.endOf             = endOf;
    proto.format            = format;
    proto.from              = from;
    proto.fromNow           = fromNow;
    proto.to                = to;
    proto.toNow             = toNow;
    proto.get               = stringGet;
    proto.invalidAt         = invalidAt;
    proto.isAfter           = isAfter;
    proto.isBefore          = isBefore;
    proto.isBetween         = isBetween;
    proto.isSame            = isSame;
    proto.isSameOrAfter     = isSameOrAfter;
    proto.isSameOrBefore    = isSameOrBefore;
    proto.isValid           = isValid$2;
    proto.lang              = lang;
    proto.locale            = locale;
    proto.localeData        = localeData;
    proto.max               = prototypeMax;
    proto.min               = prototypeMin;
    proto.parsingFlags      = parsingFlags;
    proto.set               = stringSet;
    proto.startOf           = startOf;
    proto.subtract          = subtract;
    proto.toArray           = toArray;
    proto.toObject          = toObject;
    proto.toDate            = toDate;
    proto.toISOString       = toISOString;
    proto.inspect           = inspect;
    proto.toJSON            = toJSON;
    proto.toString          = toString;
    proto.unix              = unix;
    proto.valueOf           = valueOf;
    proto.creationData      = creationData;
    proto.year       = getSetYear;
    proto.isLeapYear = getIsLeapYear;
    proto.weekYear    = getSetWeekYear;
    proto.isoWeekYear = getSetISOWeekYear;
    proto.quarter = proto.quarters = getSetQuarter;
    proto.month       = getSetMonth;
    proto.daysInMonth = getDaysInMonth;
    proto.week           = proto.weeks        = getSetWeek;
    proto.isoWeek        = proto.isoWeeks     = getSetISOWeek;
    proto.weeksInYear    = getWeeksInYear;
    proto.isoWeeksInYear = getISOWeeksInYear;
    proto.date       = getSetDayOfMonth;
    proto.day        = proto.days             = getSetDayOfWeek;
    proto.weekday    = getSetLocaleDayOfWeek;
    proto.isoWeekday = getSetISODayOfWeek;
    proto.dayOfYear  = getSetDayOfYear;
    proto.hour = proto.hours = getSetHour;
    proto.minute = proto.minutes = getSetMinute;
    proto.second = proto.seconds = getSetSecond;
    proto.millisecond = proto.milliseconds = getSetMillisecond;
    proto.utcOffset            = getSetOffset;
    proto.utc                  = setOffsetToUTC;
    proto.local                = setOffsetToLocal;
    proto.parseZone            = setOffsetToParsedOffset;
    proto.hasAlignedHourOffset = hasAlignedHourOffset;
    proto.isDST                = isDaylightSavingTime;
    proto.isLocal              = isLocal;
    proto.isUtcOffset          = isUtcOffset;
    proto.isUtc                = isUtc;
    proto.isUTC                = isUtc;
    proto.zoneAbbr = getZoneAbbr;
    proto.zoneName = getZoneName;
    proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
    proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
    proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
    proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
    proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);

    function createUnix (input) {
        return createLocal(input * 1000);
    }

    function createInZone () {
        return createLocal.apply(null, arguments).parseZone();
    }

    function preParsePostFormat (string) {
        return string;
    }

    var proto$1 = Locale.prototype;

    proto$1.calendar        = calendar;
    proto$1.longDateFormat  = longDateFormat;
    proto$1.invalidDate     = invalidDate;
    proto$1.ordinal         = ordinal;
    proto$1.preparse        = preParsePostFormat;
    proto$1.postformat      = preParsePostFormat;
    proto$1.relativeTime    = relativeTime;
    proto$1.pastFuture      = pastFuture;
    proto$1.set             = set;

    proto$1.months            =        localeMonths;
    proto$1.monthsShort       =        localeMonthsShort;
    proto$1.monthsParse       =        localeMonthsParse;
    proto$1.monthsRegex       = monthsRegex;
    proto$1.monthsShortRegex  = monthsShortRegex;
    proto$1.week = localeWeek;
    proto$1.firstDayOfYear = localeFirstDayOfYear;
    proto$1.firstDayOfWeek = localeFirstDayOfWeek;

    proto$1.weekdays       =        localeWeekdays;
    proto$1.weekdaysMin    =        localeWeekdaysMin;
    proto$1.weekdaysShort  =        localeWeekdaysShort;
    proto$1.weekdaysParse  =        localeWeekdaysParse;

    proto$1.weekdaysRegex       =        weekdaysRegex;
    proto$1.weekdaysShortRegex  =        weekdaysShortRegex;
    proto$1.weekdaysMinRegex    =        weekdaysMinRegex;

    proto$1.isPM = localeIsPM;
    proto$1.meridiem = localeMeridiem;

    function get$1 (format, index, field, setter) {
        var locale = getLocale();
        var utc = createUTC().set(setter, index);
        return locale[field](utc, format);
    }

    function listMonthsImpl (format, index, field) {
        if (isNumber(format)) {
            index = format;
            format = undefined;
        }

        format = format || '';

        if (index != null) {
            return get$1(format, index, field, 'month');
        }

        var i;
        var out = [];
        for (i = 0; i < 12; i++) {
            out[i] = get$1(format, i, field, 'month');
        }
        return out;
    }

    // ()
    // (5)
    // (fmt, 5)
    // (fmt)
    // (true)
    // (true, 5)
    // (true, fmt, 5)
    // (true, fmt)
    function listWeekdaysImpl (localeSorted, format, index, field) {
        if (typeof localeSorted === 'boolean') {
            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        } else {
            format = localeSorted;
            index = format;
            localeSorted = false;

            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        }

        var locale = getLocale(),
            shift = localeSorted ? locale._week.dow : 0;

        if (index != null) {
            return get$1(format, (index + shift) % 7, field, 'day');
        }

        var i;
        var out = [];
        for (i = 0; i < 7; i++) {
            out[i] = get$1(format, (i + shift) % 7, field, 'day');
        }
        return out;
    }

    function listMonths (format, index) {
        return listMonthsImpl(format, index, 'months');
    }

    function listMonthsShort (format, index) {
        return listMonthsImpl(format, index, 'monthsShort');
    }

    function listWeekdays (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
    }

    function listWeekdaysShort (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
    }

    function listWeekdaysMin (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
    }

    getSetGlobalLocale('en', {
        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    // Side effect imports

    hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', getSetGlobalLocale);
    hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', getLocale);

    var mathAbs = Math.abs;

    function abs () {
        var data           = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days         = mathAbs(this._days);
        this._months       = mathAbs(this._months);

        data.milliseconds  = mathAbs(data.milliseconds);
        data.seconds       = mathAbs(data.seconds);
        data.minutes       = mathAbs(data.minutes);
        data.hours         = mathAbs(data.hours);
        data.months        = mathAbs(data.months);
        data.years         = mathAbs(data.years);

        return this;
    }

    function addSubtract$1 (duration, input, value, direction) {
        var other = createDuration(input, value);

        duration._milliseconds += direction * other._milliseconds;
        duration._days         += direction * other._days;
        duration._months       += direction * other._months;

        return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function add$1 (input, value) {
        return addSubtract$1(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function subtract$1 (input, value) {
        return addSubtract$1(this, input, value, -1);
    }

    function absCeil (number) {
        if (number < 0) {
            return Math.floor(number);
        } else {
            return Math.ceil(number);
        }
    }

    function bubble () {
        var milliseconds = this._milliseconds;
        var days         = this._days;
        var months       = this._months;
        var data         = this._data;
        var seconds, minutes, hours, years, monthsFromDays;

        // if we have a mix of positive and negative values, bubble down first
        // check: https://github.com/moment/moment/issues/2166
        if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
                (milliseconds <= 0 && days <= 0 && months <= 0))) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        seconds           = absFloor(milliseconds / 1000);
        data.seconds      = seconds % 60;

        minutes           = absFloor(seconds / 60);
        data.minutes      = minutes % 60;

        hours             = absFloor(minutes / 60);
        data.hours        = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        data.days   = days;
        data.months = months;
        data.years  = years;

        return this;
    }

    function daysToMonths (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        // 400 years have 12 months === 4800
        return days * 4800 / 146097;
    }

    function monthsToDays (months) {
        // the reverse of daysToMonths
        return months * 146097 / 4800;
    }

    function as (units) {
        if (!this.isValid()) {
            return NaN;
        }
        var days;
        var months;
        var milliseconds = this._milliseconds;

        units = normalizeUnits(units);

        if (units === 'month' || units === 'quarter' || units === 'year') {
            days = this._days + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            switch (units) {
                case 'month':   return months;
                case 'quarter': return months / 3;
                case 'year':    return months / 12;
            }
        } else {
            // handle milliseconds separately because of floating point math errors (issue #1867)
            days = this._days + Math.round(monthsToDays(this._months));
            switch (units) {
                case 'week'   : return days / 7     + milliseconds / 6048e5;
                case 'day'    : return days         + milliseconds / 864e5;
                case 'hour'   : return days * 24    + milliseconds / 36e5;
                case 'minute' : return days * 1440  + milliseconds / 6e4;
                case 'second' : return days * 86400 + milliseconds / 1000;
                // Math.floor prevents floating point math errors here
                case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
                default: throw new Error('Unknown unit ' + units);
            }
        }
    }

    // TODO: Use this.as('ms')?
    function valueOf$1 () {
        if (!this.isValid()) {
            return NaN;
        }
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            toInt(this._months / 12) * 31536e6
        );
    }

    function makeAs (alias) {
        return function () {
            return this.as(alias);
        };
    }

    var asMilliseconds = makeAs('ms');
    var asSeconds      = makeAs('s');
    var asMinutes      = makeAs('m');
    var asHours        = makeAs('h');
    var asDays         = makeAs('d');
    var asWeeks        = makeAs('w');
    var asMonths       = makeAs('M');
    var asQuarters     = makeAs('Q');
    var asYears        = makeAs('y');

    function clone$1 () {
        return createDuration(this);
    }

    function get$2 (units) {
        units = normalizeUnits(units);
        return this.isValid() ? this[units + 's']() : NaN;
    }

    function makeGetter(name) {
        return function () {
            return this.isValid() ? this._data[name] : NaN;
        };
    }

    var milliseconds = makeGetter('milliseconds');
    var seconds      = makeGetter('seconds');
    var minutes      = makeGetter('minutes');
    var hours        = makeGetter('hours');
    var days         = makeGetter('days');
    var months       = makeGetter('months');
    var years        = makeGetter('years');

    function weeks () {
        return absFloor(this.days() / 7);
    }

    var round = Math.round;
    var thresholds = {
        ss: 44,         // a few seconds to seconds
        s : 45,         // seconds to minute
        m : 45,         // minutes to hour
        h : 22,         // hours to day
        d : 26,         // days to month
        M : 11          // months to year
    };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime$1 (posNegDuration, withoutSuffix, locale) {
        var duration = createDuration(posNegDuration).abs();
        var seconds  = round(duration.as('s'));
        var minutes  = round(duration.as('m'));
        var hours    = round(duration.as('h'));
        var days     = round(duration.as('d'));
        var months   = round(duration.as('M'));
        var years    = round(duration.as('y'));

        var a = seconds <= thresholds.ss && ['s', seconds]  ||
                seconds < thresholds.s   && ['ss', seconds] ||
                minutes <= 1             && ['m']           ||
                minutes < thresholds.m   && ['mm', minutes] ||
                hours   <= 1             && ['h']           ||
                hours   < thresholds.h   && ['hh', hours]   ||
                days    <= 1             && ['d']           ||
                days    < thresholds.d   && ['dd', days]    ||
                months  <= 1             && ['M']           ||
                months  < thresholds.M   && ['MM', months]  ||
                years   <= 1             && ['y']           || ['yy', years];

        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set the rounding function for relative time strings
    function getSetRelativeTimeRounding (roundingFunction) {
        if (roundingFunction === undefined) {
            return round;
        }
        if (typeof(roundingFunction) === 'function') {
            round = roundingFunction;
            return true;
        }
        return false;
    }

    // This function allows you to set a threshold for relative time strings
    function getSetRelativeTimeThreshold (threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        if (threshold === 's') {
            thresholds.ss = limit - 1;
        }
        return true;
    }

    function humanize (withSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var locale = this.localeData();
        var output = relativeTime$1(this, !withSuffix, locale);

        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }

        return locale.postformat(output);
    }

    var abs$1 = Math.abs;

    function sign(x) {
        return ((x > 0) - (x < 0)) || +x;
    }

    function toISOString$1() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var seconds = abs$1(this._milliseconds) / 1000;
        var days         = abs$1(this._days);
        var months       = abs$1(this._months);
        var minutes, hours, years;

        // 3600 seconds -> 60 minutes -> 1 hour
        minutes           = absFloor(seconds / 60);
        hours             = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        years  = absFloor(months / 12);
        months %= 12;


        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
        var Y = years;
        var M = months;
        var D = days;
        var h = hours;
        var m = minutes;
        var s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
        var total = this.asSeconds();

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return 'P0D';
        }

        var totalSign = total < 0 ? '-' : '';
        var ymSign = sign(this._months) !== sign(total) ? '-' : '';
        var daysSign = sign(this._days) !== sign(total) ? '-' : '';
        var hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

        return totalSign + 'P' +
            (Y ? ymSign + Y + 'Y' : '') +
            (M ? ymSign + M + 'M' : '') +
            (D ? daysSign + D + 'D' : '') +
            ((h || m || s) ? 'T' : '') +
            (h ? hmsSign + h + 'H' : '') +
            (m ? hmsSign + m + 'M' : '') +
            (s ? hmsSign + s + 'S' : '');
    }

    var proto$2 = Duration.prototype;

    proto$2.isValid        = isValid$1;
    proto$2.abs            = abs;
    proto$2.add            = add$1;
    proto$2.subtract       = subtract$1;
    proto$2.as             = as;
    proto$2.asMilliseconds = asMilliseconds;
    proto$2.asSeconds      = asSeconds;
    proto$2.asMinutes      = asMinutes;
    proto$2.asHours        = asHours;
    proto$2.asDays         = asDays;
    proto$2.asWeeks        = asWeeks;
    proto$2.asMonths       = asMonths;
    proto$2.asQuarters     = asQuarters;
    proto$2.asYears        = asYears;
    proto$2.valueOf        = valueOf$1;
    proto$2._bubble        = bubble;
    proto$2.clone          = clone$1;
    proto$2.get            = get$2;
    proto$2.milliseconds   = milliseconds;
    proto$2.seconds        = seconds;
    proto$2.minutes        = minutes;
    proto$2.hours          = hours;
    proto$2.days           = days;
    proto$2.weeks          = weeks;
    proto$2.months         = months;
    proto$2.years          = years;
    proto$2.humanize       = humanize;
    proto$2.toISOString    = toISOString$1;
    proto$2.toString       = toISOString$1;
    proto$2.toJSON         = toISOString$1;
    proto$2.locale         = locale;
    proto$2.localeData     = localeData;

    proto$2.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', toISOString$1);
    proto$2.lang = lang;

    // Side effect imports

    // FORMATTING

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
        config._d = new Date(parseFloat(input, 10) * 1000);
    });
    addParseToken('x', function (input, array, config) {
        config._d = new Date(toInt(input));
    });

    // Side effect imports


    hooks.version = '2.24.0';

    setHookCallback(createLocal);

    hooks.fn                    = proto;
    hooks.min                   = min;
    hooks.max                   = max;
    hooks.now                   = now;
    hooks.utc                   = createUTC;
    hooks.unix                  = createUnix;
    hooks.months                = listMonths;
    hooks.isDate                = isDate;
    hooks.locale                = getSetGlobalLocale;
    hooks.invalid               = createInvalid;
    hooks.duration              = createDuration;
    hooks.isMoment              = isMoment;
    hooks.weekdays              = listWeekdays;
    hooks.parseZone             = createInZone;
    hooks.localeData            = getLocale;
    hooks.isDuration            = isDuration;
    hooks.monthsShort           = listMonthsShort;
    hooks.weekdaysMin           = listWeekdaysMin;
    hooks.defineLocale          = defineLocale;
    hooks.updateLocale          = updateLocale;
    hooks.locales               = listLocales;
    hooks.weekdaysShort         = listWeekdaysShort;
    hooks.normalizeUnits        = normalizeUnits;
    hooks.relativeTimeRounding  = getSetRelativeTimeRounding;
    hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
    hooks.calendarFormat        = getCalendarFormat;
    hooks.prototype             = proto;

    // currently HTML5 input type only supports 24-hour formats
    hooks.HTML5_FMT = {
        DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',             // <input type="datetime-local" />
        DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',  // <input type="datetime-local" step="1" />
        DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',   // <input type="datetime-local" step="0.001" />
        DATE: 'YYYY-MM-DD',                             // <input type="date" />
        TIME: 'HH:mm',                                  // <input type="time" />
        TIME_SECONDS: 'HH:mm:ss',                       // <input type="time" step="1" />
        TIME_MS: 'HH:mm:ss.SSS',                        // <input type="time" step="0.001" />
        WEEK: 'GGGG-[W]WW',                             // <input type="week" />
        MONTH: 'YYYY-MM'                                // <input type="month" />
    };

    return hooks;

})));

},{}],117:[function(require,module,exports){
'use strict';

var keysShim;
if (!Object.keys) {
	// modified from https://github.com/es-shims/es5-shim
	var has = Object.prototype.hasOwnProperty;
	var toStr = Object.prototype.toString;
	var isArgs = require('./isArguments'); // eslint-disable-line global-require
	var isEnumerable = Object.prototype.propertyIsEnumerable;
	var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
	var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
	var dontEnums = [
		'toString',
		'toLocaleString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'constructor'
	];
	var equalsConstructorPrototype = function (o) {
		var ctor = o.constructor;
		return ctor && ctor.prototype === o;
	};
	var excludedKeys = {
		$applicationCache: true,
		$console: true,
		$external: true,
		$frame: true,
		$frameElement: true,
		$frames: true,
		$innerHeight: true,
		$innerWidth: true,
		$outerHeight: true,
		$outerWidth: true,
		$pageXOffset: true,
		$pageYOffset: true,
		$parent: true,
		$scrollLeft: true,
		$scrollTop: true,
		$scrollX: true,
		$scrollY: true,
		$self: true,
		$webkitIndexedDB: true,
		$webkitStorageInfo: true,
		$window: true
	};
	var hasAutomationEqualityBug = (function () {
		/* global window */
		if (typeof window === 'undefined') { return false; }
		for (var k in window) {
			try {
				if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
					try {
						equalsConstructorPrototype(window[k]);
					} catch (e) {
						return true;
					}
				}
			} catch (e) {
				return true;
			}
		}
		return false;
	}());
	var equalsConstructorPrototypeIfNotBuggy = function (o) {
		/* global window */
		if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
			return equalsConstructorPrototype(o);
		}
		try {
			return equalsConstructorPrototype(o);
		} catch (e) {
			return false;
		}
	};

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object';
		var isFunction = toStr.call(object) === '[object Function]';
		var isArguments = isArgs(object);
		var isString = isObject && toStr.call(object) === '[object String]';
		var theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError('Object.keys called on a non-object');
		}

		var skipProto = hasProtoEnumBug && isFunction;
		if (isString && object.length > 0 && !has.call(object, 0)) {
			for (var i = 0; i < object.length; ++i) {
				theKeys.push(String(i));
			}
		}

		if (isArguments && object.length > 0) {
			for (var j = 0; j < object.length; ++j) {
				theKeys.push(String(j));
			}
		} else {
			for (var name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(String(name));
				}
			}
		}

		if (hasDontEnumBug) {
			var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

			for (var k = 0; k < dontEnums.length; ++k) {
				if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
					theKeys.push(dontEnums[k]);
				}
			}
		}
		return theKeys;
	};
}
module.exports = keysShim;

},{"./isArguments":119}],118:[function(require,module,exports){
'use strict';

var slice = Array.prototype.slice;
var isArgs = require('./isArguments');

var origKeys = Object.keys;
var keysShim = origKeys ? function keys(o) { return origKeys(o); } : require('./implementation');

var originalKeys = Object.keys;

keysShim.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			var args = Object.keys(arguments);
			return args && args.length === arguments.length;
		}(1, 2));
		if (!keysWorksWithArguments) {
			Object.keys = function keys(object) { // eslint-disable-line func-name-matching
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				}
				return originalKeys(object);
			};
		}
	} else {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./implementation":117,"./isArguments":119}],119:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],120:[function(require,module,exports){
(function (process,global){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var phoneNumber;
(function (phoneNumber_1) {
    function syncLoadUtilIfNode() {
        var is_intlTelInputUtils_defined = (function () {
            try {
                intlTelInputUtils;
            }
            catch (_a) {
                return false;
            }
            return intlTelInputUtils !== undefined;
        })();
        if (is_intlTelInputUtils_defined) {
            return;
        }
        if (typeof process !== "undefined" &&
            typeof process.release === "object" &&
            process.release.name === "node") {
            //Trick browserify so it does not bundle.
            var path = "../../res/utils";
            require(path);
        }
        else {
            throw new Error([
                "Util script should be loaded, include it in the HTML",
                "page or run async function remoteLoadUtil before use"
            ].join(" "));
        }
    }
    function remoteLoadUtil(src) {
        if (src === void 0) { src = "//github.com/garronej/phone-number/releases/download/intlTelInputUtils/utils.js"; }
        return new Promise(function (resolve) {
            return (function (d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) {
                    resolve();
                    return;
                }
                js = d.createElement(s);
                js.id = id;
                js.onload = function () {
                    resolve();
                };
                js.src = src;
                fjs.parentNode.insertBefore(js, fjs);
            }(document, "script", "intlTelInputUtils"));
        });
    }
    phoneNumber_1.remoteLoadUtil = remoteLoadUtil;
    /**
     * This function will try to convert a raw string as a E164 formated phone number.
     *
     * If the rawInput is already a E164 it will remain untouched regardless of the iso
     * ex: +33636786385, it => +33636786385
     *
     * In case the number can not be converted to E164:
     * -If the number contain any character that is not a digit or ( ) [space] - # * +
     * then the number will be considered not dialable and remain untouched.
     * e.g: SFR => SFR | Error
     *
     * -If the number contain only digits ( ) [space] - # * or +
     * then ( ) [space] and - will be removed.
     * e.g: +00 (111) 222-333 => +00111222333
     * (if after the number is "" we return rawInput and it's not dialable )
     * e.g: ()()-=> ()()- | Error
     * e.g: [""] => | Error
     *
     * @param rawInput raw string provided as phone number by Dongle or intlInput
     * @param iso
     * country of the number ( lowercase ) e.g: fr, it...
     * - If we use intlInput the iso is provided.
     * - If it's a incoming SMS/Call from Dongle the iso to provide is the one of the SIM
     * as we will ether have an E164 formated number not affected by the iso
     * or if we have a locally formated number it's formated it mean that the number is from the same
     * country of the sim card.
     * @param mustBeDialable: throw if the number is not dialable.
     *
     */
    function build(rawInput, iso, mustBeDialable) {
        if (mustBeDialable === void 0) { mustBeDialable = undefined; }
        syncLoadUtilIfNode();
        var shouldFormatToE164 = (function () {
            if (!iso) {
                return false;
            }
            var numberType = intlTelInputUtils.getNumberType(rawInput, iso);
            switch (numberType) {
                case intlTelInputUtils.numberType.FIXED_LINE:
                case intlTelInputUtils.numberType.FIXED_LINE_OR_MOBILE:
                case intlTelInputUtils.numberType.MOBILE:
                    return true;
                default:
                    return false;
            }
        })();
        if (shouldFormatToE164) {
            return intlTelInputUtils.formatNumber(rawInput, iso, intlTelInputUtils.numberFormat.E164);
        }
        else {
            /** If any char other than *+# () and number is present => match  */
            if (rawInput.match(/[^*+#\ \-\(\)0-9]/)) {
                if (mustBeDialable) {
                    throw new Error("unauthorized char, not dialable");
                }
                return rawInput;
            }
            else {
                /** 0 (111) 222-333 => 0111222333 */
                var phoneNumber_2 = rawInput.replace(/[\ \-\(\)]/g, "");
                if (!phoneNumber_2.length) {
                    if (mustBeDialable) {
                        throw new Error("void, not dialable");
                    }
                    return rawInput;
                }
                return phoneNumber_2;
            }
        }
    }
    phoneNumber_1.build = build;
    /** let us test if we should allow the number to be dialed */
    function isDialable(phoneNumber) {
        try {
            build(phoneNumber, undefined, "MUST BE DIALABLE");
        }
        catch (_a) {
            return false;
        }
        return true;
    }
    phoneNumber_1.isDialable = isDialable;
    function isValidE164(phoneNumber) {
        syncLoadUtilIfNode();
        return (phoneNumber[0] === "+" &&
            intlTelInputUtils.isValidNumber(phoneNumber));
    }
    /**
     * Pretty print (format) the phone number:
     * In national format if the iso of the number and the provided iso matches.
     * In international format if no iso is provided or
     * the iso of the number and the provided iso mismatch.
     * Do nothing if it's not dialable.
     */
    function prettyPrint(phoneNumber, simIso) {
        syncLoadUtilIfNode();
        if (!isValidE164(phoneNumber)) {
            return phoneNumber;
        }
        if (!simIso) {
            return intlTelInputUtils.formatNumber(phoneNumber, undefined, intlTelInputUtils.numberFormat.INTERNATIONAL);
        }
        var pnNational = intlTelInputUtils.formatNumber(phoneNumber, null, intlTelInputUtils.numberFormat.NATIONAL);
        var pnBackToE164 = intlTelInputUtils.formatNumber(pnNational, simIso, intlTelInputUtils.numberFormat.E164);
        if (pnBackToE164 === phoneNumber) {
            return pnNational;
        }
        else {
            return intlTelInputUtils.formatNumber(phoneNumber, simIso, intlTelInputUtils.numberFormat.INTERNATIONAL);
        }
    }
    phoneNumber_1.prettyPrint = prettyPrint;
    function areSame(phoneNumber, rawInput) {
        syncLoadUtilIfNode();
        if (phoneNumber === rawInput) {
            return true;
        }
        var rawInputDry = rawInput.replace(/[^*#+0-9]/g, "");
        if (rawInputDry === phoneNumber) {
            return true;
        }
        if (isValidE164(phoneNumber)) {
            if (rawInputDry.startsWith("00") &&
                rawInputDry.replace(/^00/, "+") === phoneNumber) {
                return true;
            }
            var pnNationalDry = intlTelInputUtils.formatNumber(phoneNumber, null, intlTelInputUtils.numberFormat.NATIONAL).replace(/[^*#+0-9]/g, "");
            if (rawInputDry === pnNationalDry) {
                return true;
            }
        }
        return false;
    }
    phoneNumber_1.areSame = areSame;
    global["phoneNumber"] = phoneNumber;
})(phoneNumber = exports.phoneNumber || (exports.phoneNumber = {}));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":6}],121:[function(require,module,exports){
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
var clusters = new WeakMap();
//console.log("Map version");
//export const clusters = new Map<Object, Map<GroupRef,ExecQueue>>();
function getOrCreateExecQueue(context, groupRef) {
    var execQueueByGroup = clusters.get(context);
    if (!execQueueByGroup) {
        execQueueByGroup = new WeakMap();
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
var groupByRunExclusiveFunction = new WeakMap();
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

},{}],122:[function(require,module,exports){
'use strict'
/* eslint no-proto: 0 */
module.exports = Object.setPrototypeOf || ({ __proto__: [] } instanceof Array ? setProtoOf : mixinProperties)

function setProtoOf (obj, proto) {
  obj.__proto__ = proto
  return obj
}

function mixinProperties (obj, proto) {
  for (var prop in proto) {
    if (!obj.hasOwnProperty(prop)) {
      obj[prop] = proto[prop]
    }
  }
  return obj
}

},{}],123:[function(require,module,exports){
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

},{"./SyncEventBase":124}],124:[function(require,module,exports){
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

},{"./SyncEventBaseProtected":125}],125:[function(require,module,exports){
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
        this.handlerTriggers = new Map();
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

},{"./defs":126,"run-exclusive":121}],126:[function(require,module,exports){
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

},{"setprototypeof":122}],127:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var SyncEvent_1 = require("./SyncEvent");
exports.SyncEvent = SyncEvent_1.SyncEvent;
exports.VoidSyncEvent = SyncEvent_1.VoidSyncEvent;
var defs_1 = require("./defs");
exports.EvtError = defs_1.EvtError;

},{"./SyncEvent":123,"./defs":126}],128:[function(require,module,exports){
module.exports = "<div class=\"id_UiConversation panel panel-default\">\r\n    <div class=\"panel-heading pr5\">\r\n        <h4 class=\"panel-title\">\r\n            <i>\r\n                <svg class=\"custom-icon\">\r\n                    <use xlink:href=\"#icon-chat\"></use>\r\n                </svg>\r\n            </i>\r\n            <span class=\"id_name\"></span>\r\n            <span class=\"id_number ml10\"></span>\r\n        </h4>\r\n        <button class=\"id_updateContact btn btn-primary ml10\" style=\"padding-top: 3px; padding-bottom: 3px; padding-left: 10px; padding-right: 10px;\" type=\"button\">\r\n            <i>\r\n                <svg class=\"custom-icon\">\r\n                    <use xlink:href=\"#icon-edit_contact\"></use>\r\n                </svg>\r\n            </i>\r\n        </button>\r\n        <button class=\"id_delete btn btn-danger\" type=\"button\">\r\n            <i class=\"glyphicon glyphicon-trash\"></i>\r\n        </button>\r\n        <div class=\"pull-right mt5\">\r\n            <button class=\"id_call btn btn-primary\" type=\"button\">\r\n                <i>\r\n                    <svg class=\"custom-icon\">\r\n                        <use xlink:href=\"#icon-call\"></use>\r\n                    </svg>\r\n                </i>\r\n                <span>Call</span>\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div class=\"panel-body bnb\">\r\n        <ul></ul>\r\n    </div>\r\n    <div class=\"panel-footer white-bg\">\r\n        <form action=\"#\" role=\"form\" class=\"mb5 mr5 ml5\">\r\n                <textarea class=\"form-control elastic\" rows=\"1\"> </textarea>\r\n                <a class=\"id_send\" href=\"javascript:void(0);\">\r\n                    <i class=\"fa fa-send s20\"></i>\r\n                </a>\r\n        </form>\r\n    </div>\r\n</div>\r\n\r\n<div class=\"templates\">\r\n\r\n    <li>\r\n        <div class=\"message\">\r\n            <p class=\"id_emitter\"></p>\r\n            <div class=\"id_status\">\r\n                <span class=\"id_date\"></span>\r\n                <span class=\"id_check\"></span>\r\n            </div>\r\n            <p class=\"id_content\">\r\n            </p>\r\n        </div>\r\n    </li>\r\n\r\n</div>";
},{}],129:[function(require,module,exports){
var css = ".id_UiConversation .panel-heading {\n  cursor: default;\n}\n.id_UiConversation .panel-title {\n  display: inline-block;\n}\n.id_UiConversation .panel-title span {\n  cursor: text;\n}\n.id_UiConversation .panel-body {\n  padding: 0;\n}\n.id_UiConversation .panel-footer {\n  padding: 0;\n}\n.id_UiConversation form {\n  position: relative;\n}\n.id_UiConversation textarea {\n  padding-right: 36px;\n}\n.id_UiConversation a.id_send {\n  position: absolute;\n  top: 7px;\n  right: 0px;\n  left: auto;\n  width: 33px;\n}\n.id_UiConversation ul {\n  margin: 0 10px 0;\n  padding: 0;\n  list-style: none;\n}\n.id_UiConversation ul li {\n  margin-bottom: 5px;\n  margin-top: 5px;\n}\n.id_UiConversation ul li div.message {\n  border-radius: 4px;\n  padding: 5px 10px;\n  border: 1px solid #ecf0f1;\n  position: relative;\n}\n.id_UiConversation ul li div.message.notification {\n  background-color: #ecefde;\n  text-align: center;\n  font-style: italic;\n  margin-left: 80px;\n  margin-right: 80px;\n}\n.id_UiConversation ul li div.message.in,\n.id_UiConversation ul li div.message.out {\n  background-color: #ecf0f1;\n}\n.id_UiConversation ul li div.message.in:after,\n.id_UiConversation ul li div.message.out:after,\n.id_UiConversation ul li div.message.in:before,\n.id_UiConversation ul li div.message.out:before {\n  top: 20px;\n  border: solid transparent;\n  content: '';\n  position: absolute;\n}\n.id_UiConversation ul li div.message.in:after,\n.id_UiConversation ul li div.message.out:after {\n  border-width: 8px;\n  margin-top: -8px;\n}\n.id_UiConversation ul li div.message.in {\n  margin-left: 7px;\n  margin-right: 60px;\n}\n.id_UiConversation ul li div.message.in:after,\n.id_UiConversation ul li div.message.in:before {\n  right: 100%;\n}\n.id_UiConversation ul li div.message.in:after {\n  border-right-color: #ecf0f1;\n}\n.id_UiConversation ul li div.message.out {\n  margin-left: 60px;\n  margin-right: 7px;\n}\n.id_UiConversation ul li div.message.out:after,\n.id_UiConversation ul li div.message.out:before {\n  left: 100%;\n}\n.id_UiConversation ul li div.message.out:after {\n  border-left-color: #ecf0f1;\n}\n.id_UiConversation ul li div.message p.id_emitter {\n  color: #95a5a6;\n  margin-bottom: 2px;\n}\n.id_UiConversation ul li div.message div.id_status {\n  float: right;\n  padding: 2px 0;\n  position: absolute;\n  right: 10px;\n  bottom: 2px;\n}\n.id_UiConversation ul li div.message span.id_date {\n  font-size: 75%;\n  font-style: italic;\n}\n.id_UiConversation ul li div.message span.id_check {\n  font-size: 75%;\n  font-style: italic;\n}\n.id_UiConversation ul li div.message p.id_content {\n  font-size: 13px;\n  line-height: 18px;\n  margin-bottom: 0;\n  padding-bottom: 15px;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":115}],130:[function(require,module,exports){
module.exports = "\r\n<div class=\"id_UiHeader page-header\">\r\n    <h4>\r\n        <i class=\"id_icon_sim_up\">\r\n            <svg class=\"custom-icon\">\r\n                <use xlink:href=\"#icon-sim_card\"></use>\r\n            </svg>\r\n        </i>\r\n        <i class=\"id_icon_sim_down\">\r\n            <svg class=\"custom-icon\">\r\n                <use xlink:href=\"#icon-sim_card_alert\"></use>\r\n            </svg>\r\n        </i>\r\n        <a href=\"#\" class=\"id_friendly_name\">\r\n            <span></span>\r\n        </a>\r\n        &nbsp;\r\n        <span class=\"id_number\"></span>\r\n        &nbsp;\r\n        <span class=\"id_offline color-red\"><b>Offline</b></span>\r\n    </h4>\r\n</div>\r\n\r\n<div class=\"templates\">\r\n\r\n    <div class=\"id_popover\">\r\n        <strong>Sim country:&nbsp;</strong>\r\n        <div class=\"id_flag iti-flag\" style=\"display: inline-block;\"></div>\r\n        <br>\r\n        <strong>Operator: </strong>\r\n        <span class=\"id_network\"></span>\r\n        <br>\r\n        <strong>Current location: </strong>\r\n        <span class=\"id_geoInfo\"></span>\r\n    </div>\r\n\r\n</div>\r\n";
},{}],131:[function(require,module,exports){
module.exports = "<style>\r\n    .id_UiPhonebook ul li > div {\r\n        padding: 6px 10px;\r\n        color: #030303;\r\n        border-top: 1px solid #EAEAEA;\r\n        cursor: pointer;\r\n    }\r\n\r\n    .id_UiPhonebook ul li .id_number {\r\n        cursor: text !important;\r\n    }\r\n\r\n    .id_UiPhonebook ul li.selected > div,\r\n    .id_UiPhonebook ul li > div:hover {\r\n        color: #000000;\r\n        background-color: #e9ebeb !important;\r\n    }\r\n\r\n    .id_UiPhonebook ul li.has-messages > div {\r\n        background-color: #f4f5f5;\r\n    }\r\n</style>\r\n\r\n\r\n<div class=\"id_UiPhonebook panel\">\r\n    <div class=\"panel-body p0\">\r\n        <div class=\"p15\">\r\n            <form action=\"javascript:void(0);\">\r\n                <input class=\"form-control\" type=\"text\" name=\"search\" placeholder=\"Search contacts... \">\r\n            </form>\r\n        </div>\r\n        <ul class=\"nav \">\r\n        </ul>\r\n    </div>\r\n</div>\r\n\r\n<div class=\"templates \">\r\n\r\n    <li>\r\n        <div>\r\n            <span class=\"id_name \"></span>\r\n            <span class=\"id_number pl15\"></span>\r\n            <div class=\"pull-right \">\r\n                <span class=\"id_notifications label blue-light-bg\"></span>\r\n            </div>\r\n        </div>\r\n    </li>\r\n\r\n</div>";
},{}],132:[function(require,module,exports){
module.exports = "<style>\r\n    .id_UiQuickAction .intl-tel-input {\r\n        width: 100%;\r\n    }\r\n\r\n    .id_UiQuickAction .intl-tel-input input {\r\n        width: 100%;\r\n    }\r\n\r\n    .id_UiQuickAction span.id_error-message {\r\n        color: red;\r\n    }\r\n\r\n    .id_UiQuickAction .st_flex {\r\n        display:flex;\r\n        justify-content:space-around;\r\n    }\r\n\r\n    .id_UiQuickAction .st_flex button {\r\n        width: 100%;\r\n        margin: 5px;\r\n    }\r\n\r\n</style>\r\n\r\n\r\n<div class=\"id_UiQuickAction panel\">\r\n    <div class=\"panel-body\">\r\n        <form class=\"id_form form-vertical\" action=\"javascript:void(0);\">\r\n            <fieldset>\r\n                <div class=\"row\">\r\n\r\n                    <div class=\"col-xs-12 mt5 mb10 pl20 pr20\">\r\n                        <input name=\"tel-input\" class=\"id_tel-input form-control\" type=\"text\" required>\r\n                    </div>\r\n\r\n                    <div class=\"col-xs-12\">\r\n\r\n                        <div class=\"st_flex\">\r\n\r\n                            <button type=\"button\" class=\"id_call btn btn-primary\">\r\n                                <i>\r\n                                    <svg class=\"custom-icon\">\r\n                                        <use xlink:href=\"#icon-call\"></use>\r\n                                    </svg>\r\n                                </i>\r\n                                <span class=\"visible-lg-inline \">Call</span>\r\n                            </button>\r\n                            <button type=\"button\" class=\"id_sms btn btn-primary\">\r\n                                <i>\r\n                                    <svg class=\"custom-icon\">\r\n                                        <use xlink:href=\"#icon-sms\"></use>\r\n                                    </svg>\r\n                                </i>\r\n                                <span class=\"visible-lg-inline \">SMS</span>\r\n\r\n                            </button>\r\n                            <button type=\"button\" class=\"id_contact btn btn-primary\">\r\n                                <i>\r\n                                    <svg class=\"custom-icon\">\r\n                                        <use xlink:href=\"#icon-add_contact\"></use>\r\n                                    </svg>\r\n                                </i>\r\n                                <span class=\"visible-lg-inline \">New Contact</span>\r\n                            </button>\r\n\r\n                        </div>\r\n\r\n                    </div>\r\n\r\n                </div>\r\n            </fieldset>\r\n\r\n    </div>\r\n    <!-- .panel-body-->\r\n</div>\r\n\r\n\r\n<div class=\"templates\">\r\n\r\n    <div class=\"id_popover\">\r\n        <span class=\"id_error-message\">salut</span>\r\n    </div>\r\n</div>";
},{}],133:[function(require,module,exports){
module.exports = "<style>\r\n\r\n    @keyframes ring {\r\n        5%,\r\n        45% {\r\n            transform: translate3d(-1px, 0, 0);\r\n        }\r\n\r\n        10%,\r\n        40% {\r\n            transform: translate3d(2px, 0, 0);\r\n        }\r\n\r\n        15%,\r\n        25%,\r\n        35% {\r\n            transform: translate3d(-3px, 0, 0);\r\n        }\r\n\r\n        20%,\r\n        30% {\r\n            transform: translate3d(3px, 0, 0);\r\n        }\r\n    }\r\n\r\n    .id_UiVoiceCall .icon-ring {\r\n        animation-name: ring;\r\n        animation-duration: 2s;\r\n        animation-iteration-count: infinite;\r\n    }\r\n\r\n    .id_UiVoiceCall.modal {\r\n        text-align: center;\r\n        padding: 0!important;\r\n    }\r\n    \r\n    /*\r\n\r\n    NOTE: To center vertically but create \r\n    big margin on small screens so commented.\r\n\r\n    .id_UiVoiceCall.modal:before {\r\n        content: '';\r\n        display: inline-block;\r\n        height: 100%;\r\n        vertical-align: middle;\r\n        margin-right: -4px;\r\n    }\r\n\r\n    .id_UiVoiceCall .modal-dialog {\r\n        display: inline-block;\r\n        text-align: left;\r\n        vertical-align: middle;\r\n    }\r\n    */\r\n\r\n    .id_UiVoiceCall .id_numpad {\r\n        text-align: center;\r\n        margin-top: 20px;\r\n    }\r\n\r\n    .id_UiVoiceCall .id_numpad .btn {\r\n        margin-bottom: 10px !important;\r\n        margin-right: 5px !important;\r\n    }\r\n\r\n    .id_UiVoiceCall .st_flex {\r\n        display:flex;\r\n        justify-content:space-around;\r\n    }\r\n\r\n    .id_UiVoiceCall .st_flex > div {\r\n        width: 100%;\r\n    }\r\n\r\n</style>\r\n\r\n<div class=\"id_UiVoiceCall modal\" role=\"dialog\">\r\n    <div class=\"modal-dialog\" role=\"document\">\r\n        <div class=\"modal-content\">\r\n            <div class=\"modal-body p0\">\r\n\r\n                <div class=\"panel panel-dark mb0\">\r\n                    <div class=\"panel-heading pt10\">\r\n                        <div class=\"row\">\r\n\r\n                            <div class=\"col-xs-12\">\r\n\r\n                                <div class=\"st_flex\">\r\n\r\n                                    <div class=\"text-center\">\r\n                                            <p><span class=\"id_me\"></span></p>\r\n                                            <p><span class=\"id_me_under\"></span></p>\r\n                                    </div>\r\n                                    <div class=\"mt10\" style=\"width: 10% !important; margin-right: 5px;\">\r\n                                        <i class=\"sel_arrow-right l-arrows-right\"></i>\r\n                                        <i class=\"sel_arrow-left l-arrows-left\"></i>\r\n                                    </div>\r\n                                    <div class=\"text-center mt10\" style=\"width: 10% !important;\">\r\n                                        <span class=\"id_timer\"></span>\r\n                                        <span class=\"id_icon-ring fa fa-phone icon-ring\"></span>\r\n                                        <span class=\"id_icon-spin fa fa-spinner icon-spin\"></span>\r\n                                        <span class=\"id_icon-hangup glyphicon glyphicon-phone-alt\"></span>\r\n                                    </div>\r\n                                    <div class=\"mt10\" style=\"width: 10% !important; margin-left: 5px;\">\r\n                                        <i class=\"sel_arrow-right l-arrows-right\"></i>\r\n                                        <i class=\"sel_arrow-left l-arrows-left\"></i>\r\n                                    </div>\r\n                                    <div class=\"text-center\">\r\n                                            <p><span class=\"id_contact\"> <span></p>\r\n                                            <p><span class=\"id_contact_under\"></span></p>\r\n                                    </div>\r\n\r\n\r\n                                </div>\r\n\r\n                            </div>\r\n\r\n                        </div>\r\n                    </div>\r\n\r\n                    <div class=\"panel-body\">\r\n\r\n                        <div class=\"text-center\">\r\n                            <span class=\"id_status well well-sm\"></span>\r\n                        </div>\r\n\r\n                        <div class=\"row id_numpad\">\r\n\r\n                            <div class=\"col-sm-12\">\r\n                                <button type=\"button\" class=\"id_key1 btn btn-success\">&nbsp;&nbsp;&nbsp;1&nbsp;&nbsp;&nbsp;</button>\r\n                                <button type=\"button\" class=\"id_key2 btn btn-success\">&nbsp;&nbsp;&nbsp;2&nbsp;&nbsp;&nbsp;</button>\r\n                                <button type=\"button\" class=\"id_key3 btn btn-success\">&nbsp;&nbsp;&nbsp;3&nbsp;&nbsp;&nbsp;</button>\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12\">\r\n                                <button type=\"button\" class=\"id_key4 btn btn-success\">&nbsp;&nbsp;&nbsp;4&nbsp;&nbsp;&nbsp;</button>\r\n                                <button type=\"button\" class=\"id_key5 btn btn-success\">&nbsp;&nbsp;&nbsp;5&nbsp;&nbsp;&nbsp;</button>\r\n                                <button type=\"button\" class=\"id_key6 btn btn-success\">&nbsp;&nbsp;&nbsp;6&nbsp;&nbsp;&nbsp;</button>\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12\">\r\n                                <button type=\"button\" class=\"id_key7 btn btn-success\">&nbsp;&nbsp;&nbsp;7&nbsp;&nbsp;&nbsp;</button>\r\n                                <button type=\"button\" class=\"id_key8 btn btn-success\">&nbsp;&nbsp;&nbsp;8&nbsp;&nbsp;&nbsp;</button>\r\n                                <button type=\"button\" class=\"id_key9 btn btn-success\">&nbsp;&nbsp;&nbsp;9&nbsp;&nbsp;&nbsp;</button>\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12\">\r\n                                <button type=\"button\" class=\"id_keyAst btn btn-default\">&nbsp;&nbsp;&nbsp;*&nbsp;&nbsp;&nbsp;</button>\r\n                                <button type=\"button\" class=\"id_key0 btn btn-success\">&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;</button>\r\n                                <button type=\"button\" class=\"id_keySharp btn btn-default\">&nbsp;&nbsp;&nbsp;#&nbsp;&nbsp;&nbsp;</button>\r\n                            </div>\r\n\r\n                        </div>\r\n\r\n                        <div class=\"row\">\r\n                            <div class=\"pull-left\">\r\n                                <button class=\"id_btn-green btn btn-success ml10\" type=\"button\">\r\n                                    <i class=\"im-phone2\"></i>\r\n                                    <span></span>\r\n                                </button>\r\n                            </div>\r\n                            <div class=\"pull-right\">\r\n                                <button class=\"id_btn-red btn btn-danger mr10\" type=\"button\">\r\n                                    <i class=\"glyphicon glyphicon-phone-alt\"></i>\r\n                                    <span></span>\r\n                                </button>\r\n                            </div>\r\n                        </div>\r\n\r\n                    </div>\r\n                    <!-- .panel-body-->\r\n                </div>\r\n\r\n\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>";
},{}],134:[function(require,module,exports){
module.exports = "<div class=\"id_UiWebphoneController row\">\r\n\r\n    <div class=\"id_header col-lg-12\">\r\n    </div>\r\n    \r\n    <div class=\"id_staticNotifications col-lg-12\">\r\n    </div>\r\n    \r\n    <div class=\"id_colLeft col-lg-5 col-md-4 col-sm-4 col-xs-12\">\r\n    </div>\r\n    \r\n    <div class=\"id_colRight col-lg-7 col-md-8 col-sm-8 col-xs-12 sortable-layout\">\r\n    </div>\r\n\r\n</div>";
},{}],135:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var types = require("../../../gateway/dist/lib/types");
exports.types = types;
var sipRouting_1 = require("../../../gateway/dist/lib/misc/sipRouting");
exports.readImsi = sipRouting_1.readImsi;
var bundledData_1 = require("../../../gateway/dist/lib/misc/bundledData");
exports.smuggleBundledDataInHeaders = bundledData_1.smuggleBundledDataInHeaders;
exports.extractBundledDataFromHeaders = bundledData_1.extractBundledDataFromHeaders;
exports.urlSafeB64 = bundledData_1.urlSafeB64;

},{"../../../gateway/dist/lib/misc/bundledData":193,"../../../gateway/dist/lib/misc/sipRouting":194,"../../../gateway/dist/lib/types":195}],136:[function(require,module,exports){
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
var gateway_1 = require("../gateway");
var sip = require("ts-sip");
var runExclusive = require("run-exclusive");
var connection = require("./toBackend/connection");
var localApiHandlers = require("./toBackend/localApiHandlers");
var env_1 = require("./env");
//JsSIP.debug.enable("JsSIP:*");
JsSIP.debug.disable("JsSIP:*");
var Ua = /** @class */ (function () {
    function Ua(imsi, sipPassword, disabledMessage) {
        var _this = this;
        if (disabledMessage === void 0) { disabledMessage = false; }
        /** post isRegistered */
        this.evtRegistrationStateChanged = new ts_events_extended_1.SyncEvent();
        this.evtRingback = new ts_events_extended_1.SyncEvent();
        this.isRegistered = false;
        this.evtIncomingMessage = new ts_events_extended_1.SyncEvent();
        this.postEvtIncomingMessage = runExclusive.buildMethod(function (evtData) {
            var onProcessed;
            var pr = new Promise(function (resolve) { return onProcessed = resolve; });
            _this.evtIncomingMessage.post(__assign({}, evtData, { "onProcessed": onProcessed }));
            return pr;
        });
        /** return exactSendDate to match with sendReport and statusReport */
        this.evtIncomingCall = new ts_events_extended_1.SyncEvent();
        var uri = "sip:" + imsi + "-webRTC@" + env_1.baseDomain;
        this.jsSipSocket = new JsSipSocket(imsi, uri);
        this.jsSipUa = new JsSIP.UA({
            "sockets": this.jsSipSocket,
            uri: uri,
            "authorization_user": imsi,
            "password": sipPassword,
            "instance_id": Ua.instanceId.match(/"<urn:([^>]+)>"$/)[1],
            "register": false,
            "contact_uri": uri + ";enc_email=" + gateway_1.urlSafeB64.enc(Ua.email) + (!disabledMessage ? "" : ";no_messages"),
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
    /** Must be called in webphone.ts */
    Ua.setUaInstanceId = function (uaInstanceId, email) {
        this.email = email;
        this.instanceId = uaInstanceId;
    };
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
        var bundledData = gateway_1.extractBundledDataFromHeaders((function () {
            var out = {};
            for (var key in request.headers) {
                out[key] = request.headers[key][0].raw;
            }
            return out;
        })());
        var fromNumber = request.from.uri.user;
        if (bundledData.type === "RINGBACK") {
            this.evtRingback.post(bundledData.callId);
            return;
        }
        var pr = this.postEvtIncomingMessage({
            fromNumber: fromNumber,
            bundledData: bundledData,
            "text": request.body,
        });
        this.jsSipSocket.setMessageOkDelay(request, pr);
    };
    Ua.prototype.sendMessage = function (number, text, exactSendDate, appendPromotionalMessage) {
        var _this = this;
        var extraHeaders = (function () {
            var headers = gateway_1.smuggleBundledDataInHeaders((function () {
                var bundledData = {
                    "type": "MESSAGE",
                    exactSendDate: exactSendDate,
                };
                if (appendPromotionalMessage) {
                    bundledData.appendPromotionalMessage = true;
                }
                return bundledData;
            })());
            var out = [];
            for (var key in headers) {
                out.push(key + ": " + headers[key]);
            }
            return out;
        })();
        return new Promise(function (resolve, reject) { return _this.jsSipUa.sendMessage("sip:" + number + "@" + env_1.baseDomain, text, {
            "contentType": "text/plain; charset=UTF-8",
            extraHeaders: extraHeaders,
            "eventHandlers": {
                "succeeded": function () { return resolve(); },
                "failed": function (_a) {
                    var cause = _a.cause;
                    return reject(new Error("Send message failed " + cause));
                }
            }
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
                        jsSipRtcSession.connection.ontrack =
                            function (_a) {
                                var _b = __read(_a.streams, 1), stream = _b[0];
                                return playAudioStream(stream);
                            };
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
                                "iceServers": [rtcICEServer],
                                "gatheringTimeoutAfterRelay": 700
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
                                    jsSipRtcSession.connection.ontrack =
                                        function (_a) {
                                            var _b = __read(_a.streams, 1), stream = _b[0];
                                            return playAudioStream(stream);
                                        };
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
                if (gateway_1.readImsi(sipPacket) !== imsi) {
                    return;
                }
                sipPacket = _this.sdpHacks(sipPacket);
                _this.evtSipPacket.post(sipPacket);
                _this.ondata(sip.toData(sipPacket).toString("utf8"));
            };
            backendSocket.evtRequest.attach(onSipPacket);
            backendSocket.evtResponse.attach(onSipPacket);
        };
        connection.evtConnect.attach(function (socket) { return onBackedSocketConnect(socket); });
        var socket = connection.get();
        if (!(socket instanceof Promise)) {
            onBackedSocketConnect(socket);
        }
    }
    JsSipSocket.prototype.sdpHacks = function (sipPacket) {
        if (sipPacket.headers["content-type"] !== "application/sdp") {
            return sipPacket;
        }
        //NOTE: Sdp Hack for Mozilla
        if (/firefox/i.test(navigator.userAgent)) {
            console.log("Firefox SDP hack !");
            var parsedSdp = sip.parseSdp(sip.getPacketContent(sipPacket).toString("utf8"));
            var a = parsedSdp["m"][0]["a"];
            if (!!a.find(function (v) { return /^mid:/i.test(v); })) {
                return sipPacket;
            }
            parsedSdp["m"][0]["a"] = __spread(a, ["mid:0"]);
            var modifiedSipPacket = sip.clonePacket(sipPacket);
            sip.setPacketContent(modifiedSipPacket, sip.stringifySdp(parsedSdp));
            return modifiedSipPacket;
        }
        return sipPacket;
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
        console.log(readyState);
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
            if (isFullyReady(__assign({}, p, { isRtcpExcepted: isRtcpExcepted }))) {
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
},{"../gateway":135,"./env":137,"./toBackend/connection":139,"./toBackend/localApiHandlers":140,"buffer":2,"run-exclusive":169,"ts-events-extended":181,"ts-sip":189}],137:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** semasim.com or dev.semasim.com */
exports.baseDomain = window.location.href.match(/^https:\/\/web\.([^\/]+)/)[1];
exports.assetsRoot = window["assets_root"];
exports.isProd = exports.assetsRoot !== "/";

},{}],138:[function(require,module,exports){
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

},{}],139:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var sip = require("ts-sip");
var ts_events_extended_1 = require("ts-events-extended");
var localApiHandlers = require("./localApiHandlers");
var remoteApiCaller = require("./remoteApiCaller");
var bootbox_custom = require("../tools/bootbox_custom");
var Cookies = require("js-cookie");
var env_1 = require("../env");
exports.url = "wss://web." + env_1.baseDomain;
var idString = "toBackend";
var apiServer = new sip.api.Server(localApiHandlers.handlers, sip.api.Server.getDefaultLogger({
    idString: idString,
    "log": env_1.isProd ? (function () { }) : console.log.bind(console),
    "hideKeepAlive": true
}));
var socketCurrent = undefined;
var userSims = undefined;
exports.evtConnect = new ts_events_extended_1.SyncEvent();
/**
 * Pass uaInstanceId to connect as an auxiliary connection of the user account.
 * - Multiple auxiliary connection can be established at the same time.
 * - On the contrary only one main connection can be active at the same time for a given user account )
 * - Auxiliary connections does not receive most of the events defined in localApiHandler.
 *   But will receive notifyIceServer ( if requestTurnCred === true ).
 * - Auxiliary connections will not receive phonebook entries
 * ( userSims will appear as if they had no contacts stored )
 *
 * Called from outside isReconnect should never be passed.
 *  */
function connect(connectionParams, isReconnect) {
    var _this = this;
    //We register 'offline' event only on the first call of connect()
    if (socketCurrent === undefined) {
        window.addEventListener("offline", function () {
            var socket = get();
            if (socket instanceof Promise) {
                return;
            }
            socket.destroy("Browser is offline");
        });
    }
    Cookies.set("requestTurnCred", "" + connectionParams.requestTurnCred);
    {
        var uaInstanceId = connectionParams.uaInstanceId;
        var key = "uaInstanceId";
        if (uaInstanceId !== undefined) {
            Cookies.set(key, uaInstanceId);
        }
        else {
            Cookies.remove(key);
        }
    }
    var socket = new sip.Socket(new WebSocket(exports.url, "SIP"), true, {
        "remoteAddress": "web." + env_1.baseDomain,
        "remotePort": 443
    }, 20000);
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
    }, console.log.bind(console));
    socketCurrent = socket;
    socket.evtConnect.attachOnce(function () {
        console.log("Socket " + (!!isReconnect ? "re-" : "") + "connected");
        if (!!isReconnect) {
            bootbox_custom.dismissLoading();
        }
        var includeContacts = connectionParams.uaInstanceId === undefined;
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
                    if (userSim.isOnline) {
                        return "continue";
                    }
                    userSim.isOnline = userSim_.isOnline;
                    userSim.password = userSim_.password;
                    userSim.dongle = userSim_.dongle;
                    userSim.gatewayLocation = userSim_.gatewayLocation;
                    if (userSim.isOnline) {
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
        var e_2, _a, _b, _c, userSim;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log("Socket disconnected");
                    try {
                        for (_b = __values(userSims || []), _c = _b.next(); !_c.done; _c = _b.next()) {
                            userSim = _c.value;
                            userSim.isOnline = false;
                            localApiHandlers.evtSimIsOnlineStatusChange.post(userSim);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    if (localApiHandlers.evtOpenElsewhere.postCount !== 0) {
                        return [2 /*return*/];
                    }
                    if (socket.evtConnect.postCount === 1) {
                        bootbox_custom.loading("Reconnecting...");
                    }
                    _d.label = 1;
                case 1:
                    if (!!navigator.onLine) return [3 /*break*/, 3];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 2:
                    _d.sent();
                    return [3 /*break*/, 1];
                case 3:
                    connect(connectionParams, "RECONNECT");
                    return [2 /*return*/];
            }
        });
    }); });
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

},{"../env":137,"../tools/bootbox_custom":142,"./localApiHandlers":140,"./remoteApiCaller":141,"js-cookie":167,"ts-events-extended":181,"ts-sip":189}],140:[function(require,module,exports){
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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var apiDeclaration = require("../../sip_api_declarations/uaToBackend");
var ts_events_extended_1 = require("ts-events-extended");
var dcTypes = require("chan-dongle-extended-client/dist/lib/types");
var remoteApiCaller = require("./remoteApiCaller");
//NOTE: Global JS deps.
var bootbox_custom = require("../tools/bootbox_custom");
exports.handlers = {};
exports.evtSimIsOnlineStatusChange = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifySimOffline.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi;
            return __awaiter(_this, void 0, void 0, function () {
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
                            userSim.isOnline = false;
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
            var imsi = _a.imsi, hasInternalSimStorageChanged = _a.hasInternalSimStorageChanged, password = _a.password, simDongle = _a.simDongle, gatewayLocation = _a.gatewayLocation;
            return __awaiter(_this, void 0, void 0, function () {
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
                            userSim.isOnline = true;
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
/** posted when a user that share the SIM created or updated a contact. */
exports.evtContactCreatedOrUpdated = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifyContactCreatedOrUpdated.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, name = _a.name, number_raw = _a.number_raw, storage = _a.storage;
            return __awaiter(_this, void 0, void 0, function () {
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
            return __awaiter(_this, void 0, void 0, function () {
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
        "handler": function (dongle) { return __awaiter(_this, void 0, void 0, function () {
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
    var interact_onLockedDongle_1 = function (dongle) { return __awaiter(_this, void 0, void 0, function () {
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
    var interact_onUsableDongle_1 = function (dongle) { return __awaiter(_this, void 0, void 0, function () {
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
    var getDefaultFriendlyName_1 = function (sim) { return __awaiter(_this, void 0, void 0, function () {
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
            return __awaiter(_this, void 0, void 0, function () {
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
        "handler": function (params) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                interact_1(params);
                return [2 /*return*/, undefined];
            });
        }); }
    };
    exports.handlers[methodName] = handler;
    //TODO: run exclusive
    var interact_1 = function (userSim) { return __awaiter(_this, void 0, void 0, function () {
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
            return __awaiter(_this, void 0, void 0, function () {
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
                            userSim.ownership.sharedWith.notConfirmed.splice(userSim.ownership.sharedWith.notConfirmed.indexOf(email), 1);
                            if (isAccepted) {
                                userSim.ownership.sharedWith.confirmed.push(email);
                            }
                            exports.evtSharingRequestResponse.post({ userSim: userSim, email: email, isAccepted: isAccepted });
                            bootbox_custom.alert(email + " " + (isAccepted ? "accepted" : "rejected") + " your sharing request for " + userSim.friendlyName);
                            return [2 /*return*/, undefined];
                    }
                });
            });
        }
    };
    exports.handlers[methodName] = handler;
}
exports.evtSharedSimUnregistered = new ts_events_extended_1.SyncEvent();
{
    var methodName = apiDeclaration.notifySharedSimUnregistered.methodName;
    var handler = {
        "handler": function (_a) {
            var imsi = _a.imsi, email = _a.email;
            return __awaiter(_this, void 0, void 0, function () {
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
                            userSim.ownership.sharedWith.confirmed.splice(userSim.ownership.sharedWith.confirmed.indexOf(email), 1);
                            exports.evtSharedSimUnregistered.post({ userSim: userSim, email: email });
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
        "handler": function () { return __awaiter(_this, void 0, void 0, function () {
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
        "handler": function (params, fromSocket) { return __awaiter(_this, void 0, void 0, function () {
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

},{"../../sip_api_declarations/uaToBackend":149,"../tools/bootbox_custom":142,"./remoteApiCaller":141,"chan-dongle-extended-client/dist/lib/types":151,"ts-events-extended":181}],141:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var sipLibrary = require("ts-sip");
var ts_events_extended_1 = require("ts-events-extended");
var apiDeclaration = require("../../sip_api_declarations/backendToUa");
var connection = require("./connection");
var phone_number_1 = require("phone-number");
var types = require("../types");
var wd = types.webphoneData;
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
        var prUsableUserSims_ = sendRequest(methodName, { includeContacts: includeContacts });
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
        return sendRequest(methodName, { "imei": lockedDongle.imei, pin: pin });
    };
})();
exports.registerSim = (function () {
    var methodName = apiDeclaration.registerSim.methodName;
    return function (dongle, friendlyName) {
        return __awaiter(this, void 0, void 0, function () {
            var userSim;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, {
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
                    case 0: return [4 /*yield*/, sendRequest(methodName, { "imsi": userSim.sim.imsi })];
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
        return sendRequest(methodName, { "imsi": userSim.sim.imsi });
    };
})();
exports.shareSim = (function () {
    var methodName = apiDeclaration.shareSim.methodName;
    return function (userSim, emails, message) {
        return __awaiter(this, void 0, void 0, function () {
            var e_1, _a, emails_1, emails_1_1, email;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, { "imsi": userSim.sim.imsi, emails: emails, message: message })];
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
            var e_2, _a, emails_2, emails_2_1, email, _b, notConfirmed, confirmed, arr, index;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, { "imsi": userSim.sim.imsi, emails: emails })];
                    case 1:
                        _c.sent();
                        try {
                            for (emails_2 = __values(emails), emails_2_1 = emails_2.next(); !emails_2_1.done; emails_2_1 = emails_2.next()) {
                                email = emails_2_1.value;
                                _b = userSim.ownership.sharedWith, notConfirmed = _b.notConfirmed, confirmed = _b.confirmed;
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
                                if (emails_2_1 && !emails_2_1.done && (_a = emails_2.return)) _a.call(emails_2);
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
                    case 0: return [4 /*yield*/, sendRequest(methodName, { "imsi": userSim.sim.imsi, friendlyName: friendlyName })];
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
                    case 0: return [4 /*yield*/, sendRequest(methodName, { "imsi": notConfirmedUserSim.sim.imsi, friendlyName: friendlyName })];
                    case 1:
                        password = (_a.sent()).password;
                        userSim = {
                            "sim": notConfirmedUserSim.sim,
                            friendlyName: friendlyName,
                            password: password,
                            "dongle": notConfirmedUserSim.dongle,
                            "gatewayLocation": notConfirmedUserSim.gatewayLocation,
                            "isOnline": notConfirmedUserSim.isOnline,
                            "ownership": {
                                "status": "SHARED CONFIRMED",
                                "ownerEmail": notConfirmedUserSim.ownership.ownerEmail
                            },
                            "phonebook": notConfirmedUserSim.phonebook
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
                    case 0: return [4 /*yield*/, sendRequest(methodName, { "imsi": userSim.sim.imsi })];
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
                    case 0: return [4 /*yield*/, sendRequest(methodName, { "imsi": userSim.sim.imsi, name: name, number: number })];
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
                        return [4 /*yield*/, sendRequest(methodName, {
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
                    case 2: return [4 /*yield*/, sendRequest(methodName, {
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
                    case 0: return [4 /*yield*/, sendRequest(methodName, {
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
        return sendRequest(methodName, undefined).then(function (response) { return cachedResponse = response; });
    };
})();
exports.getUaInstanceId = (function () {
    var methodName = apiDeclaration.getUaInstanceId.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();
//WebData sync things :
exports.getOrCreateWdInstance = (function () {
    var methodName = apiDeclaration.getOrCreateInstance.methodName;
    function synchronizeUserSimAndWdInstance(userSim, wdInstance) {
        return __awaiter(this, void 0, void 0, function () {
            var e_3, _a, e_4, _b, wdChatWhoseContactNoLongerInPhonebook, _loop_1, _c, _d, contact, e_3_1, wdChatWhoseContactNoLongerInPhonebook_1, wdChatWhoseContactNoLongerInPhonebook_1_1, wdChat, e_4_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        wdChatWhoseContactNoLongerInPhonebook = new Set(wdInstance.chats);
                        _loop_1 = function (contact) {
                            var wdChat;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        wdChat = wdInstance.chats.find(function (_a) {
                                            var contactNumber = _a.contactNumber;
                                            return phone_number_1.phoneNumber.areSame(contactNumber, contact.number_raw);
                                        });
                                        if (!!!wdChat) return [3 /*break*/, 2];
                                        wdChatWhoseContactNoLongerInPhonebook.delete(wdChat);
                                        return [4 /*yield*/, updateWdChatContactInfos(wdChat, contact.name, contact.mem_index !== undefined ? contact.mem_index : null)];
                                    case 1:
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 2: return [4 /*yield*/, exports.newWdChat(wdInstance, phone_number_1.phoneNumber.build(contact.number_raw, userSim.sim.country ? userSim.sim.country.iso : undefined), contact.name, contact.mem_index !== undefined ? contact.mem_index : null)];
                                    case 3:
                                        _a.sent();
                                        _a.label = 4;
                                    case 4: return [2 /*return*/];
                                }
                            });
                        };
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 6, 7, 8]);
                        _c = __values(userSim.phonebook), _d = _c.next();
                        _e.label = 2;
                    case 2:
                        if (!!_d.done) return [3 /*break*/, 5];
                        contact = _d.value;
                        return [5 /*yield**/, _loop_1(contact)];
                    case 3:
                        _e.sent();
                        _e.label = 4;
                    case 4:
                        _d = _c.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_3_1 = _e.sent();
                        e_3 = { error: e_3_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                        }
                        finally { if (e_3) throw e_3.error; }
                        return [7 /*endfinally*/];
                    case 8:
                        _e.trys.push([8, 13, 14, 15]);
                        wdChatWhoseContactNoLongerInPhonebook_1 = __values(wdChatWhoseContactNoLongerInPhonebook), wdChatWhoseContactNoLongerInPhonebook_1_1 = wdChatWhoseContactNoLongerInPhonebook_1.next();
                        _e.label = 9;
                    case 9:
                        if (!!wdChatWhoseContactNoLongerInPhonebook_1_1.done) return [3 /*break*/, 12];
                        wdChat = wdChatWhoseContactNoLongerInPhonebook_1_1.value;
                        return [4 /*yield*/, updateWdChatContactInfos(wdChat, "", null)];
                    case 10:
                        _e.sent();
                        _e.label = 11;
                    case 11:
                        wdChatWhoseContactNoLongerInPhonebook_1_1 = wdChatWhoseContactNoLongerInPhonebook_1.next();
                        return [3 /*break*/, 9];
                    case 12: return [3 /*break*/, 15];
                    case 13:
                        e_4_1 = _e.sent();
                        e_4 = { error: e_4_1 };
                        return [3 /*break*/, 15];
                    case 14:
                        try {
                            if (wdChatWhoseContactNoLongerInPhonebook_1_1 && !wdChatWhoseContactNoLongerInPhonebook_1_1.done && (_b = wdChatWhoseContactNoLongerInPhonebook_1.return)) _b.call(wdChatWhoseContactNoLongerInPhonebook_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                        return [7 /*endfinally*/];
                    case 15: return [2 /*return*/];
                }
            });
        });
    }
    return function (userSim) {
        return __awaiter(this, void 0, void 0, function () {
            var imsi, _a, instance_id, chats, wdInstance;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        imsi = userSim.sim.imsi;
                        return [4 /*yield*/, sendRequest(methodName, { imsi: imsi })];
                    case 1:
                        _a = _b.sent(), instance_id = _a.instance_id, chats = _a.chats;
                        wdInstance = {
                            "id_": instance_id,
                            imsi: imsi,
                            chats: chats
                        };
                        return [4 /*yield*/, synchronizeUserSimAndWdInstance(userSim, wdInstance)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, wdInstance];
                }
            });
        });
    };
})();
exports.newWdChat = (function () {
    var methodName = apiDeclaration.newChat.methodName;
    return function (wdInstance, contactNumber, contactName, contactIndexInSim) {
        return __awaiter(this, void 0, void 0, function () {
            var chat_id, wdChat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, {
                            "instance_id": wdInstance.id_,
                            contactNumber: contactNumber,
                            contactName: contactName,
                            contactIndexInSim: contactIndexInSim
                        })];
                    case 1:
                        chat_id = (_a.sent()).chat_id;
                        wdChat = {
                            "id_": chat_id,
                            contactNumber: contactNumber,
                            contactName: contactName,
                            contactIndexInSim: contactIndexInSim,
                            "idOfLastMessageSeen": null,
                            "messages": []
                        };
                        wdInstance.chats.push(wdChat);
                        return [2 /*return*/, wdChat];
                }
            });
        });
    };
})();
exports.fetchOlderWdMessages = (function () {
    var methodName = apiDeclaration.fetchOlderMessages.methodName;
    return function (wdChat) {
        return __awaiter(this, void 0, void 0, function () {
            var e_5, _a, lastMessage, olderThanMessageId, olderWdMessages, set, i, message, _b, _c, message;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        lastMessage = wdChat.messages.slice(-1).pop();
                        if (!lastMessage) {
                            return [2 /*return*/, []];
                        }
                        olderThanMessageId = wdChat.messages[0].id_;
                        return [4 /*yield*/, sendRequest(methodName, {
                                "chat_id": wdChat.id_,
                                olderThanMessageId: olderThanMessageId
                            })];
                    case 1:
                        olderWdMessages = _d.sent();
                        set = new Set(wdChat.messages.map(function (_a) {
                            var id_ = _a.id_;
                            return id_;
                        }));
                        for (i = olderWdMessages.length - 1; i >= 0; i--) {
                            message = olderWdMessages[i];
                            if (set.has(message.id_)) {
                                continue;
                            }
                            wdChat.messages.unshift(message);
                        }
                        wdChat.messages.sort(wd.compareMessage);
                        olderWdMessages = [];
                        try {
                            for (_b = __values(wdChat.messages), _c = _b.next(); !_c.done; _c = _b.next()) {
                                message = _c.value;
                                if (message.id_ === olderThanMessageId) {
                                    break;
                                }
                                olderWdMessages.push(message);
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                        return [2 /*return*/, olderWdMessages];
                }
            });
        });
    };
})();
/**
 *
 * If same as before the request won't be sent
 *
 * return true if update was performed
 *
 * */
function updateWdChatIdOfLastMessageSeen(wdChat) {
    return __awaiter(this, void 0, void 0, function () {
        var message_id, i, message;
        return __generator(this, function (_a) {
            message_id = undefined;
            for (i = wdChat.messages.length - 1; i >= 0; i--) {
                message = wdChat.messages[i];
                if (message.direction === "INCOMING" ||
                    (message.status === "STATUS REPORT RECEIVED" &&
                        message.sentBy.who === "OTHER")) {
                    message_id = message.id_;
                    break;
                }
            }
            return [2 /*return*/, updateWdChat(wdChat, { "idOfLastMessageSeen": message_id })];
        });
    });
}
exports.updateWdChatIdOfLastMessageSeen = updateWdChatIdOfLastMessageSeen;
/**
 *
 * If same as before the request won't be sent
 *
 * return true if update was performed
 *
 * */
function updateWdChatContactInfos(wdChat, contactName, contactIndexInSim) {
    return updateWdChat(wdChat, {
        contactName: contactName,
        contactIndexInSim: contactIndexInSim
    });
}
exports.updateWdChatContactInfos = updateWdChatContactInfos;
var updateWdChat = (function () {
    var methodName = apiDeclaration.updateChat.methodName;
    /**
     *
     * If same as before the request won't be sent
     *
     * return true if update performed
     *
     * */
    return function (wdChat, fields) {
        return __awaiter(this, void 0, void 0, function () {
            var params, key, value, key;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = { "chat_id": wdChat.id_ };
                        for (key in fields) {
                            value = fields[key];
                            if (value === undefined || wdChat[key] === value) {
                                continue;
                            }
                            params[key] = value;
                        }
                        if (Object.keys(params).length === 1) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, sendRequest(methodName, params)];
                    case 1:
                        _a.sent();
                        delete params.chat_id;
                        for (key in params) {
                            wdChat[key] = params[key];
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
})();
exports.destroyWdChat = (function () {
    var methodName = apiDeclaration.destroyChat.methodName;
    return function (wdInstance, wdChat) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, { "chat_id": wdChat.id_ })];
                    case 1:
                        _a.sent();
                        wdInstance.chats.splice(wdInstance.chats.indexOf(wdChat), 1);
                        return [2 /*return*/];
                }
            });
        });
    };
})();
function newWdMessage(wdChat, message_) {
    return __awaiter(this, void 0, void 0, function () {
        var message, isSameWdMessage, methodName, message_id, wdMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    message = message_;
                    isSameWdMessage = function (wdMessage) {
                        var areSame = function (o1, o2) {
                            for (var key in o1) {
                                var value = o1[key];
                                if (value instanceof Object) {
                                    if (!areSame(value, o2[key])) {
                                        return false;
                                    }
                                }
                                else {
                                    if (value !== o2[key]) {
                                        return false;
                                    }
                                }
                            }
                            return true;
                        };
                        return areSame(wdMessage, message_);
                    };
                    if (!!wdChat.messages.find(isSameWdMessage)) {
                        return [2 /*return*/, undefined];
                    }
                    methodName = apiDeclaration.newMessage.methodName;
                    return [4 /*yield*/, sendRequest(methodName, { "chat_id": wdChat.id_, message: message })];
                case 1:
                    message_id = (_a.sent()).message_id;
                    wdMessage = (__assign({}, message, { "id_": message_id }));
                    wdChat.messages.push(wdMessage);
                    wdChat.messages.sort(wd.compareMessage);
                    return [2 /*return*/, wdMessage];
            }
        });
    });
}
exports.newWdMessage = newWdMessage;
function notifyUaFailedToSendMessage(wdChat, wdMessage) {
    return _notifySendReportReceived(wdChat, wdMessage, false);
}
exports.notifyUaFailedToSendMessage = notifyUaFailedToSendMessage;
function notifySendReportReceived(wdChat, sendReportBundledData) {
    var wdMessage = (function () {
        for (var i = wdChat.messages.length - 1; i >= 0; i--) {
            var message = wdChat.messages[i];
            if (message.direction === "OUTGOING" &&
                message.status === "PENDING" &&
                message.time === sendReportBundledData.messageTowardGsm.date.getTime()) {
                return message;
            }
        }
        return undefined;
    })();
    if (!wdMessage) {
        return Promise.resolve(undefined);
    }
    var isSentSuccessfully = sendReportBundledData.sendDate !== null;
    return _notifySendReportReceived(wdChat, wdMessage, isSentSuccessfully);
}
exports.notifySendReportReceived = notifySendReportReceived;
var _notifySendReportReceived = (function () {
    var methodName = apiDeclaration.notifySendReportReceived.methodName;
    return function (wdChat, wdMessage, isSentSuccessfully) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedWdMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, {
                            "message_id": wdMessage.id_,
                            isSentSuccessfully: isSentSuccessfully
                        })];
                    case 1:
                        _a.sent();
                        updatedWdMessage = {
                            "id_": wdMessage.id_,
                            "time": wdMessage.time,
                            "direction": "OUTGOING",
                            "text": wdMessage.text,
                            "status": "SEND REPORT RECEIVED",
                            isSentSuccessfully: isSentSuccessfully
                        };
                        wdChat.messages[wdChat.messages.indexOf(wdMessage)] = updatedWdMessage;
                        wdChat.messages.sort(wd.compareMessage);
                        return [2 /*return*/, updatedWdMessage];
                }
            });
        });
    };
})();
exports.notifyStatusReportReceived = (function () {
    var methodName = apiDeclaration.notifyStatusReportReceived.methodName;
    /** Assert the status report state that the message was sent from this device. */
    return function (wdChat, statusReportBundledData) {
        return __awaiter(this, void 0, void 0, function () {
            var wdMessage, deliveredTime, updatedWdMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wdMessage = (function () {
                            for (var i = wdChat.messages.length - 1; i >= 0; i--) {
                                var message = wdChat.messages[i];
                                if (message.direction === "OUTGOING" &&
                                    message.status === "SEND REPORT RECEIVED" &&
                                    message.time === statusReportBundledData.messageTowardGsm.date.getTime()) {
                                    return message;
                                }
                            }
                            return undefined;
                        })();
                        if (!wdMessage) {
                            return [2 /*return*/, undefined];
                        }
                        deliveredTime = statusReportBundledData.statusReport.isDelivered ?
                            statusReportBundledData.statusReport.dischargeDate.getTime() : null;
                        return [4 /*yield*/, sendRequest(methodName, {
                                "message_id": wdMessage.id_,
                                deliveredTime: deliveredTime
                            })];
                    case 1:
                        _a.sent();
                        updatedWdMessage = {
                            "id_": wdMessage.id_,
                            "time": wdMessage.time,
                            "direction": "OUTGOING",
                            "text": wdMessage.text,
                            "sentBy": { "who": "USER" },
                            "status": "STATUS REPORT RECEIVED",
                            deliveredTime: deliveredTime
                        };
                        wdChat.messages[wdChat.messages.indexOf(wdMessage)] = updatedWdMessage;
                        wdChat.messages.sort(wd.compareMessage);
                        return [2 /*return*/, updatedWdMessage];
                }
            });
        });
    };
})();
function sendRequest(methodName, params, retry) {
    return __awaiter(this, void 0, void 0, function () {
        var response, _a, _b, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    _b = (_a = sipLibrary.api.client).sendRequest;
                    return [4 /*yield*/, connection.get()];
                case 1:
                    response = _b.apply(_a, [_c.sent(),
                        methodName,
                        params,
                        { "timeout": 60 * 1000 }]);
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _c.sent();
                    if (!!retry) {
                        return [2 /*return*/, sendRequest(methodName, params, "RETRY")];
                    }
                    else {
                        throw error_1;
                    }
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/, response];
            }
        });
    });
}

},{"../../sip_api_declarations/backendToUa":148,"../types":146,"./connection":139,"phone-number":168,"ts-events-extended":181,"ts-sip":189}],142:[function(require,module,exports){
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
                message + "</p>"
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

},{"./modal_stack":144}],143:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isAscendingAlphabeticalOrder(a, b) {
    if (!a || !b) {
        return a.length < b.length;
    }
    var getWeight = function (str) {
        var val = str.charAt(0).toLowerCase().charCodeAt(0);
        if (!(96 < val && val < 123)) {
            return 123;
        }
        return val;
    };
    var vA = getWeight(a);
    var vB = getWeight(b);
    if (vA === vB) {
        return isAscendingAlphabeticalOrder(a.substr(1), b.substr(1));
    }
    return vA < vB;
}
exports.isAscendingAlphabeticalOrder = isAscendingAlphabeticalOrder;

},{}],144:[function(require,module,exports){
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
var stack = [];
var onHideKey = " __hide_handler__ ";
function add(modal, options) {
    var _this = this;
    //NOTE: null only when called by bootbox_custom.
    if (options !== null) {
        modal.modal(__assign({}, options, { "show": false }));
    }
    return {
        "show": function () { return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var currentModal_1, prHidden;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (stack.indexOf(modal) >= 0) {
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
                        modal.modal("show");
                        modal.one("shown.bs.modal", function () { return resolve(); });
                        return [2 /*return*/];
                }
            });
        }); }); },
        "hide": function () { return new Promise(function (resolve) {
            if (stack.indexOf(modal) < 0) {
                return;
            }
            modal.one("hidden.bs.modal", function () { return resolve(); });
            modal.modal("hide");
        }); }
    };
}
exports.add = add;

},{}],145:[function(require,module,exports){
if (typeof ArrayBuffer.isView !== "function") {
    Object.defineProperty(ArrayBuffer, "isView", { "value": function isView() { return false; } });
}
if (typeof String.prototype.startsWith !== "function") {
    String.prototype.startsWith = function startsWith(str) {
        return this.indexOf(str) === 0;
    };
}

},{}],146:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var isAscendingAlphabeticalOrder_1 = require("./tools/isAscendingAlphabeticalOrder");
var UserSim;
(function (UserSim) {
    var Owned;
    (function (Owned) {
        function match(userSim) {
            return userSim.ownership.status === "OWNED";
        }
        Owned.match = match;
    })(Owned = UserSim.Owned || (UserSim.Owned = {}));
    var Shared;
    (function (Shared) {
        function match(userSim) {
            return Confirmed.match(userSim) || NotConfirmed.match(userSim);
        }
        Shared.match = match;
        var Confirmed;
        (function (Confirmed) {
            function match(userSim) {
                return userSim.ownership.status === "SHARED CONFIRMED";
            }
            Confirmed.match = match;
        })(Confirmed = Shared.Confirmed || (Shared.Confirmed = {}));
        var NotConfirmed;
        (function (NotConfirmed) {
            function match(userSim) {
                return userSim.ownership.status === "SHARED NOT CONFIRMED";
            }
            NotConfirmed.match = match;
        })(NotConfirmed = Shared.NotConfirmed || (Shared.NotConfirmed = {}));
    })(Shared = UserSim.Shared || (UserSim.Shared = {}));
    var Usable;
    (function (Usable) {
        function match(userSim) {
            return Owned.match(userSim) || Shared.Confirmed.match(userSim);
        }
        Usable.match = match;
    })(Usable = UserSim.Usable || (UserSim.Usable = {}));
})(UserSim = exports.UserSim || (exports.UserSim = {}));
var webphoneData;
(function (webphoneData) {
    /** Best guess on previously opened chat: */
    function getChatWithLatestActivity(wdInstance) {
        var e_1, _a;
        //TODO: what if last seen message not loaded.
        var findMessageByIdAndGetTime = function (wdChat, message_id) {
            if (message_id === null) {
                return 0;
            }
            for (var i = wdChat.messages.length - 1; i >= 0; i--) {
                var message = wdChat.messages[i];
                if (message.id_ === message_id) {
                    return message.time;
                }
            }
            return 0;
        };
        var findLastMessageSentByUserAndGetTime = function (chat) {
            for (var i = chat.messages.length - 1; i >= 0; i--) {
                var message = chat.messages[i];
                if (message.direction === "OUTGOING" &&
                    (message.status !== "STATUS REPORT RECEIVED" ||
                        message.sentBy.who === "USER")) {
                    return message.time;
                }
            }
            return 0;
        };
        var max = 0;
        var chat = undefined;
        try {
            for (var _b = __values(wdInstance.chats), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _chat = _c.value;
                var curr = Math.max(findMessageByIdAndGetTime(_chat, _chat.idOfLastMessageSeen), findLastMessageSentByUserAndGetTime(_chat));
                if (curr > max) {
                    max = curr;
                    chat = _chat;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return chat;
    }
    webphoneData.getChatWithLatestActivity = getChatWithLatestActivity;
    /**
     *
     * message1  < ( older than )  message1  => -1
     * message1 === message2  => 0
     * message1  >  message2  => 1
     *
     * Produce an ordering or messages that reflect the
     * real temporality of a conversation.
     *
     */
    function compareMessage(message1, message2) {
        var getOrderingTime = function (message) {
            if (message.direction === "OUTGOING") {
                if (message.status === "STATUS REPORT RECEIVED") {
                    if (message.deliveredTime !== null) {
                        return message.deliveredTime;
                    }
                }
                else if (!(message.status === "SEND REPORT RECEIVED" && !message.isSentSuccessfully)) {
                    var time = message.time + 60 * 1000;
                    if (time > Date.now()) {
                        return time;
                    }
                }
            }
            return message.time;
        };
        //return Math.sign(getOrderingTime(message1) - getOrderingTime(message2)) as (-1 | 0 | 1);
        var diff = getOrderingTime(message1) - getOrderingTime(message2);
        return diff !== 0 ? (diff > 0 ? 1 : -1) : 0;
    }
    webphoneData.compareMessage = compareMessage;
    /**
     *
     * chat1  <  chat2  => -1
     * chat1 === chat2  => 0
     * chat1  >  chat2  => 1
     *
     * Sorting a set of chats in decreasing order
     * will result in the following:
     *
     * -First chat with the more recent activity.
     * ( more resent message according to message ordering )
     * -Then chats that does not contain message will be
     * ordered in alphabetical order against their contact's name.
     * -Then the chats with no messages and no contact name
     * will be sorted in a non specified, deterministic order.
     *
     */
    function compareChat(chat1, chat2) {
        var hasContactName = function (chat) { return chat.contactName !== ""; };
        var hasMessages = function (chat) { return chat.messages.length !== 0; };
        if (hasMessages(chat1) || hasMessages(chat2)) {
            if (!hasMessages(chat1)) {
                return -1;
            }
            if (!hasMessages(chat2)) {
                return 1;
            }
            //Assuming message are already ordered within chat.
            return compareMessage(chat1.messages.slice(-1).pop(), chat2.messages.slice(-1).pop());
        }
        else if (hasContactName(chat1) || hasContactName(chat2)) {
            if (!hasContactName(chat1)) {
                return -1;
            }
            if (!hasContactName(chat2)) {
                return 1;
            }
            return isAscendingAlphabeticalOrder_1.isAscendingAlphabeticalOrder(chat1.contactName, chat2.contactName) ? 1 : -1;
        }
        else {
            return chat1.contactNumber < chat2.contactNumber ? -1 : 1;
        }
    }
    webphoneData.compareChat = compareChat;
    function getUnreadMessagesCount(wdChat) {
        var count = 0;
        for (var i = wdChat.messages.length - 1; i >= 0; i--) {
            var message = wdChat.messages[i];
            if (message.direction === "INCOMING" ||
                (message.status === "STATUS REPORT RECEIVED" &&
                    message.sentBy.who === "OTHER")) {
                if (wdChat.idOfLastMessageSeen === message.id_) {
                    break;
                }
                count++;
            }
        }
        return count;
    }
    webphoneData.getUnreadMessagesCount = getUnreadMessagesCount;
})(webphoneData = exports.webphoneData || (exports.webphoneData = {}));

},{"./tools/isAscendingAlphabeticalOrder":143}],147:[function(require,module,exports){
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
var apiDeclaration = require("../web_api_declaration");
var ttJC = require("transfer-tools/dist/lib/JSON_CUSTOM");
//NOTE: Assert jQuery loaded on the page
var JSON_CUSTOM = ttJC.get();
function sendRequest(methodName, params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return window["$"].ajax({
                    "url": "/" + apiDeclaration.apiPath + "/" + methodName,
                    "method": "POST",
                    "contentType": "application/json; charset=UTF-8",
                    "data": JSON_CUSTOM.stringify(params),
                    "dataType": "text",
                    "statusCode": {
                        "400": function () { return alert("Bad request ( bug in the client )"); },
                        "401": function () { return window.location.reload(); },
                        "500": function () { return alert("Bug on the server, sorry :("); },
                        "200": function (data) { return resolve(JSON_CUSTOM.parse(data)); }
                    }
                }); })];
        });
    });
}
function registerUser(email, password) {
    var methodName = apiDeclaration.registerUser.methodName;
    return sendRequest(methodName, { email: email, password: password });
}
exports.registerUser = registerUser;
function validateEmail(email, activationCode) {
    var methodName = apiDeclaration.validateEmail.methodName;
    return sendRequest(methodName, { email: email, activationCode: activationCode });
}
exports.validateEmail = validateEmail;
function loginUser(email, password) {
    var methodName = apiDeclaration.loginUser.methodName;
    return sendRequest(methodName, { email: email, password: password });
}
exports.loginUser = loginUser;
function logoutUser() {
    var methodName = apiDeclaration.logoutUser.methodName;
    return sendRequest(methodName, undefined);
}
exports.logoutUser = logoutUser;
/** Return true if email has account */
function sendRenewPasswordEmail(email) {
    var methodName = apiDeclaration.sendRenewPasswordEmail.methodName;
    return sendRequest(methodName, { email: email });
}
exports.sendRenewPasswordEmail = sendRenewPasswordEmail;
function renewPassword(email, newPassword, token) {
    var methodName = apiDeclaration.renewPassword.methodName;
    return sendRequest(methodName, { email: email, newPassword: newPassword, token: token });
}
exports.renewPassword = renewPassword;
function getSubscriptionInfos() {
    var methodName = apiDeclaration.getSubscriptionInfos.methodName;
    return sendRequest(methodName, undefined);
}
exports.getSubscriptionInfos = getSubscriptionInfos;
function subscribeOrUpdateSource(sourceId) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    methodName = apiDeclaration.subscribeOrUpdateSource.methodName;
                    return [4 /*yield*/, sendRequest(methodName, { sourceId: sourceId })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.subscribeOrUpdateSource = subscribeOrUpdateSource;
function unsubscribe() {
    return __awaiter(this, void 0, void 0, function () {
        var methodName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    methodName = apiDeclaration.unsubscribe.methodName;
                    return [4 /*yield*/, sendRequest(methodName, undefined)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.unsubscribe = unsubscribe;
/*
function buildUrl(
    methodName: string,
    params: Record<string, string | undefined>
): string {

    let query: string[] = [];

    for (let key of Object.keys(params)) {

        let value = params[key];

        if (value === undefined) continue;

        query[query.length] = `${key}=${params[key]}`;

    }

    let url = `https://${c.backendHostname}:${c.webApiPort}/${c.webApiPath}/${methodName}?${query.join("&")}`;

    console.log(`GET ${url}`);

    return url;
}
*/ 

},{"../web_api_declaration":150,"transfer-tools/dist/lib/JSON_CUSTOM":172}],148:[function(require,module,exports){
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
var getUaInstanceId;
(function (getUaInstanceId) {
    getUaInstanceId.methodName = "getUaCredentials";
})(getUaInstanceId = exports.getUaInstanceId || (exports.getUaInstanceId = {}));
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

},{}],149:[function(require,module,exports){
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
var notifySharedSimUnregistered;
(function (notifySharedSimUnregistered) {
    notifySharedSimUnregistered.methodName = "notifySharedSimUnregistered";
})(notifySharedSimUnregistered = exports.notifySharedSimUnregistered || (exports.notifySharedSimUnregistered = {}));
var notifyLoggedFromOtherTab;
(function (notifyLoggedFromOtherTab) {
    notifyLoggedFromOtherTab.methodName = "notifyLoggedFromOtherTab";
})(notifyLoggedFromOtherTab = exports.notifyLoggedFromOtherTab || (exports.notifyLoggedFromOtherTab = {}));
var notifyIceServer;
(function (notifyIceServer) {
    notifyIceServer.methodName = "notifyIceServer";
})(notifyIceServer = exports.notifyIceServer || (exports.notifyIceServer = {}));

},{}],150:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPath = "api";
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

},{}],151:[function(require,module,exports){
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

},{}],152:[function(require,module,exports){
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

},{"./custom/trap":153,"./custom/zalgo":154,"./maps/america":157,"./maps/rainbow":158,"./maps/random":159,"./maps/zebra":160,"./styles":161,"./system/supports-colors":163,"util":8}],153:[function(require,module,exports){
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

},{}],154:[function(require,module,exports){
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


},{}],155:[function(require,module,exports){
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

},{"./colors":152}],156:[function(require,module,exports){
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

},{"./colors":152,"./extendStringPrototype":155}],157:[function(require,module,exports){
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

},{}],158:[function(require,module,exports){
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


},{}],159:[function(require,module,exports){
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

},{}],160:[function(require,module,exports){
module['exports'] = function(colors) {
  return function(letter, i, exploded) {
    return i % 2 === 0 ? letter : colors.inverse(letter);
  };
};

},{}],161:[function(require,module,exports){
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

},{}],162:[function(require,module,exports){
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
},{"_process":6}],163:[function(require,module,exports){
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
},{"./has-flag.js":162,"_process":6,"os":5}],164:[function(require,module,exports){
arguments[4][106][0].apply(exports,arguments)
},{"dup":106}],165:[function(require,module,exports){
arguments[4][107][0].apply(exports,arguments)
},{"./implementation":164,"dup":107}],166:[function(require,module,exports){
arguments[4][110][0].apply(exports,arguments)
},{"dup":110,"function-bind":165}],167:[function(require,module,exports){
/*!
 * JavaScript Cookie v2.2.0
 * https://github.com/js-cookie/js-cookie
 *
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 * Released under the MIT license
 */
;(function (factory) {
	var registeredInModuleLoader = false;
	if (typeof define === 'function' && define.amd) {
		define(factory);
		registeredInModuleLoader = true;
	}
	if (typeof exports === 'object') {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function init (converter) {
		function api (key, value, attributes) {
			var result;
			if (typeof document === 'undefined') {
				return;
			}

			// Write

			if (arguments.length > 1) {
				attributes = extend({
					path: '/'
				}, api.defaults, attributes);

				if (typeof attributes.expires === 'number') {
					var expires = new Date();
					expires.setMilliseconds(expires.getMilliseconds() + attributes.expires * 864e+5);
					attributes.expires = expires;
				}

				// We're using "expires" because "max-age" is not supported by IE
				attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

				try {
					result = JSON.stringify(value);
					if (/^[\{\[]/.test(result)) {
						value = result;
					}
				} catch (e) {}

				if (!converter.write) {
					value = encodeURIComponent(String(value))
						.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
				} else {
					value = converter.write(value, key);
				}

				key = encodeURIComponent(String(key));
				key = key.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent);
				key = key.replace(/[\(\)]/g, escape);

				var stringifiedAttributes = '';

				for (var attributeName in attributes) {
					if (!attributes[attributeName]) {
						continue;
					}
					stringifiedAttributes += '; ' + attributeName;
					if (attributes[attributeName] === true) {
						continue;
					}
					stringifiedAttributes += '=' + attributes[attributeName];
				}
				return (document.cookie = key + '=' + value + stringifiedAttributes);
			}

			// Read

			if (!key) {
				result = {};
			}

			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all. Also prevents odd result when
			// calling "get()"
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var rdecode = /(%[0-9A-Z]{2})+/g;
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (!this.json && cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = parts[0].replace(rdecode, decodeURIComponent);
					cookie = converter.read ?
						converter.read(cookie, name) : converter(cookie, name) ||
						cookie.replace(rdecode, decodeURIComponent);

					if (this.json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					if (key === name) {
						result = cookie;
						break;
					}

					if (!key) {
						result[name] = cookie;
					}
				} catch (e) {}
			}

			return result;
		}

		api.set = api;
		api.get = function (key) {
			return api.call(api, key);
		};
		api.getJSON = function () {
			return api.apply({
				json: true
			}, [].slice.call(arguments));
		};
		api.defaults = {};

		api.remove = function (key, attributes) {
			api(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
}));

},{}],168:[function(require,module,exports){
arguments[4][120][0].apply(exports,arguments)
},{"_process":6,"dup":120}],169:[function(require,module,exports){
arguments[4][121][0].apply(exports,arguments)
},{"dup":121}],170:[function(require,module,exports){
arguments[4][122][0].apply(exports,arguments)
},{"dup":122}],171:[function(require,module,exports){
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
},{"has":166}],172:[function(require,module,exports){
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

},{"super-json":171}],173:[function(require,module,exports){
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

},{"./JSON_CUSTOM":172,"./stringTransform":174,"./stringTransformExt":175,"./testing":176}],174:[function(require,module,exports){
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
},{"buffer":2}],175:[function(require,module,exports){
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

},{"./stringTransform":174}],176:[function(require,module,exports){
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
        if (o1 instanceof Date) {
            if (!(o2 instanceof Date)) {
                console.assert(false, "M0");
                return;
            }
            console.assert(o1.getTime() === o2.getTime(), "Date mismatch");
        }
        else if (o1 instanceof Object) {
            console.assert(o2 instanceof Object, "M1");
            if (assertSame.handleArrayAsSet && o1 instanceof Array) {
                if (!(o2 instanceof Array)) {
                    console.assert(false, "M2");
                    return;
                }
                console.assert(o1.length === o2.length, "M3");
                var o2Set = new Set(o2);
                try {
                    for (var o1_1 = __values(o1), o1_1_1 = o1_1.next(); !o1_1_1.done; o1_1_1 = o1_1.next()) {
                        var val1 = o1_1_1.value;
                        var isFound = false;
                        try {
                            for (var o2Set_1 = __values(o2Set), o2Set_1_1 = o2Set_1.next(); !o2Set_1_1.done; o2Set_1_1 = o2Set_1.next()) {
                                var val2 = o2Set_1_1.value;
                                try {
                                    perform(val1, val2);
                                }
                                catch (_a) {
                                    continue;
                                }
                                isFound = true;
                                o2Set["delete"](val2);
                                break;
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (o2Set_1_1 && !o2Set_1_1.done && (_b = o2Set_1["return"])) _b.call(o2Set_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        console.assert(isFound, "M4");
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (o1_1_1 && !o1_1_1.done && (_c = o1_1["return"])) _c.call(o1_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else {
                if (o1 instanceof Array) {
                    if (!(o2 instanceof Array)) {
                        console.assert(false, "M5");
                        return;
                    }
                    console.assert(o1.length === o2.length, "M6");
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
            console.assert(o1 === o2, o1 + " !== " + o2);
        }
        var e_2, _c, e_1, _b;
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
/** Length is not Byte length but the number of char */
function genUtf8Str(length, restrict) {
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
    return (new Array(length)).fill("").map(function () { return charGenerator(); }).join("");
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

},{"./stringTransform":174}],177:[function(require,module,exports){
arguments[4][123][0].apply(exports,arguments)
},{"./SyncEventBase":178,"dup":123}],178:[function(require,module,exports){
arguments[4][124][0].apply(exports,arguments)
},{"./SyncEventBaseProtected":179,"dup":124}],179:[function(require,module,exports){
arguments[4][125][0].apply(exports,arguments)
},{"./defs":180,"dup":125,"run-exclusive":169}],180:[function(require,module,exports){
arguments[4][126][0].apply(exports,arguments)
},{"dup":126,"setprototypeof":170}],181:[function(require,module,exports){
arguments[4][127][0].apply(exports,arguments)
},{"./SyncEvent":177,"./defs":180,"dup":127}],182:[function(require,module,exports){
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
},{"buffer":2,"ts-events-extended":181}],183:[function(require,module,exports){
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
        if (spoofedAddressAndPort === void 0) { spoofedAddressAndPort = {}; }
        if (connectionTimeout === void 0) { connectionTimeout = 3000; }
        var _this = this;
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
    Socket.maxBytesHeaders = 7820;
    Socket.maxContentLength = 24624;
    return Socket;
}());
exports.Socket = Socket;

},{"./IConnection":182,"./api/ApiMessage":184,"./core":188,"./misc":192,"colors":156,"ts-events-extended":181}],184:[function(require,module,exports){
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
},{"../core":188,"../misc":192,"buffer":2,"transfer-tools":173}],185:[function(require,module,exports){
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
        if (logger === void 0) { logger = {}; }
        var _this = this;
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

},{"../misc":192,"./ApiMessage":184,"colors":156,"util":8}],186:[function(require,module,exports){
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

},{"../misc":192,"./ApiMessage":184,"setprototypeof":170}],187:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Server_1 = require("./Server");
exports.Server = Server_1.Server;
var client = require("./client");
exports.client = client;

},{"./Server":185,"./client":186}],188:[function(require,module,exports){
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
},{"./legacy/sdp":190,"./legacy/sip":191,"buffer":2,"setprototypeof":170}],189:[function(require,module,exports){
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

},{"./Socket":183,"./api":187,"./core":188,"./misc":192}],190:[function(require,module,exports){
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

},{}],191:[function(require,module,exports){
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

},{}],192:[function(require,module,exports){
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
                for (var _e = __values(m_i.a), _f = _e.next(); !_f.done; _f = _e.next()) {
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
},{"./core":188,"buffer":2}],193:[function(require,module,exports){
"use strict";
/* NOTE: Used in the browser. */
Object.defineProperty(exports, "__esModule", { value: true });
//NOTE: Transpiled to ES3.
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
exports.urlSafeB64 = stringTransform.transcode("base64", { "=": "_" });
var header = function (i) { return "Bundled-Data-" + i; };
/**
 *
 * In order to ease the cross implementation in Java and Objective C
 * we use this function to serialize Date instead of JSON_CUSTOM.
 * We serialize by converting date into timestamp.
 *
 * We enforce that any date property must have as name a string
 * that end with Date or date otherwise an error will be thrown.
 *
 * Date are allowed to be null.
 *
 */
function replacer_reviver(isReplacer, key, value) {
    if (value === null) {
        return value;
    }
    var cKey = !!key.match(/[Dd]ate$/);
    var cVal = isReplacer ? (typeof value === "string" &&
        !!value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)) : typeof value === "number";
    if (isReplacer ? (cKey !== cVal) : (cKey && !cVal)) {
        throw new Error("Bundled data design error");
    }
    if (!cKey) {
        return value;
    }
    var date = new Date(value);
    return isReplacer ? date.getTime() : date;
}
;
function smuggleBundledDataInHeaders(data, headers) {
    if (headers === void 0) { headers = {}; }
    var split = stringTransform.textSplit(125, exports.urlSafeB64.enc(JSON.stringify(data, function (key, value) { return replacer_reviver(true, key, value); })));
    for (var i = 0; i < split.length; i++) {
        headers[header(i)] = split[i];
    }
    return headers;
}
exports.smuggleBundledDataInHeaders = smuggleBundledDataInHeaders;
/** assert there is data */
function extractBundledDataFromHeaders(headers) {
    var split = [];
    var i = 0;
    while (true) {
        var key = header(i++);
        var part = headers[key] || headers[key.toLowerCase()];
        if (!!part) {
            split.push(part);
        }
        else {
            break;
        }
    }
    if (!split.length) {
        throw new Error("No bundled data in header");
    }
    return JSON.parse(exports.urlSafeB64.dec(split.join("")), function (key, value) { return replacer_reviver(false, key, value); });
}
exports.extractBundledDataFromHeaders = extractBundledDataFromHeaders;

},{"transfer-tools/dist/lib/stringTransform":216}],194:[function(require,module,exports){
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
//NOTE: Transpiled to ES3.
var stringTransform = require("transfer-tools/dist/lib/stringTransform");
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
    var _a = stringTransform.transcode("base64", { "=": "_" }), enc = _a.enc, dec = _a.dec;
    /** on backend when ua connect */
    function generate(uaSocket, timestamp) {
        if (timestamp === void 0) { timestamp = Date.now(); }
        return enc(timestamp + ":" + uaSocket.remoteAddress + ":" + uaSocket.remotePort);
    }
    cid.generate = generate;
    function parse(connectionId) {
        var _a = __read(dec(connectionId).split(":"), 3), a = _a[0], b = _a[1], c = _a[2];
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

},{"transfer-tools/dist/lib/stringTransform":216,"ts-sip":231}],195:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],196:[function(require,module,exports){
arguments[4][152][0].apply(exports,arguments)
},{"./custom/trap":197,"./custom/zalgo":198,"./maps/america":201,"./maps/rainbow":202,"./maps/random":203,"./maps/zebra":204,"./styles":205,"./system/supports-colors":207,"dup":152,"util":8}],197:[function(require,module,exports){
arguments[4][153][0].apply(exports,arguments)
},{"dup":153}],198:[function(require,module,exports){
arguments[4][154][0].apply(exports,arguments)
},{"dup":154}],199:[function(require,module,exports){
arguments[4][155][0].apply(exports,arguments)
},{"./colors":196,"dup":155}],200:[function(require,module,exports){
arguments[4][156][0].apply(exports,arguments)
},{"./colors":196,"./extendStringPrototype":199,"dup":156}],201:[function(require,module,exports){
arguments[4][157][0].apply(exports,arguments)
},{"dup":157}],202:[function(require,module,exports){
arguments[4][158][0].apply(exports,arguments)
},{"dup":158}],203:[function(require,module,exports){
arguments[4][159][0].apply(exports,arguments)
},{"dup":159}],204:[function(require,module,exports){
arguments[4][160][0].apply(exports,arguments)
},{"dup":160}],205:[function(require,module,exports){
arguments[4][161][0].apply(exports,arguments)
},{"dup":161}],206:[function(require,module,exports){
arguments[4][162][0].apply(exports,arguments)
},{"_process":6,"dup":162}],207:[function(require,module,exports){
arguments[4][163][0].apply(exports,arguments)
},{"./has-flag.js":206,"_process":6,"dup":163,"os":5}],208:[function(require,module,exports){
arguments[4][106][0].apply(exports,arguments)
},{"dup":106}],209:[function(require,module,exports){
arguments[4][107][0].apply(exports,arguments)
},{"./implementation":208,"dup":107}],210:[function(require,module,exports){
arguments[4][110][0].apply(exports,arguments)
},{"dup":110,"function-bind":209}],211:[function(require,module,exports){
arguments[4][121][0].apply(exports,arguments)
},{"dup":121}],212:[function(require,module,exports){
arguments[4][122][0].apply(exports,arguments)
},{"dup":122}],213:[function(require,module,exports){
arguments[4][171][0].apply(exports,arguments)
},{"dup":171,"has":210}],214:[function(require,module,exports){
arguments[4][172][0].apply(exports,arguments)
},{"dup":172,"super-json":213}],215:[function(require,module,exports){
arguments[4][173][0].apply(exports,arguments)
},{"./JSON_CUSTOM":214,"./stringTransform":216,"./stringTransformExt":217,"./testing":218,"dup":173}],216:[function(require,module,exports){
arguments[4][174][0].apply(exports,arguments)
},{"buffer":2,"dup":174}],217:[function(require,module,exports){
arguments[4][175][0].apply(exports,arguments)
},{"./stringTransform":216,"dup":175}],218:[function(require,module,exports){
arguments[4][176][0].apply(exports,arguments)
},{"./stringTransform":216,"dup":176}],219:[function(require,module,exports){
arguments[4][123][0].apply(exports,arguments)
},{"./SyncEventBase":220,"dup":123}],220:[function(require,module,exports){
arguments[4][124][0].apply(exports,arguments)
},{"./SyncEventBaseProtected":221,"dup":124}],221:[function(require,module,exports){
arguments[4][125][0].apply(exports,arguments)
},{"./defs":222,"dup":125,"run-exclusive":211}],222:[function(require,module,exports){
arguments[4][126][0].apply(exports,arguments)
},{"dup":126,"setprototypeof":212}],223:[function(require,module,exports){
arguments[4][127][0].apply(exports,arguments)
},{"./SyncEvent":219,"./defs":222,"dup":127}],224:[function(require,module,exports){
arguments[4][182][0].apply(exports,arguments)
},{"buffer":2,"dup":182,"ts-events-extended":223}],225:[function(require,module,exports){
arguments[4][183][0].apply(exports,arguments)
},{"./IConnection":224,"./api/ApiMessage":226,"./core":230,"./misc":234,"colors":200,"dup":183,"ts-events-extended":223}],226:[function(require,module,exports){
arguments[4][184][0].apply(exports,arguments)
},{"../core":230,"../misc":234,"buffer":2,"dup":184,"transfer-tools":215}],227:[function(require,module,exports){
arguments[4][185][0].apply(exports,arguments)
},{"../misc":234,"./ApiMessage":226,"colors":200,"dup":185,"util":8}],228:[function(require,module,exports){
arguments[4][186][0].apply(exports,arguments)
},{"../misc":234,"./ApiMessage":226,"dup":186,"setprototypeof":212}],229:[function(require,module,exports){
arguments[4][187][0].apply(exports,arguments)
},{"./Server":227,"./client":228,"dup":187}],230:[function(require,module,exports){
arguments[4][188][0].apply(exports,arguments)
},{"./legacy/sdp":232,"./legacy/sip":233,"buffer":2,"dup":188,"setprototypeof":212}],231:[function(require,module,exports){
arguments[4][189][0].apply(exports,arguments)
},{"./Socket":225,"./api":229,"./core":230,"./misc":234,"dup":189}],232:[function(require,module,exports){
arguments[4][190][0].apply(exports,arguments)
},{"dup":190}],233:[function(require,module,exports){
arguments[4][191][0].apply(exports,arguments)
},{"dup":191}],234:[function(require,module,exports){
arguments[4][192][0].apply(exports,arguments)
},{"./core":230,"buffer":2,"dup":192}]},{},[15]);
