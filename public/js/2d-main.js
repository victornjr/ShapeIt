"use strict"

// global variables
var gl;
var canvas;
var scene;
var xCord = 0
var yCord = 0;
var v1r,v1g,v1b,v2r,v2g,v2b,v3r,v3g,v3b,angle;
var dm;
var figure_selector, figure_selected, figure_counter=0;

//var x1, x2, x3, y1, y2, y3, z1, z2, z3;

class Scene {
	constructor() {
		this.listModels = [];
		// Set the clear Color
		gl.clearColor(0., 0., 0., 1.); // black
	}

	addModel(model) {
		this.listModels.push(model);
	}

	addCamera(camera) {
		this.camera = camera;
	}

	render() {
		// Clear the framebuffer (canvas)
		gl.clear(gl.COLOR_BUFFER_BIT);
		// Mapping from clip-space coord to the viewport in pixels
		gl.viewport(0, 0, canvas.width, canvas.height);

		for (var i = 0; i < this.listModels.length; i++) {
			this.listModels[i].loadUniformDataIntoGPU(this.camera);
			this.listModels[i].setSingleColorShader();
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
		var size = 3; // 3 elements (x, y, z) per iteration
		var type = gl.FLOAT; // 32 bit floats
		var normalize = false; // do not normalize the data
		var stride = 0; // move forward size*sizeof(type) each iter to get next pos
		var offset = 0; // start at the beginning of the VBO
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
		var size = 3; // 3 elements (x, y, z) per iteration
		var type = gl.FLOAT; // 32 bit floats
		var normalize = false; // do not normalize the data
		var stride = (3 + 4) * 4; // move forward size*sizeof(type) each iter to get next pos
		var offset = 0; // start at the beginning of the VBO
		gl.vertexAttribPointer(this.aPosition, size, type, normalize, stride, offset);

		// Turn on the attribute variable
		gl.enableVertexAttribArray(this.aColor);

		// Bind to a VBO
		gl.bindBuffer(gl.ARRAY_BUFFER, this.model.buffer.vbo);

		// Tell the attribute (in) how to get data out of VBO
		var size = 4; // 4 elements (r, g, b, a) per iteration
		var type = gl.FLOAT; // 32 bit floats
		var normalize = false; // do not normalize the data
		var stride = (3 + 4) * 4; // move forward size*sizeof(type) each iter to get next pos
		var offset = 3 * 4; // start at the beginning of the VBO
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
	}

	loadVertices() {
		// Bind the VBO to ARRAY_BUFFER
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

		// Upload CPU's vertex data into the GPU's VBO
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.model.vertices), gl.STATIC_DRAW);
	}
}

