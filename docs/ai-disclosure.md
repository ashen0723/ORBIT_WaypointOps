# AI tool disclosure

Booklet requirement: explain which work was AI-assisted, which was not, and how the tools were used.
Every member adds or corrects their own row before submission. Only list contributions that actually happened.

## Summary by phase

| Phase / area | Tool(s) | AI-assisted | Not AI-assisted | How output was reviewed |
|---|---|---|---|---|
| Designathon UI prototypes (Dispatcher, Store Manager, Loader, Driver) | Magic Patterns | Screen generation and component code from team prompts | Personas, flows, scenario choice, prompts and design decisions | Team reviewed each screen against the booklet and personas |
| Monorepo assembly (this merge) | Claude Code (Anthropic) | Combining the four prototypes into `apps/web`, shared login routing, NestJS + Prisma skeleton, draft schema, seed, Docker Compose, `.env.example`, these docs | Choice of stack (leader's starter pack), folder structure decision, approval of every step | Member reviewed the design spec and plan, then the code; web build, unit tests and manual browser walkthrough |

## Per member

| Member | Area owned | Tools used | AI-assisted work | Work done without AI | Review method |
|---|---|---|---|---|---|
| Ashen | Tech lead, allocation engine | | | | |
| Thisuni | Dispatcher frontend | | | | |
| Taluni | Store Manager frontend | | | | |
| Mansi | Store backend, QA, README | | | | |
| Vihandu | Driver frontend | | | | |
| Kuru | Driver integration, POD | | | | |
| Mansandi | Driver backend, sync | | | | |
| Sesanya | Loader full-stack | | | | |
| Tharusha | Auth, DB, Docker, deploy, seed; monorepo merge (Claude Code) | Claude Code | Monorepo merge (see summary) | | Spec + plan review, build/test verification |
