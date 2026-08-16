# Python Dependencies Installation Guide

## Quick Fix for Current Errors

The ML models require several Python packages. Install them with:

```bash
pip install scikit-learn numpy pandas joblib tensorflow keras xgboost
```

Or install from the requirements file:

```bash
cd backend/ml
pip install -r requirements.txt
```

## Python Version Compatibility

**Important**: Python 3.13 has compatibility issues with TensorFlow/Keras (MemoryError). 

**Recommended**: Use Python 3.10, 3.11, or 3.12.

### You're Currently Using Python 3.13.9

You have two options:

#### Option 1: Install Python 3.12 (Recommended)

1. **Download Python 3.12** from [python.org](https://www.python.org/downloads/release/python-3120/)
   - Choose the Windows installer (64-bit)
   - During installation, check "Add Python to PATH"

2. **Create a virtual environment with Python 3.12**:
   ```bash
   # Find where Python 3.12 was installed (usually C:\Python312 or C:\Users\YourName\AppData\Local\Programs\Python\Python312)
   py -3.12 -m venv venv_ml
   ```

3. **Activate the virtual environment**:
   ```bash
   venv_ml\Scripts\activate
   ```

4. **Install dependencies**:
   ```bash
   pip install -r backend/ml/requirements.txt
   ```

5. **Update the PYTHON_PATH environment variable** or set it in your project:
   ```bash
   # In PowerShell
   $env:PYTHON_PATH = "C:\path\to\venv_ml\Scripts\python.exe"
   ```

#### Option 2: Try Python 3.13 Workaround (May Not Work)

If you want to try Python 3.13, you can attempt:

1. Install TensorFlow 2.16+ (if available):
   ```bash
   pip install tensorflow>=2.16.0
   ```

2. Set environment variables to reduce memory usage:
   ```bash
   set TF_CPP_MIN_LOG_LEVEL=3
   set TF_ENABLE_ONEDNN_OPTS=0
   set TF_FORCE_GPU_ALLOW_GROWTH=true
   ```

However, **Option 1 is strongly recommended** as Python 3.13 support in TensorFlow is still experimental.

## Required Packages

- **scikit-learn** (sklearn) - Required by XGBoost
- **numpy** - Numerical computing
- **pandas** - Data manipulation
- **joblib** - Model serialization
- **tensorflow** - Deep learning framework
- **keras** - High-level neural network API
- **xgboost** - Gradient boosting library

## Installation Steps

1. **Check your Python version**:
   ```bash
   python --version
   ```

2. **Install dependencies**:
   ```bash
   pip install -r backend/ml/requirements.txt
   ```

3. **Verify installation**:
   ```bash
   python -c "import sklearn; import tensorflow; import xgboost; print('All packages installed successfully')"
   ```

## Troubleshooting

### MemoryError with Keras/TensorFlow
- This is often a Python 3.13 compatibility issue
- Solution: Use Python 3.10-3.12

### sklearn ImportError
- Install scikit-learn: `pip install scikit-learn`
- Note: The package is imported as `sklearn` but installed as `scikit-learn`

### XGBoost sklearn dependency
- XGBoost requires scikit-learn for the sklearn API
- Install both: `pip install xgboost scikit-learn`

