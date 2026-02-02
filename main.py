from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
from functools import wraps
import sys
import os
import json
import hashlib
import datetime
from io import StringIO

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'trustai-secret-key-change-in-production')

# Upstash Redis connection via REST API
UPSTASH_URL = os.environ.get('KV_REST_API_URL')
UPSTASH_TOKEN = os.environ.get('KV_REST_API_TOKEN')

def redis_get(key):
    """Get value from Upstash Redis via REST API"""
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return None
    try:
        import urllib.request
        import urllib.error
        req = urllib.request.Request(
            f"{UPSTASH_URL}/get/{key}",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get('result')
    except Exception as e:
        print(f"Redis GET error: {e}")
        return None

def redis_set(key, value):
    """Set value in Upstash Redis via REST API"""
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return False
    try:
        import urllib.request
        import urllib.error
        import urllib.parse
        encoded_value = urllib.parse.quote(value, safe='')
        req = urllib.request.Request(
            f"{UPSTASH_URL}/set/{key}/{encoded_value}",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return True
    except Exception as e:
        print(f"Redis SET error: {e}")
        return False

# User database file (fallback for local development)
USERS_FILE = 'users.json'

# Admin credentials (preset)
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD_HASH = hashlib.sha256('TrustAI2024!'.encode()).hexdigest()

def load_users():
    """Load users from Upstash Redis or JSON file"""
    # Try Upstash REST API first
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            users_data = redis_get('trustai_users')
            if users_data:
                return json.loads(users_data)
            return {}
        except Exception as e:
            print(f"Redis load error: {e}")
            # Fall through to file fallback

    # Fallback to file
    try:
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"File load error: {e}")

    return {}

def save_users(users):
    """Save users to Upstash Redis or JSON file"""
    # Try Upstash REST API first
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            if redis_set('trustai_users', json.dumps(users)):
                return
        except Exception as e:
            print(f"Redis save error: {e}")
            # Fall through to file fallback

    # Fallback to file
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f)
    except Exception as e:
        print(f"File save error: {e}")

