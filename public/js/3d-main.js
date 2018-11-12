"use strict"

// global variables
var gl;
var canvas;
var scene;
var level;
var databaseRef, nivelesRef;
var verticesFire, indicesFire;

var dragMode;
var dragging;	// Dragging or not

var xLast;		// last position of the mouse
var yLast;
var stopwatch;

var winRotX, winRotY;
var win = false;

var username;
var databaseRef, sessionsRef;
var current_level;

class Scene {
	constructor() {
		this.listModels = [];
	}

	init() {
		// Set the clear Color
		gl.clearColor(0., 0., 0., 0.);	// black
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.enable(gl.DEPTH_TEST);
		// Camera initialization
		dragging = false;
		this.camera.home();
	}

	addModel(model) {
		this.listModels.push(model);
	}

	addCamera(camera) {
		this.camera = camera;
	}

	update() {
		this.camera.update();
	}

	render() {
		// Clear the framebuffer (canvas)
		gl.clear(gl.COLOR_BUFFER_BIT);
		// Mapping from clip-space coord to the viewport in pixels
		gl.viewport(0, 0, canvas.width, canvas.height);

		for(var i = 0; i < this.listModels.length; i++) {
			this.listModels[i].loadUniformDataIntoGPU(this.camera);
			this.listModels[i].draw();
		}
	}
}

class Shader {
	constructor(model) {
		this.model = model;
	}

	create(vertexShaderID, fragmentShaderID) {
		// Get Source for the vertex & fragment shaders
		let vertexShaderSrc = document.getElementById(vertexShaderID).text;
		let fragmentShaderSrc = document.getElementById(fragmentShaderID).text;

		// Create GLSL shaders (upload source & compile shaders)
		let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
		let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);

