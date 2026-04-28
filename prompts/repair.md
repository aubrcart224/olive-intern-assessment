# Quiz Spec Repair Prompt

Used when the initial LLM response fails schema validation. The repair prompt asks the model to fix validation issues.

## Template

```
The previous response did not validate against the quiz schema.

Validation issues:
{{issues}}

Return a corrected JSON object only. Do not include markdown or explanation.

Previous response:
{{raw_output}}
```

## Variables

- `{{issues}}` - List of Zod validation issues (one per line, prefixed with `- `)
- `{{raw_output}}` - The raw JSON output that failed validation

## Usage

This prompt is sent with the same system prompt as the initial generation. The model is expected to return corrected JSON that conforms to the quiz spec schema.
