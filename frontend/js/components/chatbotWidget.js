import { chatbotApi } from '../api/chatbotApi.js';

class CitizenChatbot {
  constructor() {
    this.history = this.loadHistory();
    this.isRecording = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.synth = window.speechSynthesis || null;
    this.currentUtterance = null;
    this.initSpeechRecognition();
  }

  getHistoryKey() {
    try {
      const rawUser = localStorage.getItem('resqai_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const uid = u.id || u.email || u.user_id;
        if (uid) return `resqai_chatbot_history_u_${uid}`;
      }
    } catch (e) {}
    return 'resqai_chatbot_history_v1';
  }

  loadHistory() {
    try {
      const key = this.getHistoryKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.slice(-20) : [];
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
    return [];
  }

  saveHistory() {
    try {
      const key = this.getHistoryKey();
      localStorage.setItem(key, JSON.stringify(this.history.slice(-20)));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  clearHistory() {
    this.history = [];
    const key = this.getHistoryKey();
    localStorage.removeItem(key);
    localStorage.removeItem('resqai_chatbot_history_v1');
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const inputEl = document.getElementById('chat-user-input');
        if (inputEl) {
          inputEl.value = transcript;
        }
        this.stopVoiceInput();
      };

      this.recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        this.stopVoiceInput();
      };

      this.recognition.onend = () => {
        this.stopVoiceInput();
      };
    }
  }

  toggleVoiceInput() {
    if (!this.recognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }
    const btn = document.getElementById('btn-voice-input');
    if (this.isRecording) {
      this.recognition.stop();
      this.stopVoiceInput();
    } else {
      try {
        this.recognition.start();
        this.isRecording = true;
        if (btn) {
          btn.classList.add('active-recording', 'btn-danger');
          btn.classList.remove('btn-outline-secondary');
          btn.innerHTML = '<i class="fa fa-microphone-slash"></i> Listening...';
        }
      } catch (e) {
        console.error('Error starting speech recognition:', e);
        this.stopVoiceInput();
      }
    }
  }

  stopVoiceInput() {
    this.isRecording = false;
    const btn = document.getElementById('btn-voice-input');
    if (btn) {
      btn.classList.remove('active-recording', 'btn-danger');
      btn.classList.add('btn-outline-secondary');
      btn.innerHTML = '<i class="fa fa-microphone"></i>';
    }
  }

