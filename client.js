var socket = require('socket.io-client')('http://localhost:3000');
const repl = require('repl')
const chalk = require('chalk');  
const { exec } = require('child_process');
var rsaWrapper = require('./encrypt_decrypt')
var fs = require('fs')
var user;


function eror(code){
	switch(code){
		case 1: return "Genral Error\n"; break;
		case 2: return "Misuse of Shell builtins\n";
		case 126: return "Comman invoked cannot be executed\n"
		case 127: return "Command not Found\n"
		case 130: return "Script termintated by Ctrl-C\n"
	}
}


//Initialise the RSA keys
rsaWrapper.initLoadServerKeys(__dirname);


//To Handle disconnection
socket.on('disconnect', function() {
      socket.emit('disconnect')
  });


//When Client is connected to server
socket.on('connect', () => {
      console.log(chalk.red('=== start chatting ==='))
  })  


//Handle Connection Error
socket.on('con', (data)=>{
	console.log(chalk.red(data));
});

//User list
socket.on('user', (data)=>{
	console.log(chalk.green("=====User List====="));
	for(let user of data){
		console.log(chalk.red(user))
	}
});

//To Handle Command Request
socket.on('cmd', async (data) => {

	//Decrypt command using server Private key
	var dec_cmd = rsaWrapper.decrypt(rsaWrapper.serverPrivate, data.cmd)

	//Execute the command at bash level
	//stdout: Handle Output of command
	//stderr: Handle Error of command
	await exec(dec_cmd, (stderr, stdout)=>{
		if(stderr){

			var err = eror(stderr.code);
			//create a json object containing encrypted Error and sender socket id
			var error = { 
				error : rsaWrapper.encrypt(rsaWrapper.clientPub, err), 
				id : data.id
			}

			//Emit the error object
			socket.emit('err', error);
		}else{

			//create a json object containing encrypted result and sender socket id
			var success = {
				res : rsaWrapper.encrypt(rsaWrapper.clientPub, stdout),
				id : data.id
			}
			socket.emit('success', success);
		}
	});
  })



//To send back message to the sender (ACK)
socket.on('sender_msg', (data) => {

        console.log(chalk.green("Message: ",data));
  })



//To send message to reciever (Other user in case of msg, and sender user in case of command)
socket.on('reciever_msg', (data) => {
	var dec_data = rsaWrapper.decrypt(rsaWrapper.serverPrivate, data)
        console.log(chalk.green("Message: ",dec_data));
})

//To recive personal message
socket.on("recieve_pmsg", (data)=>{
	var dec_msg = rsaWrapper.decrypt(rsaWrapper.serverPrivate, data.msg)
	var title = "======" + data.from + "========"
	console.log(chalk.red(title))
	console.log(chalk.green(dec_msg))
})

repl.start({
      prompt: '',
      eval: (cmd) => {
	  var cmd = cmd.split(':')
	      var op = cmd[0];
	      var msg = cmd[1]
	
	   //if op is undefined or op is not equal to cmd, msg, user and con
	   //then it means required format is not provided so it will show usage
	   if((op == undefined)||((op != "cmd")&&(op != "pmsg")&&(op != "msg")&&(op != "user")&&(op != "con"))){
		   usage();
	   }else{
		   var log;
		if(op == "cmd"){
			log = "Command executed by " + user + " is " + msg ;
		} else {
			if(op == "msg"){
				log = "Message send from " + user + " to all users is " + msg;
			} else {
				if(op == "user"){
					log = "User requested for connected user list\n" ;
				} else {
					if(op == "con"){

						cmd[1] = cmd[1] + " "
						var posible_usr = cmd[1].split(" ")
						user = posible_usr[1].replace(/(\n| )/gm, "")
						log = "User requested for connection\n"

					} else {

						str1 = cmd[1] + " "
						str = cmd[1].split(" ")
						msg = ''
						for(var i = 2; i < str.length; i++){
							msg = msg + str[i] + " "
						}
						to = str[1].replace(/(\n| )/gm, "");
						log = "Message sent from " + user + " to " + to + " is " + msg + "\n"

					}
				}
			}
		}

		//To Write Client log
		fs.appendFileSync('client.log', log);
		var enc_msg = rsaWrapper.encrypt(rsaWrapper.clientPub, msg);
		if(op != "pmsg"){
	        	socket.emit(op,enc_msg)
		} else {
			var mesge = {
				msg : enc_msg,
				to : to,
				from : user
			}
			socket.emit(op, mesge)
		}
	   }
      }
  })

function usage(){
	console.log("USAGE: ");
	console.log("cmd: <COMMAND>");
	console.log("msg: <MESSAGE>");
	console.log("user:");
	console.log("pmsg: <MESSAGE> <USER_NAME>");
	console.log("con: <USER_NAME>\n");
}
