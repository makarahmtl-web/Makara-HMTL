with open("index.html", "r") as f:
    content = f.read()

# Replace body text color and font
content = content.replace('text-slate-900', 'text-black')
content = content.replace('font-medium', 'font-bold')
content = content.replace('color: #0F172A;', 'color: #000000;')
# Replace Google fonts to prioritize Noto Sans Khmer and include up to weight 900
content = content.replace(
    'family=Kantumruy+Pro:ital,wght@0,300..700;1,300..700&family=Noto+Sans+Khmer:wght@300;400;500;600;700;800',
    'family=Noto+Sans+Khmer:wght@300;400;500;600;700;800;900&family=Kantumruy+Pro:ital,wght@0,300..700;1,300..700'
)

with open("index.html", "w") as f:
    f.write(content)

with open("src/index.css", "r") as f:
    css_content = f.read()

css_content = css_content.replace("color: #0F172A;", "color: #000000;")
css_content = css_content.replace("'Kantumruy Pro', 'Noto Sans Khmer'", "'Noto Sans Khmer', 'Kantumruy Pro'")

with open("src/index.css", "w") as f:
    f.write(css_content)
