const details = document.querySelectorAll("details");
const menu = document.querySelector("menu");

const clickHandler = (e) => {
  const target = e.target;
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
};

menu?.addEventListener("click", clickHandler);
