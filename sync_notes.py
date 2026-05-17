"""
sync_notes.py
-------------
1. 20_Permanent/ → content/Notes/  (flat, *.md)
2. 40_Blog/Posts/ → content/Posts/ (재귀, _ prefix 제외)

- 'draft: true' 프론트매터가 있는 노트는 제외
- 복사 여부는 내용 비교로 판단 (mtime 무시 — 동기화 폴더 mtime 갱신에 영향 안 받음)

실행: python sync_notes.py
"""

import filecmp
import re
import shutil
from pathlib import Path

VAULT      = Path(r"C:\Users\junsik\01_Notes\Sync_Obsidian\myObsidian")
PERMANENT  = VAULT / "20_Permanent"
BLOG_POSTS = VAULT / "40_Blog" / "Posts"

QUARTZ       = Path(r"C:\Users\junsik\02_Projects\Blog\myGitpage\content")
NOTES_DST    = QUARTZ / "Notes"
POSTS_DST    = QUARTZ / "Posts"


_DRAFT_RE = re.compile(r"^draft\s*:\s*true\s*(#.*)?$", re.IGNORECASE | re.MULTILINE)


def is_draft(path: Path) -> bool:
    """프론트매터에 'draft: true'가 있으면 True. 필드가 없거나 false면 False."""
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return False
    # 파일 첫머리의 --- ... --- 프론트매터 블록만 검사
    m = re.match(r"^---\s*\n(.*?)\n---\s*(\n|$)", text, re.DOTALL)
    if not m:
        return False
    return bool(_DRAFT_RE.search(m.group(1)))


def unchanged(src: Path, dst: Path) -> bool:
    """dst가 존재하고 내용이 src와 동일하면 True (mtime 무시)."""
    return dst.exists() and filecmp.cmp(src, dst, shallow=False)


def sync_flat(src_dir: Path, dst_dir: Path) -> tuple[list, list, list, list]:
    """flat 폴더 동기화 (20_Permanent → content/Notes)"""
    dst_dir.mkdir(parents=True, exist_ok=True)
    copied, skipped, removed, drafts = [], [], [], []

    for src in src_dir.glob("*.md"):
        if is_draft(src):
            drafts.append(src.name)
            continue
        dst = dst_dir / src.name
        if unchanged(src, dst):
            skipped.append(src.name)
            continue
        shutil.copy2(src, dst)
        copied.append(src.name)

    source_names = {f.name for f in src_dir.glob("*.md") if not is_draft(f)}
    for dst in dst_dir.glob("*.md"):
        if dst.name not in source_names:
            dst.unlink()
            removed.append(dst.name)

    return copied, skipped, removed, drafts


def sync_posts(src_dir: Path, dst_dir: Path) -> tuple[list, list, list, list]:
    """재귀 동기화 (40_Blog/Posts → content/Posts), _ prefix 제외"""
    dst_dir.mkdir(parents=True, exist_ok=True)
    copied, skipped, removed, drafts = [], [], [], []

    # 복사: src에 있는 파일을 dst에 반영
    for src in src_dir.rglob("*.md"):
        # _ prefix 파일·폴더 경로 전체 제외
        if any(part.startswith("_") for part in src.relative_to(src_dir).parts):
            continue
        rel = src.relative_to(src_dir)
        if is_draft(src):
            drafts.append(str(rel))
            continue

        dst = dst_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)

        if unchanged(src, dst):
            skipped.append(str(rel))
            continue

        shutil.copy2(src, dst)
        copied.append(str(rel))

    # 정리: dst에 있지만 src에 없는 파일 삭제
    src_rels = set()
    for src in src_dir.rglob("*.md"):
        if any(part.startswith("_") for part in src.relative_to(src_dir).parts):
            continue
        if is_draft(src):
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

    return copied, skipped, removed, drafts


def print_section(label: str, copied: list, skipped: list,
                   removed: list, drafts: list) -> None:
    print(f"\n=== {label} ===")
    print(f"[복사] {len(copied)}개")
    for f in copied:
        print(f"  + {f}")
    print(f"[최신 유지] {len(skipped)}개 (변경 없음)")
    print(f"[draft 제외] {len(drafts)}개")
    for f in drafts:
        print(f"  ~ {f}")
    print(f"[삭제] {len(removed)}개 (원본 없음)")
    for f in removed:
        print(f"  - {f}")


if __name__ == "__main__":
    c, s, r, d = sync_flat(PERMANENT, NOTES_DST)
    print_section("Notes (20_Permanent → content/Notes)", c, s, r, d)

    c, s, r, d = sync_posts(BLOG_POSTS, POSTS_DST)
    print_section("Posts (40_Blog/Posts → content/Posts)", c, s, r, d)
