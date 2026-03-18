"""
sync_assets.py
--------------
Quartz content/ 에서 참조된 이미지를 찾아 90_Assets → content/assets 에 복사.
content/assets 에 있지만 더 이상 참조되지 않는 파일은 삭제.

용도:
  - 포스팅/노트에 이미지를 사용한 뒤 npx quartz sync 전에 실행
  - 현재 content/assets 가 빠짐없이 채워져 있는지 확인

실행: python sync_assets.py
"""

import re
import shutil
from pathlib import Path

VAULT_ASSETS   = Path(r"C:\Users\junsik\01_Notes\Sync_Obsidian\myObsidian\90_Assets")
QUARTZ_ASSETS  = Path(r"C:\Users\junsik\02_Projects\Blog\myGitpage\content\assets")
QUARTZ_CONTENT = Path(r"C:\Users\junsik\02_Projects\Blog\myGitpage\content")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}

# ![[파일명.ext]] 또는 ![[파일명.ext|300]] 모두 파일명만 캡처
IMAGE_PATTERN = re.compile(
    r'!\[\[([^|\]]+\.(?:png|jpg|jpeg|gif|svg|webp))',
    re.IGNORECASE
)


def get_referenced_images() -> set[str]:
    """content/ 전체 마크다운에서 참조된 이미지 파일명 수집."""
    images = set()
    for md_file in QUARTZ_CONTENT.rglob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue
        for match in IMAGE_PATTERN.finditer(content):
            images.add(match.group(1))
    return images


def sync_assets() -> None:
    QUARTZ_ASSETS.mkdir(parents=True, exist_ok=True)
    referenced = get_referenced_images()

    copied, skipped, missing, removed = [], [], [], []

    # 1. 복사: 참조된 이미지를 90_Assets → content/assets
    for img in sorted(referenced):
        src = VAULT_ASSETS / img
        dst = QUARTZ_ASSETS / img

        if not src.exists():
            missing.append(img)
            continue

        if dst.exists() and src.stat().st_mtime <= dst.stat().st_mtime:
            skipped.append(img)
            continue

        shutil.copy2(src, dst)
        copied.append(img)

    # 2. 정리: content/assets 에 있지만 더 이상 참조되지 않는 파일 삭제
    for existing in QUARTZ_ASSETS.iterdir():
        if existing.suffix.lower() in IMAGE_EXTENSIONS:
            if existing.name not in referenced:
                existing.unlink()
                removed.append(existing.name)

    # 3. 결과 출력
    print(f"[복사] {len(copied)}개")
    for f in copied:
        print(f"  + {f}")

    print(f"\n[최신 유지] {len(skipped)}개 (변경 없음)")

    print(f"\n[삭제] {len(removed)}개 (미참조)")
    for f in removed:
        print(f"  - {f}")

    if missing:
        print(f"\n[경고] 90_Assets에서 찾을 수 없음: {len(missing)}개")
        for f in missing:
            print(f"  ? {f}")
    else:
        print("\n모든 참조 이미지 정상.")


if __name__ == "__main__":
    sync_assets()
