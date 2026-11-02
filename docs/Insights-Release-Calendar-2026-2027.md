# Eight articles and the release calendar

Prepared 2 November 2026. All times are South African Standard Time (Africa/Johannesburg, UTC+02:00).

## Ready to read

The eight complete drafts use a conversational voice, short paragraphs, practical examples and direct questions. Technical terms are explained where they matter. Teaching examples are identified as illustrative; no client results or personal experiences have been invented.

| Release at 08:00 | Article draft |
|---|---|
| Thursday 5 November 2026 | [Why am I applying for jobs but getting no interviews?](../content/insights/no-interviews.md) |
| Thursday 19 November 2026 | [How to ask for a promotion when you're already doing more than your job](../content/insights/promotion-conversation.md) |
| Thursday 3 December 2026 | [How to prepare for a job interview using the experience you already have](../content/insights/interview-preparation.md) |
| Thursday 17 December 2026 | [Changing careers at 30, 35 or 40: how to test a move before you leave](../content/insights/career-change.md) |
| Thursday 7 January 2027 | [What are your salary expectations? How to answer in a South African interview](../content/insights/salary-expectations.md) |
| Thursday 21 January 2027 | ["Tell me about yourself": how to build a clear interview answer](../content/insights/tell-me-about-yourself.md) |
| Thursday 4 February 2027 | [How to network for a job when you don't know anyone in your industry](../content/insights/networking.md) |
| Thursday 18 February 2027 | [Which short course is worth your time? Start with the job you want](../content/insights/short-course.md) |

This is two articles per month, on the first and third Thursday. The first month balances job seekers and employed professionals. The later articles build on guides that will already be available when their links appear.

## How automatic release works

The publishing changes and dates are prepared locally. They have not been deployed to the live site.

Once this version is deployed, the website checks the time on each request. A scheduled article becomes available at or after its release time. It then appears in the Insights library, relevant topic filters, related-article links and sitemap. The newest release becomes the featured article. Future pages return 404 and their content is not sent in the browser's JavaScript bundle.

The site handles this itself. There is no monthly manual publish step, no need to keep a computer or this chat open, and no separate background job to miss a deadline. Someone who already has the library open may need to refresh it after release time. Search engines decide when to crawl and index the new URL; release does not guarantee immediate Google visibility.

The homepage's existing curated three-article shelf is unchanged. Newsletter sending and social posting are separate activities and are not part of this schedule.

The batch ends after 18 February 2027. It does not generate or publish new writing indefinitely.

## Reviewing or changing a release

Read the Markdown drafts above. They are the source text used to build the website articles, not separate copies that can drift.

Each article has its date and status in [the schedule](../content/insights/schedule.json). A status of `scheduled` permits release when the date arrives; `draft` keeps the article hidden regardless of the date. Pausing, changing or editing a deployed article requires an updated deployment. If a companion is postponed, check articles that link to it before deploying the revised calendar.

Existing site photography is reused for this batch. Bespoke cover artwork is not included. The interview workbook is not promoted as an available download or product; its publication status was not established.

## Editorial review

The humanizer pass checked for inflated claims, jargon, repetitive sentence patterns, invented evidence and em dashes. No em dashes remain. Examples use plain language and truthful ways to describe work without inventing percentages.

An initial pass still had similar explanatory transitions and closing invitations across the batch. The final drafts vary the openings and practical exercises, keep the service invitations short and give readers a complete action they can take without buying anything.

The salary article explains gross, net and CTC itself rather than linking to external guides that may move. It uses clearly fictional examples rather than claiming current salary benchmarks. The course article links to SAQA for qualification checks. Prices, funding deadlines, tax calculations and guaranteed employment claims are avoided so that the later releases do not depend on today's offers still being available.

## Implementation and verification

Authoring sources: `content/insights/*.md` and `content/insights/schedule.json`.

`node scripts/build-scheduled-insights.mjs` produces the site data in `lib/scheduled-insights.json`. The same generator runs automatically before `npm run build`. `--check` verifies that generated data matches the source drafts. Unsupported block formatting fails visibly rather than being silently discarded.

Publication filtering is in `lib/insight-publication.ts`; the server-only article catalogue is in `lib/published-insights.ts`. The index, article routes and sitemap evaluate publication dates at request time. The date uses an explicit UTC+02:00 offset, independent of the hosting server's timezone.

Validation completed:

- 13 tests passed, including all eight date boundaries, hidden draft/invalid records, archive preservation, two releases per month, complete drafts, image availability and no links to future companion articles.
- TypeScript and targeted ESLint checks passed.
- Production build passed after allowing access to the site's existing Google Fonts.
- The running production build passed 16 before/at-release scenarios across the index, direct article URLs, metadata and sitemap. Tests advanced a clock only in an ignored local test helper; there is no production clock override.
- Browser review confirmed the new topic filter and the interview article render without console errors.

To activate: deploy the reviewed application changes and article batch to the existing site. If activation happens after a scheduled date, all due articles become available immediately. Reschedule overdue entries first if that is not wanted.
