# Coach Kagiso Content Studio — Full Reference

> Based on `components/content/ContentStudio.tsx`, `components/DashboardSidebar.tsx`, and `lib/content/system-prompt.ts`

---

## Workspace Overview

When you click **Studio** in the dashboard sidebar, you see four sub-workspaces:

| Workspace | Sidebar Label | Purpose |
|---|---|---|
| `content` | **Content Studio** | Create, transform, vault, editorial calendar, signal briefs, research |
| `carousel` | **Carousel Studio** | HTML/CSS slide design, multi-slide carousels |
| `design` | **Design Studio** | Visual canvas for graphics, carousels, and text-based designs |
| `tools` | **Tools** | Hook generator, CTA generator, caption writer, reply writer, session planner |

Within **Content Studio**, you land on the Home tab with sub-sections:

| Sub-section | Label | Purpose |
|---|---|---|
| `home` | Home | Dashboard overview — KPIs, recent items, content pressure |
| `briefs` | Signal Briefs | AI-generated briefs from lead signals |
| `studio` | Create / Transform | Main content creation & AI transformation workspace |
| `vault` | Vault | Idea backlog, smart suggestions, messy middle, insights |
| `editorial` | Editorial Calendar | Plan posting rhythm and schedule |
| `research` | Research | Research vault entries and content angles |

---

## The Four Content Platforms (Create)

When you click **"Create"** in the Studio tab, you choose from **four platform workspaces**, each with its own content types and angles:

---

## 1. LinkedIn

**Tagline:** *Authority engine. Where clients find you.*

### Content Types

| Type | ID | Description | Sub-types |
|---|---|---|---|
| **LinkedIn Post** | `linkedin_post` | Text, long-form, or article | Text Post, Long-Form Post, LinkedIn Article |
| **Carousel** | `carousel` | Multi-slide post | — |
| **Poll** | `poll` | Question, options, caption | — |
| **Content Series** | `content_series` | 3-7 connected posts | — |

### Angles

#### LinkedIn Text Post — `linkedin_post_text_post`

**Share your thinking**
- **Contrarian Take** — Challenge a widely accepted belief about career growth.
- **Hot Observation** — A sharp, timely observation about the professional world right now.
- **Thought-Provoking Question** — Build toward one question that sits with the reader.
- **Quick Lesson** — One actionable insight, explained clearly.

**Share your experience**
- **Lessons Learned** — A specific moment that taught something unexpected.
- **Behind-the-Scenes** — Share what being there actually taught you.
- **Client Win** — Share a client transformation with care and specificity.
- **Personal Milestone** — Share a real achievement or moment of growth.

**Share value**
- **Career Framework** — Share a practical mental model or decision-making framework.
- **Industry Insight** — Observe a trend, shift, or pattern in the professional landscape.
- **Resource Worth Sharing** — Introduce a useful resource and explain why it matters.

**Inspire and connect**
- **Reflection Friday** — One honest question with no explanation needed.
- **Manifesto Series** — A collectible Reflection Friday post that belongs to a monthly theme.
- **Community Call** — Directly address the community and ask for input.

**Connect and entertain**
- **Relatable Observation** — Name something every professional has experienced.
- **Career Hot Take** — Take the strongest possible position on a career topic.
- **The Challenger** — React to bad career advice with visible disagreement.

#### LinkedIn Long-Form Post — `linkedin_post_long_form_post`

**Demonstrate expertise**
- **Case Study** — Share a client transformation with care and specificity.
- **Before & After** — Show the transformation with clear contrast.
- **The Deep Dive** — Explore a topic in depth with nuance and evidence.

**Build authority**
- **Contrarian Argument** — Argue against a widely held position with conviction.
- **Thought Leadership** — Declarative, ambitious take on a bigger truth.
- **Bold Prediction** — Name where the industry or profession is heading.

**Share your story**
- **Personal Essay** — An experience that shaped how you think about work.
- **Career Turning Point** — A moment that changed your professional trajectory.

#### LinkedIn Article — `linkedin_post_linkedin_article`

**Establish authority**
- **Thought Leadership Framework** — A comprehensive framework that redefines how people think.
- **Contrarian with Evidence** — Challenge orthodoxy backed by data or experience.
- **Industry Trend Analysis** — Analyse where things are heading with original insight.
- **Bold Prediction** — A forward-looking position with rationale.

**Educate and add value**
- **Ultimate Guide** — A thorough, exhaustive guide to a specific topic.
- **Problem-Solution Breakdown** — Name a problem and walk through the solution.
- **Evergreen Resource** — A reference piece with lasting value.

