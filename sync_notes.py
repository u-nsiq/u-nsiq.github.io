"""
sync_notes.py
-------------
1. 20_Permanent/ → content/Notes/  (flat, *.md)
2. 40_Blog/Posts/ → content/Posts/ (재귀, _ prefix 제외)

실행: python sync_notes.py
"""

import shutil
from pathlib import Path

VAULT      = Path(r"C:\Users\junsik\01_Notes\Sync_Obsidian\myObsidian")
PERMANENT  = VAULT / "20_Permanent"
BLOG_POSTS = VAULT / "40_Blog" / "Posts"

QUARTZ       = Path(r"C:\Users\junsik\02_Projects\Blog\myGitpage\content")
NOTES_DST    = QUARTZ / "Notes"
POSTS_DST    = QUARTZ / "Posts"


def sync_flat(src_dir: Path, dst_dir: Path) -> tuple[list, list, list]:
    """flat 폴더 동기화 (20_Permanent → content/Notes)"""
    dst_dir.mkdir(parents=True, exist_ok=True)
    copied, skipped, removed = [], [], []

    for src in src_dir.glob("*.md"):
        dst = dst_dir / src.name
        if dst.exists() and src.stat().st_mtime <= dst.stat().st_mtime:
            skipped.append(src.name)
            continue
        shutil.copy2(src, dst)
        copied.append(src.name)

    source_names = {f.name for f in src_dir.glob("*.md")}
    for dst in dst_dir.glob("*.md"):
        if dst.name not in source_names:
            dst.unlink()
            removed.append(dst.name)

    return copied, skipped, removed


def sync_posts(src_dir: Path, dst_dir: Path) -> tuple[list, list, list]:
    """재귀 동기화 (40_Blog/Posts → content/Posts), _ prefix 제외"""
    dst_dir.mkdir(parents=True, exist_ok=True)
    copied, skipped, removed = [], [], []

    # 복사: src에 있는 파일을 dst에 반영
    for src in src_dir.rglob("*.md"):
        # _ prefix 파일·폴더 경로 전체 제외
        if any(part.startswith("_") for part in src.relative_to(src_dir).parts):
            continue

        rel = src.relative_to(src_dir)
        dst = dst_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)

        if dst.exists() and src.stat().st_mtime <= dst.stat().st_mtime:
            skipped.append(str(rel))
            continue

        shutil.copy2(src, dst)
        copied.append(str(rel))

    # 정리: dst에 있지만 src에 없는 파일 삭제
    src_rels = set()
    for src in src_dir.rglob("*.md"):
        if any(part.startswith("_") for part in src.relative_to(src_dir).parts):
            continue
        src_rels.add(src.relative_to(src_dir))

    for dst in dst_dir.rglob("*.md"):
        rel = dst.relative_to(dst_dir)
        if rel not in src_rels:
            dst.unlink()
            removed.append(str(rel))

    # 빈 폴더 정리 (dst 기준)
    for d in sorted(dst_dir.rglob("*"), reverse=True):
        if d.is_dir() and not any(d.iterdir()):
            d.rmdir()

    return copied, skipped, removed


def print_section(label: str, copied: list, skipped: list, removed: list) -> None:
    print(f"\n=== {label} ===")
    print(f"[복사] {len(copied)}개")
    for f in copied:
        print(f"  + {f}")
    print(f"[최신 유지] {len(skipped)}개 (변경 없음)")
    print(f"[삭제] {len(removed)}개 (원본 없음)")
    for f in removed:
        print(f"  - {f}")


if __name__ == "__main__":
    c, s, r = sync_flat(PERMANENT, NOTES_DST)
    print_section("Notes (20_Permanent → content/Notes)", c, s, r)

    c, s, r = sync_posts(BLOG_POSTS, POSTS_DST)
    print_section("Posts (40_Blog/Posts → content/Posts)", c, s, r)