class Model {
	constructor() {
		v1r=document.getElementById("red1").value/100;
		v1g=document.getElementById("green1").value/100;
		v1b=document.getElementById("blue1").value/100;

		this.buffer = new Buffer(this);
		this.shader = new Shader(this);
		this.modelMatrix = mat4.create();
		this.color = [v1r, v1g, v1b, 1.];
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
	scale(tx, ty, tz) {
		mat4.scale(this.modelMatrix, this.modelMatrix, [tx, ty, tz]);
	}
	rotate(angle) {
		mat4.rotate(this.modelMatrix,this.modelMatrix, angle*Math.PI/180.,[0.,0.,1.]);
	}
	setColor(r = 1., g = 1., b = 1., a = 1.) {
		this.color = [r, g, b, a];
	}

	setSingleColorShader() {
		this.vertices = this.positions;
		this.buffer.loadVertices();
		this.shader.setSingleColorShader();
	}

	setPerVertexColorShader() {
		let n = this.positions.length / 3;
		this.vertices = [];
		for (let i = 0; i < n; i++) {
			this.vertices.push(this.positions[i * 3]);
			this.vertices.push(this.positions[i * 3 + 1]);
			this.vertices.push(this.positions[i * 3 + 2]);
			this.vertices.push(this.colors[i * 4]);
			this.vertices.push(this.colors[i * 4 + 1]);
			this.vertices.push(this.colors[i * 4 + 2]);
			this.vertices.push(this.colors[i * 4 + 3]);
		}
		this.buffer.loadVertices();
		this.shader.setPerVertexColorShader();
	}

	setPointShader() {
		this.vertices = this.positions;
		this.buffer.loadVertices();
		this.shader.setPointShader();
	}

	loadUniformDataIntoGPU(camera) {
		// Model-View-Projection Matrix
		// Mmodel-view-proj = Mproj * Mview * Mmodel
		let modelViewProjMatrix = mat4.create(); // MmodelViewProj = I
		mat4.multiply(modelViewProjMatrix, camera.viewMatrix, this.modelMatrix);
		mat4.multiply(modelViewProjMatrix, camera.projMatrix, modelViewProjMatrix);

		gl.useProgram(this.shader.shaderProgram);
		// Cargar la Matriz de Modelo-Vista y Proyección en el shader
		gl.uniformMatrix4fv(this.shader.uModelViewProjMatrix, false, modelViewProjMatrix);
		if (this.drawingMode == "solid-single-color") {
			gl.uniform4fv(this.shader.uColor, this.color);
		}
		else if (this.drawingMode == "points") {
			gl.uniform4fv(this.shader.uColor, this.color);
			gl.uniform1f(this.shader.uPointSize, this.pointSize);
		}
	}
}

class Triangle extends Model {
	constructor(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
		var menuModo=document.getElementById("menuModo");
		var modoSeleccionado=menuModo.options[menuModo.selectedIndex].value;
		v1r=document.getElementById("red1").value/100;
		v1g=document.getElementById("green1").value/100;
		v1b=document.getElementById("blue1").value/100;
		v2r=document.getElementById("red2").value/100;
		v2g=document.getElementById("green2").value/100;
		v2b=document.getElementById("blue2").value/100;
		v3r=document.getElementById("red3").value/100;
		v3g=document.getElementById("green3").value/100;
		v3b=document.getElementById("blue3").value/100;
		super();
		if (!arguments.length){
			this.positions = [0., 0.15, 0.,   // V0
										   -0.15,  -0.15, 0., // v1
										    0.15,  -0.15, 0. // V2
										    ];
		}
		else{
			this.positions = [x1, y1, z1, // V0
												x2, y2, z2, // v1
												x3, y3, z3 // V2
												];
		}
		this.colors = [v1r, v1g, v1b, 1., // V0: r,g,b,a
			v2r, v2g, v2b, 1., // v1
			v3r, v3g, v3b, 1. // V2
		];

		this.setSingleColorShader(); // default shader

		if(modoSeleccionado=="multicolor"){
			this.setPerVertexColorShader();
		}
	}

	draw() {
		// Draw the scene
		let primitiveType = gl.TRIANGLES;
		if (this.drawingMode == "points") {
			this.setDrawingMode("points");
		} else if (this.drawingMode == "wireframe") {
			primitiveType = gl.LINE_LOOP;
		} else if(this.drawingMode == "solid-per-vertex-color"){
			this.setPerVertexColorShader();
		}

		var offset = 0;
		var count = 3;
		//this.rotate(angle);
		gl.drawArrays(primitiveType, offset, count);
	}
}

class Square extends Model {
	constructor(x1, y1, z1, x2, y2, z2, x3, y3, z3,
							x4, y4, z4, x5, y5, z5, x6, y6, z6) {
		var menuModo=document.getElementById("menuModo");
		var modoSeleccionado=menuModo.options[menuModo.selectedIndex].value;
		v1r=document.getElementById("red1").value/100;
		v1g=document.getElementById("green1").value/100;
		v1b=document.getElementById("blue1").value/100;
		v2r=document.getElementById("red2").value/100;
		v2g=document.getElementById("green2").value/100;
		v2b=document.getElementById("blue2").value/100;
		v3r=document.getElementById("red3").value/100;
		v3g=document.getElementById("green3").value/100;
		v3b=document.getElementById("blue3").value/100;
		super();
		if (!arguments.length){
			this.positions = [0., 0.15, 0.,   	// V0
										   -0.15,  -0.15, 0., // V1
										    0.15,  -0.15, 0., // V2
												0., 0.15, 0.,   	// V0
										   -0.15,  -0.15, 0., // V1
										    0.15,  -0.15, 0. 	// V2
										    ];
		} else {
			this.positions = [x1, y1, z1, // V0
												x2, y2, z2, // V1
												x3, y3, z3, // V2
												x4, y4, z4, // V3
												x5, y5, z5, // V4
												x6, y6, z6 	// V5
												];
		}
		this.colors = [v1r, v1g, v1b, 1., // V0: r,g,b,a
									v2r, v2g, v2b, 1., 	// V1
									v3r, v3g, v3b, 1., 	// V2
									v1r, v1g, v1b, 1., 	// V3
									v2r, v2g, v2b, 1., 	// V4
									v3r, v3g, v3b, 1. 	// V5
									];

		this.setSingleColorShader(); // default shader

		if(modoSeleccionado=="multicolor"){
			this.setPerVertexColorShader();
		}
	}

