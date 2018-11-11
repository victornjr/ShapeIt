var session_ID = "?";

function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
  });
  return vars;
}

function chooseLevel(level){
  window.location.href='2d-mode.html?session='+session_ID+'&level='+level;
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
  var display_ID = document.getElementById("sessionID");
  session_ID = getUrlVars()["session"];
  if(session_ID == null){
    sessionsRef.push({
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
    }).then((snap) => {
      session_ID = snap.key;
      display_ID.innerHTML = session_ID;
      console.log("session:"+session_ID);
    });
  } else {
    display_ID.innerHTML = session_ID;
    console.log("session:"+session_ID);
  }
}
