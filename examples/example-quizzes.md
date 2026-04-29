# Example Generated Quizzes

This document contains 3 example quizzes generated from the prompts specified in the project brief.

---

## Quiz 1: Ultra-Processed Food Assessment

**Input Prompt:**

> Build me a quiz that helps someone figure out if they're eating too much ultra-processed food. Ask about their breakfast habits, how often they read ingredient labels, whether they cook at home, and how often they eat fast food. At the end, give them a score and recommend whether they should try Olive.

**Generated Spec:** (See `quiz-1-upf-assessment.json`)

**Live URL:** `http://localhost:3000/quiz?id=004673bc-d42f-4a62-a649-0e5a8c1337dd`

**Dashboard Screenshot:** (Add screenshot showing starts, completions, result distribution)

---

## Quiz 2: Olive User Onboarding

**Input Prompt:**

> Onboarding quiz for new Olive users. Ask what their health goals are (weight loss, cleaner eating, allergy tracking, feeding kids better), what grocery stores they shop at, and how often they cook. Use their answers to personalize their first experience.

**Generated Spec:** (See `quiz-2-onboarding.json`)

**Live URL:** `http://localhost:3000/quiz?id=7602116e-7794-4c72-8dec-b6394f310d94`

**Dashboard Screenshot:** (Add screenshot showing starts, completions, result distribution)

---

## Quiz 3: "What Kind of Eater Are You?" Personality Quiz

**Input Prompt:**

> Fun 5-question quiz: "What kind of eater are you?" with silly personality-style answers. At the end, assign them a type like "The Label Detective" or "The Blissfully Unaware" with a shareable result card.

**Generated Spec:** (See `quiz-3-personality.json`)

**Live URL:** `http://localhost:3000/quiz?id=f9600eba-dcc1-4e1f-b91a-06f285e88a06`

**Dashboard Screenshot:** (Add screenshot showing starts, completions, result distribution)

---

## How to Generate These

1. Start the dev server: `pnpm dev`
2. Visit `http://localhost:3000`
3. Paste each prompt into the text area
4. Click "Generate Quiz"
5. Click "Save changes" to persist to database
6. Copy the shareable link
7. Open the link and complete the quiz to generate response data
8. Visit `/dashboard` to see analytics and take screenshots
