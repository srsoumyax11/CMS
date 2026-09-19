import sys
import re

content = open('scripts/test_all_endpoints.py', 'r', encoding='utf-8').read()

# Fix register payloads missing user_id
content = re.sub(r'"name": "Test Student 2",', '"name": "Test Student 2",\n        "user_id": f"STU2{random_suffix.upper()}",', content)

# Fix s2_id extraction
content = content.replace('s2_id = r.json()["data"]["user_id"]', 's2_id = f"STU2{random_suffix.upper()}"')

# Fix status to account_status for admin student patch
content = content.replace('"status": "approved"', '"account_status": "active"')
content = content.replace('"status": "rejected"', '"account_status": "rejected"')
content = content.replace('"status": "active"', '"account_status": "active"')

open('scripts/test_all_endpoints.py', 'w', encoding='utf-8').write(content)
print('Patched script!')