**Tell your story**
- **Career Lessons & Reflections** — Accumulated wisdom from experience.
- **Long-Form Case Study** — In-depth client or personal transformation story.
- **Leadership Wisdom** — Principles and lessons from leading people.

#### Carousel — `carousel`

**EDUCATE & TEACH**
- **How-To Guide / Step-by-Step** — Teach a process one step at a time.
- **X Tips for Y** — Curated tips around a single theme.
- **Checklists & Workflows** — Actionable checklists the audience can use.
- **Myth vs. Fact** — Debunk a common belief with facts.
- **This, Not That** — Compare a common mistake with the better approach.
- **Resource Roundup** — Curate the best tools, reads, or resources.
- **FAQ** — Answer the most common questions on a topic.

**SHOW WITH DATA**
- **Stats & Data Story** — Use numbers to tell a compelling story.
- **Problem & Solution** — Frame a problem then present the solution.

**SHOW YOUR WORK**
- **Before & After: Transformations** — Visual proof of change.
- **Behind-the-Scenes** — Show the process behind the result.
- **Career Journey / Timeline** — Map a professional journey visually.
- **Personal Brand & Values** — Articulate what you stand for.

**PROMOTE & INSPIRE**
- **Product / Service Deep Dive** — Explain an offering in detail.
- **Quotes & Insights** — Curate powerful quotes with original commentary.

#### Poll — `poll`

- **Career Decision** — Ask the audience to weigh in on a career dilemma.
- **Hot Take Vote** — Let people vote on a controversial opinion.
- **Experience Check** — Gauge the audience's lived experience on a topic.
- **Industry Opinion** — Survey the audience on an industry question.

#### Content Series — `content_series`

- **Progressive Deep Dive** — Each post builds on the last, exploring a topic layer by layer.
- **Myth-Busting Series** — Take down one myth per post across the series.
- **Before-During-After** — Tell a transformation story across three acts.
- **Daily Challenge** — Give the audience one small action per day.
- **Story Arc** — A narrative that unfolds across multiple posts.

---

## 2. Instagram & Facebook

**Tagline:** *Relationship platform. Where people get closer.*

### Content Types

| Type | ID | Description | Sub-types |
|---|---|---|---|
| **Caption + Reel Hook** | `caption_reel` | Normal post or FB thread | Normal text post, FB Thread (auto/3/5/7/10 comments) |
| **Carousel** | `carousel` | Multi-slide saves | — |
| **Story Prompt** | `story_prompt` | Polls, questions, behind-the-scenes | — |
| **Content Series** | `content_series` | 3-7 connected posts | — |

### Angles

#### Caption + Reel Hook — `caption_reel`

**Hook first**
- **Lead with Feeling** — Open with an emotion the audience recognises.
- **Uncomfortable Truth** — Name a hard truth people avoid.
- **Relatable Moment** — Capture a universal experience.

**Share your story**
- **Personal Disclosure** — Share something personal and vulnerable.
- **Behind-the-Scenes** — Show what happens when no one is watching.
- **Client Win** — Celebrate a client's success.

**Connect and entertain**
- **Relatable Career Moment** — Name a career situation everyone knows.
- **Community Question** — Invite the audience to share their take.

#### Facebook Thread — `caption_reel_facebook_thread`

**Build the thread**
- **Step-by-Step Thread** — Break a process into opening post + comment steps.
- **Story Thread** — Tell a story in layers across comments.
- **Myth-Busting Thread** — Name the myth in the post, unpack in comments.

**Start a conversation**
- **Community Discussion** — Open a real question, guide with comments.
- **Case Breakdown** — Break down an anonymised scenario across comments.

#### Story Prompt — `story_prompt`

- **Poll Question** — Ask a simple, engaging question.
- **Behind-the-Scenes** — Share an unpolished real moment.
- **One Honest Question** — One question that invites reflection.
- **Community Moment** — Celebrate or acknowledge the community.

---

## 3. TikTok

**Tagline:** *Reach platform. Where new audiences find you.*

### Content Types

| Type | ID | Description |
|---|---|---|
| **Short Script** | `short_script` | 60-90 seconds |
| **Series Part** | `series_part` | Part X of Y |
| **POV Video** | `pov_video` | Situational framing |
| **Reaction Video** | `reaction_video` | React to bad advice |
| **Tip Video** | `tip_video` | Quick actionable lesson |

### Angles

#### Short Script — `short_script`

**Hook first**
- **Uncomfortable Truth** — Name a hard truth that stops the scroll.
- **POV Scenario** — Put the viewer inside a specific career situation.
- **Conviction Reframe** — Take what sounds safe and name the hidden cost.

