import crypto from 'crypto';

const json = process.env.GA4_SERVICE_ACCOUNT_JSON;
if (!json) {
  console.log('GA4_SERVICE_ACCOUNT_JSON is not set');
  process.exit(1);
}

const credentials = JSON.parse(json);
let privateKey = credentials.private_key;

console.log('Original key (first 100 chars):', privateKey.substring(0, 100));
console.log('Original key has real newlines:', privateKey.includes('\n'));

// Try to fix the key format
if (!privateKey.includes('\n')) {
  // Remove the header/footer and get just the base64 content
  const base64Content = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .trim();
  
  // Rebuild with proper formatting
  privateKey = '-----BEGIN PRIVATE KEY-----\n' +
    base64Content.match(/.{1,64}/g).join('\n') +
    '\n-----END PRIVATE KEY-----\n';
}

console.log('\nFixed key (first 200 chars):', privateKey.substring(0, 200));

// Try to parse the key
try {
  const keyObject = crypto.createPrivateKey(privateKey);
  console.log('\nKey parsed successfully!');
  console.log('Key type:', keyObject.asymmetricKeyType);
} catch (e) {
  console.log('\nKey parse error:', e.message);
}
