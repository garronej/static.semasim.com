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

  var i
  for (i = 0; i < len; i += 4) {
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
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

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
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
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
  Object.setPrototypeOf(buf, Buffer.prototype)
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
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
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
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

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
  Object.setPrototypeOf(buf, Buffer.prototype)

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
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
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
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
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
    out += hexSliceLookupTable[buf[i]]
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
  Object.setPrototypeOf(newBuf, Buffer.prototype)

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
  } else if (typeof val === 'boolean') {
    val = Number(val)
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

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

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
var evt_1 = require("evt");
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
    var evtResponse = new evt_1.Evt();
    childProcess.on("message", function (message) { return evtResponse.post(ThreadMessage_1.transfer.restore(message)); });
    return {
        evtResponse: evtResponse,
        "send": function (action) { return childProcess.send(ThreadMessage_1.transfer.prepare(action)); },
        "terminate": function () { return childProcess.kill(); }
    };
}
exports.spawn = spawn;

}).call(this,require("buffer").Buffer)
},{"../../sync/_worker_thread/ThreadMessage":13,"buffer":2,"evt":34,"path":4}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var evt_1 = require("evt");
var runTask_1 = require("./simulated/runTask");
function spawn(source) {
    var evtResponse = new evt_1.Evt();
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

},{"./simulated/runTask":9,"evt":34}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var runTask = function (task) { return task(); };
exports.default = runTask;

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var evt_1 = require("evt");
function spawn(source) {
    var evtResponse = new evt_1.Evt();
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

},{"evt":34}],11:[function(require,module,exports){
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
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var Map_1 = require("minimal-polyfills/dist/lib/Map");
var Set_1 = require("minimal-polyfills/dist/lib/Set");
require("minimal-polyfills/dist/lib/Array.from");
var runExclusive = require("run-exclusive");
var WorkerThread_1 = require("./WorkerThread");
var environnement_1 = require("../sync/utils/environnement");
var evt_1 = require("evt");
var bundle_source = (function () {
    
    var path = require("path");
    return Buffer("KGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9ImZ1bmN0aW9uIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoIkNhbm5vdCBmaW5kIG1vZHVsZSAnIitpKyInIik7dGhyb3cgYS5jb2RlPSJNT0RVTEVfTk9UX0ZPVU5EIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9ImZ1bmN0aW9uIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXsidXNlIHN0cmljdCI7T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIl9fZXNNb2R1bGUiLHt2YWx1ZTp0cnVlfSk7dmFyIGVudmlyb25uZW1lbnRfMT1yZXF1aXJlKCIuLi91dGlscy9lbnZpcm9ubmVtZW50Iik7dmFyIHRvQnVmZmVyXzE9cmVxdWlyZSgiLi4vdXRpbHMvdG9CdWZmZXIiKTt2YXIgdHJhbnNmZXI7KGZ1bmN0aW9uKHRyYW5zZmVyKXt2YXIgU2VyaWFsaXphYmxlVWludDhBcnJheTsoZnVuY3Rpb24oU2VyaWFsaXphYmxlVWludDhBcnJheSl7ZnVuY3Rpb24gbWF0Y2godmFsdWUpe3JldHVybiB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCYmdmFsdWUudHlwZT09PSJVaW50OEFycmF5IiYmdHlwZW9mIHZhbHVlLmRhdGE9PT0ic3RyaW5nIn1TZXJpYWxpemFibGVVaW50OEFycmF5Lm1hdGNoPW1hdGNoO2Z1bmN0aW9uIGJ1aWxkKHZhbHVlKXtyZXR1cm57dHlwZToiVWludDhBcnJheSIsZGF0YTp0b0J1ZmZlcl8xLnRvQnVmZmVyKHZhbHVlKS50b1N0cmluZygiYmluYXJ5Iil9fVNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkuYnVpbGQ9YnVpbGQ7ZnVuY3Rpb24gcmVzdG9yZSh2YWx1ZSl7cmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlLmRhdGEsImJpbmFyeSIpfVNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkucmVzdG9yZT1yZXN0b3JlfSkoU2VyaWFsaXphYmxlVWludDhBcnJheXx8KFNlcmlhbGl6YWJsZVVpbnQ4QXJyYXk9e30pKTtmdW5jdGlvbiBwcmVwYXJlKHRocmVhZE1lc3NhZ2Upe2lmKGVudmlyb25uZW1lbnRfMS5lbnZpcm9ubmVtZW50LnR5cGUhPT0iTk9ERSIpe3Rocm93IG5ldyBFcnJvcigib25seSBmb3Igbm9kZSIpfXZhciBtZXNzYWdlPWZ1bmN0aW9uKCl7aWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpe3JldHVybiBTZXJpYWxpemFibGVVaW50OEFycmF5LmJ1aWxkKHRocmVhZE1lc3NhZ2UpfWVsc2UgaWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIEFycmF5KXtyZXR1cm4gdGhyZWFkTWVzc2FnZS5tYXAoZnVuY3Rpb24oZW50cnkpe3JldHVybiBwcmVwYXJlKGVudHJ5KX0pfWVsc2UgaWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIE9iamVjdCl7dmFyIG91dD17fTtmb3IodmFyIGtleSBpbiB0aHJlYWRNZXNzYWdlKXtvdXRba2V5XT1wcmVwYXJlKHRocmVhZE1lc3NhZ2Vba2V5XSl9cmV0dXJuIG91dH1lbHNle3JldHVybiB0aHJlYWRNZXNzYWdlfX0oKTtyZXR1cm4gbWVzc2FnZX10cmFuc2Zlci5wcmVwYXJlPXByZXBhcmU7ZnVuY3Rpb24gcmVzdG9yZShtZXNzYWdlKXtpZihlbnZpcm9ubmVtZW50XzEuZW52aXJvbm5lbWVudC50eXBlIT09Ik5PREUiKXt0aHJvdyBuZXcgRXJyb3IoIm9ubHkgZm9yIG5vZGUiKX12YXIgdGhyZWFkTWVzc2FnZT1mdW5jdGlvbigpe2lmKFNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkubWF0Y2gobWVzc2FnZSkpe3JldHVybiBTZXJpYWxpemFibGVVaW50OEFycmF5LnJlc3RvcmUobWVzc2FnZSl9ZWxzZSBpZihtZXNzYWdlIGluc3RhbmNlb2YgQXJyYXkpe3JldHVybiBtZXNzYWdlLm1hcChmdW5jdGlvbihlbnRyeSl7cmV0dXJuIHJlc3RvcmUoZW50cnkpfSl9ZWxzZSBpZihtZXNzYWdlIGluc3RhbmNlb2YgT2JqZWN0KXt2YXIgb3V0PXt9O2Zvcih2YXIga2V5IGluIG1lc3NhZ2Upe291dFtrZXldPXJlc3RvcmUobWVzc2FnZVtrZXldKX1yZXR1cm4gb3V0fWVsc2V7cmV0dXJuIG1lc3NhZ2V9fSgpO3JldHVybiB0aHJlYWRNZXNzYWdlfXRyYW5zZmVyLnJlc3RvcmU9cmVzdG9yZX0pKHRyYW5zZmVyPWV4cG9ydHMudHJhbnNmZXJ8fChleHBvcnRzLnRyYW5zZmVyPXt9KSl9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi91dGlscy9lbnZpcm9ubmVtZW50IjoxMCwiLi4vdXRpbHMvdG9CdWZmZXIiOjEyLGJ1ZmZlcjoyN31dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgX19zcHJlYWRBcnJheXM9dGhpcyYmdGhpcy5fX3NwcmVhZEFycmF5c3x8ZnVuY3Rpb24oKXtmb3IodmFyIHM9MCxpPTAsaWw9YXJndW1lbnRzLmxlbmd0aDtpPGlsO2krKylzKz1hcmd1bWVudHNbaV0ubGVuZ3RoO2Zvcih2YXIgcj1BcnJheShzKSxrPTAsaT0wO2k8aWw7aSsrKWZvcih2YXIgYT1hcmd1bWVudHNbaV0saj0wLGpsPWEubGVuZ3RoO2o8amw7aisrLGsrKylyW2tdPWFbal07cmV0dXJuIHJ9O09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3JlcXVpcmUoIm1pbmltYWwtcG9seWZpbGxzL2Rpc3QvbGliL0FycmF5QnVmZmVyLmlzVmlldyIpO3ZhciBNYXBfMT1yZXF1aXJlKCJtaW5pbWFsLXBvbHlmaWxscy9kaXN0L2xpYi9NYXAiKTt2YXIgY3J5cHRvTGliPXJlcXVpcmUoIi4uL2luZGV4Iik7dmFyIGVudmlyb25uZW1lbnRfMT1yZXF1aXJlKCIuLi91dGlscy9lbnZpcm9ubmVtZW50Iik7dmFyIFRocmVhZE1lc3NhZ2VfMT1yZXF1aXJlKCIuL1RocmVhZE1lc3NhZ2UiKTtpZihmdW5jdGlvbigpe2lmKHR5cGVvZiBfX3NpbXVsYXRlZE1haW5UaHJlYWRBcGkhPT0idW5kZWZpbmVkIil7cmV0dXJuIGZhbHNlfXZhciBpc01haW5UaGVhZD1lbnZpcm9ubmVtZW50XzEuZW52aXJvbm5lbWVudC5pc01haW5UaHJlYWQhPT11bmRlZmluZWQ/ZW52aXJvbm5lbWVudF8xLmVudmlyb25uZW1lbnQuaXNNYWluVGhyZWFkOnR5cGVvZiBfX3Byb2Nlc3Nfbm9kZT09PSJ1bmRlZmluZWQiO3JldHVybiBpc01haW5UaGVhZH0oKSl7X19jcnlwdG9MaWI9Y3J5cHRvTGlifWVsc2V7dmFyIG1haW5UaHJlYWRBcGlfMT10eXBlb2YgX19zaW11bGF0ZWRNYWluVGhyZWFkQXBpIT09InVuZGVmaW5lZCI/X19zaW11bGF0ZWRNYWluVGhyZWFkQXBpOnR5cGVvZiBfX3Byb2Nlc3Nfbm9kZT09PSJ1bmRlZmluZWQiP3tzZW5kUmVzcG9uc2U6c2VsZi5wb3N0TWVzc2FnZS5iaW5kKHNlbGYpLHNldEFjdGlvbkxpc3RlbmVyOmZ1bmN0aW9uKGFjdGlvbkxpc3RlbmVyKXtyZXR1cm4gYWRkRXZlbnRMaXN0ZW5lcigibWVzc2FnZSIsZnVuY3Rpb24oX2Epe3ZhciBkYXRhPV9hLmRhdGE7cmV0dXJuIGFjdGlvbkxpc3RlbmVyKGRhdGEpfSl9fTp7c2VuZFJlc3BvbnNlOmZ1bmN0aW9uKHJlc3BvbnNlKXtyZXR1cm4gX19wcm9jZXNzX25vZGUuc2VuZChUaHJlYWRNZXNzYWdlXzEudHJhbnNmZXIucHJlcGFyZShyZXNwb25zZSkpfSxzZXRBY3Rpb25MaXN0ZW5lcjpmdW5jdGlvbihhY3Rpb25MaXN0ZW5lcil7cmV0dXJuIF9fcHJvY2Vzc19ub2RlLm9uKCJtZXNzYWdlIixmdW5jdGlvbihtZXNzYWdlKXtyZXR1cm4gYWN0aW9uTGlzdGVuZXIoVGhyZWFkTWVzc2FnZV8xLnRyYW5zZmVyLnJlc3RvcmUobWVzc2FnZSkpfSl9fTt2YXIgY2lwaGVySW5zdGFuY2VzXzE9bmV3IE1hcF8xLlBvbHlmaWxsO21haW5UaHJlYWRBcGlfMS5zZXRBY3Rpb25MaXN0ZW5lcihmdW5jdGlvbihhY3Rpb24pe3ZhciBfYSxfYjtzd2l0Y2goYWN0aW9uLmFjdGlvbil7Y2FzZSJHZW5lcmF0ZVJzYUtleXMiOm1haW5UaHJlYWRBcGlfMS5zZW5kUmVzcG9uc2UoZnVuY3Rpb24oKXt2YXIgX2E7dmFyIHJlc3BvbnNlPXthY3Rpb25JZDphY3Rpb24uYWN0aW9uSWQsb3V0cHV0czooX2E9Y3J5cHRvTGliLnJzYSkuc3luY0dlbmVyYXRlS2V5cy5hcHBseShfYSxhY3Rpb24ucGFyYW1zKX07cmV0dXJuIHJlc3BvbnNlfSgpKTticmVhaztjYXNlIkNpcGhlckZhY3RvcnkiOmNpcGhlckluc3RhbmNlc18xLnNldChhY3Rpb24uY2lwaGVySW5zdGFuY2VSZWYsKF9hPWNyeXB0b0xpYlthY3Rpb24uY2lwaGVyTmFtZV0pW2Z1bmN0aW9uKCl7c3dpdGNoKGFjdGlvbi5jb21wb25lbnRzKXtjYXNlIkRlY3J5cHRvciI6cmV0dXJuInN5bmNEZWNyeXB0b3JGYWN0b3J5IjtjYXNlIkVuY3J5cHRvciI6cmV0dXJuInN5bmNFbmNyeXB0b3JGYWN0b3J5IjtjYXNlIkVuY3J5cHRvckRlY3J5cHRvciI6cmV0dXJuInN5bmNFbmNyeXB0b3JEZWNyeXB0b3JGYWN0b3J5In19KCldLmFwcGx5KF9hLGFjdGlvbi5wYXJhbXMpKTticmVhaztjYXNlIkVuY3J5cHRPckRlY3J5cHQiOnt2YXIgb3V0cHV0XzE9Y2lwaGVySW5zdGFuY2VzXzEuZ2V0KGFjdGlvbi5jaXBoZXJJbnN0YW5jZVJlZilbYWN0aW9uLm1ldGhvZF0oYWN0aW9uLmlucHV0KTttYWluVGhyZWFkQXBpXzEuc2VuZFJlc3BvbnNlKGZ1bmN0aW9uKCl7dmFyIHJlc3BvbnNlPXthY3Rpb25JZDphY3Rpb24uYWN0aW9uSWQsb3V0cHV0Om91dHB1dF8xfTtyZXR1cm4gcmVzcG9uc2V9KCksW291dHB1dF8xLmJ1ZmZlcl0pfWJyZWFrO2Nhc2UiU2NyeXB0SGFzaCI6e3ZhciBkaWdlc3RfMT0oX2I9Y3J5cHRvTGliLnNjcnlwdCkuc3luY0hhc2guYXBwbHkoX2IsX19zcHJlYWRBcnJheXMoYWN0aW9uLnBhcmFtcyxbZnVuY3Rpb24ocGVyY2VudCl7cmV0dXJuIG1haW5UaHJlYWRBcGlfMS5zZW5kUmVzcG9uc2UoZnVuY3Rpb24oKXt2YXIgcmVzcG9uc2U9e2FjdGlvbklkOmFjdGlvbi5hY3Rpb25JZCxwZXJjZW50OnBlcmNlbnR9O3JldHVybiByZXNwb25zZX0oKSl9XSkpO21haW5UaHJlYWRBcGlfMS5zZW5kUmVzcG9uc2UoZnVuY3Rpb24oKXt2YXIgcmVzcG9uc2U9e2FjdGlvbklkOmFjdGlvbi5hY3Rpb25JZCxkaWdlc3Q6ZGlnZXN0XzF9O3JldHVybiByZXNwb25zZX0oKSxbZGlnZXN0XzEuYnVmZmVyXSl9YnJlYWt9fSl9fSx7Ii4uL2luZGV4Ijo2LCIuLi91dGlscy9lbnZpcm9ubmVtZW50IjoxMCwiLi9UaHJlYWRNZXNzYWdlIjoxLCJtaW5pbWFsLXBvbHlmaWxscy9kaXN0L2xpYi9BcnJheUJ1ZmZlci5pc1ZpZXciOjQwLCJtaW5pbWFsLXBvbHlmaWxscy9kaXN0L2xpYi9NYXAiOjQxfV0sMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3ZhciBhZXNqcz1yZXF1aXJlKCJhZXMtanMiKTt2YXIgcmFuZG9tQnl0ZXNfMT1yZXF1aXJlKCIuLi91dGlscy9yYW5kb21CeXRlcyIpO3ZhciBiaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xPXJlcXVpcmUoIi4uL3V0aWxzL2JpbmFyeURhdGFNYW5pcHVsYXRpb25zIik7ZnVuY3Rpb24gc3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnkoa2V5KXtyZXR1cm57ZW5jcnlwdDpmdW5jdGlvbigpe3ZhciBnZXRJdj1mdW5jdGlvbigpe3ZhciBpdjA9cmFuZG9tQnl0ZXNfMS5yYW5kb21CeXRlcygxNik7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIGJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzEubGVmdFNoaWZ0KGl2MCl9fSgpO3JldHVybiBmdW5jdGlvbihwbGFpbkRhdGEpe3ZhciBpdj1nZXRJdigpO3ZhciBvcmlnaW5hbExlbmd0aEFzQnl0ZT1iaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xLmFkZFBhZGRpbmcoIkxFRlQiLGJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzEubnVtYmVyVG9VaW50OEFycmF5KHBsYWluRGF0YS5sZW5ndGgpLDQpO3ZhciBwbGFpbkRhdGFNdWx0aXBsZU9mMTZCeXRlcz1iaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xLmFkZFBhZGRpbmcoIlJJR0hUIixwbGFpbkRhdGEscGxhaW5EYXRhLmxlbmd0aCsoMTYtcGxhaW5EYXRhLmxlbmd0aCUxNikpO3ZhciBlbmNyeXB0ZWREYXRhUGF5bG9hZD1uZXcgYWVzanMuTW9kZU9mT3BlcmF0aW9uLmNiYyhrZXksaXYpLmVuY3J5cHQocGxhaW5EYXRhTXVsdGlwbGVPZjE2Qnl0ZXMpO3JldHVybiBiaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xLmNvbmNhdFVpbnQ4QXJyYXkoaXYsb3JpZ2luYWxMZW5ndGhBc0J5dGUsZW5jcnlwdGVkRGF0YVBheWxvYWQpfX0oKSxkZWNyeXB0OmZ1bmN0aW9uKGVuY3J5cHRlZERhdGEpe3ZhciBpdj1lbmNyeXB0ZWREYXRhLnNsaWNlKDAsMTYpO3ZhciBvcmlnaW5hbExlbmd0aEFzQnl0ZT1lbmNyeXB0ZWREYXRhLnNsaWNlKDE2LDE2KzQpO3ZhciBvcmlnaW5hbExlbmd0aD1iaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xLnVpbnQ4QXJyYXlUb051bWJlcihvcmlnaW5hbExlbmd0aEFzQnl0ZSk7cmV0dXJuIG5ldyBhZXNqcy5Nb2RlT2ZPcGVyYXRpb24uY2JjKGtleSxpdikuZGVjcnlwdChlbmNyeXB0ZWREYXRhLnNsaWNlKDE2KzQpKS5zbGljZSgwLG9yaWdpbmFsTGVuZ3RoKX19fWV4cG9ydHMuc3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk9c3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk7ZnVuY3Rpb24gZ2VuZXJhdGVLZXkoKXtyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe3JldHVybiByYW5kb21CeXRlc18xLnJhbmRvbUJ5dGVzKDMyLGZ1bmN0aW9uKGVycixidWYpe2lmKCEhZXJyKXtyZWplY3QoZXJyKX1lbHNle3Jlc29sdmUoYnVmKX19KX0pfWV4cG9ydHMuZ2VuZXJhdGVLZXk9Z2VuZXJhdGVLZXk7ZnVuY3Rpb24gZ2V0VGVzdEtleSgpe3JldHVybiBQcm9taXNlLnJlc29sdmUobmV3IFVpbnQ4QXJyYXkoWzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjUsMjYsMjcsMjgsMjksMzAsMzFdKSl9ZXhwb3J0cy5nZXRUZXN0S2V5PWdldFRlc3RLZXl9LHsiLi4vdXRpbHMvYmluYXJ5RGF0YU1hbmlwdWxhdGlvbnMiOjksIi4uL3V0aWxzL3JhbmRvbUJ5dGVzIjoxMSwiYWVzLWpzIjoxM31dLDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTtmdW5jdGlvbiBzeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeSgpe3JldHVybntlbmNyeXB0OmZ1bmN0aW9uKHBsYWluRGF0YSl7cmV0dXJuIHBsYWluRGF0YX0sZGVjcnlwdDpmdW5jdGlvbihlbmNyeXB0ZWREYXRhKXtyZXR1cm4gZW5jcnlwdGVkRGF0YX19fWV4cG9ydHMuc3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk9c3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnl9LHt9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXsidXNlIHN0cmljdCI7dmFyIF9fYXNzaWduPXRoaXMmJnRoaXMuX19hc3NpZ258fGZ1bmN0aW9uKCl7X19hc3NpZ249T2JqZWN0LmFzc2lnbnx8ZnVuY3Rpb24odCl7Zm9yKHZhciBzLGk9MSxuPWFyZ3VtZW50cy5sZW5ndGg7aTxuO2krKyl7cz1hcmd1bWVudHNbaV07Zm9yKHZhciBwIGluIHMpaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMscCkpdFtwXT1zW3BdfXJldHVybiB0fTtyZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcyxhcmd1bWVudHMpfTtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTt2YXIgdHlwZXNfMT1yZXF1aXJlKCIuLi90eXBlcyIpO3ZhciBOb2RlUlNBPXJlcXVpcmUoIm5vZGUtcnNhIik7dmFyIGVudmlyb25uZW1lbnRfMT1yZXF1aXJlKCIuLi91dGlscy9lbnZpcm9ubmVtZW50Iik7dmFyIHRvQnVmZmVyXzE9cmVxdWlyZSgiLi4vdXRpbHMvdG9CdWZmZXIiKTt2YXIgdGFyZ2V0ZWRFbnZpcm9ubmVtZW50PWVudmlyb25uZW1lbnRfMS5lbnZpcm9ubmVtZW50LnR5cGU9PT0iTk9ERSI/Im5vZGUiOiJicm93c2VyIjt2YXIgbmV3Tm9kZVJTQT1mdW5jdGlvbihrZXkpe3JldHVybiBuZXcgTm9kZVJTQShCdWZmZXIuZnJvbShrZXkuZGF0YSksa2V5LmZvcm1hdCx7ZW52aXJvbm1lbnQ6dGFyZ2V0ZWRFbnZpcm9ubmVtZW50fSl9O2Z1bmN0aW9uIHN5bmNFbmNyeXB0b3JGYWN0b3J5KGVuY3J5cHRLZXkpe3JldHVybntlbmNyeXB0OmZ1bmN0aW9uKCl7dmFyIGVuY3J5cHROb2RlUlNBPW5ld05vZGVSU0EoZW5jcnlwdEtleSk7dmFyIGVuY3J5cHRNZXRob2Q9dHlwZXNfMS5Sc2FLZXkuUHJpdmF0ZS5tYXRjaChlbmNyeXB0S2V5KT8iZW5jcnlwdFByaXZhdGUiOiJlbmNyeXB0IjtyZXR1cm4gZnVuY3Rpb24ocGxhaW5EYXRhKXtyZXR1cm4gZW5jcnlwdE5vZGVSU0FbZW5jcnlwdE1ldGhvZF0odG9CdWZmZXJfMS50b0J1ZmZlcihwbGFpbkRhdGEpKX19KCl9fWV4cG9ydHMuc3luY0VuY3J5cHRvckZhY3Rvcnk9c3luY0VuY3J5cHRvckZhY3Rvcnk7ZnVuY3Rpb24gc3luY0RlY3J5cHRvckZhY3RvcnkoZGVjcnlwdEtleSl7cmV0dXJue2RlY3J5cHQ6ZnVuY3Rpb24oKXt2YXIgZGVjcnlwdE5vZGVSU0E9bmV3Tm9kZVJTQShkZWNyeXB0S2V5KTt2YXIgZGVjcnlwdE1ldGhvZD10eXBlc18xLlJzYUtleS5QdWJsaWMubWF0Y2goZGVjcnlwdEtleSk/ImRlY3J5cHRQdWJsaWMiOiJkZWNyeXB0IjtyZXR1cm4gZnVuY3Rpb24oZW5jcnlwdGVkRGF0YSl7cmV0dXJuIGRlY3J5cHROb2RlUlNBW2RlY3J5cHRNZXRob2RdKHRvQnVmZmVyXzEudG9CdWZmZXIoZW5jcnlwdGVkRGF0YSkpfX0oKX19ZXhwb3J0cy5zeW5jRGVjcnlwdG9yRmFjdG9yeT1zeW5jRGVjcnlwdG9yRmFjdG9yeTtmdW5jdGlvbiBzeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeShlbmNyeXB0S2V5LGRlY3J5cHRLZXkpe3JldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSxzeW5jRW5jcnlwdG9yRmFjdG9yeShlbmNyeXB0S2V5KSksc3luY0RlY3J5cHRvckZhY3RvcnkoZGVjcnlwdEtleSkpfWV4cG9ydHMuc3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk9c3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk7ZnVuY3Rpb24gc3luY0dlbmVyYXRlS2V5cyhzZWVkLGtleXNMZW5ndGhCeXRlcyl7aWYoa2V5c0xlbmd0aEJ5dGVzPT09dm9pZCAwKXtrZXlzTGVuZ3RoQnl0ZXM9ODB9dmFyIG5vZGVSU0E9Tm9kZVJTQS5nZW5lcmF0ZUtleVBhaXJGcm9tU2VlZChzZWVkLDgqa2V5c0xlbmd0aEJ5dGVzLHVuZGVmaW5lZCx0YXJnZXRlZEVudmlyb25uZW1lbnQpO2Z1bmN0aW9uIGJ1aWxkS2V5KGZvcm1hdCl7cmV0dXJue2Zvcm1hdDpmb3JtYXQsZGF0YTpub2RlUlNBLmV4cG9ydEtleShmb3JtYXQpfX1yZXR1cm57cHVibGljS2V5OmJ1aWxkS2V5KCJwa2NzMS1wdWJsaWMtZGVyIikscHJpdmF0ZUtleTpidWlsZEtleSgicGtjczEtcHJpdmF0ZS1kZXIiKX19ZXhwb3J0cy5zeW5jR2VuZXJhdGVLZXlzPXN5bmNHZW5lcmF0ZUtleXN9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi90eXBlcyI6OCwiLi4vdXRpbHMvZW52aXJvbm5lbWVudCI6MTAsIi4uL3V0aWxzL3RvQnVmZmVyIjoxMixidWZmZXI6MjcsIm5vZGUtcnNhIjo0Mn1dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0IjtmdW5jdGlvbiBfX2V4cG9ydChtKXtmb3IodmFyIHAgaW4gbSlpZighZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSlleHBvcnRzW3BdPW1bcF19T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIl9fZXNNb2R1bGUiLHt2YWx1ZTp0cnVlfSk7X19leHBvcnQocmVxdWlyZSgiLi90eXBlcyIpKTt2YXIgc2NyeXB0PXJlcXVpcmUoIi4vc2NyeXB0Iik7ZXhwb3J0cy5zY3J5cHQ9c2NyeXB0O3ZhciBhZXM9cmVxdWlyZSgiLi9jaXBoZXIvYWVzIik7ZXhwb3J0cy5hZXM9YWVzO3ZhciByc2E9cmVxdWlyZSgiLi9jaXBoZXIvcnNhIik7ZXhwb3J0cy5yc2E9cnNhO3ZhciBwbGFpbj1yZXF1aXJlKCIuL2NpcGhlci9wbGFpbiIpO2V4cG9ydHMucGxhaW49cGxhaW59LHsiLi9jaXBoZXIvYWVzIjozLCIuL2NpcGhlci9wbGFpbiI6NCwiLi9jaXBoZXIvcnNhIjo1LCIuL3NjcnlwdCI6NywiLi90eXBlcyI6OH1dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgX19hc3NpZ249dGhpcyYmdGhpcy5fX2Fzc2lnbnx8ZnVuY3Rpb24oKXtfX2Fzc2lnbj1PYmplY3QuYXNzaWdufHxmdW5jdGlvbih0KXtmb3IodmFyIHMsaT0xLG49YXJndW1lbnRzLmxlbmd0aDtpPG47aSsrKXtzPWFyZ3VtZW50c1tpXTtmb3IodmFyIHAgaW4gcylpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocyxwKSl0W3BdPXNbcF19cmV0dXJuIHR9O3JldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9O09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3ZhciBzY3J5cHRzeT1yZXF1aXJlKCJzY3J5cHRzeSIpO2V4cG9ydHMuZGVmYXVsdFBhcmFtcz17bjoxMyxyOjgscDoxLGRpZ2VzdExlbmd0aEJ5dGVzOjI1NH07ZnVuY3Rpb24gc3luY0hhc2godGV4dCxzYWx0LHBhcmFtcyxwcm9ncmVzcyl7aWYocGFyYW1zPT09dm9pZCAwKXtwYXJhbXM9e319dmFyIF9hPWZ1bmN0aW9uKCl7dmFyIG91dD1fX2Fzc2lnbih7fSxleHBvcnRzLmRlZmF1bHRQYXJhbXMpO09iamVjdC5rZXlzKHBhcmFtcykuZmlsdGVyKGZ1bmN0aW9uKGtleSl7cmV0dXJuIHBhcmFtc1trZXldIT09dW5kZWZpbmVkfSkuZm9yRWFjaChmdW5jdGlvbihrZXkpe3JldHVybiBvdXRba2V5XT1wYXJhbXNba2V5XX0pO3JldHVybiBvdXR9KCksbj1fYS5uLHI9X2EucixwPV9hLnAsZGlnZXN0TGVuZ3RoQnl0ZXM9X2EuZGlnZXN0TGVuZ3RoQnl0ZXM7cmV0dXJuIHNjcnlwdHN5KHRleHQsc2FsdCxNYXRoLnBvdygyLG4pLHIscCxkaWdlc3RMZW5ndGhCeXRlcyxwcm9ncmVzcyE9PXVuZGVmaW5lZD9mdW5jdGlvbihfYSl7dmFyIHBlcmNlbnQ9X2EucGVyY2VudDtyZXR1cm4gcHJvZ3Jlc3MocGVyY2VudCl9OnVuZGVmaW5lZCl9ZXhwb3J0cy5zeW5jSGFzaD1zeW5jSGFzaH0se3NjcnlwdHN5Ojg0fV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7InVzZSBzdHJpY3QiO09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3ZhciB0b0J1ZmZlcl8xPXJlcXVpcmUoIi4vdXRpbHMvdG9CdWZmZXIiKTt2YXIgUnNhS2V5OyhmdW5jdGlvbihSc2FLZXkpe2Z1bmN0aW9uIHN0cmluZ2lmeShyc2FLZXkpe3JldHVybiBKU09OLnN0cmluZ2lmeShbcnNhS2V5LmZvcm1hdCx0b0J1ZmZlcl8xLnRvQnVmZmVyKHJzYUtleS5kYXRhKS50b1N0cmluZygiYmFzZTY0IildKX1Sc2FLZXkuc3RyaW5naWZ5PXN0cmluZ2lmeTtmdW5jdGlvbiBwYXJzZShzdHJpbmdpZmllZFJzYUtleSl7dmFyIF9hPUpTT04ucGFyc2Uoc3RyaW5naWZpZWRSc2FLZXkpLGZvcm1hdD1fYVswXSxzdHJEYXRhPV9hWzFdO3JldHVybntmb3JtYXQ6Zm9ybWF0LGRhdGE6bmV3IFVpbnQ4QXJyYXkoQnVmZmVyLmZyb20oc3RyRGF0YSwiYmFzZTY0IikpfX1Sc2FLZXkucGFyc2U9cGFyc2U7dmFyIFB1YmxpYzsoZnVuY3Rpb24oUHVibGljKXtmdW5jdGlvbiBtYXRjaChyc2FLZXkpe3JldHVybiByc2FLZXkuZm9ybWF0PT09InBrY3MxLXB1YmxpYy1kZXIifVB1YmxpYy5tYXRjaD1tYXRjaH0pKFB1YmxpYz1Sc2FLZXkuUHVibGljfHwoUnNhS2V5LlB1YmxpYz17fSkpO3ZhciBQcml2YXRlOyhmdW5jdGlvbihQcml2YXRlKXtmdW5jdGlvbiBtYXRjaChyc2FLZXkpe3JldHVybiByc2FLZXkuZm9ybWF0PT09InBrY3MxLXByaXZhdGUtZGVyIn1Qcml2YXRlLm1hdGNoPW1hdGNofSkoUHJpdmF0ZT1Sc2FLZXkuUHJpdmF0ZXx8KFJzYUtleS5Qcml2YXRlPXt9KSl9KShSc2FLZXk9ZXhwb3J0cy5Sc2FLZXl8fChleHBvcnRzLlJzYUtleT17fSkpfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi91dGlscy90b0J1ZmZlciI6MTIsYnVmZmVyOjI3fV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBfX3NwcmVhZEFycmF5cz10aGlzJiZ0aGlzLl9fc3ByZWFkQXJyYXlzfHxmdW5jdGlvbigpe2Zvcih2YXIgcz0wLGk9MCxpbD1hcmd1bWVudHMubGVuZ3RoO2k8aWw7aSsrKXMrPWFyZ3VtZW50c1tpXS5sZW5ndGg7Zm9yKHZhciByPUFycmF5KHMpLGs9MCxpPTA7aTxpbDtpKyspZm9yKHZhciBhPWFyZ3VtZW50c1tpXSxqPTAsamw9YS5sZW5ndGg7ajxqbDtqKyssaysrKXJba109YVtqXTtyZXR1cm4gcn07T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIl9fZXNNb2R1bGUiLHt2YWx1ZTp0cnVlfSk7ZnVuY3Rpb24gY29uY2F0VWludDhBcnJheSgpe3ZhciB1aW50OEFycmF5cz1bXTtmb3IodmFyIF9pPTA7X2k8YXJndW1lbnRzLmxlbmd0aDtfaSsrKXt1aW50OEFycmF5c1tfaV09YXJndW1lbnRzW19pXX12YXIgb3V0PW5ldyBVaW50OEFycmF5KHVpbnQ4QXJyYXlzLm1hcChmdW5jdGlvbihfYSl7dmFyIGxlbmd0aD1fYS5sZW5ndGg7cmV0dXJuIGxlbmd0aH0pLnJlZHVjZShmdW5jdGlvbihwcmV2LGN1cnIpe3JldHVybiBwcmV2K2N1cnJ9LDApKTt2YXIgb2Zmc2V0PTA7Zm9yKHZhciBpPTA7aTx1aW50OEFycmF5cy5sZW5ndGg7aSsrKXt2YXIgdWludDhBcnJheT11aW50OEFycmF5c1tpXTtvdXQuc2V0KHVpbnQ4QXJyYXksb2Zmc2V0KTtvZmZzZXQrPXVpbnQ4QXJyYXkubGVuZ3RofXJldHVybiBvdXR9ZXhwb3J0cy5jb25jYXRVaW50OEFycmF5PWNvbmNhdFVpbnQ4QXJyYXk7ZnVuY3Rpb24gYWRkUGFkZGluZyhwb3NpdGlvbix1aW50OEFycmF5LHRhcmdldExlbmd0aEJ5dGVzKXt2YXIgcGFkZGluZ0J5dGVzPW5ldyBVaW50OEFycmF5KHRhcmdldExlbmd0aEJ5dGVzLXVpbnQ4QXJyYXkubGVuZ3RoKTtmb3IodmFyIGk9MDtpPHBhZGRpbmdCeXRlcy5sZW5ndGg7aSsrKXtwYWRkaW5nQnl0ZXNbaV09MH1yZXR1cm4gY29uY2F0VWludDhBcnJheS5hcHBseSh2b2lkIDAsZnVuY3Rpb24oKXtzd2l0Y2gocG9zaXRpb24pe2Nhc2UiTEVGVCI6cmV0dXJuW3BhZGRpbmdCeXRlcyx1aW50OEFycmF5XTtjYXNlIlJJR0hUIjpyZXR1cm5bdWludDhBcnJheSxwYWRkaW5nQnl0ZXNdfX0oKSl9ZXhwb3J0cy5hZGRQYWRkaW5nPWFkZFBhZGRpbmc7ZnVuY3Rpb24gbnVtYmVyVG9VaW50OEFycmF5KG4pe3ZhciBzdHI9bi50b1N0cmluZygxNik7dmFyIGFycj1bXTt2YXIgY3Vycj0iIjtmb3IodmFyIGk9c3RyLmxlbmd0aC0xO2k+PTA7aS0tKXtjdXJyPXN0cltpXStjdXJyO2lmKGN1cnIubGVuZ3RoPT09Mnx8aT09PTApe2Fycj1fX3NwcmVhZEFycmF5cyhbcGFyc2VJbnQoY3VyciwxNildLGFycik7Y3Vycj0iIn19cmV0dXJuIG5ldyBVaW50OEFycmF5KGFycil9ZXhwb3J0cy5udW1iZXJUb1VpbnQ4QXJyYXk9bnVtYmVyVG9VaW50OEFycmF5O2Z1bmN0aW9uIHVpbnQ4QXJyYXlUb051bWJlcih1aW50OEFycmF5KXt2YXIgbj0wO3ZhciBleHA9MDtmb3IodmFyIGk9dWludDhBcnJheS5sZW5ndGgtMTtpPj0wO2ktLSl7bis9dWludDhBcnJheVtpXSpNYXRoLnBvdygyNTYsZXhwKyspfXJldHVybiBufWV4cG9ydHMudWludDhBcnJheVRvTnVtYmVyPXVpbnQ4QXJyYXlUb051bWJlcjtmdW5jdGlvbiBsZWZ0U2hpZnQodWludDhBcnJheSl7dmFyIGM9dHJ1ZTtmb3IodmFyIGk9dWludDhBcnJheS5sZW5ndGgtMTtjJiZpPj0wO2ktLSl7aWYoKyt1aW50OEFycmF5W2ldIT09MjU2KXtjPWZhbHNlfX1yZXR1cm4gdWludDhBcnJheX1leHBvcnRzLmxlZnRTaGlmdD1sZWZ0U2hpZnR9LHt9XSwxMDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO2V4cG9ydHMuZW52aXJvbm5lbWVudD1mdW5jdGlvbigpe2lmKHR5cGVvZiBuYXZpZ2F0b3IhPT0idW5kZWZpbmVkIiYmbmF2aWdhdG9yLnByb2R1Y3Q9PT0iUmVhY3ROYXRpdmUiKXtyZXR1cm57dHlwZToiUkVBQ1QgTkFUSVZFIixpc01haW5UaHJlYWQ6dHJ1ZX19aWYodHlwZW9mIHdpbmRvdyE9PSJ1bmRlZmluZWQiKXtyZXR1cm57dHlwZToiQlJPV1NFUiIsaXNNYWluVGhyZWFkOnRydWV9fWlmKHR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCImJiEhc2VsZi5wb3N0TWVzc2FnZSl7cmV0dXJue3R5cGU6IkJST1dTRVIiLGlzTWFpblRocmVhZDpmYWxzZX19dmFyIGlzTm9kZUNyeXB0b0F2YWlsYWJsZT1mdW5jdGlvbigpe3RyeXtyZXF1aXJlKCJjcnlwdG8iKyIiKX1jYXRjaChfYSl7cmV0dXJuIGZhbHNlfXJldHVybiB0cnVlfSgpO2lmKGlzTm9kZUNyeXB0b0F2YWlsYWJsZSl7cmV0dXJue3R5cGU6Ik5PREUiLGlzTWFpblRocmVhZDp1bmRlZmluZWR9fXJldHVybnt0eXBlOiJMSVFVSUQgQ09SRSIsaXNNYWluVGhyZWFkOnRydWV9fSgpfSx7fV0sMTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTt2YXIgZW52aXJvbm5lbWVudF8xPXJlcXVpcmUoIi4vZW52aXJvbm5lbWVudCIpO2Z1bmN0aW9uIHJhbmRvbUJ5dGVzKHNpemUsY2FsbGJhY2spe3ZhciBNQVhfVUlOVDMyPXJhbmRvbUJ5dGVzLk1BWF9VSU5UMzIsTUFYX0JZVEVTPXJhbmRvbUJ5dGVzLk1BWF9CWVRFUyxnZXRSYW5kb21WYWx1ZXM9cmFuZG9tQnl0ZXMuZ2V0UmFuZG9tVmFsdWVzLGdldE5vZGVSYW5kb21CeXRlcz1yYW5kb21CeXRlcy5nZXROb2RlUmFuZG9tQnl0ZXM7aWYoZW52aXJvbm5lbWVudF8xLmVudmlyb25uZW1lbnQudHlwZT09PSJOT0RFIil7dmFyIHRvTG9jYWxCdWZmZXJJbXBsZW1lbnRhdGlvbl8xPWZ1bmN0aW9uKG5vZGVCdWZmZXJJbnN0KXtyZXR1cm4gQnVmZmVyLmZyb20obm9kZUJ1ZmZlckluc3QuYnVmZmVyLG5vZGVCdWZmZXJJbnN0LmJ5dGVPZmZzZXQsbm9kZUJ1ZmZlckluc3QubGVuZ3RoKX07dmFyIG5vZGVSYW5kb21CeXRlcz1nZXROb2RlUmFuZG9tQnl0ZXMoKTtpZihjYWxsYmFjayE9PXVuZGVmaW5lZCl7bm9kZVJhbmRvbUJ5dGVzKHNpemUsZnVuY3Rpb24oZXJyLGJ1Zil7cmV0dXJuIGNhbGxiYWNrKGVyciwhIWJ1Zj90b0xvY2FsQnVmZmVySW1wbGVtZW50YXRpb25fMShidWYpOmJ1Zil9KTtyZXR1cm59dmFyIG5vZGVCdWZmZXJJbnN0PW5vZGVSYW5kb21CeXRlcyhzaXplKTtyZXR1cm4gdG9Mb2NhbEJ1ZmZlckltcGxlbWVudGF0aW9uXzEobm9kZUJ1ZmZlckluc3QpfWlmKHNpemU+TUFYX1VJTlQzMil7dGhyb3cgbmV3IFJhbmdlRXJyb3IoInJlcXVlc3RlZCB0b28gbWFueSByYW5kb20gYnl0ZXMiKX12YXIgYnl0ZXM9QnVmZmVyLmFsbG9jVW5zYWZlKHNpemUpO2lmKHNpemU+MCl7aWYoc2l6ZT5NQVhfQllURVMpe2Zvcih2YXIgZ2VuZXJhdGVkPTA7Z2VuZXJhdGVkPHNpemU7Z2VuZXJhdGVkKz1NQVhfQllURVMpe2dldFJhbmRvbVZhbHVlcyhieXRlcy5zbGljZShnZW5lcmF0ZWQsZ2VuZXJhdGVkK01BWF9CWVRFUykpfX1lbHNle2dldFJhbmRvbVZhbHVlcyhieXRlcyl9fWlmKHR5cGVvZiBjYWxsYmFjaz09PSJmdW5jdGlvbiIpe3NldFRpbWVvdXQoZnVuY3Rpb24oKXtyZXR1cm4gY2FsbGJhY2sobnVsbCxieXRlcyl9LDApO3JldHVybn1yZXR1cm4gYnl0ZXN9ZXhwb3J0cy5yYW5kb21CeXRlcz1yYW5kb21CeXRlczsoZnVuY3Rpb24ocmFuZG9tQnl0ZXMpe3JhbmRvbUJ5dGVzLk1BWF9CWVRFUz02NTUzNjtyYW5kb21CeXRlcy5NQVhfVUlOVDMyPTQyOTQ5NjcyOTU7cmFuZG9tQnl0ZXMuZ2V0UmFuZG9tVmFsdWVzPWZ1bmN0aW9uKCl7dmFyIG5vbkNyeXB0b2dyYXBoaWNHZXRSYW5kb21WYWx1ZT1mdW5jdGlvbihhYnYpe3ZhciBsPWFidi5sZW5ndGg7d2hpbGUobC0tKXthYnZbbF09TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjI1Nil9cmV0dXJuIGFidn07dmFyIGJyb3dzZXJHZXRSYW5kb21WYWx1ZXM9ZnVuY3Rpb24oKXtpZih0eXBlb2YgY3J5cHRvPT09Im9iamVjdCImJiEhY3J5cHRvLmdldFJhbmRvbVZhbHVlcyl7cmV0dXJuIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChjcnlwdG8pfWVsc2UgaWYodHlwZW9mIG1zQ3J5cHRvPT09Im9iamVjdCImJiEhbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQobXNDcnlwdG8pfWVsc2UgaWYodHlwZW9mIHNlbGY9PT0ib2JqZWN0IiYmdHlwZW9mIHNlbGYuY3J5cHRvPT09Im9iamVjdCImJiEhc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoc2VsZi5jcnlwdG8pfWVsc2V7cmV0dXJuIHVuZGVmaW5lZH19KCk7cmV0dXJuISFicm93c2VyR2V0UmFuZG9tVmFsdWVzP2Jyb3dzZXJHZXRSYW5kb21WYWx1ZXM6bm9uQ3J5cHRvZ3JhcGhpY0dldFJhbmRvbVZhbHVlfSgpO3JhbmRvbUJ5dGVzLmdldE5vZGVSYW5kb21CeXRlcz1mdW5jdGlvbigpe3ZhciBub2RlUmFuZG9tQnl0ZXM9dW5kZWZpbmVkO3JldHVybiBmdW5jdGlvbigpe2lmKG5vZGVSYW5kb21CeXRlcz09PXVuZGVmaW5lZCl7bm9kZVJhbmRvbUJ5dGVzPXJlcXVpcmUoImNyeXB0byIrIiIpLnJhbmRvbUJ5dGVzfXJldHVybiBub2RlUmFuZG9tQnl0ZXN9fSgpfSkocmFuZG9tQnl0ZXM9ZXhwb3J0cy5yYW5kb21CeXRlc3x8KGV4cG9ydHMucmFuZG9tQnl0ZXM9e30pKX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4vZW52aXJvbm5lbWVudCI6MTAsYnVmZmVyOjI3fV0sMTI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTtmdW5jdGlvbiB0b0J1ZmZlcih1aW50OEFycmF5KXtyZXR1cm4gQnVmZmVyLmZyb20odWludDhBcnJheS5idWZmZXIsdWludDhBcnJheS5ieXRlT2Zmc2V0LHVpbnQ4QXJyYXkubGVuZ3RoKX1leHBvcnRzLnRvQnVmZmVyPXRvQnVmZmVyfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHtidWZmZXI6Mjd9XSwxMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHJvb3QpeyJ1c2Ugc3RyaWN0IjtmdW5jdGlvbiBjaGVja0ludCh2YWx1ZSl7cmV0dXJuIHBhcnNlSW50KHZhbHVlKT09PXZhbHVlfWZ1bmN0aW9uIGNoZWNrSW50cyhhcnJheWlzaCl7aWYoIWNoZWNrSW50KGFycmF5aXNoLmxlbmd0aCkpe3JldHVybiBmYWxzZX1mb3IodmFyIGk9MDtpPGFycmF5aXNoLmxlbmd0aDtpKyspe2lmKCFjaGVja0ludChhcnJheWlzaFtpXSl8fGFycmF5aXNoW2ldPDB8fGFycmF5aXNoW2ldPjI1NSl7cmV0dXJuIGZhbHNlfX1yZXR1cm4gdHJ1ZX1mdW5jdGlvbiBjb2VyY2VBcnJheShhcmcsY29weSl7aWYoYXJnLmJ1ZmZlciYmYXJnLm5hbWU9PT0iVWludDhBcnJheSIpe2lmKGNvcHkpe2lmKGFyZy5zbGljZSl7YXJnPWFyZy5zbGljZSgpfWVsc2V7YXJnPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZyl9fXJldHVybiBhcmd9aWYoQXJyYXkuaXNBcnJheShhcmcpKXtpZighY2hlY2tJbnRzKGFyZykpe3Rocm93IG5ldyBFcnJvcigiQXJyYXkgY29udGFpbnMgaW52YWxpZCB2YWx1ZTogIithcmcpfXJldHVybiBuZXcgVWludDhBcnJheShhcmcpfWlmKGNoZWNrSW50KGFyZy5sZW5ndGgpJiZjaGVja0ludHMoYXJnKSl7cmV0dXJuIG5ldyBVaW50OEFycmF5KGFyZyl9dGhyb3cgbmV3IEVycm9yKCJ1bnN1cHBvcnRlZCBhcnJheS1saWtlIG9iamVjdCIpfWZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCl7cmV0dXJuIG5ldyBVaW50OEFycmF5KGxlbmd0aCl9ZnVuY3Rpb24gY29weUFycmF5KHNvdXJjZUFycmF5LHRhcmdldEFycmF5LHRhcmdldFN0YXJ0LHNvdXJjZVN0YXJ0LHNvdXJjZUVuZCl7aWYoc291cmNlU3RhcnQhPW51bGx8fHNvdXJjZUVuZCE9bnVsbCl7aWYoc291cmNlQXJyYXkuc2xpY2Upe3NvdXJjZUFycmF5PXNvdXJjZUFycmF5LnNsaWNlKHNvdXJjZVN0YXJ0LHNvdXJjZUVuZCl9ZWxzZXtzb3VyY2VBcnJheT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChzb3VyY2VBcnJheSxzb3VyY2VTdGFydCxzb3VyY2VFbmQpfX10YXJnZXRBcnJheS5zZXQoc291cmNlQXJyYXksdGFyZ2V0U3RhcnQpfXZhciBjb252ZXJ0VXRmOD1mdW5jdGlvbigpe2Z1bmN0aW9uIHRvQnl0ZXModGV4dCl7dmFyIHJlc3VsdD1bXSxpPTA7dGV4dD1lbmNvZGVVUkkodGV4dCk7d2hpbGUoaTx0ZXh0Lmxlbmd0aCl7dmFyIGM9dGV4dC5jaGFyQ29kZUF0KGkrKyk7aWYoYz09PTM3KXtyZXN1bHQucHVzaChwYXJzZUludCh0ZXh0LnN1YnN0cihpLDIpLDE2KSk7aSs9Mn1lbHNle3Jlc3VsdC5wdXNoKGMpfX1yZXR1cm4gY29lcmNlQXJyYXkocmVzdWx0KX1mdW5jdGlvbiBmcm9tQnl0ZXMoYnl0ZXMpe3ZhciByZXN1bHQ9W10saT0wO3doaWxlKGk8Ynl0ZXMubGVuZ3RoKXt2YXIgYz1ieXRlc1tpXTtpZihjPDEyOCl7cmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShjKSk7aSsrfWVsc2UgaWYoYz4xOTEmJmM8MjI0KXtyZXN1bHQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKChjJjMxKTw8NnxieXRlc1tpKzFdJjYzKSk7aSs9Mn1lbHNle3Jlc3VsdC5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoKGMmMTUpPDwxMnwoYnl0ZXNbaSsxXSY2Myk8PDZ8Ynl0ZXNbaSsyXSY2MykpO2krPTN9fXJldHVybiByZXN1bHQuam9pbigiIil9cmV0dXJue3RvQnl0ZXM6dG9CeXRlcyxmcm9tQnl0ZXM6ZnJvbUJ5dGVzfX0oKTt2YXIgY29udmVydEhleD1mdW5jdGlvbigpe2Z1bmN0aW9uIHRvQnl0ZXModGV4dCl7dmFyIHJlc3VsdD1bXTtmb3IodmFyIGk9MDtpPHRleHQubGVuZ3RoO2krPTIpe3Jlc3VsdC5wdXNoKHBhcnNlSW50KHRleHQuc3Vic3RyKGksMiksMTYpKX1yZXR1cm4gcmVzdWx0fXZhciBIZXg9IjAxMjM0NTY3ODlhYmNkZWYiO2Z1bmN0aW9uIGZyb21CeXRlcyhieXRlcyl7dmFyIHJlc3VsdD1bXTtmb3IodmFyIGk9MDtpPGJ5dGVzLmxlbmd0aDtpKyspe3ZhciB2PWJ5dGVzW2ldO3Jlc3VsdC5wdXNoKEhleFsodiYyNDApPj40XStIZXhbdiYxNV0pfXJldHVybiByZXN1bHQuam9pbigiIil9cmV0dXJue3RvQnl0ZXM6dG9CeXRlcyxmcm9tQnl0ZXM6ZnJvbUJ5dGVzfX0oKTt2YXIgbnVtYmVyT2ZSb3VuZHM9ezE2OjEwLDI0OjEyLDMyOjE0fTt2YXIgcmNvbj1bMSwyLDQsOCwxNiwzMiw2NCwxMjgsMjcsNTQsMTA4LDIxNiwxNzEsNzcsMTU0LDQ3LDk0LDE4OCw5OSwxOTgsMTUxLDUzLDEwNiwyMTIsMTc5LDEyNSwyNTAsMjM5LDE5NywxNDVdO3ZhciBTPVs5OSwxMjQsMTE5LDEyMywyNDIsMTA3LDExMSwxOTcsNDgsMSwxMDMsNDMsMjU0LDIxNSwxNzEsMTE4LDIwMiwxMzAsMjAxLDEyNSwyNTAsODksNzEsMjQwLDE3MywyMTIsMTYyLDE3NSwxNTYsMTY0LDExNCwxOTIsMTgzLDI1MywxNDcsMzgsNTQsNjMsMjQ3LDIwNCw1MiwxNjUsMjI5LDI0MSwxMTMsMjE2LDQ5LDIxLDQsMTk5LDM1LDE5NSwyNCwxNTAsNSwxNTQsNywxOCwxMjgsMjI2LDIzNSwzOSwxNzgsMTE3LDksMTMxLDQ0LDI2LDI3LDExMCw5MCwxNjAsODIsNTksMjE0LDE3OSw0MSwyMjcsNDcsMTMyLDgzLDIwOSwwLDIzNywzMiwyNTIsMTc3LDkxLDEwNiwyMDMsMTkwLDU3LDc0LDc2LDg4LDIwNywyMDgsMjM5LDE3MCwyNTEsNjcsNzcsNTEsMTMzLDY5LDI0OSwyLDEyNyw4MCw2MCwxNTksMTY4LDgxLDE2Myw2NCwxNDMsMTQ2LDE1Nyw1NiwyNDUsMTg4LDE4MiwyMTgsMzMsMTYsMjU1LDI0MywyMTAsMjA1LDEyLDE5LDIzNiw5NSwxNTEsNjgsMjMsMTk2LDE2NywxMjYsNjEsMTAwLDkzLDI1LDExNSw5NiwxMjksNzksMjIwLDM0LDQyLDE0NCwxMzYsNzAsMjM4LDE4NCwyMCwyMjIsOTQsMTEsMjE5LDIyNCw1MCw1OCwxMCw3Myw2LDM2LDkyLDE5NCwyMTEsMTcyLDk4LDE0NSwxNDksMjI4LDEyMSwyMzEsMjAwLDU1LDEwOSwxNDEsMjEzLDc4LDE2OSwxMDgsODYsMjQ0LDIzNCwxMDEsMTIyLDE3NCw4LDE4NiwxMjAsMzcsNDYsMjgsMTY2LDE4MCwxOTgsMjMyLDIyMSwxMTYsMzEsNzUsMTg5LDEzOSwxMzgsMTEyLDYyLDE4MSwxMDIsNzIsMywyNDYsMTQsOTcsNTMsODcsMTg1LDEzNCwxOTMsMjksMTU4LDIyNSwyNDgsMTUyLDE3LDEwNSwyMTcsMTQyLDE0OCwxNTUsMzAsMTM1LDIzMywyMDYsODUsNDAsMjIzLDE0MCwxNjEsMTM3LDEzLDE5MSwyMzAsNjYsMTA0LDY1LDE1Myw0NSwxNSwxNzYsODQsMTg3LDIyXTt2YXIgU2k9WzgyLDksMTA2LDIxMyw0OCw1NCwxNjUsNTYsMTkxLDY0LDE2MywxNTgsMTI5LDI0MywyMTUsMjUxLDEyNCwyMjcsNTcsMTMwLDE1NSw0NywyNTUsMTM1LDUyLDE0Miw2Nyw2OCwxOTYsMjIyLDIzMywyMDMsODQsMTIzLDE0OCw1MCwxNjYsMTk0LDM1LDYxLDIzOCw3NiwxNDksMTEsNjYsMjUwLDE5NSw3OCw4LDQ2LDE2MSwxMDIsNDAsMjE3LDM2LDE3OCwxMTgsOTEsMTYyLDczLDEwOSwxMzksMjA5LDM3LDExNCwyNDgsMjQ2LDEwMCwxMzQsMTA0LDE1MiwyMiwyMTIsMTY0LDkyLDIwNCw5MywxMDEsMTgyLDE0NiwxMDgsMTEyLDcyLDgwLDI1MywyMzcsMTg1LDIxOCw5NCwyMSw3MCw4NywxNjcsMTQxLDE1NywxMzIsMTQ0LDIxNiwxNzEsMCwxNDAsMTg4LDIxMSwxMCwyNDcsMjI4LDg4LDUsMTg0LDE3OSw2OSw2LDIwOCw0NCwzMCwxNDMsMjAyLDYzLDE1LDIsMTkzLDE3NSwxODksMywxLDE5LDEzOCwxMDcsNTgsMTQ1LDE3LDY1LDc5LDEwMywyMjAsMjM0LDE1MSwyNDIsMjA3LDIwNiwyNDAsMTgwLDIzMCwxMTUsMTUwLDE3MiwxMTYsMzQsMjMxLDE3Myw1MywxMzMsMjI2LDI0OSw1NSwyMzIsMjgsMTE3LDIyMywxMTAsNzEsMjQxLDI2LDExMywyOSw0MSwxOTcsMTM3LDExMSwxODMsOTgsMTQsMTcwLDI0LDE5MCwyNywyNTIsODYsNjIsNzUsMTk4LDIxMCwxMjEsMzIsMTU0LDIxOSwxOTIsMjU0LDEyMCwyMDUsOTAsMjQ0LDMxLDIyMSwxNjgsNTEsMTM2LDcsMTk5LDQ5LDE3NywxOCwxNiw4OSwzOSwxMjgsMjM2LDk1LDk2LDgxLDEyNywxNjksMjUsMTgxLDc0LDEzLDQ1LDIyOSwxMjIsMTU5LDE0NywyMDEsMTU2LDIzOSwxNjAsMjI0LDU5LDc3LDE3NCw0MiwyNDUsMTc2LDIwMCwyMzUsMTg3LDYwLDEzMSw4MywxNTMsOTcsMjMsNDMsNCwxMjYsMTg2LDExOSwyMTQsMzgsMjI1LDEwNSwyMCw5OSw4NSwzMywxMiwxMjVdO3ZhciBUMT1bMzMyODQwMjM0MSw0MTY4OTA3OTA4LDQwMDA4MDY4MDksNDEzNTI4NzY5Myw0Mjk0MTExNzU3LDM1OTczNjQxNTcsMzczMTg0NTA0MSwyNDQ1NjU3NDI4LDE2MTM3NzA4MzIsMzM2MjAyMjcsMzQ2Mjg4MzI0MSwxNDQ1NjY5NzU3LDM4OTIyNDgwODksMzA1MDgyMTQ3NCwxMzAzMDk2Mjk0LDM5NjcxODY1ODYsMjQxMjQzMTk0MSw1Mjg2NDY4MTMsMjMxMTcwMjg0OCw0MjAyNTI4MTM1LDQwMjYyMDI2NDUsMjk5MjIwMDE3MSwyMzg3MDM2MTA1LDQyMjY4NzEzMDcsMTEwMTkwMTI5MiwzMDE3MDY5NjcxLDE2MDQ0OTQwNzcsMTE2OTE0MTczOCw1OTc0NjYzMDMsMTQwMzI5OTA2MywzODMyNzA1Njg2LDI2MTMxMDA2MzUsMTk3NDk3NDQwMiwzNzkxNTE5MDA0LDEwMzMwODE3NzQsMTI3NzU2ODYxOCwxODE1NDkyMTg2LDIxMTgwNzQxNzcsNDEyNjY2ODU0NiwyMjExMjM2OTQzLDE3NDgyNTE3NDAsMTM2OTgxMDQyMCwzNTIxNTA0NTY0LDQxOTMzODI2NjQsMzc5OTA4NTQ1OSwyODgzMTE1MTIzLDE2NDczOTEwNTksNzA2MDI0NzY3LDEzNDQ4MDkwOCwyNTEyODk3ODc0LDExNzY3MDc5NDEsMjY0Njg1MjQ0Niw4MDY4ODU0MTYsOTMyNjE1ODQxLDE2ODEwMTEzNSw3OTg2NjEzMDEsMjM1MzQxNTc3LDYwNTE2NDA4Niw0NjE0MDYzNjMsMzc1NjE4ODIyMSwzNDU0NzkwNDM4LDEzMTExODg4NDEsMjE0MjQxNzYxMywzOTMzNTY2MzY3LDMwMjU4MjA0Myw0OTUxNTgxNzQsMTQ3OTI4OTk3Miw4NzQxMjU4NzAsOTA3NzQ2MDkzLDM2OTgyMjQ4MTgsMzAyNTgyMDM5OCwxNTM3MjUzNjI3LDI3NTY4NTg2MTQsMTk4MzU5MzI5MywzMDg0MzEwMTEzLDIxMDg5Mjg5NzQsMTM3ODQyOTMwNywzNzIyNjk5NTgyLDE1ODAxNTA2NDEsMzI3NDUxNzk5LDI3OTA0Nzg4MzcsMzExNzUzNTU5MiwwLDMyNTM1OTU0MzYsMTA3NTg0NzI2NCwzODI1MDA3NjQ3LDIwNDE2ODg1MjAsMzA1OTQ0MDYyMSwzNTYzNzQzOTM0LDIzNzg5NDMzMDIsMTc0MDU1Mzk0NSwxOTE2MzUyODQzLDI0ODc4OTY3OTgsMjU1NTEzNzIzNiwyOTU4NTc5OTQ0LDIyNDQ5ODg3NDYsMzE1MTAyNDIzNSwzMzIwODM1ODgyLDEzMzY1ODQ5MzMsMzk5MjcxNDAwNiwyMjUyNTU1MjA1LDI1ODg3NTc0NjMsMTcxNDYzMTUwOSwyOTM5NjMxNTYsMjMxOTc5NTY2MywzOTI1NDczNTUyLDY3MjQwNDU0LDQyNjk3Njg1NzcsMjY4OTYxODE2MCwyMDE3MjEzNTA4LDYzMTIxODEwNiwxMjY5MzQ0NDgzLDI3MjMyMzgzODcsMTU3MTAwNTQzOCwyMTUxNjk0NTI4LDkzMjk0NDc0LDEwNjY1NzA0MTMsNTYzOTc3NjYwLDE4ODI3MzI2MTYsNDA1OTQyODEwMCwxNjczMzEzNTAzLDIwMDg0NjMwNDEsMjk1MDM1NTU3MywxMTA5NDY3NDkxLDUzNzkyMzYzMiwzODU4NzU5NDUwLDQyNjA2MjMxMTgsMzIxODI2NDY4NSwyMTc3NzQ4MzAwLDQwMzQ0MjcwOCw2Mzg3ODQzMDksMzI4NzA4NDA3OSwzMTkzOTIxNTA1LDg5OTEyNzIwMiwyMjg2MTc1NDM2LDc3MzI2NTIwOSwyNDc5MTQ2MDcxLDE0MzcwNTA4NjYsNDIzNjE0ODM1NCwyMDUwODMzNzM1LDMzNjIwMjI1NzIsMzEyNjY4MTA2Myw4NDA1MDU2NDMsMzg2NjMyNTkwOSwzMjI3NTQxNjY0LDQyNzkxNzcyMCwyNjU1OTk3OTA1LDI3NDkxNjA1NzUsMTE0MzA4NzcxOCwxNDEyMDQ5NTM0LDk5OTMyOTk2MywxOTM0OTcyMTksMjM1MzQxNTg4MiwzMzU0MzI0NTIxLDE4MDcyNjgwNTEsNjcyNDA0NTQwLDI4MTY0MDEwMTcsMzE2MDMwMTI4MiwzNjk4MjI0OTMsMjkxNjg2NjkzNCwzNjg4OTQ3NzcxLDE2ODEwMTEyODYsMTk0OTk3MzA3MCwzMzYyMDIyNzAsMjQ1NDI3NjU3MSwyMDE3MjEzNTQsMTIxMDMyODE3MiwzMDkzMDYwODM2LDI2ODAzNDEwODUsMzE4NDc3NjA0NiwxMTM1Mzg5OTM1LDMyOTQ3ODIxMTgsOTY1ODQxMzIwLDgzMTg4Njc1NiwzNTU0OTkzMjA3LDQwNjgwNDcyNDMsMzU4ODc0NTAxMCwyMzQ1MTkxNDkxLDE4NDkxMTI0MDksMzY2NDYwNDU5OSwyNjA1NDAyOCwyOTgzNTgxMDI4LDI2MjIzNzc2ODIsMTIzNTg1NTg0MCwzNjMwOTg0MzcyLDI4OTEzMzk1MTQsNDA5MjkxNjc0MywzNDg4Mjc5MDc3LDMzOTU2NDI3OTksNDEwMTY2NzQ3MCwxMjAyNjMwMzc3LDI2ODk2MTgxNiwxODc0NTA4NTAxLDQwMzQ0MjcwMTYsMTI0Mzk0ODM5OSwxNTQ2NTMwNDE4LDk0MTM2NjMwOCwxNDcwNTM5NTA1LDE5NDEyMjI1OTksMjU0NjM4NjUxMywzNDIxMDM4NjI3LDI3MTU2NzE5MzIsMzg5OTk0NjE0MCwxMDQyMjI2OTc3LDI1MjE1MTcwMjEsMTYzOTgyNDg2MCwyMjcyNDkwMzAsMjYwNzM3NjY5LDM3NjU0NjUyMzIsMjA4NDQ1Mzk1NCwxOTA3NzMzOTU2LDM0MjkyNjMwMTgsMjQyMDY1NjM0NCwxMDA4NjA2NzcsNDE2MDE1NzE4NSw0NzA2ODMxNTQsMzI2MTE2MTg5MSwxNzgxODcxOTY3LDI5MjQ5NTk3MzcsMTc3Mzc3OTQwOCwzOTQ2OTIyNDEsMjU3OTYxMTk5Miw5NzQ5ODY1MzUsNjY0NzA2NzQ1LDM2NTU0NTkxMjgsMzk1ODk2MjE5NSw3MzE0MjA4NTEsNTcxNTQzODU5LDM1MzAxMjM3MDcsMjg0OTYyNjQ4MCwxMjY3ODMxMTMsODY1Mzc1Mzk5LDc2NTE3MjY2MiwxMDA4NjA2NzU0LDM2MTIwMzYwMiwzMzg3NTQ5OTg0LDIyNzg0NzczODUsMjg1NzcxOTI5NSwxMzQ0ODA5MDgwLDI3ODI5MTIzNzgsNTk1NDI2NzEsMTUwMzc2NDk4NCwxNjAwMDg1NzYsNDM3MDYyOTM1LDE3MDcwNjUzMDYsMzYyMjIzMzY0OSwyMjE4OTM0OTgyLDM0OTY1MDM0ODAsMjE4NTMxNDc1NSw2OTc5MzIyMDgsMTUxMjkxMDE5OSw1MDQzMDMzNzcsMjA3NTE3NzE2MywyODI0MDk5MDY4LDE4NDEwMTk4NjIsNzM5NjQ0OTg2XTt2YXIgVDI9WzI3ODEyNDIyMTEsMjIzMDg3NzMwOCwyNTgyNTQyMTk5LDIzODE3NDA5MjMsMjM0ODc3NjgyLDMxODQ5NDYwMjcsMjk4NDE0NDc1MSwxNDE4ODM5NDkzLDEzNDg0ODEwNzIsNTA0NjI5NzcsMjg0ODg3NjM5MSwyMTAyNzk5MTQ3LDQzNDYzNDQ5NCwxNjU2MDg0NDM5LDM4NjM4NDk4OTksMjU5OTE4ODA4NiwxMTY3MDUxNDY2LDI2MzYwODc5MzgsMTA4Mjc3MTkxMywyMjgxMzQwMjg1LDM2ODA0ODg5MCwzOTU0MzM0MDQxLDMzODE1NDQ3NzUsMjAxMDYwNTkyLDM5NjM3MjcyNzcsMTczOTgzODY3Niw0MjUwOTAzMjAyLDM5MzA0MzU1MDMsMzIwNjc4MjEwOCw0MTQ5NDUzOTg4LDI1MzE1NTM5MDYsMTUzNjkzNDA4MCwzMjYyNDk0NjQ3LDQ4NDU3MjY2OSwyOTIzMjcxMDU5LDE3ODMzNzUzOTgsMTUxNzA0MTIwNiwxMDk4NzkyNzY3LDQ5Njc0MjMxLDEzMzQwMzc3MDgsMTU1MDMzMjk4MCw0MDk4OTkxNTI1LDg4NjE3MTEwOSwxNTA1OTgxMjksMjQ4MTA5MDkyOSwxOTQwNjQyMDA4LDEzOTg5NDQwNDksMTA1OTcyMjUxNywyMDE4NTE5MDgsMTM4NTU0NzcxOSwxNjk5MDk1MzMxLDE1ODczOTc1NzEsNjc0MjQwNTM2LDI3MDQ3NzQ4MDYsMjUyMzE0ODg1LDMwMzk3OTU4NjYsMTUxOTE0MjQ3LDkwODMzMzU4NiwyNjAyMjcwODQ4LDEwMzgwODI3ODYsNjUxMDI5NDgzLDE3NjY3Mjk1MTEsMzQ0NzY5ODA5OCwyNjgyOTQyODM3LDQ1NDE2Njc5MywyNjUyNzM0MzM5LDE5NTE5MzU1MzIsNzc1MTY2NDkwLDc1ODUyMDYwMywzMDAwNzkwNjM4LDQwMDQ3OTcwMTgsNDIxNzA4NjExMiw0MTM3OTY0MTE0LDEyOTk1OTQwNDMsMTYzOTQzODAzOCwzNDY0MzQ0NDk5LDIwNjg5ODIwNTcsMTA1NDcyOTE4NywxOTAxOTk3ODcxLDI1MzQ2Mzg3MjQsNDEyMTMxODIyNywxNzU3MDA4MzM3LDAsNzUwOTA2ODYxLDE2MTQ4MTUyNjQsNTM1MDM1MTMyLDMzNjM0MTg1NDUsMzk4ODE1MTEzMSwzMjAxNTkxOTE0LDExODM2OTc4NjcsMzY0NzQ1NDkxMCwxMjY1Nzc2OTUzLDM3MzQyNjAyOTgsMzU2Njc1MDc5NiwzOTAzODcxMDY0LDEyNTAyODM0NzEsMTgwNzQ3MDgwMCw3MTc2MTUwODcsMzg0NzIwMzQ5OCwzODQ2OTUyOTEsMzMxMzkxMDU5NSwzNjE3MjEzNzczLDE0MzI3NjExMzksMjQ4NDE3NjI2MSwzNDgxOTQ1NDEzLDI4Mzc2OTMzNywxMDA5MjU5NTQsMjE4MDkzOTY0Nyw0MDM3MDM4MTYwLDExNDg3MzA0MjgsMzEyMzAyNzg3MSwzODEzMzg2NDA4LDQwODc1MDExMzcsNDI2NzU0OTYwMywzMjI5NjMwNTI4LDIzMTU2MjAyMzksMjkwNjYyNDY1OCwzMTU2MzE5NjQ1LDEyMTUzMTM5NzYsODI5NjYwMDUsMzc0Nzg1NTU0OCwzMjQ1ODQ4MjQ2LDE5NzQ0NTkwOTgsMTY2NTI3ODI0MSw4MDc0MDc2MzIsNDUxMjgwODk1LDI1MTUyNDA4MywxODQxMjg3ODkwLDEyODM1NzUyNDUsMzM3MTIwMjY4LDg5MTY4NzY5OSw4MDEzNjkzMjQsMzc4NzM0OTg1NSwyNzIxNDIxMjA3LDM0MzE0ODI0MzYsOTU5MzIxODc5LDE0NjkzMDE5NTYsNDA2NTY5OTc1MSwyMTk3NTg1NTM0LDExOTkxOTM0MDUsMjg5ODgxNDA1MiwzODg3NzUwNDkzLDcyNDcwMzUxMywyNTE0OTA4MDE5LDI2OTY5NjIxNDQsMjU1MTgwODM4NSwzNTE2ODEzMTM1LDIxNDE0NDUzNDAsMTcxNTc0MTIxOCwyMTE5NDQ1MDM0LDI4NzI4MDc1NjgsMjE5ODU3MTE0NCwzMzk4MTkwNjYyLDcwMDk2ODY4NiwzNTQ3MDUyMjE2LDEwMDkyNTk1NDAsMjA0MTA0NDcwMiwzODAzOTk1NzQyLDQ4Nzk4Mzg4MywxOTkxMTA1NDk5LDEwMDQyNjU2OTYsMTQ0OTQwNzAyNiwxMzE2MjM5OTMwLDUwNDYyOTc3MCwzNjgzNzk3MzIxLDE2ODU2MDEzNCwxODE2NjY3MTcyLDM4MzcyODc1MTYsMTU3MDc1MTE3MCwxODU3OTM0MjkxLDQwMTQxODk3NDAsMjc5Nzg4ODA5OCwyODIyMzQ1MTA1LDI3NTQ3MTI5ODEsOTM2NjMzNTcyLDIzNDc5MjM4MzMsODUyODc5MzM1LDExMzMyMzQzNzYsMTUwMDM5NTMxOSwzMDg0NTQ1Mzg5LDIzNDg5MTIwMTMsMTY4OTM3NjIxMywzNTMzNDU5MDIyLDM3NjI5MjM5NDUsMzAzNDA4MjQxMiw0MjA1NTk4Mjk0LDEzMzQyODQ2OCw2MzQzODMwODIsMjk0OTI3NzAyOSwyMzk4Mzg2ODEwLDM5MTM3ODkxMDIsNDAzNzAzODE2LDM1ODA4NjkzMDYsMjI5NzQ2MDg1NiwxODY3MTMwMTQ5LDE5MTg2NDM3NTgsNjA3NjU2OTg4LDQwNDkwNTMzNTAsMzM0NjI0ODg4NCwxMzY4OTAxMzE4LDYwMDU2NTk5MiwyMDkwOTgyODc3LDI2MzI0Nzk4NjAsNTU3NzE5MzI3LDM3MTc2MTQ0MTEsMzY5NzM5MzA4NSwyMjQ5MDM0NjM1LDIyMzIzODgyMzQsMjQzMDYyNzk1MiwxMTE1NDM4NjU0LDMyOTU3ODY0MjEsMjg2NTUyMjI3OCwzNjMzMzM0MzQ0LDg0MjgwMDY3LDMzMDI3ODMwLDMwMzgyODQ5NCwyNzQ3NDI1MTIxLDE2MDA3OTU5NTcsNDE4ODk1MjQwNywzNDk2NTg5NzUzLDI0MzQyMzgwODYsMTQ4NjQ3MTYxNyw2NTgxMTk5NjUsMzEwNjM4MTQ3MCw5NTM4MDMyMzMsMzM0MjMxODAwLDMwMDU5Nzg3NzYsODU3ODcwNjA5LDMxNTExMjg5MzcsMTg5MDE3OTU0NSwyMjk4OTczODM4LDI4MDUxNzU0NDQsMzA1NjQ0MjI2Nyw1NzQzNjUyMTQsMjQ1MDg4NDQ4Nyw1NTAxMDM1MjksMTIzMzYzNzA3MCw0Mjg5MzUzMDQ1LDIwMTg1MTkwODAsMjA1NzY5MTEwMywyMzk5Mzc0NDc2LDQxNjY2MjM2NDksMjE0ODEwODY4MSwzODc1ODMyNDUsMzY2NDEwMTMxMSw4MzYyMzI5MzQsMzMzMDU1NjQ4MiwzMTAwNjY1OTYwLDMyODAwOTM1MDUsMjk1NTUxNjMxMywyMDAyMzk4NTA5LDI4NzE4MjYwNywzNDEzODgxMDA4LDQyMzg4OTAwNjgsMzU5NzUxNTcwNyw5NzU5Njc3NjZdO3ZhciBUMz1bMTY3MTgwODYxMSwyMDg5MDg5MTQ4LDIwMDY1NzY3NTksMjA3MjkwMTI0Myw0MDYxMDAzNzYyLDE4MDc2MDMzMDcsMTg3MzkyNzc5MSwzMzEwNjUzODkzLDgxMDU3Mzg3MiwxNjk3NDMzNywxNzM5MTgxNjcxLDcyOTYzNDM0Nyw0MjYzMTEwNjU0LDM2MTM1NzA1MTksMjg4Mzk5NzA5OSwxOTg5ODY0NTY2LDMzOTM1NTY0MjYsMjE5MTMzNTI5OCwzMzc2NDQ5OTkzLDIxMDYwNjM0ODUsNDE5NTc0MTY5MCwxNTA4NjE4ODQxLDEyMDQzOTE0OTUsNDAyNzMxNzIzMiwyOTE3OTQxNjc3LDM1NjM1NjYwMzYsMjczNDUxNDA4MiwyOTUxMzY2MDYzLDI2Mjk3NzIxODgsMjc2NzY3MjIyOCwxOTIyNDkxNTA2LDMyMjcyMjkxMjAsMzA4Mjk3NDY0Nyw0MjQ2NTI4NTA5LDI0Nzc2Njk3NzksNjQ0NTAwNTE4LDkxMTg5NTYwNiwxMDYxMjU2NzY3LDQxNDQxNjYzOTEsMzQyNzc2MzE0OCw4Nzg0NzEyMjAsMjc4NDI1MjMyNSwzODQ1NDQ0MDY5LDQwNDM4OTczMjksMTkwNTUxNzE2OSwzNjMxNDU5Mjg4LDgyNzU0ODIwOSwzNTY0NjEwNzcsNjc4OTczNDgsMzM0NDA3ODI3OSw1OTM4Mzk2NTEsMzI3Nzc1Nzg5MSw0MDUyODY5MzYsMjUyNzE0NzkyNiw4NDg3MTY4NSwyNTk1NTY1NDY2LDExODAzMzkyNywzMDU1MzgwNjYsMjE1NzY0ODc2OCwzNzk1NzA1ODI2LDM5NDUxODg4NDMsNjYxMjEyNzExLDI5OTk4MTIwMTgsMTk3MzQxNDUxNywxNTI3NjkwMzMsMjIwODE3NzUzOSw3NDU4MjIyNTIsNDM5MjM1NjEwLDQ1NTk0NzgwMywxODU3MjE1NTk4LDE1MjU1OTMxNzgsMjcwMDgyNzU1MiwxMzkxODk1NjM0LDk5NDkzMjI4MywzNTk2NzI4Mjc4LDMwMTY2NTQyNTksNjk1OTQ3ODE3LDM4MTI1NDgwNjcsNzk1OTU4ODMxLDIyMjQ0OTM0NDQsMTQwODYwNzgyNywzNTEzMzAxNDU3LDAsMzk3OTEzMzQyMSw1NDMxNzg3ODQsNDIyOTk0ODQxMiwyOTgyNzA1NTg1LDE1NDIzMDUzNzEsMTc5MDg5MTExNCwzNDEwMzk4NjY3LDMyMDE5MTg5MTAsOTYxMjQ1NzUzLDEyNTYxMDA5MzgsMTI4OTAwMTAzNiwxNDkxNjQ0NTA0LDM0Nzc3Njc2MzEsMzQ5NjcyMTM2MCw0MDEyNTU3ODA3LDI4NjcxNTQ4NTgsNDIxMjU4MzkzMSwxMTM3MDE4NDM1LDEzMDU5NzUzNzMsODYxMjM0NzM5LDIyNDEwNzM1NDEsMTE3MTIyOTI1Myw0MTc4NjM1MjU3LDMzOTQ4Njc0LDIxMzkyMjU3MjcsMTM1Nzk0Njk2MCwxMDExMTIwMTg4LDI2Nzk3NzY2NzEsMjgzMzQ2ODMyOCwxMzc0OTIxMjk3LDI3NTEzNTYzMjMsMTA4NjM1NzU2OCwyNDA4MTg3Mjc5LDI0NjA4Mjc1MzgsMjY0NjM1MjI4NSw5NDQyNzE0MTYsNDExMDc0MjAwNSwzMTY4NzU2NjY4LDMwNjYxMzI0MDYsMzY2NTE0NTgxOCw1NjAxNTMxMjEsMjcxNTg5MzkyLDQyNzk5NTI4OTUsNDA3Nzg0NjAwMywzNTMwNDA3ODkwLDM0NDQzNDMyNDUsMjAyNjQzNDY4LDMyMjI1MDI1OSwzOTYyNTUzMzI0LDE2MDg2Mjk4NTUsMjU0Mzk5MDE2NywxMTU0MjU0OTE2LDM4OTYyMzMxOSwzMjk0MDczNzk2LDI4MTc2NzY3MTEsMjEyMjUxMzUzNCwxMDI4MDk0NTI1LDE2ODkwNDUwOTIsMTU3NTQ2NzYxMyw0MjIyNjEyNzMsMTkzOTIwMzY5OSwxNjIxMTQ3NzQ0LDIxNzQyMjg4NjUsMTMzOTEzNzYxNSwzNjk5MzUyNTQwLDU3NzEyNzQ1OCw3MTI5MjIxNTQsMjQyNzE0MTAwOCwyMjkwMjg5NTQ0LDExODc2NzkzMDIsMzk5NTcxNTU2NiwzMTAwODYzNDE2LDMzOTQ4Njc0MCwzNzMyNTE0NzgyLDE1OTE5MTc2NjIsMTg2NDU1NTYzLDM2ODE5ODgwNTksMzc2MjAxOTI5Niw4NDQ1MjI1NDYsOTc4MjIwMDkwLDE2OTc0MzM3MCwxMjM5MTI2NjAxLDEwMTMyMTczNCw2MTEwNzYxMzIsMTU1ODQ5MzI3NiwzMjYwOTE1NjUwLDM1NDcyNTAxMzEsMjkwMTM2MTU4MCwxNjU1MDk2NDE4LDI0NDM3MjExMDUsMjUxMDU2NTc4MSwzODI4ODYzOTcyLDIwMzkyMTQ3MTMsMzg3ODg2ODQ1NSwzMzU5ODY5ODk2LDkyODYwNzc5OSwxODQwNzY1NTQ5LDIzNzQ3NjI4OTMsMzU4MDE0NjEzMywxMzIyNDI1NDIyLDI4NTAwNDg0MjUsMTgyMzc5MTIxMiwxNDU5MjY4Njk0LDQwOTQxNjE5MDgsMzkyODM0NjYwMiwxNzA2MDE5NDI5LDIwNTYxODkwNTAsMjkzNDUyMzgyMiwxMzU3OTQ2OTYsMzEzNDU0OTk0NiwyMDIyMjQwMzc2LDYyODA1MDQ2OSw3NzkyNDY2MzgsNDcyMTM1NzA4LDI4MDA4MzQ0NzAsMzAzMjk3MDE2NCwzMzI3MjM2MDM4LDM4OTQ2NjAwNzIsMzcxNTkzMjYzNywxOTU2NDQwMTgwLDUyMjI3MjI4NywxMjcyODEzMTMxLDMxODUzMzY3NjUsMjM0MDgxODMxNSwyMzIzOTc2MDc0LDE4ODg1NDI4MzIsMTA0NDU0NDU3NCwzMDQ5NTUwMjYxLDE3MjI0Njk0NzgsMTIyMjE1MjI2NCw1MDY2MDg2Nyw0MTI3MzI0MTUwLDIzNjA2Nzg1NCwxNjM4MTIyMDgxLDg5NTQ0NTU1NywxNDc1OTgwODg3LDMxMTc0NDM1MTMsMjI1NzY1NTY4NiwzMjQzODA5MjE3LDQ4OTExMDA0NSwyNjYyOTM0NDMwLDM3Nzg1OTkzOTMsNDE2MjA1NTE2MCwyNTYxODc4OTM2LDI4ODU2MzcyOSwxNzczOTE2Nzc3LDM2NDgwMzkzODUsMjM5MTM0NTAzOCwyNDkzOTg1Njg0LDI2MTI0MDc3MDcsNTA1NTYwMDk0LDIyNzQ0OTc5MjcsMzkxMTI0MDE2OSwzNDYwOTI1MzkwLDE0NDI4MTg2NDUsNjc4OTczNDgwLDM3NDkzNTcwMjMsMjM1ODE4Mjc5NiwyNzE3NDA3NjQ5LDIzMDY4Njk2NDEsMjE5NjE3ODA1LDMyMTg3NjExNTEsMzg2MjAyNjIxNCwxMTIwMzA2MjQyLDE3NTY5NDI0NDAsMTEwMzMzMTkwNSwyNTc4NDU5MDMzLDc2Mjc5NjU4OSwyNTI3ODAwNDcsMjk2NjEyNTQ4OCwxNDI1ODQ0MzA4LDMxNTEzOTIxODcsMzcyOTExMTI2XTt2YXIgVDQ9WzE2Njc0NzQ4ODYsMjA4ODUzNTI4OCwyMDA0MzI2ODk0LDIwNzE2OTQ4MzgsNDA3NTk0OTU2NywxODAyMjIzMDYyLDE4Njk1OTEwMDYsMzMxODA0Mzc5Myw4MDg0NzI2NzIsMTY4NDM1MjIsMTczNDg0NjkyNiw3MjQyNzA0MjIsNDI3ODA2NTYzOSwzNjIxMjE2OTQ5LDI4ODAxNjk1NDksMTk4NzQ4NDM5NiwzNDAyMjUzNzExLDIxODk1OTc5ODMsMzM4NTQwOTY3MywyMTA1Mzc4ODEwLDQyMTA2OTM2MTUsMTQ5OTA2NTI2NiwxMTk1ODg2OTkwLDQwNDIyNjM1NDcsMjkxMzg1NjU3NywzNTcwNjg5OTcxLDI3Mjg1OTA2ODcsMjk0NzU0MTU3MywyNjI3NTE4MjQzLDI3NjIyNzQ2NDMsMTkyMDExMjM1NiwzMjMzODMxODM1LDMwODIyNzMzOTcsNDI2MTIyMzY0OSwyNDc1OTI5MTQ5LDY0MDA1MTc4OCw5MDk1MzE3NTYsMTA2MTExMDE0Miw0MTYwMTYwNTAxLDM0MzU5NDE3NjMsODc1ODQ2NzYwLDI3NzkxMTY2MjUsMzg1NzAwMzcyOSw0MDU5MTA1NTI5LDE5MDMyNjg4MzQsMzYzODA2NDA0Myw4MjUzMTYxOTQsMzUzNzEzOTYyLDY3Mzc0MDg4LDMzNTE3Mjg3ODksNTg5NTIyMjQ2LDMyODQzNjA4NjEsNDA0MjM2MzM2LDI1MjY0NTQwNzEsODQyMTc2MTAsMjU5MzgzMDE5MSwxMTc5MDE1ODIsMzAzMTgzMzk2LDIxNTU5MTE5NjMsMzgwNjQ3Nzc5MSwzOTU4MDU2NjUzLDY1Njg5NDI4NiwyOTk4MDYyNDYzLDE5NzA2NDI5MjIsMTUxNTkxNjk4LDIyMDY0NDA5ODksNzQxMTEwODcyLDQzNzkyMzM4MCw0NTQ3NjU4NzgsMTg1Mjc0ODUwOCwxNTE1OTA4Nzg4LDI2OTQ5MDQ2NjcsMTM4MTE2ODgwNCw5OTM3NDIxOTgsMzYwNDM3Mzk0MywzMDE0OTA1NDY5LDY5MDU4NDQwMiwzODIzMzIwNzk3LDc5MTYzODM2NiwyMjIzMjgxOTM5LDEzOTgwMTEzMDIsMzUyMDE2MTk3NywwLDM5OTE3NDM2ODEsNTM4OTkyNzA0LDQyNDQzODE2NjcsMjk4MTIxODQyNSwxNTMyNzUxMjg2LDE3ODUzODA1NjQsMzQxOTA5NjcxNywzMjAwMTc4NTM1LDk2MDA1NjE3OCwxMjQ2NDIwNjI4LDEyODAxMDM1NzYsMTQ4MjIyMTc0NCwzNDg2NDY4NzQxLDM1MDMzMTk5OTUsNDAyNTQyODY3NywyODYzMzI2NTQzLDQyMjc1MzY2MjEsMTEyODUxNDk1MCwxMjk2OTQ3MDk4LDg1OTAwMjIxNCwyMjQwMTIzOTIxLDExNjIyMDMwMTgsNDE5Mzg0OTU3NywzMzY4NzA0NCwyMTM5MDYyNzgyLDEzNDc0ODE3NjAsMTAxMDU4MjY0OCwyNjc4MDQ1MjIxLDI4Mjk2NDA1MjMsMTM2NDMyNTI4MiwyNzQ1NDMzNjkzLDEwNzc5ODU0MDgsMjQwODU0ODg2OSwyNDU5MDg2MTQzLDI2NDQzNjAyMjUsOTQzMjEyNjU2LDQxMjY0NzU1MDUsMzE2NjQ5NDU2MywzMDY1NDMwMzkxLDM2NzE3NTAwNjMsNTU1ODM2MjI2LDI2OTQ5NjM1Miw0Mjk0OTA4NjQ1LDQwOTI3OTI1NzMsMzUzNzAwNjAxNSwzNDUyNzgzNzQ1LDIwMjExODE2OCwzMjAwMjU4OTQsMzk3NDkwMTY5OSwxNjAwMTE5MjMwLDI1NDMyOTcwNzcsMTE0NTM1OTQ5NiwzODczOTc5MzQsMzMwMTIwMTgxMSwyODEyODAxNjIxLDIxMjIyMjAyODQsMTAyNzQyNjE3MCwxNjg0MzE5NDMyLDE1NjY0MzUyNTgsNDIxMDc5ODU4LDE5MzY5NTQ4NTQsMTYxNjk0NTM0NCwyMTcyNzUzOTQ1LDEzMzA2MzEwNzAsMzcwNTQzODExNSw1NzI2Nzk3NDgsNzA3NDI3OTI0LDI0MjU0MDAxMjMsMjI5MDY0NzgxOSwxMTc5MDQ0NDkyLDQwMDg1ODU2NzEsMzA5OTEyMDQ5MSwzMzY4NzA0NDAsMzczOTEyMjA4NywxNTgzMjc2NzMyLDE4NTI3NzcxOCwzNjg4NTkzMDY5LDM3NzI3OTE3NzEsODQyMTU5NzE2LDk3Njg5OTcwMCwxNjg0MzUyMjAsMTIyOTU3NzEwNiwxMDEwNTkwODQsNjA2MzY2NzkyLDE1NDk1OTE3MzYsMzI2NzUxNzg1NSwzNTUzODQ5MDIxLDI4OTcwMTQ1OTUsMTY1MDYzMjM4OCwyNDQyMjQyMTA1LDI1MDk2MTIwODEsMzg0MDE2MTc0NywyMDM4MDA4ODE4LDM4OTA2ODg3MjUsMzM2ODU2NzY5MSw5MjYzNzQyNTQsMTgzNTkwNzAzNCwyMzc0ODYzODczLDM1ODc1MzE5NTMsMTMxMzc4ODU3MiwyODQ2NDgyNTA1LDE4MTkwNjM1MTIsMTQ0ODU0MDg0NCw0MTA5NjMzNTIzLDM5NDEyMTM2NDcsMTcwMTE2Mjk1NCwyMDU0ODUyMzQwLDI5MzA2OTg1NjcsMTM0NzQ4MTc2LDMxMzI4MDY1MTEsMjAyMTE2NTI5Niw2MjMyMTAzMTQsNzc0Nzk1ODY4LDQ3MTYwNjMyOCwyNzk1OTU4NjE1LDMwMzE3NDY0MTksMzMzNDg4NTc4MywzOTA3NTI3NjI3LDM3MjIyODAwOTcsMTk1Mzc5OTQwMCw1MjIxMzM4MjIsMTI2MzI2MzEyNiwzMTgzMzM2NTQ1LDIzNDExNzY4NDUsMjMyNDMzMzgzOSwxODg2NDI1MzEyLDEwNDQyNjc2NDQsMzA0ODU4ODQwMSwxNzE4MDA0NDI4LDEyMTI3MzM1ODQsNTA1Mjk1NDIsNDE0MzMxNzQ5NSwyMzU4MDMxNjQsMTYzMzc4ODg2Niw4OTI2OTAyODIsMTQ2NTM4MzM0MiwzMTE1OTYyNDczLDIyNTY5NjU5MTEsMzI1MDY3MzgxNyw0ODg0NDk4NTAsMjY2MTIwMjIxNSwzNzg5NjMzNzUzLDQxNzcwMDc1OTUsMjU2MDE0NDE3MSwyODYzMzk4NzQsMTc2ODUzNzA0MiwzNjU0OTA2MDI1LDIzOTE3MDU4NjMsMjQ5Mjc3MDA5OSwyNjEwNjczMTk3LDUwNTI5MTMyNCwyMjczODA4OTE3LDM5MjQzNjk2MDksMzQ2OTYyNTczNSwxNDMxNjk5MzcwLDY3Mzc0MDg4MCwzNzU1OTY1MDkzLDIzNTgwMjE4OTEsMjcxMTc0NjY0OSwyMzA3NDg5ODAxLDIxODk2MTY5MCwzMjE3MDIxNTQxLDM4NzM4NDU3MTksMTExMTY3MjQ1MiwxNzUxNjkzNTIwLDEwOTQ4Mjg5MzAsMjU3Njk4NjE1Myw3NTc5NTQzOTQsMjUyNjQ1NjYyLDI5NjQzNzY0NDMsMTQxNDg1NTg0OCwzMTQ5NjQ5NTE3LDM3MDU1NTQzNl07dmFyIFQ1PVsxMzc0OTg4MTEyLDIxMTgyMTQ5OTUsNDM3NzU3MTIzLDk3NTY1ODY0NiwxMDAxMDg5OTk1LDUzMDQwMDc1MywyOTAyMDg3ODUxLDEyNzMxNjg3ODcsNTQwMDgwNzI1LDI5MTAyMTk3NjYsMjI5NTEwMTA3Myw0MTEwNTY4NDg1LDEzNDA0NjMxMDAsMzMwNzkxNjI0Nyw2NDEwMjUxNTIsMzA0MzE0MDQ5NSwzNzM2MTY0OTM3LDYzMjk1MzcwMywxMTcyOTY3MDY0LDE1NzY5NzY2MDksMzI3NDY2NzI2NiwyMTY5MzAzMDU4LDIzNzAyMTM3OTUsMTgwOTA1NDE1MCw1OTcyNzg0NywzNjE5Mjk4NzcsMzIxMTYyMzE0NywyNTA1MjAyMTM4LDM1NjkyNTUyMTMsMTQ4NDAwNTg0MywxMjM5NDQzNzUzLDIzOTU1ODg2NzYsMTk3NTY4MzQzNCw0MTAyOTc3OTEyLDI1NzI2OTcxOTUsNjY2NDY0NzMzLDMyMDI0MzcwNDYsNDAzNTQ4OTA0NywzMzc0MzYxNzAyLDIxMTA2Njc0NDQsMTY3NTU3Nzg4MCwzODQzNjk5MDc0LDI1Mzg2ODExODQsMTY0OTYzOTIzNywyOTc2MTUxNTIwLDMxNDQzOTY0MjAsNDI2OTkwNzk5Niw0MTc4MDYyMjI4LDE4ODM3OTM0OTYsMjQwMzcyODY2NSwyNDk3NjA0NzQzLDEzODM4NTYzMTEsMjg3NjQ5NDYyNywxOTE3NTE4NTYyLDM4MTA0OTYzNDMsMTcxNjg5MDQxMCwzMDAxNzU1NjU1LDgwMDQ0MDgzNSwyMjYxMDg5MTc4LDM1NDM1OTkyNjksODA3OTYyNjEwLDU5OTc2MjM1NCwzMzc3ODM2MiwzOTc3Njc1MzU2LDIzMjg4Mjg5NzEsMjgwOTc3MTE1NCw0MDc3Mzg0NDMyLDEzMTU1NjIxNDUsMTcwODg0ODMzMywxMDEwMzk4MjksMzUwOTg3MTEzNSwzMjk5Mjc4NDc0LDg3NTQ1MTI5MywyNzMzODU2MTYwLDkyOTg3Njk4LDI3Njc2NDU1NTcsMTkzMTk1MDY1LDEwODAwOTQ2MzQsMTU4NDUwNDU4MiwzMTc4MTA2OTYxLDEwNDIzODU2NTcsMjUzMTA2NzQ1MywzNzExODI5NDIyLDEzMDY5NjczNjYsMjQzODIzNzYyMSwxOTA4Njk0Mjc3LDY3NTU2NDYzLDE2MTU4NjEyNDcsNDI5NDU2MTY0LDM2MDI3NzAzMjcsMjMwMjY5MDI1MiwxNzQyMzE1MTI3LDI5NjgwMTE0NTMsMTI2NDU0NjY0LDM4NzcxOTg2NDgsMjA0MzIxMTQ4MywyNzA5MjYwODcxLDIwODQ3MDQyMzMsNDE2OTQwODIwMSwwLDE1OTQxNzk4Nyw4NDE3Mzk1OTIsNTA0NDU5NDM2LDE4MTc4NjY4MzAsNDI0NTYxODY4MywyNjAzODg5NTAsMTAzNDg2Nzk5OCw5MDg5MzM0MTUsMTY4ODEwODUyLDE3NTA5MDIzMDUsMjYwNjQ1Mzk2OSw2MDc1MzA1NTQsMjAyMDA4NDk3LDI0NzIwMTE1MzUsMzAzNTUzNTA1OCw0NjMxODAxOTAsMjE2MDExNzA3MSwxNjQxODE2MjI2LDE1MTc3Njc1MjksNDcwOTQ4Mzc0LDM4MDEzMzIyMzQsMzIzMTcyMjIxMywxMDA4OTE4NTk1LDMwMzc2NTI3NywyMzU0NzQxODcsNDA2OTI0Njg5Myw3NjY5NDU0NjUsMzM3NTUzODY0LDE0NzU0MTg1MDEsMjk0MzY4MjM4MCw0MDAzMDYxMTc5LDI3NDMwMzQxMDksNDE0NDA0Nzc3NSwxNTUxMDM3ODg0LDExNDc1NTA2NjEsMTU0MzIwODUwMCwyMzM2NDM0NTUwLDM0MDgxMTk1MTYsMzA2OTA0OTk2MCwzMTAyMDExNzQ3LDM2MTAzNjkyMjYsMTExMzgxODM4NCwzMjg2NzE4MDgsMjIyNzU3MzAyNCwyMjM2MjI4NzMzLDM1MzU0ODY0NTYsMjkzNTU2Njg2NSwzMzQxMzk0Mjg1LDQ5NjkwNjA1OSwzNzAyNjY1NDU5LDIyNjkwNjg2MCwyMDA5MTk1NDcyLDczMzE1Njk3MiwyODQyNzM3MDQ5LDI5NDkzMDY4MiwxMjA2NDc3ODU4LDI4MzUxMjMzOTYsMjcwMDA5OTM1NCwxNDUxMDQ0MDU2LDU3MzgwNDc4MywyMjY5NzI4NDU1LDM2NDQzNzk1ODUsMjM2MjA5MDIzOCwyNTY0MDMzMzM0LDI4MDExMDc0MDcsMjc3NjI5MjkwNCwzNjY5NDYyNTY2LDEwNjgzNTEzOTYsNzQyMDM5MDEyLDEzNTAwNzg5ODksMTc4NDY2MzE5NSwxNDE3NTYxNjk4LDQxMzY0NDA3NzAsMjQzMDEyMjIxNiw3NzU1NTA4MTQsMjE5Mzg2MjY0NSwyNjczNzA1MTUwLDE3NzUyNzY5MjQsMTg3NjI0MTgzMywzNDc1MzEzMzMxLDMzNjY3NTQ2MTksMjcwMDQwNDg3LDM5MDI1NjMxODIsMzY3ODEyNDkyMywzNDQxODUwMzc3LDE4NTEzMzI4NTIsMzk2OTU2MjM2OSwyMjAzMDMyMjMyLDM4Njg1NTI4MDUsMjg2ODg5NzQwNiw1NjYwMjE4OTYsNDAxMTE5MDUwMiwzMTM1NzQwODg5LDEyNDg4MDI1MTAsMzkzNjI5MTI4NCw2OTk0MzIxNTAsODMyODc3MjMxLDcwODc4MDg0OSwzMzMyNzQwMTQ0LDg5OTgzNTU4NCwxOTUxMzE3MDQ3LDQyMzY0Mjk5OTAsMzc2NzU4Njk5Miw4NjY2Mzc4NDUsNDA0MzYxMDE4NiwxMTA2MDQxNTkxLDIxNDQxNjE4MDYsMzk1NDQxNzExLDE5ODQ4MTI2ODUsMTEzOTc4MTcwOSwzNDMzNzEyOTgwLDM4MzUwMzY4OTUsMjY2NDU0MzcxNSwxMjgyMDUwMDc1LDMyNDA4OTQzOTIsMTE4MTA0NTExOSwyNjQwMjQzMjA0LDI1OTY1OTE3LDQyMDMxODExNzEsNDIxMTgxODc5OCwzMDA5ODc5Mzg2LDI0NjM4Nzk3NjIsMzkxMDE2MTk3MSwxODQyNzU5NDQzLDI1OTc4MDY0NzYsOTMzMzAxMzcwLDE1MDk0MzA0MTQsMzk0MzkwNjQ0MSwzNDY3MTkyMzAyLDMwNzY2MzkwMjksMzc3Njc2NzQ2OSwyMDUxNTE4NzgwLDI2MzEwNjU0MzMsMTQ0MTk1MjU3NSw0MDQwMTY3NjEsMTk0MjQzNTc3NSwxNDA4NzQ5MDM0LDE2MTA0NTk3MzksMzc0NTM0NTMwMCwyMDE3Nzc4NTY2LDM0MDA1Mjg3NjksMzExMDY1MDk0Miw5NDE4OTY3NDgsMzI2NTQ3ODc1MSwzNzEwNDkzMzAsMzE2ODkzNzIyOCw2NzUwMzk2MjcsNDI3OTA4MDI1Nyw5NjczMTE3MjksMTM1MDUwMjA2LDM2MzU3MzM2NjAsMTY4MzQwNzI0OCwyMDc2OTM1MjY1LDM1NzY4NzA1MTIsMTIxNTA2MTEwOCwzNTAxNzQxODkwXTt2YXIgVDY9WzEzNDc1NDgzMjcsMTQwMDc4MzIwNSwzMjczMjY3MTA4LDI1MjAzOTM1NjYsMzQwOTY4NTM1NSw0MDQ1MzgwOTMzLDI4ODAyNDAyMTYsMjQ3MTIyNDA2NywxNDI4MTczMDUwLDQxMzg1NjMxODEsMjQ0MTY2MTU1OCw2MzY4MTM5MDAsNDIzMzA5NDYxNSwzNjIwMDIyOTg3LDIxNDk5ODc2NTIsMjQxMTAyOTE1NSwxMjM5MzMxMTYyLDE3MzA1MjU3MjMsMjU1NDcxODczNCwzNzgxMDMzNjY0LDQ2MzQ2MTAxLDMxMDQ2MzcyOCwyNzQzOTQ0ODU1LDMzMjg5NTUzODUsMzg3NTc3MDIwNywyNTAxMjE4OTcyLDM5NTUxOTExNjIsMzY2NzIxOTAzMyw3Njg5MTcxMjMsMzU0NTc4OTQ3Myw2OTI3MDc0MzMsMTE1MDIwODQ1NiwxNzg2MTAyNDA5LDIwMjkyOTMxNzcsMTgwNTIxMTcxMCwzNzEwMzY4MTEzLDMwNjU5NjI4MzEsNDAxNjM5NTk3LDE3MjQ0NTcxMzIsMzAyODE0MzY3NCw0MDkxOTg0MTAsMjE5NjA1MjUyOSwxNjIwNTI5NDU5LDExNjQwNzE4MDcsMzc2OTcyMTk3NSwyMjI2ODc1MzEwLDQ4NjQ0MTM3NiwyNDk5MzQ4NTIzLDE0ODM3NTM1NzYsNDI4ODE5OTY1LDIyNzQ2ODA0MjgsMzA3NTYzNjIxNiw1OTg0Mzg4NjcsMzc5OTE0MTEyMiwxNDc0NTAyNTQzLDcxMTM0OTY3NSwxMjkxNjYxMjAsNTM0NTgzNzAsMjU5MjUyMzY0MywyNzgyMDgyODI0LDQwNjMyNDIzNzUsMjk4ODY4NzI2OSwzMTIwNjk0MTIyLDE1NTkwNDE2NjYsNzMwNTE3Mjc2LDI0NjA0NDkyMDQsNDA0MjQ1OTEyMiwyNzA2MjcwNjkwLDM0NDYwMDQ0NjgsMzU3Mzk0MTY5NCw1MzM4MDQxMzAsMjMyODE0MzYxNCwyNjM3NDQyNjQzLDI2OTUwMzM2ODUsODM5MjI0MDMzLDE5NzM3NDUzODcsOTU3MDU1OTgwLDI4NTYzNDU4MzksMTA2ODUyNzY3LDEzNzEzNjg5NzYsNDE4MTU5ODYwMiwxMDMzMjk3MTU4LDI5MzM3MzQ5MTcsMTE3OTUxMDQ2MSwzMDQ2MjAwNDYxLDkxMzQxOTE3LDE4NjI1MzQ4NjgsNDI4NDUwMjAzNyw2MDU2NTczMzksMjU0NzQzMjkzNywzNDMxNTQ2OTQ3LDIwMDMyOTQ2MjIsMzE4MjQ4NzYxOCwyMjgyMTk1MzM5LDk1NDY2OTQwMywzNjgyMTkxNTk4LDEyMDE3NjUzODYsMzkxNzIzNDcwMywzMzg4NTA3MTY2LDAsMjE5ODQzODAyMiwxMjExMjQ3NTk3LDI4ODc2NTE2OTYsMTMxNTcyMzg5MCw0MjI3NjY1NjYzLDE0NDM4NTc3MjAsNTA3MzU4OTMzLDY1Nzg2MTk0NSwxNjc4MzgxMDE3LDU2MDQ4NzU5MCwzNTE2NjE5NjA0LDk3NTQ1MTY5NCwyOTcwMzU2MzI3LDI2MTMxNDUzNSwzNTM1MDcyOTE4LDI2NTI2MDk0MjUsMTMzMzgzODAyMSwyNzI0MzIyMzM2LDE3Njc1MzY0NTksMzcwOTM4Mzk0LDE4MjYyMTExNCwzODU0NjA2Mzc4LDExMjgwMTQ1NjAsNDg3NzI1ODQ3LDE4NTQ2OTE5NywyOTE4MzUzODYzLDMxMDY3ODA4NDAsMzM1Njc2MTc2OSwyMjM3MTMzMDgxLDEyODY1NjcxNzUsMzE1Mjk3NjM0OSw0MjU1MzUwNjI0LDI2ODM3NjUwMzAsMzE2MDE3NTM0OSwzMzA5NTk0MTcxLDg3ODQ0MzM5MCwxOTg4ODM4MTg1LDM3MDQzMDA0ODYsMTc1NjgxODk0MCwxNjczMDYxNjE3LDM0MDMxMDA2MzYsMjcyNzg2MzA5LDEwNzUwMjU2OTgsNTQ1NTcyMzY5LDIxMDU4ODcyNjgsNDE3NDU2MDA2MSwyOTY2Nzk3MzAsMTg0MTc2ODg2NSwxMjYwMjMyMjM5LDQwOTEzMjcwMjQsMzk2MDMwOTMzMCwzNDk3NTA5MzQ3LDE4MTQ4MDMyMjIsMjU3ODAxODQ4OSw0MTk1NDU2MDcyLDU3NTEzODE0OCwzMjk5NDA5MDM2LDQ0Njc1NDg3OSwzNjI5NTQ2Nzk2LDQwMTE5OTYwNDgsMzM0NzUzMjExMCwzMjUyMjM4NTQ1LDQyNzA2Mzk3NzgsOTE1OTg1NDE5LDM0ODM4MjU1MzcsNjgxOTMzNTM0LDY1MTg2ODA0NiwyNzU1NjM2NjcxLDM4MjgxMDM4MzcsMjIzMzc3NTU0LDI2MDc0Mzk4MjAsMTY0OTcwNDUxOCwzMjcwOTM3ODc1LDM5MDE4MDY3NzYsMTU4MDA4Nzc5OSw0MTE4OTg3Njk1LDMxOTgxMTUyMDAsMjA4NzMwOTQ1OSwyODQyNjc4NTczLDMwMTY2OTcxMDYsMTAwMzAwNzEyOSwyODAyODQ5OTE3LDE4NjA3MzgxNDcsMjA3Nzk2NTI0MywxNjQ0Mzk2NzIsNDEwMDg3MjQ3MiwzMjI4MzMxOSwyODI3MTc3ODgyLDE3MDk2MTAzNTAsMjEyNTEzNTg0NiwxMzY0Mjg3NTEsMzg3NDQyODM5MiwzNjUyOTA0ODU5LDM0NjA5ODQ2MzAsMzU3MjE0NTkyOSwzNTkzMDU2MzgwLDI5MzkyNjYyMjYsODI0ODUyMjU5LDgxODMyNDg4NCwzMjI0NzQwNDU0LDkzMDM2OTIxMiwyODAxNTY2NDEwLDI5Njc1MDcxNTIsMzU1NzA2ODQwLDEyNTczMDkzMzYsNDE0ODI5MjgyNiwyNDMyNTY2NTYsNzkwMDczODQ2LDIzNzMzNDA2MzAsMTI5NjI5NzkwNCwxNDIyNjk5MDg1LDM3NTYyOTk3ODAsMzgxODgzNjQwNSw0NTc5OTI4NDAsMzA5OTY2NzQ4NywyMTM1MzE5ODg5LDc3NDIyMzE0LDE1NjAzODI1MTcsMTk0NTc5ODUxNiw3ODgyMDQzNTMsMTUyMTcwNjc4MSwxMzg1MzU2MjQyLDg3MDkxMjA4NiwzMjU5NjUzODMsMjM1ODk1NzkyMSwyMDUwNDY2MDYwLDIzODgyNjA4ODQsMjMxMzg4NDQ3Niw0MDA2NTIxMTI3LDkwMTIxMDU2OSwzOTkwOTUzMTg5LDEwMTQ2NDY3MDUsMTUwMzQ0OTgyMywxMDYyNTk3MjM1LDIwMzE2MjEzMjYsMzIxMjAzNTg5NSwzOTMxMzcxNDY5LDE1MzMwMTc1MTQsMzUwMTc0NTc1LDIyNTYwMjg4OTEsMjE3NzU0NDE3OSwxMDUyMzM4MzcyLDc0MTg3Njc4OCwxNjA2NTkxMjk2LDE5MTQwNTIwMzUsMjEzNzA1MjUzLDIzMzQ2Njk4OTcsMTEwNzIzNDE5NywxODk5NjAzOTY5LDM3MjUwNjk0OTEsMjYzMTQ0Nzc4MCwyNDIyNDk0OTEzLDE2MzU1MDI5ODAsMTg5MzAyMDM0MiwxOTUwOTAzMzg4LDExMjA5NzQ5MzVdO3ZhciBUNz1bMjgwNzA1ODkzMiwxNjk5OTcwNjI1LDI3NjQyNDk2MjMsMTU4NjkwMzU5MSwxODA4NDgxMTk1LDExNzM0MzAxNzMsMTQ4NzY0NTk0Niw1OTk4NDg2Nyw0MTk5ODgyODAwLDE4NDQ4ODI4MDYsMTk4OTI0OTIyOCwxMjc3NTU1OTcwLDM2MjM2MzY5NjUsMzQxOTkxNTU2MiwxMTQ5MjQ5MDc3LDI3NDQxMDQyOTAsMTUxNDc5MDU3Nyw0NTk3NDQ2OTgsMjQ0ODYwMzk0LDMyMzU5OTUxMzQsMTk2MzExNTMxMSw0MDI3NzQ0NTg4LDI1NDQwNzgxNTAsNDE5MDUzMDUxNSwxNjA4OTc1MjQ3LDI2MjcwMTYwODIsMjA2MjI3MDMxNywxNTA3NDk3Mjk4LDIyMDA4MTg4NzgsNTY3NDk4ODY4LDE3NjQzMTM1NjgsMzM1OTkzNjIwMSwyMzA1NDU1NTU0LDIwMzc5NzAwNjIsMTA0NzIzOWUzLDE5MTAzMTkwMzMsMTMzNzM3NjQ4MSwyOTA0MDI3MjcyLDI4OTI0MTczMTIsOTg0OTA3MjE0LDEyNDMxMTI0MTUsODMwNjYxOTE0LDg2MTk2ODIwOSwyMTM1MjUzNTg3LDIwMTEyMTQxODAsMjkyNzkzNDMxNSwyNjg2MjU0NzIxLDczMTE4MzM2OCwxNzUwNjI2Mzc2LDQyNDYzMTA3MjUsMTgyMDgyNDc5OCw0MTcyNzYzNzcxLDM1NDIzMzAyMjcsNDgzOTQ4MjcsMjQwNDkwMTY2MywyODcxNjgyNjQ1LDY3MTU5MzE5NSwzMjU0OTg4NzI1LDIwNzM3MjQ2MTMsMTQ1MDg1MjM5LDIyODA3OTYyMDAsMjc3OTkxNTE5OSwxNzkwNTc1MTA3LDIxODcxMjgwODYsNDcyNjE1NjMxLDMwMjk1MTAwMDksNDA3NTg3NzEyNywzODAyMjIyMTg1LDQxMDcxMDE2NTgsMzIwMTYzMTc0OSwxNjQ2MjUyMzQwLDQyNzA1MDcxNzQsMTQwMjgxMTQzOCwxNDM2NTkwODM1LDM3NzgxNTE4MTgsMzk1MDM1NTcwMiwzOTYzMTYxNDc1LDQwMjA5MTIyMjQsMjY2Nzk5NDczNywyNzM3OTIzNjYsMjMzMTU5MDE3NywxMDQ2OTk2MTMsOTUzNDU5ODIsMzE3NTUwMTI4NiwyMzc3NDg2Njc2LDE1NjA2Mzc4OTIsMzU2NDA0NTMxOCwzNjkwNTc4NzIsNDIxMzQ0NzA2NCwzOTE5MDQyMjM3LDExMzc0Nzc5NTIsMjY1ODYyNTQ5NywxMTE5NzI3ODQ4LDIzNDA5NDc4NDksMTUzMDQ1NTgzMyw0MDA3MzYwOTY4LDE3MjQ2NjU1NiwyNjY5NTk5MzgsNTE2NTUyODM2LDAsMjI1NjczNDU5MiwzOTgwOTMxNjI3LDE4OTAzMjgwODEsMTkxNzc0MjE3MCw0Mjk0NzA0Mzk4LDk0NTE2NDE2NSwzNTc1NTI4ODc4LDk1ODg3MTA4NSwzNjQ3MjEyMDQ3LDI3ODcyMDcyNjAsMTQyMzAyMjkzOSw3NzU1NjIyOTQsMTczOTY1NjIwMiwzODc2NTU3NjU1LDI1MzAzOTEyNzgsMjQ0MzA1ODA3NSwzMzEwMzIxODU2LDU0NzUxMjc5NiwxMjY1MTk1NjM5LDQzNzY1NjU5NCwzMTIxMjc1NTM5LDcxOTcwMDEyOCwzNzYyNTAyNjkwLDM4Nzc4MTE0NywyMTg4MjgyOTcsMzM1MDA2NTgwMywyODMwNzA4MTUwLDI4NDg0NjE4NTQsNDI4MTY5MjAxLDEyMjQ2NjE2NSwzNzIwMDgxMDQ5LDE2MjcyMzUxOTksNjQ4MDE3NjY1LDQxMjI3NjIzNTQsMTAwMjc4Mzg0NiwyMTE3MzYwNjM1LDY5NTYzNDc1NSwzMzM2MzU4NjkxLDQyMzQ3MjEwMDUsNDA0OTg0NDQ1MiwzNzA0MjgwODgxLDIyMzI0MzUyOTksNTc0NjI0NjYzLDI4NzM0MzgxNCw2MTIyMDU4OTgsMTAzOTcxNzA1MSw4NDAwMTk3MDUsMjcwODMyNjE4NSw3OTM0NTE5MzQsODIxMjg4MTE0LDEzOTEyMDE2NzAsMzgyMjA5MDE3NywzNzYxODc4MjcsMzExMzg1NTM0NCwxMjI0MzQ4MDUyLDE2Nzk5NjgyMzMsMjM2MTY5ODU1NiwxMDU4NzA5NzQ0LDc1MjM3NTQyMSwyNDMxNTkwOTYzLDEzMjE2OTkxNDUsMzUxOTE0MjIwMCwyNzM0NTkxMTc4LDE4ODEyNzQ0NCwyMTc3ODY5NTU3LDM3MjcyMDU3NTQsMjM4NDkxMTAzMSwzMjE1MjEyNDYxLDI2NDg5NzY0NDIsMjQ1MDM0NjEwNCwzNDMyNzM3Mzc1LDExODA4NDkyNzgsMzMxNTQ0MjA1LDMxMDIyNDkxNzYsNDE1MDE0NDU2OSwyOTUyMTAyNTk1LDIxNTk5NzYyODUsMjQ3NDQwNDMwNCw3NjYwNzg5MzMsMzEzNzczODYxLDI1NzA4MzIwNDQsMjEwODEwMDYzMiwxNjY4MjEyODkyLDMxNDU0NTY0NDMsMjAxMzkwODI2Miw0MTg2NzIyMTcsMzA3MDM1NjYzNCwyNTk0NzM0OTI3LDE4NTIxNzE5MjUsMzg2NzA2MDk5MSwzNDczNDE2NjM2LDM5MDc0NDg1OTcsMjYxNDczNzYzOSw5MTk0ODkxMzUsMTY0OTQ4NjM5LDIwOTQ0MTAxNjAsMjk5NzgyNTk1Niw1OTA0MjQ2MzksMjQ4NjIyNDU0OSwxNzIzODcyNjc0LDMxNTc3NTA4NjIsMzM5OTk0MTI1MCwzNTAxMjUyNzUyLDM2MjUyNjgxMzUsMjU1NTA0ODE5NiwzNjczNjM3MzU2LDEzNDMxMjc1MDEsNDEzMDI4MTM2MSwzNTk5NTk1MDg1LDI5NTc4NTM2NzksMTI5NzQwMzA1MCw4MTc4MTkxMCwzMDUxNTkzNDI1LDIyODM0OTA0MTAsNTMyMjAxNzcyLDEzNjcyOTU1ODksMzkyNjE3MDk3NCw4OTUyODc2OTIsMTk1Mzc1NzgzMSwxMDkzNTk3OTYzLDQ5MjQ4MzQzMSwzNTI4NjI2OTA3LDE0NDYyNDI1NzYsMTE5MjQ1NTYzOCwxNjM2NjA0NjMxLDIwOTMzNjIyNSwzNDQ4NzM0NjQsMTAxNTY3MTU3MSw2Njk5NjE4OTcsMzM3NTc0MDc2OSwzODU3NTcyMTI0LDI5NzM1MzA2OTUsMzc0NzE5MjAxOCwxOTMzNTMwNjEwLDM0NjQwNDI1MTYsOTM1MjkzODk1LDM0NTQ2ODYxOTksMjg1ODExNTA2OSwxODYzNjM4ODQ1LDM2ODMwMjI5MTYsNDA4NTM2OTUxOSwzMjkyNDQ1MDMyLDg3NTMxMzE4OCwxMDgwMDE3NTcxLDMyNzkwMzM4ODUsNjIxNTkxNzc4LDEyMzM4NTY1NzIsMjUwNDEzMDMxNywyNDE5NzU0NCwzMDE3NjcyNzE2LDM4MzU0ODQzNDAsMzI0NzQ2NTU1OCwyMjIwOTgxMTk1LDMwNjA4NDc5MjIsMTU1MTEyNDU4OCwxNDYzOTk2NjAwXTt2YXIgVDg9WzQxMDQ2MDU3NzcsMTA5NzE1OTU1MCwzOTY2NzM4MTgsNjYwNTEwMjY2LDI4NzU5NjgzMTUsMjYzODYwNjYyMyw0MjAwMTE1MTE2LDM4MDg2NjIzNDcsODIxNzEyMTYwLDE5ODY5MTgwNjEsMzQzMDMyMjU2OCwzODU0NDg4NSwzODU2MTM3Mjk1LDcxODAwMjExNyw4OTM2ODE3MDIsMTY1NDg4NjMyNSwyOTc1NDg0MzgyLDMxMjIzNTgwNTMsMzkyNjgyNTAyOSw0Mjc0MDUzNDY5LDc5NjE5NzU3MSwxMjkwODAxNzkzLDExODQzNDI5MjUsMzU1NjM2MTgzNSwyNDA1NDI2OTQ3LDI0NTk3MzUzMTcsMTgzNjc3MjI4NywxMzgxNjIwMzczLDMxOTYyNjc5ODgsMTk0ODM3Mzg0OCwzNzY0OTg4MjMzLDMzODUzNDUxNjYsMzI2Mzc4NTU4OSwyMzkwMzI1NDkyLDE0ODA0ODU3ODUsMzExMTI0NzE0MywzNzgwMDk3NzI2LDIyOTMwNDUyMzIsNTQ4MTY5NDE3LDM0NTk5NTM3ODksMzc0NjE3NTA3NSw0Mzk0NTIzODksMTM2MjMyMTU1OSwxNDAwODQ5NzYyLDE2ODU1Nzc5MDUsMTgwNjU5OTM1NSwyMTc0NzU0MDQ2LDEzNzA3MzkxMywxMjE0Nzk3OTM2LDExNzQyMTUwNTUsMzczMTY1NDU0OCwyMDc5ODk3NDI2LDE5NDMyMTcwNjcsMTI1ODQ4MDI0Miw1Mjk0ODc4NDMsMTQzNzI4MDg3MCwzOTQ1MjY5MTcwLDMwNDkzOTA4OTUsMzMxMzIxMjAzOCw5MjMzMTM2MTksNjc5OTk4ZTMsMzIxNTMwNzI5OSw1NzMyNjA4MiwzNzc2NDIyMjEsMzQ3NDcyOTg2NiwyMDQxODc3MTU5LDEzMzM2MTkwNywxNzc2NDYwMTEwLDM2NzM0NzY0NTMsOTYzOTI0NTQsODc4ODQ1OTA1LDI4MDE2OTk1MjQsNzc3MjMxNjY4LDQwODI0NzUxNzAsMjMzMDAxNDIxMyw0MTQyNjI2MjEyLDIyMTMyOTYzOTUsMTYyNjMxOTQyNCwxOTA2MjQ3MjYyLDE4NDY1NjMyNjEsNTYyNzU1OTAyLDM3MDgxNzM3MTgsMTA0MDU1OTgzNywzODcxMTYzOTgxLDE0MTg1NzMyMDEsMzI5NDQzMDU3NywxMTQ1ODUzNDgsMTM0MzYxODkxMiwyNTY2NTk1NjA5LDMxODYyMDI1ODIsMTA3ODE4NTA5NywzNjUxMDQxMTI3LDM4OTY2ODgwNDgsMjMwNzYyMjkxOSw0MjU0MDg3NDMsMzM3MTA5Njk1MywyMDgxMDQ4NDgxLDExMDgzMzkwNjgsMjIxNjYxMDI5NiwwLDIxNTYyOTkwMTcsNzM2OTcwODAyLDI5MjU5Njc2NiwxNTE3NDQwNjIwLDI1MTY1NzIxMywyMjM1MDYxNzc1LDI5MzMyMDI0OTMsNzU4NzIwMzEwLDI2NTkwNTE2MiwxNTU0MzkxNDAwLDE1MzIyODUzMzksOTA4OTk5MjA0LDE3NDU2NzY5MiwxNDc0NzYwNTk1LDQwMDI4NjE3NDgsMjYxMDAxMTY3NSwzMjM0MTU2NDE2LDM2OTMxMjYyNDEsMjAwMTQzMDg3NCwzMDM2OTk0ODQsMjQ3ODQ0MzIzNCwyNjg3MTY1ODg4LDU4NTEyMjYyMCw0NTQ0OTk2MDIsMTUxODQ5NzQyLDIzNDUxMTkyMTgsMzA2NDUxMDc2NSw1MTQ0NDMyODQsNDA0NDk4MTU5MSwxOTYzNDEyNjU1LDI1ODE0NDU2MTQsMjEzNzA2MjgxOSwxOTMwODUzNSwxOTI4NzA3MTY0LDE3MTUxOTMxNTYsNDIxOTM1MjE1NSwxMTI2NzkwNzk1LDYwMDIzNTIxMSwzOTkyNzQyMDcwLDM4NDEwMjQ5NTIsODM2NTUzNDMxLDE2Njk2NjQ4MzQsMjUzNTYwNDI0MywzMzIzMDExMjA0LDEyNDM5MDU0MTMsMzE0MTQwMDc4Niw0MTgwODA4MTEwLDY5ODQ0NTI1NSwyNjUzODk5NTQ5LDI5ODk1NTI2MDQsMjI1MzU4MTMyNSwzMjUyOTMyNzI3LDMwMDQ1OTExNDcsMTg5MTIxMTY4OSwyNDg3ODEwNTc3LDM5MTU2NTM3MDMsNDIzNzA4MzgxNiw0MDMwNjY3NDI0LDIxMDAwOTA5NjYsODY1MTM2NDE4LDEyMjk4OTk2NTUsOTUzMjcwNzQ1LDMzOTk2Nzk2MjgsMzU1NzUwNDY2NCw0MTE4OTI1MjIyLDIwNjEzNzk3NDksMzA3OTU0NjU4NiwyOTE1MDE3NzkxLDk4MzQyNjA5MiwyMDIyODM3NTg0LDE2MDcyNDQ2NTAsMjExODU0MTkwOCwyMzY2ODgyNTUwLDM2MzU5OTY4MTYsOTcyNTEyODE0LDMyODMwODg3NzAsMTU2ODcxODQ5NSwzNDk5MzI2NTY5LDM1NzY1Mzk1MDMsNjIxOTgyNjcxLDI4OTU3MjM0NjQsNDEwODg3OTUyLDI2MjM3NjIxNTIsMTAwMjE0MjY4Myw2NDU0MDEwMzcsMTQ5NDgwNzY2MiwyNTk1Njg0ODQ0LDEzMzU1MzU3NDcsMjUwNzA0MDIzMCw0MjkzMjk1Nzg2LDMxNjc2ODQ2NDEsMzY3NTg1MDA3LDM4ODU3NTA3MTQsMTg2NTg2MjczMCwyNjY4MjIxNjc0LDI5NjA5NzEzMDUsMjc2MzE3MzY4MSwxMDU5MjcwOTU0LDI3Nzc5NTI0NTQsMjcyNDY0Mjg2OSwxMzIwOTU3ODEyLDIxOTQzMTkxMDAsMjQyOTU5NTg3MiwyODE1OTU2Mjc1LDc3MDg5NTIxLDM5NzM3NzMxMjEsMzQ0NDU3NTg3MSwyNDQ4ODMwMjMxLDEzMDU5MDY1NTAsNDAyMTMwODczOSwyODU3MTk0NzAwLDI1MTY5MDE4NjAsMzUxODM1ODQzMCwxNzg3MzA0NzgwLDc0MDI3NjQxNywxNjk5ODM5ODE0LDE1OTIzOTQ5MDksMjM1MjMwNzQ1NywyMjcyNTU2MDI2LDE4ODgyMTI0MywxNzI5OTc3MDExLDM2ODc5OTQwMDIsMjc0MDg0ODQxLDM1OTQ5ODIyNTMsMzYxMzQ5NDQyNiwyNzAxOTQ5NDk1LDQxNjIwOTY3MjksMzIyNzM0NTcxLDI4Mzc5NjY1NDIsMTY0MDU3NjQzOSw0ODQ4MzA2ODksMTIwMjc5NzY5MCwzNTM3ODUyODI4LDQwNjc2MzkxMjUsMzQ5MDc1NzM2LDMzNDIzMTk0NzUsNDE1NzQ2NzIxOSw0MjU1ODAwMTU5LDEwMzA2OTAwMTUsMTE1NTIzNzQ5NiwyOTUxOTcxMjc0LDE3NTc2OTE1NzcsNjA3Mzk4OTY4LDI3Mzg5MDUwMjYsNDk5MzQ3OTkwLDM3OTQwNzg5MDgsMTAxMTQ1MjcxMiwyMjc4ODU1NjcsMjgxODY2NjgwOSwyMTMxMTQzNzYsMzAzNDg4MTI0MCwxNDU1NTI1OTg4LDM0MTQ0NTA1NTUsODUwODE3MjM3LDE4MTc5OTg0MDgsMzA5MjcyNjQ4MF07dmFyIFUxPVswLDIzNTQ3NDE4Nyw0NzA5NDgzNzQsMzAzNzY1Mjc3LDk0MTg5Njc0OCw5MDg5MzM0MTUsNjA3NTMwNTU0LDcwODc4MDg0OSwxODgzNzkzNDk2LDIxMTgyMTQ5OTUsMTgxNzg2NjgzMCwxNjQ5NjM5MjM3LDEyMTUwNjExMDgsMTE4MTA0NTExOSwxNDE3NTYxNjk4LDE1MTc3Njc1MjksMzc2NzU4Njk5Miw0MDAzMDYxMTc5LDQyMzY0Mjk5OTAsNDA2OTI0Njg5MywzNjM1NzMzNjYwLDM2MDI3NzAzMjcsMzI5OTI3ODQ3NCwzNDAwNTI4NzY5LDI0MzAxMjIyMTYsMjY2NDU0MzcxNSwyMzYyMDkwMjM4LDIxOTM4NjI2NDUsMjgzNTEyMzM5NiwyODAxMTA3NDA3LDMwMzU1MzUwNTgsMzEzNTc0MDg4OSwzNjc4MTI0OTIzLDM1NzY4NzA1MTIsMzM0MTM5NDI4NSwzMzc0MzYxNzAyLDM4MTA0OTYzNDMsMzk3NzY3NTM1Niw0Mjc5MDgwMjU3LDQwNDM2MTAxODYsMjg3NjQ5NDYyNywyNzc2MjkyOTA0LDMwNzY2MzkwMjksMzExMDY1MDk0MiwyNDcyMDExNTM1LDI2NDAyNDMyMDQsMjQwMzcyODY2NSwyMTY5MzAzMDU4LDEwMDEwODk5OTUsODk5ODM1NTg0LDY2NjQ2NDczMyw2OTk0MzIxNTAsNTk3Mjc4NDcsMjI2OTA2ODYwLDUzMDQwMDc1MywyOTQ5MzA2ODIsMTI3MzE2ODc4NywxMTcyOTY3MDY0LDE0NzU0MTg1MDEsMTUwOTQzMDQxNCwxOTQyNDM1Nzc1LDIxMTA2Njc0NDQsMTg3NjI0MTgzMywxNjQxODE2MjI2LDI5MTAyMTk3NjYsMjc0MzAzNDEwOSwyOTc2MTUxNTIwLDMyMTE2MjMxNDcsMjUwNTIwMjEzOCwyNjA2NDUzOTY5LDIzMDI2OTAyNTIsMjI2OTcyODQ1NSwzNzExODI5NDIyLDM1NDM1OTkyNjksMzI0MDg5NDM5MiwzNDc1MzEzMzMxLDM4NDM2OTkwNzQsMzk0MzkwNjQ0MSw0MTc4MDYyMjI4LDQxNDQwNDc3NzUsMTMwNjk2NzM2NiwxMTM5NzgxNzA5LDEzNzQ5ODgxMTIsMTYxMDQ1OTczOSwxOTc1NjgzNDM0LDIwNzY5MzUyNjUsMTc3NTI3NjkyNCwxNzQyMzE1MTI3LDEwMzQ4Njc5OTgsODY2NjM3ODQ1LDU2NjAyMTg5Niw4MDA0NDA4MzUsOTI5ODc2OTgsMTkzMTk1MDY1LDQyOTQ1NjE2NCwzOTU0NDE3MTEsMTk4NDgxMjY4NSwyMDE3Nzc4NTY2LDE3ODQ2NjMxOTUsMTY4MzQwNzI0OCwxMzE1NTYyMTQ1LDEwODAwOTQ2MzQsMTM4Mzg1NjMxMSwxNTUxMDM3ODg0LDEwMTAzOTgyOSwxMzUwNTAyMDYsNDM3NzU3MTIzLDMzNzU1Mzg2NCwxMDQyMzg1NjU3LDgwNzk2MjYxMCw1NzM4MDQ3ODMsNzQyMDM5MDEyLDI1MzEwNjc0NTMsMjU2NDAzMzMzNCwyMzI4ODI4OTcxLDIyMjc1NzMwMjQsMjkzNTU2Njg2NSwyNzAwMDk5MzU0LDMwMDE3NTU2NTUsMzE2ODkzNzIyOCwzODY4NTUyODA1LDM5MDI1NjMxODIsNDIwMzE4MTE3MSw0MTAyOTc3OTEyLDM3MzYxNjQ5MzcsMzUwMTc0MTg5MCwzMjY1NDc4NzUxLDM0MzM3MTI5ODAsMTEwNjA0MTU5MSwxMzQwNDYzMTAwLDE1NzY5NzY2MDksMTQwODc0OTAzNCwyMDQzMjExNDgzLDIwMDkxOTU0NzIsMTcwODg0ODMzMywxODA5MDU0MTUwLDgzMjg3NzIzMSwxMDY4MzUxMzk2LDc2Njk0NTQ2NSw1OTk3NjIzNTQsMTU5NDE3OTg3LDEyNjQ1NDY2NCwzNjE5Mjk4NzcsNDYzMTgwMTkwLDI3MDkyNjA4NzEsMjk0MzY4MjM4MCwzMTc4MTA2OTYxLDMwMDk4NzkzODYsMjU3MjY5NzE5NSwyNTM4NjgxMTg0LDIyMzYyMjg3MzMsMjMzNjQzNDU1MCwzNTA5ODcxMTM1LDM3NDUzNDUzMDAsMzQ0MTg1MDM3NywzMjc0NjY3MjY2LDM5MTAxNjE5NzEsMzg3NzE5ODY0OCw0MTEwNTY4NDg1LDQyMTE4MTg3OTgsMjU5NzgwNjQ3NiwyNDk3NjA0NzQzLDIyNjEwODkxNzgsMjI5NTEwMTA3MywyNzMzODU2MTYwLDI5MDIwODc4NTEsMzIwMjQzNzA0NiwyOTY4MDExNDUzLDM5MzYyOTEyODQsMzgzNTAzNjg5NSw0MTM2NDQwNzcwLDQxNjk0MDgyMDEsMzUzNTQ4NjQ1NiwzNzAyNjY1NDU5LDM0NjcxOTIzMDIsMzIzMTcyMjIxMywyMDUxNTE4NzgwLDE5NTEzMTcwNDcsMTcxNjg5MDQxMCwxNzUwOTAyMzA1LDExMTM4MTgzODQsMTI4MjA1MDA3NSwxNTg0NTA0NTgyLDEzNTAwNzg5ODksMTY4ODEwODUyLDY3NTU2NDYzLDM3MTA0OTMzMCw0MDQwMTY3NjEsODQxNzM5NTkyLDEwMDg5MTg1OTUsNzc1NTUwODE0LDU0MDA4MDcyNSwzOTY5NTYyMzY5LDM4MDEzMzIyMzQsNDAzNTQ4OTA0Nyw0MjY5OTA3OTk2LDM1NjkyNTUyMTMsMzY2OTQ2MjU2NiwzMzY2NzU0NjE5LDMzMzI3NDAxNDQsMjYzMTA2NTQzMywyNDYzODc5NzYyLDIxNjAxMTcwNzEsMjM5NTU4ODY3NiwyNzY3NjQ1NTU3LDI4Njg4OTc0MDYsMzEwMjAxMTc0NywzMDY5MDQ5OTYwLDIwMjAwODQ5NywzMzc3ODM2MiwyNzAwNDA0ODcsNTA0NDU5NDM2LDg3NTQ1MTI5Myw5NzU2NTg2NDYsNjc1MDM5NjI3LDY0MTAyNTE1MiwyMDg0NzA0MjMzLDE5MTc1MTg1NjIsMTYxNTg2MTI0NywxODUxMzMyODUyLDExNDc1NTA2NjEsMTI0ODgwMjUxMCwxNDg0MDA1ODQzLDE0NTEwNDQwNTYsOTMzMzAxMzcwLDk2NzMxMTcyOSw3MzMxNTY5NzIsNjMyOTUzNzAzLDI2MDM4ODk1MCwyNTk2NTkxNywzMjg2NzE4MDgsNDk2OTA2MDU5LDEyMDY0Nzc4NTgsMTIzOTQ0Mzc1MywxNTQzMjA4NTAwLDE0NDE5NTI1NzUsMjE0NDE2MTgwNiwxOTA4Njk0Mjc3LDE2NzU1Nzc4ODAsMTg0Mjc1OTQ0MywzNjEwMzY5MjI2LDM2NDQzNzk1ODUsMzQwODExOTUxNiwzMzA3OTE2MjQ3LDQwMTExOTA1MDIsMzc3Njc2NzQ2OSw0MDc3Mzg0NDMyLDQyNDU2MTg2ODMsMjgwOTc3MTE1NCwyODQyNzM3MDQ5LDMxNDQzOTY0MjAsMzA0MzE0MDQ5NSwyNjczNzA1MTUwLDI0MzgyMzc2MjEsMjIwMzAzMjIzMiwyMzcwMjEzNzk1XTt2YXIgVTI9WzAsMTg1NDY5MTk3LDM3MDkzODM5NCw0ODc3MjU4NDcsNzQxODc2Nzg4LDY1Nzg2MTk0NSw5NzU0NTE2OTQsODI0ODUyMjU5LDE0ODM3NTM1NzYsMTQwMDc4MzIwNSwxMzE1NzIzODkwLDExNjQwNzE4MDcsMTk1MDkwMzM4OCwyMTM1MzE5ODg5LDE2NDk3MDQ1MTgsMTc2NzUzNjQ1OSwyOTY3NTA3MTUyLDMxNTI5NzYzNDksMjgwMTU2NjQxMCwyOTE4MzUzODYzLDI2MzE0NDc3ODAsMjU0NzQzMjkzNywyMzI4MTQzNjE0LDIxNzc1NDQxNzksMzkwMTgwNjc3NiwzODE4ODM2NDA1LDQyNzA2Mzk3NzgsNDExODk4NzY5NSwzMjk5NDA5MDM2LDM0ODM4MjU1MzcsMzUzNTA3MjkxOCwzNjUyOTA0ODU5LDIwNzc5NjUyNDMsMTg5MzAyMDM0MiwxODQxNzY4ODY1LDE3MjQ0NTcxMzIsMTQ3NDUwMjU0MywxNTU5MDQxNjY2LDExMDcyMzQxOTcsMTI1NzMwOTMzNiw1OTg0Mzg4NjcsNjgxOTMzNTM0LDkwMTIxMDU2OSwxMDUyMzM4MzcyLDI2MTMxNDUzNSw3NzQyMjMxNCw0Mjg4MTk5NjUsMzEwNDYzNzI4LDM0MDk2ODUzNTUsMzIyNDc0MDQ1NCwzNzEwMzY4MTEzLDM1OTMwNTYzODAsMzg3NTc3MDIwNywzOTYwMzA5MzMwLDQwNDUzODA5MzMsNDE5NTQ1NjA3MiwyNDcxMjI0MDY3LDI1NTQ3MTg3MzQsMjIzNzEzMzA4MSwyMzg4MjYwODg0LDMyMTIwMzU4OTUsMzAyODE0MzY3NCwyODQyNjc4NTczLDI3MjQzMjIzMzYsNDEzODU2MzE4MSw0MjU1MzUwNjI0LDM3Njk3MjE5NzUsMzk1NTE5MTE2MiwzNjY3MjE5MDMzLDM1MTY2MTk2MDQsMzQzMTU0Njk0NywzMzQ3NTMyMTEwLDI5MzM3MzQ5MTcsMjc4MjA4MjgyNCwzMDk5NjY3NDg3LDMwMTY2OTcxMDYsMjE5NjA1MjUyOSwyMzEzODg0NDc2LDI0OTkzNDg1MjMsMjY4Mzc2NTAzMCwxMTc5NTEwNDYxLDEyOTYyOTc5MDQsMTM0NzU0ODMyNywxNTMzMDE3NTE0LDE3ODYxMDI0MDksMTYzNTUwMjk4MCwyMDg3MzA5NDU5LDIwMDMyOTQ2MjIsNTA3MzU4OTMzLDM1NTcwNjg0MCwxMzY0Mjg3NTEsNTM0NTgzNzAsODM5MjI0MDMzLDk1NzA1NTk4MCw2MDU2NTczMzksNzkwMDczODQ2LDIzNzMzNDA2MzAsMjI1NjAyODg5MSwyNjA3NDM5ODIwLDI0MjI0OTQ5MTMsMjcwNjI3MDY5MCwyODU2MzQ1ODM5LDMwNzU2MzYyMTYsMzE2MDE3NTM0OSwzNTczOTQxNjk0LDM3MjUwNjk0OTEsMzI3MzI2NzEwOCwzMzU2NzYxNzY5LDQxODE1OTg2MDIsNDA2MzI0MjM3NSw0MDExOTk2MDQ4LDM4MjgxMDM4MzcsMTAzMzI5NzE1OCw5MTU5ODU0MTksNzMwNTE3Mjc2LDU0NTU3MjM2OSwyOTY2Nzk3MzAsNDQ2NzU0ODc5LDEyOTE2NjEyMCwyMTM3MDUyNTMsMTcwOTYxMDM1MCwxODYwNzM4MTQ3LDE5NDU3OTg1MTYsMjAyOTI5MzE3NywxMjM5MzMxMTYyLDExMjA5NzQ5MzUsMTYwNjU5MTI5NiwxNDIyNjk5MDg1LDQxNDgyOTI4MjYsNDIzMzA5NDYxNSwzNzgxMDMzNjY0LDM5MzEzNzE0NjksMzY4MjE5MTU5OCwzNDk3NTA5MzQ3LDM0NDYwMDQ0NjgsMzMyODk1NTM4NSwyOTM5MjY2MjI2LDI3NTU2MzY2NzEsMzEwNjc4MDg0MCwyOTg4Njg3MjY5LDIxOTg0MzgwMjIsMjI4MjE5NTMzOSwyNTAxMjE4OTcyLDI2NTI2MDk0MjUsMTIwMTc2NTM4NiwxMjg2NTY3MTc1LDEzNzEzNjg5NzYsMTUyMTcwNjc4MSwxODA1MjExNzEwLDE2MjA1Mjk0NTksMjEwNTg4NzI2OCwxOTg4ODM4MTg1LDUzMzgwNDEzMCwzNTAxNzQ1NzUsMTY0NDM5NjcyLDQ2MzQ2MTAxLDg3MDkxMjA4Niw5NTQ2Njk0MDMsNjM2ODEzOTAwLDc4ODIwNDM1MywyMzU4OTU3OTIxLDIyNzQ2ODA0MjgsMjU5MjUyMzY0MywyNDQxNjYxNTU4LDI2OTUwMzM2ODUsMjg4MDI0MDIxNiwzMDY1OTYyODMxLDMxODI0ODc2MTgsMzU3MjE0NTkyOSwzNzU2Mjk5NzgwLDMyNzA5Mzc4NzUsMzM4ODUwNzE2Niw0MTc0NTYwMDYxLDQwOTEzMjcwMjQsNDAwNjUyMTEyNywzODU0NjA2Mzc4LDEwMTQ2NDY3MDUsOTMwMzY5MjEyLDcxMTM0OTY3NSw1NjA0ODc1OTAsMjcyNzg2MzA5LDQ1Nzk5Mjg0MCwxMDY4NTI3NjcsMjIzMzc3NTU0LDE2NzgzODEwMTcsMTg2MjUzNDg2OCwxOTE0MDUyMDM1LDIwMzE2MjEzMjYsMTIxMTI0NzU5NywxMTI4MDE0NTYwLDE1ODAwODc3OTksMTQyODE3MzA1MCwzMjI4MzMxOSwxODI2MjExMTQsNDAxNjM5NTk3LDQ4NjQ0MTM3Niw3Njg5MTcxMjMsNjUxODY4MDQ2LDEwMDMwMDcxMjksODE4MzI0ODg0LDE1MDM0NDk4MjMsMTM4NTM1NjI0MiwxMzMzODM4MDIxLDExNTAyMDg0NTYsMTk3Mzc0NTM4NywyMTI1MTM1ODQ2LDE2NzMwNjE2MTcsMTc1NjgxODk0MCwyOTcwMzU2MzI3LDMxMjA2OTQxMjIsMjgwMjg0OTkxNywyODg3NjUxNjk2LDI2Mzc0NDI2NDMsMjUyMDM5MzU2NiwyMzM0NjY5ODk3LDIxNDk5ODc2NTIsMzkxNzIzNDcwMywzNzk5MTQxMTIyLDQyODQ1MDIwMzcsNDEwMDg3MjQ3MiwzMzA5NTk0MTcxLDM0NjA5ODQ2MzAsMzU0NTc4OTQ3MywzNjI5NTQ2Nzk2LDIwNTA0NjYwNjAsMTg5OTYwMzk2OSwxODE0ODAzMjIyLDE3MzA1MjU3MjMsMTQ0Mzg1NzcyMCwxNTYwMzgyNTE3LDEwNzUwMjU2OTgsMTI2MDIzMjIzOSw1NzUxMzgxNDgsNjkyNzA3NDMzLDg3ODQ0MzM5MCwxMDYyNTk3MjM1LDI0MzI1NjY1Niw5MTM0MTkxNyw0MDkxOTg0MTAsMzI1OTY1MzgzLDM0MDMxMDA2MzYsMzI1MjIzODU0NSwzNzA0MzAwNDg2LDM2MjAwMjI5ODcsMzg3NDQyODM5MiwzOTkwOTUzMTg5LDQwNDI0NTkxMjIsNDIyNzY2NTY2MywyNDYwNDQ5MjA0LDI1NzgwMTg0ODksMjIyNjg3NTMxMCwyNDExMDI5MTU1LDMxOTgxMTUyMDAsMzA0NjIwMDQ2MSwyODI3MTc3ODgyLDI3NDM5NDQ4NTVdO3ZhciBVMz1bMCwyMTg4MjgyOTcsNDM3NjU2NTk0LDM4Nzc4MTE0Nyw4NzUzMTMxODgsOTU4ODcxMDg1LDc3NTU2MjI5NCw1OTA0MjQ2MzksMTc1MDYyNjM3NiwxNjk5OTcwNjI1LDE5MTc3NDIxNzAsMjEzNTI1MzU4NywxNTUxMTI0NTg4LDEzNjcyOTU1ODksMTE4MDg0OTI3OCwxMjY1MTk1NjM5LDM1MDEyNTI3NTIsMzcyMDA4MTA0OSwzMzk5OTQxMjUwLDMzNTAwNjU4MDMsMzgzNTQ4NDM0MCwzOTE5MDQyMjM3LDQyNzA1MDcxNzQsNDA4NTM2OTUxOSwzMTAyMjQ5MTc2LDMwNTE1OTM0MjUsMjczNDU5MTE3OCwyOTUyMTAyNTk1LDIzNjE2OTg1NTYsMjE3Nzg2OTU1NywyNTMwMzkxMjc4LDI2MTQ3Mzc2MzksMzE0NTQ1NjQ0MywzMDYwODQ3OTIyLDI3MDgzMjYxODUsMjg5MjQxNzMxMiwyNDA0OTAxNjYzLDIxODcxMjgwODYsMjUwNDEzMDMxNywyNTU1MDQ4MTk2LDM1NDIzMzAyMjcsMzcyNzIwNTc1NCwzMzc1NzQwNzY5LDMyOTI0NDUwMzIsMzg3NjU1NzY1NSwzOTI2MTcwOTc0LDQyNDYzMTA3MjUsNDAyNzc0NDU4OCwxODA4NDgxMTk1LDE3MjM4NzI2NzQsMTkxMDMxOTAzMywyMDk0NDEwMTYwLDE2MDg5NzUyNDcsMTM5MTIwMTY3MCwxMTczNDMwMTczLDEyMjQzNDgwNTIsNTk5ODQ4NjcsMjQ0ODYwMzk0LDQyODE2OTIwMSwzNDQ4NzM0NjQsOTM1MjkzODk1LDk4NDkwNzIxNCw3NjYwNzg5MzMsNTQ3NTEyNzk2LDE4NDQ4ODI4MDYsMTYyNzIzNTE5OSwyMDExMjE0MTgwLDIwNjIyNzAzMTcsMTUwNzQ5NzI5OCwxNDIzMDIyOTM5LDExMzc0Nzc5NTIsMTMyMTY5OTE0NSw5NTM0NTk4MiwxNDUwODUyMzksNTMyMjAxNzcyLDMxMzc3Mzg2MSw4MzA2NjE5MTQsMTAxNTY3MTU3MSw3MzExODMzNjgsNjQ4MDE3NjY1LDMxNzU1MDEyODYsMjk1Nzg1MzY3OSwyODA3MDU4OTMyLDI4NTgxMTUwNjksMjMwNTQ1NTU1NCwyMjIwOTgxMTk1LDI0NzQ0MDQzMDQsMjY1ODYyNTQ5NywzNTc1NTI4ODc4LDM2MjUyNjgxMzUsMzQ3MzQxNjYzNiwzMjU0OTg4NzI1LDM3NzgxNTE4MTgsMzk2MzE2MTQ3NSw0MjEzNDQ3MDY0LDQxMzAyODEzNjEsMzU5OTU5NTA4NSwzNjgzMDIyOTE2LDM0MzI3MzczNzUsMzI0NzQ2NTU1OCwzODAyMjIyMTg1LDQwMjA5MTIyMjQsNDE3Mjc2Mzc3MSw0MTIyNzYyMzU0LDMyMDE2MzE3NDksMzAxNzY3MjcxNiwyNzY0MjQ5NjIzLDI4NDg0NjE4NTQsMjMzMTU5MDE3NywyMjgwNzk2MjAwLDI0MzE1OTA5NjMsMjY0ODk3NjQ0MiwxMDQ2OTk2MTMsMTg4MTI3NDQ0LDQ3MjYxNTYzMSwyODczNDM4MTQsODQwMDE5NzA1LDEwNTg3MDk3NDQsNjcxNTkzMTk1LDYyMTU5MTc3OCwxODUyMTcxOTI1LDE2NjgyMTI4OTIsMTk1Mzc1NzgzMSwyMDM3OTcwMDYyLDE1MTQ3OTA1NzcsMTQ2Mzk5NjYwMCwxMDgwMDE3NTcxLDEyOTc0MDMwNTAsMzY3MzYzNzM1NiwzNjIzNjM2OTY1LDMyMzU5OTUxMzQsMzQ1NDY4NjE5OSw0MDA3MzYwOTY4LDM4MjIwOTAxNzcsNDEwNzEwMTY1OCw0MTkwNTMwNTE1LDI5OTc4MjU5NTYsMzIxNTIxMjQ2MSwyODMwNzA4MTUwLDI3Nzk5MTUxOTksMjI1NjczNDU5MiwyMzQwOTQ3ODQ5LDI2MjcwMTYwODIsMjQ0MzA1ODA3NSwxNzI0NjY1NTYsMTIyNDY2MTY1LDI3Mzc5MjM2Niw0OTI0ODM0MzEsMTA0NzIzOWUzLDg2MTk2ODIwOSw2MTIyMDU4OTgsNjk1NjM0NzU1LDE2NDYyNTIzNDAsMTg2MzYzODg0NSwyMDEzOTA4MjYyLDE5NjMxMTUzMTEsMTQ0NjI0MjU3NiwxNTMwNDU1ODMzLDEyNzc1NTU5NzAsMTA5MzU5Nzk2MywxNjM2NjA0NjMxLDE4MjA4MjQ3OTgsMjA3MzcyNDYxMywxOTg5MjQ5MjI4LDE0MzY1OTA4MzUsMTQ4NzY0NTk0NiwxMzM3Mzc2NDgxLDExMTk3Mjc4NDgsMTY0OTQ4NjM5LDgxNzgxOTEwLDMzMTU0NDIwNSw1MTY1NTI4MzYsMTAzOTcxNzA1MSw4MjEyODgxMTQsNjY5OTYxODk3LDcxOTcwMDEyOCwyOTczNTMwNjk1LDMxNTc3NTA4NjIsMjg3MTY4MjY0NSwyNzg3MjA3MjYwLDIyMzI0MzUyOTksMjI4MzQ5MDQxMCwyNjY3OTk0NzM3LDI0NTAzNDYxMDQsMzY0NzIxMjA0NywzNTY0MDQ1MzE4LDMyNzkwMzM4ODUsMzQ2NDA0MjUxNiwzOTgwOTMxNjI3LDM3NjI1MDI2OTAsNDE1MDE0NDU2OSw0MTk5ODgyODAwLDMwNzAzNTY2MzQsMzEyMTI3NTUzOSwyOTA0MDI3MjcyLDI2ODYyNTQ3MjEsMjIwMDgxODg3OCwyMzg0OTExMDMxLDI1NzA4MzIwNDQsMjQ4NjIyNDU0OSwzNzQ3MTkyMDE4LDM1Mjg2MjY5MDcsMzMxMDMyMTg1NiwzMzU5OTM2MjAxLDM5NTAzNTU3MDIsMzg2NzA2MDk5MSw0MDQ5ODQ0NDUyLDQyMzQ3MjEwMDUsMTczOTY1NjIwMiwxNzkwNTc1MTA3LDIxMDgxMDA2MzIsMTg5MDMyODA4MSwxNDAyODExNDM4LDE1ODY5MDM1OTEsMTIzMzg1NjU3MiwxMTQ5MjQ5MDc3LDI2Njk1OTkzOCw0ODM5NDgyNywzNjkwNTc4NzIsNDE4NjcyMjE3LDEwMDI3ODM4NDYsOTE5NDg5MTM1LDU2NzQ5ODg2OCw3NTIzNzU0MjEsMjA5MzM2MjI1LDI0MTk3NTQ0LDM3NjE4NzgyNyw0NTk3NDQ2OTgsOTQ1MTY0MTY1LDg5NTI4NzY5Miw1NzQ2MjQ2NjMsNzkzNDUxOTM0LDE2Nzk5NjgyMzMsMTc2NDMxMzU2OCwyMTE3MzYwNjM1LDE5MzM1MzA2MTAsMTM0MzEyNzUwMSwxNTYwNjM3ODkyLDEyNDMxMTI0MTUsMTE5MjQ1NTYzOCwzNzA0MjgwODgxLDM1MTkxNDIyMDAsMzMzNjM1ODY5MSwzNDE5OTE1NTYyLDM5MDc0NDg1OTcsMzg1NzU3MjEyNCw0MDc1ODc3MTI3LDQyOTQ3MDQzOTgsMzAyOTUxMDAwOSwzMTEzODU1MzQ0LDI5Mjc5MzQzMTUsMjc0NDEwNDI5MCwyMTU5OTc2Mjg1LDIzNzc0ODY2NzYsMjU5NDczNDkyNywyNTQ0MDc4MTUwXTt2YXIgVTQ9WzAsMTUxODQ5NzQyLDMwMzY5OTQ4NCw0NTQ0OTk2MDIsNjA3Mzk4OTY4LDc1ODcyMDMxMCw5MDg5OTkyMDQsMTA1OTI3MDk1NCwxMjE0Nzk3OTM2LDEwOTcxNTk1NTAsMTUxNzQ0MDYyMCwxNDAwODQ5NzYyLDE4MTc5OTg0MDgsMTY5OTgzOTgxNCwyMTE4NTQxOTA4LDIwMDE0MzA4NzQsMjQyOTU5NTg3MiwyNTgxNDQ1NjE0LDIxOTQzMTkxMDAsMjM0NTExOTIxOCwzMDM0ODgxMjQwLDMxODYyMDI1ODIsMjgwMTY5OTUyNCwyOTUxOTcxMjc0LDM2MzU5OTY4MTYsMzUxODM1ODQzMCwzMzk5Njc5NjI4LDMyODMwODg3NzAsNDIzNzA4MzgxNiw0MTE4OTI1MjIyLDQwMDI4NjE3NDgsMzg4NTc1MDcxNCwxMDAyMTQyNjgzLDg1MDgxNzIzNyw2OTg0NDUyNTUsNTQ4MTY5NDE3LDUyOTQ4Nzg0MywzNzc2NDIyMjEsMjI3ODg1NTY3LDc3MDg5NTIxLDE5NDMyMTcwNjcsMjA2MTM3OTc0OSwxNjQwNTc2NDM5LDE3NTc2OTE1NzcsMTQ3NDc2MDU5NSwxNTkyMzk0OTA5LDExNzQyMTUwNTUsMTI5MDgwMTc5MywyODc1OTY4MzE1LDI3MjQ2NDI4NjksMzExMTI0NzE0MywyOTYwOTcxMzA1LDI0MDU0MjY5NDcsMjI1MzU4MTMyNSwyNjM4NjA2NjIzLDI0ODc4MTA1NzcsMzgwODY2MjM0NywzOTI2ODI1MDI5LDQwNDQ5ODE1OTEsNDE2MjA5NjcyOSwzMzQyMzE5NDc1LDM0NTk5NTM3ODksMzU3NjUzOTUwMywzNjkzMTI2MjQxLDE5ODY5MTgwNjEsMjEzNzA2MjgxOSwxNjg1NTc3OTA1LDE4MzY3NzIyODcsMTM4MTYyMDM3MywxNTMyMjg1MzM5LDEwNzgxODUwOTcsMTIyOTg5OTY1NSwxMDQwNTU5ODM3LDkyMzMxMzYxOSw3NDAyNzY0MTcsNjIxOTgyNjcxLDQzOTQ1MjM4OSwzMjI3MzQ1NzEsMTM3MDczOTEzLDE5MzA4NTM1LDM4NzExNjM5ODEsNDAyMTMwODczOSw0MTA0NjA1Nzc3LDQyNTU4MDAxNTksMzI2Mzc4NTU4OSwzNDE0NDUwNTU1LDM0OTkzMjY1NjksMzY1MTA0MTEyNywyOTMzMjAyNDkzLDI4MTU5NTYyNzUsMzE2NzY4NDY0MSwzMDQ5MzkwODk1LDIzMzAwMTQyMTMsMjIxMzI5NjM5NSwyNTY2NTk1NjA5LDI0NDg4MzAyMzEsMTMwNTkwNjU1MCwxMTU1MjM3NDk2LDE2MDcyNDQ2NTAsMTQ1NTUyNTk4OCwxNzc2NDYwMTEwLDE2MjYzMTk0MjQsMjA3OTg5NzQyNiwxOTI4NzA3MTY0LDk2MzkyNDU0LDIxMzExNDM3NiwzOTY2NzM4MTgsNTE0NDQzMjg0LDU2Mjc1NTkwMiw2Nzk5OThlMyw4NjUxMzY0MTgsOTgzNDI2MDkyLDM3MDgxNzM3MTgsMzU1NzUwNDY2NCwzNDc0NzI5ODY2LDMzMjMwMTEyMDQsNDE4MDgwODExMCw0MDMwNjY3NDI0LDM5NDUyNjkxNzAsMzc5NDA3ODkwOCwyNTA3MDQwMjMwLDI2MjM3NjIxNTIsMjI3MjU1NjAyNiwyMzkwMzI1NDkyLDI5NzU0ODQzODIsMzA5MjcyNjQ4MCwyNzM4OTA1MDI2LDI4NTcxOTQ3MDAsMzk3Mzc3MzEyMSwzODU2MTM3Mjk1LDQyNzQwNTM0NjksNDE1NzQ2NzIxOSwzMzcxMDk2OTUzLDMyNTI5MzI3MjcsMzY3MzQ3NjQ1MywzNTU2MzYxODM1LDI3NjMxNzM2ODEsMjkxNTAxNzc5MSwzMDY0NTEwNzY1LDMyMTUzMDcyOTksMjE1NjI5OTAxNywyMzA3NjIyOTE5LDI0NTk3MzUzMTcsMjYxMDAxMTY3NSwyMDgxMDQ4NDgxLDE5NjM0MTI2NTUsMTg0NjU2MzI2MSwxNzI5OTc3MDExLDE0ODA0ODU3ODUsMTM2MjMyMTU1OSwxMjQzOTA1NDEzLDExMjY3OTA3OTUsODc4ODQ1OTA1LDEwMzA2OTAwMTUsNjQ1NDAxMDM3LDc5NjE5NzU3MSwyNzQwODQ4NDEsNDI1NDA4NzQzLDM4NTQ0ODg1LDE4ODgyMTI0MywzNjEzNDk0NDI2LDM3MzE2NTQ1NDgsMzMxMzIxMjAzOCwzNDMwMzIyNTY4LDQwODI0NzUxNzAsNDIwMDExNTExNiwzNzgwMDk3NzI2LDM4OTY2ODgwNDgsMjY2ODIyMTY3NCwyNTE2OTAxODYwLDIzNjY4ODI1NTAsMjIxNjYxMDI5NiwzMTQxNDAwNzg2LDI5ODk1NTI2MDQsMjgzNzk2NjU0MiwyNjg3MTY1ODg4LDEyMDI3OTc2OTAsMTMyMDk1NzgxMiwxNDM3MjgwODcwLDE1NTQzOTE0MDAsMTY2OTY2NDgzNCwxNzg3MzA0NzgwLDE5MDYyNDcyNjIsMjAyMjgzNzU4NCwyNjU5MDUxNjIsMTE0NTg1MzQ4LDQ5OTM0Nzk5MCwzNDkwNzU3MzYsNzM2OTcwODAyLDU4NTEyMjYyMCw5NzI1MTI4MTQsODIxNzEyMTYwLDI1OTU2ODQ4NDQsMjQ3ODQ0MzIzNCwyMjkzMDQ1MjMyLDIxNzQ3NTQwNDYsMzE5NjI2Nzk4OCwzMDc5NTQ2NTg2LDI4OTU3MjM0NjQsMjc3Nzk1MjQ1NCwzNTM3ODUyODI4LDM2ODc5OTQwMDIsMzIzNDE1NjQxNiwzMzg1MzQ1MTY2LDQxNDI2MjYyMTIsNDI5MzI5NTc4NiwzODQxMDI0OTUyLDM5OTI3NDIwNzAsMTc0NTY3NjkyLDU3MzI2MDgyLDQxMDg4Nzk1MiwyOTI1OTY3NjYsNzc3MjMxNjY4LDY2MDUxMDI2NiwxMDExNDUyNzEyLDg5MzY4MTcwMiwxMTA4MzM5MDY4LDEyNTg0ODAyNDIsMTM0MzYxODkxMiwxNDk0ODA3NjYyLDE3MTUxOTMxNTYsMTg2NTg2MjczMCwxOTQ4MzczODQ4LDIxMDAwOTA5NjYsMjcwMTk0OTQ5NSwyODE4NjY2ODA5LDMwMDQ1OTExNDcsMzEyMjM1ODA1MywyMjM1MDYxNzc1LDIzNTIzMDc0NTcsMjUzNTYwNDI0MywyNjUzODk5NTQ5LDM5MTU2NTM3MDMsMzc2NDk4ODIzMyw0MjE5MzUyMTU1LDQwNjc2MzkxMjUsMzQ0NDU3NTg3MSwzMjk0NDMwNTc3LDM3NDYxNzUwNzUsMzU5NDk4MjI1Myw4MzY1NTM0MzEsOTUzMjcwNzQ1LDYwMDIzNTIxMSw3MTgwMDIxMTcsMzY3NTg1MDA3LDQ4NDgzMDY4OSwxMzMzNjE5MDcsMjUxNjU3MjEzLDIwNDE4NzcxNTksMTg5MTIxMTY4OSwxODA2NTk5MzU1LDE2NTQ4ODYzMjUsMTU2ODcxODQ5NSwxNDE4NTczMjAxLDEzMzU1MzU3NDcsMTE4NDM0MjkyNV07ZnVuY3Rpb24gY29udmVydFRvSW50MzIoYnl0ZXMpe3ZhciByZXN1bHQ9W107Zm9yKHZhciBpPTA7aTxieXRlcy5sZW5ndGg7aSs9NCl7cmVzdWx0LnB1c2goYnl0ZXNbaV08PDI0fGJ5dGVzW2krMV08PDE2fGJ5dGVzW2krMl08PDh8Ynl0ZXNbaSszXSl9cmV0dXJuIHJlc3VsdH12YXIgQUVTPWZ1bmN0aW9uKGtleSl7aWYoISh0aGlzIGluc3RhbmNlb2YgQUVTKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsImtleSIse3ZhbHVlOmNvZXJjZUFycmF5KGtleSx0cnVlKX0pO3RoaXMuX3ByZXBhcmUoKX07QUVTLnByb3RvdHlwZS5fcHJlcGFyZT1mdW5jdGlvbigpe3ZhciByb3VuZHM9bnVtYmVyT2ZSb3VuZHNbdGhpcy5rZXkubGVuZ3RoXTtpZihyb3VuZHM9PW51bGwpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBrZXkgc2l6ZSAobXVzdCBiZSAxNiwgMjQgb3IgMzIgYnl0ZXMpIil9dGhpcy5fS2U9W107dGhpcy5fS2Q9W107Zm9yKHZhciBpPTA7aTw9cm91bmRzO2krKyl7dGhpcy5fS2UucHVzaChbMCwwLDAsMF0pO3RoaXMuX0tkLnB1c2goWzAsMCwwLDBdKX12YXIgcm91bmRLZXlDb3VudD0ocm91bmRzKzEpKjQ7dmFyIEtDPXRoaXMua2V5Lmxlbmd0aC80O3ZhciB0az1jb252ZXJ0VG9JbnQzMih0aGlzLmtleSk7dmFyIGluZGV4O2Zvcih2YXIgaT0wO2k8S0M7aSsrKXtpbmRleD1pPj4yO3RoaXMuX0tlW2luZGV4XVtpJTRdPXRrW2ldO3RoaXMuX0tkW3JvdW5kcy1pbmRleF1baSU0XT10a1tpXX12YXIgcmNvbnBvaW50ZXI9MDt2YXIgdD1LQyx0dDt3aGlsZSh0PHJvdW5kS2V5Q291bnQpe3R0PXRrW0tDLTFdO3RrWzBdXj1TW3R0Pj4xNiYyNTVdPDwyNF5TW3R0Pj44JjI1NV08PDE2XlNbdHQmMjU1XTw8OF5TW3R0Pj4yNCYyNTVdXnJjb25bcmNvbnBvaW50ZXJdPDwyNDtyY29ucG9pbnRlcis9MTtpZihLQyE9OCl7Zm9yKHZhciBpPTE7aTxLQztpKyspe3RrW2ldXj10a1tpLTFdfX1lbHNle2Zvcih2YXIgaT0xO2k8S0MvMjtpKyspe3RrW2ldXj10a1tpLTFdfXR0PXRrW0tDLzItMV07dGtbS0MvMl1ePVNbdHQmMjU1XV5TW3R0Pj44JjI1NV08PDheU1t0dD4+MTYmMjU1XTw8MTZeU1t0dD4+MjQmMjU1XTw8MjQ7Zm9yKHZhciBpPUtDLzIrMTtpPEtDO2krKyl7dGtbaV1ePXRrW2ktMV19fXZhciBpPTAscixjO3doaWxlKGk8S0MmJnQ8cm91bmRLZXlDb3VudCl7cj10Pj4yO2M9dCU0O3RoaXMuX0tlW3JdW2NdPXRrW2ldO3RoaXMuX0tkW3JvdW5kcy1yXVtjXT10a1tpKytdO3QrK319Zm9yKHZhciByPTE7cjxyb3VuZHM7cisrKXtmb3IodmFyIGM9MDtjPDQ7YysrKXt0dD10aGlzLl9LZFtyXVtjXTt0aGlzLl9LZFtyXVtjXT1VMVt0dD4+MjQmMjU1XV5VMlt0dD4+MTYmMjU1XV5VM1t0dD4+OCYyNTVdXlU0W3R0JjI1NV19fX07QUVTLnByb3RvdHlwZS5lbmNyeXB0PWZ1bmN0aW9uKHBsYWludGV4dCl7aWYocGxhaW50ZXh0Lmxlbmd0aCE9MTYpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBwbGFpbnRleHQgc2l6ZSAobXVzdCBiZSAxNiBieXRlcykiKX12YXIgcm91bmRzPXRoaXMuX0tlLmxlbmd0aC0xO3ZhciBhPVswLDAsMCwwXTt2YXIgdD1jb252ZXJ0VG9JbnQzMihwbGFpbnRleHQpO2Zvcih2YXIgaT0wO2k8NDtpKyspe3RbaV1ePXRoaXMuX0tlWzBdW2ldfWZvcih2YXIgcj0xO3I8cm91bmRzO3IrKyl7Zm9yKHZhciBpPTA7aTw0O2krKyl7YVtpXT1UMVt0W2ldPj4yNCYyNTVdXlQyW3RbKGkrMSklNF0+PjE2JjI1NV1eVDNbdFsoaSsyKSU0XT4+OCYyNTVdXlQ0W3RbKGkrMyklNF0mMjU1XV50aGlzLl9LZVtyXVtpXX10PWEuc2xpY2UoKX12YXIgcmVzdWx0PWNyZWF0ZUFycmF5KDE2KSx0dDtmb3IodmFyIGk9MDtpPDQ7aSsrKXt0dD10aGlzLl9LZVtyb3VuZHNdW2ldO3Jlc3VsdFs0KmldPShTW3RbaV0+PjI0JjI1NV1edHQ+PjI0KSYyNTU7cmVzdWx0WzQqaSsxXT0oU1t0WyhpKzEpJTRdPj4xNiYyNTVdXnR0Pj4xNikmMjU1O3Jlc3VsdFs0KmkrMl09KFNbdFsoaSsyKSU0XT4+OCYyNTVdXnR0Pj44KSYyNTU7cmVzdWx0WzQqaSszXT0oU1t0WyhpKzMpJTRdJjI1NV1edHQpJjI1NX1yZXR1cm4gcmVzdWx0fTtBRVMucHJvdG90eXBlLmRlY3J5cHQ9ZnVuY3Rpb24oY2lwaGVydGV4dCl7aWYoY2lwaGVydGV4dC5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIDE2IGJ5dGVzKSIpfXZhciByb3VuZHM9dGhpcy5fS2QubGVuZ3RoLTE7dmFyIGE9WzAsMCwwLDBdO3ZhciB0PWNvbnZlcnRUb0ludDMyKGNpcGhlcnRleHQpO2Zvcih2YXIgaT0wO2k8NDtpKyspe3RbaV1ePXRoaXMuX0tkWzBdW2ldfWZvcih2YXIgcj0xO3I8cm91bmRzO3IrKyl7Zm9yKHZhciBpPTA7aTw0O2krKyl7YVtpXT1UNVt0W2ldPj4yNCYyNTVdXlQ2W3RbKGkrMyklNF0+PjE2JjI1NV1eVDdbdFsoaSsyKSU0XT4+OCYyNTVdXlQ4W3RbKGkrMSklNF0mMjU1XV50aGlzLl9LZFtyXVtpXX10PWEuc2xpY2UoKX12YXIgcmVzdWx0PWNyZWF0ZUFycmF5KDE2KSx0dDtmb3IodmFyIGk9MDtpPDQ7aSsrKXt0dD10aGlzLl9LZFtyb3VuZHNdW2ldO3Jlc3VsdFs0KmldPShTaVt0W2ldPj4yNCYyNTVdXnR0Pj4yNCkmMjU1O3Jlc3VsdFs0KmkrMV09KFNpW3RbKGkrMyklNF0+PjE2JjI1NV1edHQ+PjE2KSYyNTU7cmVzdWx0WzQqaSsyXT0oU2lbdFsoaSsyKSU0XT4+OCYyNTVdXnR0Pj44KSYyNTU7cmVzdWx0WzQqaSszXT0oU2lbdFsoaSsxKSU0XSYyNTVdXnR0KSYyNTV9cmV0dXJuIHJlc3VsdH07dmFyIE1vZGVPZk9wZXJhdGlvbkVDQj1mdW5jdGlvbihrZXkpe2lmKCEodGhpcyBpbnN0YW5jZW9mIE1vZGVPZk9wZXJhdGlvbkVDQikpe3Rocm93IEVycm9yKCJBRVMgbXVzdCBiZSBpbnN0YW5pdGF0ZWQgd2l0aCBgbmV3YCIpfXRoaXMuZGVzY3JpcHRpb249IkVsZWN0cm9uaWMgQ29kZSBCbG9jayI7dGhpcy5uYW1lPSJlY2IiO3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbkVDQi5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3BsYWludGV4dD1jb2VyY2VBcnJheShwbGFpbnRleHQpO2lmKHBsYWludGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgcGxhaW50ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIGNpcGhlcnRleHQ9Y3JlYXRlQXJyYXkocGxhaW50ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9MTYpe2NvcHlBcnJheShwbGFpbnRleHQsYmxvY2ssMCxpLGkrMTYpO2Jsb2NrPXRoaXMuX2Flcy5lbmNyeXB0KGJsb2NrKTtjb3B5QXJyYXkoYmxvY2ssY2lwaGVydGV4dCxpKX1yZXR1cm4gY2lwaGVydGV4dH07TW9kZU9mT3BlcmF0aW9uRUNCLnByb3RvdHlwZS5kZWNyeXB0PWZ1bmN0aW9uKGNpcGhlcnRleHQpe2NpcGhlcnRleHQ9Y29lcmNlQXJyYXkoY2lwaGVydGV4dCk7aWYoY2lwaGVydGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIG11bHRpcGxlIG9mIDE2IGJ5dGVzKSIpfXZhciBwbGFpbnRleHQ9Y3JlYXRlQXJyYXkoY2lwaGVydGV4dC5sZW5ndGgpO3ZhciBibG9jaz1jcmVhdGVBcnJheSgxNik7Zm9yKHZhciBpPTA7aTxjaXBoZXJ0ZXh0Lmxlbmd0aDtpKz0xNil7Y29weUFycmF5KGNpcGhlcnRleHQsYmxvY2ssMCxpLGkrMTYpO2Jsb2NrPXRoaXMuX2Flcy5kZWNyeXB0KGJsb2NrKTtjb3B5QXJyYXkoYmxvY2sscGxhaW50ZXh0LGkpfXJldHVybiBwbGFpbnRleHR9O3ZhciBNb2RlT2ZPcGVyYXRpb25DQkM9ZnVuY3Rpb24oa2V5LGl2KXtpZighKHRoaXMgaW5zdGFuY2VvZiBNb2RlT2ZPcGVyYXRpb25DQkMpKXt0aHJvdyBFcnJvcigiQUVTIG11c3QgYmUgaW5zdGFuaXRhdGVkIHdpdGggYG5ld2AiKX10aGlzLmRlc2NyaXB0aW9uPSJDaXBoZXIgQmxvY2sgQ2hhaW5pbmciO3RoaXMubmFtZT0iY2JjIjtpZighaXYpe2l2PWNyZWF0ZUFycmF5KDE2KX1lbHNlIGlmKGl2Lmxlbmd0aCE9MTYpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBpbml0aWFsYXRpb24gdmVjdG9yIHNpemUgKG11c3QgYmUgMTYgYnl0ZXMpIil9dGhpcy5fbGFzdENpcGhlcmJsb2NrPWNvZXJjZUFycmF5KGl2LHRydWUpO3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbkNCQy5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3BsYWludGV4dD1jb2VyY2VBcnJheShwbGFpbnRleHQpO2lmKHBsYWludGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgcGxhaW50ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIGNpcGhlcnRleHQ9Y3JlYXRlQXJyYXkocGxhaW50ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9MTYpe2NvcHlBcnJheShwbGFpbnRleHQsYmxvY2ssMCxpLGkrMTYpO2Zvcih2YXIgaj0wO2o8MTY7aisrKXtibG9ja1tqXV49dGhpcy5fbGFzdENpcGhlcmJsb2NrW2pdfXRoaXMuX2xhc3RDaXBoZXJibG9jaz10aGlzLl9hZXMuZW5jcnlwdChibG9jayk7Y29weUFycmF5KHRoaXMuX2xhc3RDaXBoZXJibG9jayxjaXBoZXJ0ZXh0LGkpfXJldHVybiBjaXBoZXJ0ZXh0fTtNb2RlT2ZPcGVyYXRpb25DQkMucHJvdG90eXBlLmRlY3J5cHQ9ZnVuY3Rpb24oY2lwaGVydGV4dCl7Y2lwaGVydGV4dD1jb2VyY2VBcnJheShjaXBoZXJ0ZXh0KTtpZihjaXBoZXJ0ZXh0Lmxlbmd0aCUxNiE9PTApe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBjaXBoZXJ0ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIHBsYWludGV4dD1jcmVhdGVBcnJheShjaXBoZXJ0ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPGNpcGhlcnRleHQubGVuZ3RoO2krPTE2KXtjb3B5QXJyYXkoY2lwaGVydGV4dCxibG9jaywwLGksaSsxNik7YmxvY2s9dGhpcy5fYWVzLmRlY3J5cHQoYmxvY2spO2Zvcih2YXIgaj0wO2o8MTY7aisrKXtwbGFpbnRleHRbaStqXT1ibG9ja1tqXV50aGlzLl9sYXN0Q2lwaGVyYmxvY2tbal19Y29weUFycmF5KGNpcGhlcnRleHQsdGhpcy5fbGFzdENpcGhlcmJsb2NrLDAsaSxpKzE2KX1yZXR1cm4gcGxhaW50ZXh0fTt2YXIgTW9kZU9mT3BlcmF0aW9uQ0ZCPWZ1bmN0aW9uKGtleSxpdixzZWdtZW50U2l6ZSl7aWYoISh0aGlzIGluc3RhbmNlb2YgTW9kZU9mT3BlcmF0aW9uQ0ZCKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9dGhpcy5kZXNjcmlwdGlvbj0iQ2lwaGVyIEZlZWRiYWNrIjt0aGlzLm5hbWU9ImNmYiI7aWYoIWl2KXtpdj1jcmVhdGVBcnJheSgxNil9ZWxzZSBpZihpdi5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgaW5pdGlhbGF0aW9uIHZlY3RvciBzaXplIChtdXN0IGJlIDE2IHNpemUpIil9aWYoIXNlZ21lbnRTaXplKXtzZWdtZW50U2l6ZT0xfXRoaXMuc2VnbWVudFNpemU9c2VnbWVudFNpemU7dGhpcy5fc2hpZnRSZWdpc3Rlcj1jb2VyY2VBcnJheShpdix0cnVlKTt0aGlzLl9hZXM9bmV3IEFFUyhrZXkpfTtNb2RlT2ZPcGVyYXRpb25DRkIucHJvdG90eXBlLmVuY3J5cHQ9ZnVuY3Rpb24ocGxhaW50ZXh0KXtpZihwbGFpbnRleHQubGVuZ3RoJXRoaXMuc2VnbWVudFNpemUhPTApe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBwbGFpbnRleHQgc2l6ZSAobXVzdCBiZSBzZWdtZW50U2l6ZSBieXRlcykiKX12YXIgZW5jcnlwdGVkPWNvZXJjZUFycmF5KHBsYWludGV4dCx0cnVlKTt2YXIgeG9yU2VnbWVudDtmb3IodmFyIGk9MDtpPGVuY3J5cHRlZC5sZW5ndGg7aSs9dGhpcy5zZWdtZW50U2l6ZSl7eG9yU2VnbWVudD10aGlzLl9hZXMuZW5jcnlwdCh0aGlzLl9zaGlmdFJlZ2lzdGVyKTtmb3IodmFyIGo9MDtqPHRoaXMuc2VnbWVudFNpemU7aisrKXtlbmNyeXB0ZWRbaStqXV49eG9yU2VnbWVudFtqXX1jb3B5QXJyYXkodGhpcy5fc2hpZnRSZWdpc3Rlcix0aGlzLl9zaGlmdFJlZ2lzdGVyLDAsdGhpcy5zZWdtZW50U2l6ZSk7Y29weUFycmF5KGVuY3J5cHRlZCx0aGlzLl9zaGlmdFJlZ2lzdGVyLDE2LXRoaXMuc2VnbWVudFNpemUsaSxpK3RoaXMuc2VnbWVudFNpemUpfXJldHVybiBlbmNyeXB0ZWR9O01vZGVPZk9wZXJhdGlvbkNGQi5wcm90b3R5cGUuZGVjcnlwdD1mdW5jdGlvbihjaXBoZXJ0ZXh0KXtpZihjaXBoZXJ0ZXh0Lmxlbmd0aCV0aGlzLnNlZ21lbnRTaXplIT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIHNlZ21lbnRTaXplIGJ5dGVzKSIpfXZhciBwbGFpbnRleHQ9Y29lcmNlQXJyYXkoY2lwaGVydGV4dCx0cnVlKTt2YXIgeG9yU2VnbWVudDtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9dGhpcy5zZWdtZW50U2l6ZSl7eG9yU2VnbWVudD10aGlzLl9hZXMuZW5jcnlwdCh0aGlzLl9zaGlmdFJlZ2lzdGVyKTtmb3IodmFyIGo9MDtqPHRoaXMuc2VnbWVudFNpemU7aisrKXtwbGFpbnRleHRbaStqXV49eG9yU2VnbWVudFtqXX1jb3B5QXJyYXkodGhpcy5fc2hpZnRSZWdpc3Rlcix0aGlzLl9zaGlmdFJlZ2lzdGVyLDAsdGhpcy5zZWdtZW50U2l6ZSk7Y29weUFycmF5KGNpcGhlcnRleHQsdGhpcy5fc2hpZnRSZWdpc3RlciwxNi10aGlzLnNlZ21lbnRTaXplLGksaSt0aGlzLnNlZ21lbnRTaXplKX1yZXR1cm4gcGxhaW50ZXh0fTt2YXIgTW9kZU9mT3BlcmF0aW9uT0ZCPWZ1bmN0aW9uKGtleSxpdil7aWYoISh0aGlzIGluc3RhbmNlb2YgTW9kZU9mT3BlcmF0aW9uT0ZCKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9dGhpcy5kZXNjcmlwdGlvbj0iT3V0cHV0IEZlZWRiYWNrIjt0aGlzLm5hbWU9Im9mYiI7aWYoIWl2KXtpdj1jcmVhdGVBcnJheSgxNil9ZWxzZSBpZihpdi5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgaW5pdGlhbGF0aW9uIHZlY3RvciBzaXplIChtdXN0IGJlIDE2IGJ5dGVzKSIpfXRoaXMuX2xhc3RQcmVjaXBoZXI9Y29lcmNlQXJyYXkoaXYsdHJ1ZSk7dGhpcy5fbGFzdFByZWNpcGhlckluZGV4PTE2O3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbk9GQi5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3ZhciBlbmNyeXB0ZWQ9Y29lcmNlQXJyYXkocGxhaW50ZXh0LHRydWUpO2Zvcih2YXIgaT0wO2k8ZW5jcnlwdGVkLmxlbmd0aDtpKyspe2lmKHRoaXMuX2xhc3RQcmVjaXBoZXJJbmRleD09PTE2KXt0aGlzLl9sYXN0UHJlY2lwaGVyPXRoaXMuX2Flcy5lbmNyeXB0KHRoaXMuX2xhc3RQcmVjaXBoZXIpO3RoaXMuX2xhc3RQcmVjaXBoZXJJbmRleD0wfWVuY3J5cHRlZFtpXV49dGhpcy5fbGFzdFByZWNpcGhlclt0aGlzLl9sYXN0UHJlY2lwaGVySW5kZXgrK119cmV0dXJuIGVuY3J5cHRlZH07TW9kZU9mT3BlcmF0aW9uT0ZCLnByb3RvdHlwZS5kZWNyeXB0PU1vZGVPZk9wZXJhdGlvbk9GQi5wcm90b3R5cGUuZW5jcnlwdDt2YXIgQ291bnRlcj1mdW5jdGlvbihpbml0aWFsVmFsdWUpe2lmKCEodGhpcyBpbnN0YW5jZW9mIENvdW50ZXIpKXt0aHJvdyBFcnJvcigiQ291bnRlciBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9aWYoaW5pdGlhbFZhbHVlIT09MCYmIWluaXRpYWxWYWx1ZSl7aW5pdGlhbFZhbHVlPTF9aWYodHlwZW9mIGluaXRpYWxWYWx1ZT09PSJudW1iZXIiKXt0aGlzLl9jb3VudGVyPWNyZWF0ZUFycmF5KDE2KTt0aGlzLnNldFZhbHVlKGluaXRpYWxWYWx1ZSl9ZWxzZXt0aGlzLnNldEJ5dGVzKGluaXRpYWxWYWx1ZSl9fTtDb3VudGVyLnByb3RvdHlwZS5zZXRWYWx1ZT1mdW5jdGlvbih2YWx1ZSl7aWYodHlwZW9mIHZhbHVlIT09Im51bWJlciJ8fHBhcnNlSW50KHZhbHVlKSE9dmFsdWUpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBjb3VudGVyIHZhbHVlIChtdXN0IGJlIGFuIGludGVnZXIpIil9aWYodmFsdWU+TnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpe3Rocm93IG5ldyBFcnJvcigiaW50ZWdlciB2YWx1ZSBvdXQgb2Ygc2FmZSByYW5nZSIpfWZvcih2YXIgaW5kZXg9MTU7aW5kZXg+PTA7LS1pbmRleCl7dGhpcy5fY291bnRlcltpbmRleF09dmFsdWUlMjU2O3ZhbHVlPXBhcnNlSW50KHZhbHVlLzI1Nil9fTtDb3VudGVyLnByb3RvdHlwZS5zZXRCeXRlcz1mdW5jdGlvbihieXRlcyl7Ynl0ZXM9Y29lcmNlQXJyYXkoYnl0ZXMsdHJ1ZSk7aWYoYnl0ZXMubGVuZ3RoIT0xNil7dGhyb3cgbmV3IEVycm9yKCJpbnZhbGlkIGNvdW50ZXIgYnl0ZXMgc2l6ZSAobXVzdCBiZSAxNiBieXRlcykiKX10aGlzLl9jb3VudGVyPWJ5dGVzfTtDb3VudGVyLnByb3RvdHlwZS5pbmNyZW1lbnQ9ZnVuY3Rpb24oKXtmb3IodmFyIGk9MTU7aT49MDtpLS0pe2lmKHRoaXMuX2NvdW50ZXJbaV09PT0yNTUpe3RoaXMuX2NvdW50ZXJbaV09MH1lbHNle3RoaXMuX2NvdW50ZXJbaV0rKzticmVha319fTt2YXIgTW9kZU9mT3BlcmF0aW9uQ1RSPWZ1bmN0aW9uKGtleSxjb3VudGVyKXtpZighKHRoaXMgaW5zdGFuY2VvZiBNb2RlT2ZPcGVyYXRpb25DVFIpKXt0aHJvdyBFcnJvcigiQUVTIG11c3QgYmUgaW5zdGFuaXRhdGVkIHdpdGggYG5ld2AiKX10aGlzLmRlc2NyaXB0aW9uPSJDb3VudGVyIjt0aGlzLm5hbWU9ImN0ciI7aWYoIShjb3VudGVyIGluc3RhbmNlb2YgQ291bnRlcikpe2NvdW50ZXI9bmV3IENvdW50ZXIoY291bnRlcil9dGhpcy5fY291bnRlcj1jb3VudGVyO3RoaXMuX3JlbWFpbmluZ0NvdW50ZXI9bnVsbDt0aGlzLl9yZW1haW5pbmdDb3VudGVySW5kZXg9MTY7dGhpcy5fYWVzPW5ldyBBRVMoa2V5KX07TW9kZU9mT3BlcmF0aW9uQ1RSLnByb3RvdHlwZS5lbmNyeXB0PWZ1bmN0aW9uKHBsYWludGV4dCl7dmFyIGVuY3J5cHRlZD1jb2VyY2VBcnJheShwbGFpbnRleHQsdHJ1ZSk7Zm9yKHZhciBpPTA7aTxlbmNyeXB0ZWQubGVuZ3RoO2krKyl7aWYodGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4PT09MTYpe3RoaXMuX3JlbWFpbmluZ0NvdW50ZXI9dGhpcy5fYWVzLmVuY3J5cHQodGhpcy5fY291bnRlci5fY291bnRlcik7dGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4PTA7dGhpcy5fY291bnRlci5pbmNyZW1lbnQoKX1lbmNyeXB0ZWRbaV1ePXRoaXMuX3JlbWFpbmluZ0NvdW50ZXJbdGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4KytdfXJldHVybiBlbmNyeXB0ZWR9O01vZGVPZk9wZXJhdGlvbkNUUi5wcm90b3R5cGUuZGVjcnlwdD1Nb2RlT2ZPcGVyYXRpb25DVFIucHJvdG90eXBlLmVuY3J5cHQ7ZnVuY3Rpb24gcGtjczdwYWQoZGF0YSl7ZGF0YT1jb2VyY2VBcnJheShkYXRhLHRydWUpO3ZhciBwYWRkZXI9MTYtZGF0YS5sZW5ndGglMTY7dmFyIHJlc3VsdD1jcmVhdGVBcnJheShkYXRhLmxlbmd0aCtwYWRkZXIpO2NvcHlBcnJheShkYXRhLHJlc3VsdCk7Zm9yKHZhciBpPWRhdGEubGVuZ3RoO2k8cmVzdWx0Lmxlbmd0aDtpKyspe3Jlc3VsdFtpXT1wYWRkZXJ9cmV0dXJuIHJlc3VsdH1mdW5jdGlvbiBwa2NzN3N0cmlwKGRhdGEpe2RhdGE9Y29lcmNlQXJyYXkoZGF0YSx0cnVlKTtpZihkYXRhLmxlbmd0aDwxNil7dGhyb3cgbmV3IEVycm9yKCJQS0NTIzcgaW52YWxpZCBsZW5ndGgiKX12YXIgcGFkZGVyPWRhdGFbZGF0YS5sZW5ndGgtMV07aWYocGFkZGVyPjE2KXt0aHJvdyBuZXcgRXJyb3IoIlBLQ1MjNyBwYWRkaW5nIGJ5dGUgb3V0IG9mIHJhbmdlIil9dmFyIGxlbmd0aD1kYXRhLmxlbmd0aC1wYWRkZXI7Zm9yKHZhciBpPTA7aTxwYWRkZXI7aSsrKXtpZihkYXRhW2xlbmd0aCtpXSE9PXBhZGRlcil7dGhyb3cgbmV3IEVycm9yKCJQS0NTIzcgaW52YWxpZCBwYWRkaW5nIGJ5dGUiKX19dmFyIHJlc3VsdD1jcmVhdGVBcnJheShsZW5ndGgpO2NvcHlBcnJheShkYXRhLHJlc3VsdCwwLDAsbGVuZ3RoKTtyZXR1cm4gcmVzdWx0fXZhciBhZXNqcz17QUVTOkFFUyxDb3VudGVyOkNvdW50ZXIsTW9kZU9mT3BlcmF0aW9uOntlY2I6TW9kZU9mT3BlcmF0aW9uRUNCLGNiYzpNb2RlT2ZPcGVyYXRpb25DQkMsY2ZiOk1vZGVPZk9wZXJhdGlvbkNGQixvZmI6TW9kZU9mT3BlcmF0aW9uT0ZCLGN0cjpNb2RlT2ZPcGVyYXRpb25DVFJ9LHV0aWxzOntoZXg6Y29udmVydEhleCx1dGY4OmNvbnZlcnRVdGY4fSxwYWRkaW5nOntwa2NzNzp7cGFkOnBrY3M3cGFkLHN0cmlwOnBrY3M3c3RyaXB9fSxfYXJyYXlUZXN0Ontjb2VyY2VBcnJheTpjb2VyY2VBcnJheSxjcmVhdGVBcnJheTpjcmVhdGVBcnJheSxjb3B5QXJyYXk6Y29weUFycmF5fX07aWYodHlwZW9mIGV4cG9ydHMhPT0idW5kZWZpbmVkIil7bW9kdWxlLmV4cG9ydHM9YWVzanN9ZWxzZSBpZih0eXBlb2YgZGVmaW5lPT09ImZ1bmN0aW9uIiYmZGVmaW5lLmFtZCl7ZGVmaW5lKFtdLGZ1bmN0aW9uKCl7cmV0dXJuIGFlc2pzfSl9ZWxzZXtpZihyb290LmFlc2pzKXthZXNqcy5fYWVzanM9cm9vdC5hZXNqc31yb290LmFlc2pzPWFlc2pzfX0pKHRoaXMpfSx7fV0sMTQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtuZXdJbnZhbGlkQXNuMUVycm9yOmZ1bmN0aW9uKG1zZyl7dmFyIGU9bmV3IEVycm9yO2UubmFtZT0iSW52YWxpZEFzbjFFcnJvciI7ZS5tZXNzYWdlPW1zZ3x8IiI7cmV0dXJuIGV9fX0se31dLDE1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgZXJyb3JzPXJlcXVpcmUoIi4vZXJyb3JzIik7dmFyIHR5cGVzPXJlcXVpcmUoIi4vdHlwZXMiKTt2YXIgUmVhZGVyPXJlcXVpcmUoIi4vcmVhZGVyIik7dmFyIFdyaXRlcj1yZXF1aXJlKCIuL3dyaXRlciIpO21vZHVsZS5leHBvcnRzPXtSZWFkZXI6UmVhZGVyLFdyaXRlcjpXcml0ZXJ9O2Zvcih2YXIgdCBpbiB0eXBlcyl7aWYodHlwZXMuaGFzT3duUHJvcGVydHkodCkpbW9kdWxlLmV4cG9ydHNbdF09dHlwZXNbdF19Zm9yKHZhciBlIGluIGVycm9ycyl7aWYoZXJyb3JzLmhhc093blByb3BlcnR5KGUpKW1vZHVsZS5leHBvcnRzW2VdPWVycm9yc1tlXX19LHsiLi9lcnJvcnMiOjE0LCIuL3JlYWRlciI6MTYsIi4vdHlwZXMiOjE3LCIuL3dyaXRlciI6MTh9XSwxNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGFzc2VydD1yZXF1aXJlKCJhc3NlcnQiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmVyLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgQVNOMT1yZXF1aXJlKCIuL3R5cGVzIik7dmFyIGVycm9ycz1yZXF1aXJlKCIuL2Vycm9ycyIpO3ZhciBuZXdJbnZhbGlkQXNuMUVycm9yPWVycm9ycy5uZXdJbnZhbGlkQXNuMUVycm9yO2Z1bmN0aW9uIFJlYWRlcihkYXRhKXtpZighZGF0YXx8IUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl0aHJvdyBuZXcgVHlwZUVycm9yKCJkYXRhIG11c3QgYmUgYSBub2RlIEJ1ZmZlciIpO3RoaXMuX2J1Zj1kYXRhO3RoaXMuX3NpemU9ZGF0YS5sZW5ndGg7dGhpcy5fbGVuPTA7dGhpcy5fb2Zmc2V0PTB9T2JqZWN0LmRlZmluZVByb3BlcnR5KFJlYWRlci5wcm90b3R5cGUsImxlbmd0aCIse2VudW1lcmFibGU6dHJ1ZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbGVufX0pO09iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWFkZXIucHJvdG90eXBlLCJvZmZzZXQiLHtlbnVtZXJhYmxlOnRydWUsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX29mZnNldH19KTtPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVhZGVyLnByb3RvdHlwZSwicmVtYWluIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3NpemUtdGhpcy5fb2Zmc2V0fX0pO09iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWFkZXIucHJvdG90eXBlLCJidWZmZXIiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fYnVmLnNsaWNlKHRoaXMuX29mZnNldCl9fSk7UmVhZGVyLnByb3RvdHlwZS5yZWFkQnl0ZT1mdW5jdGlvbihwZWVrKXtpZih0aGlzLl9zaXplLXRoaXMuX29mZnNldDwxKXJldHVybiBudWxsO3ZhciBiPXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXRdJjI1NTtpZighcGVlayl0aGlzLl9vZmZzZXQrPTE7cmV0dXJuIGJ9O1JlYWRlci5wcm90b3R5cGUucGVlaz1mdW5jdGlvbigpe3JldHVybiB0aGlzLnJlYWRCeXRlKHRydWUpfTtSZWFkZXIucHJvdG90eXBlLnJlYWRMZW5ndGg9ZnVuY3Rpb24ob2Zmc2V0KXtpZihvZmZzZXQ9PT11bmRlZmluZWQpb2Zmc2V0PXRoaXMuX29mZnNldDtpZihvZmZzZXQ+PXRoaXMuX3NpemUpcmV0dXJuIG51bGw7dmFyIGxlbkI9dGhpcy5fYnVmW29mZnNldCsrXSYyNTU7aWYobGVuQj09PW51bGwpcmV0dXJuIG51bGw7aWYoKGxlbkImMTI4KT09PTEyOCl7bGVuQiY9MTI3O2lmKGxlbkI9PT0wKXRocm93IG5ld0ludmFsaWRBc24xRXJyb3IoIkluZGVmaW5pdGUgbGVuZ3RoIG5vdCBzdXBwb3J0ZWQiKTtpZihsZW5CPjQpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiZW5jb2RpbmcgdG9vIGxvbmciKTtpZih0aGlzLl9zaXplLW9mZnNldDxsZW5CKXJldHVybiBudWxsO3RoaXMuX2xlbj0wO2Zvcih2YXIgaT0wO2k8bGVuQjtpKyspdGhpcy5fbGVuPSh0aGlzLl9sZW48PDgpKyh0aGlzLl9idWZbb2Zmc2V0KytdJjI1NSl9ZWxzZXt0aGlzLl9sZW49bGVuQn1yZXR1cm4gb2Zmc2V0fTtSZWFkZXIucHJvdG90eXBlLnJlYWRTZXF1ZW5jZT1mdW5jdGlvbih0YWcpe3ZhciBzZXE9dGhpcy5wZWVrKCk7aWYoc2VxPT09bnVsbClyZXR1cm4gbnVsbDtpZih0YWchPT11bmRlZmluZWQmJnRhZyE9PXNlcSl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJFeHBlY3RlZCAweCIrdGFnLnRvU3RyaW5nKDE2KSsiOiBnb3QgMHgiK3NlcS50b1N0cmluZygxNikpO3ZhciBvPXRoaXMucmVhZExlbmd0aCh0aGlzLl9vZmZzZXQrMSk7aWYobz09PW51bGwpcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87cmV0dXJuIHNlcX07UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRUYWcoQVNOMS5JbnRlZ2VyKX07UmVhZGVyLnByb3RvdHlwZS5yZWFkQm9vbGVhbj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9yZWFkVGFnKEFTTjEuQm9vbGVhbik9PT0wP2ZhbHNlOnRydWV9O1JlYWRlci5wcm90b3R5cGUucmVhZEVudW1lcmF0aW9uPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRUYWcoQVNOMS5FbnVtZXJhdGlvbil9O1JlYWRlci5wcm90b3R5cGUucmVhZFN0cmluZz1mdW5jdGlvbih0YWcscmV0YnVmKXtpZighdGFnKXRhZz1BU04xLk9jdGV0U3RyaW5nO3ZhciBiPXRoaXMucGVlaygpO2lmKGI9PT1udWxsKXJldHVybiBudWxsO2lmKGIhPT10YWcpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiRXhwZWN0ZWQgMHgiK3RhZy50b1N0cmluZygxNikrIjogZ290IDB4IitiLnRvU3RyaW5nKDE2KSk7dmFyIG89dGhpcy5yZWFkTGVuZ3RoKHRoaXMuX29mZnNldCsxKTtpZihvPT09bnVsbClyZXR1cm4gbnVsbDtpZih0aGlzLmxlbmd0aD50aGlzLl9zaXplLW8pcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87aWYodGhpcy5sZW5ndGg9PT0wKXJldHVybiByZXRidWY/QnVmZmVyLmFsbG9jKDApOiIiO3ZhciBzdHI9dGhpcy5fYnVmLnNsaWNlKHRoaXMuX29mZnNldCx0aGlzLl9vZmZzZXQrdGhpcy5sZW5ndGgpO3RoaXMuX29mZnNldCs9dGhpcy5sZW5ndGg7cmV0dXJuIHJldGJ1Zj9zdHI6c3RyLnRvU3RyaW5nKCJ1dGY4Iil9O1JlYWRlci5wcm90b3R5cGUucmVhZE9JRD1mdW5jdGlvbih0YWcpe2lmKCF0YWcpdGFnPUFTTjEuT0lEO3ZhciBiPXRoaXMucmVhZFN0cmluZyh0YWcsdHJ1ZSk7aWYoYj09PW51bGwpcmV0dXJuIG51bGw7dmFyIHZhbHVlcz1bXTt2YXIgdmFsdWU9MDtmb3IodmFyIGk9MDtpPGIubGVuZ3RoO2krKyl7dmFyIGJ5dGU9YltpXSYyNTU7dmFsdWU8PD03O3ZhbHVlKz1ieXRlJjEyNztpZigoYnl0ZSYxMjgpPT09MCl7dmFsdWVzLnB1c2godmFsdWUpO3ZhbHVlPTB9fXZhbHVlPXZhbHVlcy5zaGlmdCgpO3ZhbHVlcy51bnNoaWZ0KHZhbHVlJTQwKTt2YWx1ZXMudW5zaGlmdCh2YWx1ZS80MD4+MCk7cmV0dXJuIHZhbHVlcy5qb2luKCIuIil9O1JlYWRlci5wcm90b3R5cGUuX3JlYWRUYWc9ZnVuY3Rpb24odGFnKXthc3NlcnQub2sodGFnIT09dW5kZWZpbmVkKTt2YXIgYj10aGlzLnBlZWsoKTtpZihiPT09bnVsbClyZXR1cm4gbnVsbDtpZihiIT09dGFnKXRocm93IG5ld0ludmFsaWRBc24xRXJyb3IoIkV4cGVjdGVkIDB4Iit0YWcudG9TdHJpbmcoMTYpKyI6IGdvdCAweCIrYi50b1N0cmluZygxNikpO3ZhciBvPXRoaXMucmVhZExlbmd0aCh0aGlzLl9vZmZzZXQrMSk7aWYobz09PW51bGwpcmV0dXJuIG51bGw7aWYodGhpcy5sZW5ndGg+NCl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJJbnRlZ2VyIHRvbyBsb25nOiAiK3RoaXMubGVuZ3RoKTtpZih0aGlzLmxlbmd0aD50aGlzLl9zaXplLW8pcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87dmFyIGZiPXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXRdO3ZhciB2YWx1ZT0wO2Zvcih2YXIgaT0wO2k8dGhpcy5sZW5ndGg7aSsrKXt2YWx1ZTw8PTg7dmFsdWV8PXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK10mMjU1fWlmKChmYiYxMjgpPT09MTI4JiZpIT09NCl2YWx1ZS09MTw8aSo4O3JldHVybiB2YWx1ZT4+MH07bW9kdWxlLmV4cG9ydHM9UmVhZGVyfSx7Ii4vZXJyb3JzIjoxNCwiLi90eXBlcyI6MTcsYXNzZXJ0OjIwLCJzYWZlci1idWZmZXIiOjgzfV0sMTc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtFT0M6MCxCb29sZWFuOjEsSW50ZWdlcjoyLEJpdFN0cmluZzozLE9jdGV0U3RyaW5nOjQsTnVsbDo1LE9JRDo2LE9iamVjdERlc2NyaXB0b3I6NyxFeHRlcm5hbDo4LFJlYWw6OSxFbnVtZXJhdGlvbjoxMCxQRFY6MTEsVXRmOFN0cmluZzoxMixSZWxhdGl2ZU9JRDoxMyxTZXF1ZW5jZToxNixTZXQ6MTcsTnVtZXJpY1N0cmluZzoxOCxQcmludGFibGVTdHJpbmc6MTksVDYxU3RyaW5nOjIwLFZpZGVvdGV4U3RyaW5nOjIxLElBNVN0cmluZzoyMixVVENUaW1lOjIzLEdlbmVyYWxpemVkVGltZToyNCxHcmFwaGljU3RyaW5nOjI1LFZpc2libGVTdHJpbmc6MjYsR2VuZXJhbFN0cmluZzoyOCxVbml2ZXJzYWxTdHJpbmc6MjksQ2hhcmFjdGVyU3RyaW5nOjMwLEJNUFN0cmluZzozMSxDb25zdHJ1Y3RvcjozMixDb250ZXh0OjEyOH19LHt9XSwxODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGFzc2VydD1yZXF1aXJlKCJhc3NlcnQiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmVyLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgQVNOMT1yZXF1aXJlKCIuL3R5cGVzIik7dmFyIGVycm9ycz1yZXF1aXJlKCIuL2Vycm9ycyIpO3ZhciBuZXdJbnZhbGlkQXNuMUVycm9yPWVycm9ycy5uZXdJbnZhbGlkQXNuMUVycm9yO3ZhciBERUZBVUxUX09QVFM9e3NpemU6MTAyNCxncm93dGhGYWN0b3I6OH07ZnVuY3Rpb24gbWVyZ2UoZnJvbSx0byl7YXNzZXJ0Lm9rKGZyb20pO2Fzc2VydC5lcXVhbCh0eXBlb2YgZnJvbSwib2JqZWN0Iik7YXNzZXJ0Lm9rKHRvKTthc3NlcnQuZXF1YWwodHlwZW9mIHRvLCJvYmplY3QiKTt2YXIga2V5cz1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhmcm9tKTtrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtpZih0b1trZXldKXJldHVybjt2YXIgdmFsdWU9T2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihmcm9tLGtleSk7T2JqZWN0LmRlZmluZVByb3BlcnR5KHRvLGtleSx2YWx1ZSl9KTtyZXR1cm4gdG99ZnVuY3Rpb24gV3JpdGVyKG9wdGlvbnMpe29wdGlvbnM9bWVyZ2UoREVGQVVMVF9PUFRTLG9wdGlvbnN8fHt9KTt0aGlzLl9idWY9QnVmZmVyLmFsbG9jKG9wdGlvbnMuc2l6ZXx8MTAyNCk7dGhpcy5fc2l6ZT10aGlzLl9idWYubGVuZ3RoO3RoaXMuX29mZnNldD0wO3RoaXMuX29wdGlvbnM9b3B0aW9uczt0aGlzLl9zZXE9W119T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRlci5wcm90b3R5cGUsImJ1ZmZlciIse2dldDpmdW5jdGlvbigpe2lmKHRoaXMuX3NlcS5sZW5ndGgpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcih0aGlzLl9zZXEubGVuZ3RoKyIgdW5lbmRlZCBzZXF1ZW5jZShzKSIpO3JldHVybiB0aGlzLl9idWYuc2xpY2UoMCx0aGlzLl9vZmZzZXQpfX0pO1dyaXRlci5wcm90b3R5cGUud3JpdGVCeXRlPWZ1bmN0aW9uKGIpe2lmKHR5cGVvZiBiIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO3RoaXMuX2Vuc3VyZSgxKTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPWJ9O1dyaXRlci5wcm90b3R5cGUud3JpdGVJbnQ9ZnVuY3Rpb24oaSx0YWcpe2lmKHR5cGVvZiBpIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5JbnRlZ2VyO3ZhciBzej00O3doaWxlKCgoaSY0Mjg2NTc4Njg4KT09PTB8fChpJjQyODY1Nzg2ODgpPT09NDI4NjU3ODY4OD4+MCkmJnN6PjEpe3N6LS07aTw8PTh9aWYoc3o+NCl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJCRVIgaW50cyBjYW5ub3QgYmUgPiAweGZmZmZmZmZmIik7dGhpcy5fZW5zdXJlKDIrc3opO3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109dGFnO3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109c3o7d2hpbGUoc3otLSA+MCl7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT0oaSY0Mjc4MTkwMDgwKT4+PjI0O2k8PD04fX07V3JpdGVyLnByb3RvdHlwZS53cml0ZU51bGw9ZnVuY3Rpb24oKXt0aGlzLndyaXRlQnl0ZShBU04xLk51bGwpO3RoaXMud3JpdGVCeXRlKDApfTtXcml0ZXIucHJvdG90eXBlLndyaXRlRW51bWVyYXRpb249ZnVuY3Rpb24oaSx0YWcpe2lmKHR5cGVvZiBpIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5FbnVtZXJhdGlvbjtyZXR1cm4gdGhpcy53cml0ZUludChpLHRhZyl9O1dyaXRlci5wcm90b3R5cGUud3JpdGVCb29sZWFuPWZ1bmN0aW9uKGIsdGFnKXtpZih0eXBlb2YgYiE9PSJib29sZWFuIil0aHJvdyBuZXcgVHlwZUVycm9yKCJhcmd1bWVudCBtdXN0IGJlIGEgQm9vbGVhbiIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5Cb29sZWFuO3RoaXMuX2Vuc3VyZSgzKTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPXRhZzt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPTE7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1iPzI1NTowfTtXcml0ZXIucHJvdG90eXBlLndyaXRlU3RyaW5nPWZ1bmN0aW9uKHMsdGFnKXtpZih0eXBlb2YgcyE9PSJzdHJpbmciKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcgKHdhczogIit0eXBlb2YgcysiKSIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5PY3RldFN0cmluZzt2YXIgbGVuPUJ1ZmZlci5ieXRlTGVuZ3RoKHMpO3RoaXMud3JpdGVCeXRlKHRhZyk7dGhpcy53cml0ZUxlbmd0aChsZW4pO2lmKGxlbil7dGhpcy5fZW5zdXJlKGxlbik7dGhpcy5fYnVmLndyaXRlKHMsdGhpcy5fb2Zmc2V0KTt0aGlzLl9vZmZzZXQrPWxlbn19O1dyaXRlci5wcm90b3R5cGUud3JpdGVCdWZmZXI9ZnVuY3Rpb24oYnVmLHRhZyl7aWYodHlwZW9mIHRhZyE9PSJudW1iZXIiKXRocm93IG5ldyBUeXBlRXJyb3IoInRhZyBtdXN0IGJlIGEgbnVtYmVyIik7aWYoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBidWZmZXIiKTt0aGlzLndyaXRlQnl0ZSh0YWcpO3RoaXMud3JpdGVMZW5ndGgoYnVmLmxlbmd0aCk7dGhpcy5fZW5zdXJlKGJ1Zi5sZW5ndGgpO2J1Zi5jb3B5KHRoaXMuX2J1Zix0aGlzLl9vZmZzZXQsMCxidWYubGVuZ3RoKTt0aGlzLl9vZmZzZXQrPWJ1Zi5sZW5ndGh9O1dyaXRlci5wcm90b3R5cGUud3JpdGVTdHJpbmdBcnJheT1mdW5jdGlvbihzdHJpbmdzKXtpZighc3RyaW5ncyBpbnN0YW5jZW9mIEFycmF5KXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXlbU3RyaW5nXSIpO3ZhciBzZWxmPXRoaXM7c3RyaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKHMpe3NlbGYud3JpdGVTdHJpbmcocyl9KX07V3JpdGVyLnByb3RvdHlwZS53cml0ZU9JRD1mdW5jdGlvbihzLHRhZyl7aWYodHlwZW9mIHMhPT0ic3RyaW5nIil0aHJvdyBuZXcgVHlwZUVycm9yKCJhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nIik7aWYodHlwZW9mIHRhZyE9PSJudW1iZXIiKXRhZz1BU04xLk9JRDtpZighL14oWzAtOV0rXC4pezMsfVswLTldKyQvLnRlc3QocykpdGhyb3cgbmV3IEVycm9yKCJhcmd1bWVudCBpcyBub3QgYSB2YWxpZCBPSUQgc3RyaW5nIik7ZnVuY3Rpb24gZW5jb2RlT2N0ZXQoYnl0ZXMsb2N0ZXQpe2lmKG9jdGV0PDEyOCl7Ynl0ZXMucHVzaChvY3RldCl9ZWxzZSBpZihvY3RldDwxNjM4NCl7Ynl0ZXMucHVzaChvY3RldD4+Pjd8MTI4KTtieXRlcy5wdXNoKG9jdGV0JjEyNyl9ZWxzZSBpZihvY3RldDwyMDk3MTUyKXtieXRlcy5wdXNoKG9jdGV0Pj4+MTR8MTI4KTtieXRlcy5wdXNoKChvY3RldD4+Pjd8MTI4KSYyNTUpO2J5dGVzLnB1c2gob2N0ZXQmMTI3KX1lbHNlIGlmKG9jdGV0PDI2ODQzNTQ1Nil7Ynl0ZXMucHVzaChvY3RldD4+PjIxfDEyOCk7Ynl0ZXMucHVzaCgob2N0ZXQ+Pj4xNHwxMjgpJjI1NSk7Ynl0ZXMucHVzaCgob2N0ZXQ+Pj43fDEyOCkmMjU1KTtieXRlcy5wdXNoKG9jdGV0JjEyNyl9ZWxzZXtieXRlcy5wdXNoKChvY3RldD4+PjI4fDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+PjIxfDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+PjE0fDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+Pjd8MTI4KSYyNTUpO2J5dGVzLnB1c2gob2N0ZXQmMTI3KX19dmFyIHRtcD1zLnNwbGl0KCIuIik7dmFyIGJ5dGVzPVtdO2J5dGVzLnB1c2gocGFyc2VJbnQodG1wWzBdLDEwKSo0MCtwYXJzZUludCh0bXBbMV0sMTApKTt0bXAuc2xpY2UoMikuZm9yRWFjaChmdW5jdGlvbihiKXtlbmNvZGVPY3RldChieXRlcyxwYXJzZUludChiLDEwKSl9KTt2YXIgc2VsZj10aGlzO3RoaXMuX2Vuc3VyZSgyK2J5dGVzLmxlbmd0aCk7dGhpcy53cml0ZUJ5dGUodGFnKTt0aGlzLndyaXRlTGVuZ3RoKGJ5dGVzLmxlbmd0aCk7Ynl0ZXMuZm9yRWFjaChmdW5jdGlvbihiKXtzZWxmLndyaXRlQnl0ZShiKX0pfTtXcml0ZXIucHJvdG90eXBlLndyaXRlTGVuZ3RoPWZ1bmN0aW9uKGxlbil7aWYodHlwZW9mIGxlbiE9PSJudW1iZXIiKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBOdW1iZXIiKTt0aGlzLl9lbnN1cmUoNCk7aWYobGVuPD0xMjcpe3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109bGVufWVsc2UgaWYobGVuPD0yNTUpe3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109MTI5O3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109bGVufWVsc2UgaWYobGVuPD02NTUzNSl7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT0xMzA7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW4+Pjg7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW59ZWxzZSBpZihsZW48PTE2Nzc3MjE1KXt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPTEzMTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPWxlbj4+MTY7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW4+Pjg7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW59ZWxzZXt0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJMZW5ndGggdG9vIGxvbmcgKD4gNCBieXRlcykiKX19O1dyaXRlci5wcm90b3R5cGUuc3RhcnRTZXF1ZW5jZT1mdW5jdGlvbih0YWcpe2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5TZXF1ZW5jZXxBU04xLkNvbnN0cnVjdG9yO3RoaXMud3JpdGVCeXRlKHRhZyk7dGhpcy5fc2VxLnB1c2godGhpcy5fb2Zmc2V0KTt0aGlzLl9lbnN1cmUoMyk7dGhpcy5fb2Zmc2V0Kz0zfTtXcml0ZXIucHJvdG90eXBlLmVuZFNlcXVlbmNlPWZ1bmN0aW9uKCl7dmFyIHNlcT10aGlzLl9zZXEucG9wKCk7dmFyIHN0YXJ0PXNlcSszO3ZhciBsZW49dGhpcy5fb2Zmc2V0LXN0YXJ0O2lmKGxlbjw9MTI3KXt0aGlzLl9zaGlmdChzdGFydCxsZW4sLTIpO3RoaXMuX2J1ZltzZXFdPWxlbn1lbHNlIGlmKGxlbjw9MjU1KXt0aGlzLl9zaGlmdChzdGFydCxsZW4sLTEpO3RoaXMuX2J1ZltzZXFdPTEyOTt0aGlzLl9idWZbc2VxKzFdPWxlbn1lbHNlIGlmKGxlbjw9NjU1MzUpe3RoaXMuX2J1ZltzZXFdPTEzMDt0aGlzLl9idWZbc2VxKzFdPWxlbj4+ODt0aGlzLl9idWZbc2VxKzJdPWxlbn1lbHNlIGlmKGxlbjw9MTY3NzcyMTUpe3RoaXMuX3NoaWZ0KHN0YXJ0LGxlbiwxKTt0aGlzLl9idWZbc2VxXT0xMzE7dGhpcy5fYnVmW3NlcSsxXT1sZW4+PjE2O3RoaXMuX2J1ZltzZXErMl09bGVuPj44O3RoaXMuX2J1ZltzZXErM109bGVufWVsc2V7dGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiU2VxdWVuY2UgdG9vIGxvbmciKX19O1dyaXRlci5wcm90b3R5cGUuX3NoaWZ0PWZ1bmN0aW9uKHN0YXJ0LGxlbixzaGlmdCl7YXNzZXJ0Lm9rKHN0YXJ0IT09dW5kZWZpbmVkKTthc3NlcnQub2sobGVuIT09dW5kZWZpbmVkKTthc3NlcnQub2soc2hpZnQpO3RoaXMuX2J1Zi5jb3B5KHRoaXMuX2J1ZixzdGFydCtzaGlmdCxzdGFydCxzdGFydCtsZW4pO3RoaXMuX29mZnNldCs9c2hpZnR9O1dyaXRlci5wcm90b3R5cGUuX2Vuc3VyZT1mdW5jdGlvbihsZW4pe2Fzc2VydC5vayhsZW4pO2lmKHRoaXMuX3NpemUtdGhpcy5fb2Zmc2V0PGxlbil7dmFyIHN6PXRoaXMuX3NpemUqdGhpcy5fb3B0aW9ucy5ncm93dGhGYWN0b3I7aWYoc3otdGhpcy5fb2Zmc2V0PGxlbilzeis9bGVuO3ZhciBidWY9QnVmZmVyLmFsbG9jKHN6KTt0aGlzLl9idWYuY29weShidWYsMCwwLHRoaXMuX29mZnNldCk7dGhpcy5fYnVmPWJ1Zjt0aGlzLl9zaXplPXN6fX07bW9kdWxlLmV4cG9ydHM9V3JpdGVyfSx7Ii4vZXJyb3JzIjoxNCwiLi90eXBlcyI6MTcsYXNzZXJ0OjIwLCJzYWZlci1idWZmZXIiOjgzfV0sMTk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBCZXI9cmVxdWlyZSgiLi9iZXIvaW5kZXgiKTttb2R1bGUuZXhwb3J0cz17QmVyOkJlcixCZXJSZWFkZXI6QmVyLlJlYWRlcixCZXJXcml0ZXI6QmVyLldyaXRlcn19LHsiLi9iZXIvaW5kZXgiOjE1fV0sMjA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwpeyJ1c2Ugc3RyaWN0Ijt2YXIgb2JqZWN0QXNzaWduPXJlcXVpcmUoIm9iamVjdC1hc3NpZ24iKTtmdW5jdGlvbiBjb21wYXJlKGEsYil7aWYoYT09PWIpe3JldHVybiAwfXZhciB4PWEubGVuZ3RoO3ZhciB5PWIubGVuZ3RoO2Zvcih2YXIgaT0wLGxlbj1NYXRoLm1pbih4LHkpO2k8bGVuOysraSl7aWYoYVtpXSE9PWJbaV0pe3g9YVtpXTt5PWJbaV07YnJlYWt9fWlmKHg8eSl7cmV0dXJuLTF9aWYoeTx4KXtyZXR1cm4gMX1yZXR1cm4gMH1mdW5jdGlvbiBpc0J1ZmZlcihiKXtpZihnbG9iYWwuQnVmZmVyJiZ0eXBlb2YgZ2xvYmFsLkJ1ZmZlci5pc0J1ZmZlcj09PSJmdW5jdGlvbiIpe3JldHVybiBnbG9iYWwuQnVmZmVyLmlzQnVmZmVyKGIpfXJldHVybiEhKGIhPW51bGwmJmIuX2lzQnVmZmVyKX12YXIgdXRpbD1yZXF1aXJlKCJ1dGlsLyIpO3ZhciBoYXNPd249T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTt2YXIgcFNsaWNlPUFycmF5LnByb3RvdHlwZS5zbGljZTt2YXIgZnVuY3Rpb25zSGF2ZU5hbWVzPWZ1bmN0aW9uKCl7cmV0dXJuIGZ1bmN0aW9uIGZvbygpe30ubmFtZT09PSJmb28ifSgpO2Z1bmN0aW9uIHBUb1N0cmluZyhvYmope3JldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKX1mdW5jdGlvbiBpc1ZpZXcoYXJyYnVmKXtpZihpc0J1ZmZlcihhcnJidWYpKXtyZXR1cm4gZmFsc2V9aWYodHlwZW9mIGdsb2JhbC5BcnJheUJ1ZmZlciE9PSJmdW5jdGlvbiIpe3JldHVybiBmYWxzZX1pZih0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3PT09ImZ1bmN0aW9uIil7cmV0dXJuIEFycmF5QnVmZmVyLmlzVmlldyhhcnJidWYpfWlmKCFhcnJidWYpe3JldHVybiBmYWxzZX1pZihhcnJidWYgaW5zdGFuY2VvZiBEYXRhVmlldyl7cmV0dXJuIHRydWV9aWYoYXJyYnVmLmJ1ZmZlciYmYXJyYnVmLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKXtyZXR1cm4gdHJ1ZX1yZXR1cm4gZmFsc2V9dmFyIGFzc2VydD1tb2R1bGUuZXhwb3J0cz1vazt2YXIgcmVnZXg9L1xzKmZ1bmN0aW9uXHMrKFteXChcc10qKVxzKi87ZnVuY3Rpb24gZ2V0TmFtZShmdW5jKXtpZighdXRpbC5pc0Z1bmN0aW9uKGZ1bmMpKXtyZXR1cm59aWYoZnVuY3Rpb25zSGF2ZU5hbWVzKXtyZXR1cm4gZnVuYy5uYW1lfXZhciBzdHI9ZnVuYy50b1N0cmluZygpO3ZhciBtYXRjaD1zdHIubWF0Y2gocmVnZXgpO3JldHVybiBtYXRjaCYmbWF0Y2hbMV19YXNzZXJ0LkFzc2VydGlvbkVycm9yPWZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpe3RoaXMubmFtZT0iQXNzZXJ0aW9uRXJyb3IiO3RoaXMuYWN0dWFsPW9wdGlvbnMuYWN0dWFsO3RoaXMuZXhwZWN0ZWQ9b3B0aW9ucy5leHBlY3RlZDt0aGlzLm9wZXJhdG9yPW9wdGlvbnMub3BlcmF0b3I7aWYob3B0aW9ucy5tZXNzYWdlKXt0aGlzLm1lc3NhZ2U9b3B0aW9ucy5tZXNzYWdlO3RoaXMuZ2VuZXJhdGVkTWVzc2FnZT1mYWxzZX1lbHNle3RoaXMubWVzc2FnZT1nZXRNZXNzYWdlKHRoaXMpO3RoaXMuZ2VuZXJhdGVkTWVzc2FnZT10cnVlfXZhciBzdGFja1N0YXJ0RnVuY3Rpb249b3B0aW9ucy5zdGFja1N0YXJ0RnVuY3Rpb258fGZhaWw7aWYoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2Upe0Vycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsc3RhY2tTdGFydEZ1bmN0aW9uKX1lbHNle3ZhciBlcnI9bmV3IEVycm9yO2lmKGVyci5zdGFjayl7dmFyIG91dD1lcnIuc3RhY2s7dmFyIGZuX25hbWU9Z2V0TmFtZShzdGFja1N0YXJ0RnVuY3Rpb24pO3ZhciBpZHg9b3V0LmluZGV4T2YoIlxuIitmbl9uYW1lKTtpZihpZHg+PTApe3ZhciBuZXh0X2xpbmU9b3V0LmluZGV4T2YoIlxuIixpZHgrMSk7b3V0PW91dC5zdWJzdHJpbmcobmV4dF9saW5lKzEpfXRoaXMuc3RhY2s9b3V0fX19O3V0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLEVycm9yKTtmdW5jdGlvbiB0cnVuY2F0ZShzLG4pe2lmKHR5cGVvZiBzPT09InN0cmluZyIpe3JldHVybiBzLmxlbmd0aDxuP3M6cy5zbGljZSgwLG4pfWVsc2V7cmV0dXJuIHN9fWZ1bmN0aW9uIGluc3BlY3Qoc29tZXRoaW5nKXtpZihmdW5jdGlvbnNIYXZlTmFtZXN8fCF1dGlsLmlzRnVuY3Rpb24oc29tZXRoaW5nKSl7cmV0dXJuIHV0aWwuaW5zcGVjdChzb21ldGhpbmcpfXZhciByYXduYW1lPWdldE5hbWUoc29tZXRoaW5nKTt2YXIgbmFtZT1yYXduYW1lPyI6ICIrcmF3bmFtZToiIjtyZXR1cm4iW0Z1bmN0aW9uIituYW1lKyJdIn1mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpe3JldHVybiB0cnVuY2F0ZShpbnNwZWN0KHNlbGYuYWN0dWFsKSwxMjgpKyIgIitzZWxmLm9wZXJhdG9yKyIgIit0cnVuY2F0ZShpbnNwZWN0KHNlbGYuZXhwZWN0ZWQpLDEyOCl9ZnVuY3Rpb24gZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSxvcGVyYXRvcixzdGFja1N0YXJ0RnVuY3Rpb24pe3Rocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe21lc3NhZ2U6bWVzc2FnZSxhY3R1YWw6YWN0dWFsLGV4cGVjdGVkOmV4cGVjdGVkLG9wZXJhdG9yOm9wZXJhdG9yLHN0YWNrU3RhcnRGdW5jdGlvbjpzdGFja1N0YXJ0RnVuY3Rpb259KX1hc3NlcnQuZmFpbD1mYWlsO2Z1bmN0aW9uIG9rKHZhbHVlLG1lc3NhZ2Upe2lmKCF2YWx1ZSlmYWlsKHZhbHVlLHRydWUsbWVzc2FnZSwiPT0iLGFzc2VydC5vayl9YXNzZXJ0Lm9rPW9rO2Fzc2VydC5lcXVhbD1mdW5jdGlvbiBlcXVhbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSl7aWYoYWN0dWFsIT1leHBlY3RlZClmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCI9PSIsYXNzZXJ0LmVxdWFsKX07YXNzZXJ0Lm5vdEVxdWFsPWZ1bmN0aW9uIG5vdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWw9PWV4cGVjdGVkKXtmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCIhPSIsYXNzZXJ0Lm5vdEVxdWFsKX19O2Fzc2VydC5kZWVwRXF1YWw9ZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZighX2RlZXBFcXVhbChhY3R1YWwsZXhwZWN0ZWQsZmFsc2UpKXtmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCJkZWVwRXF1YWwiLGFzc2VydC5kZWVwRXF1YWwpfX07YXNzZXJ0LmRlZXBTdHJpY3RFcXVhbD1mdW5jdGlvbiBkZWVwU3RyaWN0RXF1YWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2Upe2lmKCFfZGVlcEVxdWFsKGFjdHVhbCxleHBlY3RlZCx0cnVlKSl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiZGVlcFN0cmljdEVxdWFsIixhc3NlcnQuZGVlcFN0cmljdEVxdWFsKX19O2Z1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLHN0cmljdCxtZW1vcyl7aWYoYWN0dWFsPT09ZXhwZWN0ZWQpe3JldHVybiB0cnVlfWVsc2UgaWYoaXNCdWZmZXIoYWN0dWFsKSYmaXNCdWZmZXIoZXhwZWN0ZWQpKXtyZXR1cm4gY29tcGFyZShhY3R1YWwsZXhwZWN0ZWQpPT09MH1lbHNlIGlmKHV0aWwuaXNEYXRlKGFjdHVhbCkmJnV0aWwuaXNEYXRlKGV4cGVjdGVkKSl7cmV0dXJuIGFjdHVhbC5nZXRUaW1lKCk9PT1leHBlY3RlZC5nZXRUaW1lKCl9ZWxzZSBpZih1dGlsLmlzUmVnRXhwKGFjdHVhbCkmJnV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKXtyZXR1cm4gYWN0dWFsLnNvdXJjZT09PWV4cGVjdGVkLnNvdXJjZSYmYWN0dWFsLmdsb2JhbD09PWV4cGVjdGVkLmdsb2JhbCYmYWN0dWFsLm11bHRpbGluZT09PWV4cGVjdGVkLm11bHRpbGluZSYmYWN0dWFsLmxhc3RJbmRleD09PWV4cGVjdGVkLmxhc3RJbmRleCYmYWN0dWFsLmlnbm9yZUNhc2U9PT1leHBlY3RlZC5pZ25vcmVDYXNlfWVsc2UgaWYoKGFjdHVhbD09PW51bGx8fHR5cGVvZiBhY3R1YWwhPT0ib2JqZWN0IikmJihleHBlY3RlZD09PW51bGx8fHR5cGVvZiBleHBlY3RlZCE9PSJvYmplY3QiKSl7cmV0dXJuIHN0cmljdD9hY3R1YWw9PT1leHBlY3RlZDphY3R1YWw9PWV4cGVjdGVkfWVsc2UgaWYoaXNWaWV3KGFjdHVhbCkmJmlzVmlldyhleHBlY3RlZCkmJnBUb1N0cmluZyhhY3R1YWwpPT09cFRvU3RyaW5nKGV4cGVjdGVkKSYmIShhY3R1YWwgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXl8fGFjdHVhbCBpbnN0YW5jZW9mIEZsb2F0NjRBcnJheSkpe3JldHVybiBjb21wYXJlKG5ldyBVaW50OEFycmF5KGFjdHVhbC5idWZmZXIpLG5ldyBVaW50OEFycmF5KGV4cGVjdGVkLmJ1ZmZlcikpPT09MH1lbHNlIGlmKGlzQnVmZmVyKGFjdHVhbCkhPT1pc0J1ZmZlcihleHBlY3RlZCkpe3JldHVybiBmYWxzZX1lbHNle21lbW9zPW1lbW9zfHx7YWN0dWFsOltdLGV4cGVjdGVkOltdfTt2YXIgYWN0dWFsSW5kZXg9bWVtb3MuYWN0dWFsLmluZGV4T2YoYWN0dWFsKTtpZihhY3R1YWxJbmRleCE9PS0xKXtpZihhY3R1YWxJbmRleD09PW1lbW9zLmV4cGVjdGVkLmluZGV4T2YoZXhwZWN0ZWQpKXtyZXR1cm4gdHJ1ZX19bWVtb3MuYWN0dWFsLnB1c2goYWN0dWFsKTttZW1vcy5leHBlY3RlZC5wdXNoKGV4cGVjdGVkKTtyZXR1cm4gb2JqRXF1aXYoYWN0dWFsLGV4cGVjdGVkLHN0cmljdCxtZW1vcyl9fWZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpPT0iW29iamVjdCBBcmd1bWVudHNdIn1mdW5jdGlvbiBvYmpFcXVpdihhLGIsc3RyaWN0LGFjdHVhbFZpc2l0ZWRPYmplY3RzKXtpZihhPT09bnVsbHx8YT09PXVuZGVmaW5lZHx8Yj09PW51bGx8fGI9PT11bmRlZmluZWQpcmV0dXJuIGZhbHNlO2lmKHV0aWwuaXNQcmltaXRpdmUoYSl8fHV0aWwuaXNQcmltaXRpdmUoYikpcmV0dXJuIGE9PT1iO2lmKHN0cmljdCYmT2JqZWN0LmdldFByb3RvdHlwZU9mKGEpIT09T2JqZWN0LmdldFByb3RvdHlwZU9mKGIpKXJldHVybiBmYWxzZTt2YXIgYUlzQXJncz1pc0FyZ3VtZW50cyhhKTt2YXIgYklzQXJncz1pc0FyZ3VtZW50cyhiKTtpZihhSXNBcmdzJiYhYklzQXJnc3x8IWFJc0FyZ3MmJmJJc0FyZ3MpcmV0dXJuIGZhbHNlO2lmKGFJc0FyZ3Mpe2E9cFNsaWNlLmNhbGwoYSk7Yj1wU2xpY2UuY2FsbChiKTtyZXR1cm4gX2RlZXBFcXVhbChhLGIsc3RyaWN0KX12YXIga2E9b2JqZWN0S2V5cyhhKTt2YXIga2I9b2JqZWN0S2V5cyhiKTt2YXIga2V5LGk7aWYoa2EubGVuZ3RoIT09a2IubGVuZ3RoKXJldHVybiBmYWxzZTtrYS5zb3J0KCk7a2Iuc29ydCgpO2ZvcihpPWthLmxlbmd0aC0xO2k+PTA7aS0tKXtpZihrYVtpXSE9PWtiW2ldKXJldHVybiBmYWxzZX1mb3IoaT1rYS5sZW5ndGgtMTtpPj0wO2ktLSl7a2V5PWthW2ldO2lmKCFfZGVlcEVxdWFsKGFba2V5XSxiW2tleV0sc3RyaWN0LGFjdHVhbFZpc2l0ZWRPYmplY3RzKSlyZXR1cm4gZmFsc2V9cmV0dXJuIHRydWV9YXNzZXJ0Lm5vdERlZXBFcXVhbD1mdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2Upe2lmKF9kZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLGZhbHNlKSl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwibm90RGVlcEVxdWFsIixhc3NlcnQubm90RGVlcEVxdWFsKX19O2Fzc2VydC5ub3REZWVwU3RyaWN0RXF1YWw9bm90RGVlcFN0cmljdEVxdWFsO2Z1bmN0aW9uIG5vdERlZXBTdHJpY3RFcXVhbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSl7aWYoX2RlZXBFcXVhbChhY3R1YWwsZXhwZWN0ZWQsdHJ1ZSkpe2ZhaWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2UsIm5vdERlZXBTdHJpY3RFcXVhbCIsbm90RGVlcFN0cmljdEVxdWFsKX19YXNzZXJ0LnN0cmljdEVxdWFsPWZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWwhPT1leHBlY3RlZCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiPT09Iixhc3NlcnQuc3RyaWN0RXF1YWwpfX07YXNzZXJ0Lm5vdFN0cmljdEVxdWFsPWZ1bmN0aW9uIG5vdFN0cmljdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWw9PT1leHBlY3RlZCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiIT09Iixhc3NlcnQubm90U3RyaWN0RXF1YWwpfX07ZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLGV4cGVjdGVkKXtpZighYWN0dWFsfHwhZXhwZWN0ZWQpe3JldHVybiBmYWxzZX1pZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXhwZWN0ZWQpPT0iW29iamVjdCBSZWdFeHBdIil7cmV0dXJuIGV4cGVjdGVkLnRlc3QoYWN0dWFsKX10cnl7aWYoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpe3JldHVybiB0cnVlfX1jYXRjaChlKXt9aWYoRXJyb3IuaXNQcm90b3R5cGVPZihleHBlY3RlZCkpe3JldHVybiBmYWxzZX1yZXR1cm4gZXhwZWN0ZWQuY2FsbCh7fSxhY3R1YWwpPT09dHJ1ZX1mdW5jdGlvbiBfdHJ5QmxvY2soYmxvY2spe3ZhciBlcnJvcjt0cnl7YmxvY2soKX1jYXRjaChlKXtlcnJvcj1lfXJldHVybiBlcnJvcn1mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LGJsb2NrLGV4cGVjdGVkLG1lc3NhZ2Upe3ZhciBhY3R1YWw7aWYodHlwZW9mIGJsb2NrIT09ImZ1bmN0aW9uIil7dGhyb3cgbmV3IFR5cGVFcnJvcignImJsb2NrIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKX1pZih0eXBlb2YgZXhwZWN0ZWQ9PT0ic3RyaW5nIil7bWVzc2FnZT1leHBlY3RlZDtleHBlY3RlZD1udWxsfWFjdHVhbD1fdHJ5QmxvY2soYmxvY2spO21lc3NhZ2U9KGV4cGVjdGVkJiZleHBlY3RlZC5uYW1lPyIgKCIrZXhwZWN0ZWQubmFtZSsiKS4iOiIuIikrKG1lc3NhZ2U/IiAiK21lc3NhZ2U6Ii4iKTtpZihzaG91bGRUaHJvdyYmIWFjdHVhbCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsIk1pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uIittZXNzYWdlKX12YXIgdXNlclByb3ZpZGVkTWVzc2FnZT10eXBlb2YgbWVzc2FnZT09PSJzdHJpbmciO3ZhciBpc1Vud2FudGVkRXhjZXB0aW9uPSFzaG91bGRUaHJvdyYmdXRpbC5pc0Vycm9yKGFjdHVhbCk7dmFyIGlzVW5leHBlY3RlZEV4Y2VwdGlvbj0hc2hvdWxkVGhyb3cmJmFjdHVhbCYmIWV4cGVjdGVkO2lmKGlzVW53YW50ZWRFeGNlcHRpb24mJnVzZXJQcm92aWRlZE1lc3NhZ2UmJmV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCxleHBlY3RlZCl8fGlzVW5leHBlY3RlZEV4Y2VwdGlvbil7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsIkdvdCB1bndhbnRlZCBleGNlcHRpb24iK21lc3NhZ2UpfWlmKHNob3VsZFRocm93JiZhY3R1YWwmJmV4cGVjdGVkJiYhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLGV4cGVjdGVkKXx8IXNob3VsZFRocm93JiZhY3R1YWwpe3Rocm93IGFjdHVhbH19YXNzZXJ0LnRocm93cz1mdW5jdGlvbihibG9jayxlcnJvcixtZXNzYWdlKXtfdGhyb3dzKHRydWUsYmxvY2ssZXJyb3IsbWVzc2FnZSl9O2Fzc2VydC5kb2VzTm90VGhyb3c9ZnVuY3Rpb24oYmxvY2ssZXJyb3IsbWVzc2FnZSl7X3Rocm93cyhmYWxzZSxibG9jayxlcnJvcixtZXNzYWdlKX07YXNzZXJ0LmlmRXJyb3I9ZnVuY3Rpb24oZXJyKXtpZihlcnIpdGhyb3cgZXJyfTtmdW5jdGlvbiBzdHJpY3QodmFsdWUsbWVzc2FnZSl7aWYoIXZhbHVlKWZhaWwodmFsdWUsdHJ1ZSxtZXNzYWdlLCI9PSIsc3RyaWN0KX1hc3NlcnQuc3RyaWN0PW9iamVjdEFzc2lnbihzdHJpY3QsYXNzZXJ0LHtlcXVhbDphc3NlcnQuc3RyaWN0RXF1YWwsZGVlcEVxdWFsOmFzc2VydC5kZWVwU3RyaWN0RXF1YWwsbm90RXF1YWw6YXNzZXJ0Lm5vdFN0cmljdEVxdWFsLG5vdERlZXBFcXVhbDphc3NlcnQubm90RGVlcFN0cmljdEVxdWFsfSk7YXNzZXJ0LnN0cmljdC5zdHJpY3Q9YXNzZXJ0LnN0cmljdDt2YXIgb2JqZWN0S2V5cz1PYmplY3Qua2V5c3x8ZnVuY3Rpb24ob2JqKXt2YXIga2V5cz1bXTtmb3IodmFyIGtleSBpbiBvYmope2lmKGhhc093bi5jYWxsKG9iaixrZXkpKWtleXMucHVzaChrZXkpfXJldHVybiBrZXlzfX0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsIT09InVuZGVmaW5lZCI/Z2xvYmFsOnR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCI/c2VsZjp0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCI/d2luZG93Ont9KX0seyJvYmplY3QtYXNzaWduIjo1OSwidXRpbC8iOjIzfV0sMjE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2lmKHR5cGVvZiBPYmplY3QuY3JlYXRlPT09ImZ1bmN0aW9uIil7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24gaW5oZXJpdHMoY3RvcixzdXBlckN0b3Ipe2N0b3Iuc3VwZXJfPXN1cGVyQ3RvcjtjdG9yLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUse2NvbnN0cnVjdG9yOnt2YWx1ZTpjdG9yLGVudW1lcmFibGU6ZmFsc2Usd3JpdGFibGU6dHJ1ZSxjb25maWd1cmFibGU6dHJ1ZX19KX19ZWxzZXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpbmhlcml0cyhjdG9yLHN1cGVyQ3Rvcil7Y3Rvci5zdXBlcl89c3VwZXJDdG9yO3ZhciBUZW1wQ3Rvcj1mdW5jdGlvbigpe307VGVtcEN0b3IucHJvdG90eXBlPXN1cGVyQ3Rvci5wcm90b3R5cGU7Y3Rvci5wcm90b3R5cGU9bmV3IFRlbXBDdG9yO2N0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yPWN0b3J9fX0se31dLDIyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpc0J1ZmZlcihhcmcpe3JldHVybiBhcmcmJnR5cGVvZiBhcmc9PT0ib2JqZWN0IiYmdHlwZW9mIGFyZy5jb3B5PT09ImZ1bmN0aW9uIiYmdHlwZW9mIGFyZy5maWxsPT09ImZ1bmN0aW9uIiYmdHlwZW9mIGFyZy5yZWFkVUludDg9PT0iZnVuY3Rpb24ifX0se31dLDIzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2VzcyxnbG9iYWwpe3ZhciBmb3JtYXRSZWdFeHA9LyVbc2RqJV0vZztleHBvcnRzLmZvcm1hdD1mdW5jdGlvbihmKXtpZighaXNTdHJpbmcoZikpe3ZhciBvYmplY3RzPVtdO2Zvcih2YXIgaT0wO2k8YXJndW1lbnRzLmxlbmd0aDtpKyspe29iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpfXJldHVybiBvYmplY3RzLmpvaW4oIiAiKX12YXIgaT0xO3ZhciBhcmdzPWFyZ3VtZW50czt2YXIgbGVuPWFyZ3MubGVuZ3RoO3ZhciBzdHI9U3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLGZ1bmN0aW9uKHgpe2lmKHg9PT0iJSUiKXJldHVybiIlIjtpZihpPj1sZW4pcmV0dXJuIHg7c3dpdGNoKHgpe2Nhc2UiJXMiOnJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtjYXNlIiVkIjpyZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7Y2FzZSIlaiI6dHJ5e3JldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pfWNhdGNoKF8pe3JldHVybiJbQ2lyY3VsYXJdIn1kZWZhdWx0OnJldHVybiB4fX0pO2Zvcih2YXIgeD1hcmdzW2ldO2k8bGVuO3g9YXJnc1srK2ldKXtpZihpc051bGwoeCl8fCFpc09iamVjdCh4KSl7c3RyKz0iICIreH1lbHNle3N0cis9IiAiK2luc3BlY3QoeCl9fXJldHVybiBzdHJ9O2V4cG9ydHMuZGVwcmVjYXRlPWZ1bmN0aW9uKGZuLG1zZyl7aWYoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sbXNnKS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWlmKHByb2Nlc3Mubm9EZXByZWNhdGlvbj09PXRydWUpe3JldHVybiBmbn12YXIgd2FybmVkPWZhbHNlO2Z1bmN0aW9uIGRlcHJlY2F0ZWQoKXtpZighd2FybmVkKXtpZihwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pe3Rocm93IG5ldyBFcnJvcihtc2cpfWVsc2UgaWYocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKXtjb25zb2xlLnRyYWNlKG1zZyl9ZWxzZXtjb25zb2xlLmVycm9yKG1zZyl9d2FybmVkPXRydWV9cmV0dXJuIGZuLmFwcGx5KHRoaXMsYXJndW1lbnRzKX1yZXR1cm4gZGVwcmVjYXRlZH07dmFyIGRlYnVncz17fTt2YXIgZGVidWdFbnZpcm9uO2V4cG9ydHMuZGVidWdsb2c9ZnVuY3Rpb24oc2V0KXtpZihpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKWRlYnVnRW52aXJvbj1wcm9jZXNzLmVudi5OT0RFX0RFQlVHfHwiIjtzZXQ9c2V0LnRvVXBwZXJDYXNlKCk7aWYoIWRlYnVnc1tzZXRdKXtpZihuZXcgUmVnRXhwKCJcXGIiK3NldCsiXFxiIiwiaSIpLnRlc3QoZGVidWdFbnZpcm9uKSl7dmFyIHBpZD1wcm9jZXNzLnBpZDtkZWJ1Z3Nbc2V0XT1mdW5jdGlvbigpe3ZhciBtc2c9ZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpO2NvbnNvbGUuZXJyb3IoIiVzICVkOiAlcyIsc2V0LHBpZCxtc2cpfX1lbHNle2RlYnVnc1tzZXRdPWZ1bmN0aW9uKCl7fX19cmV0dXJuIGRlYnVnc1tzZXRdfTtmdW5jdGlvbiBpbnNwZWN0KG9iaixvcHRzKXt2YXIgY3R4PXtzZWVuOltdLHN0eWxpemU6c3R5bGl6ZU5vQ29sb3J9O2lmKGFyZ3VtZW50cy5sZW5ndGg+PTMpY3R4LmRlcHRoPWFyZ3VtZW50c1syXTtpZihhcmd1bWVudHMubGVuZ3RoPj00KWN0eC5jb2xvcnM9YXJndW1lbnRzWzNdO2lmKGlzQm9vbGVhbihvcHRzKSl7Y3R4LnNob3dIaWRkZW49b3B0c31lbHNlIGlmKG9wdHMpe2V4cG9ydHMuX2V4dGVuZChjdHgsb3B0cyl9aWYoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKWN0eC5zaG93SGlkZGVuPWZhbHNlO2lmKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpY3R4LmRlcHRoPTI7aWYoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpY3R4LmNvbG9ycz1mYWxzZTtpZihpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpY3R4LmN1c3RvbUluc3BlY3Q9dHJ1ZTtpZihjdHguY29sb3JzKWN0eC5zdHlsaXplPXN0eWxpemVXaXRoQ29sb3I7cmV0dXJuIGZvcm1hdFZhbHVlKGN0eCxvYmosY3R4LmRlcHRoKX1leHBvcnRzLmluc3BlY3Q9aW5zcGVjdDtpbnNwZWN0LmNvbG9ycz17Ym9sZDpbMSwyMl0saXRhbGljOlszLDIzXSx1bmRlcmxpbmU6WzQsMjRdLGludmVyc2U6WzcsMjddLHdoaXRlOlszNywzOV0sZ3JleTpbOTAsMzldLGJsYWNrOlszMCwzOV0sYmx1ZTpbMzQsMzldLGN5YW46WzM2LDM5XSxncmVlbjpbMzIsMzldLG1hZ2VudGE6WzM1LDM5XSxyZWQ6WzMxLDM5XSx5ZWxsb3c6WzMzLDM5XX07aW5zcGVjdC5zdHlsZXM9e3NwZWNpYWw6ImN5YW4iLG51bWJlcjoieWVsbG93Iixib29sZWFuOiJ5ZWxsb3ciLHVuZGVmaW5lZDoiZ3JleSIsbnVsbDoiYm9sZCIsc3RyaW5nOiJncmVlbiIsZGF0ZToibWFnZW50YSIscmVnZXhwOiJyZWQifTtmdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0cixzdHlsZVR5cGUpe3ZhciBzdHlsZT1pbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO2lmKHN0eWxlKXtyZXR1cm4iG1siK2luc3BlY3QuY29sb3JzW3N0eWxlXVswXSsibSIrc3RyKyIbWyIraW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdKyJtIn1lbHNle3JldHVybiBzdHJ9fWZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0cixzdHlsZVR5cGUpe3JldHVybiBzdHJ9ZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpe3ZhciBoYXNoPXt9O2FycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLGlkeCl7aGFzaFt2YWxdPXRydWV9KTtyZXR1cm4gaGFzaH1mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsdmFsdWUscmVjdXJzZVRpbWVzKXtpZihjdHguY3VzdG9tSW5zcGVjdCYmdmFsdWUmJmlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkmJnZhbHVlLmluc3BlY3QhPT1leHBvcnRzLmluc3BlY3QmJiEodmFsdWUuY29uc3RydWN0b3ImJnZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZT09PXZhbHVlKSl7dmFyIHJldD12YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcyxjdHgpO2lmKCFpc1N0cmluZyhyZXQpKXtyZXQ9Zm9ybWF0VmFsdWUoY3R4LHJldCxyZWN1cnNlVGltZXMpfXJldHVybiByZXR9dmFyIHByaW1pdGl2ZT1mb3JtYXRQcmltaXRpdmUoY3R4LHZhbHVlKTtpZihwcmltaXRpdmUpe3JldHVybiBwcmltaXRpdmV9dmFyIGtleXM9T2JqZWN0LmtleXModmFsdWUpO3ZhciB2aXNpYmxlS2V5cz1hcnJheVRvSGFzaChrZXlzKTtpZihjdHguc2hvd0hpZGRlbil7a2V5cz1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSl9aWYoaXNFcnJvcih2YWx1ZSkmJihrZXlzLmluZGV4T2YoIm1lc3NhZ2UiKT49MHx8a2V5cy5pbmRleE9mKCJkZXNjcmlwdGlvbiIpPj0wKSl7cmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKX1pZihrZXlzLmxlbmd0aD09PTApe2lmKGlzRnVuY3Rpb24odmFsdWUpKXt2YXIgbmFtZT12YWx1ZS5uYW1lPyI6ICIrdmFsdWUubmFtZToiIjtyZXR1cm4gY3R4LnN0eWxpemUoIltGdW5jdGlvbiIrbmFtZSsiXSIsInNwZWNpYWwiKX1pZihpc1JlZ0V4cCh2YWx1ZSkpe3JldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCJyZWdleHAiKX1pZihpc0RhdGUodmFsdWUpKXtyZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksImRhdGUiKX1pZihpc0Vycm9yKHZhbHVlKSl7cmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKX19dmFyIGJhc2U9IiIsYXJyYXk9ZmFsc2UsYnJhY2VzPVsieyIsIn0iXTtpZihpc0FycmF5KHZhbHVlKSl7YXJyYXk9dHJ1ZTticmFjZXM9WyJbIiwiXSJdfWlmKGlzRnVuY3Rpb24odmFsdWUpKXt2YXIgbj12YWx1ZS5uYW1lPyI6ICIrdmFsdWUubmFtZToiIjtiYXNlPSIgW0Z1bmN0aW9uIituKyJdIn1pZihpc1JlZ0V4cCh2YWx1ZSkpe2Jhc2U9IiAiK1JlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSl9aWYoaXNEYXRlKHZhbHVlKSl7YmFzZT0iICIrRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSl9aWYoaXNFcnJvcih2YWx1ZSkpe2Jhc2U9IiAiK2Zvcm1hdEVycm9yKHZhbHVlKX1pZihrZXlzLmxlbmd0aD09PTAmJighYXJyYXl8fHZhbHVlLmxlbmd0aD09MCkpe3JldHVybiBicmFjZXNbMF0rYmFzZSticmFjZXNbMV19aWYocmVjdXJzZVRpbWVzPDApe2lmKGlzUmVnRXhwKHZhbHVlKSl7cmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksInJlZ2V4cCIpfWVsc2V7cmV0dXJuIGN0eC5zdHlsaXplKCJbT2JqZWN0XSIsInNwZWNpYWwiKX19Y3R4LnNlZW4ucHVzaCh2YWx1ZSk7dmFyIG91dHB1dDtpZihhcnJheSl7b3V0cHV0PWZvcm1hdEFycmF5KGN0eCx2YWx1ZSxyZWN1cnNlVGltZXMsdmlzaWJsZUtleXMsa2V5cyl9ZWxzZXtvdXRwdXQ9a2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtyZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LHZhbHVlLHJlY3Vyc2VUaW1lcyx2aXNpYmxlS2V5cyxrZXksYXJyYXkpfSl9Y3R4LnNlZW4ucG9wKCk7cmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCxiYXNlLGJyYWNlcyl9ZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCx2YWx1ZSl7aWYoaXNVbmRlZmluZWQodmFsdWUpKXJldHVybiBjdHguc3R5bGl6ZSgidW5kZWZpbmVkIiwidW5kZWZpbmVkIik7aWYoaXNTdHJpbmcodmFsdWUpKXt2YXIgc2ltcGxlPSInIitKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXiJ8IiQvZywiIikucmVwbGFjZSgvJy9nLCJcXCciKS5yZXBsYWNlKC9cXCIvZywnIicpKyInIjtyZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCJzdHJpbmciKX1pZihpc051bWJlcih2YWx1ZSkpcmV0dXJuIGN0eC5zdHlsaXplKCIiK3ZhbHVlLCJudW1iZXIiKTtpZihpc0Jvb2xlYW4odmFsdWUpKXJldHVybiBjdHguc3R5bGl6ZSgiIit2YWx1ZSwiYm9vbGVhbiIpO2lmKGlzTnVsbCh2YWx1ZSkpcmV0dXJuIGN0eC5zdHlsaXplKCJudWxsIiwibnVsbCIpfWZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKXtyZXR1cm4iWyIrRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpKyJdIn1mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleXMpe3ZhciBvdXRwdXQ9W107Zm9yKHZhciBpPTAsbD12YWx1ZS5sZW5ndGg7aTxsOysraSl7aWYoaGFzT3duUHJvcGVydHkodmFsdWUsU3RyaW5nKGkpKSl7b3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LHZhbHVlLHJlY3Vyc2VUaW1lcyx2aXNpYmxlS2V5cyxTdHJpbmcoaSksdHJ1ZSkpfWVsc2V7b3V0cHV0LnB1c2goIiIpfX1rZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtpZigha2V5Lm1hdGNoKC9eXGQrJC8pKXtvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleSx0cnVlKSl9fSk7cmV0dXJuIG91dHB1dH1mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleSxhcnJheSl7dmFyIG5hbWUsc3RyLGRlc2M7ZGVzYz1PYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLGtleSl8fHt2YWx1ZTp2YWx1ZVtrZXldfTtpZihkZXNjLmdldCl7aWYoZGVzYy5zZXQpe3N0cj1jdHguc3R5bGl6ZSgiW0dldHRlci9TZXR0ZXJdIiwic3BlY2lhbCIpfWVsc2V7c3RyPWN0eC5zdHlsaXplKCJbR2V0dGVyXSIsInNwZWNpYWwiKX19ZWxzZXtpZihkZXNjLnNldCl7c3RyPWN0eC5zdHlsaXplKCJbU2V0dGVyXSIsInNwZWNpYWwiKX19aWYoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLGtleSkpe25hbWU9IlsiK2tleSsiXSJ9aWYoIXN0cil7aWYoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKTwwKXtpZihpc051bGwocmVjdXJzZVRpbWVzKSl7c3RyPWZvcm1hdFZhbHVlKGN0eCxkZXNjLnZhbHVlLG51bGwpfWVsc2V7c3RyPWZvcm1hdFZhbHVlKGN0eCxkZXNjLnZhbHVlLHJlY3Vyc2VUaW1lcy0xKX1pZihzdHIuaW5kZXhPZigiXG4iKT4tMSl7aWYoYXJyYXkpe3N0cj1zdHIuc3BsaXQoIlxuIikubWFwKGZ1bmN0aW9uKGxpbmUpe3JldHVybiIgICIrbGluZX0pLmpvaW4oIlxuIikuc3Vic3RyKDIpfWVsc2V7c3RyPSJcbiIrc3RyLnNwbGl0KCJcbiIpLm1hcChmdW5jdGlvbihsaW5lKXtyZXR1cm4iICAgIitsaW5lfSkuam9pbigiXG4iKX19fWVsc2V7c3RyPWN0eC5zdHlsaXplKCJbQ2lyY3VsYXJdIiwic3BlY2lhbCIpfX1pZihpc1VuZGVmaW5lZChuYW1lKSl7aWYoYXJyYXkmJmtleS5tYXRjaCgvXlxkKyQvKSl7cmV0dXJuIHN0cn1uYW1lPUpTT04uc3RyaW5naWZ5KCIiK2tleSk7aWYobmFtZS5tYXRjaCgvXiIoW2EtekEtWl9dW2EtekEtWl8wLTldKikiJC8pKXtuYW1lPW5hbWUuc3Vic3RyKDEsbmFtZS5sZW5ndGgtMik7bmFtZT1jdHguc3R5bGl6ZShuYW1lLCJuYW1lIil9ZWxzZXtuYW1lPW5hbWUucmVwbGFjZSgvJy9nLCJcXCciKS5yZXBsYWNlKC9cXCIvZywnIicpLnJlcGxhY2UoLyheInwiJCkvZywiJyIpO25hbWU9Y3R4LnN0eWxpemUobmFtZSwic3RyaW5nIil9fXJldHVybiBuYW1lKyI6ICIrc3RyfWZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCxiYXNlLGJyYWNlcyl7dmFyIG51bUxpbmVzRXN0PTA7dmFyIGxlbmd0aD1vdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsY3VyKXtudW1MaW5lc0VzdCsrO2lmKGN1ci5pbmRleE9mKCJcbiIpPj0wKW51bUxpbmVzRXN0Kys7cmV0dXJuIHByZXYrY3VyLnJlcGxhY2UoL1x1MDAxYlxbXGRcZD9tL2csIiIpLmxlbmd0aCsxfSwwKTtpZihsZW5ndGg+NjApe3JldHVybiBicmFjZXNbMF0rKGJhc2U9PT0iIj8iIjpiYXNlKyJcbiAiKSsiICIrb3V0cHV0LmpvaW4oIixcbiAgIikrIiAiK2JyYWNlc1sxXX1yZXR1cm4gYnJhY2VzWzBdK2Jhc2UrIiAiK291dHB1dC5qb2luKCIsICIpKyIgIiticmFjZXNbMV19ZnVuY3Rpb24gaXNBcnJheShhcil7cmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpfWV4cG9ydHMuaXNBcnJheT1pc0FycmF5O2Z1bmN0aW9uIGlzQm9vbGVhbihhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09ImJvb2xlYW4ifWV4cG9ydHMuaXNCb29sZWFuPWlzQm9vbGVhbjtmdW5jdGlvbiBpc051bGwoYXJnKXtyZXR1cm4gYXJnPT09bnVsbH1leHBvcnRzLmlzTnVsbD1pc051bGw7ZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKXtyZXR1cm4gYXJnPT1udWxsfWV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQ9aXNOdWxsT3JVbmRlZmluZWQ7ZnVuY3Rpb24gaXNOdW1iZXIoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJudW1iZXIifWV4cG9ydHMuaXNOdW1iZXI9aXNOdW1iZXI7ZnVuY3Rpb24gaXNTdHJpbmcoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJzdHJpbmcifWV4cG9ydHMuaXNTdHJpbmc9aXNTdHJpbmc7ZnVuY3Rpb24gaXNTeW1ib2woYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJzeW1ib2wifWV4cG9ydHMuaXNTeW1ib2w9aXNTeW1ib2w7ZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKXtyZXR1cm4gYXJnPT09dm9pZCAwfWV4cG9ydHMuaXNVbmRlZmluZWQ9aXNVbmRlZmluZWQ7ZnVuY3Rpb24gaXNSZWdFeHAocmUpe3JldHVybiBpc09iamVjdChyZSkmJm9iamVjdFRvU3RyaW5nKHJlKT09PSJbb2JqZWN0IFJlZ0V4cF0ifWV4cG9ydHMuaXNSZWdFeHA9aXNSZWdFeHA7ZnVuY3Rpb24gaXNPYmplY3QoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJvYmplY3QiJiZhcmchPT1udWxsfWV4cG9ydHMuaXNPYmplY3Q9aXNPYmplY3Q7ZnVuY3Rpb24gaXNEYXRlKGQpe3JldHVybiBpc09iamVjdChkKSYmb2JqZWN0VG9TdHJpbmcoZCk9PT0iW29iamVjdCBEYXRlXSJ9ZXhwb3J0cy5pc0RhdGU9aXNEYXRlO2Z1bmN0aW9uIGlzRXJyb3IoZSl7cmV0dXJuIGlzT2JqZWN0KGUpJiYob2JqZWN0VG9TdHJpbmcoZSk9PT0iW29iamVjdCBFcnJvcl0ifHxlIGluc3RhbmNlb2YgRXJyb3IpfWV4cG9ydHMuaXNFcnJvcj1pc0Vycm9yO2Z1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJmdW5jdGlvbiJ9ZXhwb3J0cy5pc0Z1bmN0aW9uPWlzRnVuY3Rpb247ZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKXtyZXR1cm4gYXJnPT09bnVsbHx8dHlwZW9mIGFyZz09PSJib29sZWFuInx8dHlwZW9mIGFyZz09PSJudW1iZXIifHx0eXBlb2YgYXJnPT09InN0cmluZyJ8fHR5cGVvZiBhcmc9PT0ic3ltYm9sInx8dHlwZW9mIGFyZz09PSJ1bmRlZmluZWQifWV4cG9ydHMuaXNQcmltaXRpdmU9aXNQcmltaXRpdmU7ZXhwb3J0cy5pc0J1ZmZlcj1yZXF1aXJlKCIuL3N1cHBvcnQvaXNCdWZmZXIiKTtmdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pfWZ1bmN0aW9uIHBhZChuKXtyZXR1cm4gbjwxMD8iMCIrbi50b1N0cmluZygxMCk6bi50b1N0cmluZygxMCl9dmFyIG1vbnRocz1bIkphbiIsIkZlYiIsIk1hciIsIkFwciIsIk1heSIsIkp1biIsIkp1bCIsIkF1ZyIsIlNlcCIsIk9jdCIsIk5vdiIsIkRlYyJdO2Z1bmN0aW9uIHRpbWVzdGFtcCgpe3ZhciBkPW5ldyBEYXRlO3ZhciB0aW1lPVtwYWQoZC5nZXRIb3VycygpKSxwYWQoZC5nZXRNaW51dGVzKCkpLHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oIjoiKTtyZXR1cm5bZC5nZXREYXRlKCksbW9udGhzW2QuZ2V0TW9udGgoKV0sdGltZV0uam9pbigiICIpfWV4cG9ydHMubG9nPWZ1bmN0aW9uKCl7Y29uc29sZS5sb2coIiVzIC0gJXMiLHRpbWVzdGFtcCgpLGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsYXJndW1lbnRzKSl9O2V4cG9ydHMuaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTtleHBvcnRzLl9leHRlbmQ9ZnVuY3Rpb24ob3JpZ2luLGFkZCl7aWYoIWFkZHx8IWlzT2JqZWN0KGFkZCkpcmV0dXJuIG9yaWdpbjt2YXIga2V5cz1PYmplY3Qua2V5cyhhZGQpO3ZhciBpPWtleXMubGVuZ3RoO3doaWxlKGktLSl7b3JpZ2luW2tleXNbaV1dPWFkZFtrZXlzW2ldXX1yZXR1cm4gb3JpZ2lufTtmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmoscHJvcCl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmoscHJvcCl9fSkuY2FsbCh0aGlzLHJlcXVpcmUoIl9wcm9jZXNzIiksdHlwZW9mIGdsb2JhbCE9PSJ1bmRlZmluZWQiP2dsb2JhbDp0eXBlb2Ygc2VsZiE9PSJ1bmRlZmluZWQiP3NlbGY6dHlwZW9mIHdpbmRvdyE9PSJ1bmRlZmluZWQiP3dpbmRvdzp7fSl9LHsiLi9zdXBwb3J0L2lzQnVmZmVyIjoyMixfcHJvY2Vzczo2Nixpbmhlcml0czoyMX1dLDI0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7ZXhwb3J0cy5ieXRlTGVuZ3RoPWJ5dGVMZW5ndGg7ZXhwb3J0cy50b0J5dGVBcnJheT10b0J5dGVBcnJheTtleHBvcnRzLmZyb21CeXRlQXJyYXk9ZnJvbUJ5dGVBcnJheTt2YXIgbG9va3VwPVtdO3ZhciByZXZMb29rdXA9W107dmFyIEFycj10eXBlb2YgVWludDhBcnJheSE9PSJ1bmRlZmluZWQiP1VpbnQ4QXJyYXk6QXJyYXk7dmFyIGNvZGU9IkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8iO2Zvcih2YXIgaT0wLGxlbj1jb2RlLmxlbmd0aDtpPGxlbjsrK2kpe2xvb2t1cFtpXT1jb2RlW2ldO3Jldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldPWl9cmV2TG9va3VwWyItIi5jaGFyQ29kZUF0KDApXT02MjtyZXZMb29rdXBbIl8iLmNoYXJDb2RlQXQoMCldPTYzO2Z1bmN0aW9uIGdldExlbnMoYjY0KXt2YXIgbGVuPWI2NC5sZW5ndGg7aWYobGVuJTQ+MCl7dGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Iil9dmFyIHZhbGlkTGVuPWI2NC5pbmRleE9mKCI9Iik7aWYodmFsaWRMZW49PT0tMSl2YWxpZExlbj1sZW47dmFyIHBsYWNlSG9sZGVyc0xlbj12YWxpZExlbj09PWxlbj8wOjQtdmFsaWRMZW4lNDtyZXR1cm5bdmFsaWRMZW4scGxhY2VIb2xkZXJzTGVuXX1mdW5jdGlvbiBieXRlTGVuZ3RoKGI2NCl7dmFyIGxlbnM9Z2V0TGVucyhiNjQpO3ZhciB2YWxpZExlbj1sZW5zWzBdO3ZhciBwbGFjZUhvbGRlcnNMZW49bGVuc1sxXTtyZXR1cm4odmFsaWRMZW4rcGxhY2VIb2xkZXJzTGVuKSozLzQtcGxhY2VIb2xkZXJzTGVufWZ1bmN0aW9uIF9ieXRlTGVuZ3RoKGI2NCx2YWxpZExlbixwbGFjZUhvbGRlcnNMZW4pe3JldHVybih2YWxpZExlbitwbGFjZUhvbGRlcnNMZW4pKjMvNC1wbGFjZUhvbGRlcnNMZW59ZnVuY3Rpb24gdG9CeXRlQXJyYXkoYjY0KXt2YXIgdG1wO3ZhciBsZW5zPWdldExlbnMoYjY0KTt2YXIgdmFsaWRMZW49bGVuc1swXTt2YXIgcGxhY2VIb2xkZXJzTGVuPWxlbnNbMV07dmFyIGFycj1uZXcgQXJyKF9ieXRlTGVuZ3RoKGI2NCx2YWxpZExlbixwbGFjZUhvbGRlcnNMZW4pKTt2YXIgY3VyQnl0ZT0wO3ZhciBsZW49cGxhY2VIb2xkZXJzTGVuPjA/dmFsaWRMZW4tNDp2YWxpZExlbjt2YXIgaTtmb3IoaT0wO2k8bGVuO2krPTQpe3RtcD1yZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldPDwxOHxyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSsxKV08PDEyfHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKzIpXTw8NnxyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSszKV07YXJyW2N1ckJ5dGUrK109dG1wPj4xNiYyNTU7YXJyW2N1ckJ5dGUrK109dG1wPj44JjI1NTthcnJbY3VyQnl0ZSsrXT10bXAmMjU1fWlmKHBsYWNlSG9sZGVyc0xlbj09PTIpe3RtcD1yZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldPDwyfHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKzEpXT4+NDthcnJbY3VyQnl0ZSsrXT10bXAmMjU1fWlmKHBsYWNlSG9sZGVyc0xlbj09PTEpe3RtcD1yZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldPDwxMHxyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSsxKV08PDR8cmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkrMildPj4yO2FycltjdXJCeXRlKytdPXRtcD4+OCYyNTU7YXJyW2N1ckJ5dGUrK109dG1wJjI1NX1yZXR1cm4gYXJyfWZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NChudW0pe3JldHVybiBsb29rdXBbbnVtPj4xOCY2M10rbG9va3VwW251bT4+MTImNjNdK2xvb2t1cFtudW0+PjYmNjNdK2xvb2t1cFtudW0mNjNdfWZ1bmN0aW9uIGVuY29kZUNodW5rKHVpbnQ4LHN0YXJ0LGVuZCl7dmFyIHRtcDt2YXIgb3V0cHV0PVtdO2Zvcih2YXIgaT1zdGFydDtpPGVuZDtpKz0zKXt0bXA9KHVpbnQ4W2ldPDwxNiYxNjcxMTY4MCkrKHVpbnQ4W2krMV08PDgmNjUyODApKyh1aW50OFtpKzJdJjI1NSk7b3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpfXJldHVybiBvdXRwdXQuam9pbigiIil9ZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSh1aW50OCl7dmFyIHRtcDt2YXIgbGVuPXVpbnQ4Lmxlbmd0aDt2YXIgZXh0cmFCeXRlcz1sZW4lMzt2YXIgcGFydHM9W107dmFyIG1heENodW5rTGVuZ3RoPTE2MzgzO2Zvcih2YXIgaT0wLGxlbjI9bGVuLWV4dHJhQnl0ZXM7aTxsZW4yO2krPW1heENodW5rTGVuZ3RoKXtwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LGksaSttYXhDaHVua0xlbmd0aD5sZW4yP2xlbjI6aSttYXhDaHVua0xlbmd0aCkpfWlmKGV4dHJhQnl0ZXM9PT0xKXt0bXA9dWludDhbbGVuLTFdO3BhcnRzLnB1c2gobG9va3VwW3RtcD4+Ml0rbG9va3VwW3RtcDw8NCY2M10rIj09Iil9ZWxzZSBpZihleHRyYUJ5dGVzPT09Mil7dG1wPSh1aW50OFtsZW4tMl08PDgpK3VpbnQ4W2xlbi0xXTtwYXJ0cy5wdXNoKGxvb2t1cFt0bXA+PjEwXStsb29rdXBbdG1wPj40JjYzXStsb29rdXBbdG1wPDwyJjYzXSsiPSIpfXJldHVybiBwYXJ0cy5qb2luKCIiKX19LHt9XSwyNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGJpZ0ludD1mdW5jdGlvbih1bmRlZmluZWQpeyJ1c2Ugc3RyaWN0Ijt2YXIgQkFTRT0xZTcsTE9HX0JBU0U9NyxNQVhfSU5UPTkwMDcxOTkyNTQ3NDA5OTIsTUFYX0lOVF9BUlI9c21hbGxUb0FycmF5KE1BWF9JTlQpLERFRkFVTFRfQUxQSEFCRVQ9IjAxMjM0NTY3ODlhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiI7dmFyIHN1cHBvcnRzTmF0aXZlQmlnSW50PXR5cGVvZiBCaWdJbnQ9PT0iZnVuY3Rpb24iO2Z1bmN0aW9uIEludGVnZXIodixyYWRpeCxhbHBoYWJldCxjYXNlU2Vuc2l0aXZlKXtpZih0eXBlb2Ygdj09PSJ1bmRlZmluZWQiKXJldHVybiBJbnRlZ2VyWzBdO2lmKHR5cGVvZiByYWRpeCE9PSJ1bmRlZmluZWQiKXJldHVybityYWRpeD09PTEwJiYhYWxwaGFiZXQ/cGFyc2VWYWx1ZSh2KTpwYXJzZUJhc2UodixyYWRpeCxhbHBoYWJldCxjYXNlU2Vuc2l0aXZlKTtyZXR1cm4gcGFyc2VWYWx1ZSh2KX1mdW5jdGlvbiBCaWdJbnRlZ2VyKHZhbHVlLHNpZ24pe3RoaXMudmFsdWU9dmFsdWU7dGhpcy5zaWduPXNpZ247dGhpcy5pc1NtYWxsPWZhbHNlfUJpZ0ludGVnZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoSW50ZWdlci5wcm90b3R5cGUpO2Z1bmN0aW9uIFNtYWxsSW50ZWdlcih2YWx1ZSl7dGhpcy52YWx1ZT12YWx1ZTt0aGlzLnNpZ249dmFsdWU8MDt0aGlzLmlzU21hbGw9dHJ1ZX1TbWFsbEludGVnZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoSW50ZWdlci5wcm90b3R5cGUpO2Z1bmN0aW9uIE5hdGl2ZUJpZ0ludCh2YWx1ZSl7dGhpcy52YWx1ZT12YWx1ZX1OYXRpdmVCaWdJbnQucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoSW50ZWdlci5wcm90b3R5cGUpO2Z1bmN0aW9uIGlzUHJlY2lzZShuKXtyZXR1cm4tTUFYX0lOVDxuJiZuPE1BWF9JTlR9ZnVuY3Rpb24gc21hbGxUb0FycmF5KG4pe2lmKG48MWU3KXJldHVybltuXTtpZihuPDFlMTQpcmV0dXJuW24lMWU3LE1hdGguZmxvb3Iobi8xZTcpXTtyZXR1cm5bbiUxZTcsTWF0aC5mbG9vcihuLzFlNyklMWU3LE1hdGguZmxvb3Iobi8xZTE0KV19ZnVuY3Rpb24gYXJyYXlUb1NtYWxsKGFycil7dHJpbShhcnIpO3ZhciBsZW5ndGg9YXJyLmxlbmd0aDtpZihsZW5ndGg8NCYmY29tcGFyZUFicyhhcnIsTUFYX0lOVF9BUlIpPDApe3N3aXRjaChsZW5ndGgpe2Nhc2UgMDpyZXR1cm4gMDtjYXNlIDE6cmV0dXJuIGFyclswXTtjYXNlIDI6cmV0dXJuIGFyclswXSthcnJbMV0qQkFTRTtkZWZhdWx0OnJldHVybiBhcnJbMF0rKGFyclsxXSthcnJbMl0qQkFTRSkqQkFTRX19cmV0dXJuIGFycn1mdW5jdGlvbiB0cmltKHYpe3ZhciBpPXYubGVuZ3RoO3doaWxlKHZbLS1pXT09PTApO3YubGVuZ3RoPWkrMX1mdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgpe3ZhciB4PW5ldyBBcnJheShsZW5ndGgpO3ZhciBpPS0xO3doaWxlKCsraTxsZW5ndGgpe3hbaV09MH1yZXR1cm4geH1mdW5jdGlvbiB0cnVuY2F0ZShuKXtpZihuPjApcmV0dXJuIE1hdGguZmxvb3Iobik7cmV0dXJuIE1hdGguY2VpbChuKX1mdW5jdGlvbiBhZGQoYSxiKXt2YXIgbF9hPWEubGVuZ3RoLGxfYj1iLmxlbmd0aCxyPW5ldyBBcnJheShsX2EpLGNhcnJ5PTAsYmFzZT1CQVNFLHN1bSxpO2ZvcihpPTA7aTxsX2I7aSsrKXtzdW09YVtpXStiW2ldK2NhcnJ5O2NhcnJ5PXN1bT49YmFzZT8xOjA7cltpXT1zdW0tY2FycnkqYmFzZX13aGlsZShpPGxfYSl7c3VtPWFbaV0rY2Fycnk7Y2Fycnk9c3VtPT09YmFzZT8xOjA7cltpKytdPXN1bS1jYXJyeSpiYXNlfWlmKGNhcnJ5PjApci5wdXNoKGNhcnJ5KTtyZXR1cm4gcn1mdW5jdGlvbiBhZGRBbnkoYSxiKXtpZihhLmxlbmd0aD49Yi5sZW5ndGgpcmV0dXJuIGFkZChhLGIpO3JldHVybiBhZGQoYixhKX1mdW5jdGlvbiBhZGRTbWFsbChhLGNhcnJ5KXt2YXIgbD1hLmxlbmd0aCxyPW5ldyBBcnJheShsKSxiYXNlPUJBU0Usc3VtLGk7Zm9yKGk9MDtpPGw7aSsrKXtzdW09YVtpXS1iYXNlK2NhcnJ5O2NhcnJ5PU1hdGguZmxvb3Ioc3VtL2Jhc2UpO3JbaV09c3VtLWNhcnJ5KmJhc2U7Y2FycnkrPTF9d2hpbGUoY2Fycnk+MCl7cltpKytdPWNhcnJ5JWJhc2U7Y2Fycnk9TWF0aC5mbG9vcihjYXJyeS9iYXNlKX1yZXR1cm4gcn1CaWdJbnRlZ2VyLnByb3RvdHlwZS5hZGQ9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KTtpZih0aGlzLnNpZ24hPT1uLnNpZ24pe3JldHVybiB0aGlzLnN1YnRyYWN0KG4ubmVnYXRlKCkpfXZhciBhPXRoaXMudmFsdWUsYj1uLnZhbHVlO2lmKG4uaXNTbWFsbCl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZFNtYWxsKGEsTWF0aC5hYnMoYikpLHRoaXMuc2lnbil9cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZEFueShhLGIpLHRoaXMuc2lnbil9O0JpZ0ludGVnZXIucHJvdG90eXBlLnBsdXM9QmlnSW50ZWdlci5wcm90b3R5cGUuYWRkO1NtYWxsSW50ZWdlci5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodik7dmFyIGE9dGhpcy52YWx1ZTtpZihhPDAhPT1uLnNpZ24pe3JldHVybiB0aGlzLnN1YnRyYWN0KG4ubmVnYXRlKCkpfXZhciBiPW4udmFsdWU7aWYobi5pc1NtYWxsKXtpZihpc1ByZWNpc2UoYStiKSlyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcihhK2IpO2I9c21hbGxUb0FycmF5KE1hdGguYWJzKGIpKX1yZXR1cm4gbmV3IEJpZ0ludGVnZXIoYWRkU21hbGwoYixNYXRoLmFicyhhKSksYTwwKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5wbHVzPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuYWRkO05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUrcGFyc2VWYWx1ZSh2KS52YWx1ZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUucGx1cz1OYXRpdmVCaWdJbnQucHJvdG90eXBlLmFkZDtmdW5jdGlvbiBzdWJ0cmFjdChhLGIpe3ZhciBhX2w9YS5sZW5ndGgsYl9sPWIubGVuZ3RoLHI9bmV3IEFycmF5KGFfbCksYm9ycm93PTAsYmFzZT1CQVNFLGksZGlmZmVyZW5jZTtmb3IoaT0wO2k8Yl9sO2krKyl7ZGlmZmVyZW5jZT1hW2ldLWJvcnJvdy1iW2ldO2lmKGRpZmZlcmVuY2U8MCl7ZGlmZmVyZW5jZSs9YmFzZTtib3Jyb3c9MX1lbHNlIGJvcnJvdz0wO3JbaV09ZGlmZmVyZW5jZX1mb3IoaT1iX2w7aTxhX2w7aSsrKXtkaWZmZXJlbmNlPWFbaV0tYm9ycm93O2lmKGRpZmZlcmVuY2U8MClkaWZmZXJlbmNlKz1iYXNlO2Vsc2V7cltpKytdPWRpZmZlcmVuY2U7YnJlYWt9cltpXT1kaWZmZXJlbmNlfWZvcig7aTxhX2w7aSsrKXtyW2ldPWFbaV19dHJpbShyKTtyZXR1cm4gcn1mdW5jdGlvbiBzdWJ0cmFjdEFueShhLGIsc2lnbil7dmFyIHZhbHVlO2lmKGNvbXBhcmVBYnMoYSxiKT49MCl7dmFsdWU9c3VidHJhY3QoYSxiKX1lbHNle3ZhbHVlPXN1YnRyYWN0KGIsYSk7c2lnbj0hc2lnbn12YWx1ZT1hcnJheVRvU21hbGwodmFsdWUpO2lmKHR5cGVvZiB2YWx1ZT09PSJudW1iZXIiKXtpZihzaWduKXZhbHVlPS12YWx1ZTtyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2YWx1ZSl9cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHZhbHVlLHNpZ24pfWZ1bmN0aW9uIHN1YnRyYWN0U21hbGwoYSxiLHNpZ24pe3ZhciBsPWEubGVuZ3RoLHI9bmV3IEFycmF5KGwpLGNhcnJ5PS1iLGJhc2U9QkFTRSxpLGRpZmZlcmVuY2U7Zm9yKGk9MDtpPGw7aSsrKXtkaWZmZXJlbmNlPWFbaV0rY2Fycnk7Y2Fycnk9TWF0aC5mbG9vcihkaWZmZXJlbmNlL2Jhc2UpO2RpZmZlcmVuY2UlPWJhc2U7cltpXT1kaWZmZXJlbmNlPDA/ZGlmZmVyZW5jZStiYXNlOmRpZmZlcmVuY2V9cj1hcnJheVRvU21hbGwocik7aWYodHlwZW9mIHI9PT0ibnVtYmVyIil7aWYoc2lnbilyPS1yO3JldHVybiBuZXcgU21hbGxJbnRlZ2VyKHIpfXJldHVybiBuZXcgQmlnSW50ZWdlcihyLHNpZ24pfUJpZ0ludGVnZXIucHJvdG90eXBlLnN1YnRyYWN0PWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodik7aWYodGhpcy5zaWduIT09bi5zaWduKXtyZXR1cm4gdGhpcy5hZGQobi5uZWdhdGUoKSl9dmFyIGE9dGhpcy52YWx1ZSxiPW4udmFsdWU7aWYobi5pc1NtYWxsKXJldHVybiBzdWJ0cmFjdFNtYWxsKGEsTWF0aC5hYnMoYiksdGhpcy5zaWduKTtyZXR1cm4gc3VidHJhY3RBbnkoYSxiLHRoaXMuc2lnbil9O0JpZ0ludGVnZXIucHJvdG90eXBlLm1pbnVzPUJpZ0ludGVnZXIucHJvdG90eXBlLnN1YnRyYWN0O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuc3VidHJhY3Q9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KTt2YXIgYT10aGlzLnZhbHVlO2lmKGE8MCE9PW4uc2lnbil7cmV0dXJuIHRoaXMuYWRkKG4ubmVnYXRlKCkpfXZhciBiPW4udmFsdWU7aWYobi5pc1NtYWxsKXtyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcihhLWIpfXJldHVybiBzdWJ0cmFjdFNtYWxsKGIsTWF0aC5hYnMoYSksYT49MCl9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUubWludXM9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5zdWJ0cmFjdDtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnN1YnRyYWN0PWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUtcGFyc2VWYWx1ZSh2KS52YWx1ZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubWludXM9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5zdWJ0cmFjdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5uZWdhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IEJpZ0ludGVnZXIodGhpcy52YWx1ZSwhdGhpcy5zaWduKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5uZWdhdGU9ZnVuY3Rpb24oKXt2YXIgc2lnbj10aGlzLnNpZ247dmFyIHNtYWxsPW5ldyBTbWFsbEludGVnZXIoLXRoaXMudmFsdWUpO3NtYWxsLnNpZ249IXNpZ247cmV0dXJuIHNtYWxsfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm5lZ2F0ZT1mdW5jdGlvbigpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KC10aGlzLnZhbHVlKX07QmlnSW50ZWdlci5wcm90b3R5cGUuYWJzPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHRoaXMudmFsdWUsZmFsc2UpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLmFicz1mdW5jdGlvbigpe3JldHVybiBuZXcgU21hbGxJbnRlZ2VyKE1hdGguYWJzKHRoaXMudmFsdWUpKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5hYnM9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlPj0wP3RoaXMudmFsdWU6LXRoaXMudmFsdWUpfTtmdW5jdGlvbiBtdWx0aXBseUxvbmcoYSxiKXt2YXIgYV9sPWEubGVuZ3RoLGJfbD1iLmxlbmd0aCxsPWFfbCtiX2wscj1jcmVhdGVBcnJheShsKSxiYXNlPUJBU0UscHJvZHVjdCxjYXJyeSxpLGFfaSxiX2o7Zm9yKGk9MDtpPGFfbDsrK2kpe2FfaT1hW2ldO2Zvcih2YXIgaj0wO2o8Yl9sOysrail7Yl9qPWJbal07cHJvZHVjdD1hX2kqYl9qK3JbaStqXTtjYXJyeT1NYXRoLmZsb29yKHByb2R1Y3QvYmFzZSk7cltpK2pdPXByb2R1Y3QtY2FycnkqYmFzZTtyW2kraisxXSs9Y2Fycnl9fXRyaW0ocik7cmV0dXJuIHJ9ZnVuY3Rpb24gbXVsdGlwbHlTbWFsbChhLGIpe3ZhciBsPWEubGVuZ3RoLHI9bmV3IEFycmF5KGwpLGJhc2U9QkFTRSxjYXJyeT0wLHByb2R1Y3QsaTtmb3IoaT0wO2k8bDtpKyspe3Byb2R1Y3Q9YVtpXSpiK2NhcnJ5O2NhcnJ5PU1hdGguZmxvb3IocHJvZHVjdC9iYXNlKTtyW2ldPXByb2R1Y3QtY2FycnkqYmFzZX13aGlsZShjYXJyeT4wKXtyW2krK109Y2FycnklYmFzZTtjYXJyeT1NYXRoLmZsb29yKGNhcnJ5L2Jhc2UpfXJldHVybiByfWZ1bmN0aW9uIHNoaWZ0TGVmdCh4LG4pe3ZhciByPVtdO3doaWxlKG4tLSA+MClyLnB1c2goMCk7cmV0dXJuIHIuY29uY2F0KHgpfWZ1bmN0aW9uIG11bHRpcGx5S2FyYXRzdWJhKHgseSl7dmFyIG49TWF0aC5tYXgoeC5sZW5ndGgseS5sZW5ndGgpO2lmKG48PTMwKXJldHVybiBtdWx0aXBseUxvbmcoeCx5KTtuPU1hdGguY2VpbChuLzIpO3ZhciBiPXguc2xpY2UobiksYT14LnNsaWNlKDAsbiksZD15LnNsaWNlKG4pLGM9eS5zbGljZSgwLG4pO3ZhciBhYz1tdWx0aXBseUthcmF0c3ViYShhLGMpLGJkPW11bHRpcGx5S2FyYXRzdWJhKGIsZCksYWJjZD1tdWx0aXBseUthcmF0c3ViYShhZGRBbnkoYSxiKSxhZGRBbnkoYyxkKSk7dmFyIHByb2R1Y3Q9YWRkQW55KGFkZEFueShhYyxzaGlmdExlZnQoc3VidHJhY3Qoc3VidHJhY3QoYWJjZCxhYyksYmQpLG4pKSxzaGlmdExlZnQoYmQsMipuKSk7dHJpbShwcm9kdWN0KTtyZXR1cm4gcHJvZHVjdH1mdW5jdGlvbiB1c2VLYXJhdHN1YmEobDEsbDIpe3JldHVybi0uMDEyKmwxLS4wMTIqbDIrMTVlLTYqbDEqbDI+MH1CaWdJbnRlZ2VyLnByb3RvdHlwZS5tdWx0aXBseT1mdW5jdGlvbih2KXt2YXIgbj1wYXJzZVZhbHVlKHYpLGE9dGhpcy52YWx1ZSxiPW4udmFsdWUsc2lnbj10aGlzLnNpZ24hPT1uLnNpZ24sYWJzO2lmKG4uaXNTbWFsbCl7aWYoYj09PTApcmV0dXJuIEludGVnZXJbMF07aWYoYj09PTEpcmV0dXJuIHRoaXM7aWYoYj09PS0xKXJldHVybiB0aGlzLm5lZ2F0ZSgpO2Ficz1NYXRoLmFicyhiKTtpZihhYnM8QkFTRSl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKG11bHRpcGx5U21hbGwoYSxhYnMpLHNpZ24pfWI9c21hbGxUb0FycmF5KGFicyl9aWYodXNlS2FyYXRzdWJhKGEubGVuZ3RoLGIubGVuZ3RoKSlyZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlLYXJhdHN1YmEoYSxiKSxzaWduKTtyZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlMb25nKGEsYiksc2lnbil9O0JpZ0ludGVnZXIucHJvdG90eXBlLnRpbWVzPUJpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5O2Z1bmN0aW9uIG11bHRpcGx5U21hbGxBbmRBcnJheShhLGIsc2lnbil7aWYoYTxCQVNFKXtyZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlTbWFsbChiLGEpLHNpZ24pfXJldHVybiBuZXcgQmlnSW50ZWdlcihtdWx0aXBseUxvbmcoYixzbWFsbFRvQXJyYXkoYSkpLHNpZ24pfVNtYWxsSW50ZWdlci5wcm90b3R5cGUuX211bHRpcGx5QnlTbWFsbD1mdW5jdGlvbihhKXtpZihpc1ByZWNpc2UoYS52YWx1ZSp0aGlzLnZhbHVlKSl7cmV0dXJuIG5ldyBTbWFsbEludGVnZXIoYS52YWx1ZSp0aGlzLnZhbHVlKX1yZXR1cm4gbXVsdGlwbHlTbWFsbEFuZEFycmF5KE1hdGguYWJzKGEudmFsdWUpLHNtYWxsVG9BcnJheShNYXRoLmFicyh0aGlzLnZhbHVlKSksdGhpcy5zaWduIT09YS5zaWduKX07QmlnSW50ZWdlci5wcm90b3R5cGUuX211bHRpcGx5QnlTbWFsbD1mdW5jdGlvbihhKXtpZihhLnZhbHVlPT09MClyZXR1cm4gSW50ZWdlclswXTtpZihhLnZhbHVlPT09MSlyZXR1cm4gdGhpcztpZihhLnZhbHVlPT09LTEpcmV0dXJuIHRoaXMubmVnYXRlKCk7cmV0dXJuIG11bHRpcGx5U21hbGxBbmRBcnJheShNYXRoLmFicyhhLnZhbHVlKSx0aGlzLnZhbHVlLHRoaXMuc2lnbiE9PWEuc2lnbil9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUubXVsdGlwbHk9ZnVuY3Rpb24odil7cmV0dXJuIHBhcnNlVmFsdWUodikuX211bHRpcGx5QnlTbWFsbCh0aGlzKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50aW1lcz1TbWFsbEludGVnZXIucHJvdG90eXBlLm11bHRpcGx5O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubXVsdGlwbHk9ZnVuY3Rpb24odil7cmV0dXJuIG5ldyBOYXRpdmVCaWdJbnQodGhpcy52YWx1ZSpwYXJzZVZhbHVlKHYpLnZhbHVlKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS50aW1lcz1OYXRpdmVCaWdJbnQucHJvdG90eXBlLm11bHRpcGx5O2Z1bmN0aW9uIHNxdWFyZShhKXt2YXIgbD1hLmxlbmd0aCxyPWNyZWF0ZUFycmF5KGwrbCksYmFzZT1CQVNFLHByb2R1Y3QsY2FycnksaSxhX2ksYV9qO2ZvcihpPTA7aTxsO2krKyl7YV9pPWFbaV07Y2Fycnk9MC1hX2kqYV9pO2Zvcih2YXIgaj1pO2o8bDtqKyspe2Ffaj1hW2pdO3Byb2R1Y3Q9MiooYV9pKmFfaikrcltpK2pdK2NhcnJ5O2NhcnJ5PU1hdGguZmxvb3IocHJvZHVjdC9iYXNlKTtyW2kral09cHJvZHVjdC1jYXJyeSpiYXNlfXJbaStsXT1jYXJyeX10cmltKHIpO3JldHVybiByfUJpZ0ludGVnZXIucHJvdG90eXBlLnNxdWFyZT1mdW5jdGlvbigpe3JldHVybiBuZXcgQmlnSW50ZWdlcihzcXVhcmUodGhpcy52YWx1ZSksZmFsc2UpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLnNxdWFyZT1mdW5jdGlvbigpe3ZhciB2YWx1ZT10aGlzLnZhbHVlKnRoaXMudmFsdWU7aWYoaXNQcmVjaXNlKHZhbHVlKSlyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2YWx1ZSk7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHNxdWFyZShzbWFsbFRvQXJyYXkoTWF0aC5hYnModGhpcy52YWx1ZSkpKSxmYWxzZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuc3F1YXJlPWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUqdGhpcy52YWx1ZSl9O2Z1bmN0aW9uIGRpdk1vZDEoYSxiKXt2YXIgYV9sPWEubGVuZ3RoLGJfbD1iLmxlbmd0aCxiYXNlPUJBU0UscmVzdWx0PWNyZWF0ZUFycmF5KGIubGVuZ3RoKSxkaXZpc29yTW9zdFNpZ25pZmljYW50RGlnaXQ9YltiX2wtMV0sbGFtYmRhPU1hdGguY2VpbChiYXNlLygyKmRpdmlzb3JNb3N0U2lnbmlmaWNhbnREaWdpdCkpLHJlbWFpbmRlcj1tdWx0aXBseVNtYWxsKGEsbGFtYmRhKSxkaXZpc29yPW11bHRpcGx5U21hbGwoYixsYW1iZGEpLHF1b3RpZW50RGlnaXQsc2hpZnQsY2FycnksYm9ycm93LGksbCxxO2lmKHJlbWFpbmRlci5sZW5ndGg8PWFfbClyZW1haW5kZXIucHVzaCgwKTtkaXZpc29yLnB1c2goMCk7ZGl2aXNvck1vc3RTaWduaWZpY2FudERpZ2l0PWRpdmlzb3JbYl9sLTFdO2ZvcihzaGlmdD1hX2wtYl9sO3NoaWZ0Pj0wO3NoaWZ0LS0pe3F1b3RpZW50RGlnaXQ9YmFzZS0xO2lmKHJlbWFpbmRlcltzaGlmdCtiX2xdIT09ZGl2aXNvck1vc3RTaWduaWZpY2FudERpZ2l0KXtxdW90aWVudERpZ2l0PU1hdGguZmxvb3IoKHJlbWFpbmRlcltzaGlmdCtiX2xdKmJhc2UrcmVtYWluZGVyW3NoaWZ0K2JfbC0xXSkvZGl2aXNvck1vc3RTaWduaWZpY2FudERpZ2l0KX1jYXJyeT0wO2JvcnJvdz0wO2w9ZGl2aXNvci5sZW5ndGg7Zm9yKGk9MDtpPGw7aSsrKXtjYXJyeSs9cXVvdGllbnREaWdpdCpkaXZpc29yW2ldO3E9TWF0aC5mbG9vcihjYXJyeS9iYXNlKTtib3Jyb3crPXJlbWFpbmRlcltzaGlmdCtpXS0oY2FycnktcSpiYXNlKTtjYXJyeT1xO2lmKGJvcnJvdzwwKXtyZW1haW5kZXJbc2hpZnQraV09Ym9ycm93K2Jhc2U7Ym9ycm93PS0xfWVsc2V7cmVtYWluZGVyW3NoaWZ0K2ldPWJvcnJvdztib3Jyb3c9MH19d2hpbGUoYm9ycm93IT09MCl7cXVvdGllbnREaWdpdC09MTtjYXJyeT0wO2ZvcihpPTA7aTxsO2krKyl7Y2FycnkrPXJlbWFpbmRlcltzaGlmdCtpXS1iYXNlK2Rpdmlzb3JbaV07aWYoY2Fycnk8MCl7cmVtYWluZGVyW3NoaWZ0K2ldPWNhcnJ5K2Jhc2U7Y2Fycnk9MH1lbHNle3JlbWFpbmRlcltzaGlmdCtpXT1jYXJyeTtjYXJyeT0xfX1ib3Jyb3crPWNhcnJ5fXJlc3VsdFtzaGlmdF09cXVvdGllbnREaWdpdH1yZW1haW5kZXI9ZGl2TW9kU21hbGwocmVtYWluZGVyLGxhbWJkYSlbMF07cmV0dXJuW2FycmF5VG9TbWFsbChyZXN1bHQpLGFycmF5VG9TbWFsbChyZW1haW5kZXIpXX1mdW5jdGlvbiBkaXZNb2QyKGEsYil7dmFyIGFfbD1hLmxlbmd0aCxiX2w9Yi5sZW5ndGgscmVzdWx0PVtdLHBhcnQ9W10sYmFzZT1CQVNFLGd1ZXNzLHhsZW4saGlnaHgsaGlnaHksY2hlY2s7d2hpbGUoYV9sKXtwYXJ0LnVuc2hpZnQoYVstLWFfbF0pO3RyaW0ocGFydCk7aWYoY29tcGFyZUFicyhwYXJ0LGIpPDApe3Jlc3VsdC5wdXNoKDApO2NvbnRpbnVlfXhsZW49cGFydC5sZW5ndGg7aGlnaHg9cGFydFt4bGVuLTFdKmJhc2UrcGFydFt4bGVuLTJdO2hpZ2h5PWJbYl9sLTFdKmJhc2UrYltiX2wtMl07aWYoeGxlbj5iX2wpe2hpZ2h4PShoaWdoeCsxKSpiYXNlfWd1ZXNzPU1hdGguY2VpbChoaWdoeC9oaWdoeSk7ZG97Y2hlY2s9bXVsdGlwbHlTbWFsbChiLGd1ZXNzKTtpZihjb21wYXJlQWJzKGNoZWNrLHBhcnQpPD0wKWJyZWFrO2d1ZXNzLS19d2hpbGUoZ3Vlc3MpO3Jlc3VsdC5wdXNoKGd1ZXNzKTtwYXJ0PXN1YnRyYWN0KHBhcnQsY2hlY2spfXJlc3VsdC5yZXZlcnNlKCk7cmV0dXJuW2FycmF5VG9TbWFsbChyZXN1bHQpLGFycmF5VG9TbWFsbChwYXJ0KV19ZnVuY3Rpb24gZGl2TW9kU21hbGwodmFsdWUsbGFtYmRhKXt2YXIgbGVuZ3RoPXZhbHVlLmxlbmd0aCxxdW90aWVudD1jcmVhdGVBcnJheShsZW5ndGgpLGJhc2U9QkFTRSxpLHEscmVtYWluZGVyLGRpdmlzb3I7cmVtYWluZGVyPTA7Zm9yKGk9bGVuZ3RoLTE7aT49MDstLWkpe2Rpdmlzb3I9cmVtYWluZGVyKmJhc2UrdmFsdWVbaV07cT10cnVuY2F0ZShkaXZpc29yL2xhbWJkYSk7cmVtYWluZGVyPWRpdmlzb3ItcSpsYW1iZGE7cXVvdGllbnRbaV09cXwwfXJldHVybltxdW90aWVudCxyZW1haW5kZXJ8MF19ZnVuY3Rpb24gZGl2TW9kQW55KHNlbGYsdil7dmFyIHZhbHVlLG49cGFyc2VWYWx1ZSh2KTtpZihzdXBwb3J0c05hdGl2ZUJpZ0ludCl7cmV0dXJuW25ldyBOYXRpdmVCaWdJbnQoc2VsZi52YWx1ZS9uLnZhbHVlKSxuZXcgTmF0aXZlQmlnSW50KHNlbGYudmFsdWUlbi52YWx1ZSldfXZhciBhPXNlbGYudmFsdWUsYj1uLnZhbHVlO3ZhciBxdW90aWVudDtpZihiPT09MCl0aHJvdyBuZXcgRXJyb3IoIkNhbm5vdCBkaXZpZGUgYnkgemVybyIpO2lmKHNlbGYuaXNTbWFsbCl7aWYobi5pc1NtYWxsKXtyZXR1cm5bbmV3IFNtYWxsSW50ZWdlcih0cnVuY2F0ZShhL2IpKSxuZXcgU21hbGxJbnRlZ2VyKGElYildfXJldHVybltJbnRlZ2VyWzBdLHNlbGZdfWlmKG4uaXNTbWFsbCl7aWYoYj09PTEpcmV0dXJuW3NlbGYsSW50ZWdlclswXV07aWYoYj09LTEpcmV0dXJuW3NlbGYubmVnYXRlKCksSW50ZWdlclswXV07dmFyIGFicz1NYXRoLmFicyhiKTtpZihhYnM8QkFTRSl7dmFsdWU9ZGl2TW9kU21hbGwoYSxhYnMpO3F1b3RpZW50PWFycmF5VG9TbWFsbCh2YWx1ZVswXSk7dmFyIHJlbWFpbmRlcj12YWx1ZVsxXTtpZihzZWxmLnNpZ24pcmVtYWluZGVyPS1yZW1haW5kZXI7aWYodHlwZW9mIHF1b3RpZW50PT09Im51bWJlciIpe2lmKHNlbGYuc2lnbiE9PW4uc2lnbilxdW90aWVudD0tcXVvdGllbnQ7cmV0dXJuW25ldyBTbWFsbEludGVnZXIocXVvdGllbnQpLG5ldyBTbWFsbEludGVnZXIocmVtYWluZGVyKV19cmV0dXJuW25ldyBCaWdJbnRlZ2VyKHF1b3RpZW50LHNlbGYuc2lnbiE9PW4uc2lnbiksbmV3IFNtYWxsSW50ZWdlcihyZW1haW5kZXIpXX1iPXNtYWxsVG9BcnJheShhYnMpfXZhciBjb21wYXJpc29uPWNvbXBhcmVBYnMoYSxiKTtpZihjb21wYXJpc29uPT09LTEpcmV0dXJuW0ludGVnZXJbMF0sc2VsZl07aWYoY29tcGFyaXNvbj09PTApcmV0dXJuW0ludGVnZXJbc2VsZi5zaWduPT09bi5zaWduPzE6LTFdLEludGVnZXJbMF1dO2lmKGEubGVuZ3RoK2IubGVuZ3RoPD0yMDApdmFsdWU9ZGl2TW9kMShhLGIpO2Vsc2UgdmFsdWU9ZGl2TW9kMihhLGIpO3F1b3RpZW50PXZhbHVlWzBdO3ZhciBxU2lnbj1zZWxmLnNpZ24hPT1uLnNpZ24sbW9kPXZhbHVlWzFdLG1TaWduPXNlbGYuc2lnbjtpZih0eXBlb2YgcXVvdGllbnQ9PT0ibnVtYmVyIil7aWYocVNpZ24pcXVvdGllbnQ9LXF1b3RpZW50O3F1b3RpZW50PW5ldyBTbWFsbEludGVnZXIocXVvdGllbnQpfWVsc2UgcXVvdGllbnQ9bmV3IEJpZ0ludGVnZXIocXVvdGllbnQscVNpZ24pO2lmKHR5cGVvZiBtb2Q9PT0ibnVtYmVyIil7aWYobVNpZ24pbW9kPS1tb2Q7bW9kPW5ldyBTbWFsbEludGVnZXIobW9kKX1lbHNlIG1vZD1uZXcgQmlnSW50ZWdlcihtb2QsbVNpZ24pO3JldHVybltxdW90aWVudCxtb2RdfUJpZ0ludGVnZXIucHJvdG90eXBlLmRpdm1vZD1mdW5jdGlvbih2KXt2YXIgcmVzdWx0PWRpdk1vZEFueSh0aGlzLHYpO3JldHVybntxdW90aWVudDpyZXN1bHRbMF0scmVtYWluZGVyOnJlc3VsdFsxXX19O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZGl2bW9kPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZGl2bW9kPUJpZ0ludGVnZXIucHJvdG90eXBlLmRpdm1vZDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZpZGU9ZnVuY3Rpb24odil7cmV0dXJuIGRpdk1vZEFueSh0aGlzLHYpWzBdfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm92ZXI9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5kaXZpZGU9ZnVuY3Rpb24odil7cmV0dXJuIG5ldyBOYXRpdmVCaWdJbnQodGhpcy52YWx1ZS9wYXJzZVZhbHVlKHYpLnZhbHVlKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5vdmVyPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZGl2aWRlPUJpZ0ludGVnZXIucHJvdG90eXBlLm92ZXI9QmlnSW50ZWdlci5wcm90b3R5cGUuZGl2aWRlO0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZD1mdW5jdGlvbih2KXtyZXR1cm4gZGl2TW9kQW55KHRoaXMsdilbMV19O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubW9kPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUucmVtYWluZGVyPWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUlcGFyc2VWYWx1ZSh2KS52YWx1ZSl9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUucmVtYWluZGVyPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubW9kPUJpZ0ludGVnZXIucHJvdG90eXBlLnJlbWFpbmRlcj1CaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2Q7QmlnSW50ZWdlci5wcm90b3R5cGUucG93PWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodiksYT10aGlzLnZhbHVlLGI9bi52YWx1ZSx2YWx1ZSx4LHk7aWYoYj09PTApcmV0dXJuIEludGVnZXJbMV07aWYoYT09PTApcmV0dXJuIEludGVnZXJbMF07aWYoYT09PTEpcmV0dXJuIEludGVnZXJbMV07aWYoYT09PS0xKXJldHVybiBuLmlzRXZlbigpP0ludGVnZXJbMV06SW50ZWdlclstMV07aWYobi5zaWduKXtyZXR1cm4gSW50ZWdlclswXX1pZighbi5pc1NtYWxsKXRocm93IG5ldyBFcnJvcigiVGhlIGV4cG9uZW50ICIrbi50b1N0cmluZygpKyIgaXMgdG9vIGxhcmdlLiIpO2lmKHRoaXMuaXNTbWFsbCl7aWYoaXNQcmVjaXNlKHZhbHVlPU1hdGgucG93KGEsYikpKXJldHVybiBuZXcgU21hbGxJbnRlZ2VyKHRydW5jYXRlKHZhbHVlKSl9eD10aGlzO3k9SW50ZWdlclsxXTt3aGlsZSh0cnVlKXtpZihiJjE9PT0xKXt5PXkudGltZXMoeCk7LS1ifWlmKGI9PT0wKWJyZWFrO2IvPTI7eD14LnNxdWFyZSgpfXJldHVybiB5fTtTbWFsbEludGVnZXIucHJvdG90eXBlLnBvdz1CaWdJbnRlZ2VyLnByb3RvdHlwZS5wb3c7TmF0aXZlQmlnSW50LnByb3RvdHlwZS5wb3c9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KTt2YXIgYT10aGlzLnZhbHVlLGI9bi52YWx1ZTt2YXIgXzA9QmlnSW50KDApLF8xPUJpZ0ludCgxKSxfMj1CaWdJbnQoMik7aWYoYj09PV8wKXJldHVybiBJbnRlZ2VyWzFdO2lmKGE9PT1fMClyZXR1cm4gSW50ZWdlclswXTtpZihhPT09XzEpcmV0dXJuIEludGVnZXJbMV07aWYoYT09PUJpZ0ludCgtMSkpcmV0dXJuIG4uaXNFdmVuKCk/SW50ZWdlclsxXTpJbnRlZ2VyWy0xXTtpZihuLmlzTmVnYXRpdmUoKSlyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludChfMCk7dmFyIHg9dGhpczt2YXIgeT1JbnRlZ2VyWzFdO3doaWxlKHRydWUpe2lmKChiJl8xKT09PV8xKXt5PXkudGltZXMoeCk7LS1ifWlmKGI9PT1fMClicmVhaztiLz1fMjt4PXguc3F1YXJlKCl9cmV0dXJuIHl9O0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZFBvdz1mdW5jdGlvbihleHAsbW9kKXtleHA9cGFyc2VWYWx1ZShleHApO21vZD1wYXJzZVZhbHVlKG1vZCk7aWYobW9kLmlzWmVybygpKXRocm93IG5ldyBFcnJvcigiQ2Fubm90IHRha2UgbW9kUG93IHdpdGggbW9kdWx1cyAwIik7dmFyIHI9SW50ZWdlclsxXSxiYXNlPXRoaXMubW9kKG1vZCk7aWYoZXhwLmlzTmVnYXRpdmUoKSl7ZXhwPWV4cC5tdWx0aXBseShJbnRlZ2VyWy0xXSk7YmFzZT1iYXNlLm1vZEludihtb2QpfXdoaWxlKGV4cC5pc1Bvc2l0aXZlKCkpe2lmKGJhc2UuaXNaZXJvKCkpcmV0dXJuIEludGVnZXJbMF07aWYoZXhwLmlzT2RkKCkpcj1yLm11bHRpcGx5KGJhc2UpLm1vZChtb2QpO2V4cD1leHAuZGl2aWRlKDIpO2Jhc2U9YmFzZS5zcXVhcmUoKS5tb2QobW9kKX1yZXR1cm4gcn07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5tb2RQb3c9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5tb2RQb3c9QmlnSW50ZWdlci5wcm90b3R5cGUubW9kUG93O2Z1bmN0aW9uIGNvbXBhcmVBYnMoYSxiKXtpZihhLmxlbmd0aCE9PWIubGVuZ3RoKXtyZXR1cm4gYS5sZW5ndGg+Yi5sZW5ndGg/MTotMX1mb3IodmFyIGk9YS5sZW5ndGgtMTtpPj0wO2ktLSl7aWYoYVtpXSE9PWJbaV0pcmV0dXJuIGFbaV0+YltpXT8xOi0xfXJldHVybiAwfUJpZ0ludGVnZXIucHJvdG90eXBlLmNvbXBhcmVBYnM9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KSxhPXRoaXMudmFsdWUsYj1uLnZhbHVlO2lmKG4uaXNTbWFsbClyZXR1cm4gMTtyZXR1cm4gY29tcGFyZUFicyhhLGIpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLmNvbXBhcmVBYnM9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KSxhPU1hdGguYWJzKHRoaXMudmFsdWUpLGI9bi52YWx1ZTtpZihuLmlzU21hbGwpe2I9TWF0aC5hYnMoYik7cmV0dXJuIGE9PT1iPzA6YT5iPzE6LTF9cmV0dXJuLTF9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuY29tcGFyZUFicz1mdW5jdGlvbih2KXt2YXIgYT10aGlzLnZhbHVlO3ZhciBiPXBhcnNlVmFsdWUodikudmFsdWU7YT1hPj0wP2E6LWE7Yj1iPj0wP2I6LWI7cmV0dXJuIGE9PT1iPzA6YT5iPzE6LTF9O0JpZ0ludGVnZXIucHJvdG90eXBlLmNvbXBhcmU9ZnVuY3Rpb24odil7aWYodj09PUluZmluaXR5KXtyZXR1cm4tMX1pZih2PT09LUluZmluaXR5KXtyZXR1cm4gMX12YXIgbj1wYXJzZVZhbHVlKHYpLGE9dGhpcy52YWx1ZSxiPW4udmFsdWU7aWYodGhpcy5zaWduIT09bi5zaWduKXtyZXR1cm4gbi5zaWduPzE6LTF9aWYobi5pc1NtYWxsKXtyZXR1cm4gdGhpcy5zaWduPy0xOjF9cmV0dXJuIGNvbXBhcmVBYnMoYSxiKSoodGhpcy5zaWduPy0xOjEpfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlVG89QmlnSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZTtTbWFsbEludGVnZXIucHJvdG90eXBlLmNvbXBhcmU9ZnVuY3Rpb24odil7aWYodj09PUluZmluaXR5KXtyZXR1cm4tMX1pZih2PT09LUluZmluaXR5KXtyZXR1cm4gMX12YXIgbj1wYXJzZVZhbHVlKHYpLGE9dGhpcy52YWx1ZSxiPW4udmFsdWU7aWYobi5pc1NtYWxsKXtyZXR1cm4gYT09Yj8wOmE+Yj8xOi0xfWlmKGE8MCE9PW4uc2lnbil7cmV0dXJuIGE8MD8tMToxfXJldHVybiBhPDA/MTotMX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlVG89U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlO05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuY29tcGFyZT1mdW5jdGlvbih2KXtpZih2PT09SW5maW5pdHkpe3JldHVybi0xfWlmKHY9PT0tSW5maW5pdHkpe3JldHVybiAxfXZhciBhPXRoaXMudmFsdWU7dmFyIGI9cGFyc2VWYWx1ZSh2KS52YWx1ZTtyZXR1cm4gYT09PWI/MDphPmI/MTotMX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5jb21wYXJlVG89TmF0aXZlQmlnSW50LnByb3RvdHlwZS5jb21wYXJlO0JpZ0ludGVnZXIucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbih2KXtyZXR1cm4gdGhpcy5jb21wYXJlKHYpPT09MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5lcT1OYXRpdmVCaWdJbnQucHJvdG90eXBlLmVxdWFscz1TbWFsbEludGVnZXIucHJvdG90eXBlLmVxPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZXF1YWxzPUJpZ0ludGVnZXIucHJvdG90eXBlLmVxPUJpZ0ludGVnZXIucHJvdG90eXBlLmVxdWFscztCaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3RFcXVhbHM9ZnVuY3Rpb24odil7cmV0dXJuIHRoaXMuY29tcGFyZSh2KSE9PTB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubmVxPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUubm90RXF1YWxzPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubmVxPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubm90RXF1YWxzPUJpZ0ludGVnZXIucHJvdG90eXBlLm5lcT1CaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3RFcXVhbHM7QmlnSW50ZWdlci5wcm90b3R5cGUuZ3JlYXRlcj1mdW5jdGlvbih2KXtyZXR1cm4gdGhpcy5jb21wYXJlKHYpPjB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZ3Q9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5ncmVhdGVyPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZ3Q9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyPUJpZ0ludGVnZXIucHJvdG90eXBlLmd0PUJpZ0ludGVnZXIucHJvdG90eXBlLmdyZWF0ZXI7QmlnSW50ZWdlci5wcm90b3R5cGUubGVzc2VyPWZ1bmN0aW9uKHYpe3JldHVybiB0aGlzLmNvbXBhcmUodik8MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5sdD1OYXRpdmVCaWdJbnQucHJvdG90eXBlLmxlc3Nlcj1TbWFsbEludGVnZXIucHJvdG90eXBlLmx0PVNtYWxsSW50ZWdlci5wcm90b3R5cGUubGVzc2VyPUJpZ0ludGVnZXIucHJvdG90eXBlLmx0PUJpZ0ludGVnZXIucHJvdG90eXBlLmxlc3NlcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyT3JFcXVhbHM9ZnVuY3Rpb24odil7cmV0dXJuIHRoaXMuY29tcGFyZSh2KT49MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5nZXE9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5ncmVhdGVyT3JFcXVhbHM9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5nZXE9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyT3JFcXVhbHM9QmlnSW50ZWdlci5wcm90b3R5cGUuZ2VxPUJpZ0ludGVnZXIucHJvdG90eXBlLmdyZWF0ZXJPckVxdWFscztCaWdJbnRlZ2VyLnByb3RvdHlwZS5sZXNzZXJPckVxdWFscz1mdW5jdGlvbih2KXtyZXR1cm4gdGhpcy5jb21wYXJlKHYpPD0wfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmxlcT1OYXRpdmVCaWdJbnQucHJvdG90eXBlLmxlc3Nlck9yRXF1YWxzPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubGVxPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubGVzc2VyT3JFcXVhbHM9QmlnSW50ZWdlci5wcm90b3R5cGUubGVxPUJpZ0ludGVnZXIucHJvdG90eXBlLmxlc3Nlck9yRXF1YWxzO0JpZ0ludGVnZXIucHJvdG90eXBlLmlzRXZlbj1mdW5jdGlvbigpe3JldHVybih0aGlzLnZhbHVlWzBdJjEpPT09MH07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc0V2ZW49ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZSYxKT09PTB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNFdmVuPWZ1bmN0aW9uKCl7cmV0dXJuKHRoaXMudmFsdWUmQmlnSW50KDEpKT09PUJpZ0ludCgwKX07QmlnSW50ZWdlci5wcm90b3R5cGUuaXNPZGQ9ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZVswXSYxKT09PTF9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNPZGQ9ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZSYxKT09PTF9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNPZGQ9ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZSZCaWdJbnQoMSkpPT09QmlnSW50KDEpfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1Bvc2l0aXZlPWZ1bmN0aW9uKCl7cmV0dXJuIXRoaXMuc2lnbn07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc1Bvc2l0aXZlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWU+MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc1Bvc2l0aXZlPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNQb3NpdGl2ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc05lZ2F0aXZlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2lnbn07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc05lZ2F0aXZlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWU8MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc05lZ2F0aXZlPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNOZWdhdGl2ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1VuaXQ9ZnVuY3Rpb24oKXtyZXR1cm4gZmFsc2V9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNVbml0PWZ1bmN0aW9uKCl7cmV0dXJuIE1hdGguYWJzKHRoaXMudmFsdWUpPT09MX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc1VuaXQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5hYnMoKS52YWx1ZT09PUJpZ0ludCgxKX07QmlnSW50ZWdlci5wcm90b3R5cGUuaXNaZXJvPWZ1bmN0aW9uKCl7cmV0dXJuIGZhbHNlfTtTbWFsbEludGVnZXIucHJvdG90eXBlLmlzWmVybz1mdW5jdGlvbigpe3JldHVybiB0aGlzLnZhbHVlPT09MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc1plcm89ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy52YWx1ZT09PUJpZ0ludCgwKX07QmlnSW50ZWdlci5wcm90b3R5cGUuaXNEaXZpc2libGVCeT1mdW5jdGlvbih2KXt2YXIgbj1wYXJzZVZhbHVlKHYpO2lmKG4uaXNaZXJvKCkpcmV0dXJuIGZhbHNlO2lmKG4uaXNVbml0KCkpcmV0dXJuIHRydWU7aWYobi5jb21wYXJlQWJzKDIpPT09MClyZXR1cm4gdGhpcy5pc0V2ZW4oKTtyZXR1cm4gdGhpcy5tb2QobikuaXNaZXJvKCl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNEaXZpc2libGVCeT1TbWFsbEludGVnZXIucHJvdG90eXBlLmlzRGl2aXNpYmxlQnk9QmlnSW50ZWdlci5wcm90b3R5cGUuaXNEaXZpc2libGVCeTtmdW5jdGlvbiBpc0Jhc2ljUHJpbWUodil7dmFyIG49di5hYnMoKTtpZihuLmlzVW5pdCgpKXJldHVybiBmYWxzZTtpZihuLmVxdWFscygyKXx8bi5lcXVhbHMoMyl8fG4uZXF1YWxzKDUpKXJldHVybiB0cnVlO2lmKG4uaXNFdmVuKCl8fG4uaXNEaXZpc2libGVCeSgzKXx8bi5pc0RpdmlzaWJsZUJ5KDUpKXJldHVybiBmYWxzZTtpZihuLmxlc3Nlcig0OSkpcmV0dXJuIHRydWV9ZnVuY3Rpb24gbWlsbGVyUmFiaW5UZXN0KG4sYSl7dmFyIG5QcmV2PW4ucHJldigpLGI9blByZXYscj0wLGQsdCxpLHg7d2hpbGUoYi5pc0V2ZW4oKSliPWIuZGl2aWRlKDIpLHIrKztuZXh0OmZvcihpPTA7aTxhLmxlbmd0aDtpKyspe2lmKG4ubGVzc2VyKGFbaV0pKWNvbnRpbnVlO3g9YmlnSW50KGFbaV0pLm1vZFBvdyhiLG4pO2lmKHguaXNVbml0KCl8fHguZXF1YWxzKG5QcmV2KSljb250aW51ZTtmb3IoZD1yLTE7ZCE9MDtkLS0pe3g9eC5zcXVhcmUoKS5tb2Qobik7aWYoeC5pc1VuaXQoKSlyZXR1cm4gZmFsc2U7aWYoeC5lcXVhbHMoblByZXYpKWNvbnRpbnVlIG5leHR9cmV0dXJuIGZhbHNlfXJldHVybiB0cnVlfUJpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJpbWU9ZnVuY3Rpb24oc3RyaWN0KXt2YXIgaXNQcmltZT1pc0Jhc2ljUHJpbWUodGhpcyk7aWYoaXNQcmltZSE9PXVuZGVmaW5lZClyZXR1cm4gaXNQcmltZTt2YXIgbj10aGlzLmFicygpO3ZhciBiaXRzPW4uYml0TGVuZ3RoKCk7aWYoYml0czw9NjQpcmV0dXJuIG1pbGxlclJhYmluVGVzdChuLFsyLDMsNSw3LDExLDEzLDE3LDE5LDIzLDI5LDMxLDM3XSk7dmFyIGxvZ049TWF0aC5sb2coMikqYml0cy50b0pTTnVtYmVyKCk7dmFyIHQ9TWF0aC5jZWlsKHN0cmljdD09PXRydWU/MipNYXRoLnBvdyhsb2dOLDIpOmxvZ04pO2Zvcih2YXIgYT1bXSxpPTA7aTx0O2krKyl7YS5wdXNoKGJpZ0ludChpKzIpKX1yZXR1cm4gbWlsbGVyUmFiaW5UZXN0KG4sYSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNQcmltZT1TbWFsbEludGVnZXIucHJvdG90eXBlLmlzUHJpbWU9QmlnSW50ZWdlci5wcm90b3R5cGUuaXNQcmltZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1Byb2JhYmxlUHJpbWU9ZnVuY3Rpb24oaXRlcmF0aW9ucyxybmcpe3ZhciBpc1ByaW1lPWlzQmFzaWNQcmltZSh0aGlzKTtpZihpc1ByaW1lIT09dW5kZWZpbmVkKXJldHVybiBpc1ByaW1lO3ZhciBuPXRoaXMuYWJzKCk7dmFyIHQ9aXRlcmF0aW9ucz09PXVuZGVmaW5lZD81Oml0ZXJhdGlvbnM7Zm9yKHZhciBhPVtdLGk9MDtpPHQ7aSsrKXthLnB1c2goYmlnSW50LnJhbmRCZXR3ZWVuKDIsbi5taW51cygyKSxybmcpKX1yZXR1cm4gbWlsbGVyUmFiaW5UZXN0KG4sYSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNQcm9iYWJsZVByaW1lPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNQcm9iYWJsZVByaW1lPUJpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJvYmFibGVQcmltZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RJbnY9ZnVuY3Rpb24obil7dmFyIHQ9YmlnSW50Lnplcm8sbmV3VD1iaWdJbnQub25lLHI9cGFyc2VWYWx1ZShuKSxuZXdSPXRoaXMuYWJzKCkscSxsYXN0VCxsYXN0Ujt3aGlsZSghbmV3Ui5pc1plcm8oKSl7cT1yLmRpdmlkZShuZXdSKTtsYXN0VD10O2xhc3RSPXI7dD1uZXdUO3I9bmV3UjtuZXdUPWxhc3RULnN1YnRyYWN0KHEubXVsdGlwbHkobmV3VCkpO25ld1I9bGFzdFIuc3VidHJhY3QocS5tdWx0aXBseShuZXdSKSl9aWYoIXIuaXNVbml0KCkpdGhyb3cgbmV3IEVycm9yKHRoaXMudG9TdHJpbmcoKSsiIGFuZCAiK24udG9TdHJpbmcoKSsiIGFyZSBub3QgY28tcHJpbWUiKTtpZih0LmNvbXBhcmUoMCk9PT0tMSl7dD10LmFkZChuKX1pZih0aGlzLmlzTmVnYXRpdmUoKSl7cmV0dXJuIHQubmVnYXRlKCl9cmV0dXJuIHR9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubW9kSW52PVNtYWxsSW50ZWdlci5wcm90b3R5cGUubW9kSW52PUJpZ0ludGVnZXIucHJvdG90eXBlLm1vZEludjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIHZhbHVlPXRoaXMudmFsdWU7aWYodGhpcy5zaWduKXtyZXR1cm4gc3VidHJhY3RTbWFsbCh2YWx1ZSwxLHRoaXMuc2lnbil9cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZFNtYWxsKHZhbHVlLDEpLHRoaXMuc2lnbil9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUubmV4dD1mdW5jdGlvbigpe3ZhciB2YWx1ZT10aGlzLnZhbHVlO2lmKHZhbHVlKzE8TUFYX0lOVClyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2YWx1ZSsxKTtyZXR1cm4gbmV3IEJpZ0ludGVnZXIoTUFYX0lOVF9BUlIsZmFsc2UpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm5leHQ9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlK0JpZ0ludCgxKSl9O0JpZ0ludGVnZXIucHJvdG90eXBlLnByZXY9ZnVuY3Rpb24oKXt2YXIgdmFsdWU9dGhpcy52YWx1ZTtpZih0aGlzLnNpZ24pe3JldHVybiBuZXcgQmlnSW50ZWdlcihhZGRTbWFsbCh2YWx1ZSwxKSx0cnVlKX1yZXR1cm4gc3VidHJhY3RTbWFsbCh2YWx1ZSwxLHRoaXMuc2lnbil9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUucHJldj1mdW5jdGlvbigpe3ZhciB2YWx1ZT10aGlzLnZhbHVlO2lmKHZhbHVlLTE+LU1BWF9JTlQpcmV0dXJuIG5ldyBTbWFsbEludGVnZXIodmFsdWUtMSk7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKE1BWF9JTlRfQVJSLHRydWUpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnByZXY9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlLUJpZ0ludCgxKSl9O3ZhciBwb3dlcnNPZlR3bz1bMV07d2hpbGUoMipwb3dlcnNPZlR3b1twb3dlcnNPZlR3by5sZW5ndGgtMV08PUJBU0UpcG93ZXJzT2ZUd28ucHVzaCgyKnBvd2Vyc09mVHdvW3Bvd2Vyc09mVHdvLmxlbmd0aC0xXSk7dmFyIHBvd2VyczJMZW5ndGg9cG93ZXJzT2ZUd28ubGVuZ3RoLGhpZ2hlc3RQb3dlcjI9cG93ZXJzT2ZUd29bcG93ZXJzMkxlbmd0aC0xXTtmdW5jdGlvbiBzaGlmdF9pc1NtYWxsKG4pe3JldHVybiBNYXRoLmFicyhuKTw9QkFTRX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdExlZnQ9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KS50b0pTTnVtYmVyKCk7aWYoIXNoaWZ0X2lzU21hbGwobikpe3Rocm93IG5ldyBFcnJvcihTdHJpbmcobikrIiBpcyB0b28gbGFyZ2UgZm9yIHNoaWZ0aW5nLiIpfWlmKG48MClyZXR1cm4gdGhpcy5zaGlmdFJpZ2h0KC1uKTt2YXIgcmVzdWx0PXRoaXM7aWYocmVzdWx0LmlzWmVybygpKXJldHVybiByZXN1bHQ7d2hpbGUobj49cG93ZXJzMkxlbmd0aCl7cmVzdWx0PXJlc3VsdC5tdWx0aXBseShoaWdoZXN0UG93ZXIyKTtuLT1wb3dlcnMyTGVuZ3RoLTF9cmV0dXJuIHJlc3VsdC5tdWx0aXBseShwb3dlcnNPZlR3b1tuXSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuc2hpZnRMZWZ0PVNtYWxsSW50ZWdlci5wcm90b3R5cGUuc2hpZnRMZWZ0PUJpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0TGVmdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdFJpZ2h0PWZ1bmN0aW9uKHYpe3ZhciByZW1RdW87dmFyIG49cGFyc2VWYWx1ZSh2KS50b0pTTnVtYmVyKCk7aWYoIXNoaWZ0X2lzU21hbGwobikpe3Rocm93IG5ldyBFcnJvcihTdHJpbmcobikrIiBpcyB0b28gbGFyZ2UgZm9yIHNoaWZ0aW5nLiIpfWlmKG48MClyZXR1cm4gdGhpcy5zaGlmdExlZnQoLW4pO3ZhciByZXN1bHQ9dGhpczt3aGlsZShuPj1wb3dlcnMyTGVuZ3RoKXtpZihyZXN1bHQuaXNaZXJvKCl8fHJlc3VsdC5pc05lZ2F0aXZlKCkmJnJlc3VsdC5pc1VuaXQoKSlyZXR1cm4gcmVzdWx0O3JlbVF1bz1kaXZNb2RBbnkocmVzdWx0LGhpZ2hlc3RQb3dlcjIpO3Jlc3VsdD1yZW1RdW9bMV0uaXNOZWdhdGl2ZSgpP3JlbVF1b1swXS5wcmV2KCk6cmVtUXVvWzBdO24tPXBvd2VyczJMZW5ndGgtMX1yZW1RdW89ZGl2TW9kQW55KHJlc3VsdCxwb3dlcnNPZlR3b1tuXSk7cmV0dXJuIHJlbVF1b1sxXS5pc05lZ2F0aXZlKCk/cmVtUXVvWzBdLnByZXYoKTpyZW1RdW9bMF19O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuc2hpZnRSaWdodD1TbWFsbEludGVnZXIucHJvdG90eXBlLnNoaWZ0UmlnaHQ9QmlnSW50ZWdlci5wcm90b3R5cGUuc2hpZnRSaWdodDtmdW5jdGlvbiBiaXR3aXNlKHgseSxmbil7eT1wYXJzZVZhbHVlKHkpO3ZhciB4U2lnbj14LmlzTmVnYXRpdmUoKSx5U2lnbj15LmlzTmVnYXRpdmUoKTt2YXIgeFJlbT14U2lnbj94Lm5vdCgpOngseVJlbT15U2lnbj95Lm5vdCgpOnk7dmFyIHhEaWdpdD0wLHlEaWdpdD0wO3ZhciB4RGl2TW9kPW51bGwseURpdk1vZD1udWxsO3ZhciByZXN1bHQ9W107d2hpbGUoIXhSZW0uaXNaZXJvKCl8fCF5UmVtLmlzWmVybygpKXt4RGl2TW9kPWRpdk1vZEFueSh4UmVtLGhpZ2hlc3RQb3dlcjIpO3hEaWdpdD14RGl2TW9kWzFdLnRvSlNOdW1iZXIoKTtpZih4U2lnbil7eERpZ2l0PWhpZ2hlc3RQb3dlcjItMS14RGlnaXR9eURpdk1vZD1kaXZNb2RBbnkoeVJlbSxoaWdoZXN0UG93ZXIyKTt5RGlnaXQ9eURpdk1vZFsxXS50b0pTTnVtYmVyKCk7aWYoeVNpZ24pe3lEaWdpdD1oaWdoZXN0UG93ZXIyLTEteURpZ2l0fXhSZW09eERpdk1vZFswXTt5UmVtPXlEaXZNb2RbMF07cmVzdWx0LnB1c2goZm4oeERpZ2l0LHlEaWdpdCkpfXZhciBzdW09Zm4oeFNpZ24/MTowLHlTaWduPzE6MCkhPT0wP2JpZ0ludCgtMSk6YmlnSW50KDApO2Zvcih2YXIgaT1yZXN1bHQubGVuZ3RoLTE7aT49MDtpLT0xKXtzdW09c3VtLm11bHRpcGx5KGhpZ2hlc3RQb3dlcjIpLmFkZChiaWdJbnQocmVzdWx0W2ldKSl9cmV0dXJuIHN1bX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3Q9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5uZWdhdGUoKS5wcmV2KCl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubm90PVNtYWxsSW50ZWdlci5wcm90b3R5cGUubm90PUJpZ0ludGVnZXIucHJvdG90eXBlLm5vdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5hbmQ9ZnVuY3Rpb24obil7cmV0dXJuIGJpdHdpc2UodGhpcyxuLGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEmYn0pfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmFuZD1TbWFsbEludGVnZXIucHJvdG90eXBlLmFuZD1CaWdJbnRlZ2VyLnByb3RvdHlwZS5hbmQ7QmlnSW50ZWdlci5wcm90b3R5cGUub3I9ZnVuY3Rpb24obil7cmV0dXJuIGJpdHdpc2UodGhpcyxuLGZ1bmN0aW9uKGEsYil7cmV0dXJuIGF8Yn0pfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm9yPVNtYWxsSW50ZWdlci5wcm90b3R5cGUub3I9QmlnSW50ZWdlci5wcm90b3R5cGUub3I7QmlnSW50ZWdlci5wcm90b3R5cGUueG9yPWZ1bmN0aW9uKG4pe3JldHVybiBiaXR3aXNlKHRoaXMsbixmdW5jdGlvbihhLGIpe3JldHVybiBhXmJ9KX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS54b3I9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS54b3I9QmlnSW50ZWdlci5wcm90b3R5cGUueG9yO3ZhciBMT0JNQVNLX0k9MTw8MzAsTE9CTUFTS19CST0oQkFTRSYtQkFTRSkqKEJBU0UmLUJBU0UpfExPQk1BU0tfSTtmdW5jdGlvbiByb3VnaExPQihuKXt2YXIgdj1uLnZhbHVlLHg9dHlwZW9mIHY9PT0ibnVtYmVyIj92fExPQk1BU0tfSTp0eXBlb2Ygdj09PSJiaWdpbnQiP3Z8QmlnSW50KExPQk1BU0tfSSk6dlswXSt2WzFdKkJBU0V8TE9CTUFTS19CSTtyZXR1cm4geCYteH1mdW5jdGlvbiBpbnRlZ2VyTG9nYXJpdGhtKHZhbHVlLGJhc2Upe2lmKGJhc2UuY29tcGFyZVRvKHZhbHVlKTw9MCl7dmFyIHRtcD1pbnRlZ2VyTG9nYXJpdGhtKHZhbHVlLGJhc2Uuc3F1YXJlKGJhc2UpKTt2YXIgcD10bXAucDt2YXIgZT10bXAuZTt2YXIgdD1wLm11bHRpcGx5KGJhc2UpO3JldHVybiB0LmNvbXBhcmVUbyh2YWx1ZSk8PTA/e3A6dCxlOmUqMisxfTp7cDpwLGU6ZSoyfX1yZXR1cm57cDpiaWdJbnQoMSksZTowfX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5iaXRMZW5ndGg9ZnVuY3Rpb24oKXt2YXIgbj10aGlzO2lmKG4uY29tcGFyZVRvKGJpZ0ludCgwKSk8MCl7bj1uLm5lZ2F0ZSgpLnN1YnRyYWN0KGJpZ0ludCgxKSl9aWYobi5jb21wYXJlVG8oYmlnSW50KDApKT09PTApe3JldHVybiBiaWdJbnQoMCl9cmV0dXJuIGJpZ0ludChpbnRlZ2VyTG9nYXJpdGhtKG4sYmlnSW50KDIpKS5lKS5hZGQoYmlnSW50KDEpKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5iaXRMZW5ndGg9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5iaXRMZW5ndGg9QmlnSW50ZWdlci5wcm90b3R5cGUuYml0TGVuZ3RoO2Z1bmN0aW9uIG1heChhLGIpe2E9cGFyc2VWYWx1ZShhKTtiPXBhcnNlVmFsdWUoYik7cmV0dXJuIGEuZ3JlYXRlcihiKT9hOmJ9ZnVuY3Rpb24gbWluKGEsYil7YT1wYXJzZVZhbHVlKGEpO2I9cGFyc2VWYWx1ZShiKTtyZXR1cm4gYS5sZXNzZXIoYik/YTpifWZ1bmN0aW9uIGdjZChhLGIpe2E9cGFyc2VWYWx1ZShhKS5hYnMoKTtiPXBhcnNlVmFsdWUoYikuYWJzKCk7aWYoYS5lcXVhbHMoYikpcmV0dXJuIGE7aWYoYS5pc1plcm8oKSlyZXR1cm4gYjtpZihiLmlzWmVybygpKXJldHVybiBhO3ZhciBjPUludGVnZXJbMV0sZCx0O3doaWxlKGEuaXNFdmVuKCkmJmIuaXNFdmVuKCkpe2Q9bWluKHJvdWdoTE9CKGEpLHJvdWdoTE9CKGIpKTthPWEuZGl2aWRlKGQpO2I9Yi5kaXZpZGUoZCk7Yz1jLm11bHRpcGx5KGQpfXdoaWxlKGEuaXNFdmVuKCkpe2E9YS5kaXZpZGUocm91Z2hMT0IoYSkpfWRve3doaWxlKGIuaXNFdmVuKCkpe2I9Yi5kaXZpZGUocm91Z2hMT0IoYikpfWlmKGEuZ3JlYXRlcihiKSl7dD1iO2I9YTthPXR9Yj1iLnN1YnRyYWN0KGEpfXdoaWxlKCFiLmlzWmVybygpKTtyZXR1cm4gYy5pc1VuaXQoKT9hOmEubXVsdGlwbHkoYyl9ZnVuY3Rpb24gbGNtKGEsYil7YT1wYXJzZVZhbHVlKGEpLmFicygpO2I9cGFyc2VWYWx1ZShiKS5hYnMoKTtyZXR1cm4gYS5kaXZpZGUoZ2NkKGEsYikpLm11bHRpcGx5KGIpfWZ1bmN0aW9uIHJhbmRCZXR3ZWVuKGEsYixybmcpe2E9cGFyc2VWYWx1ZShhKTtiPXBhcnNlVmFsdWUoYik7dmFyIHVzZWRSTkc9cm5nfHxNYXRoLnJhbmRvbTt2YXIgbG93PW1pbihhLGIpLGhpZ2g9bWF4KGEsYik7dmFyIHJhbmdlPWhpZ2guc3VidHJhY3QobG93KS5hZGQoMSk7aWYocmFuZ2UuaXNTbWFsbClyZXR1cm4gbG93LmFkZChNYXRoLmZsb29yKHVzZWRSTkcoKSpyYW5nZSkpO3ZhciBkaWdpdHM9dG9CYXNlKHJhbmdlLEJBU0UpLnZhbHVlO3ZhciByZXN1bHQ9W10scmVzdHJpY3RlZD10cnVlO2Zvcih2YXIgaT0wO2k8ZGlnaXRzLmxlbmd0aDtpKyspe3ZhciB0b3A9cmVzdHJpY3RlZD9kaWdpdHNbaV06QkFTRTt2YXIgZGlnaXQ9dHJ1bmNhdGUodXNlZFJORygpKnRvcCk7cmVzdWx0LnB1c2goZGlnaXQpO2lmKGRpZ2l0PHRvcClyZXN0cmljdGVkPWZhbHNlfXJldHVybiBsb3cuYWRkKEludGVnZXIuZnJvbUFycmF5KHJlc3VsdCxCQVNFLGZhbHNlKSl9dmFyIHBhcnNlQmFzZT1mdW5jdGlvbih0ZXh0LGJhc2UsYWxwaGFiZXQsY2FzZVNlbnNpdGl2ZSl7YWxwaGFiZXQ9YWxwaGFiZXR8fERFRkFVTFRfQUxQSEFCRVQ7dGV4dD1TdHJpbmcodGV4dCk7aWYoIWNhc2VTZW5zaXRpdmUpe3RleHQ9dGV4dC50b0xvd2VyQ2FzZSgpO2FscGhhYmV0PWFscGhhYmV0LnRvTG93ZXJDYXNlKCl9dmFyIGxlbmd0aD10ZXh0Lmxlbmd0aDt2YXIgaTt2YXIgYWJzQmFzZT1NYXRoLmFicyhiYXNlKTt2YXIgYWxwaGFiZXRWYWx1ZXM9e307Zm9yKGk9MDtpPGFscGhhYmV0Lmxlbmd0aDtpKyspe2FscGhhYmV0VmFsdWVzW2FscGhhYmV0W2ldXT1pfWZvcihpPTA7aTxsZW5ndGg7aSsrKXt2YXIgYz10ZXh0W2ldO2lmKGM9PT0iLSIpY29udGludWU7aWYoYyBpbiBhbHBoYWJldFZhbHVlcyl7aWYoYWxwaGFiZXRWYWx1ZXNbY10+PWFic0Jhc2Upe2lmKGM9PT0iMSImJmFic0Jhc2U9PT0xKWNvbnRpbnVlO3Rocm93IG5ldyBFcnJvcihjKyIgaXMgbm90IGEgdmFsaWQgZGlnaXQgaW4gYmFzZSAiK2Jhc2UrIi4iKX19fWJhc2U9cGFyc2VWYWx1ZShiYXNlKTt2YXIgZGlnaXRzPVtdO3ZhciBpc05lZ2F0aXZlPXRleHRbMF09PT0iLSI7Zm9yKGk9aXNOZWdhdGl2ZT8xOjA7aTx0ZXh0Lmxlbmd0aDtpKyspe3ZhciBjPXRleHRbaV07aWYoYyBpbiBhbHBoYWJldFZhbHVlcylkaWdpdHMucHVzaChwYXJzZVZhbHVlKGFscGhhYmV0VmFsdWVzW2NdKSk7ZWxzZSBpZihjPT09IjwiKXt2YXIgc3RhcnQ9aTtkb3tpKyt9d2hpbGUodGV4dFtpXSE9PSI+IiYmaTx0ZXh0Lmxlbmd0aCk7ZGlnaXRzLnB1c2gocGFyc2VWYWx1ZSh0ZXh0LnNsaWNlKHN0YXJ0KzEsaSkpKX1lbHNlIHRocm93IG5ldyBFcnJvcihjKyIgaXMgbm90IGEgdmFsaWQgY2hhcmFjdGVyIil9cmV0dXJuIHBhcnNlQmFzZUZyb21BcnJheShkaWdpdHMsYmFzZSxpc05lZ2F0aXZlKX07ZnVuY3Rpb24gcGFyc2VCYXNlRnJvbUFycmF5KGRpZ2l0cyxiYXNlLGlzTmVnYXRpdmUpe3ZhciB2YWw9SW50ZWdlclswXSxwb3c9SW50ZWdlclsxXSxpO2ZvcihpPWRpZ2l0cy5sZW5ndGgtMTtpPj0wO2ktLSl7dmFsPXZhbC5hZGQoZGlnaXRzW2ldLnRpbWVzKHBvdykpO3Bvdz1wb3cudGltZXMoYmFzZSl9cmV0dXJuIGlzTmVnYXRpdmU/dmFsLm5lZ2F0ZSgpOnZhbH1mdW5jdGlvbiBzdHJpbmdpZnkoZGlnaXQsYWxwaGFiZXQpe2FscGhhYmV0PWFscGhhYmV0fHxERUZBVUxUX0FMUEhBQkVUO2lmKGRpZ2l0PGFscGhhYmV0Lmxlbmd0aCl7cmV0dXJuIGFscGhhYmV0W2RpZ2l0XX1yZXR1cm4iPCIrZGlnaXQrIj4ifWZ1bmN0aW9uIHRvQmFzZShuLGJhc2Upe2Jhc2U9YmlnSW50KGJhc2UpO2lmKGJhc2UuaXNaZXJvKCkpe2lmKG4uaXNaZXJvKCkpcmV0dXJue3ZhbHVlOlswXSxpc05lZ2F0aXZlOmZhbHNlfTt0aHJvdyBuZXcgRXJyb3IoIkNhbm5vdCBjb252ZXJ0IG5vbnplcm8gbnVtYmVycyB0byBiYXNlIDAuIil9aWYoYmFzZS5lcXVhbHMoLTEpKXtpZihuLmlzWmVybygpKXJldHVybnt2YWx1ZTpbMF0saXNOZWdhdGl2ZTpmYWxzZX07aWYobi5pc05lZ2F0aXZlKCkpcmV0dXJue3ZhbHVlOltdLmNvbmNhdC5hcHBseShbXSxBcnJheS5hcHBseShudWxsLEFycmF5KC1uLnRvSlNOdW1iZXIoKSkpLm1hcChBcnJheS5wcm90b3R5cGUudmFsdWVPZixbMSwwXSkpLGlzTmVnYXRpdmU6ZmFsc2V9O3ZhciBhcnI9QXJyYXkuYXBwbHkobnVsbCxBcnJheShuLnRvSlNOdW1iZXIoKS0xKSkubWFwKEFycmF5LnByb3RvdHlwZS52YWx1ZU9mLFswLDFdKTthcnIudW5zaGlmdChbMV0pO3JldHVybnt2YWx1ZTpbXS5jb25jYXQuYXBwbHkoW10sYXJyKSxpc05lZ2F0aXZlOmZhbHNlfX12YXIgbmVnPWZhbHNlO2lmKG4uaXNOZWdhdGl2ZSgpJiZiYXNlLmlzUG9zaXRpdmUoKSl7bmVnPXRydWU7bj1uLmFicygpfWlmKGJhc2UuaXNVbml0KCkpe2lmKG4uaXNaZXJvKCkpcmV0dXJue3ZhbHVlOlswXSxpc05lZ2F0aXZlOmZhbHNlfTtyZXR1cm57dmFsdWU6QXJyYXkuYXBwbHkobnVsbCxBcnJheShuLnRvSlNOdW1iZXIoKSkpLm1hcChOdW1iZXIucHJvdG90eXBlLnZhbHVlT2YsMSksaXNOZWdhdGl2ZTpuZWd9fXZhciBvdXQ9W107dmFyIGxlZnQ9bixkaXZtb2Q7d2hpbGUobGVmdC5pc05lZ2F0aXZlKCl8fGxlZnQuY29tcGFyZUFicyhiYXNlKT49MCl7ZGl2bW9kPWxlZnQuZGl2bW9kKGJhc2UpO2xlZnQ9ZGl2bW9kLnF1b3RpZW50O3ZhciBkaWdpdD1kaXZtb2QucmVtYWluZGVyO2lmKGRpZ2l0LmlzTmVnYXRpdmUoKSl7ZGlnaXQ9YmFzZS5taW51cyhkaWdpdCkuYWJzKCk7bGVmdD1sZWZ0Lm5leHQoKX1vdXQucHVzaChkaWdpdC50b0pTTnVtYmVyKCkpfW91dC5wdXNoKGxlZnQudG9KU051bWJlcigpKTtyZXR1cm57dmFsdWU6b3V0LnJldmVyc2UoKSxpc05lZ2F0aXZlOm5lZ319ZnVuY3Rpb24gdG9CYXNlU3RyaW5nKG4sYmFzZSxhbHBoYWJldCl7dmFyIGFycj10b0Jhc2UobixiYXNlKTtyZXR1cm4oYXJyLmlzTmVnYXRpdmU/Ii0iOiIiKSthcnIudmFsdWUubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBzdHJpbmdpZnkoeCxhbHBoYWJldCl9KS5qb2luKCIiKX1CaWdJbnRlZ2VyLnByb3RvdHlwZS50b0FycmF5PWZ1bmN0aW9uKHJhZGl4KXtyZXR1cm4gdG9CYXNlKHRoaXMscmFkaXgpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLnRvQXJyYXk9ZnVuY3Rpb24ocmFkaXgpe3JldHVybiB0b0Jhc2UodGhpcyxyYWRpeCl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUudG9BcnJheT1mdW5jdGlvbihyYWRpeCl7cmV0dXJuIHRvQmFzZSh0aGlzLHJhZGl4KX07QmlnSW50ZWdlci5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24ocmFkaXgsYWxwaGFiZXQpe2lmKHJhZGl4PT09dW5kZWZpbmVkKXJhZGl4PTEwO2lmKHJhZGl4IT09MTApcmV0dXJuIHRvQmFzZVN0cmluZyh0aGlzLHJhZGl4LGFscGhhYmV0KTt2YXIgdj10aGlzLnZhbHVlLGw9di5sZW5ndGgsc3RyPVN0cmluZyh2Wy0tbF0pLHplcm9zPSIwMDAwMDAwIixkaWdpdDt3aGlsZSgtLWw+PTApe2RpZ2l0PVN0cmluZyh2W2xdKTtzdHIrPXplcm9zLnNsaWNlKGRpZ2l0Lmxlbmd0aCkrZGlnaXR9dmFyIHNpZ249dGhpcy5zaWduPyItIjoiIjtyZXR1cm4gc2lnbitzdHJ9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24ocmFkaXgsYWxwaGFiZXQpe2lmKHJhZGl4PT09dW5kZWZpbmVkKXJhZGl4PTEwO2lmKHJhZGl4IT0xMClyZXR1cm4gdG9CYXNlU3RyaW5nKHRoaXMscmFkaXgsYWxwaGFiZXQpO3JldHVybiBTdHJpbmcodGhpcy52YWx1ZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUudG9TdHJpbmc9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b1N0cmluZztOYXRpdmVCaWdJbnQucHJvdG90eXBlLnRvSlNPTj1CaWdJbnRlZ2VyLnByb3RvdHlwZS50b0pTT049U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b0pTT049ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1N0cmluZygpfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS52YWx1ZU9mPWZ1bmN0aW9uKCl7cmV0dXJuIHBhcnNlSW50KHRoaXMudG9TdHJpbmcoKSwxMCl9O0JpZ0ludGVnZXIucHJvdG90eXBlLnRvSlNOdW1iZXI9QmlnSW50ZWdlci5wcm90b3R5cGUudmFsdWVPZjtTbWFsbEludGVnZXIucHJvdG90eXBlLnZhbHVlT2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy52YWx1ZX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b0pTTnVtYmVyPVNtYWxsSW50ZWdlci5wcm90b3R5cGUudmFsdWVPZjtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnZhbHVlT2Y9TmF0aXZlQmlnSW50LnByb3RvdHlwZS50b0pTTnVtYmVyPWZ1bmN0aW9uKCl7cmV0dXJuIHBhcnNlSW50KHRoaXMudG9TdHJpbmcoKSwxMCl9O2Z1bmN0aW9uIHBhcnNlU3RyaW5nVmFsdWUodil7aWYoaXNQcmVjaXNlKCt2KSl7dmFyIHg9K3Y7aWYoeD09PXRydW5jYXRlKHgpKXJldHVybiBzdXBwb3J0c05hdGl2ZUJpZ0ludD9uZXcgTmF0aXZlQmlnSW50KEJpZ0ludCh4KSk6bmV3IFNtYWxsSW50ZWdlcih4KTt0aHJvdyBuZXcgRXJyb3IoIkludmFsaWQgaW50ZWdlcjogIit2KX12YXIgc2lnbj12WzBdPT09Ii0iO2lmKHNpZ24pdj12LnNsaWNlKDEpO3ZhciBzcGxpdD12LnNwbGl0KC9lL2kpO2lmKHNwbGl0Lmxlbmd0aD4yKXRocm93IG5ldyBFcnJvcigiSW52YWxpZCBpbnRlZ2VyOiAiK3NwbGl0LmpvaW4oImUiKSk7aWYoc3BsaXQubGVuZ3RoPT09Mil7dmFyIGV4cD1zcGxpdFsxXTtpZihleHBbMF09PT0iKyIpZXhwPWV4cC5zbGljZSgxKTtleHA9K2V4cDtpZihleHAhPT10cnVuY2F0ZShleHApfHwhaXNQcmVjaXNlKGV4cCkpdGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIGludGVnZXI6ICIrZXhwKyIgaXMgbm90IGEgdmFsaWQgZXhwb25lbnQuIik7dmFyIHRleHQ9c3BsaXRbMF07dmFyIGRlY2ltYWxQbGFjZT10ZXh0LmluZGV4T2YoIi4iKTtpZihkZWNpbWFsUGxhY2U+PTApe2V4cC09dGV4dC5sZW5ndGgtZGVjaW1hbFBsYWNlLTE7dGV4dD10ZXh0LnNsaWNlKDAsZGVjaW1hbFBsYWNlKSt0ZXh0LnNsaWNlKGRlY2ltYWxQbGFjZSsxKX1pZihleHA8MCl0aHJvdyBuZXcgRXJyb3IoIkNhbm5vdCBpbmNsdWRlIG5lZ2F0aXZlIGV4cG9uZW50IHBhcnQgZm9yIGludGVnZXJzIik7dGV4dCs9bmV3IEFycmF5KGV4cCsxKS5qb2luKCIwIik7dj10ZXh0fXZhciBpc1ZhbGlkPS9eKFswLTldWzAtOV0qKSQvLnRlc3Qodik7aWYoIWlzVmFsaWQpdGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIGludGVnZXI6ICIrdik7aWYoc3VwcG9ydHNOYXRpdmVCaWdJbnQpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KEJpZ0ludChzaWduPyItIit2OnYpKX12YXIgcj1bXSxtYXg9di5sZW5ndGgsbD1MT0dfQkFTRSxtaW49bWF4LWw7d2hpbGUobWF4PjApe3IucHVzaCgrdi5zbGljZShtaW4sbWF4KSk7bWluLT1sO2lmKG1pbjwwKW1pbj0wO21heC09bH10cmltKHIpO3JldHVybiBuZXcgQmlnSW50ZWdlcihyLHNpZ24pfWZ1bmN0aW9uIHBhcnNlTnVtYmVyVmFsdWUodil7aWYoc3VwcG9ydHNOYXRpdmVCaWdJbnQpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KEJpZ0ludCh2KSl9aWYoaXNQcmVjaXNlKHYpKXtpZih2IT09dHJ1bmNhdGUodikpdGhyb3cgbmV3IEVycm9yKHYrIiBpcyBub3QgYW4gaW50ZWdlci4iKTtyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2KX1yZXR1cm4gcGFyc2VTdHJpbmdWYWx1ZSh2LnRvU3RyaW5nKCkpfWZ1bmN0aW9uIHBhcnNlVmFsdWUodil7aWYodHlwZW9mIHY9PT0ibnVtYmVyIil7cmV0dXJuIHBhcnNlTnVtYmVyVmFsdWUodil9aWYodHlwZW9mIHY9PT0ic3RyaW5nIil7cmV0dXJuIHBhcnNlU3RyaW5nVmFsdWUodil9aWYodHlwZW9mIHY9PT0iYmlnaW50Iil7cmV0dXJuIG5ldyBOYXRpdmVCaWdJbnQodil9cmV0dXJuIHZ9Zm9yKHZhciBpPTA7aTwxZTM7aSsrKXtJbnRlZ2VyW2ldPXBhcnNlVmFsdWUoaSk7aWYoaT4wKUludGVnZXJbLWldPXBhcnNlVmFsdWUoLWkpfUludGVnZXIub25lPUludGVnZXJbMV07SW50ZWdlci56ZXJvPUludGVnZXJbMF07SW50ZWdlci5taW51c09uZT1JbnRlZ2VyWy0xXTtJbnRlZ2VyLm1heD1tYXg7SW50ZWdlci5taW49bWluO0ludGVnZXIuZ2NkPWdjZDtJbnRlZ2VyLmxjbT1sY207SW50ZWdlci5pc0luc3RhbmNlPWZ1bmN0aW9uKHgpe3JldHVybiB4IGluc3RhbmNlb2YgQmlnSW50ZWdlcnx8eCBpbnN0YW5jZW9mIFNtYWxsSW50ZWdlcnx8eCBpbnN0YW5jZW9mIE5hdGl2ZUJpZ0ludH07SW50ZWdlci5yYW5kQmV0d2Vlbj1yYW5kQmV0d2VlbjtJbnRlZ2VyLmZyb21BcnJheT1mdW5jdGlvbihkaWdpdHMsYmFzZSxpc05lZ2F0aXZlKXtyZXR1cm4gcGFyc2VCYXNlRnJvbUFycmF5KGRpZ2l0cy5tYXAocGFyc2VWYWx1ZSkscGFyc2VWYWx1ZShiYXNlfHwxMCksaXNOZWdhdGl2ZSl9O3JldHVybiBJbnRlZ2VyfSgpO2lmKHR5cGVvZiBtb2R1bGUhPT0idW5kZWZpbmVkIiYmbW9kdWxlLmhhc093blByb3BlcnR5KCJleHBvcnRzIikpe21vZHVsZS5leHBvcnRzPWJpZ0ludH1pZih0eXBlb2YgZGVmaW5lPT09ImZ1bmN0aW9uIiYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIGJpZ0ludH0pfX0se31dLDI2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt9LHt9XSwyNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7InVzZSBzdHJpY3QiO3ZhciBiYXNlNjQ9cmVxdWlyZSgiYmFzZTY0LWpzIik7dmFyIGllZWU3NTQ9cmVxdWlyZSgiaWVlZTc1NCIpO2V4cG9ydHMuQnVmZmVyPUJ1ZmZlcjtleHBvcnRzLlNsb3dCdWZmZXI9U2xvd0J1ZmZlcjtleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTPTUwO3ZhciBLX01BWF9MRU5HVEg9MjE0NzQ4MzY0NztleHBvcnRzLmtNYXhMZW5ndGg9S19NQVhfTEVOR1RIO0J1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUPXR5cGVkQXJyYXlTdXBwb3J0KCk7aWYoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUJiZ0eXBlb2YgY29uc29sZSE9PSJ1bmRlZmluZWQiJiZ0eXBlb2YgY29uc29sZS5lcnJvcj09PSJmdW5jdGlvbiIpe2NvbnNvbGUuZXJyb3IoIlRoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAiKyJgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LiIpfWZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0KCl7dHJ5e3ZhciBhcnI9bmV3IFVpbnQ4QXJyYXkoMSk7YXJyLl9fcHJvdG9fXz17X19wcm90b19fOlVpbnQ4QXJyYXkucHJvdG90eXBlLGZvbzpmdW5jdGlvbigpe3JldHVybiA0Mn19O3JldHVybiBhcnIuZm9vKCk9PT00Mn1jYXRjaChlKXtyZXR1cm4gZmFsc2V9fU9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCJwYXJlbnQiLHtlbnVtZXJhYmxlOnRydWUsZ2V0OmZ1bmN0aW9uKCl7aWYoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSlyZXR1cm4gdW5kZWZpbmVkO3JldHVybiB0aGlzLmJ1ZmZlcn19KTtPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwib2Zmc2V0Iix7ZW51bWVyYWJsZTp0cnVlLGdldDpmdW5jdGlvbigpe2lmKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpcmV0dXJuIHVuZGVmaW5lZDtyZXR1cm4gdGhpcy5ieXRlT2Zmc2V0fX0pO2Z1bmN0aW9uIGNyZWF0ZUJ1ZmZlcihsZW5ndGgpe2lmKGxlbmd0aD5LX01BWF9MRU5HVEgpe3Rocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgIicrbGVuZ3RoKyciIGlzIGludmFsaWQgZm9yIG9wdGlvbiAic2l6ZSInKX12YXIgYnVmPW5ldyBVaW50OEFycmF5KGxlbmd0aCk7YnVmLl9fcHJvdG9fXz1CdWZmZXIucHJvdG90eXBlO3JldHVybiBidWZ9ZnVuY3Rpb24gQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl7aWYodHlwZW9mIGFyZz09PSJudW1iZXIiKXtpZih0eXBlb2YgZW5jb2RpbmdPck9mZnNldD09PSJzdHJpbmciKXt0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgInN0cmluZyIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4gUmVjZWl2ZWQgdHlwZSBudW1iZXInKX1yZXR1cm4gYWxsb2NVbnNhZmUoYXJnKX1yZXR1cm4gZnJvbShhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfWlmKHR5cGVvZiBTeW1ib2whPT0idW5kZWZpbmVkIiYmU3ltYm9sLnNwZWNpZXMhPW51bGwmJkJ1ZmZlcltTeW1ib2wuc3BlY2llc109PT1CdWZmZXIpe09iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsU3ltYm9sLnNwZWNpZXMse3ZhbHVlOm51bGwsY29uZmlndXJhYmxlOnRydWUsZW51bWVyYWJsZTpmYWxzZSx3cml0YWJsZTpmYWxzZX0pfUJ1ZmZlci5wb29sU2l6ZT04MTkyO2Z1bmN0aW9uIGZyb20odmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiB2YWx1ZT09PSJzdHJpbmciKXtyZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSxlbmNvZGluZ09yT2Zmc2V0KX1pZihBcnJheUJ1ZmZlci5pc1ZpZXcodmFsdWUpKXtyZXR1cm4gZnJvbUFycmF5TGlrZSh2YWx1ZSl9aWYodmFsdWU9PW51bGwpe3Rocm93IFR5cGVFcnJvcigiVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgIisib3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgIit0eXBlb2YgdmFsdWUpfWlmKGlzSW5zdGFuY2UodmFsdWUsQXJyYXlCdWZmZXIpfHx2YWx1ZSYmaXNJbnN0YW5jZSh2YWx1ZS5idWZmZXIsQXJyYXlCdWZmZXIpKXtyZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX1pZih0eXBlb2YgdmFsdWU9PT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJ2YWx1ZSIgYXJndW1lbnQgbXVzdCBub3QgYmUgb2YgdHlwZSBudW1iZXIuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJyl9dmFyIHZhbHVlT2Y9dmFsdWUudmFsdWVPZiYmdmFsdWUudmFsdWVPZigpO2lmKHZhbHVlT2YhPW51bGwmJnZhbHVlT2YhPT12YWx1ZSl7cmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlT2YsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfXZhciBiPWZyb21PYmplY3QodmFsdWUpO2lmKGIpcmV0dXJuIGI7aWYodHlwZW9mIFN5bWJvbCE9PSJ1bmRlZmluZWQiJiZTeW1ib2wudG9QcmltaXRpdmUhPW51bGwmJnR5cGVvZiB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdPT09ImZ1bmN0aW9uIil7cmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0oInN0cmluZyIpLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX10aHJvdyBuZXcgVHlwZUVycm9yKCJUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAiKyJvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAiK3R5cGVvZiB2YWx1ZSl9QnVmZmVyLmZyb209ZnVuY3Rpb24odmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe3JldHVybiBmcm9tKHZhbHVlLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX07QnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX189VWludDhBcnJheS5wcm90b3R5cGU7QnVmZmVyLl9fcHJvdG9fXz1VaW50OEFycmF5O2Z1bmN0aW9uIGFzc2VydFNpemUoc2l6ZSl7aWYodHlwZW9mIHNpemUhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcignInNpemUiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBudW1iZXInKX1lbHNlIGlmKHNpemU8MCl7dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSAiJytzaXplKyciIGlzIGludmFsaWQgZm9yIG9wdGlvbiAic2l6ZSInKX19ZnVuY3Rpb24gYWxsb2Moc2l6ZSxmaWxsLGVuY29kaW5nKXthc3NlcnRTaXplKHNpemUpO2lmKHNpemU8PTApe3JldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSl9aWYoZmlsbCE9PXVuZGVmaW5lZCl7cmV0dXJuIHR5cGVvZiBlbmNvZGluZz09PSJzdHJpbmciP2NyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwsZW5jb2RpbmcpOmNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpfXJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSl9QnVmZmVyLmFsbG9jPWZ1bmN0aW9uKHNpemUsZmlsbCxlbmNvZGluZyl7cmV0dXJuIGFsbG9jKHNpemUsZmlsbCxlbmNvZGluZyl9O2Z1bmN0aW9uIGFsbG9jVW5zYWZlKHNpemUpe2Fzc2VydFNpemUoc2l6ZSk7cmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplPDA/MDpjaGVja2VkKHNpemUpfDApfUJ1ZmZlci5hbGxvY1Vuc2FmZT1mdW5jdGlvbihzaXplKXtyZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSl9O0J1ZmZlci5hbGxvY1Vuc2FmZVNsb3c9ZnVuY3Rpb24oc2l6ZSl7cmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpfTtmdW5jdGlvbiBmcm9tU3RyaW5nKHN0cmluZyxlbmNvZGluZyl7aWYodHlwZW9mIGVuY29kaW5nIT09InN0cmluZyJ8fGVuY29kaW5nPT09IiIpe2VuY29kaW5nPSJ1dGY4In1pZighQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJVbmtub3duIGVuY29kaW5nOiAiK2VuY29kaW5nKX12YXIgbGVuZ3RoPWJ5dGVMZW5ndGgoc3RyaW5nLGVuY29kaW5nKXwwO3ZhciBidWY9Y3JlYXRlQnVmZmVyKGxlbmd0aCk7dmFyIGFjdHVhbD1idWYud3JpdGUoc3RyaW5nLGVuY29kaW5nKTtpZihhY3R1YWwhPT1sZW5ndGgpe2J1Zj1idWYuc2xpY2UoMCxhY3R1YWwpfXJldHVybiBidWZ9ZnVuY3Rpb24gZnJvbUFycmF5TGlrZShhcnJheSl7dmFyIGxlbmd0aD1hcnJheS5sZW5ndGg8MD8wOmNoZWNrZWQoYXJyYXkubGVuZ3RoKXwwO3ZhciBidWY9Y3JlYXRlQnVmZmVyKGxlbmd0aCk7Zm9yKHZhciBpPTA7aTxsZW5ndGg7aSs9MSl7YnVmW2ldPWFycmF5W2ldJjI1NX1yZXR1cm4gYnVmfWZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlcihhcnJheSxieXRlT2Zmc2V0LGxlbmd0aCl7aWYoYnl0ZU9mZnNldDwwfHxhcnJheS5ieXRlTGVuZ3RoPGJ5dGVPZmZzZXQpe3Rocm93IG5ldyBSYW5nZUVycm9yKCcib2Zmc2V0IiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKX1pZihhcnJheS5ieXRlTGVuZ3RoPGJ5dGVPZmZzZXQrKGxlbmd0aHx8MCkpe3Rocm93IG5ldyBSYW5nZUVycm9yKCcibGVuZ3RoIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKX12YXIgYnVmO2lmKGJ5dGVPZmZzZXQ9PT11bmRlZmluZWQmJmxlbmd0aD09PXVuZGVmaW5lZCl7YnVmPW5ldyBVaW50OEFycmF5KGFycmF5KX1lbHNlIGlmKGxlbmd0aD09PXVuZGVmaW5lZCl7YnVmPW5ldyBVaW50OEFycmF5KGFycmF5LGJ5dGVPZmZzZXQpfWVsc2V7YnVmPW5ldyBVaW50OEFycmF5KGFycmF5LGJ5dGVPZmZzZXQsbGVuZ3RoKX1idWYuX19wcm90b19fPUJ1ZmZlci5wcm90b3R5cGU7cmV0dXJuIGJ1Zn1mdW5jdGlvbiBmcm9tT2JqZWN0KG9iail7aWYoQnVmZmVyLmlzQnVmZmVyKG9iaikpe3ZhciBsZW49Y2hlY2tlZChvYmoubGVuZ3RoKXwwO3ZhciBidWY9Y3JlYXRlQnVmZmVyKGxlbik7aWYoYnVmLmxlbmd0aD09PTApe3JldHVybiBidWZ9b2JqLmNvcHkoYnVmLDAsMCxsZW4pO3JldHVybiBidWZ9aWYob2JqLmxlbmd0aCE9PXVuZGVmaW5lZCl7aWYodHlwZW9mIG9iai5sZW5ndGghPT0ibnVtYmVyInx8bnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpe3JldHVybiBjcmVhdGVCdWZmZXIoMCl9cmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKX1pZihvYmoudHlwZT09PSJCdWZmZXIiJiZBcnJheS5pc0FycmF5KG9iai5kYXRhKSl7cmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpfX1mdW5jdGlvbiBjaGVja2VkKGxlbmd0aCl7aWYobGVuZ3RoPj1LX01BWF9MRU5HVEgpe3Rocm93IG5ldyBSYW5nZUVycm9yKCJBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICIrInNpemU6IDB4IitLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpKyIgYnl0ZXMiKX1yZXR1cm4gbGVuZ3RofDB9ZnVuY3Rpb24gU2xvd0J1ZmZlcihsZW5ndGgpe2lmKCtsZW5ndGghPWxlbmd0aCl7bGVuZ3RoPTB9cmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKX1CdWZmZXIuaXNCdWZmZXI9ZnVuY3Rpb24gaXNCdWZmZXIoYil7cmV0dXJuIGIhPW51bGwmJmIuX2lzQnVmZmVyPT09dHJ1ZSYmYiE9PUJ1ZmZlci5wcm90b3R5cGV9O0J1ZmZlci5jb21wYXJlPWZ1bmN0aW9uIGNvbXBhcmUoYSxiKXtpZihpc0luc3RhbmNlKGEsVWludDhBcnJheSkpYT1CdWZmZXIuZnJvbShhLGEub2Zmc2V0LGEuYnl0ZUxlbmd0aCk7aWYoaXNJbnN0YW5jZShiLFVpbnQ4QXJyYXkpKWI9QnVmZmVyLmZyb20oYixiLm9mZnNldCxiLmJ5dGVMZW5ndGgpO2lmKCFCdWZmZXIuaXNCdWZmZXIoYSl8fCFCdWZmZXIuaXNCdWZmZXIoYikpe3Rocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSAiYnVmMSIsICJidWYyIiBhcmd1bWVudHMgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheScpfWlmKGE9PT1iKXJldHVybiAwO3ZhciB4PWEubGVuZ3RoO3ZhciB5PWIubGVuZ3RoO2Zvcih2YXIgaT0wLGxlbj1NYXRoLm1pbih4LHkpO2k8bGVuOysraSl7aWYoYVtpXSE9PWJbaV0pe3g9YVtpXTt5PWJbaV07YnJlYWt9fWlmKHg8eSlyZXR1cm4tMTtpZih5PHgpcmV0dXJuIDE7cmV0dXJuIDB9O0J1ZmZlci5pc0VuY29kaW5nPWZ1bmN0aW9uIGlzRW5jb2RpbmcoZW5jb2Rpbmcpe3N3aXRjaChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpe2Nhc2UiaGV4IjpjYXNlInV0ZjgiOmNhc2UidXRmLTgiOmNhc2UiYXNjaWkiOmNhc2UibGF0aW4xIjpjYXNlImJpbmFyeSI6Y2FzZSJiYXNlNjQiOmNhc2UidWNzMiI6Y2FzZSJ1Y3MtMiI6Y2FzZSJ1dGYxNmxlIjpjYXNlInV0Zi0xNmxlIjpyZXR1cm4gdHJ1ZTtkZWZhdWx0OnJldHVybiBmYWxzZX19O0J1ZmZlci5jb25jYXQ9ZnVuY3Rpb24gY29uY2F0KGxpc3QsbGVuZ3RoKXtpZighQXJyYXkuaXNBcnJheShsaXN0KSl7dGhyb3cgbmV3IFR5cGVFcnJvcignImxpc3QiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpfWlmKGxpc3QubGVuZ3RoPT09MCl7cmV0dXJuIEJ1ZmZlci5hbGxvYygwKX12YXIgaTtpZihsZW5ndGg9PT11bmRlZmluZWQpe2xlbmd0aD0wO2ZvcihpPTA7aTxsaXN0Lmxlbmd0aDsrK2kpe2xlbmd0aCs9bGlzdFtpXS5sZW5ndGh9fXZhciBidWZmZXI9QnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aCk7dmFyIHBvcz0wO2ZvcihpPTA7aTxsaXN0Lmxlbmd0aDsrK2kpe3ZhciBidWY9bGlzdFtpXTtpZihpc0luc3RhbmNlKGJ1ZixVaW50OEFycmF5KSl7YnVmPUJ1ZmZlci5mcm9tKGJ1Zil9aWYoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKXt0aHJvdyBuZXcgVHlwZUVycm9yKCcibGlzdCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJyl9YnVmLmNvcHkoYnVmZmVyLHBvcyk7cG9zKz1idWYubGVuZ3RofXJldHVybiBidWZmZXJ9O2Z1bmN0aW9uIGJ5dGVMZW5ndGgoc3RyaW5nLGVuY29kaW5nKXtpZihCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSl7cmV0dXJuIHN0cmluZy5sZW5ndGh9aWYoQXJyYXlCdWZmZXIuaXNWaWV3KHN0cmluZyl8fGlzSW5zdGFuY2Uoc3RyaW5nLEFycmF5QnVmZmVyKSl7cmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RofWlmKHR5cGVvZiBzdHJpbmchPT0ic3RyaW5nIil7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJzdHJpbmciIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIG9yIEFycmF5QnVmZmVyLiAnKyJSZWNlaXZlZCB0eXBlICIrdHlwZW9mIHN0cmluZyl9dmFyIGxlbj1zdHJpbmcubGVuZ3RoO3ZhciBtdXN0TWF0Y2g9YXJndW1lbnRzLmxlbmd0aD4yJiZhcmd1bWVudHNbMl09PT10cnVlO2lmKCFtdXN0TWF0Y2gmJmxlbj09PTApcmV0dXJuIDA7dmFyIGxvd2VyZWRDYXNlPWZhbHNlO2Zvcig7Oyl7c3dpdGNoKGVuY29kaW5nKXtjYXNlImFzY2lpIjpjYXNlImxhdGluMSI6Y2FzZSJiaW5hcnkiOnJldHVybiBsZW47Y2FzZSJ1dGY4IjpjYXNlInV0Zi04IjpyZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGg7Y2FzZSJ1Y3MyIjpjYXNlInVjcy0yIjpjYXNlInV0ZjE2bGUiOmNhc2UidXRmLTE2bGUiOnJldHVybiBsZW4qMjtjYXNlImhleCI6cmV0dXJuIGxlbj4+PjE7Y2FzZSJiYXNlNjQiOnJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoO2RlZmF1bHQ6aWYobG93ZXJlZENhc2Upe3JldHVybiBtdXN0TWF0Y2g/LTE6dXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGh9ZW5jb2Rpbmc9KCIiK2VuY29kaW5nKS50b0xvd2VyQ2FzZSgpO2xvd2VyZWRDYXNlPXRydWV9fX1CdWZmZXIuYnl0ZUxlbmd0aD1ieXRlTGVuZ3RoO2Z1bmN0aW9uIHNsb3dUb1N0cmluZyhlbmNvZGluZyxzdGFydCxlbmQpe3ZhciBsb3dlcmVkQ2FzZT1mYWxzZTtpZihzdGFydD09PXVuZGVmaW5lZHx8c3RhcnQ8MCl7c3RhcnQ9MH1pZihzdGFydD50aGlzLmxlbmd0aCl7cmV0dXJuIiJ9aWYoZW5kPT09dW5kZWZpbmVkfHxlbmQ+dGhpcy5sZW5ndGgpe2VuZD10aGlzLmxlbmd0aH1pZihlbmQ8PTApe3JldHVybiIifWVuZD4+Pj0wO3N0YXJ0Pj4+PTA7aWYoZW5kPD1zdGFydCl7cmV0dXJuIiJ9aWYoIWVuY29kaW5nKWVuY29kaW5nPSJ1dGY4Ijt3aGlsZSh0cnVlKXtzd2l0Y2goZW5jb2Rpbmcpe2Nhc2UiaGV4IjpyZXR1cm4gaGV4U2xpY2UodGhpcyxzdGFydCxlbmQpO2Nhc2UidXRmOCI6Y2FzZSJ1dGYtOCI6cmV0dXJuIHV0ZjhTbGljZSh0aGlzLHN0YXJ0LGVuZCk7Y2FzZSJhc2NpaSI6cmV0dXJuIGFzY2lpU2xpY2UodGhpcyxzdGFydCxlbmQpO2Nhc2UibGF0aW4xIjpjYXNlImJpbmFyeSI6cmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsc3RhcnQsZW5kKTtjYXNlImJhc2U2NCI6cmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsc3RhcnQsZW5kKTtjYXNlInVjczIiOmNhc2UidWNzLTIiOmNhc2UidXRmMTZsZSI6Y2FzZSJ1dGYtMTZsZSI6cmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLHN0YXJ0LGVuZCk7ZGVmYXVsdDppZihsb3dlcmVkQ2FzZSl0aHJvdyBuZXcgVHlwZUVycm9yKCJVbmtub3duIGVuY29kaW5nOiAiK2VuY29kaW5nKTtlbmNvZGluZz0oZW5jb2RpbmcrIiIpLnRvTG93ZXJDYXNlKCk7bG93ZXJlZENhc2U9dHJ1ZX19fUJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyPXRydWU7ZnVuY3Rpb24gc3dhcChiLG4sbSl7dmFyIGk9YltuXTtiW25dPWJbbV07YlttXT1pfUJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2PWZ1bmN0aW9uIHN3YXAxNigpe3ZhciBsZW49dGhpcy5sZW5ndGg7aWYobGVuJTIhPT0wKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigiQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMiKX1mb3IodmFyIGk9MDtpPGxlbjtpKz0yKXtzd2FwKHRoaXMsaSxpKzEpfXJldHVybiB0aGlzfTtCdWZmZXIucHJvdG90eXBlLnN3YXAzMj1mdW5jdGlvbiBzd2FwMzIoKXt2YXIgbGVuPXRoaXMubGVuZ3RoO2lmKGxlbiU0IT09MCl7dGhyb3cgbmV3IFJhbmdlRXJyb3IoIkJ1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzIil9Zm9yKHZhciBpPTA7aTxsZW47aSs9NCl7c3dhcCh0aGlzLGksaSszKTtzd2FwKHRoaXMsaSsxLGkrMil9cmV0dXJuIHRoaXN9O0J1ZmZlci5wcm90b3R5cGUuc3dhcDY0PWZ1bmN0aW9uIHN3YXA2NCgpe3ZhciBsZW49dGhpcy5sZW5ndGg7aWYobGVuJTghPT0wKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigiQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMiKX1mb3IodmFyIGk9MDtpPGxlbjtpKz04KXtzd2FwKHRoaXMsaSxpKzcpO3N3YXAodGhpcyxpKzEsaSs2KTtzd2FwKHRoaXMsaSsyLGkrNSk7c3dhcCh0aGlzLGkrMyxpKzQpfXJldHVybiB0aGlzfTtCdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uIHRvU3RyaW5nKCl7dmFyIGxlbmd0aD10aGlzLmxlbmd0aDtpZihsZW5ndGg9PT0wKXJldHVybiIiO2lmKGFyZ3VtZW50cy5sZW5ndGg9PT0wKXJldHVybiB1dGY4U2xpY2UodGhpcywwLGxlbmd0aCk7cmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLGFyZ3VtZW50cyl9O0J1ZmZlci5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmc9QnVmZmVyLnByb3RvdHlwZS50b1N0cmluZztCdWZmZXIucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbiBlcXVhbHMoYil7aWYoIUJ1ZmZlci5pc0J1ZmZlcihiKSl0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIik7aWYodGhpcz09PWIpcmV0dXJuIHRydWU7cmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsYik9PT0wfTtCdWZmZXIucHJvdG90eXBlLmluc3BlY3Q9ZnVuY3Rpb24gaW5zcGVjdCgpe3ZhciBzdHI9IiI7dmFyIG1heD1leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTO3N0cj10aGlzLnRvU3RyaW5nKCJoZXgiLDAsbWF4KS5yZXBsYWNlKC8oLnsyfSkvZywiJDEgIikudHJpbSgpO2lmKHRoaXMubGVuZ3RoPm1heClzdHIrPSIgLi4uICI7cmV0dXJuIjxCdWZmZXIgIitzdHIrIj4ifTtCdWZmZXIucHJvdG90eXBlLmNvbXBhcmU9ZnVuY3Rpb24gY29tcGFyZSh0YXJnZXQsc3RhcnQsZW5kLHRoaXNTdGFydCx0aGlzRW5kKXtpZihpc0luc3RhbmNlKHRhcmdldCxVaW50OEFycmF5KSl7dGFyZ2V0PUJ1ZmZlci5mcm9tKHRhcmdldCx0YXJnZXQub2Zmc2V0LHRhcmdldC5ieXRlTGVuZ3RoKX1pZighQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpe3Rocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSAidGFyZ2V0IiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5LiAnKyJSZWNlaXZlZCB0eXBlICIrdHlwZW9mIHRhcmdldCl9aWYoc3RhcnQ9PT11bmRlZmluZWQpe3N0YXJ0PTB9aWYoZW5kPT09dW5kZWZpbmVkKXtlbmQ9dGFyZ2V0P3RhcmdldC5sZW5ndGg6MH1pZih0aGlzU3RhcnQ9PT11bmRlZmluZWQpe3RoaXNTdGFydD0wfWlmKHRoaXNFbmQ9PT11bmRlZmluZWQpe3RoaXNFbmQ9dGhpcy5sZW5ndGh9aWYoc3RhcnQ8MHx8ZW5kPnRhcmdldC5sZW5ndGh8fHRoaXNTdGFydDwwfHx0aGlzRW5kPnRoaXMubGVuZ3RoKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigib3V0IG9mIHJhbmdlIGluZGV4Iil9aWYodGhpc1N0YXJ0Pj10aGlzRW5kJiZzdGFydD49ZW5kKXtyZXR1cm4gMH1pZih0aGlzU3RhcnQ+PXRoaXNFbmQpe3JldHVybi0xfWlmKHN0YXJ0Pj1lbmQpe3JldHVybiAxfXN0YXJ0Pj4+PTA7ZW5kPj4+PTA7dGhpc1N0YXJ0Pj4+PTA7dGhpc0VuZD4+Pj0wO2lmKHRoaXM9PT10YXJnZXQpcmV0dXJuIDA7dmFyIHg9dGhpc0VuZC10aGlzU3RhcnQ7dmFyIHk9ZW5kLXN0YXJ0O3ZhciBsZW49TWF0aC5taW4oeCx5KTt2YXIgdGhpc0NvcHk9dGhpcy5zbGljZSh0aGlzU3RhcnQsdGhpc0VuZCk7dmFyIHRhcmdldENvcHk9dGFyZ2V0LnNsaWNlKHN0YXJ0LGVuZCk7Zm9yKHZhciBpPTA7aTxsZW47KytpKXtpZih0aGlzQ29weVtpXSE9PXRhcmdldENvcHlbaV0pe3g9dGhpc0NvcHlbaV07eT10YXJnZXRDb3B5W2ldO2JyZWFrfX1pZih4PHkpcmV0dXJuLTE7aWYoeTx4KXJldHVybiAxO3JldHVybiAwfTtmdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZihidWZmZXIsdmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZGlyKXtpZihidWZmZXIubGVuZ3RoPT09MClyZXR1cm4tMTtpZih0eXBlb2YgYnl0ZU9mZnNldD09PSJzdHJpbmciKXtlbmNvZGluZz1ieXRlT2Zmc2V0O2J5dGVPZmZzZXQ9MH1lbHNlIGlmKGJ5dGVPZmZzZXQ+MjE0NzQ4MzY0Nyl7Ynl0ZU9mZnNldD0yMTQ3NDgzNjQ3fWVsc2UgaWYoYnl0ZU9mZnNldDwtMjE0NzQ4MzY0OCl7Ynl0ZU9mZnNldD0tMjE0NzQ4MzY0OH1ieXRlT2Zmc2V0PStieXRlT2Zmc2V0O2lmKG51bWJlcklzTmFOKGJ5dGVPZmZzZXQpKXtieXRlT2Zmc2V0PWRpcj8wOmJ1ZmZlci5sZW5ndGgtMX1pZihieXRlT2Zmc2V0PDApYnl0ZU9mZnNldD1idWZmZXIubGVuZ3RoK2J5dGVPZmZzZXQ7aWYoYnl0ZU9mZnNldD49YnVmZmVyLmxlbmd0aCl7aWYoZGlyKXJldHVybi0xO2Vsc2UgYnl0ZU9mZnNldD1idWZmZXIubGVuZ3RoLTF9ZWxzZSBpZihieXRlT2Zmc2V0PDApe2lmKGRpcilieXRlT2Zmc2V0PTA7ZWxzZSByZXR1cm4tMX1pZih0eXBlb2YgdmFsPT09InN0cmluZyIpe3ZhbD1CdWZmZXIuZnJvbSh2YWwsZW5jb2RpbmcpfWlmKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKXtpZih2YWwubGVuZ3RoPT09MCl7cmV0dXJuLTF9cmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsdmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZGlyKX1lbHNlIGlmKHR5cGVvZiB2YWw9PT0ibnVtYmVyIil7dmFsPXZhbCYyNTU7aWYodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2Y9PT0iZnVuY3Rpb24iKXtpZihkaXIpe3JldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLHZhbCxieXRlT2Zmc2V0KX1lbHNle3JldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlcix2YWwsYnl0ZU9mZnNldCl9fXJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLFt2YWxdLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZGlyKX10aHJvdyBuZXcgVHlwZUVycm9yKCJ2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXIiKX1mdW5jdGlvbiBhcnJheUluZGV4T2YoYXJyLHZhbCxieXRlT2Zmc2V0LGVuY29kaW5nLGRpcil7dmFyIGluZGV4U2l6ZT0xO3ZhciBhcnJMZW5ndGg9YXJyLmxlbmd0aDt2YXIgdmFsTGVuZ3RoPXZhbC5sZW5ndGg7aWYoZW5jb2RpbmchPT11bmRlZmluZWQpe2VuY29kaW5nPVN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKTtpZihlbmNvZGluZz09PSJ1Y3MyInx8ZW5jb2Rpbmc9PT0idWNzLTIifHxlbmNvZGluZz09PSJ1dGYxNmxlInx8ZW5jb2Rpbmc9PT0idXRmLTE2bGUiKXtpZihhcnIubGVuZ3RoPDJ8fHZhbC5sZW5ndGg8Mil7cmV0dXJuLTF9aW5kZXhTaXplPTI7YXJyTGVuZ3RoLz0yO3ZhbExlbmd0aC89MjtieXRlT2Zmc2V0Lz0yfX1mdW5jdGlvbiByZWFkKGJ1ZixpKXtpZihpbmRleFNpemU9PT0xKXtyZXR1cm4gYnVmW2ldfWVsc2V7cmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSppbmRleFNpemUpfX12YXIgaTtpZihkaXIpe3ZhciBmb3VuZEluZGV4PS0xO2ZvcihpPWJ5dGVPZmZzZXQ7aTxhcnJMZW5ndGg7aSsrKXtpZihyZWFkKGFycixpKT09PXJlYWQodmFsLGZvdW5kSW5kZXg9PT0tMT8wOmktZm91bmRJbmRleCkpe2lmKGZvdW5kSW5kZXg9PT0tMSlmb3VuZEluZGV4PWk7aWYoaS1mb3VuZEluZGV4KzE9PT12YWxMZW5ndGgpcmV0dXJuIGZvdW5kSW5kZXgqaW5kZXhTaXplfWVsc2V7aWYoZm91bmRJbmRleCE9PS0xKWktPWktZm91bmRJbmRleDtmb3VuZEluZGV4PS0xfX19ZWxzZXtpZihieXRlT2Zmc2V0K3ZhbExlbmd0aD5hcnJMZW5ndGgpYnl0ZU9mZnNldD1hcnJMZW5ndGgtdmFsTGVuZ3RoO2ZvcihpPWJ5dGVPZmZzZXQ7aT49MDtpLS0pe3ZhciBmb3VuZD10cnVlO2Zvcih2YXIgaj0wO2o8dmFsTGVuZ3RoO2orKyl7aWYocmVhZChhcnIsaStqKSE9PXJlYWQodmFsLGopKXtmb3VuZD1mYWxzZTticmVha319aWYoZm91bmQpcmV0dXJuIGl9fXJldHVybi0xfUJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXM9ZnVuY3Rpb24gaW5jbHVkZXModmFsLGJ5dGVPZmZzZXQsZW5jb2Rpbmcpe3JldHVybiB0aGlzLmluZGV4T2YodmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcpIT09LTF9O0J1ZmZlci5wcm90b3R5cGUuaW5kZXhPZj1mdW5jdGlvbiBpbmRleE9mKHZhbCxieXRlT2Zmc2V0LGVuY29kaW5nKXtyZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcyx2YWwsYnl0ZU9mZnNldCxlbmNvZGluZyx0cnVlKX07QnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZj1mdW5jdGlvbiBsYXN0SW5kZXhPZih2YWwsYnl0ZU9mZnNldCxlbmNvZGluZyl7cmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsdmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZmFsc2UpfTtmdW5jdGlvbiBoZXhXcml0ZShidWYsc3RyaW5nLG9mZnNldCxsZW5ndGgpe29mZnNldD1OdW1iZXIob2Zmc2V0KXx8MDt2YXIgcmVtYWluaW5nPWJ1Zi5sZW5ndGgtb2Zmc2V0O2lmKCFsZW5ndGgpe2xlbmd0aD1yZW1haW5pbmd9ZWxzZXtsZW5ndGg9TnVtYmVyKGxlbmd0aCk7aWYobGVuZ3RoPnJlbWFpbmluZyl7bGVuZ3RoPXJlbWFpbmluZ319dmFyIHN0ckxlbj1zdHJpbmcubGVuZ3RoO2lmKGxlbmd0aD5zdHJMZW4vMil7bGVuZ3RoPXN0ckxlbi8yfWZvcih2YXIgaT0wO2k8bGVuZ3RoOysraSl7dmFyIHBhcnNlZD1wYXJzZUludChzdHJpbmcuc3Vic3RyKGkqMiwyKSwxNik7aWYobnVtYmVySXNOYU4ocGFyc2VkKSlyZXR1cm4gaTtidWZbb2Zmc2V0K2ldPXBhcnNlZH1yZXR1cm4gaX1mdW5jdGlvbiB1dGY4V3JpdGUoYnVmLHN0cmluZyxvZmZzZXQsbGVuZ3RoKXtyZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsYnVmLmxlbmd0aC1vZmZzZXQpLGJ1ZixvZmZzZXQsbGVuZ3RoKX1mdW5jdGlvbiBhc2NpaVdyaXRlKGJ1ZixzdHJpbmcsb2Zmc2V0LGxlbmd0aCl7cmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksYnVmLG9mZnNldCxsZW5ndGgpfWZ1bmN0aW9uIGxhdGluMVdyaXRlKGJ1ZixzdHJpbmcsb2Zmc2V0LGxlbmd0aCl7cmV0dXJuIGFzY2lpV3JpdGUoYnVmLHN0cmluZyxvZmZzZXQsbGVuZ3RoKX1mdW5jdGlvbiBiYXNlNjRXcml0ZShidWYsc3RyaW5nLG9mZnNldCxsZW5ndGgpe3JldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSxidWYsb2Zmc2V0LGxlbmd0aCl9ZnVuY3Rpb24gdWNzMldyaXRlKGJ1ZixzdHJpbmcsb2Zmc2V0LGxlbmd0aCl7cmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLGJ1Zi5sZW5ndGgtb2Zmc2V0KSxidWYsb2Zmc2V0LGxlbmd0aCl9QnVmZmVyLnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbiB3cml0ZShzdHJpbmcsb2Zmc2V0LGxlbmd0aCxlbmNvZGluZyl7aWYob2Zmc2V0PT09dW5kZWZpbmVkKXtlbmNvZGluZz0idXRmOCI7bGVuZ3RoPXRoaXMubGVuZ3RoO29mZnNldD0wfWVsc2UgaWYobGVuZ3RoPT09dW5kZWZpbmVkJiZ0eXBlb2Ygb2Zmc2V0PT09InN0cmluZyIpe2VuY29kaW5nPW9mZnNldDtsZW5ndGg9dGhpcy5sZW5ndGg7b2Zmc2V0PTB9ZWxzZSBpZihpc0Zpbml0ZShvZmZzZXQpKXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZihpc0Zpbml0ZShsZW5ndGgpKXtsZW5ndGg9bGVuZ3RoPj4+MDtpZihlbmNvZGluZz09PXVuZGVmaW5lZCllbmNvZGluZz0idXRmOCJ9ZWxzZXtlbmNvZGluZz1sZW5ndGg7bGVuZ3RoPXVuZGVmaW5lZH19ZWxzZXt0aHJvdyBuZXcgRXJyb3IoIkJ1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkIil9dmFyIHJlbWFpbmluZz10aGlzLmxlbmd0aC1vZmZzZXQ7aWYobGVuZ3RoPT09dW5kZWZpbmVkfHxsZW5ndGg+cmVtYWluaW5nKWxlbmd0aD1yZW1haW5pbmc7aWYoc3RyaW5nLmxlbmd0aD4wJiYobGVuZ3RoPDB8fG9mZnNldDwwKXx8b2Zmc2V0PnRoaXMubGVuZ3RoKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigiQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMiKX1pZighZW5jb2RpbmcpZW5jb2Rpbmc9InV0ZjgiO3ZhciBsb3dlcmVkQ2FzZT1mYWxzZTtmb3IoOzspe3N3aXRjaChlbmNvZGluZyl7Y2FzZSJoZXgiOnJldHVybiBoZXhXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtjYXNlInV0ZjgiOmNhc2UidXRmLTgiOnJldHVybiB1dGY4V3JpdGUodGhpcyxzdHJpbmcsb2Zmc2V0LGxlbmd0aCk7Y2FzZSJhc2NpaSI6cmV0dXJuIGFzY2lpV3JpdGUodGhpcyxzdHJpbmcsb2Zmc2V0LGxlbmd0aCk7Y2FzZSJsYXRpbjEiOmNhc2UiYmluYXJ5IjpyZXR1cm4gbGF0aW4xV3JpdGUodGhpcyxzdHJpbmcsb2Zmc2V0LGxlbmd0aCk7Y2FzZSJiYXNlNjQiOnJldHVybiBiYXNlNjRXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtjYXNlInVjczIiOmNhc2UidWNzLTIiOmNhc2UidXRmMTZsZSI6Y2FzZSJ1dGYtMTZsZSI6cmV0dXJuIHVjczJXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtkZWZhdWx0OmlmKGxvd2VyZWRDYXNlKXRocm93IG5ldyBUeXBlRXJyb3IoIlVua25vd24gZW5jb2Rpbmc6ICIrZW5jb2RpbmcpO2VuY29kaW5nPSgiIitlbmNvZGluZykudG9Mb3dlckNhc2UoKTtsb3dlcmVkQ2FzZT10cnVlfX19O0J1ZmZlci5wcm90b3R5cGUudG9KU09OPWZ1bmN0aW9uIHRvSlNPTigpe3JldHVybnt0eXBlOiJCdWZmZXIiLGRhdGE6QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyfHx0aGlzLDApfX07ZnVuY3Rpb24gYmFzZTY0U2xpY2UoYnVmLHN0YXJ0LGVuZCl7aWYoc3RhcnQ9PT0wJiZlbmQ9PT1idWYubGVuZ3RoKXtyZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKX1lbHNle3JldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsZW5kKSl9fWZ1bmN0aW9uIHV0ZjhTbGljZShidWYsc3RhcnQsZW5kKXtlbmQ9TWF0aC5taW4oYnVmLmxlbmd0aCxlbmQpO3ZhciByZXM9W107dmFyIGk9c3RhcnQ7d2hpbGUoaTxlbmQpe3ZhciBmaXJzdEJ5dGU9YnVmW2ldO3ZhciBjb2RlUG9pbnQ9bnVsbDt2YXIgYnl0ZXNQZXJTZXF1ZW5jZT1maXJzdEJ5dGU+MjM5PzQ6Zmlyc3RCeXRlPjIyMz8zOmZpcnN0Qnl0ZT4xOTE/MjoxO2lmKGkrYnl0ZXNQZXJTZXF1ZW5jZTw9ZW5kKXt2YXIgc2Vjb25kQnl0ZSx0aGlyZEJ5dGUsZm91cnRoQnl0ZSx0ZW1wQ29kZVBvaW50O3N3aXRjaChieXRlc1BlclNlcXVlbmNlKXtjYXNlIDE6aWYoZmlyc3RCeXRlPDEyOCl7Y29kZVBvaW50PWZpcnN0Qnl0ZX1icmVhaztjYXNlIDI6c2Vjb25kQnl0ZT1idWZbaSsxXTtpZigoc2Vjb25kQnl0ZSYxOTIpPT09MTI4KXt0ZW1wQ29kZVBvaW50PShmaXJzdEJ5dGUmMzEpPDw2fHNlY29uZEJ5dGUmNjM7aWYodGVtcENvZGVQb2ludD4xMjcpe2NvZGVQb2ludD10ZW1wQ29kZVBvaW50fX1icmVhaztjYXNlIDM6c2Vjb25kQnl0ZT1idWZbaSsxXTt0aGlyZEJ5dGU9YnVmW2krMl07aWYoKHNlY29uZEJ5dGUmMTkyKT09PTEyOCYmKHRoaXJkQnl0ZSYxOTIpPT09MTI4KXt0ZW1wQ29kZVBvaW50PShmaXJzdEJ5dGUmMTUpPDwxMnwoc2Vjb25kQnl0ZSY2Myk8PDZ8dGhpcmRCeXRlJjYzO2lmKHRlbXBDb2RlUG9pbnQ+MjA0NyYmKHRlbXBDb2RlUG9pbnQ8NTUyOTZ8fHRlbXBDb2RlUG9pbnQ+NTczNDMpKXtjb2RlUG9pbnQ9dGVtcENvZGVQb2ludH19YnJlYWs7Y2FzZSA0OnNlY29uZEJ5dGU9YnVmW2krMV07dGhpcmRCeXRlPWJ1ZltpKzJdO2ZvdXJ0aEJ5dGU9YnVmW2krM107aWYoKHNlY29uZEJ5dGUmMTkyKT09PTEyOCYmKHRoaXJkQnl0ZSYxOTIpPT09MTI4JiYoZm91cnRoQnl0ZSYxOTIpPT09MTI4KXt0ZW1wQ29kZVBvaW50PShmaXJzdEJ5dGUmMTUpPDwxOHwoc2Vjb25kQnl0ZSY2Myk8PDEyfCh0aGlyZEJ5dGUmNjMpPDw2fGZvdXJ0aEJ5dGUmNjM7aWYodGVtcENvZGVQb2ludD42NTUzNSYmdGVtcENvZGVQb2ludDwxMTE0MTEyKXtjb2RlUG9pbnQ9dGVtcENvZGVQb2ludH19fX1pZihjb2RlUG9pbnQ9PT1udWxsKXtjb2RlUG9pbnQ9NjU1MzM7Ynl0ZXNQZXJTZXF1ZW5jZT0xfWVsc2UgaWYoY29kZVBvaW50PjY1NTM1KXtjb2RlUG9pbnQtPTY1NTM2O3Jlcy5wdXNoKGNvZGVQb2ludD4+PjEwJjEwMjN8NTUyOTYpO2NvZGVQb2ludD01NjMyMHxjb2RlUG9pbnQmMTAyM31yZXMucHVzaChjb2RlUG9pbnQpO2krPWJ5dGVzUGVyU2VxdWVuY2V9cmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpfXZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSD00MDk2O2Z1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheShjb2RlUG9pbnRzKXt2YXIgbGVuPWNvZGVQb2ludHMubGVuZ3RoO2lmKGxlbjw9TUFYX0FSR1VNRU5UU19MRU5HVEgpe3JldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZyxjb2RlUG9pbnRzKX12YXIgcmVzPSIiO3ZhciBpPTA7d2hpbGUoaTxsZW4pe3Jlcys9U3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsY29kZVBvaW50cy5zbGljZShpLGkrPU1BWF9BUkdVTUVOVFNfTEVOR1RIKSl9cmV0dXJuIHJlc31mdW5jdGlvbiBhc2NpaVNsaWNlKGJ1ZixzdGFydCxlbmQpe3ZhciByZXQ9IiI7ZW5kPU1hdGgubWluKGJ1Zi5sZW5ndGgsZW5kKTtmb3IodmFyIGk9c3RhcnQ7aTxlbmQ7KytpKXtyZXQrPVN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldJjEyNyl9cmV0dXJuIHJldH1mdW5jdGlvbiBsYXRpbjFTbGljZShidWYsc3RhcnQsZW5kKXt2YXIgcmV0PSIiO2VuZD1NYXRoLm1pbihidWYubGVuZ3RoLGVuZCk7Zm9yKHZhciBpPXN0YXJ0O2k8ZW5kOysraSl7cmV0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSl9cmV0dXJuIHJldH1mdW5jdGlvbiBoZXhTbGljZShidWYsc3RhcnQsZW5kKXt2YXIgbGVuPWJ1Zi5sZW5ndGg7aWYoIXN0YXJ0fHxzdGFydDwwKXN0YXJ0PTA7aWYoIWVuZHx8ZW5kPDB8fGVuZD5sZW4pZW5kPWxlbjt2YXIgb3V0PSIiO2Zvcih2YXIgaT1zdGFydDtpPGVuZDsrK2kpe291dCs9dG9IZXgoYnVmW2ldKX1yZXR1cm4gb3V0fWZ1bmN0aW9uIHV0ZjE2bGVTbGljZShidWYsc3RhcnQsZW5kKXt2YXIgYnl0ZXM9YnVmLnNsaWNlKHN0YXJ0LGVuZCk7dmFyIHJlcz0iIjtmb3IodmFyIGk9MDtpPGJ5dGVzLmxlbmd0aDtpKz0yKXtyZXMrPVN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0rYnl0ZXNbaSsxXSoyNTYpfXJldHVybiByZXN9QnVmZmVyLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbiBzbGljZShzdGFydCxlbmQpe3ZhciBsZW49dGhpcy5sZW5ndGg7c3RhcnQ9fn5zdGFydDtlbmQ9ZW5kPT09dW5kZWZpbmVkP2xlbjp+fmVuZDtpZihzdGFydDwwKXtzdGFydCs9bGVuO2lmKHN0YXJ0PDApc3RhcnQ9MH1lbHNlIGlmKHN0YXJ0Pmxlbil7c3RhcnQ9bGVufWlmKGVuZDwwKXtlbmQrPWxlbjtpZihlbmQ8MCllbmQ9MH1lbHNlIGlmKGVuZD5sZW4pe2VuZD1sZW59aWYoZW5kPHN0YXJ0KWVuZD1zdGFydDt2YXIgbmV3QnVmPXRoaXMuc3ViYXJyYXkoc3RhcnQsZW5kKTtuZXdCdWYuX19wcm90b19fPUJ1ZmZlci5wcm90b3R5cGU7cmV0dXJuIG5ld0J1Zn07ZnVuY3Rpb24gY2hlY2tPZmZzZXQob2Zmc2V0LGV4dCxsZW5ndGgpe2lmKG9mZnNldCUxIT09MHx8b2Zmc2V0PDApdGhyb3cgbmV3IFJhbmdlRXJyb3IoIm9mZnNldCBpcyBub3QgdWludCIpO2lmKG9mZnNldCtleHQ+bGVuZ3RoKXRocm93IG5ldyBSYW5nZUVycm9yKCJUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoIil9QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFPWZ1bmN0aW9uIHJlYWRVSW50TEUob2Zmc2V0LGJ5dGVMZW5ndGgsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCxieXRlTGVuZ3RoLHRoaXMubGVuZ3RoKTt2YXIgdmFsPXRoaXNbb2Zmc2V0XTt2YXIgbXVsPTE7dmFyIGk9MDt3aGlsZSgrK2k8Ynl0ZUxlbmd0aCYmKG11bCo9MjU2KSl7dmFsKz10aGlzW29mZnNldCtpXSptdWx9cmV0dXJuIHZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFPWZ1bmN0aW9uIHJlYWRVSW50QkUob2Zmc2V0LGJ5dGVMZW5ndGgsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KXtjaGVja09mZnNldChvZmZzZXQsYnl0ZUxlbmd0aCx0aGlzLmxlbmd0aCl9dmFyIHZhbD10aGlzW29mZnNldCstLWJ5dGVMZW5ndGhdO3ZhciBtdWw9MTt3aGlsZShieXRlTGVuZ3RoPjAmJihtdWwqPTI1Nikpe3ZhbCs9dGhpc1tvZmZzZXQrLS1ieXRlTGVuZ3RoXSptdWx9cmV0dXJuIHZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDg9ZnVuY3Rpb24gcmVhZFVJbnQ4KG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCwxLHRoaXMubGVuZ3RoKTtyZXR1cm4gdGhpc1tvZmZzZXRdfTtCdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRT1mdW5jdGlvbiByZWFkVUludDE2TEUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDIsdGhpcy5sZW5ndGgpO3JldHVybiB0aGlzW29mZnNldF18dGhpc1tvZmZzZXQrMV08PDh9O0J1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFPWZ1bmN0aW9uIHJlYWRVSW50MTZCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsMix0aGlzLmxlbmd0aCk7cmV0dXJuIHRoaXNbb2Zmc2V0XTw8OHx0aGlzW29mZnNldCsxXX07QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEU9ZnVuY3Rpb24gcmVhZFVJbnQzMkxFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCw0LHRoaXMubGVuZ3RoKTtyZXR1cm4odGhpc1tvZmZzZXRdfHRoaXNbb2Zmc2V0KzFdPDw4fHRoaXNbb2Zmc2V0KzJdPDwxNikrdGhpc1tvZmZzZXQrM10qMTY3NzcyMTZ9O0J1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFPWZ1bmN0aW9uIHJlYWRVSW50MzJCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsNCx0aGlzLmxlbmd0aCk7cmV0dXJuIHRoaXNbb2Zmc2V0XSoxNjc3NzIxNisodGhpc1tvZmZzZXQrMV08PDE2fHRoaXNbb2Zmc2V0KzJdPDw4fHRoaXNbb2Zmc2V0KzNdKX07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEU9ZnVuY3Rpb24gcmVhZEludExFKG9mZnNldCxieXRlTGVuZ3RoLG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtieXRlTGVuZ3RoPWJ5dGVMZW5ndGg+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsYnl0ZUxlbmd0aCx0aGlzLmxlbmd0aCk7dmFyIHZhbD10aGlzW29mZnNldF07dmFyIG11bD0xO3ZhciBpPTA7d2hpbGUoKytpPGJ5dGVMZW5ndGgmJihtdWwqPTI1Nikpe3ZhbCs9dGhpc1tvZmZzZXQraV0qbXVsfW11bCo9MTI4O2lmKHZhbD49bXVsKXZhbC09TWF0aC5wb3coMiw4KmJ5dGVMZW5ndGgpO3JldHVybiB2YWx9O0J1ZmZlci5wcm90b3R5cGUucmVhZEludEJFPWZ1bmN0aW9uIHJlYWRJbnRCRShvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7Ynl0ZUxlbmd0aD1ieXRlTGVuZ3RoPj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LGJ5dGVMZW5ndGgsdGhpcy5sZW5ndGgpO3ZhciBpPWJ5dGVMZW5ndGg7dmFyIG11bD0xO3ZhciB2YWw9dGhpc1tvZmZzZXQrLS1pXTt3aGlsZShpPjAmJihtdWwqPTI1Nikpe3ZhbCs9dGhpc1tvZmZzZXQrLS1pXSptdWx9bXVsKj0xMjg7aWYodmFsPj1tdWwpdmFsLT1NYXRoLnBvdygyLDgqYnl0ZUxlbmd0aCk7cmV0dXJuIHZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OD1mdW5jdGlvbiByZWFkSW50OChvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsMSx0aGlzLmxlbmd0aCk7aWYoISh0aGlzW29mZnNldF0mMTI4KSlyZXR1cm4gdGhpc1tvZmZzZXRdO3JldHVybigyNTUtdGhpc1tvZmZzZXRdKzEpKi0xfTtCdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFPWZ1bmN0aW9uIHJlYWRJbnQxNkxFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCwyLHRoaXMubGVuZ3RoKTt2YXIgdmFsPXRoaXNbb2Zmc2V0XXx0aGlzW29mZnNldCsxXTw8ODtyZXR1cm4gdmFsJjMyNzY4P3ZhbHw0Mjk0OTAxNzYwOnZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRT1mdW5jdGlvbiByZWFkSW50MTZCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsMix0aGlzLmxlbmd0aCk7dmFyIHZhbD10aGlzW29mZnNldCsxXXx0aGlzW29mZnNldF08PDg7cmV0dXJuIHZhbCYzMjc2OD92YWx8NDI5NDkwMTc2MDp2YWx9O0J1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEU9ZnVuY3Rpb24gcmVhZEludDMyTEUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDQsdGhpcy5sZW5ndGgpO3JldHVybiB0aGlzW29mZnNldF18dGhpc1tvZmZzZXQrMV08PDh8dGhpc1tvZmZzZXQrMl08PDE2fHRoaXNbb2Zmc2V0KzNdPDwyNH07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRT1mdW5jdGlvbiByZWFkSW50MzJCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsNCx0aGlzLmxlbmd0aCk7cmV0dXJuIHRoaXNbb2Zmc2V0XTw8MjR8dGhpc1tvZmZzZXQrMV08PDE2fHRoaXNbb2Zmc2V0KzJdPDw4fHRoaXNbb2Zmc2V0KzNdfTtCdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFPWZ1bmN0aW9uIHJlYWRGbG9hdExFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCw0LHRoaXMubGVuZ3RoKTtyZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsb2Zmc2V0LHRydWUsMjMsNCl9O0J1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkU9ZnVuY3Rpb24gcmVhZEZsb2F0QkUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDQsdGhpcy5sZW5ndGgpO3JldHVybiBpZWVlNzU0LnJlYWQodGhpcyxvZmZzZXQsZmFsc2UsMjMsNCl9O0J1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFPWZ1bmN0aW9uIHJlYWREb3VibGVMRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsOCx0aGlzLmxlbmd0aCk7cmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLG9mZnNldCx0cnVlLDUyLDgpfTtCdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRT1mdW5jdGlvbiByZWFkRG91YmxlQkUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDgsdGhpcy5sZW5ndGgpO3JldHVybiBpZWVlNzU0LnJlYWQodGhpcyxvZmZzZXQsZmFsc2UsNTIsOCl9O2Z1bmN0aW9uIGNoZWNrSW50KGJ1Zix2YWx1ZSxvZmZzZXQsZXh0LG1heCxtaW4pe2lmKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSl0aHJvdyBuZXcgVHlwZUVycm9yKCciYnVmZmVyIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJyk7aWYodmFsdWU+bWF4fHx2YWx1ZTxtaW4pdGhyb3cgbmV3IFJhbmdlRXJyb3IoJyJ2YWx1ZSIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpO2lmKG9mZnNldCtleHQ+YnVmLmxlbmd0aCl0aHJvdyBuZXcgUmFuZ2VFcnJvcigiSW5kZXggb3V0IG9mIHJhbmdlIil9QnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRT1mdW5jdGlvbiB3cml0ZVVJbnRMRSh2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KXt2YXIgbWF4Qnl0ZXM9TWF0aC5wb3coMiw4KmJ5dGVMZW5ndGgpLTE7Y2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxtYXhCeXRlcywwKX12YXIgbXVsPTE7dmFyIGk9MDt0aGlzW29mZnNldF09dmFsdWUmMjU1O3doaWxlKCsraTxieXRlTGVuZ3RoJiYobXVsKj0yNTYpKXt0aGlzW29mZnNldCtpXT12YWx1ZS9tdWwmMjU1fXJldHVybiBvZmZzZXQrYnl0ZUxlbmd0aH07QnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRT1mdW5jdGlvbiB3cml0ZVVJbnRCRSh2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KXt2YXIgbWF4Qnl0ZXM9TWF0aC5wb3coMiw4KmJ5dGVMZW5ndGgpLTE7Y2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxtYXhCeXRlcywwKX12YXIgaT1ieXRlTGVuZ3RoLTE7dmFyIG11bD0xO3RoaXNbb2Zmc2V0K2ldPXZhbHVlJjI1NTt3aGlsZSgtLWk+PTAmJihtdWwqPTI1Nikpe3RoaXNbb2Zmc2V0K2ldPXZhbHVlL211bCYyNTV9cmV0dXJuIG9mZnNldCtieXRlTGVuZ3RofTtCdWZmZXIucHJvdG90eXBlLndyaXRlVUludDg9ZnVuY3Rpb24gd3JpdGVVSW50OCh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsMSwyNTUsMCk7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTtyZXR1cm4gb2Zmc2V0KzF9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRT1mdW5jdGlvbiB3cml0ZVVJbnQxNkxFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCwyLDY1NTM1LDApO3RoaXNbb2Zmc2V0XT12YWx1ZSYyNTU7dGhpc1tvZmZzZXQrMV09dmFsdWU+Pj44O3JldHVybiBvZmZzZXQrMn07QnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFPWZ1bmN0aW9uIHdyaXRlVUludDE2QkUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LDIsNjU1MzUsMCk7dGhpc1tvZmZzZXRdPXZhbHVlPj4+ODt0aGlzW29mZnNldCsxXT12YWx1ZSYyNTU7cmV0dXJuIG9mZnNldCsyfTtCdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEU9ZnVuY3Rpb24gd3JpdGVVSW50MzJMRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsNCw0Mjk0OTY3Mjk1LDApO3RoaXNbb2Zmc2V0KzNdPXZhbHVlPj4+MjQ7dGhpc1tvZmZzZXQrMl09dmFsdWU+Pj4xNjt0aGlzW29mZnNldCsxXT12YWx1ZT4+Pjg7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTtyZXR1cm4gb2Zmc2V0KzR9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRT1mdW5jdGlvbiB3cml0ZVVJbnQzMkJFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCw0LDQyOTQ5NjcyOTUsMCk7dGhpc1tvZmZzZXRdPXZhbHVlPj4+MjQ7dGhpc1tvZmZzZXQrMV09dmFsdWU+Pj4xNjt0aGlzW29mZnNldCsyXT12YWx1ZT4+Pjg7dGhpc1tvZmZzZXQrM109dmFsdWUmMjU1O3JldHVybiBvZmZzZXQrNH07QnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFPWZ1bmN0aW9uIHdyaXRlSW50TEUodmFsdWUsb2Zmc2V0LGJ5dGVMZW5ndGgsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpe3ZhciBsaW1pdD1NYXRoLnBvdygyLDgqYnl0ZUxlbmd0aC0xKTtjaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCxieXRlTGVuZ3RoLGxpbWl0LTEsLWxpbWl0KX12YXIgaT0wO3ZhciBtdWw9MTt2YXIgc3ViPTA7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTt3aGlsZSgrK2k8Ynl0ZUxlbmd0aCYmKG11bCo9MjU2KSl7aWYodmFsdWU8MCYmc3ViPT09MCYmdGhpc1tvZmZzZXQraS0xXSE9PTApe3N1Yj0xfXRoaXNbb2Zmc2V0K2ldPSh2YWx1ZS9tdWw+PjApLXN1YiYyNTV9cmV0dXJuIG9mZnNldCtieXRlTGVuZ3RofTtCdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkU9ZnVuY3Rpb24gd3JpdGVJbnRCRSh2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCl7dmFyIGxpbWl0PU1hdGgucG93KDIsOCpieXRlTGVuZ3RoLTEpO2NoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LGJ5dGVMZW5ndGgsbGltaXQtMSwtbGltaXQpfXZhciBpPWJ5dGVMZW5ndGgtMTt2YXIgbXVsPTE7dmFyIHN1Yj0wO3RoaXNbb2Zmc2V0K2ldPXZhbHVlJjI1NTt3aGlsZSgtLWk+PTAmJihtdWwqPTI1Nikpe2lmKHZhbHVlPDAmJnN1Yj09PTAmJnRoaXNbb2Zmc2V0K2krMV0hPT0wKXtzdWI9MX10aGlzW29mZnNldCtpXT0odmFsdWUvbXVsPj4wKS1zdWImMjU1fXJldHVybiBvZmZzZXQrYnl0ZUxlbmd0aH07QnVmZmVyLnByb3RvdHlwZS53cml0ZUludDg9ZnVuY3Rpb24gd3JpdGVJbnQ4KHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCwxLDEyNywtMTI4KTtpZih2YWx1ZTwwKXZhbHVlPTI1NSt2YWx1ZSsxO3RoaXNbb2Zmc2V0XT12YWx1ZSYyNTU7cmV0dXJuIG9mZnNldCsxfTtCdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRT1mdW5jdGlvbiB3cml0ZUludDE2TEUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LDIsMzI3NjcsLTMyNzY4KTt0aGlzW29mZnNldF09dmFsdWUmMjU1O3RoaXNbb2Zmc2V0KzFdPXZhbHVlPj4+ODtyZXR1cm4gb2Zmc2V0KzJ9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFPWZ1bmN0aW9uIHdyaXRlSW50MTZCRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsMiwzMjc2NywtMzI3NjgpO3RoaXNbb2Zmc2V0XT12YWx1ZT4+Pjg7dGhpc1tvZmZzZXQrMV09dmFsdWUmMjU1O3JldHVybiBvZmZzZXQrMn07QnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEU9ZnVuY3Rpb24gd3JpdGVJbnQzMkxFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCw0LDIxNDc0ODM2NDcsLTIxNDc0ODM2NDgpO3RoaXNbb2Zmc2V0XT12YWx1ZSYyNTU7dGhpc1tvZmZzZXQrMV09dmFsdWU+Pj44O3RoaXNbb2Zmc2V0KzJdPXZhbHVlPj4+MTY7dGhpc1tvZmZzZXQrM109dmFsdWU+Pj4yNDtyZXR1cm4gb2Zmc2V0KzR9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFPWZ1bmN0aW9uIHdyaXRlSW50MzJCRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsNCwyMTQ3NDgzNjQ3LC0yMTQ3NDgzNjQ4KTtpZih2YWx1ZTwwKXZhbHVlPTQyOTQ5NjcyOTUrdmFsdWUrMTt0aGlzW29mZnNldF09dmFsdWU+Pj4yNDt0aGlzW29mZnNldCsxXT12YWx1ZT4+PjE2O3RoaXNbb2Zmc2V0KzJdPXZhbHVlPj4+ODt0aGlzW29mZnNldCszXT12YWx1ZSYyNTU7cmV0dXJuIG9mZnNldCs0fTtmdW5jdGlvbiBjaGVja0lFRUU3NTQoYnVmLHZhbHVlLG9mZnNldCxleHQsbWF4LG1pbil7aWYob2Zmc2V0K2V4dD5idWYubGVuZ3RoKXRocm93IG5ldyBSYW5nZUVycm9yKCJJbmRleCBvdXQgb2YgcmFuZ2UiKTtpZihvZmZzZXQ8MCl0aHJvdyBuZXcgUmFuZ2VFcnJvcigiSW5kZXggb3V0IG9mIHJhbmdlIil9ZnVuY3Rpb24gd3JpdGVGbG9hdChidWYsdmFsdWUsb2Zmc2V0LGxpdHRsZUVuZGlhbixub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCl7Y2hlY2tJRUVFNzU0KGJ1Zix2YWx1ZSxvZmZzZXQsNCwzNDAyODIzNDY2Mzg1Mjg4NmUyMiwtMzQwMjgyMzQ2NjM4NTI4ODZlMjIpfWllZWU3NTQud3JpdGUoYnVmLHZhbHVlLG9mZnNldCxsaXR0bGVFbmRpYW4sMjMsNCk7cmV0dXJuIG9mZnNldCs0fUJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFPWZ1bmN0aW9uIHdyaXRlRmxvYXRMRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3JldHVybiB3cml0ZUZsb2F0KHRoaXMsdmFsdWUsb2Zmc2V0LHRydWUsbm9Bc3NlcnQpfTtCdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRT1mdW5jdGlvbiB3cml0ZUZsb2F0QkUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXtyZXR1cm4gd3JpdGVGbG9hdCh0aGlzLHZhbHVlLG9mZnNldCxmYWxzZSxub0Fzc2VydCl9O2Z1bmN0aW9uIHdyaXRlRG91YmxlKGJ1Zix2YWx1ZSxvZmZzZXQsbGl0dGxlRW5kaWFuLG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KXtjaGVja0lFRUU3NTQoYnVmLHZhbHVlLG9mZnNldCw4LDE3OTc2OTMxMzQ4NjIzMTU3ZTI5MiwtMTc5NzY5MzEzNDg2MjMxNTdlMjkyKX1pZWVlNzU0LndyaXRlKGJ1Zix2YWx1ZSxvZmZzZXQsbGl0dGxlRW5kaWFuLDUyLDgpO3JldHVybiBvZmZzZXQrOH1CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEU9ZnVuY3Rpb24gd3JpdGVEb3VibGVMRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3JldHVybiB3cml0ZURvdWJsZSh0aGlzLHZhbHVlLG9mZnNldCx0cnVlLG5vQXNzZXJ0KX07QnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFPWZ1bmN0aW9uIHdyaXRlRG91YmxlQkUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXtyZXR1cm4gd3JpdGVEb3VibGUodGhpcyx2YWx1ZSxvZmZzZXQsZmFsc2Usbm9Bc3NlcnQpfTtCdWZmZXIucHJvdG90eXBlLmNvcHk9ZnVuY3Rpb24gY29weSh0YXJnZXQsdGFyZ2V0U3RhcnQsc3RhcnQsZW5kKXtpZighQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgc2hvdWxkIGJlIGEgQnVmZmVyIik7aWYoIXN0YXJ0KXN0YXJ0PTA7aWYoIWVuZCYmZW5kIT09MCllbmQ9dGhpcy5sZW5ndGg7aWYodGFyZ2V0U3RhcnQ+PXRhcmdldC5sZW5ndGgpdGFyZ2V0U3RhcnQ9dGFyZ2V0Lmxlbmd0aDtpZighdGFyZ2V0U3RhcnQpdGFyZ2V0U3RhcnQ9MDtpZihlbmQ+MCYmZW5kPHN0YXJ0KWVuZD1zdGFydDtpZihlbmQ9PT1zdGFydClyZXR1cm4gMDtpZih0YXJnZXQubGVuZ3RoPT09MHx8dGhpcy5sZW5ndGg9PT0wKXJldHVybiAwO2lmKHRhcmdldFN0YXJ0PDApe3Rocm93IG5ldyBSYW5nZUVycm9yKCJ0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzIil9aWYoc3RhcnQ8MHx8c3RhcnQ+PXRoaXMubGVuZ3RoKXRocm93IG5ldyBSYW5nZUVycm9yKCJJbmRleCBvdXQgb2YgcmFuZ2UiKTtpZihlbmQ8MCl0aHJvdyBuZXcgUmFuZ2VFcnJvcigic291cmNlRW5kIG91dCBvZiBib3VuZHMiKTtpZihlbmQ+dGhpcy5sZW5ndGgpZW5kPXRoaXMubGVuZ3RoO2lmKHRhcmdldC5sZW5ndGgtdGFyZ2V0U3RhcnQ8ZW5kLXN0YXJ0KXtlbmQ9dGFyZ2V0Lmxlbmd0aC10YXJnZXRTdGFydCtzdGFydH12YXIgbGVuPWVuZC1zdGFydDtpZih0aGlzPT09dGFyZ2V0JiZ0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuY29weVdpdGhpbj09PSJmdW5jdGlvbiIpe3RoaXMuY29weVdpdGhpbih0YXJnZXRTdGFydCxzdGFydCxlbmQpfWVsc2UgaWYodGhpcz09PXRhcmdldCYmc3RhcnQ8dGFyZ2V0U3RhcnQmJnRhcmdldFN0YXJ0PGVuZCl7Zm9yKHZhciBpPWxlbi0xO2k+PTA7LS1pKXt0YXJnZXRbaSt0YXJnZXRTdGFydF09dGhpc1tpK3N0YXJ0XX19ZWxzZXtVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbCh0YXJnZXQsdGhpcy5zdWJhcnJheShzdGFydCxlbmQpLHRhcmdldFN0YXJ0KX1yZXR1cm4gbGVufTtCdWZmZXIucHJvdG90eXBlLmZpbGw9ZnVuY3Rpb24gZmlsbCh2YWwsc3RhcnQsZW5kLGVuY29kaW5nKXtpZih0eXBlb2YgdmFsPT09InN0cmluZyIpe2lmKHR5cGVvZiBzdGFydD09PSJzdHJpbmciKXtlbmNvZGluZz1zdGFydDtzdGFydD0wO2VuZD10aGlzLmxlbmd0aH1lbHNlIGlmKHR5cGVvZiBlbmQ9PT0ic3RyaW5nIil7ZW5jb2Rpbmc9ZW5kO2VuZD10aGlzLmxlbmd0aH1pZihlbmNvZGluZyE9PXVuZGVmaW5lZCYmdHlwZW9mIGVuY29kaW5nIT09InN0cmluZyIpe3Rocm93IG5ldyBUeXBlRXJyb3IoImVuY29kaW5nIG11c3QgYmUgYSBzdHJpbmciKX1pZih0eXBlb2YgZW5jb2Rpbmc9PT0ic3RyaW5nIiYmIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSl7dGhyb3cgbmV3IFR5cGVFcnJvcigiVW5rbm93biBlbmNvZGluZzogIitlbmNvZGluZyl9aWYodmFsLmxlbmd0aD09PTEpe3ZhciBjb2RlPXZhbC5jaGFyQ29kZUF0KDApO2lmKGVuY29kaW5nPT09InV0ZjgiJiZjb2RlPDEyOHx8ZW5jb2Rpbmc9PT0ibGF0aW4xIil7dmFsPWNvZGV9fX1lbHNlIGlmKHR5cGVvZiB2YWw9PT0ibnVtYmVyIil7dmFsPXZhbCYyNTV9aWYoc3RhcnQ8MHx8dGhpcy5sZW5ndGg8c3RhcnR8fHRoaXMubGVuZ3RoPGVuZCl7dGhyb3cgbmV3IFJhbmdlRXJyb3IoIk91dCBvZiByYW5nZSBpbmRleCIpfWlmKGVuZDw9c3RhcnQpe3JldHVybiB0aGlzfXN0YXJ0PXN0YXJ0Pj4+MDtlbmQ9ZW5kPT09dW5kZWZpbmVkP3RoaXMubGVuZ3RoOmVuZD4+PjA7aWYoIXZhbCl2YWw9MDt2YXIgaTtpZih0eXBlb2YgdmFsPT09Im51bWJlciIpe2ZvcihpPXN0YXJ0O2k8ZW5kOysraSl7dGhpc1tpXT12YWx9fWVsc2V7dmFyIGJ5dGVzPUJ1ZmZlci5pc0J1ZmZlcih2YWwpP3ZhbDpCdWZmZXIuZnJvbSh2YWwsZW5jb2RpbmcpO3ZhciBsZW49Ynl0ZXMubGVuZ3RoO2lmKGxlbj09PTApe3Rocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSAiJyt2YWwrJyIgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgInZhbHVlIicpfWZvcihpPTA7aTxlbmQtc3RhcnQ7KytpKXt0aGlzW2krc3RhcnRdPWJ5dGVzW2klbGVuXX19cmV0dXJuIHRoaXN9O3ZhciBJTlZBTElEX0JBU0U2NF9SRT0vW14rLzAtOUEtWmEtei1fXS9nO2Z1bmN0aW9uIGJhc2U2NGNsZWFuKHN0cil7c3RyPXN0ci5zcGxpdCgiPSIpWzBdO3N0cj1zdHIudHJpbSgpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsIiIpO2lmKHN0ci5sZW5ndGg8MilyZXR1cm4iIjt3aGlsZShzdHIubGVuZ3RoJTQhPT0wKXtzdHI9c3RyKyI9In1yZXR1cm4gc3RyfWZ1bmN0aW9uIHRvSGV4KG4pe2lmKG48MTYpcmV0dXJuIjAiK24udG9TdHJpbmcoMTYpO3JldHVybiBuLnRvU3RyaW5nKDE2KX1mdW5jdGlvbiB1dGY4VG9CeXRlcyhzdHJpbmcsdW5pdHMpe3VuaXRzPXVuaXRzfHxJbmZpbml0eTt2YXIgY29kZVBvaW50O3ZhciBsZW5ndGg9c3RyaW5nLmxlbmd0aDt2YXIgbGVhZFN1cnJvZ2F0ZT1udWxsO3ZhciBieXRlcz1bXTtmb3IodmFyIGk9MDtpPGxlbmd0aDsrK2kpe2NvZGVQb2ludD1zdHJpbmcuY2hhckNvZGVBdChpKTtpZihjb2RlUG9pbnQ+NTUyOTUmJmNvZGVQb2ludDw1NzM0NCl7aWYoIWxlYWRTdXJyb2dhdGUpe2lmKGNvZGVQb2ludD41NjMxOSl7aWYoKHVuaXRzLT0zKT4tMSlieXRlcy5wdXNoKDIzOSwxOTEsMTg5KTtjb250aW51ZX1lbHNlIGlmKGkrMT09PWxlbmd0aCl7aWYoKHVuaXRzLT0zKT4tMSlieXRlcy5wdXNoKDIzOSwxOTEsMTg5KTtjb250aW51ZX1sZWFkU3Vycm9nYXRlPWNvZGVQb2ludDtjb250aW51ZX1pZihjb2RlUG9pbnQ8NTYzMjApe2lmKCh1bml0cy09Myk+LTEpYnl0ZXMucHVzaCgyMzksMTkxLDE4OSk7bGVhZFN1cnJvZ2F0ZT1jb2RlUG9pbnQ7Y29udGludWV9Y29kZVBvaW50PShsZWFkU3Vycm9nYXRlLTU1Mjk2PDwxMHxjb2RlUG9pbnQtNTYzMjApKzY1NTM2fWVsc2UgaWYobGVhZFN1cnJvZ2F0ZSl7aWYoKHVuaXRzLT0zKT4tMSlieXRlcy5wdXNoKDIzOSwxOTEsMTg5KX1sZWFkU3Vycm9nYXRlPW51bGw7aWYoY29kZVBvaW50PDEyOCl7aWYoKHVuaXRzLT0xKTwwKWJyZWFrO2J5dGVzLnB1c2goY29kZVBvaW50KX1lbHNlIGlmKGNvZGVQb2ludDwyMDQ4KXtpZigodW5pdHMtPTIpPDApYnJlYWs7Ynl0ZXMucHVzaChjb2RlUG9pbnQ+PjZ8MTkyLGNvZGVQb2ludCY2M3wxMjgpfWVsc2UgaWYoY29kZVBvaW50PDY1NTM2KXtpZigodW5pdHMtPTMpPDApYnJlYWs7Ynl0ZXMucHVzaChjb2RlUG9pbnQ+PjEyfDIyNCxjb2RlUG9pbnQ+PjYmNjN8MTI4LGNvZGVQb2ludCY2M3wxMjgpfWVsc2UgaWYoY29kZVBvaW50PDExMTQxMTIpe2lmKCh1bml0cy09NCk8MClicmVhaztieXRlcy5wdXNoKGNvZGVQb2ludD4+MTh8MjQwLGNvZGVQb2ludD4+MTImNjN8MTI4LGNvZGVQb2ludD4+NiY2M3wxMjgsY29kZVBvaW50JjYzfDEyOCl9ZWxzZXt0aHJvdyBuZXcgRXJyb3IoIkludmFsaWQgY29kZSBwb2ludCIpfX1yZXR1cm4gYnl0ZXN9ZnVuY3Rpb24gYXNjaWlUb0J5dGVzKHN0cil7dmFyIGJ5dGVBcnJheT1bXTtmb3IodmFyIGk9MDtpPHN0ci5sZW5ndGg7KytpKXtieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSYyNTUpfXJldHVybiBieXRlQXJyYXl9ZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMoc3RyLHVuaXRzKXt2YXIgYyxoaSxsbzt2YXIgYnl0ZUFycmF5PVtdO2Zvcih2YXIgaT0wO2k8c3RyLmxlbmd0aDsrK2kpe2lmKCh1bml0cy09Mik8MClicmVhaztjPXN0ci5jaGFyQ29kZUF0KGkpO2hpPWM+Pjg7bG89YyUyNTY7Ynl0ZUFycmF5LnB1c2gobG8pO2J5dGVBcnJheS5wdXNoKGhpKX1yZXR1cm4gYnl0ZUFycmF5fWZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMoc3RyKXtyZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpfWZ1bmN0aW9uIGJsaXRCdWZmZXIoc3JjLGRzdCxvZmZzZXQsbGVuZ3RoKXtmb3IodmFyIGk9MDtpPGxlbmd0aDsrK2kpe2lmKGkrb2Zmc2V0Pj1kc3QubGVuZ3RofHxpPj1zcmMubGVuZ3RoKWJyZWFrO2RzdFtpK29mZnNldF09c3JjW2ldfXJldHVybiBpfWZ1bmN0aW9uIGlzSW5zdGFuY2Uob2JqLHR5cGUpe3JldHVybiBvYmogaW5zdGFuY2VvZiB0eXBlfHxvYmohPW51bGwmJm9iai5jb25zdHJ1Y3RvciE9bnVsbCYmb2JqLmNvbnN0cnVjdG9yLm5hbWUhPW51bGwmJm9iai5jb25zdHJ1Y3Rvci5uYW1lPT09dHlwZS5uYW1lfWZ1bmN0aW9uIG51bWJlcklzTmFOKG9iail7cmV0dXJuIG9iaiE9PW9ian19KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyJiYXNlNjQtanMiOjI0LGJ1ZmZlcjoyNyxpZWVlNzU0OjM1fV0sMjg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIFRyYW5zZm9ybT1yZXF1aXJlKCJzdHJlYW0iKS5UcmFuc2Zvcm07dmFyIFN0cmluZ0RlY29kZXI9cmVxdWlyZSgic3RyaW5nX2RlY29kZXIiKS5TdHJpbmdEZWNvZGVyO3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO2Z1bmN0aW9uIENpcGhlckJhc2UoaGFzaE1vZGUpe1RyYW5zZm9ybS5jYWxsKHRoaXMpO3RoaXMuaGFzaE1vZGU9dHlwZW9mIGhhc2hNb2RlPT09InN0cmluZyI7aWYodGhpcy5oYXNoTW9kZSl7dGhpc1toYXNoTW9kZV09dGhpcy5fZmluYWxPckRpZ2VzdH1lbHNle3RoaXMuZmluYWw9dGhpcy5fZmluYWxPckRpZ2VzdH1pZih0aGlzLl9maW5hbCl7dGhpcy5fX2ZpbmFsPXRoaXMuX2ZpbmFsO3RoaXMuX2ZpbmFsPW51bGx9dGhpcy5fZGVjb2Rlcj1udWxsO3RoaXMuX2VuY29kaW5nPW51bGx9aW5oZXJpdHMoQ2lwaGVyQmFzZSxUcmFuc2Zvcm0pO0NpcGhlckJhc2UucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbihkYXRhLGlucHV0RW5jLG91dHB1dEVuYyl7aWYodHlwZW9mIGRhdGE9PT0ic3RyaW5nIil7ZGF0YT1CdWZmZXIuZnJvbShkYXRhLGlucHV0RW5jKX12YXIgb3V0RGF0YT10aGlzLl91cGRhdGUoZGF0YSk7aWYodGhpcy5oYXNoTW9kZSlyZXR1cm4gdGhpcztpZihvdXRwdXRFbmMpe291dERhdGE9dGhpcy5fdG9TdHJpbmcob3V0RGF0YSxvdXRwdXRFbmMpfXJldHVybiBvdXREYXRhfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5zZXRBdXRvUGFkZGluZz1mdW5jdGlvbigpe307Q2lwaGVyQmFzZS5wcm90b3R5cGUuZ2V0QXV0aFRhZz1mdW5jdGlvbigpe3Rocm93IG5ldyBFcnJvcigidHJ5aW5nIHRvIGdldCBhdXRoIHRhZyBpbiB1bnN1cHBvcnRlZCBzdGF0ZSIpfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5zZXRBdXRoVGFnPWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJ0cnlpbmcgdG8gc2V0IGF1dGggdGFnIGluIHVuc3VwcG9ydGVkIHN0YXRlIil9O0NpcGhlckJhc2UucHJvdG90eXBlLnNldEFBRD1mdW5jdGlvbigpe3Rocm93IG5ldyBFcnJvcigidHJ5aW5nIHRvIHNldCBhYWQgaW4gdW5zdXBwb3J0ZWQgc3RhdGUiKX07Q2lwaGVyQmFzZS5wcm90b3R5cGUuX3RyYW5zZm9ybT1mdW5jdGlvbihkYXRhLF8sbmV4dCl7dmFyIGVycjt0cnl7aWYodGhpcy5oYXNoTW9kZSl7dGhpcy5fdXBkYXRlKGRhdGEpfWVsc2V7dGhpcy5wdXNoKHRoaXMuX3VwZGF0ZShkYXRhKSl9fWNhdGNoKGUpe2Vycj1lfWZpbmFsbHl7bmV4dChlcnIpfX07Q2lwaGVyQmFzZS5wcm90b3R5cGUuX2ZsdXNoPWZ1bmN0aW9uKGRvbmUpe3ZhciBlcnI7dHJ5e3RoaXMucHVzaCh0aGlzLl9fZmluYWwoKSl9Y2F0Y2goZSl7ZXJyPWV9ZG9uZShlcnIpfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5fZmluYWxPckRpZ2VzdD1mdW5jdGlvbihvdXRwdXRFbmMpe3ZhciBvdXREYXRhPXRoaXMuX19maW5hbCgpfHxCdWZmZXIuYWxsb2MoMCk7aWYob3V0cHV0RW5jKXtvdXREYXRhPXRoaXMuX3RvU3RyaW5nKG91dERhdGEsb3V0cHV0RW5jLHRydWUpfXJldHVybiBvdXREYXRhfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5fdG9TdHJpbmc9ZnVuY3Rpb24odmFsdWUsZW5jLGZpbil7aWYoIXRoaXMuX2RlY29kZXIpe3RoaXMuX2RlY29kZXI9bmV3IFN0cmluZ0RlY29kZXIoZW5jKTt0aGlzLl9lbmNvZGluZz1lbmN9aWYodGhpcy5fZW5jb2RpbmchPT1lbmMpdGhyb3cgbmV3IEVycm9yKCJjYW4ndCBzd2l0Y2ggZW5jb2RpbmdzIik7dmFyIG91dD10aGlzLl9kZWNvZGVyLndyaXRlKHZhbHVlKTtpZihmaW4pe291dCs9dGhpcy5fZGVjb2Rlci5lbmQoKX1yZXR1cm4gb3V0fTttb2R1bGUuZXhwb3J0cz1DaXBoZXJCYXNlfSx7aW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4MixzdHJlYW06MTAxLHN0cmluZ19kZWNvZGVyOjEwMn1dLDI5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz17T19SRE9OTFk6MCxPX1dST05MWToxLE9fUkRXUjoyLFNfSUZNVDo2MTQ0MCxTX0lGUkVHOjMyNzY4LFNfSUZESVI6MTYzODQsU19JRkNIUjo4MTkyLFNfSUZCTEs6MjQ1NzYsU19JRklGTzo0MDk2LFNfSUZMTks6NDA5NjAsU19JRlNPQ0s6NDkxNTIsT19DUkVBVDo1MTIsT19FWENMOjIwNDgsT19OT0NUVFk6MTMxMDcyLE9fVFJVTkM6MTAyNCxPX0FQUEVORDo4LE9fRElSRUNUT1JZOjEwNDg1NzYsT19OT0ZPTExPVzoyNTYsT19TWU5DOjEyOCxPX1NZTUxJTks6MjA5NzE1MixPX05PTkJMT0NLOjQsU19JUldYVTo0NDgsU19JUlVTUjoyNTYsU19JV1VTUjoxMjgsU19JWFVTUjo2NCxTX0lSV1hHOjU2LFNfSVJHUlA6MzIsU19JV0dSUDoxNixTX0lYR1JQOjgsU19JUldYTzo3LFNfSVJPVEg6NCxTX0lXT1RIOjIsU19JWE9USDoxLEUyQklHOjcsRUFDQ0VTOjEzLEVBRERSSU5VU0U6NDgsRUFERFJOT1RBVkFJTDo0OSxFQUZOT1NVUFBPUlQ6NDcsRUFHQUlOOjM1LEVBTFJFQURZOjM3LEVCQURGOjksRUJBRE1TRzo5NCxFQlVTWToxNixFQ0FOQ0VMRUQ6ODksRUNISUxEOjEwLEVDT05OQUJPUlRFRDo1MyxFQ09OTlJFRlVTRUQ6NjEsRUNPTk5SRVNFVDo1NCxFREVBRExLOjExLEVERVNUQUREUlJFUTozOSxFRE9NOjMzLEVEUVVPVDo2OSxFRVhJU1Q6MTcsRUZBVUxUOjE0LEVGQklHOjI3LEVIT1NUVU5SRUFDSDo2NSxFSURSTTo5MCxFSUxTRVE6OTIsRUlOUFJPR1JFU1M6MzYsRUlOVFI6NCxFSU5WQUw6MjIsRUlPOjUsRUlTQ09OTjo1NixFSVNESVI6MjEsRUxPT1A6NjIsRU1GSUxFOjI0LEVNTElOSzozMSxFTVNHU0laRTo0MCxFTVVMVElIT1A6OTUsRU5BTUVUT09MT05HOjYzLEVORVRET1dOOjUwLEVORVRSRVNFVDo1MixFTkVUVU5SRUFDSDo1MSxFTkZJTEU6MjMsRU5PQlVGUzo1NSxFTk9EQVRBOjk2LEVOT0RFVjoxOSxFTk9FTlQ6MixFTk9FWEVDOjgsRU5PTENLOjc3LEVOT0xJTks6OTcsRU5PTUVNOjEyLEVOT01TRzo5MSxFTk9QUk9UT09QVDo0MixFTk9TUEM6MjgsRU5PU1I6OTgsRU5PU1RSOjk5LEVOT1NZUzo3OCxFTk9UQ09OTjo1NyxFTk9URElSOjIwLEVOT1RFTVBUWTo2NixFTk9UU09DSzozOCxFTk9UU1VQOjQ1LEVOT1RUWToyNSxFTlhJTzo2LEVPUE5PVFNVUFA6MTAyLEVPVkVSRkxPVzo4NCxFUEVSTToxLEVQSVBFOjMyLEVQUk9UTzoxMDAsRVBST1RPTk9TVVBQT1JUOjQzLEVQUk9UT1RZUEU6NDEsRVJBTkdFOjM0LEVST0ZTOjMwLEVTUElQRToyOSxFU1JDSDozLEVTVEFMRTo3MCxFVElNRToxMDEsRVRJTUVET1VUOjYwLEVUWFRCU1k6MjYsRVdPVUxEQkxPQ0s6MzUsRVhERVY6MTgsU0lHSFVQOjEsU0lHSU5UOjIsU0lHUVVJVDozLFNJR0lMTDo0LFNJR1RSQVA6NSxTSUdBQlJUOjYsU0lHSU9UOjYsU0lHQlVTOjEwLFNJR0ZQRTo4LFNJR0tJTEw6OSxTSUdVU1IxOjMwLFNJR1NFR1Y6MTEsU0lHVVNSMjozMSxTSUdQSVBFOjEzLFNJR0FMUk06MTQsU0lHVEVSTToxNSxTSUdDSExEOjIwLFNJR0NPTlQ6MTksU0lHU1RPUDoxNyxTSUdUU1RQOjE4LFNJR1RUSU46MjEsU0lHVFRPVToyMixTSUdVUkc6MTYsU0lHWENQVToyNCxTSUdYRlNaOjI1LFNJR1ZUQUxSTToyNixTSUdQUk9GOjI3LFNJR1dJTkNIOjI4LFNJR0lPOjIzLFNJR1NZUzoxMixTU0xfT1BfQUxMOjIxNDc0ODY3MTksU1NMX09QX0FMTE9XX1VOU0FGRV9MRUdBQ1lfUkVORUdPVElBVElPTjoyNjIxNDQsU1NMX09QX0NJUEhFUl9TRVJWRVJfUFJFRkVSRU5DRTo0MTk0MzA0LFNTTF9PUF9DSVNDT19BTllDT05ORUNUOjMyNzY4LFNTTF9PUF9DT09LSUVfRVhDSEFOR0U6ODE5MixTU0xfT1BfQ1JZUFRPUFJPX1RMU0VYVF9CVUc6MjE0NzQ4MzY0OCxTU0xfT1BfRE9OVF9JTlNFUlRfRU1QVFlfRlJBR01FTlRTOjIwNDgsU1NMX09QX0VQSEVNRVJBTF9SU0E6MCxTU0xfT1BfTEVHQUNZX1NFUlZFUl9DT05ORUNUOjQsU1NMX09QX01JQ1JPU09GVF9CSUdfU1NMVjNfQlVGRkVSOjMyLFNTTF9PUF9NSUNST1NPRlRfU0VTU19JRF9CVUc6MSxTU0xfT1BfTVNJRV9TU0xWMl9SU0FfUEFERElORzowLFNTTF9PUF9ORVRTQ0FQRV9DQV9ETl9CVUc6NTM2ODcwOTEyLFNTTF9PUF9ORVRTQ0FQRV9DSEFMTEVOR0VfQlVHOjIsU1NMX09QX05FVFNDQVBFX0RFTU9fQ0lQSEVSX0NIQU5HRV9CVUc6MTA3Mzc0MTgyNCxTU0xfT1BfTkVUU0NBUEVfUkVVU0VfQ0lQSEVSX0NIQU5HRV9CVUc6OCxTU0xfT1BfTk9fQ09NUFJFU1NJT046MTMxMDcyLFNTTF9PUF9OT19RVUVSWV9NVFU6NDA5NixTU0xfT1BfTk9fU0VTU0lPTl9SRVNVTVBUSU9OX09OX1JFTkVHT1RJQVRJT046NjU1MzYsU1NMX09QX05PX1NTTHYyOjE2Nzc3MjE2LFNTTF9PUF9OT19TU0x2MzozMzU1NDQzMixTU0xfT1BfTk9fVElDS0VUOjE2Mzg0LFNTTF9PUF9OT19UTFN2MTo2NzEwODg2NCxTU0xfT1BfTk9fVExTdjFfMToyNjg0MzU0NTYsU1NMX09QX05PX1RMU3YxXzI6MTM0MjE3NzI4LFNTTF9PUF9QS0NTMV9DSEVDS18xOjAsU1NMX09QX1BLQ1MxX0NIRUNLXzI6MCxTU0xfT1BfU0lOR0xFX0RIX1VTRToxMDQ4NTc2LFNTTF9PUF9TSU5HTEVfRUNESF9VU0U6NTI0Mjg4LFNTTF9PUF9TU0xFQVlfMDgwX0NMSUVOVF9ESF9CVUc6MTI4LFNTTF9PUF9TU0xSRUYyX1JFVVNFX0NFUlRfVFlQRV9CVUc6MCxTU0xfT1BfVExTX0JMT0NLX1BBRERJTkdfQlVHOjUxMixTU0xfT1BfVExTX0Q1X0JVRzoyNTYsU1NMX09QX1RMU19ST0xMQkFDS19CVUc6ODM4ODYwOCxFTkdJTkVfTUVUSE9EX0RTQToyLEVOR0lORV9NRVRIT0RfREg6NCxFTkdJTkVfTUVUSE9EX1JBTkQ6OCxFTkdJTkVfTUVUSE9EX0VDREg6MTYsRU5HSU5FX01FVEhPRF9FQ0RTQTozMixFTkdJTkVfTUVUSE9EX0NJUEhFUlM6NjQsRU5HSU5FX01FVEhPRF9ESUdFU1RTOjEyOCxFTkdJTkVfTUVUSE9EX1NUT1JFOjI1NixFTkdJTkVfTUVUSE9EX1BLRVlfTUVUSFM6NTEyLEVOR0lORV9NRVRIT0RfUEtFWV9BU04xX01FVEhTOjEwMjQsRU5HSU5FX01FVEhPRF9BTEw6NjU1MzUsRU5HSU5FX01FVEhPRF9OT05FOjAsREhfQ0hFQ0tfUF9OT1RfU0FGRV9QUklNRToyLERIX0NIRUNLX1BfTk9UX1BSSU1FOjEsREhfVU5BQkxFX1RPX0NIRUNLX0dFTkVSQVRPUjo0LERIX05PVF9TVUlUQUJMRV9HRU5FUkFUT1I6OCxOUE5fRU5BQkxFRDoxLFJTQV9QS0NTMV9QQURESU5HOjEsUlNBX1NTTFYyM19QQURESU5HOjIsUlNBX05PX1BBRERJTkc6MyxSU0FfUEtDUzFfT0FFUF9QQURESU5HOjQsUlNBX1g5MzFfUEFERElORzo1LFJTQV9QS0NTMV9QU1NfUEFERElORzo2LFBPSU5UX0NPTlZFUlNJT05fQ09NUFJFU1NFRDoyLFBPSU5UX0NPTlZFUlNJT05fVU5DT01QUkVTU0VEOjQsUE9JTlRfQ09OVkVSU0lPTl9IWUJSSUQ6NixGX09LOjAsUl9PSzo0LFdfT0s6MixYX09LOjEsVVZfVURQX1JFVVNFQUREUjo0fX0se31dLDMwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXtmdW5jdGlvbiBpc0FycmF5KGFyZyl7aWYoQXJyYXkuaXNBcnJheSl7cmV0dXJuIEFycmF5LmlzQXJyYXkoYXJnKX1yZXR1cm4gb2JqZWN0VG9TdHJpbmcoYXJnKT09PSJbb2JqZWN0IEFycmF5XSJ9ZXhwb3J0cy5pc0FycmF5PWlzQXJyYXk7ZnVuY3Rpb24gaXNCb29sZWFuKGFyZyl7cmV0dXJuIHR5cGVvZiBhcmc9PT0iYm9vbGVhbiJ9ZXhwb3J0cy5pc0Jvb2xlYW49aXNCb29sZWFuO2Z1bmN0aW9uIGlzTnVsbChhcmcpe3JldHVybiBhcmc9PT1udWxsfWV4cG9ydHMuaXNOdWxsPWlzTnVsbDtmdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpe3JldHVybiBhcmc9PW51bGx9ZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZD1pc051bGxPclVuZGVmaW5lZDtmdW5jdGlvbiBpc051bWJlcihhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09Im51bWJlciJ9ZXhwb3J0cy5pc051bWJlcj1pc051bWJlcjtmdW5jdGlvbiBpc1N0cmluZyhhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09InN0cmluZyJ9ZXhwb3J0cy5pc1N0cmluZz1pc1N0cmluZztmdW5jdGlvbiBpc1N5bWJvbChhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09InN5bWJvbCJ9ZXhwb3J0cy5pc1N5bWJvbD1pc1N5bWJvbDtmdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpe3JldHVybiBhcmc9PT12b2lkIDB9ZXhwb3J0cy5pc1VuZGVmaW5lZD1pc1VuZGVmaW5lZDtmdW5jdGlvbiBpc1JlZ0V4cChyZSl7cmV0dXJuIG9iamVjdFRvU3RyaW5nKHJlKT09PSJbb2JqZWN0IFJlZ0V4cF0ifWV4cG9ydHMuaXNSZWdFeHA9aXNSZWdFeHA7ZnVuY3Rpb24gaXNPYmplY3QoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJvYmplY3QiJiZhcmchPT1udWxsfWV4cG9ydHMuaXNPYmplY3Q9aXNPYmplY3Q7ZnVuY3Rpb24gaXNEYXRlKGQpe3JldHVybiBvYmplY3RUb1N0cmluZyhkKT09PSJbb2JqZWN0IERhdGVdIn1leHBvcnRzLmlzRGF0ZT1pc0RhdGU7ZnVuY3Rpb24gaXNFcnJvcihlKXtyZXR1cm4gb2JqZWN0VG9TdHJpbmcoZSk9PT0iW29iamVjdCBFcnJvcl0ifHxlIGluc3RhbmNlb2YgRXJyb3J9ZXhwb3J0cy5pc0Vycm9yPWlzRXJyb3I7ZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09ImZ1bmN0aW9uIn1leHBvcnRzLmlzRnVuY3Rpb249aXNGdW5jdGlvbjtmdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpe3JldHVybiBhcmc9PT1udWxsfHx0eXBlb2YgYXJnPT09ImJvb2xlYW4ifHx0eXBlb2YgYXJnPT09Im51bWJlciJ8fHR5cGVvZiBhcmc9PT0ic3RyaW5nInx8dHlwZW9mIGFyZz09PSJzeW1ib2wifHx0eXBlb2YgYXJnPT09InVuZGVmaW5lZCJ9ZXhwb3J0cy5pc1ByaW1pdGl2ZT1pc1ByaW1pdGl2ZTtleHBvcnRzLmlzQnVmZmVyPUJ1ZmZlci5pc0J1ZmZlcjtmdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pfX0pLmNhbGwodGhpcyx7aXNCdWZmZXI6cmVxdWlyZSgiLi4vLi4vaXMtYnVmZmVyL2luZGV4LmpzIil9KX0seyIuLi8uLi9pcy1idWZmZXIvaW5kZXguanMiOjM3fV0sMzE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgTUQ1PXJlcXVpcmUoIm1kNS5qcyIpO3ZhciBSSVBFTUQxNjA9cmVxdWlyZSgicmlwZW1kMTYwIik7dmFyIHNoYT1yZXF1aXJlKCJzaGEuanMiKTt2YXIgQmFzZT1yZXF1aXJlKCJjaXBoZXItYmFzZSIpO2Z1bmN0aW9uIEhhc2goaGFzaCl7QmFzZS5jYWxsKHRoaXMsImRpZ2VzdCIpO3RoaXMuX2hhc2g9aGFzaH1pbmhlcml0cyhIYXNoLEJhc2UpO0hhc2gucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oZGF0YSl7dGhpcy5faGFzaC51cGRhdGUoZGF0YSl9O0hhc2gucHJvdG90eXBlLl9maW5hbD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9oYXNoLmRpZ2VzdCgpfTttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBjcmVhdGVIYXNoKGFsZyl7YWxnPWFsZy50b0xvd2VyQ2FzZSgpO2lmKGFsZz09PSJtZDUiKXJldHVybiBuZXcgTUQ1O2lmKGFsZz09PSJybWQxNjAifHxhbGc9PT0icmlwZW1kMTYwIilyZXR1cm4gbmV3IFJJUEVNRDE2MDtyZXR1cm4gbmV3IEhhc2goc2hhKGFsZykpfX0seyJjaXBoZXItYmFzZSI6MjgsaW5oZXJpdHM6MzYsIm1kNS5qcyI6MzkscmlwZW1kMTYwOjgxLCJzaGEuanMiOjk0fV0sMzI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBNRDU9cmVxdWlyZSgibWQ1LmpzIik7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24oYnVmZmVyKXtyZXR1cm4obmV3IE1ENSkudXBkYXRlKGJ1ZmZlcikuZGlnZXN0KCl9fSx7Im1kNS5qcyI6Mzl9XSwzMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIG9iamVjdENyZWF0ZT1PYmplY3QuY3JlYXRlfHxvYmplY3RDcmVhdGVQb2x5ZmlsbDt2YXIgb2JqZWN0S2V5cz1PYmplY3Qua2V5c3x8b2JqZWN0S2V5c1BvbHlmaWxsO3ZhciBiaW5kPUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kfHxmdW5jdGlvbkJpbmRQb2x5ZmlsbDtmdW5jdGlvbiBFdmVudEVtaXR0ZXIoKXtpZighdGhpcy5fZXZlbnRzfHwhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsIl9ldmVudHMiKSl7dGhpcy5fZXZlbnRzPW9iamVjdENyZWF0ZShudWxsKTt0aGlzLl9ldmVudHNDb3VudD0wfXRoaXMuX21heExpc3RlbmVycz10aGlzLl9tYXhMaXN0ZW5lcnN8fHVuZGVmaW5lZH1tb2R1bGUuZXhwb3J0cz1FdmVudEVtaXR0ZXI7RXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcj1FdmVudEVtaXR0ZXI7RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzPXVuZGVmaW5lZDtFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnM9dW5kZWZpbmVkO3ZhciBkZWZhdWx0TWF4TGlzdGVuZXJzPTEwO3ZhciBoYXNEZWZpbmVQcm9wZXJ0eTt0cnl7dmFyIG89e307aWYoT2JqZWN0LmRlZmluZVByb3BlcnR5KU9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCJ4Iix7dmFsdWU6MH0pO2hhc0RlZmluZVByb3BlcnR5PW8ueD09PTB9Y2F0Y2goZXJyKXtoYXNEZWZpbmVQcm9wZXJ0eT1mYWxzZX1pZihoYXNEZWZpbmVQcm9wZXJ0eSl7T2JqZWN0LmRlZmluZVByb3BlcnR5KEV2ZW50RW1pdHRlciwiZGVmYXVsdE1heExpc3RlbmVycyIse2VudW1lcmFibGU6dHJ1ZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gZGVmYXVsdE1heExpc3RlbmVyc30sc2V0OmZ1bmN0aW9uKGFyZyl7aWYodHlwZW9mIGFyZyE9PSJudW1iZXIifHxhcmc8MHx8YXJnIT09YXJnKXRocm93IG5ldyBUeXBlRXJyb3IoJyJkZWZhdWx0TWF4TGlzdGVuZXJzIiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7ZGVmYXVsdE1heExpc3RlbmVycz1hcmd9fSl9ZWxzZXtFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycz1kZWZhdWx0TWF4TGlzdGVuZXJzfUV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uIHNldE1heExpc3RlbmVycyhuKXtpZih0eXBlb2YgbiE9PSJudW1iZXIifHxuPDB8fGlzTmFOKG4pKXRocm93IG5ldyBUeXBlRXJyb3IoJyJuIiBhcmd1bWVudCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7dGhpcy5fbWF4TGlzdGVuZXJzPW47cmV0dXJuIHRoaXN9O2Z1bmN0aW9uICRnZXRNYXhMaXN0ZW5lcnModGhhdCl7aWYodGhhdC5fbWF4TGlzdGVuZXJzPT09dW5kZWZpbmVkKXJldHVybiBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztyZXR1cm4gdGhhdC5fbWF4TGlzdGVuZXJzfUV2ZW50RW1pdHRlci5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uIGdldE1heExpc3RlbmVycygpe3JldHVybiAkZ2V0TWF4TGlzdGVuZXJzKHRoaXMpfTtmdW5jdGlvbiBlbWl0Tm9uZShoYW5kbGVyLGlzRm4sc2VsZil7aWYoaXNGbiloYW5kbGVyLmNhbGwoc2VsZik7ZWxzZXt2YXIgbGVuPWhhbmRsZXIubGVuZ3RoO3ZhciBsaXN0ZW5lcnM9YXJyYXlDbG9uZShoYW5kbGVyLGxlbik7Zm9yKHZhciBpPTA7aTxsZW47KytpKWxpc3RlbmVyc1tpXS5jYWxsKHNlbGYpfX1mdW5jdGlvbiBlbWl0T25lKGhhbmRsZXIsaXNGbixzZWxmLGFyZzEpe2lmKGlzRm4paGFuZGxlci5jYWxsKHNlbGYsYXJnMSk7ZWxzZXt2YXIgbGVuPWhhbmRsZXIubGVuZ3RoO3ZhciBsaXN0ZW5lcnM9YXJyYXlDbG9uZShoYW5kbGVyLGxlbik7Zm9yKHZhciBpPTA7aTxsZW47KytpKWxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsYXJnMSl9fWZ1bmN0aW9uIGVtaXRUd28oaGFuZGxlcixpc0ZuLHNlbGYsYXJnMSxhcmcyKXtpZihpc0ZuKWhhbmRsZXIuY2FsbChzZWxmLGFyZzEsYXJnMik7ZWxzZXt2YXIgbGVuPWhhbmRsZXIubGVuZ3RoO3ZhciBsaXN0ZW5lcnM9YXJyYXlDbG9uZShoYW5kbGVyLGxlbik7Zm9yKHZhciBpPTA7aTxsZW47KytpKWxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsYXJnMSxhcmcyKX19ZnVuY3Rpb24gZW1pdFRocmVlKGhhbmRsZXIsaXNGbixzZWxmLGFyZzEsYXJnMixhcmczKXtpZihpc0ZuKWhhbmRsZXIuY2FsbChzZWxmLGFyZzEsYXJnMixhcmczKTtlbHNle3ZhciBsZW49aGFuZGxlci5sZW5ndGg7dmFyIGxpc3RlbmVycz1hcnJheUNsb25lKGhhbmRsZXIsbGVuKTtmb3IodmFyIGk9MDtpPGxlbjsrK2kpbGlzdGVuZXJzW2ldLmNhbGwoc2VsZixhcmcxLGFyZzIsYXJnMyl9fWZ1bmN0aW9uIGVtaXRNYW55KGhhbmRsZXIsaXNGbixzZWxmLGFyZ3Mpe2lmKGlzRm4paGFuZGxlci5hcHBseShzZWxmLGFyZ3MpO2Vsc2V7dmFyIGxlbj1oYW5kbGVyLmxlbmd0aDt2YXIgbGlzdGVuZXJzPWFycmF5Q2xvbmUoaGFuZGxlcixsZW4pO2Zvcih2YXIgaT0wO2k8bGVuOysraSlsaXN0ZW5lcnNbaV0uYXBwbHkoc2VsZixhcmdzKX19RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0PWZ1bmN0aW9uIGVtaXQodHlwZSl7dmFyIGVyLGhhbmRsZXIsbGVuLGFyZ3MsaSxldmVudHM7dmFyIGRvRXJyb3I9dHlwZT09PSJlcnJvciI7ZXZlbnRzPXRoaXMuX2V2ZW50cztpZihldmVudHMpZG9FcnJvcj1kb0Vycm9yJiZldmVudHMuZXJyb3I9PW51bGw7ZWxzZSBpZighZG9FcnJvcilyZXR1cm4gZmFsc2U7aWYoZG9FcnJvcil7aWYoYXJndW1lbnRzLmxlbmd0aD4xKWVyPWFyZ3VtZW50c1sxXTtpZihlciBpbnN0YW5jZW9mIEVycm9yKXt0aHJvdyBlcn1lbHNle3ZhciBlcnI9bmV3IEVycm9yKCdVbmhhbmRsZWQgImVycm9yIiBldmVudC4gKCcrZXIrIikiKTtlcnIuY29udGV4dD1lcjt0aHJvdyBlcnJ9cmV0dXJuIGZhbHNlfWhhbmRsZXI9ZXZlbnRzW3R5cGVdO2lmKCFoYW5kbGVyKXJldHVybiBmYWxzZTt2YXIgaXNGbj10eXBlb2YgaGFuZGxlcj09PSJmdW5jdGlvbiI7bGVuPWFyZ3VtZW50cy5sZW5ndGg7c3dpdGNoKGxlbil7Y2FzZSAxOmVtaXROb25lKGhhbmRsZXIsaXNGbix0aGlzKTticmVhaztjYXNlIDI6ZW1pdE9uZShoYW5kbGVyLGlzRm4sdGhpcyxhcmd1bWVudHNbMV0pO2JyZWFrO2Nhc2UgMzplbWl0VHdvKGhhbmRsZXIsaXNGbix0aGlzLGFyZ3VtZW50c1sxXSxhcmd1bWVudHNbMl0pO2JyZWFrO2Nhc2UgNDplbWl0VGhyZWUoaGFuZGxlcixpc0ZuLHRoaXMsYXJndW1lbnRzWzFdLGFyZ3VtZW50c1syXSxhcmd1bWVudHNbM10pO2JyZWFrO2RlZmF1bHQ6YXJncz1uZXcgQXJyYXkobGVuLTEpO2ZvcihpPTE7aTxsZW47aSsrKWFyZ3NbaS0xXT1hcmd1bWVudHNbaV07ZW1pdE1hbnkoaGFuZGxlcixpc0ZuLHRoaXMsYXJncyl9cmV0dXJuIHRydWV9O2Z1bmN0aW9uIF9hZGRMaXN0ZW5lcih0YXJnZXQsdHlwZSxsaXN0ZW5lcixwcmVwZW5kKXt2YXIgbTt2YXIgZXZlbnRzO3ZhciBleGlzdGluZztpZih0eXBlb2YgbGlzdGVuZXIhPT0iZnVuY3Rpb24iKXRocm93IG5ldyBUeXBlRXJyb3IoJyJsaXN0ZW5lciIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7ZXZlbnRzPXRhcmdldC5fZXZlbnRzO2lmKCFldmVudHMpe2V2ZW50cz10YXJnZXQuX2V2ZW50cz1vYmplY3RDcmVhdGUobnVsbCk7dGFyZ2V0Ll9ldmVudHNDb3VudD0wfWVsc2V7aWYoZXZlbnRzLm5ld0xpc3RlbmVyKXt0YXJnZXQuZW1pdCgibmV3TGlzdGVuZXIiLHR5cGUsbGlzdGVuZXIubGlzdGVuZXI/bGlzdGVuZXIubGlzdGVuZXI6bGlzdGVuZXIpO2V2ZW50cz10YXJnZXQuX2V2ZW50c31leGlzdGluZz1ldmVudHNbdHlwZV19aWYoIWV4aXN0aW5nKXtleGlzdGluZz1ldmVudHNbdHlwZV09bGlzdGVuZXI7Kyt0YXJnZXQuX2V2ZW50c0NvdW50fWVsc2V7aWYodHlwZW9mIGV4aXN0aW5nPT09ImZ1bmN0aW9uIil7ZXhpc3Rpbmc9ZXZlbnRzW3R5cGVdPXByZXBlbmQ/W2xpc3RlbmVyLGV4aXN0aW5nXTpbZXhpc3RpbmcsbGlzdGVuZXJdfWVsc2V7aWYocHJlcGVuZCl7ZXhpc3RpbmcudW5zaGlmdChsaXN0ZW5lcil9ZWxzZXtleGlzdGluZy5wdXNoKGxpc3RlbmVyKX19aWYoIWV4aXN0aW5nLndhcm5lZCl7bT0kZ2V0TWF4TGlzdGVuZXJzKHRhcmdldCk7aWYobSYmbT4wJiZleGlzdGluZy5sZW5ndGg+bSl7ZXhpc3Rpbmcud2FybmVkPXRydWU7dmFyIHc9bmV3IEVycm9yKCJQb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5IGxlYWsgZGV0ZWN0ZWQuICIrZXhpc3RpbmcubGVuZ3RoKycgIicrU3RyaW5nKHR5cGUpKyciIGxpc3RlbmVycyAnKyJhZGRlZC4gVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gIisiaW5jcmVhc2UgbGltaXQuIik7dy5uYW1lPSJNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmciO3cuZW1pdHRlcj10YXJnZXQ7dy50eXBlPXR5cGU7dy5jb3VudD1leGlzdGluZy5sZW5ndGg7aWYodHlwZW9mIGNvbnNvbGU9PT0ib2JqZWN0IiYmY29uc29sZS53YXJuKXtjb25zb2xlLndhcm4oIiVzOiAlcyIsdy5uYW1lLHcubWVzc2FnZSl9fX19cmV0dXJuIHRhcmdldH1FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyPWZ1bmN0aW9uIGFkZExpc3RlbmVyKHR5cGUsbGlzdGVuZXIpe3JldHVybiBfYWRkTGlzdGVuZXIodGhpcyx0eXBlLGxpc3RlbmVyLGZhbHNlKX07RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbj1FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO0V2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyPWZ1bmN0aW9uIHByZXBlbmRMaXN0ZW5lcih0eXBlLGxpc3RlbmVyKXtyZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsdHlwZSxsaXN0ZW5lcix0cnVlKX07ZnVuY3Rpb24gb25jZVdyYXBwZXIoKXtpZighdGhpcy5maXJlZCl7dGhpcy50YXJnZXQucmVtb3ZlTGlzdGVuZXIodGhpcy50eXBlLHRoaXMud3JhcEZuKTt0aGlzLmZpcmVkPXRydWU7c3dpdGNoKGFyZ3VtZW50cy5sZW5ndGgpe2Nhc2UgMDpyZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0KTtjYXNlIDE6cmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCxhcmd1bWVudHNbMF0pO2Nhc2UgMjpyZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LGFyZ3VtZW50c1swXSxhcmd1bWVudHNbMV0pO2Nhc2UgMzpyZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LGFyZ3VtZW50c1swXSxhcmd1bWVudHNbMV0sYXJndW1lbnRzWzJdKTtkZWZhdWx0OnZhciBhcmdzPW5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtmb3IodmFyIGk9MDtpPGFyZ3MubGVuZ3RoOysraSlhcmdzW2ldPWFyZ3VtZW50c1tpXTt0aGlzLmxpc3RlbmVyLmFwcGx5KHRoaXMudGFyZ2V0LGFyZ3MpfX19ZnVuY3Rpb24gX29uY2VXcmFwKHRhcmdldCx0eXBlLGxpc3RlbmVyKXt2YXIgc3RhdGU9e2ZpcmVkOmZhbHNlLHdyYXBGbjp1bmRlZmluZWQsdGFyZ2V0OnRhcmdldCx0eXBlOnR5cGUsbGlzdGVuZXI6bGlzdGVuZXJ9O3ZhciB3cmFwcGVkPWJpbmQuY2FsbChvbmNlV3JhcHBlcixzdGF0ZSk7d3JhcHBlZC5saXN0ZW5lcj1saXN0ZW5lcjtzdGF0ZS53cmFwRm49d3JhcHBlZDtyZXR1cm4gd3JhcHBlZH1FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2U9ZnVuY3Rpb24gb25jZSh0eXBlLGxpc3RlbmVyKXtpZih0eXBlb2YgbGlzdGVuZXIhPT0iZnVuY3Rpb24iKXRocm93IG5ldyBUeXBlRXJyb3IoJyJsaXN0ZW5lciIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7dGhpcy5vbih0eXBlLF9vbmNlV3JhcCh0aGlzLHR5cGUsbGlzdGVuZXIpKTtyZXR1cm4gdGhpc307RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyPWZ1bmN0aW9uIHByZXBlbmRPbmNlTGlzdGVuZXIodHlwZSxsaXN0ZW5lcil7aWYodHlwZW9mIGxpc3RlbmVyIT09ImZ1bmN0aW9uIil0aHJvdyBuZXcgVHlwZUVycm9yKCcibGlzdGVuZXIiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO3RoaXMucHJlcGVuZExpc3RlbmVyKHR5cGUsX29uY2VXcmFwKHRoaXMsdHlwZSxsaXN0ZW5lcikpO3JldHVybiB0aGlzfTtFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyPWZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKHR5cGUsbGlzdGVuZXIpe3ZhciBsaXN0LGV2ZW50cyxwb3NpdGlvbixpLG9yaWdpbmFsTGlzdGVuZXI7aWYodHlwZW9mIGxpc3RlbmVyIT09ImZ1bmN0aW9uIil0aHJvdyBuZXcgVHlwZUVycm9yKCcibGlzdGVuZXIiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO2V2ZW50cz10aGlzLl9ldmVudHM7aWYoIWV2ZW50cylyZXR1cm4gdGhpcztsaXN0PWV2ZW50c1t0eXBlXTtpZighbGlzdClyZXR1cm4gdGhpcztpZihsaXN0PT09bGlzdGVuZXJ8fGxpc3QubGlzdGVuZXI9PT1saXN0ZW5lcil7aWYoLS10aGlzLl9ldmVudHNDb3VudD09PTApdGhpcy5fZXZlbnRzPW9iamVjdENyZWF0ZShudWxsKTtlbHNle2RlbGV0ZSBldmVudHNbdHlwZV07aWYoZXZlbnRzLnJlbW92ZUxpc3RlbmVyKXRoaXMuZW1pdCgicmVtb3ZlTGlzdGVuZXIiLHR5cGUsbGlzdC5saXN0ZW5lcnx8bGlzdGVuZXIpfX1lbHNlIGlmKHR5cGVvZiBsaXN0IT09ImZ1bmN0aW9uIil7cG9zaXRpb249LTE7Zm9yKGk9bGlzdC5sZW5ndGgtMTtpPj0wO2ktLSl7aWYobGlzdFtpXT09PWxpc3RlbmVyfHxsaXN0W2ldLmxpc3RlbmVyPT09bGlzdGVuZXIpe29yaWdpbmFsTGlzdGVuZXI9bGlzdFtpXS5saXN0ZW5lcjtwb3NpdGlvbj1pO2JyZWFrfX1pZihwb3NpdGlvbjwwKXJldHVybiB0aGlzO2lmKHBvc2l0aW9uPT09MClsaXN0LnNoaWZ0KCk7ZWxzZSBzcGxpY2VPbmUobGlzdCxwb3NpdGlvbik7aWYobGlzdC5sZW5ndGg9PT0xKWV2ZW50c1t0eXBlXT1saXN0WzBdO2lmKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcil0aGlzLmVtaXQoInJlbW92ZUxpc3RlbmVyIix0eXBlLG9yaWdpbmFsTGlzdGVuZXJ8fGxpc3RlbmVyKX1yZXR1cm4gdGhpc307RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnM9ZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKHR5cGUpe3ZhciBsaXN0ZW5lcnMsZXZlbnRzLGk7ZXZlbnRzPXRoaXMuX2V2ZW50cztpZighZXZlbnRzKXJldHVybiB0aGlzO2lmKCFldmVudHMucmVtb3ZlTGlzdGVuZXIpe2lmKGFyZ3VtZW50cy5sZW5ndGg9PT0wKXt0aGlzLl9ldmVudHM9b2JqZWN0Q3JlYXRlKG51bGwpO3RoaXMuX2V2ZW50c0NvdW50PTB9ZWxzZSBpZihldmVudHNbdHlwZV0pe2lmKC0tdGhpcy5fZXZlbnRzQ291bnQ9PT0wKXRoaXMuX2V2ZW50cz1vYmplY3RDcmVhdGUobnVsbCk7ZWxzZSBkZWxldGUgZXZlbnRzW3R5cGVdfXJldHVybiB0aGlzfWlmKGFyZ3VtZW50cy5sZW5ndGg9PT0wKXt2YXIga2V5cz1vYmplY3RLZXlzKGV2ZW50cyk7dmFyIGtleTtmb3IoaT0wO2k8a2V5cy5sZW5ndGg7KytpKXtrZXk9a2V5c1tpXTtpZihrZXk9PT0icmVtb3ZlTGlzdGVuZXIiKWNvbnRpbnVlO3RoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSl9dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoInJlbW92ZUxpc3RlbmVyIik7dGhpcy5fZXZlbnRzPW9iamVjdENyZWF0ZShudWxsKTt0aGlzLl9ldmVudHNDb3VudD0wO3JldHVybiB0aGlzfWxpc3RlbmVycz1ldmVudHNbdHlwZV07aWYodHlwZW9mIGxpc3RlbmVycz09PSJmdW5jdGlvbiIpe3RoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSxsaXN0ZW5lcnMpfWVsc2UgaWYobGlzdGVuZXJzKXtmb3IoaT1saXN0ZW5lcnMubGVuZ3RoLTE7aT49MDtpLS0pe3RoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSxsaXN0ZW5lcnNbaV0pfX1yZXR1cm4gdGhpc307ZnVuY3Rpb24gX2xpc3RlbmVycyh0YXJnZXQsdHlwZSx1bndyYXApe3ZhciBldmVudHM9dGFyZ2V0Ll9ldmVudHM7aWYoIWV2ZW50cylyZXR1cm5bXTt2YXIgZXZsaXN0ZW5lcj1ldmVudHNbdHlwZV07aWYoIWV2bGlzdGVuZXIpcmV0dXJuW107aWYodHlwZW9mIGV2bGlzdGVuZXI9PT0iZnVuY3Rpb24iKXJldHVybiB1bndyYXA/W2V2bGlzdGVuZXIubGlzdGVuZXJ8fGV2bGlzdGVuZXJdOltldmxpc3RlbmVyXTtyZXR1cm4gdW53cmFwP3Vud3JhcExpc3RlbmVycyhldmxpc3RlbmVyKTphcnJheUNsb25lKGV2bGlzdGVuZXIsZXZsaXN0ZW5lci5sZW5ndGgpfUV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzPWZ1bmN0aW9uIGxpc3RlbmVycyh0eXBlKXtyZXR1cm4gX2xpc3RlbmVycyh0aGlzLHR5cGUsdHJ1ZSl9O0V2ZW50RW1pdHRlci5wcm90b3R5cGUucmF3TGlzdGVuZXJzPWZ1bmN0aW9uIHJhd0xpc3RlbmVycyh0eXBlKXtyZXR1cm4gX2xpc3RlbmVycyh0aGlzLHR5cGUsZmFsc2UpfTtFdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudD1mdW5jdGlvbihlbWl0dGVyLHR5cGUpe2lmKHR5cGVvZiBlbWl0dGVyLmxpc3RlbmVyQ291bnQ9PT0iZnVuY3Rpb24iKXtyZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpfWVsc2V7cmV0dXJuIGxpc3RlbmVyQ291bnQuY2FsbChlbWl0dGVyLHR5cGUpfX07RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50PWxpc3RlbmVyQ291bnQ7ZnVuY3Rpb24gbGlzdGVuZXJDb3VudCh0eXBlKXt2YXIgZXZlbnRzPXRoaXMuX2V2ZW50cztpZihldmVudHMpe3ZhciBldmxpc3RlbmVyPWV2ZW50c1t0eXBlXTtpZih0eXBlb2YgZXZsaXN0ZW5lcj09PSJmdW5jdGlvbiIpe3JldHVybiAxfWVsc2UgaWYoZXZsaXN0ZW5lcil7cmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RofX1yZXR1cm4gMH1FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXM9ZnVuY3Rpb24gZXZlbnROYW1lcygpe3JldHVybiB0aGlzLl9ldmVudHNDb3VudD4wP1JlZmxlY3Qub3duS2V5cyh0aGlzLl9ldmVudHMpOltdfTtmdW5jdGlvbiBzcGxpY2VPbmUobGlzdCxpbmRleCl7Zm9yKHZhciBpPWluZGV4LGs9aSsxLG49bGlzdC5sZW5ndGg7azxuO2krPTEsays9MSlsaXN0W2ldPWxpc3Rba107bGlzdC5wb3AoKX1mdW5jdGlvbiBhcnJheUNsb25lKGFycixuKXt2YXIgY29weT1uZXcgQXJyYXkobik7Zm9yKHZhciBpPTA7aTxuOysraSljb3B5W2ldPWFycltpXTtyZXR1cm4gY29weX1mdW5jdGlvbiB1bndyYXBMaXN0ZW5lcnMoYXJyKXt2YXIgcmV0PW5ldyBBcnJheShhcnIubGVuZ3RoKTtmb3IodmFyIGk9MDtpPHJldC5sZW5ndGg7KytpKXtyZXRbaV09YXJyW2ldLmxpc3RlbmVyfHxhcnJbaV19cmV0dXJuIHJldH1mdW5jdGlvbiBvYmplY3RDcmVhdGVQb2x5ZmlsbChwcm90byl7dmFyIEY9ZnVuY3Rpb24oKXt9O0YucHJvdG90eXBlPXByb3RvO3JldHVybiBuZXcgRn1mdW5jdGlvbiBvYmplY3RLZXlzUG9seWZpbGwob2JqKXt2YXIga2V5cz1bXTtmb3IodmFyIGsgaW4gb2JqKWlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosaykpe2tleXMucHVzaChrKX1yZXR1cm4ga31mdW5jdGlvbiBmdW5jdGlvbkJpbmRQb2x5ZmlsbChjb250ZXh0KXt2YXIgZm49dGhpcztyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gZm4uYXBwbHkoY29udGV4dCxhcmd1bWVudHMpfX19LHt9XSwzNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIFRyYW5zZm9ybT1yZXF1aXJlKCJzdHJlYW0iKS5UcmFuc2Zvcm07dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7ZnVuY3Rpb24gdGhyb3dJZk5vdFN0cmluZ09yQnVmZmVyKHZhbCxwcmVmaXgpe2lmKCFCdWZmZXIuaXNCdWZmZXIodmFsKSYmdHlwZW9mIHZhbCE9PSJzdHJpbmciKXt0aHJvdyBuZXcgVHlwZUVycm9yKHByZWZpeCsiIG11c3QgYmUgYSBzdHJpbmcgb3IgYSBidWZmZXIiKX19ZnVuY3Rpb24gSGFzaEJhc2UoYmxvY2tTaXplKXtUcmFuc2Zvcm0uY2FsbCh0aGlzKTt0aGlzLl9ibG9jaz1CdWZmZXIuYWxsb2NVbnNhZmUoYmxvY2tTaXplKTt0aGlzLl9ibG9ja1NpemU9YmxvY2tTaXplO3RoaXMuX2Jsb2NrT2Zmc2V0PTA7dGhpcy5fbGVuZ3RoPVswLDAsMCwwXTt0aGlzLl9maW5hbGl6ZWQ9ZmFsc2V9aW5oZXJpdHMoSGFzaEJhc2UsVHJhbnNmb3JtKTtIYXNoQmFzZS5wcm90b3R5cGUuX3RyYW5zZm9ybT1mdW5jdGlvbihjaHVuayxlbmNvZGluZyxjYWxsYmFjayl7dmFyIGVycm9yPW51bGw7dHJ5e3RoaXMudXBkYXRlKGNodW5rLGVuY29kaW5nKX1jYXRjaChlcnIpe2Vycm9yPWVycn1jYWxsYmFjayhlcnJvcil9O0hhc2hCYXNlLnByb3RvdHlwZS5fZmx1c2g9ZnVuY3Rpb24oY2FsbGJhY2spe3ZhciBlcnJvcj1udWxsO3RyeXt0aGlzLnB1c2godGhpcy5kaWdlc3QoKSl9Y2F0Y2goZXJyKXtlcnJvcj1lcnJ9Y2FsbGJhY2soZXJyb3IpfTtIYXNoQmFzZS5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKGRhdGEsZW5jb2Rpbmcpe3Rocm93SWZOb3RTdHJpbmdPckJ1ZmZlcihkYXRhLCJEYXRhIik7aWYodGhpcy5fZmluYWxpemVkKXRocm93IG5ldyBFcnJvcigiRGlnZXN0IGFscmVhZHkgY2FsbGVkIik7aWYoIUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSlkYXRhPUJ1ZmZlci5mcm9tKGRhdGEsZW5jb2RpbmcpO3ZhciBibG9jaz10aGlzLl9ibG9jazt2YXIgb2Zmc2V0PTA7d2hpbGUodGhpcy5fYmxvY2tPZmZzZXQrZGF0YS5sZW5ndGgtb2Zmc2V0Pj10aGlzLl9ibG9ja1NpemUpe2Zvcih2YXIgaT10aGlzLl9ibG9ja09mZnNldDtpPHRoaXMuX2Jsb2NrU2l6ZTspYmxvY2tbaSsrXT1kYXRhW29mZnNldCsrXTt0aGlzLl91cGRhdGUoKTt0aGlzLl9ibG9ja09mZnNldD0wfXdoaWxlKG9mZnNldDxkYXRhLmxlbmd0aClibG9ja1t0aGlzLl9ibG9ja09mZnNldCsrXT1kYXRhW29mZnNldCsrXTtmb3IodmFyIGo9MCxjYXJyeT1kYXRhLmxlbmd0aCo4O2NhcnJ5PjA7KytqKXt0aGlzLl9sZW5ndGhbal0rPWNhcnJ5O2NhcnJ5PXRoaXMuX2xlbmd0aFtqXS80Mjk0OTY3Mjk2fDA7aWYoY2Fycnk+MCl0aGlzLl9sZW5ndGhbal0tPTQyOTQ5NjcyOTYqY2Fycnl9cmV0dXJuIHRoaXN9O0hhc2hCYXNlLnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJfdXBkYXRlIGlzIG5vdCBpbXBsZW1lbnRlZCIpfTtIYXNoQmFzZS5wcm90b3R5cGUuZGlnZXN0PWZ1bmN0aW9uKGVuY29kaW5nKXtpZih0aGlzLl9maW5hbGl6ZWQpdGhyb3cgbmV3IEVycm9yKCJEaWdlc3QgYWxyZWFkeSBjYWxsZWQiKTt0aGlzLl9maW5hbGl6ZWQ9dHJ1ZTt2YXIgZGlnZXN0PXRoaXMuX2RpZ2VzdCgpO2lmKGVuY29kaW5nIT09dW5kZWZpbmVkKWRpZ2VzdD1kaWdlc3QudG9TdHJpbmcoZW5jb2RpbmcpO3RoaXMuX2Jsb2NrLmZpbGwoMCk7dGhpcy5fYmxvY2tPZmZzZXQ9MDtmb3IodmFyIGk9MDtpPDQ7KytpKXRoaXMuX2xlbmd0aFtpXT0wO3JldHVybiBkaWdlc3R9O0hhc2hCYXNlLnByb3RvdHlwZS5fZGlnZXN0PWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJfZGlnZXN0IGlzIG5vdCBpbXBsZW1lbnRlZCIpfTttb2R1bGUuZXhwb3J0cz1IYXNoQmFzZX0se2luaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODIsc3RyZWFtOjEwMX1dLDM1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtleHBvcnRzLnJlYWQ9ZnVuY3Rpb24oYnVmZmVyLG9mZnNldCxpc0xFLG1MZW4sbkJ5dGVzKXt2YXIgZSxtO3ZhciBlTGVuPW5CeXRlcyo4LW1MZW4tMTt2YXIgZU1heD0oMTw8ZUxlbiktMTt2YXIgZUJpYXM9ZU1heD4+MTt2YXIgbkJpdHM9LTc7dmFyIGk9aXNMRT9uQnl0ZXMtMTowO3ZhciBkPWlzTEU/LTE6MTt2YXIgcz1idWZmZXJbb2Zmc2V0K2ldO2krPWQ7ZT1zJigxPDwtbkJpdHMpLTE7cz4+PS1uQml0cztuQml0cys9ZUxlbjtmb3IoO25CaXRzPjA7ZT1lKjI1NitidWZmZXJbb2Zmc2V0K2ldLGkrPWQsbkJpdHMtPTgpe31tPWUmKDE8PC1uQml0cyktMTtlPj49LW5CaXRzO25CaXRzKz1tTGVuO2Zvcig7bkJpdHM+MDttPW0qMjU2K2J1ZmZlcltvZmZzZXQraV0saSs9ZCxuQml0cy09OCl7fWlmKGU9PT0wKXtlPTEtZUJpYXN9ZWxzZSBpZihlPT09ZU1heCl7cmV0dXJuIG0/TmFOOihzPy0xOjEpKkluZmluaXR5fWVsc2V7bT1tK01hdGgucG93KDIsbUxlbik7ZT1lLWVCaWFzfXJldHVybihzPy0xOjEpKm0qTWF0aC5wb3coMixlLW1MZW4pfTtleHBvcnRzLndyaXRlPWZ1bmN0aW9uKGJ1ZmZlcix2YWx1ZSxvZmZzZXQsaXNMRSxtTGVuLG5CeXRlcyl7dmFyIGUsbSxjO3ZhciBlTGVuPW5CeXRlcyo4LW1MZW4tMTt2YXIgZU1heD0oMTw8ZUxlbiktMTt2YXIgZUJpYXM9ZU1heD4+MTt2YXIgcnQ9bUxlbj09PTIzP01hdGgucG93KDIsLTI0KS1NYXRoLnBvdygyLC03Nyk6MDt2YXIgaT1pc0xFPzA6bkJ5dGVzLTE7dmFyIGQ9aXNMRT8xOi0xO3ZhciBzPXZhbHVlPDB8fHZhbHVlPT09MCYmMS92YWx1ZTwwPzE6MDt2YWx1ZT1NYXRoLmFicyh2YWx1ZSk7aWYoaXNOYU4odmFsdWUpfHx2YWx1ZT09PUluZmluaXR5KXttPWlzTmFOKHZhbHVlKT8xOjA7ZT1lTWF4fWVsc2V7ZT1NYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKS9NYXRoLkxOMik7aWYodmFsdWUqKGM9TWF0aC5wb3coMiwtZSkpPDEpe2UtLTtjKj0yfWlmKGUrZUJpYXM+PTEpe3ZhbHVlKz1ydC9jfWVsc2V7dmFsdWUrPXJ0Kk1hdGgucG93KDIsMS1lQmlhcyl9aWYodmFsdWUqYz49Mil7ZSsrO2MvPTJ9aWYoZStlQmlhcz49ZU1heCl7bT0wO2U9ZU1heH1lbHNlIGlmKGUrZUJpYXM+PTEpe209KHZhbHVlKmMtMSkqTWF0aC5wb3coMixtTGVuKTtlPWUrZUJpYXN9ZWxzZXttPXZhbHVlKk1hdGgucG93KDIsZUJpYXMtMSkqTWF0aC5wb3coMixtTGVuKTtlPTB9fWZvcig7bUxlbj49ODtidWZmZXJbb2Zmc2V0K2ldPW0mMjU1LGkrPWQsbS89MjU2LG1MZW4tPTgpe31lPWU8PG1MZW58bTtlTGVuKz1tTGVuO2Zvcig7ZUxlbj4wO2J1ZmZlcltvZmZzZXQraV09ZSYyNTUsaSs9ZCxlLz0yNTYsZUxlbi09OCl7fWJ1ZmZlcltvZmZzZXQraS1kXXw9cyoxMjh9fSx7fV0sMzY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2lmKHR5cGVvZiBPYmplY3QuY3JlYXRlPT09ImZ1bmN0aW9uIil7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24gaW5oZXJpdHMoY3RvcixzdXBlckN0b3Ipe2lmKHN1cGVyQ3Rvcil7Y3Rvci5zdXBlcl89c3VwZXJDdG9yO2N0b3IucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSx7Y29uc3RydWN0b3I6e3ZhbHVlOmN0b3IsZW51bWVyYWJsZTpmYWxzZSx3cml0YWJsZTp0cnVlLGNvbmZpZ3VyYWJsZTp0cnVlfX0pfX19ZWxzZXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpbmhlcml0cyhjdG9yLHN1cGVyQ3Rvcil7aWYoc3VwZXJDdG9yKXtjdG9yLnN1cGVyXz1zdXBlckN0b3I7dmFyIFRlbXBDdG9yPWZ1bmN0aW9uKCl7fTtUZW1wQ3Rvci5wcm90b3R5cGU9c3VwZXJDdG9yLnByb3RvdHlwZTtjdG9yLnByb3RvdHlwZT1uZXcgVGVtcEN0b3I7Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3I9Y3Rvcn19fX0se31dLDM3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbihvYmope3JldHVybiBvYmohPW51bGwmJihpc0J1ZmZlcihvYmopfHxpc1Nsb3dCdWZmZXIob2JqKXx8ISFvYmouX2lzQnVmZmVyKX07ZnVuY3Rpb24gaXNCdWZmZXIob2JqKXtyZXR1cm4hIW9iai5jb25zdHJ1Y3RvciYmdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcj09PSJmdW5jdGlvbiImJm9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopfWZ1bmN0aW9uIGlzU2xvd0J1ZmZlcihvYmope3JldHVybiB0eXBlb2Ygb2JqLnJlYWRGbG9hdExFPT09ImZ1bmN0aW9uIiYmdHlwZW9mIG9iai5zbGljZT09PSJmdW5jdGlvbiImJmlzQnVmZmVyKG9iai5zbGljZSgwLDApKX19LHt9XSwzODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIHRvU3RyaW5nPXt9LnRvU3RyaW5nO21vZHVsZS5leHBvcnRzPUFycmF5LmlzQXJyYXl8fGZ1bmN0aW9uKGFycil7cmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKT09IltvYmplY3QgQXJyYXldIn19LHt9XSwzOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBIYXNoQmFzZT1yZXF1aXJlKCJoYXNoLWJhc2UiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBBUlJBWTE2PW5ldyBBcnJheSgxNik7ZnVuY3Rpb24gTUQ1KCl7SGFzaEJhc2UuY2FsbCh0aGlzLDY0KTt0aGlzLl9hPTE3MzI1ODQxOTM7dGhpcy5fYj00MDIzMjMzNDE3O3RoaXMuX2M9MjU2MjM4MzEwMjt0aGlzLl9kPTI3MTczMzg3OH1pbmhlcml0cyhNRDUsSGFzaEJhc2UpO01ENS5wcm90b3R5cGUuX3VwZGF0ZT1mdW5jdGlvbigpe3ZhciBNPUFSUkFZMTY7Zm9yKHZhciBpPTA7aTwxNjsrK2kpTVtpXT10aGlzLl9ibG9jay5yZWFkSW50MzJMRShpKjQpO3ZhciBhPXRoaXMuX2E7dmFyIGI9dGhpcy5fYjt2YXIgYz10aGlzLl9jO3ZhciBkPXRoaXMuX2Q7YT1mbkYoYSxiLGMsZCxNWzBdLDM2MTQwOTAzNjAsNyk7ZD1mbkYoZCxhLGIsYyxNWzFdLDM5MDU0MDI3MTAsMTIpO2M9Zm5GKGMsZCxhLGIsTVsyXSw2MDYxMDU4MTksMTcpO2I9Zm5GKGIsYyxkLGEsTVszXSwzMjUwNDQxOTY2LDIyKTthPWZuRihhLGIsYyxkLE1bNF0sNDExODU0ODM5OSw3KTtkPWZuRihkLGEsYixjLE1bNV0sMTIwMDA4MDQyNiwxMik7Yz1mbkYoYyxkLGEsYixNWzZdLDI4MjE3MzU5NTUsMTcpO2I9Zm5GKGIsYyxkLGEsTVs3XSw0MjQ5MjYxMzEzLDIyKTthPWZuRihhLGIsYyxkLE1bOF0sMTc3MDAzNTQxNiw3KTtkPWZuRihkLGEsYixjLE1bOV0sMjMzNjU1Mjg3OSwxMik7Yz1mbkYoYyxkLGEsYixNWzEwXSw0Mjk0OTI1MjMzLDE3KTtiPWZuRihiLGMsZCxhLE1bMTFdLDIzMDQ1NjMxMzQsMjIpO2E9Zm5GKGEsYixjLGQsTVsxMl0sMTgwNDYwMzY4Miw3KTtkPWZuRihkLGEsYixjLE1bMTNdLDQyNTQ2MjYxOTUsMTIpO2M9Zm5GKGMsZCxhLGIsTVsxNF0sMjc5Mjk2NTAwNiwxNyk7Yj1mbkYoYixjLGQsYSxNWzE1XSwxMjM2NTM1MzI5LDIyKTthPWZuRyhhLGIsYyxkLE1bMV0sNDEyOTE3MDc4Niw1KTtkPWZuRyhkLGEsYixjLE1bNl0sMzIyNTQ2NTY2NCw5KTtjPWZuRyhjLGQsYSxiLE1bMTFdLDY0MzcxNzcxMywxNCk7Yj1mbkcoYixjLGQsYSxNWzBdLDM5MjEwNjk5OTQsMjApO2E9Zm5HKGEsYixjLGQsTVs1XSwzNTkzNDA4NjA1LDUpO2Q9Zm5HKGQsYSxiLGMsTVsxMF0sMzgwMTYwODMsOSk7Yz1mbkcoYyxkLGEsYixNWzE1XSwzNjM0NDg4OTYxLDE0KTtiPWZuRyhiLGMsZCxhLE1bNF0sMzg4OTQyOTQ0OCwyMCk7YT1mbkcoYSxiLGMsZCxNWzldLDU2ODQ0NjQzOCw1KTtkPWZuRyhkLGEsYixjLE1bMTRdLDMyNzUxNjM2MDYsOSk7Yz1mbkcoYyxkLGEsYixNWzNdLDQxMDc2MDMzMzUsMTQpO2I9Zm5HKGIsYyxkLGEsTVs4XSwxMTYzNTMxNTAxLDIwKTthPWZuRyhhLGIsYyxkLE1bMTNdLDI4NTAyODU4MjksNSk7ZD1mbkcoZCxhLGIsYyxNWzJdLDQyNDM1NjM1MTIsOSk7Yz1mbkcoYyxkLGEsYixNWzddLDE3MzUzMjg0NzMsMTQpO2I9Zm5HKGIsYyxkLGEsTVsxMl0sMjM2ODM1OTU2MiwyMCk7YT1mbkgoYSxiLGMsZCxNWzVdLDQyOTQ1ODg3MzgsNCk7ZD1mbkgoZCxhLGIsYyxNWzhdLDIyNzIzOTI4MzMsMTEpO2M9Zm5IKGMsZCxhLGIsTVsxMV0sMTgzOTAzMDU2MiwxNik7Yj1mbkgoYixjLGQsYSxNWzE0XSw0MjU5NjU3NzQwLDIzKTthPWZuSChhLGIsYyxkLE1bMV0sMjc2Mzk3NTIzNiw0KTtkPWZuSChkLGEsYixjLE1bNF0sMTI3Mjg5MzM1MywxMSk7Yz1mbkgoYyxkLGEsYixNWzddLDQxMzk0Njk2NjQsMTYpO2I9Zm5IKGIsYyxkLGEsTVsxMF0sMzIwMDIzNjY1NiwyMyk7YT1mbkgoYSxiLGMsZCxNWzEzXSw2ODEyNzkxNzQsNCk7ZD1mbkgoZCxhLGIsYyxNWzBdLDM5MzY0MzAwNzQsMTEpO2M9Zm5IKGMsZCxhLGIsTVszXSwzNTcyNDQ1MzE3LDE2KTtiPWZuSChiLGMsZCxhLE1bNl0sNzYwMjkxODksMjMpO2E9Zm5IKGEsYixjLGQsTVs5XSwzNjU0NjAyODA5LDQpO2Q9Zm5IKGQsYSxiLGMsTVsxMl0sMzg3MzE1MTQ2MSwxMSk7Yz1mbkgoYyxkLGEsYixNWzE1XSw1MzA3NDI1MjAsMTYpO2I9Zm5IKGIsYyxkLGEsTVsyXSwzMjk5NjI4NjQ1LDIzKTthPWZuSShhLGIsYyxkLE1bMF0sNDA5NjMzNjQ1Miw2KTtkPWZuSShkLGEsYixjLE1bN10sMTEyNjg5MTQxNSwxMCk7Yz1mbkkoYyxkLGEsYixNWzE0XSwyODc4NjEyMzkxLDE1KTtiPWZuSShiLGMsZCxhLE1bNV0sNDIzNzUzMzI0MSwyMSk7YT1mbkkoYSxiLGMsZCxNWzEyXSwxNzAwNDg1NTcxLDYpO2Q9Zm5JKGQsYSxiLGMsTVszXSwyMzk5OTgwNjkwLDEwKTtjPWZuSShjLGQsYSxiLE1bMTBdLDQyOTM5MTU3NzMsMTUpO2I9Zm5JKGIsYyxkLGEsTVsxXSwyMjQwMDQ0NDk3LDIxKTthPWZuSShhLGIsYyxkLE1bOF0sMTg3MzMxMzM1OSw2KTtkPWZuSShkLGEsYixjLE1bMTVdLDQyNjQzNTU1NTIsMTApO2M9Zm5JKGMsZCxhLGIsTVs2XSwyNzM0NzY4OTE2LDE1KTtiPWZuSShiLGMsZCxhLE1bMTNdLDEzMDkxNTE2NDksMjEpO2E9Zm5JKGEsYixjLGQsTVs0XSw0MTQ5NDQ0MjI2LDYpO2Q9Zm5JKGQsYSxiLGMsTVsxMV0sMzE3NDc1NjkxNywxMCk7Yz1mbkkoYyxkLGEsYixNWzJdLDcxODc4NzI1OSwxNSk7Yj1mbkkoYixjLGQsYSxNWzldLDM5NTE0ODE3NDUsMjEpO3RoaXMuX2E9dGhpcy5fYSthfDA7dGhpcy5fYj10aGlzLl9iK2J8MDt0aGlzLl9jPXRoaXMuX2MrY3wwO3RoaXMuX2Q9dGhpcy5fZCtkfDB9O01ENS5wcm90b3R5cGUuX2RpZ2VzdD1mdW5jdGlvbigpe3RoaXMuX2Jsb2NrW3RoaXMuX2Jsb2NrT2Zmc2V0KytdPTEyODtpZih0aGlzLl9ibG9ja09mZnNldD41Nil7dGhpcy5fYmxvY2suZmlsbCgwLHRoaXMuX2Jsb2NrT2Zmc2V0LDY0KTt0aGlzLl91cGRhdGUoKTt0aGlzLl9ibG9ja09mZnNldD0wfXRoaXMuX2Jsb2NrLmZpbGwoMCx0aGlzLl9ibG9ja09mZnNldCw1Nik7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJMRSh0aGlzLl9sZW5ndGhbMF0sNTYpO3RoaXMuX2Jsb2NrLndyaXRlVUludDMyTEUodGhpcy5fbGVuZ3RoWzFdLDYwKTt0aGlzLl91cGRhdGUoKTt2YXIgYnVmZmVyPUJ1ZmZlci5hbGxvY1Vuc2FmZSgxNik7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9hLDApO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fYiw0KTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2MsOCk7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9kLDEyKTtyZXR1cm4gYnVmZmVyfTtmdW5jdGlvbiByb3RsKHgsbil7cmV0dXJuIHg8PG58eD4+PjMyLW59ZnVuY3Rpb24gZm5GKGEsYixjLGQsbSxrLHMpe3JldHVybiByb3RsKGErKGImY3x+YiZkKSttK2t8MCxzKStifDB9ZnVuY3Rpb24gZm5HKGEsYixjLGQsbSxrLHMpe3JldHVybiByb3RsKGErKGImZHxjJn5kKSttK2t8MCxzKStifDB9ZnVuY3Rpb24gZm5IKGEsYixjLGQsbSxrLHMpe3JldHVybiByb3RsKGErKGJeY15kKSttK2t8MCxzKStifDB9ZnVuY3Rpb24gZm5JKGEsYixjLGQsbSxrLHMpe3JldHVybiByb3RsKGErKGNeKGJ8fmQpKSttK2t8MCxzKStifDB9bW9kdWxlLmV4cG9ydHM9TUQ1fSx7Imhhc2gtYmFzZSI6MzQsaW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4Mn1dLDQwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtpZighQXJyYXlCdWZmZXJbImlzVmlldyJdKXtBcnJheUJ1ZmZlci5pc1ZpZXc9ZnVuY3Rpb24gaXNWaWV3KGEpe3JldHVybiBhIT09bnVsbCYmdHlwZW9mIGE9PT0ib2JqZWN0IiYmYVsiYnVmZmVyIl1pbnN0YW5jZW9mIEFycmF5QnVmZmVyfX19LHt9XSw0MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO2V4cG9ydHMuX19lc01vZHVsZT10cnVlO3ZhciBMaWdodE1hcEltcGw9ZnVuY3Rpb24oKXtmdW5jdGlvbiBMaWdodE1hcEltcGwoKXt0aGlzLnJlY29yZD1bXX1MaWdodE1hcEltcGwucHJvdG90eXBlLmhhcz1mdW5jdGlvbihrZXkpe3JldHVybiB0aGlzLnJlY29yZC5tYXAoZnVuY3Rpb24oX2Epe3ZhciBfa2V5PV9hWzBdO3JldHVybiBfa2V5fSkuaW5kZXhPZihrZXkpPj0wfTtMaWdodE1hcEltcGwucHJvdG90eXBlLmdldD1mdW5jdGlvbihrZXkpe3ZhciBlbnRyeT10aGlzLnJlY29yZC5maWx0ZXIoZnVuY3Rpb24oX2Epe3ZhciBfa2V5PV9hWzBdO3JldHVybiBfa2V5PT09a2V5fSlbMF07aWYoZW50cnk9PT11bmRlZmluZWQpe3JldHVybiB1bmRlZmluZWR9cmV0dXJuIGVudHJ5WzFdfTtMaWdodE1hcEltcGwucHJvdG90eXBlLnNldD1mdW5jdGlvbihrZXksdmFsdWUpe3ZhciBlbnRyeT10aGlzLnJlY29yZC5maWx0ZXIoZnVuY3Rpb24oX2Epe3ZhciBfa2V5PV9hWzBdO3JldHVybiBfa2V5PT09a2V5fSlbMF07aWYoZW50cnk9PT11bmRlZmluZWQpe3RoaXMucmVjb3JkLnB1c2goW2tleSx2YWx1ZV0pfWVsc2V7ZW50cnlbMV09dmFsdWV9cmV0dXJuIHRoaXN9O0xpZ2h0TWFwSW1wbC5wcm90b3R5cGVbImRlbGV0ZSJdPWZ1bmN0aW9uKGtleSl7dmFyIGluZGV4PXRoaXMucmVjb3JkLm1hcChmdW5jdGlvbihfYSl7dmFyIGtleT1fYVswXTtyZXR1cm4ga2V5fSkuaW5kZXhPZihrZXkpO2lmKGluZGV4PDApe3JldHVybiBmYWxzZX10aGlzLnJlY29yZC5zcGxpY2UoaW5kZXgsMSk7cmV0dXJuIHRydWV9O0xpZ2h0TWFwSW1wbC5wcm90b3R5cGUua2V5cz1mdW5jdGlvbigpe3JldHVybiB0aGlzLnJlY29yZC5tYXAoZnVuY3Rpb24oX2Epe3ZhciBrZXk9X2FbMF07cmV0dXJuIGtleX0pfTtyZXR1cm4gTGlnaHRNYXBJbXBsfSgpO2V4cG9ydHMuTGlnaHRNYXBJbXBsPUxpZ2h0TWFwSW1wbDtleHBvcnRzLlBvbHlmaWxsPXR5cGVvZiBNYXAhPT0idW5kZWZpbmVkIj9NYXA6TGlnaHRNYXBJbXBsfSx7fV0sNDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBjb25zdGFudHM9cmVxdWlyZSgiY29uc3RhbnRzIik7dmFyIHJzYT1yZXF1aXJlKCIuL2xpYnMvcnNhLmpzIik7dmFyIF89cmVxdWlyZSgiLi91dGlscyIpLl87dmFyIHV0aWxzPXJlcXVpcmUoIi4vdXRpbHMiKTt2YXIgc2NoZW1lcz1yZXF1aXJlKCIuL3NjaGVtZXMvc2NoZW1lcy5qcyIpO3ZhciBmb3JtYXRzPXJlcXVpcmUoIi4vZm9ybWF0cy9mb3JtYXRzLmpzIik7dmFyIHNlZWRyYW5kb209cmVxdWlyZSgic2VlZHJhbmRvbSIpO2lmKHR5cGVvZiBjb25zdGFudHMuUlNBX05PX1BBRERJTkc9PT0idW5kZWZpbmVkIil7Y29uc3RhbnRzLlJTQV9OT19QQURESU5HPTN9bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24oKXt2YXIgU1VQUE9SVEVEX0hBU0hfQUxHT1JJVEhNUz17bm9kZTEwOlsibWQ0IiwibWQ1IiwicmlwZW1kMTYwIiwic2hhMSIsInNoYTIyNCIsInNoYTI1NiIsInNoYTM4NCIsInNoYTUxMiJdLG5vZGU6WyJtZDQiLCJtZDUiLCJyaXBlbWQxNjAiLCJzaGExIiwic2hhMjI0Iiwic2hhMjU2Iiwic2hhMzg0Iiwic2hhNTEyIl0saW9qczpbIm1kNCIsIm1kNSIsInJpcGVtZDE2MCIsInNoYTEiLCJzaGEyMjQiLCJzaGEyNTYiLCJzaGEzODQiLCJzaGE1MTIiXSxicm93c2VyOlsibWQ1IiwicmlwZW1kMTYwIiwic2hhMSIsInNoYTI1NiIsInNoYTUxMiJdfTt2YXIgREVGQVVMVF9FTkNSWVBUSU9OX1NDSEVNRT0icGtjczFfb2FlcCI7dmFyIERFRkFVTFRfU0lHTklOR19TQ0hFTUU9InBrY3MxIjt2YXIgREVGQVVMVF9FWFBPUlRfRk9STUFUPSJwcml2YXRlIjt2YXIgRVhQT1JUX0ZPUk1BVF9BTElBU0VTPXtwcml2YXRlOiJwa2NzMS1wcml2YXRlLXBlbSIsInByaXZhdGUtZGVyIjoicGtjczEtcHJpdmF0ZS1kZXIiLHB1YmxpYzoicGtjczgtcHVibGljLXBlbSIsInB1YmxpYy1kZXIiOiJwa2NzOC1wdWJsaWMtZGVyIn07ZnVuY3Rpb24gTm9kZVJTQShrZXksZm9ybWF0LG9wdGlvbnMpe2lmKCEodGhpcyBpbnN0YW5jZW9mIE5vZGVSU0EpKXtyZXR1cm4gbmV3IE5vZGVSU0Eoa2V5LGZvcm1hdCxvcHRpb25zKX1pZihfLmlzT2JqZWN0KGZvcm1hdCkpe29wdGlvbnM9Zm9ybWF0O2Zvcm1hdD11bmRlZmluZWR9dGhpcy4kb3B0aW9ucz17c2lnbmluZ1NjaGVtZTpERUZBVUxUX1NJR05JTkdfU0NIRU1FLHNpZ25pbmdTY2hlbWVPcHRpb25zOntoYXNoOiJzaGEyNTYiLHNhbHRMZW5ndGg6bnVsbH0sZW5jcnlwdGlvblNjaGVtZTpERUZBVUxUX0VOQ1JZUFRJT05fU0NIRU1FLGVuY3J5cHRpb25TY2hlbWVPcHRpb25zOntoYXNoOiJzaGExIixsYWJlbDpudWxsfSxlbnZpcm9ubWVudDp1dGlscy5kZXRlY3RFbnZpcm9ubWVudCgpLHJzYVV0aWxzOnRoaXN9O3RoaXMua2V5UGFpcj1uZXcgcnNhLktleTt0aGlzLiRjYWNoZT17fTtpZihCdWZmZXIuaXNCdWZmZXIoa2V5KXx8Xy5pc1N0cmluZyhrZXkpKXt0aGlzLmltcG9ydEtleShrZXksZm9ybWF0KX1lbHNlIGlmKF8uaXNPYmplY3Qoa2V5KSl7dGhpcy5nZW5lcmF0ZUtleVBhaXIoa2V5LmIsa2V5LmUpfXRoaXMuc2V0T3B0aW9ucyhvcHRpb25zKX1Ob2RlUlNBLmdlbmVyYXRlS2V5UGFpckZyb21TZWVkPWZ1bmN0aW9uIGdlbmVyYXRlS2V5UGFpckZyb21TZWVkKHNlZWQsYml0cyxleHAsZW52aXJvbm1lbnQpe3ZhciByYW5kb21CYWNrdXA9TWF0aC5yYW5kb207aWYoc2VlZCE9PW51bGwpe01hdGgucmFuZG9tPWZ1bmN0aW9uKCl7dmFyIHByZXY9dW5kZWZpbmVkO2Z1bmN0aW9uIHJhbmRvbSgpe3ByZXY9c2VlZHJhbmRvbShwcmV2PT09dW5kZWZpbmVkP0J1ZmZlci5mcm9tKHNlZWQuYnVmZmVyLHNlZWQuYnl0ZU9mZnNldCxzZWVkLmxlbmd0aCkudG9TdHJpbmcoImhleCIpOnByZXYudG9GaXhlZCgxMikse2dsb2JhbDpmYWxzZX0pLnF1aWNrKCk7cmV0dXJuIHByZXZ9cmFuZG9tLmlzU2VlZGVkPXRydWU7cmV0dXJuIHJhbmRvbX0oKX12YXIgb3B0aW9ucz11bmRlZmluZWQ7aWYoZW52aXJvbm1lbnQhPT11bmRlZmluZWQpe29wdGlvbnM9e2Vudmlyb25tZW50OmVudmlyb25tZW50fX12YXIgbm9kZVJTQT1uZXcgTm9kZVJTQSh1bmRlZmluZWQsdW5kZWZpbmVkLG9wdGlvbnMpO25vZGVSU0EuZ2VuZXJhdGVLZXlQYWlyKGJpdHMsZXhwKTtNYXRoLnJhbmRvbT1yYW5kb21CYWNrdXA7cmV0dXJuIG5vZGVSU0F9O05vZGVSU0EucHJvdG90eXBlLnNldE9wdGlvbnM9ZnVuY3Rpb24ob3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTtpZihvcHRpb25zLmVudmlyb25tZW50KXt0aGlzLiRvcHRpb25zLmVudmlyb25tZW50PW9wdGlvbnMuZW52aXJvbm1lbnR9aWYob3B0aW9ucy5zaWduaW5nU2NoZW1lKXtpZihfLmlzU3RyaW5nKG9wdGlvbnMuc2lnbmluZ1NjaGVtZSkpe3ZhciBzaWduaW5nU2NoZW1lPW9wdGlvbnMuc2lnbmluZ1NjaGVtZS50b0xvd2VyQ2FzZSgpLnNwbGl0KCItIik7aWYoc2lnbmluZ1NjaGVtZS5sZW5ndGg9PTEpe2lmKFNVUFBPUlRFRF9IQVNIX0FMR09SSVRITVMubm9kZS5pbmRleE9mKHNpZ25pbmdTY2hlbWVbMF0pPi0xKXt0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zPXtoYXNoOnNpZ25pbmdTY2hlbWVbMF19O3RoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZT1ERUZBVUxUX1NJR05JTkdfU0NIRU1FfWVsc2V7dGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lPXNpZ25pbmdTY2hlbWVbMF07dGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucz17aGFzaDpudWxsfX19ZWxzZXt0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zPXtoYXNoOnNpZ25pbmdTY2hlbWVbMV19O3RoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZT1zaWduaW5nU2NoZW1lWzBdfX1lbHNlIGlmKF8uaXNPYmplY3Qob3B0aW9ucy5zaWduaW5nU2NoZW1lKSl7dGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lPW9wdGlvbnMuc2lnbmluZ1NjaGVtZS5zY2hlbWV8fERFRkFVTFRfU0lHTklOR19TQ0hFTUU7dGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucz1fLm9taXQob3B0aW9ucy5zaWduaW5nU2NoZW1lLCJzY2hlbWUiKX1pZighc2NoZW1lcy5pc1NpZ25hdHVyZSh0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWUpKXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQgc2lnbmluZyBzY2hlbWUiKX1pZih0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLmhhc2gmJlNVUFBPUlRFRF9IQVNIX0FMR09SSVRITVNbdGhpcy4kb3B0aW9ucy5lbnZpcm9ubWVudF0uaW5kZXhPZih0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLmhhc2gpPT09LTEpe3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBoYXNoaW5nIGFsZ29yaXRobSBmb3IgIit0aGlzLiRvcHRpb25zLmVudmlyb25tZW50KyIgZW52aXJvbm1lbnQiKX19aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lKXtpZihfLmlzU3RyaW5nKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZSkpe3RoaXMuJG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZT1vcHRpb25zLmVuY3J5cHRpb25TY2hlbWUudG9Mb3dlckNhc2UoKTt0aGlzLiRvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zPXt9fWVsc2UgaWYoXy5pc09iamVjdChvcHRpb25zLmVuY3J5cHRpb25TY2hlbWUpKXt0aGlzLiRvcHRpb25zLmVuY3J5cHRpb25TY2hlbWU9b3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lLnNjaGVtZXx8REVGQVVMVF9FTkNSWVBUSU9OX1NDSEVNRTt0aGlzLiRvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zPV8ub21pdChvcHRpb25zLmVuY3J5cHRpb25TY2hlbWUsInNjaGVtZSIpfWlmKCFzY2hlbWVzLmlzRW5jcnlwdGlvbih0aGlzLiRvcHRpb25zLmVuY3J5cHRpb25TY2hlbWUpKXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQgZW5jcnlwdGlvbiBzY2hlbWUiKX1pZih0aGlzLiRvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLmhhc2gmJlNVUFBPUlRFRF9IQVNIX0FMR09SSVRITVNbdGhpcy4kb3B0aW9ucy5lbnZpcm9ubWVudF0uaW5kZXhPZih0aGlzLiRvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLmhhc2gpPT09LTEpe3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBoYXNoaW5nIGFsZ29yaXRobSBmb3IgIit0aGlzLiRvcHRpb25zLmVudmlyb25tZW50KyIgZW52aXJvbm1lbnQiKX19dGhpcy5rZXlQYWlyLnNldE9wdGlvbnModGhpcy4kb3B0aW9ucyl9O05vZGVSU0EucHJvdG90eXBlLmdlbmVyYXRlS2V5UGFpcj1mdW5jdGlvbihiaXRzLGV4cCl7Yml0cz1iaXRzfHwyMDQ4O2V4cD1leHB8fDY1NTM3O2lmKGJpdHMlOCE9PTApe3Rocm93IEVycm9yKCJLZXkgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgOC4iKX10aGlzLmtleVBhaXIuZ2VuZXJhdGUoYml0cyxleHAudG9TdHJpbmcoMTYpKTt0aGlzLiRjYWNoZT17fTtyZXR1cm4gdGhpc307Tm9kZVJTQS5wcm90b3R5cGUuaW1wb3J0S2V5PWZ1bmN0aW9uKGtleURhdGEsZm9ybWF0KXtpZigha2V5RGF0YSl7dGhyb3cgRXJyb3IoIkVtcHR5IGtleSBnaXZlbiIpfWlmKGZvcm1hdCl7Zm9ybWF0PUVYUE9SVF9GT1JNQVRfQUxJQVNFU1tmb3JtYXRdfHxmb3JtYXR9aWYoIWZvcm1hdHMuZGV0ZWN0QW5kSW1wb3J0KHRoaXMua2V5UGFpcixrZXlEYXRhLGZvcm1hdCkmJmZvcm1hdD09PXVuZGVmaW5lZCl7dGhyb3cgRXJyb3IoIktleSBmb3JtYXQgbXVzdCBiZSBzcGVjaWZpZWQiKX10aGlzLiRjYWNoZT17fTtyZXR1cm4gdGhpc307Tm9kZVJTQS5wcm90b3R5cGUuZXhwb3J0S2V5PWZ1bmN0aW9uKGZvcm1hdCl7Zm9ybWF0PWZvcm1hdHx8REVGQVVMVF9FWFBPUlRfRk9STUFUO2Zvcm1hdD1FWFBPUlRfRk9STUFUX0FMSUFTRVNbZm9ybWF0XXx8Zm9ybWF0O2lmKCF0aGlzLiRjYWNoZVtmb3JtYXRdKXt0aGlzLiRjYWNoZVtmb3JtYXRdPWZvcm1hdHMuZGV0ZWN0QW5kRXhwb3J0KHRoaXMua2V5UGFpcixmb3JtYXQpfXJldHVybiB0aGlzLiRjYWNoZVtmb3JtYXRdfTtOb2RlUlNBLnByb3RvdHlwZS5pc1ByaXZhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5rZXlQYWlyLmlzUHJpdmF0ZSgpfTtOb2RlUlNBLnByb3RvdHlwZS5pc1B1YmxpYz1mdW5jdGlvbihzdHJpY3Qpe3JldHVybiB0aGlzLmtleVBhaXIuaXNQdWJsaWMoc3RyaWN0KX07Tm9kZVJTQS5wcm90b3R5cGUuaXNFbXB0eT1mdW5jdGlvbihzdHJpY3Qpe3JldHVybiEodGhpcy5rZXlQYWlyLm58fHRoaXMua2V5UGFpci5lfHx0aGlzLmtleVBhaXIuZCl9O05vZGVSU0EucHJvdG90eXBlLmVuY3J5cHQ9ZnVuY3Rpb24oYnVmZmVyLGVuY29kaW5nLHNvdXJjZV9lbmNvZGluZyl7cmV0dXJuIHRoaXMuJCRlbmNyeXB0S2V5KGZhbHNlLGJ1ZmZlcixlbmNvZGluZyxzb3VyY2VfZW5jb2RpbmcpfTtOb2RlUlNBLnByb3RvdHlwZS5kZWNyeXB0PWZ1bmN0aW9uKGJ1ZmZlcixlbmNvZGluZyl7cmV0dXJuIHRoaXMuJCRkZWNyeXB0S2V5KGZhbHNlLGJ1ZmZlcixlbmNvZGluZyl9O05vZGVSU0EucHJvdG90eXBlLmVuY3J5cHRQcml2YXRlPWZ1bmN0aW9uKGJ1ZmZlcixlbmNvZGluZyxzb3VyY2VfZW5jb2Rpbmcpe3JldHVybiB0aGlzLiQkZW5jcnlwdEtleSh0cnVlLGJ1ZmZlcixlbmNvZGluZyxzb3VyY2VfZW5jb2RpbmcpfTtOb2RlUlNBLnByb3RvdHlwZS5kZWNyeXB0UHVibGljPWZ1bmN0aW9uKGJ1ZmZlcixlbmNvZGluZyl7cmV0dXJuIHRoaXMuJCRkZWNyeXB0S2V5KHRydWUsYnVmZmVyLGVuY29kaW5nKX07Tm9kZVJTQS5wcm90b3R5cGUuJCRlbmNyeXB0S2V5PWZ1bmN0aW9uKHVzZVByaXZhdGUsYnVmZmVyLGVuY29kaW5nLHNvdXJjZV9lbmNvZGluZyl7dHJ5e3ZhciByZXM9dGhpcy5rZXlQYWlyLmVuY3J5cHQodGhpcy4kZ2V0RGF0YUZvckVuY3J5cHQoYnVmZmVyLHNvdXJjZV9lbmNvZGluZyksdXNlUHJpdmF0ZSk7aWYoZW5jb2Rpbmc9PSJidWZmZXIifHwhZW5jb2Rpbmcpe3JldHVybiByZXN9ZWxzZXtyZXR1cm4gcmVzLnRvU3RyaW5nKGVuY29kaW5nKX19Y2F0Y2goZSl7dGhyb3cgRXJyb3IoIkVycm9yIGR1cmluZyBlbmNyeXB0aW9uLiBPcmlnaW5hbCBlcnJvcjogIitlLnN0YWNrKX19O05vZGVSU0EucHJvdG90eXBlLiQkZGVjcnlwdEtleT1mdW5jdGlvbih1c2VQdWJsaWMsYnVmZmVyLGVuY29kaW5nKXt0cnl7YnVmZmVyPV8uaXNTdHJpbmcoYnVmZmVyKT9CdWZmZXIuZnJvbShidWZmZXIsImJhc2U2NCIpOmJ1ZmZlcjt2YXIgcmVzPXRoaXMua2V5UGFpci5kZWNyeXB0KGJ1ZmZlcix1c2VQdWJsaWMpO2lmKHJlcz09PW51bGwpe3Rocm93IEVycm9yKCJLZXkgZGVjcnlwdCBtZXRob2QgcmV0dXJucyBudWxsLiIpfXJldHVybiB0aGlzLiRnZXREZWNyeXB0ZWREYXRhKHJlcyxlbmNvZGluZyl9Y2F0Y2goZSl7dGhyb3cgRXJyb3IoIkVycm9yIGR1cmluZyBkZWNyeXB0aW9uIChwcm9iYWJseSBpbmNvcnJlY3Qga2V5KS4gT3JpZ2luYWwgZXJyb3I6ICIrZS5zdGFjayl9fTtOb2RlUlNBLnByb3RvdHlwZS5zaWduPWZ1bmN0aW9uKGJ1ZmZlcixlbmNvZGluZyxzb3VyY2VfZW5jb2Rpbmcpe2lmKCF0aGlzLmlzUHJpdmF0ZSgpKXt0aHJvdyBFcnJvcigiVGhpcyBpcyBub3QgcHJpdmF0ZSBrZXkiKX12YXIgcmVzPXRoaXMua2V5UGFpci5zaWduKHRoaXMuJGdldERhdGFGb3JFbmNyeXB0KGJ1ZmZlcixzb3VyY2VfZW5jb2RpbmcpKTtpZihlbmNvZGluZyYmZW5jb2RpbmchPSJidWZmZXIiKXtyZXM9cmVzLnRvU3RyaW5nKGVuY29kaW5nKX1yZXR1cm4gcmVzfTtOb2RlUlNBLnByb3RvdHlwZS52ZXJpZnk9ZnVuY3Rpb24oYnVmZmVyLHNpZ25hdHVyZSxzb3VyY2VfZW5jb2Rpbmcsc2lnbmF0dXJlX2VuY29kaW5nKXtpZighdGhpcy5pc1B1YmxpYygpKXt0aHJvdyBFcnJvcigiVGhpcyBpcyBub3QgcHVibGljIGtleSIpfXNpZ25hdHVyZV9lbmNvZGluZz0hc2lnbmF0dXJlX2VuY29kaW5nfHxzaWduYXR1cmVfZW5jb2Rpbmc9PSJidWZmZXIiP251bGw6c2lnbmF0dXJlX2VuY29kaW5nO3JldHVybiB0aGlzLmtleVBhaXIudmVyaWZ5KHRoaXMuJGdldERhdGFGb3JFbmNyeXB0KGJ1ZmZlcixzb3VyY2VfZW5jb2RpbmcpLHNpZ25hdHVyZSxzaWduYXR1cmVfZW5jb2RpbmcpfTtOb2RlUlNBLnByb3RvdHlwZS5nZXRLZXlTaXplPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMua2V5UGFpci5rZXlTaXplfTtOb2RlUlNBLnByb3RvdHlwZS5nZXRNYXhNZXNzYWdlU2l6ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmtleVBhaXIubWF4TWVzc2FnZUxlbmd0aH07Tm9kZVJTQS5wcm90b3R5cGUuJGdldERhdGFGb3JFbmNyeXB0PWZ1bmN0aW9uKGJ1ZmZlcixlbmNvZGluZyl7aWYoXy5pc1N0cmluZyhidWZmZXIpfHxfLmlzTnVtYmVyKGJ1ZmZlcikpe3JldHVybiBCdWZmZXIuZnJvbSgiIitidWZmZXIsZW5jb2Rpbmd8fCJ1dGY4Iil9ZWxzZSBpZihCdWZmZXIuaXNCdWZmZXIoYnVmZmVyKSl7cmV0dXJuIGJ1ZmZlcn1lbHNlIGlmKF8uaXNPYmplY3QoYnVmZmVyKSl7cmV0dXJuIEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KGJ1ZmZlcikpfWVsc2V7dGhyb3cgRXJyb3IoIlVuZXhwZWN0ZWQgZGF0YSB0eXBlIil9fTtOb2RlUlNBLnByb3RvdHlwZS4kZ2V0RGVjcnlwdGVkRGF0YT1mdW5jdGlvbihidWZmZXIsZW5jb2Rpbmcpe2VuY29kaW5nPWVuY29kaW5nfHwiYnVmZmVyIjtpZihlbmNvZGluZz09ImJ1ZmZlciIpe3JldHVybiBidWZmZXJ9ZWxzZSBpZihlbmNvZGluZz09Impzb24iKXtyZXR1cm4gSlNPTi5wYXJzZShidWZmZXIudG9TdHJpbmcoKSl9ZWxzZXtyZXR1cm4gYnVmZmVyLnRvU3RyaW5nKGVuY29kaW5nKX19O3JldHVybiBOb2RlUlNBfSgpfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi9mb3JtYXRzL2Zvcm1hdHMuanMiOjQ5LCIuL2xpYnMvcnNhLmpzIjo1MywiLi9zY2hlbWVzL3NjaGVtZXMuanMiOjU3LCIuL3V0aWxzIjo1OCxidWZmZXI6MjcsY29uc3RhbnRzOjI5LHNlZWRyYW5kb206ODV9XSw0MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7InVzZSBzdHJpY3QiO3ZhciB1dGlscz1yZXF1aXJlKCIuL3V0aWxzIik7dmFyIHN0YW5kYWxvbmVDcmVhdGVIYXNoPXJlcXVpcmUoImNyZWF0ZS1oYXNoIik7dmFyIGdldE5vZGVDcnlwdG89ZnVuY3Rpb24oKXt2YXIgbm9kZUNyeXB0bz11bmRlZmluZWQ7cmV0dXJuIGZ1bmN0aW9uKCl7aWYobm9kZUNyeXB0bz09PXVuZGVmaW5lZCl7bm9kZUNyeXB0bz1yZXF1aXJlKCJjcnlwdG8iKyIiKX1yZXR1cm4gbm9kZUNyeXB0b319KCk7bW9kdWxlLmV4cG9ydHM9e307bW9kdWxlLmV4cG9ydHMuY3JlYXRlSGFzaD1mdW5jdGlvbigpe2lmKHV0aWxzLmRldGVjdEVudmlyb25tZW50KCk9PT0ibm9kZSIpe3RyeXt2YXIgbm9kZUNyeXB0bz1nZXROb2RlQ3J5cHRvKCk7cmV0dXJuIG5vZGVDcnlwdG8uY3JlYXRlSGFzaC5iaW5kKG5vZGVDcnlwdG8pfWNhdGNoKGVycm9yKXt9fXJldHVybiBzdGFuZGFsb25lQ3JlYXRlSGFzaH0oKTtbImNyZWF0ZVNpZ24iLCJjcmVhdGVWZXJpZnkiXS5mb3JFYWNoKGZ1bmN0aW9uKGZuTmFtZSl7bW9kdWxlLmV4cG9ydHNbZm5OYW1lXT1mdW5jdGlvbigpe3ZhciBub2RlQ3J5cHRvPWdldE5vZGVDcnlwdG8oKTtub2RlQ3J5cHRvW2ZuTmFtZV0uYXBwbHkobm9kZUNyeXB0byxhcmd1bWVudHMpfX0pO21vZHVsZS5leHBvcnRzLnJhbmRvbUJ5dGVzPWZ1bmN0aW9uKCl7dmFyIGJyb3dzZXJHZXRSYW5kb21WYWx1ZXM9ZnVuY3Rpb24oKXtpZih0eXBlb2YgY3J5cHRvPT09Im9iamVjdCImJiEhY3J5cHRvLmdldFJhbmRvbVZhbHVlcyl7cmV0dXJuIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChjcnlwdG8pfWVsc2UgaWYodHlwZW9mIG1zQ3J5cHRvPT09Im9iamVjdCImJiEhbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQobXNDcnlwdG8pfWVsc2UgaWYodHlwZW9mIHNlbGY9PT0ib2JqZWN0IiYmdHlwZW9mIHNlbGYuY3J5cHRvPT09Im9iamVjdCImJiEhc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoc2VsZi5jcnlwdG8pfWVsc2V7cmV0dXJuIHVuZGVmaW5lZH19KCk7dmFyIGdldFJhbmRvbVZhbHVlcz1mdW5jdGlvbigpe3ZhciBub25DcnlwdG9ncmFwaGljR2V0UmFuZG9tVmFsdWU9ZnVuY3Rpb24oYWJ2KXt2YXIgbD1hYnYubGVuZ3RoO3doaWxlKGwtLSl7YWJ2W2xdPU1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoyNTYpfXJldHVybiBhYnZ9O3JldHVybiBmdW5jdGlvbihhYnYpe2lmKE1hdGgucmFuZG9tLmlzU2VlZGVkKXtyZXR1cm4gbm9uQ3J5cHRvZ3JhcGhpY0dldFJhbmRvbVZhbHVlKGFidil9ZWxzZXtpZighIWJyb3dzZXJHZXRSYW5kb21WYWx1ZXMpe3JldHVybiBicm93c2VyR2V0UmFuZG9tVmFsdWVzKGFidil9ZWxzZXtyZXR1cm4gbm9uQ3J5cHRvZ3JhcGhpY0dldFJhbmRvbVZhbHVlKGFidil9fX19KCk7dmFyIE1BWF9CWVRFUz02NTUzNjt2YXIgTUFYX1VJTlQzMj00Mjk0OTY3Mjk1O3JldHVybiBmdW5jdGlvbiByYW5kb21CeXRlcyhzaXplKXtpZighTWF0aC5yYW5kb20uaXNTZWVkZWQmJiFicm93c2VyR2V0UmFuZG9tVmFsdWVzKXt0cnl7dmFyIG5vZGVCdWZmZXJJbnN0PWdldE5vZGVDcnlwdG8oKS5yYW5kb21CeXRlcyhzaXplKTtyZXR1cm4gQnVmZmVyLmZyb20obm9kZUJ1ZmZlckluc3QuYnVmZmVyLG5vZGVCdWZmZXJJbnN0LmJ5dGVPZmZzZXQsbm9kZUJ1ZmZlckluc3QubGVuZ3RoKX1jYXRjaChlcnJvcil7fX1pZihzaXplPk1BWF9VSU5UMzIpdGhyb3cgbmV3IFJhbmdlRXJyb3IoInJlcXVlc3RlZCB0b28gbWFueSByYW5kb20gYnl0ZXMiKTt2YXIgYnl0ZXM9QnVmZmVyLmFsbG9jVW5zYWZlKHNpemUpO2lmKHNpemU+MCl7aWYoc2l6ZT5NQVhfQllURVMpe2Zvcih2YXIgZ2VuZXJhdGVkPTA7Z2VuZXJhdGVkPHNpemU7Z2VuZXJhdGVkKz1NQVhfQllURVMpe2dldFJhbmRvbVZhbHVlcyhieXRlcy5zbGljZShnZW5lcmF0ZWQsZ2VuZXJhdGVkK01BWF9CWVRFUykpfX1lbHNle2dldFJhbmRvbVZhbHVlcyhieXRlcyl9fXJldHVybiBieXRlc319KCl9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuL3V0aWxzIjo1OCxidWZmZXI6MjcsImNyZWF0ZS1oYXNoIjozMX1dLDQ0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz17Z2V0RW5naW5lOmZ1bmN0aW9uKGtleVBhaXIsb3B0aW9ucyl7dmFyIGVuZ2luZT1yZXF1aXJlKCIuL2pzLmpzIik7aWYob3B0aW9ucy5lbnZpcm9ubWVudD09PSJub2RlIil7dmFyIGNyeXB0PXJlcXVpcmUoImNyeXB0byIrIiIpO2lmKHR5cGVvZiBjcnlwdC5wdWJsaWNFbmNyeXB0PT09ImZ1bmN0aW9uIiYmdHlwZW9mIGNyeXB0LnByaXZhdGVEZWNyeXB0PT09ImZ1bmN0aW9uIil7aWYodHlwZW9mIGNyeXB0LnByaXZhdGVFbmNyeXB0PT09ImZ1bmN0aW9uIiYmdHlwZW9mIGNyeXB0LnB1YmxpY0RlY3J5cHQ9PT0iZnVuY3Rpb24iKXtlbmdpbmU9cmVxdWlyZSgiLi9pby5qcyIpfWVsc2V7ZW5naW5lPXJlcXVpcmUoIi4vbm9kZTEyLmpzIil9fX1yZXR1cm4gZW5naW5lKGtleVBhaXIsb3B0aW9ucyl9fX0seyIuL2lvLmpzIjo0NSwiLi9qcy5qcyI6NDYsIi4vbm9kZTEyLmpzIjo0N31dLDQ1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgY3J5cHRvPXJlcXVpcmUoImNyeXB0byIrIiIpO3ZhciBjb25zdGFudHM9cmVxdWlyZSgiY29uc3RhbnRzIik7dmFyIHNjaGVtZXM9cmVxdWlyZSgiLi4vc2NoZW1lcy9zY2hlbWVzLmpzIik7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24oa2V5UGFpcixvcHRpb25zKXt2YXIgcGtjczFTY2hlbWU9c2NoZW1lcy5wa2NzMS5tYWtlU2NoZW1lKGtleVBhaXIsb3B0aW9ucyk7cmV0dXJue2VuY3J5cHQ6ZnVuY3Rpb24oYnVmZmVyLHVzZVByaXZhdGUpe3ZhciBwYWRkaW5nO2lmKHVzZVByaXZhdGUpe3BhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9QQURESU5HO2lmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZyl7cGFkZGluZz1vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmd9cmV0dXJuIGNyeXB0by5wcml2YXRlRW5jcnlwdCh7a2V5Om9wdGlvbnMucnNhVXRpbHMuZXhwb3J0S2V5KCJwcml2YXRlIikscGFkZGluZzpwYWRkaW5nfSxidWZmZXIpfWVsc2V7cGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX09BRVBfUEFERElORztpZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWU9PT0icGtjczEiKXtwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfUEFERElOR31pZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmcpe3BhZGRpbmc9b3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nfXZhciBkYXRhPWJ1ZmZlcjtpZihwYWRkaW5nPT09Y29uc3RhbnRzLlJTQV9OT19QQURESU5HKXtkYXRhPXBrY3MxU2NoZW1lLnBrY3MwcGFkKGJ1ZmZlcil9cmV0dXJuIGNyeXB0by5wdWJsaWNFbmNyeXB0KHtrZXk6b3B0aW9ucy5yc2FVdGlscy5leHBvcnRLZXkoInB1YmxpYyIpLHBhZGRpbmc6cGFkZGluZ30sZGF0YSl9fSxkZWNyeXB0OmZ1bmN0aW9uKGJ1ZmZlcix1c2VQdWJsaWMpe3ZhciBwYWRkaW5nO2lmKHVzZVB1YmxpYyl7cGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX1BBRERJTkc7aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nKXtwYWRkaW5nPW9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZ31yZXR1cm4gY3J5cHRvLnB1YmxpY0RlY3J5cHQoe2tleTpvcHRpb25zLnJzYVV0aWxzLmV4cG9ydEtleSgicHVibGljIikscGFkZGluZzpwYWRkaW5nfSxidWZmZXIpfWVsc2V7cGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX09BRVBfUEFERElORztpZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWU9PT0icGtjczEiKXtwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfUEFERElOR31pZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmcpe3BhZGRpbmc9b3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nfXZhciByZXM9Y3J5cHRvLnByaXZhdGVEZWNyeXB0KHtrZXk6b3B0aW9ucy5yc2FVdGlscy5leHBvcnRLZXkoInByaXZhdGUiKSxwYWRkaW5nOnBhZGRpbmd9LGJ1ZmZlcik7aWYocGFkZGluZz09PWNvbnN0YW50cy5SU0FfTk9fUEFERElORyl7cmV0dXJuIHBrY3MxU2NoZW1lLnBrY3MwdW5wYWQocmVzKX1yZXR1cm4gcmVzfX19fX0seyIuLi9zY2hlbWVzL3NjaGVtZXMuanMiOjU3LGNvbnN0YW50czoyOX1dLDQ2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgQmlnSW50ZWdlcj1yZXF1aXJlKCIuLi9saWJzL2pzYm4uanMiKTt2YXIgc2NoZW1lcz1yZXF1aXJlKCIuLi9zY2hlbWVzL3NjaGVtZXMuanMiKTttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbihrZXlQYWlyLG9wdGlvbnMpe3ZhciBwa2NzMVNjaGVtZT1zY2hlbWVzLnBrY3MxLm1ha2VTY2hlbWUoa2V5UGFpcixvcHRpb25zKTtyZXR1cm57ZW5jcnlwdDpmdW5jdGlvbihidWZmZXIsdXNlUHJpdmF0ZSl7dmFyIG0sYztpZih1c2VQcml2YXRlKXttPW5ldyBCaWdJbnRlZ2VyKHBrY3MxU2NoZW1lLmVuY1BhZChidWZmZXIse3R5cGU6MX0pKTtjPWtleVBhaXIuJGRvUHJpdmF0ZShtKX1lbHNle209bmV3IEJpZ0ludGVnZXIoa2V5UGFpci5lbmNyeXB0aW9uU2NoZW1lLmVuY1BhZChidWZmZXIpKTtjPWtleVBhaXIuJGRvUHVibGljKG0pfXJldHVybiBjLnRvQnVmZmVyKGtleVBhaXIuZW5jcnlwdGVkRGF0YUxlbmd0aCl9LGRlY3J5cHQ6ZnVuY3Rpb24oYnVmZmVyLHVzZVB1YmxpYyl7dmFyIG0sYz1uZXcgQmlnSW50ZWdlcihidWZmZXIpO2lmKHVzZVB1YmxpYyl7bT1rZXlQYWlyLiRkb1B1YmxpYyhjKTtyZXR1cm4gcGtjczFTY2hlbWUuZW5jVW5QYWQobS50b0J1ZmZlcihrZXlQYWlyLmVuY3J5cHRlZERhdGFMZW5ndGgpLHt0eXBlOjF9KX1lbHNle209a2V5UGFpci4kZG9Qcml2YXRlKGMpO3JldHVybiBrZXlQYWlyLmVuY3J5cHRpb25TY2hlbWUuZW5jVW5QYWQobS50b0J1ZmZlcihrZXlQYWlyLmVuY3J5cHRlZERhdGFMZW5ndGgpKX19fX19LHsiLi4vbGlicy9qc2JuLmpzIjo1MiwiLi4vc2NoZW1lcy9zY2hlbWVzLmpzIjo1N31dLDQ3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgY3J5cHRvPXJlcXVpcmUoImNyeXB0byIrIiIpO3ZhciBjb25zdGFudHM9cmVxdWlyZSgiY29uc3RhbnRzIik7dmFyIHNjaGVtZXM9cmVxdWlyZSgiLi4vc2NoZW1lcy9zY2hlbWVzLmpzIik7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24oa2V5UGFpcixvcHRpb25zKXt2YXIganNFbmdpbmU9cmVxdWlyZSgiLi9qcy5qcyIpKGtleVBhaXIsb3B0aW9ucyk7dmFyIHBrY3MxU2NoZW1lPXNjaGVtZXMucGtjczEubWFrZVNjaGVtZShrZXlQYWlyLG9wdGlvbnMpO3JldHVybntlbmNyeXB0OmZ1bmN0aW9uKGJ1ZmZlcix1c2VQcml2YXRlKXtpZih1c2VQcml2YXRlKXtyZXR1cm4ganNFbmdpbmUuZW5jcnlwdChidWZmZXIsdXNlUHJpdmF0ZSl9dmFyIHBhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9PQUVQX1BBRERJTkc7aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lPT09InBrY3MxIil7cGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX1BBRERJTkd9aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nKXtwYWRkaW5nPW9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZ312YXIgZGF0YT1idWZmZXI7aWYocGFkZGluZz09PWNvbnN0YW50cy5SU0FfTk9fUEFERElORyl7ZGF0YT1wa2NzMVNjaGVtZS5wa2NzMHBhZChidWZmZXIpfXJldHVybiBjcnlwdG8ucHVibGljRW5jcnlwdCh7a2V5Om9wdGlvbnMucnNhVXRpbHMuZXhwb3J0S2V5KCJwdWJsaWMiKSxwYWRkaW5nOnBhZGRpbmd9LGRhdGEpfSxkZWNyeXB0OmZ1bmN0aW9uKGJ1ZmZlcix1c2VQdWJsaWMpe2lmKHVzZVB1YmxpYyl7cmV0dXJuIGpzRW5naW5lLmRlY3J5cHQoYnVmZmVyLHVzZVB1YmxpYyl9dmFyIHBhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9PQUVQX1BBRERJTkc7aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lPT09InBrY3MxIil7cGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX1BBRERJTkd9aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nKXtwYWRkaW5nPW9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZ312YXIgcmVzPWNyeXB0by5wcml2YXRlRGVjcnlwdCh7a2V5Om9wdGlvbnMucnNhVXRpbHMuZXhwb3J0S2V5KCJwcml2YXRlIikscGFkZGluZzpwYWRkaW5nfSxidWZmZXIpO2lmKHBhZGRpbmc9PT1jb25zdGFudHMuUlNBX05PX1BBRERJTkcpe3JldHVybiBwa2NzMVNjaGVtZS5wa2NzMHVucGFkKHJlcyl9cmV0dXJuIHJlc319fX0seyIuLi9zY2hlbWVzL3NjaGVtZXMuanMiOjU3LCIuL2pzLmpzIjo0Nixjb25zdGFudHM6Mjl9XSw0ODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIF89cmVxdWlyZSgiLi4vdXRpbHMiKS5fO21vZHVsZS5leHBvcnRzPXtwcml2YXRlRXhwb3J0OmZ1bmN0aW9uKGtleSxvcHRpb25zKXtyZXR1cm57bjprZXkubi50b0J1ZmZlcigpLGU6a2V5LmUsZDprZXkuZC50b0J1ZmZlcigpLHA6a2V5LnAudG9CdWZmZXIoKSxxOmtleS5xLnRvQnVmZmVyKCksZG1wMTprZXkuZG1wMS50b0J1ZmZlcigpLGRtcTE6a2V5LmRtcTEudG9CdWZmZXIoKSxjb2VmZjprZXkuY29lZmYudG9CdWZmZXIoKX19LHByaXZhdGVJbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEsb3B0aW9ucyl7aWYoZGF0YS5uJiZkYXRhLmUmJmRhdGEuZCYmZGF0YS5wJiZkYXRhLnEmJmRhdGEuZG1wMSYmZGF0YS5kbXExJiZkYXRhLmNvZWZmKXtrZXkuc2V0UHJpdmF0ZShkYXRhLm4sZGF0YS5lLGRhdGEuZCxkYXRhLnAsZGF0YS5xLGRhdGEuZG1wMSxkYXRhLmRtcTEsZGF0YS5jb2VmZil9ZWxzZXt0aHJvdyBFcnJvcigiSW52YWxpZCBrZXkgZGF0YSIpfX0scHVibGljRXhwb3J0OmZ1bmN0aW9uKGtleSxvcHRpb25zKXtyZXR1cm57bjprZXkubi50b0J1ZmZlcigpLGU6a2V5LmV9fSxwdWJsaWNJbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEsb3B0aW9ucyl7aWYoZGF0YS5uJiZkYXRhLmUpe2tleS5zZXRQdWJsaWMoZGF0YS5uLGRhdGEuZSl9ZWxzZXt0aHJvdyBFcnJvcigiSW52YWxpZCBrZXkgZGF0YSIpfX0sYXV0b0ltcG9ydDpmdW5jdGlvbihrZXksZGF0YSl7aWYoZGF0YS5uJiZkYXRhLmUpe2lmKGRhdGEuZCYmZGF0YS5wJiZkYXRhLnEmJmRhdGEuZG1wMSYmZGF0YS5kbXExJiZkYXRhLmNvZWZmKXttb2R1bGUuZXhwb3J0cy5wcml2YXRlSW1wb3J0KGtleSxkYXRhKTtyZXR1cm4gdHJ1ZX1lbHNle21vZHVsZS5leHBvcnRzLnB1YmxpY0ltcG9ydChrZXksZGF0YSk7cmV0dXJuIHRydWV9fXJldHVybiBmYWxzZX19fSx7Ii4uL3V0aWxzIjo1OH1dLDQ5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtmdW5jdGlvbiBmb3JtYXRQYXJzZShmb3JtYXQpe2Zvcm1hdD1mb3JtYXQuc3BsaXQoIi0iKTt2YXIga2V5VHlwZT0icHJpdmF0ZSI7dmFyIGtleU9wdD17dHlwZToiZGVmYXVsdCJ9O2Zvcih2YXIgaT0xO2k8Zm9ybWF0Lmxlbmd0aDtpKyspe2lmKGZvcm1hdFtpXSl7c3dpdGNoKGZvcm1hdFtpXSl7Y2FzZSJwdWJsaWMiOmtleVR5cGU9Zm9ybWF0W2ldO2JyZWFrO2Nhc2UicHJpdmF0ZSI6a2V5VHlwZT1mb3JtYXRbaV07YnJlYWs7Y2FzZSJwZW0iOmtleU9wdC50eXBlPWZvcm1hdFtpXTticmVhaztjYXNlImRlciI6a2V5T3B0LnR5cGU9Zm9ybWF0W2ldO2JyZWFrfX19cmV0dXJue3NjaGVtZTpmb3JtYXRbMF0sa2V5VHlwZTprZXlUeXBlLGtleU9wdDprZXlPcHR9fW1vZHVsZS5leHBvcnRzPXtwa2NzMTpyZXF1aXJlKCIuL3BrY3MxIikscGtjczg6cmVxdWlyZSgiLi9wa2NzOCIpLGNvbXBvbmVudHM6cmVxdWlyZSgiLi9jb21wb25lbnRzIiksaXNQcml2YXRlRXhwb3J0OmZ1bmN0aW9uKGZvcm1hdCl7cmV0dXJuIG1vZHVsZS5leHBvcnRzW2Zvcm1hdF0mJnR5cGVvZiBtb2R1bGUuZXhwb3J0c1tmb3JtYXRdLnByaXZhdGVFeHBvcnQ9PT0iZnVuY3Rpb24ifSxpc1ByaXZhdGVJbXBvcnQ6ZnVuY3Rpb24oZm9ybWF0KXtyZXR1cm4gbW9kdWxlLmV4cG9ydHNbZm9ybWF0XSYmdHlwZW9mIG1vZHVsZS5leHBvcnRzW2Zvcm1hdF0ucHJpdmF0ZUltcG9ydD09PSJmdW5jdGlvbiJ9LGlzUHVibGljRXhwb3J0OmZ1bmN0aW9uKGZvcm1hdCl7cmV0dXJuIG1vZHVsZS5leHBvcnRzW2Zvcm1hdF0mJnR5cGVvZiBtb2R1bGUuZXhwb3J0c1tmb3JtYXRdLnB1YmxpY0V4cG9ydD09PSJmdW5jdGlvbiJ9LGlzUHVibGljSW1wb3J0OmZ1bmN0aW9uKGZvcm1hdCl7cmV0dXJuIG1vZHVsZS5leHBvcnRzW2Zvcm1hdF0mJnR5cGVvZiBtb2R1bGUuZXhwb3J0c1tmb3JtYXRdLnB1YmxpY0ltcG9ydD09PSJmdW5jdGlvbiJ9LGRldGVjdEFuZEltcG9ydDpmdW5jdGlvbihrZXksZGF0YSxmb3JtYXQpe2lmKGZvcm1hdD09PXVuZGVmaW5lZCl7Zm9yKHZhciBzY2hlbWUgaW4gbW9kdWxlLmV4cG9ydHMpe2lmKHR5cGVvZiBtb2R1bGUuZXhwb3J0c1tzY2hlbWVdLmF1dG9JbXBvcnQ9PT0iZnVuY3Rpb24iJiZtb2R1bGUuZXhwb3J0c1tzY2hlbWVdLmF1dG9JbXBvcnQoa2V5LGRhdGEpKXtyZXR1cm4gdHJ1ZX19fWVsc2UgaWYoZm9ybWF0KXt2YXIgZm10PWZvcm1hdFBhcnNlKGZvcm1hdCk7aWYobW9kdWxlLmV4cG9ydHNbZm10LnNjaGVtZV0pe2lmKGZtdC5rZXlUeXBlPT09InByaXZhdGUiKXttb2R1bGUuZXhwb3J0c1tmbXQuc2NoZW1lXS5wcml2YXRlSW1wb3J0KGtleSxkYXRhLGZtdC5rZXlPcHQpfWVsc2V7bW9kdWxlLmV4cG9ydHNbZm10LnNjaGVtZV0ucHVibGljSW1wb3J0KGtleSxkYXRhLGZtdC5rZXlPcHQpfX1lbHNle3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBrZXkgZm9ybWF0Iil9fXJldHVybiBmYWxzZX0sZGV0ZWN0QW5kRXhwb3J0OmZ1bmN0aW9uKGtleSxmb3JtYXQpe2lmKGZvcm1hdCl7dmFyIGZtdD1mb3JtYXRQYXJzZShmb3JtYXQpO2lmKG1vZHVsZS5leHBvcnRzW2ZtdC5zY2hlbWVdKXtpZihmbXQua2V5VHlwZT09PSJwcml2YXRlIil7aWYoIWtleS5pc1ByaXZhdGUoKSl7dGhyb3cgRXJyb3IoIlRoaXMgaXMgbm90IHByaXZhdGUga2V5Iil9cmV0dXJuIG1vZHVsZS5leHBvcnRzW2ZtdC5zY2hlbWVdLnByaXZhdGVFeHBvcnQoa2V5LGZtdC5rZXlPcHQpfWVsc2V7aWYoIWtleS5pc1B1YmxpYygpKXt0aHJvdyBFcnJvcigiVGhpcyBpcyBub3QgcHVibGljIGtleSIpfXJldHVybiBtb2R1bGUuZXhwb3J0c1tmbXQuc2NoZW1lXS5wdWJsaWNFeHBvcnQoa2V5LGZtdC5rZXlPcHQpfX1lbHNle3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBrZXkgZm9ybWF0Iil9fX19fSx7Ii4vY29tcG9uZW50cyI6NDgsIi4vcGtjczEiOjUwLCIuL3BrY3M4Ijo1MX1dLDUwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgYmVyPXJlcXVpcmUoImFzbjEiKS5CZXI7dmFyIF89cmVxdWlyZSgiLi4vdXRpbHMiKS5fO3ZhciB1dGlscz1yZXF1aXJlKCIuLi91dGlscyIpO3ZhciBQUklWQVRFX09QRU5JTkdfQk9VTkRBUlk9Ii0tLS0tQkVHSU4gUlNBIFBSSVZBVEUgS0VZLS0tLS0iO3ZhciBQUklWQVRFX0NMT1NJTkdfQk9VTkRBUlk9Ii0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tIjt2YXIgUFVCTElDX09QRU5JTkdfQk9VTkRBUlk9Ii0tLS0tQkVHSU4gUlNBIFBVQkxJQyBLRVktLS0tLSI7dmFyIFBVQkxJQ19DTE9TSU5HX0JPVU5EQVJZPSItLS0tLUVORCBSU0EgUFVCTElDIEtFWS0tLS0tIjttb2R1bGUuZXhwb3J0cz17cHJpdmF0ZUV4cG9ydDpmdW5jdGlvbihrZXksb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgbj1rZXkubi50b0J1ZmZlcigpO3ZhciBkPWtleS5kLnRvQnVmZmVyKCk7dmFyIHA9a2V5LnAudG9CdWZmZXIoKTt2YXIgcT1rZXkucS50b0J1ZmZlcigpO3ZhciBkbXAxPWtleS5kbXAxLnRvQnVmZmVyKCk7dmFyIGRtcTE9a2V5LmRtcTEudG9CdWZmZXIoKTt2YXIgY29lZmY9a2V5LmNvZWZmLnRvQnVmZmVyKCk7dmFyIGxlbmd0aD1uLmxlbmd0aCtkLmxlbmd0aCtwLmxlbmd0aCtxLmxlbmd0aCtkbXAxLmxlbmd0aCtkbXExLmxlbmd0aCtjb2VmZi5sZW5ndGgrNTEyO3ZhciB3cml0ZXI9bmV3IGJlci5Xcml0ZXIoe3NpemU6bGVuZ3RofSk7d3JpdGVyLnN0YXJ0U2VxdWVuY2UoKTt3cml0ZXIud3JpdGVJbnQoMCk7d3JpdGVyLndyaXRlQnVmZmVyKG4sMik7d3JpdGVyLndyaXRlSW50KGtleS5lKTt3cml0ZXIud3JpdGVCdWZmZXIoZCwyKTt3cml0ZXIud3JpdGVCdWZmZXIocCwyKTt3cml0ZXIud3JpdGVCdWZmZXIocSwyKTt3cml0ZXIud3JpdGVCdWZmZXIoZG1wMSwyKTt3cml0ZXIud3JpdGVCdWZmZXIoZG1xMSwyKTt3cml0ZXIud3JpdGVCdWZmZXIoY29lZmYsMik7d3JpdGVyLmVuZFNlcXVlbmNlKCk7aWYob3B0aW9ucy50eXBlPT09ImRlciIpe3JldHVybiB3cml0ZXIuYnVmZmVyfWVsc2V7cmV0dXJuIFBSSVZBVEVfT1BFTklOR19CT1VOREFSWSsiXG4iK3V0aWxzLmxpbmVicmsod3JpdGVyLmJ1ZmZlci50b1N0cmluZygiYmFzZTY0IiksNjQpKyJcbiIrUFJJVkFURV9DTE9TSU5HX0JPVU5EQVJZfX0scHJpdmF0ZUltcG9ydDpmdW5jdGlvbihrZXksZGF0YSxvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBidWZmZXI7aWYob3B0aW9ucy50eXBlIT09ImRlciIpe2lmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl7ZGF0YT1kYXRhLnRvU3RyaW5nKCJ1dGY4Iil9aWYoXy5pc1N0cmluZyhkYXRhKSl7dmFyIHBlbT11dGlscy50cmltU3Vycm91bmRpbmdUZXh0KGRhdGEsUFJJVkFURV9PUEVOSU5HX0JPVU5EQVJZLFBSSVZBVEVfQ0xPU0lOR19CT1VOREFSWSkucmVwbGFjZSgvXHMrfFxuXHJ8XG58XHIkL2dtLCIiKTtidWZmZXI9QnVmZmVyLmZyb20ocGVtLCJiYXNlNjQiKX1lbHNle3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBrZXkgZm9ybWF0Iil9fWVsc2UgaWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKXtidWZmZXI9ZGF0YX1lbHNle3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBrZXkgZm9ybWF0Iil9dmFyIHJlYWRlcj1uZXcgYmVyLlJlYWRlcihidWZmZXIpO3JlYWRlci5yZWFkU2VxdWVuY2UoKTtyZWFkZXIucmVhZFN0cmluZygyLHRydWUpO2tleS5zZXRQcml2YXRlKHJlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSkscmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKSxyZWFkZXIucmVhZFN0cmluZygyLHRydWUpLHJlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSkscmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKSxyZWFkZXIucmVhZFN0cmluZygyLHRydWUpLHJlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSkscmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKSl9LHB1YmxpY0V4cG9ydDpmdW5jdGlvbihrZXksb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgbj1rZXkubi50b0J1ZmZlcigpO3ZhciBsZW5ndGg9bi5sZW5ndGgrNTEyO3ZhciBib2R5V3JpdGVyPW5ldyBiZXIuV3JpdGVyKHtzaXplOmxlbmd0aH0pO2JvZHlXcml0ZXIuc3RhcnRTZXF1ZW5jZSgpO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIobiwyKTtib2R5V3JpdGVyLndyaXRlSW50KGtleS5lKTtib2R5V3JpdGVyLmVuZFNlcXVlbmNlKCk7aWYob3B0aW9ucy50eXBlPT09ImRlciIpe3JldHVybiBib2R5V3JpdGVyLmJ1ZmZlcn1lbHNle3JldHVybiBQVUJMSUNfT1BFTklOR19CT1VOREFSWSsiXG4iK3V0aWxzLmxpbmVicmsoYm9keVdyaXRlci5idWZmZXIudG9TdHJpbmcoImJhc2U2NCIpLDY0KSsiXG4iK1BVQkxJQ19DTE9TSU5HX0JPVU5EQVJZfX0scHVibGljSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhLG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGJ1ZmZlcjtpZihvcHRpb25zLnR5cGUhPT0iZGVyIil7aWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKXtkYXRhPWRhdGEudG9TdHJpbmcoInV0ZjgiKX1pZihfLmlzU3RyaW5nKGRhdGEpKXt2YXIgcGVtPXV0aWxzLnRyaW1TdXJyb3VuZGluZ1RleHQoZGF0YSxQVUJMSUNfT1BFTklOR19CT1VOREFSWSxQVUJMSUNfQ0xPU0lOR19CT1VOREFSWSkucmVwbGFjZSgvXHMrfFxuXHJ8XG58XHIkL2dtLCIiKTtidWZmZXI9QnVmZmVyLmZyb20ocGVtLCJiYXNlNjQiKX19ZWxzZSBpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpe2J1ZmZlcj1kYXRhfWVsc2V7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGtleSBmb3JtYXQiKX12YXIgYm9keT1uZXcgYmVyLlJlYWRlcihidWZmZXIpO2JvZHkucmVhZFNlcXVlbmNlKCk7a2V5LnNldFB1YmxpYyhib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSl9LGF1dG9JbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEpe2lmKC9eW1xTXHNdKi0tLS0tQkVHSU4gUlNBIFBSSVZBVEUgS0VZLS0tLS1ccyooPz0oKFtBLVphLXowLTkrLz1dK1xzKikrKSlcMS0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tW1xTXHNdKiQvZy50ZXN0KGRhdGEpKXttb2R1bGUuZXhwb3J0cy5wcml2YXRlSW1wb3J0KGtleSxkYXRhKTtyZXR1cm4gdHJ1ZX1pZigvXltcU1xzXSotLS0tLUJFR0lOIFJTQSBQVUJMSUMgS0VZLS0tLS1ccyooPz0oKFtBLVphLXowLTkrLz1dK1xzKikrKSlcMS0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS1bXFNcc10qJC9nLnRlc3QoZGF0YSkpe21vZHVsZS5leHBvcnRzLnB1YmxpY0ltcG9ydChrZXksZGF0YSk7cmV0dXJuIHRydWV9cmV0dXJuIGZhbHNlfX19KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi91dGlscyI6NTgsYXNuMToxOSxidWZmZXI6Mjd9XSw1MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIGJlcj1yZXF1aXJlKCJhc24xIikuQmVyO3ZhciBfPXJlcXVpcmUoIi4uL3V0aWxzIikuXzt2YXIgUFVCTElDX1JTQV9PSUQ9IjEuMi44NDAuMTEzNTQ5LjEuMS4xIjt2YXIgdXRpbHM9cmVxdWlyZSgiLi4vdXRpbHMiKTt2YXIgUFJJVkFURV9PUEVOSU5HX0JPVU5EQVJZPSItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS0iO3ZhciBQUklWQVRFX0NMT1NJTkdfQk9VTkRBUlk9Ii0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0iO3ZhciBQVUJMSUNfT1BFTklOR19CT1VOREFSWT0iLS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0iO3ZhciBQVUJMSUNfQ0xPU0lOR19CT1VOREFSWT0iLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tIjttb2R1bGUuZXhwb3J0cz17cHJpdmF0ZUV4cG9ydDpmdW5jdGlvbihrZXksb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgbj1rZXkubi50b0J1ZmZlcigpO3ZhciBkPWtleS5kLnRvQnVmZmVyKCk7dmFyIHA9a2V5LnAudG9CdWZmZXIoKTt2YXIgcT1rZXkucS50b0J1ZmZlcigpO3ZhciBkbXAxPWtleS5kbXAxLnRvQnVmZmVyKCk7dmFyIGRtcTE9a2V5LmRtcTEudG9CdWZmZXIoKTt2YXIgY29lZmY9a2V5LmNvZWZmLnRvQnVmZmVyKCk7dmFyIGxlbmd0aD1uLmxlbmd0aCtkLmxlbmd0aCtwLmxlbmd0aCtxLmxlbmd0aCtkbXAxLmxlbmd0aCtkbXExLmxlbmd0aCtjb2VmZi5sZW5ndGgrNTEyO3ZhciBib2R5V3JpdGVyPW5ldyBiZXIuV3JpdGVyKHtzaXplOmxlbmd0aH0pO2JvZHlXcml0ZXIuc3RhcnRTZXF1ZW5jZSgpO2JvZHlXcml0ZXIud3JpdGVJbnQoMCk7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihuLDIpO2JvZHlXcml0ZXIud3JpdGVJbnQoa2V5LmUpO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIoZCwyKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKHAsMik7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihxLDIpO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIoZG1wMSwyKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKGRtcTEsMik7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihjb2VmZiwyKTtib2R5V3JpdGVyLmVuZFNlcXVlbmNlKCk7dmFyIHdyaXRlcj1uZXcgYmVyLldyaXRlcih7c2l6ZTpsZW5ndGh9KTt3cml0ZXIuc3RhcnRTZXF1ZW5jZSgpO3dyaXRlci53cml0ZUludCgwKTt3cml0ZXIuc3RhcnRTZXF1ZW5jZSgpO3dyaXRlci53cml0ZU9JRChQVUJMSUNfUlNBX09JRCk7d3JpdGVyLndyaXRlTnVsbCgpO3dyaXRlci5lbmRTZXF1ZW5jZSgpO3dyaXRlci53cml0ZUJ1ZmZlcihib2R5V3JpdGVyLmJ1ZmZlciw0KTt3cml0ZXIuZW5kU2VxdWVuY2UoKTtpZihvcHRpb25zLnR5cGU9PT0iZGVyIil7cmV0dXJuIHdyaXRlci5idWZmZXJ9ZWxzZXtyZXR1cm4gUFJJVkFURV9PUEVOSU5HX0JPVU5EQVJZKyJcbiIrdXRpbHMubGluZWJyayh3cml0ZXIuYnVmZmVyLnRvU3RyaW5nKCJiYXNlNjQiKSw2NCkrIlxuIitQUklWQVRFX0NMT1NJTkdfQk9VTkRBUll9fSxwcml2YXRlSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhLG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGJ1ZmZlcjtpZihvcHRpb25zLnR5cGUhPT0iZGVyIil7aWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKXtkYXRhPWRhdGEudG9TdHJpbmcoInV0ZjgiKX1pZihfLmlzU3RyaW5nKGRhdGEpKXt2YXIgcGVtPXV0aWxzLnRyaW1TdXJyb3VuZGluZ1RleHQoZGF0YSxQUklWQVRFX09QRU5JTkdfQk9VTkRBUlksUFJJVkFURV9DTE9TSU5HX0JPVU5EQVJZKS5yZXBsYWNlKCItLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tIiwiIikucmVwbGFjZSgvXHMrfFxuXHJ8XG58XHIkL2dtLCIiKTtidWZmZXI9QnVmZmVyLmZyb20ocGVtLCJiYXNlNjQiKX1lbHNle3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBrZXkgZm9ybWF0Iil9fWVsc2UgaWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKXtidWZmZXI9ZGF0YX1lbHNle3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBrZXkgZm9ybWF0Iil9dmFyIHJlYWRlcj1uZXcgYmVyLlJlYWRlcihidWZmZXIpO3JlYWRlci5yZWFkU2VxdWVuY2UoKTtyZWFkZXIucmVhZEludCgwKTt2YXIgaGVhZGVyPW5ldyBiZXIuUmVhZGVyKHJlYWRlci5yZWFkU3RyaW5nKDQ4LHRydWUpKTtpZihoZWFkZXIucmVhZE9JRCg2LHRydWUpIT09UFVCTElDX1JTQV9PSUQpe3Rocm93IEVycm9yKCJJbnZhbGlkIFB1YmxpYyBrZXkgZm9ybWF0Iil9dmFyIGJvZHk9bmV3IGJlci5SZWFkZXIocmVhZGVyLnJlYWRTdHJpbmcoNCx0cnVlKSk7Ym9keS5yZWFkU2VxdWVuY2UoKTtib2R5LnJlYWRTdHJpbmcoMix0cnVlKTtrZXkuc2V0UHJpdmF0ZShib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSxib2R5LnJlYWRTdHJpbmcoMix0cnVlKSl9LHB1YmxpY0V4cG9ydDpmdW5jdGlvbihrZXksb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgbj1rZXkubi50b0J1ZmZlcigpO3ZhciBsZW5ndGg9bi5sZW5ndGgrNTEyO3ZhciBib2R5V3JpdGVyPW5ldyBiZXIuV3JpdGVyKHtzaXplOmxlbmd0aH0pO2JvZHlXcml0ZXIud3JpdGVCeXRlKDApO2JvZHlXcml0ZXIuc3RhcnRTZXF1ZW5jZSgpO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIobiwyKTtib2R5V3JpdGVyLndyaXRlSW50KGtleS5lKTtib2R5V3JpdGVyLmVuZFNlcXVlbmNlKCk7dmFyIHdyaXRlcj1uZXcgYmVyLldyaXRlcih7c2l6ZTpsZW5ndGh9KTt3cml0ZXIuc3RhcnRTZXF1ZW5jZSgpO3dyaXRlci5zdGFydFNlcXVlbmNlKCk7d3JpdGVyLndyaXRlT0lEKFBVQkxJQ19SU0FfT0lEKTt3cml0ZXIud3JpdGVOdWxsKCk7d3JpdGVyLmVuZFNlcXVlbmNlKCk7d3JpdGVyLndyaXRlQnVmZmVyKGJvZHlXcml0ZXIuYnVmZmVyLDMpO3dyaXRlci5lbmRTZXF1ZW5jZSgpO2lmKG9wdGlvbnMudHlwZT09PSJkZXIiKXtyZXR1cm4gd3JpdGVyLmJ1ZmZlcn1lbHNle3JldHVybiBQVUJMSUNfT1BFTklOR19CT1VOREFSWSsiXG4iK3V0aWxzLmxpbmVicmsod3JpdGVyLmJ1ZmZlci50b1N0cmluZygiYmFzZTY0IiksNjQpKyJcbiIrUFVCTElDX0NMT1NJTkdfQk9VTkRBUll9fSxwdWJsaWNJbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEsb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgYnVmZmVyO2lmKG9wdGlvbnMudHlwZSE9PSJkZXIiKXtpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpe2RhdGE9ZGF0YS50b1N0cmluZygidXRmOCIpfWlmKF8uaXNTdHJpbmcoZGF0YSkpe3ZhciBwZW09dXRpbHMudHJpbVN1cnJvdW5kaW5nVGV4dChkYXRhLFBVQkxJQ19PUEVOSU5HX0JPVU5EQVJZLFBVQkxJQ19DTE9TSU5HX0JPVU5EQVJZKS5yZXBsYWNlKC9ccyt8XG5ccnxcbnxcciQvZ20sIiIpO2J1ZmZlcj1CdWZmZXIuZnJvbShwZW0sImJhc2U2NCIpfX1lbHNlIGlmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl7YnVmZmVyPWRhdGF9ZWxzZXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQga2V5IGZvcm1hdCIpfXZhciByZWFkZXI9bmV3IGJlci5SZWFkZXIoYnVmZmVyKTtyZWFkZXIucmVhZFNlcXVlbmNlKCk7dmFyIGhlYWRlcj1uZXcgYmVyLlJlYWRlcihyZWFkZXIucmVhZFN0cmluZyg0OCx0cnVlKSk7aWYoaGVhZGVyLnJlYWRPSUQoNix0cnVlKSE9PVBVQkxJQ19SU0FfT0lEKXt0aHJvdyBFcnJvcigiSW52YWxpZCBQdWJsaWMga2V5IGZvcm1hdCIpfXZhciBib2R5PW5ldyBiZXIuUmVhZGVyKHJlYWRlci5yZWFkU3RyaW5nKDMsdHJ1ZSkpO2JvZHkucmVhZEJ5dGUoKTtib2R5LnJlYWRTZXF1ZW5jZSgpO2tleS5zZXRQdWJsaWMoYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSkpfSxhdXRvSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhKXtpZigvXltcU1xzXSotLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1ccyooPz0oKFtBLVphLXowLTkrLz1dK1xzKikrKSlcMS0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1bXFNcc10qJC9nLnRlc3QoZGF0YSkpe21vZHVsZS5leHBvcnRzLnByaXZhdGVJbXBvcnQoa2V5LGRhdGEpO3JldHVybiB0cnVlfWlmKC9eW1xTXHNdKi0tLS0tQkVHSU4gUFVCTElDIEtFWS0tLS0tXHMqKD89KChbQS1aYS16MC05Ky89XStccyopKykpXDEtLS0tLUVORCBQVUJMSUMgS0VZLS0tLS1bXFNcc10qJC9nLnRlc3QoZGF0YSkpe21vZHVsZS5leHBvcnRzLnB1YmxpY0ltcG9ydChrZXksZGF0YSk7cmV0dXJuIHRydWV9cmV0dXJuIGZhbHNlfX19KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi91dGlscyI6NTgsYXNuMToxOSxidWZmZXI6Mjd9XSw1MjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIGNyeXB0PXJlcXVpcmUoIi4uL2NyeXB0byIpO3ZhciBfPXJlcXVpcmUoIi4uL3V0aWxzIikuXzt2YXIgcGV0ZXJPbHNvbl9CaWdJbnRlZ2VyU3RhdGljPXJlcXVpcmUoImJpZy1pbnRlZ2VyIik7dmFyIGRiaXRzO3ZhciBjYW5hcnk9MHhkZWFkYmVlZmNhZmU7dmFyIGpfbG09KGNhbmFyeSYxNjc3NzIxNSk9PTE1NzE1MDcwO2Z1bmN0aW9uIEJpZ0ludGVnZXIoYSxiKXtpZihhIT1udWxsKXtpZigibnVtYmVyIj09dHlwZW9mIGEpe3RoaXMuZnJvbU51bWJlcihhLGIpfWVsc2UgaWYoQnVmZmVyLmlzQnVmZmVyKGEpKXt0aGlzLmZyb21CdWZmZXIoYSl9ZWxzZSBpZihiPT1udWxsJiYic3RyaW5nIiE9dHlwZW9mIGEpe3RoaXMuZnJvbUJ5dGVBcnJheShhKX1lbHNle3RoaXMuZnJvbVN0cmluZyhhLGIpfX19ZnVuY3Rpb24gbmJpKCl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKG51bGwpfWZ1bmN0aW9uIGFtMShpLHgsdyxqLGMsbil7d2hpbGUoLS1uPj0wKXt2YXIgdj14KnRoaXNbaSsrXSt3W2pdK2M7Yz1NYXRoLmZsb29yKHYvNjcxMDg4NjQpO3dbaisrXT12JjY3MTA4ODYzfXJldHVybiBjfWZ1bmN0aW9uIGFtMihpLHgsdyxqLGMsbil7dmFyIHhsPXgmMzI3NjcseGg9eD4+MTU7d2hpbGUoLS1uPj0wKXt2YXIgbD10aGlzW2ldJjMyNzY3O3ZhciBoPXRoaXNbaSsrXT4+MTU7dmFyIG09eGgqbCtoKnhsO2w9eGwqbCsoKG0mMzI3NjcpPDwxNSkrd1tqXSsoYyYxMDczNzQxODIzKTtjPShsPj4+MzApKyhtPj4+MTUpK3hoKmgrKGM+Pj4zMCk7d1tqKytdPWwmMTA3Mzc0MTgyM31yZXR1cm4gY31mdW5jdGlvbiBhbTMoaSx4LHcsaixjLG4pe3ZhciB4bD14JjE2MzgzLHhoPXg+PjE0O3doaWxlKC0tbj49MCl7dmFyIGw9dGhpc1tpXSYxNjM4Mzt2YXIgaD10aGlzW2krK10+PjE0O3ZhciBtPXhoKmwraCp4bDtsPXhsKmwrKChtJjE2MzgzKTw8MTQpK3dbal0rYztjPShsPj4yOCkrKG0+PjE0KSt4aCpoO3dbaisrXT1sJjI2ODQzNTQ1NX1yZXR1cm4gY31CaWdJbnRlZ2VyLnByb3RvdHlwZS5hbT1hbTM7ZGJpdHM9Mjg7QmlnSW50ZWdlci5wcm90b3R5cGUuREI9ZGJpdHM7QmlnSW50ZWdlci5wcm90b3R5cGUuRE09KDE8PGRiaXRzKS0xO0JpZ0ludGVnZXIucHJvdG90eXBlLkRWPTE8PGRiaXRzO3ZhciBCSV9GUD01MjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5GVj1NYXRoLnBvdygyLEJJX0ZQKTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5GMT1CSV9GUC1kYml0cztCaWdJbnRlZ2VyLnByb3RvdHlwZS5GMj0yKmRiaXRzLUJJX0ZQO3ZhciBCSV9STT0iMDEyMzQ1Njc4OWFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Ijt2YXIgQklfUkM9bmV3IEFycmF5O3ZhciBycix2djtycj0iMCIuY2hhckNvZGVBdCgwKTtmb3IodnY9MDt2djw9OTsrK3Z2KUJJX1JDW3JyKytdPXZ2O3JyPSJhIi5jaGFyQ29kZUF0KDApO2Zvcih2dj0xMDt2djwzNjsrK3Z2KUJJX1JDW3JyKytdPXZ2O3JyPSJBIi5jaGFyQ29kZUF0KDApO2Zvcih2dj0xMDt2djwzNjsrK3Z2KUJJX1JDW3JyKytdPXZ2O2Z1bmN0aW9uIGludDJjaGFyKG4pe3JldHVybiBCSV9STS5jaGFyQXQobil9ZnVuY3Rpb24gaW50QXQocyxpKXt2YXIgYz1CSV9SQ1tzLmNoYXJDb2RlQXQoaSldO3JldHVybiBjPT1udWxsPy0xOmN9ZnVuY3Rpb24gYm5wQ29weVRvKHIpe2Zvcih2YXIgaT10aGlzLnQtMTtpPj0wOy0taSlyW2ldPXRoaXNbaV07ci50PXRoaXMudDtyLnM9dGhpcy5zfWZ1bmN0aW9uIGJucEZyb21JbnQoeCl7dGhpcy50PTE7dGhpcy5zPXg8MD8tMTowO2lmKHg+MCl0aGlzWzBdPXg7ZWxzZSBpZih4PC0xKXRoaXNbMF09eCtEVjtlbHNlIHRoaXMudD0wfWZ1bmN0aW9uIG5idihpKXt2YXIgcj1uYmkoKTtyLmZyb21JbnQoaSk7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5wRnJvbVN0cmluZyhkYXRhLHJhZGl4LHVuc2lnbmVkKXt2YXIgaztzd2l0Y2gocmFkaXgpe2Nhc2UgMjprPTE7YnJlYWs7Y2FzZSA0Oms9MjticmVhaztjYXNlIDg6az0zO2JyZWFrO2Nhc2UgMTY6az00O2JyZWFrO2Nhc2UgMzI6az01O2JyZWFrO2Nhc2UgMjU2Oms9ODticmVhaztkZWZhdWx0OnRoaXMuZnJvbVJhZGl4KGRhdGEscmFkaXgpO3JldHVybn10aGlzLnQ9MDt0aGlzLnM9MDt2YXIgaT1kYXRhLmxlbmd0aDt2YXIgbWk9ZmFsc2U7dmFyIHNoPTA7d2hpbGUoLS1pPj0wKXt2YXIgeD1rPT04P2RhdGFbaV0mMjU1OmludEF0KGRhdGEsaSk7aWYoeDwwKXtpZihkYXRhLmNoYXJBdChpKT09Ii0iKW1pPXRydWU7Y29udGludWV9bWk9ZmFsc2U7aWYoc2g9PT0wKXRoaXNbdGhpcy50KytdPXg7ZWxzZSBpZihzaCtrPnRoaXMuREIpe3RoaXNbdGhpcy50LTFdfD0oeCYoMTw8dGhpcy5EQi1zaCktMSk8PHNoO3RoaXNbdGhpcy50KytdPXg+PnRoaXMuREItc2h9ZWxzZSB0aGlzW3RoaXMudC0xXXw9eDw8c2g7c2grPWs7aWYoc2g+PXRoaXMuREIpc2gtPXRoaXMuREJ9aWYoIXVuc2lnbmVkJiZrPT04JiYoZGF0YVswXSYxMjgpIT0wKXt0aGlzLnM9LTE7aWYoc2g+MCl0aGlzW3RoaXMudC0xXXw9KDE8PHRoaXMuREItc2gpLTE8PHNofXRoaXMuY2xhbXAoKTtpZihtaSlCaWdJbnRlZ2VyLlpFUk8uc3ViVG8odGhpcyx0aGlzKX1mdW5jdGlvbiBibnBGcm9tQnl0ZUFycmF5KGEsdW5zaWduZWQpe3RoaXMuZnJvbVN0cmluZyhhLDI1Nix1bnNpZ25lZCl9ZnVuY3Rpb24gYm5wRnJvbUJ1ZmZlcihhKXt0aGlzLmZyb21TdHJpbmcoYSwyNTYsdHJ1ZSl9ZnVuY3Rpb24gYm5wQ2xhbXAoKXt2YXIgYz10aGlzLnMmdGhpcy5ETTt3aGlsZSh0aGlzLnQ+MCYmdGhpc1t0aGlzLnQtMV09PWMpLS10aGlzLnR9ZnVuY3Rpb24gYm5Ub1N0cmluZyhiKXtpZih0aGlzLnM8MClyZXR1cm4iLSIrdGhpcy5uZWdhdGUoKS50b1N0cmluZyhiKTt2YXIgaztpZihiPT0xNilrPTQ7ZWxzZSBpZihiPT04KWs9MztlbHNlIGlmKGI9PTIpaz0xO2Vsc2UgaWYoYj09MzIpaz01O2Vsc2UgaWYoYj09NClrPTI7ZWxzZSByZXR1cm4gdGhpcy50b1JhZGl4KGIpO3ZhciBrbT0oMTw8ayktMSxkLG09ZmFsc2Uscj0iIixpPXRoaXMudDt2YXIgcD10aGlzLkRCLWkqdGhpcy5EQiVrO2lmKGktLSA+MCl7aWYocDx0aGlzLkRCJiYoZD10aGlzW2ldPj5wKT4wKXttPXRydWU7cj1pbnQyY2hhcihkKX13aGlsZShpPj0wKXtpZihwPGspe2Q9KHRoaXNbaV0mKDE8PHApLTEpPDxrLXA7ZHw9dGhpc1stLWldPj4ocCs9dGhpcy5EQi1rKX1lbHNle2Q9dGhpc1tpXT4+KHAtPWspJmttO2lmKHA8PTApe3ArPXRoaXMuREI7LS1pfX1pZihkPjApbT10cnVlO2lmKG0pcis9aW50MmNoYXIoZCl9fXJldHVybiBtP3I6IjAifWZ1bmN0aW9uIGJuTmVnYXRlKCl7dmFyIHI9bmJpKCk7QmlnSW50ZWdlci5aRVJPLnN1YlRvKHRoaXMscik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5BYnMoKXtyZXR1cm4gdGhpcy5zPDA/dGhpcy5uZWdhdGUoKTp0aGlzfWZ1bmN0aW9uIGJuQ29tcGFyZVRvKGEpe3ZhciByPXRoaXMucy1hLnM7aWYociE9MClyZXR1cm4gcjt2YXIgaT10aGlzLnQ7cj1pLWEudDtpZihyIT0wKXJldHVybiB0aGlzLnM8MD8tcjpyO3doaWxlKC0taT49MClpZigocj10aGlzW2ldLWFbaV0pIT0wKXJldHVybiByO3JldHVybiAwfWZ1bmN0aW9uIG5iaXRzKHgpe3ZhciByPTEsdDtpZigodD14Pj4+MTYpIT0wKXt4PXQ7cis9MTZ9aWYoKHQ9eD4+OCkhPTApe3g9dDtyKz04fWlmKCh0PXg+PjQpIT0wKXt4PXQ7cis9NH1pZigodD14Pj4yKSE9MCl7eD10O3IrPTJ9aWYoKHQ9eD4+MSkhPTApe3g9dDtyKz0xfXJldHVybiByfWZ1bmN0aW9uIGJuQml0TGVuZ3RoKCl7aWYodGhpcy50PD0wKXJldHVybiAwO3JldHVybiB0aGlzLkRCKih0aGlzLnQtMSkrbmJpdHModGhpc1t0aGlzLnQtMV1edGhpcy5zJnRoaXMuRE0pfWZ1bmN0aW9uIGJucERMU2hpZnRUbyhuLHIpe3ZhciBpO2ZvcihpPXRoaXMudC0xO2k+PTA7LS1pKXJbaStuXT10aGlzW2ldO2ZvcihpPW4tMTtpPj0wOy0taSlyW2ldPTA7ci50PXRoaXMudCtuO3Iucz10aGlzLnN9ZnVuY3Rpb24gYm5wRFJTaGlmdFRvKG4scil7Zm9yKHZhciBpPW47aTx0aGlzLnQ7KytpKXJbaS1uXT10aGlzW2ldO3IudD1NYXRoLm1heCh0aGlzLnQtbiwwKTtyLnM9dGhpcy5zfWZ1bmN0aW9uIGJucExTaGlmdFRvKG4scil7dmFyIGJzPW4ldGhpcy5EQjt2YXIgY2JzPXRoaXMuREItYnM7dmFyIGJtPSgxPDxjYnMpLTE7dmFyIGRzPU1hdGguZmxvb3Iobi90aGlzLkRCKSxjPXRoaXMuczw8YnMmdGhpcy5ETSxpO2ZvcihpPXRoaXMudC0xO2k+PTA7LS1pKXtyW2krZHMrMV09dGhpc1tpXT4+Y2JzfGM7Yz0odGhpc1tpXSZibSk8PGJzfWZvcihpPWRzLTE7aT49MDstLWkpcltpXT0wO3JbZHNdPWM7ci50PXRoaXMudCtkcysxO3Iucz10aGlzLnM7ci5jbGFtcCgpfWZ1bmN0aW9uIGJucFJTaGlmdFRvKG4scil7ci5zPXRoaXMuczt2YXIgZHM9TWF0aC5mbG9vcihuL3RoaXMuREIpO2lmKGRzPj10aGlzLnQpe3IudD0wO3JldHVybn12YXIgYnM9biV0aGlzLkRCO3ZhciBjYnM9dGhpcy5EQi1iczt2YXIgYm09KDE8PGJzKS0xO3JbMF09dGhpc1tkc10+PmJzO2Zvcih2YXIgaT1kcysxO2k8dGhpcy50OysraSl7cltpLWRzLTFdfD0odGhpc1tpXSZibSk8PGNicztyW2ktZHNdPXRoaXNbaV0+PmJzfWlmKGJzPjApclt0aGlzLnQtZHMtMV18PSh0aGlzLnMmYm0pPDxjYnM7ci50PXRoaXMudC1kcztyLmNsYW1wKCl9ZnVuY3Rpb24gYm5wU3ViVG8oYSxyKXt2YXIgaT0wLGM9MCxtPU1hdGgubWluKGEudCx0aGlzLnQpO3doaWxlKGk8bSl7Yys9dGhpc1tpXS1hW2ldO3JbaSsrXT1jJnRoaXMuRE07Yz4+PXRoaXMuREJ9aWYoYS50PHRoaXMudCl7Yy09YS5zO3doaWxlKGk8dGhpcy50KXtjKz10aGlzW2ldO3JbaSsrXT1jJnRoaXMuRE07Yz4+PXRoaXMuREJ9Yys9dGhpcy5zfWVsc2V7Yys9dGhpcy5zO3doaWxlKGk8YS50KXtjLT1hW2ldO3JbaSsrXT1jJnRoaXMuRE07Yz4+PXRoaXMuREJ9Yy09YS5zfXIucz1jPDA/LTE6MDtpZihjPC0xKXJbaSsrXT10aGlzLkRWK2M7ZWxzZSBpZihjPjApcltpKytdPWM7ci50PWk7ci5jbGFtcCgpfWZ1bmN0aW9uIGJucE11bHRpcGx5VG8oYSxyKXt2YXIgeD10aGlzLmFicygpLHk9YS5hYnMoKTt2YXIgaT14LnQ7ci50PWkreS50O3doaWxlKC0taT49MClyW2ldPTA7Zm9yKGk9MDtpPHkudDsrK2kpcltpK3gudF09eC5hbSgwLHlbaV0scixpLDAseC50KTtyLnM9MDtyLmNsYW1wKCk7aWYodGhpcy5zIT1hLnMpQmlnSW50ZWdlci5aRVJPLnN1YlRvKHIscil9ZnVuY3Rpb24gYm5wU3F1YXJlVG8ocil7dmFyIHg9dGhpcy5hYnMoKTt2YXIgaT1yLnQ9Mip4LnQ7d2hpbGUoLS1pPj0wKXJbaV09MDtmb3IoaT0wO2k8eC50LTE7KytpKXt2YXIgYz14LmFtKGkseFtpXSxyLDIqaSwwLDEpO2lmKChyW2kreC50XSs9eC5hbShpKzEsMip4W2ldLHIsMippKzEsYyx4LnQtaS0xKSk+PXguRFYpe3JbaSt4LnRdLT14LkRWO3JbaSt4LnQrMV09MX19aWYoci50PjApcltyLnQtMV0rPXguYW0oaSx4W2ldLHIsMippLDAsMSk7ci5zPTA7ci5jbGFtcCgpfWZ1bmN0aW9uIGJucERpdlJlbVRvKG0scSxyKXt2YXIgcG09bS5hYnMoKTtpZihwbS50PD0wKXJldHVybjt2YXIgcHQ9dGhpcy5hYnMoKTtpZihwdC50PHBtLnQpe2lmKHEhPW51bGwpcS5mcm9tSW50KDApO2lmKHIhPW51bGwpdGhpcy5jb3B5VG8ocik7cmV0dXJufWlmKHI9PW51bGwpcj1uYmkoKTt2YXIgeT1uYmkoKSx0cz10aGlzLnMsbXM9bS5zO3ZhciBuc2g9dGhpcy5EQi1uYml0cyhwbVtwbS50LTFdKTtpZihuc2g+MCl7cG0ubFNoaWZ0VG8obnNoLHkpO3B0LmxTaGlmdFRvKG5zaCxyKX1lbHNle3BtLmNvcHlUbyh5KTtwdC5jb3B5VG8ocil9dmFyIHlzPXkudDt2YXIgeTA9eVt5cy0xXTtpZih5MD09PTApcmV0dXJuO3ZhciB5dD15MCooMTw8dGhpcy5GMSkrKHlzPjE/eVt5cy0yXT4+dGhpcy5GMjowKTt2YXIgZDE9dGhpcy5GVi95dCxkMj0oMTw8dGhpcy5GMSkveXQsZT0xPDx0aGlzLkYyO3ZhciBpPXIudCxqPWkteXMsdD1xPT1udWxsP25iaSgpOnE7eS5kbFNoaWZ0VG8oaix0KTtpZihyLmNvbXBhcmVUbyh0KT49MCl7cltyLnQrK109MTtyLnN1YlRvKHQscil9QmlnSW50ZWdlci5PTkUuZGxTaGlmdFRvKHlzLHQpO3Quc3ViVG8oeSx5KTt3aGlsZSh5LnQ8eXMpeVt5LnQrK109MDt3aGlsZSgtLWo+PTApe3ZhciBxZD1yWy0taV09PXkwP3RoaXMuRE06TWF0aC5mbG9vcihyW2ldKmQxKyhyW2ktMV0rZSkqZDIpO2lmKChyW2ldKz15LmFtKDAscWQscixqLDAseXMpKTxxZCl7eS5kbFNoaWZ0VG8oaix0KTtyLnN1YlRvKHQscik7d2hpbGUocltpXTwtLXFkKXIuc3ViVG8odCxyKX19aWYocSE9bnVsbCl7ci5kclNoaWZ0VG8oeXMscSk7aWYodHMhPW1zKUJpZ0ludGVnZXIuWkVSTy5zdWJUbyhxLHEpfXIudD15cztyLmNsYW1wKCk7aWYobnNoPjApci5yU2hpZnRUbyhuc2gscik7aWYodHM8MClCaWdJbnRlZ2VyLlpFUk8uc3ViVG8ocixyKX1mdW5jdGlvbiBibk1vZChhKXt2YXIgcj1uYmkoKTt0aGlzLmFicygpLmRpdlJlbVRvKGEsbnVsbCxyKTtpZih0aGlzLnM8MCYmci5jb21wYXJlVG8oQmlnSW50ZWdlci5aRVJPKT4wKWEuc3ViVG8ocixyKTtyZXR1cm4gcn1mdW5jdGlvbiBDbGFzc2ljKG0pe3RoaXMubT1tfWZ1bmN0aW9uIGNDb252ZXJ0KHgpe2lmKHguczwwfHx4LmNvbXBhcmVUbyh0aGlzLm0pPj0wKXJldHVybiB4Lm1vZCh0aGlzLm0pO2Vsc2UgcmV0dXJuIHh9ZnVuY3Rpb24gY1JldmVydCh4KXtyZXR1cm4geH1mdW5jdGlvbiBjUmVkdWNlKHgpe3guZGl2UmVtVG8odGhpcy5tLG51bGwseCl9ZnVuY3Rpb24gY011bFRvKHgseSxyKXt4Lm11bHRpcGx5VG8oeSxyKTt0aGlzLnJlZHVjZShyKX1mdW5jdGlvbiBjU3FyVG8oeCxyKXt4LnNxdWFyZVRvKHIpO3RoaXMucmVkdWNlKHIpfUNsYXNzaWMucHJvdG90eXBlLmNvbnZlcnQ9Y0NvbnZlcnQ7Q2xhc3NpYy5wcm90b3R5cGUucmV2ZXJ0PWNSZXZlcnQ7Q2xhc3NpYy5wcm90b3R5cGUucmVkdWNlPWNSZWR1Y2U7Q2xhc3NpYy5wcm90b3R5cGUubXVsVG89Y011bFRvO0NsYXNzaWMucHJvdG90eXBlLnNxclRvPWNTcXJUbztmdW5jdGlvbiBibnBJbnZEaWdpdCgpe2lmKHRoaXMudDwxKXJldHVybiAwO3ZhciB4PXRoaXNbMF07aWYoKHgmMSk9PT0wKXJldHVybiAwO3ZhciB5PXgmMzt5PXkqKDItKHgmMTUpKnkpJjE1O3k9eSooMi0oeCYyNTUpKnkpJjI1NTt5PXkqKDItKCh4JjY1NTM1KSp5JjY1NTM1KSkmNjU1MzU7eT15KigyLXgqeSV0aGlzLkRWKSV0aGlzLkRWO3JldHVybiB5PjA/dGhpcy5EVi15Oi15fWZ1bmN0aW9uIE1vbnRnb21lcnkobSl7dGhpcy5tPW07dGhpcy5tcD1tLmludkRpZ2l0KCk7dGhpcy5tcGw9dGhpcy5tcCYzMjc2Nzt0aGlzLm1waD10aGlzLm1wPj4xNTt0aGlzLnVtPSgxPDxtLkRCLTE1KS0xO3RoaXMubXQyPTIqbS50fWZ1bmN0aW9uIG1vbnRDb252ZXJ0KHgpe3ZhciByPW5iaSgpO3guYWJzKCkuZGxTaGlmdFRvKHRoaXMubS50LHIpO3IuZGl2UmVtVG8odGhpcy5tLG51bGwscik7aWYoeC5zPDAmJnIuY29tcGFyZVRvKEJpZ0ludGVnZXIuWkVSTyk+MCl0aGlzLm0uc3ViVG8ocixyKTtyZXR1cm4gcn1mdW5jdGlvbiBtb250UmV2ZXJ0KHgpe3ZhciByPW5iaSgpO3guY29weVRvKHIpO3RoaXMucmVkdWNlKHIpO3JldHVybiByfWZ1bmN0aW9uIG1vbnRSZWR1Y2UoeCl7d2hpbGUoeC50PD10aGlzLm10Mil4W3gudCsrXT0wO2Zvcih2YXIgaT0wO2k8dGhpcy5tLnQ7KytpKXt2YXIgaj14W2ldJjMyNzY3O3ZhciB1MD1qKnRoaXMubXBsKygoaip0aGlzLm1waCsoeFtpXT4+MTUpKnRoaXMubXBsJnRoaXMudW0pPDwxNSkmeC5ETTtqPWkrdGhpcy5tLnQ7eFtqXSs9dGhpcy5tLmFtKDAsdTAseCxpLDAsdGhpcy5tLnQpO3doaWxlKHhbal0+PXguRFYpe3hbal0tPXguRFY7eFsrK2pdKyt9fXguY2xhbXAoKTt4LmRyU2hpZnRUbyh0aGlzLm0udCx4KTtpZih4LmNvbXBhcmVUbyh0aGlzLm0pPj0wKXguc3ViVG8odGhpcy5tLHgpfWZ1bmN0aW9uIG1vbnRTcXJUbyh4LHIpe3guc3F1YXJlVG8ocik7dGhpcy5yZWR1Y2Uocil9ZnVuY3Rpb24gbW9udE11bFRvKHgseSxyKXt4Lm11bHRpcGx5VG8oeSxyKTt0aGlzLnJlZHVjZShyKX1Nb250Z29tZXJ5LnByb3RvdHlwZS5jb252ZXJ0PW1vbnRDb252ZXJ0O01vbnRnb21lcnkucHJvdG90eXBlLnJldmVydD1tb250UmV2ZXJ0O01vbnRnb21lcnkucHJvdG90eXBlLnJlZHVjZT1tb250UmVkdWNlO01vbnRnb21lcnkucHJvdG90eXBlLm11bFRvPW1vbnRNdWxUbztNb250Z29tZXJ5LnByb3RvdHlwZS5zcXJUbz1tb250U3FyVG87ZnVuY3Rpb24gYm5wSXNFdmVuKCl7cmV0dXJuKHRoaXMudD4wP3RoaXNbMF0mMTp0aGlzLnMpPT09MH1mdW5jdGlvbiBibnBFeHAoZSx6KXtpZihlPjQyOTQ5NjcyOTV8fGU8MSlyZXR1cm4gQmlnSW50ZWdlci5PTkU7dmFyIHI9bmJpKCkscjI9bmJpKCksZz16LmNvbnZlcnQodGhpcyksaT1uYml0cyhlKS0xO2cuY29weVRvKHIpO3doaWxlKC0taT49MCl7ei5zcXJUbyhyLHIyKTtpZigoZSYxPDxpKT4wKXoubXVsVG8ocjIsZyxyKTtlbHNle3ZhciB0PXI7cj1yMjtyMj10fX1yZXR1cm4gei5yZXZlcnQocil9ZnVuY3Rpb24gYm5Nb2RQb3dJbnQoZSxtKXt2YXIgejtpZihlPDI1Nnx8bS5pc0V2ZW4oKSl6PW5ldyBDbGFzc2ljKG0pO2Vsc2Ugej1uZXcgTW9udGdvbWVyeShtKTtyZXR1cm4gdGhpcy5leHAoZSx6KX1mdW5jdGlvbiBibkNsb25lKCl7dmFyIHI9bmJpKCk7dGhpcy5jb3B5VG8ocik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5JbnRWYWx1ZSgpe2lmKHRoaXMuczwwKXtpZih0aGlzLnQ9PTEpcmV0dXJuIHRoaXNbMF0tdGhpcy5EVjtlbHNlIGlmKHRoaXMudD09PTApcmV0dXJuLTF9ZWxzZSBpZih0aGlzLnQ9PTEpcmV0dXJuIHRoaXNbMF07ZWxzZSBpZih0aGlzLnQ9PT0wKXJldHVybiAwO3JldHVybih0aGlzWzFdJigxPDwzMi10aGlzLkRCKS0xKTw8dGhpcy5EQnx0aGlzWzBdfWZ1bmN0aW9uIGJuQnl0ZVZhbHVlKCl7cmV0dXJuIHRoaXMudD09MD90aGlzLnM6dGhpc1swXTw8MjQ+PjI0fWZ1bmN0aW9uIGJuU2hvcnRWYWx1ZSgpe3JldHVybiB0aGlzLnQ9PTA/dGhpcy5zOnRoaXNbMF08PDE2Pj4xNn1mdW5jdGlvbiBibnBDaHVua1NpemUocil7cmV0dXJuIE1hdGguZmxvb3IoTWF0aC5MTjIqdGhpcy5EQi9NYXRoLmxvZyhyKSl9ZnVuY3Rpb24gYm5TaWdOdW0oKXtpZih0aGlzLnM8MClyZXR1cm4tMTtlbHNlIGlmKHRoaXMudDw9MHx8dGhpcy50PT0xJiZ0aGlzWzBdPD0wKXJldHVybiAwO2Vsc2UgcmV0dXJuIDF9ZnVuY3Rpb24gYm5wVG9SYWRpeChiKXtpZihiPT1udWxsKWI9MTA7aWYodGhpcy5zaWdudW0oKT09PTB8fGI8Mnx8Yj4zNilyZXR1cm4iMCI7dmFyIGNzPXRoaXMuY2h1bmtTaXplKGIpO3ZhciBhPU1hdGgucG93KGIsY3MpO3ZhciBkPW5idihhKSx5PW5iaSgpLHo9bmJpKCkscj0iIjt0aGlzLmRpdlJlbVRvKGQseSx6KTt3aGlsZSh5LnNpZ251bSgpPjApe3I9KGErei5pbnRWYWx1ZSgpKS50b1N0cmluZyhiKS5zdWJzdHIoMSkrcjt5LmRpdlJlbVRvKGQseSx6KX1yZXR1cm4gei5pbnRWYWx1ZSgpLnRvU3RyaW5nKGIpK3J9ZnVuY3Rpb24gYm5wRnJvbVJhZGl4KHMsYil7dGhpcy5mcm9tSW50KDApO2lmKGI9PW51bGwpYj0xMDt2YXIgY3M9dGhpcy5jaHVua1NpemUoYik7dmFyIGQ9TWF0aC5wb3coYixjcyksbWk9ZmFsc2Usaj0wLHc9MDtmb3IodmFyIGk9MDtpPHMubGVuZ3RoOysraSl7dmFyIHg9aW50QXQocyxpKTtpZih4PDApe2lmKHMuY2hhckF0KGkpPT0iLSImJnRoaXMuc2lnbnVtKCk9PT0wKW1pPXRydWU7Y29udGludWV9dz1iKncreDtpZigrK2o+PWNzKXt0aGlzLmRNdWx0aXBseShkKTt0aGlzLmRBZGRPZmZzZXQodywwKTtqPTA7dz0wfX1pZihqPjApe3RoaXMuZE11bHRpcGx5KE1hdGgucG93KGIsaikpO3RoaXMuZEFkZE9mZnNldCh3LDApfWlmKG1pKUJpZ0ludGVnZXIuWkVSTy5zdWJUbyh0aGlzLHRoaXMpfWZ1bmN0aW9uIGJucEZyb21OdW1iZXIoYSxiKXtpZigibnVtYmVyIj09dHlwZW9mIGIpe2lmKGE8Mil0aGlzLmZyb21JbnQoMSk7ZWxzZXt0aGlzLmZyb21OdW1iZXIoYSk7aWYoIXRoaXMudGVzdEJpdChhLTEpKXRoaXMuYml0d2lzZVRvKEJpZ0ludGVnZXIuT05FLnNoaWZ0TGVmdChhLTEpLG9wX29yLHRoaXMpO2lmKHRoaXMuaXNFdmVuKCkpdGhpcy5kQWRkT2Zmc2V0KDEsMCk7d2hpbGUoIXRoaXMuaXNQcm9iYWJsZVByaW1lKGIpKXt0aGlzLmRBZGRPZmZzZXQoMiwwKTtpZih0aGlzLmJpdExlbmd0aCgpPmEpdGhpcy5zdWJUbyhCaWdJbnRlZ2VyLk9ORS5zaGlmdExlZnQoYS0xKSx0aGlzKX19fWVsc2V7dmFyIHg9Y3J5cHQucmFuZG9tQnl0ZXMoKGE+PjMpKzEpO3ZhciB0PWEmNztpZih0PjApeFswXSY9KDE8PHQpLTE7ZWxzZSB4WzBdPTA7dGhpcy5mcm9tQnl0ZUFycmF5KHgpfX1mdW5jdGlvbiBiblRvQnl0ZUFycmF5KCl7dmFyIGk9dGhpcy50LHI9bmV3IEFycmF5O3JbMF09dGhpcy5zO3ZhciBwPXRoaXMuREItaSp0aGlzLkRCJTgsZCxrPTA7aWYoaS0tID4wKXtpZihwPHRoaXMuREImJihkPXRoaXNbaV0+PnApIT0odGhpcy5zJnRoaXMuRE0pPj5wKXJbaysrXT1kfHRoaXMuczw8dGhpcy5EQi1wO3doaWxlKGk+PTApe2lmKHA8OCl7ZD0odGhpc1tpXSYoMTw8cCktMSk8PDgtcDtkfD10aGlzWy0taV0+PihwKz10aGlzLkRCLTgpfWVsc2V7ZD10aGlzW2ldPj4ocC09OCkmMjU1O2lmKHA8PTApe3ArPXRoaXMuREI7LS1pfX1pZigoZCYxMjgpIT0wKWR8PS0yNTY7aWYoaz09PTAmJih0aGlzLnMmMTI4KSE9KGQmMTI4KSkrK2s7aWYoaz4wfHxkIT10aGlzLnMpcltrKytdPWR9fXJldHVybiByfWZ1bmN0aW9uIGJuVG9CdWZmZXIodHJpbU9yU2l6ZSl7dmFyIHJlcz1CdWZmZXIuZnJvbSh0aGlzLnRvQnl0ZUFycmF5KCkpO2lmKHRyaW1PclNpemU9PT10cnVlJiZyZXNbMF09PT0wKXtyZXM9cmVzLnNsaWNlKDEpfWVsc2UgaWYoXy5pc051bWJlcih0cmltT3JTaXplKSl7aWYocmVzLmxlbmd0aD50cmltT3JTaXplKXtmb3IodmFyIGk9MDtpPHJlcy5sZW5ndGgtdHJpbU9yU2l6ZTtpKyspe2lmKHJlc1tpXSE9PTApe3JldHVybiBudWxsfX1yZXR1cm4gcmVzLnNsaWNlKHJlcy5sZW5ndGgtdHJpbU9yU2l6ZSl9ZWxzZSBpZihyZXMubGVuZ3RoPHRyaW1PclNpemUpe3ZhciBwYWRkZWQ9QnVmZmVyLmFsbG9jKHRyaW1PclNpemUpO3BhZGRlZC5maWxsKDAsMCx0cmltT3JTaXplLXJlcy5sZW5ndGgpO3Jlcy5jb3B5KHBhZGRlZCx0cmltT3JTaXplLXJlcy5sZW5ndGgpO3JldHVybiBwYWRkZWR9fXJldHVybiByZXN9ZnVuY3Rpb24gYm5FcXVhbHMoYSl7cmV0dXJuIHRoaXMuY29tcGFyZVRvKGEpPT0wfWZ1bmN0aW9uIGJuTWluKGEpe3JldHVybiB0aGlzLmNvbXBhcmVUbyhhKTwwP3RoaXM6YX1mdW5jdGlvbiBibk1heChhKXtyZXR1cm4gdGhpcy5jb21wYXJlVG8oYSk+MD90aGlzOmF9ZnVuY3Rpb24gYm5wQml0d2lzZVRvKGEsb3Ascil7dmFyIGksZixtPU1hdGgubWluKGEudCx0aGlzLnQpO2ZvcihpPTA7aTxtOysraSlyW2ldPW9wKHRoaXNbaV0sYVtpXSk7aWYoYS50PHRoaXMudCl7Zj1hLnMmdGhpcy5ETTtmb3IoaT1tO2k8dGhpcy50OysraSlyW2ldPW9wKHRoaXNbaV0sZik7ci50PXRoaXMudH1lbHNle2Y9dGhpcy5zJnRoaXMuRE07Zm9yKGk9bTtpPGEudDsrK2kpcltpXT1vcChmLGFbaV0pO3IudD1hLnR9ci5zPW9wKHRoaXMucyxhLnMpO3IuY2xhbXAoKX1mdW5jdGlvbiBvcF9hbmQoeCx5KXtyZXR1cm4geCZ5fWZ1bmN0aW9uIGJuQW5kKGEpe3ZhciByPW5iaSgpO3RoaXMuYml0d2lzZVRvKGEsb3BfYW5kLHIpO3JldHVybiByfWZ1bmN0aW9uIG9wX29yKHgseSl7cmV0dXJuIHh8eX1mdW5jdGlvbiBibk9yKGEpe3ZhciByPW5iaSgpO3RoaXMuYml0d2lzZVRvKGEsb3Bfb3Iscik7cmV0dXJuIHJ9ZnVuY3Rpb24gb3BfeG9yKHgseSl7cmV0dXJuIHheeX1mdW5jdGlvbiBiblhvcihhKXt2YXIgcj1uYmkoKTt0aGlzLmJpdHdpc2VUbyhhLG9wX3hvcixyKTtyZXR1cm4gcn1mdW5jdGlvbiBvcF9hbmRub3QoeCx5KXtyZXR1cm4geCZ+eX1mdW5jdGlvbiBibkFuZE5vdChhKXt2YXIgcj1uYmkoKTt0aGlzLmJpdHdpc2VUbyhhLG9wX2FuZG5vdCxyKTtyZXR1cm4gcn1mdW5jdGlvbiBibk5vdCgpe3ZhciByPW5iaSgpO2Zvcih2YXIgaT0wO2k8dGhpcy50OysraSlyW2ldPXRoaXMuRE0mfnRoaXNbaV07ci50PXRoaXMudDtyLnM9fnRoaXMucztyZXR1cm4gcn1mdW5jdGlvbiBiblNoaWZ0TGVmdChuKXt2YXIgcj1uYmkoKTtpZihuPDApdGhpcy5yU2hpZnRUbygtbixyKTtlbHNlIHRoaXMubFNoaWZ0VG8obixyKTtyZXR1cm4gcn1mdW5jdGlvbiBiblNoaWZ0UmlnaHQobil7dmFyIHI9bmJpKCk7aWYobjwwKXRoaXMubFNoaWZ0VG8oLW4scik7ZWxzZSB0aGlzLnJTaGlmdFRvKG4scik7cmV0dXJuIHJ9ZnVuY3Rpb24gbGJpdCh4KXtpZih4PT09MClyZXR1cm4tMTt2YXIgcj0wO2lmKCh4JjY1NTM1KT09PTApe3g+Pj0xNjtyKz0xNn1pZigoeCYyNTUpPT09MCl7eD4+PTg7cis9OH1pZigoeCYxNSk9PT0wKXt4Pj49NDtyKz00fWlmKCh4JjMpPT09MCl7eD4+PTI7cis9Mn1pZigoeCYxKT09PTApKytyO3JldHVybiByfWZ1bmN0aW9uIGJuR2V0TG93ZXN0U2V0Qml0KCl7Zm9yKHZhciBpPTA7aTx0aGlzLnQ7KytpKWlmKHRoaXNbaV0hPTApcmV0dXJuIGkqdGhpcy5EQitsYml0KHRoaXNbaV0pO2lmKHRoaXMuczwwKXJldHVybiB0aGlzLnQqdGhpcy5EQjtyZXR1cm4tMX1mdW5jdGlvbiBjYml0KHgpe3ZhciByPTA7d2hpbGUoeCE9MCl7eCY9eC0xOysrcn1yZXR1cm4gcn1mdW5jdGlvbiBibkJpdENvdW50KCl7dmFyIHI9MCx4PXRoaXMucyZ0aGlzLkRNO2Zvcih2YXIgaT0wO2k8dGhpcy50OysraSlyKz1jYml0KHRoaXNbaV1eeCk7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5UZXN0Qml0KG4pe3ZhciBqPU1hdGguZmxvb3Iobi90aGlzLkRCKTtpZihqPj10aGlzLnQpcmV0dXJuIHRoaXMucyE9MDtyZXR1cm4odGhpc1tqXSYxPDxuJXRoaXMuREIpIT0wfWZ1bmN0aW9uIGJucENoYW5nZUJpdChuLG9wKXt2YXIgcj1CaWdJbnRlZ2VyLk9ORS5zaGlmdExlZnQobik7dGhpcy5iaXR3aXNlVG8ocixvcCxyKTtyZXR1cm4gcn1mdW5jdGlvbiBiblNldEJpdChuKXtyZXR1cm4gdGhpcy5jaGFuZ2VCaXQobixvcF9vcil9ZnVuY3Rpb24gYm5DbGVhckJpdChuKXtyZXR1cm4gdGhpcy5jaGFuZ2VCaXQobixvcF9hbmRub3QpfWZ1bmN0aW9uIGJuRmxpcEJpdChuKXtyZXR1cm4gdGhpcy5jaGFuZ2VCaXQobixvcF94b3IpfWZ1bmN0aW9uIGJucEFkZFRvKGEscil7dmFyIGk9MCxjPTAsbT1NYXRoLm1pbihhLnQsdGhpcy50KTt3aGlsZShpPG0pe2MrPXRoaXNbaV0rYVtpXTtyW2krK109YyZ0aGlzLkRNO2M+Pj10aGlzLkRCfWlmKGEudDx0aGlzLnQpe2MrPWEuczt3aGlsZShpPHRoaXMudCl7Yys9dGhpc1tpXTtyW2krK109YyZ0aGlzLkRNO2M+Pj10aGlzLkRCfWMrPXRoaXMuc31lbHNle2MrPXRoaXMuczt3aGlsZShpPGEudCl7Yys9YVtpXTtyW2krK109YyZ0aGlzLkRNO2M+Pj10aGlzLkRCfWMrPWEuc31yLnM9YzwwPy0xOjA7aWYoYz4wKXJbaSsrXT1jO2Vsc2UgaWYoYzwtMSlyW2krK109dGhpcy5EVitjO3IudD1pO3IuY2xhbXAoKX1mdW5jdGlvbiBibkFkZChhKXt2YXIgcj1uYmkoKTt0aGlzLmFkZFRvKGEscik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5TdWJ0cmFjdChhKXt2YXIgcj1uYmkoKTt0aGlzLnN1YlRvKGEscik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5NdWx0aXBseShhKXt2YXIgcj1uYmkoKTt0aGlzLm11bHRpcGx5VG8oYSxyKTtyZXR1cm4gcn1mdW5jdGlvbiBiblNxdWFyZSgpe3ZhciByPW5iaSgpO3RoaXMuc3F1YXJlVG8ocik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5EaXZpZGUoYSl7dmFyIHI9bmJpKCk7dGhpcy5kaXZSZW1UbyhhLHIsbnVsbCk7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5SZW1haW5kZXIoYSl7dmFyIHI9bmJpKCk7dGhpcy5kaXZSZW1UbyhhLG51bGwscik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5EaXZpZGVBbmRSZW1haW5kZXIoYSl7dmFyIHE9bmJpKCkscj1uYmkoKTt0aGlzLmRpdlJlbVRvKGEscSxyKTtyZXR1cm4gbmV3IEFycmF5KHEscil9ZnVuY3Rpb24gYm5wRE11bHRpcGx5KG4pe3RoaXNbdGhpcy50XT10aGlzLmFtKDAsbi0xLHRoaXMsMCwwLHRoaXMudCk7Kyt0aGlzLnQ7dGhpcy5jbGFtcCgpfWZ1bmN0aW9uIGJucERBZGRPZmZzZXQobix3KXtpZihuPT09MClyZXR1cm47d2hpbGUodGhpcy50PD13KXRoaXNbdGhpcy50KytdPTA7dGhpc1t3XSs9bjt3aGlsZSh0aGlzW3ddPj10aGlzLkRWKXt0aGlzW3ddLT10aGlzLkRWO2lmKCsrdz49dGhpcy50KXRoaXNbdGhpcy50KytdPTA7Kyt0aGlzW3ddfX1mdW5jdGlvbiBOdWxsRXhwKCl7fWZ1bmN0aW9uIG5Ob3AoeCl7cmV0dXJuIHh9ZnVuY3Rpb24gbk11bFRvKHgseSxyKXt4Lm11bHRpcGx5VG8oeSxyKX1mdW5jdGlvbiBuU3FyVG8oeCxyKXt4LnNxdWFyZVRvKHIpfU51bGxFeHAucHJvdG90eXBlLmNvbnZlcnQ9bk5vcDtOdWxsRXhwLnByb3RvdHlwZS5yZXZlcnQ9bk5vcDtOdWxsRXhwLnByb3RvdHlwZS5tdWxUbz1uTXVsVG87TnVsbEV4cC5wcm90b3R5cGUuc3FyVG89blNxclRvO2Z1bmN0aW9uIGJuUG93KGUpe3JldHVybiB0aGlzLmV4cChlLG5ldyBOdWxsRXhwKX1mdW5jdGlvbiBibnBNdWx0aXBseUxvd2VyVG8oYSxuLHIpe3ZhciBpPU1hdGgubWluKHRoaXMudCthLnQsbik7ci5zPTA7ci50PWk7d2hpbGUoaT4wKXJbLS1pXT0wO3ZhciBqO2ZvcihqPXIudC10aGlzLnQ7aTxqOysraSlyW2krdGhpcy50XT10aGlzLmFtKDAsYVtpXSxyLGksMCx0aGlzLnQpO2ZvcihqPU1hdGgubWluKGEudCxuKTtpPGo7KytpKXRoaXMuYW0oMCxhW2ldLHIsaSwwLG4taSk7ci5jbGFtcCgpfWZ1bmN0aW9uIGJucE11bHRpcGx5VXBwZXJUbyhhLG4scil7LS1uO3ZhciBpPXIudD10aGlzLnQrYS50LW47ci5zPTA7d2hpbGUoLS1pPj0wKXJbaV09MDtmb3IoaT1NYXRoLm1heChuLXRoaXMudCwwKTtpPGEudDsrK2kpclt0aGlzLnQraS1uXT10aGlzLmFtKG4taSxhW2ldLHIsMCwwLHRoaXMudCtpLW4pO3IuY2xhbXAoKTtyLmRyU2hpZnRUbygxLHIpfWZ1bmN0aW9uIEJhcnJldHQobSl7dGhpcy5yMj1uYmkoKTt0aGlzLnEzPW5iaSgpO0JpZ0ludGVnZXIuT05FLmRsU2hpZnRUbygyKm0udCx0aGlzLnIyKTt0aGlzLm11PXRoaXMucjIuZGl2aWRlKG0pO3RoaXMubT1tfWZ1bmN0aW9uIGJhcnJldHRDb252ZXJ0KHgpe2lmKHguczwwfHx4LnQ+Mip0aGlzLm0udClyZXR1cm4geC5tb2QodGhpcy5tKTtlbHNlIGlmKHguY29tcGFyZVRvKHRoaXMubSk8MClyZXR1cm4geDtlbHNle3ZhciByPW5iaSgpO3guY29weVRvKHIpO3RoaXMucmVkdWNlKHIpO3JldHVybiByfX1mdW5jdGlvbiBiYXJyZXR0UmV2ZXJ0KHgpe3JldHVybiB4fWZ1bmN0aW9uIGJhcnJldHRSZWR1Y2UoeCl7eC5kclNoaWZ0VG8odGhpcy5tLnQtMSx0aGlzLnIyKTtpZih4LnQ+dGhpcy5tLnQrMSl7eC50PXRoaXMubS50KzE7eC5jbGFtcCgpfXRoaXMubXUubXVsdGlwbHlVcHBlclRvKHRoaXMucjIsdGhpcy5tLnQrMSx0aGlzLnEzKTt0aGlzLm0ubXVsdGlwbHlMb3dlclRvKHRoaXMucTMsdGhpcy5tLnQrMSx0aGlzLnIyKTt3aGlsZSh4LmNvbXBhcmVUbyh0aGlzLnIyKTwwKXguZEFkZE9mZnNldCgxLHRoaXMubS50KzEpO3guc3ViVG8odGhpcy5yMix4KTt3aGlsZSh4LmNvbXBhcmVUbyh0aGlzLm0pPj0wKXguc3ViVG8odGhpcy5tLHgpfWZ1bmN0aW9uIGJhcnJldHRTcXJUbyh4LHIpe3guc3F1YXJlVG8ocik7dGhpcy5yZWR1Y2Uocil9ZnVuY3Rpb24gYmFycmV0dE11bFRvKHgseSxyKXt4Lm11bHRpcGx5VG8oeSxyKTt0aGlzLnJlZHVjZShyKX1CYXJyZXR0LnByb3RvdHlwZS5jb252ZXJ0PWJhcnJldHRDb252ZXJ0O0JhcnJldHQucHJvdG90eXBlLnJldmVydD1iYXJyZXR0UmV2ZXJ0O0JhcnJldHQucHJvdG90eXBlLnJlZHVjZT1iYXJyZXR0UmVkdWNlO0JhcnJldHQucHJvdG90eXBlLm11bFRvPWJhcnJldHRNdWxUbztCYXJyZXR0LnByb3RvdHlwZS5zcXJUbz1iYXJyZXR0U3FyVG87ZnVuY3Rpb24gYm5Nb2RQb3coZSxtKXtyZXR1cm4gZ2V0T3B0aW1hbEltcGwoKS5hcHBseSh0aGlzLFtlLG1dKX1CaWdJbnRlZ2VyLm1vZFBvd0ltcGw9dW5kZWZpbmVkO0JpZ0ludGVnZXIuc2V0TW9kUG93SW1wbD1mdW5jdGlvbihhdXRob3JOYW1lKXtCaWdJbnRlZ2VyLm1vZFBvd0ltcGw9ZnVuY3Rpb24oKXtzd2l0Y2goYXV0aG9yTmFtZSl7Y2FzZSJQZXRlciBPbHNvbiI6cmV0dXJuIGJuTW9kUG93X3BldGVyT2xzb247Y2FzZSJUb20gV3UiOnJldHVybiBibk1vZFBvd190b21XdX19KCl9O3ZhciBnZXRPcHRpbWFsSW1wbD1mdW5jdGlvbigpe3t2YXIgcmVzdWx0PUJpZ0ludGVnZXIubW9kUG93SW1wbDtpZihyZXN1bHQhPT11bmRlZmluZWQpe3JldHVybiByZXN1bHR9fXZhciB4PW5ldyBCaWdJbnRlZ2VyKCI0MzMzMzcwNzkyMzAwODM5MjE0ODgwNzgzNjQ3NTYwIiwxMCk7dmFyIGU9bmV3IEJpZ0ludGVnZXIoIjM3MDc5MjMwMDgzOTIxNDg4MDc4MzY0NzU2MDk0MTkiLDEwKTt2YXIgbT1uZXcgQmlnSW50ZWdlcigiMTQ4MzE2OTIwMzM1Njg1OTUyMzEzNDU5MDI0Mzc2MCIsMTApO3ZhciBzdGFydD1EYXRlLm5vdygpO2JuTW9kUG93X3BldGVyT2xzb24uYXBwbHkoeCxbZSxtXSk7dmFyIGR1cmF0aW9uUGV0ZXJPbHNvbj1EYXRlLm5vdygpLXN0YXJ0O3N0YXJ0PURhdGUubm93KCk7Ym5Nb2RQb3dfdG9tV3UuYXBwbHkoeCxbZSxtXSk7dmFyIGR1cmF0aW9uVG9tV3U9RGF0ZS5ub3coKS1zdGFydDtCaWdJbnRlZ2VyLm1vZFBvd0ltcGw9ZHVyYXRpb25QZXRlck9sc29uPGR1cmF0aW9uVG9tV3U/Ym5Nb2RQb3dfcGV0ZXJPbHNvbjpibk1vZFBvd190b21XdTtyZXR1cm4gZ2V0T3B0aW1hbEltcGwoKX07ZnVuY3Rpb24gYm5Nb2RQb3dfcGV0ZXJPbHNvbihlLG0pe3ZhciBwb1RoaXM9cGV0ZXJPbHNvbl9CaWdJbnRlZ2VyU3RhdGljKHRoaXMudG9TdHJpbmcoMTApLDEwKTt2YXIgcG9FPXBldGVyT2xzb25fQmlnSW50ZWdlclN0YXRpYyhlLnRvU3RyaW5nKDEwKSwxMCk7dmFyIHBvTT1wZXRlck9sc29uX0JpZ0ludGVnZXJTdGF0aWMobS50b1N0cmluZygxMCksMTApO3ZhciBwb091dD1wb1RoaXMubW9kUG93KHBvRSxwb00pO3ZhciBvdXQ9bmV3IEJpZ0ludGVnZXIocG9PdXQudG9TdHJpbmcoMTApLDEwKTtyZXR1cm4gb3V0fWZ1bmN0aW9uIGJuTW9kUG93X3RvbVd1KGUsbSl7dmFyIGk9ZS5iaXRMZW5ndGgoKSxrLHI9bmJ2KDEpLHo7aWYoaTw9MClyZXR1cm4gcjtlbHNlIGlmKGk8MTgpaz0xO2Vsc2UgaWYoaTw0OClrPTM7ZWxzZSBpZihpPDE0NClrPTQ7ZWxzZSBpZihpPDc2OClrPTU7ZWxzZSBrPTY7aWYoaTw4KXo9bmV3IENsYXNzaWMobSk7ZWxzZSBpZihtLmlzRXZlbigpKXo9bmV3IEJhcnJldHQobSk7ZWxzZSB6PW5ldyBNb250Z29tZXJ5KG0pO3ZhciBnPW5ldyBBcnJheSxuPTMsazE9ay0xLGttPSgxPDxrKS0xO2dbMV09ei5jb252ZXJ0KHRoaXMpO2lmKGs+MSl7dmFyIGcyPW5iaSgpO3ouc3FyVG8oZ1sxXSxnMik7d2hpbGUobjw9a20pe2dbbl09bmJpKCk7ei5tdWxUbyhnMixnW24tMl0sZ1tuXSk7bis9Mn19dmFyIGo9ZS50LTEsdyxpczE9dHJ1ZSxyMj1uYmkoKSx0O2k9bmJpdHMoZVtqXSktMTt3aGlsZShqPj0wKXtpZihpPj1rMSl3PWVbal0+PmktazEma207ZWxzZXt3PShlW2pdJigxPDxpKzEpLTEpPDxrMS1pO2lmKGo+MCl3fD1lW2otMV0+PnRoaXMuREIraS1rMX1uPWs7d2hpbGUoKHcmMSk9PT0wKXt3Pj49MTstLW59aWYoKGktPW4pPDApe2krPXRoaXMuREI7LS1qfWlmKGlzMSl7Z1t3XS5jb3B5VG8ocik7aXMxPWZhbHNlfWVsc2V7d2hpbGUobj4xKXt6LnNxclRvKHIscjIpO3ouc3FyVG8ocjIscik7bi09Mn1pZihuPjApei5zcXJUbyhyLHIyKTtlbHNle3Q9cjtyPXIyO3IyPXR9ei5tdWxUbyhyMixnW3ddLHIpfXdoaWxlKGo+PTAmJihlW2pdJjE8PGkpPT09MCl7ei5zcXJUbyhyLHIyKTt0PXI7cj1yMjtyMj10O2lmKC0taTwwKXtpPXRoaXMuREItMTstLWp9fX1yZXR1cm4gei5yZXZlcnQocil9ZnVuY3Rpb24gYm5HQ0QoYSl7dmFyIHg9dGhpcy5zPDA/dGhpcy5uZWdhdGUoKTp0aGlzLmNsb25lKCk7dmFyIHk9YS5zPDA/YS5uZWdhdGUoKTphLmNsb25lKCk7aWYoeC5jb21wYXJlVG8oeSk8MCl7dmFyIHQ9eDt4PXk7eT10fXZhciBpPXguZ2V0TG93ZXN0U2V0Qml0KCksZz15LmdldExvd2VzdFNldEJpdCgpO2lmKGc8MClyZXR1cm4geDtpZihpPGcpZz1pO2lmKGc+MCl7eC5yU2hpZnRUbyhnLHgpO3kuclNoaWZ0VG8oZyx5KX13aGlsZSh4LnNpZ251bSgpPjApe2lmKChpPXguZ2V0TG93ZXN0U2V0Qml0KCkpPjApeC5yU2hpZnRUbyhpLHgpO2lmKChpPXkuZ2V0TG93ZXN0U2V0Qml0KCkpPjApeS5yU2hpZnRUbyhpLHkpO2lmKHguY29tcGFyZVRvKHkpPj0wKXt4LnN1YlRvKHkseCk7eC5yU2hpZnRUbygxLHgpfWVsc2V7eS5zdWJUbyh4LHkpO3kuclNoaWZ0VG8oMSx5KX19aWYoZz4wKXkubFNoaWZ0VG8oZyx5KTtyZXR1cm4geX1mdW5jdGlvbiBibnBNb2RJbnQobil7aWYobjw9MClyZXR1cm4gMDt2YXIgZD10aGlzLkRWJW4scj10aGlzLnM8MD9uLTE6MDtpZih0aGlzLnQ+MClpZihkPT09MClyPXRoaXNbMF0lbjtlbHNlIGZvcih2YXIgaT10aGlzLnQtMTtpPj0wOy0taSlyPShkKnIrdGhpc1tpXSklbjtyZXR1cm4gcn1mdW5jdGlvbiBibk1vZEludmVyc2UobSl7dmFyIGFjPW0uaXNFdmVuKCk7aWYodGhpcy5pc0V2ZW4oKSYmYWN8fG0uc2lnbnVtKCk9PT0wKXJldHVybiBCaWdJbnRlZ2VyLlpFUk87dmFyIHU9bS5jbG9uZSgpLHY9dGhpcy5jbG9uZSgpO3ZhciBhPW5idigxKSxiPW5idigwKSxjPW5idigwKSxkPW5idigxKTt3aGlsZSh1LnNpZ251bSgpIT0wKXt3aGlsZSh1LmlzRXZlbigpKXt1LnJTaGlmdFRvKDEsdSk7aWYoYWMpe2lmKCFhLmlzRXZlbigpfHwhYi5pc0V2ZW4oKSl7YS5hZGRUbyh0aGlzLGEpO2Iuc3ViVG8obSxiKX1hLnJTaGlmdFRvKDEsYSl9ZWxzZSBpZighYi5pc0V2ZW4oKSliLnN1YlRvKG0sYik7Yi5yU2hpZnRUbygxLGIpfXdoaWxlKHYuaXNFdmVuKCkpe3YuclNoaWZ0VG8oMSx2KTtpZihhYyl7aWYoIWMuaXNFdmVuKCl8fCFkLmlzRXZlbigpKXtjLmFkZFRvKHRoaXMsYyk7ZC5zdWJUbyhtLGQpfWMuclNoaWZ0VG8oMSxjKX1lbHNlIGlmKCFkLmlzRXZlbigpKWQuc3ViVG8obSxkKTtkLnJTaGlmdFRvKDEsZCl9aWYodS5jb21wYXJlVG8odik+PTApe3Uuc3ViVG8odix1KTtpZihhYylhLnN1YlRvKGMsYSk7Yi5zdWJUbyhkLGIpfWVsc2V7di5zdWJUbyh1LHYpO2lmKGFjKWMuc3ViVG8oYSxjKTtkLnN1YlRvKGIsZCl9fWlmKHYuY29tcGFyZVRvKEJpZ0ludGVnZXIuT05FKSE9MClyZXR1cm4gQmlnSW50ZWdlci5aRVJPO2lmKGQuY29tcGFyZVRvKG0pPj0wKXJldHVybiBkLnN1YnRyYWN0KG0pO2lmKGQuc2lnbnVtKCk8MClkLmFkZFRvKG0sZCk7ZWxzZSByZXR1cm4gZDtpZihkLnNpZ251bSgpPDApcmV0dXJuIGQuYWRkKG0pO2Vsc2UgcmV0dXJuIGR9dmFyIGxvd3ByaW1lcz1bMiwzLDUsNywxMSwxMywxNywxOSwyMywyOSwzMSwzNyw0MSw0Myw0Nyw1Myw1OSw2MSw2Nyw3MSw3Myw3OSw4Myw4OSw5NywxMDEsMTAzLDEwNywxMDksMTEzLDEyNywxMzEsMTM3LDEzOSwxNDksMTUxLDE1NywxNjMsMTY3LDE3MywxNzksMTgxLDE5MSwxOTMsMTk3LDE5OSwyMTEsMjIzLDIyNywyMjksMjMzLDIzOSwyNDEsMjUxLDI1NywyNjMsMjY5LDI3MSwyNzcsMjgxLDI4MywyOTMsMzA3LDMxMSwzMTMsMzE3LDMzMSwzMzcsMzQ3LDM0OSwzNTMsMzU5LDM2NywzNzMsMzc5LDM4MywzODksMzk3LDQwMSw0MDksNDE5LDQyMSw0MzEsNDMzLDQzOSw0NDMsNDQ5LDQ1Nyw0NjEsNDYzLDQ2Nyw0NzksNDg3LDQ5MSw0OTksNTAzLDUwOSw1MjEsNTIzLDU0MSw1NDcsNTU3LDU2Myw1NjksNTcxLDU3Nyw1ODcsNTkzLDU5OSw2MDEsNjA3LDYxMyw2MTcsNjE5LDYzMSw2NDEsNjQzLDY0Nyw2NTMsNjU5LDY2MSw2NzMsNjc3LDY4Myw2OTEsNzAxLDcwOSw3MTksNzI3LDczMyw3MzksNzQzLDc1MSw3NTcsNzYxLDc2OSw3NzMsNzg3LDc5Nyw4MDksODExLDgyMSw4MjMsODI3LDgyOSw4MzksODUzLDg1Nyw4NTksODYzLDg3Nyw4ODEsODgzLDg4Nyw5MDcsOTExLDkxOSw5MjksOTM3LDk0MSw5NDcsOTUzLDk2Nyw5NzEsOTc3LDk4Myw5OTEsOTk3XTt2YXIgbHBsaW09KDE8PDI2KS9sb3dwcmltZXNbbG93cHJpbWVzLmxlbmd0aC0xXTtmdW5jdGlvbiBibklzUHJvYmFibGVQcmltZSh0KXt2YXIgaSx4PXRoaXMuYWJzKCk7aWYoeC50PT0xJiZ4WzBdPD1sb3dwcmltZXNbbG93cHJpbWVzLmxlbmd0aC0xXSl7Zm9yKGk9MDtpPGxvd3ByaW1lcy5sZW5ndGg7KytpKWlmKHhbMF09PWxvd3ByaW1lc1tpXSlyZXR1cm4gdHJ1ZTtyZXR1cm4gZmFsc2V9aWYoeC5pc0V2ZW4oKSlyZXR1cm4gZmFsc2U7aT0xO3doaWxlKGk8bG93cHJpbWVzLmxlbmd0aCl7dmFyIG09bG93cHJpbWVzW2ldLGo9aSsxO3doaWxlKGo8bG93cHJpbWVzLmxlbmd0aCYmbTxscGxpbSltKj1sb3dwcmltZXNbaisrXTttPXgubW9kSW50KG0pO3doaWxlKGk8ailpZihtJWxvd3ByaW1lc1tpKytdPT09MClyZXR1cm4gZmFsc2V9cmV0dXJuIHgubWlsbGVyUmFiaW4odCl9ZnVuY3Rpb24gYm5wTWlsbGVyUmFiaW4odCl7dmFyIG4xPXRoaXMuc3VidHJhY3QoQmlnSW50ZWdlci5PTkUpO3ZhciBrPW4xLmdldExvd2VzdFNldEJpdCgpO2lmKGs8PTApcmV0dXJuIGZhbHNlO3ZhciByPW4xLnNoaWZ0UmlnaHQoayk7dD10KzE+PjE7aWYodD5sb3dwcmltZXMubGVuZ3RoKXQ9bG93cHJpbWVzLmxlbmd0aDt2YXIgYT1uYmkoKTtmb3IodmFyIGk9MDtpPHQ7KytpKXthLmZyb21JbnQobG93cHJpbWVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpsb3dwcmltZXMubGVuZ3RoKV0pO3ZhciB5PWEubW9kUG93KHIsdGhpcyk7aWYoeS5jb21wYXJlVG8oQmlnSW50ZWdlci5PTkUpIT0wJiZ5LmNvbXBhcmVUbyhuMSkhPTApe3ZhciBqPTE7d2hpbGUoaisrPGsmJnkuY29tcGFyZVRvKG4xKSE9MCl7eT15Lm1vZFBvd0ludCgyLHRoaXMpO2lmKHkuY29tcGFyZVRvKEJpZ0ludGVnZXIuT05FKT09PTApcmV0dXJuIGZhbHNlfWlmKHkuY29tcGFyZVRvKG4xKSE9MClyZXR1cm4gZmFsc2V9fXJldHVybiB0cnVlfUJpZ0ludGVnZXIucHJvdG90eXBlLmNvcHlUbz1ibnBDb3B5VG87QmlnSW50ZWdlci5wcm90b3R5cGUuZnJvbUludD1ibnBGcm9tSW50O0JpZ0ludGVnZXIucHJvdG90eXBlLmZyb21TdHJpbmc9Ym5wRnJvbVN0cmluZztCaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tQnl0ZUFycmF5PWJucEZyb21CeXRlQXJyYXk7QmlnSW50ZWdlci5wcm90b3R5cGUuZnJvbUJ1ZmZlcj1ibnBGcm9tQnVmZmVyO0JpZ0ludGVnZXIucHJvdG90eXBlLmNsYW1wPWJucENsYW1wO0JpZ0ludGVnZXIucHJvdG90eXBlLmRsU2hpZnRUbz1ibnBETFNoaWZ0VG87QmlnSW50ZWdlci5wcm90b3R5cGUuZHJTaGlmdFRvPWJucERSU2hpZnRUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5sU2hpZnRUbz1ibnBMU2hpZnRUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5yU2hpZnRUbz1ibnBSU2hpZnRUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5zdWJUbz1ibnBTdWJUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5tdWx0aXBseVRvPWJucE11bHRpcGx5VG87QmlnSW50ZWdlci5wcm90b3R5cGUuc3F1YXJlVG89Ym5wU3F1YXJlVG87QmlnSW50ZWdlci5wcm90b3R5cGUuZGl2UmVtVG89Ym5wRGl2UmVtVG87QmlnSW50ZWdlci5wcm90b3R5cGUuaW52RGlnaXQ9Ym5wSW52RGlnaXQ7QmlnSW50ZWdlci5wcm90b3R5cGUuaXNFdmVuPWJucElzRXZlbjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5leHA9Ym5wRXhwO0JpZ0ludGVnZXIucHJvdG90eXBlLmNodW5rU2l6ZT1ibnBDaHVua1NpemU7QmlnSW50ZWdlci5wcm90b3R5cGUudG9SYWRpeD1ibnBUb1JhZGl4O0JpZ0ludGVnZXIucHJvdG90eXBlLmZyb21SYWRpeD1ibnBGcm9tUmFkaXg7QmlnSW50ZWdlci5wcm90b3R5cGUuZnJvbU51bWJlcj1ibnBGcm9tTnVtYmVyO0JpZ0ludGVnZXIucHJvdG90eXBlLmJpdHdpc2VUbz1ibnBCaXR3aXNlVG87QmlnSW50ZWdlci5wcm90b3R5cGUuY2hhbmdlQml0PWJucENoYW5nZUJpdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5hZGRUbz1ibnBBZGRUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5kTXVsdGlwbHk9Ym5wRE11bHRpcGx5O0JpZ0ludGVnZXIucHJvdG90eXBlLmRBZGRPZmZzZXQ9Ym5wREFkZE9mZnNldDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tdWx0aXBseUxvd2VyVG89Ym5wTXVsdGlwbHlMb3dlclRvO0JpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5VXBwZXJUbz1ibnBNdWx0aXBseVVwcGVyVG87QmlnSW50ZWdlci5wcm90b3R5cGUubW9kSW50PWJucE1vZEludDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5taWxsZXJSYWJpbj1ibnBNaWxsZXJSYWJpbjtCaWdJbnRlZ2VyLnByb3RvdHlwZS50b1N0cmluZz1iblRvU3RyaW5nO0JpZ0ludGVnZXIucHJvdG90eXBlLm5lZ2F0ZT1ibk5lZ2F0ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5hYnM9Ym5BYnM7QmlnSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZVRvPWJuQ29tcGFyZVRvO0JpZ0ludGVnZXIucHJvdG90eXBlLmJpdExlbmd0aD1ibkJpdExlbmd0aDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2Q9Ym5Nb2Q7QmlnSW50ZWdlci5wcm90b3R5cGUubW9kUG93SW50PWJuTW9kUG93SW50O0JpZ0ludGVnZXIucHJvdG90eXBlLmNsb25lPWJuQ2xvbmU7QmlnSW50ZWdlci5wcm90b3R5cGUuaW50VmFsdWU9Ym5JbnRWYWx1ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5ieXRlVmFsdWU9Ym5CeXRlVmFsdWU7QmlnSW50ZWdlci5wcm90b3R5cGUuc2hvcnRWYWx1ZT1iblNob3J0VmFsdWU7QmlnSW50ZWdlci5wcm90b3R5cGUuc2lnbnVtPWJuU2lnTnVtO0JpZ0ludGVnZXIucHJvdG90eXBlLnRvQnl0ZUFycmF5PWJuVG9CeXRlQXJyYXk7QmlnSW50ZWdlci5wcm90b3R5cGUudG9CdWZmZXI9Ym5Ub0J1ZmZlcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5lcXVhbHM9Ym5FcXVhbHM7QmlnSW50ZWdlci5wcm90b3R5cGUubWluPWJuTWluO0JpZ0ludGVnZXIucHJvdG90eXBlLm1heD1ibk1heDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5hbmQ9Ym5BbmQ7QmlnSW50ZWdlci5wcm90b3R5cGUub3I9Ym5PcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS54b3I9Ym5Yb3I7QmlnSW50ZWdlci5wcm90b3R5cGUuYW5kTm90PWJuQW5kTm90O0JpZ0ludGVnZXIucHJvdG90eXBlLm5vdD1ibk5vdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdExlZnQ9Ym5TaGlmdExlZnQ7QmlnSW50ZWdlci5wcm90b3R5cGUuc2hpZnRSaWdodD1iblNoaWZ0UmlnaHQ7QmlnSW50ZWdlci5wcm90b3R5cGUuZ2V0TG93ZXN0U2V0Qml0PWJuR2V0TG93ZXN0U2V0Qml0O0JpZ0ludGVnZXIucHJvdG90eXBlLmJpdENvdW50PWJuQml0Q291bnQ7QmlnSW50ZWdlci5wcm90b3R5cGUudGVzdEJpdD1iblRlc3RCaXQ7QmlnSW50ZWdlci5wcm90b3R5cGUuc2V0Qml0PWJuU2V0Qml0O0JpZ0ludGVnZXIucHJvdG90eXBlLmNsZWFyQml0PWJuQ2xlYXJCaXQ7QmlnSW50ZWdlci5wcm90b3R5cGUuZmxpcEJpdD1ibkZsaXBCaXQ7QmlnSW50ZWdlci5wcm90b3R5cGUuYWRkPWJuQWRkO0JpZ0ludGVnZXIucHJvdG90eXBlLnN1YnRyYWN0PWJuU3VidHJhY3Q7QmlnSW50ZWdlci5wcm90b3R5cGUubXVsdGlwbHk9Ym5NdWx0aXBseTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZpZGU9Ym5EaXZpZGU7QmlnSW50ZWdlci5wcm90b3R5cGUucmVtYWluZGVyPWJuUmVtYWluZGVyO0JpZ0ludGVnZXIucHJvdG90eXBlLmRpdmlkZUFuZFJlbWFpbmRlcj1ibkRpdmlkZUFuZFJlbWFpbmRlcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RQb3c9Ym5Nb2RQb3c7QmlnSW50ZWdlci5wcm90b3R5cGUubW9kSW52ZXJzZT1ibk1vZEludmVyc2U7QmlnSW50ZWdlci5wcm90b3R5cGUucG93PWJuUG93O0JpZ0ludGVnZXIucHJvdG90eXBlLmdjZD1ibkdDRDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1Byb2JhYmxlUHJpbWU9Ym5Jc1Byb2JhYmxlUHJpbWU7QmlnSW50ZWdlci5pbnQyY2hhcj1pbnQyY2hhcjtCaWdJbnRlZ2VyLlpFUk89bmJ2KDApO0JpZ0ludGVnZXIuT05FPW5idigxKTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zcXVhcmU9Ym5TcXVhcmU7bW9kdWxlLmV4cG9ydHM9QmlnSW50ZWdlcn0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4uL2NyeXB0byI6NDMsIi4uL3V0aWxzIjo1OCwiYmlnLWludGVnZXIiOjI1LGJ1ZmZlcjoyN31dLDUzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgXz1yZXF1aXJlKCIuLi91dGlscyIpLl87dmFyIEJpZ0ludGVnZXI9cmVxdWlyZSgiLi9qc2JuLmpzIik7dmFyIHV0aWxzPXJlcXVpcmUoIi4uL3V0aWxzLmpzIik7dmFyIHNjaGVtZXM9cmVxdWlyZSgiLi4vc2NoZW1lcy9zY2hlbWVzLmpzIik7dmFyIGVuY3J5cHRFbmdpbmVzPXJlcXVpcmUoIi4uL2VuY3J5cHRFbmdpbmVzL2VuY3J5cHRFbmdpbmVzLmpzIik7ZXhwb3J0cy5CaWdJbnRlZ2VyPUJpZ0ludGVnZXI7bW9kdWxlLmV4cG9ydHMuS2V5PWZ1bmN0aW9uKCl7ZnVuY3Rpb24gUlNBS2V5KCl7dGhpcy5uPW51bGw7dGhpcy5lPTA7dGhpcy5kPW51bGw7dGhpcy5wPW51bGw7dGhpcy5xPW51bGw7dGhpcy5kbXAxPW51bGw7dGhpcy5kbXExPW51bGw7dGhpcy5jb2VmZj1udWxsfVJTQUtleS5wcm90b3R5cGUuc2V0T3B0aW9ucz1mdW5jdGlvbihvcHRpb25zKXt2YXIgc2lnbmluZ1NjaGVtZVByb3ZpZGVyPXNjaGVtZXNbb3B0aW9ucy5zaWduaW5nU2NoZW1lXTt2YXIgZW5jcnlwdGlvblNjaGVtZVByb3ZpZGVyPXNjaGVtZXNbb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lXTtpZihzaWduaW5nU2NoZW1lUHJvdmlkZXI9PT1lbmNyeXB0aW9uU2NoZW1lUHJvdmlkZXIpe3RoaXMuc2lnbmluZ1NjaGVtZT10aGlzLmVuY3J5cHRpb25TY2hlbWU9ZW5jcnlwdGlvblNjaGVtZVByb3ZpZGVyLm1ha2VTY2hlbWUodGhpcyxvcHRpb25zKX1lbHNle3RoaXMuZW5jcnlwdGlvblNjaGVtZT1lbmNyeXB0aW9uU2NoZW1lUHJvdmlkZXIubWFrZVNjaGVtZSh0aGlzLG9wdGlvbnMpO3RoaXMuc2lnbmluZ1NjaGVtZT1zaWduaW5nU2NoZW1lUHJvdmlkZXIubWFrZVNjaGVtZSh0aGlzLG9wdGlvbnMpfXRoaXMuZW5jcnlwdEVuZ2luZT1lbmNyeXB0RW5naW5lcy5nZXRFbmdpbmUodGhpcyxvcHRpb25zKX07UlNBS2V5LnByb3RvdHlwZS5nZW5lcmF0ZT1mdW5jdGlvbihCLEUpe3ZhciBxcz1CPj4xO3RoaXMuZT1wYXJzZUludChFLDE2KTt2YXIgZWU9bmV3IEJpZ0ludGVnZXIoRSwxNik7d2hpbGUodHJ1ZSl7d2hpbGUodHJ1ZSl7dGhpcy5wPW5ldyBCaWdJbnRlZ2VyKEItcXMsMSk7aWYodGhpcy5wLnN1YnRyYWN0KEJpZ0ludGVnZXIuT05FKS5nY2QoZWUpLmNvbXBhcmVUbyhCaWdJbnRlZ2VyLk9ORSk9PT0wJiZ0aGlzLnAuaXNQcm9iYWJsZVByaW1lKDEwKSlicmVha313aGlsZSh0cnVlKXt0aGlzLnE9bmV3IEJpZ0ludGVnZXIocXMsMSk7aWYodGhpcy5xLnN1YnRyYWN0KEJpZ0ludGVnZXIuT05FKS5nY2QoZWUpLmNvbXBhcmVUbyhCaWdJbnRlZ2VyLk9ORSk9PT0wJiZ0aGlzLnEuaXNQcm9iYWJsZVByaW1lKDEwKSlicmVha31pZih0aGlzLnAuY29tcGFyZVRvKHRoaXMucSk8PTApe3ZhciB0PXRoaXMucDt0aGlzLnA9dGhpcy5xO3RoaXMucT10fXZhciBwMT10aGlzLnAuc3VidHJhY3QoQmlnSW50ZWdlci5PTkUpO3ZhciBxMT10aGlzLnEuc3VidHJhY3QoQmlnSW50ZWdlci5PTkUpO3ZhciBwaGk9cDEubXVsdGlwbHkocTEpO2lmKHBoaS5nY2QoZWUpLmNvbXBhcmVUbyhCaWdJbnRlZ2VyLk9ORSk9PT0wKXt0aGlzLm49dGhpcy5wLm11bHRpcGx5KHRoaXMucSk7aWYodGhpcy5uLmJpdExlbmd0aCgpPEIpe2NvbnRpbnVlfXRoaXMuZD1lZS5tb2RJbnZlcnNlKHBoaSk7dGhpcy5kbXAxPXRoaXMuZC5tb2QocDEpO3RoaXMuZG1xMT10aGlzLmQubW9kKHExKTt0aGlzLmNvZWZmPXRoaXMucS5tb2RJbnZlcnNlKHRoaXMucCk7YnJlYWt9fXRoaXMuJCRyZWNhbGN1bGF0ZUNhY2hlKCl9O1JTQUtleS5wcm90b3R5cGUuc2V0UHJpdmF0ZT1mdW5jdGlvbihOLEUsRCxQLFEsRFAsRFEsQyl7aWYoTiYmRSYmRCYmTi5sZW5ndGg+MCYmKF8uaXNOdW1iZXIoRSl8fEUubGVuZ3RoPjApJiZELmxlbmd0aD4wKXt0aGlzLm49bmV3IEJpZ0ludGVnZXIoTik7dGhpcy5lPV8uaXNOdW1iZXIoRSk/RTp1dGlscy5nZXQzMkludEZyb21CdWZmZXIoRSwwKTt0aGlzLmQ9bmV3IEJpZ0ludGVnZXIoRCk7aWYoUCYmUSYmRFAmJkRRJiZDKXt0aGlzLnA9bmV3IEJpZ0ludGVnZXIoUCk7dGhpcy5xPW5ldyBCaWdJbnRlZ2VyKFEpO3RoaXMuZG1wMT1uZXcgQmlnSW50ZWdlcihEUCk7dGhpcy5kbXExPW5ldyBCaWdJbnRlZ2VyKERRKTt0aGlzLmNvZWZmPW5ldyBCaWdJbnRlZ2VyKEMpfWVsc2V7fXRoaXMuJCRyZWNhbGN1bGF0ZUNhY2hlKCl9ZWxzZXt0aHJvdyBFcnJvcigiSW52YWxpZCBSU0EgcHJpdmF0ZSBrZXkiKX19O1JTQUtleS5wcm90b3R5cGUuc2V0UHVibGljPWZ1bmN0aW9uKE4sRSl7aWYoTiYmRSYmTi5sZW5ndGg+MCYmKF8uaXNOdW1iZXIoRSl8fEUubGVuZ3RoPjApKXt0aGlzLm49bmV3IEJpZ0ludGVnZXIoTik7dGhpcy5lPV8uaXNOdW1iZXIoRSk/RTp1dGlscy5nZXQzMkludEZyb21CdWZmZXIoRSwwKTt0aGlzLiQkcmVjYWxjdWxhdGVDYWNoZSgpfWVsc2V7dGhyb3cgRXJyb3IoIkludmFsaWQgUlNBIHB1YmxpYyBrZXkiKX19O1JTQUtleS5wcm90b3R5cGUuJGRvUHJpdmF0ZT1mdW5jdGlvbih4KXtpZih0aGlzLnB8fHRoaXMucSl7cmV0dXJuIHgubW9kUG93KHRoaXMuZCx0aGlzLm4pfXZhciB4cD14Lm1vZCh0aGlzLnApLm1vZFBvdyh0aGlzLmRtcDEsdGhpcy5wKTt2YXIgeHE9eC5tb2QodGhpcy5xKS5tb2RQb3codGhpcy5kbXExLHRoaXMucSk7d2hpbGUoeHAuY29tcGFyZVRvKHhxKTwwKXt4cD14cC5hZGQodGhpcy5wKX1yZXR1cm4geHAuc3VidHJhY3QoeHEpLm11bHRpcGx5KHRoaXMuY29lZmYpLm1vZCh0aGlzLnApLm11bHRpcGx5KHRoaXMucSkuYWRkKHhxKX07UlNBS2V5LnByb3RvdHlwZS4kZG9QdWJsaWM9ZnVuY3Rpb24oeCl7cmV0dXJuIHgubW9kUG93SW50KHRoaXMuZSx0aGlzLm4pfTtSU0FLZXkucHJvdG90eXBlLmVuY3J5cHQ9ZnVuY3Rpb24oYnVmZmVyLHVzZVByaXZhdGUpe3ZhciBidWZmZXJzPVtdO3ZhciByZXN1bHRzPVtdO3ZhciBidWZmZXJTaXplPWJ1ZmZlci5sZW5ndGg7dmFyIGJ1ZmZlcnNDb3VudD1NYXRoLmNlaWwoYnVmZmVyU2l6ZS90aGlzLm1heE1lc3NhZ2VMZW5ndGgpfHwxO3ZhciBkaXZpZGVkU2l6ZT1NYXRoLmNlaWwoYnVmZmVyU2l6ZS9idWZmZXJzQ291bnR8fDEpO2lmKGJ1ZmZlcnNDb3VudD09MSl7YnVmZmVycy5wdXNoKGJ1ZmZlcil9ZWxzZXtmb3IodmFyIGJ1Zk51bT0wO2J1Zk51bTxidWZmZXJzQ291bnQ7YnVmTnVtKyspe2J1ZmZlcnMucHVzaChidWZmZXIuc2xpY2UoYnVmTnVtKmRpdmlkZWRTaXplLChidWZOdW0rMSkqZGl2aWRlZFNpemUpKX19Zm9yKHZhciBpPTA7aTxidWZmZXJzLmxlbmd0aDtpKyspe3Jlc3VsdHMucHVzaCh0aGlzLmVuY3J5cHRFbmdpbmUuZW5jcnlwdChidWZmZXJzW2ldLHVzZVByaXZhdGUpKX1yZXR1cm4gQnVmZmVyLmNvbmNhdChyZXN1bHRzKX07UlNBS2V5LnByb3RvdHlwZS5kZWNyeXB0PWZ1bmN0aW9uKGJ1ZmZlcix1c2VQdWJsaWMpe2lmKGJ1ZmZlci5sZW5ndGgldGhpcy5lbmNyeXB0ZWREYXRhTGVuZ3RoPjApe3Rocm93IEVycm9yKCJJbmNvcnJlY3QgZGF0YSBvciBrZXkiKX12YXIgcmVzdWx0PVtdO3ZhciBvZmZzZXQ9MDt2YXIgbGVuZ3RoPTA7dmFyIGJ1ZmZlcnNDb3VudD1idWZmZXIubGVuZ3RoL3RoaXMuZW5jcnlwdGVkRGF0YUxlbmd0aDtmb3IodmFyIGk9MDtpPGJ1ZmZlcnNDb3VudDtpKyspe29mZnNldD1pKnRoaXMuZW5jcnlwdGVkRGF0YUxlbmd0aDtsZW5ndGg9b2Zmc2V0K3RoaXMuZW5jcnlwdGVkRGF0YUxlbmd0aDtyZXN1bHQucHVzaCh0aGlzLmVuY3J5cHRFbmdpbmUuZGVjcnlwdChidWZmZXIuc2xpY2Uob2Zmc2V0LE1hdGgubWluKGxlbmd0aCxidWZmZXIubGVuZ3RoKSksdXNlUHVibGljKSl9cmV0dXJuIEJ1ZmZlci5jb25jYXQocmVzdWx0KX07UlNBS2V5LnByb3RvdHlwZS5zaWduPWZ1bmN0aW9uKGJ1ZmZlcil7cmV0dXJuIHRoaXMuc2lnbmluZ1NjaGVtZS5zaWduLmFwcGx5KHRoaXMuc2lnbmluZ1NjaGVtZSxhcmd1bWVudHMpfTtSU0FLZXkucHJvdG90eXBlLnZlcmlmeT1mdW5jdGlvbihidWZmZXIsc2lnbmF0dXJlLHNpZ25hdHVyZV9lbmNvZGluZyl7cmV0dXJuIHRoaXMuc2lnbmluZ1NjaGVtZS52ZXJpZnkuYXBwbHkodGhpcy5zaWduaW5nU2NoZW1lLGFyZ3VtZW50cyl9O1JTQUtleS5wcm90b3R5cGUuaXNQcml2YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubiYmdGhpcy5lJiZ0aGlzLmR8fGZhbHNlfTtSU0FLZXkucHJvdG90eXBlLmlzUHVibGljPWZ1bmN0aW9uKHN0cmljdCl7cmV0dXJuIHRoaXMubiYmdGhpcy5lJiYhKHN0cmljdCYmdGhpcy5kKXx8ZmFsc2V9O09iamVjdC5kZWZpbmVQcm9wZXJ0eShSU0FLZXkucHJvdG90eXBlLCJrZXlTaXplIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY2FjaGUua2V5Qml0TGVuZ3RofX0pO09iamVjdC5kZWZpbmVQcm9wZXJ0eShSU0FLZXkucHJvdG90eXBlLCJlbmNyeXB0ZWREYXRhTGVuZ3RoIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY2FjaGUua2V5Qnl0ZUxlbmd0aH19KTtPYmplY3QuZGVmaW5lUHJvcGVydHkoUlNBS2V5LnByb3RvdHlwZSwibWF4TWVzc2FnZUxlbmd0aCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmVuY3J5cHRpb25TY2hlbWUubWF4TWVzc2FnZUxlbmd0aCgpfX0pO1JTQUtleS5wcm90b3R5cGUuJCRyZWNhbGN1bGF0ZUNhY2hlPWZ1bmN0aW9uKCl7dGhpcy5jYWNoZT10aGlzLmNhY2hlfHx7fTt0aGlzLmNhY2hlLmtleUJpdExlbmd0aD10aGlzLm4uYml0TGVuZ3RoKCk7dGhpcy5jYWNoZS5rZXlCeXRlTGVuZ3RoPXRoaXMuY2FjaGUua2V5Qml0TGVuZ3RoKzY+PjN9O3JldHVybiBSU0FLZXl9KCl9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi9lbmNyeXB0RW5naW5lcy9lbmNyeXB0RW5naW5lcy5qcyI6NDQsIi4uL3NjaGVtZXMvc2NoZW1lcy5qcyI6NTcsIi4uL3V0aWxzIjo1OCwiLi4vdXRpbHMuanMiOjU4LCIuL2pzYm4uanMiOjUyLGJ1ZmZlcjoyN31dLDU0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgY3J5cHQ9cmVxdWlyZSgiLi4vY3J5cHRvIik7bW9kdWxlLmV4cG9ydHM9e2lzRW5jcnlwdGlvbjp0cnVlLGlzU2lnbmF0dXJlOmZhbHNlfTttb2R1bGUuZXhwb3J0cy5kaWdlc3RMZW5ndGg9e21kNDoxNixtZDU6MTYscmlwZW1kMTYwOjIwLHJtZDE2MDoyMCxzaGExOjIwLHNoYTIyNDoyOCxzaGEyNTY6MzIsc2hhMzg0OjQ4LHNoYTUxMjo2NH07dmFyIERFRkFVTFRfSEFTSF9GVU5DVElPTj0ic2hhMSI7bW9kdWxlLmV4cG9ydHMuZW1lX29hZXBfbWdmMT1mdW5jdGlvbihzZWVkLG1hc2tMZW5ndGgsaGFzaEZ1bmN0aW9uKXtoYXNoRnVuY3Rpb249aGFzaEZ1bmN0aW9ufHxERUZBVUxUX0hBU0hfRlVOQ1RJT047dmFyIGhMZW49bW9kdWxlLmV4cG9ydHMuZGlnZXN0TGVuZ3RoW2hhc2hGdW5jdGlvbl07dmFyIGNvdW50PU1hdGguY2VpbChtYXNrTGVuZ3RoL2hMZW4pO3ZhciBUPUJ1ZmZlci5hbGxvYyhoTGVuKmNvdW50KTt2YXIgYz1CdWZmZXIuYWxsb2MoNCk7Zm9yKHZhciBpPTA7aTxjb3VudDsrK2kpe3ZhciBoYXNoPWNyeXB0LmNyZWF0ZUhhc2goaGFzaEZ1bmN0aW9uKTtoYXNoLnVwZGF0ZShzZWVkKTtjLndyaXRlVUludDMyQkUoaSwwKTtoYXNoLnVwZGF0ZShjKTtoYXNoLmRpZ2VzdCgpLmNvcHkoVCxpKmhMZW4pfXJldHVybiBULnNsaWNlKDAsbWFza0xlbmd0aCl9O21vZHVsZS5leHBvcnRzLm1ha2VTY2hlbWU9ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe2Z1bmN0aW9uIFNjaGVtZShrZXksb3B0aW9ucyl7dGhpcy5rZXk9a2V5O3RoaXMub3B0aW9ucz1vcHRpb25zfVNjaGVtZS5wcm90b3R5cGUubWF4TWVzc2FnZUxlbmd0aD1mdW5jdGlvbigpe3JldHVybiB0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoLTIqbW9kdWxlLmV4cG9ydHMuZGlnZXN0TGVuZ3RoW3RoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT05dLTJ9O1NjaGVtZS5wcm90b3R5cGUuZW5jUGFkPWZ1bmN0aW9uKGJ1ZmZlcil7dmFyIGhhc2g9dGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTjt2YXIgbWdmPXRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5tZ2Z8fG1vZHVsZS5leHBvcnRzLmVtZV9vYWVwX21nZjE7dmFyIGxhYmVsPXRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5sYWJlbHx8QnVmZmVyLmFsbG9jKDApO3ZhciBlbUxlbj10aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoO3ZhciBoTGVuPW1vZHVsZS5leHBvcnRzLmRpZ2VzdExlbmd0aFtoYXNoXTtpZihidWZmZXIubGVuZ3RoPmVtTGVuLTIqaExlbi0yKXt0aHJvdyBuZXcgRXJyb3IoIk1lc3NhZ2UgaXMgdG9vIGxvbmcgdG8gZW5jb2RlIGludG8gYW4gZW5jb2RlZCBtZXNzYWdlIHdpdGggYSBsZW5ndGggb2YgIitlbUxlbisiIGJ5dGVzLCBpbmNyZWFzZSIrImVtTGVuIHRvIGZpeCB0aGlzIGVycm9yIChtaW5pbXVtIHZhbHVlIGZvciBnaXZlbiBwYXJhbWV0ZXJzIGFuZCBvcHRpb25zOiAiKyhlbUxlbi0yKmhMZW4tMikrIikiKX12YXIgbEhhc2g9Y3J5cHQuY3JlYXRlSGFzaChoYXNoKTtsSGFzaC51cGRhdGUobGFiZWwpO2xIYXNoPWxIYXNoLmRpZ2VzdCgpO3ZhciBQUz1CdWZmZXIuYWxsb2MoZW1MZW4tYnVmZmVyLmxlbmd0aC0yKmhMZW4tMSk7UFMuZmlsbCgwKTtQU1tQUy5sZW5ndGgtMV09MTt2YXIgREI9QnVmZmVyLmNvbmNhdChbbEhhc2gsUFMsYnVmZmVyXSk7dmFyIHNlZWQ9Y3J5cHQucmFuZG9tQnl0ZXMoaExlbik7dmFyIG1hc2s9bWdmKHNlZWQsREIubGVuZ3RoLGhhc2gpO2Zvcih2YXIgaT0wO2k8REIubGVuZ3RoO2krKyl7REJbaV1ePW1hc2tbaV19bWFzaz1tZ2YoREIsaExlbixoYXNoKTtmb3IoaT0wO2k8c2VlZC5sZW5ndGg7aSsrKXtzZWVkW2ldXj1tYXNrW2ldfXZhciBlbT1CdWZmZXIuYWxsb2MoMStzZWVkLmxlbmd0aCtEQi5sZW5ndGgpO2VtWzBdPTA7c2VlZC5jb3B5KGVtLDEpO0RCLmNvcHkoZW0sMStzZWVkLmxlbmd0aCk7cmV0dXJuIGVtfTtTY2hlbWUucHJvdG90eXBlLmVuY1VuUGFkPWZ1bmN0aW9uKGJ1ZmZlcil7dmFyIGhhc2g9dGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTjt2YXIgbWdmPXRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5tZ2Z8fG1vZHVsZS5leHBvcnRzLmVtZV9vYWVwX21nZjE7dmFyIGxhYmVsPXRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5sYWJlbHx8QnVmZmVyLmFsbG9jKDApO3ZhciBoTGVuPW1vZHVsZS5leHBvcnRzLmRpZ2VzdExlbmd0aFtoYXNoXTtpZihidWZmZXIubGVuZ3RoPDIqaExlbisyKXt0aHJvdyBuZXcgRXJyb3IoIkVycm9yIGRlY29kaW5nIG1lc3NhZ2UsIHRoZSBzdXBwbGllZCBtZXNzYWdlIGlzIG5vdCBsb25nIGVub3VnaCB0byBiZSBhIHZhbGlkIE9BRVAgZW5jb2RlZCBtZXNzYWdlIil9dmFyIHNlZWQ9YnVmZmVyLnNsaWNlKDEsaExlbisxKTt2YXIgREI9YnVmZmVyLnNsaWNlKDEraExlbik7dmFyIG1hc2s9bWdmKERCLGhMZW4saGFzaCk7Zm9yKHZhciBpPTA7aTxzZWVkLmxlbmd0aDtpKyspe3NlZWRbaV1ePW1hc2tbaV19bWFzaz1tZ2Yoc2VlZCxEQi5sZW5ndGgsaGFzaCk7Zm9yKGk9MDtpPERCLmxlbmd0aDtpKyspe0RCW2ldXj1tYXNrW2ldfXZhciBsSGFzaD1jcnlwdC5jcmVhdGVIYXNoKGhhc2gpO2xIYXNoLnVwZGF0ZShsYWJlbCk7bEhhc2g9bEhhc2guZGlnZXN0KCk7dmFyIGxIYXNoRU09REIuc2xpY2UoMCxoTGVuKTtpZihsSGFzaEVNLnRvU3RyaW5nKCJoZXgiKSE9bEhhc2gudG9TdHJpbmcoImhleCIpKXt0aHJvdyBuZXcgRXJyb3IoIkVycm9yIGRlY29kaW5nIG1lc3NhZ2UsIHRoZSBsSGFzaCBjYWxjdWxhdGVkIGZyb20gdGhlIGxhYmVsIHByb3ZpZGVkIGFuZCB0aGUgbEhhc2ggaW4gdGhlIGVuY3J5cHRlZCBkYXRhIGRvIG5vdCBtYXRjaC4iKX1pPWhMZW47d2hpbGUoREJbaSsrXT09PTAmJmk8REIubGVuZ3RoKTtpZihEQltpLTFdIT0xKXt0aHJvdyBuZXcgRXJyb3IoIkVycm9yIGRlY29kaW5nIG1lc3NhZ2UsIHRoZXJlIGlzIG5vIHBhZGRpbmcgbWVzc2FnZSBzZXBhcmF0b3IgYnl0ZSIpfXJldHVybiBEQi5zbGljZShpKX07cmV0dXJuIG5ldyBTY2hlbWUoa2V5LG9wdGlvbnMpfX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4uL2NyeXB0byI6NDMsYnVmZmVyOjI3fV0sNTU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBCaWdJbnRlZ2VyPXJlcXVpcmUoIi4uL2xpYnMvanNibiIpO3ZhciBjcnlwdD1yZXF1aXJlKCIuLi9jcnlwdG8iKTt2YXIgY29uc3RhbnRzPXJlcXVpcmUoImNvbnN0YW50cyIpO3ZhciBTSUdOX0lORk9fSEVBRD17bWQyOkJ1ZmZlci5mcm9tKCIzMDIwMzAwYzA2MDgyYTg2NDg4NmY3MGQwMjAyMDUwMDA0MTAiLCJoZXgiKSxtZDU6QnVmZmVyLmZyb20oIjMwMjAzMDBjMDYwODJhODY0ODg2ZjcwZDAyMDUwNTAwMDQxMCIsImhleCIpLHNoYTE6QnVmZmVyLmZyb20oIjMwMjEzMDA5MDYwNTJiMGUwMzAyMWEwNTAwMDQxNCIsImhleCIpLHNoYTIyNDpCdWZmZXIuZnJvbSgiMzAyZDMwMGQwNjA5NjA4NjQ4MDE2NTAzMDQwMjA0MDUwMDA0MWMiLCJoZXgiKSxzaGEyNTY6QnVmZmVyLmZyb20oIjMwMzEzMDBkMDYwOTYwODY0ODAxNjUwMzA0MDIwMTA1MDAwNDIwIiwiaGV4Iiksc2hhMzg0OkJ1ZmZlci5mcm9tKCIzMDQxMzAwZDA2MDk2MDg2NDgwMTY1MDMwNDAyMDIwNTAwMDQzMCIsImhleCIpLHNoYTUxMjpCdWZmZXIuZnJvbSgiMzA1MTMwMGQwNjA5NjA4NjQ4MDE2NTAzMDQwMjAzMDUwMDA0NDAiLCJoZXgiKSxyaXBlbWQxNjA6QnVmZmVyLmZyb20oIjMwMjEzMDA5MDYwNTJiMjQwMzAyMDEwNTAwMDQxNCIsImhleCIpLHJtZDE2MDpCdWZmZXIuZnJvbSgiMzAyMTMwMDkwNjA1MmIyNDAzMDIwMTA1MDAwNDE0IiwiaGV4Iil9O3ZhciBTSUdOX0FMR19UT19IQVNIX0FMSUFTRVM9e3JpcGVtZDE2MDoicm1kMTYwIn07dmFyIERFRkFVTFRfSEFTSF9GVU5DVElPTj0ic2hhMjU2Ijttb2R1bGUuZXhwb3J0cz17aXNFbmNyeXB0aW9uOnRydWUsaXNTaWduYXR1cmU6dHJ1ZX07bW9kdWxlLmV4cG9ydHMubWFrZVNjaGVtZT1mdW5jdGlvbihrZXksb3B0aW9ucyl7ZnVuY3Rpb24gU2NoZW1lKGtleSxvcHRpb25zKXt0aGlzLmtleT1rZXk7dGhpcy5vcHRpb25zPW9wdGlvbnN9U2NoZW1lLnByb3RvdHlwZS5tYXhNZXNzYWdlTGVuZ3RoPWZ1bmN0aW9uKCl7aWYodGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZ0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZz09Y29uc3RhbnRzLlJTQV9OT19QQURESU5HKXtyZXR1cm4gdGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aH1yZXR1cm4gdGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aC0xMX07U2NoZW1lLnByb3RvdHlwZS5lbmNQYWQ9ZnVuY3Rpb24oYnVmZmVyLG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGZpbGxlZDtpZihidWZmZXIubGVuZ3RoPnRoaXMua2V5Lm1heE1lc3NhZ2VMZW5ndGgpe3Rocm93IG5ldyBFcnJvcigiTWVzc2FnZSB0b28gbG9uZyBmb3IgUlNBIChuPSIrdGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aCsiLCBsPSIrYnVmZmVyLmxlbmd0aCsiKSIpfWlmKHRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmdGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmc9PWNvbnN0YW50cy5SU0FfTk9fUEFERElORyl7ZmlsbGVkPUJ1ZmZlci5hbGxvYyh0aGlzLmtleS5tYXhNZXNzYWdlTGVuZ3RoLWJ1ZmZlci5sZW5ndGgpO2ZpbGxlZC5maWxsKDApO3JldHVybiBCdWZmZXIuY29uY2F0KFtmaWxsZWQsYnVmZmVyXSl9aWYob3B0aW9ucy50eXBlPT09MSl7ZmlsbGVkPUJ1ZmZlci5hbGxvYyh0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoLWJ1ZmZlci5sZW5ndGgtMSk7ZmlsbGVkLmZpbGwoMjU1LDAsZmlsbGVkLmxlbmd0aC0xKTtmaWxsZWRbMF09MTtmaWxsZWRbZmlsbGVkLmxlbmd0aC0xXT0wO3JldHVybiBCdWZmZXIuY29uY2F0KFtmaWxsZWQsYnVmZmVyXSl9ZWxzZXtmaWxsZWQ9QnVmZmVyLmFsbG9jKHRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgtYnVmZmVyLmxlbmd0aCk7ZmlsbGVkWzBdPTA7ZmlsbGVkWzFdPTI7dmFyIHJhbmQ9Y3J5cHQucmFuZG9tQnl0ZXMoZmlsbGVkLmxlbmd0aC0zKTtmb3IodmFyIGk9MDtpPHJhbmQubGVuZ3RoO2krKyl7dmFyIHI9cmFuZFtpXTt3aGlsZShyPT09MCl7cj1jcnlwdC5yYW5kb21CeXRlcygxKVswXX1maWxsZWRbaSsyXT1yfWZpbGxlZFtmaWxsZWQubGVuZ3RoLTFdPTA7cmV0dXJuIEJ1ZmZlci5jb25jYXQoW2ZpbGxlZCxidWZmZXJdKX19O1NjaGVtZS5wcm90b3R5cGUuZW5jVW5QYWQ9ZnVuY3Rpb24oYnVmZmVyLG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGk9MDtpZih0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJnRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nPT1jb25zdGFudHMuUlNBX05PX1BBRERJTkcpe3ZhciB1blBhZDtpZih0eXBlb2YgYnVmZmVyLmxhc3RJbmRleE9mPT0iZnVuY3Rpb24iKXt1blBhZD1idWZmZXIuc2xpY2UoYnVmZmVyLmxhc3RJbmRleE9mKCJcMCIpKzEsYnVmZmVyLmxlbmd0aCl9ZWxzZXt1blBhZD1idWZmZXIuc2xpY2UoU3RyaW5nLnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwiXDAiKSsxLGJ1ZmZlci5sZW5ndGgpfXJldHVybiB1blBhZH1pZihidWZmZXIubGVuZ3RoPDQpe3JldHVybiBudWxsfWlmKG9wdGlvbnMudHlwZT09PTEpe2lmKGJ1ZmZlclswXSE9PTAmJmJ1ZmZlclsxXSE9PTEpe3JldHVybiBudWxsfWk9Mzt3aGlsZShidWZmZXJbaV0hPT0wKXtpZihidWZmZXJbaV0hPTI1NXx8KytpPj1idWZmZXIubGVuZ3RoKXtyZXR1cm4gbnVsbH19fWVsc2V7aWYoYnVmZmVyWzBdIT09MCYmYnVmZmVyWzFdIT09Mil7cmV0dXJuIG51bGx9aT0zO3doaWxlKGJ1ZmZlcltpXSE9PTApe2lmKCsraT49YnVmZmVyLmxlbmd0aCl7cmV0dXJuIG51bGx9fX1yZXR1cm4gYnVmZmVyLnNsaWNlKGkrMSxidWZmZXIubGVuZ3RoKX07U2NoZW1lLnByb3RvdHlwZS5zaWduPWZ1bmN0aW9uKGJ1ZmZlcil7dmFyIGhhc2hBbGdvcml0aG09dGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTjtpZih0aGlzLm9wdGlvbnMuZW52aXJvbm1lbnQ9PT0iYnJvd3NlciIpe2hhc2hBbGdvcml0aG09U0lHTl9BTEdfVE9fSEFTSF9BTElBU0VTW2hhc2hBbGdvcml0aG1dfHxoYXNoQWxnb3JpdGhtO3ZhciBoYXNoZXI9Y3J5cHQuY3JlYXRlSGFzaChoYXNoQWxnb3JpdGhtKTtoYXNoZXIudXBkYXRlKGJ1ZmZlcik7dmFyIGhhc2g9dGhpcy5wa2NzMXBhZChoYXNoZXIuZGlnZXN0KCksaGFzaEFsZ29yaXRobSk7dmFyIHJlcz10aGlzLmtleS4kZG9Qcml2YXRlKG5ldyBCaWdJbnRlZ2VyKGhhc2gpKS50b0J1ZmZlcih0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoKTtyZXR1cm4gcmVzfWVsc2V7dmFyIHNpZ25lcj1jcnlwdC5jcmVhdGVTaWduKCJSU0EtIitoYXNoQWxnb3JpdGhtLnRvVXBwZXJDYXNlKCkpO3NpZ25lci51cGRhdGUoYnVmZmVyKTtyZXR1cm4gc2lnbmVyLnNpZ24odGhpcy5vcHRpb25zLnJzYVV0aWxzLmV4cG9ydEtleSgicHJpdmF0ZSIpKX19O1NjaGVtZS5wcm90b3R5cGUudmVyaWZ5PWZ1bmN0aW9uKGJ1ZmZlcixzaWduYXR1cmUsc2lnbmF0dXJlX2VuY29kaW5nKXtjb25zb2xlLmxvZygidmVyaWZ5Iik7aWYodGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZ0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZz09Y29uc3RhbnRzLlJTQV9OT19QQURESU5HKXtyZXR1cm4gZmFsc2V9dmFyIGhhc2hBbGdvcml0aG09dGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTjtpZih0aGlzLm9wdGlvbnMuZW52aXJvbm1lbnQ9PT0iYnJvd3NlciIpe2hhc2hBbGdvcml0aG09U0lHTl9BTEdfVE9fSEFTSF9BTElBU0VTW2hhc2hBbGdvcml0aG1dfHxoYXNoQWxnb3JpdGhtO2lmKHNpZ25hdHVyZV9lbmNvZGluZyl7c2lnbmF0dXJlPUJ1ZmZlci5mcm9tKHNpZ25hdHVyZSxzaWduYXR1cmVfZW5jb2RpbmcpfXZhciBoYXNoZXI9Y3J5cHQuY3JlYXRlSGFzaChoYXNoQWxnb3JpdGhtKTtoYXNoZXIudXBkYXRlKGJ1ZmZlcik7dmFyIGhhc2g9dGhpcy5wa2NzMXBhZChoYXNoZXIuZGlnZXN0KCksaGFzaEFsZ29yaXRobSk7dmFyIG09dGhpcy5rZXkuJGRvUHVibGljKG5ldyBCaWdJbnRlZ2VyKHNpZ25hdHVyZSkpO3JldHVybiBtLnRvQnVmZmVyKCkudG9TdHJpbmcoImhleCIpPT1oYXNoLnRvU3RyaW5nKCJoZXgiKX1lbHNle3ZhciB2ZXJpZmllcj1jcnlwdC5jcmVhdGVWZXJpZnkoIlJTQS0iK2hhc2hBbGdvcml0aG0udG9VcHBlckNhc2UoKSk7dmVyaWZpZXIudXBkYXRlKGJ1ZmZlcik7cmV0dXJuIHZlcmlmaWVyLnZlcmlmeSh0aGlzLm9wdGlvbnMucnNhVXRpbHMuZXhwb3J0S2V5KCJwdWJsaWMiKSxzaWduYXR1cmUsc2lnbmF0dXJlX2VuY29kaW5nKX19O1NjaGVtZS5wcm90b3R5cGUucGtjczBwYWQ9ZnVuY3Rpb24oYnVmZmVyKXt2YXIgZmlsbGVkPUJ1ZmZlci5hbGxvYyh0aGlzLmtleS5tYXhNZXNzYWdlTGVuZ3RoLWJ1ZmZlci5sZW5ndGgpO2ZpbGxlZC5maWxsKDApO3JldHVybiBCdWZmZXIuY29uY2F0KFtmaWxsZWQsYnVmZmVyXSl9O1NjaGVtZS5wcm90b3R5cGUucGtjczB1bnBhZD1mdW5jdGlvbihidWZmZXIpe3ZhciB1blBhZDtpZih0eXBlb2YgYnVmZmVyLmxhc3RJbmRleE9mPT0iZnVuY3Rpb24iKXt1blBhZD1idWZmZXIuc2xpY2UoYnVmZmVyLmxhc3RJbmRleE9mKCJcMCIpKzEsYnVmZmVyLmxlbmd0aCl9ZWxzZXt1blBhZD1idWZmZXIuc2xpY2UoU3RyaW5nLnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwiXDAiKSsxLGJ1ZmZlci5sZW5ndGgpfXJldHVybiB1blBhZH07U2NoZW1lLnByb3RvdHlwZS5wa2NzMXBhZD1mdW5jdGlvbihoYXNoQnVmLGhhc2hBbGdvcml0aG0pe3ZhciBkaWdlc3Q9U0lHTl9JTkZPX0hFQURbaGFzaEFsZ29yaXRobV07aWYoIWRpZ2VzdCl7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGhhc2ggYWxnb3JpdGhtIil9dmFyIGRhdGE9QnVmZmVyLmNvbmNhdChbZGlnZXN0LGhhc2hCdWZdKTtpZihkYXRhLmxlbmd0aCsxMD50aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoKXt0aHJvdyBFcnJvcigiS2V5IGlzIHRvbyBzaG9ydCBmb3Igc2lnbmluZyBhbGdvcml0aG0gKCIraGFzaEFsZ29yaXRobSsiKSIpfXZhciBmaWxsZWQ9QnVmZmVyLmFsbG9jKHRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgtZGF0YS5sZW5ndGgtMSk7ZmlsbGVkLmZpbGwoMjU1LDAsZmlsbGVkLmxlbmd0aC0xKTtmaWxsZWRbMF09MTtmaWxsZWRbZmlsbGVkLmxlbmd0aC0xXT0wO3ZhciByZXM9QnVmZmVyLmNvbmNhdChbZmlsbGVkLGRhdGFdKTtyZXR1cm4gcmVzfTtyZXR1cm4gbmV3IFNjaGVtZShrZXksb3B0aW9ucyl9fSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi4vY3J5cHRvIjo0MywiLi4vbGlicy9qc2JuIjo1MixidWZmZXI6MjcsY29uc3RhbnRzOjI5fV0sNTY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBCaWdJbnRlZ2VyPXJlcXVpcmUoIi4uL2xpYnMvanNibiIpO3ZhciBjcnlwdD1yZXF1aXJlKCIuLi9jcnlwdG8iKTttb2R1bGUuZXhwb3J0cz17aXNFbmNyeXB0aW9uOmZhbHNlLGlzU2lnbmF0dXJlOnRydWV9O3ZhciBERUZBVUxUX0hBU0hfRlVOQ1RJT049InNoYTEiO3ZhciBERUZBVUxUX1NBTFRfTEVOR1RIPTIwO21vZHVsZS5leHBvcnRzLm1ha2VTY2hlbWU9ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe3ZhciBPQUVQPXJlcXVpcmUoIi4vc2NoZW1lcyIpLnBrY3MxX29hZXA7ZnVuY3Rpb24gU2NoZW1lKGtleSxvcHRpb25zKXt0aGlzLmtleT1rZXk7dGhpcy5vcHRpb25zPW9wdGlvbnN9U2NoZW1lLnByb3RvdHlwZS5zaWduPWZ1bmN0aW9uKGJ1ZmZlcil7dmFyIG1IYXNoPWNyeXB0LmNyZWF0ZUhhc2godGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTik7bUhhc2gudXBkYXRlKGJ1ZmZlcik7dmFyIGVuY29kZWQ9dGhpcy5lbXNhX3Bzc19lbmNvZGUobUhhc2guZGlnZXN0KCksdGhpcy5rZXkua2V5U2l6ZS0xKTtyZXR1cm4gdGhpcy5rZXkuJGRvUHJpdmF0ZShuZXcgQmlnSW50ZWdlcihlbmNvZGVkKSkudG9CdWZmZXIodGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aCl9O1NjaGVtZS5wcm90b3R5cGUudmVyaWZ5PWZ1bmN0aW9uKGJ1ZmZlcixzaWduYXR1cmUsc2lnbmF0dXJlX2VuY29kaW5nKXtpZihzaWduYXR1cmVfZW5jb2Rpbmcpe3NpZ25hdHVyZT1CdWZmZXIuZnJvbShzaWduYXR1cmUsc2lnbmF0dXJlX2VuY29kaW5nKX1zaWduYXR1cmU9bmV3IEJpZ0ludGVnZXIoc2lnbmF0dXJlKTt2YXIgZW1MZW49TWF0aC5jZWlsKCh0aGlzLmtleS5rZXlTaXplLTEpLzgpO3ZhciBtPXRoaXMua2V5LiRkb1B1YmxpYyhzaWduYXR1cmUpLnRvQnVmZmVyKGVtTGVuKTt2YXIgbUhhc2g9Y3J5cHQuY3JlYXRlSGFzaCh0aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OKTttSGFzaC51cGRhdGUoYnVmZmVyKTtyZXR1cm4gdGhpcy5lbXNhX3Bzc192ZXJpZnkobUhhc2guZGlnZXN0KCksbSx0aGlzLmtleS5rZXlTaXplLTEpfTtTY2hlbWUucHJvdG90eXBlLmVtc2FfcHNzX2VuY29kZT1mdW5jdGlvbihtSGFzaCxlbUJpdHMpe3ZhciBoYXNoPXRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT047dmFyIG1nZj10aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMubWdmfHxPQUVQLmVtZV9vYWVwX21nZjE7dmFyIHNMZW49dGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLnNhbHRMZW5ndGh8fERFRkFVTFRfU0FMVF9MRU5HVEg7dmFyIGhMZW49T0FFUC5kaWdlc3RMZW5ndGhbaGFzaF07dmFyIGVtTGVuPU1hdGguY2VpbChlbUJpdHMvOCk7aWYoZW1MZW48aExlbitzTGVuKzIpe3Rocm93IG5ldyBFcnJvcigiT3V0cHV0IGxlbmd0aCBwYXNzZWQgdG8gZW1CaXRzKCIrZW1CaXRzKyIpIGlzIHRvbyBzbWFsbCBmb3IgdGhlIG9wdGlvbnMgIisic3BlY2lmaWVkKCIraGFzaCsiLCAiK3NMZW4rIikuIFRvIGZpeCB0aGlzIGlzc3VlIGluY3JlYXNlIHRoZSB2YWx1ZSBvZiBlbUJpdHMuIChtaW5pbXVtIHNpemU6ICIrKDgqaExlbis4KnNMZW4rOSkrIikiKX12YXIgc2FsdD1jcnlwdC5yYW5kb21CeXRlcyhzTGVuKTt2YXIgTWFwb3N0cm9waGU9QnVmZmVyLmFsbG9jKDgraExlbitzTGVuKTtNYXBvc3Ryb3BoZS5maWxsKDAsMCw4KTttSGFzaC5jb3B5KE1hcG9zdHJvcGhlLDgpO3NhbHQuY29weShNYXBvc3Ryb3BoZSw4K21IYXNoLmxlbmd0aCk7dmFyIEg9Y3J5cHQuY3JlYXRlSGFzaChoYXNoKTtILnVwZGF0ZShNYXBvc3Ryb3BoZSk7SD1ILmRpZ2VzdCgpO3ZhciBQUz1CdWZmZXIuYWxsb2MoZW1MZW4tc2FsdC5sZW5ndGgtaExlbi0yKTtQUy5maWxsKDApO3ZhciBEQj1CdWZmZXIuYWxsb2MoUFMubGVuZ3RoKzErc2FsdC5sZW5ndGgpO1BTLmNvcHkoREIpO0RCW1BTLmxlbmd0aF09MTtzYWx0LmNvcHkoREIsUFMubGVuZ3RoKzEpO3ZhciBkYk1hc2s9bWdmKEgsREIubGVuZ3RoLGhhc2gpO3ZhciBtYXNrZWREQj1CdWZmZXIuYWxsb2MoREIubGVuZ3RoKTtmb3IodmFyIGk9MDtpPGRiTWFzay5sZW5ndGg7aSsrKXttYXNrZWREQltpXT1EQltpXV5kYk1hc2tbaV19dmFyIGJpdHM9OCplbUxlbi1lbUJpdHM7dmFyIG1hc2s9MjU1XjI1NT4+OC1iaXRzPDw4LWJpdHM7bWFza2VkREJbMF09bWFza2VkREJbMF0mbWFzazt2YXIgRU09QnVmZmVyLmFsbG9jKG1hc2tlZERCLmxlbmd0aCtILmxlbmd0aCsxKTttYXNrZWREQi5jb3B5KEVNLDApO0guY29weShFTSxtYXNrZWREQi5sZW5ndGgpO0VNW0VNLmxlbmd0aC0xXT0xODg7cmV0dXJuIEVNfTtTY2hlbWUucHJvdG90eXBlLmVtc2FfcHNzX3ZlcmlmeT1mdW5jdGlvbihtSGFzaCxFTSxlbUJpdHMpe3ZhciBoYXNoPXRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT047dmFyIG1nZj10aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMubWdmfHxPQUVQLmVtZV9vYWVwX21nZjE7dmFyIHNMZW49dGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLnNhbHRMZW5ndGh8fERFRkFVTFRfU0FMVF9MRU5HVEg7dmFyIGhMZW49T0FFUC5kaWdlc3RMZW5ndGhbaGFzaF07dmFyIGVtTGVuPU1hdGguY2VpbChlbUJpdHMvOCk7aWYoZW1MZW48aExlbitzTGVuKzJ8fEVNW0VNLmxlbmd0aC0xXSE9MTg4KXtyZXR1cm4gZmFsc2V9dmFyIERCPUJ1ZmZlci5hbGxvYyhlbUxlbi1oTGVuLTEpO0VNLmNvcHkoREIsMCwwLGVtTGVuLWhMZW4tMSk7dmFyIG1hc2s9MDtmb3IodmFyIGk9MCxiaXRzPTgqZW1MZW4tZW1CaXRzO2k8Yml0cztpKyspe21hc2t8PTE8PDctaX1pZigoREJbMF0mbWFzaykhPT0wKXtyZXR1cm4gZmFsc2V9dmFyIEg9RU0uc2xpY2UoZW1MZW4taExlbi0xLGVtTGVuLTEpO3ZhciBkYk1hc2s9bWdmKEgsREIubGVuZ3RoLGhhc2gpO2ZvcihpPTA7aTxEQi5sZW5ndGg7aSsrKXtEQltpXV49ZGJNYXNrW2ldfWJpdHM9OCplbUxlbi1lbUJpdHM7bWFzaz0yNTVeMjU1Pj44LWJpdHM8PDgtYml0cztEQlswXT1EQlswXSZtYXNrO2ZvcihpPTA7REJbaV09PT0wJiZpPERCLmxlbmd0aDtpKyspO2lmKERCW2ldIT0xKXtyZXR1cm4gZmFsc2V9dmFyIHNhbHQ9REIuc2xpY2UoREIubGVuZ3RoLXNMZW4pO3ZhciBNYXBvc3Ryb3BoZT1CdWZmZXIuYWxsb2MoOCtoTGVuK3NMZW4pO01hcG9zdHJvcGhlLmZpbGwoMCwwLDgpO21IYXNoLmNvcHkoTWFwb3N0cm9waGUsOCk7c2FsdC5jb3B5KE1hcG9zdHJvcGhlLDgrbUhhc2gubGVuZ3RoKTt2YXIgSGFwb3N0cm9waGU9Y3J5cHQuY3JlYXRlSGFzaChoYXNoKTtIYXBvc3Ryb3BoZS51cGRhdGUoTWFwb3N0cm9waGUpO0hhcG9zdHJvcGhlPUhhcG9zdHJvcGhlLmRpZ2VzdCgpO3JldHVybiBILnRvU3RyaW5nKCJoZXgiKT09PUhhcG9zdHJvcGhlLnRvU3RyaW5nKCJoZXgiKX07cmV0dXJuIG5ldyBTY2hlbWUoa2V5LG9wdGlvbnMpfX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4uL2NyeXB0byI6NDMsIi4uL2xpYnMvanNibiI6NTIsIi4vc2NoZW1lcyI6NTcsYnVmZmVyOjI3fV0sNTc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtwa2NzMTpyZXF1aXJlKCIuL3BrY3MxIikscGtjczFfb2FlcDpyZXF1aXJlKCIuL29hZXAiKSxwc3M6cmVxdWlyZSgiLi9wc3MiKSxpc0VuY3J5cHRpb246ZnVuY3Rpb24oc2NoZW1lKXtyZXR1cm4gbW9kdWxlLmV4cG9ydHNbc2NoZW1lXSYmbW9kdWxlLmV4cG9ydHNbc2NoZW1lXS5pc0VuY3J5cHRpb259LGlzU2lnbmF0dXJlOmZ1bmN0aW9uKHNjaGVtZSl7cmV0dXJuIG1vZHVsZS5leHBvcnRzW3NjaGVtZV0mJm1vZHVsZS5leHBvcnRzW3NjaGVtZV0uaXNTaWduYXR1cmV9fX0seyIuL29hZXAiOjU0LCIuL3BrY3MxIjo1NSwiLi9wc3MiOjU2fV0sNTg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzLmxpbmVicms9ZnVuY3Rpb24oc3RyLG1heExlbil7dmFyIHJlcz0iIjt2YXIgaT0wO3doaWxlKGkrbWF4TGVuPHN0ci5sZW5ndGgpe3Jlcys9c3RyLnN1YnN0cmluZyhpLGkrbWF4TGVuKSsiXG4iO2krPW1heExlbn1yZXR1cm4gcmVzK3N0ci5zdWJzdHJpbmcoaSxzdHIubGVuZ3RoKX07bW9kdWxlLmV4cG9ydHMuZGV0ZWN0RW52aXJvbm1lbnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdHlwZW9mIHdpbmRvdyE9PSJ1bmRlZmluZWQifHx0eXBlb2Ygc2VsZiE9PSJ1bmRlZmluZWQiJiYhIXNlbGYucG9zdE1lc3NhZ2U/ImJyb3dzZXIiOiJub2RlIn07bW9kdWxlLmV4cG9ydHMuZ2V0MzJJbnRGcm9tQnVmZmVyPWZ1bmN0aW9uKGJ1ZmZlcixvZmZzZXQpe29mZnNldD1vZmZzZXR8fDA7dmFyIHNpemU9MDtpZigoc2l6ZT1idWZmZXIubGVuZ3RoLW9mZnNldCk+MCl7aWYoc2l6ZT49NCl7cmV0dXJuIGJ1ZmZlci5yZWFkVUludDMyQkUob2Zmc2V0KX1lbHNle3ZhciByZXM9MDtmb3IodmFyIGk9b2Zmc2V0K3NpemUsZD0wO2k+b2Zmc2V0O2ktLSxkKz0yKXtyZXMrPWJ1ZmZlcltpLTFdKk1hdGgucG93KDE2LGQpfXJldHVybiByZXN9fWVsc2V7cmV0dXJuIE5hTn19O21vZHVsZS5leHBvcnRzLl89e2lzT2JqZWN0OmZ1bmN0aW9uKHZhbHVlKXt2YXIgdHlwZT10eXBlb2YgdmFsdWU7cmV0dXJuISF2YWx1ZSYmKHR5cGU9PSJvYmplY3QifHx0eXBlPT0iZnVuY3Rpb24iKX0saXNTdHJpbmc6ZnVuY3Rpb24odmFsdWUpe3JldHVybiB0eXBlb2YgdmFsdWU9PSJzdHJpbmcifHx2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZ30saXNOdW1iZXI6ZnVuY3Rpb24odmFsdWUpe3JldHVybiB0eXBlb2YgdmFsdWU9PSJudW1iZXIifHwhaXNOYU4ocGFyc2VGbG9hdCh2YWx1ZSkpJiZpc0Zpbml0ZSh2YWx1ZSl9LG9taXQ6ZnVuY3Rpb24ob2JqLHJlbW92ZVByb3Ape3ZhciBuZXdPYmo9e307Zm9yKHZhciBwcm9wIGluIG9iail7aWYoIW9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKXx8cHJvcD09PXJlbW92ZVByb3Ape2NvbnRpbnVlfW5ld09ialtwcm9wXT1vYmpbcHJvcF19cmV0dXJuIG5ld09ian19O21vZHVsZS5leHBvcnRzLnRyaW1TdXJyb3VuZGluZ1RleHQ9ZnVuY3Rpb24oZGF0YSxvcGVuaW5nLGNsb3Npbmcpe3ZhciB0cmltU3RhcnRJbmRleD0wO3ZhciB0cmltRW5kSW5kZXg9ZGF0YS5sZW5ndGg7dmFyIG9wZW5pbmdCb3VuZGFyeUluZGV4PWRhdGEuaW5kZXhPZihvcGVuaW5nKTtpZihvcGVuaW5nQm91bmRhcnlJbmRleD49MCl7dHJpbVN0YXJ0SW5kZXg9b3BlbmluZ0JvdW5kYXJ5SW5kZXgrb3BlbmluZy5sZW5ndGh9dmFyIGNsb3NpbmdCb3VuZGFyeUluZGV4PWRhdGEuaW5kZXhPZihjbG9zaW5nLG9wZW5pbmdCb3VuZGFyeUluZGV4KTtpZihjbG9zaW5nQm91bmRhcnlJbmRleD49MCl7dHJpbUVuZEluZGV4PWNsb3NpbmdCb3VuZGFyeUluZGV4fXJldHVybiBkYXRhLnN1YnN0cmluZyh0cmltU3RhcnRJbmRleCx0cmltRW5kSW5kZXgpfX0se31dLDU5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIGdldE93blByb3BlcnR5U3ltYm9scz1PYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO3ZhciBoYXNPd25Qcm9wZXJ0eT1PYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O3ZhciBwcm9wSXNFbnVtZXJhYmxlPU9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7ZnVuY3Rpb24gdG9PYmplY3QodmFsKXtpZih2YWw9PT1udWxsfHx2YWw9PT11bmRlZmluZWQpe3Rocm93IG5ldyBUeXBlRXJyb3IoIk9iamVjdC5hc3NpZ24gY2Fubm90IGJlIGNhbGxlZCB3aXRoIG51bGwgb3IgdW5kZWZpbmVkIil9cmV0dXJuIE9iamVjdCh2YWwpfWZ1bmN0aW9uIHNob3VsZFVzZU5hdGl2ZSgpe3RyeXtpZighT2JqZWN0LmFzc2lnbil7cmV0dXJuIGZhbHNlfXZhciB0ZXN0MT1uZXcgU3RyaW5nKCJhYmMiKTt0ZXN0MVs1XT0iZGUiO2lmKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QxKVswXT09PSI1Iil7cmV0dXJuIGZhbHNlfXZhciB0ZXN0Mj17fTtmb3IodmFyIGk9MDtpPDEwO2krKyl7dGVzdDJbIl8iK1N0cmluZy5mcm9tQ2hhckNvZGUoaSldPWl9dmFyIG9yZGVyMj1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MikubWFwKGZ1bmN0aW9uKG4pe3JldHVybiB0ZXN0MltuXX0pO2lmKG9yZGVyMi5qb2luKCIiKSE9PSIwMTIzNDU2Nzg5Iil7cmV0dXJuIGZhbHNlfXZhciB0ZXN0Mz17fTsiYWJjZGVmZ2hpamtsbW5vcHFyc3QiLnNwbGl0KCIiKS5mb3JFYWNoKGZ1bmN0aW9uKGxldHRlcil7dGVzdDNbbGV0dGVyXT1sZXR0ZXJ9KTtpZihPYmplY3Qua2V5cyhPYmplY3QuYXNzaWduKHt9LHRlc3QzKSkuam9pbigiIikhPT0iYWJjZGVmZ2hpamtsbW5vcHFyc3QiKXtyZXR1cm4gZmFsc2V9cmV0dXJuIHRydWV9Y2F0Y2goZXJyKXtyZXR1cm4gZmFsc2V9fW1vZHVsZS5leHBvcnRzPXNob3VsZFVzZU5hdGl2ZSgpP09iamVjdC5hc3NpZ246ZnVuY3Rpb24odGFyZ2V0LHNvdXJjZSl7dmFyIGZyb207dmFyIHRvPXRvT2JqZWN0KHRhcmdldCk7dmFyIHN5bWJvbHM7Zm9yKHZhciBzPTE7czxhcmd1bWVudHMubGVuZ3RoO3MrKyl7ZnJvbT1PYmplY3QoYXJndW1lbnRzW3NdKTtmb3IodmFyIGtleSBpbiBmcm9tKXtpZihoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sa2V5KSl7dG9ba2V5XT1mcm9tW2tleV19fWlmKGdldE93blByb3BlcnR5U3ltYm9scyl7c3ltYm9scz1nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZnJvbSk7Zm9yKHZhciBpPTA7aTxzeW1ib2xzLmxlbmd0aDtpKyspe2lmKHByb3BJc0VudW1lcmFibGUuY2FsbChmcm9tLHN5bWJvbHNbaV0pKXt0b1tzeW1ib2xzW2ldXT1mcm9tW3N5bWJvbHNbaV1dfX19fXJldHVybiB0b319LHt9XSw2MDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7ZXhwb3J0cy5wYmtkZjI9cmVxdWlyZSgiLi9saWIvYXN5bmMiKTtleHBvcnRzLnBia2RmMlN5bmM9cmVxdWlyZSgiLi9saWIvc3luYyIpfSx7Ii4vbGliL2FzeW5jIjo2MSwiLi9saWIvc3luYyI6NjR9XSw2MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHByb2Nlc3MsZ2xvYmFsKXt2YXIgY2hlY2tQYXJhbWV0ZXJzPXJlcXVpcmUoIi4vcHJlY29uZGl0aW9uIik7dmFyIGRlZmF1bHRFbmNvZGluZz1yZXF1aXJlKCIuL2RlZmF1bHQtZW5jb2RpbmciKTt2YXIgc3luYz1yZXF1aXJlKCIuL3N5bmMiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBaRVJPX0JVRjt2YXIgc3VidGxlPWdsb2JhbC5jcnlwdG8mJmdsb2JhbC5jcnlwdG8uc3VidGxlO3ZhciB0b0Jyb3dzZXI9e3NoYToiU0hBLTEiLCJzaGEtMSI6IlNIQS0xIixzaGExOiJTSEEtMSIsc2hhMjU2OiJTSEEtMjU2Iiwic2hhLTI1NiI6IlNIQS0yNTYiLHNoYTM4NDoiU0hBLTM4NCIsInNoYS0zODQiOiJTSEEtMzg0Iiwic2hhLTUxMiI6IlNIQS01MTIiLHNoYTUxMjoiU0hBLTUxMiJ9O3ZhciBjaGVja3M9W107ZnVuY3Rpb24gY2hlY2tOYXRpdmUoYWxnbyl7aWYoZ2xvYmFsLnByb2Nlc3MmJiFnbG9iYWwucHJvY2Vzcy5icm93c2VyKXtyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKX1pZighc3VidGxlfHwhc3VidGxlLmltcG9ydEtleXx8IXN1YnRsZS5kZXJpdmVCaXRzKXtyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKX1pZihjaGVja3NbYWxnb10hPT11bmRlZmluZWQpe3JldHVybiBjaGVja3NbYWxnb119WkVST19CVUY9WkVST19CVUZ8fEJ1ZmZlci5hbGxvYyg4KTt2YXIgcHJvbT1icm93c2VyUGJrZGYyKFpFUk9fQlVGLFpFUk9fQlVGLDEwLDEyOCxhbGdvKS50aGVuKGZ1bmN0aW9uKCl7cmV0dXJuIHRydWV9KS5jYXRjaChmdW5jdGlvbigpe3JldHVybiBmYWxzZX0pO2NoZWNrc1thbGdvXT1wcm9tO3JldHVybiBwcm9tfWZ1bmN0aW9uIGJyb3dzZXJQYmtkZjIocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGxlbmd0aCxhbGdvKXtyZXR1cm4gc3VidGxlLmltcG9ydEtleSgicmF3IixwYXNzd29yZCx7bmFtZToiUEJLREYyIn0sZmFsc2UsWyJkZXJpdmVCaXRzIl0pLnRoZW4oZnVuY3Rpb24oa2V5KXtyZXR1cm4gc3VidGxlLmRlcml2ZUJpdHMoe25hbWU6IlBCS0RGMiIsc2FsdDpzYWx0LGl0ZXJhdGlvbnM6aXRlcmF0aW9ucyxoYXNoOntuYW1lOmFsZ299fSxrZXksbGVuZ3RoPDwzKX0pLnRoZW4oZnVuY3Rpb24ocmVzKXtyZXR1cm4gQnVmZmVyLmZyb20ocmVzKX0pfWZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHByb21pc2UsY2FsbGJhY2spe3Byb21pc2UudGhlbihmdW5jdGlvbihvdXQpe3Byb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKXtjYWxsYmFjayhudWxsLG91dCl9KX0sZnVuY3Rpb24oZSl7cHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpe2NhbGxiYWNrKGUpfSl9KX1tb2R1bGUuZXhwb3J0cz1mdW5jdGlvbihwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsa2V5bGVuLGRpZ2VzdCxjYWxsYmFjayl7aWYodHlwZW9mIGRpZ2VzdD09PSJmdW5jdGlvbiIpe2NhbGxiYWNrPWRpZ2VzdDtkaWdlc3Q9dW5kZWZpbmVkfWRpZ2VzdD1kaWdlc3R8fCJzaGExIjt2YXIgYWxnbz10b0Jyb3dzZXJbZGlnZXN0LnRvTG93ZXJDYXNlKCldO2lmKCFhbGdvfHx0eXBlb2YgZ2xvYmFsLlByb21pc2UhPT0iZnVuY3Rpb24iKXtyZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpe3ZhciBvdXQ7dHJ5e291dD1zeW5jKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxrZXlsZW4sZGlnZXN0KX1jYXRjaChlKXtyZXR1cm4gY2FsbGJhY2soZSl9Y2FsbGJhY2sobnVsbCxvdXQpfSl9Y2hlY2tQYXJhbWV0ZXJzKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxrZXlsZW4pO2lmKHR5cGVvZiBjYWxsYmFjayE9PSJmdW5jdGlvbiIpdGhyb3cgbmV3IEVycm9yKCJObyBjYWxsYmFjayBwcm92aWRlZCB0byBwYmtkZjIiKTtpZighQnVmZmVyLmlzQnVmZmVyKHBhc3N3b3JkKSlwYXNzd29yZD1CdWZmZXIuZnJvbShwYXNzd29yZCxkZWZhdWx0RW5jb2RpbmcpO2lmKCFCdWZmZXIuaXNCdWZmZXIoc2FsdCkpc2FsdD1CdWZmZXIuZnJvbShzYWx0LGRlZmF1bHRFbmNvZGluZyk7cmVzb2x2ZVByb21pc2UoY2hlY2tOYXRpdmUoYWxnbykudGhlbihmdW5jdGlvbihyZXNwKXtpZihyZXNwKXJldHVybiBicm93c2VyUGJrZGYyKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxrZXlsZW4sYWxnbyk7cmV0dXJuIHN5bmMocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGtleWxlbixkaWdlc3QpfSksY2FsbGJhY2spfX0pLmNhbGwodGhpcyxyZXF1aXJlKCJfcHJvY2VzcyIpLHR5cGVvZiBnbG9iYWwhPT0idW5kZWZpbmVkIj9nbG9iYWw6dHlwZW9mIHNlbGYhPT0idW5kZWZpbmVkIj9zZWxmOnR5cGVvZiB3aW5kb3chPT0idW5kZWZpbmVkIj93aW5kb3c6e30pfSx7Ii4vZGVmYXVsdC1lbmNvZGluZyI6NjIsIi4vcHJlY29uZGl0aW9uIjo2MywiLi9zeW5jIjo2NCxfcHJvY2Vzczo2Niwic2FmZS1idWZmZXIiOjgyfV0sNjI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihwcm9jZXNzKXt2YXIgZGVmYXVsdEVuY29kaW5nO2lmKHByb2Nlc3MuYnJvd3Nlcil7ZGVmYXVsdEVuY29kaW5nPSJ1dGYtOCJ9ZWxzZXt2YXIgcFZlcnNpb25NYWpvcj1wYXJzZUludChwcm9jZXNzLnZlcnNpb24uc3BsaXQoIi4iKVswXS5zbGljZSgxKSwxMCk7ZGVmYXVsdEVuY29kaW5nPXBWZXJzaW9uTWFqb3I+PTY/InV0Zi04IjoiYmluYXJ5In1tb2R1bGUuZXhwb3J0cz1kZWZhdWx0RW5jb2Rpbmd9KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSl9LHtfcHJvY2Vzczo2Nn1dLDYzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgTUFYX0FMTE9DPU1hdGgucG93KDIsMzApLTE7ZnVuY3Rpb24gY2hlY2tCdWZmZXIoYnVmLG5hbWUpe2lmKHR5cGVvZiBidWYhPT0ic3RyaW5nIiYmIUJ1ZmZlci5pc0J1ZmZlcihidWYpKXt0aHJvdyBuZXcgVHlwZUVycm9yKG5hbWUrIiBtdXN0IGJlIGEgYnVmZmVyIG9yIHN0cmluZyIpfX1tb2R1bGUuZXhwb3J0cz1mdW5jdGlvbihwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsa2V5bGVuKXtjaGVja0J1ZmZlcihwYXNzd29yZCwiUGFzc3dvcmQiKTtjaGVja0J1ZmZlcihzYWx0LCJTYWx0Iik7aWYodHlwZW9mIGl0ZXJhdGlvbnMhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiSXRlcmF0aW9ucyBub3QgYSBudW1iZXIiKX1pZihpdGVyYXRpb25zPDApe3Rocm93IG5ldyBUeXBlRXJyb3IoIkJhZCBpdGVyYXRpb25zIil9aWYodHlwZW9mIGtleWxlbiE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJLZXkgbGVuZ3RoIG5vdCBhIG51bWJlciIpfWlmKGtleWxlbjwwfHxrZXlsZW4+TUFYX0FMTE9DfHxrZXlsZW4hPT1rZXlsZW4pe3Rocm93IG5ldyBUeXBlRXJyb3IoIkJhZCBrZXkgbGVuZ3RoIil9fX0pLmNhbGwodGhpcyx7aXNCdWZmZXI6cmVxdWlyZSgiLi4vLi4vaXMtYnVmZmVyL2luZGV4LmpzIil9KX0seyIuLi8uLi9pcy1idWZmZXIvaW5kZXguanMiOjM3fV0sNjQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBtZDU9cmVxdWlyZSgiY3JlYXRlLWhhc2gvbWQ1Iik7dmFyIFJJUEVNRDE2MD1yZXF1aXJlKCJyaXBlbWQxNjAiKTt2YXIgc2hhPXJlcXVpcmUoInNoYS5qcyIpO3ZhciBjaGVja1BhcmFtZXRlcnM9cmVxdWlyZSgiLi9wcmVjb25kaXRpb24iKTt2YXIgZGVmYXVsdEVuY29kaW5nPXJlcXVpcmUoIi4vZGVmYXVsdC1lbmNvZGluZyIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIFpFUk9TPUJ1ZmZlci5hbGxvYygxMjgpO3ZhciBzaXplcz17bWQ1OjE2LHNoYTE6MjAsc2hhMjI0OjI4LHNoYTI1NjozMixzaGEzODQ6NDgsc2hhNTEyOjY0LHJtZDE2MDoyMCxyaXBlbWQxNjA6MjB9O2Z1bmN0aW9uIEhtYWMoYWxnLGtleSxzYWx0TGVuKXt2YXIgaGFzaD1nZXREaWdlc3QoYWxnKTt2YXIgYmxvY2tzaXplPWFsZz09PSJzaGE1MTIifHxhbGc9PT0ic2hhMzg0Ij8xMjg6NjQ7aWYoa2V5Lmxlbmd0aD5ibG9ja3NpemUpe2tleT1oYXNoKGtleSl9ZWxzZSBpZihrZXkubGVuZ3RoPGJsb2Nrc2l6ZSl7a2V5PUJ1ZmZlci5jb25jYXQoW2tleSxaRVJPU10sYmxvY2tzaXplKX12YXIgaXBhZD1CdWZmZXIuYWxsb2NVbnNhZmUoYmxvY2tzaXplK3NpemVzW2FsZ10pO3ZhciBvcGFkPUJ1ZmZlci5hbGxvY1Vuc2FmZShibG9ja3NpemUrc2l6ZXNbYWxnXSk7Zm9yKHZhciBpPTA7aTxibG9ja3NpemU7aSsrKXtpcGFkW2ldPWtleVtpXV41NDtvcGFkW2ldPWtleVtpXV45Mn12YXIgaXBhZDE9QnVmZmVyLmFsbG9jVW5zYWZlKGJsb2Nrc2l6ZStzYWx0TGVuKzQpO2lwYWQuY29weShpcGFkMSwwLDAsYmxvY2tzaXplKTt0aGlzLmlwYWQxPWlwYWQxO3RoaXMuaXBhZDI9aXBhZDt0aGlzLm9wYWQ9b3BhZDt0aGlzLmFsZz1hbGc7dGhpcy5ibG9ja3NpemU9YmxvY2tzaXplO3RoaXMuaGFzaD1oYXNoO3RoaXMuc2l6ZT1zaXplc1thbGddfUhtYWMucHJvdG90eXBlLnJ1bj1mdW5jdGlvbihkYXRhLGlwYWQpe2RhdGEuY29weShpcGFkLHRoaXMuYmxvY2tzaXplKTt2YXIgaD10aGlzLmhhc2goaXBhZCk7aC5jb3B5KHRoaXMub3BhZCx0aGlzLmJsb2Nrc2l6ZSk7cmV0dXJuIHRoaXMuaGFzaCh0aGlzLm9wYWQpfTtmdW5jdGlvbiBnZXREaWdlc3QoYWxnKXtmdW5jdGlvbiBzaGFGdW5jKGRhdGEpe3JldHVybiBzaGEoYWxnKS51cGRhdGUoZGF0YSkuZGlnZXN0KCl9ZnVuY3Rpb24gcm1kMTYwRnVuYyhkYXRhKXtyZXR1cm4obmV3IFJJUEVNRDE2MCkudXBkYXRlKGRhdGEpLmRpZ2VzdCgpfWlmKGFsZz09PSJybWQxNjAifHxhbGc9PT0icmlwZW1kMTYwIilyZXR1cm4gcm1kMTYwRnVuYztpZihhbGc9PT0ibWQ1IilyZXR1cm4gbWQ1O3JldHVybiBzaGFGdW5jfWZ1bmN0aW9uIHBia2RmMihwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsa2V5bGVuLGRpZ2VzdCl7Y2hlY2tQYXJhbWV0ZXJzKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxrZXlsZW4pO2lmKCFCdWZmZXIuaXNCdWZmZXIocGFzc3dvcmQpKXBhc3N3b3JkPUJ1ZmZlci5mcm9tKHBhc3N3b3JkLGRlZmF1bHRFbmNvZGluZyk7aWYoIUJ1ZmZlci5pc0J1ZmZlcihzYWx0KSlzYWx0PUJ1ZmZlci5mcm9tKHNhbHQsZGVmYXVsdEVuY29kaW5nKTtkaWdlc3Q9ZGlnZXN0fHwic2hhMSI7dmFyIGhtYWM9bmV3IEhtYWMoZGlnZXN0LHBhc3N3b3JkLHNhbHQubGVuZ3RoKTt2YXIgREs9QnVmZmVyLmFsbG9jVW5zYWZlKGtleWxlbik7dmFyIGJsb2NrMT1CdWZmZXIuYWxsb2NVbnNhZmUoc2FsdC5sZW5ndGgrNCk7c2FsdC5jb3B5KGJsb2NrMSwwLDAsc2FsdC5sZW5ndGgpO3ZhciBkZXN0UG9zPTA7dmFyIGhMZW49c2l6ZXNbZGlnZXN0XTt2YXIgbD1NYXRoLmNlaWwoa2V5bGVuL2hMZW4pO2Zvcih2YXIgaT0xO2k8PWw7aSsrKXtibG9jazEud3JpdGVVSW50MzJCRShpLHNhbHQubGVuZ3RoKTt2YXIgVD1obWFjLnJ1bihibG9jazEsaG1hYy5pcGFkMSk7dmFyIFU9VDtmb3IodmFyIGo9MTtqPGl0ZXJhdGlvbnM7aisrKXtVPWhtYWMucnVuKFUsaG1hYy5pcGFkMik7Zm9yKHZhciBrPTA7azxoTGVuO2srKylUW2tdXj1VW2tdfVQuY29weShESyxkZXN0UG9zKTtkZXN0UG9zKz1oTGVufXJldHVybiBES31tb2R1bGUuZXhwb3J0cz1wYmtkZjJ9LHsiLi9kZWZhdWx0LWVuY29kaW5nIjo2MiwiLi9wcmVjb25kaXRpb24iOjYzLCJjcmVhdGUtaGFzaC9tZDUiOjMyLHJpcGVtZDE2MDo4MSwic2FmZS1idWZmZXIiOjgyLCJzaGEuanMiOjk0fV0sNjU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihwcm9jZXNzKXsidXNlIHN0cmljdCI7aWYodHlwZW9mIHByb2Nlc3M9PT0idW5kZWZpbmVkInx8IXByb2Nlc3MudmVyc2lvbnx8cHJvY2Vzcy52ZXJzaW9uLmluZGV4T2YoInYwLiIpPT09MHx8cHJvY2Vzcy52ZXJzaW9uLmluZGV4T2YoInYxLiIpPT09MCYmcHJvY2Vzcy52ZXJzaW9uLmluZGV4T2YoInYxLjguIikhPT0wKXttb2R1bGUuZXhwb3J0cz17bmV4dFRpY2s6bmV4dFRpY2t9fWVsc2V7bW9kdWxlLmV4cG9ydHM9cHJvY2Vzc31mdW5jdGlvbiBuZXh0VGljayhmbixhcmcxLGFyZzIsYXJnMyl7aWYodHlwZW9mIGZuIT09ImZ1bmN0aW9uIil7dGhyb3cgbmV3IFR5cGVFcnJvcignImNhbGxiYWNrIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKX12YXIgbGVuPWFyZ3VtZW50cy5sZW5ndGg7dmFyIGFyZ3MsaTtzd2l0Y2gobGVuKXtjYXNlIDA6Y2FzZSAxOnJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZuKTtjYXNlIDI6cmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gYWZ0ZXJUaWNrT25lKCl7Zm4uY2FsbChudWxsLGFyZzEpfSk7Y2FzZSAzOnJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uIGFmdGVyVGlja1R3bygpe2ZuLmNhbGwobnVsbCxhcmcxLGFyZzIpfSk7Y2FzZSA0OnJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uIGFmdGVyVGlja1RocmVlKCl7Zm4uY2FsbChudWxsLGFyZzEsYXJnMixhcmczKX0pO2RlZmF1bHQ6YXJncz1uZXcgQXJyYXkobGVuLTEpO2k9MDt3aGlsZShpPGFyZ3MubGVuZ3RoKXthcmdzW2krK109YXJndW1lbnRzW2ldfXJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uIGFmdGVyVGljaygpe2ZuLmFwcGx5KG51bGwsYXJncyl9KX19fSkuY2FsbCh0aGlzLHJlcXVpcmUoIl9wcm9jZXNzIikpfSx7X3Byb2Nlc3M6NjZ9XSw2NjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIHByb2Nlc3M9bW9kdWxlLmV4cG9ydHM9e307dmFyIGNhY2hlZFNldFRpbWVvdXQ7dmFyIGNhY2hlZENsZWFyVGltZW91dDtmdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCl7dGhyb3cgbmV3IEVycm9yKCJzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkIil9ZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCgpe3Rocm93IG5ldyBFcnJvcigiY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkIil9KGZ1bmN0aW9uKCl7dHJ5e2lmKHR5cGVvZiBzZXRUaW1lb3V0PT09ImZ1bmN0aW9uIil7Y2FjaGVkU2V0VGltZW91dD1zZXRUaW1lb3V0fWVsc2V7Y2FjaGVkU2V0VGltZW91dD1kZWZhdWx0U2V0VGltb3V0fX1jYXRjaChlKXtjYWNoZWRTZXRUaW1lb3V0PWRlZmF1bHRTZXRUaW1vdXR9dHJ5e2lmKHR5cGVvZiBjbGVhclRpbWVvdXQ9PT0iZnVuY3Rpb24iKXtjYWNoZWRDbGVhclRpbWVvdXQ9Y2xlYXJUaW1lb3V0fWVsc2V7Y2FjaGVkQ2xlYXJUaW1lb3V0PWRlZmF1bHRDbGVhclRpbWVvdXR9fWNhdGNoKGUpe2NhY2hlZENsZWFyVGltZW91dD1kZWZhdWx0Q2xlYXJUaW1lb3V0fX0pKCk7ZnVuY3Rpb24gcnVuVGltZW91dChmdW4pe2lmKGNhY2hlZFNldFRpbWVvdXQ9PT1zZXRUaW1lb3V0KXtyZXR1cm4gc2V0VGltZW91dChmdW4sMCl9aWYoKGNhY2hlZFNldFRpbWVvdXQ9PT1kZWZhdWx0U2V0VGltb3V0fHwhY2FjaGVkU2V0VGltZW91dCkmJnNldFRpbWVvdXQpe2NhY2hlZFNldFRpbWVvdXQ9c2V0VGltZW91dDtyZXR1cm4gc2V0VGltZW91dChmdW4sMCl9dHJ5e3JldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwwKX1jYXRjaChlKXt0cnl7cmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLGZ1biwwKX1jYXRjaChlKXtyZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsZnVuLDApfX19ZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcil7aWYoY2FjaGVkQ2xlYXJUaW1lb3V0PT09Y2xlYXJUaW1lb3V0KXtyZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcil9aWYoKGNhY2hlZENsZWFyVGltZW91dD09PWRlZmF1bHRDbGVhclRpbWVvdXR8fCFjYWNoZWRDbGVhclRpbWVvdXQpJiZjbGVhclRpbWVvdXQpe2NhY2hlZENsZWFyVGltZW91dD1jbGVhclRpbWVvdXQ7cmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpfXRyeXtyZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcil9Y2F0Y2goZSl7dHJ5e3JldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLG1hcmtlcil9Y2F0Y2goZSl7cmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsbWFya2VyKX19fXZhciBxdWV1ZT1bXTt2YXIgZHJhaW5pbmc9ZmFsc2U7dmFyIGN1cnJlbnRRdWV1ZTt2YXIgcXVldWVJbmRleD0tMTtmdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKXtpZighZHJhaW5pbmd8fCFjdXJyZW50UXVldWUpe3JldHVybn1kcmFpbmluZz1mYWxzZTtpZihjdXJyZW50UXVldWUubGVuZ3RoKXtxdWV1ZT1jdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKX1lbHNle3F1ZXVlSW5kZXg9LTF9aWYocXVldWUubGVuZ3RoKXtkcmFpblF1ZXVlKCl9fWZ1bmN0aW9uIGRyYWluUXVldWUoKXtpZihkcmFpbmluZyl7cmV0dXJufXZhciB0aW1lb3V0PXJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtkcmFpbmluZz10cnVlO3ZhciBsZW49cXVldWUubGVuZ3RoO3doaWxlKGxlbil7Y3VycmVudFF1ZXVlPXF1ZXVlO3F1ZXVlPVtdO3doaWxlKCsrcXVldWVJbmRleDxsZW4pe2lmKGN1cnJlbnRRdWV1ZSl7Y3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpfX1xdWV1ZUluZGV4PS0xO2xlbj1xdWV1ZS5sZW5ndGh9Y3VycmVudFF1ZXVlPW51bGw7ZHJhaW5pbmc9ZmFsc2U7cnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpfXByb2Nlc3MubmV4dFRpY2s9ZnVuY3Rpb24oZnVuKXt2YXIgYXJncz1uZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aC0xKTtpZihhcmd1bWVudHMubGVuZ3RoPjEpe2Zvcih2YXIgaT0xO2k8YXJndW1lbnRzLmxlbmd0aDtpKyspe2FyZ3NbaS0xXT1hcmd1bWVudHNbaV19fXF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLGFyZ3MpKTtpZihxdWV1ZS5sZW5ndGg9PT0xJiYhZHJhaW5pbmcpe3J1blRpbWVvdXQoZHJhaW5RdWV1ZSl9fTtmdW5jdGlvbiBJdGVtKGZ1bixhcnJheSl7dGhpcy5mdW49ZnVuO3RoaXMuYXJyYXk9YXJyYXl9SXRlbS5wcm90b3R5cGUucnVuPWZ1bmN0aW9uKCl7dGhpcy5mdW4uYXBwbHkobnVsbCx0aGlzLmFycmF5KX07cHJvY2Vzcy50aXRsZT0iYnJvd3NlciI7cHJvY2Vzcy5icm93c2VyPXRydWU7cHJvY2Vzcy5lbnY9e307cHJvY2Vzcy5hcmd2PVtdO3Byb2Nlc3MudmVyc2lvbj0iIjtwcm9jZXNzLnZlcnNpb25zPXt9O2Z1bmN0aW9uIG5vb3AoKXt9cHJvY2Vzcy5vbj1ub29wO3Byb2Nlc3MuYWRkTGlzdGVuZXI9bm9vcDtwcm9jZXNzLm9uY2U9bm9vcDtwcm9jZXNzLm9mZj1ub29wO3Byb2Nlc3MucmVtb3ZlTGlzdGVuZXI9bm9vcDtwcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycz1ub29wO3Byb2Nlc3MuZW1pdD1ub29wO3Byb2Nlc3MucHJlcGVuZExpc3RlbmVyPW5vb3A7cHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyPW5vb3A7cHJvY2Vzcy5saXN0ZW5lcnM9ZnVuY3Rpb24obmFtZSl7cmV0dXJuW119O3Byb2Nlc3MuYmluZGluZz1mdW5jdGlvbihuYW1lKXt0aHJvdyBuZXcgRXJyb3IoInByb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkIil9O3Byb2Nlc3MuY3dkPWZ1bmN0aW9uKCl7cmV0dXJuIi8ifTtwcm9jZXNzLmNoZGlyPWZ1bmN0aW9uKGRpcil7dGhyb3cgbmV3IEVycm9yKCJwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQiKX07cHJvY2Vzcy51bWFzaz1mdW5jdGlvbigpe3JldHVybiAwfX0se31dLDY3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1yZXF1aXJlKCIuL2xpYi9fc3RyZWFtX2R1cGxleC5qcyIpfSx7Ii4vbGliL19zdHJlYW1fZHVwbGV4LmpzIjo2OH1dLDY4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIHBuYT1yZXF1aXJlKCJwcm9jZXNzLW5leHRpY2stYXJncyIpO3ZhciBvYmplY3RLZXlzPU9iamVjdC5rZXlzfHxmdW5jdGlvbihvYmope3ZhciBrZXlzPVtdO2Zvcih2YXIga2V5IGluIG9iail7a2V5cy5wdXNoKGtleSl9cmV0dXJuIGtleXN9O21vZHVsZS5leHBvcnRzPUR1cGxleDt2YXIgdXRpbD1PYmplY3QuY3JlYXRlKHJlcXVpcmUoImNvcmUtdXRpbC1pcyIpKTt1dGlsLmluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIFJlYWRhYmxlPXJlcXVpcmUoIi4vX3N0cmVhbV9yZWFkYWJsZSIpO3ZhciBXcml0YWJsZT1yZXF1aXJlKCIuL19zdHJlYW1fd3JpdGFibGUiKTt1dGlsLmluaGVyaXRzKER1cGxleCxSZWFkYWJsZSk7e3ZhciBrZXlzPW9iamVjdEtleXMoV3JpdGFibGUucHJvdG90eXBlKTtmb3IodmFyIHY9MDt2PGtleXMubGVuZ3RoO3YrKyl7dmFyIG1ldGhvZD1rZXlzW3ZdO2lmKCFEdXBsZXgucHJvdG90eXBlW21ldGhvZF0pRHVwbGV4LnByb3RvdHlwZVttZXRob2RdPVdyaXRhYmxlLnByb3RvdHlwZVttZXRob2RdfX1mdW5jdGlvbiBEdXBsZXgob3B0aW9ucyl7aWYoISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlyZXR1cm4gbmV3IER1cGxleChvcHRpb25zKTtSZWFkYWJsZS5jYWxsKHRoaXMsb3B0aW9ucyk7V3JpdGFibGUuY2FsbCh0aGlzLG9wdGlvbnMpO2lmKG9wdGlvbnMmJm9wdGlvbnMucmVhZGFibGU9PT1mYWxzZSl0aGlzLnJlYWRhYmxlPWZhbHNlO2lmKG9wdGlvbnMmJm9wdGlvbnMud3JpdGFibGU9PT1mYWxzZSl0aGlzLndyaXRhYmxlPWZhbHNlO3RoaXMuYWxsb3dIYWxmT3Blbj10cnVlO2lmKG9wdGlvbnMmJm9wdGlvbnMuYWxsb3dIYWxmT3Blbj09PWZhbHNlKXRoaXMuYWxsb3dIYWxmT3Blbj1mYWxzZTt0aGlzLm9uY2UoImVuZCIsb25lbmQpfU9iamVjdC5kZWZpbmVQcm9wZXJ0eShEdXBsZXgucHJvdG90eXBlLCJ3cml0YWJsZUhpZ2hXYXRlck1hcmsiLHtlbnVtZXJhYmxlOmZhbHNlLGdldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl93cml0YWJsZVN0YXRlLmhpZ2hXYXRlck1hcmt9fSk7ZnVuY3Rpb24gb25lbmQoKXtpZih0aGlzLmFsbG93SGFsZk9wZW58fHRoaXMuX3dyaXRhYmxlU3RhdGUuZW5kZWQpcmV0dXJuO3BuYS5uZXh0VGljayhvbkVuZE5ULHRoaXMpfWZ1bmN0aW9uIG9uRW5kTlQoc2VsZil7c2VsZi5lbmQoKX1PYmplY3QuZGVmaW5lUHJvcGVydHkoRHVwbGV4LnByb3RvdHlwZSwiZGVzdHJveWVkIix7Z2V0OmZ1bmN0aW9uKCl7aWYodGhpcy5fcmVhZGFibGVTdGF0ZT09PXVuZGVmaW5lZHx8dGhpcy5fd3JpdGFibGVTdGF0ZT09PXVuZGVmaW5lZCl7cmV0dXJuIGZhbHNlfXJldHVybiB0aGlzLl9yZWFkYWJsZVN0YXRlLmRlc3Ryb3llZCYmdGhpcy5fd3JpdGFibGVTdGF0ZS5kZXN0cm95ZWR9LHNldDpmdW5jdGlvbih2YWx1ZSl7aWYodGhpcy5fcmVhZGFibGVTdGF0ZT09PXVuZGVmaW5lZHx8dGhpcy5fd3JpdGFibGVTdGF0ZT09PXVuZGVmaW5lZCl7cmV0dXJufXRoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkPXZhbHVlO3RoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkPXZhbHVlfX0pO0R1cGxleC5wcm90b3R5cGUuX2Rlc3Ryb3k9ZnVuY3Rpb24oZXJyLGNiKXt0aGlzLnB1c2gobnVsbCk7dGhpcy5lbmQoKTtwbmEubmV4dFRpY2soY2IsZXJyKX19LHsiLi9fc3RyZWFtX3JlYWRhYmxlIjo3MCwiLi9fc3RyZWFtX3dyaXRhYmxlIjo3MiwiY29yZS11dGlsLWlzIjozMCxpbmhlcml0czozNiwicHJvY2Vzcy1uZXh0aWNrLWFyZ3MiOjY1fV0sNjk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijttb2R1bGUuZXhwb3J0cz1QYXNzVGhyb3VnaDt2YXIgVHJhbnNmb3JtPXJlcXVpcmUoIi4vX3N0cmVhbV90cmFuc2Zvcm0iKTt2YXIgdXRpbD1PYmplY3QuY3JlYXRlKHJlcXVpcmUoImNvcmUtdXRpbC1pcyIpKTt1dGlsLmluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dXRpbC5pbmhlcml0cyhQYXNzVGhyb3VnaCxUcmFuc2Zvcm0pO2Z1bmN0aW9uIFBhc3NUaHJvdWdoKG9wdGlvbnMpe2lmKCEodGhpcyBpbnN0YW5jZW9mIFBhc3NUaHJvdWdoKSlyZXR1cm4gbmV3IFBhc3NUaHJvdWdoKG9wdGlvbnMpO1RyYW5zZm9ybS5jYWxsKHRoaXMsb3B0aW9ucyl9UGFzc1Rocm91Z2gucHJvdG90eXBlLl90cmFuc2Zvcm09ZnVuY3Rpb24oY2h1bmssZW5jb2RpbmcsY2Ipe2NiKG51bGwsY2h1bmspfX0seyIuL19zdHJlYW1fdHJhbnNmb3JtIjo3MSwiY29yZS11dGlsLWlzIjozMCxpbmhlcml0czozNn1dLDcwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2VzcyxnbG9iYWwpeyJ1c2Ugc3RyaWN0Ijt2YXIgcG5hPXJlcXVpcmUoInByb2Nlc3MtbmV4dGljay1hcmdzIik7bW9kdWxlLmV4cG9ydHM9UmVhZGFibGU7dmFyIGlzQXJyYXk9cmVxdWlyZSgiaXNhcnJheSIpO3ZhciBEdXBsZXg7UmVhZGFibGUuUmVhZGFibGVTdGF0ZT1SZWFkYWJsZVN0YXRlO3ZhciBFRT1yZXF1aXJlKCJldmVudHMiKS5FdmVudEVtaXR0ZXI7dmFyIEVFbGlzdGVuZXJDb3VudD1mdW5jdGlvbihlbWl0dGVyLHR5cGUpe3JldHVybiBlbWl0dGVyLmxpc3RlbmVycyh0eXBlKS5sZW5ndGh9O3ZhciBTdHJlYW09cmVxdWlyZSgiLi9pbnRlcm5hbC9zdHJlYW1zL3N0cmVhbSIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIE91clVpbnQ4QXJyYXk9Z2xvYmFsLlVpbnQ4QXJyYXl8fGZ1bmN0aW9uKCl7fTtmdW5jdGlvbiBfdWludDhBcnJheVRvQnVmZmVyKGNodW5rKXtyZXR1cm4gQnVmZmVyLmZyb20oY2h1bmspfWZ1bmN0aW9uIF9pc1VpbnQ4QXJyYXkob2JqKXtyZXR1cm4gQnVmZmVyLmlzQnVmZmVyKG9iail8fG9iaiBpbnN0YW5jZW9mIE91clVpbnQ4QXJyYXl9dmFyIHV0aWw9T2JqZWN0LmNyZWF0ZShyZXF1aXJlKCJjb3JlLXV0aWwtaXMiKSk7dXRpbC5pbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBkZWJ1Z1V0aWw9cmVxdWlyZSgidXRpbCIpO3ZhciBkZWJ1Zz12b2lkIDA7aWYoZGVidWdVdGlsJiZkZWJ1Z1V0aWwuZGVidWdsb2cpe2RlYnVnPWRlYnVnVXRpbC5kZWJ1Z2xvZygic3RyZWFtIil9ZWxzZXtkZWJ1Zz1mdW5jdGlvbigpe319dmFyIEJ1ZmZlckxpc3Q9cmVxdWlyZSgiLi9pbnRlcm5hbC9zdHJlYW1zL0J1ZmZlckxpc3QiKTt2YXIgZGVzdHJveUltcGw9cmVxdWlyZSgiLi9pbnRlcm5hbC9zdHJlYW1zL2Rlc3Ryb3kiKTt2YXIgU3RyaW5nRGVjb2Rlcjt1dGlsLmluaGVyaXRzKFJlYWRhYmxlLFN0cmVhbSk7dmFyIGtQcm94eUV2ZW50cz1bImVycm9yIiwiY2xvc2UiLCJkZXN0cm95IiwicGF1c2UiLCJyZXN1bWUiXTtmdW5jdGlvbiBwcmVwZW5kTGlzdGVuZXIoZW1pdHRlcixldmVudCxmbil7aWYodHlwZW9mIGVtaXR0ZXIucHJlcGVuZExpc3RlbmVyPT09ImZ1bmN0aW9uIilyZXR1cm4gZW1pdHRlci5wcmVwZW5kTGlzdGVuZXIoZXZlbnQsZm4pO2lmKCFlbWl0dGVyLl9ldmVudHN8fCFlbWl0dGVyLl9ldmVudHNbZXZlbnRdKWVtaXR0ZXIub24oZXZlbnQsZm4pO2Vsc2UgaWYoaXNBcnJheShlbWl0dGVyLl9ldmVudHNbZXZlbnRdKSllbWl0dGVyLl9ldmVudHNbZXZlbnRdLnVuc2hpZnQoZm4pO2Vsc2UgZW1pdHRlci5fZXZlbnRzW2V2ZW50XT1bZm4sZW1pdHRlci5fZXZlbnRzW2V2ZW50XV19ZnVuY3Rpb24gUmVhZGFibGVTdGF0ZShvcHRpb25zLHN0cmVhbSl7RHVwbGV4PUR1cGxleHx8cmVxdWlyZSgiLi9fc3RyZWFtX2R1cGxleCIpO29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGlzRHVwbGV4PXN0cmVhbSBpbnN0YW5jZW9mIER1cGxleDt0aGlzLm9iamVjdE1vZGU9ISFvcHRpb25zLm9iamVjdE1vZGU7aWYoaXNEdXBsZXgpdGhpcy5vYmplY3RNb2RlPXRoaXMub2JqZWN0TW9kZXx8ISFvcHRpb25zLnJlYWRhYmxlT2JqZWN0TW9kZTt2YXIgaHdtPW9wdGlvbnMuaGlnaFdhdGVyTWFyazt2YXIgcmVhZGFibGVId209b3B0aW9ucy5yZWFkYWJsZUhpZ2hXYXRlck1hcms7dmFyIGRlZmF1bHRId209dGhpcy5vYmplY3RNb2RlPzE2OjE2KjEwMjQ7aWYoaHdtfHxod209PT0wKXRoaXMuaGlnaFdhdGVyTWFyaz1od207ZWxzZSBpZihpc0R1cGxleCYmKHJlYWRhYmxlSHdtfHxyZWFkYWJsZUh3bT09PTApKXRoaXMuaGlnaFdhdGVyTWFyaz1yZWFkYWJsZUh3bTtlbHNlIHRoaXMuaGlnaFdhdGVyTWFyaz1kZWZhdWx0SHdtO3RoaXMuaGlnaFdhdGVyTWFyaz1NYXRoLmZsb29yKHRoaXMuaGlnaFdhdGVyTWFyayk7dGhpcy5idWZmZXI9bmV3IEJ1ZmZlckxpc3Q7dGhpcy5sZW5ndGg9MDt0aGlzLnBpcGVzPW51bGw7dGhpcy5waXBlc0NvdW50PTA7dGhpcy5mbG93aW5nPW51bGw7dGhpcy5lbmRlZD1mYWxzZTt0aGlzLmVuZEVtaXR0ZWQ9ZmFsc2U7dGhpcy5yZWFkaW5nPWZhbHNlO3RoaXMuc3luYz10cnVlO3RoaXMubmVlZFJlYWRhYmxlPWZhbHNlO3RoaXMuZW1pdHRlZFJlYWRhYmxlPWZhbHNlO3RoaXMucmVhZGFibGVMaXN0ZW5pbmc9ZmFsc2U7dGhpcy5yZXN1bWVTY2hlZHVsZWQ9ZmFsc2U7dGhpcy5kZXN0cm95ZWQ9ZmFsc2U7dGhpcy5kZWZhdWx0RW5jb2Rpbmc9b3B0aW9ucy5kZWZhdWx0RW5jb2Rpbmd8fCJ1dGY4Ijt0aGlzLmF3YWl0RHJhaW49MDt0aGlzLnJlYWRpbmdNb3JlPWZhbHNlO3RoaXMuZGVjb2Rlcj1udWxsO3RoaXMuZW5jb2Rpbmc9bnVsbDtpZihvcHRpb25zLmVuY29kaW5nKXtpZighU3RyaW5nRGVjb2RlcilTdHJpbmdEZWNvZGVyPXJlcXVpcmUoInN0cmluZ19kZWNvZGVyLyIpLlN0cmluZ0RlY29kZXI7dGhpcy5kZWNvZGVyPW5ldyBTdHJpbmdEZWNvZGVyKG9wdGlvbnMuZW5jb2RpbmcpO3RoaXMuZW5jb2Rpbmc9b3B0aW9ucy5lbmNvZGluZ319ZnVuY3Rpb24gUmVhZGFibGUob3B0aW9ucyl7RHVwbGV4PUR1cGxleHx8cmVxdWlyZSgiLi9fc3RyZWFtX2R1cGxleCIpO2lmKCEodGhpcyBpbnN0YW5jZW9mIFJlYWRhYmxlKSlyZXR1cm4gbmV3IFJlYWRhYmxlKG9wdGlvbnMpO3RoaXMuX3JlYWRhYmxlU3RhdGU9bmV3IFJlYWRhYmxlU3RhdGUob3B0aW9ucyx0aGlzKTt0aGlzLnJlYWRhYmxlPXRydWU7aWYob3B0aW9ucyl7aWYodHlwZW9mIG9wdGlvbnMucmVhZD09PSJmdW5jdGlvbiIpdGhpcy5fcmVhZD1vcHRpb25zLnJlYWQ7aWYodHlwZW9mIG9wdGlvbnMuZGVzdHJveT09PSJmdW5jdGlvbiIpdGhpcy5fZGVzdHJveT1vcHRpb25zLmRlc3Ryb3l9U3RyZWFtLmNhbGwodGhpcyl9T2JqZWN0LmRlZmluZVByb3BlcnR5KFJlYWRhYmxlLnByb3RvdHlwZSwiZGVzdHJveWVkIix7Z2V0OmZ1bmN0aW9uKCl7aWYodGhpcy5fcmVhZGFibGVTdGF0ZT09PXVuZGVmaW5lZCl7cmV0dXJuIGZhbHNlfXJldHVybiB0aGlzLl9yZWFkYWJsZVN0YXRlLmRlc3Ryb3llZH0sc2V0OmZ1bmN0aW9uKHZhbHVlKXtpZighdGhpcy5fcmVhZGFibGVTdGF0ZSl7cmV0dXJufXRoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkPXZhbHVlfX0pO1JlYWRhYmxlLnByb3RvdHlwZS5kZXN0cm95PWRlc3Ryb3lJbXBsLmRlc3Ryb3k7UmVhZGFibGUucHJvdG90eXBlLl91bmRlc3Ryb3k9ZGVzdHJveUltcGwudW5kZXN0cm95O1JlYWRhYmxlLnByb3RvdHlwZS5fZGVzdHJveT1mdW5jdGlvbihlcnIsY2Ipe3RoaXMucHVzaChudWxsKTtjYihlcnIpfTtSZWFkYWJsZS5wcm90b3R5cGUucHVzaD1mdW5jdGlvbihjaHVuayxlbmNvZGluZyl7dmFyIHN0YXRlPXRoaXMuX3JlYWRhYmxlU3RhdGU7dmFyIHNraXBDaHVua0NoZWNrO2lmKCFzdGF0ZS5vYmplY3RNb2RlKXtpZih0eXBlb2YgY2h1bms9PT0ic3RyaW5nIil7ZW5jb2Rpbmc9ZW5jb2Rpbmd8fHN0YXRlLmRlZmF1bHRFbmNvZGluZztpZihlbmNvZGluZyE9PXN0YXRlLmVuY29kaW5nKXtjaHVuaz1CdWZmZXIuZnJvbShjaHVuayxlbmNvZGluZyk7ZW5jb2Rpbmc9IiJ9c2tpcENodW5rQ2hlY2s9dHJ1ZX19ZWxzZXtza2lwQ2h1bmtDaGVjaz10cnVlfXJldHVybiByZWFkYWJsZUFkZENodW5rKHRoaXMsY2h1bmssZW5jb2RpbmcsZmFsc2Usc2tpcENodW5rQ2hlY2spfTtSZWFkYWJsZS5wcm90b3R5cGUudW5zaGlmdD1mdW5jdGlvbihjaHVuayl7cmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcyxjaHVuayxudWxsLHRydWUsZmFsc2UpfTtmdW5jdGlvbiByZWFkYWJsZUFkZENodW5rKHN0cmVhbSxjaHVuayxlbmNvZGluZyxhZGRUb0Zyb250LHNraXBDaHVua0NoZWNrKXt2YXIgc3RhdGU9c3RyZWFtLl9yZWFkYWJsZVN0YXRlO2lmKGNodW5rPT09bnVsbCl7c3RhdGUucmVhZGluZz1mYWxzZTtvbkVvZkNodW5rKHN0cmVhbSxzdGF0ZSl9ZWxzZXt2YXIgZXI7aWYoIXNraXBDaHVua0NoZWNrKWVyPWNodW5rSW52YWxpZChzdGF0ZSxjaHVuayk7aWYoZXIpe3N0cmVhbS5lbWl0KCJlcnJvciIsZXIpfWVsc2UgaWYoc3RhdGUub2JqZWN0TW9kZXx8Y2h1bmsmJmNodW5rLmxlbmd0aD4wKXtpZih0eXBlb2YgY2h1bmshPT0ic3RyaW5nIiYmIXN0YXRlLm9iamVjdE1vZGUmJk9iamVjdC5nZXRQcm90b3R5cGVPZihjaHVuaykhPT1CdWZmZXIucHJvdG90eXBlKXtjaHVuaz1fdWludDhBcnJheVRvQnVmZmVyKGNodW5rKX1pZihhZGRUb0Zyb250KXtpZihzdGF0ZS5lbmRFbWl0dGVkKXN0cmVhbS5lbWl0KCJlcnJvciIsbmV3IEVycm9yKCJzdHJlYW0udW5zaGlmdCgpIGFmdGVyIGVuZCBldmVudCIpKTtlbHNlIGFkZENodW5rKHN0cmVhbSxzdGF0ZSxjaHVuayx0cnVlKX1lbHNlIGlmKHN0YXRlLmVuZGVkKXtzdHJlYW0uZW1pdCgiZXJyb3IiLG5ldyBFcnJvcigic3RyZWFtLnB1c2goKSBhZnRlciBFT0YiKSl9ZWxzZXtzdGF0ZS5yZWFkaW5nPWZhbHNlO2lmKHN0YXRlLmRlY29kZXImJiFlbmNvZGluZyl7Y2h1bms9c3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7aWYoc3RhdGUub2JqZWN0TW9kZXx8Y2h1bmsubGVuZ3RoIT09MClhZGRDaHVuayhzdHJlYW0sc3RhdGUsY2h1bmssZmFsc2UpO2Vsc2UgbWF5YmVSZWFkTW9yZShzdHJlYW0sc3RhdGUpfWVsc2V7YWRkQ2h1bmsoc3RyZWFtLHN0YXRlLGNodW5rLGZhbHNlKX19fWVsc2UgaWYoIWFkZFRvRnJvbnQpe3N0YXRlLnJlYWRpbmc9ZmFsc2V9fXJldHVybiBuZWVkTW9yZURhdGEoc3RhdGUpfWZ1bmN0aW9uIGFkZENodW5rKHN0cmVhbSxzdGF0ZSxjaHVuayxhZGRUb0Zyb250KXtpZihzdGF0ZS5mbG93aW5nJiZzdGF0ZS5sZW5ndGg9PT0wJiYhc3RhdGUuc3luYyl7c3RyZWFtLmVtaXQoImRhdGEiLGNodW5rKTtzdHJlYW0ucmVhZCgwKX1lbHNle3N0YXRlLmxlbmd0aCs9c3RhdGUub2JqZWN0TW9kZT8xOmNodW5rLmxlbmd0aDtpZihhZGRUb0Zyb250KXN0YXRlLmJ1ZmZlci51bnNoaWZ0KGNodW5rKTtlbHNlIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtpZihzdGF0ZS5uZWVkUmVhZGFibGUpZW1pdFJlYWRhYmxlKHN0cmVhbSl9bWF5YmVSZWFkTW9yZShzdHJlYW0sc3RhdGUpfWZ1bmN0aW9uIGNodW5rSW52YWxpZChzdGF0ZSxjaHVuayl7dmFyIGVyO2lmKCFfaXNVaW50OEFycmF5KGNodW5rKSYmdHlwZW9mIGNodW5rIT09InN0cmluZyImJmNodW5rIT09dW5kZWZpbmVkJiYhc3RhdGUub2JqZWN0TW9kZSl7ZXI9bmV3IFR5cGVFcnJvcigiSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuayIpfXJldHVybiBlcn1mdW5jdGlvbiBuZWVkTW9yZURhdGEoc3RhdGUpe3JldHVybiFzdGF0ZS5lbmRlZCYmKHN0YXRlLm5lZWRSZWFkYWJsZXx8c3RhdGUubGVuZ3RoPHN0YXRlLmhpZ2hXYXRlck1hcmt8fHN0YXRlLmxlbmd0aD09PTApfVJlYWRhYmxlLnByb3RvdHlwZS5pc1BhdXNlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmc9PT1mYWxzZX07UmVhZGFibGUucHJvdG90eXBlLnNldEVuY29kaW5nPWZ1bmN0aW9uKGVuYyl7aWYoIVN0cmluZ0RlY29kZXIpU3RyaW5nRGVjb2Rlcj1yZXF1aXJlKCJzdHJpbmdfZGVjb2Rlci8iKS5TdHJpbmdEZWNvZGVyO3RoaXMuX3JlYWRhYmxlU3RhdGUuZGVjb2Rlcj1uZXcgU3RyaW5nRGVjb2RlcihlbmMpO3RoaXMuX3JlYWRhYmxlU3RhdGUuZW5jb2Rpbmc9ZW5jO3JldHVybiB0aGlzfTt2YXIgTUFYX0hXTT04Mzg4NjA4O2Z1bmN0aW9uIGNvbXB1dGVOZXdIaWdoV2F0ZXJNYXJrKG4pe2lmKG4+PU1BWF9IV00pe249TUFYX0hXTX1lbHNle24tLTtufD1uPj4+MTtufD1uPj4+MjtufD1uPj4+NDtufD1uPj4+ODtufD1uPj4+MTY7bisrfXJldHVybiBufWZ1bmN0aW9uIGhvd011Y2hUb1JlYWQobixzdGF0ZSl7aWYobjw9MHx8c3RhdGUubGVuZ3RoPT09MCYmc3RhdGUuZW5kZWQpcmV0dXJuIDA7aWYoc3RhdGUub2JqZWN0TW9kZSlyZXR1cm4gMTtpZihuIT09bil7aWYoc3RhdGUuZmxvd2luZyYmc3RhdGUubGVuZ3RoKXJldHVybiBzdGF0ZS5idWZmZXIuaGVhZC5kYXRhLmxlbmd0aDtlbHNlIHJldHVybiBzdGF0ZS5sZW5ndGh9aWYobj5zdGF0ZS5oaWdoV2F0ZXJNYXJrKXN0YXRlLmhpZ2hXYXRlck1hcms9Y29tcHV0ZU5ld0hpZ2hXYXRlck1hcmsobik7aWYobjw9c3RhdGUubGVuZ3RoKXJldHVybiBuO2lmKCFzdGF0ZS5lbmRlZCl7c3RhdGUubmVlZFJlYWRhYmxlPXRydWU7cmV0dXJuIDB9cmV0dXJuIHN0YXRlLmxlbmd0aH1SZWFkYWJsZS5wcm90b3R5cGUucmVhZD1mdW5jdGlvbihuKXtkZWJ1ZygicmVhZCIsbik7bj1wYXJzZUludChuLDEwKTt2YXIgc3RhdGU9dGhpcy5fcmVhZGFibGVTdGF0ZTt2YXIgbk9yaWc9bjtpZihuIT09MClzdGF0ZS5lbWl0dGVkUmVhZGFibGU9ZmFsc2U7aWYobj09PTAmJnN0YXRlLm5lZWRSZWFkYWJsZSYmKHN0YXRlLmxlbmd0aD49c3RhdGUuaGlnaFdhdGVyTWFya3x8c3RhdGUuZW5kZWQpKXtkZWJ1ZygicmVhZDogZW1pdFJlYWRhYmxlIixzdGF0ZS5sZW5ndGgsc3RhdGUuZW5kZWQpO2lmKHN0YXRlLmxlbmd0aD09PTAmJnN0YXRlLmVuZGVkKWVuZFJlYWRhYmxlKHRoaXMpO2Vsc2UgZW1pdFJlYWRhYmxlKHRoaXMpO3JldHVybiBudWxsfW49aG93TXVjaFRvUmVhZChuLHN0YXRlKTtpZihuPT09MCYmc3RhdGUuZW5kZWQpe2lmKHN0YXRlLmxlbmd0aD09PTApZW5kUmVhZGFibGUodGhpcyk7cmV0dXJuIG51bGx9dmFyIGRvUmVhZD1zdGF0ZS5uZWVkUmVhZGFibGU7ZGVidWcoIm5lZWQgcmVhZGFibGUiLGRvUmVhZCk7aWYoc3RhdGUubGVuZ3RoPT09MHx8c3RhdGUubGVuZ3RoLW48c3RhdGUuaGlnaFdhdGVyTWFyayl7ZG9SZWFkPXRydWU7ZGVidWcoImxlbmd0aCBsZXNzIHRoYW4gd2F0ZXJtYXJrIixkb1JlYWQpfWlmKHN0YXRlLmVuZGVkfHxzdGF0ZS5yZWFkaW5nKXtkb1JlYWQ9ZmFsc2U7ZGVidWcoInJlYWRpbmcgb3IgZW5kZWQiLGRvUmVhZCl9ZWxzZSBpZihkb1JlYWQpe2RlYnVnKCJkbyByZWFkIik7c3RhdGUucmVhZGluZz10cnVlO3N0YXRlLnN5bmM9dHJ1ZTtpZihzdGF0ZS5sZW5ndGg9PT0wKXN0YXRlLm5lZWRSZWFkYWJsZT10cnVlO3RoaXMuX3JlYWQoc3RhdGUuaGlnaFdhdGVyTWFyayk7c3RhdGUuc3luYz1mYWxzZTtpZighc3RhdGUucmVhZGluZyluPWhvd011Y2hUb1JlYWQobk9yaWcsc3RhdGUpfXZhciByZXQ7aWYobj4wKXJldD1mcm9tTGlzdChuLHN0YXRlKTtlbHNlIHJldD1udWxsO2lmKHJldD09PW51bGwpe3N0YXRlLm5lZWRSZWFkYWJsZT10cnVlO249MH1lbHNle3N0YXRlLmxlbmd0aC09bn1pZihzdGF0ZS5sZW5ndGg9PT0wKXtpZighc3RhdGUuZW5kZWQpc3RhdGUubmVlZFJlYWRhYmxlPXRydWU7aWYobk9yaWchPT1uJiZzdGF0ZS5lbmRlZCllbmRSZWFkYWJsZSh0aGlzKX1pZihyZXQhPT1udWxsKXRoaXMuZW1pdCgiZGF0YSIscmV0KTtyZXR1cm4gcmV0fTtmdW5jdGlvbiBvbkVvZkNodW5rKHN0cmVhbSxzdGF0ZSl7aWYoc3RhdGUuZW5kZWQpcmV0dXJuO2lmKHN0YXRlLmRlY29kZXIpe3ZhciBjaHVuaz1zdGF0ZS5kZWNvZGVyLmVuZCgpO2lmKGNodW5rJiZjaHVuay5sZW5ndGgpe3N0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtzdGF0ZS5sZW5ndGgrPXN0YXRlLm9iamVjdE1vZGU/MTpjaHVuay5sZW5ndGh9fXN0YXRlLmVuZGVkPXRydWU7ZW1pdFJlYWRhYmxlKHN0cmVhbSl9ZnVuY3Rpb24gZW1pdFJlYWRhYmxlKHN0cmVhbSl7dmFyIHN0YXRlPXN0cmVhbS5fcmVhZGFibGVTdGF0ZTtzdGF0ZS5uZWVkUmVhZGFibGU9ZmFsc2U7aWYoIXN0YXRlLmVtaXR0ZWRSZWFkYWJsZSl7ZGVidWcoImVtaXRSZWFkYWJsZSIsc3RhdGUuZmxvd2luZyk7c3RhdGUuZW1pdHRlZFJlYWRhYmxlPXRydWU7aWYoc3RhdGUuc3luYylwbmEubmV4dFRpY2soZW1pdFJlYWRhYmxlXyxzdHJlYW0pO2Vsc2UgZW1pdFJlYWRhYmxlXyhzdHJlYW0pfX1mdW5jdGlvbiBlbWl0UmVhZGFibGVfKHN0cmVhbSl7ZGVidWcoImVtaXQgcmVhZGFibGUiKTtzdHJlYW0uZW1pdCgicmVhZGFibGUiKTtmbG93KHN0cmVhbSl9ZnVuY3Rpb24gbWF5YmVSZWFkTW9yZShzdHJlYW0sc3RhdGUpe2lmKCFzdGF0ZS5yZWFkaW5nTW9yZSl7c3RhdGUucmVhZGluZ01vcmU9dHJ1ZTtwbmEubmV4dFRpY2sobWF5YmVSZWFkTW9yZV8sc3RyZWFtLHN0YXRlKX19ZnVuY3Rpb24gbWF5YmVSZWFkTW9yZV8oc3RyZWFtLHN0YXRlKXt2YXIgbGVuPXN0YXRlLmxlbmd0aDt3aGlsZSghc3RhdGUucmVhZGluZyYmIXN0YXRlLmZsb3dpbmcmJiFzdGF0ZS5lbmRlZCYmc3RhdGUubGVuZ3RoPHN0YXRlLmhpZ2hXYXRlck1hcmspe2RlYnVnKCJtYXliZVJlYWRNb3JlIHJlYWQgMCIpO3N0cmVhbS5yZWFkKDApO2lmKGxlbj09PXN0YXRlLmxlbmd0aClicmVhaztlbHNlIGxlbj1zdGF0ZS5sZW5ndGh9c3RhdGUucmVhZGluZ01vcmU9ZmFsc2V9UmVhZGFibGUucHJvdG90eXBlLl9yZWFkPWZ1bmN0aW9uKG4pe3RoaXMuZW1pdCgiZXJyb3IiLG5ldyBFcnJvcigiX3JlYWQoKSBpcyBub3QgaW1wbGVtZW50ZWQiKSl9O1JlYWRhYmxlLnByb3RvdHlwZS5waXBlPWZ1bmN0aW9uKGRlc3QscGlwZU9wdHMpe3ZhciBzcmM9dGhpczt2YXIgc3RhdGU9dGhpcy5fcmVhZGFibGVTdGF0ZTtzd2l0Y2goc3RhdGUucGlwZXNDb3VudCl7Y2FzZSAwOnN0YXRlLnBpcGVzPWRlc3Q7YnJlYWs7Y2FzZSAxOnN0YXRlLnBpcGVzPVtzdGF0ZS5waXBlcyxkZXN0XTticmVhaztkZWZhdWx0OnN0YXRlLnBpcGVzLnB1c2goZGVzdCk7YnJlYWt9c3RhdGUucGlwZXNDb3VudCs9MTtkZWJ1ZygicGlwZSBjb3VudD0lZCBvcHRzPSVqIixzdGF0ZS5waXBlc0NvdW50LHBpcGVPcHRzKTt2YXIgZG9FbmQ9KCFwaXBlT3B0c3x8cGlwZU9wdHMuZW5kIT09ZmFsc2UpJiZkZXN0IT09cHJvY2Vzcy5zdGRvdXQmJmRlc3QhPT1wcm9jZXNzLnN0ZGVycjt2YXIgZW5kRm49ZG9FbmQ/b25lbmQ6dW5waXBlO2lmKHN0YXRlLmVuZEVtaXR0ZWQpcG5hLm5leHRUaWNrKGVuZEZuKTtlbHNlIHNyYy5vbmNlKCJlbmQiLGVuZEZuKTtkZXN0Lm9uKCJ1bnBpcGUiLG9udW5waXBlKTtmdW5jdGlvbiBvbnVucGlwZShyZWFkYWJsZSx1bnBpcGVJbmZvKXtkZWJ1Zygib251bnBpcGUiKTtpZihyZWFkYWJsZT09PXNyYyl7aWYodW5waXBlSW5mbyYmdW5waXBlSW5mby5oYXNVbnBpcGVkPT09ZmFsc2Upe3VucGlwZUluZm8uaGFzVW5waXBlZD10cnVlO2NsZWFudXAoKX19fWZ1bmN0aW9uIG9uZW5kKCl7ZGVidWcoIm9uZW5kIik7ZGVzdC5lbmQoKX12YXIgb25kcmFpbj1waXBlT25EcmFpbihzcmMpO2Rlc3Qub24oImRyYWluIixvbmRyYWluKTt2YXIgY2xlYW5lZFVwPWZhbHNlO2Z1bmN0aW9uIGNsZWFudXAoKXtkZWJ1ZygiY2xlYW51cCIpO2Rlc3QucmVtb3ZlTGlzdGVuZXIoImNsb3NlIixvbmNsb3NlKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJmaW5pc2giLG9uZmluaXNoKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJkcmFpbiIsb25kcmFpbik7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiZXJyb3IiLG9uZXJyb3IpO2Rlc3QucmVtb3ZlTGlzdGVuZXIoInVucGlwZSIsb251bnBpcGUpO3NyYy5yZW1vdmVMaXN0ZW5lcigiZW5kIixvbmVuZCk7c3JjLnJlbW92ZUxpc3RlbmVyKCJlbmQiLHVucGlwZSk7c3JjLnJlbW92ZUxpc3RlbmVyKCJkYXRhIixvbmRhdGEpO2NsZWFuZWRVcD10cnVlO2lmKHN0YXRlLmF3YWl0RHJhaW4mJighZGVzdC5fd3JpdGFibGVTdGF0ZXx8ZGVzdC5fd3JpdGFibGVTdGF0ZS5uZWVkRHJhaW4pKW9uZHJhaW4oKX12YXIgaW5jcmVhc2VkQXdhaXREcmFpbj1mYWxzZTtzcmMub24oImRhdGEiLG9uZGF0YSk7ZnVuY3Rpb24gb25kYXRhKGNodW5rKXtkZWJ1Zygib25kYXRhIik7aW5jcmVhc2VkQXdhaXREcmFpbj1mYWxzZTt2YXIgcmV0PWRlc3Qud3JpdGUoY2h1bmspO2lmKGZhbHNlPT09cmV0JiYhaW5jcmVhc2VkQXdhaXREcmFpbil7aWYoKHN0YXRlLnBpcGVzQ291bnQ9PT0xJiZzdGF0ZS5waXBlcz09PWRlc3R8fHN0YXRlLnBpcGVzQ291bnQ+MSYmaW5kZXhPZihzdGF0ZS5waXBlcyxkZXN0KSE9PS0xKSYmIWNsZWFuZWRVcCl7ZGVidWcoImZhbHNlIHdyaXRlIHJlc3BvbnNlLCBwYXVzZSIsc3JjLl9yZWFkYWJsZVN0YXRlLmF3YWl0RHJhaW4pO3NyYy5fcmVhZGFibGVTdGF0ZS5hd2FpdERyYWluKys7aW5jcmVhc2VkQXdhaXREcmFpbj10cnVlfXNyYy5wYXVzZSgpfX1mdW5jdGlvbiBvbmVycm9yKGVyKXtkZWJ1Zygib25lcnJvciIsZXIpO3VucGlwZSgpO2Rlc3QucmVtb3ZlTGlzdGVuZXIoImVycm9yIixvbmVycm9yKTtpZihFRWxpc3RlbmVyQ291bnQoZGVzdCwiZXJyb3IiKT09PTApZGVzdC5lbWl0KCJlcnJvciIsZXIpfXByZXBlbmRMaXN0ZW5lcihkZXN0LCJlcnJvciIsb25lcnJvcik7ZnVuY3Rpb24gb25jbG9zZSgpe2Rlc3QucmVtb3ZlTGlzdGVuZXIoImZpbmlzaCIsb25maW5pc2gpO3VucGlwZSgpfWRlc3Qub25jZSgiY2xvc2UiLG9uY2xvc2UpO2Z1bmN0aW9uIG9uZmluaXNoKCl7ZGVidWcoIm9uZmluaXNoIik7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiY2xvc2UiLG9uY2xvc2UpO3VucGlwZSgpfWRlc3Qub25jZSgiZmluaXNoIixvbmZpbmlzaCk7ZnVuY3Rpb24gdW5waXBlKCl7ZGVidWcoInVucGlwZSIpO3NyYy51bnBpcGUoZGVzdCl9ZGVzdC5lbWl0KCJwaXBlIixzcmMpO2lmKCFzdGF0ZS5mbG93aW5nKXtkZWJ1ZygicGlwZSByZXN1bWUiKTtzcmMucmVzdW1lKCl9cmV0dXJuIGRlc3R9O2Z1bmN0aW9uIHBpcGVPbkRyYWluKHNyYyl7cmV0dXJuIGZ1bmN0aW9uKCl7dmFyIHN0YXRlPXNyYy5fcmVhZGFibGVTdGF0ZTtkZWJ1ZygicGlwZU9uRHJhaW4iLHN0YXRlLmF3YWl0RHJhaW4pO2lmKHN0YXRlLmF3YWl0RHJhaW4pc3RhdGUuYXdhaXREcmFpbi0tO2lmKHN0YXRlLmF3YWl0RHJhaW49PT0wJiZFRWxpc3RlbmVyQ291bnQoc3JjLCJkYXRhIikpe3N0YXRlLmZsb3dpbmc9dHJ1ZTtmbG93KHNyYyl9fX1SZWFkYWJsZS5wcm90b3R5cGUudW5waXBlPWZ1bmN0aW9uKGRlc3Qpe3ZhciBzdGF0ZT10aGlzLl9yZWFkYWJsZVN0YXRlO3ZhciB1bnBpcGVJbmZvPXtoYXNVbnBpcGVkOmZhbHNlfTtpZihzdGF0ZS5waXBlc0NvdW50PT09MClyZXR1cm4gdGhpcztpZihzdGF0ZS5waXBlc0NvdW50PT09MSl7aWYoZGVzdCYmZGVzdCE9PXN0YXRlLnBpcGVzKXJldHVybiB0aGlzO2lmKCFkZXN0KWRlc3Q9c3RhdGUucGlwZXM7c3RhdGUucGlwZXM9bnVsbDtzdGF0ZS5waXBlc0NvdW50PTA7c3RhdGUuZmxvd2luZz1mYWxzZTtpZihkZXN0KWRlc3QuZW1pdCgidW5waXBlIix0aGlzLHVucGlwZUluZm8pO3JldHVybiB0aGlzfWlmKCFkZXN0KXt2YXIgZGVzdHM9c3RhdGUucGlwZXM7dmFyIGxlbj1zdGF0ZS5waXBlc0NvdW50O3N0YXRlLnBpcGVzPW51bGw7c3RhdGUucGlwZXNDb3VudD0wO3N0YXRlLmZsb3dpbmc9ZmFsc2U7Zm9yKHZhciBpPTA7aTxsZW47aSsrKXtkZXN0c1tpXS5lbWl0KCJ1bnBpcGUiLHRoaXMsdW5waXBlSW5mbyl9cmV0dXJuIHRoaXN9dmFyIGluZGV4PWluZGV4T2Yoc3RhdGUucGlwZXMsZGVzdCk7aWYoaW5kZXg9PT0tMSlyZXR1cm4gdGhpcztzdGF0ZS5waXBlcy5zcGxpY2UoaW5kZXgsMSk7c3RhdGUucGlwZXNDb3VudC09MTtpZihzdGF0ZS5waXBlc0NvdW50PT09MSlzdGF0ZS5waXBlcz1zdGF0ZS5waXBlc1swXTtkZXN0LmVtaXQoInVucGlwZSIsdGhpcyx1bnBpcGVJbmZvKTtyZXR1cm4gdGhpc307UmVhZGFibGUucHJvdG90eXBlLm9uPWZ1bmN0aW9uKGV2LGZuKXt2YXIgcmVzPVN0cmVhbS5wcm90b3R5cGUub24uY2FsbCh0aGlzLGV2LGZuKTtpZihldj09PSJkYXRhIil7aWYodGhpcy5fcmVhZGFibGVTdGF0ZS5mbG93aW5nIT09ZmFsc2UpdGhpcy5yZXN1bWUoKX1lbHNlIGlmKGV2PT09InJlYWRhYmxlIil7dmFyIHN0YXRlPXRoaXMuX3JlYWRhYmxlU3RhdGU7aWYoIXN0YXRlLmVuZEVtaXR0ZWQmJiFzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZyl7c3RhdGUucmVhZGFibGVMaXN0ZW5pbmc9c3RhdGUubmVlZFJlYWRhYmxlPXRydWU7c3RhdGUuZW1pdHRlZFJlYWRhYmxlPWZhbHNlO2lmKCFzdGF0ZS5yZWFkaW5nKXtwbmEubmV4dFRpY2soblJlYWRpbmdOZXh0VGljayx0aGlzKX1lbHNlIGlmKHN0YXRlLmxlbmd0aCl7ZW1pdFJlYWRhYmxlKHRoaXMpfX19cmV0dXJuIHJlc307UmVhZGFibGUucHJvdG90eXBlLmFkZExpc3RlbmVyPVJlYWRhYmxlLnByb3RvdHlwZS5vbjtmdW5jdGlvbiBuUmVhZGluZ05leHRUaWNrKHNlbGYpe2RlYnVnKCJyZWFkYWJsZSBuZXh0dGljayByZWFkIDAiKTtzZWxmLnJlYWQoMCl9UmVhZGFibGUucHJvdG90eXBlLnJlc3VtZT1mdW5jdGlvbigpe3ZhciBzdGF0ZT10aGlzLl9yZWFkYWJsZVN0YXRlO2lmKCFzdGF0ZS5mbG93aW5nKXtkZWJ1ZygicmVzdW1lIik7c3RhdGUuZmxvd2luZz10cnVlO3Jlc3VtZSh0aGlzLHN0YXRlKX1yZXR1cm4gdGhpc307ZnVuY3Rpb24gcmVzdW1lKHN0cmVhbSxzdGF0ZSl7aWYoIXN0YXRlLnJlc3VtZVNjaGVkdWxlZCl7c3RhdGUucmVzdW1lU2NoZWR1bGVkPXRydWU7cG5hLm5leHRUaWNrKHJlc3VtZV8sc3RyZWFtLHN0YXRlKX19ZnVuY3Rpb24gcmVzdW1lXyhzdHJlYW0sc3RhdGUpe2lmKCFzdGF0ZS5yZWFkaW5nKXtkZWJ1ZygicmVzdW1lIHJlYWQgMCIpO3N0cmVhbS5yZWFkKDApfXN0YXRlLnJlc3VtZVNjaGVkdWxlZD1mYWxzZTtzdGF0ZS5hd2FpdERyYWluPTA7c3RyZWFtLmVtaXQoInJlc3VtZSIpO2Zsb3coc3RyZWFtKTtpZihzdGF0ZS5mbG93aW5nJiYhc3RhdGUucmVhZGluZylzdHJlYW0ucmVhZCgwKX1SZWFkYWJsZS5wcm90b3R5cGUucGF1c2U9ZnVuY3Rpb24oKXtkZWJ1ZygiY2FsbCBwYXVzZSBmbG93aW5nPSVqIix0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmcpO2lmKGZhbHNlIT09dGhpcy5fcmVhZGFibGVTdGF0ZS5mbG93aW5nKXtkZWJ1ZygicGF1c2UiKTt0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmc9ZmFsc2U7dGhpcy5lbWl0KCJwYXVzZSIpfXJldHVybiB0aGlzfTtmdW5jdGlvbiBmbG93KHN0cmVhbSl7dmFyIHN0YXRlPXN0cmVhbS5fcmVhZGFibGVTdGF0ZTtkZWJ1ZygiZmxvdyIsc3RhdGUuZmxvd2luZyk7d2hpbGUoc3RhdGUuZmxvd2luZyYmc3RyZWFtLnJlYWQoKSE9PW51bGwpe319UmVhZGFibGUucHJvdG90eXBlLndyYXA9ZnVuY3Rpb24oc3RyZWFtKXt2YXIgX3RoaXM9dGhpczt2YXIgc3RhdGU9dGhpcy5fcmVhZGFibGVTdGF0ZTt2YXIgcGF1c2VkPWZhbHNlO3N0cmVhbS5vbigiZW5kIixmdW5jdGlvbigpe2RlYnVnKCJ3cmFwcGVkIGVuZCIpO2lmKHN0YXRlLmRlY29kZXImJiFzdGF0ZS5lbmRlZCl7dmFyIGNodW5rPXN0YXRlLmRlY29kZXIuZW5kKCk7aWYoY2h1bmsmJmNodW5rLmxlbmd0aClfdGhpcy5wdXNoKGNodW5rKX1fdGhpcy5wdXNoKG51bGwpfSk7c3RyZWFtLm9uKCJkYXRhIixmdW5jdGlvbihjaHVuayl7ZGVidWcoIndyYXBwZWQgZGF0YSIpO2lmKHN0YXRlLmRlY29kZXIpY2h1bms9c3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7aWYoc3RhdGUub2JqZWN0TW9kZSYmKGNodW5rPT09bnVsbHx8Y2h1bms9PT11bmRlZmluZWQpKXJldHVybjtlbHNlIGlmKCFzdGF0ZS5vYmplY3RNb2RlJiYoIWNodW5rfHwhY2h1bmsubGVuZ3RoKSlyZXR1cm47dmFyIHJldD1fdGhpcy5wdXNoKGNodW5rKTtpZighcmV0KXtwYXVzZWQ9dHJ1ZTtzdHJlYW0ucGF1c2UoKX19KTtmb3IodmFyIGkgaW4gc3RyZWFtKXtpZih0aGlzW2ldPT09dW5kZWZpbmVkJiZ0eXBlb2Ygc3RyZWFtW2ldPT09ImZ1bmN0aW9uIil7dGhpc1tpXT1mdW5jdGlvbihtZXRob2Qpe3JldHVybiBmdW5jdGlvbigpe3JldHVybiBzdHJlYW1bbWV0aG9kXS5hcHBseShzdHJlYW0sYXJndW1lbnRzKX19KGkpfX1mb3IodmFyIG49MDtuPGtQcm94eUV2ZW50cy5sZW5ndGg7bisrKXtzdHJlYW0ub24oa1Byb3h5RXZlbnRzW25dLHRoaXMuZW1pdC5iaW5kKHRoaXMsa1Byb3h5RXZlbnRzW25dKSl9dGhpcy5fcmVhZD1mdW5jdGlvbihuKXtkZWJ1Zygid3JhcHBlZCBfcmVhZCIsbik7aWYocGF1c2VkKXtwYXVzZWQ9ZmFsc2U7c3RyZWFtLnJlc3VtZSgpfX07cmV0dXJuIHRoaXN9O09iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWFkYWJsZS5wcm90b3R5cGUsInJlYWRhYmxlSGlnaFdhdGVyTWFyayIse2VudW1lcmFibGU6ZmFsc2UsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRhYmxlU3RhdGUuaGlnaFdhdGVyTWFya319KTtSZWFkYWJsZS5fZnJvbUxpc3Q9ZnJvbUxpc3Q7ZnVuY3Rpb24gZnJvbUxpc3QobixzdGF0ZSl7aWYoc3RhdGUubGVuZ3RoPT09MClyZXR1cm4gbnVsbDt2YXIgcmV0O2lmKHN0YXRlLm9iamVjdE1vZGUpcmV0PXN0YXRlLmJ1ZmZlci5zaGlmdCgpO2Vsc2UgaWYoIW58fG4+PXN0YXRlLmxlbmd0aCl7aWYoc3RhdGUuZGVjb2RlcilyZXQ9c3RhdGUuYnVmZmVyLmpvaW4oIiIpO2Vsc2UgaWYoc3RhdGUuYnVmZmVyLmxlbmd0aD09PTEpcmV0PXN0YXRlLmJ1ZmZlci5oZWFkLmRhdGE7ZWxzZSByZXQ9c3RhdGUuYnVmZmVyLmNvbmNhdChzdGF0ZS5sZW5ndGgpO3N0YXRlLmJ1ZmZlci5jbGVhcigpfWVsc2V7cmV0PWZyb21MaXN0UGFydGlhbChuLHN0YXRlLmJ1ZmZlcixzdGF0ZS5kZWNvZGVyKX1yZXR1cm4gcmV0fWZ1bmN0aW9uIGZyb21MaXN0UGFydGlhbChuLGxpc3QsaGFzU3RyaW5ncyl7dmFyIHJldDtpZihuPGxpc3QuaGVhZC5kYXRhLmxlbmd0aCl7cmV0PWxpc3QuaGVhZC5kYXRhLnNsaWNlKDAsbik7bGlzdC5oZWFkLmRhdGE9bGlzdC5oZWFkLmRhdGEuc2xpY2Uobil9ZWxzZSBpZihuPT09bGlzdC5oZWFkLmRhdGEubGVuZ3RoKXtyZXQ9bGlzdC5zaGlmdCgpfWVsc2V7cmV0PWhhc1N0cmluZ3M/Y29weUZyb21CdWZmZXJTdHJpbmcobixsaXN0KTpjb3B5RnJvbUJ1ZmZlcihuLGxpc3QpfXJldHVybiByZXR9ZnVuY3Rpb24gY29weUZyb21CdWZmZXJTdHJpbmcobixsaXN0KXt2YXIgcD1saXN0LmhlYWQ7dmFyIGM9MTt2YXIgcmV0PXAuZGF0YTtuLT1yZXQubGVuZ3RoO3doaWxlKHA9cC5uZXh0KXt2YXIgc3RyPXAuZGF0YTt2YXIgbmI9bj5zdHIubGVuZ3RoP3N0ci5sZW5ndGg6bjtpZihuYj09PXN0ci5sZW5ndGgpcmV0Kz1zdHI7ZWxzZSByZXQrPXN0ci5zbGljZSgwLG4pO24tPW5iO2lmKG49PT0wKXtpZihuYj09PXN0ci5sZW5ndGgpeysrYztpZihwLm5leHQpbGlzdC5oZWFkPXAubmV4dDtlbHNlIGxpc3QuaGVhZD1saXN0LnRhaWw9bnVsbH1lbHNle2xpc3QuaGVhZD1wO3AuZGF0YT1zdHIuc2xpY2UobmIpfWJyZWFrfSsrY31saXN0Lmxlbmd0aC09YztyZXR1cm4gcmV0fWZ1bmN0aW9uIGNvcHlGcm9tQnVmZmVyKG4sbGlzdCl7dmFyIHJldD1CdWZmZXIuYWxsb2NVbnNhZmUobik7dmFyIHA9bGlzdC5oZWFkO3ZhciBjPTE7cC5kYXRhLmNvcHkocmV0KTtuLT1wLmRhdGEubGVuZ3RoO3doaWxlKHA9cC5uZXh0KXt2YXIgYnVmPXAuZGF0YTt2YXIgbmI9bj5idWYubGVuZ3RoP2J1Zi5sZW5ndGg6bjtidWYuY29weShyZXQscmV0Lmxlbmd0aC1uLDAsbmIpO24tPW5iO2lmKG49PT0wKXtpZihuYj09PWJ1Zi5sZW5ndGgpeysrYztpZihwLm5leHQpbGlzdC5oZWFkPXAubmV4dDtlbHNlIGxpc3QuaGVhZD1saXN0LnRhaWw9bnVsbH1lbHNle2xpc3QuaGVhZD1wO3AuZGF0YT1idWYuc2xpY2UobmIpfWJyZWFrfSsrY31saXN0Lmxlbmd0aC09YztyZXR1cm4gcmV0fWZ1bmN0aW9uIGVuZFJlYWRhYmxlKHN0cmVhbSl7dmFyIHN0YXRlPXN0cmVhbS5fcmVhZGFibGVTdGF0ZTtpZihzdGF0ZS5sZW5ndGg+MCl0aHJvdyBuZXcgRXJyb3IoJyJlbmRSZWFkYWJsZSgpIiBjYWxsZWQgb24gbm9uLWVtcHR5IHN0cmVhbScpO2lmKCFzdGF0ZS5lbmRFbWl0dGVkKXtzdGF0ZS5lbmRlZD10cnVlO3BuYS5uZXh0VGljayhlbmRSZWFkYWJsZU5ULHN0YXRlLHN0cmVhbSl9fWZ1bmN0aW9uIGVuZFJlYWRhYmxlTlQoc3RhdGUsc3RyZWFtKXtpZighc3RhdGUuZW5kRW1pdHRlZCYmc3RhdGUubGVuZ3RoPT09MCl7c3RhdGUuZW5kRW1pdHRlZD10cnVlO3N0cmVhbS5yZWFkYWJsZT1mYWxzZTtzdHJlYW0uZW1pdCgiZW5kIil9fWZ1bmN0aW9uIGluZGV4T2YoeHMseCl7Zm9yKHZhciBpPTAsbD14cy5sZW5ndGg7aTxsO2krKyl7aWYoeHNbaV09PT14KXJldHVybiBpfXJldHVybi0xfX0pLmNhbGwodGhpcyxyZXF1aXJlKCJfcHJvY2VzcyIpLHR5cGVvZiBnbG9iYWwhPT0idW5kZWZpbmVkIj9nbG9iYWw6dHlwZW9mIHNlbGYhPT0idW5kZWZpbmVkIj9zZWxmOnR5cGVvZiB3aW5kb3chPT0idW5kZWZpbmVkIj93aW5kb3c6e30pfSx7Ii4vX3N0cmVhbV9kdXBsZXgiOjY4LCIuL2ludGVybmFsL3N0cmVhbXMvQnVmZmVyTGlzdCI6NzMsIi4vaW50ZXJuYWwvc3RyZWFtcy9kZXN0cm95Ijo3NCwiLi9pbnRlcm5hbC9zdHJlYW1zL3N0cmVhbSI6NzUsX3Byb2Nlc3M6NjYsImNvcmUtdXRpbC1pcyI6MzAsZXZlbnRzOjMzLGluaGVyaXRzOjM2LGlzYXJyYXk6MzgsInByb2Nlc3MtbmV4dGljay1hcmdzIjo2NSwic2FmZS1idWZmZXIiOjc2LCJzdHJpbmdfZGVjb2Rlci8iOjEwMix1dGlsOjI2fV0sNzE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijttb2R1bGUuZXhwb3J0cz1UcmFuc2Zvcm07dmFyIER1cGxleD1yZXF1aXJlKCIuL19zdHJlYW1fZHVwbGV4Iik7dmFyIHV0aWw9T2JqZWN0LmNyZWF0ZShyZXF1aXJlKCJjb3JlLXV0aWwtaXMiKSk7dXRpbC5pbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3V0aWwuaW5oZXJpdHMoVHJhbnNmb3JtLER1cGxleCk7ZnVuY3Rpb24gYWZ0ZXJUcmFuc2Zvcm0oZXIsZGF0YSl7dmFyIHRzPXRoaXMuX3RyYW5zZm9ybVN0YXRlO3RzLnRyYW5zZm9ybWluZz1mYWxzZTt2YXIgY2I9dHMud3JpdGVjYjtpZighY2Ipe3JldHVybiB0aGlzLmVtaXQoImVycm9yIixuZXcgRXJyb3IoIndyaXRlIGNhbGxiYWNrIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyIpKX10cy53cml0ZWNodW5rPW51bGw7dHMud3JpdGVjYj1udWxsO2lmKGRhdGEhPW51bGwpdGhpcy5wdXNoKGRhdGEpO2NiKGVyKTt2YXIgcnM9dGhpcy5fcmVhZGFibGVTdGF0ZTtycy5yZWFkaW5nPWZhbHNlO2lmKHJzLm5lZWRSZWFkYWJsZXx8cnMubGVuZ3RoPHJzLmhpZ2hXYXRlck1hcmspe3RoaXMuX3JlYWQocnMuaGlnaFdhdGVyTWFyayl9fWZ1bmN0aW9uIFRyYW5zZm9ybShvcHRpb25zKXtpZighKHRoaXMgaW5zdGFuY2VvZiBUcmFuc2Zvcm0pKXJldHVybiBuZXcgVHJhbnNmb3JtKG9wdGlvbnMpO0R1cGxleC5jYWxsKHRoaXMsb3B0aW9ucyk7dGhpcy5fdHJhbnNmb3JtU3RhdGU9e2FmdGVyVHJhbnNmb3JtOmFmdGVyVHJhbnNmb3JtLmJpbmQodGhpcyksbmVlZFRyYW5zZm9ybTpmYWxzZSx0cmFuc2Zvcm1pbmc6ZmFsc2Usd3JpdGVjYjpudWxsLHdyaXRlY2h1bms6bnVsbCx3cml0ZWVuY29kaW5nOm51bGx9O3RoaXMuX3JlYWRhYmxlU3RhdGUubmVlZFJlYWRhYmxlPXRydWU7dGhpcy5fcmVhZGFibGVTdGF0ZS5zeW5jPWZhbHNlO2lmKG9wdGlvbnMpe2lmKHR5cGVvZiBvcHRpb25zLnRyYW5zZm9ybT09PSJmdW5jdGlvbiIpdGhpcy5fdHJhbnNmb3JtPW9wdGlvbnMudHJhbnNmb3JtO2lmKHR5cGVvZiBvcHRpb25zLmZsdXNoPT09ImZ1bmN0aW9uIil0aGlzLl9mbHVzaD1vcHRpb25zLmZsdXNofXRoaXMub24oInByZWZpbmlzaCIscHJlZmluaXNoKX1mdW5jdGlvbiBwcmVmaW5pc2goKXt2YXIgX3RoaXM9dGhpcztpZih0eXBlb2YgdGhpcy5fZmx1c2g9PT0iZnVuY3Rpb24iKXt0aGlzLl9mbHVzaChmdW5jdGlvbihlcixkYXRhKXtkb25lKF90aGlzLGVyLGRhdGEpfSl9ZWxzZXtkb25lKHRoaXMsbnVsbCxudWxsKX19VHJhbnNmb3JtLnByb3RvdHlwZS5wdXNoPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nKXt0aGlzLl90cmFuc2Zvcm1TdGF0ZS5uZWVkVHJhbnNmb3JtPWZhbHNlO3JldHVybiBEdXBsZXgucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLGNodW5rLGVuY29kaW5nKX07VHJhbnNmb3JtLnByb3RvdHlwZS5fdHJhbnNmb3JtPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNiKXt0aHJvdyBuZXcgRXJyb3IoIl90cmFuc2Zvcm0oKSBpcyBub3QgaW1wbGVtZW50ZWQiKX07VHJhbnNmb3JtLnByb3RvdHlwZS5fd3JpdGU9ZnVuY3Rpb24oY2h1bmssZW5jb2RpbmcsY2Ipe3ZhciB0cz10aGlzLl90cmFuc2Zvcm1TdGF0ZTt0cy53cml0ZWNiPWNiO3RzLndyaXRlY2h1bms9Y2h1bms7dHMud3JpdGVlbmNvZGluZz1lbmNvZGluZztpZighdHMudHJhbnNmb3JtaW5nKXt2YXIgcnM9dGhpcy5fcmVhZGFibGVTdGF0ZTtpZih0cy5uZWVkVHJhbnNmb3JtfHxycy5uZWVkUmVhZGFibGV8fHJzLmxlbmd0aDxycy5oaWdoV2F0ZXJNYXJrKXRoaXMuX3JlYWQocnMuaGlnaFdhdGVyTWFyayl9fTtUcmFuc2Zvcm0ucHJvdG90eXBlLl9yZWFkPWZ1bmN0aW9uKG4pe3ZhciB0cz10aGlzLl90cmFuc2Zvcm1TdGF0ZTtpZih0cy53cml0ZWNodW5rIT09bnVsbCYmdHMud3JpdGVjYiYmIXRzLnRyYW5zZm9ybWluZyl7dHMudHJhbnNmb3JtaW5nPXRydWU7dGhpcy5fdHJhbnNmb3JtKHRzLndyaXRlY2h1bmssdHMud3JpdGVlbmNvZGluZyx0cy5hZnRlclRyYW5zZm9ybSl9ZWxzZXt0cy5uZWVkVHJhbnNmb3JtPXRydWV9fTtUcmFuc2Zvcm0ucHJvdG90eXBlLl9kZXN0cm95PWZ1bmN0aW9uKGVycixjYil7dmFyIF90aGlzMj10aGlzO0R1cGxleC5wcm90b3R5cGUuX2Rlc3Ryb3kuY2FsbCh0aGlzLGVycixmdW5jdGlvbihlcnIyKXtjYihlcnIyKTtfdGhpczIuZW1pdCgiY2xvc2UiKX0pfTtmdW5jdGlvbiBkb25lKHN0cmVhbSxlcixkYXRhKXtpZihlcilyZXR1cm4gc3RyZWFtLmVtaXQoImVycm9yIixlcik7aWYoZGF0YSE9bnVsbClzdHJlYW0ucHVzaChkYXRhKTtpZihzdHJlYW0uX3dyaXRhYmxlU3RhdGUubGVuZ3RoKXRocm93IG5ldyBFcnJvcigiQ2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHdzLmxlbmd0aCAhPSAwIik7aWYoc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZS50cmFuc2Zvcm1pbmcpdGhyb3cgbmV3IEVycm9yKCJDYWxsaW5nIHRyYW5zZm9ybSBkb25lIHdoZW4gc3RpbGwgdHJhbnNmb3JtaW5nIik7cmV0dXJuIHN0cmVhbS5wdXNoKG51bGwpfX0seyIuL19zdHJlYW1fZHVwbGV4Ijo2OCwiY29yZS11dGlsLWlzIjozMCxpbmhlcml0czozNn1dLDcyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2VzcyxnbG9iYWwsc2V0SW1tZWRpYXRlKXsidXNlIHN0cmljdCI7dmFyIHBuYT1yZXF1aXJlKCJwcm9jZXNzLW5leHRpY2stYXJncyIpO21vZHVsZS5leHBvcnRzPVdyaXRhYmxlO2Z1bmN0aW9uIFdyaXRlUmVxKGNodW5rLGVuY29kaW5nLGNiKXt0aGlzLmNodW5rPWNodW5rO3RoaXMuZW5jb2Rpbmc9ZW5jb2Rpbmc7dGhpcy5jYWxsYmFjaz1jYjt0aGlzLm5leHQ9bnVsbH1mdW5jdGlvbiBDb3JrZWRSZXF1ZXN0KHN0YXRlKXt2YXIgX3RoaXM9dGhpczt0aGlzLm5leHQ9bnVsbDt0aGlzLmVudHJ5PW51bGw7dGhpcy5maW5pc2g9ZnVuY3Rpb24oKXtvbkNvcmtlZEZpbmlzaChfdGhpcyxzdGF0ZSl9fXZhciBhc3luY1dyaXRlPSFwcm9jZXNzLmJyb3dzZXImJlsidjAuMTAiLCJ2MC45LiJdLmluZGV4T2YocHJvY2Vzcy52ZXJzaW9uLnNsaWNlKDAsNSkpPi0xP3NldEltbWVkaWF0ZTpwbmEubmV4dFRpY2s7dmFyIER1cGxleDtXcml0YWJsZS5Xcml0YWJsZVN0YXRlPVdyaXRhYmxlU3RhdGU7dmFyIHV0aWw9T2JqZWN0LmNyZWF0ZShyZXF1aXJlKCJjb3JlLXV0aWwtaXMiKSk7dXRpbC5pbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBpbnRlcm5hbFV0aWw9e2RlcHJlY2F0ZTpyZXF1aXJlKCJ1dGlsLWRlcHJlY2F0ZSIpfTt2YXIgU3RyZWFtPXJlcXVpcmUoIi4vaW50ZXJuYWwvc3RyZWFtcy9zdHJlYW0iKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBPdXJVaW50OEFycmF5PWdsb2JhbC5VaW50OEFycmF5fHxmdW5jdGlvbigpe307ZnVuY3Rpb24gX3VpbnQ4QXJyYXlUb0J1ZmZlcihjaHVuayl7cmV0dXJuIEJ1ZmZlci5mcm9tKGNodW5rKX1mdW5jdGlvbiBfaXNVaW50OEFycmF5KG9iail7cmV0dXJuIEJ1ZmZlci5pc0J1ZmZlcihvYmopfHxvYmogaW5zdGFuY2VvZiBPdXJVaW50OEFycmF5fXZhciBkZXN0cm95SW1wbD1yZXF1aXJlKCIuL2ludGVybmFsL3N0cmVhbXMvZGVzdHJveSIpO3V0aWwuaW5oZXJpdHMoV3JpdGFibGUsU3RyZWFtKTtmdW5jdGlvbiBub3AoKXt9ZnVuY3Rpb24gV3JpdGFibGVTdGF0ZShvcHRpb25zLHN0cmVhbSl7RHVwbGV4PUR1cGxleHx8cmVxdWlyZSgiLi9fc3RyZWFtX2R1cGxleCIpO29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGlzRHVwbGV4PXN0cmVhbSBpbnN0YW5jZW9mIER1cGxleDt0aGlzLm9iamVjdE1vZGU9ISFvcHRpb25zLm9iamVjdE1vZGU7aWYoaXNEdXBsZXgpdGhpcy5vYmplY3RNb2RlPXRoaXMub2JqZWN0TW9kZXx8ISFvcHRpb25zLndyaXRhYmxlT2JqZWN0TW9kZTt2YXIgaHdtPW9wdGlvbnMuaGlnaFdhdGVyTWFyazt2YXIgd3JpdGFibGVId209b3B0aW9ucy53cml0YWJsZUhpZ2hXYXRlck1hcms7dmFyIGRlZmF1bHRId209dGhpcy5vYmplY3RNb2RlPzE2OjE2KjEwMjQ7aWYoaHdtfHxod209PT0wKXRoaXMuaGlnaFdhdGVyTWFyaz1od207ZWxzZSBpZihpc0R1cGxleCYmKHdyaXRhYmxlSHdtfHx3cml0YWJsZUh3bT09PTApKXRoaXMuaGlnaFdhdGVyTWFyaz13cml0YWJsZUh3bTtlbHNlIHRoaXMuaGlnaFdhdGVyTWFyaz1kZWZhdWx0SHdtO3RoaXMuaGlnaFdhdGVyTWFyaz1NYXRoLmZsb29yKHRoaXMuaGlnaFdhdGVyTWFyayk7dGhpcy5maW5hbENhbGxlZD1mYWxzZTt0aGlzLm5lZWREcmFpbj1mYWxzZTt0aGlzLmVuZGluZz1mYWxzZTt0aGlzLmVuZGVkPWZhbHNlO3RoaXMuZmluaXNoZWQ9ZmFsc2U7dGhpcy5kZXN0cm95ZWQ9ZmFsc2U7dmFyIG5vRGVjb2RlPW9wdGlvbnMuZGVjb2RlU3RyaW5ncz09PWZhbHNlO3RoaXMuZGVjb2RlU3RyaW5ncz0hbm9EZWNvZGU7dGhpcy5kZWZhdWx0RW5jb2Rpbmc9b3B0aW9ucy5kZWZhdWx0RW5jb2Rpbmd8fCJ1dGY4Ijt0aGlzLmxlbmd0aD0wO3RoaXMud3JpdGluZz1mYWxzZTt0aGlzLmNvcmtlZD0wO3RoaXMuc3luYz10cnVlO3RoaXMuYnVmZmVyUHJvY2Vzc2luZz1mYWxzZTt0aGlzLm9ud3JpdGU9ZnVuY3Rpb24oZXIpe29ud3JpdGUoc3RyZWFtLGVyKX07dGhpcy53cml0ZWNiPW51bGw7dGhpcy53cml0ZWxlbj0wO3RoaXMuYnVmZmVyZWRSZXF1ZXN0PW51bGw7dGhpcy5sYXN0QnVmZmVyZWRSZXF1ZXN0PW51bGw7dGhpcy5wZW5kaW5nY2I9MDt0aGlzLnByZWZpbmlzaGVkPWZhbHNlO3RoaXMuZXJyb3JFbWl0dGVkPWZhbHNlO3RoaXMuYnVmZmVyZWRSZXF1ZXN0Q291bnQ9MDt0aGlzLmNvcmtlZFJlcXVlc3RzRnJlZT1uZXcgQ29ya2VkUmVxdWVzdCh0aGlzKX1Xcml0YWJsZVN0YXRlLnByb3RvdHlwZS5nZXRCdWZmZXI9ZnVuY3Rpb24gZ2V0QnVmZmVyKCl7dmFyIGN1cnJlbnQ9dGhpcy5idWZmZXJlZFJlcXVlc3Q7dmFyIG91dD1bXTt3aGlsZShjdXJyZW50KXtvdXQucHVzaChjdXJyZW50KTtjdXJyZW50PWN1cnJlbnQubmV4dH1yZXR1cm4gb3V0fTsoZnVuY3Rpb24oKXt0cnl7T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRhYmxlU3RhdGUucHJvdG90eXBlLCJidWZmZXIiLHtnZXQ6aW50ZXJuYWxVdGlsLmRlcHJlY2F0ZShmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldEJ1ZmZlcigpfSwiX3dyaXRhYmxlU3RhdGUuYnVmZmVyIGlzIGRlcHJlY2F0ZWQuIFVzZSBfd3JpdGFibGVTdGF0ZS5nZXRCdWZmZXIgIisiaW5zdGVhZC4iLCJERVAwMDAzIil9KX1jYXRjaChfKXt9fSkoKTt2YXIgcmVhbEhhc0luc3RhbmNlO2lmKHR5cGVvZiBTeW1ib2w9PT0iZnVuY3Rpb24iJiZTeW1ib2wuaGFzSW5zdGFuY2UmJnR5cGVvZiBGdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXT09PSJmdW5jdGlvbiIpe3JlYWxIYXNJbnN0YW5jZT1GdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXTtPYmplY3QuZGVmaW5lUHJvcGVydHkoV3JpdGFibGUsU3ltYm9sLmhhc0luc3RhbmNlLHt2YWx1ZTpmdW5jdGlvbihvYmplY3Qpe2lmKHJlYWxIYXNJbnN0YW5jZS5jYWxsKHRoaXMsb2JqZWN0KSlyZXR1cm4gdHJ1ZTtpZih0aGlzIT09V3JpdGFibGUpcmV0dXJuIGZhbHNlO3JldHVybiBvYmplY3QmJm9iamVjdC5fd3JpdGFibGVTdGF0ZSBpbnN0YW5jZW9mIFdyaXRhYmxlU3RhdGV9fSl9ZWxzZXtyZWFsSGFzSW5zdGFuY2U9ZnVuY3Rpb24ob2JqZWN0KXtyZXR1cm4gb2JqZWN0IGluc3RhbmNlb2YgdGhpc319ZnVuY3Rpb24gV3JpdGFibGUob3B0aW9ucyl7RHVwbGV4PUR1cGxleHx8cmVxdWlyZSgiLi9fc3RyZWFtX2R1cGxleCIpO2lmKCFyZWFsSGFzSW5zdGFuY2UuY2FsbChXcml0YWJsZSx0aGlzKSYmISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSl7cmV0dXJuIG5ldyBXcml0YWJsZShvcHRpb25zKX10aGlzLl93cml0YWJsZVN0YXRlPW5ldyBXcml0YWJsZVN0YXRlKG9wdGlvbnMsdGhpcyk7dGhpcy53cml0YWJsZT10cnVlO2lmKG9wdGlvbnMpe2lmKHR5cGVvZiBvcHRpb25zLndyaXRlPT09ImZ1bmN0aW9uIil0aGlzLl93cml0ZT1vcHRpb25zLndyaXRlO2lmKHR5cGVvZiBvcHRpb25zLndyaXRldj09PSJmdW5jdGlvbiIpdGhpcy5fd3JpdGV2PW9wdGlvbnMud3JpdGV2O2lmKHR5cGVvZiBvcHRpb25zLmRlc3Ryb3k9PT0iZnVuY3Rpb24iKXRoaXMuX2Rlc3Ryb3k9b3B0aW9ucy5kZXN0cm95O2lmKHR5cGVvZiBvcHRpb25zLmZpbmFsPT09ImZ1bmN0aW9uIil0aGlzLl9maW5hbD1vcHRpb25zLmZpbmFsfVN0cmVhbS5jYWxsKHRoaXMpfVdyaXRhYmxlLnByb3RvdHlwZS5waXBlPWZ1bmN0aW9uKCl7dGhpcy5lbWl0KCJlcnJvciIsbmV3IEVycm9yKCJDYW5ub3QgcGlwZSwgbm90IHJlYWRhYmxlIikpfTtmdW5jdGlvbiB3cml0ZUFmdGVyRW5kKHN0cmVhbSxjYil7dmFyIGVyPW5ldyBFcnJvcigid3JpdGUgYWZ0ZXIgZW5kIik7c3RyZWFtLmVtaXQoImVycm9yIixlcik7cG5hLm5leHRUaWNrKGNiLGVyKX1mdW5jdGlvbiB2YWxpZENodW5rKHN0cmVhbSxzdGF0ZSxjaHVuayxjYil7dmFyIHZhbGlkPXRydWU7dmFyIGVyPWZhbHNlO2lmKGNodW5rPT09bnVsbCl7ZXI9bmV3IFR5cGVFcnJvcigiTWF5IG5vdCB3cml0ZSBudWxsIHZhbHVlcyB0byBzdHJlYW0iKX1lbHNlIGlmKHR5cGVvZiBjaHVuayE9PSJzdHJpbmciJiZjaHVuayE9PXVuZGVmaW5lZCYmIXN0YXRlLm9iamVjdE1vZGUpe2VyPW5ldyBUeXBlRXJyb3IoIkludmFsaWQgbm9uLXN0cmluZy9idWZmZXIgY2h1bmsiKX1pZihlcil7c3RyZWFtLmVtaXQoImVycm9yIixlcik7cG5hLm5leHRUaWNrKGNiLGVyKTt2YWxpZD1mYWxzZX1yZXR1cm4gdmFsaWR9V3JpdGFibGUucHJvdG90eXBlLndyaXRlPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNiKXt2YXIgc3RhdGU9dGhpcy5fd3JpdGFibGVTdGF0ZTt2YXIgcmV0PWZhbHNlO3ZhciBpc0J1Zj0hc3RhdGUub2JqZWN0TW9kZSYmX2lzVWludDhBcnJheShjaHVuayk7aWYoaXNCdWYmJiFCdWZmZXIuaXNCdWZmZXIoY2h1bmspKXtjaHVuaz1fdWludDhBcnJheVRvQnVmZmVyKGNodW5rKX1pZih0eXBlb2YgZW5jb2Rpbmc9PT0iZnVuY3Rpb24iKXtjYj1lbmNvZGluZztlbmNvZGluZz1udWxsfWlmKGlzQnVmKWVuY29kaW5nPSJidWZmZXIiO2Vsc2UgaWYoIWVuY29kaW5nKWVuY29kaW5nPXN0YXRlLmRlZmF1bHRFbmNvZGluZztpZih0eXBlb2YgY2IhPT0iZnVuY3Rpb24iKWNiPW5vcDtpZihzdGF0ZS5lbmRlZCl3cml0ZUFmdGVyRW5kKHRoaXMsY2IpO2Vsc2UgaWYoaXNCdWZ8fHZhbGlkQ2h1bmsodGhpcyxzdGF0ZSxjaHVuayxjYikpe3N0YXRlLnBlbmRpbmdjYisrO3JldD13cml0ZU9yQnVmZmVyKHRoaXMsc3RhdGUsaXNCdWYsY2h1bmssZW5jb2RpbmcsY2IpfXJldHVybiByZXR9O1dyaXRhYmxlLnByb3RvdHlwZS5jb3JrPWZ1bmN0aW9uKCl7dmFyIHN0YXRlPXRoaXMuX3dyaXRhYmxlU3RhdGU7c3RhdGUuY29ya2VkKyt9O1dyaXRhYmxlLnByb3RvdHlwZS51bmNvcms9ZnVuY3Rpb24oKXt2YXIgc3RhdGU9dGhpcy5fd3JpdGFibGVTdGF0ZTtpZihzdGF0ZS5jb3JrZWQpe3N0YXRlLmNvcmtlZC0tO2lmKCFzdGF0ZS53cml0aW5nJiYhc3RhdGUuY29ya2VkJiYhc3RhdGUuZmluaXNoZWQmJiFzdGF0ZS5idWZmZXJQcm9jZXNzaW5nJiZzdGF0ZS5idWZmZXJlZFJlcXVlc3QpY2xlYXJCdWZmZXIodGhpcyxzdGF0ZSl9fTtXcml0YWJsZS5wcm90b3R5cGUuc2V0RGVmYXVsdEVuY29kaW5nPWZ1bmN0aW9uIHNldERlZmF1bHRFbmNvZGluZyhlbmNvZGluZyl7aWYodHlwZW9mIGVuY29kaW5nPT09InN0cmluZyIpZW5jb2Rpbmc9ZW5jb2RpbmcudG9Mb3dlckNhc2UoKTtpZighKFsiaGV4IiwidXRmOCIsInV0Zi04IiwiYXNjaWkiLCJiaW5hcnkiLCJiYXNlNjQiLCJ1Y3MyIiwidWNzLTIiLCJ1dGYxNmxlIiwidXRmLTE2bGUiLCJyYXciXS5pbmRleE9mKChlbmNvZGluZysiIikudG9Mb3dlckNhc2UoKSk+LTEpKXRocm93IG5ldyBUeXBlRXJyb3IoIlVua25vd24gZW5jb2Rpbmc6ICIrZW5jb2RpbmcpO3RoaXMuX3dyaXRhYmxlU3RhdGUuZGVmYXVsdEVuY29kaW5nPWVuY29kaW5nO3JldHVybiB0aGlzfTtmdW5jdGlvbiBkZWNvZGVDaHVuayhzdGF0ZSxjaHVuayxlbmNvZGluZyl7aWYoIXN0YXRlLm9iamVjdE1vZGUmJnN0YXRlLmRlY29kZVN0cmluZ3MhPT1mYWxzZSYmdHlwZW9mIGNodW5rPT09InN0cmluZyIpe2NodW5rPUJ1ZmZlci5mcm9tKGNodW5rLGVuY29kaW5nKX1yZXR1cm4gY2h1bmt9T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRhYmxlLnByb3RvdHlwZSwid3JpdGFibGVIaWdoV2F0ZXJNYXJrIix7ZW51bWVyYWJsZTpmYWxzZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fd3JpdGFibGVTdGF0ZS5oaWdoV2F0ZXJNYXJrfX0pO2Z1bmN0aW9uIHdyaXRlT3JCdWZmZXIoc3RyZWFtLHN0YXRlLGlzQnVmLGNodW5rLGVuY29kaW5nLGNiKXtpZighaXNCdWYpe3ZhciBuZXdDaHVuaz1kZWNvZGVDaHVuayhzdGF0ZSxjaHVuayxlbmNvZGluZyk7aWYoY2h1bmshPT1uZXdDaHVuayl7aXNCdWY9dHJ1ZTtlbmNvZGluZz0iYnVmZmVyIjtjaHVuaz1uZXdDaHVua319dmFyIGxlbj1zdGF0ZS5vYmplY3RNb2RlPzE6Y2h1bmsubGVuZ3RoO3N0YXRlLmxlbmd0aCs9bGVuO3ZhciByZXQ9c3RhdGUubGVuZ3RoPHN0YXRlLmhpZ2hXYXRlck1hcms7aWYoIXJldClzdGF0ZS5uZWVkRHJhaW49dHJ1ZTtpZihzdGF0ZS53cml0aW5nfHxzdGF0ZS5jb3JrZWQpe3ZhciBsYXN0PXN0YXRlLmxhc3RCdWZmZXJlZFJlcXVlc3Q7c3RhdGUubGFzdEJ1ZmZlcmVkUmVxdWVzdD17Y2h1bms6Y2h1bmssZW5jb2Rpbmc6ZW5jb2RpbmcsaXNCdWY6aXNCdWYsY2FsbGJhY2s6Y2IsbmV4dDpudWxsfTtpZihsYXN0KXtsYXN0Lm5leHQ9c3RhdGUubGFzdEJ1ZmZlcmVkUmVxdWVzdH1lbHNle3N0YXRlLmJ1ZmZlcmVkUmVxdWVzdD1zdGF0ZS5sYXN0QnVmZmVyZWRSZXF1ZXN0fXN0YXRlLmJ1ZmZlcmVkUmVxdWVzdENvdW50Kz0xfWVsc2V7ZG9Xcml0ZShzdHJlYW0sc3RhdGUsZmFsc2UsbGVuLGNodW5rLGVuY29kaW5nLGNiKX1yZXR1cm4gcmV0fWZ1bmN0aW9uIGRvV3JpdGUoc3RyZWFtLHN0YXRlLHdyaXRldixsZW4sY2h1bmssZW5jb2RpbmcsY2Ipe3N0YXRlLndyaXRlbGVuPWxlbjtzdGF0ZS53cml0ZWNiPWNiO3N0YXRlLndyaXRpbmc9dHJ1ZTtzdGF0ZS5zeW5jPXRydWU7aWYod3JpdGV2KXN0cmVhbS5fd3JpdGV2KGNodW5rLHN0YXRlLm9ud3JpdGUpO2Vsc2Ugc3RyZWFtLl93cml0ZShjaHVuayxlbmNvZGluZyxzdGF0ZS5vbndyaXRlKTtzdGF0ZS5zeW5jPWZhbHNlfWZ1bmN0aW9uIG9ud3JpdGVFcnJvcihzdHJlYW0sc3RhdGUsc3luYyxlcixjYil7LS1zdGF0ZS5wZW5kaW5nY2I7aWYoc3luYyl7cG5hLm5leHRUaWNrKGNiLGVyKTtwbmEubmV4dFRpY2soZmluaXNoTWF5YmUsc3RyZWFtLHN0YXRlKTtzdHJlYW0uX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkPXRydWU7c3RyZWFtLmVtaXQoImVycm9yIixlcil9ZWxzZXtjYihlcik7c3RyZWFtLl93cml0YWJsZVN0YXRlLmVycm9yRW1pdHRlZD10cnVlO3N0cmVhbS5lbWl0KCJlcnJvciIsZXIpO2ZpbmlzaE1heWJlKHN0cmVhbSxzdGF0ZSl9fWZ1bmN0aW9uIG9ud3JpdGVTdGF0ZVVwZGF0ZShzdGF0ZSl7c3RhdGUud3JpdGluZz1mYWxzZTtzdGF0ZS53cml0ZWNiPW51bGw7c3RhdGUubGVuZ3RoLT1zdGF0ZS53cml0ZWxlbjtzdGF0ZS53cml0ZWxlbj0wfWZ1bmN0aW9uIG9ud3JpdGUoc3RyZWFtLGVyKXt2YXIgc3RhdGU9c3RyZWFtLl93cml0YWJsZVN0YXRlO3ZhciBzeW5jPXN0YXRlLnN5bmM7dmFyIGNiPXN0YXRlLndyaXRlY2I7b253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKTtpZihlcilvbndyaXRlRXJyb3Ioc3RyZWFtLHN0YXRlLHN5bmMsZXIsY2IpO2Vsc2V7dmFyIGZpbmlzaGVkPW5lZWRGaW5pc2goc3RhdGUpO2lmKCFmaW5pc2hlZCYmIXN0YXRlLmNvcmtlZCYmIXN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcmJnN0YXRlLmJ1ZmZlcmVkUmVxdWVzdCl7Y2xlYXJCdWZmZXIoc3RyZWFtLHN0YXRlKX1pZihzeW5jKXthc3luY1dyaXRlKGFmdGVyV3JpdGUsc3RyZWFtLHN0YXRlLGZpbmlzaGVkLGNiKX1lbHNle2FmdGVyV3JpdGUoc3RyZWFtLHN0YXRlLGZpbmlzaGVkLGNiKX19fWZ1bmN0aW9uIGFmdGVyV3JpdGUoc3RyZWFtLHN0YXRlLGZpbmlzaGVkLGNiKXtpZighZmluaXNoZWQpb253cml0ZURyYWluKHN0cmVhbSxzdGF0ZSk7c3RhdGUucGVuZGluZ2NiLS07Y2IoKTtmaW5pc2hNYXliZShzdHJlYW0sc3RhdGUpfWZ1bmN0aW9uIG9ud3JpdGVEcmFpbihzdHJlYW0sc3RhdGUpe2lmKHN0YXRlLmxlbmd0aD09PTAmJnN0YXRlLm5lZWREcmFpbil7c3RhdGUubmVlZERyYWluPWZhbHNlO3N0cmVhbS5lbWl0KCJkcmFpbiIpfX1mdW5jdGlvbiBjbGVhckJ1ZmZlcihzdHJlYW0sc3RhdGUpe3N0YXRlLmJ1ZmZlclByb2Nlc3Npbmc9dHJ1ZTt2YXIgZW50cnk9c3RhdGUuYnVmZmVyZWRSZXF1ZXN0O2lmKHN0cmVhbS5fd3JpdGV2JiZlbnRyeSYmZW50cnkubmV4dCl7dmFyIGw9c3RhdGUuYnVmZmVyZWRSZXF1ZXN0Q291bnQ7dmFyIGJ1ZmZlcj1uZXcgQXJyYXkobCk7dmFyIGhvbGRlcj1zdGF0ZS5jb3JrZWRSZXF1ZXN0c0ZyZWU7aG9sZGVyLmVudHJ5PWVudHJ5O3ZhciBjb3VudD0wO3ZhciBhbGxCdWZmZXJzPXRydWU7d2hpbGUoZW50cnkpe2J1ZmZlcltjb3VudF09ZW50cnk7aWYoIWVudHJ5LmlzQnVmKWFsbEJ1ZmZlcnM9ZmFsc2U7ZW50cnk9ZW50cnkubmV4dDtjb3VudCs9MX1idWZmZXIuYWxsQnVmZmVycz1hbGxCdWZmZXJzO2RvV3JpdGUoc3RyZWFtLHN0YXRlLHRydWUsc3RhdGUubGVuZ3RoLGJ1ZmZlciwiIixob2xkZXIuZmluaXNoKTtzdGF0ZS5wZW5kaW5nY2IrKztzdGF0ZS5sYXN0QnVmZmVyZWRSZXF1ZXN0PW51bGw7aWYoaG9sZGVyLm5leHQpe3N0YXRlLmNvcmtlZFJlcXVlc3RzRnJlZT1ob2xkZXIubmV4dDtob2xkZXIubmV4dD1udWxsfWVsc2V7c3RhdGUuY29ya2VkUmVxdWVzdHNGcmVlPW5ldyBDb3JrZWRSZXF1ZXN0KHN0YXRlKX1zdGF0ZS5idWZmZXJlZFJlcXVlc3RDb3VudD0wfWVsc2V7d2hpbGUoZW50cnkpe3ZhciBjaHVuaz1lbnRyeS5jaHVuazt2YXIgZW5jb2Rpbmc9ZW50cnkuZW5jb2Rpbmc7dmFyIGNiPWVudHJ5LmNhbGxiYWNrO3ZhciBsZW49c3RhdGUub2JqZWN0TW9kZT8xOmNodW5rLmxlbmd0aDtkb1dyaXRlKHN0cmVhbSxzdGF0ZSxmYWxzZSxsZW4sY2h1bmssZW5jb2RpbmcsY2IpO2VudHJ5PWVudHJ5Lm5leHQ7c3RhdGUuYnVmZmVyZWRSZXF1ZXN0Q291bnQtLTtpZihzdGF0ZS53cml0aW5nKXticmVha319aWYoZW50cnk9PT1udWxsKXN0YXRlLmxhc3RCdWZmZXJlZFJlcXVlc3Q9bnVsbH1zdGF0ZS5idWZmZXJlZFJlcXVlc3Q9ZW50cnk7c3RhdGUuYnVmZmVyUHJvY2Vzc2luZz1mYWxzZX1Xcml0YWJsZS5wcm90b3R5cGUuX3dyaXRlPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNiKXtjYihuZXcgRXJyb3IoIl93cml0ZSgpIGlzIG5vdCBpbXBsZW1lbnRlZCIpKX07V3JpdGFibGUucHJvdG90eXBlLl93cml0ZXY9bnVsbDtXcml0YWJsZS5wcm90b3R5cGUuZW5kPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNiKXt2YXIgc3RhdGU9dGhpcy5fd3JpdGFibGVTdGF0ZTtpZih0eXBlb2YgY2h1bms9PT0iZnVuY3Rpb24iKXtjYj1jaHVuaztjaHVuaz1udWxsO2VuY29kaW5nPW51bGx9ZWxzZSBpZih0eXBlb2YgZW5jb2Rpbmc9PT0iZnVuY3Rpb24iKXtjYj1lbmNvZGluZztlbmNvZGluZz1udWxsfWlmKGNodW5rIT09bnVsbCYmY2h1bmshPT11bmRlZmluZWQpdGhpcy53cml0ZShjaHVuayxlbmNvZGluZyk7aWYoc3RhdGUuY29ya2VkKXtzdGF0ZS5jb3JrZWQ9MTt0aGlzLnVuY29yaygpfWlmKCFzdGF0ZS5lbmRpbmcmJiFzdGF0ZS5maW5pc2hlZCllbmRXcml0YWJsZSh0aGlzLHN0YXRlLGNiKX07ZnVuY3Rpb24gbmVlZEZpbmlzaChzdGF0ZSl7cmV0dXJuIHN0YXRlLmVuZGluZyYmc3RhdGUubGVuZ3RoPT09MCYmc3RhdGUuYnVmZmVyZWRSZXF1ZXN0PT09bnVsbCYmIXN0YXRlLmZpbmlzaGVkJiYhc3RhdGUud3JpdGluZ31mdW5jdGlvbiBjYWxsRmluYWwoc3RyZWFtLHN0YXRlKXtzdHJlYW0uX2ZpbmFsKGZ1bmN0aW9uKGVycil7c3RhdGUucGVuZGluZ2NiLS07aWYoZXJyKXtzdHJlYW0uZW1pdCgiZXJyb3IiLGVycil9c3RhdGUucHJlZmluaXNoZWQ9dHJ1ZTtzdHJlYW0uZW1pdCgicHJlZmluaXNoIik7ZmluaXNoTWF5YmUoc3RyZWFtLHN0YXRlKX0pfWZ1bmN0aW9uIHByZWZpbmlzaChzdHJlYW0sc3RhdGUpe2lmKCFzdGF0ZS5wcmVmaW5pc2hlZCYmIXN0YXRlLmZpbmFsQ2FsbGVkKXtpZih0eXBlb2Ygc3RyZWFtLl9maW5hbD09PSJmdW5jdGlvbiIpe3N0YXRlLnBlbmRpbmdjYisrO3N0YXRlLmZpbmFsQ2FsbGVkPXRydWU7cG5hLm5leHRUaWNrKGNhbGxGaW5hbCxzdHJlYW0sc3RhdGUpfWVsc2V7c3RhdGUucHJlZmluaXNoZWQ9dHJ1ZTtzdHJlYW0uZW1pdCgicHJlZmluaXNoIil9fX1mdW5jdGlvbiBmaW5pc2hNYXliZShzdHJlYW0sc3RhdGUpe3ZhciBuZWVkPW5lZWRGaW5pc2goc3RhdGUpO2lmKG5lZWQpe3ByZWZpbmlzaChzdHJlYW0sc3RhdGUpO2lmKHN0YXRlLnBlbmRpbmdjYj09PTApe3N0YXRlLmZpbmlzaGVkPXRydWU7c3RyZWFtLmVtaXQoImZpbmlzaCIpfX1yZXR1cm4gbmVlZH1mdW5jdGlvbiBlbmRXcml0YWJsZShzdHJlYW0sc3RhdGUsY2Ipe3N0YXRlLmVuZGluZz10cnVlO2ZpbmlzaE1heWJlKHN0cmVhbSxzdGF0ZSk7aWYoY2Ipe2lmKHN0YXRlLmZpbmlzaGVkKXBuYS5uZXh0VGljayhjYik7ZWxzZSBzdHJlYW0ub25jZSgiZmluaXNoIixjYil9c3RhdGUuZW5kZWQ9dHJ1ZTtzdHJlYW0ud3JpdGFibGU9ZmFsc2V9ZnVuY3Rpb24gb25Db3JrZWRGaW5pc2goY29ya1JlcSxzdGF0ZSxlcnIpe3ZhciBlbnRyeT1jb3JrUmVxLmVudHJ5O2NvcmtSZXEuZW50cnk9bnVsbDt3aGlsZShlbnRyeSl7dmFyIGNiPWVudHJ5LmNhbGxiYWNrO3N0YXRlLnBlbmRpbmdjYi0tO2NiKGVycik7ZW50cnk9ZW50cnkubmV4dH1pZihzdGF0ZS5jb3JrZWRSZXF1ZXN0c0ZyZWUpe3N0YXRlLmNvcmtlZFJlcXVlc3RzRnJlZS5uZXh0PWNvcmtSZXF9ZWxzZXtzdGF0ZS5jb3JrZWRSZXF1ZXN0c0ZyZWU9Y29ya1JlcX19T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRhYmxlLnByb3RvdHlwZSwiZGVzdHJveWVkIix7Z2V0OmZ1bmN0aW9uKCl7aWYodGhpcy5fd3JpdGFibGVTdGF0ZT09PXVuZGVmaW5lZCl7cmV0dXJuIGZhbHNlfXJldHVybiB0aGlzLl93cml0YWJsZVN0YXRlLmRlc3Ryb3llZH0sc2V0OmZ1bmN0aW9uKHZhbHVlKXtpZighdGhpcy5fd3JpdGFibGVTdGF0ZSl7cmV0dXJufXRoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkPXZhbHVlfX0pO1dyaXRhYmxlLnByb3RvdHlwZS5kZXN0cm95PWRlc3Ryb3lJbXBsLmRlc3Ryb3k7V3JpdGFibGUucHJvdG90eXBlLl91bmRlc3Ryb3k9ZGVzdHJveUltcGwudW5kZXN0cm95O1dyaXRhYmxlLnByb3RvdHlwZS5fZGVzdHJveT1mdW5jdGlvbihlcnIsY2Ipe3RoaXMuZW5kKCk7Y2IoZXJyKX19KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSx0eXBlb2YgZ2xvYmFsIT09InVuZGVmaW5lZCI/Z2xvYmFsOnR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCI/c2VsZjp0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCI/d2luZG93Ont9LHJlcXVpcmUoInRpbWVycyIpLnNldEltbWVkaWF0ZSl9LHsiLi9fc3RyZWFtX2R1cGxleCI6NjgsIi4vaW50ZXJuYWwvc3RyZWFtcy9kZXN0cm95Ijo3NCwiLi9pbnRlcm5hbC9zdHJlYW1zL3N0cmVhbSI6NzUsX3Byb2Nlc3M6NjYsImNvcmUtdXRpbC1pcyI6MzAsaW5oZXJpdHM6MzYsInByb2Nlc3MtbmV4dGljay1hcmdzIjo2NSwic2FmZS1idWZmZXIiOjc2LHRpbWVyczoxMDQsInV0aWwtZGVwcmVjYXRlIjoxMDV9XSw3MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO2Z1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSxDb25zdHJ1Y3Rvcil7aWYoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSl7dGhyb3cgbmV3IFR5cGVFcnJvcigiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uIil9fXZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIHV0aWw9cmVxdWlyZSgidXRpbCIpO2Z1bmN0aW9uIGNvcHlCdWZmZXIoc3JjLHRhcmdldCxvZmZzZXQpe3NyYy5jb3B5KHRhcmdldCxvZmZzZXQpfW1vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gQnVmZmVyTGlzdCgpe19jbGFzc0NhbGxDaGVjayh0aGlzLEJ1ZmZlckxpc3QpO3RoaXMuaGVhZD1udWxsO3RoaXMudGFpbD1udWxsO3RoaXMubGVuZ3RoPTB9QnVmZmVyTGlzdC5wcm90b3R5cGUucHVzaD1mdW5jdGlvbiBwdXNoKHYpe3ZhciBlbnRyeT17ZGF0YTp2LG5leHQ6bnVsbH07aWYodGhpcy5sZW5ndGg+MCl0aGlzLnRhaWwubmV4dD1lbnRyeTtlbHNlIHRoaXMuaGVhZD1lbnRyeTt0aGlzLnRhaWw9ZW50cnk7Kyt0aGlzLmxlbmd0aH07QnVmZmVyTGlzdC5wcm90b3R5cGUudW5zaGlmdD1mdW5jdGlvbiB1bnNoaWZ0KHYpe3ZhciBlbnRyeT17ZGF0YTp2LG5leHQ6dGhpcy5oZWFkfTtpZih0aGlzLmxlbmd0aD09PTApdGhpcy50YWlsPWVudHJ5O3RoaXMuaGVhZD1lbnRyeTsrK3RoaXMubGVuZ3RofTtCdWZmZXJMaXN0LnByb3RvdHlwZS5zaGlmdD1mdW5jdGlvbiBzaGlmdCgpe2lmKHRoaXMubGVuZ3RoPT09MClyZXR1cm47dmFyIHJldD10aGlzLmhlYWQuZGF0YTtpZih0aGlzLmxlbmd0aD09PTEpdGhpcy5oZWFkPXRoaXMudGFpbD1udWxsO2Vsc2UgdGhpcy5oZWFkPXRoaXMuaGVhZC5uZXh0Oy0tdGhpcy5sZW5ndGg7cmV0dXJuIHJldH07QnVmZmVyTGlzdC5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24gY2xlYXIoKXt0aGlzLmhlYWQ9dGhpcy50YWlsPW51bGw7dGhpcy5sZW5ndGg9MH07QnVmZmVyTGlzdC5wcm90b3R5cGUuam9pbj1mdW5jdGlvbiBqb2luKHMpe2lmKHRoaXMubGVuZ3RoPT09MClyZXR1cm4iIjt2YXIgcD10aGlzLmhlYWQ7dmFyIHJldD0iIitwLmRhdGE7d2hpbGUocD1wLm5leHQpe3JldCs9cytwLmRhdGF9cmV0dXJuIHJldH07QnVmZmVyTGlzdC5wcm90b3R5cGUuY29uY2F0PWZ1bmN0aW9uIGNvbmNhdChuKXtpZih0aGlzLmxlbmd0aD09PTApcmV0dXJuIEJ1ZmZlci5hbGxvYygwKTtpZih0aGlzLmxlbmd0aD09PTEpcmV0dXJuIHRoaXMuaGVhZC5kYXRhO3ZhciByZXQ9QnVmZmVyLmFsbG9jVW5zYWZlKG4+Pj4wKTt2YXIgcD10aGlzLmhlYWQ7dmFyIGk9MDt3aGlsZShwKXtjb3B5QnVmZmVyKHAuZGF0YSxyZXQsaSk7aSs9cC5kYXRhLmxlbmd0aDtwPXAubmV4dH1yZXR1cm4gcmV0fTtyZXR1cm4gQnVmZmVyTGlzdH0oKTtpZih1dGlsJiZ1dGlsLmluc3BlY3QmJnV0aWwuaW5zcGVjdC5jdXN0b20pe21vZHVsZS5leHBvcnRzLnByb3RvdHlwZVt1dGlsLmluc3BlY3QuY3VzdG9tXT1mdW5jdGlvbigpe3ZhciBvYmo9dXRpbC5pbnNwZWN0KHtsZW5ndGg6dGhpcy5sZW5ndGh9KTtyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKyIgIitvYmp9fX0seyJzYWZlLWJ1ZmZlciI6NzYsdXRpbDoyNn1dLDc0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIHBuYT1yZXF1aXJlKCJwcm9jZXNzLW5leHRpY2stYXJncyIpO2Z1bmN0aW9uIGRlc3Ryb3koZXJyLGNiKXt2YXIgX3RoaXM9dGhpczt2YXIgcmVhZGFibGVEZXN0cm95ZWQ9dGhpcy5fcmVhZGFibGVTdGF0ZSYmdGhpcy5fcmVhZGFibGVTdGF0ZS5kZXN0cm95ZWQ7dmFyIHdyaXRhYmxlRGVzdHJveWVkPXRoaXMuX3dyaXRhYmxlU3RhdGUmJnRoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkO2lmKHJlYWRhYmxlRGVzdHJveWVkfHx3cml0YWJsZURlc3Ryb3llZCl7aWYoY2Ipe2NiKGVycil9ZWxzZSBpZihlcnImJighdGhpcy5fd3JpdGFibGVTdGF0ZXx8IXRoaXMuX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkKSl7cG5hLm5leHRUaWNrKGVtaXRFcnJvck5ULHRoaXMsZXJyKX1yZXR1cm4gdGhpc31pZih0aGlzLl9yZWFkYWJsZVN0YXRlKXt0aGlzLl9yZWFkYWJsZVN0YXRlLmRlc3Ryb3llZD10cnVlfWlmKHRoaXMuX3dyaXRhYmxlU3RhdGUpe3RoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkPXRydWV9dGhpcy5fZGVzdHJveShlcnJ8fG51bGwsZnVuY3Rpb24oZXJyKXtpZighY2ImJmVycil7cG5hLm5leHRUaWNrKGVtaXRFcnJvck5ULF90aGlzLGVycik7aWYoX3RoaXMuX3dyaXRhYmxlU3RhdGUpe190aGlzLl93cml0YWJsZVN0YXRlLmVycm9yRW1pdHRlZD10cnVlfX1lbHNlIGlmKGNiKXtjYihlcnIpfX0pO3JldHVybiB0aGlzfWZ1bmN0aW9uIHVuZGVzdHJveSgpe2lmKHRoaXMuX3JlYWRhYmxlU3RhdGUpe3RoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkPWZhbHNlO3RoaXMuX3JlYWRhYmxlU3RhdGUucmVhZGluZz1mYWxzZTt0aGlzLl9yZWFkYWJsZVN0YXRlLmVuZGVkPWZhbHNlO3RoaXMuX3JlYWRhYmxlU3RhdGUuZW5kRW1pdHRlZD1mYWxzZX1pZih0aGlzLl93cml0YWJsZVN0YXRlKXt0aGlzLl93cml0YWJsZVN0YXRlLmRlc3Ryb3llZD1mYWxzZTt0aGlzLl93cml0YWJsZVN0YXRlLmVuZGVkPWZhbHNlO3RoaXMuX3dyaXRhYmxlU3RhdGUuZW5kaW5nPWZhbHNlO3RoaXMuX3dyaXRhYmxlU3RhdGUuZmluaXNoZWQ9ZmFsc2U7dGhpcy5fd3JpdGFibGVTdGF0ZS5lcnJvckVtaXR0ZWQ9ZmFsc2V9fWZ1bmN0aW9uIGVtaXRFcnJvck5UKHNlbGYsZXJyKXtzZWxmLmVtaXQoImVycm9yIixlcnIpfW1vZHVsZS5leHBvcnRzPXtkZXN0cm95OmRlc3Ryb3ksdW5kZXN0cm95OnVuZGVzdHJveX19LHsicHJvY2Vzcy1uZXh0aWNrLWFyZ3MiOjY1fV0sNzU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXJlcXVpcmUoImV2ZW50cyIpLkV2ZW50RW1pdHRlcn0se2V2ZW50czozM31dLDc2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgYnVmZmVyPXJlcXVpcmUoImJ1ZmZlciIpO3ZhciBCdWZmZXI9YnVmZmVyLkJ1ZmZlcjtmdW5jdGlvbiBjb3B5UHJvcHMoc3JjLGRzdCl7Zm9yKHZhciBrZXkgaW4gc3JjKXtkc3Rba2V5XT1zcmNba2V5XX19aWYoQnVmZmVyLmZyb20mJkJ1ZmZlci5hbGxvYyYmQnVmZmVyLmFsbG9jVW5zYWZlJiZCdWZmZXIuYWxsb2NVbnNhZmVTbG93KXttb2R1bGUuZXhwb3J0cz1idWZmZXJ9ZWxzZXtjb3B5UHJvcHMoYnVmZmVyLGV4cG9ydHMpO2V4cG9ydHMuQnVmZmVyPVNhZmVCdWZmZXJ9ZnVuY3Rpb24gU2FmZUJ1ZmZlcihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe3JldHVybiBCdWZmZXIoYXJnLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX1jb3B5UHJvcHMoQnVmZmVyLFNhZmVCdWZmZXIpO1NhZmVCdWZmZXIuZnJvbT1mdW5jdGlvbihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiBhcmc9PT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXIiKX1yZXR1cm4gQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl9O1NhZmVCdWZmZXIuYWxsb2M9ZnVuY3Rpb24oc2l6ZSxmaWxsLGVuY29kaW5nKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9dmFyIGJ1Zj1CdWZmZXIoc2l6ZSk7aWYoZmlsbCE9PXVuZGVmaW5lZCl7aWYodHlwZW9mIGVuY29kaW5nPT09InN0cmluZyIpe2J1Zi5maWxsKGZpbGwsZW5jb2RpbmcpfWVsc2V7YnVmLmZpbGwoZmlsbCl9fWVsc2V7YnVmLmZpbGwoMCl9cmV0dXJuIGJ1Zn07U2FmZUJ1ZmZlci5hbGxvY1Vuc2FmZT1mdW5jdGlvbihzaXplKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9cmV0dXJuIEJ1ZmZlcihzaXplKX07U2FmZUJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3c9ZnVuY3Rpb24oc2l6ZSl7aWYodHlwZW9mIHNpemUhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQXJndW1lbnQgbXVzdCBiZSBhIG51bWJlciIpfXJldHVybiBidWZmZXIuU2xvd0J1ZmZlcihzaXplKX19LHtidWZmZXI6Mjd9XSw3NzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9cmVxdWlyZSgiLi9yZWFkYWJsZSIpLlBhc3NUaHJvdWdofSx7Ii4vcmVhZGFibGUiOjc4fV0sNzg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2V4cG9ydHM9bW9kdWxlLmV4cG9ydHM9cmVxdWlyZSgiLi9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcyIpO2V4cG9ydHMuU3RyZWFtPWV4cG9ydHM7ZXhwb3J0cy5SZWFkYWJsZT1leHBvcnRzO2V4cG9ydHMuV3JpdGFibGU9cmVxdWlyZSgiLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcyIpO2V4cG9ydHMuRHVwbGV4PXJlcXVpcmUoIi4vbGliL19zdHJlYW1fZHVwbGV4LmpzIik7ZXhwb3J0cy5UcmFuc2Zvcm09cmVxdWlyZSgiLi9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiKTtleHBvcnRzLlBhc3NUaHJvdWdoPXJlcXVpcmUoIi4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMiKX0seyIuL2xpYi9fc3RyZWFtX2R1cGxleC5qcyI6NjgsIi4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMiOjY5LCIuL2xpYi9fc3RyZWFtX3JlYWRhYmxlLmpzIjo3MCwiLi9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiOjcxLCIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzIjo3Mn1dLDc5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1yZXF1aXJlKCIuL3JlYWRhYmxlIikuVHJhbnNmb3JtfSx7Ii4vcmVhZGFibGUiOjc4fV0sODA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXJlcXVpcmUoIi4vbGliL19zdHJlYW1fd3JpdGFibGUuanMiKX0seyIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzIjo3Mn1dLDgxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJidWZmZXIiKS5CdWZmZXI7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIEhhc2hCYXNlPXJlcXVpcmUoImhhc2gtYmFzZSIpO3ZhciBBUlJBWTE2PW5ldyBBcnJheSgxNik7dmFyIHpsPVswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDExLDEyLDEzLDE0LDE1LDcsNCwxMywxLDEwLDYsMTUsMywxMiwwLDksNSwyLDE0LDExLDgsMywxMCwxNCw0LDksMTUsOCwxLDIsNywwLDYsMTMsMTEsNSwxMiwxLDksMTEsMTAsMCw4LDEyLDQsMTMsMyw3LDE1LDE0LDUsNiwyLDQsMCw1LDksNywxMiwyLDEwLDE0LDEsMyw4LDExLDYsMTUsMTNdO3ZhciB6cj1bNSwxNCw3LDAsOSwyLDExLDQsMTMsNiwxNSw4LDEsMTAsMywxMiw2LDExLDMsNywwLDEzLDUsMTAsMTQsMTUsOCwxMiw0LDksMSwyLDE1LDUsMSwzLDcsMTQsNiw5LDExLDgsMTIsMiwxMCwwLDQsMTMsOCw2LDQsMSwzLDExLDE1LDAsNSwxMiwyLDEzLDksNywxMCwxNCwxMiwxNSwxMCw0LDEsNSw4LDcsNiwyLDEzLDE0LDAsMyw5LDExXTt2YXIgc2w9WzExLDE0LDE1LDEyLDUsOCw3LDksMTEsMTMsMTQsMTUsNiw3LDksOCw3LDYsOCwxMywxMSw5LDcsMTUsNywxMiwxNSw5LDExLDcsMTMsMTIsMTEsMTMsNiw3LDE0LDksMTMsMTUsMTQsOCwxMyw2LDUsMTIsNyw1LDExLDEyLDE0LDE1LDE0LDE1LDksOCw5LDE0LDUsNiw4LDYsNSwxMiw5LDE1LDUsMTEsNiw4LDEzLDEyLDUsMTIsMTMsMTQsMTEsOCw1LDZdO3ZhciBzcj1bOCw5LDksMTEsMTMsMTUsMTUsNSw3LDcsOCwxMSwxNCwxNCwxMiw2LDksMTMsMTUsNywxMiw4LDksMTEsNyw3LDEyLDcsNiwxNSwxMywxMSw5LDcsMTUsMTEsOCw2LDYsMTQsMTIsMTMsNSwxNCwxMywxMyw3LDUsMTUsNSw4LDExLDE0LDE0LDYsMTQsNiw5LDEyLDksMTIsNSwxNSw4LDgsNSwxMiw5LDEyLDUsMTQsNiw4LDEzLDYsNSwxNSwxMywxMSwxMV07dmFyIGhsPVswLDE1MTg1MDAyNDksMTg1OTc3NTM5MywyNDAwOTU5NzA4LDI4NDA4NTM4MzhdO3ZhciBocj1bMTM1MjgyOTkyNiwxNTQ4NjAzNjg0LDE4MzYwNzI2OTEsMjA1Mzk5NDIxNywwXTtmdW5jdGlvbiBSSVBFTUQxNjAoKXtIYXNoQmFzZS5jYWxsKHRoaXMsNjQpO3RoaXMuX2E9MTczMjU4NDE5Mzt0aGlzLl9iPTQwMjMyMzM0MTc7dGhpcy5fYz0yNTYyMzgzMTAyO3RoaXMuX2Q9MjcxNzMzODc4O3RoaXMuX2U9MzI4NTM3NzUyMH1pbmhlcml0cyhSSVBFTUQxNjAsSGFzaEJhc2UpO1JJUEVNRDE2MC5wcm90b3R5cGUuX3VwZGF0ZT1mdW5jdGlvbigpe3ZhciB3b3Jkcz1BUlJBWTE2O2Zvcih2YXIgaj0wO2o8MTY7KytqKXdvcmRzW2pdPXRoaXMuX2Jsb2NrLnJlYWRJbnQzMkxFKGoqNCk7dmFyIGFsPXRoaXMuX2F8MDt2YXIgYmw9dGhpcy5fYnwwO3ZhciBjbD10aGlzLl9jfDA7dmFyIGRsPXRoaXMuX2R8MDt2YXIgZWw9dGhpcy5fZXwwO3ZhciBhcj10aGlzLl9hfDA7dmFyIGJyPXRoaXMuX2J8MDt2YXIgY3I9dGhpcy5fY3wwO3ZhciBkcj10aGlzLl9kfDA7dmFyIGVyPXRoaXMuX2V8MDtmb3IodmFyIGk9MDtpPDgwO2krPTEpe3ZhciB0bDt2YXIgdHI7aWYoaTwxNil7dGw9Zm4xKGFsLGJsLGNsLGRsLGVsLHdvcmRzW3psW2ldXSxobFswXSxzbFtpXSk7dHI9Zm41KGFyLGJyLGNyLGRyLGVyLHdvcmRzW3pyW2ldXSxoclswXSxzcltpXSl9ZWxzZSBpZihpPDMyKXt0bD1mbjIoYWwsYmwsY2wsZGwsZWwsd29yZHNbemxbaV1dLGhsWzFdLHNsW2ldKTt0cj1mbjQoYXIsYnIsY3IsZHIsZXIsd29yZHNbenJbaV1dLGhyWzFdLHNyW2ldKX1lbHNlIGlmKGk8NDgpe3RsPWZuMyhhbCxibCxjbCxkbCxlbCx3b3Jkc1t6bFtpXV0saGxbMl0sc2xbaV0pO3RyPWZuMyhhcixicixjcixkcixlcix3b3Jkc1t6cltpXV0saHJbMl0sc3JbaV0pfWVsc2UgaWYoaTw2NCl7dGw9Zm40KGFsLGJsLGNsLGRsLGVsLHdvcmRzW3psW2ldXSxobFszXSxzbFtpXSk7dHI9Zm4yKGFyLGJyLGNyLGRyLGVyLHdvcmRzW3pyW2ldXSxoclszXSxzcltpXSl9ZWxzZXt0bD1mbjUoYWwsYmwsY2wsZGwsZWwsd29yZHNbemxbaV1dLGhsWzRdLHNsW2ldKTt0cj1mbjEoYXIsYnIsY3IsZHIsZXIsd29yZHNbenJbaV1dLGhyWzRdLHNyW2ldKX1hbD1lbDtlbD1kbDtkbD1yb3RsKGNsLDEwKTtjbD1ibDtibD10bDthcj1lcjtlcj1kcjtkcj1yb3RsKGNyLDEwKTtjcj1icjticj10cn12YXIgdD10aGlzLl9iK2NsK2RyfDA7dGhpcy5fYj10aGlzLl9jK2RsK2VyfDA7dGhpcy5fYz10aGlzLl9kK2VsK2FyfDA7dGhpcy5fZD10aGlzLl9lK2FsK2JyfDA7dGhpcy5fZT10aGlzLl9hK2JsK2NyfDA7dGhpcy5fYT10fTtSSVBFTUQxNjAucHJvdG90eXBlLl9kaWdlc3Q9ZnVuY3Rpb24oKXt0aGlzLl9ibG9ja1t0aGlzLl9ibG9ja09mZnNldCsrXT0xMjg7aWYodGhpcy5fYmxvY2tPZmZzZXQ+NTYpe3RoaXMuX2Jsb2NrLmZpbGwoMCx0aGlzLl9ibG9ja09mZnNldCw2NCk7dGhpcy5fdXBkYXRlKCk7dGhpcy5fYmxvY2tPZmZzZXQ9MH10aGlzLl9ibG9jay5maWxsKDAsdGhpcy5fYmxvY2tPZmZzZXQsNTYpO3RoaXMuX2Jsb2NrLndyaXRlVUludDMyTEUodGhpcy5fbGVuZ3RoWzBdLDU2KTt0aGlzLl9ibG9jay53cml0ZVVJbnQzMkxFKHRoaXMuX2xlbmd0aFsxXSw2MCk7dGhpcy5fdXBkYXRlKCk7dmFyIGJ1ZmZlcj1CdWZmZXIuYWxsb2M/QnVmZmVyLmFsbG9jKDIwKTpuZXcgQnVmZmVyKDIwKTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2EsMCk7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9iLDQpO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fYyw4KTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2QsMTIpO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fZSwxNik7cmV0dXJuIGJ1ZmZlcn07ZnVuY3Rpb24gcm90bCh4LG4pe3JldHVybiB4PDxufHg+Pj4zMi1ufWZ1bmN0aW9uIGZuMShhLGIsYyxkLGUsbSxrLHMpe3JldHVybiByb3RsKGErKGJeY15kKSttK2t8MCxzKStlfDB9ZnVuY3Rpb24gZm4yKGEsYixjLGQsZSxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYiZjfH5iJmQpK20ra3wwLHMpK2V8MH1mdW5jdGlvbiBmbjMoYSxiLGMsZCxlLG0sayxzKXtyZXR1cm4gcm90bChhKygoYnx+YyleZCkrbStrfDAscykrZXwwfWZ1bmN0aW9uIGZuNChhLGIsYyxkLGUsbSxrLHMpe3JldHVybiByb3RsKGErKGImZHxjJn5kKSttK2t8MCxzKStlfDB9ZnVuY3Rpb24gZm41KGEsYixjLGQsZSxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYl4oY3x+ZCkpK20ra3wwLHMpK2V8MH1tb2R1bGUuZXhwb3J0cz1SSVBFTUQxNjB9LHtidWZmZXI6MjcsImhhc2gtYmFzZSI6MzQsaW5oZXJpdHM6MzZ9XSw4MjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGJ1ZmZlcj1yZXF1aXJlKCJidWZmZXIiKTt2YXIgQnVmZmVyPWJ1ZmZlci5CdWZmZXI7ZnVuY3Rpb24gY29weVByb3BzKHNyYyxkc3Qpe2Zvcih2YXIga2V5IGluIHNyYyl7ZHN0W2tleV09c3JjW2tleV19fWlmKEJ1ZmZlci5mcm9tJiZCdWZmZXIuYWxsb2MmJkJ1ZmZlci5hbGxvY1Vuc2FmZSYmQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyl7bW9kdWxlLmV4cG9ydHM9YnVmZmVyfWVsc2V7Y29weVByb3BzKGJ1ZmZlcixleHBvcnRzKTtleHBvcnRzLkJ1ZmZlcj1TYWZlQnVmZmVyfWZ1bmN0aW9uIFNhZmVCdWZmZXIoYXJnLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKXtyZXR1cm4gQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl9U2FmZUJ1ZmZlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShCdWZmZXIucHJvdG90eXBlKTtjb3B5UHJvcHMoQnVmZmVyLFNhZmVCdWZmZXIpO1NhZmVCdWZmZXIuZnJvbT1mdW5jdGlvbihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiBhcmc9PT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXIiKX1yZXR1cm4gQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl9O1NhZmVCdWZmZXIuYWxsb2M9ZnVuY3Rpb24oc2l6ZSxmaWxsLGVuY29kaW5nKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9dmFyIGJ1Zj1CdWZmZXIoc2l6ZSk7aWYoZmlsbCE9PXVuZGVmaW5lZCl7aWYodHlwZW9mIGVuY29kaW5nPT09InN0cmluZyIpe2J1Zi5maWxsKGZpbGwsZW5jb2RpbmcpfWVsc2V7YnVmLmZpbGwoZmlsbCl9fWVsc2V7YnVmLmZpbGwoMCl9cmV0dXJuIGJ1Zn07U2FmZUJ1ZmZlci5hbGxvY1Vuc2FmZT1mdW5jdGlvbihzaXplKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9cmV0dXJuIEJ1ZmZlcihzaXplKX07U2FmZUJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3c9ZnVuY3Rpb24oc2l6ZSl7aWYodHlwZW9mIHNpemUhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQXJndW1lbnQgbXVzdCBiZSBhIG51bWJlciIpfXJldHVybiBidWZmZXIuU2xvd0J1ZmZlcihzaXplKX19LHtidWZmZXI6Mjd9XSw4MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHByb2Nlc3MpeyJ1c2Ugc3RyaWN0Ijt2YXIgYnVmZmVyPXJlcXVpcmUoImJ1ZmZlciIpO3ZhciBCdWZmZXI9YnVmZmVyLkJ1ZmZlcjt2YXIgc2FmZXI9e307dmFyIGtleTtmb3Ioa2V5IGluIGJ1ZmZlcil7aWYoIWJ1ZmZlci5oYXNPd25Qcm9wZXJ0eShrZXkpKWNvbnRpbnVlO2lmKGtleT09PSJTbG93QnVmZmVyInx8a2V5PT09IkJ1ZmZlciIpY29udGludWU7c2FmZXJba2V5XT1idWZmZXJba2V5XX12YXIgU2FmZXI9c2FmZXIuQnVmZmVyPXt9O2ZvcihrZXkgaW4gQnVmZmVyKXtpZighQnVmZmVyLmhhc093blByb3BlcnR5KGtleSkpY29udGludWU7aWYoa2V5PT09ImFsbG9jVW5zYWZlInx8a2V5PT09ImFsbG9jVW5zYWZlU2xvdyIpY29udGludWU7U2FmZXJba2V5XT1CdWZmZXJba2V5XX1zYWZlci5CdWZmZXIucHJvdG90eXBlPUJ1ZmZlci5wcm90b3R5cGU7aWYoIVNhZmVyLmZyb218fFNhZmVyLmZyb209PT1VaW50OEFycmF5LmZyb20pe1NhZmVyLmZyb209ZnVuY3Rpb24odmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiB2YWx1ZT09PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgInZhbHVlIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBvZiB0eXBlIG51bWJlci4gUmVjZWl2ZWQgdHlwZSAnK3R5cGVvZiB2YWx1ZSl9aWYodmFsdWUmJnR5cGVvZiB2YWx1ZS5sZW5ndGg9PT0idW5kZWZpbmVkIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgIit0eXBlb2YgdmFsdWUpfXJldHVybiBCdWZmZXIodmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfX1pZighU2FmZXIuYWxsb2Mpe1NhZmVyLmFsbG9jPWZ1bmN0aW9uKHNpemUsZmlsbCxlbmNvZGluZyl7aWYodHlwZW9mIHNpemUhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJzaXplIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLiBSZWNlaXZlZCB0eXBlICcrdHlwZW9mIHNpemUpfWlmKHNpemU8MHx8c2l6ZT49MiooMTw8MzApKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlICInK3NpemUrJyIgaXMgaW52YWxpZCBmb3Igb3B0aW9uICJzaXplIicpfXZhciBidWY9QnVmZmVyKHNpemUpO2lmKCFmaWxsfHxmaWxsLmxlbmd0aD09PTApe2J1Zi5maWxsKDApfWVsc2UgaWYodHlwZW9mIGVuY29kaW5nPT09InN0cmluZyIpe2J1Zi5maWxsKGZpbGwsZW5jb2RpbmcpfWVsc2V7YnVmLmZpbGwoZmlsbCl9cmV0dXJuIGJ1Zn19aWYoIXNhZmVyLmtTdHJpbmdNYXhMZW5ndGgpe3RyeXtzYWZlci5rU3RyaW5nTWF4TGVuZ3RoPXByb2Nlc3MuYmluZGluZygiYnVmZmVyIikua1N0cmluZ01heExlbmd0aH1jYXRjaChlKXt9fWlmKCFzYWZlci5jb25zdGFudHMpe3NhZmVyLmNvbnN0YW50cz17TUFYX0xFTkdUSDpzYWZlci5rTWF4TGVuZ3RofTtpZihzYWZlci5rU3RyaW5nTWF4TGVuZ3RoKXtzYWZlci5jb25zdGFudHMuTUFYX1NUUklOR19MRU5HVEg9c2FmZXIua1N0cmluZ01heExlbmd0aH19bW9kdWxlLmV4cG9ydHM9c2FmZXJ9KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSl9LHtfcHJvY2Vzczo2NixidWZmZXI6Mjd9XSw4NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIHBia2RmMj1yZXF1aXJlKCJwYmtkZjIiKTt2YXIgTUFYX1ZBTFVFPTIxNDc0ODM2NDc7ZnVuY3Rpb24gc2NyeXB0KGtleSxzYWx0LE4scixwLGRrTGVuLHByb2dyZXNzQ2FsbGJhY2spe2lmKE49PT0wfHwoTiZOLTEpIT09MCl0aHJvdyBFcnJvcigiTiBtdXN0IGJlID4gMCBhbmQgYSBwb3dlciBvZiAyIik7aWYoTj5NQVhfVkFMVUUvMTI4L3IpdGhyb3cgRXJyb3IoIlBhcmFtZXRlciBOIGlzIHRvbyBsYXJnZSIpO2lmKHI+TUFYX1ZBTFVFLzEyOC9wKXRocm93IEVycm9yKCJQYXJhbWV0ZXIgciBpcyB0b28gbGFyZ2UiKTt2YXIgWFk9bmV3IEJ1ZmZlcigyNTYqcik7dmFyIFY9bmV3IEJ1ZmZlcigxMjgqcipOKTt2YXIgQjMyPW5ldyBJbnQzMkFycmF5KDE2KTt2YXIgeD1uZXcgSW50MzJBcnJheSgxNik7dmFyIF9YPW5ldyBCdWZmZXIoNjQpO3ZhciBCPXBia2RmMi5wYmtkZjJTeW5jKGtleSxzYWx0LDEscCoxMjgqciwic2hhMjU2Iik7dmFyIHRpY2tDYWxsYmFjaztpZihwcm9ncmVzc0NhbGxiYWNrKXt2YXIgdG90YWxPcHM9cCpOKjI7dmFyIGN1cnJlbnRPcD0wO3RpY2tDYWxsYmFjaz1mdW5jdGlvbigpeysrY3VycmVudE9wO2lmKGN1cnJlbnRPcCUxZTM9PT0wKXtwcm9ncmVzc0NhbGxiYWNrKHtjdXJyZW50OmN1cnJlbnRPcCx0b3RhbDp0b3RhbE9wcyxwZXJjZW50OmN1cnJlbnRPcC90b3RhbE9wcyoxMDB9KX19fWZvcih2YXIgaT0wO2k8cDtpKyspe3NtaXgoQixpKjEyOCpyLHIsTixWLFhZKX1yZXR1cm4gcGJrZGYyLnBia2RmMlN5bmMoa2V5LEIsMSxka0xlbiwic2hhMjU2Iik7ZnVuY3Rpb24gc21peChCLEJpLHIsTixWLFhZKXt2YXIgWGk9MDt2YXIgWWk9MTI4KnI7dmFyIGk7Qi5jb3B5KFhZLFhpLEJpLEJpK1lpKTtmb3IoaT0wO2k8TjtpKyspe1hZLmNvcHkoVixpKllpLFhpLFhpK1lpKTtibG9ja21peF9zYWxzYTgoWFksWGksWWkscik7aWYodGlja0NhbGxiYWNrKXRpY2tDYWxsYmFjaygpfWZvcihpPTA7aTxOO2krKyl7dmFyIG9mZnNldD1YaSsoMipyLTEpKjY0O3ZhciBqPVhZLnJlYWRVSW50MzJMRShvZmZzZXQpJk4tMTtibG9ja3hvcihWLGoqWWksWFksWGksWWkpO2Jsb2NrbWl4X3NhbHNhOChYWSxYaSxZaSxyKTtpZih0aWNrQ2FsbGJhY2spdGlja0NhbGxiYWNrKCl9WFkuY29weShCLEJpLFhpLFhpK1lpKX1mdW5jdGlvbiBibG9ja21peF9zYWxzYTgoQlksQmksWWkscil7dmFyIGk7YXJyYXljb3B5KEJZLEJpKygyKnItMSkqNjQsX1gsMCw2NCk7Zm9yKGk9MDtpPDIqcjtpKyspe2Jsb2NreG9yKEJZLGkqNjQsX1gsMCw2NCk7c2Fsc2EyMF84KF9YKTthcnJheWNvcHkoX1gsMCxCWSxZaStpKjY0LDY0KX1mb3IoaT0wO2k8cjtpKyspe2FycmF5Y29weShCWSxZaStpKjIqNjQsQlksQmkraSo2NCw2NCl9Zm9yKGk9MDtpPHI7aSsrKXthcnJheWNvcHkoQlksWWkrKGkqMisxKSo2NCxCWSxCaSsoaStyKSo2NCw2NCl9fWZ1bmN0aW9uIFIoYSxiKXtyZXR1cm4gYTw8YnxhPj4+MzItYn1mdW5jdGlvbiBzYWxzYTIwXzgoQil7dmFyIGk7Zm9yKGk9MDtpPDE2O2krKyl7QjMyW2ldPShCW2kqNCswXSYyNTUpPDwwO0IzMltpXXw9KEJbaSo0KzFdJjI1NSk8PDg7QjMyW2ldfD0oQltpKjQrMl0mMjU1KTw8MTY7QjMyW2ldfD0oQltpKjQrM10mMjU1KTw8MjR9YXJyYXljb3B5KEIzMiwwLHgsMCwxNik7Zm9yKGk9ODtpPjA7aS09Mil7eFs0XV49Uih4WzBdK3hbMTJdLDcpO3hbOF1ePVIoeFs0XSt4WzBdLDkpO3hbMTJdXj1SKHhbOF0reFs0XSwxMyk7eFswXV49Uih4WzEyXSt4WzhdLDE4KTt4WzldXj1SKHhbNV0reFsxXSw3KTt4WzEzXV49Uih4WzldK3hbNV0sOSk7eFsxXV49Uih4WzEzXSt4WzldLDEzKTt4WzVdXj1SKHhbMV0reFsxM10sMTgpO3hbMTRdXj1SKHhbMTBdK3hbNl0sNyk7eFsyXV49Uih4WzE0XSt4WzEwXSw5KTt4WzZdXj1SKHhbMl0reFsxNF0sMTMpO3hbMTBdXj1SKHhbNl0reFsyXSwxOCk7eFszXV49Uih4WzE1XSt4WzExXSw3KTt4WzddXj1SKHhbM10reFsxNV0sOSk7eFsxMV1ePVIoeFs3XSt4WzNdLDEzKTt4WzE1XV49Uih4WzExXSt4WzddLDE4KTt4WzFdXj1SKHhbMF0reFszXSw3KTt4WzJdXj1SKHhbMV0reFswXSw5KTt4WzNdXj1SKHhbMl0reFsxXSwxMyk7eFswXV49Uih4WzNdK3hbMl0sMTgpO3hbNl1ePVIoeFs1XSt4WzRdLDcpO3hbN11ePVIoeFs2XSt4WzVdLDkpO3hbNF1ePVIoeFs3XSt4WzZdLDEzKTt4WzVdXj1SKHhbNF0reFs3XSwxOCk7eFsxMV1ePVIoeFsxMF0reFs5XSw3KTt4WzhdXj1SKHhbMTFdK3hbMTBdLDkpO3hbOV1ePVIoeFs4XSt4WzExXSwxMyk7eFsxMF1ePVIoeFs5XSt4WzhdLDE4KTt4WzEyXV49Uih4WzE1XSt4WzE0XSw3KTt4WzEzXV49Uih4WzEyXSt4WzE1XSw5KTt4WzE0XV49Uih4WzEzXSt4WzEyXSwxMyk7eFsxNV1ePVIoeFsxNF0reFsxM10sMTgpfWZvcihpPTA7aTwxNjsrK2kpQjMyW2ldPXhbaV0rQjMyW2ldO2ZvcihpPTA7aTwxNjtpKyspe3ZhciBiaT1pKjQ7QltiaSswXT1CMzJbaV0+PjAmMjU1O0JbYmkrMV09QjMyW2ldPj44JjI1NTtCW2JpKzJdPUIzMltpXT4+MTYmMjU1O0JbYmkrM109QjMyW2ldPj4yNCYyNTV9fWZ1bmN0aW9uIGJsb2NreG9yKFMsU2ksRCxEaSxsZW4pe2Zvcih2YXIgaT0wO2k8bGVuO2krKyl7RFtEaStpXV49U1tTaStpXX19fWZ1bmN0aW9uIGFycmF5Y29weShzcmMsc3JjUG9zLGRlc3QsZGVzdFBvcyxsZW5ndGgpe2lmKEJ1ZmZlci5pc0J1ZmZlcihzcmMpJiZCdWZmZXIuaXNCdWZmZXIoZGVzdCkpe3NyYy5jb3B5KGRlc3QsZGVzdFBvcyxzcmNQb3Msc3JjUG9zK2xlbmd0aCl9ZWxzZXt3aGlsZShsZW5ndGgtLSl7ZGVzdFtkZXN0UG9zKytdPXNyY1tzcmNQb3MrK119fX1tb2R1bGUuZXhwb3J0cz1zY3J5cHR9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0se2J1ZmZlcjoyNyxwYmtkZjI6NjB9XSw4NTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGFsZWE9cmVxdWlyZSgiLi9saWIvYWxlYSIpO3ZhciB4b3IxMjg9cmVxdWlyZSgiLi9saWIveG9yMTI4Iik7dmFyIHhvcndvdz1yZXF1aXJlKCIuL2xpYi94b3J3b3ciKTt2YXIgeG9yc2hpZnQ3PXJlcXVpcmUoIi4vbGliL3hvcnNoaWZ0NyIpO3ZhciB4b3I0MDk2PXJlcXVpcmUoIi4vbGliL3hvcjQwOTYiKTt2YXIgdHljaGVpPXJlcXVpcmUoIi4vbGliL3R5Y2hlaSIpO3ZhciBzcj1yZXF1aXJlKCIuL3NlZWRyYW5kb20iKTtzci5hbGVhPWFsZWE7c3IueG9yMTI4PXhvcjEyODtzci54b3J3b3c9eG9yd293O3NyLnhvcnNoaWZ0Nz14b3JzaGlmdDc7c3IueG9yNDA5Nj14b3I0MDk2O3NyLnR5Y2hlaT10eWNoZWk7bW9kdWxlLmV4cG9ydHM9c3J9LHsiLi9saWIvYWxlYSI6ODYsIi4vbGliL3R5Y2hlaSI6ODcsIi4vbGliL3hvcjEyOCI6ODgsIi4vbGliL3hvcjQwOTYiOjg5LCIuL2xpYi94b3JzaGlmdDciOjkwLCIuL2xpYi94b3J3b3ciOjkxLCIuL3NlZWRyYW5kb20iOjkyfV0sODY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwsbW9kdWxlLGRlZmluZSl7ZnVuY3Rpb24gQWxlYShzZWVkKXt2YXIgbWU9dGhpcyxtYXNoPU1hc2goKTttZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIHQ9MjA5MTYzOSptZS5zMCttZS5jKjIuMzI4MzA2NDM2NTM4Njk2M2UtMTA7bWUuczA9bWUuczE7bWUuczE9bWUuczI7cmV0dXJuIG1lLnMyPXQtKG1lLmM9dHwwKX07bWUuYz0xO21lLnMwPW1hc2goIiAiKTttZS5zMT1tYXNoKCIgIik7bWUuczI9bWFzaCgiICIpO21lLnMwLT1tYXNoKHNlZWQpO2lmKG1lLnMwPDApe21lLnMwKz0xfW1lLnMxLT1tYXNoKHNlZWQpO2lmKG1lLnMxPDApe21lLnMxKz0xfW1lLnMyLT1tYXNoKHNlZWQpO2lmKG1lLnMyPDApe21lLnMyKz0xfW1hc2g9bnVsbH1mdW5jdGlvbiBjb3B5KGYsdCl7dC5jPWYuYzt0LnMwPWYuczA7dC5zMT1mLnMxO3QuczI9Zi5zMjtyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7dmFyIHhnPW5ldyBBbGVhKHNlZWQpLHN0YXRlPW9wdHMmJm9wdHMuc3RhdGUscHJuZz14Zy5uZXh0O3BybmcuaW50MzI9ZnVuY3Rpb24oKXtyZXR1cm4geGcubmV4dCgpKjQyOTQ5NjcyOTZ8MH07cHJuZy5kb3VibGU9ZnVuY3Rpb24oKXtyZXR1cm4gcHJuZygpKyhwcm5nKCkqMjA5NzE1MnwwKSoxMTEwMjIzMDI0NjI1MTU2NWUtMzJ9O3BybmcucXVpY2s9cHJuZztpZihzdGF0ZSl7aWYodHlwZW9mIHN0YXRlPT0ib2JqZWN0Iiljb3B5KHN0YXRlLHhnKTtwcm5nLnN0YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIGNvcHkoeGcse30pfX1yZXR1cm4gcHJuZ31mdW5jdGlvbiBNYXNoKCl7dmFyIG49NDAyMjg3MTE5Nzt2YXIgbWFzaD1mdW5jdGlvbihkYXRhKXtkYXRhPVN0cmluZyhkYXRhKTtmb3IodmFyIGk9MDtpPGRhdGEubGVuZ3RoO2krKyl7bis9ZGF0YS5jaGFyQ29kZUF0KGkpO3ZhciBoPS4wMjUxOTYwMzI4MjQxNjkzOCpuO249aD4+PjA7aC09bjtoKj1uO249aD4+PjA7aC09bjtuKz1oKjQyOTQ5NjcyOTZ9cmV0dXJuKG4+Pj4wKSoyLjMyODMwNjQzNjUzODY5NjNlLTEwfTtyZXR1cm4gbWFzaH1pZihtb2R1bGUmJm1vZHVsZS5leHBvcnRzKXttb2R1bGUuZXhwb3J0cz1pbXBsfWVsc2UgaWYoZGVmaW5lJiZkZWZpbmUuYW1kKXtkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gaW1wbH0pfWVsc2V7dGhpcy5hbGVhPWltcGx9fSkodGhpcyx0eXBlb2YgbW9kdWxlPT0ib2JqZWN0IiYmbW9kdWxlLHR5cGVvZiBkZWZpbmU9PSJmdW5jdGlvbiImJmRlZmluZSl9LHt9XSw4NzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKGdsb2JhbCxtb2R1bGUsZGVmaW5lKXtmdW5jdGlvbiBYb3JHZW4oc2VlZCl7dmFyIG1lPXRoaXMsc3Ryc2VlZD0iIjttZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIGI9bWUuYixjPW1lLmMsZD1tZS5kLGE9bWUuYTtiPWI8PDI1XmI+Pj43XmM7Yz1jLWR8MDtkPWQ8PDI0XmQ+Pj44XmE7YT1hLWJ8MDttZS5iPWI9Yjw8MjBeYj4+PjEyXmM7bWUuYz1jPWMtZHwwO21lLmQ9ZDw8MTZeYz4+PjE2XmE7cmV0dXJuIG1lLmE9YS1ifDB9O21lLmE9MDttZS5iPTA7bWUuYz0yNjU0NDM1NzY5fDA7bWUuZD0xMzY3MTMwNTUxO2lmKHNlZWQ9PT1NYXRoLmZsb29yKHNlZWQpKXttZS5hPXNlZWQvNDI5NDk2NzI5NnwwO21lLmI9c2VlZHwwfWVsc2V7c3Ryc2VlZCs9c2VlZH1mb3IodmFyIGs9MDtrPHN0cnNlZWQubGVuZ3RoKzIwO2srKyl7bWUuYl49c3Ryc2VlZC5jaGFyQ29kZUF0KGspfDA7bWUubmV4dCgpfX1mdW5jdGlvbiBjb3B5KGYsdCl7dC5hPWYuYTt0LmI9Zi5iO3QuYz1mLmM7dC5kPWYuZDtyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7dmFyIHhnPW5ldyBYb3JHZW4oc2VlZCksc3RhdGU9b3B0cyYmb3B0cy5zdGF0ZSxwcm5nPWZ1bmN0aW9uKCl7cmV0dXJuKHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTZ9O3BybmcuZG91YmxlPWZ1bmN0aW9uKCl7ZG97dmFyIHRvcD14Zy5uZXh0KCk+Pj4xMSxib3Q9KHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTYscmVzdWx0PSh0b3ArYm90KS8oMTw8MjEpfXdoaWxlKHJlc3VsdD09PTApO3JldHVybiByZXN1bHR9O3BybmcuaW50MzI9eGcubmV4dDtwcm5nLnF1aWNrPXBybmc7aWYoc3RhdGUpe2lmKHR5cGVvZiBzdGF0ZT09Im9iamVjdCIpY29weShzdGF0ZSx4Zyk7cHJuZy5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiBjb3B5KHhnLHt9KX19cmV0dXJuIHBybmd9aWYobW9kdWxlJiZtb2R1bGUuZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9aW1wbH1lbHNlIGlmKGRlZmluZSYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIGltcGx9KX1lbHNle3RoaXMudHljaGVpPWltcGx9fSkodGhpcyx0eXBlb2YgbW9kdWxlPT0ib2JqZWN0IiYmbW9kdWxlLHR5cGVvZiBkZWZpbmU9PSJmdW5jdGlvbiImJmRlZmluZSl9LHt9XSw4ODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKGdsb2JhbCxtb2R1bGUsZGVmaW5lKXtmdW5jdGlvbiBYb3JHZW4oc2VlZCl7dmFyIG1lPXRoaXMsc3Ryc2VlZD0iIjttZS54PTA7bWUueT0wO21lLno9MDttZS53PTA7bWUubmV4dD1mdW5jdGlvbigpe3ZhciB0PW1lLnhebWUueDw8MTE7bWUueD1tZS55O21lLnk9bWUuejttZS56PW1lLnc7cmV0dXJuIG1lLndePW1lLnc+Pj4xOV50XnQ+Pj44fTtpZihzZWVkPT09KHNlZWR8MCkpe21lLng9c2VlZH1lbHNle3N0cnNlZWQrPXNlZWR9Zm9yKHZhciBrPTA7azxzdHJzZWVkLmxlbmd0aCs2NDtrKyspe21lLnhePXN0cnNlZWQuY2hhckNvZGVBdChrKXwwO21lLm5leHQoKX19ZnVuY3Rpb24gY29weShmLHQpe3QueD1mLng7dC55PWYueTt0Lno9Zi56O3Qudz1mLnc7cmV0dXJuIHR9ZnVuY3Rpb24gaW1wbChzZWVkLG9wdHMpe3ZhciB4Zz1uZXcgWG9yR2VuKHNlZWQpLHN0YXRlPW9wdHMmJm9wdHMuc3RhdGUscHJuZz1mdW5jdGlvbigpe3JldHVybih4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2fTtwcm5nLmRvdWJsZT1mdW5jdGlvbigpe2Rve3ZhciB0b3A9eGcubmV4dCgpPj4+MTEsYm90PSh4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2LHJlc3VsdD0odG9wK2JvdCkvKDE8PDIxKX13aGlsZShyZXN1bHQ9PT0wKTtyZXR1cm4gcmVzdWx0fTtwcm5nLmludDMyPXhnLm5leHQ7cHJuZy5xdWljaz1wcm5nO2lmKHN0YXRlKXtpZih0eXBlb2Ygc3RhdGU9PSJvYmplY3QiKWNvcHkoc3RhdGUseGcpO3Bybmcuc3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gY29weSh4Zyx7fSl9fXJldHVybiBwcm5nfWlmKG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMpe21vZHVsZS5leHBvcnRzPWltcGx9ZWxzZSBpZihkZWZpbmUmJmRlZmluZS5hbWQpe2RlZmluZShmdW5jdGlvbigpe3JldHVybiBpbXBsfSl9ZWxzZXt0aGlzLnhvcjEyOD1pbXBsfX0pKHRoaXMsdHlwZW9mIG1vZHVsZT09Im9iamVjdCImJm1vZHVsZSx0eXBlb2YgZGVmaW5lPT0iZnVuY3Rpb24iJiZkZWZpbmUpfSx7fV0sODk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwsbW9kdWxlLGRlZmluZSl7ZnVuY3Rpb24gWG9yR2VuKHNlZWQpe3ZhciBtZT10aGlzO21lLm5leHQ9ZnVuY3Rpb24oKXt2YXIgdz1tZS53LFg9bWUuWCxpPW1lLmksdCx2O21lLnc9dz13KzE2NDA1MzE1Mjd8MDt2PVhbaSszNCYxMjddO3Q9WFtpPWkrMSYxMjddO3ZePXY8PDEzO3RePXQ8PDE3O3ZePXY+Pj4xNTt0Xj10Pj4+MTI7dj1YW2ldPXZedDttZS5pPWk7cmV0dXJuIHYrKHdedz4+PjE2KXwwfTtmdW5jdGlvbiBpbml0KG1lLHNlZWQpe3ZhciB0LHYsaSxqLHcsWD1bXSxsaW1pdD0xMjg7aWYoc2VlZD09PShzZWVkfDApKXt2PXNlZWQ7c2VlZD1udWxsfWVsc2V7c2VlZD1zZWVkKyJcMCI7dj0wO2xpbWl0PU1hdGgubWF4KGxpbWl0LHNlZWQubGVuZ3RoKX1mb3IoaT0wLGo9LTMyO2o8bGltaXQ7KytqKXtpZihzZWVkKXZePXNlZWQuY2hhckNvZGVBdCgoaiszMiklc2VlZC5sZW5ndGgpO2lmKGo9PT0wKXc9djt2Xj12PDwxMDt2Xj12Pj4+MTU7dl49djw8NDt2Xj12Pj4+MTM7aWYoaj49MCl7dz13KzE2NDA1MzE1Mjd8MDt0PVhbaiYxMjddXj12K3c7aT0wPT10P2krMTowfX1pZihpPj0xMjgpe1hbKHNlZWQmJnNlZWQubGVuZ3RofHwwKSYxMjddPS0xfWk9MTI3O2ZvcihqPTQqMTI4O2o+MDstLWope3Y9WFtpKzM0JjEyN107dD1YW2k9aSsxJjEyN107dl49djw8MTM7dF49dDw8MTc7dl49dj4+PjE1O3RePXQ+Pj4xMjtYW2ldPXZedH1tZS53PXc7bWUuWD1YO21lLmk9aX1pbml0KG1lLHNlZWQpfWZ1bmN0aW9uIGNvcHkoZix0KXt0Lmk9Zi5pO3Qudz1mLnc7dC5YPWYuWC5zbGljZSgpO3JldHVybiB0fWZ1bmN0aW9uIGltcGwoc2VlZCxvcHRzKXtpZihzZWVkPT1udWxsKXNlZWQ9K25ldyBEYXRlO3ZhciB4Zz1uZXcgWG9yR2VuKHNlZWQpLHN0YXRlPW9wdHMmJm9wdHMuc3RhdGUscHJuZz1mdW5jdGlvbigpe3JldHVybih4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2fTtwcm5nLmRvdWJsZT1mdW5jdGlvbigpe2Rve3ZhciB0b3A9eGcubmV4dCgpPj4+MTEsYm90PSh4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2LHJlc3VsdD0odG9wK2JvdCkvKDE8PDIxKX13aGlsZShyZXN1bHQ9PT0wKTtyZXR1cm4gcmVzdWx0fTtwcm5nLmludDMyPXhnLm5leHQ7cHJuZy5xdWljaz1wcm5nO2lmKHN0YXRlKXtpZihzdGF0ZS5YKWNvcHkoc3RhdGUseGcpO3Bybmcuc3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gY29weSh4Zyx7fSl9fXJldHVybiBwcm5nfWlmKG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMpe21vZHVsZS5leHBvcnRzPWltcGx9ZWxzZSBpZihkZWZpbmUmJmRlZmluZS5hbWQpe2RlZmluZShmdW5jdGlvbigpe3JldHVybiBpbXBsfSl9ZWxzZXt0aGlzLnhvcjQwOTY9aW1wbH19KSh0aGlzLHR5cGVvZiBtb2R1bGU9PSJvYmplY3QiJiZtb2R1bGUsdHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lKX0se31dLDkwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oZ2xvYmFsLG1vZHVsZSxkZWZpbmUpe2Z1bmN0aW9uIFhvckdlbihzZWVkKXt2YXIgbWU9dGhpczttZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIFg9bWUueCxpPW1lLmksdCx2LHc7dD1YW2ldO3RePXQ+Pj43O3Y9dF50PDwyNDt0PVhbaSsxJjddO3ZePXRedD4+PjEwO3Q9WFtpKzMmN107dl49dF50Pj4+Mzt0PVhbaSs0JjddO3ZePXRedDw8Nzt0PVhbaSs3JjddO3Q9dF50PDwxMzt2Xj10XnQ8PDk7WFtpXT12O21lLmk9aSsxJjc7cmV0dXJuIHZ9O2Z1bmN0aW9uIGluaXQobWUsc2VlZCl7dmFyIGosdyxYPVtdO2lmKHNlZWQ9PT0oc2VlZHwwKSl7dz1YWzBdPXNlZWR9ZWxzZXtzZWVkPSIiK3NlZWQ7Zm9yKGo9MDtqPHNlZWQubGVuZ3RoOysrail7WFtqJjddPVhbaiY3XTw8MTVec2VlZC5jaGFyQ29kZUF0KGopK1hbaisxJjddPDwxM319d2hpbGUoWC5sZW5ndGg8OClYLnB1c2goMCk7Zm9yKGo9MDtqPDgmJlhbal09PT0wOysraik7aWYoaj09OCl3PVhbN109LTE7ZWxzZSB3PVhbal07bWUueD1YO21lLmk9MDtmb3Ioaj0yNTY7aj4wOy0tail7bWUubmV4dCgpfX1pbml0KG1lLHNlZWQpfWZ1bmN0aW9uIGNvcHkoZix0KXt0Lng9Zi54LnNsaWNlKCk7dC5pPWYuaTtyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7aWYoc2VlZD09bnVsbClzZWVkPStuZXcgRGF0ZTt2YXIgeGc9bmV3IFhvckdlbihzZWVkKSxzdGF0ZT1vcHRzJiZvcHRzLnN0YXRlLHBybmc9ZnVuY3Rpb24oKXtyZXR1cm4oeGcubmV4dCgpPj4+MCkvNDI5NDk2NzI5Nn07cHJuZy5kb3VibGU9ZnVuY3Rpb24oKXtkb3t2YXIgdG9wPXhnLm5leHQoKT4+PjExLGJvdD0oeGcubmV4dCgpPj4+MCkvNDI5NDk2NzI5NixyZXN1bHQ9KHRvcCtib3QpLygxPDwyMSl9d2hpbGUocmVzdWx0PT09MCk7cmV0dXJuIHJlc3VsdH07cHJuZy5pbnQzMj14Zy5uZXh0O3BybmcucXVpY2s9cHJuZztpZihzdGF0ZSl7aWYoc3RhdGUueCljb3B5KHN0YXRlLHhnKTtwcm5nLnN0YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIGNvcHkoeGcse30pfX1yZXR1cm4gcHJuZ31pZihtb2R1bGUmJm1vZHVsZS5leHBvcnRzKXttb2R1bGUuZXhwb3J0cz1pbXBsfWVsc2UgaWYoZGVmaW5lJiZkZWZpbmUuYW1kKXtkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gaW1wbH0pfWVsc2V7dGhpcy54b3JzaGlmdDc9aW1wbH19KSh0aGlzLHR5cGVvZiBtb2R1bGU9PSJvYmplY3QiJiZtb2R1bGUsdHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lKX0se31dLDkxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oZ2xvYmFsLG1vZHVsZSxkZWZpbmUpe2Z1bmN0aW9uIFhvckdlbihzZWVkKXt2YXIgbWU9dGhpcyxzdHJzZWVkPSIiO21lLm5leHQ9ZnVuY3Rpb24oKXt2YXIgdD1tZS54Xm1lLng+Pj4yO21lLng9bWUueTttZS55PW1lLno7bWUuej1tZS53O21lLnc9bWUudjtyZXR1cm4obWUuZD1tZS5kKzM2MjQzN3wwKSsobWUudj1tZS52Xm1lLnY8PDReKHRedDw8MSkpfDB9O21lLng9MDttZS55PTA7bWUuej0wO21lLnc9MDttZS52PTA7aWYoc2VlZD09PShzZWVkfDApKXttZS54PXNlZWR9ZWxzZXtzdHJzZWVkKz1zZWVkfWZvcih2YXIgaz0wO2s8c3Ryc2VlZC5sZW5ndGgrNjQ7aysrKXttZS54Xj1zdHJzZWVkLmNoYXJDb2RlQXQoayl8MDtpZihrPT1zdHJzZWVkLmxlbmd0aCl7bWUuZD1tZS54PDwxMF5tZS54Pj4+NH1tZS5uZXh0KCl9fWZ1bmN0aW9uIGNvcHkoZix0KXt0Lng9Zi54O3QueT1mLnk7dC56PWYuejt0Lnc9Zi53O3Qudj1mLnY7dC5kPWYuZDtyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7dmFyIHhnPW5ldyBYb3JHZW4oc2VlZCksc3RhdGU9b3B0cyYmb3B0cy5zdGF0ZSxwcm5nPWZ1bmN0aW9uKCl7cmV0dXJuKHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTZ9O3BybmcuZG91YmxlPWZ1bmN0aW9uKCl7ZG97dmFyIHRvcD14Zy5uZXh0KCk+Pj4xMSxib3Q9KHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTYscmVzdWx0PSh0b3ArYm90KS8oMTw8MjEpfXdoaWxlKHJlc3VsdD09PTApO3JldHVybiByZXN1bHR9O3BybmcuaW50MzI9eGcubmV4dDtwcm5nLnF1aWNrPXBybmc7aWYoc3RhdGUpe2lmKHR5cGVvZiBzdGF0ZT09Im9iamVjdCIpY29weShzdGF0ZSx4Zyk7cHJuZy5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiBjb3B5KHhnLHt9KX19cmV0dXJuIHBybmd9aWYobW9kdWxlJiZtb2R1bGUuZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9aW1wbH1lbHNlIGlmKGRlZmluZSYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIGltcGx9KX1lbHNle3RoaXMueG9yd293PWltcGx9fSkodGhpcyx0eXBlb2YgbW9kdWxlPT0ib2JqZWN0IiYmbW9kdWxlLHR5cGVvZiBkZWZpbmU9PSJmdW5jdGlvbiImJmRlZmluZSl9LHt9XSw5MjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHBvb2wsbWF0aCl7dmFyIGdsb2JhbD0oMCxldmFsKSgidGhpcyIpLHdpZHRoPTI1NixjaHVua3M9NixkaWdpdHM9NTIscm5nbmFtZT0icmFuZG9tIixzdGFydGRlbm9tPW1hdGgucG93KHdpZHRoLGNodW5rcyksc2lnbmlmaWNhbmNlPW1hdGgucG93KDIsZGlnaXRzKSxvdmVyZmxvdz1zaWduaWZpY2FuY2UqMixtYXNrPXdpZHRoLTEsbm9kZWNyeXB0bztmdW5jdGlvbiBzZWVkcmFuZG9tKHNlZWQsb3B0aW9ucyxjYWxsYmFjayl7dmFyIGtleT1bXTtvcHRpb25zPW9wdGlvbnM9PXRydWU/e2VudHJvcHk6dHJ1ZX06b3B0aW9uc3x8e307dmFyIHNob3J0c2VlZD1taXhrZXkoZmxhdHRlbihvcHRpb25zLmVudHJvcHk/W3NlZWQsdG9zdHJpbmcocG9vbCldOnNlZWQ9PW51bGw/YXV0b3NlZWQoKTpzZWVkLDMpLGtleSk7dmFyIGFyYzQ9bmV3IEFSQzQoa2V5KTt2YXIgcHJuZz1mdW5jdGlvbigpe3ZhciBuPWFyYzQuZyhjaHVua3MpLGQ9c3RhcnRkZW5vbSx4PTA7d2hpbGUobjxzaWduaWZpY2FuY2Upe249KG4reCkqd2lkdGg7ZCo9d2lkdGg7eD1hcmM0LmcoMSl9d2hpbGUobj49b3ZlcmZsb3cpe24vPTI7ZC89Mjt4Pj4+PTF9cmV0dXJuKG4reCkvZH07cHJuZy5pbnQzMj1mdW5jdGlvbigpe3JldHVybiBhcmM0LmcoNCl8MH07cHJuZy5xdWljaz1mdW5jdGlvbigpe3JldHVybiBhcmM0LmcoNCkvNDI5NDk2NzI5Nn07cHJuZy5kb3VibGU9cHJuZzttaXhrZXkodG9zdHJpbmcoYXJjNC5TKSxwb29sKTtyZXR1cm4ob3B0aW9ucy5wYXNzfHxjYWxsYmFja3x8ZnVuY3Rpb24ocHJuZyxzZWVkLGlzX21hdGhfY2FsbCxzdGF0ZSl7aWYoc3RhdGUpe2lmKHN0YXRlLlMpe2NvcHkoc3RhdGUsYXJjNCl9cHJuZy5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiBjb3B5KGFyYzQse30pfX1pZihpc19tYXRoX2NhbGwpe21hdGhbcm5nbmFtZV09cHJuZztyZXR1cm4gc2VlZH1lbHNlIHJldHVybiBwcm5nfSkocHJuZyxzaG9ydHNlZWQsImdsb2JhbCJpbiBvcHRpb25zP29wdGlvbnMuZ2xvYmFsOnRoaXM9PW1hdGgsb3B0aW9ucy5zdGF0ZSl9ZnVuY3Rpb24gQVJDNChrZXkpe3ZhciB0LGtleWxlbj1rZXkubGVuZ3RoLG1lPXRoaXMsaT0wLGo9bWUuaT1tZS5qPTAscz1tZS5TPVtdO2lmKCFrZXlsZW4pe2tleT1ba2V5bGVuKytdfXdoaWxlKGk8d2lkdGgpe3NbaV09aSsrfWZvcihpPTA7aTx3aWR0aDtpKyspe3NbaV09c1tqPW1hc2smaitrZXlbaSVrZXlsZW5dKyh0PXNbaV0pXTtzW2pdPXR9KG1lLmc9ZnVuY3Rpb24oY291bnQpe3ZhciB0LHI9MCxpPW1lLmksaj1tZS5qLHM9bWUuUzt3aGlsZShjb3VudC0tKXt0PXNbaT1tYXNrJmkrMV07cj1yKndpZHRoK3NbbWFzayYoc1tpXT1zW2o9bWFzayZqK3RdKSsoc1tqXT10KV19bWUuaT1pO21lLmo9ajtyZXR1cm4gcn0pKHdpZHRoKX1mdW5jdGlvbiBjb3B5KGYsdCl7dC5pPWYuaTt0Lmo9Zi5qO3QuUz1mLlMuc2xpY2UoKTtyZXR1cm4gdH1mdW5jdGlvbiBmbGF0dGVuKG9iaixkZXB0aCl7dmFyIHJlc3VsdD1bXSx0eXA9dHlwZW9mIG9iaixwcm9wO2lmKGRlcHRoJiZ0eXA9PSJvYmplY3QiKXtmb3IocHJvcCBpbiBvYmope3RyeXtyZXN1bHQucHVzaChmbGF0dGVuKG9ialtwcm9wXSxkZXB0aC0xKSl9Y2F0Y2goZSl7fX19cmV0dXJuIHJlc3VsdC5sZW5ndGg/cmVzdWx0OnR5cD09InN0cmluZyI/b2JqOm9iaisiXDAifWZ1bmN0aW9uIG1peGtleShzZWVkLGtleSl7dmFyIHN0cmluZ3NlZWQ9c2VlZCsiIixzbWVhcixqPTA7d2hpbGUoajxzdHJpbmdzZWVkLmxlbmd0aCl7a2V5W21hc2smal09bWFzayYoc21lYXJePWtleVttYXNrJmpdKjE5KStzdHJpbmdzZWVkLmNoYXJDb2RlQXQoaisrKX1yZXR1cm4gdG9zdHJpbmcoa2V5KX1mdW5jdGlvbiBhdXRvc2VlZCgpe3RyeXt2YXIgb3V0O2lmKG5vZGVjcnlwdG8mJihvdXQ9bm9kZWNyeXB0by5yYW5kb21CeXRlcykpe291dD1vdXQod2lkdGgpfWVsc2V7b3V0PW5ldyBVaW50OEFycmF5KHdpZHRoKTsoZ2xvYmFsLmNyeXB0b3x8Z2xvYmFsLm1zQ3J5cHRvKS5nZXRSYW5kb21WYWx1ZXMob3V0KX1yZXR1cm4gdG9zdHJpbmcob3V0KX1jYXRjaChlKXt2YXIgYnJvd3Nlcj1nbG9iYWwubmF2aWdhdG9yLHBsdWdpbnM9YnJvd3NlciYmYnJvd3Nlci5wbHVnaW5zO3JldHVyblsrbmV3IERhdGUsZ2xvYmFsLHBsdWdpbnMsZ2xvYmFsLnNjcmVlbix0b3N0cmluZyhwb29sKV19fWZ1bmN0aW9uIHRvc3RyaW5nKGEpe3JldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KDAsYSl9bWl4a2V5KG1hdGgucmFuZG9tKCkscG9vbCk7aWYodHlwZW9mIG1vZHVsZT09Im9iamVjdCImJm1vZHVsZS5leHBvcnRzKXttb2R1bGUuZXhwb3J0cz1zZWVkcmFuZG9tO3RyeXtub2RlY3J5cHRvPXJlcXVpcmUoImNyeXB0byIpfWNhdGNoKGV4KXt9fWVsc2UgaWYodHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIHNlZWRyYW5kb219KX1lbHNle21hdGhbInNlZWQiK3JuZ25hbWVdPXNlZWRyYW5kb219fSkoW10sTWF0aCl9LHtjcnlwdG86MjZ9XSw5MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjtmdW5jdGlvbiBIYXNoKGJsb2NrU2l6ZSxmaW5hbFNpemUpe3RoaXMuX2Jsb2NrPUJ1ZmZlci5hbGxvYyhibG9ja1NpemUpO3RoaXMuX2ZpbmFsU2l6ZT1maW5hbFNpemU7dGhpcy5fYmxvY2tTaXplPWJsb2NrU2l6ZTt0aGlzLl9sZW49MH1IYXNoLnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24oZGF0YSxlbmMpe2lmKHR5cGVvZiBkYXRhPT09InN0cmluZyIpe2VuYz1lbmN8fCJ1dGY4IjtkYXRhPUJ1ZmZlci5mcm9tKGRhdGEsZW5jKX12YXIgYmxvY2s9dGhpcy5fYmxvY2s7dmFyIGJsb2NrU2l6ZT10aGlzLl9ibG9ja1NpemU7dmFyIGxlbmd0aD1kYXRhLmxlbmd0aDt2YXIgYWNjdW09dGhpcy5fbGVuO2Zvcih2YXIgb2Zmc2V0PTA7b2Zmc2V0PGxlbmd0aDspe3ZhciBhc3NpZ25lZD1hY2N1bSVibG9ja1NpemU7dmFyIHJlbWFpbmRlcj1NYXRoLm1pbihsZW5ndGgtb2Zmc2V0LGJsb2NrU2l6ZS1hc3NpZ25lZCk7Zm9yKHZhciBpPTA7aTxyZW1haW5kZXI7aSsrKXtibG9ja1thc3NpZ25lZCtpXT1kYXRhW29mZnNldCtpXX1hY2N1bSs9cmVtYWluZGVyO29mZnNldCs9cmVtYWluZGVyO2lmKGFjY3VtJWJsb2NrU2l6ZT09PTApe3RoaXMuX3VwZGF0ZShibG9jayl9fXRoaXMuX2xlbis9bGVuZ3RoO3JldHVybiB0aGlzfTtIYXNoLnByb3RvdHlwZS5kaWdlc3Q9ZnVuY3Rpb24oZW5jKXt2YXIgcmVtPXRoaXMuX2xlbiV0aGlzLl9ibG9ja1NpemU7dGhpcy5fYmxvY2tbcmVtXT0xMjg7dGhpcy5fYmxvY2suZmlsbCgwLHJlbSsxKTtpZihyZW0+PXRoaXMuX2ZpbmFsU2l6ZSl7dGhpcy5fdXBkYXRlKHRoaXMuX2Jsb2NrKTt0aGlzLl9ibG9jay5maWxsKDApfXZhciBiaXRzPXRoaXMuX2xlbio4O2lmKGJpdHM8PTQyOTQ5NjcyOTUpe3RoaXMuX2Jsb2NrLndyaXRlVUludDMyQkUoYml0cyx0aGlzLl9ibG9ja1NpemUtNCl9ZWxzZXt2YXIgbG93Qml0cz0oYml0cyY0Mjk0OTY3Mjk1KT4+PjA7dmFyIGhpZ2hCaXRzPShiaXRzLWxvd0JpdHMpLzQyOTQ5NjcyOTY7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJCRShoaWdoQml0cyx0aGlzLl9ibG9ja1NpemUtOCk7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJCRShsb3dCaXRzLHRoaXMuX2Jsb2NrU2l6ZS00KX10aGlzLl91cGRhdGUodGhpcy5fYmxvY2spO3ZhciBoYXNoPXRoaXMuX2hhc2goKTtyZXR1cm4gZW5jP2hhc2gudG9TdHJpbmcoZW5jKTpoYXNofTtIYXNoLnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJfdXBkYXRlIG11c3QgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3MiKX07bW9kdWxlLmV4cG9ydHM9SGFzaH0seyJzYWZlLWJ1ZmZlciI6ODJ9XSw5NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGV4cG9ydHM9bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24gU0hBKGFsZ29yaXRobSl7YWxnb3JpdGhtPWFsZ29yaXRobS50b0xvd2VyQ2FzZSgpO3ZhciBBbGdvcml0aG09ZXhwb3J0c1thbGdvcml0aG1dO2lmKCFBbGdvcml0aG0pdGhyb3cgbmV3IEVycm9yKGFsZ29yaXRobSsiIGlzIG5vdCBzdXBwb3J0ZWQgKHdlIGFjY2VwdCBwdWxsIHJlcXVlc3RzKSIpO3JldHVybiBuZXcgQWxnb3JpdGhtfTtleHBvcnRzLnNoYT1yZXF1aXJlKCIuL3NoYSIpO2V4cG9ydHMuc2hhMT1yZXF1aXJlKCIuL3NoYTEiKTtleHBvcnRzLnNoYTIyND1yZXF1aXJlKCIuL3NoYTIyNCIpO2V4cG9ydHMuc2hhMjU2PXJlcXVpcmUoIi4vc2hhMjU2Iik7ZXhwb3J0cy5zaGEzODQ9cmVxdWlyZSgiLi9zaGEzODQiKTtleHBvcnRzLnNoYTUxMj1yZXF1aXJlKCIuL3NoYTUxMiIpfSx7Ii4vc2hhIjo5NSwiLi9zaGExIjo5NiwiLi9zaGEyMjQiOjk3LCIuL3NoYTI1NiI6OTgsIi4vc2hhMzg0Ijo5OSwiLi9zaGE1MTIiOjEwMH1dLDk1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgSGFzaD1yZXF1aXJlKCIuL2hhc2giKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBLPVsxNTE4NTAwMjQ5LDE4NTk3NzUzOTMsMjQwMDk1OTcwOHwwLDMzOTU0Njk3ODJ8MF07dmFyIFc9bmV3IEFycmF5KDgwKTtmdW5jdGlvbiBTaGEoKXt0aGlzLmluaXQoKTt0aGlzLl93PVc7SGFzaC5jYWxsKHRoaXMsNjQsNTYpfWluaGVyaXRzKFNoYSxIYXNoKTtTaGEucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt0aGlzLl9hPTE3MzI1ODQxOTM7dGhpcy5fYj00MDIzMjMzNDE3O3RoaXMuX2M9MjU2MjM4MzEwMjt0aGlzLl9kPTI3MTczMzg3ODt0aGlzLl9lPTMyODUzNzc1MjA7cmV0dXJuIHRoaXN9O2Z1bmN0aW9uIHJvdGw1KG51bSl7cmV0dXJuIG51bTw8NXxudW0+Pj4yN31mdW5jdGlvbiByb3RsMzAobnVtKXtyZXR1cm4gbnVtPDwzMHxudW0+Pj4yfWZ1bmN0aW9uIGZ0KHMsYixjLGQpe2lmKHM9PT0wKXJldHVybiBiJmN8fmImZDtpZihzPT09MilyZXR1cm4gYiZjfGImZHxjJmQ7cmV0dXJuIGJeY15kfVNoYS5wcm90b3R5cGUuX3VwZGF0ZT1mdW5jdGlvbihNKXt2YXIgVz10aGlzLl93O3ZhciBhPXRoaXMuX2F8MDt2YXIgYj10aGlzLl9ifDA7dmFyIGM9dGhpcy5fY3wwO3ZhciBkPXRoaXMuX2R8MDt2YXIgZT10aGlzLl9lfDA7Zm9yKHZhciBpPTA7aTwxNjsrK2kpV1tpXT1NLnJlYWRJbnQzMkJFKGkqNCk7Zm9yKDtpPDgwOysraSlXW2ldPVdbaS0zXV5XW2ktOF1eV1tpLTE0XV5XW2ktMTZdO2Zvcih2YXIgaj0wO2o8ODA7KytqKXt2YXIgcz1+fihqLzIwKTt2YXIgdD1yb3RsNShhKStmdChzLGIsYyxkKStlK1dbal0rS1tzXXwwO2U9ZDtkPWM7Yz1yb3RsMzAoYik7Yj1hO2E9dH10aGlzLl9hPWErdGhpcy5fYXwwO3RoaXMuX2I9Yit0aGlzLl9ifDA7dGhpcy5fYz1jK3RoaXMuX2N8MDt0aGlzLl9kPWQrdGhpcy5fZHwwO3RoaXMuX2U9ZSt0aGlzLl9lfDB9O1NoYS5wcm90b3R5cGUuX2hhc2g9ZnVuY3Rpb24oKXt2YXIgSD1CdWZmZXIuYWxsb2NVbnNhZmUoMjApO0gud3JpdGVJbnQzMkJFKHRoaXMuX2F8MCwwKTtILndyaXRlSW50MzJCRSh0aGlzLl9ifDAsNCk7SC53cml0ZUludDMyQkUodGhpcy5fY3wwLDgpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2R8MCwxMik7SC53cml0ZUludDMyQkUodGhpcy5fZXwwLDE2KTtyZXR1cm4gSH07bW9kdWxlLmV4cG9ydHM9U2hhfSx7Ii4vaGFzaCI6OTMsaW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4Mn1dLDk2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgSGFzaD1yZXF1aXJlKCIuL2hhc2giKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBLPVsxNTE4NTAwMjQ5LDE4NTk3NzUzOTMsMjQwMDk1OTcwOHwwLDMzOTU0Njk3ODJ8MF07dmFyIFc9bmV3IEFycmF5KDgwKTtmdW5jdGlvbiBTaGExKCl7dGhpcy5pbml0KCk7dGhpcy5fdz1XO0hhc2guY2FsbCh0aGlzLDY0LDU2KX1pbmhlcml0cyhTaGExLEhhc2gpO1NoYTEucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt0aGlzLl9hPTE3MzI1ODQxOTM7dGhpcy5fYj00MDIzMjMzNDE3O3RoaXMuX2M9MjU2MjM4MzEwMjt0aGlzLl9kPTI3MTczMzg3ODt0aGlzLl9lPTMyODUzNzc1MjA7cmV0dXJuIHRoaXN9O2Z1bmN0aW9uIHJvdGwxKG51bSl7cmV0dXJuIG51bTw8MXxudW0+Pj4zMX1mdW5jdGlvbiByb3RsNShudW0pe3JldHVybiBudW08PDV8bnVtPj4+Mjd9ZnVuY3Rpb24gcm90bDMwKG51bSl7cmV0dXJuIG51bTw8MzB8bnVtPj4+Mn1mdW5jdGlvbiBmdChzLGIsYyxkKXtpZihzPT09MClyZXR1cm4gYiZjfH5iJmQ7aWYocz09PTIpcmV0dXJuIGImY3xiJmR8YyZkO3JldHVybiBiXmNeZH1TaGExLnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKE0pe3ZhciBXPXRoaXMuX3c7dmFyIGE9dGhpcy5fYXwwO3ZhciBiPXRoaXMuX2J8MDt2YXIgYz10aGlzLl9jfDA7dmFyIGQ9dGhpcy5fZHwwO3ZhciBlPXRoaXMuX2V8MDtmb3IodmFyIGk9MDtpPDE2OysraSlXW2ldPU0ucmVhZEludDMyQkUoaSo0KTtmb3IoO2k8ODA7KytpKVdbaV09cm90bDEoV1tpLTNdXldbaS04XV5XW2ktMTRdXldbaS0xNl0pO2Zvcih2YXIgaj0wO2o8ODA7KytqKXt2YXIgcz1+fihqLzIwKTt2YXIgdD1yb3RsNShhKStmdChzLGIsYyxkKStlK1dbal0rS1tzXXwwO2U9ZDtkPWM7Yz1yb3RsMzAoYik7Yj1hO2E9dH10aGlzLl9hPWErdGhpcy5fYXwwO3RoaXMuX2I9Yit0aGlzLl9ifDA7dGhpcy5fYz1jK3RoaXMuX2N8MDt0aGlzLl9kPWQrdGhpcy5fZHwwO3RoaXMuX2U9ZSt0aGlzLl9lfDB9O1NoYTEucHJvdG90eXBlLl9oYXNoPWZ1bmN0aW9uKCl7dmFyIEg9QnVmZmVyLmFsbG9jVW5zYWZlKDIwKTtILndyaXRlSW50MzJCRSh0aGlzLl9hfDAsMCk7SC53cml0ZUludDMyQkUodGhpcy5fYnwwLDQpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2N8MCw4KTtILndyaXRlSW50MzJCRSh0aGlzLl9kfDAsMTIpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2V8MCwxNik7cmV0dXJuIEh9O21vZHVsZS5leHBvcnRzPVNoYTF9LHsiLi9oYXNoIjo5Myxpbmhlcml0czozNiwic2FmZS1idWZmZXIiOjgyfV0sOTc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBTaGEyNTY9cmVxdWlyZSgiLi9zaGEyNTYiKTt2YXIgSGFzaD1yZXF1aXJlKCIuL2hhc2giKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBXPW5ldyBBcnJheSg2NCk7ZnVuY3Rpb24gU2hhMjI0KCl7dGhpcy5pbml0KCk7dGhpcy5fdz1XO0hhc2guY2FsbCh0aGlzLDY0LDU2KX1pbmhlcml0cyhTaGEyMjQsU2hhMjU2KTtTaGEyMjQucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt0aGlzLl9hPTMyMzgzNzEwMzI7dGhpcy5fYj05MTQxNTA2NjM7dGhpcy5fYz04MTI3MDI5OTk7dGhpcy5fZD00MTQ0OTEyNjk3O3RoaXMuX2U9NDI5MDc3NTg1Nzt0aGlzLl9mPTE3NTA2MDMwMjU7dGhpcy5fZz0xNjk0MDc2ODM5O3RoaXMuX2g9MzIwNDA3NTQyODtyZXR1cm4gdGhpc307U2hhMjI0LnByb3RvdHlwZS5faGFzaD1mdW5jdGlvbigpe3ZhciBIPUJ1ZmZlci5hbGxvY1Vuc2FmZSgyOCk7SC53cml0ZUludDMyQkUodGhpcy5fYSwwKTtILndyaXRlSW50MzJCRSh0aGlzLl9iLDQpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2MsOCk7SC53cml0ZUludDMyQkUodGhpcy5fZCwxMik7SC53cml0ZUludDMyQkUodGhpcy5fZSwxNik7SC53cml0ZUludDMyQkUodGhpcy5fZiwyMCk7SC53cml0ZUludDMyQkUodGhpcy5fZywyNCk7cmV0dXJuIEh9O21vZHVsZS5leHBvcnRzPVNoYTIyNH0seyIuL2hhc2giOjkzLCIuL3NoYTI1NiI6OTgsaW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4Mn1dLDk4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgSGFzaD1yZXF1aXJlKCIuL2hhc2giKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBLPVsxMTE2MzUyNDA4LDE4OTk0NDc0NDEsMzA0OTMyMzQ3MSwzOTIxMDA5NTczLDk2MTk4NzE2MywxNTA4OTcwOTkzLDI0NTM2MzU3NDgsMjg3MDc2MzIyMSwzNjI0MzgxMDgwLDMxMDU5ODQwMSw2MDcyMjUyNzgsMTQyNjg4MTk4NywxOTI1MDc4Mzg4LDIxNjIwNzgyMDYsMjYxNDg4ODEwMywzMjQ4MjIyNTgwLDM4MzUzOTA0MDEsNDAyMjIyNDc3NCwyNjQzNDcwNzgsNjA0ODA3NjI4LDc3MDI1NTk4MywxMjQ5MTUwMTIyLDE1NTUwODE2OTIsMTk5NjA2NDk4NiwyNTU0MjIwODgyLDI4MjE4MzQzNDksMjk1Mjk5NjgwOCwzMjEwMzEzNjcxLDMzMzY1NzE4OTEsMzU4NDUyODcxMSwxMTM5MjY5OTMsMzM4MjQxODk1LDY2NjMwNzIwNSw3NzM1Mjk5MTIsMTI5NDc1NzM3MiwxMzk2MTgyMjkxLDE2OTUxODM3MDAsMTk4NjY2MTA1MSwyMTc3MDI2MzUwLDI0NTY5NTYwMzcsMjczMDQ4NTkyMSwyODIwMzAyNDExLDMyNTk3MzA4MDAsMzM0NTc2NDc3MSwzNTE2MDY1ODE3LDM2MDAzNTI4MDQsNDA5NDU3MTkwOSwyNzU0MjMzNDQsNDMwMjI3NzM0LDUwNjk0ODYxNiw2NTkwNjA1NTYsODgzOTk3ODc3LDk1ODEzOTU3MSwxMzIyODIyMjE4LDE1MzcwMDIwNjMsMTc0Nzg3Mzc3OSwxOTU1NTYyMjIyLDIwMjQxMDQ4MTUsMjIyNzczMDQ1MiwyMzYxODUyNDI0LDI0Mjg0MzY0NzQsMjc1NjczNDE4NywzMjA0MDMxNDc5LDMzMjkzMjUyOThdO3ZhciBXPW5ldyBBcnJheSg2NCk7ZnVuY3Rpb24gU2hhMjU2KCl7dGhpcy5pbml0KCk7dGhpcy5fdz1XO0hhc2guY2FsbCh0aGlzLDY0LDU2KX1pbmhlcml0cyhTaGEyNTYsSGFzaCk7U2hhMjU2LnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dGhpcy5fYT0xNzc5MDMzNzAzO3RoaXMuX2I9MzE0NDEzNDI3Nzt0aGlzLl9jPTEwMTM5MDQyNDI7dGhpcy5fZD0yNzczNDgwNzYyO3RoaXMuX2U9MTM1OTg5MzExOTt0aGlzLl9mPTI2MDA4MjI5MjQ7dGhpcy5fZz01Mjg3MzQ2MzU7dGhpcy5faD0xNTQxNDU5MjI1O3JldHVybiB0aGlzfTtmdW5jdGlvbiBjaCh4LHkseil7cmV0dXJuIHpeeCYoeV56KX1mdW5jdGlvbiBtYWooeCx5LHope3JldHVybiB4Jnl8eiYoeHx5KX1mdW5jdGlvbiBzaWdtYTAoeCl7cmV0dXJuKHg+Pj4yfHg8PDMwKV4oeD4+PjEzfHg8PDE5KV4oeD4+PjIyfHg8PDEwKX1mdW5jdGlvbiBzaWdtYTEoeCl7cmV0dXJuKHg+Pj42fHg8PDI2KV4oeD4+PjExfHg8PDIxKV4oeD4+PjI1fHg8PDcpfWZ1bmN0aW9uIGdhbW1hMCh4KXtyZXR1cm4oeD4+Pjd8eDw8MjUpXih4Pj4+MTh8eDw8MTQpXng+Pj4zfWZ1bmN0aW9uIGdhbW1hMSh4KXtyZXR1cm4oeD4+PjE3fHg8PDE1KV4oeD4+PjE5fHg8PDEzKV54Pj4+MTB9U2hhMjU2LnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKE0pe3ZhciBXPXRoaXMuX3c7dmFyIGE9dGhpcy5fYXwwO3ZhciBiPXRoaXMuX2J8MDt2YXIgYz10aGlzLl9jfDA7dmFyIGQ9dGhpcy5fZHwwO3ZhciBlPXRoaXMuX2V8MDt2YXIgZj10aGlzLl9mfDA7dmFyIGc9dGhpcy5fZ3wwO3ZhciBoPXRoaXMuX2h8MDtmb3IodmFyIGk9MDtpPDE2OysraSlXW2ldPU0ucmVhZEludDMyQkUoaSo0KTtmb3IoO2k8NjQ7KytpKVdbaV09Z2FtbWExKFdbaS0yXSkrV1tpLTddK2dhbW1hMChXW2ktMTVdKStXW2ktMTZdfDA7Zm9yKHZhciBqPTA7ajw2NDsrK2ope3ZhciBUMT1oK3NpZ21hMShlKStjaChlLGYsZykrS1tqXStXW2pdfDA7dmFyIFQyPXNpZ21hMChhKSttYWooYSxiLGMpfDA7aD1nO2c9ZjtmPWU7ZT1kK1QxfDA7ZD1jO2M9YjtiPWE7YT1UMStUMnwwfXRoaXMuX2E9YSt0aGlzLl9hfDA7dGhpcy5fYj1iK3RoaXMuX2J8MDt0aGlzLl9jPWMrdGhpcy5fY3wwO3RoaXMuX2Q9ZCt0aGlzLl9kfDA7dGhpcy5fZT1lK3RoaXMuX2V8MDt0aGlzLl9mPWYrdGhpcy5fZnwwO3RoaXMuX2c9Zyt0aGlzLl9nfDA7dGhpcy5faD1oK3RoaXMuX2h8MH07U2hhMjU2LnByb3RvdHlwZS5faGFzaD1mdW5jdGlvbigpe3ZhciBIPUJ1ZmZlci5hbGxvY1Vuc2FmZSgzMik7SC53cml0ZUludDMyQkUodGhpcy5fYSwwKTtILndyaXRlSW50MzJCRSh0aGlzLl9iLDQpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2MsOCk7SC53cml0ZUludDMyQkUodGhpcy5fZCwxMik7SC53cml0ZUludDMyQkUodGhpcy5fZSwxNik7SC53cml0ZUludDMyQkUodGhpcy5fZiwyMCk7SC53cml0ZUludDMyQkUodGhpcy5fZywyNCk7SC53cml0ZUludDMyQkUodGhpcy5faCwyOCk7cmV0dXJuIEh9O21vZHVsZS5leHBvcnRzPVNoYTI1Nn0seyIuL2hhc2giOjkzLGluaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODJ9XSw5OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIFNIQTUxMj1yZXF1aXJlKCIuL3NoYTUxMiIpO3ZhciBIYXNoPXJlcXVpcmUoIi4vaGFzaCIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIFc9bmV3IEFycmF5KDE2MCk7ZnVuY3Rpb24gU2hhMzg0KCl7dGhpcy5pbml0KCk7dGhpcy5fdz1XO0hhc2guY2FsbCh0aGlzLDEyOCwxMTIpfWluaGVyaXRzKFNoYTM4NCxTSEE1MTIpO1NoYTM4NC5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3RoaXMuX2FoPTM0MTgwNzAzNjU7dGhpcy5fYmg9MTY1NDI3MDI1MDt0aGlzLl9jaD0yNDM4NTI5MzcwO3RoaXMuX2RoPTM1NTQ2MjM2MDt0aGlzLl9laD0xNzMxNDA1NDE1O3RoaXMuX2ZoPTIzOTQxODAyMzE7dGhpcy5fZ2g9MzY3NTAwODUyNTt0aGlzLl9oaD0xMjAzMDYyODEzO3RoaXMuX2FsPTMyMzgzNzEwMzI7dGhpcy5fYmw9OTE0MTUwNjYzO3RoaXMuX2NsPTgxMjcwMjk5OTt0aGlzLl9kbD00MTQ0OTEyNjk3O3RoaXMuX2VsPTQyOTA3NzU4NTc7dGhpcy5fZmw9MTc1MDYwMzAyNTt0aGlzLl9nbD0xNjk0MDc2ODM5O3RoaXMuX2hsPTMyMDQwNzU0Mjg7cmV0dXJuIHRoaXN9O1NoYTM4NC5wcm90b3R5cGUuX2hhc2g9ZnVuY3Rpb24oKXt2YXIgSD1CdWZmZXIuYWxsb2NVbnNhZmUoNDgpO2Z1bmN0aW9uIHdyaXRlSW50NjRCRShoLGwsb2Zmc2V0KXtILndyaXRlSW50MzJCRShoLG9mZnNldCk7SC53cml0ZUludDMyQkUobCxvZmZzZXQrNCl9d3JpdGVJbnQ2NEJFKHRoaXMuX2FoLHRoaXMuX2FsLDApO3dyaXRlSW50NjRCRSh0aGlzLl9iaCx0aGlzLl9ibCw4KTt3cml0ZUludDY0QkUodGhpcy5fY2gsdGhpcy5fY2wsMTYpO3dyaXRlSW50NjRCRSh0aGlzLl9kaCx0aGlzLl9kbCwyNCk7d3JpdGVJbnQ2NEJFKHRoaXMuX2VoLHRoaXMuX2VsLDMyKTt3cml0ZUludDY0QkUodGhpcy5fZmgsdGhpcy5fZmwsNDApO3JldHVybiBIfTttb2R1bGUuZXhwb3J0cz1TaGEzODR9LHsiLi9oYXNoIjo5MywiLi9zaGE1MTIiOjEwMCxpbmhlcml0czozNiwic2FmZS1idWZmZXIiOjgyfV0sMTAwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgSGFzaD1yZXF1aXJlKCIuL2hhc2giKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBLPVsxMTE2MzUyNDA4LDM2MDk3Njc0NTgsMTg5OTQ0NzQ0MSw2MDI4OTE3MjUsMzA0OTMyMzQ3MSwzOTY0NDg0Mzk5LDM5MjEwMDk1NzMsMjE3MzI5NTU0OCw5NjE5ODcxNjMsNDA4MTYyODQ3MiwxNTA4OTcwOTkzLDMwNTM4MzQyNjUsMjQ1MzYzNTc0OCwyOTM3NjcxNTc5LDI4NzA3NjMyMjEsMzY2NDYwOTU2MCwzNjI0MzgxMDgwLDI3MzQ4ODMzOTQsMzEwNTk4NDAxLDExNjQ5OTY1NDIsNjA3MjI1Mjc4LDEzMjM2MTA3NjQsMTQyNjg4MTk4NywzNTkwMzA0OTk0LDE5MjUwNzgzODgsNDA2ODE4MjM4MywyMTYyMDc4MjA2LDk5MTMzNjExMywyNjE0ODg4MTAzLDYzMzgwMzMxNywzMjQ4MjIyNTgwLDM0Nzk3NzQ4NjgsMzgzNTM5MDQwMSwyNjY2NjEzNDU4LDQwMjIyMjQ3NzQsOTQ0NzExMTM5LDI2NDM0NzA3OCwyMzQxMjYyNzczLDYwNDgwNzYyOCwyMDA3ODAwOTMzLDc3MDI1NTk4MywxNDk1OTkwOTAxLDEyNDkxNTAxMjIsMTg1NjQzMTIzNSwxNTU1MDgxNjkyLDMxNzUyMTgxMzIsMTk5NjA2NDk4NiwyMTk4OTUwODM3LDI1NTQyMjA4ODIsMzk5OTcxOTMzOSwyODIxODM0MzQ5LDc2Njc4NDAxNiwyOTUyOTk2ODA4LDI1NjY1OTQ4NzksMzIxMDMxMzY3MSwzMjAzMzM3OTU2LDMzMzY1NzE4OTEsMTAzNDQ1NzAyNiwzNTg0NTI4NzExLDI0NjY5NDg5MDEsMTEzOTI2OTkzLDM3NTgzMjYzODMsMzM4MjQxODk1LDE2ODcxNzkzNiw2NjYzMDcyMDUsMTE4ODE3OTk2NCw3NzM1Mjk5MTIsMTU0NjA0NTczNCwxMjk0NzU3MzcyLDE1MjI4MDU0ODUsMTM5NjE4MjI5MSwyNjQzODMzODIzLDE2OTUxODM3MDAsMjM0MzUyNzM5MCwxOTg2NjYxMDUxLDEwMTQ0Nzc0ODAsMjE3NzAyNjM1MCwxMjA2NzU5MTQyLDI0NTY5NTYwMzcsMzQ0MDc3NjI3LDI3MzA0ODU5MjEsMTI5MDg2MzQ2MCwyODIwMzAyNDExLDMxNTg0NTQyNzMsMzI1OTczMDgwMCwzNTA1OTUyNjU3LDMzNDU3NjQ3NzEsMTA2MjE3MDA4LDM1MTYwNjU4MTcsMzYwNjAwODM0NCwzNjAwMzUyODA0LDE0MzI3MjU3NzYsNDA5NDU3MTkwOSwxNDY3MDMxNTk0LDI3NTQyMzM0NCw4NTExNjk3MjAsNDMwMjI3NzM0LDMxMDA4MjM3NTIsNTA2OTQ4NjE2LDEzNjMyNTgxOTUsNjU5MDYwNTU2LDM3NTA2ODU1OTMsODgzOTk3ODc3LDM3ODUwNTAyODAsOTU4MTM5NTcxLDMzMTgzMDc0MjcsMTMyMjgyMjIxOCwzODEyNzIzNDAzLDE1MzcwMDIwNjMsMjAwMzAzNDk5NSwxNzQ3ODczNzc5LDM2MDIwMzY4OTksMTk1NTU2MjIyMiwxNTc1OTkwMDEyLDIwMjQxMDQ4MTUsMTEyNTU5MjkyOCwyMjI3NzMwNDUyLDI3MTY5MDQzMDYsMjM2MTg1MjQyNCw0NDI3NzYwNDQsMjQyODQzNjQ3NCw1OTM2OTgzNDQsMjc1NjczNDE4NywzNzMzMTEwMjQ5LDMyMDQwMzE0NzksMjk5OTM1MTU3MywzMzI5MzI1Mjk4LDM4MTU5MjA0MjcsMzM5MTU2OTYxNCwzOTI4MzgzOTAwLDM1MTUyNjcyNzEsNTY2MjgwNzExLDM5NDAxODc2MDYsMzQ1NDA2OTUzNCw0MTE4NjMwMjcxLDQwMDAyMzk5OTIsMTE2NDE4NDc0LDE5MTQxMzg1NTQsMTc0MjkyNDIxLDI3MzEwNTUyNzAsMjg5MzgwMzU2LDMyMDM5OTMwMDYsNDYwMzkzMjY5LDMyMDYyMDMxNSw2ODU0NzE3MzMsNTg3NDk2ODM2LDg1MjE0Mjk3MSwxMDg2NzkyODUxLDEwMTcwMzYyOTgsMzY1NTQzMTAwLDExMjYwMDA1ODAsMjYxODI5NzY3NiwxMjg4MDMzNDcwLDM0MDk4NTUxNTgsMTUwMTUwNTk0OCw0MjM0NTA5ODY2LDE2MDcxNjc5MTUsOTg3MTY3NDY4LDE4MTY0MDIzMTYsMTI0NjE4OTU5MV07dmFyIFc9bmV3IEFycmF5KDE2MCk7ZnVuY3Rpb24gU2hhNTEyKCl7dGhpcy5pbml0KCk7dGhpcy5fdz1XO0hhc2guY2FsbCh0aGlzLDEyOCwxMTIpfWluaGVyaXRzKFNoYTUxMixIYXNoKTtTaGE1MTIucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt0aGlzLl9haD0xNzc5MDMzNzAzO3RoaXMuX2JoPTMxNDQxMzQyNzc7dGhpcy5fY2g9MTAxMzkwNDI0Mjt0aGlzLl9kaD0yNzczNDgwNzYyO3RoaXMuX2VoPTEzNTk4OTMxMTk7dGhpcy5fZmg9MjYwMDgyMjkyNDt0aGlzLl9naD01Mjg3MzQ2MzU7dGhpcy5faGg9MTU0MTQ1OTIyNTt0aGlzLl9hbD00MDg5MjM1NzIwO3RoaXMuX2JsPTIyMjc4NzM1OTU7dGhpcy5fY2w9NDI3MTE3NTcyMzt0aGlzLl9kbD0xNTk1NzUwMTI5O3RoaXMuX2VsPTI5MTc1NjUxMzc7dGhpcy5fZmw9NzI1NTExMTk5O3RoaXMuX2dsPTQyMTUzODk1NDc7dGhpcy5faGw9MzI3MDMzMjA5O3JldHVybiB0aGlzfTtmdW5jdGlvbiBDaCh4LHkseil7cmV0dXJuIHpeeCYoeV56KX1mdW5jdGlvbiBtYWooeCx5LHope3JldHVybiB4Jnl8eiYoeHx5KX1mdW5jdGlvbiBzaWdtYTAoeCx4bCl7cmV0dXJuKHg+Pj4yOHx4bDw8NCleKHhsPj4+Mnx4PDwzMCleKHhsPj4+N3x4PDwyNSl9ZnVuY3Rpb24gc2lnbWExKHgseGwpe3JldHVybih4Pj4+MTR8eGw8PDE4KV4oeD4+PjE4fHhsPDwxNCleKHhsPj4+OXx4PDwyMyl9ZnVuY3Rpb24gR2FtbWEwKHgseGwpe3JldHVybih4Pj4+MXx4bDw8MzEpXih4Pj4+OHx4bDw8MjQpXng+Pj43fWZ1bmN0aW9uIEdhbW1hMGwoeCx4bCl7cmV0dXJuKHg+Pj4xfHhsPDwzMSleKHg+Pj44fHhsPDwyNCleKHg+Pj43fHhsPDwyNSl9ZnVuY3Rpb24gR2FtbWExKHgseGwpe3JldHVybih4Pj4+MTl8eGw8PDEzKV4oeGw+Pj4yOXx4PDwzKV54Pj4+Nn1mdW5jdGlvbiBHYW1tYTFsKHgseGwpe3JldHVybih4Pj4+MTl8eGw8PDEzKV4oeGw+Pj4yOXx4PDwzKV4oeD4+PjZ8eGw8PDI2KX1mdW5jdGlvbiBnZXRDYXJyeShhLGIpe3JldHVybiBhPj4+MDxiPj4+MD8xOjB9U2hhNTEyLnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKE0pe3ZhciBXPXRoaXMuX3c7dmFyIGFoPXRoaXMuX2FofDA7dmFyIGJoPXRoaXMuX2JofDA7dmFyIGNoPXRoaXMuX2NofDA7dmFyIGRoPXRoaXMuX2RofDA7dmFyIGVoPXRoaXMuX2VofDA7dmFyIGZoPXRoaXMuX2ZofDA7dmFyIGdoPXRoaXMuX2dofDA7dmFyIGhoPXRoaXMuX2hofDA7dmFyIGFsPXRoaXMuX2FsfDA7dmFyIGJsPXRoaXMuX2JsfDA7dmFyIGNsPXRoaXMuX2NsfDA7dmFyIGRsPXRoaXMuX2RsfDA7dmFyIGVsPXRoaXMuX2VsfDA7dmFyIGZsPXRoaXMuX2ZsfDA7dmFyIGdsPXRoaXMuX2dsfDA7dmFyIGhsPXRoaXMuX2hsfDA7Zm9yKHZhciBpPTA7aTwzMjtpKz0yKXtXW2ldPU0ucmVhZEludDMyQkUoaSo0KTtXW2krMV09TS5yZWFkSW50MzJCRShpKjQrNCl9Zm9yKDtpPDE2MDtpKz0yKXt2YXIgeGg9V1tpLTE1KjJdO3ZhciB4bD1XW2ktMTUqMisxXTt2YXIgZ2FtbWEwPUdhbW1hMCh4aCx4bCk7dmFyIGdhbW1hMGw9R2FtbWEwbCh4bCx4aCk7eGg9V1tpLTIqMl07eGw9V1tpLTIqMisxXTt2YXIgZ2FtbWExPUdhbW1hMSh4aCx4bCk7dmFyIGdhbW1hMWw9R2FtbWExbCh4bCx4aCk7dmFyIFdpN2g9V1tpLTcqMl07dmFyIFdpN2w9V1tpLTcqMisxXTt2YXIgV2kxNmg9V1tpLTE2KjJdO3ZhciBXaTE2bD1XW2ktMTYqMisxXTt2YXIgV2lsPWdhbW1hMGwrV2k3bHwwO3ZhciBXaWg9Z2FtbWEwK1dpN2grZ2V0Q2FycnkoV2lsLGdhbW1hMGwpfDA7V2lsPVdpbCtnYW1tYTFsfDA7V2loPVdpaCtnYW1tYTErZ2V0Q2FycnkoV2lsLGdhbW1hMWwpfDA7V2lsPVdpbCtXaTE2bHwwO1dpaD1XaWgrV2kxNmgrZ2V0Q2FycnkoV2lsLFdpMTZsKXwwO1dbaV09V2loO1dbaSsxXT1XaWx9Zm9yKHZhciBqPTA7ajwxNjA7ais9Mil7V2loPVdbal07V2lsPVdbaisxXTt2YXIgbWFqaD1tYWooYWgsYmgsY2gpO3ZhciBtYWpsPW1haihhbCxibCxjbCk7dmFyIHNpZ21hMGg9c2lnbWEwKGFoLGFsKTt2YXIgc2lnbWEwbD1zaWdtYTAoYWwsYWgpO3ZhciBzaWdtYTFoPXNpZ21hMShlaCxlbCk7dmFyIHNpZ21hMWw9c2lnbWExKGVsLGVoKTt2YXIgS2loPUtbal07dmFyIEtpbD1LW2orMV07dmFyIGNoaD1DaChlaCxmaCxnaCk7dmFyIGNobD1DaChlbCxmbCxnbCk7dmFyIHQxbD1obCtzaWdtYTFsfDA7dmFyIHQxaD1oaCtzaWdtYTFoK2dldENhcnJ5KHQxbCxobCl8MDt0MWw9dDFsK2NobHwwO3QxaD10MWgrY2hoK2dldENhcnJ5KHQxbCxjaGwpfDA7dDFsPXQxbCtLaWx8MDt0MWg9dDFoK0tpaCtnZXRDYXJyeSh0MWwsS2lsKXwwO3QxbD10MWwrV2lsfDA7dDFoPXQxaCtXaWgrZ2V0Q2FycnkodDFsLFdpbCl8MDt2YXIgdDJsPXNpZ21hMGwrbWFqbHwwO3ZhciB0Mmg9c2lnbWEwaCttYWpoK2dldENhcnJ5KHQybCxzaWdtYTBsKXwwO2hoPWdoO2hsPWdsO2doPWZoO2dsPWZsO2ZoPWVoO2ZsPWVsO2VsPWRsK3QxbHwwO2VoPWRoK3QxaCtnZXRDYXJyeShlbCxkbCl8MDtkaD1jaDtkbD1jbDtjaD1iaDtjbD1ibDtiaD1haDtibD1hbDthbD10MWwrdDJsfDA7YWg9dDFoK3QyaCtnZXRDYXJyeShhbCx0MWwpfDB9dGhpcy5fYWw9dGhpcy5fYWwrYWx8MDt0aGlzLl9ibD10aGlzLl9ibCtibHwwO3RoaXMuX2NsPXRoaXMuX2NsK2NsfDA7dGhpcy5fZGw9dGhpcy5fZGwrZGx8MDt0aGlzLl9lbD10aGlzLl9lbCtlbHwwO3RoaXMuX2ZsPXRoaXMuX2ZsK2ZsfDA7dGhpcy5fZ2w9dGhpcy5fZ2wrZ2x8MDt0aGlzLl9obD10aGlzLl9obCtobHwwO3RoaXMuX2FoPXRoaXMuX2FoK2FoK2dldENhcnJ5KHRoaXMuX2FsLGFsKXwwO3RoaXMuX2JoPXRoaXMuX2JoK2JoK2dldENhcnJ5KHRoaXMuX2JsLGJsKXwwO3RoaXMuX2NoPXRoaXMuX2NoK2NoK2dldENhcnJ5KHRoaXMuX2NsLGNsKXwwO3RoaXMuX2RoPXRoaXMuX2RoK2RoK2dldENhcnJ5KHRoaXMuX2RsLGRsKXwwO3RoaXMuX2VoPXRoaXMuX2VoK2VoK2dldENhcnJ5KHRoaXMuX2VsLGVsKXwwO3RoaXMuX2ZoPXRoaXMuX2ZoK2ZoK2dldENhcnJ5KHRoaXMuX2ZsLGZsKXwwO3RoaXMuX2doPXRoaXMuX2doK2doK2dldENhcnJ5KHRoaXMuX2dsLGdsKXwwO3RoaXMuX2hoPXRoaXMuX2hoK2hoK2dldENhcnJ5KHRoaXMuX2hsLGhsKXwwfTtTaGE1MTIucHJvdG90eXBlLl9oYXNoPWZ1bmN0aW9uKCl7dmFyIEg9QnVmZmVyLmFsbG9jVW5zYWZlKDY0KTtmdW5jdGlvbiB3cml0ZUludDY0QkUoaCxsLG9mZnNldCl7SC53cml0ZUludDMyQkUoaCxvZmZzZXQpO0gud3JpdGVJbnQzMkJFKGwsb2Zmc2V0KzQpfXdyaXRlSW50NjRCRSh0aGlzLl9haCx0aGlzLl9hbCwwKTt3cml0ZUludDY0QkUodGhpcy5fYmgsdGhpcy5fYmwsOCk7d3JpdGVJbnQ2NEJFKHRoaXMuX2NoLHRoaXMuX2NsLDE2KTt3cml0ZUludDY0QkUodGhpcy5fZGgsdGhpcy5fZGwsMjQpO3dyaXRlSW50NjRCRSh0aGlzLl9laCx0aGlzLl9lbCwzMik7d3JpdGVJbnQ2NEJFKHRoaXMuX2ZoLHRoaXMuX2ZsLDQwKTt3cml0ZUludDY0QkUodGhpcy5fZ2gsdGhpcy5fZ2wsNDgpO3dyaXRlSW50NjRCRSh0aGlzLl9oaCx0aGlzLl9obCw1Nik7cmV0dXJuIEh9O21vZHVsZS5leHBvcnRzPVNoYTUxMn0seyIuL2hhc2giOjkzLGluaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODJ9XSwxMDE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPVN0cmVhbTt2YXIgRUU9cmVxdWlyZSgiZXZlbnRzIikuRXZlbnRFbWl0dGVyO3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO2luaGVyaXRzKFN0cmVhbSxFRSk7U3RyZWFtLlJlYWRhYmxlPXJlcXVpcmUoInJlYWRhYmxlLXN0cmVhbS9yZWFkYWJsZS5qcyIpO1N0cmVhbS5Xcml0YWJsZT1yZXF1aXJlKCJyZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUuanMiKTtTdHJlYW0uRHVwbGV4PXJlcXVpcmUoInJlYWRhYmxlLXN0cmVhbS9kdXBsZXguanMiKTtTdHJlYW0uVHJhbnNmb3JtPXJlcXVpcmUoInJlYWRhYmxlLXN0cmVhbS90cmFuc2Zvcm0uanMiKTtTdHJlYW0uUGFzc1Rocm91Z2g9cmVxdWlyZSgicmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoLmpzIik7U3RyZWFtLlN0cmVhbT1TdHJlYW07ZnVuY3Rpb24gU3RyZWFtKCl7RUUuY2FsbCh0aGlzKX1TdHJlYW0ucHJvdG90eXBlLnBpcGU9ZnVuY3Rpb24oZGVzdCxvcHRpb25zKXt2YXIgc291cmNlPXRoaXM7ZnVuY3Rpb24gb25kYXRhKGNodW5rKXtpZihkZXN0LndyaXRhYmxlKXtpZihmYWxzZT09PWRlc3Qud3JpdGUoY2h1bmspJiZzb3VyY2UucGF1c2Upe3NvdXJjZS5wYXVzZSgpfX19c291cmNlLm9uKCJkYXRhIixvbmRhdGEpO2Z1bmN0aW9uIG9uZHJhaW4oKXtpZihzb3VyY2UucmVhZGFibGUmJnNvdXJjZS5yZXN1bWUpe3NvdXJjZS5yZXN1bWUoKX19ZGVzdC5vbigiZHJhaW4iLG9uZHJhaW4pO2lmKCFkZXN0Ll9pc1N0ZGlvJiYoIW9wdGlvbnN8fG9wdGlvbnMuZW5kIT09ZmFsc2UpKXtzb3VyY2Uub24oImVuZCIsb25lbmQpO3NvdXJjZS5vbigiY2xvc2UiLG9uY2xvc2UpfXZhciBkaWRPbkVuZD1mYWxzZTtmdW5jdGlvbiBvbmVuZCgpe2lmKGRpZE9uRW5kKXJldHVybjtkaWRPbkVuZD10cnVlO2Rlc3QuZW5kKCl9ZnVuY3Rpb24gb25jbG9zZSgpe2lmKGRpZE9uRW5kKXJldHVybjtkaWRPbkVuZD10cnVlO2lmKHR5cGVvZiBkZXN0LmRlc3Ryb3k9PT0iZnVuY3Rpb24iKWRlc3QuZGVzdHJveSgpfWZ1bmN0aW9uIG9uZXJyb3IoZXIpe2NsZWFudXAoKTtpZihFRS5saXN0ZW5lckNvdW50KHRoaXMsImVycm9yIik9PT0wKXt0aHJvdyBlcn19c291cmNlLm9uKCJlcnJvciIsb25lcnJvcik7ZGVzdC5vbigiZXJyb3IiLG9uZXJyb3IpO2Z1bmN0aW9uIGNsZWFudXAoKXtzb3VyY2UucmVtb3ZlTGlzdGVuZXIoImRhdGEiLG9uZGF0YSk7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiZHJhaW4iLG9uZHJhaW4pO3NvdXJjZS5yZW1vdmVMaXN0ZW5lcigiZW5kIixvbmVuZCk7c291cmNlLnJlbW92ZUxpc3RlbmVyKCJjbG9zZSIsb25jbG9zZSk7c291cmNlLnJlbW92ZUxpc3RlbmVyKCJlcnJvciIsb25lcnJvcik7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiZXJyb3IiLG9uZXJyb3IpO3NvdXJjZS5yZW1vdmVMaXN0ZW5lcigiZW5kIixjbGVhbnVwKTtzb3VyY2UucmVtb3ZlTGlzdGVuZXIoImNsb3NlIixjbGVhbnVwKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJjbG9zZSIsY2xlYW51cCl9c291cmNlLm9uKCJlbmQiLGNsZWFudXApO3NvdXJjZS5vbigiY2xvc2UiLGNsZWFudXApO2Rlc3Qub24oImNsb3NlIixjbGVhbnVwKTtkZXN0LmVtaXQoInBpcGUiLHNvdXJjZSk7cmV0dXJuIGRlc3R9fSx7ZXZlbnRzOjMzLGluaGVyaXRzOjM2LCJyZWFkYWJsZS1zdHJlYW0vZHVwbGV4LmpzIjo2NywicmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoLmpzIjo3NywicmVhZGFibGUtc3RyZWFtL3JlYWRhYmxlLmpzIjo3OCwicmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcyI6NzksInJlYWRhYmxlLXN0cmVhbS93cml0YWJsZS5qcyI6ODB9XSwxMDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBpc0VuY29kaW5nPUJ1ZmZlci5pc0VuY29kaW5nfHxmdW5jdGlvbihlbmNvZGluZyl7ZW5jb2Rpbmc9IiIrZW5jb2Rpbmc7c3dpdGNoKGVuY29kaW5nJiZlbmNvZGluZy50b0xvd2VyQ2FzZSgpKXtjYXNlImhleCI6Y2FzZSJ1dGY4IjpjYXNlInV0Zi04IjpjYXNlImFzY2lpIjpjYXNlImJpbmFyeSI6Y2FzZSJiYXNlNjQiOmNhc2UidWNzMiI6Y2FzZSJ1Y3MtMiI6Y2FzZSJ1dGYxNmxlIjpjYXNlInV0Zi0xNmxlIjpjYXNlInJhdyI6cmV0dXJuIHRydWU7ZGVmYXVsdDpyZXR1cm4gZmFsc2V9fTtmdW5jdGlvbiBfbm9ybWFsaXplRW5jb2RpbmcoZW5jKXtpZighZW5jKXJldHVybiJ1dGY4Ijt2YXIgcmV0cmllZDt3aGlsZSh0cnVlKXtzd2l0Y2goZW5jKXtjYXNlInV0ZjgiOmNhc2UidXRmLTgiOnJldHVybiJ1dGY4IjtjYXNlInVjczIiOmNhc2UidWNzLTIiOmNhc2UidXRmMTZsZSI6Y2FzZSJ1dGYtMTZsZSI6cmV0dXJuInV0ZjE2bGUiO2Nhc2UibGF0aW4xIjpjYXNlImJpbmFyeSI6cmV0dXJuImxhdGluMSI7Y2FzZSJiYXNlNjQiOmNhc2UiYXNjaWkiOmNhc2UiaGV4IjpyZXR1cm4gZW5jO2RlZmF1bHQ6aWYocmV0cmllZClyZXR1cm47ZW5jPSgiIitlbmMpLnRvTG93ZXJDYXNlKCk7cmV0cmllZD10cnVlfX19ZnVuY3Rpb24gbm9ybWFsaXplRW5jb2RpbmcoZW5jKXt2YXIgbmVuYz1fbm9ybWFsaXplRW5jb2RpbmcoZW5jKTtpZih0eXBlb2YgbmVuYyE9PSJzdHJpbmciJiYoQnVmZmVyLmlzRW5jb2Rpbmc9PT1pc0VuY29kaW5nfHwhaXNFbmNvZGluZyhlbmMpKSl0aHJvdyBuZXcgRXJyb3IoIlVua25vd24gZW5jb2Rpbmc6ICIrZW5jKTtyZXR1cm4gbmVuY3x8ZW5jfWV4cG9ydHMuU3RyaW5nRGVjb2Rlcj1TdHJpbmdEZWNvZGVyO2Z1bmN0aW9uIFN0cmluZ0RlY29kZXIoZW5jb2Rpbmcpe3RoaXMuZW5jb2Rpbmc9bm9ybWFsaXplRW5jb2RpbmcoZW5jb2RpbmcpO3ZhciBuYjtzd2l0Y2godGhpcy5lbmNvZGluZyl7Y2FzZSJ1dGYxNmxlIjp0aGlzLnRleHQ9dXRmMTZUZXh0O3RoaXMuZW5kPXV0ZjE2RW5kO25iPTQ7YnJlYWs7Y2FzZSJ1dGY4Ijp0aGlzLmZpbGxMYXN0PXV0ZjhGaWxsTGFzdDtuYj00O2JyZWFrO2Nhc2UiYmFzZTY0Ijp0aGlzLnRleHQ9YmFzZTY0VGV4dDt0aGlzLmVuZD1iYXNlNjRFbmQ7bmI9MzticmVhaztkZWZhdWx0OnRoaXMud3JpdGU9c2ltcGxlV3JpdGU7dGhpcy5lbmQ9c2ltcGxlRW5kO3JldHVybn10aGlzLmxhc3ROZWVkPTA7dGhpcy5sYXN0VG90YWw9MDt0aGlzLmxhc3RDaGFyPUJ1ZmZlci5hbGxvY1Vuc2FmZShuYil9U3RyaW5nRGVjb2Rlci5wcm90b3R5cGUud3JpdGU9ZnVuY3Rpb24oYnVmKXtpZihidWYubGVuZ3RoPT09MClyZXR1cm4iIjt2YXIgcjt2YXIgaTtpZih0aGlzLmxhc3ROZWVkKXtyPXRoaXMuZmlsbExhc3QoYnVmKTtpZihyPT09dW5kZWZpbmVkKXJldHVybiIiO2k9dGhpcy5sYXN0TmVlZDt0aGlzLmxhc3ROZWVkPTB9ZWxzZXtpPTB9aWYoaTxidWYubGVuZ3RoKXJldHVybiByP3IrdGhpcy50ZXh0KGJ1ZixpKTp0aGlzLnRleHQoYnVmLGkpO3JldHVybiByfHwiIn07U3RyaW5nRGVjb2Rlci5wcm90b3R5cGUuZW5kPXV0ZjhFbmQ7U3RyaW5nRGVjb2Rlci5wcm90b3R5cGUudGV4dD11dGY4VGV4dDtTdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5maWxsTGFzdD1mdW5jdGlvbihidWYpe2lmKHRoaXMubGFzdE5lZWQ8PWJ1Zi5sZW5ndGgpe2J1Zi5jb3B5KHRoaXMubGFzdENoYXIsdGhpcy5sYXN0VG90YWwtdGhpcy5sYXN0TmVlZCwwLHRoaXMubGFzdE5lZWQpO3JldHVybiB0aGlzLmxhc3RDaGFyLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcsMCx0aGlzLmxhc3RUb3RhbCl9YnVmLmNvcHkodGhpcy5sYXN0Q2hhcix0aGlzLmxhc3RUb3RhbC10aGlzLmxhc3ROZWVkLDAsYnVmLmxlbmd0aCk7dGhpcy5sYXN0TmVlZC09YnVmLmxlbmd0aH07ZnVuY3Rpb24gdXRmOENoZWNrQnl0ZShieXRlKXtpZihieXRlPD0xMjcpcmV0dXJuIDA7ZWxzZSBpZihieXRlPj41PT09NilyZXR1cm4gMjtlbHNlIGlmKGJ5dGU+PjQ9PT0xNClyZXR1cm4gMztlbHNlIGlmKGJ5dGU+PjM9PT0zMClyZXR1cm4gNDtyZXR1cm4gYnl0ZT4+Nj09PTI/LTE6LTJ9ZnVuY3Rpb24gdXRmOENoZWNrSW5jb21wbGV0ZShzZWxmLGJ1ZixpKXt2YXIgaj1idWYubGVuZ3RoLTE7aWYoajxpKXJldHVybiAwO3ZhciBuYj11dGY4Q2hlY2tCeXRlKGJ1ZltqXSk7aWYobmI+PTApe2lmKG5iPjApc2VsZi5sYXN0TmVlZD1uYi0xO3JldHVybiBuYn1pZigtLWo8aXx8bmI9PT0tMilyZXR1cm4gMDtuYj11dGY4Q2hlY2tCeXRlKGJ1ZltqXSk7aWYobmI+PTApe2lmKG5iPjApc2VsZi5sYXN0TmVlZD1uYi0yO3JldHVybiBuYn1pZigtLWo8aXx8bmI9PT0tMilyZXR1cm4gMDtuYj11dGY4Q2hlY2tCeXRlKGJ1ZltqXSk7aWYobmI+PTApe2lmKG5iPjApe2lmKG5iPT09MiluYj0wO2Vsc2Ugc2VsZi5sYXN0TmVlZD1uYi0zfXJldHVybiBuYn1yZXR1cm4gMH1mdW5jdGlvbiB1dGY4Q2hlY2tFeHRyYUJ5dGVzKHNlbGYsYnVmLHApe2lmKChidWZbMF0mMTkyKSE9PTEyOCl7c2VsZi5sYXN0TmVlZD0wO3JldHVybiLvv70ifWlmKHNlbGYubGFzdE5lZWQ+MSYmYnVmLmxlbmd0aD4xKXtpZigoYnVmWzFdJjE5MikhPT0xMjgpe3NlbGYubGFzdE5lZWQ9MTtyZXR1cm4i77+9In1pZihzZWxmLmxhc3ROZWVkPjImJmJ1Zi5sZW5ndGg+Mil7aWYoKGJ1ZlsyXSYxOTIpIT09MTI4KXtzZWxmLmxhc3ROZWVkPTI7cmV0dXJuIu+/vSJ9fX19ZnVuY3Rpb24gdXRmOEZpbGxMYXN0KGJ1Zil7dmFyIHA9dGhpcy5sYXN0VG90YWwtdGhpcy5sYXN0TmVlZDt2YXIgcj11dGY4Q2hlY2tFeHRyYUJ5dGVzKHRoaXMsYnVmLHApO2lmKHIhPT11bmRlZmluZWQpcmV0dXJuIHI7aWYodGhpcy5sYXN0TmVlZDw9YnVmLmxlbmd0aCl7YnVmLmNvcHkodGhpcy5sYXN0Q2hhcixwLDAsdGhpcy5sYXN0TmVlZCk7cmV0dXJuIHRoaXMubGFzdENoYXIudG9TdHJpbmcodGhpcy5lbmNvZGluZywwLHRoaXMubGFzdFRvdGFsKX1idWYuY29weSh0aGlzLmxhc3RDaGFyLHAsMCxidWYubGVuZ3RoKTt0aGlzLmxhc3ROZWVkLT1idWYubGVuZ3RofWZ1bmN0aW9uIHV0ZjhUZXh0KGJ1ZixpKXt2YXIgdG90YWw9dXRmOENoZWNrSW5jb21wbGV0ZSh0aGlzLGJ1ZixpKTtpZighdGhpcy5sYXN0TmVlZClyZXR1cm4gYnVmLnRvU3RyaW5nKCJ1dGY4IixpKTt0aGlzLmxhc3RUb3RhbD10b3RhbDt2YXIgZW5kPWJ1Zi5sZW5ndGgtKHRvdGFsLXRoaXMubGFzdE5lZWQpO2J1Zi5jb3B5KHRoaXMubGFzdENoYXIsMCxlbmQpO3JldHVybiBidWYudG9TdHJpbmcoInV0ZjgiLGksZW5kKX1mdW5jdGlvbiB1dGY4RW5kKGJ1Zil7dmFyIHI9YnVmJiZidWYubGVuZ3RoP3RoaXMud3JpdGUoYnVmKToiIjtpZih0aGlzLmxhc3ROZWVkKXJldHVybiByKyLvv70iO3JldHVybiByfWZ1bmN0aW9uIHV0ZjE2VGV4dChidWYsaSl7aWYoKGJ1Zi5sZW5ndGgtaSklMj09PTApe3ZhciByPWJ1Zi50b1N0cmluZygidXRmMTZsZSIsaSk7aWYocil7dmFyIGM9ci5jaGFyQ29kZUF0KHIubGVuZ3RoLTEpO2lmKGM+PTU1Mjk2JiZjPD01NjMxOSl7dGhpcy5sYXN0TmVlZD0yO3RoaXMubGFzdFRvdGFsPTQ7dGhpcy5sYXN0Q2hhclswXT1idWZbYnVmLmxlbmd0aC0yXTt0aGlzLmxhc3RDaGFyWzFdPWJ1ZltidWYubGVuZ3RoLTFdO3JldHVybiByLnNsaWNlKDAsLTEpfX1yZXR1cm4gcn10aGlzLmxhc3ROZWVkPTE7dGhpcy5sYXN0VG90YWw9Mjt0aGlzLmxhc3RDaGFyWzBdPWJ1ZltidWYubGVuZ3RoLTFdO3JldHVybiBidWYudG9TdHJpbmcoInV0ZjE2bGUiLGksYnVmLmxlbmd0aC0xKX1mdW5jdGlvbiB1dGYxNkVuZChidWYpe3ZhciByPWJ1ZiYmYnVmLmxlbmd0aD90aGlzLndyaXRlKGJ1Zik6IiI7aWYodGhpcy5sYXN0TmVlZCl7dmFyIGVuZD10aGlzLmxhc3RUb3RhbC10aGlzLmxhc3ROZWVkO3JldHVybiByK3RoaXMubGFzdENoYXIudG9TdHJpbmcoInV0ZjE2bGUiLDAsZW5kKX1yZXR1cm4gcn1mdW5jdGlvbiBiYXNlNjRUZXh0KGJ1ZixpKXt2YXIgbj0oYnVmLmxlbmd0aC1pKSUzO2lmKG49PT0wKXJldHVybiBidWYudG9TdHJpbmcoImJhc2U2NCIsaSk7dGhpcy5sYXN0TmVlZD0zLW47dGhpcy5sYXN0VG90YWw9MztpZihuPT09MSl7dGhpcy5sYXN0Q2hhclswXT1idWZbYnVmLmxlbmd0aC0xXX1lbHNle3RoaXMubGFzdENoYXJbMF09YnVmW2J1Zi5sZW5ndGgtMl07dGhpcy5sYXN0Q2hhclsxXT1idWZbYnVmLmxlbmd0aC0xXX1yZXR1cm4gYnVmLnRvU3RyaW5nKCJiYXNlNjQiLGksYnVmLmxlbmd0aC1uKX1mdW5jdGlvbiBiYXNlNjRFbmQoYnVmKXt2YXIgcj1idWYmJmJ1Zi5sZW5ndGg/dGhpcy53cml0ZShidWYpOiIiO2lmKHRoaXMubGFzdE5lZWQpcmV0dXJuIHIrdGhpcy5sYXN0Q2hhci50b1N0cmluZygiYmFzZTY0IiwwLDMtdGhpcy5sYXN0TmVlZCk7cmV0dXJuIHJ9ZnVuY3Rpb24gc2ltcGxlV3JpdGUoYnVmKXtyZXR1cm4gYnVmLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcpfWZ1bmN0aW9uIHNpbXBsZUVuZChidWYpe3JldHVybiBidWYmJmJ1Zi5sZW5ndGg/dGhpcy53cml0ZShidWYpOiIifX0seyJzYWZlLWJ1ZmZlciI6MTAzfV0sMTAzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXthcmd1bWVudHNbNF1bNzZdWzBdLmFwcGx5KGV4cG9ydHMsYXJndW1lbnRzKX0se2J1ZmZlcjoyNyxkdXA6NzZ9XSwxMDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihzZXRJbW1lZGlhdGUsY2xlYXJJbW1lZGlhdGUpe3ZhciBuZXh0VGljaz1yZXF1aXJlKCJwcm9jZXNzL2Jyb3dzZXIuanMiKS5uZXh0VGljazt2YXIgYXBwbHk9RnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5O3ZhciBzbGljZT1BcnJheS5wcm90b3R5cGUuc2xpY2U7dmFyIGltbWVkaWF0ZUlkcz17fTt2YXIgbmV4dEltbWVkaWF0ZUlkPTA7ZXhwb3J0cy5zZXRUaW1lb3V0PWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0VGltZW91dCx3aW5kb3csYXJndW1lbnRzKSxjbGVhclRpbWVvdXQpfTtleHBvcnRzLnNldEludGVydmFsPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBUaW1lb3V0KGFwcGx5LmNhbGwoc2V0SW50ZXJ2YWwsd2luZG93LGFyZ3VtZW50cyksY2xlYXJJbnRlcnZhbCl9O2V4cG9ydHMuY2xlYXJUaW1lb3V0PWV4cG9ydHMuY2xlYXJJbnRlcnZhbD1mdW5jdGlvbih0aW1lb3V0KXt0aW1lb3V0LmNsb3NlKCl9O2Z1bmN0aW9uIFRpbWVvdXQoaWQsY2xlYXJGbil7dGhpcy5faWQ9aWQ7dGhpcy5fY2xlYXJGbj1jbGVhckZufVRpbWVvdXQucHJvdG90eXBlLnVucmVmPVRpbWVvdXQucHJvdG90eXBlLnJlZj1mdW5jdGlvbigpe307VGltZW91dC5wcm90b3R5cGUuY2xvc2U9ZnVuY3Rpb24oKXt0aGlzLl9jbGVhckZuLmNhbGwod2luZG93LHRoaXMuX2lkKX07ZXhwb3J0cy5lbnJvbGw9ZnVuY3Rpb24oaXRlbSxtc2Vjcyl7Y2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO2l0ZW0uX2lkbGVUaW1lb3V0PW1zZWNzfTtleHBvcnRzLnVuZW5yb2xsPWZ1bmN0aW9uKGl0ZW0pe2NsZWFyVGltZW91dChpdGVtLl9pZGxlVGltZW91dElkKTtpdGVtLl9pZGxlVGltZW91dD0tMX07ZXhwb3J0cy5fdW5yZWZBY3RpdmU9ZXhwb3J0cy5hY3RpdmU9ZnVuY3Rpb24oaXRlbSl7Y2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO3ZhciBtc2Vjcz1pdGVtLl9pZGxlVGltZW91dDtpZihtc2Vjcz49MCl7aXRlbS5faWRsZVRpbWVvdXRJZD1zZXRUaW1lb3V0KGZ1bmN0aW9uIG9uVGltZW91dCgpe2lmKGl0ZW0uX29uVGltZW91dClpdGVtLl9vblRpbWVvdXQoKX0sbXNlY3MpfX07ZXhwb3J0cy5zZXRJbW1lZGlhdGU9dHlwZW9mIHNldEltbWVkaWF0ZT09PSJmdW5jdGlvbiI/c2V0SW1tZWRpYXRlOmZ1bmN0aW9uKGZuKXt2YXIgaWQ9bmV4dEltbWVkaWF0ZUlkKys7dmFyIGFyZ3M9YXJndW1lbnRzLmxlbmd0aDwyP2ZhbHNlOnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO2ltbWVkaWF0ZUlkc1tpZF09dHJ1ZTtuZXh0VGljayhmdW5jdGlvbiBvbk5leHRUaWNrKCl7aWYoaW1tZWRpYXRlSWRzW2lkXSl7aWYoYXJncyl7Zm4uYXBwbHkobnVsbCxhcmdzKX1lbHNle2ZuLmNhbGwobnVsbCl9ZXhwb3J0cy5jbGVhckltbWVkaWF0ZShpZCl9fSk7cmV0dXJuIGlkfTtleHBvcnRzLmNsZWFySW1tZWRpYXRlPXR5cGVvZiBjbGVhckltbWVkaWF0ZT09PSJmdW5jdGlvbiI/Y2xlYXJJbW1lZGlhdGU6ZnVuY3Rpb24oaWQpe2RlbGV0ZSBpbW1lZGlhdGVJZHNbaWRdfX0pLmNhbGwodGhpcyxyZXF1aXJlKCJ0aW1lcnMiKS5zZXRJbW1lZGlhdGUscmVxdWlyZSgidGltZXJzIikuY2xlYXJJbW1lZGlhdGUpfSx7InByb2Nlc3MvYnJvd3Nlci5qcyI6NjYsdGltZXJzOjEwNH1dLDEwNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKGdsb2JhbCl7bW9kdWxlLmV4cG9ydHM9ZGVwcmVjYXRlO2Z1bmN0aW9uIGRlcHJlY2F0ZShmbixtc2cpe2lmKGNvbmZpZygibm9EZXByZWNhdGlvbiIpKXtyZXR1cm4gZm59dmFyIHdhcm5lZD1mYWxzZTtmdW5jdGlvbiBkZXByZWNhdGVkKCl7aWYoIXdhcm5lZCl7aWYoY29uZmlnKCJ0aHJvd0RlcHJlY2F0aW9uIikpe3Rocm93IG5ldyBFcnJvcihtc2cpfWVsc2UgaWYoY29uZmlnKCJ0cmFjZURlcHJlY2F0aW9uIikpe2NvbnNvbGUudHJhY2UobXNnKX1lbHNle2NvbnNvbGUud2Fybihtc2cpfXdhcm5lZD10cnVlfXJldHVybiBmbi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9cmV0dXJuIGRlcHJlY2F0ZWR9ZnVuY3Rpb24gY29uZmlnKG5hbWUpe3RyeXtpZighZ2xvYmFsLmxvY2FsU3RvcmFnZSlyZXR1cm4gZmFsc2V9Y2F0Y2goXyl7cmV0dXJuIGZhbHNlfXZhciB2YWw9Z2xvYmFsLmxvY2FsU3RvcmFnZVtuYW1lXTtpZihudWxsPT12YWwpcmV0dXJuIGZhbHNlO3JldHVybiBTdHJpbmcodmFsKS50b0xvd2VyQ2FzZSgpPT09InRydWUifX0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsIT09InVuZGVmaW5lZCI/Z2xvYmFsOnR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCI/c2VsZjp0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCI/d2luZG93Ont9KX0se31dfSx7fSxbMl0pOw==","base64").toString("utf8");
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
    var generateKeys = function (seed, keysLengthBytes, workerThreadId) { return __awaiter(void 0, void 0, void 0, function () {
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
        return __awaiter(void 0, void 0, void 0, function () {
            var actionId, wasWorkerThreadIdSpecified, appWorker, ctx, digest;
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
                        ctx = evt_1.Evt.newCtx();
                        appWorker.evtResponse.attach(function (response) { return (response.actionId === actionId &&
                            "percent" in response); }, ctx, function (_a) {
                            var percent = _a.percent;
                            return progress(percent);
                        });
                        return [4 /*yield*/, appWorker.evtResponse.waitFor(function (response) { return (response.actionId === actionId &&
                                "digest" in response); })];
                    case 1:
                        digest = (_a.sent()).digest;
                        appWorker.evtResponse.detach(ctx);
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
},{"../sync/types":14,"../sync/utils/environnement":16,"../sync/utils/toBuffer":17,"./WorkerThread":6,"./serializer":12,"buffer":2,"evt":34,"minimal-polyfills/dist/lib/Array.from":67,"minimal-polyfills/dist/lib/Map":68,"minimal-polyfills/dist/lib/Set":69,"path":4,"run-exclusive":71}],12:[function(require,module,exports){
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
},{"../sync/utils/toBuffer":17,"buffer":2,"transfer-tools/dist/lib/JSON_CUSTOM":73}],13:[function(require,module,exports){
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
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
            arr = __spreadArrays([parseInt(curr, 16)], arr);
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
    if (typeof window !== "undefined") {
        return {
            "type": "BROWSER",
            "isMainThread": true
        };
    }
    if (typeof self !== "undefined" && !!self.postMessage) {
        return {
            "type": "BROWSER",
            "isMainThread": false
        };
    }
    var isNodeCryptoAvailable = (function () {
        try {
            require("crypto" + "");
        }
        catch (_a) {
            return false;
        }
        return true;
    })();
    if (isNodeCryptoAvailable) {
        //NOTE: We do not check process.send because browserify hide it.
        return {
            "type": "NODE",
            "isMainThread": undefined
        };
    }
    return {
        "type": "LIQUID CORE",
        "isMainThread": true
    };
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
exports.__esModule = true;
var Set_1 = require("minimal-polyfills/dist/lib/Set");
var WeakMap_1 = require("minimal-polyfills/dist/lib/WeakMap");
var assert_1 = require("../tools/typeSafety/assert");
var typeGuard_1 = require("../tools/typeSafety/typeGuard");
var LazyEvt_1 = require("./LazyEvt");
var importProxy_1 = require("./importProxy");
var defineAccessors_1 = require("../tools/typeSafety/defineAccessors");
var overwriteReadonlyProp_1 = require("../tools/typeSafety/overwriteReadonlyProp");
var CtxImpl = /** @class */ (function () {
    function CtxImpl() {
        this.lazyEvtAttach = new LazyEvt_1.LazyEvt();
        this.lazyEvtDetach = new LazyEvt_1.LazyEvt();
        this.lazyEvtDoneOrAborted = new LazyEvt_1.LazyEvt();
        this.handlers = new Set_1.Polyfill();
        this.evtByHandler = new WeakMap_1.Polyfill();
    }
    CtxImpl.prototype.onDoneOrAborted = function (doneEvtData) {
        this.lazyEvtDoneOrAborted.post(doneEvtData);
    };
    CtxImpl.prototype.waitFor = function (timeout) {
        var _this_1 = this;
        return this.evtDoneOrAborted
            .waitFor(timeout)
            .then(function (data) {
            if (data.type === "ABORTED") {
                throw data.error;
            }
            return data.result;
        }, function (timeoutError) {
            _this_1.abort(timeoutError);
            throw timeoutError;
        });
    };
    CtxImpl.prototype.abort = function (error) {
        return this.__done(error);
    };
    CtxImpl.prototype.done = function (result) {
        return this.__done(undefined, result);
    };
    /** Detach all handler bound to this context from theirs respective Evt and post getEvtDone() */
    CtxImpl.prototype.__done = function (error, result) {
        var e_1, _a;
        var handlers = [];
        try {
            for (var _b = __values(this.handlers.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var handler = _c.value;
                var evt = this.evtByHandler.get(handler);
                var wasStillAttached = handler.detach();
                //NOTE: It should not be possible
                if (!wasStillAttached) {
                    continue;
                }
                handlers.push({ handler: handler, evt: evt });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.onDoneOrAborted(__assign(__assign({}, (!!error ?
            { type: "ABORTED", error: error } :
            { type: "DONE", "result": result })), { handlers: handlers }));
        return handlers;
    };
    CtxImpl.prototype.getHandlers = function () {
        var _this_1 = this;
        return Array.from(this.handlers.values())
            .map(function (handler) { return ({ handler: handler, "evt": _this_1.evtByHandler.get(handler) }); });
    };
    CtxImpl.prototype.zz__addHandler = function (handler, evt) {
        assert_1.assert(handler.ctx === this);
        assert_1.assert(typeGuard_1.typeGuard(handler));
        this.handlers.add(handler);
        this.evtByHandler.set(handler, evt);
        this.lazyEvtAttach.post({ handler: handler, evt: evt });
    };
    CtxImpl.prototype.zz__removeHandler = function (handler) {
        assert_1.assert(handler.ctx === this);
        assert_1.assert(typeGuard_1.typeGuard(handler));
        this.lazyEvtDetach.post({
            handler: handler,
            "evt": this.evtByHandler.get(handler)
        });
        this.handlers["delete"](handler);
    };
    CtxImpl.__1 = (function () {
        if (false) {
            CtxImpl.__1;
        }
        defineAccessors_1.defineAccessors(CtxImpl.prototype, "evtDoneOrAborted", {
            "get": function () {
                return this.lazyEvtDoneOrAborted.evt;
            }
        });
        defineAccessors_1.defineAccessors(CtxImpl.prototype, "evtAttach", {
            "get": function () {
                return this.lazyEvtAttach.evt;
            }
        });
        defineAccessors_1.defineAccessors(CtxImpl.prototype, "evtDetach", {
            "get": function () {
                return this.lazyEvtDetach.evt;
            }
        });
    })();
    return CtxImpl;
}());
exports.Ctx = CtxImpl;
try {
    overwriteReadonlyProp_1.overwriteReadonlyProp(exports.Ctx, "name", "Ctx");
}
catch (_a) { }
importProxy_1.importProxy.Ctx = exports.Ctx;

},{"../tools/typeSafety/assert":49,"../tools/typeSafety/defineAccessors":50,"../tools/typeSafety/overwriteReadonlyProp":56,"../tools/typeSafety/typeGuard":57,"./LazyEvt":31,"./importProxy":33,"minimal-polyfills/dist/lib/Set":61,"minimal-polyfills/dist/lib/WeakMap":62}],19:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/** https://docs.evt.land/api/evt/asnonpostable */
function asNonPostable(evt) {
    return evt;
}
exports.asNonPostable = asNonPostable;

},{}],20:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/**
 * https://docs.evt.land/api/evt/aspostable
 * ⚠ UNSAFE ⚠ - Please refer to documentation before using.
 * */
function asPostable(evt) {
    return evt;
}
exports.asPostable = asPostable;

},{}],21:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var importProxy_1 = require("./importProxy");
function create() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return args.length === 0 ?
        new importProxy_1.importProxy.Evt() :
        new importProxy_1.importProxy.StatefulEvt(args[0]);
}
exports.create = create;

},{"./importProxy":33}],22:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/** https://docs.evt.land/api/evt/factorize */
function factorize(evt) {
    return evt;
}
exports.factorize = factorize;
/*
import { Evt } from "./Evt";
const x: Evt<boolean> = loosenType(new Evt<true>()); x;
const y: Evt<boolean> = loosenType(new Evt<number>()); y;
*/ 

},{}],23:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var id_1 = require("../tools/typeSafety/id");
var assert_1 = require("../tools/typeSafety/assert");
var typeGuard_1 = require("../tools/typeSafety/typeGuard");
var EventTargetLike_1 = require("./types/EventTargetLike");
var Evt_merge_1 = require("./Evt.merge");
var importProxy_1 = require("./importProxy");
function fromImpl(ctx, target, eventName, options) {
    if ("then" in target) {
        var evt_1 = new importProxy_1.importProxy.Evt();
        var isCtxDone_1 = (function () {
            var getEvtDonePostCount = function () { return ctx === null || ctx === void 0 ? void 0 : ctx.evtDoneOrAborted.postCount; };
            var n = getEvtDonePostCount();
            return function () { return n !== getEvtDonePostCount(); };
        })();
        target.then(function (data) {
            if (isCtxDone_1()) {
                return;
            }
            evt_1.post(data);
        });
        return evt_1;
    }
    if ("length" in target) {
        return Evt_merge_1.mergeImpl(ctx, Array.from(target).map(function (target) { return fromImpl(ctx, target, eventName, options); }));
    }
    var proxy;
    if (EventTargetLike_1.EventTargetLike.NodeStyleEventEmitter.match(target)) {
        proxy = {
            "on": function (listener, eventName) { return target.addListener(eventName, listener); },
            "off": function (listener, eventName) { return target.removeListener(eventName, listener); }
        };
    }
    else if (EventTargetLike_1.EventTargetLike.JQueryStyleEventEmitter.match(target)) {
        proxy = {
            "on": function (listener, eventName) { return target.on(eventName, listener); },
            "off": function (listener, eventName) { return target.off(eventName, listener); }
        };
    }
    else if (EventTargetLike_1.EventTargetLike.HasEventTargetAddRemove.match(target)) {
        proxy = {
            "on": function (listener, eventName, options) { return target.addEventListener(eventName, listener, options); },
            "off": function (listener, eventName, options) { return target.removeEventListener(eventName, listener, options); }
        };
    }
    else if (EventTargetLike_1.EventTargetLike.RxJSSubject.match(target)) {
        var subscription_1;
        proxy = {
            "on": function (listener) { return subscription_1 = target.subscribe(function (data) { return listener(data); }); },
            "off": function () { return subscription_1.unsubscribe(); }
        };
    }
    else {
        id_1.id(target);
        assert_1.assert(false);
    }
    var evt = new importProxy_1.importProxy.Evt();
    var listener = function (data) { return evt.post(data); };
    ctx === null || ctx === void 0 ? void 0 : ctx.evtDoneOrAborted.attachOnce(function () { return proxy.off(listener, eventName, options); });
    proxy.on(listener, eventName, options);
    return evt;
}
function from(ctxOrTarget, targetOrEventName, eventNameOrOptions, options) {
    if ("evtDoneOrAborted" in ctxOrTarget) {
        assert_1.assert(typeGuard_1.typeGuard(targetOrEventName) &&
            typeGuard_1.typeGuard(eventNameOrOptions) &&
            typeGuard_1.typeGuard(options));
        return fromImpl(ctxOrTarget, targetOrEventName, eventNameOrOptions, options);
    }
    else {
        assert_1.assert(typeGuard_1.typeGuard(targetOrEventName) &&
            typeGuard_1.typeGuard(eventNameOrOptions));
        return fromImpl(undefined, ctxOrTarget, targetOrEventName, eventNameOrOptions);
    }
}
exports.from = from;

},{"../tools/typeSafety/assert":49,"../tools/typeSafety/id":52,"../tools/typeSafety/typeGuard":57,"./Evt.merge":27,"./importProxy":33,"./types/EventTargetLike":35}],24:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var WeakMap_1 = require("minimal-polyfills/dist/lib/WeakMap");
var importProxy_1 = require("./importProxy");
/**
 * https://docs.evt.land/api/evt/getctx
 *
 * Evt.weakCtx(obj) always return the same instance of VoidCtx for a given object.
 * No strong reference to the object is created
 * when the object is no longer referenced it's associated Ctx will be freed from memory.
 */
function getCtxFactory() {
    var ctxByObj = new WeakMap_1.Polyfill();
    function getCtx(obj) {
        var ctx = ctxByObj.get(obj);
        if (ctx === undefined) {
            ctx = (new importProxy_1.importProxy.Ctx());
            ctxByObj.set(obj, ctx);
        }
        return ctx;
    }
    return getCtx;
}
exports.getCtxFactory = getCtxFactory;

},{"./importProxy":33,"minimal-polyfills/dist/lib/WeakMap":62}],25:[function(require,module,exports){
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
exports.__esModule = true;
require("minimal-polyfills/dist/lib/Array.prototype.find");
var importProxy_1 = require("./importProxy");
var Evt_create_1 = require("./Evt.create");
var Evt_getCtx_1 = require("./Evt.getCtx");
var Evt_factorize_1 = require("./Evt.factorize");
var Evt_merge_1 = require("./Evt.merge");
var Evt_from_1 = require("./Evt.from");
var Evt_useEffect_1 = require("./Evt.useEffect");
var Evt_asPostable_1 = require("./Evt.asPostable");
var Evt_asNonPostable_1 = require("./Evt.asNonPostable");
var Evt_parsePropsFromArgs_1 = require("./Evt.parsePropsFromArgs");
var Evt_newCtx_1 = require("./Evt.newCtx");
var LazyEvt_1 = require("./LazyEvt");
var defineAccessors_1 = require("../tools/typeSafety/defineAccessors");
var invokeOperator_1 = require("./util/invokeOperator");
var Map_1 = require("minimal-polyfills/dist/lib/Map");
var WeakMap_1 = require("minimal-polyfills/dist/lib/WeakMap");
var runExclusive = require("run-exclusive");
var EvtError_1 = require("./types/EvtError");
var overwriteReadonlyProp_1 = require("../tools/typeSafety/overwriteReadonlyProp");
var typeGuard_1 = require("../tools/typeSafety/typeGuard");
var encapsulateOpState_1 = require("./util/encapsulateOpState");
var Deferred_1 = require("../tools/Deferred");
var Evt_loosenType_1 = require("./Evt.loosenType");
var CtxLike_1 = require("./types/interfaces/CtxLike");
var Operator_1 = require("./types/Operator");
var safeSetTimeout = function (callback, ms) { return setTimeout(callback, ms); };
var safeClearTimeout = function (timer) { return clearTimeout(timer); };
var EvtImpl = /** @class */ (function () {
    function EvtImpl() {
        this.lazyEvtAttach = new LazyEvt_1.LazyEvt();
        this.lazyEvtDetach = new LazyEvt_1.LazyEvt();
        this.__maxHandlers = undefined;
        this.postCount = 0;
        this.traceId = null;
        this.handlers = [];
        this.handlerTriggers = new Map_1.Polyfill();
        /*
        NOTE: Used as Date.now() would be used to compare if an event is anterior
        or posterior to an other. We don't use Date.now() because two call within
        less than a ms will return the same value unlike this function.
        */
        this.__currentChronologyMark = 0;
        this.asyncHandlerCount = 0;
    }
    EvtImpl.setDefaultMaxHandlers = function (n) {
        this.__defaultMaxHandlers = isFinite(n) ? n : 0;
    };
    EvtImpl.prototype.toStateful = function (p1, p2) {
        var isP1Ctx = CtxLike_1.CtxLike.match(p1);
        var initialValue = isP1Ctx ? undefined : p1;
        var ctx = p2 !== null && p2 !== void 0 ? p2 : (isP1Ctx ? p1 : undefined);
        var out = new importProxy_1.importProxy.StatefulEvt(initialValue);
        var callback = function (data) { return out.post(data); };
        if (!!ctx) {
            this.attach(ctx, callback);
        }
        else {
            this.attach(callback);
        }
        return out;
    };
    EvtImpl.prototype.setMaxHandlers = function (n) {
        this.__maxHandlers = isFinite(n) ? n : 0;
        return this;
    };
    EvtImpl.prototype.enableTrace = function (params
    //NOTE: Not typeof console.log as we don't want to expose types from node
    ) {
        var id = params.id, formatter = params.formatter, log = params.log;
        this.traceId = id;
        this.traceFormatter = formatter !== null && formatter !== void 0 ? formatter : (function (data) {
            try {
                return JSON.stringify(data, null, 2);
            }
            catch (_a) {
                return "" + data;
            }
        });
        this.log =
            log === undefined ?
                (function () {
                    var inputs = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        inputs[_i] = arguments[_i];
                    }
                    return console.log.apply(console, __spread(inputs));
                }) :
                log === false ? undefined : log;
    };
    EvtImpl.prototype.disableTrace = function () {
        this.traceId = null;
        return this;
    };
    EvtImpl.prototype.getChronologyMark = function () {
        return this.__currentChronologyMark++;
    };
    EvtImpl.prototype.detachHandler = function (handler, wTimer, rejectPr) {
        var index = this.handlers.indexOf(handler);
        if (index < 0) {
            return false;
        }
        if (typeGuard_1.typeGuard(handler, !!handler.ctx)) {
            handler.ctx.zz__removeHandler(handler);
        }
        this.handlers.splice(index, 1);
        if (handler.async) {
            this.asyncHandlerCount--;
        }
        this.handlerTriggers["delete"](handler);
        if (wTimer[0] !== undefined) {
            safeClearTimeout(wTimer[0]);
            rejectPr(new EvtError_1.EvtError.Detached());
        }
        this.lazyEvtDetach.post(handler);
        return true;
    };
    EvtImpl.prototype.triggerHandler = function (handler, wTimer, resolvePr, opResult) {
        var callback = handler.callback, once = handler.once;
        if (wTimer[0] !== undefined) {
            safeClearTimeout(wTimer[0]);
            wTimer[0] = undefined;
        }
        EvtImpl.doDetachIfNeeded(handler, opResult, once);
        var _a = __read(opResult, 1), transformedData = _a[0];
        callback === null || callback === void 0 ? void 0 : callback.call(this, transformedData);
        resolvePr === null || resolvePr === void 0 ? void 0 : resolvePr(transformedData);
    };
    EvtImpl.prototype.addHandler = function (propsFromArgs, propsFromMethodName) {
        var _this_1 = this;
        if (Operator_1.Operator.fλ.Stateful.match(propsFromArgs.op)) {
            this.statelessByStatefulOp.set(propsFromArgs.op, encapsulateOpState_1.encapsulateOpState(propsFromArgs.op));
        }
        var d = new Deferred_1.Deferred();
        var wTimer = [undefined];
        var handler = __assign(__assign(__assign({}, propsFromArgs), propsFromMethodName), { "detach": function () { return _this_1.detachHandler(handler, wTimer, d.reject); }, "promise": d.pr });
        if (typeof handler.timeout === "number") {
            wTimer[0] = safeSetTimeout(function () {
                wTimer[0] = undefined;
                handler.detach();
                d.reject(new EvtError_1.EvtError.Timeout(handler.timeout));
            }, handler.timeout);
        }
        this.handlerTriggers.set(handler, function (opResult) { return _this_1.triggerHandler(handler, wTimer, d.isPending ? d.resolve : undefined, opResult); });
        if (handler.async) {
            this.asyncHandlerChronologyMark.set(handler, this.getChronologyMark());
        }
        if (handler.prepend) {
            var i = void 0;
            for (i = 0; i < this.handlers.length; i++) {
                if (this.handlers[i].extract) {
                    continue;
                }
                break;
            }
            this.handlers.splice(i, 0, handler);
        }
        else {
            this.handlers.push(handler);
        }
        if (handler.async) {
            this.asyncHandlerCount++;
        }
        this.checkForPotentialMemoryLeak();
        if (typeGuard_1.typeGuard(handler, !!handler.ctx)) {
            handler.ctx.zz__addHandler(handler, this);
        }
        this.lazyEvtAttach.post(handler);
        return handler;
    };
    EvtImpl.prototype.checkForPotentialMemoryLeak = function () {
        var _a;
        var maxHandlers = (_a = this.__maxHandlers) !== null && _a !== void 0 ? _a : EvtImpl.__defaultMaxHandlers;
        if (maxHandlers === 0 ||
            this.handlers.length % (maxHandlers + 1) !== 0) {
            return;
        }
        var message = [
            "MaxHandlersExceededWarning: Possible Evt memory leak detected.",
            this.handlers.length + " handlers attached" + (this.traceId ? " to \"" + this.traceId + "\"" : "") + ".\n",
            "Use Evt.prototype.setMaxHandlers(n) to increase limit on a specific Evt.\n",
            "Use Evt.setDefaultMaxHandlers(n) to change the default limit currently set to " + EvtImpl.__defaultMaxHandlers + ".\n",
        ].join("");
        var map = new Map_1.Polyfill();
        this.getHandlers()
            .map(function (_a) {
            var ctx = _a.ctx, async = _a.async, once = _a.once, prepend = _a.prepend, extract = _a.extract, op = _a.op, callback = _a.callback;
            return (__assign(__assign({ "hasCtx": !!ctx, once: once,
                prepend: prepend,
                extract: extract, "isWaitFor": async }, (op === Evt_parsePropsFromArgs_1.matchAll ? {} : { "op": op.toString() })), (!callback ? {} : { "callback": callback.toString() })));
        })
            .map(function (obj) {
            return "{\n" + Object.keys(obj)
                .map(function (key) { return "  " + key + ": " + obj[key]; })
                .join(",\n") + "\n}";
        })
            .forEach(function (str) { var _a; return map.set(str, ((_a = map.get(str)) !== null && _a !== void 0 ? _a : 0) + 1); });
        message += "\n" + Array.from(map.keys())
            .map(function (str) { return map.get(str) + " handler" + (map.get(str) === 1 ? "" : "s") + " like:\n" + str; })
            .join("\n") + "\n";
        if (this.traceId === null) {
            message += "\n" + [
                "To validate the identify of the Evt instance that is triggering this warning you can call",
                "Evt.prototype.enableTrace({ \"id\": \"My evt id\", \"log\": false }) on the Evt that you suspect.\n"
            ].join(" ");
        }
        try {
            console.warn(message);
        }
        catch (_b) {
        }
    };
    EvtImpl.prototype.getStatelessOp = function (op) {
        return Operator_1.Operator.fλ.Stateful.match(op) ?
            this.statelessByStatefulOp.get(op) :
            op;
    };
    EvtImpl.prototype.trace = function (data) {
        var _this_1 = this;
        var _a;
        if (this.traceId === null) {
            return;
        }
        var message = "(" + this.traceId + ") ";
        var isExtracted = !!this.handlers.find(function (_a) {
            var extract = _a.extract, op = _a.op;
            return (extract &&
                !!_this_1.getStatelessOp(op)(data));
        });
        if (isExtracted) {
            message += "extracted ";
        }
        else {
            var handlerCount = this.handlers
                .filter(function (_a) {
                var extract = _a.extract, op = _a.op;
                return !extract &&
                    !!_this_1.getStatelessOp(op)(data);
            })
                .length;
            message += handlerCount + " handler" + ((handlerCount > 1) ? "s" : "") + ", ";
        }
        (_a = this.log) === null || _a === void 0 ? void 0 : _a.call(this, message + this.traceFormatter(data));
    };
    /** Return isExtracted */
    EvtImpl.prototype.postSync = function (data) {
        var e_1, _a;
        try {
            for (var _b = __values(__spread(this.handlers)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var handler = _c.value;
                var async = handler.async, op = handler.op, extract = handler.extract;
                if (async) {
                    continue;
                }
                var opResult = invokeOperator_1.invokeOperator(this.getStatelessOp(op), data, true);
                if (Operator_1.Operator.fλ.Result.NotMatched.match(opResult)) {
                    EvtImpl.doDetachIfNeeded(handler, opResult);
                    continue;
                }
                var handlerTrigger = this.handlerTriggers.get(handler);
                //NOTE: Possible if detached while in the loop.
                if (!handlerTrigger) {
                    continue;
                }
                handlerTrigger(opResult);
                if (extract) {
                    return true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return false;
    };
    EvtImpl.prototype.postAsyncFactory = function () {
        var _this_1 = this;
        return runExclusive.buildMethodCb(function (data, postChronologyMark, releaseLock) {
            var e_2, _a;
            if (_this_1.asyncHandlerCount === 0) {
                releaseLock();
                return;
            }
            var promises = [];
            var chronologyMarkStartResolveTick;
            //NOTE: Must be before handlerTrigger call.
            Promise.resolve().then(function () { return chronologyMarkStartResolveTick = _this_1.getChronologyMark(); });
            var _loop_1 = function (handler) {
                if (!handler.async) {
                    return "continue";
                }
                var opResult = invokeOperator_1.invokeOperator(_this_1.getStatelessOp(handler.op), data, true);
                if (Operator_1.Operator.fλ.Result.NotMatched.match(opResult)) {
                    EvtImpl.doDetachIfNeeded(handler, opResult);
                    return "continue";
                }
                var handlerTrigger = _this_1.handlerTriggers.get(handler);
                if (!handlerTrigger) {
                    return "continue";
                }
                var shouldCallHandlerTrigger = (function () {
                    var handlerMark = _this_1.asyncHandlerChronologyMark.get(handler);
                    if (postChronologyMark > handlerMark) {
                        return true;
                    }
                    var exceptionRange = _this_1.asyncHandlerChronologyExceptionRange.get(handler);
                    return (exceptionRange !== undefined &&
                        exceptionRange.lowerMark < postChronologyMark &&
                        postChronologyMark < exceptionRange.upperMark &&
                        handlerMark > exceptionRange.upperMark);
                })();
                if (!shouldCallHandlerTrigger) {
                    return "continue";
                }
                promises.push(new Promise(function (resolve) { return handler.promise
                    .then(function () { return resolve(); })["catch"](function () { return resolve(); }); }));
                handlerTrigger(opResult);
            };
            try {
                for (var _b = __values(__spread(_this_1.handlers)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var handler = _c.value;
                    _loop_1(handler);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (promises.length === 0) {
                releaseLock();
                return;
            }
            var handlersDump = __spread(_this_1.handlers);
            Promise.all(promises).then(function () {
                var e_3, _a;
                try {
                    for (var _b = __values(_this_1.handlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var handler = _c.value;
                        if (!handler.async) {
                            continue;
                        }
                        if (handlersDump.indexOf(handler) >= 0) {
                            continue;
                        }
                        _this_1.asyncHandlerChronologyExceptionRange.set(handler, {
                            "lowerMark": postChronologyMark,
                            "upperMark": chronologyMarkStartResolveTick
                        });
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                releaseLock();
            });
        });
    };
    EvtImpl.prototype.isHandled = function (data) {
        var _this_1 = this;
        return !!this.getHandlers()
            .find(function (_a) {
            var op = _a.op;
            return !!_this_1.getStatelessOp(op)(data);
        });
    };
    EvtImpl.prototype.getHandlers = function () {
        return __spread(this.handlers);
    };
    EvtImpl.prototype.detach = function (ctx) {
        var e_4, _a;
        var detachedHandlers = [];
        try {
            for (var _b = __values(this.getHandlers()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var handler = _c.value;
                if (ctx !== undefined && handler.ctx !== ctx) {
                    continue;
                }
                var wasStillAttached = handler.detach();
                //NOTE: It should not be possible.
                if (!wasStillAttached) {
                    continue;
                }
                detachedHandlers.push(handler);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return detachedHandlers;
    };
    EvtImpl.prototype.pipe = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var evtDelegate = new EvtImpl();
        this.addHandler(__assign(__assign({}, Evt_parsePropsFromArgs_1.parsePropsFromArgs(args, "pipe")), { "callback": function (transformedData) { return evtDelegate.post(transformedData); } }), EvtImpl.propsFormMethodNames.attach);
        return evtDelegate;
    };
    EvtImpl.prototype.waitFor = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.addHandler(Evt_parsePropsFromArgs_1.parsePropsFromArgs(args, "waitFor"), EvtImpl.propsFormMethodNames.waitFor).promise;
    };
    EvtImpl.prototype.$attach = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.attach.apply(this, __spread(inputs));
    };
    EvtImpl.prototype.attach = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.__attachX(args, "attach");
    };
    EvtImpl.prototype.$attachOnce = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.attachOnce.apply(this, __spread(inputs));
    };
    EvtImpl.prototype.attachOnce = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.__attachX(args, "attachOnce");
    };
    EvtImpl.prototype.$attachExtract = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.attachExtract.apply(this, __spread(inputs));
    };
    EvtImpl.prototype.attachExtract = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.__attachX(args, "attachExtract");
    };
    EvtImpl.prototype.$attachPrepend = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.attachPrepend.apply(this, __spread(inputs));
    };
    EvtImpl.prototype.attachPrepend = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.__attachX(args, "attachPrepend");
    };
    EvtImpl.prototype.$attachOncePrepend = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.attachOncePrepend.apply(this, __spread(inputs));
    };
    EvtImpl.prototype.attachOncePrepend = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.__attachX(args, "attachOncePrepend");
    };
    EvtImpl.prototype.$attachOnceExtract = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.attachOnceExtract.apply(this, __spread(inputs));
    };
    EvtImpl.prototype.attachOnceExtract = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.__attachX(args, "attachOnceExtract");
    };
    EvtImpl.prototype.__attachX = function (args, methodName) {
        var propsFromArgs = Evt_parsePropsFromArgs_1.parsePropsFromArgs(args, "attach*");
        var handler = this.addHandler(propsFromArgs, EvtImpl.propsFormMethodNames[methodName]);
        return propsFromArgs.timeout === undefined ?
            this :
            handler.promise;
    };
    EvtImpl.prototype.postAsyncOnceHandled = function (data) {
        var _this_1 = this;
        if (this.isHandled(data)) {
            return this.post(data);
        }
        var d = new Deferred_1.Deferred();
        this.evtAttach.attachOnce(function (_a) {
            var op = _a.op;
            return !!invokeOperator_1.invokeOperator(_this_1.getStatelessOp(op), data);
        }, function () { return Promise.resolve().then(function () { return d.resolve(_this_1.post(data)); }); });
        return d.pr;
    };
    EvtImpl.prototype.post = function (data) {
        this.trace(data);
        overwriteReadonlyProp_1.overwriteReadonlyProp(this, "postCount", this.postCount + 1);
        //NOTE: Must be before postSync.
        var postChronologyMark = this.getChronologyMark();
        var isExtracted = this.postSync(data);
        if (isExtracted) {
            return this.postCount;
        }
        if (this.postAsync === undefined) {
            if (this.asyncHandlerCount === 0) {
                return this.postCount;
            }
            this.postAsync = this.postAsyncFactory();
        }
        this.postAsync(data, postChronologyMark);
        return this.postCount;
    };
    EvtImpl.create = Evt_create_1.create;
    EvtImpl.newCtx = Evt_newCtx_1.newCtx;
    EvtImpl.merge = Evt_merge_1.merge;
    EvtImpl.from = Evt_from_1.from;
    EvtImpl.useEffect = Evt_useEffect_1.useEffect;
    EvtImpl.getCtx = Evt_getCtx_1.getCtxFactory();
    EvtImpl.loosenType = Evt_loosenType_1.loosenType;
    EvtImpl.factorize = Evt_factorize_1.factorize;
    EvtImpl.asPostable = Evt_asPostable_1.asPostable;
    EvtImpl.asNonPostable = Evt_asNonPostable_1.asNonPostable;
    EvtImpl.__defaultMaxHandlers = 25;
    EvtImpl.__1 = (function () {
        if (false) {
            EvtImpl.__1;
        }
        defineAccessors_1.defineAccessors(EvtImpl.prototype, "evtAttach", {
            "get": function () {
                return this.lazyEvtAttach.evt;
            }
        });
        defineAccessors_1.defineAccessors(EvtImpl.prototype, "evtDetach", {
            "get": function () {
                return this.lazyEvtDetach.evt;
            }
        });
    })();
    EvtImpl.__2 = (function () {
        if (false) {
            EvtImpl.__2;
        }
        Object.defineProperties(EvtImpl.prototype, [
            "__asyncHandlerChronologyMark",
            "__asyncHandlerChronologyExceptionRange",
            "__statelessByStatefulOp"
        ].map(function (key) { return [
            key.substr(2),
            {
                "get": function () {
                    if (this[key] === undefined) {
                        this[key] = new WeakMap_1.Polyfill();
                    }
                    return this[key];
                }
            }
        ]; }).reduce(function (prev, _a) {
            var _b;
            var _c = __read(_a, 2), key = _c[0], obj = _c[1];
            return (__assign(__assign({}, prev), (_b = {}, _b[key] = obj, _b)));
        }, {}));
    })();
    EvtImpl.propsFormMethodNames = {
        "waitFor": { "async": true, "extract": false, "once": true, "prepend": false },
        "attach": { "async": false, "extract": false, "once": false, "prepend": false },
        "attachExtract": { "async": false, "extract": true, "once": false, "prepend": true },
        "attachPrepend": { "async": false, "extract": false, "once": false, "prepend": true },
        "attachOnce": { "async": false, "extract": false, "once": true, "prepend": false },
        "attachOncePrepend": { "async": false, "extract": false, "once": true, "prepend": true },
        "attachOnceExtract": { "async": false, "extract": true, "once": true, "prepend": true }
    };
    return EvtImpl;
}());
(function (EvtImpl) {
    function doDetachIfNeeded(handler, opResult, once) {
        var detach = Operator_1.Operator.fλ.Result.getDetachArg(opResult);
        if (typeof detach !== "boolean") {
            var _a = __read(detach, 3), ctx = _a[0], error = _a[1], res = _a[2];
            if (!!error) {
                ctx.abort(error);
            }
            else {
                ctx.done(res);
            }
        }
        else if (detach || !!once) {
            handler.detach();
        }
    }
    EvtImpl.doDetachIfNeeded = doDetachIfNeeded;
})(EvtImpl || (EvtImpl = {}));
exports.Evt = EvtImpl;
try {
    overwriteReadonlyProp_1.overwriteReadonlyProp(exports.Evt, "name", "Evt");
}
catch (_a) { }
importProxy_1.importProxy.Evt = exports.Evt;

},{"../tools/Deferred":48,"../tools/typeSafety/defineAccessors":50,"../tools/typeSafety/overwriteReadonlyProp":56,"../tools/typeSafety/typeGuard":57,"./Evt.asNonPostable":19,"./Evt.asPostable":20,"./Evt.create":21,"./Evt.factorize":22,"./Evt.from":23,"./Evt.getCtx":24,"./Evt.loosenType":26,"./Evt.merge":27,"./Evt.newCtx":28,"./Evt.parsePropsFromArgs":29,"./Evt.useEffect":30,"./LazyEvt":31,"./importProxy":33,"./types/EvtError":36,"./types/Operator":37,"./types/interfaces/CtxLike":39,"./util/encapsulateOpState":42,"./util/invokeOperator":47,"minimal-polyfills/dist/lib/Array.prototype.find":58,"minimal-polyfills/dist/lib/Map":59,"minimal-polyfills/dist/lib/WeakMap":62,"run-exclusive":63}],26:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/**
 * https://docs.evt.land/api/evt/loosenType
 */
function loosenType(evt) {
    return evt;
}
exports.loosenType = loosenType;
/*
import { Evt } from "./Evt";
const x: Evt<boolean> = loosenType(new Evt<true>()); x;
const y: Evt<boolean> = loosenType(new Evt<number>()); y;
*/

},{}],27:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var importProxy_1 = require("./importProxy");
function mergeImpl(ctx, evts) {
    var evtUnion = new importProxy_1.importProxy.Evt();
    var callback = function (data) { return evtUnion.post(data); };
    evts.forEach(function (evt) {
        if (ctx === undefined) {
            evt.attach(callback);
        }
        else {
            evt.attach(ctx, callback);
        }
    });
    return evtUnion;
}
exports.mergeImpl = mergeImpl;
function merge(p1, p2) {
    return "length" in p1 ?
        mergeImpl(undefined, p1) :
        mergeImpl(p1, p2);
}
exports.merge = merge;

},{"./importProxy":33}],28:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var importProxy_1 = require("./importProxy");
function newCtx() {
    return new importProxy_1.importProxy.Ctx();
}
exports.newCtx = newCtx;

},{"./importProxy":33}],29:[function(require,module,exports){
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
exports.__esModule = true;
var id_1 = require("../tools/typeSafety/id");
var compose_1 = require("./util/compose");
var typeGuard_1 = require("../tools/typeSafety/typeGuard");
function matchAll() { return true; }
exports.matchAll = matchAll;
var canBeOperator = function (p) {
    return (p !== undefined &&
        typeGuard_1.typeGuard(p) &&
        (typeof p === "function" ||
            typeof p[0] === "function"));
};
var defaultParams = {
    "op": matchAll,
    "ctx": undefined,
    "timeout": undefined,
    "callback": undefined
};
function parsePropsFromArgs(inputs, methodName) {
    typeGuard_1.typeGuard(defaultParams);
    switch (methodName) {
        case "pipe":
            {
                //[]
                //[undefined] ( not valid but user would expect it to work )
                //[ ctx, ...op[] ]
                //[ ...op[] ]
                var getOpWrap = function (ops) {
                    return ops.length === 0 ?
                        {}
                        :
                            { "op": ops.length === 1 ? ops[0] : compose_1.compose.apply(void 0, __spread(ops)) };
                };
                if (canBeOperator(inputs[0])) {
                    //[ ...op[] ]
                    return id_1.id(__assign(__assign({}, defaultParams), getOpWrap(inputs)));
                }
                else {
                    //[]
                    //[ ctx, ...Operator.fλ[] ]
                    var _a = __read(inputs), ctx = _a[0], rest = _a.slice(1);
                    return id_1.id(__assign(__assign(__assign({}, defaultParams), (ctx !== undefined ? { ctx: ctx } : {})), getOpWrap(rest)));
                }
            }
            break;
        case "waitFor":
            {
                //[ op, ctx, timeout ]
                //[ op, ctx, undefined ]
                //[ op, ctx ]
                //[ op, timeout ]
                //[ op, undefined ]
                //[ ctx, timeout ]
                //[ ctx, undefined ]
                //[ op ]
                //[ ctx ]
                //[ timeout ]
                //[ undefined ]
                //[ callback ]
                return parsePropsFromArgs(__spread(inputs.filter(function (value, index) { return !(index === inputs.length - 1 &&
                    value === undefined); }), [
                    defaultParams.callback
                ]), "attach*");
            }
            break;
        case "attach*":
            {
                //NOTE: when callback is undefined call has been forward from waitFor.
                //[ op, ctx, timeout, callback ]
                //[ op, ctx, timeout, undefined ]
                //[ op, ctx, callback ]
                //[ op, ctx, undefined ]
                //[ op, timeout, callback ]
                //[ op, timeout, undefined ]
                //[ ctx, timeout, callback ]
                //[ ctx, timeout, undefined ]
                //[ op, callback ]
                //[ op, undefined ]
                //[ ctx, callback ]
                //[ ctx, undefined ]
                //[ timeout, callback ]
                //[ timeout, undefined ]
                //[ callback ]
                //[ undefined ]
                var n = inputs.length;
                switch (n) {
                    case 4: {
                        //[ op, ctx, timeout, callback ]
                        var _b = __read(inputs, 4), p1 = _b[0], p2 = _b[1], p3 = _b[2], p4 = _b[3];
                        return id_1.id(__assign(__assign({}, defaultParams), { "op": p1, "ctx": p2, "timeout": p3, "callback": p4 }));
                    }
                    case 3: {
                        //[ op, ctx, callback ]
                        //[ op, timeout, callback ]
                        //[ ctx, timeout, callback ]
                        var _c = __read(inputs, 3), p1 = _c[0], p2 = _c[1], p3 = _c[2];
                        if (typeof p2 === "number") {
                            //[ op, timeout, callback ]
                            //[ ctx, timeout, callback ]
                            var timeout = p2;
                            var callback = p3;
                            if (canBeOperator(p1)) {
                                //[ op, timeout, callback ]
                                return id_1.id(__assign(__assign({}, defaultParams), { timeout: timeout,
                                    callback: callback, "op": p1 }));
                            }
                            else {
                                //[ ctx, timeout, callback ]
                                return id_1.id(__assign(__assign({}, defaultParams), { timeout: timeout,
                                    callback: callback, "ctx": p1 }));
                            }
                        }
                        else {
                            //[ op, ctx, callback ]
                            return id_1.id(__assign(__assign({}, defaultParams), { "op": p1, "ctx": p2, "callback": p3 }));
                        }
                    }
                    case 2: {
                        //[ op, callback ]
                        //[ ctx, callback ]
                        //[ timeout, callback ]
                        var _d = __read(inputs, 2), p1 = _d[0], p2 = _d[1];
                        if (typeof p1 === "number") {
                            //[ timeout, callback ]
                            return id_1.id(__assign(__assign({}, defaultParams), { "timeout": p1, "callback": p2 }));
                        }
                        else {
                            //[ op, callback ]
                            //[ ctx, callback ]
                            var callback = p2;
                            if (canBeOperator(p1)) {
                                return id_1.id(__assign(__assign({}, defaultParams), { callback: callback, "op": p1 }));
                            }
                            else {
                                return id_1.id(__assign(__assign({}, defaultParams), { callback: callback, "ctx": p1 }));
                            }
                        }
                    }
                    case 1: {
                        //[ callback ]
                        var _e = __read(inputs, 1), p = _e[0];
                        return id_1.id(__assign(__assign({}, defaultParams), { "callback": p }));
                    }
                    case 0: {
                        return id_1.id(__assign({}, defaultParams));
                    }
                }
            }
            break;
    }
}
exports.parsePropsFromArgs = parsePropsFromArgs;

},{"../tools/typeSafety/id":52,"../tools/typeSafety/typeGuard":57,"./util/compose":41}],30:[function(require,module,exports){
"use strict";
exports.__esModule = true;
function useEffect(effect, evt, dataFirst) {
    var i = 0;
    evt.attach(function (data) { return effect(data, { "isFirst": false, data: data }, i++); });
    effect(dataFirst === null || dataFirst === void 0 ? void 0 : dataFirst[0], { "isFirst": true }, i++);
}
exports.useEffect = useEffect;

},{}],31:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var overwriteReadonlyProp_1 = require("../tools/typeSafety/overwriteReadonlyProp");
var importProxy_1 = require("./importProxy");
var defineAccessors_1 = require("../tools/typeSafety/defineAccessors");
var LazyEvt = /** @class */ (function () {
    function LazyEvt() {
        this.initialPostCount = 0;
    }
    LazyEvt.prototype.post = function (data) {
        if (this.__evt === undefined) {
            return ++this.initialPostCount;
        }
        return this.__evt.post(data);
    };
    LazyEvt.__1 = (function () {
        if (false) {
            LazyEvt.__1;
        }
        defineAccessors_1.defineAccessors(LazyEvt.prototype, "evt", {
            "get": function () {
                if (this.__evt === undefined) {
                    this.__evt = new importProxy_1.importProxy.Evt();
                    overwriteReadonlyProp_1.overwriteReadonlyProp(this.__evt, "postCount", this.initialPostCount);
                }
                return this.__evt;
            }
        });
    })();
    return LazyEvt;
}());
exports.LazyEvt = LazyEvt;

},{"../tools/typeSafety/defineAccessors":50,"../tools/typeSafety/overwriteReadonlyProp":56,"./importProxy":33}],32:[function(require,module,exports){
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
require("minimal-polyfills/dist/lib/Object.is");
var defineAccessors_1 = require("../tools/typeSafety/defineAccessors");
var LazyEvt_1 = require("./LazyEvt");
var importProxy_1 = require("./importProxy");
var invokeOperator_1 = require("./util/invokeOperator");
var Operator_1 = require("./types/Operator");
var Evt_parsePropsFromArgs_1 = require("./Evt.parsePropsFromArgs");
var Evt_2 = require("./Evt");
var StatefulEvtImpl = /** @class */ (function (_super) {
    __extends(StatefulEvtImpl, _super);
    function StatefulEvtImpl(initialState) {
        var _this_1 = _super.call(this) || this;
        _this_1.lazyEvtDiff = new LazyEvt_1.LazyEvt();
        _this_1.lazyEvtChange = new LazyEvt_1.LazyEvt();
        _this_1.lazyEvtChangeDiff = new LazyEvt_1.LazyEvt();
        _this_1.__state = initialState;
        return _this_1;
    }
    StatefulEvtImpl.prototype.post = function (data) {
        return this.__post(data, false);
    };
    StatefulEvtImpl.prototype.postForceChange = function (wData) {
        return this.__post(!!wData ? wData[0] : this.state, true);
    };
    StatefulEvtImpl.prototype.__post = function (data, forceChange) {
        var prevState = this.state;
        this.__state = data;
        var diff = { prevState: prevState, "newState": this.state };
        this.lazyEvtDiff.post(diff);
        if (forceChange || !Object.is(prevState, this.state)) {
            this.lazyEvtChange.post(this.state);
            this.lazyEvtChangeDiff.post(diff);
        }
        return _super.prototype.post.call(this, data);
    };
    StatefulEvtImpl.prototype.statefulPipe = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var evt = this
            .pipe.apply(this, __spread(args));
        var opResult = invokeOperator_1.invokeOperator(this.getStatelessOp(Evt_parsePropsFromArgs_1.parsePropsFromArgs(args, "pipe").op), this.state);
        if (Operator_1.Operator.fλ.Result.NotMatched.match(opResult)) {
            throw new Error([
                "Operator do not match current state",
                "use evt.pipe([ctx], op).toStatic(initialState)",
                "to be sure the StatefulEvt is correctly initialized"
            ].join(" "));
        }
        return evt.toStateful(opResult[0]);
    };
    StatefulEvtImpl.__4 = (function () {
        if (false) {
            StatefulEvtImpl.__4;
        }
        defineAccessors_1.defineAccessors(StatefulEvtImpl.prototype, "state", {
            "get": function () { return this.__state; },
            "set": function (state) { this.post(state); }
        });
        defineAccessors_1.defineAccessors(StatefulEvtImpl.prototype, "evtDiff", { "get": function () { return this.lazyEvtDiff.evt; } });
        defineAccessors_1.defineAccessors(StatefulEvtImpl.prototype, "evtChange", { "get": function () { return this.lazyEvtChange.evt; } });
        defineAccessors_1.defineAccessors(StatefulEvtImpl.prototype, "evtChangeDiff", { "get": function () { return this.lazyEvtChangeDiff.evt; } });
    })();
    return StatefulEvtImpl;
}(Evt_2.Evt));
exports.StatefulEvt = StatefulEvtImpl;
importProxy_1.importProxy.StatefulEvt = exports.StatefulEvt;

},{"../tools/typeSafety/defineAccessors":50,"./Evt":25,"./Evt.parsePropsFromArgs":29,"./LazyEvt":31,"./importProxy":33,"./types/Operator":37,"./util/invokeOperator":47,"minimal-polyfills/dist/lib/Object.is":60}],33:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/** Manually handling circular import so React Native does not gives warning. */
exports.importProxy = {};

},{}],34:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
exports.__esModule = true;
__export(require("./types"));
__export(require("./util"));
var Ctx_1 = require("./Ctx");
exports.Ctx = Ctx_1.Ctx;
var Evt_2 = require("./Evt");
exports.Evt = Evt_2.Evt;
var StatefulEvt_1 = require("./StatefulEvt");
exports.StatefulEvt = StatefulEvt_1.StatefulEvt;
var matchVoid_1 = require("../tools/typeSafety/matchVoid");
exports.matchVoid = matchVoid_1.matchVoid;

},{"../tools/typeSafety/matchVoid":54,"./Ctx":18,"./Evt":25,"./StatefulEvt":32,"./types":38,"./util":46}],35:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var typeSafety_1 = require("../../tools/typeSafety");
var EventTargetLike;
(function (EventTargetLike) {
    var RxJSSubject;
    (function (RxJSSubject) {
        function match(eventTarget) {
            return (typeSafety_1.typeGuard(eventTarget) &&
                eventTarget instanceof Object &&
                typeof eventTarget.subscribe === "function");
        }
        RxJSSubject.match = match;
    })(RxJSSubject = EventTargetLike.RxJSSubject || (EventTargetLike.RxJSSubject = {}));
    var NodeStyleEventEmitter;
    (function (NodeStyleEventEmitter) {
        ;
        function match(eventTarget) {
            return (typeSafety_1.typeGuard(eventTarget) &&
                eventTarget instanceof Object &&
                typeof eventTarget.addListener === "function" &&
                typeof eventTarget.removeListener === "function");
        }
        NodeStyleEventEmitter.match = match;
    })(NodeStyleEventEmitter = EventTargetLike.NodeStyleEventEmitter || (EventTargetLike.NodeStyleEventEmitter = {}));
    var JQueryStyleEventEmitter;
    (function (JQueryStyleEventEmitter) {
        function match(eventTarget) {
            return (typeSafety_1.typeGuard(eventTarget) &&
                eventTarget instanceof Object &&
                typeof eventTarget.on === "function" &&
                typeof eventTarget.off === "function");
        }
        JQueryStyleEventEmitter.match = match;
    })(JQueryStyleEventEmitter = EventTargetLike.JQueryStyleEventEmitter || (EventTargetLike.JQueryStyleEventEmitter = {}));
    var HasEventTargetAddRemove;
    (function (HasEventTargetAddRemove) {
        function match(eventTarget) {
            return (typeSafety_1.typeGuard(eventTarget) &&
                eventTarget instanceof Object &&
                typeof eventTarget.addEventListener === "function" &&
                typeof eventTarget.removeEventListener === "function");
        }
        HasEventTargetAddRemove.match = match;
    })(HasEventTargetAddRemove = EventTargetLike.HasEventTargetAddRemove || (EventTargetLike.HasEventTargetAddRemove = {}));
})(EventTargetLike = exports.EventTargetLike || (exports.EventTargetLike = {}));

},{"../../tools/typeSafety":53}],36:[function(require,module,exports){
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
exports.__esModule = true;
var EvtError;
(function (EvtError) {
    var Timeout = /** @class */ (function (_super) {
        __extends(Timeout, _super);
        function Timeout(timeout) {
            var _newTarget = this.constructor;
            var _this_1 = _super.call(this, "Evt timeout after " + timeout + "ms") || this;
            _this_1.timeout = timeout;
            Object.setPrototypeOf(_this_1, _newTarget.prototype);
            return _this_1;
        }
        return Timeout;
    }(Error));
    EvtError.Timeout = Timeout;
    var Detached = /** @class */ (function (_super) {
        __extends(Detached, _super);
        function Detached() {
            var _newTarget = this.constructor;
            var _this_1 = _super.call(this, "Evt handler detached") || this;
            Object.setPrototypeOf(_this_1, _newTarget.prototype);
            return _this_1;
        }
        return Detached;
    }(Error));
    EvtError.Detached = Detached;
})(EvtError = exports.EvtError || (exports.EvtError = {}));

},{}],37:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var typeSafety_1 = require("../../tools/typeSafety");
var Operator;
(function (Operator) {
    var fλ;
    (function (fλ) {
        var Stateful;
        (function (Stateful) {
            function match(op) {
                return typeof op !== "function";
            }
            Stateful.match = match;
        })(Stateful = fλ.Stateful || (fλ.Stateful = {}));
        var Result;
        (function (Result) {
            function match(result) {
                return Matched.match(result) || NotMatched.match(result);
            }
            Result.match = match;
            function getDetachArg(result) {
                var detach = Matched.match(result) ? result[1] : result;
                if (Detach.FromEvt.match(detach)) {
                    return true;
                }
                if (Detach.WithCtxArg.match(detach)) {
                    return [
                        detach.DETACH,
                        detach.err,
                        detach.res
                    ];
                }
                return false;
            }
            Result.getDetachArg = getDetachArg;
            var NotMatched;
            (function (NotMatched) {
                function match(result) {
                    return (result === null ||
                        Detach.match(result));
                }
                NotMatched.match = match;
            })(NotMatched = Result.NotMatched || (Result.NotMatched = {}));
            var Matched;
            (function (Matched) {
                function match(result) {
                    return (typeSafety_1.typeGuard(result) &&
                        result instanceof Object &&
                        !("input" in result) && //exclude String.prototype.match
                        (result.length === 1 ||
                            (result.length === 2 &&
                                (result[1] === null ||
                                    Detach.match(result[1])))));
                }
                Matched.match = match;
            })(Matched = Result.Matched || (Result.Matched = {}));
            var Detach;
            (function (Detach) {
                var FromEvt;
                (function (FromEvt) {
                    function match(detach) {
                        return detach === "DETACH";
                    }
                    FromEvt.match = match;
                })(FromEvt = Detach.FromEvt || (Detach.FromEvt = {}));
                var WithCtxArg;
                (function (WithCtxArg) {
                    function match(detach) {
                        return (typeSafety_1.typeGuard(detach) &&
                            detach instanceof Object &&
                            detach.DETACH instanceof Object);
                    }
                    WithCtxArg.match = match;
                })(WithCtxArg = Detach.WithCtxArg || (Detach.WithCtxArg = {}));
                function match(detach) {
                    return FromEvt.match(detach) || WithCtxArg.match(detach);
                }
                Detach.match = match;
            })(Detach = Result.Detach || (Result.Detach = {}));
        })(Result = fλ.Result || (fλ.Result = {}));
    })(fλ = Operator.fλ || (Operator.fλ = {}));
})(Operator = exports.Operator || (exports.Operator = {}));

},{"../../tools/typeSafety":53}],38:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var EventTargetLike_1 = require("./EventTargetLike");
exports.EventTargetLike = EventTargetLike_1.EventTargetLike;
var EvtError_1 = require("./EvtError");
exports.EvtError = EvtError_1.EvtError;
var dom = require("./lib.dom");
exports.dom = dom;
var Operator_1 = require("./Operator");
exports.Operator = Operator_1.Operator;

},{"./EventTargetLike":35,"./EvtError":36,"./Operator":37,"./lib.dom":40}],39:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var typeGuard_1 = require("../../../tools/typeSafety/typeGuard");
var CtxLike;
(function (CtxLike) {
    function match(o) {
        return (typeGuard_1.typeGuard(o) &&
            o instanceof Object &&
            typeof o.done === "function" &&
            typeof o.abort === "function" &&
            typeof o.zz__addHandler === "function" &&
            typeof o.zz__removeHandler === "function");
    }
    CtxLike.match = match;
})(CtxLike = exports.CtxLike || (exports.CtxLike = {}));

},{"../../../tools/typeSafety/typeGuard":57}],40:[function(require,module,exports){
"use strict";
/*
This is a curated re export of the dom API definitions.

The DOM definitions are available only when "compilerOptions": { "lib": ["DOM"] }}
is present in the tsconfig.json.

We need we re-export those definitions so that we can expose methods that interact with
the DOM ( ex Evt.from ) while not producing type error when
EVT is imported in project that does not use 'lib DOM', typically
projects that targets Node.JS.
*/
exports.__esModule = true;

},{}],41:[function(require,module,exports){
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
var encapsulateOpState_1 = require("./encapsulateOpState");
var invokeOperator_1 = require("./invokeOperator");
var Operator_1 = require("../types/Operator");
var id_1 = require("../../tools/typeSafety/id");
var assert_1 = require("../../tools/typeSafety/assert");
var typeGuard_1 = require("../../tools/typeSafety/typeGuard");
function f_o_g(op1, op2) {
    var opAtoB = Operator_1.Operator.fλ.Stateful.match(op1) ?
        encapsulateOpState_1.encapsulateOpState(op1) :
        id_1.id(op1);
    var opBtoC = Operator_1.Operator.fλ.Stateful.match(op2) ?
        encapsulateOpState_1.encapsulateOpState(op2) :
        id_1.id(op2);
    return id_1.id(function () {
        var _a = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            _a[_i] = arguments[_i];
        }
        var _b = __read(_a, 3), dataA = _b[0], isPost = _b[2];
        var _c, _d;
        var resultB = invokeOperator_1.invokeOperator(opAtoB, dataA, isPost);
        if (Operator_1.Operator.fλ.Result.NotMatched.match(resultB)) {
            //CtxResultOp1 assignable to CtxResultOp1 | CtxResultOp2...
            assert_1.assert(typeGuard_1.typeGuard(resultB));
            return resultB;
        }
        var detachOp1 = (_c = resultB[1]) !== null && _c !== void 0 ? _c : null;
        //...same...
        assert_1.assert(typeGuard_1.typeGuard(detachOp1));
        var _e = __read(resultB, 1), dataB = _e[0];
        var resultC = invokeOperator_1.invokeOperator(opBtoC, dataB, isPost);
        if (Operator_1.Operator.fλ.Result.NotMatched.match(resultC)) {
            //...same
            assert_1.assert(typeGuard_1.typeGuard(resultC));
            return detachOp1 !== null && detachOp1 !== void 0 ? detachOp1 : resultC;
        }
        return id_1.id([
            resultC[0],
            (_d = detachOp1 !== null && detachOp1 !== void 0 ? detachOp1 : resultC[1]) !== null && _d !== void 0 ? _d : null
        ]);
    });
}
function compose() {
    var ops = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        ops[_i] = arguments[_i];
    }
    if (ops.length === 1) {
        var _a = __read(ops, 1), op = _a[0];
        return Operator_1.Operator.fλ.Stateful.match(op) ?
            encapsulateOpState_1.encapsulateOpState(op) :
            op;
    }
    var _b = __read(ops), op1 = _b[0], op2 = _b[1], rest = _b.slice(2);
    var op1_o_op2 = f_o_g(op1, op2);
    if (rest.length === 0) {
        return op1_o_op2;
    }
    return compose.apply(void 0, __spread([op1_o_op2], rest));
}
exports.compose = compose;

},{"../../tools/typeSafety/assert":49,"../../tools/typeSafety/id":52,"../../tools/typeSafety/typeGuard":57,"../types/Operator":37,"./encapsulateOpState":42,"./invokeOperator":47}],42:[function(require,module,exports){
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
exports.__esModule = true;
var id_1 = require("../../tools/typeSafety/id");
var Operator_1 = require("../types/Operator");
function encapsulateOpState(statefulFλOp) {
    var state = statefulFλOp[1];
    return id_1.id(function () {
        var _a = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            _a[_i] = arguments[_i];
        }
        var _b = __read(_a, 3), data = _b[0], cbInvokedIfMatched = _b[2];
        var opResult = statefulFλOp[0](data, state, cbInvokedIfMatched);
        if (!!cbInvokedIfMatched &&
            Operator_1.Operator.fλ.Result.Matched.match(opResult)) {
            state = opResult[0];
        }
        return opResult;
    });
}
exports.encapsulateOpState = encapsulateOpState;

},{"../../tools/typeSafety/id":52,"../types/Operator":37}],43:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var throttleTime_1 = require("./throttleTime");
exports.throttleTime = throttleTime_1.throttleTime;
var to_1 = require("./to");
exports.to = to_1.to;

},{"./throttleTime":44,"./to":45}],44:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var compose_1 = require("../compose");
exports.throttleTime = function (duration) {
    return compose_1.compose([
        function (data, _a) {
            var lastClick = _a.lastClick;
            var now = Date.now();
            return now - lastClick < duration ?
                null :
                [{ data: data, "lastClick": now }];
        },
        { "lastClick": 0, "data": null }
    ], function (_a) {
        var data = _a.data;
        return [data];
    });
};

},{"../compose":41}],45:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.to = function (eventName) {
    return function (data) { return data[0] !== eventName ?
        null : [data[1]]; };
};

},{}],46:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
exports.__esModule = true;
__export(require("./genericOperators"));
var compose_1 = require("./compose");
exports.compose = compose_1.compose;
var invokeOperator_1 = require("./invokeOperator");
exports.invokeOperator = invokeOperator_1.invokeOperator;

},{"./compose":41,"./genericOperators":43,"./invokeOperator":47}],47:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var Operator_1 = require("../types/Operator");
function invokeOperator(op, data, isPost) {
    var result = op(data, undefined, isPost);
    return Operator_1.Operator.fλ.Result.match(result) ?
        result :
        !!result ? [data] : null;
}
exports.invokeOperator = invokeOperator;

},{"../types/Operator":37}],48:[function(require,module,exports){
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
exports.__esModule = true;
var overwriteReadonlyProp_1 = require("./typeSafety/overwriteReadonlyProp");
var Deferred = /** @class */ (function () {
    function Deferred() {
        var _this_1 = this;
        this.isPending = true;
        var resolve;
        var reject;
        this.pr = new Promise(function (resolve_, reject_) {
            resolve = function (value) {
                overwriteReadonlyProp_1.overwriteReadonlyProp(_this_1, "isPending", false);
                resolve_(value);
            };
            reject = function (error) {
                overwriteReadonlyProp_1.overwriteReadonlyProp(_this_1, "isPending", false);
                reject_(error);
            };
        });
        this.resolve = resolve;
        this.reject = reject;
    }
    return Deferred;
}());
exports.Deferred = Deferred;
var VoidDeferred = /** @class */ (function (_super) {
    __extends(VoidDeferred, _super);
    function VoidDeferred() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return VoidDeferred;
}(Deferred));
exports.VoidDeferred = VoidDeferred;

},{"./typeSafety/overwriteReadonlyProp":56}],49:[function(require,module,exports){
"use strict";
exports.__esModule = true;
function assert(condition, msg) {
    if (!condition) {
        throw new Error(msg);
    }
}
exports.assert = assert;

},{}],50:[function(require,module,exports){
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
exports.__esModule = true;
exports.defineAccessors = function (obj, propertyName, propertyDescriptor) {
    var _a;
    var get = propertyDescriptor.get, set = propertyDescriptor.set;
    Object.defineProperty(obj, propertyName, __assign(__assign(__assign({}, ((_a = Object.getOwnPropertyDescriptor(obj, propertyName)) !== null && _a !== void 0 ? _a : {
        "enumerable": true,
        "configurable": true
    })), (get !== undefined ? { "get": function () { return get.call(this); } } : {})), (set !== undefined ? { "set": function (value) { set.call(this, value); } } : {})));
};

},{}],51:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/** Return a function to use as Array.prototype.filter argument
 * to exclude one or many primitive value element from the array.
 * Ex: ([ "a", "b" ] as const).filter(exclude("a") return "b"[]
 */
function exclude(target) {
    var test = target instanceof Object ?
        (function (element) { return target.indexOf(element) < 0; }) :
        (function (element) { return element !== target; });
    return function (str) {
        return test(str);
    };
}
exports.exclude = exclude;

},{}],52:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/**
 * The identity function.
 *
 * Help to build an object of type T.
 * Better than using 'as T' as there is no type safety loss.
 *
 * - Used as continence for enabling type inference.
 * Example:
 *
 * type Circle = {
 *     type: "CIRCLE";
 *     radius: number;
 * };
 *
 * type Square = {
 *     type: "SQUARE";
 *     side: number;
 * };
 * type Shape= Circle | Square;
 *
 * declare function f(shape: Shape): void;
 *
 * f(id<Circle>({ "type": "CIRCLE", "radius": 33 }); <== We have auto completion to instantiate circle.
 *
 * - Used to loosen the type restriction without saying "trust me" to the compiler.
 * declare const x: Set<readonly ["FOO"]>;
 * declare function f(s: Set<string[]>): void;
 * f(id<Set<any>>(x));
 *
 * Example:
 * declare const x: Set<readonly [ "FOO" ]>;
 * declare f(x: Set<string[]>): void;
 * id(x as Set<["FOO"]>); <== trust me it's readonly!
 * f(id<Set<any>>(x)); <== we acknowledge that we are out of the safe zone.
 */
exports.id = function (x) { return x; };

},{}],53:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var assert_1 = require("./assert");
exports.assert = assert_1.assert;
var exclude_1 = require("./exclude");
exports.exclude = exclude_1.exclude;
var id_1 = require("./id");
exports.id = id_1.id;
var matchVoid_1 = require("./matchVoid");
exports.matchVoid = matchVoid_1.matchVoid;
var objectKeys_1 = require("./objectKeys");
exports.objectKeys = objectKeys_1.objectKeys;
var typeGuard_1 = require("./typeGuard");
exports.typeGuard = typeGuard_1.typeGuard;

},{"./assert":49,"./exclude":51,"./id":52,"./matchVoid":54,"./objectKeys":55,"./typeGuard":57}],54:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/**
 *
 * Unlike undefined or null, testing o !== void
 * will not restrict the type.
 *
 * Example:
 *
 * declare o: { p: string; } | void;
 *
 * matchVoid(o)?null:o.p <== Type inference ok
 *
 * Match void
 * @param o type of o should be a union of type containing void
 * @returns true if o is undefined
 */
function matchVoid(o) {
    return o === undefined;
}
exports.matchVoid = matchVoid;

},{}],55:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/** Object.keys() with types */
function objectKeys(o) {
    return Object.keys(o);
}
exports.objectKeys = objectKeys;

},{}],56:[function(require,module,exports){
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
exports.__esModule = true;
/**
 * Assign a value to a property even if the object is freezed or if the property is not writable
 * Throw if the assignation fail ( for example if the property is non configurable write: false )
 * */
exports.overwriteReadonlyProp = function (obj, propertyName, value) {
    var _a;
    try {
        obj[propertyName] = value;
    }
    catch (_b) {
    }
    if (obj[propertyName] === value) {
        return value;
    }
    var errorDefineProperty = undefined;
    var propertyDescriptor = (_a = Object.getOwnPropertyDescriptor(obj, propertyName)) !== null && _a !== void 0 ? _a : {
        "enumerable": true,
        "configurable": true
    };
    if (!!propertyDescriptor.get) {
        throw new Error("Probably a wrong ides to overwrite " + propertyName + " getter");
    }
    try {
        Object.defineProperty(obj, propertyName, __assign(__assign({}, propertyDescriptor), { value: value }));
    }
    catch (error) {
        errorDefineProperty = error;
    }
    if (obj[propertyName] !== value) {
        throw errorDefineProperty !== null && errorDefineProperty !== void 0 ? errorDefineProperty : new Error("Can't assign");
    }
    return value;
};

},{}],57:[function(require,module,exports){
"use strict";
exports.__esModule = true;
/**
 * Use cases:
 *
 * 1) When we know the subtype of a variable but the compiler is unaware.
 *
 * declare const x: "FOO" | "BAR";
 *
 * 1.1) If we want to tel the compile that we know x is of type "BAR"
 *
 * assert(typeGuard<"BAR">(x));
 * x; <== x is of type "BAR"
 *
 * 1.2) If we want to tell the compiler that x is NOT of type "BAR"
 *
 * assert(!typeGuard<"BAR">(x,false));
 * x; <== x is of type "FOO"
 *
 * 2) Tell the compiler what assertion can be made on a given variable
 * if a given test return true.
 *
 * type Circle = { type: "CIRCLE"; radius: number; };
 * type Square = { type: "SQUARE"; sideLength: number; };
 * type Shape = Circle | Square;
 *
 * declare const shape: Shape;
 *
 * if( typeGuard<Circle>(shape, shape.type === "CIRCLE") ){
 *     [ shape is Circle ]
 * }else{
 *     [ shape is not Circle ]
 * }
 *
 *
 * export function matchVoid(o: any): o is void {
 *     return typeGuard<void>(o, o === undefined || o === null );
 * }
 *
 * 3) Helper for safely build other type guards
 *
 * export function match<T>(set: Object): set is SetLike<T> {
 *     return (
 *         typeGuard<SetLike<T>>(set) &&
 *         typeof set.values === "function" &&
 *         /Set/.test(Object.getPrototypeOf(set).constructor.name)
 *     );
 * }
 *
 */
function typeGuard(o, isMatched) {
    if (isMatched === void 0) { isMatched = true; }
    o; //NOTE: Just to avoid unused variable;
    return isMatched;
}
exports.typeGuard = typeGuard;

},{}],58:[function(require,module,exports){
"use strict";
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

},{}],59:[function(require,module,exports){
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
exports.LightMapImpl = LightMapImpl;
exports.Polyfill = typeof Map !== "undefined" ? Map : LightMapImpl;

},{}],60:[function(require,module,exports){
"use strict";
if (!Object.is) {
    Object.is = function (x, y) {
        // SameValue algorithm
        if (x === y) { // Steps 1-5, 7-10
            // Steps 6.b-6.e: +0 != -0
            return x !== 0 || 1 / x === 1 / y;
        }
        else {
            // Step 6.a: NaN == NaN
            return x !== x && y !== y;
        }
    };
}

},{}],61:[function(require,module,exports){
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

},{"./Map":59}],62:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var Map_1 = require("./Map");
exports.Polyfill = typeof WeakMap !== "undefined" ? WeakMap : Map_1.Polyfill;

},{"./Map":59}],63:[function(require,module,exports){
"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
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
 * execution ongoing but 0 queued.
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
                fun.apply(this, __spreadArrays(inputs, [onComplete]));
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

},{"minimal-polyfills/dist/lib/WeakMap":62}],64:[function(require,module,exports){
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

},{}],65:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":64}],66:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":65}],67:[function(require,module,exports){
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

},{}],68:[function(require,module,exports){
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
exports.LightMapImpl = LightMapImpl;
exports.Polyfill = typeof Map !== "undefined" ? Map : LightMapImpl;

},{}],69:[function(require,module,exports){
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

},{"./Map":68}],70:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var Map_1 = require("./Map");
exports.Polyfill = typeof WeakMap !== "undefined" ? WeakMap : Map_1.Polyfill;

},{"./Map":68}],71:[function(require,module,exports){
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
 * execution ongoing but 0 queued.
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

},{"minimal-polyfills/dist/lib/WeakMap":70}],72:[function(require,module,exports){
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
},{"has":66}],73:[function(require,module,exports){
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

},{"super-json":72}],74:[function(require,module,exports){
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
require("minimal-polyfills/dist/lib/Object.assign");
var urlGetParameters = require("frontend-shared/dist/tools/urlGetParameters");
var availablePages = require("frontend-shared/dist/lib/availablePages");
var hostKfd = require("frontend-shared/dist/lib/nativeModules/hostKfd");
var registerPageLaunch_1 = require("frontend-shared/dist/lib/appLauncher/registerPageLaunch");
var apiExposedToHost = __assign({}, hostKfd.apiExposedToHost);
Object.assign(window, { apiExposedToHost: apiExposedToHost });
$(document).ready(function () {
    var prApi = registerPageLaunch_1.registerPageLaunch({
        "assertJsRuntimeEnv": "browser",
        "email": urlGetParameters.parseUrl().email,
        "uiApi": {
            "emailInput": {
                "setValue": function (_a) {
                    var value = _a.value, readonly = _a.readonly;
                    $("#email").val(value);
                    $("#email").prop("readonly", readonly);
                },
                "getValue": function () { return $("#email").val(); }
            },
            "passwordInput": {
                "getValue": function () { return $("#password").val(); }
            },
            "redirectToLogin": function (_a) {
                var email = _a.email;
                return window.location.href = urlGetParameters.buildUrl("/" + availablePages.PageName.login, { email: email });
            }
        }
    });
    /* Start code from template */
    $("#register-form").validate({
        "ignore": 'input[type="hidden"]',
        "errorPlacement": function (error, element) {
            var place = element.closest('.input-group');
            if (!place.get(0)) {
                place = element;
            }
            if (error.text() !== '') {
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
            },
            "password1": {
                "equalTo": '#password'
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
    /* End code from template */
    $("#register-form").on("submit", function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var register;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        event.preventDefault();
                        if (!$(this).valid())
                            return [2 /*return*/];
                        return [4 /*yield*/, prApi];
                    case 1:
                        register = (_a.sent()).register;
                        register();
                        return [2 /*return*/];
                }
            });
        });
    });
});

},{"frontend-shared/dist/lib/appLauncher/registerPageLaunch":78,"frontend-shared/dist/lib/availablePages":79,"frontend-shared/dist/lib/nativeModules/hostKfd":91,"frontend-shared/dist/tools/urlGetParameters":106,"minimal-polyfills/dist/lib/ArrayBuffer.isView":75,"minimal-polyfills/dist/lib/Object.assign":76}],75:[function(require,module,exports){
"use strict";
if (!ArrayBuffer["isView"]) {
    ArrayBuffer.isView = function isView(a) {
        return a !== null && typeof (a) === "object" && a["buffer"] instanceof ArrayBuffer;
    };
}

},{}],76:[function(require,module,exports){
"use strict";
if (typeof Object.assign !== 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, _varArgs) {
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

},{}],77:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var web_api_declaration_1 = require("semasim-gateway/dist/web_api_declaration");
exports.webApiPath = web_api_declaration_1.apiPath;

},{"semasim-gateway/dist/web_api_declaration":160}],78:[function(require,module,exports){
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var registerPageLogic = require("../pageLogic/register");
var webApiCaller_1 = require("../webApiCaller");
var AuthenticatedSessionDescriptorSharedData_1 = require("../localStorage/AuthenticatedSessionDescriptorSharedData");
var networkStateMonitoring = require("../networkStateMonitoring");
var restartApp_1 = require("../restartApp");
var dialog_1 = require("../../tools/modal/dialog");
var JustRegistered_1 = require("../localStorage/JustRegistered");
function registerPageLaunch(params) {
    return __awaiter(this, void 0, void 0, function () {
        var networkStateMonitoringApi, webApi;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, networkStateMonitoring.getApi()];
                case 1:
                    networkStateMonitoringApi = _a.sent();
                    webApi = (function () {
                        var _a = webApiCaller_1.getWebApi({
                            AuthenticatedSessionDescriptorSharedData: AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData,
                            networkStateMonitoringApi: networkStateMonitoringApi,
                            restartApp: restartApp_1.restartApp
                        }), getLoginLogoutApi = _a.getLoginLogoutApi, rest = __rest(_a, ["getLoginLogoutApi"]);
                        return __assign(__assign({}, rest), getLoginLogoutApi({
                            "assertJsRuntimeEnv": params.assertJsRuntimeEnv,
                        }));
                    })();
                    return [2 /*return*/, registerPageLogic.factory({
                            webApi: webApi,
                            dialogApi: dialog_1.dialogApi,
                            JustRegistered: JustRegistered_1.JustRegistered
                        })(params)];
            }
        });
    });
}
exports.registerPageLaunch = registerPageLaunch;

},{"../../tools/modal/dialog":102,"../localStorage/AuthenticatedSessionDescriptorSharedData":85,"../localStorage/JustRegistered":86,"../networkStateMonitoring":93,"../pageLogic/register":94,"../restartApp":96,"../webApiCaller":98}],79:[function(require,module,exports){
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

},{}],80:[function(require,module,exports){
(function (Buffer){
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
var cryptoLib = require("crypto-lib");
var hostCrypto = require("../nativeModules/hostCryptoLib");
var env_1 = require("../env");
var crypto_lib_1 = require("crypto-lib");
exports.WorkerThreadId = crypto_lib_1.WorkerThreadId;
exports.RsaKey = crypto_lib_1.RsaKey;
exports.scrypt = crypto_lib_1.scrypt;
exports.toBuffer = crypto_lib_1.toBuffer;
exports.workerThreadPool = crypto_lib_1.workerThreadPool;
exports.stringifyThenEncryptFactory = crypto_lib_1.stringifyThenEncryptFactory;
exports.decryptThenParseFactory = crypto_lib_1.decryptThenParseFactory;
if (env_1.env.jsRuntimeEnv === "react-native") {
    cryptoLib.disableMultithreading();
}
var aes;
(function (aes) {
    aes.generateKey = cryptoLib.aes.generateKey;
    aes.encryptorDecryptorFactory = env_1.env.jsRuntimeEnv === "browser" ?
        function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return (_a = cryptoLib.aes).encryptorDecryptorFactory.apply(_a, __spread(args));
        }
        :
            function (key) { return ({
                "encrypt": function (plainData) { return hostCrypto.aesEncryptOrDecrypt("ENCRYPT", cryptoLib.toBuffer(key).toString("base64"), cryptoLib.toBuffer(plainData).toString("base64")).then(function (_a) {
                    var outputDataB64 = _a.outputDataB64;
                    return Buffer.from(outputDataB64, "base64");
                }); },
                "decrypt": function (encryptedData) { return hostCrypto.aesEncryptOrDecrypt("DECRYPT", cryptoLib.toBuffer(key).toString("base64"), cryptoLib.toBuffer(encryptedData).toString("base64")).then(function (_a) {
                    var outputDataB64 = _a.outputDataB64;
                    return Buffer.from(outputDataB64, "base64");
                }); }
            }); };
    cryptoLib.aes.encryptorDecryptorFactory;
})(aes = exports.aes || (exports.aes = {}));
var rsa;
(function (rsa) {
    rsa.generateKeys = env_1.env.jsRuntimeEnv === "browser" ?
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
    rsa.encryptorFactory = env_1.env.jsRuntimeEnv === "browser" ?
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
    rsa.decryptorFactory = env_1.env.jsRuntimeEnv === "browser" ?
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
                "decrypt": function (encryptedData) { return hostCrypto.rsaEncryptOrDecrypt("DECRYPT", cryptoLib.RsaKey.stringify(decryptKey), cryptoLib.toBuffer(encryptedData).toString("base64")).then(function (_a) {
                    var outputDataB64 = _a.outputDataB64;
                    return Buffer.from(outputDataB64, "base64");
                }); }
            }); };
})(rsa = exports.rsa || (exports.rsa = {}));

}).call(this,require("buffer").Buffer)
},{"../env":84,"../nativeModules/hostCryptoLib":90,"buffer":2,"crypto-lib":11}],81:[function(require,module,exports){
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
function preSpawnIfNotAlreadyDone() {
    if (preSpawnIfNotAlreadyDone.hasBeenCalled) {
        return;
    }
    preSpawnIfNotAlreadyDone.hasBeenCalled = true;
    cryptoLib.workerThreadPool.preSpawn(workerThreadPoolId, 1);
    workerThreadId = cryptoLib.workerThreadPool.listIds(workerThreadPoolId)[0];
}
exports.preSpawnIfNotAlreadyDone = preSpawnIfNotAlreadyDone;
preSpawnIfNotAlreadyDone.hasBeenCalled = false;
function computeLoginSecretAndTowardUserKeys(params) {
    return __awaiter(this, void 0, void 0, function () {
        var password, uniqUserIdentification, _a, digest1, digest2, towardUserKeys;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    password = params.password, uniqUserIdentification = params.uniqUserIdentification;
                    dialog_1.dialogApi.loading("Generating cryptographic digest from password \uD83D\uDD10", 0);
                    return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                            var salt;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, cryptoLib.scrypt.hash((function () {
                                            var realm = Buffer.from("semasim.com", "utf8");
                                            return cryptoLib.toBuffer(binaryDataManipulations_1.concatUint8Array(realm, binaryDataManipulations_1.addPadding("LEFT", Buffer.from(uniqUserIdentification
                                                .replace(/\s/g, "")
                                                .toLowerCase(), "utf8"), 100 - realm.length))).toString("utf8");
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
},{"../../tools/modal/dialog":102,"./cryptoLibProxy":80,"./kfd":82,"buffer":2,"crypto-lib/dist/sync/utils/binaryDataManipulations":15}],82:[function(require,module,exports){
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
var env_1 = require("../env");
var hostKfd = require("../nativeModules/hostKfd");
var cryptoLibProxy_1 = require("./cryptoLibProxy");
exports.kfd = env_1.env.jsRuntimeEnv === "browser" ?
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
},{"../env":84,"../nativeModules/hostKfd":91,"./cryptoLibProxy":80,"buffer":2}],83:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//NOTE: Defined at ejs building in templates/head_common.ejs
//NOTE: If windows is not defined it mean that we are running on node, performing some integration tests.
var default_ = typeof window !== "undefined" ? ({
    "assetsRoot": window["assets_root"],
    "isDevEnv": window["isDevEnv"],
    "baseDomain": window.location.href.match(/^https:\/\/web\.([^\/]+)/)[1],
    "jsRuntimeEnv": "browser",
    "hostOs": undefined
}) : ({
    "assetsRoot": "https://static.semasim.com/",
    "isDevEnv": false,
    "baseDomain": "dev.semasim.com",
    "jsRuntimeEnv": "browser",
    "hostOs": undefined
});
exports.default = default_;

},{}],84:[function(require,module,exports){
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

},{"./impl":83}],85:[function(require,module,exports){
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
var evt_1 = require("evt");
var localStorageApi = require("./localStorageApi");
var key = "authenticated-session-descriptor-shared-data";
var AuthenticatedSessionDescriptorSharedData;
(function (AuthenticatedSessionDescriptorSharedData) {
    /** Can be used to track when the user is logged in */
    //export const evtChange = new Evt<AuthenticatedSessionDescriptorSharedData | undefined>();
    AuthenticatedSessionDescriptorSharedData.evtChange = new evt_1.Evt();
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
                    case 0:
                        evt_1.Evt.asPostable(AuthenticatedSessionDescriptorSharedData.evtChange).post(undefined);
                        return [4 /*yield*/, isPresent()];
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
                        evt_1.Evt.asPostable(AuthenticatedSessionDescriptorSharedData.evtChange).post(authenticatedSessionDescriptorSharedData);
                        return [2 /*return*/];
                }
            });
        });
    }
    AuthenticatedSessionDescriptorSharedData.set = set;
})(AuthenticatedSessionDescriptorSharedData = exports.AuthenticatedSessionDescriptorSharedData || (exports.AuthenticatedSessionDescriptorSharedData = {}));

}).call(this,require("buffer").Buffer)
},{"./localStorageApi":89,"buffer":2,"evt":125}],86:[function(require,module,exports){
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
var key = "just-registered";
var JustRegistered;
(function (JustRegistered) {
    function store(justRegistered) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, localStorageApi.setItem(key, JSON.stringify(justRegistered, function (key, value) { return key === "towardUserKeys" ?
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
                    case 0: return [4 /*yield*/, localStorageApi.getItem(key)];
                    case 1:
                        justRegisteredStr = _a.sent();
                        if (justRegisteredStr === null) {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, localStorageApi.removeItem(key)];
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

},{"./TowardUserKeys":87,"./localStorageApi":89}],87:[function(require,module,exports){
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
var key = "toward-user-keys";
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
                    case 0: return [4 /*yield*/, localStorageApi.setItem(key, stringify(towardUserKeys))];
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
                    case 0: return [4 /*yield*/, localStorageApi.getItem(key)];
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

},{"./localStorageApi":89,"crypto-lib/dist/sync/types":14}],88:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = localStorage;

},{}],89:[function(require,module,exports){
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

},{"./asyncOrSyncLocalStorage":88}],90:[function(require,module,exports){
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
var evt_1 = require("evt");
var evtAesEncryptOrDecryptResult = new evt_1.Evt().setMaxHandlers(Infinity);
var evtRsaEncryptOrDecryptResult = new evt_1.Evt();
var evtRsaGenerateKeysResult = new evt_1.Evt();
exports.apiExposedToHost = {
    "onAesEncryptOrDecryptResult": function (callRef, outputDataB64) {
        return evtAesEncryptOrDecryptResult.post({ callRef: callRef, outputDataB64: outputDataB64 });
    },
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
function aesEncryptOrDecrypt(action, keyB64, inputDataB64) {
    return __awaiter(this, void 0, void 0, function () {
        var callRef, outputDataB64;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    callRef = getCounter();
                    apiExposedByHost.aesEncryptOrDecrypt(action, keyB64, inputDataB64, callRef);
                    return [4 /*yield*/, evtAesEncryptOrDecryptResult.waitFor(function (_a) {
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
exports.aesEncryptOrDecrypt = aesEncryptOrDecrypt;
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

},{"evt":125}],91:[function(require,module,exports){
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
var evt_1 = require("evt");
var evtKfdResult = new evt_1.Evt();
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

},{"evt":125}],92:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var evt_1 = require("evt");
var api = {
    "getIsOnline": function () { return navigator.onLine; },
    "evtStateChange": (function () {
        var out = evt_1.Evt.create();
        window.addEventListener("online", function () { return out.post(); });
        window.addEventListener("offline", function () { return out.post(); });
        return out;
    })()
};
exports.getApi = function () { return Promise.resolve(api); };

},{"evt":125}],93:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var impl_1 = require("./impl");
exports.getApi = impl_1.getApi;

},{"./impl":92}],94:[function(require,module,exports){
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
var keyGeneration = require("../crypto/keysGeneration");
var cryptoLib = require("../crypto/cryptoLibProxy");
function factory(params) {
    var webApi = params.webApi, dialogApi = params.dialogApi, JustRegistered = params.JustRegistered;
    return function launchRegister(params) {
        return __awaiter(this, void 0, void 0, function () {
            var email, uiApi;
            var _this = this;
            return __generator(this, function (_a) {
                email = params.email, uiApi = params.uiApi;
                keyGeneration.preSpawnIfNotAlreadyDone();
                if (email !== undefined) {
                    uiApi.emailInput.setValue({
                        "value": email,
                        "readonly": true
                    });
                }
                return [2 /*return*/, {
                        "register": function () { return __awaiter(_this, void 0, void 0, function () {
                            var email, password, _a, secret, towardUserKeys, regStatus, _b, _c, _d, _e;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0:
                                        email = uiApi.emailInput.getValue();
                                        password = uiApi.passwordInput.getValue();
                                        return [4 /*yield*/, keyGeneration.computeLoginSecretAndTowardUserKeys({
                                                password: password,
                                                "uniqUserIdentification": email
                                            })];
                                    case 1:
                                        _a = _f.sent(), secret = _a.secret, towardUserKeys = _a.towardUserKeys;
                                        dialogApi.loading("Creating account", 0);
                                        _c = (_b = webApi).registerUser;
                                        _d = {
                                            email: email,
                                            secret: secret,
                                            "towardUserEncryptKeyStr": cryptoLib.RsaKey.stringify(towardUserKeys.encryptKey)
                                        };
                                        _e = "encryptedSymmetricKey";
                                        return [4 /*yield*/, keyGeneration.symmetricKey.createThenEncryptKey(towardUserKeys.encryptKey)];
                                    case 2: return [4 /*yield*/, _c.apply(_b, [(_d[_e] = _f.sent(),
                                                _d["shouldThrowOnError"] = true,
                                                _d)]).catch(function () { return new Error(); })];
                                    case 3:
                                        regStatus = _f.sent();
                                        if (!(regStatus instanceof Error)) return [3 /*break*/, 5];
                                        return [4 /*yield*/, dialogApi.create("alert", { "message": "Something went wrong, please try again later" })];
                                    case 4:
                                        _f.sent();
                                        return [2 /*return*/];
                                    case 5:
                                        switch (regStatus) {
                                            case "EMAIL NOT AVAILABLE":
                                                dialogApi.dismissLoading();
                                                dialogApi.create("alert", { "message": "Semasim account for " + email + " has already been created" });
                                                uiApi.emailInput.setValue({
                                                    "value": "",
                                                    "readonly": false
                                                });
                                                break;
                                            case "CREATED":
                                            case "CREATED NO ACTIVATION REQUIRED":
                                                JustRegistered.store({
                                                    password: password,
                                                    secret: secret,
                                                    towardUserKeys: towardUserKeys,
                                                    "promptEmailValidationCode": regStatus !== "CREATED NO ACTIVATION REQUIRED"
                                                });
                                                uiApi.redirectToLogin({ email: email });
                                                break;
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); }
                    }];
            });
        });
    };
}
exports.factory = factory;

},{"../crypto/cryptoLibProxy":80,"../crypto/keysGeneration":81}],95:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var env_1 = require("../env");
var default_ = function (reason) {
    if (env_1.env.isDevEnv) {
        alert("About to restart app, reason: " + reason);
    }
    location.reload();
    return new Promise(function () { });
};
exports.default = default_;

},{"../env":84}],96:[function(require,module,exports){
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
var impl = require("./impl");
var beforeRestartActions = [];
function registerActionToPerformBeforeAppRestart(action) {
    beforeRestartActions.push(action);
}
exports.registerActionToPerformBeforeAppRestart = registerActionToPerformBeforeAppRestart;
function matchPromise(obj) {
    return (obj instanceof Object &&
        typeof obj.then === "function");
}
exports.restartApp = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return __awaiter(void 0, void 0, void 0, function () {
        var tasks, beforeRestartActions_1, beforeRestartActions_1_1, action, prOrVoid;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tasks = [];
                    try {
                        for (beforeRestartActions_1 = __values(beforeRestartActions), beforeRestartActions_1_1 = beforeRestartActions_1.next(); !beforeRestartActions_1_1.done; beforeRestartActions_1_1 = beforeRestartActions_1.next()) {
                            action = beforeRestartActions_1_1.value;
                            prOrVoid = action();
                            if (!matchPromise(prOrVoid)) {
                                continue;
                            }
                            tasks.push(prOrVoid);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (beforeRestartActions_1_1 && !beforeRestartActions_1_1.done && (_a = beforeRestartActions_1.return)) _a.call(beforeRestartActions_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    if (!(tasks.length !== 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, Promise.all(tasks)];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2: return [2 /*return*/, impl.default.apply(impl, __spread(args))];
            }
        });
    });
};

},{"./impl":95}],97:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectSidHttpHeaderName = "x-connect-sid";

},{}],98:[function(require,module,exports){
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var apiDeclaration = require("../../web_api_declaration");
var sendRequest_1 = require("./sendRequest");
var env_1 = require("../env");
var evt_1 = require("evt");
var assert_1 = require("../../tools/typeSafety/assert");
function getWebApi(params) {
    var _this = this;
    assert_1.assert(!getWebApi.hasBeenCalled);
    getWebApi.hasBeenCalled = true;
    //const { Credentials, AuthenticatedSessionDescriptorSharedData } = params;
    var AuthenticatedSessionDescriptorSharedData = params.AuthenticatedSessionDescriptorSharedData, restartApp = params.restartApp, networkStateMonitoringApi = params.networkStateMonitoringApi;
    var evtError = new evt_1.Evt();
    evtError.attach(function (_a) {
        var methodName = _a.methodName, httpErrorStatus = _a.httpErrorStatus;
        switch (env_1.env.jsRuntimeEnv) {
            case "browser":
                {
                    switch (httpErrorStatus) {
                        case 401:
                            restartApp("Wep api 401");
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
                    restartApp("WebApi Error: " + methodName + " " + httpErrorStatus);
                }
                break;
        }
    });
    var sendRequest = function (params_) { return __awaiter(_this, void 0, void 0, function () {
        var methodName, params, shouldThrowOnError, _a, _b, _c, _d, error_1;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    methodName = params_.methodName, params = params_.params, shouldThrowOnError = params_.shouldThrowOnError;
                    if (!!networkStateMonitoringApi.getIsOnline()) return [3 /*break*/, 2];
                    return [4 /*yield*/, networkStateMonitoringApi.evtStateChange.waitFor()];
                case 1:
                    _e.sent();
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 8, , 9]);
                    _a = sendRequest_1.sendRequest;
                    _b = [methodName,
                        params];
                    _d = env_1.env.jsRuntimeEnv === "react-native";
                    if (!_d) return [3 /*break*/, 4];
                    return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData.isPresent()];
                case 3:
                    _d = (_e.sent());
                    _e.label = 4;
                case 4:
                    if (!_d) return [3 /*break*/, 6];
                    return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData.get()];
                case 5:
                    _c = (_e.sent()).connect_sid;
                    return [3 /*break*/, 7];
                case 6:
                    _c = undefined;
                    _e.label = 7;
                case 7: return [2 /*return*/, _a.apply(void 0, _b.concat([_c]))];
                case 8:
                    error_1 = _e.sent();
                    if (!(error_1 instanceof sendRequest_1.WebApiError)) {
                        throw error_1;
                    }
                    if (shouldThrowOnError) {
                        throw error_1;
                    }
                    evtError.post(error_1);
                    return [2 /*return*/, new Promise(function () { })];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    return {
        WebApiError: sendRequest_1.WebApiError,
        "registerUser": (function () {
            var methodName = apiDeclaration.registerUser.methodName;
            return function (params_) {
                var shouldThrowOnError = params_.shouldThrowOnError, params = __rest(params_, ["shouldThrowOnError"]);
                return sendRequest({
                    methodName: methodName,
                    params: params,
                    shouldThrowOnError: shouldThrowOnError
                });
            };
        })(),
        "validateEmail": (function () {
            var methodName = apiDeclaration.validateEmail.methodName;
            return function (params_) {
                var shouldThrowOnError = params_.shouldThrowOnError, params = __rest(params_, ["shouldThrowOnError"]);
                return sendRequest({
                    methodName: methodName,
                    params: params,
                    shouldThrowOnError: shouldThrowOnError
                });
            };
        })(),
        "getLoginLogoutApi": function (dependencyInjectionParams) {
            assert_1.assert(dependencyInjectionParams.assertJsRuntimeEnv === env_1.env.jsRuntimeEnv, "Wrong params for js runtime environnement");
            return ({
                /** uaInstanceId should be provided on android/ios and undefined on the web */
                "loginUser": (function () {
                    var methodName = apiDeclaration.loginUser.methodName;
                    return function (params_) {
                        return __awaiter(this, void 0, void 0, function () {
                            var response, Credentials_1, declaredPushNotificationToken_1;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        assert_1.assert(params_.assertJsRuntimeEnv === env_1.env.jsRuntimeEnv);
                                        params_.email = params_.email.toLowerCase();
                                        return [4 /*yield*/, sendRequest({
                                                methodName: methodName,
                                                "params": {
                                                    "email": params_.email,
                                                    "secret": params_.secret,
                                                    "uaInstanceId": (function () {
                                                        switch (params_.assertJsRuntimeEnv) {
                                                            case "browser": return undefined;
                                                            case "react-native": return params_.uaInstanceId;
                                                        }
                                                    })()
                                                },
                                                "shouldThrowOnError": params_.shouldThrowOnError
                                            })];
                                    case 1:
                                        response = _a.sent();
                                        if (!(response.status !== "SUCCESS")) return [3 /*break*/, 4];
                                        if (!(response.status !== "RETRY STILL FORBIDDEN" &&
                                            dependencyInjectionParams.assertJsRuntimeEnv === "react-native")) return [3 /*break*/, 3];
                                        return [4 /*yield*/, dependencyInjectionParams.Credentials.remove()];
                                    case 2:
                                        _a.sent();
                                        _a.label = 3;
                                    case 3: return [2 /*return*/, response];
                                    case 4:
                                        if (!(params_.assertJsRuntimeEnv === "react-native")) return [3 /*break*/, 6];
                                        assert_1.assert(params_.assertJsRuntimeEnv === dependencyInjectionParams.assertJsRuntimeEnv);
                                        Credentials_1 = dependencyInjectionParams.Credentials, declaredPushNotificationToken_1 = dependencyInjectionParams.declaredPushNotificationToken;
                                        return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                                var previousCred, _a;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0: return [4 /*yield*/, Credentials_1.isPresent()];
                                                        case 1:
                                                            if (!(_b.sent())) return [3 /*break*/, 3];
                                                            return [4 /*yield*/, Credentials_1.get()];
                                                        case 2:
                                                            _a = _b.sent();
                                                            return [3 /*break*/, 4];
                                                        case 3:
                                                            _a = undefined;
                                                            _b.label = 4;
                                                        case 4:
                                                            previousCred = _a;
                                                            if (!!previousCred &&
                                                                previousCred.email === params_.email &&
                                                                previousCred.secret === params_.secret &&
                                                                previousCred.uaInstanceId === params_.uaInstanceId) {
                                                                return [2 /*return*/];
                                                            }
                                                            return [4 /*yield*/, Promise.all([
                                                                    Credentials_1.set({
                                                                        "email": params_.email,
                                                                        "secret": params_.secret,
                                                                        "uaInstanceId": params_.uaInstanceId
                                                                    }),
                                                                    declaredPushNotificationToken_1.remove()
                                                                ])];
                                                        case 5:
                                                            _b.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); })()];
                                    case 5:
                                        _a.sent();
                                        _a.label = 6;
                                    case 6: return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData.set({
                                            "connect_sid": response.connect_sid,
                                            "email": params_.email,
                                            "encryptedSymmetricKey": response.encryptedSymmetricKey,
                                            "uaInstanceId": (function () {
                                                switch (params_.assertJsRuntimeEnv) {
                                                    case "browser": return response.webUaInstanceId;
                                                    case "react-native": return params_.uaInstanceId;
                                                }
                                            })()
                                        })];
                                    case 7:
                                        _a.sent();
                                        return [2 /*return*/, { "status": response.status }];
                                }
                            });
                        });
                    };
                })(),
                "logoutUser": (function () {
                    var methodName = apiDeclaration.logoutUser.methodName;
                    return function (params_) {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, sendRequest({
                                            methodName: methodName,
                                            "params": undefined,
                                            "shouldThrowOnError": params_ === null || params_ === void 0 ? void 0 : params_.shouldThrowOnError
                                        })];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData.remove()];
                                    case 2:
                                        _a.sent();
                                        if (!(dependencyInjectionParams.assertJsRuntimeEnv === "react-native")) return [3 /*break*/, 4];
                                        return [4 /*yield*/, dependencyInjectionParams.Credentials.remove()];
                                    case 3:
                                        _a.sent();
                                        _a.label = 4;
                                    case 4: return [2 /*return*/];
                                }
                            });
                        });
                    };
                })()
            });
        },
        "isUserLoggedIn": (function () {
            var methodName = apiDeclaration.isUserLoggedIn.methodName;
            return function (params_) {
                return __awaiter(this, void 0, void 0, function () {
                    var isLoggedIn;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData.isPresent()];
                            case 1:
                                if (!(_a.sent())) {
                                    return [2 /*return*/, false];
                                }
                                return [4 /*yield*/, sendRequest({
                                        methodName: methodName,
                                        "params": undefined,
                                        "shouldThrowOnError": params_ === null || params_ === void 0 ? void 0 : params_.shouldThrowOnError
                                    })];
                            case 2:
                                isLoggedIn = _a.sent();
                                if (!!isLoggedIn) return [3 /*break*/, 4];
                                return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData.remove()];
                            case 3:
                                _a.sent();
                                _a.label = 4;
                            case 4: return [2 /*return*/, isLoggedIn];
                        }
                    });
                });
            };
        })(),
        "declareUa": (function () {
            var methodName = apiDeclaration.declareUa.methodName;
            return function (params_) {
                return __awaiter(this, void 0, void 0, function () {
                    var assertJsRuntimeEnv, shouldThrowOnError, params;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                assert_1.assert(params_.assertJsRuntimeEnv === env_1.env.jsRuntimeEnv);
                                assertJsRuntimeEnv = params_.assertJsRuntimeEnv, shouldThrowOnError = params_.shouldThrowOnError, params = __rest(params_, ["assertJsRuntimeEnv", "shouldThrowOnError"]);
                                return [4 /*yield*/, sendRequest({
                                        methodName: methodName,
                                        params: params,
                                        shouldThrowOnError: shouldThrowOnError
                                    })];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
        })(),
        /** Return true if email has account */
        "sendRenewPasswordEmail": (function () {
            var methodName = apiDeclaration.sendRenewPasswordEmail.methodName;
            return function (params_) {
                var shouldThrowOnError = params_.shouldThrowOnError, params = __rest(params_, ["shouldThrowOnError"]);
                return sendRequest({
                    methodName: methodName,
                    params: params,
                    shouldThrowOnError: shouldThrowOnError
                });
            };
        })(),
        "renewPassword": (function () {
            var methodName = apiDeclaration.renewPassword.methodName;
            return function (params_) {
                var shouldThrowOnError = params_.shouldThrowOnError, params = __rest(params_, ["shouldThrowOnError"]);
                return sendRequest({
                    methodName: methodName,
                    params: params,
                    shouldThrowOnError: shouldThrowOnError
                });
            };
        })(),
        "getCountryIso": (function () {
            var methodName = apiDeclaration.getCountryIso.methodName;
            return function (params_) {
                return sendRequest({
                    methodName: methodName,
                    "params": undefined,
                    "shouldThrowOnError": params_ === null || params_ === void 0 ? void 0 : params_.shouldThrowOnError
                });
            };
        })(),
        "getChangesRates": (function () {
            var methodName = apiDeclaration.getChangesRates.methodName;
            return function (params_) {
                return sendRequest({
                    methodName: methodName,
                    "params": undefined,
                    "shouldThrowOnError": params_ === null || params_ === void 0 ? void 0 : params_.shouldThrowOnError
                });
            };
        })(),
        "getSubscriptionInfos": (function () {
            var methodName = apiDeclaration.getSubscriptionInfos.methodName;
            return function (params_) {
                return sendRequest({
                    methodName: methodName,
                    "params": undefined,
                    "shouldThrowOnError": params_ === null || params_ === void 0 ? void 0 : params_.shouldThrowOnError
                });
            };
        })(),
        "subscribeOrUpdateSource": (function () {
            var methodName = apiDeclaration.subscribeOrUpdateSource.methodName;
            return function (params_) {
                return __awaiter(this, void 0, void 0, function () {
                    var sourceId, shouldThrowOnError;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                sourceId = params_.sourceId, shouldThrowOnError = params_.shouldThrowOnError;
                                return [4 /*yield*/, sendRequest({
                                        methodName: methodName,
                                        "params": { sourceId: sourceId },
                                        shouldThrowOnError: shouldThrowOnError
                                    })];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
        })(),
        "unsubscribe": (function () {
            var methodName = apiDeclaration.unsubscribe.methodName;
            return function (params_) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, sendRequest({
                                    methodName: methodName,
                                    "params": undefined,
                                    "shouldThrowOnError": params_ === null || params_ === void 0 ? void 0 : params_.shouldThrowOnError
                                })];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
        })(),
        "createStripeCheckoutSessionForShop": (function () {
            var methodName = apiDeclaration.createStripeCheckoutSessionForShop.methodName;
            return function (params_) {
                var cart = params_.cart, shippingFormData = params_.shippingFormData, currency = params_.currency, success_url = params_.success_url, cancel_url = params_.cancel_url, shouldThrowOnError = params_.shouldThrowOnError;
                return sendRequest({
                    methodName: methodName,
                    "params": {
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
                    },
                    shouldThrowOnError: shouldThrowOnError
                });
            };
        })(),
        "createStripeCheckoutSessionForSubscription": (function () {
            var methodName = apiDeclaration.createStripeCheckoutSessionForSubscription.methodName;
            return function (params_) {
                var shouldThrowOnError = params_.shouldThrowOnError, params = __rest(params_, ["shouldThrowOnError"]);
                return sendRequest({
                    methodName: methodName,
                    params: params,
                    shouldThrowOnError: shouldThrowOnError
                });
            };
        })(),
        "getOrders": (function () {
            var methodName = apiDeclaration.getOrders.methodName;
            return function (params_) {
                return sendRequest({
                    methodName: methodName,
                    "params": undefined,
                    "shouldThrowOnError": params_ === null || params_ === void 0 ? void 0 : params_.shouldThrowOnError
                });
            };
        })()
    };
}
exports.getWebApi = getWebApi;
(function (getWebApi) {
    getWebApi.hasBeenCalled = false;
})(getWebApi = exports.getWebApi || (exports.getWebApi = {}));

},{"../../tools/typeSafety/assert":105,"../../web_api_declaration":107,"../env":84,"./sendRequest":99,"evt":125}],99:[function(require,module,exports){
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
                    console.log("(webApi call) methodName: " + methodName, { params: params, resp: resp });
                    return [2 /*return*/, resp];
            }
        });
    });
}
exports.sendRequest = sendRequest;

},{"../../gateway/webApiPath":77,"../env":84,"../types/connectSidHttpHeaderName":97,"transfer-tools/dist/lib/JSON_CUSTOM":159}],100:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var evt_1 = require("evt");
/**
 * Assert bootstrap modal initialized on jQuery element.
 * bootbox already call .modal().
 * For custom modal .modal() need to be called first.
 *
 *
 * NOTE: For dialog remember to invoke removeFromDom once hidden.
 */
function createGenericProxyForBootstrapModal($initializedModalDiv) {
    var evtHide = evt_1.Evt.create();
    var evtShown = evt_1.Evt.create();
    var evtHidden = evt_1.Evt.create();
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

},{"evt":125}],101:[function(require,module,exports){
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

},{"../createGenericProxyForBootstrapModal":100}],102:[function(require,module,exports){
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

},{"../stack":104,"./getApi":101,"./types":103,"run-exclusive":157}],103:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],104:[function(require,module,exports){
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

},{}],105:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function assert(condition, msg) {
    if (!condition) {
        throw new Error(msg);
    }
}
exports.assert = assert;

},{}],106:[function(require,module,exports){
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

},{}],107:[function(require,module,exports){
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

},{}],108:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"../tools/typeSafety/assert":140,"../tools/typeSafety/defineAccessors":141,"../tools/typeSafety/overwriteReadonlyProp":147,"../tools/typeSafety/typeGuard":148,"./LazyEvt":121,"./importProxy":124,"dup":18,"minimal-polyfills/dist/lib/Set":155,"minimal-polyfills/dist/lib/WeakMap":156}],109:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],110:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],111:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./importProxy":124,"dup":21}],112:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],113:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"../tools/typeSafety/assert":140,"../tools/typeSafety/id":143,"../tools/typeSafety/typeGuard":148,"./Evt.merge":117,"./importProxy":124,"./types/EventTargetLike":126,"dup":23}],114:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"./importProxy":124,"dup":24,"minimal-polyfills/dist/lib/WeakMap":156}],115:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"../tools/Deferred":139,"../tools/typeSafety/defineAccessors":141,"../tools/typeSafety/overwriteReadonlyProp":147,"../tools/typeSafety/typeGuard":148,"./Evt.asNonPostable":109,"./Evt.asPostable":110,"./Evt.create":111,"./Evt.factorize":112,"./Evt.from":113,"./Evt.getCtx":114,"./Evt.loosenType":116,"./Evt.merge":117,"./Evt.newCtx":118,"./Evt.parsePropsFromArgs":119,"./Evt.useEffect":120,"./LazyEvt":121,"./importProxy":124,"./types/EvtError":127,"./types/Operator":128,"./types/interfaces/CtxLike":130,"./util/encapsulateOpState":133,"./util/invokeOperator":138,"dup":25,"minimal-polyfills/dist/lib/Array.prototype.find":152,"minimal-polyfills/dist/lib/Map":153,"minimal-polyfills/dist/lib/WeakMap":156,"run-exclusive":157}],116:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],117:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"./importProxy":124,"dup":27}],118:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"./importProxy":124,"dup":28}],119:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"../tools/typeSafety/id":143,"../tools/typeSafety/typeGuard":148,"./util/compose":132,"dup":29}],120:[function(require,module,exports){
"use strict";
exports.__esModule = true;
function useEffect(effect, evt, dataFirst) {
    var i = 0;
    ("state" in evt ? evt.evtChange : evt)
        .attach(function (data) {
        return effect(data, { "isFirst": false, data: data }, i++);
    });
    effect("state" in evt ? evt.state : dataFirst === null || dataFirst === void 0 ? void 0 : dataFirst[0], { "isFirst": true }, i++);
}
exports.useEffect = useEffect;

},{}],121:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"../tools/typeSafety/defineAccessors":141,"../tools/typeSafety/overwriteReadonlyProp":147,"./importProxy":124,"dup":31}],122:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var overwriteReadonlyProp_1 = require("../tools/typeSafety/overwriteReadonlyProp");
var importProxy_1 = require("./importProxy");
var defineAccessors_1 = require("../tools/typeSafety/defineAccessors");
var LazyStatefulEvt = /** @class */ (function () {
    function LazyStatefulEvt(initialState) {
        this.initialPostCount = 0;
        this.initialState = initialState;
    }
    LazyStatefulEvt.prototype.post = function (data) {
        if (this.__evt === undefined) {
            this.initialState = data;
            return ++this.initialPostCount;
        }
        return this.__evt.post(data);
    };
    LazyStatefulEvt.__1 = (function () {
        if (false) {
            LazyStatefulEvt.__1;
        }
        defineAccessors_1.defineAccessors(LazyStatefulEvt.prototype, "evt", {
            "get": function () {
                if (this.__evt === undefined) {
                    this.__evt = new importProxy_1.importProxy.StatefulEvt(this.initialState);
                    delete this.initialState;
                    overwriteReadonlyProp_1.overwriteReadonlyProp(this.__evt, "postCount", this.initialPostCount);
                }
                return this.__evt;
            }
        });
    })();
    return LazyStatefulEvt;
}());
exports.LazyStatefulEvt = LazyStatefulEvt;

},{"../tools/typeSafety/defineAccessors":141,"../tools/typeSafety/overwriteReadonlyProp":147,"./importProxy":124}],123:[function(require,module,exports){
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
require("minimal-polyfills/dist/lib/Object.is");
var defineAccessors_1 = require("../tools/typeSafety/defineAccessors");
var LazyEvt_1 = require("./LazyEvt");
var LazyStatefulEvt_1 = require("./LazyStatefulEvt");
var importProxy_1 = require("./importProxy");
var invokeOperator_1 = require("./util/invokeOperator");
var Operator_1 = require("./types/Operator");
var Evt_parsePropsFromArgs_1 = require("./Evt.parsePropsFromArgs");
var Evt_2 = require("./Evt");
var StatefulEvtImpl = /** @class */ (function (_super) {
    __extends(StatefulEvtImpl, _super);
    function StatefulEvtImpl(initialState) {
        var _this_1 = _super.call(this) || this;
        _this_1.lazyEvtDiff = new LazyEvt_1.LazyEvt();
        _this_1.lazyEvtChangeDiff = new LazyEvt_1.LazyEvt();
        _this_1.__state = initialState;
        _this_1.lazyEvtChange = new LazyStatefulEvt_1.LazyStatefulEvt(_this_1.__state);
        return _this_1;
    }
    StatefulEvtImpl.prototype.post = function (data) {
        return this.__post(data, false);
    };
    StatefulEvtImpl.prototype.postForceChange = function (wData) {
        return this.__post(!!wData ? wData[0] : this.state, true);
    };
    StatefulEvtImpl.prototype.__post = function (data, forceChange) {
        var prevState = this.state;
        this.__state = data;
        var diff = { prevState: prevState, "newState": this.state };
        this.lazyEvtDiff.post(diff);
        if (forceChange || !Object.is(prevState, this.state)) {
            this.lazyEvtChange.post(this.state);
            this.lazyEvtChangeDiff.post(diff);
        }
        return _super.prototype.post.call(this, data);
    };
    StatefulEvtImpl.prototype.pipe = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var evt = _super.prototype.pipe.apply(this, __spread(args));
        var opResult = invokeOperator_1.invokeOperator(this.getStatelessOp(Evt_parsePropsFromArgs_1.parsePropsFromArgs(args, "pipe").op), this.state);
        if (Operator_1.Operator.fλ.Result.NotMatched.match(opResult)) {
            throw new Error([
                "Cannot pipe StatefulEvt because the operator does not match",
                "it's current state.",
                "Use evt.toStateless([ctx]).pipe(op).toStatic(initialState)",
                "to be sure the StatefulEvt is correctly initialized"
            ].join(" "));
        }
        return evt.toStateful(opResult[0]);
    };
    /** Return a stateless copy */
    StatefulEvtImpl.prototype.toStateless = function (ctx) {
        return !!ctx ? _super.prototype.pipe.call(this, ctx) : _super.prototype.pipe.call(this);
    };
    StatefulEvtImpl.__4 = (function () {
        if (false) {
            StatefulEvtImpl.__4;
        }
        defineAccessors_1.defineAccessors(StatefulEvtImpl.prototype, "state", {
            "get": function () { return this.__state; },
            "set": function (state) { this.post(state); }
        });
        defineAccessors_1.defineAccessors(StatefulEvtImpl.prototype, "evtDiff", { "get": function () { return this.lazyEvtDiff.evt; } });
        defineAccessors_1.defineAccessors(StatefulEvtImpl.prototype, "evtChange", { "get": function () { return this.lazyEvtChange.evt; } });
        defineAccessors_1.defineAccessors(StatefulEvtImpl.prototype, "evtChangeDiff", { "get": function () { return this.lazyEvtChangeDiff.evt; } });
    })();
    return StatefulEvtImpl;
}(Evt_2.Evt));
exports.StatefulEvt = StatefulEvtImpl;
importProxy_1.importProxy.StatefulEvt = exports.StatefulEvt;

},{"../tools/typeSafety/defineAccessors":141,"./Evt":115,"./Evt.parsePropsFromArgs":119,"./LazyEvt":121,"./LazyStatefulEvt":122,"./importProxy":124,"./types/Operator":128,"./util/invokeOperator":138,"minimal-polyfills/dist/lib/Object.is":154}],124:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],125:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"../tools/typeSafety/matchVoid":145,"./Ctx":108,"./Evt":115,"./StatefulEvt":123,"./types":129,"./util":137,"dup":34}],126:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"../../tools/typeSafety":144,"dup":35}],127:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],128:[function(require,module,exports){
arguments[4][37][0].apply(exports,arguments)
},{"../../tools/typeSafety":144,"dup":37}],129:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"./EventTargetLike":126,"./EvtError":127,"./Operator":128,"./lib.dom":131,"dup":38}],130:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"../../../tools/typeSafety/typeGuard":148,"dup":39}],131:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],132:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"../../tools/typeSafety/assert":140,"../../tools/typeSafety/id":143,"../../tools/typeSafety/typeGuard":148,"../types/Operator":128,"./encapsulateOpState":133,"./invokeOperator":138,"dup":41}],133:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"../../tools/typeSafety/id":143,"../types/Operator":128,"dup":42}],134:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./throttleTime":135,"./to":136,"dup":43}],135:[function(require,module,exports){
arguments[4][44][0].apply(exports,arguments)
},{"../compose":132,"dup":44}],136:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],137:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"./compose":132,"./genericOperators":134,"./invokeOperator":138,"dup":46}],138:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"../types/Operator":128,"dup":47}],139:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"./typeSafety/overwriteReadonlyProp":147,"dup":48}],140:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],141:[function(require,module,exports){
arguments[4][50][0].apply(exports,arguments)
},{"dup":50}],142:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51}],143:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"dup":52}],144:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"./assert":140,"./exclude":142,"./id":143,"./matchVoid":145,"./objectKeys":146,"./typeGuard":148,"dup":53}],145:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"dup":54}],146:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],147:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],148:[function(require,module,exports){
arguments[4][57][0].apply(exports,arguments)
},{"dup":57}],149:[function(require,module,exports){
arguments[4][64][0].apply(exports,arguments)
},{"dup":64}],150:[function(require,module,exports){
arguments[4][65][0].apply(exports,arguments)
},{"./implementation":149,"dup":65}],151:[function(require,module,exports){
arguments[4][66][0].apply(exports,arguments)
},{"dup":66,"function-bind":150}],152:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"dup":58}],153:[function(require,module,exports){
arguments[4][59][0].apply(exports,arguments)
},{"dup":59}],154:[function(require,module,exports){
arguments[4][60][0].apply(exports,arguments)
},{"dup":60}],155:[function(require,module,exports){
arguments[4][61][0].apply(exports,arguments)
},{"./Map":153,"dup":61}],156:[function(require,module,exports){
arguments[4][62][0].apply(exports,arguments)
},{"./Map":153,"dup":62}],157:[function(require,module,exports){
arguments[4][63][0].apply(exports,arguments)
},{"dup":63,"minimal-polyfills/dist/lib/WeakMap":156}],158:[function(require,module,exports){
arguments[4][72][0].apply(exports,arguments)
},{"dup":72,"has":151}],159:[function(require,module,exports){
arguments[4][73][0].apply(exports,arguments)
},{"dup":73,"super-json":158}],160:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPath = "/api";
var version;
(function (version) {
    version.methodName = "version";
})(version = exports.version || (exports.version = {}));

},{}]},{},[74]);
