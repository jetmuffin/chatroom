
var express = require('express'), //引入express模块
    app = express(),
    server = require('http').createServer(app);
    io = require('socket.io').listen(server); //引入socket.io模块并绑定到服务器
    tool = require("./tool.js");
    rooms = {};
    users = [];
    user_socket = {};//保存所有在线用户的socket
app.use('/', express.static(__dirname + '/www')); //指定静态HTML文件的位置
app.use('/content', express.static(__dirname + '/content')); //指定静态HTML文件的位置
server.listen(8000);

//socket部分
io.on('connection', function(socket) {
    //昵称设置
    socket.on('login', function(nickname, room_id) {
        //若房间不存在，则创建房间
        if(!rooms[room_id]){
            createRoom(socket, room_id);
        }
        //昵称已经存在
        if(rooms[room_id].map[nickname]){
            socket.emit('nickExisted');
        }else{
            addUser(socket, room_id, nickname);            
            socket.emit('loginSuccess');
            //通知房间的所有人
            for (var user in rooms[room_id].map){
                user_socket[user].emit('system', nickname, rooms[room_id], 'login');
            }
        }
    });

    //接收新消息
    socket.on('send:all', function(msg) {
        //将消息发送到除自己外的所有用户
        for (var user in rooms[socket.room_id].map){
            if(user != socket.user)
                user_socket[user].emit('receive', socket.user, msg, 'all');
        }        
    });

    socket.on('send:user', function(msg, user) {
        if(user in user_socket){
            //将消息发送到指定用户
            user_socket[user].emit('receive',socket.user, msg, 'user')
        }
    });

    socket.on('img:all', function(imgData) {
        //通过一个newImg事件分发到除自己外的每个用户
        socket.broadcast.emit('receiveImage', socket.user, imgData, 'all');
    });

    //接收用户发来的图片
    socket.on('img:user', function(imgData, user) {
        if(user in user_socket){
            //将消息发送到指定用户
            user_socket[user].emit('receiveImage',socket.user, imgData, 'user')
        }
    });

    //断开连接的事件
    socket.on('disconnect', function() {
        //通知除自己以外的所有人
        if(rooms[socket.room_id]){
            for (var user in rooms[socket.room_id].map){
                if(user && user != socket.user){
                    user_socket[user].emit('system', socket.user, rooms[socket.room_id], 'logout');
                }
            } 
            //从房间列表删除用户
            deleteUser(socket, socket.room_id, socket.user);
            //如果房间人数为空
            if(rooms[socket.room_id].size == 0){
                deleteRoom(socket, socket.room_id);
            }            
        }
    });
});

function createRoom(socket, room_id){
    rooms[room_id] = new Object();
    rooms[room_id].map = {};
    rooms[room_id].size = 0;
}

function addUser(socket, room_id, user){
    rooms[room_id].map[user] = user;
    rooms[room_id].size ++;
    socket.user = user;
    socket.room_id = room_id;    
    user_socket[user] = socket;   
}

function deleteUser(socket, room_id, user){
    delete rooms[socket.room_id].map[socket.user];
    rooms[socket.room_id].size--;
    delete user_socket[socket.user];
}

function deleteRoom(socket, room_id){
    delete rooms[socket.room_id];
}