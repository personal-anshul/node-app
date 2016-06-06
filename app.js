//Module dependencies.
var express = require('express'),
  routes = require('./routes'),
  chat = require('./routes/chat'),
  http = require('http'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  methodOverride = require('method-override'),
  bodyParser = require('body-parser'),
  //session variable
  session = require('client-sessions'),
  //db client
  MongoClient = require('mongodb').MongoClient,
  //express initialization
  app = express(),
  //chat msg
  msg  = {
    content: null,
    user_id: null
  },
  //used info
  users = {
    user_id: null,
    name: null
  };

//generic method to check if given variable has some value
function isValid(value) {
  if(value == "" || value == null || value == undefined) {
    return false;
  }
  else {
    return true;
  }
}

/*Global variable*/
//validation msg
errorMessage = null;

// view engine setup
app.set('port', 1992);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

//express configuration
app.use(express.json());
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(session({
  cookieName: "session",
  secret:"123!@#456$%^789&*(0)",
  duration: 10 * 60 * 1000,
  activeDuration: 2 * 60 * 1000
}));
app.use(app.router);
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

//server
var serve = http.createServer(app),
  ioSocket = require('socket.io')(serve);
serve.listen(app.get('port'), function () {
  console.info('Express server listening on port ' + app.get('port'));
});

//routes
app.get('/', routes.index);
app.get('/logout', routes.logout);
app.get('/chat', chat.chatMsg);
app.post('/', function(req, res) {
  //handle user info on form submission
  users.user_id = req.body.userID;
  users.name = req.body.userName;
  msg.user_id = users.user_id;
  var url = 'mongodb://localhost:27017/chat_app',
    password = isValid(req.body.userPassword) ? req.body.userPassword : req.body.userNewPassword;
  MongoClient.connect(url, function (err, db) {
    if(err){
      console.warn(err.message);
    }
    else {
      var collection = db.collection('user_info');
      if(!isValid(users.user_id)) {
        collection.findOne({"$query": {}, "$orderby": {"_id": -1}}, function(err, user) {
          console.log(user);
          var tempId = parseInt(user.user_id.toString().indexOf('_') == -1 ? 0 : user.user_id.split('_')[1]) + 1;
          users.user_id = users.name + "_" + tempId;
          collection.insert({
            user_id: users.user_id,
            user_name: users.name,
            password: password,
            date: new Date().valueOf()
          },
          function (err, o) {
            if (err) {
              console.warn(err.message);
            }
            else {
              console.info("user inserted into db: " + users.user_id);
              // sets a cookie with the user's info
              req.session.user = users.user_id;
              res.redirect('/chat');
            }
          });
        });
      }
      else {
        collection.findOne({"$query": {"user_id": users.user_id}}, function(err, user) {
          errorMessage = 'User doesn\'t exists. Try again.';
          if(user) {
            if(user.password == password) {
              errorMessage = "";
              users.name = user.user_name;
              console.info("user already exists in db: " + users.name);
              // sets a cookie with the user's info
              req.session.user = user.user_id;
              res.redirect('/chat');
            }
            else {
              console.info("Password doesn't matches with " + password);
              errorMessage = 'User ID and Password doesn\'t match. Try again.';
              res.redirect('/');
            }
          }
          else {
            res.redirect('/');
          }
        });
      }
    }
  });
});

//io connection event handler
ioSocket.on('connection', function (socket) {
  console.info('a user connected..');
  var url = 'mongodb://localhost:27017/chat_app';
  MongoClient.connect(url, function (err, db) {
    if(err){
      console.warn(err.message);
    }
    else {
      if(chat.user_id) {
        db.collection('user_info').findOne({"$query": {"user_id": chat.user_id}}, function(err, user) {
          if(user) {
            var collectionUser = db.collection('user_info'),
              collection = db.collection('chat_msg'),
              stream = collection.find().sort({"_id": -1}).limit(10).sort({"_id": 1}).stream();
            stream.on('data', function (chat) {
              msg.content = chat.content;
              msg.user_id = chat.user_id;
              socket.emit('chat', msg);
            });
          }
          else {
            //TODO: remove session value
          }
        });
      }
    }
  });

  //socket disconnect event handler
  socket.on('disconnect', function () {
    console.info('user disconnected..');
  });

  //socket chat event handler
  socket.on('chat', function (message) {
    MongoClient.connect(url, function (err, db) {
      if(err){
        console.warn(err.message);
      }
      else {
        var collection = db.collection('chat_msg');
        // message.user_id = sess.userIdentity;
        // users.user_id = sess.userIdentity;
        collection.insert({
          content: message.content,
          user_id: message.user_id,
          date: new Date().valueOf()
         },
         function (err, o) {
          if (err) {
            console.warn(err.message);
          }
          else {
            console.info("chat message inserted into db: " + message.content);
          }
        });
      }
    });
    socket.broadcast.emit('chat', message);
  });
});
