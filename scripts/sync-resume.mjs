import { copyFile } from 'node:fs/promises';
await copyFile(new URL('../src/content/resume.md', import.meta.url), new URL('../public/resume.md', import.meta.url));