		// Link the two shaders into a shader program
		return createShaderProgram(gl, vertexShader, fragmentShader);
	}

	setSingleColorShader() {
		this.shaderProgram = this.create("single-color-shader-vs", "single-color-shader-fs");

		// Look up into the vertex shader where the CPU's vertex data go
		this.aPosition = gl.getAttribLocation(this.shaderProgram, "aPosition");
		this.uColor = gl.getUniformLocation(this.shaderProgram, "uColor");
		this.uModelViewProjMatrix = gl.getUniformLocation(this.shaderProgram, "uModelViewProjMatrix");

		// Turn on the attribute variable
		gl.enableVertexAttribArray(this.aPosition);

		// Bind to a VBO
		gl.bindBuffer(gl.ARRAY_BUFFER, this.model.buffer.vbo);

		// Tell the attribute (in) how to get data out of VBO
		var size = 3;			// 3 elements (x, y, z) per iteration
		var type = gl.FLOAT;	// 32 bit floats
		var normalize = false; 	// do not normalize the data
		var stride = 0;	// move forward size*sizeof(type) each iter to get next pos
		var offset = 0;			// start at the beginning of the VBO
		gl.vertexAttribPointer(this.aPosition, size, type, normalize, stride, offset);
	}

	setPerVertexColorShader() {
		this.shaderProgram = this.create("per-vertex-color-shader-vs", "per-vertex-color-shader-fs");

		// Look up into the vertex shader where the CPU's vertex data go
		this.aPosition = gl.getAttribLocation(this.shaderProgram, "aPosition");
		this.aColor = gl.getAttribLocation(this.shaderProgram, "aColor");
		this.uModelViewProjMatrix = gl.getUniformLocation(this.shaderProgram, "uModelViewProjMatrix");

		// Turn on the attribute variable
		gl.enableVertexAttribArray(this.aPosition);

		// Bind to a VBO
		gl.bindBuffer(gl.ARRAY_BUFFER, this.model.buffer.vbo);

		// Tell the attribute (in) how to get data out of VBO
		var size = 3;			// 3 elements (x, y, z) per iteration
		var type = gl.FLOAT;	// 32 bit floats
		var normalize = false; 	// do not normalize the data
		var stride = (3 + 4) * 4;	// move forward size*sizeof(type) each iter to get next pos
		var offset = 0;			// start at the beginning of the VBO
		gl.vertexAttribPointer(this.aPosition, size, type, normalize, stride, offset);

		// Turn on the attribute variable
		gl.enableVertexAttribArray(this.aColor);

		// Bind to a VBO
		gl.bindBuffer(gl.ARRAY_BUFFER, this.model.buffer.vbo);

		// Tell the attribute (in) how to get data out of VBO
		var size = 4;			// 4 elements (r, g, b, a) per iteration
		var type = gl.FLOAT;	// 32 bit floats
		var normalize = false; 	// do not normalize the data
		var stride = (3 + 4) * 4;	// move forward size*sizeof(type) each iter to get next pos
		var offset = 3 * 4;			// start at the beginning of the VBO
		gl.vertexAttribPointer(this.aColor, size, type, normalize, stride, offset);
	}

	setPointShader() {
		this.shaderProgram = this.create("point-shader-vs", "point-shader-fs");

		// Look up into the vertex shader where the CPU's vertex data go
		this.aPosition = gl.getAttribLocation(this.shaderProgram, "aPosition");
		this.uPointSize = gl.getUniformLocation(this.shaderProgram, "uPointSize");
		this.uColor = gl.getUniformLocation(this.shaderProgram, "uColor");
		this.uModelViewProjMatrix = gl.getUniformLocation(this.shaderProgram, "uModelViewProjMatrix");

		// Turn on the attribute variable
		gl.enableVertexAttribArray(this.aPosition);

		// Bind to a VBO
		gl.bindBuffer(gl.ARRAY_BUFFER, this.model.buffer.vbo);

		// Tell the attribute (in) how to get data out of VBO
		var size = 3;			// 3 elements (x, y, z) per iteration
		var type = gl.FLOAT;	// 32 bit floats
		var normalize = false; 	// do not normalize the data
		var stride = 0;	// move forward size*sizeof(type) each iter to get next pos
		var offset = 0;			// start at the beginning of the VBO
		gl.vertexAttribPointer(this.aPosition, size, type, normalize, stride, offset);
	}
}

class Buffer {
	constructor(model) {
		this.model = model;
		// Create a GPU's Vertex Buffer Object (VBO) and put clip-space vertex data
		this.vbo = gl.createBuffer();
		this.ibo = gl.createBuffer();
	}

	loadVerticesAndIndices() {
		// Bind the VBO to ARRAY_BUFFER
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

		// Upload CPU's vertex data into the GPU's VBO
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.model.vertices), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(this.model.indices), gl.STATIC_DRAW);
	}
}

class Model {
	constructor() {
		this.buffer = new Buffer(this);
		this.shader = new Shader(this);
		this.modelMatrix = mat4.create();
		this.color = [1., 1., 1., 1.];
		this.pointSize = 3.;
		this.drawingMode = "solid-single-color";
	}

	setDrawingMode(mode = "solid-single-color") {
		this.drawingMode = mode;
		if(mode == "solid-single-color" || mode == "wireframe") {
			this.setSingleColorShader();
		}
		else if(mode == "solid-per-vertex-color") {
			this.setPerVertexColorShader();
		}
		else if(mode == "points") {
			this.setPointShader();
		}
	}

	translate(tx, ty, tz) {
		mat4.translate(this.modelMatrix, this.modelMatrix, [tx, ty, tz]);
	}

	setColor(r = 1., g = 1., b = 1., a = 1.) {
		this.color = [r, g, b, a];
	}

	setSingleColorShader() {
		this.vertices = this.positions;
		this.buffer.loadVerticesAndIndices();
		this.shader.setSingleColorShader();
	}

