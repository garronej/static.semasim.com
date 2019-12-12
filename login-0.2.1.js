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
},{"../../sync/_worker_thread/ThreadMessage":13,"buffer":2,"path":4,"ts-events-extended":34}],8:[function(require,module,exports){
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

},{"./simulated/runTask":9,"ts-events-extended":34}],9:[function(require,module,exports){
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

},{"ts-events-extended":34}],11:[function(require,module,exports){
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
var bundle_source = (function () {
    
    var path = require("path");
    return Buffer("KGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9ImZ1bmN0aW9uIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoIkNhbm5vdCBmaW5kIG1vZHVsZSAnIitpKyInIik7dGhyb3cgYS5jb2RlPSJNT0RVTEVfTk9UX0ZPVU5EIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9ImZ1bmN0aW9uIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXsidXNlIHN0cmljdCI7T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIl9fZXNNb2R1bGUiLHt2YWx1ZTp0cnVlfSk7dmFyIGVudmlyb25uZW1lbnRfMT1yZXF1aXJlKCIuLi91dGlscy9lbnZpcm9ubmVtZW50Iik7dmFyIHRvQnVmZmVyXzE9cmVxdWlyZSgiLi4vdXRpbHMvdG9CdWZmZXIiKTt2YXIgdHJhbnNmZXI7KGZ1bmN0aW9uKHRyYW5zZmVyKXt2YXIgU2VyaWFsaXphYmxlVWludDhBcnJheTsoZnVuY3Rpb24oU2VyaWFsaXphYmxlVWludDhBcnJheSl7ZnVuY3Rpb24gbWF0Y2godmFsdWUpe3JldHVybiB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCYmdmFsdWUudHlwZT09PSJVaW50OEFycmF5IiYmdHlwZW9mIHZhbHVlLmRhdGE9PT0ic3RyaW5nIn1TZXJpYWxpemFibGVVaW50OEFycmF5Lm1hdGNoPW1hdGNoO2Z1bmN0aW9uIGJ1aWxkKHZhbHVlKXtyZXR1cm57dHlwZToiVWludDhBcnJheSIsZGF0YTp0b0J1ZmZlcl8xLnRvQnVmZmVyKHZhbHVlKS50b1N0cmluZygiYmluYXJ5Iil9fVNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkuYnVpbGQ9YnVpbGQ7ZnVuY3Rpb24gcmVzdG9yZSh2YWx1ZSl7cmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlLmRhdGEsImJpbmFyeSIpfVNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkucmVzdG9yZT1yZXN0b3JlfSkoU2VyaWFsaXphYmxlVWludDhBcnJheXx8KFNlcmlhbGl6YWJsZVVpbnQ4QXJyYXk9e30pKTtmdW5jdGlvbiBwcmVwYXJlKHRocmVhZE1lc3NhZ2Upe2lmKGVudmlyb25uZW1lbnRfMS5lbnZpcm9ubmVtZW50LnR5cGUhPT0iTk9ERSIpe3Rocm93IG5ldyBFcnJvcigib25seSBmb3Igbm9kZSIpfXZhciBtZXNzYWdlPWZ1bmN0aW9uKCl7aWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpe3JldHVybiBTZXJpYWxpemFibGVVaW50OEFycmF5LmJ1aWxkKHRocmVhZE1lc3NhZ2UpfWVsc2UgaWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIEFycmF5KXtyZXR1cm4gdGhyZWFkTWVzc2FnZS5tYXAoZnVuY3Rpb24oZW50cnkpe3JldHVybiBwcmVwYXJlKGVudHJ5KX0pfWVsc2UgaWYodGhyZWFkTWVzc2FnZSBpbnN0YW5jZW9mIE9iamVjdCl7dmFyIG91dD17fTtmb3IodmFyIGtleSBpbiB0aHJlYWRNZXNzYWdlKXtvdXRba2V5XT1wcmVwYXJlKHRocmVhZE1lc3NhZ2Vba2V5XSl9cmV0dXJuIG91dH1lbHNle3JldHVybiB0aHJlYWRNZXNzYWdlfX0oKTtyZXR1cm4gbWVzc2FnZX10cmFuc2Zlci5wcmVwYXJlPXByZXBhcmU7ZnVuY3Rpb24gcmVzdG9yZShtZXNzYWdlKXtpZihlbnZpcm9ubmVtZW50XzEuZW52aXJvbm5lbWVudC50eXBlIT09Ik5PREUiKXt0aHJvdyBuZXcgRXJyb3IoIm9ubHkgZm9yIG5vZGUiKX12YXIgdGhyZWFkTWVzc2FnZT1mdW5jdGlvbigpe2lmKFNlcmlhbGl6YWJsZVVpbnQ4QXJyYXkubWF0Y2gobWVzc2FnZSkpe3JldHVybiBTZXJpYWxpemFibGVVaW50OEFycmF5LnJlc3RvcmUobWVzc2FnZSl9ZWxzZSBpZihtZXNzYWdlIGluc3RhbmNlb2YgQXJyYXkpe3JldHVybiBtZXNzYWdlLm1hcChmdW5jdGlvbihlbnRyeSl7cmV0dXJuIHJlc3RvcmUoZW50cnkpfSl9ZWxzZSBpZihtZXNzYWdlIGluc3RhbmNlb2YgT2JqZWN0KXt2YXIgb3V0PXt9O2Zvcih2YXIga2V5IGluIG1lc3NhZ2Upe291dFtrZXldPXJlc3RvcmUobWVzc2FnZVtrZXldKX1yZXR1cm4gb3V0fWVsc2V7cmV0dXJuIG1lc3NhZ2V9fSgpO3JldHVybiB0aHJlYWRNZXNzYWdlfXRyYW5zZmVyLnJlc3RvcmU9cmVzdG9yZX0pKHRyYW5zZmVyPWV4cG9ydHMudHJhbnNmZXJ8fChleHBvcnRzLnRyYW5zZmVyPXt9KSl9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi91dGlscy9lbnZpcm9ubmVtZW50IjoxMCwiLi4vdXRpbHMvdG9CdWZmZXIiOjEyLGJ1ZmZlcjoyN31dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgX19zcHJlYWRBcnJheXM9dGhpcyYmdGhpcy5fX3NwcmVhZEFycmF5c3x8ZnVuY3Rpb24oKXtmb3IodmFyIHM9MCxpPTAsaWw9YXJndW1lbnRzLmxlbmd0aDtpPGlsO2krKylzKz1hcmd1bWVudHNbaV0ubGVuZ3RoO2Zvcih2YXIgcj1BcnJheShzKSxrPTAsaT0wO2k8aWw7aSsrKWZvcih2YXIgYT1hcmd1bWVudHNbaV0saj0wLGpsPWEubGVuZ3RoO2o8amw7aisrLGsrKylyW2tdPWFbal07cmV0dXJuIHJ9O09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3JlcXVpcmUoIm1pbmltYWwtcG9seWZpbGxzL2Rpc3QvbGliL0FycmF5QnVmZmVyLmlzVmlldyIpO3ZhciBNYXBfMT1yZXF1aXJlKCJtaW5pbWFsLXBvbHlmaWxscy9kaXN0L2xpYi9NYXAiKTt2YXIgY3J5cHRvTGliPXJlcXVpcmUoIi4uL2luZGV4Iik7dmFyIGVudmlyb25uZW1lbnRfMT1yZXF1aXJlKCIuLi91dGlscy9lbnZpcm9ubmVtZW50Iik7dmFyIFRocmVhZE1lc3NhZ2VfMT1yZXF1aXJlKCIuL1RocmVhZE1lc3NhZ2UiKTtpZihmdW5jdGlvbigpe2lmKHR5cGVvZiBfX3NpbXVsYXRlZE1haW5UaHJlYWRBcGkhPT0idW5kZWZpbmVkIil7cmV0dXJuIGZhbHNlfXZhciBpc01haW5UaGVhZD1lbnZpcm9ubmVtZW50XzEuZW52aXJvbm5lbWVudC5pc01haW5UaHJlYWQhPT11bmRlZmluZWQ/ZW52aXJvbm5lbWVudF8xLmVudmlyb25uZW1lbnQuaXNNYWluVGhyZWFkOnR5cGVvZiBfX3Byb2Nlc3Nfbm9kZT09PSJ1bmRlZmluZWQiO3JldHVybiBpc01haW5UaGVhZH0oKSl7X19jcnlwdG9MaWI9Y3J5cHRvTGlifWVsc2V7dmFyIG1haW5UaHJlYWRBcGlfMT10eXBlb2YgX19zaW11bGF0ZWRNYWluVGhyZWFkQXBpIT09InVuZGVmaW5lZCI/X19zaW11bGF0ZWRNYWluVGhyZWFkQXBpOnR5cGVvZiBfX3Byb2Nlc3Nfbm9kZT09PSJ1bmRlZmluZWQiP3tzZW5kUmVzcG9uc2U6c2VsZi5wb3N0TWVzc2FnZS5iaW5kKHNlbGYpLHNldEFjdGlvbkxpc3RlbmVyOmZ1bmN0aW9uKGFjdGlvbkxpc3RlbmVyKXtyZXR1cm4gYWRkRXZlbnRMaXN0ZW5lcigibWVzc2FnZSIsZnVuY3Rpb24oX2Epe3ZhciBkYXRhPV9hLmRhdGE7cmV0dXJuIGFjdGlvbkxpc3RlbmVyKGRhdGEpfSl9fTp7c2VuZFJlc3BvbnNlOmZ1bmN0aW9uKHJlc3BvbnNlKXtyZXR1cm4gX19wcm9jZXNzX25vZGUuc2VuZChUaHJlYWRNZXNzYWdlXzEudHJhbnNmZXIucHJlcGFyZShyZXNwb25zZSkpfSxzZXRBY3Rpb25MaXN0ZW5lcjpmdW5jdGlvbihhY3Rpb25MaXN0ZW5lcil7cmV0dXJuIF9fcHJvY2Vzc19ub2RlLm9uKCJtZXNzYWdlIixmdW5jdGlvbihtZXNzYWdlKXtyZXR1cm4gYWN0aW9uTGlzdGVuZXIoVGhyZWFkTWVzc2FnZV8xLnRyYW5zZmVyLnJlc3RvcmUobWVzc2FnZSkpfSl9fTt2YXIgY2lwaGVySW5zdGFuY2VzXzE9bmV3IE1hcF8xLlBvbHlmaWxsO21haW5UaHJlYWRBcGlfMS5zZXRBY3Rpb25MaXN0ZW5lcihmdW5jdGlvbihhY3Rpb24pe3ZhciBfYSxfYjtzd2l0Y2goYWN0aW9uLmFjdGlvbil7Y2FzZSJHZW5lcmF0ZVJzYUtleXMiOm1haW5UaHJlYWRBcGlfMS5zZW5kUmVzcG9uc2UoZnVuY3Rpb24oKXt2YXIgX2E7dmFyIHJlc3BvbnNlPXthY3Rpb25JZDphY3Rpb24uYWN0aW9uSWQsb3V0cHV0czooX2E9Y3J5cHRvTGliLnJzYSkuc3luY0dlbmVyYXRlS2V5cy5hcHBseShfYSxhY3Rpb24ucGFyYW1zKX07cmV0dXJuIHJlc3BvbnNlfSgpKTticmVhaztjYXNlIkNpcGhlckZhY3RvcnkiOmNpcGhlckluc3RhbmNlc18xLnNldChhY3Rpb24uY2lwaGVySW5zdGFuY2VSZWYsKF9hPWNyeXB0b0xpYlthY3Rpb24uY2lwaGVyTmFtZV0pW2Z1bmN0aW9uKCl7c3dpdGNoKGFjdGlvbi5jb21wb25lbnRzKXtjYXNlIkRlY3J5cHRvciI6cmV0dXJuInN5bmNEZWNyeXB0b3JGYWN0b3J5IjtjYXNlIkVuY3J5cHRvciI6cmV0dXJuInN5bmNFbmNyeXB0b3JGYWN0b3J5IjtjYXNlIkVuY3J5cHRvckRlY3J5cHRvciI6cmV0dXJuInN5bmNFbmNyeXB0b3JEZWNyeXB0b3JGYWN0b3J5In19KCldLmFwcGx5KF9hLGFjdGlvbi5wYXJhbXMpKTticmVhaztjYXNlIkVuY3J5cHRPckRlY3J5cHQiOnt2YXIgb3V0cHV0XzE9Y2lwaGVySW5zdGFuY2VzXzEuZ2V0KGFjdGlvbi5jaXBoZXJJbnN0YW5jZVJlZilbYWN0aW9uLm1ldGhvZF0oYWN0aW9uLmlucHV0KTttYWluVGhyZWFkQXBpXzEuc2VuZFJlc3BvbnNlKGZ1bmN0aW9uKCl7dmFyIHJlc3BvbnNlPXthY3Rpb25JZDphY3Rpb24uYWN0aW9uSWQsb3V0cHV0Om91dHB1dF8xfTtyZXR1cm4gcmVzcG9uc2V9KCksW291dHB1dF8xLmJ1ZmZlcl0pfWJyZWFrO2Nhc2UiU2NyeXB0SGFzaCI6e3ZhciBkaWdlc3RfMT0oX2I9Y3J5cHRvTGliLnNjcnlwdCkuc3luY0hhc2guYXBwbHkoX2IsX19zcHJlYWRBcnJheXMoYWN0aW9uLnBhcmFtcyxbZnVuY3Rpb24ocGVyY2VudCl7cmV0dXJuIG1haW5UaHJlYWRBcGlfMS5zZW5kUmVzcG9uc2UoZnVuY3Rpb24oKXt2YXIgcmVzcG9uc2U9e2FjdGlvbklkOmFjdGlvbi5hY3Rpb25JZCxwZXJjZW50OnBlcmNlbnR9O3JldHVybiByZXNwb25zZX0oKSl9XSkpO21haW5UaHJlYWRBcGlfMS5zZW5kUmVzcG9uc2UoZnVuY3Rpb24oKXt2YXIgcmVzcG9uc2U9e2FjdGlvbklkOmFjdGlvbi5hY3Rpb25JZCxkaWdlc3Q6ZGlnZXN0XzF9O3JldHVybiByZXNwb25zZX0oKSxbZGlnZXN0XzEuYnVmZmVyXSl9YnJlYWt9fSl9fSx7Ii4uL2luZGV4Ijo2LCIuLi91dGlscy9lbnZpcm9ubmVtZW50IjoxMCwiLi9UaHJlYWRNZXNzYWdlIjoxLCJtaW5pbWFsLXBvbHlmaWxscy9kaXN0L2xpYi9BcnJheUJ1ZmZlci5pc1ZpZXciOjQwLCJtaW5pbWFsLXBvbHlmaWxscy9kaXN0L2xpYi9NYXAiOjQxfV0sMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3ZhciBhZXNqcz1yZXF1aXJlKCJhZXMtanMiKTt2YXIgcmFuZG9tQnl0ZXNfMT1yZXF1aXJlKCIuLi91dGlscy9yYW5kb21CeXRlcyIpO3ZhciBiaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xPXJlcXVpcmUoIi4uL3V0aWxzL2JpbmFyeURhdGFNYW5pcHVsYXRpb25zIik7ZnVuY3Rpb24gc3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnkoa2V5KXtyZXR1cm57ZW5jcnlwdDpmdW5jdGlvbigpe3ZhciBnZXRJdj1mdW5jdGlvbigpe3ZhciBpdjA9cmFuZG9tQnl0ZXNfMS5yYW5kb21CeXRlcygxNik7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIGJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzEubGVmdFNoaWZ0KGl2MCl9fSgpO3JldHVybiBmdW5jdGlvbihwbGFpbkRhdGEpe3ZhciBpdj1nZXRJdigpO3ZhciBvcmlnaW5hbExlbmd0aEFzQnl0ZT1iaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xLmFkZFBhZGRpbmcoIkxFRlQiLGJpbmFyeURhdGFNYW5pcHVsYXRpb25zXzEubnVtYmVyVG9VaW50OEFycmF5KHBsYWluRGF0YS5sZW5ndGgpLDQpO3ZhciBwbGFpbkRhdGFNdWx0aXBsZU9mMTZCeXRlcz1iaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xLmFkZFBhZGRpbmcoIlJJR0hUIixwbGFpbkRhdGEscGxhaW5EYXRhLmxlbmd0aCsoMTYtcGxhaW5EYXRhLmxlbmd0aCUxNikpO3ZhciBlbmNyeXB0ZWREYXRhUGF5bG9hZD1uZXcgYWVzanMuTW9kZU9mT3BlcmF0aW9uLmNiYyhrZXksaXYpLmVuY3J5cHQocGxhaW5EYXRhTXVsdGlwbGVPZjE2Qnl0ZXMpO3JldHVybiBiaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xLmNvbmNhdFVpbnQ4QXJyYXkoaXYsb3JpZ2luYWxMZW5ndGhBc0J5dGUsZW5jcnlwdGVkRGF0YVBheWxvYWQpfX0oKSxkZWNyeXB0OmZ1bmN0aW9uKGVuY3J5cHRlZERhdGEpe3ZhciBpdj1lbmNyeXB0ZWREYXRhLnNsaWNlKDAsMTYpO3ZhciBvcmlnaW5hbExlbmd0aEFzQnl0ZT1lbmNyeXB0ZWREYXRhLnNsaWNlKDE2LDE2KzQpO3ZhciBvcmlnaW5hbExlbmd0aD1iaW5hcnlEYXRhTWFuaXB1bGF0aW9uc18xLnVpbnQ4QXJyYXlUb051bWJlcihvcmlnaW5hbExlbmd0aEFzQnl0ZSk7cmV0dXJuIG5ldyBhZXNqcy5Nb2RlT2ZPcGVyYXRpb24uY2JjKGtleSxpdikuZGVjcnlwdChlbmNyeXB0ZWREYXRhLnNsaWNlKDE2KzQpKS5zbGljZSgwLG9yaWdpbmFsTGVuZ3RoKX19fWV4cG9ydHMuc3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk9c3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk7ZnVuY3Rpb24gZ2VuZXJhdGVLZXkoKXtyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSxyZWplY3Qpe3JldHVybiByYW5kb21CeXRlc18xLnJhbmRvbUJ5dGVzKDMyLGZ1bmN0aW9uKGVycixidWYpe2lmKCEhZXJyKXtyZWplY3QoZXJyKX1lbHNle3Jlc29sdmUoYnVmKX19KX0pfWV4cG9ydHMuZ2VuZXJhdGVLZXk9Z2VuZXJhdGVLZXk7ZnVuY3Rpb24gZ2V0VGVzdEtleSgpe3JldHVybiBQcm9taXNlLnJlc29sdmUobmV3IFVpbnQ4QXJyYXkoWzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjUsMjYsMjcsMjgsMjksMzAsMzFdKSl9ZXhwb3J0cy5nZXRUZXN0S2V5PWdldFRlc3RLZXl9LHsiLi4vdXRpbHMvYmluYXJ5RGF0YU1hbmlwdWxhdGlvbnMiOjksIi4uL3V0aWxzL3JhbmRvbUJ5dGVzIjoxMSwiYWVzLWpzIjoxM31dLDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTtmdW5jdGlvbiBzeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeSgpe3JldHVybntlbmNyeXB0OmZ1bmN0aW9uKHBsYWluRGF0YSl7cmV0dXJuIHBsYWluRGF0YX0sZGVjcnlwdDpmdW5jdGlvbihlbmNyeXB0ZWREYXRhKXtyZXR1cm4gZW5jcnlwdGVkRGF0YX19fWV4cG9ydHMuc3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk9c3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnl9LHt9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXsidXNlIHN0cmljdCI7dmFyIF9fYXNzaWduPXRoaXMmJnRoaXMuX19hc3NpZ258fGZ1bmN0aW9uKCl7X19hc3NpZ249T2JqZWN0LmFzc2lnbnx8ZnVuY3Rpb24odCl7Zm9yKHZhciBzLGk9MSxuPWFyZ3VtZW50cy5sZW5ndGg7aTxuO2krKyl7cz1hcmd1bWVudHNbaV07Zm9yKHZhciBwIGluIHMpaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMscCkpdFtwXT1zW3BdfXJldHVybiB0fTtyZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcyxhcmd1bWVudHMpfTtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTt2YXIgdHlwZXNfMT1yZXF1aXJlKCIuLi90eXBlcyIpO3ZhciBOb2RlUlNBPXJlcXVpcmUoIm5vZGUtcnNhIik7dmFyIGVudmlyb25uZW1lbnRfMT1yZXF1aXJlKCIuLi91dGlscy9lbnZpcm9ubmVtZW50Iik7dmFyIHRvQnVmZmVyXzE9cmVxdWlyZSgiLi4vdXRpbHMvdG9CdWZmZXIiKTt2YXIgdGFyZ2V0ZWRFbnZpcm9ubmVtZW50PWVudmlyb25uZW1lbnRfMS5lbnZpcm9ubmVtZW50LnR5cGU9PT0iTk9ERSI/Im5vZGUiOiJicm93c2VyIjt2YXIgbmV3Tm9kZVJTQT1mdW5jdGlvbihrZXkpe3JldHVybiBuZXcgTm9kZVJTQShCdWZmZXIuZnJvbShrZXkuZGF0YSksa2V5LmZvcm1hdCx7ZW52aXJvbm1lbnQ6dGFyZ2V0ZWRFbnZpcm9ubmVtZW50fSl9O2Z1bmN0aW9uIHN5bmNFbmNyeXB0b3JGYWN0b3J5KGVuY3J5cHRLZXkpe3JldHVybntlbmNyeXB0OmZ1bmN0aW9uKCl7dmFyIGVuY3J5cHROb2RlUlNBPW5ld05vZGVSU0EoZW5jcnlwdEtleSk7dmFyIGVuY3J5cHRNZXRob2Q9dHlwZXNfMS5Sc2FLZXkuUHJpdmF0ZS5tYXRjaChlbmNyeXB0S2V5KT8iZW5jcnlwdFByaXZhdGUiOiJlbmNyeXB0IjtyZXR1cm4gZnVuY3Rpb24ocGxhaW5EYXRhKXtyZXR1cm4gZW5jcnlwdE5vZGVSU0FbZW5jcnlwdE1ldGhvZF0odG9CdWZmZXJfMS50b0J1ZmZlcihwbGFpbkRhdGEpKX19KCl9fWV4cG9ydHMuc3luY0VuY3J5cHRvckZhY3Rvcnk9c3luY0VuY3J5cHRvckZhY3Rvcnk7ZnVuY3Rpb24gc3luY0RlY3J5cHRvckZhY3RvcnkoZGVjcnlwdEtleSl7cmV0dXJue2RlY3J5cHQ6ZnVuY3Rpb24oKXt2YXIgZGVjcnlwdE5vZGVSU0E9bmV3Tm9kZVJTQShkZWNyeXB0S2V5KTt2YXIgZGVjcnlwdE1ldGhvZD10eXBlc18xLlJzYUtleS5QdWJsaWMubWF0Y2goZGVjcnlwdEtleSk/ImRlY3J5cHRQdWJsaWMiOiJkZWNyeXB0IjtyZXR1cm4gZnVuY3Rpb24oZW5jcnlwdGVkRGF0YSl7cmV0dXJuIGRlY3J5cHROb2RlUlNBW2RlY3J5cHRNZXRob2RdKHRvQnVmZmVyXzEudG9CdWZmZXIoZW5jcnlwdGVkRGF0YSkpfX0oKX19ZXhwb3J0cy5zeW5jRGVjcnlwdG9yRmFjdG9yeT1zeW5jRGVjcnlwdG9yRmFjdG9yeTtmdW5jdGlvbiBzeW5jRW5jcnlwdG9yRGVjcnlwdG9yRmFjdG9yeShlbmNyeXB0S2V5LGRlY3J5cHRLZXkpe3JldHVybiBfX2Fzc2lnbihfX2Fzc2lnbih7fSxzeW5jRW5jcnlwdG9yRmFjdG9yeShlbmNyeXB0S2V5KSksc3luY0RlY3J5cHRvckZhY3RvcnkoZGVjcnlwdEtleSkpfWV4cG9ydHMuc3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk9c3luY0VuY3J5cHRvckRlY3J5cHRvckZhY3Rvcnk7ZnVuY3Rpb24gc3luY0dlbmVyYXRlS2V5cyhzZWVkLGtleXNMZW5ndGhCeXRlcyl7aWYoa2V5c0xlbmd0aEJ5dGVzPT09dm9pZCAwKXtrZXlzTGVuZ3RoQnl0ZXM9ODB9dmFyIG5vZGVSU0E9Tm9kZVJTQS5nZW5lcmF0ZUtleVBhaXJGcm9tU2VlZChzZWVkLDgqa2V5c0xlbmd0aEJ5dGVzLHVuZGVmaW5lZCx0YXJnZXRlZEVudmlyb25uZW1lbnQpO2Z1bmN0aW9uIGJ1aWxkS2V5KGZvcm1hdCl7cmV0dXJue2Zvcm1hdDpmb3JtYXQsZGF0YTpub2RlUlNBLmV4cG9ydEtleShmb3JtYXQpfX1yZXR1cm57cHVibGljS2V5OmJ1aWxkS2V5KCJwa2NzMS1wdWJsaWMtZGVyIikscHJpdmF0ZUtleTpidWlsZEtleSgicGtjczEtcHJpdmF0ZS1kZXIiKX19ZXhwb3J0cy5zeW5jR2VuZXJhdGVLZXlzPXN5bmNHZW5lcmF0ZUtleXN9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi90eXBlcyI6OCwiLi4vdXRpbHMvZW52aXJvbm5lbWVudCI6MTAsIi4uL3V0aWxzL3RvQnVmZmVyIjoxMixidWZmZXI6MjcsIm5vZGUtcnNhIjo0Mn1dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0IjtmdW5jdGlvbiBfX2V4cG9ydChtKXtmb3IodmFyIHAgaW4gbSlpZighZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSlleHBvcnRzW3BdPW1bcF19T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIl9fZXNNb2R1bGUiLHt2YWx1ZTp0cnVlfSk7X19leHBvcnQocmVxdWlyZSgiLi90eXBlcyIpKTt2YXIgc2NyeXB0PXJlcXVpcmUoIi4vc2NyeXB0Iik7ZXhwb3J0cy5zY3J5cHQ9c2NyeXB0O3ZhciBhZXM9cmVxdWlyZSgiLi9jaXBoZXIvYWVzIik7ZXhwb3J0cy5hZXM9YWVzO3ZhciByc2E9cmVxdWlyZSgiLi9jaXBoZXIvcnNhIik7ZXhwb3J0cy5yc2E9cnNhO3ZhciBwbGFpbj1yZXF1aXJlKCIuL2NpcGhlci9wbGFpbiIpO2V4cG9ydHMucGxhaW49cGxhaW59LHsiLi9jaXBoZXIvYWVzIjozLCIuL2NpcGhlci9wbGFpbiI6NCwiLi9jaXBoZXIvcnNhIjo1LCIuL3NjcnlwdCI6NywiLi90eXBlcyI6OH1dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijt2YXIgX19hc3NpZ249dGhpcyYmdGhpcy5fX2Fzc2lnbnx8ZnVuY3Rpb24oKXtfX2Fzc2lnbj1PYmplY3QuYXNzaWdufHxmdW5jdGlvbih0KXtmb3IodmFyIHMsaT0xLG49YXJndW1lbnRzLmxlbmd0aDtpPG47aSsrKXtzPWFyZ3VtZW50c1tpXTtmb3IodmFyIHAgaW4gcylpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocyxwKSl0W3BdPXNbcF19cmV0dXJuIHR9O3JldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9O09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3ZhciBzY3J5cHRzeT1yZXF1aXJlKCJzY3J5cHRzeSIpO2V4cG9ydHMuZGVmYXVsdFBhcmFtcz17bjoxMyxyOjgscDoxLGRpZ2VzdExlbmd0aEJ5dGVzOjI1NH07ZnVuY3Rpb24gc3luY0hhc2godGV4dCxzYWx0LHBhcmFtcyxwcm9ncmVzcyl7aWYocGFyYW1zPT09dm9pZCAwKXtwYXJhbXM9e319dmFyIF9hPWZ1bmN0aW9uKCl7dmFyIG91dD1fX2Fzc2lnbih7fSxleHBvcnRzLmRlZmF1bHRQYXJhbXMpO09iamVjdC5rZXlzKHBhcmFtcykuZmlsdGVyKGZ1bmN0aW9uKGtleSl7cmV0dXJuIHBhcmFtc1trZXldIT09dW5kZWZpbmVkfSkuZm9yRWFjaChmdW5jdGlvbihrZXkpe3JldHVybiBvdXRba2V5XT1wYXJhbXNba2V5XX0pO3JldHVybiBvdXR9KCksbj1fYS5uLHI9X2EucixwPV9hLnAsZGlnZXN0TGVuZ3RoQnl0ZXM9X2EuZGlnZXN0TGVuZ3RoQnl0ZXM7cmV0dXJuIHNjcnlwdHN5KHRleHQsc2FsdCxNYXRoLnBvdygyLG4pLHIscCxkaWdlc3RMZW5ndGhCeXRlcyxwcm9ncmVzcyE9PXVuZGVmaW5lZD9mdW5jdGlvbihfYSl7dmFyIHBlcmNlbnQ9X2EucGVyY2VudDtyZXR1cm4gcHJvZ3Jlc3MocGVyY2VudCl9OnVuZGVmaW5lZCl9ZXhwb3J0cy5zeW5jSGFzaD1zeW5jSGFzaH0se3NjcnlwdHN5Ojg1fV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7InVzZSBzdHJpY3QiO09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO3ZhciB0b0J1ZmZlcl8xPXJlcXVpcmUoIi4vdXRpbHMvdG9CdWZmZXIiKTt2YXIgUnNhS2V5OyhmdW5jdGlvbihSc2FLZXkpe2Z1bmN0aW9uIHN0cmluZ2lmeShyc2FLZXkpe3JldHVybiBKU09OLnN0cmluZ2lmeShbcnNhS2V5LmZvcm1hdCx0b0J1ZmZlcl8xLnRvQnVmZmVyKHJzYUtleS5kYXRhKS50b1N0cmluZygiYmFzZTY0IildKX1Sc2FLZXkuc3RyaW5naWZ5PXN0cmluZ2lmeTtmdW5jdGlvbiBwYXJzZShzdHJpbmdpZmllZFJzYUtleSl7dmFyIF9hPUpTT04ucGFyc2Uoc3RyaW5naWZpZWRSc2FLZXkpLGZvcm1hdD1fYVswXSxzdHJEYXRhPV9hWzFdO3JldHVybntmb3JtYXQ6Zm9ybWF0LGRhdGE6bmV3IFVpbnQ4QXJyYXkoQnVmZmVyLmZyb20oc3RyRGF0YSwiYmFzZTY0IikpfX1Sc2FLZXkucGFyc2U9cGFyc2U7dmFyIFB1YmxpYzsoZnVuY3Rpb24oUHVibGljKXtmdW5jdGlvbiBtYXRjaChyc2FLZXkpe3JldHVybiByc2FLZXkuZm9ybWF0PT09InBrY3MxLXB1YmxpYy1kZXIifVB1YmxpYy5tYXRjaD1tYXRjaH0pKFB1YmxpYz1Sc2FLZXkuUHVibGljfHwoUnNhS2V5LlB1YmxpYz17fSkpO3ZhciBQcml2YXRlOyhmdW5jdGlvbihQcml2YXRlKXtmdW5jdGlvbiBtYXRjaChyc2FLZXkpe3JldHVybiByc2FLZXkuZm9ybWF0PT09InBrY3MxLXByaXZhdGUtZGVyIn1Qcml2YXRlLm1hdGNoPW1hdGNofSkoUHJpdmF0ZT1Sc2FLZXkuUHJpdmF0ZXx8KFJzYUtleS5Qcml2YXRlPXt9KSl9KShSc2FLZXk9ZXhwb3J0cy5Sc2FLZXl8fChleHBvcnRzLlJzYUtleT17fSkpfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi91dGlscy90b0J1ZmZlciI6MTIsYnVmZmVyOjI3fV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBfX3NwcmVhZEFycmF5cz10aGlzJiZ0aGlzLl9fc3ByZWFkQXJyYXlzfHxmdW5jdGlvbigpe2Zvcih2YXIgcz0wLGk9MCxpbD1hcmd1bWVudHMubGVuZ3RoO2k8aWw7aSsrKXMrPWFyZ3VtZW50c1tpXS5sZW5ndGg7Zm9yKHZhciByPUFycmF5KHMpLGs9MCxpPTA7aTxpbDtpKyspZm9yKHZhciBhPWFyZ3VtZW50c1tpXSxqPTAsamw9YS5sZW5ndGg7ajxqbDtqKyssaysrKXJba109YVtqXTtyZXR1cm4gcn07T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIl9fZXNNb2R1bGUiLHt2YWx1ZTp0cnVlfSk7ZnVuY3Rpb24gY29uY2F0VWludDhBcnJheSgpe3ZhciB1aW50OEFycmF5cz1bXTtmb3IodmFyIF9pPTA7X2k8YXJndW1lbnRzLmxlbmd0aDtfaSsrKXt1aW50OEFycmF5c1tfaV09YXJndW1lbnRzW19pXX12YXIgb3V0PW5ldyBVaW50OEFycmF5KHVpbnQ4QXJyYXlzLm1hcChmdW5jdGlvbihfYSl7dmFyIGxlbmd0aD1fYS5sZW5ndGg7cmV0dXJuIGxlbmd0aH0pLnJlZHVjZShmdW5jdGlvbihwcmV2LGN1cnIpe3JldHVybiBwcmV2K2N1cnJ9LDApKTt2YXIgb2Zmc2V0PTA7Zm9yKHZhciBpPTA7aTx1aW50OEFycmF5cy5sZW5ndGg7aSsrKXt2YXIgdWludDhBcnJheT11aW50OEFycmF5c1tpXTtvdXQuc2V0KHVpbnQ4QXJyYXksb2Zmc2V0KTtvZmZzZXQrPXVpbnQ4QXJyYXkubGVuZ3RofXJldHVybiBvdXR9ZXhwb3J0cy5jb25jYXRVaW50OEFycmF5PWNvbmNhdFVpbnQ4QXJyYXk7ZnVuY3Rpb24gYWRkUGFkZGluZyhwb3NpdGlvbix1aW50OEFycmF5LHRhcmdldExlbmd0aEJ5dGVzKXt2YXIgcGFkZGluZ0J5dGVzPW5ldyBVaW50OEFycmF5KHRhcmdldExlbmd0aEJ5dGVzLXVpbnQ4QXJyYXkubGVuZ3RoKTtmb3IodmFyIGk9MDtpPHBhZGRpbmdCeXRlcy5sZW5ndGg7aSsrKXtwYWRkaW5nQnl0ZXNbaV09MH1yZXR1cm4gY29uY2F0VWludDhBcnJheS5hcHBseSh2b2lkIDAsZnVuY3Rpb24oKXtzd2l0Y2gocG9zaXRpb24pe2Nhc2UiTEVGVCI6cmV0dXJuW3BhZGRpbmdCeXRlcyx1aW50OEFycmF5XTtjYXNlIlJJR0hUIjpyZXR1cm5bdWludDhBcnJheSxwYWRkaW5nQnl0ZXNdfX0oKSl9ZXhwb3J0cy5hZGRQYWRkaW5nPWFkZFBhZGRpbmc7ZnVuY3Rpb24gbnVtYmVyVG9VaW50OEFycmF5KG4pe3ZhciBzdHI9bi50b1N0cmluZygxNik7dmFyIGFycj1bXTt2YXIgY3Vycj0iIjtmb3IodmFyIGk9c3RyLmxlbmd0aC0xO2k+PTA7aS0tKXtjdXJyPXN0cltpXStjdXJyO2lmKGN1cnIubGVuZ3RoPT09Mnx8aT09PTApe2Fycj1fX3NwcmVhZEFycmF5cyhbcGFyc2VJbnQoY3VyciwxNildLGFycik7Y3Vycj0iIn19cmV0dXJuIG5ldyBVaW50OEFycmF5KGFycil9ZXhwb3J0cy5udW1iZXJUb1VpbnQ4QXJyYXk9bnVtYmVyVG9VaW50OEFycmF5O2Z1bmN0aW9uIHVpbnQ4QXJyYXlUb051bWJlcih1aW50OEFycmF5KXt2YXIgbj0wO3ZhciBleHA9MDtmb3IodmFyIGk9dWludDhBcnJheS5sZW5ndGgtMTtpPj0wO2ktLSl7bis9dWludDhBcnJheVtpXSpNYXRoLnBvdygyNTYsZXhwKyspfXJldHVybiBufWV4cG9ydHMudWludDhBcnJheVRvTnVtYmVyPXVpbnQ4QXJyYXlUb051bWJlcjtmdW5jdGlvbiBsZWZ0U2hpZnQodWludDhBcnJheSl7dmFyIGM9dHJ1ZTtmb3IodmFyIGk9dWludDhBcnJheS5sZW5ndGgtMTtjJiZpPj0wO2ktLSl7aWYoKyt1aW50OEFycmF5W2ldIT09MjU2KXtjPWZhbHNlfX1yZXR1cm4gdWludDhBcnJheX1leHBvcnRzLmxlZnRTaGlmdD1sZWZ0U2hpZnR9LHt9XSwxMDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO09iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCJfX2VzTW9kdWxlIix7dmFsdWU6dHJ1ZX0pO2V4cG9ydHMuZW52aXJvbm5lbWVudD1mdW5jdGlvbigpe2lmKHR5cGVvZiBuYXZpZ2F0b3IhPT0idW5kZWZpbmVkIiYmbmF2aWdhdG9yLnByb2R1Y3Q9PT0iUmVhY3ROYXRpdmUiKXtyZXR1cm57dHlwZToiUkVBQ1QgTkFUSVZFIixpc01haW5UaHJlYWQ6dHJ1ZX19aWYodHlwZW9mIHdpbmRvdyE9PSJ1bmRlZmluZWQiKXtyZXR1cm57dHlwZToiQlJPV1NFUiIsaXNNYWluVGhyZWFkOnRydWV9fWlmKHR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCImJiEhc2VsZi5wb3N0TWVzc2FnZSl7cmV0dXJue3R5cGU6IkJST1dTRVIiLGlzTWFpblRocmVhZDpmYWxzZX19dmFyIGlzTm9kZUNyeXB0b0F2YWlsYWJsZT1mdW5jdGlvbigpe3RyeXtyZXF1aXJlKCJjcnlwdG8iKyIiKX1jYXRjaChfYSl7cmV0dXJuIGZhbHNlfXJldHVybiB0cnVlfSgpO2lmKGlzTm9kZUNyeXB0b0F2YWlsYWJsZSl7cmV0dXJue3R5cGU6Ik5PREUiLGlzTWFpblRocmVhZDp1bmRlZmluZWR9fXJldHVybnt0eXBlOiJMSVFVSUQgQ09SRSIsaXNNYWluVGhyZWFkOnRydWV9fSgpfSx7fV0sMTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTt2YXIgZW52aXJvbm5lbWVudF8xPXJlcXVpcmUoIi4vZW52aXJvbm5lbWVudCIpO2Z1bmN0aW9uIHJhbmRvbUJ5dGVzKHNpemUsY2FsbGJhY2spe3ZhciBNQVhfVUlOVDMyPXJhbmRvbUJ5dGVzLk1BWF9VSU5UMzIsTUFYX0JZVEVTPXJhbmRvbUJ5dGVzLk1BWF9CWVRFUyxnZXRSYW5kb21WYWx1ZXM9cmFuZG9tQnl0ZXMuZ2V0UmFuZG9tVmFsdWVzLGdldE5vZGVSYW5kb21CeXRlcz1yYW5kb21CeXRlcy5nZXROb2RlUmFuZG9tQnl0ZXM7aWYoZW52aXJvbm5lbWVudF8xLmVudmlyb25uZW1lbnQudHlwZT09PSJOT0RFIil7dmFyIHRvTG9jYWxCdWZmZXJJbXBsZW1lbnRhdGlvbl8xPWZ1bmN0aW9uKG5vZGVCdWZmZXJJbnN0KXtyZXR1cm4gQnVmZmVyLmZyb20obm9kZUJ1ZmZlckluc3QuYnVmZmVyLG5vZGVCdWZmZXJJbnN0LmJ5dGVPZmZzZXQsbm9kZUJ1ZmZlckluc3QubGVuZ3RoKX07dmFyIG5vZGVSYW5kb21CeXRlcz1nZXROb2RlUmFuZG9tQnl0ZXMoKTtpZihjYWxsYmFjayE9PXVuZGVmaW5lZCl7bm9kZVJhbmRvbUJ5dGVzKHNpemUsZnVuY3Rpb24oZXJyLGJ1Zil7cmV0dXJuIGNhbGxiYWNrKGVyciwhIWJ1Zj90b0xvY2FsQnVmZmVySW1wbGVtZW50YXRpb25fMShidWYpOmJ1Zil9KTtyZXR1cm59dmFyIG5vZGVCdWZmZXJJbnN0PW5vZGVSYW5kb21CeXRlcyhzaXplKTtyZXR1cm4gdG9Mb2NhbEJ1ZmZlckltcGxlbWVudGF0aW9uXzEobm9kZUJ1ZmZlckluc3QpfWlmKHNpemU+TUFYX1VJTlQzMil7dGhyb3cgbmV3IFJhbmdlRXJyb3IoInJlcXVlc3RlZCB0b28gbWFueSByYW5kb20gYnl0ZXMiKX12YXIgYnl0ZXM9QnVmZmVyLmFsbG9jVW5zYWZlKHNpemUpO2lmKHNpemU+MCl7aWYoc2l6ZT5NQVhfQllURVMpe2Zvcih2YXIgZ2VuZXJhdGVkPTA7Z2VuZXJhdGVkPHNpemU7Z2VuZXJhdGVkKz1NQVhfQllURVMpe2dldFJhbmRvbVZhbHVlcyhieXRlcy5zbGljZShnZW5lcmF0ZWQsZ2VuZXJhdGVkK01BWF9CWVRFUykpfX1lbHNle2dldFJhbmRvbVZhbHVlcyhieXRlcyl9fWlmKHR5cGVvZiBjYWxsYmFjaz09PSJmdW5jdGlvbiIpe3NldFRpbWVvdXQoZnVuY3Rpb24oKXtyZXR1cm4gY2FsbGJhY2sobnVsbCxieXRlcyl9LDApO3JldHVybn1yZXR1cm4gYnl0ZXN9ZXhwb3J0cy5yYW5kb21CeXRlcz1yYW5kb21CeXRlczsoZnVuY3Rpb24ocmFuZG9tQnl0ZXMpe3JhbmRvbUJ5dGVzLk1BWF9CWVRFUz02NTUzNjtyYW5kb21CeXRlcy5NQVhfVUlOVDMyPTQyOTQ5NjcyOTU7cmFuZG9tQnl0ZXMuZ2V0UmFuZG9tVmFsdWVzPWZ1bmN0aW9uKCl7dmFyIG5vbkNyeXB0b2dyYXBoaWNHZXRSYW5kb21WYWx1ZT1mdW5jdGlvbihhYnYpe3ZhciBsPWFidi5sZW5ndGg7d2hpbGUobC0tKXthYnZbbF09TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjI1Nil9cmV0dXJuIGFidn07dmFyIGJyb3dzZXJHZXRSYW5kb21WYWx1ZXM9ZnVuY3Rpb24oKXtpZih0eXBlb2YgY3J5cHRvPT09Im9iamVjdCImJiEhY3J5cHRvLmdldFJhbmRvbVZhbHVlcyl7cmV0dXJuIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChjcnlwdG8pfWVsc2UgaWYodHlwZW9mIG1zQ3J5cHRvPT09Im9iamVjdCImJiEhbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQobXNDcnlwdG8pfWVsc2UgaWYodHlwZW9mIHNlbGY9PT0ib2JqZWN0IiYmdHlwZW9mIHNlbGYuY3J5cHRvPT09Im9iamVjdCImJiEhc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gc2VsZi5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoc2VsZi5jcnlwdG8pfWVsc2V7cmV0dXJuIHVuZGVmaW5lZH19KCk7cmV0dXJuISFicm93c2VyR2V0UmFuZG9tVmFsdWVzP2Jyb3dzZXJHZXRSYW5kb21WYWx1ZXM6bm9uQ3J5cHRvZ3JhcGhpY0dldFJhbmRvbVZhbHVlfSgpO3JhbmRvbUJ5dGVzLmdldE5vZGVSYW5kb21CeXRlcz1mdW5jdGlvbigpe3ZhciBub2RlUmFuZG9tQnl0ZXM9dW5kZWZpbmVkO3JldHVybiBmdW5jdGlvbigpe2lmKG5vZGVSYW5kb21CeXRlcz09PXVuZGVmaW5lZCl7bm9kZVJhbmRvbUJ5dGVzPXJlcXVpcmUoImNyeXB0byIrIiIpLnJhbmRvbUJ5dGVzfXJldHVybiBub2RlUmFuZG9tQnl0ZXN9fSgpfSkocmFuZG9tQnl0ZXM9ZXhwb3J0cy5yYW5kb21CeXRlc3x8KGV4cG9ydHMucmFuZG9tQnl0ZXM9e30pKX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4vZW52aXJvbm5lbWVudCI6MTAsYnVmZmVyOjI3fV0sMTI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0IjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywiX19lc01vZHVsZSIse3ZhbHVlOnRydWV9KTtmdW5jdGlvbiB0b0J1ZmZlcih1aW50OEFycmF5KXtyZXR1cm4gQnVmZmVyLmZyb20odWludDhBcnJheS5idWZmZXIsdWludDhBcnJheS5ieXRlT2Zmc2V0LHVpbnQ4QXJyYXkubGVuZ3RoKX1leHBvcnRzLnRvQnVmZmVyPXRvQnVmZmVyfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHtidWZmZXI6Mjd9XSwxMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHJvb3QpeyJ1c2Ugc3RyaWN0IjtmdW5jdGlvbiBjaGVja0ludCh2YWx1ZSl7cmV0dXJuIHBhcnNlSW50KHZhbHVlKT09PXZhbHVlfWZ1bmN0aW9uIGNoZWNrSW50cyhhcnJheWlzaCl7aWYoIWNoZWNrSW50KGFycmF5aXNoLmxlbmd0aCkpe3JldHVybiBmYWxzZX1mb3IodmFyIGk9MDtpPGFycmF5aXNoLmxlbmd0aDtpKyspe2lmKCFjaGVja0ludChhcnJheWlzaFtpXSl8fGFycmF5aXNoW2ldPDB8fGFycmF5aXNoW2ldPjI1NSl7cmV0dXJuIGZhbHNlfX1yZXR1cm4gdHJ1ZX1mdW5jdGlvbiBjb2VyY2VBcnJheShhcmcsY29weSl7aWYoYXJnLmJ1ZmZlciYmYXJnLm5hbWU9PT0iVWludDhBcnJheSIpe2lmKGNvcHkpe2lmKGFyZy5zbGljZSl7YXJnPWFyZy5zbGljZSgpfWVsc2V7YXJnPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZyl9fXJldHVybiBhcmd9aWYoQXJyYXkuaXNBcnJheShhcmcpKXtpZighY2hlY2tJbnRzKGFyZykpe3Rocm93IG5ldyBFcnJvcigiQXJyYXkgY29udGFpbnMgaW52YWxpZCB2YWx1ZTogIithcmcpfXJldHVybiBuZXcgVWludDhBcnJheShhcmcpfWlmKGNoZWNrSW50KGFyZy5sZW5ndGgpJiZjaGVja0ludHMoYXJnKSl7cmV0dXJuIG5ldyBVaW50OEFycmF5KGFyZyl9dGhyb3cgbmV3IEVycm9yKCJ1bnN1cHBvcnRlZCBhcnJheS1saWtlIG9iamVjdCIpfWZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCl7cmV0dXJuIG5ldyBVaW50OEFycmF5KGxlbmd0aCl9ZnVuY3Rpb24gY29weUFycmF5KHNvdXJjZUFycmF5LHRhcmdldEFycmF5LHRhcmdldFN0YXJ0LHNvdXJjZVN0YXJ0LHNvdXJjZUVuZCl7aWYoc291cmNlU3RhcnQhPW51bGx8fHNvdXJjZUVuZCE9bnVsbCl7aWYoc291cmNlQXJyYXkuc2xpY2Upe3NvdXJjZUFycmF5PXNvdXJjZUFycmF5LnNsaWNlKHNvdXJjZVN0YXJ0LHNvdXJjZUVuZCl9ZWxzZXtzb3VyY2VBcnJheT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChzb3VyY2VBcnJheSxzb3VyY2VTdGFydCxzb3VyY2VFbmQpfX10YXJnZXRBcnJheS5zZXQoc291cmNlQXJyYXksdGFyZ2V0U3RhcnQpfXZhciBjb252ZXJ0VXRmOD1mdW5jdGlvbigpe2Z1bmN0aW9uIHRvQnl0ZXModGV4dCl7dmFyIHJlc3VsdD1bXSxpPTA7dGV4dD1lbmNvZGVVUkkodGV4dCk7d2hpbGUoaTx0ZXh0Lmxlbmd0aCl7dmFyIGM9dGV4dC5jaGFyQ29kZUF0KGkrKyk7aWYoYz09PTM3KXtyZXN1bHQucHVzaChwYXJzZUludCh0ZXh0LnN1YnN0cihpLDIpLDE2KSk7aSs9Mn1lbHNle3Jlc3VsdC5wdXNoKGMpfX1yZXR1cm4gY29lcmNlQXJyYXkocmVzdWx0KX1mdW5jdGlvbiBmcm9tQnl0ZXMoYnl0ZXMpe3ZhciByZXN1bHQ9W10saT0wO3doaWxlKGk8Ynl0ZXMubGVuZ3RoKXt2YXIgYz1ieXRlc1tpXTtpZihjPDEyOCl7cmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShjKSk7aSsrfWVsc2UgaWYoYz4xOTEmJmM8MjI0KXtyZXN1bHQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKChjJjMxKTw8NnxieXRlc1tpKzFdJjYzKSk7aSs9Mn1lbHNle3Jlc3VsdC5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoKGMmMTUpPDwxMnwoYnl0ZXNbaSsxXSY2Myk8PDZ8Ynl0ZXNbaSsyXSY2MykpO2krPTN9fXJldHVybiByZXN1bHQuam9pbigiIil9cmV0dXJue3RvQnl0ZXM6dG9CeXRlcyxmcm9tQnl0ZXM6ZnJvbUJ5dGVzfX0oKTt2YXIgY29udmVydEhleD1mdW5jdGlvbigpe2Z1bmN0aW9uIHRvQnl0ZXModGV4dCl7dmFyIHJlc3VsdD1bXTtmb3IodmFyIGk9MDtpPHRleHQubGVuZ3RoO2krPTIpe3Jlc3VsdC5wdXNoKHBhcnNlSW50KHRleHQuc3Vic3RyKGksMiksMTYpKX1yZXR1cm4gcmVzdWx0fXZhciBIZXg9IjAxMjM0NTY3ODlhYmNkZWYiO2Z1bmN0aW9uIGZyb21CeXRlcyhieXRlcyl7dmFyIHJlc3VsdD1bXTtmb3IodmFyIGk9MDtpPGJ5dGVzLmxlbmd0aDtpKyspe3ZhciB2PWJ5dGVzW2ldO3Jlc3VsdC5wdXNoKEhleFsodiYyNDApPj40XStIZXhbdiYxNV0pfXJldHVybiByZXN1bHQuam9pbigiIil9cmV0dXJue3RvQnl0ZXM6dG9CeXRlcyxmcm9tQnl0ZXM6ZnJvbUJ5dGVzfX0oKTt2YXIgbnVtYmVyT2ZSb3VuZHM9ezE2OjEwLDI0OjEyLDMyOjE0fTt2YXIgcmNvbj1bMSwyLDQsOCwxNiwzMiw2NCwxMjgsMjcsNTQsMTA4LDIxNiwxNzEsNzcsMTU0LDQ3LDk0LDE4OCw5OSwxOTgsMTUxLDUzLDEwNiwyMTIsMTc5LDEyNSwyNTAsMjM5LDE5NywxNDVdO3ZhciBTPVs5OSwxMjQsMTE5LDEyMywyNDIsMTA3LDExMSwxOTcsNDgsMSwxMDMsNDMsMjU0LDIxNSwxNzEsMTE4LDIwMiwxMzAsMjAxLDEyNSwyNTAsODksNzEsMjQwLDE3MywyMTIsMTYyLDE3NSwxNTYsMTY0LDExNCwxOTIsMTgzLDI1MywxNDcsMzgsNTQsNjMsMjQ3LDIwNCw1MiwxNjUsMjI5LDI0MSwxMTMsMjE2LDQ5LDIxLDQsMTk5LDM1LDE5NSwyNCwxNTAsNSwxNTQsNywxOCwxMjgsMjI2LDIzNSwzOSwxNzgsMTE3LDksMTMxLDQ0LDI2LDI3LDExMCw5MCwxNjAsODIsNTksMjE0LDE3OSw0MSwyMjcsNDcsMTMyLDgzLDIwOSwwLDIzNywzMiwyNTIsMTc3LDkxLDEwNiwyMDMsMTkwLDU3LDc0LDc2LDg4LDIwNywyMDgsMjM5LDE3MCwyNTEsNjcsNzcsNTEsMTMzLDY5LDI0OSwyLDEyNyw4MCw2MCwxNTksMTY4LDgxLDE2Myw2NCwxNDMsMTQ2LDE1Nyw1NiwyNDUsMTg4LDE4MiwyMTgsMzMsMTYsMjU1LDI0MywyMTAsMjA1LDEyLDE5LDIzNiw5NSwxNTEsNjgsMjMsMTk2LDE2NywxMjYsNjEsMTAwLDkzLDI1LDExNSw5NiwxMjksNzksMjIwLDM0LDQyLDE0NCwxMzYsNzAsMjM4LDE4NCwyMCwyMjIsOTQsMTEsMjE5LDIyNCw1MCw1OCwxMCw3Myw2LDM2LDkyLDE5NCwyMTEsMTcyLDk4LDE0NSwxNDksMjI4LDEyMSwyMzEsMjAwLDU1LDEwOSwxNDEsMjEzLDc4LDE2OSwxMDgsODYsMjQ0LDIzNCwxMDEsMTIyLDE3NCw4LDE4NiwxMjAsMzcsNDYsMjgsMTY2LDE4MCwxOTgsMjMyLDIyMSwxMTYsMzEsNzUsMTg5LDEzOSwxMzgsMTEyLDYyLDE4MSwxMDIsNzIsMywyNDYsMTQsOTcsNTMsODcsMTg1LDEzNCwxOTMsMjksMTU4LDIyNSwyNDgsMTUyLDE3LDEwNSwyMTcsMTQyLDE0OCwxNTUsMzAsMTM1LDIzMywyMDYsODUsNDAsMjIzLDE0MCwxNjEsMTM3LDEzLDE5MSwyMzAsNjYsMTA0LDY1LDE1Myw0NSwxNSwxNzYsODQsMTg3LDIyXTt2YXIgU2k9WzgyLDksMTA2LDIxMyw0OCw1NCwxNjUsNTYsMTkxLDY0LDE2MywxNTgsMTI5LDI0MywyMTUsMjUxLDEyNCwyMjcsNTcsMTMwLDE1NSw0NywyNTUsMTM1LDUyLDE0Miw2Nyw2OCwxOTYsMjIyLDIzMywyMDMsODQsMTIzLDE0OCw1MCwxNjYsMTk0LDM1LDYxLDIzOCw3NiwxNDksMTEsNjYsMjUwLDE5NSw3OCw4LDQ2LDE2MSwxMDIsNDAsMjE3LDM2LDE3OCwxMTgsOTEsMTYyLDczLDEwOSwxMzksMjA5LDM3LDExNCwyNDgsMjQ2LDEwMCwxMzQsMTA0LDE1MiwyMiwyMTIsMTY0LDkyLDIwNCw5MywxMDEsMTgyLDE0NiwxMDgsMTEyLDcyLDgwLDI1MywyMzcsMTg1LDIxOCw5NCwyMSw3MCw4NywxNjcsMTQxLDE1NywxMzIsMTQ0LDIxNiwxNzEsMCwxNDAsMTg4LDIxMSwxMCwyNDcsMjI4LDg4LDUsMTg0LDE3OSw2OSw2LDIwOCw0NCwzMCwxNDMsMjAyLDYzLDE1LDIsMTkzLDE3NSwxODksMywxLDE5LDEzOCwxMDcsNTgsMTQ1LDE3LDY1LDc5LDEwMywyMjAsMjM0LDE1MSwyNDIsMjA3LDIwNiwyNDAsMTgwLDIzMCwxMTUsMTUwLDE3MiwxMTYsMzQsMjMxLDE3Myw1MywxMzMsMjI2LDI0OSw1NSwyMzIsMjgsMTE3LDIyMywxMTAsNzEsMjQxLDI2LDExMywyOSw0MSwxOTcsMTM3LDExMSwxODMsOTgsMTQsMTcwLDI0LDE5MCwyNywyNTIsODYsNjIsNzUsMTk4LDIxMCwxMjEsMzIsMTU0LDIxOSwxOTIsMjU0LDEyMCwyMDUsOTAsMjQ0LDMxLDIyMSwxNjgsNTEsMTM2LDcsMTk5LDQ5LDE3NywxOCwxNiw4OSwzOSwxMjgsMjM2LDk1LDk2LDgxLDEyNywxNjksMjUsMTgxLDc0LDEzLDQ1LDIyOSwxMjIsMTU5LDE0NywyMDEsMTU2LDIzOSwxNjAsMjI0LDU5LDc3LDE3NCw0MiwyNDUsMTc2LDIwMCwyMzUsMTg3LDYwLDEzMSw4MywxNTMsOTcsMjMsNDMsNCwxMjYsMTg2LDExOSwyMTQsMzgsMjI1LDEwNSwyMCw5OSw4NSwzMywxMiwxMjVdO3ZhciBUMT1bMzMyODQwMjM0MSw0MTY4OTA3OTA4LDQwMDA4MDY4MDksNDEzNTI4NzY5Myw0Mjk0MTExNzU3LDM1OTczNjQxNTcsMzczMTg0NTA0MSwyNDQ1NjU3NDI4LDE2MTM3NzA4MzIsMzM2MjAyMjcsMzQ2Mjg4MzI0MSwxNDQ1NjY5NzU3LDM4OTIyNDgwODksMzA1MDgyMTQ3NCwxMzAzMDk2Mjk0LDM5NjcxODY1ODYsMjQxMjQzMTk0MSw1Mjg2NDY4MTMsMjMxMTcwMjg0OCw0MjAyNTI4MTM1LDQwMjYyMDI2NDUsMjk5MjIwMDE3MSwyMzg3MDM2MTA1LDQyMjY4NzEzMDcsMTEwMTkwMTI5MiwzMDE3MDY5NjcxLDE2MDQ0OTQwNzcsMTE2OTE0MTczOCw1OTc0NjYzMDMsMTQwMzI5OTA2MywzODMyNzA1Njg2LDI2MTMxMDA2MzUsMTk3NDk3NDQwMiwzNzkxNTE5MDA0LDEwMzMwODE3NzQsMTI3NzU2ODYxOCwxODE1NDkyMTg2LDIxMTgwNzQxNzcsNDEyNjY2ODU0NiwyMjExMjM2OTQzLDE3NDgyNTE3NDAsMTM2OTgxMDQyMCwzNTIxNTA0NTY0LDQxOTMzODI2NjQsMzc5OTA4NTQ1OSwyODgzMTE1MTIzLDE2NDczOTEwNTksNzA2MDI0NzY3LDEzNDQ4MDkwOCwyNTEyODk3ODc0LDExNzY3MDc5NDEsMjY0Njg1MjQ0Niw4MDY4ODU0MTYsOTMyNjE1ODQxLDE2ODEwMTEzNSw3OTg2NjEzMDEsMjM1MzQxNTc3LDYwNTE2NDA4Niw0NjE0MDYzNjMsMzc1NjE4ODIyMSwzNDU0NzkwNDM4LDEzMTExODg4NDEsMjE0MjQxNzYxMywzOTMzNTY2MzY3LDMwMjU4MjA0Myw0OTUxNTgxNzQsMTQ3OTI4OTk3Miw4NzQxMjU4NzAsOTA3NzQ2MDkzLDM2OTgyMjQ4MTgsMzAyNTgyMDM5OCwxNTM3MjUzNjI3LDI3NTY4NTg2MTQsMTk4MzU5MzI5MywzMDg0MzEwMTEzLDIxMDg5Mjg5NzQsMTM3ODQyOTMwNywzNzIyNjk5NTgyLDE1ODAxNTA2NDEsMzI3NDUxNzk5LDI3OTA0Nzg4MzcsMzExNzUzNTU5MiwwLDMyNTM1OTU0MzYsMTA3NTg0NzI2NCwzODI1MDA3NjQ3LDIwNDE2ODg1MjAsMzA1OTQ0MDYyMSwzNTYzNzQzOTM0LDIzNzg5NDMzMDIsMTc0MDU1Mzk0NSwxOTE2MzUyODQzLDI0ODc4OTY3OTgsMjU1NTEzNzIzNiwyOTU4NTc5OTQ0LDIyNDQ5ODg3NDYsMzE1MTAyNDIzNSwzMzIwODM1ODgyLDEzMzY1ODQ5MzMsMzk5MjcxNDAwNiwyMjUyNTU1MjA1LDI1ODg3NTc0NjMsMTcxNDYzMTUwOSwyOTM5NjMxNTYsMjMxOTc5NTY2MywzOTI1NDczNTUyLDY3MjQwNDU0LDQyNjk3Njg1NzcsMjY4OTYxODE2MCwyMDE3MjEzNTA4LDYzMTIxODEwNiwxMjY5MzQ0NDgzLDI3MjMyMzgzODcsMTU3MTAwNTQzOCwyMTUxNjk0NTI4LDkzMjk0NDc0LDEwNjY1NzA0MTMsNTYzOTc3NjYwLDE4ODI3MzI2MTYsNDA1OTQyODEwMCwxNjczMzEzNTAzLDIwMDg0NjMwNDEsMjk1MDM1NTU3MywxMTA5NDY3NDkxLDUzNzkyMzYzMiwzODU4NzU5NDUwLDQyNjA2MjMxMTgsMzIxODI2NDY4NSwyMTc3NzQ4MzAwLDQwMzQ0MjcwOCw2Mzg3ODQzMDksMzI4NzA4NDA3OSwzMTkzOTIxNTA1LDg5OTEyNzIwMiwyMjg2MTc1NDM2LDc3MzI2NTIwOSwyNDc5MTQ2MDcxLDE0MzcwNTA4NjYsNDIzNjE0ODM1NCwyMDUwODMzNzM1LDMzNjIwMjI1NzIsMzEyNjY4MTA2Myw4NDA1MDU2NDMsMzg2NjMyNTkwOSwzMjI3NTQxNjY0LDQyNzkxNzcyMCwyNjU1OTk3OTA1LDI3NDkxNjA1NzUsMTE0MzA4NzcxOCwxNDEyMDQ5NTM0LDk5OTMyOTk2MywxOTM0OTcyMTksMjM1MzQxNTg4MiwzMzU0MzI0NTIxLDE4MDcyNjgwNTEsNjcyNDA0NTQwLDI4MTY0MDEwMTcsMzE2MDMwMTI4MiwzNjk4MjI0OTMsMjkxNjg2NjkzNCwzNjg4OTQ3NzcxLDE2ODEwMTEyODYsMTk0OTk3MzA3MCwzMzYyMDIyNzAsMjQ1NDI3NjU3MSwyMDE3MjEzNTQsMTIxMDMyODE3MiwzMDkzMDYwODM2LDI2ODAzNDEwODUsMzE4NDc3NjA0NiwxMTM1Mzg5OTM1LDMyOTQ3ODIxMTgsOTY1ODQxMzIwLDgzMTg4Njc1NiwzNTU0OTkzMjA3LDQwNjgwNDcyNDMsMzU4ODc0NTAxMCwyMzQ1MTkxNDkxLDE4NDkxMTI0MDksMzY2NDYwNDU5OSwyNjA1NDAyOCwyOTgzNTgxMDI4LDI2MjIzNzc2ODIsMTIzNTg1NTg0MCwzNjMwOTg0MzcyLDI4OTEzMzk1MTQsNDA5MjkxNjc0MywzNDg4Mjc5MDc3LDMzOTU2NDI3OTksNDEwMTY2NzQ3MCwxMjAyNjMwMzc3LDI2ODk2MTgxNiwxODc0NTA4NTAxLDQwMzQ0MjcwMTYsMTI0Mzk0ODM5OSwxNTQ2NTMwNDE4LDk0MTM2NjMwOCwxNDcwNTM5NTA1LDE5NDEyMjI1OTksMjU0NjM4NjUxMywzNDIxMDM4NjI3LDI3MTU2NzE5MzIsMzg5OTk0NjE0MCwxMDQyMjI2OTc3LDI1MjE1MTcwMjEsMTYzOTgyNDg2MCwyMjcyNDkwMzAsMjYwNzM3NjY5LDM3NjU0NjUyMzIsMjA4NDQ1Mzk1NCwxOTA3NzMzOTU2LDM0MjkyNjMwMTgsMjQyMDY1NjM0NCwxMDA4NjA2NzcsNDE2MDE1NzE4NSw0NzA2ODMxNTQsMzI2MTE2MTg5MSwxNzgxODcxOTY3LDI5MjQ5NTk3MzcsMTc3Mzc3OTQwOCwzOTQ2OTIyNDEsMjU3OTYxMTk5Miw5NzQ5ODY1MzUsNjY0NzA2NzQ1LDM2NTU0NTkxMjgsMzk1ODk2MjE5NSw3MzE0MjA4NTEsNTcxNTQzODU5LDM1MzAxMjM3MDcsMjg0OTYyNjQ4MCwxMjY3ODMxMTMsODY1Mzc1Mzk5LDc2NTE3MjY2MiwxMDA4NjA2NzU0LDM2MTIwMzYwMiwzMzg3NTQ5OTg0LDIyNzg0NzczODUsMjg1NzcxOTI5NSwxMzQ0ODA5MDgwLDI3ODI5MTIzNzgsNTk1NDI2NzEsMTUwMzc2NDk4NCwxNjAwMDg1NzYsNDM3MDYyOTM1LDE3MDcwNjUzMDYsMzYyMjIzMzY0OSwyMjE4OTM0OTgyLDM0OTY1MDM0ODAsMjE4NTMxNDc1NSw2OTc5MzIyMDgsMTUxMjkxMDE5OSw1MDQzMDMzNzcsMjA3NTE3NzE2MywyODI0MDk5MDY4LDE4NDEwMTk4NjIsNzM5NjQ0OTg2XTt2YXIgVDI9WzI3ODEyNDIyMTEsMjIzMDg3NzMwOCwyNTgyNTQyMTk5LDIzODE3NDA5MjMsMjM0ODc3NjgyLDMxODQ5NDYwMjcsMjk4NDE0NDc1MSwxNDE4ODM5NDkzLDEzNDg0ODEwNzIsNTA0NjI5NzcsMjg0ODg3NjM5MSwyMTAyNzk5MTQ3LDQzNDYzNDQ5NCwxNjU2MDg0NDM5LDM4NjM4NDk4OTksMjU5OTE4ODA4NiwxMTY3MDUxNDY2LDI2MzYwODc5MzgsMTA4Mjc3MTkxMywyMjgxMzQwMjg1LDM2ODA0ODg5MCwzOTU0MzM0MDQxLDMzODE1NDQ3NzUsMjAxMDYwNTkyLDM5NjM3MjcyNzcsMTczOTgzODY3Niw0MjUwOTAzMjAyLDM5MzA0MzU1MDMsMzIwNjc4MjEwOCw0MTQ5NDUzOTg4LDI1MzE1NTM5MDYsMTUzNjkzNDA4MCwzMjYyNDk0NjQ3LDQ4NDU3MjY2OSwyOTIzMjcxMDU5LDE3ODMzNzUzOTgsMTUxNzA0MTIwNiwxMDk4NzkyNzY3LDQ5Njc0MjMxLDEzMzQwMzc3MDgsMTU1MDMzMjk4MCw0MDk4OTkxNTI1LDg4NjE3MTEwOSwxNTA1OTgxMjksMjQ4MTA5MDkyOSwxOTQwNjQyMDA4LDEzOTg5NDQwNDksMTA1OTcyMjUxNywyMDE4NTE5MDgsMTM4NTU0NzcxOSwxNjk5MDk1MzMxLDE1ODczOTc1NzEsNjc0MjQwNTM2LDI3MDQ3NzQ4MDYsMjUyMzE0ODg1LDMwMzk3OTU4NjYsMTUxOTE0MjQ3LDkwODMzMzU4NiwyNjAyMjcwODQ4LDEwMzgwODI3ODYsNjUxMDI5NDgzLDE3NjY3Mjk1MTEsMzQ0NzY5ODA5OCwyNjgyOTQyODM3LDQ1NDE2Njc5MywyNjUyNzM0MzM5LDE5NTE5MzU1MzIsNzc1MTY2NDkwLDc1ODUyMDYwMywzMDAwNzkwNjM4LDQwMDQ3OTcwMTgsNDIxNzA4NjExMiw0MTM3OTY0MTE0LDEyOTk1OTQwNDMsMTYzOTQzODAzOCwzNDY0MzQ0NDk5LDIwNjg5ODIwNTcsMTA1NDcyOTE4NywxOTAxOTk3ODcxLDI1MzQ2Mzg3MjQsNDEyMTMxODIyNywxNzU3MDA4MzM3LDAsNzUwOTA2ODYxLDE2MTQ4MTUyNjQsNTM1MDM1MTMyLDMzNjM0MTg1NDUsMzk4ODE1MTEzMSwzMjAxNTkxOTE0LDExODM2OTc4NjcsMzY0NzQ1NDkxMCwxMjY1Nzc2OTUzLDM3MzQyNjAyOTgsMzU2Njc1MDc5NiwzOTAzODcxMDY0LDEyNTAyODM0NzEsMTgwNzQ3MDgwMCw3MTc2MTUwODcsMzg0NzIwMzQ5OCwzODQ2OTUyOTEsMzMxMzkxMDU5NSwzNjE3MjEzNzczLDE0MzI3NjExMzksMjQ4NDE3NjI2MSwzNDgxOTQ1NDEzLDI4Mzc2OTMzNywxMDA5MjU5NTQsMjE4MDkzOTY0Nyw0MDM3MDM4MTYwLDExNDg3MzA0MjgsMzEyMzAyNzg3MSwzODEzMzg2NDA4LDQwODc1MDExMzcsNDI2NzU0OTYwMywzMjI5NjMwNTI4LDIzMTU2MjAyMzksMjkwNjYyNDY1OCwzMTU2MzE5NjQ1LDEyMTUzMTM5NzYsODI5NjYwMDUsMzc0Nzg1NTU0OCwzMjQ1ODQ4MjQ2LDE5NzQ0NTkwOTgsMTY2NTI3ODI0MSw4MDc0MDc2MzIsNDUxMjgwODk1LDI1MTUyNDA4MywxODQxMjg3ODkwLDEyODM1NzUyNDUsMzM3MTIwMjY4LDg5MTY4NzY5OSw4MDEzNjkzMjQsMzc4NzM0OTg1NSwyNzIxNDIxMjA3LDM0MzE0ODI0MzYsOTU5MzIxODc5LDE0NjkzMDE5NTYsNDA2NTY5OTc1MSwyMTk3NTg1NTM0LDExOTkxOTM0MDUsMjg5ODgxNDA1MiwzODg3NzUwNDkzLDcyNDcwMzUxMywyNTE0OTA4MDE5LDI2OTY5NjIxNDQsMjU1MTgwODM4NSwzNTE2ODEzMTM1LDIxNDE0NDUzNDAsMTcxNTc0MTIxOCwyMTE5NDQ1MDM0LDI4NzI4MDc1NjgsMjE5ODU3MTE0NCwzMzk4MTkwNjYyLDcwMDk2ODY4NiwzNTQ3MDUyMjE2LDEwMDkyNTk1NDAsMjA0MTA0NDcwMiwzODAzOTk1NzQyLDQ4Nzk4Mzg4MywxOTkxMTA1NDk5LDEwMDQyNjU2OTYsMTQ0OTQwNzAyNiwxMzE2MjM5OTMwLDUwNDYyOTc3MCwzNjgzNzk3MzIxLDE2ODU2MDEzNCwxODE2NjY3MTcyLDM4MzcyODc1MTYsMTU3MDc1MTE3MCwxODU3OTM0MjkxLDQwMTQxODk3NDAsMjc5Nzg4ODA5OCwyODIyMzQ1MTA1LDI3NTQ3MTI5ODEsOTM2NjMzNTcyLDIzNDc5MjM4MzMsODUyODc5MzM1LDExMzMyMzQzNzYsMTUwMDM5NTMxOSwzMDg0NTQ1Mzg5LDIzNDg5MTIwMTMsMTY4OTM3NjIxMywzNTMzNDU5MDIyLDM3NjI5MjM5NDUsMzAzNDA4MjQxMiw0MjA1NTk4Mjk0LDEzMzQyODQ2OCw2MzQzODMwODIsMjk0OTI3NzAyOSwyMzk4Mzg2ODEwLDM5MTM3ODkxMDIsNDAzNzAzODE2LDM1ODA4NjkzMDYsMjI5NzQ2MDg1NiwxODY3MTMwMTQ5LDE5MTg2NDM3NTgsNjA3NjU2OTg4LDQwNDkwNTMzNTAsMzM0NjI0ODg4NCwxMzY4OTAxMzE4LDYwMDU2NTk5MiwyMDkwOTgyODc3LDI2MzI0Nzk4NjAsNTU3NzE5MzI3LDM3MTc2MTQ0MTEsMzY5NzM5MzA4NSwyMjQ5MDM0NjM1LDIyMzIzODgyMzQsMjQzMDYyNzk1MiwxMTE1NDM4NjU0LDMyOTU3ODY0MjEsMjg2NTUyMjI3OCwzNjMzMzM0MzQ0LDg0MjgwMDY3LDMzMDI3ODMwLDMwMzgyODQ5NCwyNzQ3NDI1MTIxLDE2MDA3OTU5NTcsNDE4ODk1MjQwNywzNDk2NTg5NzUzLDI0MzQyMzgwODYsMTQ4NjQ3MTYxNyw2NTgxMTk5NjUsMzEwNjM4MTQ3MCw5NTM4MDMyMzMsMzM0MjMxODAwLDMwMDU5Nzg3NzYsODU3ODcwNjA5LDMxNTExMjg5MzcsMTg5MDE3OTU0NSwyMjk4OTczODM4LDI4MDUxNzU0NDQsMzA1NjQ0MjI2Nyw1NzQzNjUyMTQsMjQ1MDg4NDQ4Nyw1NTAxMDM1MjksMTIzMzYzNzA3MCw0Mjg5MzUzMDQ1LDIwMTg1MTkwODAsMjA1NzY5MTEwMywyMzk5Mzc0NDc2LDQxNjY2MjM2NDksMjE0ODEwODY4MSwzODc1ODMyNDUsMzY2NDEwMTMxMSw4MzYyMzI5MzQsMzMzMDU1NjQ4MiwzMTAwNjY1OTYwLDMyODAwOTM1MDUsMjk1NTUxNjMxMywyMDAyMzk4NTA5LDI4NzE4MjYwNywzNDEzODgxMDA4LDQyMzg4OTAwNjgsMzU5NzUxNTcwNyw5NzU5Njc3NjZdO3ZhciBUMz1bMTY3MTgwODYxMSwyMDg5MDg5MTQ4LDIwMDY1NzY3NTksMjA3MjkwMTI0Myw0MDYxMDAzNzYyLDE4MDc2MDMzMDcsMTg3MzkyNzc5MSwzMzEwNjUzODkzLDgxMDU3Mzg3MiwxNjk3NDMzNywxNzM5MTgxNjcxLDcyOTYzNDM0Nyw0MjYzMTEwNjU0LDM2MTM1NzA1MTksMjg4Mzk5NzA5OSwxOTg5ODY0NTY2LDMzOTM1NTY0MjYsMjE5MTMzNTI5OCwzMzc2NDQ5OTkzLDIxMDYwNjM0ODUsNDE5NTc0MTY5MCwxNTA4NjE4ODQxLDEyMDQzOTE0OTUsNDAyNzMxNzIzMiwyOTE3OTQxNjc3LDM1NjM1NjYwMzYsMjczNDUxNDA4MiwyOTUxMzY2MDYzLDI2Mjk3NzIxODgsMjc2NzY3MjIyOCwxOTIyNDkxNTA2LDMyMjcyMjkxMjAsMzA4Mjk3NDY0Nyw0MjQ2NTI4NTA5LDI0Nzc2Njk3NzksNjQ0NTAwNTE4LDkxMTg5NTYwNiwxMDYxMjU2NzY3LDQxNDQxNjYzOTEsMzQyNzc2MzE0OCw4Nzg0NzEyMjAsMjc4NDI1MjMyNSwzODQ1NDQ0MDY5LDQwNDM4OTczMjksMTkwNTUxNzE2OSwzNjMxNDU5Mjg4LDgyNzU0ODIwOSwzNTY0NjEwNzcsNjc4OTczNDgsMzM0NDA3ODI3OSw1OTM4Mzk2NTEsMzI3Nzc1Nzg5MSw0MDUyODY5MzYsMjUyNzE0NzkyNiw4NDg3MTY4NSwyNTk1NTY1NDY2LDExODAzMzkyNywzMDU1MzgwNjYsMjE1NzY0ODc2OCwzNzk1NzA1ODI2LDM5NDUxODg4NDMsNjYxMjEyNzExLDI5OTk4MTIwMTgsMTk3MzQxNDUxNywxNTI3NjkwMzMsMjIwODE3NzUzOSw3NDU4MjIyNTIsNDM5MjM1NjEwLDQ1NTk0NzgwMywxODU3MjE1NTk4LDE1MjU1OTMxNzgsMjcwMDgyNzU1MiwxMzkxODk1NjM0LDk5NDkzMjI4MywzNTk2NzI4Mjc4LDMwMTY2NTQyNTksNjk1OTQ3ODE3LDM4MTI1NDgwNjcsNzk1OTU4ODMxLDIyMjQ0OTM0NDQsMTQwODYwNzgyNywzNTEzMzAxNDU3LDAsMzk3OTEzMzQyMSw1NDMxNzg3ODQsNDIyOTk0ODQxMiwyOTgyNzA1NTg1LDE1NDIzMDUzNzEsMTc5MDg5MTExNCwzNDEwMzk4NjY3LDMyMDE5MTg5MTAsOTYxMjQ1NzUzLDEyNTYxMDA5MzgsMTI4OTAwMTAzNiwxNDkxNjQ0NTA0LDM0Nzc3Njc2MzEsMzQ5NjcyMTM2MCw0MDEyNTU3ODA3LDI4NjcxNTQ4NTgsNDIxMjU4MzkzMSwxMTM3MDE4NDM1LDEzMDU5NzUzNzMsODYxMjM0NzM5LDIyNDEwNzM1NDEsMTE3MTIyOTI1Myw0MTc4NjM1MjU3LDMzOTQ4Njc0LDIxMzkyMjU3MjcsMTM1Nzk0Njk2MCwxMDExMTIwMTg4LDI2Nzk3NzY2NzEsMjgzMzQ2ODMyOCwxMzc0OTIxMjk3LDI3NTEzNTYzMjMsMTA4NjM1NzU2OCwyNDA4MTg3Mjc5LDI0NjA4Mjc1MzgsMjY0NjM1MjI4NSw5NDQyNzE0MTYsNDExMDc0MjAwNSwzMTY4NzU2NjY4LDMwNjYxMzI0MDYsMzY2NTE0NTgxOCw1NjAxNTMxMjEsMjcxNTg5MzkyLDQyNzk5NTI4OTUsNDA3Nzg0NjAwMywzNTMwNDA3ODkwLDM0NDQzNDMyNDUsMjAyNjQzNDY4LDMyMjI1MDI1OSwzOTYyNTUzMzI0LDE2MDg2Mjk4NTUsMjU0Mzk5MDE2NywxMTU0MjU0OTE2LDM4OTYyMzMxOSwzMjk0MDczNzk2LDI4MTc2NzY3MTEsMjEyMjUxMzUzNCwxMDI4MDk0NTI1LDE2ODkwNDUwOTIsMTU3NTQ2NzYxMyw0MjIyNjEyNzMsMTkzOTIwMzY5OSwxNjIxMTQ3NzQ0LDIxNzQyMjg4NjUsMTMzOTEzNzYxNSwzNjk5MzUyNTQwLDU3NzEyNzQ1OCw3MTI5MjIxNTQsMjQyNzE0MTAwOCwyMjkwMjg5NTQ0LDExODc2NzkzMDIsMzk5NTcxNTU2NiwzMTAwODYzNDE2LDMzOTQ4Njc0MCwzNzMyNTE0NzgyLDE1OTE5MTc2NjIsMTg2NDU1NTYzLDM2ODE5ODgwNTksMzc2MjAxOTI5Niw4NDQ1MjI1NDYsOTc4MjIwMDkwLDE2OTc0MzM3MCwxMjM5MTI2NjAxLDEwMTMyMTczNCw2MTEwNzYxMzIsMTU1ODQ5MzI3NiwzMjYwOTE1NjUwLDM1NDcyNTAxMzEsMjkwMTM2MTU4MCwxNjU1MDk2NDE4LDI0NDM3MjExMDUsMjUxMDU2NTc4MSwzODI4ODYzOTcyLDIwMzkyMTQ3MTMsMzg3ODg2ODQ1NSwzMzU5ODY5ODk2LDkyODYwNzc5OSwxODQwNzY1NTQ5LDIzNzQ3NjI4OTMsMzU4MDE0NjEzMywxMzIyNDI1NDIyLDI4NTAwNDg0MjUsMTgyMzc5MTIxMiwxNDU5MjY4Njk0LDQwOTQxNjE5MDgsMzkyODM0NjYwMiwxNzA2MDE5NDI5LDIwNTYxODkwNTAsMjkzNDUyMzgyMiwxMzU3OTQ2OTYsMzEzNDU0OTk0NiwyMDIyMjQwMzc2LDYyODA1MDQ2OSw3NzkyNDY2MzgsNDcyMTM1NzA4LDI4MDA4MzQ0NzAsMzAzMjk3MDE2NCwzMzI3MjM2MDM4LDM4OTQ2NjAwNzIsMzcxNTkzMjYzNywxOTU2NDQwMTgwLDUyMjI3MjI4NywxMjcyODEzMTMxLDMxODUzMzY3NjUsMjM0MDgxODMxNSwyMzIzOTc2MDc0LDE4ODg1NDI4MzIsMTA0NDU0NDU3NCwzMDQ5NTUwMjYxLDE3MjI0Njk0NzgsMTIyMjE1MjI2NCw1MDY2MDg2Nyw0MTI3MzI0MTUwLDIzNjA2Nzg1NCwxNjM4MTIyMDgxLDg5NTQ0NTU1NywxNDc1OTgwODg3LDMxMTc0NDM1MTMsMjI1NzY1NTY4NiwzMjQzODA5MjE3LDQ4OTExMDA0NSwyNjYyOTM0NDMwLDM3Nzg1OTkzOTMsNDE2MjA1NTE2MCwyNTYxODc4OTM2LDI4ODU2MzcyOSwxNzczOTE2Nzc3LDM2NDgwMzkzODUsMjM5MTM0NTAzOCwyNDkzOTg1Njg0LDI2MTI0MDc3MDcsNTA1NTYwMDk0LDIyNzQ0OTc5MjcsMzkxMTI0MDE2OSwzNDYwOTI1MzkwLDE0NDI4MTg2NDUsNjc4OTczNDgwLDM3NDkzNTcwMjMsMjM1ODE4Mjc5NiwyNzE3NDA3NjQ5LDIzMDY4Njk2NDEsMjE5NjE3ODA1LDMyMTg3NjExNTEsMzg2MjAyNjIxNCwxMTIwMzA2MjQyLDE3NTY5NDI0NDAsMTEwMzMzMTkwNSwyNTc4NDU5MDMzLDc2Mjc5NjU4OSwyNTI3ODAwNDcsMjk2NjEyNTQ4OCwxNDI1ODQ0MzA4LDMxNTEzOTIxODcsMzcyOTExMTI2XTt2YXIgVDQ9WzE2Njc0NzQ4ODYsMjA4ODUzNTI4OCwyMDA0MzI2ODk0LDIwNzE2OTQ4MzgsNDA3NTk0OTU2NywxODAyMjIzMDYyLDE4Njk1OTEwMDYsMzMxODA0Mzc5Myw4MDg0NzI2NzIsMTY4NDM1MjIsMTczNDg0NjkyNiw3MjQyNzA0MjIsNDI3ODA2NTYzOSwzNjIxMjE2OTQ5LDI4ODAxNjk1NDksMTk4NzQ4NDM5NiwzNDAyMjUzNzExLDIxODk1OTc5ODMsMzM4NTQwOTY3MywyMTA1Mzc4ODEwLDQyMTA2OTM2MTUsMTQ5OTA2NTI2NiwxMTk1ODg2OTkwLDQwNDIyNjM1NDcsMjkxMzg1NjU3NywzNTcwNjg5OTcxLDI3Mjg1OTA2ODcsMjk0NzU0MTU3MywyNjI3NTE4MjQzLDI3NjIyNzQ2NDMsMTkyMDExMjM1NiwzMjMzODMxODM1LDMwODIyNzMzOTcsNDI2MTIyMzY0OSwyNDc1OTI5MTQ5LDY0MDA1MTc4OCw5MDk1MzE3NTYsMTA2MTExMDE0Miw0MTYwMTYwNTAxLDM0MzU5NDE3NjMsODc1ODQ2NzYwLDI3NzkxMTY2MjUsMzg1NzAwMzcyOSw0MDU5MTA1NTI5LDE5MDMyNjg4MzQsMzYzODA2NDA0Myw4MjUzMTYxOTQsMzUzNzEzOTYyLDY3Mzc0MDg4LDMzNTE3Mjg3ODksNTg5NTIyMjQ2LDMyODQzNjA4NjEsNDA0MjM2MzM2LDI1MjY0NTQwNzEsODQyMTc2MTAsMjU5MzgzMDE5MSwxMTc5MDE1ODIsMzAzMTgzMzk2LDIxNTU5MTE5NjMsMzgwNjQ3Nzc5MSwzOTU4MDU2NjUzLDY1Njg5NDI4NiwyOTk4MDYyNDYzLDE5NzA2NDI5MjIsMTUxNTkxNjk4LDIyMDY0NDA5ODksNzQxMTEwODcyLDQzNzkyMzM4MCw0NTQ3NjU4NzgsMTg1Mjc0ODUwOCwxNTE1OTA4Nzg4LDI2OTQ5MDQ2NjcsMTM4MTE2ODgwNCw5OTM3NDIxOTgsMzYwNDM3Mzk0MywzMDE0OTA1NDY5LDY5MDU4NDQwMiwzODIzMzIwNzk3LDc5MTYzODM2NiwyMjIzMjgxOTM5LDEzOTgwMTEzMDIsMzUyMDE2MTk3NywwLDM5OTE3NDM2ODEsNTM4OTkyNzA0LDQyNDQzODE2NjcsMjk4MTIxODQyNSwxNTMyNzUxMjg2LDE3ODUzODA1NjQsMzQxOTA5NjcxNywzMjAwMTc4NTM1LDk2MDA1NjE3OCwxMjQ2NDIwNjI4LDEyODAxMDM1NzYsMTQ4MjIyMTc0NCwzNDg2NDY4NzQxLDM1MDMzMTk5OTUsNDAyNTQyODY3NywyODYzMzI2NTQzLDQyMjc1MzY2MjEsMTEyODUxNDk1MCwxMjk2OTQ3MDk4LDg1OTAwMjIxNCwyMjQwMTIzOTIxLDExNjIyMDMwMTgsNDE5Mzg0OTU3NywzMzY4NzA0NCwyMTM5MDYyNzgyLDEzNDc0ODE3NjAsMTAxMDU4MjY0OCwyNjc4MDQ1MjIxLDI4Mjk2NDA1MjMsMTM2NDMyNTI4MiwyNzQ1NDMzNjkzLDEwNzc5ODU0MDgsMjQwODU0ODg2OSwyNDU5MDg2MTQzLDI2NDQzNjAyMjUsOTQzMjEyNjU2LDQxMjY0NzU1MDUsMzE2NjQ5NDU2MywzMDY1NDMwMzkxLDM2NzE3NTAwNjMsNTU1ODM2MjI2LDI2OTQ5NjM1Miw0Mjk0OTA4NjQ1LDQwOTI3OTI1NzMsMzUzNzAwNjAxNSwzNDUyNzgzNzQ1LDIwMjExODE2OCwzMjAwMjU4OTQsMzk3NDkwMTY5OSwxNjAwMTE5MjMwLDI1NDMyOTcwNzcsMTE0NTM1OTQ5NiwzODczOTc5MzQsMzMwMTIwMTgxMSwyODEyODAxNjIxLDIxMjIyMjAyODQsMTAyNzQyNjE3MCwxNjg0MzE5NDMyLDE1NjY0MzUyNTgsNDIxMDc5ODU4LDE5MzY5NTQ4NTQsMTYxNjk0NTM0NCwyMTcyNzUzOTQ1LDEzMzA2MzEwNzAsMzcwNTQzODExNSw1NzI2Nzk3NDgsNzA3NDI3OTI0LDI0MjU0MDAxMjMsMjI5MDY0NzgxOSwxMTc5MDQ0NDkyLDQwMDg1ODU2NzEsMzA5OTEyMDQ5MSwzMzY4NzA0NDAsMzczOTEyMjA4NywxNTgzMjc2NzMyLDE4NTI3NzcxOCwzNjg4NTkzMDY5LDM3NzI3OTE3NzEsODQyMTU5NzE2LDk3Njg5OTcwMCwxNjg0MzUyMjAsMTIyOTU3NzEwNiwxMDEwNTkwODQsNjA2MzY2NzkyLDE1NDk1OTE3MzYsMzI2NzUxNzg1NSwzNTUzODQ5MDIxLDI4OTcwMTQ1OTUsMTY1MDYzMjM4OCwyNDQyMjQyMTA1LDI1MDk2MTIwODEsMzg0MDE2MTc0NywyMDM4MDA4ODE4LDM4OTA2ODg3MjUsMzM2ODU2NzY5MSw5MjYzNzQyNTQsMTgzNTkwNzAzNCwyMzc0ODYzODczLDM1ODc1MzE5NTMsMTMxMzc4ODU3MiwyODQ2NDgyNTA1LDE4MTkwNjM1MTIsMTQ0ODU0MDg0NCw0MTA5NjMzNTIzLDM5NDEyMTM2NDcsMTcwMTE2Mjk1NCwyMDU0ODUyMzQwLDI5MzA2OTg1NjcsMTM0NzQ4MTc2LDMxMzI4MDY1MTEsMjAyMTE2NTI5Niw2MjMyMTAzMTQsNzc0Nzk1ODY4LDQ3MTYwNjMyOCwyNzk1OTU4NjE1LDMwMzE3NDY0MTksMzMzNDg4NTc4MywzOTA3NTI3NjI3LDM3MjIyODAwOTcsMTk1Mzc5OTQwMCw1MjIxMzM4MjIsMTI2MzI2MzEyNiwzMTgzMzM2NTQ1LDIzNDExNzY4NDUsMjMyNDMzMzgzOSwxODg2NDI1MzEyLDEwNDQyNjc2NDQsMzA0ODU4ODQwMSwxNzE4MDA0NDI4LDEyMTI3MzM1ODQsNTA1Mjk1NDIsNDE0MzMxNzQ5NSwyMzU4MDMxNjQsMTYzMzc4ODg2Niw4OTI2OTAyODIsMTQ2NTM4MzM0MiwzMTE1OTYyNDczLDIyNTY5NjU5MTEsMzI1MDY3MzgxNyw0ODg0NDk4NTAsMjY2MTIwMjIxNSwzNzg5NjMzNzUzLDQxNzcwMDc1OTUsMjU2MDE0NDE3MSwyODYzMzk4NzQsMTc2ODUzNzA0MiwzNjU0OTA2MDI1LDIzOTE3MDU4NjMsMjQ5Mjc3MDA5OSwyNjEwNjczMTk3LDUwNTI5MTMyNCwyMjczODA4OTE3LDM5MjQzNjk2MDksMzQ2OTYyNTczNSwxNDMxNjk5MzcwLDY3Mzc0MDg4MCwzNzU1OTY1MDkzLDIzNTgwMjE4OTEsMjcxMTc0NjY0OSwyMzA3NDg5ODAxLDIxODk2MTY5MCwzMjE3MDIxNTQxLDM4NzM4NDU3MTksMTExMTY3MjQ1MiwxNzUxNjkzNTIwLDEwOTQ4Mjg5MzAsMjU3Njk4NjE1Myw3NTc5NTQzOTQsMjUyNjQ1NjYyLDI5NjQzNzY0NDMsMTQxNDg1NTg0OCwzMTQ5NjQ5NTE3LDM3MDU1NTQzNl07dmFyIFQ1PVsxMzc0OTg4MTEyLDIxMTgyMTQ5OTUsNDM3NzU3MTIzLDk3NTY1ODY0NiwxMDAxMDg5OTk1LDUzMDQwMDc1MywyOTAyMDg3ODUxLDEyNzMxNjg3ODcsNTQwMDgwNzI1LDI5MTAyMTk3NjYsMjI5NTEwMTA3Myw0MTEwNTY4NDg1LDEzNDA0NjMxMDAsMzMwNzkxNjI0Nyw2NDEwMjUxNTIsMzA0MzE0MDQ5NSwzNzM2MTY0OTM3LDYzMjk1MzcwMywxMTcyOTY3MDY0LDE1NzY5NzY2MDksMzI3NDY2NzI2NiwyMTY5MzAzMDU4LDIzNzAyMTM3OTUsMTgwOTA1NDE1MCw1OTcyNzg0NywzNjE5Mjk4NzcsMzIxMTYyMzE0NywyNTA1MjAyMTM4LDM1NjkyNTUyMTMsMTQ4NDAwNTg0MywxMjM5NDQzNzUzLDIzOTU1ODg2NzYsMTk3NTY4MzQzNCw0MTAyOTc3OTEyLDI1NzI2OTcxOTUsNjY2NDY0NzMzLDMyMDI0MzcwNDYsNDAzNTQ4OTA0NywzMzc0MzYxNzAyLDIxMTA2Njc0NDQsMTY3NTU3Nzg4MCwzODQzNjk5MDc0LDI1Mzg2ODExODQsMTY0OTYzOTIzNywyOTc2MTUxNTIwLDMxNDQzOTY0MjAsNDI2OTkwNzk5Niw0MTc4MDYyMjI4LDE4ODM3OTM0OTYsMjQwMzcyODY2NSwyNDk3NjA0NzQzLDEzODM4NTYzMTEsMjg3NjQ5NDYyNywxOTE3NTE4NTYyLDM4MTA0OTYzNDMsMTcxNjg5MDQxMCwzMDAxNzU1NjU1LDgwMDQ0MDgzNSwyMjYxMDg5MTc4LDM1NDM1OTkyNjksODA3OTYyNjEwLDU5OTc2MjM1NCwzMzc3ODM2MiwzOTc3Njc1MzU2LDIzMjg4Mjg5NzEsMjgwOTc3MTE1NCw0MDc3Mzg0NDMyLDEzMTU1NjIxNDUsMTcwODg0ODMzMywxMDEwMzk4MjksMzUwOTg3MTEzNSwzMjk5Mjc4NDc0LDg3NTQ1MTI5MywyNzMzODU2MTYwLDkyOTg3Njk4LDI3Njc2NDU1NTcsMTkzMTk1MDY1LDEwODAwOTQ2MzQsMTU4NDUwNDU4MiwzMTc4MTA2OTYxLDEwNDIzODU2NTcsMjUzMTA2NzQ1MywzNzExODI5NDIyLDEzMDY5NjczNjYsMjQzODIzNzYyMSwxOTA4Njk0Mjc3LDY3NTU2NDYzLDE2MTU4NjEyNDcsNDI5NDU2MTY0LDM2MDI3NzAzMjcsMjMwMjY5MDI1MiwxNzQyMzE1MTI3LDI5NjgwMTE0NTMsMTI2NDU0NjY0LDM4NzcxOTg2NDgsMjA0MzIxMTQ4MywyNzA5MjYwODcxLDIwODQ3MDQyMzMsNDE2OTQwODIwMSwwLDE1OTQxNzk4Nyw4NDE3Mzk1OTIsNTA0NDU5NDM2LDE4MTc4NjY4MzAsNDI0NTYxODY4MywyNjAzODg5NTAsMTAzNDg2Nzk5OCw5MDg5MzM0MTUsMTY4ODEwODUyLDE3NTA5MDIzMDUsMjYwNjQ1Mzk2OSw2MDc1MzA1NTQsMjAyMDA4NDk3LDI0NzIwMTE1MzUsMzAzNTUzNTA1OCw0NjMxODAxOTAsMjE2MDExNzA3MSwxNjQxODE2MjI2LDE1MTc3Njc1MjksNDcwOTQ4Mzc0LDM4MDEzMzIyMzQsMzIzMTcyMjIxMywxMDA4OTE4NTk1LDMwMzc2NTI3NywyMzU0NzQxODcsNDA2OTI0Njg5Myw3NjY5NDU0NjUsMzM3NTUzODY0LDE0NzU0MTg1MDEsMjk0MzY4MjM4MCw0MDAzMDYxMTc5LDI3NDMwMzQxMDksNDE0NDA0Nzc3NSwxNTUxMDM3ODg0LDExNDc1NTA2NjEsMTU0MzIwODUwMCwyMzM2NDM0NTUwLDM0MDgxMTk1MTYsMzA2OTA0OTk2MCwzMTAyMDExNzQ3LDM2MTAzNjkyMjYsMTExMzgxODM4NCwzMjg2NzE4MDgsMjIyNzU3MzAyNCwyMjM2MjI4NzMzLDM1MzU0ODY0NTYsMjkzNTU2Njg2NSwzMzQxMzk0Mjg1LDQ5NjkwNjA1OSwzNzAyNjY1NDU5LDIyNjkwNjg2MCwyMDA5MTk1NDcyLDczMzE1Njk3MiwyODQyNzM3MDQ5LDI5NDkzMDY4MiwxMjA2NDc3ODU4LDI4MzUxMjMzOTYsMjcwMDA5OTM1NCwxNDUxMDQ0MDU2LDU3MzgwNDc4MywyMjY5NzI4NDU1LDM2NDQzNzk1ODUsMjM2MjA5MDIzOCwyNTY0MDMzMzM0LDI4MDExMDc0MDcsMjc3NjI5MjkwNCwzNjY5NDYyNTY2LDEwNjgzNTEzOTYsNzQyMDM5MDEyLDEzNTAwNzg5ODksMTc4NDY2MzE5NSwxNDE3NTYxNjk4LDQxMzY0NDA3NzAsMjQzMDEyMjIxNiw3NzU1NTA4MTQsMjE5Mzg2MjY0NSwyNjczNzA1MTUwLDE3NzUyNzY5MjQsMTg3NjI0MTgzMywzNDc1MzEzMzMxLDMzNjY3NTQ2MTksMjcwMDQwNDg3LDM5MDI1NjMxODIsMzY3ODEyNDkyMywzNDQxODUwMzc3LDE4NTEzMzI4NTIsMzk2OTU2MjM2OSwyMjAzMDMyMjMyLDM4Njg1NTI4MDUsMjg2ODg5NzQwNiw1NjYwMjE4OTYsNDAxMTE5MDUwMiwzMTM1NzQwODg5LDEyNDg4MDI1MTAsMzkzNjI5MTI4NCw2OTk0MzIxNTAsODMyODc3MjMxLDcwODc4MDg0OSwzMzMyNzQwMTQ0LDg5OTgzNTU4NCwxOTUxMzE3MDQ3LDQyMzY0Mjk5OTAsMzc2NzU4Njk5Miw4NjY2Mzc4NDUsNDA0MzYxMDE4NiwxMTA2MDQxNTkxLDIxNDQxNjE4MDYsMzk1NDQxNzExLDE5ODQ4MTI2ODUsMTEzOTc4MTcwOSwzNDMzNzEyOTgwLDM4MzUwMzY4OTUsMjY2NDU0MzcxNSwxMjgyMDUwMDc1LDMyNDA4OTQzOTIsMTE4MTA0NTExOSwyNjQwMjQzMjA0LDI1OTY1OTE3LDQyMDMxODExNzEsNDIxMTgxODc5OCwzMDA5ODc5Mzg2LDI0NjM4Nzk3NjIsMzkxMDE2MTk3MSwxODQyNzU5NDQzLDI1OTc4MDY0NzYsOTMzMzAxMzcwLDE1MDk0MzA0MTQsMzk0MzkwNjQ0MSwzNDY3MTkyMzAyLDMwNzY2MzkwMjksMzc3Njc2NzQ2OSwyMDUxNTE4NzgwLDI2MzEwNjU0MzMsMTQ0MTk1MjU3NSw0MDQwMTY3NjEsMTk0MjQzNTc3NSwxNDA4NzQ5MDM0LDE2MTA0NTk3MzksMzc0NTM0NTMwMCwyMDE3Nzc4NTY2LDM0MDA1Mjg3NjksMzExMDY1MDk0Miw5NDE4OTY3NDgsMzI2NTQ3ODc1MSwzNzEwNDkzMzAsMzE2ODkzNzIyOCw2NzUwMzk2MjcsNDI3OTA4MDI1Nyw5NjczMTE3MjksMTM1MDUwMjA2LDM2MzU3MzM2NjAsMTY4MzQwNzI0OCwyMDc2OTM1MjY1LDM1NzY4NzA1MTIsMTIxNTA2MTEwOCwzNTAxNzQxODkwXTt2YXIgVDY9WzEzNDc1NDgzMjcsMTQwMDc4MzIwNSwzMjczMjY3MTA4LDI1MjAzOTM1NjYsMzQwOTY4NTM1NSw0MDQ1MzgwOTMzLDI4ODAyNDAyMTYsMjQ3MTIyNDA2NywxNDI4MTczMDUwLDQxMzg1NjMxODEsMjQ0MTY2MTU1OCw2MzY4MTM5MDAsNDIzMzA5NDYxNSwzNjIwMDIyOTg3LDIxNDk5ODc2NTIsMjQxMTAyOTE1NSwxMjM5MzMxMTYyLDE3MzA1MjU3MjMsMjU1NDcxODczNCwzNzgxMDMzNjY0LDQ2MzQ2MTAxLDMxMDQ2MzcyOCwyNzQzOTQ0ODU1LDMzMjg5NTUzODUsMzg3NTc3MDIwNywyNTAxMjE4OTcyLDM5NTUxOTExNjIsMzY2NzIxOTAzMyw3Njg5MTcxMjMsMzU0NTc4OTQ3Myw2OTI3MDc0MzMsMTE1MDIwODQ1NiwxNzg2MTAyNDA5LDIwMjkyOTMxNzcsMTgwNTIxMTcxMCwzNzEwMzY4MTEzLDMwNjU5NjI4MzEsNDAxNjM5NTk3LDE3MjQ0NTcxMzIsMzAyODE0MzY3NCw0MDkxOTg0MTAsMjE5NjA1MjUyOSwxNjIwNTI5NDU5LDExNjQwNzE4MDcsMzc2OTcyMTk3NSwyMjI2ODc1MzEwLDQ4NjQ0MTM3NiwyNDk5MzQ4NTIzLDE0ODM3NTM1NzYsNDI4ODE5OTY1LDIyNzQ2ODA0MjgsMzA3NTYzNjIxNiw1OTg0Mzg4NjcsMzc5OTE0MTEyMiwxNDc0NTAyNTQzLDcxMTM0OTY3NSwxMjkxNjYxMjAsNTM0NTgzNzAsMjU5MjUyMzY0MywyNzgyMDgyODI0LDQwNjMyNDIzNzUsMjk4ODY4NzI2OSwzMTIwNjk0MTIyLDE1NTkwNDE2NjYsNzMwNTE3Mjc2LDI0NjA0NDkyMDQsNDA0MjQ1OTEyMiwyNzA2MjcwNjkwLDM0NDYwMDQ0NjgsMzU3Mzk0MTY5NCw1MzM4MDQxMzAsMjMyODE0MzYxNCwyNjM3NDQyNjQzLDI2OTUwMzM2ODUsODM5MjI0MDMzLDE5NzM3NDUzODcsOTU3MDU1OTgwLDI4NTYzNDU4MzksMTA2ODUyNzY3LDEzNzEzNjg5NzYsNDE4MTU5ODYwMiwxMDMzMjk3MTU4LDI5MzM3MzQ5MTcsMTE3OTUxMDQ2MSwzMDQ2MjAwNDYxLDkxMzQxOTE3LDE4NjI1MzQ4NjgsNDI4NDUwMjAzNyw2MDU2NTczMzksMjU0NzQzMjkzNywzNDMxNTQ2OTQ3LDIwMDMyOTQ2MjIsMzE4MjQ4NzYxOCwyMjgyMTk1MzM5LDk1NDY2OTQwMywzNjgyMTkxNTk4LDEyMDE3NjUzODYsMzkxNzIzNDcwMywzMzg4NTA3MTY2LDAsMjE5ODQzODAyMiwxMjExMjQ3NTk3LDI4ODc2NTE2OTYsMTMxNTcyMzg5MCw0MjI3NjY1NjYzLDE0NDM4NTc3MjAsNTA3MzU4OTMzLDY1Nzg2MTk0NSwxNjc4MzgxMDE3LDU2MDQ4NzU5MCwzNTE2NjE5NjA0LDk3NTQ1MTY5NCwyOTcwMzU2MzI3LDI2MTMxNDUzNSwzNTM1MDcyOTE4LDI2NTI2MDk0MjUsMTMzMzgzODAyMSwyNzI0MzIyMzM2LDE3Njc1MzY0NTksMzcwOTM4Mzk0LDE4MjYyMTExNCwzODU0NjA2Mzc4LDExMjgwMTQ1NjAsNDg3NzI1ODQ3LDE4NTQ2OTE5NywyOTE4MzUzODYzLDMxMDY3ODA4NDAsMzM1Njc2MTc2OSwyMjM3MTMzMDgxLDEyODY1NjcxNzUsMzE1Mjk3NjM0OSw0MjU1MzUwNjI0LDI2ODM3NjUwMzAsMzE2MDE3NTM0OSwzMzA5NTk0MTcxLDg3ODQ0MzM5MCwxOTg4ODM4MTg1LDM3MDQzMDA0ODYsMTc1NjgxODk0MCwxNjczMDYxNjE3LDM0MDMxMDA2MzYsMjcyNzg2MzA5LDEwNzUwMjU2OTgsNTQ1NTcyMzY5LDIxMDU4ODcyNjgsNDE3NDU2MDA2MSwyOTY2Nzk3MzAsMTg0MTc2ODg2NSwxMjYwMjMyMjM5LDQwOTEzMjcwMjQsMzk2MDMwOTMzMCwzNDk3NTA5MzQ3LDE4MTQ4MDMyMjIsMjU3ODAxODQ4OSw0MTk1NDU2MDcyLDU3NTEzODE0OCwzMjk5NDA5MDM2LDQ0Njc1NDg3OSwzNjI5NTQ2Nzk2LDQwMTE5OTYwNDgsMzM0NzUzMjExMCwzMjUyMjM4NTQ1LDQyNzA2Mzk3NzgsOTE1OTg1NDE5LDM0ODM4MjU1MzcsNjgxOTMzNTM0LDY1MTg2ODA0NiwyNzU1NjM2NjcxLDM4MjgxMDM4MzcsMjIzMzc3NTU0LDI2MDc0Mzk4MjAsMTY0OTcwNDUxOCwzMjcwOTM3ODc1LDM5MDE4MDY3NzYsMTU4MDA4Nzc5OSw0MTE4OTg3Njk1LDMxOTgxMTUyMDAsMjA4NzMwOTQ1OSwyODQyNjc4NTczLDMwMTY2OTcxMDYsMTAwMzAwNzEyOSwyODAyODQ5OTE3LDE4NjA3MzgxNDcsMjA3Nzk2NTI0MywxNjQ0Mzk2NzIsNDEwMDg3MjQ3MiwzMjI4MzMxOSwyODI3MTc3ODgyLDE3MDk2MTAzNTAsMjEyNTEzNTg0NiwxMzY0Mjg3NTEsMzg3NDQyODM5MiwzNjUyOTA0ODU5LDM0NjA5ODQ2MzAsMzU3MjE0NTkyOSwzNTkzMDU2MzgwLDI5MzkyNjYyMjYsODI0ODUyMjU5LDgxODMyNDg4NCwzMjI0NzQwNDU0LDkzMDM2OTIxMiwyODAxNTY2NDEwLDI5Njc1MDcxNTIsMzU1NzA2ODQwLDEyNTczMDkzMzYsNDE0ODI5MjgyNiwyNDMyNTY2NTYsNzkwMDczODQ2LDIzNzMzNDA2MzAsMTI5NjI5NzkwNCwxNDIyNjk5MDg1LDM3NTYyOTk3ODAsMzgxODgzNjQwNSw0NTc5OTI4NDAsMzA5OTY2NzQ4NywyMTM1MzE5ODg5LDc3NDIyMzE0LDE1NjAzODI1MTcsMTk0NTc5ODUxNiw3ODgyMDQzNTMsMTUyMTcwNjc4MSwxMzg1MzU2MjQyLDg3MDkxMjA4NiwzMjU5NjUzODMsMjM1ODk1NzkyMSwyMDUwNDY2MDYwLDIzODgyNjA4ODQsMjMxMzg4NDQ3Niw0MDA2NTIxMTI3LDkwMTIxMDU2OSwzOTkwOTUzMTg5LDEwMTQ2NDY3MDUsMTUwMzQ0OTgyMywxMDYyNTk3MjM1LDIwMzE2MjEzMjYsMzIxMjAzNTg5NSwzOTMxMzcxNDY5LDE1MzMwMTc1MTQsMzUwMTc0NTc1LDIyNTYwMjg4OTEsMjE3NzU0NDE3OSwxMDUyMzM4MzcyLDc0MTg3Njc4OCwxNjA2NTkxMjk2LDE5MTQwNTIwMzUsMjEzNzA1MjUzLDIzMzQ2Njk4OTcsMTEwNzIzNDE5NywxODk5NjAzOTY5LDM3MjUwNjk0OTEsMjYzMTQ0Nzc4MCwyNDIyNDk0OTEzLDE2MzU1MDI5ODAsMTg5MzAyMDM0MiwxOTUwOTAzMzg4LDExMjA5NzQ5MzVdO3ZhciBUNz1bMjgwNzA1ODkzMiwxNjk5OTcwNjI1LDI3NjQyNDk2MjMsMTU4NjkwMzU5MSwxODA4NDgxMTk1LDExNzM0MzAxNzMsMTQ4NzY0NTk0Niw1OTk4NDg2Nyw0MTk5ODgyODAwLDE4NDQ4ODI4MDYsMTk4OTI0OTIyOCwxMjc3NTU1OTcwLDM2MjM2MzY5NjUsMzQxOTkxNTU2MiwxMTQ5MjQ5MDc3LDI3NDQxMDQyOTAsMTUxNDc5MDU3Nyw0NTk3NDQ2OTgsMjQ0ODYwMzk0LDMyMzU5OTUxMzQsMTk2MzExNTMxMSw0MDI3NzQ0NTg4LDI1NDQwNzgxNTAsNDE5MDUzMDUxNSwxNjA4OTc1MjQ3LDI2MjcwMTYwODIsMjA2MjI3MDMxNywxNTA3NDk3Mjk4LDIyMDA4MTg4NzgsNTY3NDk4ODY4LDE3NjQzMTM1NjgsMzM1OTkzNjIwMSwyMzA1NDU1NTU0LDIwMzc5NzAwNjIsMTA0NzIzOWUzLDE5MTAzMTkwMzMsMTMzNzM3NjQ4MSwyOTA0MDI3MjcyLDI4OTI0MTczMTIsOTg0OTA3MjE0LDEyNDMxMTI0MTUsODMwNjYxOTE0LDg2MTk2ODIwOSwyMTM1MjUzNTg3LDIwMTEyMTQxODAsMjkyNzkzNDMxNSwyNjg2MjU0NzIxLDczMTE4MzM2OCwxNzUwNjI2Mzc2LDQyNDYzMTA3MjUsMTgyMDgyNDc5OCw0MTcyNzYzNzcxLDM1NDIzMzAyMjcsNDgzOTQ4MjcsMjQwNDkwMTY2MywyODcxNjgyNjQ1LDY3MTU5MzE5NSwzMjU0OTg4NzI1LDIwNzM3MjQ2MTMsMTQ1MDg1MjM5LDIyODA3OTYyMDAsMjc3OTkxNTE5OSwxNzkwNTc1MTA3LDIxODcxMjgwODYsNDcyNjE1NjMxLDMwMjk1MTAwMDksNDA3NTg3NzEyNywzODAyMjIyMTg1LDQxMDcxMDE2NTgsMzIwMTYzMTc0OSwxNjQ2MjUyMzQwLDQyNzA1MDcxNzQsMTQwMjgxMTQzOCwxNDM2NTkwODM1LDM3NzgxNTE4MTgsMzk1MDM1NTcwMiwzOTYzMTYxNDc1LDQwMjA5MTIyMjQsMjY2Nzk5NDczNywyNzM3OTIzNjYsMjMzMTU5MDE3NywxMDQ2OTk2MTMsOTUzNDU5ODIsMzE3NTUwMTI4NiwyMzc3NDg2Njc2LDE1NjA2Mzc4OTIsMzU2NDA0NTMxOCwzNjkwNTc4NzIsNDIxMzQ0NzA2NCwzOTE5MDQyMjM3LDExMzc0Nzc5NTIsMjY1ODYyNTQ5NywxMTE5NzI3ODQ4LDIzNDA5NDc4NDksMTUzMDQ1NTgzMyw0MDA3MzYwOTY4LDE3MjQ2NjU1NiwyNjY5NTk5MzgsNTE2NTUyODM2LDAsMjI1NjczNDU5MiwzOTgwOTMxNjI3LDE4OTAzMjgwODEsMTkxNzc0MjE3MCw0Mjk0NzA0Mzk4LDk0NTE2NDE2NSwzNTc1NTI4ODc4LDk1ODg3MTA4NSwzNjQ3MjEyMDQ3LDI3ODcyMDcyNjAsMTQyMzAyMjkzOSw3NzU1NjIyOTQsMTczOTY1NjIwMiwzODc2NTU3NjU1LDI1MzAzOTEyNzgsMjQ0MzA1ODA3NSwzMzEwMzIxODU2LDU0NzUxMjc5NiwxMjY1MTk1NjM5LDQzNzY1NjU5NCwzMTIxMjc1NTM5LDcxOTcwMDEyOCwzNzYyNTAyNjkwLDM4Nzc4MTE0NywyMTg4MjgyOTcsMzM1MDA2NTgwMywyODMwNzA4MTUwLDI4NDg0NjE4NTQsNDI4MTY5MjAxLDEyMjQ2NjE2NSwzNzIwMDgxMDQ5LDE2MjcyMzUxOTksNjQ4MDE3NjY1LDQxMjI3NjIzNTQsMTAwMjc4Mzg0NiwyMTE3MzYwNjM1LDY5NTYzNDc1NSwzMzM2MzU4NjkxLDQyMzQ3MjEwMDUsNDA0OTg0NDQ1MiwzNzA0MjgwODgxLDIyMzI0MzUyOTksNTc0NjI0NjYzLDI4NzM0MzgxNCw2MTIyMDU4OTgsMTAzOTcxNzA1MSw4NDAwMTk3MDUsMjcwODMyNjE4NSw3OTM0NTE5MzQsODIxMjg4MTE0LDEzOTEyMDE2NzAsMzgyMjA5MDE3NywzNzYxODc4MjcsMzExMzg1NTM0NCwxMjI0MzQ4MDUyLDE2Nzk5NjgyMzMsMjM2MTY5ODU1NiwxMDU4NzA5NzQ0LDc1MjM3NTQyMSwyNDMxNTkwOTYzLDEzMjE2OTkxNDUsMzUxOTE0MjIwMCwyNzM0NTkxMTc4LDE4ODEyNzQ0NCwyMTc3ODY5NTU3LDM3MjcyMDU3NTQsMjM4NDkxMTAzMSwzMjE1MjEyNDYxLDI2NDg5NzY0NDIsMjQ1MDM0NjEwNCwzNDMyNzM3Mzc1LDExODA4NDkyNzgsMzMxNTQ0MjA1LDMxMDIyNDkxNzYsNDE1MDE0NDU2OSwyOTUyMTAyNTk1LDIxNTk5NzYyODUsMjQ3NDQwNDMwNCw3NjYwNzg5MzMsMzEzNzczODYxLDI1NzA4MzIwNDQsMjEwODEwMDYzMiwxNjY4MjEyODkyLDMxNDU0NTY0NDMsMjAxMzkwODI2Miw0MTg2NzIyMTcsMzA3MDM1NjYzNCwyNTk0NzM0OTI3LDE4NTIxNzE5MjUsMzg2NzA2MDk5MSwzNDczNDE2NjM2LDM5MDc0NDg1OTcsMjYxNDczNzYzOSw5MTk0ODkxMzUsMTY0OTQ4NjM5LDIwOTQ0MTAxNjAsMjk5NzgyNTk1Niw1OTA0MjQ2MzksMjQ4NjIyNDU0OSwxNzIzODcyNjc0LDMxNTc3NTA4NjIsMzM5OTk0MTI1MCwzNTAxMjUyNzUyLDM2MjUyNjgxMzUsMjU1NTA0ODE5NiwzNjczNjM3MzU2LDEzNDMxMjc1MDEsNDEzMDI4MTM2MSwzNTk5NTk1MDg1LDI5NTc4NTM2NzksMTI5NzQwMzA1MCw4MTc4MTkxMCwzMDUxNTkzNDI1LDIyODM0OTA0MTAsNTMyMjAxNzcyLDEzNjcyOTU1ODksMzkyNjE3MDk3NCw4OTUyODc2OTIsMTk1Mzc1NzgzMSwxMDkzNTk3OTYzLDQ5MjQ4MzQzMSwzNTI4NjI2OTA3LDE0NDYyNDI1NzYsMTE5MjQ1NTYzOCwxNjM2NjA0NjMxLDIwOTMzNjIyNSwzNDQ4NzM0NjQsMTAxNTY3MTU3MSw2Njk5NjE4OTcsMzM3NTc0MDc2OSwzODU3NTcyMTI0LDI5NzM1MzA2OTUsMzc0NzE5MjAxOCwxOTMzNTMwNjEwLDM0NjQwNDI1MTYsOTM1MjkzODk1LDM0NTQ2ODYxOTksMjg1ODExNTA2OSwxODYzNjM4ODQ1LDM2ODMwMjI5MTYsNDA4NTM2OTUxOSwzMjkyNDQ1MDMyLDg3NTMxMzE4OCwxMDgwMDE3NTcxLDMyNzkwMzM4ODUsNjIxNTkxNzc4LDEyMzM4NTY1NzIsMjUwNDEzMDMxNywyNDE5NzU0NCwzMDE3NjcyNzE2LDM4MzU0ODQzNDAsMzI0NzQ2NTU1OCwyMjIwOTgxMTk1LDMwNjA4NDc5MjIsMTU1MTEyNDU4OCwxNDYzOTk2NjAwXTt2YXIgVDg9WzQxMDQ2MDU3NzcsMTA5NzE1OTU1MCwzOTY2NzM4MTgsNjYwNTEwMjY2LDI4NzU5NjgzMTUsMjYzODYwNjYyMyw0MjAwMTE1MTE2LDM4MDg2NjIzNDcsODIxNzEyMTYwLDE5ODY5MTgwNjEsMzQzMDMyMjU2OCwzODU0NDg4NSwzODU2MTM3Mjk1LDcxODAwMjExNyw4OTM2ODE3MDIsMTY1NDg4NjMyNSwyOTc1NDg0MzgyLDMxMjIzNTgwNTMsMzkyNjgyNTAyOSw0Mjc0MDUzNDY5LDc5NjE5NzU3MSwxMjkwODAxNzkzLDExODQzNDI5MjUsMzU1NjM2MTgzNSwyNDA1NDI2OTQ3LDI0NTk3MzUzMTcsMTgzNjc3MjI4NywxMzgxNjIwMzczLDMxOTYyNjc5ODgsMTk0ODM3Mzg0OCwzNzY0OTg4MjMzLDMzODUzNDUxNjYsMzI2Mzc4NTU4OSwyMzkwMzI1NDkyLDE0ODA0ODU3ODUsMzExMTI0NzE0MywzNzgwMDk3NzI2LDIyOTMwNDUyMzIsNTQ4MTY5NDE3LDM0NTk5NTM3ODksMzc0NjE3NTA3NSw0Mzk0NTIzODksMTM2MjMyMTU1OSwxNDAwODQ5NzYyLDE2ODU1Nzc5MDUsMTgwNjU5OTM1NSwyMTc0NzU0MDQ2LDEzNzA3MzkxMywxMjE0Nzk3OTM2LDExNzQyMTUwNTUsMzczMTY1NDU0OCwyMDc5ODk3NDI2LDE5NDMyMTcwNjcsMTI1ODQ4MDI0Miw1Mjk0ODc4NDMsMTQzNzI4MDg3MCwzOTQ1MjY5MTcwLDMwNDkzOTA4OTUsMzMxMzIxMjAzOCw5MjMzMTM2MTksNjc5OTk4ZTMsMzIxNTMwNzI5OSw1NzMyNjA4MiwzNzc2NDIyMjEsMzQ3NDcyOTg2NiwyMDQxODc3MTU5LDEzMzM2MTkwNywxNzc2NDYwMTEwLDM2NzM0NzY0NTMsOTYzOTI0NTQsODc4ODQ1OTA1LDI4MDE2OTk1MjQsNzc3MjMxNjY4LDQwODI0NzUxNzAsMjMzMDAxNDIxMyw0MTQyNjI2MjEyLDIyMTMyOTYzOTUsMTYyNjMxOTQyNCwxOTA2MjQ3MjYyLDE4NDY1NjMyNjEsNTYyNzU1OTAyLDM3MDgxNzM3MTgsMTA0MDU1OTgzNywzODcxMTYzOTgxLDE0MTg1NzMyMDEsMzI5NDQzMDU3NywxMTQ1ODUzNDgsMTM0MzYxODkxMiwyNTY2NTk1NjA5LDMxODYyMDI1ODIsMTA3ODE4NTA5NywzNjUxMDQxMTI3LDM4OTY2ODgwNDgsMjMwNzYyMjkxOSw0MjU0MDg3NDMsMzM3MTA5Njk1MywyMDgxMDQ4NDgxLDExMDgzMzkwNjgsMjIxNjYxMDI5NiwwLDIxNTYyOTkwMTcsNzM2OTcwODAyLDI5MjU5Njc2NiwxNTE3NDQwNjIwLDI1MTY1NzIxMywyMjM1MDYxNzc1LDI5MzMyMDI0OTMsNzU4NzIwMzEwLDI2NTkwNTE2MiwxNTU0MzkxNDAwLDE1MzIyODUzMzksOTA4OTk5MjA0LDE3NDU2NzY5MiwxNDc0NzYwNTk1LDQwMDI4NjE3NDgsMjYxMDAxMTY3NSwzMjM0MTU2NDE2LDM2OTMxMjYyNDEsMjAwMTQzMDg3NCwzMDM2OTk0ODQsMjQ3ODQ0MzIzNCwyNjg3MTY1ODg4LDU4NTEyMjYyMCw0NTQ0OTk2MDIsMTUxODQ5NzQyLDIzNDUxMTkyMTgsMzA2NDUxMDc2NSw1MTQ0NDMyODQsNDA0NDk4MTU5MSwxOTYzNDEyNjU1LDI1ODE0NDU2MTQsMjEzNzA2MjgxOSwxOTMwODUzNSwxOTI4NzA3MTY0LDE3MTUxOTMxNTYsNDIxOTM1MjE1NSwxMTI2NzkwNzk1LDYwMDIzNTIxMSwzOTkyNzQyMDcwLDM4NDEwMjQ5NTIsODM2NTUzNDMxLDE2Njk2NjQ4MzQsMjUzNTYwNDI0MywzMzIzMDExMjA0LDEyNDM5MDU0MTMsMzE0MTQwMDc4Niw0MTgwODA4MTEwLDY5ODQ0NTI1NSwyNjUzODk5NTQ5LDI5ODk1NTI2MDQsMjI1MzU4MTMyNSwzMjUyOTMyNzI3LDMwMDQ1OTExNDcsMTg5MTIxMTY4OSwyNDg3ODEwNTc3LDM5MTU2NTM3MDMsNDIzNzA4MzgxNiw0MDMwNjY3NDI0LDIxMDAwOTA5NjYsODY1MTM2NDE4LDEyMjk4OTk2NTUsOTUzMjcwNzQ1LDMzOTk2Nzk2MjgsMzU1NzUwNDY2NCw0MTE4OTI1MjIyLDIwNjEzNzk3NDksMzA3OTU0NjU4NiwyOTE1MDE3NzkxLDk4MzQyNjA5MiwyMDIyODM3NTg0LDE2MDcyNDQ2NTAsMjExODU0MTkwOCwyMzY2ODgyNTUwLDM2MzU5OTY4MTYsOTcyNTEyODE0LDMyODMwODg3NzAsMTU2ODcxODQ5NSwzNDk5MzI2NTY5LDM1NzY1Mzk1MDMsNjIxOTgyNjcxLDI4OTU3MjM0NjQsNDEwODg3OTUyLDI2MjM3NjIxNTIsMTAwMjE0MjY4Myw2NDU0MDEwMzcsMTQ5NDgwNzY2MiwyNTk1Njg0ODQ0LDEzMzU1MzU3NDcsMjUwNzA0MDIzMCw0MjkzMjk1Nzg2LDMxNjc2ODQ2NDEsMzY3NTg1MDA3LDM4ODU3NTA3MTQsMTg2NTg2MjczMCwyNjY4MjIxNjc0LDI5NjA5NzEzMDUsMjc2MzE3MzY4MSwxMDU5MjcwOTU0LDI3Nzc5NTI0NTQsMjcyNDY0Mjg2OSwxMzIwOTU3ODEyLDIxOTQzMTkxMDAsMjQyOTU5NTg3MiwyODE1OTU2Mjc1LDc3MDg5NTIxLDM5NzM3NzMxMjEsMzQ0NDU3NTg3MSwyNDQ4ODMwMjMxLDEzMDU5MDY1NTAsNDAyMTMwODczOSwyODU3MTk0NzAwLDI1MTY5MDE4NjAsMzUxODM1ODQzMCwxNzg3MzA0NzgwLDc0MDI3NjQxNywxNjk5ODM5ODE0LDE1OTIzOTQ5MDksMjM1MjMwNzQ1NywyMjcyNTU2MDI2LDE4ODgyMTI0MywxNzI5OTc3MDExLDM2ODc5OTQwMDIsMjc0MDg0ODQxLDM1OTQ5ODIyNTMsMzYxMzQ5NDQyNiwyNzAxOTQ5NDk1LDQxNjIwOTY3MjksMzIyNzM0NTcxLDI4Mzc5NjY1NDIsMTY0MDU3NjQzOSw0ODQ4MzA2ODksMTIwMjc5NzY5MCwzNTM3ODUyODI4LDQwNjc2MzkxMjUsMzQ5MDc1NzM2LDMzNDIzMTk0NzUsNDE1NzQ2NzIxOSw0MjU1ODAwMTU5LDEwMzA2OTAwMTUsMTE1NTIzNzQ5NiwyOTUxOTcxMjc0LDE3NTc2OTE1NzcsNjA3Mzk4OTY4LDI3Mzg5MDUwMjYsNDk5MzQ3OTkwLDM3OTQwNzg5MDgsMTAxMTQ1MjcxMiwyMjc4ODU1NjcsMjgxODY2NjgwOSwyMTMxMTQzNzYsMzAzNDg4MTI0MCwxNDU1NTI1OTg4LDM0MTQ0NTA1NTUsODUwODE3MjM3LDE4MTc5OTg0MDgsMzA5MjcyNjQ4MF07dmFyIFUxPVswLDIzNTQ3NDE4Nyw0NzA5NDgzNzQsMzAzNzY1Mjc3LDk0MTg5Njc0OCw5MDg5MzM0MTUsNjA3NTMwNTU0LDcwODc4MDg0OSwxODgzNzkzNDk2LDIxMTgyMTQ5OTUsMTgxNzg2NjgzMCwxNjQ5NjM5MjM3LDEyMTUwNjExMDgsMTE4MTA0NTExOSwxNDE3NTYxNjk4LDE1MTc3Njc1MjksMzc2NzU4Njk5Miw0MDAzMDYxMTc5LDQyMzY0Mjk5OTAsNDA2OTI0Njg5MywzNjM1NzMzNjYwLDM2MDI3NzAzMjcsMzI5OTI3ODQ3NCwzNDAwNTI4NzY5LDI0MzAxMjIyMTYsMjY2NDU0MzcxNSwyMzYyMDkwMjM4LDIxOTM4NjI2NDUsMjgzNTEyMzM5NiwyODAxMTA3NDA3LDMwMzU1MzUwNTgsMzEzNTc0MDg4OSwzNjc4MTI0OTIzLDM1NzY4NzA1MTIsMzM0MTM5NDI4NSwzMzc0MzYxNzAyLDM4MTA0OTYzNDMsMzk3NzY3NTM1Niw0Mjc5MDgwMjU3LDQwNDM2MTAxODYsMjg3NjQ5NDYyNywyNzc2MjkyOTA0LDMwNzY2MzkwMjksMzExMDY1MDk0MiwyNDcyMDExNTM1LDI2NDAyNDMyMDQsMjQwMzcyODY2NSwyMTY5MzAzMDU4LDEwMDEwODk5OTUsODk5ODM1NTg0LDY2NjQ2NDczMyw2OTk0MzIxNTAsNTk3Mjc4NDcsMjI2OTA2ODYwLDUzMDQwMDc1MywyOTQ5MzA2ODIsMTI3MzE2ODc4NywxMTcyOTY3MDY0LDE0NzU0MTg1MDEsMTUwOTQzMDQxNCwxOTQyNDM1Nzc1LDIxMTA2Njc0NDQsMTg3NjI0MTgzMywxNjQxODE2MjI2LDI5MTAyMTk3NjYsMjc0MzAzNDEwOSwyOTc2MTUxNTIwLDMyMTE2MjMxNDcsMjUwNTIwMjEzOCwyNjA2NDUzOTY5LDIzMDI2OTAyNTIsMjI2OTcyODQ1NSwzNzExODI5NDIyLDM1NDM1OTkyNjksMzI0MDg5NDM5MiwzNDc1MzEzMzMxLDM4NDM2OTkwNzQsMzk0MzkwNjQ0MSw0MTc4MDYyMjI4LDQxNDQwNDc3NzUsMTMwNjk2NzM2NiwxMTM5NzgxNzA5LDEzNzQ5ODgxMTIsMTYxMDQ1OTczOSwxOTc1NjgzNDM0LDIwNzY5MzUyNjUsMTc3NTI3NjkyNCwxNzQyMzE1MTI3LDEwMzQ4Njc5OTgsODY2NjM3ODQ1LDU2NjAyMTg5Niw4MDA0NDA4MzUsOTI5ODc2OTgsMTkzMTk1MDY1LDQyOTQ1NjE2NCwzOTU0NDE3MTEsMTk4NDgxMjY4NSwyMDE3Nzc4NTY2LDE3ODQ2NjMxOTUsMTY4MzQwNzI0OCwxMzE1NTYyMTQ1LDEwODAwOTQ2MzQsMTM4Mzg1NjMxMSwxNTUxMDM3ODg0LDEwMTAzOTgyOSwxMzUwNTAyMDYsNDM3NzU3MTIzLDMzNzU1Mzg2NCwxMDQyMzg1NjU3LDgwNzk2MjYxMCw1NzM4MDQ3ODMsNzQyMDM5MDEyLDI1MzEwNjc0NTMsMjU2NDAzMzMzNCwyMzI4ODI4OTcxLDIyMjc1NzMwMjQsMjkzNTU2Njg2NSwyNzAwMDk5MzU0LDMwMDE3NTU2NTUsMzE2ODkzNzIyOCwzODY4NTUyODA1LDM5MDI1NjMxODIsNDIwMzE4MTE3MSw0MTAyOTc3OTEyLDM3MzYxNjQ5MzcsMzUwMTc0MTg5MCwzMjY1NDc4NzUxLDM0MzM3MTI5ODAsMTEwNjA0MTU5MSwxMzQwNDYzMTAwLDE1NzY5NzY2MDksMTQwODc0OTAzNCwyMDQzMjExNDgzLDIwMDkxOTU0NzIsMTcwODg0ODMzMywxODA5MDU0MTUwLDgzMjg3NzIzMSwxMDY4MzUxMzk2LDc2Njk0NTQ2NSw1OTk3NjIzNTQsMTU5NDE3OTg3LDEyNjQ1NDY2NCwzNjE5Mjk4NzcsNDYzMTgwMTkwLDI3MDkyNjA4NzEsMjk0MzY4MjM4MCwzMTc4MTA2OTYxLDMwMDk4NzkzODYsMjU3MjY5NzE5NSwyNTM4NjgxMTg0LDIyMzYyMjg3MzMsMjMzNjQzNDU1MCwzNTA5ODcxMTM1LDM3NDUzNDUzMDAsMzQ0MTg1MDM3NywzMjc0NjY3MjY2LDM5MTAxNjE5NzEsMzg3NzE5ODY0OCw0MTEwNTY4NDg1LDQyMTE4MTg3OTgsMjU5NzgwNjQ3NiwyNDk3NjA0NzQzLDIyNjEwODkxNzgsMjI5NTEwMTA3MywyNzMzODU2MTYwLDI5MDIwODc4NTEsMzIwMjQzNzA0NiwyOTY4MDExNDUzLDM5MzYyOTEyODQsMzgzNTAzNjg5NSw0MTM2NDQwNzcwLDQxNjk0MDgyMDEsMzUzNTQ4NjQ1NiwzNzAyNjY1NDU5LDM0NjcxOTIzMDIsMzIzMTcyMjIxMywyMDUxNTE4NzgwLDE5NTEzMTcwNDcsMTcxNjg5MDQxMCwxNzUwOTAyMzA1LDExMTM4MTgzODQsMTI4MjA1MDA3NSwxNTg0NTA0NTgyLDEzNTAwNzg5ODksMTY4ODEwODUyLDY3NTU2NDYzLDM3MTA0OTMzMCw0MDQwMTY3NjEsODQxNzM5NTkyLDEwMDg5MTg1OTUsNzc1NTUwODE0LDU0MDA4MDcyNSwzOTY5NTYyMzY5LDM4MDEzMzIyMzQsNDAzNTQ4OTA0Nyw0MjY5OTA3OTk2LDM1NjkyNTUyMTMsMzY2OTQ2MjU2NiwzMzY2NzU0NjE5LDMzMzI3NDAxNDQsMjYzMTA2NTQzMywyNDYzODc5NzYyLDIxNjAxMTcwNzEsMjM5NTU4ODY3NiwyNzY3NjQ1NTU3LDI4Njg4OTc0MDYsMzEwMjAxMTc0NywzMDY5MDQ5OTYwLDIwMjAwODQ5NywzMzc3ODM2MiwyNzAwNDA0ODcsNTA0NDU5NDM2LDg3NTQ1MTI5Myw5NzU2NTg2NDYsNjc1MDM5NjI3LDY0MTAyNTE1MiwyMDg0NzA0MjMzLDE5MTc1MTg1NjIsMTYxNTg2MTI0NywxODUxMzMyODUyLDExNDc1NTA2NjEsMTI0ODgwMjUxMCwxNDg0MDA1ODQzLDE0NTEwNDQwNTYsOTMzMzAxMzcwLDk2NzMxMTcyOSw3MzMxNTY5NzIsNjMyOTUzNzAzLDI2MDM4ODk1MCwyNTk2NTkxNywzMjg2NzE4MDgsNDk2OTA2MDU5LDEyMDY0Nzc4NTgsMTIzOTQ0Mzc1MywxNTQzMjA4NTAwLDE0NDE5NTI1NzUsMjE0NDE2MTgwNiwxOTA4Njk0Mjc3LDE2NzU1Nzc4ODAsMTg0Mjc1OTQ0MywzNjEwMzY5MjI2LDM2NDQzNzk1ODUsMzQwODExOTUxNiwzMzA3OTE2MjQ3LDQwMTExOTA1MDIsMzc3Njc2NzQ2OSw0MDc3Mzg0NDMyLDQyNDU2MTg2ODMsMjgwOTc3MTE1NCwyODQyNzM3MDQ5LDMxNDQzOTY0MjAsMzA0MzE0MDQ5NSwyNjczNzA1MTUwLDI0MzgyMzc2MjEsMjIwMzAzMjIzMiwyMzcwMjEzNzk1XTt2YXIgVTI9WzAsMTg1NDY5MTk3LDM3MDkzODM5NCw0ODc3MjU4NDcsNzQxODc2Nzg4LDY1Nzg2MTk0NSw5NzU0NTE2OTQsODI0ODUyMjU5LDE0ODM3NTM1NzYsMTQwMDc4MzIwNSwxMzE1NzIzODkwLDExNjQwNzE4MDcsMTk1MDkwMzM4OCwyMTM1MzE5ODg5LDE2NDk3MDQ1MTgsMTc2NzUzNjQ1OSwyOTY3NTA3MTUyLDMxNTI5NzYzNDksMjgwMTU2NjQxMCwyOTE4MzUzODYzLDI2MzE0NDc3ODAsMjU0NzQzMjkzNywyMzI4MTQzNjE0LDIxNzc1NDQxNzksMzkwMTgwNjc3NiwzODE4ODM2NDA1LDQyNzA2Mzk3NzgsNDExODk4NzY5NSwzMjk5NDA5MDM2LDM0ODM4MjU1MzcsMzUzNTA3MjkxOCwzNjUyOTA0ODU5LDIwNzc5NjUyNDMsMTg5MzAyMDM0MiwxODQxNzY4ODY1LDE3MjQ0NTcxMzIsMTQ3NDUwMjU0MywxNTU5MDQxNjY2LDExMDcyMzQxOTcsMTI1NzMwOTMzNiw1OTg0Mzg4NjcsNjgxOTMzNTM0LDkwMTIxMDU2OSwxMDUyMzM4MzcyLDI2MTMxNDUzNSw3NzQyMjMxNCw0Mjg4MTk5NjUsMzEwNDYzNzI4LDM0MDk2ODUzNTUsMzIyNDc0MDQ1NCwzNzEwMzY4MTEzLDM1OTMwNTYzODAsMzg3NTc3MDIwNywzOTYwMzA5MzMwLDQwNDUzODA5MzMsNDE5NTQ1NjA3MiwyNDcxMjI0MDY3LDI1NTQ3MTg3MzQsMjIzNzEzMzA4MSwyMzg4MjYwODg0LDMyMTIwMzU4OTUsMzAyODE0MzY3NCwyODQyNjc4NTczLDI3MjQzMjIzMzYsNDEzODU2MzE4MSw0MjU1MzUwNjI0LDM3Njk3MjE5NzUsMzk1NTE5MTE2MiwzNjY3MjE5MDMzLDM1MTY2MTk2MDQsMzQzMTU0Njk0NywzMzQ3NTMyMTEwLDI5MzM3MzQ5MTcsMjc4MjA4MjgyNCwzMDk5NjY3NDg3LDMwMTY2OTcxMDYsMjE5NjA1MjUyOSwyMzEzODg0NDc2LDI0OTkzNDg1MjMsMjY4Mzc2NTAzMCwxMTc5NTEwNDYxLDEyOTYyOTc5MDQsMTM0NzU0ODMyNywxNTMzMDE3NTE0LDE3ODYxMDI0MDksMTYzNTUwMjk4MCwyMDg3MzA5NDU5LDIwMDMyOTQ2MjIsNTA3MzU4OTMzLDM1NTcwNjg0MCwxMzY0Mjg3NTEsNTM0NTgzNzAsODM5MjI0MDMzLDk1NzA1NTk4MCw2MDU2NTczMzksNzkwMDczODQ2LDIzNzMzNDA2MzAsMjI1NjAyODg5MSwyNjA3NDM5ODIwLDI0MjI0OTQ5MTMsMjcwNjI3MDY5MCwyODU2MzQ1ODM5LDMwNzU2MzYyMTYsMzE2MDE3NTM0OSwzNTczOTQxNjk0LDM3MjUwNjk0OTEsMzI3MzI2NzEwOCwzMzU2NzYxNzY5LDQxODE1OTg2MDIsNDA2MzI0MjM3NSw0MDExOTk2MDQ4LDM4MjgxMDM4MzcsMTAzMzI5NzE1OCw5MTU5ODU0MTksNzMwNTE3Mjc2LDU0NTU3MjM2OSwyOTY2Nzk3MzAsNDQ2NzU0ODc5LDEyOTE2NjEyMCwyMTM3MDUyNTMsMTcwOTYxMDM1MCwxODYwNzM4MTQ3LDE5NDU3OTg1MTYsMjAyOTI5MzE3NywxMjM5MzMxMTYyLDExMjA5NzQ5MzUsMTYwNjU5MTI5NiwxNDIyNjk5MDg1LDQxNDgyOTI4MjYsNDIzMzA5NDYxNSwzNzgxMDMzNjY0LDM5MzEzNzE0NjksMzY4MjE5MTU5OCwzNDk3NTA5MzQ3LDM0NDYwMDQ0NjgsMzMyODk1NTM4NSwyOTM5MjY2MjI2LDI3NTU2MzY2NzEsMzEwNjc4MDg0MCwyOTg4Njg3MjY5LDIxOTg0MzgwMjIsMjI4MjE5NTMzOSwyNTAxMjE4OTcyLDI2NTI2MDk0MjUsMTIwMTc2NTM4NiwxMjg2NTY3MTc1LDEzNzEzNjg5NzYsMTUyMTcwNjc4MSwxODA1MjExNzEwLDE2MjA1Mjk0NTksMjEwNTg4NzI2OCwxOTg4ODM4MTg1LDUzMzgwNDEzMCwzNTAxNzQ1NzUsMTY0NDM5NjcyLDQ2MzQ2MTAxLDg3MDkxMjA4Niw5NTQ2Njk0MDMsNjM2ODEzOTAwLDc4ODIwNDM1MywyMzU4OTU3OTIxLDIyNzQ2ODA0MjgsMjU5MjUyMzY0MywyNDQxNjYxNTU4LDI2OTUwMzM2ODUsMjg4MDI0MDIxNiwzMDY1OTYyODMxLDMxODI0ODc2MTgsMzU3MjE0NTkyOSwzNzU2Mjk5NzgwLDMyNzA5Mzc4NzUsMzM4ODUwNzE2Niw0MTc0NTYwMDYxLDQwOTEzMjcwMjQsNDAwNjUyMTEyNywzODU0NjA2Mzc4LDEwMTQ2NDY3MDUsOTMwMzY5MjEyLDcxMTM0OTY3NSw1NjA0ODc1OTAsMjcyNzg2MzA5LDQ1Nzk5Mjg0MCwxMDY4NTI3NjcsMjIzMzc3NTU0LDE2NzgzODEwMTcsMTg2MjUzNDg2OCwxOTE0MDUyMDM1LDIwMzE2MjEzMjYsMTIxMTI0NzU5NywxMTI4MDE0NTYwLDE1ODAwODc3OTksMTQyODE3MzA1MCwzMjI4MzMxOSwxODI2MjExMTQsNDAxNjM5NTk3LDQ4NjQ0MTM3Niw3Njg5MTcxMjMsNjUxODY4MDQ2LDEwMDMwMDcxMjksODE4MzI0ODg0LDE1MDM0NDk4MjMsMTM4NTM1NjI0MiwxMzMzODM4MDIxLDExNTAyMDg0NTYsMTk3Mzc0NTM4NywyMTI1MTM1ODQ2LDE2NzMwNjE2MTcsMTc1NjgxODk0MCwyOTcwMzU2MzI3LDMxMjA2OTQxMjIsMjgwMjg0OTkxNywyODg3NjUxNjk2LDI2Mzc0NDI2NDMsMjUyMDM5MzU2NiwyMzM0NjY5ODk3LDIxNDk5ODc2NTIsMzkxNzIzNDcwMywzNzk5MTQxMTIyLDQyODQ1MDIwMzcsNDEwMDg3MjQ3MiwzMzA5NTk0MTcxLDM0NjA5ODQ2MzAsMzU0NTc4OTQ3MywzNjI5NTQ2Nzk2LDIwNTA0NjYwNjAsMTg5OTYwMzk2OSwxODE0ODAzMjIyLDE3MzA1MjU3MjMsMTQ0Mzg1NzcyMCwxNTYwMzgyNTE3LDEwNzUwMjU2OTgsMTI2MDIzMjIzOSw1NzUxMzgxNDgsNjkyNzA3NDMzLDg3ODQ0MzM5MCwxMDYyNTk3MjM1LDI0MzI1NjY1Niw5MTM0MTkxNyw0MDkxOTg0MTAsMzI1OTY1MzgzLDM0MDMxMDA2MzYsMzI1MjIzODU0NSwzNzA0MzAwNDg2LDM2MjAwMjI5ODcsMzg3NDQyODM5MiwzOTkwOTUzMTg5LDQwNDI0NTkxMjIsNDIyNzY2NTY2MywyNDYwNDQ5MjA0LDI1NzgwMTg0ODksMjIyNjg3NTMxMCwyNDExMDI5MTU1LDMxOTgxMTUyMDAsMzA0NjIwMDQ2MSwyODI3MTc3ODgyLDI3NDM5NDQ4NTVdO3ZhciBVMz1bMCwyMTg4MjgyOTcsNDM3NjU2NTk0LDM4Nzc4MTE0Nyw4NzUzMTMxODgsOTU4ODcxMDg1LDc3NTU2MjI5NCw1OTA0MjQ2MzksMTc1MDYyNjM3NiwxNjk5OTcwNjI1LDE5MTc3NDIxNzAsMjEzNTI1MzU4NywxNTUxMTI0NTg4LDEzNjcyOTU1ODksMTE4MDg0OTI3OCwxMjY1MTk1NjM5LDM1MDEyNTI3NTIsMzcyMDA4MTA0OSwzMzk5OTQxMjUwLDMzNTAwNjU4MDMsMzgzNTQ4NDM0MCwzOTE5MDQyMjM3LDQyNzA1MDcxNzQsNDA4NTM2OTUxOSwzMTAyMjQ5MTc2LDMwNTE1OTM0MjUsMjczNDU5MTE3OCwyOTUyMTAyNTk1LDIzNjE2OTg1NTYsMjE3Nzg2OTU1NywyNTMwMzkxMjc4LDI2MTQ3Mzc2MzksMzE0NTQ1NjQ0MywzMDYwODQ3OTIyLDI3MDgzMjYxODUsMjg5MjQxNzMxMiwyNDA0OTAxNjYzLDIxODcxMjgwODYsMjUwNDEzMDMxNywyNTU1MDQ4MTk2LDM1NDIzMzAyMjcsMzcyNzIwNTc1NCwzMzc1NzQwNzY5LDMyOTI0NDUwMzIsMzg3NjU1NzY1NSwzOTI2MTcwOTc0LDQyNDYzMTA3MjUsNDAyNzc0NDU4OCwxODA4NDgxMTk1LDE3MjM4NzI2NzQsMTkxMDMxOTAzMywyMDk0NDEwMTYwLDE2MDg5NzUyNDcsMTM5MTIwMTY3MCwxMTczNDMwMTczLDEyMjQzNDgwNTIsNTk5ODQ4NjcsMjQ0ODYwMzk0LDQyODE2OTIwMSwzNDQ4NzM0NjQsOTM1MjkzODk1LDk4NDkwNzIxNCw3NjYwNzg5MzMsNTQ3NTEyNzk2LDE4NDQ4ODI4MDYsMTYyNzIzNTE5OSwyMDExMjE0MTgwLDIwNjIyNzAzMTcsMTUwNzQ5NzI5OCwxNDIzMDIyOTM5LDExMzc0Nzc5NTIsMTMyMTY5OTE0NSw5NTM0NTk4MiwxNDUwODUyMzksNTMyMjAxNzcyLDMxMzc3Mzg2MSw4MzA2NjE5MTQsMTAxNTY3MTU3MSw3MzExODMzNjgsNjQ4MDE3NjY1LDMxNzU1MDEyODYsMjk1Nzg1MzY3OSwyODA3MDU4OTMyLDI4NTgxMTUwNjksMjMwNTQ1NTU1NCwyMjIwOTgxMTk1LDI0NzQ0MDQzMDQsMjY1ODYyNTQ5NywzNTc1NTI4ODc4LDM2MjUyNjgxMzUsMzQ3MzQxNjYzNiwzMjU0OTg4NzI1LDM3NzgxNTE4MTgsMzk2MzE2MTQ3NSw0MjEzNDQ3MDY0LDQxMzAyODEzNjEsMzU5OTU5NTA4NSwzNjgzMDIyOTE2LDM0MzI3MzczNzUsMzI0NzQ2NTU1OCwzODAyMjIyMTg1LDQwMjA5MTIyMjQsNDE3Mjc2Mzc3MSw0MTIyNzYyMzU0LDMyMDE2MzE3NDksMzAxNzY3MjcxNiwyNzY0MjQ5NjIzLDI4NDg0NjE4NTQsMjMzMTU5MDE3NywyMjgwNzk2MjAwLDI0MzE1OTA5NjMsMjY0ODk3NjQ0MiwxMDQ2OTk2MTMsMTg4MTI3NDQ0LDQ3MjYxNTYzMSwyODczNDM4MTQsODQwMDE5NzA1LDEwNTg3MDk3NDQsNjcxNTkzMTk1LDYyMTU5MTc3OCwxODUyMTcxOTI1LDE2NjgyMTI4OTIsMTk1Mzc1NzgzMSwyMDM3OTcwMDYyLDE1MTQ3OTA1NzcsMTQ2Mzk5NjYwMCwxMDgwMDE3NTcxLDEyOTc0MDMwNTAsMzY3MzYzNzM1NiwzNjIzNjM2OTY1LDMyMzU5OTUxMzQsMzQ1NDY4NjE5OSw0MDA3MzYwOTY4LDM4MjIwOTAxNzcsNDEwNzEwMTY1OCw0MTkwNTMwNTE1LDI5OTc4MjU5NTYsMzIxNTIxMjQ2MSwyODMwNzA4MTUwLDI3Nzk5MTUxOTksMjI1NjczNDU5MiwyMzQwOTQ3ODQ5LDI2MjcwMTYwODIsMjQ0MzA1ODA3NSwxNzI0NjY1NTYsMTIyNDY2MTY1LDI3Mzc5MjM2Niw0OTI0ODM0MzEsMTA0NzIzOWUzLDg2MTk2ODIwOSw2MTIyMDU4OTgsNjk1NjM0NzU1LDE2NDYyNTIzNDAsMTg2MzYzODg0NSwyMDEzOTA4MjYyLDE5NjMxMTUzMTEsMTQ0NjI0MjU3NiwxNTMwNDU1ODMzLDEyNzc1NTU5NzAsMTA5MzU5Nzk2MywxNjM2NjA0NjMxLDE4MjA4MjQ3OTgsMjA3MzcyNDYxMywxOTg5MjQ5MjI4LDE0MzY1OTA4MzUsMTQ4NzY0NTk0NiwxMzM3Mzc2NDgxLDExMTk3Mjc4NDgsMTY0OTQ4NjM5LDgxNzgxOTEwLDMzMTU0NDIwNSw1MTY1NTI4MzYsMTAzOTcxNzA1MSw4MjEyODgxMTQsNjY5OTYxODk3LDcxOTcwMDEyOCwyOTczNTMwNjk1LDMxNTc3NTA4NjIsMjg3MTY4MjY0NSwyNzg3MjA3MjYwLDIyMzI0MzUyOTksMjI4MzQ5MDQxMCwyNjY3OTk0NzM3LDI0NTAzNDYxMDQsMzY0NzIxMjA0NywzNTY0MDQ1MzE4LDMyNzkwMzM4ODUsMzQ2NDA0MjUxNiwzOTgwOTMxNjI3LDM3NjI1MDI2OTAsNDE1MDE0NDU2OSw0MTk5ODgyODAwLDMwNzAzNTY2MzQsMzEyMTI3NTUzOSwyOTA0MDI3MjcyLDI2ODYyNTQ3MjEsMjIwMDgxODg3OCwyMzg0OTExMDMxLDI1NzA4MzIwNDQsMjQ4NjIyNDU0OSwzNzQ3MTkyMDE4LDM1Mjg2MjY5MDcsMzMxMDMyMTg1NiwzMzU5OTM2MjAxLDM5NTAzNTU3MDIsMzg2NzA2MDk5MSw0MDQ5ODQ0NDUyLDQyMzQ3MjEwMDUsMTczOTY1NjIwMiwxNzkwNTc1MTA3LDIxMDgxMDA2MzIsMTg5MDMyODA4MSwxNDAyODExNDM4LDE1ODY5MDM1OTEsMTIzMzg1NjU3MiwxMTQ5MjQ5MDc3LDI2Njk1OTkzOCw0ODM5NDgyNywzNjkwNTc4NzIsNDE4NjcyMjE3LDEwMDI3ODM4NDYsOTE5NDg5MTM1LDU2NzQ5ODg2OCw3NTIzNzU0MjEsMjA5MzM2MjI1LDI0MTk3NTQ0LDM3NjE4NzgyNyw0NTk3NDQ2OTgsOTQ1MTY0MTY1LDg5NTI4NzY5Miw1NzQ2MjQ2NjMsNzkzNDUxOTM0LDE2Nzk5NjgyMzMsMTc2NDMxMzU2OCwyMTE3MzYwNjM1LDE5MzM1MzA2MTAsMTM0MzEyNzUwMSwxNTYwNjM3ODkyLDEyNDMxMTI0MTUsMTE5MjQ1NTYzOCwzNzA0MjgwODgxLDM1MTkxNDIyMDAsMzMzNjM1ODY5MSwzNDE5OTE1NTYyLDM5MDc0NDg1OTcsMzg1NzU3MjEyNCw0MDc1ODc3MTI3LDQyOTQ3MDQzOTgsMzAyOTUxMDAwOSwzMTEzODU1MzQ0LDI5Mjc5MzQzMTUsMjc0NDEwNDI5MCwyMTU5OTc2Mjg1LDIzNzc0ODY2NzYsMjU5NDczNDkyNywyNTQ0MDc4MTUwXTt2YXIgVTQ9WzAsMTUxODQ5NzQyLDMwMzY5OTQ4NCw0NTQ0OTk2MDIsNjA3Mzk4OTY4LDc1ODcyMDMxMCw5MDg5OTkyMDQsMTA1OTI3MDk1NCwxMjE0Nzk3OTM2LDEwOTcxNTk1NTAsMTUxNzQ0MDYyMCwxNDAwODQ5NzYyLDE4MTc5OTg0MDgsMTY5OTgzOTgxNCwyMTE4NTQxOTA4LDIwMDE0MzA4NzQsMjQyOTU5NTg3MiwyNTgxNDQ1NjE0LDIxOTQzMTkxMDAsMjM0NTExOTIxOCwzMDM0ODgxMjQwLDMxODYyMDI1ODIsMjgwMTY5OTUyNCwyOTUxOTcxMjc0LDM2MzU5OTY4MTYsMzUxODM1ODQzMCwzMzk5Njc5NjI4LDMyODMwODg3NzAsNDIzNzA4MzgxNiw0MTE4OTI1MjIyLDQwMDI4NjE3NDgsMzg4NTc1MDcxNCwxMDAyMTQyNjgzLDg1MDgxNzIzNyw2OTg0NDUyNTUsNTQ4MTY5NDE3LDUyOTQ4Nzg0MywzNzc2NDIyMjEsMjI3ODg1NTY3LDc3MDg5NTIxLDE5NDMyMTcwNjcsMjA2MTM3OTc0OSwxNjQwNTc2NDM5LDE3NTc2OTE1NzcsMTQ3NDc2MDU5NSwxNTkyMzk0OTA5LDExNzQyMTUwNTUsMTI5MDgwMTc5MywyODc1OTY4MzE1LDI3MjQ2NDI4NjksMzExMTI0NzE0MywyOTYwOTcxMzA1LDI0MDU0MjY5NDcsMjI1MzU4MTMyNSwyNjM4NjA2NjIzLDI0ODc4MTA1NzcsMzgwODY2MjM0NywzOTI2ODI1MDI5LDQwNDQ5ODE1OTEsNDE2MjA5NjcyOSwzMzQyMzE5NDc1LDM0NTk5NTM3ODksMzU3NjUzOTUwMywzNjkzMTI2MjQxLDE5ODY5MTgwNjEsMjEzNzA2MjgxOSwxNjg1NTc3OTA1LDE4MzY3NzIyODcsMTM4MTYyMDM3MywxNTMyMjg1MzM5LDEwNzgxODUwOTcsMTIyOTg5OTY1NSwxMDQwNTU5ODM3LDkyMzMxMzYxOSw3NDAyNzY0MTcsNjIxOTgyNjcxLDQzOTQ1MjM4OSwzMjI3MzQ1NzEsMTM3MDczOTEzLDE5MzA4NTM1LDM4NzExNjM5ODEsNDAyMTMwODczOSw0MTA0NjA1Nzc3LDQyNTU4MDAxNTksMzI2Mzc4NTU4OSwzNDE0NDUwNTU1LDM0OTkzMjY1NjksMzY1MTA0MTEyNywyOTMzMjAyNDkzLDI4MTU5NTYyNzUsMzE2NzY4NDY0MSwzMDQ5MzkwODk1LDIzMzAwMTQyMTMsMjIxMzI5NjM5NSwyNTY2NTk1NjA5LDI0NDg4MzAyMzEsMTMwNTkwNjU1MCwxMTU1MjM3NDk2LDE2MDcyNDQ2NTAsMTQ1NTUyNTk4OCwxNzc2NDYwMTEwLDE2MjYzMTk0MjQsMjA3OTg5NzQyNiwxOTI4NzA3MTY0LDk2MzkyNDU0LDIxMzExNDM3NiwzOTY2NzM4MTgsNTE0NDQzMjg0LDU2Mjc1NTkwMiw2Nzk5OThlMyw4NjUxMzY0MTgsOTgzNDI2MDkyLDM3MDgxNzM3MTgsMzU1NzUwNDY2NCwzNDc0NzI5ODY2LDMzMjMwMTEyMDQsNDE4MDgwODExMCw0MDMwNjY3NDI0LDM5NDUyNjkxNzAsMzc5NDA3ODkwOCwyNTA3MDQwMjMwLDI2MjM3NjIxNTIsMjI3MjU1NjAyNiwyMzkwMzI1NDkyLDI5NzU0ODQzODIsMzA5MjcyNjQ4MCwyNzM4OTA1MDI2LDI4NTcxOTQ3MDAsMzk3Mzc3MzEyMSwzODU2MTM3Mjk1LDQyNzQwNTM0NjksNDE1NzQ2NzIxOSwzMzcxMDk2OTUzLDMyNTI5MzI3MjcsMzY3MzQ3NjQ1MywzNTU2MzYxODM1LDI3NjMxNzM2ODEsMjkxNTAxNzc5MSwzMDY0NTEwNzY1LDMyMTUzMDcyOTksMjE1NjI5OTAxNywyMzA3NjIyOTE5LDI0NTk3MzUzMTcsMjYxMDAxMTY3NSwyMDgxMDQ4NDgxLDE5NjM0MTI2NTUsMTg0NjU2MzI2MSwxNzI5OTc3MDExLDE0ODA0ODU3ODUsMTM2MjMyMTU1OSwxMjQzOTA1NDEzLDExMjY3OTA3OTUsODc4ODQ1OTA1LDEwMzA2OTAwMTUsNjQ1NDAxMDM3LDc5NjE5NzU3MSwyNzQwODQ4NDEsNDI1NDA4NzQzLDM4NTQ0ODg1LDE4ODgyMTI0MywzNjEzNDk0NDI2LDM3MzE2NTQ1NDgsMzMxMzIxMjAzOCwzNDMwMzIyNTY4LDQwODI0NzUxNzAsNDIwMDExNTExNiwzNzgwMDk3NzI2LDM4OTY2ODgwNDgsMjY2ODIyMTY3NCwyNTE2OTAxODYwLDIzNjY4ODI1NTAsMjIxNjYxMDI5NiwzMTQxNDAwNzg2LDI5ODk1NTI2MDQsMjgzNzk2NjU0MiwyNjg3MTY1ODg4LDEyMDI3OTc2OTAsMTMyMDk1NzgxMiwxNDM3MjgwODcwLDE1NTQzOTE0MDAsMTY2OTY2NDgzNCwxNzg3MzA0NzgwLDE5MDYyNDcyNjIsMjAyMjgzNzU4NCwyNjU5MDUxNjIsMTE0NTg1MzQ4LDQ5OTM0Nzk5MCwzNDkwNzU3MzYsNzM2OTcwODAyLDU4NTEyMjYyMCw5NzI1MTI4MTQsODIxNzEyMTYwLDI1OTU2ODQ4NDQsMjQ3ODQ0MzIzNCwyMjkzMDQ1MjMyLDIxNzQ3NTQwNDYsMzE5NjI2Nzk4OCwzMDc5NTQ2NTg2LDI4OTU3MjM0NjQsMjc3Nzk1MjQ1NCwzNTM3ODUyODI4LDM2ODc5OTQwMDIsMzIzNDE1NjQxNiwzMzg1MzQ1MTY2LDQxNDI2MjYyMTIsNDI5MzI5NTc4NiwzODQxMDI0OTUyLDM5OTI3NDIwNzAsMTc0NTY3NjkyLDU3MzI2MDgyLDQxMDg4Nzk1MiwyOTI1OTY3NjYsNzc3MjMxNjY4LDY2MDUxMDI2NiwxMDExNDUyNzEyLDg5MzY4MTcwMiwxMTA4MzM5MDY4LDEyNTg0ODAyNDIsMTM0MzYxODkxMiwxNDk0ODA3NjYyLDE3MTUxOTMxNTYsMTg2NTg2MjczMCwxOTQ4MzczODQ4LDIxMDAwOTA5NjYsMjcwMTk0OTQ5NSwyODE4NjY2ODA5LDMwMDQ1OTExNDcsMzEyMjM1ODA1MywyMjM1MDYxNzc1LDIzNTIzMDc0NTcsMjUzNTYwNDI0MywyNjUzODk5NTQ5LDM5MTU2NTM3MDMsMzc2NDk4ODIzMyw0MjE5MzUyMTU1LDQwNjc2MzkxMjUsMzQ0NDU3NTg3MSwzMjk0NDMwNTc3LDM3NDYxNzUwNzUsMzU5NDk4MjI1Myw4MzY1NTM0MzEsOTUzMjcwNzQ1LDYwMDIzNTIxMSw3MTgwMDIxMTcsMzY3NTg1MDA3LDQ4NDgzMDY4OSwxMzMzNjE5MDcsMjUxNjU3MjEzLDIwNDE4NzcxNTksMTg5MTIxMTY4OSwxODA2NTk5MzU1LDE2NTQ4ODYzMjUsMTU2ODcxODQ5NSwxNDE4NTczMjAxLDEzMzU1MzU3NDcsMTE4NDM0MjkyNV07ZnVuY3Rpb24gY29udmVydFRvSW50MzIoYnl0ZXMpe3ZhciByZXN1bHQ9W107Zm9yKHZhciBpPTA7aTxieXRlcy5sZW5ndGg7aSs9NCl7cmVzdWx0LnB1c2goYnl0ZXNbaV08PDI0fGJ5dGVzW2krMV08PDE2fGJ5dGVzW2krMl08PDh8Ynl0ZXNbaSszXSl9cmV0dXJuIHJlc3VsdH12YXIgQUVTPWZ1bmN0aW9uKGtleSl7aWYoISh0aGlzIGluc3RhbmNlb2YgQUVTKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsImtleSIse3ZhbHVlOmNvZXJjZUFycmF5KGtleSx0cnVlKX0pO3RoaXMuX3ByZXBhcmUoKX07QUVTLnByb3RvdHlwZS5fcHJlcGFyZT1mdW5jdGlvbigpe3ZhciByb3VuZHM9bnVtYmVyT2ZSb3VuZHNbdGhpcy5rZXkubGVuZ3RoXTtpZihyb3VuZHM9PW51bGwpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBrZXkgc2l6ZSAobXVzdCBiZSAxNiwgMjQgb3IgMzIgYnl0ZXMpIil9dGhpcy5fS2U9W107dGhpcy5fS2Q9W107Zm9yKHZhciBpPTA7aTw9cm91bmRzO2krKyl7dGhpcy5fS2UucHVzaChbMCwwLDAsMF0pO3RoaXMuX0tkLnB1c2goWzAsMCwwLDBdKX12YXIgcm91bmRLZXlDb3VudD0ocm91bmRzKzEpKjQ7dmFyIEtDPXRoaXMua2V5Lmxlbmd0aC80O3ZhciB0az1jb252ZXJ0VG9JbnQzMih0aGlzLmtleSk7dmFyIGluZGV4O2Zvcih2YXIgaT0wO2k8S0M7aSsrKXtpbmRleD1pPj4yO3RoaXMuX0tlW2luZGV4XVtpJTRdPXRrW2ldO3RoaXMuX0tkW3JvdW5kcy1pbmRleF1baSU0XT10a1tpXX12YXIgcmNvbnBvaW50ZXI9MDt2YXIgdD1LQyx0dDt3aGlsZSh0PHJvdW5kS2V5Q291bnQpe3R0PXRrW0tDLTFdO3RrWzBdXj1TW3R0Pj4xNiYyNTVdPDwyNF5TW3R0Pj44JjI1NV08PDE2XlNbdHQmMjU1XTw8OF5TW3R0Pj4yNCYyNTVdXnJjb25bcmNvbnBvaW50ZXJdPDwyNDtyY29ucG9pbnRlcis9MTtpZihLQyE9OCl7Zm9yKHZhciBpPTE7aTxLQztpKyspe3RrW2ldXj10a1tpLTFdfX1lbHNle2Zvcih2YXIgaT0xO2k8S0MvMjtpKyspe3RrW2ldXj10a1tpLTFdfXR0PXRrW0tDLzItMV07dGtbS0MvMl1ePVNbdHQmMjU1XV5TW3R0Pj44JjI1NV08PDheU1t0dD4+MTYmMjU1XTw8MTZeU1t0dD4+MjQmMjU1XTw8MjQ7Zm9yKHZhciBpPUtDLzIrMTtpPEtDO2krKyl7dGtbaV1ePXRrW2ktMV19fXZhciBpPTAscixjO3doaWxlKGk8S0MmJnQ8cm91bmRLZXlDb3VudCl7cj10Pj4yO2M9dCU0O3RoaXMuX0tlW3JdW2NdPXRrW2ldO3RoaXMuX0tkW3JvdW5kcy1yXVtjXT10a1tpKytdO3QrK319Zm9yKHZhciByPTE7cjxyb3VuZHM7cisrKXtmb3IodmFyIGM9MDtjPDQ7YysrKXt0dD10aGlzLl9LZFtyXVtjXTt0aGlzLl9LZFtyXVtjXT1VMVt0dD4+MjQmMjU1XV5VMlt0dD4+MTYmMjU1XV5VM1t0dD4+OCYyNTVdXlU0W3R0JjI1NV19fX07QUVTLnByb3RvdHlwZS5lbmNyeXB0PWZ1bmN0aW9uKHBsYWludGV4dCl7aWYocGxhaW50ZXh0Lmxlbmd0aCE9MTYpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBwbGFpbnRleHQgc2l6ZSAobXVzdCBiZSAxNiBieXRlcykiKX12YXIgcm91bmRzPXRoaXMuX0tlLmxlbmd0aC0xO3ZhciBhPVswLDAsMCwwXTt2YXIgdD1jb252ZXJ0VG9JbnQzMihwbGFpbnRleHQpO2Zvcih2YXIgaT0wO2k8NDtpKyspe3RbaV1ePXRoaXMuX0tlWzBdW2ldfWZvcih2YXIgcj0xO3I8cm91bmRzO3IrKyl7Zm9yKHZhciBpPTA7aTw0O2krKyl7YVtpXT1UMVt0W2ldPj4yNCYyNTVdXlQyW3RbKGkrMSklNF0+PjE2JjI1NV1eVDNbdFsoaSsyKSU0XT4+OCYyNTVdXlQ0W3RbKGkrMyklNF0mMjU1XV50aGlzLl9LZVtyXVtpXX10PWEuc2xpY2UoKX12YXIgcmVzdWx0PWNyZWF0ZUFycmF5KDE2KSx0dDtmb3IodmFyIGk9MDtpPDQ7aSsrKXt0dD10aGlzLl9LZVtyb3VuZHNdW2ldO3Jlc3VsdFs0KmldPShTW3RbaV0+PjI0JjI1NV1edHQ+PjI0KSYyNTU7cmVzdWx0WzQqaSsxXT0oU1t0WyhpKzEpJTRdPj4xNiYyNTVdXnR0Pj4xNikmMjU1O3Jlc3VsdFs0KmkrMl09KFNbdFsoaSsyKSU0XT4+OCYyNTVdXnR0Pj44KSYyNTU7cmVzdWx0WzQqaSszXT0oU1t0WyhpKzMpJTRdJjI1NV1edHQpJjI1NX1yZXR1cm4gcmVzdWx0fTtBRVMucHJvdG90eXBlLmRlY3J5cHQ9ZnVuY3Rpb24oY2lwaGVydGV4dCl7aWYoY2lwaGVydGV4dC5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIDE2IGJ5dGVzKSIpfXZhciByb3VuZHM9dGhpcy5fS2QubGVuZ3RoLTE7dmFyIGE9WzAsMCwwLDBdO3ZhciB0PWNvbnZlcnRUb0ludDMyKGNpcGhlcnRleHQpO2Zvcih2YXIgaT0wO2k8NDtpKyspe3RbaV1ePXRoaXMuX0tkWzBdW2ldfWZvcih2YXIgcj0xO3I8cm91bmRzO3IrKyl7Zm9yKHZhciBpPTA7aTw0O2krKyl7YVtpXT1UNVt0W2ldPj4yNCYyNTVdXlQ2W3RbKGkrMyklNF0+PjE2JjI1NV1eVDdbdFsoaSsyKSU0XT4+OCYyNTVdXlQ4W3RbKGkrMSklNF0mMjU1XV50aGlzLl9LZFtyXVtpXX10PWEuc2xpY2UoKX12YXIgcmVzdWx0PWNyZWF0ZUFycmF5KDE2KSx0dDtmb3IodmFyIGk9MDtpPDQ7aSsrKXt0dD10aGlzLl9LZFtyb3VuZHNdW2ldO3Jlc3VsdFs0KmldPShTaVt0W2ldPj4yNCYyNTVdXnR0Pj4yNCkmMjU1O3Jlc3VsdFs0KmkrMV09KFNpW3RbKGkrMyklNF0+PjE2JjI1NV1edHQ+PjE2KSYyNTU7cmVzdWx0WzQqaSsyXT0oU2lbdFsoaSsyKSU0XT4+OCYyNTVdXnR0Pj44KSYyNTU7cmVzdWx0WzQqaSszXT0oU2lbdFsoaSsxKSU0XSYyNTVdXnR0KSYyNTV9cmV0dXJuIHJlc3VsdH07dmFyIE1vZGVPZk9wZXJhdGlvbkVDQj1mdW5jdGlvbihrZXkpe2lmKCEodGhpcyBpbnN0YW5jZW9mIE1vZGVPZk9wZXJhdGlvbkVDQikpe3Rocm93IEVycm9yKCJBRVMgbXVzdCBiZSBpbnN0YW5pdGF0ZWQgd2l0aCBgbmV3YCIpfXRoaXMuZGVzY3JpcHRpb249IkVsZWN0cm9uaWMgQ29kZSBCbG9jayI7dGhpcy5uYW1lPSJlY2IiO3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbkVDQi5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3BsYWludGV4dD1jb2VyY2VBcnJheShwbGFpbnRleHQpO2lmKHBsYWludGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgcGxhaW50ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIGNpcGhlcnRleHQ9Y3JlYXRlQXJyYXkocGxhaW50ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9MTYpe2NvcHlBcnJheShwbGFpbnRleHQsYmxvY2ssMCxpLGkrMTYpO2Jsb2NrPXRoaXMuX2Flcy5lbmNyeXB0KGJsb2NrKTtjb3B5QXJyYXkoYmxvY2ssY2lwaGVydGV4dCxpKX1yZXR1cm4gY2lwaGVydGV4dH07TW9kZU9mT3BlcmF0aW9uRUNCLnByb3RvdHlwZS5kZWNyeXB0PWZ1bmN0aW9uKGNpcGhlcnRleHQpe2NpcGhlcnRleHQ9Y29lcmNlQXJyYXkoY2lwaGVydGV4dCk7aWYoY2lwaGVydGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIG11bHRpcGxlIG9mIDE2IGJ5dGVzKSIpfXZhciBwbGFpbnRleHQ9Y3JlYXRlQXJyYXkoY2lwaGVydGV4dC5sZW5ndGgpO3ZhciBibG9jaz1jcmVhdGVBcnJheSgxNik7Zm9yKHZhciBpPTA7aTxjaXBoZXJ0ZXh0Lmxlbmd0aDtpKz0xNil7Y29weUFycmF5KGNpcGhlcnRleHQsYmxvY2ssMCxpLGkrMTYpO2Jsb2NrPXRoaXMuX2Flcy5kZWNyeXB0KGJsb2NrKTtjb3B5QXJyYXkoYmxvY2sscGxhaW50ZXh0LGkpfXJldHVybiBwbGFpbnRleHR9O3ZhciBNb2RlT2ZPcGVyYXRpb25DQkM9ZnVuY3Rpb24oa2V5LGl2KXtpZighKHRoaXMgaW5zdGFuY2VvZiBNb2RlT2ZPcGVyYXRpb25DQkMpKXt0aHJvdyBFcnJvcigiQUVTIG11c3QgYmUgaW5zdGFuaXRhdGVkIHdpdGggYG5ld2AiKX10aGlzLmRlc2NyaXB0aW9uPSJDaXBoZXIgQmxvY2sgQ2hhaW5pbmciO3RoaXMubmFtZT0iY2JjIjtpZighaXYpe2l2PWNyZWF0ZUFycmF5KDE2KX1lbHNlIGlmKGl2Lmxlbmd0aCE9MTYpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBpbml0aWFsYXRpb24gdmVjdG9yIHNpemUgKG11c3QgYmUgMTYgYnl0ZXMpIil9dGhpcy5fbGFzdENpcGhlcmJsb2NrPWNvZXJjZUFycmF5KGl2LHRydWUpO3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbkNCQy5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3BsYWludGV4dD1jb2VyY2VBcnJheShwbGFpbnRleHQpO2lmKHBsYWludGV4dC5sZW5ndGglMTYhPT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgcGxhaW50ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIGNpcGhlcnRleHQ9Y3JlYXRlQXJyYXkocGxhaW50ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9MTYpe2NvcHlBcnJheShwbGFpbnRleHQsYmxvY2ssMCxpLGkrMTYpO2Zvcih2YXIgaj0wO2o8MTY7aisrKXtibG9ja1tqXV49dGhpcy5fbGFzdENpcGhlcmJsb2NrW2pdfXRoaXMuX2xhc3RDaXBoZXJibG9jaz10aGlzLl9hZXMuZW5jcnlwdChibG9jayk7Y29weUFycmF5KHRoaXMuX2xhc3RDaXBoZXJibG9jayxjaXBoZXJ0ZXh0LGkpfXJldHVybiBjaXBoZXJ0ZXh0fTtNb2RlT2ZPcGVyYXRpb25DQkMucHJvdG90eXBlLmRlY3J5cHQ9ZnVuY3Rpb24oY2lwaGVydGV4dCl7Y2lwaGVydGV4dD1jb2VyY2VBcnJheShjaXBoZXJ0ZXh0KTtpZihjaXBoZXJ0ZXh0Lmxlbmd0aCUxNiE9PTApe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBjaXBoZXJ0ZXh0IHNpemUgKG11c3QgYmUgbXVsdGlwbGUgb2YgMTYgYnl0ZXMpIil9dmFyIHBsYWludGV4dD1jcmVhdGVBcnJheShjaXBoZXJ0ZXh0Lmxlbmd0aCk7dmFyIGJsb2NrPWNyZWF0ZUFycmF5KDE2KTtmb3IodmFyIGk9MDtpPGNpcGhlcnRleHQubGVuZ3RoO2krPTE2KXtjb3B5QXJyYXkoY2lwaGVydGV4dCxibG9jaywwLGksaSsxNik7YmxvY2s9dGhpcy5fYWVzLmRlY3J5cHQoYmxvY2spO2Zvcih2YXIgaj0wO2o8MTY7aisrKXtwbGFpbnRleHRbaStqXT1ibG9ja1tqXV50aGlzLl9sYXN0Q2lwaGVyYmxvY2tbal19Y29weUFycmF5KGNpcGhlcnRleHQsdGhpcy5fbGFzdENpcGhlcmJsb2NrLDAsaSxpKzE2KX1yZXR1cm4gcGxhaW50ZXh0fTt2YXIgTW9kZU9mT3BlcmF0aW9uQ0ZCPWZ1bmN0aW9uKGtleSxpdixzZWdtZW50U2l6ZSl7aWYoISh0aGlzIGluc3RhbmNlb2YgTW9kZU9mT3BlcmF0aW9uQ0ZCKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9dGhpcy5kZXNjcmlwdGlvbj0iQ2lwaGVyIEZlZWRiYWNrIjt0aGlzLm5hbWU9ImNmYiI7aWYoIWl2KXtpdj1jcmVhdGVBcnJheSgxNil9ZWxzZSBpZihpdi5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgaW5pdGlhbGF0aW9uIHZlY3RvciBzaXplIChtdXN0IGJlIDE2IHNpemUpIil9aWYoIXNlZ21lbnRTaXplKXtzZWdtZW50U2l6ZT0xfXRoaXMuc2VnbWVudFNpemU9c2VnbWVudFNpemU7dGhpcy5fc2hpZnRSZWdpc3Rlcj1jb2VyY2VBcnJheShpdix0cnVlKTt0aGlzLl9hZXM9bmV3IEFFUyhrZXkpfTtNb2RlT2ZPcGVyYXRpb25DRkIucHJvdG90eXBlLmVuY3J5cHQ9ZnVuY3Rpb24ocGxhaW50ZXh0KXtpZihwbGFpbnRleHQubGVuZ3RoJXRoaXMuc2VnbWVudFNpemUhPTApe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBwbGFpbnRleHQgc2l6ZSAobXVzdCBiZSBzZWdtZW50U2l6ZSBieXRlcykiKX12YXIgZW5jcnlwdGVkPWNvZXJjZUFycmF5KHBsYWludGV4dCx0cnVlKTt2YXIgeG9yU2VnbWVudDtmb3IodmFyIGk9MDtpPGVuY3J5cHRlZC5sZW5ndGg7aSs9dGhpcy5zZWdtZW50U2l6ZSl7eG9yU2VnbWVudD10aGlzLl9hZXMuZW5jcnlwdCh0aGlzLl9zaGlmdFJlZ2lzdGVyKTtmb3IodmFyIGo9MDtqPHRoaXMuc2VnbWVudFNpemU7aisrKXtlbmNyeXB0ZWRbaStqXV49eG9yU2VnbWVudFtqXX1jb3B5QXJyYXkodGhpcy5fc2hpZnRSZWdpc3Rlcix0aGlzLl9zaGlmdFJlZ2lzdGVyLDAsdGhpcy5zZWdtZW50U2l6ZSk7Y29weUFycmF5KGVuY3J5cHRlZCx0aGlzLl9zaGlmdFJlZ2lzdGVyLDE2LXRoaXMuc2VnbWVudFNpemUsaSxpK3RoaXMuc2VnbWVudFNpemUpfXJldHVybiBlbmNyeXB0ZWR9O01vZGVPZk9wZXJhdGlvbkNGQi5wcm90b3R5cGUuZGVjcnlwdD1mdW5jdGlvbihjaXBoZXJ0ZXh0KXtpZihjaXBoZXJ0ZXh0Lmxlbmd0aCV0aGlzLnNlZ21lbnRTaXplIT0wKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgY2lwaGVydGV4dCBzaXplIChtdXN0IGJlIHNlZ21lbnRTaXplIGJ5dGVzKSIpfXZhciBwbGFpbnRleHQ9Y29lcmNlQXJyYXkoY2lwaGVydGV4dCx0cnVlKTt2YXIgeG9yU2VnbWVudDtmb3IodmFyIGk9MDtpPHBsYWludGV4dC5sZW5ndGg7aSs9dGhpcy5zZWdtZW50U2l6ZSl7eG9yU2VnbWVudD10aGlzLl9hZXMuZW5jcnlwdCh0aGlzLl9zaGlmdFJlZ2lzdGVyKTtmb3IodmFyIGo9MDtqPHRoaXMuc2VnbWVudFNpemU7aisrKXtwbGFpbnRleHRbaStqXV49eG9yU2VnbWVudFtqXX1jb3B5QXJyYXkodGhpcy5fc2hpZnRSZWdpc3Rlcix0aGlzLl9zaGlmdFJlZ2lzdGVyLDAsdGhpcy5zZWdtZW50U2l6ZSk7Y29weUFycmF5KGNpcGhlcnRleHQsdGhpcy5fc2hpZnRSZWdpc3RlciwxNi10aGlzLnNlZ21lbnRTaXplLGksaSt0aGlzLnNlZ21lbnRTaXplKX1yZXR1cm4gcGxhaW50ZXh0fTt2YXIgTW9kZU9mT3BlcmF0aW9uT0ZCPWZ1bmN0aW9uKGtleSxpdil7aWYoISh0aGlzIGluc3RhbmNlb2YgTW9kZU9mT3BlcmF0aW9uT0ZCKSl7dGhyb3cgRXJyb3IoIkFFUyBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9dGhpcy5kZXNjcmlwdGlvbj0iT3V0cHV0IEZlZWRiYWNrIjt0aGlzLm5hbWU9Im9mYiI7aWYoIWl2KXtpdj1jcmVhdGVBcnJheSgxNil9ZWxzZSBpZihpdi5sZW5ndGghPTE2KXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgaW5pdGlhbGF0aW9uIHZlY3RvciBzaXplIChtdXN0IGJlIDE2IGJ5dGVzKSIpfXRoaXMuX2xhc3RQcmVjaXBoZXI9Y29lcmNlQXJyYXkoaXYsdHJ1ZSk7dGhpcy5fbGFzdFByZWNpcGhlckluZGV4PTE2O3RoaXMuX2Flcz1uZXcgQUVTKGtleSl9O01vZGVPZk9wZXJhdGlvbk9GQi5wcm90b3R5cGUuZW5jcnlwdD1mdW5jdGlvbihwbGFpbnRleHQpe3ZhciBlbmNyeXB0ZWQ9Y29lcmNlQXJyYXkocGxhaW50ZXh0LHRydWUpO2Zvcih2YXIgaT0wO2k8ZW5jcnlwdGVkLmxlbmd0aDtpKyspe2lmKHRoaXMuX2xhc3RQcmVjaXBoZXJJbmRleD09PTE2KXt0aGlzLl9sYXN0UHJlY2lwaGVyPXRoaXMuX2Flcy5lbmNyeXB0KHRoaXMuX2xhc3RQcmVjaXBoZXIpO3RoaXMuX2xhc3RQcmVjaXBoZXJJbmRleD0wfWVuY3J5cHRlZFtpXV49dGhpcy5fbGFzdFByZWNpcGhlclt0aGlzLl9sYXN0UHJlY2lwaGVySW5kZXgrK119cmV0dXJuIGVuY3J5cHRlZH07TW9kZU9mT3BlcmF0aW9uT0ZCLnByb3RvdHlwZS5kZWNyeXB0PU1vZGVPZk9wZXJhdGlvbk9GQi5wcm90b3R5cGUuZW5jcnlwdDt2YXIgQ291bnRlcj1mdW5jdGlvbihpbml0aWFsVmFsdWUpe2lmKCEodGhpcyBpbnN0YW5jZW9mIENvdW50ZXIpKXt0aHJvdyBFcnJvcigiQ291bnRlciBtdXN0IGJlIGluc3Rhbml0YXRlZCB3aXRoIGBuZXdgIil9aWYoaW5pdGlhbFZhbHVlIT09MCYmIWluaXRpYWxWYWx1ZSl7aW5pdGlhbFZhbHVlPTF9aWYodHlwZW9mIGluaXRpYWxWYWx1ZT09PSJudW1iZXIiKXt0aGlzLl9jb3VudGVyPWNyZWF0ZUFycmF5KDE2KTt0aGlzLnNldFZhbHVlKGluaXRpYWxWYWx1ZSl9ZWxzZXt0aGlzLnNldEJ5dGVzKGluaXRpYWxWYWx1ZSl9fTtDb3VudGVyLnByb3RvdHlwZS5zZXRWYWx1ZT1mdW5jdGlvbih2YWx1ZSl7aWYodHlwZW9mIHZhbHVlIT09Im51bWJlciJ8fHBhcnNlSW50KHZhbHVlKSE9dmFsdWUpe3Rocm93IG5ldyBFcnJvcigiaW52YWxpZCBjb3VudGVyIHZhbHVlIChtdXN0IGJlIGFuIGludGVnZXIpIil9aWYodmFsdWU+TnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpe3Rocm93IG5ldyBFcnJvcigiaW50ZWdlciB2YWx1ZSBvdXQgb2Ygc2FmZSByYW5nZSIpfWZvcih2YXIgaW5kZXg9MTU7aW5kZXg+PTA7LS1pbmRleCl7dGhpcy5fY291bnRlcltpbmRleF09dmFsdWUlMjU2O3ZhbHVlPXBhcnNlSW50KHZhbHVlLzI1Nil9fTtDb3VudGVyLnByb3RvdHlwZS5zZXRCeXRlcz1mdW5jdGlvbihieXRlcyl7Ynl0ZXM9Y29lcmNlQXJyYXkoYnl0ZXMsdHJ1ZSk7aWYoYnl0ZXMubGVuZ3RoIT0xNil7dGhyb3cgbmV3IEVycm9yKCJpbnZhbGlkIGNvdW50ZXIgYnl0ZXMgc2l6ZSAobXVzdCBiZSAxNiBieXRlcykiKX10aGlzLl9jb3VudGVyPWJ5dGVzfTtDb3VudGVyLnByb3RvdHlwZS5pbmNyZW1lbnQ9ZnVuY3Rpb24oKXtmb3IodmFyIGk9MTU7aT49MDtpLS0pe2lmKHRoaXMuX2NvdW50ZXJbaV09PT0yNTUpe3RoaXMuX2NvdW50ZXJbaV09MH1lbHNle3RoaXMuX2NvdW50ZXJbaV0rKzticmVha319fTt2YXIgTW9kZU9mT3BlcmF0aW9uQ1RSPWZ1bmN0aW9uKGtleSxjb3VudGVyKXtpZighKHRoaXMgaW5zdGFuY2VvZiBNb2RlT2ZPcGVyYXRpb25DVFIpKXt0aHJvdyBFcnJvcigiQUVTIG11c3QgYmUgaW5zdGFuaXRhdGVkIHdpdGggYG5ld2AiKX10aGlzLmRlc2NyaXB0aW9uPSJDb3VudGVyIjt0aGlzLm5hbWU9ImN0ciI7aWYoIShjb3VudGVyIGluc3RhbmNlb2YgQ291bnRlcikpe2NvdW50ZXI9bmV3IENvdW50ZXIoY291bnRlcil9dGhpcy5fY291bnRlcj1jb3VudGVyO3RoaXMuX3JlbWFpbmluZ0NvdW50ZXI9bnVsbDt0aGlzLl9yZW1haW5pbmdDb3VudGVySW5kZXg9MTY7dGhpcy5fYWVzPW5ldyBBRVMoa2V5KX07TW9kZU9mT3BlcmF0aW9uQ1RSLnByb3RvdHlwZS5lbmNyeXB0PWZ1bmN0aW9uKHBsYWludGV4dCl7dmFyIGVuY3J5cHRlZD1jb2VyY2VBcnJheShwbGFpbnRleHQsdHJ1ZSk7Zm9yKHZhciBpPTA7aTxlbmNyeXB0ZWQubGVuZ3RoO2krKyl7aWYodGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4PT09MTYpe3RoaXMuX3JlbWFpbmluZ0NvdW50ZXI9dGhpcy5fYWVzLmVuY3J5cHQodGhpcy5fY291bnRlci5fY291bnRlcik7dGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4PTA7dGhpcy5fY291bnRlci5pbmNyZW1lbnQoKX1lbmNyeXB0ZWRbaV1ePXRoaXMuX3JlbWFpbmluZ0NvdW50ZXJbdGhpcy5fcmVtYWluaW5nQ291bnRlckluZGV4KytdfXJldHVybiBlbmNyeXB0ZWR9O01vZGVPZk9wZXJhdGlvbkNUUi5wcm90b3R5cGUuZGVjcnlwdD1Nb2RlT2ZPcGVyYXRpb25DVFIucHJvdG90eXBlLmVuY3J5cHQ7ZnVuY3Rpb24gcGtjczdwYWQoZGF0YSl7ZGF0YT1jb2VyY2VBcnJheShkYXRhLHRydWUpO3ZhciBwYWRkZXI9MTYtZGF0YS5sZW5ndGglMTY7dmFyIHJlc3VsdD1jcmVhdGVBcnJheShkYXRhLmxlbmd0aCtwYWRkZXIpO2NvcHlBcnJheShkYXRhLHJlc3VsdCk7Zm9yKHZhciBpPWRhdGEubGVuZ3RoO2k8cmVzdWx0Lmxlbmd0aDtpKyspe3Jlc3VsdFtpXT1wYWRkZXJ9cmV0dXJuIHJlc3VsdH1mdW5jdGlvbiBwa2NzN3N0cmlwKGRhdGEpe2RhdGE9Y29lcmNlQXJyYXkoZGF0YSx0cnVlKTtpZihkYXRhLmxlbmd0aDwxNil7dGhyb3cgbmV3IEVycm9yKCJQS0NTIzcgaW52YWxpZCBsZW5ndGgiKX12YXIgcGFkZGVyPWRhdGFbZGF0YS5sZW5ndGgtMV07aWYocGFkZGVyPjE2KXt0aHJvdyBuZXcgRXJyb3IoIlBLQ1MjNyBwYWRkaW5nIGJ5dGUgb3V0IG9mIHJhbmdlIil9dmFyIGxlbmd0aD1kYXRhLmxlbmd0aC1wYWRkZXI7Zm9yKHZhciBpPTA7aTxwYWRkZXI7aSsrKXtpZihkYXRhW2xlbmd0aCtpXSE9PXBhZGRlcil7dGhyb3cgbmV3IEVycm9yKCJQS0NTIzcgaW52YWxpZCBwYWRkaW5nIGJ5dGUiKX19dmFyIHJlc3VsdD1jcmVhdGVBcnJheShsZW5ndGgpO2NvcHlBcnJheShkYXRhLHJlc3VsdCwwLDAsbGVuZ3RoKTtyZXR1cm4gcmVzdWx0fXZhciBhZXNqcz17QUVTOkFFUyxDb3VudGVyOkNvdW50ZXIsTW9kZU9mT3BlcmF0aW9uOntlY2I6TW9kZU9mT3BlcmF0aW9uRUNCLGNiYzpNb2RlT2ZPcGVyYXRpb25DQkMsY2ZiOk1vZGVPZk9wZXJhdGlvbkNGQixvZmI6TW9kZU9mT3BlcmF0aW9uT0ZCLGN0cjpNb2RlT2ZPcGVyYXRpb25DVFJ9LHV0aWxzOntoZXg6Y29udmVydEhleCx1dGY4OmNvbnZlcnRVdGY4fSxwYWRkaW5nOntwa2NzNzp7cGFkOnBrY3M3cGFkLHN0cmlwOnBrY3M3c3RyaXB9fSxfYXJyYXlUZXN0Ontjb2VyY2VBcnJheTpjb2VyY2VBcnJheSxjcmVhdGVBcnJheTpjcmVhdGVBcnJheSxjb3B5QXJyYXk6Y29weUFycmF5fX07aWYodHlwZW9mIGV4cG9ydHMhPT0idW5kZWZpbmVkIil7bW9kdWxlLmV4cG9ydHM9YWVzanN9ZWxzZSBpZih0eXBlb2YgZGVmaW5lPT09ImZ1bmN0aW9uIiYmZGVmaW5lLmFtZCl7ZGVmaW5lKFtdLGZ1bmN0aW9uKCl7cmV0dXJuIGFlc2pzfSl9ZWxzZXtpZihyb290LmFlc2pzKXthZXNqcy5fYWVzanM9cm9vdC5hZXNqc31yb290LmFlc2pzPWFlc2pzfX0pKHRoaXMpfSx7fV0sMTQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtuZXdJbnZhbGlkQXNuMUVycm9yOmZ1bmN0aW9uKG1zZyl7dmFyIGU9bmV3IEVycm9yO2UubmFtZT0iSW52YWxpZEFzbjFFcnJvciI7ZS5tZXNzYWdlPW1zZ3x8IiI7cmV0dXJuIGV9fX0se31dLDE1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgZXJyb3JzPXJlcXVpcmUoIi4vZXJyb3JzIik7dmFyIHR5cGVzPXJlcXVpcmUoIi4vdHlwZXMiKTt2YXIgUmVhZGVyPXJlcXVpcmUoIi4vcmVhZGVyIik7dmFyIFdyaXRlcj1yZXF1aXJlKCIuL3dyaXRlciIpO21vZHVsZS5leHBvcnRzPXtSZWFkZXI6UmVhZGVyLFdyaXRlcjpXcml0ZXJ9O2Zvcih2YXIgdCBpbiB0eXBlcyl7aWYodHlwZXMuaGFzT3duUHJvcGVydHkodCkpbW9kdWxlLmV4cG9ydHNbdF09dHlwZXNbdF19Zm9yKHZhciBlIGluIGVycm9ycyl7aWYoZXJyb3JzLmhhc093blByb3BlcnR5KGUpKW1vZHVsZS5leHBvcnRzW2VdPWVycm9yc1tlXX19LHsiLi9lcnJvcnMiOjE0LCIuL3JlYWRlciI6MTYsIi4vdHlwZXMiOjE3LCIuL3dyaXRlciI6MTh9XSwxNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGFzc2VydD1yZXF1aXJlKCJhc3NlcnQiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmVyLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgQVNOMT1yZXF1aXJlKCIuL3R5cGVzIik7dmFyIGVycm9ycz1yZXF1aXJlKCIuL2Vycm9ycyIpO3ZhciBuZXdJbnZhbGlkQXNuMUVycm9yPWVycm9ycy5uZXdJbnZhbGlkQXNuMUVycm9yO2Z1bmN0aW9uIFJlYWRlcihkYXRhKXtpZighZGF0YXx8IUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl0aHJvdyBuZXcgVHlwZUVycm9yKCJkYXRhIG11c3QgYmUgYSBub2RlIEJ1ZmZlciIpO3RoaXMuX2J1Zj1kYXRhO3RoaXMuX3NpemU9ZGF0YS5sZW5ndGg7dGhpcy5fbGVuPTA7dGhpcy5fb2Zmc2V0PTB9T2JqZWN0LmRlZmluZVByb3BlcnR5KFJlYWRlci5wcm90b3R5cGUsImxlbmd0aCIse2VudW1lcmFibGU6dHJ1ZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbGVufX0pO09iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWFkZXIucHJvdG90eXBlLCJvZmZzZXQiLHtlbnVtZXJhYmxlOnRydWUsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX29mZnNldH19KTtPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVhZGVyLnByb3RvdHlwZSwicmVtYWluIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3NpemUtdGhpcy5fb2Zmc2V0fX0pO09iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWFkZXIucHJvdG90eXBlLCJidWZmZXIiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fYnVmLnNsaWNlKHRoaXMuX29mZnNldCl9fSk7UmVhZGVyLnByb3RvdHlwZS5yZWFkQnl0ZT1mdW5jdGlvbihwZWVrKXtpZih0aGlzLl9zaXplLXRoaXMuX29mZnNldDwxKXJldHVybiBudWxsO3ZhciBiPXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXRdJjI1NTtpZighcGVlayl0aGlzLl9vZmZzZXQrPTE7cmV0dXJuIGJ9O1JlYWRlci5wcm90b3R5cGUucGVlaz1mdW5jdGlvbigpe3JldHVybiB0aGlzLnJlYWRCeXRlKHRydWUpfTtSZWFkZXIucHJvdG90eXBlLnJlYWRMZW5ndGg9ZnVuY3Rpb24ob2Zmc2V0KXtpZihvZmZzZXQ9PT11bmRlZmluZWQpb2Zmc2V0PXRoaXMuX29mZnNldDtpZihvZmZzZXQ+PXRoaXMuX3NpemUpcmV0dXJuIG51bGw7dmFyIGxlbkI9dGhpcy5fYnVmW29mZnNldCsrXSYyNTU7aWYobGVuQj09PW51bGwpcmV0dXJuIG51bGw7aWYoKGxlbkImMTI4KT09PTEyOCl7bGVuQiY9MTI3O2lmKGxlbkI9PT0wKXRocm93IG5ld0ludmFsaWRBc24xRXJyb3IoIkluZGVmaW5pdGUgbGVuZ3RoIG5vdCBzdXBwb3J0ZWQiKTtpZihsZW5CPjQpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiZW5jb2RpbmcgdG9vIGxvbmciKTtpZih0aGlzLl9zaXplLW9mZnNldDxsZW5CKXJldHVybiBudWxsO3RoaXMuX2xlbj0wO2Zvcih2YXIgaT0wO2k8bGVuQjtpKyspdGhpcy5fbGVuPSh0aGlzLl9sZW48PDgpKyh0aGlzLl9idWZbb2Zmc2V0KytdJjI1NSl9ZWxzZXt0aGlzLl9sZW49bGVuQn1yZXR1cm4gb2Zmc2V0fTtSZWFkZXIucHJvdG90eXBlLnJlYWRTZXF1ZW5jZT1mdW5jdGlvbih0YWcpe3ZhciBzZXE9dGhpcy5wZWVrKCk7aWYoc2VxPT09bnVsbClyZXR1cm4gbnVsbDtpZih0YWchPT11bmRlZmluZWQmJnRhZyE9PXNlcSl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJFeHBlY3RlZCAweCIrdGFnLnRvU3RyaW5nKDE2KSsiOiBnb3QgMHgiK3NlcS50b1N0cmluZygxNikpO3ZhciBvPXRoaXMucmVhZExlbmd0aCh0aGlzLl9vZmZzZXQrMSk7aWYobz09PW51bGwpcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87cmV0dXJuIHNlcX07UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRUYWcoQVNOMS5JbnRlZ2VyKX07UmVhZGVyLnByb3RvdHlwZS5yZWFkQm9vbGVhbj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9yZWFkVGFnKEFTTjEuQm9vbGVhbik9PT0wP2ZhbHNlOnRydWV9O1JlYWRlci5wcm90b3R5cGUucmVhZEVudW1lcmF0aW9uPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRUYWcoQVNOMS5FbnVtZXJhdGlvbil9O1JlYWRlci5wcm90b3R5cGUucmVhZFN0cmluZz1mdW5jdGlvbih0YWcscmV0YnVmKXtpZighdGFnKXRhZz1BU04xLk9jdGV0U3RyaW5nO3ZhciBiPXRoaXMucGVlaygpO2lmKGI9PT1udWxsKXJldHVybiBudWxsO2lmKGIhPT10YWcpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiRXhwZWN0ZWQgMHgiK3RhZy50b1N0cmluZygxNikrIjogZ290IDB4IitiLnRvU3RyaW5nKDE2KSk7dmFyIG89dGhpcy5yZWFkTGVuZ3RoKHRoaXMuX29mZnNldCsxKTtpZihvPT09bnVsbClyZXR1cm4gbnVsbDtpZih0aGlzLmxlbmd0aD50aGlzLl9zaXplLW8pcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87aWYodGhpcy5sZW5ndGg9PT0wKXJldHVybiByZXRidWY/QnVmZmVyLmFsbG9jKDApOiIiO3ZhciBzdHI9dGhpcy5fYnVmLnNsaWNlKHRoaXMuX29mZnNldCx0aGlzLl9vZmZzZXQrdGhpcy5sZW5ndGgpO3RoaXMuX29mZnNldCs9dGhpcy5sZW5ndGg7cmV0dXJuIHJldGJ1Zj9zdHI6c3RyLnRvU3RyaW5nKCJ1dGY4Iil9O1JlYWRlci5wcm90b3R5cGUucmVhZE9JRD1mdW5jdGlvbih0YWcpe2lmKCF0YWcpdGFnPUFTTjEuT0lEO3ZhciBiPXRoaXMucmVhZFN0cmluZyh0YWcsdHJ1ZSk7aWYoYj09PW51bGwpcmV0dXJuIG51bGw7dmFyIHZhbHVlcz1bXTt2YXIgdmFsdWU9MDtmb3IodmFyIGk9MDtpPGIubGVuZ3RoO2krKyl7dmFyIGJ5dGU9YltpXSYyNTU7dmFsdWU8PD03O3ZhbHVlKz1ieXRlJjEyNztpZigoYnl0ZSYxMjgpPT09MCl7dmFsdWVzLnB1c2godmFsdWUpO3ZhbHVlPTB9fXZhbHVlPXZhbHVlcy5zaGlmdCgpO3ZhbHVlcy51bnNoaWZ0KHZhbHVlJTQwKTt2YWx1ZXMudW5zaGlmdCh2YWx1ZS80MD4+MCk7cmV0dXJuIHZhbHVlcy5qb2luKCIuIil9O1JlYWRlci5wcm90b3R5cGUuX3JlYWRUYWc9ZnVuY3Rpb24odGFnKXthc3NlcnQub2sodGFnIT09dW5kZWZpbmVkKTt2YXIgYj10aGlzLnBlZWsoKTtpZihiPT09bnVsbClyZXR1cm4gbnVsbDtpZihiIT09dGFnKXRocm93IG5ld0ludmFsaWRBc24xRXJyb3IoIkV4cGVjdGVkIDB4Iit0YWcudG9TdHJpbmcoMTYpKyI6IGdvdCAweCIrYi50b1N0cmluZygxNikpO3ZhciBvPXRoaXMucmVhZExlbmd0aCh0aGlzLl9vZmZzZXQrMSk7aWYobz09PW51bGwpcmV0dXJuIG51bGw7aWYodGhpcy5sZW5ndGg+NCl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJJbnRlZ2VyIHRvbyBsb25nOiAiK3RoaXMubGVuZ3RoKTtpZih0aGlzLmxlbmd0aD50aGlzLl9zaXplLW8pcmV0dXJuIG51bGw7dGhpcy5fb2Zmc2V0PW87dmFyIGZiPXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXRdO3ZhciB2YWx1ZT0wO2Zvcih2YXIgaT0wO2k8dGhpcy5sZW5ndGg7aSsrKXt2YWx1ZTw8PTg7dmFsdWV8PXRoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK10mMjU1fWlmKChmYiYxMjgpPT09MTI4JiZpIT09NCl2YWx1ZS09MTw8aSo4O3JldHVybiB2YWx1ZT4+MH07bW9kdWxlLmV4cG9ydHM9UmVhZGVyfSx7Ii4vZXJyb3JzIjoxNCwiLi90eXBlcyI6MTcsYXNzZXJ0OjIwLCJzYWZlci1idWZmZXIiOjg0fV0sMTc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtFT0M6MCxCb29sZWFuOjEsSW50ZWdlcjoyLEJpdFN0cmluZzozLE9jdGV0U3RyaW5nOjQsTnVsbDo1LE9JRDo2LE9iamVjdERlc2NyaXB0b3I6NyxFeHRlcm5hbDo4LFJlYWw6OSxFbnVtZXJhdGlvbjoxMCxQRFY6MTEsVXRmOFN0cmluZzoxMixSZWxhdGl2ZU9JRDoxMyxTZXF1ZW5jZToxNixTZXQ6MTcsTnVtZXJpY1N0cmluZzoxOCxQcmludGFibGVTdHJpbmc6MTksVDYxU3RyaW5nOjIwLFZpZGVvdGV4U3RyaW5nOjIxLElBNVN0cmluZzoyMixVVENUaW1lOjIzLEdlbmVyYWxpemVkVGltZToyNCxHcmFwaGljU3RyaW5nOjI1LFZpc2libGVTdHJpbmc6MjYsR2VuZXJhbFN0cmluZzoyOCxVbml2ZXJzYWxTdHJpbmc6MjksQ2hhcmFjdGVyU3RyaW5nOjMwLEJNUFN0cmluZzozMSxDb25zdHJ1Y3RvcjozMixDb250ZXh0OjEyOH19LHt9XSwxODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGFzc2VydD1yZXF1aXJlKCJhc3NlcnQiKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmVyLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgQVNOMT1yZXF1aXJlKCIuL3R5cGVzIik7dmFyIGVycm9ycz1yZXF1aXJlKCIuL2Vycm9ycyIpO3ZhciBuZXdJbnZhbGlkQXNuMUVycm9yPWVycm9ycy5uZXdJbnZhbGlkQXNuMUVycm9yO3ZhciBERUZBVUxUX09QVFM9e3NpemU6MTAyNCxncm93dGhGYWN0b3I6OH07ZnVuY3Rpb24gbWVyZ2UoZnJvbSx0byl7YXNzZXJ0Lm9rKGZyb20pO2Fzc2VydC5lcXVhbCh0eXBlb2YgZnJvbSwib2JqZWN0Iik7YXNzZXJ0Lm9rKHRvKTthc3NlcnQuZXF1YWwodHlwZW9mIHRvLCJvYmplY3QiKTt2YXIga2V5cz1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhmcm9tKTtrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtpZih0b1trZXldKXJldHVybjt2YXIgdmFsdWU9T2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihmcm9tLGtleSk7T2JqZWN0LmRlZmluZVByb3BlcnR5KHRvLGtleSx2YWx1ZSl9KTtyZXR1cm4gdG99ZnVuY3Rpb24gV3JpdGVyKG9wdGlvbnMpe29wdGlvbnM9bWVyZ2UoREVGQVVMVF9PUFRTLG9wdGlvbnN8fHt9KTt0aGlzLl9idWY9QnVmZmVyLmFsbG9jKG9wdGlvbnMuc2l6ZXx8MTAyNCk7dGhpcy5fc2l6ZT10aGlzLl9idWYubGVuZ3RoO3RoaXMuX29mZnNldD0wO3RoaXMuX29wdGlvbnM9b3B0aW9uczt0aGlzLl9zZXE9W119T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRlci5wcm90b3R5cGUsImJ1ZmZlciIse2dldDpmdW5jdGlvbigpe2lmKHRoaXMuX3NlcS5sZW5ndGgpdGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcih0aGlzLl9zZXEubGVuZ3RoKyIgdW5lbmRlZCBzZXF1ZW5jZShzKSIpO3JldHVybiB0aGlzLl9idWYuc2xpY2UoMCx0aGlzLl9vZmZzZXQpfX0pO1dyaXRlci5wcm90b3R5cGUud3JpdGVCeXRlPWZ1bmN0aW9uKGIpe2lmKHR5cGVvZiBiIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO3RoaXMuX2Vuc3VyZSgxKTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPWJ9O1dyaXRlci5wcm90b3R5cGUud3JpdGVJbnQ9ZnVuY3Rpb24oaSx0YWcpe2lmKHR5cGVvZiBpIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5JbnRlZ2VyO3ZhciBzej00O3doaWxlKCgoaSY0Mjg2NTc4Njg4KT09PTB8fChpJjQyODY1Nzg2ODgpPT09NDI4NjU3ODY4OD4+MCkmJnN6PjEpe3N6LS07aTw8PTh9aWYoc3o+NCl0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJCRVIgaW50cyBjYW5ub3QgYmUgPiAweGZmZmZmZmZmIik7dGhpcy5fZW5zdXJlKDIrc3opO3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109dGFnO3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109c3o7d2hpbGUoc3otLSA+MCl7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT0oaSY0Mjc4MTkwMDgwKT4+PjI0O2k8PD04fX07V3JpdGVyLnByb3RvdHlwZS53cml0ZU51bGw9ZnVuY3Rpb24oKXt0aGlzLndyaXRlQnl0ZShBU04xLk51bGwpO3RoaXMud3JpdGVCeXRlKDApfTtXcml0ZXIucHJvdG90eXBlLndyaXRlRW51bWVyYXRpb249ZnVuY3Rpb24oaSx0YWcpe2lmKHR5cGVvZiBpIT09Im51bWJlciIpdGhyb3cgbmV3IFR5cGVFcnJvcigiYXJndW1lbnQgbXVzdCBiZSBhIE51bWJlciIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5FbnVtZXJhdGlvbjtyZXR1cm4gdGhpcy53cml0ZUludChpLHRhZyl9O1dyaXRlci5wcm90b3R5cGUud3JpdGVCb29sZWFuPWZ1bmN0aW9uKGIsdGFnKXtpZih0eXBlb2YgYiE9PSJib29sZWFuIil0aHJvdyBuZXcgVHlwZUVycm9yKCJhcmd1bWVudCBtdXN0IGJlIGEgQm9vbGVhbiIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5Cb29sZWFuO3RoaXMuX2Vuc3VyZSgzKTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPXRhZzt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPTE7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1iPzI1NTowfTtXcml0ZXIucHJvdG90eXBlLndyaXRlU3RyaW5nPWZ1bmN0aW9uKHMsdGFnKXtpZih0eXBlb2YgcyE9PSJzdHJpbmciKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcgKHdhczogIit0eXBlb2YgcysiKSIpO2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5PY3RldFN0cmluZzt2YXIgbGVuPUJ1ZmZlci5ieXRlTGVuZ3RoKHMpO3RoaXMud3JpdGVCeXRlKHRhZyk7dGhpcy53cml0ZUxlbmd0aChsZW4pO2lmKGxlbil7dGhpcy5fZW5zdXJlKGxlbik7dGhpcy5fYnVmLndyaXRlKHMsdGhpcy5fb2Zmc2V0KTt0aGlzLl9vZmZzZXQrPWxlbn19O1dyaXRlci5wcm90b3R5cGUud3JpdGVCdWZmZXI9ZnVuY3Rpb24oYnVmLHRhZyl7aWYodHlwZW9mIHRhZyE9PSJudW1iZXIiKXRocm93IG5ldyBUeXBlRXJyb3IoInRhZyBtdXN0IGJlIGEgbnVtYmVyIik7aWYoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBidWZmZXIiKTt0aGlzLndyaXRlQnl0ZSh0YWcpO3RoaXMud3JpdGVMZW5ndGgoYnVmLmxlbmd0aCk7dGhpcy5fZW5zdXJlKGJ1Zi5sZW5ndGgpO2J1Zi5jb3B5KHRoaXMuX2J1Zix0aGlzLl9vZmZzZXQsMCxidWYubGVuZ3RoKTt0aGlzLl9vZmZzZXQrPWJ1Zi5sZW5ndGh9O1dyaXRlci5wcm90b3R5cGUud3JpdGVTdHJpbmdBcnJheT1mdW5jdGlvbihzdHJpbmdzKXtpZighc3RyaW5ncyBpbnN0YW5jZW9mIEFycmF5KXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXlbU3RyaW5nXSIpO3ZhciBzZWxmPXRoaXM7c3RyaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKHMpe3NlbGYud3JpdGVTdHJpbmcocyl9KX07V3JpdGVyLnByb3RvdHlwZS53cml0ZU9JRD1mdW5jdGlvbihzLHRhZyl7aWYodHlwZW9mIHMhPT0ic3RyaW5nIil0aHJvdyBuZXcgVHlwZUVycm9yKCJhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nIik7aWYodHlwZW9mIHRhZyE9PSJudW1iZXIiKXRhZz1BU04xLk9JRDtpZighL14oWzAtOV0rXC4pezMsfVswLTldKyQvLnRlc3QocykpdGhyb3cgbmV3IEVycm9yKCJhcmd1bWVudCBpcyBub3QgYSB2YWxpZCBPSUQgc3RyaW5nIik7ZnVuY3Rpb24gZW5jb2RlT2N0ZXQoYnl0ZXMsb2N0ZXQpe2lmKG9jdGV0PDEyOCl7Ynl0ZXMucHVzaChvY3RldCl9ZWxzZSBpZihvY3RldDwxNjM4NCl7Ynl0ZXMucHVzaChvY3RldD4+Pjd8MTI4KTtieXRlcy5wdXNoKG9jdGV0JjEyNyl9ZWxzZSBpZihvY3RldDwyMDk3MTUyKXtieXRlcy5wdXNoKG9jdGV0Pj4+MTR8MTI4KTtieXRlcy5wdXNoKChvY3RldD4+Pjd8MTI4KSYyNTUpO2J5dGVzLnB1c2gob2N0ZXQmMTI3KX1lbHNlIGlmKG9jdGV0PDI2ODQzNTQ1Nil7Ynl0ZXMucHVzaChvY3RldD4+PjIxfDEyOCk7Ynl0ZXMucHVzaCgob2N0ZXQ+Pj4xNHwxMjgpJjI1NSk7Ynl0ZXMucHVzaCgob2N0ZXQ+Pj43fDEyOCkmMjU1KTtieXRlcy5wdXNoKG9jdGV0JjEyNyl9ZWxzZXtieXRlcy5wdXNoKChvY3RldD4+PjI4fDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+PjIxfDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+PjE0fDEyOCkmMjU1KTtieXRlcy5wdXNoKChvY3RldD4+Pjd8MTI4KSYyNTUpO2J5dGVzLnB1c2gob2N0ZXQmMTI3KX19dmFyIHRtcD1zLnNwbGl0KCIuIik7dmFyIGJ5dGVzPVtdO2J5dGVzLnB1c2gocGFyc2VJbnQodG1wWzBdLDEwKSo0MCtwYXJzZUludCh0bXBbMV0sMTApKTt0bXAuc2xpY2UoMikuZm9yRWFjaChmdW5jdGlvbihiKXtlbmNvZGVPY3RldChieXRlcyxwYXJzZUludChiLDEwKSl9KTt2YXIgc2VsZj10aGlzO3RoaXMuX2Vuc3VyZSgyK2J5dGVzLmxlbmd0aCk7dGhpcy53cml0ZUJ5dGUodGFnKTt0aGlzLndyaXRlTGVuZ3RoKGJ5dGVzLmxlbmd0aCk7Ynl0ZXMuZm9yRWFjaChmdW5jdGlvbihiKXtzZWxmLndyaXRlQnl0ZShiKX0pfTtXcml0ZXIucHJvdG90eXBlLndyaXRlTGVuZ3RoPWZ1bmN0aW9uKGxlbil7aWYodHlwZW9mIGxlbiE9PSJudW1iZXIiKXRocm93IG5ldyBUeXBlRXJyb3IoImFyZ3VtZW50IG11c3QgYmUgYSBOdW1iZXIiKTt0aGlzLl9lbnN1cmUoNCk7aWYobGVuPD0xMjcpe3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109bGVufWVsc2UgaWYobGVuPD0yNTUpe3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109MTI5O3RoaXMuX2J1Zlt0aGlzLl9vZmZzZXQrK109bGVufWVsc2UgaWYobGVuPD02NTUzNSl7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT0xMzA7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW4+Pjg7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW59ZWxzZSBpZihsZW48PTE2Nzc3MjE1KXt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPTEzMTt0aGlzLl9idWZbdGhpcy5fb2Zmc2V0KytdPWxlbj4+MTY7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW4+Pjg7dGhpcy5fYnVmW3RoaXMuX29mZnNldCsrXT1sZW59ZWxzZXt0aHJvdyBuZXdJbnZhbGlkQXNuMUVycm9yKCJMZW5ndGggdG9vIGxvbmcgKD4gNCBieXRlcykiKX19O1dyaXRlci5wcm90b3R5cGUuc3RhcnRTZXF1ZW5jZT1mdW5jdGlvbih0YWcpe2lmKHR5cGVvZiB0YWchPT0ibnVtYmVyIil0YWc9QVNOMS5TZXF1ZW5jZXxBU04xLkNvbnN0cnVjdG9yO3RoaXMud3JpdGVCeXRlKHRhZyk7dGhpcy5fc2VxLnB1c2godGhpcy5fb2Zmc2V0KTt0aGlzLl9lbnN1cmUoMyk7dGhpcy5fb2Zmc2V0Kz0zfTtXcml0ZXIucHJvdG90eXBlLmVuZFNlcXVlbmNlPWZ1bmN0aW9uKCl7dmFyIHNlcT10aGlzLl9zZXEucG9wKCk7dmFyIHN0YXJ0PXNlcSszO3ZhciBsZW49dGhpcy5fb2Zmc2V0LXN0YXJ0O2lmKGxlbjw9MTI3KXt0aGlzLl9zaGlmdChzdGFydCxsZW4sLTIpO3RoaXMuX2J1ZltzZXFdPWxlbn1lbHNlIGlmKGxlbjw9MjU1KXt0aGlzLl9zaGlmdChzdGFydCxsZW4sLTEpO3RoaXMuX2J1ZltzZXFdPTEyOTt0aGlzLl9idWZbc2VxKzFdPWxlbn1lbHNlIGlmKGxlbjw9NjU1MzUpe3RoaXMuX2J1ZltzZXFdPTEzMDt0aGlzLl9idWZbc2VxKzFdPWxlbj4+ODt0aGlzLl9idWZbc2VxKzJdPWxlbn1lbHNlIGlmKGxlbjw9MTY3NzcyMTUpe3RoaXMuX3NoaWZ0KHN0YXJ0LGxlbiwxKTt0aGlzLl9idWZbc2VxXT0xMzE7dGhpcy5fYnVmW3NlcSsxXT1sZW4+PjE2O3RoaXMuX2J1ZltzZXErMl09bGVuPj44O3RoaXMuX2J1ZltzZXErM109bGVufWVsc2V7dGhyb3cgbmV3SW52YWxpZEFzbjFFcnJvcigiU2VxdWVuY2UgdG9vIGxvbmciKX19O1dyaXRlci5wcm90b3R5cGUuX3NoaWZ0PWZ1bmN0aW9uKHN0YXJ0LGxlbixzaGlmdCl7YXNzZXJ0Lm9rKHN0YXJ0IT09dW5kZWZpbmVkKTthc3NlcnQub2sobGVuIT09dW5kZWZpbmVkKTthc3NlcnQub2soc2hpZnQpO3RoaXMuX2J1Zi5jb3B5KHRoaXMuX2J1ZixzdGFydCtzaGlmdCxzdGFydCxzdGFydCtsZW4pO3RoaXMuX29mZnNldCs9c2hpZnR9O1dyaXRlci5wcm90b3R5cGUuX2Vuc3VyZT1mdW5jdGlvbihsZW4pe2Fzc2VydC5vayhsZW4pO2lmKHRoaXMuX3NpemUtdGhpcy5fb2Zmc2V0PGxlbil7dmFyIHN6PXRoaXMuX3NpemUqdGhpcy5fb3B0aW9ucy5ncm93dGhGYWN0b3I7aWYoc3otdGhpcy5fb2Zmc2V0PGxlbilzeis9bGVuO3ZhciBidWY9QnVmZmVyLmFsbG9jKHN6KTt0aGlzLl9idWYuY29weShidWYsMCwwLHRoaXMuX29mZnNldCk7dGhpcy5fYnVmPWJ1Zjt0aGlzLl9zaXplPXN6fX07bW9kdWxlLmV4cG9ydHM9V3JpdGVyfSx7Ii4vZXJyb3JzIjoxNCwiLi90eXBlcyI6MTcsYXNzZXJ0OjIwLCJzYWZlci1idWZmZXIiOjg0fV0sMTk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBCZXI9cmVxdWlyZSgiLi9iZXIvaW5kZXgiKTttb2R1bGUuZXhwb3J0cz17QmVyOkJlcixCZXJSZWFkZXI6QmVyLlJlYWRlcixCZXJXcml0ZXI6QmVyLldyaXRlcn19LHsiLi9iZXIvaW5kZXgiOjE1fV0sMjA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwpeyJ1c2Ugc3RyaWN0Ijt2YXIgb2JqZWN0QXNzaWduPXJlcXVpcmUoIm9iamVjdC1hc3NpZ24iKTtmdW5jdGlvbiBjb21wYXJlKGEsYil7aWYoYT09PWIpe3JldHVybiAwfXZhciB4PWEubGVuZ3RoO3ZhciB5PWIubGVuZ3RoO2Zvcih2YXIgaT0wLGxlbj1NYXRoLm1pbih4LHkpO2k8bGVuOysraSl7aWYoYVtpXSE9PWJbaV0pe3g9YVtpXTt5PWJbaV07YnJlYWt9fWlmKHg8eSl7cmV0dXJuLTF9aWYoeTx4KXtyZXR1cm4gMX1yZXR1cm4gMH1mdW5jdGlvbiBpc0J1ZmZlcihiKXtpZihnbG9iYWwuQnVmZmVyJiZ0eXBlb2YgZ2xvYmFsLkJ1ZmZlci5pc0J1ZmZlcj09PSJmdW5jdGlvbiIpe3JldHVybiBnbG9iYWwuQnVmZmVyLmlzQnVmZmVyKGIpfXJldHVybiEhKGIhPW51bGwmJmIuX2lzQnVmZmVyKX12YXIgdXRpbD1yZXF1aXJlKCJ1dGlsLyIpO3ZhciBoYXNPd249T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTt2YXIgcFNsaWNlPUFycmF5LnByb3RvdHlwZS5zbGljZTt2YXIgZnVuY3Rpb25zSGF2ZU5hbWVzPWZ1bmN0aW9uKCl7cmV0dXJuIGZ1bmN0aW9uIGZvbygpe30ubmFtZT09PSJmb28ifSgpO2Z1bmN0aW9uIHBUb1N0cmluZyhvYmope3JldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKX1mdW5jdGlvbiBpc1ZpZXcoYXJyYnVmKXtpZihpc0J1ZmZlcihhcnJidWYpKXtyZXR1cm4gZmFsc2V9aWYodHlwZW9mIGdsb2JhbC5BcnJheUJ1ZmZlciE9PSJmdW5jdGlvbiIpe3JldHVybiBmYWxzZX1pZih0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3PT09ImZ1bmN0aW9uIil7cmV0dXJuIEFycmF5QnVmZmVyLmlzVmlldyhhcnJidWYpfWlmKCFhcnJidWYpe3JldHVybiBmYWxzZX1pZihhcnJidWYgaW5zdGFuY2VvZiBEYXRhVmlldyl7cmV0dXJuIHRydWV9aWYoYXJyYnVmLmJ1ZmZlciYmYXJyYnVmLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKXtyZXR1cm4gdHJ1ZX1yZXR1cm4gZmFsc2V9dmFyIGFzc2VydD1tb2R1bGUuZXhwb3J0cz1vazt2YXIgcmVnZXg9L1xzKmZ1bmN0aW9uXHMrKFteXChcc10qKVxzKi87ZnVuY3Rpb24gZ2V0TmFtZShmdW5jKXtpZighdXRpbC5pc0Z1bmN0aW9uKGZ1bmMpKXtyZXR1cm59aWYoZnVuY3Rpb25zSGF2ZU5hbWVzKXtyZXR1cm4gZnVuYy5uYW1lfXZhciBzdHI9ZnVuYy50b1N0cmluZygpO3ZhciBtYXRjaD1zdHIubWF0Y2gocmVnZXgpO3JldHVybiBtYXRjaCYmbWF0Y2hbMV19YXNzZXJ0LkFzc2VydGlvbkVycm9yPWZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpe3RoaXMubmFtZT0iQXNzZXJ0aW9uRXJyb3IiO3RoaXMuYWN0dWFsPW9wdGlvbnMuYWN0dWFsO3RoaXMuZXhwZWN0ZWQ9b3B0aW9ucy5leHBlY3RlZDt0aGlzLm9wZXJhdG9yPW9wdGlvbnMub3BlcmF0b3I7aWYob3B0aW9ucy5tZXNzYWdlKXt0aGlzLm1lc3NhZ2U9b3B0aW9ucy5tZXNzYWdlO3RoaXMuZ2VuZXJhdGVkTWVzc2FnZT1mYWxzZX1lbHNle3RoaXMubWVzc2FnZT1nZXRNZXNzYWdlKHRoaXMpO3RoaXMuZ2VuZXJhdGVkTWVzc2FnZT10cnVlfXZhciBzdGFja1N0YXJ0RnVuY3Rpb249b3B0aW9ucy5zdGFja1N0YXJ0RnVuY3Rpb258fGZhaWw7aWYoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2Upe0Vycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsc3RhY2tTdGFydEZ1bmN0aW9uKX1lbHNle3ZhciBlcnI9bmV3IEVycm9yO2lmKGVyci5zdGFjayl7dmFyIG91dD1lcnIuc3RhY2s7dmFyIGZuX25hbWU9Z2V0TmFtZShzdGFja1N0YXJ0RnVuY3Rpb24pO3ZhciBpZHg9b3V0LmluZGV4T2YoIlxuIitmbl9uYW1lKTtpZihpZHg+PTApe3ZhciBuZXh0X2xpbmU9b3V0LmluZGV4T2YoIlxuIixpZHgrMSk7b3V0PW91dC5zdWJzdHJpbmcobmV4dF9saW5lKzEpfXRoaXMuc3RhY2s9b3V0fX19O3V0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLEVycm9yKTtmdW5jdGlvbiB0cnVuY2F0ZShzLG4pe2lmKHR5cGVvZiBzPT09InN0cmluZyIpe3JldHVybiBzLmxlbmd0aDxuP3M6cy5zbGljZSgwLG4pfWVsc2V7cmV0dXJuIHN9fWZ1bmN0aW9uIGluc3BlY3Qoc29tZXRoaW5nKXtpZihmdW5jdGlvbnNIYXZlTmFtZXN8fCF1dGlsLmlzRnVuY3Rpb24oc29tZXRoaW5nKSl7cmV0dXJuIHV0aWwuaW5zcGVjdChzb21ldGhpbmcpfXZhciByYXduYW1lPWdldE5hbWUoc29tZXRoaW5nKTt2YXIgbmFtZT1yYXduYW1lPyI6ICIrcmF3bmFtZToiIjtyZXR1cm4iW0Z1bmN0aW9uIituYW1lKyJdIn1mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpe3JldHVybiB0cnVuY2F0ZShpbnNwZWN0KHNlbGYuYWN0dWFsKSwxMjgpKyIgIitzZWxmLm9wZXJhdG9yKyIgIit0cnVuY2F0ZShpbnNwZWN0KHNlbGYuZXhwZWN0ZWQpLDEyOCl9ZnVuY3Rpb24gZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSxvcGVyYXRvcixzdGFja1N0YXJ0RnVuY3Rpb24pe3Rocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe21lc3NhZ2U6bWVzc2FnZSxhY3R1YWw6YWN0dWFsLGV4cGVjdGVkOmV4cGVjdGVkLG9wZXJhdG9yOm9wZXJhdG9yLHN0YWNrU3RhcnRGdW5jdGlvbjpzdGFja1N0YXJ0RnVuY3Rpb259KX1hc3NlcnQuZmFpbD1mYWlsO2Z1bmN0aW9uIG9rKHZhbHVlLG1lc3NhZ2Upe2lmKCF2YWx1ZSlmYWlsKHZhbHVlLHRydWUsbWVzc2FnZSwiPT0iLGFzc2VydC5vayl9YXNzZXJ0Lm9rPW9rO2Fzc2VydC5lcXVhbD1mdW5jdGlvbiBlcXVhbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSl7aWYoYWN0dWFsIT1leHBlY3RlZClmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCI9PSIsYXNzZXJ0LmVxdWFsKX07YXNzZXJ0Lm5vdEVxdWFsPWZ1bmN0aW9uIG5vdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWw9PWV4cGVjdGVkKXtmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCIhPSIsYXNzZXJ0Lm5vdEVxdWFsKX19O2Fzc2VydC5kZWVwRXF1YWw9ZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZighX2RlZXBFcXVhbChhY3R1YWwsZXhwZWN0ZWQsZmFsc2UpKXtmYWlsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlLCJkZWVwRXF1YWwiLGFzc2VydC5kZWVwRXF1YWwpfX07YXNzZXJ0LmRlZXBTdHJpY3RFcXVhbD1mdW5jdGlvbiBkZWVwU3RyaWN0RXF1YWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2Upe2lmKCFfZGVlcEVxdWFsKGFjdHVhbCxleHBlY3RlZCx0cnVlKSl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiZGVlcFN0cmljdEVxdWFsIixhc3NlcnQuZGVlcFN0cmljdEVxdWFsKX19O2Z1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLHN0cmljdCxtZW1vcyl7aWYoYWN0dWFsPT09ZXhwZWN0ZWQpe3JldHVybiB0cnVlfWVsc2UgaWYoaXNCdWZmZXIoYWN0dWFsKSYmaXNCdWZmZXIoZXhwZWN0ZWQpKXtyZXR1cm4gY29tcGFyZShhY3R1YWwsZXhwZWN0ZWQpPT09MH1lbHNlIGlmKHV0aWwuaXNEYXRlKGFjdHVhbCkmJnV0aWwuaXNEYXRlKGV4cGVjdGVkKSl7cmV0dXJuIGFjdHVhbC5nZXRUaW1lKCk9PT1leHBlY3RlZC5nZXRUaW1lKCl9ZWxzZSBpZih1dGlsLmlzUmVnRXhwKGFjdHVhbCkmJnV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKXtyZXR1cm4gYWN0dWFsLnNvdXJjZT09PWV4cGVjdGVkLnNvdXJjZSYmYWN0dWFsLmdsb2JhbD09PWV4cGVjdGVkLmdsb2JhbCYmYWN0dWFsLm11bHRpbGluZT09PWV4cGVjdGVkLm11bHRpbGluZSYmYWN0dWFsLmxhc3RJbmRleD09PWV4cGVjdGVkLmxhc3RJbmRleCYmYWN0dWFsLmlnbm9yZUNhc2U9PT1leHBlY3RlZC5pZ25vcmVDYXNlfWVsc2UgaWYoKGFjdHVhbD09PW51bGx8fHR5cGVvZiBhY3R1YWwhPT0ib2JqZWN0IikmJihleHBlY3RlZD09PW51bGx8fHR5cGVvZiBleHBlY3RlZCE9PSJvYmplY3QiKSl7cmV0dXJuIHN0cmljdD9hY3R1YWw9PT1leHBlY3RlZDphY3R1YWw9PWV4cGVjdGVkfWVsc2UgaWYoaXNWaWV3KGFjdHVhbCkmJmlzVmlldyhleHBlY3RlZCkmJnBUb1N0cmluZyhhY3R1YWwpPT09cFRvU3RyaW5nKGV4cGVjdGVkKSYmIShhY3R1YWwgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXl8fGFjdHVhbCBpbnN0YW5jZW9mIEZsb2F0NjRBcnJheSkpe3JldHVybiBjb21wYXJlKG5ldyBVaW50OEFycmF5KGFjdHVhbC5idWZmZXIpLG5ldyBVaW50OEFycmF5KGV4cGVjdGVkLmJ1ZmZlcikpPT09MH1lbHNlIGlmKGlzQnVmZmVyKGFjdHVhbCkhPT1pc0J1ZmZlcihleHBlY3RlZCkpe3JldHVybiBmYWxzZX1lbHNle21lbW9zPW1lbW9zfHx7YWN0dWFsOltdLGV4cGVjdGVkOltdfTt2YXIgYWN0dWFsSW5kZXg9bWVtb3MuYWN0dWFsLmluZGV4T2YoYWN0dWFsKTtpZihhY3R1YWxJbmRleCE9PS0xKXtpZihhY3R1YWxJbmRleD09PW1lbW9zLmV4cGVjdGVkLmluZGV4T2YoZXhwZWN0ZWQpKXtyZXR1cm4gdHJ1ZX19bWVtb3MuYWN0dWFsLnB1c2goYWN0dWFsKTttZW1vcy5leHBlY3RlZC5wdXNoKGV4cGVjdGVkKTtyZXR1cm4gb2JqRXF1aXYoYWN0dWFsLGV4cGVjdGVkLHN0cmljdCxtZW1vcyl9fWZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpPT0iW29iamVjdCBBcmd1bWVudHNdIn1mdW5jdGlvbiBvYmpFcXVpdihhLGIsc3RyaWN0LGFjdHVhbFZpc2l0ZWRPYmplY3RzKXtpZihhPT09bnVsbHx8YT09PXVuZGVmaW5lZHx8Yj09PW51bGx8fGI9PT11bmRlZmluZWQpcmV0dXJuIGZhbHNlO2lmKHV0aWwuaXNQcmltaXRpdmUoYSl8fHV0aWwuaXNQcmltaXRpdmUoYikpcmV0dXJuIGE9PT1iO2lmKHN0cmljdCYmT2JqZWN0LmdldFByb3RvdHlwZU9mKGEpIT09T2JqZWN0LmdldFByb3RvdHlwZU9mKGIpKXJldHVybiBmYWxzZTt2YXIgYUlzQXJncz1pc0FyZ3VtZW50cyhhKTt2YXIgYklzQXJncz1pc0FyZ3VtZW50cyhiKTtpZihhSXNBcmdzJiYhYklzQXJnc3x8IWFJc0FyZ3MmJmJJc0FyZ3MpcmV0dXJuIGZhbHNlO2lmKGFJc0FyZ3Mpe2E9cFNsaWNlLmNhbGwoYSk7Yj1wU2xpY2UuY2FsbChiKTtyZXR1cm4gX2RlZXBFcXVhbChhLGIsc3RyaWN0KX12YXIga2E9b2JqZWN0S2V5cyhhKTt2YXIga2I9b2JqZWN0S2V5cyhiKTt2YXIga2V5LGk7aWYoa2EubGVuZ3RoIT09a2IubGVuZ3RoKXJldHVybiBmYWxzZTtrYS5zb3J0KCk7a2Iuc29ydCgpO2ZvcihpPWthLmxlbmd0aC0xO2k+PTA7aS0tKXtpZihrYVtpXSE9PWtiW2ldKXJldHVybiBmYWxzZX1mb3IoaT1rYS5sZW5ndGgtMTtpPj0wO2ktLSl7a2V5PWthW2ldO2lmKCFfZGVlcEVxdWFsKGFba2V5XSxiW2tleV0sc3RyaWN0LGFjdHVhbFZpc2l0ZWRPYmplY3RzKSlyZXR1cm4gZmFsc2V9cmV0dXJuIHRydWV9YXNzZXJ0Lm5vdERlZXBFcXVhbD1mdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2Upe2lmKF9kZWVwRXF1YWwoYWN0dWFsLGV4cGVjdGVkLGZhbHNlKSl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwibm90RGVlcEVxdWFsIixhc3NlcnQubm90RGVlcEVxdWFsKX19O2Fzc2VydC5ub3REZWVwU3RyaWN0RXF1YWw9bm90RGVlcFN0cmljdEVxdWFsO2Z1bmN0aW9uIG5vdERlZXBTdHJpY3RFcXVhbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSl7aWYoX2RlZXBFcXVhbChhY3R1YWwsZXhwZWN0ZWQsdHJ1ZSkpe2ZhaWwoYWN0dWFsLGV4cGVjdGVkLG1lc3NhZ2UsIm5vdERlZXBTdHJpY3RFcXVhbCIsbm90RGVlcFN0cmljdEVxdWFsKX19YXNzZXJ0LnN0cmljdEVxdWFsPWZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWwhPT1leHBlY3RlZCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiPT09Iixhc3NlcnQuc3RyaWN0RXF1YWwpfX07YXNzZXJ0Lm5vdFN0cmljdEVxdWFsPWZ1bmN0aW9uIG5vdFN0cmljdEVxdWFsKGFjdHVhbCxleHBlY3RlZCxtZXNzYWdlKXtpZihhY3R1YWw9PT1leHBlY3RlZCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsbWVzc2FnZSwiIT09Iixhc3NlcnQubm90U3RyaWN0RXF1YWwpfX07ZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLGV4cGVjdGVkKXtpZighYWN0dWFsfHwhZXhwZWN0ZWQpe3JldHVybiBmYWxzZX1pZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXhwZWN0ZWQpPT0iW29iamVjdCBSZWdFeHBdIil7cmV0dXJuIGV4cGVjdGVkLnRlc3QoYWN0dWFsKX10cnl7aWYoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpe3JldHVybiB0cnVlfX1jYXRjaChlKXt9aWYoRXJyb3IuaXNQcm90b3R5cGVPZihleHBlY3RlZCkpe3JldHVybiBmYWxzZX1yZXR1cm4gZXhwZWN0ZWQuY2FsbCh7fSxhY3R1YWwpPT09dHJ1ZX1mdW5jdGlvbiBfdHJ5QmxvY2soYmxvY2spe3ZhciBlcnJvcjt0cnl7YmxvY2soKX1jYXRjaChlKXtlcnJvcj1lfXJldHVybiBlcnJvcn1mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LGJsb2NrLGV4cGVjdGVkLG1lc3NhZ2Upe3ZhciBhY3R1YWw7aWYodHlwZW9mIGJsb2NrIT09ImZ1bmN0aW9uIil7dGhyb3cgbmV3IFR5cGVFcnJvcignImJsb2NrIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKX1pZih0eXBlb2YgZXhwZWN0ZWQ9PT0ic3RyaW5nIil7bWVzc2FnZT1leHBlY3RlZDtleHBlY3RlZD1udWxsfWFjdHVhbD1fdHJ5QmxvY2soYmxvY2spO21lc3NhZ2U9KGV4cGVjdGVkJiZleHBlY3RlZC5uYW1lPyIgKCIrZXhwZWN0ZWQubmFtZSsiKS4iOiIuIikrKG1lc3NhZ2U/IiAiK21lc3NhZ2U6Ii4iKTtpZihzaG91bGRUaHJvdyYmIWFjdHVhbCl7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsIk1pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uIittZXNzYWdlKX12YXIgdXNlclByb3ZpZGVkTWVzc2FnZT10eXBlb2YgbWVzc2FnZT09PSJzdHJpbmciO3ZhciBpc1Vud2FudGVkRXhjZXB0aW9uPSFzaG91bGRUaHJvdyYmdXRpbC5pc0Vycm9yKGFjdHVhbCk7dmFyIGlzVW5leHBlY3RlZEV4Y2VwdGlvbj0hc2hvdWxkVGhyb3cmJmFjdHVhbCYmIWV4cGVjdGVkO2lmKGlzVW53YW50ZWRFeGNlcHRpb24mJnVzZXJQcm92aWRlZE1lc3NhZ2UmJmV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCxleHBlY3RlZCl8fGlzVW5leHBlY3RlZEV4Y2VwdGlvbil7ZmFpbChhY3R1YWwsZXhwZWN0ZWQsIkdvdCB1bndhbnRlZCBleGNlcHRpb24iK21lc3NhZ2UpfWlmKHNob3VsZFRocm93JiZhY3R1YWwmJmV4cGVjdGVkJiYhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLGV4cGVjdGVkKXx8IXNob3VsZFRocm93JiZhY3R1YWwpe3Rocm93IGFjdHVhbH19YXNzZXJ0LnRocm93cz1mdW5jdGlvbihibG9jayxlcnJvcixtZXNzYWdlKXtfdGhyb3dzKHRydWUsYmxvY2ssZXJyb3IsbWVzc2FnZSl9O2Fzc2VydC5kb2VzTm90VGhyb3c9ZnVuY3Rpb24oYmxvY2ssZXJyb3IsbWVzc2FnZSl7X3Rocm93cyhmYWxzZSxibG9jayxlcnJvcixtZXNzYWdlKX07YXNzZXJ0LmlmRXJyb3I9ZnVuY3Rpb24oZXJyKXtpZihlcnIpdGhyb3cgZXJyfTtmdW5jdGlvbiBzdHJpY3QodmFsdWUsbWVzc2FnZSl7aWYoIXZhbHVlKWZhaWwodmFsdWUsdHJ1ZSxtZXNzYWdlLCI9PSIsc3RyaWN0KX1hc3NlcnQuc3RyaWN0PW9iamVjdEFzc2lnbihzdHJpY3QsYXNzZXJ0LHtlcXVhbDphc3NlcnQuc3RyaWN0RXF1YWwsZGVlcEVxdWFsOmFzc2VydC5kZWVwU3RyaWN0RXF1YWwsbm90RXF1YWw6YXNzZXJ0Lm5vdFN0cmljdEVxdWFsLG5vdERlZXBFcXVhbDphc3NlcnQubm90RGVlcFN0cmljdEVxdWFsfSk7YXNzZXJ0LnN0cmljdC5zdHJpY3Q9YXNzZXJ0LnN0cmljdDt2YXIgb2JqZWN0S2V5cz1PYmplY3Qua2V5c3x8ZnVuY3Rpb24ob2JqKXt2YXIga2V5cz1bXTtmb3IodmFyIGtleSBpbiBvYmope2lmKGhhc093bi5jYWxsKG9iaixrZXkpKWtleXMucHVzaChrZXkpfXJldHVybiBrZXlzfX0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsIT09InVuZGVmaW5lZCI/Z2xvYmFsOnR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCI/c2VsZjp0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCI/d2luZG93Ont9KX0seyJvYmplY3QtYXNzaWduIjo1OSwidXRpbC8iOjIzfV0sMjE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2lmKHR5cGVvZiBPYmplY3QuY3JlYXRlPT09ImZ1bmN0aW9uIil7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24gaW5oZXJpdHMoY3RvcixzdXBlckN0b3Ipe2N0b3Iuc3VwZXJfPXN1cGVyQ3RvcjtjdG9yLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUse2NvbnN0cnVjdG9yOnt2YWx1ZTpjdG9yLGVudW1lcmFibGU6ZmFsc2Usd3JpdGFibGU6dHJ1ZSxjb25maWd1cmFibGU6dHJ1ZX19KX19ZWxzZXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpbmhlcml0cyhjdG9yLHN1cGVyQ3Rvcil7Y3Rvci5zdXBlcl89c3VwZXJDdG9yO3ZhciBUZW1wQ3Rvcj1mdW5jdGlvbigpe307VGVtcEN0b3IucHJvdG90eXBlPXN1cGVyQ3Rvci5wcm90b3R5cGU7Y3Rvci5wcm90b3R5cGU9bmV3IFRlbXBDdG9yO2N0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yPWN0b3J9fX0se31dLDIyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpc0J1ZmZlcihhcmcpe3JldHVybiBhcmcmJnR5cGVvZiBhcmc9PT0ib2JqZWN0IiYmdHlwZW9mIGFyZy5jb3B5PT09ImZ1bmN0aW9uIiYmdHlwZW9mIGFyZy5maWxsPT09ImZ1bmN0aW9uIiYmdHlwZW9mIGFyZy5yZWFkVUludDg9PT0iZnVuY3Rpb24ifX0se31dLDIzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2VzcyxnbG9iYWwpe3ZhciBmb3JtYXRSZWdFeHA9LyVbc2RqJV0vZztleHBvcnRzLmZvcm1hdD1mdW5jdGlvbihmKXtpZighaXNTdHJpbmcoZikpe3ZhciBvYmplY3RzPVtdO2Zvcih2YXIgaT0wO2k8YXJndW1lbnRzLmxlbmd0aDtpKyspe29iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpfXJldHVybiBvYmplY3RzLmpvaW4oIiAiKX12YXIgaT0xO3ZhciBhcmdzPWFyZ3VtZW50czt2YXIgbGVuPWFyZ3MubGVuZ3RoO3ZhciBzdHI9U3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLGZ1bmN0aW9uKHgpe2lmKHg9PT0iJSUiKXJldHVybiIlIjtpZihpPj1sZW4pcmV0dXJuIHg7c3dpdGNoKHgpe2Nhc2UiJXMiOnJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtjYXNlIiVkIjpyZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7Y2FzZSIlaiI6dHJ5e3JldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pfWNhdGNoKF8pe3JldHVybiJbQ2lyY3VsYXJdIn1kZWZhdWx0OnJldHVybiB4fX0pO2Zvcih2YXIgeD1hcmdzW2ldO2k8bGVuO3g9YXJnc1srK2ldKXtpZihpc051bGwoeCl8fCFpc09iamVjdCh4KSl7c3RyKz0iICIreH1lbHNle3N0cis9IiAiK2luc3BlY3QoeCl9fXJldHVybiBzdHJ9O2V4cG9ydHMuZGVwcmVjYXRlPWZ1bmN0aW9uKGZuLG1zZyl7aWYoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sbXNnKS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWlmKHByb2Nlc3Mubm9EZXByZWNhdGlvbj09PXRydWUpe3JldHVybiBmbn12YXIgd2FybmVkPWZhbHNlO2Z1bmN0aW9uIGRlcHJlY2F0ZWQoKXtpZighd2FybmVkKXtpZihwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pe3Rocm93IG5ldyBFcnJvcihtc2cpfWVsc2UgaWYocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKXtjb25zb2xlLnRyYWNlKG1zZyl9ZWxzZXtjb25zb2xlLmVycm9yKG1zZyl9d2FybmVkPXRydWV9cmV0dXJuIGZuLmFwcGx5KHRoaXMsYXJndW1lbnRzKX1yZXR1cm4gZGVwcmVjYXRlZH07dmFyIGRlYnVncz17fTt2YXIgZGVidWdFbnZpcm9uO2V4cG9ydHMuZGVidWdsb2c9ZnVuY3Rpb24oc2V0KXtpZihpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKWRlYnVnRW52aXJvbj1wcm9jZXNzLmVudi5OT0RFX0RFQlVHfHwiIjtzZXQ9c2V0LnRvVXBwZXJDYXNlKCk7aWYoIWRlYnVnc1tzZXRdKXtpZihuZXcgUmVnRXhwKCJcXGIiK3NldCsiXFxiIiwiaSIpLnRlc3QoZGVidWdFbnZpcm9uKSl7dmFyIHBpZD1wcm9jZXNzLnBpZDtkZWJ1Z3Nbc2V0XT1mdW5jdGlvbigpe3ZhciBtc2c9ZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpO2NvbnNvbGUuZXJyb3IoIiVzICVkOiAlcyIsc2V0LHBpZCxtc2cpfX1lbHNle2RlYnVnc1tzZXRdPWZ1bmN0aW9uKCl7fX19cmV0dXJuIGRlYnVnc1tzZXRdfTtmdW5jdGlvbiBpbnNwZWN0KG9iaixvcHRzKXt2YXIgY3R4PXtzZWVuOltdLHN0eWxpemU6c3R5bGl6ZU5vQ29sb3J9O2lmKGFyZ3VtZW50cy5sZW5ndGg+PTMpY3R4LmRlcHRoPWFyZ3VtZW50c1syXTtpZihhcmd1bWVudHMubGVuZ3RoPj00KWN0eC5jb2xvcnM9YXJndW1lbnRzWzNdO2lmKGlzQm9vbGVhbihvcHRzKSl7Y3R4LnNob3dIaWRkZW49b3B0c31lbHNlIGlmKG9wdHMpe2V4cG9ydHMuX2V4dGVuZChjdHgsb3B0cyl9aWYoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKWN0eC5zaG93SGlkZGVuPWZhbHNlO2lmKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpY3R4LmRlcHRoPTI7aWYoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpY3R4LmNvbG9ycz1mYWxzZTtpZihpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpY3R4LmN1c3RvbUluc3BlY3Q9dHJ1ZTtpZihjdHguY29sb3JzKWN0eC5zdHlsaXplPXN0eWxpemVXaXRoQ29sb3I7cmV0dXJuIGZvcm1hdFZhbHVlKGN0eCxvYmosY3R4LmRlcHRoKX1leHBvcnRzLmluc3BlY3Q9aW5zcGVjdDtpbnNwZWN0LmNvbG9ycz17Ym9sZDpbMSwyMl0saXRhbGljOlszLDIzXSx1bmRlcmxpbmU6WzQsMjRdLGludmVyc2U6WzcsMjddLHdoaXRlOlszNywzOV0sZ3JleTpbOTAsMzldLGJsYWNrOlszMCwzOV0sYmx1ZTpbMzQsMzldLGN5YW46WzM2LDM5XSxncmVlbjpbMzIsMzldLG1hZ2VudGE6WzM1LDM5XSxyZWQ6WzMxLDM5XSx5ZWxsb3c6WzMzLDM5XX07aW5zcGVjdC5zdHlsZXM9e3NwZWNpYWw6ImN5YW4iLG51bWJlcjoieWVsbG93Iixib29sZWFuOiJ5ZWxsb3ciLHVuZGVmaW5lZDoiZ3JleSIsbnVsbDoiYm9sZCIsc3RyaW5nOiJncmVlbiIsZGF0ZToibWFnZW50YSIscmVnZXhwOiJyZWQifTtmdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0cixzdHlsZVR5cGUpe3ZhciBzdHlsZT1pbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO2lmKHN0eWxlKXtyZXR1cm4iG1siK2luc3BlY3QuY29sb3JzW3N0eWxlXVswXSsibSIrc3RyKyIbWyIraW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdKyJtIn1lbHNle3JldHVybiBzdHJ9fWZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0cixzdHlsZVR5cGUpe3JldHVybiBzdHJ9ZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpe3ZhciBoYXNoPXt9O2FycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLGlkeCl7aGFzaFt2YWxdPXRydWV9KTtyZXR1cm4gaGFzaH1mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsdmFsdWUscmVjdXJzZVRpbWVzKXtpZihjdHguY3VzdG9tSW5zcGVjdCYmdmFsdWUmJmlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkmJnZhbHVlLmluc3BlY3QhPT1leHBvcnRzLmluc3BlY3QmJiEodmFsdWUuY29uc3RydWN0b3ImJnZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZT09PXZhbHVlKSl7dmFyIHJldD12YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcyxjdHgpO2lmKCFpc1N0cmluZyhyZXQpKXtyZXQ9Zm9ybWF0VmFsdWUoY3R4LHJldCxyZWN1cnNlVGltZXMpfXJldHVybiByZXR9dmFyIHByaW1pdGl2ZT1mb3JtYXRQcmltaXRpdmUoY3R4LHZhbHVlKTtpZihwcmltaXRpdmUpe3JldHVybiBwcmltaXRpdmV9dmFyIGtleXM9T2JqZWN0LmtleXModmFsdWUpO3ZhciB2aXNpYmxlS2V5cz1hcnJheVRvSGFzaChrZXlzKTtpZihjdHguc2hvd0hpZGRlbil7a2V5cz1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSl9aWYoaXNFcnJvcih2YWx1ZSkmJihrZXlzLmluZGV4T2YoIm1lc3NhZ2UiKT49MHx8a2V5cy5pbmRleE9mKCJkZXNjcmlwdGlvbiIpPj0wKSl7cmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKX1pZihrZXlzLmxlbmd0aD09PTApe2lmKGlzRnVuY3Rpb24odmFsdWUpKXt2YXIgbmFtZT12YWx1ZS5uYW1lPyI6ICIrdmFsdWUubmFtZToiIjtyZXR1cm4gY3R4LnN0eWxpemUoIltGdW5jdGlvbiIrbmFtZSsiXSIsInNwZWNpYWwiKX1pZihpc1JlZ0V4cCh2YWx1ZSkpe3JldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCJyZWdleHAiKX1pZihpc0RhdGUodmFsdWUpKXtyZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksImRhdGUiKX1pZihpc0Vycm9yKHZhbHVlKSl7cmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKX19dmFyIGJhc2U9IiIsYXJyYXk9ZmFsc2UsYnJhY2VzPVsieyIsIn0iXTtpZihpc0FycmF5KHZhbHVlKSl7YXJyYXk9dHJ1ZTticmFjZXM9WyJbIiwiXSJdfWlmKGlzRnVuY3Rpb24odmFsdWUpKXt2YXIgbj12YWx1ZS5uYW1lPyI6ICIrdmFsdWUubmFtZToiIjtiYXNlPSIgW0Z1bmN0aW9uIituKyJdIn1pZihpc1JlZ0V4cCh2YWx1ZSkpe2Jhc2U9IiAiK1JlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSl9aWYoaXNEYXRlKHZhbHVlKSl7YmFzZT0iICIrRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSl9aWYoaXNFcnJvcih2YWx1ZSkpe2Jhc2U9IiAiK2Zvcm1hdEVycm9yKHZhbHVlKX1pZihrZXlzLmxlbmd0aD09PTAmJighYXJyYXl8fHZhbHVlLmxlbmd0aD09MCkpe3JldHVybiBicmFjZXNbMF0rYmFzZSticmFjZXNbMV19aWYocmVjdXJzZVRpbWVzPDApe2lmKGlzUmVnRXhwKHZhbHVlKSl7cmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksInJlZ2V4cCIpfWVsc2V7cmV0dXJuIGN0eC5zdHlsaXplKCJbT2JqZWN0XSIsInNwZWNpYWwiKX19Y3R4LnNlZW4ucHVzaCh2YWx1ZSk7dmFyIG91dHB1dDtpZihhcnJheSl7b3V0cHV0PWZvcm1hdEFycmF5KGN0eCx2YWx1ZSxyZWN1cnNlVGltZXMsdmlzaWJsZUtleXMsa2V5cyl9ZWxzZXtvdXRwdXQ9a2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtyZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LHZhbHVlLHJlY3Vyc2VUaW1lcyx2aXNpYmxlS2V5cyxrZXksYXJyYXkpfSl9Y3R4LnNlZW4ucG9wKCk7cmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCxiYXNlLGJyYWNlcyl9ZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCx2YWx1ZSl7aWYoaXNVbmRlZmluZWQodmFsdWUpKXJldHVybiBjdHguc3R5bGl6ZSgidW5kZWZpbmVkIiwidW5kZWZpbmVkIik7aWYoaXNTdHJpbmcodmFsdWUpKXt2YXIgc2ltcGxlPSInIitKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXiJ8IiQvZywiIikucmVwbGFjZSgvJy9nLCJcXCciKS5yZXBsYWNlKC9cXCIvZywnIicpKyInIjtyZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCJzdHJpbmciKX1pZihpc051bWJlcih2YWx1ZSkpcmV0dXJuIGN0eC5zdHlsaXplKCIiK3ZhbHVlLCJudW1iZXIiKTtpZihpc0Jvb2xlYW4odmFsdWUpKXJldHVybiBjdHguc3R5bGl6ZSgiIit2YWx1ZSwiYm9vbGVhbiIpO2lmKGlzTnVsbCh2YWx1ZSkpcmV0dXJuIGN0eC5zdHlsaXplKCJudWxsIiwibnVsbCIpfWZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKXtyZXR1cm4iWyIrRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpKyJdIn1mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleXMpe3ZhciBvdXRwdXQ9W107Zm9yKHZhciBpPTAsbD12YWx1ZS5sZW5ndGg7aTxsOysraSl7aWYoaGFzT3duUHJvcGVydHkodmFsdWUsU3RyaW5nKGkpKSl7b3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LHZhbHVlLHJlY3Vyc2VUaW1lcyx2aXNpYmxlS2V5cyxTdHJpbmcoaSksdHJ1ZSkpfWVsc2V7b3V0cHV0LnB1c2goIiIpfX1rZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtpZigha2V5Lm1hdGNoKC9eXGQrJC8pKXtvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleSx0cnVlKSl9fSk7cmV0dXJuIG91dHB1dH1mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsdmFsdWUscmVjdXJzZVRpbWVzLHZpc2libGVLZXlzLGtleSxhcnJheSl7dmFyIG5hbWUsc3RyLGRlc2M7ZGVzYz1PYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLGtleSl8fHt2YWx1ZTp2YWx1ZVtrZXldfTtpZihkZXNjLmdldCl7aWYoZGVzYy5zZXQpe3N0cj1jdHguc3R5bGl6ZSgiW0dldHRlci9TZXR0ZXJdIiwic3BlY2lhbCIpfWVsc2V7c3RyPWN0eC5zdHlsaXplKCJbR2V0dGVyXSIsInNwZWNpYWwiKX19ZWxzZXtpZihkZXNjLnNldCl7c3RyPWN0eC5zdHlsaXplKCJbU2V0dGVyXSIsInNwZWNpYWwiKX19aWYoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLGtleSkpe25hbWU9IlsiK2tleSsiXSJ9aWYoIXN0cil7aWYoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKTwwKXtpZihpc051bGwocmVjdXJzZVRpbWVzKSl7c3RyPWZvcm1hdFZhbHVlKGN0eCxkZXNjLnZhbHVlLG51bGwpfWVsc2V7c3RyPWZvcm1hdFZhbHVlKGN0eCxkZXNjLnZhbHVlLHJlY3Vyc2VUaW1lcy0xKX1pZihzdHIuaW5kZXhPZigiXG4iKT4tMSl7aWYoYXJyYXkpe3N0cj1zdHIuc3BsaXQoIlxuIikubWFwKGZ1bmN0aW9uKGxpbmUpe3JldHVybiIgICIrbGluZX0pLmpvaW4oIlxuIikuc3Vic3RyKDIpfWVsc2V7c3RyPSJcbiIrc3RyLnNwbGl0KCJcbiIpLm1hcChmdW5jdGlvbihsaW5lKXtyZXR1cm4iICAgIitsaW5lfSkuam9pbigiXG4iKX19fWVsc2V7c3RyPWN0eC5zdHlsaXplKCJbQ2lyY3VsYXJdIiwic3BlY2lhbCIpfX1pZihpc1VuZGVmaW5lZChuYW1lKSl7aWYoYXJyYXkmJmtleS5tYXRjaCgvXlxkKyQvKSl7cmV0dXJuIHN0cn1uYW1lPUpTT04uc3RyaW5naWZ5KCIiK2tleSk7aWYobmFtZS5tYXRjaCgvXiIoW2EtekEtWl9dW2EtekEtWl8wLTldKikiJC8pKXtuYW1lPW5hbWUuc3Vic3RyKDEsbmFtZS5sZW5ndGgtMik7bmFtZT1jdHguc3R5bGl6ZShuYW1lLCJuYW1lIil9ZWxzZXtuYW1lPW5hbWUucmVwbGFjZSgvJy9nLCJcXCciKS5yZXBsYWNlKC9cXCIvZywnIicpLnJlcGxhY2UoLyheInwiJCkvZywiJyIpO25hbWU9Y3R4LnN0eWxpemUobmFtZSwic3RyaW5nIil9fXJldHVybiBuYW1lKyI6ICIrc3RyfWZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCxiYXNlLGJyYWNlcyl7dmFyIG51bUxpbmVzRXN0PTA7dmFyIGxlbmd0aD1vdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsY3VyKXtudW1MaW5lc0VzdCsrO2lmKGN1ci5pbmRleE9mKCJcbiIpPj0wKW51bUxpbmVzRXN0Kys7cmV0dXJuIHByZXYrY3VyLnJlcGxhY2UoL1x1MDAxYlxbXGRcZD9tL2csIiIpLmxlbmd0aCsxfSwwKTtpZihsZW5ndGg+NjApe3JldHVybiBicmFjZXNbMF0rKGJhc2U9PT0iIj8iIjpiYXNlKyJcbiAiKSsiICIrb3V0cHV0LmpvaW4oIixcbiAgIikrIiAiK2JyYWNlc1sxXX1yZXR1cm4gYnJhY2VzWzBdK2Jhc2UrIiAiK291dHB1dC5qb2luKCIsICIpKyIgIiticmFjZXNbMV19ZnVuY3Rpb24gaXNBcnJheShhcil7cmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpfWV4cG9ydHMuaXNBcnJheT1pc0FycmF5O2Z1bmN0aW9uIGlzQm9vbGVhbihhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09ImJvb2xlYW4ifWV4cG9ydHMuaXNCb29sZWFuPWlzQm9vbGVhbjtmdW5jdGlvbiBpc051bGwoYXJnKXtyZXR1cm4gYXJnPT09bnVsbH1leHBvcnRzLmlzTnVsbD1pc051bGw7ZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKXtyZXR1cm4gYXJnPT1udWxsfWV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQ9aXNOdWxsT3JVbmRlZmluZWQ7ZnVuY3Rpb24gaXNOdW1iZXIoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJudW1iZXIifWV4cG9ydHMuaXNOdW1iZXI9aXNOdW1iZXI7ZnVuY3Rpb24gaXNTdHJpbmcoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJzdHJpbmcifWV4cG9ydHMuaXNTdHJpbmc9aXNTdHJpbmc7ZnVuY3Rpb24gaXNTeW1ib2woYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJzeW1ib2wifWV4cG9ydHMuaXNTeW1ib2w9aXNTeW1ib2w7ZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKXtyZXR1cm4gYXJnPT09dm9pZCAwfWV4cG9ydHMuaXNVbmRlZmluZWQ9aXNVbmRlZmluZWQ7ZnVuY3Rpb24gaXNSZWdFeHAocmUpe3JldHVybiBpc09iamVjdChyZSkmJm9iamVjdFRvU3RyaW5nKHJlKT09PSJbb2JqZWN0IFJlZ0V4cF0ifWV4cG9ydHMuaXNSZWdFeHA9aXNSZWdFeHA7ZnVuY3Rpb24gaXNPYmplY3QoYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJvYmplY3QiJiZhcmchPT1udWxsfWV4cG9ydHMuaXNPYmplY3Q9aXNPYmplY3Q7ZnVuY3Rpb24gaXNEYXRlKGQpe3JldHVybiBpc09iamVjdChkKSYmb2JqZWN0VG9TdHJpbmcoZCk9PT0iW29iamVjdCBEYXRlXSJ9ZXhwb3J0cy5pc0RhdGU9aXNEYXRlO2Z1bmN0aW9uIGlzRXJyb3IoZSl7cmV0dXJuIGlzT2JqZWN0KGUpJiYob2JqZWN0VG9TdHJpbmcoZSk9PT0iW29iamVjdCBFcnJvcl0ifHxlIGluc3RhbmNlb2YgRXJyb3IpfWV4cG9ydHMuaXNFcnJvcj1pc0Vycm9yO2Z1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJmdW5jdGlvbiJ9ZXhwb3J0cy5pc0Z1bmN0aW9uPWlzRnVuY3Rpb247ZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKXtyZXR1cm4gYXJnPT09bnVsbHx8dHlwZW9mIGFyZz09PSJib29sZWFuInx8dHlwZW9mIGFyZz09PSJudW1iZXIifHx0eXBlb2YgYXJnPT09InN0cmluZyJ8fHR5cGVvZiBhcmc9PT0ic3ltYm9sInx8dHlwZW9mIGFyZz09PSJ1bmRlZmluZWQifWV4cG9ydHMuaXNQcmltaXRpdmU9aXNQcmltaXRpdmU7ZXhwb3J0cy5pc0J1ZmZlcj1yZXF1aXJlKCIuL3N1cHBvcnQvaXNCdWZmZXIiKTtmdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pfWZ1bmN0aW9uIHBhZChuKXtyZXR1cm4gbjwxMD8iMCIrbi50b1N0cmluZygxMCk6bi50b1N0cmluZygxMCl9dmFyIG1vbnRocz1bIkphbiIsIkZlYiIsIk1hciIsIkFwciIsIk1heSIsIkp1biIsIkp1bCIsIkF1ZyIsIlNlcCIsIk9jdCIsIk5vdiIsIkRlYyJdO2Z1bmN0aW9uIHRpbWVzdGFtcCgpe3ZhciBkPW5ldyBEYXRlO3ZhciB0aW1lPVtwYWQoZC5nZXRIb3VycygpKSxwYWQoZC5nZXRNaW51dGVzKCkpLHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oIjoiKTtyZXR1cm5bZC5nZXREYXRlKCksbW9udGhzW2QuZ2V0TW9udGgoKV0sdGltZV0uam9pbigiICIpfWV4cG9ydHMubG9nPWZ1bmN0aW9uKCl7Y29uc29sZS5sb2coIiVzIC0gJXMiLHRpbWVzdGFtcCgpLGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsYXJndW1lbnRzKSl9O2V4cG9ydHMuaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTtleHBvcnRzLl9leHRlbmQ9ZnVuY3Rpb24ob3JpZ2luLGFkZCl7aWYoIWFkZHx8IWlzT2JqZWN0KGFkZCkpcmV0dXJuIG9yaWdpbjt2YXIga2V5cz1PYmplY3Qua2V5cyhhZGQpO3ZhciBpPWtleXMubGVuZ3RoO3doaWxlKGktLSl7b3JpZ2luW2tleXNbaV1dPWFkZFtrZXlzW2ldXX1yZXR1cm4gb3JpZ2lufTtmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmoscHJvcCl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmoscHJvcCl9fSkuY2FsbCh0aGlzLHJlcXVpcmUoIl9wcm9jZXNzIiksdHlwZW9mIGdsb2JhbCE9PSJ1bmRlZmluZWQiP2dsb2JhbDp0eXBlb2Ygc2VsZiE9PSJ1bmRlZmluZWQiP3NlbGY6dHlwZW9mIHdpbmRvdyE9PSJ1bmRlZmluZWQiP3dpbmRvdzp7fSl9LHsiLi9zdXBwb3J0L2lzQnVmZmVyIjoyMixfcHJvY2Vzczo2Nixpbmhlcml0czoyMX1dLDI0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7ZXhwb3J0cy5ieXRlTGVuZ3RoPWJ5dGVMZW5ndGg7ZXhwb3J0cy50b0J5dGVBcnJheT10b0J5dGVBcnJheTtleHBvcnRzLmZyb21CeXRlQXJyYXk9ZnJvbUJ5dGVBcnJheTt2YXIgbG9va3VwPVtdO3ZhciByZXZMb29rdXA9W107dmFyIEFycj10eXBlb2YgVWludDhBcnJheSE9PSJ1bmRlZmluZWQiP1VpbnQ4QXJyYXk6QXJyYXk7dmFyIGNvZGU9IkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8iO2Zvcih2YXIgaT0wLGxlbj1jb2RlLmxlbmd0aDtpPGxlbjsrK2kpe2xvb2t1cFtpXT1jb2RlW2ldO3Jldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldPWl9cmV2TG9va3VwWyItIi5jaGFyQ29kZUF0KDApXT02MjtyZXZMb29rdXBbIl8iLmNoYXJDb2RlQXQoMCldPTYzO2Z1bmN0aW9uIGdldExlbnMoYjY0KXt2YXIgbGVuPWI2NC5sZW5ndGg7aWYobGVuJTQ+MCl7dGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Iil9dmFyIHZhbGlkTGVuPWI2NC5pbmRleE9mKCI9Iik7aWYodmFsaWRMZW49PT0tMSl2YWxpZExlbj1sZW47dmFyIHBsYWNlSG9sZGVyc0xlbj12YWxpZExlbj09PWxlbj8wOjQtdmFsaWRMZW4lNDtyZXR1cm5bdmFsaWRMZW4scGxhY2VIb2xkZXJzTGVuXX1mdW5jdGlvbiBieXRlTGVuZ3RoKGI2NCl7dmFyIGxlbnM9Z2V0TGVucyhiNjQpO3ZhciB2YWxpZExlbj1sZW5zWzBdO3ZhciBwbGFjZUhvbGRlcnNMZW49bGVuc1sxXTtyZXR1cm4odmFsaWRMZW4rcGxhY2VIb2xkZXJzTGVuKSozLzQtcGxhY2VIb2xkZXJzTGVufWZ1bmN0aW9uIF9ieXRlTGVuZ3RoKGI2NCx2YWxpZExlbixwbGFjZUhvbGRlcnNMZW4pe3JldHVybih2YWxpZExlbitwbGFjZUhvbGRlcnNMZW4pKjMvNC1wbGFjZUhvbGRlcnNMZW59ZnVuY3Rpb24gdG9CeXRlQXJyYXkoYjY0KXt2YXIgdG1wO3ZhciBsZW5zPWdldExlbnMoYjY0KTt2YXIgdmFsaWRMZW49bGVuc1swXTt2YXIgcGxhY2VIb2xkZXJzTGVuPWxlbnNbMV07dmFyIGFycj1uZXcgQXJyKF9ieXRlTGVuZ3RoKGI2NCx2YWxpZExlbixwbGFjZUhvbGRlcnNMZW4pKTt2YXIgY3VyQnl0ZT0wO3ZhciBsZW49cGxhY2VIb2xkZXJzTGVuPjA/dmFsaWRMZW4tNDp2YWxpZExlbjt2YXIgaTtmb3IoaT0wO2k8bGVuO2krPTQpe3RtcD1yZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldPDwxOHxyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSsxKV08PDEyfHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKzIpXTw8NnxyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSszKV07YXJyW2N1ckJ5dGUrK109dG1wPj4xNiYyNTU7YXJyW2N1ckJ5dGUrK109dG1wPj44JjI1NTthcnJbY3VyQnl0ZSsrXT10bXAmMjU1fWlmKHBsYWNlSG9sZGVyc0xlbj09PTIpe3RtcD1yZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldPDwyfHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKzEpXT4+NDthcnJbY3VyQnl0ZSsrXT10bXAmMjU1fWlmKHBsYWNlSG9sZGVyc0xlbj09PTEpe3RtcD1yZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldPDwxMHxyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSsxKV08PDR8cmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkrMildPj4yO2FycltjdXJCeXRlKytdPXRtcD4+OCYyNTU7YXJyW2N1ckJ5dGUrK109dG1wJjI1NX1yZXR1cm4gYXJyfWZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NChudW0pe3JldHVybiBsb29rdXBbbnVtPj4xOCY2M10rbG9va3VwW251bT4+MTImNjNdK2xvb2t1cFtudW0+PjYmNjNdK2xvb2t1cFtudW0mNjNdfWZ1bmN0aW9uIGVuY29kZUNodW5rKHVpbnQ4LHN0YXJ0LGVuZCl7dmFyIHRtcDt2YXIgb3V0cHV0PVtdO2Zvcih2YXIgaT1zdGFydDtpPGVuZDtpKz0zKXt0bXA9KHVpbnQ4W2ldPDwxNiYxNjcxMTY4MCkrKHVpbnQ4W2krMV08PDgmNjUyODApKyh1aW50OFtpKzJdJjI1NSk7b3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpfXJldHVybiBvdXRwdXQuam9pbigiIil9ZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSh1aW50OCl7dmFyIHRtcDt2YXIgbGVuPXVpbnQ4Lmxlbmd0aDt2YXIgZXh0cmFCeXRlcz1sZW4lMzt2YXIgcGFydHM9W107dmFyIG1heENodW5rTGVuZ3RoPTE2MzgzO2Zvcih2YXIgaT0wLGxlbjI9bGVuLWV4dHJhQnl0ZXM7aTxsZW4yO2krPW1heENodW5rTGVuZ3RoKXtwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LGksaSttYXhDaHVua0xlbmd0aD5sZW4yP2xlbjI6aSttYXhDaHVua0xlbmd0aCkpfWlmKGV4dHJhQnl0ZXM9PT0xKXt0bXA9dWludDhbbGVuLTFdO3BhcnRzLnB1c2gobG9va3VwW3RtcD4+Ml0rbG9va3VwW3RtcDw8NCY2M10rIj09Iil9ZWxzZSBpZihleHRyYUJ5dGVzPT09Mil7dG1wPSh1aW50OFtsZW4tMl08PDgpK3VpbnQ4W2xlbi0xXTtwYXJ0cy5wdXNoKGxvb2t1cFt0bXA+PjEwXStsb29rdXBbdG1wPj40JjYzXStsb29rdXBbdG1wPDwyJjYzXSsiPSIpfXJldHVybiBwYXJ0cy5qb2luKCIiKX19LHt9XSwyNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGJpZ0ludD1mdW5jdGlvbih1bmRlZmluZWQpeyJ1c2Ugc3RyaWN0Ijt2YXIgQkFTRT0xZTcsTE9HX0JBU0U9NyxNQVhfSU5UPTkwMDcxOTkyNTQ3NDA5OTIsTUFYX0lOVF9BUlI9c21hbGxUb0FycmF5KE1BWF9JTlQpLERFRkFVTFRfQUxQSEFCRVQ9IjAxMjM0NTY3ODlhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiI7dmFyIHN1cHBvcnRzTmF0aXZlQmlnSW50PXR5cGVvZiBCaWdJbnQ9PT0iZnVuY3Rpb24iO2Z1bmN0aW9uIEludGVnZXIodixyYWRpeCxhbHBoYWJldCxjYXNlU2Vuc2l0aXZlKXtpZih0eXBlb2Ygdj09PSJ1bmRlZmluZWQiKXJldHVybiBJbnRlZ2VyWzBdO2lmKHR5cGVvZiByYWRpeCE9PSJ1bmRlZmluZWQiKXJldHVybityYWRpeD09PTEwJiYhYWxwaGFiZXQ/cGFyc2VWYWx1ZSh2KTpwYXJzZUJhc2UodixyYWRpeCxhbHBoYWJldCxjYXNlU2Vuc2l0aXZlKTtyZXR1cm4gcGFyc2VWYWx1ZSh2KX1mdW5jdGlvbiBCaWdJbnRlZ2VyKHZhbHVlLHNpZ24pe3RoaXMudmFsdWU9dmFsdWU7dGhpcy5zaWduPXNpZ247dGhpcy5pc1NtYWxsPWZhbHNlfUJpZ0ludGVnZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoSW50ZWdlci5wcm90b3R5cGUpO2Z1bmN0aW9uIFNtYWxsSW50ZWdlcih2YWx1ZSl7dGhpcy52YWx1ZT12YWx1ZTt0aGlzLnNpZ249dmFsdWU8MDt0aGlzLmlzU21hbGw9dHJ1ZX1TbWFsbEludGVnZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoSW50ZWdlci5wcm90b3R5cGUpO2Z1bmN0aW9uIE5hdGl2ZUJpZ0ludCh2YWx1ZSl7dGhpcy52YWx1ZT12YWx1ZX1OYXRpdmVCaWdJbnQucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoSW50ZWdlci5wcm90b3R5cGUpO2Z1bmN0aW9uIGlzUHJlY2lzZShuKXtyZXR1cm4tTUFYX0lOVDxuJiZuPE1BWF9JTlR9ZnVuY3Rpb24gc21hbGxUb0FycmF5KG4pe2lmKG48MWU3KXJldHVybltuXTtpZihuPDFlMTQpcmV0dXJuW24lMWU3LE1hdGguZmxvb3Iobi8xZTcpXTtyZXR1cm5bbiUxZTcsTWF0aC5mbG9vcihuLzFlNyklMWU3LE1hdGguZmxvb3Iobi8xZTE0KV19ZnVuY3Rpb24gYXJyYXlUb1NtYWxsKGFycil7dHJpbShhcnIpO3ZhciBsZW5ndGg9YXJyLmxlbmd0aDtpZihsZW5ndGg8NCYmY29tcGFyZUFicyhhcnIsTUFYX0lOVF9BUlIpPDApe3N3aXRjaChsZW5ndGgpe2Nhc2UgMDpyZXR1cm4gMDtjYXNlIDE6cmV0dXJuIGFyclswXTtjYXNlIDI6cmV0dXJuIGFyclswXSthcnJbMV0qQkFTRTtkZWZhdWx0OnJldHVybiBhcnJbMF0rKGFyclsxXSthcnJbMl0qQkFTRSkqQkFTRX19cmV0dXJuIGFycn1mdW5jdGlvbiB0cmltKHYpe3ZhciBpPXYubGVuZ3RoO3doaWxlKHZbLS1pXT09PTApO3YubGVuZ3RoPWkrMX1mdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgpe3ZhciB4PW5ldyBBcnJheShsZW5ndGgpO3ZhciBpPS0xO3doaWxlKCsraTxsZW5ndGgpe3hbaV09MH1yZXR1cm4geH1mdW5jdGlvbiB0cnVuY2F0ZShuKXtpZihuPjApcmV0dXJuIE1hdGguZmxvb3Iobik7cmV0dXJuIE1hdGguY2VpbChuKX1mdW5jdGlvbiBhZGQoYSxiKXt2YXIgbF9hPWEubGVuZ3RoLGxfYj1iLmxlbmd0aCxyPW5ldyBBcnJheShsX2EpLGNhcnJ5PTAsYmFzZT1CQVNFLHN1bSxpO2ZvcihpPTA7aTxsX2I7aSsrKXtzdW09YVtpXStiW2ldK2NhcnJ5O2NhcnJ5PXN1bT49YmFzZT8xOjA7cltpXT1zdW0tY2FycnkqYmFzZX13aGlsZShpPGxfYSl7c3VtPWFbaV0rY2Fycnk7Y2Fycnk9c3VtPT09YmFzZT8xOjA7cltpKytdPXN1bS1jYXJyeSpiYXNlfWlmKGNhcnJ5PjApci5wdXNoKGNhcnJ5KTtyZXR1cm4gcn1mdW5jdGlvbiBhZGRBbnkoYSxiKXtpZihhLmxlbmd0aD49Yi5sZW5ndGgpcmV0dXJuIGFkZChhLGIpO3JldHVybiBhZGQoYixhKX1mdW5jdGlvbiBhZGRTbWFsbChhLGNhcnJ5KXt2YXIgbD1hLmxlbmd0aCxyPW5ldyBBcnJheShsKSxiYXNlPUJBU0Usc3VtLGk7Zm9yKGk9MDtpPGw7aSsrKXtzdW09YVtpXS1iYXNlK2NhcnJ5O2NhcnJ5PU1hdGguZmxvb3Ioc3VtL2Jhc2UpO3JbaV09c3VtLWNhcnJ5KmJhc2U7Y2FycnkrPTF9d2hpbGUoY2Fycnk+MCl7cltpKytdPWNhcnJ5JWJhc2U7Y2Fycnk9TWF0aC5mbG9vcihjYXJyeS9iYXNlKX1yZXR1cm4gcn1CaWdJbnRlZ2VyLnByb3RvdHlwZS5hZGQ9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KTtpZih0aGlzLnNpZ24hPT1uLnNpZ24pe3JldHVybiB0aGlzLnN1YnRyYWN0KG4ubmVnYXRlKCkpfXZhciBhPXRoaXMudmFsdWUsYj1uLnZhbHVlO2lmKG4uaXNTbWFsbCl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZFNtYWxsKGEsTWF0aC5hYnMoYikpLHRoaXMuc2lnbil9cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZEFueShhLGIpLHRoaXMuc2lnbil9O0JpZ0ludGVnZXIucHJvdG90eXBlLnBsdXM9QmlnSW50ZWdlci5wcm90b3R5cGUuYWRkO1NtYWxsSW50ZWdlci5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodik7dmFyIGE9dGhpcy52YWx1ZTtpZihhPDAhPT1uLnNpZ24pe3JldHVybiB0aGlzLnN1YnRyYWN0KG4ubmVnYXRlKCkpfXZhciBiPW4udmFsdWU7aWYobi5pc1NtYWxsKXtpZihpc1ByZWNpc2UoYStiKSlyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcihhK2IpO2I9c21hbGxUb0FycmF5KE1hdGguYWJzKGIpKX1yZXR1cm4gbmV3IEJpZ0ludGVnZXIoYWRkU21hbGwoYixNYXRoLmFicyhhKSksYTwwKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5wbHVzPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuYWRkO05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUrcGFyc2VWYWx1ZSh2KS52YWx1ZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUucGx1cz1OYXRpdmVCaWdJbnQucHJvdG90eXBlLmFkZDtmdW5jdGlvbiBzdWJ0cmFjdChhLGIpe3ZhciBhX2w9YS5sZW5ndGgsYl9sPWIubGVuZ3RoLHI9bmV3IEFycmF5KGFfbCksYm9ycm93PTAsYmFzZT1CQVNFLGksZGlmZmVyZW5jZTtmb3IoaT0wO2k8Yl9sO2krKyl7ZGlmZmVyZW5jZT1hW2ldLWJvcnJvdy1iW2ldO2lmKGRpZmZlcmVuY2U8MCl7ZGlmZmVyZW5jZSs9YmFzZTtib3Jyb3c9MX1lbHNlIGJvcnJvdz0wO3JbaV09ZGlmZmVyZW5jZX1mb3IoaT1iX2w7aTxhX2w7aSsrKXtkaWZmZXJlbmNlPWFbaV0tYm9ycm93O2lmKGRpZmZlcmVuY2U8MClkaWZmZXJlbmNlKz1iYXNlO2Vsc2V7cltpKytdPWRpZmZlcmVuY2U7YnJlYWt9cltpXT1kaWZmZXJlbmNlfWZvcig7aTxhX2w7aSsrKXtyW2ldPWFbaV19dHJpbShyKTtyZXR1cm4gcn1mdW5jdGlvbiBzdWJ0cmFjdEFueShhLGIsc2lnbil7dmFyIHZhbHVlO2lmKGNvbXBhcmVBYnMoYSxiKT49MCl7dmFsdWU9c3VidHJhY3QoYSxiKX1lbHNle3ZhbHVlPXN1YnRyYWN0KGIsYSk7c2lnbj0hc2lnbn12YWx1ZT1hcnJheVRvU21hbGwodmFsdWUpO2lmKHR5cGVvZiB2YWx1ZT09PSJudW1iZXIiKXtpZihzaWduKXZhbHVlPS12YWx1ZTtyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2YWx1ZSl9cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHZhbHVlLHNpZ24pfWZ1bmN0aW9uIHN1YnRyYWN0U21hbGwoYSxiLHNpZ24pe3ZhciBsPWEubGVuZ3RoLHI9bmV3IEFycmF5KGwpLGNhcnJ5PS1iLGJhc2U9QkFTRSxpLGRpZmZlcmVuY2U7Zm9yKGk9MDtpPGw7aSsrKXtkaWZmZXJlbmNlPWFbaV0rY2Fycnk7Y2Fycnk9TWF0aC5mbG9vcihkaWZmZXJlbmNlL2Jhc2UpO2RpZmZlcmVuY2UlPWJhc2U7cltpXT1kaWZmZXJlbmNlPDA/ZGlmZmVyZW5jZStiYXNlOmRpZmZlcmVuY2V9cj1hcnJheVRvU21hbGwocik7aWYodHlwZW9mIHI9PT0ibnVtYmVyIil7aWYoc2lnbilyPS1yO3JldHVybiBuZXcgU21hbGxJbnRlZ2VyKHIpfXJldHVybiBuZXcgQmlnSW50ZWdlcihyLHNpZ24pfUJpZ0ludGVnZXIucHJvdG90eXBlLnN1YnRyYWN0PWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodik7aWYodGhpcy5zaWduIT09bi5zaWduKXtyZXR1cm4gdGhpcy5hZGQobi5uZWdhdGUoKSl9dmFyIGE9dGhpcy52YWx1ZSxiPW4udmFsdWU7aWYobi5pc1NtYWxsKXJldHVybiBzdWJ0cmFjdFNtYWxsKGEsTWF0aC5hYnMoYiksdGhpcy5zaWduKTtyZXR1cm4gc3VidHJhY3RBbnkoYSxiLHRoaXMuc2lnbil9O0JpZ0ludGVnZXIucHJvdG90eXBlLm1pbnVzPUJpZ0ludGVnZXIucHJvdG90eXBlLnN1YnRyYWN0O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuc3VidHJhY3Q9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KTt2YXIgYT10aGlzLnZhbHVlO2lmKGE8MCE9PW4uc2lnbil7cmV0dXJuIHRoaXMuYWRkKG4ubmVnYXRlKCkpfXZhciBiPW4udmFsdWU7aWYobi5pc1NtYWxsKXtyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcihhLWIpfXJldHVybiBzdWJ0cmFjdFNtYWxsKGIsTWF0aC5hYnMoYSksYT49MCl9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUubWludXM9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5zdWJ0cmFjdDtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnN1YnRyYWN0PWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUtcGFyc2VWYWx1ZSh2KS52YWx1ZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubWludXM9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5zdWJ0cmFjdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5uZWdhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IEJpZ0ludGVnZXIodGhpcy52YWx1ZSwhdGhpcy5zaWduKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5uZWdhdGU9ZnVuY3Rpb24oKXt2YXIgc2lnbj10aGlzLnNpZ247dmFyIHNtYWxsPW5ldyBTbWFsbEludGVnZXIoLXRoaXMudmFsdWUpO3NtYWxsLnNpZ249IXNpZ247cmV0dXJuIHNtYWxsfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm5lZ2F0ZT1mdW5jdGlvbigpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KC10aGlzLnZhbHVlKX07QmlnSW50ZWdlci5wcm90b3R5cGUuYWJzPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHRoaXMudmFsdWUsZmFsc2UpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLmFicz1mdW5jdGlvbigpe3JldHVybiBuZXcgU21hbGxJbnRlZ2VyKE1hdGguYWJzKHRoaXMudmFsdWUpKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5hYnM9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlPj0wP3RoaXMudmFsdWU6LXRoaXMudmFsdWUpfTtmdW5jdGlvbiBtdWx0aXBseUxvbmcoYSxiKXt2YXIgYV9sPWEubGVuZ3RoLGJfbD1iLmxlbmd0aCxsPWFfbCtiX2wscj1jcmVhdGVBcnJheShsKSxiYXNlPUJBU0UscHJvZHVjdCxjYXJyeSxpLGFfaSxiX2o7Zm9yKGk9MDtpPGFfbDsrK2kpe2FfaT1hW2ldO2Zvcih2YXIgaj0wO2o8Yl9sOysrail7Yl9qPWJbal07cHJvZHVjdD1hX2kqYl9qK3JbaStqXTtjYXJyeT1NYXRoLmZsb29yKHByb2R1Y3QvYmFzZSk7cltpK2pdPXByb2R1Y3QtY2FycnkqYmFzZTtyW2kraisxXSs9Y2Fycnl9fXRyaW0ocik7cmV0dXJuIHJ9ZnVuY3Rpb24gbXVsdGlwbHlTbWFsbChhLGIpe3ZhciBsPWEubGVuZ3RoLHI9bmV3IEFycmF5KGwpLGJhc2U9QkFTRSxjYXJyeT0wLHByb2R1Y3QsaTtmb3IoaT0wO2k8bDtpKyspe3Byb2R1Y3Q9YVtpXSpiK2NhcnJ5O2NhcnJ5PU1hdGguZmxvb3IocHJvZHVjdC9iYXNlKTtyW2ldPXByb2R1Y3QtY2FycnkqYmFzZX13aGlsZShjYXJyeT4wKXtyW2krK109Y2FycnklYmFzZTtjYXJyeT1NYXRoLmZsb29yKGNhcnJ5L2Jhc2UpfXJldHVybiByfWZ1bmN0aW9uIHNoaWZ0TGVmdCh4LG4pe3ZhciByPVtdO3doaWxlKG4tLSA+MClyLnB1c2goMCk7cmV0dXJuIHIuY29uY2F0KHgpfWZ1bmN0aW9uIG11bHRpcGx5S2FyYXRzdWJhKHgseSl7dmFyIG49TWF0aC5tYXgoeC5sZW5ndGgseS5sZW5ndGgpO2lmKG48PTMwKXJldHVybiBtdWx0aXBseUxvbmcoeCx5KTtuPU1hdGguY2VpbChuLzIpO3ZhciBiPXguc2xpY2UobiksYT14LnNsaWNlKDAsbiksZD15LnNsaWNlKG4pLGM9eS5zbGljZSgwLG4pO3ZhciBhYz1tdWx0aXBseUthcmF0c3ViYShhLGMpLGJkPW11bHRpcGx5S2FyYXRzdWJhKGIsZCksYWJjZD1tdWx0aXBseUthcmF0c3ViYShhZGRBbnkoYSxiKSxhZGRBbnkoYyxkKSk7dmFyIHByb2R1Y3Q9YWRkQW55KGFkZEFueShhYyxzaGlmdExlZnQoc3VidHJhY3Qoc3VidHJhY3QoYWJjZCxhYyksYmQpLG4pKSxzaGlmdExlZnQoYmQsMipuKSk7dHJpbShwcm9kdWN0KTtyZXR1cm4gcHJvZHVjdH1mdW5jdGlvbiB1c2VLYXJhdHN1YmEobDEsbDIpe3JldHVybi0uMDEyKmwxLS4wMTIqbDIrMTVlLTYqbDEqbDI+MH1CaWdJbnRlZ2VyLnByb3RvdHlwZS5tdWx0aXBseT1mdW5jdGlvbih2KXt2YXIgbj1wYXJzZVZhbHVlKHYpLGE9dGhpcy52YWx1ZSxiPW4udmFsdWUsc2lnbj10aGlzLnNpZ24hPT1uLnNpZ24sYWJzO2lmKG4uaXNTbWFsbCl7aWYoYj09PTApcmV0dXJuIEludGVnZXJbMF07aWYoYj09PTEpcmV0dXJuIHRoaXM7aWYoYj09PS0xKXJldHVybiB0aGlzLm5lZ2F0ZSgpO2Ficz1NYXRoLmFicyhiKTtpZihhYnM8QkFTRSl7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKG11bHRpcGx5U21hbGwoYSxhYnMpLHNpZ24pfWI9c21hbGxUb0FycmF5KGFicyl9aWYodXNlS2FyYXRzdWJhKGEubGVuZ3RoLGIubGVuZ3RoKSlyZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlLYXJhdHN1YmEoYSxiKSxzaWduKTtyZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlMb25nKGEsYiksc2lnbil9O0JpZ0ludGVnZXIucHJvdG90eXBlLnRpbWVzPUJpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5O2Z1bmN0aW9uIG11bHRpcGx5U21hbGxBbmRBcnJheShhLGIsc2lnbil7aWYoYTxCQVNFKXtyZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlTbWFsbChiLGEpLHNpZ24pfXJldHVybiBuZXcgQmlnSW50ZWdlcihtdWx0aXBseUxvbmcoYixzbWFsbFRvQXJyYXkoYSkpLHNpZ24pfVNtYWxsSW50ZWdlci5wcm90b3R5cGUuX211bHRpcGx5QnlTbWFsbD1mdW5jdGlvbihhKXtpZihpc1ByZWNpc2UoYS52YWx1ZSp0aGlzLnZhbHVlKSl7cmV0dXJuIG5ldyBTbWFsbEludGVnZXIoYS52YWx1ZSp0aGlzLnZhbHVlKX1yZXR1cm4gbXVsdGlwbHlTbWFsbEFuZEFycmF5KE1hdGguYWJzKGEudmFsdWUpLHNtYWxsVG9BcnJheShNYXRoLmFicyh0aGlzLnZhbHVlKSksdGhpcy5zaWduIT09YS5zaWduKX07QmlnSW50ZWdlci5wcm90b3R5cGUuX211bHRpcGx5QnlTbWFsbD1mdW5jdGlvbihhKXtpZihhLnZhbHVlPT09MClyZXR1cm4gSW50ZWdlclswXTtpZihhLnZhbHVlPT09MSlyZXR1cm4gdGhpcztpZihhLnZhbHVlPT09LTEpcmV0dXJuIHRoaXMubmVnYXRlKCk7cmV0dXJuIG11bHRpcGx5U21hbGxBbmRBcnJheShNYXRoLmFicyhhLnZhbHVlKSx0aGlzLnZhbHVlLHRoaXMuc2lnbiE9PWEuc2lnbil9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUubXVsdGlwbHk9ZnVuY3Rpb24odil7cmV0dXJuIHBhcnNlVmFsdWUodikuX211bHRpcGx5QnlTbWFsbCh0aGlzKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50aW1lcz1TbWFsbEludGVnZXIucHJvdG90eXBlLm11bHRpcGx5O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubXVsdGlwbHk9ZnVuY3Rpb24odil7cmV0dXJuIG5ldyBOYXRpdmVCaWdJbnQodGhpcy52YWx1ZSpwYXJzZVZhbHVlKHYpLnZhbHVlKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS50aW1lcz1OYXRpdmVCaWdJbnQucHJvdG90eXBlLm11bHRpcGx5O2Z1bmN0aW9uIHNxdWFyZShhKXt2YXIgbD1hLmxlbmd0aCxyPWNyZWF0ZUFycmF5KGwrbCksYmFzZT1CQVNFLHByb2R1Y3QsY2FycnksaSxhX2ksYV9qO2ZvcihpPTA7aTxsO2krKyl7YV9pPWFbaV07Y2Fycnk9MC1hX2kqYV9pO2Zvcih2YXIgaj1pO2o8bDtqKyspe2Ffaj1hW2pdO3Byb2R1Y3Q9MiooYV9pKmFfaikrcltpK2pdK2NhcnJ5O2NhcnJ5PU1hdGguZmxvb3IocHJvZHVjdC9iYXNlKTtyW2kral09cHJvZHVjdC1jYXJyeSpiYXNlfXJbaStsXT1jYXJyeX10cmltKHIpO3JldHVybiByfUJpZ0ludGVnZXIucHJvdG90eXBlLnNxdWFyZT1mdW5jdGlvbigpe3JldHVybiBuZXcgQmlnSW50ZWdlcihzcXVhcmUodGhpcy52YWx1ZSksZmFsc2UpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLnNxdWFyZT1mdW5jdGlvbigpe3ZhciB2YWx1ZT10aGlzLnZhbHVlKnRoaXMudmFsdWU7aWYoaXNQcmVjaXNlKHZhbHVlKSlyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2YWx1ZSk7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHNxdWFyZShzbWFsbFRvQXJyYXkoTWF0aC5hYnModGhpcy52YWx1ZSkpKSxmYWxzZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuc3F1YXJlPWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUqdGhpcy52YWx1ZSl9O2Z1bmN0aW9uIGRpdk1vZDEoYSxiKXt2YXIgYV9sPWEubGVuZ3RoLGJfbD1iLmxlbmd0aCxiYXNlPUJBU0UscmVzdWx0PWNyZWF0ZUFycmF5KGIubGVuZ3RoKSxkaXZpc29yTW9zdFNpZ25pZmljYW50RGlnaXQ9YltiX2wtMV0sbGFtYmRhPU1hdGguY2VpbChiYXNlLygyKmRpdmlzb3JNb3N0U2lnbmlmaWNhbnREaWdpdCkpLHJlbWFpbmRlcj1tdWx0aXBseVNtYWxsKGEsbGFtYmRhKSxkaXZpc29yPW11bHRpcGx5U21hbGwoYixsYW1iZGEpLHF1b3RpZW50RGlnaXQsc2hpZnQsY2FycnksYm9ycm93LGksbCxxO2lmKHJlbWFpbmRlci5sZW5ndGg8PWFfbClyZW1haW5kZXIucHVzaCgwKTtkaXZpc29yLnB1c2goMCk7ZGl2aXNvck1vc3RTaWduaWZpY2FudERpZ2l0PWRpdmlzb3JbYl9sLTFdO2ZvcihzaGlmdD1hX2wtYl9sO3NoaWZ0Pj0wO3NoaWZ0LS0pe3F1b3RpZW50RGlnaXQ9YmFzZS0xO2lmKHJlbWFpbmRlcltzaGlmdCtiX2xdIT09ZGl2aXNvck1vc3RTaWduaWZpY2FudERpZ2l0KXtxdW90aWVudERpZ2l0PU1hdGguZmxvb3IoKHJlbWFpbmRlcltzaGlmdCtiX2xdKmJhc2UrcmVtYWluZGVyW3NoaWZ0K2JfbC0xXSkvZGl2aXNvck1vc3RTaWduaWZpY2FudERpZ2l0KX1jYXJyeT0wO2JvcnJvdz0wO2w9ZGl2aXNvci5sZW5ndGg7Zm9yKGk9MDtpPGw7aSsrKXtjYXJyeSs9cXVvdGllbnREaWdpdCpkaXZpc29yW2ldO3E9TWF0aC5mbG9vcihjYXJyeS9iYXNlKTtib3Jyb3crPXJlbWFpbmRlcltzaGlmdCtpXS0oY2FycnktcSpiYXNlKTtjYXJyeT1xO2lmKGJvcnJvdzwwKXtyZW1haW5kZXJbc2hpZnQraV09Ym9ycm93K2Jhc2U7Ym9ycm93PS0xfWVsc2V7cmVtYWluZGVyW3NoaWZ0K2ldPWJvcnJvdztib3Jyb3c9MH19d2hpbGUoYm9ycm93IT09MCl7cXVvdGllbnREaWdpdC09MTtjYXJyeT0wO2ZvcihpPTA7aTxsO2krKyl7Y2FycnkrPXJlbWFpbmRlcltzaGlmdCtpXS1iYXNlK2Rpdmlzb3JbaV07aWYoY2Fycnk8MCl7cmVtYWluZGVyW3NoaWZ0K2ldPWNhcnJ5K2Jhc2U7Y2Fycnk9MH1lbHNle3JlbWFpbmRlcltzaGlmdCtpXT1jYXJyeTtjYXJyeT0xfX1ib3Jyb3crPWNhcnJ5fXJlc3VsdFtzaGlmdF09cXVvdGllbnREaWdpdH1yZW1haW5kZXI9ZGl2TW9kU21hbGwocmVtYWluZGVyLGxhbWJkYSlbMF07cmV0dXJuW2FycmF5VG9TbWFsbChyZXN1bHQpLGFycmF5VG9TbWFsbChyZW1haW5kZXIpXX1mdW5jdGlvbiBkaXZNb2QyKGEsYil7dmFyIGFfbD1hLmxlbmd0aCxiX2w9Yi5sZW5ndGgscmVzdWx0PVtdLHBhcnQ9W10sYmFzZT1CQVNFLGd1ZXNzLHhsZW4saGlnaHgsaGlnaHksY2hlY2s7d2hpbGUoYV9sKXtwYXJ0LnVuc2hpZnQoYVstLWFfbF0pO3RyaW0ocGFydCk7aWYoY29tcGFyZUFicyhwYXJ0LGIpPDApe3Jlc3VsdC5wdXNoKDApO2NvbnRpbnVlfXhsZW49cGFydC5sZW5ndGg7aGlnaHg9cGFydFt4bGVuLTFdKmJhc2UrcGFydFt4bGVuLTJdO2hpZ2h5PWJbYl9sLTFdKmJhc2UrYltiX2wtMl07aWYoeGxlbj5iX2wpe2hpZ2h4PShoaWdoeCsxKSpiYXNlfWd1ZXNzPU1hdGguY2VpbChoaWdoeC9oaWdoeSk7ZG97Y2hlY2s9bXVsdGlwbHlTbWFsbChiLGd1ZXNzKTtpZihjb21wYXJlQWJzKGNoZWNrLHBhcnQpPD0wKWJyZWFrO2d1ZXNzLS19d2hpbGUoZ3Vlc3MpO3Jlc3VsdC5wdXNoKGd1ZXNzKTtwYXJ0PXN1YnRyYWN0KHBhcnQsY2hlY2spfXJlc3VsdC5yZXZlcnNlKCk7cmV0dXJuW2FycmF5VG9TbWFsbChyZXN1bHQpLGFycmF5VG9TbWFsbChwYXJ0KV19ZnVuY3Rpb24gZGl2TW9kU21hbGwodmFsdWUsbGFtYmRhKXt2YXIgbGVuZ3RoPXZhbHVlLmxlbmd0aCxxdW90aWVudD1jcmVhdGVBcnJheShsZW5ndGgpLGJhc2U9QkFTRSxpLHEscmVtYWluZGVyLGRpdmlzb3I7cmVtYWluZGVyPTA7Zm9yKGk9bGVuZ3RoLTE7aT49MDstLWkpe2Rpdmlzb3I9cmVtYWluZGVyKmJhc2UrdmFsdWVbaV07cT10cnVuY2F0ZShkaXZpc29yL2xhbWJkYSk7cmVtYWluZGVyPWRpdmlzb3ItcSpsYW1iZGE7cXVvdGllbnRbaV09cXwwfXJldHVybltxdW90aWVudCxyZW1haW5kZXJ8MF19ZnVuY3Rpb24gZGl2TW9kQW55KHNlbGYsdil7dmFyIHZhbHVlLG49cGFyc2VWYWx1ZSh2KTtpZihzdXBwb3J0c05hdGl2ZUJpZ0ludCl7cmV0dXJuW25ldyBOYXRpdmVCaWdJbnQoc2VsZi52YWx1ZS9uLnZhbHVlKSxuZXcgTmF0aXZlQmlnSW50KHNlbGYudmFsdWUlbi52YWx1ZSldfXZhciBhPXNlbGYudmFsdWUsYj1uLnZhbHVlO3ZhciBxdW90aWVudDtpZihiPT09MCl0aHJvdyBuZXcgRXJyb3IoIkNhbm5vdCBkaXZpZGUgYnkgemVybyIpO2lmKHNlbGYuaXNTbWFsbCl7aWYobi5pc1NtYWxsKXtyZXR1cm5bbmV3IFNtYWxsSW50ZWdlcih0cnVuY2F0ZShhL2IpKSxuZXcgU21hbGxJbnRlZ2VyKGElYildfXJldHVybltJbnRlZ2VyWzBdLHNlbGZdfWlmKG4uaXNTbWFsbCl7aWYoYj09PTEpcmV0dXJuW3NlbGYsSW50ZWdlclswXV07aWYoYj09LTEpcmV0dXJuW3NlbGYubmVnYXRlKCksSW50ZWdlclswXV07dmFyIGFicz1NYXRoLmFicyhiKTtpZihhYnM8QkFTRSl7dmFsdWU9ZGl2TW9kU21hbGwoYSxhYnMpO3F1b3RpZW50PWFycmF5VG9TbWFsbCh2YWx1ZVswXSk7dmFyIHJlbWFpbmRlcj12YWx1ZVsxXTtpZihzZWxmLnNpZ24pcmVtYWluZGVyPS1yZW1haW5kZXI7aWYodHlwZW9mIHF1b3RpZW50PT09Im51bWJlciIpe2lmKHNlbGYuc2lnbiE9PW4uc2lnbilxdW90aWVudD0tcXVvdGllbnQ7cmV0dXJuW25ldyBTbWFsbEludGVnZXIocXVvdGllbnQpLG5ldyBTbWFsbEludGVnZXIocmVtYWluZGVyKV19cmV0dXJuW25ldyBCaWdJbnRlZ2VyKHF1b3RpZW50LHNlbGYuc2lnbiE9PW4uc2lnbiksbmV3IFNtYWxsSW50ZWdlcihyZW1haW5kZXIpXX1iPXNtYWxsVG9BcnJheShhYnMpfXZhciBjb21wYXJpc29uPWNvbXBhcmVBYnMoYSxiKTtpZihjb21wYXJpc29uPT09LTEpcmV0dXJuW0ludGVnZXJbMF0sc2VsZl07aWYoY29tcGFyaXNvbj09PTApcmV0dXJuW0ludGVnZXJbc2VsZi5zaWduPT09bi5zaWduPzE6LTFdLEludGVnZXJbMF1dO2lmKGEubGVuZ3RoK2IubGVuZ3RoPD0yMDApdmFsdWU9ZGl2TW9kMShhLGIpO2Vsc2UgdmFsdWU9ZGl2TW9kMihhLGIpO3F1b3RpZW50PXZhbHVlWzBdO3ZhciBxU2lnbj1zZWxmLnNpZ24hPT1uLnNpZ24sbW9kPXZhbHVlWzFdLG1TaWduPXNlbGYuc2lnbjtpZih0eXBlb2YgcXVvdGllbnQ9PT0ibnVtYmVyIil7aWYocVNpZ24pcXVvdGllbnQ9LXF1b3RpZW50O3F1b3RpZW50PW5ldyBTbWFsbEludGVnZXIocXVvdGllbnQpfWVsc2UgcXVvdGllbnQ9bmV3IEJpZ0ludGVnZXIocXVvdGllbnQscVNpZ24pO2lmKHR5cGVvZiBtb2Q9PT0ibnVtYmVyIil7aWYobVNpZ24pbW9kPS1tb2Q7bW9kPW5ldyBTbWFsbEludGVnZXIobW9kKX1lbHNlIG1vZD1uZXcgQmlnSW50ZWdlcihtb2QsbVNpZ24pO3JldHVybltxdW90aWVudCxtb2RdfUJpZ0ludGVnZXIucHJvdG90eXBlLmRpdm1vZD1mdW5jdGlvbih2KXt2YXIgcmVzdWx0PWRpdk1vZEFueSh0aGlzLHYpO3JldHVybntxdW90aWVudDpyZXN1bHRbMF0scmVtYWluZGVyOnJlc3VsdFsxXX19O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZGl2bW9kPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZGl2bW9kPUJpZ0ludGVnZXIucHJvdG90eXBlLmRpdm1vZDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZpZGU9ZnVuY3Rpb24odil7cmV0dXJuIGRpdk1vZEFueSh0aGlzLHYpWzBdfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm92ZXI9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5kaXZpZGU9ZnVuY3Rpb24odil7cmV0dXJuIG5ldyBOYXRpdmVCaWdJbnQodGhpcy52YWx1ZS9wYXJzZVZhbHVlKHYpLnZhbHVlKX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5vdmVyPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZGl2aWRlPUJpZ0ludGVnZXIucHJvdG90eXBlLm92ZXI9QmlnSW50ZWdlci5wcm90b3R5cGUuZGl2aWRlO0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZD1mdW5jdGlvbih2KXtyZXR1cm4gZGl2TW9kQW55KHRoaXMsdilbMV19O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubW9kPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUucmVtYWluZGVyPWZ1bmN0aW9uKHYpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KHRoaXMudmFsdWUlcGFyc2VWYWx1ZSh2KS52YWx1ZSl9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUucmVtYWluZGVyPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubW9kPUJpZ0ludGVnZXIucHJvdG90eXBlLnJlbWFpbmRlcj1CaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2Q7QmlnSW50ZWdlci5wcm90b3R5cGUucG93PWZ1bmN0aW9uKHYpe3ZhciBuPXBhcnNlVmFsdWUodiksYT10aGlzLnZhbHVlLGI9bi52YWx1ZSx2YWx1ZSx4LHk7aWYoYj09PTApcmV0dXJuIEludGVnZXJbMV07aWYoYT09PTApcmV0dXJuIEludGVnZXJbMF07aWYoYT09PTEpcmV0dXJuIEludGVnZXJbMV07aWYoYT09PS0xKXJldHVybiBuLmlzRXZlbigpP0ludGVnZXJbMV06SW50ZWdlclstMV07aWYobi5zaWduKXtyZXR1cm4gSW50ZWdlclswXX1pZighbi5pc1NtYWxsKXRocm93IG5ldyBFcnJvcigiVGhlIGV4cG9uZW50ICIrbi50b1N0cmluZygpKyIgaXMgdG9vIGxhcmdlLiIpO2lmKHRoaXMuaXNTbWFsbCl7aWYoaXNQcmVjaXNlKHZhbHVlPU1hdGgucG93KGEsYikpKXJldHVybiBuZXcgU21hbGxJbnRlZ2VyKHRydW5jYXRlKHZhbHVlKSl9eD10aGlzO3k9SW50ZWdlclsxXTt3aGlsZSh0cnVlKXtpZihiJjE9PT0xKXt5PXkudGltZXMoeCk7LS1ifWlmKGI9PT0wKWJyZWFrO2IvPTI7eD14LnNxdWFyZSgpfXJldHVybiB5fTtTbWFsbEludGVnZXIucHJvdG90eXBlLnBvdz1CaWdJbnRlZ2VyLnByb3RvdHlwZS5wb3c7TmF0aXZlQmlnSW50LnByb3RvdHlwZS5wb3c9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KTt2YXIgYT10aGlzLnZhbHVlLGI9bi52YWx1ZTt2YXIgXzA9QmlnSW50KDApLF8xPUJpZ0ludCgxKSxfMj1CaWdJbnQoMik7aWYoYj09PV8wKXJldHVybiBJbnRlZ2VyWzFdO2lmKGE9PT1fMClyZXR1cm4gSW50ZWdlclswXTtpZihhPT09XzEpcmV0dXJuIEludGVnZXJbMV07aWYoYT09PUJpZ0ludCgtMSkpcmV0dXJuIG4uaXNFdmVuKCk/SW50ZWdlclsxXTpJbnRlZ2VyWy0xXTtpZihuLmlzTmVnYXRpdmUoKSlyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludChfMCk7dmFyIHg9dGhpczt2YXIgeT1JbnRlZ2VyWzFdO3doaWxlKHRydWUpe2lmKChiJl8xKT09PV8xKXt5PXkudGltZXMoeCk7LS1ifWlmKGI9PT1fMClicmVhaztiLz1fMjt4PXguc3F1YXJlKCl9cmV0dXJuIHl9O0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZFBvdz1mdW5jdGlvbihleHAsbW9kKXtleHA9cGFyc2VWYWx1ZShleHApO21vZD1wYXJzZVZhbHVlKG1vZCk7aWYobW9kLmlzWmVybygpKXRocm93IG5ldyBFcnJvcigiQ2Fubm90IHRha2UgbW9kUG93IHdpdGggbW9kdWx1cyAwIik7dmFyIHI9SW50ZWdlclsxXSxiYXNlPXRoaXMubW9kKG1vZCk7aWYoZXhwLmlzTmVnYXRpdmUoKSl7ZXhwPWV4cC5tdWx0aXBseShJbnRlZ2VyWy0xXSk7YmFzZT1iYXNlLm1vZEludihtb2QpfXdoaWxlKGV4cC5pc1Bvc2l0aXZlKCkpe2lmKGJhc2UuaXNaZXJvKCkpcmV0dXJuIEludGVnZXJbMF07aWYoZXhwLmlzT2RkKCkpcj1yLm11bHRpcGx5KGJhc2UpLm1vZChtb2QpO2V4cD1leHAuZGl2aWRlKDIpO2Jhc2U9YmFzZS5zcXVhcmUoKS5tb2QobW9kKX1yZXR1cm4gcn07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5tb2RQb3c9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5tb2RQb3c9QmlnSW50ZWdlci5wcm90b3R5cGUubW9kUG93O2Z1bmN0aW9uIGNvbXBhcmVBYnMoYSxiKXtpZihhLmxlbmd0aCE9PWIubGVuZ3RoKXtyZXR1cm4gYS5sZW5ndGg+Yi5sZW5ndGg/MTotMX1mb3IodmFyIGk9YS5sZW5ndGgtMTtpPj0wO2ktLSl7aWYoYVtpXSE9PWJbaV0pcmV0dXJuIGFbaV0+YltpXT8xOi0xfXJldHVybiAwfUJpZ0ludGVnZXIucHJvdG90eXBlLmNvbXBhcmVBYnM9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KSxhPXRoaXMudmFsdWUsYj1uLnZhbHVlO2lmKG4uaXNTbWFsbClyZXR1cm4gMTtyZXR1cm4gY29tcGFyZUFicyhhLGIpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLmNvbXBhcmVBYnM9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KSxhPU1hdGguYWJzKHRoaXMudmFsdWUpLGI9bi52YWx1ZTtpZihuLmlzU21hbGwpe2I9TWF0aC5hYnMoYik7cmV0dXJuIGE9PT1iPzA6YT5iPzE6LTF9cmV0dXJuLTF9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuY29tcGFyZUFicz1mdW5jdGlvbih2KXt2YXIgYT10aGlzLnZhbHVlO3ZhciBiPXBhcnNlVmFsdWUodikudmFsdWU7YT1hPj0wP2E6LWE7Yj1iPj0wP2I6LWI7cmV0dXJuIGE9PT1iPzA6YT5iPzE6LTF9O0JpZ0ludGVnZXIucHJvdG90eXBlLmNvbXBhcmU9ZnVuY3Rpb24odil7aWYodj09PUluZmluaXR5KXtyZXR1cm4tMX1pZih2PT09LUluZmluaXR5KXtyZXR1cm4gMX12YXIgbj1wYXJzZVZhbHVlKHYpLGE9dGhpcy52YWx1ZSxiPW4udmFsdWU7aWYodGhpcy5zaWduIT09bi5zaWduKXtyZXR1cm4gbi5zaWduPzE6LTF9aWYobi5pc1NtYWxsKXtyZXR1cm4gdGhpcy5zaWduPy0xOjF9cmV0dXJuIGNvbXBhcmVBYnMoYSxiKSoodGhpcy5zaWduPy0xOjEpfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlVG89QmlnSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZTtTbWFsbEludGVnZXIucHJvdG90eXBlLmNvbXBhcmU9ZnVuY3Rpb24odil7aWYodj09PUluZmluaXR5KXtyZXR1cm4tMX1pZih2PT09LUluZmluaXR5KXtyZXR1cm4gMX12YXIgbj1wYXJzZVZhbHVlKHYpLGE9dGhpcy52YWx1ZSxiPW4udmFsdWU7aWYobi5pc1NtYWxsKXtyZXR1cm4gYT09Yj8wOmE+Yj8xOi0xfWlmKGE8MCE9PW4uc2lnbil7cmV0dXJuIGE8MD8tMToxfXJldHVybiBhPDA/MTotMX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlVG89U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlO05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuY29tcGFyZT1mdW5jdGlvbih2KXtpZih2PT09SW5maW5pdHkpe3JldHVybi0xfWlmKHY9PT0tSW5maW5pdHkpe3JldHVybiAxfXZhciBhPXRoaXMudmFsdWU7dmFyIGI9cGFyc2VWYWx1ZSh2KS52YWx1ZTtyZXR1cm4gYT09PWI/MDphPmI/MTotMX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5jb21wYXJlVG89TmF0aXZlQmlnSW50LnByb3RvdHlwZS5jb21wYXJlO0JpZ0ludGVnZXIucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbih2KXtyZXR1cm4gdGhpcy5jb21wYXJlKHYpPT09MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5lcT1OYXRpdmVCaWdJbnQucHJvdG90eXBlLmVxdWFscz1TbWFsbEludGVnZXIucHJvdG90eXBlLmVxPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZXF1YWxzPUJpZ0ludGVnZXIucHJvdG90eXBlLmVxPUJpZ0ludGVnZXIucHJvdG90eXBlLmVxdWFscztCaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3RFcXVhbHM9ZnVuY3Rpb24odil7cmV0dXJuIHRoaXMuY29tcGFyZSh2KSE9PTB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubmVxPU5hdGl2ZUJpZ0ludC5wcm90b3R5cGUubm90RXF1YWxzPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubmVxPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubm90RXF1YWxzPUJpZ0ludGVnZXIucHJvdG90eXBlLm5lcT1CaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3RFcXVhbHM7QmlnSW50ZWdlci5wcm90b3R5cGUuZ3JlYXRlcj1mdW5jdGlvbih2KXtyZXR1cm4gdGhpcy5jb21wYXJlKHYpPjB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuZ3Q9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5ncmVhdGVyPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuZ3Q9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyPUJpZ0ludGVnZXIucHJvdG90eXBlLmd0PUJpZ0ludGVnZXIucHJvdG90eXBlLmdyZWF0ZXI7QmlnSW50ZWdlci5wcm90b3R5cGUubGVzc2VyPWZ1bmN0aW9uKHYpe3JldHVybiB0aGlzLmNvbXBhcmUodik8MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5sdD1OYXRpdmVCaWdJbnQucHJvdG90eXBlLmxlc3Nlcj1TbWFsbEludGVnZXIucHJvdG90eXBlLmx0PVNtYWxsSW50ZWdlci5wcm90b3R5cGUubGVzc2VyPUJpZ0ludGVnZXIucHJvdG90eXBlLmx0PUJpZ0ludGVnZXIucHJvdG90eXBlLmxlc3NlcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyT3JFcXVhbHM9ZnVuY3Rpb24odil7cmV0dXJuIHRoaXMuY29tcGFyZSh2KT49MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5nZXE9TmF0aXZlQmlnSW50LnByb3RvdHlwZS5ncmVhdGVyT3JFcXVhbHM9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5nZXE9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyT3JFcXVhbHM9QmlnSW50ZWdlci5wcm90b3R5cGUuZ2VxPUJpZ0ludGVnZXIucHJvdG90eXBlLmdyZWF0ZXJPckVxdWFscztCaWdJbnRlZ2VyLnByb3RvdHlwZS5sZXNzZXJPckVxdWFscz1mdW5jdGlvbih2KXtyZXR1cm4gdGhpcy5jb21wYXJlKHYpPD0wfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmxlcT1OYXRpdmVCaWdJbnQucHJvdG90eXBlLmxlc3Nlck9yRXF1YWxzPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubGVxPVNtYWxsSW50ZWdlci5wcm90b3R5cGUubGVzc2VyT3JFcXVhbHM9QmlnSW50ZWdlci5wcm90b3R5cGUubGVxPUJpZ0ludGVnZXIucHJvdG90eXBlLmxlc3Nlck9yRXF1YWxzO0JpZ0ludGVnZXIucHJvdG90eXBlLmlzRXZlbj1mdW5jdGlvbigpe3JldHVybih0aGlzLnZhbHVlWzBdJjEpPT09MH07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc0V2ZW49ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZSYxKT09PTB9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNFdmVuPWZ1bmN0aW9uKCl7cmV0dXJuKHRoaXMudmFsdWUmQmlnSW50KDEpKT09PUJpZ0ludCgwKX07QmlnSW50ZWdlci5wcm90b3R5cGUuaXNPZGQ9ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZVswXSYxKT09PTF9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNPZGQ9ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZSYxKT09PTF9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNPZGQ9ZnVuY3Rpb24oKXtyZXR1cm4odGhpcy52YWx1ZSZCaWdJbnQoMSkpPT09QmlnSW50KDEpfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1Bvc2l0aXZlPWZ1bmN0aW9uKCl7cmV0dXJuIXRoaXMuc2lnbn07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc1Bvc2l0aXZlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWU+MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc1Bvc2l0aXZlPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNQb3NpdGl2ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc05lZ2F0aXZlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2lnbn07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc05lZ2F0aXZlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWU8MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc05lZ2F0aXZlPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNOZWdhdGl2ZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1VuaXQ9ZnVuY3Rpb24oKXtyZXR1cm4gZmFsc2V9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNVbml0PWZ1bmN0aW9uKCl7cmV0dXJuIE1hdGguYWJzKHRoaXMudmFsdWUpPT09MX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc1VuaXQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5hYnMoKS52YWx1ZT09PUJpZ0ludCgxKX07QmlnSW50ZWdlci5wcm90b3R5cGUuaXNaZXJvPWZ1bmN0aW9uKCl7cmV0dXJuIGZhbHNlfTtTbWFsbEludGVnZXIucHJvdG90eXBlLmlzWmVybz1mdW5jdGlvbigpe3JldHVybiB0aGlzLnZhbHVlPT09MH07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5pc1plcm89ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy52YWx1ZT09PUJpZ0ludCgwKX07QmlnSW50ZWdlci5wcm90b3R5cGUuaXNEaXZpc2libGVCeT1mdW5jdGlvbih2KXt2YXIgbj1wYXJzZVZhbHVlKHYpO2lmKG4uaXNaZXJvKCkpcmV0dXJuIGZhbHNlO2lmKG4uaXNVbml0KCkpcmV0dXJuIHRydWU7aWYobi5jb21wYXJlQWJzKDIpPT09MClyZXR1cm4gdGhpcy5pc0V2ZW4oKTtyZXR1cm4gdGhpcy5tb2QobikuaXNaZXJvKCl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNEaXZpc2libGVCeT1TbWFsbEludGVnZXIucHJvdG90eXBlLmlzRGl2aXNpYmxlQnk9QmlnSW50ZWdlci5wcm90b3R5cGUuaXNEaXZpc2libGVCeTtmdW5jdGlvbiBpc0Jhc2ljUHJpbWUodil7dmFyIG49di5hYnMoKTtpZihuLmlzVW5pdCgpKXJldHVybiBmYWxzZTtpZihuLmVxdWFscygyKXx8bi5lcXVhbHMoMyl8fG4uZXF1YWxzKDUpKXJldHVybiB0cnVlO2lmKG4uaXNFdmVuKCl8fG4uaXNEaXZpc2libGVCeSgzKXx8bi5pc0RpdmlzaWJsZUJ5KDUpKXJldHVybiBmYWxzZTtpZihuLmxlc3Nlcig0OSkpcmV0dXJuIHRydWV9ZnVuY3Rpb24gbWlsbGVyUmFiaW5UZXN0KG4sYSl7dmFyIG5QcmV2PW4ucHJldigpLGI9blByZXYscj0wLGQsdCxpLHg7d2hpbGUoYi5pc0V2ZW4oKSliPWIuZGl2aWRlKDIpLHIrKztuZXh0OmZvcihpPTA7aTxhLmxlbmd0aDtpKyspe2lmKG4ubGVzc2VyKGFbaV0pKWNvbnRpbnVlO3g9YmlnSW50KGFbaV0pLm1vZFBvdyhiLG4pO2lmKHguaXNVbml0KCl8fHguZXF1YWxzKG5QcmV2KSljb250aW51ZTtmb3IoZD1yLTE7ZCE9MDtkLS0pe3g9eC5zcXVhcmUoKS5tb2Qobik7aWYoeC5pc1VuaXQoKSlyZXR1cm4gZmFsc2U7aWYoeC5lcXVhbHMoblByZXYpKWNvbnRpbnVlIG5leHR9cmV0dXJuIGZhbHNlfXJldHVybiB0cnVlfUJpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJpbWU9ZnVuY3Rpb24oc3RyaWN0KXt2YXIgaXNQcmltZT1pc0Jhc2ljUHJpbWUodGhpcyk7aWYoaXNQcmltZSE9PXVuZGVmaW5lZClyZXR1cm4gaXNQcmltZTt2YXIgbj10aGlzLmFicygpO3ZhciBiaXRzPW4uYml0TGVuZ3RoKCk7aWYoYml0czw9NjQpcmV0dXJuIG1pbGxlclJhYmluVGVzdChuLFsyLDMsNSw3LDExLDEzLDE3LDE5LDIzLDI5LDMxLDM3XSk7dmFyIGxvZ049TWF0aC5sb2coMikqYml0cy50b0pTTnVtYmVyKCk7dmFyIHQ9TWF0aC5jZWlsKHN0cmljdD09PXRydWU/MipNYXRoLnBvdyhsb2dOLDIpOmxvZ04pO2Zvcih2YXIgYT1bXSxpPTA7aTx0O2krKyl7YS5wdXNoKGJpZ0ludChpKzIpKX1yZXR1cm4gbWlsbGVyUmFiaW5UZXN0KG4sYSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNQcmltZT1TbWFsbEludGVnZXIucHJvdG90eXBlLmlzUHJpbWU9QmlnSW50ZWdlci5wcm90b3R5cGUuaXNQcmltZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1Byb2JhYmxlUHJpbWU9ZnVuY3Rpb24oaXRlcmF0aW9ucyxybmcpe3ZhciBpc1ByaW1lPWlzQmFzaWNQcmltZSh0aGlzKTtpZihpc1ByaW1lIT09dW5kZWZpbmVkKXJldHVybiBpc1ByaW1lO3ZhciBuPXRoaXMuYWJzKCk7dmFyIHQ9aXRlcmF0aW9ucz09PXVuZGVmaW5lZD81Oml0ZXJhdGlvbnM7Zm9yKHZhciBhPVtdLGk9MDtpPHQ7aSsrKXthLnB1c2goYmlnSW50LnJhbmRCZXR3ZWVuKDIsbi5taW51cygyKSxybmcpKX1yZXR1cm4gbWlsbGVyUmFiaW5UZXN0KG4sYSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuaXNQcm9iYWJsZVByaW1lPVNtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNQcm9iYWJsZVByaW1lPUJpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJvYmFibGVQcmltZTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RJbnY9ZnVuY3Rpb24obil7dmFyIHQ9YmlnSW50Lnplcm8sbmV3VD1iaWdJbnQub25lLHI9cGFyc2VWYWx1ZShuKSxuZXdSPXRoaXMuYWJzKCkscSxsYXN0VCxsYXN0Ujt3aGlsZSghbmV3Ui5pc1plcm8oKSl7cT1yLmRpdmlkZShuZXdSKTtsYXN0VD10O2xhc3RSPXI7dD1uZXdUO3I9bmV3UjtuZXdUPWxhc3RULnN1YnRyYWN0KHEubXVsdGlwbHkobmV3VCkpO25ld1I9bGFzdFIuc3VidHJhY3QocS5tdWx0aXBseShuZXdSKSl9aWYoIXIuaXNVbml0KCkpdGhyb3cgbmV3IEVycm9yKHRoaXMudG9TdHJpbmcoKSsiIGFuZCAiK24udG9TdHJpbmcoKSsiIGFyZSBub3QgY28tcHJpbWUiKTtpZih0LmNvbXBhcmUoMCk9PT0tMSl7dD10LmFkZChuKX1pZih0aGlzLmlzTmVnYXRpdmUoKSl7cmV0dXJuIHQubmVnYXRlKCl9cmV0dXJuIHR9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubW9kSW52PVNtYWxsSW50ZWdlci5wcm90b3R5cGUubW9kSW52PUJpZ0ludGVnZXIucHJvdG90eXBlLm1vZEludjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIHZhbHVlPXRoaXMudmFsdWU7aWYodGhpcy5zaWduKXtyZXR1cm4gc3VidHJhY3RTbWFsbCh2YWx1ZSwxLHRoaXMuc2lnbil9cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZFNtYWxsKHZhbHVlLDEpLHRoaXMuc2lnbil9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUubmV4dD1mdW5jdGlvbigpe3ZhciB2YWx1ZT10aGlzLnZhbHVlO2lmKHZhbHVlKzE8TUFYX0lOVClyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2YWx1ZSsxKTtyZXR1cm4gbmV3IEJpZ0ludGVnZXIoTUFYX0lOVF9BUlIsZmFsc2UpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm5leHQ9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlK0JpZ0ludCgxKSl9O0JpZ0ludGVnZXIucHJvdG90eXBlLnByZXY9ZnVuY3Rpb24oKXt2YXIgdmFsdWU9dGhpcy52YWx1ZTtpZih0aGlzLnNpZ24pe3JldHVybiBuZXcgQmlnSW50ZWdlcihhZGRTbWFsbCh2YWx1ZSwxKSx0cnVlKX1yZXR1cm4gc3VidHJhY3RTbWFsbCh2YWx1ZSwxLHRoaXMuc2lnbil9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUucHJldj1mdW5jdGlvbigpe3ZhciB2YWx1ZT10aGlzLnZhbHVlO2lmKHZhbHVlLTE+LU1BWF9JTlQpcmV0dXJuIG5ldyBTbWFsbEludGVnZXIodmFsdWUtMSk7cmV0dXJuIG5ldyBCaWdJbnRlZ2VyKE1BWF9JTlRfQVJSLHRydWUpfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnByZXY9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE5hdGl2ZUJpZ0ludCh0aGlzLnZhbHVlLUJpZ0ludCgxKSl9O3ZhciBwb3dlcnNPZlR3bz1bMV07d2hpbGUoMipwb3dlcnNPZlR3b1twb3dlcnNPZlR3by5sZW5ndGgtMV08PUJBU0UpcG93ZXJzT2ZUd28ucHVzaCgyKnBvd2Vyc09mVHdvW3Bvd2Vyc09mVHdvLmxlbmd0aC0xXSk7dmFyIHBvd2VyczJMZW5ndGg9cG93ZXJzT2ZUd28ubGVuZ3RoLGhpZ2hlc3RQb3dlcjI9cG93ZXJzT2ZUd29bcG93ZXJzMkxlbmd0aC0xXTtmdW5jdGlvbiBzaGlmdF9pc1NtYWxsKG4pe3JldHVybiBNYXRoLmFicyhuKTw9QkFTRX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdExlZnQ9ZnVuY3Rpb24odil7dmFyIG49cGFyc2VWYWx1ZSh2KS50b0pTTnVtYmVyKCk7aWYoIXNoaWZ0X2lzU21hbGwobikpe3Rocm93IG5ldyBFcnJvcihTdHJpbmcobikrIiBpcyB0b28gbGFyZ2UgZm9yIHNoaWZ0aW5nLiIpfWlmKG48MClyZXR1cm4gdGhpcy5zaGlmdFJpZ2h0KC1uKTt2YXIgcmVzdWx0PXRoaXM7aWYocmVzdWx0LmlzWmVybygpKXJldHVybiByZXN1bHQ7d2hpbGUobj49cG93ZXJzMkxlbmd0aCl7cmVzdWx0PXJlc3VsdC5tdWx0aXBseShoaWdoZXN0UG93ZXIyKTtuLT1wb3dlcnMyTGVuZ3RoLTF9cmV0dXJuIHJlc3VsdC5tdWx0aXBseShwb3dlcnNPZlR3b1tuXSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuc2hpZnRMZWZ0PVNtYWxsSW50ZWdlci5wcm90b3R5cGUuc2hpZnRMZWZ0PUJpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0TGVmdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdFJpZ2h0PWZ1bmN0aW9uKHYpe3ZhciByZW1RdW87dmFyIG49cGFyc2VWYWx1ZSh2KS50b0pTTnVtYmVyKCk7aWYoIXNoaWZ0X2lzU21hbGwobikpe3Rocm93IG5ldyBFcnJvcihTdHJpbmcobikrIiBpcyB0b28gbGFyZ2UgZm9yIHNoaWZ0aW5nLiIpfWlmKG48MClyZXR1cm4gdGhpcy5zaGlmdExlZnQoLW4pO3ZhciByZXN1bHQ9dGhpczt3aGlsZShuPj1wb3dlcnMyTGVuZ3RoKXtpZihyZXN1bHQuaXNaZXJvKCl8fHJlc3VsdC5pc05lZ2F0aXZlKCkmJnJlc3VsdC5pc1VuaXQoKSlyZXR1cm4gcmVzdWx0O3JlbVF1bz1kaXZNb2RBbnkocmVzdWx0LGhpZ2hlc3RQb3dlcjIpO3Jlc3VsdD1yZW1RdW9bMV0uaXNOZWdhdGl2ZSgpP3JlbVF1b1swXS5wcmV2KCk6cmVtUXVvWzBdO24tPXBvd2VyczJMZW5ndGgtMX1yZW1RdW89ZGl2TW9kQW55KHJlc3VsdCxwb3dlcnNPZlR3b1tuXSk7cmV0dXJuIHJlbVF1b1sxXS5pc05lZ2F0aXZlKCk/cmVtUXVvWzBdLnByZXYoKTpyZW1RdW9bMF19O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUuc2hpZnRSaWdodD1TbWFsbEludGVnZXIucHJvdG90eXBlLnNoaWZ0UmlnaHQ9QmlnSW50ZWdlci5wcm90b3R5cGUuc2hpZnRSaWdodDtmdW5jdGlvbiBiaXR3aXNlKHgseSxmbil7eT1wYXJzZVZhbHVlKHkpO3ZhciB4U2lnbj14LmlzTmVnYXRpdmUoKSx5U2lnbj15LmlzTmVnYXRpdmUoKTt2YXIgeFJlbT14U2lnbj94Lm5vdCgpOngseVJlbT15U2lnbj95Lm5vdCgpOnk7dmFyIHhEaWdpdD0wLHlEaWdpdD0wO3ZhciB4RGl2TW9kPW51bGwseURpdk1vZD1udWxsO3ZhciByZXN1bHQ9W107d2hpbGUoIXhSZW0uaXNaZXJvKCl8fCF5UmVtLmlzWmVybygpKXt4RGl2TW9kPWRpdk1vZEFueSh4UmVtLGhpZ2hlc3RQb3dlcjIpO3hEaWdpdD14RGl2TW9kWzFdLnRvSlNOdW1iZXIoKTtpZih4U2lnbil7eERpZ2l0PWhpZ2hlc3RQb3dlcjItMS14RGlnaXR9eURpdk1vZD1kaXZNb2RBbnkoeVJlbSxoaWdoZXN0UG93ZXIyKTt5RGlnaXQ9eURpdk1vZFsxXS50b0pTTnVtYmVyKCk7aWYoeVNpZ24pe3lEaWdpdD1oaWdoZXN0UG93ZXIyLTEteURpZ2l0fXhSZW09eERpdk1vZFswXTt5UmVtPXlEaXZNb2RbMF07cmVzdWx0LnB1c2goZm4oeERpZ2l0LHlEaWdpdCkpfXZhciBzdW09Zm4oeFNpZ24/MTowLHlTaWduPzE6MCkhPT0wP2JpZ0ludCgtMSk6YmlnSW50KDApO2Zvcih2YXIgaT1yZXN1bHQubGVuZ3RoLTE7aT49MDtpLT0xKXtzdW09c3VtLm11bHRpcGx5KGhpZ2hlc3RQb3dlcjIpLmFkZChiaWdJbnQocmVzdWx0W2ldKSl9cmV0dXJuIHN1bX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3Q9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5uZWdhdGUoKS5wcmV2KCl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUubm90PVNtYWxsSW50ZWdlci5wcm90b3R5cGUubm90PUJpZ0ludGVnZXIucHJvdG90eXBlLm5vdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5hbmQ9ZnVuY3Rpb24obil7cmV0dXJuIGJpdHdpc2UodGhpcyxuLGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEmYn0pfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLmFuZD1TbWFsbEludGVnZXIucHJvdG90eXBlLmFuZD1CaWdJbnRlZ2VyLnByb3RvdHlwZS5hbmQ7QmlnSW50ZWdlci5wcm90b3R5cGUub3I9ZnVuY3Rpb24obil7cmV0dXJuIGJpdHdpc2UodGhpcyxuLGZ1bmN0aW9uKGEsYil7cmV0dXJuIGF8Yn0pfTtOYXRpdmVCaWdJbnQucHJvdG90eXBlLm9yPVNtYWxsSW50ZWdlci5wcm90b3R5cGUub3I9QmlnSW50ZWdlci5wcm90b3R5cGUub3I7QmlnSW50ZWdlci5wcm90b3R5cGUueG9yPWZ1bmN0aW9uKG4pe3JldHVybiBiaXR3aXNlKHRoaXMsbixmdW5jdGlvbihhLGIpe3JldHVybiBhXmJ9KX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS54b3I9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS54b3I9QmlnSW50ZWdlci5wcm90b3R5cGUueG9yO3ZhciBMT0JNQVNLX0k9MTw8MzAsTE9CTUFTS19CST0oQkFTRSYtQkFTRSkqKEJBU0UmLUJBU0UpfExPQk1BU0tfSTtmdW5jdGlvbiByb3VnaExPQihuKXt2YXIgdj1uLnZhbHVlLHg9dHlwZW9mIHY9PT0ibnVtYmVyIj92fExPQk1BU0tfSTp0eXBlb2Ygdj09PSJiaWdpbnQiP3Z8QmlnSW50KExPQk1BU0tfSSk6dlswXSt2WzFdKkJBU0V8TE9CTUFTS19CSTtyZXR1cm4geCYteH1mdW5jdGlvbiBpbnRlZ2VyTG9nYXJpdGhtKHZhbHVlLGJhc2Upe2lmKGJhc2UuY29tcGFyZVRvKHZhbHVlKTw9MCl7dmFyIHRtcD1pbnRlZ2VyTG9nYXJpdGhtKHZhbHVlLGJhc2Uuc3F1YXJlKGJhc2UpKTt2YXIgcD10bXAucDt2YXIgZT10bXAuZTt2YXIgdD1wLm11bHRpcGx5KGJhc2UpO3JldHVybiB0LmNvbXBhcmVUbyh2YWx1ZSk8PTA/e3A6dCxlOmUqMisxfTp7cDpwLGU6ZSoyfX1yZXR1cm57cDpiaWdJbnQoMSksZTowfX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5iaXRMZW5ndGg9ZnVuY3Rpb24oKXt2YXIgbj10aGlzO2lmKG4uY29tcGFyZVRvKGJpZ0ludCgwKSk8MCl7bj1uLm5lZ2F0ZSgpLnN1YnRyYWN0KGJpZ0ludCgxKSl9aWYobi5jb21wYXJlVG8oYmlnSW50KDApKT09PTApe3JldHVybiBiaWdJbnQoMCl9cmV0dXJuIGJpZ0ludChpbnRlZ2VyTG9nYXJpdGhtKG4sYmlnSW50KDIpKS5lKS5hZGQoYmlnSW50KDEpKX07TmF0aXZlQmlnSW50LnByb3RvdHlwZS5iaXRMZW5ndGg9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS5iaXRMZW5ndGg9QmlnSW50ZWdlci5wcm90b3R5cGUuYml0TGVuZ3RoO2Z1bmN0aW9uIG1heChhLGIpe2E9cGFyc2VWYWx1ZShhKTtiPXBhcnNlVmFsdWUoYik7cmV0dXJuIGEuZ3JlYXRlcihiKT9hOmJ9ZnVuY3Rpb24gbWluKGEsYil7YT1wYXJzZVZhbHVlKGEpO2I9cGFyc2VWYWx1ZShiKTtyZXR1cm4gYS5sZXNzZXIoYik/YTpifWZ1bmN0aW9uIGdjZChhLGIpe2E9cGFyc2VWYWx1ZShhKS5hYnMoKTtiPXBhcnNlVmFsdWUoYikuYWJzKCk7aWYoYS5lcXVhbHMoYikpcmV0dXJuIGE7aWYoYS5pc1plcm8oKSlyZXR1cm4gYjtpZihiLmlzWmVybygpKXJldHVybiBhO3ZhciBjPUludGVnZXJbMV0sZCx0O3doaWxlKGEuaXNFdmVuKCkmJmIuaXNFdmVuKCkpe2Q9bWluKHJvdWdoTE9CKGEpLHJvdWdoTE9CKGIpKTthPWEuZGl2aWRlKGQpO2I9Yi5kaXZpZGUoZCk7Yz1jLm11bHRpcGx5KGQpfXdoaWxlKGEuaXNFdmVuKCkpe2E9YS5kaXZpZGUocm91Z2hMT0IoYSkpfWRve3doaWxlKGIuaXNFdmVuKCkpe2I9Yi5kaXZpZGUocm91Z2hMT0IoYikpfWlmKGEuZ3JlYXRlcihiKSl7dD1iO2I9YTthPXR9Yj1iLnN1YnRyYWN0KGEpfXdoaWxlKCFiLmlzWmVybygpKTtyZXR1cm4gYy5pc1VuaXQoKT9hOmEubXVsdGlwbHkoYyl9ZnVuY3Rpb24gbGNtKGEsYil7YT1wYXJzZVZhbHVlKGEpLmFicygpO2I9cGFyc2VWYWx1ZShiKS5hYnMoKTtyZXR1cm4gYS5kaXZpZGUoZ2NkKGEsYikpLm11bHRpcGx5KGIpfWZ1bmN0aW9uIHJhbmRCZXR3ZWVuKGEsYixybmcpe2E9cGFyc2VWYWx1ZShhKTtiPXBhcnNlVmFsdWUoYik7dmFyIHVzZWRSTkc9cm5nfHxNYXRoLnJhbmRvbTt2YXIgbG93PW1pbihhLGIpLGhpZ2g9bWF4KGEsYik7dmFyIHJhbmdlPWhpZ2guc3VidHJhY3QobG93KS5hZGQoMSk7aWYocmFuZ2UuaXNTbWFsbClyZXR1cm4gbG93LmFkZChNYXRoLmZsb29yKHVzZWRSTkcoKSpyYW5nZSkpO3ZhciBkaWdpdHM9dG9CYXNlKHJhbmdlLEJBU0UpLnZhbHVlO3ZhciByZXN1bHQ9W10scmVzdHJpY3RlZD10cnVlO2Zvcih2YXIgaT0wO2k8ZGlnaXRzLmxlbmd0aDtpKyspe3ZhciB0b3A9cmVzdHJpY3RlZD9kaWdpdHNbaV06QkFTRTt2YXIgZGlnaXQ9dHJ1bmNhdGUodXNlZFJORygpKnRvcCk7cmVzdWx0LnB1c2goZGlnaXQpO2lmKGRpZ2l0PHRvcClyZXN0cmljdGVkPWZhbHNlfXJldHVybiBsb3cuYWRkKEludGVnZXIuZnJvbUFycmF5KHJlc3VsdCxCQVNFLGZhbHNlKSl9dmFyIHBhcnNlQmFzZT1mdW5jdGlvbih0ZXh0LGJhc2UsYWxwaGFiZXQsY2FzZVNlbnNpdGl2ZSl7YWxwaGFiZXQ9YWxwaGFiZXR8fERFRkFVTFRfQUxQSEFCRVQ7dGV4dD1TdHJpbmcodGV4dCk7aWYoIWNhc2VTZW5zaXRpdmUpe3RleHQ9dGV4dC50b0xvd2VyQ2FzZSgpO2FscGhhYmV0PWFscGhhYmV0LnRvTG93ZXJDYXNlKCl9dmFyIGxlbmd0aD10ZXh0Lmxlbmd0aDt2YXIgaTt2YXIgYWJzQmFzZT1NYXRoLmFicyhiYXNlKTt2YXIgYWxwaGFiZXRWYWx1ZXM9e307Zm9yKGk9MDtpPGFscGhhYmV0Lmxlbmd0aDtpKyspe2FscGhhYmV0VmFsdWVzW2FscGhhYmV0W2ldXT1pfWZvcihpPTA7aTxsZW5ndGg7aSsrKXt2YXIgYz10ZXh0W2ldO2lmKGM9PT0iLSIpY29udGludWU7aWYoYyBpbiBhbHBoYWJldFZhbHVlcyl7aWYoYWxwaGFiZXRWYWx1ZXNbY10+PWFic0Jhc2Upe2lmKGM9PT0iMSImJmFic0Jhc2U9PT0xKWNvbnRpbnVlO3Rocm93IG5ldyBFcnJvcihjKyIgaXMgbm90IGEgdmFsaWQgZGlnaXQgaW4gYmFzZSAiK2Jhc2UrIi4iKX19fWJhc2U9cGFyc2VWYWx1ZShiYXNlKTt2YXIgZGlnaXRzPVtdO3ZhciBpc05lZ2F0aXZlPXRleHRbMF09PT0iLSI7Zm9yKGk9aXNOZWdhdGl2ZT8xOjA7aTx0ZXh0Lmxlbmd0aDtpKyspe3ZhciBjPXRleHRbaV07aWYoYyBpbiBhbHBoYWJldFZhbHVlcylkaWdpdHMucHVzaChwYXJzZVZhbHVlKGFscGhhYmV0VmFsdWVzW2NdKSk7ZWxzZSBpZihjPT09IjwiKXt2YXIgc3RhcnQ9aTtkb3tpKyt9d2hpbGUodGV4dFtpXSE9PSI+IiYmaTx0ZXh0Lmxlbmd0aCk7ZGlnaXRzLnB1c2gocGFyc2VWYWx1ZSh0ZXh0LnNsaWNlKHN0YXJ0KzEsaSkpKX1lbHNlIHRocm93IG5ldyBFcnJvcihjKyIgaXMgbm90IGEgdmFsaWQgY2hhcmFjdGVyIil9cmV0dXJuIHBhcnNlQmFzZUZyb21BcnJheShkaWdpdHMsYmFzZSxpc05lZ2F0aXZlKX07ZnVuY3Rpb24gcGFyc2VCYXNlRnJvbUFycmF5KGRpZ2l0cyxiYXNlLGlzTmVnYXRpdmUpe3ZhciB2YWw9SW50ZWdlclswXSxwb3c9SW50ZWdlclsxXSxpO2ZvcihpPWRpZ2l0cy5sZW5ndGgtMTtpPj0wO2ktLSl7dmFsPXZhbC5hZGQoZGlnaXRzW2ldLnRpbWVzKHBvdykpO3Bvdz1wb3cudGltZXMoYmFzZSl9cmV0dXJuIGlzTmVnYXRpdmU/dmFsLm5lZ2F0ZSgpOnZhbH1mdW5jdGlvbiBzdHJpbmdpZnkoZGlnaXQsYWxwaGFiZXQpe2FscGhhYmV0PWFscGhhYmV0fHxERUZBVUxUX0FMUEhBQkVUO2lmKGRpZ2l0PGFscGhhYmV0Lmxlbmd0aCl7cmV0dXJuIGFscGhhYmV0W2RpZ2l0XX1yZXR1cm4iPCIrZGlnaXQrIj4ifWZ1bmN0aW9uIHRvQmFzZShuLGJhc2Upe2Jhc2U9YmlnSW50KGJhc2UpO2lmKGJhc2UuaXNaZXJvKCkpe2lmKG4uaXNaZXJvKCkpcmV0dXJue3ZhbHVlOlswXSxpc05lZ2F0aXZlOmZhbHNlfTt0aHJvdyBuZXcgRXJyb3IoIkNhbm5vdCBjb252ZXJ0IG5vbnplcm8gbnVtYmVycyB0byBiYXNlIDAuIil9aWYoYmFzZS5lcXVhbHMoLTEpKXtpZihuLmlzWmVybygpKXJldHVybnt2YWx1ZTpbMF0saXNOZWdhdGl2ZTpmYWxzZX07aWYobi5pc05lZ2F0aXZlKCkpcmV0dXJue3ZhbHVlOltdLmNvbmNhdC5hcHBseShbXSxBcnJheS5hcHBseShudWxsLEFycmF5KC1uLnRvSlNOdW1iZXIoKSkpLm1hcChBcnJheS5wcm90b3R5cGUudmFsdWVPZixbMSwwXSkpLGlzTmVnYXRpdmU6ZmFsc2V9O3ZhciBhcnI9QXJyYXkuYXBwbHkobnVsbCxBcnJheShuLnRvSlNOdW1iZXIoKS0xKSkubWFwKEFycmF5LnByb3RvdHlwZS52YWx1ZU9mLFswLDFdKTthcnIudW5zaGlmdChbMV0pO3JldHVybnt2YWx1ZTpbXS5jb25jYXQuYXBwbHkoW10sYXJyKSxpc05lZ2F0aXZlOmZhbHNlfX12YXIgbmVnPWZhbHNlO2lmKG4uaXNOZWdhdGl2ZSgpJiZiYXNlLmlzUG9zaXRpdmUoKSl7bmVnPXRydWU7bj1uLmFicygpfWlmKGJhc2UuaXNVbml0KCkpe2lmKG4uaXNaZXJvKCkpcmV0dXJue3ZhbHVlOlswXSxpc05lZ2F0aXZlOmZhbHNlfTtyZXR1cm57dmFsdWU6QXJyYXkuYXBwbHkobnVsbCxBcnJheShuLnRvSlNOdW1iZXIoKSkpLm1hcChOdW1iZXIucHJvdG90eXBlLnZhbHVlT2YsMSksaXNOZWdhdGl2ZTpuZWd9fXZhciBvdXQ9W107dmFyIGxlZnQ9bixkaXZtb2Q7d2hpbGUobGVmdC5pc05lZ2F0aXZlKCl8fGxlZnQuY29tcGFyZUFicyhiYXNlKT49MCl7ZGl2bW9kPWxlZnQuZGl2bW9kKGJhc2UpO2xlZnQ9ZGl2bW9kLnF1b3RpZW50O3ZhciBkaWdpdD1kaXZtb2QucmVtYWluZGVyO2lmKGRpZ2l0LmlzTmVnYXRpdmUoKSl7ZGlnaXQ9YmFzZS5taW51cyhkaWdpdCkuYWJzKCk7bGVmdD1sZWZ0Lm5leHQoKX1vdXQucHVzaChkaWdpdC50b0pTTnVtYmVyKCkpfW91dC5wdXNoKGxlZnQudG9KU051bWJlcigpKTtyZXR1cm57dmFsdWU6b3V0LnJldmVyc2UoKSxpc05lZ2F0aXZlOm5lZ319ZnVuY3Rpb24gdG9CYXNlU3RyaW5nKG4sYmFzZSxhbHBoYWJldCl7dmFyIGFycj10b0Jhc2UobixiYXNlKTtyZXR1cm4oYXJyLmlzTmVnYXRpdmU/Ii0iOiIiKSthcnIudmFsdWUubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBzdHJpbmdpZnkoeCxhbHBoYWJldCl9KS5qb2luKCIiKX1CaWdJbnRlZ2VyLnByb3RvdHlwZS50b0FycmF5PWZ1bmN0aW9uKHJhZGl4KXtyZXR1cm4gdG9CYXNlKHRoaXMscmFkaXgpfTtTbWFsbEludGVnZXIucHJvdG90eXBlLnRvQXJyYXk9ZnVuY3Rpb24ocmFkaXgpe3JldHVybiB0b0Jhc2UodGhpcyxyYWRpeCl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUudG9BcnJheT1mdW5jdGlvbihyYWRpeCl7cmV0dXJuIHRvQmFzZSh0aGlzLHJhZGl4KX07QmlnSW50ZWdlci5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24ocmFkaXgsYWxwaGFiZXQpe2lmKHJhZGl4PT09dW5kZWZpbmVkKXJhZGl4PTEwO2lmKHJhZGl4IT09MTApcmV0dXJuIHRvQmFzZVN0cmluZyh0aGlzLHJhZGl4LGFscGhhYmV0KTt2YXIgdj10aGlzLnZhbHVlLGw9di5sZW5ndGgsc3RyPVN0cmluZyh2Wy0tbF0pLHplcm9zPSIwMDAwMDAwIixkaWdpdDt3aGlsZSgtLWw+PTApe2RpZ2l0PVN0cmluZyh2W2xdKTtzdHIrPXplcm9zLnNsaWNlKGRpZ2l0Lmxlbmd0aCkrZGlnaXR9dmFyIHNpZ249dGhpcy5zaWduPyItIjoiIjtyZXR1cm4gc2lnbitzdHJ9O1NtYWxsSW50ZWdlci5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24ocmFkaXgsYWxwaGFiZXQpe2lmKHJhZGl4PT09dW5kZWZpbmVkKXJhZGl4PTEwO2lmKHJhZGl4IT0xMClyZXR1cm4gdG9CYXNlU3RyaW5nKHRoaXMscmFkaXgsYWxwaGFiZXQpO3JldHVybiBTdHJpbmcodGhpcy52YWx1ZSl9O05hdGl2ZUJpZ0ludC5wcm90b3R5cGUudG9TdHJpbmc9U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b1N0cmluZztOYXRpdmVCaWdJbnQucHJvdG90eXBlLnRvSlNPTj1CaWdJbnRlZ2VyLnByb3RvdHlwZS50b0pTT049U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b0pTT049ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1N0cmluZygpfTtCaWdJbnRlZ2VyLnByb3RvdHlwZS52YWx1ZU9mPWZ1bmN0aW9uKCl7cmV0dXJuIHBhcnNlSW50KHRoaXMudG9TdHJpbmcoKSwxMCl9O0JpZ0ludGVnZXIucHJvdG90eXBlLnRvSlNOdW1iZXI9QmlnSW50ZWdlci5wcm90b3R5cGUudmFsdWVPZjtTbWFsbEludGVnZXIucHJvdG90eXBlLnZhbHVlT2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy52YWx1ZX07U21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b0pTTnVtYmVyPVNtYWxsSW50ZWdlci5wcm90b3R5cGUudmFsdWVPZjtOYXRpdmVCaWdJbnQucHJvdG90eXBlLnZhbHVlT2Y9TmF0aXZlQmlnSW50LnByb3RvdHlwZS50b0pTTnVtYmVyPWZ1bmN0aW9uKCl7cmV0dXJuIHBhcnNlSW50KHRoaXMudG9TdHJpbmcoKSwxMCl9O2Z1bmN0aW9uIHBhcnNlU3RyaW5nVmFsdWUodil7aWYoaXNQcmVjaXNlKCt2KSl7dmFyIHg9K3Y7aWYoeD09PXRydW5jYXRlKHgpKXJldHVybiBzdXBwb3J0c05hdGl2ZUJpZ0ludD9uZXcgTmF0aXZlQmlnSW50KEJpZ0ludCh4KSk6bmV3IFNtYWxsSW50ZWdlcih4KTt0aHJvdyBuZXcgRXJyb3IoIkludmFsaWQgaW50ZWdlcjogIit2KX12YXIgc2lnbj12WzBdPT09Ii0iO2lmKHNpZ24pdj12LnNsaWNlKDEpO3ZhciBzcGxpdD12LnNwbGl0KC9lL2kpO2lmKHNwbGl0Lmxlbmd0aD4yKXRocm93IG5ldyBFcnJvcigiSW52YWxpZCBpbnRlZ2VyOiAiK3NwbGl0LmpvaW4oImUiKSk7aWYoc3BsaXQubGVuZ3RoPT09Mil7dmFyIGV4cD1zcGxpdFsxXTtpZihleHBbMF09PT0iKyIpZXhwPWV4cC5zbGljZSgxKTtleHA9K2V4cDtpZihleHAhPT10cnVuY2F0ZShleHApfHwhaXNQcmVjaXNlKGV4cCkpdGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIGludGVnZXI6ICIrZXhwKyIgaXMgbm90IGEgdmFsaWQgZXhwb25lbnQuIik7dmFyIHRleHQ9c3BsaXRbMF07dmFyIGRlY2ltYWxQbGFjZT10ZXh0LmluZGV4T2YoIi4iKTtpZihkZWNpbWFsUGxhY2U+PTApe2V4cC09dGV4dC5sZW5ndGgtZGVjaW1hbFBsYWNlLTE7dGV4dD10ZXh0LnNsaWNlKDAsZGVjaW1hbFBsYWNlKSt0ZXh0LnNsaWNlKGRlY2ltYWxQbGFjZSsxKX1pZihleHA8MCl0aHJvdyBuZXcgRXJyb3IoIkNhbm5vdCBpbmNsdWRlIG5lZ2F0aXZlIGV4cG9uZW50IHBhcnQgZm9yIGludGVnZXJzIik7dGV4dCs9bmV3IEFycmF5KGV4cCsxKS5qb2luKCIwIik7dj10ZXh0fXZhciBpc1ZhbGlkPS9eKFswLTldWzAtOV0qKSQvLnRlc3Qodik7aWYoIWlzVmFsaWQpdGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIGludGVnZXI6ICIrdik7aWYoc3VwcG9ydHNOYXRpdmVCaWdJbnQpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KEJpZ0ludChzaWduPyItIit2OnYpKX12YXIgcj1bXSxtYXg9di5sZW5ndGgsbD1MT0dfQkFTRSxtaW49bWF4LWw7d2hpbGUobWF4PjApe3IucHVzaCgrdi5zbGljZShtaW4sbWF4KSk7bWluLT1sO2lmKG1pbjwwKW1pbj0wO21heC09bH10cmltKHIpO3JldHVybiBuZXcgQmlnSW50ZWdlcihyLHNpZ24pfWZ1bmN0aW9uIHBhcnNlTnVtYmVyVmFsdWUodil7aWYoc3VwcG9ydHNOYXRpdmVCaWdJbnQpe3JldHVybiBuZXcgTmF0aXZlQmlnSW50KEJpZ0ludCh2KSl9aWYoaXNQcmVjaXNlKHYpKXtpZih2IT09dHJ1bmNhdGUodikpdGhyb3cgbmV3IEVycm9yKHYrIiBpcyBub3QgYW4gaW50ZWdlci4iKTtyZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2KX1yZXR1cm4gcGFyc2VTdHJpbmdWYWx1ZSh2LnRvU3RyaW5nKCkpfWZ1bmN0aW9uIHBhcnNlVmFsdWUodil7aWYodHlwZW9mIHY9PT0ibnVtYmVyIil7cmV0dXJuIHBhcnNlTnVtYmVyVmFsdWUodil9aWYodHlwZW9mIHY9PT0ic3RyaW5nIil7cmV0dXJuIHBhcnNlU3RyaW5nVmFsdWUodil9aWYodHlwZW9mIHY9PT0iYmlnaW50Iil7cmV0dXJuIG5ldyBOYXRpdmVCaWdJbnQodil9cmV0dXJuIHZ9Zm9yKHZhciBpPTA7aTwxZTM7aSsrKXtJbnRlZ2VyW2ldPXBhcnNlVmFsdWUoaSk7aWYoaT4wKUludGVnZXJbLWldPXBhcnNlVmFsdWUoLWkpfUludGVnZXIub25lPUludGVnZXJbMV07SW50ZWdlci56ZXJvPUludGVnZXJbMF07SW50ZWdlci5taW51c09uZT1JbnRlZ2VyWy0xXTtJbnRlZ2VyLm1heD1tYXg7SW50ZWdlci5taW49bWluO0ludGVnZXIuZ2NkPWdjZDtJbnRlZ2VyLmxjbT1sY207SW50ZWdlci5pc0luc3RhbmNlPWZ1bmN0aW9uKHgpe3JldHVybiB4IGluc3RhbmNlb2YgQmlnSW50ZWdlcnx8eCBpbnN0YW5jZW9mIFNtYWxsSW50ZWdlcnx8eCBpbnN0YW5jZW9mIE5hdGl2ZUJpZ0ludH07SW50ZWdlci5yYW5kQmV0d2Vlbj1yYW5kQmV0d2VlbjtJbnRlZ2VyLmZyb21BcnJheT1mdW5jdGlvbihkaWdpdHMsYmFzZSxpc05lZ2F0aXZlKXtyZXR1cm4gcGFyc2VCYXNlRnJvbUFycmF5KGRpZ2l0cy5tYXAocGFyc2VWYWx1ZSkscGFyc2VWYWx1ZShiYXNlfHwxMCksaXNOZWdhdGl2ZSl9O3JldHVybiBJbnRlZ2VyfSgpO2lmKHR5cGVvZiBtb2R1bGUhPT0idW5kZWZpbmVkIiYmbW9kdWxlLmhhc093blByb3BlcnR5KCJleHBvcnRzIikpe21vZHVsZS5leHBvcnRzPWJpZ0ludH1pZih0eXBlb2YgZGVmaW5lPT09ImZ1bmN0aW9uIiYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIGJpZ0ludH0pfX0se31dLDI2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt9LHt9XSwyNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7InVzZSBzdHJpY3QiO3ZhciBiYXNlNjQ9cmVxdWlyZSgiYmFzZTY0LWpzIik7dmFyIGllZWU3NTQ9cmVxdWlyZSgiaWVlZTc1NCIpO3ZhciBjdXN0b21JbnNwZWN0U3ltYm9sPXR5cGVvZiBTeW1ib2w9PT0iZnVuY3Rpb24iJiZ0eXBlb2YgU3ltYm9sLmZvcj09PSJmdW5jdGlvbiI/U3ltYm9sLmZvcigibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b20iKTpudWxsO2V4cG9ydHMuQnVmZmVyPUJ1ZmZlcjtleHBvcnRzLlNsb3dCdWZmZXI9U2xvd0J1ZmZlcjtleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTPTUwO3ZhciBLX01BWF9MRU5HVEg9MjE0NzQ4MzY0NztleHBvcnRzLmtNYXhMZW5ndGg9S19NQVhfTEVOR1RIO0J1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUPXR5cGVkQXJyYXlTdXBwb3J0KCk7aWYoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUJiZ0eXBlb2YgY29uc29sZSE9PSJ1bmRlZmluZWQiJiZ0eXBlb2YgY29uc29sZS5lcnJvcj09PSJmdW5jdGlvbiIpe2NvbnNvbGUuZXJyb3IoIlRoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAiKyJgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LiIpfWZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0KCl7dHJ5e3ZhciBhcnI9bmV3IFVpbnQ4QXJyYXkoMSk7dmFyIHByb3RvPXtmb286ZnVuY3Rpb24oKXtyZXR1cm4gNDJ9fTtPYmplY3Quc2V0UHJvdG90eXBlT2YocHJvdG8sVWludDhBcnJheS5wcm90b3R5cGUpO09iamVjdC5zZXRQcm90b3R5cGVPZihhcnIscHJvdG8pO3JldHVybiBhcnIuZm9vKCk9PT00Mn1jYXRjaChlKXtyZXR1cm4gZmFsc2V9fU9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCJwYXJlbnQiLHtlbnVtZXJhYmxlOnRydWUsZ2V0OmZ1bmN0aW9uKCl7aWYoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSlyZXR1cm4gdW5kZWZpbmVkO3JldHVybiB0aGlzLmJ1ZmZlcn19KTtPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwib2Zmc2V0Iix7ZW51bWVyYWJsZTp0cnVlLGdldDpmdW5jdGlvbigpe2lmKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpcmV0dXJuIHVuZGVmaW5lZDtyZXR1cm4gdGhpcy5ieXRlT2Zmc2V0fX0pO2Z1bmN0aW9uIGNyZWF0ZUJ1ZmZlcihsZW5ndGgpe2lmKGxlbmd0aD5LX01BWF9MRU5HVEgpe3Rocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgIicrbGVuZ3RoKyciIGlzIGludmFsaWQgZm9yIG9wdGlvbiAic2l6ZSInKX12YXIgYnVmPW5ldyBVaW50OEFycmF5KGxlbmd0aCk7T2JqZWN0LnNldFByb3RvdHlwZU9mKGJ1ZixCdWZmZXIucHJvdG90eXBlKTtyZXR1cm4gYnVmfWZ1bmN0aW9uIEJ1ZmZlcihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiBhcmc9PT0ibnVtYmVyIil7aWYodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQ9PT0ic3RyaW5nIil7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJzdHJpbmciIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJyl9cmV0dXJuIGFsbG9jVW5zYWZlKGFyZyl9cmV0dXJuIGZyb20oYXJnLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX1pZih0eXBlb2YgU3ltYm9sIT09InVuZGVmaW5lZCImJlN5bWJvbC5zcGVjaWVzIT1udWxsJiZCdWZmZXJbU3ltYm9sLnNwZWNpZXNdPT09QnVmZmVyKXtPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLFN5bWJvbC5zcGVjaWVzLHt2YWx1ZTpudWxsLGNvbmZpZ3VyYWJsZTp0cnVlLGVudW1lcmFibGU6ZmFsc2Usd3JpdGFibGU6ZmFsc2V9KX1CdWZmZXIucG9vbFNpemU9ODE5MjtmdW5jdGlvbiBmcm9tKHZhbHVlLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKXtpZih0eXBlb2YgdmFsdWU9PT0ic3RyaW5nIil7cmV0dXJuIGZyb21TdHJpbmcodmFsdWUsZW5jb2RpbmdPck9mZnNldCl9aWYoQXJyYXlCdWZmZXIuaXNWaWV3KHZhbHVlKSl7cmV0dXJuIGZyb21BcnJheUxpa2UodmFsdWUpfWlmKHZhbHVlPT1udWxsKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAiKyJvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAiK3R5cGVvZiB2YWx1ZSl9aWYoaXNJbnN0YW5jZSh2YWx1ZSxBcnJheUJ1ZmZlcil8fHZhbHVlJiZpc0luc3RhbmNlKHZhbHVlLmJ1ZmZlcixBcnJheUJ1ZmZlcikpe3JldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfWlmKHR5cGVvZiB2YWx1ZT09PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgInZhbHVlIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBvZiB0eXBlIG51bWJlci4gUmVjZWl2ZWQgdHlwZSBudW1iZXInKX12YXIgdmFsdWVPZj12YWx1ZS52YWx1ZU9mJiZ2YWx1ZS52YWx1ZU9mKCk7aWYodmFsdWVPZiE9bnVsbCYmdmFsdWVPZiE9PXZhbHVlKXtyZXR1cm4gQnVmZmVyLmZyb20odmFsdWVPZixlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl9dmFyIGI9ZnJvbU9iamVjdCh2YWx1ZSk7aWYoYilyZXR1cm4gYjtpZih0eXBlb2YgU3ltYm9sIT09InVuZGVmaW5lZCImJlN5bWJvbC50b1ByaW1pdGl2ZSE9bnVsbCYmdHlwZW9mIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV09PT0iZnVuY3Rpb24iKXtyZXR1cm4gQnVmZmVyLmZyb20odmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSgic3RyaW5nIiksZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfXRocm93IG5ldyBUeXBlRXJyb3IoIlRoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICIrIm9yIEFycmF5LWxpa2UgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICIrdHlwZW9mIHZhbHVlKX1CdWZmZXIuZnJvbT1mdW5jdGlvbih2YWx1ZSxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl7cmV0dXJuIGZyb20odmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfTtPYmplY3Quc2V0UHJvdG90eXBlT2YoQnVmZmVyLnByb3RvdHlwZSxVaW50OEFycmF5LnByb3RvdHlwZSk7T2JqZWN0LnNldFByb3RvdHlwZU9mKEJ1ZmZlcixVaW50OEFycmF5KTtmdW5jdGlvbiBhc3NlcnRTaXplKHNpemUpe2lmKHR5cGVvZiBzaXplIT09Im51bWJlciIpe3Rocm93IG5ldyBUeXBlRXJyb3IoJyJzaXplIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyJyl9ZWxzZSBpZihzaXplPDApe3Rocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgIicrc2l6ZSsnIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gInNpemUiJyl9fWZ1bmN0aW9uIGFsbG9jKHNpemUsZmlsbCxlbmNvZGluZyl7YXNzZXJ0U2l6ZShzaXplKTtpZihzaXplPD0wKXtyZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpfWlmKGZpbGwhPT11bmRlZmluZWQpe3JldHVybiB0eXBlb2YgZW5jb2Rpbmc9PT0ic3RyaW5nIj9jcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLGVuY29kaW5nKTpjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsKX1yZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpfUJ1ZmZlci5hbGxvYz1mdW5jdGlvbihzaXplLGZpbGwsZW5jb2Rpbmcpe3JldHVybiBhbGxvYyhzaXplLGZpbGwsZW5jb2RpbmcpfTtmdW5jdGlvbiBhbGxvY1Vuc2FmZShzaXplKXthc3NlcnRTaXplKHNpemUpO3JldHVybiBjcmVhdGVCdWZmZXIoc2l6ZTwwPzA6Y2hlY2tlZChzaXplKXwwKX1CdWZmZXIuYWxsb2NVbnNhZmU9ZnVuY3Rpb24oc2l6ZSl7cmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpfTtCdWZmZXIuYWxsb2NVbnNhZmVTbG93PWZ1bmN0aW9uKHNpemUpe3JldHVybiBhbGxvY1Vuc2FmZShzaXplKX07ZnVuY3Rpb24gZnJvbVN0cmluZyhzdHJpbmcsZW5jb2Rpbmcpe2lmKHR5cGVvZiBlbmNvZGluZyE9PSJzdHJpbmcifHxlbmNvZGluZz09PSIiKXtlbmNvZGluZz0idXRmOCJ9aWYoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSl7dGhyb3cgbmV3IFR5cGVFcnJvcigiVW5rbm93biBlbmNvZGluZzogIitlbmNvZGluZyl9dmFyIGxlbmd0aD1ieXRlTGVuZ3RoKHN0cmluZyxlbmNvZGluZyl8MDt2YXIgYnVmPWNyZWF0ZUJ1ZmZlcihsZW5ndGgpO3ZhciBhY3R1YWw9YnVmLndyaXRlKHN0cmluZyxlbmNvZGluZyk7aWYoYWN0dWFsIT09bGVuZ3RoKXtidWY9YnVmLnNsaWNlKDAsYWN0dWFsKX1yZXR1cm4gYnVmfWZ1bmN0aW9uIGZyb21BcnJheUxpa2UoYXJyYXkpe3ZhciBsZW5ndGg9YXJyYXkubGVuZ3RoPDA/MDpjaGVja2VkKGFycmF5Lmxlbmd0aCl8MDt2YXIgYnVmPWNyZWF0ZUJ1ZmZlcihsZW5ndGgpO2Zvcih2YXIgaT0wO2k8bGVuZ3RoO2krPTEpe2J1ZltpXT1hcnJheVtpXSYyNTV9cmV0dXJuIGJ1Zn1mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIoYXJyYXksYnl0ZU9mZnNldCxsZW5ndGgpe2lmKGJ5dGVPZmZzZXQ8MHx8YXJyYXkuYnl0ZUxlbmd0aDxieXRlT2Zmc2V0KXt0aHJvdyBuZXcgUmFuZ2VFcnJvcignIm9mZnNldCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJyl9aWYoYXJyYXkuYnl0ZUxlbmd0aDxieXRlT2Zmc2V0KyhsZW5ndGh8fDApKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcignImxlbmd0aCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJyl9dmFyIGJ1ZjtpZihieXRlT2Zmc2V0PT09dW5kZWZpbmVkJiZsZW5ndGg9PT11bmRlZmluZWQpe2J1Zj1uZXcgVWludDhBcnJheShhcnJheSl9ZWxzZSBpZihsZW5ndGg9PT11bmRlZmluZWQpe2J1Zj1uZXcgVWludDhBcnJheShhcnJheSxieXRlT2Zmc2V0KX1lbHNle2J1Zj1uZXcgVWludDhBcnJheShhcnJheSxieXRlT2Zmc2V0LGxlbmd0aCl9T2JqZWN0LnNldFByb3RvdHlwZU9mKGJ1ZixCdWZmZXIucHJvdG90eXBlKTtyZXR1cm4gYnVmfWZ1bmN0aW9uIGZyb21PYmplY3Qob2JqKXtpZihCdWZmZXIuaXNCdWZmZXIob2JqKSl7dmFyIGxlbj1jaGVja2VkKG9iai5sZW5ndGgpfDA7dmFyIGJ1Zj1jcmVhdGVCdWZmZXIobGVuKTtpZihidWYubGVuZ3RoPT09MCl7cmV0dXJuIGJ1Zn1vYmouY29weShidWYsMCwwLGxlbik7cmV0dXJuIGJ1Zn1pZihvYmoubGVuZ3RoIT09dW5kZWZpbmVkKXtpZih0eXBlb2Ygb2JqLmxlbmd0aCE9PSJudW1iZXIifHxudW1iZXJJc05hTihvYmoubGVuZ3RoKSl7cmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKX1yZXR1cm4gZnJvbUFycmF5TGlrZShvYmopfWlmKG9iai50eXBlPT09IkJ1ZmZlciImJkFycmF5LmlzQXJyYXkob2JqLmRhdGEpKXtyZXR1cm4gZnJvbUFycmF5TGlrZShvYmouZGF0YSl9fWZ1bmN0aW9uIGNoZWNrZWQobGVuZ3RoKXtpZihsZW5ndGg+PUtfTUFYX0xFTkdUSCl7dGhyb3cgbmV3IFJhbmdlRXJyb3IoIkF0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gIisic2l6ZTogMHgiK0tfTUFYX0xFTkdUSC50b1N0cmluZygxNikrIiBieXRlcyIpfXJldHVybiBsZW5ndGh8MH1mdW5jdGlvbiBTbG93QnVmZmVyKGxlbmd0aCl7aWYoK2xlbmd0aCE9bGVuZ3RoKXtsZW5ndGg9MH1yZXR1cm4gQnVmZmVyLmFsbG9jKCtsZW5ndGgpfUJ1ZmZlci5pc0J1ZmZlcj1mdW5jdGlvbiBpc0J1ZmZlcihiKXtyZXR1cm4gYiE9bnVsbCYmYi5faXNCdWZmZXI9PT10cnVlJiZiIT09QnVmZmVyLnByb3RvdHlwZX07QnVmZmVyLmNvbXBhcmU9ZnVuY3Rpb24gY29tcGFyZShhLGIpe2lmKGlzSW5zdGFuY2UoYSxVaW50OEFycmF5KSlhPUJ1ZmZlci5mcm9tKGEsYS5vZmZzZXQsYS5ieXRlTGVuZ3RoKTtpZihpc0luc3RhbmNlKGIsVWludDhBcnJheSkpYj1CdWZmZXIuZnJvbShiLGIub2Zmc2V0LGIuYnl0ZUxlbmd0aCk7aWYoIUJ1ZmZlci5pc0J1ZmZlcihhKXx8IUJ1ZmZlci5pc0J1ZmZlcihiKSl7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJidWYxIiwgImJ1ZjIiIGFyZ3VtZW50cyBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5Jyl9aWYoYT09PWIpcmV0dXJuIDA7dmFyIHg9YS5sZW5ndGg7dmFyIHk9Yi5sZW5ndGg7Zm9yKHZhciBpPTAsbGVuPU1hdGgubWluKHgseSk7aTxsZW47KytpKXtpZihhW2ldIT09YltpXSl7eD1hW2ldO3k9YltpXTticmVha319aWYoeDx5KXJldHVybi0xO2lmKHk8eClyZXR1cm4gMTtyZXR1cm4gMH07QnVmZmVyLmlzRW5jb2Rpbmc9ZnVuY3Rpb24gaXNFbmNvZGluZyhlbmNvZGluZyl7c3dpdGNoKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSl7Y2FzZSJoZXgiOmNhc2UidXRmOCI6Y2FzZSJ1dGYtOCI6Y2FzZSJhc2NpaSI6Y2FzZSJsYXRpbjEiOmNhc2UiYmluYXJ5IjpjYXNlImJhc2U2NCI6Y2FzZSJ1Y3MyIjpjYXNlInVjcy0yIjpjYXNlInV0ZjE2bGUiOmNhc2UidXRmLTE2bGUiOnJldHVybiB0cnVlO2RlZmF1bHQ6cmV0dXJuIGZhbHNlfX07QnVmZmVyLmNvbmNhdD1mdW5jdGlvbiBjb25jYXQobGlzdCxsZW5ndGgpe2lmKCFBcnJheS5pc0FycmF5KGxpc3QpKXt0aHJvdyBuZXcgVHlwZUVycm9yKCcibGlzdCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJyl9aWYobGlzdC5sZW5ndGg9PT0wKXtyZXR1cm4gQnVmZmVyLmFsbG9jKDApfXZhciBpO2lmKGxlbmd0aD09PXVuZGVmaW5lZCl7bGVuZ3RoPTA7Zm9yKGk9MDtpPGxpc3QubGVuZ3RoOysraSl7bGVuZ3RoKz1saXN0W2ldLmxlbmd0aH19dmFyIGJ1ZmZlcj1CdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKTt2YXIgcG9zPTA7Zm9yKGk9MDtpPGxpc3QubGVuZ3RoOysraSl7dmFyIGJ1Zj1saXN0W2ldO2lmKGlzSW5zdGFuY2UoYnVmLFVpbnQ4QXJyYXkpKXtidWY9QnVmZmVyLmZyb20oYnVmKX1pZighQnVmZmVyLmlzQnVmZmVyKGJ1Zikpe3Rocm93IG5ldyBUeXBlRXJyb3IoJyJsaXN0IiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKX1idWYuY29weShidWZmZXIscG9zKTtwb3MrPWJ1Zi5sZW5ndGh9cmV0dXJuIGJ1ZmZlcn07ZnVuY3Rpb24gYnl0ZUxlbmd0aChzdHJpbmcsZW5jb2Rpbmcpe2lmKEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpKXtyZXR1cm4gc3RyaW5nLmxlbmd0aH1pZihBcnJheUJ1ZmZlci5pc1ZpZXcoc3RyaW5nKXx8aXNJbnN0YW5jZShzdHJpbmcsQXJyYXlCdWZmZXIpKXtyZXR1cm4gc3RyaW5nLmJ5dGVMZW5ndGh9aWYodHlwZW9mIHN0cmluZyE9PSJzdHJpbmciKXt0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgInN0cmluZyIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgb3IgQXJyYXlCdWZmZXIuICcrIlJlY2VpdmVkIHR5cGUgIit0eXBlb2Ygc3RyaW5nKX12YXIgbGVuPXN0cmluZy5sZW5ndGg7dmFyIG11c3RNYXRjaD1hcmd1bWVudHMubGVuZ3RoPjImJmFyZ3VtZW50c1syXT09PXRydWU7aWYoIW11c3RNYXRjaCYmbGVuPT09MClyZXR1cm4gMDt2YXIgbG93ZXJlZENhc2U9ZmFsc2U7Zm9yKDs7KXtzd2l0Y2goZW5jb2Rpbmcpe2Nhc2UiYXNjaWkiOmNhc2UibGF0aW4xIjpjYXNlImJpbmFyeSI6cmV0dXJuIGxlbjtjYXNlInV0ZjgiOmNhc2UidXRmLTgiOnJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aDtjYXNlInVjczIiOmNhc2UidWNzLTIiOmNhc2UidXRmMTZsZSI6Y2FzZSJ1dGYtMTZsZSI6cmV0dXJuIGxlbioyO2Nhc2UiaGV4IjpyZXR1cm4gbGVuPj4+MTtjYXNlImJhc2U2NCI6cmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGg7ZGVmYXVsdDppZihsb3dlcmVkQ2FzZSl7cmV0dXJuIG11c3RNYXRjaD8tMTp1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aH1lbmNvZGluZz0oIiIrZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCk7bG93ZXJlZENhc2U9dHJ1ZX19fUJ1ZmZlci5ieXRlTGVuZ3RoPWJ5dGVMZW5ndGg7ZnVuY3Rpb24gc2xvd1RvU3RyaW5nKGVuY29kaW5nLHN0YXJ0LGVuZCl7dmFyIGxvd2VyZWRDYXNlPWZhbHNlO2lmKHN0YXJ0PT09dW5kZWZpbmVkfHxzdGFydDwwKXtzdGFydD0wfWlmKHN0YXJ0PnRoaXMubGVuZ3RoKXtyZXR1cm4iIn1pZihlbmQ9PT11bmRlZmluZWR8fGVuZD50aGlzLmxlbmd0aCl7ZW5kPXRoaXMubGVuZ3RofWlmKGVuZDw9MCl7cmV0dXJuIiJ9ZW5kPj4+PTA7c3RhcnQ+Pj49MDtpZihlbmQ8PXN0YXJ0KXtyZXR1cm4iIn1pZighZW5jb2RpbmcpZW5jb2Rpbmc9InV0ZjgiO3doaWxlKHRydWUpe3N3aXRjaChlbmNvZGluZyl7Y2FzZSJoZXgiOnJldHVybiBoZXhTbGljZSh0aGlzLHN0YXJ0LGVuZCk7Y2FzZSJ1dGY4IjpjYXNlInV0Zi04IjpyZXR1cm4gdXRmOFNsaWNlKHRoaXMsc3RhcnQsZW5kKTtjYXNlImFzY2lpIjpyZXR1cm4gYXNjaWlTbGljZSh0aGlzLHN0YXJ0LGVuZCk7Y2FzZSJsYXRpbjEiOmNhc2UiYmluYXJ5IjpyZXR1cm4gbGF0aW4xU2xpY2UodGhpcyxzdGFydCxlbmQpO2Nhc2UiYmFzZTY0IjpyZXR1cm4gYmFzZTY0U2xpY2UodGhpcyxzdGFydCxlbmQpO2Nhc2UidWNzMiI6Y2FzZSJ1Y3MtMiI6Y2FzZSJ1dGYxNmxlIjpjYXNlInV0Zi0xNmxlIjpyZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsc3RhcnQsZW5kKTtkZWZhdWx0OmlmKGxvd2VyZWRDYXNlKXRocm93IG5ldyBUeXBlRXJyb3IoIlVua25vd24gZW5jb2Rpbmc6ICIrZW5jb2RpbmcpO2VuY29kaW5nPShlbmNvZGluZysiIikudG9Mb3dlckNhc2UoKTtsb3dlcmVkQ2FzZT10cnVlfX19QnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXI9dHJ1ZTtmdW5jdGlvbiBzd2FwKGIsbixtKXt2YXIgaT1iW25dO2Jbbl09YlttXTtiW21dPWl9QnVmZmVyLnByb3RvdHlwZS5zd2FwMTY9ZnVuY3Rpb24gc3dhcDE2KCl7dmFyIGxlbj10aGlzLmxlbmd0aDtpZihsZW4lMiE9PTApe3Rocm93IG5ldyBSYW5nZUVycm9yKCJCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cyIpfWZvcih2YXIgaT0wO2k8bGVuO2krPTIpe3N3YXAodGhpcyxpLGkrMSl9cmV0dXJuIHRoaXN9O0J1ZmZlci5wcm90b3R5cGUuc3dhcDMyPWZ1bmN0aW9uIHN3YXAzMigpe3ZhciBsZW49dGhpcy5sZW5ndGg7aWYobGVuJTQhPT0wKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigiQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMiKX1mb3IodmFyIGk9MDtpPGxlbjtpKz00KXtzd2FwKHRoaXMsaSxpKzMpO3N3YXAodGhpcyxpKzEsaSsyKX1yZXR1cm4gdGhpc307QnVmZmVyLnByb3RvdHlwZS5zd2FwNjQ9ZnVuY3Rpb24gc3dhcDY0KCl7dmFyIGxlbj10aGlzLmxlbmd0aDtpZihsZW4lOCE9PTApe3Rocm93IG5ldyBSYW5nZUVycm9yKCJCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cyIpfWZvcih2YXIgaT0wO2k8bGVuO2krPTgpe3N3YXAodGhpcyxpLGkrNyk7c3dhcCh0aGlzLGkrMSxpKzYpO3N3YXAodGhpcyxpKzIsaSs1KTtzd2FwKHRoaXMsaSszLGkrNCl9cmV0dXJuIHRoaXN9O0J1ZmZlci5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24gdG9TdHJpbmcoKXt2YXIgbGVuZ3RoPXRoaXMubGVuZ3RoO2lmKGxlbmd0aD09PTApcmV0dXJuIiI7aWYoYXJndW1lbnRzLmxlbmd0aD09PTApcmV0dXJuIHV0ZjhTbGljZSh0aGlzLDAsbGVuZ3RoKTtyZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsYXJndW1lbnRzKX07QnVmZmVyLnByb3RvdHlwZS50b0xvY2FsZVN0cmluZz1CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nO0J1ZmZlci5wcm90b3R5cGUuZXF1YWxzPWZ1bmN0aW9uIGVxdWFscyhiKXtpZighQnVmZmVyLmlzQnVmZmVyKGIpKXRocm93IG5ldyBUeXBlRXJyb3IoIkFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIiKTtpZih0aGlzPT09YilyZXR1cm4gdHJ1ZTtyZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcyxiKT09PTB9O0J1ZmZlci5wcm90b3R5cGUuaW5zcGVjdD1mdW5jdGlvbiBpbnNwZWN0KCl7dmFyIHN0cj0iIjt2YXIgbWF4PWV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVM7c3RyPXRoaXMudG9TdHJpbmcoImhleCIsMCxtYXgpLnJlcGxhY2UoLyguezJ9KS9nLCIkMSAiKS50cmltKCk7aWYodGhpcy5sZW5ndGg+bWF4KXN0cis9IiAuLi4gIjtyZXR1cm4iPEJ1ZmZlciAiK3N0cisiPiJ9O2lmKGN1c3RvbUluc3BlY3RTeW1ib2wpe0J1ZmZlci5wcm90b3R5cGVbY3VzdG9tSW5zcGVjdFN5bWJvbF09QnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0fUJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZT1mdW5jdGlvbiBjb21wYXJlKHRhcmdldCxzdGFydCxlbmQsdGhpc1N0YXJ0LHRoaXNFbmQpe2lmKGlzSW5zdGFuY2UodGFyZ2V0LFVpbnQ4QXJyYXkpKXt0YXJnZXQ9QnVmZmVyLmZyb20odGFyZ2V0LHRhcmdldC5vZmZzZXQsdGFyZ2V0LmJ5dGVMZW5ndGgpfWlmKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSl7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJ0YXJnZXQiIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgQnVmZmVyIG9yIFVpbnQ4QXJyYXkuICcrIlJlY2VpdmVkIHR5cGUgIit0eXBlb2YgdGFyZ2V0KX1pZihzdGFydD09PXVuZGVmaW5lZCl7c3RhcnQ9MH1pZihlbmQ9PT11bmRlZmluZWQpe2VuZD10YXJnZXQ/dGFyZ2V0Lmxlbmd0aDowfWlmKHRoaXNTdGFydD09PXVuZGVmaW5lZCl7dGhpc1N0YXJ0PTB9aWYodGhpc0VuZD09PXVuZGVmaW5lZCl7dGhpc0VuZD10aGlzLmxlbmd0aH1pZihzdGFydDwwfHxlbmQ+dGFyZ2V0Lmxlbmd0aHx8dGhpc1N0YXJ0PDB8fHRoaXNFbmQ+dGhpcy5sZW5ndGgpe3Rocm93IG5ldyBSYW5nZUVycm9yKCJvdXQgb2YgcmFuZ2UgaW5kZXgiKX1pZih0aGlzU3RhcnQ+PXRoaXNFbmQmJnN0YXJ0Pj1lbmQpe3JldHVybiAwfWlmKHRoaXNTdGFydD49dGhpc0VuZCl7cmV0dXJuLTF9aWYoc3RhcnQ+PWVuZCl7cmV0dXJuIDF9c3RhcnQ+Pj49MDtlbmQ+Pj49MDt0aGlzU3RhcnQ+Pj49MDt0aGlzRW5kPj4+PTA7aWYodGhpcz09PXRhcmdldClyZXR1cm4gMDt2YXIgeD10aGlzRW5kLXRoaXNTdGFydDt2YXIgeT1lbmQtc3RhcnQ7dmFyIGxlbj1NYXRoLm1pbih4LHkpO3ZhciB0aGlzQ29weT10aGlzLnNsaWNlKHRoaXNTdGFydCx0aGlzRW5kKTt2YXIgdGFyZ2V0Q29weT10YXJnZXQuc2xpY2Uoc3RhcnQsZW5kKTtmb3IodmFyIGk9MDtpPGxlbjsrK2kpe2lmKHRoaXNDb3B5W2ldIT09dGFyZ2V0Q29weVtpXSl7eD10aGlzQ29weVtpXTt5PXRhcmdldENvcHlbaV07YnJlYWt9fWlmKHg8eSlyZXR1cm4tMTtpZih5PHgpcmV0dXJuIDE7cmV0dXJuIDB9O2Z1bmN0aW9uIGJpZGlyZWN0aW9uYWxJbmRleE9mKGJ1ZmZlcix2YWwsYnl0ZU9mZnNldCxlbmNvZGluZyxkaXIpe2lmKGJ1ZmZlci5sZW5ndGg9PT0wKXJldHVybi0xO2lmKHR5cGVvZiBieXRlT2Zmc2V0PT09InN0cmluZyIpe2VuY29kaW5nPWJ5dGVPZmZzZXQ7Ynl0ZU9mZnNldD0wfWVsc2UgaWYoYnl0ZU9mZnNldD4yMTQ3NDgzNjQ3KXtieXRlT2Zmc2V0PTIxNDc0ODM2NDd9ZWxzZSBpZihieXRlT2Zmc2V0PC0yMTQ3NDgzNjQ4KXtieXRlT2Zmc2V0PS0yMTQ3NDgzNjQ4fWJ5dGVPZmZzZXQ9K2J5dGVPZmZzZXQ7aWYobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpe2J5dGVPZmZzZXQ9ZGlyPzA6YnVmZmVyLmxlbmd0aC0xfWlmKGJ5dGVPZmZzZXQ8MClieXRlT2Zmc2V0PWJ1ZmZlci5sZW5ndGgrYnl0ZU9mZnNldDtpZihieXRlT2Zmc2V0Pj1idWZmZXIubGVuZ3RoKXtpZihkaXIpcmV0dXJuLTE7ZWxzZSBieXRlT2Zmc2V0PWJ1ZmZlci5sZW5ndGgtMX1lbHNlIGlmKGJ5dGVPZmZzZXQ8MCl7aWYoZGlyKWJ5dGVPZmZzZXQ9MDtlbHNlIHJldHVybi0xfWlmKHR5cGVvZiB2YWw9PT0ic3RyaW5nIil7dmFsPUJ1ZmZlci5mcm9tKHZhbCxlbmNvZGluZyl9aWYoQnVmZmVyLmlzQnVmZmVyKHZhbCkpe2lmKHZhbC5sZW5ndGg9PT0wKXtyZXR1cm4tMX1yZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlcix2YWwsYnl0ZU9mZnNldCxlbmNvZGluZyxkaXIpfWVsc2UgaWYodHlwZW9mIHZhbD09PSJudW1iZXIiKXt2YWw9dmFsJjI1NTtpZih0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZj09PSJmdW5jdGlvbiIpe2lmKGRpcil7cmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChidWZmZXIsdmFsLGJ5dGVPZmZzZXQpfWVsc2V7cmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLHZhbCxieXRlT2Zmc2V0KX19cmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsW3ZhbF0sYnl0ZU9mZnNldCxlbmNvZGluZyxkaXIpfXRocm93IG5ldyBUeXBlRXJyb3IoInZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlciIpfWZ1bmN0aW9uIGFycmF5SW5kZXhPZihhcnIsdmFsLGJ5dGVPZmZzZXQsZW5jb2RpbmcsZGlyKXt2YXIgaW5kZXhTaXplPTE7dmFyIGFyckxlbmd0aD1hcnIubGVuZ3RoO3ZhciB2YWxMZW5ndGg9dmFsLmxlbmd0aDtpZihlbmNvZGluZyE9PXVuZGVmaW5lZCl7ZW5jb2Rpbmc9U3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpO2lmKGVuY29kaW5nPT09InVjczIifHxlbmNvZGluZz09PSJ1Y3MtMiJ8fGVuY29kaW5nPT09InV0ZjE2bGUifHxlbmNvZGluZz09PSJ1dGYtMTZsZSIpe2lmKGFyci5sZW5ndGg8Mnx8dmFsLmxlbmd0aDwyKXtyZXR1cm4tMX1pbmRleFNpemU9MjthcnJMZW5ndGgvPTI7dmFsTGVuZ3RoLz0yO2J5dGVPZmZzZXQvPTJ9fWZ1bmN0aW9uIHJlYWQoYnVmLGkpe2lmKGluZGV4U2l6ZT09PTEpe3JldHVybiBidWZbaV19ZWxzZXtyZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpKmluZGV4U2l6ZSl9fXZhciBpO2lmKGRpcil7dmFyIGZvdW5kSW5kZXg9LTE7Zm9yKGk9Ynl0ZU9mZnNldDtpPGFyckxlbmd0aDtpKyspe2lmKHJlYWQoYXJyLGkpPT09cmVhZCh2YWwsZm91bmRJbmRleD09PS0xPzA6aS1mb3VuZEluZGV4KSl7aWYoZm91bmRJbmRleD09PS0xKWZvdW5kSW5kZXg9aTtpZihpLWZvdW5kSW5kZXgrMT09PXZhbExlbmd0aClyZXR1cm4gZm91bmRJbmRleCppbmRleFNpemV9ZWxzZXtpZihmb3VuZEluZGV4IT09LTEpaS09aS1mb3VuZEluZGV4O2ZvdW5kSW5kZXg9LTF9fX1lbHNle2lmKGJ5dGVPZmZzZXQrdmFsTGVuZ3RoPmFyckxlbmd0aClieXRlT2Zmc2V0PWFyckxlbmd0aC12YWxMZW5ndGg7Zm9yKGk9Ynl0ZU9mZnNldDtpPj0wO2ktLSl7dmFyIGZvdW5kPXRydWU7Zm9yKHZhciBqPTA7ajx2YWxMZW5ndGg7aisrKXtpZihyZWFkKGFycixpK2opIT09cmVhZCh2YWwsaikpe2ZvdW5kPWZhbHNlO2JyZWFrfX1pZihmb3VuZClyZXR1cm4gaX19cmV0dXJuLTF9QnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcz1mdW5jdGlvbiBpbmNsdWRlcyh2YWwsYnl0ZU9mZnNldCxlbmNvZGluZyl7cmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsYnl0ZU9mZnNldCxlbmNvZGluZykhPT0tMX07QnVmZmVyLnByb3RvdHlwZS5pbmRleE9mPWZ1bmN0aW9uIGluZGV4T2YodmFsLGJ5dGVPZmZzZXQsZW5jb2Rpbmcpe3JldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLHZhbCxieXRlT2Zmc2V0LGVuY29kaW5nLHRydWUpfTtCdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mPWZ1bmN0aW9uIGxhc3RJbmRleE9mKHZhbCxieXRlT2Zmc2V0LGVuY29kaW5nKXtyZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcyx2YWwsYnl0ZU9mZnNldCxlbmNvZGluZyxmYWxzZSl9O2Z1bmN0aW9uIGhleFdyaXRlKGJ1ZixzdHJpbmcsb2Zmc2V0LGxlbmd0aCl7b2Zmc2V0PU51bWJlcihvZmZzZXQpfHwwO3ZhciByZW1haW5pbmc9YnVmLmxlbmd0aC1vZmZzZXQ7aWYoIWxlbmd0aCl7bGVuZ3RoPXJlbWFpbmluZ31lbHNle2xlbmd0aD1OdW1iZXIobGVuZ3RoKTtpZihsZW5ndGg+cmVtYWluaW5nKXtsZW5ndGg9cmVtYWluaW5nfX12YXIgc3RyTGVuPXN0cmluZy5sZW5ndGg7aWYobGVuZ3RoPnN0ckxlbi8yKXtsZW5ndGg9c3RyTGVuLzJ9Zm9yKHZhciBpPTA7aTxsZW5ndGg7KytpKXt2YXIgcGFyc2VkPXBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSoyLDIpLDE2KTtpZihudW1iZXJJc05hTihwYXJzZWQpKXJldHVybiBpO2J1ZltvZmZzZXQraV09cGFyc2VkfXJldHVybiBpfWZ1bmN0aW9uIHV0ZjhXcml0ZShidWYsc3RyaW5nLG9mZnNldCxsZW5ndGgpe3JldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZyxidWYubGVuZ3RoLW9mZnNldCksYnVmLG9mZnNldCxsZW5ndGgpfWZ1bmN0aW9uIGFzY2lpV3JpdGUoYnVmLHN0cmluZyxvZmZzZXQsbGVuZ3RoKXtyZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSxidWYsb2Zmc2V0LGxlbmd0aCl9ZnVuY3Rpb24gbGF0aW4xV3JpdGUoYnVmLHN0cmluZyxvZmZzZXQsbGVuZ3RoKXtyZXR1cm4gYXNjaWlXcml0ZShidWYsc3RyaW5nLG9mZnNldCxsZW5ndGgpfWZ1bmN0aW9uIGJhc2U2NFdyaXRlKGJ1ZixzdHJpbmcsb2Zmc2V0LGxlbmd0aCl7cmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLGJ1ZixvZmZzZXQsbGVuZ3RoKX1mdW5jdGlvbiB1Y3MyV3JpdGUoYnVmLHN0cmluZyxvZmZzZXQsbGVuZ3RoKXtyZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsYnVmLmxlbmd0aC1vZmZzZXQpLGJ1ZixvZmZzZXQsbGVuZ3RoKX1CdWZmZXIucHJvdG90eXBlLndyaXRlPWZ1bmN0aW9uIHdyaXRlKHN0cmluZyxvZmZzZXQsbGVuZ3RoLGVuY29kaW5nKXtpZihvZmZzZXQ9PT11bmRlZmluZWQpe2VuY29kaW5nPSJ1dGY4IjtsZW5ndGg9dGhpcy5sZW5ndGg7b2Zmc2V0PTB9ZWxzZSBpZihsZW5ndGg9PT11bmRlZmluZWQmJnR5cGVvZiBvZmZzZXQ9PT0ic3RyaW5nIil7ZW5jb2Rpbmc9b2Zmc2V0O2xlbmd0aD10aGlzLmxlbmd0aDtvZmZzZXQ9MH1lbHNlIGlmKGlzRmluaXRlKG9mZnNldCkpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKGlzRmluaXRlKGxlbmd0aCkpe2xlbmd0aD1sZW5ndGg+Pj4wO2lmKGVuY29kaW5nPT09dW5kZWZpbmVkKWVuY29kaW5nPSJ1dGY4In1lbHNle2VuY29kaW5nPWxlbmd0aDtsZW5ndGg9dW5kZWZpbmVkfX1lbHNle3Rocm93IG5ldyBFcnJvcigiQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQiKX12YXIgcmVtYWluaW5nPXRoaXMubGVuZ3RoLW9mZnNldDtpZihsZW5ndGg9PT11bmRlZmluZWR8fGxlbmd0aD5yZW1haW5pbmcpbGVuZ3RoPXJlbWFpbmluZztpZihzdHJpbmcubGVuZ3RoPjAmJihsZW5ndGg8MHx8b2Zmc2V0PDApfHxvZmZzZXQ+dGhpcy5sZW5ndGgpe3Rocm93IG5ldyBSYW5nZUVycm9yKCJBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcyIpfWlmKCFlbmNvZGluZyllbmNvZGluZz0idXRmOCI7dmFyIGxvd2VyZWRDYXNlPWZhbHNlO2Zvcig7Oyl7c3dpdGNoKGVuY29kaW5nKXtjYXNlImhleCI6cmV0dXJuIGhleFdyaXRlKHRoaXMsc3RyaW5nLG9mZnNldCxsZW5ndGgpO2Nhc2UidXRmOCI6Y2FzZSJ1dGYtOCI6cmV0dXJuIHV0ZjhXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtjYXNlImFzY2lpIjpyZXR1cm4gYXNjaWlXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtjYXNlImxhdGluMSI6Y2FzZSJiaW5hcnkiOnJldHVybiBsYXRpbjFXcml0ZSh0aGlzLHN0cmluZyxvZmZzZXQsbGVuZ3RoKTtjYXNlImJhc2U2NCI6cmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsc3RyaW5nLG9mZnNldCxsZW5ndGgpO2Nhc2UidWNzMiI6Y2FzZSJ1Y3MtMiI6Y2FzZSJ1dGYxNmxlIjpjYXNlInV0Zi0xNmxlIjpyZXR1cm4gdWNzMldyaXRlKHRoaXMsc3RyaW5nLG9mZnNldCxsZW5ndGgpO2RlZmF1bHQ6aWYobG93ZXJlZENhc2UpdGhyb3cgbmV3IFR5cGVFcnJvcigiVW5rbm93biBlbmNvZGluZzogIitlbmNvZGluZyk7ZW5jb2Rpbmc9KCIiK2VuY29kaW5nKS50b0xvd2VyQ2FzZSgpO2xvd2VyZWRDYXNlPXRydWV9fX07QnVmZmVyLnByb3RvdHlwZS50b0pTT049ZnVuY3Rpb24gdG9KU09OKCl7cmV0dXJue3R5cGU6IkJ1ZmZlciIsZGF0YTpBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnJ8fHRoaXMsMCl9fTtmdW5jdGlvbiBiYXNlNjRTbGljZShidWYsc3RhcnQsZW5kKXtpZihzdGFydD09PTAmJmVuZD09PWJ1Zi5sZW5ndGgpe3JldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpfWVsc2V7cmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCxlbmQpKX19ZnVuY3Rpb24gdXRmOFNsaWNlKGJ1ZixzdGFydCxlbmQpe2VuZD1NYXRoLm1pbihidWYubGVuZ3RoLGVuZCk7dmFyIHJlcz1bXTt2YXIgaT1zdGFydDt3aGlsZShpPGVuZCl7dmFyIGZpcnN0Qnl0ZT1idWZbaV07dmFyIGNvZGVQb2ludD1udWxsO3ZhciBieXRlc1BlclNlcXVlbmNlPWZpcnN0Qnl0ZT4yMzk/NDpmaXJzdEJ5dGU+MjIzPzM6Zmlyc3RCeXRlPjE5MT8yOjE7aWYoaStieXRlc1BlclNlcXVlbmNlPD1lbmQpe3ZhciBzZWNvbmRCeXRlLHRoaXJkQnl0ZSxmb3VydGhCeXRlLHRlbXBDb2RlUG9pbnQ7c3dpdGNoKGJ5dGVzUGVyU2VxdWVuY2Upe2Nhc2UgMTppZihmaXJzdEJ5dGU8MTI4KXtjb2RlUG9pbnQ9Zmlyc3RCeXRlfWJyZWFrO2Nhc2UgMjpzZWNvbmRCeXRlPWJ1ZltpKzFdO2lmKChzZWNvbmRCeXRlJjE5Mik9PT0xMjgpe3RlbXBDb2RlUG9pbnQ9KGZpcnN0Qnl0ZSYzMSk8PDZ8c2Vjb25kQnl0ZSY2MztpZih0ZW1wQ29kZVBvaW50PjEyNyl7Y29kZVBvaW50PXRlbXBDb2RlUG9pbnR9fWJyZWFrO2Nhc2UgMzpzZWNvbmRCeXRlPWJ1ZltpKzFdO3RoaXJkQnl0ZT1idWZbaSsyXTtpZigoc2Vjb25kQnl0ZSYxOTIpPT09MTI4JiYodGhpcmRCeXRlJjE5Mik9PT0xMjgpe3RlbXBDb2RlUG9pbnQ9KGZpcnN0Qnl0ZSYxNSk8PDEyfChzZWNvbmRCeXRlJjYzKTw8Nnx0aGlyZEJ5dGUmNjM7aWYodGVtcENvZGVQb2ludD4yMDQ3JiYodGVtcENvZGVQb2ludDw1NTI5Nnx8dGVtcENvZGVQb2ludD41NzM0Mykpe2NvZGVQb2ludD10ZW1wQ29kZVBvaW50fX1icmVhaztjYXNlIDQ6c2Vjb25kQnl0ZT1idWZbaSsxXTt0aGlyZEJ5dGU9YnVmW2krMl07Zm91cnRoQnl0ZT1idWZbaSszXTtpZigoc2Vjb25kQnl0ZSYxOTIpPT09MTI4JiYodGhpcmRCeXRlJjE5Mik9PT0xMjgmJihmb3VydGhCeXRlJjE5Mik9PT0xMjgpe3RlbXBDb2RlUG9pbnQ9KGZpcnN0Qnl0ZSYxNSk8PDE4fChzZWNvbmRCeXRlJjYzKTw8MTJ8KHRoaXJkQnl0ZSY2Myk8PDZ8Zm91cnRoQnl0ZSY2MztpZih0ZW1wQ29kZVBvaW50PjY1NTM1JiZ0ZW1wQ29kZVBvaW50PDExMTQxMTIpe2NvZGVQb2ludD10ZW1wQ29kZVBvaW50fX19fWlmKGNvZGVQb2ludD09PW51bGwpe2NvZGVQb2ludD02NTUzMztieXRlc1BlclNlcXVlbmNlPTF9ZWxzZSBpZihjb2RlUG9pbnQ+NjU1MzUpe2NvZGVQb2ludC09NjU1MzY7cmVzLnB1c2goY29kZVBvaW50Pj4+MTAmMTAyM3w1NTI5Nik7Y29kZVBvaW50PTU2MzIwfGNvZGVQb2ludCYxMDIzfXJlcy5wdXNoKGNvZGVQb2ludCk7aSs9Ynl0ZXNQZXJTZXF1ZW5jZX1yZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcyl9dmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIPTQwOTY7ZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5KGNvZGVQb2ludHMpe3ZhciBsZW49Y29kZVBvaW50cy5sZW5ndGg7aWYobGVuPD1NQVhfQVJHVU1FTlRTX0xFTkdUSCl7cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLGNvZGVQb2ludHMpfXZhciByZXM9IiI7dmFyIGk9MDt3aGlsZShpPGxlbil7cmVzKz1TdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZyxjb2RlUG9pbnRzLnNsaWNlKGksaSs9TUFYX0FSR1VNRU5UU19MRU5HVEgpKX1yZXR1cm4gcmVzfWZ1bmN0aW9uIGFzY2lpU2xpY2UoYnVmLHN0YXJ0LGVuZCl7dmFyIHJldD0iIjtlbmQ9TWF0aC5taW4oYnVmLmxlbmd0aCxlbmQpO2Zvcih2YXIgaT1zdGFydDtpPGVuZDsrK2kpe3JldCs9U3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0mMTI3KX1yZXR1cm4gcmV0fWZ1bmN0aW9uIGxhdGluMVNsaWNlKGJ1ZixzdGFydCxlbmQpe3ZhciByZXQ9IiI7ZW5kPU1hdGgubWluKGJ1Zi5sZW5ndGgsZW5kKTtmb3IodmFyIGk9c3RhcnQ7aTxlbmQ7KytpKXtyZXQrPVN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKX1yZXR1cm4gcmV0fWZ1bmN0aW9uIGhleFNsaWNlKGJ1ZixzdGFydCxlbmQpe3ZhciBsZW49YnVmLmxlbmd0aDtpZighc3RhcnR8fHN0YXJ0PDApc3RhcnQ9MDtpZighZW5kfHxlbmQ8MHx8ZW5kPmxlbillbmQ9bGVuO3ZhciBvdXQ9IiI7Zm9yKHZhciBpPXN0YXJ0O2k8ZW5kOysraSl7b3V0Kz1oZXhTbGljZUxvb2t1cFRhYmxlW2J1ZltpXV19cmV0dXJuIG91dH1mdW5jdGlvbiB1dGYxNmxlU2xpY2UoYnVmLHN0YXJ0LGVuZCl7dmFyIGJ5dGVzPWJ1Zi5zbGljZShzdGFydCxlbmQpO3ZhciByZXM9IiI7Zm9yKHZhciBpPTA7aTxieXRlcy5sZW5ndGg7aSs9Mil7cmVzKz1TdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldK2J5dGVzW2krMV0qMjU2KX1yZXR1cm4gcmVzfUJ1ZmZlci5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24gc2xpY2Uoc3RhcnQsZW5kKXt2YXIgbGVuPXRoaXMubGVuZ3RoO3N0YXJ0PX5+c3RhcnQ7ZW5kPWVuZD09PXVuZGVmaW5lZD9sZW46fn5lbmQ7aWYoc3RhcnQ8MCl7c3RhcnQrPWxlbjtpZihzdGFydDwwKXN0YXJ0PTB9ZWxzZSBpZihzdGFydD5sZW4pe3N0YXJ0PWxlbn1pZihlbmQ8MCl7ZW5kKz1sZW47aWYoZW5kPDApZW5kPTB9ZWxzZSBpZihlbmQ+bGVuKXtlbmQ9bGVufWlmKGVuZDxzdGFydCllbmQ9c3RhcnQ7dmFyIG5ld0J1Zj10aGlzLnN1YmFycmF5KHN0YXJ0LGVuZCk7T2JqZWN0LnNldFByb3RvdHlwZU9mKG5ld0J1ZixCdWZmZXIucHJvdG90eXBlKTtyZXR1cm4gbmV3QnVmfTtmdW5jdGlvbiBjaGVja09mZnNldChvZmZzZXQsZXh0LGxlbmd0aCl7aWYob2Zmc2V0JTEhPT0wfHxvZmZzZXQ8MCl0aHJvdyBuZXcgUmFuZ2VFcnJvcigib2Zmc2V0IGlzIG5vdCB1aW50Iik7aWYob2Zmc2V0K2V4dD5sZW5ndGgpdGhyb3cgbmV3IFJhbmdlRXJyb3IoIlRyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgiKX1CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEU9ZnVuY3Rpb24gcmVhZFVJbnRMRShvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7Ynl0ZUxlbmd0aD1ieXRlTGVuZ3RoPj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LGJ5dGVMZW5ndGgsdGhpcy5sZW5ndGgpO3ZhciB2YWw9dGhpc1tvZmZzZXRdO3ZhciBtdWw9MTt2YXIgaT0wO3doaWxlKCsraTxieXRlTGVuZ3RoJiYobXVsKj0yNTYpKXt2YWwrPXRoaXNbb2Zmc2V0K2ldKm11bH1yZXR1cm4gdmFsfTtCdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkU9ZnVuY3Rpb24gcmVhZFVJbnRCRShvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7Ynl0ZUxlbmd0aD1ieXRlTGVuZ3RoPj4+MDtpZighbm9Bc3NlcnQpe2NoZWNrT2Zmc2V0KG9mZnNldCxieXRlTGVuZ3RoLHRoaXMubGVuZ3RoKX12YXIgdmFsPXRoaXNbb2Zmc2V0Ky0tYnl0ZUxlbmd0aF07dmFyIG11bD0xO3doaWxlKGJ5dGVMZW5ndGg+MCYmKG11bCo9MjU2KSl7dmFsKz10aGlzW29mZnNldCstLWJ5dGVMZW5ndGhdKm11bH1yZXR1cm4gdmFsfTtCdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OD1mdW5jdGlvbiByZWFkVUludDgob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDEsdGhpcy5sZW5ndGgpO3JldHVybiB0aGlzW29mZnNldF19O0J1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFPWZ1bmN0aW9uIHJlYWRVSW50MTZMRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsMix0aGlzLmxlbmd0aCk7cmV0dXJuIHRoaXNbb2Zmc2V0XXx0aGlzW29mZnNldCsxXTw8OH07QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkU9ZnVuY3Rpb24gcmVhZFVJbnQxNkJFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCwyLHRoaXMubGVuZ3RoKTtyZXR1cm4gdGhpc1tvZmZzZXRdPDw4fHRoaXNbb2Zmc2V0KzFdfTtCdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRT1mdW5jdGlvbiByZWFkVUludDMyTEUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDQsdGhpcy5sZW5ndGgpO3JldHVybih0aGlzW29mZnNldF18dGhpc1tvZmZzZXQrMV08PDh8dGhpc1tvZmZzZXQrMl08PDE2KSt0aGlzW29mZnNldCszXSoxNjc3NzIxNn07QnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkU9ZnVuY3Rpb24gcmVhZFVJbnQzMkJFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCw0LHRoaXMubGVuZ3RoKTtyZXR1cm4gdGhpc1tvZmZzZXRdKjE2Nzc3MjE2Kyh0aGlzW29mZnNldCsxXTw8MTZ8dGhpc1tvZmZzZXQrMl08PDh8dGhpc1tvZmZzZXQrM10pfTtCdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRT1mdW5jdGlvbiByZWFkSW50TEUob2Zmc2V0LGJ5dGVMZW5ndGgsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2J5dGVMZW5ndGg9Ynl0ZUxlbmd0aD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCxieXRlTGVuZ3RoLHRoaXMubGVuZ3RoKTt2YXIgdmFsPXRoaXNbb2Zmc2V0XTt2YXIgbXVsPTE7dmFyIGk9MDt3aGlsZSgrK2k8Ynl0ZUxlbmd0aCYmKG11bCo9MjU2KSl7dmFsKz10aGlzW29mZnNldCtpXSptdWx9bXVsKj0xMjg7aWYodmFsPj1tdWwpdmFsLT1NYXRoLnBvdygyLDgqYnl0ZUxlbmd0aCk7cmV0dXJuIHZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkU9ZnVuY3Rpb24gcmVhZEludEJFKG9mZnNldCxieXRlTGVuZ3RoLG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtieXRlTGVuZ3RoPWJ5dGVMZW5ndGg+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsYnl0ZUxlbmd0aCx0aGlzLmxlbmd0aCk7dmFyIGk9Ynl0ZUxlbmd0aDt2YXIgbXVsPTE7dmFyIHZhbD10aGlzW29mZnNldCstLWldO3doaWxlKGk+MCYmKG11bCo9MjU2KSl7dmFsKz10aGlzW29mZnNldCstLWldKm11bH1tdWwqPTEyODtpZih2YWw+PW11bCl2YWwtPU1hdGgucG93KDIsOCpieXRlTGVuZ3RoKTtyZXR1cm4gdmFsfTtCdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4PWZ1bmN0aW9uIHJlYWRJbnQ4KG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCwxLHRoaXMubGVuZ3RoKTtpZighKHRoaXNbb2Zmc2V0XSYxMjgpKXJldHVybiB0aGlzW29mZnNldF07cmV0dXJuKDI1NS10aGlzW29mZnNldF0rMSkqLTF9O0J1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEU9ZnVuY3Rpb24gcmVhZEludDE2TEUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDIsdGhpcy5sZW5ndGgpO3ZhciB2YWw9dGhpc1tvZmZzZXRdfHRoaXNbb2Zmc2V0KzFdPDw4O3JldHVybiB2YWwmMzI3Njg/dmFsfDQyOTQ5MDE3NjA6dmFsfTtCdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFPWZ1bmN0aW9uIHJlYWRJbnQxNkJFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCwyLHRoaXMubGVuZ3RoKTt2YXIgdmFsPXRoaXNbb2Zmc2V0KzFdfHRoaXNbb2Zmc2V0XTw8ODtyZXR1cm4gdmFsJjMyNzY4P3ZhbHw0Mjk0OTAxNzYwOnZhbH07QnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRT1mdW5jdGlvbiByZWFkSW50MzJMRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsNCx0aGlzLmxlbmd0aCk7cmV0dXJuIHRoaXNbb2Zmc2V0XXx0aGlzW29mZnNldCsxXTw8OHx0aGlzW29mZnNldCsyXTw8MTZ8dGhpc1tvZmZzZXQrM108PDI0fTtCdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFPWZ1bmN0aW9uIHJlYWRJbnQzMkJFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCw0LHRoaXMubGVuZ3RoKTtyZXR1cm4gdGhpc1tvZmZzZXRdPDwyNHx0aGlzW29mZnNldCsxXTw8MTZ8dGhpc1tvZmZzZXQrMl08PDh8dGhpc1tvZmZzZXQrM119O0J1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEU9ZnVuY3Rpb24gcmVhZEZsb2F0TEUob2Zmc2V0LG5vQXNzZXJ0KXtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tPZmZzZXQob2Zmc2V0LDQsdGhpcy5sZW5ndGgpO3JldHVybiBpZWVlNzU0LnJlYWQodGhpcyxvZmZzZXQsdHJ1ZSwyMyw0KX07QnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRT1mdW5jdGlvbiByZWFkRmxvYXRCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsNCx0aGlzLmxlbmd0aCk7cmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLG9mZnNldCxmYWxzZSwyMyw0KX07QnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEU9ZnVuY3Rpb24gcmVhZERvdWJsZUxFKG9mZnNldCxub0Fzc2VydCl7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrT2Zmc2V0KG9mZnNldCw4LHRoaXMubGVuZ3RoKTtyZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsb2Zmc2V0LHRydWUsNTIsOCl9O0J1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFPWZ1bmN0aW9uIHJlYWREb3VibGVCRShvZmZzZXQsbm9Bc3NlcnQpe29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja09mZnNldChvZmZzZXQsOCx0aGlzLmxlbmd0aCk7cmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLG9mZnNldCxmYWxzZSw1Miw4KX07ZnVuY3Rpb24gY2hlY2tJbnQoYnVmLHZhbHVlLG9mZnNldCxleHQsbWF4LG1pbil7aWYoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKXRocm93IG5ldyBUeXBlRXJyb3IoJyJidWZmZXIiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKTtpZih2YWx1ZT5tYXh8fHZhbHVlPG1pbil0aHJvdyBuZXcgUmFuZ2VFcnJvcignInZhbHVlIiBhcmd1bWVudCBpcyBvdXQgb2YgYm91bmRzJyk7aWYob2Zmc2V0K2V4dD5idWYubGVuZ3RoKXRocm93IG5ldyBSYW5nZUVycm9yKCJJbmRleCBvdXQgb2YgcmFuZ2UiKX1CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFPWZ1bmN0aW9uIHdyaXRlVUludExFKHZhbHVlLG9mZnNldCxieXRlTGVuZ3RoLG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7Ynl0ZUxlbmd0aD1ieXRlTGVuZ3RoPj4+MDtpZighbm9Bc3NlcnQpe3ZhciBtYXhCeXRlcz1NYXRoLnBvdygyLDgqYnl0ZUxlbmd0aCktMTtjaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCxieXRlTGVuZ3RoLG1heEJ5dGVzLDApfXZhciBtdWw9MTt2YXIgaT0wO3RoaXNbb2Zmc2V0XT12YWx1ZSYyNTU7d2hpbGUoKytpPGJ5dGVMZW5ndGgmJihtdWwqPTI1Nikpe3RoaXNbb2Zmc2V0K2ldPXZhbHVlL211bCYyNTV9cmV0dXJuIG9mZnNldCtieXRlTGVuZ3RofTtCdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFPWZ1bmN0aW9uIHdyaXRlVUludEJFKHZhbHVlLG9mZnNldCxieXRlTGVuZ3RoLG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7Ynl0ZUxlbmd0aD1ieXRlTGVuZ3RoPj4+MDtpZighbm9Bc3NlcnQpe3ZhciBtYXhCeXRlcz1NYXRoLnBvdygyLDgqYnl0ZUxlbmd0aCktMTtjaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCxieXRlTGVuZ3RoLG1heEJ5dGVzLDApfXZhciBpPWJ5dGVMZW5ndGgtMTt2YXIgbXVsPTE7dGhpc1tvZmZzZXQraV09dmFsdWUmMjU1O3doaWxlKC0taT49MCYmKG11bCo9MjU2KSl7dGhpc1tvZmZzZXQraV09dmFsdWUvbXVsJjI1NX1yZXR1cm4gb2Zmc2V0K2J5dGVMZW5ndGh9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OD1mdW5jdGlvbiB3cml0ZVVJbnQ4KHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCwxLDI1NSwwKTt0aGlzW29mZnNldF09dmFsdWUmMjU1O3JldHVybiBvZmZzZXQrMX07QnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFPWZ1bmN0aW9uIHdyaXRlVUludDE2TEUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LDIsNjU1MzUsMCk7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTt0aGlzW29mZnNldCsxXT12YWx1ZT4+Pjg7cmV0dXJuIG9mZnNldCsyfTtCdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkU9ZnVuY3Rpb24gd3JpdGVVSW50MTZCRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsMiw2NTUzNSwwKTt0aGlzW29mZnNldF09dmFsdWU+Pj44O3RoaXNbb2Zmc2V0KzFdPXZhbHVlJjI1NTtyZXR1cm4gb2Zmc2V0KzJ9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRT1mdW5jdGlvbiB3cml0ZVVJbnQzMkxFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCw0LDQyOTQ5NjcyOTUsMCk7dGhpc1tvZmZzZXQrM109dmFsdWU+Pj4yNDt0aGlzW29mZnNldCsyXT12YWx1ZT4+PjE2O3RoaXNbb2Zmc2V0KzFdPXZhbHVlPj4+ODt0aGlzW29mZnNldF09dmFsdWUmMjU1O3JldHVybiBvZmZzZXQrNH07QnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFPWZ1bmN0aW9uIHdyaXRlVUludDMyQkUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LDQsNDI5NDk2NzI5NSwwKTt0aGlzW29mZnNldF09dmFsdWU+Pj4yNDt0aGlzW29mZnNldCsxXT12YWx1ZT4+PjE2O3RoaXNbb2Zmc2V0KzJdPXZhbHVlPj4+ODt0aGlzW29mZnNldCszXT12YWx1ZSYyNTU7cmV0dXJuIG9mZnNldCs0fTtCdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEU9ZnVuY3Rpb24gd3JpdGVJbnRMRSh2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCl7dmFyIGxpbWl0PU1hdGgucG93KDIsOCpieXRlTGVuZ3RoLTEpO2NoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LGJ5dGVMZW5ndGgsbGltaXQtMSwtbGltaXQpfXZhciBpPTA7dmFyIG11bD0xO3ZhciBzdWI9MDt0aGlzW29mZnNldF09dmFsdWUmMjU1O3doaWxlKCsraTxieXRlTGVuZ3RoJiYobXVsKj0yNTYpKXtpZih2YWx1ZTwwJiZzdWI9PT0wJiZ0aGlzW29mZnNldCtpLTFdIT09MCl7c3ViPTF9dGhpc1tvZmZzZXQraV09KHZhbHVlL211bD4+MCktc3ViJjI1NX1yZXR1cm4gb2Zmc2V0K2J5dGVMZW5ndGh9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRT1mdW5jdGlvbiB3cml0ZUludEJFKHZhbHVlLG9mZnNldCxieXRlTGVuZ3RoLG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KXt2YXIgbGltaXQ9TWF0aC5wb3coMiw4KmJ5dGVMZW5ndGgtMSk7Y2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsYnl0ZUxlbmd0aCxsaW1pdC0xLC1saW1pdCl9dmFyIGk9Ynl0ZUxlbmd0aC0xO3ZhciBtdWw9MTt2YXIgc3ViPTA7dGhpc1tvZmZzZXQraV09dmFsdWUmMjU1O3doaWxlKC0taT49MCYmKG11bCo9MjU2KSl7aWYodmFsdWU8MCYmc3ViPT09MCYmdGhpc1tvZmZzZXQraSsxXSE9PTApe3N1Yj0xfXRoaXNbb2Zmc2V0K2ldPSh2YWx1ZS9tdWw+PjApLXN1YiYyNTV9cmV0dXJuIG9mZnNldCtieXRlTGVuZ3RofTtCdWZmZXIucHJvdG90eXBlLndyaXRlSW50OD1mdW5jdGlvbiB3cml0ZUludDgodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LDEsMTI3LC0xMjgpO2lmKHZhbHVlPDApdmFsdWU9MjU1K3ZhbHVlKzE7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTtyZXR1cm4gb2Zmc2V0KzF9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFPWZ1bmN0aW9uIHdyaXRlSW50MTZMRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpY2hlY2tJbnQodGhpcyx2YWx1ZSxvZmZzZXQsMiwzMjc2NywtMzI3NjgpO3RoaXNbb2Zmc2V0XT12YWx1ZSYyNTU7dGhpc1tvZmZzZXQrMV09dmFsdWU+Pj44O3JldHVybiBvZmZzZXQrMn07QnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkU9ZnVuY3Rpb24gd3JpdGVJbnQxNkJFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCwyLDMyNzY3LC0zMjc2OCk7dGhpc1tvZmZzZXRdPXZhbHVlPj4+ODt0aGlzW29mZnNldCsxXT12YWx1ZSYyNTU7cmV0dXJuIG9mZnNldCsyfTtCdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRT1mdW5jdGlvbiB3cml0ZUludDMyTEUodmFsdWUsb2Zmc2V0LG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KWNoZWNrSW50KHRoaXMsdmFsdWUsb2Zmc2V0LDQsMjE0NzQ4MzY0NywtMjE0NzQ4MzY0OCk7dGhpc1tvZmZzZXRdPXZhbHVlJjI1NTt0aGlzW29mZnNldCsxXT12YWx1ZT4+Pjg7dGhpc1tvZmZzZXQrMl09dmFsdWU+Pj4xNjt0aGlzW29mZnNldCszXT12YWx1ZT4+PjI0O3JldHVybiBvZmZzZXQrNH07QnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkU9ZnVuY3Rpb24gd3JpdGVJbnQzMkJFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7dmFsdWU9K3ZhbHVlO29mZnNldD1vZmZzZXQ+Pj4wO2lmKCFub0Fzc2VydCljaGVja0ludCh0aGlzLHZhbHVlLG9mZnNldCw0LDIxNDc0ODM2NDcsLTIxNDc0ODM2NDgpO2lmKHZhbHVlPDApdmFsdWU9NDI5NDk2NzI5NSt2YWx1ZSsxO3RoaXNbb2Zmc2V0XT12YWx1ZT4+PjI0O3RoaXNbb2Zmc2V0KzFdPXZhbHVlPj4+MTY7dGhpc1tvZmZzZXQrMl09dmFsdWU+Pj44O3RoaXNbb2Zmc2V0KzNdPXZhbHVlJjI1NTtyZXR1cm4gb2Zmc2V0KzR9O2Z1bmN0aW9uIGNoZWNrSUVFRTc1NChidWYsdmFsdWUsb2Zmc2V0LGV4dCxtYXgsbWluKXtpZihvZmZzZXQrZXh0PmJ1Zi5sZW5ndGgpdGhyb3cgbmV3IFJhbmdlRXJyb3IoIkluZGV4IG91dCBvZiByYW5nZSIpO2lmKG9mZnNldDwwKXRocm93IG5ldyBSYW5nZUVycm9yKCJJbmRleCBvdXQgb2YgcmFuZ2UiKX1mdW5jdGlvbiB3cml0ZUZsb2F0KGJ1Zix2YWx1ZSxvZmZzZXQsbGl0dGxlRW5kaWFuLG5vQXNzZXJ0KXt2YWx1ZT0rdmFsdWU7b2Zmc2V0PW9mZnNldD4+PjA7aWYoIW5vQXNzZXJ0KXtjaGVja0lFRUU3NTQoYnVmLHZhbHVlLG9mZnNldCw0LDM0MDI4MjM0NjYzODUyODg2ZTIyLC0zNDAyODIzNDY2Mzg1Mjg4NmUyMil9aWVlZTc1NC53cml0ZShidWYsdmFsdWUsb2Zmc2V0LGxpdHRsZUVuZGlhbiwyMyw0KTtyZXR1cm4gb2Zmc2V0KzR9QnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEU9ZnVuY3Rpb24gd3JpdGVGbG9hdExFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7cmV0dXJuIHdyaXRlRmxvYXQodGhpcyx2YWx1ZSxvZmZzZXQsdHJ1ZSxub0Fzc2VydCl9O0J1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFPWZ1bmN0aW9uIHdyaXRlRmxvYXRCRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3JldHVybiB3cml0ZUZsb2F0KHRoaXMsdmFsdWUsb2Zmc2V0LGZhbHNlLG5vQXNzZXJ0KX07ZnVuY3Rpb24gd3JpdGVEb3VibGUoYnVmLHZhbHVlLG9mZnNldCxsaXR0bGVFbmRpYW4sbm9Bc3NlcnQpe3ZhbHVlPSt2YWx1ZTtvZmZzZXQ9b2Zmc2V0Pj4+MDtpZighbm9Bc3NlcnQpe2NoZWNrSUVFRTc1NChidWYsdmFsdWUsb2Zmc2V0LDgsMTc5NzY5MzEzNDg2MjMxNTdlMjkyLC0xNzk3NjkzMTM0ODYyMzE1N2UyOTIpfWllZWU3NTQud3JpdGUoYnVmLHZhbHVlLG9mZnNldCxsaXR0bGVFbmRpYW4sNTIsOCk7cmV0dXJuIG9mZnNldCs4fUJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRT1mdW5jdGlvbiB3cml0ZURvdWJsZUxFKHZhbHVlLG9mZnNldCxub0Fzc2VydCl7cmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsdmFsdWUsb2Zmc2V0LHRydWUsbm9Bc3NlcnQpfTtCdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkU9ZnVuY3Rpb24gd3JpdGVEb3VibGVCRSh2YWx1ZSxvZmZzZXQsbm9Bc3NlcnQpe3JldHVybiB3cml0ZURvdWJsZSh0aGlzLHZhbHVlLG9mZnNldCxmYWxzZSxub0Fzc2VydCl9O0J1ZmZlci5wcm90b3R5cGUuY29weT1mdW5jdGlvbiBjb3B5KHRhcmdldCx0YXJnZXRTdGFydCxzdGFydCxlbmQpe2lmKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSl0aHJvdyBuZXcgVHlwZUVycm9yKCJhcmd1bWVudCBzaG91bGQgYmUgYSBCdWZmZXIiKTtpZighc3RhcnQpc3RhcnQ9MDtpZighZW5kJiZlbmQhPT0wKWVuZD10aGlzLmxlbmd0aDtpZih0YXJnZXRTdGFydD49dGFyZ2V0Lmxlbmd0aCl0YXJnZXRTdGFydD10YXJnZXQubGVuZ3RoO2lmKCF0YXJnZXRTdGFydCl0YXJnZXRTdGFydD0wO2lmKGVuZD4wJiZlbmQ8c3RhcnQpZW5kPXN0YXJ0O2lmKGVuZD09PXN0YXJ0KXJldHVybiAwO2lmKHRhcmdldC5sZW5ndGg9PT0wfHx0aGlzLmxlbmd0aD09PTApcmV0dXJuIDA7aWYodGFyZ2V0U3RhcnQ8MCl7dGhyb3cgbmV3IFJhbmdlRXJyb3IoInRhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMiKX1pZihzdGFydDwwfHxzdGFydD49dGhpcy5sZW5ndGgpdGhyb3cgbmV3IFJhbmdlRXJyb3IoIkluZGV4IG91dCBvZiByYW5nZSIpO2lmKGVuZDwwKXRocm93IG5ldyBSYW5nZUVycm9yKCJzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcyIpO2lmKGVuZD50aGlzLmxlbmd0aCllbmQ9dGhpcy5sZW5ndGg7aWYodGFyZ2V0Lmxlbmd0aC10YXJnZXRTdGFydDxlbmQtc3RhcnQpe2VuZD10YXJnZXQubGVuZ3RoLXRhcmdldFN0YXJ0K3N0YXJ0fXZhciBsZW49ZW5kLXN0YXJ0O2lmKHRoaXM9PT10YXJnZXQmJnR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5jb3B5V2l0aGluPT09ImZ1bmN0aW9uIil7dGhpcy5jb3B5V2l0aGluKHRhcmdldFN0YXJ0LHN0YXJ0LGVuZCl9ZWxzZSBpZih0aGlzPT09dGFyZ2V0JiZzdGFydDx0YXJnZXRTdGFydCYmdGFyZ2V0U3RhcnQ8ZW5kKXtmb3IodmFyIGk9bGVuLTE7aT49MDstLWkpe3RhcmdldFtpK3RhcmdldFN0YXJ0XT10aGlzW2krc3RhcnRdfX1lbHNle1VpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKHRhcmdldCx0aGlzLnN1YmFycmF5KHN0YXJ0LGVuZCksdGFyZ2V0U3RhcnQpfXJldHVybiBsZW59O0J1ZmZlci5wcm90b3R5cGUuZmlsbD1mdW5jdGlvbiBmaWxsKHZhbCxzdGFydCxlbmQsZW5jb2Rpbmcpe2lmKHR5cGVvZiB2YWw9PT0ic3RyaW5nIil7aWYodHlwZW9mIHN0YXJ0PT09InN0cmluZyIpe2VuY29kaW5nPXN0YXJ0O3N0YXJ0PTA7ZW5kPXRoaXMubGVuZ3RofWVsc2UgaWYodHlwZW9mIGVuZD09PSJzdHJpbmciKXtlbmNvZGluZz1lbmQ7ZW5kPXRoaXMubGVuZ3RofWlmKGVuY29kaW5nIT09dW5kZWZpbmVkJiZ0eXBlb2YgZW5jb2RpbmchPT0ic3RyaW5nIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZyIpfWlmKHR5cGVvZiBlbmNvZGluZz09PSJzdHJpbmciJiYhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJVbmtub3duIGVuY29kaW5nOiAiK2VuY29kaW5nKX1pZih2YWwubGVuZ3RoPT09MSl7dmFyIGNvZGU9dmFsLmNoYXJDb2RlQXQoMCk7aWYoZW5jb2Rpbmc9PT0idXRmOCImJmNvZGU8MTI4fHxlbmNvZGluZz09PSJsYXRpbjEiKXt2YWw9Y29kZX19fWVsc2UgaWYodHlwZW9mIHZhbD09PSJudW1iZXIiKXt2YWw9dmFsJjI1NX1lbHNlIGlmKHR5cGVvZiB2YWw9PT0iYm9vbGVhbiIpe3ZhbD1OdW1iZXIodmFsKX1pZihzdGFydDwwfHx0aGlzLmxlbmd0aDxzdGFydHx8dGhpcy5sZW5ndGg8ZW5kKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcigiT3V0IG9mIHJhbmdlIGluZGV4Iil9aWYoZW5kPD1zdGFydCl7cmV0dXJuIHRoaXN9c3RhcnQ9c3RhcnQ+Pj4wO2VuZD1lbmQ9PT11bmRlZmluZWQ/dGhpcy5sZW5ndGg6ZW5kPj4+MDtpZighdmFsKXZhbD0wO3ZhciBpO2lmKHR5cGVvZiB2YWw9PT0ibnVtYmVyIil7Zm9yKGk9c3RhcnQ7aTxlbmQ7KytpKXt0aGlzW2ldPXZhbH19ZWxzZXt2YXIgYnl0ZXM9QnVmZmVyLmlzQnVmZmVyKHZhbCk/dmFsOkJ1ZmZlci5mcm9tKHZhbCxlbmNvZGluZyk7dmFyIGxlbj1ieXRlcy5sZW5ndGg7aWYobGVuPT09MCl7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHZhbHVlICInK3ZhbCsnIiBpcyBpbnZhbGlkIGZvciBhcmd1bWVudCAidmFsdWUiJyl9Zm9yKGk9MDtpPGVuZC1zdGFydDsrK2kpe3RoaXNbaStzdGFydF09Ynl0ZXNbaSVsZW5dfX1yZXR1cm4gdGhpc307dmFyIElOVkFMSURfQkFTRTY0X1JFPS9bXisvMC05QS1aYS16LV9dL2c7ZnVuY3Rpb24gYmFzZTY0Y2xlYW4oc3RyKXtzdHI9c3RyLnNwbGl0KCI9IilbMF07c3RyPXN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwiIik7aWYoc3RyLmxlbmd0aDwyKXJldHVybiIiO3doaWxlKHN0ci5sZW5ndGglNCE9PTApe3N0cj1zdHIrIj0ifXJldHVybiBzdHJ9ZnVuY3Rpb24gdXRmOFRvQnl0ZXMoc3RyaW5nLHVuaXRzKXt1bml0cz11bml0c3x8SW5maW5pdHk7dmFyIGNvZGVQb2ludDt2YXIgbGVuZ3RoPXN0cmluZy5sZW5ndGg7dmFyIGxlYWRTdXJyb2dhdGU9bnVsbDt2YXIgYnl0ZXM9W107Zm9yKHZhciBpPTA7aTxsZW5ndGg7KytpKXtjb2RlUG9pbnQ9c3RyaW5nLmNoYXJDb2RlQXQoaSk7aWYoY29kZVBvaW50PjU1Mjk1JiZjb2RlUG9pbnQ8NTczNDQpe2lmKCFsZWFkU3Vycm9nYXRlKXtpZihjb2RlUG9pbnQ+NTYzMTkpe2lmKCh1bml0cy09Myk+LTEpYnl0ZXMucHVzaCgyMzksMTkxLDE4OSk7Y29udGludWV9ZWxzZSBpZihpKzE9PT1sZW5ndGgpe2lmKCh1bml0cy09Myk+LTEpYnl0ZXMucHVzaCgyMzksMTkxLDE4OSk7Y29udGludWV9bGVhZFN1cnJvZ2F0ZT1jb2RlUG9pbnQ7Y29udGludWV9aWYoY29kZVBvaW50PDU2MzIwKXtpZigodW5pdHMtPTMpPi0xKWJ5dGVzLnB1c2goMjM5LDE5MSwxODkpO2xlYWRTdXJyb2dhdGU9Y29kZVBvaW50O2NvbnRpbnVlfWNvZGVQb2ludD0obGVhZFN1cnJvZ2F0ZS01NTI5Njw8MTB8Y29kZVBvaW50LTU2MzIwKSs2NTUzNn1lbHNlIGlmKGxlYWRTdXJyb2dhdGUpe2lmKCh1bml0cy09Myk+LTEpYnl0ZXMucHVzaCgyMzksMTkxLDE4OSl9bGVhZFN1cnJvZ2F0ZT1udWxsO2lmKGNvZGVQb2ludDwxMjgpe2lmKCh1bml0cy09MSk8MClicmVhaztieXRlcy5wdXNoKGNvZGVQb2ludCl9ZWxzZSBpZihjb2RlUG9pbnQ8MjA0OCl7aWYoKHVuaXRzLT0yKTwwKWJyZWFrO2J5dGVzLnB1c2goY29kZVBvaW50Pj42fDE5Mixjb2RlUG9pbnQmNjN8MTI4KX1lbHNlIGlmKGNvZGVQb2ludDw2NTUzNil7aWYoKHVuaXRzLT0zKTwwKWJyZWFrO2J5dGVzLnB1c2goY29kZVBvaW50Pj4xMnwyMjQsY29kZVBvaW50Pj42JjYzfDEyOCxjb2RlUG9pbnQmNjN8MTI4KX1lbHNlIGlmKGNvZGVQb2ludDwxMTE0MTEyKXtpZigodW5pdHMtPTQpPDApYnJlYWs7Ynl0ZXMucHVzaChjb2RlUG9pbnQ+PjE4fDI0MCxjb2RlUG9pbnQ+PjEyJjYzfDEyOCxjb2RlUG9pbnQ+PjYmNjN8MTI4LGNvZGVQb2ludCY2M3wxMjgpfWVsc2V7dGhyb3cgbmV3IEVycm9yKCJJbnZhbGlkIGNvZGUgcG9pbnQiKX19cmV0dXJuIGJ5dGVzfWZ1bmN0aW9uIGFzY2lpVG9CeXRlcyhzdHIpe3ZhciBieXRlQXJyYXk9W107Zm9yKHZhciBpPTA7aTxzdHIubGVuZ3RoOysraSl7Ynl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkmMjU1KX1yZXR1cm4gYnl0ZUFycmF5fWZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzKHN0cix1bml0cyl7dmFyIGMsaGksbG87dmFyIGJ5dGVBcnJheT1bXTtmb3IodmFyIGk9MDtpPHN0ci5sZW5ndGg7KytpKXtpZigodW5pdHMtPTIpPDApYnJlYWs7Yz1zdHIuY2hhckNvZGVBdChpKTtoaT1jPj44O2xvPWMlMjU2O2J5dGVBcnJheS5wdXNoKGxvKTtieXRlQXJyYXkucHVzaChoaSl9cmV0dXJuIGJ5dGVBcnJheX1mdW5jdGlvbiBiYXNlNjRUb0J5dGVzKHN0cil7cmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKX1mdW5jdGlvbiBibGl0QnVmZmVyKHNyYyxkc3Qsb2Zmc2V0LGxlbmd0aCl7Zm9yKHZhciBpPTA7aTxsZW5ndGg7KytpKXtpZihpK29mZnNldD49ZHN0Lmxlbmd0aHx8aT49c3JjLmxlbmd0aClicmVhaztkc3RbaStvZmZzZXRdPXNyY1tpXX1yZXR1cm4gaX1mdW5jdGlvbiBpc0luc3RhbmNlKG9iaix0eXBlKXtyZXR1cm4gb2JqIGluc3RhbmNlb2YgdHlwZXx8b2JqIT1udWxsJiZvYmouY29uc3RydWN0b3IhPW51bGwmJm9iai5jb25zdHJ1Y3Rvci5uYW1lIT1udWxsJiZvYmouY29uc3RydWN0b3IubmFtZT09PXR5cGUubmFtZX1mdW5jdGlvbiBudW1iZXJJc05hTihvYmope3JldHVybiBvYmohPT1vYmp9dmFyIGhleFNsaWNlTG9va3VwVGFibGU9ZnVuY3Rpb24oKXt2YXIgYWxwaGFiZXQ9IjAxMjM0NTY3ODlhYmNkZWYiO3ZhciB0YWJsZT1uZXcgQXJyYXkoMjU2KTtmb3IodmFyIGk9MDtpPDE2OysraSl7dmFyIGkxNj1pKjE2O2Zvcih2YXIgaj0wO2o8MTY7KytqKXt0YWJsZVtpMTYral09YWxwaGFiZXRbaV0rYWxwaGFiZXRbal19fXJldHVybiB0YWJsZX0oKX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7ImJhc2U2NC1qcyI6MjQsYnVmZmVyOjI3LGllZWU3NTQ6MzV9XSwyODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgVHJhbnNmb3JtPXJlcXVpcmUoInN0cmVhbSIpLlRyYW5zZm9ybTt2YXIgU3RyaW5nRGVjb2Rlcj1yZXF1aXJlKCJzdHJpbmdfZGVjb2RlciIpLlN0cmluZ0RlY29kZXI7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7ZnVuY3Rpb24gQ2lwaGVyQmFzZShoYXNoTW9kZSl7VHJhbnNmb3JtLmNhbGwodGhpcyk7dGhpcy5oYXNoTW9kZT10eXBlb2YgaGFzaE1vZGU9PT0ic3RyaW5nIjtpZih0aGlzLmhhc2hNb2RlKXt0aGlzW2hhc2hNb2RlXT10aGlzLl9maW5hbE9yRGlnZXN0fWVsc2V7dGhpcy5maW5hbD10aGlzLl9maW5hbE9yRGlnZXN0fWlmKHRoaXMuX2ZpbmFsKXt0aGlzLl9fZmluYWw9dGhpcy5fZmluYWw7dGhpcy5fZmluYWw9bnVsbH10aGlzLl9kZWNvZGVyPW51bGw7dGhpcy5fZW5jb2Rpbmc9bnVsbH1pbmhlcml0cyhDaXBoZXJCYXNlLFRyYW5zZm9ybSk7Q2lwaGVyQmFzZS5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKGRhdGEsaW5wdXRFbmMsb3V0cHV0RW5jKXtpZih0eXBlb2YgZGF0YT09PSJzdHJpbmciKXtkYXRhPUJ1ZmZlci5mcm9tKGRhdGEsaW5wdXRFbmMpfXZhciBvdXREYXRhPXRoaXMuX3VwZGF0ZShkYXRhKTtpZih0aGlzLmhhc2hNb2RlKXJldHVybiB0aGlzO2lmKG91dHB1dEVuYyl7b3V0RGF0YT10aGlzLl90b1N0cmluZyhvdXREYXRhLG91dHB1dEVuYyl9cmV0dXJuIG91dERhdGF9O0NpcGhlckJhc2UucHJvdG90eXBlLnNldEF1dG9QYWRkaW5nPWZ1bmN0aW9uKCl7fTtDaXBoZXJCYXNlLnByb3RvdHlwZS5nZXRBdXRoVGFnPWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJ0cnlpbmcgdG8gZ2V0IGF1dGggdGFnIGluIHVuc3VwcG9ydGVkIHN0YXRlIil9O0NpcGhlckJhc2UucHJvdG90eXBlLnNldEF1dGhUYWc9ZnVuY3Rpb24oKXt0aHJvdyBuZXcgRXJyb3IoInRyeWluZyB0byBzZXQgYXV0aCB0YWcgaW4gdW5zdXBwb3J0ZWQgc3RhdGUiKX07Q2lwaGVyQmFzZS5wcm90b3R5cGUuc2V0QUFEPWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJ0cnlpbmcgdG8gc2V0IGFhZCBpbiB1bnN1cHBvcnRlZCBzdGF0ZSIpfTtDaXBoZXJCYXNlLnByb3RvdHlwZS5fdHJhbnNmb3JtPWZ1bmN0aW9uKGRhdGEsXyxuZXh0KXt2YXIgZXJyO3RyeXtpZih0aGlzLmhhc2hNb2RlKXt0aGlzLl91cGRhdGUoZGF0YSl9ZWxzZXt0aGlzLnB1c2godGhpcy5fdXBkYXRlKGRhdGEpKX19Y2F0Y2goZSl7ZXJyPWV9ZmluYWxseXtuZXh0KGVycil9fTtDaXBoZXJCYXNlLnByb3RvdHlwZS5fZmx1c2g9ZnVuY3Rpb24oZG9uZSl7dmFyIGVycjt0cnl7dGhpcy5wdXNoKHRoaXMuX19maW5hbCgpKX1jYXRjaChlKXtlcnI9ZX1kb25lKGVycil9O0NpcGhlckJhc2UucHJvdG90eXBlLl9maW5hbE9yRGlnZXN0PWZ1bmN0aW9uKG91dHB1dEVuYyl7dmFyIG91dERhdGE9dGhpcy5fX2ZpbmFsKCl8fEJ1ZmZlci5hbGxvYygwKTtpZihvdXRwdXRFbmMpe291dERhdGE9dGhpcy5fdG9TdHJpbmcob3V0RGF0YSxvdXRwdXRFbmMsdHJ1ZSl9cmV0dXJuIG91dERhdGF9O0NpcGhlckJhc2UucHJvdG90eXBlLl90b1N0cmluZz1mdW5jdGlvbih2YWx1ZSxlbmMsZmluKXtpZighdGhpcy5fZGVjb2Rlcil7dGhpcy5fZGVjb2Rlcj1uZXcgU3RyaW5nRGVjb2RlcihlbmMpO3RoaXMuX2VuY29kaW5nPWVuY31pZih0aGlzLl9lbmNvZGluZyE9PWVuYyl0aHJvdyBuZXcgRXJyb3IoImNhbid0IHN3aXRjaCBlbmNvZGluZ3MiKTt2YXIgb3V0PXRoaXMuX2RlY29kZXIud3JpdGUodmFsdWUpO2lmKGZpbil7b3V0Kz10aGlzLl9kZWNvZGVyLmVuZCgpfXJldHVybiBvdXR9O21vZHVsZS5leHBvcnRzPUNpcGhlckJhc2V9LHtpbmhlcml0czozNiwic2FmZS1idWZmZXIiOjgzLHN0cmVhbToxMDIsc3RyaW5nX2RlY29kZXI6MTAzfV0sMjk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXtPX1JET05MWTowLE9fV1JPTkxZOjEsT19SRFdSOjIsU19JRk1UOjYxNDQwLFNfSUZSRUc6MzI3NjgsU19JRkRJUjoxNjM4NCxTX0lGQ0hSOjgxOTIsU19JRkJMSzoyNDU3NixTX0lGSUZPOjQwOTYsU19JRkxOSzo0MDk2MCxTX0lGU09DSzo0OTE1MixPX0NSRUFUOjUxMixPX0VYQ0w6MjA0OCxPX05PQ1RUWToxMzEwNzIsT19UUlVOQzoxMDI0LE9fQVBQRU5EOjgsT19ESVJFQ1RPUlk6MTA0ODU3NixPX05PRk9MTE9XOjI1NixPX1NZTkM6MTI4LE9fU1lNTElOSzoyMDk3MTUyLE9fTk9OQkxPQ0s6NCxTX0lSV1hVOjQ0OCxTX0lSVVNSOjI1NixTX0lXVVNSOjEyOCxTX0lYVVNSOjY0LFNfSVJXWEc6NTYsU19JUkdSUDozMixTX0lXR1JQOjE2LFNfSVhHUlA6OCxTX0lSV1hPOjcsU19JUk9USDo0LFNfSVdPVEg6MixTX0lYT1RIOjEsRTJCSUc6NyxFQUNDRVM6MTMsRUFERFJJTlVTRTo0OCxFQUREUk5PVEFWQUlMOjQ5LEVBRk5PU1VQUE9SVDo0NyxFQUdBSU46MzUsRUFMUkVBRFk6MzcsRUJBREY6OSxFQkFETVNHOjk0LEVCVVNZOjE2LEVDQU5DRUxFRDo4OSxFQ0hJTEQ6MTAsRUNPTk5BQk9SVEVEOjUzLEVDT05OUkVGVVNFRDo2MSxFQ09OTlJFU0VUOjU0LEVERUFETEs6MTEsRURFU1RBRERSUkVROjM5LEVET006MzMsRURRVU9UOjY5LEVFWElTVDoxNyxFRkFVTFQ6MTQsRUZCSUc6MjcsRUhPU1RVTlJFQUNIOjY1LEVJRFJNOjkwLEVJTFNFUTo5MixFSU5QUk9HUkVTUzozNixFSU5UUjo0LEVJTlZBTDoyMixFSU86NSxFSVNDT05OOjU2LEVJU0RJUjoyMSxFTE9PUDo2MixFTUZJTEU6MjQsRU1MSU5LOjMxLEVNU0dTSVpFOjQwLEVNVUxUSUhPUDo5NSxFTkFNRVRPT0xPTkc6NjMsRU5FVERPV046NTAsRU5FVFJFU0VUOjUyLEVORVRVTlJFQUNIOjUxLEVORklMRToyMyxFTk9CVUZTOjU1LEVOT0RBVEE6OTYsRU5PREVWOjE5LEVOT0VOVDoyLEVOT0VYRUM6OCxFTk9MQ0s6NzcsRU5PTElOSzo5NyxFTk9NRU06MTIsRU5PTVNHOjkxLEVOT1BST1RPT1BUOjQyLEVOT1NQQzoyOCxFTk9TUjo5OCxFTk9TVFI6OTksRU5PU1lTOjc4LEVOT1RDT05OOjU3LEVOT1RESVI6MjAsRU5PVEVNUFRZOjY2LEVOT1RTT0NLOjM4LEVOT1RTVVA6NDUsRU5PVFRZOjI1LEVOWElPOjYsRU9QTk9UU1VQUDoxMDIsRU9WRVJGTE9XOjg0LEVQRVJNOjEsRVBJUEU6MzIsRVBST1RPOjEwMCxFUFJPVE9OT1NVUFBPUlQ6NDMsRVBST1RPVFlQRTo0MSxFUkFOR0U6MzQsRVJPRlM6MzAsRVNQSVBFOjI5LEVTUkNIOjMsRVNUQUxFOjcwLEVUSU1FOjEwMSxFVElNRURPVVQ6NjAsRVRYVEJTWToyNixFV09VTERCTE9DSzozNSxFWERFVjoxOCxTSUdIVVA6MSxTSUdJTlQ6MixTSUdRVUlUOjMsU0lHSUxMOjQsU0lHVFJBUDo1LFNJR0FCUlQ6NixTSUdJT1Q6NixTSUdCVVM6MTAsU0lHRlBFOjgsU0lHS0lMTDo5LFNJR1VTUjE6MzAsU0lHU0VHVjoxMSxTSUdVU1IyOjMxLFNJR1BJUEU6MTMsU0lHQUxSTToxNCxTSUdURVJNOjE1LFNJR0NITEQ6MjAsU0lHQ09OVDoxOSxTSUdTVE9QOjE3LFNJR1RTVFA6MTgsU0lHVFRJTjoyMSxTSUdUVE9VOjIyLFNJR1VSRzoxNixTSUdYQ1BVOjI0LFNJR1hGU1o6MjUsU0lHVlRBTFJNOjI2LFNJR1BST0Y6MjcsU0lHV0lOQ0g6MjgsU0lHSU86MjMsU0lHU1lTOjEyLFNTTF9PUF9BTEw6MjE0NzQ4NjcxOSxTU0xfT1BfQUxMT1dfVU5TQUZFX0xFR0FDWV9SRU5FR09USUFUSU9OOjI2MjE0NCxTU0xfT1BfQ0lQSEVSX1NFUlZFUl9QUkVGRVJFTkNFOjQxOTQzMDQsU1NMX09QX0NJU0NPX0FOWUNPTk5FQ1Q6MzI3NjgsU1NMX09QX0NPT0tJRV9FWENIQU5HRTo4MTkyLFNTTF9PUF9DUllQVE9QUk9fVExTRVhUX0JVRzoyMTQ3NDgzNjQ4LFNTTF9PUF9ET05UX0lOU0VSVF9FTVBUWV9GUkFHTUVOVFM6MjA0OCxTU0xfT1BfRVBIRU1FUkFMX1JTQTowLFNTTF9PUF9MRUdBQ1lfU0VSVkVSX0NPTk5FQ1Q6NCxTU0xfT1BfTUlDUk9TT0ZUX0JJR19TU0xWM19CVUZGRVI6MzIsU1NMX09QX01JQ1JPU09GVF9TRVNTX0lEX0JVRzoxLFNTTF9PUF9NU0lFX1NTTFYyX1JTQV9QQURESU5HOjAsU1NMX09QX05FVFNDQVBFX0NBX0ROX0JVRzo1MzY4NzA5MTIsU1NMX09QX05FVFNDQVBFX0NIQUxMRU5HRV9CVUc6MixTU0xfT1BfTkVUU0NBUEVfREVNT19DSVBIRVJfQ0hBTkdFX0JVRzoxMDczNzQxODI0LFNTTF9PUF9ORVRTQ0FQRV9SRVVTRV9DSVBIRVJfQ0hBTkdFX0JVRzo4LFNTTF9PUF9OT19DT01QUkVTU0lPTjoxMzEwNzIsU1NMX09QX05PX1FVRVJZX01UVTo0MDk2LFNTTF9PUF9OT19TRVNTSU9OX1JFU1VNUFRJT05fT05fUkVORUdPVElBVElPTjo2NTUzNixTU0xfT1BfTk9fU1NMdjI6MTY3NzcyMTYsU1NMX09QX05PX1NTTHYzOjMzNTU0NDMyLFNTTF9PUF9OT19USUNLRVQ6MTYzODQsU1NMX09QX05PX1RMU3YxOjY3MTA4ODY0LFNTTF9PUF9OT19UTFN2MV8xOjI2ODQzNTQ1NixTU0xfT1BfTk9fVExTdjFfMjoxMzQyMTc3MjgsU1NMX09QX1BLQ1MxX0NIRUNLXzE6MCxTU0xfT1BfUEtDUzFfQ0hFQ0tfMjowLFNTTF9PUF9TSU5HTEVfREhfVVNFOjEwNDg1NzYsU1NMX09QX1NJTkdMRV9FQ0RIX1VTRTo1MjQyODgsU1NMX09QX1NTTEVBWV8wODBfQ0xJRU5UX0RIX0JVRzoxMjgsU1NMX09QX1NTTFJFRjJfUkVVU0VfQ0VSVF9UWVBFX0JVRzowLFNTTF9PUF9UTFNfQkxPQ0tfUEFERElOR19CVUc6NTEyLFNTTF9PUF9UTFNfRDVfQlVHOjI1NixTU0xfT1BfVExTX1JPTExCQUNLX0JVRzo4Mzg4NjA4LEVOR0lORV9NRVRIT0RfRFNBOjIsRU5HSU5FX01FVEhPRF9ESDo0LEVOR0lORV9NRVRIT0RfUkFORDo4LEVOR0lORV9NRVRIT0RfRUNESDoxNixFTkdJTkVfTUVUSE9EX0VDRFNBOjMyLEVOR0lORV9NRVRIT0RfQ0lQSEVSUzo2NCxFTkdJTkVfTUVUSE9EX0RJR0VTVFM6MTI4LEVOR0lORV9NRVRIT0RfU1RPUkU6MjU2LEVOR0lORV9NRVRIT0RfUEtFWV9NRVRIUzo1MTIsRU5HSU5FX01FVEhPRF9QS0VZX0FTTjFfTUVUSFM6MTAyNCxFTkdJTkVfTUVUSE9EX0FMTDo2NTUzNSxFTkdJTkVfTUVUSE9EX05PTkU6MCxESF9DSEVDS19QX05PVF9TQUZFX1BSSU1FOjIsREhfQ0hFQ0tfUF9OT1RfUFJJTUU6MSxESF9VTkFCTEVfVE9fQ0hFQ0tfR0VORVJBVE9SOjQsREhfTk9UX1NVSVRBQkxFX0dFTkVSQVRPUjo4LE5QTl9FTkFCTEVEOjEsUlNBX1BLQ1MxX1BBRERJTkc6MSxSU0FfU1NMVjIzX1BBRERJTkc6MixSU0FfTk9fUEFERElORzozLFJTQV9QS0NTMV9PQUVQX1BBRERJTkc6NCxSU0FfWDkzMV9QQURESU5HOjUsUlNBX1BLQ1MxX1BTU19QQURESU5HOjYsUE9JTlRfQ09OVkVSU0lPTl9DT01QUkVTU0VEOjIsUE9JTlRfQ09OVkVSU0lPTl9VTkNPTVBSRVNTRUQ6NCxQT0lOVF9DT05WRVJTSU9OX0hZQlJJRDo2LEZfT0s6MCxSX09LOjQsV19PSzoyLFhfT0s6MSxVVl9VRFBfUkVVU0VBRERSOjR9fSx7fV0sMzA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe2Z1bmN0aW9uIGlzQXJyYXkoYXJnKXtpZihBcnJheS5pc0FycmF5KXtyZXR1cm4gQXJyYXkuaXNBcnJheShhcmcpfXJldHVybiBvYmplY3RUb1N0cmluZyhhcmcpPT09IltvYmplY3QgQXJyYXldIn1leHBvcnRzLmlzQXJyYXk9aXNBcnJheTtmdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKXtyZXR1cm4gdHlwZW9mIGFyZz09PSJib29sZWFuIn1leHBvcnRzLmlzQm9vbGVhbj1pc0Jvb2xlYW47ZnVuY3Rpb24gaXNOdWxsKGFyZyl7cmV0dXJuIGFyZz09PW51bGx9ZXhwb3J0cy5pc051bGw9aXNOdWxsO2Z1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZyl7cmV0dXJuIGFyZz09bnVsbH1leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkPWlzTnVsbE9yVW5kZWZpbmVkO2Z1bmN0aW9uIGlzTnVtYmVyKGFyZyl7cmV0dXJuIHR5cGVvZiBhcmc9PT0ibnVtYmVyIn1leHBvcnRzLmlzTnVtYmVyPWlzTnVtYmVyO2Z1bmN0aW9uIGlzU3RyaW5nKGFyZyl7cmV0dXJuIHR5cGVvZiBhcmc9PT0ic3RyaW5nIn1leHBvcnRzLmlzU3RyaW5nPWlzU3RyaW5nO2Z1bmN0aW9uIGlzU3ltYm9sKGFyZyl7cmV0dXJuIHR5cGVvZiBhcmc9PT0ic3ltYm9sIn1leHBvcnRzLmlzU3ltYm9sPWlzU3ltYm9sO2Z1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZyl7cmV0dXJuIGFyZz09PXZvaWQgMH1leHBvcnRzLmlzVW5kZWZpbmVkPWlzVW5kZWZpbmVkO2Z1bmN0aW9uIGlzUmVnRXhwKHJlKXtyZXR1cm4gb2JqZWN0VG9TdHJpbmcocmUpPT09IltvYmplY3QgUmVnRXhwXSJ9ZXhwb3J0cy5pc1JlZ0V4cD1pc1JlZ0V4cDtmdW5jdGlvbiBpc09iamVjdChhcmcpe3JldHVybiB0eXBlb2YgYXJnPT09Im9iamVjdCImJmFyZyE9PW51bGx9ZXhwb3J0cy5pc09iamVjdD1pc09iamVjdDtmdW5jdGlvbiBpc0RhdGUoZCl7cmV0dXJuIG9iamVjdFRvU3RyaW5nKGQpPT09IltvYmplY3QgRGF0ZV0ifWV4cG9ydHMuaXNEYXRlPWlzRGF0ZTtmdW5jdGlvbiBpc0Vycm9yKGUpe3JldHVybiBvYmplY3RUb1N0cmluZyhlKT09PSJbb2JqZWN0IEVycm9yXSJ8fGUgaW5zdGFuY2VvZiBFcnJvcn1leHBvcnRzLmlzRXJyb3I9aXNFcnJvcjtmdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZyl7cmV0dXJuIHR5cGVvZiBhcmc9PT0iZnVuY3Rpb24ifWV4cG9ydHMuaXNGdW5jdGlvbj1pc0Z1bmN0aW9uO2Z1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZyl7cmV0dXJuIGFyZz09PW51bGx8fHR5cGVvZiBhcmc9PT0iYm9vbGVhbiJ8fHR5cGVvZiBhcmc9PT0ibnVtYmVyInx8dHlwZW9mIGFyZz09PSJzdHJpbmcifHx0eXBlb2YgYXJnPT09InN5bWJvbCJ8fHR5cGVvZiBhcmc9PT0idW5kZWZpbmVkIn1leHBvcnRzLmlzUHJpbWl0aXZlPWlzUHJpbWl0aXZlO2V4cG9ydHMuaXNCdWZmZXI9QnVmZmVyLmlzQnVmZmVyO2Z1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pe3JldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyl9fSkuY2FsbCh0aGlzLHtpc0J1ZmZlcjpyZXF1aXJlKCIuLi8uLi9pcy1idWZmZXIvaW5kZXguanMiKX0pfSx7Ii4uLy4uL2lzLWJ1ZmZlci9pbmRleC5qcyI6Mzd9XSwzMTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBNRDU9cmVxdWlyZSgibWQ1LmpzIik7dmFyIFJJUEVNRDE2MD1yZXF1aXJlKCJyaXBlbWQxNjAiKTt2YXIgc2hhPXJlcXVpcmUoInNoYS5qcyIpO3ZhciBCYXNlPXJlcXVpcmUoImNpcGhlci1iYXNlIik7ZnVuY3Rpb24gSGFzaChoYXNoKXtCYXNlLmNhbGwodGhpcywiZGlnZXN0Iik7dGhpcy5faGFzaD1oYXNofWluaGVyaXRzKEhhc2gsQmFzZSk7SGFzaC5wcm90b3R5cGUuX3VwZGF0ZT1mdW5jdGlvbihkYXRhKXt0aGlzLl9oYXNoLnVwZGF0ZShkYXRhKX07SGFzaC5wcm90b3R5cGUuX2ZpbmFsPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2hhc2guZGlnZXN0KCl9O21vZHVsZS5leHBvcnRzPWZ1bmN0aW9uIGNyZWF0ZUhhc2goYWxnKXthbGc9YWxnLnRvTG93ZXJDYXNlKCk7aWYoYWxnPT09Im1kNSIpcmV0dXJuIG5ldyBNRDU7aWYoYWxnPT09InJtZDE2MCJ8fGFsZz09PSJyaXBlbWQxNjAiKXJldHVybiBuZXcgUklQRU1EMTYwO3JldHVybiBuZXcgSGFzaChzaGEoYWxnKSl9fSx7ImNpcGhlci1iYXNlIjoyOCxpbmhlcml0czozNiwibWQ1LmpzIjozOSxyaXBlbWQxNjA6ODIsInNoYS5qcyI6OTV9XSwzMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIE1ENT1yZXF1aXJlKCJtZDUuanMiKTttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbihidWZmZXIpe3JldHVybihuZXcgTUQ1KS51cGRhdGUoYnVmZmVyKS5kaWdlc3QoKX19LHsibWQ1LmpzIjozOX1dLDMzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgb2JqZWN0Q3JlYXRlPU9iamVjdC5jcmVhdGV8fG9iamVjdENyZWF0ZVBvbHlmaWxsO3ZhciBvYmplY3RLZXlzPU9iamVjdC5rZXlzfHxvYmplY3RLZXlzUG9seWZpbGw7dmFyIGJpbmQ9RnVuY3Rpb24ucHJvdG90eXBlLmJpbmR8fGZ1bmN0aW9uQmluZFBvbHlmaWxsO2Z1bmN0aW9uIEV2ZW50RW1pdHRlcigpe2lmKCF0aGlzLl9ldmVudHN8fCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcywiX2V2ZW50cyIpKXt0aGlzLl9ldmVudHM9b2JqZWN0Q3JlYXRlKG51bGwpO3RoaXMuX2V2ZW50c0NvdW50PTB9dGhpcy5fbWF4TGlzdGVuZXJzPXRoaXMuX21heExpc3RlbmVyc3x8dW5kZWZpbmVkfW1vZHVsZS5leHBvcnRzPUV2ZW50RW1pdHRlcjtFdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyPUV2ZW50RW1pdHRlcjtFdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHM9dW5kZWZpbmVkO0V2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycz11bmRlZmluZWQ7dmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnM9MTA7dmFyIGhhc0RlZmluZVByb3BlcnR5O3RyeXt2YXIgbz17fTtpZihPYmplY3QuZGVmaW5lUHJvcGVydHkpT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIngiLHt2YWx1ZTowfSk7aGFzRGVmaW5lUHJvcGVydHk9by54PT09MH1jYXRjaChlcnIpe2hhc0RlZmluZVByb3BlcnR5PWZhbHNlfWlmKGhhc0RlZmluZVByb3BlcnR5KXtPYmplY3QuZGVmaW5lUHJvcGVydHkoRXZlbnRFbWl0dGVyLCJkZWZhdWx0TWF4TGlzdGVuZXJzIix7ZW51bWVyYWJsZTp0cnVlLGdldDpmdW5jdGlvbigpe3JldHVybiBkZWZhdWx0TWF4TGlzdGVuZXJzfSxzZXQ6ZnVuY3Rpb24oYXJnKXtpZih0eXBlb2YgYXJnIT09Im51bWJlciJ8fGFyZzwwfHxhcmchPT1hcmcpdGhyb3cgbmV3IFR5cGVFcnJvcignImRlZmF1bHRNYXhMaXN0ZW5lcnMiIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtkZWZhdWx0TWF4TGlzdGVuZXJzPWFyZ319KX1lbHNle0V2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzPWRlZmF1bHRNYXhMaXN0ZW5lcnN9RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnM9ZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKG4pe2lmKHR5cGVvZiBuIT09Im51bWJlciJ8fG48MHx8aXNOYU4obikpdGhyb3cgbmV3IFR5cGVFcnJvcignIm4iIGFyZ3VtZW50IG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTt0aGlzLl9tYXhMaXN0ZW5lcnM9bjtyZXR1cm4gdGhpc307ZnVuY3Rpb24gJGdldE1heExpc3RlbmVycyh0aGF0KXtpZih0aGF0Ll9tYXhMaXN0ZW5lcnM9PT11bmRlZmluZWQpcmV0dXJuIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO3JldHVybiB0aGF0Ll9tYXhMaXN0ZW5lcnN9RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5nZXRNYXhMaXN0ZW5lcnM9ZnVuY3Rpb24gZ2V0TWF4TGlzdGVuZXJzKCl7cmV0dXJuICRnZXRNYXhMaXN0ZW5lcnModGhpcyl9O2Z1bmN0aW9uIGVtaXROb25lKGhhbmRsZXIsaXNGbixzZWxmKXtpZihpc0ZuKWhhbmRsZXIuY2FsbChzZWxmKTtlbHNle3ZhciBsZW49aGFuZGxlci5sZW5ndGg7dmFyIGxpc3RlbmVycz1hcnJheUNsb25lKGhhbmRsZXIsbGVuKTtmb3IodmFyIGk9MDtpPGxlbjsrK2kpbGlzdGVuZXJzW2ldLmNhbGwoc2VsZil9fWZ1bmN0aW9uIGVtaXRPbmUoaGFuZGxlcixpc0ZuLHNlbGYsYXJnMSl7aWYoaXNGbiloYW5kbGVyLmNhbGwoc2VsZixhcmcxKTtlbHNle3ZhciBsZW49aGFuZGxlci5sZW5ndGg7dmFyIGxpc3RlbmVycz1hcnJheUNsb25lKGhhbmRsZXIsbGVuKTtmb3IodmFyIGk9MDtpPGxlbjsrK2kpbGlzdGVuZXJzW2ldLmNhbGwoc2VsZixhcmcxKX19ZnVuY3Rpb24gZW1pdFR3byhoYW5kbGVyLGlzRm4sc2VsZixhcmcxLGFyZzIpe2lmKGlzRm4paGFuZGxlci5jYWxsKHNlbGYsYXJnMSxhcmcyKTtlbHNle3ZhciBsZW49aGFuZGxlci5sZW5ndGg7dmFyIGxpc3RlbmVycz1hcnJheUNsb25lKGhhbmRsZXIsbGVuKTtmb3IodmFyIGk9MDtpPGxlbjsrK2kpbGlzdGVuZXJzW2ldLmNhbGwoc2VsZixhcmcxLGFyZzIpfX1mdW5jdGlvbiBlbWl0VGhyZWUoaGFuZGxlcixpc0ZuLHNlbGYsYXJnMSxhcmcyLGFyZzMpe2lmKGlzRm4paGFuZGxlci5jYWxsKHNlbGYsYXJnMSxhcmcyLGFyZzMpO2Vsc2V7dmFyIGxlbj1oYW5kbGVyLmxlbmd0aDt2YXIgbGlzdGVuZXJzPWFycmF5Q2xvbmUoaGFuZGxlcixsZW4pO2Zvcih2YXIgaT0wO2k8bGVuOysraSlsaXN0ZW5lcnNbaV0uY2FsbChzZWxmLGFyZzEsYXJnMixhcmczKX19ZnVuY3Rpb24gZW1pdE1hbnkoaGFuZGxlcixpc0ZuLHNlbGYsYXJncyl7aWYoaXNGbiloYW5kbGVyLmFwcGx5KHNlbGYsYXJncyk7ZWxzZXt2YXIgbGVuPWhhbmRsZXIubGVuZ3RoO3ZhciBsaXN0ZW5lcnM9YXJyYXlDbG9uZShoYW5kbGVyLGxlbik7Zm9yKHZhciBpPTA7aTxsZW47KytpKWxpc3RlbmVyc1tpXS5hcHBseShzZWxmLGFyZ3MpfX1FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQ9ZnVuY3Rpb24gZW1pdCh0eXBlKXt2YXIgZXIsaGFuZGxlcixsZW4sYXJncyxpLGV2ZW50czt2YXIgZG9FcnJvcj10eXBlPT09ImVycm9yIjtldmVudHM9dGhpcy5fZXZlbnRzO2lmKGV2ZW50cylkb0Vycm9yPWRvRXJyb3ImJmV2ZW50cy5lcnJvcj09bnVsbDtlbHNlIGlmKCFkb0Vycm9yKXJldHVybiBmYWxzZTtpZihkb0Vycm9yKXtpZihhcmd1bWVudHMubGVuZ3RoPjEpZXI9YXJndW1lbnRzWzFdO2lmKGVyIGluc3RhbmNlb2YgRXJyb3Ipe3Rocm93IGVyfWVsc2V7dmFyIGVycj1uZXcgRXJyb3IoJ1VuaGFuZGxlZCAiZXJyb3IiIGV2ZW50LiAoJytlcisiKSIpO2Vyci5jb250ZXh0PWVyO3Rocm93IGVycn1yZXR1cm4gZmFsc2V9aGFuZGxlcj1ldmVudHNbdHlwZV07aWYoIWhhbmRsZXIpcmV0dXJuIGZhbHNlO3ZhciBpc0ZuPXR5cGVvZiBoYW5kbGVyPT09ImZ1bmN0aW9uIjtsZW49YXJndW1lbnRzLmxlbmd0aDtzd2l0Y2gobGVuKXtjYXNlIDE6ZW1pdE5vbmUoaGFuZGxlcixpc0ZuLHRoaXMpO2JyZWFrO2Nhc2UgMjplbWl0T25lKGhhbmRsZXIsaXNGbix0aGlzLGFyZ3VtZW50c1sxXSk7YnJlYWs7Y2FzZSAzOmVtaXRUd28oaGFuZGxlcixpc0ZuLHRoaXMsYXJndW1lbnRzWzFdLGFyZ3VtZW50c1syXSk7YnJlYWs7Y2FzZSA0OmVtaXRUaHJlZShoYW5kbGVyLGlzRm4sdGhpcyxhcmd1bWVudHNbMV0sYXJndW1lbnRzWzJdLGFyZ3VtZW50c1szXSk7YnJlYWs7ZGVmYXVsdDphcmdzPW5ldyBBcnJheShsZW4tMSk7Zm9yKGk9MTtpPGxlbjtpKyspYXJnc1tpLTFdPWFyZ3VtZW50c1tpXTtlbWl0TWFueShoYW5kbGVyLGlzRm4sdGhpcyxhcmdzKX1yZXR1cm4gdHJ1ZX07ZnVuY3Rpb24gX2FkZExpc3RlbmVyKHRhcmdldCx0eXBlLGxpc3RlbmVyLHByZXBlbmQpe3ZhciBtO3ZhciBldmVudHM7dmFyIGV4aXN0aW5nO2lmKHR5cGVvZiBsaXN0ZW5lciE9PSJmdW5jdGlvbiIpdGhyb3cgbmV3IFR5cGVFcnJvcignImxpc3RlbmVyIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtldmVudHM9dGFyZ2V0Ll9ldmVudHM7aWYoIWV2ZW50cyl7ZXZlbnRzPXRhcmdldC5fZXZlbnRzPW9iamVjdENyZWF0ZShudWxsKTt0YXJnZXQuX2V2ZW50c0NvdW50PTB9ZWxzZXtpZihldmVudHMubmV3TGlzdGVuZXIpe3RhcmdldC5lbWl0KCJuZXdMaXN0ZW5lciIsdHlwZSxsaXN0ZW5lci5saXN0ZW5lcj9saXN0ZW5lci5saXN0ZW5lcjpsaXN0ZW5lcik7ZXZlbnRzPXRhcmdldC5fZXZlbnRzfWV4aXN0aW5nPWV2ZW50c1t0eXBlXX1pZighZXhpc3Rpbmcpe2V4aXN0aW5nPWV2ZW50c1t0eXBlXT1saXN0ZW5lcjsrK3RhcmdldC5fZXZlbnRzQ291bnR9ZWxzZXtpZih0eXBlb2YgZXhpc3Rpbmc9PT0iZnVuY3Rpb24iKXtleGlzdGluZz1ldmVudHNbdHlwZV09cHJlcGVuZD9bbGlzdGVuZXIsZXhpc3RpbmddOltleGlzdGluZyxsaXN0ZW5lcl19ZWxzZXtpZihwcmVwZW5kKXtleGlzdGluZy51bnNoaWZ0KGxpc3RlbmVyKX1lbHNle2V4aXN0aW5nLnB1c2gobGlzdGVuZXIpfX1pZighZXhpc3Rpbmcud2FybmVkKXttPSRnZXRNYXhMaXN0ZW5lcnModGFyZ2V0KTtpZihtJiZtPjAmJmV4aXN0aW5nLmxlbmd0aD5tKXtleGlzdGluZy53YXJuZWQ9dHJ1ZTt2YXIgdz1uZXcgRXJyb3IoIlBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgbGVhayBkZXRlY3RlZC4gIitleGlzdGluZy5sZW5ndGgrJyAiJytTdHJpbmcodHlwZSkrJyIgbGlzdGVuZXJzICcrImFkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byAiKyJpbmNyZWFzZSBsaW1pdC4iKTt3Lm5hbWU9Ik1heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyI7dy5lbWl0dGVyPXRhcmdldDt3LnR5cGU9dHlwZTt3LmNvdW50PWV4aXN0aW5nLmxlbmd0aDtpZih0eXBlb2YgY29uc29sZT09PSJvYmplY3QiJiZjb25zb2xlLndhcm4pe2NvbnNvbGUud2FybigiJXM6ICVzIix3Lm5hbWUsdy5tZXNzYWdlKX19fX1yZXR1cm4gdGFyZ2V0fUV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI9ZnVuY3Rpb24gYWRkTGlzdGVuZXIodHlwZSxsaXN0ZW5lcil7cmV0dXJuIF9hZGRMaXN0ZW5lcih0aGlzLHR5cGUsbGlzdGVuZXIsZmFsc2UpfTtFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uPUV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXI9ZnVuY3Rpb24gcHJlcGVuZExpc3RlbmVyKHR5cGUsbGlzdGVuZXIpe3JldHVybiBfYWRkTGlzdGVuZXIodGhpcyx0eXBlLGxpc3RlbmVyLHRydWUpfTtmdW5jdGlvbiBvbmNlV3JhcHBlcigpe2lmKCF0aGlzLmZpcmVkKXt0aGlzLnRhcmdldC5yZW1vdmVMaXN0ZW5lcih0aGlzLnR5cGUsdGhpcy53cmFwRm4pO3RoaXMuZmlyZWQ9dHJ1ZTtzd2l0Y2goYXJndW1lbnRzLmxlbmd0aCl7Y2FzZSAwOnJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQpO2Nhc2UgMTpyZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LGFyZ3VtZW50c1swXSk7Y2FzZSAyOnJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQsYXJndW1lbnRzWzBdLGFyZ3VtZW50c1sxXSk7Y2FzZSAzOnJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQsYXJndW1lbnRzWzBdLGFyZ3VtZW50c1sxXSxhcmd1bWVudHNbMl0pO2RlZmF1bHQ6dmFyIGFyZ3M9bmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO2Zvcih2YXIgaT0wO2k8YXJncy5sZW5ndGg7KytpKWFyZ3NbaV09YXJndW1lbnRzW2ldO3RoaXMubGlzdGVuZXIuYXBwbHkodGhpcy50YXJnZXQsYXJncyl9fX1mdW5jdGlvbiBfb25jZVdyYXAodGFyZ2V0LHR5cGUsbGlzdGVuZXIpe3ZhciBzdGF0ZT17ZmlyZWQ6ZmFsc2Usd3JhcEZuOnVuZGVmaW5lZCx0YXJnZXQ6dGFyZ2V0LHR5cGU6dHlwZSxsaXN0ZW5lcjpsaXN0ZW5lcn07dmFyIHdyYXBwZWQ9YmluZC5jYWxsKG9uY2VXcmFwcGVyLHN0YXRlKTt3cmFwcGVkLmxpc3RlbmVyPWxpc3RlbmVyO3N0YXRlLndyYXBGbj13cmFwcGVkO3JldHVybiB3cmFwcGVkfUV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZT1mdW5jdGlvbiBvbmNlKHR5cGUsbGlzdGVuZXIpe2lmKHR5cGVvZiBsaXN0ZW5lciE9PSJmdW5jdGlvbiIpdGhyb3cgbmV3IFR5cGVFcnJvcignImxpc3RlbmVyIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTt0aGlzLm9uKHR5cGUsX29uY2VXcmFwKHRoaXMsdHlwZSxsaXN0ZW5lcikpO3JldHVybiB0aGlzfTtFdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXI9ZnVuY3Rpb24gcHJlcGVuZE9uY2VMaXN0ZW5lcih0eXBlLGxpc3RlbmVyKXtpZih0eXBlb2YgbGlzdGVuZXIhPT0iZnVuY3Rpb24iKXRocm93IG5ldyBUeXBlRXJyb3IoJyJsaXN0ZW5lciIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7dGhpcy5wcmVwZW5kTGlzdGVuZXIodHlwZSxfb25jZVdyYXAodGhpcyx0eXBlLGxpc3RlbmVyKSk7cmV0dXJuIHRoaXN9O0V2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI9ZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIodHlwZSxsaXN0ZW5lcil7dmFyIGxpc3QsZXZlbnRzLHBvc2l0aW9uLGksb3JpZ2luYWxMaXN0ZW5lcjtpZih0eXBlb2YgbGlzdGVuZXIhPT0iZnVuY3Rpb24iKXRocm93IG5ldyBUeXBlRXJyb3IoJyJsaXN0ZW5lciIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7ZXZlbnRzPXRoaXMuX2V2ZW50cztpZighZXZlbnRzKXJldHVybiB0aGlzO2xpc3Q9ZXZlbnRzW3R5cGVdO2lmKCFsaXN0KXJldHVybiB0aGlzO2lmKGxpc3Q9PT1saXN0ZW5lcnx8bGlzdC5saXN0ZW5lcj09PWxpc3RlbmVyKXtpZigtLXRoaXMuX2V2ZW50c0NvdW50PT09MCl0aGlzLl9ldmVudHM9b2JqZWN0Q3JlYXRlKG51bGwpO2Vsc2V7ZGVsZXRlIGV2ZW50c1t0eXBlXTtpZihldmVudHMucmVtb3ZlTGlzdGVuZXIpdGhpcy5lbWl0KCJyZW1vdmVMaXN0ZW5lciIsdHlwZSxsaXN0Lmxpc3RlbmVyfHxsaXN0ZW5lcil9fWVsc2UgaWYodHlwZW9mIGxpc3QhPT0iZnVuY3Rpb24iKXtwb3NpdGlvbj0tMTtmb3IoaT1saXN0Lmxlbmd0aC0xO2k+PTA7aS0tKXtpZihsaXN0W2ldPT09bGlzdGVuZXJ8fGxpc3RbaV0ubGlzdGVuZXI9PT1saXN0ZW5lcil7b3JpZ2luYWxMaXN0ZW5lcj1saXN0W2ldLmxpc3RlbmVyO3Bvc2l0aW9uPWk7YnJlYWt9fWlmKHBvc2l0aW9uPDApcmV0dXJuIHRoaXM7aWYocG9zaXRpb249PT0wKWxpc3Quc2hpZnQoKTtlbHNlIHNwbGljZU9uZShsaXN0LHBvc2l0aW9uKTtpZihsaXN0Lmxlbmd0aD09PTEpZXZlbnRzW3R5cGVdPWxpc3RbMF07aWYoZXZlbnRzLnJlbW92ZUxpc3RlbmVyKXRoaXMuZW1pdCgicmVtb3ZlTGlzdGVuZXIiLHR5cGUsb3JpZ2luYWxMaXN0ZW5lcnx8bGlzdGVuZXIpfXJldHVybiB0aGlzfTtFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycz1mdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnModHlwZSl7dmFyIGxpc3RlbmVycyxldmVudHMsaTtldmVudHM9dGhpcy5fZXZlbnRzO2lmKCFldmVudHMpcmV0dXJuIHRoaXM7aWYoIWV2ZW50cy5yZW1vdmVMaXN0ZW5lcil7aWYoYXJndW1lbnRzLmxlbmd0aD09PTApe3RoaXMuX2V2ZW50cz1vYmplY3RDcmVhdGUobnVsbCk7dGhpcy5fZXZlbnRzQ291bnQ9MH1lbHNlIGlmKGV2ZW50c1t0eXBlXSl7aWYoLS10aGlzLl9ldmVudHNDb3VudD09PTApdGhpcy5fZXZlbnRzPW9iamVjdENyZWF0ZShudWxsKTtlbHNlIGRlbGV0ZSBldmVudHNbdHlwZV19cmV0dXJuIHRoaXN9aWYoYXJndW1lbnRzLmxlbmd0aD09PTApe3ZhciBrZXlzPW9iamVjdEtleXMoZXZlbnRzKTt2YXIga2V5O2ZvcihpPTA7aTxrZXlzLmxlbmd0aDsrK2kpe2tleT1rZXlzW2ldO2lmKGtleT09PSJyZW1vdmVMaXN0ZW5lciIpY29udGludWU7dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KX10aGlzLnJlbW92ZUFsbExpc3RlbmVycygicmVtb3ZlTGlzdGVuZXIiKTt0aGlzLl9ldmVudHM9b2JqZWN0Q3JlYXRlKG51bGwpO3RoaXMuX2V2ZW50c0NvdW50PTA7cmV0dXJuIHRoaXN9bGlzdGVuZXJzPWV2ZW50c1t0eXBlXTtpZih0eXBlb2YgbGlzdGVuZXJzPT09ImZ1bmN0aW9uIil7dGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLGxpc3RlbmVycyl9ZWxzZSBpZihsaXN0ZW5lcnMpe2ZvcihpPWxpc3RlbmVycy5sZW5ndGgtMTtpPj0wO2ktLSl7dGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLGxpc3RlbmVyc1tpXSl9fXJldHVybiB0aGlzfTtmdW5jdGlvbiBfbGlzdGVuZXJzKHRhcmdldCx0eXBlLHVud3JhcCl7dmFyIGV2ZW50cz10YXJnZXQuX2V2ZW50cztpZighZXZlbnRzKXJldHVybltdO3ZhciBldmxpc3RlbmVyPWV2ZW50c1t0eXBlXTtpZighZXZsaXN0ZW5lcilyZXR1cm5bXTtpZih0eXBlb2YgZXZsaXN0ZW5lcj09PSJmdW5jdGlvbiIpcmV0dXJuIHVud3JhcD9bZXZsaXN0ZW5lci5saXN0ZW5lcnx8ZXZsaXN0ZW5lcl06W2V2bGlzdGVuZXJdO3JldHVybiB1bndyYXA/dW53cmFwTGlzdGVuZXJzKGV2bGlzdGVuZXIpOmFycmF5Q2xvbmUoZXZsaXN0ZW5lcixldmxpc3RlbmVyLmxlbmd0aCl9RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnM9ZnVuY3Rpb24gbGlzdGVuZXJzKHR5cGUpe3JldHVybiBfbGlzdGVuZXJzKHRoaXMsdHlwZSx0cnVlKX07RXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yYXdMaXN0ZW5lcnM9ZnVuY3Rpb24gcmF3TGlzdGVuZXJzKHR5cGUpe3JldHVybiBfbGlzdGVuZXJzKHRoaXMsdHlwZSxmYWxzZSl9O0V2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50PWZ1bmN0aW9uKGVtaXR0ZXIsdHlwZSl7aWYodHlwZW9mIGVtaXR0ZXIubGlzdGVuZXJDb3VudD09PSJmdW5jdGlvbiIpe3JldHVybiBlbWl0dGVyLmxpc3RlbmVyQ291bnQodHlwZSl9ZWxzZXtyZXR1cm4gbGlzdGVuZXJDb3VudC5jYWxsKGVtaXR0ZXIsdHlwZSl9fTtFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQ9bGlzdGVuZXJDb3VudDtmdW5jdGlvbiBsaXN0ZW5lckNvdW50KHR5cGUpe3ZhciBldmVudHM9dGhpcy5fZXZlbnRzO2lmKGV2ZW50cyl7dmFyIGV2bGlzdGVuZXI9ZXZlbnRzW3R5cGVdO2lmKHR5cGVvZiBldmxpc3RlbmVyPT09ImZ1bmN0aW9uIil7cmV0dXJuIDF9ZWxzZSBpZihldmxpc3RlbmVyKXtyZXR1cm4gZXZsaXN0ZW5lci5sZW5ndGh9fXJldHVybiAwfUV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcz1mdW5jdGlvbiBldmVudE5hbWVzKCl7cmV0dXJuIHRoaXMuX2V2ZW50c0NvdW50PjA/UmVmbGVjdC5vd25LZXlzKHRoaXMuX2V2ZW50cyk6W119O2Z1bmN0aW9uIHNwbGljZU9uZShsaXN0LGluZGV4KXtmb3IodmFyIGk9aW5kZXgsaz1pKzEsbj1saXN0Lmxlbmd0aDtrPG47aSs9MSxrKz0xKWxpc3RbaV09bGlzdFtrXTtsaXN0LnBvcCgpfWZ1bmN0aW9uIGFycmF5Q2xvbmUoYXJyLG4pe3ZhciBjb3B5PW5ldyBBcnJheShuKTtmb3IodmFyIGk9MDtpPG47KytpKWNvcHlbaV09YXJyW2ldO3JldHVybiBjb3B5fWZ1bmN0aW9uIHVud3JhcExpc3RlbmVycyhhcnIpe3ZhciByZXQ9bmV3IEFycmF5KGFyci5sZW5ndGgpO2Zvcih2YXIgaT0wO2k8cmV0Lmxlbmd0aDsrK2kpe3JldFtpXT1hcnJbaV0ubGlzdGVuZXJ8fGFycltpXX1yZXR1cm4gcmV0fWZ1bmN0aW9uIG9iamVjdENyZWF0ZVBvbHlmaWxsKHByb3RvKXt2YXIgRj1mdW5jdGlvbigpe307Ri5wcm90b3R5cGU9cHJvdG87cmV0dXJuIG5ldyBGfWZ1bmN0aW9uIG9iamVjdEtleXNQb2x5ZmlsbChvYmope3ZhciBrZXlzPVtdO2Zvcih2YXIgayBpbiBvYmopaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaixrKSl7a2V5cy5wdXNoKGspfXJldHVybiBrfWZ1bmN0aW9uIGZ1bmN0aW9uQmluZFBvbHlmaWxsKGNvbnRleHQpe3ZhciBmbj10aGlzO3JldHVybiBmdW5jdGlvbigpe3JldHVybiBmbi5hcHBseShjb250ZXh0LGFyZ3VtZW50cyl9fX0se31dLDM0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgVHJhbnNmb3JtPXJlcXVpcmUoInN0cmVhbSIpLlRyYW5zZm9ybTt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTtmdW5jdGlvbiB0aHJvd0lmTm90U3RyaW5nT3JCdWZmZXIodmFsLHByZWZpeCl7aWYoIUJ1ZmZlci5pc0J1ZmZlcih2YWwpJiZ0eXBlb2YgdmFsIT09InN0cmluZyIpe3Rocm93IG5ldyBUeXBlRXJyb3IocHJlZml4KyIgbXVzdCBiZSBhIHN0cmluZyBvciBhIGJ1ZmZlciIpfX1mdW5jdGlvbiBIYXNoQmFzZShibG9ja1NpemUpe1RyYW5zZm9ybS5jYWxsKHRoaXMpO3RoaXMuX2Jsb2NrPUJ1ZmZlci5hbGxvY1Vuc2FmZShibG9ja1NpemUpO3RoaXMuX2Jsb2NrU2l6ZT1ibG9ja1NpemU7dGhpcy5fYmxvY2tPZmZzZXQ9MDt0aGlzLl9sZW5ndGg9WzAsMCwwLDBdO3RoaXMuX2ZpbmFsaXplZD1mYWxzZX1pbmhlcml0cyhIYXNoQmFzZSxUcmFuc2Zvcm0pO0hhc2hCYXNlLnByb3RvdHlwZS5fdHJhbnNmb3JtPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNhbGxiYWNrKXt2YXIgZXJyb3I9bnVsbDt0cnl7dGhpcy51cGRhdGUoY2h1bmssZW5jb2RpbmcpfWNhdGNoKGVycil7ZXJyb3I9ZXJyfWNhbGxiYWNrKGVycm9yKX07SGFzaEJhc2UucHJvdG90eXBlLl9mbHVzaD1mdW5jdGlvbihjYWxsYmFjayl7dmFyIGVycm9yPW51bGw7dHJ5e3RoaXMucHVzaCh0aGlzLmRpZ2VzdCgpKX1jYXRjaChlcnIpe2Vycm9yPWVycn1jYWxsYmFjayhlcnJvcil9O0hhc2hCYXNlLnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24oZGF0YSxlbmNvZGluZyl7dGhyb3dJZk5vdFN0cmluZ09yQnVmZmVyKGRhdGEsIkRhdGEiKTtpZih0aGlzLl9maW5hbGl6ZWQpdGhyb3cgbmV3IEVycm9yKCJEaWdlc3QgYWxyZWFkeSBjYWxsZWQiKTtpZighQnVmZmVyLmlzQnVmZmVyKGRhdGEpKWRhdGE9QnVmZmVyLmZyb20oZGF0YSxlbmNvZGluZyk7dmFyIGJsb2NrPXRoaXMuX2Jsb2NrO3ZhciBvZmZzZXQ9MDt3aGlsZSh0aGlzLl9ibG9ja09mZnNldCtkYXRhLmxlbmd0aC1vZmZzZXQ+PXRoaXMuX2Jsb2NrU2l6ZSl7Zm9yKHZhciBpPXRoaXMuX2Jsb2NrT2Zmc2V0O2k8dGhpcy5fYmxvY2tTaXplOylibG9ja1tpKytdPWRhdGFbb2Zmc2V0KytdO3RoaXMuX3VwZGF0ZSgpO3RoaXMuX2Jsb2NrT2Zmc2V0PTB9d2hpbGUob2Zmc2V0PGRhdGEubGVuZ3RoKWJsb2NrW3RoaXMuX2Jsb2NrT2Zmc2V0KytdPWRhdGFbb2Zmc2V0KytdO2Zvcih2YXIgaj0wLGNhcnJ5PWRhdGEubGVuZ3RoKjg7Y2Fycnk+MDsrK2ope3RoaXMuX2xlbmd0aFtqXSs9Y2Fycnk7Y2Fycnk9dGhpcy5fbGVuZ3RoW2pdLzQyOTQ5NjcyOTZ8MDtpZihjYXJyeT4wKXRoaXMuX2xlbmd0aFtqXS09NDI5NDk2NzI5NipjYXJyeX1yZXR1cm4gdGhpc307SGFzaEJhc2UucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oKXt0aHJvdyBuZXcgRXJyb3IoIl91cGRhdGUgaXMgbm90IGltcGxlbWVudGVkIil9O0hhc2hCYXNlLnByb3RvdHlwZS5kaWdlc3Q9ZnVuY3Rpb24oZW5jb2Rpbmcpe2lmKHRoaXMuX2ZpbmFsaXplZCl0aHJvdyBuZXcgRXJyb3IoIkRpZ2VzdCBhbHJlYWR5IGNhbGxlZCIpO3RoaXMuX2ZpbmFsaXplZD10cnVlO3ZhciBkaWdlc3Q9dGhpcy5fZGlnZXN0KCk7aWYoZW5jb2RpbmchPT11bmRlZmluZWQpZGlnZXN0PWRpZ2VzdC50b1N0cmluZyhlbmNvZGluZyk7dGhpcy5fYmxvY2suZmlsbCgwKTt0aGlzLl9ibG9ja09mZnNldD0wO2Zvcih2YXIgaT0wO2k8NDsrK2kpdGhpcy5fbGVuZ3RoW2ldPTA7cmV0dXJuIGRpZ2VzdH07SGFzaEJhc2UucHJvdG90eXBlLl9kaWdlc3Q9ZnVuY3Rpb24oKXt0aHJvdyBuZXcgRXJyb3IoIl9kaWdlc3QgaXMgbm90IGltcGxlbWVudGVkIil9O21vZHVsZS5leHBvcnRzPUhhc2hCYXNlfSx7aW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4MyxzdHJlYW06MTAyfV0sMzU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2V4cG9ydHMucmVhZD1mdW5jdGlvbihidWZmZXIsb2Zmc2V0LGlzTEUsbUxlbixuQnl0ZXMpe3ZhciBlLG07dmFyIGVMZW49bkJ5dGVzKjgtbUxlbi0xO3ZhciBlTWF4PSgxPDxlTGVuKS0xO3ZhciBlQmlhcz1lTWF4Pj4xO3ZhciBuQml0cz0tNzt2YXIgaT1pc0xFP25CeXRlcy0xOjA7dmFyIGQ9aXNMRT8tMToxO3ZhciBzPWJ1ZmZlcltvZmZzZXQraV07aSs9ZDtlPXMmKDE8PC1uQml0cyktMTtzPj49LW5CaXRzO25CaXRzKz1lTGVuO2Zvcig7bkJpdHM+MDtlPWUqMjU2K2J1ZmZlcltvZmZzZXQraV0saSs9ZCxuQml0cy09OCl7fW09ZSYoMTw8LW5CaXRzKS0xO2U+Pj0tbkJpdHM7bkJpdHMrPW1MZW47Zm9yKDtuQml0cz4wO209bSoyNTYrYnVmZmVyW29mZnNldCtpXSxpKz1kLG5CaXRzLT04KXt9aWYoZT09PTApe2U9MS1lQmlhc31lbHNlIGlmKGU9PT1lTWF4KXtyZXR1cm4gbT9OYU46KHM/LTE6MSkqSW5maW5pdHl9ZWxzZXttPW0rTWF0aC5wb3coMixtTGVuKTtlPWUtZUJpYXN9cmV0dXJuKHM/LTE6MSkqbSpNYXRoLnBvdygyLGUtbUxlbil9O2V4cG9ydHMud3JpdGU9ZnVuY3Rpb24oYnVmZmVyLHZhbHVlLG9mZnNldCxpc0xFLG1MZW4sbkJ5dGVzKXt2YXIgZSxtLGM7dmFyIGVMZW49bkJ5dGVzKjgtbUxlbi0xO3ZhciBlTWF4PSgxPDxlTGVuKS0xO3ZhciBlQmlhcz1lTWF4Pj4xO3ZhciBydD1tTGVuPT09MjM/TWF0aC5wb3coMiwtMjQpLU1hdGgucG93KDIsLTc3KTowO3ZhciBpPWlzTEU/MDpuQnl0ZXMtMTt2YXIgZD1pc0xFPzE6LTE7dmFyIHM9dmFsdWU8MHx8dmFsdWU9PT0wJiYxL3ZhbHVlPDA/MTowO3ZhbHVlPU1hdGguYWJzKHZhbHVlKTtpZihpc05hTih2YWx1ZSl8fHZhbHVlPT09SW5maW5pdHkpe209aXNOYU4odmFsdWUpPzE6MDtlPWVNYXh9ZWxzZXtlPU1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpL01hdGguTE4yKTtpZih2YWx1ZSooYz1NYXRoLnBvdygyLC1lKSk8MSl7ZS0tO2MqPTJ9aWYoZStlQmlhcz49MSl7dmFsdWUrPXJ0L2N9ZWxzZXt2YWx1ZSs9cnQqTWF0aC5wb3coMiwxLWVCaWFzKX1pZih2YWx1ZSpjPj0yKXtlKys7Yy89Mn1pZihlK2VCaWFzPj1lTWF4KXttPTA7ZT1lTWF4fWVsc2UgaWYoZStlQmlhcz49MSl7bT0odmFsdWUqYy0xKSpNYXRoLnBvdygyLG1MZW4pO2U9ZStlQmlhc31lbHNle209dmFsdWUqTWF0aC5wb3coMixlQmlhcy0xKSpNYXRoLnBvdygyLG1MZW4pO2U9MH19Zm9yKDttTGVuPj04O2J1ZmZlcltvZmZzZXQraV09bSYyNTUsaSs9ZCxtLz0yNTYsbUxlbi09OCl7fWU9ZTw8bUxlbnxtO2VMZW4rPW1MZW47Zm9yKDtlTGVuPjA7YnVmZmVyW29mZnNldCtpXT1lJjI1NSxpKz1kLGUvPTI1NixlTGVuLT04KXt9YnVmZmVyW29mZnNldCtpLWRdfD1zKjEyOH19LHt9XSwzNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7aWYodHlwZW9mIE9iamVjdC5jcmVhdGU9PT0iZnVuY3Rpb24iKXttb2R1bGUuZXhwb3J0cz1mdW5jdGlvbiBpbmhlcml0cyhjdG9yLHN1cGVyQ3Rvcil7aWYoc3VwZXJDdG9yKXtjdG9yLnN1cGVyXz1zdXBlckN0b3I7Y3Rvci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLHtjb25zdHJ1Y3Rvcjp7dmFsdWU6Y3RvcixlbnVtZXJhYmxlOmZhbHNlLHdyaXRhYmxlOnRydWUsY29uZmlndXJhYmxlOnRydWV9fSl9fX1lbHNle21vZHVsZS5leHBvcnRzPWZ1bmN0aW9uIGluaGVyaXRzKGN0b3Isc3VwZXJDdG9yKXtpZihzdXBlckN0b3Ipe2N0b3Iuc3VwZXJfPXN1cGVyQ3Rvcjt2YXIgVGVtcEN0b3I9ZnVuY3Rpb24oKXt9O1RlbXBDdG9yLnByb3RvdHlwZT1zdXBlckN0b3IucHJvdG90eXBlO2N0b3IucHJvdG90eXBlPW5ldyBUZW1wQ3RvcjtjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1jdG9yfX19fSx7fV0sMzc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKG9iail7cmV0dXJuIG9iaiE9bnVsbCYmKGlzQnVmZmVyKG9iail8fGlzU2xvd0J1ZmZlcihvYmopfHwhIW9iai5faXNCdWZmZXIpfTtmdW5jdGlvbiBpc0J1ZmZlcihvYmope3JldHVybiEhb2JqLmNvbnN0cnVjdG9yJiZ0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyPT09ImZ1bmN0aW9uIiYmb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iail9ZnVuY3Rpb24gaXNTbG93QnVmZmVyKG9iail7cmV0dXJuIHR5cGVvZiBvYmoucmVhZEZsb2F0TEU9PT0iZnVuY3Rpb24iJiZ0eXBlb2Ygb2JqLnNsaWNlPT09ImZ1bmN0aW9uIiYmaXNCdWZmZXIob2JqLnNsaWNlKDAsMCkpfX0se31dLDM4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgdG9TdHJpbmc9e30udG9TdHJpbmc7bW9kdWxlLmV4cG9ydHM9QXJyYXkuaXNBcnJheXx8ZnVuY3Rpb24oYXJyKXtyZXR1cm4gdG9TdHJpbmcuY2FsbChhcnIpPT0iW29iamVjdCBBcnJheV0ifX0se31dLDM5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIEhhc2hCYXNlPXJlcXVpcmUoImhhc2gtYmFzZSIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIEFSUkFZMTY9bmV3IEFycmF5KDE2KTtmdW5jdGlvbiBNRDUoKXtIYXNoQmFzZS5jYWxsKHRoaXMsNjQpO3RoaXMuX2E9MTczMjU4NDE5Mzt0aGlzLl9iPTQwMjMyMzM0MTc7dGhpcy5fYz0yNTYyMzgzMTAyO3RoaXMuX2Q9MjcxNzMzODc4fWluaGVyaXRzKE1ENSxIYXNoQmFzZSk7TUQ1LnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKCl7dmFyIE09QVJSQVkxNjtmb3IodmFyIGk9MDtpPDE2OysraSlNW2ldPXRoaXMuX2Jsb2NrLnJlYWRJbnQzMkxFKGkqNCk7dmFyIGE9dGhpcy5fYTt2YXIgYj10aGlzLl9iO3ZhciBjPXRoaXMuX2M7dmFyIGQ9dGhpcy5fZDthPWZuRihhLGIsYyxkLE1bMF0sMzYxNDA5MDM2MCw3KTtkPWZuRihkLGEsYixjLE1bMV0sMzkwNTQwMjcxMCwxMik7Yz1mbkYoYyxkLGEsYixNWzJdLDYwNjEwNTgxOSwxNyk7Yj1mbkYoYixjLGQsYSxNWzNdLDMyNTA0NDE5NjYsMjIpO2E9Zm5GKGEsYixjLGQsTVs0XSw0MTE4NTQ4Mzk5LDcpO2Q9Zm5GKGQsYSxiLGMsTVs1XSwxMjAwMDgwNDI2LDEyKTtjPWZuRihjLGQsYSxiLE1bNl0sMjgyMTczNTk1NSwxNyk7Yj1mbkYoYixjLGQsYSxNWzddLDQyNDkyNjEzMTMsMjIpO2E9Zm5GKGEsYixjLGQsTVs4XSwxNzcwMDM1NDE2LDcpO2Q9Zm5GKGQsYSxiLGMsTVs5XSwyMzM2NTUyODc5LDEyKTtjPWZuRihjLGQsYSxiLE1bMTBdLDQyOTQ5MjUyMzMsMTcpO2I9Zm5GKGIsYyxkLGEsTVsxMV0sMjMwNDU2MzEzNCwyMik7YT1mbkYoYSxiLGMsZCxNWzEyXSwxODA0NjAzNjgyLDcpO2Q9Zm5GKGQsYSxiLGMsTVsxM10sNDI1NDYyNjE5NSwxMik7Yz1mbkYoYyxkLGEsYixNWzE0XSwyNzkyOTY1MDA2LDE3KTtiPWZuRihiLGMsZCxhLE1bMTVdLDEyMzY1MzUzMjksMjIpO2E9Zm5HKGEsYixjLGQsTVsxXSw0MTI5MTcwNzg2LDUpO2Q9Zm5HKGQsYSxiLGMsTVs2XSwzMjI1NDY1NjY0LDkpO2M9Zm5HKGMsZCxhLGIsTVsxMV0sNjQzNzE3NzEzLDE0KTtiPWZuRyhiLGMsZCxhLE1bMF0sMzkyMTA2OTk5NCwyMCk7YT1mbkcoYSxiLGMsZCxNWzVdLDM1OTM0MDg2MDUsNSk7ZD1mbkcoZCxhLGIsYyxNWzEwXSwzODAxNjA4Myw5KTtjPWZuRyhjLGQsYSxiLE1bMTVdLDM2MzQ0ODg5NjEsMTQpO2I9Zm5HKGIsYyxkLGEsTVs0XSwzODg5NDI5NDQ4LDIwKTthPWZuRyhhLGIsYyxkLE1bOV0sNTY4NDQ2NDM4LDUpO2Q9Zm5HKGQsYSxiLGMsTVsxNF0sMzI3NTE2MzYwNiw5KTtjPWZuRyhjLGQsYSxiLE1bM10sNDEwNzYwMzMzNSwxNCk7Yj1mbkcoYixjLGQsYSxNWzhdLDExNjM1MzE1MDEsMjApO2E9Zm5HKGEsYixjLGQsTVsxM10sMjg1MDI4NTgyOSw1KTtkPWZuRyhkLGEsYixjLE1bMl0sNDI0MzU2MzUxMiw5KTtjPWZuRyhjLGQsYSxiLE1bN10sMTczNTMyODQ3MywxNCk7Yj1mbkcoYixjLGQsYSxNWzEyXSwyMzY4MzU5NTYyLDIwKTthPWZuSChhLGIsYyxkLE1bNV0sNDI5NDU4ODczOCw0KTtkPWZuSChkLGEsYixjLE1bOF0sMjI3MjM5MjgzMywxMSk7Yz1mbkgoYyxkLGEsYixNWzExXSwxODM5MDMwNTYyLDE2KTtiPWZuSChiLGMsZCxhLE1bMTRdLDQyNTk2NTc3NDAsMjMpO2E9Zm5IKGEsYixjLGQsTVsxXSwyNzYzOTc1MjM2LDQpO2Q9Zm5IKGQsYSxiLGMsTVs0XSwxMjcyODkzMzUzLDExKTtjPWZuSChjLGQsYSxiLE1bN10sNDEzOTQ2OTY2NCwxNik7Yj1mbkgoYixjLGQsYSxNWzEwXSwzMjAwMjM2NjU2LDIzKTthPWZuSChhLGIsYyxkLE1bMTNdLDY4MTI3OTE3NCw0KTtkPWZuSChkLGEsYixjLE1bMF0sMzkzNjQzMDA3NCwxMSk7Yz1mbkgoYyxkLGEsYixNWzNdLDM1NzI0NDUzMTcsMTYpO2I9Zm5IKGIsYyxkLGEsTVs2XSw3NjAyOTE4OSwyMyk7YT1mbkgoYSxiLGMsZCxNWzldLDM2NTQ2MDI4MDksNCk7ZD1mbkgoZCxhLGIsYyxNWzEyXSwzODczMTUxNDYxLDExKTtjPWZuSChjLGQsYSxiLE1bMTVdLDUzMDc0MjUyMCwxNik7Yj1mbkgoYixjLGQsYSxNWzJdLDMyOTk2Mjg2NDUsMjMpO2E9Zm5JKGEsYixjLGQsTVswXSw0MDk2MzM2NDUyLDYpO2Q9Zm5JKGQsYSxiLGMsTVs3XSwxMTI2ODkxNDE1LDEwKTtjPWZuSShjLGQsYSxiLE1bMTRdLDI4Nzg2MTIzOTEsMTUpO2I9Zm5JKGIsYyxkLGEsTVs1XSw0MjM3NTMzMjQxLDIxKTthPWZuSShhLGIsYyxkLE1bMTJdLDE3MDA0ODU1NzEsNik7ZD1mbkkoZCxhLGIsYyxNWzNdLDIzOTk5ODA2OTAsMTApO2M9Zm5JKGMsZCxhLGIsTVsxMF0sNDI5MzkxNTc3MywxNSk7Yj1mbkkoYixjLGQsYSxNWzFdLDIyNDAwNDQ0OTcsMjEpO2E9Zm5JKGEsYixjLGQsTVs4XSwxODczMzEzMzU5LDYpO2Q9Zm5JKGQsYSxiLGMsTVsxNV0sNDI2NDM1NTU1MiwxMCk7Yz1mbkkoYyxkLGEsYixNWzZdLDI3MzQ3Njg5MTYsMTUpO2I9Zm5JKGIsYyxkLGEsTVsxM10sMTMwOTE1MTY0OSwyMSk7YT1mbkkoYSxiLGMsZCxNWzRdLDQxNDk0NDQyMjYsNik7ZD1mbkkoZCxhLGIsYyxNWzExXSwzMTc0NzU2OTE3LDEwKTtjPWZuSShjLGQsYSxiLE1bMl0sNzE4Nzg3MjU5LDE1KTtiPWZuSShiLGMsZCxhLE1bOV0sMzk1MTQ4MTc0NSwyMSk7dGhpcy5fYT10aGlzLl9hK2F8MDt0aGlzLl9iPXRoaXMuX2IrYnwwO3RoaXMuX2M9dGhpcy5fYytjfDA7dGhpcy5fZD10aGlzLl9kK2R8MH07TUQ1LnByb3RvdHlwZS5fZGlnZXN0PWZ1bmN0aW9uKCl7dGhpcy5fYmxvY2tbdGhpcy5fYmxvY2tPZmZzZXQrK109MTI4O2lmKHRoaXMuX2Jsb2NrT2Zmc2V0PjU2KXt0aGlzLl9ibG9jay5maWxsKDAsdGhpcy5fYmxvY2tPZmZzZXQsNjQpO3RoaXMuX3VwZGF0ZSgpO3RoaXMuX2Jsb2NrT2Zmc2V0PTB9dGhpcy5fYmxvY2suZmlsbCgwLHRoaXMuX2Jsb2NrT2Zmc2V0LDU2KTt0aGlzLl9ibG9jay53cml0ZVVJbnQzMkxFKHRoaXMuX2xlbmd0aFswXSw1Nik7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJMRSh0aGlzLl9sZW5ndGhbMV0sNjApO3RoaXMuX3VwZGF0ZSgpO3ZhciBidWZmZXI9QnVmZmVyLmFsbG9jVW5zYWZlKDE2KTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2EsMCk7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9iLDQpO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fYyw4KTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2QsMTIpO3JldHVybiBidWZmZXJ9O2Z1bmN0aW9uIHJvdGwoeCxuKXtyZXR1cm4geDw8bnx4Pj4+MzItbn1mdW5jdGlvbiBmbkYoYSxiLGMsZCxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYiZjfH5iJmQpK20ra3wwLHMpK2J8MH1mdW5jdGlvbiBmbkcoYSxiLGMsZCxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYiZkfGMmfmQpK20ra3wwLHMpK2J8MH1mdW5jdGlvbiBmbkgoYSxiLGMsZCxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYl5jXmQpK20ra3wwLHMpK2J8MH1mdW5jdGlvbiBmbkkoYSxiLGMsZCxtLGsscyl7cmV0dXJuIHJvdGwoYSsoY14oYnx+ZCkpK20ra3wwLHMpK2J8MH1tb2R1bGUuZXhwb3J0cz1NRDV9LHsiaGFzaC1iYXNlIjozNCxpbmhlcml0czozNiwic2FmZS1idWZmZXIiOjgzfV0sNDA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2lmKCFBcnJheUJ1ZmZlclsiaXNWaWV3Il0pe0FycmF5QnVmZmVyLmlzVmlldz1mdW5jdGlvbiBpc1ZpZXcoYSl7cmV0dXJuIGEhPT1udWxsJiZ0eXBlb2YgYT09PSJvYmplY3QiJiZhWyJidWZmZXIiXWluc3RhbmNlb2YgQXJyYXlCdWZmZXJ9fX0se31dLDQxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7ZXhwb3J0cy5fX2VzTW9kdWxlPXRydWU7dmFyIExpZ2h0TWFwSW1wbD1mdW5jdGlvbigpe2Z1bmN0aW9uIExpZ2h0TWFwSW1wbCgpe3RoaXMucmVjb3JkPVtdfUxpZ2h0TWFwSW1wbC5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKGtleSl7cmV0dXJuIHRoaXMucmVjb3JkLm1hcChmdW5jdGlvbihfYSl7dmFyIF9rZXk9X2FbMF07cmV0dXJuIF9rZXl9KS5pbmRleE9mKGtleSk+PTB9O0xpZ2h0TWFwSW1wbC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKGtleSl7dmFyIGVudHJ5PXRoaXMucmVjb3JkLmZpbHRlcihmdW5jdGlvbihfYSl7dmFyIF9rZXk9X2FbMF07cmV0dXJuIF9rZXk9PT1rZXl9KVswXTtpZihlbnRyeT09PXVuZGVmaW5lZCl7cmV0dXJuIHVuZGVmaW5lZH1yZXR1cm4gZW50cnlbMV19O0xpZ2h0TWFwSW1wbC5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKGtleSx2YWx1ZSl7dmFyIGVudHJ5PXRoaXMucmVjb3JkLmZpbHRlcihmdW5jdGlvbihfYSl7dmFyIF9rZXk9X2FbMF07cmV0dXJuIF9rZXk9PT1rZXl9KVswXTtpZihlbnRyeT09PXVuZGVmaW5lZCl7dGhpcy5yZWNvcmQucHVzaChba2V5LHZhbHVlXSl9ZWxzZXtlbnRyeVsxXT12YWx1ZX1yZXR1cm4gdGhpc307TGlnaHRNYXBJbXBsLnByb3RvdHlwZVsiZGVsZXRlIl09ZnVuY3Rpb24oa2V5KXt2YXIgaW5kZXg9dGhpcy5yZWNvcmQubWFwKGZ1bmN0aW9uKF9hKXt2YXIga2V5PV9hWzBdO3JldHVybiBrZXl9KS5pbmRleE9mKGtleSk7aWYoaW5kZXg8MCl7cmV0dXJuIGZhbHNlfXRoaXMucmVjb3JkLnNwbGljZShpbmRleCwxKTtyZXR1cm4gdHJ1ZX07TGlnaHRNYXBJbXBsLnByb3RvdHlwZS5rZXlzPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucmVjb3JkLm1hcChmdW5jdGlvbihfYSl7dmFyIGtleT1fYVswXTtyZXR1cm4ga2V5fSl9O3JldHVybiBMaWdodE1hcEltcGx9KCk7ZXhwb3J0cy5Qb2x5ZmlsbD10eXBlb2YgTWFwIT09InVuZGVmaW5lZCI/TWFwOkxpZ2h0TWFwSW1wbH0se31dLDQyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgY29uc3RhbnRzPXJlcXVpcmUoImNvbnN0YW50cyIpO3ZhciByc2E9cmVxdWlyZSgiLi9saWJzL3JzYS5qcyIpO3ZhciBfPXJlcXVpcmUoIi4vdXRpbHMiKS5fO3ZhciB1dGlscz1yZXF1aXJlKCIuL3V0aWxzIik7dmFyIHNjaGVtZXM9cmVxdWlyZSgiLi9zY2hlbWVzL3NjaGVtZXMuanMiKTt2YXIgZm9ybWF0cz1yZXF1aXJlKCIuL2Zvcm1hdHMvZm9ybWF0cy5qcyIpO3ZhciBzZWVkcmFuZG9tPXJlcXVpcmUoInNlZWRyYW5kb20iKTtpZih0eXBlb2YgY29uc3RhbnRzLlJTQV9OT19QQURESU5HPT09InVuZGVmaW5lZCIpe2NvbnN0YW50cy5SU0FfTk9fUEFERElORz0zfW1vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKCl7dmFyIFNVUFBPUlRFRF9IQVNIX0FMR09SSVRITVM9e25vZGUxMDpbIm1kNCIsIm1kNSIsInJpcGVtZDE2MCIsInNoYTEiLCJzaGEyMjQiLCJzaGEyNTYiLCJzaGEzODQiLCJzaGE1MTIiXSxub2RlOlsibWQ0IiwibWQ1IiwicmlwZW1kMTYwIiwic2hhMSIsInNoYTIyNCIsInNoYTI1NiIsInNoYTM4NCIsInNoYTUxMiJdLGlvanM6WyJtZDQiLCJtZDUiLCJyaXBlbWQxNjAiLCJzaGExIiwic2hhMjI0Iiwic2hhMjU2Iiwic2hhMzg0Iiwic2hhNTEyIl0sYnJvd3NlcjpbIm1kNSIsInJpcGVtZDE2MCIsInNoYTEiLCJzaGEyNTYiLCJzaGE1MTIiXX07dmFyIERFRkFVTFRfRU5DUllQVElPTl9TQ0hFTUU9InBrY3MxX29hZXAiO3ZhciBERUZBVUxUX1NJR05JTkdfU0NIRU1FPSJwa2NzMSI7dmFyIERFRkFVTFRfRVhQT1JUX0ZPUk1BVD0icHJpdmF0ZSI7dmFyIEVYUE9SVF9GT1JNQVRfQUxJQVNFUz17cHJpdmF0ZToicGtjczEtcHJpdmF0ZS1wZW0iLCJwcml2YXRlLWRlciI6InBrY3MxLXByaXZhdGUtZGVyIixwdWJsaWM6InBrY3M4LXB1YmxpYy1wZW0iLCJwdWJsaWMtZGVyIjoicGtjczgtcHVibGljLWRlciJ9O2Z1bmN0aW9uIE5vZGVSU0Eoa2V5LGZvcm1hdCxvcHRpb25zKXtpZighKHRoaXMgaW5zdGFuY2VvZiBOb2RlUlNBKSl7cmV0dXJuIG5ldyBOb2RlUlNBKGtleSxmb3JtYXQsb3B0aW9ucyl9aWYoXy5pc09iamVjdChmb3JtYXQpKXtvcHRpb25zPWZvcm1hdDtmb3JtYXQ9dW5kZWZpbmVkfXRoaXMuJG9wdGlvbnM9e3NpZ25pbmdTY2hlbWU6REVGQVVMVF9TSUdOSU5HX1NDSEVNRSxzaWduaW5nU2NoZW1lT3B0aW9uczp7aGFzaDoic2hhMjU2IixzYWx0TGVuZ3RoOm51bGx9LGVuY3J5cHRpb25TY2hlbWU6REVGQVVMVF9FTkNSWVBUSU9OX1NDSEVNRSxlbmNyeXB0aW9uU2NoZW1lT3B0aW9uczp7aGFzaDoic2hhMSIsbGFiZWw6bnVsbH0sZW52aXJvbm1lbnQ6dXRpbHMuZGV0ZWN0RW52aXJvbm1lbnQoKSxyc2FVdGlsczp0aGlzfTt0aGlzLmtleVBhaXI9bmV3IHJzYS5LZXk7dGhpcy4kY2FjaGU9e307aWYoQnVmZmVyLmlzQnVmZmVyKGtleSl8fF8uaXNTdHJpbmcoa2V5KSl7dGhpcy5pbXBvcnRLZXkoa2V5LGZvcm1hdCl9ZWxzZSBpZihfLmlzT2JqZWN0KGtleSkpe3RoaXMuZ2VuZXJhdGVLZXlQYWlyKGtleS5iLGtleS5lKX10aGlzLnNldE9wdGlvbnMob3B0aW9ucyl9Tm9kZVJTQS5nZW5lcmF0ZUtleVBhaXJGcm9tU2VlZD1mdW5jdGlvbiBnZW5lcmF0ZUtleVBhaXJGcm9tU2VlZChzZWVkLGJpdHMsZXhwLGVudmlyb25tZW50KXt2YXIgcmFuZG9tQmFja3VwPU1hdGgucmFuZG9tO2lmKHNlZWQhPT1udWxsKXtNYXRoLnJhbmRvbT1mdW5jdGlvbigpe3ZhciBwcmV2PXVuZGVmaW5lZDtmdW5jdGlvbiByYW5kb20oKXtwcmV2PXNlZWRyYW5kb20ocHJldj09PXVuZGVmaW5lZD9CdWZmZXIuZnJvbShzZWVkLmJ1ZmZlcixzZWVkLmJ5dGVPZmZzZXQsc2VlZC5sZW5ndGgpLnRvU3RyaW5nKCJoZXgiKTpwcmV2LnRvRml4ZWQoMTIpLHtnbG9iYWw6ZmFsc2V9KS5xdWljaygpO3JldHVybiBwcmV2fXJhbmRvbS5pc1NlZWRlZD10cnVlO3JldHVybiByYW5kb219KCl9dmFyIG9wdGlvbnM9dW5kZWZpbmVkO2lmKGVudmlyb25tZW50IT09dW5kZWZpbmVkKXtvcHRpb25zPXtlbnZpcm9ubWVudDplbnZpcm9ubWVudH19dmFyIG5vZGVSU0E9bmV3IE5vZGVSU0EodW5kZWZpbmVkLHVuZGVmaW5lZCxvcHRpb25zKTtub2RlUlNBLmdlbmVyYXRlS2V5UGFpcihiaXRzLGV4cCk7TWF0aC5yYW5kb209cmFuZG9tQmFja3VwO3JldHVybiBub2RlUlNBfTtOb2RlUlNBLnByb3RvdHlwZS5zZXRPcHRpb25zPWZ1bmN0aW9uKG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307aWYob3B0aW9ucy5lbnZpcm9ubWVudCl7dGhpcy4kb3B0aW9ucy5lbnZpcm9ubWVudD1vcHRpb25zLmVudmlyb25tZW50fWlmKG9wdGlvbnMuc2lnbmluZ1NjaGVtZSl7aWYoXy5pc1N0cmluZyhvcHRpb25zLnNpZ25pbmdTY2hlbWUpKXt2YXIgc2lnbmluZ1NjaGVtZT1vcHRpb25zLnNpZ25pbmdTY2hlbWUudG9Mb3dlckNhc2UoKS5zcGxpdCgiLSIpO2lmKHNpZ25pbmdTY2hlbWUubGVuZ3RoPT0xKXtpZihTVVBQT1JURURfSEFTSF9BTEdPUklUSE1TLm5vZGUuaW5kZXhPZihzaWduaW5nU2NoZW1lWzBdKT4tMSl7dGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucz17aGFzaDpzaWduaW5nU2NoZW1lWzBdfTt0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWU9REVGQVVMVF9TSUdOSU5HX1NDSEVNRX1lbHNle3RoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZT1zaWduaW5nU2NoZW1lWzBdO3RoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnM9e2hhc2g6bnVsbH19fWVsc2V7dGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucz17aGFzaDpzaWduaW5nU2NoZW1lWzFdfTt0aGlzLiRvcHRpb25zLnNpZ25pbmdTY2hlbWU9c2lnbmluZ1NjaGVtZVswXX19ZWxzZSBpZihfLmlzT2JqZWN0KG9wdGlvbnMuc2lnbmluZ1NjaGVtZSkpe3RoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZT1vcHRpb25zLnNpZ25pbmdTY2hlbWUuc2NoZW1lfHxERUZBVUxUX1NJR05JTkdfU0NIRU1FO3RoaXMuJG9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnM9Xy5vbWl0KG9wdGlvbnMuc2lnbmluZ1NjaGVtZSwic2NoZW1lIil9aWYoIXNjaGVtZXMuaXNTaWduYXR1cmUodGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lKSl7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIHNpZ25pbmcgc2NoZW1lIil9aWYodGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5oYXNoJiZTVVBQT1JURURfSEFTSF9BTEdPUklUSE1TW3RoaXMuJG9wdGlvbnMuZW52aXJvbm1lbnRdLmluZGV4T2YodGhpcy4kb3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5oYXNoKT09PS0xKXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQgaGFzaGluZyBhbGdvcml0aG0gZm9yICIrdGhpcy4kb3B0aW9ucy5lbnZpcm9ubWVudCsiIGVudmlyb25tZW50Iil9fWlmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZSl7aWYoXy5pc1N0cmluZyhvcHRpb25zLmVuY3J5cHRpb25TY2hlbWUpKXt0aGlzLiRvcHRpb25zLmVuY3J5cHRpb25TY2hlbWU9b3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lLnRvTG93ZXJDYXNlKCk7dGhpcy4kb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucz17fX1lbHNlIGlmKF8uaXNPYmplY3Qob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lKSl7dGhpcy4kb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lPW9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZS5zY2hlbWV8fERFRkFVTFRfRU5DUllQVElPTl9TQ0hFTUU7dGhpcy4kb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucz1fLm9taXQob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lLCJzY2hlbWUiKX1pZighc2NoZW1lcy5pc0VuY3J5cHRpb24odGhpcy4kb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lKSl7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGVuY3J5cHRpb24gc2NoZW1lIil9aWYodGhpcy4kb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5oYXNoJiZTVVBQT1JURURfSEFTSF9BTEdPUklUSE1TW3RoaXMuJG9wdGlvbnMuZW52aXJvbm1lbnRdLmluZGV4T2YodGhpcy4kb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5oYXNoKT09PS0xKXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQgaGFzaGluZyBhbGdvcml0aG0gZm9yICIrdGhpcy4kb3B0aW9ucy5lbnZpcm9ubWVudCsiIGVudmlyb25tZW50Iil9fXRoaXMua2V5UGFpci5zZXRPcHRpb25zKHRoaXMuJG9wdGlvbnMpfTtOb2RlUlNBLnByb3RvdHlwZS5nZW5lcmF0ZUtleVBhaXI9ZnVuY3Rpb24oYml0cyxleHApe2JpdHM9Yml0c3x8MjA0ODtleHA9ZXhwfHw2NTUzNztpZihiaXRzJTghPT0wKXt0aHJvdyBFcnJvcigiS2V5IHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDguIil9dGhpcy5rZXlQYWlyLmdlbmVyYXRlKGJpdHMsZXhwLnRvU3RyaW5nKDE2KSk7dGhpcy4kY2FjaGU9e307cmV0dXJuIHRoaXN9O05vZGVSU0EucHJvdG90eXBlLmltcG9ydEtleT1mdW5jdGlvbihrZXlEYXRhLGZvcm1hdCl7aWYoIWtleURhdGEpe3Rocm93IEVycm9yKCJFbXB0eSBrZXkgZ2l2ZW4iKX1pZihmb3JtYXQpe2Zvcm1hdD1FWFBPUlRfRk9STUFUX0FMSUFTRVNbZm9ybWF0XXx8Zm9ybWF0fWlmKCFmb3JtYXRzLmRldGVjdEFuZEltcG9ydCh0aGlzLmtleVBhaXIsa2V5RGF0YSxmb3JtYXQpJiZmb3JtYXQ9PT11bmRlZmluZWQpe3Rocm93IEVycm9yKCJLZXkgZm9ybWF0IG11c3QgYmUgc3BlY2lmaWVkIil9dGhpcy4kY2FjaGU9e307cmV0dXJuIHRoaXN9O05vZGVSU0EucHJvdG90eXBlLmV4cG9ydEtleT1mdW5jdGlvbihmb3JtYXQpe2Zvcm1hdD1mb3JtYXR8fERFRkFVTFRfRVhQT1JUX0ZPUk1BVDtmb3JtYXQ9RVhQT1JUX0ZPUk1BVF9BTElBU0VTW2Zvcm1hdF18fGZvcm1hdDtpZighdGhpcy4kY2FjaGVbZm9ybWF0XSl7dGhpcy4kY2FjaGVbZm9ybWF0XT1mb3JtYXRzLmRldGVjdEFuZEV4cG9ydCh0aGlzLmtleVBhaXIsZm9ybWF0KX1yZXR1cm4gdGhpcy4kY2FjaGVbZm9ybWF0XX07Tm9kZVJTQS5wcm90b3R5cGUuaXNQcml2YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMua2V5UGFpci5pc1ByaXZhdGUoKX07Tm9kZVJTQS5wcm90b3R5cGUuaXNQdWJsaWM9ZnVuY3Rpb24oc3RyaWN0KXtyZXR1cm4gdGhpcy5rZXlQYWlyLmlzUHVibGljKHN0cmljdCl9O05vZGVSU0EucHJvdG90eXBlLmlzRW1wdHk9ZnVuY3Rpb24oc3RyaWN0KXtyZXR1cm4hKHRoaXMua2V5UGFpci5ufHx0aGlzLmtleVBhaXIuZXx8dGhpcy5rZXlQYWlyLmQpfTtOb2RlUlNBLnByb3RvdHlwZS5lbmNyeXB0PWZ1bmN0aW9uKGJ1ZmZlcixlbmNvZGluZyxzb3VyY2VfZW5jb2Rpbmcpe3JldHVybiB0aGlzLiQkZW5jcnlwdEtleShmYWxzZSxidWZmZXIsZW5jb2Rpbmcsc291cmNlX2VuY29kaW5nKX07Tm9kZVJTQS5wcm90b3R5cGUuZGVjcnlwdD1mdW5jdGlvbihidWZmZXIsZW5jb2Rpbmcpe3JldHVybiB0aGlzLiQkZGVjcnlwdEtleShmYWxzZSxidWZmZXIsZW5jb2RpbmcpfTtOb2RlUlNBLnByb3RvdHlwZS5lbmNyeXB0UHJpdmF0ZT1mdW5jdGlvbihidWZmZXIsZW5jb2Rpbmcsc291cmNlX2VuY29kaW5nKXtyZXR1cm4gdGhpcy4kJGVuY3J5cHRLZXkodHJ1ZSxidWZmZXIsZW5jb2Rpbmcsc291cmNlX2VuY29kaW5nKX07Tm9kZVJTQS5wcm90b3R5cGUuZGVjcnlwdFB1YmxpYz1mdW5jdGlvbihidWZmZXIsZW5jb2Rpbmcpe3JldHVybiB0aGlzLiQkZGVjcnlwdEtleSh0cnVlLGJ1ZmZlcixlbmNvZGluZyl9O05vZGVSU0EucHJvdG90eXBlLiQkZW5jcnlwdEtleT1mdW5jdGlvbih1c2VQcml2YXRlLGJ1ZmZlcixlbmNvZGluZyxzb3VyY2VfZW5jb2Rpbmcpe3RyeXt2YXIgcmVzPXRoaXMua2V5UGFpci5lbmNyeXB0KHRoaXMuJGdldERhdGFGb3JFbmNyeXB0KGJ1ZmZlcixzb3VyY2VfZW5jb2RpbmcpLHVzZVByaXZhdGUpO2lmKGVuY29kaW5nPT0iYnVmZmVyInx8IWVuY29kaW5nKXtyZXR1cm4gcmVzfWVsc2V7cmV0dXJuIHJlcy50b1N0cmluZyhlbmNvZGluZyl9fWNhdGNoKGUpe3Rocm93IEVycm9yKCJFcnJvciBkdXJpbmcgZW5jcnlwdGlvbi4gT3JpZ2luYWwgZXJyb3I6ICIrZS5zdGFjayl9fTtOb2RlUlNBLnByb3RvdHlwZS4kJGRlY3J5cHRLZXk9ZnVuY3Rpb24odXNlUHVibGljLGJ1ZmZlcixlbmNvZGluZyl7dHJ5e2J1ZmZlcj1fLmlzU3RyaW5nKGJ1ZmZlcik/QnVmZmVyLmZyb20oYnVmZmVyLCJiYXNlNjQiKTpidWZmZXI7dmFyIHJlcz10aGlzLmtleVBhaXIuZGVjcnlwdChidWZmZXIsdXNlUHVibGljKTtpZihyZXM9PT1udWxsKXt0aHJvdyBFcnJvcigiS2V5IGRlY3J5cHQgbWV0aG9kIHJldHVybnMgbnVsbC4iKX1yZXR1cm4gdGhpcy4kZ2V0RGVjcnlwdGVkRGF0YShyZXMsZW5jb2RpbmcpfWNhdGNoKGUpe3Rocm93IEVycm9yKCJFcnJvciBkdXJpbmcgZGVjcnlwdGlvbiAocHJvYmFibHkgaW5jb3JyZWN0IGtleSkuIE9yaWdpbmFsIGVycm9yOiAiK2Uuc3RhY2spfX07Tm9kZVJTQS5wcm90b3R5cGUuc2lnbj1mdW5jdGlvbihidWZmZXIsZW5jb2Rpbmcsc291cmNlX2VuY29kaW5nKXtpZighdGhpcy5pc1ByaXZhdGUoKSl7dGhyb3cgRXJyb3IoIlRoaXMgaXMgbm90IHByaXZhdGUga2V5Iil9dmFyIHJlcz10aGlzLmtleVBhaXIuc2lnbih0aGlzLiRnZXREYXRhRm9yRW5jcnlwdChidWZmZXIsc291cmNlX2VuY29kaW5nKSk7aWYoZW5jb2RpbmcmJmVuY29kaW5nIT0iYnVmZmVyIil7cmVzPXJlcy50b1N0cmluZyhlbmNvZGluZyl9cmV0dXJuIHJlc307Tm9kZVJTQS5wcm90b3R5cGUudmVyaWZ5PWZ1bmN0aW9uKGJ1ZmZlcixzaWduYXR1cmUsc291cmNlX2VuY29kaW5nLHNpZ25hdHVyZV9lbmNvZGluZyl7aWYoIXRoaXMuaXNQdWJsaWMoKSl7dGhyb3cgRXJyb3IoIlRoaXMgaXMgbm90IHB1YmxpYyBrZXkiKX1zaWduYXR1cmVfZW5jb2Rpbmc9IXNpZ25hdHVyZV9lbmNvZGluZ3x8c2lnbmF0dXJlX2VuY29kaW5nPT0iYnVmZmVyIj9udWxsOnNpZ25hdHVyZV9lbmNvZGluZztyZXR1cm4gdGhpcy5rZXlQYWlyLnZlcmlmeSh0aGlzLiRnZXREYXRhRm9yRW5jcnlwdChidWZmZXIsc291cmNlX2VuY29kaW5nKSxzaWduYXR1cmUsc2lnbmF0dXJlX2VuY29kaW5nKX07Tm9kZVJTQS5wcm90b3R5cGUuZ2V0S2V5U2l6ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmtleVBhaXIua2V5U2l6ZX07Tm9kZVJTQS5wcm90b3R5cGUuZ2V0TWF4TWVzc2FnZVNpemU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5rZXlQYWlyLm1heE1lc3NhZ2VMZW5ndGh9O05vZGVSU0EucHJvdG90eXBlLiRnZXREYXRhRm9yRW5jcnlwdD1mdW5jdGlvbihidWZmZXIsZW5jb2Rpbmcpe2lmKF8uaXNTdHJpbmcoYnVmZmVyKXx8Xy5pc051bWJlcihidWZmZXIpKXtyZXR1cm4gQnVmZmVyLmZyb20oIiIrYnVmZmVyLGVuY29kaW5nfHwidXRmOCIpfWVsc2UgaWYoQnVmZmVyLmlzQnVmZmVyKGJ1ZmZlcikpe3JldHVybiBidWZmZXJ9ZWxzZSBpZihfLmlzT2JqZWN0KGJ1ZmZlcikpe3JldHVybiBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShidWZmZXIpKX1lbHNle3Rocm93IEVycm9yKCJVbmV4cGVjdGVkIGRhdGEgdHlwZSIpfX07Tm9kZVJTQS5wcm90b3R5cGUuJGdldERlY3J5cHRlZERhdGE9ZnVuY3Rpb24oYnVmZmVyLGVuY29kaW5nKXtlbmNvZGluZz1lbmNvZGluZ3x8ImJ1ZmZlciI7aWYoZW5jb2Rpbmc9PSJidWZmZXIiKXtyZXR1cm4gYnVmZmVyfWVsc2UgaWYoZW5jb2Rpbmc9PSJqc29uIil7cmV0dXJuIEpTT04ucGFyc2UoYnVmZmVyLnRvU3RyaW5nKCkpfWVsc2V7cmV0dXJuIGJ1ZmZlci50b1N0cmluZyhlbmNvZGluZyl9fTtyZXR1cm4gTm9kZVJTQX0oKX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4vZm9ybWF0cy9mb3JtYXRzLmpzIjo0OSwiLi9saWJzL3JzYS5qcyI6NTMsIi4vc2NoZW1lcy9zY2hlbWVzLmpzIjo1NywiLi91dGlscyI6NTgsYnVmZmVyOjI3LGNvbnN0YW50czoyOSxzZWVkcmFuZG9tOjg2fV0sNDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpeyJ1c2Ugc3RyaWN0Ijt2YXIgdXRpbHM9cmVxdWlyZSgiLi91dGlscyIpO3ZhciBzdGFuZGFsb25lQ3JlYXRlSGFzaD1yZXF1aXJlKCJjcmVhdGUtaGFzaCIpO3ZhciBnZXROb2RlQ3J5cHRvPWZ1bmN0aW9uKCl7dmFyIG5vZGVDcnlwdG89dW5kZWZpbmVkO3JldHVybiBmdW5jdGlvbigpe2lmKG5vZGVDcnlwdG89PT11bmRlZmluZWQpe25vZGVDcnlwdG89cmVxdWlyZSgiY3J5cHRvIisiIil9cmV0dXJuIG5vZGVDcnlwdG99fSgpO21vZHVsZS5leHBvcnRzPXt9O21vZHVsZS5leHBvcnRzLmNyZWF0ZUhhc2g9ZnVuY3Rpb24oKXtpZih1dGlscy5kZXRlY3RFbnZpcm9ubWVudCgpPT09Im5vZGUiKXt0cnl7dmFyIG5vZGVDcnlwdG89Z2V0Tm9kZUNyeXB0bygpO3JldHVybiBub2RlQ3J5cHRvLmNyZWF0ZUhhc2guYmluZChub2RlQ3J5cHRvKX1jYXRjaChlcnJvcil7fX1yZXR1cm4gc3RhbmRhbG9uZUNyZWF0ZUhhc2h9KCk7WyJjcmVhdGVTaWduIiwiY3JlYXRlVmVyaWZ5Il0uZm9yRWFjaChmdW5jdGlvbihmbk5hbWUpe21vZHVsZS5leHBvcnRzW2ZuTmFtZV09ZnVuY3Rpb24oKXt2YXIgbm9kZUNyeXB0bz1nZXROb2RlQ3J5cHRvKCk7bm9kZUNyeXB0b1tmbk5hbWVdLmFwcGx5KG5vZGVDcnlwdG8sYXJndW1lbnRzKX19KTttb2R1bGUuZXhwb3J0cy5yYW5kb21CeXRlcz1mdW5jdGlvbigpe3ZhciBicm93c2VyR2V0UmFuZG9tVmFsdWVzPWZ1bmN0aW9uKCl7aWYodHlwZW9mIGNyeXB0bz09PSJvYmplY3QiJiYhIWNyeXB0by5nZXRSYW5kb21WYWx1ZXMpe3JldHVybiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKX1lbHNlIGlmKHR5cGVvZiBtc0NyeXB0bz09PSJvYmplY3QiJiYhIW1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcyl7cmV0dXJuIG1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKG1zQ3J5cHRvKX1lbHNlIGlmKHR5cGVvZiBzZWxmPT09Im9iamVjdCImJnR5cGVvZiBzZWxmLmNyeXB0bz09PSJvYmplY3QiJiYhIXNlbGYuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyl7cmV0dXJuIHNlbGYuY3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKHNlbGYuY3J5cHRvKX1lbHNle3JldHVybiB1bmRlZmluZWR9fSgpO3ZhciBnZXRSYW5kb21WYWx1ZXM9ZnVuY3Rpb24oKXt2YXIgbm9uQ3J5cHRvZ3JhcGhpY0dldFJhbmRvbVZhbHVlPWZ1bmN0aW9uKGFidil7dmFyIGw9YWJ2Lmxlbmd0aDt3aGlsZShsLS0pe2FidltsXT1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMjU2KX1yZXR1cm4gYWJ2fTtyZXR1cm4gZnVuY3Rpb24oYWJ2KXtpZihNYXRoLnJhbmRvbS5pc1NlZWRlZCl7cmV0dXJuIG5vbkNyeXB0b2dyYXBoaWNHZXRSYW5kb21WYWx1ZShhYnYpfWVsc2V7aWYoISFicm93c2VyR2V0UmFuZG9tVmFsdWVzKXtyZXR1cm4gYnJvd3NlckdldFJhbmRvbVZhbHVlcyhhYnYpfWVsc2V7cmV0dXJuIG5vbkNyeXB0b2dyYXBoaWNHZXRSYW5kb21WYWx1ZShhYnYpfX19fSgpO3ZhciBNQVhfQllURVM9NjU1MzY7dmFyIE1BWF9VSU5UMzI9NDI5NDk2NzI5NTtyZXR1cm4gZnVuY3Rpb24gcmFuZG9tQnl0ZXMoc2l6ZSl7aWYoIU1hdGgucmFuZG9tLmlzU2VlZGVkJiYhYnJvd3NlckdldFJhbmRvbVZhbHVlcyl7dHJ5e3ZhciBub2RlQnVmZmVySW5zdD1nZXROb2RlQ3J5cHRvKCkucmFuZG9tQnl0ZXMoc2l6ZSk7cmV0dXJuIEJ1ZmZlci5mcm9tKG5vZGVCdWZmZXJJbnN0LmJ1ZmZlcixub2RlQnVmZmVySW5zdC5ieXRlT2Zmc2V0LG5vZGVCdWZmZXJJbnN0Lmxlbmd0aCl9Y2F0Y2goZXJyb3Ipe319aWYoc2l6ZT5NQVhfVUlOVDMyKXRocm93IG5ldyBSYW5nZUVycm9yKCJyZXF1ZXN0ZWQgdG9vIG1hbnkgcmFuZG9tIGJ5dGVzIik7dmFyIGJ5dGVzPUJ1ZmZlci5hbGxvY1Vuc2FmZShzaXplKTtpZihzaXplPjApe2lmKHNpemU+TUFYX0JZVEVTKXtmb3IodmFyIGdlbmVyYXRlZD0wO2dlbmVyYXRlZDxzaXplO2dlbmVyYXRlZCs9TUFYX0JZVEVTKXtnZXRSYW5kb21WYWx1ZXMoYnl0ZXMuc2xpY2UoZ2VuZXJhdGVkLGdlbmVyYXRlZCtNQVhfQllURVMpKX19ZWxzZXtnZXRSYW5kb21WYWx1ZXMoYnl0ZXMpfX1yZXR1cm4gYnl0ZXN9fSgpfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi91dGlscyI6NTgsYnVmZmVyOjI3LCJjcmVhdGUtaGFzaCI6MzF9XSw0NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9e2dldEVuZ2luZTpmdW5jdGlvbihrZXlQYWlyLG9wdGlvbnMpe3ZhciBlbmdpbmU9cmVxdWlyZSgiLi9qcy5qcyIpO2lmKG9wdGlvbnMuZW52aXJvbm1lbnQ9PT0ibm9kZSIpe3ZhciBjcnlwdD1yZXF1aXJlKCJjcnlwdG8iKyIiKTtpZih0eXBlb2YgY3J5cHQucHVibGljRW5jcnlwdD09PSJmdW5jdGlvbiImJnR5cGVvZiBjcnlwdC5wcml2YXRlRGVjcnlwdD09PSJmdW5jdGlvbiIpe2lmKHR5cGVvZiBjcnlwdC5wcml2YXRlRW5jcnlwdD09PSJmdW5jdGlvbiImJnR5cGVvZiBjcnlwdC5wdWJsaWNEZWNyeXB0PT09ImZ1bmN0aW9uIil7ZW5naW5lPXJlcXVpcmUoIi4vaW8uanMiKX1lbHNle2VuZ2luZT1yZXF1aXJlKCIuL25vZGUxMi5qcyIpfX19cmV0dXJuIGVuZ2luZShrZXlQYWlyLG9wdGlvbnMpfX19LHsiLi9pby5qcyI6NDUsIi4vanMuanMiOjQ2LCIuL25vZGUxMi5qcyI6NDd9XSw0NTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGNyeXB0bz1yZXF1aXJlKCJjcnlwdG8iKyIiKTt2YXIgY29uc3RhbnRzPXJlcXVpcmUoImNvbnN0YW50cyIpO3ZhciBzY2hlbWVzPXJlcXVpcmUoIi4uL3NjaGVtZXMvc2NoZW1lcy5qcyIpO21vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKGtleVBhaXIsb3B0aW9ucyl7dmFyIHBrY3MxU2NoZW1lPXNjaGVtZXMucGtjczEubWFrZVNjaGVtZShrZXlQYWlyLG9wdGlvbnMpO3JldHVybntlbmNyeXB0OmZ1bmN0aW9uKGJ1ZmZlcix1c2VQcml2YXRlKXt2YXIgcGFkZGluZztpZih1c2VQcml2YXRlKXtwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfUEFERElORztpZihvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZvcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmcpe3BhZGRpbmc9b3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nfXJldHVybiBjcnlwdG8ucHJpdmF0ZUVuY3J5cHQoe2tleTpvcHRpb25zLnJzYVV0aWxzLmV4cG9ydEtleSgicHJpdmF0ZSIpLHBhZGRpbmc6cGFkZGluZ30sYnVmZmVyKX1lbHNle3BhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9PQUVQX1BBRERJTkc7aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lPT09InBrY3MxIil7cGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX1BBRERJTkd9aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nKXtwYWRkaW5nPW9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZ312YXIgZGF0YT1idWZmZXI7aWYocGFkZGluZz09PWNvbnN0YW50cy5SU0FfTk9fUEFERElORyl7ZGF0YT1wa2NzMVNjaGVtZS5wa2NzMHBhZChidWZmZXIpfXJldHVybiBjcnlwdG8ucHVibGljRW5jcnlwdCh7a2V5Om9wdGlvbnMucnNhVXRpbHMuZXhwb3J0S2V5KCJwdWJsaWMiKSxwYWRkaW5nOnBhZGRpbmd9LGRhdGEpfX0sZGVjcnlwdDpmdW5jdGlvbihidWZmZXIsdXNlUHVibGljKXt2YXIgcGFkZGluZztpZih1c2VQdWJsaWMpe3BhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9QQURESU5HO2lmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZyl7cGFkZGluZz1vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmd9cmV0dXJuIGNyeXB0by5wdWJsaWNEZWNyeXB0KHtrZXk6b3B0aW9ucy5yc2FVdGlscy5leHBvcnRLZXkoInB1YmxpYyIpLHBhZGRpbmc6cGFkZGluZ30sYnVmZmVyKX1lbHNle3BhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9PQUVQX1BBRERJTkc7aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lPT09InBrY3MxIil7cGFkZGluZz1jb25zdGFudHMuUlNBX1BLQ1MxX1BBRERJTkd9aWYob3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmb3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nKXtwYWRkaW5nPW9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZ312YXIgcmVzPWNyeXB0by5wcml2YXRlRGVjcnlwdCh7a2V5Om9wdGlvbnMucnNhVXRpbHMuZXhwb3J0S2V5KCJwcml2YXRlIikscGFkZGluZzpwYWRkaW5nfSxidWZmZXIpO2lmKHBhZGRpbmc9PT1jb25zdGFudHMuUlNBX05PX1BBRERJTkcpe3JldHVybiBwa2NzMVNjaGVtZS5wa2NzMHVucGFkKHJlcyl9cmV0dXJuIHJlc319fX19LHsiLi4vc2NoZW1lcy9zY2hlbWVzLmpzIjo1Nyxjb25zdGFudHM6Mjl9XSw0NjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIEJpZ0ludGVnZXI9cmVxdWlyZSgiLi4vbGlicy9qc2JuLmpzIik7dmFyIHNjaGVtZXM9cmVxdWlyZSgiLi4vc2NoZW1lcy9zY2hlbWVzLmpzIik7bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24oa2V5UGFpcixvcHRpb25zKXt2YXIgcGtjczFTY2hlbWU9c2NoZW1lcy5wa2NzMS5tYWtlU2NoZW1lKGtleVBhaXIsb3B0aW9ucyk7cmV0dXJue2VuY3J5cHQ6ZnVuY3Rpb24oYnVmZmVyLHVzZVByaXZhdGUpe3ZhciBtLGM7aWYodXNlUHJpdmF0ZSl7bT1uZXcgQmlnSW50ZWdlcihwa2NzMVNjaGVtZS5lbmNQYWQoYnVmZmVyLHt0eXBlOjF9KSk7Yz1rZXlQYWlyLiRkb1ByaXZhdGUobSl9ZWxzZXttPW5ldyBCaWdJbnRlZ2VyKGtleVBhaXIuZW5jcnlwdGlvblNjaGVtZS5lbmNQYWQoYnVmZmVyKSk7Yz1rZXlQYWlyLiRkb1B1YmxpYyhtKX1yZXR1cm4gYy50b0J1ZmZlcihrZXlQYWlyLmVuY3J5cHRlZERhdGFMZW5ndGgpfSxkZWNyeXB0OmZ1bmN0aW9uKGJ1ZmZlcix1c2VQdWJsaWMpe3ZhciBtLGM9bmV3IEJpZ0ludGVnZXIoYnVmZmVyKTtpZih1c2VQdWJsaWMpe209a2V5UGFpci4kZG9QdWJsaWMoYyk7cmV0dXJuIHBrY3MxU2NoZW1lLmVuY1VuUGFkKG0udG9CdWZmZXIoa2V5UGFpci5lbmNyeXB0ZWREYXRhTGVuZ3RoKSx7dHlwZToxfSl9ZWxzZXttPWtleVBhaXIuJGRvUHJpdmF0ZShjKTtyZXR1cm4ga2V5UGFpci5lbmNyeXB0aW9uU2NoZW1lLmVuY1VuUGFkKG0udG9CdWZmZXIoa2V5UGFpci5lbmNyeXB0ZWREYXRhTGVuZ3RoKSl9fX19fSx7Ii4uL2xpYnMvanNibi5qcyI6NTIsIi4uL3NjaGVtZXMvc2NoZW1lcy5qcyI6NTd9XSw0NzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGNyeXB0bz1yZXF1aXJlKCJjcnlwdG8iKyIiKTt2YXIgY29uc3RhbnRzPXJlcXVpcmUoImNvbnN0YW50cyIpO3ZhciBzY2hlbWVzPXJlcXVpcmUoIi4uL3NjaGVtZXMvc2NoZW1lcy5qcyIpO21vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKGtleVBhaXIsb3B0aW9ucyl7dmFyIGpzRW5naW5lPXJlcXVpcmUoIi4vanMuanMiKShrZXlQYWlyLG9wdGlvbnMpO3ZhciBwa2NzMVNjaGVtZT1zY2hlbWVzLnBrY3MxLm1ha2VTY2hlbWUoa2V5UGFpcixvcHRpb25zKTtyZXR1cm57ZW5jcnlwdDpmdW5jdGlvbihidWZmZXIsdXNlUHJpdmF0ZSl7aWYodXNlUHJpdmF0ZSl7cmV0dXJuIGpzRW5naW5lLmVuY3J5cHQoYnVmZmVyLHVzZVByaXZhdGUpfXZhciBwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfT0FFUF9QQURESU5HO2lmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZT09PSJwa2NzMSIpe3BhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9QQURESU5HfWlmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZyl7cGFkZGluZz1vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmd9dmFyIGRhdGE9YnVmZmVyO2lmKHBhZGRpbmc9PT1jb25zdGFudHMuUlNBX05PX1BBRERJTkcpe2RhdGE9cGtjczFTY2hlbWUucGtjczBwYWQoYnVmZmVyKX1yZXR1cm4gY3J5cHRvLnB1YmxpY0VuY3J5cHQoe2tleTpvcHRpb25zLnJzYVV0aWxzLmV4cG9ydEtleSgicHVibGljIikscGFkZGluZzpwYWRkaW5nfSxkYXRhKX0sZGVjcnlwdDpmdW5jdGlvbihidWZmZXIsdXNlUHVibGljKXtpZih1c2VQdWJsaWMpe3JldHVybiBqc0VuZ2luZS5kZWNyeXB0KGJ1ZmZlcix1c2VQdWJsaWMpfXZhciBwYWRkaW5nPWNvbnN0YW50cy5SU0FfUEtDUzFfT0FFUF9QQURESU5HO2lmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZT09PSJwa2NzMSIpe3BhZGRpbmc9Y29uc3RhbnRzLlJTQV9QS0NTMV9QQURESU5HfWlmKG9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZyl7cGFkZGluZz1vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmd9dmFyIHJlcz1jcnlwdG8ucHJpdmF0ZURlY3J5cHQoe2tleTpvcHRpb25zLnJzYVV0aWxzLmV4cG9ydEtleSgicHJpdmF0ZSIpLHBhZGRpbmc6cGFkZGluZ30sYnVmZmVyKTtpZihwYWRkaW5nPT09Y29uc3RhbnRzLlJTQV9OT19QQURESU5HKXtyZXR1cm4gcGtjczFTY2hlbWUucGtjczB1bnBhZChyZXMpfXJldHVybiByZXN9fX19LHsiLi4vc2NoZW1lcy9zY2hlbWVzLmpzIjo1NywiLi9qcy5qcyI6NDYsY29uc3RhbnRzOjI5fV0sNDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBfPXJlcXVpcmUoIi4uL3V0aWxzIikuXzttb2R1bGUuZXhwb3J0cz17cHJpdmF0ZUV4cG9ydDpmdW5jdGlvbihrZXksb3B0aW9ucyl7cmV0dXJue246a2V5Lm4udG9CdWZmZXIoKSxlOmtleS5lLGQ6a2V5LmQudG9CdWZmZXIoKSxwOmtleS5wLnRvQnVmZmVyKCkscTprZXkucS50b0J1ZmZlcigpLGRtcDE6a2V5LmRtcDEudG9CdWZmZXIoKSxkbXExOmtleS5kbXExLnRvQnVmZmVyKCksY29lZmY6a2V5LmNvZWZmLnRvQnVmZmVyKCl9fSxwcml2YXRlSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhLG9wdGlvbnMpe2lmKGRhdGEubiYmZGF0YS5lJiZkYXRhLmQmJmRhdGEucCYmZGF0YS5xJiZkYXRhLmRtcDEmJmRhdGEuZG1xMSYmZGF0YS5jb2VmZil7a2V5LnNldFByaXZhdGUoZGF0YS5uLGRhdGEuZSxkYXRhLmQsZGF0YS5wLGRhdGEucSxkYXRhLmRtcDEsZGF0YS5kbXExLGRhdGEuY29lZmYpfWVsc2V7dGhyb3cgRXJyb3IoIkludmFsaWQga2V5IGRhdGEiKX19LHB1YmxpY0V4cG9ydDpmdW5jdGlvbihrZXksb3B0aW9ucyl7cmV0dXJue246a2V5Lm4udG9CdWZmZXIoKSxlOmtleS5lfX0scHVibGljSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhLG9wdGlvbnMpe2lmKGRhdGEubiYmZGF0YS5lKXtrZXkuc2V0UHVibGljKGRhdGEubixkYXRhLmUpfWVsc2V7dGhyb3cgRXJyb3IoIkludmFsaWQga2V5IGRhdGEiKX19LGF1dG9JbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEpe2lmKGRhdGEubiYmZGF0YS5lKXtpZihkYXRhLmQmJmRhdGEucCYmZGF0YS5xJiZkYXRhLmRtcDEmJmRhdGEuZG1xMSYmZGF0YS5jb2VmZil7bW9kdWxlLmV4cG9ydHMucHJpdmF0ZUltcG9ydChrZXksZGF0YSk7cmV0dXJuIHRydWV9ZWxzZXttb2R1bGUuZXhwb3J0cy5wdWJsaWNJbXBvcnQoa2V5LGRhdGEpO3JldHVybiB0cnVlfX1yZXR1cm4gZmFsc2V9fX0seyIuLi91dGlscyI6NTh9XSw0OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7ZnVuY3Rpb24gZm9ybWF0UGFyc2UoZm9ybWF0KXtmb3JtYXQ9Zm9ybWF0LnNwbGl0KCItIik7dmFyIGtleVR5cGU9InByaXZhdGUiO3ZhciBrZXlPcHQ9e3R5cGU6ImRlZmF1bHQifTtmb3IodmFyIGk9MTtpPGZvcm1hdC5sZW5ndGg7aSsrKXtpZihmb3JtYXRbaV0pe3N3aXRjaChmb3JtYXRbaV0pe2Nhc2UicHVibGljIjprZXlUeXBlPWZvcm1hdFtpXTticmVhaztjYXNlInByaXZhdGUiOmtleVR5cGU9Zm9ybWF0W2ldO2JyZWFrO2Nhc2UicGVtIjprZXlPcHQudHlwZT1mb3JtYXRbaV07YnJlYWs7Y2FzZSJkZXIiOmtleU9wdC50eXBlPWZvcm1hdFtpXTticmVha319fXJldHVybntzY2hlbWU6Zm9ybWF0WzBdLGtleVR5cGU6a2V5VHlwZSxrZXlPcHQ6a2V5T3B0fX1tb2R1bGUuZXhwb3J0cz17cGtjczE6cmVxdWlyZSgiLi9wa2NzMSIpLHBrY3M4OnJlcXVpcmUoIi4vcGtjczgiKSxjb21wb25lbnRzOnJlcXVpcmUoIi4vY29tcG9uZW50cyIpLGlzUHJpdmF0ZUV4cG9ydDpmdW5jdGlvbihmb3JtYXQpe3JldHVybiBtb2R1bGUuZXhwb3J0c1tmb3JtYXRdJiZ0eXBlb2YgbW9kdWxlLmV4cG9ydHNbZm9ybWF0XS5wcml2YXRlRXhwb3J0PT09ImZ1bmN0aW9uIn0saXNQcml2YXRlSW1wb3J0OmZ1bmN0aW9uKGZvcm1hdCl7cmV0dXJuIG1vZHVsZS5leHBvcnRzW2Zvcm1hdF0mJnR5cGVvZiBtb2R1bGUuZXhwb3J0c1tmb3JtYXRdLnByaXZhdGVJbXBvcnQ9PT0iZnVuY3Rpb24ifSxpc1B1YmxpY0V4cG9ydDpmdW5jdGlvbihmb3JtYXQpe3JldHVybiBtb2R1bGUuZXhwb3J0c1tmb3JtYXRdJiZ0eXBlb2YgbW9kdWxlLmV4cG9ydHNbZm9ybWF0XS5wdWJsaWNFeHBvcnQ9PT0iZnVuY3Rpb24ifSxpc1B1YmxpY0ltcG9ydDpmdW5jdGlvbihmb3JtYXQpe3JldHVybiBtb2R1bGUuZXhwb3J0c1tmb3JtYXRdJiZ0eXBlb2YgbW9kdWxlLmV4cG9ydHNbZm9ybWF0XS5wdWJsaWNJbXBvcnQ9PT0iZnVuY3Rpb24ifSxkZXRlY3RBbmRJbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEsZm9ybWF0KXtpZihmb3JtYXQ9PT11bmRlZmluZWQpe2Zvcih2YXIgc2NoZW1lIGluIG1vZHVsZS5leHBvcnRzKXtpZih0eXBlb2YgbW9kdWxlLmV4cG9ydHNbc2NoZW1lXS5hdXRvSW1wb3J0PT09ImZ1bmN0aW9uIiYmbW9kdWxlLmV4cG9ydHNbc2NoZW1lXS5hdXRvSW1wb3J0KGtleSxkYXRhKSl7cmV0dXJuIHRydWV9fX1lbHNlIGlmKGZvcm1hdCl7dmFyIGZtdD1mb3JtYXRQYXJzZShmb3JtYXQpO2lmKG1vZHVsZS5leHBvcnRzW2ZtdC5zY2hlbWVdKXtpZihmbXQua2V5VHlwZT09PSJwcml2YXRlIil7bW9kdWxlLmV4cG9ydHNbZm10LnNjaGVtZV0ucHJpdmF0ZUltcG9ydChrZXksZGF0YSxmbXQua2V5T3B0KX1lbHNle21vZHVsZS5leHBvcnRzW2ZtdC5zY2hlbWVdLnB1YmxpY0ltcG9ydChrZXksZGF0YSxmbXQua2V5T3B0KX19ZWxzZXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQga2V5IGZvcm1hdCIpfX1yZXR1cm4gZmFsc2V9LGRldGVjdEFuZEV4cG9ydDpmdW5jdGlvbihrZXksZm9ybWF0KXtpZihmb3JtYXQpe3ZhciBmbXQ9Zm9ybWF0UGFyc2UoZm9ybWF0KTtpZihtb2R1bGUuZXhwb3J0c1tmbXQuc2NoZW1lXSl7aWYoZm10LmtleVR5cGU9PT0icHJpdmF0ZSIpe2lmKCFrZXkuaXNQcml2YXRlKCkpe3Rocm93IEVycm9yKCJUaGlzIGlzIG5vdCBwcml2YXRlIGtleSIpfXJldHVybiBtb2R1bGUuZXhwb3J0c1tmbXQuc2NoZW1lXS5wcml2YXRlRXhwb3J0KGtleSxmbXQua2V5T3B0KX1lbHNle2lmKCFrZXkuaXNQdWJsaWMoKSl7dGhyb3cgRXJyb3IoIlRoaXMgaXMgbm90IHB1YmxpYyBrZXkiKX1yZXR1cm4gbW9kdWxlLmV4cG9ydHNbZm10LnNjaGVtZV0ucHVibGljRXhwb3J0KGtleSxmbXQua2V5T3B0KX19ZWxzZXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQga2V5IGZvcm1hdCIpfX19fX0seyIuL2NvbXBvbmVudHMiOjQ4LCIuL3BrY3MxIjo1MCwiLi9wa2NzOCI6NTF9XSw1MDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIGJlcj1yZXF1aXJlKCJhc24xIikuQmVyO3ZhciBfPXJlcXVpcmUoIi4uL3V0aWxzIikuXzt2YXIgdXRpbHM9cmVxdWlyZSgiLi4vdXRpbHMiKTt2YXIgUFJJVkFURV9PUEVOSU5HX0JPVU5EQVJZPSItLS0tLUJFR0lOIFJTQSBQUklWQVRFIEtFWS0tLS0tIjt2YXIgUFJJVkFURV9DTE9TSU5HX0JPVU5EQVJZPSItLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLSI7dmFyIFBVQkxJQ19PUEVOSU5HX0JPVU5EQVJZPSItLS0tLUJFR0lOIFJTQSBQVUJMSUMgS0VZLS0tLS0iO3ZhciBQVUJMSUNfQ0xPU0lOR19CT1VOREFSWT0iLS0tLS1FTkQgUlNBIFBVQkxJQyBLRVktLS0tLSI7bW9kdWxlLmV4cG9ydHM9e3ByaXZhdGVFeHBvcnQ6ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIG49a2V5Lm4udG9CdWZmZXIoKTt2YXIgZD1rZXkuZC50b0J1ZmZlcigpO3ZhciBwPWtleS5wLnRvQnVmZmVyKCk7dmFyIHE9a2V5LnEudG9CdWZmZXIoKTt2YXIgZG1wMT1rZXkuZG1wMS50b0J1ZmZlcigpO3ZhciBkbXExPWtleS5kbXExLnRvQnVmZmVyKCk7dmFyIGNvZWZmPWtleS5jb2VmZi50b0J1ZmZlcigpO3ZhciBsZW5ndGg9bi5sZW5ndGgrZC5sZW5ndGgrcC5sZW5ndGgrcS5sZW5ndGgrZG1wMS5sZW5ndGgrZG1xMS5sZW5ndGgrY29lZmYubGVuZ3RoKzUxMjt2YXIgd3JpdGVyPW5ldyBiZXIuV3JpdGVyKHtzaXplOmxlbmd0aH0pO3dyaXRlci5zdGFydFNlcXVlbmNlKCk7d3JpdGVyLndyaXRlSW50KDApO3dyaXRlci53cml0ZUJ1ZmZlcihuLDIpO3dyaXRlci53cml0ZUludChrZXkuZSk7d3JpdGVyLndyaXRlQnVmZmVyKGQsMik7d3JpdGVyLndyaXRlQnVmZmVyKHAsMik7d3JpdGVyLndyaXRlQnVmZmVyKHEsMik7d3JpdGVyLndyaXRlQnVmZmVyKGRtcDEsMik7d3JpdGVyLndyaXRlQnVmZmVyKGRtcTEsMik7d3JpdGVyLndyaXRlQnVmZmVyKGNvZWZmLDIpO3dyaXRlci5lbmRTZXF1ZW5jZSgpO2lmKG9wdGlvbnMudHlwZT09PSJkZXIiKXtyZXR1cm4gd3JpdGVyLmJ1ZmZlcn1lbHNle3JldHVybiBQUklWQVRFX09QRU5JTkdfQk9VTkRBUlkrIlxuIit1dGlscy5saW5lYnJrKHdyaXRlci5idWZmZXIudG9TdHJpbmcoImJhc2U2NCIpLDY0KSsiXG4iK1BSSVZBVEVfQ0xPU0lOR19CT1VOREFSWX19LHByaXZhdGVJbXBvcnQ6ZnVuY3Rpb24oa2V5LGRhdGEsb3B0aW9ucyl7b3B0aW9ucz1vcHRpb25zfHx7fTt2YXIgYnVmZmVyO2lmKG9wdGlvbnMudHlwZSE9PSJkZXIiKXtpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpe2RhdGE9ZGF0YS50b1N0cmluZygidXRmOCIpfWlmKF8uaXNTdHJpbmcoZGF0YSkpe3ZhciBwZW09dXRpbHMudHJpbVN1cnJvdW5kaW5nVGV4dChkYXRhLFBSSVZBVEVfT1BFTklOR19CT1VOREFSWSxQUklWQVRFX0NMT1NJTkdfQk9VTkRBUlkpLnJlcGxhY2UoL1xzK3xcblxyfFxufFxyJC9nbSwiIik7YnVmZmVyPUJ1ZmZlci5mcm9tKHBlbSwiYmFzZTY0Iil9ZWxzZXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQga2V5IGZvcm1hdCIpfX1lbHNlIGlmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl7YnVmZmVyPWRhdGF9ZWxzZXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQga2V5IGZvcm1hdCIpfXZhciByZWFkZXI9bmV3IGJlci5SZWFkZXIoYnVmZmVyKTtyZWFkZXIucmVhZFNlcXVlbmNlKCk7cmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKTtrZXkuc2V0UHJpdmF0ZShyZWFkZXIucmVhZFN0cmluZygyLHRydWUpLHJlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSkscmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKSxyZWFkZXIucmVhZFN0cmluZygyLHRydWUpLHJlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSkscmVhZGVyLnJlYWRTdHJpbmcoMix0cnVlKSxyZWFkZXIucmVhZFN0cmluZygyLHRydWUpLHJlYWRlci5yZWFkU3RyaW5nKDIsdHJ1ZSkpfSxwdWJsaWNFeHBvcnQ6ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIG49a2V5Lm4udG9CdWZmZXIoKTt2YXIgbGVuZ3RoPW4ubGVuZ3RoKzUxMjt2YXIgYm9keVdyaXRlcj1uZXcgYmVyLldyaXRlcih7c2l6ZTpsZW5ndGh9KTtib2R5V3JpdGVyLnN0YXJ0U2VxdWVuY2UoKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKG4sMik7Ym9keVdyaXRlci53cml0ZUludChrZXkuZSk7Ym9keVdyaXRlci5lbmRTZXF1ZW5jZSgpO2lmKG9wdGlvbnMudHlwZT09PSJkZXIiKXtyZXR1cm4gYm9keVdyaXRlci5idWZmZXJ9ZWxzZXtyZXR1cm4gUFVCTElDX09QRU5JTkdfQk9VTkRBUlkrIlxuIit1dGlscy5saW5lYnJrKGJvZHlXcml0ZXIuYnVmZmVyLnRvU3RyaW5nKCJiYXNlNjQiKSw2NCkrIlxuIitQVUJMSUNfQ0xPU0lOR19CT1VOREFSWX19LHB1YmxpY0ltcG9ydDpmdW5jdGlvbihrZXksZGF0YSxvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBidWZmZXI7aWYob3B0aW9ucy50eXBlIT09ImRlciIpe2lmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl7ZGF0YT1kYXRhLnRvU3RyaW5nKCJ1dGY4Iil9aWYoXy5pc1N0cmluZyhkYXRhKSl7dmFyIHBlbT11dGlscy50cmltU3Vycm91bmRpbmdUZXh0KGRhdGEsUFVCTElDX09QRU5JTkdfQk9VTkRBUlksUFVCTElDX0NMT1NJTkdfQk9VTkRBUlkpLnJlcGxhY2UoL1xzK3xcblxyfFxufFxyJC9nbSwiIik7YnVmZmVyPUJ1ZmZlci5mcm9tKHBlbSwiYmFzZTY0Iil9fWVsc2UgaWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKXtidWZmZXI9ZGF0YX1lbHNle3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBrZXkgZm9ybWF0Iil9dmFyIGJvZHk9bmV3IGJlci5SZWFkZXIoYnVmZmVyKTtib2R5LnJlYWRTZXF1ZW5jZSgpO2tleS5zZXRQdWJsaWMoYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSkpfSxhdXRvSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhKXtpZigvXltcU1xzXSotLS0tLUJFR0lOIFJTQSBQUklWQVRFIEtFWS0tLS0tXHMqKD89KChbQS1aYS16MC05Ky89XStccyopKykpXDEtLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLVtcU1xzXSokL2cudGVzdChkYXRhKSl7bW9kdWxlLmV4cG9ydHMucHJpdmF0ZUltcG9ydChrZXksZGF0YSk7cmV0dXJuIHRydWV9aWYoL15bXFNcc10qLS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tXHMqKD89KChbQS1aYS16MC05Ky89XStccyopKykpXDEtLS0tLUVORCBSU0EgUFVCTElDIEtFWS0tLS0tW1xTXHNdKiQvZy50ZXN0KGRhdGEpKXttb2R1bGUuZXhwb3J0cy5wdWJsaWNJbXBvcnQoa2V5LGRhdGEpO3JldHVybiB0cnVlfXJldHVybiBmYWxzZX19fSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi4vdXRpbHMiOjU4LGFzbjE6MTksYnVmZmVyOjI3fV0sNTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBiZXI9cmVxdWlyZSgiYXNuMSIpLkJlcjt2YXIgXz1yZXF1aXJlKCIuLi91dGlscyIpLl87dmFyIFBVQkxJQ19SU0FfT0lEPSIxLjIuODQwLjExMzU0OS4xLjEuMSI7dmFyIHV0aWxzPXJlcXVpcmUoIi4uL3V0aWxzIik7dmFyIFBSSVZBVEVfT1BFTklOR19CT1VOREFSWT0iLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tIjt2YXIgUFJJVkFURV9DTE9TSU5HX0JPVU5EQVJZPSItLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tIjt2YXIgUFVCTElDX09QRU5JTkdfQk9VTkRBUlk9Ii0tLS0tQkVHSU4gUFVCTElDIEtFWS0tLS0tIjt2YXIgUFVCTElDX0NMT1NJTkdfQk9VTkRBUlk9Ii0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLSI7bW9kdWxlLmV4cG9ydHM9e3ByaXZhdGVFeHBvcnQ6ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIG49a2V5Lm4udG9CdWZmZXIoKTt2YXIgZD1rZXkuZC50b0J1ZmZlcigpO3ZhciBwPWtleS5wLnRvQnVmZmVyKCk7dmFyIHE9a2V5LnEudG9CdWZmZXIoKTt2YXIgZG1wMT1rZXkuZG1wMS50b0J1ZmZlcigpO3ZhciBkbXExPWtleS5kbXExLnRvQnVmZmVyKCk7dmFyIGNvZWZmPWtleS5jb2VmZi50b0J1ZmZlcigpO3ZhciBsZW5ndGg9bi5sZW5ndGgrZC5sZW5ndGgrcC5sZW5ndGgrcS5sZW5ndGgrZG1wMS5sZW5ndGgrZG1xMS5sZW5ndGgrY29lZmYubGVuZ3RoKzUxMjt2YXIgYm9keVdyaXRlcj1uZXcgYmVyLldyaXRlcih7c2l6ZTpsZW5ndGh9KTtib2R5V3JpdGVyLnN0YXJ0U2VxdWVuY2UoKTtib2R5V3JpdGVyLndyaXRlSW50KDApO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIobiwyKTtib2R5V3JpdGVyLndyaXRlSW50KGtleS5lKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKGQsMik7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihwLDIpO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIocSwyKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKGRtcDEsMik7Ym9keVdyaXRlci53cml0ZUJ1ZmZlcihkbXExLDIpO2JvZHlXcml0ZXIud3JpdGVCdWZmZXIoY29lZmYsMik7Ym9keVdyaXRlci5lbmRTZXF1ZW5jZSgpO3ZhciB3cml0ZXI9bmV3IGJlci5Xcml0ZXIoe3NpemU6bGVuZ3RofSk7d3JpdGVyLnN0YXJ0U2VxdWVuY2UoKTt3cml0ZXIud3JpdGVJbnQoMCk7d3JpdGVyLnN0YXJ0U2VxdWVuY2UoKTt3cml0ZXIud3JpdGVPSUQoUFVCTElDX1JTQV9PSUQpO3dyaXRlci53cml0ZU51bGwoKTt3cml0ZXIuZW5kU2VxdWVuY2UoKTt3cml0ZXIud3JpdGVCdWZmZXIoYm9keVdyaXRlci5idWZmZXIsNCk7d3JpdGVyLmVuZFNlcXVlbmNlKCk7aWYob3B0aW9ucy50eXBlPT09ImRlciIpe3JldHVybiB3cml0ZXIuYnVmZmVyfWVsc2V7cmV0dXJuIFBSSVZBVEVfT1BFTklOR19CT1VOREFSWSsiXG4iK3V0aWxzLmxpbmVicmsod3JpdGVyLmJ1ZmZlci50b1N0cmluZygiYmFzZTY0IiksNjQpKyJcbiIrUFJJVkFURV9DTE9TSU5HX0JPVU5EQVJZfX0scHJpdmF0ZUltcG9ydDpmdW5jdGlvbihrZXksZGF0YSxvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBidWZmZXI7aWYob3B0aW9ucy50eXBlIT09ImRlciIpe2lmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl7ZGF0YT1kYXRhLnRvU3RyaW5nKCJ1dGY4Iil9aWYoXy5pc1N0cmluZyhkYXRhKSl7dmFyIHBlbT11dGlscy50cmltU3Vycm91bmRpbmdUZXh0KGRhdGEsUFJJVkFURV9PUEVOSU5HX0JPVU5EQVJZLFBSSVZBVEVfQ0xPU0lOR19CT1VOREFSWSkucmVwbGFjZSgiLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLSIsIiIpLnJlcGxhY2UoL1xzK3xcblxyfFxufFxyJC9nbSwiIik7YnVmZmVyPUJ1ZmZlci5mcm9tKHBlbSwiYmFzZTY0Iil9ZWxzZXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQga2V5IGZvcm1hdCIpfX1lbHNlIGlmKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSl7YnVmZmVyPWRhdGF9ZWxzZXt0aHJvdyBFcnJvcigiVW5zdXBwb3J0ZWQga2V5IGZvcm1hdCIpfXZhciByZWFkZXI9bmV3IGJlci5SZWFkZXIoYnVmZmVyKTtyZWFkZXIucmVhZFNlcXVlbmNlKCk7cmVhZGVyLnJlYWRJbnQoMCk7dmFyIGhlYWRlcj1uZXcgYmVyLlJlYWRlcihyZWFkZXIucmVhZFN0cmluZyg0OCx0cnVlKSk7aWYoaGVhZGVyLnJlYWRPSUQoNix0cnVlKSE9PVBVQkxJQ19SU0FfT0lEKXt0aHJvdyBFcnJvcigiSW52YWxpZCBQdWJsaWMga2V5IGZvcm1hdCIpfXZhciBib2R5PW5ldyBiZXIuUmVhZGVyKHJlYWRlci5yZWFkU3RyaW5nKDQsdHJ1ZSkpO2JvZHkucmVhZFNlcXVlbmNlKCk7Ym9keS5yZWFkU3RyaW5nKDIsdHJ1ZSk7a2V5LnNldFByaXZhdGUoYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSksYm9keS5yZWFkU3RyaW5nKDIsdHJ1ZSkpfSxwdWJsaWNFeHBvcnQ6ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIG49a2V5Lm4udG9CdWZmZXIoKTt2YXIgbGVuZ3RoPW4ubGVuZ3RoKzUxMjt2YXIgYm9keVdyaXRlcj1uZXcgYmVyLldyaXRlcih7c2l6ZTpsZW5ndGh9KTtib2R5V3JpdGVyLndyaXRlQnl0ZSgwKTtib2R5V3JpdGVyLnN0YXJ0U2VxdWVuY2UoKTtib2R5V3JpdGVyLndyaXRlQnVmZmVyKG4sMik7Ym9keVdyaXRlci53cml0ZUludChrZXkuZSk7Ym9keVdyaXRlci5lbmRTZXF1ZW5jZSgpO3ZhciB3cml0ZXI9bmV3IGJlci5Xcml0ZXIoe3NpemU6bGVuZ3RofSk7d3JpdGVyLnN0YXJ0U2VxdWVuY2UoKTt3cml0ZXIuc3RhcnRTZXF1ZW5jZSgpO3dyaXRlci53cml0ZU9JRChQVUJMSUNfUlNBX09JRCk7d3JpdGVyLndyaXRlTnVsbCgpO3dyaXRlci5lbmRTZXF1ZW5jZSgpO3dyaXRlci53cml0ZUJ1ZmZlcihib2R5V3JpdGVyLmJ1ZmZlciwzKTt3cml0ZXIuZW5kU2VxdWVuY2UoKTtpZihvcHRpb25zLnR5cGU9PT0iZGVyIil7cmV0dXJuIHdyaXRlci5idWZmZXJ9ZWxzZXtyZXR1cm4gUFVCTElDX09QRU5JTkdfQk9VTkRBUlkrIlxuIit1dGlscy5saW5lYnJrKHdyaXRlci5idWZmZXIudG9TdHJpbmcoImJhc2U2NCIpLDY0KSsiXG4iK1BVQkxJQ19DTE9TSU5HX0JPVU5EQVJZfX0scHVibGljSW1wb3J0OmZ1bmN0aW9uKGtleSxkYXRhLG9wdGlvbnMpe29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGJ1ZmZlcjtpZihvcHRpb25zLnR5cGUhPT0iZGVyIil7aWYoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKXtkYXRhPWRhdGEudG9TdHJpbmcoInV0ZjgiKX1pZihfLmlzU3RyaW5nKGRhdGEpKXt2YXIgcGVtPXV0aWxzLnRyaW1TdXJyb3VuZGluZ1RleHQoZGF0YSxQVUJMSUNfT1BFTklOR19CT1VOREFSWSxQVUJMSUNfQ0xPU0lOR19CT1VOREFSWSkucmVwbGFjZSgvXHMrfFxuXHJ8XG58XHIkL2dtLCIiKTtidWZmZXI9QnVmZmVyLmZyb20ocGVtLCJiYXNlNjQiKX19ZWxzZSBpZihCdWZmZXIuaXNCdWZmZXIoZGF0YSkpe2J1ZmZlcj1kYXRhfWVsc2V7dGhyb3cgRXJyb3IoIlVuc3VwcG9ydGVkIGtleSBmb3JtYXQiKX12YXIgcmVhZGVyPW5ldyBiZXIuUmVhZGVyKGJ1ZmZlcik7cmVhZGVyLnJlYWRTZXF1ZW5jZSgpO3ZhciBoZWFkZXI9bmV3IGJlci5SZWFkZXIocmVhZGVyLnJlYWRTdHJpbmcoNDgsdHJ1ZSkpO2lmKGhlYWRlci5yZWFkT0lEKDYsdHJ1ZSkhPT1QVUJMSUNfUlNBX09JRCl7dGhyb3cgRXJyb3IoIkludmFsaWQgUHVibGljIGtleSBmb3JtYXQiKX12YXIgYm9keT1uZXcgYmVyLlJlYWRlcihyZWFkZXIucmVhZFN0cmluZygzLHRydWUpKTtib2R5LnJlYWRCeXRlKCk7Ym9keS5yZWFkU2VxdWVuY2UoKTtrZXkuc2V0UHVibGljKGJvZHkucmVhZFN0cmluZygyLHRydWUpLGJvZHkucmVhZFN0cmluZygyLHRydWUpKX0sYXV0b0ltcG9ydDpmdW5jdGlvbihrZXksZGF0YSl7aWYoL15bXFNcc10qLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXHMqKD89KChbQS1aYS16MC05Ky89XStccyopKykpXDEtLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tW1xTXHNdKiQvZy50ZXN0KGRhdGEpKXttb2R1bGUuZXhwb3J0cy5wcml2YXRlSW1wb3J0KGtleSxkYXRhKTtyZXR1cm4gdHJ1ZX1pZigvXltcU1xzXSotLS0tLUJFR0lOIFBVQkxJQyBLRVktLS0tLVxzKig/PSgoW0EtWmEtejAtOSsvPV0rXHMqKSspKVwxLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tW1xTXHNdKiQvZy50ZXN0KGRhdGEpKXttb2R1bGUuZXhwb3J0cy5wdWJsaWNJbXBvcnQoa2V5LGRhdGEpO3JldHVybiB0cnVlfXJldHVybiBmYWxzZX19fSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi4vdXRpbHMiOjU4LGFzbjE6MTksYnVmZmVyOjI3fV0sNTI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihCdWZmZXIpe3ZhciBjcnlwdD1yZXF1aXJlKCIuLi9jcnlwdG8iKTt2YXIgXz1yZXF1aXJlKCIuLi91dGlscyIpLl87dmFyIHBldGVyT2xzb25fQmlnSW50ZWdlclN0YXRpYz1yZXF1aXJlKCJiaWctaW50ZWdlciIpO3ZhciBkYml0czt2YXIgY2FuYXJ5PTB4ZGVhZGJlZWZjYWZlO3ZhciBqX2xtPShjYW5hcnkmMTY3NzcyMTUpPT0xNTcxNTA3MDtmdW5jdGlvbiBCaWdJbnRlZ2VyKGEsYil7aWYoYSE9bnVsbCl7aWYoIm51bWJlciI9PXR5cGVvZiBhKXt0aGlzLmZyb21OdW1iZXIoYSxiKX1lbHNlIGlmKEJ1ZmZlci5pc0J1ZmZlcihhKSl7dGhpcy5mcm9tQnVmZmVyKGEpfWVsc2UgaWYoYj09bnVsbCYmInN0cmluZyIhPXR5cGVvZiBhKXt0aGlzLmZyb21CeXRlQXJyYXkoYSl9ZWxzZXt0aGlzLmZyb21TdHJpbmcoYSxiKX19fWZ1bmN0aW9uIG5iaSgpe3JldHVybiBuZXcgQmlnSW50ZWdlcihudWxsKX1mdW5jdGlvbiBhbTEoaSx4LHcsaixjLG4pe3doaWxlKC0tbj49MCl7dmFyIHY9eCp0aGlzW2krK10rd1tqXStjO2M9TWF0aC5mbG9vcih2LzY3MTA4ODY0KTt3W2orK109diY2NzEwODg2M31yZXR1cm4gY31mdW5jdGlvbiBhbTIoaSx4LHcsaixjLG4pe3ZhciB4bD14JjMyNzY3LHhoPXg+PjE1O3doaWxlKC0tbj49MCl7dmFyIGw9dGhpc1tpXSYzMjc2Nzt2YXIgaD10aGlzW2krK10+PjE1O3ZhciBtPXhoKmwraCp4bDtsPXhsKmwrKChtJjMyNzY3KTw8MTUpK3dbal0rKGMmMTA3Mzc0MTgyMyk7Yz0obD4+PjMwKSsobT4+PjE1KSt4aCpoKyhjPj4+MzApO3dbaisrXT1sJjEwNzM3NDE4MjN9cmV0dXJuIGN9ZnVuY3Rpb24gYW0zKGkseCx3LGosYyxuKXt2YXIgeGw9eCYxNjM4Myx4aD14Pj4xNDt3aGlsZSgtLW4+PTApe3ZhciBsPXRoaXNbaV0mMTYzODM7dmFyIGg9dGhpc1tpKytdPj4xNDt2YXIgbT14aCpsK2gqeGw7bD14bCpsKygobSYxNjM4Myk8PDE0KSt3W2pdK2M7Yz0obD4+MjgpKyhtPj4xNCkreGgqaDt3W2orK109bCYyNjg0MzU0NTV9cmV0dXJuIGN9QmlnSW50ZWdlci5wcm90b3R5cGUuYW09YW0zO2RiaXRzPTI4O0JpZ0ludGVnZXIucHJvdG90eXBlLkRCPWRiaXRzO0JpZ0ludGVnZXIucHJvdG90eXBlLkRNPSgxPDxkYml0cyktMTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5EVj0xPDxkYml0czt2YXIgQklfRlA9NTI7QmlnSW50ZWdlci5wcm90b3R5cGUuRlY9TWF0aC5wb3coMixCSV9GUCk7QmlnSW50ZWdlci5wcm90b3R5cGUuRjE9QklfRlAtZGJpdHM7QmlnSW50ZWdlci5wcm90b3R5cGUuRjI9MipkYml0cy1CSV9GUDt2YXIgQklfUk09IjAxMjM0NTY3ODlhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiI7dmFyIEJJX1JDPW5ldyBBcnJheTt2YXIgcnIsdnY7cnI9IjAiLmNoYXJDb2RlQXQoMCk7Zm9yKHZ2PTA7dnY8PTk7Kyt2dilCSV9SQ1tycisrXT12djtycj0iYSIuY2hhckNvZGVBdCgwKTtmb3IodnY9MTA7dnY8MzY7Kyt2dilCSV9SQ1tycisrXT12djtycj0iQSIuY2hhckNvZGVBdCgwKTtmb3IodnY9MTA7dnY8MzY7Kyt2dilCSV9SQ1tycisrXT12djtmdW5jdGlvbiBpbnQyY2hhcihuKXtyZXR1cm4gQklfUk0uY2hhckF0KG4pfWZ1bmN0aW9uIGludEF0KHMsaSl7dmFyIGM9QklfUkNbcy5jaGFyQ29kZUF0KGkpXTtyZXR1cm4gYz09bnVsbD8tMTpjfWZ1bmN0aW9uIGJucENvcHlUbyhyKXtmb3IodmFyIGk9dGhpcy50LTE7aT49MDstLWkpcltpXT10aGlzW2ldO3IudD10aGlzLnQ7ci5zPXRoaXMuc31mdW5jdGlvbiBibnBGcm9tSW50KHgpe3RoaXMudD0xO3RoaXMucz14PDA/LTE6MDtpZih4PjApdGhpc1swXT14O2Vsc2UgaWYoeDwtMSl0aGlzWzBdPXgrRFY7ZWxzZSB0aGlzLnQ9MH1mdW5jdGlvbiBuYnYoaSl7dmFyIHI9bmJpKCk7ci5mcm9tSW50KGkpO3JldHVybiByfWZ1bmN0aW9uIGJucEZyb21TdHJpbmcoZGF0YSxyYWRpeCx1bnNpZ25lZCl7dmFyIGs7c3dpdGNoKHJhZGl4KXtjYXNlIDI6az0xO2JyZWFrO2Nhc2UgNDprPTI7YnJlYWs7Y2FzZSA4Oms9MzticmVhaztjYXNlIDE2Oms9NDticmVhaztjYXNlIDMyOms9NTticmVhaztjYXNlIDI1NjprPTg7YnJlYWs7ZGVmYXVsdDp0aGlzLmZyb21SYWRpeChkYXRhLHJhZGl4KTtyZXR1cm59dGhpcy50PTA7dGhpcy5zPTA7dmFyIGk9ZGF0YS5sZW5ndGg7dmFyIG1pPWZhbHNlO3ZhciBzaD0wO3doaWxlKC0taT49MCl7dmFyIHg9az09OD9kYXRhW2ldJjI1NTppbnRBdChkYXRhLGkpO2lmKHg8MCl7aWYoZGF0YS5jaGFyQXQoaSk9PSItIiltaT10cnVlO2NvbnRpbnVlfW1pPWZhbHNlO2lmKHNoPT09MCl0aGlzW3RoaXMudCsrXT14O2Vsc2UgaWYoc2graz50aGlzLkRCKXt0aGlzW3RoaXMudC0xXXw9KHgmKDE8PHRoaXMuREItc2gpLTEpPDxzaDt0aGlzW3RoaXMudCsrXT14Pj50aGlzLkRCLXNofWVsc2UgdGhpc1t0aGlzLnQtMV18PXg8PHNoO3NoKz1rO2lmKHNoPj10aGlzLkRCKXNoLT10aGlzLkRCfWlmKCF1bnNpZ25lZCYmaz09OCYmKGRhdGFbMF0mMTI4KSE9MCl7dGhpcy5zPS0xO2lmKHNoPjApdGhpc1t0aGlzLnQtMV18PSgxPDx0aGlzLkRCLXNoKS0xPDxzaH10aGlzLmNsYW1wKCk7aWYobWkpQmlnSW50ZWdlci5aRVJPLnN1YlRvKHRoaXMsdGhpcyl9ZnVuY3Rpb24gYm5wRnJvbUJ5dGVBcnJheShhLHVuc2lnbmVkKXt0aGlzLmZyb21TdHJpbmcoYSwyNTYsdW5zaWduZWQpfWZ1bmN0aW9uIGJucEZyb21CdWZmZXIoYSl7dGhpcy5mcm9tU3RyaW5nKGEsMjU2LHRydWUpfWZ1bmN0aW9uIGJucENsYW1wKCl7dmFyIGM9dGhpcy5zJnRoaXMuRE07d2hpbGUodGhpcy50PjAmJnRoaXNbdGhpcy50LTFdPT1jKS0tdGhpcy50fWZ1bmN0aW9uIGJuVG9TdHJpbmcoYil7aWYodGhpcy5zPDApcmV0dXJuIi0iK3RoaXMubmVnYXRlKCkudG9TdHJpbmcoYik7dmFyIGs7aWYoYj09MTYpaz00O2Vsc2UgaWYoYj09OClrPTM7ZWxzZSBpZihiPT0yKWs9MTtlbHNlIGlmKGI9PTMyKWs9NTtlbHNlIGlmKGI9PTQpaz0yO2Vsc2UgcmV0dXJuIHRoaXMudG9SYWRpeChiKTt2YXIga209KDE8PGspLTEsZCxtPWZhbHNlLHI9IiIsaT10aGlzLnQ7dmFyIHA9dGhpcy5EQi1pKnRoaXMuREIlaztpZihpLS0gPjApe2lmKHA8dGhpcy5EQiYmKGQ9dGhpc1tpXT4+cCk+MCl7bT10cnVlO3I9aW50MmNoYXIoZCl9d2hpbGUoaT49MCl7aWYocDxrKXtkPSh0aGlzW2ldJigxPDxwKS0xKTw8ay1wO2R8PXRoaXNbLS1pXT4+KHArPXRoaXMuREItayl9ZWxzZXtkPXRoaXNbaV0+PihwLT1rKSZrbTtpZihwPD0wKXtwKz10aGlzLkRCOy0taX19aWYoZD4wKW09dHJ1ZTtpZihtKXIrPWludDJjaGFyKGQpfX1yZXR1cm4gbT9yOiIwIn1mdW5jdGlvbiBibk5lZ2F0ZSgpe3ZhciByPW5iaSgpO0JpZ0ludGVnZXIuWkVSTy5zdWJUbyh0aGlzLHIpO3JldHVybiByfWZ1bmN0aW9uIGJuQWJzKCl7cmV0dXJuIHRoaXMuczwwP3RoaXMubmVnYXRlKCk6dGhpc31mdW5jdGlvbiBibkNvbXBhcmVUbyhhKXt2YXIgcj10aGlzLnMtYS5zO2lmKHIhPTApcmV0dXJuIHI7dmFyIGk9dGhpcy50O3I9aS1hLnQ7aWYociE9MClyZXR1cm4gdGhpcy5zPDA/LXI6cjt3aGlsZSgtLWk+PTApaWYoKHI9dGhpc1tpXS1hW2ldKSE9MClyZXR1cm4gcjtyZXR1cm4gMH1mdW5jdGlvbiBuYml0cyh4KXt2YXIgcj0xLHQ7aWYoKHQ9eD4+PjE2KSE9MCl7eD10O3IrPTE2fWlmKCh0PXg+PjgpIT0wKXt4PXQ7cis9OH1pZigodD14Pj40KSE9MCl7eD10O3IrPTR9aWYoKHQ9eD4+MikhPTApe3g9dDtyKz0yfWlmKCh0PXg+PjEpIT0wKXt4PXQ7cis9MX1yZXR1cm4gcn1mdW5jdGlvbiBibkJpdExlbmd0aCgpe2lmKHRoaXMudDw9MClyZXR1cm4gMDtyZXR1cm4gdGhpcy5EQioodGhpcy50LTEpK25iaXRzKHRoaXNbdGhpcy50LTFdXnRoaXMucyZ0aGlzLkRNKX1mdW5jdGlvbiBibnBETFNoaWZ0VG8obixyKXt2YXIgaTtmb3IoaT10aGlzLnQtMTtpPj0wOy0taSlyW2krbl09dGhpc1tpXTtmb3IoaT1uLTE7aT49MDstLWkpcltpXT0wO3IudD10aGlzLnQrbjtyLnM9dGhpcy5zfWZ1bmN0aW9uIGJucERSU2hpZnRUbyhuLHIpe2Zvcih2YXIgaT1uO2k8dGhpcy50OysraSlyW2ktbl09dGhpc1tpXTtyLnQ9TWF0aC5tYXgodGhpcy50LW4sMCk7ci5zPXRoaXMuc31mdW5jdGlvbiBibnBMU2hpZnRUbyhuLHIpe3ZhciBicz1uJXRoaXMuREI7dmFyIGNicz10aGlzLkRCLWJzO3ZhciBibT0oMTw8Y2JzKS0xO3ZhciBkcz1NYXRoLmZsb29yKG4vdGhpcy5EQiksYz10aGlzLnM8PGJzJnRoaXMuRE0saTtmb3IoaT10aGlzLnQtMTtpPj0wOy0taSl7cltpK2RzKzFdPXRoaXNbaV0+PmNic3xjO2M9KHRoaXNbaV0mYm0pPDxic31mb3IoaT1kcy0xO2k+PTA7LS1pKXJbaV09MDtyW2RzXT1jO3IudD10aGlzLnQrZHMrMTtyLnM9dGhpcy5zO3IuY2xhbXAoKX1mdW5jdGlvbiBibnBSU2hpZnRUbyhuLHIpe3Iucz10aGlzLnM7dmFyIGRzPU1hdGguZmxvb3Iobi90aGlzLkRCKTtpZihkcz49dGhpcy50KXtyLnQ9MDtyZXR1cm59dmFyIGJzPW4ldGhpcy5EQjt2YXIgY2JzPXRoaXMuREItYnM7dmFyIGJtPSgxPDxicyktMTtyWzBdPXRoaXNbZHNdPj5icztmb3IodmFyIGk9ZHMrMTtpPHRoaXMudDsrK2kpe3JbaS1kcy0xXXw9KHRoaXNbaV0mYm0pPDxjYnM7cltpLWRzXT10aGlzW2ldPj5ic31pZihicz4wKXJbdGhpcy50LWRzLTFdfD0odGhpcy5zJmJtKTw8Y2JzO3IudD10aGlzLnQtZHM7ci5jbGFtcCgpfWZ1bmN0aW9uIGJucFN1YlRvKGEscil7dmFyIGk9MCxjPTAsbT1NYXRoLm1pbihhLnQsdGhpcy50KTt3aGlsZShpPG0pe2MrPXRoaXNbaV0tYVtpXTtyW2krK109YyZ0aGlzLkRNO2M+Pj10aGlzLkRCfWlmKGEudDx0aGlzLnQpe2MtPWEuczt3aGlsZShpPHRoaXMudCl7Yys9dGhpc1tpXTtyW2krK109YyZ0aGlzLkRNO2M+Pj10aGlzLkRCfWMrPXRoaXMuc31lbHNle2MrPXRoaXMuczt3aGlsZShpPGEudCl7Yy09YVtpXTtyW2krK109YyZ0aGlzLkRNO2M+Pj10aGlzLkRCfWMtPWEuc31yLnM9YzwwPy0xOjA7aWYoYzwtMSlyW2krK109dGhpcy5EVitjO2Vsc2UgaWYoYz4wKXJbaSsrXT1jO3IudD1pO3IuY2xhbXAoKX1mdW5jdGlvbiBibnBNdWx0aXBseVRvKGEscil7dmFyIHg9dGhpcy5hYnMoKSx5PWEuYWJzKCk7dmFyIGk9eC50O3IudD1pK3kudDt3aGlsZSgtLWk+PTApcltpXT0wO2ZvcihpPTA7aTx5LnQ7KytpKXJbaSt4LnRdPXguYW0oMCx5W2ldLHIsaSwwLHgudCk7ci5zPTA7ci5jbGFtcCgpO2lmKHRoaXMucyE9YS5zKUJpZ0ludGVnZXIuWkVSTy5zdWJUbyhyLHIpfWZ1bmN0aW9uIGJucFNxdWFyZVRvKHIpe3ZhciB4PXRoaXMuYWJzKCk7dmFyIGk9ci50PTIqeC50O3doaWxlKC0taT49MClyW2ldPTA7Zm9yKGk9MDtpPHgudC0xOysraSl7dmFyIGM9eC5hbShpLHhbaV0sciwyKmksMCwxKTtpZigocltpK3gudF0rPXguYW0oaSsxLDIqeFtpXSxyLDIqaSsxLGMseC50LWktMSkpPj14LkRWKXtyW2kreC50XS09eC5EVjtyW2kreC50KzFdPTF9fWlmKHIudD4wKXJbci50LTFdKz14LmFtKGkseFtpXSxyLDIqaSwwLDEpO3Iucz0wO3IuY2xhbXAoKX1mdW5jdGlvbiBibnBEaXZSZW1UbyhtLHEscil7dmFyIHBtPW0uYWJzKCk7aWYocG0udDw9MClyZXR1cm47dmFyIHB0PXRoaXMuYWJzKCk7aWYocHQudDxwbS50KXtpZihxIT1udWxsKXEuZnJvbUludCgwKTtpZihyIT1udWxsKXRoaXMuY29weVRvKHIpO3JldHVybn1pZihyPT1udWxsKXI9bmJpKCk7dmFyIHk9bmJpKCksdHM9dGhpcy5zLG1zPW0uczt2YXIgbnNoPXRoaXMuREItbmJpdHMocG1bcG0udC0xXSk7aWYobnNoPjApe3BtLmxTaGlmdFRvKG5zaCx5KTtwdC5sU2hpZnRUbyhuc2gscil9ZWxzZXtwbS5jb3B5VG8oeSk7cHQuY29weVRvKHIpfXZhciB5cz15LnQ7dmFyIHkwPXlbeXMtMV07aWYoeTA9PT0wKXJldHVybjt2YXIgeXQ9eTAqKDE8PHRoaXMuRjEpKyh5cz4xP3lbeXMtMl0+PnRoaXMuRjI6MCk7dmFyIGQxPXRoaXMuRlYveXQsZDI9KDE8PHRoaXMuRjEpL3l0LGU9MTw8dGhpcy5GMjt2YXIgaT1yLnQsaj1pLXlzLHQ9cT09bnVsbD9uYmkoKTpxO3kuZGxTaGlmdFRvKGosdCk7aWYoci5jb21wYXJlVG8odCk+PTApe3Jbci50KytdPTE7ci5zdWJUbyh0LHIpfUJpZ0ludGVnZXIuT05FLmRsU2hpZnRUbyh5cyx0KTt0LnN1YlRvKHkseSk7d2hpbGUoeS50PHlzKXlbeS50KytdPTA7d2hpbGUoLS1qPj0wKXt2YXIgcWQ9clstLWldPT15MD90aGlzLkRNOk1hdGguZmxvb3IocltpXSpkMSsocltpLTFdK2UpKmQyKTtpZigocltpXSs9eS5hbSgwLHFkLHIsaiwwLHlzKSk8cWQpe3kuZGxTaGlmdFRvKGosdCk7ci5zdWJUbyh0LHIpO3doaWxlKHJbaV08LS1xZClyLnN1YlRvKHQscil9fWlmKHEhPW51bGwpe3IuZHJTaGlmdFRvKHlzLHEpO2lmKHRzIT1tcylCaWdJbnRlZ2VyLlpFUk8uc3ViVG8ocSxxKX1yLnQ9eXM7ci5jbGFtcCgpO2lmKG5zaD4wKXIuclNoaWZ0VG8obnNoLHIpO2lmKHRzPDApQmlnSW50ZWdlci5aRVJPLnN1YlRvKHIscil9ZnVuY3Rpb24gYm5Nb2QoYSl7dmFyIHI9bmJpKCk7dGhpcy5hYnMoKS5kaXZSZW1UbyhhLG51bGwscik7aWYodGhpcy5zPDAmJnIuY29tcGFyZVRvKEJpZ0ludGVnZXIuWkVSTyk+MClhLnN1YlRvKHIscik7cmV0dXJuIHJ9ZnVuY3Rpb24gQ2xhc3NpYyhtKXt0aGlzLm09bX1mdW5jdGlvbiBjQ29udmVydCh4KXtpZih4LnM8MHx8eC5jb21wYXJlVG8odGhpcy5tKT49MClyZXR1cm4geC5tb2QodGhpcy5tKTtlbHNlIHJldHVybiB4fWZ1bmN0aW9uIGNSZXZlcnQoeCl7cmV0dXJuIHh9ZnVuY3Rpb24gY1JlZHVjZSh4KXt4LmRpdlJlbVRvKHRoaXMubSxudWxsLHgpfWZ1bmN0aW9uIGNNdWxUbyh4LHkscil7eC5tdWx0aXBseVRvKHkscik7dGhpcy5yZWR1Y2Uocil9ZnVuY3Rpb24gY1NxclRvKHgscil7eC5zcXVhcmVUbyhyKTt0aGlzLnJlZHVjZShyKX1DbGFzc2ljLnByb3RvdHlwZS5jb252ZXJ0PWNDb252ZXJ0O0NsYXNzaWMucHJvdG90eXBlLnJldmVydD1jUmV2ZXJ0O0NsYXNzaWMucHJvdG90eXBlLnJlZHVjZT1jUmVkdWNlO0NsYXNzaWMucHJvdG90eXBlLm11bFRvPWNNdWxUbztDbGFzc2ljLnByb3RvdHlwZS5zcXJUbz1jU3FyVG87ZnVuY3Rpb24gYm5wSW52RGlnaXQoKXtpZih0aGlzLnQ8MSlyZXR1cm4gMDt2YXIgeD10aGlzWzBdO2lmKCh4JjEpPT09MClyZXR1cm4gMDt2YXIgeT14JjM7eT15KigyLSh4JjE1KSp5KSYxNTt5PXkqKDItKHgmMjU1KSp5KSYyNTU7eT15KigyLSgoeCY2NTUzNSkqeSY2NTUzNSkpJjY1NTM1O3k9eSooMi14KnkldGhpcy5EVikldGhpcy5EVjtyZXR1cm4geT4wP3RoaXMuRFYteToteX1mdW5jdGlvbiBNb250Z29tZXJ5KG0pe3RoaXMubT1tO3RoaXMubXA9bS5pbnZEaWdpdCgpO3RoaXMubXBsPXRoaXMubXAmMzI3Njc7dGhpcy5tcGg9dGhpcy5tcD4+MTU7dGhpcy51bT0oMTw8bS5EQi0xNSktMTt0aGlzLm10Mj0yKm0udH1mdW5jdGlvbiBtb250Q29udmVydCh4KXt2YXIgcj1uYmkoKTt4LmFicygpLmRsU2hpZnRUbyh0aGlzLm0udCxyKTtyLmRpdlJlbVRvKHRoaXMubSxudWxsLHIpO2lmKHguczwwJiZyLmNvbXBhcmVUbyhCaWdJbnRlZ2VyLlpFUk8pPjApdGhpcy5tLnN1YlRvKHIscik7cmV0dXJuIHJ9ZnVuY3Rpb24gbW9udFJldmVydCh4KXt2YXIgcj1uYmkoKTt4LmNvcHlUbyhyKTt0aGlzLnJlZHVjZShyKTtyZXR1cm4gcn1mdW5jdGlvbiBtb250UmVkdWNlKHgpe3doaWxlKHgudDw9dGhpcy5tdDIpeFt4LnQrK109MDtmb3IodmFyIGk9MDtpPHRoaXMubS50OysraSl7dmFyIGo9eFtpXSYzMjc2Nzt2YXIgdTA9aip0aGlzLm1wbCsoKGoqdGhpcy5tcGgrKHhbaV0+PjE1KSp0aGlzLm1wbCZ0aGlzLnVtKTw8MTUpJnguRE07aj1pK3RoaXMubS50O3hbal0rPXRoaXMubS5hbSgwLHUwLHgsaSwwLHRoaXMubS50KTt3aGlsZSh4W2pdPj14LkRWKXt4W2pdLT14LkRWO3hbKytqXSsrfX14LmNsYW1wKCk7eC5kclNoaWZ0VG8odGhpcy5tLnQseCk7aWYoeC5jb21wYXJlVG8odGhpcy5tKT49MCl4LnN1YlRvKHRoaXMubSx4KX1mdW5jdGlvbiBtb250U3FyVG8oeCxyKXt4LnNxdWFyZVRvKHIpO3RoaXMucmVkdWNlKHIpfWZ1bmN0aW9uIG1vbnRNdWxUbyh4LHkscil7eC5tdWx0aXBseVRvKHkscik7dGhpcy5yZWR1Y2Uocil9TW9udGdvbWVyeS5wcm90b3R5cGUuY29udmVydD1tb250Q29udmVydDtNb250Z29tZXJ5LnByb3RvdHlwZS5yZXZlcnQ9bW9udFJldmVydDtNb250Z29tZXJ5LnByb3RvdHlwZS5yZWR1Y2U9bW9udFJlZHVjZTtNb250Z29tZXJ5LnByb3RvdHlwZS5tdWxUbz1tb250TXVsVG87TW9udGdvbWVyeS5wcm90b3R5cGUuc3FyVG89bW9udFNxclRvO2Z1bmN0aW9uIGJucElzRXZlbigpe3JldHVybih0aGlzLnQ+MD90aGlzWzBdJjE6dGhpcy5zKT09PTB9ZnVuY3Rpb24gYm5wRXhwKGUseil7aWYoZT40Mjk0OTY3Mjk1fHxlPDEpcmV0dXJuIEJpZ0ludGVnZXIuT05FO3ZhciByPW5iaSgpLHIyPW5iaSgpLGc9ei5jb252ZXJ0KHRoaXMpLGk9bmJpdHMoZSktMTtnLmNvcHlUbyhyKTt3aGlsZSgtLWk+PTApe3ouc3FyVG8ocixyMik7aWYoKGUmMTw8aSk+MCl6Lm11bFRvKHIyLGcscik7ZWxzZXt2YXIgdD1yO3I9cjI7cjI9dH19cmV0dXJuIHoucmV2ZXJ0KHIpfWZ1bmN0aW9uIGJuTW9kUG93SW50KGUsbSl7dmFyIHo7aWYoZTwyNTZ8fG0uaXNFdmVuKCkpej1uZXcgQ2xhc3NpYyhtKTtlbHNlIHo9bmV3IE1vbnRnb21lcnkobSk7cmV0dXJuIHRoaXMuZXhwKGUseil9ZnVuY3Rpb24gYm5DbG9uZSgpe3ZhciByPW5iaSgpO3RoaXMuY29weVRvKHIpO3JldHVybiByfWZ1bmN0aW9uIGJuSW50VmFsdWUoKXtpZih0aGlzLnM8MCl7aWYodGhpcy50PT0xKXJldHVybiB0aGlzWzBdLXRoaXMuRFY7ZWxzZSBpZih0aGlzLnQ9PT0wKXJldHVybi0xfWVsc2UgaWYodGhpcy50PT0xKXJldHVybiB0aGlzWzBdO2Vsc2UgaWYodGhpcy50PT09MClyZXR1cm4gMDtyZXR1cm4odGhpc1sxXSYoMTw8MzItdGhpcy5EQiktMSk8PHRoaXMuREJ8dGhpc1swXX1mdW5jdGlvbiBibkJ5dGVWYWx1ZSgpe3JldHVybiB0aGlzLnQ9PTA/dGhpcy5zOnRoaXNbMF08PDI0Pj4yNH1mdW5jdGlvbiBiblNob3J0VmFsdWUoKXtyZXR1cm4gdGhpcy50PT0wP3RoaXMuczp0aGlzWzBdPDwxNj4+MTZ9ZnVuY3Rpb24gYm5wQ2h1bmtTaXplKHIpe3JldHVybiBNYXRoLmZsb29yKE1hdGguTE4yKnRoaXMuREIvTWF0aC5sb2cocikpfWZ1bmN0aW9uIGJuU2lnTnVtKCl7aWYodGhpcy5zPDApcmV0dXJuLTE7ZWxzZSBpZih0aGlzLnQ8PTB8fHRoaXMudD09MSYmdGhpc1swXTw9MClyZXR1cm4gMDtlbHNlIHJldHVybiAxfWZ1bmN0aW9uIGJucFRvUmFkaXgoYil7aWYoYj09bnVsbCliPTEwO2lmKHRoaXMuc2lnbnVtKCk9PT0wfHxiPDJ8fGI+MzYpcmV0dXJuIjAiO3ZhciBjcz10aGlzLmNodW5rU2l6ZShiKTt2YXIgYT1NYXRoLnBvdyhiLGNzKTt2YXIgZD1uYnYoYSkseT1uYmkoKSx6PW5iaSgpLHI9IiI7dGhpcy5kaXZSZW1UbyhkLHkseik7d2hpbGUoeS5zaWdudW0oKT4wKXtyPShhK3ouaW50VmFsdWUoKSkudG9TdHJpbmcoYikuc3Vic3RyKDEpK3I7eS5kaXZSZW1UbyhkLHkseil9cmV0dXJuIHouaW50VmFsdWUoKS50b1N0cmluZyhiKStyfWZ1bmN0aW9uIGJucEZyb21SYWRpeChzLGIpe3RoaXMuZnJvbUludCgwKTtpZihiPT1udWxsKWI9MTA7dmFyIGNzPXRoaXMuY2h1bmtTaXplKGIpO3ZhciBkPU1hdGgucG93KGIsY3MpLG1pPWZhbHNlLGo9MCx3PTA7Zm9yKHZhciBpPTA7aTxzLmxlbmd0aDsrK2kpe3ZhciB4PWludEF0KHMsaSk7aWYoeDwwKXtpZihzLmNoYXJBdChpKT09Ii0iJiZ0aGlzLnNpZ251bSgpPT09MCltaT10cnVlO2NvbnRpbnVlfXc9Yip3K3g7aWYoKytqPj1jcyl7dGhpcy5kTXVsdGlwbHkoZCk7dGhpcy5kQWRkT2Zmc2V0KHcsMCk7aj0wO3c9MH19aWYoaj4wKXt0aGlzLmRNdWx0aXBseShNYXRoLnBvdyhiLGopKTt0aGlzLmRBZGRPZmZzZXQodywwKX1pZihtaSlCaWdJbnRlZ2VyLlpFUk8uc3ViVG8odGhpcyx0aGlzKX1mdW5jdGlvbiBibnBGcm9tTnVtYmVyKGEsYil7aWYoIm51bWJlciI9PXR5cGVvZiBiKXtpZihhPDIpdGhpcy5mcm9tSW50KDEpO2Vsc2V7dGhpcy5mcm9tTnVtYmVyKGEpO2lmKCF0aGlzLnRlc3RCaXQoYS0xKSl0aGlzLmJpdHdpc2VUbyhCaWdJbnRlZ2VyLk9ORS5zaGlmdExlZnQoYS0xKSxvcF9vcix0aGlzKTtpZih0aGlzLmlzRXZlbigpKXRoaXMuZEFkZE9mZnNldCgxLDApO3doaWxlKCF0aGlzLmlzUHJvYmFibGVQcmltZShiKSl7dGhpcy5kQWRkT2Zmc2V0KDIsMCk7aWYodGhpcy5iaXRMZW5ndGgoKT5hKXRoaXMuc3ViVG8oQmlnSW50ZWdlci5PTkUuc2hpZnRMZWZ0KGEtMSksdGhpcyl9fX1lbHNle3ZhciB4PWNyeXB0LnJhbmRvbUJ5dGVzKChhPj4zKSsxKTt2YXIgdD1hJjc7aWYodD4wKXhbMF0mPSgxPDx0KS0xO2Vsc2UgeFswXT0wO3RoaXMuZnJvbUJ5dGVBcnJheSh4KX19ZnVuY3Rpb24gYm5Ub0J5dGVBcnJheSgpe3ZhciBpPXRoaXMudCxyPW5ldyBBcnJheTtyWzBdPXRoaXMuczt2YXIgcD10aGlzLkRCLWkqdGhpcy5EQiU4LGQsaz0wO2lmKGktLSA+MCl7aWYocDx0aGlzLkRCJiYoZD10aGlzW2ldPj5wKSE9KHRoaXMucyZ0aGlzLkRNKT4+cClyW2srK109ZHx0aGlzLnM8PHRoaXMuREItcDt3aGlsZShpPj0wKXtpZihwPDgpe2Q9KHRoaXNbaV0mKDE8PHApLTEpPDw4LXA7ZHw9dGhpc1stLWldPj4ocCs9dGhpcy5EQi04KX1lbHNle2Q9dGhpc1tpXT4+KHAtPTgpJjI1NTtpZihwPD0wKXtwKz10aGlzLkRCOy0taX19aWYoKGQmMTI4KSE9MClkfD0tMjU2O2lmKGs9PT0wJiYodGhpcy5zJjEyOCkhPShkJjEyOCkpKytrO2lmKGs+MHx8ZCE9dGhpcy5zKXJbaysrXT1kfX1yZXR1cm4gcn1mdW5jdGlvbiBiblRvQnVmZmVyKHRyaW1PclNpemUpe3ZhciByZXM9QnVmZmVyLmZyb20odGhpcy50b0J5dGVBcnJheSgpKTtpZih0cmltT3JTaXplPT09dHJ1ZSYmcmVzWzBdPT09MCl7cmVzPXJlcy5zbGljZSgxKX1lbHNlIGlmKF8uaXNOdW1iZXIodHJpbU9yU2l6ZSkpe2lmKHJlcy5sZW5ndGg+dHJpbU9yU2l6ZSl7Zm9yKHZhciBpPTA7aTxyZXMubGVuZ3RoLXRyaW1PclNpemU7aSsrKXtpZihyZXNbaV0hPT0wKXtyZXR1cm4gbnVsbH19cmV0dXJuIHJlcy5zbGljZShyZXMubGVuZ3RoLXRyaW1PclNpemUpfWVsc2UgaWYocmVzLmxlbmd0aDx0cmltT3JTaXplKXt2YXIgcGFkZGVkPUJ1ZmZlci5hbGxvYyh0cmltT3JTaXplKTtwYWRkZWQuZmlsbCgwLDAsdHJpbU9yU2l6ZS1yZXMubGVuZ3RoKTtyZXMuY29weShwYWRkZWQsdHJpbU9yU2l6ZS1yZXMubGVuZ3RoKTtyZXR1cm4gcGFkZGVkfX1yZXR1cm4gcmVzfWZ1bmN0aW9uIGJuRXF1YWxzKGEpe3JldHVybiB0aGlzLmNvbXBhcmVUbyhhKT09MH1mdW5jdGlvbiBibk1pbihhKXtyZXR1cm4gdGhpcy5jb21wYXJlVG8oYSk8MD90aGlzOmF9ZnVuY3Rpb24gYm5NYXgoYSl7cmV0dXJuIHRoaXMuY29tcGFyZVRvKGEpPjA/dGhpczphfWZ1bmN0aW9uIGJucEJpdHdpc2VUbyhhLG9wLHIpe3ZhciBpLGYsbT1NYXRoLm1pbihhLnQsdGhpcy50KTtmb3IoaT0wO2k8bTsrK2kpcltpXT1vcCh0aGlzW2ldLGFbaV0pO2lmKGEudDx0aGlzLnQpe2Y9YS5zJnRoaXMuRE07Zm9yKGk9bTtpPHRoaXMudDsrK2kpcltpXT1vcCh0aGlzW2ldLGYpO3IudD10aGlzLnR9ZWxzZXtmPXRoaXMucyZ0aGlzLkRNO2ZvcihpPW07aTxhLnQ7KytpKXJbaV09b3AoZixhW2ldKTtyLnQ9YS50fXIucz1vcCh0aGlzLnMsYS5zKTtyLmNsYW1wKCl9ZnVuY3Rpb24gb3BfYW5kKHgseSl7cmV0dXJuIHgmeX1mdW5jdGlvbiBibkFuZChhKXt2YXIgcj1uYmkoKTt0aGlzLmJpdHdpc2VUbyhhLG9wX2FuZCxyKTtyZXR1cm4gcn1mdW5jdGlvbiBvcF9vcih4LHkpe3JldHVybiB4fHl9ZnVuY3Rpb24gYm5PcihhKXt2YXIgcj1uYmkoKTt0aGlzLmJpdHdpc2VUbyhhLG9wX29yLHIpO3JldHVybiByfWZ1bmN0aW9uIG9wX3hvcih4LHkpe3JldHVybiB4Xnl9ZnVuY3Rpb24gYm5Yb3IoYSl7dmFyIHI9bmJpKCk7dGhpcy5iaXR3aXNlVG8oYSxvcF94b3Iscik7cmV0dXJuIHJ9ZnVuY3Rpb24gb3BfYW5kbm90KHgseSl7cmV0dXJuIHgmfnl9ZnVuY3Rpb24gYm5BbmROb3QoYSl7dmFyIHI9bmJpKCk7dGhpcy5iaXR3aXNlVG8oYSxvcF9hbmRub3Qscik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5Ob3QoKXt2YXIgcj1uYmkoKTtmb3IodmFyIGk9MDtpPHRoaXMudDsrK2kpcltpXT10aGlzLkRNJn50aGlzW2ldO3IudD10aGlzLnQ7ci5zPX50aGlzLnM7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5TaGlmdExlZnQobil7dmFyIHI9bmJpKCk7aWYobjwwKXRoaXMuclNoaWZ0VG8oLW4scik7ZWxzZSB0aGlzLmxTaGlmdFRvKG4scik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5TaGlmdFJpZ2h0KG4pe3ZhciByPW5iaSgpO2lmKG48MCl0aGlzLmxTaGlmdFRvKC1uLHIpO2Vsc2UgdGhpcy5yU2hpZnRUbyhuLHIpO3JldHVybiByfWZ1bmN0aW9uIGxiaXQoeCl7aWYoeD09PTApcmV0dXJuLTE7dmFyIHI9MDtpZigoeCY2NTUzNSk9PT0wKXt4Pj49MTY7cis9MTZ9aWYoKHgmMjU1KT09PTApe3g+Pj04O3IrPTh9aWYoKHgmMTUpPT09MCl7eD4+PTQ7cis9NH1pZigoeCYzKT09PTApe3g+Pj0yO3IrPTJ9aWYoKHgmMSk9PT0wKSsrcjtyZXR1cm4gcn1mdW5jdGlvbiBibkdldExvd2VzdFNldEJpdCgpe2Zvcih2YXIgaT0wO2k8dGhpcy50OysraSlpZih0aGlzW2ldIT0wKXJldHVybiBpKnRoaXMuREIrbGJpdCh0aGlzW2ldKTtpZih0aGlzLnM8MClyZXR1cm4gdGhpcy50KnRoaXMuREI7cmV0dXJuLTF9ZnVuY3Rpb24gY2JpdCh4KXt2YXIgcj0wO3doaWxlKHghPTApe3gmPXgtMTsrK3J9cmV0dXJuIHJ9ZnVuY3Rpb24gYm5CaXRDb3VudCgpe3ZhciByPTAseD10aGlzLnMmdGhpcy5ETTtmb3IodmFyIGk9MDtpPHRoaXMudDsrK2kpcis9Y2JpdCh0aGlzW2ldXngpO3JldHVybiByfWZ1bmN0aW9uIGJuVGVzdEJpdChuKXt2YXIgaj1NYXRoLmZsb29yKG4vdGhpcy5EQik7aWYoaj49dGhpcy50KXJldHVybiB0aGlzLnMhPTA7cmV0dXJuKHRoaXNbal0mMTw8biV0aGlzLkRCKSE9MH1mdW5jdGlvbiBibnBDaGFuZ2VCaXQobixvcCl7dmFyIHI9QmlnSW50ZWdlci5PTkUuc2hpZnRMZWZ0KG4pO3RoaXMuYml0d2lzZVRvKHIsb3Ascik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5TZXRCaXQobil7cmV0dXJuIHRoaXMuY2hhbmdlQml0KG4sb3Bfb3IpfWZ1bmN0aW9uIGJuQ2xlYXJCaXQobil7cmV0dXJuIHRoaXMuY2hhbmdlQml0KG4sb3BfYW5kbm90KX1mdW5jdGlvbiBibkZsaXBCaXQobil7cmV0dXJuIHRoaXMuY2hhbmdlQml0KG4sb3BfeG9yKX1mdW5jdGlvbiBibnBBZGRUbyhhLHIpe3ZhciBpPTAsYz0wLG09TWF0aC5taW4oYS50LHRoaXMudCk7d2hpbGUoaTxtKXtjKz10aGlzW2ldK2FbaV07cltpKytdPWMmdGhpcy5ETTtjPj49dGhpcy5EQn1pZihhLnQ8dGhpcy50KXtjKz1hLnM7d2hpbGUoaTx0aGlzLnQpe2MrPXRoaXNbaV07cltpKytdPWMmdGhpcy5ETTtjPj49dGhpcy5EQn1jKz10aGlzLnN9ZWxzZXtjKz10aGlzLnM7d2hpbGUoaTxhLnQpe2MrPWFbaV07cltpKytdPWMmdGhpcy5ETTtjPj49dGhpcy5EQn1jKz1hLnN9ci5zPWM8MD8tMTowO2lmKGM+MClyW2krK109YztlbHNlIGlmKGM8LTEpcltpKytdPXRoaXMuRFYrYztyLnQ9aTtyLmNsYW1wKCl9ZnVuY3Rpb24gYm5BZGQoYSl7dmFyIHI9bmJpKCk7dGhpcy5hZGRUbyhhLHIpO3JldHVybiByfWZ1bmN0aW9uIGJuU3VidHJhY3QoYSl7dmFyIHI9bmJpKCk7dGhpcy5zdWJUbyhhLHIpO3JldHVybiByfWZ1bmN0aW9uIGJuTXVsdGlwbHkoYSl7dmFyIHI9bmJpKCk7dGhpcy5tdWx0aXBseVRvKGEscik7cmV0dXJuIHJ9ZnVuY3Rpb24gYm5TcXVhcmUoKXt2YXIgcj1uYmkoKTt0aGlzLnNxdWFyZVRvKHIpO3JldHVybiByfWZ1bmN0aW9uIGJuRGl2aWRlKGEpe3ZhciByPW5iaSgpO3RoaXMuZGl2UmVtVG8oYSxyLG51bGwpO3JldHVybiByfWZ1bmN0aW9uIGJuUmVtYWluZGVyKGEpe3ZhciByPW5iaSgpO3RoaXMuZGl2UmVtVG8oYSxudWxsLHIpO3JldHVybiByfWZ1bmN0aW9uIGJuRGl2aWRlQW5kUmVtYWluZGVyKGEpe3ZhciBxPW5iaSgpLHI9bmJpKCk7dGhpcy5kaXZSZW1UbyhhLHEscik7cmV0dXJuIG5ldyBBcnJheShxLHIpfWZ1bmN0aW9uIGJucERNdWx0aXBseShuKXt0aGlzW3RoaXMudF09dGhpcy5hbSgwLG4tMSx0aGlzLDAsMCx0aGlzLnQpOysrdGhpcy50O3RoaXMuY2xhbXAoKX1mdW5jdGlvbiBibnBEQWRkT2Zmc2V0KG4sdyl7aWYobj09PTApcmV0dXJuO3doaWxlKHRoaXMudDw9dyl0aGlzW3RoaXMudCsrXT0wO3RoaXNbd10rPW47d2hpbGUodGhpc1t3XT49dGhpcy5EVil7dGhpc1t3XS09dGhpcy5EVjtpZigrK3c+PXRoaXMudCl0aGlzW3RoaXMudCsrXT0wOysrdGhpc1t3XX19ZnVuY3Rpb24gTnVsbEV4cCgpe31mdW5jdGlvbiBuTm9wKHgpe3JldHVybiB4fWZ1bmN0aW9uIG5NdWxUbyh4LHkscil7eC5tdWx0aXBseVRvKHkscil9ZnVuY3Rpb24gblNxclRvKHgscil7eC5zcXVhcmVUbyhyKX1OdWxsRXhwLnByb3RvdHlwZS5jb252ZXJ0PW5Ob3A7TnVsbEV4cC5wcm90b3R5cGUucmV2ZXJ0PW5Ob3A7TnVsbEV4cC5wcm90b3R5cGUubXVsVG89bk11bFRvO051bGxFeHAucHJvdG90eXBlLnNxclRvPW5TcXJUbztmdW5jdGlvbiBiblBvdyhlKXtyZXR1cm4gdGhpcy5leHAoZSxuZXcgTnVsbEV4cCl9ZnVuY3Rpb24gYm5wTXVsdGlwbHlMb3dlclRvKGEsbixyKXt2YXIgaT1NYXRoLm1pbih0aGlzLnQrYS50LG4pO3Iucz0wO3IudD1pO3doaWxlKGk+MClyWy0taV09MDt2YXIgajtmb3Ioaj1yLnQtdGhpcy50O2k8ajsrK2kpcltpK3RoaXMudF09dGhpcy5hbSgwLGFbaV0scixpLDAsdGhpcy50KTtmb3Ioaj1NYXRoLm1pbihhLnQsbik7aTxqOysraSl0aGlzLmFtKDAsYVtpXSxyLGksMCxuLWkpO3IuY2xhbXAoKX1mdW5jdGlvbiBibnBNdWx0aXBseVVwcGVyVG8oYSxuLHIpey0tbjt2YXIgaT1yLnQ9dGhpcy50K2EudC1uO3Iucz0wO3doaWxlKC0taT49MClyW2ldPTA7Zm9yKGk9TWF0aC5tYXgobi10aGlzLnQsMCk7aTxhLnQ7KytpKXJbdGhpcy50K2ktbl09dGhpcy5hbShuLWksYVtpXSxyLDAsMCx0aGlzLnQraS1uKTtyLmNsYW1wKCk7ci5kclNoaWZ0VG8oMSxyKX1mdW5jdGlvbiBCYXJyZXR0KG0pe3RoaXMucjI9bmJpKCk7dGhpcy5xMz1uYmkoKTtCaWdJbnRlZ2VyLk9ORS5kbFNoaWZ0VG8oMiptLnQsdGhpcy5yMik7dGhpcy5tdT10aGlzLnIyLmRpdmlkZShtKTt0aGlzLm09bX1mdW5jdGlvbiBiYXJyZXR0Q29udmVydCh4KXtpZih4LnM8MHx8eC50PjIqdGhpcy5tLnQpcmV0dXJuIHgubW9kKHRoaXMubSk7ZWxzZSBpZih4LmNvbXBhcmVUbyh0aGlzLm0pPDApcmV0dXJuIHg7ZWxzZXt2YXIgcj1uYmkoKTt4LmNvcHlUbyhyKTt0aGlzLnJlZHVjZShyKTtyZXR1cm4gcn19ZnVuY3Rpb24gYmFycmV0dFJldmVydCh4KXtyZXR1cm4geH1mdW5jdGlvbiBiYXJyZXR0UmVkdWNlKHgpe3guZHJTaGlmdFRvKHRoaXMubS50LTEsdGhpcy5yMik7aWYoeC50PnRoaXMubS50KzEpe3gudD10aGlzLm0udCsxO3guY2xhbXAoKX10aGlzLm11Lm11bHRpcGx5VXBwZXJUbyh0aGlzLnIyLHRoaXMubS50KzEsdGhpcy5xMyk7dGhpcy5tLm11bHRpcGx5TG93ZXJUbyh0aGlzLnEzLHRoaXMubS50KzEsdGhpcy5yMik7d2hpbGUoeC5jb21wYXJlVG8odGhpcy5yMik8MCl4LmRBZGRPZmZzZXQoMSx0aGlzLm0udCsxKTt4LnN1YlRvKHRoaXMucjIseCk7d2hpbGUoeC5jb21wYXJlVG8odGhpcy5tKT49MCl4LnN1YlRvKHRoaXMubSx4KX1mdW5jdGlvbiBiYXJyZXR0U3FyVG8oeCxyKXt4LnNxdWFyZVRvKHIpO3RoaXMucmVkdWNlKHIpfWZ1bmN0aW9uIGJhcnJldHRNdWxUbyh4LHkscil7eC5tdWx0aXBseVRvKHkscik7dGhpcy5yZWR1Y2Uocil9QmFycmV0dC5wcm90b3R5cGUuY29udmVydD1iYXJyZXR0Q29udmVydDtCYXJyZXR0LnByb3RvdHlwZS5yZXZlcnQ9YmFycmV0dFJldmVydDtCYXJyZXR0LnByb3RvdHlwZS5yZWR1Y2U9YmFycmV0dFJlZHVjZTtCYXJyZXR0LnByb3RvdHlwZS5tdWxUbz1iYXJyZXR0TXVsVG87QmFycmV0dC5wcm90b3R5cGUuc3FyVG89YmFycmV0dFNxclRvO2Z1bmN0aW9uIGJuTW9kUG93KGUsbSl7cmV0dXJuIGdldE9wdGltYWxJbXBsKCkuYXBwbHkodGhpcyxbZSxtXSl9QmlnSW50ZWdlci5tb2RQb3dJbXBsPXVuZGVmaW5lZDtCaWdJbnRlZ2VyLnNldE1vZFBvd0ltcGw9ZnVuY3Rpb24oYXV0aG9yTmFtZSl7QmlnSW50ZWdlci5tb2RQb3dJbXBsPWZ1bmN0aW9uKCl7c3dpdGNoKGF1dGhvck5hbWUpe2Nhc2UiUGV0ZXIgT2xzb24iOnJldHVybiBibk1vZFBvd19wZXRlck9sc29uO2Nhc2UiVG9tIFd1IjpyZXR1cm4gYm5Nb2RQb3dfdG9tV3V9fSgpfTt2YXIgZ2V0T3B0aW1hbEltcGw9ZnVuY3Rpb24oKXt7dmFyIHJlc3VsdD1CaWdJbnRlZ2VyLm1vZFBvd0ltcGw7aWYocmVzdWx0IT09dW5kZWZpbmVkKXtyZXR1cm4gcmVzdWx0fX12YXIgeD1uZXcgQmlnSW50ZWdlcigiNDMzMzM3MDc5MjMwMDgzOTIxNDg4MDc4MzY0NzU2MCIsMTApO3ZhciBlPW5ldyBCaWdJbnRlZ2VyKCIzNzA3OTIzMDA4MzkyMTQ4ODA3ODM2NDc1NjA5NDE5IiwxMCk7dmFyIG09bmV3IEJpZ0ludGVnZXIoIjE0ODMxNjkyMDMzNTY4NTk1MjMxMzQ1OTAyNDM3NjAiLDEwKTt2YXIgc3RhcnQ9RGF0ZS5ub3coKTtibk1vZFBvd19wZXRlck9sc29uLmFwcGx5KHgsW2UsbV0pO3ZhciBkdXJhdGlvblBldGVyT2xzb249RGF0ZS5ub3coKS1zdGFydDtzdGFydD1EYXRlLm5vdygpO2JuTW9kUG93X3RvbVd1LmFwcGx5KHgsW2UsbV0pO3ZhciBkdXJhdGlvblRvbVd1PURhdGUubm93KCktc3RhcnQ7QmlnSW50ZWdlci5tb2RQb3dJbXBsPWR1cmF0aW9uUGV0ZXJPbHNvbjxkdXJhdGlvblRvbVd1P2JuTW9kUG93X3BldGVyT2xzb246Ym5Nb2RQb3dfdG9tV3U7cmV0dXJuIGdldE9wdGltYWxJbXBsKCl9O2Z1bmN0aW9uIGJuTW9kUG93X3BldGVyT2xzb24oZSxtKXt2YXIgcG9UaGlzPXBldGVyT2xzb25fQmlnSW50ZWdlclN0YXRpYyh0aGlzLnRvU3RyaW5nKDEwKSwxMCk7dmFyIHBvRT1wZXRlck9sc29uX0JpZ0ludGVnZXJTdGF0aWMoZS50b1N0cmluZygxMCksMTApO3ZhciBwb009cGV0ZXJPbHNvbl9CaWdJbnRlZ2VyU3RhdGljKG0udG9TdHJpbmcoMTApLDEwKTt2YXIgcG9PdXQ9cG9UaGlzLm1vZFBvdyhwb0UscG9NKTt2YXIgb3V0PW5ldyBCaWdJbnRlZ2VyKHBvT3V0LnRvU3RyaW5nKDEwKSwxMCk7cmV0dXJuIG91dH1mdW5jdGlvbiBibk1vZFBvd190b21XdShlLG0pe3ZhciBpPWUuYml0TGVuZ3RoKCksayxyPW5idigxKSx6O2lmKGk8PTApcmV0dXJuIHI7ZWxzZSBpZihpPDE4KWs9MTtlbHNlIGlmKGk8NDgpaz0zO2Vsc2UgaWYoaTwxNDQpaz00O2Vsc2UgaWYoaTw3Njgpaz01O2Vsc2Ugaz02O2lmKGk8OCl6PW5ldyBDbGFzc2ljKG0pO2Vsc2UgaWYobS5pc0V2ZW4oKSl6PW5ldyBCYXJyZXR0KG0pO2Vsc2Ugej1uZXcgTW9udGdvbWVyeShtKTt2YXIgZz1uZXcgQXJyYXksbj0zLGsxPWstMSxrbT0oMTw8ayktMTtnWzFdPXouY29udmVydCh0aGlzKTtpZihrPjEpe3ZhciBnMj1uYmkoKTt6LnNxclRvKGdbMV0sZzIpO3doaWxlKG48PWttKXtnW25dPW5iaSgpO3oubXVsVG8oZzIsZ1tuLTJdLGdbbl0pO24rPTJ9fXZhciBqPWUudC0xLHcsaXMxPXRydWUscjI9bmJpKCksdDtpPW5iaXRzKGVbal0pLTE7d2hpbGUoaj49MCl7aWYoaT49azEpdz1lW2pdPj5pLWsxJmttO2Vsc2V7dz0oZVtqXSYoMTw8aSsxKS0xKTw8azEtaTtpZihqPjApd3w9ZVtqLTFdPj50aGlzLkRCK2ktazF9bj1rO3doaWxlKCh3JjEpPT09MCl7dz4+PTE7LS1ufWlmKChpLT1uKTwwKXtpKz10aGlzLkRCOy0tan1pZihpczEpe2dbd10uY29weVRvKHIpO2lzMT1mYWxzZX1lbHNle3doaWxlKG4+MSl7ei5zcXJUbyhyLHIyKTt6LnNxclRvKHIyLHIpO24tPTJ9aWYobj4wKXouc3FyVG8ocixyMik7ZWxzZXt0PXI7cj1yMjtyMj10fXoubXVsVG8ocjIsZ1t3XSxyKX13aGlsZShqPj0wJiYoZVtqXSYxPDxpKT09PTApe3ouc3FyVG8ocixyMik7dD1yO3I9cjI7cjI9dDtpZigtLWk8MCl7aT10aGlzLkRCLTE7LS1qfX19cmV0dXJuIHoucmV2ZXJ0KHIpfWZ1bmN0aW9uIGJuR0NEKGEpe3ZhciB4PXRoaXMuczwwP3RoaXMubmVnYXRlKCk6dGhpcy5jbG9uZSgpO3ZhciB5PWEuczwwP2EubmVnYXRlKCk6YS5jbG9uZSgpO2lmKHguY29tcGFyZVRvKHkpPDApe3ZhciB0PXg7eD15O3k9dH12YXIgaT14LmdldExvd2VzdFNldEJpdCgpLGc9eS5nZXRMb3dlc3RTZXRCaXQoKTtpZihnPDApcmV0dXJuIHg7aWYoaTxnKWc9aTtpZihnPjApe3guclNoaWZ0VG8oZyx4KTt5LnJTaGlmdFRvKGcseSl9d2hpbGUoeC5zaWdudW0oKT4wKXtpZigoaT14LmdldExvd2VzdFNldEJpdCgpKT4wKXguclNoaWZ0VG8oaSx4KTtpZigoaT15LmdldExvd2VzdFNldEJpdCgpKT4wKXkuclNoaWZ0VG8oaSx5KTtpZih4LmNvbXBhcmVUbyh5KT49MCl7eC5zdWJUbyh5LHgpO3guclNoaWZ0VG8oMSx4KX1lbHNle3kuc3ViVG8oeCx5KTt5LnJTaGlmdFRvKDEseSl9fWlmKGc+MCl5LmxTaGlmdFRvKGcseSk7cmV0dXJuIHl9ZnVuY3Rpb24gYm5wTW9kSW50KG4pe2lmKG48PTApcmV0dXJuIDA7dmFyIGQ9dGhpcy5EViVuLHI9dGhpcy5zPDA/bi0xOjA7aWYodGhpcy50PjApaWYoZD09PTApcj10aGlzWzBdJW47ZWxzZSBmb3IodmFyIGk9dGhpcy50LTE7aT49MDstLWkpcj0oZCpyK3RoaXNbaV0pJW47cmV0dXJuIHJ9ZnVuY3Rpb24gYm5Nb2RJbnZlcnNlKG0pe3ZhciBhYz1tLmlzRXZlbigpO2lmKHRoaXMuaXNFdmVuKCkmJmFjfHxtLnNpZ251bSgpPT09MClyZXR1cm4gQmlnSW50ZWdlci5aRVJPO3ZhciB1PW0uY2xvbmUoKSx2PXRoaXMuY2xvbmUoKTt2YXIgYT1uYnYoMSksYj1uYnYoMCksYz1uYnYoMCksZD1uYnYoMSk7d2hpbGUodS5zaWdudW0oKSE9MCl7d2hpbGUodS5pc0V2ZW4oKSl7dS5yU2hpZnRUbygxLHUpO2lmKGFjKXtpZighYS5pc0V2ZW4oKXx8IWIuaXNFdmVuKCkpe2EuYWRkVG8odGhpcyxhKTtiLnN1YlRvKG0sYil9YS5yU2hpZnRUbygxLGEpfWVsc2UgaWYoIWIuaXNFdmVuKCkpYi5zdWJUbyhtLGIpO2IuclNoaWZ0VG8oMSxiKX13aGlsZSh2LmlzRXZlbigpKXt2LnJTaGlmdFRvKDEsdik7aWYoYWMpe2lmKCFjLmlzRXZlbigpfHwhZC5pc0V2ZW4oKSl7Yy5hZGRUbyh0aGlzLGMpO2Quc3ViVG8obSxkKX1jLnJTaGlmdFRvKDEsYyl9ZWxzZSBpZighZC5pc0V2ZW4oKSlkLnN1YlRvKG0sZCk7ZC5yU2hpZnRUbygxLGQpfWlmKHUuY29tcGFyZVRvKHYpPj0wKXt1LnN1YlRvKHYsdSk7aWYoYWMpYS5zdWJUbyhjLGEpO2Iuc3ViVG8oZCxiKX1lbHNle3Yuc3ViVG8odSx2KTtpZihhYyljLnN1YlRvKGEsYyk7ZC5zdWJUbyhiLGQpfX1pZih2LmNvbXBhcmVUbyhCaWdJbnRlZ2VyLk9ORSkhPTApcmV0dXJuIEJpZ0ludGVnZXIuWkVSTztpZihkLmNvbXBhcmVUbyhtKT49MClyZXR1cm4gZC5zdWJ0cmFjdChtKTtpZihkLnNpZ251bSgpPDApZC5hZGRUbyhtLGQpO2Vsc2UgcmV0dXJuIGQ7aWYoZC5zaWdudW0oKTwwKXJldHVybiBkLmFkZChtKTtlbHNlIHJldHVybiBkfXZhciBsb3dwcmltZXM9WzIsMyw1LDcsMTEsMTMsMTcsMTksMjMsMjksMzEsMzcsNDEsNDMsNDcsNTMsNTksNjEsNjcsNzEsNzMsNzksODMsODksOTcsMTAxLDEwMywxMDcsMTA5LDExMywxMjcsMTMxLDEzNywxMzksMTQ5LDE1MSwxNTcsMTYzLDE2NywxNzMsMTc5LDE4MSwxOTEsMTkzLDE5NywxOTksMjExLDIyMywyMjcsMjI5LDIzMywyMzksMjQxLDI1MSwyNTcsMjYzLDI2OSwyNzEsMjc3LDI4MSwyODMsMjkzLDMwNywzMTEsMzEzLDMxNywzMzEsMzM3LDM0NywzNDksMzUzLDM1OSwzNjcsMzczLDM3OSwzODMsMzg5LDM5Nyw0MDEsNDA5LDQxOSw0MjEsNDMxLDQzMyw0MzksNDQzLDQ0OSw0NTcsNDYxLDQ2Myw0NjcsNDc5LDQ4Nyw0OTEsNDk5LDUwMyw1MDksNTIxLDUyMyw1NDEsNTQ3LDU1Nyw1NjMsNTY5LDU3MSw1NzcsNTg3LDU5Myw1OTksNjAxLDYwNyw2MTMsNjE3LDYxOSw2MzEsNjQxLDY0Myw2NDcsNjUzLDY1OSw2NjEsNjczLDY3Nyw2ODMsNjkxLDcwMSw3MDksNzE5LDcyNyw3MzMsNzM5LDc0Myw3NTEsNzU3LDc2MSw3NjksNzczLDc4Nyw3OTcsODA5LDgxMSw4MjEsODIzLDgyNyw4MjksODM5LDg1Myw4NTcsODU5LDg2Myw4NzcsODgxLDg4Myw4ODcsOTA3LDkxMSw5MTksOTI5LDkzNyw5NDEsOTQ3LDk1Myw5NjcsOTcxLDk3Nyw5ODMsOTkxLDk5N107dmFyIGxwbGltPSgxPDwyNikvbG93cHJpbWVzW2xvd3ByaW1lcy5sZW5ndGgtMV07ZnVuY3Rpb24gYm5Jc1Byb2JhYmxlUHJpbWUodCl7dmFyIGkseD10aGlzLmFicygpO2lmKHgudD09MSYmeFswXTw9bG93cHJpbWVzW2xvd3ByaW1lcy5sZW5ndGgtMV0pe2ZvcihpPTA7aTxsb3dwcmltZXMubGVuZ3RoOysraSlpZih4WzBdPT1sb3dwcmltZXNbaV0pcmV0dXJuIHRydWU7cmV0dXJuIGZhbHNlfWlmKHguaXNFdmVuKCkpcmV0dXJuIGZhbHNlO2k9MTt3aGlsZShpPGxvd3ByaW1lcy5sZW5ndGgpe3ZhciBtPWxvd3ByaW1lc1tpXSxqPWkrMTt3aGlsZShqPGxvd3ByaW1lcy5sZW5ndGgmJm08bHBsaW0pbSo9bG93cHJpbWVzW2orK107bT14Lm1vZEludChtKTt3aGlsZShpPGopaWYobSVsb3dwcmltZXNbaSsrXT09PTApcmV0dXJuIGZhbHNlfXJldHVybiB4Lm1pbGxlclJhYmluKHQpfWZ1bmN0aW9uIGJucE1pbGxlclJhYmluKHQpe3ZhciBuMT10aGlzLnN1YnRyYWN0KEJpZ0ludGVnZXIuT05FKTt2YXIgaz1uMS5nZXRMb3dlc3RTZXRCaXQoKTtpZihrPD0wKXJldHVybiBmYWxzZTt2YXIgcj1uMS5zaGlmdFJpZ2h0KGspO3Q9dCsxPj4xO2lmKHQ+bG93cHJpbWVzLmxlbmd0aCl0PWxvd3ByaW1lcy5sZW5ndGg7dmFyIGE9bmJpKCk7Zm9yKHZhciBpPTA7aTx0OysraSl7YS5mcm9tSW50KGxvd3ByaW1lc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqbG93cHJpbWVzLmxlbmd0aCldKTt2YXIgeT1hLm1vZFBvdyhyLHRoaXMpO2lmKHkuY29tcGFyZVRvKEJpZ0ludGVnZXIuT05FKSE9MCYmeS5jb21wYXJlVG8objEpIT0wKXt2YXIgaj0xO3doaWxlKGorKzxrJiZ5LmNvbXBhcmVUbyhuMSkhPTApe3k9eS5tb2RQb3dJbnQoMix0aGlzKTtpZih5LmNvbXBhcmVUbyhCaWdJbnRlZ2VyLk9ORSk9PT0wKXJldHVybiBmYWxzZX1pZih5LmNvbXBhcmVUbyhuMSkhPTApcmV0dXJuIGZhbHNlfX1yZXR1cm4gdHJ1ZX1CaWdJbnRlZ2VyLnByb3RvdHlwZS5jb3B5VG89Ym5wQ29weVRvO0JpZ0ludGVnZXIucHJvdG90eXBlLmZyb21JbnQ9Ym5wRnJvbUludDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tU3RyaW5nPWJucEZyb21TdHJpbmc7QmlnSW50ZWdlci5wcm90b3R5cGUuZnJvbUJ5dGVBcnJheT1ibnBGcm9tQnl0ZUFycmF5O0JpZ0ludGVnZXIucHJvdG90eXBlLmZyb21CdWZmZXI9Ym5wRnJvbUJ1ZmZlcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5jbGFtcD1ibnBDbGFtcDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5kbFNoaWZ0VG89Ym5wRExTaGlmdFRvO0JpZ0ludGVnZXIucHJvdG90eXBlLmRyU2hpZnRUbz1ibnBEUlNoaWZ0VG87QmlnSW50ZWdlci5wcm90b3R5cGUubFNoaWZ0VG89Ym5wTFNoaWZ0VG87QmlnSW50ZWdlci5wcm90b3R5cGUuclNoaWZ0VG89Ym5wUlNoaWZ0VG87QmlnSW50ZWdlci5wcm90b3R5cGUuc3ViVG89Ym5wU3ViVG87QmlnSW50ZWdlci5wcm90b3R5cGUubXVsdGlwbHlUbz1ibnBNdWx0aXBseVRvO0JpZ0ludGVnZXIucHJvdG90eXBlLnNxdWFyZVRvPWJucFNxdWFyZVRvO0JpZ0ludGVnZXIucHJvdG90eXBlLmRpdlJlbVRvPWJucERpdlJlbVRvO0JpZ0ludGVnZXIucHJvdG90eXBlLmludkRpZ2l0PWJucEludkRpZ2l0O0JpZ0ludGVnZXIucHJvdG90eXBlLmlzRXZlbj1ibnBJc0V2ZW47QmlnSW50ZWdlci5wcm90b3R5cGUuZXhwPWJucEV4cDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5jaHVua1NpemU9Ym5wQ2h1bmtTaXplO0JpZ0ludGVnZXIucHJvdG90eXBlLnRvUmFkaXg9Ym5wVG9SYWRpeDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tUmFkaXg9Ym5wRnJvbVJhZGl4O0JpZ0ludGVnZXIucHJvdG90eXBlLmZyb21OdW1iZXI9Ym5wRnJvbU51bWJlcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5iaXR3aXNlVG89Ym5wQml0d2lzZVRvO0JpZ0ludGVnZXIucHJvdG90eXBlLmNoYW5nZUJpdD1ibnBDaGFuZ2VCaXQ7QmlnSW50ZWdlci5wcm90b3R5cGUuYWRkVG89Ym5wQWRkVG87QmlnSW50ZWdlci5wcm90b3R5cGUuZE11bHRpcGx5PWJucERNdWx0aXBseTtCaWdJbnRlZ2VyLnByb3RvdHlwZS5kQWRkT2Zmc2V0PWJucERBZGRPZmZzZXQ7QmlnSW50ZWdlci5wcm90b3R5cGUubXVsdGlwbHlMb3dlclRvPWJucE11bHRpcGx5TG93ZXJUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5tdWx0aXBseVVwcGVyVG89Ym5wTXVsdGlwbHlVcHBlclRvO0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZEludD1ibnBNb2RJbnQ7QmlnSW50ZWdlci5wcm90b3R5cGUubWlsbGVyUmFiaW49Ym5wTWlsbGVyUmFiaW47QmlnSW50ZWdlci5wcm90b3R5cGUudG9TdHJpbmc9Ym5Ub1N0cmluZztCaWdJbnRlZ2VyLnByb3RvdHlwZS5uZWdhdGU9Ym5OZWdhdGU7QmlnSW50ZWdlci5wcm90b3R5cGUuYWJzPWJuQWJzO0JpZ0ludGVnZXIucHJvdG90eXBlLmNvbXBhcmVUbz1ibkNvbXBhcmVUbztCaWdJbnRlZ2VyLnByb3RvdHlwZS5iaXRMZW5ndGg9Ym5CaXRMZW5ndGg7QmlnSW50ZWdlci5wcm90b3R5cGUubW9kPWJuTW9kO0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZFBvd0ludD1ibk1vZFBvd0ludDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5jbG9uZT1ibkNsb25lO0JpZ0ludGVnZXIucHJvdG90eXBlLmludFZhbHVlPWJuSW50VmFsdWU7QmlnSW50ZWdlci5wcm90b3R5cGUuYnl0ZVZhbHVlPWJuQnl0ZVZhbHVlO0JpZ0ludGVnZXIucHJvdG90eXBlLnNob3J0VmFsdWU9Ym5TaG9ydFZhbHVlO0JpZ0ludGVnZXIucHJvdG90eXBlLnNpZ251bT1iblNpZ051bTtCaWdJbnRlZ2VyLnByb3RvdHlwZS50b0J5dGVBcnJheT1iblRvQnl0ZUFycmF5O0JpZ0ludGVnZXIucHJvdG90eXBlLnRvQnVmZmVyPWJuVG9CdWZmZXI7QmlnSW50ZWdlci5wcm90b3R5cGUuZXF1YWxzPWJuRXF1YWxzO0JpZ0ludGVnZXIucHJvdG90eXBlLm1pbj1ibk1pbjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5tYXg9Ym5NYXg7QmlnSW50ZWdlci5wcm90b3R5cGUuYW5kPWJuQW5kO0JpZ0ludGVnZXIucHJvdG90eXBlLm9yPWJuT3I7QmlnSW50ZWdlci5wcm90b3R5cGUueG9yPWJuWG9yO0JpZ0ludGVnZXIucHJvdG90eXBlLmFuZE5vdD1ibkFuZE5vdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3Q9Ym5Ob3Q7QmlnSW50ZWdlci5wcm90b3R5cGUuc2hpZnRMZWZ0PWJuU2hpZnRMZWZ0O0JpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0UmlnaHQ9Ym5TaGlmdFJpZ2h0O0JpZ0ludGVnZXIucHJvdG90eXBlLmdldExvd2VzdFNldEJpdD1ibkdldExvd2VzdFNldEJpdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5iaXRDb3VudD1ibkJpdENvdW50O0JpZ0ludGVnZXIucHJvdG90eXBlLnRlc3RCaXQ9Ym5UZXN0Qml0O0JpZ0ludGVnZXIucHJvdG90eXBlLnNldEJpdD1iblNldEJpdDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5jbGVhckJpdD1ibkNsZWFyQml0O0JpZ0ludGVnZXIucHJvdG90eXBlLmZsaXBCaXQ9Ym5GbGlwQml0O0JpZ0ludGVnZXIucHJvdG90eXBlLmFkZD1ibkFkZDtCaWdJbnRlZ2VyLnByb3RvdHlwZS5zdWJ0cmFjdD1iblN1YnRyYWN0O0JpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5PWJuTXVsdGlwbHk7QmlnSW50ZWdlci5wcm90b3R5cGUuZGl2aWRlPWJuRGl2aWRlO0JpZ0ludGVnZXIucHJvdG90eXBlLnJlbWFpbmRlcj1iblJlbWFpbmRlcjtCaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZpZGVBbmRSZW1haW5kZXI9Ym5EaXZpZGVBbmRSZW1haW5kZXI7QmlnSW50ZWdlci5wcm90b3R5cGUubW9kUG93PWJuTW9kUG93O0JpZ0ludGVnZXIucHJvdG90eXBlLm1vZEludmVyc2U9Ym5Nb2RJbnZlcnNlO0JpZ0ludGVnZXIucHJvdG90eXBlLnBvdz1iblBvdztCaWdJbnRlZ2VyLnByb3RvdHlwZS5nY2Q9Ym5HQ0Q7QmlnSW50ZWdlci5wcm90b3R5cGUuaXNQcm9iYWJsZVByaW1lPWJuSXNQcm9iYWJsZVByaW1lO0JpZ0ludGVnZXIuaW50MmNoYXI9aW50MmNoYXI7QmlnSW50ZWdlci5aRVJPPW5idigwKTtCaWdJbnRlZ2VyLk9ORT1uYnYoMSk7QmlnSW50ZWdlci5wcm90b3R5cGUuc3F1YXJlPWJuU3F1YXJlO21vZHVsZS5leHBvcnRzPUJpZ0ludGVnZXJ9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi9jcnlwdG8iOjQzLCIuLi91dGlscyI6NTgsImJpZy1pbnRlZ2VyIjoyNSxidWZmZXI6Mjd9XSw1MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIF89cmVxdWlyZSgiLi4vdXRpbHMiKS5fO3ZhciBCaWdJbnRlZ2VyPXJlcXVpcmUoIi4vanNibi5qcyIpO3ZhciB1dGlscz1yZXF1aXJlKCIuLi91dGlscy5qcyIpO3ZhciBzY2hlbWVzPXJlcXVpcmUoIi4uL3NjaGVtZXMvc2NoZW1lcy5qcyIpO3ZhciBlbmNyeXB0RW5naW5lcz1yZXF1aXJlKCIuLi9lbmNyeXB0RW5naW5lcy9lbmNyeXB0RW5naW5lcy5qcyIpO2V4cG9ydHMuQmlnSW50ZWdlcj1CaWdJbnRlZ2VyO21vZHVsZS5leHBvcnRzLktleT1mdW5jdGlvbigpe2Z1bmN0aW9uIFJTQUtleSgpe3RoaXMubj1udWxsO3RoaXMuZT0wO3RoaXMuZD1udWxsO3RoaXMucD1udWxsO3RoaXMucT1udWxsO3RoaXMuZG1wMT1udWxsO3RoaXMuZG1xMT1udWxsO3RoaXMuY29lZmY9bnVsbH1SU0FLZXkucHJvdG90eXBlLnNldE9wdGlvbnM9ZnVuY3Rpb24ob3B0aW9ucyl7dmFyIHNpZ25pbmdTY2hlbWVQcm92aWRlcj1zY2hlbWVzW29wdGlvbnMuc2lnbmluZ1NjaGVtZV07dmFyIGVuY3J5cHRpb25TY2hlbWVQcm92aWRlcj1zY2hlbWVzW29wdGlvbnMuZW5jcnlwdGlvblNjaGVtZV07aWYoc2lnbmluZ1NjaGVtZVByb3ZpZGVyPT09ZW5jcnlwdGlvblNjaGVtZVByb3ZpZGVyKXt0aGlzLnNpZ25pbmdTY2hlbWU9dGhpcy5lbmNyeXB0aW9uU2NoZW1lPWVuY3J5cHRpb25TY2hlbWVQcm92aWRlci5tYWtlU2NoZW1lKHRoaXMsb3B0aW9ucyl9ZWxzZXt0aGlzLmVuY3J5cHRpb25TY2hlbWU9ZW5jcnlwdGlvblNjaGVtZVByb3ZpZGVyLm1ha2VTY2hlbWUodGhpcyxvcHRpb25zKTt0aGlzLnNpZ25pbmdTY2hlbWU9c2lnbmluZ1NjaGVtZVByb3ZpZGVyLm1ha2VTY2hlbWUodGhpcyxvcHRpb25zKX10aGlzLmVuY3J5cHRFbmdpbmU9ZW5jcnlwdEVuZ2luZXMuZ2V0RW5naW5lKHRoaXMsb3B0aW9ucyl9O1JTQUtleS5wcm90b3R5cGUuZ2VuZXJhdGU9ZnVuY3Rpb24oQixFKXt2YXIgcXM9Qj4+MTt0aGlzLmU9cGFyc2VJbnQoRSwxNik7dmFyIGVlPW5ldyBCaWdJbnRlZ2VyKEUsMTYpO3doaWxlKHRydWUpe3doaWxlKHRydWUpe3RoaXMucD1uZXcgQmlnSW50ZWdlcihCLXFzLDEpO2lmKHRoaXMucC5zdWJ0cmFjdChCaWdJbnRlZ2VyLk9ORSkuZ2NkKGVlKS5jb21wYXJlVG8oQmlnSW50ZWdlci5PTkUpPT09MCYmdGhpcy5wLmlzUHJvYmFibGVQcmltZSgxMCkpYnJlYWt9d2hpbGUodHJ1ZSl7dGhpcy5xPW5ldyBCaWdJbnRlZ2VyKHFzLDEpO2lmKHRoaXMucS5zdWJ0cmFjdChCaWdJbnRlZ2VyLk9ORSkuZ2NkKGVlKS5jb21wYXJlVG8oQmlnSW50ZWdlci5PTkUpPT09MCYmdGhpcy5xLmlzUHJvYmFibGVQcmltZSgxMCkpYnJlYWt9aWYodGhpcy5wLmNvbXBhcmVUbyh0aGlzLnEpPD0wKXt2YXIgdD10aGlzLnA7dGhpcy5wPXRoaXMucTt0aGlzLnE9dH12YXIgcDE9dGhpcy5wLnN1YnRyYWN0KEJpZ0ludGVnZXIuT05FKTt2YXIgcTE9dGhpcy5xLnN1YnRyYWN0KEJpZ0ludGVnZXIuT05FKTt2YXIgcGhpPXAxLm11bHRpcGx5KHExKTtpZihwaGkuZ2NkKGVlKS5jb21wYXJlVG8oQmlnSW50ZWdlci5PTkUpPT09MCl7dGhpcy5uPXRoaXMucC5tdWx0aXBseSh0aGlzLnEpO2lmKHRoaXMubi5iaXRMZW5ndGgoKTxCKXtjb250aW51ZX10aGlzLmQ9ZWUubW9kSW52ZXJzZShwaGkpO3RoaXMuZG1wMT10aGlzLmQubW9kKHAxKTt0aGlzLmRtcTE9dGhpcy5kLm1vZChxMSk7dGhpcy5jb2VmZj10aGlzLnEubW9kSW52ZXJzZSh0aGlzLnApO2JyZWFrfX10aGlzLiQkcmVjYWxjdWxhdGVDYWNoZSgpfTtSU0FLZXkucHJvdG90eXBlLnNldFByaXZhdGU9ZnVuY3Rpb24oTixFLEQsUCxRLERQLERRLEMpe2lmKE4mJkUmJkQmJk4ubGVuZ3RoPjAmJihfLmlzTnVtYmVyKEUpfHxFLmxlbmd0aD4wKSYmRC5sZW5ndGg+MCl7dGhpcy5uPW5ldyBCaWdJbnRlZ2VyKE4pO3RoaXMuZT1fLmlzTnVtYmVyKEUpP0U6dXRpbHMuZ2V0MzJJbnRGcm9tQnVmZmVyKEUsMCk7dGhpcy5kPW5ldyBCaWdJbnRlZ2VyKEQpO2lmKFAmJlEmJkRQJiZEUSYmQyl7dGhpcy5wPW5ldyBCaWdJbnRlZ2VyKFApO3RoaXMucT1uZXcgQmlnSW50ZWdlcihRKTt0aGlzLmRtcDE9bmV3IEJpZ0ludGVnZXIoRFApO3RoaXMuZG1xMT1uZXcgQmlnSW50ZWdlcihEUSk7dGhpcy5jb2VmZj1uZXcgQmlnSW50ZWdlcihDKX1lbHNle310aGlzLiQkcmVjYWxjdWxhdGVDYWNoZSgpfWVsc2V7dGhyb3cgRXJyb3IoIkludmFsaWQgUlNBIHByaXZhdGUga2V5Iil9fTtSU0FLZXkucHJvdG90eXBlLnNldFB1YmxpYz1mdW5jdGlvbihOLEUpe2lmKE4mJkUmJk4ubGVuZ3RoPjAmJihfLmlzTnVtYmVyKEUpfHxFLmxlbmd0aD4wKSl7dGhpcy5uPW5ldyBCaWdJbnRlZ2VyKE4pO3RoaXMuZT1fLmlzTnVtYmVyKEUpP0U6dXRpbHMuZ2V0MzJJbnRGcm9tQnVmZmVyKEUsMCk7dGhpcy4kJHJlY2FsY3VsYXRlQ2FjaGUoKX1lbHNle3Rocm93IEVycm9yKCJJbnZhbGlkIFJTQSBwdWJsaWMga2V5Iil9fTtSU0FLZXkucHJvdG90eXBlLiRkb1ByaXZhdGU9ZnVuY3Rpb24oeCl7aWYodGhpcy5wfHx0aGlzLnEpe3JldHVybiB4Lm1vZFBvdyh0aGlzLmQsdGhpcy5uKX12YXIgeHA9eC5tb2QodGhpcy5wKS5tb2RQb3codGhpcy5kbXAxLHRoaXMucCk7dmFyIHhxPXgubW9kKHRoaXMucSkubW9kUG93KHRoaXMuZG1xMSx0aGlzLnEpO3doaWxlKHhwLmNvbXBhcmVUbyh4cSk8MCl7eHA9eHAuYWRkKHRoaXMucCl9cmV0dXJuIHhwLnN1YnRyYWN0KHhxKS5tdWx0aXBseSh0aGlzLmNvZWZmKS5tb2QodGhpcy5wKS5tdWx0aXBseSh0aGlzLnEpLmFkZCh4cSl9O1JTQUtleS5wcm90b3R5cGUuJGRvUHVibGljPWZ1bmN0aW9uKHgpe3JldHVybiB4Lm1vZFBvd0ludCh0aGlzLmUsdGhpcy5uKX07UlNBS2V5LnByb3RvdHlwZS5lbmNyeXB0PWZ1bmN0aW9uKGJ1ZmZlcix1c2VQcml2YXRlKXt2YXIgYnVmZmVycz1bXTt2YXIgcmVzdWx0cz1bXTt2YXIgYnVmZmVyU2l6ZT1idWZmZXIubGVuZ3RoO3ZhciBidWZmZXJzQ291bnQ9TWF0aC5jZWlsKGJ1ZmZlclNpemUvdGhpcy5tYXhNZXNzYWdlTGVuZ3RoKXx8MTt2YXIgZGl2aWRlZFNpemU9TWF0aC5jZWlsKGJ1ZmZlclNpemUvYnVmZmVyc0NvdW50fHwxKTtpZihidWZmZXJzQ291bnQ9PTEpe2J1ZmZlcnMucHVzaChidWZmZXIpfWVsc2V7Zm9yKHZhciBidWZOdW09MDtidWZOdW08YnVmZmVyc0NvdW50O2J1Zk51bSsrKXtidWZmZXJzLnB1c2goYnVmZmVyLnNsaWNlKGJ1Zk51bSpkaXZpZGVkU2l6ZSwoYnVmTnVtKzEpKmRpdmlkZWRTaXplKSl9fWZvcih2YXIgaT0wO2k8YnVmZmVycy5sZW5ndGg7aSsrKXtyZXN1bHRzLnB1c2godGhpcy5lbmNyeXB0RW5naW5lLmVuY3J5cHQoYnVmZmVyc1tpXSx1c2VQcml2YXRlKSl9cmV0dXJuIEJ1ZmZlci5jb25jYXQocmVzdWx0cyl9O1JTQUtleS5wcm90b3R5cGUuZGVjcnlwdD1mdW5jdGlvbihidWZmZXIsdXNlUHVibGljKXtpZihidWZmZXIubGVuZ3RoJXRoaXMuZW5jcnlwdGVkRGF0YUxlbmd0aD4wKXt0aHJvdyBFcnJvcigiSW5jb3JyZWN0IGRhdGEgb3Iga2V5Iil9dmFyIHJlc3VsdD1bXTt2YXIgb2Zmc2V0PTA7dmFyIGxlbmd0aD0wO3ZhciBidWZmZXJzQ291bnQ9YnVmZmVyLmxlbmd0aC90aGlzLmVuY3J5cHRlZERhdGFMZW5ndGg7Zm9yKHZhciBpPTA7aTxidWZmZXJzQ291bnQ7aSsrKXtvZmZzZXQ9aSp0aGlzLmVuY3J5cHRlZERhdGFMZW5ndGg7bGVuZ3RoPW9mZnNldCt0aGlzLmVuY3J5cHRlZERhdGFMZW5ndGg7cmVzdWx0LnB1c2godGhpcy5lbmNyeXB0RW5naW5lLmRlY3J5cHQoYnVmZmVyLnNsaWNlKG9mZnNldCxNYXRoLm1pbihsZW5ndGgsYnVmZmVyLmxlbmd0aCkpLHVzZVB1YmxpYykpfXJldHVybiBCdWZmZXIuY29uY2F0KHJlc3VsdCl9O1JTQUtleS5wcm90b3R5cGUuc2lnbj1mdW5jdGlvbihidWZmZXIpe3JldHVybiB0aGlzLnNpZ25pbmdTY2hlbWUuc2lnbi5hcHBseSh0aGlzLnNpZ25pbmdTY2hlbWUsYXJndW1lbnRzKX07UlNBS2V5LnByb3RvdHlwZS52ZXJpZnk9ZnVuY3Rpb24oYnVmZmVyLHNpZ25hdHVyZSxzaWduYXR1cmVfZW5jb2Rpbmcpe3JldHVybiB0aGlzLnNpZ25pbmdTY2hlbWUudmVyaWZ5LmFwcGx5KHRoaXMuc2lnbmluZ1NjaGVtZSxhcmd1bWVudHMpfTtSU0FLZXkucHJvdG90eXBlLmlzUHJpdmF0ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLm4mJnRoaXMuZSYmdGhpcy5kfHxmYWxzZX07UlNBS2V5LnByb3RvdHlwZS5pc1B1YmxpYz1mdW5jdGlvbihzdHJpY3Qpe3JldHVybiB0aGlzLm4mJnRoaXMuZSYmIShzdHJpY3QmJnRoaXMuZCl8fGZhbHNlfTtPYmplY3QuZGVmaW5lUHJvcGVydHkoUlNBS2V5LnByb3RvdHlwZSwia2V5U2l6ZSIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmNhY2hlLmtleUJpdExlbmd0aH19KTtPYmplY3QuZGVmaW5lUHJvcGVydHkoUlNBS2V5LnByb3RvdHlwZSwiZW5jcnlwdGVkRGF0YUxlbmd0aCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmNhY2hlLmtleUJ5dGVMZW5ndGh9fSk7T2JqZWN0LmRlZmluZVByb3BlcnR5KFJTQUtleS5wcm90b3R5cGUsIm1heE1lc3NhZ2VMZW5ndGgiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5lbmNyeXB0aW9uU2NoZW1lLm1heE1lc3NhZ2VMZW5ndGgoKX19KTtSU0FLZXkucHJvdG90eXBlLiQkcmVjYWxjdWxhdGVDYWNoZT1mdW5jdGlvbigpe3RoaXMuY2FjaGU9dGhpcy5jYWNoZXx8e307dGhpcy5jYWNoZS5rZXlCaXRMZW5ndGg9dGhpcy5uLmJpdExlbmd0aCgpO3RoaXMuY2FjaGUua2V5Qnl0ZUxlbmd0aD10aGlzLmNhY2hlLmtleUJpdExlbmd0aCs2Pj4zfTtyZXR1cm4gUlNBS2V5fSgpfSkuY2FsbCh0aGlzLHJlcXVpcmUoImJ1ZmZlciIpLkJ1ZmZlcil9LHsiLi4vZW5jcnlwdEVuZ2luZXMvZW5jcnlwdEVuZ2luZXMuanMiOjQ0LCIuLi9zY2hlbWVzL3NjaGVtZXMuanMiOjU3LCIuLi91dGlscyI6NTgsIi4uL3V0aWxzLmpzIjo1OCwiLi9qc2JuLmpzIjo1MixidWZmZXI6Mjd9XSw1NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIGNyeXB0PXJlcXVpcmUoIi4uL2NyeXB0byIpO21vZHVsZS5leHBvcnRzPXtpc0VuY3J5cHRpb246dHJ1ZSxpc1NpZ25hdHVyZTpmYWxzZX07bW9kdWxlLmV4cG9ydHMuZGlnZXN0TGVuZ3RoPXttZDQ6MTYsbWQ1OjE2LHJpcGVtZDE2MDoyMCxybWQxNjA6MjAsc2hhMToyMCxzaGEyMjQ6Mjgsc2hhMjU2OjMyLHNoYTM4NDo0OCxzaGE1MTI6NjR9O3ZhciBERUZBVUxUX0hBU0hfRlVOQ1RJT049InNoYTEiO21vZHVsZS5leHBvcnRzLmVtZV9vYWVwX21nZjE9ZnVuY3Rpb24oc2VlZCxtYXNrTGVuZ3RoLGhhc2hGdW5jdGlvbil7aGFzaEZ1bmN0aW9uPWhhc2hGdW5jdGlvbnx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OO3ZhciBoTGVuPW1vZHVsZS5leHBvcnRzLmRpZ2VzdExlbmd0aFtoYXNoRnVuY3Rpb25dO3ZhciBjb3VudD1NYXRoLmNlaWwobWFza0xlbmd0aC9oTGVuKTt2YXIgVD1CdWZmZXIuYWxsb2MoaExlbipjb3VudCk7dmFyIGM9QnVmZmVyLmFsbG9jKDQpO2Zvcih2YXIgaT0wO2k8Y291bnQ7KytpKXt2YXIgaGFzaD1jcnlwdC5jcmVhdGVIYXNoKGhhc2hGdW5jdGlvbik7aGFzaC51cGRhdGUoc2VlZCk7Yy53cml0ZVVJbnQzMkJFKGksMCk7aGFzaC51cGRhdGUoYyk7aGFzaC5kaWdlc3QoKS5jb3B5KFQsaSpoTGVuKX1yZXR1cm4gVC5zbGljZSgwLG1hc2tMZW5ndGgpfTttb2R1bGUuZXhwb3J0cy5tYWtlU2NoZW1lPWZ1bmN0aW9uKGtleSxvcHRpb25zKXtmdW5jdGlvbiBTY2hlbWUoa2V5LG9wdGlvbnMpe3RoaXMua2V5PWtleTt0aGlzLm9wdGlvbnM9b3B0aW9uc31TY2hlbWUucHJvdG90eXBlLm1heE1lc3NhZ2VMZW5ndGg9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aC0yKm1vZHVsZS5leHBvcnRzLmRpZ2VzdExlbmd0aFt0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OXS0yfTtTY2hlbWUucHJvdG90eXBlLmVuY1BhZD1mdW5jdGlvbihidWZmZXIpe3ZhciBoYXNoPXRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT047dmFyIG1nZj10aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMubWdmfHxtb2R1bGUuZXhwb3J0cy5lbWVfb2FlcF9tZ2YxO3ZhciBsYWJlbD10aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMubGFiZWx8fEJ1ZmZlci5hbGxvYygwKTt2YXIgZW1MZW49dGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aDt2YXIgaExlbj1tb2R1bGUuZXhwb3J0cy5kaWdlc3RMZW5ndGhbaGFzaF07aWYoYnVmZmVyLmxlbmd0aD5lbUxlbi0yKmhMZW4tMil7dGhyb3cgbmV3IEVycm9yKCJNZXNzYWdlIGlzIHRvbyBsb25nIHRvIGVuY29kZSBpbnRvIGFuIGVuY29kZWQgbWVzc2FnZSB3aXRoIGEgbGVuZ3RoIG9mICIrZW1MZW4rIiBieXRlcywgaW5jcmVhc2UiKyJlbUxlbiB0byBmaXggdGhpcyBlcnJvciAobWluaW11bSB2YWx1ZSBmb3IgZ2l2ZW4gcGFyYW1ldGVycyBhbmQgb3B0aW9uczogIisoZW1MZW4tMipoTGVuLTIpKyIpIil9dmFyIGxIYXNoPWNyeXB0LmNyZWF0ZUhhc2goaGFzaCk7bEhhc2gudXBkYXRlKGxhYmVsKTtsSGFzaD1sSGFzaC5kaWdlc3QoKTt2YXIgUFM9QnVmZmVyLmFsbG9jKGVtTGVuLWJ1ZmZlci5sZW5ndGgtMipoTGVuLTEpO1BTLmZpbGwoMCk7UFNbUFMubGVuZ3RoLTFdPTE7dmFyIERCPUJ1ZmZlci5jb25jYXQoW2xIYXNoLFBTLGJ1ZmZlcl0pO3ZhciBzZWVkPWNyeXB0LnJhbmRvbUJ5dGVzKGhMZW4pO3ZhciBtYXNrPW1nZihzZWVkLERCLmxlbmd0aCxoYXNoKTtmb3IodmFyIGk9MDtpPERCLmxlbmd0aDtpKyspe0RCW2ldXj1tYXNrW2ldfW1hc2s9bWdmKERCLGhMZW4saGFzaCk7Zm9yKGk9MDtpPHNlZWQubGVuZ3RoO2krKyl7c2VlZFtpXV49bWFza1tpXX12YXIgZW09QnVmZmVyLmFsbG9jKDErc2VlZC5sZW5ndGgrREIubGVuZ3RoKTtlbVswXT0wO3NlZWQuY29weShlbSwxKTtEQi5jb3B5KGVtLDErc2VlZC5sZW5ndGgpO3JldHVybiBlbX07U2NoZW1lLnByb3RvdHlwZS5lbmNVblBhZD1mdW5jdGlvbihidWZmZXIpe3ZhciBoYXNoPXRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT047dmFyIG1nZj10aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMubWdmfHxtb2R1bGUuZXhwb3J0cy5lbWVfb2FlcF9tZ2YxO3ZhciBsYWJlbD10aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMubGFiZWx8fEJ1ZmZlci5hbGxvYygwKTt2YXIgaExlbj1tb2R1bGUuZXhwb3J0cy5kaWdlc3RMZW5ndGhbaGFzaF07aWYoYnVmZmVyLmxlbmd0aDwyKmhMZW4rMil7dGhyb3cgbmV3IEVycm9yKCJFcnJvciBkZWNvZGluZyBtZXNzYWdlLCB0aGUgc3VwcGxpZWQgbWVzc2FnZSBpcyBub3QgbG9uZyBlbm91Z2ggdG8gYmUgYSB2YWxpZCBPQUVQIGVuY29kZWQgbWVzc2FnZSIpfXZhciBzZWVkPWJ1ZmZlci5zbGljZSgxLGhMZW4rMSk7dmFyIERCPWJ1ZmZlci5zbGljZSgxK2hMZW4pO3ZhciBtYXNrPW1nZihEQixoTGVuLGhhc2gpO2Zvcih2YXIgaT0wO2k8c2VlZC5sZW5ndGg7aSsrKXtzZWVkW2ldXj1tYXNrW2ldfW1hc2s9bWdmKHNlZWQsREIubGVuZ3RoLGhhc2gpO2ZvcihpPTA7aTxEQi5sZW5ndGg7aSsrKXtEQltpXV49bWFza1tpXX12YXIgbEhhc2g9Y3J5cHQuY3JlYXRlSGFzaChoYXNoKTtsSGFzaC51cGRhdGUobGFiZWwpO2xIYXNoPWxIYXNoLmRpZ2VzdCgpO3ZhciBsSGFzaEVNPURCLnNsaWNlKDAsaExlbik7aWYobEhhc2hFTS50b1N0cmluZygiaGV4IikhPWxIYXNoLnRvU3RyaW5nKCJoZXgiKSl7dGhyb3cgbmV3IEVycm9yKCJFcnJvciBkZWNvZGluZyBtZXNzYWdlLCB0aGUgbEhhc2ggY2FsY3VsYXRlZCBmcm9tIHRoZSBsYWJlbCBwcm92aWRlZCBhbmQgdGhlIGxIYXNoIGluIHRoZSBlbmNyeXB0ZWQgZGF0YSBkbyBub3QgbWF0Y2guIil9aT1oTGVuO3doaWxlKERCW2krK109PT0wJiZpPERCLmxlbmd0aCk7aWYoREJbaS0xXSE9MSl7dGhyb3cgbmV3IEVycm9yKCJFcnJvciBkZWNvZGluZyBtZXNzYWdlLCB0aGVyZSBpcyBubyBwYWRkaW5nIG1lc3NhZ2Ugc2VwYXJhdG9yIGJ5dGUiKX1yZXR1cm4gREIuc2xpY2UoaSl9O3JldHVybiBuZXcgU2NoZW1lKGtleSxvcHRpb25zKX19KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi9jcnlwdG8iOjQzLGJ1ZmZlcjoyN31dLDU1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgQmlnSW50ZWdlcj1yZXF1aXJlKCIuLi9saWJzL2pzYm4iKTt2YXIgY3J5cHQ9cmVxdWlyZSgiLi4vY3J5cHRvIik7dmFyIGNvbnN0YW50cz1yZXF1aXJlKCJjb25zdGFudHMiKTt2YXIgU0lHTl9JTkZPX0hFQUQ9e21kMjpCdWZmZXIuZnJvbSgiMzAyMDMwMGMwNjA4MmE4NjQ4ODZmNzBkMDIwMjA1MDAwNDEwIiwiaGV4IiksbWQ1OkJ1ZmZlci5mcm9tKCIzMDIwMzAwYzA2MDgyYTg2NDg4NmY3MGQwMjA1MDUwMDA0MTAiLCJoZXgiKSxzaGExOkJ1ZmZlci5mcm9tKCIzMDIxMzAwOTA2MDUyYjBlMDMwMjFhMDUwMDA0MTQiLCJoZXgiKSxzaGEyMjQ6QnVmZmVyLmZyb20oIjMwMmQzMDBkMDYwOTYwODY0ODAxNjUwMzA0MDIwNDA1MDAwNDFjIiwiaGV4Iiksc2hhMjU2OkJ1ZmZlci5mcm9tKCIzMDMxMzAwZDA2MDk2MDg2NDgwMTY1MDMwNDAyMDEwNTAwMDQyMCIsImhleCIpLHNoYTM4NDpCdWZmZXIuZnJvbSgiMzA0MTMwMGQwNjA5NjA4NjQ4MDE2NTAzMDQwMjAyMDUwMDA0MzAiLCJoZXgiKSxzaGE1MTI6QnVmZmVyLmZyb20oIjMwNTEzMDBkMDYwOTYwODY0ODAxNjUwMzA0MDIwMzA1MDAwNDQwIiwiaGV4IikscmlwZW1kMTYwOkJ1ZmZlci5mcm9tKCIzMDIxMzAwOTA2MDUyYjI0MDMwMjAxMDUwMDA0MTQiLCJoZXgiKSxybWQxNjA6QnVmZmVyLmZyb20oIjMwMjEzMDA5MDYwNTJiMjQwMzAyMDEwNTAwMDQxNCIsImhleCIpfTt2YXIgU0lHTl9BTEdfVE9fSEFTSF9BTElBU0VTPXtyaXBlbWQxNjA6InJtZDE2MCJ9O3ZhciBERUZBVUxUX0hBU0hfRlVOQ1RJT049InNoYTI1NiI7bW9kdWxlLmV4cG9ydHM9e2lzRW5jcnlwdGlvbjp0cnVlLGlzU2lnbmF0dXJlOnRydWV9O21vZHVsZS5leHBvcnRzLm1ha2VTY2hlbWU9ZnVuY3Rpb24oa2V5LG9wdGlvbnMpe2Z1bmN0aW9uIFNjaGVtZShrZXksb3B0aW9ucyl7dGhpcy5rZXk9a2V5O3RoaXMub3B0aW9ucz1vcHRpb25zfVNjaGVtZS5wcm90b3R5cGUubWF4TWVzc2FnZUxlbmd0aD1mdW5jdGlvbigpe2lmKHRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmdGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmc9PWNvbnN0YW50cy5SU0FfTk9fUEFERElORyl7cmV0dXJuIHRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGh9cmV0dXJuIHRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgtMTF9O1NjaGVtZS5wcm90b3R5cGUuZW5jUGFkPWZ1bmN0aW9uKGJ1ZmZlcixvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBmaWxsZWQ7aWYoYnVmZmVyLmxlbmd0aD50aGlzLmtleS5tYXhNZXNzYWdlTGVuZ3RoKXt0aHJvdyBuZXcgRXJyb3IoIk1lc3NhZ2UgdG9vIGxvbmcgZm9yIFJTQSAobj0iK3RoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgrIiwgbD0iK2J1ZmZlci5sZW5ndGgrIikiKX1pZih0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMmJnRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucy5wYWRkaW5nPT1jb25zdGFudHMuUlNBX05PX1BBRERJTkcpe2ZpbGxlZD1CdWZmZXIuYWxsb2ModGhpcy5rZXkubWF4TWVzc2FnZUxlbmd0aC1idWZmZXIubGVuZ3RoKTtmaWxsZWQuZmlsbCgwKTtyZXR1cm4gQnVmZmVyLmNvbmNhdChbZmlsbGVkLGJ1ZmZlcl0pfWlmKG9wdGlvbnMudHlwZT09PTEpe2ZpbGxlZD1CdWZmZXIuYWxsb2ModGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aC1idWZmZXIubGVuZ3RoLTEpO2ZpbGxlZC5maWxsKDI1NSwwLGZpbGxlZC5sZW5ndGgtMSk7ZmlsbGVkWzBdPTE7ZmlsbGVkW2ZpbGxlZC5sZW5ndGgtMV09MDtyZXR1cm4gQnVmZmVyLmNvbmNhdChbZmlsbGVkLGJ1ZmZlcl0pfWVsc2V7ZmlsbGVkPUJ1ZmZlci5hbGxvYyh0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoLWJ1ZmZlci5sZW5ndGgpO2ZpbGxlZFswXT0wO2ZpbGxlZFsxXT0yO3ZhciByYW5kPWNyeXB0LnJhbmRvbUJ5dGVzKGZpbGxlZC5sZW5ndGgtMyk7Zm9yKHZhciBpPTA7aTxyYW5kLmxlbmd0aDtpKyspe3ZhciByPXJhbmRbaV07d2hpbGUocj09PTApe3I9Y3J5cHQucmFuZG9tQnl0ZXMoMSlbMF19ZmlsbGVkW2krMl09cn1maWxsZWRbZmlsbGVkLmxlbmd0aC0xXT0wO3JldHVybiBCdWZmZXIuY29uY2F0KFtmaWxsZWQsYnVmZmVyXSl9fTtTY2hlbWUucHJvdG90eXBlLmVuY1VuUGFkPWZ1bmN0aW9uKGJ1ZmZlcixvcHRpb25zKXtvcHRpb25zPW9wdGlvbnN8fHt9O3ZhciBpPTA7aWYodGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zJiZ0aGlzLm9wdGlvbnMuZW5jcnlwdGlvblNjaGVtZU9wdGlvbnMucGFkZGluZz09Y29uc3RhbnRzLlJTQV9OT19QQURESU5HKXt2YXIgdW5QYWQ7aWYodHlwZW9mIGJ1ZmZlci5sYXN0SW5kZXhPZj09ImZ1bmN0aW9uIil7dW5QYWQ9YnVmZmVyLnNsaWNlKGJ1ZmZlci5sYXN0SW5kZXhPZigiXDAiKSsxLGJ1ZmZlci5sZW5ndGgpfWVsc2V7dW5QYWQ9YnVmZmVyLnNsaWNlKFN0cmluZy5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIlwwIikrMSxidWZmZXIubGVuZ3RoKX1yZXR1cm4gdW5QYWR9aWYoYnVmZmVyLmxlbmd0aDw0KXtyZXR1cm4gbnVsbH1pZihvcHRpb25zLnR5cGU9PT0xKXtpZihidWZmZXJbMF0hPT0wJiZidWZmZXJbMV0hPT0xKXtyZXR1cm4gbnVsbH1pPTM7d2hpbGUoYnVmZmVyW2ldIT09MCl7aWYoYnVmZmVyW2ldIT0yNTV8fCsraT49YnVmZmVyLmxlbmd0aCl7cmV0dXJuIG51bGx9fX1lbHNle2lmKGJ1ZmZlclswXSE9PTAmJmJ1ZmZlclsxXSE9PTIpe3JldHVybiBudWxsfWk9Mzt3aGlsZShidWZmZXJbaV0hPT0wKXtpZigrK2k+PWJ1ZmZlci5sZW5ndGgpe3JldHVybiBudWxsfX19cmV0dXJuIGJ1ZmZlci5zbGljZShpKzEsYnVmZmVyLmxlbmd0aCl9O1NjaGVtZS5wcm90b3R5cGUuc2lnbj1mdW5jdGlvbihidWZmZXIpe3ZhciBoYXNoQWxnb3JpdGhtPXRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT047aWYodGhpcy5vcHRpb25zLmVudmlyb25tZW50PT09ImJyb3dzZXIiKXtoYXNoQWxnb3JpdGhtPVNJR05fQUxHX1RPX0hBU0hfQUxJQVNFU1toYXNoQWxnb3JpdGhtXXx8aGFzaEFsZ29yaXRobTt2YXIgaGFzaGVyPWNyeXB0LmNyZWF0ZUhhc2goaGFzaEFsZ29yaXRobSk7aGFzaGVyLnVwZGF0ZShidWZmZXIpO3ZhciBoYXNoPXRoaXMucGtjczFwYWQoaGFzaGVyLmRpZ2VzdCgpLGhhc2hBbGdvcml0aG0pO3ZhciByZXM9dGhpcy5rZXkuJGRvUHJpdmF0ZShuZXcgQmlnSW50ZWdlcihoYXNoKSkudG9CdWZmZXIodGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aCk7cmV0dXJuIHJlc31lbHNle3ZhciBzaWduZXI9Y3J5cHQuY3JlYXRlU2lnbigiUlNBLSIraGFzaEFsZ29yaXRobS50b1VwcGVyQ2FzZSgpKTtzaWduZXIudXBkYXRlKGJ1ZmZlcik7cmV0dXJuIHNpZ25lci5zaWduKHRoaXMub3B0aW9ucy5yc2FVdGlscy5leHBvcnRLZXkoInByaXZhdGUiKSl9fTtTY2hlbWUucHJvdG90eXBlLnZlcmlmeT1mdW5jdGlvbihidWZmZXIsc2lnbmF0dXJlLHNpZ25hdHVyZV9lbmNvZGluZyl7Y29uc29sZS5sb2coInZlcmlmeSIpO2lmKHRoaXMub3B0aW9ucy5lbmNyeXB0aW9uU2NoZW1lT3B0aW9ucyYmdGhpcy5vcHRpb25zLmVuY3J5cHRpb25TY2hlbWVPcHRpb25zLnBhZGRpbmc9PWNvbnN0YW50cy5SU0FfTk9fUEFERElORyl7cmV0dXJuIGZhbHNlfXZhciBoYXNoQWxnb3JpdGhtPXRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT047aWYodGhpcy5vcHRpb25zLmVudmlyb25tZW50PT09ImJyb3dzZXIiKXtoYXNoQWxnb3JpdGhtPVNJR05fQUxHX1RPX0hBU0hfQUxJQVNFU1toYXNoQWxnb3JpdGhtXXx8aGFzaEFsZ29yaXRobTtpZihzaWduYXR1cmVfZW5jb2Rpbmcpe3NpZ25hdHVyZT1CdWZmZXIuZnJvbShzaWduYXR1cmUsc2lnbmF0dXJlX2VuY29kaW5nKX12YXIgaGFzaGVyPWNyeXB0LmNyZWF0ZUhhc2goaGFzaEFsZ29yaXRobSk7aGFzaGVyLnVwZGF0ZShidWZmZXIpO3ZhciBoYXNoPXRoaXMucGtjczFwYWQoaGFzaGVyLmRpZ2VzdCgpLGhhc2hBbGdvcml0aG0pO3ZhciBtPXRoaXMua2V5LiRkb1B1YmxpYyhuZXcgQmlnSW50ZWdlcihzaWduYXR1cmUpKTtyZXR1cm4gbS50b0J1ZmZlcigpLnRvU3RyaW5nKCJoZXgiKT09aGFzaC50b1N0cmluZygiaGV4Iil9ZWxzZXt2YXIgdmVyaWZpZXI9Y3J5cHQuY3JlYXRlVmVyaWZ5KCJSU0EtIitoYXNoQWxnb3JpdGhtLnRvVXBwZXJDYXNlKCkpO3ZlcmlmaWVyLnVwZGF0ZShidWZmZXIpO3JldHVybiB2ZXJpZmllci52ZXJpZnkodGhpcy5vcHRpb25zLnJzYVV0aWxzLmV4cG9ydEtleSgicHVibGljIiksc2lnbmF0dXJlLHNpZ25hdHVyZV9lbmNvZGluZyl9fTtTY2hlbWUucHJvdG90eXBlLnBrY3MwcGFkPWZ1bmN0aW9uKGJ1ZmZlcil7dmFyIGZpbGxlZD1CdWZmZXIuYWxsb2ModGhpcy5rZXkubWF4TWVzc2FnZUxlbmd0aC1idWZmZXIubGVuZ3RoKTtmaWxsZWQuZmlsbCgwKTtyZXR1cm4gQnVmZmVyLmNvbmNhdChbZmlsbGVkLGJ1ZmZlcl0pfTtTY2hlbWUucHJvdG90eXBlLnBrY3MwdW5wYWQ9ZnVuY3Rpb24oYnVmZmVyKXt2YXIgdW5QYWQ7aWYodHlwZW9mIGJ1ZmZlci5sYXN0SW5kZXhPZj09ImZ1bmN0aW9uIil7dW5QYWQ9YnVmZmVyLnNsaWNlKGJ1ZmZlci5sYXN0SW5kZXhPZigiXDAiKSsxLGJ1ZmZlci5sZW5ndGgpfWVsc2V7dW5QYWQ9YnVmZmVyLnNsaWNlKFN0cmluZy5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIlwwIikrMSxidWZmZXIubGVuZ3RoKX1yZXR1cm4gdW5QYWR9O1NjaGVtZS5wcm90b3R5cGUucGtjczFwYWQ9ZnVuY3Rpb24oaGFzaEJ1ZixoYXNoQWxnb3JpdGhtKXt2YXIgZGlnZXN0PVNJR05fSU5GT19IRUFEW2hhc2hBbGdvcml0aG1dO2lmKCFkaWdlc3Qpe3Rocm93IEVycm9yKCJVbnN1cHBvcnRlZCBoYXNoIGFsZ29yaXRobSIpfXZhciBkYXRhPUJ1ZmZlci5jb25jYXQoW2RpZ2VzdCxoYXNoQnVmXSk7aWYoZGF0YS5sZW5ndGgrMTA+dGhpcy5rZXkuZW5jcnlwdGVkRGF0YUxlbmd0aCl7dGhyb3cgRXJyb3IoIktleSBpcyB0b28gc2hvcnQgZm9yIHNpZ25pbmcgYWxnb3JpdGhtICgiK2hhc2hBbGdvcml0aG0rIikiKX12YXIgZmlsbGVkPUJ1ZmZlci5hbGxvYyh0aGlzLmtleS5lbmNyeXB0ZWREYXRhTGVuZ3RoLWRhdGEubGVuZ3RoLTEpO2ZpbGxlZC5maWxsKDI1NSwwLGZpbGxlZC5sZW5ndGgtMSk7ZmlsbGVkWzBdPTE7ZmlsbGVkW2ZpbGxlZC5sZW5ndGgtMV09MDt2YXIgcmVzPUJ1ZmZlci5jb25jYXQoW2ZpbGxlZCxkYXRhXSk7cmV0dXJuIHJlc307cmV0dXJuIG5ldyBTY2hlbWUoa2V5LG9wdGlvbnMpfX0pLmNhbGwodGhpcyxyZXF1aXJlKCJidWZmZXIiKS5CdWZmZXIpfSx7Ii4uL2NyeXB0byI6NDMsIi4uL2xpYnMvanNibiI6NTIsYnVmZmVyOjI3LGNvbnN0YW50czoyOX1dLDU2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oQnVmZmVyKXt2YXIgQmlnSW50ZWdlcj1yZXF1aXJlKCIuLi9saWJzL2pzYm4iKTt2YXIgY3J5cHQ9cmVxdWlyZSgiLi4vY3J5cHRvIik7bW9kdWxlLmV4cG9ydHM9e2lzRW5jcnlwdGlvbjpmYWxzZSxpc1NpZ25hdHVyZTp0cnVlfTt2YXIgREVGQVVMVF9IQVNIX0ZVTkNUSU9OPSJzaGExIjt2YXIgREVGQVVMVF9TQUxUX0xFTkdUSD0yMDttb2R1bGUuZXhwb3J0cy5tYWtlU2NoZW1lPWZ1bmN0aW9uKGtleSxvcHRpb25zKXt2YXIgT0FFUD1yZXF1aXJlKCIuL3NjaGVtZXMiKS5wa2NzMV9vYWVwO2Z1bmN0aW9uIFNjaGVtZShrZXksb3B0aW9ucyl7dGhpcy5rZXk9a2V5O3RoaXMub3B0aW9ucz1vcHRpb25zfVNjaGVtZS5wcm90b3R5cGUuc2lnbj1mdW5jdGlvbihidWZmZXIpe3ZhciBtSGFzaD1jcnlwdC5jcmVhdGVIYXNoKHRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5oYXNofHxERUZBVUxUX0hBU0hfRlVOQ1RJT04pO21IYXNoLnVwZGF0ZShidWZmZXIpO3ZhciBlbmNvZGVkPXRoaXMuZW1zYV9wc3NfZW5jb2RlKG1IYXNoLmRpZ2VzdCgpLHRoaXMua2V5LmtleVNpemUtMSk7cmV0dXJuIHRoaXMua2V5LiRkb1ByaXZhdGUobmV3IEJpZ0ludGVnZXIoZW5jb2RlZCkpLnRvQnVmZmVyKHRoaXMua2V5LmVuY3J5cHRlZERhdGFMZW5ndGgpfTtTY2hlbWUucHJvdG90eXBlLnZlcmlmeT1mdW5jdGlvbihidWZmZXIsc2lnbmF0dXJlLHNpZ25hdHVyZV9lbmNvZGluZyl7aWYoc2lnbmF0dXJlX2VuY29kaW5nKXtzaWduYXR1cmU9QnVmZmVyLmZyb20oc2lnbmF0dXJlLHNpZ25hdHVyZV9lbmNvZGluZyl9c2lnbmF0dXJlPW5ldyBCaWdJbnRlZ2VyKHNpZ25hdHVyZSk7dmFyIGVtTGVuPU1hdGguY2VpbCgodGhpcy5rZXkua2V5U2l6ZS0xKS84KTt2YXIgbT10aGlzLmtleS4kZG9QdWJsaWMoc2lnbmF0dXJlKS50b0J1ZmZlcihlbUxlbik7dmFyIG1IYXNoPWNyeXB0LmNyZWF0ZUhhc2godGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLmhhc2h8fERFRkFVTFRfSEFTSF9GVU5DVElPTik7bUhhc2gudXBkYXRlKGJ1ZmZlcik7cmV0dXJuIHRoaXMuZW1zYV9wc3NfdmVyaWZ5KG1IYXNoLmRpZ2VzdCgpLG0sdGhpcy5rZXkua2V5U2l6ZS0xKX07U2NoZW1lLnByb3RvdHlwZS5lbXNhX3Bzc19lbmNvZGU9ZnVuY3Rpb24obUhhc2gsZW1CaXRzKXt2YXIgaGFzaD10aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OO3ZhciBtZ2Y9dGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLm1nZnx8T0FFUC5lbWVfb2FlcF9tZ2YxO3ZhciBzTGVuPXRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5zYWx0TGVuZ3RofHxERUZBVUxUX1NBTFRfTEVOR1RIO3ZhciBoTGVuPU9BRVAuZGlnZXN0TGVuZ3RoW2hhc2hdO3ZhciBlbUxlbj1NYXRoLmNlaWwoZW1CaXRzLzgpO2lmKGVtTGVuPGhMZW4rc0xlbisyKXt0aHJvdyBuZXcgRXJyb3IoIk91dHB1dCBsZW5ndGggcGFzc2VkIHRvIGVtQml0cygiK2VtQml0cysiKSBpcyB0b28gc21hbGwgZm9yIHRoZSBvcHRpb25zICIrInNwZWNpZmllZCgiK2hhc2grIiwgIitzTGVuKyIpLiBUbyBmaXggdGhpcyBpc3N1ZSBpbmNyZWFzZSB0aGUgdmFsdWUgb2YgZW1CaXRzLiAobWluaW11bSBzaXplOiAiKyg4KmhMZW4rOCpzTGVuKzkpKyIpIil9dmFyIHNhbHQ9Y3J5cHQucmFuZG9tQnl0ZXMoc0xlbik7dmFyIE1hcG9zdHJvcGhlPUJ1ZmZlci5hbGxvYyg4K2hMZW4rc0xlbik7TWFwb3N0cm9waGUuZmlsbCgwLDAsOCk7bUhhc2guY29weShNYXBvc3Ryb3BoZSw4KTtzYWx0LmNvcHkoTWFwb3N0cm9waGUsOCttSGFzaC5sZW5ndGgpO3ZhciBIPWNyeXB0LmNyZWF0ZUhhc2goaGFzaCk7SC51cGRhdGUoTWFwb3N0cm9waGUpO0g9SC5kaWdlc3QoKTt2YXIgUFM9QnVmZmVyLmFsbG9jKGVtTGVuLXNhbHQubGVuZ3RoLWhMZW4tMik7UFMuZmlsbCgwKTt2YXIgREI9QnVmZmVyLmFsbG9jKFBTLmxlbmd0aCsxK3NhbHQubGVuZ3RoKTtQUy5jb3B5KERCKTtEQltQUy5sZW5ndGhdPTE7c2FsdC5jb3B5KERCLFBTLmxlbmd0aCsxKTt2YXIgZGJNYXNrPW1nZihILERCLmxlbmd0aCxoYXNoKTt2YXIgbWFza2VkREI9QnVmZmVyLmFsbG9jKERCLmxlbmd0aCk7Zm9yKHZhciBpPTA7aTxkYk1hc2subGVuZ3RoO2krKyl7bWFza2VkREJbaV09REJbaV1eZGJNYXNrW2ldfXZhciBiaXRzPTgqZW1MZW4tZW1CaXRzO3ZhciBtYXNrPTI1NV4yNTU+PjgtYml0czw8OC1iaXRzO21hc2tlZERCWzBdPW1hc2tlZERCWzBdJm1hc2s7dmFyIEVNPUJ1ZmZlci5hbGxvYyhtYXNrZWREQi5sZW5ndGgrSC5sZW5ndGgrMSk7bWFza2VkREIuY29weShFTSwwKTtILmNvcHkoRU0sbWFza2VkREIubGVuZ3RoKTtFTVtFTS5sZW5ndGgtMV09MTg4O3JldHVybiBFTX07U2NoZW1lLnByb3RvdHlwZS5lbXNhX3Bzc192ZXJpZnk9ZnVuY3Rpb24obUhhc2gsRU0sZW1CaXRzKXt2YXIgaGFzaD10aGlzLm9wdGlvbnMuc2lnbmluZ1NjaGVtZU9wdGlvbnMuaGFzaHx8REVGQVVMVF9IQVNIX0ZVTkNUSU9OO3ZhciBtZ2Y9dGhpcy5vcHRpb25zLnNpZ25pbmdTY2hlbWVPcHRpb25zLm1nZnx8T0FFUC5lbWVfb2FlcF9tZ2YxO3ZhciBzTGVuPXRoaXMub3B0aW9ucy5zaWduaW5nU2NoZW1lT3B0aW9ucy5zYWx0TGVuZ3RofHxERUZBVUxUX1NBTFRfTEVOR1RIO3ZhciBoTGVuPU9BRVAuZGlnZXN0TGVuZ3RoW2hhc2hdO3ZhciBlbUxlbj1NYXRoLmNlaWwoZW1CaXRzLzgpO2lmKGVtTGVuPGhMZW4rc0xlbisyfHxFTVtFTS5sZW5ndGgtMV0hPTE4OCl7cmV0dXJuIGZhbHNlfXZhciBEQj1CdWZmZXIuYWxsb2MoZW1MZW4taExlbi0xKTtFTS5jb3B5KERCLDAsMCxlbUxlbi1oTGVuLTEpO3ZhciBtYXNrPTA7Zm9yKHZhciBpPTAsYml0cz04KmVtTGVuLWVtQml0cztpPGJpdHM7aSsrKXttYXNrfD0xPDw3LWl9aWYoKERCWzBdJm1hc2spIT09MCl7cmV0dXJuIGZhbHNlfXZhciBIPUVNLnNsaWNlKGVtTGVuLWhMZW4tMSxlbUxlbi0xKTt2YXIgZGJNYXNrPW1nZihILERCLmxlbmd0aCxoYXNoKTtmb3IoaT0wO2k8REIubGVuZ3RoO2krKyl7REJbaV1ePWRiTWFza1tpXX1iaXRzPTgqZW1MZW4tZW1CaXRzO21hc2s9MjU1XjI1NT4+OC1iaXRzPDw4LWJpdHM7REJbMF09REJbMF0mbWFzaztmb3IoaT0wO0RCW2ldPT09MCYmaTxEQi5sZW5ndGg7aSsrKTtpZihEQltpXSE9MSl7cmV0dXJuIGZhbHNlfXZhciBzYWx0PURCLnNsaWNlKERCLmxlbmd0aC1zTGVuKTt2YXIgTWFwb3N0cm9waGU9QnVmZmVyLmFsbG9jKDgraExlbitzTGVuKTtNYXBvc3Ryb3BoZS5maWxsKDAsMCw4KTttSGFzaC5jb3B5KE1hcG9zdHJvcGhlLDgpO3NhbHQuY29weShNYXBvc3Ryb3BoZSw4K21IYXNoLmxlbmd0aCk7dmFyIEhhcG9zdHJvcGhlPWNyeXB0LmNyZWF0ZUhhc2goaGFzaCk7SGFwb3N0cm9waGUudXBkYXRlKE1hcG9zdHJvcGhlKTtIYXBvc3Ryb3BoZT1IYXBvc3Ryb3BoZS5kaWdlc3QoKTtyZXR1cm4gSC50b1N0cmluZygiaGV4Iik9PT1IYXBvc3Ryb3BoZS50b1N0cmluZygiaGV4Iil9O3JldHVybiBuZXcgU2NoZW1lKGtleSxvcHRpb25zKX19KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0seyIuLi9jcnlwdG8iOjQzLCIuLi9saWJzL2pzYm4iOjUyLCIuL3NjaGVtZXMiOjU3LGJ1ZmZlcjoyN31dLDU3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz17cGtjczE6cmVxdWlyZSgiLi9wa2NzMSIpLHBrY3MxX29hZXA6cmVxdWlyZSgiLi9vYWVwIikscHNzOnJlcXVpcmUoIi4vcHNzIiksaXNFbmNyeXB0aW9uOmZ1bmN0aW9uKHNjaGVtZSl7cmV0dXJuIG1vZHVsZS5leHBvcnRzW3NjaGVtZV0mJm1vZHVsZS5leHBvcnRzW3NjaGVtZV0uaXNFbmNyeXB0aW9ufSxpc1NpZ25hdHVyZTpmdW5jdGlvbihzY2hlbWUpe3JldHVybiBtb2R1bGUuZXhwb3J0c1tzY2hlbWVdJiZtb2R1bGUuZXhwb3J0c1tzY2hlbWVdLmlzU2lnbmF0dXJlfX19LHsiLi9vYWVwIjo1NCwiLi9wa2NzMSI6NTUsIi4vcHNzIjo1Nn1dLDU4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cy5saW5lYnJrPWZ1bmN0aW9uKHN0cixtYXhMZW4pe3ZhciByZXM9IiI7dmFyIGk9MDt3aGlsZShpK21heExlbjxzdHIubGVuZ3RoKXtyZXMrPXN0ci5zdWJzdHJpbmcoaSxpK21heExlbikrIlxuIjtpKz1tYXhMZW59cmV0dXJuIHJlcytzdHIuc3Vic3RyaW5nKGksc3RyLmxlbmd0aCl9O21vZHVsZS5leHBvcnRzLmRldGVjdEVudmlyb25tZW50PWZ1bmN0aW9uKCl7cmV0dXJuIHR5cGVvZiB3aW5kb3chPT0idW5kZWZpbmVkInx8dHlwZW9mIHNlbGYhPT0idW5kZWZpbmVkIiYmISFzZWxmLnBvc3RNZXNzYWdlPyJicm93c2VyIjoibm9kZSJ9O21vZHVsZS5leHBvcnRzLmdldDMySW50RnJvbUJ1ZmZlcj1mdW5jdGlvbihidWZmZXIsb2Zmc2V0KXtvZmZzZXQ9b2Zmc2V0fHwwO3ZhciBzaXplPTA7aWYoKHNpemU9YnVmZmVyLmxlbmd0aC1vZmZzZXQpPjApe2lmKHNpemU+PTQpe3JldHVybiBidWZmZXIucmVhZFVJbnQzMkJFKG9mZnNldCl9ZWxzZXt2YXIgcmVzPTA7Zm9yKHZhciBpPW9mZnNldCtzaXplLGQ9MDtpPm9mZnNldDtpLS0sZCs9Mil7cmVzKz1idWZmZXJbaS0xXSpNYXRoLnBvdygxNixkKX1yZXR1cm4gcmVzfX1lbHNle3JldHVybiBOYU59fTttb2R1bGUuZXhwb3J0cy5fPXtpc09iamVjdDpmdW5jdGlvbih2YWx1ZSl7dmFyIHR5cGU9dHlwZW9mIHZhbHVlO3JldHVybiEhdmFsdWUmJih0eXBlPT0ib2JqZWN0Inx8dHlwZT09ImZ1bmN0aW9uIil9LGlzU3RyaW5nOmZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdHlwZW9mIHZhbHVlPT0ic3RyaW5nInx8dmFsdWUgaW5zdGFuY2VvZiBTdHJpbmd9LGlzTnVtYmVyOmZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdHlwZW9mIHZhbHVlPT0ibnVtYmVyInx8IWlzTmFOKHBhcnNlRmxvYXQodmFsdWUpKSYmaXNGaW5pdGUodmFsdWUpfSxvbWl0OmZ1bmN0aW9uKG9iaixyZW1vdmVQcm9wKXt2YXIgbmV3T2JqPXt9O2Zvcih2YXIgcHJvcCBpbiBvYmope2lmKCFvYmouaGFzT3duUHJvcGVydHkocHJvcCl8fHByb3A9PT1yZW1vdmVQcm9wKXtjb250aW51ZX1uZXdPYmpbcHJvcF09b2JqW3Byb3BdfXJldHVybiBuZXdPYmp9fTttb2R1bGUuZXhwb3J0cy50cmltU3Vycm91bmRpbmdUZXh0PWZ1bmN0aW9uKGRhdGEsb3BlbmluZyxjbG9zaW5nKXt2YXIgdHJpbVN0YXJ0SW5kZXg9MDt2YXIgdHJpbUVuZEluZGV4PWRhdGEubGVuZ3RoO3ZhciBvcGVuaW5nQm91bmRhcnlJbmRleD1kYXRhLmluZGV4T2Yob3BlbmluZyk7aWYob3BlbmluZ0JvdW5kYXJ5SW5kZXg+PTApe3RyaW1TdGFydEluZGV4PW9wZW5pbmdCb3VuZGFyeUluZGV4K29wZW5pbmcubGVuZ3RofXZhciBjbG9zaW5nQm91bmRhcnlJbmRleD1kYXRhLmluZGV4T2YoY2xvc2luZyxvcGVuaW5nQm91bmRhcnlJbmRleCk7aWYoY2xvc2luZ0JvdW5kYXJ5SW5kZXg+PTApe3RyaW1FbmRJbmRleD1jbG9zaW5nQm91bmRhcnlJbmRleH1yZXR1cm4gZGF0YS5zdWJzdHJpbmcodHJpbVN0YXJ0SW5kZXgsdHJpbUVuZEluZGV4KX19LHt9XSw1OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBnZXRPd25Qcm9wZXJ0eVN5bWJvbHM9T2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9sczt2YXIgaGFzT3duUHJvcGVydHk9T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTt2YXIgcHJvcElzRW51bWVyYWJsZT1PYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO2Z1bmN0aW9uIHRvT2JqZWN0KHZhbCl7aWYodmFsPT09bnVsbHx8dmFsPT09dW5kZWZpbmVkKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCIpfXJldHVybiBPYmplY3QodmFsKX1mdW5jdGlvbiBzaG91bGRVc2VOYXRpdmUoKXt0cnl7aWYoIU9iamVjdC5hc3NpZ24pe3JldHVybiBmYWxzZX12YXIgdGVzdDE9bmV3IFN0cmluZygiYWJjIik7dGVzdDFbNV09ImRlIjtpZihPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MSlbMF09PT0iNSIpe3JldHVybiBmYWxzZX12YXIgdGVzdDI9e307Zm9yKHZhciBpPTA7aTwxMDtpKyspe3Rlc3QyWyJfIitTdHJpbmcuZnJvbUNoYXJDb2RlKGkpXT1pfXZhciBvcmRlcjI9T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDIpLm1hcChmdW5jdGlvbihuKXtyZXR1cm4gdGVzdDJbbl19KTtpZihvcmRlcjIuam9pbigiIikhPT0iMDEyMzQ1Njc4OSIpe3JldHVybiBmYWxzZX12YXIgdGVzdDM9e307ImFiY2RlZmdoaWprbG1ub3BxcnN0Ii5zcGxpdCgiIikuZm9yRWFjaChmdW5jdGlvbihsZXR0ZXIpe3Rlc3QzW2xldHRlcl09bGV0dGVyfSk7aWYoT2JqZWN0LmtleXMoT2JqZWN0LmFzc2lnbih7fSx0ZXN0MykpLmpvaW4oIiIpIT09ImFiY2RlZmdoaWprbG1ub3BxcnN0Iil7cmV0dXJuIGZhbHNlfXJldHVybiB0cnVlfWNhdGNoKGVycil7cmV0dXJuIGZhbHNlfX1tb2R1bGUuZXhwb3J0cz1zaG91bGRVc2VOYXRpdmUoKT9PYmplY3QuYXNzaWduOmZ1bmN0aW9uKHRhcmdldCxzb3VyY2Upe3ZhciBmcm9tO3ZhciB0bz10b09iamVjdCh0YXJnZXQpO3ZhciBzeW1ib2xzO2Zvcih2YXIgcz0xO3M8YXJndW1lbnRzLmxlbmd0aDtzKyspe2Zyb209T2JqZWN0KGFyZ3VtZW50c1tzXSk7Zm9yKHZhciBrZXkgaW4gZnJvbSl7aWYoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLGtleSkpe3RvW2tleV09ZnJvbVtrZXldfX1pZihnZXRPd25Qcm9wZXJ0eVN5bWJvbHMpe3N5bWJvbHM9Z2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO2Zvcih2YXIgaT0wO2k8c3ltYm9scy5sZW5ndGg7aSsrKXtpZihwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSxzeW1ib2xzW2ldKSl7dG9bc3ltYm9sc1tpXV09ZnJvbVtzeW1ib2xzW2ldXX19fX1yZXR1cm4gdG99fSx7fV0sNjA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2V4cG9ydHMucGJrZGYyPXJlcXVpcmUoIi4vbGliL2FzeW5jIik7ZXhwb3J0cy5wYmtkZjJTeW5jPXJlcXVpcmUoIi4vbGliL3N5bmMiKX0seyIuL2xpYi9hc3luYyI6NjEsIi4vbGliL3N5bmMiOjY0fV0sNjE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihwcm9jZXNzLGdsb2JhbCl7dmFyIGNoZWNrUGFyYW1ldGVycz1yZXF1aXJlKCIuL3ByZWNvbmRpdGlvbiIpO3ZhciBkZWZhdWx0RW5jb2Rpbmc9cmVxdWlyZSgiLi9kZWZhdWx0LWVuY29kaW5nIik7dmFyIHN5bmM9cmVxdWlyZSgiLi9zeW5jIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgWkVST19CVUY7dmFyIHN1YnRsZT1nbG9iYWwuY3J5cHRvJiZnbG9iYWwuY3J5cHRvLnN1YnRsZTt2YXIgdG9Ccm93c2VyPXtzaGE6IlNIQS0xIiwic2hhLTEiOiJTSEEtMSIsc2hhMToiU0hBLTEiLHNoYTI1NjoiU0hBLTI1NiIsInNoYS0yNTYiOiJTSEEtMjU2IixzaGEzODQ6IlNIQS0zODQiLCJzaGEtMzg0IjoiU0hBLTM4NCIsInNoYS01MTIiOiJTSEEtNTEyIixzaGE1MTI6IlNIQS01MTIifTt2YXIgY2hlY2tzPVtdO2Z1bmN0aW9uIGNoZWNrTmF0aXZlKGFsZ28pe2lmKGdsb2JhbC5wcm9jZXNzJiYhZ2xvYmFsLnByb2Nlc3MuYnJvd3Nlcil7cmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSl9aWYoIXN1YnRsZXx8IXN1YnRsZS5pbXBvcnRLZXl8fCFzdWJ0bGUuZGVyaXZlQml0cyl7cmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSl9aWYoY2hlY2tzW2FsZ29dIT09dW5kZWZpbmVkKXtyZXR1cm4gY2hlY2tzW2FsZ29dfVpFUk9fQlVGPVpFUk9fQlVGfHxCdWZmZXIuYWxsb2MoOCk7dmFyIHByb209YnJvd3NlclBia2RmMihaRVJPX0JVRixaRVJPX0JVRiwxMCwxMjgsYWxnbykudGhlbihmdW5jdGlvbigpe3JldHVybiB0cnVlfSkuY2F0Y2goZnVuY3Rpb24oKXtyZXR1cm4gZmFsc2V9KTtjaGVja3NbYWxnb109cHJvbTtyZXR1cm4gcHJvbX1mdW5jdGlvbiBicm93c2VyUGJrZGYyKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxsZW5ndGgsYWxnbyl7cmV0dXJuIHN1YnRsZS5pbXBvcnRLZXkoInJhdyIscGFzc3dvcmQse25hbWU6IlBCS0RGMiJ9LGZhbHNlLFsiZGVyaXZlQml0cyJdKS50aGVuKGZ1bmN0aW9uKGtleSl7cmV0dXJuIHN1YnRsZS5kZXJpdmVCaXRzKHtuYW1lOiJQQktERjIiLHNhbHQ6c2FsdCxpdGVyYXRpb25zOml0ZXJhdGlvbnMsaGFzaDp7bmFtZTphbGdvfX0sa2V5LGxlbmd0aDw8Myl9KS50aGVuKGZ1bmN0aW9uKHJlcyl7cmV0dXJuIEJ1ZmZlci5mcm9tKHJlcyl9KX1mdW5jdGlvbiByZXNvbHZlUHJvbWlzZShwcm9taXNlLGNhbGxiYWNrKXtwcm9taXNlLnRoZW4oZnVuY3Rpb24ob3V0KXtwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCl7Y2FsbGJhY2sobnVsbCxvdXQpfSl9LGZ1bmN0aW9uKGUpe3Byb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKXtjYWxsYmFjayhlKX0pfSl9bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24ocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGtleWxlbixkaWdlc3QsY2FsbGJhY2spe2lmKHR5cGVvZiBkaWdlc3Q9PT0iZnVuY3Rpb24iKXtjYWxsYmFjaz1kaWdlc3Q7ZGlnZXN0PXVuZGVmaW5lZH1kaWdlc3Q9ZGlnZXN0fHwic2hhMSI7dmFyIGFsZ289dG9Ccm93c2VyW2RpZ2VzdC50b0xvd2VyQ2FzZSgpXTtpZighYWxnb3x8dHlwZW9mIGdsb2JhbC5Qcm9taXNlIT09ImZ1bmN0aW9uIil7cmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKXt2YXIgb3V0O3RyeXtvdXQ9c3luYyhwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsa2V5bGVuLGRpZ2VzdCl9Y2F0Y2goZSl7cmV0dXJuIGNhbGxiYWNrKGUpfWNhbGxiYWNrKG51bGwsb3V0KX0pfWNoZWNrUGFyYW1ldGVycyhwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsa2V5bGVuKTtpZih0eXBlb2YgY2FsbGJhY2shPT0iZnVuY3Rpb24iKXRocm93IG5ldyBFcnJvcigiTm8gY2FsbGJhY2sgcHJvdmlkZWQgdG8gcGJrZGYyIik7aWYoIUJ1ZmZlci5pc0J1ZmZlcihwYXNzd29yZCkpcGFzc3dvcmQ9QnVmZmVyLmZyb20ocGFzc3dvcmQsZGVmYXVsdEVuY29kaW5nKTtpZighQnVmZmVyLmlzQnVmZmVyKHNhbHQpKXNhbHQ9QnVmZmVyLmZyb20oc2FsdCxkZWZhdWx0RW5jb2RpbmcpO3Jlc29sdmVQcm9taXNlKGNoZWNrTmF0aXZlKGFsZ28pLnRoZW4oZnVuY3Rpb24ocmVzcCl7aWYocmVzcClyZXR1cm4gYnJvd3NlclBia2RmMihwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsa2V5bGVuLGFsZ28pO3JldHVybiBzeW5jKHBhc3N3b3JkLHNhbHQsaXRlcmF0aW9ucyxrZXlsZW4sZGlnZXN0KX0pLGNhbGxiYWNrKX19KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSx0eXBlb2YgZ2xvYmFsIT09InVuZGVmaW5lZCI/Z2xvYmFsOnR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCI/c2VsZjp0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCI/d2luZG93Ont9KX0seyIuL2RlZmF1bHQtZW5jb2RpbmciOjYyLCIuL3ByZWNvbmRpdGlvbiI6NjMsIi4vc3luYyI6NjQsX3Byb2Nlc3M6NjYsInNhZmUtYnVmZmVyIjo4M31dLDYyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2Vzcyl7dmFyIGRlZmF1bHRFbmNvZGluZztpZihwcm9jZXNzLmJyb3dzZXIpe2RlZmF1bHRFbmNvZGluZz0idXRmLTgifWVsc2V7dmFyIHBWZXJzaW9uTWFqb3I9cGFyc2VJbnQocHJvY2Vzcy52ZXJzaW9uLnNwbGl0KCIuIilbMF0uc2xpY2UoMSksMTApO2RlZmF1bHRFbmNvZGluZz1wVmVyc2lvbk1ham9yPj02PyJ1dGYtOCI6ImJpbmFyeSJ9bW9kdWxlLmV4cG9ydHM9ZGVmYXVsdEVuY29kaW5nfSkuY2FsbCh0aGlzLHJlcXVpcmUoIl9wcm9jZXNzIikpfSx7X3Byb2Nlc3M6NjZ9XSw2MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIE1BWF9BTExPQz1NYXRoLnBvdygyLDMwKS0xO2Z1bmN0aW9uIGNoZWNrQnVmZmVyKGJ1ZixuYW1lKXtpZih0eXBlb2YgYnVmIT09InN0cmluZyImJiFCdWZmZXIuaXNCdWZmZXIoYnVmKSl7dGhyb3cgbmV3IFR5cGVFcnJvcihuYW1lKyIgbXVzdCBiZSBhIGJ1ZmZlciBvciBzdHJpbmciKX19bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24ocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGtleWxlbil7Y2hlY2tCdWZmZXIocGFzc3dvcmQsIlBhc3N3b3JkIik7Y2hlY2tCdWZmZXIoc2FsdCwiU2FsdCIpO2lmKHR5cGVvZiBpdGVyYXRpb25zIT09Im51bWJlciIpe3Rocm93IG5ldyBUeXBlRXJyb3IoIkl0ZXJhdGlvbnMgbm90IGEgbnVtYmVyIil9aWYoaXRlcmF0aW9uczwwKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJCYWQgaXRlcmF0aW9ucyIpfWlmKHR5cGVvZiBrZXlsZW4hPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiS2V5IGxlbmd0aCBub3QgYSBudW1iZXIiKX1pZihrZXlsZW48MHx8a2V5bGVuPk1BWF9BTExPQ3x8a2V5bGVuIT09a2V5bGVuKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJCYWQga2V5IGxlbmd0aCIpfX19KS5jYWxsKHRoaXMse2lzQnVmZmVyOnJlcXVpcmUoIi4uLy4uL2lzLWJ1ZmZlci9pbmRleC5qcyIpfSl9LHsiLi4vLi4vaXMtYnVmZmVyL2luZGV4LmpzIjozN31dLDY0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgbWQ1PXJlcXVpcmUoImNyZWF0ZS1oYXNoL21kNSIpO3ZhciBSSVBFTUQxNjA9cmVxdWlyZSgicmlwZW1kMTYwIik7dmFyIHNoYT1yZXF1aXJlKCJzaGEuanMiKTt2YXIgY2hlY2tQYXJhbWV0ZXJzPXJlcXVpcmUoIi4vcHJlY29uZGl0aW9uIik7dmFyIGRlZmF1bHRFbmNvZGluZz1yZXF1aXJlKCIuL2RlZmF1bHQtZW5jb2RpbmciKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBaRVJPUz1CdWZmZXIuYWxsb2MoMTI4KTt2YXIgc2l6ZXM9e21kNToxNixzaGExOjIwLHNoYTIyNDoyOCxzaGEyNTY6MzIsc2hhMzg0OjQ4LHNoYTUxMjo2NCxybWQxNjA6MjAscmlwZW1kMTYwOjIwfTtmdW5jdGlvbiBIbWFjKGFsZyxrZXksc2FsdExlbil7dmFyIGhhc2g9Z2V0RGlnZXN0KGFsZyk7dmFyIGJsb2Nrc2l6ZT1hbGc9PT0ic2hhNTEyInx8YWxnPT09InNoYTM4NCI/MTI4OjY0O2lmKGtleS5sZW5ndGg+YmxvY2tzaXplKXtrZXk9aGFzaChrZXkpfWVsc2UgaWYoa2V5Lmxlbmd0aDxibG9ja3NpemUpe2tleT1CdWZmZXIuY29uY2F0KFtrZXksWkVST1NdLGJsb2Nrc2l6ZSl9dmFyIGlwYWQ9QnVmZmVyLmFsbG9jVW5zYWZlKGJsb2Nrc2l6ZStzaXplc1thbGddKTt2YXIgb3BhZD1CdWZmZXIuYWxsb2NVbnNhZmUoYmxvY2tzaXplK3NpemVzW2FsZ10pO2Zvcih2YXIgaT0wO2k8YmxvY2tzaXplO2krKyl7aXBhZFtpXT1rZXlbaV1eNTQ7b3BhZFtpXT1rZXlbaV1eOTJ9dmFyIGlwYWQxPUJ1ZmZlci5hbGxvY1Vuc2FmZShibG9ja3NpemUrc2FsdExlbis0KTtpcGFkLmNvcHkoaXBhZDEsMCwwLGJsb2Nrc2l6ZSk7dGhpcy5pcGFkMT1pcGFkMTt0aGlzLmlwYWQyPWlwYWQ7dGhpcy5vcGFkPW9wYWQ7dGhpcy5hbGc9YWxnO3RoaXMuYmxvY2tzaXplPWJsb2Nrc2l6ZTt0aGlzLmhhc2g9aGFzaDt0aGlzLnNpemU9c2l6ZXNbYWxnXX1IbWFjLnByb3RvdHlwZS5ydW49ZnVuY3Rpb24oZGF0YSxpcGFkKXtkYXRhLmNvcHkoaXBhZCx0aGlzLmJsb2Nrc2l6ZSk7dmFyIGg9dGhpcy5oYXNoKGlwYWQpO2guY29weSh0aGlzLm9wYWQsdGhpcy5ibG9ja3NpemUpO3JldHVybiB0aGlzLmhhc2godGhpcy5vcGFkKX07ZnVuY3Rpb24gZ2V0RGlnZXN0KGFsZyl7ZnVuY3Rpb24gc2hhRnVuYyhkYXRhKXtyZXR1cm4gc2hhKGFsZykudXBkYXRlKGRhdGEpLmRpZ2VzdCgpfWZ1bmN0aW9uIHJtZDE2MEZ1bmMoZGF0YSl7cmV0dXJuKG5ldyBSSVBFTUQxNjApLnVwZGF0ZShkYXRhKS5kaWdlc3QoKX1pZihhbGc9PT0icm1kMTYwInx8YWxnPT09InJpcGVtZDE2MCIpcmV0dXJuIHJtZDE2MEZ1bmM7aWYoYWxnPT09Im1kNSIpcmV0dXJuIG1kNTtyZXR1cm4gc2hhRnVuY31mdW5jdGlvbiBwYmtkZjIocGFzc3dvcmQsc2FsdCxpdGVyYXRpb25zLGtleWxlbixkaWdlc3Qpe2NoZWNrUGFyYW1ldGVycyhwYXNzd29yZCxzYWx0LGl0ZXJhdGlvbnMsa2V5bGVuKTtpZighQnVmZmVyLmlzQnVmZmVyKHBhc3N3b3JkKSlwYXNzd29yZD1CdWZmZXIuZnJvbShwYXNzd29yZCxkZWZhdWx0RW5jb2RpbmcpO2lmKCFCdWZmZXIuaXNCdWZmZXIoc2FsdCkpc2FsdD1CdWZmZXIuZnJvbShzYWx0LGRlZmF1bHRFbmNvZGluZyk7ZGlnZXN0PWRpZ2VzdHx8InNoYTEiO3ZhciBobWFjPW5ldyBIbWFjKGRpZ2VzdCxwYXNzd29yZCxzYWx0Lmxlbmd0aCk7dmFyIERLPUJ1ZmZlci5hbGxvY1Vuc2FmZShrZXlsZW4pO3ZhciBibG9jazE9QnVmZmVyLmFsbG9jVW5zYWZlKHNhbHQubGVuZ3RoKzQpO3NhbHQuY29weShibG9jazEsMCwwLHNhbHQubGVuZ3RoKTt2YXIgZGVzdFBvcz0wO3ZhciBoTGVuPXNpemVzW2RpZ2VzdF07dmFyIGw9TWF0aC5jZWlsKGtleWxlbi9oTGVuKTtmb3IodmFyIGk9MTtpPD1sO2krKyl7YmxvY2sxLndyaXRlVUludDMyQkUoaSxzYWx0Lmxlbmd0aCk7dmFyIFQ9aG1hYy5ydW4oYmxvY2sxLGhtYWMuaXBhZDEpO3ZhciBVPVQ7Zm9yKHZhciBqPTE7ajxpdGVyYXRpb25zO2orKyl7VT1obWFjLnJ1bihVLGhtYWMuaXBhZDIpO2Zvcih2YXIgaz0wO2s8aExlbjtrKyspVFtrXV49VVtrXX1ULmNvcHkoREssZGVzdFBvcyk7ZGVzdFBvcys9aExlbn1yZXR1cm4gREt9bW9kdWxlLmV4cG9ydHM9cGJrZGYyfSx7Ii4vZGVmYXVsdC1lbmNvZGluZyI6NjIsIi4vcHJlY29uZGl0aW9uIjo2MywiY3JlYXRlLWhhc2gvbWQ1IjozMixyaXBlbWQxNjA6ODIsInNhZmUtYnVmZmVyIjo4Mywic2hhLmpzIjo5NX1dLDY1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2Vzcyl7InVzZSBzdHJpY3QiO2lmKHR5cGVvZiBwcm9jZXNzPT09InVuZGVmaW5lZCJ8fCFwcm9jZXNzLnZlcnNpb258fHByb2Nlc3MudmVyc2lvbi5pbmRleE9mKCJ2MC4iKT09PTB8fHByb2Nlc3MudmVyc2lvbi5pbmRleE9mKCJ2MS4iKT09PTAmJnByb2Nlc3MudmVyc2lvbi5pbmRleE9mKCJ2MS44LiIpIT09MCl7bW9kdWxlLmV4cG9ydHM9e25leHRUaWNrOm5leHRUaWNrfX1lbHNle21vZHVsZS5leHBvcnRzPXByb2Nlc3N9ZnVuY3Rpb24gbmV4dFRpY2soZm4sYXJnMSxhcmcyLGFyZzMpe2lmKHR5cGVvZiBmbiE9PSJmdW5jdGlvbiIpe3Rocm93IG5ldyBUeXBlRXJyb3IoJyJjYWxsYmFjayIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyl9dmFyIGxlbj1hcmd1bWVudHMubGVuZ3RoO3ZhciBhcmdzLGk7c3dpdGNoKGxlbil7Y2FzZSAwOmNhc2UgMTpyZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhmbik7Y2FzZSAyOnJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uIGFmdGVyVGlja09uZSgpe2ZuLmNhbGwobnVsbCxhcmcxKX0pO2Nhc2UgMzpyZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiBhZnRlclRpY2tUd28oKXtmbi5jYWxsKG51bGwsYXJnMSxhcmcyKX0pO2Nhc2UgNDpyZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiBhZnRlclRpY2tUaHJlZSgpe2ZuLmNhbGwobnVsbCxhcmcxLGFyZzIsYXJnMyl9KTtkZWZhdWx0OmFyZ3M9bmV3IEFycmF5KGxlbi0xKTtpPTA7d2hpbGUoaTxhcmdzLmxlbmd0aCl7YXJnc1tpKytdPWFyZ3VtZW50c1tpXX1yZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiBhZnRlclRpY2soKXtmbi5hcHBseShudWxsLGFyZ3MpfSl9fX0pLmNhbGwodGhpcyxyZXF1aXJlKCJfcHJvY2VzcyIpKX0se19wcm9jZXNzOjY2fV0sNjY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBwcm9jZXNzPW1vZHVsZS5leHBvcnRzPXt9O3ZhciBjYWNoZWRTZXRUaW1lb3V0O3ZhciBjYWNoZWRDbGVhclRpbWVvdXQ7ZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpe3Rocm93IG5ldyBFcnJvcigic2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCIpfWZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQoKXt0aHJvdyBuZXcgRXJyb3IoImNsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCIpfShmdW5jdGlvbigpe3RyeXtpZih0eXBlb2Ygc2V0VGltZW91dD09PSJmdW5jdGlvbiIpe2NhY2hlZFNldFRpbWVvdXQ9c2V0VGltZW91dH1lbHNle2NhY2hlZFNldFRpbWVvdXQ9ZGVmYXVsdFNldFRpbW91dH19Y2F0Y2goZSl7Y2FjaGVkU2V0VGltZW91dD1kZWZhdWx0U2V0VGltb3V0fXRyeXtpZih0eXBlb2YgY2xlYXJUaW1lb3V0PT09ImZ1bmN0aW9uIil7Y2FjaGVkQ2xlYXJUaW1lb3V0PWNsZWFyVGltZW91dH1lbHNle2NhY2hlZENsZWFyVGltZW91dD1kZWZhdWx0Q2xlYXJUaW1lb3V0fX1jYXRjaChlKXtjYWNoZWRDbGVhclRpbWVvdXQ9ZGVmYXVsdENsZWFyVGltZW91dH19KSgpO2Z1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKXtpZihjYWNoZWRTZXRUaW1lb3V0PT09c2V0VGltZW91dCl7cmV0dXJuIHNldFRpbWVvdXQoZnVuLDApfWlmKChjYWNoZWRTZXRUaW1lb3V0PT09ZGVmYXVsdFNldFRpbW91dHx8IWNhY2hlZFNldFRpbWVvdXQpJiZzZXRUaW1lb3V0KXtjYWNoZWRTZXRUaW1lb3V0PXNldFRpbWVvdXQ7cmV0dXJuIHNldFRpbWVvdXQoZnVuLDApfXRyeXtyZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sMCl9Y2F0Y2goZSl7dHJ5e3JldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCxmdW4sMCl9Y2F0Y2goZSl7cmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLGZ1biwwKX19fWZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpe2lmKGNhY2hlZENsZWFyVGltZW91dD09PWNsZWFyVGltZW91dCl7cmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpfWlmKChjYWNoZWRDbGVhclRpbWVvdXQ9PT1kZWZhdWx0Q2xlYXJUaW1lb3V0fHwhY2FjaGVkQ2xlYXJUaW1lb3V0KSYmY2xlYXJUaW1lb3V0KXtjYWNoZWRDbGVhclRpbWVvdXQ9Y2xlYXJUaW1lb3V0O3JldHVybiBjbGVhclRpbWVvdXQobWFya2VyKX10cnl7cmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpfWNhdGNoKGUpe3RyeXtyZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCxtYXJrZXIpfWNhdGNoKGUpe3JldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLG1hcmtlcil9fX12YXIgcXVldWU9W107dmFyIGRyYWluaW5nPWZhbHNlO3ZhciBjdXJyZW50UXVldWU7dmFyIHF1ZXVlSW5kZXg9LTE7ZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCl7aWYoIWRyYWluaW5nfHwhY3VycmVudFF1ZXVlKXtyZXR1cm59ZHJhaW5pbmc9ZmFsc2U7aWYoY3VycmVudFF1ZXVlLmxlbmd0aCl7cXVldWU9Y3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSl9ZWxzZXtxdWV1ZUluZGV4PS0xfWlmKHF1ZXVlLmxlbmd0aCl7ZHJhaW5RdWV1ZSgpfX1mdW5jdGlvbiBkcmFpblF1ZXVlKCl7aWYoZHJhaW5pbmcpe3JldHVybn12YXIgdGltZW91dD1ydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7ZHJhaW5pbmc9dHJ1ZTt2YXIgbGVuPXF1ZXVlLmxlbmd0aDt3aGlsZShsZW4pe2N1cnJlbnRRdWV1ZT1xdWV1ZTtxdWV1ZT1bXTt3aGlsZSgrK3F1ZXVlSW5kZXg8bGVuKXtpZihjdXJyZW50UXVldWUpe2N1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKX19cXVldWVJbmRleD0tMTtsZW49cXVldWUubGVuZ3RofWN1cnJlbnRRdWV1ZT1udWxsO2RyYWluaW5nPWZhbHNlO3J1bkNsZWFyVGltZW91dCh0aW1lb3V0KX1wcm9jZXNzLm5leHRUaWNrPWZ1bmN0aW9uKGZ1bil7dmFyIGFyZ3M9bmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgtMSk7aWYoYXJndW1lbnRzLmxlbmd0aD4xKXtmb3IodmFyIGk9MTtpPGFyZ3VtZW50cy5sZW5ndGg7aSsrKXthcmdzW2ktMV09YXJndW1lbnRzW2ldfX1xdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1bixhcmdzKSk7aWYocXVldWUubGVuZ3RoPT09MSYmIWRyYWluaW5nKXtydW5UaW1lb3V0KGRyYWluUXVldWUpfX07ZnVuY3Rpb24gSXRlbShmdW4sYXJyYXkpe3RoaXMuZnVuPWZ1bjt0aGlzLmFycmF5PWFycmF5fUl0ZW0ucHJvdG90eXBlLnJ1bj1mdW5jdGlvbigpe3RoaXMuZnVuLmFwcGx5KG51bGwsdGhpcy5hcnJheSl9O3Byb2Nlc3MudGl0bGU9ImJyb3dzZXIiO3Byb2Nlc3MuYnJvd3Nlcj10cnVlO3Byb2Nlc3MuZW52PXt9O3Byb2Nlc3MuYXJndj1bXTtwcm9jZXNzLnZlcnNpb249IiI7cHJvY2Vzcy52ZXJzaW9ucz17fTtmdW5jdGlvbiBub29wKCl7fXByb2Nlc3Mub249bm9vcDtwcm9jZXNzLmFkZExpc3RlbmVyPW5vb3A7cHJvY2Vzcy5vbmNlPW5vb3A7cHJvY2Vzcy5vZmY9bm9vcDtwcm9jZXNzLnJlbW92ZUxpc3RlbmVyPW5vb3A7cHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnM9bm9vcDtwcm9jZXNzLmVtaXQ9bm9vcDtwcm9jZXNzLnByZXBlbmRMaXN0ZW5lcj1ub29wO3Byb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lcj1ub29wO3Byb2Nlc3MubGlzdGVuZXJzPWZ1bmN0aW9uKG5hbWUpe3JldHVybltdfTtwcm9jZXNzLmJpbmRpbmc9ZnVuY3Rpb24obmFtZSl7dGhyb3cgbmV3IEVycm9yKCJwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCIpfTtwcm9jZXNzLmN3ZD1mdW5jdGlvbigpe3JldHVybiIvIn07cHJvY2Vzcy5jaGRpcj1mdW5jdGlvbihkaXIpe3Rocm93IG5ldyBFcnJvcigicHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkIil9O3Byb2Nlc3MudW1hc2s9ZnVuY3Rpb24oKXtyZXR1cm4gMH19LHt9XSw2NzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9cmVxdWlyZSgiLi9yZWFkYWJsZSIpLkR1cGxleH0seyIuL3JlYWRhYmxlIjo3OH1dLDY4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIHBuYT1yZXF1aXJlKCJwcm9jZXNzLW5leHRpY2stYXJncyIpO3ZhciBvYmplY3RLZXlzPU9iamVjdC5rZXlzfHxmdW5jdGlvbihvYmope3ZhciBrZXlzPVtdO2Zvcih2YXIga2V5IGluIG9iail7a2V5cy5wdXNoKGtleSl9cmV0dXJuIGtleXN9O21vZHVsZS5leHBvcnRzPUR1cGxleDt2YXIgdXRpbD1yZXF1aXJlKCJjb3JlLXV0aWwtaXMiKTt1dGlsLmluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIFJlYWRhYmxlPXJlcXVpcmUoIi4vX3N0cmVhbV9yZWFkYWJsZSIpO3ZhciBXcml0YWJsZT1yZXF1aXJlKCIuL19zdHJlYW1fd3JpdGFibGUiKTt1dGlsLmluaGVyaXRzKER1cGxleCxSZWFkYWJsZSk7e3ZhciBrZXlzPW9iamVjdEtleXMoV3JpdGFibGUucHJvdG90eXBlKTtmb3IodmFyIHY9MDt2PGtleXMubGVuZ3RoO3YrKyl7dmFyIG1ldGhvZD1rZXlzW3ZdO2lmKCFEdXBsZXgucHJvdG90eXBlW21ldGhvZF0pRHVwbGV4LnByb3RvdHlwZVttZXRob2RdPVdyaXRhYmxlLnByb3RvdHlwZVttZXRob2RdfX1mdW5jdGlvbiBEdXBsZXgob3B0aW9ucyl7aWYoISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlyZXR1cm4gbmV3IER1cGxleChvcHRpb25zKTtSZWFkYWJsZS5jYWxsKHRoaXMsb3B0aW9ucyk7V3JpdGFibGUuY2FsbCh0aGlzLG9wdGlvbnMpO2lmKG9wdGlvbnMmJm9wdGlvbnMucmVhZGFibGU9PT1mYWxzZSl0aGlzLnJlYWRhYmxlPWZhbHNlO2lmKG9wdGlvbnMmJm9wdGlvbnMud3JpdGFibGU9PT1mYWxzZSl0aGlzLndyaXRhYmxlPWZhbHNlO3RoaXMuYWxsb3dIYWxmT3Blbj10cnVlO2lmKG9wdGlvbnMmJm9wdGlvbnMuYWxsb3dIYWxmT3Blbj09PWZhbHNlKXRoaXMuYWxsb3dIYWxmT3Blbj1mYWxzZTt0aGlzLm9uY2UoImVuZCIsb25lbmQpfU9iamVjdC5kZWZpbmVQcm9wZXJ0eShEdXBsZXgucHJvdG90eXBlLCJ3cml0YWJsZUhpZ2hXYXRlck1hcmsiLHtlbnVtZXJhYmxlOmZhbHNlLGdldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl93cml0YWJsZVN0YXRlLmhpZ2hXYXRlck1hcmt9fSk7ZnVuY3Rpb24gb25lbmQoKXtpZih0aGlzLmFsbG93SGFsZk9wZW58fHRoaXMuX3dyaXRhYmxlU3RhdGUuZW5kZWQpcmV0dXJuO3BuYS5uZXh0VGljayhvbkVuZE5ULHRoaXMpfWZ1bmN0aW9uIG9uRW5kTlQoc2VsZil7c2VsZi5lbmQoKX1PYmplY3QuZGVmaW5lUHJvcGVydHkoRHVwbGV4LnByb3RvdHlwZSwiZGVzdHJveWVkIix7Z2V0OmZ1bmN0aW9uKCl7aWYodGhpcy5fcmVhZGFibGVTdGF0ZT09PXVuZGVmaW5lZHx8dGhpcy5fd3JpdGFibGVTdGF0ZT09PXVuZGVmaW5lZCl7cmV0dXJuIGZhbHNlfXJldHVybiB0aGlzLl9yZWFkYWJsZVN0YXRlLmRlc3Ryb3llZCYmdGhpcy5fd3JpdGFibGVTdGF0ZS5kZXN0cm95ZWR9LHNldDpmdW5jdGlvbih2YWx1ZSl7aWYodGhpcy5fcmVhZGFibGVTdGF0ZT09PXVuZGVmaW5lZHx8dGhpcy5fd3JpdGFibGVTdGF0ZT09PXVuZGVmaW5lZCl7cmV0dXJufXRoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkPXZhbHVlO3RoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkPXZhbHVlfX0pO0R1cGxleC5wcm90b3R5cGUuX2Rlc3Ryb3k9ZnVuY3Rpb24oZXJyLGNiKXt0aGlzLnB1c2gobnVsbCk7dGhpcy5lbmQoKTtwbmEubmV4dFRpY2soY2IsZXJyKX19LHsiLi9fc3RyZWFtX3JlYWRhYmxlIjo3MCwiLi9fc3RyZWFtX3dyaXRhYmxlIjo3MiwiY29yZS11dGlsLWlzIjozMCxpbmhlcml0czozNiwicHJvY2Vzcy1uZXh0aWNrLWFyZ3MiOjY1fV0sNjk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijttb2R1bGUuZXhwb3J0cz1QYXNzVGhyb3VnaDt2YXIgVHJhbnNmb3JtPXJlcXVpcmUoIi4vX3N0cmVhbV90cmFuc2Zvcm0iKTt2YXIgdXRpbD1yZXF1aXJlKCJjb3JlLXV0aWwtaXMiKTt1dGlsLmluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dXRpbC5pbmhlcml0cyhQYXNzVGhyb3VnaCxUcmFuc2Zvcm0pO2Z1bmN0aW9uIFBhc3NUaHJvdWdoKG9wdGlvbnMpe2lmKCEodGhpcyBpbnN0YW5jZW9mIFBhc3NUaHJvdWdoKSlyZXR1cm4gbmV3IFBhc3NUaHJvdWdoKG9wdGlvbnMpO1RyYW5zZm9ybS5jYWxsKHRoaXMsb3B0aW9ucyl9UGFzc1Rocm91Z2gucHJvdG90eXBlLl90cmFuc2Zvcm09ZnVuY3Rpb24oY2h1bmssZW5jb2RpbmcsY2Ipe2NiKG51bGwsY2h1bmspfX0seyIuL19zdHJlYW1fdHJhbnNmb3JtIjo3MSwiY29yZS11dGlsLWlzIjozMCxpbmhlcml0czozNn1dLDcwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2VzcyxnbG9iYWwpeyJ1c2Ugc3RyaWN0Ijt2YXIgcG5hPXJlcXVpcmUoInByb2Nlc3MtbmV4dGljay1hcmdzIik7bW9kdWxlLmV4cG9ydHM9UmVhZGFibGU7dmFyIGlzQXJyYXk9cmVxdWlyZSgiaXNhcnJheSIpO3ZhciBEdXBsZXg7UmVhZGFibGUuUmVhZGFibGVTdGF0ZT1SZWFkYWJsZVN0YXRlO3ZhciBFRT1yZXF1aXJlKCJldmVudHMiKS5FdmVudEVtaXR0ZXI7dmFyIEVFbGlzdGVuZXJDb3VudD1mdW5jdGlvbihlbWl0dGVyLHR5cGUpe3JldHVybiBlbWl0dGVyLmxpc3RlbmVycyh0eXBlKS5sZW5ndGh9O3ZhciBTdHJlYW09cmVxdWlyZSgiLi9pbnRlcm5hbC9zdHJlYW1zL3N0cmVhbSIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIE91clVpbnQ4QXJyYXk9Z2xvYmFsLlVpbnQ4QXJyYXl8fGZ1bmN0aW9uKCl7fTtmdW5jdGlvbiBfdWludDhBcnJheVRvQnVmZmVyKGNodW5rKXtyZXR1cm4gQnVmZmVyLmZyb20oY2h1bmspfWZ1bmN0aW9uIF9pc1VpbnQ4QXJyYXkob2JqKXtyZXR1cm4gQnVmZmVyLmlzQnVmZmVyKG9iail8fG9iaiBpbnN0YW5jZW9mIE91clVpbnQ4QXJyYXl9dmFyIHV0aWw9cmVxdWlyZSgiY29yZS11dGlsLWlzIik7dXRpbC5pbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBkZWJ1Z1V0aWw9cmVxdWlyZSgidXRpbCIpO3ZhciBkZWJ1Zz12b2lkIDA7aWYoZGVidWdVdGlsJiZkZWJ1Z1V0aWwuZGVidWdsb2cpe2RlYnVnPWRlYnVnVXRpbC5kZWJ1Z2xvZygic3RyZWFtIil9ZWxzZXtkZWJ1Zz1mdW5jdGlvbigpe319dmFyIEJ1ZmZlckxpc3Q9cmVxdWlyZSgiLi9pbnRlcm5hbC9zdHJlYW1zL0J1ZmZlckxpc3QiKTt2YXIgZGVzdHJveUltcGw9cmVxdWlyZSgiLi9pbnRlcm5hbC9zdHJlYW1zL2Rlc3Ryb3kiKTt2YXIgU3RyaW5nRGVjb2Rlcjt1dGlsLmluaGVyaXRzKFJlYWRhYmxlLFN0cmVhbSk7dmFyIGtQcm94eUV2ZW50cz1bImVycm9yIiwiY2xvc2UiLCJkZXN0cm95IiwicGF1c2UiLCJyZXN1bWUiXTtmdW5jdGlvbiBwcmVwZW5kTGlzdGVuZXIoZW1pdHRlcixldmVudCxmbil7aWYodHlwZW9mIGVtaXR0ZXIucHJlcGVuZExpc3RlbmVyPT09ImZ1bmN0aW9uIilyZXR1cm4gZW1pdHRlci5wcmVwZW5kTGlzdGVuZXIoZXZlbnQsZm4pO2lmKCFlbWl0dGVyLl9ldmVudHN8fCFlbWl0dGVyLl9ldmVudHNbZXZlbnRdKWVtaXR0ZXIub24oZXZlbnQsZm4pO2Vsc2UgaWYoaXNBcnJheShlbWl0dGVyLl9ldmVudHNbZXZlbnRdKSllbWl0dGVyLl9ldmVudHNbZXZlbnRdLnVuc2hpZnQoZm4pO2Vsc2UgZW1pdHRlci5fZXZlbnRzW2V2ZW50XT1bZm4sZW1pdHRlci5fZXZlbnRzW2V2ZW50XV19ZnVuY3Rpb24gUmVhZGFibGVTdGF0ZShvcHRpb25zLHN0cmVhbSl7RHVwbGV4PUR1cGxleHx8cmVxdWlyZSgiLi9fc3RyZWFtX2R1cGxleCIpO29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGlzRHVwbGV4PXN0cmVhbSBpbnN0YW5jZW9mIER1cGxleDt0aGlzLm9iamVjdE1vZGU9ISFvcHRpb25zLm9iamVjdE1vZGU7aWYoaXNEdXBsZXgpdGhpcy5vYmplY3RNb2RlPXRoaXMub2JqZWN0TW9kZXx8ISFvcHRpb25zLnJlYWRhYmxlT2JqZWN0TW9kZTt2YXIgaHdtPW9wdGlvbnMuaGlnaFdhdGVyTWFyazt2YXIgcmVhZGFibGVId209b3B0aW9ucy5yZWFkYWJsZUhpZ2hXYXRlck1hcms7dmFyIGRlZmF1bHRId209dGhpcy5vYmplY3RNb2RlPzE2OjE2KjEwMjQ7aWYoaHdtfHxod209PT0wKXRoaXMuaGlnaFdhdGVyTWFyaz1od207ZWxzZSBpZihpc0R1cGxleCYmKHJlYWRhYmxlSHdtfHxyZWFkYWJsZUh3bT09PTApKXRoaXMuaGlnaFdhdGVyTWFyaz1yZWFkYWJsZUh3bTtlbHNlIHRoaXMuaGlnaFdhdGVyTWFyaz1kZWZhdWx0SHdtO3RoaXMuaGlnaFdhdGVyTWFyaz1NYXRoLmZsb29yKHRoaXMuaGlnaFdhdGVyTWFyayk7dGhpcy5idWZmZXI9bmV3IEJ1ZmZlckxpc3Q7dGhpcy5sZW5ndGg9MDt0aGlzLnBpcGVzPW51bGw7dGhpcy5waXBlc0NvdW50PTA7dGhpcy5mbG93aW5nPW51bGw7dGhpcy5lbmRlZD1mYWxzZTt0aGlzLmVuZEVtaXR0ZWQ9ZmFsc2U7dGhpcy5yZWFkaW5nPWZhbHNlO3RoaXMuc3luYz10cnVlO3RoaXMubmVlZFJlYWRhYmxlPWZhbHNlO3RoaXMuZW1pdHRlZFJlYWRhYmxlPWZhbHNlO3RoaXMucmVhZGFibGVMaXN0ZW5pbmc9ZmFsc2U7dGhpcy5yZXN1bWVTY2hlZHVsZWQ9ZmFsc2U7dGhpcy5kZXN0cm95ZWQ9ZmFsc2U7dGhpcy5kZWZhdWx0RW5jb2Rpbmc9b3B0aW9ucy5kZWZhdWx0RW5jb2Rpbmd8fCJ1dGY4Ijt0aGlzLmF3YWl0RHJhaW49MDt0aGlzLnJlYWRpbmdNb3JlPWZhbHNlO3RoaXMuZGVjb2Rlcj1udWxsO3RoaXMuZW5jb2Rpbmc9bnVsbDtpZihvcHRpb25zLmVuY29kaW5nKXtpZighU3RyaW5nRGVjb2RlcilTdHJpbmdEZWNvZGVyPXJlcXVpcmUoInN0cmluZ19kZWNvZGVyLyIpLlN0cmluZ0RlY29kZXI7dGhpcy5kZWNvZGVyPW5ldyBTdHJpbmdEZWNvZGVyKG9wdGlvbnMuZW5jb2RpbmcpO3RoaXMuZW5jb2Rpbmc9b3B0aW9ucy5lbmNvZGluZ319ZnVuY3Rpb24gUmVhZGFibGUob3B0aW9ucyl7RHVwbGV4PUR1cGxleHx8cmVxdWlyZSgiLi9fc3RyZWFtX2R1cGxleCIpO2lmKCEodGhpcyBpbnN0YW5jZW9mIFJlYWRhYmxlKSlyZXR1cm4gbmV3IFJlYWRhYmxlKG9wdGlvbnMpO3RoaXMuX3JlYWRhYmxlU3RhdGU9bmV3IFJlYWRhYmxlU3RhdGUob3B0aW9ucyx0aGlzKTt0aGlzLnJlYWRhYmxlPXRydWU7aWYob3B0aW9ucyl7aWYodHlwZW9mIG9wdGlvbnMucmVhZD09PSJmdW5jdGlvbiIpdGhpcy5fcmVhZD1vcHRpb25zLnJlYWQ7aWYodHlwZW9mIG9wdGlvbnMuZGVzdHJveT09PSJmdW5jdGlvbiIpdGhpcy5fZGVzdHJveT1vcHRpb25zLmRlc3Ryb3l9U3RyZWFtLmNhbGwodGhpcyl9T2JqZWN0LmRlZmluZVByb3BlcnR5KFJlYWRhYmxlLnByb3RvdHlwZSwiZGVzdHJveWVkIix7Z2V0OmZ1bmN0aW9uKCl7aWYodGhpcy5fcmVhZGFibGVTdGF0ZT09PXVuZGVmaW5lZCl7cmV0dXJuIGZhbHNlfXJldHVybiB0aGlzLl9yZWFkYWJsZVN0YXRlLmRlc3Ryb3llZH0sc2V0OmZ1bmN0aW9uKHZhbHVlKXtpZighdGhpcy5fcmVhZGFibGVTdGF0ZSl7cmV0dXJufXRoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkPXZhbHVlfX0pO1JlYWRhYmxlLnByb3RvdHlwZS5kZXN0cm95PWRlc3Ryb3lJbXBsLmRlc3Ryb3k7UmVhZGFibGUucHJvdG90eXBlLl91bmRlc3Ryb3k9ZGVzdHJveUltcGwudW5kZXN0cm95O1JlYWRhYmxlLnByb3RvdHlwZS5fZGVzdHJveT1mdW5jdGlvbihlcnIsY2Ipe3RoaXMucHVzaChudWxsKTtjYihlcnIpfTtSZWFkYWJsZS5wcm90b3R5cGUucHVzaD1mdW5jdGlvbihjaHVuayxlbmNvZGluZyl7dmFyIHN0YXRlPXRoaXMuX3JlYWRhYmxlU3RhdGU7dmFyIHNraXBDaHVua0NoZWNrO2lmKCFzdGF0ZS5vYmplY3RNb2RlKXtpZih0eXBlb2YgY2h1bms9PT0ic3RyaW5nIil7ZW5jb2Rpbmc9ZW5jb2Rpbmd8fHN0YXRlLmRlZmF1bHRFbmNvZGluZztpZihlbmNvZGluZyE9PXN0YXRlLmVuY29kaW5nKXtjaHVuaz1CdWZmZXIuZnJvbShjaHVuayxlbmNvZGluZyk7ZW5jb2Rpbmc9IiJ9c2tpcENodW5rQ2hlY2s9dHJ1ZX19ZWxzZXtza2lwQ2h1bmtDaGVjaz10cnVlfXJldHVybiByZWFkYWJsZUFkZENodW5rKHRoaXMsY2h1bmssZW5jb2RpbmcsZmFsc2Usc2tpcENodW5rQ2hlY2spfTtSZWFkYWJsZS5wcm90b3R5cGUudW5zaGlmdD1mdW5jdGlvbihjaHVuayl7cmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcyxjaHVuayxudWxsLHRydWUsZmFsc2UpfTtmdW5jdGlvbiByZWFkYWJsZUFkZENodW5rKHN0cmVhbSxjaHVuayxlbmNvZGluZyxhZGRUb0Zyb250LHNraXBDaHVua0NoZWNrKXt2YXIgc3RhdGU9c3RyZWFtLl9yZWFkYWJsZVN0YXRlO2lmKGNodW5rPT09bnVsbCl7c3RhdGUucmVhZGluZz1mYWxzZTtvbkVvZkNodW5rKHN0cmVhbSxzdGF0ZSl9ZWxzZXt2YXIgZXI7aWYoIXNraXBDaHVua0NoZWNrKWVyPWNodW5rSW52YWxpZChzdGF0ZSxjaHVuayk7aWYoZXIpe3N0cmVhbS5lbWl0KCJlcnJvciIsZXIpfWVsc2UgaWYoc3RhdGUub2JqZWN0TW9kZXx8Y2h1bmsmJmNodW5rLmxlbmd0aD4wKXtpZih0eXBlb2YgY2h1bmshPT0ic3RyaW5nIiYmIXN0YXRlLm9iamVjdE1vZGUmJk9iamVjdC5nZXRQcm90b3R5cGVPZihjaHVuaykhPT1CdWZmZXIucHJvdG90eXBlKXtjaHVuaz1fdWludDhBcnJheVRvQnVmZmVyKGNodW5rKX1pZihhZGRUb0Zyb250KXtpZihzdGF0ZS5lbmRFbWl0dGVkKXN0cmVhbS5lbWl0KCJlcnJvciIsbmV3IEVycm9yKCJzdHJlYW0udW5zaGlmdCgpIGFmdGVyIGVuZCBldmVudCIpKTtlbHNlIGFkZENodW5rKHN0cmVhbSxzdGF0ZSxjaHVuayx0cnVlKX1lbHNlIGlmKHN0YXRlLmVuZGVkKXtzdHJlYW0uZW1pdCgiZXJyb3IiLG5ldyBFcnJvcigic3RyZWFtLnB1c2goKSBhZnRlciBFT0YiKSl9ZWxzZXtzdGF0ZS5yZWFkaW5nPWZhbHNlO2lmKHN0YXRlLmRlY29kZXImJiFlbmNvZGluZyl7Y2h1bms9c3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7aWYoc3RhdGUub2JqZWN0TW9kZXx8Y2h1bmsubGVuZ3RoIT09MClhZGRDaHVuayhzdHJlYW0sc3RhdGUsY2h1bmssZmFsc2UpO2Vsc2UgbWF5YmVSZWFkTW9yZShzdHJlYW0sc3RhdGUpfWVsc2V7YWRkQ2h1bmsoc3RyZWFtLHN0YXRlLGNodW5rLGZhbHNlKX19fWVsc2UgaWYoIWFkZFRvRnJvbnQpe3N0YXRlLnJlYWRpbmc9ZmFsc2V9fXJldHVybiBuZWVkTW9yZURhdGEoc3RhdGUpfWZ1bmN0aW9uIGFkZENodW5rKHN0cmVhbSxzdGF0ZSxjaHVuayxhZGRUb0Zyb250KXtpZihzdGF0ZS5mbG93aW5nJiZzdGF0ZS5sZW5ndGg9PT0wJiYhc3RhdGUuc3luYyl7c3RyZWFtLmVtaXQoImRhdGEiLGNodW5rKTtzdHJlYW0ucmVhZCgwKX1lbHNle3N0YXRlLmxlbmd0aCs9c3RhdGUub2JqZWN0TW9kZT8xOmNodW5rLmxlbmd0aDtpZihhZGRUb0Zyb250KXN0YXRlLmJ1ZmZlci51bnNoaWZ0KGNodW5rKTtlbHNlIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtpZihzdGF0ZS5uZWVkUmVhZGFibGUpZW1pdFJlYWRhYmxlKHN0cmVhbSl9bWF5YmVSZWFkTW9yZShzdHJlYW0sc3RhdGUpfWZ1bmN0aW9uIGNodW5rSW52YWxpZChzdGF0ZSxjaHVuayl7dmFyIGVyO2lmKCFfaXNVaW50OEFycmF5KGNodW5rKSYmdHlwZW9mIGNodW5rIT09InN0cmluZyImJmNodW5rIT09dW5kZWZpbmVkJiYhc3RhdGUub2JqZWN0TW9kZSl7ZXI9bmV3IFR5cGVFcnJvcigiSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuayIpfXJldHVybiBlcn1mdW5jdGlvbiBuZWVkTW9yZURhdGEoc3RhdGUpe3JldHVybiFzdGF0ZS5lbmRlZCYmKHN0YXRlLm5lZWRSZWFkYWJsZXx8c3RhdGUubGVuZ3RoPHN0YXRlLmhpZ2hXYXRlck1hcmt8fHN0YXRlLmxlbmd0aD09PTApfVJlYWRhYmxlLnByb3RvdHlwZS5pc1BhdXNlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmc9PT1mYWxzZX07UmVhZGFibGUucHJvdG90eXBlLnNldEVuY29kaW5nPWZ1bmN0aW9uKGVuYyl7aWYoIVN0cmluZ0RlY29kZXIpU3RyaW5nRGVjb2Rlcj1yZXF1aXJlKCJzdHJpbmdfZGVjb2Rlci8iKS5TdHJpbmdEZWNvZGVyO3RoaXMuX3JlYWRhYmxlU3RhdGUuZGVjb2Rlcj1uZXcgU3RyaW5nRGVjb2RlcihlbmMpO3RoaXMuX3JlYWRhYmxlU3RhdGUuZW5jb2Rpbmc9ZW5jO3JldHVybiB0aGlzfTt2YXIgTUFYX0hXTT04Mzg4NjA4O2Z1bmN0aW9uIGNvbXB1dGVOZXdIaWdoV2F0ZXJNYXJrKG4pe2lmKG4+PU1BWF9IV00pe249TUFYX0hXTX1lbHNle24tLTtufD1uPj4+MTtufD1uPj4+MjtufD1uPj4+NDtufD1uPj4+ODtufD1uPj4+MTY7bisrfXJldHVybiBufWZ1bmN0aW9uIGhvd011Y2hUb1JlYWQobixzdGF0ZSl7aWYobjw9MHx8c3RhdGUubGVuZ3RoPT09MCYmc3RhdGUuZW5kZWQpcmV0dXJuIDA7aWYoc3RhdGUub2JqZWN0TW9kZSlyZXR1cm4gMTtpZihuIT09bil7aWYoc3RhdGUuZmxvd2luZyYmc3RhdGUubGVuZ3RoKXJldHVybiBzdGF0ZS5idWZmZXIuaGVhZC5kYXRhLmxlbmd0aDtlbHNlIHJldHVybiBzdGF0ZS5sZW5ndGh9aWYobj5zdGF0ZS5oaWdoV2F0ZXJNYXJrKXN0YXRlLmhpZ2hXYXRlck1hcms9Y29tcHV0ZU5ld0hpZ2hXYXRlck1hcmsobik7aWYobjw9c3RhdGUubGVuZ3RoKXJldHVybiBuO2lmKCFzdGF0ZS5lbmRlZCl7c3RhdGUubmVlZFJlYWRhYmxlPXRydWU7cmV0dXJuIDB9cmV0dXJuIHN0YXRlLmxlbmd0aH1SZWFkYWJsZS5wcm90b3R5cGUucmVhZD1mdW5jdGlvbihuKXtkZWJ1ZygicmVhZCIsbik7bj1wYXJzZUludChuLDEwKTt2YXIgc3RhdGU9dGhpcy5fcmVhZGFibGVTdGF0ZTt2YXIgbk9yaWc9bjtpZihuIT09MClzdGF0ZS5lbWl0dGVkUmVhZGFibGU9ZmFsc2U7aWYobj09PTAmJnN0YXRlLm5lZWRSZWFkYWJsZSYmKHN0YXRlLmxlbmd0aD49c3RhdGUuaGlnaFdhdGVyTWFya3x8c3RhdGUuZW5kZWQpKXtkZWJ1ZygicmVhZDogZW1pdFJlYWRhYmxlIixzdGF0ZS5sZW5ndGgsc3RhdGUuZW5kZWQpO2lmKHN0YXRlLmxlbmd0aD09PTAmJnN0YXRlLmVuZGVkKWVuZFJlYWRhYmxlKHRoaXMpO2Vsc2UgZW1pdFJlYWRhYmxlKHRoaXMpO3JldHVybiBudWxsfW49aG93TXVjaFRvUmVhZChuLHN0YXRlKTtpZihuPT09MCYmc3RhdGUuZW5kZWQpe2lmKHN0YXRlLmxlbmd0aD09PTApZW5kUmVhZGFibGUodGhpcyk7cmV0dXJuIG51bGx9dmFyIGRvUmVhZD1zdGF0ZS5uZWVkUmVhZGFibGU7ZGVidWcoIm5lZWQgcmVhZGFibGUiLGRvUmVhZCk7aWYoc3RhdGUubGVuZ3RoPT09MHx8c3RhdGUubGVuZ3RoLW48c3RhdGUuaGlnaFdhdGVyTWFyayl7ZG9SZWFkPXRydWU7ZGVidWcoImxlbmd0aCBsZXNzIHRoYW4gd2F0ZXJtYXJrIixkb1JlYWQpfWlmKHN0YXRlLmVuZGVkfHxzdGF0ZS5yZWFkaW5nKXtkb1JlYWQ9ZmFsc2U7ZGVidWcoInJlYWRpbmcgb3IgZW5kZWQiLGRvUmVhZCl9ZWxzZSBpZihkb1JlYWQpe2RlYnVnKCJkbyByZWFkIik7c3RhdGUucmVhZGluZz10cnVlO3N0YXRlLnN5bmM9dHJ1ZTtpZihzdGF0ZS5sZW5ndGg9PT0wKXN0YXRlLm5lZWRSZWFkYWJsZT10cnVlO3RoaXMuX3JlYWQoc3RhdGUuaGlnaFdhdGVyTWFyayk7c3RhdGUuc3luYz1mYWxzZTtpZighc3RhdGUucmVhZGluZyluPWhvd011Y2hUb1JlYWQobk9yaWcsc3RhdGUpfXZhciByZXQ7aWYobj4wKXJldD1mcm9tTGlzdChuLHN0YXRlKTtlbHNlIHJldD1udWxsO2lmKHJldD09PW51bGwpe3N0YXRlLm5lZWRSZWFkYWJsZT10cnVlO249MH1lbHNle3N0YXRlLmxlbmd0aC09bn1pZihzdGF0ZS5sZW5ndGg9PT0wKXtpZighc3RhdGUuZW5kZWQpc3RhdGUubmVlZFJlYWRhYmxlPXRydWU7aWYobk9yaWchPT1uJiZzdGF0ZS5lbmRlZCllbmRSZWFkYWJsZSh0aGlzKX1pZihyZXQhPT1udWxsKXRoaXMuZW1pdCgiZGF0YSIscmV0KTtyZXR1cm4gcmV0fTtmdW5jdGlvbiBvbkVvZkNodW5rKHN0cmVhbSxzdGF0ZSl7aWYoc3RhdGUuZW5kZWQpcmV0dXJuO2lmKHN0YXRlLmRlY29kZXIpe3ZhciBjaHVuaz1zdGF0ZS5kZWNvZGVyLmVuZCgpO2lmKGNodW5rJiZjaHVuay5sZW5ndGgpe3N0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtzdGF0ZS5sZW5ndGgrPXN0YXRlLm9iamVjdE1vZGU/MTpjaHVuay5sZW5ndGh9fXN0YXRlLmVuZGVkPXRydWU7ZW1pdFJlYWRhYmxlKHN0cmVhbSl9ZnVuY3Rpb24gZW1pdFJlYWRhYmxlKHN0cmVhbSl7dmFyIHN0YXRlPXN0cmVhbS5fcmVhZGFibGVTdGF0ZTtzdGF0ZS5uZWVkUmVhZGFibGU9ZmFsc2U7aWYoIXN0YXRlLmVtaXR0ZWRSZWFkYWJsZSl7ZGVidWcoImVtaXRSZWFkYWJsZSIsc3RhdGUuZmxvd2luZyk7c3RhdGUuZW1pdHRlZFJlYWRhYmxlPXRydWU7aWYoc3RhdGUuc3luYylwbmEubmV4dFRpY2soZW1pdFJlYWRhYmxlXyxzdHJlYW0pO2Vsc2UgZW1pdFJlYWRhYmxlXyhzdHJlYW0pfX1mdW5jdGlvbiBlbWl0UmVhZGFibGVfKHN0cmVhbSl7ZGVidWcoImVtaXQgcmVhZGFibGUiKTtzdHJlYW0uZW1pdCgicmVhZGFibGUiKTtmbG93KHN0cmVhbSl9ZnVuY3Rpb24gbWF5YmVSZWFkTW9yZShzdHJlYW0sc3RhdGUpe2lmKCFzdGF0ZS5yZWFkaW5nTW9yZSl7c3RhdGUucmVhZGluZ01vcmU9dHJ1ZTtwbmEubmV4dFRpY2sobWF5YmVSZWFkTW9yZV8sc3RyZWFtLHN0YXRlKX19ZnVuY3Rpb24gbWF5YmVSZWFkTW9yZV8oc3RyZWFtLHN0YXRlKXt2YXIgbGVuPXN0YXRlLmxlbmd0aDt3aGlsZSghc3RhdGUucmVhZGluZyYmIXN0YXRlLmZsb3dpbmcmJiFzdGF0ZS5lbmRlZCYmc3RhdGUubGVuZ3RoPHN0YXRlLmhpZ2hXYXRlck1hcmspe2RlYnVnKCJtYXliZVJlYWRNb3JlIHJlYWQgMCIpO3N0cmVhbS5yZWFkKDApO2lmKGxlbj09PXN0YXRlLmxlbmd0aClicmVhaztlbHNlIGxlbj1zdGF0ZS5sZW5ndGh9c3RhdGUucmVhZGluZ01vcmU9ZmFsc2V9UmVhZGFibGUucHJvdG90eXBlLl9yZWFkPWZ1bmN0aW9uKG4pe3RoaXMuZW1pdCgiZXJyb3IiLG5ldyBFcnJvcigiX3JlYWQoKSBpcyBub3QgaW1wbGVtZW50ZWQiKSl9O1JlYWRhYmxlLnByb3RvdHlwZS5waXBlPWZ1bmN0aW9uKGRlc3QscGlwZU9wdHMpe3ZhciBzcmM9dGhpczt2YXIgc3RhdGU9dGhpcy5fcmVhZGFibGVTdGF0ZTtzd2l0Y2goc3RhdGUucGlwZXNDb3VudCl7Y2FzZSAwOnN0YXRlLnBpcGVzPWRlc3Q7YnJlYWs7Y2FzZSAxOnN0YXRlLnBpcGVzPVtzdGF0ZS5waXBlcyxkZXN0XTticmVhaztkZWZhdWx0OnN0YXRlLnBpcGVzLnB1c2goZGVzdCk7YnJlYWt9c3RhdGUucGlwZXNDb3VudCs9MTtkZWJ1ZygicGlwZSBjb3VudD0lZCBvcHRzPSVqIixzdGF0ZS5waXBlc0NvdW50LHBpcGVPcHRzKTt2YXIgZG9FbmQ9KCFwaXBlT3B0c3x8cGlwZU9wdHMuZW5kIT09ZmFsc2UpJiZkZXN0IT09cHJvY2Vzcy5zdGRvdXQmJmRlc3QhPT1wcm9jZXNzLnN0ZGVycjt2YXIgZW5kRm49ZG9FbmQ/b25lbmQ6dW5waXBlO2lmKHN0YXRlLmVuZEVtaXR0ZWQpcG5hLm5leHRUaWNrKGVuZEZuKTtlbHNlIHNyYy5vbmNlKCJlbmQiLGVuZEZuKTtkZXN0Lm9uKCJ1bnBpcGUiLG9udW5waXBlKTtmdW5jdGlvbiBvbnVucGlwZShyZWFkYWJsZSx1bnBpcGVJbmZvKXtkZWJ1Zygib251bnBpcGUiKTtpZihyZWFkYWJsZT09PXNyYyl7aWYodW5waXBlSW5mbyYmdW5waXBlSW5mby5oYXNVbnBpcGVkPT09ZmFsc2Upe3VucGlwZUluZm8uaGFzVW5waXBlZD10cnVlO2NsZWFudXAoKX19fWZ1bmN0aW9uIG9uZW5kKCl7ZGVidWcoIm9uZW5kIik7ZGVzdC5lbmQoKX12YXIgb25kcmFpbj1waXBlT25EcmFpbihzcmMpO2Rlc3Qub24oImRyYWluIixvbmRyYWluKTt2YXIgY2xlYW5lZFVwPWZhbHNlO2Z1bmN0aW9uIGNsZWFudXAoKXtkZWJ1ZygiY2xlYW51cCIpO2Rlc3QucmVtb3ZlTGlzdGVuZXIoImNsb3NlIixvbmNsb3NlKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJmaW5pc2giLG9uZmluaXNoKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJkcmFpbiIsb25kcmFpbik7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiZXJyb3IiLG9uZXJyb3IpO2Rlc3QucmVtb3ZlTGlzdGVuZXIoInVucGlwZSIsb251bnBpcGUpO3NyYy5yZW1vdmVMaXN0ZW5lcigiZW5kIixvbmVuZCk7c3JjLnJlbW92ZUxpc3RlbmVyKCJlbmQiLHVucGlwZSk7c3JjLnJlbW92ZUxpc3RlbmVyKCJkYXRhIixvbmRhdGEpO2NsZWFuZWRVcD10cnVlO2lmKHN0YXRlLmF3YWl0RHJhaW4mJighZGVzdC5fd3JpdGFibGVTdGF0ZXx8ZGVzdC5fd3JpdGFibGVTdGF0ZS5uZWVkRHJhaW4pKW9uZHJhaW4oKX12YXIgaW5jcmVhc2VkQXdhaXREcmFpbj1mYWxzZTtzcmMub24oImRhdGEiLG9uZGF0YSk7ZnVuY3Rpb24gb25kYXRhKGNodW5rKXtkZWJ1Zygib25kYXRhIik7aW5jcmVhc2VkQXdhaXREcmFpbj1mYWxzZTt2YXIgcmV0PWRlc3Qud3JpdGUoY2h1bmspO2lmKGZhbHNlPT09cmV0JiYhaW5jcmVhc2VkQXdhaXREcmFpbil7aWYoKHN0YXRlLnBpcGVzQ291bnQ9PT0xJiZzdGF0ZS5waXBlcz09PWRlc3R8fHN0YXRlLnBpcGVzQ291bnQ+MSYmaW5kZXhPZihzdGF0ZS5waXBlcyxkZXN0KSE9PS0xKSYmIWNsZWFuZWRVcCl7ZGVidWcoImZhbHNlIHdyaXRlIHJlc3BvbnNlLCBwYXVzZSIsc3JjLl9yZWFkYWJsZVN0YXRlLmF3YWl0RHJhaW4pO3NyYy5fcmVhZGFibGVTdGF0ZS5hd2FpdERyYWluKys7aW5jcmVhc2VkQXdhaXREcmFpbj10cnVlfXNyYy5wYXVzZSgpfX1mdW5jdGlvbiBvbmVycm9yKGVyKXtkZWJ1Zygib25lcnJvciIsZXIpO3VucGlwZSgpO2Rlc3QucmVtb3ZlTGlzdGVuZXIoImVycm9yIixvbmVycm9yKTtpZihFRWxpc3RlbmVyQ291bnQoZGVzdCwiZXJyb3IiKT09PTApZGVzdC5lbWl0KCJlcnJvciIsZXIpfXByZXBlbmRMaXN0ZW5lcihkZXN0LCJlcnJvciIsb25lcnJvcik7ZnVuY3Rpb24gb25jbG9zZSgpe2Rlc3QucmVtb3ZlTGlzdGVuZXIoImZpbmlzaCIsb25maW5pc2gpO3VucGlwZSgpfWRlc3Qub25jZSgiY2xvc2UiLG9uY2xvc2UpO2Z1bmN0aW9uIG9uZmluaXNoKCl7ZGVidWcoIm9uZmluaXNoIik7ZGVzdC5yZW1vdmVMaXN0ZW5lcigiY2xvc2UiLG9uY2xvc2UpO3VucGlwZSgpfWRlc3Qub25jZSgiZmluaXNoIixvbmZpbmlzaCk7ZnVuY3Rpb24gdW5waXBlKCl7ZGVidWcoInVucGlwZSIpO3NyYy51bnBpcGUoZGVzdCl9ZGVzdC5lbWl0KCJwaXBlIixzcmMpO2lmKCFzdGF0ZS5mbG93aW5nKXtkZWJ1ZygicGlwZSByZXN1bWUiKTtzcmMucmVzdW1lKCl9cmV0dXJuIGRlc3R9O2Z1bmN0aW9uIHBpcGVPbkRyYWluKHNyYyl7cmV0dXJuIGZ1bmN0aW9uKCl7dmFyIHN0YXRlPXNyYy5fcmVhZGFibGVTdGF0ZTtkZWJ1ZygicGlwZU9uRHJhaW4iLHN0YXRlLmF3YWl0RHJhaW4pO2lmKHN0YXRlLmF3YWl0RHJhaW4pc3RhdGUuYXdhaXREcmFpbi0tO2lmKHN0YXRlLmF3YWl0RHJhaW49PT0wJiZFRWxpc3RlbmVyQ291bnQoc3JjLCJkYXRhIikpe3N0YXRlLmZsb3dpbmc9dHJ1ZTtmbG93KHNyYyl9fX1SZWFkYWJsZS5wcm90b3R5cGUudW5waXBlPWZ1bmN0aW9uKGRlc3Qpe3ZhciBzdGF0ZT10aGlzLl9yZWFkYWJsZVN0YXRlO3ZhciB1bnBpcGVJbmZvPXtoYXNVbnBpcGVkOmZhbHNlfTtpZihzdGF0ZS5waXBlc0NvdW50PT09MClyZXR1cm4gdGhpcztpZihzdGF0ZS5waXBlc0NvdW50PT09MSl7aWYoZGVzdCYmZGVzdCE9PXN0YXRlLnBpcGVzKXJldHVybiB0aGlzO2lmKCFkZXN0KWRlc3Q9c3RhdGUucGlwZXM7c3RhdGUucGlwZXM9bnVsbDtzdGF0ZS5waXBlc0NvdW50PTA7c3RhdGUuZmxvd2luZz1mYWxzZTtpZihkZXN0KWRlc3QuZW1pdCgidW5waXBlIix0aGlzLHVucGlwZUluZm8pO3JldHVybiB0aGlzfWlmKCFkZXN0KXt2YXIgZGVzdHM9c3RhdGUucGlwZXM7dmFyIGxlbj1zdGF0ZS5waXBlc0NvdW50O3N0YXRlLnBpcGVzPW51bGw7c3RhdGUucGlwZXNDb3VudD0wO3N0YXRlLmZsb3dpbmc9ZmFsc2U7Zm9yKHZhciBpPTA7aTxsZW47aSsrKXtkZXN0c1tpXS5lbWl0KCJ1bnBpcGUiLHRoaXMsdW5waXBlSW5mbyl9cmV0dXJuIHRoaXN9dmFyIGluZGV4PWluZGV4T2Yoc3RhdGUucGlwZXMsZGVzdCk7aWYoaW5kZXg9PT0tMSlyZXR1cm4gdGhpcztzdGF0ZS5waXBlcy5zcGxpY2UoaW5kZXgsMSk7c3RhdGUucGlwZXNDb3VudC09MTtpZihzdGF0ZS5waXBlc0NvdW50PT09MSlzdGF0ZS5waXBlcz1zdGF0ZS5waXBlc1swXTtkZXN0LmVtaXQoInVucGlwZSIsdGhpcyx1bnBpcGVJbmZvKTtyZXR1cm4gdGhpc307UmVhZGFibGUucHJvdG90eXBlLm9uPWZ1bmN0aW9uKGV2LGZuKXt2YXIgcmVzPVN0cmVhbS5wcm90b3R5cGUub24uY2FsbCh0aGlzLGV2LGZuKTtpZihldj09PSJkYXRhIil7aWYodGhpcy5fcmVhZGFibGVTdGF0ZS5mbG93aW5nIT09ZmFsc2UpdGhpcy5yZXN1bWUoKX1lbHNlIGlmKGV2PT09InJlYWRhYmxlIil7dmFyIHN0YXRlPXRoaXMuX3JlYWRhYmxlU3RhdGU7aWYoIXN0YXRlLmVuZEVtaXR0ZWQmJiFzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZyl7c3RhdGUucmVhZGFibGVMaXN0ZW5pbmc9c3RhdGUubmVlZFJlYWRhYmxlPXRydWU7c3RhdGUuZW1pdHRlZFJlYWRhYmxlPWZhbHNlO2lmKCFzdGF0ZS5yZWFkaW5nKXtwbmEubmV4dFRpY2soblJlYWRpbmdOZXh0VGljayx0aGlzKX1lbHNlIGlmKHN0YXRlLmxlbmd0aCl7ZW1pdFJlYWRhYmxlKHRoaXMpfX19cmV0dXJuIHJlc307UmVhZGFibGUucHJvdG90eXBlLmFkZExpc3RlbmVyPVJlYWRhYmxlLnByb3RvdHlwZS5vbjtmdW5jdGlvbiBuUmVhZGluZ05leHRUaWNrKHNlbGYpe2RlYnVnKCJyZWFkYWJsZSBuZXh0dGljayByZWFkIDAiKTtzZWxmLnJlYWQoMCl9UmVhZGFibGUucHJvdG90eXBlLnJlc3VtZT1mdW5jdGlvbigpe3ZhciBzdGF0ZT10aGlzLl9yZWFkYWJsZVN0YXRlO2lmKCFzdGF0ZS5mbG93aW5nKXtkZWJ1ZygicmVzdW1lIik7c3RhdGUuZmxvd2luZz10cnVlO3Jlc3VtZSh0aGlzLHN0YXRlKX1yZXR1cm4gdGhpc307ZnVuY3Rpb24gcmVzdW1lKHN0cmVhbSxzdGF0ZSl7aWYoIXN0YXRlLnJlc3VtZVNjaGVkdWxlZCl7c3RhdGUucmVzdW1lU2NoZWR1bGVkPXRydWU7cG5hLm5leHRUaWNrKHJlc3VtZV8sc3RyZWFtLHN0YXRlKX19ZnVuY3Rpb24gcmVzdW1lXyhzdHJlYW0sc3RhdGUpe2lmKCFzdGF0ZS5yZWFkaW5nKXtkZWJ1ZygicmVzdW1lIHJlYWQgMCIpO3N0cmVhbS5yZWFkKDApfXN0YXRlLnJlc3VtZVNjaGVkdWxlZD1mYWxzZTtzdGF0ZS5hd2FpdERyYWluPTA7c3RyZWFtLmVtaXQoInJlc3VtZSIpO2Zsb3coc3RyZWFtKTtpZihzdGF0ZS5mbG93aW5nJiYhc3RhdGUucmVhZGluZylzdHJlYW0ucmVhZCgwKX1SZWFkYWJsZS5wcm90b3R5cGUucGF1c2U9ZnVuY3Rpb24oKXtkZWJ1ZygiY2FsbCBwYXVzZSBmbG93aW5nPSVqIix0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmcpO2lmKGZhbHNlIT09dGhpcy5fcmVhZGFibGVTdGF0ZS5mbG93aW5nKXtkZWJ1ZygicGF1c2UiKTt0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmc9ZmFsc2U7dGhpcy5lbWl0KCJwYXVzZSIpfXJldHVybiB0aGlzfTtmdW5jdGlvbiBmbG93KHN0cmVhbSl7dmFyIHN0YXRlPXN0cmVhbS5fcmVhZGFibGVTdGF0ZTtkZWJ1ZygiZmxvdyIsc3RhdGUuZmxvd2luZyk7d2hpbGUoc3RhdGUuZmxvd2luZyYmc3RyZWFtLnJlYWQoKSE9PW51bGwpe319UmVhZGFibGUucHJvdG90eXBlLndyYXA9ZnVuY3Rpb24oc3RyZWFtKXt2YXIgX3RoaXM9dGhpczt2YXIgc3RhdGU9dGhpcy5fcmVhZGFibGVTdGF0ZTt2YXIgcGF1c2VkPWZhbHNlO3N0cmVhbS5vbigiZW5kIixmdW5jdGlvbigpe2RlYnVnKCJ3cmFwcGVkIGVuZCIpO2lmKHN0YXRlLmRlY29kZXImJiFzdGF0ZS5lbmRlZCl7dmFyIGNodW5rPXN0YXRlLmRlY29kZXIuZW5kKCk7aWYoY2h1bmsmJmNodW5rLmxlbmd0aClfdGhpcy5wdXNoKGNodW5rKX1fdGhpcy5wdXNoKG51bGwpfSk7c3RyZWFtLm9uKCJkYXRhIixmdW5jdGlvbihjaHVuayl7ZGVidWcoIndyYXBwZWQgZGF0YSIpO2lmKHN0YXRlLmRlY29kZXIpY2h1bms9c3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7aWYoc3RhdGUub2JqZWN0TW9kZSYmKGNodW5rPT09bnVsbHx8Y2h1bms9PT11bmRlZmluZWQpKXJldHVybjtlbHNlIGlmKCFzdGF0ZS5vYmplY3RNb2RlJiYoIWNodW5rfHwhY2h1bmsubGVuZ3RoKSlyZXR1cm47dmFyIHJldD1fdGhpcy5wdXNoKGNodW5rKTtpZighcmV0KXtwYXVzZWQ9dHJ1ZTtzdHJlYW0ucGF1c2UoKX19KTtmb3IodmFyIGkgaW4gc3RyZWFtKXtpZih0aGlzW2ldPT09dW5kZWZpbmVkJiZ0eXBlb2Ygc3RyZWFtW2ldPT09ImZ1bmN0aW9uIil7dGhpc1tpXT1mdW5jdGlvbihtZXRob2Qpe3JldHVybiBmdW5jdGlvbigpe3JldHVybiBzdHJlYW1bbWV0aG9kXS5hcHBseShzdHJlYW0sYXJndW1lbnRzKX19KGkpfX1mb3IodmFyIG49MDtuPGtQcm94eUV2ZW50cy5sZW5ndGg7bisrKXtzdHJlYW0ub24oa1Byb3h5RXZlbnRzW25dLHRoaXMuZW1pdC5iaW5kKHRoaXMsa1Byb3h5RXZlbnRzW25dKSl9dGhpcy5fcmVhZD1mdW5jdGlvbihuKXtkZWJ1Zygid3JhcHBlZCBfcmVhZCIsbik7aWYocGF1c2VkKXtwYXVzZWQ9ZmFsc2U7c3RyZWFtLnJlc3VtZSgpfX07cmV0dXJuIHRoaXN9O09iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWFkYWJsZS5wcm90b3R5cGUsInJlYWRhYmxlSGlnaFdhdGVyTWFyayIse2VudW1lcmFibGU6ZmFsc2UsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3JlYWRhYmxlU3RhdGUuaGlnaFdhdGVyTWFya319KTtSZWFkYWJsZS5fZnJvbUxpc3Q9ZnJvbUxpc3Q7ZnVuY3Rpb24gZnJvbUxpc3QobixzdGF0ZSl7aWYoc3RhdGUubGVuZ3RoPT09MClyZXR1cm4gbnVsbDt2YXIgcmV0O2lmKHN0YXRlLm9iamVjdE1vZGUpcmV0PXN0YXRlLmJ1ZmZlci5zaGlmdCgpO2Vsc2UgaWYoIW58fG4+PXN0YXRlLmxlbmd0aCl7aWYoc3RhdGUuZGVjb2RlcilyZXQ9c3RhdGUuYnVmZmVyLmpvaW4oIiIpO2Vsc2UgaWYoc3RhdGUuYnVmZmVyLmxlbmd0aD09PTEpcmV0PXN0YXRlLmJ1ZmZlci5oZWFkLmRhdGE7ZWxzZSByZXQ9c3RhdGUuYnVmZmVyLmNvbmNhdChzdGF0ZS5sZW5ndGgpO3N0YXRlLmJ1ZmZlci5jbGVhcigpfWVsc2V7cmV0PWZyb21MaXN0UGFydGlhbChuLHN0YXRlLmJ1ZmZlcixzdGF0ZS5kZWNvZGVyKX1yZXR1cm4gcmV0fWZ1bmN0aW9uIGZyb21MaXN0UGFydGlhbChuLGxpc3QsaGFzU3RyaW5ncyl7dmFyIHJldDtpZihuPGxpc3QuaGVhZC5kYXRhLmxlbmd0aCl7cmV0PWxpc3QuaGVhZC5kYXRhLnNsaWNlKDAsbik7bGlzdC5oZWFkLmRhdGE9bGlzdC5oZWFkLmRhdGEuc2xpY2Uobil9ZWxzZSBpZihuPT09bGlzdC5oZWFkLmRhdGEubGVuZ3RoKXtyZXQ9bGlzdC5zaGlmdCgpfWVsc2V7cmV0PWhhc1N0cmluZ3M/Y29weUZyb21CdWZmZXJTdHJpbmcobixsaXN0KTpjb3B5RnJvbUJ1ZmZlcihuLGxpc3QpfXJldHVybiByZXR9ZnVuY3Rpb24gY29weUZyb21CdWZmZXJTdHJpbmcobixsaXN0KXt2YXIgcD1saXN0LmhlYWQ7dmFyIGM9MTt2YXIgcmV0PXAuZGF0YTtuLT1yZXQubGVuZ3RoO3doaWxlKHA9cC5uZXh0KXt2YXIgc3RyPXAuZGF0YTt2YXIgbmI9bj5zdHIubGVuZ3RoP3N0ci5sZW5ndGg6bjtpZihuYj09PXN0ci5sZW5ndGgpcmV0Kz1zdHI7ZWxzZSByZXQrPXN0ci5zbGljZSgwLG4pO24tPW5iO2lmKG49PT0wKXtpZihuYj09PXN0ci5sZW5ndGgpeysrYztpZihwLm5leHQpbGlzdC5oZWFkPXAubmV4dDtlbHNlIGxpc3QuaGVhZD1saXN0LnRhaWw9bnVsbH1lbHNle2xpc3QuaGVhZD1wO3AuZGF0YT1zdHIuc2xpY2UobmIpfWJyZWFrfSsrY31saXN0Lmxlbmd0aC09YztyZXR1cm4gcmV0fWZ1bmN0aW9uIGNvcHlGcm9tQnVmZmVyKG4sbGlzdCl7dmFyIHJldD1CdWZmZXIuYWxsb2NVbnNhZmUobik7dmFyIHA9bGlzdC5oZWFkO3ZhciBjPTE7cC5kYXRhLmNvcHkocmV0KTtuLT1wLmRhdGEubGVuZ3RoO3doaWxlKHA9cC5uZXh0KXt2YXIgYnVmPXAuZGF0YTt2YXIgbmI9bj5idWYubGVuZ3RoP2J1Zi5sZW5ndGg6bjtidWYuY29weShyZXQscmV0Lmxlbmd0aC1uLDAsbmIpO24tPW5iO2lmKG49PT0wKXtpZihuYj09PWJ1Zi5sZW5ndGgpeysrYztpZihwLm5leHQpbGlzdC5oZWFkPXAubmV4dDtlbHNlIGxpc3QuaGVhZD1saXN0LnRhaWw9bnVsbH1lbHNle2xpc3QuaGVhZD1wO3AuZGF0YT1idWYuc2xpY2UobmIpfWJyZWFrfSsrY31saXN0Lmxlbmd0aC09YztyZXR1cm4gcmV0fWZ1bmN0aW9uIGVuZFJlYWRhYmxlKHN0cmVhbSl7dmFyIHN0YXRlPXN0cmVhbS5fcmVhZGFibGVTdGF0ZTtpZihzdGF0ZS5sZW5ndGg+MCl0aHJvdyBuZXcgRXJyb3IoJyJlbmRSZWFkYWJsZSgpIiBjYWxsZWQgb24gbm9uLWVtcHR5IHN0cmVhbScpO2lmKCFzdGF0ZS5lbmRFbWl0dGVkKXtzdGF0ZS5lbmRlZD10cnVlO3BuYS5uZXh0VGljayhlbmRSZWFkYWJsZU5ULHN0YXRlLHN0cmVhbSl9fWZ1bmN0aW9uIGVuZFJlYWRhYmxlTlQoc3RhdGUsc3RyZWFtKXtpZighc3RhdGUuZW5kRW1pdHRlZCYmc3RhdGUubGVuZ3RoPT09MCl7c3RhdGUuZW5kRW1pdHRlZD10cnVlO3N0cmVhbS5yZWFkYWJsZT1mYWxzZTtzdHJlYW0uZW1pdCgiZW5kIil9fWZ1bmN0aW9uIGluZGV4T2YoeHMseCl7Zm9yKHZhciBpPTAsbD14cy5sZW5ndGg7aTxsO2krKyl7aWYoeHNbaV09PT14KXJldHVybiBpfXJldHVybi0xfX0pLmNhbGwodGhpcyxyZXF1aXJlKCJfcHJvY2VzcyIpLHR5cGVvZiBnbG9iYWwhPT0idW5kZWZpbmVkIj9nbG9iYWw6dHlwZW9mIHNlbGYhPT0idW5kZWZpbmVkIj9zZWxmOnR5cGVvZiB3aW5kb3chPT0idW5kZWZpbmVkIj93aW5kb3c6e30pfSx7Ii4vX3N0cmVhbV9kdXBsZXgiOjY4LCIuL2ludGVybmFsL3N0cmVhbXMvQnVmZmVyTGlzdCI6NzMsIi4vaW50ZXJuYWwvc3RyZWFtcy9kZXN0cm95Ijo3NCwiLi9pbnRlcm5hbC9zdHJlYW1zL3N0cmVhbSI6NzUsX3Byb2Nlc3M6NjYsImNvcmUtdXRpbC1pcyI6MzAsZXZlbnRzOjMzLGluaGVyaXRzOjM2LGlzYXJyYXk6MzgsInByb2Nlc3MtbmV4dGljay1hcmdzIjo2NSwic2FmZS1idWZmZXIiOjc2LCJzdHJpbmdfZGVjb2Rlci8iOjEwMyx1dGlsOjI2fV0sNzE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyJ1c2Ugc3RyaWN0Ijttb2R1bGUuZXhwb3J0cz1UcmFuc2Zvcm07dmFyIER1cGxleD1yZXF1aXJlKCIuL19zdHJlYW1fZHVwbGV4Iik7dmFyIHV0aWw9cmVxdWlyZSgiY29yZS11dGlsLWlzIik7dXRpbC5pbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3V0aWwuaW5oZXJpdHMoVHJhbnNmb3JtLER1cGxleCk7ZnVuY3Rpb24gYWZ0ZXJUcmFuc2Zvcm0oZXIsZGF0YSl7dmFyIHRzPXRoaXMuX3RyYW5zZm9ybVN0YXRlO3RzLnRyYW5zZm9ybWluZz1mYWxzZTt2YXIgY2I9dHMud3JpdGVjYjtpZighY2Ipe3JldHVybiB0aGlzLmVtaXQoImVycm9yIixuZXcgRXJyb3IoIndyaXRlIGNhbGxiYWNrIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyIpKX10cy53cml0ZWNodW5rPW51bGw7dHMud3JpdGVjYj1udWxsO2lmKGRhdGEhPW51bGwpdGhpcy5wdXNoKGRhdGEpO2NiKGVyKTt2YXIgcnM9dGhpcy5fcmVhZGFibGVTdGF0ZTtycy5yZWFkaW5nPWZhbHNlO2lmKHJzLm5lZWRSZWFkYWJsZXx8cnMubGVuZ3RoPHJzLmhpZ2hXYXRlck1hcmspe3RoaXMuX3JlYWQocnMuaGlnaFdhdGVyTWFyayl9fWZ1bmN0aW9uIFRyYW5zZm9ybShvcHRpb25zKXtpZighKHRoaXMgaW5zdGFuY2VvZiBUcmFuc2Zvcm0pKXJldHVybiBuZXcgVHJhbnNmb3JtKG9wdGlvbnMpO0R1cGxleC5jYWxsKHRoaXMsb3B0aW9ucyk7dGhpcy5fdHJhbnNmb3JtU3RhdGU9e2FmdGVyVHJhbnNmb3JtOmFmdGVyVHJhbnNmb3JtLmJpbmQodGhpcyksbmVlZFRyYW5zZm9ybTpmYWxzZSx0cmFuc2Zvcm1pbmc6ZmFsc2Usd3JpdGVjYjpudWxsLHdyaXRlY2h1bms6bnVsbCx3cml0ZWVuY29kaW5nOm51bGx9O3RoaXMuX3JlYWRhYmxlU3RhdGUubmVlZFJlYWRhYmxlPXRydWU7dGhpcy5fcmVhZGFibGVTdGF0ZS5zeW5jPWZhbHNlO2lmKG9wdGlvbnMpe2lmKHR5cGVvZiBvcHRpb25zLnRyYW5zZm9ybT09PSJmdW5jdGlvbiIpdGhpcy5fdHJhbnNmb3JtPW9wdGlvbnMudHJhbnNmb3JtO2lmKHR5cGVvZiBvcHRpb25zLmZsdXNoPT09ImZ1bmN0aW9uIil0aGlzLl9mbHVzaD1vcHRpb25zLmZsdXNofXRoaXMub24oInByZWZpbmlzaCIscHJlZmluaXNoKX1mdW5jdGlvbiBwcmVmaW5pc2goKXt2YXIgX3RoaXM9dGhpcztpZih0eXBlb2YgdGhpcy5fZmx1c2g9PT0iZnVuY3Rpb24iKXt0aGlzLl9mbHVzaChmdW5jdGlvbihlcixkYXRhKXtkb25lKF90aGlzLGVyLGRhdGEpfSl9ZWxzZXtkb25lKHRoaXMsbnVsbCxudWxsKX19VHJhbnNmb3JtLnByb3RvdHlwZS5wdXNoPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nKXt0aGlzLl90cmFuc2Zvcm1TdGF0ZS5uZWVkVHJhbnNmb3JtPWZhbHNlO3JldHVybiBEdXBsZXgucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLGNodW5rLGVuY29kaW5nKX07VHJhbnNmb3JtLnByb3RvdHlwZS5fdHJhbnNmb3JtPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNiKXt0aHJvdyBuZXcgRXJyb3IoIl90cmFuc2Zvcm0oKSBpcyBub3QgaW1wbGVtZW50ZWQiKX07VHJhbnNmb3JtLnByb3RvdHlwZS5fd3JpdGU9ZnVuY3Rpb24oY2h1bmssZW5jb2RpbmcsY2Ipe3ZhciB0cz10aGlzLl90cmFuc2Zvcm1TdGF0ZTt0cy53cml0ZWNiPWNiO3RzLndyaXRlY2h1bms9Y2h1bms7dHMud3JpdGVlbmNvZGluZz1lbmNvZGluZztpZighdHMudHJhbnNmb3JtaW5nKXt2YXIgcnM9dGhpcy5fcmVhZGFibGVTdGF0ZTtpZih0cy5uZWVkVHJhbnNmb3JtfHxycy5uZWVkUmVhZGFibGV8fHJzLmxlbmd0aDxycy5oaWdoV2F0ZXJNYXJrKXRoaXMuX3JlYWQocnMuaGlnaFdhdGVyTWFyayl9fTtUcmFuc2Zvcm0ucHJvdG90eXBlLl9yZWFkPWZ1bmN0aW9uKG4pe3ZhciB0cz10aGlzLl90cmFuc2Zvcm1TdGF0ZTtpZih0cy53cml0ZWNodW5rIT09bnVsbCYmdHMud3JpdGVjYiYmIXRzLnRyYW5zZm9ybWluZyl7dHMudHJhbnNmb3JtaW5nPXRydWU7dGhpcy5fdHJhbnNmb3JtKHRzLndyaXRlY2h1bmssdHMud3JpdGVlbmNvZGluZyx0cy5hZnRlclRyYW5zZm9ybSl9ZWxzZXt0cy5uZWVkVHJhbnNmb3JtPXRydWV9fTtUcmFuc2Zvcm0ucHJvdG90eXBlLl9kZXN0cm95PWZ1bmN0aW9uKGVycixjYil7dmFyIF90aGlzMj10aGlzO0R1cGxleC5wcm90b3R5cGUuX2Rlc3Ryb3kuY2FsbCh0aGlzLGVycixmdW5jdGlvbihlcnIyKXtjYihlcnIyKTtfdGhpczIuZW1pdCgiY2xvc2UiKX0pfTtmdW5jdGlvbiBkb25lKHN0cmVhbSxlcixkYXRhKXtpZihlcilyZXR1cm4gc3RyZWFtLmVtaXQoImVycm9yIixlcik7aWYoZGF0YSE9bnVsbClzdHJlYW0ucHVzaChkYXRhKTtpZihzdHJlYW0uX3dyaXRhYmxlU3RhdGUubGVuZ3RoKXRocm93IG5ldyBFcnJvcigiQ2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHdzLmxlbmd0aCAhPSAwIik7aWYoc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZS50cmFuc2Zvcm1pbmcpdGhyb3cgbmV3IEVycm9yKCJDYWxsaW5nIHRyYW5zZm9ybSBkb25lIHdoZW4gc3RpbGwgdHJhbnNmb3JtaW5nIik7cmV0dXJuIHN0cmVhbS5wdXNoKG51bGwpfX0seyIuL19zdHJlYW1fZHVwbGV4Ijo2OCwiY29yZS11dGlsLWlzIjozMCxpbmhlcml0czozNn1dLDcyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2VzcyxnbG9iYWwsc2V0SW1tZWRpYXRlKXsidXNlIHN0cmljdCI7dmFyIHBuYT1yZXF1aXJlKCJwcm9jZXNzLW5leHRpY2stYXJncyIpO21vZHVsZS5leHBvcnRzPVdyaXRhYmxlO2Z1bmN0aW9uIFdyaXRlUmVxKGNodW5rLGVuY29kaW5nLGNiKXt0aGlzLmNodW5rPWNodW5rO3RoaXMuZW5jb2Rpbmc9ZW5jb2Rpbmc7dGhpcy5jYWxsYmFjaz1jYjt0aGlzLm5leHQ9bnVsbH1mdW5jdGlvbiBDb3JrZWRSZXF1ZXN0KHN0YXRlKXt2YXIgX3RoaXM9dGhpczt0aGlzLm5leHQ9bnVsbDt0aGlzLmVudHJ5PW51bGw7dGhpcy5maW5pc2g9ZnVuY3Rpb24oKXtvbkNvcmtlZEZpbmlzaChfdGhpcyxzdGF0ZSl9fXZhciBhc3luY1dyaXRlPSFwcm9jZXNzLmJyb3dzZXImJlsidjAuMTAiLCJ2MC45LiJdLmluZGV4T2YocHJvY2Vzcy52ZXJzaW9uLnNsaWNlKDAsNSkpPi0xP3NldEltbWVkaWF0ZTpwbmEubmV4dFRpY2s7dmFyIER1cGxleDtXcml0YWJsZS5Xcml0YWJsZVN0YXRlPVdyaXRhYmxlU3RhdGU7dmFyIHV0aWw9cmVxdWlyZSgiY29yZS11dGlsLWlzIik7dXRpbC5pbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBpbnRlcm5hbFV0aWw9e2RlcHJlY2F0ZTpyZXF1aXJlKCJ1dGlsLWRlcHJlY2F0ZSIpfTt2YXIgU3RyZWFtPXJlcXVpcmUoIi4vaW50ZXJuYWwvc3RyZWFtcy9zdHJlYW0iKTt2YXIgQnVmZmVyPXJlcXVpcmUoInNhZmUtYnVmZmVyIikuQnVmZmVyO3ZhciBPdXJVaW50OEFycmF5PWdsb2JhbC5VaW50OEFycmF5fHxmdW5jdGlvbigpe307ZnVuY3Rpb24gX3VpbnQ4QXJyYXlUb0J1ZmZlcihjaHVuayl7cmV0dXJuIEJ1ZmZlci5mcm9tKGNodW5rKX1mdW5jdGlvbiBfaXNVaW50OEFycmF5KG9iail7cmV0dXJuIEJ1ZmZlci5pc0J1ZmZlcihvYmopfHxvYmogaW5zdGFuY2VvZiBPdXJVaW50OEFycmF5fXZhciBkZXN0cm95SW1wbD1yZXF1aXJlKCIuL2ludGVybmFsL3N0cmVhbXMvZGVzdHJveSIpO3V0aWwuaW5oZXJpdHMoV3JpdGFibGUsU3RyZWFtKTtmdW5jdGlvbiBub3AoKXt9ZnVuY3Rpb24gV3JpdGFibGVTdGF0ZShvcHRpb25zLHN0cmVhbSl7RHVwbGV4PUR1cGxleHx8cmVxdWlyZSgiLi9fc3RyZWFtX2R1cGxleCIpO29wdGlvbnM9b3B0aW9uc3x8e307dmFyIGlzRHVwbGV4PXN0cmVhbSBpbnN0YW5jZW9mIER1cGxleDt0aGlzLm9iamVjdE1vZGU9ISFvcHRpb25zLm9iamVjdE1vZGU7aWYoaXNEdXBsZXgpdGhpcy5vYmplY3RNb2RlPXRoaXMub2JqZWN0TW9kZXx8ISFvcHRpb25zLndyaXRhYmxlT2JqZWN0TW9kZTt2YXIgaHdtPW9wdGlvbnMuaGlnaFdhdGVyTWFyazt2YXIgd3JpdGFibGVId209b3B0aW9ucy53cml0YWJsZUhpZ2hXYXRlck1hcms7dmFyIGRlZmF1bHRId209dGhpcy5vYmplY3RNb2RlPzE2OjE2KjEwMjQ7aWYoaHdtfHxod209PT0wKXRoaXMuaGlnaFdhdGVyTWFyaz1od207ZWxzZSBpZihpc0R1cGxleCYmKHdyaXRhYmxlSHdtfHx3cml0YWJsZUh3bT09PTApKXRoaXMuaGlnaFdhdGVyTWFyaz13cml0YWJsZUh3bTtlbHNlIHRoaXMuaGlnaFdhdGVyTWFyaz1kZWZhdWx0SHdtO3RoaXMuaGlnaFdhdGVyTWFyaz1NYXRoLmZsb29yKHRoaXMuaGlnaFdhdGVyTWFyayk7dGhpcy5maW5hbENhbGxlZD1mYWxzZTt0aGlzLm5lZWREcmFpbj1mYWxzZTt0aGlzLmVuZGluZz1mYWxzZTt0aGlzLmVuZGVkPWZhbHNlO3RoaXMuZmluaXNoZWQ9ZmFsc2U7dGhpcy5kZXN0cm95ZWQ9ZmFsc2U7dmFyIG5vRGVjb2RlPW9wdGlvbnMuZGVjb2RlU3RyaW5ncz09PWZhbHNlO3RoaXMuZGVjb2RlU3RyaW5ncz0hbm9EZWNvZGU7dGhpcy5kZWZhdWx0RW5jb2Rpbmc9b3B0aW9ucy5kZWZhdWx0RW5jb2Rpbmd8fCJ1dGY4Ijt0aGlzLmxlbmd0aD0wO3RoaXMud3JpdGluZz1mYWxzZTt0aGlzLmNvcmtlZD0wO3RoaXMuc3luYz10cnVlO3RoaXMuYnVmZmVyUHJvY2Vzc2luZz1mYWxzZTt0aGlzLm9ud3JpdGU9ZnVuY3Rpb24oZXIpe29ud3JpdGUoc3RyZWFtLGVyKX07dGhpcy53cml0ZWNiPW51bGw7dGhpcy53cml0ZWxlbj0wO3RoaXMuYnVmZmVyZWRSZXF1ZXN0PW51bGw7dGhpcy5sYXN0QnVmZmVyZWRSZXF1ZXN0PW51bGw7dGhpcy5wZW5kaW5nY2I9MDt0aGlzLnByZWZpbmlzaGVkPWZhbHNlO3RoaXMuZXJyb3JFbWl0dGVkPWZhbHNlO3RoaXMuYnVmZmVyZWRSZXF1ZXN0Q291bnQ9MDt0aGlzLmNvcmtlZFJlcXVlc3RzRnJlZT1uZXcgQ29ya2VkUmVxdWVzdCh0aGlzKX1Xcml0YWJsZVN0YXRlLnByb3RvdHlwZS5nZXRCdWZmZXI9ZnVuY3Rpb24gZ2V0QnVmZmVyKCl7dmFyIGN1cnJlbnQ9dGhpcy5idWZmZXJlZFJlcXVlc3Q7dmFyIG91dD1bXTt3aGlsZShjdXJyZW50KXtvdXQucHVzaChjdXJyZW50KTtjdXJyZW50PWN1cnJlbnQubmV4dH1yZXR1cm4gb3V0fTsoZnVuY3Rpb24oKXt0cnl7T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRhYmxlU3RhdGUucHJvdG90eXBlLCJidWZmZXIiLHtnZXQ6aW50ZXJuYWxVdGlsLmRlcHJlY2F0ZShmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldEJ1ZmZlcigpfSwiX3dyaXRhYmxlU3RhdGUuYnVmZmVyIGlzIGRlcHJlY2F0ZWQuIFVzZSBfd3JpdGFibGVTdGF0ZS5nZXRCdWZmZXIgIisiaW5zdGVhZC4iLCJERVAwMDAzIil9KX1jYXRjaChfKXt9fSkoKTt2YXIgcmVhbEhhc0luc3RhbmNlO2lmKHR5cGVvZiBTeW1ib2w9PT0iZnVuY3Rpb24iJiZTeW1ib2wuaGFzSW5zdGFuY2UmJnR5cGVvZiBGdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXT09PSJmdW5jdGlvbiIpe3JlYWxIYXNJbnN0YW5jZT1GdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXTtPYmplY3QuZGVmaW5lUHJvcGVydHkoV3JpdGFibGUsU3ltYm9sLmhhc0luc3RhbmNlLHt2YWx1ZTpmdW5jdGlvbihvYmplY3Qpe2lmKHJlYWxIYXNJbnN0YW5jZS5jYWxsKHRoaXMsb2JqZWN0KSlyZXR1cm4gdHJ1ZTtpZih0aGlzIT09V3JpdGFibGUpcmV0dXJuIGZhbHNlO3JldHVybiBvYmplY3QmJm9iamVjdC5fd3JpdGFibGVTdGF0ZSBpbnN0YW5jZW9mIFdyaXRhYmxlU3RhdGV9fSl9ZWxzZXtyZWFsSGFzSW5zdGFuY2U9ZnVuY3Rpb24ob2JqZWN0KXtyZXR1cm4gb2JqZWN0IGluc3RhbmNlb2YgdGhpc319ZnVuY3Rpb24gV3JpdGFibGUob3B0aW9ucyl7RHVwbGV4PUR1cGxleHx8cmVxdWlyZSgiLi9fc3RyZWFtX2R1cGxleCIpO2lmKCFyZWFsSGFzSW5zdGFuY2UuY2FsbChXcml0YWJsZSx0aGlzKSYmISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSl7cmV0dXJuIG5ldyBXcml0YWJsZShvcHRpb25zKX10aGlzLl93cml0YWJsZVN0YXRlPW5ldyBXcml0YWJsZVN0YXRlKG9wdGlvbnMsdGhpcyk7dGhpcy53cml0YWJsZT10cnVlO2lmKG9wdGlvbnMpe2lmKHR5cGVvZiBvcHRpb25zLndyaXRlPT09ImZ1bmN0aW9uIil0aGlzLl93cml0ZT1vcHRpb25zLndyaXRlO2lmKHR5cGVvZiBvcHRpb25zLndyaXRldj09PSJmdW5jdGlvbiIpdGhpcy5fd3JpdGV2PW9wdGlvbnMud3JpdGV2O2lmKHR5cGVvZiBvcHRpb25zLmRlc3Ryb3k9PT0iZnVuY3Rpb24iKXRoaXMuX2Rlc3Ryb3k9b3B0aW9ucy5kZXN0cm95O2lmKHR5cGVvZiBvcHRpb25zLmZpbmFsPT09ImZ1bmN0aW9uIil0aGlzLl9maW5hbD1vcHRpb25zLmZpbmFsfVN0cmVhbS5jYWxsKHRoaXMpfVdyaXRhYmxlLnByb3RvdHlwZS5waXBlPWZ1bmN0aW9uKCl7dGhpcy5lbWl0KCJlcnJvciIsbmV3IEVycm9yKCJDYW5ub3QgcGlwZSwgbm90IHJlYWRhYmxlIikpfTtmdW5jdGlvbiB3cml0ZUFmdGVyRW5kKHN0cmVhbSxjYil7dmFyIGVyPW5ldyBFcnJvcigid3JpdGUgYWZ0ZXIgZW5kIik7c3RyZWFtLmVtaXQoImVycm9yIixlcik7cG5hLm5leHRUaWNrKGNiLGVyKX1mdW5jdGlvbiB2YWxpZENodW5rKHN0cmVhbSxzdGF0ZSxjaHVuayxjYil7dmFyIHZhbGlkPXRydWU7dmFyIGVyPWZhbHNlO2lmKGNodW5rPT09bnVsbCl7ZXI9bmV3IFR5cGVFcnJvcigiTWF5IG5vdCB3cml0ZSBudWxsIHZhbHVlcyB0byBzdHJlYW0iKX1lbHNlIGlmKHR5cGVvZiBjaHVuayE9PSJzdHJpbmciJiZjaHVuayE9PXVuZGVmaW5lZCYmIXN0YXRlLm9iamVjdE1vZGUpe2VyPW5ldyBUeXBlRXJyb3IoIkludmFsaWQgbm9uLXN0cmluZy9idWZmZXIgY2h1bmsiKX1pZihlcil7c3RyZWFtLmVtaXQoImVycm9yIixlcik7cG5hLm5leHRUaWNrKGNiLGVyKTt2YWxpZD1mYWxzZX1yZXR1cm4gdmFsaWR9V3JpdGFibGUucHJvdG90eXBlLndyaXRlPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNiKXt2YXIgc3RhdGU9dGhpcy5fd3JpdGFibGVTdGF0ZTt2YXIgcmV0PWZhbHNlO3ZhciBpc0J1Zj0hc3RhdGUub2JqZWN0TW9kZSYmX2lzVWludDhBcnJheShjaHVuayk7aWYoaXNCdWYmJiFCdWZmZXIuaXNCdWZmZXIoY2h1bmspKXtjaHVuaz1fdWludDhBcnJheVRvQnVmZmVyKGNodW5rKX1pZih0eXBlb2YgZW5jb2Rpbmc9PT0iZnVuY3Rpb24iKXtjYj1lbmNvZGluZztlbmNvZGluZz1udWxsfWlmKGlzQnVmKWVuY29kaW5nPSJidWZmZXIiO2Vsc2UgaWYoIWVuY29kaW5nKWVuY29kaW5nPXN0YXRlLmRlZmF1bHRFbmNvZGluZztpZih0eXBlb2YgY2IhPT0iZnVuY3Rpb24iKWNiPW5vcDtpZihzdGF0ZS5lbmRlZCl3cml0ZUFmdGVyRW5kKHRoaXMsY2IpO2Vsc2UgaWYoaXNCdWZ8fHZhbGlkQ2h1bmsodGhpcyxzdGF0ZSxjaHVuayxjYikpe3N0YXRlLnBlbmRpbmdjYisrO3JldD13cml0ZU9yQnVmZmVyKHRoaXMsc3RhdGUsaXNCdWYsY2h1bmssZW5jb2RpbmcsY2IpfXJldHVybiByZXR9O1dyaXRhYmxlLnByb3RvdHlwZS5jb3JrPWZ1bmN0aW9uKCl7dmFyIHN0YXRlPXRoaXMuX3dyaXRhYmxlU3RhdGU7c3RhdGUuY29ya2VkKyt9O1dyaXRhYmxlLnByb3RvdHlwZS51bmNvcms9ZnVuY3Rpb24oKXt2YXIgc3RhdGU9dGhpcy5fd3JpdGFibGVTdGF0ZTtpZihzdGF0ZS5jb3JrZWQpe3N0YXRlLmNvcmtlZC0tO2lmKCFzdGF0ZS53cml0aW5nJiYhc3RhdGUuY29ya2VkJiYhc3RhdGUuZmluaXNoZWQmJiFzdGF0ZS5idWZmZXJQcm9jZXNzaW5nJiZzdGF0ZS5idWZmZXJlZFJlcXVlc3QpY2xlYXJCdWZmZXIodGhpcyxzdGF0ZSl9fTtXcml0YWJsZS5wcm90b3R5cGUuc2V0RGVmYXVsdEVuY29kaW5nPWZ1bmN0aW9uIHNldERlZmF1bHRFbmNvZGluZyhlbmNvZGluZyl7aWYodHlwZW9mIGVuY29kaW5nPT09InN0cmluZyIpZW5jb2Rpbmc9ZW5jb2RpbmcudG9Mb3dlckNhc2UoKTtpZighKFsiaGV4IiwidXRmOCIsInV0Zi04IiwiYXNjaWkiLCJiaW5hcnkiLCJiYXNlNjQiLCJ1Y3MyIiwidWNzLTIiLCJ1dGYxNmxlIiwidXRmLTE2bGUiLCJyYXciXS5pbmRleE9mKChlbmNvZGluZysiIikudG9Mb3dlckNhc2UoKSk+LTEpKXRocm93IG5ldyBUeXBlRXJyb3IoIlVua25vd24gZW5jb2Rpbmc6ICIrZW5jb2RpbmcpO3RoaXMuX3dyaXRhYmxlU3RhdGUuZGVmYXVsdEVuY29kaW5nPWVuY29kaW5nO3JldHVybiB0aGlzfTtmdW5jdGlvbiBkZWNvZGVDaHVuayhzdGF0ZSxjaHVuayxlbmNvZGluZyl7aWYoIXN0YXRlLm9iamVjdE1vZGUmJnN0YXRlLmRlY29kZVN0cmluZ3MhPT1mYWxzZSYmdHlwZW9mIGNodW5rPT09InN0cmluZyIpe2NodW5rPUJ1ZmZlci5mcm9tKGNodW5rLGVuY29kaW5nKX1yZXR1cm4gY2h1bmt9T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRhYmxlLnByb3RvdHlwZSwid3JpdGFibGVIaWdoV2F0ZXJNYXJrIix7ZW51bWVyYWJsZTpmYWxzZSxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fd3JpdGFibGVTdGF0ZS5oaWdoV2F0ZXJNYXJrfX0pO2Z1bmN0aW9uIHdyaXRlT3JCdWZmZXIoc3RyZWFtLHN0YXRlLGlzQnVmLGNodW5rLGVuY29kaW5nLGNiKXtpZighaXNCdWYpe3ZhciBuZXdDaHVuaz1kZWNvZGVDaHVuayhzdGF0ZSxjaHVuayxlbmNvZGluZyk7aWYoY2h1bmshPT1uZXdDaHVuayl7aXNCdWY9dHJ1ZTtlbmNvZGluZz0iYnVmZmVyIjtjaHVuaz1uZXdDaHVua319dmFyIGxlbj1zdGF0ZS5vYmplY3RNb2RlPzE6Y2h1bmsubGVuZ3RoO3N0YXRlLmxlbmd0aCs9bGVuO3ZhciByZXQ9c3RhdGUubGVuZ3RoPHN0YXRlLmhpZ2hXYXRlck1hcms7aWYoIXJldClzdGF0ZS5uZWVkRHJhaW49dHJ1ZTtpZihzdGF0ZS53cml0aW5nfHxzdGF0ZS5jb3JrZWQpe3ZhciBsYXN0PXN0YXRlLmxhc3RCdWZmZXJlZFJlcXVlc3Q7c3RhdGUubGFzdEJ1ZmZlcmVkUmVxdWVzdD17Y2h1bms6Y2h1bmssZW5jb2Rpbmc6ZW5jb2RpbmcsaXNCdWY6aXNCdWYsY2FsbGJhY2s6Y2IsbmV4dDpudWxsfTtpZihsYXN0KXtsYXN0Lm5leHQ9c3RhdGUubGFzdEJ1ZmZlcmVkUmVxdWVzdH1lbHNle3N0YXRlLmJ1ZmZlcmVkUmVxdWVzdD1zdGF0ZS5sYXN0QnVmZmVyZWRSZXF1ZXN0fXN0YXRlLmJ1ZmZlcmVkUmVxdWVzdENvdW50Kz0xfWVsc2V7ZG9Xcml0ZShzdHJlYW0sc3RhdGUsZmFsc2UsbGVuLGNodW5rLGVuY29kaW5nLGNiKX1yZXR1cm4gcmV0fWZ1bmN0aW9uIGRvV3JpdGUoc3RyZWFtLHN0YXRlLHdyaXRldixsZW4sY2h1bmssZW5jb2RpbmcsY2Ipe3N0YXRlLndyaXRlbGVuPWxlbjtzdGF0ZS53cml0ZWNiPWNiO3N0YXRlLndyaXRpbmc9dHJ1ZTtzdGF0ZS5zeW5jPXRydWU7aWYod3JpdGV2KXN0cmVhbS5fd3JpdGV2KGNodW5rLHN0YXRlLm9ud3JpdGUpO2Vsc2Ugc3RyZWFtLl93cml0ZShjaHVuayxlbmNvZGluZyxzdGF0ZS5vbndyaXRlKTtzdGF0ZS5zeW5jPWZhbHNlfWZ1bmN0aW9uIG9ud3JpdGVFcnJvcihzdHJlYW0sc3RhdGUsc3luYyxlcixjYil7LS1zdGF0ZS5wZW5kaW5nY2I7aWYoc3luYyl7cG5hLm5leHRUaWNrKGNiLGVyKTtwbmEubmV4dFRpY2soZmluaXNoTWF5YmUsc3RyZWFtLHN0YXRlKTtzdHJlYW0uX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkPXRydWU7c3RyZWFtLmVtaXQoImVycm9yIixlcil9ZWxzZXtjYihlcik7c3RyZWFtLl93cml0YWJsZVN0YXRlLmVycm9yRW1pdHRlZD10cnVlO3N0cmVhbS5lbWl0KCJlcnJvciIsZXIpO2ZpbmlzaE1heWJlKHN0cmVhbSxzdGF0ZSl9fWZ1bmN0aW9uIG9ud3JpdGVTdGF0ZVVwZGF0ZShzdGF0ZSl7c3RhdGUud3JpdGluZz1mYWxzZTtzdGF0ZS53cml0ZWNiPW51bGw7c3RhdGUubGVuZ3RoLT1zdGF0ZS53cml0ZWxlbjtzdGF0ZS53cml0ZWxlbj0wfWZ1bmN0aW9uIG9ud3JpdGUoc3RyZWFtLGVyKXt2YXIgc3RhdGU9c3RyZWFtLl93cml0YWJsZVN0YXRlO3ZhciBzeW5jPXN0YXRlLnN5bmM7dmFyIGNiPXN0YXRlLndyaXRlY2I7b253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKTtpZihlcilvbndyaXRlRXJyb3Ioc3RyZWFtLHN0YXRlLHN5bmMsZXIsY2IpO2Vsc2V7dmFyIGZpbmlzaGVkPW5lZWRGaW5pc2goc3RhdGUpO2lmKCFmaW5pc2hlZCYmIXN0YXRlLmNvcmtlZCYmIXN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcmJnN0YXRlLmJ1ZmZlcmVkUmVxdWVzdCl7Y2xlYXJCdWZmZXIoc3RyZWFtLHN0YXRlKX1pZihzeW5jKXthc3luY1dyaXRlKGFmdGVyV3JpdGUsc3RyZWFtLHN0YXRlLGZpbmlzaGVkLGNiKX1lbHNle2FmdGVyV3JpdGUoc3RyZWFtLHN0YXRlLGZpbmlzaGVkLGNiKX19fWZ1bmN0aW9uIGFmdGVyV3JpdGUoc3RyZWFtLHN0YXRlLGZpbmlzaGVkLGNiKXtpZighZmluaXNoZWQpb253cml0ZURyYWluKHN0cmVhbSxzdGF0ZSk7c3RhdGUucGVuZGluZ2NiLS07Y2IoKTtmaW5pc2hNYXliZShzdHJlYW0sc3RhdGUpfWZ1bmN0aW9uIG9ud3JpdGVEcmFpbihzdHJlYW0sc3RhdGUpe2lmKHN0YXRlLmxlbmd0aD09PTAmJnN0YXRlLm5lZWREcmFpbil7c3RhdGUubmVlZERyYWluPWZhbHNlO3N0cmVhbS5lbWl0KCJkcmFpbiIpfX1mdW5jdGlvbiBjbGVhckJ1ZmZlcihzdHJlYW0sc3RhdGUpe3N0YXRlLmJ1ZmZlclByb2Nlc3Npbmc9dHJ1ZTt2YXIgZW50cnk9c3RhdGUuYnVmZmVyZWRSZXF1ZXN0O2lmKHN0cmVhbS5fd3JpdGV2JiZlbnRyeSYmZW50cnkubmV4dCl7dmFyIGw9c3RhdGUuYnVmZmVyZWRSZXF1ZXN0Q291bnQ7dmFyIGJ1ZmZlcj1uZXcgQXJyYXkobCk7dmFyIGhvbGRlcj1zdGF0ZS5jb3JrZWRSZXF1ZXN0c0ZyZWU7aG9sZGVyLmVudHJ5PWVudHJ5O3ZhciBjb3VudD0wO3ZhciBhbGxCdWZmZXJzPXRydWU7d2hpbGUoZW50cnkpe2J1ZmZlcltjb3VudF09ZW50cnk7aWYoIWVudHJ5LmlzQnVmKWFsbEJ1ZmZlcnM9ZmFsc2U7ZW50cnk9ZW50cnkubmV4dDtjb3VudCs9MX1idWZmZXIuYWxsQnVmZmVycz1hbGxCdWZmZXJzO2RvV3JpdGUoc3RyZWFtLHN0YXRlLHRydWUsc3RhdGUubGVuZ3RoLGJ1ZmZlciwiIixob2xkZXIuZmluaXNoKTtzdGF0ZS5wZW5kaW5nY2IrKztzdGF0ZS5sYXN0QnVmZmVyZWRSZXF1ZXN0PW51bGw7aWYoaG9sZGVyLm5leHQpe3N0YXRlLmNvcmtlZFJlcXVlc3RzRnJlZT1ob2xkZXIubmV4dDtob2xkZXIubmV4dD1udWxsfWVsc2V7c3RhdGUuY29ya2VkUmVxdWVzdHNGcmVlPW5ldyBDb3JrZWRSZXF1ZXN0KHN0YXRlKX1zdGF0ZS5idWZmZXJlZFJlcXVlc3RDb3VudD0wfWVsc2V7d2hpbGUoZW50cnkpe3ZhciBjaHVuaz1lbnRyeS5jaHVuazt2YXIgZW5jb2Rpbmc9ZW50cnkuZW5jb2Rpbmc7dmFyIGNiPWVudHJ5LmNhbGxiYWNrO3ZhciBsZW49c3RhdGUub2JqZWN0TW9kZT8xOmNodW5rLmxlbmd0aDtkb1dyaXRlKHN0cmVhbSxzdGF0ZSxmYWxzZSxsZW4sY2h1bmssZW5jb2RpbmcsY2IpO2VudHJ5PWVudHJ5Lm5leHQ7c3RhdGUuYnVmZmVyZWRSZXF1ZXN0Q291bnQtLTtpZihzdGF0ZS53cml0aW5nKXticmVha319aWYoZW50cnk9PT1udWxsKXN0YXRlLmxhc3RCdWZmZXJlZFJlcXVlc3Q9bnVsbH1zdGF0ZS5idWZmZXJlZFJlcXVlc3Q9ZW50cnk7c3RhdGUuYnVmZmVyUHJvY2Vzc2luZz1mYWxzZX1Xcml0YWJsZS5wcm90b3R5cGUuX3dyaXRlPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNiKXtjYihuZXcgRXJyb3IoIl93cml0ZSgpIGlzIG5vdCBpbXBsZW1lbnRlZCIpKX07V3JpdGFibGUucHJvdG90eXBlLl93cml0ZXY9bnVsbDtXcml0YWJsZS5wcm90b3R5cGUuZW5kPWZ1bmN0aW9uKGNodW5rLGVuY29kaW5nLGNiKXt2YXIgc3RhdGU9dGhpcy5fd3JpdGFibGVTdGF0ZTtpZih0eXBlb2YgY2h1bms9PT0iZnVuY3Rpb24iKXtjYj1jaHVuaztjaHVuaz1udWxsO2VuY29kaW5nPW51bGx9ZWxzZSBpZih0eXBlb2YgZW5jb2Rpbmc9PT0iZnVuY3Rpb24iKXtjYj1lbmNvZGluZztlbmNvZGluZz1udWxsfWlmKGNodW5rIT09bnVsbCYmY2h1bmshPT11bmRlZmluZWQpdGhpcy53cml0ZShjaHVuayxlbmNvZGluZyk7aWYoc3RhdGUuY29ya2VkKXtzdGF0ZS5jb3JrZWQ9MTt0aGlzLnVuY29yaygpfWlmKCFzdGF0ZS5lbmRpbmcmJiFzdGF0ZS5maW5pc2hlZCllbmRXcml0YWJsZSh0aGlzLHN0YXRlLGNiKX07ZnVuY3Rpb24gbmVlZEZpbmlzaChzdGF0ZSl7cmV0dXJuIHN0YXRlLmVuZGluZyYmc3RhdGUubGVuZ3RoPT09MCYmc3RhdGUuYnVmZmVyZWRSZXF1ZXN0PT09bnVsbCYmIXN0YXRlLmZpbmlzaGVkJiYhc3RhdGUud3JpdGluZ31mdW5jdGlvbiBjYWxsRmluYWwoc3RyZWFtLHN0YXRlKXtzdHJlYW0uX2ZpbmFsKGZ1bmN0aW9uKGVycil7c3RhdGUucGVuZGluZ2NiLS07aWYoZXJyKXtzdHJlYW0uZW1pdCgiZXJyb3IiLGVycil9c3RhdGUucHJlZmluaXNoZWQ9dHJ1ZTtzdHJlYW0uZW1pdCgicHJlZmluaXNoIik7ZmluaXNoTWF5YmUoc3RyZWFtLHN0YXRlKX0pfWZ1bmN0aW9uIHByZWZpbmlzaChzdHJlYW0sc3RhdGUpe2lmKCFzdGF0ZS5wcmVmaW5pc2hlZCYmIXN0YXRlLmZpbmFsQ2FsbGVkKXtpZih0eXBlb2Ygc3RyZWFtLl9maW5hbD09PSJmdW5jdGlvbiIpe3N0YXRlLnBlbmRpbmdjYisrO3N0YXRlLmZpbmFsQ2FsbGVkPXRydWU7cG5hLm5leHRUaWNrKGNhbGxGaW5hbCxzdHJlYW0sc3RhdGUpfWVsc2V7c3RhdGUucHJlZmluaXNoZWQ9dHJ1ZTtzdHJlYW0uZW1pdCgicHJlZmluaXNoIil9fX1mdW5jdGlvbiBmaW5pc2hNYXliZShzdHJlYW0sc3RhdGUpe3ZhciBuZWVkPW5lZWRGaW5pc2goc3RhdGUpO2lmKG5lZWQpe3ByZWZpbmlzaChzdHJlYW0sc3RhdGUpO2lmKHN0YXRlLnBlbmRpbmdjYj09PTApe3N0YXRlLmZpbmlzaGVkPXRydWU7c3RyZWFtLmVtaXQoImZpbmlzaCIpfX1yZXR1cm4gbmVlZH1mdW5jdGlvbiBlbmRXcml0YWJsZShzdHJlYW0sc3RhdGUsY2Ipe3N0YXRlLmVuZGluZz10cnVlO2ZpbmlzaE1heWJlKHN0cmVhbSxzdGF0ZSk7aWYoY2Ipe2lmKHN0YXRlLmZpbmlzaGVkKXBuYS5uZXh0VGljayhjYik7ZWxzZSBzdHJlYW0ub25jZSgiZmluaXNoIixjYil9c3RhdGUuZW5kZWQ9dHJ1ZTtzdHJlYW0ud3JpdGFibGU9ZmFsc2V9ZnVuY3Rpb24gb25Db3JrZWRGaW5pc2goY29ya1JlcSxzdGF0ZSxlcnIpe3ZhciBlbnRyeT1jb3JrUmVxLmVudHJ5O2NvcmtSZXEuZW50cnk9bnVsbDt3aGlsZShlbnRyeSl7dmFyIGNiPWVudHJ5LmNhbGxiYWNrO3N0YXRlLnBlbmRpbmdjYi0tO2NiKGVycik7ZW50cnk9ZW50cnkubmV4dH1pZihzdGF0ZS5jb3JrZWRSZXF1ZXN0c0ZyZWUpe3N0YXRlLmNvcmtlZFJlcXVlc3RzRnJlZS5uZXh0PWNvcmtSZXF9ZWxzZXtzdGF0ZS5jb3JrZWRSZXF1ZXN0c0ZyZWU9Y29ya1JlcX19T2JqZWN0LmRlZmluZVByb3BlcnR5KFdyaXRhYmxlLnByb3RvdHlwZSwiZGVzdHJveWVkIix7Z2V0OmZ1bmN0aW9uKCl7aWYodGhpcy5fd3JpdGFibGVTdGF0ZT09PXVuZGVmaW5lZCl7cmV0dXJuIGZhbHNlfXJldHVybiB0aGlzLl93cml0YWJsZVN0YXRlLmRlc3Ryb3llZH0sc2V0OmZ1bmN0aW9uKHZhbHVlKXtpZighdGhpcy5fd3JpdGFibGVTdGF0ZSl7cmV0dXJufXRoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkPXZhbHVlfX0pO1dyaXRhYmxlLnByb3RvdHlwZS5kZXN0cm95PWRlc3Ryb3lJbXBsLmRlc3Ryb3k7V3JpdGFibGUucHJvdG90eXBlLl91bmRlc3Ryb3k9ZGVzdHJveUltcGwudW5kZXN0cm95O1dyaXRhYmxlLnByb3RvdHlwZS5fZGVzdHJveT1mdW5jdGlvbihlcnIsY2Ipe3RoaXMuZW5kKCk7Y2IoZXJyKX19KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSx0eXBlb2YgZ2xvYmFsIT09InVuZGVmaW5lZCI/Z2xvYmFsOnR5cGVvZiBzZWxmIT09InVuZGVmaW5lZCI/c2VsZjp0eXBlb2Ygd2luZG93IT09InVuZGVmaW5lZCI/d2luZG93Ont9LHJlcXVpcmUoInRpbWVycyIpLnNldEltbWVkaWF0ZSl9LHsiLi9fc3RyZWFtX2R1cGxleCI6NjgsIi4vaW50ZXJuYWwvc3RyZWFtcy9kZXN0cm95Ijo3NCwiLi9pbnRlcm5hbC9zdHJlYW1zL3N0cmVhbSI6NzUsX3Byb2Nlc3M6NjYsImNvcmUtdXRpbC1pcyI6MzAsaW5oZXJpdHM6MzYsInByb2Nlc3MtbmV4dGljay1hcmdzIjo2NSwic2FmZS1idWZmZXIiOjc2LHRpbWVyczoxMDUsInV0aWwtZGVwcmVjYXRlIjoxMDZ9XSw3MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO2Z1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSxDb25zdHJ1Y3Rvcil7aWYoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSl7dGhyb3cgbmV3IFR5cGVFcnJvcigiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uIil9fXZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIHV0aWw9cmVxdWlyZSgidXRpbCIpO2Z1bmN0aW9uIGNvcHlCdWZmZXIoc3JjLHRhcmdldCxvZmZzZXQpe3NyYy5jb3B5KHRhcmdldCxvZmZzZXQpfW1vZHVsZS5leHBvcnRzPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gQnVmZmVyTGlzdCgpe19jbGFzc0NhbGxDaGVjayh0aGlzLEJ1ZmZlckxpc3QpO3RoaXMuaGVhZD1udWxsO3RoaXMudGFpbD1udWxsO3RoaXMubGVuZ3RoPTB9QnVmZmVyTGlzdC5wcm90b3R5cGUucHVzaD1mdW5jdGlvbiBwdXNoKHYpe3ZhciBlbnRyeT17ZGF0YTp2LG5leHQ6bnVsbH07aWYodGhpcy5sZW5ndGg+MCl0aGlzLnRhaWwubmV4dD1lbnRyeTtlbHNlIHRoaXMuaGVhZD1lbnRyeTt0aGlzLnRhaWw9ZW50cnk7Kyt0aGlzLmxlbmd0aH07QnVmZmVyTGlzdC5wcm90b3R5cGUudW5zaGlmdD1mdW5jdGlvbiB1bnNoaWZ0KHYpe3ZhciBlbnRyeT17ZGF0YTp2LG5leHQ6dGhpcy5oZWFkfTtpZih0aGlzLmxlbmd0aD09PTApdGhpcy50YWlsPWVudHJ5O3RoaXMuaGVhZD1lbnRyeTsrK3RoaXMubGVuZ3RofTtCdWZmZXJMaXN0LnByb3RvdHlwZS5zaGlmdD1mdW5jdGlvbiBzaGlmdCgpe2lmKHRoaXMubGVuZ3RoPT09MClyZXR1cm47dmFyIHJldD10aGlzLmhlYWQuZGF0YTtpZih0aGlzLmxlbmd0aD09PTEpdGhpcy5oZWFkPXRoaXMudGFpbD1udWxsO2Vsc2UgdGhpcy5oZWFkPXRoaXMuaGVhZC5uZXh0Oy0tdGhpcy5sZW5ndGg7cmV0dXJuIHJldH07QnVmZmVyTGlzdC5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24gY2xlYXIoKXt0aGlzLmhlYWQ9dGhpcy50YWlsPW51bGw7dGhpcy5sZW5ndGg9MH07QnVmZmVyTGlzdC5wcm90b3R5cGUuam9pbj1mdW5jdGlvbiBqb2luKHMpe2lmKHRoaXMubGVuZ3RoPT09MClyZXR1cm4iIjt2YXIgcD10aGlzLmhlYWQ7dmFyIHJldD0iIitwLmRhdGE7d2hpbGUocD1wLm5leHQpe3JldCs9cytwLmRhdGF9cmV0dXJuIHJldH07QnVmZmVyTGlzdC5wcm90b3R5cGUuY29uY2F0PWZ1bmN0aW9uIGNvbmNhdChuKXtpZih0aGlzLmxlbmd0aD09PTApcmV0dXJuIEJ1ZmZlci5hbGxvYygwKTtpZih0aGlzLmxlbmd0aD09PTEpcmV0dXJuIHRoaXMuaGVhZC5kYXRhO3ZhciByZXQ9QnVmZmVyLmFsbG9jVW5zYWZlKG4+Pj4wKTt2YXIgcD10aGlzLmhlYWQ7dmFyIGk9MDt3aGlsZShwKXtjb3B5QnVmZmVyKHAuZGF0YSxyZXQsaSk7aSs9cC5kYXRhLmxlbmd0aDtwPXAubmV4dH1yZXR1cm4gcmV0fTtyZXR1cm4gQnVmZmVyTGlzdH0oKTtpZih1dGlsJiZ1dGlsLmluc3BlY3QmJnV0aWwuaW5zcGVjdC5jdXN0b20pe21vZHVsZS5leHBvcnRzLnByb3RvdHlwZVt1dGlsLmluc3BlY3QuY3VzdG9tXT1mdW5jdGlvbigpe3ZhciBvYmo9dXRpbC5pbnNwZWN0KHtsZW5ndGg6dGhpcy5sZW5ndGh9KTtyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lKyIgIitvYmp9fX0seyJzYWZlLWJ1ZmZlciI6NzYsdXRpbDoyNn1dLDc0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIHBuYT1yZXF1aXJlKCJwcm9jZXNzLW5leHRpY2stYXJncyIpO2Z1bmN0aW9uIGRlc3Ryb3koZXJyLGNiKXt2YXIgX3RoaXM9dGhpczt2YXIgcmVhZGFibGVEZXN0cm95ZWQ9dGhpcy5fcmVhZGFibGVTdGF0ZSYmdGhpcy5fcmVhZGFibGVTdGF0ZS5kZXN0cm95ZWQ7dmFyIHdyaXRhYmxlRGVzdHJveWVkPXRoaXMuX3dyaXRhYmxlU3RhdGUmJnRoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkO2lmKHJlYWRhYmxlRGVzdHJveWVkfHx3cml0YWJsZURlc3Ryb3llZCl7aWYoY2Ipe2NiKGVycil9ZWxzZSBpZihlcnImJighdGhpcy5fd3JpdGFibGVTdGF0ZXx8IXRoaXMuX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkKSl7cG5hLm5leHRUaWNrKGVtaXRFcnJvck5ULHRoaXMsZXJyKX1yZXR1cm4gdGhpc31pZih0aGlzLl9yZWFkYWJsZVN0YXRlKXt0aGlzLl9yZWFkYWJsZVN0YXRlLmRlc3Ryb3llZD10cnVlfWlmKHRoaXMuX3dyaXRhYmxlU3RhdGUpe3RoaXMuX3dyaXRhYmxlU3RhdGUuZGVzdHJveWVkPXRydWV9dGhpcy5fZGVzdHJveShlcnJ8fG51bGwsZnVuY3Rpb24oZXJyKXtpZighY2ImJmVycil7cG5hLm5leHRUaWNrKGVtaXRFcnJvck5ULF90aGlzLGVycik7aWYoX3RoaXMuX3dyaXRhYmxlU3RhdGUpe190aGlzLl93cml0YWJsZVN0YXRlLmVycm9yRW1pdHRlZD10cnVlfX1lbHNlIGlmKGNiKXtjYihlcnIpfX0pO3JldHVybiB0aGlzfWZ1bmN0aW9uIHVuZGVzdHJveSgpe2lmKHRoaXMuX3JlYWRhYmxlU3RhdGUpe3RoaXMuX3JlYWRhYmxlU3RhdGUuZGVzdHJveWVkPWZhbHNlO3RoaXMuX3JlYWRhYmxlU3RhdGUucmVhZGluZz1mYWxzZTt0aGlzLl9yZWFkYWJsZVN0YXRlLmVuZGVkPWZhbHNlO3RoaXMuX3JlYWRhYmxlU3RhdGUuZW5kRW1pdHRlZD1mYWxzZX1pZih0aGlzLl93cml0YWJsZVN0YXRlKXt0aGlzLl93cml0YWJsZVN0YXRlLmRlc3Ryb3llZD1mYWxzZTt0aGlzLl93cml0YWJsZVN0YXRlLmVuZGVkPWZhbHNlO3RoaXMuX3dyaXRhYmxlU3RhdGUuZW5kaW5nPWZhbHNlO3RoaXMuX3dyaXRhYmxlU3RhdGUuZmluaXNoZWQ9ZmFsc2U7dGhpcy5fd3JpdGFibGVTdGF0ZS5lcnJvckVtaXR0ZWQ9ZmFsc2V9fWZ1bmN0aW9uIGVtaXRFcnJvck5UKHNlbGYsZXJyKXtzZWxmLmVtaXQoImVycm9yIixlcnIpfW1vZHVsZS5leHBvcnRzPXtkZXN0cm95OmRlc3Ryb3ksdW5kZXN0cm95OnVuZGVzdHJveX19LHsicHJvY2Vzcy1uZXh0aWNrLWFyZ3MiOjY1fV0sNzU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe21vZHVsZS5leHBvcnRzPXJlcXVpcmUoImV2ZW50cyIpLkV2ZW50RW1pdHRlcn0se2V2ZW50czozM31dLDc2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgYnVmZmVyPXJlcXVpcmUoImJ1ZmZlciIpO3ZhciBCdWZmZXI9YnVmZmVyLkJ1ZmZlcjtmdW5jdGlvbiBjb3B5UHJvcHMoc3JjLGRzdCl7Zm9yKHZhciBrZXkgaW4gc3JjKXtkc3Rba2V5XT1zcmNba2V5XX19aWYoQnVmZmVyLmZyb20mJkJ1ZmZlci5hbGxvYyYmQnVmZmVyLmFsbG9jVW5zYWZlJiZCdWZmZXIuYWxsb2NVbnNhZmVTbG93KXttb2R1bGUuZXhwb3J0cz1idWZmZXJ9ZWxzZXtjb3B5UHJvcHMoYnVmZmVyLGV4cG9ydHMpO2V4cG9ydHMuQnVmZmVyPVNhZmVCdWZmZXJ9ZnVuY3Rpb24gU2FmZUJ1ZmZlcihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe3JldHVybiBCdWZmZXIoYXJnLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKX1jb3B5UHJvcHMoQnVmZmVyLFNhZmVCdWZmZXIpO1NhZmVCdWZmZXIuZnJvbT1mdW5jdGlvbihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiBhcmc9PT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXIiKX1yZXR1cm4gQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl9O1NhZmVCdWZmZXIuYWxsb2M9ZnVuY3Rpb24oc2l6ZSxmaWxsLGVuY29kaW5nKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9dmFyIGJ1Zj1CdWZmZXIoc2l6ZSk7aWYoZmlsbCE9PXVuZGVmaW5lZCl7aWYodHlwZW9mIGVuY29kaW5nPT09InN0cmluZyIpe2J1Zi5maWxsKGZpbGwsZW5jb2RpbmcpfWVsc2V7YnVmLmZpbGwoZmlsbCl9fWVsc2V7YnVmLmZpbGwoMCl9cmV0dXJuIGJ1Zn07U2FmZUJ1ZmZlci5hbGxvY1Vuc2FmZT1mdW5jdGlvbihzaXplKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9cmV0dXJuIEJ1ZmZlcihzaXplKX07U2FmZUJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3c9ZnVuY3Rpb24oc2l6ZSl7aWYodHlwZW9mIHNpemUhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQXJndW1lbnQgbXVzdCBiZSBhIG51bWJlciIpfXJldHVybiBidWZmZXIuU2xvd0J1ZmZlcihzaXplKX19LHtidWZmZXI6Mjd9XSw3NzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9cmVxdWlyZSgiLi9yZWFkYWJsZSIpLlBhc3NUaHJvdWdofSx7Ii4vcmVhZGFibGUiOjc4fV0sNzg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2V4cG9ydHM9bW9kdWxlLmV4cG9ydHM9cmVxdWlyZSgiLi9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcyIpO2V4cG9ydHMuU3RyZWFtPWV4cG9ydHM7ZXhwb3J0cy5SZWFkYWJsZT1leHBvcnRzO2V4cG9ydHMuV3JpdGFibGU9cmVxdWlyZSgiLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcyIpO2V4cG9ydHMuRHVwbGV4PXJlcXVpcmUoIi4vbGliL19zdHJlYW1fZHVwbGV4LmpzIik7ZXhwb3J0cy5UcmFuc2Zvcm09cmVxdWlyZSgiLi9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiKTtleHBvcnRzLlBhc3NUaHJvdWdoPXJlcXVpcmUoIi4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMiKX0seyIuL2xpYi9fc3RyZWFtX2R1cGxleC5qcyI6NjgsIi4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMiOjY5LCIuL2xpYi9fc3RyZWFtX3JlYWRhYmxlLmpzIjo3MCwiLi9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiOjcxLCIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzIjo3Mn1dLDc5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24ocHJvY2Vzcyl7dmFyIFN0cmVhbT1yZXF1aXJlKCJzdHJlYW0iKTtpZihwcm9jZXNzLmVudi5SRUFEQUJMRV9TVFJFQU09PT0iZGlzYWJsZSImJlN0cmVhbSl7bW9kdWxlLmV4cG9ydHM9U3RyZWFtO2V4cG9ydHM9bW9kdWxlLmV4cG9ydHM9U3RyZWFtLlJlYWRhYmxlO2V4cG9ydHMuUmVhZGFibGU9U3RyZWFtLlJlYWRhYmxlO2V4cG9ydHMuV3JpdGFibGU9U3RyZWFtLldyaXRhYmxlO2V4cG9ydHMuRHVwbGV4PVN0cmVhbS5EdXBsZXg7ZXhwb3J0cy5UcmFuc2Zvcm09U3RyZWFtLlRyYW5zZm9ybTtleHBvcnRzLlBhc3NUaHJvdWdoPVN0cmVhbS5QYXNzVGhyb3VnaDtleHBvcnRzLlN0cmVhbT1TdHJlYW19ZWxzZXtleHBvcnRzPW1vZHVsZS5leHBvcnRzPXJlcXVpcmUoIi4vbGliL19zdHJlYW1fcmVhZGFibGUuanMiKTtleHBvcnRzLlN0cmVhbT1TdHJlYW18fGV4cG9ydHM7ZXhwb3J0cy5SZWFkYWJsZT1leHBvcnRzO2V4cG9ydHMuV3JpdGFibGU9cmVxdWlyZSgiLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcyIpO2V4cG9ydHMuRHVwbGV4PXJlcXVpcmUoIi4vbGliL19zdHJlYW1fZHVwbGV4LmpzIik7ZXhwb3J0cy5UcmFuc2Zvcm09cmVxdWlyZSgiLi9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiKTtleHBvcnRzLlBhc3NUaHJvdWdoPXJlcXVpcmUoIi4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMiKX19KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSl9LHsiLi9saWIvX3N0cmVhbV9kdXBsZXguanMiOjY4LCIuL2xpYi9fc3RyZWFtX3Bhc3N0aHJvdWdoLmpzIjo2OSwiLi9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcyI6NzAsIi4vbGliL19zdHJlYW1fdHJhbnNmb3JtLmpzIjo3MSwiLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcyI6NzIsX3Byb2Nlc3M6NjYsc3RyZWFtOjEwMn1dLDgwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXttb2R1bGUuZXhwb3J0cz1yZXF1aXJlKCIuL3JlYWRhYmxlIikuVHJhbnNmb3JtfSx7Ii4vcmVhZGFibGUiOjc4fV0sODE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihwcm9jZXNzKXt2YXIgU3RyZWFtPXJlcXVpcmUoInN0cmVhbSIpO3ZhciBXcml0YWJsZT1yZXF1aXJlKCIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzIik7aWYocHJvY2Vzcy5lbnYuUkVBREFCTEVfU1RSRUFNPT09ImRpc2FibGUiKXttb2R1bGUuZXhwb3J0cz1TdHJlYW0mJlN0cmVhbS5Xcml0YWJsZXx8V3JpdGFibGV9ZWxzZXttb2R1bGUuZXhwb3J0cz1Xcml0YWJsZX19KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSl9LHsiLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcyI6NzIsX3Byb2Nlc3M6NjYsc3RyZWFtOjEwMn1dLDgyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsidXNlIHN0cmljdCI7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJidWZmZXIiKS5CdWZmZXI7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIEhhc2hCYXNlPXJlcXVpcmUoImhhc2gtYmFzZSIpO3ZhciBBUlJBWTE2PW5ldyBBcnJheSgxNik7dmFyIHpsPVswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDExLDEyLDEzLDE0LDE1LDcsNCwxMywxLDEwLDYsMTUsMywxMiwwLDksNSwyLDE0LDExLDgsMywxMCwxNCw0LDksMTUsOCwxLDIsNywwLDYsMTMsMTEsNSwxMiwxLDksMTEsMTAsMCw4LDEyLDQsMTMsMyw3LDE1LDE0LDUsNiwyLDQsMCw1LDksNywxMiwyLDEwLDE0LDEsMyw4LDExLDYsMTUsMTNdO3ZhciB6cj1bNSwxNCw3LDAsOSwyLDExLDQsMTMsNiwxNSw4LDEsMTAsMywxMiw2LDExLDMsNywwLDEzLDUsMTAsMTQsMTUsOCwxMiw0LDksMSwyLDE1LDUsMSwzLDcsMTQsNiw5LDExLDgsMTIsMiwxMCwwLDQsMTMsOCw2LDQsMSwzLDExLDE1LDAsNSwxMiwyLDEzLDksNywxMCwxNCwxMiwxNSwxMCw0LDEsNSw4LDcsNiwyLDEzLDE0LDAsMyw5LDExXTt2YXIgc2w9WzExLDE0LDE1LDEyLDUsOCw3LDksMTEsMTMsMTQsMTUsNiw3LDksOCw3LDYsOCwxMywxMSw5LDcsMTUsNywxMiwxNSw5LDExLDcsMTMsMTIsMTEsMTMsNiw3LDE0LDksMTMsMTUsMTQsOCwxMyw2LDUsMTIsNyw1LDExLDEyLDE0LDE1LDE0LDE1LDksOCw5LDE0LDUsNiw4LDYsNSwxMiw5LDE1LDUsMTEsNiw4LDEzLDEyLDUsMTIsMTMsMTQsMTEsOCw1LDZdO3ZhciBzcj1bOCw5LDksMTEsMTMsMTUsMTUsNSw3LDcsOCwxMSwxNCwxNCwxMiw2LDksMTMsMTUsNywxMiw4LDksMTEsNyw3LDEyLDcsNiwxNSwxMywxMSw5LDcsMTUsMTEsOCw2LDYsMTQsMTIsMTMsNSwxNCwxMywxMyw3LDUsMTUsNSw4LDExLDE0LDE0LDYsMTQsNiw5LDEyLDksMTIsNSwxNSw4LDgsNSwxMiw5LDEyLDUsMTQsNiw4LDEzLDYsNSwxNSwxMywxMSwxMV07dmFyIGhsPVswLDE1MTg1MDAyNDksMTg1OTc3NTM5MywyNDAwOTU5NzA4LDI4NDA4NTM4MzhdO3ZhciBocj1bMTM1MjgyOTkyNiwxNTQ4NjAzNjg0LDE4MzYwNzI2OTEsMjA1Mzk5NDIxNywwXTtmdW5jdGlvbiBSSVBFTUQxNjAoKXtIYXNoQmFzZS5jYWxsKHRoaXMsNjQpO3RoaXMuX2E9MTczMjU4NDE5Mzt0aGlzLl9iPTQwMjMyMzM0MTc7dGhpcy5fYz0yNTYyMzgzMTAyO3RoaXMuX2Q9MjcxNzMzODc4O3RoaXMuX2U9MzI4NTM3NzUyMH1pbmhlcml0cyhSSVBFTUQxNjAsSGFzaEJhc2UpO1JJUEVNRDE2MC5wcm90b3R5cGUuX3VwZGF0ZT1mdW5jdGlvbigpe3ZhciB3b3Jkcz1BUlJBWTE2O2Zvcih2YXIgaj0wO2o8MTY7KytqKXdvcmRzW2pdPXRoaXMuX2Jsb2NrLnJlYWRJbnQzMkxFKGoqNCk7dmFyIGFsPXRoaXMuX2F8MDt2YXIgYmw9dGhpcy5fYnwwO3ZhciBjbD10aGlzLl9jfDA7dmFyIGRsPXRoaXMuX2R8MDt2YXIgZWw9dGhpcy5fZXwwO3ZhciBhcj10aGlzLl9hfDA7dmFyIGJyPXRoaXMuX2J8MDt2YXIgY3I9dGhpcy5fY3wwO3ZhciBkcj10aGlzLl9kfDA7dmFyIGVyPXRoaXMuX2V8MDtmb3IodmFyIGk9MDtpPDgwO2krPTEpe3ZhciB0bDt2YXIgdHI7aWYoaTwxNil7dGw9Zm4xKGFsLGJsLGNsLGRsLGVsLHdvcmRzW3psW2ldXSxobFswXSxzbFtpXSk7dHI9Zm41KGFyLGJyLGNyLGRyLGVyLHdvcmRzW3pyW2ldXSxoclswXSxzcltpXSl9ZWxzZSBpZihpPDMyKXt0bD1mbjIoYWwsYmwsY2wsZGwsZWwsd29yZHNbemxbaV1dLGhsWzFdLHNsW2ldKTt0cj1mbjQoYXIsYnIsY3IsZHIsZXIsd29yZHNbenJbaV1dLGhyWzFdLHNyW2ldKX1lbHNlIGlmKGk8NDgpe3RsPWZuMyhhbCxibCxjbCxkbCxlbCx3b3Jkc1t6bFtpXV0saGxbMl0sc2xbaV0pO3RyPWZuMyhhcixicixjcixkcixlcix3b3Jkc1t6cltpXV0saHJbMl0sc3JbaV0pfWVsc2UgaWYoaTw2NCl7dGw9Zm40KGFsLGJsLGNsLGRsLGVsLHdvcmRzW3psW2ldXSxobFszXSxzbFtpXSk7dHI9Zm4yKGFyLGJyLGNyLGRyLGVyLHdvcmRzW3pyW2ldXSxoclszXSxzcltpXSl9ZWxzZXt0bD1mbjUoYWwsYmwsY2wsZGwsZWwsd29yZHNbemxbaV1dLGhsWzRdLHNsW2ldKTt0cj1mbjEoYXIsYnIsY3IsZHIsZXIsd29yZHNbenJbaV1dLGhyWzRdLHNyW2ldKX1hbD1lbDtlbD1kbDtkbD1yb3RsKGNsLDEwKTtjbD1ibDtibD10bDthcj1lcjtlcj1kcjtkcj1yb3RsKGNyLDEwKTtjcj1icjticj10cn12YXIgdD10aGlzLl9iK2NsK2RyfDA7dGhpcy5fYj10aGlzLl9jK2RsK2VyfDA7dGhpcy5fYz10aGlzLl9kK2VsK2FyfDA7dGhpcy5fZD10aGlzLl9lK2FsK2JyfDA7dGhpcy5fZT10aGlzLl9hK2JsK2NyfDA7dGhpcy5fYT10fTtSSVBFTUQxNjAucHJvdG90eXBlLl9kaWdlc3Q9ZnVuY3Rpb24oKXt0aGlzLl9ibG9ja1t0aGlzLl9ibG9ja09mZnNldCsrXT0xMjg7aWYodGhpcy5fYmxvY2tPZmZzZXQ+NTYpe3RoaXMuX2Jsb2NrLmZpbGwoMCx0aGlzLl9ibG9ja09mZnNldCw2NCk7dGhpcy5fdXBkYXRlKCk7dGhpcy5fYmxvY2tPZmZzZXQ9MH10aGlzLl9ibG9jay5maWxsKDAsdGhpcy5fYmxvY2tPZmZzZXQsNTYpO3RoaXMuX2Jsb2NrLndyaXRlVUludDMyTEUodGhpcy5fbGVuZ3RoWzBdLDU2KTt0aGlzLl9ibG9jay53cml0ZVVJbnQzMkxFKHRoaXMuX2xlbmd0aFsxXSw2MCk7dGhpcy5fdXBkYXRlKCk7dmFyIGJ1ZmZlcj1CdWZmZXIuYWxsb2M/QnVmZmVyLmFsbG9jKDIwKTpuZXcgQnVmZmVyKDIwKTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2EsMCk7YnVmZmVyLndyaXRlSW50MzJMRSh0aGlzLl9iLDQpO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fYyw4KTtidWZmZXIud3JpdGVJbnQzMkxFKHRoaXMuX2QsMTIpO2J1ZmZlci53cml0ZUludDMyTEUodGhpcy5fZSwxNik7cmV0dXJuIGJ1ZmZlcn07ZnVuY3Rpb24gcm90bCh4LG4pe3JldHVybiB4PDxufHg+Pj4zMi1ufWZ1bmN0aW9uIGZuMShhLGIsYyxkLGUsbSxrLHMpe3JldHVybiByb3RsKGErKGJeY15kKSttK2t8MCxzKStlfDB9ZnVuY3Rpb24gZm4yKGEsYixjLGQsZSxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYiZjfH5iJmQpK20ra3wwLHMpK2V8MH1mdW5jdGlvbiBmbjMoYSxiLGMsZCxlLG0sayxzKXtyZXR1cm4gcm90bChhKygoYnx+YyleZCkrbStrfDAscykrZXwwfWZ1bmN0aW9uIGZuNChhLGIsYyxkLGUsbSxrLHMpe3JldHVybiByb3RsKGErKGImZHxjJn5kKSttK2t8MCxzKStlfDB9ZnVuY3Rpb24gZm41KGEsYixjLGQsZSxtLGsscyl7cmV0dXJuIHJvdGwoYSsoYl4oY3x+ZCkpK20ra3wwLHMpK2V8MH1tb2R1bGUuZXhwb3J0cz1SSVBFTUQxNjB9LHtidWZmZXI6MjcsImhhc2gtYmFzZSI6MzQsaW5oZXJpdHM6MzZ9XSw4MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGJ1ZmZlcj1yZXF1aXJlKCJidWZmZXIiKTt2YXIgQnVmZmVyPWJ1ZmZlci5CdWZmZXI7ZnVuY3Rpb24gY29weVByb3BzKHNyYyxkc3Qpe2Zvcih2YXIga2V5IGluIHNyYyl7ZHN0W2tleV09c3JjW2tleV19fWlmKEJ1ZmZlci5mcm9tJiZCdWZmZXIuYWxsb2MmJkJ1ZmZlci5hbGxvY1Vuc2FmZSYmQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyl7bW9kdWxlLmV4cG9ydHM9YnVmZmVyfWVsc2V7Y29weVByb3BzKGJ1ZmZlcixleHBvcnRzKTtleHBvcnRzLkJ1ZmZlcj1TYWZlQnVmZmVyfWZ1bmN0aW9uIFNhZmVCdWZmZXIoYXJnLGVuY29kaW5nT3JPZmZzZXQsbGVuZ3RoKXtyZXR1cm4gQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl9U2FmZUJ1ZmZlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShCdWZmZXIucHJvdG90eXBlKTtjb3B5UHJvcHMoQnVmZmVyLFNhZmVCdWZmZXIpO1NhZmVCdWZmZXIuZnJvbT1mdW5jdGlvbihhcmcsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiBhcmc9PT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXIiKX1yZXR1cm4gQnVmZmVyKGFyZyxlbmNvZGluZ09yT2Zmc2V0LGxlbmd0aCl9O1NhZmVCdWZmZXIuYWxsb2M9ZnVuY3Rpb24oc2l6ZSxmaWxsLGVuY29kaW5nKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9dmFyIGJ1Zj1CdWZmZXIoc2l6ZSk7aWYoZmlsbCE9PXVuZGVmaW5lZCl7aWYodHlwZW9mIGVuY29kaW5nPT09InN0cmluZyIpe2J1Zi5maWxsKGZpbGwsZW5jb2RpbmcpfWVsc2V7YnVmLmZpbGwoZmlsbCl9fWVsc2V7YnVmLmZpbGwoMCl9cmV0dXJuIGJ1Zn07U2FmZUJ1ZmZlci5hbGxvY1Vuc2FmZT1mdW5jdGlvbihzaXplKXtpZih0eXBlb2Ygc2l6ZSE9PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCJBcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyIil9cmV0dXJuIEJ1ZmZlcihzaXplKX07U2FmZUJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3c9ZnVuY3Rpb24oc2l6ZSl7aWYodHlwZW9mIHNpemUhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiQXJndW1lbnQgbXVzdCBiZSBhIG51bWJlciIpfXJldHVybiBidWZmZXIuU2xvd0J1ZmZlcihzaXplKX19LHtidWZmZXI6Mjd9XSw4NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHByb2Nlc3MpeyJ1c2Ugc3RyaWN0Ijt2YXIgYnVmZmVyPXJlcXVpcmUoImJ1ZmZlciIpO3ZhciBCdWZmZXI9YnVmZmVyLkJ1ZmZlcjt2YXIgc2FmZXI9e307dmFyIGtleTtmb3Ioa2V5IGluIGJ1ZmZlcil7aWYoIWJ1ZmZlci5oYXNPd25Qcm9wZXJ0eShrZXkpKWNvbnRpbnVlO2lmKGtleT09PSJTbG93QnVmZmVyInx8a2V5PT09IkJ1ZmZlciIpY29udGludWU7c2FmZXJba2V5XT1idWZmZXJba2V5XX12YXIgU2FmZXI9c2FmZXIuQnVmZmVyPXt9O2ZvcihrZXkgaW4gQnVmZmVyKXtpZighQnVmZmVyLmhhc093blByb3BlcnR5KGtleSkpY29udGludWU7aWYoa2V5PT09ImFsbG9jVW5zYWZlInx8a2V5PT09ImFsbG9jVW5zYWZlU2xvdyIpY29udGludWU7U2FmZXJba2V5XT1CdWZmZXJba2V5XX1zYWZlci5CdWZmZXIucHJvdG90eXBlPUJ1ZmZlci5wcm90b3R5cGU7aWYoIVNhZmVyLmZyb218fFNhZmVyLmZyb209PT1VaW50OEFycmF5LmZyb20pe1NhZmVyLmZyb209ZnVuY3Rpb24odmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpe2lmKHR5cGVvZiB2YWx1ZT09PSJudW1iZXIiKXt0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgInZhbHVlIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBvZiB0eXBlIG51bWJlci4gUmVjZWl2ZWQgdHlwZSAnK3R5cGVvZiB2YWx1ZSl9aWYodmFsdWUmJnR5cGVvZiB2YWx1ZS5sZW5ndGg9PT0idW5kZWZpbmVkIil7dGhyb3cgbmV3IFR5cGVFcnJvcigiVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgIit0eXBlb2YgdmFsdWUpfXJldHVybiBCdWZmZXIodmFsdWUsZW5jb2RpbmdPck9mZnNldCxsZW5ndGgpfX1pZighU2FmZXIuYWxsb2Mpe1NhZmVyLmFsbG9jPWZ1bmN0aW9uKHNpemUsZmlsbCxlbmNvZGluZyl7aWYodHlwZW9mIHNpemUhPT0ibnVtYmVyIil7dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJzaXplIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLiBSZWNlaXZlZCB0eXBlICcrdHlwZW9mIHNpemUpfWlmKHNpemU8MHx8c2l6ZT49MiooMTw8MzApKXt0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlICInK3NpemUrJyIgaXMgaW52YWxpZCBmb3Igb3B0aW9uICJzaXplIicpfXZhciBidWY9QnVmZmVyKHNpemUpO2lmKCFmaWxsfHxmaWxsLmxlbmd0aD09PTApe2J1Zi5maWxsKDApfWVsc2UgaWYodHlwZW9mIGVuY29kaW5nPT09InN0cmluZyIpe2J1Zi5maWxsKGZpbGwsZW5jb2RpbmcpfWVsc2V7YnVmLmZpbGwoZmlsbCl9cmV0dXJuIGJ1Zn19aWYoIXNhZmVyLmtTdHJpbmdNYXhMZW5ndGgpe3RyeXtzYWZlci5rU3RyaW5nTWF4TGVuZ3RoPXByb2Nlc3MuYmluZGluZygiYnVmZmVyIikua1N0cmluZ01heExlbmd0aH1jYXRjaChlKXt9fWlmKCFzYWZlci5jb25zdGFudHMpe3NhZmVyLmNvbnN0YW50cz17TUFYX0xFTkdUSDpzYWZlci5rTWF4TGVuZ3RofTtpZihzYWZlci5rU3RyaW5nTWF4TGVuZ3RoKXtzYWZlci5jb25zdGFudHMuTUFYX1NUUklOR19MRU5HVEg9c2FmZXIua1N0cmluZ01heExlbmd0aH19bW9kdWxlLmV4cG9ydHM9c2FmZXJ9KS5jYWxsKHRoaXMscmVxdWlyZSgiX3Byb2Nlc3MiKSl9LHtfcHJvY2Vzczo2NixidWZmZXI6Mjd9XSw4NTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKEJ1ZmZlcil7dmFyIHBia2RmMj1yZXF1aXJlKCJwYmtkZjIiKTt2YXIgTUFYX1ZBTFVFPTIxNDc0ODM2NDc7ZnVuY3Rpb24gc2NyeXB0KGtleSxzYWx0LE4scixwLGRrTGVuLHByb2dyZXNzQ2FsbGJhY2spe2lmKE49PT0wfHwoTiZOLTEpIT09MCl0aHJvdyBFcnJvcigiTiBtdXN0IGJlID4gMCBhbmQgYSBwb3dlciBvZiAyIik7aWYoTj5NQVhfVkFMVUUvMTI4L3IpdGhyb3cgRXJyb3IoIlBhcmFtZXRlciBOIGlzIHRvbyBsYXJnZSIpO2lmKHI+TUFYX1ZBTFVFLzEyOC9wKXRocm93IEVycm9yKCJQYXJhbWV0ZXIgciBpcyB0b28gbGFyZ2UiKTt2YXIgWFk9bmV3IEJ1ZmZlcigyNTYqcik7dmFyIFY9bmV3IEJ1ZmZlcigxMjgqcipOKTt2YXIgQjMyPW5ldyBJbnQzMkFycmF5KDE2KTt2YXIgeD1uZXcgSW50MzJBcnJheSgxNik7dmFyIF9YPW5ldyBCdWZmZXIoNjQpO3ZhciBCPXBia2RmMi5wYmtkZjJTeW5jKGtleSxzYWx0LDEscCoxMjgqciwic2hhMjU2Iik7dmFyIHRpY2tDYWxsYmFjaztpZihwcm9ncmVzc0NhbGxiYWNrKXt2YXIgdG90YWxPcHM9cCpOKjI7dmFyIGN1cnJlbnRPcD0wO3RpY2tDYWxsYmFjaz1mdW5jdGlvbigpeysrY3VycmVudE9wO2lmKGN1cnJlbnRPcCUxZTM9PT0wKXtwcm9ncmVzc0NhbGxiYWNrKHtjdXJyZW50OmN1cnJlbnRPcCx0b3RhbDp0b3RhbE9wcyxwZXJjZW50OmN1cnJlbnRPcC90b3RhbE9wcyoxMDB9KX19fWZvcih2YXIgaT0wO2k8cDtpKyspe3NtaXgoQixpKjEyOCpyLHIsTixWLFhZKX1yZXR1cm4gcGJrZGYyLnBia2RmMlN5bmMoa2V5LEIsMSxka0xlbiwic2hhMjU2Iik7ZnVuY3Rpb24gc21peChCLEJpLHIsTixWLFhZKXt2YXIgWGk9MDt2YXIgWWk9MTI4KnI7dmFyIGk7Qi5jb3B5KFhZLFhpLEJpLEJpK1lpKTtmb3IoaT0wO2k8TjtpKyspe1hZLmNvcHkoVixpKllpLFhpLFhpK1lpKTtibG9ja21peF9zYWxzYTgoWFksWGksWWkscik7aWYodGlja0NhbGxiYWNrKXRpY2tDYWxsYmFjaygpfWZvcihpPTA7aTxOO2krKyl7dmFyIG9mZnNldD1YaSsoMipyLTEpKjY0O3ZhciBqPVhZLnJlYWRVSW50MzJMRShvZmZzZXQpJk4tMTtibG9ja3hvcihWLGoqWWksWFksWGksWWkpO2Jsb2NrbWl4X3NhbHNhOChYWSxYaSxZaSxyKTtpZih0aWNrQ2FsbGJhY2spdGlja0NhbGxiYWNrKCl9WFkuY29weShCLEJpLFhpLFhpK1lpKX1mdW5jdGlvbiBibG9ja21peF9zYWxzYTgoQlksQmksWWkscil7dmFyIGk7YXJyYXljb3B5KEJZLEJpKygyKnItMSkqNjQsX1gsMCw2NCk7Zm9yKGk9MDtpPDIqcjtpKyspe2Jsb2NreG9yKEJZLGkqNjQsX1gsMCw2NCk7c2Fsc2EyMF84KF9YKTthcnJheWNvcHkoX1gsMCxCWSxZaStpKjY0LDY0KX1mb3IoaT0wO2k8cjtpKyspe2FycmF5Y29weShCWSxZaStpKjIqNjQsQlksQmkraSo2NCw2NCl9Zm9yKGk9MDtpPHI7aSsrKXthcnJheWNvcHkoQlksWWkrKGkqMisxKSo2NCxCWSxCaSsoaStyKSo2NCw2NCl9fWZ1bmN0aW9uIFIoYSxiKXtyZXR1cm4gYTw8YnxhPj4+MzItYn1mdW5jdGlvbiBzYWxzYTIwXzgoQil7dmFyIGk7Zm9yKGk9MDtpPDE2O2krKyl7QjMyW2ldPShCW2kqNCswXSYyNTUpPDwwO0IzMltpXXw9KEJbaSo0KzFdJjI1NSk8PDg7QjMyW2ldfD0oQltpKjQrMl0mMjU1KTw8MTY7QjMyW2ldfD0oQltpKjQrM10mMjU1KTw8MjR9YXJyYXljb3B5KEIzMiwwLHgsMCwxNik7Zm9yKGk9ODtpPjA7aS09Mil7eFs0XV49Uih4WzBdK3hbMTJdLDcpO3hbOF1ePVIoeFs0XSt4WzBdLDkpO3hbMTJdXj1SKHhbOF0reFs0XSwxMyk7eFswXV49Uih4WzEyXSt4WzhdLDE4KTt4WzldXj1SKHhbNV0reFsxXSw3KTt4WzEzXV49Uih4WzldK3hbNV0sOSk7eFsxXV49Uih4WzEzXSt4WzldLDEzKTt4WzVdXj1SKHhbMV0reFsxM10sMTgpO3hbMTRdXj1SKHhbMTBdK3hbNl0sNyk7eFsyXV49Uih4WzE0XSt4WzEwXSw5KTt4WzZdXj1SKHhbMl0reFsxNF0sMTMpO3hbMTBdXj1SKHhbNl0reFsyXSwxOCk7eFszXV49Uih4WzE1XSt4WzExXSw3KTt4WzddXj1SKHhbM10reFsxNV0sOSk7eFsxMV1ePVIoeFs3XSt4WzNdLDEzKTt4WzE1XV49Uih4WzExXSt4WzddLDE4KTt4WzFdXj1SKHhbMF0reFszXSw3KTt4WzJdXj1SKHhbMV0reFswXSw5KTt4WzNdXj1SKHhbMl0reFsxXSwxMyk7eFswXV49Uih4WzNdK3hbMl0sMTgpO3hbNl1ePVIoeFs1XSt4WzRdLDcpO3hbN11ePVIoeFs2XSt4WzVdLDkpO3hbNF1ePVIoeFs3XSt4WzZdLDEzKTt4WzVdXj1SKHhbNF0reFs3XSwxOCk7eFsxMV1ePVIoeFsxMF0reFs5XSw3KTt4WzhdXj1SKHhbMTFdK3hbMTBdLDkpO3hbOV1ePVIoeFs4XSt4WzExXSwxMyk7eFsxMF1ePVIoeFs5XSt4WzhdLDE4KTt4WzEyXV49Uih4WzE1XSt4WzE0XSw3KTt4WzEzXV49Uih4WzEyXSt4WzE1XSw5KTt4WzE0XV49Uih4WzEzXSt4WzEyXSwxMyk7eFsxNV1ePVIoeFsxNF0reFsxM10sMTgpfWZvcihpPTA7aTwxNjsrK2kpQjMyW2ldPXhbaV0rQjMyW2ldO2ZvcihpPTA7aTwxNjtpKyspe3ZhciBiaT1pKjQ7QltiaSswXT1CMzJbaV0+PjAmMjU1O0JbYmkrMV09QjMyW2ldPj44JjI1NTtCW2JpKzJdPUIzMltpXT4+MTYmMjU1O0JbYmkrM109QjMyW2ldPj4yNCYyNTV9fWZ1bmN0aW9uIGJsb2NreG9yKFMsU2ksRCxEaSxsZW4pe2Zvcih2YXIgaT0wO2k8bGVuO2krKyl7RFtEaStpXV49U1tTaStpXX19fWZ1bmN0aW9uIGFycmF5Y29weShzcmMsc3JjUG9zLGRlc3QsZGVzdFBvcyxsZW5ndGgpe2lmKEJ1ZmZlci5pc0J1ZmZlcihzcmMpJiZCdWZmZXIuaXNCdWZmZXIoZGVzdCkpe3NyYy5jb3B5KGRlc3QsZGVzdFBvcyxzcmNQb3Msc3JjUG9zK2xlbmd0aCl9ZWxzZXt3aGlsZShsZW5ndGgtLSl7ZGVzdFtkZXN0UG9zKytdPXNyY1tzcmNQb3MrK119fX1tb2R1bGUuZXhwb3J0cz1zY3J5cHR9KS5jYWxsKHRoaXMscmVxdWlyZSgiYnVmZmVyIikuQnVmZmVyKX0se2J1ZmZlcjoyNyxwYmtkZjI6NjB9XSw4NjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGFsZWE9cmVxdWlyZSgiLi9saWIvYWxlYSIpO3ZhciB4b3IxMjg9cmVxdWlyZSgiLi9saWIveG9yMTI4Iik7dmFyIHhvcndvdz1yZXF1aXJlKCIuL2xpYi94b3J3b3ciKTt2YXIgeG9yc2hpZnQ3PXJlcXVpcmUoIi4vbGliL3hvcnNoaWZ0NyIpO3ZhciB4b3I0MDk2PXJlcXVpcmUoIi4vbGliL3hvcjQwOTYiKTt2YXIgdHljaGVpPXJlcXVpcmUoIi4vbGliL3R5Y2hlaSIpO3ZhciBzcj1yZXF1aXJlKCIuL3NlZWRyYW5kb20iKTtzci5hbGVhPWFsZWE7c3IueG9yMTI4PXhvcjEyODtzci54b3J3b3c9eG9yd293O3NyLnhvcnNoaWZ0Nz14b3JzaGlmdDc7c3IueG9yNDA5Nj14b3I0MDk2O3NyLnR5Y2hlaT10eWNoZWk7bW9kdWxlLmV4cG9ydHM9c3J9LHsiLi9saWIvYWxlYSI6ODcsIi4vbGliL3R5Y2hlaSI6ODgsIi4vbGliL3hvcjEyOCI6ODksIi4vbGliL3hvcjQwOTYiOjkwLCIuL2xpYi94b3JzaGlmdDciOjkxLCIuL2xpYi94b3J3b3ciOjkyLCIuL3NlZWRyYW5kb20iOjkzfV0sODc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwsbW9kdWxlLGRlZmluZSl7ZnVuY3Rpb24gQWxlYShzZWVkKXt2YXIgbWU9dGhpcyxtYXNoPU1hc2goKTttZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIHQ9MjA5MTYzOSptZS5zMCttZS5jKjIuMzI4MzA2NDM2NTM4Njk2M2UtMTA7bWUuczA9bWUuczE7bWUuczE9bWUuczI7cmV0dXJuIG1lLnMyPXQtKG1lLmM9dHwwKX07bWUuYz0xO21lLnMwPW1hc2goIiAiKTttZS5zMT1tYXNoKCIgIik7bWUuczI9bWFzaCgiICIpO21lLnMwLT1tYXNoKHNlZWQpO2lmKG1lLnMwPDApe21lLnMwKz0xfW1lLnMxLT1tYXNoKHNlZWQpO2lmKG1lLnMxPDApe21lLnMxKz0xfW1lLnMyLT1tYXNoKHNlZWQpO2lmKG1lLnMyPDApe21lLnMyKz0xfW1hc2g9bnVsbH1mdW5jdGlvbiBjb3B5KGYsdCl7dC5jPWYuYzt0LnMwPWYuczA7dC5zMT1mLnMxO3QuczI9Zi5zMjtyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7dmFyIHhnPW5ldyBBbGVhKHNlZWQpLHN0YXRlPW9wdHMmJm9wdHMuc3RhdGUscHJuZz14Zy5uZXh0O3BybmcuaW50MzI9ZnVuY3Rpb24oKXtyZXR1cm4geGcubmV4dCgpKjQyOTQ5NjcyOTZ8MH07cHJuZy5kb3VibGU9ZnVuY3Rpb24oKXtyZXR1cm4gcHJuZygpKyhwcm5nKCkqMjA5NzE1MnwwKSoxMTEwMjIzMDI0NjI1MTU2NWUtMzJ9O3BybmcucXVpY2s9cHJuZztpZihzdGF0ZSl7aWYodHlwZW9mIHN0YXRlPT0ib2JqZWN0Iiljb3B5KHN0YXRlLHhnKTtwcm5nLnN0YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIGNvcHkoeGcse30pfX1yZXR1cm4gcHJuZ31mdW5jdGlvbiBNYXNoKCl7dmFyIG49NDAyMjg3MTE5Nzt2YXIgbWFzaD1mdW5jdGlvbihkYXRhKXtkYXRhPVN0cmluZyhkYXRhKTtmb3IodmFyIGk9MDtpPGRhdGEubGVuZ3RoO2krKyl7bis9ZGF0YS5jaGFyQ29kZUF0KGkpO3ZhciBoPS4wMjUxOTYwMzI4MjQxNjkzOCpuO249aD4+PjA7aC09bjtoKj1uO249aD4+PjA7aC09bjtuKz1oKjQyOTQ5NjcyOTZ9cmV0dXJuKG4+Pj4wKSoyLjMyODMwNjQzNjUzODY5NjNlLTEwfTtyZXR1cm4gbWFzaH1pZihtb2R1bGUmJm1vZHVsZS5leHBvcnRzKXttb2R1bGUuZXhwb3J0cz1pbXBsfWVsc2UgaWYoZGVmaW5lJiZkZWZpbmUuYW1kKXtkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gaW1wbH0pfWVsc2V7dGhpcy5hbGVhPWltcGx9fSkodGhpcyx0eXBlb2YgbW9kdWxlPT0ib2JqZWN0IiYmbW9kdWxlLHR5cGVvZiBkZWZpbmU9PSJmdW5jdGlvbiImJmRlZmluZSl9LHt9XSw4ODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKGdsb2JhbCxtb2R1bGUsZGVmaW5lKXtmdW5jdGlvbiBYb3JHZW4oc2VlZCl7dmFyIG1lPXRoaXMsc3Ryc2VlZD0iIjttZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIGI9bWUuYixjPW1lLmMsZD1tZS5kLGE9bWUuYTtiPWI8PDI1XmI+Pj43XmM7Yz1jLWR8MDtkPWQ8PDI0XmQ+Pj44XmE7YT1hLWJ8MDttZS5iPWI9Yjw8MjBeYj4+PjEyXmM7bWUuYz1jPWMtZHwwO21lLmQ9ZDw8MTZeYz4+PjE2XmE7cmV0dXJuIG1lLmE9YS1ifDB9O21lLmE9MDttZS5iPTA7bWUuYz0yNjU0NDM1NzY5fDA7bWUuZD0xMzY3MTMwNTUxO2lmKHNlZWQ9PT1NYXRoLmZsb29yKHNlZWQpKXttZS5hPXNlZWQvNDI5NDk2NzI5NnwwO21lLmI9c2VlZHwwfWVsc2V7c3Ryc2VlZCs9c2VlZH1mb3IodmFyIGs9MDtrPHN0cnNlZWQubGVuZ3RoKzIwO2srKyl7bWUuYl49c3Ryc2VlZC5jaGFyQ29kZUF0KGspfDA7bWUubmV4dCgpfX1mdW5jdGlvbiBjb3B5KGYsdCl7dC5hPWYuYTt0LmI9Zi5iO3QuYz1mLmM7dC5kPWYuZDtyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7dmFyIHhnPW5ldyBYb3JHZW4oc2VlZCksc3RhdGU9b3B0cyYmb3B0cy5zdGF0ZSxwcm5nPWZ1bmN0aW9uKCl7cmV0dXJuKHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTZ9O3BybmcuZG91YmxlPWZ1bmN0aW9uKCl7ZG97dmFyIHRvcD14Zy5uZXh0KCk+Pj4xMSxib3Q9KHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTYscmVzdWx0PSh0b3ArYm90KS8oMTw8MjEpfXdoaWxlKHJlc3VsdD09PTApO3JldHVybiByZXN1bHR9O3BybmcuaW50MzI9eGcubmV4dDtwcm5nLnF1aWNrPXBybmc7aWYoc3RhdGUpe2lmKHR5cGVvZiBzdGF0ZT09Im9iamVjdCIpY29weShzdGF0ZSx4Zyk7cHJuZy5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiBjb3B5KHhnLHt9KX19cmV0dXJuIHBybmd9aWYobW9kdWxlJiZtb2R1bGUuZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9aW1wbH1lbHNlIGlmKGRlZmluZSYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIGltcGx9KX1lbHNle3RoaXMudHljaGVpPWltcGx9fSkodGhpcyx0eXBlb2YgbW9kdWxlPT0ib2JqZWN0IiYmbW9kdWxlLHR5cGVvZiBkZWZpbmU9PSJmdW5jdGlvbiImJmRlZmluZSl9LHt9XSw4OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKGdsb2JhbCxtb2R1bGUsZGVmaW5lKXtmdW5jdGlvbiBYb3JHZW4oc2VlZCl7dmFyIG1lPXRoaXMsc3Ryc2VlZD0iIjttZS54PTA7bWUueT0wO21lLno9MDttZS53PTA7bWUubmV4dD1mdW5jdGlvbigpe3ZhciB0PW1lLnhebWUueDw8MTE7bWUueD1tZS55O21lLnk9bWUuejttZS56PW1lLnc7cmV0dXJuIG1lLndePW1lLnc+Pj4xOV50XnQ+Pj44fTtpZihzZWVkPT09KHNlZWR8MCkpe21lLng9c2VlZH1lbHNle3N0cnNlZWQrPXNlZWR9Zm9yKHZhciBrPTA7azxzdHJzZWVkLmxlbmd0aCs2NDtrKyspe21lLnhePXN0cnNlZWQuY2hhckNvZGVBdChrKXwwO21lLm5leHQoKX19ZnVuY3Rpb24gY29weShmLHQpe3QueD1mLng7dC55PWYueTt0Lno9Zi56O3Qudz1mLnc7cmV0dXJuIHR9ZnVuY3Rpb24gaW1wbChzZWVkLG9wdHMpe3ZhciB4Zz1uZXcgWG9yR2VuKHNlZWQpLHN0YXRlPW9wdHMmJm9wdHMuc3RhdGUscHJuZz1mdW5jdGlvbigpe3JldHVybih4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2fTtwcm5nLmRvdWJsZT1mdW5jdGlvbigpe2Rve3ZhciB0b3A9eGcubmV4dCgpPj4+MTEsYm90PSh4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2LHJlc3VsdD0odG9wK2JvdCkvKDE8PDIxKX13aGlsZShyZXN1bHQ9PT0wKTtyZXR1cm4gcmVzdWx0fTtwcm5nLmludDMyPXhnLm5leHQ7cHJuZy5xdWljaz1wcm5nO2lmKHN0YXRlKXtpZih0eXBlb2Ygc3RhdGU9PSJvYmplY3QiKWNvcHkoc3RhdGUseGcpO3Bybmcuc3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gY29weSh4Zyx7fSl9fXJldHVybiBwcm5nfWlmKG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMpe21vZHVsZS5leHBvcnRzPWltcGx9ZWxzZSBpZihkZWZpbmUmJmRlZmluZS5hbWQpe2RlZmluZShmdW5jdGlvbigpe3JldHVybiBpbXBsfSl9ZWxzZXt0aGlzLnhvcjEyOD1pbXBsfX0pKHRoaXMsdHlwZW9mIG1vZHVsZT09Im9iamVjdCImJm1vZHVsZSx0eXBlb2YgZGVmaW5lPT0iZnVuY3Rpb24iJiZkZWZpbmUpfSx7fV0sOTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpeyhmdW5jdGlvbihnbG9iYWwsbW9kdWxlLGRlZmluZSl7ZnVuY3Rpb24gWG9yR2VuKHNlZWQpe3ZhciBtZT10aGlzO21lLm5leHQ9ZnVuY3Rpb24oKXt2YXIgdz1tZS53LFg9bWUuWCxpPW1lLmksdCx2O21lLnc9dz13KzE2NDA1MzE1Mjd8MDt2PVhbaSszNCYxMjddO3Q9WFtpPWkrMSYxMjddO3ZePXY8PDEzO3RePXQ8PDE3O3ZePXY+Pj4xNTt0Xj10Pj4+MTI7dj1YW2ldPXZedDttZS5pPWk7cmV0dXJuIHYrKHdedz4+PjE2KXwwfTtmdW5jdGlvbiBpbml0KG1lLHNlZWQpe3ZhciB0LHYsaSxqLHcsWD1bXSxsaW1pdD0xMjg7aWYoc2VlZD09PShzZWVkfDApKXt2PXNlZWQ7c2VlZD1udWxsfWVsc2V7c2VlZD1zZWVkKyJcMCI7dj0wO2xpbWl0PU1hdGgubWF4KGxpbWl0LHNlZWQubGVuZ3RoKX1mb3IoaT0wLGo9LTMyO2o8bGltaXQ7KytqKXtpZihzZWVkKXZePXNlZWQuY2hhckNvZGVBdCgoaiszMiklc2VlZC5sZW5ndGgpO2lmKGo9PT0wKXc9djt2Xj12PDwxMDt2Xj12Pj4+MTU7dl49djw8NDt2Xj12Pj4+MTM7aWYoaj49MCl7dz13KzE2NDA1MzE1Mjd8MDt0PVhbaiYxMjddXj12K3c7aT0wPT10P2krMTowfX1pZihpPj0xMjgpe1hbKHNlZWQmJnNlZWQubGVuZ3RofHwwKSYxMjddPS0xfWk9MTI3O2ZvcihqPTQqMTI4O2o+MDstLWope3Y9WFtpKzM0JjEyN107dD1YW2k9aSsxJjEyN107dl49djw8MTM7dF49dDw8MTc7dl49dj4+PjE1O3RePXQ+Pj4xMjtYW2ldPXZedH1tZS53PXc7bWUuWD1YO21lLmk9aX1pbml0KG1lLHNlZWQpfWZ1bmN0aW9uIGNvcHkoZix0KXt0Lmk9Zi5pO3Qudz1mLnc7dC5YPWYuWC5zbGljZSgpO3JldHVybiB0fWZ1bmN0aW9uIGltcGwoc2VlZCxvcHRzKXtpZihzZWVkPT1udWxsKXNlZWQ9K25ldyBEYXRlO3ZhciB4Zz1uZXcgWG9yR2VuKHNlZWQpLHN0YXRlPW9wdHMmJm9wdHMuc3RhdGUscHJuZz1mdW5jdGlvbigpe3JldHVybih4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2fTtwcm5nLmRvdWJsZT1mdW5jdGlvbigpe2Rve3ZhciB0b3A9eGcubmV4dCgpPj4+MTEsYm90PSh4Zy5uZXh0KCk+Pj4wKS80Mjk0OTY3Mjk2LHJlc3VsdD0odG9wK2JvdCkvKDE8PDIxKX13aGlsZShyZXN1bHQ9PT0wKTtyZXR1cm4gcmVzdWx0fTtwcm5nLmludDMyPXhnLm5leHQ7cHJuZy5xdWljaz1wcm5nO2lmKHN0YXRlKXtpZihzdGF0ZS5YKWNvcHkoc3RhdGUseGcpO3Bybmcuc3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gY29weSh4Zyx7fSl9fXJldHVybiBwcm5nfWlmKG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMpe21vZHVsZS5leHBvcnRzPWltcGx9ZWxzZSBpZihkZWZpbmUmJmRlZmluZS5hbWQpe2RlZmluZShmdW5jdGlvbigpe3JldHVybiBpbXBsfSl9ZWxzZXt0aGlzLnhvcjQwOTY9aW1wbH19KSh0aGlzLHR5cGVvZiBtb2R1bGU9PSJvYmplY3QiJiZtb2R1bGUsdHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lKX0se31dLDkxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oZ2xvYmFsLG1vZHVsZSxkZWZpbmUpe2Z1bmN0aW9uIFhvckdlbihzZWVkKXt2YXIgbWU9dGhpczttZS5uZXh0PWZ1bmN0aW9uKCl7dmFyIFg9bWUueCxpPW1lLmksdCx2LHc7dD1YW2ldO3RePXQ+Pj43O3Y9dF50PDwyNDt0PVhbaSsxJjddO3ZePXRedD4+PjEwO3Q9WFtpKzMmN107dl49dF50Pj4+Mzt0PVhbaSs0JjddO3ZePXRedDw8Nzt0PVhbaSs3JjddO3Q9dF50PDwxMzt2Xj10XnQ8PDk7WFtpXT12O21lLmk9aSsxJjc7cmV0dXJuIHZ9O2Z1bmN0aW9uIGluaXQobWUsc2VlZCl7dmFyIGosdyxYPVtdO2lmKHNlZWQ9PT0oc2VlZHwwKSl7dz1YWzBdPXNlZWR9ZWxzZXtzZWVkPSIiK3NlZWQ7Zm9yKGo9MDtqPHNlZWQubGVuZ3RoOysrail7WFtqJjddPVhbaiY3XTw8MTVec2VlZC5jaGFyQ29kZUF0KGopK1hbaisxJjddPDwxM319d2hpbGUoWC5sZW5ndGg8OClYLnB1c2goMCk7Zm9yKGo9MDtqPDgmJlhbal09PT0wOysraik7aWYoaj09OCl3PVhbN109LTE7ZWxzZSB3PVhbal07bWUueD1YO21lLmk9MDtmb3Ioaj0yNTY7aj4wOy0tail7bWUubmV4dCgpfX1pbml0KG1lLHNlZWQpfWZ1bmN0aW9uIGNvcHkoZix0KXt0Lng9Zi54LnNsaWNlKCk7dC5pPWYuaTtyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7aWYoc2VlZD09bnVsbClzZWVkPStuZXcgRGF0ZTt2YXIgeGc9bmV3IFhvckdlbihzZWVkKSxzdGF0ZT1vcHRzJiZvcHRzLnN0YXRlLHBybmc9ZnVuY3Rpb24oKXtyZXR1cm4oeGcubmV4dCgpPj4+MCkvNDI5NDk2NzI5Nn07cHJuZy5kb3VibGU9ZnVuY3Rpb24oKXtkb3t2YXIgdG9wPXhnLm5leHQoKT4+PjExLGJvdD0oeGcubmV4dCgpPj4+MCkvNDI5NDk2NzI5NixyZXN1bHQ9KHRvcCtib3QpLygxPDwyMSl9d2hpbGUocmVzdWx0PT09MCk7cmV0dXJuIHJlc3VsdH07cHJuZy5pbnQzMj14Zy5uZXh0O3BybmcucXVpY2s9cHJuZztpZihzdGF0ZSl7aWYoc3RhdGUueCljb3B5KHN0YXRlLHhnKTtwcm5nLnN0YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIGNvcHkoeGcse30pfX1yZXR1cm4gcHJuZ31pZihtb2R1bGUmJm1vZHVsZS5leHBvcnRzKXttb2R1bGUuZXhwb3J0cz1pbXBsfWVsc2UgaWYoZGVmaW5lJiZkZWZpbmUuYW1kKXtkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gaW1wbH0pfWVsc2V7dGhpcy54b3JzaGlmdDc9aW1wbH19KSh0aGlzLHR5cGVvZiBtb2R1bGU9PSJvYmplY3QiJiZtb2R1bGUsdHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lKX0se31dLDkyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oZ2xvYmFsLG1vZHVsZSxkZWZpbmUpe2Z1bmN0aW9uIFhvckdlbihzZWVkKXt2YXIgbWU9dGhpcyxzdHJzZWVkPSIiO21lLm5leHQ9ZnVuY3Rpb24oKXt2YXIgdD1tZS54Xm1lLng+Pj4yO21lLng9bWUueTttZS55PW1lLno7bWUuej1tZS53O21lLnc9bWUudjtyZXR1cm4obWUuZD1tZS5kKzM2MjQzN3wwKSsobWUudj1tZS52Xm1lLnY8PDReKHRedDw8MSkpfDB9O21lLng9MDttZS55PTA7bWUuej0wO21lLnc9MDttZS52PTA7aWYoc2VlZD09PShzZWVkfDApKXttZS54PXNlZWR9ZWxzZXtzdHJzZWVkKz1zZWVkfWZvcih2YXIgaz0wO2s8c3Ryc2VlZC5sZW5ndGgrNjQ7aysrKXttZS54Xj1zdHJzZWVkLmNoYXJDb2RlQXQoayl8MDtpZihrPT1zdHJzZWVkLmxlbmd0aCl7bWUuZD1tZS54PDwxMF5tZS54Pj4+NH1tZS5uZXh0KCl9fWZ1bmN0aW9uIGNvcHkoZix0KXt0Lng9Zi54O3QueT1mLnk7dC56PWYuejt0Lnc9Zi53O3Qudj1mLnY7dC5kPWYuZDtyZXR1cm4gdH1mdW5jdGlvbiBpbXBsKHNlZWQsb3B0cyl7dmFyIHhnPW5ldyBYb3JHZW4oc2VlZCksc3RhdGU9b3B0cyYmb3B0cy5zdGF0ZSxwcm5nPWZ1bmN0aW9uKCl7cmV0dXJuKHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTZ9O3BybmcuZG91YmxlPWZ1bmN0aW9uKCl7ZG97dmFyIHRvcD14Zy5uZXh0KCk+Pj4xMSxib3Q9KHhnLm5leHQoKT4+PjApLzQyOTQ5NjcyOTYscmVzdWx0PSh0b3ArYm90KS8oMTw8MjEpfXdoaWxlKHJlc3VsdD09PTApO3JldHVybiByZXN1bHR9O3BybmcuaW50MzI9eGcubmV4dDtwcm5nLnF1aWNrPXBybmc7aWYoc3RhdGUpe2lmKHR5cGVvZiBzdGF0ZT09Im9iamVjdCIpY29weShzdGF0ZSx4Zyk7cHJuZy5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiBjb3B5KHhnLHt9KX19cmV0dXJuIHBybmd9aWYobW9kdWxlJiZtb2R1bGUuZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9aW1wbH1lbHNlIGlmKGRlZmluZSYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIGltcGx9KX1lbHNle3RoaXMueG9yd293PWltcGx9fSkodGhpcyx0eXBlb2YgbW9kdWxlPT0ib2JqZWN0IiYmbW9kdWxlLHR5cGVvZiBkZWZpbmU9PSJmdW5jdGlvbiImJmRlZmluZSl9LHt9XSw5MzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHBvb2wsbWF0aCl7dmFyIGdsb2JhbD0oMCxldmFsKSgidGhpcyIpLHdpZHRoPTI1NixjaHVua3M9NixkaWdpdHM9NTIscm5nbmFtZT0icmFuZG9tIixzdGFydGRlbm9tPW1hdGgucG93KHdpZHRoLGNodW5rcyksc2lnbmlmaWNhbmNlPW1hdGgucG93KDIsZGlnaXRzKSxvdmVyZmxvdz1zaWduaWZpY2FuY2UqMixtYXNrPXdpZHRoLTEsbm9kZWNyeXB0bztmdW5jdGlvbiBzZWVkcmFuZG9tKHNlZWQsb3B0aW9ucyxjYWxsYmFjayl7dmFyIGtleT1bXTtvcHRpb25zPW9wdGlvbnM9PXRydWU/e2VudHJvcHk6dHJ1ZX06b3B0aW9uc3x8e307dmFyIHNob3J0c2VlZD1taXhrZXkoZmxhdHRlbihvcHRpb25zLmVudHJvcHk/W3NlZWQsdG9zdHJpbmcocG9vbCldOnNlZWQ9PW51bGw/YXV0b3NlZWQoKTpzZWVkLDMpLGtleSk7dmFyIGFyYzQ9bmV3IEFSQzQoa2V5KTt2YXIgcHJuZz1mdW5jdGlvbigpe3ZhciBuPWFyYzQuZyhjaHVua3MpLGQ9c3RhcnRkZW5vbSx4PTA7d2hpbGUobjxzaWduaWZpY2FuY2Upe249KG4reCkqd2lkdGg7ZCo9d2lkdGg7eD1hcmM0LmcoMSl9d2hpbGUobj49b3ZlcmZsb3cpe24vPTI7ZC89Mjt4Pj4+PTF9cmV0dXJuKG4reCkvZH07cHJuZy5pbnQzMj1mdW5jdGlvbigpe3JldHVybiBhcmM0LmcoNCl8MH07cHJuZy5xdWljaz1mdW5jdGlvbigpe3JldHVybiBhcmM0LmcoNCkvNDI5NDk2NzI5Nn07cHJuZy5kb3VibGU9cHJuZzttaXhrZXkodG9zdHJpbmcoYXJjNC5TKSxwb29sKTtyZXR1cm4ob3B0aW9ucy5wYXNzfHxjYWxsYmFja3x8ZnVuY3Rpb24ocHJuZyxzZWVkLGlzX21hdGhfY2FsbCxzdGF0ZSl7aWYoc3RhdGUpe2lmKHN0YXRlLlMpe2NvcHkoc3RhdGUsYXJjNCl9cHJuZy5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiBjb3B5KGFyYzQse30pfX1pZihpc19tYXRoX2NhbGwpe21hdGhbcm5nbmFtZV09cHJuZztyZXR1cm4gc2VlZH1lbHNlIHJldHVybiBwcm5nfSkocHJuZyxzaG9ydHNlZWQsImdsb2JhbCJpbiBvcHRpb25zP29wdGlvbnMuZ2xvYmFsOnRoaXM9PW1hdGgsb3B0aW9ucy5zdGF0ZSl9ZnVuY3Rpb24gQVJDNChrZXkpe3ZhciB0LGtleWxlbj1rZXkubGVuZ3RoLG1lPXRoaXMsaT0wLGo9bWUuaT1tZS5qPTAscz1tZS5TPVtdO2lmKCFrZXlsZW4pe2tleT1ba2V5bGVuKytdfXdoaWxlKGk8d2lkdGgpe3NbaV09aSsrfWZvcihpPTA7aTx3aWR0aDtpKyspe3NbaV09c1tqPW1hc2smaitrZXlbaSVrZXlsZW5dKyh0PXNbaV0pXTtzW2pdPXR9KG1lLmc9ZnVuY3Rpb24oY291bnQpe3ZhciB0LHI9MCxpPW1lLmksaj1tZS5qLHM9bWUuUzt3aGlsZShjb3VudC0tKXt0PXNbaT1tYXNrJmkrMV07cj1yKndpZHRoK3NbbWFzayYoc1tpXT1zW2o9bWFzayZqK3RdKSsoc1tqXT10KV19bWUuaT1pO21lLmo9ajtyZXR1cm4gcn0pKHdpZHRoKX1mdW5jdGlvbiBjb3B5KGYsdCl7dC5pPWYuaTt0Lmo9Zi5qO3QuUz1mLlMuc2xpY2UoKTtyZXR1cm4gdH1mdW5jdGlvbiBmbGF0dGVuKG9iaixkZXB0aCl7dmFyIHJlc3VsdD1bXSx0eXA9dHlwZW9mIG9iaixwcm9wO2lmKGRlcHRoJiZ0eXA9PSJvYmplY3QiKXtmb3IocHJvcCBpbiBvYmope3RyeXtyZXN1bHQucHVzaChmbGF0dGVuKG9ialtwcm9wXSxkZXB0aC0xKSl9Y2F0Y2goZSl7fX19cmV0dXJuIHJlc3VsdC5sZW5ndGg/cmVzdWx0OnR5cD09InN0cmluZyI/b2JqOm9iaisiXDAifWZ1bmN0aW9uIG1peGtleShzZWVkLGtleSl7dmFyIHN0cmluZ3NlZWQ9c2VlZCsiIixzbWVhcixqPTA7d2hpbGUoajxzdHJpbmdzZWVkLmxlbmd0aCl7a2V5W21hc2smal09bWFzayYoc21lYXJePWtleVttYXNrJmpdKjE5KStzdHJpbmdzZWVkLmNoYXJDb2RlQXQoaisrKX1yZXR1cm4gdG9zdHJpbmcoa2V5KX1mdW5jdGlvbiBhdXRvc2VlZCgpe3RyeXt2YXIgb3V0O2lmKG5vZGVjcnlwdG8mJihvdXQ9bm9kZWNyeXB0by5yYW5kb21CeXRlcykpe291dD1vdXQod2lkdGgpfWVsc2V7b3V0PW5ldyBVaW50OEFycmF5KHdpZHRoKTsoZ2xvYmFsLmNyeXB0b3x8Z2xvYmFsLm1zQ3J5cHRvKS5nZXRSYW5kb21WYWx1ZXMob3V0KX1yZXR1cm4gdG9zdHJpbmcob3V0KX1jYXRjaChlKXt2YXIgYnJvd3Nlcj1nbG9iYWwubmF2aWdhdG9yLHBsdWdpbnM9YnJvd3NlciYmYnJvd3Nlci5wbHVnaW5zO3JldHVyblsrbmV3IERhdGUsZ2xvYmFsLHBsdWdpbnMsZ2xvYmFsLnNjcmVlbix0b3N0cmluZyhwb29sKV19fWZ1bmN0aW9uIHRvc3RyaW5nKGEpe3JldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KDAsYSl9bWl4a2V5KG1hdGgucmFuZG9tKCkscG9vbCk7aWYodHlwZW9mIG1vZHVsZT09Im9iamVjdCImJm1vZHVsZS5leHBvcnRzKXttb2R1bGUuZXhwb3J0cz1zZWVkcmFuZG9tO3RyeXtub2RlY3J5cHRvPXJlcXVpcmUoImNyeXB0byIpfWNhdGNoKGV4KXt9fWVsc2UgaWYodHlwZW9mIGRlZmluZT09ImZ1bmN0aW9uIiYmZGVmaW5lLmFtZCl7ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIHNlZWRyYW5kb219KX1lbHNle21hdGhbInNlZWQiK3JuZ25hbWVdPXNlZWRyYW5kb219fSkoW10sTWF0aCl9LHtjcnlwdG86MjZ9XSw5NDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjtmdW5jdGlvbiBIYXNoKGJsb2NrU2l6ZSxmaW5hbFNpemUpe3RoaXMuX2Jsb2NrPUJ1ZmZlci5hbGxvYyhibG9ja1NpemUpO3RoaXMuX2ZpbmFsU2l6ZT1maW5hbFNpemU7dGhpcy5fYmxvY2tTaXplPWJsb2NrU2l6ZTt0aGlzLl9sZW49MH1IYXNoLnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24oZGF0YSxlbmMpe2lmKHR5cGVvZiBkYXRhPT09InN0cmluZyIpe2VuYz1lbmN8fCJ1dGY4IjtkYXRhPUJ1ZmZlci5mcm9tKGRhdGEsZW5jKX12YXIgYmxvY2s9dGhpcy5fYmxvY2s7dmFyIGJsb2NrU2l6ZT10aGlzLl9ibG9ja1NpemU7dmFyIGxlbmd0aD1kYXRhLmxlbmd0aDt2YXIgYWNjdW09dGhpcy5fbGVuO2Zvcih2YXIgb2Zmc2V0PTA7b2Zmc2V0PGxlbmd0aDspe3ZhciBhc3NpZ25lZD1hY2N1bSVibG9ja1NpemU7dmFyIHJlbWFpbmRlcj1NYXRoLm1pbihsZW5ndGgtb2Zmc2V0LGJsb2NrU2l6ZS1hc3NpZ25lZCk7Zm9yKHZhciBpPTA7aTxyZW1haW5kZXI7aSsrKXtibG9ja1thc3NpZ25lZCtpXT1kYXRhW29mZnNldCtpXX1hY2N1bSs9cmVtYWluZGVyO29mZnNldCs9cmVtYWluZGVyO2lmKGFjY3VtJWJsb2NrU2l6ZT09PTApe3RoaXMuX3VwZGF0ZShibG9jayl9fXRoaXMuX2xlbis9bGVuZ3RoO3JldHVybiB0aGlzfTtIYXNoLnByb3RvdHlwZS5kaWdlc3Q9ZnVuY3Rpb24oZW5jKXt2YXIgcmVtPXRoaXMuX2xlbiV0aGlzLl9ibG9ja1NpemU7dGhpcy5fYmxvY2tbcmVtXT0xMjg7dGhpcy5fYmxvY2suZmlsbCgwLHJlbSsxKTtpZihyZW0+PXRoaXMuX2ZpbmFsU2l6ZSl7dGhpcy5fdXBkYXRlKHRoaXMuX2Jsb2NrKTt0aGlzLl9ibG9jay5maWxsKDApfXZhciBiaXRzPXRoaXMuX2xlbio4O2lmKGJpdHM8PTQyOTQ5NjcyOTUpe3RoaXMuX2Jsb2NrLndyaXRlVUludDMyQkUoYml0cyx0aGlzLl9ibG9ja1NpemUtNCl9ZWxzZXt2YXIgbG93Qml0cz0oYml0cyY0Mjk0OTY3Mjk1KT4+PjA7dmFyIGhpZ2hCaXRzPShiaXRzLWxvd0JpdHMpLzQyOTQ5NjcyOTY7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJCRShoaWdoQml0cyx0aGlzLl9ibG9ja1NpemUtOCk7dGhpcy5fYmxvY2sud3JpdGVVSW50MzJCRShsb3dCaXRzLHRoaXMuX2Jsb2NrU2l6ZS00KX10aGlzLl91cGRhdGUodGhpcy5fYmxvY2spO3ZhciBoYXNoPXRoaXMuX2hhc2goKTtyZXR1cm4gZW5jP2hhc2gudG9TdHJpbmcoZW5jKTpoYXNofTtIYXNoLnByb3RvdHlwZS5fdXBkYXRlPWZ1bmN0aW9uKCl7dGhyb3cgbmV3IEVycm9yKCJfdXBkYXRlIG11c3QgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3MiKX07bW9kdWxlLmV4cG9ydHM9SGFzaH0seyJzYWZlLWJ1ZmZlciI6ODN9XSw5NTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGV4cG9ydHM9bW9kdWxlLmV4cG9ydHM9ZnVuY3Rpb24gU0hBKGFsZ29yaXRobSl7YWxnb3JpdGhtPWFsZ29yaXRobS50b0xvd2VyQ2FzZSgpO3ZhciBBbGdvcml0aG09ZXhwb3J0c1thbGdvcml0aG1dO2lmKCFBbGdvcml0aG0pdGhyb3cgbmV3IEVycm9yKGFsZ29yaXRobSsiIGlzIG5vdCBzdXBwb3J0ZWQgKHdlIGFjY2VwdCBwdWxsIHJlcXVlc3RzKSIpO3JldHVybiBuZXcgQWxnb3JpdGhtfTtleHBvcnRzLnNoYT1yZXF1aXJlKCIuL3NoYSIpO2V4cG9ydHMuc2hhMT1yZXF1aXJlKCIuL3NoYTEiKTtleHBvcnRzLnNoYTIyND1yZXF1aXJlKCIuL3NoYTIyNCIpO2V4cG9ydHMuc2hhMjU2PXJlcXVpcmUoIi4vc2hhMjU2Iik7ZXhwb3J0cy5zaGEzODQ9cmVxdWlyZSgiLi9zaGEzODQiKTtleHBvcnRzLnNoYTUxMj1yZXF1aXJlKCIuL3NoYTUxMiIpfSx7Ii4vc2hhIjo5NiwiLi9zaGExIjo5NywiLi9zaGEyMjQiOjk4LCIuL3NoYTI1NiI6OTksIi4vc2hhMzg0IjoxMDAsIi4vc2hhNTEyIjoxMDF9XSw5NjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIEhhc2g9cmVxdWlyZSgiLi9oYXNoIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgSz1bMTUxODUwMDI0OSwxODU5Nzc1MzkzLDI0MDA5NTk3MDh8MCwzMzk1NDY5NzgyfDBdO3ZhciBXPW5ldyBBcnJheSg4MCk7ZnVuY3Rpb24gU2hhKCl7dGhpcy5pbml0KCk7dGhpcy5fdz1XO0hhc2guY2FsbCh0aGlzLDY0LDU2KX1pbmhlcml0cyhTaGEsSGFzaCk7U2hhLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dGhpcy5fYT0xNzMyNTg0MTkzO3RoaXMuX2I9NDAyMzIzMzQxNzt0aGlzLl9jPTI1NjIzODMxMDI7dGhpcy5fZD0yNzE3MzM4Nzg7dGhpcy5fZT0zMjg1Mzc3NTIwO3JldHVybiB0aGlzfTtmdW5jdGlvbiByb3RsNShudW0pe3JldHVybiBudW08PDV8bnVtPj4+Mjd9ZnVuY3Rpb24gcm90bDMwKG51bSl7cmV0dXJuIG51bTw8MzB8bnVtPj4+Mn1mdW5jdGlvbiBmdChzLGIsYyxkKXtpZihzPT09MClyZXR1cm4gYiZjfH5iJmQ7aWYocz09PTIpcmV0dXJuIGImY3xiJmR8YyZkO3JldHVybiBiXmNeZH1TaGEucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oTSl7dmFyIFc9dGhpcy5fdzt2YXIgYT10aGlzLl9hfDA7dmFyIGI9dGhpcy5fYnwwO3ZhciBjPXRoaXMuX2N8MDt2YXIgZD10aGlzLl9kfDA7dmFyIGU9dGhpcy5fZXwwO2Zvcih2YXIgaT0wO2k8MTY7KytpKVdbaV09TS5yZWFkSW50MzJCRShpKjQpO2Zvcig7aTw4MDsrK2kpV1tpXT1XW2ktM11eV1tpLThdXldbaS0xNF1eV1tpLTE2XTtmb3IodmFyIGo9MDtqPDgwOysrail7dmFyIHM9fn4oai8yMCk7dmFyIHQ9cm90bDUoYSkrZnQocyxiLGMsZCkrZStXW2pdK0tbc118MDtlPWQ7ZD1jO2M9cm90bDMwKGIpO2I9YTthPXR9dGhpcy5fYT1hK3RoaXMuX2F8MDt0aGlzLl9iPWIrdGhpcy5fYnwwO3RoaXMuX2M9Yyt0aGlzLl9jfDA7dGhpcy5fZD1kK3RoaXMuX2R8MDt0aGlzLl9lPWUrdGhpcy5fZXwwfTtTaGEucHJvdG90eXBlLl9oYXNoPWZ1bmN0aW9uKCl7dmFyIEg9QnVmZmVyLmFsbG9jVW5zYWZlKDIwKTtILndyaXRlSW50MzJCRSh0aGlzLl9hfDAsMCk7SC53cml0ZUludDMyQkUodGhpcy5fYnwwLDQpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2N8MCw4KTtILndyaXRlSW50MzJCRSh0aGlzLl9kfDAsMTIpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2V8MCwxNik7cmV0dXJuIEh9O21vZHVsZS5leHBvcnRzPVNoYX0seyIuL2hhc2giOjk0LGluaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODN9XSw5NzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIEhhc2g9cmVxdWlyZSgiLi9oYXNoIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgSz1bMTUxODUwMDI0OSwxODU5Nzc1MzkzLDI0MDA5NTk3MDh8MCwzMzk1NDY5NzgyfDBdO3ZhciBXPW5ldyBBcnJheSg4MCk7ZnVuY3Rpb24gU2hhMSgpe3RoaXMuaW5pdCgpO3RoaXMuX3c9VztIYXNoLmNhbGwodGhpcyw2NCw1Nil9aW5oZXJpdHMoU2hhMSxIYXNoKTtTaGExLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dGhpcy5fYT0xNzMyNTg0MTkzO3RoaXMuX2I9NDAyMzIzMzQxNzt0aGlzLl9jPTI1NjIzODMxMDI7dGhpcy5fZD0yNzE3MzM4Nzg7dGhpcy5fZT0zMjg1Mzc3NTIwO3JldHVybiB0aGlzfTtmdW5jdGlvbiByb3RsMShudW0pe3JldHVybiBudW08PDF8bnVtPj4+MzF9ZnVuY3Rpb24gcm90bDUobnVtKXtyZXR1cm4gbnVtPDw1fG51bT4+PjI3fWZ1bmN0aW9uIHJvdGwzMChudW0pe3JldHVybiBudW08PDMwfG51bT4+PjJ9ZnVuY3Rpb24gZnQocyxiLGMsZCl7aWYocz09PTApcmV0dXJuIGImY3x+YiZkO2lmKHM9PT0yKXJldHVybiBiJmN8YiZkfGMmZDtyZXR1cm4gYl5jXmR9U2hhMS5wcm90b3R5cGUuX3VwZGF0ZT1mdW5jdGlvbihNKXt2YXIgVz10aGlzLl93O3ZhciBhPXRoaXMuX2F8MDt2YXIgYj10aGlzLl9ifDA7dmFyIGM9dGhpcy5fY3wwO3ZhciBkPXRoaXMuX2R8MDt2YXIgZT10aGlzLl9lfDA7Zm9yKHZhciBpPTA7aTwxNjsrK2kpV1tpXT1NLnJlYWRJbnQzMkJFKGkqNCk7Zm9yKDtpPDgwOysraSlXW2ldPXJvdGwxKFdbaS0zXV5XW2ktOF1eV1tpLTE0XV5XW2ktMTZdKTtmb3IodmFyIGo9MDtqPDgwOysrail7dmFyIHM9fn4oai8yMCk7dmFyIHQ9cm90bDUoYSkrZnQocyxiLGMsZCkrZStXW2pdK0tbc118MDtlPWQ7ZD1jO2M9cm90bDMwKGIpO2I9YTthPXR9dGhpcy5fYT1hK3RoaXMuX2F8MDt0aGlzLl9iPWIrdGhpcy5fYnwwO3RoaXMuX2M9Yyt0aGlzLl9jfDA7dGhpcy5fZD1kK3RoaXMuX2R8MDt0aGlzLl9lPWUrdGhpcy5fZXwwfTtTaGExLnByb3RvdHlwZS5faGFzaD1mdW5jdGlvbigpe3ZhciBIPUJ1ZmZlci5hbGxvY1Vuc2FmZSgyMCk7SC53cml0ZUludDMyQkUodGhpcy5fYXwwLDApO0gud3JpdGVJbnQzMkJFKHRoaXMuX2J8MCw0KTtILndyaXRlSW50MzJCRSh0aGlzLl9jfDAsOCk7SC53cml0ZUludDMyQkUodGhpcy5fZHwwLDEyKTtILndyaXRlSW50MzJCRSh0aGlzLl9lfDAsMTYpO3JldHVybiBIfTttb2R1bGUuZXhwb3J0cz1TaGExfSx7Ii4vaGFzaCI6OTQsaW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4M31dLDk4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgU2hhMjU2PXJlcXVpcmUoIi4vc2hhMjU2Iik7dmFyIEhhc2g9cmVxdWlyZSgiLi9oYXNoIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgVz1uZXcgQXJyYXkoNjQpO2Z1bmN0aW9uIFNoYTIyNCgpe3RoaXMuaW5pdCgpO3RoaXMuX3c9VztIYXNoLmNhbGwodGhpcyw2NCw1Nil9aW5oZXJpdHMoU2hhMjI0LFNoYTI1Nik7U2hhMjI0LnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dGhpcy5fYT0zMjM4MzcxMDMyO3RoaXMuX2I9OTE0MTUwNjYzO3RoaXMuX2M9ODEyNzAyOTk5O3RoaXMuX2Q9NDE0NDkxMjY5Nzt0aGlzLl9lPTQyOTA3NzU4NTc7dGhpcy5fZj0xNzUwNjAzMDI1O3RoaXMuX2c9MTY5NDA3NjgzOTt0aGlzLl9oPTMyMDQwNzU0Mjg7cmV0dXJuIHRoaXN9O1NoYTIyNC5wcm90b3R5cGUuX2hhc2g9ZnVuY3Rpb24oKXt2YXIgSD1CdWZmZXIuYWxsb2NVbnNhZmUoMjgpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2EsMCk7SC53cml0ZUludDMyQkUodGhpcy5fYiw0KTtILndyaXRlSW50MzJCRSh0aGlzLl9jLDgpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2QsMTIpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2UsMTYpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2YsMjApO0gud3JpdGVJbnQzMkJFKHRoaXMuX2csMjQpO3JldHVybiBIfTttb2R1bGUuZXhwb3J0cz1TaGEyMjR9LHsiLi9oYXNoIjo5NCwiLi9zaGEyNTYiOjk5LGluaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODN9XSw5OTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7dmFyIEhhc2g9cmVxdWlyZSgiLi9oYXNoIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgSz1bMTExNjM1MjQwOCwxODk5NDQ3NDQxLDMwNDkzMjM0NzEsMzkyMTAwOTU3Myw5NjE5ODcxNjMsMTUwODk3MDk5MywyNDUzNjM1NzQ4LDI4NzA3NjMyMjEsMzYyNDM4MTA4MCwzMTA1OTg0MDEsNjA3MjI1Mjc4LDE0MjY4ODE5ODcsMTkyNTA3ODM4OCwyMTYyMDc4MjA2LDI2MTQ4ODgxMDMsMzI0ODIyMjU4MCwzODM1MzkwNDAxLDQwMjIyMjQ3NzQsMjY0MzQ3MDc4LDYwNDgwNzYyOCw3NzAyNTU5ODMsMTI0OTE1MDEyMiwxNTU1MDgxNjkyLDE5OTYwNjQ5ODYsMjU1NDIyMDg4MiwyODIxODM0MzQ5LDI5NTI5OTY4MDgsMzIxMDMxMzY3MSwzMzM2NTcxODkxLDM1ODQ1Mjg3MTEsMTEzOTI2OTkzLDMzODI0MTg5NSw2NjYzMDcyMDUsNzczNTI5OTEyLDEyOTQ3NTczNzIsMTM5NjE4MjI5MSwxNjk1MTgzNzAwLDE5ODY2NjEwNTEsMjE3NzAyNjM1MCwyNDU2OTU2MDM3LDI3MzA0ODU5MjEsMjgyMDMwMjQxMSwzMjU5NzMwODAwLDMzNDU3NjQ3NzEsMzUxNjA2NTgxNywzNjAwMzUyODA0LDQwOTQ1NzE5MDksMjc1NDIzMzQ0LDQzMDIyNzczNCw1MDY5NDg2MTYsNjU5MDYwNTU2LDg4Mzk5Nzg3Nyw5NTgxMzk1NzEsMTMyMjgyMjIxOCwxNTM3MDAyMDYzLDE3NDc4NzM3NzksMTk1NTU2MjIyMiwyMDI0MTA0ODE1LDIyMjc3MzA0NTIsMjM2MTg1MjQyNCwyNDI4NDM2NDc0LDI3NTY3MzQxODcsMzIwNDAzMTQ3OSwzMzI5MzI1Mjk4XTt2YXIgVz1uZXcgQXJyYXkoNjQpO2Z1bmN0aW9uIFNoYTI1Nigpe3RoaXMuaW5pdCgpO3RoaXMuX3c9VztIYXNoLmNhbGwodGhpcyw2NCw1Nil9aW5oZXJpdHMoU2hhMjU2LEhhc2gpO1NoYTI1Ni5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3RoaXMuX2E9MTc3OTAzMzcwMzt0aGlzLl9iPTMxNDQxMzQyNzc7dGhpcy5fYz0xMDEzOTA0MjQyO3RoaXMuX2Q9Mjc3MzQ4MDc2Mjt0aGlzLl9lPTEzNTk4OTMxMTk7dGhpcy5fZj0yNjAwODIyOTI0O3RoaXMuX2c9NTI4NzM0NjM1O3RoaXMuX2g9MTU0MTQ1OTIyNTtyZXR1cm4gdGhpc307ZnVuY3Rpb24gY2goeCx5LHope3JldHVybiB6XngmKHleeil9ZnVuY3Rpb24gbWFqKHgseSx6KXtyZXR1cm4geCZ5fHomKHh8eSl9ZnVuY3Rpb24gc2lnbWEwKHgpe3JldHVybih4Pj4+Mnx4PDwzMCleKHg+Pj4xM3x4PDwxOSleKHg+Pj4yMnx4PDwxMCl9ZnVuY3Rpb24gc2lnbWExKHgpe3JldHVybih4Pj4+Nnx4PDwyNileKHg+Pj4xMXx4PDwyMSleKHg+Pj4yNXx4PDw3KX1mdW5jdGlvbiBnYW1tYTAoeCl7cmV0dXJuKHg+Pj43fHg8PDI1KV4oeD4+PjE4fHg8PDE0KV54Pj4+M31mdW5jdGlvbiBnYW1tYTEoeCl7cmV0dXJuKHg+Pj4xN3x4PDwxNSleKHg+Pj4xOXx4PDwxMyleeD4+PjEwfVNoYTI1Ni5wcm90b3R5cGUuX3VwZGF0ZT1mdW5jdGlvbihNKXt2YXIgVz10aGlzLl93O3ZhciBhPXRoaXMuX2F8MDt2YXIgYj10aGlzLl9ifDA7dmFyIGM9dGhpcy5fY3wwO3ZhciBkPXRoaXMuX2R8MDt2YXIgZT10aGlzLl9lfDA7dmFyIGY9dGhpcy5fZnwwO3ZhciBnPXRoaXMuX2d8MDt2YXIgaD10aGlzLl9ofDA7Zm9yKHZhciBpPTA7aTwxNjsrK2kpV1tpXT1NLnJlYWRJbnQzMkJFKGkqNCk7Zm9yKDtpPDY0OysraSlXW2ldPWdhbW1hMShXW2ktMl0pK1dbaS03XStnYW1tYTAoV1tpLTE1XSkrV1tpLTE2XXwwO2Zvcih2YXIgaj0wO2o8NjQ7KytqKXt2YXIgVDE9aCtzaWdtYTEoZSkrY2goZSxmLGcpK0tbal0rV1tqXXwwO3ZhciBUMj1zaWdtYTAoYSkrbWFqKGEsYixjKXwwO2g9ZztnPWY7Zj1lO2U9ZCtUMXwwO2Q9YztjPWI7Yj1hO2E9VDErVDJ8MH10aGlzLl9hPWErdGhpcy5fYXwwO3RoaXMuX2I9Yit0aGlzLl9ifDA7dGhpcy5fYz1jK3RoaXMuX2N8MDt0aGlzLl9kPWQrdGhpcy5fZHwwO3RoaXMuX2U9ZSt0aGlzLl9lfDA7dGhpcy5fZj1mK3RoaXMuX2Z8MDt0aGlzLl9nPWcrdGhpcy5fZ3wwO3RoaXMuX2g9aCt0aGlzLl9ofDB9O1NoYTI1Ni5wcm90b3R5cGUuX2hhc2g9ZnVuY3Rpb24oKXt2YXIgSD1CdWZmZXIuYWxsb2NVbnNhZmUoMzIpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2EsMCk7SC53cml0ZUludDMyQkUodGhpcy5fYiw0KTtILndyaXRlSW50MzJCRSh0aGlzLl9jLDgpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2QsMTIpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2UsMTYpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2YsMjApO0gud3JpdGVJbnQzMkJFKHRoaXMuX2csMjQpO0gud3JpdGVJbnQzMkJFKHRoaXMuX2gsMjgpO3JldHVybiBIfTttb2R1bGUuZXhwb3J0cz1TaGEyNTZ9LHsiLi9oYXNoIjo5NCxpbmhlcml0czozNiwic2FmZS1idWZmZXIiOjgzfV0sMTAwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXt2YXIgaW5oZXJpdHM9cmVxdWlyZSgiaW5oZXJpdHMiKTt2YXIgU0hBNTEyPXJlcXVpcmUoIi4vc2hhNTEyIik7dmFyIEhhc2g9cmVxdWlyZSgiLi9oYXNoIik7dmFyIEJ1ZmZlcj1yZXF1aXJlKCJzYWZlLWJ1ZmZlciIpLkJ1ZmZlcjt2YXIgVz1uZXcgQXJyYXkoMTYwKTtmdW5jdGlvbiBTaGEzODQoKXt0aGlzLmluaXQoKTt0aGlzLl93PVc7SGFzaC5jYWxsKHRoaXMsMTI4LDExMil9aW5oZXJpdHMoU2hhMzg0LFNIQTUxMik7U2hhMzg0LnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dGhpcy5fYWg9MzQxODA3MDM2NTt0aGlzLl9iaD0xNjU0MjcwMjUwO3RoaXMuX2NoPTI0Mzg1MjkzNzA7dGhpcy5fZGg9MzU1NDYyMzYwO3RoaXMuX2VoPTE3MzE0MDU0MTU7dGhpcy5fZmg9MjM5NDE4MDIzMTt0aGlzLl9naD0zNjc1MDA4NTI1O3RoaXMuX2hoPTEyMDMwNjI4MTM7dGhpcy5fYWw9MzIzODM3MTAzMjt0aGlzLl9ibD05MTQxNTA2NjM7dGhpcy5fY2w9ODEyNzAyOTk5O3RoaXMuX2RsPTQxNDQ5MTI2OTc7dGhpcy5fZWw9NDI5MDc3NTg1Nzt0aGlzLl9mbD0xNzUwNjAzMDI1O3RoaXMuX2dsPTE2OTQwNzY4Mzk7dGhpcy5faGw9MzIwNDA3NTQyODtyZXR1cm4gdGhpc307U2hhMzg0LnByb3RvdHlwZS5faGFzaD1mdW5jdGlvbigpe3ZhciBIPUJ1ZmZlci5hbGxvY1Vuc2FmZSg0OCk7ZnVuY3Rpb24gd3JpdGVJbnQ2NEJFKGgsbCxvZmZzZXQpe0gud3JpdGVJbnQzMkJFKGgsb2Zmc2V0KTtILndyaXRlSW50MzJCRShsLG9mZnNldCs0KX13cml0ZUludDY0QkUodGhpcy5fYWgsdGhpcy5fYWwsMCk7d3JpdGVJbnQ2NEJFKHRoaXMuX2JoLHRoaXMuX2JsLDgpO3dyaXRlSW50NjRCRSh0aGlzLl9jaCx0aGlzLl9jbCwxNik7d3JpdGVJbnQ2NEJFKHRoaXMuX2RoLHRoaXMuX2RsLDI0KTt3cml0ZUludDY0QkUodGhpcy5fZWgsdGhpcy5fZWwsMzIpO3dyaXRlSW50NjRCRSh0aGlzLl9maCx0aGlzLl9mbCw0MCk7cmV0dXJuIEh9O21vZHVsZS5leHBvcnRzPVNoYTM4NH0seyIuL2hhc2giOjk0LCIuL3NoYTUxMiI6MTAxLGluaGVyaXRzOjM2LCJzYWZlLWJ1ZmZlciI6ODN9XSwxMDE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe3ZhciBpbmhlcml0cz1yZXF1aXJlKCJpbmhlcml0cyIpO3ZhciBIYXNoPXJlcXVpcmUoIi4vaGFzaCIpO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIEs9WzExMTYzNTI0MDgsMzYwOTc2NzQ1OCwxODk5NDQ3NDQxLDYwMjg5MTcyNSwzMDQ5MzIzNDcxLDM5NjQ0ODQzOTksMzkyMTAwOTU3MywyMTczMjk1NTQ4LDk2MTk4NzE2Myw0MDgxNjI4NDcyLDE1MDg5NzA5OTMsMzA1MzgzNDI2NSwyNDUzNjM1NzQ4LDI5Mzc2NzE1NzksMjg3MDc2MzIyMSwzNjY0NjA5NTYwLDM2MjQzODEwODAsMjczNDg4MzM5NCwzMTA1OTg0MDEsMTE2NDk5NjU0Miw2MDcyMjUyNzgsMTMyMzYxMDc2NCwxNDI2ODgxOTg3LDM1OTAzMDQ5OTQsMTkyNTA3ODM4OCw0MDY4MTgyMzgzLDIxNjIwNzgyMDYsOTkxMzM2MTEzLDI2MTQ4ODgxMDMsNjMzODAzMzE3LDMyNDgyMjI1ODAsMzQ3OTc3NDg2OCwzODM1MzkwNDAxLDI2NjY2MTM0NTgsNDAyMjIyNDc3NCw5NDQ3MTExMzksMjY0MzQ3MDc4LDIzNDEyNjI3NzMsNjA0ODA3NjI4LDIwMDc4MDA5MzMsNzcwMjU1OTgzLDE0OTU5OTA5MDEsMTI0OTE1MDEyMiwxODU2NDMxMjM1LDE1NTUwODE2OTIsMzE3NTIxODEzMiwxOTk2MDY0OTg2LDIxOTg5NTA4MzcsMjU1NDIyMDg4MiwzOTk5NzE5MzM5LDI4MjE4MzQzNDksNzY2Nzg0MDE2LDI5NTI5OTY4MDgsMjU2NjU5NDg3OSwzMjEwMzEzNjcxLDMyMDMzMzc5NTYsMzMzNjU3MTg5MSwxMDM0NDU3MDI2LDM1ODQ1Mjg3MTEsMjQ2Njk0ODkwMSwxMTM5MjY5OTMsMzc1ODMyNjM4MywzMzgyNDE4OTUsMTY4NzE3OTM2LDY2NjMwNzIwNSwxMTg4MTc5OTY0LDc3MzUyOTkxMiwxNTQ2MDQ1NzM0LDEyOTQ3NTczNzIsMTUyMjgwNTQ4NSwxMzk2MTgyMjkxLDI2NDM4MzM4MjMsMTY5NTE4MzcwMCwyMzQzNTI3MzkwLDE5ODY2NjEwNTEsMTAxNDQ3NzQ4MCwyMTc3MDI2MzUwLDEyMDY3NTkxNDIsMjQ1Njk1NjAzNywzNDQwNzc2MjcsMjczMDQ4NTkyMSwxMjkwODYzNDYwLDI4MjAzMDI0MTEsMzE1ODQ1NDI3MywzMjU5NzMwODAwLDM1MDU5NTI2NTcsMzM0NTc2NDc3MSwxMDYyMTcwMDgsMzUxNjA2NTgxNywzNjA2MDA4MzQ0LDM2MDAzNTI4MDQsMTQzMjcyNTc3Niw0MDk0NTcxOTA5LDE0NjcwMzE1OTQsMjc1NDIzMzQ0LDg1MTE2OTcyMCw0MzAyMjc3MzQsMzEwMDgyMzc1Miw1MDY5NDg2MTYsMTM2MzI1ODE5NSw2NTkwNjA1NTYsMzc1MDY4NTU5Myw4ODM5OTc4NzcsMzc4NTA1MDI4MCw5NTgxMzk1NzEsMzMxODMwNzQyNywxMzIyODIyMjE4LDM4MTI3MjM0MDMsMTUzNzAwMjA2MywyMDAzMDM0OTk1LDE3NDc4NzM3NzksMzYwMjAzNjg5OSwxOTU1NTYyMjIyLDE1NzU5OTAwMTIsMjAyNDEwNDgxNSwxMTI1NTkyOTI4LDIyMjc3MzA0NTIsMjcxNjkwNDMwNiwyMzYxODUyNDI0LDQ0Mjc3NjA0NCwyNDI4NDM2NDc0LDU5MzY5ODM0NCwyNzU2NzM0MTg3LDM3MzMxMTAyNDksMzIwNDAzMTQ3OSwyOTk5MzUxNTczLDMzMjkzMjUyOTgsMzgxNTkyMDQyNywzMzkxNTY5NjE0LDM5MjgzODM5MDAsMzUxNTI2NzI3MSw1NjYyODA3MTEsMzk0MDE4NzYwNiwzNDU0MDY5NTM0LDQxMTg2MzAyNzEsNDAwMDIzOTk5MiwxMTY0MTg0NzQsMTkxNDEzODU1NCwxNzQyOTI0MjEsMjczMTA1NTI3MCwyODkzODAzNTYsMzIwMzk5MzAwNiw0NjAzOTMyNjksMzIwNjIwMzE1LDY4NTQ3MTczMyw1ODc0OTY4MzYsODUyMTQyOTcxLDEwODY3OTI4NTEsMTAxNzAzNjI5OCwzNjU1NDMxMDAsMTEyNjAwMDU4MCwyNjE4Mjk3Njc2LDEyODgwMzM0NzAsMzQwOTg1NTE1OCwxNTAxNTA1OTQ4LDQyMzQ1MDk4NjYsMTYwNzE2NzkxNSw5ODcxNjc0NjgsMTgxNjQwMjMxNiwxMjQ2MTg5NTkxXTt2YXIgVz1uZXcgQXJyYXkoMTYwKTtmdW5jdGlvbiBTaGE1MTIoKXt0aGlzLmluaXQoKTt0aGlzLl93PVc7SGFzaC5jYWxsKHRoaXMsMTI4LDExMil9aW5oZXJpdHMoU2hhNTEyLEhhc2gpO1NoYTUxMi5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3RoaXMuX2FoPTE3NzkwMzM3MDM7dGhpcy5fYmg9MzE0NDEzNDI3Nzt0aGlzLl9jaD0xMDEzOTA0MjQyO3RoaXMuX2RoPTI3NzM0ODA3NjI7dGhpcy5fZWg9MTM1OTg5MzExOTt0aGlzLl9maD0yNjAwODIyOTI0O3RoaXMuX2doPTUyODczNDYzNTt0aGlzLl9oaD0xNTQxNDU5MjI1O3RoaXMuX2FsPTQwODkyMzU3MjA7dGhpcy5fYmw9MjIyNzg3MzU5NTt0aGlzLl9jbD00MjcxMTc1NzIzO3RoaXMuX2RsPTE1OTU3NTAxMjk7dGhpcy5fZWw9MjkxNzU2NTEzNzt0aGlzLl9mbD03MjU1MTExOTk7dGhpcy5fZ2w9NDIxNTM4OTU0Nzt0aGlzLl9obD0zMjcwMzMyMDk7cmV0dXJuIHRoaXN9O2Z1bmN0aW9uIENoKHgseSx6KXtyZXR1cm4gel54Jih5XnopfWZ1bmN0aW9uIG1haih4LHkseil7cmV0dXJuIHgmeXx6Jih4fHkpfWZ1bmN0aW9uIHNpZ21hMCh4LHhsKXtyZXR1cm4oeD4+PjI4fHhsPDw0KV4oeGw+Pj4yfHg8PDMwKV4oeGw+Pj43fHg8PDI1KX1mdW5jdGlvbiBzaWdtYTEoeCx4bCl7cmV0dXJuKHg+Pj4xNHx4bDw8MTgpXih4Pj4+MTh8eGw8PDE0KV4oeGw+Pj45fHg8PDIzKX1mdW5jdGlvbiBHYW1tYTAoeCx4bCl7cmV0dXJuKHg+Pj4xfHhsPDwzMSleKHg+Pj44fHhsPDwyNCleeD4+Pjd9ZnVuY3Rpb24gR2FtbWEwbCh4LHhsKXtyZXR1cm4oeD4+PjF8eGw8PDMxKV4oeD4+Pjh8eGw8PDI0KV4oeD4+Pjd8eGw8PDI1KX1mdW5jdGlvbiBHYW1tYTEoeCx4bCl7cmV0dXJuKHg+Pj4xOXx4bDw8MTMpXih4bD4+PjI5fHg8PDMpXng+Pj42fWZ1bmN0aW9uIEdhbW1hMWwoeCx4bCl7cmV0dXJuKHg+Pj4xOXx4bDw8MTMpXih4bD4+PjI5fHg8PDMpXih4Pj4+Nnx4bDw8MjYpfWZ1bmN0aW9uIGdldENhcnJ5KGEsYil7cmV0dXJuIGE+Pj4wPGI+Pj4wPzE6MH1TaGE1MTIucHJvdG90eXBlLl91cGRhdGU9ZnVuY3Rpb24oTSl7dmFyIFc9dGhpcy5fdzt2YXIgYWg9dGhpcy5fYWh8MDt2YXIgYmg9dGhpcy5fYmh8MDt2YXIgY2g9dGhpcy5fY2h8MDt2YXIgZGg9dGhpcy5fZGh8MDt2YXIgZWg9dGhpcy5fZWh8MDt2YXIgZmg9dGhpcy5fZmh8MDt2YXIgZ2g9dGhpcy5fZ2h8MDt2YXIgaGg9dGhpcy5faGh8MDt2YXIgYWw9dGhpcy5fYWx8MDt2YXIgYmw9dGhpcy5fYmx8MDt2YXIgY2w9dGhpcy5fY2x8MDt2YXIgZGw9dGhpcy5fZGx8MDt2YXIgZWw9dGhpcy5fZWx8MDt2YXIgZmw9dGhpcy5fZmx8MDt2YXIgZ2w9dGhpcy5fZ2x8MDt2YXIgaGw9dGhpcy5faGx8MDtmb3IodmFyIGk9MDtpPDMyO2krPTIpe1dbaV09TS5yZWFkSW50MzJCRShpKjQpO1dbaSsxXT1NLnJlYWRJbnQzMkJFKGkqNCs0KX1mb3IoO2k8MTYwO2krPTIpe3ZhciB4aD1XW2ktMTUqMl07dmFyIHhsPVdbaS0xNSoyKzFdO3ZhciBnYW1tYTA9R2FtbWEwKHhoLHhsKTt2YXIgZ2FtbWEwbD1HYW1tYTBsKHhsLHhoKTt4aD1XW2ktMioyXTt4bD1XW2ktMioyKzFdO3ZhciBnYW1tYTE9R2FtbWExKHhoLHhsKTt2YXIgZ2FtbWExbD1HYW1tYTFsKHhsLHhoKTt2YXIgV2k3aD1XW2ktNyoyXTt2YXIgV2k3bD1XW2ktNyoyKzFdO3ZhciBXaTE2aD1XW2ktMTYqMl07dmFyIFdpMTZsPVdbaS0xNioyKzFdO3ZhciBXaWw9Z2FtbWEwbCtXaTdsfDA7dmFyIFdpaD1nYW1tYTArV2k3aCtnZXRDYXJyeShXaWwsZ2FtbWEwbCl8MDtXaWw9V2lsK2dhbW1hMWx8MDtXaWg9V2loK2dhbW1hMStnZXRDYXJyeShXaWwsZ2FtbWExbCl8MDtXaWw9V2lsK1dpMTZsfDA7V2loPVdpaCtXaTE2aCtnZXRDYXJyeShXaWwsV2kxNmwpfDA7V1tpXT1XaWg7V1tpKzFdPVdpbH1mb3IodmFyIGo9MDtqPDE2MDtqKz0yKXtXaWg9V1tqXTtXaWw9V1tqKzFdO3ZhciBtYWpoPW1haihhaCxiaCxjaCk7dmFyIG1hamw9bWFqKGFsLGJsLGNsKTt2YXIgc2lnbWEwaD1zaWdtYTAoYWgsYWwpO3ZhciBzaWdtYTBsPXNpZ21hMChhbCxhaCk7dmFyIHNpZ21hMWg9c2lnbWExKGVoLGVsKTt2YXIgc2lnbWExbD1zaWdtYTEoZWwsZWgpO3ZhciBLaWg9S1tqXTt2YXIgS2lsPUtbaisxXTt2YXIgY2hoPUNoKGVoLGZoLGdoKTt2YXIgY2hsPUNoKGVsLGZsLGdsKTt2YXIgdDFsPWhsK3NpZ21hMWx8MDt2YXIgdDFoPWhoK3NpZ21hMWgrZ2V0Q2FycnkodDFsLGhsKXwwO3QxbD10MWwrY2hsfDA7dDFoPXQxaCtjaGgrZ2V0Q2FycnkodDFsLGNobCl8MDt0MWw9dDFsK0tpbHwwO3QxaD10MWgrS2loK2dldENhcnJ5KHQxbCxLaWwpfDA7dDFsPXQxbCtXaWx8MDt0MWg9dDFoK1dpaCtnZXRDYXJyeSh0MWwsV2lsKXwwO3ZhciB0Mmw9c2lnbWEwbCttYWpsfDA7dmFyIHQyaD1zaWdtYTBoK21hamgrZ2V0Q2FycnkodDJsLHNpZ21hMGwpfDA7aGg9Z2g7aGw9Z2w7Z2g9Zmg7Z2w9Zmw7Zmg9ZWg7Zmw9ZWw7ZWw9ZGwrdDFsfDA7ZWg9ZGgrdDFoK2dldENhcnJ5KGVsLGRsKXwwO2RoPWNoO2RsPWNsO2NoPWJoO2NsPWJsO2JoPWFoO2JsPWFsO2FsPXQxbCt0Mmx8MDthaD10MWgrdDJoK2dldENhcnJ5KGFsLHQxbCl8MH10aGlzLl9hbD10aGlzLl9hbCthbHwwO3RoaXMuX2JsPXRoaXMuX2JsK2JsfDA7dGhpcy5fY2w9dGhpcy5fY2wrY2x8MDt0aGlzLl9kbD10aGlzLl9kbCtkbHwwO3RoaXMuX2VsPXRoaXMuX2VsK2VsfDA7dGhpcy5fZmw9dGhpcy5fZmwrZmx8MDt0aGlzLl9nbD10aGlzLl9nbCtnbHwwO3RoaXMuX2hsPXRoaXMuX2hsK2hsfDA7dGhpcy5fYWg9dGhpcy5fYWgrYWgrZ2V0Q2FycnkodGhpcy5fYWwsYWwpfDA7dGhpcy5fYmg9dGhpcy5fYmgrYmgrZ2V0Q2FycnkodGhpcy5fYmwsYmwpfDA7dGhpcy5fY2g9dGhpcy5fY2grY2grZ2V0Q2FycnkodGhpcy5fY2wsY2wpfDA7dGhpcy5fZGg9dGhpcy5fZGgrZGgrZ2V0Q2FycnkodGhpcy5fZGwsZGwpfDA7dGhpcy5fZWg9dGhpcy5fZWgrZWgrZ2V0Q2FycnkodGhpcy5fZWwsZWwpfDA7dGhpcy5fZmg9dGhpcy5fZmgrZmgrZ2V0Q2FycnkodGhpcy5fZmwsZmwpfDA7dGhpcy5fZ2g9dGhpcy5fZ2grZ2grZ2V0Q2FycnkodGhpcy5fZ2wsZ2wpfDA7dGhpcy5faGg9dGhpcy5faGgraGgrZ2V0Q2FycnkodGhpcy5faGwsaGwpfDB9O1NoYTUxMi5wcm90b3R5cGUuX2hhc2g9ZnVuY3Rpb24oKXt2YXIgSD1CdWZmZXIuYWxsb2NVbnNhZmUoNjQpO2Z1bmN0aW9uIHdyaXRlSW50NjRCRShoLGwsb2Zmc2V0KXtILndyaXRlSW50MzJCRShoLG9mZnNldCk7SC53cml0ZUludDMyQkUobCxvZmZzZXQrNCl9d3JpdGVJbnQ2NEJFKHRoaXMuX2FoLHRoaXMuX2FsLDApO3dyaXRlSW50NjRCRSh0aGlzLl9iaCx0aGlzLl9ibCw4KTt3cml0ZUludDY0QkUodGhpcy5fY2gsdGhpcy5fY2wsMTYpO3dyaXRlSW50NjRCRSh0aGlzLl9kaCx0aGlzLl9kbCwyNCk7d3JpdGVJbnQ2NEJFKHRoaXMuX2VoLHRoaXMuX2VsLDMyKTt3cml0ZUludDY0QkUodGhpcy5fZmgsdGhpcy5fZmwsNDApO3dyaXRlSW50NjRCRSh0aGlzLl9naCx0aGlzLl9nbCw0OCk7d3JpdGVJbnQ2NEJFKHRoaXMuX2hoLHRoaXMuX2hsLDU2KTtyZXR1cm4gSH07bW9kdWxlLmV4cG9ydHM9U2hhNTEyfSx7Ii4vaGFzaCI6OTQsaW5oZXJpdHM6MzYsInNhZmUtYnVmZmVyIjo4M31dLDEwMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7bW9kdWxlLmV4cG9ydHM9U3RyZWFtO3ZhciBFRT1yZXF1aXJlKCJldmVudHMiKS5FdmVudEVtaXR0ZXI7dmFyIGluaGVyaXRzPXJlcXVpcmUoImluaGVyaXRzIik7aW5oZXJpdHMoU3RyZWFtLEVFKTtTdHJlYW0uUmVhZGFibGU9cmVxdWlyZSgicmVhZGFibGUtc3RyZWFtL3JlYWRhYmxlLmpzIik7U3RyZWFtLldyaXRhYmxlPXJlcXVpcmUoInJlYWRhYmxlLXN0cmVhbS93cml0YWJsZS5qcyIpO1N0cmVhbS5EdXBsZXg9cmVxdWlyZSgicmVhZGFibGUtc3RyZWFtL2R1cGxleC5qcyIpO1N0cmVhbS5UcmFuc2Zvcm09cmVxdWlyZSgicmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcyIpO1N0cmVhbS5QYXNzVGhyb3VnaD1yZXF1aXJlKCJyZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2guanMiKTtTdHJlYW0uU3RyZWFtPVN0cmVhbTtmdW5jdGlvbiBTdHJlYW0oKXtFRS5jYWxsKHRoaXMpfVN0cmVhbS5wcm90b3R5cGUucGlwZT1mdW5jdGlvbihkZXN0LG9wdGlvbnMpe3ZhciBzb3VyY2U9dGhpcztmdW5jdGlvbiBvbmRhdGEoY2h1bmspe2lmKGRlc3Qud3JpdGFibGUpe2lmKGZhbHNlPT09ZGVzdC53cml0ZShjaHVuaykmJnNvdXJjZS5wYXVzZSl7c291cmNlLnBhdXNlKCl9fX1zb3VyY2Uub24oImRhdGEiLG9uZGF0YSk7ZnVuY3Rpb24gb25kcmFpbigpe2lmKHNvdXJjZS5yZWFkYWJsZSYmc291cmNlLnJlc3VtZSl7c291cmNlLnJlc3VtZSgpfX1kZXN0Lm9uKCJkcmFpbiIsb25kcmFpbik7aWYoIWRlc3QuX2lzU3RkaW8mJighb3B0aW9uc3x8b3B0aW9ucy5lbmQhPT1mYWxzZSkpe3NvdXJjZS5vbigiZW5kIixvbmVuZCk7c291cmNlLm9uKCJjbG9zZSIsb25jbG9zZSl9dmFyIGRpZE9uRW5kPWZhbHNlO2Z1bmN0aW9uIG9uZW5kKCl7aWYoZGlkT25FbmQpcmV0dXJuO2RpZE9uRW5kPXRydWU7ZGVzdC5lbmQoKX1mdW5jdGlvbiBvbmNsb3NlKCl7aWYoZGlkT25FbmQpcmV0dXJuO2RpZE9uRW5kPXRydWU7aWYodHlwZW9mIGRlc3QuZGVzdHJveT09PSJmdW5jdGlvbiIpZGVzdC5kZXN0cm95KCl9ZnVuY3Rpb24gb25lcnJvcihlcil7Y2xlYW51cCgpO2lmKEVFLmxpc3RlbmVyQ291bnQodGhpcywiZXJyb3IiKT09PTApe3Rocm93IGVyfX1zb3VyY2Uub24oImVycm9yIixvbmVycm9yKTtkZXN0Lm9uKCJlcnJvciIsb25lcnJvcik7ZnVuY3Rpb24gY2xlYW51cCgpe3NvdXJjZS5yZW1vdmVMaXN0ZW5lcigiZGF0YSIsb25kYXRhKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJkcmFpbiIsb25kcmFpbik7c291cmNlLnJlbW92ZUxpc3RlbmVyKCJlbmQiLG9uZW5kKTtzb3VyY2UucmVtb3ZlTGlzdGVuZXIoImNsb3NlIixvbmNsb3NlKTtzb3VyY2UucmVtb3ZlTGlzdGVuZXIoImVycm9yIixvbmVycm9yKTtkZXN0LnJlbW92ZUxpc3RlbmVyKCJlcnJvciIsb25lcnJvcik7c291cmNlLnJlbW92ZUxpc3RlbmVyKCJlbmQiLGNsZWFudXApO3NvdXJjZS5yZW1vdmVMaXN0ZW5lcigiY2xvc2UiLGNsZWFudXApO2Rlc3QucmVtb3ZlTGlzdGVuZXIoImNsb3NlIixjbGVhbnVwKX1zb3VyY2Uub24oImVuZCIsY2xlYW51cCk7c291cmNlLm9uKCJjbG9zZSIsY2xlYW51cCk7ZGVzdC5vbigiY2xvc2UiLGNsZWFudXApO2Rlc3QuZW1pdCgicGlwZSIsc291cmNlKTtyZXR1cm4gZGVzdH19LHtldmVudHM6MzMsaW5oZXJpdHM6MzYsInJlYWRhYmxlLXN0cmVhbS9kdXBsZXguanMiOjY3LCJyZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2guanMiOjc3LCJyZWFkYWJsZS1zdHJlYW0vcmVhZGFibGUuanMiOjc5LCJyZWFkYWJsZS1zdHJlYW0vdHJhbnNmb3JtLmpzIjo4MCwicmVhZGFibGUtc3RyZWFtL3dyaXRhYmxlLmpzIjo4MX1dLDEwMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7InVzZSBzdHJpY3QiO3ZhciBCdWZmZXI9cmVxdWlyZSgic2FmZS1idWZmZXIiKS5CdWZmZXI7dmFyIGlzRW5jb2Rpbmc9QnVmZmVyLmlzRW5jb2Rpbmd8fGZ1bmN0aW9uKGVuY29kaW5nKXtlbmNvZGluZz0iIitlbmNvZGluZztzd2l0Y2goZW5jb2RpbmcmJmVuY29kaW5nLnRvTG93ZXJDYXNlKCkpe2Nhc2UiaGV4IjpjYXNlInV0ZjgiOmNhc2UidXRmLTgiOmNhc2UiYXNjaWkiOmNhc2UiYmluYXJ5IjpjYXNlImJhc2U2NCI6Y2FzZSJ1Y3MyIjpjYXNlInVjcy0yIjpjYXNlInV0ZjE2bGUiOmNhc2UidXRmLTE2bGUiOmNhc2UicmF3IjpyZXR1cm4gdHJ1ZTtkZWZhdWx0OnJldHVybiBmYWxzZX19O2Z1bmN0aW9uIF9ub3JtYWxpemVFbmNvZGluZyhlbmMpe2lmKCFlbmMpcmV0dXJuInV0ZjgiO3ZhciByZXRyaWVkO3doaWxlKHRydWUpe3N3aXRjaChlbmMpe2Nhc2UidXRmOCI6Y2FzZSJ1dGYtOCI6cmV0dXJuInV0ZjgiO2Nhc2UidWNzMiI6Y2FzZSJ1Y3MtMiI6Y2FzZSJ1dGYxNmxlIjpjYXNlInV0Zi0xNmxlIjpyZXR1cm4idXRmMTZsZSI7Y2FzZSJsYXRpbjEiOmNhc2UiYmluYXJ5IjpyZXR1cm4ibGF0aW4xIjtjYXNlImJhc2U2NCI6Y2FzZSJhc2NpaSI6Y2FzZSJoZXgiOnJldHVybiBlbmM7ZGVmYXVsdDppZihyZXRyaWVkKXJldHVybjtlbmM9KCIiK2VuYykudG9Mb3dlckNhc2UoKTtyZXRyaWVkPXRydWV9fX1mdW5jdGlvbiBub3JtYWxpemVFbmNvZGluZyhlbmMpe3ZhciBuZW5jPV9ub3JtYWxpemVFbmNvZGluZyhlbmMpO2lmKHR5cGVvZiBuZW5jIT09InN0cmluZyImJihCdWZmZXIuaXNFbmNvZGluZz09PWlzRW5jb2Rpbmd8fCFpc0VuY29kaW5nKGVuYykpKXRocm93IG5ldyBFcnJvcigiVW5rbm93biBlbmNvZGluZzogIitlbmMpO3JldHVybiBuZW5jfHxlbmN9ZXhwb3J0cy5TdHJpbmdEZWNvZGVyPVN0cmluZ0RlY29kZXI7ZnVuY3Rpb24gU3RyaW5nRGVjb2RlcihlbmNvZGluZyl7dGhpcy5lbmNvZGluZz1ub3JtYWxpemVFbmNvZGluZyhlbmNvZGluZyk7dmFyIG5iO3N3aXRjaCh0aGlzLmVuY29kaW5nKXtjYXNlInV0ZjE2bGUiOnRoaXMudGV4dD11dGYxNlRleHQ7dGhpcy5lbmQ9dXRmMTZFbmQ7bmI9NDticmVhaztjYXNlInV0ZjgiOnRoaXMuZmlsbExhc3Q9dXRmOEZpbGxMYXN0O25iPTQ7YnJlYWs7Y2FzZSJiYXNlNjQiOnRoaXMudGV4dD1iYXNlNjRUZXh0O3RoaXMuZW5kPWJhc2U2NEVuZDtuYj0zO2JyZWFrO2RlZmF1bHQ6dGhpcy53cml0ZT1zaW1wbGVXcml0ZTt0aGlzLmVuZD1zaW1wbGVFbmQ7cmV0dXJufXRoaXMubGFzdE5lZWQ9MDt0aGlzLmxhc3RUb3RhbD0wO3RoaXMubGFzdENoYXI9QnVmZmVyLmFsbG9jVW5zYWZlKG5iKX1TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbihidWYpe2lmKGJ1Zi5sZW5ndGg9PT0wKXJldHVybiIiO3ZhciByO3ZhciBpO2lmKHRoaXMubGFzdE5lZWQpe3I9dGhpcy5maWxsTGFzdChidWYpO2lmKHI9PT11bmRlZmluZWQpcmV0dXJuIiI7aT10aGlzLmxhc3ROZWVkO3RoaXMubGFzdE5lZWQ9MH1lbHNle2k9MH1pZihpPGJ1Zi5sZW5ndGgpcmV0dXJuIHI/cit0aGlzLnRleHQoYnVmLGkpOnRoaXMudGV4dChidWYsaSk7cmV0dXJuIHJ8fCIifTtTdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5lbmQ9dXRmOEVuZDtTdHJpbmdEZWNvZGVyLnByb3RvdHlwZS50ZXh0PXV0ZjhUZXh0O1N0cmluZ0RlY29kZXIucHJvdG90eXBlLmZpbGxMYXN0PWZ1bmN0aW9uKGJ1Zil7aWYodGhpcy5sYXN0TmVlZDw9YnVmLmxlbmd0aCl7YnVmLmNvcHkodGhpcy5sYXN0Q2hhcix0aGlzLmxhc3RUb3RhbC10aGlzLmxhc3ROZWVkLDAsdGhpcy5sYXN0TmVlZCk7cmV0dXJuIHRoaXMubGFzdENoYXIudG9TdHJpbmcodGhpcy5lbmNvZGluZywwLHRoaXMubGFzdFRvdGFsKX1idWYuY29weSh0aGlzLmxhc3RDaGFyLHRoaXMubGFzdFRvdGFsLXRoaXMubGFzdE5lZWQsMCxidWYubGVuZ3RoKTt0aGlzLmxhc3ROZWVkLT1idWYubGVuZ3RofTtmdW5jdGlvbiB1dGY4Q2hlY2tCeXRlKGJ5dGUpe2lmKGJ5dGU8PTEyNylyZXR1cm4gMDtlbHNlIGlmKGJ5dGU+PjU9PT02KXJldHVybiAyO2Vsc2UgaWYoYnl0ZT4+ND09PTE0KXJldHVybiAzO2Vsc2UgaWYoYnl0ZT4+Mz09PTMwKXJldHVybiA0O3JldHVybiBieXRlPj42PT09Mj8tMTotMn1mdW5jdGlvbiB1dGY4Q2hlY2tJbmNvbXBsZXRlKHNlbGYsYnVmLGkpe3ZhciBqPWJ1Zi5sZW5ndGgtMTtpZihqPGkpcmV0dXJuIDA7dmFyIG5iPXV0ZjhDaGVja0J5dGUoYnVmW2pdKTtpZihuYj49MCl7aWYobmI+MClzZWxmLmxhc3ROZWVkPW5iLTE7cmV0dXJuIG5ifWlmKC0tajxpfHxuYj09PS0yKXJldHVybiAwO25iPXV0ZjhDaGVja0J5dGUoYnVmW2pdKTtpZihuYj49MCl7aWYobmI+MClzZWxmLmxhc3ROZWVkPW5iLTI7cmV0dXJuIG5ifWlmKC0tajxpfHxuYj09PS0yKXJldHVybiAwO25iPXV0ZjhDaGVja0J5dGUoYnVmW2pdKTtpZihuYj49MCl7aWYobmI+MCl7aWYobmI9PT0yKW5iPTA7ZWxzZSBzZWxmLmxhc3ROZWVkPW5iLTN9cmV0dXJuIG5ifXJldHVybiAwfWZ1bmN0aW9uIHV0ZjhDaGVja0V4dHJhQnl0ZXMoc2VsZixidWYscCl7aWYoKGJ1ZlswXSYxOTIpIT09MTI4KXtzZWxmLmxhc3ROZWVkPTA7cmV0dXJuIu+/vSJ9aWYoc2VsZi5sYXN0TmVlZD4xJiZidWYubGVuZ3RoPjEpe2lmKChidWZbMV0mMTkyKSE9PTEyOCl7c2VsZi5sYXN0TmVlZD0xO3JldHVybiLvv70ifWlmKHNlbGYubGFzdE5lZWQ+MiYmYnVmLmxlbmd0aD4yKXtpZigoYnVmWzJdJjE5MikhPT0xMjgpe3NlbGYubGFzdE5lZWQ9MjtyZXR1cm4i77+9In19fX1mdW5jdGlvbiB1dGY4RmlsbExhc3QoYnVmKXt2YXIgcD10aGlzLmxhc3RUb3RhbC10aGlzLmxhc3ROZWVkO3ZhciByPXV0ZjhDaGVja0V4dHJhQnl0ZXModGhpcyxidWYscCk7aWYociE9PXVuZGVmaW5lZClyZXR1cm4gcjtpZih0aGlzLmxhc3ROZWVkPD1idWYubGVuZ3RoKXtidWYuY29weSh0aGlzLmxhc3RDaGFyLHAsMCx0aGlzLmxhc3ROZWVkKTtyZXR1cm4gdGhpcy5sYXN0Q2hhci50b1N0cmluZyh0aGlzLmVuY29kaW5nLDAsdGhpcy5sYXN0VG90YWwpfWJ1Zi5jb3B5KHRoaXMubGFzdENoYXIscCwwLGJ1Zi5sZW5ndGgpO3RoaXMubGFzdE5lZWQtPWJ1Zi5sZW5ndGh9ZnVuY3Rpb24gdXRmOFRleHQoYnVmLGkpe3ZhciB0b3RhbD11dGY4Q2hlY2tJbmNvbXBsZXRlKHRoaXMsYnVmLGkpO2lmKCF0aGlzLmxhc3ROZWVkKXJldHVybiBidWYudG9TdHJpbmcoInV0ZjgiLGkpO3RoaXMubGFzdFRvdGFsPXRvdGFsO3ZhciBlbmQ9YnVmLmxlbmd0aC0odG90YWwtdGhpcy5sYXN0TmVlZCk7YnVmLmNvcHkodGhpcy5sYXN0Q2hhciwwLGVuZCk7cmV0dXJuIGJ1Zi50b1N0cmluZygidXRmOCIsaSxlbmQpfWZ1bmN0aW9uIHV0ZjhFbmQoYnVmKXt2YXIgcj1idWYmJmJ1Zi5sZW5ndGg/dGhpcy53cml0ZShidWYpOiIiO2lmKHRoaXMubGFzdE5lZWQpcmV0dXJuIHIrIu+/vSI7cmV0dXJuIHJ9ZnVuY3Rpb24gdXRmMTZUZXh0KGJ1ZixpKXtpZigoYnVmLmxlbmd0aC1pKSUyPT09MCl7dmFyIHI9YnVmLnRvU3RyaW5nKCJ1dGYxNmxlIixpKTtpZihyKXt2YXIgYz1yLmNoYXJDb2RlQXQoci5sZW5ndGgtMSk7aWYoYz49NTUyOTYmJmM8PTU2MzE5KXt0aGlzLmxhc3ROZWVkPTI7dGhpcy5sYXN0VG90YWw9NDt0aGlzLmxhc3RDaGFyWzBdPWJ1ZltidWYubGVuZ3RoLTJdO3RoaXMubGFzdENoYXJbMV09YnVmW2J1Zi5sZW5ndGgtMV07cmV0dXJuIHIuc2xpY2UoMCwtMSl9fXJldHVybiByfXRoaXMubGFzdE5lZWQ9MTt0aGlzLmxhc3RUb3RhbD0yO3RoaXMubGFzdENoYXJbMF09YnVmW2J1Zi5sZW5ndGgtMV07cmV0dXJuIGJ1Zi50b1N0cmluZygidXRmMTZsZSIsaSxidWYubGVuZ3RoLTEpfWZ1bmN0aW9uIHV0ZjE2RW5kKGJ1Zil7dmFyIHI9YnVmJiZidWYubGVuZ3RoP3RoaXMud3JpdGUoYnVmKToiIjtpZih0aGlzLmxhc3ROZWVkKXt2YXIgZW5kPXRoaXMubGFzdFRvdGFsLXRoaXMubGFzdE5lZWQ7cmV0dXJuIHIrdGhpcy5sYXN0Q2hhci50b1N0cmluZygidXRmMTZsZSIsMCxlbmQpfXJldHVybiByfWZ1bmN0aW9uIGJhc2U2NFRleHQoYnVmLGkpe3ZhciBuPShidWYubGVuZ3RoLWkpJTM7aWYobj09PTApcmV0dXJuIGJ1Zi50b1N0cmluZygiYmFzZTY0IixpKTt0aGlzLmxhc3ROZWVkPTMtbjt0aGlzLmxhc3RUb3RhbD0zO2lmKG49PT0xKXt0aGlzLmxhc3RDaGFyWzBdPWJ1ZltidWYubGVuZ3RoLTFdfWVsc2V7dGhpcy5sYXN0Q2hhclswXT1idWZbYnVmLmxlbmd0aC0yXTt0aGlzLmxhc3RDaGFyWzFdPWJ1ZltidWYubGVuZ3RoLTFdfXJldHVybiBidWYudG9TdHJpbmcoImJhc2U2NCIsaSxidWYubGVuZ3RoLW4pfWZ1bmN0aW9uIGJhc2U2NEVuZChidWYpe3ZhciByPWJ1ZiYmYnVmLmxlbmd0aD90aGlzLndyaXRlKGJ1Zik6IiI7aWYodGhpcy5sYXN0TmVlZClyZXR1cm4gcit0aGlzLmxhc3RDaGFyLnRvU3RyaW5nKCJiYXNlNjQiLDAsMy10aGlzLmxhc3ROZWVkKTtyZXR1cm4gcn1mdW5jdGlvbiBzaW1wbGVXcml0ZShidWYpe3JldHVybiBidWYudG9TdHJpbmcodGhpcy5lbmNvZGluZyl9ZnVuY3Rpb24gc2ltcGxlRW5kKGJ1Zil7cmV0dXJuIGJ1ZiYmYnVmLmxlbmd0aD90aGlzLndyaXRlKGJ1Zik6IiJ9fSx7InNhZmUtYnVmZmVyIjoxMDR9XSwxMDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe2FyZ3VtZW50c1s0XVs3Nl1bMF0uYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpfSx7YnVmZmVyOjI3LGR1cDo3Nn1dLDEwNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7KGZ1bmN0aW9uKHNldEltbWVkaWF0ZSxjbGVhckltbWVkaWF0ZSl7dmFyIG5leHRUaWNrPXJlcXVpcmUoInByb2Nlc3MvYnJvd3Nlci5qcyIpLm5leHRUaWNrO3ZhciBhcHBseT1GdW5jdGlvbi5wcm90b3R5cGUuYXBwbHk7dmFyIHNsaWNlPUFycmF5LnByb3RvdHlwZS5zbGljZTt2YXIgaW1tZWRpYXRlSWRzPXt9O3ZhciBuZXh0SW1tZWRpYXRlSWQ9MDtleHBvcnRzLnNldFRpbWVvdXQ9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRUaW1lb3V0LHdpbmRvdyxhcmd1bWVudHMpLGNsZWFyVGltZW91dCl9O2V4cG9ydHMuc2V0SW50ZXJ2YWw9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IFRpbWVvdXQoYXBwbHkuY2FsbChzZXRJbnRlcnZhbCx3aW5kb3csYXJndW1lbnRzKSxjbGVhckludGVydmFsKX07ZXhwb3J0cy5jbGVhclRpbWVvdXQ9ZXhwb3J0cy5jbGVhckludGVydmFsPWZ1bmN0aW9uKHRpbWVvdXQpe3RpbWVvdXQuY2xvc2UoKX07ZnVuY3Rpb24gVGltZW91dChpZCxjbGVhckZuKXt0aGlzLl9pZD1pZDt0aGlzLl9jbGVhckZuPWNsZWFyRm59VGltZW91dC5wcm90b3R5cGUudW5yZWY9VGltZW91dC5wcm90b3R5cGUucmVmPWZ1bmN0aW9uKCl7fTtUaW1lb3V0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3RoaXMuX2NsZWFyRm4uY2FsbCh3aW5kb3csdGhpcy5faWQpfTtleHBvcnRzLmVucm9sbD1mdW5jdGlvbihpdGVtLG1zZWNzKXtjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7aXRlbS5faWRsZVRpbWVvdXQ9bXNlY3N9O2V4cG9ydHMudW5lbnJvbGw9ZnVuY3Rpb24oaXRlbSl7Y2xlYXJUaW1lb3V0KGl0ZW0uX2lkbGVUaW1lb3V0SWQpO2l0ZW0uX2lkbGVUaW1lb3V0PS0xfTtleHBvcnRzLl91bnJlZkFjdGl2ZT1leHBvcnRzLmFjdGl2ZT1mdW5jdGlvbihpdGVtKXtjbGVhclRpbWVvdXQoaXRlbS5faWRsZVRpbWVvdXRJZCk7dmFyIG1zZWNzPWl0ZW0uX2lkbGVUaW1lb3V0O2lmKG1zZWNzPj0wKXtpdGVtLl9pZGxlVGltZW91dElkPXNldFRpbWVvdXQoZnVuY3Rpb24gb25UaW1lb3V0KCl7aWYoaXRlbS5fb25UaW1lb3V0KWl0ZW0uX29uVGltZW91dCgpfSxtc2Vjcyl9fTtleHBvcnRzLnNldEltbWVkaWF0ZT10eXBlb2Ygc2V0SW1tZWRpYXRlPT09ImZ1bmN0aW9uIj9zZXRJbW1lZGlhdGU6ZnVuY3Rpb24oZm4pe3ZhciBpZD1uZXh0SW1tZWRpYXRlSWQrKzt2YXIgYXJncz1hcmd1bWVudHMubGVuZ3RoPDI/ZmFsc2U6c2xpY2UuY2FsbChhcmd1bWVudHMsMSk7aW1tZWRpYXRlSWRzW2lkXT10cnVlO25leHRUaWNrKGZ1bmN0aW9uIG9uTmV4dFRpY2soKXtpZihpbW1lZGlhdGVJZHNbaWRdKXtpZihhcmdzKXtmbi5hcHBseShudWxsLGFyZ3MpfWVsc2V7Zm4uY2FsbChudWxsKX1leHBvcnRzLmNsZWFySW1tZWRpYXRlKGlkKX19KTtyZXR1cm4gaWR9O2V4cG9ydHMuY2xlYXJJbW1lZGlhdGU9dHlwZW9mIGNsZWFySW1tZWRpYXRlPT09ImZ1bmN0aW9uIj9jbGVhckltbWVkaWF0ZTpmdW5jdGlvbihpZCl7ZGVsZXRlIGltbWVkaWF0ZUlkc1tpZF19fSkuY2FsbCh0aGlzLHJlcXVpcmUoInRpbWVycyIpLnNldEltbWVkaWF0ZSxyZXF1aXJlKCJ0aW1lcnMiKS5jbGVhckltbWVkaWF0ZSl9LHsicHJvY2Vzcy9icm93c2VyLmpzIjo2Nix0aW1lcnM6MTA1fV0sMTA2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsoZnVuY3Rpb24oZ2xvYmFsKXttb2R1bGUuZXhwb3J0cz1kZXByZWNhdGU7ZnVuY3Rpb24gZGVwcmVjYXRlKGZuLG1zZyl7aWYoY29uZmlnKCJub0RlcHJlY2F0aW9uIikpe3JldHVybiBmbn12YXIgd2FybmVkPWZhbHNlO2Z1bmN0aW9uIGRlcHJlY2F0ZWQoKXtpZighd2FybmVkKXtpZihjb25maWcoInRocm93RGVwcmVjYXRpb24iKSl7dGhyb3cgbmV3IEVycm9yKG1zZyl9ZWxzZSBpZihjb25maWcoInRyYWNlRGVwcmVjYXRpb24iKSl7Y29uc29sZS50cmFjZShtc2cpfWVsc2V7Y29uc29sZS53YXJuKG1zZyl9d2FybmVkPXRydWV9cmV0dXJuIGZuLmFwcGx5KHRoaXMsYXJndW1lbnRzKX1yZXR1cm4gZGVwcmVjYXRlZH1mdW5jdGlvbiBjb25maWcobmFtZSl7dHJ5e2lmKCFnbG9iYWwubG9jYWxTdG9yYWdlKXJldHVybiBmYWxzZX1jYXRjaChfKXtyZXR1cm4gZmFsc2V9dmFyIHZhbD1nbG9iYWwubG9jYWxTdG9yYWdlW25hbWVdO2lmKG51bGw9PXZhbClyZXR1cm4gZmFsc2U7cmV0dXJuIFN0cmluZyh2YWwpLnRvTG93ZXJDYXNlKCk9PT0idHJ1ZSJ9fSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwhPT0idW5kZWZpbmVkIj9nbG9iYWw6dHlwZW9mIHNlbGYhPT0idW5kZWZpbmVkIj9zZWxmOnR5cGVvZiB3aW5kb3chPT0idW5kZWZpbmVkIj93aW5kb3c6e30pfSx7fV19LHt9LFsyXSk7","base64").toString("utf8");
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
},{"../sync/types":14,"../sync/utils/environnement":16,"../sync/utils/toBuffer":17,"./WorkerThread":6,"./serializer":12,"buffer":2,"minimal-polyfills/dist/lib/Array.from":21,"minimal-polyfills/dist/lib/Map":23,"minimal-polyfills/dist/lib/Set":24,"path":4,"run-exclusive":26}],12:[function(require,module,exports){
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
},{"../sync/utils/toBuffer":17,"buffer":2,"transfer-tools/dist/lib/JSON_CUSTOM":29}],13:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":18}],20:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":19}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{"./Map":23}],25:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var Map_1 = require("./Map");
exports.Polyfill = typeof WeakMap !== "undefined" ? WeakMap : Map_1.Polyfill;

},{"./Map":23}],26:[function(require,module,exports){
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

},{"minimal-polyfills/dist/lib/WeakMap":25}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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
},{"has":20}],29:[function(require,module,exports){
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

},{"super-json":28}],30:[function(require,module,exports){
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

},{"./SyncEventBase":31}],31:[function(require,module,exports){
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

},{"./SyncEventBaseProtected":32}],32:[function(require,module,exports){
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

},{"./defs":33,"minimal-polyfills/dist/lib/Array.prototype.find":22,"minimal-polyfills/dist/lib/Map":23,"run-exclusive":26}],33:[function(require,module,exports){
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

},{"setprototypeof":27}],34:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var SyncEvent_1 = require("./SyncEvent");
exports.SyncEvent = SyncEvent_1.SyncEvent;
exports.VoidSyncEvent = SyncEvent_1.VoidSyncEvent;
var defs_1 = require("./defs");
exports.EvtError = defs_1.EvtError;

},{"./SyncEvent":30,"./defs":33}],35:[function(require,module,exports){
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
var loginPageLogic = require("frontend-shared/dist/lib/pageLogic/loginPageLogic");
var TowardUserKeys_1 = require("frontend-shared/dist/lib/localStorage/TowardUserKeys");
var cryptoLib = require("frontend-shared/node_modules/crypto-lib");
var urlGetParameters = require("frontend-shared/dist/tools/urlGetParameters");
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
                loginPageLogic.login(email, password, undefined, justRegistered, {
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
        loginPageLogic.requestRenewPassword({
            "redirectToRegister": function () { return window.location.href = "/" + availablePages.PageName.register; },
            "getEmail": function () { return $("#email").val(); },
            "setEmail": function (email) { return $("#email").val(email); }
        });
    });
}
$(document).ready(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        setHandlers();
        loginPageLogic.init(urlGetParameters.parseUrl(), {
            "setEmail": function (email) { return $("#email").val(email); },
            "setJustRegistered": function (justRegistered_) { return justRegistered = justRegistered_; },
            "setPassword": function (password) { return $("#password").val(password); },
            "triggerClickLogin": function () { return $("#login-btn").trigger("click"); }
        });
        return [2 /*return*/];
    });
}); });

},{"frontend-shared/dist/lib/availablePages":38,"frontend-shared/dist/lib/localStorage/TowardUserKeys":47,"frontend-shared/dist/lib/nativeModules/hostKfd":52,"frontend-shared/dist/lib/pageLogic/loginPageLogic":55,"frontend-shared/dist/tools/polyfills/Object.assign":66,"frontend-shared/dist/tools/urlGetParameters":67,"frontend-shared/node_modules/crypto-lib":11,"minimal-polyfills/dist/lib/ArrayBuffer.isView":36}],36:[function(require,module,exports){
if (!ArrayBuffer["isView"]) {
    ArrayBuffer.isView = function isView(a) {
        return a !== null && typeof (a) === "object" && a["buffer"] instanceof ArrayBuffer;
    };
}

},{}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var web_api_declaration_1 = require("semasim-gateway/dist/web_api_declaration");
exports.webApiPath = web_api_declaration_1.apiPath;

},{"semasim-gateway/dist/web_api_declaration":84}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
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
},{"../env":43,"../nativeModules/hostCryptoLib":51,"buffer":2,"crypto-lib":11}],40:[function(require,module,exports){
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
},{"../../tools/modal/dialog":63,"./cryptoLibProxy":39,"./kfd":41,"buffer":2,"crypto-lib/dist/sync/utils/binaryDataManipulations":15}],41:[function(require,module,exports){
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
},{"../env":43,"../nativeModules/hostKfd":52,"./cryptoLibProxy":39,"buffer":2}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
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

},{"./impl":42}],44:[function(require,module,exports){
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
var ts_events_extended_1 = require("ts-events-extended");
var localStorageApi = require("./localStorageApi");
var key = "authenticated-session-descriptor-shared-data";
var AuthenticatedSessionDescriptorSharedData;
(function (AuthenticatedSessionDescriptorSharedData) {
    /** Can be used to track when the user is logged in */
    AuthenticatedSessionDescriptorSharedData.evtChange = new ts_events_extended_1.SyncEvent();
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
                        AuthenticatedSessionDescriptorSharedData.evtChange.post(undefined);
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
                        AuthenticatedSessionDescriptorSharedData.evtChange.post(authenticatedSessionDescriptorSharedData);
                        return [2 /*return*/];
                }
            });
        });
    }
    AuthenticatedSessionDescriptorSharedData.set = set;
})(AuthenticatedSessionDescriptorSharedData = exports.AuthenticatedSessionDescriptorSharedData || (exports.AuthenticatedSessionDescriptorSharedData = {}));

}).call(this,require("buffer").Buffer)
},{"./localStorageApi":50,"buffer":2,"ts-events-extended":83}],45:[function(require,module,exports){
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

},{"./localStorageApi":50}],46:[function(require,module,exports){
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

},{"./TowardUserKeys":47,"./localStorageApi":50}],47:[function(require,module,exports){
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

},{"./localStorageApi":50,"crypto-lib/dist/sync/types":14}],48:[function(require,module,exports){
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
var key = "declaredPushNotificationToken";
function get() {
    return __awaiter(this, void 0, void 0, function () {
        var value;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, localStorageApi.getItem(key)];
                case 1:
                    value = _a.sent();
                    if (value === null) {
                        return [2 /*return*/, undefined];
                    }
                    return [2 /*return*/, value];
            }
        });
    });
}
exports.get = get;
function set(value) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, localStorageApi.setItem(key, value)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.set = set;
function remove() {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = null;
                    return [4 /*yield*/, get()];
                case 1:
                    if (_a === (_b.sent())) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, localStorageApi.removeItem(key)];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.remove = remove;

},{"./localStorageApi":50}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = localStorage;

},{}],50:[function(require,module,exports){
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

},{"./asyncOrSyncLocalStorage":49}],51:[function(require,module,exports){
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
var evtAesEncryptOrDecryptResult = new ts_events_extended_1.SyncEvent();
var evtRsaEncryptOrDecryptResult = new ts_events_extended_1.SyncEvent();
var evtRsaGenerateKeysResult = new ts_events_extended_1.SyncEvent();
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

},{"ts-events-extended":83}],52:[function(require,module,exports){
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

},{"ts-events-extended":83}],53:[function(require,module,exports){
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

},{"ts-events-extended":83}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var impl_1 = require("./impl");
exports.getApi = impl_1.getApi;

},{"./impl":53}],55:[function(require,module,exports){
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

},{"../../tools/modal/dialog":63,"../crypto/cryptoLibProxy":39,"../crypto/keysGeneration":40,"../localStorage/JustRegistered":46,"../localStorage/TowardUserKeys":47,"../webApiCaller":59}],56:[function(require,module,exports){
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

},{"../env":43}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var impl_1 = require("./impl");
exports.restartApp = impl_1.default;

},{"./impl":56}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectSidHttpHeaderName = "x-connect-sid";

},{}],59:[function(require,module,exports){
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
var declaredPushNotificationToken = require("../localStorage/declaredPushNotificationToken");
var networkStateMonitoring = require("../networkStateMonitoring");
var evtError = new ts_events_extended_1.SyncEvent();
evtError.attach(function (_a) {
    var methodName = _a.methodName, httpErrorStatus = _a.httpErrorStatus;
    switch (env_1.env.jsRuntimeEnv) {
        case "browser":
            {
                switch (httpErrorStatus) {
                    case 401:
                        restartApp_1.restartApp("Wep api 401");
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
                restartApp_1.restartApp("WebApi Error: " + methodName + " " + httpErrorStatus);
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
/** uaInstanceId should be provided on android/ios and undefined on the web */
exports.loginUser = (function () {
    var methodName = apiDeclaration.loginUser.methodName;
    return function (email, secret, uaInstanceId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = email.toLowerCase();
                        return [4 /*yield*/, sendRequest(methodName, { email: email, secret: secret, uaInstanceId: uaInstanceId })];
                    case 1:
                        response = _a.sent();
                        if (!(response.status !== "SUCCESS")) return [3 /*break*/, 4];
                        if (!(response.status !== "RETRY STILL FORBIDDEN")) return [3 /*break*/, 3];
                        return [4 /*yield*/, Credentials_1.Credentials.remove()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, response];
                    case 4:
                        if (!(env_1.env.jsRuntimeEnv === "react-native")) return [3 /*break*/, 6];
                        return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                var previousCred, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, Credentials_1.Credentials.isPresent()];
                                        case 1:
                                            if (!(_b.sent())) return [3 /*break*/, 3];
                                            return [4 /*yield*/, Credentials_1.Credentials.get()];
                                        case 2:
                                            _a = _b.sent();
                                            return [3 /*break*/, 4];
                                        case 3:
                                            _a = undefined;
                                            _b.label = 4;
                                        case 4:
                                            previousCred = _a;
                                            if (!!previousCred &&
                                                previousCred.email === email &&
                                                previousCred.secret === secret &&
                                                previousCred.uaInstanceId === uaInstanceId) {
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, Promise.all([
                                                    Credentials_1.Credentials.set({
                                                        email: email,
                                                        secret: secret,
                                                        "uaInstanceId": uaInstanceId
                                                    }),
                                                    declaredPushNotificationToken.remove()
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
                    case 6: return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.set({
                            "connect_sid": response.connect_sid,
                            email: email,
                            "encryptedSymmetricKey": response.encryptedSymmetricKey,
                            "uaInstanceId": uaInstanceId === undefined ?
                                response.webUaInstanceId : uaInstanceId
                        })];
                    case 7:
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
                    case 0: return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.isPresent()];
                    case 1:
                        if (!(_a.sent())) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, sendRequest(methodName, undefined)];
                    case 2:
                        isLoggedIn = _a.sent();
                        if (!!isLoggedIn) return [3 /*break*/, 4];
                        return [4 /*yield*/, AuthenticatedSessionDescriptorSharedData_1.AuthenticatedSessionDescriptorSharedData.remove()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, isLoggedIn];
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

},{"../../web_api_declaration":68,"../env":43,"../localStorage/AuthenticatedSessionDescriptorSharedData":44,"../localStorage/Credentials":45,"../localStorage/declaredPushNotificationToken":48,"../networkStateMonitoring":54,"../restartApp":57,"./sendRequest":60,"ts-events-extended":83}],60:[function(require,module,exports){
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

},{"../../gateway/webApiPath":37,"../env":43,"../types/connectSidHttpHeaderName":58,"transfer-tools/dist/lib/JSON_CUSTOM":78}],61:[function(require,module,exports){
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

},{"ts-events-extended":83}],62:[function(require,module,exports){
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

},{"../createGenericProxyForBootstrapModal":61}],63:[function(require,module,exports){
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

},{"../stack":65,"./getApi":62,"./types":64,"run-exclusive":75}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],65:[function(require,module,exports){
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

},{}],66:[function(require,module,exports){
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

},{}],67:[function(require,module,exports){
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

},{}],68:[function(require,module,exports){
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

},{}],69:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],70:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./implementation":69,"dup":19}],71:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20,"function-bind":70}],72:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],73:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],74:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"./Map":73,"dup":25}],75:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26,"minimal-polyfills/dist/lib/WeakMap":74}],76:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],77:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"has":71}],78:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29,"super-json":77}],79:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"./SyncEventBase":80,"dup":30}],80:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./SyncEventBaseProtected":81,"dup":31}],81:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"./defs":82,"dup":32,"minimal-polyfills/dist/lib/Array.prototype.find":72,"minimal-polyfills/dist/lib/Map":73,"run-exclusive":75}],82:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33,"setprototypeof":76}],83:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"./SyncEvent":79,"./defs":82,"dup":34}],84:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPath = "/api";
var version;
(function (version) {
    version.methodName = "version";
})(version = exports.version || (exports.version = {}));

},{}]},{},[35]);
