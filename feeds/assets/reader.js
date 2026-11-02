const mixin = (Base) => {
	return class extends Base {
		constructor() {
			super();
			console.log("created instance of", this);
		}
		connectedCallback() {
			console.log("connected", this);
		}
		disconnectedCallback() {
			console.log("disconnected", this);
		}
		adoptedCallback() {
			console.log("adopted", this);
		}
		attributeChangedCallback(name, oldValue, newValue) {
			console.log("attribute", name, "changed from", oldValue, "to", newValue);
		}
	};
};

class ToggleDetails extends mixin(HTMLElement) {
	connectedCallback() {
		const template = document.querySelector("#toggle-details-template");
		this.append(document.importNode(template?.content, true));
		this.addEventListener("click", this.clickHandler);
	}
	clickHandler(event) {
		const details = document.querySelectorAll("details");
		const target = event.target;

		if (target && target.name === "toggle-state") {
			const value = target.value;

			if (!value) return;

			if (value === "collapse") {
				[...details].forEach((el) => {
					if (el.open) {
						el.removeAttribute("open");
					}
				});
			}
			if (value === "expand") {
				[...details].forEach((el) => {
					if (!el.open) {
						el.setAttribute("open", "");
					}
				});
			}
		}
	}
}

class ToggleTheme extends mixin(HTMLElement) {
	static #rootElement = document.querySelector(":root");
	static #templateElement = document.querySelector("#toggle-theme-template");
	static #storeKey = "theme";
	static #themes = ["auto", "light", "dark"];

	connectedCallback() {
		this.append(
			document.importNode(ToggleTheme.#templateElement.content, true),
		);
		this.addEventListener("submit", this.submitHandler);
		this.updateButton();
	}

	get value() {
		return localStorage.getItem(ToggleTheme.#storeKey) ||
			ToggleTheme.#rootElement.dataset.theme;
	}

	set value(theme) {
		ToggleTheme.#rootElement.dataset.theme = theme;
		localStorage.setItem(ToggleTheme.#storeKey, theme);
	}

	toggleTheme() {
		const themes = ToggleTheme.#themes;
		const nextIndex = (themes.indexOf(this.value) + 1) % themes.length;
		this.value = themes[nextIndex];
	}

	updateButton() {
		const button = this.querySelector("button");
		button.textContent = this.value;
	}

	submitHandler(event) {
		event.preventDefault();
		this.toggleTheme();
		this.updateButton();
	}
}

class FetchItems extends mixin(HTMLElement) {
	static tagName = "fetch-items";
	static #templateElement = document.querySelector("#fetch-items-template");
	static observedAttributes = ["for"];
	connectedCallback() {
		this.append(document.importNode(FetchItems.#templateElement.content, true));
		this.addEventListener("click", this.clickHandler);
		console.log("fetch-items connected!");
	}
	clickHandler() {
		console.log("doing fetch stuff...");
	}
	attributeChangedCallback(event) {
		super.attributeChangedCallback(event);
	}
}

customElements.define("toggle-theme", ToggleTheme);
customElements.define("toggle-details", ToggleDetails);
customElements.define("fetch-items", FetchItems);

const fetchAllButton = document.querySelector('[name="fetch-all"]');
const fetchAllStatus = document.querySelector("#fetch-all-status");

fetchAllButton?.addEventListener("click", async () => {
  if (!(fetchAllButton instanceof HTMLButtonElement)) return;

  fetchAllButton.disabled = true;
  fetchAllStatus.textContent = "Fetching feeds…";

  try {
    const response = await fetch("/fetch-all", { method: "POST" });
    if (!response.ok) {
      throw new Error(await response.text() || response.statusText);
    }
    window.location.reload();
  } catch (error) {
    fetchAllStatus.textContent = `Unable to fetch feeds: ${
      error instanceof Error ? error.message : String(error)
    }`;
    fetchAllButton.disabled = false;
  }
});
