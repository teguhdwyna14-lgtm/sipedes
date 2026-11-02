
import os
import sqlite3
import functools
import datetime
import secrets

from io import BytesIO
from xml.sax.saxutils import escape

from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash, send_file, abort
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer
)
from reportlab.lib.styles import getSampleStyleSheet


# ==================================================
# KONFIGURASI WEBSITE
# ==================================================

app = Flask(__name__)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "GANTI-SECRET-KEY-SEBELUM-DIPUBLIKASIKAN"
)

DB = os.path.join(app.root_path, "desa.db")


# ==================================================
# DAFTAR LAYANAN SURAT
# ==================================================

SURAT_KATALOG = {

    "Administratif & Kependudukan": [
        "Pengantar KTP Baru",
        "Pengantar Perpanjangan KTP / e-KTP",
        "Pengantar Kartu Keluarga (KK)",
        "Pengantar Kartu Identitas Anak (KIA)",
        "Surat Keterangan Pindah",
        "Surat Keterangan Datang"
    ],

    "Catatan Sipil": [
        "Surat Keterangan Kelahiran",
        "Surat Keterangan Kematian",
        "Surat Pengantar Nikah"
    ],

    "Keterangan Umum": [
        "Surat Keterangan Domisili",
        "Surat Keterangan Tidak Mampu (SKTM)",
        "Surat Pengantar SKCK",
        "Surat Pengantar Izin Keramaian"
    ],

    "Pertanahan & Perizinan": [
        "Surat Riwayat Tanah",
        "Permohonan Salinan Peta / Letter C",
        "Pengantar Balik Nama SPPT-PBB",
        "Surat Keterangan Usaha (SKU)",
        "Surat Domisili Usaha",
        "Pengantar PBG / IMB"
    ]
}

SURAT_PILIHAN = [
    surat
    for daftar in SURAT_KATALOG.values()
    for surat in daftar
]


# ==================================================
# DATABASE
# ==================================================

