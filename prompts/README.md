# Prompts

This directory contains all LLM prompts used in the Text-to-Quiz system.

## Files

| File | Purpose |
|------|---------|
| `system.md` | Main system prompt for quiz generation. Defines the JSON schema and requirements. |
| `generation-user.md` | User prompt template for initial quiz generation. |
| `repair.md` | Prompt template used when the initial generation fails validation and needs repair. |
| `regenerate-options.md` | System and user prompts for regenerating answer options for individual questions. |

## Model Configuration

- **Primary Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Temperature**: 0 (deterministic for generation)
- **Max Tokens**: 4000 (generation), 2000 (option regeneration)

## Prompt Strategy

The system uses a two-phase approach for reliability:

1. **Initial Generation**: Send user prompt with system prompt
2. **Repair (if needed)**: If validation fails, send repair prompt with specific issues

This self-correction loop significantly improves schema compliance rates.
