with open("index.html", "r") as f:
    content = f.read()

content = content.replace('text-slate-800', 'text-slate-900 font-medium')
content = content.replace('color: #1E293B;', 'color: #0F172A;')

with open("index.html", "w") as f:
    f.write(content)

with open("src/index.css", "r") as f:
    content_css = f.read()

content_css = content_css.replace('color: #1E293B;', 'color: #0F172A;')
with open("src/index.css", "w") as f:
    f.write(content_css)
