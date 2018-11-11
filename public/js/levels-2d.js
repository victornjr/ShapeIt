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

    sessionsRef.child(username).child('2d').once('value').then(function(snapshot) {
			var niveles = snapshot.val();
      console.log(niveles)
			for(var nivel in niveles){
				console.log("nivel:"+nivel);
        var score = niveles[nivel].score;
        var nivelEstrellasDiv = document.getElementById('levelstars'+nivel);
				console.log("score:"+score);
        // update button color
        if(score == 3){
          $('#level'+nivel).removeClass("btn btn-secondary btn-block").addClass("btn btn-success btn-block");
        } else if(score == 2){
          $('#level'+nivel).removeClass("btn btn-secondary btn-block").addClass("btn btn-info btn-block");
        } else {
          $('#level'+nivel).removeClass("btn btn-secondary btn-block").addClass("btn btn-warning btn-block");
        }
        // update button score
        nivelEstrellasDiv.innerHTML = "";
        for(var i=0; i<score; i++){
          nivelEstrellasDiv.innerHTML += '<i class="fa fa-star"></i>';
        }
			}
    });
  }
}
