<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!--Rules of the project -->

# Text-to-Quiz: Build an AI Quiz Funnel Generator

**Estimated time:** 8-10 hours

**What this tests:** LLM prompt engineering, frontend generation, data persistence, full-stack thinking, and the ability to ship something that actually works.

---

## The Brief

You type what you want. The LLM figures out the structure. It generates a real, interactive quiz funnel. You can preview it, tweak it, and deploy it live. People take the quiz, their responses get stored, and you can see the results.

Your job is to build a working prototype of this pipeline. Not production-ready, but real enough that someone could type a description and get a live, working quiz out the other end.

---

## What Does a Quiz Funnel Look Like?

Think product recommendation quizzes, lead gen quizzes, personality quizzes, onboarding flows. The kind of thing companies use to qualify users, collect data, or personalize an experience.

A user might type:

> _"Build me a quiz that helps someone figure out if they're eating too much ultra-processed food. Ask about their breakfast habits, how often they read ingredient labels, whether they cook at home, and how often they eat fast food. At the end, give them a score and recommend whether they should try Olive."_

Or:

> _"Onboarding quiz for new Olive users. Ask what their health goals are (weight loss, cleaner eating, allergy tracking, feeding kids better), what grocery stores they shop at, and how often they cook. Use their answers to personalize their first experience."_

Or even:

> _"Fun 5-question quiz: 'What kind of eater are you?' with silly personality-style answers. At the end, assign them a type like 'The Label Detective' or 'The Blissfully Unaware' with a shareable result card."_

The system should handle all of these from a text description.

---

## The Pipeline

Three stages. You'll touch all three.

### Stage 1: Text → Quiz Spec

The user describes the quiz they want in plain text. Your system uses an LLM to produce a **structured spec**, a JSON object that describes the quiz: questions, answer options, scoring logic, branching, and the results screen.

You design the schema. Here's a rough idea of the shape, but yours should be different and better:

```json
{
  "title": "Are You Eating Too Much Ultra-Processed Food?",
  "description": "A quick quiz to check your habits",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "What does your typical breakfast look like?",
      "options": [
        { "text": "Cereal or toast", "score": 2 },
        { "text": "Eggs and fruit", "score": 0 },
        { "text": "Protein bar or shake", "score": 3 },
        { "text": "I skip breakfast", "score": 1 }
      ]
    },
    ...
  ],
  "results": [
    {
      "range": [0, 4],
      "title": "You're doing great",
      "description": "Your diet is mostly whole foods...",
      "cta": { "text": "Keep it up, try Olive to go deeper", "url": "..." }
    },
    {
      "range": [5, 8],
      "title": "Room for improvement",
      ...
    },
    ...
  ]
}
```

**What we're testing:**

- Can you design a prompt that consistently produces structured, parseable quiz specs?
- How do you define the question types? (Multiple choice, slider, free text, image-based, yes/no?)
- How do you handle scoring and branching logic?
- What happens when the LLM returns malformed output?

### Stage 2: Spec → Live Quiz

Take the structured spec from Stage 1 and render it as a real, interactive quiz that someone can actually take.

This means:

- One question at a time (or however you want to structure the flow)
- Progress indicator
- Answers get stored as the user goes
- At the end, show the result based on their responses and the scoring logic
- The result screen should look good enough to screenshot or share

**You should build a small component library**, a set of question types and result displays your system knows how to render. The LLM picks from this vocabulary. You make the components look good.

**Design quality matters.** The quiz should feel like a real product, not a Google Form.

**What we're testing:**

