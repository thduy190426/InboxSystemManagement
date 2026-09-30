import os

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\MessageItem.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

props_str = ''
in_props = False
for line in lines:
    if 'export type MessageItemProps = {' in line:
        in_props = True
        continue
    if in_props and '}' in line and not ':' in line:
        break
    if in_props:
        prop_name = line.strip().split(':')[0].strip()
        if prop_name and not prop_name.startswith('//'):
            props_str += f'              {prop_name}={{{prop_name}}}\n'

replacement = f'''          itemContent={{(index, message) => (
            <MessageItem
{props_str}            />
          )}}'''

with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'r', encoding='utf-8') as f:
    chat_panel = f.read()

lines = chat_panel.split('\n')
start = -1
end = -1
for i, line in enumerate(lines):
    if 'itemContent={(index, message) => {' in line:
        start = i
    if start != -1 and i > start + 300 and '            )' in line and '          }}' in lines[i+1]:
        end = i + 1
        break

if start != -1 and end != -1:
    to_replace = '\n'.join(lines[start:end+1])
    new_chat_panel = chat_panel.replace(to_replace, replacement)
    
    import_statement = "import { MessageInput } from './MessageInput'\nimport { MessageItem } from './MessageItem'\n"
    new_chat_panel = new_chat_panel.replace("import { MessageInput } from './MessageInput'", import_statement)
    
    # Remove parseMessageDate and isSameLocalDay from ChatPanel.tsx to avoid conflicts
    # Actually, they are not imported, they are just defined in ChatPanel.tsx. I'll just let TS tell me if they are conflicted or not (they shouldn't be since they aren't exported).

    with open(r'c:\Users\duyho\Downloads\InboxSystemManagement\src\components\panels\ChatPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(new_chat_panel)
