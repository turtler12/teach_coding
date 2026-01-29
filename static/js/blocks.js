/**
 * TrustAI - Interactive Block-based Coding Interface
 * Click to add blocks, drag to reorder within workspace
 */

class TrustAIApp {
    constructor() {
        this.workspace = document.getElementById('workspace');
        this.dropHint = document.getElementById('dropHint');
        this.codeDisplay = document.getElementById('generatedCode');
        this.consoleOutput = document.getElementById('consoleOutput');
        this.variablesDisplay = document.getElementById('variablesDisplay');
        this.blocks = [];
        this.blockIdCounter = 0;
        this.isExecuting = false;
        this.draggedBlockId = null;
        this.selectedContainer = null; // Track which container to add blocks to

        this.init();
    }

    init() {
        this.setupCategoryToggles();
        this.setupPaletteBlocks();
        this.setupButtons();
        this.setupWorkspaceDragDrop();
        this.updateCodeDisplay();
    }

    // Category accordion toggles
    setupCategoryToggles() {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const category = header.closest('.category');
                category.classList.toggle('expanded');
            });
            // Expand ALL categories by default so blocks are visible
            header.closest('.category').classList.add('expanded');
        });
    }

    // Setup click handlers on palette blocks
    setupPaletteBlocks() {
        const self = this;
        document.querySelectorAll('.block-template').forEach(template => {
            template.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log('Block clicked:', template.dataset.blockId);
                self.addBlockFromTemplate(template);
            };
        });
    }

    addBlockFromTemplate(template) {
        const blockData = {
            blockId: template.dataset.blockId,
            template: template.dataset.template,
            inputs: JSON.parse(template.dataset.inputs),
            acceptsChildren: template.dataset.acceptsChildren === 'true',
            hasElse: template.dataset.hasElse === 'true',
            isExpression: template.dataset.isExpression === 'true',
            color: getComputedStyle(template).getPropertyValue('--block-color').trim()
        };

        const block = this.createBlock(blockData);

        // If a container is selected, add to that container
        if (this.selectedContainer) {
            const { parentId, isElse } = this.selectedContainer;
            const parent = this.findBlockById(parentId);
            if (parent) {
                if (isElse) {
                    parent.elseChildren.push(block);
                } else {
                    parent.children.push(block);
                }
            }
        } else {
            // Add to main workspace
            this.blocks.push(block);
        }

        // Visual feedback
        template.style.transform = 'scale(0.95)';
        template.style.opacity = '0.7';
        setTimeout(() => {
            template.style.transform = '';
            template.style.opacity = '';
        }, 150);

        this.renderWorkspace();
        this.updateCodeDisplay();
    }

    findBlockById(blockId, blocks = this.blocks) {
        for (let block of blocks) {
            if (block.id === blockId) return block;
            if (block.children) {
                const found = this.findBlockById(blockId, block.children);
                if (found) return found;
            }
            if (block.elseChildren) {
                const found = this.findBlockById(blockId, block.elseChildren);
                if (found) return found;
            }
        }
        return null;
    }

    selectContainer(parentId, isElse) {
        // Clear previous selection
        document.querySelectorAll('.block-children.selected').forEach(el => {
            el.classList.remove('selected');
        });

        this.selectedContainer = { parentId, isElse };
    }

    clearContainerSelection() {
        document.querySelectorAll('.block-children.selected').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedContainer = null;
    }

    createBlock(data) {
        return {
            id: `block_${this.blockIdCounter++}`,
            type: data.blockId,
            template: data.template,
            inputs: data.inputs.reduce((acc, input) => {
                acc[input] = this.getDefaultValue(input);
                return acc;
            }, {}),
            acceptsChildren: data.acceptsChildren,
            hasElse: data.hasElse,
            isExpression: data.isExpression,
            color: data.color,
            children: [],
            elseChildren: []
        };
    }

    getDefaultValue(inputName) {
        const defaults = {
            'name': 'x',
            'value': '0',
            'condition': 'x > 0',
            'times': '5',
            'message': '"Hello!"',
            'a': '1',
            'b': '2',
            'op': '==',
            'prompt': '"Enter value: "',
            'item': 'item',
            'list': 'myList',
            'index': '0'
        };
        return defaults[inputName] || '';
    }

    // Setup workspace for drag reordering
    setupWorkspaceDragDrop() {
        this.workspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        this.workspace.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedBlockId) {
                // Reordering is handled by individual block drop handlers
            }
        });

        // Click on workspace clears container selection
        this.workspace.addEventListener('click', (e) => {
            if (e.target === this.workspace || e.target === this.dropHint) {
                this.clearContainerSelection();
            }
        });
    }

    removeBlock(blockId) {
        const removeFromBlocks = (blocks) => {
            const index = blocks.findIndex(b => b.id === blockId);
            if (index !== -1) {
                blocks.splice(index, 1);
                return true;
            }
            for (let b of blocks) {
                if (b.children && removeFromBlocks(b.children)) return true;
                if (b.elseChildren && removeFromBlocks(b.elseChildren)) return true;
            }
            return false;
        };
        removeFromBlocks(this.blocks);
        this.renderWorkspace();
        this.updateCodeDisplay();
    }

    findAndRemoveBlock(blockId) {
        let removedBlock = null;

        const removeFromArray = (arr) => {
            const index = arr.findIndex(b => b.id === blockId);
            if (index !== -1) {
                removedBlock = arr.splice(index, 1)[0];
                return true;
            }
            for (let b of arr) {
                if (b.children && removeFromArray(b.children)) return true;
                if (b.elseChildren && removeFromArray(b.elseChildren)) return true;
            }
            return false;
        };

        removeFromArray(this.blocks);
        return removedBlock;
    }

    moveBlock(blockId, targetIndex) {
        const block = this.findAndRemoveBlock(blockId);
        if (block) {
            this.blocks.splice(targetIndex, 0, block);
            this.renderWorkspace();
            this.updateCodeDisplay();
        }
    }

    moveBlockToParent(blockId, parentId, isElse = false) {
        const block = this.findAndRemoveBlock(blockId);
        if (!block) return;

        const findParent = (blocks) => {
            for (let b of blocks) {
                if (b.id === parentId) {
                    if (isElse) {
                        b.elseChildren.push(block);
                    } else {
                        b.children.push(block);
                    }
                    return true;
                }
                if (b.children && findParent(b.children)) return true;
                if (b.elseChildren && findParent(b.elseChildren)) return true;
            }
            return false;
        };

        findParent(this.blocks);
        this.renderWorkspace();
        this.updateCodeDisplay();
    }

    // Render the workspace
    renderWorkspace() {
        // Clear existing blocks (keep hint)
        const existingBlocks = this.workspace.querySelectorAll('.workspace-block');
        existingBlocks.forEach(b => b.remove());

        // Show/hide hint
        this.dropHint.classList.toggle('hidden', this.blocks.length > 0);

        // Render all blocks
        this.blocks.forEach((block, index) => {
            const blockEl = this.renderBlock(block, index);
            this.workspace.appendChild(blockEl);
        });
    }

    renderBlock(block, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'workspace-block';
        wrapper.dataset.id = block.id;
        wrapper.dataset.index = index;
        wrapper.draggable = true;

        // Drag handlers for reordering
        wrapper.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            this.draggedBlockId = block.id;
            wrapper.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', block.id);
        });

        wrapper.addEventListener('dragend', () => {
            wrapper.classList.remove('dragging');
            this.draggedBlockId = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.draggedBlockId && this.draggedBlockId !== block.id) {
                wrapper.classList.add('drag-over');
            }
        });

        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('drag-over');
        });

        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            wrapper.classList.remove('drag-over');

            if (this.draggedBlockId && this.draggedBlockId !== block.id) {
                const currentIndex = this.blocks.findIndex(b => b.id === block.id);
                this.moveBlock(this.draggedBlockId, currentIndex);
            }
        });

        const content = document.createElement('div');
        content.className = 'block-content';
        content.style.setProperty('--block-color', block.color);

        // Drag handle
        const handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.innerHTML = '⋮⋮';
        content.appendChild(handle);

        // Build block content with inputs
        const parts = this.parseTemplate(block.template);
        parts.forEach(part => {
            if (part.type === 'text') {
                const span = document.createElement('span');
                span.textContent = part.value;
                content.appendChild(span);
            } else if (part.type === 'input') {
                if (part.value === 'op') {
                    const select = document.createElement('select');
                    select.className = 'block-select';
                    ['==', '!=', '<', '>', '<=', '>='].forEach(op => {
                        const option = document.createElement('option');
                        option.value = op;
                        option.textContent = op;
                        if (block.inputs[part.value] === op) option.selected = true;
                        select.appendChild(option);
                    });
                    select.addEventListener('change', (e) => {
                        block.inputs[part.value] = e.target.value;
                        this.updateCodeDisplay();
                    });
                    select.addEventListener('mousedown', (e) => e.stopPropagation());
                    content.appendChild(select);
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'block-input';
                    input.value = block.inputs[part.value] || '';
                    input.placeholder = part.value;
                    input.addEventListener('input', (e) => {
                        block.inputs[part.value] = e.target.value;
                        this.updateCodeDisplay();
                    });
                    input.addEventListener('mousedown', (e) => e.stopPropagation());
                    content.appendChild(input);
                }
            }
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-block';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeBlock(block.id);
        });
        content.appendChild(deleteBtn);

        wrapper.appendChild(content);

        // Children container for control structures
        if (block.acceptsChildren) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'block-children';
            childrenContainer.style.setProperty('--block-color', block.color);

            if (block.children.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.className = 'block-children-placeholder';
                placeholder.textContent = 'Click to select, then click a block';
                childrenContainer.appendChild(placeholder);
            } else {
                block.children.forEach((child, i) => {
                    childrenContainer.appendChild(this.renderBlock(child, i));
                });
            }

            // Click to select this container for adding blocks
            childrenContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearContainerSelection();
                childrenContainer.classList.add('selected');
                this.selectContainer(block.id, false);
            });

            // Drop zone for children
            childrenContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                childrenContainer.classList.add('drop-target');
            });

            childrenContainer.addEventListener('dragleave', (e) => {
                if (!childrenContainer.contains(e.relatedTarget)) {
                    childrenContainer.classList.remove('drop-target');
                }
            });

            childrenContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                childrenContainer.classList.remove('drop-target');

                if (this.draggedBlockId) {
                    this.moveBlockToParent(this.draggedBlockId, block.id, false);
                }
            });

            wrapper.appendChild(childrenContainer);

            // Else section
            if (block.hasElse) {
                const elseLabel = document.createElement('div');
                elseLabel.className = 'else-label';
                elseLabel.style.setProperty('--block-color', block.color);
                elseLabel.textContent = 'else:';
                wrapper.appendChild(elseLabel);

                const elseContainer = document.createElement('div');
                elseContainer.className = 'block-children else-children';
                elseContainer.style.setProperty('--block-color', block.color);

                if (block.elseChildren.length === 0) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'block-children-placeholder';
                    placeholder.textContent = 'Click to select, then click a block';
                    elseContainer.appendChild(placeholder);
                } else {
                    block.elseChildren.forEach((child, i) => {
                        elseContainer.appendChild(this.renderBlock(child, i));
                    });
                }

                // Click to select this container for adding blocks
                elseContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.clearContainerSelection();
                    elseContainer.classList.add('selected');
                    this.selectContainer(block.id, true);
                });

                // Drop zone for else children
                elseContainer.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    elseContainer.classList.add('drop-target');
                });

                elseContainer.addEventListener('dragleave', (e) => {
                    if (!elseContainer.contains(e.relatedTarget)) {
                        elseContainer.classList.remove('drop-target');
                    }
                });

                elseContainer.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    elseContainer.classList.remove('drop-target');

                    if (this.draggedBlockId) {
                        this.moveBlockToParent(this.draggedBlockId, block.id, true);
                    }
                });

                wrapper.appendChild(elseContainer);
            }
        }

        return wrapper;
    }

    parseTemplate(template) {
        const parts = [];
        const regex = /\{(\w+)\}/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(template)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', value: template.slice(lastIndex, match.index) });
            }
            parts.push({ type: 'input', value: match[1] });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < template.length) {
            parts.push({ type: 'text', value: template.slice(lastIndex) });
        }

        return parts;
    }

    // Code Generation
    generateCode() {
        const lines = [];

        const generateBlockCode = (block, indent = 0) => {
            const indentStr = '    '.repeat(indent);
            let code = block.template;

            // Replace placeholders with actual values
            for (const [key, value] of Object.entries(block.inputs)) {
                code = code.replace(`{${key}}`, value);
            }

            lines.push(indentStr + code);

            // Generate children code
            if (block.children && block.children.length > 0) {
                block.children.forEach(child => {
                    generateBlockCode(child, indent + 1);
                });
            } else if (block.acceptsChildren) {
                lines.push(indentStr + '    pass');
            }

            // Generate else children
            if (block.hasElse) {
                lines.push(indentStr + 'else:');
                if (block.elseChildren && block.elseChildren.length > 0) {
                    block.elseChildren.forEach(child => {
                        generateBlockCode(child, indent + 1);
                    });
                } else {
                    lines.push(indentStr + '    pass');
                }
            }
        };

        this.blocks.forEach(block => {
            generateBlockCode(block);
        });

        return lines.join('\n');
    }

    updateCodeDisplay() {
        const code = this.generateCode();
        if (!code.trim()) {
            this.codeDisplay.textContent = '# Your code will appear here';
            return;
        }

        // Display plain code without HTML formatting
        this.codeDisplay.textContent = code;
    }

    // Buttons
    setupButtons() {
        document.getElementById('runBtn').addEventListener('click', () => this.runCode());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearWorkspace());
        document.getElementById('clearOutput').addEventListener('click', () => this.clearOutput());
        document.getElementById('loadExampleBtn').addEventListener('click', () => this.loadExample());
    }

    // Load example with interactive tutorial
    loadExample() {
        // Clear existing blocks
        this.clearWorkspace();
        this.clearOutput();

        // Show tutorial modal
        this.showTutorial();
    }

    showTutorial() {
        // Create tutorial overlay
        const overlay = document.createElement('div');
        overlay.id = 'tutorialOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a2e;
            border-radius: 16px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            border: 1px solid #333;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        `;

        modal.innerHTML = `
            <h2 style="color: #38bdf8; margin-bottom: 8px; font-size: 1.5em;">🎓 Interactive Tutorial</h2>
            <p style="color: #888; margin-bottom: 24px;">Learn to build a "Guess the Number" game!</p>

            <div style="background: #252540; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #10b981; margin-bottom: 12px; font-size: 1.1em;">What you'll learn:</h3>
                <ul style="color: #ccc; margin-left: 20px; line-height: 1.8;">
                    <li>Creating and using <strong style="color: #8b5cf6;">variables</strong></li>
                    <li>Using <strong style="color: #f59e0b;">loops</strong> to repeat actions</li>
                    <li>Making decisions with <strong style="color: #f59e0b;">if-else</strong></li>
                    <li>Using <strong style="color: #ec4899;">comparison operators</strong></li>
                    <li>Displaying output with <strong style="color: #10b981;">print</strong></li>
                </ul>
            </div>

            <div style="background: #252540; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #f59e0b; margin-bottom: 12px; font-size: 1.1em;">The Program:</h3>
                <p style="color: #ccc; line-height: 1.6;">
                    We'll create a number guessing game that:
                </p>
                <ol style="color: #ccc; margin-left: 20px; margin-top: 12px; line-height: 1.8;">
                    <li>Sets a secret number (7)</li>
                    <li>Lets you guess 3 times</li>
                    <li>Tells you if you're too high, too low, or correct!</li>
                </ol>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="tutorialSkip" style="
                    padding: 12px 24px;
                    background: #333;
                    color: #ccc;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1em;
                ">Skip Tutorial</button>
                <button id="tutorialStart" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: 600;
                ">Start Tutorial →</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Button handlers
        document.getElementById('tutorialSkip').onclick = () => {
            overlay.remove();
            this.loadExampleDirect();
        };

        document.getElementById('tutorialStart').onclick = () => {
            overlay.remove();
            this.runTutorialSteps();
        };
    }

    async runTutorialSteps() {
        // Clear and show tutorial progress
        this.clearOutput();
        this.appendOutput('🎓 TUTORIAL MODE', 'success');
        this.appendOutput('Watch as we build the program step by step...', 'muted');
        this.appendOutput('─'.repeat(40), 'muted');

        const delay = async (ms) => new Promise(r => setTimeout(r, ms));

        const showStep = async (message, detail) => {
            this.appendOutput('', 'muted');
            this.appendOutput(message, 'success');
            this.appendOutput(`   ${detail}`, 'muted');
            await delay(400);
        };

        // Step 1: Create secret number
        await showStep('📦 Step 1: Create the secret number (7)', 'This stores our secret number in a variable called "secret"');
        this.clearContainerSelection();
        this.addBlockById('var_create', { name: 'secret', value: '7' });
        await delay(600);

        // Step 2: Create guess variable
        await showStep('📦 Step 2: Create a variable for the guess', 'We\'ll update this variable each round');
        this.clearContainerSelection();
        this.addBlockById('var_create', { name: 'guess', value: '0' });
        await delay(600);

        // Step 3: Print welcome message
        await showStep('💬 Step 3: Print instructions to the player', 'Always tell users what to do!');
        this.clearContainerSelection();
        this.addBlockById('print_msg', { message: '"Guess a number 1-10!"' });
        await delay(600);

        // Step 4: Create loop
        await showStep('🔄 Step 4: Create a loop for 3 guesses', 'The player gets 3 chances to guess correctly');
        this.clearContainerSelection();
        const loopBlock = this.addBlockById('repeat_times', { times: '3' });
        await delay(600);

        // Step 5: Inside loop - change guess
        await showStep('   ↳ Step 5: Inside loop - simulate a guess', 'Each loop iteration, guess increases: 5, 6, 7');
        this.selectContainer(loopBlock.id, false);
        this.addBlockById('var_change', { name: 'guess', value: '1' });
        await delay(600);

        // Step 6: Print guessing message
        await showStep('   ↳ Step 6: Print the current guess', 'Show the player what we\'re guessing');
        this.selectContainer(loopBlock.id, false);
        this.addBlockById('var_print', { name: 'guess' });
        await delay(600);

        // Step 7: If-else to check guess
        await showStep('   ↳ Step 7: Check if guess equals secret', 'This is where the magic happens!');
        this.selectContainer(loopBlock.id, false);
        const ifBlock = this.addBlockById('if_else_block', { condition: 'guess == 7' });
        await delay(600);

        // Step 8: If correct - print win
        await showStep('      ↳ Step 8: If correct - celebrate!', 'Print a winning message');
        this.selectContainer(ifBlock.id, false);
        this.addBlockById('print_msg', { message: '"Correct! You win!"' });
        await delay(600);

        // Step 9: Else - print try again
        await showStep('      ↳ Step 9: Else - encourage them', 'Keep them motivated to try again');
        this.selectContainer(ifBlock.id, true);
        this.addBlockById('print_msg', { message: '"Not yet, keep trying!"' });
        await delay(600);

        // Clear selection and finalize
        this.clearContainerSelection();
        this.renderWorkspace();
        this.updateCodeDisplay();

        // Final message
        this.appendOutput('', 'muted');
        this.appendOutput('─'.repeat(40), 'muted');
        this.appendOutput('✅ Tutorial complete!', 'success');
        this.appendOutput('Click "▶ Run Code" to see it work!', 'muted');
        this.appendOutput('', 'muted');
        this.appendOutput('💡 Try modifying the code:', 'muted');
        this.appendOutput('   • Change the secret number', 'muted');
        this.appendOutput('   • Add more guesses', 'muted');
        this.appendOutput('   • Change the messages', 'muted');
    }

    // Helper to add block by ID with values
    addBlockById(blockId, values = {}) {
        const template = document.querySelector(`[data-block-id="${blockId}"]`);
        if (!template) return null;

        const blockData = {
            blockId: template.dataset.blockId,
            template: template.dataset.template,
            inputs: JSON.parse(template.dataset.inputs),
            acceptsChildren: template.dataset.acceptsChildren === 'true',
            hasElse: template.dataset.hasElse === 'true',
            isExpression: template.dataset.isExpression === 'true',
            color: getComputedStyle(template).getPropertyValue('--block-color').trim()
        };

        const block = this.createBlock(blockData);

        // Apply custom values
        if (values) {
            Object.entries(values).forEach(([key, value]) => {
                block.inputs[key] = value;
            });
        }

        // If a container is selected, add to that container
        if (this.selectedContainer) {
            const { parentId, isElse } = this.selectedContainer;
            const parent = this.findBlockById(parentId);
            if (parent) {
                if (isElse) {
                    parent.elseChildren.push(block);
                } else {
                    parent.children.push(block);
                }
            }
        } else {
            // Add to main workspace
            this.blocks.push(block);
        }

        this.renderWorkspace();
        this.updateCodeDisplay();
        return block;
    }

    // Load example directly without tutorial
    loadExampleDirect() {
        this.clearWorkspace();

        // Build the guessing game
        this.clearContainerSelection();
        this.addBlockById('var_create', { name: 'secret', value: '7' });

        this.clearContainerSelection();
        this.addBlockById('var_create', { name: 'guess', value: '0' });

        this.clearContainerSelection();
        this.addBlockById('print_msg', { message: '"Guess a number 1-10!"' });

        this.clearContainerSelection();
        const loopBlock = this.addBlockById('repeat_times', { times: '3' });

        // Inside the loop
        this.selectContainer(loopBlock.id, false);
        this.addBlockById('var_change', { name: 'guess', value: '1' });

        this.selectContainer(loopBlock.id, false);
        this.addBlockById('var_print', { name: 'guess' });

        this.selectContainer(loopBlock.id, false);
        const ifBlock = this.addBlockById('if_else_block', { condition: 'guess == 7' });

        // Inside if (correct guess)
        this.selectContainer(ifBlock.id, false);
        this.addBlockById('print_msg', { message: '"Correct! You win!"' });

        // Inside else (wrong guess)
        this.selectContainer(ifBlock.id, true);
        this.addBlockById('print_msg', { message: '"Not yet, keep trying!"' });

        this.clearContainerSelection();
        this.renderWorkspace();
        this.updateCodeDisplay();

        this.clearOutput();
        this.appendOutput('📦 Example loaded: Number Guessing Game', 'success');
        this.appendOutput('Click "▶ Run Code" to play!', 'muted');
    }

    async runCode() {
        if (this.isExecuting) return;

        const code = this.generateCode();
        if (!code.trim()) {
            this.showError('No code to run. Add some blocks first!');
            return;
        }

        this.isExecuting = true;
        this.clearOutput();

        // Reset all line highlights
        document.querySelectorAll('.code-line').forEach(line => {
            line.classList.remove('executing', 'executed');
        });

        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const result = await response.json();

            // Animate execution
            await this.animateExecution(result);

            if (result.success) {
                // Show output
                if (result.output && result.output.length > 0) {
                    result.output.forEach(line => {
                        this.appendOutput(line);
                    });
                } else {
                    this.appendOutput('(No output)', 'muted');
                }

                // Show variables
                this.showVariables(result.variables);
            } else {
                this.showError(result.error);
            }
        } catch (err) {
            this.showError('Failed to execute code: ' + err.message);
        }

        this.isExecuting = false;
    }

    async animateExecution(result) {
        const codeLines = document.querySelectorAll('.code-line');

        for (let i = 0; i < result.steps.length; i++) {
            const step = result.steps[i];
            const lineIndex = step.line - 1;

            if (codeLines[lineIndex]) {
                codeLines[lineIndex].classList.add('executing');
                await this.sleep(400);
                codeLines[lineIndex].classList.remove('executing');
                codeLines[lineIndex].classList.add('executed');
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    appendOutput(text, type = 'normal') {
        const placeholder = this.consoleOutput.querySelector('.console-placeholder');
        if (placeholder) placeholder.remove();

        const line = document.createElement('div');
        line.className = `console-line${type === 'error' ? ' console-error' : ''}`;
        if (type === 'muted') line.style.color = 'var(--text-muted)';
        if (type === 'success') line.style.color = '#10b981';
        line.textContent = text;
        this.consoleOutput.appendChild(line);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
    }

    showError(message) {
        this.appendOutput('Error: ' + message, 'error');
    }

    showVariables(variables) {
        this.variablesDisplay.innerHTML = '';

        if (!variables || Object.keys(variables).length === 0) {
            this.variablesDisplay.innerHTML = '<div class="console-placeholder">No variables</div>';
            return;
        }

        for (const [name, value] of Object.entries(variables)) {
            const item = document.createElement('div');
            item.className = 'variable-item';
            item.innerHTML = `
                <span class="variable-name">${name}</span>
                <span class="variable-value">${value}</span>
            `;
            this.variablesDisplay.appendChild(item);
        }
    }

    clearWorkspace() {
        this.blocks = [];
        this.renderWorkspace();
        this.updateCodeDisplay();
        this.clearOutput();
    }

    clearOutput() {
        this.consoleOutput.innerHTML = '<div class="console-placeholder">Run your code to see output here</div>';
        this.variablesDisplay.innerHTML = '<div class="console-placeholder">Variables will appear here</div>';

        document.querySelectorAll('.code-line').forEach(line => {
            line.classList.remove('executing', 'executed');
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TrustAIApp();
});
