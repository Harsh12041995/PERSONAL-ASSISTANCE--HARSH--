// backend/tests/ingest.test.js
// Unit tests for the zero-dependency feed parser (pure functions, no network/DB).

import { describe, it, expect } from 'vitest';
import { parseFeed, stripHtml } from '../services/ingest/rss';

const RSS_SAMPLE = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Harsh's Blog</title>
    <item>
      <title>Building a local-first agent</title>
      <link>https://blog.example.com/agent</link>
      <guid>https://blog.example.com/agent</guid>
      <pubDate>Fri, 17 Jul 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[<p>Today I wired <b>Ollama</b> into my portal.</p><p>It worked.</p>]]></description>
    </item>
    <item>
      <title>Second post</title>
      <link>https://blog.example.com/second</link>
      <guid>post-2</guid>
      <description>Plain text body</description>
    </item>
  </channel>
</rss>`;

const ATOM_SAMPLE = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Blog</title>
  <entry>
    <title>Atom entry one</title>
    <link href="https://atom.example.com/one"/>
    <id>tag:atom.example.com,2026:one</id>
    <published>2026-07-16T08:00:00Z</published>
    <summary>An atom summary</summary>
  </entry>
</feed>`;

describe('parseFeed (RSS 2.0)', () => {
    it('extracts items with title, link, guid, date and stripped content', () => {
        const items = parseFeed(RSS_SAMPLE);
        expect(items).toHaveLength(2);
        expect(items[0].title).toBe('Building a local-first agent');
        expect(items[0].link).toBe('https://blog.example.com/agent');
        expect(items[0].guid).toBe('https://blog.example.com/agent');
        expect(items[0].publishedAt).toBeInstanceOf(Date);
        expect(items[0].content).toContain('Today I wired Ollama into my portal.');
        expect(items[0].content).not.toContain('<p>');
        expect(items[1].guid).toBe('post-2');
    });
});

describe('parseFeed (Atom)', () => {
    it('extracts entries using atom tags and link href', () => {
        const items = parseFeed(ATOM_SAMPLE);
        expect(items).toHaveLength(1);
        expect(items[0].title).toBe('Atom entry one');
        expect(items[0].link).toBe('https://atom.example.com/one');
        expect(items[0].guid).toBe('tag:atom.example.com,2026:one');
        expect(items[0].content).toBe('An atom summary');
    });
});

describe('stripHtml', () => {
    it('converts block ends to newlines and decodes entities', () => {
        expect(stripHtml('<p>a &amp; b</p><p>c</p>')).toBe('a & b\nc');
        expect(stripHtml('x &lt;tag&gt; &quot;q&quot; &#39;s&#39;')).toBe('x <tag> "q" \'s\'');
    });

    it('returns empty string for empty input', () => {
        expect(stripHtml('')).toBe('');
    });
});
