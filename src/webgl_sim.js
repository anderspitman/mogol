const { timeNowSeconds } = require('./utils');
import { Vector2 } from './math';

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

  uniform sampler2D uTexture;

  uniform vec2 uResolution;
  uniform vec2 uMouseCoord;

  uniform sampler2D uPatternData;
  uniform vec2 uPatternDimensions;

  void main() {

    vec4 state = texture2D(uTexture, vTexCoord);

    if (state.x == 1.0) {
      gl_FragColor = vec4(0, 1, 0, 1);
    }
    else {
      gl_FragColor = vec4(0, 0, 1, 1);
    }

    vec2 fragCoord = vec2(gl_FragCoord.xy);

    vec2 halfPattern = uPatternDimensions / 2.0;
    vec2 patternCoord = fragCoord - uMouseCoord + halfPattern;

    if (patternCoord.x >= 0.0 && patternCoord.x <= uPatternDimensions.x &&
        patternCoord.y >= 0.0 && patternCoord.y <= uPatternDimensions.y) {

      vec2 patternTexCoord = patternCoord / uPatternDimensions;
      vec4 patternState = texture2D(uPatternData, vec2(patternTexCoord.x, 1.0-patternTexCoord.y));
      if (abs(patternState.x - 1.0) < 0.0001) {
        gl_FragColor = vec4(1, 0, 0, 1);
      }
    }
  }
`;

const golFragSource = `

  precision mediump float;

  varying vec2 vTexCoord;

  uniform sampler2D uTexture;
  uniform vec2 uGridDimensions;

  void main() {

    vec2 fragCoord = vec2(gl_FragCoord.xy);
    vec4 fragColor = texture2D(uTexture, fragCoord/uGridDimensions.xy); 

    vec4 u=vec4(0.0);
    u+=texture2D(uTexture, (fragCoord+vec2(-1.0,-1.0))/uGridDimensions.xy); 
    u+=texture2D(uTexture, (fragCoord+vec2( 0.0,-1.0))/uGridDimensions.xy); 
	  u+=texture2D(uTexture, (fragCoord+vec2( 1.0,-1.0))/uGridDimensions.xy); 
  	u+=texture2D(uTexture, (fragCoord+vec2(-1.0, 0.0))/uGridDimensions.xy); 
  	u+=texture2D(uTexture, (fragCoord+vec2( 1.0, 0.0))/uGridDimensions.xy); 
		u+=texture2D(uTexture, (fragCoord+vec2(-1.0, 1.0))/uGridDimensions.xy); 
    u+=texture2D(uTexture, (fragCoord+vec2( 0.0, 1.0))/uGridDimensions.xy); 
    u+=texture2D(uTexture, (fragCoord+vec2( 1.0, 1.0))/uGridDimensions.xy);
    if(u.x==3.0)
      fragColor.x=1.0;
    else if(u.x<2.0)
		  fragColor.x=0.0;
    else if(u.x>3.0)
      fragColor.x=0.0;

    fragColor.a = 0.0;

    gl_FragColor = fragColor;
  }
`;

const placePatternFragSource = `

  precision mediump float;

  varying vec2 vTexCoord;

  uniform sampler2D uTexture;
  uniform vec2 uResolution;

  void main() {

    vec2 fragCoord = vec2(gl_FragCoord.xy);
    vec4 fragColor = texture2D(uTexture, fragCoord/uResolution.xy); 

    gl_FragColor = fragColor;
    //gl_FragColor = vec4(1, 0, 0, 1);
  }
