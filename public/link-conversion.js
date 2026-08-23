const emailLink = document.getElementById("link-conversion");

if (emailLink) {
  const address = [
    97, 114, 100, 97, 46, 116, 97, 115, 64, 116, 117, 109, 46, 100, 101,
  ]
    .map((character) => String.fromCharCode(character))
    .join("");

  emailLink.href = `mailto:${address}`;
  emailLink.textContent = address;
}
