/*
 * iso9660.js — minimal ISO 9660 + Joliet image writer (pure JS, no deps).
 * Produces a cloud-init NoCloud seed ISO: flat file list at root, volume id "cidata".
 * Works in browser and Node.
 *
 * Usage:  const iso = ISO9660.build([{name:'user-data', content:'...'}], 'cidata');
 *         // iso is a Uint8Array
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ISO9660 = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SECTOR = 2048;

  function encodeAscii(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0x7f;
    return out;
  }

  // UCS-2 big-endian, padded with UCS-2 spaces to byteLen
  function ucs2(str, byteLen) {
    const out = new Uint8Array(byteLen);
    let i = 0;
    for (; i < str.length && i * 2 + 1 < byteLen; i++) {
      const c = str.charCodeAt(i);
      out[i * 2] = (c >> 8) & 0xff;
      out[i * 2 + 1] = c & 0xff;
    }
    for (; i * 2 + 1 < byteLen; i++) {
      out[i * 2] = 0x00;
      out[i * 2 + 1] = 0x20;
    }
    return out;
  }

  function ucs2Bytes(str) {
    const out = new Uint8Array(str.length * 2);
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      out[i * 2] = (c >> 8) & 0xff;
      out[i * 2 + 1] = c & 0xff;
    }
    return out;
  }

  function both32(dv, off, v) {
    dv.setUint32(off, v >>> 0, true);
    dv.setUint32(off + 4, v >>> 0, false);
  }

  function both16(dv, off, v) {
    dv.setUint16(off, v & 0xffff, true);
    dv.setUint16(off + 2, v & 0xffff, false);
  }

  function setStr(bytes, off, str, len) {
    const b = encodeAscii(str.length > len ? str.slice(0, len) : str);
    bytes.set(b, off);
    for (let i = b.length; i < len; i++) bytes[off + i] = 0x20;
  }

  function recDate(d) {
    // 7-byte directory record date
    return new Uint8Array([
      d.getUTCFullYear() - 1900, d.getUTCMonth() + 1, d.getUTCDate(),
      d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), 0
    ]);
  }

  function volDate(d) {
    // 17-byte volume descriptor date: "YYYYMMDDHHMMSScc" + tz byte
    const p = (n, w) => String(n).padStart(w, '0');
    const s = p(d.getUTCFullYear(), 4) + p(d.getUTCMonth() + 1, 2) + p(d.getUTCDate(), 2) +
              p(d.getUTCHours(), 2) + p(d.getUTCMinutes(), 2) + p(d.getUTCSeconds(), 2) + '00';
    const out = new Uint8Array(17);
    out.set(encodeAscii(s), 0);
    out[16] = 0;
    return out;
  }

  // ISO9660 level-1 identifier: 8.3 uppercase, [A-Z0-9_], with ";1" version
  function isoName(name) {
    let base = name, ext = '';
    const dot = name.lastIndexOf('.');
    if (dot > 0) { base = name.slice(0, dot); ext = name.slice(dot + 1); }
    const clean = s => s.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    base = clean(base).slice(0, 8);
    ext = clean(ext).slice(0, 3);
    return (ext ? base + '.' + ext : base + '.') + ';1';
  }

  // Directory record
  function dirRecord(idBytes, extent, size, flags, date) {
    let len = 33 + idBytes.length;
    if (len % 2) len++;
    const rec = new Uint8Array(len);
    const dv = new DataView(rec.buffer);
    rec[0] = len;
    rec[1] = 0;                       // extended attribute length
    both32(dv, 2, extent);            // extent LBA
    both32(dv, 10, size);             // data length
    rec.set(recDate(date), 18);       // recording date/time
    rec[25] = flags;                  // file flags (0x02 = directory)
    rec[26] = 0;                      // file unit size
    rec[27] = 0;                      // interleave gap
    both16(dv, 28, 1);                // volume sequence number
    rec[32] = idBytes.length;         // identifier length
    rec.set(idBytes, 33);
    return rec;
  }

  function pathTable(rootLba, littleEndian) {
    const pt = new Uint8Array(10);
    const dv = new DataView(pt.buffer);
    pt[0] = 1;                        // identifier length
    pt[1] = 0;                        // extended attribute length
    dv.setUint32(2, rootLba, littleEndian);
    dv.setUint16(6, 1, littleEndian); // parent directory number
    pt[8] = 0;                        // identifier (root = 0x00)
    return pt;
  }

  function buildDirSector(selfLba, entries, date) {
    // entries: [{idBytes, extent, size, flags}]
    const sec = new Uint8Array(SECTOR);
    let off = 0;
    const put = rec => { sec.set(rec, off); off += rec.length; };
    put(dirRecord(new Uint8Array([0]), selfLba, SECTOR, 0x02, date));  // "."
    put(dirRecord(new Uint8Array([1]), selfLba, SECTOR, 0x02, date));  // ".."
    for (const e of entries) {
      const rec = dirRecord(e.idBytes, e.extent, e.size, e.flags, date);
      if (off + rec.length > SECTOR) throw new Error('Directory exceeds one sector');
      put(rec);
    }
    return sec;
  }

  function buildVolumeDescriptor(type, volid, totalSectors, ptSize, lPath, mPath, rootRec, date, joliet) {
    const vd = new Uint8Array(SECTOR);
    const dv = new DataView(vd.buffer);
    vd[0] = type;
    vd.set(encodeAscii('CD001'), 1);
    vd[6] = 1;                                     // version
    if (joliet) {
      vd.set(ucs2('', 32), 8);                     // system id (UCS-2 spaces)
      vd.set(ucs2(volid, 32), 40);                 // volume id
    } else {
      setStr(vd, 8, '', 32);                       // system id
      setStr(vd, 40, volid, 32);                   // volume id
    }
    both32(dv, 80, totalSectors);                  // volume space size
    if (joliet) vd.set(new Uint8Array([0x25, 0x2f, 0x45]), 88);  // escape: "%/E" = UCS-2 level 3
    both16(dv, 120, 1);                            // volume set size
    both16(dv, 124, 1);                            // volume sequence number
    both16(dv, 128, SECTOR);                       // logical block size
    both32(dv, 132, ptSize);                       // path table size
    dv.setUint32(140, lPath, true);                // L path table
    dv.setUint32(148, mPath, false);               // M path table
    vd.set(rootRec, 156);                          // root directory record (34 bytes)
    if (joliet) {
      vd.set(ucs2('', 128), 190);                  // volume set id
      vd.set(ucs2('', 128), 318);                  // publisher id
      vd.set(ucs2('', 128), 446);                  // data preparer id
      vd.set(ucs2('', 128), 574);                  // application id
      vd.set(ucs2('', 37), 702);
      vd.set(ucs2('', 37), 739);
      vd.set(ucs2('', 37), 776);
    } else {
      setStr(vd, 190, '', 128);
      setStr(vd, 318, '', 128);
      setStr(vd, 446, '', 128);
      setStr(vd, 574, 'ISO9660.JS VELOCLOUD CLOUD-INIT BUILDER', 128);
      setStr(vd, 702, '', 37);
      setStr(vd, 739, '', 37);
      setStr(vd, 776, '', 37);
    }
    vd.set(volDate(date), 813);                    // creation
    vd.set(volDate(date), 830);                    // modification
    setStr(vd, 847, '0000000000000000', 16); vd[863] = 0;  // expiration (none)
    vd.set(volDate(date), 864);                    // effective
    vd[881] = 1;                                   // file structure version
    return vd;
  }

  /**
   * Build an ISO image.
   * @param {Array<{name:string, content:string|Uint8Array}>} files
   * @param {string} volid Volume identifier (e.g. "cidata")
   * @returns {Uint8Array}
   */
  function build(files, volid) {
    if (!files || !files.length) throw new Error('No files given');
    const date = new Date();
    const items = files.map(f => {
      const data = (typeof f.content === 'string')
        ? new TextEncoder().encode(f.content)
        : f.content;
      return { name: f.name, data };
    });

    // Layout
    const LBA = { PVD: 16, SVD: 17, TERM: 18, LPT: 19, MPT: 20, JLPT: 21, JMPT: 22, ROOT: 23, JROOT: 24 };
    let next = 25;
    for (const it of items) {
      it.lba = next;
      next += Math.max(1, Math.ceil(it.data.length / SECTOR));
    }
    const totalSectors = next;

    // Directory entries (sorted by identifier, per spec)
    const isoEntries = items
      .map(it => ({ idBytes: encodeAscii(isoName(it.name)), extent: it.lba, size: it.data.length, flags: 0, sortKey: isoName(it.name) }))
      .sort((a, b) => a.sortKey < b.sortKey ? -1 : 1);
    const jolEntries = items
      .map(it => ({ idBytes: ucs2Bytes(it.name + ';1'), extent: it.lba, size: it.data.length, flags: 0, sortKey: it.name }))
      .sort((a, b) => a.sortKey < b.sortKey ? -1 : 1);

    const image = new Uint8Array(totalSectors * SECTOR);
    const at = lba => lba * SECTOR;

    const rootRec = dirRecord(new Uint8Array([0]), LBA.ROOT, SECTOR, 0x02, date);
    const jrootRec = dirRecord(new Uint8Array([0]), LBA.JROOT, SECTOR, 0x02, date);

    image.set(buildVolumeDescriptor(1, volid, totalSectors, 10, LBA.LPT, LBA.MPT, rootRec, date, false), at(LBA.PVD));
    image.set(buildVolumeDescriptor(2, volid, totalSectors, 10, LBA.JLPT, LBA.JMPT, jrootRec, date, true), at(LBA.SVD));

    // Volume descriptor set terminator
    const term = new Uint8Array(SECTOR);
    term[0] = 255;
    term.set(encodeAscii('CD001'), 1);
    term[6] = 1;
    image.set(term, at(LBA.TERM));

    image.set(pathTable(LBA.ROOT, true), at(LBA.LPT));
    image.set(pathTable(LBA.ROOT, false), at(LBA.MPT));
    image.set(pathTable(LBA.JROOT, true), at(LBA.JLPT));
    image.set(pathTable(LBA.JROOT, false), at(LBA.JMPT));

    image.set(buildDirSector(LBA.ROOT, isoEntries, date), at(LBA.ROOT));
    image.set(buildDirSector(LBA.JROOT, jolEntries, date), at(LBA.JROOT));

    for (const it of items) image.set(it.data, at(it.lba));

    return image;
  }

  return { build };
}));