	draw() {
		// Draw the scene
		let primitiveType = gl.TRIANGLES;
		if (this.drawingMode == "points") {
			this.setDrawingMode("points");
		} else if (this.drawingMode == "wireframe") {
			primitiveType = gl.LINE_LOOP;
		} else if(this.drawingMode == "solid-per-vertex-color"){
			this.setPerVertexColorShader();
		}

		var offset = 0;
		var count = 6;
		//this.rotate(angle);
		gl.drawArrays(primitiveType, offset, count);
	}
}

class Camera {
	constructor() {
		this.lookAt(0., 0., 1.75, 0., 0., 0., 0., 1., 0.);
		this.setPerspective();
	}

	lookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ) {
		// View Transformation
		this.viewMatrix = mat4.create(); // Mview = I
		this.eye = [eyeX, eyeY, eyeZ];
		this.center = [centerX, centerY, centerZ];
		this.up = [upX, upY, upZ];
		mat4.lookAt(this.viewMatrix, this.eye, this.center, this.up);
	}

	setPerspective() {
		// Proj Transformation
		this.projMatrix = mat4.create(); // Mproj = I
		this.fovy = 60.; // degrees
		this.fovy = this.fovy * Math.PI / 180.;
		this.aspect = canvas.width / canvas.height;
		this.near = 0.1;
		this.far = 1000.;
		mat4.perspective(this.projMatrix, this.fovy, this.aspect, this.near, this.far);
	}
}

function mouseDownEventListener(event) {
	var menuFigura=document.getElementById("menuFigura");
	var figuraSeleccionada=menuFigura.options[menuFigura.selectedIndex].value;
	var menuModo=document.getElementById("menuModo");
	var modoSeleccionado=menuModo.options[menuModo.selectedIndex].value;
	var currentModel;
	var menuSize=document.getElementById("menuSize");
	var s=menuSize.options[menuSize.selectedIndex].value;

	var x = event.clientX;
	var y = event.clientY;

	var rect = event.target.getBoundingClientRect();
	xCord = 2 * (x - rect.left) / canvas.width - 1;
	yCord = 2 * (rect.top - y) / canvas.height + 1;

	console.log("CLICK %f %f", xCord, yCord);
	if (figuraSeleccionada == "triangle") {
		currentModel = new Triangle(0*s, .1*s, 0.*s, -.1*s, -.1*s, 0.*s, .1*s, -.1*s, 0.*s);
 		if(modoSeleccionado=="solido"){
			currentModel.drawingMode="solid-single-color";
		}
		else if(modoSeleccionado=="multicolor"){
			currentModel.drawingMode="solid-per-vertex-color";
		}
		else if(modoSeleccionado=="wireframe"){
			currentModel.drawingMode="wireframe";
		}
		else if(modoSeleccionado=="puntos"){
			currentModel.setDrawingMode("points");
		}
		currentModel.translate(xCord, yCord, 0);
	}
	else if (figuraSeleccionada == "square") {
		currentModel = new Square(-0.1*s,0.1*s,0*s,-0.1*s,-0.1*s,0*s,0.1*s,-0.1*s,0*s,
															-0.1*s,0.1*s,0*s,0.1*s,0.1*s,0*s,0.1*s,-0.1*s,0*s);
 		if(modoSeleccionado=="solido"){
			currentModel.drawingMode="solid-single-color";
		}
		else if(modoSeleccionado=="multicolor"){
			currentModel.drawingMode="solid-per-vertex-color";
		}
		else if(modoSeleccionado=="wireframe"){
			currentModel.drawingMode="wireframe";
		}
		else if(modoSeleccionado=="puntos"){
			currentModel.setDrawingMode("points");
		}
		currentModel.translate(xCord, yCord, 0);
	}
	else if (figuraSeleccionada == "rectangle") {
		currentModel = new Square(-0.15*s,0.1*s,0*s,-0.15*s,-0.1*s,0*s,0.15*s,-0.1*s,0*s,
															-0.15*s,0.1*s,0*s,0.15*s,0.1*s,0*s,0.15*s,-0.1*s,0*s);
 		if(modoSeleccionado=="solido"){
			currentModel.drawingMode="solid-single-color";
		}
		else if(modoSeleccionado=="multicolor"){
			currentModel.drawingMode="solid-per-vertex-color";
		}
		else if(modoSeleccionado=="wireframe"){
			currentModel.drawingMode="wireframe";
		}
		else if(modoSeleccionado=="puntos"){
			currentModel.setDrawingMode("points");
		}
		currentModel.translate(xCord, yCord, 0);
	}
	else {		// Trapezoid
		currentModel = new Square(0*s/3, .05*s/3, 0.*s/3, -.35*s/3, -.15*s/3, 0.*s/3, .15*s/3, -.15*s/3, 0.*s/3,
															-0.20*s/3,0.05*s/3,0*s/3,-0.35*s/3,-0.15*s/3,0*s/3,0*s/3, .05*s/3, 0.*s/3);
 		if(modoSeleccionado=="solido"){
			currentModel.drawingMode="solid-single-color";
		}
		else if(modoSeleccionado=="multicolor"){
			currentModel.drawingMode="solid-per-vertex-color";
		}
		else if(modoSeleccionado=="wireframe"){
			currentModel.drawingMode="wireframe";
		}
		else if(modoSeleccionado=="puntos"){
			currentModel.setDrawingMode("points");
		}
		currentModel.translate(xCord, yCord, 0);
	}
	scene.addModel(currentModel);
	scene.render();

	var new_option = document.createElement("option");
	figure_counter++;
	new_option.text = figure_counter;
	new_option.value = figure_counter;
	figure_selector.add(new_option);
	figure_selected = figure_counter;
	selector.value = figure_counter;
}

