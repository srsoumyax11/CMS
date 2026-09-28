# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete custom JWT authentication flow with stateless email verification.
- Advanced Role-Based Access Control (RBAC) supporting SuperAdmin, Faculty, and Students.
- Complaint Management module with secure photo uploads via Supabase.
- Digital Outpass System with PDF/Image medical proof capabilities.
- Pre-flight automated CI/CD database check script (`pre_start.py`).
- Automatic deployment bash script (`start.sh`).

### Changed
- Refactored project documentation into a dedicated `docs/` folder.
- Transformed root README into a professional product landing page.

### Security
- Shifted all secret keys to environment variables and restricted Supabase Service Role keys to backend only.
