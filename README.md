# Ghar Ki Rasoi 🍛🍱

> Bringing the warmth of home-cooked food to your table.

**Ghar Ki Rasoi** is a full-stack homemade meal ordering and delivery platform connecting home chefs, customers, and delivery partners.

---

## 🚀 Features

- **👨‍🍳 Chef Portal**: Register kitchens, list daily homemade menus, manage orders, and track earnings.
- **🧍‍♀️ Customer Portal**: Browse fresh home-cooked meals, filter dishes, and place orders.
- **🚴 Delivery Partner**: Streamlined onboarding and order delivery coordination.
- **⚡ Real-time Backend**: Powered by Node.js, Express, and Supabase PostgreSQL.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)

---

## 📁 Project Structure

```text
GharKiRasoi/
├── index.html        # Main application UI
├── style.css         # Styling and responsive layout
├── script.js         # Frontend logic & API interaction
├── server.js         # Express server & API endpoints
├── db.js             # Supabase database connection helper
├── package.json      # Dependencies and scripts
├── .env.example      # Example environment variables template
├── .gitignore        # Git ignore rules for node_modules and .env
└── README.md         # Project documentation
```

---

## ⚙️ Setup and Installation

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/GharKiRasoi.git
cd GharKiRasoi
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### 4. Start the server
```bash
npm start
```
Open your browser and navigate to `http://localhost:5000`.

---

## 🔒 Security Note
Never commit your `.env` file containing sensitive credentials to GitHub. A `.gitignore` file has already been configured to keep your credentials safe.
