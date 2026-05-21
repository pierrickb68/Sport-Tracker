import json
import os
import re
import uuid
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, jsonify, session as flask_session

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'soul-tracker-dev-secret-2024')

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


# ── Profile helpers ──────────────────────────────────────────────────────────

def get_profiles():
    profiles = []
    if not os.path.exists(DATA_DIR):
        return profiles
    for f in sorted(os.listdir(DATA_DIR)):
        if f.startswith("sessions_") and f.endswith(".json"):
            name = f[9:-5]
            if not name:
                continue
            path = os.path.join(DATA_DIR, f)
            try:
                with open(path, "r", encoding="utf-8") as fp:
                    count = len(json.load(fp))
            except Exception:
                count = 0
            profiles.append({"name": name, "count": count})
    return profiles


def get_data_file(profile):
    return os.path.join(DATA_DIR, f"sessions_{profile}.json")


def sanitize_name(name):
    name = name.strip()
    # Keep Unicode letters, digits, hyphen — strip everything else (incl. spaces)
    name = re.sub(r'[^\w\-]', '', name)
    return name[:30]


def require_profile(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not flask_session.get('profile'):
            return redirect(url_for('profiles'))
        return f(*args, **kwargs)
    return decorated


@app.context_processor
def inject_profile():
    return {'current_profile': flask_session.get('profile')}


# ── Data I/O ─────────────────────────────────────────────────────────────────

def load_sessions():
    profile = flask_session.get('profile')
    if not profile:
        return []
    path = get_data_file(profile)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_sessions(sessions):
    profile = flask_session.get('profile')
    if not profile:
        return
    path = get_data_file(profile)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(sessions, f, ensure_ascii=False, indent=2)


# ── Templates I/O ─────────────────────────────────────────────────────────────

def load_templates():
    profile = flask_session.get('profile')
    if not profile:
        return []
    path = os.path.join(DATA_DIR, f"templates_{profile}.json")
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_templates(templates):
    profile = flask_session.get('profile')
    if not profile:
        return
    path = os.path.join(DATA_DIR, f"templates_{profile}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)


def build_exercise_from_data(ex):
    exercise = {
        "name": ex["name"].strip(),
        "unilateral": bool(ex.get("unilateral", False)),
        "comment": ex.get("comment", "").strip(),
        "sets": []
    }
    for s in ex.get("sets", []):
        exercise["sets"].append({
            "reps": int(s["reps"]),
            "weight": float(s["weight"]),
            "comment": s.get("comment", "").strip()
        })
    return exercise


# ── Profile routes ────────────────────────────────────────────────────────────

@app.route("/profiles")
def profiles():
    return render_template("profiles.html", profiles=get_profiles())


@app.route("/profiles/select", methods=["POST"])
def select_profile():
    name = request.form.get("name", "").strip()
    valid = [p["name"] for p in get_profiles()]
    if name and name in valid:
        flask_session['profile'] = name
    return redirect(url_for('index'))


@app.route("/profiles/new", methods=["POST"])
def new_profile():
    name = sanitize_name(request.form.get("name", ""))
    if name:
        path = get_data_file(name)
        if not os.path.exists(path):
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump([], f)
        flask_session['profile'] = name
        return redirect(url_for('index'))
    return redirect(url_for('profiles'))


# ── App routes ────────────────────────────────────────────────────────────────

@app.route("/")
@require_profile
def index():
    sessions = load_sessions()
    sessions_sorted = sorted(sessions, key=lambda s: s["date"], reverse=True)
    return render_template("index.html", sessions=sessions_sorted)


@app.route("/add", methods=["GET", "POST"])
@require_profile
def add_session():
    if request.method == "POST":
        data = request.get_json()
        sessions = load_sessions()

        session = {
            "id": str(uuid.uuid4()),
            "date": data["date"],
            "notes": data.get("notes", ""),
            "exercises": []
        }

        for ex in data.get("exercises", []):
            exercise = build_exercise_from_data(ex)
            if exercise["name"] and exercise["sets"]:
                session["exercises"].append(exercise)

        if session["exercises"]:
            sessions.append(session)
            save_sessions(sessions)
            return jsonify({"success": True, "id": session["id"]})
        return jsonify({"success": False, "error": "Aucun exercice valide"}), 400

    today = datetime.now().strftime("%Y-%m-%d")
    return render_template("add_session.html", today=today, mode="new")


@app.route("/session/<session_id>/edit", methods=["GET", "POST"])
@require_profile
def edit_session(session_id):
    sessions = load_sessions()
    sess = next((s for s in sessions if s["id"] == session_id), None)
    if not sess:
        return redirect(url_for("index"))

    if request.method == "POST":
        data = request.get_json()
        updated = {
            "id": session_id,
            "date": data["date"],
            "notes": data.get("notes", ""),
            "exercises": []
        }
        for ex in data.get("exercises", []):
            exercise = build_exercise_from_data(ex)
            if exercise["name"] and exercise["sets"]:
                updated["exercises"].append(exercise)

        if updated["exercises"]:
            sessions = [updated if s["id"] == session_id else s for s in sessions]
            save_sessions(sessions)
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "Aucun exercice valide"}), 400

    today = datetime.now().strftime("%Y-%m-%d")
    return render_template("add_session.html", today=today, mode="edit", session_data=sess)