def hash_password(password):
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator to require admin login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session or not session.get('is_admin'):
            flash('Admin access required', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_user_progress(username):
    """Get or initialize user progress data"""
    users = load_users()
    if username not in users:
        return get_default_progress()

    user_data = users[username]
    if 'progress' not in user_data:
        user_data['progress'] = get_default_progress()
        save_users(users)

    return user_data['progress']

def get_default_progress():
    """Return default progress structure"""
    return {
        'courses_started': 0,
        'exercises_completed': 0,
        'streak_days': 0,
        'total_time': 0,
        'coding_progress': 0,
        'coding_exercises': 0,
        'workflow_progress': 0,
        'workflow_exercises': 0,
        'git_progress': 0,
        'git_exercises': 0,
        'academy_progress': 0,
        'academy_modules': 0,
        'last_activity': None,
        'activities': []
    }

def update_user_progress(username, course, action):
    """Update user progress for a specific action"""
    users = load_users()
    if username not in users:
        return

    if 'progress' not in users[username]:
        users[username]['progress'] = get_default_progress()

    progress = users[username]['progress']
    now = datetime.datetime.now()

    # Update last activity and streak
    if progress['last_activity']:
        try:
            last = datetime.datetime.fromisoformat(progress['last_activity'])
            days_diff = (now.date() - last.date()).days
            if days_diff == 1:
                progress['streak_days'] += 1
            elif days_diff > 1:
                progress['streak_days'] = 1
        except:
            progress['streak_days'] = 1
    else:
        progress['streak_days'] = 1

    progress['last_activity'] = now.isoformat()

    # Track course visit
    if action == 'visit':
        if course == 'coding' and progress['coding_progress'] == 0:
            progress['courses_started'] += 1
            progress['coding_progress'] = 5
        elif course == 'workflow' and progress['workflow_progress'] == 0:
            progress['courses_started'] += 1
            progress['workflow_progress'] = 5
        elif course == 'git' and progress['git_progress'] == 0:
            progress['courses_started'] += 1
            progress['git_progress'] = 5
        elif course == 'academy' and progress['academy_progress'] == 0:
            progress['courses_started'] += 1
            progress['academy_progress'] = 5

    # Track exercise completion
    elif action == 'exercise':
        progress['exercises_completed'] += 1
        if course == 'coding':
            progress['coding_exercises'] += 1
            progress['coding_progress'] = min(100, int((progress['coding_exercises'] / 20) * 100))
        elif course == 'workflow':
            progress['workflow_exercises'] += 1
            progress['workflow_progress'] = min(100, int((progress['workflow_exercises'] / 10) * 100))
        elif course == 'git':
            progress['git_exercises'] += 1
            progress['git_progress'] = min(100, int((progress['git_exercises'] / 8) * 100))
        elif course == 'academy':
            progress['academy_modules'] += 1
            progress['academy_progress'] = min(100, int((progress['academy_modules'] / 6) * 100))

    # Add activity log
    activity = {
        'icon': get_activity_icon(course, action),
        'text': get_activity_text(course, action),
        'time': now.strftime('%b %d, %Y at %I:%M %p')
    }
    progress['activities'].insert(0, activity)
    progress['activities'] = progress['activities'][:10]  # Keep last 10 activities

    # Update time spent (estimate 5 minutes per action)
    progress['total_time'] += 5

    save_users(users)

def get_activity_icon(course, action):
    icons = {
        'coding': '🧩',
        'workflow': '🔀',
        'git': '📦',
        'academy': '🤖'
    }
    return icons.get(course, '📚')

def get_activity_text(course, action):
    course_names = {
        'coding': 'Block Coding',
        'workflow': 'Workflow Builder',
        'git': 'Git Visualizer',
        'academy': 'AI Academy'
    }
    if action == 'visit':
        return f"Started learning {course_names.get(course, course)}"
    elif action == 'exercise':
        return f"Completed an exercise in {course_names.get(course, course)}"
    return f"Activity in {course_names.get(course, course)}"

# Block definitions for the palette
BLOCK_CATEGORIES = {
    "variables": {
        "color": "#8b5cf6",
        "icon": "x",
        "blocks": [
            {"id": "var_create", "label": "Create variable", "template": "{name} = {value}", "inputs": ["name", "value"]},
            {"id": "var_set", "label": "Set variable", "template": "{name} = {value}", "inputs": ["name", "value"]},
            {"id": "var_change", "label": "Change by", "template": "{name} += {value}", "inputs": ["name", "value"]},
            {"id": "var_print", "label": "Print variable", "template": "print({name})", "inputs": ["name"]},
            {"id": "var_multiply", "label": "Multiply by", "template": "{name} *= {value}", "inputs": ["name", "value"]},
            {"id": "var_divide", "label": "Divide by", "template": "{name} /= {value}", "inputs": ["name", "value"]},
        ]
    },
    "control": {
        "color": "#f59e0b",
        "icon": "↻",
        "blocks": [
            {"id": "if_block", "label": "If", "template": "if {condition}:", "inputs": ["condition"], "accepts_children": True},
            {"id": "if_else_block", "label": "If-Else", "template": "if {condition}:", "inputs": ["condition"], "accepts_children": True, "has_else": True},
            {"id": "repeat_times", "label": "Repeat times", "template": "for _ in range({times}):", "inputs": ["times"], "accepts_children": True},
            {"id": "for_range", "label": "For i in range", "template": "for {var} in range({start}, {end}):", "inputs": ["var", "start", "end"], "accepts_children": True},
            {"id": "while_block", "label": "While", "template": "while {condition}:", "inputs": ["condition"], "accepts_children": True},
            {"id": "break_block", "label": "Break", "template": "break", "inputs": []},
            {"id": "continue_block", "label": "Continue", "template": "continue", "inputs": []},
        ]
    },
    "output": {
        "color": "#10b981",
        "icon": "⎙",
        "blocks": [
            {"id": "print_msg", "label": "Print", "template": "print({message})", "inputs": ["message"]},
            {"id": "print_multiple", "label": "Print multiple", "template": "print({item1}, {item2})", "inputs": ["item1", "item2"]},
            {"id": "print_input", "label": "Input", "template": "{name} = input({prompt})", "inputs": ["name", "prompt"]},
            {"id": "print_fstring", "label": "Print formatted", "template": "print(f\"{text}{{name}}\")", "inputs": ["text", "name"]},
        ]
    },
    "operators": {
        "color": "#3b82f6",
        "icon": "+",
        "blocks": [
            {"id": "compare", "label": "Compare", "template": "{a} {op} {b}", "inputs": ["a", "op", "b"], "is_expression": True},
            {"id": "math_add", "label": "Add", "template": "{a} + {b}", "inputs": ["a", "b"], "is_expression": True},
            {"id": "math_subtract", "label": "Subtract", "template": "{a} - {b}", "inputs": ["a", "b"], "is_expression": True},
            {"id": "math_multiply", "label": "Multiply", "template": "{a} * {b}", "inputs": ["a", "b"], "is_expression": True},
            {"id": "math_divide", "label": "Divide", "template": "{a} / {b}", "inputs": ["a", "b"], "is_expression": True},
            {"id": "math_modulo", "label": "Remainder (mod)", "template": "{a} % {b}", "inputs": ["a", "b"], "is_expression": True},
            {"id": "math_power", "label": "Power", "template": "{a} ** {b}", "inputs": ["a", "b"], "is_expression": True},
        ]
    },
    "logic": {
        "color": "#ec4899",
        "icon": "◇",
        "blocks": [
            {"id": "logic_and", "label": "And", "template": "{a} and {b}", "inputs": ["a", "b"], "is_expression": True},
            {"id": "logic_or", "label": "Or", "template": "{a} or {b}", "inputs": ["a", "b"], "is_expression": True},
            {"id": "logic_not", "label": "Not", "template": "not {a}", "inputs": ["a"], "is_expression": True},
            {"id": "logic_true", "label": "True", "template": "True", "inputs": [], "is_expression": True},
            {"id": "logic_false", "label": "False", "template": "False", "inputs": [], "is_expression": True},
        ]
    },
    "lists": {
        "color": "#06b6d4",
        "icon": "[]",
        "blocks": [
            {"id": "list_create", "label": "Create list", "template": "{name} = []", "inputs": ["name"]},
            {"id": "list_create_items", "label": "Create list with", "template": "{name} = [{items}]", "inputs": ["name", "items"]},
            {"id": "list_append", "label": "Add to list", "template": "{name}.append({value})", "inputs": ["name", "value"]},
            {"id": "list_get", "label": "Get item at", "template": "{name}[{index}]", "inputs": ["name", "index"], "is_expression": True},
            {"id": "list_set", "label": "Set item at", "template": "{name}[{index}] = {value}", "inputs": ["name", "index", "value"]},
            {"id": "list_length", "label": "Length of list", "template": "len({name})", "inputs": ["name"], "is_expression": True},
            {"id": "list_for", "label": "For each in list", "template": "for {item} in {list}:", "inputs": ["item", "list"], "accepts_children": True},
            {"id": "list_remove", "label": "Remove from list", "template": "{name}.remove({value})", "inputs": ["name", "value"]},
        ]
    },
    "functions": {
        "color": "#f97316",
        "icon": "fn",
        "blocks": [
            {"id": "func_abs", "label": "Absolute value", "template": "abs({value})", "inputs": ["value"], "is_expression": True},
            {"id": "func_max", "label": "Maximum", "template": "max({a}, {b})", "inputs": ["a", "b"], "is_expression": True},
            {"id": "func_min", "label": "Minimum", "template": "min({a}, {b})", "inputs": ["a", "b"], "is_expression": True},
            {"id": "func_round", "label": "Round", "template": "round({value})", "inputs": ["value"], "is_expression": True},
            {"id": "func_int", "label": "Convert to int", "template": "int({value})", "inputs": ["value"], "is_expression": True},
            {"id": "func_str", "label": "Convert to string", "template": "str({value})", "inputs": ["value"], "is_expression": True},
            {"id": "func_sum", "label": "Sum of list", "template": "sum({list})", "inputs": ["list"], "is_expression": True},
        ]
    }
}

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip().lower()
        password = request.form.get('password', '')
        password_hash = hash_password(password)

        # Check admin credentials
        if username == ADMIN_USERNAME and password_hash == ADMIN_PASSWORD_HASH:
            session['user'] = username
            session['is_admin'] = True
            flash('Welcome, Admin!', 'success')
            return redirect(url_for('home'))

        # Check regular users
        users = load_users()
        if users and username in users:
            stored_password = users[username].get('password', '')
            if stored_password == password_hash:
                session['user'] = username
                session['is_admin'] = False
                flash(f'Welcome back, {username}!', 'success')
                return redirect(url_for('home'))

        flash('Invalid username or password', 'error')

    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        try:
            username = request.form.get('username', '').strip().lower()
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')

            # Validation
            if len(username) < 3:
                flash('Username must be at least 3 characters', 'error')
                return render_template('signup.html')

            if len(password) < 6:
                flash('Password must be at least 6 characters', 'error')
                return render_template('signup.html')

            if password != confirm_password:
                flash('Passwords do not match', 'error')
                return render_template('signup.html')

            if username == ADMIN_USERNAME:
                flash('This username is reserved', 'error')
                return render_template('signup.html')

            users = load_users()
            if users is None:
                users = {}

            if username in users:
                flash('Username already exists', 'error')
                return render_template('signup.html')

            # Create user
            users[username] = {
                'password': hash_password(password),
                'created_at': str(datetime.datetime.now())
            }
            save_users(users)

            # Auto login after signup
            session['user'] = username
            session['is_admin'] = False
            flash('Account created successfully!', 'success')
            return redirect(url_for('home'))
        except Exception as e:
            print(f"Signup error: {e}")
            flash('An error occurred. Please try again.', 'error')
            return render_template('signup.html')

    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'success')
    return redirect(url_for('login'))

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/dashboard')
@login_required
def dashboard():
    username = session.get('user')
    users = load_users()

    # Get member since date
    member_since = 'Recently'
    if username in users and 'created_at' in users[username]:
        try:
            created = datetime.datetime.fromisoformat(users[username]['created_at'].split('.')[0])
            member_since = created.strftime('%B %d, %Y')
        except:
            pass

    # Get progress data
    progress = get_user_progress(username)

    # Get recent activities
    activities = progress.get('activities', [])

    return render_template('dashboard.html',
                         username=username,
                         member_since=member_since,
                         progress=progress,
                         activities=activities)

