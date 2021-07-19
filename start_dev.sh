#!/bin/bash 

trap killgroup SIGINT

killgroup(){
  echo killing...
  kill 0
}

FLASK_ENV=development FLASK_APP=app/app.py flask run --port=5000 &
cd app/static && npm install &&
npx webpack serve  &
wait
