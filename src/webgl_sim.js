const { timeNowSeconds } = require('./utils');

const vsSource = `
  attribute vec2 aVertexPosition;
  attribute vec2 aTexCoord;

  varying vec2 vTexCoord;

  void main() {
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);

    vTexCoord = aTexCoord;
  }
`;

const fsSource = `

  precision mediump float;

  varying vec2 vTexCoord;

  uniform float uVal;
  uniform sampler2D uTexture;

  void main() {
    //if (gl_FragCoord.x > uVal) {
    //  gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
    //}
    //else {
    //  gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
    //}

    //gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
    gl_FragColor = texture2D(uTexture, vTexCoord);
  }
`;

// simple quad to cover entire canvas
const QUAD = new Float32Array([
  1, 1,
  1, -1,
  -1, 1,
  -1, -1,
]);


export class WebGLSim {
  constructor({ domElementId }) {
    this.$el = document.getElementById(domElementId);

    const dim = this.$el.getBoundingClientRect();

    this.canvas = document.createElement('canvas');
    this.canvas.width = dim.width;
    this.canvas.height = dim.height;
    this.$el.appendChild(this.canvas);
    this.gl = this.canvas.getContext('webgl');
    const gl = this.gl;

    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    const shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);

    this.defaultShaderInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        texCoordPosition: this.gl.getAttribLocation(shaderProgram, 'aTexCoord'),
      },
      uniformLocations: {
        uResolution: this.gl.getUniformLocation(shaderProgram, 'uResolution'),
        uModelViewMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        uVal: this.gl.getUniformLocation(shaderProgram, 'uVal'),
      },
    };

    //this.gl.useProgram(this.defaultShaderInfo.program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.enableVertexAttribArray(
        this.defaultShaderInfo.attribLocations.vertexPosition);
    gl.vertexAttribPointer(
        this.defaultShaderInfo.attribLocations.vertexPosition, 2, gl.FLOAT,
        false, 0, 0);

    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

    //gl.drawArrays(gl.TRIANGLE_STRIP, offset, 4);

    const texCoords = new Float32Array([
      1, 0,
      1, 1,
      0, 0,
      0, 1,
    ]);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

    gl.enableVertexAttribArray(
        this.defaultShaderInfo.attribLocations.texCoordPosition);
    gl.vertexAttribPointer(
        this.defaultShaderInfo.attribLocations.texCoordPosition, 2, gl.FLOAT,
        false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // set up texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const texData = new Uint8Array([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 0, 255, 255,
    ]);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA,
      //gl.UNSIGNED_BYTE, new Uint8Array([ 0, 0, 255, 255 ]));
      gl.UNSIGNED_BYTE, texData);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //gl.generateMipmap(gl.TEXTURE_2D);

    //const image = new Image();
    //image.src = '/dist/f-texture.png';
    //image.addEventListener('load', function() {
    //  gl.bindTexture(gl.TEXTURE_2D, texture);
    //  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
    //    image);
    //  gl.generateMipmap(gl.TEXTURE_2D);
    //});

    this._val = 0;
  }

  step(grid, numRows, numCols) {


    const startTime = timeNowSeconds();

    //this.gl.uniform

    const gl = this.gl;
    const defaultShaderInfo = this.defaultShaderInfo;
    ////const lineData = this._lines;
    ////const numLines = this._lines.length / 4;

    gl.useProgram(defaultShaderInfo.program);

    gl.uniform1f(this.defaultShaderInfo.uniformLocations.uVal, this._val);

    const offset = 0;
    const numElements = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, numElements);
    this._val += 1;

    ////gl.uniformMatrix3fv(
    ////    this.defaultShaderInfo.uniformLocations.uModelViewMatrix,
    ////    false,
    ////    this.modelViewMatrix.getArray());

    //{
    //  const numComponents = 2;
    //  const type = gl.FLOAT;
    //  const normalize = false;
    //  const stride = 0;
    //  const offset = 0;
    //  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

    //  gl.bufferData(gl.ARRAY_BUFFER, grid, gl.DYNAMIC_DRAW);

    //  //gl.vertexAttribPointer(
    //  //    defaultShaderInfo.attribLocations.vertexPosition,
    //  //    numComponents,
    //  //    type,
    //  //    normalize,
    //  //    stride,
    //  //    offset);
    //  //gl.enableVertexAttribArray(
    //  //    defaultShaderInfo.attribLocations.vertexPosition);

    //  //gl.drawArrays(gl.LINES, offset, grid.length / numComponents);
    //}

    //console.log("WebGL time: " + (timeNowSeconds() - startTime));
  }
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
