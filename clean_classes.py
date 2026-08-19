import re
import glob

files = glob.glob("src/views/*.tsx") + glob.glob("src/components/*.tsx") + glob.glob("src/App.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Fix className="className="
    while 'className="className="' in content:
        content = content.replace('className="className="', 'className="')

    # Fix any className="... without closing quote
    # It's hard to find without parsing, but let's see if there are any
    # Actually, the error might be something else
    
    # Fix double classNames
    content = re.sub(r'className="(className=")+', 'className="', content)

    # Let's fix missing closing quotes by looking for `className="[^"]+>` 
    # Wait, if a quote is missing, it looks like `className="text-slate-900 font-bold >`
    content = re.sub(r'className="([^"]+)\s*>', r'className="\1">', content)
    
    # Also `className="([^"]+)\s*/>`
    content = re.sub(r'className="([^"]+)\s*/>', r'className="\1" />', content)

    with open(file_path, "w") as f:
        f.write(content)
