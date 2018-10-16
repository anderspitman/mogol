import { Vector2 } from './math';
import { PannerZoomer } from './panzoom';


function rgba(c) {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}


export class GOL {
  constructor({ domElement, numRows, numCols, lifeColor, seedColor }) {
    this._el = domElement;

    this._lifeColor = lifeColor;
    this._seedColor = seedColor;

    this._tickDelayMs = 32;

    const patternFunc = () => {
      const rows = [];
      for (let i = 0; i < numRows; i++) {
        rows.push(new Uint32Array(numCols).fill(0));
      }
      console.log(rows);
      return rows;
    };

    this._state = patternFunc(); 
    this._newState = patternFunc(); 
    //this._prevState = patternFunc();
    this._seeds = patternFunc();

    this._seeds[numRows/2][numCols/2] = 1024;

    this._numRows = numRows;
    this._numCols = numCols;

    const dim = this._el.getBoundingClientRect();
    console.log(dim);
    this.cellWidth = dim.width / this._numCols;
    this.cellHeight = dim.height / this._numRows;
    this._dim = dim;

    this.canvas = document.createElement('canvas');
    this.canvas.width = dim.width;
    this.canvas.height = dim.height;
    this._el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    const curPos = new Vector2({ x: 0, y: 0 });
    this._curGridPos = new Vector2({ x: 0, y: 0 });
    this.canvas.addEventListener('mousemove', (e) => {
      curPos.x = this.getWorldX(e.clientX);
      curPos.y = this.getWorldY(e.clientY);
      this._curGridPos.x = this.getGridCoordinatesX(e.clientX);
      this._curGridPos.y = this.getGridCoordinatesY(e.clientY);
    });

    const panzoom = new PannerZoomer({
      domElementId: 'canvas-container',
    });
    this._zoom = 1.0;


    panzoom.onZoom((newZoom) => {

      trans(curPos.x, curPos.y);
      this._zoom = newZoom;
      trans(-curPos.x, -curPos.y);

      panzoom.setPan(this._trans.x, this._trans.y);

      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0,
        this.canvas.width, this.canvas.height);
      this.render();

      //panzoom.resetZoom();
    });

    this._trans = new Vector2({ x: 0, y: 0 });

