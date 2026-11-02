
import sqlite3
from getpass import getpass
from werkzeug.security import generate_password_hash

password = getpass("Masukkan password admin baru: ")

if len(password) < 12:
    raise SystemExit("Password minimal 12 karakter.")

conn = sqlite3.connect("desa.db")

hasil = conn.execute(
    "UPDATE users SET password=?, reset=0 WHERE username=? AND role=?",
    (generate_password_hash(password), "admin", "admin")
)

conn.commit()
conn.close()

if hasil.rowcount:
    print("Password admin berhasil direset!")
else:
    print("Akun admin tidak ditemukan. Periksa folder database.")
