import { GOL } from './src';

console.log(GOL);

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

  gol.placeGlider(point.x, point.y, direction);
});

gol.placeGlider(10, 20, 'southwest');
gol.placeGlider(40, 20, 'southeast');
gol.placeGlider(30, 20, 'northeast');
gol.placeGlider(40, 45, 'northwest');
gol.start();
