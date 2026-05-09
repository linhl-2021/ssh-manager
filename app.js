const STORAGE_KEY = 'ssh_configs';

let configs = [];

const configList = document.getElementById('configList');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const configForm = document.getElementById('configForm');
const addBtn = document.getElementById('addBtn');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');

function init() {
    loadConfigs();
    renderConfigs();
    bindEvents();
}

function loadConfigs() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        configs = JSON.parse(saved);
    }
}

function saveConfigs() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

function renderConfigs() {
    if (configs.length === 0) {
        configList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔐</div>
                <div class="empty-state-text">暂无SSH配置<br>点击上方按钮添加</div>
            </div>
        `;
        return;
    }

    configList.innerHTML = configs.map(config => `
        <div class="config-card" data-id="${config.id}">
            <div class="config-header">
                <div class="config-name">${escapeHtml(config.name)}</div>
                <div class="config-actions">
                    <button class="btn btn-small btn-primary" onclick="generateShortcut('${config.id}')">下载快捷指令</button>
                    <button class="btn btn-small btn-secondary" onclick="editConfig('${config.id}')">编辑</button>
                    <button class="btn btn-small btn-danger" onclick="deleteConfig('${config.id}')">删除</button>
                </div>
            </div>
            <div class="config-details">
                <div><span class="config-host">${escapeHtml(config.username)}@${escapeHtml(config.host)}:${config.port}</span></div>
            </div>
            ${config.commands ? `
                <div class="config-commands">
                    <div class="config-commands-title">执行命令：</div>
                    <div class="command-list">${escapeHtml(config.commands)}</div>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openModal(title = '添加SSH配置', config = null) {
    modalTitle.textContent = title;
    configForm.reset();

    if (config) {
        document.getElementById('configId').value = config.id;
        document.getElementById('configName').value = config.name;
        document.getElementById('host').value = config.host;
        document.getElementById('port').value = config.port;
        document.getElementById('username').value = config.username;
        document.getElementById('password').value = config.password || '';
        document.getElementById('commands').value = config.commands || '';
    } else {
        document.getElementById('configId').value = '';
        document.getElementById('port').value = '22';
    }

    modal.classList.add('active');
}

function closeModalHandler() {
    modal.classList.remove('active');
}

function addConfig() {
    openModal('添加SSH配置');
}

function editConfig(id) {
    const config = configs.find(c => c.id === id);
    if (config) {
        openModal('编辑SSH配置', config);
    }
}

function deleteConfig(id) {
    if (confirm('确定要删除这个配置吗？')) {
        configs = configs.filter(c => c.id !== id);
        saveConfigs();
        renderConfigs();
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('configId').value;
    const configData = {
        id: id || Date.now().toString(),
        name: document.getElementById('configName').value,
        host: document.getElementById('host').value,
        port: parseInt(document.getElementById('port').value),
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        commands: document.getElementById('commands').value
    };

    if (id) {
        const index = configs.findIndex(c => c.id === id);
        if (index !== -1) {
            configs[index] = configData;
        }
    } else {
        configs.push(configData);
    }

    saveConfigs();
    renderConfigs();
    closeModalHandler();
}

function bindEvents() {
    addBtn.addEventListener('click', addConfig);
    closeModal.addEventListener('click', closeModalHandler);
    cancelBtn.addEventListener('click', closeModalHandler);
    configForm.addEventListener('submit', handleFormSubmit);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalHandler();
        }
    });
}

function generateShortcut(id) {
    const config = configs.find(c => c.id === id);
    if (!config) return;

    const commands = config.commands ? config.commands.split('\n').filter(c => c.trim()) : [];

    const shortcut = createShortcutJSON(config, commands);
    const blob = new Blob([shortcut], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}.shortcut`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✅ "${config.name}.shortcut" 已下载！\n\n下一步：\n1. 打开"文件"应用找到下载的文件\n2. 点击文件自动导入到快捷指令\n3. 或通过AirDrop分享到iOS设备`);
}

function createShortcutJSON(config, commands) {
    const actions = [];

    const sshParams = {
        "WFSSHHost": config.host,
        "WFSSHPort": config.port,
        "WFSSHUser": config.username
    };

    if (config.password) {
        sshParams["WFSSHPassword"] = config.password;
    }

    actions.push({
        "WFWorkflowActionIdentifier": "is.workflow.actions.ssh",
        "WFWorkflowActionParameters": sshParams
    });

    if (commands.length > 0) {
        commands.forEach(cmd => {
            actions.push({
                "WFWorkflowActionIdentifier": "is.workflow.actions.sshexecutesshcommand",
                "WFWorkflowActionParameters": {
                    "WFSSHCommand": cmd
                }
            });
        });
    } else {
        actions.push({
            "WFWorkflowActionIdentifier": "is.workflow.actions.sshexecutesshcommand",
            "WFWorkflowActionParameters": {
                "WFSSHCommand": "echo '连接成功'"
            }
        });
    }

    return JSON.stringify({
        "WFWorkflowActions": actions,
        "WFWorkflowName": config.name,
        "WFWorkflowIcon": {
            "WFWorkflowIconGlyphNumber": 59813,
            "WFWorkflowIconColor": 4980736
        },
        "WFWorkflowTypes": [
            "ActionExtension",
            "Automation",
            "WatchKit"
        ],
        "WFWorkflowMinimumClientVersion": 900
    }, null, 2);
}

window.editConfig = editConfig;
window.deleteConfig = deleteConfig;
window.generateShortcut = generateShortcut;

init();