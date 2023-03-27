paper.install(window);

var isTouchGesture = false;

window.onload = function () {
  paper.setup("myCanvas");

  let mandalaDrawer = new MandalaDrawer();
  mandalaDrawer.loadCurrent();

  initPinchZoom(mandalaDrawer);

  view.translate(view.center);

  setupEventListeners(mandalaDrawer);
};

function initPinchZoom(mandalaDrawer) {
  const canvasElement = paper.view.element;
  const box = canvasElement.getBoundingClientRect();
  const offset = new paper.Point(box.left, box.top);

  const hammer = new Hammer(canvasElement, {});
  hammer.get("pinch").set({ enable: true });
  hammer.get("tap").set({ enable: true, pointers: 2 });

  let pinching, startMatrix, startMatrixInverted, p0ProjectCoords;

  hammer.on("pinchstart", (e) => {
    isTouchGesture = true;

    startMatrix = paper.view.matrix.clone();
    startMatrixInverted = startMatrix.inverted();
    const p0 = getCenterPoint(e);
    p0ProjectCoords = paper.view.viewToProject(p0);
  });

  hammer.on("pinch", (e) => {
    // Translate and scale view using pinch event's 'center' and 'scale' properties.
    // Translation computes center's distance from initial center (considering current scale).
    const p = getCenterPoint(e);
    const pProject0 = p.transform(startMatrixInverted);
    const delta = pProject0.subtract(p0ProjectCoords).divide(e.scale);
    paper.view.matrix = startMatrix
      .clone()
      .scale(e.scale, p0ProjectCoords)
      .translate(delta);
  });

  hammer.on("pinchend", (e) => {
    isTouchGesture = false;
  });

  hammer.on("tap", (e) => {
    mandalaDrawer.undo();
  });

  function getCenterPoint(e) {
    return new paper.Point(e.center.x, e.center.y).subtract(offset);
  }
}

function setupEventListeners(mandalaDrawer) {
  document.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      if (e.ctrlKey) {
        view.zoom -= e.deltaY * 0.005;
      } else {
        view.translate(-e.deltaX, -e.deltaY);
      }
    },
    { passive: false }
  );

  document.addEventListener("keydown", function (event) {
    if (event.key == "s" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();

      mandalaDrawer.saveAsPNG();
    }

    if (event.key == "+" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      view.zoom *= 1.1;
    }
    if (event.key == "-" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      view.zoom /= 1.1;
    }

    // move around
    if (event.key == "ArrowUp") {
      view.translate(0, 10);
    }
    if (event.key == "ArrowDown") {
      view.translate(0, -10);
    }
    if (event.key == "ArrowLeft") {
      view.translate(10, 0);
    }
    if (event.key == "ArrowRight") {
      view.translate(-10, 0);
    }

    if (event.key == "z" && (event.metaKey || event.ctrlKey)) {
      mandalaDrawer.undo();
    }
  });

  // brush modal stuff
  let undoButton = document.getElementById("undo-button");
  undoButton.addEventListener("click", function (e) {
    mandalaDrawer.undo();
  });

  let mirrorButton = document.getElementById("mirror-button");
  if (mandalaDrawer.mirror) {
    mirrorButton.classList.remove("is-light");
  } else {
    mirrorButton.classList.add("is-light");
  }

  mirrorButton.addEventListener("click", function (e) {
    mandalaDrawer.mirror = !mandalaDrawer.mirror;
    if (mandalaDrawer.mirror) {
      mirrorButton.classList.remove("is-light");
    } else {
      mirrorButton.classList.add("is-light");
    }
  });

  let simplifyButton = document.getElementById("simplify-button");
  if (mandalaDrawer.simplify) {
    simplifyButton.classList.remove("is-light");
  } else {
    simplifyButton.classList.add("is-light");
  }

  simplifyButton.addEventListener("click", function (e) {
    mandalaDrawer.simplify = !mandalaDrawer.simplify;
    if (mandalaDrawer.simplify) {
      simplifyButton.classList.remove("is-light");
    } else {
      simplifyButton.classList.add("is-light");
    }
  });

  let brushColorInput = document.getElementById("brush-color-input");
  brushColorInput.value = mandalaDrawer.brushColor;

  brushColorInput.addEventListener("change", function (e) {
    mandalaDrawer.brushColor = brushColorInput.value;
  });

  setupBrushSizeSlider(mandalaDrawer);
  setupRotationsSlider(mandalaDrawer);

  // file modal stuff
  let fileInput = document.getElementById("svg-file-input");
  fileInput.onchange = () => {
    if (fileInput.files.length > 0) {
      const fileName = document.querySelector("#file-js-example .file-name");
      fileName.textContent = fileInput.files[0].name;
    }
  };
}

