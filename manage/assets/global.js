const previewUrl = "/document/blocks/markdown-preview/";

function remoteUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function renderSimplePreview(form, preview) {
  const type = form.dataset.blockType;
  const values = new FormData(form);
  preview.replaceChildren();

  if (type === "heading") {
    const requestedLevel = Number(values.get("level"));
    const level = Number.isInteger(requestedLevel) &&
        requestedLevel >= 1 && requestedLevel <= 6
      ? requestedLevel
      : 2;
    const heading = document.createElement(`h${level}`);
    heading.textContent = values.get("text") || "Heading preview";
    preview.append(heading);
  } else if (type === "text") {
    const paragraph = document.createElement("p");
    paragraph.textContent = values.get("body") || "Text preview";
    preview.append(paragraph);
  } else if (type === "code") {
    const code = document.createElement("code");
    code.textContent = values.get("body") || "Code preview";
    const pre = document.createElement("pre");
    pre.append(code);
    preview.append(pre);
  } else if (type === "media") {
    const url = remoteUrl(values.get("url"));
    if (!url) {
      preview.textContent = "Enter an HTTP or HTTPS URL to preview the image.";
      return;
    }
    const image = document.createElement("img");
    image.src = url;
    image.alt = values.get("alt") || "";
    preview.append(image);
    const caption = values.get("caption");
    if (caption) {
      const text = document.createElement("p");
      text.textContent = caption;
      preview.append(text);
    }
  } else if (type === "file") {
    const url = remoteUrl(values.get("url"));
    if (!url) {
      preview.textContent =
        "Enter an HTTP or HTTPS URL to preview the file link.";
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.textContent = values.get("filename") || url;
    preview.append(link);
  }
}

function setupPreviews(root) {
  const form = root.querySelector("[data-block-editor]");
  const preview = root.querySelector("[data-block-preview]");
  if (!form || !preview) return;
  const markdownPreviewUrl = root.getAttribute("preview-url") || previewUrl;

  const listeners = new AbortController();
  let timer;
  let controller;
  const update = async () => {
    if (form.dataset.blockType !== "markdown") {
      renderSimplePreview(form, preview);
      root.dispatchEvent(
        new CustomEvent("manage:block-preview-updated", {
          bubbles: true,
          detail: { blockType: form.dataset.blockType },
        }),
      );
      return;
    }

    controller?.abort();
    controller = new AbortController();
    const body = new URLSearchParams({
      body: new FormData(form).get("body") || "",
    });
    try {
      const response = await fetch(markdownPreviewUrl, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Preview request failed: ${response.status}`);
      }
      const result = await response.json();
      // The server renderer disables raw HTML before returning this markup.
      preview.innerHTML = result.html;
      root.dispatchEvent(
        new CustomEvent("manage:block-preview-updated", {
          bubbles: true,
          detail: { blockType: form.dataset.blockType },
        }),
      );
    } catch (error) {
      if (error.name === "AbortError") return;
      preview.textContent = "Markdown preview is unavailable.";
      console.error("Markdown preview failed", error);
    }
  };

  form.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(update, 180);
  }, { signal: listeners.signal });
  form.addEventListener("change", update, { signal: listeners.signal });
  void update();

  return () => {
    listeners.abort();
    controller?.abort();
    clearTimeout(timer);
  };
}

function setupBlockOrdering(root) {
  const list = root.querySelector("[data-block-list]");
  const outline = root.querySelector("[data-block-outline]");
  if (!list || !outline) return;
  const status = root.querySelector("[data-editor-status]");
  const listeners = new AbortController();
  const signal = listeners.signal;
  let saveController;
  let draggedItem;
  let initialOrder;
  let isSaving = false;
  let dropHandled = false;

  const restoreOrder = () => {
    if (!initialOrder) return;
    for (const item of initialOrder) outline.append(item);
  };
  const syncBlockCards = () => {
    for (const item of outline.querySelectorAll("[data-outline-id]")) {
      const card = [...list.querySelectorAll("[data-block-id]")].find(
        (candidate) => candidate.dataset.blockId === item.dataset.outlineId,
      );
      if (card) list.append(card);
    }
  };
  const updateMoveButtons = () => {
    const cards = [...list.querySelectorAll("[data-block-id]")];
    for (const [index, card] of cards.entries()) {
      const up = card.querySelector('button[name="direction"][value="up"]');
      const down = card.querySelector(
        'button[name="direction"][value="down"]',
      );
      if (up) up.disabled = index === 0;
      if (down) down.disabled = index === cards.length - 1;
    }
  };

  for (const item of outline.querySelectorAll("[data-outline-id]")) {
    item.addEventListener("dragstart", (event) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest(".outline-drag-handle") ||
        !event.dataTransfer
      ) {
        event.preventDefault();
        return;
      }
      draggedItem = item;
      initialOrder = [...outline.children];
      dropHandled = false;
      item.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.dataset.outlineId);
    }, { signal });
    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      if (draggedItem && !dropHandled && !isSaving) {
        restoreOrder();
        draggedItem = undefined;
        initialOrder = undefined;
      }
    }, { signal });
    item.addEventListener("dragover", (event) => {
      if (!draggedItem || draggedItem === item) return;
      event.preventDefault();
      const bounds = item.getBoundingClientRect();
      const insertAfter = event.clientY > bounds.top + bounds.height / 2;
      outline.insertBefore(draggedItem, insertAfter ? item.nextSibling : item);
    }, { signal });
  }

  outline.addEventListener("dragover", (event) => {
    if (!draggedItem) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }, { signal });

  outline.addEventListener("drop", async (event) => {
    if (!draggedItem) return;
    event.preventDefault();
    dropHandled = true;
    const formData = new FormData();
    for (const item of outline.querySelectorAll("[data-outline-id]")) {
      formData.append("order", item.dataset.outlineId);
    }
    const endpoint = root.getAttribute("order-url") ||
      list.querySelector(".move-block-form")?.action;
    try {
      if (!endpoint) throw new Error("Block ordering endpoint is missing.");
      isSaving = true;
      saveController = new AbortController();
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        signal: saveController.signal,
      });
      if (!response.ok) throw new Error(`Ordering failed: ${response.status}`);
      syncBlockCards();
      updateMoveButtons();
      root.dispatchEvent(
        new CustomEvent("manage:block-order-saved", {
          bubbles: true,
          detail: {
            order: [...outline.querySelectorAll("[data-outline-id]")].map(
              (item) => item.dataset.outlineId,
            ),
          },
        }),
      );
      if (status) status.textContent = "Block order saved.";
    } catch (error) {
      if (error.name === "AbortError") return;
      restoreOrder();
      if (status) {
        status.textContent =
          "Could not save block order. The original order was restored.";
      }
      console.error("Block ordering failed", error);
    } finally {
      isSaving = false;
      draggedItem = undefined;
      initialOrder = undefined;
    }
  }, { signal });

  return () => {
    listeners.abort();
    saveController?.abort();
  };
}

class ManageBlockPreview extends HTMLElement {
  #cleanup;
  #observer;

  connectedCallback() {
    this.#initialize();
    if (!this.#cleanup) {
      this.#observer = new MutationObserver(() => this.#initialize());
      this.#observer.observe(this, { childList: true, subtree: true });
    }
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#cleanup?.();
    this.#cleanup = undefined;
  }

  #initialize() {
    this.#cleanup = setupPreviews(this);
    if (this.#cleanup) {
      this.#observer?.disconnect();
      this.#observer = undefined;
    }
  }
}

class ManageBlockOrdering extends HTMLElement {
  #cleanup;
  #observer;

  connectedCallback() {
    this.#initialize();
    if (!this.#cleanup) {
      this.#observer = new MutationObserver(() => this.#initialize());
      this.#observer.observe(this, { childList: true, subtree: true });
    }
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#cleanup?.();
    this.#cleanup = undefined;
  }

  #initialize() {
    this.#cleanup = setupBlockOrdering(this);
    if (this.#cleanup) {
      this.#observer?.disconnect();
      this.#observer = undefined;
    }
  }
}

if (!customElements.get("block-preview")) {
  customElements.define("block-preview", ManageBlockPreview);
}
if (!customElements.get("block-ordering")) {
  customElements.define("block-ordering", ManageBlockOrdering);
}

document.querySelectorAll("[data-build-form]").forEach((form) => {
  const log = form.querySelector("[data-build-log]");
  const button = form.querySelector('button[type="submit"]');
  if (!log || !button) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    log.value = "";
    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
      });
      if (!response.ok) {
        log.value = await response.text();
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Build output stream is unavailable.");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        log.value += decoder.decode(value, { stream: true });
        log.scrollTop = log.scrollHeight;
      }
      log.value += decoder.decode();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.value += `\nBuild request failed: ${message}`;
      console.error("Build request failed", error);
    } finally {
      button.disabled = false;
    }
  });
});
