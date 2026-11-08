(() => {
  const note = document.querySelector("[data-handwritten]");
  if (!note || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const walker = document.createTreeWalker(note, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement.closest("svg, [aria-hidden='true']")) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  // Keep the original links and emphasis; only split their text into pen strokes.
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    const fragment = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/).filter(Boolean)) {
      if (/^\s+$/.test(part)) {
        fragment.append(document.createTextNode(part));
      } else {
        const word = document.createElement("span");
        word.className = "handwritten-word";
        word.textContent = part;
        fragment.append(word);
      }
    }
    node.replaceWith(fragment);
  }

  const strokes = Array.from(note.querySelectorAll(".handwritten-word, [data-handwritten-draw]"));
  const cost = (stroke) => stroke.hasAttribute("data-handwritten-draw") ? 7 : stroke.textContent.length + 1;
  const total = strokes.reduce((sum, stroke) => sum + cost(stroke), 0);
  const perCharacter = Math.min(0.18 / 5, 6 / Math.max(total, 1));
  let cursor = 0;

  for (const stroke of strokes) {
    const duration = cost(stroke) * perCharacter;
    stroke.style.setProperty("--ink-delay", `${cursor * perCharacter}s`);
    stroke.style.setProperty("--ink-duration", `${duration}s`);
    cursor += cost(stroke);
  }

  // A marker swipe runs with its words. The ring is a separate stroke after Munich.
  for (const highlight of note.querySelectorAll(".handwritten-highlight")) {
    const words = highlight.querySelectorAll(".handwritten-word");
    const first = words[0];
    const last = words[words.length - 1];
    if (!first || !last) continue;
    const start = parseFloat(first.style.getPropertyValue("--ink-delay"));
    const end = parseFloat(last.style.getPropertyValue("--ink-delay"))
      + parseFloat(last.style.getPropertyValue("--ink-duration"));
    highlight.style.setProperty("--highlight-delay", `${start}s`);
    highlight.style.setProperty("--highlight-duration", `${end - start}s`);
  }

  note.classList.add("is-writing");
})();
