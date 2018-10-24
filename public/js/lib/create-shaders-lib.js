function createShader(gl, type, source)
{
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (success) 
	{
		return shader;
	}
	else
	{
		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
	}
}

function createShaderProgram(gl, vertexShader, fragmentShader)
{
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if(success)
	{
		return program;
	}
	else
	{
		console.log(gl.getShaderInfoLog(program));
		gl.deleteShader(program);
	}
}