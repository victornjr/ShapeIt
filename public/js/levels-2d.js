var username = "?";

function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
  });
  return vars;
}

function chooseLevel(level){
  window.location.href='2d-mode.html?u='+username+'&level='+level;
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
  var display_username = document.getElementById("username");
  username = getUrlVars()["u"];
  if(username == null){
    window.alert("username not defined");
  } else {
    display_username.innerHTML = username;
    console.log("username:"+username);
  }
}
