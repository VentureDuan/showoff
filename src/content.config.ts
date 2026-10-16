import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    dateLabel: z.string().default('发布'),
    kind: z.enum(['article', 'note']),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    example: z.boolean().default(false),
    legacy: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(), description: z.string(),
    role: z.string(), tags: z.array(z.string()), order: z.number(),
    draft: z.boolean().default(false),
    source: z.url().optional(), demo: z.url().optional(),
  }),
});
export const collections = { posts, projects };