	setPerVertexColorShader() {
		let n = this.positions.length / 3;
		this.vertices = [];
		for(let i = 0; i < n; i++) {
			this.vertices.push(this.positions[i*3]);
			this.vertices.push(this.positions[i*3+1]);
			this.vertices.push(this.positions[i*3+2]);
			this.vertices.push(this.colors[i*4]);
			this.vertices.push(this.colors[i*4+1]);
			this.vertices.push(this.colors[i*4+2]);
			this.vertices.push(this.colors[i*4+3]);
		}
		this.buffer.loadVerticesAndIndices();
		this.shader.setPerVertexColorShader();
	}

	setPointShader() {
		this.vertices = this.positions;
		this.buffer.loadVerticesAndIndices();
		this.shader.setPointShader();
	}

	loadUniformDataIntoGPU(camera) {
		// Model-View-Projection Matrix
		// Mmodel-view-proj = Mproj * Mview * Mmodel
		let modelViewProjMatrix = mat4.create();	// MmodelViewProj = I
		mat4.multiply(modelViewProjMatrix, camera.viewMatrix,this.modelMatrix);
		mat4.multiply(modelViewProjMatrix, camera.projMatrix, modelViewProjMatrix);

		gl.useProgram(this.shader.shaderProgram);
		// Cargar la Matriz de Modelo-Vista y Proyección en el shader
		gl.uniformMatrix4fv(this.shader.uModelViewProjMatrix, false, modelViewProjMatrix);
		if(this.drawingMode == "solid-single-color") {
			gl.uniform4fv(this.shader.uColor, this.color);
		}
		else if(this.drawingMode == "points") {
			gl.uniform4fv(this.shader.uColor, this.color);
			gl.uniform1f(this.shader.uPointSize, this.pointSize);
		}
	}
}

class Triangle extends Model {
	constructor() {
		super();
		//Default
		this.positions = [0., 0.57735, 0., 	 // V0
					    -0.5, -0.28867, 0., // v1
						 0.5, -0.28867, 0. // V2
						 ];

		this.indices = [0, 1, 2];

		this.colors = [1., 0., 0., 1., 	 // V0: r,g,b,a
					   0., 1., 0., 1., // v1
					   0., 0., 1., 1. // V2
					  ];

		this.setSingleColorShader();	// default shader
	}

	draw() {
		// Draw the scene
		let primitiveType = gl.TRIANGLES;
		if(this.drawingMode == "points") {
			primitiveType = gl.POINTS;
		}
		else if(this.drawingMode == "wireframe") {
			primitiveType = gl.LINE_LOOP;
		}
		var offset = 0;
		var count = this.indices.length;
		gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT, offset);
	}
}

class Square extends Model {
	constructor() {
		super();
		//Default
		this.positions = [-0.5, 0.5, 0., 	 // V0
					      -0.5, -0.5, 0., // v1
						   0.5, -0.5, 0., // V2
						   0.5, 0.5, 0.
						 ];

		this.indices = [0, 1, 2, 3, 0];	// Triangle2

		this.colors = [1., 0., 0., 1., 	 // V0: r,g,b,a
					   0., 1., 0., 1., // v1
					   0., 0., 1., 1., // V2
					   1., 1., 0., 1.
					  ];

		this.setSingleColorShader();	// default shader
	}

	draw() {
		// Draw the scene
		let primitiveType = gl.TRIANGLES;
		if(this.drawingMode == "points") {
			primitiveType = gl.POINTS;
		}
		else if(this.drawingMode == "wireframe") {
			primitiveType = gl.LINE_STRIP;
		}
		var offset = 0;
		var count = this.indices.length;
		gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT, offset);
	}
}