@app.route("/session/<session_id>/delete", methods=["POST"])
@require_profile
def delete_session(session_id):
    sessions = load_sessions()
    sessions = [s for s in sessions if s["id"] != session_id]
    save_sessions(sessions)
    return redirect(url_for("index"))


@app.route("/progression")
@require_profile
def progression():
    sessions = load_sessions()
    exercise_names = set()
    for session in sessions:
        for ex in session["exercises"]:
            exercise_names.add(ex["name"])
    exercise_names = sorted(exercise_names)
    return render_template("progression.html", exercise_names=exercise_names)


@app.route("/api/progression/<exercise_name>")
@require_profile
def api_progression(exercise_name):
    sessions = load_sessions()
    sessions_sorted = sorted(sessions, key=lambda s: s["date"])

    data_points = []
    for session in sessions_sorted:
        for ex in session["exercises"]:
            if ex["name"].lower() == exercise_name.lower():
                if ex["sets"]:
                    max_weight = max(s["weight"] for s in ex["sets"])
                    mult = 2 if ex.get("unilateral", False) else 1
                    total_volume = sum(s["weight"] * s["reps"] * mult for s in ex["sets"])
                    avg_reps = sum(s["reps"] for s in ex["sets"]) / len(ex["sets"])
                    data_points.append({
                        "date": session["date"],
                        "max_weight": max_weight,
                        "volume": total_volume,
                        "avg_reps": round(avg_reps, 1),
                        "sets_count": len(ex["sets"])
                    })
    return jsonify(data_points)


@app.route("/api/exercises")
@require_profile
def api_exercises():
    sessions = load_sessions()
    exercise_names = set()
    for session in sessions:
        for ex in session["exercises"]:
            exercise_names.add(ex["name"])
    return jsonify(sorted(exercise_names))


@app.route("/api/stats")
@require_profile
def api_stats():
    sessions = load_sessions()
    total_sessions = len(sessions)
    total_exercises = sum(len(s["exercises"]) for s in sessions)
    total_sets = sum(
        sum(len(ex["sets"]) for ex in s["exercises"]) for s in sessions
    )
    total_volume = 0
    for sess in sessions:
        for ex in sess["exercises"]:
            mult = 2 if ex.get("unilateral", False) else 1
            for s in ex["sets"]:
                total_volume += s["weight"] * s["reps"] * mult

    exercise_counts = {}
    for session in sessions:
        for ex in session["exercises"]:
            exercise_counts[ex["name"]] = exercise_counts.get(ex["name"], 0) + 1

    top_exercise = max(exercise_counts, key=exercise_counts.get) if exercise_counts else None

    return jsonify({
        "total_sessions": total_sessions,
        "total_exercises": total_exercises,
        "total_sets": total_sets,
        "total_volume": round(total_volume),
        "top_exercise": top_exercise
    })


