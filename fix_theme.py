with open('src/style.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("[data-theme='dark'] .sp-select", "html.dark .sp-select")

with open('src/style.css', 'w', encoding='utf-8') as f:
    f.write(content)
