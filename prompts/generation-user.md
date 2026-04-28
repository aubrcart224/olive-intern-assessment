# Quiz Generation User Prompt Template

This template is used to wrap the user's quiz description when sending to the LLM.

## Template

```
Create one quiz spec from this request:

{{user_prompt}}

Semantic guidance:
- Produce a polished quiz a frontend can render.
- Include clear question copy, answer labels, and scoring.
- Keep the quiz concise unless the user explicitly asks for a long quiz.
- Use free_text only when open-ended input is genuinely needed.
- Use branching destinations only when the next step logically changes based on an answer.
```

## Usage

The `{{user_prompt}}` placeholder is replaced with the user's actual quiz description.
