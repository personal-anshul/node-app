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
            res.render('chat', { title: 'Windbag', loggedInUser: user, isNewUser: global.newUser });
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
