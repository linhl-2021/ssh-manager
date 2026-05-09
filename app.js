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
                    <button class="btn btn-small btn-primary" onclick="generateShortcut('${config.id}')">生成快捷指令</button>
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
    
    let configText = `📱 ${config.name} 配置信息：

【SSH连接】
主机：${config.host}
端口：${config.port}
用户：${config.username}
${config.password ? `密码：${config.password}` : '密码：(留空)'}
`;

    if (commands.length > 0) {
        configText += `
【执行命令】
`;
        commands.forEach((cmd, index) => {
            configText += `${index + 1}. ${cmd}
`;
        });
    }

    let instructions = `📱 创建步骤：

1️⃣ 点击下方按钮"复制配置"
2️⃣ 打开"快捷指令"应用
3️⃣ 点击"+"创建新快捷指令
4️⃣ 搜索并添加"SSH"动作
5️⃣ 粘贴配置信息填写
6️⃣ 添加"执行SSH命令"动作（如有命令）
7️⃣ 重命名为"${config.name}"
8️⃣ 点击"完成"保存

✨ 配置信息已准备好！`;

    showShortcutModal(config.name, configText, instructions);
}

function showShortcutModal(name, configText, instructions) {
    let modal = document.getElementById('shortcutModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shortcutModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="shortcutModalTitle">创建快捷指令</h2>
                    <button class="close-btn" onclick="closeShortcutModal()">&times;</button>
                </div>
                <div class="shortcut-instructions" id="shortcutInstructions"></div>
                <div class="shortcut-config" id="shortcutConfig"></div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="closeShortcutModal()">关闭</button>
                    <button class="btn btn-primary" onclick="copyShortcutConfig()">复制配置</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('shortcutModalTitle').textContent = `创建"${name}"快捷指令`;
    document.getElementById('shortcutInstructions').textContent = instructions;
    document.getElementById('shortcutConfig').innerHTML = `<pre>${configText}</pre>`;
    modal.classList.add('active');
    window.currentConfigText = configText;
}

function closeShortcutModal() {
    document.getElementById('shortcutModal').classList.remove('active');
}

function copyShortcutConfig() {
    const text = window.currentConfigText;
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ 配置已复制到剪贴板！');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('✅ 配置已复制到剪贴板！');
    });
}

window.editConfig = editConfig;
window.deleteConfig = deleteConfig;
window.generateShortcut = generateShortcut;
window.closeShortcutModal = closeShortcutModal;
window.copyShortcutConfig = copyShortcutConfig;

init();