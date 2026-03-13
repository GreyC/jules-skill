export function logError(message: string, error?: any, debug?: boolean) {
  const isDebug = debug || process.env.DEBUG === 'true' || process.env.DEBUG === '1';

  console.error(message);

  if (isDebug && error) {
    if (error.message) {
      console.error(`Debug info: ${error.message}`);
    }
    if (error.stack) {
      console.error(error.stack);
    }
  }
}
