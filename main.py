from flask import Flask, render_template, jsonify, request
import sys
from io import StringIO

app = Flask(__name__)

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
        ]
    },
    "control": {
        "color": "#f59e0b",
        "icon": "↻",
        "blocks": [
            {"id": "if_block", "label": "If", "template": "if {condition}:", "inputs": ["condition"], "accepts_children": True},
            {"id": "if_else_block", "label": "If-Else", "template": "if {condition}:", "inputs": ["condition"], "accepts_children": True, "has_else": True},
            {"id": "repeat_times", "label": "Repeat times", "template": "for _ in range({times}):", "inputs": ["times"], "accepts_children": True},
            {"id": "while_block", "label": "While", "template": "while {condition}:", "inputs": ["condition"], "accepts_children": True},
        ]
    },
    "output": {
        "color": "#10b981",
        "icon": "⎙",
        "blocks": [
            {"id": "print_msg", "label": "Print", "template": "print({message})", "inputs": ["message"]},
            {"id": "print_input", "label": "Input", "template": "{name} = input({prompt})", "inputs": ["name", "prompt"]},
        ]
    },
    "operators": {
        "color": "#3b82f6",
        "icon": "+",
        "blocks": [
            {"id": "compare", "label": "Compare", "template": "{a} {op} {b}", "inputs": ["a", "op", "b"], "is_expression": True},
        ]
    }
}

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/coding')
def coding():
    return render_template('index.html', categories=BLOCK_CATEGORIES)

@app.route('/workflows')
def workflows():
    return render_template('workflows.html')

@app.route('/git')
def git():
    return render_template('git.html')

@app.route('/api/blocks')
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
