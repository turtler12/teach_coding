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

@app.route('/ai-academy')
def ai_academy():
    return render_template('ai-academy.html')

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