**Teach and inspire**
- **3-Step Tip** — Three quick actionable steps.
- **Common Mistake** — Name the mistake, show the fix.
- **Reaction to Bad Advice** — React to bad advice in real time.

**Humour and relatability**
- **Relatable Career Moment** — A career moment everyone recognises.
- **The Challenger** — Take on bad advice with visible disagreement.

#### Series Part — `series_part`

- **Part X of Y** — A structured multi-part series.
- **Day in the Life** — Show a real day behind the business.

#### POV Video — `pov_video`

- **POV Scenario** — Put the viewer inside a relatable situation.
- **Relatable Career Moment** — Name a moment every professional knows.

#### Reaction Video — `reaction_video`

- **Reaction to Bad Advice** — React and correct in real time.
- **The Challenger** — Push back on conventional wisdom.
- **Conviction Reframe** — Reframe a comfortable assumption.

#### Tip Video — `tip_video`

- **3-Step Tip** — Quick three-step actionable advice.
- **Common Mistake** — Identify the mistake, offer the fix.
- **Quick Lesson** — One insight delivered clearly.

---

## 4. Email & Voice Note

**Tagline:** *Conversion platform. Where leads become clients.*

### Content Types

| Type | ID | Description |
|---|---|---|
| **Personal Check-In** | `personal_checkin` | Warm, direct to one person |
| **Value Drop** | `value_drop` | One useful idea |
| **Story + Lesson** | `story_lesson` | Experience with a takeaway |
| **Soft Offer** | `soft_offer` | Gentle service mention |
| **Voice Note Script** | `voice_note` | Raw, unscripted, intimate |

### Angles

#### Personal Check-In — `personal_checkin`

- **Warm Check-In** — Reach out as one person talking to one person.
- **Raw Honest Moment** — Share an unfiltered personal reflection.

#### Value Drop — `value_drop`

- **Quick Lesson** — One actionable insight delivered directly.
- **Career Framework** — Share a practical mental model.
- **Resource Worth Sharing** — Recommend a resource with context.

#### Story + Lesson — `story_lesson`

- **Lessons Learned** — A specific moment that taught something unexpected.
- **Career Turning Point** — A moment that changed your trajectory.
- **Client Win** — Celebrate a client transformation.

#### Soft Offer — `soft_offer`

- **Value First, Offer Second** — Give value before mentioning the service.
- **Story Then Offer** — Lead with a story, then introduce the offer naturally.

#### Voice Note Script — `voice_note`

- **Warm Check-In** — A personal voice note to someone who's been quiet.
- **Raw Honest Moment** — An unfiltered, spoken reflection.
- **One Thing I've Been Thinking About** — A single idea delivered with presence.

---

## The Six Writing Registers

Every angle is assigned a **writing register** — the tone Kagiso's AI uses when generating content:

| Register | When It's Used | Vibe |
|---|---|---|
| **Tactical Teacher** | Quick Lesson, 3-Step Tip, Career Framework, How-To Guide, FAQ, Checklists | Direct instruction. One idea taught well. Short declarative sentences. |
| **Reflective Leader** | Thought Leadership, Case Study, Bold Prediction, Industry Insight, Career Journey | Declarative and ambitious. Names a bigger truth. Builds a case. |
| **Reflection Friday** | Reflection Friday, Warm Check-In, Raw Honest Moment, Personal Essay, Community Call | Pastoral, intimate. One person talking to one person. Honours messiness. |
| **Conviction Reframe** | Contrarian Take, Hot Observation, Uncomfortable Truth, Myth vs. Fact | Takes what sounds safe and names the hidden cost. Never hedges. |
| **Celebration & Gratitude** | Personal Milestone, Client Win, Behind-the-Scenes, Personal Brand & Values | Warm, specific, communal. Never braggy. The insight is the content. |
| **The Challenger** | The Challenger, Reaction to Bad Advice, Career Hot Take, POV Scenario, Relatable Moment | Visible disagreement. Dry wit. Punchy. Names the unspoken thing. |

---

## The Four Content Pillars

All content maps to one of four thematic pillars:

| Pillar | ID | Topics |
|---|---|---|
| **Career Growth & Strategy** | `career_growth` | Career decisions, CVs, job search, career clarity, promotions, pivots, salary negotiation |
| **Leadership & People Development** | `leadership` | People development, team dynamics, leadership presence, decision-making, management lessons |
| **Personal Brand & Visibility** | `personal_brand` | Visibility, positioning, LinkedIn, reputation, confidence, thought leadership |
| **Mentorship & Community** | `mentorship` | Community, guidance, being supported, opening doors, lessons passed forward |

---

## Angle Details (What It Is, Why It Works, Example Openers)

From `angleDetails` in `ContentStudio.tsx`:

