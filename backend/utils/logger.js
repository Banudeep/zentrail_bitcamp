class Logger {
    static formatMessage(component, message, data) {
        const timestamp = new Date().toISOString();
        const dataString = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
        return `[${timestamp}] [${component}] ${message}${dataString}`;
    }

    static info(component, message, data) {
        console.log(this.formatMessage(component, message, data));
    }

    static warn(component, message, data) {
        console.warn(this.formatMessage(component, message, data));
    }

    static error(component, message, error) {
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

module.exports = Logger;