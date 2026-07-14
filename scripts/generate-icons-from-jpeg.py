from PIL import Image
import os


def make_square(img):
    """Center-crop or pad the image to a square."""
    width, height = img.size
    if width == height:
        return img
    size = min(width, height)
    left = (width - size) // 2
    top = (height - size) // 2
    return img.crop((left, top, left + size, top + size))


def main():
    root = os.path.dirname(os.path.dirname(__file__))
    source_path = os.path.join(root, "theoutfitlablogo.jpeg")
    public_dir = os.path.join(root, "public")

    img = Image.open(source_path).convert("RGBA")
    square = make_square(img)

    # App icons
    square.resize((192, 192), Image.LANCZOS).save(
        os.path.join(public_dir, "logo192.png"), "PNG"
    )
    square.resize((512, 512), Image.LANCZOS).save(
        os.path.join(public_dir, "logo512.png"), "PNG"
    )

    # Favicon (single 48x48 icon, browsers will scale as needed)
    square.resize((48, 48), Image.LANCZOS).save(
        os.path.join(public_dir, "favicon.ico"), "ICO"
    )

    print("Generated logo192.png, logo512.png, and favicon.ico from theoutfitlablogo.jpeg")


if __name__ == "__main__":
    main()
