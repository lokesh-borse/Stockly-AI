#!/bin/bash

echo "Starting Django backend..."

cd backend
source ../env/bin/activate
python manage.py runserver 0.0.0.0:8001 &

cd ..

echo "Starting React frontend..."

cd ./frontend
npm run dev
HOST=0.0.0.0 PORT=3000 npm start # Start React app on port 3000 and listen on all interfaces