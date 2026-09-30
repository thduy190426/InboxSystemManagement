import os

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'left.getFullYear() === right.getFullYear() &&' in line:
        new_lines.append('  return (\n')
    if '<div key={message.id}>' in line and not 'style={{ display:' in line:
        new_lines.append('            return (\n')
    new_lines.append(line)

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
