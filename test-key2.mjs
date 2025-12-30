import crypto from 'crypto';

const json = process.env.GA4_SERVICE_ACCOUNT_JSON;
if (!json) {
  console.log('GA4_SERVICE_ACCOUNT_JSON is not set');
  process.exit(1);
}

const credentials = JSON.parse(json);
let privateKey = credentials.private_key;

console.log('Original key (first 150 chars):', privateKey.substring(0, 150));

// The key seems to have "-----BEGINPRIVATEKEY-----" without spaces
// It should be "-----BEGIN PRIVATE KEY-----"
privateKey = privateKey
  .replace('-----BEGINPRIVATEKEY-----', '-----BEGIN PRIVATE KEY-----')
  .replace('-----ENDPRIVATEKEY-----', '-----END PRIVATE KEY-----');

console.log('\nAfter fixing header (first 150 chars):', privateKey.substring(0, 150));

// Try to parse the key
try {
  const keyObject = crypto.createPrivateKey(privateKey);
  console.log('\nKey parsed successfully!');
  console.log('Key type:', keyObject.asymmetricKeyType);
} catch (e) {
  console.log('\nKey parse error:', e.message);
}