`;

// simple quad to cover entire canvas
const QUAD = new Float32Array([
  1, 1,
  1, -1,
  -1, 1,
  -1, -1,
]);


class Matrix {
  constructor(width, height, array) {
    this.width = width;
    this.height = height;

    this.array = array ? array : new Uint8Array(width * height);
  }

  rotate90() {
    const newArr = rotateMat90(this.array, this.width, this.height);
    return new Matrix(this.height, this.width, newArr);
  }
}


class TextureData {
  constructor(width, height) {

    this._width = width;
    this._heigh = height;
    this._buf = new Uint8Array(width * height * 4);
  }

  setTexel(row, col, value) {
    const i = (row * this._width + col) * 4;
    this._buf[i] = value[0];
    this._buf[i + 1] = value[1];
    this._buf[i + 2] = value[2];
    this._buf[i + 3] = value[3];
  }

  getBuffer() {
    return this._buf;
  }
}

export class WebGLSim {
  constructor({ domElementId, numRows, numCols }) {

    this._numRows = numRows;
    this._numCols = numCols;

    this.$el = document.getElementById(domElementId);

    const dim = this.$el.getBoundingClientRect();
    this._dim = dim;
    this._trans = new Vector2({ x: 0, y: 0 });
    this._zoom = 1.0;

    this.canvas = document.createElement('canvas');
    this.canvas.width = dim.width;
    this.canvas.height = dim.height;
    this.$el.appendChild(this.canvas);


    this._curPos = new Vector2({ x: 0, y: 0 });
    this._curGridPos = new Vector2({ x: 0, y: 0 });
    this.canvas.addEventListener('mousemove', (e) => {
      this._curPos.x = this.getWorldX(e.clientX);
      this._curPos.y = this.getWorldY(e.clientY);
      this._curGridPos.x = this.getGridCoordinatesX(e.clientX);
      this._curGridPos.y = this.getGridCoordinatesY(e.clientY);
      //console.log(this._curGridPos);
    });

    this.canvas.addEventListener('click', (e) => {
      this.placePattern();
    });


    this.gl = this.canvas.getContext('webgl');
    const gl = this.gl;

    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // see https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html
    const alignment = 1;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const golShaderProgram = initShaderProgram(gl, vsSource, golFragSource);
    const placePatternShaderProgram = initShaderProgram(gl, vsSource, placePatternFragSource);

    this.defaultShaderInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        texCoordPosition: this.gl.getAttribLocation(shaderProgram, 'aTexCoord'),
      },
      uniformLocations: {
        uResolution: this.gl.getUniformLocation(shaderProgram, 'uResolution'),
        uMouseCoord: this.gl.getUniformLocation(shaderProgram, 'uMouseCoord'),
        uModelViewMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        uTexture: this.gl.getUniformLocation(shaderProgram, 'uTexture'),
        uPatternData: this.gl.getUniformLocation(shaderProgram, 'uPatternData'),
        uPatternDimensions: this.gl.getUniformLocation(shaderProgram, 'uPatternDimensions'),
      },
    };

    this.golShaderInfo = {
      program: golShaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(golShaderProgram, 'aVertexPosition'),
        texCoordPosition: gl.getAttribLocation(golShaderProgram, 'aTexCoord'),
      },
      uniformLocations: {
        uGridDimensions: this.gl.getUniformLocation(golShaderProgram, 'uGridDimensions'),
        uTexture: this.gl.getUniformLocation(golShaderProgram, 'uTexture'),
      },
    };

    this.placePatternShaderInfo = {
      program: placePatternShaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(placePatternShaderProgram, 'aVertexPosition'),
        texCoordPosition: gl.getAttribLocation(placePatternShaderProgram, 'aTexCoord'),
      },
      uniformLocations: {
        uResolution: this.gl.getUniformLocation(placePatternShaderProgram, 'uResolution'),
        uTexture: this.gl.getUniformLocation(placePatternShaderProgram, 'uTexture'),
      },
    };

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.enableVertexAttribArray(
        this.defaultShaderInfo.attribLocations.vertexPosition);
    gl.vertexAttribPointer(
        this.defaultShaderInfo.attribLocations.vertexPosition, 2, gl.FLOAT,
        false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

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

    const texWidth = this._numCols; 
    this._texWidth = texWidth;
    const texHeight = this._numRows;
    this._texHeight = texHeight;

    const texData = new TextureData(texWidth, texHeight);

    // set up texture
    const front = createRenderTarget(gl, texWidth, texHeight);
    this._front = front;
    const back = createRenderTarget(gl, texWidth, texHeight);
    this._back = back;

    gl.bindTexture(gl.TEXTURE_2D, back.texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, texWidth, texHeight, 0, gl.RGBA,
      gl.UNSIGNED_BYTE, texData.getBuffer());

    this._patternTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._patternTexture);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );

    gl.useProgram(this.defaultShaderInfo.program);
    gl.uniform2f(this.defaultShaderInfo.uniformLocations.uResolution,
      this.canvas.width, this.canvas.height);
    gl.uniform1i(this.defaultShaderInfo.uniformLocations.uPatternData, 1);
  }

  step(grid, numRows, numCols) {

    const startTime = timeNowSeconds();

    const gl = this.gl;

    gl.useProgram(this.golShaderInfo.program);
    gl.viewport(0, 0, this._texWidth, this._texHeight);
    //gl.clearColor(1, 0, 0, 1);
    //gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(this.golShaderInfo.uniformLocations.uGridDimensions, this._texWidth, this._texHeight);

    gl.bindTexture(gl.TEXTURE_2D, this._back.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._front.framebuffer);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(this.defaultShaderInfo.program);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    //gl.clearColor(0, 0, 1, 1);
    //gl.clear(gl.COLOR_BUFFER_BIT);

    //console.log(this._curGridPos);
    gl.uniform2f(this.defaultShaderInfo.uniformLocations.uMouseCoord,
      //this._curGridPos.x, this._numRows - this._curGridPos.y);
      //this._curPos.x, this.canvas.height - this._curPos.y);
      this._curPos.x, this.canvas.height - this._curPos.y);
    gl.bindTexture(gl.TEXTURE_2D, this._front.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const temp = this._front;
    this._front = this._back;
    this._back = temp;

    //console.log("WebGL time: " + (timeNowSeconds() - startTime));
  }

  setPattern(pattern) {
    this._pattern = pattern;

    this._patternWidth = this._pattern[0].length;
    this._patternHeight = this._pattern.length;
    this._patternHalfWidth = Math.floor(this._patternWidth / 2);
    this._patternHalfHeight = Math.floor(this._patternHeight / 2);

    this._updatePatternTexture();
  }

  setOrientation(orientation) {
    this._orientation = orientation;
    this._updatePatternTexture();
  }

  _updatePatternTexture() {

    let patternTexData = new Uint8Array(this._patternWidth * this._patternHeight);

    for (let j = 0; j < this._pattern.length; j++) {
      const row = this._pattern[j];
      for (let i = 0; i < row.length; i++) {
        patternTexData[j*this._patternWidth + i] = row[i] === 1 ? 255 : 0;
      }
    }

    let mat = new Matrix(this._patternWidth, this._patternHeight, patternTexData);

    // TODO: this is a hack since I've only implemented 90 degree rotation.
    // Probably change it to rotate the pattern when a key is pressed rather
    // than maintaining the orientation state.
    switch (this._orientation) {
      case 'left':
        mat = mat.rotate90();
        break;
      case 'down':
        mat = mat.rotate90();
        mat = mat.rotate90();
        break;
      case 'right':
        mat = mat.rotate90();
        mat = mat.rotate90();
        mat = mat.rotate90();
        break;
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._patternTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, mat.width, mat.height, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, mat.array);
    gl.activeTexture(gl.TEXTURE0);

    const xConv = this.canvas.width / this._numCols;
    const yConv = this.canvas.height / this._numRows;

    gl.uniform2f(this.defaultShaderInfo.uniformLocations.uPatternDimensions,
      mat.width * xConv, mat.height * yConv);

    this._patternMatrix = mat;
  }

  placePattern() {
    const gl = this.gl;

    // read current texture
    const size = this._numRows * this._numCols * 4;
    const pixels = new Uint8Array(size);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._back.framebuffer);
    gl.readPixels(0, 0, this._numCols, this._numRows, gl.RGBA,
      gl.UNSIGNED_BYTE, pixels);

    const mat = this._patternMatrix;

    for (let j = 0; j < mat.height; j++) {
      for (let i = 0; i < mat.width; i++) {

        if (mat.array[j*mat.width + i] === 255) {
          const x = this._curGridPos.x + i - Math.floor(mat.width/2);
          const y = this._curGridPos.y + j - Math.floor(mat.height/2);
          pixels[(y*this._numCols*4) + x*4] = 255;
        }
      }
    }

    // upload the new texture data
    gl.bindTexture(gl.TEXTURE_2D, this._back.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this._numCols, this._numRows, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }

  getWorldX(x) {
    x -= this._dim.left;
    return (x - this._trans.x) / this._zoom;
  }

  getWorldY(y) {
    y -= this._dim.top;
    return (y - this._trans.y) / this._zoom;
  }

  getGridCoordinatesX(cursorX) {
    const worldX = this.getWorldX(cursorX);
    const x = Math.floor((worldX / this._dim.width) * this._numCols);
    return x;
  }

  getGridCoordinatesY(cursorY) {
    const worldY = this.getWorldY(cursorY);
    const y = Math.floor((worldY/ this._dim.height) * this._numRows);
    return y;
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

function createRenderTarget(gl, width, height) {
	var target = {};
	target.framebuffer = gl.createFramebuffer();
	target.texture = gl.createTexture();
	// set up framebuffer
	gl.bindTexture( gl.TEXTURE_2D, target.texture );
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.bindFramebuffer( gl.FRAMEBUFFER, target.framebuffer );
	gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0 );
	// clean up
	gl.bindTexture( gl.TEXTURE_2D, null );
	gl.bindFramebuffer( gl.FRAMEBUFFER, null);
	return target;
}

function rotateMat90(mat, width, height) {
  const rotated = new Uint8Array(width * height);

  const rotWidth = height;
  const rotHeight = width;

  for (let y = 0; y < height; y++) {
    const rotX = y;
    for (let x = 0; x < width; x++) {
      const rotY = rotHeight - x - 1;
      rotated[rotY*rotWidth + rotX] = mat[y*width + x];
    }
  }

  return rotated;
}


