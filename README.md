# 📚 StudySpot UBC

A full-stack web app that helps UBC students find the best place to study on campus right now.

🔗 **Live demo:** [studyspot-ubc.vercel.app](https://studyspot-ubc.vercel.app)

---

## Why I built this

As a UBC student living on campus, I found myself wasting time every day trying to find a good spot to study — especially during exam season. IKB would be packed by 1:30pm, the library I didn't know about would be empty, and I had no way to tell without walking there myself.

Over time I built up personal knowledge of which spots were good at which times. StudySpot UBC turns that knowledge into a tool anyone can use.

---

## Features

- **AI-powered natural language search** — describe what you need in plain English ("quiet spot for 2 people tonight, bringing food") and Claude AI extracts your preferences automatically
- **Smart recommendation algorithm** — scores 20+ campus locations based on historical crowd patterns and real-time user reports
- **Interactive map** — color-coded markers show availability at a glance (green = available, orange = moderate, red = busy/closed)
- **Real-time crowding reports** — users can submit live reports that influence recommendations
- **Open/closed detection** — automatically filters or flags locations based on current operating hours
- **Mobile responsive** — works on any device

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript |
| Backend | Node.js, Express |
| Database | PostgreSQL (Supabase) |
| AI | Claude API (Anthropic) |
| Map | Leaflet / OpenStreetMap |
| Deployment | Vercel (frontend), Render (backend) |

---

## Architecture

User → React frontend (Vercel)
→ Node.js/Express API (Render)
→ Supabase PostgreSQL + Anthropic Claude API

## How the recommendation algorithm works

Each location starts with a score of 100. Points are deducted based on:
- Historical crowding data for the current hour and day type
- Real-time user reports from the last hour (weighted 1.3x more heavily)
- User preferences (noise level, food policy, coffee proximity, group size)
- Operating hours (closed locations are pushed to the bottom)

---

## Data

20 UBC study locations with detailed attributes including capacity, noise level, food policy, outlet availability, opening hours, and nearby coffee options — all curated from personal experience as a UBC student.