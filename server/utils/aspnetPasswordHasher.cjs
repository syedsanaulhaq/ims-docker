// ============================================================================
// ASP.NET Identity Password Hasher (Manual Implementation)
// ============================================================================
// This implements the ASP.NET Identity V3 password hashing algorithm
// Format: 0x01 (version) + salt (16 bytes) + subkey (32 bytes)

const crypto = require('crypto');

/**
 * Verifies a password against an ASP.NET Identity V3 hash
 * @param {string} password - The plain text password to verify
 * @param {string} hashedPassword - The base64 encoded hash from database
 * @returns {boolean} - True if password matches
 */
function verifyPassword(password, hashedPassword) {
  try {
    // Decode the base64 hash
    const hashBuffer = Buffer.from(hashedPassword, 'base64');
    
    // Check format marker (should be 0x01 for V3)
    const formatMarker = hashBuffer[0];
    if (formatMarker !== 0x01) {
      return false;
    }
    
    // Extract PRF algorithm key (bytes 1-4, BIG-endian uint32)
    // For ASP.NET Identity V3: this is the HMAC algorithm selector (0x00000001 = HMACSHA256)
    const prfKey = hashBuffer.readUInt32BE(1);
    // Extract iteration count (bytes 5-8, BIG-endian uint32)
    const iterCount = hashBuffer.readUInt32BE(5);
    // Extract salt size (bytes 9-12, BIG-endian uint32)  
    const saltSize = hashBuffer.readUInt32BE(9);
    // Extract salt (starts at byte 13)
    const salt = hashBuffer.slice(13, 13 + saltSize);
    // Extract stored subkey
    const storedSubkey = hashBuffer.slice(13 + saltSize);
    // Determine hash algorithm based on PRF key
    // 0x00000000 = HMACSHA1, 0x00000001 = HMACSHA256, 0x00000002 = HMACSHA512
    const hashAlgorithm = prfKey === 0x00000000 ? 'sha1' : prfKey === 0x00000001 ? 'sha256' : 'sha512';
    // Try UTF-8 encoding first (standard)
    const passwordUtf8 = Buffer.from(password, 'utf8');
    const derivedKeyUtf8 = crypto.pbkdf2Sync(
      passwordUtf8,
      salt,
      iterCount,
      storedSubkey.length,
      hashAlgorithm
    );
    
    if (crypto.timingSafeEqual(derivedKeyUtf8, storedSubkey)) {
      return true;
    }
    
    // Try UTF-16LE encoding (ASP.NET sometimes uses this)
    const passwordUtf16 = Buffer.from(password, 'utf16le');
    const derivedKeyUtf16 = crypto.pbkdf2Sync(
      passwordUtf16,
      salt,
      iterCount,
      storedSubkey.length,
      hashAlgorithm
    );
    
    return crypto.timingSafeEqual(derivedKeyUtf16, storedSubkey);
  } catch (error) {
    console.error(`   Error verifying password: ${error.message}`);
    return false;
  }
}

module.exports = {
  verifyPassword
};
