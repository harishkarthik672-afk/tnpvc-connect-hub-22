import os

replacements = {
    '#098E6E': '#9086FF', # Primary
    '098E6E': '9086FF', # In URL query params
    '#E2F5EF': '#EAE8FF', # Primary Light
    '#045D48': '#5046C8', # Dark gradient
    '#14B8A6': '#BFA8FF', # Light gradient
    'rgba(9, 142, 110,': 'rgba(144, 134, 255,', # shadow 1
    'rgba(9,142,110,': 'rgba(144,134,255,' # shadow 2
}

files = ['contractor.html', 'labour.html', 'dashboard.html']

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        # Handle lowercase variations
        content = content.replace(old.lower(), new)
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done")
