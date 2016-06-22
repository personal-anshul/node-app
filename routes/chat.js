/*
 * GET user info popup.
 */
exports.chatMsg = function(req, res) {
  var user = req.session.user;
  if(user) {
    global.errorMessage = "";
    global.MongoClient.connect(global.url, function (err, db) {
      if(err){
        console.warn(err.message);
      }
      else {
        var collection = db.collection('user_info');
        collection.findOne({"$query": {"userId": user}}, function(err, isUser) {
          if(isUser) {
            var isNewUser = global.newUser;
            global.newUser = null;
            res.render('chat', {
              title: 'Windbag',
              loggedInUser: user,
              loggedInUserShort: (user.length > 10 ? user.slice(0,10) + "..." : user),
              userName: req.session.newUser,
              userNameShort: (req.session.newUser.length > 10 ? req.session.newUser.slice(0,10) + "..." : req.session.newUser),
              isNewUser: isNewUser,
              typingUser: global.userInfoTyping
            });
          }
          else {
            global.errorMessage = "User has been removed by Admin.";
            req.session.destroy();
            res.redirect('/');
          }
        });
      }
    });
  }
  else {
    res.redirect('/');
  }
}
