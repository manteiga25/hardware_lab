import { h } from '../dom.js';
import * as api from '../api.js';

const SUGGESTIONS = [
  'Qual é a melhor placa gráfica até 300 US$?',
  'Processadores AMD com 8 núcleos até 250 US$',
  'Compara a RTX 4060 com a RX 7600',
];

// Chat page for the agent in /api/agent. The answer arrives token by token: it is shown as it
// comes and only laid out (paragraphs and lists) once it is complete.
export function createAssistant() {
  const chat = h('div', { class: 'chat', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversa com o assistente' });

  const input = h('input', {
    id: 'chat-input',
    type: 'text',
    autocomplete: 'off',
    placeholder: 'Ex.: melhor placa gráfica até 300 US$',
  });
  const sendButton = h('button', { type: 'submit', class: 'btn btn-primary', text: 'Perguntar' });
  const stopButton = h('button', { type: 'button', class: 'btn btn-ghost', text: 'Parar', hidden: true });

  const form = h('form', { class: 'chat-form', novalidate: true },
    h('label', { class: 'sr-only', for: input.id, text: 'A tua pergunta' }),
    input,
    sendButton,
    stopButton);

  const suggestions = h('div', { class: 'suggestions' },
    SUGGESTIONS.map((text) => h('button', {
      type: 'button',
      class: 'btn btn-ghost btn-small',
      text,
      onclick: () => ask(text),
    })));

  const root = h('section', { class: 'view', 'data-view': 'assistant', 'aria-labelledby': 'assistant-title', hidden: true },
    h('div', { class: 'container page assistant' },
      h('h1', { id: 'assistant-title', tabindex: '-1', text: 'Assistente' }),
      h('p', { class: 'lead', text: 'Diz o que procuras e o assistente pesquisa na base de dados do site.' }),
      h('p', { class: 'assistant-note', text: 'Responde a partir dos dados deste site e pode enganar-se, sobretudo em contas. Confirma os valores na ficha de cada produto.' }),
      chat,
      form,
      suggestions));

  let controller = null;

  function addMessage(className, text) {
    const message = h('div', { class: `msg ${className}` }, text);
    chat.append(message);
    message.scrollIntoView({ block: 'nearest' });
    return message;
  }

  function setBusy(busy) {
    sendButton.hidden = busy;
    stopButton.hidden = !busy;
    input.disabled = busy;
    suggestions.hidden = busy || chat.children.length > 0;
  }

  async function ask(query) {
    const question = query.trim();
    if (!question || controller) return;

    input.value = '';
    addMessage('msg-user', question);
    const answer = addMessage('msg-agent is-streaming', 'A pensar…');
    setBusy(true);

    controller = new AbortController();
    let text = '';

    try {
      for await (const token of api.streamAgent(question, controller.signal)) {
        text += token;
        answer.textContent = text;
        answer.scrollIntoView({ block: 'nearest' });
      }

      answer.classList.remove('is-streaming');
      if (text.trim()) answer.replaceChildren(...formatAnswer(text));
      else answer.replaceChildren('O assistente não respondeu nada. Tenta perguntar de outra maneira.');
    } catch (error) {
      answer.classList.remove('is-streaming');
      if (error.name === 'AbortError') {
        // Keep whatever had already arrived before stopping.
        if (text.trim()) answer.replaceChildren(...formatAnswer(text));
        else answer.remove();
      } else {
        answer.classList.add('is-error');
        answer.replaceChildren('Não foi possível falar com o assistente. Verifica se o servidor e o Ollama estão a correr.');
      }
    } finally {
      controller = null;
      setBusy(false);
      input.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(input.value);
  });

  stopButton.addEventListener('click', () => controller?.abort());

  return {
    root,
    enter() {
      input.focus({ preventScroll: true });
    },
  };
}

// The model answers in plain text with the odd **bold** or list: turn that into real elements,
// building nodes instead of parsing HTML, so an answer can never inject markup.
function formatAnswer(text) {
  return text
    .trim()
    .split(/\n{2,}/)
    .flatMap((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return [];

      const bullet = /^([-*•]|\d+[.)])\s+/;
      if (lines.every((line) => bullet.test(line))) {
        return h('ul', {}, lines.map((line) => h('li', {}, inline(line.replace(bullet, '')))));
      }

      return h('p', {}, inline(lines.join(' ')));
    });
}

function inline(text) {
  const clean = text.replace(/^#+\s*/, '');
  const nodes = [];
  let index = 0;

  for (const match of clean.matchAll(/\*\*([^*]+)\*\*/g)) {
    if (match.index > index) nodes.push(clean.slice(index, match.index));
    nodes.push(h('strong', { text: match[1] }));
    index = match.index + match[0].length;
  }
  if (index < clean.length) nodes.push(clean.slice(index));

  return nodes;
}
