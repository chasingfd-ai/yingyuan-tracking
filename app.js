const form = document.querySelector('#lookup-form');
const input = document.querySelector('#phone');
const result = document.querySelector('#result');
const parcelTemplate = document.querySelector('#parcel-template');
let records = [];

fetch('./tracking-data.json')
  .then((response) => {
    if (!response.ok) throw new Error('data');
    return response.json();
  })
  .then((data) => { records = data; })
  .catch(() => showMessage('查询数据暂时无法加载，请稍后再试。'));

function normalizePhone(value) {
  return value.replace(/\D/g, '');
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function showMessage(message) {
  result.hidden = false;
  result.replaceChildren();
  const box = document.createElement('div');
  box.className = 'empty';
  box.textContent = message;
  result.append(box);
}

function showParcels(parcels) {
  result.hidden = false;
  result.replaceChildren();
  const heading = document.createElement('h2');
  heading.className = 'result-heading';
  heading.textContent = `查询到 ${parcels.length} 个包裹`;
  result.append(heading);

  parcels.forEach((parcel) => {
    const node = parcelTemplate.content.cloneNode(true);
    node.querySelector('.carrier').textContent = parcel.carrier;
    node.querySelector('.tracking').textContent = parcel.tracking;
    node.querySelector('.item').textContent = `发货内容：${parcel.item}`;
    const copy = node.querySelector('.copy');
    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(parcel.tracking);
      copy.textContent = '已复制';
      setTimeout(() => { copy.textContent = '复制单号'; }, 1400);
    });
    result.append(node);
  });
}

async function lookup(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8 || normalized.length > 15) {
    showMessage('请输入下单时填写的完整手机号。');
    return [];
  }
  const key = await sha256(normalized);
  const match = records.find(record => record.key === key);
  if (!match) {
    showMessage('未查到物流信息。请核对手机号；若仍无结果，请联系组织者。');
    return [];
  }
  showParcels(match.parcels);
  return match.parcels;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await lookup(input.value);
});

if (navigator.modelContext?.registerTool) {
  navigator.modelContext.registerTool({
    name: 'lookup_jacket_tracking',
    description: '按完整收件手机号查询夹克、保温杯和CHIC杂志物流单号。',
    inputSchema: {
      type: 'object',
      properties: { phone: { type: 'string', description: '完整收件手机号' } },
      required: ['phone']
    },
    execute: async ({ phone }) => {
      input.value = phone;
      const parcels = await lookup(phone);
      return { content: [{ type: 'text', text: parcels.length ? JSON.stringify(parcels) : '未查到物流信息' }] };
    }
  });
}

