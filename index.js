import { GOL } from './src';
import * as rleParser from "o-rle";

const rle_text = `\
#N Gosper glider gun
#O Bill Gosper
#C A true period 30 glider gun.
#C The first known gun and the first known finite pattern with unbounded growth.
#C www.conwaylife.com/wiki/index.php?title=Gosper_glider_gun
x = 36, y = 9, rule = B3/S23
24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8b
o3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!`;

function parsePattern(text) {
  const patternIter = new rleParser.parse(text);

  let row = patternIter.next();

  const pattern = [];
  while (row) {
    console.log(row);
    pattern.push(row);
    row = patternIter.next();
  }

  return pattern;
}

let pattern = parsePattern(rle_text);

const el = document.getElementById('canvas-container');

const gol = new GOL({
  domElement: el,
  numRows: 200,
  numCols: 400,
  lifeColor: { r: 0, g: 128, b: 255, a: 1 },
  seedColor: { r: 255, g: 0, b: 255, a: .5 },
});

let direction = 'southwest';
window.addEventListener('keypress', (e) => {

  switch (e.key) {
    case 'w':
      direction = 'northwest';
      break;
    case 'a':
      direction = 'southwest';
      break;
    case 's':
      direction = 'southeast';
      break;
    case 'd':
      direction = 'northeast';
      break;
  }
});

el.addEventListener('click', (e) => {
  const point = gol.getGridCoordinates(e.clientX, e.clientY);

  console.log(point);

  //gol.placeGlider(point.x, point.y, direction);
  gol.placePattern(point.x, point.y, pattern);
});

const patternLoadBtn = document.getElementById('load-pattern-btn');
const urlTextInput = document.getElementById('pattern-url-text');

patternLoadBtn.addEventListener('click', (e) => {
  const rleText = urlTextInput.value;
  pattern = parsePattern(rleText);
  console.log(pattern);
});

gol.start();