  speakText(text) {
    if (!this.synth) return;
    if (this.isSpeaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      return;
    }
    // Clean markdown symbols for speech
    const cleanText = text.replace(/[*#_`~]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };
    this.synth.speak(utterance);
    this.isSpeaking = true;
  }

  formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // escape HTML
      .replace(/^### (.*$)/gim, '<h5 class="fw-bold mt-3 mb-2 text-primary">$1</h5>')
      .replace(/^#### (.*$)/gim, '<h6 class="fw-bold mt-2 mb-1 text-info">$1</h6>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.*$)/gim, '<li class="ms-3">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<div class="step-item mb-1"><span class="badge bg-primary me-2">Step</span>$1</div>');
    return html.replace(/\n/g, '<br>');
  }

  renderShelterCards(shelters) {
    if (!shelters || !shelters.length) return '';
    let html = `
      <div class="shelter-cards-section mt-3">
        <h6 class="text-warning fw-bold mb-2"><i class="fa fa-house-chimney me-1"></i> Nearby Safety Shelters</h6>
        <div class="row g-2">
    `;
    shelters.slice(0, 3).forEach(s => {
      const isFull = s.status === 'FULL';
      html += `
        <div class="col-md-6 col-12">
          <div class="card bg-dark border-secondary p-2 h-100 text-white shadow-sm">
            <div class="d-flex justify-content-between align-items-start">
              <h6 class="fw-bold text-truncate m-0" style="max-width: 170px;">${s.name}</h6>
              <span class="badge ${isFull ? 'bg-danger' : 'bg-success'}">${s.status || 'OPEN'}</span>
            </div>
            <p class="small text-muted mb-1 text-truncate"><i class="fa fa-map-marker-alt text-danger me-1"></i> ${s.address}</p>
            <div class="d-flex justify-content-between align-items-center small mb-2">
              <span><i class="fa fa-bed me-1 text-info"></i> ${s.available_beds} beds free</span>
              <span><i class="fa fa-route me-1 text-warning"></i> ${s.distance_km} km</span>
            </div>
            <div class="d-flex gap-1">
              <a href="tel:${s.contact_phone}" class="btn btn-outline-info btn-sm py-0 px-2 flex-grow-1"><i class="fa fa-phone me-1"></i> Call</a>
              <button class="btn btn-primary btn-sm py-0 px-2 flex-grow-1" onclick="window.open('https://maps.google.com/?q=${s.latitude},${s.longitude}', '_blank')"><i class="fa fa-directions me-1"></i> Map</button>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
    return html;
  }

  renderContactCards(contacts) {
    if (!contacts || !contacts.length) return '';
    let html = `
      <div class="contact-cards-section mt-3">
        <h6 class="text-info fw-bold mb-2"><i class="fa fa-phone-alt me-1"></i> Emergency Contacts</h6>
        <div class="d-flex flex-wrap gap-2">
    `;
    contacts.forEach(c => {
      html += `
        <a href="tel:${c.phone_number}" class="btn btn-outline-light btn-sm d-flex align-items-center gap-1 border-secondary">
          <i class="fa fa-phone text-success"></i> <strong>${c.agency_name}</strong> (${c.phone_number})
        </a>
      `;
    });
    html += `</div></div>`;
    return html;
  }

  renderChecklistComponent(checklist) {
    if (!checklist || !checklist.length) return '';
    let html = `
      <div class="checklist-section mt-3 p-3 rounded bg-dark border border-secondary">
        <h6 class="text-success fw-bold mb-2"><i class="fa fa-tasks me-1"></i> Interactive Go-Bag Emergency Checklist</h6>
        <div class="row g-2">
    `;
    checklist.forEach((item, idx) => {
      html += `
        <div class="col-md-6 col-12">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="chk-${idx}" onchange="this.nextElementSibling.classList.toggle('text-decoration-line-through')">
            <label class="form-check-label text-white small" for="chk-${idx}">${item}</label>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
    return html;
  }

  renderFirstAidCards(firstAid) {
    if (!firstAid || !firstAid.length) return '';
    let html = `
      <div class="first-aid-section mt-3 p-3 rounded bg-dark border border-danger border-opacity-50">
        <h6 class="text-danger fw-bold mb-2"><i class="fa fa-kit-medical me-1"></i> Emergency First Aid Instructions</h6>
        <ol class="ps-3 mb-2 small text-light">
    `;
    firstAid.forEach(item => {
      html += `<li class="mb-1">${item}</li>`;
    });
    html += `
        </ol>
        <div class="alert alert-warning p-1 ps-2 mb-0 small" style="font-size: 0.78rem;">
          <i class="fa fa-exclamation-triangle me-1"></i> <strong>Medical Disclaimer:</strong> Perform basic first aid while waiting for emergency personnel. Call 108 immediately for severe casualties.
        </div>
      </div>
    `;
    return html;
  }

  mountFloatingWidget() {
    if (document.getElementById('resqai-chatbot-widget')) return;

    const container = document.createElement('div');
    container.id = 'resqai-chatbot-widget';
    container.innerHTML = `
      <!-- Floating Toggle Button -->
      <button id="chatbot-toggle-btn" aria-label="Open ResQ Bot" class="shadow-lg" title="Open ResQ Bot">
        <i class="fa fa-robot fa-lg"></i>
        <span class="online-indicator"></span>
      </button>

      <!-- Chat Drawer -->
      <div id="chatbot-drawer" class="shadow-lg d-none">
        <div class="chatbot-header d-flex justify-content-between align-items-center p-3 text-white">
          <div class="d-flex align-items-center gap-2">
            <div class="chatbot-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 36px; height: 36px;">
              <i class="fa fa-robot"></i>
            </div>
            <div>
              <div class="d-flex align-items-center gap-1">
                <h6 class="m-0 fw-bold" style="font-size: 0.95rem;">ResQ Bot</h6>
                <span class="status-dot-green"></span>
              </div>
              <span id="chatbot-provider-badge" class="badge bg-success text-white" style="font-size:0.65rem;">
                ResQAI AI Engine (Online)
              </span>
            </div>
          </div>
          <div class="d-flex align-items-center gap-1">
            <button class="btn btn-link text-muted hover-white p-1" id="btn-clear-chat" title="Clear Chat History"><i class="fa fa-trash-alt"></i></button>
            <button class="btn btn-link text-muted hover-white p-1" id="btn-close-chat" title="Close"><i class="fa fa-times"></i></button>
          </div>
        </div>

        <!-- Quick Action Chips -->
        <div class="chatbot-presets p-2 border-bottom border-secondary d-flex gap-1 overflow-auto" id="chatbot-presets-container">
          <button class="chip-btn" data-prompt="Flood Precautions">Flood</button>
          <button class="chip-btn" data-prompt="Earthquake Guide">Earthquake</button>
          <button class="chip-btn" data-prompt="Find Nearby Shelters">Shelters</button>
          <button class="chip-btn" data-prompt="Fire Emergency">Fire Safety</button>
          <button class="chip-btn" data-prompt="First Aid">First Aid</button>
          <button class="chip-btn" data-prompt="Emergency Kit Checklist">Go-Bag</button>
        </div>

        <!-- Chat Body -->
        <div class="chatbot-body p-3 overflow-auto" id="chatbot-messages">
          <div class="bot-msg-wrapper mb-3">
            <div class="chat-bubble bot-bubble p-3">
              Hello! I am <strong>ResQ Bot</strong>, your AI disaster safety assistant. Ask me anything about emergency precautions, safe evacuation, nearby shelters, first-aid, or emergency checklists!
            </div>
          </div>
        </div>

        <!-- Input Footer -->
        <div class="chatbot-footer p-2 border-top border-secondary bg-dark">
          <form id="chatbot-form" class="d-flex align-items-center gap-2">
            <button type="button" id="btn-voice-input" class="btn btn-outline-secondary btn-sm" title="Voice Input (Speech-to-Text)">
              <i class="fa fa-microphone"></i>
            </button>
            <input type="text" id="chat-user-input" class="form-control form-control-sm bg-dark text-white border-secondary" placeholder="Ask ResQ Bot..." autocomplete="off" required>
            <button type="button" id="btn-clear-chat-footer" class="btn btn-outline-danger btn-sm px-2" title="Clear Chat History">
              <i class="fa fa-trash-alt me-1"></i> Clear
            </button>
            <button type="submit" id="btn-send-chat" class="btn btn-primary btn-sm px-3">
              <i class="fa fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.bindEvents();
    this.renderStoredMessages();
  }

  mountFullPage(targetEl) {
    if (!targetEl) return;
    targetEl.innerHTML = `
      <div class="card bg-dark border-secondary shadow-lg text-white" style="min-height: 75vh;">
        <div class="card-header border-secondary d-flex justify-content-between align-items-center py-3">
          <div class="d-flex align-items-center gap-3">
            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 44px; height: 44px; font-size: 1.3rem;">
              <i class="fa fa-robot"></i>
            </div>
            <div>
              <h4 class="m-0 fw-bold">ResQ Bot</h4>
              <span id="fullpage-provider-badge" class="badge bg-success text-white">
                ResQAI AI Engine (Online)
              </span>
            </div>
          </div>
          <button class="btn btn-outline-danger btn-sm" id="fullpage-clear-btn">
            <i class="fa fa-trash me-1"></i> Clear History
          </button>
        </div>

        <!-- Quick Prompts Bar -->
        <div class="bg-dark p-2 border-bottom border-secondary d-flex gap-2 flex-wrap" id="fullpage-presets">
          <button class="btn btn-outline-info btn-sm" data-prompt="Flood Precautions">Flood Precautions</button>
          <button class="btn btn-outline-warning btn-sm" data-prompt="Earthquake Guide">Earthquake Guide</button>
          <button class="btn btn-outline-success btn-sm" data-prompt="Find Nearby Shelters">Safety Shelters</button>
          <button class="btn btn-outline-danger btn-sm" data-prompt="Fire Emergency">Fire Safety</button>
          <button class="btn btn-outline-secondary btn-sm" data-prompt="Medical Emergency">Medical Emergency</button>
          <button class="btn btn-outline-light btn-sm" data-prompt="Emergency Kit Checklist">Go-Bag Checklist</button>
        </div>

        <!-- Full Chat Body -->
        <div class="card-body overflow-auto p-4" id="fullpage-messages" style="height: 52vh;">
          <div class="bot-msg-wrapper mb-3">
            <div class="chat-bubble bot-bubble p-3">
              <h5>Welcome to ResQ Bot</h5>
              <p class="m-0">How can I assist your safety today? Select a topic above or type your disaster question below.</p>
            </div>
          </div>
        </div>

        <!-- Full Input Footer -->
        <div class="card-footer border-secondary p-3 bg-dark">
          <form id="fullpage-chat-form" class="d-flex gap-2">
            <button type="button" id="fullpage-voice-btn" class="btn btn-outline-secondary" title="Voice Input">
              <i class="fa fa-microphone"></i>
            </button>
            <input type="text" id="fullpage-user-input" class="form-control bg-dark text-white border-secondary" placeholder="Ask ResQ Bot anything..." required>
            <button type="submit" class="btn btn-primary px-4">
              <i class="fa fa-paper-plane me-1"></i> Send
            </button>
          </form>
        </div>
      </div>
    `;

    this.bindFullPageEvents();
    this.renderFullPageMessages();
  }

  bindEvents() {
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const drawer = document.getElementById('chatbot-drawer');
    const closeBtn = document.getElementById('btn-close-chat');
    const clearBtn = document.getElementById('btn-clear-chat');
    const form = document.getElementById('chatbot-form');
    const voiceBtn = document.getElementById('btn-voice-input');

    if (toggleBtn && drawer) {
      toggleBtn.addEventListener('click', () => {
        drawer.classList.toggle('d-none');
        this.scrollToBottom('chatbot-messages');
      });
    }

    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => drawer.classList.add('d-none'));
    }

    const handleClear = () => {
      if (confirm('Clear chat history?')) {
        this.clearHistory();
        const msgs = document.getElementById('chatbot-messages');
        if (msgs) {
          msgs.innerHTML = `
            <div class="bot-msg-wrapper mb-3">
              <div class="chat-bubble bot-bubble">Chat history cleared. How can I help you?</div>
            </div>
          `;
        }
      }
    };

    if (clearBtn) clearBtn.addEventListener('click', handleClear);
    const clearFooterBtn = document.getElementById('btn-clear-chat-footer');
    if (clearFooterBtn) clearFooterBtn.addEventListener('click', handleClear);

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-user-input');
        if (input && input.value.trim()) {
          this.handleSendMessage(input.value.trim(), 'chatbot-messages');
          input.value = '';
        }
      });
    }

    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
    }

    // Preset buttons
    document.querySelectorAll('#chatbot-presets-container button').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt) {
          this.handleSendMessage(prompt, 'chatbot-messages');
        }
      });
    });
  }

  bindFullPageEvents() {
    const form = document.getElementById('fullpage-chat-form');
    const voiceBtn = document.getElementById('fullpage-voice-btn');
    const clearBtn = document.getElementById('fullpage-clear-btn');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('fullpage-user-input');
        if (input && input.value.trim()) {
          this.handleSendMessage(input.value.trim(), 'fullpage-messages');
          input.value = '';
        }
      });
    }

    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear chat history?')) {
          this.clearHistory();
          const msgs = document.getElementById('fullpage-messages');
          if (msgs) {
            msgs.innerHTML = `<div class="bot-msg-wrapper mb-3"><div class="chat-bubble bot-bubble">Chat history cleared.</div></div>`;
          }
        }
      });
    }

    document.querySelectorAll('#fullpage-presets button').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt) {
          this.handleSendMessage(prompt, 'fullpage-messages');
        }
      });
    });
  }

  async handleSendMessage(text, containerId) {
    this.appendUserMessage(text, containerId);
    this.history.push({ sender: 'user', text: text });
    this.saveHistory();

    const loadingId = this.appendLoadingIndicator(containerId);

    try {
      // Fetch user coordinates if available
      let lat = 19.0760, lng = 72.8777;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }, () => {});
      }

      const res = await chatbotApi.sendMessage(text, this.history, lat, lng);

      this.removeLoadingIndicator(loadingId);

      const provider = res.provider === 'grok' ? 'Grok AI (xAI)' : 'ResQAI Disaster Engine';
      this.updateProviderBadge(res.provider);

      const botReply = res.answer || 'Safety information processed.';
      this.appendBotMessage(botReply, res, containerId);

      this.history.push({ sender: 'bot', text: botReply, payload: res });
      this.saveHistory();

    } catch (err) {
      this.removeLoadingIndicator(loadingId);
      this.appendBotMessage(`Unable to reach AI service: ${err.message}. Please check your connection.`, {}, containerId);
    }
  }

  appendUserMessage(text, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'user-msg-wrapper mb-3 d-flex justify-content-end';
    msgDiv.innerHTML = `
      <div class="chat-bubble user-bubble bg-primary text-white p-3 shadow-sm" style="border-radius: 18px 18px 2px 18px; max-width: 85%;">
        ${text}
      </div>
    `;
    container.appendChild(msgDiv);
    this.scrollToBottom(containerId);
  }

  appendBotMessage(text, data = {}, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const formattedText = this.formatMarkdown(text);
    const sheltersHtml = this.renderShelterCards(data.shelters);
    const contactsHtml = this.renderContactCards(data.contacts);
    const checklistHtml = this.renderChecklistComponent(data.checklist);
    const firstAidHtml = this.renderFirstAidCards(data.firstAid);

    const msgId = 'msg-' + Date.now();

    const msgDiv = document.createElement('div');
    msgDiv.className = 'bot-msg-wrapper mb-4 d-flex justify-content-start';
    msgDiv.innerHTML = `
      <div class="chat-bubble bot-bubble bg-dark border border-secondary p-3 text-white shadow-sm" style="border-radius: 18px 18px 18px 2px; max-width: 90%;">
        <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-1 mb-2">
          <span class="badge ${data.provider === 'grok' ? 'bg-info text-dark' : 'bg-primary text-white'}" style="font-size: 0.7rem;">
            <i class="fa ${data.provider === 'grok' ? 'fa-bolt' : 'fa-robot'} me-1"></i> ${data.provider === 'grok' ? 'Grok AI (xAI)' : 'ResQAI AI Engine'}
          </span>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-link text-muted p-0 me-1" onclick="window.citizenChatbot.speakText(\`${text.replace(/`/g, "'")}\`)" title="Read Aloud"><i class="fa fa-volume-high"></i></button>
            <button class="btn btn-sm btn-link text-muted p-0 me-1" onclick="navigator.clipboard.writeText(\`${text.replace(/`/g, "'")}\`)" title="Copy"><i class="fa fa-copy"></i></button>
            <button class="btn btn-sm btn-link text-muted p-0" onclick="window.citizenChatbot.downloadGuide('${data.disaster || 'Disaster'}', \`${text.replace(/`/g, "'")}\`)" title="Download"><i class="fa fa-download"></i></button>
          </div>
        </div>

        <div class="bot-text">${formattedText}</div>

        ${sheltersHtml}
        ${contactsHtml}
        ${firstAidHtml}
        ${checklistHtml}
      </div>
    `;

    container.appendChild(msgDiv);
    this.scrollToBottom(containerId);
  }

