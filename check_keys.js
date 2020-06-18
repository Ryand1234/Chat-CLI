var rsaWrapper = require('./encrypt_decrypt')

// Run RSA encryption test scenario. Message is encrypted, log on console in base64 format and message is decrypted and log on console.
rsaWrapper.serverExampleEncrypt = () => {
console.log('Server public encrypting');
let enc = rsaWrapper.encrypt(rsaWrapper.serverPub, 'Server init hello');
console.log('Server private encrypting …');
console.log('Encrypted RSA string ' , '\n', enc);
let dec = rsaWrapper.decrypt(rsaWrapper.serverPrivate, enc);
console.log('Decrypted RSA string …');
console.log(dec);
};

rsaWrapper.initLoadServerKeys(__dirname);
rsaWrapper.serverExampleEncrypt();
