with open("src/index.css", "r") as f:
    content = f.read()

# Make sure all fonts have weight 700 or higher explicitly in css if needed, 
# But just adding a global strong rule for body and headings is better.
content += """
/* Global Text Enhancements */
body {
  font-weight: 700 !important;
  color: #000000 !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6, p, span, div, a, button, input {
  color: #000000;
}
"""

with open("src/index.css", "w") as f:
    f.write(content)
