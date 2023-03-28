paper.install(window);

var isTouchGesture = false;

window.onload = function () {
  paper.setup("myCanvas");

  let mandalaDrawer = new MandalaDrawer();
  mandalaDrawer.loadFile();

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
  let canvas = document.getElementById("myCanvas");

  canvas.addEventListener(
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

    if (event.key == "f" && (event.metaKey || event.ctrlKey)) {
      openSettingsModal();
    }

    if (event.key == "b" && (event.metaKey || event.ctrlKey)) {
      openBrushModal();
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
  mirrorButton.addEventListener("click", function (e) {
    mandalaDrawer.mirror = !mandalaDrawer.mirror;
    if (mandalaDrawer.mirror) {
      mirrorButton.classList.remove("is-light");
    } else {
      mirrorButton.classList.add("is-light");
    }
  });

  let simplifyButton = document.getElementById("simplify-button");
  simplifyButton.addEventListener("click", function (e) {
    mandalaDrawer.simplify = !mandalaDrawer.simplify;
    if (mandalaDrawer.simplify) {
      simplifyButton.classList.remove("is-light");
    } else {
      simplifyButton.classList.add("is-light");
    }
  });

  let brushColorInput = document.getElementById("brush-color-input");
  brushColorInput.addEventListener("change", function (e) {
    mandalaDrawer.brushColor = brushColorInput.value;
  });

  setupBrushSizeSlider(mandalaDrawer);
  setupRotationsSlider(mandalaDrawer);

  // file modal stuff
  let fileInput = document.getElementById("svg-file-input");
  fileInput.onchange = () => {
    if (fileInput.files.length > 0) {
      console.log(fileInput.files[0].name);
      project.clear();
      project.importSVG(fileInput.files[0], {
        applyMatrix: false,
        expandShapes: true,
        insert: false,
        onLoad: (item) => {
          if (
            item.children.length == 2 &&
            item.children[1].children.length > 0
          ) {
            let groups = item.children[1].children;
            for (let g of groups) {
              project.activeLayer.addChild(g);
            }
          }
        },
        onError: (error) => {
          console.log(error);
        },
      });
    }
  };

  let exportPNGButton = document.getElementById("png-export-button");
  exportPNGButton.addEventListener("click", mandalaDrawer.saveAsPNG);

  let exportSVGButton = document.getElementById("svg-export-button");
  exportSVGButton.addEventListener("click", mandalaDrawer.saveAsSVG);

  //  let exportJSONButton = document.getElementById("json-export-button");
  //  exportJSONButton.addEventListener("click", mandalaDrawer.saveAsJSON);

  let backgroundColorInput = document.getElementById("background-color-input");
  backgroundColorInput.addEventListener("change", function (e) {
    mandalaDrawer.backgroundColor = backgroundColorInput.value;

    closeSettingsModal();
  });

  let clearButton = document.getElementById("clear-button");
  clearButton.addEventListener("click", () => {
    project.clear();
    mandalaDrawer.saveFile();

    closeSettingsModal();
  });

  let saveButton = document.getElementById("save-button");
  let filename = document.getElementById("filename-input");

  saveButton.addEventListener("click", () => {
    if (filename.value != "") {
      mandalaDrawer.saveFile(filename.value);
      updateFilesList(mandalaDrawer);
      filename.value = "";
    }
  });

  updateFilesList(mandalaDrawer);
}

function updateUI(mandalaDrawer) {
  let brushSizeSlider = document.getElementById("brush-size-bar");
  brushSizeSlider.value = mandalaDrawer.brushSizePercentage * 100;

  let brushSizeLabel = document.getElementById("brush-size-input");
  brushSizeLabel.value = mandalaDrawer.brushSize;

  let rotationsSlider = document.getElementById("rotations-bar");
  rotationsSlider.value = mandalaDrawer.rotationsPercentage * 100;

  let rotationsLabel = document.getElementById("rotations-input");
  rotationsLabel.value = mandalaDrawer.rotations;

  let brushColorInput = document.getElementById("brush-color-input");
  brushColorInput.value = mandalaDrawer.brushColor;

  let backgroundColorInput = document.getElementById("background-color-input");
  backgroundColorInput.value = mandalaDrawer.backgroundColor;

  let mirrorButton = document.getElementById("mirror-button");
  if (mandalaDrawer.mirror) {
    mirrorButton.classList.remove("is-light");
  } else {
    mirrorButton.classList.add("is-light");
  }

  let simplifyButton = document.getElementById("simplify-button");
  if (mandalaDrawer.simplify) {
    simplifyButton.classList.remove("is-light");
  } else {
    simplifyButton.classList.add("is-light");
  }
}

function updateFilesList(mandalaDrawer) {
  let filesList = document.getElementById("files-list");
  filesList.innerHTML = "";

  for (let file of mandalaDrawer.files) {
    let columns = document.createElement("div");
    columns.classList.add("columns");
    columns.classList.add("is-mobile");
    columns.classList.add("is-vcentered");
    columns.classList.add("control");
    filesList.appendChild(columns);

    let labelColumn = document.createElement("div");
    labelColumn.classList.add("column");
    columns.appendChild(labelColumn);

    let label = document.createElement("label");
    label.classList.add("label");
    label.innerHTML = file;
    labelColumn.appendChild(label);

    let openButtonColumn = document.createElement("div");
    openButtonColumn.classList.add("column");
    openButtonColumn.classList.add("is-narrow");
    columns.appendChild(openButtonColumn);

    let openButton = document.createElement("button");
    openButton.classList.add("button");
    openButton.classList.add("is-danger");
    openButtonColumn.appendChild(openButton);

    let openIcon = document.createElement("span");
    openIcon.classList.add("icon");
    openIcon.innerHTML = '<i class="mdi mdi-file"></i>';
    openButton.appendChild(openIcon);

    let openText = document.createElement("span");
    openText.innerHTML = "open";
    openButton.appendChild(openText);

    openButton.addEventListener("click", () => {
      project.clear();
      mandalaDrawer.loadFile(file);

      closeSettingsModal();
    });

    let deleteButtonColumn = document.createElement("div");
    deleteButtonColumn.classList.add("column");
    deleteButtonColumn.classList.add("is-narrow");
    columns.appendChild(deleteButtonColumn);

    let deleteButton = document.createElement("button");
    deleteButton.classList.add("button");
    deleteButton.classList.add("is-danger");
    deleteButton.classList.add("is-light");
    deleteButtonColumn.appendChild(deleteButton);

    let deleteIcon = document.createElement("span");
    deleteIcon.classList.add("icon");
    deleteIcon.innerHTML = '<i class="mdi mdi-delete"></i>';
    deleteButton.appendChild(deleteIcon);

    deleteButton.addEventListener("click", () => {
      mandalaDrawer.removeFile(file);
      updateFilesList(mandalaDrawer);
    });
  }
}

function setupBrushSizeSlider(mandalaDrawer) {
  let brushSizeInput = document.getElementById("brush-size-input");
  let brushSizeBar = document.getElementById("brush-size-bar");

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

    this.path = undefined;
    this.paths = undefined;

    this.minRotations = 0;
    this.maxRotations = 32;

    this.maxBrushSize = 15;
    this.minBrushSize = 0.2;

    this.files = [];

    this.loadFiles();
    this.loadFile();

    this.setupTool();
  }

  saveAsPNG() {
    view.element.toBlob((blob) => {
      let dataURL = URL.createObjectURL(blob);
      downloadURI(dataURL, "mandala.png");
    });
  }

  saveAsSVG() {
    var fileName = "custom.svg";
    var url =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        project.exportSVG({
          asString: true,
          bounds: "content",
          matrix: paper.view.matrix,
        })
      );
    downloadURI(url, fileName);
  }

  saveAsJSON() {
    let json = project.exportJSON();
    let dataURL = "data:text/json;charset=utf-8," + encodeURIComponent(json);
    downloadURI(dataURL, "mandala.json");
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

  calculateBrushSizePercentage() {
    let percentage =
      (this.brushSize - this.minBrushSize) /
      (this.maxBrushSize - this.minBrushSize);
    percentage = Math.max(0, percentage);
    percentage = Math.min(1, percentage);

    this.brushSizePercentage = percentage;
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

  calculateRotationsPercentage() {
    let percentage =
      (this.rotations - this.minRotations) /
      (this.maxRotations - this.minRotations);
    percentage = Math.max(0, percentage);
    percentage = Math.min(1, percentage);

    this.rotationsPercentage = percentage;
  }

  set backgroundColor(color) {
    this._backgroundColor = color;
    view.element.style.backgroundColor = color;
    this.saveFile();
  }
  get backgroundColor() {
    return this._backgroundColor;
  }

  set mirror(mirror) {
    this._mirror = mirror;
    this.saveFile();
  }
  get mirror() {
    return this._mirror;
  }

  set rotations(rotations) {
    this._rotations = rotations;
    this.calculateRotationsPercentage();
    this.saveFile();
  }
  get rotations() {
    return this._rotations;
  }
  set simplify(simplify) {
    this._simplify = simplify;
    this.saveFile();
  }
  get simplify() {
    return this._simplify;
  }
  set brushColor(color) {
    this._brushColor = color;
    this.saveFile();
  }
  get brushColor() {
    return this._brushColor;
  }
  set brushSize(size) {
    this._brushSize = size;
    this.calculateBrushSizePercentage();
    this.saveFile();
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
      this.saveFile();
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

  saveFile(name) {
    let json = paper.project.exportJSON();
    let wrapper = {
      json: json,
      backgroundColor: this.backgroundColor,
      brushColor: this.brushColor,
      brushSize: this.brushSize,
      mirror: this.mirror,
      rotations: this.rotations,
      simplify: this.simplify,
    };

    localStorage.setItem(name ?? "current-project", JSON.stringify(wrapper));

    if (name !== undefined && !this.files.includes(name)) {
      this.files.push(name);
      this.saveFiles();
    }
  }

  loadFile(name) {
    let json = localStorage.getItem(name ?? "current-project");
    if (json === null) {
      this.setSettings();
      return;
    }
    let wrapper = JSON.parse(json);

    paper.project.importJSON(wrapper.json);

    this.setSettings(wrapper);
  }

  removeFile(name) {
    localStorage.removeItem(name);
    this.files = this.files.filter((f) => f !== name);
    this.saveFiles();
  }

  undo() {
    let last = paper.project.activeLayer.lastChild;
    if (last == undefined) return;
    last.remove();

    this.saveFile();
  }

  setSettings(settings) {
    this._simplify = settings?.simplify ?? true;
    this._mirror = settings?.mirror ?? true;

    this._brushColor = settings?.brushColor ?? "#FF0000";

    this._rotations = settings?.rotations ?? 8;
    this.calculateRotationsPercentage();
    this._brushSize = settings?.brushSize ?? 1;
    this.calculateBrushSizePercentage();

    this._backgroundColor = settings?.backgroundColor ?? "#FFFFFF";
    view.element.style.backgroundColor = this._backgroundColor;

    updateUI(this);
  }

  loadFiles() {
    let settings = localStorage.getItem("settings");
    if (settings === null) return;

    settings = JSON.parse(settings);
    this.files = settings.files;
  }
  saveFiles() {
    let settings = {};
    settings.files = this.files;

    localStorage.setItem("settings", JSON.stringify(settings));
  }
}

function openModal($el) {
  $el.classList.add("is-active");
}

function closeModal($el) {
  $el.classList.remove("is-active");
}

function openSettingsModal() {
  openModal(document.getElementById("settings-modal"));
}

function closeSettingsModal() {
  closeModal(document.getElementById("settings-modal"));
}

function openBrushModal() {
  openModal(document.getElementById("brush-modal"));
}

function closeBrushModal() {
  closeModal(document.getElementById("brush-modal"));
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
