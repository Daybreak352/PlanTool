// Native :active handles pointers; Enter and Space need the same held state.
const pressedKeys = new Map();

document.addEventListener("keydown", (event) => {
  if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
  const button =
    event.target instanceof Element
      ? event.target.closest("button:not(:disabled)")
      : null;
  if (!button) return;
  pressedKeys.set(event.key, button);
  button.classList.add("is-key-pressed");
});

document.addEventListener("keyup", (event) => {
  const button = pressedKeys.get(event.key);
  if (!button) return;
  pressedKeys.delete(event.key);
  if (![...pressedKeys.values()].includes(button)) {
    button.classList.remove("is-key-pressed");
  }
});

document.addEventListener("focusout", (event) => {
  const button = event.target;
  if (!(button instanceof HTMLButtonElement)) return;
  button.classList.remove("is-key-pressed");
  for (const [key, pressed] of pressedKeys) {
    if (pressed === button) pressedKeys.delete(key);
  }
});

window.addEventListener("blur", () => {
  for (const button of pressedKeys.values()) {
    button.classList.remove("is-key-pressed");
  }
  pressedKeys.clear();
});
