const popupBackdropPointerState = new WeakMap();

export function bindPopupBackdropClose(overlay, onClose) {
  if (!overlay || typeof onClose !== "function") return;

  overlay.addEventListener("pointerdown", (event) => {
    popupBackdropPointerState.set(overlay, {
      startedOnBackdrop: event.target === overlay,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    });
  });

  overlay.addEventListener("pointermove", (event) => {
    const state = popupBackdropPointerState.get(overlay);
    if (!state) return;

    const moveX = Math.abs(event.clientX - state.startX);
    const moveY = Math.abs(event.clientY - state.startY);

    if (moveX > 6 || moveY > 6) {
      state.moved = true;
    }
  });

  overlay.addEventListener("click", (event) => {
    const state = popupBackdropPointerState.get(overlay);
    popupBackdropPointerState.delete(overlay);

    if (
      event.target === overlay &&
      state?.startedOnBackdrop &&
      !state.moved
    ) {
      onClose(event);
    }
  });
}

function getAccessibleFieldName(control) {
  return (
    control.getAttribute("aria-label") ||
    control.getAttribute("placeholder") ||
    control.getAttribute("name") ||
    control.id ||
    "입력 필드"
  );
}

function hasAssociatedLabel(control) {
  if (!control || control.type === "hidden") return true;
  if (control.closest("label")) return true;
  if (!control.id) return false;

  const escapedId = window.CSS?.escape
    ? window.CSS.escape(control.id)
    : control.id.replace(/"/g, '\\"');

  return !!document.querySelector(`label[for="${escapedId}"]`);
}

function applyFormFieldAccessibility(root = document) {
  const scope = root instanceof Element ? root : document;
  const controls = scope.matches?.("input, select, textarea")
    ? [scope]
    : [...scope.querySelectorAll("input, select, textarea")];

  controls.forEach((control) => {
    if (control.type === "hidden") return;

    if (!hasAssociatedLabel(control) && !control.getAttribute("aria-label")) {
      control.setAttribute("aria-label", getAccessibleFieldName(control));
    }

    if (
      control instanceof HTMLInputElement &&
      !control.hasAttribute("autocomplete") &&
      !["checkbox", "radio", "file", "button", "submit", "reset", "hidden"].includes(
        control.type,
      )
    ) {
      control.setAttribute("autocomplete", "off");
    }
  });
}

export function setupFormAccessibilityGuard() {
  applyFormFieldAccessibility(document);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          applyFormFieldAccessibility(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
