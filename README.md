# MotorSHANDILYA EV CRM

## Run locally

1. Configure `backend/.env` using `backend/.env.example`. Set `ADMIN_EMAIL` to the exact address used on the sign-in screen, a strong private `ADMIN_PASSWORD`, a random `SESSION_SECRET` of at least 32 characters, and the MongoDB Atlas connection string. Authentication settings belong in `backend/.env`, not `frontend/.env`.
2. In `backend`, install dependencies if needed and run `npm run dev`.
3. In `frontend`, run `npm run dev` and open `http://localhost:3000`.
4. Sign in with the server-side `ADMIN_EMAIL` and `ADMIN_PASSWORD` values.

Restart the backend after changing `backend/.env`; the server reads authentication settings at startup.

The Express API requires the backend-issued, HTTP-only admin session cookie; Socket.IO uses a short-lived token issued to an authenticated session. Do not put admin credentials in `NEXT_PUBLIC_*` variables. Configure `FRONTEND_ORIGIN` to the exact deployed frontend origin in production. Sale confirmation uses MongoDB transactions; the MongoDB deployment must support transactions (for example, Atlas or a replica set).

In production, set `NEXT_PUBLIC_BACKEND_URL` in the frontend deployment to the backend origin (for example, the Render service URL) and redeploy the frontend. The frontend proxies `/api` requests through its own origin so browser authentication cookies remain first-party; Socket.IO uses a short-lived token issued to an authenticated session.

## Customer sales

Customer profiles, individual scooter assignment, invoice creation, initial payment, warranty, scheduled service records, and installment schedules are saved together through the backend. Available models and physical units come from MongoDB inventory; the sale transaction rechecks availability and updates unit and batch stock atomically. Existing financial customer records are archived rather than deleted.
