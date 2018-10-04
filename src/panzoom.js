const { Vector2 } = require('./math');

// TODO: Panner and Zoomer are combined into one class because I couldn't
// figure out a way to set the transform scale and translate separately. How
// stupid is that? The web is so stupid sometimes.
class PannerZoomer {
  constructor({ domElementId }) {
    this.parent = document.getElementById(domElementId);

    this._pan = new Vector2({ x: 0, y: 0 });

    this.setZoomingScale(1.0);
    this.resetPan();
    this.enable();

    let panStartPoint;

    const SCALE_MIN = 0.001;
    const SCALE_MAX = 1000;

    const down = (x, y) => {
      if (this._enabled) {
        panStartPoint = new Vector2({ x, y });
      }
    };

    const up = (x, y) => {
      if (this._enabled) {
        panStartPoint = null;

        if (this._panned) {
          this._panned = false;

          if (this._onPanEnded) {
            this._onPanEnded(this._pan.x, this._pan.y);
          }

          this._centerX = this._pan.x;
          this._centerY = this._pan.y;
        }
      }
    };

    const move = (x, y) => {
      if (this._enabled) {
        if (panStartPoint) {
          const movePoint = new Vector2({ x, y });

          this._panned = true;
          this._pan = movePoint.subtract(panStartPoint);
          this._pan.x += this._centerX;
          this._pan.y += this._centerY;
          //this.updateTransform();

          if (this._onPanCallback) {
            this._onPanCallback(this._pan.x, this._pan.y);
          }
        }
      }
      else {
        // this was added because due to the order of event handlers,
        // sometimes the pan point would get set right before the panzoom was
        // disabled (ie when placing a shape), which caused it to start panning
        // once the button was released.
        panStartPoint = null;
      }
    };

    const zoom = (deltaY, scaleMultiplier) => {
      if (this._enabled) {
        let newZoom;
        if (deltaY > 0) {
          newZoom = this.getZoomingScale() / scaleMultiplier;
        }
        else {
          newZoom = this.getZoomingScale() * scaleMultiplier;
        }

        this.setZoomingScale(newZoom);

        if (lastTimeout) {
          clearTimeout(lastTimeout);
        }
        this._zooming = true;
        //lastTimeout = setTimeout(renderZoom, 100);

        if (this._onZoomCallback) {
          this._onZoomCallback(this._zoomScale);
        }
      }
    };

    let finger1 = new Vector2({ x: 0, y: 0 });
    let finger2 = new Vector2({ x: 0, y: 0 });
    let prevDist = finger1.distanceTo(finger2);

    this.parent.addEventListener('mousedown', (e) => {
      down(e.clientX, e.clientY); 
    });

    this.parent.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        finger1 = new Vector2({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        });

        finger2 = new Vector2({
          x: e.touches[1].clientX,
          y: e.touches[1].clientY,
        });

        prevDist = finger1.distanceTo(finger2);
      }
      else {
        down(e.touches[0].clientX, e.touches[0].clientY); 
      }
    });

    this.parent.addEventListener('mouseup', (e) => {
      up(); 
    });

    this.parent.addEventListener('touchend', (e) => {
      up(); 
    });

    this.parent.addEventListener('mousemove', (e) => {
      move(e.clientX, e.clientY);
    });

    this.parent.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {

        finger1 = new Vector2({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        });

        finger2 = new Vector2({
          x: e.touches[1].clientX,
          y: e.touches[1].clientY,
        });

        const dist = finger1.distanceTo(finger2);

        const diff = prevDist - dist;

        // make sure it's changed by enough. This was necessary because it
        // wasn't working. I think because the changes were too small between
        // events.
        if (Math.abs(diff) > 1.0) {
          zoom(diff, 1.04);
          prevDist = dist;
        }
      }
      else {
        move(e.touches[0].clientX, e.touches[0].clientY); 
      }
    });

    let lastTimeout;
    this.parent.addEventListener('wheel', (e) => {
      zoom(e.deltaY, 1.1); 
      e.preventDefault();
    });
  }

  updateTransform() {
    const transform =
      `translate(${this._pan.x}px, ${this._pan.y}px) scale(${this._zoomScale})`;
    this.parent.style.transform = transform;
    //this.parent.style['transform-origin'] = '0 0';
  }

  getZoomingScale() {
    return this._zoomScale;
  }
  setZoomingScale(scale) {
    this._zoomScale = scale;
    //this.updateTransform();
  }

  setPan(x, y) {
    this._centerX = x;
    this._centerY = y;
    this._pan.x = x;
    this._pan.y = y;
  }

  resetPan() {
    this._centerX = 0;
    this._centerY = 0;
    this._pan.x = 0;
    this._pan.y = 0;
    //this.updateTransform();
  }

  resetZoom() {
    this._zoomScale = 1.0;
    //this.updateTransform();
  }

  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
  }

  onZoom(callback) {
    this._onZoomCallback = callback;
  }

  onPan(callback) {
    this._onPanCallback = callback;
  }

  onPanEnded(callback) {
    this._onPanEnded = callback;
  }
}

module.exports = {
  PannerZoomer,
};
