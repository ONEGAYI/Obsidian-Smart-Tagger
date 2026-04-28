import { encryptApiKey, decryptApiKey } from "../src/crypto";

describe("crypto", () => {
  const vaultPath = "/test/vault/path";

  it("加解密往返应返回原始值", async () => {
    const original = "sk-test-api-key-12345";
    const encrypted = await encryptApiKey(original, vaultPath);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":");
    const decrypted = await decryptApiKey(encrypted, vaultPath);
    expect(decrypted).toBe(original);
  });

  it("不同 vault 路径解密应失败", async () => {
    const original = "sk-test-key";
    const encrypted = await encryptApiKey(original, vaultPath);
    await expect(decryptApiKey(encrypted, "/different/vault")).rejects.toThrow();
  });

  it("空字符串应正常处理", async () => {
    const encrypted = await encryptApiKey("", vaultPath);
    const decrypted = await decryptApiKey(encrypted, vaultPath);
    expect(decrypted).toBe("");
  });
});