@app.route("/templates")
@require_profile
def templates_page():
    return render_template("templates.html", templates=load_templates())


@app.route("/templates/new", methods=["GET"])
@require_profile
def templates_new():
    today = datetime.now().strftime("%Y-%m-%d")
    return render_template("add_session.html", today=today, mode="template_new", session_data=None, template_data=None)


@app.route("/templates/new", methods=["POST"])
@require_profile
def templates_new_post():
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"success": False, "error": "Nom du template requis"}), 400

    tmpl = {"id": str(uuid.uuid4()), "name": name, "exercises": []}
    for ex in data.get("exercises", []):
        exercise = build_exercise_from_data(ex)
        if exercise["name"] and exercise["sets"]:
            tmpl["exercises"].append(exercise)

    if not tmpl["exercises"]:
        return jsonify({"success": False, "error": "Aucun exercice valide"}), 400

    all_templates = load_templates()
    all_templates.append(tmpl)
    save_templates(all_templates)
    return jsonify({"success": True, "id": tmpl["id"]})


@app.route("/templates/<template_id>/edit", methods=["GET"])
@require_profile
def templates_edit(template_id):
    all_templates = load_templates()
    tmpl = next((t for t in all_templates if t["id"] == template_id), None)
    if not tmpl:
        return redirect(url_for("templates_page"))
    today = datetime.now().strftime("%Y-%m-%d")
    return render_template("add_session.html", today=today, mode="template_edit", session_data=None, template_data=tmpl)


@app.route("/templates/<template_id>/edit", methods=["POST"])
@require_profile
def templates_edit_post(template_id):
    all_templates = load_templates()
    tmpl = next((t for t in all_templates if t["id"] == template_id), None)
    if not tmpl:
        return jsonify({"success": False, "error": "Template introuvable"}), 404

    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"success": False, "error": "Nom du template requis"}), 400

    updated = {"id": template_id, "name": name, "exercises": []}
    for ex in data.get("exercises", []):
        exercise = build_exercise_from_data(ex)
        if exercise["name"] and exercise["sets"]:
            updated["exercises"].append(exercise)

    if not updated["exercises"]:
        return jsonify({"success": False, "error": "Aucun exercice valide"}), 400

    all_templates = [updated if t["id"] == template_id else t for t in all_templates]
    save_templates(all_templates)
    return jsonify({"success": True})


@app.route("/templates/<template_id>/delete", methods=["POST"])
@require_profile
def templates_delete(template_id):
    all_templates = [t for t in load_templates() if t["id"] != template_id]
    save_templates(all_templates)
    return redirect(url_for("templates_page"))


@app.route("/api/templates")
@require_profile
def api_templates():
    return jsonify(load_templates())


@app.route("/api/templates/<template_id>/with-last-weights")
@require_profile
def api_template_with_last_weights(template_id):
    all_templates = load_templates()
    tmpl = next((t for t in all_templates if t["id"] == template_id), None)
    if not tmpl:
        return jsonify({"error": "Template introuvable"}), 404

    sessions = load_sessions()
    sessions_sorted = sorted(sessions, key=lambda s: s["date"], reverse=True)

    result = {"id": tmpl["id"], "name": tmpl["name"], "exercises": []}
    for ex in tmpl["exercises"]:
        ex_copy = dict(ex)
        for sess in sessions_sorted:
            for sess_ex in sess["exercises"]:
                if sess_ex["name"].lower() == ex["name"].lower() and sess_ex["sets"]:
                    ex_copy = {**ex, "sets": sess_ex["sets"]}
                    break
            else:
                continue
            break
        result["exercises"].append(ex_copy)

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
