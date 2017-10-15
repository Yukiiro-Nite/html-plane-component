AFRAME.registerComponent('html-plane', {
  schema: {
    url: { type: 'string', default: ''}
  },
  init: function () {
    this.html = Array.from(this.el.children);
    this.camera = this.el.sceneEl.querySelector("#camera");

    this.html.forEach( child => this.el.removeChild(child));

    this.htmlWrapper = document.createElement("div");
    this.htmlWrapper.style = this.getStyle();
    this.html.forEach( child => this.htmlWrapper.appendChild(child));

    document.body.appendChild(this.htmlWrapper);
  },
  update: function () {},
  tick: function () {
    // get the verts from the element and map them to screen space
    let screenVerts = getGlobalVerts(this.el.object3D.children[0])
      .map(vert => {
        let halfWidth = this.el.sceneEl.canvas.width * 0.5;
        let halfHeight = this.el.sceneEl.canvas.height * 0.5;
        let projection = vert.project(this.el.sceneEl.camera);
        return {
          x: (projection.x * halfWidth ) + halfWidth,
          y: -(projection.y * halfHeight) + halfHeight
        }
      });

    // generate some elements on screen to track the verts for debugging
    this.generateVertElements(screenVerts);

    // use this transform method to generate a matrix
    const transform = getTransform([
      {x: 0, y: 0},
      {x: 0, y: 100},
      {x: 100, y: 0},
      {x: 100, y: 100}
    ], screenVerts);

    const transformArray = [];

    // flip the transform matrix because it was generated in the wrong order
    for(let y = 0; y<transform.length; y++) {
      for(let x = 0; x < transform[0].length; x++) {
        transformArray.push(transform[x][y]);
      }
    }

    // apply the matrix to the html element
    this.html[0].style = this.styleFromObj({
      transform: `matrix3d(${transformArray.join(',')})`
    });
  },
  remove: function () {
    document.body.removeChild(this.htmlWrapper);
    this.html.forEach( child => this.el.appendChild(child));
  },
  pause: function () {},
  play: function () {},
  defaultStyle: {
    position: 'absolute',
    'z-index': 2147483647,
    // perspective: '500px',
    top: 0,
    left: 0
  },
  getStyle: function (style = {}) {
    return this.styleFromObj(Object.assign({}, this.defaultStyle, style));
  },
  styleFromObj: function (style = {}) {
    return Object.keys(style).reduce((acc, key) => `${acc}${key}:${style[key]};`, '');
  },
  generateVertElements: function(screenVerts) {
    let colors = ['red', 'blue', 'green', 'black'];
    screenVerts.forEach((vert, index) => {
      if(!this.screenVerts) {
        this.screenVerts = [];
      }
      if(!this.screenVerts[index]) {
        this.screenVerts[index] = document.createElement('div');
        document.body.appendChild(this.screenVerts[index]);
      }
      this.screenVerts[index].style = this.styleFromObj({
        position: 'absolute',
        'z-index': 2147483647,
        'background-color': colors[index],
        top: `${vert.y - 5}px`,
        left: `${vert.x - 5}px`,
        width: '10px',
        height: '10px'
      });
    });
  }
});

// this function returns a set of verts for an object's geometry
function getGlobalVerts(object) {
  const objPosition = object.getWorldPosition();
  const objScale = object.getWorldScale();
  const objQuaternion = object.getWorldQuaternion();

  const vertArrays = object.geometry.attributes.position.array
    .reduce((acc, value, index)=>{
      if( (index % 3) === 0 ) {
        acc[Math.floor(index / 3)] = [];
      }
      acc[Math.floor(index / 3)].push(value);
      return acc;
    },[])
    .reduce((acc, vertArray) => {
      // I'm doing this to filter out duplicates
      acc[JSON.stringify(vertArray)] = vertArray;
      return acc;
    }, {});

  return Object.keys(vertArrays)
    .map(key => vertArrays[key])
    .map(vertArray => new THREE.Vector3(...vertArray)
      .multiply(objScale)
      .applyQuaternion(objQuaternion)
      .add(objPosition)
    );
}

// from http://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/
// had to take the computed javascript from the coffeescript he had
// I don't really understand this code yet and it bothers me greatly.
function getTransform(from, to) {
  var A, H, b, h, i, k, k_i, l, lhs, m, ref, rhs;

  A = [];
  for (i = k = 0; k < 4; i = ++k) {
    A.push([from[i].x, from[i].y, 1, 0, 0, 0, -from[i].x * to[i].x, -from[i].y * to[i].x]);
    A.push([0, 0, 0, from[i].x, from[i].y, 1, -from[i].x * to[i].y, -from[i].y * to[i].y]);
  }

  b = [];
  for (i = l = 0; l < 4; i = ++l) {
    b.push(to[i].x);
    b.push(to[i].y);
  }

  h = numeric.solve(A, b);
  H = [[h[0], h[1], 0, h[2]], [h[3], h[4], 0, h[5]], [0, 0, 1, 0], [h[6], h[7], 0, 1]];
  for (i = m = 0; m < 4; i = ++m) {
    lhs = numeric.dot(H, [from[i].x, from[i].y, 0, 1]);
    k_i = lhs[3];
    rhs = numeric.dot(k_i, [to[i].x, to[i].y, 0, 1]);
  }

  return H;
}