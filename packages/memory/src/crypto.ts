import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";

/**
 * AES-256-GCM at-rest encryption helpers. Keys are derived from a passphrase
 * via scrypt with a 16-byte random salt. The serialised blob has the layout:
 *
 *   [1 byte  version=1]
 *   [16 bytes salt]
 *   [12 bytes iv]
 *   [16 bytes auth tag]
 *   [N bytes ciphertext]
 *
 * Output is base64-encoded for transport/persistence.
 */

const VERSION = 0x01;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SCRYPT_COST = 1 << 15; // N = 32768, browser-friendly while still strong

export interface AetherCipher {
  encrypt(plaintext: string | Uint8Array): string;
  decrypt(token: string): Uint8Array;
  decryptUtf8(token: string): string;
}

export function createCipher(passphrase: string): AetherCipher {
  if (passphrase.length < 8) {
    throw new Error("Passphrase must be at least 8 characters");
  }

  function deriveKey(salt: Buffer): Buffer {
    return scryptSync(passphrase, salt, KEY_LEN, { N: SCRYPT_COST, r: 8, p: 1 });
  }

  return {
    encrypt(plaintext) {
      const salt = randomBytes(SALT_LEN);
      const iv = randomBytes(IV_LEN);
      const key = deriveKey(salt);
      const cipher = createCipheriv("aes-256-gcm", key, iv) as CipherGCM;
      const data = typeof plaintext === "string" ? Buffer.from(plaintext, "utf-8") : Buffer.from(plaintext);
      const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
      const tag = cipher.getAuthTag();
      const out = Buffer.concat([Buffer.from([VERSION]), salt, iv, tag, ciphertext]);
      return out.toString("base64");
    },

    decrypt(token) {
      const buf = Buffer.from(token, "base64");
      if (buf[0] !== VERSION) throw new Error("Unsupported cipher version");
      const salt = buf.subarray(1, 1 + SALT_LEN);
      const iv = buf.subarray(1 + SALT_LEN, 1 + SALT_LEN + IV_LEN);
      const tag = buf.subarray(1 + SALT_LEN + IV_LEN, 1 + SALT_LEN + IV_LEN + TAG_LEN);
      const ciphertext = buf.subarray(1 + SALT_LEN + IV_LEN + TAG_LEN);
      const key = deriveKey(salt);
      const decipher = createDecipheriv("aes-256-gcm", key, iv) as DecipherGCM;
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return new Uint8Array(plaintext);
    },

    decryptUtf8(token) {
      return Buffer.from(this.decrypt(token)).toString("utf-8");
    },
  };
}
