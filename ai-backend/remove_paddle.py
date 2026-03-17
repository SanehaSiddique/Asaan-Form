
req_path = 'requirements.txt'
with open(req_path, 'r') as f:
    lines = f.readlines()

with open(req_path, 'w') as f:
    for line in lines:
        if 'paddle' not in line.lower():
            f.write(line)
