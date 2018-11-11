var usernameField, usernameDiv, levelsDiv;
var username;
var databaseRef, sessionsRef;

function session(){
  username = usernameField.value;
  if(username == ""){
    window.alert("Please choose a username");
  } else {
    usernameDiv.style.visibility = "hidden";
    levelsDiv.style.visibility = "visible";

    console.log("looking for username "+username+"...");
    sessionsRef.once('value').then(function(snapshot) {
      if (!snapshot.hasChild(username)) {
        console.log("NEW username");

        sessionsRef.child(username).update({
          "2d":{
            "1":{
              "score":0.0
            }
          },
          "3d":{
            "1":{
              "score":0.0
            }
          }
        }, function(error) {
          if (error) {
            console.log("Data could not be saved." + error);
          } else {
            console.log("Data saved successfully.");
          }
        });
      }
      else{
          console.log('EXISTING username');
      }
    });
  }
}

(function(){
    // Initialize Database
    const config = {
  		apiKey: "AIzaSyDrk-0sxzRRQiUpyFgbD71OHSKoWU2XS0E",
      authDomain: "shape-it-e95cf.firebaseapp.com",
      databaseURL: "https://shape-it-e95cf.firebaseio.com",
      projectId: "shape-it-e95cf",
      storageBucket: "shape-it-e95cf.appspot.com",
      messagingSenderId: "621436843578"
    };
    firebase.initializeApp(config);

    databaseRef = firebase.database();
		sessionsRef = databaseRef.ref("sessions/");
}());

window.onload = function(){
  usernameDiv = document.getElementById('usernameDiv');
  usernameField = document.getElementById('usernameField');
  levelsDiv = document.getElementById('levelsDiv');
}
