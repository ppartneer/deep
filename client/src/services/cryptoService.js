// Web Crypto API wrapper for E2EE

export const generateKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
};

export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  return btoa(exportedAsString);
};

export const importPublicKey = async (pemBase64) => {
  const binaryDerString = atob(pemBase64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
};

// Returns { encryptedPayload, iv } as base64 strings
export const encryptMessage = async (messageText, recipientPublicKeyBase64) => {
  const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);
  const encodedMessage = new TextEncoder().encode(messageText);

  // Generate session key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the message with AES
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encodedMessage
  );

  // Export AES key
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // Encrypt AES key with recipient's public RSA key
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    exportedAesKey
  );

  // Package it all up: payload holds the encrypted message and the encrypted key
  const payload = JSON.stringify({
    cipherText: arrayBufferToBase64(encryptedContent),
    encryptedKey: arrayBufferToBase64(encryptedAesKey)
  });

  return {
    encryptedPayload: btoa(payload),
    iv: arrayBufferToBase64(iv)
  };
};

export const decryptMessage = async (encryptedPayloadBase64, ivBase64, myPrivateKey) => {
  const payload = JSON.parse(atob(encryptedPayloadBase64));
  const cipherText = base64ToArrayBuffer(payload.cipherText);
  const encryptedKey = base64ToArrayBuffer(payload.encryptedKey);
  const iv = base64ToArrayBuffer(ivBase64);

  // Decrypt the AES key using our private RSA key
  const decryptedAesKeyArrayBuffer = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    myPrivateKey,
    encryptedKey
  );

  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    decryptedAesKeyArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Decrypt the content
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    cipherText
  );

  return new TextDecoder().decode(decryptedContent);
};

// Utils
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
