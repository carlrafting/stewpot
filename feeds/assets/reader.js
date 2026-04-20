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

	connectedCallback() {
		this.append(
			document.importNode(ToggleTheme.#templateElement.content, true),
		);
		this.addEventListener("submit", this.submitHandler);
		this.updateButton();
	}

	get value() {
		const theme = this.#store;
		if (theme) {
			return theme;
		}
		return ToggleTheme.#rootElement.dataset.theme;
	}

	set value(theme) {
		ToggleTheme.#rootElement.dataset.theme = theme;
		this.#store = theme;
	}

	toggleTheme(currentValue) {
		switch (currentValue) {
			case "auto":
				this.value = "light";
				return;
			case "light":
				this.value = "dark";
				return;
			case "dark":
				this.value = "auto";
				return;
		}
	}

	updateButton() {
		const button = this.querySelector("button");
		button.textContent = this.value;
	}

	submitHandler(event) {
		event.preventDefault();
		const currentValue = this.value;
		this.toggleTheme(currentValue);
		this.updateButton();
	}

	get #store() {
		return localStorage.getItem(ToggleTheme.#storeKey);
	}

	set #store(value = null) {
		if (value) {
			localStorage.setItem(ToggleTheme.#storeKey, value);
		}
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
