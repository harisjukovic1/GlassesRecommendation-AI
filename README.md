Running the Project Locally

This project has two main parts:

backend  → Flask + TensorFlow/Keras model
frontend → React + Vite interface

The backend and frontend must be run in two separate terminals.

Requirements

Before running the project, make sure the computer has:

Python 3.11.x
Node.js + npm
Git

Python 3.11 is required because the backend uses TensorFlow/Keras, and these dependencies can fail or behave differently on newer Python versions.

To check installed Python versions on Windows:

py -0

To check Node.js and npm:

node -v
npm -v

1. Clone the Repository
git clone -b mvp https://github.com/harisjukovic1/GlassesRecommendation-AI.git
cd GlassesRecommendation-AI

The project should contain:

backend/
frontend/
.gitignore
README.md
2. Create Environment Files

The real .env files are not pushed to GitHub because they contain local configuration values. Instead, the repository includes .env.example files. The user copies these examples and creates their own local .env files.

This approach is used because every machine may have different local settings, but the project still needs a template showing which variables are required.

Run these commands from the project root:

copy frontend\.env.example frontend\.env
copy backend\.env.example backend\.env

The frontend .env should contain values like:

VITE_SUPABASE_URL=supabase url
VITE_SUPABASE_ANON_KEY=anon key 
VITE_API_URL=http://127.0.0.1:5000

The backend .env should contain:

MODEL_PATH=model/rgb_vggface_best_20260504_1335.keras

After creating or changing .env files, restart the frontend/backend servers.

3. Run the Backend

Open the first terminal:

cd backend
py -3.11 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py

The command:

py -3.11 -m venv venv

creates a virtual environment using Python 3.11 specifically. This avoids using the wrong Python version if the computer also has Python 3.12 or 3.13 installed.

When the backend starts correctly, it should show:

Running on http://127.0.0.1:5000

You can test it by opening:

http://127.0.0.1:5000/health
4. Run the Frontend

Open a second terminal:

cd frontend
npm install
npm run dev

The frontend should start on something like:

http://localhost:5173

Open that link in the browser.

5. Testing the App

The user can test the main feature without logging in:

Upload/take photo
Preview image
Analyze face shape
View prediction result
View glasses recommendations
Open official store links

If the user creates an account and logs in, extra features become available:

Save up to 3 prediction profiles
Save recommended frames
Like/dislike recommendations
Leave optional feedback
View saved profiles
Delete saved profiles

Logged-out users can scan and view recommendations, but no records are saved to the database.

Note About Docker

A Dockerfile was created and tested for the backend, and it worked locally. However, it was not included as the primary running method in this version of the documentation because the Docker image became very large due to TensorFlow/Keras and other AI dependencies. For this MVP submission, the recommended testing method is to run the backend with Python 3.11 locally and run the frontend with Node.js/npm.
