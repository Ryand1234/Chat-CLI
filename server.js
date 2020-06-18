var express = require('express')
var chalk = require('chalk')
var PriorityQueue = require('js-priority-queue')
var app = express()
var rsaWrapper = require('./encrypt_decrypt')
var fs = require('fs')

var server = app.listen(process.env.PORT || 3000, ()=>{
	console.log(`Server Listening at ${process.env.PORT || 3000}`)
});

rsaWrapper.initLoadServerKeys(__dirname);

var io = require('socket.io').listen(server)

var queue = new PriorityQueue() //Priority Messaging Queue
var user = new Array() // Array to store socket id so that user can execute command on another terminal not on its own terminal
var i = 0;
var log;

io.on('connection', (socket)=>{
	
	socket.on('con', ()=>{
		socket.join('code');

		//Push Socket id to user array and write to log
		log = "A client connected\n"
		fs.appendFileSync('server.log', log);
		user.push(socket.id);
	});

	socket.on('cmd', (data)=>{
		//Decrypt the command from client
		var dec_data = rsaWrapper.decrypt(rsaWrapper.clientPrivate, data);

		//Encrypt the command with server key
                var enc_data = rsaWrapper.encrypt(rsaWrapper.serverPub, dec_data);

		//Create a json object that contain command and socket id so that 
		//the error or result can be transmitted back to correct person
		var ndata = {
			id : socket.id,
			cmd : enc_data
		};

		//Push to Priority Queue
		queue.queue(ndata);

		//find the a user
		var index = user.indexOf(socket.id);
		if(index > -1){
			i = index - 1;
		}
		
		
		//Write to server log user which will execute a command
		log = "Command will be executed on user " + (i + 1) + "\n";
		fs.appendFileSync('server.log', log);

		//transmitted the command to the required user
		io.to(user[i]).emit('cmd', queue.dequeue());
	});

	socket.on('err', (data)=>{
		
		var id = data.id;
		var error = data.error;
		
		//Decrypt Error Message
		var dec_data = rsaWrapper.decrypt(rsaWrapper.clientPrivate, error);
		var msg = "NOACK\n" + dec_data;

		// Encrypt the final error message
		var enc_data = rsaWrapper.encrypt(rsaWrapper.serverPub, msg);
		io.to(id).emit('reciever_msg', enc_data);
	});

	socket.on('success', (data)=>{
		var id = data.id;
		var res = data.res;
		var dec_data = rsaWrapper.decrypt(rsaWrapper.clientPrivate, res);
		var msg = "ACK\n" + dec_data;
		var enc_data = rsaWrapper.encrypt(rsaWrapper.serverPub, msg);
		io.to(id).emit('reciever_msg', enc_data);
	});

	socket.on('msg', (data)=>{
		//Decrypt Data
		var dec_data = rsaWrapper.decrypt(rsaWrapper.clientPrivate, data);

		//Remove unnecessary newline character
		dec_data.replace(/(\r\n|\n|\r)/gm,"")

		//Encrypt it back
		var enc_data = rsaWrapper.encrypt(rsaWrapper.serverPub, dec_data);
		queue.queue(enc_data);
//		socket.leave('code');

		//Transmit msg to all user except sender
                socket.broadcast.to('code').emit('reciever_msg', queue.dequeue());

		//send ACK to sender
		io.to(socket.id).emit('sender_msg', "ACK");

		//Write to log
		log = "Message transmitted to all the clients\n"
		fs.appendFileSync('server.log', log);

		//Join user back
  //      	socket.join('code');
        });

	socket.on('disconnect', ()=>{
		console.log("Disconnect");
		var index = user.indexOf(socket.id);
		if(index > -1){
			user.splice(index, 1);
		}
		log = "User Disconnected\n"
		fs.appendFileSync('server.log', log);
	});
		
});