class Cube extends Model {
	constructor() {
		super();
		//Default
		this.positions = [1., 1., 1.,
										 -1., 1., 1.,
										 -1., -1, 1.,
										 1., -1., 1.,
										 1., -1., -1.,
										 1., 1., -1.,
										 -1., 1., -1.,
										 -1, -1., -1.
										 ];

		this.indices = [0, 1, 2,   0, 2, 3,	// Front face
			            	4, 7, 5,   7, 6, 5,	// Back face
			            	0, 3, 4,   4, 5, 0, // Right Face
			            	7, 2, 1,   7, 1, 6, // Left Face
			            	6, 1, 0,   0, 5, 6,	// Top face
			            	2, 7, 3,   7, 4, 3	// Bottom face
										];

		//this.indices = [0, 1, 2, 3, 0, 5, 4, 3, 0, 1, 6, 5, 4, 7, 6, 7, 2]

		this.colors = [1., 1., 1., 1., 	 // V0: r,g,b,a
								   1., 0., 0., 1., // v1
								   0., 1., 0., 1., // V2
								   0., 0., 1., 1.,
								   0., 1., 1., 1.,
								   1., 1., 0., 1.,
								   1., 0., 1., 1.,
								   0., 0., 0., 1.
								  ];

		this.setSingleColorShader();	// default shader
	}

	draw() {
		// Draw the scene
		let primitiveType = gl.TRIANGLES;
		if(this.drawingMode == "points") {
			primitiveType = gl.POINTS;
		}
		else if(this.drawingMode == "wireframe") {
			primitiveType = gl.LINE_STRIP;
		}
		var offset = 0;
		var count = this.indices.length;
		gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT, offset);
	}
}

class Mono extends Model {
	constructor() {
		super();
		//Default
		this.positions = verticesFire;
		this.indices = indicesFire;

		//console.log(this.positions);
		//console.log(this.indices);

		this.setSingleColorShader();	// default shader
	}

	asignVerticesAndIndices(object){
		this.positions = object.vertices;
		this.indices = object.faces;
		//this.positions = object.meshes[0].vertices;
		//this.indices = [].concat.apply([], object.meshes[0].faces);
		//console.log(this.positions);
		//console.log(this.indices);
	}

	draw() {
		// Draw the scene
		let primitiveType = gl.TRIANGLES;
		if(this.drawingMode == "points") {
			primitiveType = gl.POINTS;
		}
		else if(this.drawingMode == "wireframe") {
			primitiveType = gl.LINE_STRIP;
		}
		var offset = 0;
		var count = this.indices.length;
		//console.log(count);
		gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT, offset);
	}
}

class Camera {
	constructor() {
		this.setPerspective();
	}

	home() {
		this.eye = [0., 0., 5.];
		this.center = [0., 0., 0.];
		this.up = [0., 1., 0.];
		this.rotX = 0.;
		this.rotY = 0.;
		this.lookAt(this.eye, this.center, this.up);
		xLast = 0;
		yLast = 0;
	}

	lookAt(eye, center, up) {
		// View Transformation
		this.viewMatrix = mat4.create();		// Mview = I
		this.eye = eye;
		this.center = center;
		this.up = up;
		mat4.lookAt(this.viewMatrix, this.eye, this.center, this.up);
	}

	rotate(angle, rotAxis) {
		mat4.rotate(this.viewMatrix, this.viewMatrix, angle, rotAxis);
	}

	update() {
		this.lookAt(this.eye, this.center, this.up);
		this.rotate(this.rotX, [1., 0., 0.]);
		this.rotate(this.rotY, [0., 1., 0.]);
	}

	setPerspective() {
		// Proj Transformation
		this.projMatrix = mat4.create();		// Mproj = I
		this.fovy = 60.;	// degrees
		this.fovy = this.fovy * Math.PI / 180.;
		this.aspect = canvas.width / canvas.height;
		this.near = 0.1;
		this.far = 1000.;
		mat4.perspective(this.projMatrix, this.fovy, this.aspect, this.near, this.far);
	}
}

