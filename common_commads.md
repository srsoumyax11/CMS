
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

### TEST FRONTEND APIs
```bash
cd .\backend\
.\venv\Scripts\activate
python scripts/main.py
```