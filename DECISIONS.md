# DECISIONS.md

A short log of the product and technical decisions you made while building Text-to-Quiz. Keep it honest — tradeoffs and "I'd do this differently with more time" are as valuable as wins.

---

## Quiz spec schema

<!-- What shape does a generated quiz take? Why those fields? What did you deliberately leave out? -->

- Versioned JSON spec with a quiz object
- Supports miltile choice, yes no, slider, free text (images?)
- Delibreatly left out image based quizes
- Normalized 0-100 scoring model so result bands always map cleanly
- Score delta on every option -20 +20 rather than arbitray scoring functions (make sure this is the best way to do things)

## LLM choice

<!-- Which provider and model did you use? Why? Cost-per-quiz estimate? -->

## Question type vocabulary

<!-- Which question types does your system support? Which did you skip and why? -->

## Scoring & results logic

<!-- How does scoring work? Weighting? Branching? Multiple result dimensions? What's in vs. out of scope? -->

## Edit loop

<!-- After the first generation, how does a user iterate? Full regeneration, spec patching, or direct editing? Why? -->

## Prompt reliability

<!-- How do you validate LLM output? Retries? Fallbacks? What happens when it returns garbage? -->

## Data model

<!-- How are quizzes and responses stored? What does the quiz-creator dashboard actually show? -->

## Cost

<!-- Approximate $ per generated quiz. Show your math. -->

## What I'd do differently with more time

<!-- Honest list. -->
