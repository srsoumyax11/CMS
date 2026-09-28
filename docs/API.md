# API Documentation

The BPUT CMS backend exposes a RESTful API powered by FastAPI.

**Base URL (Local):** `http://localhost:8000/api`

## Authentication

All protected routes require a JWT token passed in the `Authorization` header.
`Authorization: Bearer <your_jwt_token>`

### Endpoints

- `POST /api/auth/login`
  - **Body:** `OAuth2PasswordRequestForm` (username, password)
  - **Returns:** `{ "access_token": "...", "token_type": "bearer" }`
  
- `POST /api/users/me/email/request`
  - **Description:** Requests an email verification code.
  - **Requires Auth:** Yes

- `POST /api/users/me/email/verify`
  - **Description:** Verifies the user's email using a provided token.
  - **Requires Auth:** Yes

## Users & Roles

- `GET /api/users/me`
  - **Description:** Retrieves the current authenticated user's profile.
  - **Requires Auth:** Yes

- `PUT /api/users/me`
  - **Description:** Updates the current user's profile information.
  - **Requires Auth:** Yes

## System Modules (To Be Expanded)
- `/api/complaints` (Complaint Tracking)
- `/api/outpasses` (Digital Outpass Workflow)
- `/api/notices` (Public/Private Notice Board)

*(For interactive API documentation, run the backend and visit `/docs` or `/redoc`)*
