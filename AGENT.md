# AGENT.md — Project Core Rules & Architectural Guidelines

### 1. Data-Driven Backend & Zero Hardcoding
- **Data-Driven Architecture**: The backend must be driven dynamically by database schema, configuration, and data structures.
- **ZERO Hardcoded Values (CRITICAL)**: Never hardcode magic strings, status codes, URLs, file paths, or credentials in business logic. All configuration must come from centralized environment/config modules (`src/config/`).

### 2. Software Principles (SOLID, KISS, DRY, SSOT)
- **SOLID**: Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **KISS**: Keep It Simple & Straightforward.
- **DRY & Reusability**: If logic or a pattern is written twice, extract it into a reusable function, service, or middleware module.
- **SSOT (Single Source of Truth)**: Every piece of data or type definition must have exactly one authoritative source (e.g., single relational schema for hostel building names instead of duplicate string columns).

### 3. Database & Migrations Governance
- **No Scattered / Messy Migrations**: Do not generate tiny, incremental migration files for small schema tweaks.
- **Clean Schema Re-generation**: During the development phase, update and squash schema1 files directly so the database can be wiped and re-created cleanly from scratch at any time without migration rot or column mismatch errors. Data loss during development is expected and acceptable. cretate separate file for seeding value. 

### 4. Communication & Planning Requirement
- **Mandatory Plan Format**: For any structural task or architectural decision, always provide:
  1. **The Plan**: Clear step-by-step breakdown.
  2. **Why this plan was chosen**: Rationale and comparison.
  3. **Benefits**: Key technical and operational advantages.
  4. **Limitations**: Tradeoffs or potential constraints.

If there is any error, Find the root cause first then verify it, them make planning 
If you can not do anything just tell this is not happening and i need this or that from browser console or from any where. 