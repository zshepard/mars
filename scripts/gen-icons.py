#!/usr/bin/env python3
"""Generate all required PWA and Android icon sizes from the source Mars icon."""
from PIL import Image
import os

src = "/home/ubuntu/mars-web/public/mars-icon-source.webp"
out_dir = "/home/ubuntu/mars-web/public/icons"
os.makedirs(out_dir, exist_ok=True)

img = Image.open(src).convert("RGBA")

sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 256, 384, 512, 1024]

for size in sizes:
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(f"{out_dir}/icon-{size}x{size}.png", "PNG")
    print(f"Generated {size}x{size}")

# Also overwrite the root icons used by manifest
img.resize((192, 192), Image.LANCZOS).save("/home/ubuntu/mars-web/public/mars-icon.png", "PNG")
img.resize((256, 256), Image.LANCZOS).save("/home/ubuntu/mars-web/public/mars-icon-256.png", "PNG")
img.resize((32, 32), Image.LANCZOS).save("/home/ubuntu/mars-web/public/mars-icon-32.png", "PNG")

# Generate favicon.ico with multiple sizes embedded
from PIL import Image as PILImage
favicon_sizes = [(16,16),(32,32),(48,48)]
favicon_imgs = [img.resize(s, Image.LANCZOS).convert("RGBA") for s in favicon_sizes]
favicon_imgs[0].save(
    "/home/ubuntu/mars-web/public/favicon.ico",
    format="ICO",
    sizes=favicon_sizes,
    append_images=favicon_imgs[1:]
)
print("Generated favicon.ico")
print("All icons done.")
