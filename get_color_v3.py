from PIL import Image
try:
    img = Image.open('logo.png')
    img = img.convert('RGB')
    colors = img.getcolors(img.size[0] * img.size[1])
    filtered_colors = []
    for count, (r, g, b) in colors:
        # Ignore darks, whites, and grays
        if r + g + b < 700 and r + g + b > 50:
            if abs(r - g) > 20 or abs(r - b) > 20 or abs(g - b) > 20:
                filtered_colors.append((count, (r, g, b)))
    filtered_colors.sort(key=lambda x: x[0], reverse=True)
    for c in filtered_colors[:5]:
        print("#{:02x}{:02x}{:02x}".format(*c[1]), c[0])
except Exception as e:
    print(e)
