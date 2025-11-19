# Home2Hope Backend (Flask + SQLite)

Minimal backend for Home2Hope providing user registration, login, logout and a "whoami" endpoint.

## Quick start

1. Create & activate venv:
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate

2. Install requirements:
   pip install -r requirements.txt

3. Run app:
   python app.py

Server will run on http://127.0.0.1:5000

## API

- POST /api/register
  body: { username, email, password }

- POST /api/login
  body: { email, password, remember }  // remember = true or false

- POST /api/logout
  requires session cookie (credentials: 'include')

- GET /api/user
  returns { authenticated: true/false, user?: {...} }

## Frontend integration notes

- Use `fetch()` with `credentials: 'include'` so cookies are sent.
- If hosting frontend separately, set CORS origins in app.py to your frontend origin (don't use "*") and enable HTTPS in prod.
- Set environment variable `SECRET_KEY` in production.
- Consider using Postgres for production (set DATABASE_URL env var).

## Example JS (see README in repo for snippets)
