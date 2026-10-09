<div align="center">
  
  # 🚀 CampusOne
  
  ### A modern, role-based university Content Management System.

  [![Live Demo](https://img.shields.io/badge/demo-online-green.svg)](https://your-demo-link.com)
  [![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
  
  <br />
  
  <!-- Add a stunning dashboard screenshot here later -->
  <!-- <img src="./docs/assets/dashboard.png" width="900" alt="CampusOne Dashboard"> -->
  
  <p>
    <strong>CampusOne</strong> is a full-stack enterprise application built with React, FastAPI, PostgreSQL, and Supabase to streamline university operations, complaint tracking, and student outpasses.
  </p>

  [Live Demo](https://your-demo-link.com) · [Documentation](./docs) · [Report Bug](https://github.com/srsoumyax11/CMS/issues)

</div>

---

## ✨ Features

- **🔐 Advanced Role-Based Access Control (RBAC):** Strict permission matrices for SuperAdmins, Faculty, and Students.
- **🏢 Hierarchical Departments:** Dynamic nested departments (e.g., Computer Science -> AI Labs).
- **📝 Complaint Management:** Real-time tracking with photo attachment evidence via secure storage buckets.
- **🚪 Digital Outpass System:** Automated approval workflows with medical proof document uploads.
- **🛡️ High Security:** Stateless email verification flows using custom JWT implementations.

---

## 🏗️ Architecture

```text
React (Vite)
     │
     ▼
FastAPI (Python)
     │
     ├── PostgreSQL (Relational Data via SQLAlchemy)
     └── Supabase Storage (S3-compatible File Buckets)
```

👉 [Read the complete architecture](./docs/ARCHITECTURE.md)

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React, TypeScript, Vite, TailwindCSS, Lucide Icons |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL |
| **Authentication** | Custom JWT (Stateless) |
| **Storage** | Supabase Storage |
| **Deployment** | Render (API) / Vercel (UI) / Supabase (DB & Storage) |

---

## 📂 Project Structure

```text
CMS/
 ├── frontend/            # React UI (Vite)
 ├── backend/             # Python API (FastAPI)
 ├── docs/                # Project Documentation
 │    ├── SETUP.md        # Local development guide
 │    └── DEPLOYMENT.md   # Cloud production guide
 └── README.md            # You are here!
```

👉 [View detailed project structure](./docs/PROJECT_STRUCTURE.md)

---

## ⚡ Quick Start

For detailed step-by-step instructions on setting up Docker, the Supabase CLI, and running the servers, please refer to the complete setup guide.

👉 **[Complete Setup Guide](./docs/SETUP.md)**

---

## 📚 Documentation

| Document | Description |
| --- | --- |
| **[Setup Guide](./docs/SETUP.md)** | How to configure the project locally from scratch |
| **[Deployment Guide](./docs/DEPLOYMENT.md)** | How to push the project to production (Render + Vercel) |
| **[Architecture](./docs/ARCHITECTURE.md)** | System architecture and design choices |
| **[API Docs](./docs/API.md)** | API endpoint documentation |

---

## 🚀 Deployment

This application is container-ready and built to be deployed on modern cloud platforms. The database migrations automatically run via our CI/CD startup scripts in the cloud.

👉 **[Production Deployment Guide](./docs/DEPLOYMENT.md)**

---

## 📄 License

Distributed under the MIT License.

OK