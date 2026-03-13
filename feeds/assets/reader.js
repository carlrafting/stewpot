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
        [...details].map((el) => {
          if (el.open) {
            el.removeAttribute("open");
          }
        });
      }

      if (value === "expand") {
        [...details].map((el) => {
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

  init() {
    const root = this.root;
    try {
      const value = localStorage.getItem("theme") ?? null;
      if (!value) return this;
      root.setAttribute("theme", value ? value : "");
    } catch (error) {
      console.error(error);
    }
    return this;
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
      localStorage.removeItem("theme");
      this.root.removeAttribute("theme");
      return;
    }
    if (!theme) return;
    if (theme === store) return;
    this.root.setAttribute("theme", value);
    localStorage.setItem("theme", theme);
  }
}

customElements.define("toggle-theme", ToggleTheme);
customElements.define("toggle-details", ToggleDetails);