- Can you build a clean component system that maps spec to interactive UI?
- Does it actually look and feel good to take?
- How do you handle edge cases? (Question with no options, result range that doesn't cover all scores, quiz with only 1 question)
- Is it responsive?

### Stage 3: Data Collection & Results

This is what makes it a funnel and not just a quiz generator. **Responses need to be stored and presentable.**

- Every quiz completion stores the user's answers and their result
- Build an endpoint or dashboard where the quiz creator can see:
  - How many people started the quiz
  - How many completed it
  - Distribution of results (how many got each outcome)
  - Individual responses if needed
- Store everything in Supabase

**What we're testing:**

- Did you actually close the loop? (Generate quiz, people take it, data comes back)
- Is the data model sensible?
- Can the quiz creator actually learn something from the responses?

### Deploy

The generated quiz should be accessible at a live URL that you can share. How you do this is up to you: a `/quiz/:id` route in your app, a Vercel deploy, a static export. Whatever works. The point is: **someone types a description, and 30 seconds later there's a URL they can send to people.**

---

## The Hard Parts

### The Spec Schema is a Design Problem

What question types do you support? How does scoring work? Can questions branch based on previous answers? How flexible vs rigid is the schema? Too rigid and every quiz is the same. Too flexible and the LLM outputs things you can't render.

### Prompt Reliability

The LLM needs to output valid JSON that conforms to your schema, every time, across wildly different quiz descriptions. How do you validate? Retry? Fall back?

### The Edit Loop

After the first generation, the user will want changes. "Add a question about snacking." "Make the results funnier." "Change the scoring so it's harder to get a good result." How does your system handle this?

Options:

- Full regeneration from an updated prompt (simple but slow, might lose good stuff)
- Patch the spec and re-render (faster, harder)
- Let the user edit the spec directly (power-user mode)

Pick one, build it, explain why in `DECISIONS.md`.

### Scoring and Results Logic

Simple additive scoring is easy. But what about weighted questions? Branching paths? Multiple result dimensions? You don't have to support everything, but your `DECISIONS.md` should explain what you chose to support and what you deliberately left out.

### Design Quality

AI-generated UIs usually look bad. The bar here is: would you actually send this quiz to someone? Would they take it seriously?

---

## What We're Giving You

- Repo scaffold with Next.js, Tailwind, and shadcn configured
- Supabase setup with tables stubbed for quizzes and responses (you'll extend the schema)
- A starter set of **5 example quiz prompts** so you have test cases

---

## Go Further

The brief above is the baseline. If you finish it and still have time, **surprise us**.

We're not going to tell you what to build next. Figuring that out is part of the test. Look at what you've built, think about how it would actually get used, and ship something that makes it meaningfully better. Whatever it is, **tell us why you built it** in your `DECISIONS.md`.

The best candidates don't stop at "it works." They ask: _what would I want if I were actually using this?_

---

## What to Submit

- Working prototype: text input, generated quiz, live quiz people can take, responses stored, results viewable
- Your **component library**: the set of question types and result screens your system supports
- Your **actual prompts** committed to the repo
- A `DECISIONS.md` explaining:
  - Your quiz spec schema and why you designed it that way
  - Which LLM you used and why
  - Your question type vocabulary, what you support and what you left out
  - How you handle scoring and results logic
  - Your approach to the edit loop
  - How you handled prompt reliability (validation, retries, fallbacks)
  - Your data model for storing responses
  - Your cost numbers: how much does it cost to generate one quiz?s
  - What you'd do differently with more time
- **3 example generated quizzes** from different prompts, each with: the input prompt, the generated spec, a link to the live quiz, and a screenshot of the results dashboard showing test responses
- A short screen recording (2-3 min, Loom is fine) showing the full flow: type a description, see the preview, deploy, take the quiz, view the responses

## How We'll Evaluate It

| Criteria           | What we're actually looking for                                              |
| ------------------ | ---------------------------------------------------------------------------- |
| Spec design        | Is the quiz schema thoughtful? Does it balance flexibility with reliability? |
| Prompt engineering | Does the LLM consistently produce valid, usable quiz specs?                  |
| Quiz quality       | Is it actually fun/useful to take? Does it look like a real product?         |
| Data loop          | Do responses get stored? Can the creator see meaningful results?             |
| Edit loop          | Can the user iterate without starting over?                                  |
| Deploy works       | Can we visit a real URL and take a real quiz?                                |
| Reliability        | What happens when the LLM returns garbage?                                   |
| `DECISIONS.md`     | Real product thinking, tradeoffs, not just implementation notes              |
| End-to-end         | Does the whole thing work as one coherent product?                           |

## Why This Assessment Exists

We build internal tools at Olive, and we hold them to the same bar as our user-facing product. This assessment tests whether you can take a vague request, turn it into something real, and ship it. The domain is quizzes. The skill is building fast for the people around you.

<!-- END:of project rules  -->