@app.route('/coding')
@login_required
def coding():
    if session.get('user'):
        update_user_progress(session['user'], 'coding', 'visit')
    return render_template('index.html', categories=BLOCK_CATEGORIES)

@app.route('/workflows')
@login_required
def workflows():
    if session.get('user'):
        update_user_progress(session['user'], 'workflow', 'visit')
    return render_template('workflows.html')

@app.route('/git')
@login_required
def git():
    if session.get('user'):
        update_user_progress(session['user'], 'git', 'visit')
    return render_template('git.html')

@app.route('/ai-academy')
@login_required
def ai_academy():
    if session.get('user'):
        update_user_progress(session['user'], 'academy', 'visit')
    return render_template('ai-academy.html')

@app.route('/api/track-progress', methods=['POST'])
@login_required
def track_progress():
    """API endpoint to track exercise completion"""
    data = request.json
    course = data.get('course')
    action = data.get('action', 'exercise')

    if session.get('user') and course:
        update_user_progress(session['user'], course, action)
        return jsonify({'success': True})

    return jsonify({'success': False}), 400

@app.route('/admin')
@admin_required
def admin_dashboard():
    users = load_users()
    return render_template('admin.html', users=users)

# Projects routes
@app.route('/projects')
def projects():
    return render_template('projects.html')

