// CJS shim for uuid@14 (pure ESM) — dùng trong Jest test environment
"use strict";
const crypto = require("crypto");

function v4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

module.exports = { v4, v1: v4, v3: v4, v5: v4, v6: v4, v7: v4,
  NIL: "00000000-0000-0000-0000-000000000000",
  MAX: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  validate: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
  version: () => 4,
  parse: (s) => Buffer.from(s.replace(/-/g, ""), "hex"),
  stringify: (b) => Buffer.from(b).toString("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5"),
};
