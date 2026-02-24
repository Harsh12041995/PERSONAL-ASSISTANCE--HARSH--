import { useMemo, useState } from "react";
import PageMeta from "../shared/PageMeta";

type BlogCategory = "All" | "World" | "Tech" | "Business" | "Health" | "AI" | "Climate";

interface BlogPost {
  id: string;
  title: string;
  category: Exclude<BlogCategory, "All">;
  source: string;
  publishedAt: string;
  readTime: string;
  summary: string;
  tags: string[];
  url: string;
  featured?: boolean;
}

const CATEGORIES: BlogCategory[] = ["All", "World", "Tech", "Business", "Health", "AI", "Climate"];

const BLOGS: BlogPost[] = [
  {
    id: "b1",
    title: "How AI Agents Are Reshaping Productivity Workflows",
    category: "AI",
    source: "MIT Technology Review",
    publishedAt: "2026-02-22",
    readTime: "7 min",
    summary: "A practical look at how autonomous assistants are moving from demos into daily operations and where human oversight still matters.",
    tags: ["agents", "automation", "future-of-work"],
    url: "https://www.technologyreview.com/",
    featured: true,
  },
  {
    id: "b2",
    title: "Global Markets React to New Energy Policy Signals",
    category: "Business",
    source: "Financial Times",
    publishedAt: "2026-02-21",
    readTime: "6 min",
    summary: "Investors are rotating into infrastructure and clean-energy assets as policy direction tightens around long-term transition goals.",
    tags: ["markets", "energy", "policy"],
    url: "https://www.ft.com/",
  },
  {
    id: "b3",
    title: "Digital Wellness: Protecting Focus in an Always-On World",
    category: "Health",
    source: "Harvard Health",
    publishedAt: "2026-02-19",
    readTime: "5 min",
    summary: "Evidence-based habits for reducing cognitive overload and improving deep work capacity without burning out.",
    tags: ["focus", "mental-health", "habits"],
    url: "https://www.health.harvard.edu/",
  },
  {
    id: "b4",
    title: "Climate Innovation Funding Hits New Milestone",
    category: "Climate",
    source: "Bloomberg Green",
    publishedAt: "2026-02-20",
    readTime: "8 min",
    summary: "Why climate startups in storage, grid software, and carbon analytics are attracting record enterprise partnerships.",
    tags: ["climate", "startup", "investment"],
    url: "https://www.bloomberg.com/green",
  },
  {
    id: "b5",
    title: "What Global Elections Mean for Tech Regulation",
    category: "World",
    source: "The Economist",
    publishedAt: "2026-02-18",
    readTime: "9 min",
    summary: "A cross-region perspective on competition law, privacy enforcement, and AI governance priorities this year.",
    tags: ["geopolitics", "regulation", "technology"],
    url: "https://www.economist.com/",
  },
  {
    id: "b6",
    title: "Engineering Teams Are Redesigning Knowledge Systems",
    category: "Tech",
    source: "InfoQ",
    publishedAt: "2026-02-17",
    readTime: "6 min",
    summary: "How teams are replacing fragmented docs with structured, queryable internal knowledge for faster execution.",
    tags: ["engineering", "documentation", "productivity"],
    url: "https://www.infoq.com/",
  },
];

export default function BlogsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BlogCategory>("All");

  const filtered = useMemo(() => {
    return BLOGS.filter((post) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        post.tags.join(" ").toLowerCase().includes(q);
      const matchesCategory = category === "All" || post.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  const featured = BLOGS.find((b) => b.featured);

  return (
    <>
      <PageMeta
        title="Blogs | Stay Connected"
        description="Your personal blog and awareness hub to stay connected to what is happening in the world."
      />

      <div className="space-y-6 pb-10">
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-indigo-700 p-6 text-white shadow-xl shadow-cyan-200">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-indigo-300/20 blur-2xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-100">World Awareness</p>
              <h1 className="mt-1 text-3xl font-bold">Blogs & Insights</h1>
              <p className="mt-2 max-w-xl text-sm text-cyan-100">
                Your reading dashboard to connect with the world, track signals, and stay aware of major shifts in technology, business, and society.
              </p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs text-cyan-100">Curated sources</p>
              <p className="text-xl font-bold">{BLOGS.length} articles</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by topic, keyword, or tag..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    category === c ? "bg-cyan-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {featured && (
          <a
            href={featured.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5 transition hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Featured Read</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{featured.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{featured.summary}</p>
            <p className="mt-3 text-xs font-medium text-cyan-700">
              {featured.source} · {featured.readTime} · {featured.publishedAt}
            </p>
          </a>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">{post.category}</span>
                <span className="text-[11px] text-gray-400">{post.readTime}</span>
              </div>
              <h3 className="text-base font-bold text-gray-900 group-hover:text-cyan-700">{post.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{post.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {post.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-lg bg-cyan-50 px-2 py-1 text-[10px] font-medium text-cyan-700">
                    #{tag}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400">
                {post.source} · {post.publishedAt}
              </p>
            </a>
          ))}
        </div>

        {!filtered.length && (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">
            No blogs found for this filter. Try another category or keyword.
          </div>
        )}
      </div>
    </>
  );
}