| Angle | What It Is | Why It Works | Example Opener |
|---|---|---|---|
| **Contrarian Take** | Challenge a widely accepted belief about career growth | SA corporate professionals quietly suspect conventional wisdom is wrong | *"Everyone tells you to work harder to get promoted. That's not why people get promoted."* |
| **Hot Observation** | Sharp, timely observation about the professional world right now | Speed and specificity — the reader recognises the moment | *"Your company just updated the career framework. Nobody told you what it actually means for your promotion timeline."* |
| **Thought-Provoking Question** | Build toward one question that sits with the reader | Questions with no easy answer create more reflection than answers | *"If your job title disappeared tomorrow, what would you actually be qualified to do?"* |
| **Quick Lesson** | One actionable insight, explained clearly | Mid-career pros want practical tools they can use this week | *"Nobody told you your LinkedIn headline was the problem. But it is."* |
| **Lessons Learned** | A specific moment that taught something unexpected | Grounded lessons from real moments feel earned, not performed | *"Three months into my first management role, I made a decision that cost me my best team member."* |
| **Behind-the-Scenes** | Share what being there actually taught you | People follow people, not brands; builds DM-trust | *"What no one tells you about running a coaching practice: most weeks, I am the one being coached."* |
| **Client Win** | Share a client transformation with care | Proof without boasting — a real story does more selling than a testimonial | *"She had been applying for six months with the same CV. Three weeks after we reworked it, she had an interview."* |
| **Personal Milestone** | Share a real achievement or moment of growth | Shows the human behind the coach | *"Growth is no longer accidental for me. It's intentional."* |
| **Career Framework** | A practical mental model for a specific career challenge | Frameworks are saveable and shareable; positions Kagiso as a thinker | *"Here is the three-question test I use before accepting any new opportunity."* |
| **Industry Insight** | Observe a trend or shift in the professional landscape | Readers want someone who connects the dots, not just shares the headline | *"The biggest hiring shift in Corporate SA right now has nothing to do with AI."* |
| **Resource Worth Sharing** | Introduce a useful resource and explain why it matters | Curating well is a form of thought leadership | *"I read something this week that changed how I think about salary negotiations."* |
| **Reflection Friday** | One honest question with no explanation needed | Resonates with people carrying career weight they haven't named | *"Are you running away from something, or running towards something?"* |
| **Manifesto Series** | A collectible Reflection Friday post belonging to a monthly theme | Turns weekly reflection into a branded series people follow and save | *"Clarity is not knowing everything. It is finally telling yourself the truth."* |
| **Community Call** | Directly address the community and ask for input | People engage when their voice matters | *"What is one career rule you had to unlearn the hard way?"* |
| **Relatable Observation** | Name something every professional has experienced | Recognition itself is the hook | *"The hardest part of a new job is not the work. It is figuring out who you can trust."* |
| **Career Hot Take** | Take the strongest possible position on a career topic | Bold positions cut through noise | *"Networking events are a waste of time for most professionals. Here is what works instead."* |
| **The Challenger** | React to bad career advice with visible disagreement | Builds authority through distinct point of view | *"Your manager did not forget to put your name forward. They just did not think of you."* |
| **Warm Check-In** | Reach out as one person talking to one person | Email/voice audiences have raised their hand; warmth converts | *"Hey, it's Kagiso. I just wanted to check in, not as a coach, just as someone who cares."* |
| **Conviction Reframe** | Take what sounds safe and name the hidden cost | Disrupts comfortable assumptions without aggression | *"Comfortable is the most dangerous place to be."* |
| **POV Scenario** | Put the viewer inside a specific, relatable career situation | Immediate recognition — the viewer thinks "this is exactly me" | *"POV: you have been passed over for promotion twice and your manager just called it timing."* |
| **Step-by-Step Thread** | Break a useful process into opening post plus comment steps | Facebook rewards conversation and dwell time | *"Stop saying 'just checking in' in salary emails. Do this instead."* |
| **Story Thread** | Tell a story in layers across comments | Turns a longer lesson into a native FB conversation | *"A client nearly talked herself out of asking for the raise she had earned."* |
| **Myth-Busting Thread** | Name the myth in the post, unpack correction across comments | Keeps disagreement useful; gives readers points to respond to | *"The 'be grateful you have a job' advice has cost too many women money."* |
| **Community Discussion** | Open a real question, guide conversation with comments | Makes the thread feel participatory | *"What is one career rule you had to unlearn the hard way?"* |
| **Case Breakdown** | Break down an anonymised scenario into situation, decision, lesson | Gives proof of thinking without overexposing client details | *"Here is how I would approach a promotion conversation after being overlooked twice."* |
