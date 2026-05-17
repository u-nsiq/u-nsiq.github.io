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

import filecmp
import re
import shutil
from pathlib import Path

VAULT_ROOT     = Path(r"C:\Users\junsik\01_Notes\Sync_Obsidian\myObsidian")
VAULT_ASSETS   = Path(r"C:\Users\junsik\01_Notes\Sync_Obsidian\myObsidian\90_Assets")
QUARTZ_ASSETS  = Path(r"C:\Users\junsik\02_Projects\Blog\myGitpage\content\assets")
QUARTZ_CONTENT = Path(r"C:\Users\junsik\02_Projects\Blog\myGitpage\content")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}

# ![[파일명.ext]] 또는 ![[경로/파일명.ext|300]] 모두 캡처
IMAGE_PATTERN = re.compile(
    r'!\[\[([^|\]]+\.(?:png|jpg|jpeg|gif|svg|webp))',
    re.IGNORECASE
)


def get_referenced_images() -> set[str]:
    """content/ 전체 마크다운에서 참조된 이미지 경로(원본 그대로) 수집."""
    images = set()
    for md_file in QUARTZ_CONTENT.rglob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue
        for match in IMAGE_PATTERN.finditer(content):
            images.add(match.group(1))
    return images


def find_source(img_ref: str) -> Path | None:
    """
    이미지 참조 문자열로 실제 소스 파일을 찾는다.
    1. vault root 기준 전체 경로로 시도 (90_Assets/subfolder/file.png 형태)
    2. 90_Assets 하위 전체에서 파일명으로 재귀 탐색
    """
    # 1. vault root 기준 전체 경로 시도
    candidate = VAULT_ROOT / img_ref
    if candidate.exists():
        return candidate

    # 2. 90_Assets 하위에서 파일명으로 재귀 탐색
    filename = Path(img_ref).name
    for found in VAULT_ASSETS.rglob(filename):
        return found

    return None


def sync_assets() -> None:
    QUARTZ_ASSETS.mkdir(parents=True, exist_ok=True)
    referenced = get_referenced_images()

    # 정리용: 파일명만 추출 (content/assets는 flat 구조)
    referenced_names = {Path(img).name for img in referenced}

    copied, skipped, missing, removed = [], [], [], []

    # 1. 복사: 참조된 이미지를 90_Assets → content/assets (flat)
    for img_ref in sorted(referenced):
        src = find_source(img_ref)
        filename = Path(img_ref).name
        dst = QUARTZ_ASSETS / filename

        if src is None:
            missing.append(img_ref)
            continue

        # 복사 여부는 내용 비교로 판단 (mtime 무시 — 동기화 폴더 mtime 갱신 영향 배제)
        if dst.exists() and filecmp.cmp(src, dst, shallow=False):
            skipped.append(filename)
            continue

        shutil.copy2(src, dst)
        copied.append(filename)

    # 2. 정리: content/assets 에 있지만 더 이상 참조되지 않는 파일 삭제
    for existing in QUARTZ_ASSETS.iterdir():
        if existing.suffix.lower() in IMAGE_EXTENSIONS:
            if existing.name not in referenced_names:
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
        print(f"\n[경고] 소스를 찾을 수 없음: {len(missing)}개")
        for f in missing:
            print(f"  ? {f}")
    else:
        print("\n모든 참조 이미지 정상.")


if __name__ == "__main__":
    sync_assets()
