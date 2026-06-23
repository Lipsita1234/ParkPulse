# ParkPulse AI

ParkPulse AI is a complete production-grade, AI-powered Smart Parking Enforcement Intelligence Platform. It transforms historical parking violation data into actionable intelligence, enabling traffic authorities to proactively manage resources, prevent congestion, and enforce parking regulations efficiently.

## 🌟 Key Features

*   **Data Processing & Cleaning Engine:** Automated pipeline to load, clean, and standardize parking violation datasets, alongside robust feature engineering.
*   **Executive Analytics Dashboard:** Interactive KPIs and trend analysis for violations, vehicles, and location intelligence.
*   **Geospatial Hotspot Intelligence:** AI-driven geospatial clustering (DBSCAN) to identify and visualize high-risk parking zones on an interactive city map.
*   **AI-Based Parking Risk Engine:** Dynamic calculation of parking risk scores based on violation frequency, hotspot density, and historical recurrence.
*   **Predictive Machine Learning Engine:** Anticipates future illegal parking risks using advanced models (XGBoost, LightGBM, CatBoost, Random Forest).
*   **Explainable AI (XAI) Engine:** SHAP-powered explanations to build trust, detailing exactly *why* an area is flagged as high-risk.
*   **AI Prediction Command Center:** A specialized interface for traffic officers to request real-time risk predictions for specific locations and times.
*   **Smart Enforcement Recommendation Engine:** Actionable, automated deployment strategies (e.g., "Deploy 3 officers", "Increase CCTV monitoring") based on calculated risk levels.
*   **Dataset Management & Retraining:** Admin interface to upload new data, validate schemas, and retrain ML models to keep the system up-to-date.
*   **Reports & Export Center:** Generate and export comprehensive reports (CSV, Excel, PDF) for stakeholders.

## 🛠️ Technology Stack

**Frontend (Web Application):**
*   [Next.js](https://nextjs.org/) & [React](https://react.dev/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
*   [Framer Motion](https://www.framer.com/motion/) (Animations)
*   [Recharts](https://recharts.org/) / Chart.js
*   [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/) / Leaflet

**Backend (API & Machine Learning):**
*   [FastAPI](https://fastapi.tiangolo.com/) (Python)
*   Pandas & NumPy
*   Scikit-Learn, XGBoost, LightGBM, CatBoost
*   SHAP (Explainable AI)
*   DBSCAN & GeoPandas (Geospatial Analysis)

**Database:**
*   [PostgreSQL](https://www.postgresql.org/) with [PostGIS](https://postgis.net/) extension for spatial data.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (3.9+)
*   PostgreSQL with PostGIS installed

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/ParkPulse.git
    cd ParkPulse
    ```

2.  **Backend Setup:**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    pip install -r requirements.txt
    
    # Run the FastAPI server
    uvicorn main:app --reload
    ```

3.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    
    # Run the Next.js development server
    npm run dev
    ```

4.  **Database Configuration:**
    Ensure your PostgreSQL database is running with the PostGIS extension enabled. Update the database connection strings in your backend environment variables.

## 📊 Dataset
The application expects parking violation datasets (CSV/Excel) with fields such as `latitude`, `longitude`, `location`, `vehicle_type`, `violation`, `created_date`, etc. The system includes an intelligent preprocessing pipeline that automatically handles schema variations.

## 💻 User Interface
ParkPulse AI features a modern, premium "Smart City Command Center" design:
*   **Glassmorphism** aesthetics with dark/light theme support.
*   **Color-coded Risk Indicators:** Red (High), Orange (Medium), Green (Low).
*   **Responsive Layout** optimized for desktop, tablet, and mobile viewing.

