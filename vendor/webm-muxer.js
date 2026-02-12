(function (global) {
  function toUint8Array(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    return new Uint8Array(value || []);
  }

  function concatArrays(arrays) {
    var total = arrays.reduce(function (sum, arr) {
      return sum + arr.length;
    }, 0);
    var result = new Uint8Array(total);
    var offset = 0;
    arrays.forEach(function (arr) {
      result.set(arr, offset);
      offset += arr.length;
    });
    return result;
  }

  function uintBE(value, bytes) {
    var out = new Uint8Array(bytes);
    for (var i = bytes - 1; i >= 0; i -= 1) {
      out[i] = value & 0xff;
      value = Math.floor(value / 256);
    }
    return out;
  }

  function vint(value) {
    for (var width = 1; width <= 8; width += 1) {
      var max = Math.pow(2, 7 * width) - 1;
      if (value <= max) {
        var bytes = uintBE(value, width);
        bytes[0] |= 1 << (8 - width);
        return bytes;
      }
    }
    throw new Error('vint too large');
  }

  function ebmlElement(idBytes, dataBytes) {
    return concatArrays([idBytes, vint(dataBytes.length), dataBytes]);
  }

  function ebmlUInt(idBytes, value) {
    var width = 1;
    while (width < 8 && value >= Math.pow(2, 8 * width)) width += 1;
    return ebmlElement(idBytes, uintBE(value, width));
  }

  function ebmlFloat(idBytes, value) {
    var buffer = new ArrayBuffer(8);
    var view = new DataView(buffer);
    view.setFloat64(0, value);
    return ebmlElement(idBytes, new Uint8Array(buffer));
  }

  function ebmlString(idBytes, text) {
    return ebmlElement(idBytes, new TextEncoder().encode(text));
  }

  function simpleBlock(trackNumber, timecode, keyframe, payload) {
    var header = new Uint8Array(4);
    header[0] = 0x80 | (trackNumber & 0x7f);
    var dv = new DataView(header.buffer);
    dv.setInt16(1, timecode, false);
    header[3] = keyframe ? 0x80 : 0x00;
    return concatArrays([header, payload]);
  }

  function buildSeekHeadPlaceholder() {
    return ebmlElement(new Uint8Array([0x11, 0x4d, 0x9b, 0x74]), new Uint8Array([]));
  }

  function codecToWebM(codec) {
    var c = (codec || '').toLowerCase();
    if (c.indexOf('vp09') === 0 || c.indexOf('vp9') === 0) return 'V_VP9';
    return 'V_VP8';
  }

  function WebMMuxer(options) {
    options = options || {};
    this.video = options.video || {};
    this.width = this.video.width || 640;
    this.height = this.video.height || 360;
    this.frameRate = this.video.frameRate || this.video.framerate || 30;
    this.codecID = codecToWebM(this.video.codec);
    this.blocks = [];
    this.firstTimestamp = null;
    this.lastTimestamp = 0;
    this.timecodeScale = 1000000;
  }

  WebMMuxer.prototype.addVideoChunk = function (chunk, meta) {
    var data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);

    var timestampUs = typeof chunk.timestamp === 'number' ? chunk.timestamp : 0;
    if (this.firstTimestamp === null) this.firstTimestamp = timestampUs;

    var relUs = Math.max(0, timestampUs - this.firstTimestamp);
    var clusterTimecode = Math.floor(relUs / 1000);
    var blockTimecode = 0;

    this.lastTimestamp = relUs;

    this.blocks.push({
      timecode: clusterTimecode,
      payload: simpleBlock(1, blockTimecode, chunk.type === 'key', data)
    });
  };

  WebMMuxer.prototype.finalize = function () {
    var ebmlHeader = ebmlElement(
      new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]),
      concatArrays([
        ebmlUInt(new Uint8Array([0x42, 0x86]), 1),
        ebmlUInt(new Uint8Array([0x42, 0xf7]), 1),
        ebmlUInt(new Uint8Array([0x42, 0xf2]), 4),
        ebmlUInt(new Uint8Array([0x42, 0xf3]), 8),
        ebmlString(new Uint8Array([0x42, 0x82]), 'webm'),
        ebmlUInt(new Uint8Array([0x42, 0x87]), 2),
        ebmlUInt(new Uint8Array([0x42, 0x85]), 2)
      ])
    );

    var durationSec = this.blocks.length
      ? (this.lastTimestamp + Math.round(1000000 / this.frameRate)) / 1000000
      : 0;

    var info = ebmlElement(
      new Uint8Array([0x15, 0x49, 0xa9, 0x66]),
      concatArrays([
        ebmlUInt(new Uint8Array([0x2a, 0xd7, 0xb1]), this.timecodeScale),
        ebmlString(new Uint8Array([0x4d, 0x80]), 'webm-muxer.js'),
        ebmlString(new Uint8Array([0x57, 0x41]), 'webm-muxer.js'),
        ebmlFloat(new Uint8Array([0x44, 0x89]), durationSec)
      ])
    );

    var videoSettings = ebmlElement(
      new Uint8Array([0xe0]),
      concatArrays([
        ebmlUInt(new Uint8Array([0xb0]), this.width),
        ebmlUInt(new Uint8Array([0xba]), this.height)
      ])
    );

    var trackEntry = ebmlElement(
      new Uint8Array([0xae]),
      concatArrays([
        ebmlUInt(new Uint8Array([0xd7]), 1),
        ebmlUInt(new Uint8Array([0x73, 0xc5]), 1),
        ebmlUInt(new Uint8Array([0x83]), 1),
        ebmlString(new Uint8Array([0x86]), this.codecID),
        videoSettings
      ])
    );

    var tracks = ebmlElement(new Uint8Array([0x16, 0x54, 0xae, 0x6b]), trackEntry);

    var clusterBlocks = [];
    for (var i = 0; i < this.blocks.length; i += 1) {
      var block = this.blocks[i];
      clusterBlocks.push(ebmlUInt(new Uint8Array([0xe7]), block.timecode));
      clusterBlocks.push(ebmlElement(new Uint8Array([0xa3]), block.payload));
    }

    var cluster = ebmlElement(
      new Uint8Array([0x1f, 0x43, 0xb6, 0x75]),
      concatArrays(clusterBlocks)
    );

    var segment = ebmlElement(
      new Uint8Array([0x18, 0x53, 0x80, 0x67]),
      concatArrays([buildSeekHeadPlaceholder(), info, tracks, cluster])
    );

    return concatArrays([ebmlHeader, segment]);
  };

  global.WebMMuxer = WebMMuxer;
})(typeof window !== 'undefined' ? window : globalThis);
