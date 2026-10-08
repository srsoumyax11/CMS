
### Database Wipe up and fresh start
```bash
cd backend
supabase stop --no-backup
supabase start
.\venv\Scripts\activate
alembic upgrade head
python -m scripts.pre_start
uvicorn app.main:app --reload --port 8000

```

### Start Backend 
```bash
cd .\backend\
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```


cd backend
supabase stop --no-backup
supabase start
docker start cms-redis 2>$null || docker run -d --name cms-redis -p 6379:6379 redis:alpine
.\venv\Scripts\activate
alembic upgrade head
python -m scripts.pre_start
uvicorn app.main:app --reload --port 8000

### Start Frontend
```bash
cd .\frontend\
npm run dev
```

### Find Errors in Frontend
Runs TypeScript type checking and ESLint to find issues in your React/TS code.
```bash
cd .\frontend\
npm run typecheck
npm run lint
```

### Find Errors in Backend
We recommend using `mypy` for static type checking in Python to catch issues before runtime.
```bash
cd .\backend\
.\venv\Scripts\activate
pip install mypy
mypy app/
```

### TEST FRONTEND APIs
```bash
cd .\backend\
.\venv\Scripts\activate
python scripts/main.py
```

### Run Backend Unit Tests (Pytest)
```bash
cd .\backend\
.\venv\Scripts\activate
pytest tests/
```

### Generate New Database Migrations (Alembic)
Run this after making changes to SQLAlchemy models in `app/models/`.
```bash
cd .\backend\
.\venv\Scripts\activate
alembic revision --autogenerate -m "describe_your_changes_here"
alembic upgrade head
```

### Cleanup Temporary Files (Windows PowerShell)
Use this to remove leftover development scratch files quickly.
```powershell
cd .\backend\
Remove-Item -Path "scratch_*.py", "scratch" -Recurse -Force
```