- Always use venv for backend execution
- **Alembic Migrations:** Do not create messy, scattered migration files with tiny changes. Since the project is in the development phase, update and squash early files to look professional. Maintain exactly two migration files:
  1. `..._initial_schema.py` (DDL - for structural database schema)
  2. `..._seed_initial_data.py` (DML - a single file containing all data seeding logic)
- **Testing:** Always use the `backend/tests/` folder and specifically the `d:\WebDev\CMS\backend\tests\main.py` file for integration testing.