@app.route('/projects/website-tutorial')
def website_tutorial():
    return render_template('website-tutorial.html')

@app.route('/projects/submit-idea', methods=['POST'])
def submit_idea():
    try:
        name = request.form.get('name', 'Anonymous').strip() or 'Anonymous'
        idea = request.form.get('idea', '').strip()
        skill_level = request.form.get('skill_level', 'beginner')

        if not idea:
            flash('Please enter a project idea.', 'error')
            return redirect(url_for('projects'))

        # Load existing ideas
        ideas = load_project_ideas()

        # Add new idea
        ideas.append({
            'name': name,
            'idea': idea,
            'skill_level': skill_level,
            'submitted_at': str(datetime.datetime.now()),
            'user': session.get('user', 'guest')
        })

        # Save ideas
        save_project_ideas(ideas)

        flash('Thank you! Your idea has been submitted.', 'success')
        return redirect(url_for('projects'))
    except Exception as e:
        print(f"Submit idea error: {e}")
        flash('An error occurred. Please try again.', 'error')
        return redirect(url_for('projects'))

@app.route('/admin/ideas')
@admin_required
def admin_ideas():
    ideas = load_project_ideas()
    return render_template('admin-ideas.html', ideas=ideas)

def load_project_ideas():
    """Load project ideas from Upstash Redis or file"""
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            ideas_data = redis_get('trustai_project_ideas')
            if ideas_data:
                return json.loads(ideas_data)
            return []
        except Exception as e:
            print(f"Redis load ideas error: {e}")

    # Fallback to file
    try:
        if os.path.exists('project_ideas.json'):
            with open('project_ideas.json', 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"File load ideas error: {e}")

    return []

