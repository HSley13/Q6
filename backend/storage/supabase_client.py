"""Supabase client for backend writes (service-role key, bypasses RLS)."""
from functools import lru_cache

from supabase import Client, create_client

from backend.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


@lru_cache
def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