def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init():

    c = db()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS keluarga (
            id INTEGER PRIMARY KEY,
            kk TEXT UNIQUE NOT NULL,
            alamat TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            nama TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'warga',
            keluarga_id INTEGER,
            lahir TEXT,
            wa TEXT,
            reset INTEGER DEFAULT 1,

            FOREIGN KEY(keluarga_id)
            REFERENCES keluarga(id)
        );

        CREATE TABLE IF NOT EXISTS konten (
            id INTEGER PRIMARY KEY,
            jenis TEXT NOT NULL,
            judul TEXT NOT NULL,
            isi TEXT NOT NULL,
            tanggal TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS jasa (
            id INTEGER PRIMARY KEY,
            nama TEXT NOT NULL,
            kategori TEXT NOT NULL,
            alamat TEXT NOT NULL,
            wa TEXT NOT NULL,
            deskripsi TEXT
        );

        CREATE TABLE IF NOT EXISTS surat (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            jenis TEXT NOT NULL,
            keperluan TEXT NOT NULL,
            status TEXT DEFAULT 'Menunggu',
            catatan TEXT DEFAULT '',
            tanggal TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)
            REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS keluhan (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            isi TEXT NOT NULL,
            status TEXT DEFAULT 'Diterima',
            tanggapan TEXT DEFAULT '',
            tanggal TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)
            REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS bansos (
            id INTEGER PRIMARY KEY,
            keluarga_id INTEGER NOT NULL,
            program TEXT NOT NULL,
            keterangan TEXT,

            FOREIGN KEY(keluarga_id)
            REFERENCES keluarga(id)
        );
    """)

    # Membuat admin jika belum tersedia
    admin = c.execute(
        "SELECT id FROM users WHERE role = 'admin'"
    ).fetchone()

    if not admin:

        password = os.environ.get(
            "ADMIN_PASSWORD",
            "AdminDesa!2026"
        )

        c.execute("""
            INSERT INTO users
            (nama, username, password, role, reset)
            VALUES (?, ?, ?, ?, 1)
        """, (
            "Administrator",
            "admin",
            generate_password_hash(password),
            "admin"
        ))

    # Konten awal website
    konten = c.execute(
        "SELECT id FROM konten LIMIT 1"
    ).fetchone()

    if not konten:

        c.executemany("""
            INSERT INTO konten (jenis, judul, isi)
            VALUES (?, ?, ?)
        """, [
            (
                "berita",
                "Selamat Datang di Portal Desa",
                "Informasi kegiatan desa tersedia di sini."
            ),
            (
                "pengumuman",
                "Portal Pelayanan Warga",
                "Silakan login menggunakan akun dari admin desa."
            )
        ])

    c.commit()
    c.close()


init()


# ==================================================
# KEAMANAN DAN HAK AKSES
# ==================================================

def login_required(f):

    @functools.wraps(f)
    def inner(*args, **kwargs):

        if not session.get("uid"):
            flash("Silakan login terlebih dahulu.")
            return redirect(url_for("login"))

        return f(*args, **kwargs)

    return inner


def admin_required(f):

    @functools.wraps(f)
    @login_required
    def inner(*args, **kwargs):

        if session.get("role") != "admin":
            abort(403)

        return f(*args, **kwargs)

    return inner


@app.context_processor
def common():

    return {
        "me": session.get("nama"),
        "role": session.get("role")
    }


@app.before_request
def force_reset():

    if (
        session.get("uid")
        and session.get("reset")
        and request.endpoint not in (
            "change_password",
            "logout",
            "static"
        )
    ):
        return redirect(url_for("change_password"))


# ==================================================
# HALAMAN UTAMA
# ==================================================

@app.route("/")
def home():

    c = db()

    data = {}

    for jenis in ("berita", "pengumuman"):

        data[jenis] = c.execute("""
            SELECT *
            FROM konten
            WHERE jenis = ?
            ORDER BY id DESC
            LIMIT 3
        """, (jenis,)).fetchall()

    data["jasa"] = c.execute("""
        SELECT *
        FROM jasa
        ORDER BY id DESC
        LIMIT 3
    """).fetchall()

    c.close()

    return render_template("home.html", **data)


# ==================================================
# LOGIN DAN LOGOUT
# ==================================================

@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        username = request.form["username"].strip().lower()
        password = request.form["password"]

        c = db()

        user = c.execute("""
            SELECT *
            FROM users
            WHERE username = ?
        """, (username,)).fetchone()

        c.close()

        if user and check_password_hash(
            user["password"], password
        ):

            session.clear()

            session.update(
                uid=user["id"],
                nama=user["nama"],
                role=user["role"],
                reset=user["reset"]
            )

            if user["reset"]:
                return redirect(url_for("change_password"))

            return redirect(url_for("home"))

        flash("Username atau password salah.")

    return render_template("login.html")


@app.route("/logout")
def logout():

    session.clear()

    return redirect(url_for("home"))


# ==================================================
# GANTI PASSWORD
# ==================================================

@app.route("/ganti-password", methods=["GET", "POST"])
@login_required
def change_password():

    if request.method == "POST":

        password = request.form["password"]

        if len(password) < 10:

            flash("Password minimal 10 karakter.")

        else:

            c = db()

            c.execute("""
                UPDATE users
                SET password = ?, reset = 0
                WHERE id = ?
            """, (
                generate_password_hash(password),
                session["uid"]
            ))

            c.commit()
            c.close()

            session["reset"] = 0

            flash("Password berhasil diubah.")

            return redirect(url_for("home"))

    return render_template("password.html")


# ==================================================
# HALAMAN FITUR DESA
# ==================================================

@app.route("/<jenis>")
def listing(jenis):

    allowed = (
        "berita",
        "pengumuman",
        "jasa",
        "bansos",
        "warga",
        "layanan",
        "keluhan"
    )

    if jenis not in allowed:
        abort(404)

    c = db()
    rows = []

    # Berita dan pengumuman
    if jenis in ("berita", "pengumuman"):

        rows = c.execute("""
            SELECT *
            FROM konten
            WHERE jenis = ?
            ORDER BY id DESC
        """, (jenis,)).fetchall()

    # Jasa warga
    elif jenis == "jasa":

        rows = c.execute("""
            SELECT *
            FROM jasa
            ORDER BY id DESC
        """).fetchall()

    # Bantuan sosial
    elif jenis == "bansos" and session.get("uid"):

        if session.get("role") == "admin":

            rows = c.execute("""
                SELECT b.*, k.kk, k.alamat
                FROM bansos b
                JOIN keluarga k ON k.id = b.keluarga_id
            """).fetchall()

        else:

            rows = c.execute("""
                SELECT b.program, b.keterangan
                FROM bansos b
                JOIN users u
                ON u.keluarga_id = b.keluarga_id
                WHERE u.id = ?
            """, (session["uid"],)).fetchall()

    # Pencarian data warga
    elif jenis == "warga" and session.get("uid"):

        q = request.args.get("q", "").strip()

        if q:

            rows = c.execute("""
                SELECT
                    u.id,
                    u.nama,
                    k.kk,
                    k.alamat

                FROM users u

                LEFT JOIN keluarga k
                ON k.id = u.keluarga_id

                WHERE u.role = 'warga'
                AND (
                    u.nama LIKE ?
                    OR k.kk LIKE ?
                )

                ORDER BY u.nama
                LIMIT 50
            """, (
                "%" + q + "%",
                "%" + q + "%"
            )).fetchall()

    # Pengajuan surat
    elif jenis == "layanan" and session.get("uid"):

        if session.get("role") == "admin":

            rows = c.execute("""
                SELECT s.*, u.nama
                FROM surat s
                JOIN users u ON u.id = s.user_id
                ORDER BY s.id DESC
            """).fetchall()

        else:

            rows = c.execute("""
                SELECT *
                FROM surat
                WHERE user_id = ?
                ORDER BY id DESC
            """, (session["uid"],)).fetchall()

    # Keluhan warga
    elif jenis == "keluhan" and session.get("uid"):

        if session.get("role") == "admin":

            rows = c.execute("""
                SELECT k.*, u.nama
                FROM keluhan k
                JOIN users u ON u.id = k.user_id
                ORDER BY k.id DESC
            """).fetchall()

        else:

            rows = c.execute("""
                SELECT *
                FROM keluhan
                WHERE user_id = ?
                ORDER BY id DESC
            """, (session["uid"],)).fetchall()

    c.close()

    return render_template(
        "listing.html",
        jenis=jenis,
        rows=rows,
        katalog=SURAT_KATALOG
    )


# ==================================================
# DETAIL ANGGOTA KELUARGA
# ==================================================

@app.route("/keluarga/<int:uid>")
@login_required
def keluarga(uid):

    c = db()

    user = c.execute("""
        SELECT keluarga_id
        FROM users
        WHERE id = ? AND role = 'warga'
    """, (uid,)).fetchone()

    if not user or not user["keluarga_id"]:
        c.close()
        abort(404)

    k = c.execute("""
        SELECT *
        FROM keluarga
        WHERE id = ?
    """, (user["keluarga_id"],)).fetchone()

    anggota = c.execute("""
        SELECT nama, wa
        FROM users
        WHERE keluarga_id = ?
        ORDER BY id
    """, (user["keluarga_id"],)).fetchall()

    c.close()

    return render_template(
        "keluarga.html",
        k=k,
        anggota=anggota
    )


# ==================================================
# PENGAJUAN SURAT DAN KELUHAN
# ==================================================

@app.route("/ajukan/<jenis>", methods=["POST"])
@login_required
def ajukan(jenis):

    c = db()

    if jenis == "surat":

        pilihan = request.form.get("jenis", "")

        if pilihan not in SURAT_PILIHAN:
            c.close()
            abort(400)

        c.execute("""
            INSERT INTO surat
            (user_id, jenis, keperluan)
            VALUES (?, ?, ?)
        """, (
            session["uid"],
            pilihan,
            request.form.get("keperluan", "")[:2000]
        ))

    elif jenis == "keluhan":

        isi = request.form.get("isi", "").strip()[:2000]

        if not isi:
            c.close()
            abort(400)

        c.execute("""
            INSERT INTO keluhan (user_id, isi)
            VALUES (?, ?)
        """, (
            session["uid"],
            isi
        ))

    else:
        c.close()
        abort(404)

    c.commit()
    c.close()

    flash("Data berhasil dikirim.")

    tujuan = "layanan" if jenis == "surat" else "keluhan"

    return redirect(url_for("listing", jenis=tujuan))


# ==================================================
# DASHBOARD ADMIN
# ==================================================

@app.route("/admin", methods=["GET", "POST"])
@admin_required
def admin():

    c = db()

    if request.method == "POST":

        tipe = request.form.get("type")

        try:

            # Tambah kartu keluarga
            if tipe == "keluarga":

                c.execute("""
                    INSERT INTO keluarga (kk, alamat)
                    VALUES (?, ?)
                """, (
                    request.form["kk"].strip(),
                    request.form["alamat"].strip()
                ))

            # Tambah akun warga
            elif tipe == "warga":

                lahir = datetime.date.fromisoformat(
                    request.form["lahir"]
                )

                password_awal = lahir.strftime("%d%m%Y")

                c.execute("""
                    INSERT INTO users
                    (
                        nama, username, password,
                        role, keluarga_id, lahir, wa
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    request.form["nama"].strip(),
                    request.form["username"].strip().lower(),
                    generate_password_hash(password_awal),
                    "warga",
                    int(request.form["keluarga_id"]),
                    str(lahir),
                    request.form["wa"].strip()
                ))

            # Tambah berita atau pengumuman
            elif tipe == "konten":

                jenis = request.form["jenis"]

                if jenis not in ("berita", "pengumuman"):
                    abort(400)

                c.execute("""
                    INSERT INTO konten
                    (jenis, judul, isi)
                    VALUES (?, ?, ?)
                """, (
                    jenis,
                    request.form["judul"],
                    request.form["isi"]
                ))

            # Tambah jasa warga
            elif tipe == "jasa":

                c.execute("""
                    INSERT INTO jasa
                    (nama, kategori, alamat, wa, deskripsi)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    request.form["nama"],
                    request.form["kategori"],
                    request.form["alamat"],
                    request.form["wa"],
                    request.form.get("deskripsi", "")
                ))

            # Tambah penerima bansos
            elif tipe == "bansos":

                c.execute("""
                    INSERT INTO bansos
                    (keluarga_id, program, keterangan)
                    VALUES (?, ?, ?)
                """, (
                    request.form["keluarga_id"],
                    request.form["program"],
                    request.form.get("keterangan", "")
                ))

            # Update status surat
            elif tipe == "surat":

                status = request.form["status"]

                if status not in (
                    "Menunggu",
                    "Diproses",
                    "Disetujui",
                    "Ditolak",
                    "Selesai"
                ):
                    abort(400)

                c.execute("""
                    UPDATE surat
                    SET status = ?, catatan = ?
                    WHERE id = ?
                """, (
                    status,
                    request.form.get("catatan", ""),
                    request.form["id"]
                ))

            # Update status keluhan
            elif tipe == "keluhan":

                status = request.form["status"]

                if status not in (
                    "Diterima",
                    "Diproses",
                    "Selesai",
                    "Ditolak"
                ):
                    abort(400)

                c.execute("""
                    UPDATE keluhan
                    SET status = ?, tanggapan = ?
                    WHERE id = ?
                """, (
                    status,
                    request.form.get("tanggapan", ""),
                    request.form["id"]
                ))

            else:
                abort(400)

            c.commit()
            flash("Data berhasil disimpan.")

        except (
            sqlite3.IntegrityError,
            ValueError,
            KeyError
        ):

            c.rollback()

            flash(
                "Data gagal disimpan. "
                "Periksa kembali isian atau data yang sudah ada."
            )

        finally:
            c.close()

        return redirect(url_for("admin"))

    families = c.execute("""
        SELECT *
        FROM keluarga
        ORDER BY id DESC
    """).fetchall()

    users = c.execute("""
        SELECT id, nama, username, role, keluarga_id
        FROM users
        ORDER BY id DESC
    """).fetchall()

    inventory = {}

    for tabel in ("keluarga", "konten", "jasa", "bansos"):

        inventory[tabel] = c.execute(
            f"SELECT * FROM {tabel} ORDER BY id DESC"
        ).fetchall()

    c.close()

    return render_template(
        "admin.html",
        families=families,
        users=users,
        inventory=inventory
    )


# ==================================================
# FITUR HAPUS DATA
# ==================================================

@app.route(
    "/admin/hapus/<tabel>/<int:record_id>",
    methods=["POST"]
)
@admin_required
def hapus(tabel, record_id):

    allowed = {
        "keluarga",
        "users",
        "konten",
        "jasa",
        "bansos",
        "surat",
        "keluhan"
    }

    if tabel not in allowed:
        abort(404)

    c = db()

    # Admin tidak boleh menghapus akun admin
    if tabel == "users":

        target = c.execute("""
            SELECT role
            FROM users
            WHERE id = ?
        """, (record_id,)).fetchone()

        if not target or target["role"] == "admin":
            c.close()
            abort(403)

        terkait = (
            c.execute(
                "SELECT 1 FROM surat WHERE user_id = ?",
                (record_id,)
            ).fetchone()
            or
            c.execute(
                "SELECT 1 FROM keluhan WHERE user_id = ?",
                (record_id,)
            ).fetchone()
        )

        if terkait:

            c.close()

            flash(
                "Akun masih memiliki riwayat surat atau keluhan."
            )

            return redirect(url_for("admin"))

    # Cegah penghapusan KK yang masih digunakan
    if tabel == "keluarga":

        anggota = c.execute("""
            SELECT 1
            FROM users
            WHERE keluarga_id = ?
        """, (record_id,)).fetchone()

        bansos = c.execute("""
            SELECT 1
            FROM bansos
            WHERE keluarga_id = ?
        """, (record_id,)).fetchone()

        if anggota or bansos:

            c.close()

            flash(
                "KK masih memiliki anggota atau data bansos."
            )

            return redirect(url_for("admin"))

    try:

        hasil = c.execute(
            f"DELETE FROM {tabel} WHERE id = ?",
            (record_id,)
        )

        c.commit()

        if hasil.rowcount:
            flash("Data berhasil dihapus.")
        else:
            flash("Data tidak ditemukan.")

    except sqlite3.IntegrityError:

        c.rollback()

        flash(
            "Data tidak dapat dihapus karena masih digunakan."
        )

    finally:
        c.close()

    return redirect(url_for("admin"))


# ==================================================
# CONTOH PDF SURAT
# ==================================================

@app.route("/layanan/contoh/<int:nomor>")
@login_required
def contoh_surat(nomor):

    if nomor < 0 or nomor >= len(SURAT_PILIHAN):
        abort(404)

    judul = SURAT_PILIHAN[nomor]

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=(595, 842),
        leftMargin=65,
        rightMargin=65,
        topMargin=65,
        bottomMargin=60
    )

    styles = getSampleStyleSheet()

    isi = [
        Paragraph(
            "PEMERINTAH DESA",
            styles["Title"]
        ),
        Paragraph(
            "CONTOH FORMAT - BELUM SAH",
            styles["Heading2"]
        ),
        Spacer(1, 35),
        Paragraph(
            escape(judul.upper()),
            styles["Heading1"]
        ),
        Paragraph(
            "Nomor: ....../....../......",
            styles["Normal"]
        ),
        Spacer(1, 30)
    ]

    kolom = [
        "Nama Lengkap",
        "NIK",
        "Nomor KK",
        "Tempat / Tanggal Lahir",
        "Alamat",
        "Keperluan"
    ]

    for nama in kolom:

        isi.append(
            Paragraph(
                escape(nama) +
                ": ........................................",
                styles["Normal"]
            )
        )

        isi.append(Spacer(1, 15))

    isi.extend([
        Spacer(1, 30),

        Paragraph(
            "Dokumen ini merupakan contoh format. "
            "Petugas desa wajib memverifikasi data "
            "dan persyaratan sebelum menerbitkan surat resmi.",
            styles["Normal"]
        ),

        Spacer(1, 40),

        Paragraph(
            "Tanggal: ........................",
            styles["Normal"]
        ),

        Spacer(1, 15),

        Paragraph(
            "Kepala Desa / Pejabat Berwenang",
            styles["Normal"]
        ),

        Spacer(1, 60),

        Paragraph(
            "(....................................)",
            styles["Normal"]
        ),

        Spacer(1, 30),

        Paragraph(
            "DRAF - BUKAN SURAT RESMI",
            styles["Heading3"]
        )
    ])

    doc.build(isi)

    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=False,
        download_name="contoh-surat.pdf"
    )


# ==================================================
# PETA DESA
# ==================================================

@app.route("/peta")
def peta():

    map_url = os.environ.get(
        "DESA_MAP_URL",
        "https://www.google.com/maps/search/"
        "?api=1&query=Desa+Bakung+Kidul+Jamblang+Cirebon"
    )

    return render_template(
        "peta.html",
        map_url=map_url
    )


@app.route("/peta/download")
def download_peta():

    # File CSV referensi lokasi, bukan batas wilayah resmi.
    url = os.environ.get(
        "DESA_MAP_URL",
        "https://www.google.com/maps/search/"
        "?api=1&query=Desa+Bakung+Kidul+Jamblang+Cirebon"
    )

    data = (
        'Nama,Lokasi Google Maps\n'
        'Desa Bakung Kidul,"' +
        url.replace('"', '""') +
        '"\n'
    )

    return send_file(
        BytesIO(data.encode("utf-8-sig")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="tautan-peta-desa.csv"
    )




if __name__ == "__main__":

    app.run(debug=True)
