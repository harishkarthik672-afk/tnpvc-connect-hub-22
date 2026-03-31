from PIL import Image
try:
    img = Image.open('logo.png')
    img = img.convert('RGB')
    colors = img.getcolors(img.size[0] * img.size[1])
    filtered_colors = []
    for count, color in colors:
        if sum(color) < 700 and sum(color) > 50: # not white, not black
            filtered_colors.append((count, color))
    filtered_colors.sort(key=lambda x: x[0], reverse=True)
    for c in filtered_colors[:5]:
        print("#{:02x}{:02x}{:02x}".format(*c[1]), c[0])
except Exception as e:
    print(e)
