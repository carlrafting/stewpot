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
  template = this.querySelector("template");
  buttons = this.template?.content?.querySelectorAll("button");
  root = document.documentElement;
  default = "auto";

  init() {
    const root = this.root;
    try {
      const value = localStorage.getItem("theme") ?? this.default;
      if (!value) return this;
      root.setAttribute("data-theme", value ? value : "");
      this.updateButtons(value);
    } catch (error) {
      console.error(error);
    }
    return this;
  }

  updateButtons(value) {
    [...this.buttons].forEach((button) => {
      console.log(button);
      if (button?.value === value) {
        button.hidden = true;
        return;
      }
      button.hidden = false;
    });
  }

  connectedCallback() {
    if (!this?.template) {
      return;
    }

    this.init().append(this?.template?.content);
    this.addEventListener("click", this.clickHandler);
  }

  clickHandler(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;
    const store = localStorage.getItem("theme");
    let theme = null;
    if (name !== "toggle-theme" || !value) {
      return;
    }
    if (value === "light") {
      theme = "light";
    }
    if (value === "dark") {
      theme = "dark";
    }
    if (value === "auto") {
      theme = "auto";
    }
    if (!theme) return;
    if (theme === store) return;
    this.root.setAttribute("data-theme", value);
    localStorage.setItem("theme", theme);
    this.updateButtons(value);
  }
}

customElements.define("toggle-theme", ToggleTheme);
customElements.define("toggle-details", ToggleDetails);
