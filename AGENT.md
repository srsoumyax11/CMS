- Always use venv for backend execution
- **Alembic Migrations:** Do not create messy, scattered migration files with tiny changes. Since the project is in the development phase, update and squash early files to look professional. Maintain exactly two migration files:
  1. `..._initial_schema.py` (DDL - for structural database schema)
  2. `..._seed_initial_data.py` (DML - a single file containing all data seeding logic)
- **Testing:** Always use the `backend/tests/` folder and specifically the `d:\WebDev\CMS\backend\tests\main.py` file for integration testing.
Always use venv in backend 
Always use data driven architecture 
Use centralized configuration 
no scattered data file 
No redundant code or file 
Use library alwways 

Dont make multiple migration files for data base migration, use the old files and keep folder clean 

Exception handling and error handling alwways 