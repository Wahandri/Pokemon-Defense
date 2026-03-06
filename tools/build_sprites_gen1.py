#!/usr/bin/env python3
"""
build_sprites_gen1.py
Downloads the front sprites for all 151 Gen-1 Pokémon from the official
PokeAPI sprites GitHub repository and saves them to
  src/data/sprites/gen1/{id}.png

Usage:
    python3 tools/build_sprites_gen1.py
    (run from the project root)

Requirements: Python 3.6+ with urllib (stdlib only, no pip needed).
Optionally uses Pillow for consistency resize if available.
"""

import os
import json
import time
import urllib.request
import urllib.error

BASE_URL = (
    "https://raw.githubusercontent.com/PokeAPI/sprites/master"
    "/sprites/pokemon/{id}.png"
)
OUT_DIR  = os.path.join(os.path.dirname(__file__), "..", "src", "data", "sprites", "gen1")
INDEX_PATH = os.path.join(OUT_DIR, "index.json")

# Try optional Pillow import for resize
try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

TARGET_SIZE = 80  # resize to 80×80 (still pixel-art scale, reduces file size)

def download_sprite(pokemon_id: int, retry: int = 3) -> bytes | None:
    url = BASE_URL.format(id=pokemon_id)
    for attempt in range(retry):
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                return resp.read()
        except Exception as e:
            if attempt == retry - 1:
                print(f"  ✗ #{pokemon_id} failed after {retry} attempts: {e}")
                return None
            time.sleep(1.5)

def save_sprite(pokemon_id: int, data: bytes):
    path = os.path.join(OUT_DIR, f"{pokemon_id}.png")
    if HAS_PILLOW:
        import io
        img = Image.open(io.BytesIO(data)).convert("RGBA")
        img = img.resize((TARGET_SIZE, TARGET_SIZE), Image.NEAREST)
        img.save(path, "PNG", optimize=True)
    else:
        with open(path, "wb") as f:
            f.write(data)
    return path

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    index = {}

    total = 151
    ok = 0
    for pid in range(1, total + 1):
        local_path = os.path.join(OUT_DIR, f"{pid}.png")
        rel_path   = f"src/data/sprites/gen1/{pid}.png"

        # Skip if already downloaded
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            print(f"  ✓ #{pid:3d} already exists — skipping")
            index[pid] = rel_path
            ok += 1
            continue

        print(f"  ↓ #{pid:3d}/{total} ...", end=" ", flush=True)
        data = download_sprite(pid)
        if data:
            save_sprite(pid, data)
            index[pid] = rel_path
            ok += 1
            print("✓")
        else:
            print("✗ (skipped)")
        time.sleep(0.05)  # polite rate-limit

    # Save index
    with open(INDEX_PATH, "w") as f:
        json.dump(index, f, indent=2)

    print(f"\n✅  {ok}/{total} sprites saved → {OUT_DIR}")
    print(f"📋  index.json → {INDEX_PATH}")

if __name__ == "__main__":
    main()
