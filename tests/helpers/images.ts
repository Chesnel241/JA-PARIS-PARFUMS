import { deflateSync } from "node:zlib";

// Fixtures d'images générées en mémoire : aucun fichier binaire dans le dépôt.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** PNG RGB valide (décodable par les navigateurs), couleur unie légèrement dégradée. */
export function createPng(width = 16, height = 16, rgb: [number, number, number] = [155, 107, 67]): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // profondeur 8 bits
  header[9] = 2; // RGB
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filtre « None »
    for (let x = 0; x < width; x += 1) {
      row[1 + x * 3] = rgb[0];
      row[2 + x * 3] = (rgb[1] + x * 4) & 0xff;
      row[3 + x * 3] = (rgb[2] + y * 4) & 0xff;
    }
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// JPEG 8×8 (produit par canvas.toDataURL("image/jpeg") dans Chromium), décodable.
const JPEG_8X8_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAdEAABAgcAAAAAAAAAAAAAAAAAERYmMlNmg5Lw/8QAFAEBAAAAAAAAAAAAAAAAAAAABf/EABgRAAIDAAAAAAAAAAAAAAAAAAACERIh/9oADAMBAAIRAxEAPwC7CzCubLV0k5QAAs1owdVazp//2Q==";

export function createJpeg(): Buffer {
  return Buffer.from(JPEG_8X8_BASE64, "base64");
}

/** SVG contenant du JavaScript : doit être refusé par l'upload (risque XSS). */
export function createMaliciousSvg(): Buffer {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(document.domain)</script><rect width="10" height="10"/></svg>',
    "utf8",
  );
}

/** Contenu HTML/JS qui n'est PAS une image : sert au test « mime menteur ». */
export function createFakePngPayload(): Buffer {
  return Buffer.from("<!doctype html><html><body><script>alert(1)</script></body></html>", "utf8");
}

/** Buffer PNG valide dont la taille dépasse `bytes` (en-tête PNG + remplissage). */
export function createOversizedPng(bytes: number): Buffer {
  const png = createPng(4, 4);
  return Buffer.concat([png, Buffer.alloc(bytes - png.length + 1, 0)]);
}
