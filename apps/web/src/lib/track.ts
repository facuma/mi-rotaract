export function trackEvent(event: string, context?: string) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.debug('[track]', event, context ?? '');
  }
}
