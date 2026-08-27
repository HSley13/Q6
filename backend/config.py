"""Environment configuration shared by every stage of the pipeline."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Walk up from this file to the repo root so `.env` is found regardless of CWD.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def get_env(name: str, required: bool = True) -> str:
    value = os.environ.get(name, "")
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


SERPAPI_API_KEY = get_env("SERPAPI_API_KEY", required=False)
SUPABASE_URL = get_env("SUPABASE_URL", required=False)
SUPABASE_SERVICE_ROLE_KEY = get_env("SUPABASE_SERVICE_ROLE_KEY", required=False)
