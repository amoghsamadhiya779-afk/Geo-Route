import os
import re

# Regex to match emojis. This matches a wide range of Unicode emojis.
EMOJI_PATTERN = re.compile(
    r'['
    r'\U0001f600-\U0001f64f'  # emoticons
    r'\U0001f300-\U0001f5ff'  # symbols & pictographs
    r'\U0001f680-\U0001f6ff'  # transport & map symbols
    r'\U0001f1e0-\U0001f1ff'  # flags (iOS)
    r'\U00002702-\U000027b0'
    r'\U000024c2-\U0001f251'
    r']+', flags=re.UNICODE)

def remove_emojis_from_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if EMOJI_PATTERN.search(content):
            new_content = EMOJI_PATTERN.sub('', content)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Removed emojis from {filepath}")
    except Exception as e:
        # Ignore files that aren't utf-8 readable (like images/fonts)
        pass

def scan_dir(directory):
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or '.next' in root or '.git' in root or '__pycache__' in root or 'models' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.py', '.md', '.html', '.css', '.json')):
                remove_emojis_from_file(os.path.join(root, file))

if __name__ == "__main__":
    scan_dir('.')
    print("Done scanning for emojis.")
