import mongoose from 'mongoose';
import axios from 'axios';

async function resolveAtlasSrv(hostname) {
  const dns = axios.create({
    baseURL: 'https://cloudflare-dns.com/dns-query',
    timeout: 10000,
    headers: { accept: 'application/dns-json' }
  });

  const [srvResponse, txtResponse] = await Promise.all([
    dns.get('', { params: { name: `_mongodb._tcp.${hostname}`, type: 'SRV' } }),
    dns.get('', { params: { name: hostname, type: 'TXT' } })
  ]);

  const hosts = (srvResponse.data?.Answer || [])
    .map((answer) => String(answer.data || '').trim().split(/\s+/))
    .filter((parts) => parts.length >= 4)
    .map((parts) => `${parts[3].replace(/\.$/, '')}:${parts[2]}`);

  const txt = (txtResponse.data?.Answer || [])
    .map((answer) => String(answer.data || '').replace(/^"|"$/g, '').replace(/"\s+"/g, ''))
    .find(Boolean);

  if (!hosts.length) {
    throw new Error(`Could not resolve Atlas SRV records for ${hostname}`);
  }

  return { hosts, txt };
}

async function buildDirectAtlasUri(srvUri) {
  const parsed = new URL(srvUri);
  const { hosts, txt } = await resolveAtlasSrv(parsed.hostname);
  const dbName = process.env.MONGO_DB_NAME || parsed.pathname.replace(/^\//, '') || 'job_apply_bot';
  const params = new URLSearchParams(parsed.search);
  const txtParams = new URLSearchParams(txt || '');

  for (const [key, value] of txtParams) {
    if (!params.has(key)) params.set(key, value);
  }

  params.set('tls', 'true');

  return `mongodb://${parsed.username}:${parsed.password}@${hosts.join(',')}/${dbName}?${params.toString()}`;
}

export async function connectDatabase() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is missing from .env');
  }

  mongoose.set('strictQuery', true);

  let connection;

  try {
    connection = await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || 'job_apply_bot',
      serverSelectionTimeoutMS: 15000
    });
  } catch (error) {
    if (!uri.startsWith('mongodb+srv://') || !String(error.message).includes('querySrv')) {
      throw error;
    }

    console.warn('MongoDB SRV lookup failed in Node. Retrying with HTTPS DNS seed-list fallback.');
    const directUri = await buildDirectAtlasUri(uri);
    connection = await mongoose.connect(directUri, {
      serverSelectionTimeoutMS: 15000
    });
  }

  console.log(`MongoDB connected: ${connection.connection.name}`);
  return connection;
}
