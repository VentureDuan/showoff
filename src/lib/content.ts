import { getCollection, type CollectionEntry } from 'astro:content';

export async function publishedPosts() {
  return (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}
export async function publishedProjects() {
  return (await getCollection('projects', ({ data }) => !data.draft))
    .sort((a, b) => a.data.order - b.data.order);
}
export const postUrl = (post: CollectionEntry<'posts'>) => `/writing/${post.id}/`;
export const projectUrl = (project: CollectionEntry<'projects'>) => `/projects/${project.id}/`;
export const formatDate = (date: Date) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
