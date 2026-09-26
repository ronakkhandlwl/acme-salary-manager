# AI-Assisted Development Record

This project uses agentic AI intentionally to accelerate drafting, implementation, and verification. Human engineering judgment remains responsible for the final product.

| Activity | AI assistance | Human verification standard |
|---|---|---|
| Product framing | Generated options for scope, risks, and phased delivery | Confirmed curated analytics instead of an unconstrained assistant; reviewed all requirements and exclusions |
| Architecture | Proposed technology and data-model alternatives | Validated portability, salary history semantics, money representation, and 10,000-row performance posture |
| Implementation | Will draft focused code and tests in small commits | Review diffs, run lint/type/test/build commands, inspect API/UI behavior, and correct defects before committing |
| Documentation | Will help structure setup, decisions, and demo notes | Ensure commands, claims, measurements, and links match the delivered repository |

## Guardrails

- Do not use real employee or salary data in prompts, fixtures, screenshots, or seeds.
- Do not accept generated code without tests or review appropriate to its risk.
- Keep AI-generated changes small and traceable through meaningful commits.
- Treat AI suggestions as proposals; validate business rules against this requirements document.
