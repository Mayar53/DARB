Backend

```
cd backend
uv run python manage.py runserver
```

If `uv` is not on PATH, use the venv directly:

```
cd backend
.venv\Scripts\python.exe manage.py runserver
```

http://127.0.0.1:8000
http://127.0.0.1:8000/admin

Default admin login (created on `migrate`):
- URL: http://127.0.0.1:8000/admin/
- Email: `admin@admin.com`
- Password: `admin123`

API docs: http://127.0.0.1:8000/api/docs

frontend

```
cd frontend
npm run dev
```

http://localhost:3000