  appendLoadingIndicator(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'bot-msg-wrapper mb-3';
    div.innerHTML = `
      <div class="chat-bubble bot-bubble bg-dark border border-secondary p-3 text-muted">
        <div class="d-flex align-items-center gap-2">
          <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          <span class="small">ResQAI Grok Assistant is processing disaster context...</span>
        </div>
      </div>
    `;
    container.appendChild(div);
    this.scrollToBottom(containerId);
    return id;
  }

  removeLoadingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  updateProviderBadge(provider) {
    const b1 = document.getElementById('chatbot-provider-badge');
    const b2 = document.getElementById('fullpage-provider-badge');
    let label = 'ResQAI AI Engine (Online)';
    let cls = 'badge bg-success text-white';

    if (provider === 'grok') {
      label = 'Grok AI (xAI) Active';
      cls = 'badge bg-info text-dark';
    } else if (provider === 'offline' || provider === 'error') {
      label = 'Offline Mode';
      cls = 'badge bg-warning text-dark';
    }

    if (b1) { b1.className = cls; b1.innerText = label; }
    if (b2) { b2.className = cls; b2.innerText = label; }
  }

  downloadGuide(title, text) {
    const blob = new Blob([`ResQAI Emergency Safety Guide: ${title}\n\n${text}\n\nGenerated by ResQAI AI Disaster System`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ResQAI_${title.replace(/\s+/g, '_')}_Guide.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  scrollToBottom(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  renderStoredMessages() {
    const container = document.getElementById('chatbot-messages');
    if (!container || !this.history.length) return;
    this.history.forEach(item => {
      if (item.sender === 'user') {
        this.appendUserMessage(item.text, 'chatbot-messages');
      } else {
        this.appendBotMessage(item.text, item.payload || {}, 'chatbot-messages');
      }
    });
  }

  renderFullPageMessages() {
    const container = document.getElementById('fullpage-messages');
    if (!container || !this.history.length) return;
    this.history.forEach(item => {
      if (item.sender === 'user') {
        this.appendUserMessage(item.text, 'fullpage-messages');
      } else {
        this.appendBotMessage(item.text, item.payload || {}, 'fullpage-messages');
      }
    });
  }
}

export const citizenChatbot = new CitizenChatbot();
window.citizenChatbot = citizenChatbot;
