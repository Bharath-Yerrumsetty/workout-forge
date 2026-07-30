/**
 * Minimal PNG reader — just enough to turn a Playwright screenshot into raw
 * pixels so contrast can be measured against what actually rendered.
 *
 * Deliberately dependency-free: the alternative was adding an image library to
 * a project whose whole premise is a tiny, audited dependency set. Playwright
 * emits 8-bit non-interlaced RGB/RGBA, which is all this handles; anything
 * else throws rather than guessing.
 */

import zlib from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  const chunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      chunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  if (depth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG: depth ${depth}, colour type ${colorType}`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  let read = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[read];
    read += 1;

    const line = raw.subarray(read, read + stride);
    read += stride;

    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= channels ? prev[x - channels] : 0;
      let value = line[x];

      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`bad scanline filter ${filter}`);

      row[x] = value & 0xff;
    }
  }

  return { width, height, channels, pixels };
}

/**
 * The most frequent colour in an image region.
 *
 * Glyphs cover a minority of the pixels inside a line of text, so the modal
 * colour of a text node's box is its effective background — including any
 * slab, grain or grid layer composited underneath it.
 */
export function modalColor({ width, height, channels, pixels }) {
  const counts = new Map();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width * channels + x * channels;
      const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  let best = 0;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }

  return {
    r: (best >> 16) & 0xff,
    g: (best >> 8) & 0xff,
    b: best & 0xff,
    share: bestCount / (width * height),
  };
}

const channelLuminance = (value) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminance({ r, g, b }) {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];

  return (light + 0.05) / (dark + 0.05);
}

/** Parses the `rgb(r, g, b)` / `rgba(...)` form returned by getComputedStyle. */
export function parseRgb(value) {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;

  const parts = match[1].split(',').map((part) => Number.parseFloat(part));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;

  return { r: parts[0], g: parts[1], b: parts[2] };
}
