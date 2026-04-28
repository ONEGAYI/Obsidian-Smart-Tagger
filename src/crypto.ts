const SALT = new TextEncoder().encode("smart-tagger-salt-v1");
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

async function deriveKey(vaultPath: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(vaultPath),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const buffer = Buffer.from(base64, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export async function encryptApiKey(plainText: string, vaultPath: string): Promise<string> {
  const key = await deriveKey(vaultPath);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText)
  );
  return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encrypted)}`;
}

export async function decryptApiKey(cipherText: string, vaultPath: string): Promise<string> {
  const [ivBase64, dataBase64] = cipherText.split(":");
  if (!ivBase64 || !dataBase64) throw new Error("无效的加密格式");

  const key = await deriveKey(vaultPath);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const data = base64ToArrayBuffer(dataBase64);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
