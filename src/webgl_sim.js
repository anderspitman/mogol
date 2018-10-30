const { timeNowSeconds } = require('./utils');

const vsSource = `
  attribute vec2 aVertexPosition;

  void main() {
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
  }
`;

const fsSource = `
  void main() {
    if (gl_FragCoord.x > 100.0) {
      gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
    }
    else {
      gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
    }
  }
`;



export class WebGLSim {
  constructor({ domElementId }) {
    this.$el = document.getElementById(domElementId);

    const dim = this.$el.getBoundingClientRect();

    this.canvas = document.createElement('canvas');
    this.canvas.width = dim.width;
    this.canvas.height = dim.height;
    this.$el.appendChild(this.canvas);
    this.gl = this.canvas.getContext('webgl');

    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    const shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);

    this.defaultShaderInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      },
      //uniformLocations: {
      //  uResolution: this.gl.getUniformLocation(shaderProgram, 'uResolution'),
      //  uModelViewMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      //},
    };

    this.initBuffers(this.gl);

    // simple quad to cover entire canvas
    const QUAD = new Float32Array([
      1, 1,
      1, -1,
      -1, 1,
      -1, -1,
    ]);

    this.gl.useProgram(this.defaultShaderInfo.program);

    const gl = this.gl;
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

    gl.vertexAttribPointer(
        this.defaultShaderInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        this.defaultShaderInfo.attribLocations.vertexPosition);

    gl.drawArrays(gl.TRIANGLE_STRIP, offset, 4);

  }

  initBuffers(gl) {

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    this.positionBuffer = positionBuffer;
  }

  render(grid, numRows, numCols) {


    //const startTime = timeNowSeconds();

    //const gl = this.gl;
    //const defaultShaderInfo = this.defaultShaderInfo;
    ////const lineData = this._lines;
    ////const numLines = this._lines.length / 4;

    //gl.useProgram(defaultShaderInfo.program);

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

    //console.log("WebGL Render time: " + (timeNowSeconds() - startTime));
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
