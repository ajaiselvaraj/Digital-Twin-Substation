# PowerShell script to set up Python 3.12 virtual environment for ML models
# Run this script from the project root directory

Write-Host "Setting up Python 3.12 virtual environment for ML models..." -ForegroundColor Green

# Check if Python 3.12 is available
$python312 = Get-Command py -ErrorAction SilentlyContinue
if (-not $python312) {
    Write-Host "Error: 'py' launcher not found. Please install Python 3.12 first." -ForegroundColor Red
    Write-Host "Download from: https://www.python.org/downloads/release/python-3120/" -ForegroundColor Yellow
    exit 1
}

# Try to find Python 3.12
Write-Host "Checking for Python 3.12..." -ForegroundColor Yellow
$pythonVersion = py -3.12 --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Python 3.12 not found. Please install Python 3.12 first." -ForegroundColor Red
    Write-Host "Download from: https://www.python.org/downloads/release/python-3120/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installing Python 3.12, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found: $pythonVersion" -ForegroundColor Green

# Create virtual environment
$venvPath = "backend\ml\venv_ml"
if (Test-Path $venvPath) {
    Write-Host "Virtual environment already exists at $venvPath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to recreate it? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Remove-Item -Recurse -Force $venvPath
        Write-Host "Creating new virtual environment..." -ForegroundColor Green
        py -3.12 -m venv $venvPath
    }
} else {
    Write-Host "Creating virtual environment at $venvPath..." -ForegroundColor Green
    py -3.12 -m venv $venvPath
}

# Activate virtual environment and install dependencies
Write-Host "Activating virtual environment and installing dependencies..." -ForegroundColor Green
& "$venvPath\Scripts\Activate.ps1"
python --version

Write-Host "Installing required packages..." -ForegroundColor Green
pip install --upgrade pip
pip install -r backend\ml\requirements.txt

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To use this environment:" -ForegroundColor Yellow
Write-Host "  1. Activate it: .\backend\ml\venv_ml\Scripts\Activate.ps1" -ForegroundColor Cyan
Write-Host "  2. Set PYTHON_PATH environment variable:" -ForegroundColor Cyan
Write-Host "     `$env:PYTHON_PATH = `"$((Get-Location).Path)\backend\ml\venv_ml\Scripts\python.exe`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or add this to your .env file:" -ForegroundColor Yellow
Write-Host "  PYTHON_PATH=$((Get-Location).Path)\backend\ml\venv_ml\Scripts\python.exe" -ForegroundColor Cyan

