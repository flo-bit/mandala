paper.install(window);

window.onload = function () {
  paper.setup("myCanvas");

  let mandalaDrawer = new MandalaDrawer();
  mandalaDrawer.loadCurrent();

  view.translate(view.center);

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

  let undoButton = document.getElementById("undo-button");
  undoButton.addEventListener("click", function (e) {
    mandalaDrawer.undo();
  });

  let brushButton = document.getElementById("brush-button");
  brushButton.addEventListener("click", openBrushModal);

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
};

class MandalaDrawer {
  constructor() {
    this.tool = new Tool();

    let json = localStorage.getItem("brush-settings");
    let settings = json === null ? {} : JSON.parse(json);

    this.path = undefined;
    this.paths = undefined;

    this._simplify = settings.simplify ?? true;

    this._mirror = settings.mirror ?? true;
    this._rotations = settings.rotations ?? 8;

    this.maxBrushSize = 15;
    this.minBrushSize = 0.2;

    this._brushColor = settings.brushColor ?? "#FF0000";

    this.brushSize = settings.brushSize ?? 1;

    this.setupTool();
  }

  setPercentageBrushSize(percentage) {
    if (isNaN(percentage)) percentage = 0;

    percentage = Math.max(0, percentage);
    percentage = Math.min(1, percentage);

    this.brushSizePercentage = percentage;

    this.brushSize =
      this.minBrushSize + (this.maxBrushSize - this.minBrushSize) * percentage;

    this.brushSize = Math.round(this.brushSize * 10) / 10;
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
    let percentage = (size - this.minBrushSize) / this.maxBrushSize;
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
      if (event.modifiers.shift) {
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
    };

    this.tool.onMouseDrag = (event) => {
      if (event.modifiers.shift) {
        view.translate(event.delta);
        return;
      }

      if (this.paths === undefined) {
        return;
      }

      this.addPoint(event.point);
    };

    this.tool.onMouseUp = (event) => {
      if (event.modifiers.shift || this.paths === undefined) {
        return;
      }

      if (this.simplify) {
        for (let p of this.paths) {
          p.simplify(10);
        }
      }

      this.paths = undefined;

      // save project
      this.saveCurrent();
    };

    this.tool.onKeyDown = (event) => {
      if (event.key == "m") {
        // Create a blob from the canvas...
        view.element.toBlob((blob) => {
          // ...and get it as a URL.
          const url = URL.createObjectURL(blob);
          // Open it in a new tab.
          window.open(url, "_blank");
        });
      }
      if (event.key == "+") {
        view.zoom *= 1.1;
      }
      if (event.key == "-") {
        view.zoom /= 1.1;
      }
      // move around
      if (event.key == "up") {
        view.translate(0, -10);
      }
      if (event.key == "down") {
        view.translate(0, 10);
      }
      if (event.key == "left") {
        view.translate(-10, 0);
      }
      if (event.key == "right") {
        view.translate(10, 0);
      }
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
