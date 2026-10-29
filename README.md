FraudShield
FraudShield is a web application project focused on fraud detection and digital account opening (DAO) identity defense. The repository contains a React/Vite frontend and a Python/Flask backend. The dashboard includes areas for dashboard analytics, transaction management and investigation, an ML Lab, model evaluation, and case management.
Project status: This README describes the known project layout and modules. Verify exact routes, database initialization, model behavior, and environment variables against the current source code before presenting or deploying the application. Do not claim a model is production-ready unless it has been tested and validated.

Table of Contents
- Overview
- Goals
- Features and Modules
- Technology Stack
- Architecture
- Repository Structure
- Prerequisites
- Local Setup
- Configuration
- Database Notes
- API Notes
- Running the Application
- Testing and Verification
- Security Considerations
- Troubleshooting
- Future Improvements
- Contributing
- License
Overview
FraudShield aims to provide a central interface for reviewing fraud-related activity and supporting investigation workflows. The frontend provides the user interface; the Flask backend provides server-side routes and application logic; and a local SQLite database may be used for persistent development data where configured by the backend.

The system is intended as an educational/development project unless and until its detection logic, security controls, model performance, and operational behavior have been independently validated.
Goals
- Present fraud-related information in a clear dashboard.
- Organize transaction review and investigation workflows.
- Provide a space for experimenting with machine-learning data and models.
- Make model evaluation and case-management workflows accessible from one interface.
- Keep the frontend and backend separated so each can be developed and tested independently.
Features and Modules
The current frontend has been described as including these areas:
- Dashboard: A central overview of the application.
- Transaction Management: A place to view or manage transaction records, depending on the implemented functionality.
- Transaction Investigation: A workflow for examining selected transactions.
- ML Lab: A frontend area for machine-learning experiments or CSV-based demonstrations.
- Model Evaluation: A section for reviewing model evaluation information.
- Case Management: A section for organizing investigation cases.
- Fraud alerts API: The backend has included a GET /api/alerts route. Confirm the response format and data source in the current backend/app.py before documenting it as a stable public API.
Feature availability and data behavior depend on the code currently present in the repository.
Technology Stack
Area	Technology	Purpose
Frontend	React	Component-based user interface
Frontend tooling	Vite	Local development server and build tooling
Backend	Python	Server-side implementation
Backend framework	Flask	HTTP API and application routes
Database	SQLite (if configured)	Local persistent storage
Version control	Git and GitHub	Source history and collaboration

