"""
sync_notes.py
-------------
20_Permanent/ 의 마크다운 파일을 content/Notes/ 에 동기화.
삭제된 노트는 content/Notes/ 에서도 제거.

실행: python sync_notes.py
"""

import shutil
from pathlib import Path

PERMANENT = Path(r"C:\Users\junsik\01_Notes\Sync_Obsidian\myObsidian\20_Permanent")
NOTES     = Path(r"C:\Users\junsik\02_Projects\Blog\myGitpage\content\Notes")


def sync_notes() -> None:
    NOTES.mkdir(parents=True, exist_ok=True)

    copied, skipped, removed = [], [], []

    # 1. 복사: 20_Permanent/ → content/Notes/
    for src in PERMANENT.glob("*.md"):
        dst = NOTES / src.name

        if dst.exists() and src.stat().st_mtime <= dst.stat().st_mtime:
            skipped.append(src.name)
            continue

        shutil.copy2(src, dst)
        copied.append(src.name)

    # 2. 정리: content/Notes/ 에 있지만 20_Permanent/ 에 없는 파일 삭제
    source_names = {f.name for f in PERMANENT.glob("*.md")}
    for dst in NOTES.glob("*.md"):
        if dst.name not in source_names:
            dst.unlink()
            removed.append(dst.name)

    # 3. 결과 출력
    print(f"[복사] {len(copied)}개")
    for f in copied:
        print(f"  + {f}")

    print(f"\n[최신 유지] {len(skipped)}개 (변경 없음)")

    print(f"\n[삭제] {len(removed)}개 (원본 없음)")
    for f in removed:
        print(f"  - {f}")


if __name__ == "__main__":
    sync_notes()
