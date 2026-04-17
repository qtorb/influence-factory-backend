const topics = [
  'Automated social media content for SaaS brands',
  'AI-powered blog post generation for marketing teams',
  'Content strategy for B2B SaaS launches',
  'How to create high-converting landing page copy',
  'SEO-driven article generation for product-led growth',
  'Brand storytelling using generative AI',
  'Repurposing blog posts into social snippets',
  'Content planning for influencer marketing campaigns',
  'Performance content for lead generation and sales funnels',
  'Editorial calendars for product announcements',
];

export function searchTopics(query: string): string[] {
  if (!query || query.trim().length === 0) {
    return topics.slice(0, 10);
  }

  const normalized = query.toLowerCase();
  return topics.filter((topic) => topic.toLowerCase().includes(normalized)).slice(0, 10);
}
