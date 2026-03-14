# PickAflix – Movie Recommendation System

PickAflix is an AI-powered movie recommendation and social discovery platform.

Features
- Movie recommendation using ML
- Content-based filtering
- Supabase authentication
- Social movie community
- Movie search using TMDB API

Tech Stack
Frontend: HTML, CSS, JavaScript  
Backend: Supabase  
ML: TF-IDF + Cosine Similarity  

# 🎬 PickAflix — Social Movie Recommendation Platform

![PickAflix](https://img.shields.io/badge/PickAflix-Movie%20Platform-e83b3b?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?style=for-the-badge&logo=flask)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)
![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=for-the-badge&logo=netlify)

> A smart, social movie recommendation platform that combines **Content-Based Filtering (CBT)** with community-driven features like profiles, follows, likes, and comments.

**Live Demo:** [pickaflix.netlify.app](https://pickaflix.netlify.app)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Architecture](#project-architecture)
- [How the Recommendation Engine Works](#how-the-recommendation-engine-works)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Setup & Installation](#setup--installation)
- [Scope & Future Work](#scope--future-work)
- [Team](#team)

---

## 📖 Overview

PickAflix solves the problem of **decision fatigue** in movie discovery. With thousands of movies released every year, users struggle to find what to watch next. PickAflix addresses this by:

1. **Algorithmically recommending** movies similar to ones the user already loves — using Content-Based Filtering with TF-IDF Vectorization and Cosine Similarity
2. **Socially connecting** movie lovers — users can follow each other, like profiles, comment on movie recommendations, and see what others are watching
3. **Ranking users** on a community leaderboard based on profile likes received

---

## ✨ Features

### 🤖 Recommendation Engine (CBT)
- Content-Based Filtering using TF-IDF + Cosine Similarity
- Analyzes 5 movie features: genres, plot overview, cast, keywords, director
- Returns Top 10 most similar movies with a **% match score**
- Real-time movie data from TMDB API

### 🔍 Movie Search
- Live search powered by TMDB API
- Movie cards with poster, title, year
- Hover to reveal TMDB rating overlay (⭐)

### 👥 Community Features
- Email/password authentication via Supabase Auth
- Personal profile with up to 8 movie recommendations
- Like other users' profiles (drives the rankings)
- Follow / unfollow other cinephiles
- Comment on any movie recommendation
- **Community / Rankings tabs**

### 🏆 Rankings
- Leaderboard sorted by total profile likes received
- 🥇🥈🥉 medals for top 3
- "Top Cinephile" badge for #1 ranked user

### 🎬 Homepage
- Infinite scrolling movie poster background (3 rows, 3D perspective)
- Fetches real popular movies from TMDB

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              FRONTEND (Netlify)                     │   │
│   │   index.html  │  script.js  │  style.css            │   │
│   │                                                     │   │
│   │   • Home Page (scrolling poster bg)                 │   │
│   │   • Search Page (TMDB search + CBT recommendations) │   │
│   │   • Community Page (auth, profiles, social)         │   │
│   └──────────────┬──────────────────┬───────────────────┘   │
└─────────────────-│──────────────────│─────────────────────--┘
                   │                  │
          ┌────────▼────────┐  ┌──────▼──────────────────┐
          │  TMDB API       │  │   Supabase (Backend)     │
          │                 │  │                          │
          │  • Movie search │  │  • Auth (signup/login)   │
          │  • Posters      │  │  • profiles table        │
          │  • Ratings      │  │  • recommendations table │
          │  • Cast/Crew    │  │  • follows table         │
          └────────┬────────┘  │  • profile_likes table   │
                   │           │  • comments table        │
          ┌────────▼────────┐  └──────────────────────────┘
          │  CBT API        │
          │  (Render/Local) │
          │                 │
          │  Python + Flask │
          │  scikit-learn   │
          │  TF-IDF         │
          │  Cosine Sim     │
          └─────────────────┘
```

### Component Breakdown

| Component | Technology | Hosted On | Purpose |
|-----------|-----------|-----------|---------|
| Frontend | HTML, CSS, JavaScript | Netlify | UI, navigation, search |
| Auth & Database | Supabase (PostgreSQL) | Supabase Cloud | User accounts, social data |
| Movie Data | TMDB API | External API | Movie metadata, posters, ratings |
| Recommendation Engine | Python, Flask, scikit-learn | Render | CBT algorithm, similarity computation |

---

## 🧠 How the Recommendation Engine Works

The recommendation system follows the **Content-Based Filtering (CBT)** approach as described in the project research:

### Step 1 — Feature Vector Creation
Each movie's content is converted into a text feature string combining:
```
feature = genres + genres + overview + keywords + top_5_cast + director
```
Genres are doubled to give them higher weight in the similarity calculation.

### Step 2 — TF-IDF Vectorization
The feature string is converted into a numeric vector using **TF-IDF (Term Frequency-Inverse Document Frequency)**:
- Words that appear often in one movie but rarely in others get a high score
- This makes each movie's vector uniquely representative of its content
- Matrix size: `n_movies × 5000_features`

### Step 3 — Cosine Similarity Matrix
All movie vectors are compared against each other:
```
similarity(A, B) = (A · B) / (||A|| × ||B||)
```
- Similarity = **1.0** → Exact match
- Similarity = **0.0** → Completely different
- Result: an `n × n` similarity matrix

### Step 4 — User Query
User types a movie name (e.g. "Inception"):
1. System searches for "Inception" in the movie pool
2. Retrieves its row from the similarity matrix
3. That row contains similarity scores vs every other movie

### Step 5 — Sort & Return Top 10
```python
sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
return top_10_movies
```
Results shown with a **% match badge** on each movie card.

### Algorithm Flow Diagram
```
User Input
    │
    ▼
Search movie in pool ──── Not found? ──► Fetch from TMDB → vectorize on-the-fly
    │
    ▼
Get similarity row from matrix
    │
    ▼
Sort by score (descending)
    │
    ▼
Return Top 10 movies with % match score
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| HTML5 / CSS3 | Structure and styling |
| Vanilla JavaScript | Logic, API calls, DOM manipulation |
| Supabase JS SDK v2 | Auth and database client |
| TMDB API | Movie search and metadata |
| Netlify | Static site hosting |

### Backend (Recommendation Engine)
| Technology | Purpose |
|-----------|---------|
| Python 3.11 | Core language |
| Flask 3.0 | REST API framework |
| Flask-CORS | Cross-origin request handling |
| scikit-learn | TF-IDF Vectorizer, Cosine Similarity |
| NumPy | Matrix operations |
| Requests | TMDB API calls |
| Gunicorn | Production WSGI server |
| Render | Cloud deployment |

### Database & Auth
| Technology | Purpose |
|-----------|---------|
| Supabase | PostgreSQL database + Auth |
| Row Level Security (RLS) | Data access control |
| PostgreSQL Functions | increment/decrement likes safely |
| Supabase Triggers | Auto-create profile on signup |

---

## 🗄️ Database Schema

```sql
profiles
├── id (uuid, PK → auth.users)
├── username (text, unique)
├── total_likes_received (integer, default 0)
└── created_at (timestamptz)

recommendations
├── id (bigint, PK)
├── user_id (uuid, FK → profiles)
├── movie_id (integer)
├── title (text)
├── poster_path (text)
├── release_year (text)
├── vote_average (numeric)
└── created_at (timestamptz)

follows
├── follower_id (uuid, FK → profiles)
├── following_id (uuid, FK → profiles)
└── created_at (timestamptz)

profile_likes
├── liker_id (uuid, FK → profiles)
├── liked_id (uuid, FK → profiles)
└── created_at (timestamptz)

comments
├── id (bigint, PK)
├── rec_id (bigint, FK → recommendations)
├── user_id (uuid, FK → profiles)
├── username (text)
├── content (text)
└── created_at (timestamptz)
```

---

## 🔌 API Endpoints

### Recommendation Engine (Flask)

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/health` | Check server status and movies loaded |
| `GET` | `/recommend?movie={title}&n={count}` | Get CBT recommendations |
| `GET` | `/search?q={query}` | Search movies (autocomplete) |

#### Example Request
```
GET /recommend?movie=Inception&n=10
```

#### Example Response
```json
{
  "query": "Inception",
  "recommendations": [
    {
      "id": 157336,
      "title": "Interstellar",
      "poster_path": "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      "release_year": "2014",
      "vote_average": 8.4,
      "genres": ["Adventure", "Drama", "Science Fiction"],
      "similarity": 0.847
    }
  ]
}
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js (for VS Code Live Server)
- Supabase account
- TMDB API key
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/pickaflix.git
cd pickaflix
```

### 2. Set Up the Database
1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `schema.sql`
3. Go to Authentication → Providers → Email → disable "Confirm email" for development

### 3. Configure API Keys
Open `script.js` and replace:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const TMDB_KEY     = 'YOUR_TMDB_API_KEY';
```

### 4. Run the Recommendation Engine
```bash
cd pickaflix-api
pip install flask flask-cors requests scikit-learn pandas numpy gunicorn
python app.py
```
Wait for `✅ Ready!` — takes ~2-3 minutes to build similarity matrix.

### 5. Open the Frontend
Open `index.html` with VS Code Live Server at `http://127.0.0.1:5500`

---

## 🚀 Deployment

### Frontend → Netlify
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your project folder
3. Get a live URL instantly

### Backend → Render
1. Push `app.py` + `requirements.txt` to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `gunicorn app:app`
6. Update `CBT_API` in `script.js` with your Render URL

---

## 🔭 Scope & Future Work

### Current Scope
- ✅ Content-Based Filtering with TF-IDF + Cosine Similarity
- ✅ 200 popular movies in recommendation pool
- ✅ Full social platform (profiles, follows, likes, comments)
- ✅ Community rankings leaderboard
- ✅ Real-time movie search via TMDB
- ✅ Deployed on Netlify + Render

### Future Enhancements
| Feature | Description | Priority |
|---------|-------------|----------|
| **Collaborative Filtering** | Recommend based on what similar users liked | High |
| **Hybrid System** | Combine CBT + CF for better accuracy | High |
| **Larger Movie Pool** | Scale from 200 to 10,000+ movies | High |
| **User Watch History** | Personalize based on what user has watched | Medium |
| **Mood-Based Filtering** | Recommend based on current mood | Medium |
| **Movie Ratings** | Let users rate movies, use ratings in algorithm | Medium |
| **Mobile App** | React Native version | Low |
| **Real-time Chat** | Live community chat feature | Low |

### Known Limitations
- Movie pool limited to 200 popular movies (scalable with more compute)
- Recommendation engine sleeps on free Render tier (30s cold start)
- No user preference history used in current CBT implementation
- English movies only (TMDB English language filter)

---

## 👨‍💻 Team

| Name | Roll Number |
|------|-------------|
| Mehul Goel | 2023BIFT07AED026 |
| Hitesh M | 2023BIFT07AED041 |
| Sindhu Sharma | 2023BIFT07AED051 |
| Tushar Ponanna CL | 2023BIFT07AED024 |

**Mentor:** Prof. Kusuma J  
**Course:** 6IT1990 Design Project II

---

## 📄 License

This project is built for educational purposes as part of Design Project II.

---

<p align="center">Made with ❤️ by Team PickAflix</p>
