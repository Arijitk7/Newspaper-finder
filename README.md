# Ei Samay E-Paper Fetcher

A simple full-stack application that scrapes today's Ei Samay e-paper PDF link and serves it via a beautiful frontend.

## 🚀 How to Run Locally

### 1. Start the Backend
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Ensure you have Node.js installed, then install dependencies:
   ```bash
   npm install
   ```
3. Start up the backend server:
   ```bash
   node server.js
   ```
   *The server will start natively on `http://localhost:3000`*.

### 2. Start the Frontend
Since the frontend uses vanilla HTML/CSS/JS, you can just open `frontend/index.html` directly in your browser. 
Alternatively, if you have VS Code installed, use the **Live Server** extension to open `index.html`. 

---

## 🌍 How Frontend Connects to Backend

In `frontend/app.js`, there is a constant `API_URL`:
```javascript
const API_URL = 'http://localhost:3000/api/latest-paper'; 
```
When you click **Get Today's Paper**, it uses `fetch(API_URL)` to hit the backend server running locally. The backend scrapes the target site and responds with the PDF URL, which is then handled in `app.js` to show the **Download PDF** and **Share Button**.

---

## ☁️ How to Deploy Backend for Free (Render / Railway)

### Using Render (Easiest)
1. **Push your code to GitHub:**
   - Create a new free repository on GitHub and push the `backend` folder to the root.
2. **Deploy on Render:**
   - Go to [render.com](https://render.com) and sign up with GitHub.
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository.
   - Fill out the deployment details:
     - **Build Command:** `npm install`
     - **Start Command:** `node server.js`
   - Select the Free Tier and hit **Create Web Service**.
3. **Update the Frontend:**
   - Once Render finishes deploying, you will receive a free `onrender.com` URL (e.g., `https://ei-samay-api.onrender.com`).
   - Open `frontend/app.js` and update `API_URL`:
     ```javascript
     const API_URL = 'https://ei-samay-api.onrender.com/api/latest-paper';
     ```

### Deploying the Frontend (Optional)
You can drag and drop your `frontend` folder into [Netlify (Drop)](https://app.netlify.com/drop) or upload it to [Vercel](https://vercel.com/) for instant, free hosting of your shiny new interface.
