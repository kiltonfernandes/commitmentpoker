"""Regenerate the Brazilian mock name pools embedded in index.html.

Install with: python -m pip install Faker==40.1.0
Run with: python scripts/generate_mock_names.py
"""

import json
from faker import Faker

fake = Faker("pt_BR")
Faker.seed(20260925)


def unique(provider, count):
    names = []
    while len(names) < count:
        name = provider()
        if name not in names:
            names.append(name)
    return names


print("const mockFirstNames = " + json.dumps(unique(fake.first_name, 50), ensure_ascii=False) + ";")
print("const mockLastNames = " + json.dumps(unique(fake.last_name, 50), ensure_ascii=False) + ";")
