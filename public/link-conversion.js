const emailLinks = document.querySelectorAll("#link-conversion, [data-email-link]");

if (emailLinks.length) {
  const address = [
    97, 114, 100, 97, 64, 97, 114, 100, 97, 116, 97, 115, 46, 99, 111, 109,
  ]
    .map((character) => String.fromCharCode(character))
    .join("");

  emailLinks.forEach((emailLink) => {
    emailLink.href = `mailto:${address}`;
  });
}