    panzoom.onPan((panX, panY) => {
      this._trans.x = panX;
      this._trans.y = panY;
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0,
        this.canvas.width, this.canvas.height);
      this.render();
    });

    const trans = (x, y) => {
      this._trans.x += (x * this._zoom);
      this._trans.y += (y * this._zoom);
    };

  }

  getCell(rowIndex, colIndex) {
    return this._state[rowIndex][colIndex];
  }

  setCell(rowIndex, colIndex, value) {
    this._state[rowIndex][colIndex] = value;
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
    console.log(orientation);
    this._orientation = orientation;
  }

  placePattern() {
    //if (x > 0 && y > 0 && x < this._numCols && y < this._numRows &&
    //    this.isSeeded(x, y, this._patternHalfWidth, this._patternHalfHeight)) {

      for (let j = 0; j < this._pattern.length; j++) {
        const row = this._pattern[j];
        for (let i = 0; i < row.length; i++) {
          const cell = row[i];
          const rowIndex = this.getOrientedRow(j, i);
          const colIndex = this.getOrientedCol(j, i);
          this.setCell(rowIndex, colIndex, cell);
        }
      }
    //}
  }

  isSeeded(x, y, xDist, yDist) {
    for (let j = y - yDist; j < y + yDist; j++) {
      for (let i = x - xDist; i < x + xDist; i++) {
        if (this._seeds[j][i] > 0) {
          return true;
        }
      }
    }
    return false;
  }
  
  start() {
    const go = () => {
      setInterval(() => {
        this.tick();
        //requestAnimationFrame(this.render.bind(this));
        this.render();
      }, this._tickDelayMs);
    };

    if (!this._startDelayMs) {
      go();
    }
    else {
      setTimeout(go, this._startDelayMs);
    }
  }

  printState() {
    for (let i = 0; i < this._numRows; i++) {
      const row = this._state[i];
      console.log(JSON.stringify(row), i);
    }
    console.log();
  }

  tick() {
    const startTime = timeNowSeconds();

    copyState(this._state, this._newState);
    //copyState(this._state, this._prevState);

    for (let i = 0; i < this._numRows; i++) {
      for (let j = 0; j < this._numCols; j++) {

        if (this._seeds[i][j] > 0) {
          this._seeds[i][j] -= 1;
        }

        const liveCount = this.numLiveNeighbors(i, j);

        const currentState = this.getCell(i, j);
        let newState = currentState;
        if (currentState === 1) {
          if (liveCount < 2) {
            // underpopulation
            newState = 0;
          }
          else if (liveCount > 3) {
            // overpopulation
            newState = 0;
          }
          else {
            // stays live
            newState = 1;
          }
        }
        else {
          if (liveCount === 3) {
            // reproduction
            newState = 1;
            this._seeds[i][j] += 20;
          }
        }

        this._newState[i][j] = newState;
      }
    }

    copyState(this._newState, this._state);

    console.log("Tick time: " + (timeNowSeconds() - startTime));
  }

  numLiveNeighbors(i, j) {
    return (
      this.topLeft(i, j) +
      this.top(i, j) +
      this.topRight(i, j) +
      this.left(i, j) +
      this.right(i, j) +
      this.bottomLeft(i, j) +
      this.bottom(i, j) +
      this.bottomRight(i, j)
    );
  }

  wrapTop(i) {
    if (i === 0) {
      return this._numRows - 1;
    }
    return i - 1;
  }

  wrapLeft(j) {
    if (j === 0) {
      return this._numCols - 1;
    }
    return j - 1;
  }

  wrapRight(j) {
    if (j === this._numCols - 1) {
      return 0;
    }
    return j + 1;
  }

  wrapBottom(i) {
    if (i === this._numRows - 1) {
      return 0;
    }
    return i + 1;
  }

  topLeft(i, j) {
    return this.getCell(this.wrapTop(i), this.wrapLeft(j));
  }

  top(i, j) {
    return this.getCell(this.wrapTop(i), j);
  }

  topRight(i, j) {
    return this.getCell(this.wrapTop(i), this.wrapRight(j));
  }

  left(i, j) {
    return this.getCell(i, this.wrapLeft(j));
  }

  right(i, j) {
    return this.getCell(i, this.wrapRight(j));
  }

  bottomLeft(i, j) {
    return this.getCell(this.wrapBottom(i), this.wrapLeft(j));
  }

  bottom(i, j) {
    return this.getCell(this.wrapBottom(i), j);
  }

  bottomRight(i, j) {
    return this.getCell(this.wrapBottom(i), this.wrapRight(j));
  }

  render() {
    const startTime = timeNowSeconds();

    //this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(this._trans.x, this._trans.y,
      this.canvas.width*this._zoom, this.canvas.height*this._zoom);

    // live cells
    this.ctx.fillStyle = rgba(this._lifeColor);
    this.ctx.beginPath();
    for (let i = 0; i < this._numRows; i++) {
      for (let j = 0; j < this._numCols; j++) {
        if (this.getCell(i, j) === 1) {
          this.drawCell(i, j);
        }
      }
    }
    this.ctx.fill();

    // seed cells
    this.ctx.fillStyle = rgba(this._seedColor);
    this.ctx.beginPath();
    for (let i = 0; i < this._numRows; i++) {
      for (let j = 0; j < this._numCols; j++) {
        if (this._seeds[i][j] > 1 && !this.getCell(i, j)) {
          //this._seedColor.a = this._seeds[i][j] / 100;
          this.drawCell(i, j);
        }
      }
    }
    this.ctx.fill();

    // cursor cells
    this.ctx.fillStyle = '#ff0000';
    this.ctx.beginPath();
    for (let rowIndex = 0; rowIndex < this._pattern.length; rowIndex++) {
      for (let colIndex = 0; colIndex < this._pattern[0].length; colIndex++) {
        if (this._pattern[rowIndex][colIndex] === 1) {
          const gridColIndex = this.getOrientedCol(rowIndex, colIndex);
          const gridRowIndex = this.getOrientedRow(rowIndex, colIndex);
          this.drawCell(gridRowIndex, gridColIndex);
        }
      }
    }
    this.ctx.fill();

    console.log("Render time: " + (timeNowSeconds() - startTime));
  }

  drawCell(i, j) {
    this.ctx.rect(
      j*this.cellWidth*this._zoom + this._trans.x,
      i*this.cellHeight*this._zoom + this._trans.y,
      this.cellWidth*this._zoom, this.cellHeight*this._zoom);
  }

}

function copyState(a, b) {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[0].length; j++) {
      b[i][j] = a[i][j];
    }
  }
}

function timeNowSeconds() {
  return performance.now() / 1000;
}
