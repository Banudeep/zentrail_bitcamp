type LogLevel = 'info' | 'warn' | 'error';

interface LogData {
  [key: string]: any;
}

class Logger {
  private static formatMessage(component: string, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString();
    const dataString = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] [${component}] ${message}${dataString}`;
  }

  static info(component: string, message: string, data?: LogData): void {
    console.log(this.formatMessage(component, message, data));
  }

  static warn(component: string, message: string, data?: LogData): void {
    console.warn(this.formatMessage(component, message, data));
  }

  static error(component: string, message: string, error?: any): void {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      ...(error.response && {
        status: error.response.status,
        data: error.response.data
      })
    } : undefined;
    console.error(this.formatMessage(component, message, errorData));
  }
}

export default Logger; 