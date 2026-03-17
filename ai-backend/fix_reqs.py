import os

req_path = 'requirements.txt'
with open(req_path, 'r') as f:
    lines = f.readlines()

with open(req_path, 'w') as f:
    for i, line in enumerate(lines):
        if i < 46:
            # Uncomment lines that look like package names
            if line.startswith('# ') and not line.startswith('# #') and not 'replace the old' in line.lower() and not 'latest version' in line.lower():
                f.write(line[2:])
            else:
                f.write(line)
