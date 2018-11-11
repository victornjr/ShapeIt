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
var databaseRef, nivelesRef, sessionsRef;

var translate_units = 0.01;
var scale_units = 0.05;
var rotate_units = 5.0;
var translate_margin = 0.02;
var scale_margin = 0.4;

var lineas_count = 0;
var current_level = 4;
var username = "?";

class Scene {
	constructor() {
		this.listModels = [];
		// Set the clear Color
		gl.clearColor(0., 0., 0., 0.); // black
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
	constructor(tipo) {
		v1r=document.getElementById("red1").value/100;
		v1g=document.getElementById("green1").value/100;
		v1b=document.getElementById("blue1").value/100;

		this.buffer = new Buffer(this);
		this.shader = new Shader(this);
		this.modelMatrix = mat4.create();
		this.color = [v1r, v1g, v1b, 1.];
		this.pointSize = 3.;
		this.drawingMode = "solid-single-color";
		this.tipo = tipo;
		this.size = 1.0;
		this.centroid_x = 0.0;
		this.centroid_y = 0.0;
		this.rotation = 0.0;
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
		var resultMatrix = [0, 0, 0, 0];
		mat4.multiply(resultMatrix, [1, 0, 0, 0,
																0, 1, 0, 0,
																0, 0, 1, 0,
																tx, ty, tz, 1], [this.modelMatrix[12],
																								this.modelMatrix[13],
																								0,
																								1]);
		this.modelMatrix[12] = resultMatrix[0]
		this.modelMatrix[13] = resultMatrix[1]
		this.centroid_x += tx;
		this.centroid_y += ty;
		console.log("centroid: "+this.centroid_x+","+this.centroid_y);
	}
	scale(tx, ty, tz) {
		mat4.scale(this.modelMatrix, this.modelMatrix, [tx, ty, tz]);
		this.size *= tx;
		console.log("size: "+this.size);
	}
	rotate(angle) {
		mat4.rotate(this.modelMatrix,this.modelMatrix, angle*Math.PI/180.,[0.,0.,1.]);
		this.rotation = (this.rotation+angle) % 360;
		if(this.rotation < 0) this.rotation = 360 + this.rotation;
		console.log("rotation: "+this.rotation);
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
		super("triangulo");
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
							x4, y4, z4, x5, y5, z5, x6, y6, z6, tipo) {
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
		super(tipo);
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

class Line extends Model {
	constructor(x1, y1, z1, x2, y2, z2) {
		v1r=document.getElementById("red1").value/100;
		v1g=document.getElementById("green1").value/100;
		v1b=document.getElementById("blue1").value/100;
		v2r=document.getElementById("red2").value/100;
		v2g=document.getElementById("green2").value/100;
		v2b=document.getElementById("blue2").value/100;
		super("linea");
		if (!arguments.length){
			this.positions = [0., 0.15, 0.,   // V0
										   -0.15,  -0.15, 0., // v1
										    ];
		}
		else {
			this.positions = [x1, y1, z1, // V0
												x2, y2, z2, // v1
												];
		}
		this.colors = [v1r, v1g, v1b, 1., // V0: r,g,b,a
									v2r, v2g, v2b, 1., // v1
		];

		this.setSingleColorShader(); // default shader
	}

	draw() {
		// Draw the scene
		let primitiveType = gl.LINES;
		if (this.drawingMode == "points") {
			this.setDrawingMode("points");
		} else if (this.drawingMode == "wireframe") {
			primitiveType = gl.LINE_LOOP;
		} else if(this.drawingMode == "solid-per-vertex-color"){
			this.setPerVertexColorShader();
		}

		var offset = 0;
		var count = 2;
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
	// var menuSize=document.getElementById("menuSize");
	// var s=menuSize.options[menuSize.selectedIndex].value;
	var s = 0.5;

	var x = event.clientX;
	var y = event.clientY;

	var rect = event.target.getBoundingClientRect();
	xCord = 2 * (x - rect.left) / canvas.width - 1;
	yCord = 2 * (rect.top - y) / canvas.height + 1;

	console.log("CLICK "+xCord+", "+yCord);
	console.log("LINE COORD IF DRAWN "+xCord/2+", "+yCord/2);
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
															-0.1*s,0.1*s,0*s,0.1*s,0.1*s,0*s,0.1*s,-0.1*s,0*s,"cuadrado");
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
		currentModel = new Square(-0.85*s,0.1*s,0*s,-0.85*s,-0.1*s,0*s,0.85*s,-0.1*s,0*s,
															-0.85*s,0.1*s,0*s,0.85*s,0.1*s,0*s,0.85*s,-0.1*s,0*s,"rectangulo");
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
															-0.20*s/3,0.05*s/3,0*s/3,-0.35*s/3,-0.15*s/3,0*s/3,0*s/3, .05*s/3, 0.*s/3,"trapezoide");
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
	figure_selected = figure_counter + lineas_count;
	selector.value = figure_counter;
}

function checkSolution() {
	nivelesRef.child(current_level).child("figuras_solucion").once('value').then(function(snapshot) {
		var figura = snapshot.val();
		var expected_correct = figura.length-1;
		var total_correct = 0;
		for(var key in figura){
			var expected_tipo = figura[key].tipo;
			var expected_size = parseFloat(figura[key].size);
			var expected_x = parseFloat(figura[key].x);
			var expected_y = parseFloat(figura[key].y);
			var expected_rotation = parseFloat(figura[key].rotation);
			for(var drawn=lineas_count; drawn<scene.listModels.length; drawn++){
				var model_drawn = scene.listModels[drawn];
				var actual_tipo = model_drawn.tipo;
				var actual_size = model_drawn.size;
				var actual_x = model_drawn.centroid_x;
				var actual_y = model_drawn.centroid_y;
				var actual_rotation = model_drawn.rotation;
				// console.log("looking at tipo:"+actual_tipo+"  expected:"+expected_tipo);
				// console.log("looking at size:"+  actual_size  +"  expected:"+expected_size);
				// console.log("looking at X:"+  actual_x  +"  expected:"+expected_x);
				// console.log("looking at Y:"+  actual_y  +"  expected:"+expected_y);
				// console.log("looking at rotation:"+  actual_rotation  +"  expected:"+expected_rotation);
				if((expected_tipo == actual_tipo)
				&& (expected_size-scale_margin <= actual_size && actual_size <= expected_size+scale_margin)
				&& (expected_x-translate_margin <= actual_x && actual_x <= expected_x+translate_margin)
				&& (expected_y-translate_margin <= actual_y && actual_y <= expected_y+translate_margin)){
					if((actual_tipo=="rectangulo" || actual_tipo=="trapezoide")
					&& (expected_rotation == actual_rotation || expected_rotation == (actual_rotation+180)%360)){
						total_correct++;
					} else if(actual_tipo=="cuadrado"
					&& (expected_rotation == actual_rotation || expected_rotation == (actual_rotation+90)%360
					|| expected_rotation == (actual_rotation+180)%360 || expected_rotation == (actual_rotation+270)%360)) {
						total_correct++;
					} else if(expected_rotation == actual_rotation){	// triangulo
							total_correct++;
					}
				}
			}
			// console.log("---");
		}
		console.log("expected_correct:"+expected_correct);
		console.log("total_correct:"+total_correct);
		if(total_correct == expected_correct){
			window.alert("ALL figures correct!!!!!!!");
		}
	});
}

function update_figure_selected() {
	figure_selected = parseInt(selector.value) + lineas_count;
}

function rotate_CW() {
	scene.listModels[figure_selected-1].rotate(-1*rotate_units);
	scene.render();
	checkSolution();
}

function rotate_CCW() {
	scene.listModels[figure_selected-1].rotate(rotate_units);
	scene.render();
	checkSolution();
}

function scale_up() {
	scene.listModels[figure_selected-1].scale(1.0+scale_units, 1.0+scale_units, 1.);
	scene.render();
	checkSolution();
}

function scale_down() {
	scene.listModels[figure_selected-1].scale(1.0-scale_units, 1.0-scale_units, 1.);
	scene.render();
	checkSolution();
}

function translate_up() {
	scene.listModels[figure_selected-1].translate(0., translate_units, 0.);
	scene.render();
	checkSolution();
}

function translate_down() {
	scene.listModels[figure_selected-1].translate(0., translate_units*-1, 0.);
	scene.render();
	checkSolution();
}

function translate_right() {
	scene.listModels[figure_selected-1].translate(translate_units, 0., 0.);
	scene.render();
	checkSolution();
}

function translate_left() {
	scene.listModels[figure_selected-1].translate(translate_units*-1, 0., 0.);
	scene.render();
	checkSolution();
}

function clear_canvas() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	scene.listModels = [];
	selector.innerHTML = "";
	figure_counter = 0;
	lineas_count = 0;
	loadLevel(current_level);
}

function initMouseEventHandlers() {
	canvas.addEventListener("mousedown", mouseDownEventListener, false);
}

function loadLevel(level){
	var x1 = -1
	var y1 = -1
	var first_x = -1
	var first_y = -1
	nivelesRef.child(level).child("lineas").once('value').then(function(snapshot) {
		var linea = snapshot.val();
		for(var key in linea){
			var x2 = parseFloat(linea[key].x);
			var y2 = parseFloat(linea[key].y);
			if(x1 == -1 && x1 == -1){
				var first_x = x2
				var first_y = y2
			} else {
				scene.addModel(new Line(x1, y1, 1, x2, y2, 1));
				lineas_count++;
				// console.log("x1: "+x1); console.log("y1: "+y1);
				// console.log("x2: "+x2); console.log("y2: "+y2);
				// console.log("----");
			}
			x1 = x2
			y1 = y2
		}
		if(x1 != -1 && x1 != -1){
			scene.addModel(new Line(x1, y1, 1, first_x, first_y, 1));
			lineas_count++;
		}
		scene.render();
	});
}

function getUrlVars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
	    vars[key] = value;
	});
	return vars;
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
	nivelesRef = databaseRef.ref("niveles2d/");
}());

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

	clear_canvas();
	scene.render();

  var display_username = document.getElementById("username");
  username = getUrlVars()["u"];
  if(username == null){
		console.log("username is UNDEFINED");
  } else {
    display_username.innerHTML = username;
    console.log("username:"+username);
  }
}
