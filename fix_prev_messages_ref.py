with open("src/views/ChatDetailView.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '  const messagesEndRef = useRef<HTMLDivElement>(null);',
    '  const messagesEndRef = useRef<HTMLDivElement>(null);\n  const prevMessagesLengthRef = useRef(0);'
)

with open("src/views/ChatDetailView.tsx", "w") as f:
    f.write(content)
