const path = require('path')
const rsaWrapper = {};
const fs = require('fs')
const NodeRSA = require('node-rsa')
const crypto = require('crypto')

rsaWrapper.generate = (direction)=>{
	console.log("Generating Key for "+direction);
	var key = new NodeRSA();
	
	//6144 is key size. Change it if needed; See Instruction NOTE
	//in README for more information
	key.generateKeyPair(6144, 65537);

	console.log(direction+" Key generated");
	fs.writeFileSync(path.resolve(__dirname, 'keys', direction + '.private.pem'), key.exportKey('pkcs8-private-pem'));
	fs.writeFileSync(path.resolve(__dirname, 'keys', direction + '.public.pem'), key.exportKey('pkcs8-public-pem'));
	return true;
};

rsaWrapper.generate('server');
rsaWrapper.generate('client');
console.log('Keys generated …');
