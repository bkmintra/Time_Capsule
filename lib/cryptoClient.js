function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function hashPasswordForServer(password) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return toBase64(new Uint8Array(hashBuffer));
}

export async function encryptE2EE(password, plaintext) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  const authHash = await hashPasswordForServer(password);
  
  // Combine: v1.salt.iv.ciphertext
  const payload = `v1.${toBase64(salt)}.${toBase64(iv)}.${toBase64(new Uint8Array(ciphertextBuffer))}`;
  
  return { payload, authHash };
}

export async function decryptE2EE(password, payload) {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('รูปแบบข้อมูลไม่ใช่ E2EE หรืออ่านไม่ได้');
  }
  const salt = fromBase64(parts[1]);
  const iv = fromBase64(parts[2]);
  const ciphertext = fromBase64(parts[3]);
  
  const key = await deriveKey(password, salt);
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  const dec = new TextDecoder();
  return dec.decode(plaintextBuffer);
}