function setupBrushSizeSlider(mandalaDrawer) {
  let brushSizeInput = document.getElementById("brush-size-input");
  let brushSizeBar = document.getElementById("brush-size-bar");

  brushSizeBar.value = mandalaDrawer.brushSizePercentage * 100;
  brushSizeInput.value = mandalaDrawer.brushSize;

  brushSizeBar.addEventListener("click", function (e) {
    let brushSize = e.offsetX / brushSizeBar.offsetWidth;
    mandalaDrawer.setPercentageBrushSize(brushSize);

    brushSizeBar.value = mandalaDrawer.brushSizePercentage * 100;
    brushSizeInput.value = mandalaDrawer.brushSize;
  });

  let mouseDown = false;
  brushSizeBar.addEventListener("pointerdown", function (e) {
    mouseDown = true;
  });
  document.addEventListener("pointerup", function (e) {
    mouseDown = false;
  });
  brushSizeBar.addEventListener("pointermove", function (e) {
    if (mouseDown == false) return;
    let brushSize = e.offsetX / brushSizeBar.offsetWidth;
    mandalaDrawer.setPercentageBrushSize(brushSize);

    brushSizeBar.value = mandalaDrawer.brushSizePercentage * 100;
    brushSizeInput.value = mandalaDrawer.brushSize;
  });

  brushSizeInput.addEventListener("change", function (e) {
    let brushSize = brushSizeInput.value;
    mandalaDrawer.brushSize = brushSize;

    brushSizeBar.value = mandalaDrawer.brushSizePercentage * 100;
    brushSizeInput.value = mandalaDrawer.brushSize;
  });
}

function setupRotationsSlider(mandalaDrawer) {
  let rotationsInput = document.getElementById("rotations-input");
  let rotationsBar = document.getElementById("rotations-bar");

  rotationsBar.value = mandalaDrawer.rotationsPercentage * 100;
  rotationsInput.value = mandalaDrawer.rotations;

  rotationsBar.addEventListener("click", function (e) {
    let rotations = e.offsetX / rotationsBar.offsetWidth;
    mandalaDrawer.setPercentageRotations(rotations);

    rotationsBar.value = mandalaDrawer.rotationsPercentage * 100;
    rotationsInput.value = mandalaDrawer.rotations;
  });

  let mouseDown = false;
  rotationsBar.addEventListener("pointerdown", function (e) {
    mouseDown = true;
  });
  document.addEventListener("pointerup", function (e) {
    mouseDown = false;
  });
  rotationsBar.addEventListener("pointermove", function (e) {
    if (mouseDown == false) return;
    let rotations = e.offsetX / rotationsBar.offsetWidth;
    mandalaDrawer.setPercentageRotations(rotations);

    rotationsBar.value = mandalaDrawer.rotationsPercentage * 100;
    rotationsInput.value = mandalaDrawer.rotations;
  });

  rotationsInput.addEventListener("change", function (e) {
    let rotations = rotationsInput.value;
    mandalaDrawer.rotations = rotations;

    rotationsBar.value = mandalaDrawer.rotationsPercentage * 100;
    rotationsInput.value = mandalaDrawer.rotations;
  });
}

function downloadURI(uri, name) {
  var link = document.createElement("a");
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  delete link;
}

class MandalaDrawer {
  constructor() {
    this.tool = new Tool();

    let json = localStorage.getItem("brush-settings");
    let settings = json === null ? {} : JSON.parse(json);

    this.path = undefined;
    this.paths = undefined;

    this._simplify = settings.simplify ?? true;
    this._mirror = settings.mirror ?? true;

    this._brushColor = settings.brushColor ?? "#FF0000";

    this.minRotations = 0;
    this.maxRotations = 32;

    this.maxBrushSize = 15;
    this.minBrushSize = 0.2;

    this.rotations = settings.rotations ?? 8;
    this.brushSize = settings.brushSize ?? 1;

    this.setupTool();
  }

  saveAsPNG() {
    view.element.toBlob((blob) => {
      let dataURL = URL.createObjectURL(blob);
      downloadURI(dataURL, "mandala.png");
    });
  }

  setPercentageBrushSize(percentage) {
    if (isNaN(percentage)) percentage = 0;

    percentage = Math.max(0, percentage);
    percentage = Math.min(1, percentage);

    this.brushSizePercentage = percentage;

    let brushSize =
      this.minBrushSize + (this.maxBrushSize - this.minBrushSize) * percentage;

    this._brushSize = Math.round(brushSize * 10) / 10;
  }

  setPercentageRotations(percentage) {
    if (isNaN(percentage)) percentage = 0;

    percentage = Math.max(0, percentage);
    percentage = Math.min(1, percentage);

    this.rotationsPercentage = percentage;

    let rotations =
      this.minRotations + (this.maxRotations - this.minRotations) * percentage;

    this.rotations = Math.round(rotations);
  }

