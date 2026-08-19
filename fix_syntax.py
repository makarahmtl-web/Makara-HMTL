import re
import glob

files = glob.glob("src/views/*.tsx") + glob.glob("src/components/*.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Fix the doubled className="className=" error
    content = content.replace('className="className="', 'className="')
    # Maybe some are className='className="' or similar, just replace string
    
    with open(file_path, "w") as f:
        f.write(content)