function mouseDownEventListener(event) {
	dragging = true;
	var x = event.clientX;
	var y = event.clientY;
	var rect = event.target.getBoundingClientRect();
	x = x - rect.left;
	y = y - rect.top;
	xLast = x;
	yLast = y;
}

function mouseUpEventListener(event) {
	dragging = false;	// mouse is released
	username = "victor";
	if(checkWin() == true){
		stopwatch.pause();
		$("#scoreModal").modal('show');
		document.getElementById('finalTime').innerHTML = stopwatch;
		starsGot(3);
		//Save the score on firebase
		var sc = 3;
		var writeScore = {};
		writeScore[level] = {"score": sc };
		sessionsRef.child(username).child("3d").update(writeScore);
	}
}

function mouseMoveEventListener(event) {
	if(dragging) {
		var x = event.clientX;
		var y = event.clientY;
		var rect = event.target.getBoundingClientRect();
		x = x - rect.left;
		y = y - rect.top;
		dragMode = document.querySelector("input[name='camera']:checked").value;
		if(dragMode == "Rotate") {
			var factor = 10. / canvas.height; // The rotation ratio
			var dx = factor * (x - xLast);
			var dy = factor * (y - yLast);
			// Limit x-axis rotation angle to [-90, 90] degrees
			scene.camera.rotX = Math.max(Math.min(scene.camera.rotX + dy, 90.), -90.);
			scene.camera.rotY = scene.camera.rotY + dx;
		} else if(dragMode == "Pan") {
			scene.camera.eye[0] = scene.camera.eye[0] + ((x - xLast) / 63.0);
			scene.camera.eye[1] = scene.camera.eye[1] + ((y - yLast) / (-63.0));
			scene.camera.center[0] = scene.camera.eye[0];
			scene.camera.center[1] = scene.camera.eye[1];
		} else if(dragMode == "Zoom") {
			var difX = x - xLast;
			var difY = y - yLast;
			if (Math.abs(difX) > Math.abs(difY)) {
				scene.camera.eye[2] = scene.camera.eye[2] + difX / 10.0;
			}
			else {
				scene.camera.eye[2] = scene.camera.eye[2] + difY / 10.0;
			}
		}
		xLast = x;
		yLast = y;
		scene.update();
		scene.render();
	}

}

function cameraHome() {
	scene.camera.home();
	scene.update();
	scene.render();
}

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

function nextLevel(){
	level++;
	window.location.href='3d-mode.html?u='+username+'&level='+level;
}

