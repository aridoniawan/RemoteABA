const API_URL = 'https://script.google.com/macros/s/AKfycbwcWrMws1lhl7pQ-likOHpmtXdRYFPZrHsvHEfyS6MsG5bOsini3-HbxgL_y4EkMnOleg/exec';
let clients = [];

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const mainDashboard = document.getElementById('mainDashboard');

const clientList = document.getElementById('clientList');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('addClientModal');
const clientForm = document.getElementById('clientForm');
const modalTitle = document.getElementById('modalTitle');
const submitBtn = clientForm.querySelector('button[type="submit"]');

// --- AUTHENTICATION ---
function checkAuth() {
    const isAuth = sessionStorage.getItem('rustdesk_admin_auth');
    if (isAuth === 'true') {
        loginOverlay.style.display = 'none';
        mainDashboard.style.display = 'block';
        fetchClients();
    } else {
        loginOverlay.style.display = 'flex';
        mainDashboard.style.display = 'none';
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('adminPassword').value;
    if (pass === 'locABA2026') {
        sessionStorage.setItem('rustdesk_admin_auth', 'true');
        loginError.style.display = 'none';
        checkAuth();
    } else {
        loginError.style.display = 'block';
        document.getElementById('adminPassword').value = '';
    }
});

function logout() {
    sessionStorage.removeItem('rustdesk_admin_auth');
    checkAuth();
}

// Fetch and Render Clients
async function fetchClients() {
    clientList.innerHTML = `<tr class="empty-state"><td colspan="5">Memuat data dari Google Sheets... <i class="fa-solid fa-spinner fa-spin"></i></td></tr>`;
    try {
        const response = await fetch(API_URL);
        clients = await response.json();
        renderClients(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        clientList.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Gagal memuat data. Periksa URL Apps Script Anda.</td></tr>`;
    }
}

function renderClients(dataToRender) {
    clientList.innerHTML = '';
    
    if (dataToRender.length === 0) {
        clientList.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">Tidak ada klien ditemukan.</td>
            </tr>`;
        return;
    }

    dataToRender.forEach(client => {
        const date = new Date(client.lastUpdated).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="id-badge">${client.rustdeskId}</span></td>
            <td style="font-weight: 500;">${client.name}</td>
            <td style="color: var(--text-secondary);">${client.notes}</td>
            <td style="color: var(--text-secondary); font-size: 0.9rem;">${date}</td>
            <td class="action-buttons">
                <!-- AUTOMATIC REMOTE BUTTON -->
                <a href="rustdesk://${client.rustdeskId}" class="btn btn-success" title="Remote Client">
                    <i class="fa-solid fa-play"></i> Remote
                </a>
                <button class="btn btn-secondary" onclick="editClient('${client.id}')" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteClient('${client.id}')" title="Hapus">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        clientList.appendChild(tr);
    });
}

// Filter Function
function filterClients() {
    const query = searchInput.value.toLowerCase();
    const filtered = clients.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) || 
        (c.rustdeskId && c.rustdeskId.toString().includes(query)) || 
        (c.notes && c.notes.toLowerCase().includes(query))
    );
    renderClients(filtered);
}

// Modal Handling
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if(modalId === 'addClientModal' && !document.getElementById('clientId').value) {
        modalTitle.textContent = "Tambah Klien Baru";
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    clientForm.reset();
    document.getElementById('clientId').value = '';
    submitBtn.textContent = 'Simpan Klien';
    submitBtn.disabled = false;
}

// Form Submit (Create & Update)
clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.textContent = 'Menyimpan...';
    submitBtn.disabled = true;
    
    const id = document.getElementById('clientId').value;
    const clientData = {
        rustdeskId: document.getElementById('rustdeskId').value,
        name: document.getElementById('clientName').value,
        notes: document.getElementById('clientNotes').value
    };

    try {
        if (id) {
            // Update
            clientData.action = 'update';
            clientData.id = id;
        } else {
            // Create
            clientData.action = 'add';
        }

        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
        
        closeModal('addClientModal');
        fetchClients(); // Refresh data
    } catch (error) {
        alert('Terjadi kesalahan saat menyimpan data ke Google Sheets!');
        submitBtn.textContent = 'Simpan Klien';
        submitBtn.disabled = false;
    }
});

// Edit Function
function editClient(id) {
    const client = clients.find(c => c.id.toString() === id.toString());
    if (!client) return;

    document.getElementById('clientId').value = client.id;
    document.getElementById('rustdeskId').value = client.rustdeskId;
    document.getElementById('clientName').value = client.name;
    document.getElementById('clientNotes').value = client.notes;
    
    modalTitle.textContent = "Edit Klien";
    openModal('addClientModal');
}

// Delete Function
async function deleteClient(id) {
    if (confirm('Apakah Anda yakin ingin menghapus klien ini dari Google Sheets?')) {
        try {
            await fetch(API_URL, { 
                method: 'POST',
                body: JSON.stringify({ action: 'delete', id: id })
            });
            fetchClients(); // Refresh
        } catch (error) {
            alert('Gagal menghapus data.');
        }
    }
}

// Initial Load
checkAuth();
