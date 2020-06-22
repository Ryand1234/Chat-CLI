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
var user_name = new Array()
var user_name_list = {}
var i = 0;
var log;

io.on('connection', (socket)=>{
	
	socket.on('con', (data)=>{
		if(socket.con == undefined){
			socket.join('code');

			//Push Socket id to user array and write to log
			var dec_data = rsaWrapper.decrypt(rsaWrapper.clientPrivate, data);
			var strip_data = dec_data.replace(/(\n| )/gm, "");
			log = `${strip_data} connected\n`
			fs.appendFileSync('server.log', log);
			user.push(socket.id);
			user_name.push(strip_data)
			user_name_list[strip_data] = socket.id;
			socket.con = true;
			io.to(socket.id).emit('con', "Connected");
		} else {
			io.to(socket.id).emit('con', "Please Disconnect from previous session to again login\n");
		}
	});

	socket.on('user', ()=>{
		io.to(socket.id).emit('user', user_name);
	});

	socket.on('cmd', (data)=>{
		if(socket.con != undefined){
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
				if(index == 0){
					i = index + 1
				} else {
					i = index - 1
				}
			} 
		
		
			//Write to server log user which will execute a command
			log = "Command will be executed on user " + (i + 1) + "\n";
			fs.appendFileSync('server.log', log);

			//transmitted the command to the required user
			io.to(user[i]).emit('cmd', queue.dequeue());
		} else {
			io.to(socket.id).emit("con", "Please Provide a User name to connect");
		}
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
		if(socket.con != undefined){
			//Decrypt Data
			var dec_data = rsaWrapper.decrypt(rsaWrapper.clientPrivate, data);

			//Remove unnecessary newline character
			dec_data.replace(/(\r\n|\n|\r)/gm,"")

			//Encrypt it back
			var enc_data = rsaWrapper.encrypt(rsaWrapper.serverPub, dec_data);
			queue.queue(enc_data);

			//Transmit msg to all user except sender
                	socket.broadcast.to('code').emit('reciever_msg', queue.dequeue());

			//send ACK to sender
			io.to(socket.id).emit('sender_msg', "ACK");

			//Write to log
			log = "Message transmitted to all the clients\n"
			fs.appendFileSync('server.log', log);

		} else {
                        io.to(socket.id).emit("con", "Please Provide a User name to connect");
                }
        });

	socket.on("pmsg", (data)=>{
		if(socket.on != undefined){
			//Decrypt Message
			var dec_msg = rsaWrapper.decrypt(rsaWrapper.clientPrivate, data.msg)

			//Encrypt it back
			var enc_msg = rsaWrapper.encrypt(rsaWrapper.serverPub, dec_msg)
			var snd_obj = {
				msg : enc_msg,
				from : data.from
			}

			queue.queue(snd_obj);

			//find user id 
			var id = user_name_list[data.to]

			//Transmit msg to Specific Client
			io.to(id).emit("recieve_pmsg", queue.dequeue());

			//Write to log
			log = "Message send to Specified Client\n"
			fs.appendFileSync("server.log", log);

		} else {
			io.to(socket.id).emit("con", "Please Provide a User name to connect");
		}
	});

	socket.on('disconnect', ()=>{
		console.log("Disconnect");
		var index = user.indexOf(socket.id);
		log = `${user_name[index]} Disconnected\n`
		if(index > -1){
			user.splice(index, 1);
			user_name.splice(index, 1);
		}

		fs.appendFileSync('server.log', log);
	});
		
});
