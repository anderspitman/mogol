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

  void main() {

    vec4 state = texture2D(uTexture, vTexCoord);
    
    if (state.x == 1.0) {
      gl_FragColor = vec4(0, 1, 0, 1);
    }
    else {
      gl_FragColor = vec4(0, 0, 1, 1);
    }
  }
`;

const golFragSource = `

  precision mediump float;

  varying vec2 vTexCoord;

  uniform sampler2D uTexture;
  uniform vec2 uResolution;

  void main() {

    vec2 fragCoord = vec2(gl_FragCoord.xy);
    vec4 fragColor = texture2D(uTexture, fragCoord/uResolution.xy); 

    vec4 u=vec4(0.0);
    u+=texture2D(uTexture, (fragCoord+vec2(-1.0,-1.0))/uResolution.xy); 
    u+=texture2D(uTexture, (fragCoord+vec2( 0.0,-1.0))/uResolution.xy); 
	  u+=texture2D(uTexture, (fragCoord+vec2( 1.0,-1.0))/uResolution.xy); 
  	u+=texture2D(uTexture, (fragCoord+vec2(-1.0, 0.0))/uResolution.xy); 
  	u+=texture2D(uTexture, (fragCoord+vec2( 1.0, 0.0))/uResolution.xy); 
		u+=texture2D(uTexture, (fragCoord+vec2(-1.0, 1.0))/uResolution.xy); 
    u+=texture2D(uTexture, (fragCoord+vec2( 0.0, 1.0))/uResolution.xy); 
    u+=texture2D(uTexture, (fragCoord+vec2( 1.0, 1.0))/uResolution.xy);
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


    const curPos = new Vector2({ x: 0, y: 0 });
    this._curGridPos = new Vector2({ x: 0, y: 0 });
    this.canvas.addEventListener('mousemove', (e) => {
      curPos.x = this.getWorldX(e.clientX);
      curPos.y = this.getWorldY(e.clientY);
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
        uModelViewMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        uTexture: this.gl.getUniformLocation(shaderProgram, 'uTexture'),
      },
    };

    this.golShaderInfo = {
      program: golShaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(golShaderProgram, 'aVertexPosition'),
        texCoordPosition: gl.getAttribLocation(golShaderProgram, 'aTexCoord'),
      },
      uniformLocations: {
        uResolution: this.gl.getUniformLocation(golShaderProgram, 'uResolution'),
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

    const texWidth = this._numCols; 
    this._texWidth = texWidth;
    const texHeight = this._numRows;
    this._texHeight = texHeight;

    const texData = new TextureData(texWidth, texHeight);
    texData.setTexel(4, 3, [255, 0, 0, 255]);
    texData.setTexel(4, 4, [255, 0, 0, 255]);
    texData.setTexel(4, 5, [255, 0, 0, 255]);
    texData.setTexel(3, 5, [255, 0, 0, 255]);
    texData.setTexel(2, 4, [255, 0, 0, 255]);

    // set up texture
    const front = createRenderTarget(gl, texWidth, texHeight);
    this._front = front;
    const back = createRenderTarget(gl, texWidth, texHeight);
    this._back = back;

    gl.bindTexture(gl.TEXTURE_2D, back.texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, texWidth, texHeight, 0, gl.RGBA,
      gl.UNSIGNED_BYTE, texData.getBuffer());
  }

  step(grid, numRows, numCols) {


    const startTime = timeNowSeconds();

    const gl = this.gl;

    gl.useProgram(this.golShaderInfo.program);
    gl.viewport(0, 0, this._texWidth, this._texHeight);
    //gl.clearColor(1, 0, 0, 1);
    //gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(this.golShaderInfo.uniformLocations.uResolution, this._texWidth, this._texHeight);

    gl.bindTexture(gl.TEXTURE_2D, this._back.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._front.framebuffer);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(this.defaultShaderInfo.program);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    //gl.clearColor(0, 0, 1, 1);
    //gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindTexture(gl.TEXTURE_2D, this._front.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const temp = this._front;
    this._front = this._back;
    this._back = temp;

    //console.log("WebGL time: " + (timeNowSeconds() - startTime));
  }

  getOrientedCol(rowIndex, colIndex) {
    let gridColIndex;
    switch (this._orientation) {
      case 'up':
        gridColIndex = this._curGridPos.x + colIndex - this._patternHalfWidth;
        break;
      case 'left':
        gridColIndex = this._curGridPos.x + rowIndex - this._patternHalfHeight;
        break;
      case 'down':
        gridColIndex = this._curGridPos.x - colIndex + this._patternHalfWidth;
        break;
      case 'right':
        gridColIndex = this._curGridPos.x - rowIndex + this._patternHalfHeight;
        break;
    }

    return gridColIndex;
  }

  getOrientedRow(rowIndex, colIndex) {
    let gridRowIndex;
    switch (this._orientation) {
      case 'up':
        gridRowIndex = this._curGridPos.y + rowIndex - this._patternHalfHeight;
        break;
      case 'left':
        gridRowIndex = this._curGridPos.y - colIndex + this._patternHalfWidth;
        break;
      case 'down':
        gridRowIndex = this._curGridPos.y - rowIndex + this._patternHalfHeight;
        break;
      case 'right':
        gridRowIndex = this._curGridPos.y + colIndex - this._patternHalfWidth;
        break;
    }

    return gridRowIndex;
  }

  setPattern(pattern) {
    this._pattern = pattern;
    this._patternHalfWidth = Math.floor(this._pattern[0].length / 2);
    this._patternHalfHeight = Math.floor(this._pattern.length / 2);
  }

  setOrientation(orientation) {
    this._orientation = orientation;
  }

  placePattern() {
    const gl = this.gl;

    // read current texture
    const size = this._numRows * this._numCols * 4;
    const pixels = new Uint8Array(size);
    //gl.bindFramebuffer(gl.FRAMEBUFFER, this._front.framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._back.framebuffer);
    gl.readPixels(0, 0, this._numCols, this._numRows, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    console.log(pixels);
    for (let i = 0; i < this._numRows; i++) {
      console.log("Row: " + i);
      for (let j = 0; j < this._numCols; j++) {
        const index = (i * this._numCols + j) * 4;
        console.log(pixels.slice(index,  index + 4));
      }
    }

    // place a glider at the current coordinates
    const i = ((this._curGridPos.y * this._numCols) + this._curGridPos.x) * 4;
    pixels[i] = 255;
    pixels[i+4] = 255;
    pixels[i+8] = 255;
    pixels[i+(this._numCols * 4)] = 255;
    pixels[i+(this._numCols * 2 * 4) + 4] = 255;

    // upload the new texture data
    gl.bindTexture(gl.TEXTURE_2D, this._back.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this._numCols, this._numRows, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    //for (let j = 0; j < this._pattern.length; j++) {
    //  const row = this._pattern[j];
    //  for (let i = 0; i < row.length; i++) {
    //    const cell = row[i];
    //    const rowIndex = this.getOrientedRow(j, i);
    //    const colIndex = this.getOrientedCol(j, i);
    //    //this.setCell(this._state, rowIndex, colIndex, cell);
    //  }
    //}
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
