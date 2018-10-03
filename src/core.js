const SVG_NS = 'http://www.w3.org/2000/svg';

function rgba(c) {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

function parsePattern(patternText) {
  const rows = [];
  for (let line of patternText.split('\n')) {

    line = line.trim();

    if (line === '') {
      continue;
    }

    const row = [];
    rows.push(row);
    
    for (const char of line) {
      let cell;
      if (char === '.') {
        cell = 0;
      }
      else if (char === 'O') {
        cell = 1;
      }
      else {
        throw "Error parsing pattern char: " + char;
      }

      row.push(cell);
    }
  }

  return rows;
}


export class GOL {
  constructor({ domElement, numRows, numCols, lifeColor, seedColor }) {
    this._el = domElement;

    this._lifeColor = lifeColor;
    this._seedColor = seedColor;

    this._tickDelayMs = 100;

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
    this._prevState = patternFunc();
    this._seeds = patternFunc();

    this._seeds[20][20] = 120;
    this._seeds[21][20] = 120;
    this._seeds[22][20] = 120;
    this._seeds[23][20] = 120;


    this._cells = [];

    this._numRows = this._state.length;
    this._numCols = this._state[0].length;

    const dim = this._el.getBoundingClientRect();
    const cellWidth = dim.width / this._numCols;
    const cellHeight = dim.height / this._numRows;
    this._dim = dim;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.style.width = '100%';
    svg.style.height = '100%';
    this._el.appendChild(svg);
    
    for (let i = 0; i < this._state.length; i++) {
      const row = document.createElementNS(SVG_NS, 'g');
      this._cells[i] = [];
      row.classList.add('goli-row');
      row.setAttribute('transform', 'translate(0, ' + i*cellHeight + ')');
      svg.appendChild(row);
      for (let j = 0; j < this._state[0].length; j++) {
        const cell = document.createElementNS(SVG_NS, 'rect');
        cell.setAttribute('width', cellWidth);
        cell.setAttribute('height', cellHeight);
        cell.setAttribute('x', j*cellWidth);
        cell.style.fill = 'white'; 
        cell.style.stroke = 'black'; 
        row.appendChild(cell);
        this._cells[i][j] = cell;
      }
    }

    this.initRender();
  }

  getGridCoordinates(cursorX, cursorY) {
    const x = Math.floor((cursorX / this._dim.width) * this._numCols);
    const y = Math.floor((cursorY / this._dim.height) * this._numRows);
    return { x, y };
  }

  setPatternFunc(func) {
    this._patternFunc = func;
  }

  placeGlider(x, y, direction) {
    if (x > 0 && y > 0 && x < this._numCols && y < this._numRows &&
        this.isSeeded(x, y, 3)) {


      switch(direction) {
        case 'southwest':
          this._state[y-1][x-1] = 1;
          this._state[y][x-1] = 1;
          this._state[y+1][x-1] = 1;
          this._state[y+1][x] = 1;
          this._state[y][x+1] = 1;
          break;
        case 'southeast':
          this._state[y+1][x-1] = 1;
          this._state[y+1][x] = 1;
          this._state[y+1][x+1] = 1;
          this._state[y][x+1] = 1;
          this._state[y-1][x] = 1;
          break;
        case 'northeast':
          this._state[y+1][x+1] = 1;
          this._state[y][x+1] = 1;
          this._state[y-1][x+1] = 1;
          this._state[y-1][x] = 1;
          this._state[y][x-1] = 1;
          break;
        case 'northwest':
          this._state[y-1][x+1] = 1;
          this._state[y-1][x] = 1;
          this._state[y-1][x-1] = 1;
          this._state[y][x-1] = 1;
          this._state[y+1][x] = 1;
          break;
      }
    }

    this.render();
  }

  isSeeded(x, y, distance) {
    for (let j = y - distance; j < y + distance; j++) {
      for (let i = x - distance; i < x + distance; i++) {
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
    for (let i = 0; i < this._state.length; i++) {
      const row = this._state[i];
      console.log(JSON.stringify(row), i);
    }
    console.log();
  }

  tick() {
    //const startTime = timeNowSeconds();

    copyState(this._state, this._newState);
    copyState(this._state, this._prevState);

    for (let i = 0; i < this._state.length; i++) {
      for (let j = 0; j < this._state[0].length; j++) {

        if (this._seeds[i][j] > 0) {
          this._seeds[i][j] -= 1;
        }

        const neighbors = this.neighbors(i, j);

        let liveCount = 0;

        // TODO: this can be generated on the fly in neighbors
        for (const neighbor of neighbors) {
          if (neighbor === 1) {
            liveCount++;
          }
        }

        const currentState = this._state[i][j];
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

    //console.log("Tick time: " + (timeNowSeconds() - startTime));
  }

  neighbors(i, j) {
    // TODO: get rid of this allocation
    const n = [];
    n.push(this.topLeft(i, j));
    n.push(this.top(i, j));
    n.push(this.topRight(i, j));
    n.push(this.left(i, j));
    n.push(this.right(i, j));
    n.push(this.bottomLeft(i, j));
    n.push(this.bottom(i, j));
    n.push(this.bottomRight(i, j));
    return n;
  }

  wrapTop(i) {
    if (i === 0) {
      return this._state.length - 1;
    }
    return i - 1;
  }

  wrapLeft(j) {
    if (j === 0) {
      return this._state[0].length - 1;
    }
    return j - 1;
  }

  wrapRight(j) {
    if (j === this._state[0].length - 1) {
      return 0;
    }
    return j + 1;
  }

  wrapBottom(i) {
    if (i === this._state.length - 1) {
      return 0;
    }
    return i + 1;
  }

  topLeft(i, j) {
    return this._state[this.wrapTop(i)][this.wrapLeft(j)];
  }

  top(i, j) {
    return this._state[this.wrapTop(i)][j];
  }

  topRight(i, j) {
    return this._state[this.wrapTop(i)][this.wrapRight(j)];
  }

  left(i, j) {
    return this._state[i][this.wrapLeft(j)];
  }

  right(i, j) {
    return this._state[i][this.wrapRight(j)];
  }

  bottomLeft(i, j) {
    return this._state[this.wrapBottom(i)][this.wrapLeft(j)];
  }

  bottom(i, j) {
    return this._state[this.wrapBottom(i)][j];
  }

  bottomRight(i, j) {
    return this._state[this.wrapBottom(i)][this.wrapRight(j)];
  }

  // don't check if value changed on first render
  initRender() {
    for (let i = 0; i < this._numRows; i++) {
      for (let j = 0; j < this._numCols; j++) {
          this.renderCell(i, j, this._state[i][j]);
      }
    }
  }

  render() {
    //const startTime = timeNowSeconds();

    for (let i = 0; i < this._numRows; i++) {
      for (let j = 0; j < this._numCols; j++) {
        //if (this._state[i][j] !== this._prevState[i][j]) {
        this.renderCell(i, j, this._state[i][j]);
        //}
      }
    }

    //console.log("Render time: " + (timeNowSeconds() - startTime));
  }

  renderCell(i, j, state) {
    if (state === 1) {
      this._cells[i][j].classList.remove('goli-dead');
      this._cells[i][j].classList.add('goli-live');
      this._cells[i][j].style.fill = rgba(this._lifeColor);
      this._cells[i][j].style.fillOpacity = 1.0;
    }
    else {
      this._cells[i][j].classList.remove('goli-live');
      this._cells[i][j].classList.add('goli-dead');

      if (this._seeds[i][j] > 0) {
        this._cells[i][j].style.fill = rgba(this._seedColor);
        this._cells[i][j].style.fillOpacity = this._seeds[i][j] / 100; 
      }
      else {
        this._cells[i][j].style.fill = 'white';
      }
    }
    
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
