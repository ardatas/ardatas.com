# /usr/bin/env python3

import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from glob import glob


def is_img(fname: str):
    ext = os.path.splitext(fname)[1].lower()
    return ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff"]


def optimized_name(fname: str):
    return fname + ".webp"


def optimize_image(fname: str):
    outname = optimized_name(fname)
    subprocess.run(["cwebp", "-q", "80", fname, "-o", outname, "-quiet"], check=True)

    print(f"Optimized {fname}")


def replace_in_html(html: str, img_basenames: list):
    with open(html, "r") as f:
        content = f.read()

    for img in img_basenames:
        content = content.replace(img, optimized_name(img))

    with open(html, "w") as f:
        f.write(content)

    print(f"Replaced in {html}")


def main():
    imgs = [f for f in glob("dist/assets/*") if is_img(f)]
    # Wait for every conversion and propagate failures before changing any HTML
    # or deleting originals. Bound parallel encoder memory/CPU consumption.
    with ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(optimize_image, imgs))

    img_basenames = [os.path.basename(img) for img in imgs]
    for html in glob("dist/**/*.html", recursive=True):
        replace_in_html(html, img_basenames)
    for img in imgs:
        os.remove(img)


if __name__ == "__main__":
    main()
