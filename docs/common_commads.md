
### Database Wipe up and fresh start
```bash
cd backend
supabase stop --no-backup
supabase start
.\venv\Scripts\activate
alembic upgrade head
python -m scripts.pre_start

```

### Start Backend 
```bash
cd .\backend\
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

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