import sqlite3
import pickle


def get_user_by_id(user_id):
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # Vulnerable: SQL built via string concatenation from external input
    query = "SELECT * FROM users WHERE id=" + user_id
    cursor.execute(query)
    return cursor.fetchone()


def search_users(name):
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # Vulnerable: f-string SQL interpolation
    result = cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")
    return result.fetchall()


def load_cached_session(raw_bytes):
    # Vulnerable: unsafe deserialization of untrusted data
    return pickle.loads(raw_bytes)