  set mirror(mirror) {
    this._mirror = mirror;
    this.saveSettings();
  }
  get mirror() {
    return this._mirror;
  }
  set rotations(rotations) {
    this._rotations = rotations;
    let percentage =
      (rotations - this.minRotations) / (this.maxRotations - this.minRotations);
    percentage = Math.max(0, percentage);
    percentage = Math.min(1, percentage);

    this.rotationsPercentage = percentage;
    this.saveSettings();
  }
  get rotations() {
    return this._rotations;
  }
  set simplify(simplify) {
    this._simplify = simplify;
    this.saveSettings();
  }
  get simplify() {
    return this._simplify;
  }
  set brushColor(color) {
    this._brushColor = color;
    this.saveSettings();
  }
  get brushColor() {
    return this._brushColor;
  }
  set brushSize(size) {
    this._brushSize = size;
    let percentage =
      (size - this.minBrushSize) / (this.maxBrushSize - this.minBrushSize);
    percentage = Math.max(0, percentage);
    percentage = Math.min(1, percentage);

    this.brushSizePercentage = percentage;
    this.saveSettings();
  }
  get brushSize() {
    return this._brushSize;
  }

  setupTool() {
    this.tool.onMouseDown = (event) => {
      if (event.modifiers.shift || isTouchGesture) {
        return;
      }

      this.paths = [this.makePath()];

      if (this.mirror) {
        let mirrorPath = this.makePath();
        this.paths.push(mirrorPath);
      }

      for (let i = 1; i <= this.rotations; i++) {
        let p = this.makePath();
        this.paths.push(p);

        if (this.mirror) {
          let mp = this.makePath();
          this.paths.push(mp);
        }
      }

      let group = new Group(this.paths);

      this.addPoint(event.point);

      this.lastPathOnePoint = true;
    };

    this.tool.onMouseDrag = (event) => {
      if (event.modifiers.shift || isTouchGesture) {
        view.translate(event.delta);
        return;
      }

      if (this.paths === undefined) {
        return;
      }

      this.addPoint(event.point);

      this.lastPathOnePoint = false;
    };

    this.tool.onMouseUp = (event) => {
      if (event.modifiers.shift || this.paths === undefined || isTouchGesture) {
        return;
      }

      if (this.simplify) {
        for (let p of this.paths) {
          p.simplify(10);
        }
      }

      this.paths = undefined;

      if (this.lastPathOnePoint) {
        this.undo();
        return;
      }

      // save project
      this.saveCurrent();
    };
  }

  makePath() {
    let p = new Path();
    p.strokeColor = this.brushColor;
    p.strokeWidth = this.brushSize;
    return p;
  }

  mirrorPoint(point) {
    return new Point(point.x, -point.y);
  }

  addPoint(point) {
    if (this.paths === undefined || this.paths.length < 1) return;
    this.paths[0].add(point);

    let index = 1;
    if (this.mirror) {
      this.paths[index].add(this.mirrorPoint(point));
      index += 1;
    }

    for (let i = 1; i <= this.rotations; i++) {
      let p = point.rotate((360 / this.rotations) * i);
      this.paths[index].add(p);
      index += 1;

      if (this.mirror) {
        this.paths[index].add(this.mirrorPoint(p));
        index += 1;
      }
    }
  }

  saveCurrent() {
    let json = paper.project.exportJSON();
    localStorage.setItem("current-project", json);
  }

  loadCurrent() {
    let json = localStorage.getItem("current-project");
    paper.project.importJSON(json);
  }

  undo() {
    let last = paper.project.activeLayer.lastChild;
    if (last == undefined) return;
    last.remove();

    this.saveCurrent();
  }

  saveSettings() {
    let settings = {};
    settings.mirror = this.mirror;
    settings.simplify = this.simplify;
    settings.rotations = this.rotations;
    settings.brushSize = this.brushSize;
    settings.brushColor = this.brushColor;

    localStorage.setItem("brush-settings", JSON.stringify(settings));
  }
}

function openModal($el) {
  $el.classList.add("is-active");
}

function openBrushModal() {
  openModal(document.getElementById("brush-modal"));
}

function openFileModal() {
  openModal(document.getElementById("file-modal"));
}

function closeModal($el) {
  $el.classList.remove("is-active");
}

document.addEventListener("DOMContentLoaded", () => {
  function closeAllModals() {
    (document.querySelectorAll(".modal") || []).forEach(($modal) => {
      closeModal($modal);
    });
  }

  // Add a click event on buttons to open a specific modal
  (document.querySelectorAll(".js-modal-trigger") || []).forEach(($trigger) => {
    const modal = $trigger.dataset.target;
    const $target = document.getElementById(modal);

    $trigger.addEventListener("click", () => {
      openModal($target);
    });
  });

  // Add a click event on various child elements to close the parent modal
  (
    document.querySelectorAll(
      ".modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button"
    ) || []
  ).forEach(($close) => {
    const $target = $close.closest(".modal");

    $close.addEventListener("click", () => {
      closeModal($target);
    });
  });

  // Add a keyboard event to close all modals
  document.addEventListener("keydown", (event) => {
    const e = event || window.event;

    if (e.keyCode === 27) {
      // Escape key
      closeAllModals();
    }
  });
});
