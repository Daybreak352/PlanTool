// A short, skippable boot sequence. It never reads or changes planner data.
(() => {
  const screen = document.querySelector("#boot-screen");
  const progress = document.querySelector("#boot-progress");
  const percent = document.querySelector("#boot-percent");
  const status = document.querySelector("#boot-status");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const duration = 2800;
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    screen.classList.add("is-done");
    if (document.activeElement?.id === "skip-boot") {
      document.querySelector(".brand")?.focus();
    }
    window.setTimeout(() => screen.remove(), reduceMotion ? 0 : 460);
  }

  document.querySelector("#skip-boot").addEventListener("click", finish);
  if (reduceMotion) {
    finish();
    return;
  }

  window.setTimeout(finish, 4700);
  const startedAt = performance.now();
  let phase = -1;
  function advance(now) {
    if (finished) return;
    const ratio = Math.min(1, (now - startedAt) / duration);
    const value = Math.round(ratio * 100);
    progress.style.width = `${value}%`;
    percent.textContent = `${String(value).padStart(2, "0")}%`;

    const nextPhase = ratio < 0.36 ? 0 : ratio < 0.76 ? 1 : 2;
    if (nextPhase !== phase) {
      phase = nextPhase;
      status.textContent = [
        "正在连接本地任务档案…",
        "正在校准任务航线…",
        "控制中心已就绪",
      ][phase];
    }
    if (ratio < 1) requestAnimationFrame(advance);
    else window.setTimeout(finish, 180);
  }
  requestAnimationFrame(advance);
})();