function update_figure_selected() {
	figure_selected = selector.value;
}

function rotate_CW() {
	scene.listModels[figure_selected-1].rotate(-5.);
	scene.render();
}

function rotate_CCW() {
	scene.listModels[figure_selected-1].rotate(5.);
	scene.render();
}

function scale_up() {
	scene.listModels[figure_selected-1].scale(1.2, 1.2, 1.);
	scene.render();
}

function scale_down() {
	scene.listModels[figure_selected-1].scale(0.8, 0.8, 1.);
	scene.render();
}

function translate_up() {
	scene.listModels[figure_selected-1].translate(0., 0.02, 0.);
	scene.render();
}

function translate_down() {
	scene.listModels[figure_selected-1].translate(0., -0.02, 0.);
	scene.render();
}

function translate_right() {
	scene.listModels[figure_selected-1].translate(0.02, 0., 0.);
	scene.render();
}

function translate_left() {
	scene.listModels[figure_selected-1].translate(-0.02, 0., 0.);
	scene.render();
}

function clear_canvas() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	scene.listModels = [];
	selector.innerHTML = "";
	figure_counter = 0;
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
	return Math.random()*(max - min) + min;
}

function add_random_model() {
	var figure = getRandomInt(0, 3);
	var s = getRandomInt(1, 4);
	s *= 0.5;
	var angle = getRandomInt(-40, 40);
	var currentModel;
	var xCord = getRandomFloat(-0.8, 0.8);
	var yCord = getRandomFloat(-0.8, 0.8);
	if (figure == 0) {
		currentModel = new Triangle(0*s, .1*s, 0.*s, -.1*s, -.1*s, 0.*s, .1*s, -.1*s, 0.*s);
	}
	else if (figure == 1) {
		currentModel = new Square(-0.1*s,0.1*s,0*s,-0.1*s,-0.1*s,0*s,0.1*s,-0.1*s,0*s,
															-0.1*s,0.1*s,0*s,0.1*s,0.1*s,0*s,0.1*s,-0.1*s,0*s);
	}
	else if (figure == 3) {		// Rectangle
		currentModel = new Square(-0.15*s,0.1*s,0*s,-0.15*s,-0.1*s,0*s,0.15*s,-0.1*s,0*s,
															-0.15*s,0.1*s,0*s,0.15*s,0.1*s,0*s,0.15*s,-0.1*s,0*s);
	}
	else {		// Trapezoid
		currentModel = new Square(0*s/3, .05*s/3, 0.*s/3, -.35*s/3, -.15*s/3, 0.*s/3, .15*s/3, -.15*s/3, 0.*s/3,
															-0.20*s/3,0.05*s/3,0*s/3,-0.35*s/3,-0.15*s/3,0*s/3,0*s/3, .05*s/3, 0.*s/3);
	}
	currentModel.drawingMode="solid-single-color";
	currentModel.translate(xCord, yCord, 0);
	currentModel.rotate(angle);
	scene.addModel(currentModel);
	scene.render();
}

function initMouseEventHandlers() {
	canvas.addEventListener("mousedown", mouseDownEventListener, false);
}

function loadImage() {
	var dataURL = canvas.toDataURL('image/jpeg');
  document.getElementById('canvasImg').src = dataURL;
}

function main() {
	canvas = document.getElementById("canvas");
	gl = canvas.getContext("webgl"); // Get a WebGL Context
	if (!gl) {
		return;
	}
	scene = new Scene();
	figure_selector = document.getElementById("selector");

	var camera1 = new Camera();
	scene.addCamera(camera1);
	initMouseEventHandlers();
	scene.render();

	add_random_model();
	add_random_model();
	add_random_model();

	loadImage();
	clear_canvas();
}
