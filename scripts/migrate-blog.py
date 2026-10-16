"""Explicit one-way import of the user's existing Markdown archive; no source writes."""
from pathlib import Path
from datetime import datetime
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('D:/workspace/blog')
DEST = ROOT / 'src/content/posts'
REPORT = ROOT / '.scratch/blog-migration'
IMPORT_DATE = '2026-10-16'

# Keep filenames stable: the first three are already used by the site.
PLAN = [
    ('责任链模式.md', 'go-option-pattern', 'Go Option 模式', 'article', ['Go', '设计模式'], '通过函数与接口组织可选参数，记录 Go Option 模式的使用方式。'),
    ('重试机制，解决瞬态错误.md', 'retry-transient-errors', '重试机制：处理瞬态错误', 'article', ['Go', '工程实践'], '梳理 Go 中的重试、指数退避、上下文取消与第三方库用法。'),
    ('如何开始刷LeetCode.md', 'start-leetcode', '如何开始刷 LeetCode', 'note', ['算法', '学习方法'], '关于动手、独立实现和定期复习的个人学习记录。'),
    ('GMP 原理代码分析.md', 'gmp-source-analysis', 'GMP 原理代码分析', 'article', ['Go', '并发', '源码分析'], '围绕 schedule、findRunnable 与 execute 阅读 Go 调度流程。'),
    ('Golang GMP原理.md', 'golang-gmp', 'Golang GMP 原理', 'article', ['Go', '并发'], '记录线程调度、GMP 模型与 Go 调度器的工作过程。'),
    ('GoModule.md', 'go-module', 'Go Module', 'article', ['Go', '依赖管理'], '从模块下载、缓存与代理理解 Go Module 的依赖管理。'),
    ('内网私有go module拉取方案.md', 'private-go-module', '内网私有 Go Module 拉取方案', 'article', ['Go', '依赖管理', '工程实践'], '梳理内网私有模块的下载问题与代理方案。'),
    ('Linux 路由详细介绍.md', 'linux-routing', 'Linux 路由详细介绍', 'article', ['Linux', '网络'], '整理路由表、路由选择与 Linux 网络路由实践。'),
    ('ratelimit.md', 'go-ratelimit', 'ratelimit 漏桶限流器：使用与原理', 'article', ['Go', '限流'], '整理 uber-go/ratelimit 的使用方式与实现原理。'),
    ('有限状态机.md', 'finite-state-machine', '有限状态机', 'article', ['Go', '设计模式'], '从概念、应用场景到代码理解有限状态机。'),
    ('性能优化：程序的本质.md', 'performance-program-essence', '性能优化：程序的本质', 'article', ['性能优化', '计算机基础'], '从程序、硬件和数据的关系理解性能优化。'),
    ('性能优化：思考框架.md', 'performance-thinking', '性能优化：思考框架', 'article', ['性能优化', '工程实践'], '整理性能指标、分析路径与优化的思考框架。'),
    ('性能优化：性能测试.md', 'performance-testing', '性能优化：性能测试', 'article', ['Go', '性能优化', '性能测试'], '记录 CPU、内存分析与 Go 性能测试工具的使用。'),
    ('性能优化：性能优化的三大定律.md', 'performance-three-laws', '性能优化：性能优化的三大定律', 'article', ['性能优化', '计算机基础'], '围绕局部性、并行与性能规律整理优化认识。'),
    ('编程能力提升.md', 'improving-programming', '编程能力提升', 'note', ['学习方法', '职业成长'], '关于逻辑分析、编程技巧与持续练习的学习记录。'),
    ('沟通技巧.md', 'communication', '沟通技巧', 'note', ['沟通', '职业成长'], '记录沟通、表达与协作中的思考。'),
    ('萌新程序员的第一年.md', 'first-year-programmer', '萌新程序员的第一年', 'note', ['职业成长'], '关于程序员初入职场与第一年成长的记录。'),
    ('一个刚入职的程序员应该学会什么？.md', 'new-programmer-learning', '一个刚入职的程序员应该学会什么？', 'note', ['职业成长', '学习方法'], '整理从入职、熟悉项目到积累工程经验的思路。'),
    ('ZEGO面经.md', 'zego-interview', 'ZEGO 面经', 'note', ['面试', '职业成长'], '记录一次面试中涉及的算法、数据库与 Redis 问题。'),
    ('健身认知.md', 'fitness-notes', '健身认知', 'note', ['生活', '健身'], '关于健身目标、训练与长期习惯的认识。'),
    ('周末提高幸福感.md', 'weekend-happiness', '周末提高幸福感', 'note', ['生活'], '记录通过日常小事改善周末体验的想法。'),
    ('这个习惯改变了我的人生 - 笔记.md', 'habit-reading-notes', '这个习惯改变了我的人生：笔记', 'note', ['学习方法', '生活'], '围绕习惯、自控力与行动方法整理的视频笔记。'),
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def split_frontmatter(text):
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', text, re.S)
    return (match.group(1), text[match.end():]) if match else ('', text)


def parse_site_metadata(header):
    values = {}
    for line in header.splitlines():
        key, separator, value = line.partition(':')
        if separator:
            values[key] = json.loads(value.strip())
    return values


def prepare_body(body, source_name, source_paths):
    lines = body.splitlines()
    # Strip only a document title, never a first section such as "一、认知".
    top_heading = next((i for i, line in enumerate(lines) if line.strip()), None)
    title_removed = False
    if top_heading is not None:
        line = lines[top_heading]
        if line.startswith('# ') and not re.match(r'^# [一二三四五六七八九十零\d]+[、.．]', line):
            lines.pop(top_heading)
            title_removed = True
    # Multiple top-level sections become H2. Deeper headings already follow the right hierarchy.
    fenced = None
    result = []
    for line in lines:
        marker = re.match(r'^\s*(`{3,}|~{3,})', line)
        if marker:
            token = marker.group(1)[0]
            fenced = None if fenced == token else token
        if fenced is None and line.startswith('# '):
            line = '#' + line
        result.append(line)
    body = '\n'.join(result).strip() + '\n'
    # Rewrite Markdown links and raw HTML image sources without changing code fences.
    parts = re.split(r'(^\s*(?:`{3,}|~{3,}).*$)', body, flags=re.M)
    fenced = False
    for index, part in enumerate(parts):
        if re.match(r'^\s*(?:`{3,}|~{3,})', part):
            fenced = not fenced
        elif not fenced:
            part = re.sub(r'(?<=[(\"\x27])(?:\./)?static/', '/images/blog/static/', part)
            for filename, slug in source_paths.items():
                part = part.replace('](' + filename + ')', '](/writing/' + slug + '/)')
                part = part.replace('](./' + filename + ')', '](/writing/' + slug + '/)')
            parts[index] = part
    body = ''.join(parts)
    # Preserve the archive's existing hand-written TOC anchors using explicit anchor aliases.
    if source_name == '这个习惯改变了我的人生 - 笔记.md':
        aliases = re.findall(r'\]\(#([^\)]+)\)', body)
        for number, alias in enumerate(aliases, 1):
            body = re.sub(rf'^(## {number}\. )', f'<a id="{alias}"></a>\n\n\\1', body, count=1, flags=re.M)
    return body, title_removed


def main():
    files = {p.name: p for p in SOURCE.glob('*.md')}
    expected = {row[0] for row in PLAN}
    if files.keys() != expected:
        raise SystemExit(f'Archive differs from explicit import plan. New: {files.keys() - expected}; missing: {expected - files.keys()}')
    original = {str(p.relative_to(SOURCE)): digest(p.read_bytes()) for p in SOURCE.rglob('*') if p.is_file()}
    REPORT.mkdir(parents=True, exist_ok=True)
    backup = REPORT / ('before-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
    backup.mkdir()
    DEST.mkdir(parents=True, exist_ok=True)
    staged = []
    paths = {name: slug for name, slug, *_ in PLAN}
    for name, slug, title, kind, tags, description in PLAN:
        raw = files[name].read_text(encoding='utf-8-sig').replace('\r\n', '\n')
        header, body = split_frontmatter(raw)
        target = DEST / (slug + '.md')
        metadata = {
            'title': title, 'description': description, 'date': IMPORT_DATE,
            'dateLabel': '收录', 'kind': kind, 'tags': tags,
            'featured': False, 'legacy': True,
        }
        created = re.search(r'^created:\s*[\"\x27]?(\d{4}-\d{2}-\d{2})', header, re.M)
        if created:
            metadata.update(date=created.group(1), dateLabel='原文创建')
        if target.exists():
            shutil.copy2(target, backup / target.name)
            site_header, _ = split_frontmatter(target.read_text(encoding='utf-8-sig'))
            metadata.update(parse_site_metadata(site_header))
        body, removed_title = prepare_body(body, name, paths)
        for image in re.findall(r'/images/blog/static/([^\s\)\"\x27]+)', body):
            if not (SOURCE / 'static' / image).is_file():
                raise SystemExit(f'Missing source image in {name}: {image}')
        serialized = '---\n' + '\n'.join(f'{key}: {json.dumps(value, ensure_ascii=False)}' for key, value in metadata.items()) + '\n---\n\n' + body
        staged.append((target, serialized, name, removed_title, metadata))
    assets = ROOT / 'public/images/blog/static'
    assets.mkdir(parents=True, exist_ok=True)
    for image in (SOURCE / 'static').iterdir():
        if image.is_file():
            target = assets / image.name
            if target.exists() and target.read_bytes() != image.read_bytes():
                (backup / 'static').mkdir(exist_ok=True)
                shutil.copy2(target, backup / 'static' / image.name)
            shutil.copy2(image, target)
    for target, text, *_ in staged:
        target.write_text(text, encoding='utf-8')
    after = {str(p.relative_to(SOURCE)): digest(p.read_bytes()) for p in SOURCE.rglob('*') if p.is_file()}
    if original != after:
        raise SystemExit('Source archive changed during import; inspect before continuing.')
    report = {
        'source': str(SOURCE), 'source_unchanged': True, 'backup': str(backup.relative_to(ROOT)),
        'source_sha256': original,
        'posts': [{'source': name, 'target': str(target.relative_to(ROOT)), 'sha256': digest(text.encode('utf-8')), 'removed_document_title': removed, 'kind': meta['kind'], 'date': meta['date'], 'dateLabel': meta['dateLabel']} for target, text, name, removed, meta in staged],
        'assets': len([p for p in (SOURCE / 'static').iterdir() if p.is_file()]),
    }
    (REPORT / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'posts': len(staged), 'articles': sum(item[4]['kind'] == 'article' for item in staged), 'notes': sum(item[4]['kind'] == 'note' for item in staged), 'assets': report['assets'], 'source_unchanged': True}, ensure_ascii=False))


if __name__ == '__main__':
    main()
