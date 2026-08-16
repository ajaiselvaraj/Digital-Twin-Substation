@echo off
REM Batch script to set up Python 3.12 virtual environment for ML models
REM Run this script from the project root directory

echo Setting up Python 3.12 virtual environment for ML models...

REM Check if Python 3.12 is available
py -3.12 --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python 3.12 not found. Please install Python 3.12 first.
    echo Download from: https://www.python.org/downloads/release/python-3120/
    echo.
    echo After installing Python 3.12, run this script again.
    pause
    exit /b 1
)

echo Found Python 3.12
py -3.12 --version

REM Create virtual environment
set VENV_PATH=backend\ml\venv_ml
if exist "%VENV_PATH%" (
    echo Virtual environment already exists at %VENV_PATH%
    set /p RECREATE="Do you want to recreate it? (y/N): "
    if /i "%RECREATE%"=="y" (
        rmdir /s /q "%VENV_PATH%"
        echo Creating new virtual environment...
        py -3.12 -m venv "%VENV_PATH%"
    )
) else (
    echo Creating virtual environment at %VENV_PATH%...
    py -3.12 -m venv "%VENV_PATH%"
)

REM Activate virtual environment and install dependencies
echo Activating virtual environment and installing dependencies...
call "%VENV_PATH%\Scripts\activate.bat"
python --version

echo Installing required packages...
python -m pip install --upgrade pip
pip install -r backend\ml\requirements.txt

echo.
echo Setup complete!
echo.
echo To use this environment:
echo   1. Activate it: backend\ml\venv_ml\Scripts\activate.bat
echo   2. Set PYTHON_PATH environment variable in your .env file:
echo      PYTHON_PATH=%CD%\backend\ml\venv_ml\Scripts\python.exe
echo.
pause

