from PIL import Image
import sys

try:
    img = Image.open('logo.png')
    img = img.convert('RGB')
    colors = img.getcolors(img.size[0] * img.size[1])
    # Filter out white and near-white colors
    filtered_colors = []
    for count, color in colors:
        if sum(color) < 700: # not white
            filtered_colors.append((count, color))
    filtered_colors.sort(key=lambda x: x[0], reverse=True)
    if filtered_colors:
        dominant_color = filtered_colors[0][1]
        hex_color = '#{:02x}{:02x}{:02x}'.format(*dominant_color)
        print("DOMINANT:", hex_color)
    else:
        print("DOMINANT: None")
except Exception as e:
    print("ERROR:", e)
