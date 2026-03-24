@echo off
echo Activating virtual environment...
call e:\stock-portfolio-project-LLM\stock-portfolio-project\evn\Scripts\activate.bat

echo Installing/checking dependencies...
pip install djangorestframework-simplejwt --quiet

echo Running makemigrations...
python manage.py makemigrations

echo Running migrate...
python manage.py migrate

echo === Done ===
