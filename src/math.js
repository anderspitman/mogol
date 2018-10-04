const DEGREES_TO_RADIANS = Math.PI / 180;

class Vector2 {
  constructor(options) {

    if (options !== undefined) {
      this.x = options.x;
      this.y = options.y;
    }
  }

  add(other) {
    return new Vector2({
      x: this.x + other.x,
      y: this.y + other.y,
    });
  }

  subtract(other) {
    return new Vector2({
      x: this.x - other.x,
      y: this.y - other.y,
    });
  }

  distanceTo(other) {
    return other.subtract(this).getLength();
  }

  getLength() {
    if (this.length === undefined) {
      this.length = Math.sqrt(this.x*this.x + this.y*this.y);
    }
    return this.length;
  }

  normalized() {
    return new Vector2({
      x: this.x / this.getLength(),
      y: this.y / this.getLength(),
    });
  }

  scaledBy(factor) {
    return new Vector2({
      x: this.x * factor,
      y: this.y * factor,
    });
  }
}

class Matrix2D {
  constructor(values) {
    this._values = values;
  }

  translateBy(x, y) {
    this._values[6] += x;
    this._values[6] += x;
    this._values[7] += y;
    this._values[7] += y;
  }

  scaleBy(factor) {
    this._values[0] *= factor;
    this._values[4] *= factor;
  }

  setScale(scale) {
    this._values[0] = scale;
    this._values[4] = scale;
  }

  getArray() {
    return this._values;
  }

  static identity() {
    return new Matrix2D([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]);
  }
}

function unitVectorForAngleDegrees(angle) {
  const rotationRadians = angle * DEGREES_TO_RADIANS;
  const rotationX = Math.cos(rotationRadians);
  const rotationY = Math.sin(rotationRadians);
  return new Vector2({ x: rotationX, y: rotationY });
}

function mean(array) {
  let sum = 0;
  for (let val of array) {
    sum += val;
  }
  return sum / array.length;
}

function basicStats(array) {
  let sum = 0;
  let min = Number.MAX_SAFE_INTEGER;
  let max = Number.MIN_SAFE_INTEGER;

  for (let val of array) {
    sum += val;

    if (val < min) {
      min = val;
    }
    if (val > max) {
      max = val;
    }
  }

  const mean = sum / array.length;

  return {
    min,
    max,
    mean,
  };
}

module.exports = {
  DEGREES_TO_RADIANS,
  Vector2,
  Matrix2D,
  unitVectorForAngleDegrees,
  mean,
  basicStats,
};
