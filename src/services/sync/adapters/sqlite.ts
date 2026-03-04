import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

export default class SQLiteErrorAwareAdapter extends SQLiteAdapter {
  private extensions: SQLiteExtensions;

  constructor(options: any, extensions: SQLiteExtensions = {}) {
    super(options);
    this.extensions = extensions;
  }

  batch(operations: any[], callback: any) {
    const onFullError = this.extensions.onFullError;
    super.batch(operations, (result: any) => {
      if (result.error && isSQLiteFullError(result.error)) {
        onFullError?.(result.error);
      }
      callback(result);
    });
  }
}

export class FullFailingSQLiteAdapter extends SQLiteErrorAwareAdapter {
  constructor(options: any, extensions?: { onFullError?: (error: Error) => void }) {
    super(options, extensions);
    
    // Wrap the dispatcher to intercept batch calls and simulate errors at dispatcher level
    const originalDispatcher = (this as any)._dispatcher;
    const originalCall = originalDispatcher.call.bind(originalDispatcher);
    
    originalDispatcher.call = (methodName: string, args: any[], callback: any) => {
      if (methodName === 'batch') {
        // Simulate dispatcher-level error
        setTimeout(() => {
          callback({ error: new Error('sqlite error 13 (database or disk is full)') });
        }, 0);
        return;
      }
      // For all other methods, use original dispatcher
      return originalCall(methodName, args, callback);
    };
  }
}

function isSQLiteFullError(error: Error) {
  const message = error.message.toLowerCase();
  return message.includes('sqlite error 13') || message.includes('database or disk is full');
}

export type SQLiteExtensions = {
  onFullError?: (err: Error) => void
}