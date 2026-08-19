import re

with open("src/views/ChatDetailView.tsx", "r") as f:
    content = f.read()

replacement = """      console.error("Initiate call failed:", err);
      cleanupCall("មិនអាចហៅបានទេ (Call failed)");"""

content = re.sub(
    r'console\.error\("Initiate call failed:", err\);\n\s*cleanupCall\("ការហៅទូរស័ព្ទត្រូវបានបញ្ចប់ \(Call ended\)"\);',
    replacement,
    content
)

with open("src/views/ChatDetailView.tsx", "w") as f:
    f.write(content)
