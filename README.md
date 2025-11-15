# QueueCTL – Background Job Queue System (CLI-Based)

A lightweight CLI-based background job queue built using Node.js + MongoDB, designed to simulate real-world job processing systems like BullMQ, Celery, or Sidekiq.

This project was built as part of a backend internship assignment.
It demonstrates:

CLI development using Commander.js

Background workers

Retry logic with exponential backoff

MongoDB storage using Mongoose

Structured logs using Winston

## 🚀 Features

Add jobs from the command line

Worker engine that fetches and executes jobs

Retry mechanism with exponential backoff

Job persistence using MongoDB

Structured logs

Modular architecture

## 🛠️ Tech Stack
Component	Library
CLI	Commander.js
Database	MongoDB + Mongoose
Logging	Winston
Environment Config	dotenv
Unique IDs	uuid
Dev Tool	nodemon
## 📦 Installation
1️⃣ Clone the Repository

cd queuectl

2️⃣ Install Dependencies
npm install

3️⃣ Setup Environment Variables

Create a .env file:

MONGO_URI=mongodb://127.0.0.1:27017/queuectl

## ▶️ Usage
1. Add a job
node src/cli/queuectl.js add "Send Email to User"

Output:
Job added: Send Email to User

2. Start the worker
node src/cli/queuectl.js start-worker


The worker:

pulls jobs from MongoDB

executes them

retries failed jobs

applies exponential backoff

## 🔁 Retry & Backoff Strategy

Retry logic uses exponential backoff:

backoff = baseDelay * 2^attempt


Example:

Attempt	Delay
1	2000 ms
2	4000 ms
3	8000 ms

You can customize this inside src/core/backoff.js.

## 📝 Job Schema Example

Each job stored in MongoDB contains:

{
  "name": "Send Email",
  "status": "pending",
  "retries": 0,
  "maxRetries": 5,
  "nextRun": "2025-11-14T10:20:00Z"
}

