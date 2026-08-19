with open("src/App.tsx", "r") as f:
    content = f.read()

if "activeChatIdRef" not in content:
    content = content.replace(
        'const prevChatsRef = React.useRef<Record<string, string>>({});',
        'const prevChatsRef = React.useRef<Record<string, string>>({});\n  const activeChatIdRef = React.useRef<string | null>(null);\n\n  React.useEffect(() => {\n    activeChatIdRef.current = activeChat?.id || null;\n  }, [activeChat]);'
    )

    content = content.replace("hasNewIncoming = true;", "if (activeChatIdRef.current !== c.id) hasNewIncoming = true;")

    with open("src/App.tsx", "w") as f:
        f.write(content)
