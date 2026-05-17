import json
import os
import uuid
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, jsonify

app = Flask(__name__)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "sessions.json")


def load_sessions():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_sessions(sessions):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(sessions, f, ensure_ascii=False, indent=2)


@app.route("/")
def index():
    sessions = load_sessions()
    sessions_sorted = sorted(sessions, key=lambda s: s["date"], reverse=True)
    return render_template("index.html", sessions=sessions_sorted)


@app.route("/add", methods=["GET", "POST"])
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
            if exercise["name"] and exercise["sets"]:
                session["exercises"].append(exercise)

        if session["exercises"]:
            sessions.append(session)
            save_sessions(sessions)
            return jsonify({"success": True, "id": session["id"]})
        return jsonify({"success": False, "error": "Aucun exercice valide"}), 400

    today = datetime.now().strftime("%Y-%m-%d")
    return render_template("add_session.html", today=today)


@app.route("/session/<session_id>/delete", methods=["POST"])
def delete_session(session_id):
    sessions = load_sessions()
    sessions = [s for s in sessions if s["id"] != session_id]
    save_sessions(sessions)
    return redirect(url_for("index"))


@app.route("/progression")
def progression():
    sessions = load_sessions()
    exercise_names = set()
    for session in sessions:
        for ex in session["exercises"]:
            exercise_names.add(ex["name"])
    exercise_names = sorted(exercise_names)
    return render_template("progression.html", exercise_names=exercise_names)


@app.route("/api/progression/<exercise_name>")
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
def api_exercises():
    sessions = load_sessions()
    exercise_names = set()
    for session in sessions:
        for ex in session["exercises"]:
            exercise_names.add(ex["name"])
    return jsonify(sorted(exercise_names))


@app.route("/api/stats")
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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
