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
Editor	Visual Studio Code	Local development environment


Check frontend/package.json and backend/requirements.txt for the exact installed packages and versions.
Architecture

Request flow
1. A user opens the React frontend in a web browser.
2. The frontend renders the relevant dashboard or module.
3. When server data is required, the frontend sends an HTTP request to a configured Flask API endpoint.
4. The backend validates and processes the request using its implemented application logic.
5. If the route uses a database, the backend reads or writes data through the configured database layer.
6. The backend returns a response and the frontend updates the interface.
The exact request flow varies by feature. The diagram is a high-level conceptual view; it is not a substitute for inspecting the implementation.
Repository Structure
The following is a representative layout. Your actual filenames may differ; keep the files already in your repository and update this section to match them.
FraudShield/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/              # if present
│   │   ├── App.jsx
│   │   └── main.jsx             # common Vite entry point; verify
│   ├── package.json
│   ├── package-lock.json        # if generated and committed
│   └── vite.config.js           # if present
├── backend/
│   ├── app.py
│   ├── fraud_alerts.py          # if present
│   ├── requirements.txt
│   └── ...                      # other backend modules
├── architecture.png
├── .gitignore
└── README.md
Files that should generally not be committed
- Python virtual environments such as .venv/ or venv/
- JavaScript dependency folders such as node_modules/
- Local secrets in .env files
- Logs, caches, and temporary files
- Local database files such as fraudshield.db when they contain private data or are intended to be generated locally
Prerequisites
Install the following before running the application:
- Git
- Python 3 (use the version supported by the packages in backend/requirements.txt)
- Node.js and npm
- Visual Studio Code or another code editor
Verify installations in a terminal:
git --version
python --version
node --version
npm --version
On some Windows installations, use py --version if the python command is not available.
Local Setup
1. Get the repository
If you have not already cloned the repository:
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd FraudShield
Replace <YOUR_GITHUB_REPOSITORY_URL> with the actual repository URL. If the project is already on your computer, open its existing folder instead of cloning it over your work.
2. Install backend dependencies
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
If PowerShell blocks activation, you can run the backend's virtual-environment Python directly:
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Only use this alternative from the backend directory.
3. Install frontend dependencies
Open a second terminal and run:
cd frontend
npm install
If package-lock.json is committed and you want a reproducible install, npm ci can be used instead of npm install.
Configuration
Review the backend and frontend source code to identify required configuration values before running the app.
- Store credentials and private API keys in local environment variables or an ignored .env file.
- Never commit real credentials to GitHub.
- If the project needs environment variables, provide a safe .env.example containing placeholder values only.
- Confirm the frontend API base URL matches the backend host and port used locally.
Do not create variables that the current code does not read. Document each required variable after verifying it in the source.
Database Notes
The local database file fraudshield.db is not required to be committed to GitHub in every setup.
- If the backend creates its tables and database automatically, a new clone may initialize an empty database on startup or through an initialization command.
- If the backend expects a pre-existing database, document the required schema/seed process or provide a sanitized seed script.
- Data stored only in a local SQLite file will not automatically be available on another computer.
- Do not commit real customer data, account details, transaction records, credentials, or other sensitive information.
- If sample data is needed, use synthetic data and document how to load it.
Before sharing the repository, test the setup from a clean clone or a separate copy of the project.
API Notes
The backend uses Flask. One route previously present in the project is:
Method	Route	Known purpose
GET	/api/alerts	Retrieve fraud-alert data, as implemented by the backend


This table is intentionally limited to the route known from the current project context. Inspect backend/app.py and related modules to confirm the route still exists, whether it requires parameters, the response schema, and any authentication requirements. Add other endpoints only after verifying them in code.
Running the Application
Start the backend
In terminal 1:
cd D:\FraudShield\backend
.\.venv\Scripts\Activate.ps1
python app.py
If your project is located elsewhere, replace D:\FraudShield with the correct path. Keep the terminal open while using the backend.
Start the frontend
In terminal 2:
cd D:\FraudShield\frontend
npm run dev
Vite prints the local URL in the terminal (commonly http://localhost:5173). Open the exact URL shown in your terminal.
Stop the servers
Press Ctrl+C in each terminal to stop the corresponding development server.
Testing and Verification
Before sharing a demo, verify:
- [ ] Frontend starts without build or console errors.
- [ ] Backend starts without Python errors.
- [ ] The frontend can reach the backend where API integration is expected.
- [ ] Each dashboard module opens and renders.
- [ ] Database initialization works on a fresh setup.
- [ ] Missing or malformed input is handled safely.
- [ ] No secrets or private data are included in the repository.
- [ ] The README setup steps work on a clean clone.
For machine-learning features, evaluate the model using appropriate held-out data and metrics. Do not treat a demo prediction as proof of real-world fraud detection accuracy.
Security Considerations
- Validate and sanitize input on the backend; frontend validation alone is insufficient.
- Do not expose API keys, passwords, access tokens, or database credentials in source code.
- Avoid committing .env files and sensitive database files.
- Use synthetic or anonymized data for demos and screenshots.
- Add authentication and authorization before exposing sensitive transaction or identity data.
- Use HTTPS, secure deployment configuration, logging controls, and rate limiting before production use.
- Treat fraud predictions as decision support, not as the sole basis for high-impact decisions, unless the system has been properly validated and governed.
Troubleshooting
npm is not recognized
Install Node.js, restart the terminal, and check node --version and npm --version.
ModuleNotFoundError in Python
Activate the backend virtual environment and install dependencies:
pip install -r requirements.txt
Frontend cannot connect to the backend
- Confirm the Flask server is running.
- Check the backend host/port shown in its terminal.
- Check the frontend API base URL and CORS configuration, if used.
- Inspect the browser developer console and the Flask terminal for errors.
Database file is missing
Check whether the backend initializes the database automatically. If not, follow the project's schema or seed procedure. Do not solve this by uploading a database containing private data.
GitHub does not show a local file
Check whether the file is ignored or untracked:
git status
git check-ignore -v path\to\file
Remember that git push sends committed Git history; it does not upload uncommitted files.
Future Improvements
Possible next steps, depending on project scope:
- Add a documented database initialization and synthetic seed-data command.
- Document all verified API routes and response schemas.
- Add automated backend tests and frontend build checks.
- Improve validation, error handling, authentication, and authorization.
- Record model evaluation results using documented datasets and metrics.
- Add deployment instructions after choosing a target hosting environment.
Contributing
For personal or academic development, keep changes focused and test them before committing. Suggested workflow:
1. Create a branch for a change.
2. Implement and test the change.
3. Review git diff and git status.
4. Commit the change with a clear message.
5. Push the branch and open a pull request if the repository uses reviews.
License
No license is specified here because the repository's intended license has not been confirmed. Add a LICENSE file and update this section only after choosing a license. Without an explicit license, others do not automatically receive permission to reuse the code.