function initEventHandlers() {
	canvas.addEventListener("mousedown", mouseDownEventListener, false);
	canvas.addEventListener("mouseup", mouseUpEventListener, false);
	canvas.addEventListener("mousemove", mouseMoveEventListener, false);
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function checkWin(){
	var actualRotX = scene.camera.rotX;
	var actualRotY = scene.camera.rotY;

	while(actualRotX < 0){
		actualRotX += 6;
	}
	while(actualRotY < 0){
		actualRotY += 6;
	}
	var deltaX = Math.abs(winRotX - (actualRotX%6));
	var deltaY = Math.abs(winRotY - (actualRotY%6));

	if(deltaX < 0.8 && deltaY < 0.8){
		return true;
	}
	return false;
}

function loadLevel(levelI){
	nivelesRef.child(levelI).once('value').then(function(snapshot) {
		var linea = snapshot.val();
		indicesFire = linea.faces;
		verticesFire = linea.vertices;
		//console.log(verticesFire);
		//console.log(indicesFire);
	});

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

function readJSON(){
	var request = new XMLHttpRequest();
	//request.open("GET","mono.json");
	request.onreadystatechange = function () {
	    if (this.readyState == 4) {
				//console.log(request.responseText);
	       var object = JSON.parse(this.responseText);
				 //actualModel.asignVerticesAndIndices(object);
				 indicesFire = object.faces;
		 		 verticesFire = object.vertices;

				 //console.log(indicesFire);

	    }
	}
	var chargeString = "../public/json/";
	var levelJSON = level.concat(".json");
	request.open("GET",chargeString.concat(levelJSON) , true);
	//console.log(elemento.vertices);
	request.send();
}

function add_random_model() {
	var factor = 10. / canvas.height; // The rotation ratio
	var dx = factor * getRandomInt(-180, 180);
	var dy = factor * getRandomInt(-180, 180);
	// Limit x-axis rotation angle to [-90, 90] degrees
	scene.camera.rotX = Math.max(Math.min(scene.camera.rotX + dy, 90.), -90.);
	scene.camera.rotY = scene.camera.rotY + dx;
	scene.update();
	scene.render();
}

function loadImage() {
	var dataURL = canvas.toDataURL('image/png');
  document.getElementById('canvasImg').src = dataURL;
}

function createStopWatch(){
	stopwatch = new Stopwatch();

	var time = document.querySelector('.time');
	setInterval(function() {
		time.innerHTML = stopwatch;
	}, 5);

	stopwatch.start();
}

function pauseLevel(){
	stopwatch.pause();
}

function resumeLevel(){
	stopwatch.start();
	$("#pauseModal").modal('hide');
}

function main() {
	level = getUrlVars()["level"];
	readJSON();
	var srcSt = "img/"
	var source = srcSt.concat(level.concat(".png"));

	document.getElementById("imageWin").src=source;
	//level = localStorage.getItem("selectedLevel");
	canvas = document.getElementById("canvas");
	gl = canvas.getContext("webgl");	// Get a WebGL Context
	if(!gl) {
		return;
	}
	scene = new Scene();
	//level = 1;
	let levelModel;

	switch (level){
		case "1":
			setTimeout(function(){
				levelModel = new Mono();
			}, 800);
			break;
		case "2":
			setTimeout(function(){
				levelModel = new Mono();
			}, 800);
			break;
		case "3":
			break;
		case "4":
			setTimeout(function(){
				levelModel = new Mono();
			}, 800);
			break;
		case "5":
			setTimeout(function(){
				levelModel = new Mono();
				levelModel.translate(0.,0.,-5.);
			}, 800);
			break;
		case "6":
			setTimeout(function(){
				levelModel = new Mono();
			}, 800);
			break;
		case "7":
			setTimeout(function(){
				levelModel = new Mono();
			}, 800);
			break;
		case "8":
			setTimeout(function(){
				levelModel = new Mono();
			}, 800);
			break;
		default:
			console.log("Hola");
	}
	setTimeout(function(){
		scene.addModel(levelModel);
		let camera1 = new Camera();
		scene.addCamera(camera1);

		scene.init();
		initEventHandlers();

		add_random_model();

		winRotX = camera1.rotX;
		winRotY = camera1.rotY;

		while(winRotX < 0){
			winRotX += 6;
		}
		while(winRotY < 0){
			winRotY += 6;
		}

		winRotX = winRotX % 6;
		winRotY = winRotY % 6;

		console.log("modelo imagen X: " + camera1.rotX);
		console.log("modelo imagen Y: " + camera1.rotY);
		loadImage();
		levelModel.setColor(0.16, 0.36, 0.68);
		setTimeout(function(){
			cameraHome();
			//add_random_model();
			createStopWatch();
		}, 5);

	}, 1000);

	var display_username = document.getElementById("username");
  username = getUrlVars()["u"];
  if(username == null){
		console.log("username is UNDEFINED");
  } else {
    display_username.innerHTML = username;
    console.log("username:"+username);
  }

	//levelModel.setDrawingMode("solid-per-vertex-color");

	// cameraHome();

}

function starsGot(stars)
{

if(stars==1){
	document.getElementById('nStars').innerHTML = "☆";
}
if(stars==2){
	document.getElementById('nStars').innerHTML = "☆☆";
}
if(stars==3){
	document.getElementById('nStars').innerHTML = "☆☆☆";
}



}
