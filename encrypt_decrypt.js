const path = require('path')
const rsaWrapper = {};
const fs = require('fs')
const NodeRSA = require('node-rsa')
const crypto = require('crypto')

rsaWrapper.encrypt = (publicKey, message)=>{

	var enc = crypto.publicEncrypt({
		key: publicKey,
		padding: crypto.RSA_PKCSI_OAEP_PADDING
	}, Buffer.from(message));

	return enc.toString('base64');
};

rsaWrapper.decrypt = (privateKey, message)=>{
	var enc = crypto.privateDecrypt({
		key: privateKey,
		padding: crypto.RSA_PKCS1_OAEP_PADDING
	}, Buffer.from(message, 'base64'));

	return enc.toString();
};

rsaWrapper.initLoadServerKeys = (basePath) => {
rsaWrapper.serverPub = fs.readFileSync(path.resolve(basePath, 'keys', 'server.public.pem'));
rsaWrapper.serverPrivate = fs.readFileSync(path.resolve(basePath, 'keys', 'server.private.pem'));
rsaWrapper.clientPub = fs.readFileSync(path.resolve(basePath, 'keys', 'client.public.pem'));
rsaWrapper.clientPrivate = fs.readFileSync(path.resolve(basePath, 'keys', 'client.private.pem'));
};

module.exports = rsaWrapper;