def save_project_ideas(ideas):
    """Save project ideas to Upstash Redis or file"""
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            if redis_set('trustai_project_ideas', json.dumps(ideas)):
                return
        except Exception as e:
            print(f"Redis save ideas error: {e}")

    # Fallback to file
    try:
        with open('project_ideas.json', 'w') as f:
            json.dump(ideas, f)
    except Exception as e:
        print(f"File save ideas error: {e}")

@app.route('/api/blocks')
@login_required
def get_blocks():
    return jsonify(BLOCK_CATEGORIES)

@app.route('/api/execute', methods=['POST'])
def execute_code():
    code = request.json.get('code', '')

    # Capture output
    old_stdout = sys.stdout
    sys.stdout = StringIO()

    result = {
        'success': True,
        'output': [],
        'error': None,
        'variables': {},
        'steps': []
    }

    try:
        # Create a restricted execution environment
        local_vars = {}

        # Execute line by line for step tracking
        lines = code.split('\n')
        line_num = 0

        # Execute the full code
        exec(code, {"__builtins__": {
            'print': print,
            'input': lambda x='': x,
            'range': range,
            'len': len,
            'int': int,
            'float': float,
            'str': str,
            'abs': abs,
            'min': min,
            'max': max,
            'sum': sum,
            'True': True,
            'False': False,
            'None': None,
        }}, local_vars)

        # Generate step info for animation
        for i, line in enumerate(lines):
            if line.strip() and not line.strip().startswith('#'):
                result['steps'].append({'line': i + 1, 'code': line})

        # Get output
        output = sys.stdout.getvalue()
        if output:
            result['output'] = output.strip().split('\n')

        # Filter variables for display
        for name, value in local_vars.items():
            if not name.startswith('_'):
                result['variables'][name] = repr(value)

    except Exception as e:
        result['success'] = False
        result['error'] = str(e)

    finally:
        sys.stdout = old_stdout

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=8080)
