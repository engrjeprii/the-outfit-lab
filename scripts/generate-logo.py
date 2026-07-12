from PIL import Image, ImageDraw, ImageFont
import os

# Brand colors
BG = "#111111"      # dark charcoal
FG = "#F5F2EC"      # warm off-white
ACCENT = "#C9A227"  # muted gold accent


def draw_hanger(draw, cx, cy, size, color):
    """Draw a minimalist hanger icon centered at (cx, cy) with given size."""
    # Hook
    hook_top = cy - size * 0.35
    hook_bottom = cy - size * 0.12
    draw.line([(cx, hook_top), (cx, hook_bottom)], fill=color, width=max(2, int(size * 0.035)))
    # Hook curve
    draw.arc(
        [cx - size * 0.08, hook_top - size * 0.08, cx + size * 0.08, hook_top + size * 0.08],
        start=200, end=340, fill=color, width=max(2, int(size * 0.035))
    )
    # Hanger shoulders
    left = cx - size * 0.40
    right = cx + size * 0.40
    shoulder_y = cy - size * 0.12
    bottom_y = cy + size * 0.18
    draw.line([(left, bottom_y), (cx - size * 0.06, shoulder_y)], fill=color, width=max(2, int(size * 0.04)))
    draw.line([(right, bottom_y), (cx + size * 0.06, shoulder_y)], fill=color, width=max(2, int(size * 0.04)))
    draw.line([(cx - size * 0.06, shoulder_y), (cx + size * 0.06, shoulder_y)], fill=color, width=max(2, int(size * 0.04)))


def draw_t_monogram(draw, cx, cy, size, color):
    """Draw a bold 'T' monogram centered at (cx, cy)."""
    bar_w = size * 0.55
    bar_h = size * 0.10
    stem_w = size * 0.14
    stem_h = size * 0.55
    top = cy - stem_h / 2
    draw.rounded_rectangle(
        [cx - bar_w / 2, top, cx + bar_w / 2, top + bar_h],
        radius=size * 0.02,
        fill=color
    )
    draw.rounded_rectangle(
        [cx - stem_w / 2, top, cx + stem_w / 2, top + stem_h],
        radius=size * 0.02,
        fill=color
    )


def make_app_icon(size, with_text=False):
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)

    # Subtle outer padding
    pad = int(size * 0.08)
    draw.ellipse([pad, pad, size - pad, size - pad], outline=ACCENT, width=max(1, size // 64))

    icon_size = size * 0.45
    draw_hanger(draw, size / 2, size * 0.42, icon_size, FG)

    if with_text:
        try:
            font_size = max(10, int(size * 0.08))
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except Exception:
            font = ImageFont.load_default()
        text = "THE OUTFIT LAB"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((size - tw) / 2, size * 0.74), text, fill=FG, font=font)

    return img


def make_favicon(size):
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    pad = int(size * 0.12)
    draw.ellipse([pad, pad, size - pad, size - pad], outline=ACCENT, width=max(1, size // 32))
    draw_t_monogram(draw, size / 2, size / 2, size * 0.50, FG)
    return img


def main():
    public = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")

    # App icons
    make_app_icon(192, with_text=True).save(os.path.join(public, "logo192.png"), "PNG")
    make_app_icon(512, with_text=True).save(os.path.join(public, "logo512.png"), "PNG")

    # Favicon with multiple sizes
    sizes = [(16, 16), (32, 32), (48, 48)]
    frames = [make_favicon(s[0]) for s in sizes]
    frames[0].save(
        os.path.join(public, "favicon.ico"),
        format="ICO",
        sizes=sizes
    )

    print("Generated logo192.png, logo512.png, and favicon.ico")


if __name__ == "__main__":
    main()
