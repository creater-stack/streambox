export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { recoverStuck } = await import('./src/server/process');
    await recoverStuck();
  }
}
