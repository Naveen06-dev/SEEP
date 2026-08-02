const CODE_RUNNER_URL = process.env.CODE_RUNNER_URL || 'http://localhost:5001';

export async function executeCode(payload) {
  const res = await fetch(`${CODE_RUNNER_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Code runner error: ${res.status}`);
  }

  return res.json();
}

export async function healthCheck() {
  try {
    const res = await fetch(`${CODE_RUNNER_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
