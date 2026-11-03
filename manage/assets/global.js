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
    const heading = document.createElement(`h${values.get("level")}`);
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

function setupPreviews() {
  for (const form of document.querySelectorAll("[data-block-editor]")) {
    const card = form.closest(".block-card");
    const preview = card?.querySelector("[data-block-preview]");
    if (!preview) continue;

    let timer;
    let controller;
    const update = async () => {
      if (form.dataset.blockType !== "markdown") {
        renderSimplePreview(form, preview);
        return;
      }

      controller?.abort();
      controller = new AbortController();
      const body = new URLSearchParams({
        body: new FormData(form).get("body") || "",
      });
      try {
        const response = await fetch(previewUrl, {
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
      } catch (error) {
        if (error.name === "AbortError") return;
        preview.textContent = "Markdown preview is unavailable.";
        console.error("Markdown preview failed", error);
      }
    };

    form.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(update, 180);
    });
    form.addEventListener("change", update);
    void update();
  }
}

function setupBlockOrdering() {
  const list = document.querySelector("[data-block-list]");
  const outline = document.querySelector("[data-block-outline]");
  if (!list || !outline) return;
  const status = document.querySelector("[data-editor-status]");
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
        !event.target.closest(".outline-drag-handle")
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
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      if (draggedItem && !dropHandled && !isSaving) {
        restoreOrder();
        draggedItem = undefined;
        initialOrder = undefined;
      }
    });
    item.addEventListener("dragover", (event) => {
      if (!draggedItem || draggedItem === item) return;
      event.preventDefault();
      const bounds = item.getBoundingClientRect();
      const insertAfter = event.clientY > bounds.top + bounds.height / 2;
      outline.insertBefore(draggedItem, insertAfter ? item.nextSibling : item);
    });
  }

  outline.addEventListener("dragover", (event) => {
    if (!draggedItem) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });

  outline.addEventListener("drop", async (event) => {
    if (!draggedItem) return;
    event.preventDefault();
    dropHandled = true;
    const formData = new FormData();
    for (const item of outline.querySelectorAll("[data-outline-id]")) {
      formData.append("order", item.dataset.outlineId);
    }
    const endpoint = list.querySelector(".move-block-form")?.action;
    try {
      isSaving = true;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Ordering failed: ${response.status}`);
      syncBlockCards();
      updateMoveButtons();
      if (status) status.textContent = "Block order saved.";
    } catch (error) {
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
  });
}

setupPreviews();
setupBlockOrdering();
