import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY = crypto.scryptSync(process.env['ENCRYPTION_KEY'] || 'wastezero-default-secret-key-32-chars', 'salt', 32);

/**
 * Encrypts a string using AES-256-GCM.
 * Format: iv:authTag:encryptedText
 */
export const encrypt = (text: string): string => {
    if (!text) return text;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a string encrypted with the format iv:authTag:encryptedText.
 */
export const decrypt = (encryptedText: string): string => {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    
    try {
        const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
        if (!ivHex || !authTagHex || !encrypted) return encryptedText;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return '[Encrypted]';
    }
};
