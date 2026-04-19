class ToggleDetails extends HTMLElement {
	template = this.querySelector("template");

	connectedCallback() {
		if (!this.template) return;

		this.append(this?.template.content);

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

class ToggleTheme extends HTMLElement {
	rootElement = document.querySelector(":root");
	templateElement = document.querySelector("#toggle-theme-template");
	#storeKey = "theme";

	connectedCallback() {
		this.append(document.importNode(this.templateElement.content, true));
		this.addEventListener("submit", this.submitHandler);
		this.updateButton();
	}

	get value() {
		const theme = this.#store;
		if (theme) {
			this.rootElement.dataset.theme = theme;
			return theme;
		}
		return "auto";
	}

	set value(theme) {
		this.rootElement.dataset.theme = theme;
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
			default:
				this.value = "auto";
				return;
		}
	}

	updateButton() {
		const button = this.querySelector("button");
		button.textContent = this.value;
	}

	submitHandler(event) {
		const currentValue = this.value;
		this.toggleTheme(currentValue);
		this.updateButton();
		event.preventDefault();
	}

	get #store() {
		return localStorage.getItem(this.#storeKey);
	}

	set #store(value = null) {
		if (value) {
			localStorage.setItem(this.#storeKey, value);
		}
	}
}

class FetchItems extends HTMLElement {
	templateElement = document.querySelector("#fetch-items-template");
	connectedCallback() {
		this.append(document.importNode(this.templateElement.content, true));
		this.addEventListener("click", this.clickHandler);
		console.log("fetch-items connected!");
	}
	clickHandler() {
		console.log("doing click stuff...");
	}
}

customElements.define("toggle-theme", ToggleTheme);
customElements.define("toggle-details", ToggleDetails);
customElements.define("fetch-items", FetchItems);
